/**
 * Review heatmap — settings, review log and statistics.
 *
 * Pure logic, no DOM. Easy to unit test.
 *
 * The plugin stores only the next due date of a card (in the note), not its
 * history, so the review log is kept here: one entry per local day with the
 * number of reviewed cards, new cards and the time spent.
 */

// MARK: Settings

export type HeatmapColor = "green" | "blue" | "red";

export const HEATMAP_COLORS: HeatmapColor[] = ["green", "blue", "red"];

export interface HeatmapSettings {
    /** Show the calendar below the deck list */
    showInDeckList: boolean;
    /** Color scheme of the cells */
    color: HeatmapColor;
    /** Show the statistics above and below the calendar */
    showStats: boolean;
    /** Weeks start on Monday (otherwise Sunday) */
    weekStartsOnMonday: boolean;
    /** Folded to a small block: today's ring + this month */
    minimized: boolean;
}

export const DEFAULT_HEATMAP_SETTINGS: HeatmapSettings = {
    showInDeckList: true,
    color: "green",
    showStats: true,
    weekStartsOnMonday: true,
    minimized: false,
};

export function normalizeHeatmapSettings(
    stored: Partial<HeatmapSettings> | null | undefined,
): HeatmapSettings {
    const merged: HeatmapSettings = Object.assign(
        {},
        DEFAULT_HEATMAP_SETTINGS,
        stored && typeof stored === "object" ? stored : {},
    );
    const d = DEFAULT_HEATMAP_SETTINGS;
    const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
    merged.showInDeckList = bool(merged.showInDeckList, d.showInDeckList);
    merged.showStats = bool(merged.showStats, d.showStats);
    merged.weekStartsOnMonday = bool(merged.weekStartsOnMonday, d.weekStartsOnMonday);
    merged.minimized = bool(merged.minimized, d.minimized);
    if (!HEATMAP_COLORS.includes(merged.color)) merged.color = d.color;
    return merged;
}

// MARK: Review log

export interface ReviewDay {
    /** Cards rated that day */
    cards: number;
    /** Of which new cards (rated for the first time) */
    newCards: number;
    /** Time spent on those cards, ms */
    ms: number;
}

export interface ReviewLog {
    version: number;
    /** Local date `YYYY-MM-DD` → stats of that day */
    days: Record<string, ReviewDay>;
}

/** Longest time counted for one card (the user may have walked away). */
export const MAX_MS_PER_CARD = 2 * 60 * 1000;

