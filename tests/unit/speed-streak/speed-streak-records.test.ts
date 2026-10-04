import {
    bestRunOf,
    filterRuns,
    formatClock,
    formatDuration,
    formatRunDate,
    listedRuns,
    rankRuns,
    recentRuns,
    recordProgress,
    RecordsOptions,
    runBadge,
} from "src/speed-streak/speed-streak-records";
import { localDayKey, SpeedStreakRunRecord } from "src/speed-streak/speed-streak-settings";
import { pauseOverview } from "src/speed-streak/speed-streak-stats";

// Tests run with TZ=UTC (jest.config.js); dates below are local = UTC
const NOW = new Date(2026, 9, 4, 18, 0).getTime(); // 4 Oct 2026 18:00

function run(
    streak: number,
    endedAt: Date,
    extra: Partial<SpeedStreakRunRecord> = {},
): SpeedStreakRunRecord {
    const t = endedAt.getTime();
    return {
        streak,
        score: 0,
        startedAt: t - 60_000,
        endedAt: t,
        day: localDayKey(t),
        activeMs: streak * 5000,
        cards: streak,
        pauses: 0,
        boostsUsed: 0,
        pure: true,
        endReason: "timeout",
        deck: "deck",
        ...extra,
    };
}

const RUNS: SpeedStreakRunRecord[] = [
    run(168, new Date(2026, 7, 28, 9, 26), { pauses: 2, pure: false }),
    run(119, new Date(2026, 9, 3, 9, 26), { boostsUsed: 1, pure: false }),
    run(91, new Date(2026, 7, 27, 9, 26)),
    run(74, new Date(2026, 9, 4, 8, 26)),
    run(52, new Date(2026, 7, 29, 9, 26), { pauses: 1, pure: false }),
    run(12, new Date(2026, 9, 4, 17, 0)),
    run(0, new Date(2026, 9, 4, 17, 5)),
];

const ALL: RecordsOptions = {
    recordScope: "all_time",
    recordsList: "ranking",
    recordsFilter: "all",
};

describe("badges", () => {
    test("Pure = no pauses and no Boosts, otherwise Breaks", () => {
        expect(runBadge({ pauses: 0, boostsUsed: 0 })).toBe("pure");
        expect(runBadge({ pauses: 1, boostsUsed: 0 })).toBe("breaks");
        expect(runBadge({ pauses: 0, boostsUsed: 2 })).toBe("breaks");
        expect(runBadge({} as SpeedStreakRunRecord)).toBe("pure");
    });
});

describe("filtering and lists", () => {
    test("filterRuns: scope, Pure filter, empty runs dropped", () => {
        expect(filterRuns(RUNS, ALL, NOW)).toHaveLength(6);
        expect(
            filterRuns(RUNS, { recordScope: "today", recordsFilter: "all" }, NOW).map(
                (r) => r.streak,
            ),
        ).toEqual([74, 12]);
        expect(
            filterRuns(RUNS, { recordScope: "all_time", recordsFilter: "pure" }, NOW).map(
                (r) => r.streak,
            ),
        ).toEqual([91, 74, 12]);
    });

    test("ranking: longest first, faster first on ties", () => {
        expect(rankRuns(RUNS, 5).map((r) => r.streak)).toEqual([168, 119, 91, 74, 52]);
        const slow = run(50, new Date(2026, 9, 1), { activeMs: 900_000 });
        const fast = run(50, new Date(2026, 9, 2), { activeMs: 100_000 });
        expect(rankRuns([slow, fast], 2)).toEqual([fast, slow]);
    });

    test("recent: newest first", () => {
        expect(recentRuns(RUNS, 3).map((r) => r.streak)).toEqual([0, 12, 74]);
    });

    test("listedRuns follows the settings", () => {
        expect(listedRuns(RUNS, ALL, NOW).map((r) => r.streak)).toEqual([168, 119, 91, 74, 52]);
        expect(
            listedRuns(RUNS, { ...ALL, recordsList: "recent" }, NOW, 3).map((r) => r.streak),
        ).toEqual([12, 74, 119]);
        expect(
            listedRuns(RUNS, { ...ALL, recordsFilter: "pure" }, NOW).map((r) => r.streak),
        ).toEqual([91, 74, 12]);
        expect(listedRuns([], ALL, NOW)).toEqual([]);
    });

    test("best run in scope", () => {
        expect(bestRunOf(RUNS, ALL, NOW)?.streak).toBe(168);
        expect(bestRunOf(RUNS, { recordScope: "today", recordsFilter: "all" }, NOW)?.streak).toBe(
            74,
        );
        expect(bestRunOf([], ALL, NOW)).toBeNull();
    });

    test("record progress", () => {
        expect(recordProgress(84, 168)).toBe(0.5);
        expect(recordProgress(200, 168)).toBe(1);
        expect(recordProgress(0, 0)).toBe(0);
        expect(recordProgress(3, 0)).toBe(1);
    });
});

