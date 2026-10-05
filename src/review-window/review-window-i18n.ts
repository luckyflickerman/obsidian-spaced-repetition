import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    FULLSCREEN: "Full screen",
    EXIT_FULLSCREEN: "Exit full screen",
    CMD_FULLSCREEN: "Review window: full screen on / off",
    PENDING_NEXT_STEP: "Waiting for the next FSRS review step. Next card in ${time} (h:mm:ss).",
    // Settings → Appearance
    G_CARD: "Card in the review",
    CARD_TEXT_SIZE: "Card text size",
    CARD_TEXT_SIZE_DESC:
        "Short cards (a word and its translation) get the full size; longer ones (sentences, lists) only a little, so they still fit on a phone.",
    SIZE_NORMAL: "Normal",
    SIZE_LARGE: "Large",
    SIZE_XLARGE: "Extra large",
    CENTER_SHORT: "Center short cards",
    CENTER_SHORT_DESC:
        "A word and its translation in the middle of the window instead of the top-left corner.",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    FULLSCREEN: "Pełny ekran",
    EXIT_FULLSCREEN: "Wyjdź z pełnego ekranu",
    CMD_FULLSCREEN: "Okno powtórek: pełny ekran wł. / wył.",
    PENDING_NEXT_STEP: "Czekam na kolejny krok FSRS. Następna fiszka za ${time} (g:mm:ss).",
    G_CARD: "Karta w powtórce",
    CARD_TEXT_SIZE: "Rozmiar tekstu karty",
    CARD_TEXT_SIZE_DESC:
        "Krótkie fiszki (słowo i tłumaczenie) dostają pełne powiększenie, dłuższe (zdania, listy) tylko lekkie, żeby mieściły się na telefonie.",
    SIZE_NORMAL: "Normalny",
    SIZE_LARGE: "Duży",
    SIZE_XLARGE: "Bardzo duży",
    CENTER_SHORT: "Wyśrodkuj krótkie fiszki",
    CENTER_SHORT_DESC: "Słowo i tłumaczenie na środku okna zamiast w lewym górnym rogu.",
};

export function rw(key: Keys, params?: Record<string, string | number>): string {
    let text = (isPolish() ? PL[key] : EN[key]) ?? EN[key];
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.split("${" + k + "}").join(String(v));
        }
    }
    return text;
}
