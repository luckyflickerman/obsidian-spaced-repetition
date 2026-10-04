/**
 * Compact bar: a one-row HUD above the card or above the rating buttons
 * (phones, iPad in portrait). A small version of the visual style (~64 px)
 * sits in the middle.
 */

import { setIcon } from "obsidian";

import {
    BoostPips,
    pulseClass,
    RatingTrail,
    setAttrIfChanged,
    setIconIfChanged,
    setTextIfChanged,
    setTransformIfChanged,
    TimerRing,
    Toast,
} from "src/speed-streak/layouts/hud-parts";
import type {
    HudViewModel,
    LayoutCallbacks,
    SpeedStreakLayoutView,
    ToastKind,
} from "src/speed-streak/layouts/layout-types";
import { ss } from "src/speed-streak/speed-streak-i18n";
import type { SpeedStreakHudPosition } from "src/speed-streak/speed-streak-settings";

export class CompactLayout implements SpeedStreakLayoutView {
    readonly kind = "compact" as const;
    readonly root: HTMLElement;
    readonly sceneHost: HTMLElement;
    readonly sceneSize = "compact" as const;

    private timer: TimerRing;
    private recordBtn: HTMLButtonElement;
    private recordValue: HTMLElement;
    private liveBadge: HTMLElement;
    private recordBar: HTMLElement;
    private recordBarFill: HTMLElement;
    private scoreEl: HTMLElement;
    private trail: RatingTrail;
    private toastView: Toast;
    private bank: HTMLElement;
    private boostBtn: HTMLButtonElement;
    private boostLabel: HTMLElement;
    private pips: BoostPips;
    private boostProgressFill: HTMLElement;
    private pauseBtn: HTMLButtonElement;
    private barFill: HTMLElement;

