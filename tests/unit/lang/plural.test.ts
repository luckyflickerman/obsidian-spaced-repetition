import { tCount } from "src/lang/helpers";
import { LocaleManagerInstance } from "src/lang/locale-manager";
import { formatCount, pluralCategory, selectPluralForm } from "src/lang/plural";
import { textInterval } from "src/scheduling/algorithms/osr/note-scheduling";

const DAYS = "one:${n} dzień|few:${n} dni|many:${n} dni|other:${n} dnia";

describe("plural forms", () => {
    test("Polish categories", () => {
        expect(pluralCategory(1, "pl")).toBe("one");
        expect(pluralCategory(3, "pl")).toBe("few");
        expect(pluralCategory(5, "pl")).toBe("many");
        expect(pluralCategory(22, "pl")).toBe("few");
        expect(pluralCategory(1.5, "pl")).toBe("other");
    });

    test("picks the form, falls back to other, keeps plain text", () => {
        expect(selectPluralForm(DAYS, 1, "pl")).toBe("${n} dzień");
        expect(selectPluralForm(DAYS, 4, "pl")).toBe("${n} dni");
        expect(selectPluralForm(DAYS, 12, "pl")).toBe("${n} dni");
        expect(selectPluralForm(DAYS, 2.5, "pl")).toBe("${n} dnia");
        expect(selectPluralForm("one:a|other:b", 3, "pl")).toBe("b");
        expect(selectPluralForm("${n} day(s)", 3, "en")).toBe("${n} day(s)");
        expect(selectPluralForm("a|b", 3, "pl")).toBe("a|b");
    });

    test("numbers as the language writes them", () => {
        expect(formatCount(1.5, "pl")).toBe("1,5");
        expect(formatCount(1.5, "en")).toBe("1.5");
        expect(formatCount(1200, "en")).toBe("1200");
        expect(formatCount(2, "zz-invalid-locale-!!")).toBe("2");
    });
});

describe("intervals in Polish", () => {
    const manager = LocaleManagerInstance.getInstance();
    let before: string;
    beforeAll(() => {
        before = manager.currentLocale;
        manager.currentLocale = "pl";
    });
    afterAll(() => {
        manager.currentLocale = before;
    });

    test("days, months, years", () => {
        expect(textInterval(1, false)).toBe("1 dzień");
        expect(textInterval(3, false)).toBe("3 dni");
        expect(textInterval(8, false)).toBe("8 dni");
        expect(textInterval(1.5, false)).toBe("1,5 dnia");
        expect(textInterval(41, false)).toBe("1,3 miesiąca");
        expect(textInterval(61, false)).toBe("2 miesiące");
        expect(textInterval(366, false)).toBe("1 rok");
        expect(textInterval(1000, false)).toBe("2,7 roku");
        expect(textInterval(1830, false)).toBe("5 lat");
    });

    test("minutes and hours", () => {
        expect(tCount("MINUTES_STR_IVL", 10)).toBe("10 min");
        expect(tCount("HOURS_STR_IVL", 2)).toBe("2 godz.");
    });
});
