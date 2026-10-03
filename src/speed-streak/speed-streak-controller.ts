import "src/speed-streak/speed-streak.css";

import { Notice, Platform, setIcon } from "obsidian";

import type SRPlugin from "src/main";
import { ReviewResponse } from "src/scheduling/algorithms/base/repetition-item";
import { SpeedStreakAudio, SpeedStreakSound } from "src/speed-streak/speed-streak-audio";
import {
    SpeedStreakEngine,
    SpeedStreakEvent,
    SpeedStreakRating,
    SpeedStreakSessionSummary,
} from "src/speed-streak/speed-streak-engine";
import { ss } from "src/speed-streak/speed-streak-i18n";
import {
    applySpeedStreakTheme,
    getSpeedStreakTheme,
    parseColor,
    RGB,
    timerColor,
} from "src/speed-streak/speed-streak-themes";
import {
    bestRun,
    localDayKey,
    MAX_STORED_RUNS,
    normalizeSpeedStreakData,
    normalizeSpeedStreakSettings,
    parseTimerRules,
    resolveTimerPolicy,
    SpeedStreakData,
    SpeedStreakRunRecord,
    SpeedStreakSettings,
    SpeedStreakTimerRule,
} from "src/speed-streak/speed-streak-settings";

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SVG_NS = "http://www.w3.org/2000/svg";

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

