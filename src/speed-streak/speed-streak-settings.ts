/**
 * Speed Streak — settings, persisted data and timer-rule parsing.
 *
 * Port of the Anki add-on "Speed Streak" (https://ankiweb.net/shared/info/1237336370)
 * for the Obsidian Spaced Repetition plugin.
 */

import { getSpeedStreakTheme } from "src/speed-streak/speed-streak-themes";

export type SpeedStreakGameplayMode = "time_boost" | "points";
export type SpeedStreakRecordDisplay = "all_time" | "today" | "both" | "none";
export type SpeedStreakHudPosition = "top" | "bottom";

/** Visual styles ("scenes"), see visuals/visual-registry.ts. Unknown → "fusion". */
export const SPEED_STREAK_VISUAL_IDS = ["fusion", "singularity", "crystal", "minimal"] as const;
export type SpeedStreakVisualId = (typeof SPEED_STREAK_VISUAL_IDS)[number];
export const DEFAULT_SPEED_STREAK_VISUAL: SpeedStreakVisualId = "fusion";

/** Layout of the HUD. "auto": side panel when the view is wide enough, else compact bar. */
export type SpeedStreakLayoutSetting = "auto" | "compact" | "side-left" | "side-right";
export type SpeedStreakLayout = "compact" | "side-left" | "side-right";
/** Minimum width of the review view (px) for the side panel in "auto". */
export const SIDE_PANEL_MIN_WIDTH = 900;

/** "auto" = Full on computers, Light on phones / tablets. */
export type SpeedStreakPerformanceSetting = "auto" | "full" | "light" | "minimal";
export type SpeedStreakPerformance = "full" | "light" | "minimal";

/** Theme id meaning "the default theme of the chosen visual style". */
export const STYLE_DEFAULT_THEME = "auto";

export type SpeedStreakRecordsView = "record" | "bar" | "top5";
export type SpeedStreakRecordScope = "all_time" | "today";
export type SpeedStreakRecordsList = "ranking" | "recent";
export type SpeedStreakRecordsFilter = "all" | "pure";

export interface SpeedStreakSettings {
    enabled: boolean;
    gameplayMode: SpeedStreakGameplayMode;

    // Timers
    questionSeconds: number;
    answerSeconds: number;
    freeFirstCard: boolean;
    answerTimeoutBreaksStreak: boolean;
    againBreaksStreak: boolean;
    /** Extra rules, one per line: `#tag = 30/15`, `#tag = +10/+0`, `#tag = untimed`, `deck/path = -/20` */
    specialTimerRules: string;

    // Time Boost
    boostSeconds: number;
    maxBoostCharges: number;
    startingBoostCharges: number;
    cardsPerBoostCharge: number;

    // Focus rules
    noPauseMode: boolean;
    autoPauseOnLeave: boolean;

    // Feedback
    countdownWarningSeconds: number;
    soundEnabled: boolean;
    soundVolume: number;
    countdownSound: boolean;
    vibrationEnabled: boolean;

    // Display
    /** Visual style (scene), see visuals/visual-registry.ts */
    visualStyle: SpeedStreakVisualId;
    layout: SpeedStreakLayoutSetting;
    /** Side panel folded to a narrow strip */
    sidePanelCollapsed: boolean;
    /** Compact bar: above the card or above the buttons */
    hudPosition: SpeedStreakHudPosition;
    /** Theme id, see speed-streak-themes.ts; "auto" = default theme of the visual style */
    theme: string;
    performance: SpeedStreakPerformanceSetting;
    showRatingTrail: boolean;
    showSessionSummary: boolean;
    reducedMotion: boolean;

    // Records
    recordsView: SpeedStreakRecordsView;
    recordScope: SpeedStreakRecordScope;
    recordsList: SpeedStreakRecordsList;
    recordsFilter: SpeedStreakRecordsFilter;
    celebrateNewBest: boolean;
    /** @deprecated replaced by recordScope / recordsView; kept so old data still loads */
    recordDisplay: SpeedStreakRecordDisplay;

    // Shortcuts (single key, case-insensitive)
    pauseHotkey: string;
    boostHotkey: string;
}

