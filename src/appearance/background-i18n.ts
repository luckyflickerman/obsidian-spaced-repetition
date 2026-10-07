import { selectPluralForm } from "src/lang/plural";
import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    GROUP: "Background",
    THEME: "Theme",
    THEME_DESC:
        "A photo behind the deck list and the cards, with panels, calendar and buttons in its colours.",
    THEME_NONE: "No photo",
    THEME_NONE_DESC: "Obsidian's own colours",
    THEME_LAKE: "Lake",
    THEME_LAKE_DESC: "Mountain lake at sunrise: teal glass, golden accent",
    THEME_DUSK: "Dusk",
    THEME_DUSK_DESC: "Purple dusk over a city: violet glass, pink accent",
    GLASS: "Panel cover",
    GLASS_DESC: "Low = the photo shows through more; high = calmer and easier to read.",
    DIM: "Darken the photo",
    BLUR: "Blur behind the panels",
    CREDIT: "Photos: ${names} (Unsplash).",
    DUE_WAITING: "one:${n} card waiting today|other:${n} cards waiting today",
    ALL_DONE: "All done for today",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    GROUP: "Tło",
    THEME: "Motyw",
    THEME_DESC:
        "Zdjęcie za listą talii i fiszkami, a panele, kalendarz i przyciski w jego kolorach.",
    THEME_NONE: "Bez zdjęcia",
    THEME_NONE_DESC: "Kolory Obsidiana",
    THEME_LAKE: "Jezioro",
    THEME_LAKE_DESC: "Górskie jezioro o świcie: turkusowe szkło, złoty akcent",
    THEME_DUSK: "Zmierzch",
    THEME_DUSK_DESC: "Fioletowy zmierzch nad miastem: fioletowe szkło, różowy akcent",
    GLASS: "Zakrycie paneli",
    GLASS_DESC: "Mniej = zdjęcie bardziej prześwituje; więcej = spokojniej i czytelniej.",
    DIM: "Przyciemnienie zdjęcia",
    BLUR: "Rozmycie za panelami",
    CREDIT: "Zdjęcia: ${names} (Unsplash).",
    DUE_WAITING:
        "one:${n} karta czeka na dziś|few:${n} karty czekają na dziś|many:${n} kart czeka na dziś|other:${n} karty czeka na dziś",
    ALL_DONE: "Na dziś wszystko powtórzone",
};

export function bg(key: Keys, params?: Record<string, string | number>): string {
    let text = (isPolish() ? PL[key] : EN[key]) ?? EN[key];
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.split("${" + k + "}").join(String(v));
        }
    }
    return text;
}

/** A text with a number in it, in the right plural form ("4 karty czekają na dziś"). */
export function bgCount(key: Keys, n: number): string {
    const template = (isPolish() ? PL[key] : EN[key]) ?? EN[key];
    return selectPluralForm(template, n, isPolish() ? "pl" : "en")
        .split("${n}")
        .join(String(n));
}

/** Name and description of a theme ("none" = no photo). */
export function themeText(id: string): { name: string; desc: string } {
    const key = id.toUpperCase();
    const name = `THEME_${key}` as Keys;
    const desc = `THEME_${key}_DESC` as Keys;
    return {
        name: name in EN ? bg(name) : id,
        desc: desc in EN ? bg(desc) : "",
    };
}
