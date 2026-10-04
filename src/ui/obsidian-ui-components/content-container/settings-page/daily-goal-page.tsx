import { Setting, SettingGroup } from "obsidian";

import { DataManager } from "src/data/data-manager";
import { SettingsManager } from "src/data/settings-manager";
import {
    dayKey,
    HeatmapSettings,
    MAX_DAILY_GOAL,
    normalizeDailyGoal,
    normalizeHeatmapSettings,
} from "src/heatmap/heatmap-data";
import { hm } from "src/heatmap/heatmap-i18n";
import { getReviewLog } from "src/heatmap/heatmap-view";
import SRPlugin from "src/main";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import { SettingsPageType } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-types";

/**
 * Settings page for the daily goal (shown above the minimized review calendar).
 */
export class DailyGoalPage extends SettingsPage {
    private todayEl: HTMLElement | null = null;

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

    private get hmSettings(): HeatmapSettings {
        const settings = this.settingsManager.settings;
        settings.heatmap = normalizeHeatmapSettings(settings.heatmap);
        return settings.heatmap;
    }

    private async save() {
        await this.settingsManager.save();
        this.renderToday();
    }

    private build() {
        const group = new SettingGroup(this.containerEl).setHeading(hm("GOAL_LABEL"));
        group.addSetting((setting: Setting) =>
            setting
                .setName(hm("GOAL_ENABLED"))
                .setDesc(hm("GOAL_ENABLED_DESC"))
                .addToggle((toggle) =>
                    toggle.setValue(this.hmSettings.dailyGoalEnabled).onChange(async (value) => {
                        this.hmSettings.dailyGoalEnabled = value;
                        await this.save();
                    }),
                ),
        );
        group.addSetting((setting: Setting) => {
            setting.setName(hm("GOAL_COUNT")).setDesc(hm("GOAL_COUNT_DESC"));
            this.todayEl = setting.descEl.createDiv({ cls: "sr-hm-goal-today" });
            setting.addText((text) => {
                text.inputEl.type = "number";
                text.inputEl.min = "1";
                text.inputEl.max = String(MAX_DAILY_GOAL);
                text.inputEl.step = "1";
                text.inputEl.inputMode = "numeric";
                text.setValue(String(this.hmSettings.dailyGoal)).onChange((value) => {
                    const goal = normalizeDailyGoal(value, -1);
                    if (goal < 0) return;
                    this.hmSettings.dailyGoal = goal;
                    this.applySettingsUpdate(() => this.save());
                });
                // show the corrected value (e.g. 0 → previous goal, 12000 → 9999)
                text.inputEl.addEventListener("blur", () =>
                    text.setValue(String(this.hmSettings.dailyGoal)),
                );
            });
        });
        this.renderToday();
    }

    public render(): void {
        this.renderToday();
    }

    private renderToday() {
        if (!this.todayEl) return;
        try {
            const today = getReviewLog(this.plugin).days[dayKey(new Date())]?.cards ?? 0;
            this.todayEl.setText(
                hm("GOAL_TODAY", { done: today, goal: this.hmSettings.dailyGoal }),
            );
        } catch (e) {
            console.error("[Daily goal] could not render", e);
        }
    }
}
