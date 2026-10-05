import { AGAIN_GAP, EndlessQueue, HARD_GAP, shuffle } from "src/endless/endless-queue";
import {
    deckKey,
    isDeckCovered,
    normalizeEndlessSettings,
    toggleDeck,
} from "src/endless/endless-settings";
import { normalizeSpeedStreakData } from "src/speed-streak/speed-streak-settings";

/** Repeatable "random" numbers. */
function seeded(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

describe("Endless queue", () => {
    test("every card once per round, then a new round, without end", () => {
        const q = new EndlessQueue(["a", "b", "c", "d"], seeded(1));
        for (let round = 1; round <= 5; round++) {
            const seen: string[] = [];
            for (let i = 0; i < 4; i++) {
                expect(q.stats.round).toBe(round);
                seen.push(q.current);
                q.rate("good");
            }
            expect([...seen].sort()).toEqual(["a", "b", "c", "d"]);
        }
        expect(q.stats.rated).toBe(20);
        expect(q.current).not.toBeNull();
    });

    test("never the same card twice in a row between rounds", () => {
        const q = new EndlessQueue(["a", "b", "c"], seeded(7));
        let last: string | null = null;
        for (let i = 0; i < 300; i++) {
            const card = q.current;
            expect(card).not.toBe(last);
            last = card;
            q.rate(i % 5 === 0 ? "easy" : "good");
        }
    });

    test('"Again" brings the card back after a few cards, "Hard" a bit later', () => {
        const items = Array.from({ length: 20 }, (_, i) => i);
        const q = new EndlessQueue(items, seeded(3));
        const again = q.current;
        q.rate("again");
        for (let i = 0; i < AGAIN_GAP; i++) {
            expect(q.current).not.toBe(again);
            q.rate("good");
        }
        expect(q.current).toBe(again);
        q.rate("good");

        const hard = q.current;
        q.rate("hard");
        for (let i = 0; i < HARD_GAP; i++) {
            expect(q.current).not.toBe(hard);
            q.rate("good");
        }
        expect(q.current).toBe(hard);
    });

    test('a round ends only when every card got "Good" / "Easy"', () => {
        const q = new EndlessQueue(["a", "b"], seeded(5));
        q.rate("again");
        q.rate("again");
        expect(q.stats.round).toBe(1);
        expect(q.stats.doneInRound).toBe(0);
        q.rate("good");
        q.rate("easy");
        expect(q.stats.round).toBe(2);
        expect(q.stats.doneInRound).toBe(0);
        expect(q.stats.rated).toBe(4);
    });

    test("a single card repeats, skip is not counted, removed cards are gone", () => {
        const one = new EndlessQueue(["x"]);
        one.rate("good");
        one.rate("again");
        expect(one.current).toBe("x");

        const q = new EndlessQueue(["a", "b", "c"], seeded(9));
        const first = q.current;
        q.skip();
        expect(q.stats.rated).toBe(0);
        expect(q.current).not.toBe(first);
        q.remove("a");
        q.remove("b");
        for (let i = 0; i < 5; i++) {
            expect(q.current).toBe("c");
            q.rate("good");
        }
        q.remove("c");
        expect(q.current).toBeNull();
        expect(new EndlessQueue([]).current).toBeNull();
    });

    test("duplicates in the pool are counted once; shuffle keeps every item", () => {
        expect(new EndlessQueue(["a", "a", "b"]).stats.poolSize).toBe(2);
        expect(shuffle([1, 2, 3, 4, 5], seeded(2)).sort()).toEqual([1, 2, 3, 4, 5]);
    });
});

describe("Endless settings", () => {
    test("old data.json without the section loads", () => {
        expect(normalizeEndlessSettings(undefined)).toEqual({ selectedDecks: [] });
        expect(
            normalizeEndlessSettings({ selectedDecks: ["a", "a", 3 as never, "b"] }).selectedDecks,
        ).toEqual(["a", "b"]);
    });

    test("ticking a deck covers its subdecks", () => {
        expect(deckKey(["flashcards", "ENG"])).toBe("flashcards/ENG");
        let sel = toggleDeck([], "flashcards/ENG/verbs");
        sel = toggleDeck(sel, "flashcards/ESP");
        sel = toggleDeck(sel, "flashcards/ENG");
        expect(sel).toEqual(["flashcards/ESP", "flashcards/ENG"]);
        expect(isDeckCovered(sel, "flashcards/ENG/verbs")).toBe(true);
        expect(isDeckCovered(sel, "flashcards/ENGLISH")).toBe(false);
        expect(toggleDeck(sel, "")).toEqual([""]);
        expect(isDeckCovered([""], "anything")).toBe(true);
        expect(toggleDeck(sel, "flashcards/ESP")).toEqual(["flashcards/ENG"]);
    });
});

describe("Speed Streak data with Endless records", () => {
    test("Endless runs are kept apart and old data loads", () => {
        expect(normalizeSpeedStreakData({ runs: [] }).endlessRuns).toEqual([]);
        const run = { streak: 12 } as never;
        const data = normalizeSpeedStreakData({ runs: [], endlessRuns: [run] });
        expect(data.endlessRuns).toEqual([run]);
        expect(data.runs).toEqual([]);
    });
});
