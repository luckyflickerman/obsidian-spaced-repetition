import "src/speed-streak/speed-streak.css";
import { Notice, Platform } from "obsidian";

import type SRPlugin from "src/main";
import { ReviewResponse } from "src/scheduling/algorithms/base/repetition-item";
import { CompactLayout } from "src/speed-streak/layouts/compact-layout";
import type {
    HudViewModel,
    LayoutCallbacks,
    ListedRun,
    SpeedStreakLayoutView,
} from "src/speed-streak/layouts/layout-types";
import { PauseOverlay } from "src/speed-streak/layouts/pause-overlay";
import { RecordsModal } from "src/speed-streak/layouts/records-modal";
import { SidePanelLayout } from "src/speed-streak/layouts/side-panel-layout";
import { SpeedStreakAudio, SpeedStreakSound } from "src/speed-streak/speed-streak-audio";
import {
    SpeedStreakEngine,
    SpeedStreakEvent,
    SpeedStreakRating,
    SpeedStreakSessionSummary,
} from "src/speed-streak/speed-streak-engine";
import { isPolish, ss } from "src/speed-streak/speed-streak-i18n";
import {
    bestRunOf,
    formatRunDate,
    listedRuns,
    recordProgress,
    runBadge,
} from "src/speed-streak/speed-streak-records";
import {
    boostsActive,
    MAX_STORED_RUNS,
    normalizeSpeedStreakData,
    normalizeSpeedStreakSettings,
    parseTimerRules,
    resolveLayout,
    resolvePerformance,
    resolveTimerPolicy,
    SpeedStreakData,
    SpeedStreakLayout,
    SpeedStreakRunRecord,
    SpeedStreakSettings,
    SpeedStreakTimerRule,
} from "src/speed-streak/speed-streak-settings";
import { pauseOverview } from "src/speed-streak/speed-streak-stats";
import {
    applySpeedStreakTheme,
    getSpeedStreakTheme,
    parseColor,
    RGB,
    timerColor,
} from "src/speed-streak/speed-streak-themes";
import { getSpeedStreakVisual, resolveThemeId } from "src/speed-streak/visuals/visual-registry";
import type { SpeedStreakVisual, VisualState } from "src/speed-streak/visuals/visual-types";

export interface SpeedStreakCardContext {
    tags: string[];
    deckPath: string;
}

export function reviewResponseToRating(response: ReviewResponse): SpeedStreakRating {
    switch (response) {
        case ReviewResponse.Easy:
            return "easy";
        case ReviewResponse.Good:
            return "good";
        case ReviewResponse.Hard:
            return "hard";
        default:
            return "again";
    }
}

/** Plugin-level access to Speed Streak settings & persisted records. */
export function getSpeedStreakSettings(plugin: SRPlugin): SpeedStreakSettings {
    const settings = plugin.dataManager.data.settings;
    const normalized = normalizeSpeedStreakSettings(settings.speedStreak);
    settings.speedStreak = normalized;
    return normalized;
}

export function getSpeedStreakData(plugin: SRPlugin): SpeedStreakData {
    const data = plugin.dataManager.data;
    const normalized = normalizeSpeedStreakData(data.speedStreak);
    data.speedStreak = normalized;
    return normalized;
}

export async function saveSpeedStreakData(plugin: SRPlugin): Promise<void> {
    await plugin.dataManager.pluginDataManager.savePluginData();
}

/** Settings that need the layout / scene to be rebuilt when they change. */
function sceneKey(s: SpeedStreakSettings, reducedMotion: boolean): string {
    return [
        s.visualStyle,
        s.layout,
        s.performance,
        s.theme,
        s.hudPosition,
        s.reducedMotion,
        reducedMotion,
    ].join("|");
}

/**
 * Glue between the review view and the Speed Streak game: runs the timer loop,
 * turns the engine state into a view model for the active layout, passes state
 * and events to the active visual style, plays feedback and stores records.
 * Drawing lives in visuals/*, the DOM of the HUD in layouts/*.
 */
export class SpeedStreakController {
    /** Last controller that had an active session (used by commands). */
    static active: SpeedStreakController | null = null;

