import type { SpeedStreakRating } from "src/speed-streak/speed-streak-engine";
import type { RunBadge } from "src/speed-streak/speed-streak-records";
import type {
    SpeedStreakLayout,
    SpeedStreakRecordsView,
    SpeedStreakRunRecord,
} from "src/speed-streak/speed-streak-settings";
import type { VisualSize } from "src/speed-streak/visuals/visual-types";

export interface ListedRun {
    run: SpeedStreakRunRecord;
    rank: number;
    date: string;
    badge: RunBadge;
}

/** Everything a layout shows, computed by the controller ~10× per second. */
export interface HudViewModel {
    // Timer
    timerText: string;
    phaseLabel: string;
    phaseTitle: string;
    /** Ring / bar fill (0–1) */
    fraction: number;
    timeColor: string;
    untimed: boolean;
    paused: boolean;
    /** Frozen by "read aloud" (no paused overlay) */
    held: boolean;
    timedOut: boolean;
    warning: boolean;
    free: boolean;
    phase: "idle" | "question" | "answer";

    // Streak
    streak: number;
    newBest: boolean;
    liveBadge: RunBadge;
    trail: SpeedStreakRating[];
    showTrail: boolean;
    scoreText: string;

    // Records
    recordsView: SpeedStreakRecordsView;
    recordLabel: string;
    /** Record value shown (the live streak once it is beaten) */
    recordValue: number;
    recordProgress: number;
    recordBarText: string;
    listTitle: string;
    /** Changes only when the records change (compare by reference) */
    listedRuns: ListedRun[];

    // Boost
    boostMode: boolean;
    boostLabel: string;
    boostDisabled: boolean;
    boostTooltip: string;
    charges: number;
    maxCharges: number;
    boostProgress: number;
    boostProgressText: string;

    // Pause button
    pauseIcon: "pause" | "play";
    pauseHidden: boolean;
    pauseTooltip: string;
}

export interface LayoutCallbacks {
    togglePause(): void;
    useBoost(): void;
    toggleCollapsed(): void;
    /** `null` = the record itself (best run in scope) */
    openRun(run: SpeedStreakRunRecord | null): void;
}

export type ToastKind = "good" | "bad" | "warn" | "boost";

export interface SpeedStreakLayoutView {
    readonly kind: SpeedStreakLayout;
    /** Root element (theme tokens are applied to it) */
    readonly root: HTMLElement;
    /** Where the visual style is mounted */
    readonly sceneHost: HTMLElement;
    readonly sceneSize: VisualSize;
    render(vm: HudViewModel): void;
    toast(text: string, kind: ToastKind): void;
    /** One-shot CSS animation on the root (bump, shake, boosted, record-glow) */
    pulse(cls: string): void;
    setCollapsed(collapsed: boolean): void;
    destroy(): void;
}
