/**
 * Singularity: a dark core with a glowing ring, particles spiralling into it
 * and a space-time grid bent towards the center. A longer streak = more and
 * faster particles and a brighter glow.
 *
 * Visual design after the Anki add-on Speed Streak by henbitdeathmetal (MIT),
 * redrawn with Canvas 2D — see THIRD_PARTY_NOTICES.md.
 */

import type { SpeedStreakEvent, SpeedStreakRating } from "src/speed-streak/speed-streak-engine";
import type { RGB } from "src/speed-streak/speed-streak-themes";
import {
    BLACK,
    CanvasVisual,
    hash01,
    mixRgb,
    rgba,
    WHITE,
} from "src/speed-streak/visuals/canvas-visual";

const MAX_PARTICLES = 160;
const RATINGS: SpeedStreakRating[] = ["again", "hard", "good", "easy"];

export class SingularityVisual extends CanvasVisual {
    id = "singularity";
    name = { en: "Singularity", pl: "Osobliwość" };
    defaultThemeId = "violet";

    // Particle pool (typed arrays: no garbage per frame)
    private angle = new Float32Array(MAX_PARTICLES);
    private radius = new Float32Array(MAX_PARTICLES);
    private speed = new Float32Array(MAX_PARTICLES);
    private hue = new Uint8Array(MAX_PARTICLES);
    private active = 0;
    private seed = 1;
    private grid: HTMLCanvasElement | null = null;
    /** again, hard, good, easy, boost */
    private palette: RGB[] = [];
    /** Palette indices weighted by the ratings of the running streak */
    private weighted: number[] = [3];

    private rand(): number {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    private get compact(): boolean {
        return this.context.size === "compact";
    }

    /** 0.35 … 1 with the streak. */
    private get intensity(): number {
        return 0.35 + 0.65 * Math.min(1, this.state.streak / 120);
    }

    private targetCount(): number {
        return Math.min(MAX_PARTICLES, Math.round(this.budget(150, 10) * this.intensity));
    }

    protected init() {
        this.rebuildPalette();
    }

    protected onResize(w: number, h: number) {
        this.rebuildPalette();
        this.grid = this.compact ? null : this.renderGrid(w, h);
        this.active = 0;
    }

    private rebuildPalette() {
        this.palette = [
            ...RATINGS.map((r) => mixRgb(this.ratingColor(r), WHITE, 0.3)),
            mixRgb(this.colors.boost, WHITE, 0.3),
        ];
        // particle colors: weighted by the ratings of the running streak
        const s = this.state.streakRatings;
        const total = RATINGS.reduce((sum, r) => sum + s[r], 0);
        const weighted: number[] = [4];
        RATINGS.forEach((r, i) => {
            const n = total > 0 ? Math.round((s[r] / total) * 10) : r === "easy" ? 4 : 1;
            for (let k = 0; k < n; k++) weighted.push(i);
        });
        this.weighted = weighted;
    }

    private spawn(i: number, R: number, outer = true, color = -1) {
        this.angle[i] = this.rand() * Math.PI * 2;
        this.radius[i] = outer ? R * (0.72 + 0.3 * this.rand()) : R * (0.3 + 0.7 * this.rand());
        this.speed[i] = 0.5 + this.rand();
        this.hue[i] =
            color >= 0 ? color : this.weighted[Math.floor(this.rand() * this.weighted.length)];
    }

    protected onStateChange(prev: { streak: number }, next: { streak: number }) {
        if (prev.streak !== next.streak) this.rebuildPalette();
    }

    protected handleEvent(e: SpeedStreakEvent) {
        switch (e.type) {
            case "rate": {
                this.startEffect("rate", 450);
                // a burst of particles in the rating's color
                if (e.rating && this.animationsOn) {
                    const R = Math.min(this.width, this.height) / 2;
                    const color = RATINGS.indexOf(e.rating);
                    const burst = this.compact ? 3 : 10;
                    for (let k = 0; k < burst; k++) {
                        const i =
                            this.active < MAX_PARTICLES
                                ? this.active++
                                : Math.floor(this.rand() * this.active);
                        this.spawn(i, R, true, color);
                    }
                }
                break;
            }
            case "timeout":
                this.startEffect("timeout", 1300);
                break;
            case "boost":
                this.startEffect("boost", 800);
                break;
            case "new-best":
                this.startEffect("best", 1800);
                break;
            default:
                break;
        }
    }

    /** The bent grid, drawn once per size into an offscreen canvas. */
    private renderGrid(w: number, h: number): HTMLCanvasElement | null {
        const canvas = activeDocument.createElement("canvas");
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const g = canvas.getContext("2d");
        if (!g) return null;
        g.scale(dpr, dpr);
        const cx = w / 2;
        const cy = h / 2;
        const R = Math.min(w, h) / 2;
        const step = Math.max(14, R / 7);
        const bend = (x: number, y: number): [number, number] => {
            const dx = x - cx;
            const dy = y - cy;
            const d = Math.hypot(dx, dy) || 1;
            const pull = R * 0.35 * Math.exp(-(d * d) / (R * R * 0.5));
            const k = Math.max(0, d - pull) / d;
            return [cx + dx * k, cy + dy * k];
        };
        g.strokeStyle = rgba(this.colors.track, 0.55);
        g.lineWidth = 1;
        const line = (points: [number, number][]) => {
            g.beginPath();
            points.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
            g.stroke();
        };
        for (let x = cx % step; x <= w; x += step) {
            const pts: [number, number][] = [];
            for (let y = 0; y <= h; y += step / 3) pts.push(bend(x, y));
            line(pts);
        }
        for (let y = cy % step; y <= h; y += step) {
            const pts: [number, number][] = [];
            for (let x = 0; x <= w; x += step / 3) pts.push(bend(x, y));
            line(pts);
        }
        // fade out towards the edges (no hard rectangle)
        g.globalCompositeOperation = "destination-in";
        const mask = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, Math.max(w, h) * 0.55);
        mask.addColorStop(0, "rgba(0, 0, 0, 1)");
        mask.addColorStop(1, "rgba(0, 0, 0, 0)");
        g.fillStyle = mask;
        g.fillRect(0, 0, w, h);
        return canvas;
    }

