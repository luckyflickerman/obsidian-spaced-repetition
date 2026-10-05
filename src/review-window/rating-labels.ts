/**
 * Labels of the four rating buttons.
 *
 * The button texts are stored in the settings (flashcardAgainText …) when the plugin is first
 * set up, in whatever language Obsidian had then — e.g. "Again" or the old Polish "Średnio
 * Trudne". A stored text that is one of the known default names is shown in the current
 * language instead; a text the user typed herself is kept as it is.
 *
 * Pure logic (no Obsidian, no DOM).
 */

export type Rating = "again" | "hard" | "good" | "easy";

/** Default names the plugin (and the original plugin) ever stored, in any language we ship. */
export const KNOWN_DEFAULT_LABELS: Record<Rating, readonly string[]> = {
    again: ["Again", "Reset", "Ponownie"],
    hard: ["Hard", "Trudne"],
    good: ["Good", "Średnio Trudne", "Dobre", "Dobrze"],
    easy: ["Easy", "Łatwe"],
};

const norm = (s: string) => s.trim().toLocaleLowerCase();

/** The label to show: `current` for a known default (or empty) text, otherwise the stored text. */
export function displayRatingLabel(
    stored: string | null | undefined,
    rating: Rating,
    current: string,
): string {
    const text = (stored ?? "").trim();
    if (text === "") return current;
    return KNOWN_DEFAULT_LABELS[rating].some((d) => norm(d) === norm(text)) ? current : text;
}

/** Interval text in the language of the UI ("2 hr" → "2 godz." in Polish). */
export function localizeInterval(interval: string, polish: boolean): string {
    if (!polish) return interval;
    return interval.replace(/\bhr\b/g, "godz.");
}
