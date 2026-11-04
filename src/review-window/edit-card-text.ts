/**
 * "Edit card" window — splitting the card text into the two text boxes and joining it back.
 *
 * Pure logic, no DOM. Splits exactly like the parser (`question-type.ts`):
 * - one-line cards (`word:: translation`) at the FIRST separator, so a `::` later in the
 *   answer stays in the answer;
 * - multi-line cards at the first line that holds only the separator (`?`), so a question mark
 *   inside the question ("What is it?") is not taken for the separator.
 *
 * Before, the text was cut at every separator and only the first two pieces were kept: saving
 * a multi-line card with "?" in its question lost the rest of the card.
 */

export interface EditCardParts {
    front: string;
    back: string;
}

/** Index of the first line that is the separator (spaces around it allowed), or -1. */
function separatorLine(lines: string[], separator: string): number {
    return lines.findIndex((line) => line.trim() === separator);
}

/** Card text → the two text boxes. Without a separator everything goes to the front. */
export function splitCardText(text: string, separator: string, multiLine: boolean): EditCardParts {
    if (separator === "") return { front: text, back: "" };
    if (multiLine) {
        const lines = text.split("\n");
        const idx = separatorLine(lines, separator);
        if (idx < 0) return { front: text, back: "" };
        return {
            front: lines.slice(0, idx).join("\n"),
            back: lines.slice(idx + 1).join("\n"),
        };
    }
    const idx = text.indexOf(separator);
    if (idx < 0) return { front: text, back: "" };
    return { front: text.substring(0, idx), back: text.substring(idx + separator.length) };
}

/** The two text boxes → card text (the separator on its own line for multi-line cards). */
export function joinCardText(
    front: string,
    back: string,
    separator: string,
    multiLine: boolean,
): string {
    if (!multiLine) return front + separator + back;
    const head = front.endsWith("\n") ? front : front + "\n";
    const tail = back.startsWith("\n") ? back : "\n" + back;
    return head + separator + tail;
}
