import { Notice, Setting, SettingGroup } from "obsidian";

import { DataManager } from "src/data/data-manager";
import { SettingsManager } from "src/data/settings-manager";
import SRPlugin from "src/main";
import { SpeedStreakAudio } from "src/speed-streak/speed-streak-audio";
import {
    getSpeedStreakData,
    saveSpeedStreakData,
    SpeedStreakController,
} from "src/speed-streak/speed-streak-controller";
import { isPolish, ss } from "src/speed-streak/speed-streak-i18n";
import {
    DEFAULT_SPEED_STREAK_SETTINGS,
    normalizeSpeedStreakSettings,
    SpeedStreakRunRecord,
    SpeedStreakSettings,
    topRuns,
} from "src/speed-streak/speed-streak-settings";
import {
    applySpeedStreakTheme,
    getSpeedStreakTheme,
    SPEED_STREAK_THEMES,
    themeDisplayName,
} from "src/speed-streak/speed-streak-themes";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import { SettingsPageType } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-manager";

type NumberKey = {
    [K in keyof SpeedStreakSettings]: SpeedStreakSettings[K] extends number ? K : never;
}[keyof SpeedStreakSettings];
type BoolKey = {
    [K in keyof SpeedStreakSettings]: SpeedStreakSettings[K] extends boolean ? K : never;
}[keyof SpeedStreakSettings];

/**
 * Settings page for the Speed Streak game.
 */
export class SpeedStreakPage extends SettingsPage {
    private recordsEl: HTMLElement;
    private audio = new SpeedStreakAudio();
    private resetArmed = false;

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

    private build() {
        const s = () => this.ssSettings;

        // General
        const general = new SettingGroup(this.containerEl).setHeading(ss("G_GENERAL"));
        this.addToggle(general, "enabled", ss("ENABLED"), ss("ENABLED_DESC"));
        general.addSetting((setting: Setting) =>
            setting
                .setName(ss("MODE"))
                .setDesc(ss("MODE_DESC"))
                .addDropdown((dropdown) =>
                    dropdown
                        .addOptions({
                            // eslint-disable-next-line camelcase -- stored setting value
                            time_boost: ss("MODE_BOOST"),
                            points: ss("MODE_POINTS"),
                        })
                        .setValue(s().gameplayMode)
                        .onChange(async (value) => {
                            s().gameplayMode = value === "points" ? "points" : "time_boost";
                            await this.save();
                        }),
                ),
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

        // Feedback
        const feedback = new SettingGroup(this.containerEl).setHeading(ss("G_FEEDBACK"));
        this.addNumber(
            feedback,
            "countdownWarningSeconds",
            ss("WARNING_SECONDS"),
            ss("WARNING_SECONDS_DESC"),
        );
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
                        window.setTimeout(() => this.audio.play("timeout", true), 650);
                    }),
                ),
        );
        this.addToggle(feedback, "countdownSound", ss("COUNTDOWN_SOUND"));
        this.addToggle(feedback, "vibrationEnabled", ss("VIBRATION"));

        // Display
        const display = new SettingGroup(this.containerEl).setHeading(ss("G_DISPLAY"));
        display.addSetting((setting: Setting) => {
            setting.setName(ss("THEME")).setDesc(ss("THEME_DESC"));
            const preview = setting.descEl.createDiv({ cls: "sr-ss-theme-preview" });
            const renderPreview = () => {
                preview.empty();
                applySpeedStreakTheme(preview, getSpeedStreakTheme(s().theme));
                const panel = preview.createDiv({ cls: "sr-ss-swatch-panel" });
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
            renderPreview();
            setting.addDropdown((dropdown) => {
                const polish = isPolish();
                for (const theme of SPEED_STREAK_THEMES) {
                    dropdown.addOption(theme.id, themeDisplayName(theme, polish));
                }
                dropdown.setValue(s().theme).onChange(async (value) => {
                    s().theme = value;
                    renderPreview();
                    await this.save();
                });
            });
        });
        display.addSetting((setting: Setting) =>
            setting.setName(ss("HUD_POSITION")).addDropdown((dropdown) =>
                dropdown
                    .addOptions({ top: ss("HUD_TOP"), bottom: ss("HUD_BOTTOM") })
                    .setValue(s().hudPosition)
                    .onChange(async (value) => {
                        s().hudPosition = value === "bottom" ? "bottom" : "top";
                        await this.save();
                    }),
            ),
        );
        display.addSetting((setting: Setting) =>
            setting.setName(ss("RECORD_DISPLAY")).addDropdown((dropdown) =>
                dropdown
                    .addOptions({
                        both: ss("RECORD_BOTH"),
                        // eslint-disable-next-line camelcase -- stored setting value
                        all_time: ss("RECORD_ALL"),
                        today: ss("RECORD_TODAY"),
                        none: ss("RECORD_NONE"),
                    })
                    .setValue(s().recordDisplay)
                    .onChange(async (value) => {
                        s().recordDisplay = value as SpeedStreakSettings["recordDisplay"];
                        await this.save();
                    }),
            ),
        );
        this.addToggle(display, "showRatingTrail", ss("TRAIL"), ss("TRAIL_DESC"));
        this.addToggle(display, "showSessionSummary", ss("SUMMARY"), ss("SUMMARY_DESC"));
        this.addToggle(display, "reducedMotion", ss("REDUCED_MOTION"));

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

        // Records
        const records = new SettingGroup(this.containerEl).setHeading(ss("G_RECORDS"));
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
        this.renderRecords();
    }

    public render(): void {
        this.renderRecords();
    }

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
        if (data.runs.length === 0) {
            this.recordsEl.createDiv({ text: ss("RECORDS_EMPTY") });
            return;
        }
        const grid = this.recordsEl.createDiv({ cls: "sr-ss-records" });
        const renderList = (title: string, runs: SpeedStreakRunRecord[]) => {
            const col = grid.createDiv();
            col.createEl("h4", { text: title });
            const ol = col.createEl("ol");
            for (const run of runs) {
                const li = ol.createEl("li");
                li.createEl("strong", { text: `${run.streak}` });
                const secs = run.cards > 0 ? (run.activeMs / run.cards / 1000).toFixed(1) : "-";
                li.createSpan({
                    cls: "sr-ss-run-meta",
                    text: `  ${run.day} · ${secs}s/card${run.deck ? " · " + run.deck : ""}`,
                });
                if (run.pure) li.createSpan({ cls: "sr-ss-pure-badge", text: ss("PURE") });
            }
        };
        renderList(ss("TOP_RUNS"), topRuns(data.runs, 5));
        renderList(
            ss("RECENT_RUNS"),
            [...data.runs]
                .filter((r) => r.streak > 0)
                .slice(-5)
                .reverse(),
        );
    }
}
