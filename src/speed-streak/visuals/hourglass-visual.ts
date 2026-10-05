/**
 * Hourglass ("Klepsydra") — the default style of Endless sessions.
 *
 * - Every correct answer adds one grain: it falls through the neck onto the
 *   mound in the bottom bulb. Grains in the bottom bulb = Endless score mod 100;
 *   the top bulb holds what is left to the next hundred.
 * - Every 100: a 1–2 s cutscene — the hourglass turns over with a flash and the
 *   bottom bulb is empty again. The score is NOT reset; each hundred leaves a
 *   lasting gold star under the hourglass ("★×3" when there are many).
 * - "Error": the glass cracks for a moment and the sand pours out (score 0).
 * - A Speed Streak timeout only nudges the hourglass (the score keeps its sand).
 * Outside Endless the style shows the Speed Streak streak instead of the score.
 *
 * The logic (grains, hundreds, which animation) is in hourglass-logic.ts.
 *
 * MORE REWARDS FOR HUNDREDS (future)
 * ----------------------------------
 * The lasting marks are drawn in `drawHundreds()`; the cutscene in
 * `drawCutscene()`. To add a new reward (e.g. a different glass every 500, a
 * golden sand colour after 1000), add a rule to `rewardFor(hundreds)` below
 * and use it in those two methods. Keep the rewards in this one place.
 */

import type { SpeedStreakEvent } from "src/speed-streak/speed-streak-engine";
import type { RGB } from "src/speed-streak/speed-streak-themes";
import { CanvasVisual, mixRgb, rgba, WHITE } from "src/speed-streak/visuals/canvas-visual";
import {
    GRAINS_PER_HOURGLASS,
    hourglassFill,
    hourglassTransition,
    moundLevel,
} from "src/speed-streak/visuals/hourglass-logic";
import type { VisualState } from "src/speed-streak/visuals/visual-types";

const GRAIN_MS = 650;
const CUTSCENE_MS = 1700;
const ERROR_MS = 900;
const NUDGE_MS = 380;
const FLASH_MS = 450;

interface Reward {
    /** Colour of the sand */
    sand: "good" | "gold";
}

/** Rewards for reached hundreds — the one place to extend (see the top of the file). */
function rewardFor(hundreds: number): Reward {
    return { sand: hundreds >= 10 ? "gold" : "good" };
}

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

export class HourglassVisual extends CanvasVisual {
    id = "hourglass";
    name = { en: "Hourglass", pl: "Klepsydra" };
    defaultThemeId = "obsidian";

    /** Grains in the bottom bulb just before "Error" (for the pouring animation) */
    private grainsBeforeError = 0;
    /** Reduced motion / Minimal: the cutscene is only a short flash */
    private flashUntil = 0;

    private get score(): number {
        return this.state.endlessScore ?? this.state.streak;
    }

    protected isAnimated(): boolean {
        return false;
    }

    protected significantChange(prev: VisualState, next: VisualState): boolean {
        return super.significantChange(prev, next) || prev.endlessScore !== next.endlessScore;
    }

    protected onStateChange(prev: VisualState, next: VisualState): void {
        const before = prev.endlessScore ?? prev.streak;
        const after = next.endlessScore ?? next.streak;
        switch (hourglassTransition(before, after)) {
            case "grain":
                this.startEffect("grain", GRAIN_MS);
                break;
            case "cutscene":
                if (this.animationsOn) this.startEffect("cutscene", CUTSCENE_MS);
                else this.flash();
                break;
            case "error":
                this.grainsBeforeError = hourglassFill(before).grains;
                this.startEffect("error", ERROR_MS);
                break;
            default:
                break;
        }
    }

    protected handleEvent(e: SpeedStreakEvent): void {
        if (e.type === "timeout") this.startEffect("nudge", NUDGE_MS);
    }

    /** Static replacement of the cutscene: a short glow, then the normal picture. */
    private flash() {
        this.flashUntil = performance.now() + FLASH_MS;
        window.setTimeout(() => this.drawNow(), FLASH_MS + 20);
    }

    // MARK: Drawing

    protected draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
        const compact = this.context.size === "compact";
        const fill = hourglassFill(this.score);

        // Layout: compact = hourglass on the left, number on the right;
        // large = hourglass in the middle, number and hundreds below
        let gx: number, gy: number, gh: number;
        if (compact) {
            gh = h * 0.88;
            gx = Math.min(w * 0.3, gh * 0.3 + 2);
            gy = h / 2;
        } else {
            gh = Math.min(h * 0.62, w * 0.9);
            gx = w / 2;
            gy = h * 0.38;
        }
        const gw = gh * 0.6;

        this.drawGlass(ctx, gx, gy, gw, gh, fill.grains, fill.hundreds);

