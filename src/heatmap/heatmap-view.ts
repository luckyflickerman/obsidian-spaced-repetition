import "src/heatmap/heatmap.css";
import { setIcon } from "obsidian";

import {
    buildYearGrid,
    computeStats,
    estimateMinutesLeft,
    HEATMAP_COLORS,
    HeatmapSettings,
    normalizeHeatmapSettings,
    normalizeReviewLog,
    recordReview,
    ReviewLog,
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
        bar.createDiv({ cls: "sr-hm-toolbar-spacer" });
    }

    private renderGrid(log: ReviewLog, settings: HeatmapSettings, today: Date) {
        const grid = buildYearGrid(log, this.year, today, settings.weekStartsOnMonday);
        const locale = isPolish() ? "pl-PL" : "en-GB";
        const dateFormat = new Intl.DateTimeFormat(locale, {
            weekday: "short",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
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
                const date = dateFormat.format(cell.date);
                el.setAttr(
                    "aria-label",
                    cell.cards > 0
                        ? hm("CELL", { date, cards: countOf(cell.cards, "cards") })
                        : hm("CELL_NONE", { date }),
                );
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
