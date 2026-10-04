/**
 * Card authoring — "New today: 4/10".
 *
 * Pure logic, no DOM. A card counts for the day the plugin FIRST saw its
 * question (so cards typed by hand count too, not only those made with the
 * command). The history stores normalized keys with that day; days older than
 * the kept history collapse to "old" (still known, never counted again).
 * The first run after the update marks every existing card as old.
 */

export const OLD = "old";
export const HISTORY_DAYS = 90;

export interface CardHistory {
    version: number;
    /** Existing cards were marked as old on the first run */
    initialized: boolean;
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
    if (stored.seen && typeof stored.seen === "object") {
        for (const [k, v] of Object.entries(stored.seen)) {
            if (typeof v === "string" && (v === OLD || /^\d{4}-\d{2}-\d{2}$/.test(v)))
                h.seen[k] = v;
        }
    }
    return h;
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
    return added;
}

/** Cards first seen today. */
export function countToday(history: CardHistory, now: Date, startOfDay: string): number {
    const day = counterDay(now, startOfDay);
    let n = 0;
    for (const v of Object.values(history.seen)) if (v === day) n++;
    return n;
}

/** Days older than `days` become "old" (kept, so they are never counted again). */
export function trimHistory(
    history: CardHistory,
    now: Date,
    startOfDay: string,
    days: number = HISTORY_DAYS,
): void {
    const today = counterDay(now, startOfDay);
    const [y, m, d] = today.split("-").map((p) => parseInt(p, 10));
    const cutoffDate = new Date(y, m - 1, d - days);
    const cutoff = counterDay(cutoffDate, "00:00:00");
    for (const [k, v] of Object.entries(history.seen)) {
        if (v !== OLD && v < cutoff) history.seen[k] = OLD;
    }
}

/** "New today: 4/10" values. */
export function counterText(count: number, goal: number): string {
    return `${count}/${goal}`;
}
