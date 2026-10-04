/**
 * Card authoring — templates and the Tab jump.
 *
 * Pure functions, no DOM. Separators always come from the plugin settings
 * (`singleLineCardSeparator`, `singleLineReversedCardSeparator`, …), never hard-coded.
 */

import { splitLeadingTag } from "src/card-authoring/card-detect";

export interface TemplateSeparators {
    singleLineCardSeparator: string;
    singleLineReversedCardSeparator: string;
    multilineCardSeparator: string;
    multilineReversedCardSeparator: string;
}

export interface Template {
    text: string;
    /** Cursor position inside `text` (offset) */
    cursor: number;
}

/** `#ENG |:: ` (cursor before the separator), `:::` when both directions are on. */
export function singleLineTemplate(
    tag: string,
    seps: TemplateSeparators,
    bothDirections: boolean,
): Template {
    const sep = bothDirections
        ? seps.singleLineReversedCardSeparator
        : seps.singleLineCardSeparator;
    const head = `${tag} `;
    return { text: `${head}${sep} `, cursor: head.length };
}

/** Multi-line card with a sentence:  `#ENG` / `|` / `?` / `` */
export function multiLineTemplate(
    tag: string,
    seps: TemplateSeparators,
    bothDirections: boolean,
): Template {
    const sep = bothDirections ? seps.multilineReversedCardSeparator : seps.multilineCardSeparator;
    const head = `${tag}\n`;
    return { text: `${head}\n${sep}\n`, cursor: head.length };
}

export interface TextInsert {
    /** Offset in the document where `text` is inserted */
    at: number;
    text: string;
    /** Cursor offset in the document after the insert */
    cursor: number;
}

/** Appends a template on a new line at the end of the document (never edits existing lines). */
export function appendAtEnd(doc: string, template: Template): TextInsert {
    let prefix = "";
    if (doc.length > 0 && !doc.endsWith("\n")) prefix = "\n";
    // multi-line cards need an empty line before them
    if (template.text.includes("\n") && doc.trim().length > 0 && !/\n\s*\n$/.test(doc + prefix))
        prefix += "\n";
    const text = prefix + template.text;
    return { at: doc.length, text, cursor: doc.length + prefix.length + template.cursor };
}

/**
 * Inserts the next empty template right after a card that ends at `lineEnd`
 * (offset of the end of the card's last line).
 */
export function insertAfter(
    lineEnd: number,
    template: Template,
    cardWasMultiLine: boolean,
): TextInsert {
    const prefix = cardWasMultiLine || template.text.includes("\n") ? "\n\n" : "\n";
    return {
        at: lineEnd,
        text: prefix + template.text,
        cursor: lineEnd + prefix.length + template.cursor,
    };
}

export interface TabAction {
    /** Replace [from, to) of the line with `insert` (both 0 = nothing to insert) */
    from: number;
    to: number;
    insert: string;
    /** New cursor column in the line */
    cursor: number;
}

/**
 * Tab in an unfinished card line jumps from the word to the translation.
 * - `#ENG forestalled|:: ` → cursor after `:: `
 * - `#ENG ushering|` (no separator yet) → adds `:: ` and moves there
 * Returns null anywhere else, so Tab works as usual.
 */
export function tabAction(
    line: string,
    ch: number,
    seps: TemplateSeparators,
    bothDirections: boolean,
): TabAction | null {
    const [tag, rest] = splitLeadingTag(line);
    if (!tag || rest.trimStart().startsWith("#")) return null;
    const restStart = line.length - rest.length;
    if (ch < restStart) return null;

    // longest separator first (`:::` contains `::`)
    const candidates = [seps.singleLineReversedCardSeparator, seps.singleLineCardSeparator]
        .filter((s) => s.length > 0)
        .sort((a, b) => b.length - a.length);
    for (const sep of candidates) {
        const idx = line.indexOf(sep, restStart);
        if (idx < 0) continue;
        if (ch > idx) return null; // already in the translation
        const after = idx + sep.length;
        if (line.slice(after).trim() !== "") return null; // translation already filled in
        if (line[after] === " ") return { from: 0, to: 0, insert: "", cursor: after + 1 };
        return { from: after, to: after, insert: " ", cursor: after + 1 };
    }

    // No separator yet: only at the end of the word
    if (ch < line.trimEnd().length || rest.trim() === "") return null;
    const sep = bothDirections
        ? seps.singleLineReversedCardSeparator
        : seps.singleLineCardSeparator;
    const end = line.trimEnd().length;
    const insert = `${sep} `;
    return { from: end, to: line.length, insert, cursor: end + insert.length };
}
