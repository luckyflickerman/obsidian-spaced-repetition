/**
 * Read aloud (TTS) — text processing.
 *
 * Pure functions, no DOM: finding `<u>…</u>` fragments in card markdown,
 * turning markdown into plain speakable text, splitting long text into
 * sentences and toggling `<u>` in the editor.
 */

import { normalizeLangCode } from "src/tts/tts-settings";

export interface SpeechSegment {
    text: string;
    /** Normalized language override from `<u lang="…">`, "" = card language */
    lang: string;
}

const U_TAG = /<u(\s[^>]*)?>([\s\S]*?)<\/u\s*>/gi;
const LANG_ATTR = /\blang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/** Reads the `lang` attribute from the attribute part of a tag. */
export function parseLangAttribute(attributes: string | undefined): string {
    if (!attributes) return "";
    const m = LANG_ATTR.exec(attributes);
    if (!m) return "";
    return normalizeLangCode(m[1] ?? m[2] ?? m[3] ?? "");
}

/** All `<u>` fragments of the markdown, in order, as clean speakable text. */
export function extractMarkedSegments(markdown: string): SpeechSegment[] {
    const segments: SpeechSegment[] = [];
    const source = stripComments(markdown ?? "");
    for (const m of source.matchAll(U_TAG)) {
        const text = cleanMarkdownForSpeech(m[2]);
        if (!text) continue;
        segments.push({ text, lang: parseLangAttribute(m[1]) });
    }
    return segments;
}

function stripComments(text: string): string {
    return text
        .replace(/<!--[\s\S]*?-->/g, " ") // HTML + <!--SR:…--> scheduling comments
        .replace(/%%[\s\S]*?%%/g, " "); // Obsidian comments
}

const ENTITIES: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    "#39": "'",
};

/**
 * Turns card markdown into plain text that sounds right when spoken: removes
 * comments, images, links (keeps their text), tags, cloze markers, formatting,
 * HTML, math and code blocks.
 */
