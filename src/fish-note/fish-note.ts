/**
 * Fish note — a note made for flashcards (button "New fish note" in the file explorer).
 *
 * It is an ordinary `.md` file (it can be moved to any folder, synced, edited like any note);
 * the frontmatter marks it and names its deck:
 *
 *     ---
 *     cssclasses:
 *       - fishnote
 *     fishcards: "#DEN"
 *     ---
 *
 * `cssclasses` gives the compact look (fish-note.css), `fishcards` the deck for new cards.
 * Cards inside are written exactly like everywhere else (`#DEN Hund:: pies`).
 *
 * Pure logic, no DOM. Easy to unit test.
 */

import { normalizeDeckTag } from "src/card-authoring/card-authoring-settings";
import type { Template } from "src/card-authoring/card-template";

export const FISH_NOTE_CLASS = "fishnote";
export const FISH_NOTE_DECK_KEY = "fishcards";

export interface FishNoteText {
    text: string;
    /** Cursor offset in `text` (inside the first card template) */
    cursor: number;
}

/**
 * Text of a new fish note: the frontmatter, a flashcard tag line when the deck tag alone does
 * not make the note a flashcard note, and the first empty card.
 */
export function fishNoteText(
    deckTag: string,
    flashcardTag: string | null,
    template: Template,
): FishNoteText {
    const head = [
        "---",
        "cssclasses:",
        `  - ${FISH_NOTE_CLASS}`,
        `${FISH_NOTE_DECK_KEY}: "${deckTag}"`,
        "---",
        "",
    ].join("\n");
    const tagLine = flashcardTag ? `${flashcardTag}\n\n` : "";
    const before = head + tagLine;
    return { text: before + template.text, cursor: before.length + template.cursor };
}

/** The deck tag of a fish note from its frontmatter, or null when it is not a fish note. */
export function fishNoteDeckTag(frontmatter: unknown): string | null {
    if (!frontmatter || typeof frontmatter !== "object") return null;
    const value = (frontmatter as Record<string, unknown>)[FISH_NOTE_DECK_KEY];
    if (typeof value !== "string") return null;
    return normalizeDeckTag(value) || null;
}

/** The note is a fish note (marked by the deck key or by the css class). */
export function isFishNote(frontmatter: unknown): boolean {
    if (fishNoteDeckTag(frontmatter) !== null) return true;
    if (!frontmatter || typeof frontmatter !== "object") return false;
    const classes = (frontmatter as Record<string, unknown>).cssclasses;
    const list = Array.isArray(classes) ? classes : typeof classes === "string" ? [classes] : [];
    return list.some((c) => String(c).trim() === FISH_NOTE_CLASS);
}

/** A file name from what the user typed: no characters that are not allowed, never empty. */
export function fishNoteFileName(name: string, fallback: string): string {
    const clean = String(name ?? "")
        .replace(/\.md$/i, "")
        .replace(/[\\/:*?"<>|#^[\]]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^\.+/, "");
    return `${clean || fallback}.md`;
}

/** `Folder/Name.md`, `Folder/Name 2.md`, … — the first path that is free. */
export function uniqueNotePath(
    folder: string,
    fileName: string,
    exists: (path: string) => boolean,
): string {
    const dir = folder && folder !== "/" ? `${folder.replace(/\/+$/, "")}/` : "";
    const base = fileName.replace(/\.md$/i, "");
    for (let i = 1; i < 1000; i++) {
        const path = `${dir}${i === 1 ? base : `${base} ${i}`}.md`;
        if (!exists(path)) return path;
    }
    return `${dir}${base} ${Date.now()}.md`;
}
