import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    // Commands
    CMD_NEW: "New card",
    CMD_NEW_SENTENCE: "New card with a sentence",
    CMD_LANGUAGE: "New card: change language",
    CMD_FINISH: "Finish card",
    CMD_IMAGE: "Add image to card",
    CMD_DUPLICATES: "Show duplicates in deck",
    RIBBON: "New card",
    // Notices
    NO_DECKS: "Add a deck first: Settings → Upgraded Spaced Repetition → Card authoring.",
    NOT_A_CARD: "Put the cursor in a card line.",
    MISSING_WORD: "Missing word",
    MISSING_TRANSLATION: "Missing translation",
    DUPLICATE: "⚠ Possible duplicate: “${word}” is already in the deck.",
    SHOW: "Show",
    COUNTER: "New today: ${n}",
    CHOOSE_DECK: "Choose a deck…",
    DECK_CHOSEN: "New cards go to ${tag} (${file})",
    IMAGE_ADDED: "Image added: ${name}",
    IMAGE_FAILED: "Could not add the image",
    IMAGE_RENAMED: "Image renamed to ${name}",
    // Preview
    PREVIEW: "Card preview",
    STATUS_NEW: "new",
    STATUS_NEXT: "next review: ${date}",
    DECK: "Deck",
    LANGUAGE: "Language",
    STATUS: "Status",
    LISTEN: "Listen",
    POSSIBLE_DUPLICATE: "⚠ possible duplicate",
    UNFINISHED: "Unfinished card — add the translation after the separator (Tab).",
    INCOMPLETE: "Unfinished card — the question or the answer is empty.",
    QUESTION: "Question",
    ANSWER: "Answer",
    UNKNOWN_LANG: "?",
    // Duplicates window
    DUPLICATES_TITLE: "Duplicates in ${deck}",
    NO_DUPLICATES: "No duplicates in ${deck}.",
    DUPLICATES_HINT: "Same question (ignoring case, formatting and punctuation). Tap to open.",
    LINE: "line ${n}",
    // Settings page
    PAGE_NAME: "Card authoring",
    G_DECKS: "Card decks",
    DECKS_DESC:
        "One file per deck. “New card” (Ctrl/Cmd+Shift+N) appends to the deck's file. The reading language works like a read-aloud rule.",
    DECK_TAG: "Tag",
    DECK_FILE: "File",
    DECK_LANG: "Language",
    ADD_DECK: "Add deck",
    REMOVE_DECK: "Remove deck",
    TAG_NOT_FLASHCARD:
        "${tag} is not in the flashcard tags, so a new deck file starts with ${first} (the plugin reads only notes with a flashcard tag).",
    G_WRITING: "Writing cards",
    BOTH: "Second direction right away (PL → foreign)",
    BOTH_DESC:
        "New cards use the two-way separator (${sep}), so each word is also asked from Polish.",
    COMPACT_SR: "Compact schedule comments in the editor",
    COMPACT_SR_DESC:
        "Instead of the long <!--SR:…--> text a small calendar icon; its tooltip says when the next review is. The note itself is not changed. With the cursor on the line the text is shown as it is.",
    SCHEDULE_NEXT: "Next review: ${dates}",
    SCHEDULE_COMMENT: "Review schedule",
    ICONS: "Show card icons in the editor",
    ICONS_DESC:
        "A preview icon next to every card (tap: preview with sound), an icon with “!” next to unfinished ones.",
    G_COUNTER: "Daily counter",
    GOAL: "Daily goal",
    GOAL_DESC: "How many new cards a day you aim for.",
    SHOW_COUNTER: "Show “New today”",
    SHOW_COUNTER_DESC:
        "In the status bar (computer) or in the preview and after “Finish card” (phone).",
    GOAL_IN_DECKS: "Show the goal in the deck list",
    GOAL_IN_DECKS_DESC:
        "Its own block above the review calendar (also when the calendar is expanded or switched off).",
    GOAL_TITLE: "New cards today",
    GOAL_ARIA: "${done} of ${goal} new cards created today",
    GOAL_LEFT: "${n} more to go",
    GOAL_REACHED: "Goal reached!",
    G_IMAGES: "Images",
    RENAME_PASTED: "Name pasted images after the word",
    RENAME_PASTED_DESC:
        "“Pasted image 2026…” pasted into a card line is renamed, e.g. forestalled.png.",
    RESIZE: "Shrink large photos",
    RESIZE_DESC: "Keeps the vault small: photos wider than the limit are scaled down.",
    MAX_WIDTH: "Maximum width (px)",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    CMD_NEW: "Nowa fiszka",
    CMD_NEW_SENTENCE: "Nowa fiszka ze zdaniem",
    CMD_LANGUAGE: "Nowa fiszka: zmień język",
    CMD_FINISH: "Zakończ fiszkę",
    CMD_IMAGE: "Dodaj obrazek do fiszki",
    CMD_DUPLICATES: "Pokaż duplikaty w talii",
    RIBBON: "Nowa fiszka",
    NO_DECKS: "Najpierw dodaj talię: Ustawienia → Upgraded Spaced Repetition → Tworzenie fiszek.",
    NOT_A_CARD: "Ustaw kursor w linii fiszki.",
    MISSING_WORD: "Brak słowa",
    MISSING_TRANSLATION: "Brak tłumaczenia",
    DUPLICATE: "⚠ Możliwy duplikat: „${word}” już jest w talii.",
    SHOW: "Pokaż",
    COUNTER: "Nowe dziś: ${n}",
    CHOOSE_DECK: "Wybierz talię…",
    DECK_CHOSEN: "Nowe fiszki trafią do ${tag} (${file})",
    IMAGE_ADDED: "Dodano obrazek: ${name}",
    IMAGE_FAILED: "Nie udało się dodać obrazka",
    IMAGE_RENAMED: "Zmieniono nazwę obrazka na ${name}",
    PREVIEW: "Podgląd fiszki",
    STATUS_NEW: "nowa",
    STATUS_NEXT: "następna powtórka: ${date}",
    DECK: "Talia",
    LANGUAGE: "Język",
    STATUS: "Status",
    LISTEN: "Posłuchaj",
    POSSIBLE_DUPLICATE: "⚠ możliwy duplikat",
    UNFINISHED: "Niedokończona fiszka — dopisz tłumaczenie po separatorze (Tab).",
    INCOMPLETE: "Niedokończona fiszka — pytanie albo odpowiedź jest puste.",
    QUESTION: "Pytanie",
    ANSWER: "Odpowiedź",
    UNKNOWN_LANG: "?",
    DUPLICATES_TITLE: "Duplikaty w talii ${deck}",
    NO_DUPLICATES: "W talii ${deck} nie ma duplikatów.",
    DUPLICATES_HINT:
        "To samo pytanie (bez względu na wielkość liter, formatowanie i interpunkcję). Dotknij, żeby otworzyć.",
    LINE: "linia ${n}",
    PAGE_NAME: "Tworzenie fiszek",
    G_DECKS: "Talie fiszek",
    DECKS_DESC:
        "Jeden plik na talię. „Nowa fiszka” (Ctrl/Cmd+Shift+N) dopisuje na końcu pliku talii. Język czytania działa jak reguła czytania na głos.",
    DECK_TAG: "Tag",
    DECK_FILE: "Plik",
    DECK_LANG: "Język",
    ADD_DECK: "Dodaj talię",
    REMOVE_DECK: "Usuń talię",
    TAG_NOT_FLASHCARD:
        "${tag} nie ma na liście tagów fiszek, więc nowy plik talii zacznie się od ${first} (plugin czyta tylko notatki z tagiem fiszek).",
    G_WRITING: "Pisanie fiszek",
    BOTH: "Od razu drugi kierunek (PL → obcy)",
    BOTH_DESC:
        "Nowe fiszki mają separator dwukierunkowy (${sep}), więc każde słowo jest też odpytywane z polskiego.",
    COMPACT_SR: "Zwijaj komentarze harmonogramu w edytorze",
    COMPACT_SR_DESC:
        "Zamiast długiego tekstu <!--SR:…--> mała ikonka kalendarza; w dymku data następnej powtórki. Sama notatka się nie zmienia. Gdy kursor jest w tej linii, widać zwykły tekst.",
    SCHEDULE_NEXT: "Następna powtórka: ${dates}",
    SCHEDULE_COMMENT: "Harmonogram powtórek",
    ICONS: "Pokazuj ikonki fiszek w edytorze",
    ICONS_DESC:
        "Ikonka podglądu przy każdej fiszce (dotknięcie: podgląd z odsłuchem), ikonka z „!” przy niedokończonych.",
    G_COUNTER: "Licznik dzienny",
    GOAL: "Cel dzienny",
    GOAL_DESC: "Ile nowych fiszek dziennie chcesz robić.",
    SHOW_COUNTER: "Pokazuj „Nowe dziś”",
    SHOW_COUNTER_DESC:
        "Na pasku stanu (komputer) albo w podglądzie i po „Zakończ fiszkę” (telefon).",
    GOAL_IN_DECKS: "Pokazuj cel na liście talii",
    GOAL_IN_DECKS_DESC:
        "Osobny blok nad kalendarzem powtórek (także gdy kalendarz jest rozwinięty albo wyłączony).",
    GOAL_TITLE: "Nowe fiszki dziś",
    GOAL_ARIA: "Dziś stworzono ${done} z ${goal} nowych fiszek",
    GOAL_LEFT: "Jeszcze ${n}",
    GOAL_REACHED: "Cel osiągnięty!",
    G_IMAGES: "Obrazki",
    RENAME_PASTED: "Nazywaj wklejone obrazki od słowa",
    RENAME_PASTED_DESC:
        "„Pasted image 2026…” wklejony do linii fiszki dostaje nazwę od słowa, np. forestalled.png.",
    RESIZE: "Zmniejszaj duże zdjęcia",
    RESIZE_DESC: "Chroni rozmiar vaulta: zdjęcia szersze niż limit są pomniejszane.",
    MAX_WIDTH: "Maksymalna szerokość (px)",
};

export function ca(key: Keys, params?: Record<string, string | number>): string {
    let text = (isPolish() ? PL[key] : EN[key]) ?? EN[key];
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.split("${" + k + "}").join(String(v));
        }
    }
    return text;
}
