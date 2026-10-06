/**
 * Background theme — glue: puts the theme's photo behind the review view
 * (modal or tab) and sets its colour variables. All styling is in
 * background.css under `.usr-bg-on`; with no theme nothing changes.
 *
 * The photos are built into the plugin (background-themes.ts), so nothing is
 * read from the vault and it works offline on every device.
 */

import "src/appearance/background.css";

import {
    BackgroundSettings,
    normalizeBackgroundSettings,
} from "src/appearance/background-settings";
import { findTheme } from "src/appearance/background-themes";
import { PhotoPalette, rgbCss, rgbTriple } from "src/appearance/photo-palette";
import type SRPlugin from "src/main";

/** Open review views, so a theme change shows at once. */
const live = new Set<BackgroundController>();

export function getBackgroundSettings(plugin: SRPlugin): BackgroundSettings {
    const settings = plugin.dataManager.data.settings;
    settings.background = normalizeBackgroundSettings(settings.background);
    return settings.background;
}

/** Re-applies the background in every open review view (after a settings change). */
export function refreshBackgrounds() {
    for (const controller of live) controller.apply();
}

/** Sets the palette variables on an element (also used for the previews in the settings). */
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
    private frameEl: HTMLElement;
    private layerEl: HTMLElement | null = null;
    private shownTheme = "";

    constructor(plugin: SRPlugin, hostEl: HTMLElement) {
        this.plugin = plugin;
        // the whole review window (modal) or the tab's content
        this.frameEl = hostEl.closest(".modal") ?? hostEl;
        live.add(this);
    }

    /** Shows (or removes) the photo for the current settings. */
    apply(): void {
        const s = getBackgroundSettings(this.plugin);
        const theme = findTheme(s.theme);
        if (!theme) {
            this.remove();
            return;
        }

        if (!this.layerEl || !this.layerEl.isConnected || this.shownTheme !== theme.id) {
            this.layerEl?.remove();
            this.layerEl = createDiv({ cls: "usr-bg-layer", attr: { "aria-hidden": "true" } });
            this.layerEl
                .createEl("img", { cls: "usr-bg-photo", attr: { src: theme.photo, alt: "" } })
                .setCssProps({ "object-position": theme.position });
            this.layerEl.createDiv({ cls: "usr-bg-scrim" });
            this.frameEl.prepend(this.layerEl);
            this.shownTheme = theme.id;
        }

        applyPalette(this.frameEl, theme.palette);
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
        this.shownTheme = "";
        this.frameEl.removeClass("usr-bg-on");
    }

    destroy() {
        live.delete(this);
        this.remove();
    }
}
