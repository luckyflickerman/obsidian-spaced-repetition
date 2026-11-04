/**
 * Deck list — the notes that hold a deck's cards (the note icon next to a deck).
 *
 * Pure logic, no Obsidian. One entry per note, with its number of cards; the note with the
 * most cards first, then by name.
 */

export interface DeckNote<T> {
    path: string;
    /** File name without the folder and ".md" */
    name: string;
    cards: number;
    /** The file object of the first card from this note (to open it) */
    file: T;
}

export function noteName(path: string): string {
    const base = path.split("/").pop() ?? path;
    return base.replace(/\.md$/i, "");
}

export function deckNotes<T>(cards: Array<{ path: string; file: T }>): DeckNote<T>[] {
    const notes = new Map<string, DeckNote<T>>();
    for (const card of cards) {
        const note = notes.get(card.path);
        if (note) note.cards++;
        else
            notes.set(card.path, {
                path: card.path,
                name: noteName(card.path),
                cards: 1,
                file: card.file,
            });
    }
    return [...notes.values()].sort(
        (a, b) => b.cards - a.cards || a.name.localeCompare(b.name) || a.path.localeCompare(b.path),
    );
}
