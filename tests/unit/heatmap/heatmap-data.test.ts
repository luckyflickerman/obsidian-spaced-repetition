import {
    addDays,
    buildMonthGrid,
    buildYearGrid,
    computeStats,
    createDefaultReviewLog,
    dayKey,
    DEFAULT_HEATMAP_SETTINGS,
    estimateMinutesLeft,
    goalProgress,
    heatmapLevel,
    HeatmapSettings,
    levelReference,
    MAX_DAILY_GOAL,
    MAX_MS_PER_CARD,
    normalizeDailyGoal,
    normalizeHeatmapSettings,
    normalizeReviewLog,
    parseDayKey,
    polishPluralForm,
    recordReview,
    ReviewLog,
    todayProgress,
    yearRange,
} from "src/heatmap/heatmap-data";

function logOf(days: Record<string, [number, number?, number?]>): ReviewLog {
    const log = createDefaultReviewLog();
    for (const [key, [cards, ms = 0, newCards = 0]] of Object.entries(days)) {
        log.days[key] = { cards, ms, newCards };
    }
    return log;
}

describe("normalizeHeatmapSettings", () => {
    test("defaults", () => {
        expect(normalizeHeatmapSettings(undefined)).toEqual(DEFAULT_HEATMAP_SETTINGS);
        expect(normalizeHeatmapSettings(null)).toEqual(DEFAULT_HEATMAP_SETTINGS);
        expect(DEFAULT_HEATMAP_SETTINGS.color).toBe("green");
    });

    test("keeps valid values and repairs invalid ones", () => {
        expect(normalizeHeatmapSettings({ color: "red", showStats: false }).color).toBe("red");
        expect(normalizeHeatmapSettings({ color: "blue" }).color).toBe("blue");
        const bad = normalizeHeatmapSettings({
            color: "pink" as HeatmapSettings["color"],
            showInDeckList: "yes" as unknown as boolean,
            weekStartsOnMonday: false,
        });
        expect(bad.color).toBe("green");
        expect(bad.showInDeckList).toBe(true);
        expect(bad.weekStartsOnMonday).toBe(false);
    });
});

