import {
    cardAtLine,
    CardDetectSettings,
    detectCards,
    extractNoteTags,
    isFlashcardNote,
    isReversedSibling,
    scheduleDates,
    splitLeadingTag,
} from "src/card-authoring/card-detect";
import { CardType } from "src/data/data-structures/card/questions/question";
import { DEFAULT_SETTINGS } from "src/data/settings";

const settings: CardDetectSettings = {
    ...DEFAULT_SETTINGS,
    flashcardTags: ["#flashcards", "#ENG", "#ESP"],
};

describe("note tags", () => {
    test("frontmatter (inline and list) and text tags, not headings or code", () => {
        const text = [
            "---",
            "tags: [nauka, jezyki]",
            "---",
            "# Heading",
            "#ENG word:: tr",
            "Text with #inline tag and C#sharp",
            "```",
            "#notatag",
            "```",
        ].join("\n");
        expect(extractNoteTags(text)).toEqual(["#nauka", "#jezyki", "#ENG", "#inline"]);
        expect(extractNoteTags("---\ntags:\n  - fiszki\n  - eng\n---\nx")).toEqual([
            "#fiszki",
            "#eng",
        ]);
    });

    test("a note is read only with a flashcard tag", () => {
        expect(isFlashcardNote("#ENG forestalled:: uprzedzić", settings)).toBe(true);
        expect(isFlashcardNote("#flashcards/deutsch\nHund:: pies", settings)).toBe(true);
        expect(isFlashcardNote("Hund:: pies", settings)).toBe(false);
        expect(isFlashcardNote("#todo Hund:: pies", settings)).toBe(false);
    });

    test("splitLeadingTag", () => {
        expect(splitLeadingTag("  #ENG  word:: x")).toEqual(["#ENG", "word:: x"]);
        expect(splitLeadingTag("word:: x")).toEqual([null, "word:: x"]);
    });
});

describe("detectCards: the user's format", () => {
    const note = [
        "#ENG forestalled:: uprzedzić",
        "#ENG imperceptibly:: niepostrzeżenie",
        "<!--SR:!2026-10-07,3,250-->",
        "#ENG ushering",
    ].join("\n");

    test("single-line cards with the deck tag at the start", () => {
        const r = detectCards(note, settings);
        expect(r.isFlashcardNote).toBe(true);
        expect(r.cards).toHaveLength(2);
        expect(r.cards[0]).toMatchObject({
            firstLine: 0,
            lastLine: 0,
            type: CardType.SingleLineBasic,
            deckTag: "#ENG",
            lineTag: "#ENG",
            question: "forestalled",
            answer: "uprzedzić",
            reversed: false,
            schedule: null,
            complete: true,
        });
    });

    test("the scheduling comment belongs to the card above", () => {
        const r = detectCards(note, settings);
        expect(r.cards[1]).toMatchObject({ firstLine: 1, lastLine: 2, question: "imperceptibly" });
        expect(r.cards[1].schedule).toBe("<!--SR:!2026-10-07,3,250-->");
        expect(scheduleDates(r.cards[1].schedule)).toEqual(["2026-10-07"]);
        expect(cardAtLine(r.cards, 2)).toBe(r.cards[1]);
    });

    test("an unfinished card (no separator) is reported", () => {
        expect(detectCards(note, settings).unfinished).toEqual([
            { line: 3, deckTag: "#ENG", text: "ushering" },
        ]);
    });

    test("empty sides make the card incomplete", () => {
        const r = detectCards("#ENG ushering:: \n#ENG :: wprowadzać", settings);
        expect(r.cards.map((c) => c.complete)).toEqual([false, false]);
        expect(r.cards[0].question).toBe("ushering");
        expect(r.cards[1].answer).toBe("wprowadzać");
    });
});

describe("detectCards: other formats", () => {
    test("reversed `:::` cards", () => {
        const r = detectCards(
            "#ENG forestalled::: uprzedzić\n<!--SR:!2026-10-07,3,250!2026-10-09,5,250-->",
            settings,
        );
        expect(r.cards[0]).toMatchObject({
            type: CardType.SingleLineReversed,
            reversed: true,
            question: "forestalled",
            answer: "uprzedzić",
        });
        expect(scheduleDates(r.cards[0].schedule)).toEqual(["2026-10-07", "2026-10-09"]);
        expect(isReversedSibling(CardType.SingleLineReversed, 1)).toBe(true);
        expect(isReversedSibling(CardType.SingleLineReversed, 0)).toBe(false);
        expect(isReversedSibling(CardType.SingleLineBasic, 1)).toBe(false);
    });

    test("multi-line card with a sentence", () => {
        const text = [
            "#ENG",
            "He <u>forestalled</u> her question.",
            "?",
            "uprzedził jej pytanie",
        ].join("\n");
        const r = detectCards(text, settings);
        expect(r.cards).toHaveLength(1);
        expect(r.cards[0]).toMatchObject({
            firstLine: 0,
            lastLine: 3,
            type: CardType.MultiLineBasic,
            deckTag: "#ENG",
            question: "He <u>forestalled</u> her question.",
            answer: "uprzedził jej pytanie",
        });
        expect(r.unfinished).toEqual([]);
    });

    test("deck from a note-level tag above the cards", () => {
        const text = ["#flashcards", "", "Hund:: pies", "", "#ESP", "", "gato:: kot"].join("\n");
        const r = detectCards(text, settings);
        expect(r.cards.map((c) => [c.question, c.deckTag])).toEqual([
            ["Hund", "#flashcards"],
            ["gato", "#ESP"],
        ]);
        expect(r.unfinished).toEqual([]); // tag-only lines are not unfinished cards
    });

    test("deck from the frontmatter", () => {
        const r = detectCards("---\ntags: [ENG]\n---\nword:: słowo", settings);
        expect(r.cards[0]).toMatchObject({ firstLine: 3, deckTag: "#ENG", question: "word" });
    });

    test("lines without a tag in a note without a flashcard tag are not cards", () => {
        const r = detectCards("word:: słowo\n#todo something", settings);
        expect(r).toEqual({ isFlashcardNote: false, cards: [], unfinished: [] });
    });

    test("custom separators from the settings", () => {
        const custom: CardDetectSettings = {
            ...settings,
            singleLineCardSeparator: "=>",
            singleLineReversedCardSeparator: "<=>",
            multilineCardSeparator: "---?",
        };
        const r = detectCards("#ENG dog => pies\n#ENG cat <=> kot\n#ENG old:: stary", custom);
        expect(r.cards.map((c) => [c.question, c.answer, c.reversed])).toEqual([
            ["dog", "pies", false],
            ["cat", "kot", true],
        ]);
        expect(r.unfinished).toEqual([{ line: 2, deckTag: "#ENG", text: "old:: stary" }]);
    });

    test("cloze cards are complete", () => {
        const r = detectCards("#ENG the ==cat== sat", settings);
        expect(r.cards[0]).toMatchObject({ type: CardType.Cloze, complete: true });
    });

    test("code blocks are ignored", () => {
        const r = detectCards("#ENG a:: b\n```\n#ENG notacard\n```", settings);
        expect(r.unfinished).toEqual([]);
    });
});
