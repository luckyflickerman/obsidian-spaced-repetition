import { SpeedStreakEngine, SpeedStreakEvent } from "src/speed-streak/speed-streak-engine";
import {
    bestRun,
    DEFAULT_SPEED_STREAK_SETTINGS,
    normalizeSpeedStreakSettings,
    parseTimerRules,
    resolveTimerPolicy,
    SpeedStreakSettings,
    TimerPolicy,
    topRuns,
} from "src/speed-streak/speed-streak-settings";
import {
    DEFAULT_SPEED_STREAK_THEME_ID,
    getSpeedStreakTheme,
    parseColor,
    RGB,
    SPEED_STREAK_THEMES,
    timerColor,
} from "src/speed-streak/speed-streak-themes";

function setup(overrides: Partial<SpeedStreakSettings> = {}) {
    let now = 1_000_000;
    const settings = normalizeSpeedStreakSettings({
        ...DEFAULT_SPEED_STREAK_SETTINGS,
        freeFirstCard: false,
        ...overrides,
    });
    const engine = new SpeedStreakEngine(settings, () => now);
    const events: SpeedStreakEvent[] = [];
    engine.on((e) => events.push(e));
    const advance = (ms: number) => {
        // tick in 100 ms steps like the real loop
        let left = ms;
        while (left > 0) {
            const step = Math.min(100, left);
            now += step;
            left -= step;
            engine.tick();
        }
    };
    const policy: TimerPolicy = {
        questionMs: settings.questionSeconds * 1000,
        answerMs: settings.answerSeconds * 1000,
        source: "",
    };
    const card = (
        qMs: number,
        aMs: number,
        rating: "again" | "hard" | "good" | "easy" = "good",
    ) => {
        engine.onQuestionShown(policy);
        advance(qMs);
        engine.onAnswerShown();
        advance(aMs);
        engine.onRate(rating);
    };
    engine.startSession("deck");
    return { engine, events, advance, card, policy, settings, getNow: () => now };
}

