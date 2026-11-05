import {
    backupPath,
    embeddedImageLinks,
    formatSize,
    shrinkCandidates,
} from "src/card-authoring/image-shrink";

describe("shrinkCandidates", () => {
    test("big PNG / JPEG only, each once, biggest first", () => {
        const files = [
            { path: "a.jpg", extension: "jpg", size: 500_000 },
            { path: "b.png", extension: "png", size: 2_000_000 },
            { path: "c.webp", extension: "webp", size: 3_000_000 },
            { path: "d.jpeg", extension: "jpeg", size: 100_000 },
            { path: "a.jpg", extension: "jpg", size: 500_000 },
        ];
        expect(shrinkCandidates(files).map((f) => f.path)).toEqual(["b.png", "a.jpg"]);
    });
});

describe("backups and sizes", () => {
    test("backup path keeps the folders", () => {
        expect(backupPath(new Date(2026, 10, 5, 9, 7), "Niemiecki/obrazy/hund.jpg")).toBe(
            "Fishcards/kopie zdjęć/2026-11-05 09.07/Niemiecki/obrazy/hund.jpg",
        );
    });

    test("sizes", () => {
        expect(formatSize(1.5 * 1024 * 1024, true)).toBe("1,5 MB");
        expect(formatSize(1.5 * 1024 * 1024, false)).toBe("1.5 MB");
        expect(formatSize(300 * 1024, false)).toBe("300 KB");
        expect(formatSize(10, false)).toBe("1 KB");
    });
});

describe("embeddedImageLinks", () => {
    test("images in a card text", () => {
        expect(
            embeddedImageLinks(
                "pies ![[obrazy/hund.jpg|200]] i ![[Katze.PNG]] ![[note]] ![[x.jpg]] ![[x.jpg]]",
            ),
        ).toEqual(["obrazy/hund.jpg", "Katze.PNG", "x.jpg"]);
        expect(embeddedImageLinks("")).toEqual([]);
    });
});