    constructor(
        topAnchor: HTMLElement,
        bottomAnchor: HTMLElement,
        position: SpeedStreakHudPosition,
        private callbacks: LayoutCallbacks,
    ) {
        const anchor = position === "bottom" ? bottomAnchor : topAnchor;
        this.root = createDiv({ cls: "sr-ss-hud sr-ss-compact" });
        anchor.parentElement?.insertBefore(this.root, anchor);
        this.root.toggleClass("sr-ss-at-bottom", position === "bottom");

        // Timer ring (tap = pause)
        this.timer = new TimerRing(this.root, "sr-ss-compact-timer");
        this.timer.root.setAttr("role", "button");
        this.timer.root.addEventListener("click", () => this.callbacks.togglePause());

        // Center: scene + records + trail
        const center = this.root.createDiv({ cls: "sr-ss-center" });
        this.sceneHost = center.createDiv({ cls: "sr-ss-scene sr-ss-scene-compact" });
        const info = center.createDiv({ cls: "sr-ss-info" });
        this.recordBtn = info.createEl("button", { cls: "sr-ss-record-btn" });
        this.recordBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.callbacks.openRun(null);
        });
        const trophy = this.recordBtn.createSpan({ cls: "sr-ss-trophy" });
        setIcon(trophy, "trophy");
        this.recordValue = this.recordBtn.createSpan({ cls: "sr-ss-record-value" });
        this.liveBadge = this.recordBtn.createSpan({ cls: "sr-ss-badge" });
        this.recordBar = info.createDiv({ cls: "sr-ss-recbar" });
        this.recordBarFill = this.recordBar.createDiv({ cls: "sr-ss-recbar-fill" });
        this.scoreEl = info.createDiv({ cls: "sr-ss-score" });
        this.trail = new RatingTrail(info);
        this.toastView = new Toast(center);

        // Right: Boost bank + pause
        const right = this.root.createDiv({ cls: "sr-ss-right" });
        this.bank = right.createDiv({ cls: "sr-ss-bank" });
        this.boostBtn = this.bank.createEl("button", { cls: "sr-ss-boost-btn" });
        const boostIcon = this.boostBtn.createSpan({ cls: "sr-ss-boost-icon" });
        setIcon(boostIcon, "fast-forward");
        this.boostLabel = this.boostBtn.createSpan({ cls: "sr-ss-boost-label" });
        this.boostBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.callbacks.useBoost();
        });
        this.pips = new BoostPips(this.bank, "diamonds");
        const progress = this.bank.createDiv({ cls: "sr-ss-boost-progress" });
        this.boostProgressFill = progress.createDiv({ cls: "sr-ss-boost-progress-fill" });

        this.pauseBtn = right.createEl("button", { cls: "sr-ss-pause-btn clickable-icon" });
        this.pauseBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.callbacks.togglePause();
        });

        // Time bar at the bottom edge
        const bar = this.root.createDiv({ cls: "sr-ss-bar" });
        this.barFill = bar.createDiv({ cls: "sr-ss-bar-fill" });
    }

    render(vm: HudViewModel) {
        const r = this.root;
        r.toggleClass("is-paused", vm.paused && !vm.held);
        r.toggleClass("is-held", vm.held);
        r.toggleClass("is-warning", vm.warning);
        r.toggleClass("is-timeout", vm.timedOut);
        r.toggleClass("is-untimed", vm.untimed);
        r.toggleClass("is-free", vm.free);
        r.toggleClass("is-new-best", vm.newBest);
        r.toggleClass("is-boost-mode", vm.boostMode);
        r.toggleClass("phase-question", vm.phase === "question");
        r.toggleClass("phase-answer", vm.phase === "answer");
        if (r.dataset.timeColor !== vm.timeColor) {
            r.dataset.timeColor = vm.timeColor;
            r.setCssProps({ "--sr-ss-time-color": vm.timeColor });
        }

        this.timer.render(vm.fraction, vm.timerText, vm.phaseLabel, vm.phaseTitle);
        setAttrIfChanged(this.timer.root, "aria-label", vm.pauseTooltip);
        setTransformIfChanged(this.barFill, `scaleX(${vm.fraction.toFixed(3)})`);

        // Records
        setTextIfChanged(this.recordValue, String(vm.recordValue));
        setAttrIfChanged(this.recordBtn, "aria-label", `${vm.recordLabel}: ${vm.recordValue}`);
        setTextIfChanged(
            this.liveBadge,
            vm.liveBadge === "pure" ? ss("PURE_BADGE") : ss("BREAKS_BADGE"),
        );
        this.liveBadge.toggleClass("is-pure", vm.liveBadge === "pure");
        this.liveBadge.toggleClass("sr-is-hidden", vm.streak === 0);
        this.recordBar.toggleClass("sr-is-hidden", vm.recordsView !== "bar");
        setTransformIfChanged(this.recordBarFill, `scaleX(${vm.recordProgress.toFixed(3)})`);
        setAttrIfChanged(this.recordBar, "title", vm.recordBarText);
        setTextIfChanged(this.scoreEl, vm.scoreText);
        this.scoreEl.toggleClass("sr-is-hidden", vm.scoreText === "");
        this.trail.render(vm.trail, vm.showTrail);

        // Boost
        this.bank.toggleClass("sr-is-hidden", !vm.boostMode);
        if (vm.boostMode) {
            setTextIfChanged(this.boostLabel, vm.boostLabel);
            this.boostBtn.disabled = vm.boostDisabled;
            setAttrIfChanged(this.boostBtn, "aria-label", vm.boostTooltip);
            this.pips.render(vm.charges, vm.maxCharges);
            setTransformIfChanged(this.boostProgressFill, `scaleX(${vm.boostProgress.toFixed(3)})`);
            setAttrIfChanged(this.bank, "title", vm.boostProgressText);
        }

        // Pause
        setIconIfChanged(this.pauseBtn, vm.pauseIcon);
        this.pauseBtn.toggleClass("sr-is-hidden", vm.pauseHidden);
        setAttrIfChanged(this.pauseBtn, "aria-label", vm.pauseTooltip);
    }

    toast(text: string, kind: ToastKind) {
        this.toastView.show(text, kind);
    }

    pulse(cls: string) {
        pulseClass(this.root, cls);
    }

    setCollapsed(): void {
        // the compact bar has no collapsed state
    }

    destroy() {
        this.toastView.destroy();
        this.root.remove();
    }
}