describe("SpeedStreakEngine", () => {
    test("fast cards build the streak", () => {
        const { engine, card } = setup();
        card(2000, 1000);
        card(3000, 2000, "easy");
        card(1000, 1000, "again");
        expect(engine.streak).toBe(3);
        expect(engine.ratingTrail).toEqual(["good", "easy", "again"]);
    });

    test("question timeout breaks the streak and records the run", () => {
        const { engine, card, events } = setup();
        card(1000, 1000);
        card(1000, 1000);
        card(13000, 1000); // question limit is 12 s
        expect(engine.streak).toBe(0);
        expect(events.some((e) => e.type === "timeout")).toBe(true);
        const lost = events.find((e) => e.type === "streak-lost");
        expect(lost?.run?.streak).toBe(2);
        expect(lost?.run?.endReason).toBe("timeout");
        // the timed-out card does not start a new streak
        card(1000, 1000);
        expect(engine.streak).toBe(1);
    });

    test("answer timeout can be configured not to break the streak", () => {
        const { engine, card, events } = setup({ answerTimeoutBreaksStreak: false });
        card(1000, 1000);
        card(1000, 9000); // answer limit is 8 s
        expect(events.some((e) => e.type === "answer-timeout")).toBe(true);
        expect(engine.streak).toBe(2);
    });

    test("auto pause (reading aloud) freezes the answer timer and keeps the run Pure", () => {
        const { engine, card, events, advance, policy } = setup();
        card(1000, 1000);
        engine.onQuestionShown(policy);
        advance(1000);
        engine.onAnswerShown();
        expect(engine.pause("auto")).toBe(true);
        advance(30000); // reading takes longer than the 8 s answer limit
        expect(engine.remainingMs()).toBe(8000);
        engine.resume();
        advance(1000);
        engine.onRate("good");
        expect(engine.streak).toBe(2);
        expect(events.some((e) => e.type === "timeout")).toBe(false);
        const summary = engine.endSession();
        const run = summary?.runs[summary.runs.length - 1];
        expect(run?.pauses).toBe(0);
        expect(run?.pure).toBe(true);
    });

    test("answer timeout breaks the streak by default", () => {
        const { engine, card } = setup();
        card(1000, 1000);
        card(1000, 9000);
        expect(engine.streak).toBe(0);
    });

    test("'again' can break the streak when configured", () => {
        const { engine, card } = setup({ againBreaksStreak: true });
        card(1000, 1000);
        card(1000, 1000, "again");
        expect(engine.streak).toBe(0);
    });

    test("first card is free when enabled", () => {
        const { engine, card } = setup({ freeFirstCard: true });
        card(60_000, 60_000);
        expect(engine.streak).toBe(1);
        card(13_000, 1000);
        expect(engine.streak).toBe(0);
    });

    test("boost adds time and consumes a charge", () => {
        const { engine, advance, policy, events } = setup();
        expect(engine.boostCharges).toBe(3);
        engine.onQuestionShown(policy);
        advance(11_000);
        expect(engine.useBoost()).toBe(true);
        expect(engine.boostCharges).toBe(2);
        advance(5_000); // 16 s total < 22 s
        expect(events.some((e) => e.type === "timeout")).toBe(false);
        expect(engine.remainingMs()).toBe(6_000);
        engine.onAnswerShown();
        // boost does not carry over to the answer phase
        expect(engine.remainingMs()).toBe(8_000);
    });

    test("boost is blocked when empty, paused, expired or untimed", () => {
        const { engine, advance, policy } = setup({ startingBoostCharges: 0 });
        engine.onQuestionShown(policy);
        expect(engine.boostUnavailableReason()).toBe("empty");
        engine.boostCharges = 1;
        engine.pause("manual");
        expect(engine.boostUnavailableReason()).toBe("paused");
        engine.resume();
        advance(13_000);
        expect(engine.boostUnavailableReason()).toBe("expired");
        engine.onQuestionShown({ questionMs: null, answerMs: null, source: "x" });
        expect(engine.boostUnavailableReason()).toBe("untimed");
    });

    test("boosts are earned every N cards up to the bank capacity", () => {
        const { engine, card, events } = setup({
            startingBoostCharges: 4,
            maxBoostCharges: 5,
            cardsPerBoostCharge: 2,
        });
        card(500, 500);
        expect(engine.boostProgress).toBe(1);
        card(500, 500);
        expect(engine.boostCharges).toBe(5);
        expect(events.filter((e) => e.type === "boost-earned")).toHaveLength(1);
        card(500, 500);
        card(500, 500);
        expect(engine.boostCharges).toBe(5);
    });

    test("pause freezes the timer", () => {
        const { engine, advance, policy, events } = setup();
        engine.onQuestionShown(policy);
        advance(5_000);
        engine.togglePause();
        advance(60_000);
        expect(events.some((e) => e.type === "timeout")).toBe(false);
        engine.togglePause();
        expect(engine.remainingMs()).toBe(7_000);
    });

    test("No Pause mode blocks manual pauses but allows auto pauses", () => {
        const { engine, policy, events } = setup({ noPauseMode: true });
        engine.onQuestionShown(policy);
        expect(engine.pause("manual")).toBe(false);
        expect(events.some((e) => e.type === "pause-blocked")).toBe(true);
        expect(engine.pause("auto")).toBe(true);
    });

    test("pure flag reflects pauses and boosts", () => {
        const { engine, card, advance, policy } = setup();
        card(500, 500);
        engine.onQuestionShown(policy);
        engine.pause("manual");
        engine.resume();
        engine.onAnswerShown();
        advance(500);
        engine.onRate("good");
        const summary = engine.endSession();
        expect(summary?.runs).toHaveLength(1);
        expect(summary?.runs[0].streak).toBe(2);
        expect(summary?.runs[0].pure).toBe(false);
        expect(summary?.runs[0].endReason).toBe("session-end");
    });

    test("warning ticks are emitted once per second", () => {
        const { engine, advance, policy, events } = setup({ countdownWarningSeconds: 3 });
        engine.onQuestionShown(policy);
        advance(11_950);
        const ticks = events.filter((e) => e.type === "warning-tick").map((e) => e.secondsLeft);
        expect(ticks).toEqual([3, 2, 1]);
    });

    test("points mode uses the streak multiplier", () => {
        const { engine, card } = setup({ gameplayMode: "points" });
        card(500, 500, "good"); // streak 1 → x1.08 → 3
        card(500, 500, "easy"); // streak 2 → x1.16 → 5
        expect(engine.score).toBe(8);
    });

    test("new best is announced once when passing the record", () => {
        const { engine, card, events } = setup();
        engine.bestToBeat = 2;
        card(500, 500);
        card(500, 500);
        card(500, 500);
        card(500, 500);
        expect(events.filter((e) => e.type === "new-best")).toHaveLength(1);
    });

    test("skip does not change the streak", () => {
        const { engine, card, policy } = setup();
        card(500, 500);
        engine.onQuestionShown(policy);
        engine.onSkip();
        card(500, 500);
        expect(engine.streak).toBe(2);
        expect(engine.summary.skipped).toBe(1);
    });
});