    private plugin: SRPlugin;
    private hostEl: HTMLElement;
    private topAnchor: HTMLElement;
    private bottomAnchor: HTMLElement;

    private settings: SpeedStreakSettings;
    private rules: SpeedStreakTimerRule[] = [];
    readonly engine: SpeedStreakEngine;
    private audio = new SpeedStreakAudio();

    private layout: SpeedStreakLayoutView | null = null;
    private layoutKind: SpeedStreakLayout | null = null;
    private visual: SpeedStreakVisual | null = null;
    private builtSceneKey = "";
    private pauseOverlay: PauseOverlay;
    private resizeObserver: ResizeObserver | null = null;
    private motionQuery: MediaQueryList | null = null;

    private loopHandle: number | null = null;
    private interrupted = false;
    private interruptPausedByUs = false;
    /** Active `holdTimerWhile` calls (e.g. reading aloud). */
    private holdCount = 0;
    private holdPausedByUs = false;

    // Records
    private best: SpeedStreakRunRecord | null = null;
    private bestStreak = 0;
    private listed: ListedRun[] = [];
    private newRecordThisSession = false;
    private bestAllTimeAtStart = 0;

    private themeRgb: { good: RGB; hard: RGB; again: RGB } | null = null;

    constructor(
        plugin: SRPlugin,
        hostEl: HTMLElement,
        topAnchor: HTMLElement,
        bottomAnchor: HTMLElement,
    ) {
        this.plugin = plugin;
        this.hostEl = hostEl;
        this.topAnchor = topAnchor;
        this.bottomAnchor = bottomAnchor;
        this.settings = getSpeedStreakSettings(plugin);
        this.engine = new SpeedStreakEngine(this.settings);
        this.engine.on((e) => this.onEngineEvent(e));
        this.pauseOverlay = new PauseOverlay(this.topAnchor, () => this.togglePause());
        try {
            this.motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
        } catch {
            this.motionQuery = null;
        }
    }

    // MARK: Public API used by the card container

    get isEnabled(): boolean {
        return this.settings.enabled;
    }

    startSession(deckName: string) {
        this.refreshSettings();
        if (!this.settings.enabled) {
            this.teardownScene();
            return;
        }
        this.loadRecords();
        this.newRecordThisSession = false;
        this.holdCount = 0;
        this.holdPausedByUs = false;
        this.engine.bestToBeat = this.bestStreak;
        this.engine.startSession(deckName);
        SpeedStreakController.active = this;
        this.buildScene();
        this.attachWindowListeners();
        this.startLoop();
        this.render();
    }

    endSession() {
        this.stopLoop();
        this.detachWindowListeners();
        const summary = this.engine.endSession();
        this.pauseOverlay.hide();
        this.teardownScene();
        if (SpeedStreakController.active === this) SpeedStreakController.active = null;
        if (summary) void this.persistSession(summary);
    }

    onQuestionShown(ctx: SpeedStreakCardContext) {
        if (!this.engine.sessionActive || this.interrupted) return;
        const policy = resolveTimerPolicy(this.settings, this.rules, ctx.tags, ctx.deckPath);
        this.engine.onQuestionShown(policy);
        this.render();
    }

    onAnswerShown() {
        if (!this.engine.sessionActive || this.interrupted) return;
        this.engine.onAnswerShown();
        this.render();
    }

    onRate(response: ReviewResponse) {
        if (!this.engine.sessionActive) return;
        this.engine.onRate(reviewResponseToRating(response));
        this.render();
    }

    onSkip() {
        if (!this.engine.sessionActive) return;
        this.engine.onSkip();
        this.render();
    }

    /** Edit modal / jump to note: freeze the timer while the user is away. */
    beginInterruption() {
        if (!this.engine.sessionActive || this.interrupted) return;
        this.interrupted = true;
        this.interruptPausedByUs = this.settings.autoPauseOnLeave && this.engine.pause("auto");
        this.render();
    }

