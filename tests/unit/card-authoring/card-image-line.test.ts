import {
    embedSide,
    findEmbed,
    imageFolderFor,
    moveEmbedToSide,
    removeEmbed,
    replaceEmbedLink,
    separatorIndex,
    shrinkableExtension,
} from "src/card-authoring/card-image";

const SEPS = ["::", ":::"];

describe("an image in a one-line card", () => {
    const line = "#DEN Hund:: pies ![[obrazy/hund.webp]]";

    test("found by the link or the file name", () => {
        expect(findEmbed(line, "obrazy/hund.webp")).toEqual({
            from: 17,
            to: 38,
            link: "obrazy/hund.webp",
        });
        expect(findEmbed(line, "hund.webp")?.link).toBe("obrazy/hund.webp");
        expect(findEmbed(line, "katze.png")).toBeNull();
        expect(findEmbed("x ![[a.png|120]]", "a.png")?.link).toBe("a.png");
    });

    test("side of the card", () => {
        const e = findEmbed(line, "hund.webp");
        expect(embedSide(line, e, SEPS)).toBe("back");
        const front = "#DEN Hund ![[hund.webp]]:: pies";
        expect(embedSide(front, findEmbed(front, "hund.webp"), SEPS)).toBe("front");
    });

    test("move to the question and back", () => {
        const e = findEmbed(line, "hund.webp");
        const front = moveEmbedToSide(line, e, "front", SEPS);
        expect(front).toBe("#DEN Hund ![[obrazy/hund.webp]]:: pies");
        const back = moveEmbedToSide(front, findEmbed(front, "hund.webp"), "back", SEPS);
        expect(back).toBe(line);
    });

    test("both directions (:::) and a schedule comment on the line", () => {
        const l = "#DEN Hund::: pies ![[h.png]] <!--SR:!2026-11-08,3,250-->";
        const moved = moveEmbedToSide(l, findEmbed(l, "h.png"), "front", SEPS);
        expect(moved).toBe("#DEN Hund ![[h.png]]::: pies <!--SR:!2026-11-08,3,250-->");
        const back = moveEmbedToSide(moved, findEmbed(moved, "h.png"), "back", SEPS);
        expect(back).toBe(l);
    });

    test("no separator: nothing moved", () => {
        const l = "just ![[h.png]]";
        expect(moveEmbedToSide(l, findEmbed(l, "h.png"), "front", SEPS)).toBeNull();
    });

    test("remove keeps the rest", () => {
        const e = findEmbed(line, "hund.webp");
        expect(removeEmbed(line, e)).toBe("#DEN Hund:: pies");
        const mid = "#DEN Hund ![[h.png]]:: pies";
        expect(removeEmbed(mid, findEmbed(mid, "h.png"))).toBe("#DEN Hund:: pies");
    });

    test("replace the file, keep the size", () => {
        const l = "a:: b ![[old.png|200]]";
        expect(replaceEmbedLink(l, findEmbed(l, "old.png"), "obrazy/new.jpg")).toBe(
            "a:: b ![[obrazy/new.jpg|200]]",
        );
    });

    test("separator: the first one in the line, longer one wins at the same place", () => {
        expect(separatorIndex("a::: b", SEPS)).toEqual({ at: 1, sep: ":::" });
        expect(separatorIndex("a:: b", SEPS)).toEqual({ at: 1, sep: "::" });
        expect(separatorIndex("a b", SEPS)).toBeNull();
    });
});

describe("image folder and formats", () => {
    test("folder next to the note", () => {
        expect(imageFolderFor("Niemiecki/Słówka.md", "obrazy")).toBe("Niemiecki/obrazy");
        expect(imageFolderFor("Słówka.md", "/obrazy/")).toBe("obrazy");
        expect(imageFolderFor("Niemiecki/Słówka.md", "")).toBeNull();
    });

    test("only png and jpeg are shrunk in place", () => {
        expect(shrinkableExtension("JPG")).toBe("image/jpeg");
        expect(shrinkableExtension("png")).toBe("image/png");
        expect(shrinkableExtension("heic")).toBeNull();
    });
});
