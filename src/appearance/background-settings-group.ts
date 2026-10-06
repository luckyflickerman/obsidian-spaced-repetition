/**
 * Background photo — the settings group on the Appearance page: the switch,
 * the photo (and an optional phone photo) picked from the vault, the visible
 * part, the sliders and a preview of the colours taken from the photo.
 */

import { App, FuzzySuggestModal, Setting, SettingGroup, TFile } from "obsidian";

import {
    applyPalette,
    getBackgroundSettings,
    photoPalette,
} from "src/appearance/background-controller";
import { bg } from "src/appearance/background-i18n";
import { BackgroundPosition, isImagePath } from "src/appearance/background-settings";
import type SRPlugin from "src/main";

class ImagePickModal extends FuzzySuggestModal<TFile> {
    private onPick: (file: TFile) => void;

    constructor(app: App, onPick: (file: TFile) => void) {
        super(app);
        this.onPick = onPick;
        this.setPlaceholder(bg("PICK_PLACEHOLDER"));
    }

    getItems(): TFile[] {
        return this.app.vault.getFiles().filter((f) => isImagePath(f.path));
    }

    getItemText(file: TFile): string {
        return file.path;
    }

    onChooseItem(file: TFile): void {
        this.onPick(file);
    }
}

export function addBackgroundSettings(containerEl: HTMLElement, plugin: SRPlugin) {
    const s = () => getBackgroundSettings(plugin);
    const save = () => plugin.dataManager.settingsManager.save();
    const group = new SettingGroup(containerEl).setHeading(bg("GROUP"));
    let previewEl: HTMLElement | null = null;

    const renderPreview = async () => {
        if (!previewEl) return;
        previewEl.empty();
        const file = plugin.app.vault.getAbstractFileByPath(s().photo);
        if (!(file instanceof TFile)) return;
        const palette = await photoPalette(plugin, file);
        if (!palette || !previewEl) return;
        applyPalette(previewEl, palette);
        const card = previewEl.createDiv({ cls: "usr-bg-preview-card" });
        card.createSpan({ cls: "usr-bg-preview-word", text: "forestalled" });
        card.createSpan({ cls: "usr-bg-preview-soft", text: "uprzedzić" });
        card.createSpan({ cls: "usr-bg-preview-accent", text: "37" });
    };

    const photoSetting = (key: "photo" | "photoPhone", name: string, desc: string) => {
        group.addSetting((setting: Setting) => {
            const show = () => setting.setDesc(`${desc} — ${s()[key] || bg("NONE")}`);
            setting.setName(name);
            show();
            setting.addButton((b) =>
                b.setButtonText(bg("CHOOSE")).onClick(() => {
                    new ImagePickModal(plugin.app, (file) => {
                        s()[key] = file.path;
                        void save();
                        show();
                        if (key === "photo") void renderPreview();
                    }).open();
                }),
            );
            setting.addExtraButton((b) =>
                b
                    .setIcon("x")
                    .setTooltip(bg("CLEAR"))
                    .onClick(() => {
                        s()[key] = "";
                        void save();
                        show();
                        if (key === "photo") void renderPreview();
                    }),
            );
        });
    };

    group.addSetting((setting: Setting) => {
        setting
            .setName(bg("ENABLE"))
            .setDesc(bg("ENABLE_DESC"))
            .addToggle((t) =>
                t.setValue(s().enabled).onChange(async (v) => {
                    s().enabled = v;
                    await save();
                }),
            );
    });
    photoSetting("photo", bg("PHOTO"), bg("PHOTO_DESC"));
    photoSetting("photoPhone", bg("PHOTO_PHONE"), bg("PHOTO_PHONE_DESC"));
    group.addSetting((setting: Setting) => {
        setting
            .setName(bg("POSITION"))
            .setDesc(bg("POSITION_DESC"))
            .addDropdown((d) =>
                d
                    .addOptions({
                        top: bg("POS_TOP"),
                        center: bg("POS_CENTER"),
                        bottom: bg("POS_BOTTOM"),
                    })
                    .setValue(s().position)
                    .onChange(async (v) => {
                        s().position = v as BackgroundPosition;
                        await save();
                    }),
            );
    });
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
                    .onChange(async (v) => {
                        s()[key] = v;
                        await save();
                    }),
            );
        });
    slider("glass", bg("GLASS"), bg("GLASS_DESC"), 0.3, 0.9, 0.05);
    slider("dim", bg("DIM"), "", 0, 0.6, 0.02);
    slider("blur", bg("BLUR"), "", 0, 40, 1);
    group.addSetting((setting: Setting) => {
        setting.setName(bg("COLOURS")).setDesc(bg("COLOURS_DESC"));
        previewEl = setting.controlEl.createDiv({ cls: "usr-bg-preview" });
        void renderPreview();
    });
}
