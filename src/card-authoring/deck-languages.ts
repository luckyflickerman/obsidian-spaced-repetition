/**
 * Decks and languages — one list for card authoring and reading aloud.
 *
 * Before, the language of a deck could be set in two places: a deck in "Card authoring"
 * (tag → file → language) and a text rule in "Read aloud" (`#ENG = en-GB`). Now the deck list
 * is the one place (a "+" button, a language from the list, a tag). Rules written for a tag
 * are moved into the deck list once; other rules (a deck path, e.g. `languages/german`) stay
 * as "advanced rules". Nothing changes in the notes.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

import { CardDeck, normalizeDeckTag } from "src/card-authoring/card-authoring-settings";
import { normalizeLangCode } from "src/tts/tts-settings";

export interface MigratedRules {
    /** The rules that stay as text (not a tag, a comment, or a tag whose deck reads another language) */
    rules: string;
    decks: CardDeck[];
    changed: boolean;
}

/** The file for a new deck: `Fiszki/<tag without #>.md`. */
export function defaultDeckFile(tag: string): string {
    return `Fiszki/${tag.replace(/^#/, "").replace(/\//g, " ")}.md`;
}

export function moveTagRulesToDecks(rulesText: string, decks: CardDeck[]): MigratedRules {
    const kept: string[] = [];
    const result = decks.map((d) => ({ ...d }));
    let changed = false;
    for (const line of String(rulesText ?? "").split(/\r?\n/)) {
        const trimmed = line.trim();
        const eq = trimmed.search(/[=:]/);
        const matcher = eq > 0 ? trimmed.slice(0, eq).trim() : "";
        const lang = eq > 0 ? normalizeLangCode(trimmed.slice(eq + 1)) : "";
        const tag = matcher.startsWith("#") ? normalizeDeckTag(matcher) : "";
        if (!tag || !lang || trimmed.startsWith("//") || trimmed.startsWith("%")) {
            if (trimmed !== "") kept.push(line);
            continue;
        }
        const deck = result.find((d) => d.tag.toLowerCase() === tag.toLowerCase());
        if (!deck) {
            result.push({ tag, file: defaultDeckFile(tag), lang });
            changed = true;
        } else if (!deck.lang || deck.lang === lang) {
            if (!deck.lang) deck.lang = lang;
            changed = true;
        } else {
            // the rule wins over the deck today: keep it, so nothing is read differently
            kept.push(line);
        }
    }
    const rules = kept.join("\n");
    if (rules.trim() !== String(rulesText ?? "").trim()) changed = true;
    return { rules, decks: result, changed };
}