export const DEFAULT_SPEED_STREAK_SETTINGS: SpeedStreakSettings = {
    enabled: true,
    gameplayMode: "time_boost",

    questionSeconds: 12,
    answerSeconds: 8,
    freeFirstCard: true,
    answerTimeoutBreaksStreak: true,
    againBreaksStreak: false,
    specialTimerRules: "",

    boostSeconds: 10,
    maxBoostCharges: 5,
    startingBoostCharges: 3,
    cardsPerBoostCharge: 10,

    noPauseMode: false,
    autoPauseOnLeave: true,

    countdownWarningSeconds: 3,
    soundEnabled: false,
    soundVolume: 60,
    countdownSound: true,
    vibrationEnabled: true,

    visualStyle: DEFAULT_SPEED_STREAK_VISUAL,
    layout: "auto",
    sidePanelCollapsed: false,
    hudPosition: "top",
    theme: STYLE_DEFAULT_THEME,
    performance: "auto",
    showRatingTrail: true,
    showSessionSummary: true,
    reducedMotion: false,

    recordsView: "top5",
    recordScope: "all_time",
    recordsList: "ranking",
    recordsFilter: "all",
    celebrateNewBest: true,
    recordDisplay: "both",

    pauseHotkey: "p",
    boostHotkey: "c",
};

/** Merges stored (possibly partial / outdated) settings with defaults. */
export function normalizeSpeedStreakSettings(
    stored: Partial<SpeedStreakSettings> | null | undefined,
): SpeedStreakSettings {
    const source: Partial<SpeedStreakSettings> = stored && typeof stored === "object" ? stored : {};
    const merged: SpeedStreakSettings = Object.assign({}, DEFAULT_SPEED_STREAK_SETTINGS, source);
    const num = (v: unknown, def: number, min: number, max: number) => {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        if (!Number.isFinite(n)) return def;
        return Math.min(max, Math.max(min, n));
    };
    const d = DEFAULT_SPEED_STREAK_SETTINGS;
    merged.questionSeconds = num(merged.questionSeconds, d.questionSeconds, 1, 3600);
    merged.answerSeconds = num(merged.answerSeconds, d.answerSeconds, 1, 3600);
    merged.boostSeconds = num(merged.boostSeconds, d.boostSeconds, 0.5, 600);
    merged.maxBoostCharges = Math.round(num(merged.maxBoostCharges, d.maxBoostCharges, 0, 99));
    merged.startingBoostCharges = Math.round(
        num(merged.startingBoostCharges, d.startingBoostCharges, 0, merged.maxBoostCharges),
    );
    merged.cardsPerBoostCharge = Math.round(
        num(merged.cardsPerBoostCharge, d.cardsPerBoostCharge, 1, 999),
    );
    merged.countdownWarningSeconds = Math.round(
        num(merged.countdownWarningSeconds, d.countdownWarningSeconds, 0, 60),
    );
    merged.soundVolume = Math.round(num(merged.soundVolume, d.soundVolume, 0, 100));
    if (merged.gameplayMode !== "points") merged.gameplayMode = "time_boost";
    if (!["all_time", "today", "both", "none"].includes(merged.recordDisplay))
        merged.recordDisplay = d.recordDisplay;
    if (merged.hudPosition !== "bottom") merged.hudPosition = "top";
    merged.theme =
        merged.theme === STYLE_DEFAULT_THEME
            ? STYLE_DEFAULT_THEME
            : getSpeedStreakTheme(merged.theme).id;
    const oneOf = <T extends string>(value: unknown, allowed: readonly T[], def: T): T =>
        allowed.includes(value as T) ? (value as T) : def;
    const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
    merged.visualStyle = oneOf(merged.visualStyle, SPEED_STREAK_VISUAL_IDS, d.visualStyle);
    merged.layout = oneOf(
        merged.layout,
        ["auto", "compact", "side-left", "side-right"] as const,
        "auto",
    );
    merged.performance = oneOf(
        merged.performance,
        ["auto", "full", "light", "minimal"] as const,
        "auto",
    );
    merged.recordsView = oneOf(merged.recordsView, ["record", "bar", "top5"] as const, "top5");
    // Old data: "today" in the former "Record to beat" setting means today's scope
    const scopeFallback: SpeedStreakRecordScope =
        source.recordDisplay === "today" ? "today" : "all_time";
    merged.recordScope = oneOf(merged.recordScope, ["all_time", "today"] as const, scopeFallback);
    merged.recordsList = oneOf(merged.recordsList, ["ranking", "recent"] as const, "ranking");
    merged.recordsFilter = oneOf(merged.recordsFilter, ["all", "pure"] as const, "all");
    merged.celebrateNewBest = bool(merged.celebrateNewBest, true);
    merged.sidePanelCollapsed = bool(merged.sidePanelCollapsed, false);
    merged.pauseHotkey = String(merged.pauseHotkey ?? "").slice(0, 1);
    merged.boostHotkey = String(merged.boostHotkey ?? "").slice(0, 1);
    merged.specialTimerRules = String(merged.specialTimerRules ?? "");
    return merged;
}

