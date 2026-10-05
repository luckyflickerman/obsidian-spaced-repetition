import {
    findScheduleComments,
    isScheduleOnlyLine,
    scheduleDates,
} from "src/card-authoring/schedule-comment";

describe("scheduleDates", () => {
    test("SM-2: one and two sides", () => {
        expect(scheduleDates("!2026-10-08,3,250")).toEqual(["2026-10-08"]);
        expect(scheduleDates("!2026-10-08,3,250!2026-10-12,7,270")).toEqual([
            "2026-10-08",
            "2026-10-12",
        ]);
    });

    test("FSRS: the due date-time is the second field", () => {
        expect(
            scheduleDates(
                "!fsrs,2026-10-05T11:27:20.841Z,0,2.3065,2.11810397,1,1,0,1,2026-10-05T11:17:20.841Z",
            ),
        ).toEqual(["2026-10-05"]);
    });

    test("broken segments are skipped", () => {
        expect(scheduleDates("!nonsense!2026-01-02,1,250!")).toEqual(["2026-01-02"]);
        expect(scheduleDates("")).toEqual([]);
    });
});

describe("findScheduleComments", () => {
    test("finds comments with their offsets", () => {
        const text = "#ENG word:: słowo <!--SR:!2026-10-08,3,250-->\nnext line";
        const found = findScheduleComments(text);
        expect(found).toHaveLength(1);
        expect(text.slice(found[0].from, found[0].to)).toBe("<!--SR:!2026-10-08,3,250-->");
        expect(found[0].dates).toEqual(["2026-10-08"]);
    });

    test("several comments; ordinary HTML comments are ignored", () => {
        const text =
            "<!-- note --> <!--SR:!2026-01-01,1,250--> x <!--SR:!fsrs,2026-02-03T00:00:00Z,0-->";
        expect(findScheduleComments(text).map((c) => c.dates)).toEqual([
            ["2026-01-01"],
            ["2026-02-03"],
        ]);
    });

    test("does not run across lines", () => {
        expect(findScheduleComments("<!--SR:!2026-01-01\n,1,250-->")).toEqual([]);
    });
});

describe("isScheduleOnlyLine", () => {
    test("a line with only the comment (and spaces)", () => {
        expect(isScheduleOnlyLine("<!--SR:!2026-10-08,3,250-->")).toBe(true);
        expect(isScheduleOnlyLine("  <!--SR:!2026-10-08,3,250-->  ")).toBe(true);
    });

    test("a card line with the comment at the end is not", () => {
        expect(isScheduleOnlyLine("#ENG word:: słowo <!--SR:!2026-10-08,3,250-->")).toBe(false);
        expect(isScheduleOnlyLine("")).toBe(false);
        expect(isScheduleOnlyLine("plain text")).toBe(false);
    });
});
