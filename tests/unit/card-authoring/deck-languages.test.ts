import { defaultDeckFile, moveTagRulesToDecks } from "src/card-authoring/deck-languages";

const ENG = { tag: "#ENG", file: "Fiszki/Angielski.md", lang: "en-GB" };

describe("moveTagRulesToDecks", () => {
    test("a tag rule becomes a deck", () => {
        const r = moveTagRulesToDecks("#DEN = de-DE", [ENG]);
        expect(r.decks).toEqual([ENG, { tag: "#DEN", file: "Fiszki/DEN.md", lang: "de-DE" }]);
        expect(r.rules).toBe("");
        expect(r.changed).toBe(true);
    });

    test("a deck without a language gets it", () => {
        const r = moveTagRulesToDecks("#esp: es_ES", [{ tag: "#ESP", file: "x.md", lang: "" }]);
        expect(r.decks).toEqual([{ tag: "#ESP", file: "x.md", lang: "es-ES" }]);
        expect(r.rules).toBe("");
    });

    test("same language: the rule is simply dropped", () => {
        const r = moveTagRulesToDecks("#eng = en-GB", [ENG]);
        expect(r.decks).toEqual([ENG]);
        expect(r.rules).toBe("");
        expect(r.changed).toBe(true);
    });

    test("another language than the deck: the rule stays (it wins today)", () => {
        const r = moveTagRulesToDecks("#ENG = en-US", [ENG]);
        expect(r.decks).toEqual([ENG]);
        expect(r.rules).toBe("#ENG = en-US");
        expect(r.changed).toBe(false);
    });

    test("path rules and comments stay", () => {
        const text = "// my rules\nlanguages/german = de-DE\n#DEN = de-DE\n\nbroken line";
        const r = moveTagRulesToDecks(text, []);
        expect(r.rules).toBe("// my rules\nlanguages/german = de-DE\nbroken line");
        expect(r.decks.map((d) => d.tag)).toEqual(["#DEN"]);
    });

    test("nothing to move: unchanged", () => {
        const r = moveTagRulesToDecks("", [ENG]);
        expect(r).toEqual({ rules: "", decks: [ENG], changed: false });
    });

    test("the input decks are not modified", () => {
        const decks = [{ tag: "#ESP", file: "x.md", lang: "" }];
        moveTagRulesToDecks("#ESP = es-ES", decks);
        expect(decks[0].lang).toBe("");
    });

    test("default file", () => {
        expect(defaultDeckFile("#DEN")).toBe("Fiszki/DEN.md");
        expect(defaultDeckFile("#lang/de")).toBe("Fiszki/lang de.md");
    });
});
