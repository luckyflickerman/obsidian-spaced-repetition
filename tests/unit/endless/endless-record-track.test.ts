import { recordTrack } from "src/endless/endless-record-track";

describe("recordTrack", () => {
    test("no record yet: an empty bar", () => {
        expect(recordTrack(0, 0)).toEqual({ best: 0, today: 0, fraction: 0, ticks: [] });
        expect(recordTrack(NaN, 5)).toEqual({ best: 0, today: 0, fraction: 0, ticks: [] });
    });

    test("today's best on the bar", () => {
        const track = recordTrack(112, 37);
        expect(track.fraction).toBeCloseTo(37 / 112);
        expect(track.ticks.map((t) => t.value)).toEqual([25, 50, 100]);
        expect(track.ticks[2].at).toBeCloseTo(100 / 112);
    });

    test("today never past the record, never below 0", () => {
        expect(recordTrack(40, 55).fraction).toBe(1);
        expect(recordTrack(40, -3).fraction).toBe(0);
    });

    test("milestones keep room at both ends and are at most three", () => {
        // 10 would sit on 0, 100 on the record
        expect(recordTrack(105, 0).ticks.map((t) => t.value)).toEqual([25, 50]);
        expect(recordTrack(2400, 0).ticks.map((t) => t.value)).toEqual([500, 1000, 2000]);
        expect(recordTrack(8, 3).ticks).toEqual([]);
        expect(recordTrack(1000, 10, 1).ticks.map((t) => t.value)).toEqual([500]);
    });
});
