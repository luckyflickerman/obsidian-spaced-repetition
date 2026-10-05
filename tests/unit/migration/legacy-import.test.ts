import { DEFAULT_SETTINGS } from "src/data/settings";
import { buildImportedData, parseLegacyData, shouldOfferImport } from "src/migration/legacy-import";

describe("parseLegacyData", () => {
    test("valid JSON object", () => {
        const r = parseLegacyData('{"settings":{"flashcardTags":["#ENG"]}}');
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value.settings).toEqual({ flashcardTags: ["#ENG"] });
    });

    test.each([
        ["broken JSON", '{"settings": {'],
        ["truncated file", '{"settings":{"a":1},"buryList":["x"'],
        ["empty text", ""],
        ["whitespace", "   \n"],
        ["null literal", "null"],
        ["array", "[1,2,3]"],
        ["number", "42"],
        ["string", '"hello"'],
    ])("%s → not ok", (_name, raw) => {
        expect(parseLegacyData(raw).ok).toBe(false);
    });

    test("null / undefined input → not ok", () => {
        expect(parseLegacyData(null).ok).toBe(false);
        expect(parseLegacyData(undefined).ok).toBe(false);
    });
});

describe("buildImportedData", () => {
    test.each([
        ["empty object", {}],
        ["null", null],
        ["undefined", undefined],
        ["array", []],
        ["string", "x"],
    ])("%s → complete default data", (_name, input) => {
        const data = buildImportedData(input);
        expect(data.settings.flashcardTags).toEqual(DEFAULT_SETTINGS.flashcardTags);
        expect(data.settings.speedStreak.enabled).toBeDefined();
        expect(data.settings.tts).toBeDefined();
        expect(data.settings.heatmap).toBeDefined();
        expect(data.settings.reviewWindow).toBeDefined();
        expect(data.settings.cardAuthoring.decks).toEqual(expect.any(Array));
        expect(data.buryDate).toBe("");
        expect(data.buryList).toEqual([]);
        expect(data.historyDeck).toBeNull();
        expect(data.scheduleData).toEqual({ version: 1, noteSchedules: {}, cardSchedules: {} });
        expect(data.speedStreak.runs).toEqual([]);
        expect(data.reviewLog.days).toEqual({});
        expect(data.cardHistory).toBeDefined();
        expect(data.legacyImport).toBeUndefined();
    });

    test("old data without the new fields keeps old values and fills in the new ones", () => {
        // Shape of data.json from the original plugin 1.12 (no Speed Streak, TTS, calendar…)
        const legacy = {
            settings: {
                flashcardTags: ["#ENG", "#ESP"],
                randomizeCardOrder: true,
                convertHighlightsToClozes: true,
                convertBoldTextToClozes: false,
                convertCurlyBracketsToClozes: false,
                baseEase: 270,
                showStatusBar: false,
            },
            buryDate: "2026-01-02",
            buryList: ["abc", 5, "def"],
            historyDeck: "#ENG",
        };
        const data = buildImportedData(legacy);

        expect(data.settings.flashcardTags).toEqual(["#ENG", "#ESP"]);
        expect(data.settings.baseEase).toBe(270);
        expect(data.settings.showStatusBar).toBe(false);
        // upgradeSettings ran: old options are converted
        expect(data.settings.flashcardCardOrder).toBe("DueFirstRandom");
        expect(data.settings.randomizeCardOrder).toBeUndefined();
        expect(data.settings.clozePatterns).toEqual(["==[123;;]answer[;;hint]=="]);
        // new settings have defaults
        expect(data.settings.fsrsDesiredRetention).toBe(DEFAULT_SETTINGS.fsrsDesiredRetention);
        expect(data.settings.speedStreak.enabled).toBeDefined();
        expect(data.settings.cardAuthoring.decks).toEqual(expect.any(Array));
        // data fields
        expect(data.buryDate).toBe("2026-01-02");
        expect(data.buryList).toEqual(["abc", "def"]);
        expect(data.historyDeck).toBe("#ENG");
        expect(data.speedStreak.runs).toEqual([]);
        expect(data.reviewLog.days).toEqual({});
    });

    test("data from this fork keeps Speed Streak records, calendar and schedule data", () => {
        const run = {
            streak: 12,
            score: 0,
            startedAt: 1,
            endedAt: 2,
            day: "2026-09-01",
            activeMs: 60000,
            cards: 12,
            pauses: 0,
            boostsUsed: 0,
            pure: true,
            endReason: "timeout",
            deck: "#ENG",
        };
        const legacy = {
            settings: { speedStreak: { enabled: true } },
            speedStreak: {
                version: 1,
                runs: [run],
                totals: { cardsAnswered: 40, timeouts: 3 },
            },
            reviewLog: {
                version: 1,
                days: { "2026-09-01": { cards: 12, newCards: 2, ms: 60000 } },
            },
            scheduleData: {
                version: 1,
                noteSchedules: { "a.md": null as unknown },
                cardSchedules: { "b.md": [null as unknown] },
            },
        };
        const data = buildImportedData(legacy);

        expect(data.settings.speedStreak.enabled).toBe(true);
        expect(data.speedStreak.runs).toEqual([run]);
        expect(data.speedStreak.totals.cardsAnswered).toBe(40);
        expect(data.speedStreak.totals.timeouts).toBe(3);
        expect(data.speedStreak.totals.sessions).toBe(0);
        expect(data.reviewLog.days).toEqual({
            "2026-09-01": { cards: 12, newCards: 2, ms: 60000 },
        });
        expect(data.scheduleData.noteSchedules).toEqual({ "a.md": null });
        expect(data.scheduleData.cardSchedules).toEqual({ "b.md": [null] });
    });

    test("broken nested fields fall back to defaults", () => {
        const data = buildImportedData({
            settings: "nonsense",
            buryList: "abc",
            historyDeck: 7,
            scheduleData: { version: "x", noteSchedules: [], cardSchedules: 3 },
            speedStreak: "x",
            reviewLog: [1, 2],
            cardHistory: 5,
        });
        expect(data.settings.flashcardTags).toEqual(DEFAULT_SETTINGS.flashcardTags);
        expect(data.buryList).toEqual([]);
        expect(data.historyDeck).toBeNull();
        expect(data.scheduleData).toEqual({ version: 1, noteSchedules: {}, cardSchedules: {} });
        expect(data.speedStreak.runs).toEqual([]);
        expect(data.reviewLog.days).toEqual({});
    });

    test("does not modify the input or share objects with the defaults", () => {
        const legacy = { settings: { flashcardTags: ["#ENG"] }, buryList: ["a"] };
        const copy = JSON.parse(JSON.stringify(legacy)) as unknown;
        const data = buildImportedData(legacy);
        data.settings.flashcardTags.push("#X");
        data.buryList.push("b");
        expect(legacy).toEqual(copy);

        const fresh = buildImportedData({});
        fresh.settings.flashcardTags.push("#Y");
        expect(DEFAULT_SETTINGS.flashcardTags).not.toContain("#Y");
    });
});

describe("shouldOfferImport", () => {
    test("never without the original file", () => {
        expect(shouldOfferImport(true, undefined, false)).toBe(false);
        expect(shouldOfferImport(true, "pending", false)).toBe(false);
    });

    test("first start (no own data) → ask", () => {
        expect(shouldOfferImport(true, undefined, true)).toBe(true);
    });

    test("own data already exists and never asked → do not ask", () => {
        expect(shouldOfferImport(false, undefined, true)).toBe(false);
    });

    test("'Later' → ask again", () => {
        expect(shouldOfferImport(false, "pending", true)).toBe(true);
    });

    test("'No' or already imported → do not ask", () => {
        expect(shouldOfferImport(true, "declined", true)).toBe(false);
        expect(shouldOfferImport(false, "done", true)).toBe(false);
    });
});
