/**
 * Read aloud (TTS) — settings, language rules and voice selection.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

import { ruleMatches } from "src/speed-streak/speed-streak-settings";

export interface TtsSettings {
    enabled: boolean;
    /** Read automatically when the answer is revealed */
    autoPlay: boolean;
    /** Voice provider id, see `TTS_PROVIDERS` in tts-provider.ts */
    provider: string;
    /** Rules, one per line: `#hiszpanski = es-ES`, `languages/german = de-DE` */
    languageRules: string;
    /** Language used when no rule matches ("" = don't read such cards) */
    defaultLanguage: string;
    /** Chosen voice per language code (`es-ES` → voice id). Missing / "" = automatic */
    voices: Record<string, string>;
    /** Speech rate, 0.5–1.5 */
    rate: number;
    /** Volume, 0–100 */
    volume: number;
    /** Read the whole answer when nothing is marked with <u>…</u> */
    readWholeAnswer: boolean;
    /** Speed Streak: freeze the answer timer while speaking */
    pauseSpeedStreak: boolean;
    /** Single key in the review view that reads the answer again ("" = off) */
    replayHotkey: string;
}

export const DEFAULT_TTS_SETTINGS: TtsSettings = {
    enabled: true,
    autoPlay: true,
    provider: "system",
    languageRules: "",
    defaultLanguage: "",
    voices: {},
    rate: 0.85,
    volume: 100,
    readWholeAnswer: true,
    pauseSpeedStreak: true,
    replayHotkey: "r",
};

export const TTS_RATE_MIN = 0.5;
export const TTS_RATE_MAX = 1.5;

/** Merges stored (possibly partial / outdated) settings with defaults. */
export function normalizeTtsSettings(stored: Partial<TtsSettings> | null | undefined): TtsSettings {
    const merged: TtsSettings = Object.assign(
        {},
        DEFAULT_TTS_SETTINGS,
        stored && typeof stored === "object" ? stored : {},
    );
    const d = DEFAULT_TTS_SETTINGS;
    const num = (v: unknown, def: number, min: number, max: number) => {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        if (!Number.isFinite(n)) return def;
        return Math.min(max, Math.max(min, n));
    };
    const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);

    merged.enabled = bool(merged.enabled, d.enabled);
    merged.autoPlay = bool(merged.autoPlay, d.autoPlay);
    merged.readWholeAnswer = bool(merged.readWholeAnswer, d.readWholeAnswer);
    merged.pauseSpeedStreak = bool(merged.pauseSpeedStreak, d.pauseSpeedStreak);
    merged.rate = Math.round(num(merged.rate, d.rate, TTS_RATE_MIN, TTS_RATE_MAX) * 100) / 100;
    merged.volume = Math.round(num(merged.volume, d.volume, 0, 100));
    merged.provider =
        typeof merged.provider === "string" && merged.provider ? merged.provider : d.provider;
    merged.languageRules = String(merged.languageRules ?? "");
    merged.defaultLanguage = normalizeLangCode(String(merged.defaultLanguage ?? ""));
    merged.replayHotkey = String(merged.replayHotkey ?? "")
        .slice(0, 1)
        .toLowerCase();

    const voices: Record<string, string> = {};
    if (merged.voices && typeof merged.voices === "object" && !Array.isArray(merged.voices)) {
        for (const [lang, voice] of Object.entries(merged.voices)) {
            const code = normalizeLangCode(lang);
            if (code && typeof voice === "string") voices[code] = voice;
        }
    }
    merged.voices = voices;
    return merged;
}

// MARK: Language codes

/**
 * `es_ES` → `es-ES`, `EN-gb` → `en-GB`, `zh_hans_cn` → `zh-Hans-CN`.
 * Returns "" for anything that doesn't look like a language tag.
 */
export function normalizeLangCode(code: string): string {
    const raw = (code ?? "").trim().replace(/_/g, "-");
    if (!raw) return "";
    // Android sometimes reports e.g. "spa-ESP"; keep it but normalize case
    if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(raw)) return "";
    const parts = raw.split("-");
    return parts
        .map((part, i) => {
            if (i === 0) return part.toLowerCase();
            if (part.length === 4 && /^[A-Za-z]+$/.test(part))
                return part[0].toUpperCase() + part.slice(1).toLowerCase(); // script
            if (part.length === 2 || /^\d{3}$/.test(part)) return part.toUpperCase(); // region
            return part.toLowerCase();
        })
        .join("-");
}

