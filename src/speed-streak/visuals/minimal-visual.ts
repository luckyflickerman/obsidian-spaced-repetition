/**
 * Minimal: a timer ring and the streak number. No animation loop at all —
 * it only redraws when the state changes, so it uses the least battery.
 */

import { timerColor } from "src/speed-streak/speed-streak-themes";
import { CanvasVisual, rgba } from "src/speed-streak/visuals/canvas-visual";
import type { VisualState } from "src/speed-streak/visuals/visual-types";

export class MinimalVisual extends CanvasVisual {
    id = "minimal";
    name = { en: "Minimal", pl: "Minimalny" };
    defaultThemeId = "obsidian";

    protected isAnimated(): boolean {
        return false;
    }

    protected significantChange(prev: VisualState, next: VisualState): boolean {
        const step = (f: number | null) => (f === null ? -1 : Math.round(f * 200));
        return super.significantChange(prev, next) || step(prev.fraction) !== step(next.fraction);
    }

    protected draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
        const c = this.colors;
        const s = this.state;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) / 2 - Math.max(3, Math.min(w, h) * 0.06);
        const line = Math.max(3, r * 0.12);

        ctx.lineCap = "round";
        ctx.lineWidth = line;
        ctx.strokeStyle = rgba(c.track);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        if (s.fraction !== null && s.fraction > 0) {
            ctx.strokeStyle = s.paused
                ? rgba(c.muted)
                : timerColor(s.fraction, c.good, c.hard, c.again);
            ctx.beginPath();
            ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.fraction);
            ctx.stroke();
        }

        const color = s.timedOut ? c.again : s.isNewBest ? c.gold : c.text;
        this.drawNumber(cx, cy, r * 1.5, color);
    }
}
