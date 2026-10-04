/**
 * Card authoring — finding flashcards (and unfinished ones) in note text.
 *
 * Pure functions, no DOM. Uses the plugin's own parser (`parse` in
 * src/parser.ts) and the same rules for decks, so what the editor shows is
 * what the review will show:
 * - a note is read only when it has a tag from `flashcardTags` (anywhere in
 *   the note, including tags at the start of card lines);
 * - a tag at the start of a card (`#ENG word:: translation`) is that card's
 *   deck; otherwise the last note-level tag above the card (or the frontmatter).
 */

import { CardType } from "src/data/data-structures/card/questions/question";
import { CardFrontBackUtil } from "src/data/data-structures/card/questions/question-type";
import type { SRSettings } from "src/data/settings";
import { SettingsUtil } from "src/data/settings";
import { parse, ParserOptions } from "src/parser";
import { splitNoteIntoFrontmatterAndContent } from "src/utils/strings";

/** The settings the detection depends on (a subset of the plugin settings). */
export type CardDetectSettings = Pick<
    SRSettings,
    | "flashcardTags"
    | "singleLineCardSeparator"
    | "singleLineReversedCardSeparator"
    | "multilineCardSeparator"
    | "multilineReversedCardSeparator"
    | "multilineCardEndMarker"
    | "clozePatterns"
    | "convertClozePatternsToInputs"
>;

export interface DetectedCard {
    /** Line numbers (0-based, inclusive), including the `<!--SR:…-->` line */
    firstLine: number;
    lastLine: number;
    type: CardType;
    /** Deck tag of the card (`#ENG`), null when none could be found */
    deckTag: string | null;
    /** Tag written at the start of the card itself, if any */
    lineTag: string | null;
    /** Question (front) and answer (back), without the tag and the schedule */
    question: string;
    answer: string;
    /** `:::` / `??` cards: also reviewed from the answer side */
    reversed: boolean;
    /** The `<!--SR:…-->` comment, if the card was already reviewed */
    schedule: string | null;
    /** Question and answer both filled in (always true for cloze cards) */
    complete: boolean;
}

/** A line that looks like the start of a card but has no separator (`#ENG ushering`). */
export interface UnfinishedLine {
    line: number;
    deckTag: string;
    text: string;
}

export interface DetectResult {
    /** The note has a flashcard tag, so the plugin reads its cards */
    isFlashcardNote: boolean;
    cards: DetectedCard[];
    unfinished: UnfinishedLine[];
}

