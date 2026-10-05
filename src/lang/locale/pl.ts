// język polski

import { IBaseLocale } from "src/lang/base-locale";
import en from "src/lang/locale/en";

const pl: IBaseLocale = {
    ...en,
    // flashcard-modal.tsx
    language: "pl",
    languageName: "Polski",
    DECKS: "Talie",
    DUE_CARDS: "Fiszki na dziś",
    NEW_CARDS: "Nowe fiszki",
    TOTAL_CARDS: "Wszystkie karty",
    BACK: "Wstecz",
    SKIP: "Pomiń",
    EDIT_CARD: "Edytuj kartę",
    RESET_CARD_PROGRESS: "Zresetuj postęp karty",
    HARD: "Trudne",
    GOOD: "Dobre",
    EASY: "Łatwe",
    SHOW_ANSWER: "Pokaż odpowiedź",
    CARD_PROGRESS_RESET: "Postęp karty został zresetowany.",
    SAVE: "Zapisz",
    CANCEL: "Anuluj",
    NO_INPUT: "Nie wprowadzono wartości.",
    CURRENT_EASE_HELP_TEXT: "Aktualna łatwość: ",
    CURRENT_INTERVAL_HELP_TEXT: "Aktualny interwał: ",
    CARD_GENERATED_FROM: "Wygenerowano z: ${notePath}",
    VIEW_CARD_INFO: "Informacje o fiszce",

    // main.ts
    OPEN_NOTE_FOR_REVIEW: "Otwórz notatkę do przeglądu",
    REVIEW_CARDS: "Przeglądaj fiszki",
    REVIEW_DIFFICULTY_FILE_MENU: "Przeglądaj: ${difficulty}",
    REVIEW_NOTE_DIFFICULTY_CMD: "Przeglądaj notatkę jako ${difficulty}",
    CRAM_ALL_CARDS: "Wybierz talię do intensywnego uczenia",
    REVIEW_ALL_CARDS: "Przeglądaj fiszki ze wszystkich notatek",
    REVIEW_CARDS_IN_NOTE: "Przeglądaj fiszki w tej notatce",
    CRAM_CARDS_IN_NOTE: "Intensywne uczenie fiszek w tej notatce",
    VIEW_STATS: "Wyświetl statystyki",
    OPEN_REVIEW_QUEUE_VIEW: "Otwórz kolejkę notatek do przeglądu w panelu bocznym",
    STATUS_BAR: "Przeglądaj: ${dueNotesCount} notatek, ${dueFlashcardsCount} fiszek z terminem",
    SYNC_TIME_TAKEN: "Synchronizacja zajęła ${t}ms",
    NOTE_IN_IGNORED_FOLDER: "Notatka jest zapisana w folderze zignorowanym (sprawdź ustawienia).",
    PLEASE_TAG_NOTE: "Proszę odpowiednio otagować notatkę do przeglądu (w ustawieniach).",
    RESPONSE_RECEIVED: "Otrzymano odpowiedź.",
    NO_DECK_EXISTS: "Nie istnieje talia o nazwie ${deckName}",
    ALL_CAUGHT_UP: "Jesteś teraz na bieżąco :D.",

    // scheduling.ts
    DAYS_STR_IVL: "${interval} dni",
    MONTHS_STR_IVL: "${interval} miesięcy",
    YEARS_STR_IVL: "${interval} lata",
    DAYS_STR_IVL_MOBILE: "${interval} d",
    MONTHS_STR_IVL_MOBILE: "${interval} mies.",
    YEARS_STR_IVL_MOBILE: "${interval}r",

    // settings.ts
    SETTINGS_HEADER: "Upgraded Spaced Repetition",
    GROUP_TAGS_FOLDERS: "Tagi i foldery",
    GROUP_FLASHCARD_REVIEW: "Powtórki fiszek",
    GROUP_FLASHCARD_SEPARATORS: "Separatory fiszek",
    GROUP_DATA_STORAGE: "Gdzie zapisywać harmonogram",
    GROUP_DATA_STORAGE_DESC: "Wybierz, gdzie przechowywać dane harmonogramu",
    GROUP_FLASHCARDS_NOTES: "Fiszki i notatki",
    GROUP_CONTRIBUTING: "Współtworzenie",
    CHECK_WIKI: 'Aby uzyskać więcej informacji, sprawdź <a href="${wikiUrl}">wiki</a>.',
    GITHUB_DISCUSSIONS: 'Pytania, uwagi i pomysły zgłoszysz <a href="${discussionsUrl}">tutaj</a>.',
    GITHUB_ISSUES: 'Błąd albo pomysł na nową funkcję? Zgłoś go <a href="${issuesUrl}">tutaj</a>.',
    GITHUB_SOURCE_CODE: 'Kod źródłowy pluginu jest na <a href="${githubProjectUrl}">GitHubie</a>.',
    CODE_CONTRIBUTION_INFO:
        '<a href="${codeContributionUrl}">Tutaj</a> opisano, jak dołożyć własny kod do oryginalnego pluginu.',
    TRANSLATION_CONTRIBUTION_INFO:
        '<a href="${translationContributionUrl}">Tutaj</a> opisano, jak przetłumaczyć oryginalny plugin na inny język.',
    FOLDERS_TO_IGNORE: "Foldery do zignorowania",
    FOLDERS_TO_IGNORE_DESC:
        "Wpisz ścieżki folderów lub wzorce, każdy w osobnej linii, np. Templates/Scripts albo **/*.excalidraw.md. To ustawienie dotyczy i fiszek, i notatek.",
    OBSIDIAN_INTEGRATION: "Współpraca z Obsidianem",
    FLASHCARDS: "Fiszki",
    FLASHCARD_EASY_LABEL: "Tekst przycisku Łatwe",
    FLASHCARD_GOOD_LABEL: "Tekst przycisku Średnio trudne",
    FLASHCARD_HARD_LABEL: "Tekst przycisku Trudne",
    FLASHCARD_EASY_DESC: 'Dostosuj etykietę dla przycisku "Łatwe"',
    FLASHCARD_GOOD_DESC: 'Dostosuj etykietę dla przycisku "Średnio trudne"',
    FLASHCARD_HARD_DESC: 'Dostosuj etykietę dla przycisku "Trudne"',
    REVIEW_BUTTON_DELAY: "Opóźnienie przycisków (ms)",
    REVIEW_BUTTON_DELAY_DESC: "Po naciśnięciu przyciski oceny są nieaktywne przez podany czas.",
    FLASHCARD_TAGS: "Tagi fiszek",
    FLASHCARD_TAGS_DESC:
        "Wprowadź tagi oddzielone spacją lub nowymi liniami, np. #fiszki #talia2 #talia3.",
    CONVERT_FOLDERS_TO_DECKS: "Czy konwertować foldery na talie i podtalie?",
    CONVERT_FOLDERS_TO_DECKS_DESC: "Jest to alternatywa dla opcji tagów fiszek powyżej.",
    INLINE_SCHEDULING_COMMENTS:
        "Czy zachować komentarz harmonogramowania w tej samej linii co ostatnia linia fiszki?",
    INLINE_SCHEDULING_COMMENTS_DESC:
        "Włączenie tej opcji sprawi, że komentarze HTML nie będą przerywać formatowania listy.",
    BURY_SIBLINGS_TILL_NEXT_DAY: "Czy ukrywać karty rodzeństwa do następnego dnia?",
    BURY_SIBLINGS_TILL_NEXT_DAY_DESC:
        "Rodzeństwo to karty wygenerowane z tego samego tekstu karty, np. usunięcia zamaskowane",
    SHOW_CARD_CONTEXT: "Czy pokazywać kontekst na kartach?",
    SHOW_CARD_CONTEXT_DESC: "np. Tytuł > Nagłówek 1 > Podnagłówek > ... > Podnagłówek",
    SHOW_INTERVAL_IN_REVIEW_BUTTONS: "Pokazuj czas następnej powtórki na przyciskach",
    SHOW_INTERVAL_IN_REVIEW_BUTTONS_DESC:
        "Widać, jak daleko w przyszłość przesunie się fiszka po danej ocenie.",
    CARD_MODAL_HEIGHT_PERCENT: "Procentowa wysokość fiszki",
    CARD_MODAL_SIZE_PERCENT_DESC:
        "Powinno być ustawione na 100% na urządzeniach mobilnych lub gdy masz bardzo duże obrazy",
    RESET_DEFAULT: "Zresetuj do domyślnych",
    CARD_MODAL_WIDTH_PERCENT: "Procentowa szerokość fiszki",
    RANDOMIZE_CARD_ORDER: "Czy losować kolejność kart podczas przeglądu?",
    REVIEW_CARD_ORDER_WITHIN_DECK: "Kolejność kart w talii wyświetlana podczas przeglądania",
    REVIEW_CARD_ORDER_NEW_FIRST_SEQUENTIAL:
        "Kolejno w ramach talii (Najpierw wszystkie nowe karty)",
    REVIEW_CARD_ORDER_DUE_FIRST_SEQUENTIAL:
        "Kolejno w ramach talii (Najpierw wszystkie karty z terminem)",
    REVIEW_CARD_ORDER_NEW_FIRST_RANDOM: "Losowo w ramach talii (Najpierw wszystkie nowe karty)",
    REVIEW_CARD_ORDER_DUE_FIRST_RANDOM:
        "Losowo w ramach talii (Najpierw wszystkie karty z terminem)",
    REVIEW_CARD_ORDER_RANDOM_DECK_AND_CARD: "Losowa karta z losowej talii",
    REVIEW_DECK_ORDER: "Kolejność talii wyświetlana podczas przeglądania",
    REVIEW_DECK_ORDER_PREV_DECK_COMPLETE_SEQUENTIAL:
        "Kolejno (gdy wszystkie karty w poprzedniej talii przeglądnięte)",
    REVIEW_DECK_ORDER_PREV_DECK_COMPLETE_RANDOM:
        "Losowo (gdy wszystkie karty w poprzedniej talii przeglądnięte)",
    REVIEW_DECK_ORDER_RANDOM_DECK_AND_CARD: "Losowa karta z losowej talii",
    DISABLE_CLOZE_CARDS: "Wyłączyć karty zamaskowane?",
    CONVERT_CLOZE_PATTERNS_TO_INPUTS: "Luki jako pola do wpisania",
    CONVERT_CLOZE_PATTERNS_TO_INPUTS_DESC:
        "W fiszkach z lukami zamiast ukrytego tekstu pojawia się pole, w które wpisujesz odpowiedź.",
    CONVERT_HIGHLIGHTS_TO_CLOZES: "Konwertować ==podświetlenia== na karty zamaskowane?",
    CONVERT_HIGHLIGHTS_TO_CLOZES_DESC:
        'Dodaj/usuń <code>${defaultPattern}</code> z "Wzory kart zamaskowanych"',
    CONVERT_BOLD_TEXT_TO_CLOZES: "Konwertować pogrubiony tekst na karty zamaskowane?",
    CONVERT_BOLD_TEXT_TO_CLOZES_DESC:
        'Dodaj/usuń <code>${defaultPattern}</code> z "Wzory kart zamaskowanych"',
    CONVERT_CURLY_BRACKETS_TO_CLOZES: "Konwertować {{klamry}} na karty zamaskowane?",
    CONVERT_CURLY_BRACKETS_TO_CLOZES_DESC:
        'Dodaj/usuń <code>${defaultPattern}</code> z "Wzory kart zamaskowanych"',
    CLOZE_PATTERNS: "Wzory kart zamaskowanych",
    CLOZE_PATTERNS_DESC:
        'Wprowadź wzory kart zamaskowanych oddzielone nowymi liniami. Check the <a href="${docsUrl}">wiki</a> for guidance.',
    INLINE_CARDS_SEPARATOR: "Separator dla kart zamaskowanych w linii",
    FIX_SEPARATORS_MANUALLY_WARNING:
        "Pamiętaj, że po zmianie tego musisz ręcznie edytować wszystkie karty zamaskowane, które już masz.",
    INLINE_REVERSED_CARDS_SEPARATOR: "Separator dla kart zamaskowanych odwróconych w linii",
    MULTILINE_CARDS_SEPARATOR: "Separator dla kart zamaskowanych wieloliniowych",
    MULTILINE_REVERSED_CARDS_SEPARATOR:
        "Separator dla kart zamaskowanych odwróconych wieloliniowych",
    MULTILINE_CARDS_END_MARKER: "Caracteres que denotam o fim de clozes e flashcards multilineares",
    NOTES: "Notatki",
    NOTE: "Notatka",
    REVIEW_PANE_ON_STARTUP: "Włączyć panel przeglądu notatek przy starcie",
    TAGS_TO_REVIEW: "Tagi do przeglądu",
    TAGS_TO_REVIEW_DESC:
        "Wprowadź tagi oddzielone spacją lub nowymi liniami, np. #przegląd #tag2 #tag3.",
    OPEN_RANDOM_NOTE: "Otwórz losową notatkę do przeglądu",
    OPEN_RANDOM_NOTE_DESC:
        "Po wyłączeniu tej opcji notatki są uporządkowane według istotności (PageRank).",
    AUTO_NEXT_NOTE: "Automatycznie otwierać następną notatkę po przeglądzie",
    ENABLE_FILE_MENU_REVIEW_OPTIONS:
        "Wyłączyć opcje przeglądu w menu pliku, tj. Przeglądaj: Łatwe Dobrze Trudne",
    ENABLE_FILE_MENU_REVIEW_OPTIONS_DESC:
        "Jeśli wyłączysz opcje przeglądu w menu Plik, możesz przeglądać swoje notatki za pomocą poleceń wtyczki i, jeśli je zdefiniowałeś, przypisanych skrótów klawiszowych.",
    MAX_N_DAYS_REVIEW_QUEUE: "Maksymalna liczba dni do wyświetlenia w panelu prawym",
    MIN_ONE_DAY: "Liczba dni musi wynosić co najmniej 1.",
    VALID_NUMBER_WARNING: "Podaj prawidłową liczbę.",
    UI: "Wygląd",
    OPEN_IN_TAB: "Otwieraj w nowej karcie",
    OPEN_IN_TAB_DESC: "Wyłącz, żeby plugin otwierał się w okienku",
    SHOW_STATUS_BAR: "Pokazuj pasek stanu",
    SHOW_STATUS_BAR_DESC:
        "Turn this off to hide the flashcard's review status in Obsidian's status bar",
    SHOW_RIBBON_ICON: "Pokazuj ikonę na pasku bocznym",
    SHOW_RIBBON_ICON_DESC: "Wyłącz, żeby ukryć ikonę pluginu na pasku bocznym Obsidiana",
    INITIALLY_EXPAND_SUBDECKS_IN_TREE: "Podtalie powinny być początkowo wyświetlane rozszerzone",
    INITIALLY_EXPAND_SUBDECKS_IN_TREE_DESC:
        "Wyłącz to, aby zwinąć zagnieżdżone talie w tej samej karcie. Przydatne, jeśli karty należą do wielu talii w tym samym pliku.",
    ALGORITHM: "Algorytm",
    CHECK_ALGORITHM_WIKI:
        'Aby uzyskać więcej informacji, sprawdź <a href="${algoUrl}">implementację algorytmu</a>.',
    SM2_OSR_VARIANT: "Wariant SM-2 (OSR)",
    BASE_EASE: "Podstawowa łatwość",
    BASE_EASE_DESC: "minimum = 130, preferowana wartość to około 250.",
    BASE_EASE_MIN_WARNING: "Podstawowa łatwość musi wynosić co najmniej 130.",
    LAPSE_INTERVAL_CHANGE: "Zmiana interwału podczas przeglądania fiszki/notatki jako trudne",
    LAPSE_INTERVAL_CHANGE_DESC: "nowyInterwał = staryInterwał * zmianaInterwału / 100.",
    EASY_BONUS: "Bonus za łatwe",
    EASY_BONUS_DESC:
        "Bonus za łatwe pozwala ustawić różnicę w interwałach między odpowiedziami Średnio trudne i Łatwe na fiszce/notatce (minimum = 100%).",
    EASY_BONUS_MIN_WARNING: "Bonus za łatwe musi wynosić co najmniej 100.",
    LOAD_BALANCE: "Równomierne rozłożenie powtórek",
    LOAD_BALANCE_DESC:
        "Lekko przesuwa terminy, żeby liczba powtórek każdego dnia była podobna. Działa jak „fuzz” w Anki, ale zamiast losować, wybiera dzień z najmniejszą liczbą powtórek. Nie działa przy krótkich odstępach.",
    MAX_INTERVAL: "Maksymalny interwał w dniach",
    MAX_INTERVAL_DESC: "Pozwala na ustawienie górnego limitu interwału (domyślnie = 100 lat).",
    MAX_INTERVAL_MIN_WARNING: "Maksymalny interwał musi wynosić co najmniej 1 dzień.",
    MAX_LINK_CONTRIB: "Maksymalny wkład łącza",
    MAX_LINK_CONTRIB_DESC:
        "Maksymalny wkład ważonej łatwości połączonych notatek do początkowej łatwości.",
    LOGGING: "Logowanie",
    DISPLAY_SCHEDULING_DEBUG_INFO: "Wyświetl informacje debugowania w konsoli deweloperskiej",
    DISPLAY_PARSER_DEBUG_INFO: "Pokazuj informacje diagnostyczne parsera w konsoli",
    SCHEDULING: "Harmonogram",
    EXPERIMENTAL: "Eksperymentalne",
    HELP: "Pomoc",
    STORE_IN_NOTES: "W notatkach",
    DELETE_SCHEDULING_DATA_ALL: "Usuń dane harmonogramu",
    DELETE_SCHEDULING_DATA_ALL_DESC: "Usuwa harmonogram ze wszystkich notatek i fiszek.",
    DELETE: "Usuń",
    CONFIRM_SCHEDULING_DATA_ALL_DELETION:
        "Na pewno usunąć cały harmonogram ze wszystkich notatek i fiszek? Tej operacji nie można cofnąć.",
    CONFIRM: "Potwierdź",
    SCHEDULING_DATA_ALL_DELETION_IN_PROGRESS: "Usuwanie harmonogramu…",
    SCHEDULING_DATA_HAS_BEEN_DELETED: "Harmonogram został usunięty ze wszystkich notatek i fiszek.",

    // sidebar.ts
    NOTES_REVIEW_QUEUE: "Kolejka przeglądu notatek",
    CLOSE: "Zamknij",
    NEW: "Nowe",
    YESTERDAY: "Wczoraj",
    TODAY: "Dzisiaj",
    TOMORROW: "Jutro",

    // stats-modal.tsx
    STATS_TITLE: "Statystyki",
    MONTH: "Miesiąc",
    QUARTER: "Kwartał",
    YEAR: "Rok",
    LIFETIME: "Całe życie",
    FORECAST: "Prognoza",
    FORECAST_DESC: "Liczba kart z terminem w przyszłości",
    SCHEDULED: "Zaplanowane",
    DAYS: "Dni",
    NUMBER_OF_CARDS: "Liczba kart",
    REVIEWS_PER_DAY: "Średnio: ${avg} przeglądów/dzień",
    INTERVALS: "Interwały",
    INTERVALS_DESC: "Opóźnienia przed ponownym pokazaniem przeglądów",
    COUNT: "Liczba",
    INTERVALS_SUMMARY: "Średni interwał: ${avg}, Najdłuższy interwał: ${longest}",
    EASES: "Łatwości",
    EASES_SUMMARY: "Średnia łatwość: ${avgEase}",
    EASE: "Łatwość",
    CARD_TYPES: "Typy kart",
    CARD_TYPES_DESC: "Obejmuje także ukryte karty, jeśli takie są",
    CARD_TYPE_NEW: "Nowe",
    CARD_TYPE_YOUNG: "Młode",
    CARD_TYPE_MATURE: "Stare",
    CARD_TYPES_SUMMARY: "Łączna liczba kart: ${totalCardsCount}",
    SEARCH: "Szukaj",
    PREVIOUS: "Poprzednia",
    NEXT: "Następna",
    // settings.ts
    SETTINGS_TAB_HEADING: "Ustawienia",
    MAIN_SETTINGS_PAGE: "Ustawienia główne",

    // NoteReviewQueue.ts
    NOTE_REVIEW_QUEUE_HINT: "Click on the 3 dots next to the note to open the review menu.",

    // StatusBarManager.ts
    OPEN_DECK_FOR_REVIEW: "Otwórz talię do powtórki",
    UPDATE_AVAILABLE: "Dostępna nowa wersja",

    // Statistics
    PERIOD_TITLE: "Okres",
    PERIOD_DESC: "Okres pokazywany na wykresach",

    // Card controls reset button
    DELETE_SCHEDULING_DATA_OF_CURRENT_CARD: "Usunąć harmonogram tej fiszki?",
    CONFIRM_SCHEDULING_DATA_DELETION_OF_CURRENT_CARD:
        "Na pewno usunąć harmonogram bieżącej fiszki? Tej operacji nie można cofnąć.",
    SCHEDULING_DATA_DELETION_IN_PROGRESS_OF_CURRENT_CARD: "Usuwanie harmonogramu fiszki…",

    // Settings > Scheduling
    START_OF_DAY: "Początek dnia",
    START_OF_DAY_DESC:
        "Godzina, o której zaczyna się nowy dzień (format GG:MM:SS, domyślnie 00:00:00)",
    INVALID_START_OF_DAY_WARNING: "Nieprawidłowy format początku dnia",
    // Settings > main-page
    INFO: "Informacje",
    // Card responses
    AGAIN: "Ponownie",
    // Settings > info
    CHECK_ROADMAP: '<a href="${roadMapUrl}">Plany rozwoju</a> oryginalnego pluginu.',
    CHECK_DEV_NEWS: '<a href="${devNewsUrl}">Nowości</a> z rozwoju oryginalnego pluginu.',
    // Upgraded Spaced Repetition: brakujące tłumaczenia
    CRAM_MODE: "Tryb intensywny",
    REVIEW_MODE: "Tryb powtórek",
    DUE: "Dziś",
    SEEN_CARDS: "Znane fiszki",
    SEEN: "Znane",
    TOTAL: "Razem",
    JUMP_TO: "Przejdź do fiszki",
    JUMP_TO_AND_CLOSE: "Zamknij i przejdź do fiszki",
    OPEN_IN_BACKGROUND: "Otwórz fiszkę w tle",
    DELETE_CARD: "Usuń fiszkę",
    DELETE_CARD_CONFIRMATION:
        "Tej operacji nie można cofnąć i może ona zmienić Twoje notatki w niepożądany sposób. Na pewno usunąć tę fiszkę?",
    REVIEW_CARD_DIFFICULTY_CMD: "Oceń fiszkę jako ${difficulty}",
    REVIEW_REMINDER_NOTICE:
        "Fiszki czekają na powtórkę. Wróć do Obsidiana, żeby kontynuować naukę.",
    PLUGIN_DATA_STORE_INFO:
        "Harmonogram jest zapisywany w plikach Markdown w Twoim vaulcie (w folderze ustawionym w „Dane harmonogramu”). Harmonogramy notatek rozpoznaje się po unikalnym ID (sr-id) dodanym do metadanych notatki, więc przetrwają zmianę nazwy i przeniesienie. Harmonogramy fiszek są powiązane ze skrótem tekstu fiszki – zmiana przedniej strony fiszki zeruje jej harmonogram.",
    MIGRATE_TO_PLUGIN_DATA: "Przenieść harmonogram do danych pluginu?",
    CONFIRM_MIGRATE_TO_PLUGIN_DATA:
        "Wszystkie komentarze <!--SR:...--> i pola sr-* z metadanych zostaną przeniesione do plików harmonogramu w vaulcie, a do metadanych każdej notatki zostanie dodane pole sr-id. W dużych vaultach może to chwilę potrwać. Nie edytuj notatek, dopóki przenoszenie się nie skończy.",
    MIGRATING_TO_PLUGIN_DATA: "Przenoszenie harmonogramu do danych pluginu…",
    MIGRATE_TO_NOTES: "Przenieść harmonogram z powrotem do notatek?",
    CONFIRM_MIGRATE_TO_NOTES:
        "Cały harmonogram zostanie zapisany z powrotem jako komentarze <!--SR:...--> i pola sr-* w metadanych. W dużych vaultach może to chwilę potrwać. Nie edytuj notatek, dopóki przenoszenie się nie skończy.",
    MIGRATING_TO_NOTES: "Przenoszenie harmonogramu do notatek…",
    FLASHCARD_AGAIN_LABEL: "Tekst przycisku „Ponownie”",
    FLASHCARD_AGAIN_DESC: "Zmień napis na przycisku „Ponownie”",
    FLASHCARD_TAGS_TO_IGNORE: "Tagi do pominięcia",
    FLASHCARD_TAGS_TO_IGNORE_DESC:
        "Wpisz tagi oddzielone spacjami lub w osobnych liniach. Notatki z którymkolwiek z tych tagów nie trafią do powtórek fiszek.",
    SHOW_DELETE_BUTTON: "Pokazuj przycisk „Usuń”",
    SHOW_DELETE_BUTTON_DESC: "Dodaje przycisk usuwania fiszki w oknie powtórki.",
    REVIEW_REMINDERS: "Przypomnienia o powtórkach",
    REVIEW_REMINDERS_DESC:
        "Co jakiś czas sprawdza, czy są nowe lub zaplanowane fiszki, i przypomina o powtórce.",
    REVIEW_REMINDER_CHECK_ON_STARTUP: "Sprawdzaj od razu po uruchomieniu",
    REVIEW_REMINDER_CHECK_ON_STARTUP_DESC:
        "Jedno sprawdzenie zaraz po starcie Obsidiana, bez czekania na pierwszy odstęp.",
    REVIEW_REMINDER_INTERVAL: "Co ile minut przypominać",
    REVIEW_REMINDER_INTERVAL_DESC: "Sprawdza co N minut. Od 1 do 1440 minut.",
    REVIEW_REMINDER_INTERVAL_MIN_WARNING: "Odstęp przypomnień musi być liczbą od 1 do 1440.",
    REVIEW_REMINDER_MESSAGE: "Treść przypomnienia",
    REVIEW_REMINDER_MESSAGE_DESC:
        "Własny tekst w powiadomieniu. Zostaw puste, żeby użyć domyślnego.",
    REVIEW_REMINDER_AUTO_OPEN: "Od razu otwieraj powtórkę",
    REVIEW_REMINDER_AUTO_OPEN_DESC: "Przypomnienie od razu otwiera powtórkę fiszek.",
    REVIEW_REMINDER_SHOW_NOTICE: "Pokazuj powiadomienie",
    REVIEW_REMINDER_SHOW_NOTICE_DESC:
        "Wyświetla krótkie powiadomienie, gdy przychodzi przypomnienie.",
    REVIEW_REMINDER_PLAY_SOUND: "Odtwarzaj dźwięk",
    REVIEW_REMINDER_PLAY_SOUND_DESC: "Krótki sygnał dźwiękowy przy przypomnieniu.",
    REVIEW_REMINDER_BOUNCE_DOCK: "Podskakująca ikona w Docku",
    REVIEW_REMINDER_BOUNCE_DOCK_DESC:
        "Na komputerze (macOS) ikona Obsidiana podskakuje w Docku przy przypomnieniu.",
    NOTE_TAGS_TO_IGNORE: "Tagi do pominięcia",
    NOTE_TAGS_TO_IGNORE_DESC:
        "Wpisz tagi oddzielone spacjami lub w osobnych liniach. Notatki z którymkolwiek z tych tagów nie trafią do przeglądu notatek.",
    STATUS_BAR_SETTINGS: "Pasek stanu",
    SHOW_CARD_STATUS_BAR_ITEM: "Pokazuj liczbę fiszek w pasku stanu",
    SHOW_CARD_STATUS_BAR_ITEM_DESC:
        "Wyłącz, żeby ukryć liczbę fiszek do powtórki w pasku stanu Obsidiana",
    SHOW_NOTE_STATUS_BAR_ITEM: "Pokazuj liczbę notatek w pasku stanu",
    SHOW_NOTE_STATUS_BAR_ITEM_DESC:
        "Wyłącz, żeby ukryć liczbę notatek do przeglądu w pasku stanu Obsidiana",
    SHOW_UPDATE_AVAILABLE_STATUS_BAR_ITEM: "Informuj o nowej wersji w pasku stanu",
    SHOW_UPDATE_AVAILABLE_STATUS_BAR_ITEM_DESC:
        "Wyłącz, żeby ukryć informację o nowej wersji i nie sprawdzać jej w internecie",
    SWITCH_TO_FSRS_ALGORITHM: "Przełączyć algorytm fiszek na FSRS?",
    CONFIRM_FSRS_ALGORITHM_SWITCH:
        "FSRS nie jest jeszcze dobrze przetestowany i przełączenie może spowodować nieprzewidzianą utratę danych. Po przełączeniu każda powtórzona fiszka dostaje harmonogram w formacie FSRS, który ma dużo więcej parametrów, więc komentarz harmonogramu jest dłuższy. Powrót do OSR jest w miarę możliwości obsługiwany: harmonogram zostanie zapisany z powrotem w formacie OSR przy następnej powtórce z włączonym OSR.",
    USE_CUSTOM_HOTKEYS: "Własne skróty klawiszowe",
    USE_CUSTOM_HOTKEYS_DESC:
        "Pozwala ustawić własne skróty do oceniania fiszek. Domyślne skróty przestaną wtedy działać. Własne skróty działają tylko z opcją „Otwieraj w nowej karcie”.",
    NOTE_REVIEW_QUEUE_EMPTY_HINT:
        "Nie ma notatek do przeglądu. Żeby dodać notatkę, dopisz w niej tag „review”.",
    DELETE_SCHEDULING_DATA_IN_NOTES: "Usuń harmonogram notatek",
    DELETE_SCHEDULING_DATA_IN_NOTES_DESC: "Usuwa harmonogram ze wszystkich notatek.",
    DELETE_SCHEDULING_DATA_IN_CARDS: "Usuń harmonogram fiszek",
    DELETE_SCHEDULING_DATA_IN_CARDS_DESC: "Usuwa harmonogram ze wszystkich fiszek.",
    CONFIRM_SCHEDULING_DATA_IN_NOTES_DELETION:
        "Na pewno usunąć harmonogram ze wszystkich notatek? Tej operacji nie można cofnąć.",
    CONFIRM_SCHEDULING_DATA_IN_CARDS_DELETION:
        "Na pewno usunąć harmonogram ze wszystkich fiszek? Tej operacji nie można cofnąć.",
    SCHEDULING_DATA_IN_NOTES_DELETION_IN_PROGRESS: "Usuwanie harmonogramu…",
    SCHEDULING_DATA_IN_CARDS_DELETION_IN_PROGRESS: "Usuwanie harmonogramu…",
    OPEN_MENU: "Otwórz menu",
    DELETE_NOTE_SCHEDULING_DATA_IN_NOTE: "Usuń harmonogram tej notatki",
    CONFIRM_NOTE_SCHEDULING_DATA_IN_NOTE_DELETION: "Na pewno usunąć harmonogram tej notatki?",
    NOTE_SCHEDULING_DATA_IN_NOTE_DELETION_IN_PROGRESS: "Usuwanie harmonogramu notatki…",
    DELETE_SCHEDULING_DATA_OF_CARDS_IN_NOTE: "Usuń harmonogram fiszek w tej notatce",
    CONFIRM_SCHEDULING_DATA_OF_CARDS_IN_NOTE_DELETION:
        "Na pewno usunąć harmonogram fiszek w tej notatce?",
    SCHEDULING_DATA_OF_CARDS_IN_NOTE_DELETION_IN_PROGRESS:
        "Usuwanie harmonogramu fiszek w notatce…",
    DELETE_TAGS_WHEN_DELETING_SCHEDULING_DATA: "Usuwaj też tagi przy usuwaniu harmonogramu",
    DELETE_TAGS_WHEN_DELETING_SCHEDULING_DATA_DESC:
        "Razem z harmonogramem usuwa tagi przeglądu z notatek",
    ENABLE_FILE_MENU_DELETE_BUTTON: "Usuwanie harmonogramu w menu pliku",
    ENABLE_FILE_MENU_DELETE_BUTTON_DESC: "Dodaje do menu pliku polecenia usuwania harmonogramu",
    DATA_PAGE_NAME: "Dane",
    GROUP_RESET_SETTINGS: "Przywróć ustawienia",
    GROUP_RESET_SETTINGS_DESC: "Przywraca wszystkie ustawienia do wartości domyślnych",
    RESET_SETTINGS: "Przywróć ustawienia",
    CONFIRM_RESET_SETTINGS: "Na pewno przywrócić wszystkie ustawienia do wartości domyślnych?",
    RESET_SETTINGS_CONFIRMATION: "Przywracanie ustawień domyślnych…",
    DATE_FORMAT_FOR_NOTE_REVIEW_QUEUE: "Format daty w kolejce notatek",
    DATE_FORMAT_FOR_NOTE_REVIEW_QUEUE_DESC:
        'Format daty w kolejce notatek do przeglądu (szczegóły: <a href="${docsUrl}">moment.js</a>). Zmiana będzie widoczna po ponownym otwarciu kolejki.',
    MIGRATE_TO_FOLDER: "Przenieś do folderu",
    CONFIRM_MIGRATE_TO_FOLDER: "Na pewno przenieść harmonogram do folderu?",
    MIGRATING_TO_FOLDER: "Przenoszenie do folderu…",
    USE_CALLOUTS_FOR_SCHEDULING_COMMENTS: "Ukrywaj harmonogram w calloutach",
    USE_CALLOUTS_FOR_SCHEDULING_COMMENTS_DESC:
        "Nowe komentarze harmonogramu są zapisywane w specjalnym callout'cie, który w edytorze wygląda jak pusta linia.",
    MIGRATE_SCHEDULING_COMMENTS_TO_CALLOUT_BUTTON: "Przenieś",
    MIGRATE_SCHEDULING_COMMENTS_TO_CALLOUT_DESC:
        "Przenosi istniejące komentarze harmonogramu do calloutów, które je ukrywają.",
    CONFIRM_MIGRATE_SCHEDULING_COMMENTS_TO_CALLOUT:
        "To zmieni wszystkie Twoje fiszki. Najpierw zrób kopię zapasową, na wypadek gdybyś chciała to cofnąć albo gdyby błąd w pluginie uszkodził fiszki. Na pewno przenieść komentarze harmonogramu do calloutów?",
    MIGRATING_SCHEDULING_COMMENTS_TO_CALLOUT: "Przenoszenie komentarzy harmonogramu do calloutów…",
    MIGRATE_SCHEDULING_COMMENTS_TO_CALLOUT: "Przenieś komentarze harmonogramu do calloutów",
    DEFAULT_LOCALE_NAME: "- Domyślny język Obsidiana -",
    LANGUAGE_SETTINGS: "Język",
    LANGUAGE_SETTINGS_DESC:
        "Język interfejsu pluginu. Zmiana działa w pełni po ponownym uruchomieniu Obsidiana.",
    DEBUG_LOG: "Dziennik diagnostyczny",
    COPY: "Kopiuj",
    NO_DECKS_TO_REVIEW:
        "Nie ma talii z fiszkami do powtórki. Upewnij się, że w notatce jest tag fiszek (np. #flashcards) i są w niej fiszki. Jeśli tak jest, a talii nadal nie widać, zamknij to okno i otwórz je ponownie za kilka sekund – po bardzo szybkich powtórkach lista czasem się nie odświeża.",
    ALL_DECKS: "Wszystkie talie",
    DECK_TITLE: "Talia",
};

export default pl;
