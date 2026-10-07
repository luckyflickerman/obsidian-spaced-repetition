/**
 * Endless — the record track above the deck list: a bar from 0 to the all-time record with
 * today's best on it and a few round milestones (25, 50, 100, …) on the way.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

/** Round milestones, in order; only those below the record are shown. */
const MILESTONES = [10, 25, 50, 100, 200, 300, 500, 1000, 2000, 5000];

export interface RecordTick {
    value: number;
    /** Place on the bar, 0–1 */
    at: number;
}

export interface RecordTrack {
    best: number;
    today: number;
    /** Today's best on the bar, 0–1 (1 = today is the record) */
    fraction: number;
    /** At most `maxTicks` milestones, spread out, all below the record */
    ticks: RecordTick[];
}

export function recordTrack(best: number, today: number, maxTicks = 3): RecordTrack {
    const b = Math.max(0, Math.floor(Number.isFinite(best) ? best : 0));
    const t = Math.min(b, Math.max(0, Math.floor(Number.isFinite(today) ? today : 0)));
    if (b === 0) return { best: 0, today: 0, fraction: 0, ticks: [] };

    // milestones that leave room next to 0 and next to the record label
    const fit = MILESTONES.filter((m) => m / b >= 0.12 && m / b <= 0.9);
    // keep the biggest ones (closest to the record), at most maxTicks
    const chosen = fit.slice(Math.max(0, fit.length - maxTicks));
    return {
        best: b,
        today: t,
        fraction: t / b,
        ticks: chosen.map((value) => ({ value, at: value / b })),
    };
}
