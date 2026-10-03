/**
 * Speed Streak — HUD color themes.
 *
 * HOW TO ADD A NEW THEME
 * ----------------------
 * Add one object to `SPEED_STREAK_THEMES` below. That's all — it shows up in
 * Settings → Speed Streak → Display → Theme automatically.
 *
 *   {
 *       id: "sakura",                       // unique, lowercase, never change once used
 *       name: { en: "Sakura", pl: "Sakura" },
 *       colors: {
 *           background: "#2a1b24",
 *           backgroundEnd: "#3a2230",       // optional → gradient
 *           good: "#7fd1a8",
 *           ...                              // any subset of SpeedStreakThemeColors
 *       },
 *   },
 *
 * Every color you leave out falls back to the current Obsidian theme, so a theme
 * can be as small as one or two colors. Values are any CSS color
 * (`#hex`, `rgb()`, `hsl()`, or even `var(--some-obsidian-variable)`).
 */

export interface SpeedStreakThemeColors {
    /** Panel background (start of the gradient) */
    background: string;
    /** Panel background end — set to get a diagonal gradient */
    backgroundEnd: string;
    /** Panel border */
    border: string;
    /** Main text (timer digits, streak number) */
    text: string;
    /** Secondary text (labels, record line) */
    muted: string;
    /** Disabled / untimed state */
    faint: string;
    /** Empty part of the timer ring and progress bars */
    track: string;
    /** Background of toast messages */
    toastBackground: string;
    /** Rating colors — also used for the trail dots and the timer gradient
     *  (good → hard → again as time runs out) */
    again: string;
    hard: string;
    good: string;
    easy: string;
    /** Boost button, pips and boost animations */
    boost: string;
    /** Streak icon, records and "new best" glow */
    gold: string;
}

export interface SpeedStreakTheme {
    id: string;
    name: { en: string; pl?: string };
    colors: Partial<SpeedStreakThemeColors>;
}

export const DEFAULT_SPEED_STREAK_THEME_ID = "obsidian";

export const SPEED_STREAK_THEMES: SpeedStreakTheme[] = [
    {
        // Follows the active Obsidian theme (light or dark) — no overrides.
        id: "obsidian",
        name: { en: "Obsidian (follow vault theme)", pl: "Obsidian (jak motyw vaulta)" },
        colors: {},
    },
    // The eight themes below are ported from the Anki add-on.
    {
        id: "classic",
        name: { en: "Classic", pl: "Klasyczny" },
        colors: {
            background: "#071022",
            backgroundEnd: "#0b1530",
            border: "#1d2c52",
            text: "#eef3ff",
            muted: "#8ea0cc",
            faint: "#4d5b80",
            track: "#1a2647",
            toastBackground: "#0b1530",
            again: "#c9546d",
            hard: "#c89a38",
            good: "#2ea36f",
            easy: "#4b7de2",
            boost: "#5b6fcf",
            gold: "#f5aa41",
        },
    },
    {
        id: "cardmatch",
        name: { en: "Card Match", pl: "Jak karta" },
        colors: {
            background: "#2f2f31",
            border: "#444447",
            text: "#e6e6e6",
            muted: "#a0a0a4",
            faint: "#68686c",
            track: "#424245",
            toastBackground: "#3a3a3d",
            again: "#b26a6a",
            hard: "#b786ad",
            good: "#419c5f",
            easy: "#4d8d8d",
            boost: "#84a6c7",
            gold: "#d6a64a",
        },
    },
    {
        id: "graphite",
        name: { en: "Graphite", pl: "Grafit" },
        colors: {
            background: "#1e2126",
            backgroundEnd: "#262b33",
            border: "#363c47",
            text: "#e4e8ef",
            muted: "#9099a8",
            faint: "#5b6370",
            track: "#323843",
            toastBackground: "#262b33",
            again: "#b65b70",
            hard: "#b48c42",
            good: "#3d9b79",
            easy: "#557fd6",
            boost: "#6982b8",
            gold: "#d9a54a",
        },
    },
    {
        id: "midnight",
        name: { en: "Midnight", pl: "Północ" },
        colors: {
            background: "#08090c",
            backgroundEnd: "#121418",
            border: "#22252c",
            text: "#eceef3",
            muted: "#8b90a0",
            faint: "#4c505c",
            track: "#1e2128",
            toastBackground: "#121418",
            again: "#c34f69",
            hard: "#c69430",
            good: "#2b9d73",
            easy: "#4a74dd",
            boost: "#566ed4",
            gold: "#e8b10e",
        },
    },
    {
        id: "forest",
        name: { en: "Forest", pl: "Las" },
        colors: {
            background: "#0d1f1a",
            backgroundEnd: "#173229",
            border: "#24463a",
            text: "#e5f2ec",
            muted: "#8fb3a4",
            faint: "#4f6e62",
            track: "#1f3b31",
            toastBackground: "#173229",
            again: "#b45a62",
            hard: "#b89a43",
            good: "#2d9a66",
            easy: "#3d73b8",
            boost: "#4f8f9c",
            gold: "#d8b04a",
        },
    },
    {
        id: "ember",
        name: { en: "Ember", pl: "Żar" },
        colors: {
            background: "#251317",
            backgroundEnd: "#341b21",
            border: "#4d2830",
            text: "#f6e8e6",
            muted: "#c09a96",
            faint: "#75545a",
            track: "#43232a",
            toastBackground: "#341b21",
            again: "#cf5664",
            hard: "#c98a33",
            good: "#4e9a72",
            easy: "#4d74c9",
            boost: "#c66a4b",
            gold: "#f0b04a",
        },
    },
    {
        id: "violet",
        name: { en: "Violet", pl: "Fiolet" },
        colors: {
            background: "#181427",
            backgroundEnd: "#251d3a",
            border: "#372c55",
            text: "#eeeaf8",
            muted: "#a49cc4",
            faint: "#5f5780",
            track: "#2f2649",
            toastBackground: "#251d3a",
            again: "#c15a7f",
            hard: "#bc8f3d",
            good: "#4b9c82",
            easy: "#5b7ed6",
            boost: "#7761c5",
            gold: "#e3b04f",
        },
    },
    {
        id: "ocean",
        name: { en: "Ocean", pl: "Ocean" },
        colors: {
            background: "#0a1b28",
            backgroundEnd: "#113047",
            border: "#1c4260",
            text: "#e6f1f9",
            muted: "#8fb0c8",
            faint: "#4c6a80",
            track: "#183a55",
            toastBackground: "#113047",
            again: "#bd5c6c",
            hard: "#c39932",
            good: "#2f9a82",
            easy: "#3e79cc",
            boost: "#4d8fc2",
            gold: "#e6b54a",
        },
    },
];