/** `es-ES` → `es` */
export function langBase(code: string): string {
    return normalizeLangCode(code).split("-")[0] ?? "";
}

// MARK: Language rules

export interface TtsLanguageRule {
    /** Tag or deck path, lowercase (e.g. `#hiszpanski`, `languages/german`) */
    matcher: string;
    /** Normalized language code (e.g. `es-ES`) */
    lang: string;
}

/**
 * Parses rules, one per line:
 *   #hiszpanski = es-ES
 *   languages/german = de-DE
 * Lines starting with `//` or `%` are comments. Invalid lines are skipped.
 */
export function parseLanguageRules(text: string): TtsLanguageRule[] {
    const rules: TtsLanguageRule[] = [];
    for (const line of (text ?? "").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("%")) continue;
        const eq = trimmed.search(/[=:]/);
        if (eq <= 0) continue;
        const matcher = trimmed.slice(0, eq).trim().toLowerCase();
        const lang = normalizeLangCode(trimmed.slice(eq + 1));
        if (!matcher || !lang) continue;
        rules.push({ matcher, lang });
    }
    return rules;
}

/**
 * Language of a card: the first rule matching the note's tags or the deck path,
 * otherwise the default language. `null` = the card is not read.
 */
export function resolveCardLanguage(
    rules: TtsLanguageRule[],
    tags: string[],
    deckPath: string,
    defaultLanguage: string = "",
): string | null {
    const rule = rules.find((r) => ruleMatches(r.matcher, tags, deckPath));
    if (rule) return rule.lang;
    const def = normalizeLangCode(defaultLanguage);
    return def || null;
}

/** Distinct languages used by the rules (+ default language), in order. */
export function configuredLanguages(settings: TtsSettings): string[] {
    const langs: string[] = [];
    for (const rule of parseLanguageRules(settings.languageRules)) {
        if (!langs.includes(rule.lang)) langs.push(rule.lang);
    }
    if (settings.defaultLanguage && !langs.includes(settings.defaultLanguage))
        langs.push(settings.defaultLanguage);
    return langs;
}

// MARK: Voices

export interface TtsVoice {
    /** Stable id (voiceURI for system voices) */
    id: string;
    name: string;
    /** Normalized language code */
    lang: string;
    /** Installed on the device (works offline) */
    localService: boolean;
    isDefault: boolean;
}

/** Voices for a language: exact code first, then the same base language. */
export function voicesForLanguage(voices: TtsVoice[], lang: string): TtsVoice[] {
    const code = normalizeLangCode(lang);
    if (!code) return [];
    const base = langBase(code);
    const exact = voices.filter((v) => normalizeLangCode(v.lang) === code);
    const sameBase = voices.filter(
        (v) => normalizeLangCode(v.lang) !== code && langBase(v.lang) === base,
    );
    return [...exact, ...sameBase];
}

const QUALITY_HINTS = /natural|neural|premium|enhanced|wavenet|online|siri/i;

function voiceScore(voice: TtsVoice): number {
    let score = 0;
    if (QUALITY_HINTS.test(voice.name)) score += 4;
    if (voice.localService) score += 1;
    if (voice.isDefault) score += 1;
    return score;
}

/**
 * Picks the voice for a language.
 * 1. The user's chosen voice (`preferredId`), if it is still installed.
 * 2. Otherwise the best voice with the exact code (`es-ES`), then the same base
 *    language (`es-MX`, `es`). "Best" = natural/neural/premium voices first.
 */
export function chooseVoice(
    voices: TtsVoice[],
    lang: string,
    preferredId?: string,
): TtsVoice | null {
    if (preferredId) {
        const preferred = voices.find((v) => v.id === preferredId);
        if (preferred) return preferred;
    }
    const code = normalizeLangCode(lang);
    if (!code) return null;
    const base = langBase(code);
    const pickBest = (list: TtsVoice[]) =>
        list.reduce<TtsVoice | null>(
            (best, v) => (best === null || voiceScore(v) > voiceScore(best) ? v : best),
            null,
        );
    const exact = pickBest(voices.filter((v) => normalizeLangCode(v.lang) === code));
    if (exact) return exact;
    return pickBest(voices.filter((v) => langBase(v.lang) === base));
}
