import { Notice, Setting, SettingGroup } from "obsidian";

import { DataManager } from "src/data/data-manager";
import { SettingsManager } from "src/data/settings-manager";
import {
    computeStats,
    createDefaultReviewLog,
    HEATMAP_COLORS,
    HeatmapColor,
    HeatmapSettings,
    normalizeHeatmapSettings,
} from "src/heatmap/heatmap-data";
import { formatNumber, hm } from "src/heatmap/heatmap-i18n";
import { getReviewLog, HeatmapView, saveReviewLog } from "src/heatmap/heatmap-view";
import SRPlugin from "src/main";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import { SettingsPageType } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-types";

type BoolKey = {
    [K in keyof HeatmapSettings]: HeatmapSettings[K] extends boolean ? K : never;
}[keyof HeatmapSettings];

const COLOR_LABELS: Record<HeatmapColor, () => string> = {
    green: () => hm("COLOR_GREEN"),
    blue: () => hm("COLOR_BLUE"),
    red: () => hm("COLOR_RED"),
};

/**
 * Settings page for the review calendar (heatmap).
 */
export class HeatmapPage extends SettingsPage {
    private preview: HeatmapView;
    private summaryEl: HTMLElement;
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

    private get hmSettings(): HeatmapSettings {
        const settings = this.settingsManager.settings;
        settings.heatmap = normalizeHeatmapSettings(settings.heatmap);
        return settings.heatmap;
    }

    private async save() {
        this.settingsManager.settings.heatmap = normalizeHeatmapSettings(
            this.settingsManager.settings.heatmap,
        );
        await this.settingsManager.save();
        this.renderPreview();
    }

    private addToggle(group: SettingGroup, key: BoolKey, name: string, desc?: string) {
        group.addSetting((setting: Setting) => {
            setting.setName(name);
            if (desc) setting.setDesc(desc);
            setting.addToggle((toggle) =>
                toggle.setValue(this.hmSettings[key]).onChange(async (value) => {
                    this.hmSettings[key] = value;
                    await this.save();
                }),
            );
        });
    }

    private build() {
        const general = new SettingGroup(this.containerEl).setHeading(hm("G_GENERAL"));
        this.addToggle(general, "showInDeckList", hm("SHOW"), hm("SHOW_DESC"));
        general.addSetting((setting: Setting) =>
            setting
                .setName(hm("COLOR"))
                .setDesc(hm("COLOR_DESC"))
                .addDropdown((dropdown) => {
                    for (const color of HEATMAP_COLORS) {
                        dropdown.addOption(color, COLOR_LABELS[color]());
                    }
                    dropdown.setValue(this.hmSettings.color).onChange(async (value) => {
                        this.hmSettings.color = value as HeatmapColor;
                        await this.save();
                    });
                }),
        );
        this.addToggle(general, "minimized", hm("MINIMIZED"), hm("MINIMIZED_DESC"));
        this.addToggle(general, "showStats", hm("STATS"), hm("STATS_DESC"));
        this.addToggle(general, "weekStartsOnMonday", hm("MONDAY"));

        // Preview (the same calendar as below the deck list)
        this.preview = new HeatmapView(this.containerEl, this.plugin);

        const history = new SettingGroup(this.containerEl).setHeading(hm("G_HISTORY"));
        history.addSetting((setting: Setting) => {
            setting.setDesc(hm("HISTORY_DESC"));
            this.summaryEl = setting.descEl.createDiv();
            setting.addButton((button) =>
                button
                    .setButtonText(hm("RESET"))
                    .setWarning()
                    .onClick(async () => {
                        if (!this.resetArmed) {
                            this.resetArmed = true;
                            button.setButtonText(hm("RESET_CONFIRM"));
                            window.setTimeout(() => {
                                this.resetArmed = false;
                                button.setButtonText(hm("RESET"));
                            }, 4000);
                            return;
                        }
                        this.resetArmed = false;
                        button.setButtonText(hm("RESET"));
                        this.plugin.dataManager.data.reviewLog = createDefaultReviewLog();
                        await saveReviewLog(this.plugin);
                        new Notice(hm("RESET_DONE"));
                        this.renderPreview();
                    }),
            );
        });
        this.renderPreview();
    }

    public render(): void {
        this.renderPreview();
    }

    private renderPreview() {
        try {
            this.preview?.render(null);
            if (this.summaryEl) {
                const stats = computeStats(getReviewLog(this.plugin), new Date());
                this.summaryEl.setText(
                    hm("HISTORY_SUMMARY", {
                        days: stats.daysLearned,
                        cards: stats.totalCards,
                        hours: formatNumber(stats.totalMs / 3_600_000, 1),
                    }),
                );
            }
        } catch (e) {
            console.error("[Review calendar] could not render the preview", e);
        }
    }
}
