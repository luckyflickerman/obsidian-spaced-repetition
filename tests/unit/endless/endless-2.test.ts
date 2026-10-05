import {
    AGAIN_GAP,
    EndlessQueue,
    EndlessRating,
    HARD_GAP,
    minGroupGap,
} from "src/endless/endless-queue";
import {
    addRun,
    addSession,
    applyRating,
    bestScore,
    bestTodayScore,
    createEndlessRecords,
    createScoreState,
    EndlessRunRecord,
    formatSessionTime,
    localDay,
    normalizeEndlessData,
    normalizeEndlessRecords,
    RECENT_SESSIONS,
    TOP_RUNS,
} from "src/endless/endless-records";
import {
    ENDLESS_MIN_CARDS,
    needsFewCardsWarning,
    normalizeEndlessSettings,
} from "src/endless/endless-settings";
import {
    normalizeSpeedStreakSettings,
    SPEED_STREAK_VISUAL_IDS,
} from "src/speed-streak/speed-streak-settings";
import {
    hourglassFill,
    hourglassTransition,
    moundLevel,
} from "src/speed-streak/visuals/hourglass-logic";

function seeded(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

/** Cards "q:dir": two cards (both directions) of each of `notes` notes. */
function pairs(notes: number): string[] {
    const cards: string[] = [];
    for (let i = 0; i < notes; i++) cards.push(`${i}:a`, `${i}:b`);
    return cards;
}
const noteOf = (card: string) => card.split(":")[0];

/** Plays `steps` ratings and returns the smallest distance between two cards of one note. */
function minDistance(
    q: EndlessQueue<string>,
    steps: number,
    pickRating: (i: number) => EndlessRating,
): number {
    const last = new Map<string, number>();
    let min = Infinity;
    for (let i = 0; i < steps; i++) {
        const card = q.current;
        const note = noteOf(card);
        const prev = last.get(note);
        if (prev !== undefined) min = Math.min(min, q.showIndex - prev);
        last.set(note, q.showIndex);
        q.rate(pickRating(i));
    }
    return min;
}

describe("Endless queue: cards of one note are kept apart", () => {
    test("gap = 5 % of the pool, at least 2", () => {
        expect(minGroupGap(100)).toBe(5);
        expect(minGroupGap(400)).toBe(20);
        expect(minGroupGap(30)).toBe(2);
        expect(minGroupGap(1)).toBe(2);
        expect(minGroupGap(101)).toBe(6);
    });

    test("100 cards in 50 pairs, 1000 rounds: never closer than 5", () => {
        const q = new EndlessQueue(pairs(50), seeded(11), noteOf);
        expect(q.minGap).toBe(5);
        expect(minDistance(q, 100 * 1000, () => "good")).toBeGreaterThanOrEqual(5);
        expect(q.stats.round).toBeGreaterThanOrEqual(1000);
    });

    test("also with errors and hard answers mixed in", () => {
        const q = new EndlessQueue(pairs(50), seeded(4), noteOf);
        const r = seeded(99);
        const pick = (): EndlessRating => {
            const x = r();
            return x < 0.15 ? "again" : x < 0.3 ? "hard" : x < 0.8 ? "good" : "easy";
        };
        expect(minDistance(q, 30000, pick)).toBeGreaterThanOrEqual(5);
    });

    test("small pool: best possible spread, no card skipped, no blocking", () => {
        // 3 notes × 2 cards: gap 2 is possible, so a note never shows twice in a row
        const q = new EndlessQueue(pairs(3), seeded(5), noteOf);
        expect(minDistance(q, 600, () => "good")).toBeGreaterThanOrEqual(2);

        // no card is skipped: any 18 shows in a row (three rounds) contain all 6 cards
        const q2 = new EndlessQueue(pairs(3), seeded(6), noteOf);
        const shown: string[] = [];
        for (let i = 0; i < 600; i++) {
            shown.push(q2.current);
            q2.rate("good");
        }
        for (let i = 0; i + 18 <= shown.length; i++) {
            expect(new Set(shown.slice(i, i + 18)).size).toBe(6);
        }

        // one note with two cards only: the rule can't hold, the queue still goes on
        const q3 = new EndlessQueue(pairs(1), seeded(7), noteOf);
        for (let i = 0; i < 50; i++) {
            expect(q3.current).not.toBeNull();
            q3.rate(i % 3 === 0 ? "again" : "good");
        }
    });

    test("round boundary: the first cards of a round respect the last ones", () => {
        const q = new EndlessQueue(pairs(20), seeded(8), noteOf); // 40 cards, gap 2
        const shown: string[] = [];
        for (let i = 0; i < 40 * 30; i++) {
            shown.push(q.current);
            q.rate("good");
        }
        for (let i = 1; i < shown.length; i++) {
            expect(noteOf(shown[i])).not.toBe(noteOf(shown[i - 1]));
        }
    });
});

describe("Endless queue: the last card of a round", () => {
    function lastCardOfRound(rating: EndlessRating, gap: number) {
        const items = Array.from({ length: 30 }, (_, i) => `c${i}`);
        const q = new EndlessQueue(items, seeded(12));
        for (let i = 0; i < 29; i++) q.rate("good");
        const last = q.current;
        expect(q.stats.doneInRound).toBe(29);
        q.rate(rating);
        // a new round started, and the card waits at least `gap` other cards
        expect(q.stats.round).toBe(2);
        for (let i = 0; i < gap; i++) {
            expect(q.current).not.toBe(last);
            q.rate("good");
        }
        // it does come back in this round
        const seen = new Set<string | null>();
        for (let i = 0; i < 30; i++) {
            seen.add(q.current);
            q.rate("good");
        }
        expect(seen.has(last)).toBe(true);
    }

    test('"Error" on the last card: not right away, after ≥ 3 cards', () => {
        lastCardOfRound("again", AGAIN_GAP);
    });

    test('"Hard" on the last card: after ≥ 7 cards', () => {
        lastCardOfRound("hard", HARD_GAP);
    });
});

describe("Endless score", () => {
    test('"Hard", "Good", "Easy" add 1; "Error" resets to 0 and ends the run', () => {
        let s = createScoreState();
        for (const r of ["good", "hard", "easy"] as EndlessRating[]) s = applyRating(s, r).state;
        expect(s.score).toBe(3);
        const res = applyRating(s, "again");
        expect(res.endedRun).toBe(3);
        expect(res.state).toEqual({ score: 0, bestScore: 3, errors: 1, ratings: 4 });
        // an error at 0 ends nothing
        expect(applyRating(res.state, "again").endedRun).toBeNull();
        expect(applyRating(res.state, "again").state.errors).toBe(2);
    });
});

describe("Endless records", () => {
    const day = (iso: string) => new Date(iso).getTime();
    const run = (score: number, iso: string, decks = "ENG"): EndlessRunRecord => ({
        score,
        endedAt: day(iso),
        day: localDay(day(iso)),
        decks,
    });

    test("all-time and today's best", () => {
        let r = createEndlessRecords();
        let res = addRun(r, run(10, "2026-10-04T10:00:00"));
        expect(res.newBest).toBe(true);
        r = res.records;
        res = addRun(r, run(7, "2026-10-05T10:00:00"));
        expect(res.newBest).toBe(false);
        r = res.records;
        expect(bestScore(r)).toBe(10);
        // yesterday's 10 is not today's best
        expect(bestTodayScore(r, day("2026-10-05T18:00:00"))).toBe(7);
        r = addRun(r, run(5, "2026-10-05T11:00:00")).records;
        expect(bestTodayScore(r, day("2026-10-05T18:00:00"))).toBe(7);
        r = addRun(r, run(12, "2026-10-05T12:00:00")).records;
        expect(bestScore(r)).toBe(12);
        expect(bestTodayScore(r, day("2026-10-05T18:00:00"))).toBe(12);
        expect(bestTodayScore(r, day("2026-10-06T08:00:00"))).toBe(0);
        // a zero run is not a record
        expect(addRun(r, run(0, "2026-10-05T13:00:00")).records).toBe(r);
    });

    test("top 5 runs, best first", () => {
        let r = createEndlessRecords();
        for (const s of [3, 9, 1, 7, 12, 5, 8]) r = addRun(r, run(s, "2026-10-05T10:00:00")).records;
        expect(r.top.map((x) => x.score)).toEqual([12, 9, 8, 7, 5]);
        expect(r.top.length).toBe(TOP_RUNS);
    });

    test("last 5 sessions, newest first, and totals", () => {
        let r = createEndlessRecords();
        for (let i = 1; i <= 7; i++) {
            r = addSession(r, {
                endedAt: i * 1000,
                day: "2026-10-05",
                decks: "ENG",
                ratings: 10 * i,
                bestScore: i,
                errors: 1,
                durationMs: 60000,
            });
        }
        expect(r.recent.length).toBe(RECENT_SESSIONS);
        expect(r.recent[0].ratings).toBe(70);
        expect(r.totals).toEqual({ ratings: 280, sessions: 7 });
        // an empty session is not stored
        expect(
            addSession(r, { ...r.recent[0], ratings: 0 }).totals.sessions,
        ).toBe(7);
    });

    test("old data.json without the records loads; broken entries are dropped", () => {
        expect(normalizeEndlessData(undefined)).toEqual({ records: createEndlessRecords() });
        expect(normalizeEndlessRecords({ best: { score: "x" }, top: [null, { score: 4 }] })).toEqual(
            {
                ...createEndlessRecords(),
                top: [{ score: 4, endedAt: 0, day: localDay(0), decks: "" }],
            },
        );
        const stored = addRun(createEndlessRecords(), run(9, "2026-10-05T10:00:00")).records;
        expect(normalizeEndlessRecords(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
    });

    test("session time", () => {
        expect(formatSessionTime(42000)).toBe("0:42");
        expect(formatSessionTime(3725000)).toBe("1:02:05");
    });
});

describe("Few cards warning", () => {
    test("99 cards warn, 100 don't; can be switched off", () => {
        const s = normalizeEndlessSettings(undefined);
        expect(ENDLESS_MIN_CARDS).toBe(100);
        expect(needsFewCardsWarning(99, s)).toBe(true);
        expect(needsFewCardsWarning(100, s)).toBe(false);
        expect(needsFewCardsWarning(0, s)).toBe(false);
        expect(needsFewCardsWarning(42, { ...s, hideFewCardsWarning: true })).toBe(false);
        expect(normalizeEndlessSettings({ hideFewCardsWarning: "x" as never }).hideFewCardsWarning).toBe(
            false,
        );
    });
});

describe("Hourglass", () => {
    test("grains = score mod 100, hundreds kept", () => {
        expect(hourglassFill(0)).toEqual({ grains: 0, hundreds: 0 });
        expect(hourglassFill(37)).toEqual({ grains: 37, hundreds: 0 });
        expect(hourglassFill(99)).toEqual({ grains: 99, hundreds: 0 });
        expect(hourglassFill(100)).toEqual({ grains: 0, hundreds: 1 });
        expect(hourglassFill(312)).toEqual({ grains: 12, hundreds: 3 });
        expect(hourglassFill(-4)).toEqual({ grains: 0, hundreds: 0 });
    });

    test("which animation a change starts", () => {
        expect(hourglassTransition(36, 37)).toBe("grain");
        expect(hourglassTransition(99, 100)).toBe("cutscene");
        expect(hourglassTransition(199, 200)).toBe("cutscene");
        expect(hourglassTransition(54, 0)).toBe("error");
        expect(hourglassTransition(0, 0)).toBe("none");
        // a scene rebuilt in the middle of a session does not replay animations
        expect(hourglassTransition(0, 137)).toBe("none");
    });

    test("mound level grows from 0 to 1", () => {
        expect(moundLevel(0)).toBe(0);
        expect(moundLevel(100)).toBe(1);
        expect(moundLevel(25)).toBeCloseTo(0.5);
    });

    test("style setting: hourglass in Endless by default, old data loads", () => {
        expect(SPEED_STREAK_VISUAL_IDS).toContain("hourglass");
        expect(normalizeSpeedStreakSettings({}).endlessVisualStyle).toBe("hourglass");
        expect(normalizeSpeedStreakSettings({ endlessVisualStyle: "same" }).endlessVisualStyle).toBe(
            "same",
        );
        expect(
            normalizeSpeedStreakSettings({ endlessVisualStyle: "nope" as never }).endlessVisualStyle,
        ).toBe("hourglass");
    });
});