// MARK: Persisted records

export interface SpeedStreakRunRecord {
    streak: number;
    /** Points (only in points mode) */
    score: number;
    startedAt: number;
    endedAt: number;
    /** Local date, YYYY-MM-DD, of the run end */
    day: string;
    activeMs: number;
    cards: number;
    pauses: number;
    boostsUsed: number;
    /** No manual pauses and no boosts used */
    pure: boolean;
    endReason: "timeout" | "again" | "session-end";
    deck: string;
}

export interface SpeedStreakData {
    version: number;
    runs: SpeedStreakRunRecord[];
    totals: {
        cardsAnswered: number;
        timeouts: number;
        boostsUsed: number;
        activeMs: number;
        sessions: number;
    };
}

export const MAX_STORED_RUNS = 300;

export function createDefaultSpeedStreakData(): SpeedStreakData {
    return {
        version: 1,
        runs: [],
        totals: { cardsAnswered: 0, timeouts: 0, boostsUsed: 0, activeMs: 0, sessions: 0 },
    };
}

export function normalizeSpeedStreakData(
    stored: Partial<SpeedStreakData> | null | undefined,
): SpeedStreakData {
    const def = createDefaultSpeedStreakData();
    if (!stored || typeof stored !== "object") return def;
    return {
        version: 1,
        runs: Array.isArray(stored.runs) ? stored.runs.slice(-MAX_STORED_RUNS) : [],
        totals: Object.assign(def.totals, stored.totals ?? {}),
    };
}

export function localDayKey(epochMs: number): string {
    const d = new Date(epochMs);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

export function bestRun(
    runs: SpeedStreakRunRecord[],
    filter?: (r: SpeedStreakRunRecord) => boolean,
): SpeedStreakRunRecord | null {
    let best: SpeedStreakRunRecord | null = null;
    for (const r of runs) {
        if (filter && !filter(r)) continue;
        if (
            best === null ||
            r.streak > best.streak ||
            (r.streak === best.streak && r.activeMs < best.activeMs)
        ) {
            best = r;
        }
    }
    return best;
}

export function topRuns(runs: SpeedStreakRunRecord[], n: number): SpeedStreakRunRecord[] {
    return [...runs]
        .filter((r) => r.streak > 0)
        .sort((a, b) => b.streak - a.streak || a.activeMs - b.activeMs)
        .slice(0, n);
}

// MARK: Special timer rules

export interface TimerPolicy {
    /** Question limit in ms. `null` = untimed. */
    questionMs: number | null;
    /** Answer limit in ms. `null` = untimed. */
    answerMs: number | null;
    /** Rule that produced this policy ("" = default) */
    source: string;
}

interface ParsedSide {
    kind: "abs" | "extra" | "untimed" | "default";
    seconds: number;
}

export interface SpeedStreakTimerRule {
    matcher: string;
    question: ParsedSide;
    answer: ParsedSide;
}

function parseSide(raw: string): ParsedSide | null {
    const s = raw.trim().toLowerCase();
    if (s === "" || s === "-" || s === "default") return { kind: "default", seconds: 0 };
    if (s === "untimed" || s === "off" || s === "∞" || s === "inf" || s === "bez")
        return { kind: "untimed", seconds: 0 };
    const m = /^([+]?)(\d+(?:[.,]\d+)?)\s*s?$/.exec(s);
    if (!m) return null;
    const seconds = parseFloat(m[2].replace(",", "."));
    return { kind: m[1] === "+" ? "extra" : "abs", seconds };
}

/**
 * Parses rules, one per line:
 *   #tag = 30/15        absolute question/answer seconds
 *   #tag = +10/+5       extra seconds on top of default
 *   #tag = untimed      both sides untimed
 *   #tag = -/untimed    keep question default, answer untimed
 *   deck/sub = 20       question 20s, answer default
 * Lines starting with `//` or `%` are comments.
 */
export function parseTimerRules(text: string): SpeedStreakTimerRule[] {
    const rules: SpeedStreakTimerRule[] = [];
    for (const line of (text ?? "").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("%")) continue;
        const eq = trimmed.search(/[=:]/);
        if (eq <= 0) continue;
        const matcher = trimmed.slice(0, eq).trim().toLowerCase();
        const value = trimmed.slice(eq + 1).trim();
        if (!matcher) continue;
        const parts = value.split("/");
        const q = parseSide(parts[0] ?? "");
        const a = parts.length > 1 ? parseSide(parts[1]) : q?.kind === "untimed" ? q : null;
        const answer = a ?? (parts.length > 1 ? null : { kind: "default" as const, seconds: 0 });
        if (!q || !answer) continue;
        rules.push({ matcher, question: q, answer });
    }
    return rules;
}

