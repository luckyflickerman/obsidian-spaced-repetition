import { DropdownComponent, Notice, Platform, Setting, SettingGroup } from "obsidian";

import { DataManager } from "src/data/data-manager";
import { SettingsManager } from "src/data/settings-manager";
import SRPlugin from "src/main";
import { SpeedStreakAudio } from "src/speed-streak/speed-streak-audio";
import {
    getSpeedStreakData,
    saveSpeedStreakData,
    SpeedStreakController,
} from "src/speed-streak/speed-streak-controller";
import type { SpeedStreakRating } from "src/speed-streak/speed-streak-engine";
import { isPolish, ss } from "src/speed-streak/speed-streak-i18n";
import {
    formatRunDate,
    rankRuns,
    recentRuns,
    runBadge,
} from "src/speed-streak/speed-streak-records";
import {
    DEFAULT_SPEED_STREAK_SETTINGS,
    normalizeSpeedStreakSettings,
    resolvePerformance,
    SpeedStreakRunRecord,
    SpeedStreakSettings,
    STYLE_DEFAULT_THEME,
} from "src/speed-streak/speed-streak-settings";
import {
    applySpeedStreakTheme,
    getSpeedStreakTheme,
    SPEED_STREAK_THEMES,
    themeDisplayName,
} from "src/speed-streak/speed-streak-themes";
import {
    getSpeedStreakVisual,
    resolveThemeId,
    SPEED_STREAK_VISUALS,
    visualDisplayName,
} from "src/speed-streak/visuals/visual-registry";
import type { SpeedStreakVisual } from "src/speed-streak/visuals/visual-types";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import { SettingsPageType } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-types";

type NumberKey = {
    [K in keyof SpeedStreakSettings]: SpeedStreakSettings[K] extends number ? K : never;
}[keyof SpeedStreakSettings];
type BoolKey = {
    [K in keyof SpeedStreakSettings]: SpeedStreakSettings[K] extends boolean ? K : never;
}[keyof SpeedStreakSettings];

const PREVIEW_RATINGS: SpeedStreakRating[] = [
    "good",
    "good",
    "easy",
    "hard",
    "good",
    "easy",
    "again",
    "good",
];

/**
 * Settings page for the Speed Streak game, grouped as: General, Timers,
 * Time Boost, Focus rules, Display (with a live preview), Records, Feedback,
 * Shortcuts.
 */
export class SpeedStreakPage extends SettingsPage {
    private recordsEl: HTMLElement;
    private audio = new SpeedStreakAudio();
    private resetArmed = false;

    // Live preview of the visual style
    private previewHost: HTMLElement | null = null;
    private previewVisual: SpeedStreakVisual | null = null;
    private previewTimer: number | null = null;
    private previewStreak = 0;
    private previewTrail: SpeedStreakRating[] = [];
    private previewCounts: Record<SpeedStreakRating, number> = {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0,
    };
    private themeSwatchRender: (() => void) | null = null;

    constructor(
        pageContainerEl: HTMLElement,
        plugin: SRPlugin,
        settingsManager: SettingsManager,
        dataManager: DataManager,
        pageType: SettingsPageType,
        applySettingsUpdate: (callback: () => unknown) => void,
        display: () => void,
        openPage: (pageType: SettingsPageType) => void,
        scrollListener: (scrollPosition: number) => void,
    ) {
        super(
            pageContainerEl,
            plugin,
            settingsManager,
            dataManager,
            pageType,
            applySettingsUpdate,
            display,
            openPage,
            scrollListener,
        );
        this.build();
    }

    private get ssSettings(): SpeedStreakSettings {
        const settings = this.settingsManager.settings;
        settings.speedStreak = normalizeSpeedStreakSettings(settings.speedStreak);
        return settings.speedStreak;
    }

    private async save() {
        this.settingsManager.settings.speedStreak = normalizeSpeedStreakSettings(
            this.settingsManager.settings.speedStreak,
        );
        await this.settingsManager.save();
        SpeedStreakController.active?.refreshSettings();
    }

    private addToggle(group: SettingGroup, key: BoolKey, name: string, desc?: string) {
        group.addSetting((setting: Setting) => {
            setting.setName(name);
            if (desc) setting.setDesc(desc);
            setting.addToggle((toggle) =>
                toggle.setValue(this.ssSettings[key]).onChange(async (value) => {
                    this.ssSettings[key] = value;
                    await this.save();
                    if (key === "reducedMotion") this.restartPreview();
                }),
            );
        });
    }

