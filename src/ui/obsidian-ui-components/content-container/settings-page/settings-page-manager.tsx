// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from "vhtml";

import { DataManager } from "src/data/data-manager";
import { SettingsManager } from "src/data/settings-manager";
import SRPlugin from "src/main";
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
    private applySettingsUpdate(callback: () => void): void {
        window.clearTimeout(this.applyDebounceTimer);
        this.applyDebounceTimer = window.setTimeout(callback, 512);
    }

    private createPages() {
        this.containerEl.empty();
        for (const pageType of SettingsPageTypesArray) {
            const newPageContainerEl = this.containerEl.createDiv();
            switch (pageType) {
                case "main-page":
                    this.pages.push(
                        new MainPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            pageType,
                            this.display,
                            this.openPage.bind(this),
                            this.scrollListener.bind(this),
                        ),
                    );
                    break;
                case "flashcards-page":
                    this.pages.push(
                        new FlashcardsPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            pageType,
                            this.didReadMultilineEndMarkerWarning,
                            this.applySettingsUpdate.bind(this),
                            this.display,
                            this.openPage.bind(this),
                            this.scrollListener.bind(this),
                            this.changeMultilineEndMarkerWarningState.bind(this),
                        ),
                    );
                    break;
                case "speed-streak-page":
                    this.pages.push(
                        new SpeedStreakPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            pageType,
                            this.applySettingsUpdate.bind(this),
                            this.display,
                            this.openPage.bind(this),
                            this.scrollListener.bind(this),
                        ),
                    );
                    break;
                case "heatmap-page":
                    this.pages.push(
                        new HeatmapPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            pageType,
                            this.applySettingsUpdate.bind(this),
                            this.display,
                            this.openPage.bind(this),
                            this.scrollListener.bind(this),
                        ),
                    );
                    break;
                case "tts-page":
                    this.pages.push(
                        new TtsPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            pageType,
                            this.applySettingsUpdate.bind(this),
                            this.display,
                            this.openPage.bind(this),
                            this.scrollListener.bind(this),
                        ),
                    );
                    break;
                case "notes-page":
                    this.pages.push(
                        new NotesPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            pageType,
                            this.applySettingsUpdate.bind(this),
                            this.display,
                            this.openPage.bind(this),
                            this.scrollListener.bind(this),
                        ),
                    );
                    break;
                case "scheduling-page":
                    this.pages.push(
                        new SchedulingPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            pageType,
                            (callback: () => unknown) => {
                                this.applySettingsUpdate(callback);
                            },
                            this.display,
                            (pageType: SettingsPageType) => {
                                this.openPage(pageType);
                            },
                            this.scrollListener.bind(this),
                        ),
                    );
                    break;
                case "ui-preferences-page":
                    this.pages.push(
                        new UIPreferencesPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            this.uiManager,
                            pageType,
                            this.applySettingsUpdate.bind(this),
                            this.display,
                            this.openPage.bind(this),
                            this.scrollListener.bind(this),
                        ),
                    );
                    break;
                case "data-page":
                    this.pages.push(
                        new DataPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            pageType,
                            this.applySettingsUpdate.bind(this),
                            this.display,
                            this.openPage.bind(this),
                            this.scrollListener.bind(this),
                        ),
                    );
                    break;
                case "statistics-page":
                    this.pages.push(
                        new StatisticsPage(
                            newPageContainerEl,
                            this.plugin,
                            this.settingsManager,
                            this.dataManager,
                            pageType,
                            this.openPage.bind(this),
                            this.scrollListener.bind(this),
                        ),
                    );
                    break;
            }
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