function normalizeTag(tag: string): string {
    return tag.trim().toLowerCase().replace(/^#/, "");
}

/** Does a rule matcher match any of the card's tags or its deck path? */
export function ruleMatches(matcher: string, tags: string[], deckPath: string): boolean {
    const m = normalizeTag(matcher);
    if (!m) return false;
    const normalizedTags = tags.map(normalizeTag);
    const deck = normalizeTag(deckPath);
    const candidates = [...normalizedTags, deck];
    return candidates.some((c) => c === m || c.startsWith(m + "/"));
}

export function resolveTimerPolicy(
    settings: SpeedStreakSettings,
    rules: SpeedStreakTimerRule[],
    tags: string[],
    deckPath: string,
): TimerPolicy {
    const baseQ = settings.questionSeconds * 1000;
    const baseA = settings.answerSeconds * 1000;
    const rule = rules.find((r) => ruleMatches(r.matcher, tags, deckPath));
    if (!rule) return { questionMs: baseQ, answerMs: baseA, source: "" };
    const apply = (side: ParsedSide, base: number): number | null => {
        switch (side.kind) {
            case "abs":
                return Math.max(500, side.seconds * 1000);
            case "extra":
                return base + side.seconds * 1000;
            case "untimed":
                return null;
            default:
                return base;
        }
    };
    return {
        questionMs: apply(rule.question, baseQ),
        answerMs: apply(rule.answer, baseA),
        source: rule.matcher,
    };
}

// MARK: Layout & performance

/** Which layout to use for a review view of the given width (px). */
export function resolveLayout(
    setting: SpeedStreakLayoutSetting,
    viewWidth: number,
): SpeedStreakLayout {
    if (setting !== "auto") return setting;
    return viewWidth >= SIDE_PANEL_MIN_WIDTH ? "side-right" : "compact";
}

/** Effective performance level ("auto": Full on computers, Light on mobile). */
export function resolvePerformance(
    setting: SpeedStreakPerformanceSetting,
    isMobile: boolean,
): SpeedStreakPerformance {
    if (setting !== "auto") return setting;
    return isMobile ? "light" : "full";
}

export interface PerformanceProfile {
    /** Frames per second of the animation loop; 0 = no loop (draw on change only) */
    fps: number;
    /** Share of the particles / satellites drawn (0–1) */
    particles: number;
}

export function performanceProfile(level: SpeedStreakPerformance): PerformanceProfile {
    switch (level) {
        case "full":
            return { fps: 60, particles: 1 };
        case "light":
            return { fps: 30, particles: 0.4 };
        default:
            return { fps: 0, particles: 0.25 };
    }
}
