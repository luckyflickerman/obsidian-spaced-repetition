import { deckNotes, noteName } from "src/card-authoring/deck-notes";

describe("deckNotes", () => {
    test("one entry per note, most cards first", () => {
        const notes = deckNotes([
            { path: "Niemiecki/Słówka.md", file: "a" },
            { path: "Niemiecki/Zdania.md", file: "b" },
            { path: "Niemiecki/Zdania.md", file: "b" },
        ]);
        expect(notes.map((n) => [n.name, n.cards, n.file])).toEqual([
            ["Zdania", 2, "b"],
            ["Słówka", 1, "a"],
        ]);
    });

    test("same count: by name", () => {
        const notes = deckNotes([
            { path: "b.md", file: 1 },
            { path: "a.md", file: 2 },
        ]);
        expect(notes.map((n) => n.name)).toEqual(["a", "b"]);
    });

    test("no cards: no notes", () => {
        expect(deckNotes([])).toEqual([]);
    });

    test("noteName drops the folder and .md", () => {
        expect(noteName("Fiszki/Angielski.md")).toBe("Angielski");
        expect(noteName("plain")).toBe("plain");
    });
});
