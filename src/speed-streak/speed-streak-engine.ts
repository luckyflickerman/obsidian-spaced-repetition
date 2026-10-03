/**
 * Speed Streak game engine — pure logic, no DOM. Easy to unit test.
 *
 * Rules (faithful to the Anki add-on):
 *  - Each card has a question timer and a separate answer timer.
 *  - Finishing a card (any rating) before its timers run out grows the streak.
 *  - If a timer runs out the streak is lost (answer timeout optional). The card stays —
 *    you still answer it honestly; the next card starts a new streak.
 *  - Time Boost: every N completed cards earn a Boost (bank has a max). Using a Boost
 *    adds time to the running timer without stopping the session.
 *  - Points (legacy): score += base points × streak multiplier.
 *  - The first card after entering review can be free (untimed).
 */

import {
    SpeedStreakRunRecord,
    SpeedStreakSettings,
    TimerPolicy,
    localDayKey,
} from "src/speed-streak/speed-streak-settings";

export type SpeedStreakPhase = "idle" | "question" | "answer";
export type SpeedStreakRating = "again" | "hard" | "good" | "easy";

export type SpeedStreakEventType =
    | "session-start"
    | "question"
    | "reveal"
    | "rate"
    | "skip"
    | "timeout"
    | "answer-timeout"
    | "warning-tick"
    | "boost"
    | "boost-blocked"
    | "boost-earned"
    | "pause"
    | "resume"
    | "pause-blocked"
    | "streak-lost"
    | "new-best"
    | "session-end";

export interface SpeedStreakEvent {
    type: SpeedStreakEventType;
    rating?: SpeedStreakRating;
    text?: string;
    /** For warning ticks: whole seconds left */
    secondsLeft?: number;
    /** For streak-lost: the run that just ended */
    run?: SpeedStreakRunRecord;
    points?: number;
}

export type SpeedStreakListener = (event: SpeedStreakEvent) => void;

export interface SpeedStreakSessionSummary {
    cards: number;
    skipped: number;
    timeouts: number;
    boostsUsed: number;
    bestStreakInSession: number;
    activeMs: number;
    score: number;
    ratings: Record<SpeedStreakRating, number>;
    runs: SpeedStreakRunRecord[];
}

const BASE_POINTS: Record<SpeedStreakRating, number> = { again: 1, hard: 2, good: 3, easy: 4 };

export class SpeedStreakEngine {
    settings: SpeedStreakSettings;
    private clock: () => number;
    private listeners: SpeedStreakListener[] = [];

    // Session
    sessionActive = false;
    sessionStartedAt = 0;
    deckName = "";
    private firstCardPending = false;

    // Phase / timer
    phase: SpeedStreakPhase = "idle";
    /** Is the current card free (first card on review entry)? */
    cardIsFree = false;
    policy: TimerPolicy = { questionMs: null, answerMs: null, source: "" };
    /** Limit of the running phase in ms; null = untimed */
    phaseLimitMs: number | null = null;
    /** Extra ms added by Boosts in the running phase */
    phaseBoostMs = 0;
    private phaseAccumulatedMs = 0;
    private phaseResumedAt = 0;
    private phaseTimedOut = false;
    private lastWarningSecond = -1;
    private questionElapsedMs = 0;
    /** True once any timer of the current card expired */
    cardTimedOut = false;

    paused = false;
    pauseOrigin: "manual" | "auto" | "" = "";

    // Game
    streak = 0;
    score = 0;
    boostCharges = 0;
    boostProgress = 0;
    ratingTrail: SpeedStreakRating[] = [];

    // Current run (streak sequence)
    private runStartedAt = 0;
    private runActiveMs = 0;
    private runPauses = 0;
    private runBoosts = 0;
    private runScore = 0;

    // Session stats
    summary: SpeedStreakSessionSummary = SpeedStreakEngine.emptySummary();

    /** Best streak to beat (set by the controller from stored records) */
    bestToBeat = 0;
    private announcedNewBest = false;

    constructor(settings: SpeedStreakSettings, clock: () => number = () => Date.now()) {
        this.settings = settings;
        this.clock = clock;
        this.boostCharges = settings.startingBoostCharges;
    }

    static emptySummary(): SpeedStreakSessionSummary {
        return {
            cards: 0,
            skipped: 0,
            timeouts: 0,
            boostsUsed: 0,
            bestStreakInSession: 0,
            activeMs: 0,
            score: 0,
            ratings: { again: 0, hard: 0, good: 0, easy: 0 },
            runs: [],
        };
    }

