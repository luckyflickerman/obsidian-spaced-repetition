/**
 * Fusion Rings: a glowing orb with the streak number, concentric rings filled
 * with the colors of your ratings and satellites on orbits. Every rated card
 * adds a segment and a satellite; at high streaks the rings "fuse" (all full).
 *
 * Visual design after the Anki add-on Speed Streak by henbitdeathmetal (MIT),
 * redrawn with Canvas 2D — see THIRD_PARTY_NOTICES.md.
 */

import type { SpeedStreakEvent, SpeedStreakRating } from "src/speed-streak/speed-streak-engine";
import { RGB, timerColor } from "src/speed-streak/speed-streak-themes";
import {
    BLACK,
    CanvasVisual,
    hash01,
    mixRgb,
    rgba,
    WHITE,
} from "src/speed-streak/visuals/canvas-visual";

const CARDS_PER_RING = 12;
const ORDER: SpeedStreakRating[] = ["easy", "good", "hard", "again"];

interface LostSnapshot {
    count: number;
    trail: SpeedStreakRating[];
    t: number;
}

export class FusionVisual extends CanvasVisual {
    id = "fusion";
    name = { en: "Fusion Rings", pl: "Fusion Rings" };
    defaultThemeId = "midnight";

    private lost: LostSnapshot | null = null;
    private clock = 0;

