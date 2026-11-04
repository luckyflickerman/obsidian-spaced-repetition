/**
 * Languages to choose from (a deck's reading language, a new fish note). The code is what the
 * system voices use (`de-DE`); the names are shown in the user's language.
 *
 * To add a language: one line in LANGUAGES. Pure data, no DOM.
 */

export interface LanguageInfo {
    code: string;
    en: string;
    pl: string;
}

export const LANGUAGES: LanguageInfo[] = [
    { code: "en-GB", en: "English (UK)", pl: "Angielski (Wielka Brytania)" },
    { code: "en-US", en: "English (US)", pl: "Angielski (USA)" },
    { code: "de-DE", en: "German", pl: "Niemiecki" },
    { code: "es-ES", en: "Spanish (Spain)", pl: "Hiszpański (Hiszpania)" },
    { code: "es-MX", en: "Spanish (Mexico)", pl: "Hiszpański (Meksyk)" },
    { code: "fr-FR", en: "French", pl: "Francuski" },
    { code: "it-IT", en: "Italian", pl: "Włoski" },
    { code: "pt-PT", en: "Portuguese (Portugal)", pl: "Portugalski (Portugalia)" },
    { code: "pt-BR", en: "Portuguese (Brazil)", pl: "Portugalski (Brazylia)" },
    { code: "nl-NL", en: "Dutch", pl: "Niderlandzki" },
    { code: "sv-SE", en: "Swedish", pl: "Szwedzki" },
    { code: "nb-NO", en: "Norwegian", pl: "Norweski" },
    { code: "da-DK", en: "Danish", pl: "Duński" },
    { code: "fi-FI", en: "Finnish", pl: "Fiński" },
    { code: "pl-PL", en: "Polish", pl: "Polski" },
    { code: "cs-CZ", en: "Czech", pl: "Czeski" },
    { code: "sk-SK", en: "Slovak", pl: "Słowacki" },
    { code: "uk-UA", en: "Ukrainian", pl: "Ukraiński" },
    { code: "ru-RU", en: "Russian", pl: "Rosyjski" },
    { code: "hu-HU", en: "Hungarian", pl: "Węgierski" },
    { code: "ro-RO", en: "Romanian", pl: "Rumuński" },
    { code: "hr-HR", en: "Croatian", pl: "Chorwacki" },
    { code: "el-GR", en: "Greek", pl: "Grecki" },
    { code: "tr-TR", en: "Turkish", pl: "Turecki" },
    { code: "ar-SA", en: "Arabic", pl: "Arabski" },
    { code: "he-IL", en: "Hebrew", pl: "Hebrajski" },
    { code: "hi-IN", en: "Hindi", pl: "Hindi" },
    { code: "zh-CN", en: "Chinese (Mandarin)", pl: "Chiński (mandaryński)" },
    { code: "ja-JP", en: "Japanese", pl: "Japoński" },
    { code: "ko-KR", en: "Korean", pl: "Koreański" },
    { code: "vi-VN", en: "Vietnamese", pl: "Wietnamski" },
    { code: "th-TH", en: "Thai", pl: "Tajski" },
    { code: "id-ID", en: "Indonesian", pl: "Indonezyjski" },
    { code: "la", en: "Latin", pl: "Łacina" },
];

/** Name of a language code in the chosen interface language (the code itself if unknown). */
export function languageName(code: string, polish: boolean): string {
    const info = LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
    if (!info) return code;
    return polish ? info.pl : info.en;
}

/** The languages sorted by their shown name. */
export function sortedLanguages(polish: boolean): LanguageInfo[] {
    const locale = polish ? "pl" : "en";
    return [...LANGUAGES].sort((a, b) =>
        (polish ? a.pl : a.en).localeCompare(polish ? b.pl : b.en, locale),
    );
}

/** `#DEN`, a language name or code → a short tag suggestion, e.g. "Niemiecki" → "#NIE". */
export function suggestDeckTag(name: string): string {
    const letters = name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/ł/gi, "l")
        .replace(/[^A-Za-z]/g, "")
        .toUpperCase();
    return letters ? `#${letters.slice(0, 3)}` : "";
}