    on(listener: SpeedStreakListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private emit(event: SpeedStreakEvent) {
        for (const l of this.listeners) {
            try {
                l(event);
            } catch (e) {
                console.error("[Speed Streak] listener error", e);
            }
        }
    }

    updateSettings(settings: SpeedStreakSettings) {
        this.settings = settings;
        this.boostCharges = Math.min(this.boostCharges, settings.maxBoostCharges);
    }

    // MARK: Session

    startSession(deckName: string) {
        if (this.sessionActive) return;
        const now = this.clock();
        this.sessionActive = true;
        this.sessionStartedAt = now;
        this.deckName = deckName;
        this.firstCardPending = this.settings.freeFirstCard;
        this.phase = "idle";
        this.paused = false;
        this.pauseOrigin = "";
        this.streak = 0;
        this.score = 0;
        this.ratingTrail = [];
        this.boostCharges = Math.min(
            this.settings.startingBoostCharges,
            this.settings.maxBoostCharges,
        );
        this.boostProgress = 0;
        this.summary = SpeedStreakEngine.emptySummary();
        this.announcedNewBest = false;
        this.resetRun(now);
        this.emit({ type: "session-start" });
    }

    endSession(): SpeedStreakSessionSummary | null {
        if (!this.sessionActive) return null;
        this.foldPhaseTime();
        if (this.streak > 0) this.closeRun("session-end");
        this.sessionActive = false;
        this.phase = "idle";
        this.paused = false;
        const summary = this.summary;
        this.emit({ type: "session-end" });
        return summary;
    }

    // MARK: Card flow

    onQuestionShown(policy: TimerPolicy) {
        if (!this.sessionActive) return;
        this.foldPhaseTime();
        this.cardIsFree = this.firstCardPending;
        this.firstCardPending = false;
        this.policy = policy;
        this.cardTimedOut = false;
        this.questionElapsedMs = 0;
        this.beginPhase("question", this.cardIsFree ? null : policy.questionMs);
        this.emit({ type: "question" });
    }

    onAnswerShown() {
        if (!this.sessionActive || this.phase !== "question") return;
        this.questionElapsedMs = this.phaseElapsedMs();
        this.foldPhaseTime();
        this.beginPhase("answer", this.cardIsFree ? null : this.policy.answerMs);
        this.emit({ type: "reveal" });
    }

    onRate(rating: SpeedStreakRating) {
        if (!this.sessionActive || this.phase !== "answer") return;
        // Rating completes the card even if paused
        if (this.paused) this.resume(true);
        this.foldPhaseTime();
        this.summary.cards++;
        this.summary.ratings[rating]++;

        // Boost progress: every completed card counts (same as original)
        if (this.settings.gameplayMode === "time_boost") this.advanceBoostProgress();

        if (rating === "again" && this.settings.againBreaksStreak) {
            this.ratingTrail = [];
            this.breakStreak("again");
            this.emit({ type: "rate", rating, text: "again-break" });
        } else if (this.cardTimedOut) {
            // Streak already lost on timeout; this card starts nothing new
            this.emit({ type: "rate", rating });
        } else {
            this.streak++;
            this.ratingTrail.push(rating);
            if (this.ratingTrail.length > 40) this.ratingTrail.shift();
            this.summary.bestStreakInSession = Math.max(
                this.summary.bestStreakInSession,
                this.streak,
            );
            let points = 0;
            if (this.settings.gameplayMode === "points") {
                points = Math.max(1, Math.round(BASE_POINTS[rating] * this.multiplier()));
                this.score += points;
                this.runScore += points;
                this.summary.score = this.score;
            }
            this.emit({ type: "rate", rating, points });
            if (!this.announcedNewBest && this.bestToBeat > 0 && this.streak > this.bestToBeat) {
                this.announcedNewBest = true;
                this.emit({ type: "new-best" });
            }
        }
        this.phase = "idle";
        this.phaseLimitMs = null;
    }

    onSkip() {
        if (!this.sessionActive) return;
        if (this.paused) this.resume(true);
        this.foldPhaseTime();
        this.summary.skipped++;
        this.phase = "idle";
        this.phaseLimitMs = null;
        this.emit({ type: "skip" });
    }

    /** Multiplier in points mode */
    multiplier(streak: number = this.streak): number {
        return 1 + Math.min(4, streak * 0.08);
    }

    // MARK: Timer

    private beginPhase(phase: SpeedStreakPhase, limitMs: number | null) {
        this.phase = phase;
        this.phaseLimitMs = limitMs;
        this.phaseBoostMs = 0;
        this.phaseAccumulatedMs = 0;
        this.phaseTimedOut = false;
        this.lastWarningSecond = -1;
        const wasAutoPaused = this.paused && this.pauseOrigin === "auto";
        if (this.paused && !wasAutoPaused) {
            // a manual pause ends when a new phase begins
            this.paused = false;
            this.pauseOrigin = "";
        }
        this.phaseResumedAt = this.clock();
    }

    /** Adds the running segment of the phase to run / session active time. */
    private foldPhaseTime() {
        if (this.phase === "idle" || this.paused) return;
        const now = this.clock();
        const seg = Math.max(0, now - this.phaseResumedAt);
        this.phaseAccumulatedMs += seg;
        this.runActiveMs += seg;
        this.summary.activeMs += seg;
        this.phaseResumedAt = now;
    }

    phaseElapsedMs(): number {
        if (this.phase === "idle") return 0;
        if (this.paused) return this.phaseAccumulatedMs;
        return this.phaseAccumulatedMs + Math.max(0, this.clock() - this.phaseResumedAt);
    }

    /** Remaining ms (negative = overtime). null = untimed */
    remainingMs(): number | null {
        if (this.phase === "idle" || this.phaseLimitMs === null) return null;
        return this.phaseLimitMs + this.phaseBoostMs - this.phaseElapsedMs();
    }

    totalLimitMs(): number | null {
        if (this.phaseLimitMs === null) return null;
        return this.phaseLimitMs + this.phaseBoostMs;
    }

    get timedOut(): boolean {
        return this.phaseTimedOut;
    }

    /** Call regularly (e.g. every 100 ms). Emits warning ticks & timeouts. */
    tick() {
        if (!this.sessionActive || this.phase === "idle" || this.paused) return;
        const remaining = this.remainingMs();
        if (remaining === null || this.phaseTimedOut) return;

        const warn = this.settings.countdownWarningSeconds;
        if (warn > 0 && remaining > 0 && remaining <= warn * 1000) {
            const sec = Math.ceil(remaining / 1000);
            if (sec !== this.lastWarningSecond) {
                this.lastWarningSecond = sec;
                this.emit({ type: "warning-tick", secondsLeft: sec });
            }
        }

        if (remaining <= 0) {
            this.phaseTimedOut = true;
            if (this.phase === "answer" && !this.settings.answerTimeoutBreaksStreak) {
                this.emit({ type: "answer-timeout" });
                return;
            }
            this.cardTimedOut = true;
            this.summary.timeouts++;
            this.ratingTrail = [];
            this.emit({ type: "timeout" });
            this.breakStreak("timeout");
        }
    }

    // MARK: Pause

    canPause(): boolean {
        return this.sessionActive && this.phase !== "idle" && !this.settings.noPauseMode;
    }

    togglePause(): boolean {
        if (this.paused) {
            this.resume(false);
            return true;
        }
        return this.pause("manual");
    }

    pause(origin: "manual" | "auto"): boolean {
        if (!this.sessionActive || this.phase === "idle" || this.paused) return false;
        if (origin === "manual" && this.settings.noPauseMode) {
            this.emit({ type: "pause-blocked" });
            return false;
        }
        this.foldPhaseTime();
        this.paused = true;
        this.pauseOrigin = origin;
        if (origin === "manual") this.runPauses++;
        this.emit({ type: "pause", text: origin });
        return true;
    }

    resume(silent = false) {
        if (!this.paused) return;
        this.paused = false;
        this.pauseOrigin = "";
        this.phaseResumedAt = this.clock();
        if (!silent) this.emit({ type: "resume" });
    }

    // MARK: Boost

    boostUnavailableReason(): string {
        if (this.settings.gameplayMode !== "time_boost") return "mode";
        if (!this.sessionActive || this.phase === "idle") return "no-card";
        if (this.paused) return "paused";
        if (this.phaseLimitMs === null) return "untimed";
        if (this.boostCharges <= 0) return "empty";
        if (this.phaseTimedOut) return "expired";
        return "";
    }

    useBoost(): boolean {
        const reason = this.boostUnavailableReason();
        if (reason) {
            this.emit({ type: "boost-blocked", text: reason });
            return false;
        }
        this.boostCharges--;
        this.phaseBoostMs += Math.round(this.settings.boostSeconds * 1000);
        this.lastWarningSecond = -1;
        this.summary.boostsUsed++;
        this.runBoosts++;
        this.emit({ type: "boost" });
        return true;
    }

    private advanceBoostProgress() {
        if (this.boostCharges >= this.settings.maxBoostCharges) {
            this.boostProgress = 0;
            return;
        }
        this.boostProgress++;
        if (this.boostProgress >= this.settings.cardsPerBoostCharge) {
            this.boostProgress = 0;
            this.boostCharges = Math.min(this.settings.maxBoostCharges, this.boostCharges + 1);
            this.emit({ type: "boost-earned" });
        }
    }

    // MARK: Runs

    private resetRun(now: number) {
        this.runStartedAt = now;
        this.runActiveMs = 0;
        this.runPauses = 0;
        this.runBoosts = 0;
        this.runScore = 0;
    }

    private breakStreak(reason: "timeout" | "again") {
        const run = this.streak > 0 ? this.closeRun(reason) : null;
        this.streak = 0;
        this.announcedNewBest = false;
        if (run) this.emit({ type: "streak-lost", run });
        else this.resetRun(this.clock());
    }

    private closeRun(reason: SpeedStreakRunRecord["endReason"]): SpeedStreakRunRecord {
        const now = this.clock();
        const run: SpeedStreakRunRecord = {
            streak: this.streak,
            score: this.runScore,
            startedAt: this.runStartedAt,
            endedAt: now,
            day: localDayKey(now),
            activeMs: this.runActiveMs,
            cards: this.streak,
            pauses: this.runPauses,
            boostsUsed: this.runBoosts,
            pure: this.runPauses === 0 && this.runBoosts === 0,
            endReason: reason,
            deck: this.deckName,
        };
        this.summary.runs.push(run);
        this.resetRun(now);
        return run;
    }
}
