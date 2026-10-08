/**
 * Background themes — a photo built into the plugin and the colours that go
 * with it (70 / 20 / 10, see photo-palette.ts).
 *
 * HOW TO ADD A THEME
 * 1. Put a JPEG in `src/appearance/themes/` — about 1440 px wide, under 200 KB
 *    (it is packed into main.js, which every phone downloads).
 * 2. Add one entry below: the two hues and saturations come from
 *    `paletteFromPixels` run on the photo (base = main hue, accent = another
 *    striking hue), `position` = which part stays visible on narrow screens.
 * 3. Add the names `THEME_<ID>` and `THEME_<ID>_DESC` in background-i18n.ts
 *    and the photo's author in README.md.
 *
 * Photos: Unsplash (Unsplash licence). "space" and "aurora" are drawn by the plugin's author
 * (scripts/generate-theme-photos.py), no licence needed.
 */

import { buildPalette, PhotoPalette } from "src/appearance/photo-palette";
import lakePhoto from "src/appearance/themes/jezioro.jpg";
import spacePhoto from "src/appearance/themes/kosmos.jpg";
import duskPhoto from "src/appearance/themes/zmierzch.jpg";
import auroraPhoto from "src/appearance/themes/zorza.jpg";

export interface BackgroundTheme {
    id: string;
    /** The photo (a data: URL — works offline on every device) */
    photo: string;
    /** CSS object-position: the part of the photo kept on narrow screens */
    position: string;
    palette: PhotoPalette;
    /** Photo's author, for the credit line */
    credit: string;
}

export const BACKGROUND_THEMES: BackgroundTheme[] = [
    {
        // "Day": a mountain lake at sunrise — teal panels, golden accent (Tobias Reich)
        id: "lake",
        photo: lakePhoto,
        position: "center",
        palette: buildPalette(202.5, 0.54, 37.5, 0.68),
        credit: "Tobias Reich",
    },
    {
        // "Night": a purple dusk over a city — violet panels, pink accent (Henry Lai)
        id: "dusk",
        photo: duskPhoto,
        position: "center",
        palette: buildPalette(262.5, 0.33, 322.5, 0.55),
        credit: "Henry Lai",
    },
    {
        // Deep blue night sky with the Milky Way — navy panels, icy blue accent (generated)
        id: "space",
        photo: spacePhoto,
        position: "30% center",
        palette: buildPalette(226, 0.5, 192, 0.7),
        credit: "",
    },
    {
        // Green aurora over mountains and a lake — dark teal panels, aurora green accent (generated)
        id: "aurora",
        photo: auroraPhoto,
        position: "center 35%",
        palette: buildPalette(186, 0.45, 148, 0.7),
        credit: "",
    },
];

/** "none" = no photo, Obsidian's own colours */
export const NO_THEME = "none";

export function findTheme(id: string): BackgroundTheme | null {
    return BACKGROUND_THEMES.find((t) => t.id === id) ?? null;
}
