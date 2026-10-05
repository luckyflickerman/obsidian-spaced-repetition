import {
    cardTextScale,
    clampPosition,
    DEFAULT_REVIEW_WINDOW_SETTINGS,
    fromFractions,
    isDrag,
    isShortCard,
    MIN_VISIBLE_HEIGHT,
    MIN_VISIBLE_WIDTH,
    normalizeReviewWindowSettings,
    ReviewWindowSettings,
    SHORT_CARD_MAX_CHARS,
    toFractions,
} from "src/review-window/review-window";

const screen = { width: 1200, height: 800 };
const win = { width: 600, height: 500 };

describe("normalizeReviewWindowSettings", () => {
    test("defaults: not full screen, centered", () => {
        expect(normalizeReviewWindowSettings(undefined)).toEqual(DEFAULT_REVIEW_WINDOW_SETTINGS);
        expect(normalizeReviewWindowSettings(null)).toEqual({
            fullscreen: false,
            left: null,
            top: null,
            cardTextSize: "large",
            centerShortCards: true,
        });
    });

    test("keeps valid values, clamps fractions", () => {
        expect(normalizeReviewWindowSettings({ fullscreen: true, left: 0.25, top: 2 })).toEqual({
            fullscreen: true,
            left: 0.25,
            top: 1,
            cardTextSize: "large",
            centerShortCards: true,
        });
    });

    test("card text size and centering: kept when valid, defaults otherwise", () => {
        expect(
            normalizeReviewWindowSettings({ cardTextSize: "xlarge", centerShortCards: false }),
        ).toMatchObject({ cardTextSize: "xlarge", centerShortCards: false });
        expect(
            normalizeReviewWindowSettings({
                cardTextSize: "huge" as never,
                centerShortCards: "no" as never,
            }),
        ).toMatchObject({ cardTextSize: "large", centerShortCards: true });
    });

    test("position needs both coordinates", () => {
        const s = normalizeReviewWindowSettings({ left: 0.3 } as Partial<ReviewWindowSettings>);
        expect(s.left).toBeNull();
        expect(s.top).toBeNull();
        expect(
            normalizeReviewWindowSettings({
                fullscreen: "yes" as unknown as boolean,
                left: Number.NaN,
                top: 0.1,
            }),
        ).toMatchObject({ fullscreen: false, left: null, top: null });
    });
});

describe("cardTextScale", () => {
    test("short cards get the full size, long ones only a little", () => {
        expect(cardTextScale("normal", 10)).toBe(1);
        expect(cardTextScale("normal", 500)).toBe(1);
        expect(cardTextScale("large", 20)).toBe(1.6);
        expect(cardTextScale("large", 300)).toBe(1.1);
        expect(cardTextScale("xlarge", 20)).toBe(2.1);
        expect(cardTextScale("xlarge", 300)).toBe(1.2);
    });

    test("the border between short and long", () => {
        expect(isShortCard(SHORT_CARD_MAX_CHARS)).toBe(true);
        expect(isShortCard(SHORT_CARD_MAX_CHARS + 1)).toBe(false);
    });
});

describe("clampPosition", () => {
    test("inside the screen: unchanged (rounded)", () => {
        expect(clampPosition({ left: 100.4, top: 50.6 }, win, screen)).toEqual({
            left: 100,
            top: 51,
        });
    });

    test("the header can't go above the screen", () => {
        expect(clampPosition({ left: 100, top: -200 }, win, screen).top).toBe(0);
    });

    test("a strip stays visible on the right, left and bottom", () => {
        expect(clampPosition({ left: 5000, top: 5000 }, win, screen)).toEqual({
            left: screen.width - MIN_VISIBLE_WIDTH,
            top: screen.height - MIN_VISIBLE_HEIGHT,
        });
        expect(clampPosition({ left: -5000, top: 10 }, win, screen).left).toBe(
            MIN_VISIBLE_WIDTH - win.width,
        );
    });

    test("tiny windows stay fully reachable", () => {
        const tiny = { width: 50, height: 20 };
        expect(clampPosition({ left: -100, top: 900 }, tiny, screen)).toEqual({
            left: 0,
            top: screen.height - 20,
        });
    });
});

describe("fractions", () => {
    test("round trip on the same screen", () => {
        const pos = { left: 300, top: 200 };
        const saved = toFractions(pos, screen);
        expect(saved).toEqual({ left: 0.25, top: 0.25 });
        expect(fromFractions(saved, win, screen)).toEqual(pos);
    });

    test("follows a smaller screen and stays reachable", () => {
        const saved = toFractions({ left: 1100, top: 790 }, screen);
        const small = { width: 600, height: 400 };
        expect(fromFractions(saved, win, small)).toEqual({
            left: small.width - MIN_VISIBLE_WIDTH,
            top: small.height - MIN_VISIBLE_HEIGHT,
        });
    });

    test("zero-size screen does not divide by zero", () => {
        expect(toFractions({ left: 10, top: 10 }, { width: 0, height: 0 })).toEqual({
            left: 0,
            top: 0,
        });
    });
});

describe("isDrag", () => {
    test("small movements are clicks", () => {
        expect(isDrag(1, 2)).toBe(false);
        expect(isDrag(3, 3)).toBe(true);
        expect(isDrag(-10, 0)).toBe(true);
    });
});
