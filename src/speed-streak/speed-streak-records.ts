/**
 * Speed Streak — records panel logic: filtering, ranking, "Pure" / "Breaks"
 * badges, record progress and date formatting.
 *
 * Pure functions, no DOM. Easy to unit test.
 */

import type {
    SpeedStreakRecordScope,
    SpeedStreakRecordsFilter,
    SpeedStreakRecordsList,
    SpeedStreakRunRecord,
} from "src/speed-streak/speed-streak-settings";
import { localDayKey } from "src/speed-streak/speed-streak-settings";

/** "Pure": no manual pauses and no Boosts. "Breaks": at least one of them. */
export type RunBadge = "pure" | "breaks";

export interface RecordsOptions {
    recordScope: SpeedStreakRecordScope;
    recordsList: SpeedStreakRecordsList;
    recordsFilter: SpeedStreakRecordsFilter;
}

export function runBadge(run: Pick<SpeedStreakRunRecord, "pauses" | "boostsUsed">): RunBadge {
    return (run.pauses ?? 0) === 0 && (run.boostsUsed ?? 0) === 0 ? "pure" : "breaks";
}

function isPure(run: SpeedStreakRunRecord): boolean {
    return runBadge(run) === "pure";
}

/** Runs in the chosen scope (all time / today) and filter (all / Pure only). */
export function filterRuns(
    runs: SpeedStreakRunRecord[],
    options: Pick<RecordsOptions, "recordScope" | "recordsFilter">,
    now: number,
): SpeedStreakRunRecord[] {
    const today = localDayKey(now);
    return runs.filter(
        (r) =>
            r.streak > 0 &&
            (options.recordScope !== "today" || r.day === today) &&
            (options.recordsFilter !== "pure" || isPure(r)),
    );
}

/** Longest streaks first; equal streaks: the faster run first. */
export function rankRuns(runs: SpeedStreakRunRecord[], n: number): SpeedStreakRunRecord[] {
    return [...runs]
        .sort((a, b) => b.streak - a.streak || a.activeMs - b.activeMs || a.endedAt - b.endedAt)
        .slice(0, n);
}

/** Most recent first. */
export function recentRuns(runs: SpeedStreakRunRecord[], n: number): SpeedStreakRunRecord[] {
    return [...runs].sort((a, b) => b.endedAt - a.endedAt).slice(0, n);
}

/** The list shown in the panel ("top 5" ranking or the 5 most recent). */
export function listedRuns(
    runs: SpeedStreakRunRecord[],
    options: RecordsOptions,
    now: number,
    n: number = 5,
): SpeedStreakRunRecord[] {
    const filtered = filterRuns(runs, options, now);
    return options.recordsList === "recent" ? recentRuns(filtered, n) : rankRuns(filtered, n);
}

/** The record to beat in the chosen scope and filter (null = no runs yet). */
export function bestRunOf(
    runs: SpeedStreakRunRecord[],
    options: Pick<RecordsOptions, "recordScope" | "recordsFilter">,
    now: number,
): SpeedStreakRunRecord | null {
    return rankRuns(filterRuns(runs, options, now), 1)[0] ?? null;
}

/** How close the live streak is to the record (0–1; 1 = matched or beaten). */
export function recordProgress(streak: number, best: number): number {
    if (best <= 0) return streak > 0 ? 1 : 0;
    return Math.max(0, Math.min(1, streak / best));
}

// MARK: Formatting

const MONTHS_EN = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];
const MONTHS_PL = [
    "sty",
    "lut",
    "mar",
    "kwi",
    "maj",
    "cze",
    "lip",
    "sie",
    "wrz",
    "paź",
    "lis",
    "gru",
];

/** "8:26" (Polish, 24 h) or "8:26 AM" (English). */
export function formatClock(epochMs: number, polish: boolean): string {
    const d = new Date(epochMs);
    const mm = String(d.getMinutes()).padStart(2, "0");
    if (polish) return `${d.getHours()}:${mm}`;
    const h = d.getHours() % 12 || 12;
    return `${h}:${mm} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

/**
 * Date of a run: "Dziś 8:26", "Wczoraj 9:26", "28 sie" (Polish) or
 * "Today 8:26 AM", "Yesterday 9:26 AM", "Aug 28" (English). Other years get
 * the year added.
 */
export function formatRunDate(epochMs: number, now: number, polish: boolean): string {
    const d = new Date(epochMs);
    const key = localDayKey(epochMs);
    const today = new Date(now);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (key === localDayKey(now))
        return `${polish ? "Dziś" : "Today"} ${formatClock(epochMs, polish)}`;
    if (key === localDayKey(yesterday.getTime()))
        return `${polish ? "Wczoraj" : "Yesterday"} ${formatClock(epochMs, polish)}`;
    const month = (polish ? MONTHS_PL : MONTHS_EN)[d.getMonth()];
    const sameYear = d.getFullYear() === today.getFullYear();
    const date = polish ? `${d.getDate()} ${month}` : `${month} ${d.getDate()}`;
    return sameYear ? date : `${date} ${d.getFullYear()}`;
}

/** "0:42", "12:05", "1:02:05" */
export function formatDuration(ms: number): string {
    const total = Math.max(0, Math.round((Number.isFinite(ms) ? ms : 0) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
