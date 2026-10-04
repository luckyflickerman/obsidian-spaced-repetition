/**
 * Side panel (computer, iPad in landscape), after the original add-on:
 * timer with phase, Boosts and progress, all-time best + live streak, top 5,
 * a large scene, and buttons at the bottom. Can be folded to a narrow strip.
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
    ListedRun,
    SpeedStreakLayoutView,
    ToastKind,
} from "src/speed-streak/layouts/layout-types";
import { ss } from "src/speed-streak/speed-streak-i18n";

const HOST_CLASSES = ["sr-ss-with-panel", "sr-ss-panel-left-host", "sr-ss-panel-right-host"];

export class SidePanelLayout implements SpeedStreakLayoutView {
    readonly root: HTMLElement;
    readonly sceneHost: HTMLElement;
    readonly sceneSize = "large" as const;

    private timer: TimerRing;
    private pips: BoostPips;
    private boostBlock: HTMLElement;
    private boostFill: HTMLElement;
    private boostText: HTMLElement;
    private bestLabel: HTMLElement;
    private bestBtn: HTMLButtonElement;
    private bestValueEl: HTMLElement;
    private liveValue: HTMLElement;
    private liveBadge: HTMLElement;
    private scoreEl: HTMLElement;
    private recordBar: HTMLElement;
    private recordBarFill: HTMLElement;
    private recordBarText: HTMLElement;
    private listBlock: HTMLElement;
    private listTitle: HTMLElement;
    private list: HTMLElement;
    private lastRuns: ListedRun[] | null = null;
    private trail: RatingTrail;
    private toastView: Toast;
    private pauseBtn: HTMLButtonElement;
    private boostBtn: HTMLButtonElement;
    private boostBtnLabel: HTMLElement;
    private collapseBtn: HTMLButtonElement;
    private miniTimer: HTMLElement;
    private miniStreak: HTMLElement;
    private miniPause: HTMLButtonElement;

    constructor(
        private hostEl: HTMLElement,
        readonly kind: "side-left" | "side-right",
        collapsed: boolean,
        private callbacks: LayoutCallbacks,
    ) {
        const side = kind === "side-left" ? "left" : "right";
        hostEl.addClass("sr-ss-with-panel", `sr-ss-panel-${side}-host`);
        this.root = hostEl.createDiv({ cls: `sr-ss-hud sr-ss-panel sr-ss-panel-${side}` });

        // Collapse / expand (top corner, 44 px)
        this.collapseBtn = this.root.createEl("button", {
            cls: "sr-ss-panel-collapse clickable-icon",
        });
        this.collapseBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.callbacks.toggleCollapsed();
        });

        // Narrow strip shown when collapsed
        const mini = this.root.createDiv({ cls: "sr-ss-panel-mini" });
        this.miniTimer = mini.createDiv({ cls: "sr-ss-mini-timer" });
        this.miniStreak = mini.createDiv({ cls: "sr-ss-mini-streak" });
        this.miniPause = mini.createEl("button", { cls: "sr-ss-panel-btn clickable-icon" });
        this.miniPause.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.callbacks.togglePause();
        });

        const body = this.root.createDiv({ cls: "sr-ss-panel-body" });

        // Timer
        this.timer = new TimerRing(body, "sr-ss-panel-timer", 50);
        this.timer.root.setAttr("role", "button");
        this.timer.root.addEventListener("click", () => this.callbacks.togglePause());
        this.toastView = new Toast(body);

        // Boosts
        this.boostBlock = body.createDiv({ cls: "sr-ss-panel-boosts" });
        this.pips = new BoostPips(this.boostBlock, "bolts");
        const track = this.boostBlock.createDiv({ cls: "sr-ss-panel-progress" });
        this.boostFill = track.createDiv({ cls: "sr-ss-panel-progress-fill" });
        this.boostText = this.boostBlock.createDiv({ cls: "sr-ss-panel-caption" });

        // Record + live streak
        const records = body.createDiv({ cls: "sr-ss-panel-records" });
        this.bestBtn = records.createEl("button", { cls: "sr-ss-panel-best" });
        this.bestBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.callbacks.openRun(null);
        });
        this.bestLabel = this.bestBtn.createDiv({ cls: "sr-ss-panel-label" });
        const bestValue = this.bestBtn.createDiv({ cls: "sr-ss-panel-best-value" });
        records.createDiv({ cls: "sr-ss-panel-divider" });
        const live = records.createDiv({ cls: "sr-ss-panel-live" });
        live.createDiv({ cls: "sr-ss-panel-label", text: ss("LIVE") });
        this.liveValue = live.createDiv({ cls: "sr-ss-panel-live-value" });
        this.liveBadge = live.createDiv({ cls: "sr-ss-badge" });
        this.bestValueEl = bestValue;
        this.scoreEl = body.createDiv({ cls: "sr-ss-score" });

        // Streak bar
        this.recordBar = body.createDiv({ cls: "sr-ss-panel-recbar" });
        const barTrack = this.recordBar.createDiv({ cls: "sr-ss-panel-progress" });
        this.recordBarFill = barTrack.createDiv({ cls: "sr-ss-panel-progress-fill is-record" });
        this.recordBarText = this.recordBar.createDiv({ cls: "sr-ss-panel-caption" });

        // Top 5
        this.listBlock = body.createDiv({ cls: "sr-ss-panel-list" });
        this.listTitle = this.listBlock.createDiv({ cls: "sr-ss-panel-label" });
        this.list = this.listBlock.createDiv({ cls: "sr-ss-panel-rows" });

        this.trail = new RatingTrail(body);

        // Scene
        this.sceneHost = body.createDiv({ cls: "sr-ss-scene sr-ss-scene-large" });

        // Bottom buttons
        const bottom = this.root.createDiv({ cls: "sr-ss-panel-bottom" });
        this.pauseBtn = bottom.createEl("button", { cls: "sr-ss-panel-btn clickable-icon" });
        this.pauseBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.callbacks.togglePause();
        });
        this.boostBtn = bottom.createEl("button", { cls: "sr-ss-panel-boost-btn" });
        const boostIcon = this.boostBtn.createSpan({ cls: "sr-ss-boost-icon" });
        setIcon(boostIcon, "fast-forward");
        this.boostBtnLabel = this.boostBtn.createSpan();
        this.boostBtn.addEventListener("click", (ev) => {
            ev.preventDefault();
            this.callbacks.useBoost();
        });

        this.setCollapsed(collapsed);

        // Fit to the panel height: smaller timer / shorter list on low screens
        if (typeof ResizeObserver !== "undefined") {
            this.fitObserver = new ResizeObserver(() => this.fit());
            this.fitObserver.observe(this.root);
        }
    }

    private fitObserver: ResizeObserver | null = null;

    /** Keeps room for the scene: "short" = compact timer + top 3, "tiny" = no list. */
    private fit() {
        const h = this.root.clientHeight;
        this.root.toggleClass("is-short", h > 0 && h < 820);
        this.root.toggleClass("is-tiny", h > 0 && h < 640);
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
        if (r.dataset.timeColor !== vm.timeColor) {
            r.dataset.timeColor = vm.timeColor;
            r.setCssProps({ "--sr-ss-time-color": vm.timeColor });
        }

        this.timer.render(vm.fraction, vm.timerText, vm.phaseLabel, vm.phaseTitle);
        setAttrIfChanged(this.timer.root, "aria-label", vm.pauseTooltip);
        setTextIfChanged(this.miniTimer, vm.timerText);
        setTextIfChanged(this.miniStreak, String(vm.streak));

        // Boosts
        this.boostBlock.toggleClass("sr-is-hidden", !vm.boostMode);
        this.boostBtn.toggleClass("sr-is-hidden", !vm.boostMode);
        if (vm.boostMode) {
            this.pips.render(vm.charges, vm.maxCharges);
            setTransformIfChanged(this.boostFill, `scaleX(${vm.boostProgress.toFixed(3)})`);
            setTextIfChanged(this.boostText, vm.boostProgressText);
            setTextIfChanged(this.boostBtnLabel, vm.boostLabel);
            this.boostBtn.disabled = vm.boostDisabled;
            setAttrIfChanged(this.boostBtn, "aria-label", vm.boostTooltip);
        }

        // Records
        setTextIfChanged(this.bestLabel, vm.recordLabel);
        setTextIfChanged(this.bestValueEl, String(vm.recordValue));
        setTextIfChanged(this.liveValue, String(vm.streak));
        setTextIfChanged(
            this.liveBadge,
            vm.liveBadge === "pure" ? ss("PURE_BADGE") : ss("BREAKS_BADGE"),
        );
        this.liveBadge.toggleClass("is-pure", vm.liveBadge === "pure");
        setTextIfChanged(this.scoreEl, vm.scoreText);
        this.scoreEl.toggleClass("sr-is-hidden", vm.scoreText === "");

        this.recordBar.toggleClass("sr-is-hidden", vm.recordsView !== "bar");
        setTransformIfChanged(this.recordBarFill, `scaleX(${vm.recordProgress.toFixed(3)})`);
        setTextIfChanged(this.recordBarText, vm.recordBarText);

        this.listBlock.toggleClass("sr-is-hidden", vm.recordsView !== "top5");
        if (vm.recordsView === "top5") {
            setTextIfChanged(this.listTitle, vm.listTitle);
            if (vm.listedRuns !== this.lastRuns) this.renderList(vm.listedRuns);
        }
        this.trail.render(vm.trail, vm.showTrail);

        // Buttons
        setIconIfChanged(this.pauseBtn, vm.pauseIcon);
        setIconIfChanged(this.miniPause, vm.pauseIcon);
        this.pauseBtn.toggleClass("sr-is-hidden", vm.pauseHidden);
        this.miniPause.toggleClass("sr-is-hidden", vm.pauseHidden);
        setAttrIfChanged(this.pauseBtn, "aria-label", vm.pauseTooltip);
        setAttrIfChanged(this.miniPause, "aria-label", vm.pauseTooltip);
    }

    private renderList(runs: ListedRun[]) {
        this.lastRuns = runs;
        this.list.empty();
        if (runs.length === 0) {
            this.list.createDiv({ cls: "sr-ss-panel-empty", text: ss("RECORDS_EMPTY") });
            return;
        }
        for (const item of runs) {
            const row = this.list.createEl("button", { cls: "sr-ss-panel-row" });
            row.createSpan({ cls: "sr-ss-row-rank", text: `#${item.rank}` });
            row.createSpan({ cls: "sr-ss-row-date", text: item.date });
            row.createSpan({
                cls: `sr-ss-badge ${item.badge === "pure" ? "is-pure" : ""}`,
                text: item.badge === "pure" ? ss("PURE_BADGE") : ss("BREAKS_BADGE"),
            });
            row.createSpan({ cls: "sr-ss-row-streak", text: String(item.run.streak) });
            row.addEventListener("click", (ev) => {
                ev.preventDefault();
                this.callbacks.openRun(item.run);
            });
        }
    }

    toast(text: string, kind: ToastKind) {
        this.toastView.show(text, kind);
    }

    pulse(cls: string) {
        pulseClass(this.root, cls);
    }

    setCollapsed(collapsed: boolean) {
        this.root.toggleClass("is-collapsed", collapsed);
        this.hostEl.toggleClass("sr-ss-panel-collapsed", collapsed);
        const towardsEdge = this.kind === "side-right" ? "chevrons-right" : "chevrons-left";
        const awayFromEdge = this.kind === "side-right" ? "chevrons-left" : "chevrons-right";
        setIconIfChanged(this.collapseBtn, collapsed ? awayFromEdge : towardsEdge);
        this.collapseBtn.setAttr("aria-label", collapsed ? ss("EXPAND") : ss("COLLAPSE"));
    }

    destroy() {
        this.fitObserver?.disconnect();
        this.toastView.destroy();
        this.root.remove();
        this.hostEl.removeClass(...HOST_CLASSES, "sr-ss-panel-collapsed");
    }
}
