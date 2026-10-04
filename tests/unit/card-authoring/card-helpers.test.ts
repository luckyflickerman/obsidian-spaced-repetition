import { detectCards } from "src/card-authoring/card-detect";
import {
    CardRef,
    duplicateKey,
    duplicatesOf,
    findDuplicates,
    mergeRefs,
    normalizeQuestion,
} from "src/card-authoring/card-duplicates";
import {
    embedInsert,
    fitWidth,
    imageFileName,
    isPastedImageName,
    uniqueFileName,
} from "src/card-authoring/card-image";
import {
    counterDay,
    counterText,
    countToday,
    createCardHistory,
    createdPerDay,
    goalProgress,
    normalizeCardHistory,
    observeCards,
    OLD,
} from "src/card-authoring/daily-counter";
import { DEFAULT_SETTINGS } from "src/data/settings";

const settings = { ...DEFAULT_SETTINGS, flashcardTags: ["#flashcards", "#ENG"] };

describe("normalizeQuestion", () => {
    test.each([
        ["Forestalled", "forestalled"],
        ["  forestalled  ", "forestalled"],
        ["<u>forestalled</u>", "forestalled"],
        ["**forestalled**", "forestalled"],
        ["forestalled,", "forestalled"],
        ["¿Qué tal?", "qué tal"],
        ["#ENG forestalled", "forestalled"],
        ["He <u>forestalled</u> her   question.", "he forestalled her question"],
        ["[[forestall|forestalled]]", "forestalled"],
        ["word ![[img.png]]", "word"],
        ["", ""],
    ])("%s → %s", (input, expected) => {
        expect(normalizeQuestion(input)).toBe(expected);
    });
});

/** A deck like the user's, with 13 words written twice (different case, <u>, punctuation…). */
const USER_DECK = [
    "#ENG forestalled:: uprzedzić",
    "#ENG imperceptibly:: niepostrzeżenie",
    "#ENG ushering:: wprowadzać",
    "#ENG gingerly:: ostrożnie",
    "#ENG scowled:: skrzywił się",
    "#ENG bewildered:: oszołomiony",
    "#ENG trudged:: brnął",
    "#ENG muttered:: mruknął",
    "#ENG peered:: zerknął",
    "#ENG clutched:: ściskał",
    "#ENG beamed:: rozpromienił się",
    "#ENG hoarse:: ochrypły",
    "#ENG glared:: spojrzał gniewnie",
    "#ENG dawdled:: guzdrał się",
    "#ENG prodded:: szturchnął",
    "#ENG Forestalled:: uprzedził",
    "#ENG imperceptibly.:: niezauważalnie",
    "#ENG <u>ushering</u>:: prowadzić",
    "#ENG gingerly :: delikatnie",
    "<!--SR:!2026-10-07,3,250-->",
    "#ENG SCOWLED:: skrzywiła się",
    "#ENG bewildered!:: zdezorientowany",
    "#ENG trudged::: brnęła",
    "#ENG **muttered**:: wymamrotał",
    "#ENG peered:: wpatrywał się",
    "#ENG clutched,:: chwycił",
    "#ENG beamed:: promieniał",
    "#ENG hoarse:: zachrypnięty",
    "#ENG glared:: piorunował wzrokiem",
    "#ENG cauldron:: kocioł",
].join("\n");

describe("duplicates", () => {
    const refs: CardRef[] = detectCards(USER_DECK, settings).cards.map((c) => ({
        deckTag: c.deckTag ?? "",
        key: normalizeQuestion(c.question),
        question: c.question,
        file: "Fiszki/Angielski.md",
        line: c.firstLine,
    }));

    test("the user's deck: 13 repeated words", () => {
        const groups = findDuplicates(refs);
        expect(groups).toHaveLength(13);
        expect(groups.every((g) => g.length === 2)).toBe(true);
        expect(groups.map((g) => g[0].key).sort()).toEqual(
            [
                "beamed",
                "bewildered",
                "clutched",
                "forestalled",
                "gingerly",
                "glared",
                "hoarse",
                "imperceptibly",
                "muttered",
                "peered",
                "scowled",
                "trudged",
                "ushering",
            ].sort(),
        );
    });

    test("a new card: warn with the original, not with itself", () => {
        const found = duplicatesOf("<u>Forestalled</u>", "#ENG", refs, {
            file: "Fiszki/Angielski.md",
            line: 0,
        });
        expect(found.map((r) => r.line)).toEqual([15]);
        expect(duplicatesOf("forestalled", "#ESP", refs)).toEqual([]);
        expect(duplicatesOf("", "#ENG", refs)).toEqual([]);
    });

    test("other decks are separate; the current file replaces its synced cards", () => {
        const other: CardRef = { ...refs[0], deckTag: "#ESP", file: "Fiszki/Hiszpański.md" };
        expect(findDuplicates([refs[0], other])).toEqual([]);
        const merged = mergeRefs(refs, "Fiszki/Angielski.md", [refs[1]]);
        expect(merged).toEqual([refs[1]]);
        expect(duplicateKey("#ENG", "Forestalled!")).toBe("#eng|forestalled");
    });
});

