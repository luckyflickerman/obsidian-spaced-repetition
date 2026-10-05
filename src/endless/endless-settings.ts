/**
 * Endless mode — settings: which decks were ticked last time, and the warning
 * for small pools.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

/** Endless works best from this many cards; fewer → a warning before the start. */
export const ENDLESS_MIN_CARDS = 100;

export interface EndlessSettings {
    /** Ticked decks as topic paths, e.g. "flashcards/ENG" ("" = all decks) */
    selectedDecks: string[];
    /** "Don't show again" in the warning for fewer than ENDLESS_MIN_CARDS cards */
    hideFewCardsWarning: boolean;
}

export const DEFAULT_ENDLESS_SETTINGS: EndlessSettings = {
    selectedDecks: [],
    hideFewCardsWarning: false,
};

export function normalizeEndlessSettings(
    stored: Partial<EndlessSettings> | null | undefined,
): EndlessSettings {
    const s = stored && typeof stored === "object" ? stored : {};
    const selected = Array.isArray(s.selectedDecks) ? s.selectedDecks : [];
    return {
        selectedDecks: [
            ...new Set(selected.filter((x): x is string => typeof x === "string")),
        ].slice(0, 500),
        hideFewCardsWarning:
            typeof s.hideFewCardsWarning === "boolean"
                ? s.hideFewCardsWarning
                : DEFAULT_ENDLESS_SETTINGS.hideFewCardsWarning,
    };
}

/** Show the "few cards" warning before starting with `cardCount` cards? */
export function needsFewCardsWarning(cardCount: number, settings: EndlessSettings): boolean {
    return !settings.hideFewCardsWarning && cardCount > 0 && cardCount < ENDLESS_MIN_CARDS;
}

/** Deck key used in `selectedDecks`. */
export function deckKey(topicPath: string[]): string {
    return topicPath.join("/");
}

/** Ticks / unticks a deck. A ticked parent covers its subdecks, so they are dropped. */
export function toggleDeck(selected: string[], key: string): string[] {
    if (selected.includes(key)) return selected.filter((k) => k !== key);
    const isChild = (k: string) => key === "" || k.startsWith(key + "/");
    return [...selected.filter((k) => !isChild(k)), key];
}

/** True when the deck or one of its parents is ticked. */
export function isDeckCovered(selected: string[], key: string): boolean {
    return selected.some((k) => k === key || k === "" || key.startsWith(k + "/"));
}
