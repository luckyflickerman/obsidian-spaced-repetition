import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    MODE: "Endless",
    COMMAND: "Endless: practise chosen decks without end",
    HINT: "Tick the decks to practise, then start. The cards repeat without end; nothing is scheduled.",
    START: "Start Endless",
    START_N: "Start Endless · ${n} cards",
    NOTHING_SELECTED: "Tick at least one deck",
    SELECT_DECK: "Practise ${deck} in Endless",
    // Rating buttons
    ERROR: "Error",
    ERROR_RESETS: "resets score",
    LATER: "comes back later",
    KNOW: "Got it",
    KNOW_SUB: "+1 to score",
    ROUND_END: "done",
    HONESTY:
        "Be honest with yourself — a record only means something when you admit your mistakes.",
    // Score and records
    SCORE: "Score ${n}",
    SCORE_RECORD_ARIA: "Score ${n}, new record",
    RECORDS_BAR: "🏆 Record: ${best} · Today: ${today}",
    RECORDS_BAR_ARIA: "Endless records: best ${best}, today ${today}. Show details",
    RECORDS_TITLE: "Endless records",
    RECORDS_EMPTY: "No Endless records yet. Answer without errors to build a score.",
    TOP_5: "Top 5 runs",
    RECENT: "Last sessions",
    TOTALS: "All Endless ratings: ${ratings} · Sessions: ${sessions}",
    SESSION_LINE:
        "${date} · ${decks} · ${ratings} ratings · best ${best} · errors ${errors} · ${time}",
    RUN_LINE: "${score} — ${decks}, ${date}",
    SUMMARY_TITLE: "Session finished",
    SUMMARY: "Best score in session: ${best} · Errors: ${errors} · Ratings: ${ratings}",
    SUMMARY_RECORD: "🏆 New Endless record: ${n}!",
    // Few cards warning
    FEW_TITLE: "Few cards for Endless",
    FEW_TEXT:
        "The chosen decks have ${n} cards. Endless works best from ${min} cards — with fewer, the same cards come back very often and it is easy to remember their order instead of the words.",
    FEW_START: "Start anyway",
    FEW_BACK: "Back to the decks",
    FEW_DONT_SHOW: "Don't show this again",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    MODE: "Endless",
    COMMAND: "Endless: ćwicz wybrane talie bez końca",
    HINT: "Zaznacz talie do ćwiczenia i zacznij. Fiszki powtarzają się bez końca, harmonogram się nie zmienia.",
    START: "Zacznij Endless",
    START_N: "Zacznij Endless · ${n} fiszek",
    NOTHING_SELECTED: "Zaznacz co najmniej jedną talię",
    SELECT_DECK: "Ćwicz talię ${deck} w trybie Endless",
    ERROR: "Błąd",
    ERROR_RESETS: "zeruje wynik",
    LATER: "wróci później",
    KNOW: "Wiem",
    KNOW_SUB: "+1 do wyniku",
    ROUND_END: "zaliczone",
    HONESTY: "Bądź ze sobą szczery — rekord ma sens tylko wtedy, gdy przyznajesz się do błędów.",
    SCORE: "Wynik ${n}",
    SCORE_RECORD_ARIA: "Wynik ${n}, nowy rekord",
    RECORDS_BAR: "🏆 Rekord: ${best} · Dziś: ${today}",
    RECORDS_BAR_ARIA: "Rekordy Endless: najlepszy ${best}, dziś ${today}. Pokaż szczegóły",
    RECORDS_TITLE: "Rekordy Endless",
    RECORDS_EMPTY: "Nie ma jeszcze rekordów Endless. Odpowiadaj bez błędów, żeby zbudować wynik.",
    TOP_5: "Najlepsze 5 passy",
    RECENT: "Ostatnie sesje",
    TOTALS: "Wszystkie oceny w Endless: ${ratings} · Sesje: ${sessions}",
    SESSION_LINE:
        "${date} · ${decks} · ocen: ${ratings} · najlepszy wynik ${best} · błędy: ${errors} · ${time}",
    RUN_LINE: "${score} — ${decks}, ${date}",
    SUMMARY_TITLE: "Koniec sesji",
    SUMMARY: "Wynik najlepszy w sesji: ${best} · Błędy: ${errors} · Oceny: ${ratings}",
    SUMMARY_RECORD: "🏆 Nowy rekord Endless: ${n}!",
    FEW_TITLE: "Mało fiszek do trybu Endless",
    FEW_TEXT:
        "Wybrane talie mają ${n} fiszek. Endless działa najlepiej od ${min} fiszek — przy mniejszej liczbie te same karty wracają bardzo często i łatwo zapamiętać ich kolejność zamiast słów.",
    FEW_START: "Zacznij mimo to",
    FEW_BACK: "Wróć do wyboru talii",
    FEW_DONT_SHOW: "Nie pokazuj więcej",
};

export function en(key: Keys, params?: Record<string, string | number>): string {
    let text = (isPolish() ? PL[key] : EN[key]) ?? EN[key];
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.split("${" + k + "}").join(String(v));
        }
    }
    return text;
}