/**
 * Glue between the review view and the Speed Streak engine: renders the HUD,
 * runs the timer loop, plays feedback and stores records.
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

    private loopHandle: number | null = null;
    private interrupted = false;
    private interruptPausedByUs = false;
    private bestAllTime = 0;
    private bestToday = 0;
    private newRecordThisSession = false;

    // DOM
    private hud: HTMLElement;
    private timerEl: HTMLElement;
    private ringProgress: SVGCircleElement;
    private timerText: HTMLElement;
    private phaseLabel: HTMLElement;
    private streakNum: HTMLElement;
    private streakLabel: HTMLElement;
    private recordEl: HTMLElement;
    private trailEl: HTMLElement;
    private toastEl: HTMLElement;
    private boostBtn: HTMLButtonElement;
    private boostLabel: HTMLElement;
    private pipsEl: HTMLElement;
    private boostProgressFill: HTMLElement;
    private pauseBtn: HTMLButtonElement;
    private barFill: HTMLElement;
    private pausedOverlay: HTMLElement;
    private toastTimer: number | null = null;
    private themeRgb: { good: RGB; hard: RGB; again: RGB } | null = null;
    private lastRenderedTrail = "";

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
        this.buildHud();
    }

    // MARK: Public API used by the card container

    get isEnabled(): boolean {
        return this.settings.enabled;
    }

    startSession(deckName: string) {
        this.refreshSettings();
        if (!this.settings.enabled) {
            this.hud.addClass("sr-is-hidden");
            return;
        }
        this.loadRecords();
        this.newRecordThisSession = false;
        this.engine.bestToBeat = this.recordTarget();
        this.engine.startSession(deckName);
        SpeedStreakController.active = this;
        this.placeHud();
        this.themeRgb = null;
        this.hud.removeClass("sr-is-hidden");
        this.attachWindowListeners();
        this.startLoop();
        this.render();
    }

    endSession() {
        this.stopLoop();
        this.detachWindowListeners();
        const summary = this.engine.endSession();
        this.hud.addClass("sr-is-hidden");
        this.pausedOverlay.removeClass("is-visible");
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

    /** Returns true when the key was consumed. */
    handleKey(e: KeyboardEvent): boolean {
        if (!this.engine.sessionActive || !this.settings.enabled) return false;
        if (e.ctrlKey || e.metaKey || e.altKey) return false;
        const key = (e.key ?? "").toLowerCase();
        if (!key) return false;
        if (this.settings.boostHotkey && key === this.settings.boostHotkey.toLowerCase()) {
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
        this.engine.togglePause();
        this.render();
    }

    refreshSettings() {
        this.settings = getSpeedStreakSettings(this.plugin);
        this.rules = parseTimerRules(this.settings.specialTimerRules);
        this.engine.updateSettings(this.settings);
        this.audio.enabled = this.settings.soundEnabled;
        this.audio.volume = this.settings.soundVolume / 100;
        this.hud?.toggleClass("sr-ss-reduced-motion", this.settings.reducedMotion);
        this.applyTheme();
        if (this.engine.sessionActive) {
            if (!this.settings.enabled) {
                this.endSession();
            } else {
                this.placeHud();
                this.render();
            }
        }
    }

    destroy() {
        this.endSession();
        this.audio.dispose();
        this.hud.remove();
        this.pausedOverlay.remove();
    }

    // MARK: Records

    private loadRecords() {
        const data = getSpeedStreakData(this.plugin);
        const today = localDayKey(Date.now());
        this.bestAllTime = bestRun(data.runs)?.streak ?? 0;
        this.bestToday = bestRun(data.runs, (r) => r.day === today)?.streak ?? 0;
    }

    private recordTarget(): number {
        return this.settings.recordDisplay === "today" ? this.bestToday : this.bestAllTime;
    }

    private recordRun(run: SpeedStreakRunRecord) {
        const data = getSpeedStreakData(this.plugin);
        data.runs.push(run);
        if (data.runs.length > MAX_STORED_RUNS)
            data.runs.splice(0, data.runs.length - MAX_STORED_RUNS);
        if (run.streak > this.bestAllTime) {
            this.bestAllTime = run.streak;
            this.newRecordThisSession = true;
        }
        if (run.day === localDayKey(Date.now()) && run.streak > this.bestToday)
            this.bestToday = run.streak;
        this.engine.bestToBeat = this.recordTarget();
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
        if (this.newRecordThisSession) lines.push(ss("SUMMARY_RECORD", { n: this.bestAllTime }));
        new Notice(lines.join("\n"), 8000);
    }

    // MARK: Engine events → feedback

    private onEngineEvent(e: SpeedStreakEvent) {
        switch (e.type) {
            case "reveal":
                this.play("reveal");
                break;
            case "rate":
                if (e.rating) this.play(e.rating);
                if (e.rating && e.text !== "again-break") this.pulse("sr-ss-bump");
                if (e.text === "again-break") this.flashLoss();
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
                this.flashLoss();
                this.toast(ss("TIMEOUT"), "bad");
                break;
            case "answer-timeout":
                this.toast(ss("ANSWER_TIMEOUT"), "warn");
                break;
            case "streak-lost":
                if (e.run) this.recordRun(e.run);
                break;
            case "boost":
                this.play("boost");
                this.vibrate(30);
                this.pulse("sr-ss-boosted");
                this.toast(`+${this.settings.boostSeconds}s`, "boost");
                break;
            case "boost-earned":
                this.play("boost-earned");
                this.toast(ss("BOOST_EARNED"), "boost");
                break;
            case "boost-blocked":
                this.play("blocked");
                this.toast(this.boostBlockedText(e.text ?? ""), "warn");
                break;
            case "pause-blocked":
                this.play("blocked");
                this.toast(ss("PAUSE_BLOCKED"), "warn");
                break;
            case "new-best":
                this.play("new-best");
                this.vibrate([30, 30, 30]);
                this.pulse("sr-ss-record-glow");
                this.toast(ss("NEW_BEST"), "good");
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
        if (this.settings.reducedMotion) return;
        this.hud.removeClass(cls);
        void this.hud.offsetWidth; // restart animation
        this.hud.addClass(cls);
        window.setTimeout(() => this.hud.removeClass(cls), 700);
    }

    private flashLoss() {
        this.pulse("sr-ss-shake");
    }

    private toast(text: string, kind: "good" | "bad" | "warn" | "boost") {
        this.toastEl.setText(text);
        this.toastEl.className = `sr-ss-toast sr-ss-toast-${kind} is-visible`;
        if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
        this.toastTimer = window.setTimeout(() => {
            this.toastEl.removeClass("is-visible");
            this.toastTimer = null;
        }, 1600);
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
        if (this.interrupted) return;
        if (this.engine.paused && this.engine.pauseOrigin === "auto") {
            this.engine.resume();
            this.render();
        }
    };

    private onVisibility = () => {
        if (activeDocument.hidden) this.onWindowBlur();
        else this.onWindowFocus();
    };

    private attachWindowListeners() {
        window.addEventListener("blur", this.onWindowBlur);
        window.addEventListener("focus", this.onWindowFocus);
        activeDocument.addEventListener("visibilitychange", this.onVisibility);
    }

    private detachWindowListeners() {
        window.removeEventListener("blur", this.onWindowBlur);
        window.removeEventListener("focus", this.onWindowFocus);
        activeDocument.removeEventListener("visibilitychange", this.onVisibility);
    }

    // MARK: HUD

    private placeHud() {
        if (this.settings.hudPosition === "bottom") {
            this.bottomAnchor.insertAdjacentElement("beforebegin", this.hud);
        } else {
            this.topAnchor.insertAdjacentElement("beforebegin", this.hud);
        }
        this.hud.toggleClass("sr-ss-at-bottom", this.settings.hudPosition === "bottom");
    }

    // MARK: Theme

    private applyTheme() {
        if (!this.hud) return;
        applySpeedStreakTheme(this.hud, getSpeedStreakTheme(this.settings.theme));
        this.themeRgb = null; // re-resolve colors lazily
    }

    /** Resolves a theme CSS variable (which may reference Obsidian variables) to RGB. */
    private resolveVar(cssVar: string): RGB | null {
        const probe = this.hud.createSpan();
        probe.style.color = `var(${cssVar})`;
        probe.style.display = "none";
        const computed = getComputedStyle(probe).color;
        probe.remove();
        return parseColor(computed);
    }

    private timeColor(fraction: number, untimed: boolean): string {
        if (untimed) return "var(--ss-faint)";
        if (!this.themeRgb) {
            const good = this.resolveVar("--ss-good");
            const hard = this.resolveVar("--ss-hard");
            const again = this.resolveVar("--ss-again");
            if (!good || !hard || !again) return "var(--ss-good)";
            this.themeRgb = { good, hard, again };
        }
        const { good, hard, again } = this.themeRgb;
        return timerColor(fraction, good, hard, again);
    }

    private buildHud() {
        this.hud = this.hostEl.createDiv({ cls: "sr-ss-hud sr-is-hidden" });
        this.hud.toggleClass("sr-ss-reduced-motion", this.settings.reducedMotion);
        this.applyTheme();

        // Timer ring
        this.timerEl = this.hud.createDiv({ cls: "sr-ss-timer" });
        this.timerEl.setAttr("aria-label", ss("PAUSE_TOOLTIP", { key: "P" }));
        this.timerEl.addEventListener("click", () => this.togglePause());
        const svg = activeDocument.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 64 64");
        svg.classList.add("sr-ss-ring");
        const track = activeDocument.createElementNS(SVG_NS, "circle");
        track.setAttribute("cx", "32");
        track.setAttribute("cy", "32");
        track.setAttribute("r", String(RING_RADIUS));
        track.classList.add("sr-ss-ring-track");
        this.ringProgress = activeDocument.createElementNS(SVG_NS, "circle");
        this.ringProgress.setAttribute("cx", "32");
        this.ringProgress.setAttribute("cy", "32");
        this.ringProgress.setAttribute("r", String(RING_RADIUS));
        this.ringProgress.setAttribute("stroke-dasharray", String(RING_CIRCUMFERENCE));
        this.ringProgress.classList.add("sr-ss-ring-progress");
        svg.appendChild(track);
        svg.appendChild(this.ringProgress);
        this.timerEl.appendChild(svg);
        const timerInner = this.timerEl.createDiv({ cls: "sr-ss-timer-inner" });
        this.timerText = timerInner.createDiv({ cls: "sr-ss-timer-text" });
        this.phaseLabel = timerInner.createDiv({ cls: "sr-ss-phase-label" });

        // Center: streak + record + trail
        const center = this.hud.createDiv({ cls: "sr-ss-center" });
        const streakRow = center.createDiv({ cls: "sr-ss-streak" });
        const streakIcon = streakRow.createSpan({ cls: "sr-ss-streak-icon" });
        setIcon(streakIcon, "zap");
        this.streakNum = streakRow.createSpan({ cls: "sr-ss-streak-num", text: "0" });
        this.streakLabel = streakRow.createSpan({ cls: "sr-ss-streak-label", text: ss("STREAK") });
        this.recordEl = center.createDiv({ cls: "sr-ss-record" });
        this.trailEl = center.createDiv({ cls: "sr-ss-trail" });
        this.toastEl = center.createDiv({ cls: "sr-ss-toast" });

        // Right: boost bank + pause
        const right = this.hud.createDiv({ cls: "sr-ss-right" });
        const bank = right.createDiv({ cls: "sr-ss-bank" });
        this.boostBtn = bank.createEl("button", { cls: "sr-ss-boost-btn" });
        const boostIcon = this.boostBtn.createSpan({ cls: "sr-ss-boost-icon" });
        setIcon(boostIcon, "fast-forward");
        this.boostLabel = this.boostBtn.createSpan({ cls: "sr-ss-boost-label" });
        this.boostBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.useBoost();
        });
        this.pipsEl = bank.createDiv({ cls: "sr-ss-pips" });
        const progress = bank.createDiv({ cls: "sr-ss-boost-progress" });
        this.boostProgressFill = progress.createDiv({ cls: "sr-ss-boost-progress-fill" });

        this.pauseBtn = right.createEl("button", { cls: "sr-ss-pause-btn clickable-icon" });
        setIcon(this.pauseBtn, "pause");
        this.pauseBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.togglePause();
        });

        // Linear progress bar
        const bar = this.hud.createDiv({ cls: "sr-ss-bar" });
        this.barFill = bar.createDiv({ cls: "sr-ss-bar-fill" });

        // Paused overlay over the card content
        this.pausedOverlay = this.topAnchor.createDiv({ cls: "sr-ss-paused-overlay" });
        this.pausedOverlay.createDiv({ cls: "sr-ss-paused-title", text: ss("PAUSED") });
        this.pausedOverlay.createDiv({ cls: "sr-ss-paused-hint", text: ss("CLICK_TO_RESUME") });
        this.pausedOverlay.addEventListener("click", () => this.togglePause());
    }

    private render() {
        if (!this.hud || this.hud.hasClass("sr-is-hidden")) return;
        const e = this.engine;
        const s = this.settings;
        const remaining = e.remainingMs();
        const total = e.totalLimitMs();
        const untimed = e.phase !== "idle" && remaining === null;
        const timedOut = e.timedOut;
        const warnMs = s.countdownWarningSeconds * 1000;
        const warning = remaining !== null && remaining > 0 && warnMs > 0 && remaining <= warnMs;

        this.hud.toggleClass("is-paused", e.paused);
        this.pausedOverlay.toggleClass("is-visible", e.paused);
        this.hud.toggleClass("is-auto-paused", e.paused && e.pauseOrigin === "auto");
        this.hud.toggleClass("is-warning", warning && !e.paused);
        this.hud.toggleClass("is-timeout", timedOut);
        this.hud.toggleClass("is-untimed", untimed);
        this.hud.toggleClass("is-free", e.cardIsFree && e.phase !== "idle");
        this.hud.toggleClass("phase-question", e.phase === "question");
        this.hud.toggleClass("phase-answer", e.phase === "answer");
        this.hud.toggleClass("is-boost-mode", s.gameplayMode === "time_boost");
        this.hud.toggleClass("is-new-best", e.streak > 0 && e.streak > this.bestAllTime);

        // Timer text + ring
        let fraction = 1;
        if (remaining === null) {
            this.timerText.setText("∞");
        } else if (remaining >= 0) {
            const secs = remaining / 1000;
            this.timerText.setText(secs >= 10 ? Math.ceil(secs).toString() : secs.toFixed(1));
            fraction = total && total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
        } else {
            this.timerText.setText(`+${(-remaining / 1000).toFixed(remaining > -10000 ? 1 : 0)}`);
            fraction = 0;
        }
        this.ringProgress.setAttribute(
            "stroke-dashoffset",
            String(RING_CIRCUMFERENCE * (1 - fraction)),
        );
        this.barFill.style.transform = `scaleX(${fraction})`;
        this.hud.style.setProperty("--sr-ss-time-color", this.timeColor(fraction, untimed));

        let label = "";
        if (e.paused) label = ss("PAUSED");
        else if (e.cardIsFree && e.phase !== "idle") label = ss("FREE");
        else if (untimed) label = ss("UNTIMED");
        else if (e.phase === "question") label = ss("QUESTION");
        else if (e.phase === "answer") label = ss("ANSWER");
        this.phaseLabel.setText(label);
        if (e.policy.source && e.phase !== "idle") {
            this.phaseLabel.setAttr("title", `${ss("RULE_PREFIX")}: ${e.policy.source}`);
        }

        // Streak
        this.streakNum.setText(String(e.streak));
        this.streakLabel.setText(ss("STREAK"));

        // Record line
        const parts: string[] = [];
        if (s.gameplayMode === "points") {
            parts.push(`${ss("SCORE")} ${e.score} · ×${e.multiplier().toFixed(2)}`);
        }
        const liveAll = Math.max(this.bestAllTime, e.streak);
        const liveToday = Math.max(this.bestToday, e.streak);
        if (s.recordDisplay === "all_time" || s.recordDisplay === "both")
            parts.push(`🏆 ${liveAll}`);
        if (s.recordDisplay === "today" || s.recordDisplay === "both")
            parts.push(`${ss("TODAY")} ${liveToday}`);
        this.recordEl.setText(parts.join("  ·  "));
        this.recordEl.toggleClass("sr-is-hidden", parts.length === 0);

        // Trail
        if (s.showRatingTrail) {
            const trail = e.ratingTrail.slice(-16).join(",");
            if (trail !== this.lastRenderedTrail) {
                this.lastRenderedTrail = trail;
                this.trailEl.empty();
                for (const r of e.ratingTrail.slice(-16)) {
                    this.trailEl.createSpan({ cls: `sr-ss-dot sr-ss-dot-${r}` });
                }
            }
            this.trailEl.removeClass("sr-is-hidden");
        } else {
            this.trailEl.addClass("sr-is-hidden");
        }

        // Boost bank
        const boostMode = s.gameplayMode === "time_boost";
        this.boostBtn.parentElement?.toggleClass("sr-is-hidden", !boostMode);
        if (boostMode) {
            this.boostLabel.setText(`+${s.boostSeconds}s`);
            this.boostBtn.disabled = e.boostUnavailableReason() !== "";
            this.boostBtn.setAttr(
                "aria-label",
                ss("BOOST_TOOLTIP", {
                    s: s.boostSeconds,
                    key: (s.boostHotkey || "-").toUpperCase(),
                }),
            );
            const pipsKey = `${e.boostCharges}/${s.maxBoostCharges}`;
            if (this.pipsEl.dataset.key !== pipsKey) {
                this.pipsEl.dataset.key = pipsKey;
                this.pipsEl.empty();
                for (let i = 0; i < s.maxBoostCharges; i++) {
                    this.pipsEl.createSpan({
                        cls: `sr-ss-pip ${i < e.boostCharges ? "is-full" : ""}`,
                    });
                }
            }
            const full = e.boostCharges >= s.maxBoostCharges;
            const progressFraction = full ? 1 : e.boostProgress / s.cardsPerBoostCharge;
            this.boostProgressFill.style.transform = `scaleX(${progressFraction})`;
            this.pipsEl.parentElement?.setAttr(
                "title",
                full
                    ? ss("BOOST_FULL")
                    : ss("BOOST_PROGRESS", { n: e.boostProgress, m: s.cardsPerBoostCharge }),
            );
        }

        // Pause button
        const pauseIcon = e.paused ? "play" : "pause";
        if (this.pauseBtn.dataset.icon !== pauseIcon) {
            this.pauseBtn.dataset.icon = pauseIcon;
            setIcon(this.pauseBtn, pauseIcon);
        }
        this.pauseBtn.toggleClass("sr-is-hidden", s.noPauseMode && !e.paused);
        this.pauseBtn.setAttr(
            "aria-label",
            ss("PAUSE_TOOLTIP", { key: (s.pauseHotkey || "-").toUpperCase() }),
        );
    }
}
