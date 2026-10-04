import { Setting, SettingGroup } from "obsidian";

import { ca } from "src/card-authoring/card-authoring-i18n";
import {
    CardAuthoringSettings,
    normalizeCardAuthoringSettings,
} from "src/card-authoring/card-authoring-settings";
import { countToday, normalizeCardHistory } from "src/card-authoring/daily-counter";
import { DataManager } from "src/data/data-manager";
import { SettingsManager } from "src/data/settings-manager";
import SRPlugin from "src/main";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import { SettingsPageType } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-types";

/**
 * Settings page for the daily goal of NEW cards (its own block in the deck
 * list, the "New today" counter). The same values as on the card authoring page.
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

    private get caSettings(): CardAuthoringSettings {
        const settings = this.settingsManager.settings;
        settings.cardAuthoring = normalizeCardAuthoringSettings(settings.cardAuthoring);
        return settings.cardAuthoring;
    }

    private async save() {
        await this.settingsManager.save();
        this.plugin.cardAuthoring?.refresh();
        this.renderToday();
    }

    private build() {
        const group = new SettingGroup(this.containerEl).setHeading(ca("GOAL"));
        group.addSetting((setting: Setting) =>
            setting
                .setName(ca("GOAL_IN_DECKS"))
                .setDesc(ca("GOAL_IN_DECKS_DESC"))
                .addToggle((toggle) =>
                    toggle.setValue(this.caSettings.goalInDeckList).onChange(async (value) => {
                        this.caSettings.goalInDeckList = value;
                        await this.save();
                    }),
                ),
        );
        group.addSetting((setting: Setting) => {
            setting.setName(ca("GOAL")).setDesc(ca("GOAL_DESC"));
            this.todayEl = setting.descEl.createDiv();
            setting.addText((text) => {
                text.inputEl.type = "number";
                text.inputEl.min = "1";
                text.inputEl.max = "999";
                text.inputEl.inputMode = "numeric";
                text.setValue(String(this.caSettings.dailyGoal)).onChange((value) => {
                    const n = parseInt(value, 10);
                    if (!Number.isFinite(n) || n < 1) return;
                    this.caSettings.dailyGoal = Math.min(999, n);
                    this.applySettingsUpdate(() => this.save());
                });
                // show the corrected value (e.g. 0 → previous goal, 5000 → 999)
                text.inputEl.addEventListener("blur", () =>
                    text.setValue(String(this.caSettings.dailyGoal)),
                );
            });
        });
        group.addSetting((setting: Setting) =>
            setting
                .setName(ca("SHOW_COUNTER"))
                .setDesc(ca("SHOW_COUNTER_DESC"))
                .addToggle((toggle) =>
                    toggle.setValue(this.caSettings.showDailyCounter).onChange(async (value) => {
                        this.caSettings.showDailyCounter = value;
                        await this.save();
                    }),
                ),
        );
        this.renderToday();
    }

    public render(): void {
        this.renderToday();
    }

    private renderToday() {
        if (!this.todayEl) return;
        try {
            const data = this.plugin.dataManager.data;
            const done = countToday(
                normalizeCardHistory(data.cardHistory),
                new Date(),
                data.settings.startOfDay,
            );
            this.todayEl.setText(ca("COUNTER", { n: `${done}/${this.caSettings.dailyGoal}` }));
        } catch (e) {
            console.error("[Daily goal] could not render", e);
        }
    }
}
