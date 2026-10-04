import "src/heatmap/heatmap.css";
import { setIcon } from "obsidian";

import {
    buildMonthGrid,
    buildYearGrid,
    computeStats,
    estimateMinutesLeft,
    goalProgress,
    HEATMAP_COLORS,
    HeatmapCell,
    HeatmapSettings,
    normalizeHeatmapSettings,
    normalizeReviewLog,
    recordReview,
    ReviewLog,
    todayProgress,
    yearRange,
} from "src/heatmap/heatmap-data";
import { countOf, formatNumber, hm } from "src/heatmap/heatmap-i18n";
import type SRPlugin from "src/main";
import { isPolish } from "src/speed-streak/speed-streak-i18n";

// MARK: Plugin-level access (normalized on read)

export function getHeatmapSettings(plugin: SRPlugin): HeatmapSettings {
    const settings = plugin.dataManager.data.settings;
    const normalized = normalizeHeatmapSettings(settings.heatmap);
    settings.heatmap = normalized;
    return normalized;
}

export function getReviewLog(plugin: SRPlugin): ReviewLog {
    const data = plugin.dataManager.data;
    if (!data.reviewLog || data.reviewLog.version !== 1 || !data.reviewLog.days) {
        data.reviewLog = normalizeReviewLog(data.reviewLog);
    }
    return data.reviewLog;
}

let saveTimer: number | null = null;

/** Saves the log soon (several reviews in a row → one write). */
function scheduleSave(plugin: SRPlugin) {
    if (saveTimer !== null) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
        saveTimer = null;
        void saveReviewLog(plugin);
    }, 3000);
}

export async function saveReviewLog(plugin: SRPlugin): Promise<void> {
    if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
    }
    try {
        await plugin.dataManager.pluginDataManager.savePluginData();
    } catch (e) {
        console.error("[Review calendar] could not save the review log", e);
    }
}

/** Saves now if a save is pending (e.g. when the review view closes). */
export async function flushReviewLog(plugin: SRPlugin): Promise<void> {
    if (saveTimer !== null) await saveReviewLog(plugin);
}

/** Call after a card was rated. */
export function recordCardReview(plugin: SRPlugin, ms: number, isNew: boolean) {
    try {
        recordReview(getReviewLog(plugin), new Date(), ms, isNew);
        scheduleSave(plugin);
    } catch (e) {
        console.error("[Review calendar] could not record the review", e);
    }
}