    endInterruption() {
        if (!this.interrupted) return;
        this.interrupted = false;
        if (this.interruptPausedByUs && this.engine.paused && this.engine.pauseOrigin === "auto")
            this.engine.resume();
        this.interruptPausedByUs = false;
        this.render();
    }

    /** The user left the review (e.g. jumped to the note): pause until they come back. */
    pauseForDeparture() {
        if (!this.engine.sessionActive || !this.settings.autoPauseOnLeave) return;
        if (this.engine.pause("auto")) this.render();
    }

    /**
     * Freezes the timer until `work` settles (e.g. while a card is read aloud).
     * Uses the automatic pause, so it doesn't count as a pause and keeps the run
     * Pure. Overlapping holds are counted; the timer resumes after the last one.
     */
    holdTimerWhile(work: Promise<unknown>): void {
        if (!this.engine.sessionActive || !this.settings.enabled) return;
        this.holdCount++;
        if (this.holdCount === 1) {
            this.holdPausedByUs = !this.interrupted && this.engine.pause("auto");
        }
        this.render();
        const release = () => {
            this.holdCount = Math.max(0, this.holdCount - 1);
            if (this.holdCount > 0) return;
            const resume =
                this.holdPausedByUs &&
                !this.interrupted &&
                this.engine.paused &&
                this.engine.pauseOrigin === "auto" &&
                !(this.settings.autoPauseOnLeave && activeDocument.hidden);
            this.holdPausedByUs = false;
            if (resume) this.engine.resume();
            this.render();
        };
        work.then(release, release);
    }

    get isHoldingTimer(): boolean {
        return this.holdCount > 0;
    }

    /** Returns true when the key was consumed. */
    handleKey(e: KeyboardEvent): boolean {
        if (!this.engine.sessionActive || !this.settings.enabled) return false;
        if (e.ctrlKey || e.metaKey || e.altKey) return false;
        const key = (e.key ?? "").toLowerCase();
        if (!key) return false;
        if (
            boostsActive(this.settings) &&
            this.settings.boostHotkey &&
            key === this.settings.boostHotkey.toLowerCase()
        ) {
            this.useBoost();
            return true;
        }
        if (this.settings.pauseHotkey && key === this.settings.pauseHotkey.toLowerCase()) {
            this.togglePause();
            return true;
        }
        return false;
    }

    useBoost() {
        this.audio.prime();
        this.engine.useBoost();
        this.render();
    }

    togglePause() {
        this.audio.prime();
        if (this.holdCount > 0 && this.engine.paused && this.engine.pauseOrigin === "auto") {
            // Timer only held by reading aloud: the user asks for a real pause
            this.engine.resume(true);
            if (this.engine.pause("manual")) this.holdPausedByUs = false;
            else this.holdPausedByUs = this.engine.pause("auto");
            this.render();
            return;
        }
        this.engine.togglePause();
        this.render();
    }

    refreshSettings() {
        this.settings = getSpeedStreakSettings(this.plugin);
        this.rules = parseTimerRules(this.settings.specialTimerRules);
        this.engine.updateSettings(this.settings);
        this.audio.enabled = this.settings.soundEnabled;
        this.audio.volume = this.settings.soundVolume / 100;
        if (!this.engine.sessionActive) return;
        if (!this.settings.enabled) {
            this.endSession();
            return;
        }
        this.loadRecords();
        this.engine.bestToBeat = this.bestStreak;
        if (sceneKey(this.settings, this.systemReducedMotion) !== this.builtSceneKey)
            this.buildScene();
        this.render();
    }

    destroy() {
        this.endSession();
        this.audio.dispose();
        this.pauseOverlay.destroy();
    }

    // MARK: Scene (layout + visual style)

    private get systemReducedMotion(): boolean {
        return !!this.motionQuery?.matches;
    }

    private get reducedMotion(): boolean {
        return this.settings.reducedMotion || this.systemReducedMotion;
    }

    private viewWidth(): number {
        return this.hostEl.getBoundingClientRect().width || window.innerWidth;
    }

    private callbacks: LayoutCallbacks = {
        togglePause: () => this.togglePause(),
        useBoost: () => this.useBoost(),
        toggleCollapsed: () => this.toggleCollapsed(),
        openRun: (run) => this.openRecords(run),
    };

