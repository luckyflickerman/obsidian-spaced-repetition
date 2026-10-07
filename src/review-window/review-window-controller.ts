import { Platform } from "obsidian";

import type SRPlugin from "src/main";
import {
    clampPosition,
    fromFractions,
    isDrag,
    normalizeReviewWindowSettings,
    Point,
    ReviewWindowSettings,
    Size,
    toFractions,
} from "src/review-window/review-window";

/** What the header buttons need from the review window. */
export interface ReviewWindowControls {
    isFullscreen(): boolean;
    toggleFullscreen(): void;
    /** Called with the new state whenever full screen is switched. */
    onFullscreenChange(callback: (fullscreen: boolean) => void): void;
}

/** Bars you can grab to move the window (deck list header, card toolbar). */
const HANDLE_SELECTOR = ".sr-deck-list-header, .sr-card-toolbar";
/** Controls inside the bars keep working normally. */
const INTERACTIVE_SELECTOR =
    "button, select, input, textarea, a, .clickable-icon, .sr-button, .dropdown";

export function getReviewWindowSettings(plugin: SRPlugin): ReviewWindowSettings {
    const settings = plugin.dataManager.data.settings;
    const normalized = normalizeReviewWindowSettings(settings.reviewWindow);
    settings.reviewWindow = normalized;
    return normalized;
}

/**
 * Glue between the review modal and the window logic: full screen, dragging
 * the window by its header, double-click to center, remembering the position.
 */
export class ReviewWindowController implements ReviewWindowControls {
    /** Controller of the open review window (used by the command). */
    static active: ReviewWindowController | null = null;

    private plugin: SRPlugin;
    private modalEl: HTMLElement;
    private listeners: Array<(fullscreen: boolean) => void> = [];
    private drag: {
        pointerId: number;
        startX: number;
        startY: number;
        origin: Point;
        moved: boolean;
    } | null = null;

    constructor(plugin: SRPlugin, modalEl: HTMLElement) {
        this.plugin = plugin;
        this.modalEl = modalEl;
    }

    private get settings(): ReviewWindowSettings {
        return getReviewWindowSettings(this.plugin);
    }

    // MARK: Lifecycle

    attach() {
        ReviewWindowController.active = this;
        this.modalEl.addEventListener("pointerdown", this.onPointerDown);
        this.modalEl.addEventListener("dblclick", this.onDoubleClick);
        window.addEventListener("resize", this.onScreenResize);
        // a phone has no room to move the window: the header only scrolls and taps there
        this.modalEl.toggleClass("sr-movable", !this.isPhone);
        this.applyFullscreen();
        // after Obsidian's opening animation has placed the modal
        window.requestAnimationFrame(() => this.restorePosition());
    }

    detach() {
        this.endDrag();
        this.modalEl.removeEventListener("pointerdown", this.onPointerDown);
        this.modalEl.removeEventListener("dblclick", this.onDoubleClick);
        window.removeEventListener("resize", this.onScreenResize);
        if (ReviewWindowController.active === this) ReviewWindowController.active = null;
    }

    // MARK: Full screen

    isFullscreen(): boolean {
        return this.settings.fullscreen;
    }

    toggleFullscreen() {
        const settings = this.settings;
        settings.fullscreen = !settings.fullscreen;
        this.applyFullscreen();
        if (!settings.fullscreen) this.restorePosition();
        void this.save();
    }

    onFullscreenChange(callback: (fullscreen: boolean) => void) {
        this.listeners.push(callback);
    }

    private applyFullscreen() {
        const fullscreen = this.settings.fullscreen;
        this.modalEl.toggleClass("sr-is-fullscreen", fullscreen);
        for (const listener of this.listeners) listener(fullscreen);
    }

    // MARK: Position

    private get screen(): Size {
        const container = this.modalEl.parentElement;
        return {
            width: container?.clientWidth || window.innerWidth,
            height: container?.clientHeight || window.innerHeight,
        };
    }

    private get windowSize(): Size {
        return { width: this.modalEl.offsetWidth, height: this.modalEl.offsetHeight };
    }