    private addNumber(
        group: SettingGroup,
        key: NumberKey,
        name: string,
        desc?: string,
        step: number = 1,
    ) {
        group.addSetting((setting: Setting) => {
            setting.setName(name);
            if (desc) setting.setDesc(desc);
            setting.addExtraButton((button) =>
                button
                    .setIcon("reset")
                    .setTooltip(ss("RESET_DEFAULT"))
                    .onClick(async () => {
                        this.ssSettings[key] = DEFAULT_SPEED_STREAK_SETTINGS[key];
                        await this.save();
                        this.display();
                    }),
            );
            setting.addText((text) => {
                text.inputEl.type = "number";
                text.inputEl.step = String(step);
                text.inputEl.min = "0";
                text.inputEl.addClass("sr-ss-number-input");
                text.setValue(String(this.ssSettings[key])).onChange((value) => {
                    this.applySettingsUpdate(async () => {
                        const n = parseFloat(value.replace(",", "."));
                        if (!Number.isFinite(n)) return;
                        this.ssSettings[key] = n;
                        await this.save();
                    });
                });
            });
        });
    }

    /** Dropdown bound to a string setting. */
    private addChoice<K extends keyof SpeedStreakSettings>(
        group: SettingGroup,
        key: K,
        name: string,
        options: Record<string, string>,
        desc?: string,
        after?: () => void,
    ) {
        group.addSetting((setting: Setting) => {
            setting.setName(name);
            if (desc) setting.setDesc(desc);
            setting.addDropdown((dropdown: DropdownComponent) =>
                dropdown
                    .addOptions(options)
                    .setValue(String(this.ssSettings[key]))
                    .onChange(async (value) => {
                        (this.ssSettings as unknown as Record<string, unknown>)[key] = value;
                        await this.save();
                        after?.();
                    }),
            );
        });
    }

