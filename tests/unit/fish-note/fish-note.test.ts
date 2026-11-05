import {
    appendCardLine,
    fishNoteDeckTag,
    fishNoteFileName,
    fishNoteText,
    isFishNote,
    quickCardLine,
    uniqueNotePath,
} from "src/fish-note/fish-note";
import { languageName, sortedLanguages, suggestDeckTag } from "src/tts/languages";

describe("fishNoteText", () => {
    const template = { text: "#DEN :: ", cursor: 5 };

    test("frontmatter and the first card, cursor in the card", () => {
        const { text, cursor } = fishNoteText("#DEN", null, template);
        expect(text).toBe('---\ncssclasses:\n  - fishnote\nfishcards: "#DEN"\n---\n#DEN :: ');
        expect(text.slice(cursor)).toBe(":: ");
    });

    test("a flashcard tag line when needed", () => {
        const { text, cursor } = fishNoteText("#DEN", "#flashcards", template);
        expect(text.endsWith("---\n#flashcards\n\n#DEN :: ")).toBe(true);
        expect(text.slice(cursor)).toBe(":: ");
    });
});

describe("reading a fish note", () => {
    test("deck tag from the frontmatter", () => {
        expect(fishNoteDeckTag({ fishcards: "#DEN" })).toBe("#DEN");
        expect(fishNoteDeckTag({ fishcards: "DEN" })).toBe("#DEN");
        expect(fishNoteDeckTag({ fishcards: 3 })).toBeNull();
        expect(fishNoteDeckTag(null)).toBeNull();
    });

    test("marked by the deck key or the css class", () => {
        expect(isFishNote({ fishcards: "#DEN" })).toBe(true);
        expect(isFishNote({ cssclasses: ["wide", "fishnote"] })).toBe(true);
        expect(isFishNote({ cssclasses: "fishnote" })).toBe(true);
        expect(isFishNote({ cssclasses: ["wide"] })).toBe(false);
        expect(isFishNote(undefined)).toBe(false);
    });
});

describe("file names", () => {
    test("characters that are not allowed are removed", () => {
        expect(fishNoteFileName("Niemiecki: A1/rozdział 2", "Fiszki")).toBe(
            "Niemiecki A1 rozdział 2.md",
        );
        expect(fishNoteFileName("   ", "Fiszki")).toBe("Fiszki.md");
        expect(fishNoteFileName("Słówka.md", "Fiszki")).toBe("Słówka.md");
    });

    test("first free path", () => {
        const taken = new Set(["Niemiecki/Słówka.md", "Niemiecki/Słówka 2.md"]);
        expect(uniqueNotePath("Niemiecki", "Słówka.md", (p) => taken.has(p))).toBe(
            "Niemiecki/Słówka 3.md",
        );
        expect(uniqueNotePath("/", "A.md", () => false)).toBe("A.md");
        expect(uniqueNotePath("", "A.md", () => false)).toBe("A.md");
    });
});

describe("languages", () => {
    test("names in both languages", () => {
        expect(languageName("de-DE", true)).toBe("Niemiecki");
        expect(languageName("de-de", false)).toBe("German");
        expect(languageName("xx-YY", true)).toBe("xx-YY");
    });

    test("sorted by the shown name", () => {
        const pl = sortedLanguages(true).map((l) => l.pl);
        expect(pl.indexOf("Angielski (USA)")).toBeLessThan(pl.indexOf("Niemiecki"));
    });

    test("tag suggestion", () => {
        expect(suggestDeckTag("Niemiecki")).toBe("#NIE");
        expect(suggestDeckTag("Łacina")).toBe("#LAC");
        expect(suggestDeckTag("??")).toBe("");
    });
});

describe("quick add", () => {
    test("one card line", () => {
        expect(quickCardLine("#DEN", " Hund ", "pies", "::")).toBe("#DEN Hund:: pies");
        expect(quickCardLine("#DEN", "Hund", "pies", ":::", "obrazy/hund.jpg")).toBe(
            "#DEN Hund::: pies ![[obrazy/hund.jpg]]",
        );
        expect(quickCardLine("#DEN", "Hund", "", "::", "h.jpg")).toBe("#DEN Hund:: ![[h.jpg]]");
        expect(quickCardLine("#DEN", "a\nb", "c", "::")).toBe("#DEN a b:: c");
    });

    test("empty side: no card", () => {
        expect(quickCardLine("#DEN", "", "pies", "::")).toBeNull();
        expect(quickCardLine("#DEN", "Hund", " ", "::")).toBeNull();
    });

    test("added at the end, nothing above changes", () => {
        expect(appendCardLine("a\n<!--SR:x-->", "#DEN b:: c")).toBe("a\n<!--SR:x-->\n#DEN b:: c\n");
        expect(appendCardLine("a\n", "x")).toBe("a\nx\n");
        expect(appendCardLine("", "x")).toBe("x\n");
    });
});
