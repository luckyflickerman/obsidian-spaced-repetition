import {
    currentDeck,
    deckForFile,
    deckForTag,
    DEFAULT_CARD_AUTHORING_SETTINGS,
    normalizeCardAuthoringSettings,
    normalizeDeckFile,
    normalizeDeckTag,
} from "src/card-authoring/card-authoring-settings";
import {
    appendAtEnd,
    insertAfter,
    multiLineTemplate,
    singleLineTemplate,
    tabAction,
    TemplateSeparators,
} from "src/card-authoring/card-template";

const SEPS: TemplateSeparators = {
    singleLineCardSeparator: "::",
    singleLineReversedCardSeparator: ":::",
    multilineCardSeparator: "?",
    multilineReversedCardSeparator: "??",
};

/** Applies a TabAction to a line and returns [text, cursor]. */
function applyTab(line: string, ch: number, both = true): [string, number] | null {
    const a = tabAction(line, ch, SEPS, both);
    if (!a) return null;
    return [line.slice(0, a.from) + a.insert + line.slice(a.to), a.cursor];
}

describe("templates", () => {
    test("single line: cursor before the separator, separator from the settings", () => {
        expect(singleLineTemplate("#ENG", SEPS, false)).toEqual({ text: "#ENG :: ", cursor: 5 });
        expect(singleLineTemplate("#ENG", SEPS, true)).toEqual({ text: "#ENG ::: ", cursor: 5 });
        const custom = {
            ...SEPS,
            singleLineCardSeparator: "=>",
            singleLineReversedCardSeparator: "<=>",
        };
        expect(singleLineTemplate("#ESP", custom, true).text).toBe("#ESP <=> ");
    });

    test("multi line: tag, empty question line, separator", () => {
        expect(multiLineTemplate("#ENG", SEPS, false)).toEqual({ text: "#ENG\n\n?\n", cursor: 5 });
        expect(multiLineTemplate("#ENG", SEPS, true).text).toBe("#ENG\n\n??\n");
    });

    test("append at the end of the file without touching existing lines", () => {
        const t = singleLineTemplate("#ENG", SEPS, false);
        expect(appendAtEnd("", t)).toEqual({ at: 0, text: "#ENG :: ", cursor: 5 });
        expect(appendAtEnd("#ENG a:: b\n", t)).toEqual({ at: 11, text: "#ENG :: ", cursor: 16 });
        expect(appendAtEnd("#ENG a:: b", t)).toEqual({ at: 10, text: "\n#ENG :: ", cursor: 16 });
        const multi = appendAtEnd("#ENG a:: b", multiLineTemplate("#ENG", SEPS, false));
        expect(multi.text).toBe("\n\n#ENG\n\n?\n");
        expect(multi.cursor).toBe(10 + 2 + 5);
    });

    test("next template after a finished card", () => {
        const t = singleLineTemplate("#ENG", SEPS, false);
        expect(insertAfter(20, t, false)).toEqual({ at: 20, text: "\n#ENG :: ", cursor: 26 });
        expect(insertAfter(20, t, true).text).toBe("\n\n#ENG :: ");
    });
});

describe("Tab", () => {
    test("jumps from the word to the translation", () => {
        expect(applyTab("#ENG forestalled:: ", 16)).toEqual(["#ENG forestalled:: ", 19]);
        expect(applyTab("#ENG forestalled::: ", 16)).toEqual(["#ENG forestalled::: ", 20]);
        // no space after the separator yet: one is added
        expect(applyTab("#ENG forestalled::", 16)).toEqual(["#ENG forestalled:: ", 19]);
    });

    test("adds the separator to an unfinished line (#ENG ushering)", () => {
        expect(applyTab("#ENG ushering", 13)).toEqual(["#ENG ushering::: ", 17]);
        expect(applyTab("#ENG ushering  ", 15, false)).toEqual(["#ENG ushering:: ", 16]);
    });

    test("works normally elsewhere", () => {
        expect(applyTab("#ENG forestalled:: uprzedzić", 10)).toBeNull(); // translation filled
        expect(applyTab("#ENG forestalled:: ", 19)).toBeNull(); // already in the translation
        expect(applyTab("plain text line", 5)).toBeNull(); // no tag
        expect(applyTab("#ENG ushering", 6)).toBeNull(); // middle of the word
        expect(applyTab("#flashcards #ENG", 16)).toBeNull(); // tag-only line
        expect(applyTab("#ENG ", 5)).toBeNull(); // nothing typed yet
        expect(applyTab("#ENG word", 2)).toBeNull(); // cursor inside the tag
    });
});

describe("card authoring settings", () => {
    test("defaults", () => {
        const s = normalizeCardAuthoringSettings(undefined);
        expect(s).toEqual(DEFAULT_CARD_AUTHORING_SETTINGS);
        expect(s.bothDirections).toBe(true);
        expect(s.dailyGoal).toBe(10);
        expect(currentDeck(s)?.file).toBe("Fiszki/Angielski.md");
    });

    test("normalizes decks: tags, files, languages, duplicates", () => {
        const s = normalizeCardAuthoringSettings({
            decks: [
                { tag: "ENG", file: "/Fiszki/Angielski", lang: "en_gb" },
                { tag: "#eng", file: "x.md", lang: "en" },
                { tag: "", file: "y.md", lang: "" },
                { tag: "#DEU", file: "", lang: "de" },
                null as never,
            ],
            lastDeckTag: "DEU",
            dailyGoal: 0,
        });
        expect(s.decks).toEqual([
            { tag: "#ENG", file: "Fiszki/Angielski.md", lang: "en-GB" },
            { tag: "#DEU", file: "Fiszki/DEU.md", lang: "de" },
        ]);
        expect(s.lastDeckTag).toBe("#DEU");
        expect(s.dailyGoal).toBe(1);
        expect(normalizeCardAuthoringSettings({ lastDeckTag: "#nope" }).lastDeckTag).toBe("#ENG");
    });

    test("lookups by tag and file", () => {
        const s = DEFAULT_CARD_AUTHORING_SETTINGS;
        expect(deckForTag(s, "#eng")?.lang).toBe("en-GB");
        expect(deckForTag(s, "#ENG/verbs")?.tag).toBe("#ENG");
        expect(deckForTag(s, "#ENGLISH")).toBeNull();
        expect(deckForTag(s, null)).toBeNull();
        expect(deckForFile(s, "fiszki/angielski.md")?.tag).toBe("#ENG");
        expect(deckForFile(s, "Inne.md")).toBeNull();
        expect(normalizeDeckTag("  ")).toBe("");
        expect(normalizeDeckFile("a\\b")).toBe("a/b.md");
    });
});
