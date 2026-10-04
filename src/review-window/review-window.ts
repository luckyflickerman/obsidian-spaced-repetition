/**
 * Review window — full screen and free positioning of the review modal.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

export interface ReviewWindowSettings {
    fullscreen: boolean;
    /**
     * Last position of the window's top-left corner as a fraction of the
     * screen (0–1), so it still fits when Obsidian's window changes size.
     * `null` = centered.
     */
    left: number | null;
    top: number | null;
}

export const DEFAULT_REVIEW_WINDOW_SETTINGS: ReviewWindowSettings = {
    fullscreen: false,
    left: null,
    top: null,
};

export function normalizeReviewWindowSettings(
    stored: Partial<ReviewWindowSettings> | null | undefined,
): ReviewWindowSettings {
    const s = stored && typeof stored === "object" ? stored : {};
    const fraction = (v: unknown) =>
        typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(-1, v)) : null;
    const left = fraction(s.left);
    const top = fraction(s.top);
    return {
        fullscreen: typeof s.fullscreen === "boolean" ? s.fullscreen : false,
        // both or neither
        left: left !== null && top !== null ? left : null,
        top: left !== null && top !== null ? top : null,
    };
}

export interface Size {
    width: number;
    height: number;
}

export interface Point {
    left: number;
    top: number;
}

/** How much of the window must stay on screen, px (enough to grab it again). */
export const MIN_VISIBLE_WIDTH = 120;
export const MIN_VISIBLE_HEIGHT = 48;

/**
 * Keeps the window reachable: its header can't leave the top of the screen and
 * at least a strip of it stays visible on every side.
 */
export function clampPosition(pos: Point, window: Size, screen: Size): Point {
    const visibleW = Math.min(MIN_VISIBLE_WIDTH, window.width);
    const visibleH = Math.min(MIN_VISIBLE_HEIGHT, window.height);
    const minLeft = visibleW - window.width;
    const maxLeft = screen.width - visibleW;
    const maxTop = screen.height - visibleH;
    return {
        left: Math.round(Math.min(maxLeft, Math.max(minLeft, pos.left))),
        top: Math.round(Math.min(maxTop, Math.max(0, pos.top))),
    };
}

/** Pixel position → fractions of the screen (for saving). */
export function toFractions(pos: Point, screen: Size): Point {
    return {
        left: screen.width > 0 ? pos.left / screen.width : 0,
        top: screen.height > 0 ? pos.top / screen.height : 0,
    };
}

/** Saved fractions → pixel position, clamped to the current screen. */
export function fromFractions(saved: Point, window: Size, screen: Size): Point {
    return clampPosition(
        { left: saved.left * screen.width, top: saved.top * screen.height },
        window,
        screen,
    );
}

/** Moving less than this many px counts as a click, not a drag. */
export const DRAG_THRESHOLD = 4;

export function isDrag(dx: number, dy: number): boolean {
    return Math.hypot(dx, dy) >= DRAG_THRESHOLD;
}
