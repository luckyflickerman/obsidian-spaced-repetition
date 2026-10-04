import type { AddonId } from "src/addons/addons";
import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    TITLE: "Add-ons",
    BUTTON: "Add-ons",
    INTRO: "Extras added to Spaced Repetition. The same options are also in Settings → Spaced Repetition.",
    SETTINGS: "Settings",
    NAME_HEATMAP: "Review calendar",
    DESC_HEATMAP: "A year of colored squares below the deck list, with statistics and streaks.",
    NAME_TTS: "Read aloud",
    DESC_TTS: "Reads the words marked with <u>…</u> aloud after the answer is revealed.",
    "NAME_SPEED-STREAK": "Speed Streak",
    "DESC_SPEED-STREAK": "Timer + streak game during flashcard review.",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    TITLE: "Dodatki",
    BUTTON: "Dodatki",
    INTRO: "Dodatki do Spaced Repetition. Te same opcje są też w Ustawieniach → Spaced Repetition.",
    SETTINGS: "Ustawienia",
    NAME_HEATMAP: "Kalendarz powtórek",
    DESC_HEATMAP: "Rok kolorowych kwadratów pod listą talii, ze statystykami i seriami dni.",
    NAME_TTS: "Czytanie na głos",
    DESC_TTS: "Czyta na głos słowa oznaczone <u>…</u> po odsłonięciu odpowiedzi.",
    "NAME_SPEED-STREAK": "Speed Streak",
    "DESC_SPEED-STREAK": "Gra z timerem i serią podczas powtórek fiszek.",
};

export function ad(key: Keys): string {
    return (isPolish() ? PL[key] : EN[key]) ?? EN[key];
}

export function addonName(id: AddonId): string {
    return ad(`NAME_${id.toUpperCase()}` as Keys);
}

export function addonDescription(id: AddonId): string {
    return ad(`DESC_${id.toUpperCase()}` as Keys);
}
