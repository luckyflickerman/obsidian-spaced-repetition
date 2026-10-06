import "src/ui/obsidian-ui-components/modals/options-modal.css";
import { Modal, SettingGroup } from "obsidian";

import { isAddonPage } from "src/addons/addons";
import { ad } from "src/addons/addons-i18n";
import { addBackgroundThemeGroup } from "src/appearance/background-settings-group";
import type SRPlugin from "src/main";
import {
    addPageLinkSetting,
    createBuiltInPluginsGroup,
    refreshBuiltInPlugins,
} from "src/ui/obsidian-ui-components/built-in-plugins-group";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import {
    createSettingsPage,
    getPageName,
    SettingsPageType,
    SettingsPageTypesArray,
} from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-manager";

/** Pages listed under "Options" (the built-in plugins have their own list). */
export const OPTION_PAGES: SettingsPageType[] = SettingsPageTypesArray.filter(
    (pageType) => pageType !== "main-page" && !isAddonPage(pageType),
);

/**
 * "Options" window next to the deck list, laid out like Obsidian's settings:
 * "Options" (every settings page of the plugin) and "Built-in plugins" (one
 * switch each). A page opens inside the window; its back button returns here.
 */
export class OptionsModal extends Modal {
    private plugin: SRPlugin;
    private onChanged: () => void;
    private page: SettingsPage | null = null;
    private applyDebounceTimer = 0;
    private didReadMultilineEndMarkerWarning = false;

    constructor(plugin: SRPlugin, onChanged: () => void) {
        super(plugin.app);
        this.plugin = plugin;
        this.onChanged = onChanged;
    }

    onOpen(): void {
        this.modalEl.addClass("sr-options-modal");
        this.showList();
    }

    onClose(): void {
        window.clearTimeout(this.applyDebounceTimer);
        this.destroyPage();
        this.contentEl.empty();
        this.onChanged();
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

        const open = (pageType: SettingsPageType) => this.showPage(pageType);
        // background theme first: it changes the review behind this window at once
        addBackgroundThemeGroup(this.contentEl, this.plugin);
        const options = new SettingGroup(this.contentEl).setHeading(ad("OPTIONS"));
        for (const pageType of OPTION_PAGES) addPageLinkSetting(options, pageType, open);

        createBuiltInPluginsGroup(this.contentEl, this.plugin, open, () => this.onChanged());
    }

    private showPage(pageType: SettingsPageType) {
        if (pageType === "main-page") {
            this.showList();
            return;
        }
        this.destroyPage();
        this.modalEl.addClass("is-page");
        this.setTitle(getPageName(pageType));
        this.contentEl.empty();
        const host = this.contentEl.createDiv({ cls: "sr-options-page" });
        this.page = createSettingsPage(pageType, host, {
            plugin: this.plugin,
            uiManager: this.plugin.uiManager,
            settingsManager: this.plugin.dataManager.settingsManager,
            dataManager: this.plugin.dataManager,
            applySettingsUpdate: (callback: () => unknown) => {
                window.clearTimeout(this.applyDebounceTimer);
                this.applyDebounceTimer = window.setTimeout(() => {
                    void Promise.resolve(callback()).then(() => refreshBuiltInPlugins());
                }, 512);
            },
            // "display": re-render the page (e.g. after "restore default")
            display: () => this.showPage(pageType),
            // the page's back button opens "main-page" = back to the list
            openPage: (next: SettingsPageType) => this.showPage(next),
            scrollListener: () => {},
            didReadMultilineEndMarkerWarning: this.didReadMultilineEndMarkerWarning,
            changeMultilineEndMarkerWarningState: (state: boolean) => {
                this.didReadMultilineEndMarkerWarning = state;
                this.showPage(pageType);
            },
        });
        this.page.show();
    }
}