export function createDefaultReviewLog(): ReviewLog {
    return { version: 1, days: {} };
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeReviewLog(stored: Partial<ReviewLog> | null | undefined): ReviewLog {
    const log = createDefaultReviewLog();
    if (!stored || typeof stored !== "object" || !stored.days || typeof stored.days !== "object")
        return log;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
    for (const [key, day] of Object.entries(stored.days)) {
        if (!DAY_KEY.test(key) || !day || typeof day !== "object") continue;
        const cards = Math.round(num(day.cards));
        if (cards === 0) continue;
        log.days[key] = {
            cards,
            newCards: Math.min(cards, Math.round(num(day.newCards))),
            ms: Math.round(num(day.ms)),
        };
    }
    return log;
}

/** Local date key `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${mm}-${dd}`;
}

/** `YYYY-MM-DD` → local midnight. */
export function parseDayKey(key: string): Date {
    const [y, m, d] = key.split("-").map((p) => parseInt(p, 10));
    return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Adds one rated card to the log. */
export function recordReview(log: ReviewLog, when: Date, ms: number, isNew: boolean): void {
    const key = dayKey(when);
    const day = log.days[key] ?? { cards: 0, newCards: 0, ms: 0 };
    day.cards += 1;
    if (isNew) day.newCards += 1;
    const spent = Number.isFinite(ms) ? ms : 0;
    day.ms += Math.round(Math.min(MAX_MS_PER_CARD, Math.max(0, spent)));
    log.days[key] = day;
}

// MARK: Statistics

export interface HeatmapStats {
    today: ReviewDay;
    /** Average over all days with reviews, seconds per card */
    secondsPerCard: number;
    /** Average cards per minute (all time) */
    cardsPerMinute: number;
    totalCards: number;
    totalMs: number;
    /** Time spent in the last 7 days (including today) */
    pastWeekMs: number;
    /** Cards per day, averaged over the days with reviews */
    dailyAverage: number;
    /** Days with reviews / days since the first review (0–1) */
    daysLearnedRatio: number;
    daysLearned: number;
    longestStreak: number;
    /** Ends today, or yesterday if nothing was reviewed today yet */
    currentStreak: number;
    firstDay: string | null;
}

const EMPTY_DAY: ReviewDay = { cards: 0, newCards: 0, ms: 0 };

function daysBetween(a: Date, b: Date): number {
    // Round: daylight saving days are 23 or 25 hours long
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function computeStats(log: ReviewLog, now: Date): HeatmapStats {
    // Whole days only: the time of day must not count as part of a day
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = dayKey(today);
    const keys = Object.keys(log.days)
        .filter((k) => log.days[k].cards > 0)
        .sort();

    let totalCards = 0;
    let totalMs = 0;
    let pastWeekMs = 0;
    const weekStart = dayKey(addDays(today, -6));
    for (const key of keys) {
        const day = log.days[key];
        totalCards += day.cards;
        totalMs += day.ms;
        if (key >= weekStart && key <= todayKey) pastWeekMs += day.ms;
    }

    // Streaks
    let longestStreak = 0;
    let run = 0;
    let previous: Date | null = null;
    for (const key of keys) {
        const date = parseDayKey(key);
        run = previous !== null && daysBetween(previous, date) === 1 ? run + 1 : 1;
        longestStreak = Math.max(longestStreak, run);
        previous = date;
    }
    let currentStreak = 0;
    let cursor = log.days[todayKey]?.cards ? today : addDays(today, -1);
    while (log.days[dayKey(cursor)]?.cards) {
        currentStreak++;
        cursor = addDays(cursor, -1);
    }

    const firstDay = keys[0] ?? null;
    const daysLearned = keys.filter((k) => k <= todayKey).length;
    const span = firstDay ? daysBetween(parseDayKey(firstDay), today) + 1 : 0;

    return {
        today: { ...(log.days[todayKey] ?? EMPTY_DAY) },
        secondsPerCard: totalCards > 0 ? totalMs / totalCards / 1000 : 0,
        cardsPerMinute: totalMs > 0 ? totalCards / (totalMs / 60_000) : 0,
        totalCards,
        totalMs,
        pastWeekMs,
        dailyAverage: keys.length > 0 ? totalCards / keys.length : 0,
        daysLearnedRatio: span > 0 ? Math.min(1, daysLearned / span) : 0,
        daysLearned,
        longestStreak,
        currentStreak,
        firstDay,
    };
}

/** Estimated minutes to review `cardsLeft` cards at the user's average pace. */
export function estimateMinutesLeft(stats: HeatmapStats, cardsLeft: number): number {
    if (cardsLeft <= 0 || stats.secondsPerCard <= 0) return 0;
    return Math.round((cardsLeft * stats.secondsPerCard) / 60);
}

/**
 * Polish plural form of a count: 0 = one ("1 karta"), 1 = few ("2–4, 22–24 karty"),
 * 2 = many ("0, 5–21, 25 kart", also "12–14 kart").
 */
export function polishPluralForm(n: number): 0 | 1 | 2 {
    const abs = Math.abs(Math.round(n));
    if (abs === 1) return 0;
    const lastDigit = abs % 10;
    const lastTwo = abs % 100;
    if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 1;
    return 2;
}

// MARK: Calendar grid

export const HEATMAP_LEVELS = 5;

/**
 * Color level of a day: 0 = nothing reviewed, 1–5 = more and more cards.
 * `reference` is a "very good day" (see `levelReference`); days above it get
 * the strongest color.
 */
export function heatmapLevel(cards: number, reference: number): number {
    if (cards <= 0) return 0;
    if (reference <= 0) return HEATMAP_LEVELS;
    return Math.max(1, Math.min(HEATMAP_LEVELS, Math.ceil((cards / reference) * HEATMAP_LEVELS)));
}

/**
 * Reference for the levels: the 90th percentile of the active days, so one
 * extreme day doesn't make all the others look pale.
 */
export function levelReference(counts: number[]): number {
    const active = counts.filter((c) => c > 0).sort((a, b) => a - b);
    if (active.length === 0) return 0;
    const index = Math.min(active.length - 1, Math.floor(active.length * 0.9));
    return active[index];
}

export interface HeatmapCell {
    key: string;
    date: Date;
    cards: number;
    level: number;
    /** Day of a different year (padding at the start / end of the grid) */
    outside: boolean;
    isFuture: boolean;
    isToday: boolean;
}

export interface HeatmapGrid {
    year: number;
    /** Columns = weeks, each with 7 cells (first day of the week at index 0) */
    weeks: HeatmapCell[][];
    /** Index of the week column where each month starts (0 = January) */
    monthStarts: number[];
}

/** Builds the calendar of one year, week by week (like GitHub / Anki). */
export function buildYearGrid(
    log: ReviewLog,
    year: number,
    today: Date,
    weekStartsOnMonday: boolean = true,
): HeatmapGrid {
    const first = new Date(year, 0, 1);
    const last = new Date(year, 11, 31);
    const offset = (first.getDay() - (weekStartsOnMonday ? 1 : 0) + 7) % 7;
    const start = addDays(first, -offset);
    const todayKey = dayKey(today);

    const yearCounts: number[] = [];
    for (const [key, day] of Object.entries(log.days)) {
        if (key.startsWith(`${year}-`)) yearCounts.push(day.cards);
    }
    const reference = levelReference(yearCounts);

    const weeks: HeatmapCell[][] = [];
    const monthStarts: number[] = [];
    let cursor = start;
    while (cursor <= last) {
        const week: HeatmapCell[] = [];
        for (let i = 0; i < 7; i++) {
            const key = dayKey(cursor);
            const outside = cursor.getFullYear() !== year;
            const cards = outside ? 0 : (log.days[key]?.cards ?? 0);
            if (!outside && cursor.getDate() === 1) monthStarts[cursor.getMonth()] = weeks.length;
            week.push({
                key,
                date: cursor,
                cards,
                level: heatmapLevel(cards, reference),
                outside,
                isFuture: key > todayKey,
                isToday: key === todayKey,
            });
            cursor = addDays(cursor, 1);
        }
        weeks.push(week);
    }
    return { year, weeks, monthStarts };
}

/** How many weeks a phone shows of the current year (about half a year, no scrolling). */
export const PHONE_WEEKS = 26;

/**
 * Part of the year grid to draw: on a phone, for the current year, the last `maxWeeks` weeks up to
 * the week with today; otherwise the whole year. Returns [start, end) week indexes.
 */
export function visibleWeekRange(
    grid: HeatmapGrid,
    maxWeeks: number | null,
): { start: number; end: number } {
    const all = { start: 0, end: grid.weeks.length };
    if (maxWeeks === null || maxWeeks <= 0 || grid.weeks.length <= maxWeeks) return all;
    const todayWeek = grid.weeks.findIndex((w) => w.some((c) => c.isToday));
    if (todayWeek < 0) return all;
    const end = todayWeek + 1;
    return { start: Math.max(0, end - maxWeeks), end };
}

/**
 * Month (0–11) to label above week column `index`: the month starting in that week, or — for the
 * first visible column — the month it belongs to, so a cut-off calendar still says where it starts.
 */
export function monthLabelAt(grid: HeatmapGrid, index: number, firstVisible: number): number {
    const starting = grid.monthStarts.indexOf(index);
    if (starting >= 0) return starting;
    if (index !== firstVisible) return -1;
    const day = grid.weeks[index]?.find((c) => !c.outside);
    // Too close to the next month's label: leave this one out, so the two do not overlap
    if (!day || grid.monthStarts[day.date.getMonth() + 1] - index < 3) return -1;
    return day.date.getMonth();
}

/** Years that can be browsed: from the first review (or this year) to this year. */
export function yearRange(log: ReviewLog, today: Date): { min: number; max: number } {
    const max = today.getFullYear();
    let min = max;
    for (const key of Object.keys(log.days)) {
        const y = parseInt(key.slice(0, 4), 10);
        if (Number.isFinite(y) && y < min) min = y;
    }
    return { min, max };
}

// MARK: Minimized calendar

/**
 * One month as rows of weeks (7 cells each, first day of the week first).
 * Days of other months are `null`. Colors use the same scale as the year view.
 */
export function buildMonthGrid(
    log: ReviewLog,
    year: number,
    month: number,
    today: Date,
    weekStartsOnMonday: boolean = true,
): Array<Array<HeatmapCell | null>> {
    const yearCounts: number[] = [];
    for (const [key, day] of Object.entries(log.days)) {
        if (key.startsWith(`${year}-`)) yearCounts.push(day.cards);
    }
    const reference = levelReference(yearCounts);
    const todayKey = dayKey(today);
    const first = new Date(year, month, 1);
    const offset = (first.getDay() - (weekStartsOnMonday ? 1 : 0) + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: Array<Array<HeatmapCell | null>> = [];
    let week: Array<HeatmapCell | null> = new Array<HeatmapCell | null>(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const key = dayKey(date);
        const cards = log.days[key]?.cards ?? 0;
        week.push({
            key,
            date,
            cards,
            level: heatmapLevel(cards, reference),
            outside: false,
            isFuture: key > todayKey,
            isToday: key === todayKey,
        });
        if (week.length === 7) {
            weeks.push(week);
            week = [];
        }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }
    return weeks;
}

export interface TodayProgress {
    /** Cards still due today */
    left: number;
    /** Done today + still due */
    planned: number;
    /** Share done (0–1); 1 when nothing is planned */
    fraction: number;
}

/** Progress ring of the minimized calendar: done today vs. planned for today. */
export function todayProgress(doneToday: number, dueLeft: number): TodayProgress {
    const done = Math.max(0, Math.round(doneToday));
    const left = Math.max(0, Math.round(dueLeft));
    const planned = done + left;
    return { left, planned, fraction: planned > 0 ? done / planned : 1 };
}
