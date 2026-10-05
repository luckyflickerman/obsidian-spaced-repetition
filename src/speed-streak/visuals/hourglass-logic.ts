/**
 * Hourglass style — pure logic: how much sand, how many full hundreds, and
 * which animation a change of the Endless score starts.
 *
 * No DOM. Easy to unit test.
 */

/** Grains in a full bottom bulb; every full one is a "hundred". */
export const GRAINS_PER_HOURGLASS = 100;

export interface HourglassFill {
    /** Grains in the bottom bulb (score mod 100) */
    grains: number;
    /** Full hundreds reached (score / 100, rounded down) */
    hundreds: number;
}

export function hourglassFill(score: number): HourglassFill {
    const s = Math.max(0, Math.floor(Number.isFinite(score) ? score : 0));
    return { grains: s % GRAINS_PER_HOURGLASS, hundreds: Math.floor(s / GRAINS_PER_HOURGLASS) };
}

/**
 * - "grain": one more correct answer (a grain falls),
 * - "cutscene": a hundred was completed (the hourglass turns over, the score stays),
 * - "error": the score fell back to 0 (the bulb empties),
 * - "none": nothing to animate (same score, session start…).
 */
export type HourglassTransition = "grain" | "cutscene" | "error" | "none";

export function hourglassTransition(prevScore: number, nextScore: number): HourglassTransition {
    if (nextScore === prevScore) return "none";
    if (nextScore < prevScore) return nextScore === 0 && prevScore > 0 ? "error" : "none";
    // a jump (scene rebuilt mid-session) is drawn as it is, without animation
    if (nextScore - prevScore !== 1) return "none";
    const before = hourglassFill(prevScore).hundreds;
    const after = hourglassFill(nextScore).hundreds;
    return after > before ? "cutscene" : "grain";
}

/** Height of the sand mound in the bottom bulb, 0–1 (looks natural: grows fast at first). */
export function moundLevel(grains: number): number {
    const g = Math.max(0, Math.min(GRAINS_PER_HOURGLASS, grains));
    return Math.sqrt(g / GRAINS_PER_HOURGLASS);
}
