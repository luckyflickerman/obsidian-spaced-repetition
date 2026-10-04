/**
 * Card authoring — "New today: 4/10".
 *
 * Pure logic, no DOM. A card counts for the day the plugin FIRST saw its
 * question (so cards typed by hand count too, not only those made with the
 * command). The history stores normalized keys with that day, so the review
 * calendar can also show how many cards were created on any day.
 * The first run after the update marks every existing card as old.
 */

export const OLD = "old";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface CardHistory {
    version: number;
    /** Existing cards were marked as old on the first run */
    initialized: boolean;
    /** First day that is counted (`YYYY-MM-DD`); earlier days have no data */
    since?: string;
    /** card key → day it was first seen (`YYYY-MM-DD`) or "old" */
    seen: Record<string, string>;
}

export function createCardHistory(): CardHistory {
    return { version: 1, initialized: false, seen: {} };
}

export function normalizeCardHistory(stored: Partial<CardHistory> | null | undefined): CardHistory {
    const h = createCardHistory();
    if (!stored || typeof stored !== "object") return h;
    h.initialized = stored.initialized === true;
    if (typeof stored.since === "string" && DAY.test(stored.since)) h.since = stored.since;
    if (stored.seen && typeof stored.seen === "object") {
        for (const [k, v] of Object.entries(stored.seen)) {
            if (typeof v === "string" && (v === OLD || DAY.test(v))) h.seen[k] = v;
        }
    }
    return h;
}

/** Earliest day with a counted card, or null. */
function firstSeenDay(history: CardHistory): string | null {
    let first: string | null = null;
    for (const v of Object.values(history.seen)) if (v !== OLD && (!first || v < first)) first = v;
    return first;
}

/** `HH:MM:SS` → seconds after midnight (invalid → 0). */
function startSeconds(startOfDay: string): number {
    const parts = String(startOfDay ?? "")
        .split(":")
        .map((p) => parseInt(p, 10));
    if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return 0;
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/**
 * The plugin's day for a moment: before `startOfDay` (e.g. 04:00) it is still
 * the previous day, like the scheduling uses.
 */
export function counterDay(now: Date, startOfDay: string): string {
    const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const d =
        secs < startSeconds(startOfDay)
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            : now;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Records the cards currently in the vault. Returns how many were seen for the
 * first time. On the first run everything is marked "old".
 */
export function observeCards(
    history: CardHistory,
    keys: Iterable<string>,
    now: Date,
    startOfDay: string,
): number {
    const firstRun = !history.initialized;
    const day = counterDay(now, startOfDay);
    let added = 0;
    for (const key of keys) {
        if (!key || key in history.seen) continue;
        history.seen[key] = firstRun ? OLD : day;
        if (!firstRun) added++;
    }
    history.initialized = true;
    // histories from before `since` existed: start at the first counted card
    if (!history.since) history.since = firstRun ? day : (firstSeenDay(history) ?? day);
    return added;
}

/** Cards first seen today. */
export function countToday(history: CardHistory, now: Date, startOfDay: string): number {
    const day = counterDay(now, startOfDay);
    let n = 0;
    for (const v of Object.values(history.seen)) if (v === day) n++;
    return n;
}

/**
 * Cards created per day: `lookup(day)` is the count for `YYYY-MM-DD`, or null
 * for days before the counting started (no data — not the same as 0).
 */
export function createdPerDay(history: CardHistory): (day: string) => number | null {
    const days: Record<string, number> = {};
    for (const v of Object.values(history.seen)) if (v !== OLD) days[v] = (days[v] ?? 0) + 1;
    const since = history.initialized ? history.since : undefined;
    return (day) => (!since || day < since ? null : (days[day] ?? 0));
}

/** "New today: 4/10" values. */
export function counterText(count: number, goal: number): string {
    return `${count}/${goal}`;
}

export interface GoalProgress {
    done: number;
    goal: number;
    /** Cards still needed to reach the goal */
    left: number;
    /** Share of the goal done (0–1, capped) */
    fraction: number;
    reached: boolean;
}

/** Daily goal: cards created that day vs. the goal. */
export function goalProgress(done: number, goal: number): GoalProgress {
    const d = Math.max(0, Math.round(done));
    const g = Math.max(1, Math.round(goal));
    return {
        done: d,
        goal: g,
        left: Math.max(0, g - d),
        fraction: Math.min(1, d / g),
        reached: d >= g,
    };
}