    /** (Re)builds the layout for the current width and mounts the visual style. */
    private buildScene() {
        this.teardownScene();
        const s = this.settings;
        const kind = resolveLayout(s.layout, this.viewWidth());
        this.layoutKind = kind;
        this.layout =
            kind === "compact"
                ? new CompactLayout(
                      this.topAnchor,
                      this.bottomAnchor,
                      s.hudPosition,
                      this.callbacks,
                  )
                : new SidePanelLayout(this.hostEl, kind, s.sidePanelCollapsed, this.callbacks);
        this.layout.root.toggleClass("sr-ss-reduced-motion", this.reducedMotion);

        const visualInfo = getSpeedStreakVisual(s.visualStyle);
        const theme = getSpeedStreakTheme(resolveThemeId(s.theme, visualInfo.id));
        applySpeedStreakTheme(this.layout.root, theme);
        applySpeedStreakTheme(this.pauseOverlay.root, theme);
        this.themeRgb = null;

        this.visual = visualInfo.create();
        this.visual.mount(this.layout.sceneHost, {
            performance: resolvePerformance(s.performance, Platform.isMobile),
            reducedMotion: this.reducedMotion,
            size: this.layout.sceneSize,
        });
        this.builtSceneKey = sceneKey(s, this.systemReducedMotion);

        if (!this.resizeObserver && typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(() => this.onViewResize());
            this.resizeObserver.observe(this.hostEl);
        }
    }

    private teardownScene() {
        this.visual?.destroy();
        this.visual = null;
        this.layout?.destroy();
        this.layout = null;
        this.layoutKind = null;
        this.builtSceneKey = "";
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
    }

    /** Automatic layout: switch live (window resize, iPad rotation, Split View). */
    private onViewResize() {
        if (!this.engine.sessionActive || !this.layout) return;
        const kind = resolveLayout(this.settings.layout, this.viewWidth());
        if (kind !== this.layoutKind) {
            this.buildScene();
            this.render();
        }
    }

    private toggleCollapsed() {
        const settings = getSpeedStreakSettings(this.plugin);
        settings.sidePanelCollapsed = !settings.sidePanelCollapsed;
        this.settings = settings;
        this.layout?.setCollapsed(settings.sidePanelCollapsed);
        void this.plugin.dataManager.settingsManager.save();
    }

    private openRecords(run: SpeedStreakRunRecord | null) {
        new RecordsModal(
            this.plugin.app,
            this.listed,
            this.listTitle(),
            run ?? this.best,
            isPolish(),
        ).open();
    }

    // MARK: Records

    private loadRecords() {
        const data = getSpeedStreakData(this.plugin);
        this.recomputeRecords(data.runs);
        this.bestAllTimeAtStart = Math.max(0, ...data.runs.map((r) => r.streak));
    }

    private recomputeRecords(runs: SpeedStreakRunRecord[]) {
        const now = Date.now();
        this.best = bestRunOf(runs, this.settings, now);
        this.bestStreak = this.best?.streak ?? 0;
        const polish = isPolish();
        this.listed = listedRuns(runs, this.settings, now).map((run, i) => ({
            run,
            rank: i + 1,
            date: formatRunDate(run.endedAt, now, polish),
            badge: runBadge(run),
        }));
    }

    private listTitle(): string {
        if (this.settings.recordsList === "recent") return ss("RECENT_5");
        return this.settings.recordScope === "today" ? ss("BEST_5_TODAY") : ss("BEST_5_ALL");
    }

    private recordRun(run: SpeedStreakRunRecord) {
        const data = getSpeedStreakData(this.plugin);
        data.runs.push(run);
        if (data.runs.length > MAX_STORED_RUNS)
            data.runs.splice(0, data.runs.length - MAX_STORED_RUNS);
        if (run.streak > this.bestAllTimeAtStart) this.newRecordThisSession = true;
        this.recomputeRecords(data.runs);
        this.engine.bestToBeat = this.bestStreak;
    }