        if (compact) {
            const left = gx + gw / 2 + 4;
            this.drawScore(ctx, (left + w) / 2, h * 0.42, w - left, h * 0.44);
            if (fill.hundreds > 0) {
                ctx.font = this.numberFont(Math.max(9, h * 0.2));
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = rgba(this.colors.gold);
                ctx.fillText(`★×${fill.hundreds}`, (left + w) / 2, h * 0.8);
            }
        } else {
            const top = gy + gh / 2 + h * 0.02;
            this.drawScore(ctx, w / 2, top + h * 0.09, w * 0.8, h * 0.16);
            this.drawHundreds(ctx, w / 2, top + h * 0.22, Math.min(w, h) * 0.06, fill.hundreds);
        }
    }

    /** The glass with both bulbs of sand, plus the running animations. */
    private drawGlass(
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        gw: number,
        gh: number,
        grains: number,
        hundreds: number,
    ) {
        const c = this.colors;
        const hh = gh / 2;
        const bw = gw / 2;
        const nw = Math.max(1.5, gw * 0.06);
        const halfWidth = (u: number) =>
            nw + (bw - nw) * Math.pow(Math.sin((Math.min(1, Math.abs(u)) * Math.PI) / 2), 0.7);
        const yAt = (u: number) => cy + u * hh;

        const cut = this.effect("cutscene");
        const err = this.effect("error");
        const nudge = this.effect("nudge");
        const grain = this.effect("grain");

        ctx.save();
        ctx.translate(cx, cy);
        if (nudge !== null) ctx.rotate(Math.sin(nudge * Math.PI * 4) * 0.06 * (1 - nudge));
        if (err !== null) ctx.translate(Math.sin(err * Math.PI * 10) * gw * 0.06 * (1 - err), 0);
        let shownGrains = grains;
        if (cut !== null) {
            // 0–0.2 full bulb glows, 0.2–0.7 the hourglass turns over, then it settles
            const turn = easeInOut(Math.max(0, Math.min(1, (cut - 0.2) / 0.5)));
            ctx.rotate(Math.PI * turn);
            shownGrains = turn < 1 ? GRAINS_PER_HOURGLASS : grains;
        }
        if (err !== null) shownGrains = Math.round(this.grainsBeforeError * (1 - easeInOut(err)));
        ctx.translate(-cx, -cy);

        const reward = rewardFor(hundreds);
        const sandRgb: RGB = reward.sand === "gold" ? c.gold : c.good;
        const sand = rgba(sandRgb, 0.95);
        const inset = 0.86;

        // Top bulb: what is left to the next hundred (a dip over the neck)
        const left = 1 - shownGrains / GRAINS_PER_HOURGLASS;
        if (left > 0.01) {
            const uTop = -Math.max(0.08, left * 0.86);
            const yTop = yAt(uTop);
            ctx.beginPath();
            ctx.moveTo(cx - halfWidth(uTop) * inset, yTop);
            for (let u = uTop; u <= 0; u += 0.05) ctx.lineTo(cx - halfWidth(u) * inset, yAt(u));
            ctx.lineTo(cx + nw * inset, yAt(0));
            for (let u = 0; u >= uTop; u -= 0.05) ctx.lineTo(cx + halfWidth(u) * inset, yAt(u));
            ctx.lineTo(cx + halfWidth(uTop) * inset, yTop);
            ctx.quadraticCurveTo(cx, yTop + hh * 0.12 * left, cx - halfWidth(uTop) * inset, yTop);
            ctx.closePath();
            ctx.fillStyle = sand;
            ctx.fill();
        }

        // Bottom bulb: the mound of grains
        const level = moundLevel(shownGrains);
        if (level > 0) {
            const uSurf = 1 - level * 0.9;
            const ySurf = yAt(uSurf);
            ctx.beginPath();
            ctx.moveTo(cx - halfWidth(1) * inset, yAt(1));
            for (let u = 1; u >= uSurf; u -= 0.05) ctx.lineTo(cx - halfWidth(u) * inset, yAt(u));
            ctx.lineTo(cx - halfWidth(uSurf) * inset, ySurf);
            ctx.quadraticCurveTo(
                cx,
                ySurf - hh * 0.22 * level,
                cx + halfWidth(uSurf) * inset,
                ySurf,
            );
            for (let u = uSurf; u <= 1; u += 0.05) ctx.lineTo(cx + halfWidth(u) * inset, yAt(u));
            ctx.lineTo(cx + halfWidth(1) * inset, yAt(1));
            ctx.closePath();
            ctx.fillStyle = sand;
            ctx.fill();
        }

        // A falling grain (and a thin trickle while it falls)
        if (grain !== null && cut === null) {
            const target = level > 0 ? yAt(1 - level * 0.9) - hh * 0.18 * level : yAt(0.98);
            const y = yAt(0) + (target - yAt(0)) * grain * grain;
            ctx.strokeStyle = rgba(sandRgb, 0.45 * (1 - grain));
            ctx.lineWidth = Math.max(1, nw * 0.6);
            ctx.beginPath();
            ctx.moveTo(cx, yAt(-0.04));
            ctx.lineTo(cx, y);
            ctx.stroke();
            ctx.fillStyle = rgba(mixRgb(sandRgb, WHITE, 0.35));
            ctx.beginPath();
            ctx.arc(cx, y, Math.max(1.6, gw * 0.045), 0, Math.PI * 2);
            ctx.fill();
        }

        // The glass outline and the wooden caps
        const glassColor = err !== null ? mixRgb(c.muted, c.again, 1 - err) : c.muted;
        ctx.strokeStyle = rgba(glassColor, 0.95);
        ctx.lineWidth = Math.max(1.2, gw * 0.045);
        ctx.lineJoin = "round";
        for (const side of [-1, 1]) {
            ctx.beginPath();
            for (let u = -1; u <= 1.001; u += 0.04) {
                const x = cx + side * halfWidth(u);
                if (u === -1) ctx.moveTo(x, yAt(u));
                else ctx.lineTo(x, yAt(u));
            }
            ctx.stroke();
        }
        const capH = Math.max(2, gh * 0.05);
        ctx.fillStyle = rgba(c.text, 0.85);
        for (const y of [yAt(-1) - capH, yAt(1)]) {
            ctx.beginPath();
            // roundRect: Safari 16+; older iPads get square caps
            if (typeof ctx.roundRect === "function")
                ctx.roundRect(cx - bw * 1.12, y, bw * 2.24, capH, capH / 2);
            else ctx.rect(cx - bw * 1.12, y, bw * 2.24, capH);
            ctx.fill();
        }

        // "Error": cracks on the glass for a moment
        if (err !== null) {
            ctx.strokeStyle = rgba(c.again, 0.9 * (1 - err));
            ctx.lineWidth = Math.max(1, gw * 0.03);
            ctx.beginPath();
            ctx.moveTo(cx - bw * 0.55, yAt(-0.55));
            ctx.lineTo(cx - bw * 0.2, yAt(-0.4));
            ctx.lineTo(cx - bw * 0.35, yAt(-0.25));
            ctx.moveTo(cx + bw * 0.5, yAt(0.45));
            ctx.lineTo(cx + bw * 0.15, yAt(0.6));
            ctx.lineTo(cx + bw * 0.3, yAt(0.78));
            ctx.stroke();
        }
        ctx.restore();

        // Cutscene light: a ring and sparks around the hourglass
        const glow =
            cut !== null
                ? Math.sin(Math.min(1, cut) * Math.PI)
                : performance.now() < this.flashUntil
                  ? 1
                  : 0;
        if (glow > 0) this.drawCutscene(ctx, cx, cy, gh, glow, cut);
    }

    private drawCutscene(
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        gh: number,
        glow: number,
        progress: number | null,
    ) {
        const c = this.colors;
        ctx.save();
        ctx.strokeStyle = rgba(c.gold, 0.7 * glow);
        ctx.lineWidth = Math.max(2, gh * 0.03);
        ctx.beginPath();
        ctx.arc(cx, cy, gh * (0.45 + 0.25 * (progress ?? 0.5)), 0, Math.PI * 2);
        ctx.stroke();
        const sparks = this.budget(12, 4);
        ctx.fillStyle = rgba(mixRgb(c.gold, WHITE, 0.3), glow);
        for (let i = 0; i < sparks; i++) {
            const a = (i / sparks) * Math.PI * 2 + (progress ?? 0) * 2;
            const r = gh * (0.35 + 0.4 * (progress ?? 0.5));
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.max(1.2, gh * 0.02), 0, 7);
            ctx.fill();
        }
        ctx.restore();
    }

    /** The score (shrinks for long numbers). */
    private drawScore(
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        maxWidth: number,
        maxHeight: number,
    ) {
        const text = String(this.score);
        const size = Math.min(maxHeight, (maxWidth * 1.5) / Math.max(2, text.length));
        ctx.font = this.numberFont(size);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = rgba(this.state.isNewBest ? this.colors.gold : this.colors.text);
        ctx.fillText(text, cx, cy);
    }

    /** Lasting marks of reached hundreds: up to 5 stars, then "★×N". */
    private drawHundreds(
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        size: number,
        hundreds: number,
    ) {
        if (hundreds <= 0) return;
        ctx.fillStyle = rgba(this.colors.gold);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = this.numberFont(Math.max(10, size * 1.6));
        const text = hundreds <= 5 ? "★".repeat(hundreds) : `★×${hundreds}`;
        ctx.fillText(text, cx, cy);
    }
}