    protected handleEvent(e: SpeedStreakEvent) {
        switch (e.type) {
            case "rate":
                this.startEffect("rate", 500);
                break;
            case "timeout":
                this.lost = {
                    count: this.satelliteCount(this.state.streak),
                    trail: [...this.state.ratingTrail],
                    t: this.clock,
                };
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

    private get compact(): boolean {
        return this.context.size === "compact";
    }

    private satelliteCount(streak: number): number {
        return Math.min(streak, this.budget(48, this.compact ? 0 : 6));
    }

    protected draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        this.clock = t;
        const c = this.colors;
        const s = this.state;
        const cx = w / 2;
        const cy = h / 2;
        const R = Math.min(w, h) / 2 - 1;
        const compact = this.compact;
        const orbR = R * (compact ? 0.42 : 0.27);
        const ringW = R * (compact ? 0.075 : 0.042);
        const ringGap = R * (compact ? 0.11 : 0.062);
        const maxRings = compact ? 2 : 4;
        const ringBase = orbR + ringGap * 0.9;
        const spin = this.animationsOn && !s.paused ? t : 0;

        ctx.save();
        if (s.paused) ctx.globalAlpha = 0.55;

        const rateFx = this.effect("rate");
        const timeoutFx = this.effect("timeout");
        const boostFx = this.effect("boost");
        const bestFx = this.effect("best");

        // Orbits & satellites (large only)
        const ringsOuter = ringBase + (maxRings - 1) * ringGap + ringW;
        const orbitMin = ringsOuter + R * 0.09;
        const orbitMax = R * 0.96;
        const orbits = 4;
        if (!compact) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = rgba(c.track, 0.45);
            for (let o = 0; o < orbits; o++) {
                const r = orbitMin + ((orbitMax - orbitMin) * o) / (orbits - 1);
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
            }
            const n = this.satelliteCount(s.streak);
            this.drawSatellites(
                ctx,
                cx,
                cy,
                R,
                n,
                s.ratingTrail,
                spin,
                orbitMin,
                orbitMax,
                orbits,
                1,
                rateFx,
            );
            if (timeoutFx !== null && this.lost) {
                this.drawSatellites(
                    ctx,
                    cx,
                    cy,
                    R,
                    this.lost.count,
                    this.lost.trail,
                    this.lost.t,
                    orbitMin,
                    orbitMax,
                    orbits,
                    1 + timeoutFx * 1.4,
                    null,
                    1 - timeoutFx,
                );
            }
        }

        // Rings
        const total = ORDER.reduce((sum, r) => sum + s.streakRatings[r], 0);
        const merged = s.streak >= maxRings * CARDS_PER_RING;
        for (let i = 0; i < maxRings; i++) {
            const r = ringBase + i * ringGap;
            ctx.lineWidth = ringW;
            ctx.lineCap = "butt";
            ctx.strokeStyle = rgba(c.track, 0.8);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();

            const fill = merged
                ? 1
                : Math.max(0, Math.min(1, (s.streak - i * CARDS_PER_RING) / CARDS_PER_RING));
            if (fill <= 0) continue;
            const dir = i % 2 === 0 ? 1 : -1;
            let a = -Math.PI / 2 + dir * spin * (0.12 + i * 0.03);
            const sweep = Math.PI * 2 * fill;
            const pulse =
                rateFx !== null &&
                i === Math.min(maxRings - 1, Math.floor((s.streak - 1) / CARDS_PER_RING))
                    ? 1 + 0.5 * Math.sin(rateFx * Math.PI)
                    : 1;
            ctx.lineWidth = ringW * pulse;
            for (const rating of ORDER) {
                const share =
                    total > 0 ? s.streakRatings[rating] / total : rating === "good" ? 1 : 0;
                if (share <= 0) continue;
                const len = sweep * share;
                ctx.strokeStyle = rgba(mixRgb(this.ratingColor(rating), WHITE, 0.08));
                ctx.beginPath();
                ctx.arc(cx, cy, r, a, a + len);
                ctx.stroke();
                a += len;
            }
            // segment ticks
            if (!compact) {
                ctx.strokeStyle = rgba(c.bg, 0.55);
                ctx.lineWidth = Math.max(1, R * 0.006);
                const start = -Math.PI / 2 + dir * spin * (0.12 + i * 0.03);
                const ticks = Math.round(CARDS_PER_RING * fill);
                for (let k = 1; k <= ticks; k++) {
                    const ang = start + (Math.PI * 2 * k) / CARDS_PER_RING;
                    ctx.beginPath();
                    ctx.moveTo(
                        cx + Math.cos(ang) * (r - ringW / 2),
                        cy + Math.sin(ang) * (r - ringW / 2),
                    );
                    ctx.lineTo(
                        cx + Math.cos(ang) * (r + ringW / 2),
                        cy + Math.sin(ang) * (r + ringW / 2),
                    );
                    ctx.stroke();
                }
            }
        }

        // Timeout flash over the rings
        if (timeoutFx !== null) {
            ctx.lineWidth = ringW * maxRings;
            ctx.strokeStyle = rgba(c.again, 0.45 * (1 - timeoutFx));
            ctx.beginPath();
            ctx.arc(cx, cy, ringBase + ((maxRings - 1) * ringGap) / 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Orb glow: time warning, record, timeout
        let glow: RGB = c.easy;
        let glowAlpha = 0.3;
        if (s.fraction !== null && s.fraction < 0.35 && !s.paused) {
            glow = this.parse(timerColor(s.fraction, c.good, c.hard, c.again)) ?? c.again;
            glowAlpha = 0.45;
        }
        if (s.isNewBest || bestFx !== null) {
            glow = c.gold;
            glowAlpha = 0.45 + (bestFx !== null ? 0.4 * (1 - bestFx) : 0);
        }
        if (timeoutFx !== null || s.timedOut) {
            glow = c.again;
            glowAlpha = 0.5;
        }
        const pulse = rateFx !== null ? 1 + 0.08 * Math.sin(rateFx * Math.PI) : 1;
        const or = orbR * pulse;
        const halo = ctx.createRadialGradient(cx, cy, or * 0.9, cx, cy, or * 1.55);
        halo.addColorStop(0, rgba(glow, glowAlpha));
        halo.addColorStop(1, rgba(glow, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, or * 1.55, 0, Math.PI * 2);
        ctx.fill();

        // Orb
        const base = timeoutFx !== null ? mixRgb(c.easy, c.again, 1 - timeoutFx) : c.easy;
        const g = ctx.createRadialGradient(cx - or * 0.35, cy - or * 0.42, or * 0.04, cx, cy, or);
        g.addColorStop(0, rgba(WHITE));
        g.addColorStop(0.22, rgba(mixRgb(base, WHITE, 0.45)));
        g.addColorStop(0.72, rgba(base));
        g.addColorStop(1, rgba(mixRgb(base, BLACK, 0.35)));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, or, 0, Math.PI * 2);
        ctx.fill();

        this.drawNumber(cx, cy, or * 1.55, WHITE);

        // Boost: a wave from the orb outwards
        if (boostFx !== null) {
            ctx.strokeStyle = rgba(c.boost, 0.8 * (1 - boostFx));
            ctx.lineWidth = Math.max(1.5, R * 0.04 * (1 - boostFx));
            ctx.beginPath();
            ctx.arc(cx, cy, or + (R - or) * boostFx, 0, Math.PI * 2);
            ctx.stroke();
        }

        // New record: a burst of gold sparks
        if (bestFx !== null) {
            const sparks = this.budget(28, 10);
            ctx.fillStyle = rgba(c.gold, 1 - bestFx);
            for (let k = 0; k < sparks; k++) {
                const ang = (Math.PI * 2 * k) / sparks + hash01(k, 7) * 0.4;
                const dist = or + (R - or) * bestFx * (0.6 + 0.4 * hash01(k, 3));
                ctx.beginPath();
                ctx.arc(
                    cx + Math.cos(ang) * dist,
                    cy + Math.sin(ang) * dist,
                    Math.max(1.5, R * 0.018),
                    0,
                    Math.PI * 2,
                );
                ctx.fill();
            }
        }
        ctx.restore();
    }

    private drawSatellites(
        ctx: CanvasRenderingContext2D,
        cx: number,
        cy: number,
        R: number,
        count: number,
        trail: SpeedStreakRating[],
        t: number,
        orbitMin: number,
        orbitMax: number,
        orbits: number,
        spread: number,
        rateFx: number | null,
        alpha = 1,
    ) {
        if (count <= 0 || alpha <= 0) return;
        const size = Math.max(2, R * 0.024);
        const halo = this.profile.particles >= 1;
        for (let k = 0; k < count; k++) {
            const orbit = k % orbits;
            let r = orbitMin + ((orbitMax - orbitMin) * orbit) / (orbits - 1);
            const speed = (0.32 - orbit * 0.05) * (orbit % 2 === 0 ? 1 : -1);
            const ang = hash01(k, 11) * Math.PI * 2 + t * speed;
            // the newest satellite flies out of the orb
            if (rateFx !== null && k === count - 1) r = R * 0.27 + (r - R * 0.27) * rateFx;
            r *= spread;
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r;
            const rating = trail.length > 0 ? trail[trail.length - 1 - (k % trail.length)] : "good";
            const col = mixRgb(this.ratingColor(rating), WHITE, 0.25);
            if (halo) {
                ctx.fillStyle = rgba(col, 0.18 * alpha);
                ctx.beginPath();
                ctx.arc(x, y, size * 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = rgba(col, alpha);
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private parse(color: string): RGB | null {
        const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(color);
        return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
    }
}