    private async persistSession(summary: SpeedStreakSessionSummary) {
        // Runs that ended in a timeout/again were already recorded live; the
        // session-end run (if any) is the last one in the summary.
        const last = summary.runs[summary.runs.length - 1];
        if (last && last.endReason === "session-end") this.recordRun(last);
        const data = getSpeedStreakData(this.plugin);
        data.totals.cardsAnswered += summary.cards;
        data.totals.timeouts += summary.timeouts;
        data.totals.boostsUsed += summary.boostsUsed;
        data.totals.activeMs += summary.activeMs;
        if (summary.cards > 0) data.totals.sessions += 1;
        try {
            await saveSpeedStreakData(this.plugin);
        } catch (e) {
            console.error("[Speed Streak] could not save records", e);
        }
        if (this.settings.showSessionSummary && summary.cards > 0) this.showSummary(summary);
    }

    private showSummary(summary: SpeedStreakSessionSummary) {
        const avg = summary.cards > 0 ? (summary.activeMs / summary.cards / 1000).toFixed(1) : "0";
        const lines = [
            ss("SUMMARY_TITLE"),
            ss("SUMMARY_LINE", {
                cards: summary.cards,
                best: summary.bestStreakInSession,
                timeouts: summary.timeouts,
                boosts: summary.boostsUsed,
                avg,
            }),
        ];
        if (this.settings.gameplayMode === "points")
            lines.push(ss("SUMMARY_SCORE", { score: summary.score }));
        if (this.newRecordThisSession) {
            const best = Math.max(...getSpeedStreakData(this.plugin).runs.map((r) => r.streak));
            lines.push(ss("SUMMARY_RECORD", { n: best }));
        }
        new Notice(lines.join("\n"), 8000);
    }

    // MARK: Engine events → feedback

    private onEngineEvent(e: SpeedStreakEvent) {
        const celebrate = this.settings.celebrateNewBest;
        if (e.type !== "new-best" || celebrate) this.visual?.onEvent(e);
        switch (e.type) {
            case "reveal":
                this.play("reveal");
                break;
            case "rate":
                if (e.rating) this.play(e.rating);
                if (e.rating && e.text !== "again-break") this.pulse("sr-ss-bump");
                if (e.text === "again-break") this.pulse("sr-ss-shake");
                break;
            case "skip":
                this.play("skip");
                break;
            case "warning-tick":
                if (this.settings.countdownSound) this.play("tick");
                break;
            case "timeout":
                this.play("timeout");
                this.vibrate([80, 40, 120]);
                this.pulse("sr-ss-shake");
                this.layout?.toast(ss("TIMEOUT"), "bad");
                break;
            case "answer-timeout":
                this.layout?.toast(ss("ANSWER_TIMEOUT"), "warn");
                break;
            case "streak-lost":
                if (e.run) this.recordRun(e.run);
                break;
            case "boost":
                this.play("boost");
                this.vibrate(30);
                this.pulse("sr-ss-boosted");
                this.layout?.toast(`+${this.settings.boostSeconds}s`, "boost");
                break;
            case "boost-earned":
                this.play("boost-earned");
                this.layout?.toast(ss("BOOST_EARNED"), "boost");
                break;
            case "boost-blocked":
                this.play("blocked");
                this.layout?.toast(this.boostBlockedText(e.text ?? ""), "warn");
                break;
            case "pause-blocked":
                this.play("blocked");
                this.layout?.toast(ss("PAUSE_BLOCKED"), "warn");
                break;
            case "new-best":
                if (!celebrate) break;
                this.play("new-best");
                this.vibrate([30, 30, 30]);
                this.pulse("sr-ss-record-glow");
                this.layout?.toast(ss("NEW_BEST"), "good");
                break;
            default:
                break;
        }
    }

    private boostBlockedText(reason: string): string {
        switch (reason) {
            case "empty":
                return ss("BOOST_BLOCKED_EMPTY");
            case "paused":
                return ss("BOOST_BLOCKED_PAUSED");
            case "untimed":
                return ss("BOOST_BLOCKED_UNTIMED");
            case "expired":
                return ss("BOOST_BLOCKED_EXPIRED");
            case "mode":
                return ss("BOOST_BLOCKED_MODE");
            case "off":
                return ss("BOOST_BLOCKED_OFF");
            default:
                return ss("BOOST_BLOCKED_NO_CARD");
        }
    }