describe("daily counter", () => {
    const at = (h: number, m = 0, day = 4) => new Date(2026, 9, day, h, m);

    test("the day starts at startOfDay", () => {
        expect(counterDay(at(10), "00:00:00")).toBe("2026-10-04");
        expect(counterDay(at(3, 59), "04:00:00")).toBe("2026-10-03");
        expect(counterDay(at(4), "04:00:00")).toBe("2026-10-04");
        expect(counterDay(at(0, 30, 1), "04:00:00")).toBe("2026-09-30"); // month boundary
        expect(counterDay(at(10), "bad")).toBe("2026-10-04");
    });

    test("first run marks the existing cards old; later ones count once", () => {
        const h = createCardHistory();
        expect(observeCards(h, ["a", "b", "c"], at(9), "00:00:00")).toBe(0);
        expect(countToday(h, at(9), "00:00:00")).toBe(0);
        expect(h.seen.a).toBe(OLD);
        expect(observeCards(h, ["a", "b", "c", "d", "e"], at(10), "00:00:00")).toBe(2);
        expect(observeCards(h, ["d", "e"], at(11), "00:00:00")).toBe(0); // seen again: not counted twice
        expect(countToday(h, at(12), "00:00:00")).toBe(2);
        expect(countToday(h, at(10, 0, 5), "00:00:00")).toBe(0); // next day
        expect(counterText(4, 10)).toBe("4/10");
    });

    test("a card typed at 02:00 counts for the previous day with startOfDay 04:00", () => {
        const h = createCardHistory();
        observeCards(h, [], at(1), "04:00:00");
        observeCards(h, ["late"], at(2, 0, 5), "04:00:00");
        expect(h.seen.late).toBe("2026-10-04");
        expect(countToday(h, at(23), "04:00:00")).toBe(1);
    });

    test("stored history is repaired; days are kept for the calendar", () => {
        const h = normalizeCardHistory({
            initialized: true,
            since: "bad",
            seen: { a: "2026-06-01", b: "2026-10-01", c: OLD, bad: "yesterday" },
        });
        expect(h.seen).toEqual({ a: "2026-06-01", b: "2026-10-01", c: OLD });
        expect(h.since).toBeUndefined();
        expect(observeCards(h, ["a"], at(12), "00:00:00")).toBe(0);
        // a history from before `since`: counting started with the first counted card
        expect(h.since).toBe("2026-06-01");
        expect(normalizeCardHistory(null)).toEqual(createCardHistory());
    });

    test("cards created per day for the calendar (null = before counting started)", () => {
        const h = createCardHistory();
        expect(createdPerDay(h)("2026-10-04")).toBeNull();
        observeCards(h, ["old1", "old2"], at(9, 0, 2), "00:00:00");
        expect(h.since).toBe("2026-10-02");
        observeCards(h, ["a"], at(10, 0, 3), "00:00:00");
        observeCards(h, ["b", "c"], at(10, 0, 4), "00:00:00");
        const created = createdPerDay(h);
        expect(created("2026-10-01")).toBeNull();
        expect(created("2026-10-02")).toBe(0);
        expect(created("2026-10-03")).toBe(1);
        expect(created("2026-10-04")).toBe(2);
        expect(created("2026-10-05")).toBe(0);
    });

    test("goal progress", () => {
        expect(goalProgress(4, 10)).toEqual({
            done: 4,
            goal: 10,
            left: 6,
            fraction: 0.4,
            reached: false,
        });
        expect(goalProgress(12, 10)).toEqual({
            done: 12,
            goal: 10,
            left: 0,
            fraction: 1,
            reached: true,
        });
        expect(goalProgress(-1, 0)).toEqual({
            done: 0,
            goal: 1,
            left: 1,
            fraction: 0,
            reached: false,
        });
    });
});

describe("images", () => {
    test("file name from the word", () => {
        expect(imageFileName("forestalled", "png")).toBe("forestalled.png");
        expect(imageFileName("He <u>forestalled</u> her question.", "JPG")).toBe("forestalled.jpg");
        expect(imageFileName('what/is: "this"?', ".png")).toBe("what is this.png");
        expect(imageFileName("¿Qué tal?", "png")).toBe("¿Qué tal.png");
        expect(imageFileName("   ", "png")).toBe("fiszka.png");
        expect(imageFileName("x".repeat(100), "png")).toBe("x".repeat(60) + ".png");
    });

    test("name collisions", () => {
        const taken = new Set(["forestalled.png", "forestalled 2.png"]);
        expect(uniqueFileName("forestalled.png", (n) => taken.has(n))).toBe("forestalled 3.png");
        expect(uniqueFileName("new.png", (n) => taken.has(n))).toBe("new.png");
    });

    test("embed at the end of a single-line card (before a same-line schedule)", () => {
        const lines = [
            "#ENG forestalled:: uprzedzić",
            "#ENG peered:: zerknął <!--SR:!2026-10-07,3,250-->",
        ];
        const cards = detectCards(lines.join("\n"), settings).cards;
        expect(embedInsert(lines, cards[0], "forestalled.png")).toEqual({
            line: 0,
            ch: 28,
            text: " ![[forestalled.png]]",
        });
        expect(embedInsert(lines, cards[1], "peered.png")).toEqual({
            line: 1,
            ch: 21,
            text: " ![[peered.png]]",
        });
    });

    test("embed in the last line of a block, above its schedule", () => {
        const lines = [
            "#ENG",
            "He <u>forestalled</u> her.",
            "?",
            "uprzedził ją",
            "<!--SR:!2026-10-07,3,250-->",
        ];
        const card = detectCards(lines.join("\n"), settings).cards[0];
        expect(embedInsert(lines, card, "forestalled.png")).toEqual({
            line: 3,
            ch: 12,
            text: " ![[forestalled.png]]",
        });
    });

    test("shrinking and pasted names", () => {
        expect(fitWidth(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
        expect(fitWidth(640, 480, 800)).toEqual({ width: 640, height: 480 });
        expect(isPastedImageName("Pasted image 20261004123456.png")).toBe(true);
        expect(isPastedImageName("forestalled.png")).toBe(false);
    });
});
