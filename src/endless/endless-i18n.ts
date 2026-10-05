import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    MODE: "Endless",
    COMMAND: "Endless: practise chosen decks without end",
    HINT: "Tick the decks to practise, then start. The cards repeat without end; nothing is scheduled.",
    START: "Start Endless",
    START_N: "Start Endless · ${n} cards",
    NOTHING_SELECTED: "Tick at least one deck",
    SELECT_DECK: "Practise ${deck} in Endless",
    SOON: "soon",
    LATER: "later",
    ROUND_END: "done",
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
    SOON: "zaraz",
    LATER: "później",
    ROUND_END: "zaliczone",
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
