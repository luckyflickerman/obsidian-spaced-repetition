/**
 * Endless mode — the queue: the chosen cards over and over, in rounds.
 *
 * - Every round shows each card once in a random order ("Good" / "Easy" finish
 *   it for the round).
 * - "Error" (again) brings the card back after 3 other cards, "Hard" after 7.
 * - Cards of one note (e.g. `word ::: translation` gives two cards) form a
 *   group. Two cards of a group are never shown closer than `minGroupGap` —
 *   5 % of the pool, at least 2 — also across rounds and after "Error" / "Hard".
 *   When that is impossible (tiny pool, end of a round) the queue takes the
 *   best possible card instead: it never blocks and never drops a card.
 * - When every card left in a round has to wait, the next round starts early
 *   and the waiting cards keep their place constraints in it.
 * Nothing is ever scheduled or written to the notes.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

export type EndlessRating = "again" | "hard" | "good" | "easy";

/** Other cards shown before a card rated "Error" / "Hard" comes back. */
export const AGAIN_GAP = 3;
export const HARD_GAP = 7;
/** Cards of one note are at least this share of the pool apart. */
export const GROUP_GAP_SHARE = 0.05;

/** Minimal distance (in shown cards) between two cards of one note. */
export function minGroupGap(poolSize: number): number {
    return Math.max(2, Math.ceil(GROUP_GAP_SHARE * poolSize));
}

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

interface Entry<T> {
    item: T;
    /** Not shown before this show index */
    notBefore: number;
}

export class EndlessQueue<T> {
    private pool: T[];
    private upcoming: Entry<T>[] = [];
    private finished = new Set<T>();
    private random: () => number;
    private groupOf: (item: T) => unknown;
    private _current: T | null = null;
    /** Show index of the current card (0 = first card of the session) */
    private shown = -1;
    /** Group → show index of its last shown card */
    private lastShown = new Map<unknown, number>();
    private _round = 0;
    private _rated = 0;

    constructor(
        items: T[],
        random: () => number = Math.random,
        groupOf: (item: T) => unknown = (item) => item,
    ) {
        this.pool = [...new Set(items)];
        this.random = random;
        this.groupOf = groupOf;
        this.startRound([]);
        this.advance();
    }

    get current(): T | null {
        return this._current;
    }

    /** Show index of the current card (for logs and tests). */
    get showIndex(): number {
        return this.shown;
    }

    get minGap(): number {
        return minGroupGap(this.pool.length);
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
        const card = this._current;
        if (card === null) return;
        this._rated++;
        if (rating === "again" || rating === "hard") {
            const gap = rating === "again" ? AGAIN_GAP : HARD_GAP;
            const entry = { item: card, notBefore: this.shown + gap + 1 };
            this.upcoming.splice(Math.min(gap, this.upcoming.length), 0, entry);
        } else {
            this.finished.add(card);
        }
        this.advance();
    }

    /** Skip: the card goes to the end of the round, not counted. */
    skip(): void {
        const card = this._current;
        if (card === null) return;
        this.upcoming.push({ item: card, notBefore: 0 });
        this.advance();
    }

    /** The card was deleted from the note: forget it. */
    remove(item: T): void {
        this.pool = this.pool.filter((x) => x !== item);
        this.upcoming = this.upcoming.filter((e) => e.item !== item);
        this.finished.delete(item);
        if (this._current === item) {
            this._current = null;
            this.advance();
        }
    }

    // MARK: Choosing the next card

    private advance(): void {
        if (this.pool.length === 0) {
            this._current = null;
            this.upcoming = [];
            return;
        }
        if (this.upcoming.length === 0) this.startRound([]);
        const next = this.shown + 1;
        let index = this.firstEligible(next);
        if (index < 0 && this.finished.size > 0) {
            // everything left has to wait: start the next round now, if it helps
            const round = this.newRound(this.upcoming);
            const eligible = round.findIndex((e) => this.eligible(e, next));
            if (eligible >= 0) {
                this.beginRound(round);
                index = eligible;
            }
        }
        if (index < 0) index = this.bestEffort(next);

        const [entry] = this.upcoming.splice(index, 1);
        this._current = entry.item;
        this.shown = next;
        this.lastShown.set(this.groupOf(entry.item), next);
    }

    private groupDistance(item: T, next: number): number {
        const last = this.lastShown.get(this.groupOf(item));
        return last === undefined ? Infinity : next - last;
    }

    private eligible(entry: Entry<T>, next: number): boolean {
        return entry.notBefore <= next && this.groupDistance(entry.item, next) >= this.minGap;
    }

    private firstEligible(next: number): number {
        return this.upcoming.findIndex((e) => this.eligible(e, next));
    }

    /**
     * No card meets the rules: the one that breaks them the least. Keeping
     * cards of one note apart comes first; then the card that waited longest.
     */
    private bestEffort(next: number): number {
        const gap = this.minGap;
        let best = 0;
        let bestKey: [number, number] = [Infinity, Infinity];
        for (let i = 0; i < this.upcoming.length; i++) {
            const e = this.upcoming[i];
            const wait = Math.max(0, e.notBefore - next);
            const distance = this.groupDistance(e.item, next);
            const tooClose = Math.max(0, gap - distance);
            const key: [number, number] = [tooClose, wait];
            if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
                best = i;
                bestKey = key;
            }
        }
        return best;
    }

    /** A new shuffled round of the whole pool; `carry` keeps its waiting rules. */
    private newRound(carry: Entry<T>[]): Entry<T>[] {
        const waiting = new Map(carry.map((e) => [e.item, e.notBefore]));
        return shuffle(this.pool, this.random).map((item) => ({
            item,
            notBefore: waiting.get(item) ?? 0,
        }));
    }

    private beginRound(entries: Entry<T>[]): void {
        this.finished.clear();
        this._round++;
        this.upcoming = entries;
    }

    private startRound(carry: Entry<T>[]): void {
        this.beginRound(this.newRound(carry));
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
