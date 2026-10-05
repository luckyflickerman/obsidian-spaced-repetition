/**
 * Endless mode — the queue: the chosen cards over and over, in rounds.
 *
 * - Every round shows each card once in a random order ("Good" / "Easy" finish
 *   it for the round).
 * - "Again" brings the card back after a few cards, "Hard" a bit later.
 * - When a round ends, a new shuffled one starts (never the same card twice in
 *   a row when there is more than one).
 * Nothing is ever scheduled or written to the notes.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

export type EndlessRating = "again" | "hard" | "good" | "easy";

/** Cards shown before a card rated "Again" / "Hard" comes back. */
export const AGAIN_GAP = 3;
export const HARD_GAP = 7;

export interface EndlessStats {
    /** Cards in the pool */
    poolSize: number;
    /** Round number, from 1 */
    round: number;
    /** Cards finished in this round ("Good" / "Easy") */
    doneInRound: number;
    /** Cards rated in this session (every rating counts) */
    rated: number;
}

export class EndlessQueue<T> {
    private pool: T[];
    private upcoming: T[] = [];
    private finished = new Set<T>();
    private random: () => number;
    private _round = 0;
    private _rated = 0;
    private lastShown: T | null = null;

    constructor(items: T[], random: () => number = Math.random) {
        this.pool = [...new Set(items)];
        this.random = random;
        this.startRound();
    }

    get current(): T | null {
        return this.upcoming[0] ?? null;
    }

    get stats(): EndlessStats {
        return {
            poolSize: this.pool.length,
            round: this._round,
            doneInRound: this.finished.size,
            rated: this._rated,
        };
    }

    /** Rates the current card and moves on. */
    rate(rating: EndlessRating): void {
        const card = this.upcoming.shift();
        if (card === undefined) return;
        this._rated++;
        this.lastShown = card;
        if (rating === "again" || rating === "hard") {
            const gap = rating === "again" ? AGAIN_GAP : HARD_GAP;
            this.upcoming.splice(Math.min(gap, this.upcoming.length), 0, card);
        } else {
            this.finished.add(card);
        }
        if (this.upcoming.length === 0) this.startRound();
    }

    /** Skip: the card goes to the end of the round, not counted. */
    skip(): void {
        const card = this.upcoming.shift();
        if (card === undefined) return;
        this.lastShown = card;
        this.upcoming.push(card);
    }

    /** The card was deleted from the note: forget it. */
    remove(item: T): void {
        this.pool = this.pool.filter((x) => x !== item);
        this.upcoming = this.upcoming.filter((x) => x !== item);
        this.finished.delete(item);
        if (this.upcoming.length === 0 && this.pool.length > 0) this.startRound();
    }

    private startRound(): void {
        this.finished.clear();
        if (this.pool.length === 0) {
            this.upcoming = [];
            return;
        }
        this._round++;
        const order = shuffle(this.pool, this.random);
        // never the same card twice in a row across rounds
        if (order.length > 1 && order[0] === this.lastShown) {
            [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
        }
        this.upcoming = order;
    }
}

/** Fisher–Yates on a copy. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
