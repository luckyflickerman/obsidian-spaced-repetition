import type { AddonId } from "src/addons/addons";
import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    TITLE: "Upgraded Spaced Repetition options",
    BUTTON: "Options",
    OPTIONS: "Options",
    PLUGINS: "Built-in plugins",
    SETTINGS: "Settings",
    NAME_HEATMAP: "Review calendar",
    DESC_HEATMAP: "A year of colored squares below the deck list, with statistics and streaks.",
    "NAME_DAILY-GOAL": "Daily goal",
    "DESC_DAILY-GOAL": "New cards to create per day, in its own block above the review calendar.",
    NAME_TTS: "Read aloud",
    DESC_TTS: "Reads the words marked with <u>…</u> aloud after the answer is revealed.",
    "NAME_SPEED-STREAK": "Speed Streak",
    "DESC_SPEED-STREAK": "Timer + streak game during flashcard review.",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    TITLE: "Opcje Upgraded Spaced Repetition",
    BUTTON: "Opcje",
    OPTIONS: "Opcje",
    PLUGINS: "Wbudowane wtyczki",
    SETTINGS: "Ustawienia",
    NAME_HEATMAP: "Kalendarz powtórek",
    DESC_HEATMAP: "Rok kolorowych kwadratów pod listą talii, ze statystykami i seriami dni.",
    "NAME_DAILY-GOAL": "Cel dzienny",
    "DESC_DAILY-GOAL": "Ile nowych fiszek dziennie do stworzenia, w osobnym bloku nad kalendarzem.",
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