    private build() {
        const s = () => this.ssSettings;

        // General
        const general = new SettingGroup(this.containerEl).setHeading(ss("G_GENERAL"));
        this.addToggle(general, "enabled", ss("ENABLED"), ss("ENABLED_DESC"));
        this.addChoice(
            general,
            "gameplayMode",
            ss("MODE"),
            {
                // eslint-disable-next-line camelcase -- stored setting value
                time_boost: ss("MODE_BOOST"),
                points: ss("MODE_POINTS"),
            },
            ss("MODE_DESC"),
        );

        // Timers
        const timers = new SettingGroup(this.containerEl).setHeading(ss("G_TIMERS"));
        this.addNumber(timers, "questionSeconds", ss("Q_SECONDS"), ss("Q_SECONDS_DESC"), 0.5);
        this.addNumber(timers, "answerSeconds", ss("A_SECONDS"), ss("A_SECONDS_DESC"), 0.5);
        this.addToggle(timers, "freeFirstCard", ss("FREE_FIRST"), ss("FREE_FIRST_DESC"));
        this.addToggle(
            timers,
            "answerTimeoutBreaksStreak",
            ss("ANSWER_BREAKS"),
            ss("ANSWER_BREAKS_DESC"),
        );
        this.addToggle(timers, "againBreaksStreak", ss("AGAIN_BREAKS"), ss("AGAIN_BREAKS_DESC"));
        timers.addSetting((setting: Setting) => {
            setting.setName(ss("RULES")).setDesc(ss("RULES_DESC"));
            setting.addTextArea((text) => {
                text.inputEl.rows = 4;
                text.inputEl.addClass("sr-ss-rules-input");
                text.setPlaceholder("#anatomy = 30/15\n#vocab = untimed");
                text.setValue(s().specialTimerRules).onChange((value) => {
                    this.applySettingsUpdate(async () => {
                        s().specialTimerRules = value;
                        await this.save();
                    });
                });
            });
        });

        // Time Boost
        const boost = new SettingGroup(this.containerEl).setHeading(ss("G_BOOST"));
        this.addNumber(boost, "boostSeconds", ss("BOOST_SECONDS"), undefined, 0.5);
        this.addNumber(boost, "maxBoostCharges", ss("MAX_BOOSTS"));
        this.addNumber(boost, "startingBoostCharges", ss("START_BOOSTS"));
        this.addNumber(boost, "cardsPerBoostCharge", ss("CARDS_PER_BOOST"));

        // Focus
        const focus = new SettingGroup(this.containerEl).setHeading(ss("G_FOCUS"));
        this.addToggle(focus, "noPauseMode", ss("NO_PAUSE"), ss("NO_PAUSE_DESC"));
        this.addToggle(focus, "autoPauseOnLeave", ss("AUTO_PAUSE"), ss("AUTO_PAUSE_DESC"));

        // Display
        const display = new SettingGroup(this.containerEl).setHeading(ss("G_DISPLAY"));
        const polish = isPolish();
        display.addSetting((setting: Setting) => {
            setting.setName(ss("VISUAL")).setDesc(ss("VISUAL_DESC"));
            this.previewHost = setting.descEl.createDiv({ cls: "sr-ss-visual-preview" });
            setting.addDropdown((dropdown) => {
                for (const visual of SPEED_STREAK_VISUALS) {
                    dropdown.addOption(visual.id, visualDisplayName(visual, polish));
                }
                dropdown.setValue(s().visualStyle).onChange(async (value) => {
                    s().visualStyle = getSpeedStreakVisual(value).id;
                    await this.save();
                    this.themeSwatchRender?.();
                    this.restartPreview();
                });
            });
        });
        this.addChoice(
            display,
            "layout",
            ss("LAYOUT"),
            {
                auto: ss("LAYOUT_AUTO"),
                compact: ss("LAYOUT_COMPACT"),
                "side-left": ss("LAYOUT_LEFT"),
                "side-right": ss("LAYOUT_RIGHT"),
            },
            ss("LAYOUT_DESC"),
        );
        display.addSetting((setting: Setting) => {
            setting.setName(ss("THEME")).setDesc(ss("THEME_DESC"));
            const swatches = setting.descEl.createDiv({ cls: "sr-ss-theme-preview" });
            const renderSwatches = () => {
                swatches.empty();
                applySpeedStreakTheme(swatches, this.previewTheme());
                const panel = swatches.createDiv({ cls: "sr-ss-swatch-panel" });
                panel.createSpan({ text: "⚡ 12" });
                for (const v of [
                    "--ss-good",
                    "--ss-hard",
                    "--ss-again",
                    "--ss-easy",
                    "--ss-boost",
                ]) {
                    panel
                        .createSpan({ cls: "sr-ss-swatch" })
                        .setCssProps({ background: `var(${v})` });
                }
            };
            this.themeSwatchRender = renderSwatches;
            renderSwatches();
            setting.addDropdown((dropdown) => {
                dropdown.addOption(STYLE_DEFAULT_THEME, ss("THEME_AUTO"));
                for (const theme of SPEED_STREAK_THEMES) {
                    dropdown.addOption(theme.id, themeDisplayName(theme, polish));
                }
                dropdown.setValue(s().theme).onChange(async (value) => {
                    s().theme = value;
                    renderSwatches();
                    await this.save();
                    this.restartPreview();
                });
            });
        });
        this.addChoice(
            display,
            "performance",
            ss("PERFORMANCE"),
            {
                auto: ss("PERF_AUTO"),
                full: ss("PERF_FULL"),
                light: ss("PERF_LIGHT"),
                minimal: ss("PERF_MINIMAL"),
            },
            ss("PERFORMANCE_DESC"),
            () => this.restartPreview(),
        );
        this.addToggle(display, "reducedMotion", ss("REDUCED_MOTION"), ss("REDUCED_MOTION_DESC"));
        this.addToggle(display, "showRatingTrail", ss("TRAIL"), ss("TRAIL_DESC"));

        // Records
        const records = new SettingGroup(this.containerEl).setHeading(ss("G_RECORDS"));
        this.addChoice(
            records,
            "recordsView",
            ss("RECORDS_VIEW"),
            { record: ss("VIEW_RECORD"), bar: ss("VIEW_BAR"), top5: ss("VIEW_TOP5") },
            ss("RECORDS_VIEW_DESC"),
        );
        this.addChoice(records, "recordScope", ss("RECORD_SCOPE"), {
            // eslint-disable-next-line camelcase -- stored setting value
            all_time: ss("SCOPE_ALL"),
            today: ss("SCOPE_TODAY"),
        });
        this.addChoice(records, "recordsList", ss("RECORDS_LIST"), {
            ranking: ss("LIST_RANKING"),
            recent: ss("LIST_RECENT"),
        });
        this.addChoice(records, "recordsFilter", ss("RECORDS_FILTER"), {
            all: ss("FILTER_ALL"),
            pure: ss("FILTER_PURE"),
        });
        this.addToggle(records, "celebrateNewBest", ss("CELEBRATE"), ss("CELEBRATE_DESC"));
        records.addSetting((setting: Setting) => {
            setting.settingEl.addClass("sr-ss-records-setting");
            this.recordsEl = setting.descEl;
            setting.addButton((button) =>
                button
                    .setButtonText(ss("RESET_RECORDS"))
                    .setWarning()
                    .onClick(async () => {
                        if (!this.resetArmed) {
                            this.resetArmed = true;
                            button.setButtonText(ss("RESET_RECORDS_CONFIRM"));
                            window.setTimeout(() => {
                                this.resetArmed = false;
                                button.setButtonText(ss("RESET_RECORDS"));
                            }, 4000);
                            return;
                        }
                        this.resetArmed = false;
                        button.setButtonText(ss("RESET_RECORDS"));
                        const data = getSpeedStreakData(this.plugin);
                        data.runs = [];
                        data.totals = {
                            cardsAnswered: 0,
                            timeouts: 0,
                            boostsUsed: 0,
                            activeMs: 0,
                            sessions: 0,
                        };
                        await saveSpeedStreakData(this.plugin);
                        new Notice(ss("RESET_DONE"));
                        this.renderRecords();
                    }),
            );
        });

        // Feedback
        const feedback = new SettingGroup(this.containerEl).setHeading(ss("G_FEEDBACK"));
        this.addToggle(feedback, "soundEnabled", ss("SOUND"), ss("SOUND_DESC"));
        feedback.addSetting((setting: Setting) =>
            setting
                .setName(ss("VOLUME"))
                .addSlider((slider) =>
                    slider
                        .setLimits(0, 100, 5)
                        .setValue(s().soundVolume)
                        .setDynamicTooltip()
                        .onChange((value) => {
                            this.applySettingsUpdate(async () => {
                                s().soundVolume = value;
                                await this.save();
                            });
                        }),
                )
                .addButton((button) =>
                    button.setButtonText(ss("TEST_SOUND")).onClick(() => {
                        this.audio.volume = s().soundVolume / 100;
                        this.audio.play("good", true);
                        window.setTimeout(() => this.audio.play("boost", true), 250);
                        window.setTimeout(() => this.audio.play("new-best", true), 650);
                    }),
                ),
        );
        this.addNumber(
            feedback,
            "countdownWarningSeconds",
            ss("WARNING_SECONDS"),
            ss("WARNING_SECONDS_DESC"),
        );
        this.addToggle(feedback, "countdownSound", ss("COUNTDOWN_SOUND"));
        this.addToggle(feedback, "vibrationEnabled", ss("VIBRATION"));
        this.addToggle(feedback, "showSessionSummary", ss("SUMMARY"), ss("SUMMARY_DESC"));

        // Shortcuts
        const keys = new SettingGroup(this.containerEl).setHeading(ss("G_SHORTCUTS"));
        for (const [key, name] of [
            ["pauseHotkey", ss("PAUSE_KEY")],
            ["boostHotkey", ss("BOOST_KEY")],
        ] as const) {
            keys.addSetting((setting: Setting) =>
                setting
                    .setName(name)
                    .setDesc(ss("KEYS_DESC"))
                    .addText((text) => {
                        text.inputEl.maxLength = 1;
                        text.inputEl.addClass("sr-ss-key-input");
                        text.setValue(s()[key].toUpperCase()).onChange((value) => {
                            this.applySettingsUpdate(async () => {
                                s()[key] = value.trim().slice(0, 1).toLowerCase();
                                await this.save();
                            });
                        });
                    }),
            );
        }

        this.renderRecords();
    }

