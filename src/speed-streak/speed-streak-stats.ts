/**
 * Speed Streak — numbers for the pause overview (tempo and rating totals).
 *
 * Pure functions, no DOM. Easy to unit test.
 */

import type { SpeedStreakRating } from "src/speed-streak/speed-streak-engine";

export interface PauseOverview {
    /** Active review time (without pauses), ms */
    activeMs: number;
    cards: number;
    /** 0 when nothing was rated yet */
    cardsPerMinute: number;
    secondsPerCard: number;
    ratings: Record<SpeedStreakRating, number>;
    /** Share of each rating (0–1), for the bar on the pause screen */
    ratingShares: Record<SpeedStreakRating, number>;
    streak: number;
}

export const RATING_ORDER: SpeedStreakRating[] = ["again", "hard", "good", "easy"];

export function pauseOverview(
    summary: { cards: number; activeMs: number; ratings: Record<SpeedStreakRating, number> },
    streak: number,
): PauseOverview {
    const activeMs = Math.max(0, summary.activeMs);
    const cards = Math.max(0, summary.cards);
    const ratings = { again: 0, hard: 0, good: 0, easy: 0, ...summary.ratings };
    const rated = RATING_ORDER.reduce((sum, r) => sum + ratings[r], 0);
    const ratingShares = { again: 0, hard: 0, good: 0, easy: 0 };
    if (rated > 0) for (const r of RATING_ORDER) ratingShares[r] = ratings[r] / rated;
    return {
        activeMs,
        cards,
        cardsPerMinute: cards > 0 && activeMs > 0 ? cards / (activeMs / 60_000) : 0,
        secondsPerCard: cards > 0 ? activeMs / cards / 1000 : 0,
        ratings,
        ratingShares,
        streak: Math.max(0, streak),
    };
}
