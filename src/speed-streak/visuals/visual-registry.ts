/**
 * Speed Streak — visual styles ("scenes").
 *
 * HOW TO ADD A NEW STYLE
 * ----------------------
 * 1. Create `src/speed-streak/visuals/<name>-visual.ts` with a class that
 *    extends `CanvasVisual` (canvas-visual.ts) and implements `draw()`:
 *
 *      export class AuroraVisual extends CanvasVisual {
 *          id = "aurora";                         // unique, lowercase, never change once used
 *          name = { en: "Aurora", pl: "Zorza" };
 *          defaultThemeId = "ocean";              // a theme id from speed-streak-themes.ts
 *          protected draw(ctx, w, h, t, dt) { ... }
 *      }
 *
 *    The base class already handles the canvas size (devicePixelRatio ≤ 2),
 *    the animation loop (only while visible, 30 fps on "Light", none on
 *    "Minimal" / reduced motion), theme colors (`this.colors`, read from the
 *    `--ss-*` tokens — use only these, so the style works with every theme)
 *    and one-shot effects (`startEffect()` / `effect()` in `handleEvent()`).
 *    Keep a frame cheap: no `shadowBlur` in loops, scale particle counts with
 *    `this.budget(n)`, check `this.context.size` ("compact" = ~64 px in the bar).
 * 2. Add its id to `SPEED_STREAK_VISUAL_IDS` in speed-streak-settings.ts.
 * 3. Add one entry to `SPEED_STREAK_VISUALS` below. That's all — it shows up
 *    in Settings → Speed Streak → Display → Visual style, with a live preview.
 */

import { SpeedStreakVisualId, STYLE_DEFAULT_THEME } from "src/speed-streak/speed-streak-settings";
import { CrystalVisual } from "src/speed-streak/visuals/crystal-visual";
import { FusionVisual } from "src/speed-streak/visuals/fusion-visual";
import { MinimalVisual } from "src/speed-streak/visuals/minimal-visual";
import { SingularityVisual } from "src/speed-streak/visuals/singularity-visual";
import type { SpeedStreakVisual } from "src/speed-streak/visuals/visual-types";

export interface SpeedStreakVisualInfo {
    id: SpeedStreakVisualId;
    name: { en: string; pl?: string };
    defaultThemeId: string;
    create(): SpeedStreakVisual;
}

function entry(create: () => SpeedStreakVisual): SpeedStreakVisualInfo {
    const sample = create();
    return {
        id: sample.id as SpeedStreakVisualId,
        name: sample.name,
        defaultThemeId: sample.defaultThemeId,
        create,
    };
}

export const SPEED_STREAK_VISUALS: SpeedStreakVisualInfo[] = [
    entry(() => new FusionVisual()),
    entry(() => new SingularityVisual()),
    entry(() => new CrystalVisual()),
    entry(() => new MinimalVisual()),
];

export function getSpeedStreakVisual(id: string | null | undefined): SpeedStreakVisualInfo {
    return SPEED_STREAK_VISUALS.find((v) => v.id === id) ?? SPEED_STREAK_VISUALS[0];
}

export function visualDisplayName(visual: SpeedStreakVisualInfo, polish: boolean): string {
    return (polish && visual.name.pl) || visual.name.en;
}

/** Theme to use: the chosen one, or the style's own default for "Style default". */
export function resolveThemeId(themeSetting: string, visualId: string): string {
    return themeSetting === STYLE_DEFAULT_THEME
        ? getSpeedStreakVisual(visualId).defaultThemeId
        : themeSetting;
}
