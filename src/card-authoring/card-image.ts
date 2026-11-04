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

// MARK: An image in a one-line card (thumbnail in the note → move / remove / replace)

export interface EmbedRange {
    from: number;
    to: number;
    /** The link inside `![[…]]` without the `|size` part, e.g. `obrazy/hund.webp` */
    link: string;
}

const EMBED = /!\[\[([^\]|]+)(\|[^\]]*)?\]\]/g;

/** The `![[…]]` of `link` in a line (matched by the full link or just the file name). */
export function findEmbed(line: string, link: string): EmbedRange | null {
    const wanted = link.trim();
    const wantedName = wanted.split("/").pop() ?? wanted;
    for (const m of line.matchAll(EMBED)) {
        const found = m[1].trim();
        const name = found.split("/").pop() ?? found;
        if (found === wanted || name === wantedName) {
            const from = m.index ?? 0;
            return { from, to: from + m[0].length, link: found };
        }
    }
    return null;
}

/** The line without the embed (and without the space that was in front of it). */
export function removeEmbed(line: string, embed: EmbedRange): string {
    let from = embed.from;
    while (from > 0 && line[from - 1] === " ") from--;
    return line.slice(0, from) + line.slice(embed.to);
}

/** Position of the card's separator in a line (the longer separator is tried first). */
export function separatorIndex(
    line: string,
    separators: string[],
): { at: number; sep: string } | null {
    let best: { at: number; sep: string } | null = null;
    for (const sep of [...separators].filter(Boolean).sort((a, b) => b.length - a.length)) {
        const at = line.indexOf(sep);
        if (at >= 0 && (best === null || at < best.at)) best = { at, sep };
    }
    return best;
}

/** Which side of a one-line card the embed is on (null: no separator in the line). */
export function embedSide(
    line: string,
    embed: EmbedRange,
    separators: string[],
): "front" | "back" | null {
    const sep = separatorIndex(line, separators);
    if (!sep) return null;
    return embed.from < sep.at ? "front" : "back";
}

/**
 * Moves the image of a one-line card to the other side: to the end of the question (just before
 * the separator) or to the end of the answer (before a schedule comment on the same line).
 * Returns null when the line has no separator.
 */
export function moveEmbedToSide(
    line: string,
    embed: EmbedRange,
    side: "front" | "back",
    separators: string[],
): string | null {
    const text = line.slice(embed.from, embed.to);
    const without = removeEmbed(line, embed);
    const sep = separatorIndex(without, separators);
    if (!sep) return null;
    if (side === "front") {
        const before = without.slice(0, sep.at).trimEnd();
        return `${before} ${text}${without.slice(sep.at)}`;
    }
    const sr = without.indexOf("<!--SR:");
    const end = sr >= 0 ? sr : without.length;
    const answer = without.slice(0, end).trimEnd();
    const tail = without.slice(end);
    return `${answer} ${text}${tail ? ` ${tail.trimStart()}` : ""}`;
}

/** The embed pointing to another file (`![[old|200]]` → `![[new|200]]`). */
export function replaceEmbedLink(line: string, embed: EmbedRange, newLink: string): string {
    const old = line.slice(embed.from, embed.to);
    const size = /\|[^\]]*\]\]$/.exec(old)?.[0] ?? "]]";
    return `${line.slice(0, embed.from)}![[${newLink}${size}${line.slice(embed.to)}`;
}

/**
 * Folder for a card's images: `obrazy` next to the note (`Niemiecki/Słówka.md` →
 * `Niemiecki/obrazy`). Empty setting = null (Obsidian's own attachment setting is used).
 */
export function imageFolderFor(notePath: string, setting: string): string | null {
    const sub = String(setting ?? "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "");
    if (!sub) return null;
    const dir = notePath.includes("/") ? notePath.slice(0, notePath.lastIndexOf("/")) : "";
    return dir ? `${dir}/${sub}` : sub;
}

/** Image files this plugin may shrink in place (the format stays the same). */
export function shrinkableExtension(ext: string): "image/png" | "image/jpeg" | null {
    const e = ext.toLowerCase();
    if (e === "png") return "image/png";
    if (e === "jpg" || e === "jpeg") return "image/jpeg";
    return null;
}

export function isImageExtension(ext: string): boolean {
    return /^(png|jpe?g|gif|webp|heic|heif|bmp|svg|avif)$/i.test(ext);
}
