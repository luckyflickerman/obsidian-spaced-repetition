/**
 * Small DOM building blocks shared by the layouts. They update in place
 * (no DOM rebuild per frame) and only touch the DOM when a value changes.
 */

import { setIcon } from "obsidian";

import type { SpeedStreakRating } from "src/speed-streak/speed-streak-engine";
import { ss } from "src/speed-streak/speed-streak-i18n";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Sets the text only when it changed (avoids needless DOM writes every tick). */
export function setTextIfChanged(el: HTMLElement, text: string) {
    if (el.textContent !== text) el.textContent = text;
}

export function setAttrIfChanged(el: Element, name: string, value: string) {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

export function setIconIfChanged(el: HTMLElement, icon: string) {
    if (el.dataset.icon === icon) return;
    el.dataset.icon = icon;
    setIcon(el, icon);
}

export function setTransformIfChanged(el: HTMLElement, transform: string) {
    if (el.dataset.transform === transform) return;
    el.dataset.transform = transform;
    el.setCssProps({ transform });
}

export class TimerRing {
    readonly root: HTMLElement;
    private progress: SVGCircleElement;
    private text: HTMLElement;
    private label: HTMLElement;
    private circumference: number;
    private lastOffset = "";

    constructor(parent: HTMLElement, cls: string, radius = 26) {
        this.circumference = 2 * Math.PI * radius;
        const size = (radius + 6) * 2;
        this.root = parent.createDiv({ cls: `sr-ss-timer ${cls}` });
        const svg = activeDocument.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
        svg.classList.add("sr-ss-ring");
        const make = (klass: string) => {
            const c = activeDocument.createElementNS(SVG_NS, "circle");
            c.setAttribute("cx", String(size / 2));
            c.setAttribute("cy", String(size / 2));
            c.setAttribute("r", String(radius));
            c.classList.add(klass);
            svg.appendChild(c);
            return c;
        };
        make("sr-ss-ring-track");
        this.progress = make("sr-ss-ring-progress");
        this.progress.setAttribute("stroke-dasharray", String(this.circumference));
        this.root.appendChild(svg);
        const inner = this.root.createDiv({ cls: "sr-ss-timer-inner" });
        this.label = inner.createDiv({ cls: "sr-ss-phase-label" });
        this.text = inner.createDiv({ cls: "sr-ss-timer-text" });
    }

    render(fraction: number, text: string, label: string, title: string) {
        const offset = (this.circumference * (1 - fraction)).toFixed(1);
        if (offset !== this.lastOffset) {
            this.lastOffset = offset;
            this.progress.setAttribute("stroke-dashoffset", offset);
        }
        setTextIfChanged(this.text, text);
        setTextIfChanged(this.label, label);
        setAttrIfChanged(this.root, "title", title);
    }
}

export class RatingTrail {
    readonly root: HTMLElement;
    private key = "";

    constructor(parent: HTMLElement) {
        this.root = parent.createDiv({ cls: "sr-ss-trail" });
        // One coloured dot per rated card of the current streak
        this.root.setAttr("title", ss("TRAIL_LABEL"));
        this.root.setAttr("aria-label", ss("TRAIL_LABEL"));
    }

    render(trail: SpeedStreakRating[], visible: boolean) {
        this.root.toggleClass("sr-is-hidden", !visible);
        if (!visible) return;
        const last = trail.slice(-16);
        const key = last.join(",");
        if (key === this.key) return;
        this.key = key;
        this.root.empty();
        for (const r of last) this.root.createSpan({ cls: `sr-ss-dot sr-ss-dot-${r}` });
    }
}

/** Boost charges as diamonds (compact) or lightning icons (panel). */
export class BoostPips {
    readonly root: HTMLElement;
    private key = "";

    constructor(
        parent: HTMLElement,
        private style: "diamonds" | "bolts",
    ) {
        this.root = parent.createDiv({ cls: `sr-ss-pips sr-ss-pips-${style}` });
    }

    render(charges: number, max: number) {
        const key = `${charges}/${max}`;
        if (key === this.key) return;
        this.key = key;
        this.root.empty();
        for (let i = 0; i < max; i++) {
            const pip = this.root.createSpan({
                cls: `sr-ss-pip ${i < charges ? "is-full" : ""}`,
            });
            if (this.style === "bolts") setIcon(pip, "zap");
        }
    }
}

export class Toast {
    readonly root: HTMLElement;
    private timer: number | null = null;

    constructor(parent: HTMLElement) {
        this.root = parent.createDiv({ cls: "sr-ss-toast" });
    }

    show(text: string, kind: string) {
        this.root.setText(text);
        this.root.className = `sr-ss-toast sr-ss-toast-${kind} is-visible`;
        if (this.timer !== null) window.clearTimeout(this.timer);
        this.timer = window.setTimeout(() => {
            this.root.removeClass("is-visible");
            this.timer = null;
        }, 1600);
    }

    destroy() {
        if (this.timer !== null) window.clearTimeout(this.timer);
    }
}

/** Restarts a one-shot CSS animation class on an element. */
export function pulseClass(el: HTMLElement, cls: string, ms = 700) {
    el.removeClass(cls);
    void el.offsetWidth; // restart the animation
    el.addClass(cls);
    window.setTimeout(() => el.removeClass(cls), ms);
}
