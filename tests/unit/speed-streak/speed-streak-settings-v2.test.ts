import {
    DEFAULT_SPEED_STREAK_SETTINGS,
    normalizeSpeedStreakData,
    normalizeSpeedStreakSettings,
    performanceProfile,
    resolveLayout,
    resolvePerformance,
    SIDE_PANEL_MIN_WIDTH,
    SpeedStreakSettings,
    STYLE_DEFAULT_THEME,
} from "src/speed-streak/speed-streak-settings";

/** Settings as saved by the first Speed Streak version (before styles & layouts). */
const OLD_SAVED = {
    enabled: true,
    gameplayMode: "points",
    questionSeconds: 20,
    answerSeconds: 10,
    freeFirstCard: false,
    answerTimeoutBreaksStreak: true,
    againBreaksStreak: true,
    specialTimerRules: "#anatomia = 30/15",
    boostSeconds: 10,
    maxBoostCharges: 5,
    startingBoostCharges: 3,
    cardsPerBoostCharge: 10,
    noPauseMode: false,
    autoPauseOnLeave: true,
    countdownWarningSeconds: 3,
    soundEnabled: true,
    soundVolume: 40,
    countdownSound: true,
    vibrationEnabled: true,
    hudPosition: "bottom",
    theme: "forest",
    recordDisplay: "today",
    showRatingTrail: true,
    showSessionSummary: true,
    reducedMotion: false,
    pauseHotkey: "p",
    boostHotkey: "c",
} as unknown as Partial<SpeedStreakSettings>;

describe("settings v2: old data.json", () => {
    test("old values are kept, new fields get defaults", () => {
        const s = normalizeSpeedStreakSettings(OLD_SAVED);
        expect(s.gameplayMode).toBe("points");
        expect(s.questionSeconds).toBe(20);
        expect(s.againBreaksStreak).toBe(true);
        expect(s.specialTimerRules).toBe("#anatomia = 30/15");
        expect(s.soundVolume).toBe(40);
        expect(s.hudPosition).toBe("bottom");
        expect(s.theme).toBe("forest");
        // new
        expect(s.visualStyle).toBe("fusion");
        expect(s.layout).toBe("auto");
        expect(s.performance).toBe("auto");
        expect(s.recordsView).toBe("top5");
        expect(s.recordsList).toBe("ranking");
        expect(s.recordsFilter).toBe("all");
        expect(s.celebrateNewBest).toBe(true);
        expect(s.sidePanelCollapsed).toBe(false);
        // the old "Record to beat: today" becomes the "today" scope
        expect(s.recordScope).toBe("today");
    });

    test("old 'both' / 'all time' record setting → all-time scope", () => {
        const s = normalizeSpeedStreakSettings({ ...OLD_SAVED, recordDisplay: "both" });
        expect(s.recordScope).toBe("all_time");
    });

    test("old records still load", () => {
        const data = normalizeSpeedStreakData({
            version: 1,
            runs: [
                {
                    streak: 7,
                    score: 0,
                    startedAt: 1,
                    endedAt: 2,
                    day: "2026-09-01",
                    activeMs: 1000,
                    cards: 7,
                    pauses: 1,
                    boostsUsed: 0,
                    pure: false,
                    endReason: "timeout",
                    deck: "x",
                },
            ],
        });
        expect(data.runs).toHaveLength(1);
        expect(data.runs[0].streak).toBe(7);
    });

    test("unknown style / layout / options fall back", () => {
        const s = normalizeSpeedStreakSettings({
            visualStyle: "webgl-ultra" as SpeedStreakSettings["visualStyle"],
            layout: "window" as SpeedStreakSettings["layout"],
            performance: "ultra" as SpeedStreakSettings["performance"],
            recordsView: "x" as SpeedStreakSettings["recordsView"],
            recordScope: "x" as SpeedStreakSettings["recordScope"],
            recordsList: "x" as SpeedStreakSettings["recordsList"],
            recordsFilter: "x" as SpeedStreakSettings["recordsFilter"],
            celebrateNewBest: "yes" as unknown as boolean,
            theme: "does-not-exist",
        });
        expect(s.visualStyle).toBe("fusion");
        expect(s.layout).toBe("auto");
        expect(s.performance).toBe("auto");
        expect(s.recordsView).toBe("top5");
        expect(s.recordScope).toBe("all_time");
        expect(s.recordsList).toBe("ranking");
        expect(s.recordsFilter).toBe("all");
        expect(s.celebrateNewBest).toBe(true);
        expect(s.theme).toBe("obsidian");
    });

    test("valid new values are kept; 'auto' theme = style default", () => {
        const s = normalizeSpeedStreakSettings({
            visualStyle: "crystal",
            layout: "side-left",
            performance: "minimal",
            theme: STYLE_DEFAULT_THEME,
            recordsFilter: "pure",
        });
        expect(s.visualStyle).toBe("crystal");
        expect(s.layout).toBe("side-left");
        expect(s.performance).toBe("minimal");
        expect(s.theme).toBe("auto");
        expect(s.recordsFilter).toBe("pure");
        expect(DEFAULT_SPEED_STREAK_SETTINGS.theme).toBe("auto");
    });

    test("garbage input", () => {
        expect(normalizeSpeedStreakSettings("x" as never).visualStyle).toBe("fusion");
        expect(normalizeSpeedStreakSettings(null).layout).toBe("auto");
    });
});

describe("layout and performance", () => {
    test("auto layout: side panel from the threshold width", () => {
        expect(resolveLayout("auto", SIDE_PANEL_MIN_WIDTH)).toBe("side-right");
        expect(resolveLayout("auto", 1366)).toBe("side-right");
        expect(resolveLayout("auto", SIDE_PANEL_MIN_WIDTH - 1)).toBe("compact");
        expect(resolveLayout("auto", 390)).toBe("compact"); // phone
        expect(resolveLayout("auto", 820)).toBe("compact"); // iPad portrait
        expect(resolveLayout("auto", 1180)).toBe("side-right"); // iPad landscape
    });

    test("fixed layouts ignore the width", () => {
        expect(resolveLayout("compact", 2000)).toBe("compact");
        expect(resolveLayout("side-left", 300)).toBe("side-left");
    });

    test("performance: auto is Full on computers and Light on mobile", () => {
        expect(resolvePerformance("auto", false)).toBe("full");
        expect(resolvePerformance("auto", true)).toBe("light");
        expect(resolvePerformance("minimal", false)).toBe("minimal");
        expect(performanceProfile("full")).toEqual({ fps: 60, particles: 1 });
        expect(performanceProfile("light")).toEqual({ fps: 30, particles: 0.4 });
        expect(performanceProfile("minimal").fps).toBe(0);
    });
});