describe("review log", () => {
    test("normalizeReviewLog repairs stored data", () => {
        expect(normalizeReviewLog(undefined)).toEqual(createDefaultReviewLog());
        expect(normalizeReviewLog({ days: "x" as unknown as ReviewLog["days"] })).toEqual(
            createDefaultReviewLog(),
        );
        const log = normalizeReviewLog({
            version: 1,
            days: {
                "2026-10-01": { cards: 10, newCards: 50, ms: 1000 },
                "2026-10-02": { cards: 0, newCards: 0, ms: 0 },
                "2026-10-03": { cards: 3, newCards: -1, ms: -5 },
                "not-a-day": { cards: 1, newCards: 0, ms: 0 },
                "2026-10-04": null as unknown as ReviewLog["days"][string],
            },
        });
        expect(log.days).toEqual({
            "2026-10-01": { cards: 10, newCards: 10, ms: 1000 },
            "2026-10-03": { cards: 3, newCards: 0, ms: 0 },
        });
    });

    test("day keys use local dates", () => {
        expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
        expect(dayKey(parseDayKey("2026-12-31"))).toBe("2026-12-31");
        expect(dayKey(addDays(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
        expect(dayKey(addDays(new Date(2026, 2, 1), -1))).toBe("2026-02-28");
    });

    test("recordReview counts cards, new cards and time", () => {
        const log = createDefaultReviewLog();
        const day = new Date(2026, 9, 4, 21, 30);
        recordReview(log, day, 5000, true);
        recordReview(log, day, 8000, false);
        recordReview(log, day, 10 * 60 * 1000, false); // walked away
        recordReview(log, day, -50, false);
        recordReview(log, day, Number.NaN, false);
        expect(log.days["2026-10-04"]).toEqual({
            cards: 5,
            newCards: 1,
            ms: 5000 + 8000 + MAX_MS_PER_CARD,
        });
    });
});

describe("computeStats", () => {
    const log = logOf({
        "2026-09-20": [4, 40_000],
        "2026-10-01": [10, 60_000, 2],
        "2026-10-02": [20, 120_000],
        "2026-10-04": [5, 30_000],
    });

    test("today, totals and averages", () => {
        const stats = computeStats(log, new Date(2026, 9, 4, 18));
        expect(stats.today).toEqual({ cards: 5, newCards: 0, ms: 30_000 });
        expect(stats.totalCards).toBe(39);
        expect(stats.totalMs).toBe(250_000);
        expect(stats.secondsPerCard).toBeCloseTo(250 / 39);
        expect(stats.cardsPerMinute).toBeCloseTo(39 / (250 / 60));
        expect(stats.pastWeekMs).toBe(210_000);
        expect(stats.dailyAverage).toBeCloseTo(39 / 4);
        expect(stats.firstDay).toBe("2026-09-20");
    });

    test("days learned and streaks", () => {
        const stats = computeStats(log, new Date(2026, 9, 4));
        expect(stats.daysLearned).toBe(4);
        expect(stats.daysLearnedRatio).toBeCloseTo(4 / 15);
        expect(stats.longestStreak).toBe(2);
        expect(stats.currentStreak).toBe(1);
    });

    test("the time of day does not change the days learned (first day = 100%)", () => {
        const first = logOf({ "2026-10-04": [13, 23_000] });
        for (const hour of [0, 13, 23]) {
            const stats = computeStats(first, new Date(2026, 9, 4, hour, 59));
            expect(stats.daysLearnedRatio).toBe(1);
        }
        expect(computeStats(log, new Date(2026, 9, 4, 23, 59)).daysLearnedRatio).toBeCloseTo(
            4 / 15,
        );
    });

    test("the current streak continues from yesterday until today is studied", () => {
        const stats = computeStats(log, new Date(2026, 9, 3));
        expect(stats.currentStreak).toBe(2);
        expect(stats.today.cards).toBe(0);
        expect(computeStats(log, new Date(2026, 9, 6)).currentStreak).toBe(0);
    });

    test("streaks across a month and a year boundary", () => {
        const long = logOf({
            "2025-12-30": [1],
            "2025-12-31": [1],
            "2026-01-01": [1],
            "2026-01-02": [1],
        });
        const stats = computeStats(long, new Date(2026, 0, 2));
        expect(stats.longestStreak).toBe(4);
        expect(stats.currentStreak).toBe(4);
        expect(stats.daysLearnedRatio).toBe(1);
    });

    test("empty log", () => {
        const stats = computeStats(createDefaultReviewLog(), new Date(2026, 9, 4));
        expect(stats.totalCards).toBe(0);
        expect(stats.secondsPerCard).toBe(0);
        expect(stats.cardsPerMinute).toBe(0);
        expect(stats.dailyAverage).toBe(0);
        expect(stats.daysLearnedRatio).toBe(0);
        expect(stats.longestStreak).toBe(0);
        expect(stats.currentStreak).toBe(0);
        expect(stats.firstDay).toBeNull();
    });

    test("estimateMinutesLeft", () => {
        const stats = computeStats(log, new Date(2026, 9, 4));
        expect(estimateMinutesLeft(stats, 100)).toBe(Math.round((100 * 250) / 39 / 60));
        expect(estimateMinutesLeft(stats, 0)).toBe(0);
        expect(estimateMinutesLeft(computeStats(createDefaultReviewLog(), new Date()), 50)).toBe(0);
    });
});

describe("levels", () => {
    test("heatmapLevel", () => {
        expect(heatmapLevel(0, 100)).toBe(0);
        expect(heatmapLevel(1, 100)).toBe(1);
        expect(heatmapLevel(20, 100)).toBe(1);
        expect(heatmapLevel(21, 100)).toBe(2);
        expect(heatmapLevel(60, 100)).toBe(3);
        expect(heatmapLevel(100, 100)).toBe(5);
        expect(heatmapLevel(500, 100)).toBe(5);
        expect(heatmapLevel(3, 0)).toBe(5);
    });

    test("levelReference ignores empty days and outliers", () => {
        expect(levelReference([])).toBe(0);
        expect(levelReference([0, 0])).toBe(0);
        expect(levelReference([5])).toBe(5);
        const counts = [...Array.from({ length: 19 }, (_, i) => i + 1), 1000];
        expect(levelReference(counts)).toBe(19);
    });
});

describe("buildYearGrid", () => {
    const log = logOf({ "2026-10-04": [50], "2026-10-03": [5], "2025-12-31": [7] });
    const today = new Date(2026, 9, 4);

    test("weeks starting on Monday", () => {
        const grid = buildYearGrid(log, 2026, today, true);
        expect(grid.year).toBe(2026);
        expect(grid.weeks).toHaveLength(53);
        for (const week of grid.weeks) expect(week).toHaveLength(7);
        // 1 Jan 2026 is a Thursday → 3 padding days (Mon–Wed of 2025)
        expect(grid.weeks[0].map((c) => c.outside)).toEqual([
            true,
            true,
            true,
            false,
            false,
            false,
            false,
        ]);
        expect(grid.weeks[0][0].key).toBe("2025-12-29");
        expect(grid.weeks[0][2].cards).toBe(0); // other years are not shown
        expect(grid.weeks[0][3].key).toBe("2026-01-01");
        expect(grid.monthStarts[0]).toBe(0);
        expect(grid.monthStarts[1]).toBe(4); // 1 Feb 2026 (Sunday)
        expect(grid.monthStarts).toHaveLength(12);
        const last = grid.weeks[52];
        expect(last[3].key).toBe("2026-12-31");
        expect(last[4].outside).toBe(true);
    });

    test("weeks starting on Sunday", () => {
        const grid = buildYearGrid(log, 2026, today, false);
        expect(grid.weeks[0][0].key).toBe("2025-12-28");
        expect(grid.weeks[0][4].key).toBe("2026-01-01");
        expect(grid.monthStarts[1]).toBe(5);
        expect(grid.weeks[5][0].key).toBe("2026-02-01");
    });

    test("cells know their count, level, today and future", () => {
        const grid = buildYearGrid(log, 2026, today);
        const cells = grid.weeks.flat();
        const byKey = (key: string) => cells.find((c) => c.key === key);
        expect(byKey("2026-10-04")).toMatchObject({ cards: 50, isToday: true, isFuture: false });
        expect(byKey("2026-10-04")?.level).toBe(5);
        expect(byKey("2026-10-03")?.level).toBeGreaterThanOrEqual(1);
        expect(byKey("2026-10-03")?.level).toBeLessThan(5);
        expect(byKey("2026-10-05")).toMatchObject({ cards: 0, level: 0, isFuture: true });
        expect(byKey("2026-01-15")).toMatchObject({ isFuture: false, level: 0 });
    });

    test("other years: whole year in the past or in the future", () => {
        const past = buildYearGrid(log, 2025, today);
        expect(past.weeks.flat().some((c) => c.isFuture)).toBe(false);
        expect(past.weeks.flat().find((c) => c.key === "2025-12-31")?.cards).toBe(7);
        const future = buildYearGrid(log, 2027, today);
        expect(future.weeks.flat().every((c) => c.outside || c.isFuture)).toBe(true);
    });
});

describe("polishPluralForm", () => {
    test.each([
        [1, 0],
        [2, 1],
        [4, 1],
        [22, 1],
        [104, 1],
        [0, 2],
        [5, 2],
        [11, 2],
        [12, 2],
        [13, 2],
        [14, 2],
        [21, 2],
        [25, 2],
        [112, 2],
    ])("%i → form %i", (n, form) => {
        expect(polishPluralForm(n)).toBe(form);
    });
});

describe("yearRange", () => {
    test("from the first review to this year", () => {
        expect(yearRange(createDefaultReviewLog(), new Date(2026, 9, 4))).toEqual({
            min: 2026,
            max: 2026,
        });
        expect(yearRange(logOf({ "2024-07-26": [3] }), new Date(2026, 9, 4))).toEqual({
            min: 2024,
            max: 2026,
        });
    });
});

describe("addDays", () => {
    test("is calendar based", () => {
        const start = new Date(2026, 9, 24);
        expect(dayKey(addDays(start, 7))).toBe("2026-10-31");
        expect(dayKey(addDays(start, 8))).toBe("2026-11-01");
    });
});

describe("minimized calendar", () => {
    test("setting is off by default and survives normalization", () => {
        expect(DEFAULT_HEATMAP_SETTINGS.minimized).toBe(false);
        expect(normalizeHeatmapSettings({ minimized: true }).minimized).toBe(true);
        expect(normalizeHeatmapSettings({ minimized: "yes" as unknown as boolean }).minimized).toBe(
            false,
        );
    });

    test("month grid: weeks of 7, padding, today and future", () => {
        const log = logOf({ "2026-10-04": [50], "2026-10-02": [5] });
        const today = new Date(2026, 9, 4);
        // October 2026 starts on a Thursday → 3 empty cells (Mon–Wed)
        const weeks = buildMonthGrid(log, 2026, 9, today, true);
        expect(weeks).toHaveLength(5);
        for (const w of weeks) expect(w).toHaveLength(7);
        expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
        expect(weeks[0][3]?.key).toBe("2026-10-01");
        const cells = weeks.flat().filter((c) => c !== null);
        expect(cells).toHaveLength(31);
        expect(cells.find((c) => c?.isToday)?.key).toBe("2026-10-04");
        expect(cells.find((c) => c?.key === "2026-10-04")?.level).toBe(5);
        expect(cells.find((c) => c?.key === "2026-10-02")?.level).toBe(1);
        expect(cells.find((c) => c?.key === "2026-10-05")?.isFuture).toBe(true);
        expect(weeks[4][5]?.key).toBe("2026-10-31"); // Saturday
        expect(weeks[4][6]).toBeNull(); // Sunday after the month
    });

    test("month grid with Sunday as the first day", () => {
        const weeks = buildMonthGrid(
            createDefaultReviewLog(),
            2026,
            1,
            new Date(2026, 1, 10),
            false,
        );
        // 1 Feb 2026 is a Sunday → no padding
        expect(weeks[0][0]?.key).toBe("2026-02-01");
        expect(weeks).toHaveLength(4);
    });

    test("today's progress ring", () => {
        expect(todayProgress(30, 10)).toEqual({ left: 10, planned: 40, fraction: 0.75 });
        expect(todayProgress(0, 20)).toEqual({ left: 20, planned: 20, fraction: 0 });
        expect(todayProgress(12, 0)).toEqual({ left: 0, planned: 12, fraction: 1 });
        expect(todayProgress(0, 0)).toEqual({ left: 0, planned: 0, fraction: 1 });
        expect(todayProgress(-3, -1).left).toBe(0);
    });
});

describe("daily goal", () => {
    test("on by default with 50 cards, survives normalization", () => {
        expect(DEFAULT_HEATMAP_SETTINGS.dailyGoalEnabled).toBe(true);
        expect(DEFAULT_HEATMAP_SETTINGS.dailyGoal).toBe(50);
        const s = normalizeHeatmapSettings({ dailyGoalEnabled: false, dailyGoal: 120 });
        expect(s.dailyGoalEnabled).toBe(false);
        expect(s.dailyGoal).toBe(120);
    });

    test("invalid stored goals fall back to the default", () => {
        for (const bad of [0, -5, Number.NaN, "x", null]) {
            expect(
                normalizeHeatmapSettings({ dailyGoal: bad as unknown as number }).dailyGoal,
            ).toBe(50);
        }
        expect(normalizeHeatmapSettings({ dailyGoal: 12.6 }).dailyGoal).toBe(13);
        expect(normalizeHeatmapSettings({ dailyGoal: 50_000 }).dailyGoal).toBe(MAX_DAILY_GOAL);
    });

    test("normalizeDailyGoal reads typed text", () => {
        expect(normalizeDailyGoal(" 75 ", 50)).toBe(75);
        expect(normalizeDailyGoal("", -1)).toBe(-1);
        expect(normalizeDailyGoal("abc", -1)).toBe(-1);
        expect(normalizeDailyGoal("0", -1)).toBe(-1);
    });

    test("goalProgress", () => {
        expect(goalProgress(32, 50)).toEqual({
            done: 32,
            goal: 50,
            left: 18,
            fraction: 0.64,
            reached: false,
        });
        expect(goalProgress(205, 100)).toEqual({
            done: 205,
            goal: 100,
            left: 0,
            fraction: 1,
            reached: true,
        });
        expect(goalProgress(-1, 0)).toEqual({
            done: 0,
            goal: 1,
            left: 1,
            fraction: 0,
            reached: false,
        });
    });
});