    private play(sound: SpeedStreakSound) {
        this.audio.play(sound);
    }

    private vibrate(pattern: number | number[]) {
        if (!this.settings.vibrationEnabled || !Platform.isMobile) return;
        try {
            navigator.vibrate?.(pattern);
        } catch {
            /* not supported */
        }
    }

    private pulse(cls: string) {
        if (this.reducedMotion) return;
        this.layout?.pulse(cls);
    }

    // MARK: Loop & window listeners

    private startLoop() {
        this.stopLoop();
        this.loopHandle = window.setInterval(() => {
            this.engine.tick();
            this.render();
        }, 100);
    }

    private stopLoop() {
        if (this.loopHandle !== null) {
            window.clearInterval(this.loopHandle);
            this.loopHandle = null;
        }
    }

    private onWindowBlur = () => {
        if (!this.settings.autoPauseOnLeave || this.interrupted) return;
        if (this.engine.pause("auto")) this.render();
    };

    private onWindowFocus = () => {
        if (this.interrupted || this.holdCount > 0) return;
        if (this.engine.paused && this.engine.pauseOrigin === "auto") {
            this.engine.resume();
            this.render();
        }
    };

    private onVisibility = () => {
        if (activeDocument.hidden) this.onWindowBlur();
        else this.onWindowFocus();
    };

    private onMotionChange = () => {
        if (this.engine.sessionActive) {
            this.buildScene();
            this.render();
        }
    };

    private attachWindowListeners() {
        window.addEventListener("blur", this.onWindowBlur);
        window.addEventListener("focus", this.onWindowFocus);
        activeDocument.addEventListener("visibilitychange", this.onVisibility);
        this.motionQuery?.addEventListener?.("change", this.onMotionChange);
    }

    private detachWindowListeners() {
        window.removeEventListener("blur", this.onWindowBlur);
        window.removeEventListener("focus", this.onWindowFocus);
        activeDocument.removeEventListener("visibilitychange", this.onVisibility);
        this.motionQuery?.removeEventListener?.("change", this.onMotionChange);
    }

    // MARK: Render

    /** Resolves a theme CSS variable (which may reference Obsidian variables) to RGB. */
    private resolveVar(root: HTMLElement, cssVar: string): RGB | null {
        const probe = root.createSpan({ cls: "sr-ss-color-probe" });
        probe.setCssProps({ color: `var(${cssVar})` });
        const computed = getComputedStyle(probe).color;
        probe.remove();
        return parseColor(computed);
    }

    private timeColor(fraction: number, untimed: boolean): string {
        if (untimed || !this.layout) return "var(--ss-faint)";
        if (!this.themeRgb) {
            const root = this.layout.root;
            const good = this.resolveVar(root, "--ss-good");
            const hard = this.resolveVar(root, "--ss-hard");
            const again = this.resolveVar(root, "--ss-again");
            if (!good || !hard || !again) return "var(--ss-good)";
            this.themeRgb = { good, hard, again };
        }
        const { good, hard, again } = this.themeRgb;
        return timerColor(fraction, good, hard, again);
    }