function cellDateFormat(): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat(isPolish() ? "pl-PL" : "en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/** Tooltip of a day square: the date, cards done and, if set, the daily goal. */
function dayTooltip(date: string, cell: HeatmapCell, settings: HeatmapSettings): string {
    if (cell.isFuture) return date;
    const lines = [date, hm("CELL_DONE", { n: cell.cards })];
    if (settings.dailyGoalEnabled) {
        const goal = goalProgress(cell.cards, settings.dailyGoal);
        lines.push(
            hm("CELL_GOAL", { done: goal.done, goal: goal.goal }) + (goal.reached ? " ✓" : ""),
        );
    }
    return lines.join("\n");
}

export interface HeatmapDeckCounts {
    due: number;
    newCards: number;
    total: number;
}

/**
 * The review calendar: statistics, a year of colored day squares and year
 * navigation. The color is chosen in the calendar's settings.
 */
export class HeatmapView {
    private plugin: SRPlugin;
    private rootEl: HTMLElement;
    private year: number;
    private counts: HeatmapDeckCounts | null = null;

    constructor(parentEl: HTMLElement, plugin: SRPlugin) {
        this.plugin = plugin;
        this.rootEl = parentEl.createDiv({ cls: "sr-hm" });
        this.year = new Date().getFullYear();
    }

    /** Re-renders; `counts` are the cards of all decks (optional). */
    render(counts?: HeatmapDeckCounts | null) {
        if (counts !== undefined) this.counts = counts;
        const settings = getHeatmapSettings(this.plugin);
        const log = getReviewLog(this.plugin);
        const today = new Date();
        const range = yearRange(log, today);
        this.year = Math.min(range.max, Math.max(range.min, this.year));

        this.rootEl.empty();
        for (const color of HEATMAP_COLORS) this.rootEl.removeClass(`sr-hm-color-${color}`);
        this.rootEl.addClass(`sr-hm-color-${settings.color}`);

        const stats = computeStats(log, today);
        this.rootEl.toggleClass("sr-hm-mini", settings.minimized);
        if (settings.minimized) {
            this.renderMini(log, settings, today, stats.today.cards);
            return;
        }
        if (settings.showStats) this.renderTopStats(stats);
        this.renderToolbar(range);
        this.renderGrid(log, settings, today);
        if (settings.showStats) this.renderBottomStats(stats);
        if (stats.totalCards === 0)
            this.rootEl.createDiv({ cls: "sr-hm-hint", text: hm("EMPTY_HINT") });
    }

    show(visible: boolean) {
        this.rootEl.toggleClass("sr-is-hidden", !visible);
    }

    private renderTopStats(stats: ReturnType<typeof computeStats>) {
        const top = this.rootEl.createDiv({ cls: "sr-hm-top" });
        const left = top.createDiv({ cls: "sr-hm-top-main" });
        const t = stats.today;
        left.createDiv({
            cls: "sr-hm-today",
            text:
                t.cards > 0
                    ? hm("TODAY_LINE", {
                          cards: countOf(t.cards, "cards"),
                          minutes: formatNumber(t.ms / 60_000, 2),
                          seconds: formatNumber(t.ms / t.cards / 1000, 2),
                      })
                    : hm("TODAY_NONE"),
        });

        if (this.counts) {
            const row = left.createDiv({ cls: "sr-hm-counts" });
            const item = (label: string, value: number, cls: string) => {
                const el = row.createSpan({ cls: "sr-hm-count" });
                el.createSpan({ text: `${label}: ` });
                el.createSpan({ cls: `sr-hm-count-value ${cls}`, text: String(value) });
            };
            item(hm("NEW"), this.counts.newCards, "sr-fg-blue");
            item(hm("DUE"), this.counts.due, "sr-fg-green");
            item(hm("TOTAL"), this.counts.total, "sr-fg-red");
        }

        const times = left.createDiv({ cls: "sr-hm-times" });
        const time = (label: string, ms: number, cls: string) => {
            const el = times.createDiv({ cls: "sr-hm-time" });
            el.createDiv({ text: label });
            el.createDiv({
                cls: `sr-hm-time-value ${cls}`,
                text: hm("HOURS", { n: formatNumber(ms / 3_600_000, 1) }),
            });
        };
        time(hm("TOTAL_TIME"), stats.totalMs, "sr-hm-accent-strong");
        time(hm("PAST_WEEK"), stats.pastWeekMs, "sr-hm-accent");

        const right = top.createDiv({ cls: "sr-hm-top-side" });
        right.createDiv({ text: hm("AVERAGE") });
        right.createDiv({
            text: hm("PER_MINUTE", { n: formatNumber(stats.cardsPerMinute, 1) }),
        });
        if (this.counts && this.counts.due > 0 && stats.secondsPerCard > 0) {
            const minutesLeft = estimateMinutesLeft(stats, this.counts.due);
            right.createDiv({
                cls: "sr-hm-minutes-more",
                text: minutesLeft > 0 ? hm("MINUTES_MORE", { n: minutesLeft }) : hm("MINUTES_LESS"),
            });
        }
    }

    private renderToolbar(range: { min: number; max: number }) {
        const bar = this.rootEl.createDiv({ cls: "sr-hm-toolbar" });
        bar.createDiv({ cls: "sr-hm-toolbar-spacer" });

        const nav = bar.createDiv({ cls: "sr-hm-nav" });
        const navButton = (icon: string, label: string, disabled: boolean, onClick: () => void) => {
            const btn = nav.createEl("button", { cls: "sr-hm-nav-btn clickable-icon" });
            setIcon(btn, icon);
            btn.setAttr("aria-label", label);
            btn.disabled = disabled;
            btn.addEventListener("click", (ev) => {
                ev.preventDefault();
                onClick();
            });
        };
        navButton("chevron-left", hm("PREV_YEAR"), this.year <= range.min, () => {
            this.year--;
            this.render();
        });
        navButton("circle", hm("THIS_YEAR"), this.year === range.max, () => {
            this.year = range.max;
            this.render();
        });
        navButton("chevron-right", hm("NEXT_YEAR"), this.year >= range.max, () => {
            this.year++;
            this.render();
        });
        const side = bar.createDiv({ cls: "sr-hm-toolbar-spacer sr-hm-toolbar-end" });
        const fold = side.createEl("button", { cls: "sr-hm-nav-btn clickable-icon" });
        setIcon(fold, "minimize-2");
        fold.setAttr("aria-label", hm("MINIMIZE"));
        fold.addEventListener("click", (ev) => {
            ev.preventDefault();
            void this.setMinimized(true);
        });
    }

    private async setMinimized(minimized: boolean) {
        getHeatmapSettings(this.plugin).minimized = minimized;
        this.render();
        try {
            await this.plugin.dataManager.settingsManager.save();
        } catch (e) {
            console.error("[Review calendar] could not save", e);
        }
    }

    /**
     * Folded calendar: a ring in the calendar color (share of today's planned
     * cards already done, with the number still due inside) and this month.
     * No text; tap to unfold.
     */
    private renderMini(log: ReviewLog, settings: HeatmapSettings, today: Date, doneToday: number) {
        if (settings.dailyGoalEnabled) this.renderGoal(doneToday, settings.dailyGoal);
        const progress = todayProgress(doneToday, this.counts?.due ?? 0);
        const box = this.rootEl.createEl("button", { cls: "sr-hm-mini-box" });
        box.setAttr("aria-label", `${hm("MINI_LABEL", { n: progress.left })} · ${hm("EXPAND")}`);
        box.addEventListener("click", (ev) => {
            ev.preventDefault();
            void this.setMinimized(false);
        });

        const radius = 26;
        const circumference = 2 * Math.PI * radius;
        const ring = box.createDiv({ cls: "sr-hm-ring" });
        const svg = activeDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 64 64");
        const circle = (cls: string) => {
            const c = activeDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
            c.setAttribute("cx", "32");
            c.setAttribute("cy", "32");
            c.setAttribute("r", String(radius));
            c.classList.add(cls);
            svg.appendChild(c);
            return c;
        };
        circle("sr-hm-ring-track");
        const arc = circle("sr-hm-ring-arc");
        arc.setAttribute("stroke-dasharray", String(circumference));
        arc.setAttribute("stroke-dashoffset", String(circumference * (1 - progress.fraction)));
        ring.appendChild(svg);
        ring.createDiv({ cls: "sr-hm-ring-value", text: String(progress.left) });
        ring.toggleClass("is-done", progress.left === 0 && progress.planned > 0);

        const month = box.createDiv({ cls: "sr-hm-month-grid" });
        const dateFormat = cellDateFormat();
        const weeks = buildMonthGrid(
            log,
            today.getFullYear(),
            today.getMonth(),
            today,
            settings.weekStartsOnMonday,
        );
        for (const week of weeks) {
            for (const cell of week) {
                if (!cell) {
                    month.createDiv({ cls: "sr-hm-mcell is-empty" });
                    continue;
                }
                const el = month.createDiv({ cls: `sr-hm-mcell sr-hm-l${cell.level}` });
                if (cell.isToday) el.addClass("is-today");
                if (cell.isFuture) el.addClass("is-future");
                el.setAttr("aria-label", dayTooltip(dateFormat.format(cell.date), cell, settings));
            }
        }
    }

    /** Daily goal above the minimized calendar: "Cel dzienny 32/50" and a bar. */
    private renderGoal(doneToday: number, dailyGoal: number) {
        const goal = goalProgress(doneToday, dailyGoal);
        const el = this.rootEl.createDiv({ cls: "sr-hm-goal" });
        el.toggleClass("is-reached", goal.reached);
        el.setAttr("aria-label", hm("GOAL_ARIA", { done: goal.done, goal: goal.goal }));
        const head = el.createDiv({ cls: "sr-hm-goal-head" });
        head.createSpan({ cls: "sr-hm-goal-label", text: hm("GOAL_LABEL") });
        head.createSpan({
            cls: "sr-hm-goal-value",
            text: `${goal.done}/${goal.goal}${goal.reached ? " ✓" : ""}`,
        });
        const bar = el.createDiv({ cls: "sr-hm-goal-bar" });
        bar.createDiv({ cls: "sr-hm-goal-fill" }).setCssProps({
            "--sr-hm-goal": `${Math.round(goal.fraction * 100)}%`,
        });
    }

    private renderGrid(log: ReviewLog, settings: HeatmapSettings, today: Date) {
        const grid = buildYearGrid(log, this.year, today, settings.weekStartsOnMonday);
        const locale = isPolish() ? "pl-PL" : "en-GB";
        const dateFormat = cellDateFormat();
        const monthFormat = new Intl.DateTimeFormat(locale, { month: "short" });

        const scroller = this.rootEl.createDiv({ cls: "sr-hm-scroller" });
        const months = scroller.createDiv({ cls: "sr-hm-months" });
        const weeksEl = scroller.createDiv({ cls: "sr-hm-weeks" });

        grid.weeks.forEach((week, index) => {
            const monthLabel = months.createDiv({ cls: "sr-hm-month" });
            const month = grid.monthStarts.indexOf(index);
            if (month >= 0) monthLabel.setText(monthFormat.format(new Date(this.year, month, 1)));

            const col = weeksEl.createDiv({ cls: "sr-hm-week" });
            for (const cell of week) {
                const el = col.createDiv({ cls: `sr-hm-cell sr-hm-l${cell.level}` });
                if (cell.outside) {
                    el.addClass("is-outside");
                    continue;
                }
                if (cell.isFuture) el.addClass("is-future");
                if (cell.isToday) el.addClass("is-today");
                el.setAttr("aria-label", dayTooltip(dateFormat.format(cell.date), cell, settings));
            }
        });
        this.rootEl.createDiv({ cls: "sr-hm-year", text: String(this.year) });

        // Show today (the end of the year) first on narrow screens
        window.requestAnimationFrame(() => {
            scroller.scrollLeft = this.year === today.getFullYear() ? scroller.scrollWidth : 0;
        });
    }

    private renderBottomStats(stats: ReturnType<typeof computeStats>) {
        const bottom = this.rootEl.createDiv({ cls: "sr-hm-bottom" });
        const item = (label: string, value: string, cls = "") => {
            const el = bottom.createSpan({ cls: "sr-hm-bottom-item" });
            el.createSpan({ text: `${label} ` });
            el.createSpan({ cls: `sr-hm-bottom-value ${cls}`, text: value });
        };
        item(
            hm("DAILY_AVERAGE"),
            countOf(Math.round(stats.dailyAverage), "cards"),
            "sr-hm-accent-strong",
        );
        item(hm("DAYS_LEARNED"), `${Math.round(stats.daysLearnedRatio * 100)}%`, "sr-hm-accent");
        item(hm("LONGEST_STREAK"), countOf(stats.longestStreak, "days"));
        item(hm("CURRENT_STREAK"), countOf(stats.currentStreak, "days"));
    }
}
