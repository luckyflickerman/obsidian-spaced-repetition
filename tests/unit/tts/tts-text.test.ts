import {
    buildSpeechPlan,
    cleanMarkdownForSpeech,
    extractMarkedSegments,
    fallbackSpeechSide,
    parseLangAttribute,
    splitIntoSentences,
    TextEdit,
    toggleUnderline,
} from "src/tts/tts-text";

function apply(doc: string, edit: TextEdit) {
    const text = doc.slice(0, edit.from) + edit.insert + doc.slice(edit.to);
    return { text, selected: text.slice(edit.selectionFrom, edit.selectionTo) };
}

describe("extractMarkedSegments", () => {
    test("single <u>", () => {
        expect(extractMarkedSegments("Este es un <u>gato</u>")).toEqual([
            { text: "gato", lang: "" },
        ]);
    });

    test("several fragments are kept in order", () => {
        expect(extractMarkedSegments("<u>el gato</u> y <u>el perro</u>.")).toEqual([
            { text: "el gato", lang: "" },
            { text: "el perro", lang: "" },
        ]);
    });

    test("lang attribute overrides the language", () => {
        expect(
            extractMarkedSegments(
                `<u lang="en">computer</u>, <u lang='en_GB'>lorry</u>, <u lang=de>Hund</u>`,
            ),
        ).toEqual([
            { text: "computer", lang: "en" },
            { text: "lorry", lang: "en-GB" },
            { text: "Hund", lang: "de" },
        ]);
    });

    test("inside bold, and with formatting inside", () => {
        expect(extractMarkedSegments("**<u>gato</u>** y <u>**perro**</u>")).toEqual([
            { text: "gato", lang: "" },
            { text: "perro", lang: "" },
        ]);
    });

    test("multiline fragment and uppercase tag", () => {
        expect(extractMarkedSegments("<U>la\ncasa</U>")).toEqual([{ text: "la\ncasa", lang: "" }]);
    });

    test("no marks, empty marks and marks inside comments", () => {
        expect(extractMarkedSegments("Este es un gato")).toEqual([]);
        expect(extractMarkedSegments("<u> </u><u></u>")).toEqual([]);
        expect(extractMarkedSegments("gato <!-- <u>perro</u> --> %%<u>pez</u>%%")).toEqual([]);
        expect(extractMarkedSegments("")).toEqual([]);
    });

    test("parseLangAttribute", () => {
        expect(parseLangAttribute(undefined)).toBe("");
        expect(parseLangAttribute(' class="x"')).toBe("");
        expect(parseLangAttribute(' lang="zh_cn"')).toBe("zh-CN");
        expect(parseLangAttribute(' lang="!!"')).toBe("");
    });
});

describe("cleanMarkdownForSpeech", () => {
    test("wiki links keep their visible text", () => {
        expect(cleanMarkdownForSpeech("Mira [[gato|el gato]] y [[perro]]")).toBe(
            "Mira el gato y perro",
        );
        expect(cleanMarkdownForSpeech("[[animales/perro#Raza]] [[gato.md]]")).toBe("perro gato");
    });

    test("markdown links and bare urls", () => {
        expect(cleanMarkdownForSpeech("[enlace](https://x.com) y https://y.com/a")).toBe(
            "enlace y",
        );
    });

    test("images and embeds are removed", () => {
        expect(cleanMarkdownForSpeech("![[gato.png]] Hola ![alt](x.png)")).toBe("Hola");
    });

    test("scheduling and other comments are removed", () => {
        expect(cleanMarkdownForSpeech("Hola <!--SR:!2024-01-01,3,250--> %%nota%% mundo")).toBe(
            "Hola mundo",
        );
    });

    test("cloze markers keep the answer", () => {
        expect(cleanMarkdownForSpeech("Es un ==gato==")).toBe("Es un gato");
        expect(cleanMarkdownForSpeech("Es un {{c1::gato::animal}} y {{perro}}")).toBe(
            "Es un gato y perro",
        );
    });

    test("tags are removed, headings are not tags", () => {
        expect(cleanMarkdownForSpeech("Hola #hiszpanski #lang/es mundo")).toBe("Hola mundo");
        expect(cleanMarkdownForSpeech("## Título\nC# y el número #1")).toBe(
            "Título\nC# y el número",
        );
    });

    test("formatting, html, lists, quotes, callouts and entities", () => {
        expect(cleanMarkdownForSpeech("**negrita**, *cursiva*, _otra_ y ~~no~~ `code`")).toBe(
            "negrita, cursiva, otra y no code",
        );
        expect(cleanMarkdownForSpeech("snake_case")).toBe("snake_case");
        expect(cleanMarkdownForSpeech("<span style='x'>uno</span><br>dos&nbsp;&amp; tres")).toBe(
            "uno\ndos & tres",
        );
        expect(cleanMarkdownForSpeech("- uno\n1. dos\n- [x] tres")).toBe("uno\ndos\ntres");
        expect(cleanMarkdownForSpeech("> [!note] Nota\n> texto")).toBe("Nota\ntexto");
        expect(cleanMarkdownForSpeech("frase ^abc123")).toBe("frase");
    });

    test("code blocks, math and empty lines are dropped", () => {
        expect(cleanMarkdownForSpeech("uno\n```js\nx()\n```\n$$x^2$$ $y$\n\n---\ndos")).toBe(
            "uno\ndos",
        );
        expect(cleanMarkdownForSpeech("")).toBe("");
    });

    test("tables become a readable list", () => {
        expect(cleanMarkdownForSpeech("| a | b |\n|---|---|\n| gato | perro |")).toBe(
            "a, b\ngato, perro",
        );
    });
});

