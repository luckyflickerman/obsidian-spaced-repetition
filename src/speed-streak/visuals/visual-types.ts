import type {
    SpeedStreakEvent,
    SpeedStreakPhase,
    SpeedStreakRating,
} from "src/speed-streak/speed-streak-engine";
import type { SpeedStreakPerformance } from "src/speed-streak/speed-streak-settings";

/** Where a scene is shown: inside the compact bar (~64 px), the side panel or the settings preview. */
export type VisualSize = "compact" | "large";

export interface VisualContext {
    performance: SpeedStreakPerformance;
    /** "Reduced motion" setting or the system's prefers-reduced-motion */
    reducedMotion: boolean;
    size: VisualSize;
}

export interface VisualState {
    streak: number;
    /** Ratings of the running streak, oldest first (capped, see the engine) */
    ratingTrail: SpeedStreakRating[];
    /** Counts of each rating in the whole running streak */
    streakRatings: Record<SpeedStreakRating, number>;
    /** Remaining time of the running timer (1 = full, 0 = out); null = untimed / idle */
    fraction: number | null;
    phase: SpeedStreakPhase;
    paused: boolean;
    timedOut: boolean;
    /** The streak is above the record */
    isNewBest: boolean;
}

export const EMPTY_VISUAL_STATE: VisualState = {
    streak: 0,
    ratingTrail: [],
    streakRatings: { again: 0, hard: 0, good: 0, easy: 0 },
    fraction: null,
    phase: "idle",
    paused: false,
    timedOut: false,
    isNewBest: false,
};

/** A visual style ("scene"). One file per style, registered in visual-registry.ts. */
export interface SpeedStreakVisual {
    /** e.g. "fusion" — must match the registry entry */
    id: string;
    name: { en: string; pl?: string };
    /** Default color theme of this style (an id from speed-streak-themes.ts) */
    defaultThemeId: string;
    mount(host: HTMLElement, ctx: VisualContext): void;
    update(state: VisualState): void;
    /** rate, timeout, boost, new-best → animations */
    onEvent(e: SpeedStreakEvent): void;
    resize(width: number, height: number): void;
    /** Re-read the theme colors (after the theme changed) */
    refreshColors(): void;
    destroy(): void;
}
