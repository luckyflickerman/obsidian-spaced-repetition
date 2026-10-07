/**
 * Plural forms in translations — pure logic, no DOM.
 *
 * A translation can hold several forms separated by `|`, each with its
 * Intl.PluralRules category in front:
 *
 *   "one:${interval} dzień|few:${interval} dni|many:${interval} dni|other:${interval} dnia"
 *
 * Polish: 1 dzień, 2–4 dni, 5+ dni, 1,5 dnia. A translation without `|` is
 * used as it is (so English "${interval} day(s)" keeps working).
 */

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/** The plural category of a number in a language ("pl", "en", …). */
export function pluralCategory(count: number, locale: string): PluralCategory {
    try {
        return new Intl.PluralRules(locale || "en").select(count) as PluralCategory;
    } catch {
        return count === 1 ? "one" : "other";
    }
}

/** Picks the form for `count` from a `one:…|few:…|other:…` translation. */
export function selectPluralForm(template: string, count: number, locale: string): string {
    if (!template.includes("|")) return template;
    const forms = new Map<string, string>();
    for (const part of template.split("|")) {
        const colon = part.indexOf(":");
        if (colon > 0) forms.set(part.slice(0, colon).trim(), part.slice(colon + 1));
    }
    if (forms.size === 0) return template;
    const category = pluralCategory(count, locale);
    return forms.get(category) ?? forms.get("other") ?? [...forms.values()][0];
}

/** A number written the way the language writes it (Polish: 1,5). */
export function formatCount(count: number, locale: string): string {
    try {
        return new Intl.NumberFormat(locale || "en", {
            maximumFractionDigits: 1,
            useGrouping: false,
        }).format(count);
    } catch {
        return String(count);
    }
}