    public render(): void {
        this.renderRecords();
        this.restartPreview();
    }

    public hide(): void {
        this.stopPreview();
        super.hide();
    }

    public destroy(): void {
        this.stopPreview();
        this.audio.dispose();
        super.destroy();
    }

    // MARK: Live preview

    private previewTheme() {
        const s = this.ssSettings;
        return getSpeedStreakTheme(resolveThemeId(s.theme, s.visualStyle));
    }

    private stopPreview() {
        if (this.previewTimer !== null) window.clearInterval(this.previewTimer);
        this.previewTimer = null;
        this.previewVisual?.destroy();
        this.previewVisual = null;
    }

    /** A small animated scene: a streak that grows, with a Boost and a timeout now and then. */
    private restartPreview() {
        this.stopPreview();
        const host = this.previewHost;
        if (!host || this.pageContainerEl.hasClass("sr-is-hidden")) return;
        const s = this.ssSettings;
        applySpeedStreakTheme(host, this.previewTheme());
        const visual = getSpeedStreakVisual(s.visualStyle).create();
        let reducedMotion = s.reducedMotion;
        try {
            reducedMotion ||= window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        } catch {
            /* ignore */
        }
        visual.mount(host, {
            performance: resolvePerformance(s.performance, Platform.isMobile),
            reducedMotion,
            size: "large",
        });
        this.previewVisual = visual;
        this.previewStreak = 23;
        this.previewCounts = { again: 1, hard: 4, good: 12, easy: 6 };
        this.previewTrail = Array.from(
            { length: 23 },
            (_, i) => PREVIEW_RATINGS[i % PREVIEW_RATINGS.length],
        );
        const push = () =>
            visual.update({
                streak: this.previewStreak,
                ratingTrail: this.previewTrail,
                streakRatings: { ...this.previewCounts },
                fraction: 0.7,
                phase: "question",
                paused: false,
                timedOut: false,
                isNewBest: false,
            });
        push();
        let tick = 0;
        this.previewTimer = window.setInterval(() => {
            tick++;
            if (tick % 14 === 0) {
                visual.onEvent({ type: "timeout" });
                this.previewStreak = 0;
                this.previewTrail = [];
                this.previewCounts = { again: 0, hard: 0, good: 0, easy: 0 };
            } else {
                const rating = PREVIEW_RATINGS[tick % PREVIEW_RATINGS.length];
                this.previewStreak++;
                this.previewCounts[rating]++;
                this.previewTrail = [...this.previewTrail, rating].slice(-40);
                visual.onEvent({ type: "rate", rating });
                if (tick % 9 === 0) visual.onEvent({ type: "boost" });
            }
            push();
        }, 1300);
    }