    protected draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) {
        const c = this.colors;
        const s = this.state;
        const cx = w / 2;
        const cy = h / 2;
        const R = Math.min(w, h) / 2 - 1;
        const compact = this.compact;
        const timeoutFx = this.effect("timeout");
        const rateFx = this.effect("rate");
        const boostFx = this.effect("boost");
        const bestFx = this.effect("best");
        const intensity = this.intensity;
        let coreR = R * (compact ? 0.4 : 0.2);
        if (timeoutFx !== null) coreR *= 1 - 0.55 * Math.sin(timeoutFx * Math.PI);

        ctx.save();
        if (s.paused) ctx.globalAlpha = 0.55;
        if (this.grid) ctx.drawImage(this.grid, 0, 0, w, h);

        // Accretion glow: three colored blobs slowly circling the core
        const blobs: RGB[] = [c.easy, c.boost, c.again];
        for (let b = 0; b < blobs.length; b++) {
            const a = t * (0.25 + b * 0.07) + (b * Math.PI * 2) / 3;
            const bx = cx + Math.cos(a) * coreR * 1.4;
            const by = cy + Math.sin(a) * coreR * 1.4;
            const rr = R * (compact ? 0.45 : 0.42);
            const g = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
            g.addColorStop(0, rgba(blobs[b], 0.16 * intensity));
            g.addColorStop(1, rgba(blobs[b], 0));
            ctx.fillStyle = g;
            ctx.fillRect(bx - rr, by - rr, rr * 2, rr * 2);
        }

        // Particles
        const target = this.targetCount();
        while (this.active < target) this.spawn(this.active++, R, this.active % 2 === 0);
        if (this.active > target && dt > 0) this.active = Math.max(target, this.active - 2);
        const outward = timeoutFx !== null;
        const swirl = 0.6 + 1.6 * intensity;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1, R * (compact ? 0.03 : 0.012));
        for (let i = 0; i < this.active; i++) {
            let r = this.radius[i];
            let a = this.angle[i];
            if (dt > 0) {
                const near = (R * 0.25) / Math.max(r, 1);
                if (outward) {
                    r += R * 0.9 * dt * this.speed[i];
                } else {
                    r -= R * (0.05 + 0.08 * intensity) * dt * this.speed[i] * (1 + near);
                }
                a += swirl * dt * (0.4 + near);
                if (r < coreR * 1.05 || r > R * 1.15) {
                    this.spawn(i, R);
                    r = this.radius[i];
                    a = this.angle[i];
                }
                this.radius[i] = r;
                this.angle[i] = a;
            }
            const tail = 0.12 + 0.18 * this.speed[i] * intensity;
            const fade =
                Math.min(1, (r - coreR) / (R * 0.25)) * Math.min(1, (R - r) / (R * 0.2) + 0.4);
            if (fade <= 0) continue;
            ctx.strokeStyle = rgba(
                this.palette[this.hue[i] % this.palette.length] ?? c.easy,
                0.75 * fade,
            );
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            ctx.lineTo(cx + Math.cos(a - tail) * r * 1.04, cy + Math.sin(a - tail) * r * 1.04);
            ctx.stroke();
        }

        // Core: dark disc + glowing ring
        const ringColor =
            outward || s.timedOut ? c.again : s.isNewBest || bestFx !== null ? c.gold : WHITE;
        const glow = ctx.createRadialGradient(cx, cy, coreR * 0.8, cx, cy, coreR * 1.9);
        glow.addColorStop(0, rgba(ringColor, 0.35 + 0.25 * intensity));
        glow.addColorStop(1, rgba(ringColor, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 1.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = rgba(mixRgb(c.bg, BLACK, 0.85));
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();

        const pulse = rateFx !== null ? 1 + 0.5 * Math.sin(rateFx * Math.PI) : 1;
        ctx.strokeStyle = rgba(mixRgb(ringColor, WHITE, 0.4));
        ctx.lineWidth = Math.max(1.5, coreR * 0.09 * pulse);
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.stroke();

        this.drawNumber(cx, cy, coreR * 1.5, WHITE);

        if (boostFx !== null) {
            ctx.strokeStyle = rgba(c.boost, 0.8 * (1 - boostFx));
            ctx.lineWidth = Math.max(1.5, R * 0.035 * (1 - boostFx));
            ctx.beginPath();
            ctx.arc(cx, cy, coreR + (R - coreR) * boostFx, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (bestFx !== null) {
            const n = this.budget(24, 8);
            ctx.fillStyle = rgba(c.gold, 1 - bestFx);
            for (let k = 0; k < n; k++) {
                const a = (Math.PI * 2 * k) / n + bestFx * 2;
                const d = coreR + (R - coreR) * bestFx * (0.5 + 0.5 * hash01(k, 5));
                ctx.beginPath();
                ctx.arc(
                    cx + Math.cos(a) * d,
                    cy + Math.sin(a) * d,
                    Math.max(1.5, R * 0.016),
                    0,
                    Math.PI * 2,
                );
                ctx.fill();
            }
        }
        ctx.restore();
    }
}
