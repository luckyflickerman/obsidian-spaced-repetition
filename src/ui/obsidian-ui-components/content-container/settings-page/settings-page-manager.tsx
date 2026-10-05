// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from "vhtml";

import { DataManager } from "src/data/data-manager";
import { SettingsManager } from "src/data/settings-manager";
import SRPlugin from "src/main";
import { CardAuthoringPage } from "src/ui/obsidian-ui-components/content-container/settings-page/card-authoring-page";
import { DailyGoalPage } from "src/ui/obsidian-ui-components/content-container/settings-page/daily-goal-page";
import { DataPage } from "src/ui/obsidian-ui-components/content-container/settings-page/data-page";
import { FlashcardsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/flashcards-page";
import { HeatmapPage } from "src/ui/obsidian-ui-components/content-container/settings-page/heatmap-page";
import { MainPage } from "src/ui/obsidian-ui-components/content-container/settings-page/main-page";
import { NotesPage } from "src/ui/obsidian-ui-components/content-container/settings-page/notes-page";
import { SchedulingPage } from "src/ui/obsidian-ui-components/content-container/settings-page/scheduling-page";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import {
    getPageIcon,
    getPageName,
    SettingsPageType,
    SettingsPageTypesArray,
} from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-types";
import { SpeedStreakPage } from "src/ui/obsidian-ui-components/content-container/settings-page/speed-streak-page";
import { StatisticsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/statistics-page/statistics-page";
import { TtsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/tts-page";
import { UIPreferencesPage } from "src/ui/obsidian-ui-components/content-container/settings-page/ui-preferences-page";
import { UIManager } from "src/ui/ui-manager";

export { getPageIcon, getPageName, SettingsPageTypesArray };
export type { SettingsPageType };

/** Everything a settings page needs, wherever it is shown (Settings tab or the Options window). */
export interface SettingsPageContext {
    plugin: SRPlugin;
    uiManager: UIManager;
    settingsManager: SettingsManager;
    dataManager: DataManager;
    applySettingsUpdate: (callback: () => unknown) => void;
    display: () => void;
    openPage: (pageType: SettingsPageType) => void;
    scrollListener: (scrollPosition: number) => void;
    didReadMultilineEndMarkerWarning: boolean;
    changeMultilineEndMarkerWarningState: (didReadMultilineEndMarkerWarning: boolean) => void;
}

/** Creates one settings page (hidden; call `show()`). */
export function createSettingsPage(
    pageType: SettingsPageType,
    containerEl: HTMLElement,
    ctx: SettingsPageContext,
): SettingsPage {
    const common = [
        containerEl,
        ctx.plugin,
        ctx.settingsManager,
        ctx.dataManager,
        pageType,
        ctx.applySettingsUpdate,
        ctx.display,
        ctx.openPage,
        ctx.scrollListener,
    ] as const;
    switch (pageType) {
        case "main-page":
            return new MainPage(
                containerEl,
                ctx.plugin,
                ctx.settingsManager,
                ctx.dataManager,
                pageType,
                ctx.display,
                ctx.openPage,
                ctx.scrollListener,
            );
        case "flashcards-page":
            return new FlashcardsPage(
                containerEl,
                ctx.plugin,
                ctx.settingsManager,
                ctx.dataManager,
                pageType,
                ctx.didReadMultilineEndMarkerWarning,
                ctx.applySettingsUpdate,
                ctx.display,
                ctx.openPage,
                ctx.scrollListener,
                ctx.changeMultilineEndMarkerWarningState,
            );
        case "speed-streak-page":
            return new SpeedStreakPage(...common);
        case "card-authoring-page":
            return new CardAuthoringPage(...common);
        case "daily-goal-page":
            return new DailyGoalPage(...common);
        case "heatmap-page":
            return new HeatmapPage(...common);
        case "tts-page":
            return new TtsPage(...common);
        case "notes-page":
            return new NotesPage(...common);
        case "scheduling-page":
            return new SchedulingPage(...common);
        case "ui-preferences-page":
            return new UIPreferencesPage(
                containerEl,
                ctx.plugin,
                ctx.settingsManager,
                ctx.dataManager,
                ctx.uiManager,
                pageType,
                ctx.applySettingsUpdate,
                ctx.display,
                ctx.openPage,
                ctx.scrollListener,
            );
        case "data-page":
            return new DataPage(...common);
        case "statistics-page":
            return new StatisticsPage(
                containerEl,
                ctx.plugin,
                ctx.settingsManager,
                ctx.dataManager,
                pageType,
                ctx.openPage,
                ctx.scrollListener,
            );
    }
}

/**
 * Represents a settings page manager.
 *
 * @class SettingsPageManager
 */
export class SettingsPageManager {
    private containerEl: HTMLElement;
    private plugin: SRPlugin;
    private settingsManager: SettingsManager;
    private dataManager: DataManager;
    private uiManager: UIManager;
    private pages: SettingsPage[] = [];
    private applyDebounceTimer: number = 0;
    private currentPage: SettingsPageType;
    private updateLastPageState: (lastPage: SettingsPageType, lastScrollPosition: number) => void;
    private display: () => void;
    private didReadMultilineEndMarkerWarning: boolean;
    private changeMultilineEndMarkerWarningState: (
        didReadMultilineEndMarkerWarning: boolean,
    ) => void;

    constructor(
        containerEl: HTMLElement,
        plugin: SRPlugin,
        uiManager: UIManager,
        settingsManager: SettingsManager,
        lastPage: SettingsPageType,
        lastScrollPosition: number,
        didReadMultilineEndMarkerWarning: boolean,
        updateLastPageState: (lastPage: SettingsPageType, lastScrollPosition: number) => void,
        display: () => void,
        changeMultilineEndMarkerWarningState: (didReadMultilineEndMarkerWarning: boolean) => void,
    ) {
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.dataManager = plugin.dataManager;
        this.uiManager = uiManager;
        this.settingsManager = settingsManager;
        this.didReadMultilineEndMarkerWarning = didReadMultilineEndMarkerWarning;
        this.changeMultilineEndMarkerWarningState = changeMultilineEndMarkerWarningState;
        this.updateLastPageState = updateLastPageState;
        this.display = display;

        this.createPages();
        this.currentPage = lastPage;
        this.pages[this.getPageIndex(this.currentPage)].show();
        this.pages[this.getPageIndex(this.currentPage)].scrollTo(lastScrollPosition);
    }

    /**
     * Destroys the SettingsPageManager and all its pages.
     */
    destroy() {
        this.pages.forEach((page) => page.destroy && page.destroy());
    }

    /**
     * Renders the SettingsPageManager.
     */
    render() {
        this.pages.forEach((page) => page.render && page.render());
    }

    // https://github.com/mgmeyers/obsidian-kanban/blob/main/src/Settings.ts
    private applySettingsUpdate(callback: () => unknown): void {
        window.clearTimeout(this.applyDebounceTimer);
        this.applyDebounceTimer = window.setTimeout(callback, 512);
    }

    private createPages() {
        this.containerEl.empty();
        const ctx: SettingsPageContext = {
            plugin: this.plugin,
            uiManager: this.uiManager,
            settingsManager: this.settingsManager,
            dataManager: this.dataManager,
            applySettingsUpdate: this.applySettingsUpdate.bind(this),
            display: this.display,
            openPage: this.openPage.bind(this),
            scrollListener: this.scrollListener.bind(this),
            didReadMultilineEndMarkerWarning: this.didReadMultilineEndMarkerWarning,
            changeMultilineEndMarkerWarningState: this.changeMultilineEndMarkerWarningState,
        };
        for (const pageType of SettingsPageTypesArray) {
            this.pages.push(createSettingsPage(pageType, this.containerEl.createDiv(), ctx));
        }
    }

    private scrollListener(scrollPosition: number): void {
        this.updateLastPageState(this.currentPage, scrollPosition);
    }

    private getPageIndex(pageType: SettingsPageType): number {
        return this.pages.findIndex((page) => page.getPageType() === pageType);
    }

    private openPage(pageType: SettingsPageType): void {
        if (this.currentPage === pageType) return;
        this.pages[this.getPageIndex(this.currentPage)].hide();

        this.currentPage = pageType;
        this.updateLastPageState(this.currentPage, 0);
        this.pages[this.getPageIndex(this.currentPage)].show();
    }
}
