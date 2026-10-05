/**
 * Endless mode — settings: which decks were ticked last time.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

export interface EndlessSettings {
    /** Ticked decks as topic paths, e.g. "flashcards/ENG" ("" = all decks) */
    selectedDecks: string[];
}

export const DEFAULT_ENDLESS_SETTINGS: EndlessSettings = {
    selectedDecks: [],
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
    };
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
