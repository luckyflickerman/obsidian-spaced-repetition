/**
 * Shared base of the Canvas 2D scenes.
 *
 * Takes care of everything a style should not have to think about:
 * - a crisp canvas (devicePixelRatio, capped at 2) that follows its host's size;
 * - the animation loop: requestAnimationFrame only while the scene is visible
 *   (IntersectionObserver + document.hidden), not paused and the performance
 *   level allows it; 30 fps cap for "Light", no loop for "Minimal" / reduced motion;
 * - theme colors read from the `--ss-*` tokens (so every style works with every theme);
 * - short one-shot effects (rate, timeout, boost, new record).
 *
 * A style implements `draw()` (and optionally `isAnimated()`, `handleEvent()`).
 */

import type { SpeedStreakEvent } from "src/speed-streak/speed-streak-engine";
import { PerformanceProfile, performanceProfile } from "src/speed-streak/speed-streak-settings";
import { parseColor, RGB } from "src/speed-streak/speed-streak-themes";
import {
    EMPTY_VISUAL_STATE,
    SpeedStreakVisual,
    VisualContext,
    VisualState,
} from "src/speed-streak/visuals/visual-types";

export interface Palette {
    bg: RGB;
    text: RGB;
    muted: RGB;
    faint: RGB;
    track: RGB;
    again: RGB;
    hard: RGB;
    good: RGB;
    easy: RGB;
    boost: RGB;
    gold: RGB;
}

const PALETTE_VARS: Record<keyof Palette, string> = {
    bg: "--ss-bg",
    text: "--ss-text",
    muted: "--ss-muted",
    faint: "--ss-faint",
    track: "--ss-track",
    again: "--ss-again",
    hard: "--ss-hard",
    good: "--ss-good",
    easy: "--ss-easy",
    boost: "--ss-boost",
    gold: "--ss-gold",
};

const FALLBACK: Palette = {
    bg: [20, 22, 28],
    text: [235, 238, 245],
    muted: [140, 150, 170],
    faint: [80, 88, 104],
    track: [40, 44, 54],
    again: [210, 80, 100],
    hard: [210, 160, 60],
    good: [60, 190, 120],
    easy: [70, 130, 230],
    boost: [120, 110, 220],
    gold: [232, 177, 14],
};

