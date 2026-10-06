/**
 * Background — the settings: the theme picker (a tile per built-in theme with
 * a small preview of its glass and colours) and the sliders. The picker is on
 * the Appearance page and at the top of the "Options" window.
 */

import { Setting, SettingGroup } from "obsidian";

import {
    applyPalette,
    getBackgroundSettings,
    refreshBackgrounds,
} from "src/appearance/background-controller";
import { bg, themeText } from "src/appearance/background-i18n";
import { BACKGROUND_THEMES, BackgroundTheme, NO_THEME } from "src/appearance/background-themes";
import type SRPlugin from "src/main";

function save(plugin: SRPlugin) {
    refreshBackgrounds();
    void plugin.dataManager.settingsManager.save();
}

/** One row with the theme tiles: "No photo" and every built-in theme. */
function addThemePicker(group: SettingGroup, plugin: SRPlugin) {
    group.addSetting((setting: Setting) => {
        setting.setName(bg("THEME")).setDesc(bg("THEME_DESC"));
        setting.settingEl.addClass("usr-bg-theme-setting");
        const tilesEl = setting.settingEl.createDiv({
            cls: "usr-bg-themes",
            attr: { role: "radiogroup", "aria-label": bg("THEME") },
        });
        const tiles: HTMLElement[] = [];

        const addTile = (id: string, theme: BackgroundTheme | null) => {
            const { name, desc } = themeText(id);
            const tile = tilesEl.createEl("button", {
                cls: "usr-bg-theme",
                attr: { type: "button", role: "radio", "data-theme": id, title: desc },
            });
            const view = tile.createDiv({ cls: "usr-bg-theme-view" });
            if (theme) {
                applyPalette(tile, theme.palette);
                view.createEl("img", { attr: { src: theme.photo, alt: "" } }).setCssProps({
                    "object-position": theme.position,
                });
            } else {
                tile.addClass("is-none");
            }
            const glass = view.createDiv({ cls: "usr-bg-theme-glass" });
            glass.createSpan({ cls: "usr-bg-theme-word", text: bg("SAMPLE_WORD") });
            glass.createSpan({ cls: "usr-bg-theme-soft", text: bg("SAMPLE_SOFT") });
            glass.createSpan({ cls: "usr-bg-theme-button", text: bg("SAMPLE_BUTTON") });
            tile.createSpan({ cls: "usr-bg-theme-name", text: name });
            tile.setAttr("aria-label", desc ? `${name}: ${desc}` : name);
            tile.addEventListener("click", () => {
                getBackgroundSettings(plugin).theme = id;
                mark();
                save(plugin);
            });
            tiles.push(tile);
        };

        const mark = () => {
            const current = getBackgroundSettings(plugin).theme;
            for (const tile of tiles) {
                const on = tile.dataset.theme === current;
                tile.toggleClass("is-selected", on);
                tile.setAttr("aria-checked", on ? "true" : "false");
            }
        };

        addTile(NO_THEME, null);
        for (const theme of BACKGROUND_THEMES) addTile(theme.id, theme);
        mark();
    });
}

/** The "Background" group of the Appearance page: theme, sliders, photo credits. */
export function addBackgroundSettings(containerEl: HTMLElement, plugin: SRPlugin) {
    const s = () => getBackgroundSettings(plugin);
    const group = new SettingGroup(containerEl).setHeading(bg("GROUP"));
    addThemePicker(group, plugin);

    const slider = (
        key: "glass" | "dim" | "blur",
        name: string,
        desc: string,
        min: number,
        max: number,
        step: number,
    ) =>
        group.addSetting((setting: Setting) => {
            setting.setName(name);
            if (desc) setting.setDesc(desc);
            setting.addSlider((sl) =>
                sl
                    .setLimits(min, max, step)
                    .setValue(s()[key])
                    .setDynamicTooltip()
                    .onChange((v) => {
                        s()[key] = v;
                        save(plugin);
                    }),
            );
        });
    slider("glass", bg("GLASS"), bg("GLASS_DESC"), 0.3, 0.9, 0.05);
    slider("dim", bg("DIM"), "", 0, 0.6, 0.02);
    slider("blur", bg("BLUR"), "", 0, 40, 1);
    group.addSetting((setting: Setting) => {
        setting.setDesc(bg("CREDIT", { names: BACKGROUND_THEMES.map((t) => t.credit).join(", ") }));
        setting.settingEl.addClass("usr-bg-credit");
    });
}

/** Only the theme picker (top of the "Options" window). */
export function addBackgroundThemeGroup(containerEl: HTMLElement, plugin: SRPlugin) {
    addThemePicker(new SettingGroup(containerEl).setHeading(bg("GROUP")), plugin);
}
