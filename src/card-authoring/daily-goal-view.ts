/**
 * Card authoring — daily goal of NEW cards in the deck list: its own block
 * above the review calendar ("New cards today 4/10" with a bar), independent
 * of the calendar (shown also when the calendar is expanded or switched off).
 * Can be minimized to a small "🎯 4/10" badge on the right (`goalMinimized`).
 */

import "src/card-authoring/daily-goal.css";
import { setIcon } from "obsidian";

import { ca } from "src/card-authoring/card-authoring-i18n";
import { normalizeCardAuthoringSettings } from "src/card-authoring/card-authoring-settings";
import { countToday, goalProgress, normalizeCardHistory } from "src/card-authoring/daily-counter";
import type SRPlugin from "src/main";

/** Open blocks, redrawn when the counter changes (new card, vault synced). */
const views = new Set<DailyGoalView>();

export function refreshDailyGoalViews() {
    for (const view of views) {
        // the deck list was closed (modal / tab): forget it
        if (!view.rootEl.isConnected) views.delete(view);
        else view.render();
    }
}

export class DailyGoalView {
    private plugin: SRPlugin;
    readonly rootEl: HTMLElement;

    constructor(parentEl: HTMLElement, plugin: SRPlugin) {
        this.plugin = plugin;
        this.rootEl = parentEl.createDiv({ cls: "sr-goal" });
        views.add(this);
    }

    render() {
        try {
            const data = this.plugin.dataManager.data;
            const settings = normalizeCardAuthoringSettings(data.settings.cardAuthoring);
            this.rootEl.toggleClass("sr-is-hidden", !settings.goalInDeckList);
            if (!settings.goalInDeckList) return;

            const done = countToday(
                normalizeCardHistory(data.cardHistory),
                new Date(),
                data.settings.startOfDay,
            );
            const goal = goalProgress(done, settings.dailyGoal);

            this.rootEl.empty();
            this.rootEl.toggleClass("is-reached", goal.reached);
            this.rootEl.toggleClass("is-minimized", settings.goalMinimized);

            if (settings.goalMinimized) {
                // A small badge on the right; tap to show the whole block again
                this.rootEl.removeAttribute("aria-label");
                const badge = this.rootEl.createEl("button", {
                    cls: "sr-goal-badge",
                    attr: {
                        "aria-label": ca("GOAL_EXPAND", { done: goal.done, goal: goal.goal }),
                        "aria-expanded": "false",
                    },
                });
                setIcon(badge.createSpan({ cls: "sr-goal-badge-icon" }), "target");
                badge.createSpan({ cls: "sr-goal-value", text: `${goal.done}/${goal.goal}` });
                badge.addEventListener("click", () => this.setMinimized(false));
                return;
            }

            this.rootEl.setAttr(
                "aria-label",
                ca("GOAL_ARIA", { done: goal.done, goal: goal.goal }),
            );

            const head = this.rootEl.createDiv({ cls: "sr-goal-head" });
            head.createSpan({ cls: "sr-goal-title", text: ca("GOAL_TITLE") });
            head.createSpan({ cls: "sr-goal-value", text: `${goal.done}/${goal.goal}` });
            const minimize = head.createEl("button", {
                cls: "sr-goal-minimize clickable-icon",
                attr: { "aria-label": ca("GOAL_MINIMIZE"), "aria-expanded": "true" },
            });
            setIcon(minimize, "chevrons-right");
            minimize.addEventListener("click", () => this.setMinimized(true));

            const bar = this.rootEl.createDiv({ cls: "sr-goal-bar" });
            bar.createDiv({ cls: "sr-goal-fill" }).setCssProps({
                "--sr-goal-fill": `${Math.round(goal.fraction * 100)}%`,
            });

            this.rootEl.createDiv({
                cls: "sr-goal-note",
                text: goal.reached ? ca("GOAL_REACHED") : ca("GOAL_LEFT", { n: goal.left }),
            });
        } catch (e) {
            console.error("[Card authoring] could not render the daily goal", e);
        }
    }

    /** Remembered in the settings, so every open deck list shows the same. */
    private setMinimized(minimized: boolean) {
        const settings = this.plugin.dataManager.data.settings;
        settings.cardAuthoring = {
            ...normalizeCardAuthoringSettings(settings.cardAuthoring),
            goalMinimized: minimized,
        };
        refreshDailyGoalViews();
        // focus stays on the same place after the redraw (keyboard / screen reader)
        this.rootEl
            .querySelector<HTMLElement>(minimized ? ".sr-goal-badge" : ".sr-goal-minimize")
            ?.focus();
        void this.plugin.dataManager.settingsManager.save();
    }
}
