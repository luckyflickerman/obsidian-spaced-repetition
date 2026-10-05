/**
 * The two lists shared by the Options window (next to the deck list) and the
 * main Settings page, laid out like Obsidian's own settings:
 * - "Options": one row per settings page, tap to open it,
 * - "Built-in plugins": one row per add-on with its switch and a gear.
 */

import "src/ui/obsidian-ui-components/built-in-plugins-group.css";
import { setIcon, Setting, SettingGroup, ToggleComponent } from "obsidian";

import { AddonInfo, ADDONS } from "src/addons/addons";
import { ad, addonDescription, addonName } from "src/addons/addons-i18n";
import type SRPlugin from "src/main";
import { SpeedStreakController } from "src/speed-streak/speed-streak-controller";
import { TtsController } from "src/tts/tts-controller";
import {
    getPageIcon,
    getPageName,
    SettingsPageType,
} from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-types";

/** A row that opens a settings page (icon, name, chevron; the whole row is clickable). */
export function addPageLinkSetting(
    group: SettingGroup,
    pageType: SettingsPageType,
    openPage: (pageType: SettingsPageType) => void,
) {
    group.addSetting((setting: Setting) => {
        setting.setName(getPageName(pageType)).addButton((button) => {
            button
                .setIcon("chevron-right")
                .setTooltip(getPageName(pageType))
                .onClick((e) => {
                    e.stopPropagation();
                    openPage(pageType);
                });
            button.buttonEl.addClass("clickable-icon");
        });
        const iconEl = createDiv({ cls: "sr-settings-page-title-icon" });
        setIcon(iconEl, getPageIcon(pageType));
        setting.nameEl.prepend(iconEl);
        setting.nameEl.addClass("sr-settings-page-title");
        // mod-navigable: Obsidian keeps such rows on one line also on phones
        setting.settingEl.addClasses([
            "sr-settings-page-title-setting",
            "sr-page-link",
            "mod-navigable",
        ]);
        setting.settingEl.addEventListener("click", () => openPage(pageType));
    });
}

/** Lets an open review pick up a switched plugin right away. */
export function refreshBuiltInPlugins() {
    SpeedStreakController.active?.refreshSettings();
    TtsController.active?.refreshSettings();
}

/**
 * "Built-in plugins": switch on/off, gear = the plugin's settings page.
 * Returns a function that re-reads the switches (a plugin can also be switched
 * on its own settings page).
 */
export function createBuiltInPluginsGroup(
    containerEl: HTMLElement,
    plugin: SRPlugin,
    openPage: (pageType: SettingsPageType) => void,
    onChanged: () => void = () => {},
): () => void {
    const settingsManager = plugin.dataManager.settingsManager;
    const group = new SettingGroup(containerEl).setHeading(ad("PLUGINS"));
    const toggles: [AddonInfo, ToggleComponent][] = [];
    for (const addon of ADDONS) {
        group.addSetting((setting: Setting) => {
            // mod-toggle: Obsidian keeps the switch next to the name also on phones
            setting.settingEl.addClasses(["sr-plugin-item", "mod-toggle"]);
            const icon = createDiv({ cls: "sr-plugin-icon" });
            setIcon(icon, addon.icon);
            setting.nameEl.prepend(icon);
            setting.nameEl.appendText(addonName(addon.id));
            setting.setDesc(addonDescription(addon.id));
            setting.addExtraButton((button) => {
                button
                    .setIcon("settings")
                    .setTooltip(`${ad("SETTINGS")}: ${addonName(addon.id)}`)
                    .onClick(() => openPage(addon.pageType));
            });
            setting.addToggle((toggle) => {
                toggles.push([addon, toggle]);
                toggle
                    .setValue(addon.isEnabled(settingsManager.settings))
                    .onChange(async (value) => {
                        if (addon.isEnabled(settingsManager.settings) === value) return;
                        addon.setEnabled(settingsManager.settings, value);
                        await settingsManager.save();
                        refreshBuiltInPlugins();
                        onChanged();
                    });
            });
            // screen readers: the switch is named after the plugin
            setting.controlEl
                .querySelector("input[type=checkbox]")
                ?.setAttribute("aria-label", addonName(addon.id));
        });
    }
    return () => {
        for (const [addon, toggle] of toggles) {
            toggle.setValue(addon.isEnabled(settingsManager.settings));
        }
    };
}
