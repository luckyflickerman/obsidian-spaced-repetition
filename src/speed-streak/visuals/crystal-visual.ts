/**
 * Crystal Reactor: a crystal that grows a new shard with every rated card.
 * Shards take the color of their rating (pastel, mixed with the theme);
 * a timeout shatters the crystal.
 *
 * Visual design after the Anki add-on Speed Streak by henbitdeathmetal (MIT),
 * redrawn with Canvas 2D — see THIRD_PARTY_NOTICES.md.
 */

import type { SpeedStreakEvent, SpeedStreakRating } from "src/speed-streak/speed-streak-engine";
import type { RGB } from "src/speed-streak/speed-streak-themes";
import {
    BLACK,
    CanvasVisual,
    GOLDEN_ANGLE,
    hash01,
    mixRgb,
    rgba,
    WHITE,
} from "src/speed-streak/visuals/canvas-visual";
import type { VisualState } from "src/speed-streak/visuals/visual-types";

interface Shard {
    angle: number;
    length: number;
    width: number;
    color: RGB;
}

export class CrystalVisual extends CanvasVisual {
    id = "crystal";
    name = { en: "Crystal Reactor", pl: "Reaktor kryształu" };
    defaultThemeId = "ocean";

    /** Rating of every shard, oldest first (kept across frames) */
    private shardRatings: SpeedStreakRating[] = [];
    private shattered: Shard[] = [];
    private floor: HTMLCanvasElement | null = null;

    private get compact(): boolean {
        return this.context.size === "compact";
    }

    private maxShards(): number {
        return this.budget(90, this.compact ? 10 : 18);
    }

    protected onResize(w: number, h: number) {
        this.floor = this.compact ? null : this.renderFloor(w, h);
    }

    protected onStateChange(_prev: VisualState, next: VisualState) {
        if (next.streak === 0) {
            this.shardRatings = [];
            return;
        }
        // Fill in shards for a streak already running when the scene appeared
        const want = Math.min(next.streak, 200);
        if (this.shardRatings.length < want) {
            const trail =
                next.ratingTrail.length > 0 ? next.ratingTrail : (["good"] as SpeedStreakRating[]);
            while (this.shardRatings.length < want)
                this.shardRatings.unshift(trail[this.shardRatings.length % trail.length]);
        }
        if (this.shardRatings.length > want) this.shardRatings.length = want;
    }

