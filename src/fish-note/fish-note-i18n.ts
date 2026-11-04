import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    NEW_FISH_NOTE: "New fish note",
    TITLE: "New fish note",
    NAME: "Name",
    NAME_DESC: "The note's file name. Empty = the deck's name.",
    DECK: "Deck",
    DECK_DESC: "Cards in this note start with the deck's tag, e.g. #DEN Hund:: pies.",
    DECK_NEW: "New deck…",
    TAG: "Deck tag",
    TAG_DESC: "A short tag, e.g. #DEN. It is written at the start of every card.",
    LANGUAGE: "Language",
    LANGUAGE_DESC: "Reading aloud uses it. You can change it later in Card authoring.",
    LANGUAGE_NONE: "— not read aloud —",
    CREATE: "Create",
    CANCEL: "Cancel",
    NEED_TAG: "Enter a deck tag, e.g. #DEN.",
    ACTION_NEW_CARD: "New card",
    ACTION_IMAGE: "Add image to the card",
    ACTION_LEARN: "Learn the cards of this note",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    NEW_FISH_NOTE: "Nowa notatka na fiszki",
    TITLE: "Nowa notatka na fiszki",
    NAME: "Nazwa",
    NAME_DESC: "Nazwa pliku notatki. Puste = nazwa talii.",
    DECK: "Talia",
    DECK_DESC: "Fiszki w tej notatce zaczynają się od tagu talii, np. #DEN Hund:: pies.",
    DECK_NEW: "Nowa talia…",
    TAG: "Tag talii",
    TAG_DESC: "Krótki tag, np. #DEN. Pisze się go na początku każdej fiszki.",
    LANGUAGE: "Język",
    LANGUAGE_DESC: "Do czytania na głos. Zmienisz go później w „Tworzenie fiszek”.",
    LANGUAGE_NONE: "— bez czytania —",
    CREATE: "Utwórz",
    CANCEL: "Anuluj",
    NEED_TAG: "Wpisz tag talii, np. #DEN.",
    ACTION_NEW_CARD: "Nowa fiszka",
    ACTION_IMAGE: "Dodaj obrazek do fiszki",
    ACTION_LEARN: "Ucz się fiszek z tej notatki",
};

export function fn(key: Keys, params?: Record<string, string | number>): string {
    let text = (isPolish() ? PL[key] : EN[key]) ?? EN[key];
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.split("${" + k + "}").join(String(v));
        }
    }
    return text;
}
