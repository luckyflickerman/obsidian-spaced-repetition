import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    // Calendar
    TODAY_LINE: "Studied ${cards} cards in ${minutes} minutes today (${seconds}s/card)",
    TODAY_NONE: "No cards studied today yet",
    AVERAGE: "Average:",
    PER_MINUTE: "${n} cards/minute",
    MINUTES_MORE: "${n} minutes more",
    NEW: "New",
    DUE: "Due",
    TOTAL: "Total",
    TOTAL_TIME: "Total",
    PAST_WEEK: "Past week",
    HOURS: "${n} hrs",
    DAILY_AVERAGE: "Daily average:",
    CARDS: "${n} cards",
    DAYS_LEARNED: "Days learned:",
    LONGEST_STREAK: "Longest streak:",
    CURRENT_STREAK: "Current streak:",
    DAYS: "${n} days",
    CELL: "${date}: ${n} cards",
    CELL_NONE: "${date}: no reviews",
    PREV_YEAR: "Previous year",
    NEXT_YEAR: "Next year",
    THIS_YEAR: "This year",
    COLOR: "Color",
    EMPTY_HINT: "The calendar fills in as you review cards.",
    // Colors
    COLOR_GREEN: "Green",
    COLOR_BLUE: "Blue",
    COLOR_RED: "Red",
    // Settings page
    PAGE_NAME: "Review calendar",
    G_GENERAL: "General",
    SHOW: "Show the calendar below the deck list",
    SHOW_DESC: "A square for every day; the more cards you reviewed, the stronger the color.",
    COLOR_DESC: "You can also change it with the colored dots next to the calendar.",
    STATS: "Show statistics",
    STATS_DESC: "Cards and time today, averages, hours and streaks.",
    MONDAY: "Weeks start on Monday",
    G_HISTORY: "History",
    HISTORY_DESC:
        "The history is collected from the first review with this version of the plugin (cards rated per day and the time spent).",
    HISTORY_SUMMARY: "${days} days with reviews · ${cards} cards · ${hours} h",
    RESET: "Clear history",
    RESET_CONFIRM: "Click again to confirm",
    RESET_DONE: "Review history cleared",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    TODAY_LINE: "Dziś: ${cards} kart w ${minutes} min (${seconds} s/kartę)",
    TODAY_NONE: "Dziś jeszcze bez powtórek",
    AVERAGE: "Średnio:",
    PER_MINUTE: "${n} kart/min",
    MINUTES_MORE: "Zostało ok. ${n} min",
    NEW: "Nowe",
    DUE: "Do powtórki",
    TOTAL: "Razem",
    TOTAL_TIME: "Łącznie",
    PAST_WEEK: "Ostatni tydzień",
    HOURS: "${n} h",
    DAILY_AVERAGE: "Średnio dziennie:",
    CARDS: "${n} kart",
    DAYS_LEARNED: "Dni nauki:",
    LONGEST_STREAK: "Najdłuższa seria:",
    CURRENT_STREAK: "Obecna seria:",
    DAYS: "${n} dni",
    CELL: "${date}: ${n} kart",
    CELL_NONE: "${date}: bez powtórek",
    PREV_YEAR: "Poprzedni rok",
    NEXT_YEAR: "Następny rok",
    THIS_YEAR: "Bieżący rok",
    COLOR: "Kolor",
    EMPTY_HINT: "Kalendarz będzie się wypełniał, gdy będziesz powtarzać karty.",
    COLOR_GREEN: "Zielony",
    COLOR_BLUE: "Niebieski",
    COLOR_RED: "Czerwony",
    PAGE_NAME: "Kalendarz powtórek",
    G_GENERAL: "Ogólne",
    SHOW: "Pokazuj kalendarz pod listą talii",
    SHOW_DESC: "Kwadrat dla każdego dnia. Im więcej kart powtórzysz, tym mocniejszy kolor.",
    COLOR_DESC: "Możesz go też zmienić kolorowymi kropkami obok kalendarza.",
    STATS: "Pokazuj statystyki",
    STATS_DESC: "Karty i czas dzisiaj, średnie, godziny i serie dni.",
    MONDAY: "Tydzień zaczyna się w poniedziałek",
    G_HISTORY: "Historia",
    HISTORY_DESC:
        "Historia jest zbierana od pierwszej powtórki w tej wersji pluginu (liczba ocenionych kart dziennie i czas nauki).",
    HISTORY_SUMMARY: "Dni z powtórkami: ${days} · kart: ${cards} · ${hours} h",
    RESET: "Wyczyść historię",
    RESET_CONFIRM: "Kliknij ponownie, aby potwierdzić",
    RESET_DONE: "Historia powtórek wyczyszczona",
};

export function hm(key: Keys, params?: Record<string, string | number>): string {
    let text = (isPolish() ? PL[key] : EN[key]) ?? EN[key];
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.split("${" + k + "}").join(String(v));
        }
    }
    return text;
}

/** Number with a locale decimal separator (`8,75` in Polish). */
export function formatNumber(n: number, decimals: number): string {
    const text = n.toFixed(decimals);
    return isPolish() ? text.replace(".", ",") : text;
}
