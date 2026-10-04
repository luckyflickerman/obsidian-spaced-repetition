import { isPolish } from "src/speed-streak/speed-streak-i18n";

const EN = {
    // Review view
    REPLAY: "Read aloud again",
    REPLAY_KEY: "Read aloud again — ${key}",
    READ_WORD: "Read aloud",
    READING: "Reading…",
    // Settings page
    PAGE_NAME: "Read aloud",
    G_GENERAL: "General",
    ENABLED: "Enable reading aloud",
    ENABLED_DESC:
        "After the answer is revealed, the words marked with <u>…</u> (or the whole answer) are read aloud in the card's language.",
    AUTO_PLAY: "Read automatically",
    AUTO_PLAY_DESC:
        "Read as soon as the answer is shown. Off: only with the 🔊 button, by tapping a word, or with the key.",
    WHOLE_ANSWER: "Read the whole answer when nothing is marked",
    WHOLE_ANSWER_DESC:
        "If the answer has no <u>…</u>, read all of it (without formatting, links, images and tags).",
    G_LANGUAGES: "Languages",
    RULES: "Language rules",
    RULES_DESC:
        "One rule per line, matched against the note's tags or the deck path: matcher = language code. Cards without a matching rule are not read. Example:  #hiszpanski = es-ES",
    DEFAULT_LANG: "Default language",
    DEFAULT_LANG_DESC:
        'Language for cards that match no rule, e.g. en-GB. Empty = don\'t read them. A single word can always be given its own language: <u lang="en">computer</u>',
    G_VOICES: "Voices",
    VOICES_EMPTY: "Add language rules above to choose a voice for each language.",
    VOICE_FOR: "Voice: ${lang}",
    VOICE_AUTO: "Automatic (best available)",
    VOICE_COUNT: "${n} voice(s) on this device",
    VOICE_NONE: "No voice for this language on this device — ${hint}",
    VOICE_LOADING: "Loading voices…",
    TEST: "Test",
    RATE: "Speed",
    RATE_DESC: "0.5 = slow, 1 = normal, 1.5 = fast. Default 0.85.",
    VOLUME: "Volume",
    G_SPEED_STREAK: "Speed Streak",
    PAUSE_STREAK: "Pause the timer while reading",
    PAUSE_STREAK_DESC:
        "The answer timer stops while the card is read aloud and continues afterwards. Does not count as a pause (keeps the run Pure).",
    G_SHORTCUTS: "Shortcuts",
    REPLAY_HOTKEY: "Read again key",
    REPLAY_HOTKEY_DESC:
        "Single key in the review view (computer only). You can also bind the command “Read aloud: read again” to any hotkey. On a phone use the 🔊 button or tap the word.",
    G_DIAGNOSTICS: "Diagnostics",
    DIAG_AVAILABLE: "✅ Reading aloud is available on this device.",
    DIAG_UNAVAILABLE:
        "❌ This device does not provide text-to-speech to Obsidian (common on some Androids). Reading aloud is switched off here; everything else works as usual.",
    DIAG_TOTAL: "Voices found: ${n}",
    DIAG_LANG: "${lang}: ${n} voice(s)",
    DIAG_NO_RULES: "No language rules yet.",
    HINT_WINDOWS:
        "Windows: Settings → Time & language → Speech → Add voices, then restart Obsidian.",
    HINT_IOS: "iOS: Settings → Accessibility → Spoken Content → Voices.",
    HINT_ANDROID:
        "Android: Settings → Accessibility → Text-to-speech output → install the language in the speech engine (e.g. Speech Services by Google).",
    HINT_MAC:
        "macOS: System Settings → Accessibility → Spoken Content → System voice → Manage voices.",
    RESET_DEFAULT: "Restore default",
    PROVIDER: "Voice source",
    PROVIDER_SYSTEM: "System voices (this device)",
    // Commands / editor
    CMD_MARK: "Mark for reading aloud",
    CMD_REPLAY: "Read aloud: read again",
    TEST_SENTENCE: "This is a test.",
};

type Keys = keyof typeof EN;

