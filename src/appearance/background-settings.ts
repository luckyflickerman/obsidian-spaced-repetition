/**
 * Background — settings: which built-in theme (photo + colours) is behind the
 * review, and how strongly the glass panels cover the photo.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

import { findTheme, NO_THEME } from "src/appearance/background-themes";

export interface BackgroundSettings {
    /** Theme id from background-themes.ts, or "none" = the review looks like before */
    theme: string;
    /** How much the panels cover the photo (0.3 = very see-through, 0.9 = almost solid) */
    glass: number;
    /** Darkening of the whole photo */
    dim: number;
    /** Blur behind the panels, px */
    blur: number;
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
    theme: NO_THEME,
    glass: 0.55,
    dim: 0.12,
    blur: 20,
};

/** Settings saved by 0.9.5 (a photo picked from the vault) */
interface LegacyBackgroundSettings {
    enabled?: unknown;
}

export function normalizeBackgroundSettings(
    stored: (Partial<BackgroundSettings> & LegacyBackgroundSettings) | null | undefined,
): BackgroundSettings {
    const s = stored && typeof stored === "object" ? stored : {};
    const d = DEFAULT_BACKGROUND_SETTINGS;
    const num = (v: unknown, def: number, min: number, max: number) => {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
    };
    let theme: string = NO_THEME;
    if (typeof s.theme === "string") {
        theme = findTheme(s.theme) ? s.theme : NO_THEME;
    } else if (s.enabled === true) {
        // 0.9.5 had the photo switched on: show the first built-in theme instead
        theme = "lake";
    }
    return {
        theme,
        glass: num(s.glass, d.glass, 0.3, 0.9),
        dim: num(s.dim, d.dim, 0, 0.6),
        blur: Math.round(num(s.blur, d.blur, 0, 40)),
    };
}
