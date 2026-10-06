/**
 * Background photo — glue: puts the photo behind the review view (modal or
 * tab) and sets the colour variables taken from it. All styling is in
 * background.css under `.usr-bg-on`; with the setting off nothing changes.
 *
 * The photo is read with `vault.readBinary` (works on every device and never
 * "taints" the canvas), shrunk to 64×64 and turned into a palette once per
 * file version.
 */

import "src/appearance/background.css";
import { Platform, TFile } from "obsidian";

import {
    BackgroundSettings,
    normalizeBackgroundSettings,
    objectPosition,
    photoFor,
} from "src/appearance/background-settings";
import { paletteFromPixels, PhotoPalette, rgbCss, rgbTriple } from "src/appearance/photo-palette";
import type SRPlugin from "src/main";
import EmulatedPlatform from "src/utils/platform-detector";

const cache = new Map<string, PhotoPalette>();

export function getBackgroundSettings(plugin: SRPlugin): BackgroundSettings {
    const settings = plugin.dataManager.data.settings;
    settings.background = normalizeBackgroundSettings(settings.background);
    return settings.background;
}

const MIME: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    gif: "image/gif",
};

/** The palette of a photo in the vault (cached per file version); null if unreadable. */
export async function photoPalette(plugin: SRPlugin, file: TFile): Promise<PhotoPalette | null> {
    const key = `${file.path}|${file.stat.mtime}`;
    const known = cache.get(key);
    if (known) return known;
    let url = "";
    try {
        const data = await plugin.app.vault.readBinary(file);
        const blob = new Blob([data], { type: MIME[file.extension.toLowerCase()] ?? "image/*" });
        url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = activeDocument.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, 64, 64);
        const palette = paletteFromPixels(ctx.getImageData(0, 0, 64, 64).data);
        cache.set(key, palette);
        return palette;
    } catch (e) {
        console.error("[Background] could not read the photo", file.path, e);
        return null;
    } finally {
        if (url) URL.revokeObjectURL(url);
    }
}

/** Sets the palette variables on an element (also used for the preview in the settings). */
export function applyPalette(el: HTMLElement, p: PhotoPalette) {
    el.setCssProps({
        "--usr-bg-base": rgbTriple(p.base),
        "--usr-bg-ink": rgbCss(p.ink),
        "--usr-bg-soft": rgbCss(p.soft),
        "--usr-bg-accent": rgbCss(p.accent),
        "--usr-bg-accent-rgb": rgbTriple(p.accent),
        "--usr-bg-on-accent": rgbCss(p.onAccent),
        "--usr-bg-heat-1": rgbCss(p.heat[0]),
        "--usr-bg-heat-2": rgbCss(p.heat[1]),
        "--usr-bg-heat-3": rgbCss(p.heat[2]),
        "--usr-bg-heat-4": rgbCss(p.heat[3]),
        "--usr-bg-heat-5": rgbCss(p.heat[4]),
    });
}

export class BackgroundController {
    private plugin: SRPlugin;
    private hostEl: HTMLElement;
    private frameEl: HTMLElement;
    private layerEl: HTMLElement | null = null;
    private applying = 0;

    constructor(plugin: SRPlugin, hostEl: HTMLElement) {
        this.plugin = plugin;
        this.hostEl = hostEl;
        // the whole review window (modal) or the tab's content
        this.frameEl = hostEl.closest(".modal") ?? hostEl;
    }

    /** Shows (or removes) the photo for the current settings. */
    async apply(): Promise<void> {
        const run = ++this.applying;
        const s = getBackgroundSettings(this.plugin);
        const isPhone = Platform.isPhone || EmulatedPlatform().isPhone;
        const path = photoFor(s, isPhone);
        const file = s.enabled && path ? this.plugin.app.vault.getAbstractFileByPath(path) : null;
        if (!(file instanceof TFile)) {
            this.remove();
            return;
        }
        const palette = await photoPalette(this.plugin, file);
        if (run !== this.applying) return;
        if (!palette) {
            this.remove();
            return;
        }

        if (!this.layerEl || !this.layerEl.isConnected) {
            this.layerEl = createDiv({ cls: "usr-bg-layer", attr: { "aria-hidden": "true" } });
            this.frameEl.prepend(this.layerEl);
        }
        this.layerEl.empty();
        this.layerEl
            .createEl("img", {
                cls: "usr-bg-photo",
                attr: { src: this.plugin.app.vault.getResourcePath(file), alt: "" },
            })
            .setCssProps({ "object-position": objectPosition(s.position) });
        this.layerEl.createDiv({ cls: "usr-bg-scrim" });

        applyPalette(this.frameEl, palette);
        this.frameEl.setCssProps({
            "--usr-bg-glass": String(s.glass),
            "--usr-bg-dim": String(s.dim),
            "--usr-bg-blur": `${s.blur}px`,
        });
        this.frameEl.addClass("usr-bg-on");
    }

    remove() {
        this.layerEl?.remove();
        this.layerEl = null;
        this.frameEl.removeClass("usr-bg-on");
    }

    destroy() {
        this.applying++;
        this.remove();
    }
}
