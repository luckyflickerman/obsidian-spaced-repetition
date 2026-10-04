/**
 * Card authoring — images: a file name from the card's word, the `![[…]]`
 * embed at the end of the answer, and the size for shrinking big photos.
 *
 * Pure functions, no DOM (the canvas resize lives in the controller).
 */

import type { DetectedCard } from "src/card-authoring/card-detect";

const MAX_NAME = 60;

/** "He <u>forestalled</u> her!" + "png" → "forestalled.png"; falls back to "fiszka". */
export function imageFileName(question: string, extension: string): string {
    const underlined = /<u(?:\s[^>]*)?>([\s\S]*?)<\/u>/i.exec(question ?? "")?.[1];
    const source = underlined ?? question ?? "";
    let base = source
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/!\[\[[^\]]*\]\]/g, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/(^|\s)#[^\s#]+/g, " ")
        .replace(/[*_=~`]+/g, "")
        // characters not allowed in file names / links
        .replace(/[\\/:*?"<>|#^[\]{}]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^[.\s]+|[.\s]+$/g, "");
    if (base.length > MAX_NAME) base = base.slice(0, MAX_NAME).trim();
    if (!base) base = "fiszka";
    const ext = (extension || "png").replace(/^\./, "").toLowerCase();
    return `${base}.${ext}`;
}

/** "forestalled.png", "forestalled 2.png", … — the first name that is free. */
export function uniqueFileName(name: string, exists: (name: string) => boolean): string {
    if (!exists(name)) return name;
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    for (let i = 2; i < 1000; i++) {
        const candidate = `${base} ${i}${ext}`;
        if (!exists(candidate)) return candidate;
    }
    return `${base} ${Date.now()}${ext}`;
}

export interface LineInsert {
    line: number;
    ch: number;
    text: string;
}

/**
 * Where to put ` ![[name]]`: at the end of the answer — the end of a
 * single-line card, or the last line of a block — before a scheduling comment
 * on the same line. Never changes existing text.
 */
export function embedInsert(lines: string[], card: DetectedCard, fileName: string): LineInsert {
    let line = card.lastLine;
    // skip a scheduling comment on its own line
    while (line > card.firstLine && /^\s*<!--SR:/.test(lines[line] ?? "")) line--;
    const text = lines[line] ?? "";
    const sr = text.indexOf("<!--SR:");
    const end = sr >= 0 ? text.slice(0, sr).trimEnd().length : text.trimEnd().length;
    const before = text.slice(0, end);
    const space = before.length === 0 || /\s$/.test(before) ? "" : " ";
    return { line, ch: end, text: `${space}![[${fileName}]]` };
}

/** Size after shrinking to at most `maxWidth` (never enlarges). */
export function fitWidth(
    width: number,
    height: number,
    maxWidth: number,
): { width: number; height: number } {
    if (width <= maxWidth || width <= 0) return { width, height };
    const scale = maxWidth / width;
    return { width: maxWidth, height: Math.round(height * scale) };
}

/** Obsidian's default name for pasted images. */
export function isPastedImageName(name: string): boolean {
    return /^Pasted image \d{14}\.\w+$/i.test(name);
}