    private render() {
        if (!this.layout || !this.engine.sessionActive) return;
        const e = this.engine;
        const s = this.settings;
        const remaining = e.remainingMs();
        const total = e.totalLimitMs();
        const untimed = e.phase !== "idle" && remaining === null;
        const held = this.holdCount > 0 && e.paused && e.pauseOrigin === "auto";
        const warnMs = s.countdownWarningSeconds * 1000;
        const warning =
            remaining !== null && remaining > 0 && warnMs > 0 && remaining <= warnMs && !e.paused;

        let fraction = 1;
        let timerText: string;
        if (remaining === null) {
            timerText = "∞";
        } else if (remaining >= 0) {
            const secs = remaining / 1000;
            timerText = secs >= 10 ? Math.ceil(secs).toString() : secs.toFixed(1);
            fraction = total && total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
        } else {
            timerText = `+${(-remaining / 1000).toFixed(remaining > -10000 ? 1 : 0)}`;
            fraction = 0;
        }

        let phaseLabel = "";
        if (held) phaseLabel = "🔊";
        else if (e.paused) phaseLabel = ss("PAUSED");
        else if (e.cardIsFree && e.phase !== "idle") phaseLabel = ss("FREE");
        else if (untimed) phaseLabel = ss("UNTIMED");
        else if (e.phase === "question") phaseLabel = ss("QUESTION");
        else if (e.phase === "answer") phaseLabel = ss("ANSWER");

        const newBest = e.streak > 0 && this.bestStreak > 0 && e.streak > this.bestStreak;
        const recordValue = Math.max(this.bestStreak, e.streak);
        const boostMode = boostsActive(s);
        const full = e.boostCharges >= s.maxBoostCharges;

        const vm: HudViewModel = {
            timerText,
            phaseLabel,
            phaseTitle:
                e.policy.source && e.phase !== "idle"
                    ? `${ss("RULE_PREFIX")}: ${e.policy.source}`
                    : "",
            fraction,
            timeColor: this.timeColor(fraction, untimed),
            untimed,
            paused: e.paused,
            held,
            timedOut: e.timedOut,
            warning,
            free: e.cardIsFree && e.phase !== "idle",
            phase: e.phase,
            streak: e.streak,
            newBest,
            liveBadge: runBadge({ pauses: e.livePauses, boostsUsed: e.liveBoosts }),
            trail: e.ratingTrail,
            showTrail: s.showRatingTrail,
            scoreText:
                s.gameplayMode === "points"
                    ? `${ss("SCORE")} ${e.score} · ×${e.multiplier().toFixed(2)}`
                    : "",
            recordsView: s.recordsView,
            recordLabel: s.recordScope === "today" ? ss("TODAY_BEST") : ss("ALL_TIME_BEST"),
            recordValue,
            recordProgress: recordProgress(e.streak, this.bestStreak),
            recordBarText: newBest
                ? ss("RECORD_BEATEN", { n: e.streak })
                : this.bestStreak > 0
                  ? ss("RECORD_BAR", { n: e.streak, m: this.bestStreak })
                  : ss("NO_RECORD_YET"),
            listTitle: this.listTitle(),
            listedRuns: this.listed,
            boostMode,
            boostLabel: `+${s.boostSeconds}s`,
            boostDisabled: e.boostUnavailableReason() !== "",
            boostTooltip: ss("BOOST_TOOLTIP", {
                s: s.boostSeconds,
                key: (s.boostHotkey || "-").toUpperCase(),
            }),
            charges: e.boostCharges,
            maxCharges: s.maxBoostCharges,
            boostProgress: full ? 1 : e.boostProgress / s.cardsPerBoostCharge,
            boostProgressText: full
                ? ss("BOOST_FULL")
                : ss("NEXT_BOOST", { n: e.boostProgress, m: s.cardsPerBoostCharge }),
            pauseIcon: e.paused && !held ? "play" : "pause",
            pauseHidden: s.noPauseMode && (!e.paused || held),
            pauseTooltip: ss("PAUSE_TOOLTIP", { key: (s.pauseHotkey || "-").toUpperCase() }),
        };
        this.layout.render(vm);

        const state: VisualState = {
            streak: e.streak,
            ratingTrail: e.ratingTrail,
            streakRatings: e.streakRatings,
            fraction: untimed || e.phase === "idle" ? null : fraction,
            phase: e.phase,
            paused: e.paused,
            timedOut: e.timedOut,
            isNewBest: newBest,
        };
        this.visual?.update(state);

        // Pause screen: filled in once when the (real) pause starts
        const showPause = e.paused && !held;
        if (showPause && !this.pauseOverlay.visible) {
            this.pauseOverlay.show(pauseOverview(e.summary, e.streak));
        } else if (!showPause && this.pauseOverlay.visible) {
            this.pauseOverlay.hide();
        }
    }
}