describe("splitIntoSentences", () => {
    test("splits at sentence ends", () => {
        expect(splitIntoSentences("Hola. ¿Qué tal? ¡Bien! Adiós")).toEqual([
            "Hola.",
            "¿Qué tal?",
            "¡Bien!",
            "Adiós",
        ]);
    });

    test("keeps closing quotes with the sentence and splits lines", () => {
        expect(splitIntoSentences('Dijo "sí." Luego\notra línea')).toEqual([
            'Dijo "sí."',
            "Luego",
            "otra línea",
        ]);
    });

    test("Chinese punctuation without spaces", () => {
        expect(splitIntoSentences("你好。这是一只猫。")).toEqual(["你好。", "这是一只猫。"]);
    });

    test("respects the length limit, preferring commas, then spaces", () => {
        const text =
            "Este es un texto muy largo, con muchas palabras y comas, que tiene que dividirse en partes pequeñas para que Chrome no lo corte";
        const chunks = splitIntoSentences(text, 40);
        expect(chunks.length).toBeGreaterThan(2);
        for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(40);
        expect(chunks[0]).toBe("Este es un texto muy largo,");
        expect(chunks.join(" ").split(/\s+/)).toEqual(text.split(/\s+/));
    });

    test("hard cut when there are no spaces", () => {
        const chunks = splitIntoSentences("猫".repeat(25), 10);
        expect(chunks).toEqual(["猫".repeat(10), "猫".repeat(10), "猫".repeat(5)]);
    });

    test("empty input", () => {
        expect(splitIntoSentences("")).toEqual([]);
        expect(splitIntoSentences("  \n ")).toEqual([]);
    });
});

