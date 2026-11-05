/**
 * Background — the settings: the theme picker ("Upload your image" / your photo, then a tile
 * per built-in theme: its photo and its name; "No photo" as a button) and the sliders. The picker is on
 * the Appearance page and at the top of the "Options" window.
 */

import { Notice, setIcon, Setting, SettingGroup, TFile } from "obsidian";

import {
    applyPalette,
    customTheme,
    getBackgroundSettings,
    refreshBackgrounds,
} from "src/appearance/background-controller";
import { bg, themeText } from "src/appearance/background-i18n";
import {
    BACKGROUND_THEMES,
    CUSTOM_PHOTO_FOLDER,
    CUSTOM_THEME,
    customPhotoName,
    NO_THEME,
} from "src/appearance/background-themes";
import type SRPlugin from "src/main";
import { pickImageFile, prepareBackgroundPhoto } from "src/utils/image-files";

function save(plugin: SRPlugin) {
    refreshBackgrounds();
    void plugin.dataManager.settingsManager.save();
}

/** Saves the picked photo in the vault and switches to it (the colours come from the photo). */
async function uploadPhoto(plugin: SRPlugin, blob: Blob): Promise<boolean> {
    const notice = new Notice(bg("UPLOADING"), 0);
    try {
        const photo = await prepareBackgroundPhoto(blob);
        if (!photo) {
            new Notice(bg("UPLOAD_FAILED"));
            return false;
        }
        const vault = plugin.app.vault;
        if (!vault.getAbstractFileByPath(CUSTOM_PHOTO_FOLDER)) {
            await vault.createFolder(CUSTOM_PHOTO_FOLDER);
        }
        const path = `${CUSTOM_PHOTO_FOLDER}/${customPhotoName(new Date())}`;
        await vault.createBinary(path, photo.data);

        const s = getBackgroundSettings(plugin);
        const old = s.customPhoto;
        s.customPhoto = path;
        s.customHues = photo.hues;
        s.theme = CUSTOM_THEME;
        save(plugin);
        // the previous own photo (only one this plugin made) goes to the trash
        const oldFile = old && old !== path ? vault.getAbstractFileByPath(old) : null;
        if (oldFile instanceof TFile && old.startsWith(`${CUSTOM_PHOTO_FOLDER}/`)) {
            await plugin.app.fileManager.trashFile(oldFile);
        }
        return true;
    } catch (e) {
        console.error("[Background] upload", e);
        new Notice(bg("UPLOAD_FAILED"));
        return false;
    } finally {
        notice.hide();
    }
}

/**
 * One row with the theme tiles: "Upload your image" (a checkerboard; your photo once uploaded)
 * and every built-in theme. "No photo" is a button next to the row's name.
 */
function addThemePicker(group: SettingGroup, plugin: SRPlugin) {
    group.addSetting((setting: Setting) => {
        setting.setName(bg("THEME")).setDesc(bg("THEME_DESC"));
        setting.settingEl.addClass("usr-bg-theme-setting");
        let noneButton: HTMLButtonElement | null = null;
        setting.addButton((button) => {
            noneButton = button.buttonEl;
            button.buttonEl.addClass("usr-bg-none-button");
            button.setButtonText(bg("THEME_NONE")).onClick(() => {
                getBackgroundSettings(plugin).theme = NO_THEME;
                render();
                save(plugin);
            });
        });
        const tilesEl = setting.settingEl.createDiv({
            cls: "usr-bg-themes",
            attr: { role: "radiogroup", "aria-label": bg("THEME") },
        });

        const render = () => {
            tilesEl.empty();
            const current = getBackgroundSettings(plugin).theme;
            noneButton?.toggleClass("is-selected", current === NO_THEME);
            noneButton?.setAttr("aria-pressed", current === NO_THEME ? "true" : "false");

            const tile = (id: string, name: string, desc: string, selected: boolean) => {
                const el = tilesEl.createEl("button", {
                    cls: "usr-bg-theme",
                    attr: { type: "button", role: "radio", "data-theme": id, title: desc },
                });
                el.toggleClass("is-selected", selected);
                el.setAttr("aria-checked", selected ? "true" : "false");
                el.setAttr("aria-label", desc ? `${name}: ${desc}` : name);
                const view = el.createDiv({ cls: "usr-bg-theme-view" });
                const nameEl = el.createSpan({ cls: "usr-bg-theme-name" });
                setIcon(nameEl.createSpan({ cls: "usr-bg-theme-check" }), "check");
                nameEl.createSpan({ text: name });
                return { el, view, nameEl };
            };

            // Own photo: a checkerboard "upload" tile, or the photo itself once uploaded
            const own = customTheme(plugin);
            if (own) {
                const selected = current === CUSTOM_THEME;
                const t = tile(CUSTOM_THEME, bg("THEME_CUSTOM"), bg("THEME_CUSTOM_DESC"), selected);
                applyPalette(t.el, own.palette);
                t.view.createEl("img", { attr: { src: own.photo, alt: "" } });
                if (selected)
                    t.nameEl.createSpan({ cls: "usr-bg-theme-change", text: bg("CHANGE") });
                t.el.addEventListener("click", () => {
                    if (getBackgroundSettings(plugin).theme === CUSTOM_THEME) {
                        void pickImageFile().then(async (blob) => {
                            if (blob && (await uploadPhoto(plugin, blob))) render();
                        });
                        return;
                    }
                    getBackgroundSettings(plugin).theme = CUSTOM_THEME;
                    render();
                    save(plugin);
                });
            } else {
                const t = tile(CUSTOM_THEME, bg("UPLOAD"), bg("UPLOAD_DESC"), false);
                t.el.addClass("is-upload");
                setIcon(t.view.createSpan({ cls: "usr-bg-theme-upload-icon" }), "image-plus");
                t.el.addEventListener("click", () => {
                    // the picker opens right inside the tap (phones allow it only then)
                    void pickImageFile().then(async (blob) => {
                        if (blob && (await uploadPhoto(plugin, blob))) render();
                    });
                });
            }

            for (const theme of BACKGROUND_THEMES) {
                const { name, desc } = themeText(theme.id);
                const t = tile(theme.id, name, desc, current === theme.id);
                applyPalette(t.el, theme.palette);
                t.view.createEl("img", { attr: { src: theme.photo, alt: "" } }).setCssProps({
                    "object-position": theme.position,
                });
                t.el.addEventListener("click", () => {
                    getBackgroundSettings(plugin).theme = theme.id;
                    render();
                    save(plugin);
                });
            }
        };
        render();
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
        const names = BACKGROUND_THEMES.map((t) => t.credit).filter((name) => name !== "");
        setting.setDesc(bg("CREDIT", { names: names.join(", ") }));
        setting.settingEl.addClass("usr-bg-credit");
    });
}

/** Only the theme picker (top of the "Options" window). */
export function addBackgroundThemeGroup(containerEl: HTMLElement, plugin: SRPlugin) {
    addThemePicker(new SettingGroup(containerEl).setHeading(bg("GROUP")), plugin);
}
