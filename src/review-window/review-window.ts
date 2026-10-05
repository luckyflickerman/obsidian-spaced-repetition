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
    /** How big the card text is in the review */
    cardTextSize: CardTextSize;
    /** Short cards (a word and its translation) are centered in the window */
    centerShortCards: boolean;
}

export const CARD_TEXT_SIZES = ["normal", "large", "xlarge"] as const;
export type CardTextSize = (typeof CARD_TEXT_SIZES)[number];

export const DEFAULT_REVIEW_WINDOW_SETTINGS: ReviewWindowSettings = {
    fullscreen: false,
    left: null,
    top: null,
    cardTextSize: "large",
    centerShortCards: true,
};

/** A card with at most this many characters (front + back) counts as short. */
export const SHORT_CARD_MAX_CHARS = 80;

export function isShortCard(textLength: number): boolean {
    return textLength <= SHORT_CARD_MAX_CHARS;
}

/**
 * Font-size multiplier for the card text. Short cards (single words) get the full size,
 * long ones (sentences, lists, images) only a little, so they still fit on a phone.
 */
export function cardTextScale(size: CardTextSize, textLength: number): number {
    const short = isShortCard(textLength);
    switch (size) {
        case "large":
            return short ? 1.6 : 1.1;
        case "xlarge":
            return short ? 2.1 : 1.2;
        default:
            return 1;
    }
}

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
        cardTextSize: (CARD_TEXT_SIZES as readonly unknown[]).includes(s.cardTextSize)
            ? (s.cardTextSize as CardTextSize)
            : DEFAULT_REVIEW_WINDOW_SETTINGS.cardTextSize,
        centerShortCards:
            typeof s.centerShortCards === "boolean"
                ? s.centerShortCards
                : DEFAULT_REVIEW_WINDOW_SETTINGS.centerShortCards,
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
