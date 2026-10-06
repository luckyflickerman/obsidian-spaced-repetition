import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    GROUP: "Background photo",
    ENABLE: "Photo behind the review",
    ENABLE_DESC:
        "A photo from your vault behind the deck list and the cards. The colours of the panels, the calendar and the buttons are taken from the photo.",
    PHOTO: "Photo",
    PHOTO_DESC: "An image from your vault (jpg, png, webp). A wide one fits computers and tablets.",
    PHOTO_PHONE: "Photo on phones",
    PHOTO_PHONE_DESC: "Optional: an upright photo for phones. Empty = the same as above.",
    CHOOSE: "Choose…",
    CLEAR: "Remove",
    NONE: "none",
    PICK_PLACEHOLDER: "Type to find an image in your vault",
    POSITION: "Part of the photo",
    POSITION_DESC: "Which part stays visible when the screen is narrower than the photo.",
    POS_TOP: "Top",
    POS_CENTER: "Middle",
    POS_BOTTOM: "Bottom",
    GLASS: "Panel cover",
    GLASS_DESC: "Low = the photo shows through more; high = calmer and easier to read.",
    DIM: "Darken the photo",
    BLUR: "Blur behind the panels",
    COLOURS: "Colours from the photo",
    COLOURS_DESC: "Panel, text and accent picked from the photo.",
    NOT_FOUND: "Background photo not found: ${path}",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    GROUP: "Tło ze zdjęciem",
    ENABLE: "Zdjęcie za powtórką",
    ENABLE_DESC:
        "Zdjęcie z sejfu za listą talii i fiszkami. Kolory paneli, kalendarza i przycisków plugin bierze ze zdjęcia.",
    PHOTO: "Zdjęcie",
    PHOTO_DESC: "Obrazek z sejfu (jpg, png, webp). Na komputer i tablet najlepiej poziomy.",
    PHOTO_PHONE: "Zdjęcie na telefonie",
    PHOTO_PHONE_DESC: "Opcjonalnie: pionowe zdjęcie na telefon. Puste = to samo co wyżej.",
    CHOOSE: "Wybierz…",
    CLEAR: "Usuń",
    NONE: "brak",
    PICK_PLACEHOLDER: "Wpisz, żeby znaleźć obrazek w sejfie",
    POSITION: "Część zdjęcia",
    POSITION_DESC: "Która część zostaje widoczna, gdy ekran jest węższy niż zdjęcie.",
    POS_TOP: "Góra",
    POS_CENTER: "Środek",
    POS_BOTTOM: "Dół",
    GLASS: "Zakrycie paneli",
    GLASS_DESC: "Mniej = zdjęcie bardziej prześwituje; więcej = spokojniej i czytelniej.",
    DIM: "Przyciemnienie zdjęcia",
    BLUR: "Rozmycie za panelami",
    COLOURS: "Kolory ze zdjęcia",
    COLOURS_DESC: "Panel, tekst i akcent dobrane ze zdjęcia.",
    NOT_FOUND: "Nie znaleziono zdjęcia tła: ${path}",
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