export function cleanMarkdownForSpeech(markdown: string): string {
    let text = stripComments(markdown ?? "");
    text = text
        // code blocks & math blocks are not speakable
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/\$\$[\s\S]*?\$\$/g, " ")
        .replace(/\$[^$\n]+\$/g, " ")
        // images & embeds
        .replace(/!\[\[[^\]]*\]\]/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        // wiki links: [[note|alias]] → alias, [[note#heading]] → note
        .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
        .replace(/\[\[([^\]#^]*)(?:[#^][^\]]*)?\]\]/g, (_m, target: string) => {
            const name = target.split("/").pop() ?? target;
            return name.replace(/\.md$/i, "");
        })
        // markdown links: [text](url) → text, bare urls dropped
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\bhttps?:\/\/\S+/g, " ")
        // anki-style cloze {{c1::answer::hint}} → answer, {{answer}} → answer
        .replace(/\{\{(?:c\d+::)?([^}]*?)(?:::[^}]*)?\}\}/g, "$1")
        // callout headers, block ids, footnotes
        .replace(/^\s*>\s*\[![^\]]*\][+-]?/gm, " ")
        .replace(/(^|\s)\^[A-Za-z0-9-]+\s*$/gm, "$1")
        .replace(/\[\^[^\]]*\]/g, " ")
        // html tags (keep their content)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?[A-Za-z][^>]*>/g, "")
        // tags: #tag, #nested/tag (not headings, not inside words)
        .replace(/(^|[\s(])#[^\s#.,;:!?()[\]{}"'`]+/g, "$1")
        // headings, quotes, list markers, tables
        .replace(/^\s{0,3}#{1,6}\s+/gm, "")
        .replace(/^\s*>+\s?/gm, "")
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/gm, "")
        .replace(/^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-*:?\s*$/gm, " ")
        .replace(/\|/g, ", ")
        // horizontal rules & card separators (::, ?, etc. are handled by the parser)
        .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, " ")
        // formatting: highlight / cloze ==x==, bold, italic, strike, inline code
        .replace(/==/g, "")
        .replace(/~~/g, "")
        .replace(/`+/g, "")
        .replace(/\*+/g, "")
        .replace(/(^|[^\p{L}\p{N}])_+|_+(?=[^\p{L}\p{N}]|$)/gu, "$1");
    text = text.replace(/&(#?\w+);/g, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
    return text
        .split(/\n+/)
        .map((line) =>
            line
                .replace(/\s+/g, " ")
                .replace(/\s+,/g, ",")
                .replace(/^[\s,]+|[\s,]+$/g, ""),
        )
        .filter((line) => line.length > 0 && /[\p{L}\p{N}]/u.test(line))
        .join("\n");
}

/** Sentence end followed by a space (Latin scripts) */
const SENTENCE_END = /([.!?…]+["')\]»”’]*)\s+/g;
/** CJK sentence end (no space after it) */
const CJK_SENTENCE_END = /([。！？]+[」』”’)]*)(?=.)/g;

/**
 * Splits text into chunks no longer than `maxLength` characters, preferably at
 * sentence ends, then at commas / semicolons, then at spaces. Chrome stops
 * utterances that take longer than ~15 s, so long answers must be chunked.
 */
export function splitIntoSentences(text: string, maxLength: number = 180): string[] {
    const limit = Math.max(10, Math.floor(maxLength));
    const chunks: string[] = [];
    for (const line of (text ?? "").split(/\n+/)) {
        const sentences = line
            .replace(SENTENCE_END, "$1\n")
            .replace(CJK_SENTENCE_END, "$1\n")
            .split("\n");
        for (const raw of sentences) {
            const sentence = raw.trim();
            if (!sentence) continue;
            chunks.push(...splitLong(sentence, limit));
        }
    }
    return chunks;
}

function splitLong(sentence: string, limit: number): string[] {
    if (sentence.length <= limit) return [sentence];
    const result: string[] = [];
    let rest = sentence;
    while (rest.length > limit) {
        const window = rest.slice(0, limit + 1);
        let cut = Math.max(
            window.lastIndexOf(", "),
            window.lastIndexOf("; "),
            window.lastIndexOf(": "),
            window.lastIndexOf("，"),
            window.lastIndexOf("、"),
        );
        if (cut > limit / 3) {
            cut += 1; // keep the punctuation with the first part
        } else {
            cut = window.lastIndexOf(" ");
            if (cut <= limit / 3) cut = limit; // e.g. Chinese: no spaces at all
        }
        result.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
    }
    if (rest) result.push(rest);
    return result.filter((s) => s.length > 0);
}

export interface SpeechCard {
    /** Shown side (front) of the card being reviewed */
    question: string;
    /** Revealed side (back) */
    answer: string;
    /**
     * The reversed sibling of a `:::` / `??` card (asks with the translation):
     * its foreign side is the answer.
     */
    reversedSibling?: boolean;
}

/** Which side to read when nothing is underlined (the reversed side flips it). */
export function fallbackSpeechSide(
    fallback: "question" | "answer" | "none",
    reversedSibling: boolean,
): "question" | "answer" | "none" {
    if (fallback === "none" || !reversedSibling) return fallback;
    return fallback === "question" ? "answer" : "question";
}

/**
 * What to read for a revealed card.
 * - `<u>` fragments from the question AND the answer, each in its own
 *   language (`lang` attribute) or the card language.
 * - No fragments: the side chosen in the settings (by default the question,
 *   i.e. the foreign word of `#ENG word:: translation`; the answer for the
 *   reversed side of `:::` cards).
 * - No card language: only fragments with an explicit `lang` are read.
 */
export function buildSpeechPlan(
    card: SpeechCard,
    cardLang: string | null,
    fallback: "question" | "answer" | "none",
): Array<{ text: string; lang: string }> {
    const segments = [
        ...extractMarkedSegments(card.question),
        ...extractMarkedSegments(card.answer),
    ];
    if (segments.length > 0) {
        return segments
            .map((s) => ({ text: s.text, lang: s.lang || cardLang || "" }))
            .filter((s) => s.lang !== "");
    }
    const side = fallbackSpeechSide(fallback, card.reversedSibling === true);
    if (side === "none" || !cardLang) return [];
    const text = cleanMarkdownForSpeech(side === "question" ? card.question : card.answer);
    return text ? [{ text, lang: cardLang }] : [];
}

// MARK: Editor command

export interface TextEdit {
    /** Range of the document to replace (offsets) */
    from: number;
    to: number;
    insert: string;
    /** New selection after the edit (offsets) */
    selectionFrom: number;
    selectionTo: number;
}

const OPEN_U_AT_END = /<u(\s[^>]*)?>$/i;
const CLOSE_U_AT_START = /^<\/u\s*>/i;
/** Exactly one `<u>…</u>` (no other `<u>` inside) */
const WRAPPED = /^<u(\s[^>]*)?>((?:(?!<\/?u[\s>])[\s\S])*)<\/u\s*>$/i;

/**
 * "Mark for reading aloud": wraps the selection in `<u>…</u>`, or removes the
 * tags when the selection is already wrapped (either the tags are inside the
 * selection or right around it). Works on the whole document text + offsets.
 */
export function toggleUnderline(doc: string, selFrom: number, selTo: number): TextEdit {
    const from = Math.max(0, Math.min(selFrom, selTo, doc.length));
    const to = Math.min(doc.length, Math.max(selFrom, selTo, 0));
    const selected = doc.slice(from, to);

    // 1. Selection contains the tags: "<u>gato</u>"
    const inner = WRAPPED.exec(selected);
    if (inner) {
        const content = inner[2];
        return {
            from,
            to,
            insert: content,
            selectionFrom: from,
            selectionTo: from + content.length,
        };
    }

    // 2. Tags right around the selection: <u>[gato]</u>
    const before = doc.slice(Math.max(0, from - 200), from);
    const open = OPEN_U_AT_END.exec(before);
    const close = CLOSE_U_AT_START.exec(doc.slice(to, to + 10));
    if (open && close) {
        const start = from - open[0].length;
        return {
            from: start,
            to: to + close[0].length,
            insert: selected,
            selectionFrom: start,
            selectionTo: start + selected.length,
        };
    }

    // 3. Wrap (trailing/leading spaces stay outside the tags)
    const lead = selected.length - selected.trimStart().length;
    const trail = selected.length - selected.trimEnd().length;
    const core = selected.trim();
    if (!core) {
        // empty selection: insert tags and put the cursor between them
        return {
            from,
            to,
            insert: `${selected}<u></u>`,
            selectionFrom: from + selected.length + 3,
            selectionTo: from + selected.length + 3,
        };
    }
    const wrapped = `${selected.slice(0, lead)}<u>${core}</u>${selected.slice(selected.length - trail)}`;
    return {
        from,
        to,
        insert: wrapped,
        selectionFrom: from + lead + 3,
        selectionTo: from + lead + 3 + core.length,
    };
}
