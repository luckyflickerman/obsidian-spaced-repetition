/**
 * Pause screen over the card: session time, cards, tempo (cards per minute,
 * seconds per card), rating totals and the live streak. Tap anywhere to resume.
 */

import { isPolish, ss } from "src/speed-streak/speed-streak-i18n";
import { formatDuration } from "src/speed-streak/speed-streak-records";
import { PauseOverview, RATING_ORDER } from "src/speed-streak/speed-streak-stats";

const RATING_KEYS = {
    again: "R_AGAIN",
    hard: "R_HARD",
    good: "R_GOOD",
    easy: "R_EASY",
} as const;

function decimal(n: number, digits: number): string {
    const text = n.toFixed(digits);
    return isPolish() ? text.replace(".", ",") : text;
}

export class PauseOverlay {
    readonly root: HTMLElement;
    private stats: HTMLElement;

    constructor(parent: HTMLElement, onResume: () => void) {
        this.root = parent.createDiv({ cls: "sr-ss-paused-overlay" });
        this.root.setAttr("role", "button");
        this.root.createDiv({ cls: "sr-ss-paused-title", text: ss("PAUSED") });
        this.stats = this.root.createDiv({ cls: "sr-ss-pause-stats" });
        this.root.createDiv({ cls: "sr-ss-paused-hint", text: ss("CLICK_TO_RESUME") });
        this.root.addEventListener("click", () => onResume());
    }

    /** Fills in the numbers (called when the pause starts, not every frame). */
    show(o: PauseOverview) {
        const el = this.stats;
        el.empty();
        const grid = el.createDiv({ cls: "sr-ss-pause-grid" });
        const cell = (label: string, value: string) => {
            const c = grid.createDiv({ cls: "sr-ss-pause-cell" });
            c.createDiv({ cls: "sr-ss-pause-label", text: label });
            c.createDiv({ cls: "sr-ss-pause-value", text: value });
        };
        cell(ss("P_SESSION"), formatDuration(o.activeMs));
        cell(ss("P_CARDS"), String(o.cards));
        cell(
            ss("P_TEMPO"),
            o.cards > 0
                ? ss("P_TEMPO_VALUE", {
                      cpm: decimal(o.cardsPerMinute, 1),
                      spc: decimal(o.secondsPerCard, 1),
                  })
                : "–",
        );
        cell(ss("P_STREAK"), String(o.streak));

        const ratings = el.createDiv({ cls: "sr-ss-pause-ratings" });
        ratings.createDiv({ cls: "sr-ss-pause-label", text: ss("P_RATINGS") });
        const bar = ratings.createDiv({ cls: "sr-ss-pause-bar" });
        for (const r of RATING_ORDER) {
            if (o.ratingShares[r] <= 0) continue;
            bar.createDiv({ cls: `sr-ss-pause-bar-part sr-ss-dot-${r}` }).setCssProps({
                "flex-grow": String(o.ratingShares[r]),
            });
        }
        const chips = ratings.createDiv({ cls: "sr-ss-pause-chips" });
        for (const r of RATING_ORDER) {
            const chip = chips.createDiv({ cls: "sr-ss-pause-chip" });
            chip.createSpan({ cls: `sr-ss-dot sr-ss-dot-${r}` });
            chip.createSpan({ text: `${ss(RATING_KEYS[r])} ${o.ratings[r]}` });
        }
        this.root.addClass("is-visible");
    }

    hide() {
        this.root.removeClass("is-visible");
    }

    get visible(): boolean {
        return this.root.hasClass("is-visible");
    }

    destroy() {
        this.root.remove();
    }
}
