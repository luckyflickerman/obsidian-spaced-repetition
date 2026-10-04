/**
 * Card authoring — duplicate questions.
 *
 * Pure functions, no DOM. Two cards are duplicates when they are in the same
 * deck and their questions are equal after normalization: lower case, no tags,
 * no markdown / HTML (`<u>`), no punctuation at the ends, no extra spaces.
 */

export interface CardRef {
    /** Deck tag (`#ENG`) */
    deckTag: string;
    /** Normalized question (see normalizeQuestion) */
    key: string;
    question: string;
    file: string;
    /** 0-based line of the card */
    line: number;
}

/** "He <u>Forestalled</u>!" → "he forestalled" */
export function normalizeQuestion(question: string): string {
    return (
        String(question ?? "")
            .replace(/<!--[\s\S]*?-->/g, " ")
            .replace(/!\[\[[^\]]*\]\]/g, " ")
            .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
            .replace(/\[\[([^\]]*)\]\]/g, "$1")
            .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/<[^>]+>/g, "")
            .replace(/(^|\s)#[^\s#]+/g, " ")
            .replace(/[*_=~`]+/g, "")
            .replace(/\s+/g, " ")
            .toLocaleLowerCase()
            .trim()
            // punctuation / symbols at the ends: ¿qué? → qué, "word," → word
            .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "")
    );
}

/** Key used for grouping: deck + normalized question. */
export function duplicateKey(deckTag: string, question: string): string {
    return `${deckTag.toLowerCase()}|${normalizeQuestion(question)}`;
}

/** Groups of 2+ cards with the same question in the same deck. */
export function findDuplicates(refs: CardRef[]): CardRef[][] {
    const groups = new Map<string, CardRef[]>();
    for (const ref of refs) {
        if (!ref.key) continue;
        const k = `${ref.deckTag.toLowerCase()}|${ref.key}`;
        const list = groups.get(k);
        if (list) list.push(ref);
        else groups.set(k, [ref]);
    }
    return [...groups.values()].filter((g) => g.length > 1);
}

/** Other cards with the same question in the same deck (the card itself excluded). */
export function duplicatesOf(
    question: string,
    deckTag: string,
    refs: CardRef[],
    self?: { file: string; line: number },
): CardRef[] {
    const key = normalizeQuestion(question);
    if (!key) return [];
    const deck = deckTag.toLowerCase();
    return refs.filter(
        (r) =>
            r.key === key &&
            r.deckTag.toLowerCase() === deck &&
            !(self && r.file === self.file && r.line === self.line),
    );
}

/** Merges card lists, the current file's (fresher) cards replacing its synced ones. */
export function mergeRefs(synced: CardRef[], currentFile: string, current: CardRef[]): CardRef[] {
    return [...synced.filter((r) => r.file !== currentFile), ...current];
}