describe("Speed Streak timer rules", () => {
    const settings = normalizeSpeedStreakSettings({});

    test("absolute, extra and untimed rules", () => {
        const rules = parseTimerRules(
            "#anatomy = 30/15\n#long = +10/+5\n#vocab = untimed\npharma = -/untimed\n// comment\nbroken line",
        );
        expect(rules).toHaveLength(4);
        expect(resolveTimerPolicy(settings, rules, ["#anatomy"], "")).toMatchObject({
            questionMs: 30_000,
            answerMs: 15_000,
        });
        expect(resolveTimerPolicy(settings, rules, ["#long/sub"], "")).toMatchObject({
            questionMs: 22_000,
            answerMs: 13_000,
        });
        expect(resolveTimerPolicy(settings, rules, ["#vocab"], "")).toMatchObject({
            questionMs: null,
            answerMs: null,
        });
        expect(resolveTimerPolicy(settings, rules, [], "#pharma/cardio")).toMatchObject({
            questionMs: 12_000,
            answerMs: null,
        });
        expect(resolveTimerPolicy(settings, rules, ["#other"], "#deck")).toMatchObject({
            questionMs: 12_000,
            answerMs: 8_000,
            source: "",
        });
    });

    test("single value applies to question only", () => {
        const rules = parseTimerRules("#q = 20");
        expect(resolveTimerPolicy(settings, rules, ["#q"], "")).toMatchObject({
            questionMs: 20_000,
            answerMs: 8_000,
        });
    });
});

describe("Speed Streak settings & records", () => {
    test("normalization clamps values and fills defaults", () => {
        const s = normalizeSpeedStreakSettings({
            questionSeconds: -5,
            startingBoostCharges: 50,
            maxBoostCharges: 4,
            gameplayMode: "nonsense" as never,
        });
        expect(s.questionSeconds).toBe(1);
        expect(s.startingBoostCharges).toBe(4);
        expect(s.gameplayMode).toBe("time_boost");
        expect(s.answerSeconds).toBe(8);
    });

    test("best and top runs", () => {
        const base = {
            score: 0,
            startedAt: 0,
            endedAt: 0,
            day: "2026-10-03",
            cards: 0,
            pauses: 0,
            boostsUsed: 0,
            pure: true,
            endReason: "timeout" as const,
            deck: "",
        };
        const runs = [
            { ...base, streak: 5, activeMs: 100 },
            { ...base, streak: 9, activeMs: 300 },
            { ...base, streak: 9, activeMs: 200, day: "2026-10-02" },
            { ...base, streak: 0, activeMs: 0 },
        ];
        expect(bestRun(runs)?.activeMs).toBe(200);
        expect(bestRun(runs, (r) => r.day === "2026-10-03")?.activeMs).toBe(300);
        expect(topRuns(runs, 5).map((r) => r.streak)).toEqual([9, 9, 5]);
    });
});

describe("Speed Streak themes", () => {
    test("theme ids are unique and colors are valid", () => {
        const ids = SPEED_STREAK_THEMES.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.includes(DEFAULT_SPEED_STREAK_THEME_ID)).toBe(true);
        for (const theme of SPEED_STREAK_THEMES) {
            for (const value of Object.values(theme.colors)) {
                expect(
                    parseColor(value as string) !== null || String(value).startsWith("var("),
                ).toBe(true);
            }
        }
    });

    test("unknown theme falls back to the default", () => {
        expect(normalizeSpeedStreakSettings({ theme: "nope" }).theme).toBe(
            DEFAULT_SPEED_STREAK_THEME_ID,
        );
        expect(normalizeSpeedStreakSettings({ theme: "ocean" }).theme).toBe("ocean");
        expect(getSpeedStreakTheme("forest").name.en).toBe("Forest");
    });

    test("timer color goes good → hard → again", () => {
        const good: RGB = [0, 200, 0];
        const hard: RGB = [200, 200, 0];
        const again: RGB = [200, 0, 0];
        expect(timerColor(1, good, hard, again)).toBe("rgb(0, 200, 0)");
        expect(timerColor(0.5, good, hard, again)).toBe("rgb(200, 200, 0)");
        expect(timerColor(0, good, hard, again)).toBe("rgb(200, 0, 0)");
        expect(timerColor(0.75, good, hard, again)).toBe("rgb(100, 200, 0)");
        expect(parseColor("#abc")).toEqual([170, 187, 204]);
        expect(parseColor("rgb(1, 2, 3)")).toEqual([1, 2, 3]);
    });
});