const TAG_AT_START = /^#[^\s#]+/;
const SR_COMMENT = /<!--SR:[\s\S]*?-->/g;
/** `#tag` that is not a heading and not inside a word */
const TAG_IN_TEXT = /(?:^|\s)(#[^\s#,.;:!?()[\]{}"'`<>|\\]+)/g;

function parserOptions(s: CardDetectSettings): ParserOptions {
    return {
        singleLineCardSeparator: s.singleLineCardSeparator,
        singleLineReversedCardSeparator: s.singleLineReversedCardSeparator,
        multilineCardSeparator: s.multilineCardSeparator,
        multilineReversedCardSeparator: s.multilineReversedCardSeparator,
        multilineCardEndMarker: s.multilineCardEndMarker,
        clozePatterns: s.clozePatterns,
    };
}

/** Tags of a note: frontmatter `tags:` and `#tags` in the text (outside code blocks). */
export function extractNoteTags(text: string): string[] {
    const tags: string[] = [];
    const [frontmatter, content] = splitNoteIntoFrontmatterAndContent(text ?? "");
    if (frontmatter) {
        const fm = /^tags?:[ \t]*(.*)$/m.exec(frontmatter);
        if (fm) {
            const inline = fm[1].replace(/[[\]]/g, "");
            const listed: string[] = [];
            if (inline.trim()) {
                listed.push(...inline.split(/[,\s]+/));
            } else {
                // YAML list: the "  - tag" lines right below "tags:"
                for (const line of frontmatter
                    .slice(fm.index + fm[0].length)
                    .split("\n")
                    .slice(1)) {
                    const item = /^\s+-\s+(\S+)/.exec(line);
                    if (!item) break;
                    listed.push(item[1]);
                }
            }
            for (const t of listed) {
                const tag = t.trim().replace(/^["']|["']$/g, "");
                if (tag) tags.push(tag.startsWith("#") ? tag : `#${tag}`);
            }
        }
    }
    let inCode = false;
    for (const line of content.split(/\r?\n/)) {
        if (/^\s*(```|~~~)/.test(line)) {
            inCode = !inCode;
            continue;
        }
        if (inCode) continue;
        for (const m of line.matchAll(TAG_IN_TEXT)) tags.push(m[1]);
    }
    return tags;
}

/** Does the plugin read flashcards from this note? */
export function isFlashcardNote(text: string, settings: CardDetectSettings): boolean {
    return extractNoteTags(text).some((tag) =>
        SettingsUtil.isTagInList(settings.flashcardTags, tag),
    );
}

/** Removes the scheduling comment(s). */
export function stripSchedule(text: string): string {
    return text.replace(SR_COMMENT, "").trimEnd();
}

/** Splits `#TAG rest` into the tag and the rest (leading whitespace removed). */
export function splitLeadingTag(text: string): [string | null, string] {
    const trimmed = text.trimStart();
    const m = TAG_AT_START.exec(trimmed);
    if (!m) return [null, text];
    return [m[0], trimmed.slice(m[0].length).trimStart()];
}

function isReversedType(type: CardType): boolean {
    return type === CardType.SingleLineReversed || type === CardType.MultiLineReversed;
}

/** Note-level tag lines (a line made only of tags), with their line numbers. */
function noteLevelTags(
    lines: string[],
    cardLines: Set<number>,
): Array<{ line: number; tag: string }> {
    const result: Array<{ line: number; tag: string }> = [];
    lines.forEach((line, i) => {
        if (cardLines.has(i)) return;
        const trimmed = line.trim();
        if (!trimmed.startsWith("#") || /^#+\s/.test(trimmed)) return;
        const words = trimmed.split(/\s+/);
        if (words.every((w) => w.startsWith("#") && w.length > 1))
            result.push({ line: i, tag: words[0] });
    });
    return result;
}

/** Finds the cards (and unfinished card lines) in a note's text. */
export function detectCards(
    text: string,
    settings: CardDetectSettings,
    options: {
        /** The caller already knows the whole note has a flashcard tag (e.g. a slice of it) */
        assumeFlashcardNote?: boolean;
    } = {},
): DetectResult {
    const source = (text ?? "").replace(/\r\n/g, "\n");
    if (!options.assumeFlashcardNote && !isFlashcardNote(source, settings))
        return { isFlashcardNote: false, cards: [], unfinished: [] };

    const [frontmatter, content] = splitNoteIntoFrontmatterAndContent(source);
    const lines = content.split("\n");
    const frontmatterTag = frontmatter
        ? (extractNoteTags(`${frontmatter}\n---\n`)[0] ?? null)
        : null;

    const parsed = parse(content, parserOptions(settings));
    const cardLines = new Set<number>();
    for (const p of parsed) for (let i = p.firstLineNum; i <= p.lastLineNum; i++) cardLines.add(i);
    const noteTags = noteLevelTags(lines, cardLines);
    const deckAbove = (line: number): string | null => {
        let tag = frontmatterTag;
        for (const t of noteTags) {
            if (t.line < line) tag = t.tag;
            else break;
        }
        return tag;
    };

    const cards: DetectedCard[] = parsed.map((p) => {
        const schedule = (p.text.match(SR_COMMENT) ?? [null])[0];
        const [lineTag, body] = splitLeadingTag(stripSchedule(p.text));
        let question = body;
        let answer = "";
        if (p.cardType !== CardType.Cloze) {
            const sides = CardFrontBackUtil.expand(p.cardType, body, settings as SRSettings)[0];
            question = (sides?.front ?? "").trim();
            answer = (sides?.back ?? "").trim();
        }
        return {
            firstLine: p.firstLineNum,
            lastLine: p.lastLineNum,
            type: p.cardType,
            deckTag: lineTag ?? deckAbove(p.firstLineNum),
            lineTag,
            question,
            answer,
            reversed: isReversedType(p.cardType),
            schedule,
            complete: p.cardType === CardType.Cloze || (question !== "" && answer !== ""),
        };
    });

    // Lines that start like a card (`#ENG ushering`) but have no separator
    const unfinished: UnfinishedLine[] = [];
    let inCode = false;
    lines.forEach((line, i) => {
        if (/^\s*(```|~~~)/.test(line)) inCode = !inCode;
        if (inCode || cardLines.has(i)) return;
        const [tag, rest] = splitLeadingTag(line);
        if (!tag || !rest.trim() || rest.trimStart().startsWith("#")) return;
        unfinished.push({ line: i, deckTag: tag, text: rest.trim() });
    });

    return { isFlashcardNote: true, cards, unfinished };
}

/** The card that contains the given line, if any. */
export function cardAtLine(cards: DetectedCard[], line: number): DetectedCard | null {
    return cards.find((c) => line >= c.firstLine && line <= c.lastLine) ?? null;
}

/**
 * Direction of a single card of a question: the reversed sibling (index 1 of a
 * `:::` / `??` card) asks with the answer side.
 */
export function isReversedSibling(type: CardType, cardIndex: number): boolean {
    return isReversedType(type) && cardIndex === 1;
}

/** Next review date(s) from a `<!--SR:!2026-10-07,3,250-->` comment (one per direction). */
export function scheduleDates(schedule: string | null): string[] {
    if (!schedule) return [];
    return [...schedule.matchAll(/!(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
}
