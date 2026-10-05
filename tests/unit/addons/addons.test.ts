import { ADDONS, getAddon, isAddonPage } from "src/addons/addons";
import type { SRSettings } from "src/data/settings";

function emptySettings(): SRSettings {
    // Old data.json: the add-on sections are missing entirely
    return {} as SRSettings;
}

describe("add-ons", () => {
    test("all add-ons, each with its own settings page", () => {
        expect(ADDONS.map((a) => a.id)).toEqual(["heatmap", "daily-goal", "tts", "speed-streak"]);
        expect(ADDONS.map((a) => a.pageType)).toEqual([
            "heatmap-page",
            "daily-goal-page",
            "tts-page",
            "speed-streak-page",
        ]);
        expect(getAddon("tts").icon).toBe("volume-2");
        expect(() => getAddon("nope" as never)).toThrow();
    });

    test("their pages are told apart from the other options", () => {
        expect(isAddonPage("speed-streak-page")).toBe(true);
        expect(isAddonPage("daily-goal-page")).toBe(true);
        expect(isAddonPage("card-authoring-page")).toBe(false);
        expect(isAddonPage("main-page")).toBe(false);
    });

    test("are on by default, also with old settings", () => {
        const settings = emptySettings();
        for (const addon of ADDONS) expect(addon.isEnabled(settings)).toBe(true);
    });

    test("switching one off changes only its own switch and keeps the other options", () => {
        const settings = emptySettings();
        getAddon("tts").setEnabled(settings, true);
        settings.tts = {
            ...settings.tts,
            rate: 1.2,
            languageRules: "#hiszpanski = es-ES",
        };

        getAddon("tts").setEnabled(settings, false);
        expect(getAddon("tts").isEnabled(settings)).toBe(false);
        expect(settings.tts.rate).toBe(1.2);
        expect(settings.tts.languageRules).toBe("#hiszpanski = es-ES");
        expect(getAddon("heatmap").isEnabled(settings)).toBe(true);
        expect(getAddon("speed-streak").isEnabled(settings)).toBe(true);

        getAddon("heatmap").setEnabled(settings, false);
        expect(settings.heatmap.showInDeckList).toBe(false);
        getAddon("daily-goal").setEnabled(settings, true);
        settings.cardAuthoring.dailyGoal = 25;
        getAddon("daily-goal").setEnabled(settings, false);
        expect(settings.cardAuthoring.goalInDeckList).toBe(false);
        expect(settings.cardAuthoring.dailyGoal).toBe(25);
        expect(settings.heatmap.showInDeckList).toBe(false);
        getAddon("speed-streak").setEnabled(settings, false);
        expect(settings.speedStreak.enabled).toBe(false);

        for (const addon of ADDONS) {
            addon.setEnabled(settings, true);
            expect(addon.isEnabled(settings)).toBe(true);
        }
        expect(settings.tts.rate).toBe(1.2);
    });
});
