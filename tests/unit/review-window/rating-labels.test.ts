import { displayRatingLabel, localizeInterval } from "src/review-window/rating-labels";

describe("displayRatingLabel", () => {
    test("stored English default is shown in the current language", () => {
        expect(displayRatingLabel("Again", "again", "Ponownie")).toBe("Ponownie");
        expect(displayRatingLabel("Good", "good", "Dobre")).toBe("Dobre");
        expect(displayRatingLabel("Easy", "easy", "Łatwe")).toBe("Łatwe");
    });

    test("old Polish default 'Średnio Trudne' becomes the new name", () => {
        expect(displayRatingLabel("Średnio Trudne", "good", "Dobre")).toBe("Dobre");
        expect(displayRatingLabel("  średnio trudne ", "good", "Dobre")).toBe("Dobre");
    });

    test("current-language default switches back to English when the UI is English", () => {
        expect(displayRatingLabel("Ponownie", "again", "Again")).toBe("Again");
    });

    test("text typed by the user is kept", () => {
        expect(displayRatingLabel("Nie wiem", "again", "Ponownie")).toBe("Nie wiem");
        expect(displayRatingLabel("Wiem!", "easy", "Łatwe")).toBe("Wiem!");
    });

    test("a default of another button is not mixed up", () => {
        expect(displayRatingLabel("Hard", "good", "Dobre")).toBe("Hard");
    });

    test("empty or missing text uses the current name", () => {
        expect(displayRatingLabel("", "hard", "Trudne")).toBe("Trudne");
        expect(displayRatingLabel(undefined, "hard", "Trudne")).toBe("Trudne");
        expect(displayRatingLabel(null, "hard", "Trudne")).toBe("Trudne");
    });
});

describe("localizeInterval", () => {
    test("hours are translated in Polish only", () => {
        expect(localizeInterval("2 hr", true)).toBe("2 godz.");
        expect(localizeInterval("2 hr", false)).toBe("2 hr");
        expect(localizeInterval("10 min", true)).toBe("10 min");
        expect(localizeInterval("3 dni", true)).toBe("3 dni");
    });
});
