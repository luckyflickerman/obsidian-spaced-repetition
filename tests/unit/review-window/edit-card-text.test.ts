import { joinCardText, splitCardText } from "src/review-window/edit-card-text";

describe("splitCardText — one-line cards", () => {
    test("word:: translation", () => {
        expect(splitCardText("mediocre:: przeciętny", "::", false)).toEqual({
            front: "mediocre",
            back: " przeciętny",
        });
    });

    test("a second separator stays in the answer", () => {
        expect(splitCardText("a:: b:: c", "::", false)).toEqual({ front: "a", back: " b:: c" });
    });

    test("both directions (:::)", () => {
        expect(splitCardText("dog::: pies", ":::", false)).toEqual({ front: "dog", back: " pies" });
    });

    test("no separator: everything in the front", () => {
        expect(splitCardText("just text", "::", false)).toEqual({ front: "just text", back: "" });
    });

    test("empty separator", () => {
        expect(splitCardText("a:: b", "", false)).toEqual({ front: "a:: b", back: "" });
    });

    test("round trip keeps the text", () => {
        for (const text of ["a:: b", "a:: b:: c", "q?:: a?", "x::"]) {
            const p = splitCardText(text, "::", false);
            expect(joinCardText(p.front, p.back, "::", false)).toBe(text);
        }
    });
});

describe("splitCardText — multi-line cards", () => {
    test("question mark inside the question is not the separator", () => {
        const text = "Co znaczy hello?\n?\ncześć";
        expect(splitCardText(text, "?", true)).toEqual({
            front: "Co znaczy hello?",
            back: "cześć",
        });
    });

    test("several lines on both sides", () => {
        const text = "line 1\nline 2?\n?\nanswer 1\nanswer 2? yes";
        expect(splitCardText(text, "?", true)).toEqual({
            front: "line 1\nline 2?",
            back: "answer 1\nanswer 2? yes",
        });
    });

    test("separator line with spaces around it", () => {
        expect(splitCardText("q\n ? \na", "?", true)).toEqual({ front: "q", back: "a" });
    });

    test("reversed (??)", () => {
        expect(splitCardText("Why?\n??\nBecause?", "??", true)).toEqual({
            front: "Why?",
            back: "Because?",
        });
    });

    test("no separator line: everything in the front", () => {
        expect(splitCardText("What?\nnothing", "?", true)).toEqual({
            front: "What?\nnothing",
            back: "",
        });
    });

    test("round trip keeps the text", () => {
        for (const text of [
            "Co znaczy hello?\n?\ncześć",
            "a\nb?\n?\nc\nd?",
            "- item 1\n  - nested?\n?\n  indented answer",
        ]) {
            const p = splitCardText(text, "?", true);
            expect(joinCardText(p.front, p.back, "?", true)).toBe(text);
        }
    });

    test("join adds the line breaks around the separator", () => {
        expect(joinCardText("q", "a", "?", true)).toBe("q\n?\na");
        expect(joinCardText("q\n", "\na", "?", true)).toBe("q\n?\na");
    });
});