    /** Current position relative to the modal container. */
    private currentPosition(): Point {
        const rect = this.modalEl.getBoundingClientRect();
        const containerRect = this.modalEl.parentElement?.getBoundingClientRect();
        return {
            left: rect.left - (containerRect?.left ?? 0),
            top: rect.top - (containerRect?.top ?? 0),
        };
    }

    private placeAt(pos: Point | null) {
        if (pos === null) {
            this.modalEl.removeClass("sr-is-placed");
            this.modalEl.setCssProps({ "--sr-window-left": "", "--sr-window-top": "" });
            return;
        }
        this.modalEl.addClass("sr-is-placed");
        this.modalEl.setCssProps({
            "--sr-window-left": `${pos.left}px`,
            "--sr-window-top": `${pos.top}px`,
        });
    }

    private get isPhone(): boolean {
        return Platform.isPhone || activeDocument.body.hasClass("is-phone");
    }

    /**
     * A window that fills the screen (every phone, an iPad at 100 %) is never moved: on a phone
     * a swipe over the header used to push the window sideways and the spot was remembered.
     */
    private get canMove(): boolean {
        if (this.isPhone) return false;
        const size = this.windowSize;
        const screen = this.screen;
        return size.width < screen.width * 0.98 || size.height < screen.height * 0.98;
    }

    private restorePosition() {
        const s = this.settings;
        if (s.left === null || s.top === null || !this.canMove) {
            this.placeAt(null);
            return;
        }
        this.placeAt(fromFractions({ left: s.left, top: s.top }, this.windowSize, this.screen));
    }

    private resetPosition() {
        const settings = this.settings;
        settings.left = null;
        settings.top = null;
        this.placeAt(null);
        void this.save();
    }

    private onScreenResize = () => {
        if (!this.settings.fullscreen) this.restorePosition();
    };

    // MARK: Dragging

    private isHandle(target: EventTarget | null): boolean {
        if (!(target instanceof Element)) return false;
        if (!target.closest(HANDLE_SELECTOR)) return false;
        if (target.closest(INTERACTIVE_SELECTOR)) return false;
        return this.modalEl.contains(target);
    }

    private onPointerDown = (e: PointerEvent) => {
        if (this.settings.fullscreen || e.button !== 0 || !this.isHandle(e.target)) return;
        if (!this.canMove) return;
        this.drag = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            origin: this.currentPosition(),
            moved: false,
        };
        window.addEventListener("pointermove", this.onPointerMove);
        window.addEventListener("pointerup", this.onPointerUp);
        window.addEventListener("pointercancel", this.onPointerUp);
    };

    private onPointerMove = (e: PointerEvent) => {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved) {
            if (!isDrag(dx, dy)) return;
            drag.moved = true;
            this.modalEl.addClass("sr-is-dragging");
        }
        e.preventDefault();
        this.placeAt(
            clampPosition(
                { left: drag.origin.left + dx, top: drag.origin.top + dy },
                this.windowSize,
                this.screen,
            ),
        );
    };

    private onPointerUp = (e: PointerEvent) => {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;
        const moved = drag.moved;
        this.endDrag();
        if (!moved) return;
        const saved = toFractions(this.currentPosition(), this.screen);
        // one object: re-reading `this.settings` between the two writes would
        // normalize away a half-written position
        const settings = this.settings;
        settings.left = saved.left;
        settings.top = saved.top;
        void this.save();
    };

    private endDrag() {
        this.drag = null;
        this.modalEl.removeClass("sr-is-dragging");
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("pointerup", this.onPointerUp);
        window.removeEventListener("pointercancel", this.onPointerUp);
    }

    private onDoubleClick = (e: MouseEvent) => {
        if (this.settings.fullscreen || !this.isHandle(e.target)) return;
        e.preventDefault();
        this.resetPosition();
    };

    private async save() {
        try {
            await this.plugin.dataManager.settingsManager.save();
        } catch (e) {
            console.error("[Review window] could not save", e);
        }
    }
}