export function rgba(c: RGB, alpha = 1): string {
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

/** Linear mix of two colors (t = 0 → a, t = 1 → b). */
export function mixRgb(a: RGB, b: RGB, t: number): RGB {
    return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
}

export const WHITE: RGB = [255, 255, 255];
export const BLACK: RGB = [0, 0, 0];

/** Small deterministic pseudo-random number in [0, 1) for index `i` (stable layouts). */
export function hash01(i: number, seed = 1): number {
    const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export abstract class CanvasVisual implements SpeedStreakVisual {
    abstract id: string;
    abstract name: { en: string; pl?: string };
    abstract defaultThemeId: string;

    protected host: HTMLElement | null = null;
    protected canvas: HTMLCanvasElement | null = null;
    protected ctx: CanvasRenderingContext2D | null = null;
    protected context: VisualContext = { performance: "full", reducedMotion: false, size: "large" };
    protected profile: PerformanceProfile = performanceProfile("full");
    protected state: VisualState = EMPTY_VISUAL_STATE;
    protected colors: Palette = FALLBACK;
    protected fontFamily = "sans-serif";
    /** Size in CSS pixels */
    protected width = 0;
    protected height = 0;
    private dpr = 1;

    private rafId = 0;
    private running = false;
    private lastFrame = 0;
    private visible = true;
    private resizeObserver: ResizeObserver | null = null;
    private intersectionObserver: IntersectionObserver | null = null;
    /** One-shot effects: name → start time (ms, performance.now()) and duration */
    private effects = new Map<string, { start: number; duration: number }>();

    // MARK: SpeedStreakVisual

    mount(host: HTMLElement, ctx: VisualContext) {
        this.host = host;
        this.context = ctx;
        this.profile = performanceProfile(ctx.performance);
        this.canvas = host.createEl("canvas", { cls: "sr-ss-scene-canvas" });
        this.canvas.setAttr("aria-hidden", "true");
        this.ctx = this.canvas.getContext("2d");
        this.readColors();
        this.init();

        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver((entries) => {
                const box = entries[0]?.contentRect;
                if (box) this.resize(box.width, box.height);
            });
            this.resizeObserver.observe(host);
        }
        if (typeof IntersectionObserver !== "undefined") {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                this.visible = entries.some((e) => e.isIntersecting);
                this.kick();
            });
            this.intersectionObserver.observe(host);
        }
        activeDocument.addEventListener("visibilitychange", this.onVisibility);
        const rect = host.getBoundingClientRect();
        this.resize(rect.width, rect.height);
    }

    update(state: VisualState) {
        const prev = this.state;
        this.state = state;
        this.onStateChange(prev, state);
        if (this.wantsLoop()) this.kick();
        else if (this.significantChange(prev, state)) this.drawNow();
    }

    onEvent(e: SpeedStreakEvent) {
        this.handleEvent(e);
        if (this.wantsLoop()) this.kick();
        else this.drawNow();
    }

    resize(width: number, height: number) {
        if (!this.canvas || width <= 0 || height <= 0) return;
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.width = width;
        this.height = height;
        this.canvas.width = Math.round(width * this.dpr);
        this.canvas.height = Math.round(height * this.dpr);
        this.onResize(width, height);
        this.drawNow();
    }

    refreshColors() {
        this.readColors();
        this.onResize(this.width, this.height);
        this.drawNow();
    }

    destroy() {
        this.stopLoop();
        this.resizeObserver?.disconnect();
        this.intersectionObserver?.disconnect();
        activeDocument.removeEventListener("visibilitychange", this.onVisibility);
        this.canvas?.remove();
        this.canvas = null;
        this.ctx = null;
        this.host = null;
    }

    // MARK: For styles

    /** Called once after mounting. */
    protected init(): void {}

    /** Called after a resize (e.g. to pre-render a static background). */
    protected onResize(_width: number, _height: number): void {}

    /** Continuous ambient animation (orbits, particles…) while not paused. */
    protected isAnimated(): boolean {
        return !this.state.paused;
    }

    protected onStateChange(_prev: VisualState, _next: VisualState): void {}

    /** Should a static scene be redrawn for this state change (no loop running)? */
    protected significantChange(prev: VisualState, next: VisualState): boolean {
        return (
            prev.streak !== next.streak ||
            prev.paused !== next.paused ||
            prev.timedOut !== next.timedOut ||
            prev.isNewBest !== next.isNewBest ||
            prev.phase !== next.phase
        );
    }

    protected handleEvent(_e: SpeedStreakEvent): void {}

    /** Draws one frame. `t` = seconds (monotonic), `dt` = seconds since the last frame. */
    protected abstract draw(
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        t: number,
        dt: number,
    ): void;

    /** Animations allowed at all (not "Minimal", no reduced motion)? */
    protected get animationsOn(): boolean {
        return this.profile.fps > 0 && !this.context.reducedMotion;
    }

    /** Scales a particle count by the performance level (at least `min`). */
    protected budget(full: number, min = 0): number {
        const n = Math.round(full * this.profile.particles);
        return Math.max(min, this.context.size === "compact" ? Math.round(n * 0.35) : n);
    }

    /** Starts a one-shot effect (ignored when animations are off). */
    protected startEffect(name: string, durationMs: number) {
        if (!this.animationsOn) return;
        this.effects.set(name, { start: performance.now(), duration: durationMs });
    }

    /** Progress 0–1 of a running effect, or null when it is not running. */
    protected effect(name: string): number | null {
        const fx = this.effects.get(name);
        if (!fx) return null;
        const p = (performance.now() - fx.start) / fx.duration;
        if (p >= 1) {
            this.effects.delete(name);
            return null;
        }
        return Math.max(0, p);
    }

    /** Font for numbers, following the Obsidian interface font. */
    protected numberFont(px: number): string {
        return `800 ${Math.round(px)}px ${this.fontFamily}`;
    }

    // MARK: Loop

    private wantsLoop(): boolean {
        if (!this.animationsOn || !this.visible || activeDocument.hidden || !this.canvas)
            return false;
        return this.isAnimated() || this.effects.size > 0;
    }

    /** Starts the loop if it should run (safe to call often). */
    private kick() {
        if (this.running || !this.wantsLoop()) {
            if (!this.wantsLoop()) this.drawNow();
            return;
        }
        this.running = true;
        this.lastFrame = 0;
        this.rafId = window.requestAnimationFrame(this.frame);
    }

    private stopLoop() {
        if (this.rafId) window.cancelAnimationFrame(this.rafId);
        this.rafId = 0;
        this.running = false;
    }

    private frame = (now: number) => {
        this.rafId = 0;
        if (!this.wantsLoop()) {
            this.running = false;
            this.drawNow();
            return;
        }
        const minGap = 1000 / this.profile.fps - 1;
        if (this.lastFrame === 0 || now - this.lastFrame >= minGap) {
            const dt = this.lastFrame === 0 ? 1 / 60 : Math.min(0.1, (now - this.lastFrame) / 1000);
            this.lastFrame = now;
            this.render(now / 1000, dt);
        }
        this.rafId = window.requestAnimationFrame(this.frame);
    };

    private onVisibility = () => {
        if (activeDocument.hidden) this.stopLoop();
        else this.kick();
    };

    /** Draws a single frame right away (static scenes, state changes, resize). */
    protected drawNow() {
        this.render(performance.now() / 1000, 0);
    }

    private render(t: number, dt: number) {
        const ctx = this.ctx;
        if (!ctx || this.width <= 0 || this.height <= 0) return;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);
        try {
            this.draw(ctx, this.width, this.height, t, dt);
        } catch (e) {
            console.error(`[Speed Streak] style "${this.id}" failed to draw`, e);
        }
    }

    // MARK: Colors

    private readColors() {
        const host = this.host;
        if (!host) return;
        const probe = host.createSpan();
        probe.addClass("sr-ss-color-probe");
        const read = (cssVar: string, fallback: RGB): RGB => {
            probe.setCssProps({ color: `var(${cssVar})` });
            return parseColor(getComputedStyle(probe).color) ?? fallback;
        };
        const palette = { ...FALLBACK };
        for (const [key, cssVar] of Object.entries(PALETTE_VARS) as [keyof Palette, string][]) {
            palette[key] = read(cssVar, FALLBACK[key]);
        }
        this.fontFamily = getComputedStyle(host).fontFamily || "sans-serif";
        probe.remove();
        this.colors = palette;
    }

    /** Color of a rating from the theme. */
    protected ratingColor(rating: string): RGB {
        switch (rating) {
            case "again":
                return this.colors.again;
            case "hard":
                return this.colors.hard;
            case "easy":
                return this.colors.easy;
            default:
                return this.colors.good;
        }
    }

    /** Draws the streak number in the middle (shrinks for long numbers). */
    protected drawNumber(cx: number, cy: number, maxWidth: number, color: RGB, alpha = 1) {
        const ctx = this.ctx;
        if (!ctx) return;
        const text = String(this.state.streak);
        const size = Math.min(maxWidth * 0.62, (maxWidth * 1.35) / Math.max(2, text.length));
        ctx.font = this.numberFont(size);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = rgba(BLACK, 0.35 * alpha);
        ctx.fillText(text, cx, cy + size * 0.06);
        ctx.fillStyle = rgba(color, alpha);
        ctx.fillText(text, cx, cy);
    }
}
