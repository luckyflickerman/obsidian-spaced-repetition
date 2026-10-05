/**
 * Schedule comments `<!--SR:…-->` written by the plugin after a review.
 *
 * Pure logic (no Obsidian, no DOM): finds the comments in a piece of text and reads the
 * next review dates out of them, so the editor can show a small icon instead of the long text.
 * Nothing here changes the note — the comments stay exactly as they are in the file.
 *
 * Formats (one `!`-segment per card side):
 *   SM-2: `<!--SR:!2026-10-08,3,250!2026-10-12,7,270-->`  date, interval, ease
 *   FSRS: `<!--SR:!fsrs,2026-10-05T11:27:20.841Z,0,2.3,…-->` due date-time first
 */

export interface ScheduleComment {
    /** Offset of `<!--` in the text */
    from: number;
    /** Offset just after `-->` */
    to: number;
    /** Next review dates, YYYY-MM-DD, in the order of the segments */
    dates: string[];
}

const COMMENT = /<!--SR:([^\n]*?)-->/g;
const DAY = /^\d{4}-\d{2}-\d{2}/;

/** Next review dates from the inside of a comment (the part after `SR:`). */
export function scheduleDates(body: string): string[] {
    const dates: string[] = [];
    for (const segment of body.split("!")) {
        const parts = segment.split(",");
        const raw = parts[0] === "fsrs" ? parts[1] : parts[0];
        const m = DAY.exec((raw ?? "").trim());
        if (m) dates.push(m[0]);
    }
    return dates;
}

/** All schedule comments in `text` (offsets relative to `text`). */
export function findScheduleComments(text: string): ScheduleComment[] {
    const found: ScheduleComment[] = [];
    for (const m of text.matchAll(COMMENT)) {
        const from = m.index ?? 0;
        found.push({ from, to: from + m[0].length, dates: scheduleDates(m[1]) });
    }
    return found;
}

/** The line holds nothing but schedule comments (the usual case: a comment under the card). */
export function isScheduleOnlyLine(line: string): boolean {
    return line.trim() !== "" && line.replace(COMMENT, "").trim() === "";
}
