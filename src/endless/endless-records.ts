/**
 * Endless mode — the score and its own records (apart from Speed Streak).
 *
 * - Score: answers in a row without an error. "Hard", "Good" and "Easy" add 1,
 *   "Error" (again / reset) sets it back to 0. Works with Speed Streak off too;
 *   a Speed Streak timeout does not touch it.
 * - Records: best score of all time and of today, top 5 runs, last 5 sessions
 *   and totals. Stored in the plugin data as `endless.records`.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

import type { EndlessRating } from "src/endless/endless-queue";

/** One run of the score (ended by "Error" or by the end of the session). */
export interface EndlessRunRecord {
    score: number;
    endedAt: number;
    /** Local date, YYYY-MM-DD */
    day: string;
    /** Deck names of the session, e.g. "ENG, ESP" */
    decks: string;
}

export interface EndlessSessionRecord {
    endedAt: number;
    day: string;
    decks: string;
    /** Every rating of the session */
    ratings: number;
    /** Best score reached in the session */
    bestScore: number;
    errors: number;
    durationMs: number;
}

export interface EndlessRecords {
    best: EndlessRunRecord | null;
    /** Best run of `bestToday.day` (only counts when that day is today) */
    bestToday: EndlessRunRecord | null;
    /** Longest runs, best first */
    top: EndlessRunRecord[];
    /** Last sessions, newest first */
    recent: EndlessSessionRecord[];
    totals: { ratings: number; sessions: number };
}

export interface EndlessData {
    records: EndlessRecords;
}

export const TOP_RUNS = 5;
export const RECENT_SESSIONS = 5;

export function createEndlessRecords(): EndlessRecords {
    return {
        best: null,
        bestToday: null,
        top: [],
        recent: [],
        totals: { ratings: 0, sessions: 0 },
    };
}

export function createEndlessData(): EndlessData {
    return { records: createEndlessRecords() };
}

export function localDay(epochMs: number): string {
    const d = new Date(epochMs);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

// MARK: Score of the running session

export interface EndlessScoreState {
    score: number;
    bestScore: number;
    errors: number;
    ratings: number;
}

export function createScoreState(): EndlessScoreState {
    return { score: 0, bestScore: 0, errors: 0, ratings: 0 };
}

/**
 * Applies a rating. Returns the new state and the run that just ended
 * ("Error" after at least one good answer), or null.
 */
export function applyRating(
    state: EndlessScoreState,
    rating: EndlessRating,
): { state: EndlessScoreState; endedRun: number | null } {
    const ratings = state.ratings + 1;
    if (rating === "again") {
        return {
            state: { ...state, score: 0, errors: state.errors + 1, ratings },
            endedRun: state.score > 0 ? state.score : null,
        };
    }
    const score = state.score + 1;
    return {
        state: { ...state, score, bestScore: Math.max(state.bestScore, score), ratings },
        endedRun: null,
    };
}

// MARK: Records

function better(a: EndlessRunRecord, b: EndlessRunRecord): boolean {
    // higher score; equal score: the earlier one keeps its place
    return a.score > b.score;
}

/** Records a finished run. `newBest` = it beat the all-time record. */
export function addRun(
    records: EndlessRecords,
    run: EndlessRunRecord,
): { records: EndlessRecords; newBest: boolean } {
    if (run.score <= 0) return { records, newBest: false };
    const newBest = records.best === null || better(run, records.best);
    const sameDay = records.bestToday?.day === run.day;
    const bestToday =
        !sameDay || records.bestToday === null || better(run, records.bestToday)
            ? run
            : records.bestToday;
    const top = [...records.top, run]
        .sort((a, b) => b.score - a.score || a.endedAt - b.endedAt)
        .slice(0, TOP_RUNS);
    return {
        records: { ...records, best: newBest ? run : records.best, bestToday, top },
        newBest,
    };
}

/** Records a finished session (newest first, last 5) and the totals. */
export function addSession(records: EndlessRecords, session: EndlessSessionRecord): EndlessRecords {
    if (session.ratings <= 0) return records;
    return {
        ...records,
        recent: [session, ...records.recent].slice(0, RECENT_SESSIONS),
        totals: {
            ratings: records.totals.ratings + session.ratings,
            sessions: records.totals.sessions + 1,
        },
    };
}

/** Best score of today (0 when nothing today yet). */
export function bestTodayScore(records: EndlessRecords, now: number): number {
    return records.bestToday && records.bestToday.day === localDay(now)
        ? records.bestToday.score
        : 0;
}

export function bestScore(records: EndlessRecords): number {
    return records.best?.score ?? 0;
}

// MARK: Normalization (old data.json without these fields must load)

const num = (v: unknown, def = 0) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : def;
const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : "");

function normalizeRun(v: unknown): EndlessRunRecord | null {
    if (!v || typeof v !== "object") return null;
    const r = v as Partial<EndlessRunRecord>;
    const score = num(r.score);
    if (score <= 0) return null;
    const endedAt = num(r.endedAt);
    return { score, endedAt, day: str(r.day) || localDay(endedAt), decks: str(r.decks) };
}

function normalizeSession(v: unknown): EndlessSessionRecord | null {
    if (!v || typeof v !== "object") return null;
    const s = v as Partial<EndlessSessionRecord>;
    const endedAt = num(s.endedAt);
    return {
        endedAt,
        day: str(s.day) || localDay(endedAt),
        decks: str(s.decks),
        ratings: num(s.ratings),
        bestScore: num(s.bestScore),
        errors: num(s.errors),
        durationMs: num(s.durationMs),
    };
}

export function normalizeEndlessRecords(stored: unknown): EndlessRecords {
    const def = createEndlessRecords();
    if (!stored || typeof stored !== "object") return def;
    const s = stored as Partial<EndlessRecords>;
    const list = <T>(v: unknown, f: (x: unknown) => T | null, max: number): T[] =>
        Array.isArray(v)
            ? v
                  .map(f)
                  .filter((x): x is T => x !== null)
                  .slice(0, max)
            : [];
    const totals = (s.totals ?? {}) as Partial<EndlessRecords["totals"]>;
    return {
        best: normalizeRun(s.best),
        bestToday: normalizeRun(s.bestToday),
        top: list(s.top, normalizeRun, TOP_RUNS),
        recent: list(s.recent, normalizeSession, RECENT_SESSIONS),
        totals: { ratings: num(totals.ratings), sessions: num(totals.sessions) },
    };
}

export function normalizeEndlessData(stored: unknown): EndlessData {
    const s = stored && typeof stored === "object" ? (stored as Partial<EndlessData>) : {};
    return { records: normalizeEndlessRecords(s.records) };
}

// MARK: Display

/** "0:42", "12:05", "1:02:05" */
export function formatSessionTime(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = String(total % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