    // MARK: Records list

    private renderRecords() {
        if (!this.recordsEl) return;
        this.recordsEl.empty();
        let data;
        try {
            data = getSpeedStreakData(this.plugin);
        } catch {
            return;
        }
        const t = data.totals;
        this.recordsEl.createDiv({
            text: ss("TOTALS", {
                cards: t.cardsAnswered,
                sessions: t.sessions,
                timeouts: t.timeouts,
                boosts: t.boostsUsed,
                hours: (t.activeMs / 3_600_000).toFixed(1),
            }),
        });
        const runs = data.runs.filter((r) => r.streak > 0);
        if (runs.length === 0) {
            this.recordsEl.createDiv({ text: ss("RECORDS_EMPTY") });
            return;
        }
        const now = Date.now();
        const polish = isPolish();
        const grid = this.recordsEl.createDiv({ cls: "sr-ss-records" });
        const renderList = (title: string, list: SpeedStreakRunRecord[]) => {
            const col = grid.createDiv();
            col.createEl("h4", { text: title });
            const ol = col.createEl("ol");
            for (const run of list) {
                const li = ol.createEl("li");
                li.createEl("strong", { text: `${run.streak}` });
                const secs = run.cards > 0 ? (run.activeMs / run.cards / 1000).toFixed(1) : "-";
                li.createSpan({
                    cls: "sr-ss-run-meta",
                    text: `  ${formatRunDate(run.endedAt, now, polish)} · ${secs}s/card${run.deck ? " · " + run.deck : ""}`,
                });
                const badge = runBadge(run);
                li.createSpan({
                    cls: `sr-ss-pure-badge ${badge === "pure" ? "" : "is-breaks"}`,
                    text: badge === "pure" ? ss("PURE_BADGE") : ss("BREAKS_BADGE"),
                });
            }
        };
        renderList(ss("TOP_RUNS"), rankRuns(runs, 5));
        renderList(ss("RECENT_RUNS"), recentRuns(runs, 5));
    }
}
