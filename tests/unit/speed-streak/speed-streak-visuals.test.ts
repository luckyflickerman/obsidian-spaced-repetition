import {
    SPEED_STREAK_VISUAL_IDS,
    STYLE_DEFAULT_THEME,
} from "src/speed-streak/speed-streak-settings";
import { SPEED_STREAK_THEMES } from "src/speed-streak/speed-streak-themes";
import {
    getSpeedStreakVisual,
    resolveThemeId,
    SPEED_STREAK_VISUALS,
    visualDisplayName,
} from "src/speed-streak/visuals/visual-registry";

describe("visual style registry", () => {
    test("ids are unique and match the ids known to the settings", () => {
        const ids = SPEED_STREAK_VISUALS.map((v) => v.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect([...ids].sort()).toEqual([...SPEED_STREAK_VISUAL_IDS].sort());
    });

    test("the four styles, Fusion first (default)", () => {
        expect(SPEED_STREAK_VISUALS.map((v) => v.id)).toEqual([
            "fusion",
            "singularity",
            "crystal",
            "minimal",
        ]);
    });

    test("every default theme exists in the theme registry", () => {
        const themeIds = SPEED_STREAK_THEMES.map((t) => t.id);
        for (const visual of SPEED_STREAK_VISUALS) {
            expect(themeIds).toContain(visual.defaultThemeId);
        }
    });

    test("create() returns a fresh style with the same id, name and default theme", () => {
        for (const info of SPEED_STREAK_VISUALS) {
            const a = info.create();
            const b = info.create();
            expect(a).not.toBe(b);
            expect(a.id).toBe(info.id);
            expect(a.name).toEqual(info.name);
            expect(a.defaultThemeId).toBe(info.defaultThemeId);
        }
    });

    test("unknown style falls back to Fusion", () => {
        expect(getSpeedStreakVisual("webgl-ultra").id).toBe("fusion");
        expect(getSpeedStreakVisual(undefined).id).toBe("fusion");
        expect(getSpeedStreakVisual("crystal").id).toBe("crystal");
    });

    test("display names", () => {
        const crystal = getSpeedStreakVisual("crystal");
        expect(visualDisplayName(crystal, false)).toBe("Crystal Reactor");
        expect(visualDisplayName(crystal, true)).toBe("Reaktor kryształu");
        expect(visualDisplayName({ ...crystal, name: { en: "X" } }, true)).toBe("X");
    });

    test("'Style default' theme resolves per style; a chosen theme wins", () => {
        expect(resolveThemeId(STYLE_DEFAULT_THEME, "fusion")).toBe(
            getSpeedStreakVisual("fusion").defaultThemeId,
        );
        expect(resolveThemeId(STYLE_DEFAULT_THEME, "minimal")).toBe("obsidian");
        expect(resolveThemeId("forest", "fusion")).toBe("forest");
    });
});