describe("buildSpeechPlan", () => {
    const answerOnly = (answer: string) => ({ question: "el gato", answer });

    test("marked fragments in the card language", () => {
        expect(buildSpeechPlan(answerOnly("Este es un <u>gato</u>"), "es-ES", "question")).toEqual([
            { text: "gato", lang: "es-ES" },
        ]);
    });

    test("<u> in the question counts too (question first, then answer)", () => {
        const card = {
            question: "He <u>forestalled</u> her question.",
            answer: "uprzedził jej pytanie",
        };
        expect(buildSpeechPlan(card, "en-GB", "none")).toEqual([
            { text: "forestalled", lang: "en-GB" },
        ]);
        const both = { question: "<u>cat</u>", answer: '<u lang="es">gato</u>' };
        expect(buildSpeechPlan(both, "en-GB", "none")).toEqual([
            { text: "cat", lang: "en-GB" },
            { text: "gato", lang: "es" },
        ]);
    });

    test("per-fragment language override", () => {
        expect(
            buildSpeechPlan(
                answerOnly(`<u lang="en">computer</u> = <u>ordenador</u>`),
                "es-ES",
                "question",
            ),
        ).toEqual([
            { text: "computer", lang: "en" },
            { text: "ordenador", lang: "es-ES" },
        ]);
    });

    test("no card language: only fragments with their own language", () => {
        expect(
            buildSpeechPlan(
                answerOnly(`<u lang="en">computer</u> <u>ordenador</u>`),
                null,
                "question",
            ),
        ).toEqual([{ text: "computer", lang: "en" }]);
        expect(buildSpeechPlan(answerOnly("Este es un gato"), null, "question")).toEqual([]);
    });

    test("nothing underlined: `#ENG forestalled:: uprzedzić` reads the question", () => {
        const card = { question: "forestalled", answer: "uprzedzić" };
        expect(buildSpeechPlan(card, "en-GB", "question")).toEqual([
            { text: "forestalled", lang: "en-GB" },
        ]);
        expect(buildSpeechPlan(card, "en-GB", "answer")).toEqual([
            { text: "uprzedzić", lang: "en-GB" },
        ]);
        expect(buildSpeechPlan(card, "en-GB", "none")).toEqual([]);
    });

    test("the reversed side of a `:::` card reads the foreign side (the answer)", () => {
        const reversed = { question: "uprzedzić", answer: "forestalled", reversedSibling: true };
        expect(buildSpeechPlan(reversed, "en-GB", "question")).toEqual([
            { text: "forestalled", lang: "en-GB" },
        ]);
        expect(buildSpeechPlan(reversed, "en-GB", "answer")).toEqual([
            { text: "uprzedzić", lang: "en-GB" },
        ]);
        expect(fallbackSpeechSide("question", true)).toBe("answer");
        expect(fallbackSpeechSide("none", true)).toBe("none");
        expect(fallbackSpeechSide("answer", false)).toBe("answer");
    });

    test("formatting is cleaned; empty sides are not read", () => {
        expect(
            buildSpeechPlan(
                { question: "Es un **gato** #hiszpanski", answer: "" },
                "es-ES",
                "question",
            ),
        ).toEqual([{ text: "Es un gato", lang: "es-ES" }]);
        expect(
            buildSpeechPlan({ question: "![[foto.png]]", answer: "x" }, "es-ES", "question"),
        ).toEqual([]);
    });
});

describe("toggleUnderline", () => {
    const doc = "Este es un gato";

    test("wraps the selection", () => {
        const result = apply(doc, toggleUnderline(doc, 11, 15));
        expect(result.text).toBe("Este es un <u>gato</u>");
        expect(result.selected).toBe("gato");
    });

    test("works with a backwards selection", () => {
        expect(apply(doc, toggleUnderline(doc, 15, 11)).text).toBe("Este es un <u>gato</u>");
    });

    test("spaces at the edges stay outside the tags", () => {
        const result = apply(doc, toggleUnderline(doc, 7, 15));
        expect(result.text).toBe("Este es <u>un gato</u>");
        expect(result.selected).toBe("un gato");
    });

    test("unwraps when the tags are inside the selection", () => {
        const marked = "Este es un <u>gato</u>";
        const result = apply(marked, toggleUnderline(marked, 11, marked.length));
        expect(result.text).toBe(doc);
        expect(result.selected).toBe("gato");
    });

    test("unwraps when the tags are around the selection (also with lang)", () => {
        const marked = "Este es un <u>gato</u>!";
        const result = apply(marked, toggleUnderline(marked, 14, 18));
        expect(result.text).toBe("Este es un gato!");
        expect(result.selected).toBe("gato");

        const withLang = 'a <u lang="en">computer</u> b';
        const start = withLang.indexOf("computer");
        const r2 = apply(withLang, toggleUnderline(withLang, start, start + 8));
        expect(r2.text).toBe("a computer b");
        expect(r2.selected).toBe("computer");
    });

    test("a selection with two marked words is wrapped, not mangled", () => {
        const two = "<u>a</u> y <u>b</u>";
        expect(apply(two, toggleUnderline(two, 0, two.length)).text).toBe(`<u>${two}</u>`);
    });

    test("toggling twice restores the text", () => {
        const once = apply(doc, toggleUnderline(doc, 11, 15)).text;
        const start = once.indexOf("gato");
        expect(apply(once, toggleUnderline(once, start, start + 4)).text).toBe(doc);
    });

    test("empty selection inserts empty tags with the cursor inside", () => {
        const edit = toggleUnderline(doc, 5, 5);
        const result = apply(doc, edit);
        expect(result.text).toBe("Este <u></u>es un gato");
        expect(edit.selectionFrom).toBe(8);
        expect(edit.selectionTo).toBe(8);
    });

    test("out-of-range offsets are clamped", () => {
        expect(apply("gato", toggleUnderline("gato", -5, 99)).text).toBe("<u>gato</u>");
    });
});