describe("formatting", () => {
    test("clock", () => {
        const t = new Date(2026, 9, 4, 8, 6).getTime();
        expect(formatClock(t, true)).toBe("8:06");
        expect(formatClock(t, false)).toBe("8:06 AM");
        expect(formatClock(new Date(2026, 9, 4, 0, 5).getTime(), false)).toBe("12:05 AM");
        expect(formatClock(new Date(2026, 9, 4, 21, 30).getTime(), false)).toBe("9:30 PM");
    });

    test("run dates: today, yesterday, older, other year", () => {
        const d = (y: number, m: number, day: number, h = 9, min = 26) =>
            new Date(y, m, day, h, min).getTime();
        expect(formatRunDate(d(2026, 9, 4, 8), NOW, true)).toBe("Dziś 8:26");
        expect(formatRunDate(d(2026, 9, 3), NOW, true)).toBe("Wczoraj 9:26");
        expect(formatRunDate(d(2026, 7, 28), NOW, true)).toBe("28 sie");
        expect(formatRunDate(d(2025, 11, 31), NOW, true)).toBe("31 gru 2025");
        expect(formatRunDate(d(2026, 9, 4, 8), NOW, false)).toBe("Today 8:26 AM");
        expect(formatRunDate(d(2026, 9, 3), NOW, false)).toBe("Yesterday 9:26 AM");
        expect(formatRunDate(d(2026, 7, 28), NOW, false)).toBe("Aug 28");
    });

    test("yesterday across a month boundary", () => {
        const now = new Date(2026, 10, 1, 10).getTime();
        expect(formatRunDate(new Date(2026, 9, 31, 22, 0).getTime(), now, true)).toBe(
            "Wczoraj 22:00",
        );
    });

    test("durations", () => {
        expect(formatDuration(42_000)).toBe("0:42");
        expect(formatDuration(725_000)).toBe("12:05");
        expect(formatDuration(3_725_000)).toBe("1:02:05");
        expect(formatDuration(-5)).toBe("0:00");
        expect(formatDuration(Number.NaN)).toBe("0:00");
    });
});

describe("pause overview", () => {
    test("tempo and rating totals", () => {
        const o = pauseOverview(
            { cards: 30, activeMs: 5 * 60_000, ratings: { again: 3, hard: 6, good: 15, easy: 6 } },
            12,
        );
        expect(o.cardsPerMinute).toBe(6);
        expect(o.secondsPerCard).toBe(10);
        expect(o.ratings).toEqual({ again: 3, hard: 6, good: 15, easy: 6 });
        expect(o.ratingShares.good).toBe(0.5);
        expect(o.ratingShares.again).toBeCloseTo(0.1);
        expect(o.streak).toBe(12);
    });

    test("nothing rated yet", () => {
        const o = pauseOverview(
            { cards: 0, activeMs: 0, ratings: { again: 0, hard: 0, good: 0, easy: 0 } },
            -1,
        );
        expect(o.cardsPerMinute).toBe(0);
        expect(o.secondsPerCard).toBe(0);
        expect(o.ratingShares).toEqual({ again: 0, hard: 0, good: 0, easy: 0 });
        expect(o.streak).toBe(0);
    });
});
