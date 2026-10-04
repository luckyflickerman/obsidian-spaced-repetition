import "src/ui/obsidian-ui-components/modals/addons-modal.css";
import { Modal, setIcon, Setting, SettingGroup } from "obsidian";

import { AddonInfo, ADDONS } from "src/addons/addons";
import { ad, addonDescription, addonName } from "src/addons/addons-i18n";
import type SRPlugin from "src/main";
import { SpeedStreakController } from "src/speed-streak/speed-streak-controller";
import { TtsController } from "src/tts/tts-controller";
import { DailyGoalPage } from "src/ui/obsidian-ui-components/content-container/settings-page/daily-goal-page";
import { HeatmapPage } from "src/ui/obsidian-ui-components/content-container/settings-page/heatmap-page";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import { SpeedStreakPage } from "src/ui/obsidian-ui-components/content-container/settings-page/speed-streak-page";
import { TtsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/tts-page";

/**
 * "Add-ons" window next to the deck list: one switch per add-on and, behind
 * the gear, the same settings page as in Settings → Spaced Repetition.
 */
export class AddonsModal extends Modal {
    private plugin: SRPlugin;
    private onChanged: () => void;
    private page: SettingsPage | null = null;
    private applyDebounceTimer = 0;

    constructor(plugin: SRPlugin, onChanged: () => void) {
        super(plugin.app);
        this.plugin = plugin;
        this.onChanged = onChanged;
    }

    onOpen(): void {
        this.setTitle(ad("TITLE"));
        this.modalEl.addClass("sr-addons-modal");
        this.showList();
    }

    onClose(): void {
        window.clearTimeout(this.applyDebounceTimer);
        this.destroyPage();
        this.contentEl.empty();
        this.onChanged();
    }

    private get settingsManager() {
        return this.plugin.dataManager.settingsManager;
    }

    /** Lets the review view pick up the changes right away. */
    private refreshControllers() {
        SpeedStreakController.active?.refreshSettings();
        TtsController.active?.refreshSettings();
    }

    private destroyPage() {
        this.page?.destroy();
        this.page = null;
    }

    private showList() {
        this.destroyPage();
        this.modalEl.removeClass("is-page");
        this.setTitle(ad("TITLE"));
        this.contentEl.empty();
        this.contentEl.createDiv({ cls: "sr-addons-intro", text: ad("INTRO") });

        const group = new SettingGroup(this.contentEl);
        for (const addon of ADDONS) {
            group.addSetting((setting: Setting) => {
                setting.settingEl.addClass("sr-addons-item");
                const icon = createDiv({ cls: "sr-addons-icon" });
                setIcon(icon, addon.icon);
                setting.nameEl.prepend(icon);
                setting.nameEl.appendText(addonName(addon.id));
                setting.setDesc(addonDescription(addon.id));
                setting.addExtraButton((button) =>
                    button
                        .setIcon("settings")
                        .setTooltip(ad("SETTINGS"))
                        .onClick(() => this.showPage(addon)),
                );
                setting.addToggle((toggle) =>
                    toggle
                        .setValue(addon.isEnabled(this.settingsManager.settings))
                        .onChange(async (value) => {
                            addon.setEnabled(this.settingsManager.settings, value);
                            await this.settingsManager.save();
                            this.refreshControllers();
                            this.onChanged();
                        }),
                );
            });
        }
    }

    private showPage(addon: AddonInfo) {
        this.destroyPage();
        this.modalEl.addClass("is-page");
        this.setTitle(addonName(addon.id));
        this.contentEl.empty();
        const host = this.contentEl.createDiv({ cls: "sr-addons-page" });
        this.page = this.createPage(addon, host);
        this.page.show();
    }

    private createPage(addon: AddonInfo, host: HTMLElement): SettingsPage {
        const args = [
            host,
            this.plugin,
            this.settingsManager,
            this.plugin.dataManager,
            addon.pageType,
            (callback: () => unknown) => {
                window.clearTimeout(this.applyDebounceTimer);
                this.applyDebounceTimer = window.setTimeout(() => {
                    void Promise.resolve(callback()).then(() => this.refreshControllers());
                }, 512);
            },
            // "display": re-render the page (e.g. after "restore default")
            () => this.showPage(addon),
            // "openPage": the page's back button returns to the list
            () => this.showList(),
            () => {},
        ] as const;
        switch (addon.pageType) {
            case "heatmap-page":
                return new HeatmapPage(...args);
            case "daily-goal-page":
                return new DailyGoalPage(...args);
            case "tts-page":
                return new TtsPage(...args);
            case "speed-streak-page":
                return new SpeedStreakPage(...args);
        }
    }
}
