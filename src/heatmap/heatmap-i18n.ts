import { polishPluralForm } from "src/heatmap/heatmap-data";
import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    // Calendar
    TODAY_LINE: "Studied ${cards} in ${minutes} minutes today (${seconds}s/card)",
    TODAY_NONE: "No cards studied today yet",
    AVERAGE: "Average:",
    PER_MINUTE: "${n} cards/minute",
    MINUTES_MORE: "${n} minutes more",
    MINUTES_LESS: "Less than a minute more",
    NEW: "New",
    DUE: "Due",
    TOTAL: "Total",
    TOTAL_TIME: "Total",
    PAST_WEEK: "Past week",
    HOURS: "${n} hrs",
    DAILY_AVERAGE: "Daily average:",

    DAYS_LEARNED: "Days learned:",
    LONGEST_STREAK: "Longest streak:",
    CURRENT_STREAK: "Current streak:",

    CELL_DONE: "Cards done: ${n}",
    CELL_GOAL: "Daily goal: ${done}/${goal}",
    // Daily goal
    GOAL_LABEL: "Daily goal",
    GOAL_ARIA: "Daily goal: ${done} of ${goal} cards",
    GOAL_ENABLED: "Show the daily goal",
    GOAL_ENABLED_DESC:
        "Above the minimized calendar: cards done today out of the goal. The goal is also shown in the day tooltips.",
    GOAL_COUNT: "Cards per day",
    GOAL_COUNT_DESC: "How many cards you want to review every day (1–9999).",
    GOAL_TODAY: "Today: ${done}/${goal}",
    PREV_YEAR: "Previous year",
    NEXT_YEAR: "Next year",
    THIS_YEAR: "This year",
    COLOR: "Color",
    MINIMIZE: "Minimize calendar",
    EXPAND: "Expand calendar",
    MINI_LABEL: "${n} cards left for today",
    MINIMIZED: "Minimized calendar",
    MINIMIZED_DESC:
        "Only a ring with the cards left for today and this month, on the right below the deck list.",
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
    COLOR_DESC: "Shade of the day squares: the more cards, the stronger the color.",
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
    TODAY_LINE: "Dziś: ${cards} w ${minutes} min (${seconds} s/kartę)",
    TODAY_NONE: "Dziś jeszcze bez powtórek",
    AVERAGE: "Średnio:",
    PER_MINUTE: "${n} kart/min",
    MINUTES_MORE: "Zostało ok. ${n} min",
    MINUTES_LESS: "Została mniej niż minuta",
    NEW: "Nowe",
    DUE: "Do powtórki",
    TOTAL: "Razem",
    TOTAL_TIME: "Łącznie",
    PAST_WEEK: "Ostatni tydzień",
    HOURS: "${n} h",
    DAILY_AVERAGE: "Średnio dziennie:",

    DAYS_LEARNED: "Dni nauki:",
    LONGEST_STREAK: "Najdłuższa seria:",
    CURRENT_STREAK: "Obecna seria:",

    CELL_DONE: "Zrobione fiszki: ${n}",
    CELL_GOAL: "Cel dzienny: ${done}/${goal}",
    GOAL_LABEL: "Cel dzienny",
    GOAL_ARIA: "Cel dzienny: ${done} z ${goal} fiszek",
    GOAL_ENABLED: "Pokazuj cel dzienny",
    GOAL_ENABLED_DESC:
        "Nad zwiniętym kalendarzem: liczba fiszek zrobionych dziś względem celu. Cel widać też w dymku każdego dnia.",
    GOAL_COUNT: "Fiszek dziennie",
    GOAL_COUNT_DESC: "Ile fiszek chcesz powtarzać każdego dnia (1–9999).",
    GOAL_TODAY: "Dziś: ${done}/${goal}",
    PREV_YEAR: "Poprzedni rok",
    NEXT_YEAR: "Następny rok",
    THIS_YEAR: "Bieżący rok",
    COLOR: "Kolor",
    MINIMIZE: "Zwiń kalendarz",
    EXPAND: "Rozwiń kalendarz",
    MINI_LABEL: "Zostało na dziś: ${n}",
    MINIMIZED: "Zwinięty kalendarz",
    MINIMIZED_DESC:
        "Tylko koło z liczbą kart pozostałych na dziś i bieżący miesiąc, po prawej pod listą talii.",
    EMPTY_HINT: "Kalendarz będzie się wypełniał, gdy będziesz powtarzać karty.",
    COLOR_GREEN: "Zielony",
    COLOR_BLUE: "Niebieski",
    COLOR_RED: "Czerwony",
    PAGE_NAME: "Kalendarz powtórek",
    G_GENERAL: "Ogólne",
    SHOW: "Pokazuj kalendarz pod listą talii",
    SHOW_DESC: "Kwadrat dla każdego dnia. Im więcej kart powtórzysz, tym mocniejszy kolor.",
    COLOR_DESC: "Odcień kwadratów dni: im więcej kart, tym mocniejszy kolor.",
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

const WORDS = {
    cards: { en: ["card", "cards"], pl: ["karta", "karty", "kart"] },
    days: { en: ["day", "days"], pl: ["dzień", "dni", "dni"] },
};

/** "1 karta", "3 karty", "13 kart" / "1 card", "13 cards". */
export function countOf(n: number, what: keyof typeof WORDS): string {
    const words = WORDS[what];
    const word = isPolish() ? words.pl[polishPluralForm(n)] : words.en[n === 1 ? 0 : 1];
    return `${n} ${word}`;
}
