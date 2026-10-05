import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    TITLE: "Import from Spaced Repetition",
    QUESTION:
        "Move settings, Speed Streak records and data from the original Spaced Repetition plugin?",
    DETAILS:
        "The original plugin's file is not changed. Review dates saved in your notes work right away.",
    REPLACE_WARNING: "The current settings of this plugin will be replaced.",
    YES: "Yes",
    NO: "No",
    LATER: "Later",
    DONE: "Done. Turn off the original Spaced Repetition plugin in Settings → Community plugins, so cards are not counted twice.",
    NOT_FOUND: "No data from the original Spaced Repetition plugin was found.",
    BROKEN: "The original plugin's data file could not be read (damaged JSON). Nothing was imported.",
    RESTART: "Restart Obsidian to load the imported data.",
    COMMAND: "Import data from the original Spaced Repetition",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    TITLE: "Import ze Spaced Repetition",
    QUESTION: "Przenieść ustawienia, rekordy Speed Streak i dane z oryginalnego pluginu?",
    DETAILS:
        "Plik oryginalnego pluginu nie zostanie zmieniony. Terminy powtórek zapisane w notatkach działają od razu.",
    REPLACE_WARNING: "Obecne ustawienia tego pluginu zostaną zastąpione.",
    YES: "Tak",
    NO: "Nie",
    LATER: "Później",
    DONE: "Gotowe. Wyłącz oryginalny plugin Spaced Repetition w Ustawieniach → Wtyczki społeczności, żeby fiszki nie były liczone podwójnie.",
    NOT_FOUND: "Nie znaleziono danych oryginalnego pluginu Spaced Repetition.",
    BROKEN: "Nie udało się odczytać pliku danych oryginalnego pluginu (uszkodzony JSON). Nic nie zostało przeniesione.",
    RESTART: "Uruchom ponownie Obsidiana, żeby wczytać przeniesione dane.",
    COMMAND: "Importuj dane z oryginalnego Spaced Repetition",
};

export function li(key: Keys): string {
    return (isPolish() ? PL[key] : EN[key]) ?? EN[key];
}