const PL: Record<Keys, string> = {
    REPLAY: "Przeczytaj ponownie",
    REPLAY_KEY: "Przeczytaj ponownie — ${key}",
    READ_WORD: "Przeczytaj na głos",
    READING: "Czytam…",
    PAGE_NAME: "Czytanie na głos",
    G_GENERAL: "Ogólne",
    ENABLED: "Włącz czytanie na głos",
    ENABLED_DESC:
        "Po odsłonięciu odpowiedzi słowa oznaczone <u>…</u> (albo cała odpowiedź) są czytane na głos w języku karty.",
    AUTO_PLAY: "Czytaj automatycznie",
    AUTO_PLAY_DESC:
        "Czytaj od razu po pokazaniu odpowiedzi. Wyłączone: tylko przyciskiem 🔊, dotknięciem słowa albo klawiszem.",
    WHOLE_ANSWER: "Czytaj całą odpowiedź, gdy nic nie jest oznaczone",
    WHOLE_ANSWER_DESC:
        "Jeśli w odpowiedzi nie ma <u>…</u>, czytaj całą (bez formatowania, linków, obrazków i tagów).",
    G_LANGUAGES: "Języki",
    RULES: "Reguły języków",
    RULES_DESC:
        "Jedna reguła na linię, dopasowywana do tagów notatki lub ścieżki talii: dopasowanie = kod języka. Karty bez pasującej reguły nie są czytane. Przykład:  #hiszpanski = es-ES",
    DEFAULT_LANG: "Język domyślny",
    DEFAULT_LANG_DESC:
        'Język kart, do których nie pasuje żadna reguła, np. en-GB. Puste = nie czytaj ich. Pojedynczemu słowu zawsze można nadać własny język: <u lang="en">computer</u>',
    G_VOICES: "Głosy",
    VOICES_EMPTY: "Dodaj powyżej reguły języków, żeby wybrać głos dla każdego języka.",
    VOICE_FOR: "Głos: ${lang}",
    VOICE_AUTO: "Automatycznie (najlepszy dostępny)",
    VOICE_COUNT: "Głosy na tym urządzeniu: ${n}",
    VOICE_NONE: "Brak głosu dla tego języka na tym urządzeniu — ${hint}",
    VOICE_LOADING: "Wczytuję głosy…",
    TEST: "Test",
    RATE: "Tempo",
    RATE_DESC: "0,5 = wolno, 1 = normalnie, 1,5 = szybko. Domyślnie 0,85.",
    VOLUME: "Głośność",
    G_SPEED_STREAK: "Speed Streak",
    PAUSE_STREAK: "Wstrzymaj timer podczas czytania",
    PAUSE_STREAK_DESC:
        "Timer odpowiedzi stoi, gdy karta jest czytana, i rusza dalej po zakończeniu. Nie liczy się jako pauza (seria zostaje „Czysta”).",
    G_SHORTCUTS: "Skróty",
    REPLAY_HOTKEY: "Klawisz „przeczytaj ponownie”",
    REPLAY_HOTKEY_DESC:
        "Pojedynczy klawisz w widoku powtórki (tylko komputer). Komendę „Czytanie na głos: przeczytaj ponownie” możesz też przypisać do dowolnego skrótu. Na telefonie użyj przycisku 🔊 albo dotknij słowa.",
    G_DIAGNOSTICS: "Diagnostyka",
    DIAG_AVAILABLE: "✅ Czytanie na głos działa na tym urządzeniu.",
    DIAG_UNAVAILABLE:
        "❌ To urządzenie nie udostępnia Obsidianowi syntezy mowy (zdarza się na części Androidów). Czytanie jest tu wyłączone, reszta działa normalnie.",
    DIAG_TOTAL: "Znalezione głosy: ${n}",
    DIAG_LANG: "${lang}: głosy: ${n}",
    DIAG_NO_RULES: "Nie ma jeszcze reguł języków.",
    HINT_WINDOWS:
        "Windows: Ustawienia → Czas i język → Mowa → Dodaj głosy, potem uruchom ponownie Obsidiana.",
    HINT_IOS: "iOS: Ustawienia → Dostępność → Treść mówiona → Głosy.",
    HINT_ANDROID:
        "Android: Ustawienia → Ułatwienia dostępu → Zamiana tekstu na mowę → zainstaluj język w silniku mowy (np. Usługi mowy Google).",
    HINT_MAC:
        "macOS: Ustawienia systemowe → Dostępność → Treść mówiona → Głos systemowy → Zarządzaj głosami.",
    RESET_DEFAULT: "Przywróć domyślne",
    PROVIDER: "Źródło głosu",
    PROVIDER_SYSTEM: "Głosy systemowe (to urządzenie)",
    CMD_MARK: "Oznacz do czytania na głos",
    CMD_REPLAY: "Czytanie na głos: przeczytaj ponownie",
    TEST_SENTENCE: "To jest test.",
};

export function tt(key: Keys, params?: Record<string, string | number>): string {
    let text = (isPolish() ? PL[key] : EN[key]) ?? EN[key];
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.split("${" + k + "}").join(String(v));
        }
    }
    return text;
}

/** Short sample sentence for the "Test" button, in the voice's language. */
export function sampleSentence(lang: string): string {
    const base = (lang ?? "").toLowerCase().split(/[-_]/)[0];
    switch (base) {
        case "es":
            return "Hola, este es un gato.";
        case "en":
            return "Hello, this is a cat.";
        case "de":
            return "Hallo, das ist eine Katze.";
        case "fr":
            return "Bonjour, c'est un chat.";
        case "it":
            return "Ciao, questo è un gatto.";
        case "pt":
            return "Olá, este é um gato.";
        case "pl":
            return "Cześć, to jest kot.";
        case "zh":
            return "你好，这是一只猫。";
        case "ja":
            return "こんにちは、これは猫です。";
        case "ru":
            return "Привет, это кошка.";
        default:
            return tt("TEST_SENTENCE");
    }
}
