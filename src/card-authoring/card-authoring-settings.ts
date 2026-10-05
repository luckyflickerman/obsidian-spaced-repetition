/**
 * Card authoring — settings: card decks (tag → file → reading language) and
 * the helpers (second direction, editor icons, daily counter, images).
 *
 * Pure logic, no DOM. Easy to unit test.
 */

import { normalizeLangCode } from "src/tts/tts-settings";

export interface CardDeck {
    /** Deck tag written at the start of each card, e.g. `#ENG` */
    tag: string;
    /** One file per deck; new cards are appended at its end */
    file: string;
    /** Reading language for the deck (used like a read-aloud rule), e.g. `en-GB` */
    lang: string;
}

export interface CardAuthoringSettings {
    decks: CardDeck[];
    /** Tag of the deck used last (the template uses it) */
    lastDeckTag: string;
    /** Also review Polish → foreign right away (`:::` / `??` separators) */
    bothDirections: boolean;
    /** Preview / unfinished icons next to cards in the editor */
    editorIcons: boolean;
    /** New cards to create per day */
    dailyGoal: number;
    /** "New today" in the status bar (computer) / a notice after a card (phone) */
    showDailyCounter: boolean;
    /** Daily goal block above the review calendar in the deck list */
    goalInDeckList: boolean;
    /** Rename "Pasted image …" pasted into a card line after its word */
    renamePastedImages: boolean;
    /** Shrink large photos before saving them */
    resizeImages: boolean;
    maxImageWidth: number;
    /** Show a small icon instead of the long <!--SR:…--> text in the editor (display only) */
    compactScheduleComments: boolean;
}

export const DEFAULT_CARD_AUTHORING_SETTINGS: CardAuthoringSettings = {
    decks: [
        { tag: "#ENG", file: "Fiszki/Angielski.md", lang: "en-GB" },
        { tag: "#ESP", file: "Fiszki/Hiszpański.md", lang: "es-ES" },
    ],
    lastDeckTag: "#ENG",
    bothDirections: true,
    editorIcons: true,
    dailyGoal: 10,
    showDailyCounter: true,
    goalInDeckList: true,
    renamePastedImages: true,
    resizeImages: true,
    maxImageWidth: 800,
    compactScheduleComments: true,
};

/** `ENG`, ` #ENG ` → `#ENG`; "" when empty or invalid. */
export function normalizeDeckTag(tag: string): string {
    const t = String(tag ?? "")
        .trim()
        .replace(/\s+/g, "");
    if (!t || t === "#") return "";
    return t.startsWith("#") ? t : `#${t}`;
}

/** `Fiszki/Angielski` → `Fiszki/Angielski.md`; no leading slash. */
export function normalizeDeckFile(file: string): string {
    let f = String(file ?? "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
    if (!f) return "";
    if (!/\.md$/i.test(f)) f += ".md";
    return f;
}

export function normalizeCardAuthoringSettings(
    stored: Partial<CardAuthoringSettings> | null | undefined,
): CardAuthoringSettings {
    const s = stored && typeof stored === "object" ? stored : {};
    const d = DEFAULT_CARD_AUTHORING_SETTINGS;
    const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
    const num = (v: unknown, def: number, min: number, max: number) => {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n))) : def;
    };
    const decks: CardDeck[] = [];
    const source = Array.isArray(s.decks) ? s.decks : d.decks;
    for (const deck of source) {
        if (!deck || typeof deck !== "object") continue;
        const tag = normalizeDeckTag(deck.tag);
        if (!tag || decks.some((x) => x.tag.toLowerCase() === tag.toLowerCase())) continue;
        decks.push({
            tag,
            file: normalizeDeckFile(deck.file) || `Fiszki/${tag.slice(1)}.md`,
            lang: normalizeLangCode(deck.lang ?? ""),
        });
    }
    const last = normalizeDeckTag(s.lastDeckTag ?? "");
    return {
        decks,
        lastDeckTag: decks.some((x) => x.tag === last) ? last : (decks[0]?.tag ?? ""),
        bothDirections: bool(s.bothDirections, d.bothDirections),
        editorIcons: bool(s.editorIcons, d.editorIcons),
        dailyGoal: num(s.dailyGoal, d.dailyGoal, 1, 999),
        showDailyCounter: bool(s.showDailyCounter, d.showDailyCounter),
        goalInDeckList: bool(s.goalInDeckList, d.goalInDeckList),
        renamePastedImages: bool(s.renamePastedImages, d.renamePastedImages),
        resizeImages: bool(s.resizeImages, d.resizeImages),
        maxImageWidth: num(s.maxImageWidth, d.maxImageWidth, 200, 4000),
        compactScheduleComments: bool(s.compactScheduleComments, d.compactScheduleComments),
    };
}

/** Deck with this tag (case-insensitive), also for sub-tags (`#ENG/verbs` → `#ENG`). */
export function deckForTag(settings: CardAuthoringSettings, tag: string | null): CardDeck | null {
    if (!tag) return null;
    const t = tag.toLowerCase();
    return (
        settings.decks.find((d) => d.tag.toLowerCase() === t) ??
        settings.decks.find((d) => t.startsWith(d.tag.toLowerCase() + "/")) ??
        null
    );
}

/** Deck whose file is this path. */
export function deckForFile(settings: CardAuthoringSettings, path: string): CardDeck | null {
    const p = normalizeDeckFile(path).toLowerCase();
    return settings.decks.find((d) => d.file.toLowerCase() === p) ?? null;
}

/** The deck the "New card" template uses: the last one used, else the first. */
export function currentDeck(settings: CardAuthoringSettings): CardDeck | null {
    return deckForTag(settings, settings.lastDeckTag) ?? settings.decks[0] ?? null;
}