    protected handleEvent(e: SpeedStreakEvent) {
        switch (e.type) {
            case "rate":
                if (e.rating && e.text !== "again-break") {
                    this.shardRatings.push(e.rating);
                    this.startEffect("grow", 420);
                }
                break;
            case "timeout": {
                const R = Math.min(this.width, this.height) / 2;
                this.shattered = this.shards(R, this.state.streak);
                this.shardRatings = [];
                this.startEffect("shatter", 1300);
                break;
            }
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

    /** Shard geometry, stable per index (same crystal every frame). */
    private shards(R: number, streak: number): Shard[] {
        const n = Math.min(streak, this.maxShards());
        const growth = 0.55 + 0.45 * Math.min(1, streak / 80);
        const start = Math.max(0, this.shardRatings.length - n);
        const list: Shard[] = [];
        for (let k = 0; k < n; k++) {
            const idx = start + k;
            const length = R * (this.compact ? 0.62 : 0.5) * (0.6 + 0.4 * hash01(idx, 2)) * growth;
            const rating = this.shardRatings[idx] ?? "good";
            list.push({
                angle: idx * GOLDEN_ANGLE + (hash01(idx, 9) - 0.5) * 0.4,
                length,
                width: length * (0.18 + 0.12 * hash01(idx, 3)),
                color: mixRgb(this.ratingColor(rating), WHITE, 0.42),
            });
        }
        return list;
    }

    private renderFloor(w: number, h: number): HTMLCanvasElement | null {
        const canvas = activeDocument.createElement("canvas");
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const g = canvas.getContext("2d");
        if (!g) return null;
        g.scale(dpr, dpr);
        const cx = w / 2;
        const horizon = h * 0.62;
        g.strokeStyle = rgba(this.colors.track, 0.5);
        g.lineWidth = 1;
        // perspective floor: rays from the vanishing point + horizontal lines
        for (let i = -8; i <= 8; i++) {
            g.beginPath();
            g.moveTo(cx, horizon - h * 0.08);
            g.lineTo(cx + i * w * 0.18, h);
            g.stroke();
        }
        for (let k = 1; k <= 6; k++) {
            const y = horizon + (h - horizon) * Math.pow(k / 6, 1.8);
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(w, y);
            g.stroke();
        }
        // fade the floor towards the horizon
        const fade = g.createLinearGradient(0, horizon - h * 0.1, 0, horizon + h * 0.15);
        fade.addColorStop(0, rgba(this.colors.bg, 1));
        fade.addColorStop(1, rgba(this.colors.bg, 0));
        g.fillStyle = fade;
        g.fillRect(0, 0, w, horizon + h * 0.15);
        return canvas;
    }

    private drawShard(
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        s: Shard,
        scale = 1,
        alpha = 1,
    ) {
        const base = s.length * 0.08;
        const mid = s.length * 0.38 * scale;
        const tip = s.length * scale;
        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);
        const px = -sin * (s.width / 2) * scale;
        const py = cos * (s.width / 2) * scale;
        const bx = cx + cos * base;
        const by = cy + sin * base;
        const mx = cx + cos * mid;
        const my = cy + sin * mid;
        const tx = cx + cos * tip;
        const ty = cy + sin * tip;
        // light half
        ctx.fillStyle = rgba(mixRgb(s.color, WHITE, 0.35), alpha);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(mx + px, my + py);
        ctx.lineTo(tx, ty);
        ctx.closePath();
        ctx.fill();
        // dark half
        ctx.fillStyle = rgba(mixRgb(s.color, BLACK, 0.18), alpha);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(mx - px, my - py);
        ctx.lineTo(tx, ty);
        ctx.closePath();
        ctx.fill();
    }

    protected draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        const c = this.colors;
        const s = this.state;
        const cx = w / 2;
        const cy = h / 2;
        const R = Math.min(w, h) / 2 - 1;
        const growFx = this.effect("grow");
        const shatterFx = this.effect("shatter");
        const boostFx = this.effect("boost");
        const bestFx = this.effect("best");
        const spin = this.animationsOn && !s.paused ? t * 0.05 : 0;

        ctx.save();
        if (s.paused) ctx.globalAlpha = 0.55;
        if (this.floor) ctx.drawImage(this.floor, 0, 0, w, h);

        // core glow
        const glowColor =
            s.isNewBest || bestFx !== null ? c.gold : shatterFx !== null ? c.again : c.easy;
        const glowR = R * (this.compact ? 0.9 : 0.6);
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        glow.addColorStop(0, rgba(glowColor, 0.28 + 0.2 * Math.min(1, s.streak / 60)));
        glow.addColorStop(1, rgba(glowColor, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // crystal
        const shards = this.shards(R, s.streak);
        for (let k = 0; k < shards.length; k++) {
            const shard = shards[k];
            shard.angle += spin;
            const newest = k === shards.length - 1;
            const scale = newest && growFx !== null ? 1 - Math.pow(1 - growFx, 3) : 1;
            this.drawShard(ctx, cx, cy, shard, scale);
        }

        // loose shards drifting around (large only)
        if (!this.compact && s.streak > 0) {
            const loose = Math.min(4, Math.ceil(s.streak / 15));
            for (let k = 0; k < loose; k++) {
                const a = k * 2.1 + t * (0.15 + k * 0.03);
                const d = R * (0.55 + 0.1 * hash01(k, 4));
                const shard: Shard = {
                    angle: a + Math.PI / 4,
                    length: R * 0.14,
                    width: R * 0.04,
                    color: mixRgb(c.easy, WHITE, 0.5),
                };
                this.drawShard(
                    ctx,
                    cx + Math.cos(a) * d,
                    cy + Math.sin(a) * d * 0.7,
                    shard,
                    1,
                    0.85,
                );
            }
        }

        // shatter: the old crystal flies apart
        if (shatterFx !== null) {
            for (let k = 0; k < this.shattered.length; k++) {
                const sh = this.shattered[k];
                const d = R * 0.9 * shatterFx * (0.6 + 0.4 * hash01(k, 6));
                const ox = cx + Math.cos(sh.angle) * d;
                const oy = cy + Math.sin(sh.angle) * d + R * 0.4 * shatterFx * shatterFx;
                this.drawShard(
                    ctx,
                    ox,
                    oy,
                    { ...sh, angle: sh.angle + shatterFx * 3 * (hash01(k, 8) - 0.5) },
                    1,
                    1 - shatterFx,
                );
            }
        }

        this.drawNumber(cx, cy, R * (this.compact ? 0.95 : 0.42), WHITE);

        if (boostFx !== null) {
            ctx.strokeStyle = rgba(c.boost, 0.8 * (1 - boostFx));
            ctx.lineWidth = Math.max(1.5, R * 0.035 * (1 - boostFx));
            ctx.beginPath();
            ctx.arc(cx, cy, R * 0.2 + R * 0.8 * boostFx, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (bestFx !== null) {
            const n = this.budget(26, 8);
            for (let k = 0; k < n; k++) {
                const a = (Math.PI * 2 * k) / n;
                const d = R * (0.25 + 0.7 * bestFx * (0.5 + 0.5 * hash01(k, 12)));
                const twinkle = 0.5 + 0.5 * Math.sin(t * 12 + k);
                ctx.fillStyle = rgba(mixRgb(c.gold, WHITE, 0.3), (1 - bestFx) * twinkle);
                ctx.beginPath();
                ctx.arc(
                    cx + Math.cos(a) * d,
                    cy + Math.sin(a) * d,
                    Math.max(1.2, R * 0.014),
                    0,
                    Math.PI * 2,
                );
                ctx.fill();
            }
        }
        ctx.restore();
    }
}