/** Maps theme color keys to the CSS custom properties used by speed-streak.css */
export const THEME_CSS_VARS: Record<keyof SpeedStreakThemeColors, string> = {
    background: "--ss-bg",
    backgroundEnd: "--ss-bg-end",
    border: "--ss-border",
    text: "--ss-text",
    muted: "--ss-muted",
    faint: "--ss-faint",
    track: "--ss-track",
    toastBackground: "--ss-toast-bg",
    again: "--ss-again",
    hard: "--ss-hard",
    good: "--ss-good",
    easy: "--ss-easy",
    boost: "--ss-boost",
    gold: "--ss-gold",
};

export function getSpeedStreakTheme(id: string | undefined | null): SpeedStreakTheme {
    return (
        SPEED_STREAK_THEMES.find((t) => t.id === id) ??
        SPEED_STREAK_THEMES.find((t) => t.id === DEFAULT_SPEED_STREAK_THEME_ID) ??
        SPEED_STREAK_THEMES[0]
    );
}

export function themeDisplayName(theme: SpeedStreakTheme, polish: boolean): string {
    return (polish && theme.name.pl) || theme.name.en;
}

/** Applies (or clears) a theme's CSS variables on an element. */
export function applySpeedStreakTheme(el: HTMLElement, theme: SpeedStreakTheme) {
    for (const [key, cssVar] of Object.entries(THEME_CSS_VARS) as [
        keyof SpeedStreakThemeColors,
        string,
    ][]) {
        const value = theme.colors[key];
        if (value) el.style.setProperty(cssVar, value);
        else el.style.removeProperty(cssVar);
    }
    el.dataset.ssTheme = theme.id;
}

// MARK: Timer color gradient helpers

export type RGB = [number, number, number];

/** Parses `#rgb`, `#rrggbb` and `rgb()/rgba()` strings. Returns null otherwise. */
export function parseColor(value: string): RGB | null {
    const v = value.trim().toLowerCase();
    let m = /^#([0-9a-f]{3})$/.exec(v);
    if (m) {
        return [0, 1, 2].map((i) => parseInt(m[1][i] + m[1][i], 16)) as RGB;
    }
    m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(v);
    if (m) {
        return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as RGB;
    }
    m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(v);
    if (m) return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
    return null;
}

function mix(a: RGB, b: RGB, t: number): RGB {
    return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
}

/**
 * Timer color for the remaining-time fraction (1 = full, 0 = empty):
 * good → hard → again.
 */
export function timerColor(fraction: number, good: RGB, hard: RGB, again: RGB): string {
    const f = Math.max(0, Math.min(1, fraction));
    const c = f >= 0.5 ? mix(hard, good, (f - 0.5) * 2) : mix(again, hard, f * 2);
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
