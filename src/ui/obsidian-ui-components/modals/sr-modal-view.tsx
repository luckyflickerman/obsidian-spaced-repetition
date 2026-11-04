import "src/ui/obsidian-ui-components/modals/modal-view.css";
import { App, Modal, Platform } from "obsidian";

import { SettingsManager } from "src/data/settings-manager";
import type SRPlugin from "src/main";
import { ReviewWindowController } from "src/review-window/review-window-controller";
import ContentManager from "src/ui/obsidian-ui-components/content-container/content-manager";
import { ReviewQueueLoader } from "src/ui/review-queue-loader";
import EmulatedPlatform from "src/utils/platform-detector";

export class SRModalView extends Modal {
    private contentManager: ContentManager;
    private plugin: SRPlugin;
    private settingsManager: SettingsManager;
    private resizeObserver: ResizeObserver | null = null;
    private saveSizeTimer: number | null = null;
    private windowController: ReviewWindowController;

    constructor(
        app: App,
        plugin: SRPlugin,
        settingsManager: SettingsManager,
        reviewQueueLoader: ReviewQueueLoader,
    ) {
        super(app);
        this.plugin = plugin;
        this.settingsManager = settingsManager;

        // Setup base containers
        if (Platform.isMobile || EmulatedPlatform().isMobile) {
            this.setModalSize(
                this.settingsManager.settings.flashcardHeightPercentageMobile,
                this.settingsManager.settings.flashcardWidthPercentageMobile,
            );
        } else {
            this.setModalSize(
                this.settingsManager.settings.flashcardHeightPercentage,
                this.settingsManager.settings.flashcardWidthPercentage,
            );

            this.resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
                this.onResize(entries);
            });
            this.resizeObserver.observe(this.modalEl);
        }

        this.modalEl.setAttribute("id", "sr-modal-view");
        this.modalEl.addClass("sr-view");

        this.contentEl.addClass("sr-modal-content");

        // Full screen + moving the window by its header
        this.windowController = new ReviewWindowController(plugin, this.modalEl);

        // Init static elements in views
        this.contentManager = new ContentManager(
            app,
            plugin,
            reviewQueueLoader,
            this.settingsManager.settings,
            this.contentEl,
            () => {
                this.close();
            },
            this.windowController,
        );
        this.plugin.uiManager.setContentManager(this.contentManager);
    }

    onOpen(): void {
        this.windowController.attach();
        void this.contentManager.open();
    }

    onClose(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        if (this.saveSizeTimer !== null) {
            window.clearTimeout(this.saveSizeTimer);
            this.saveSizeTimer = null;
            void this.plugin.dataManager.savePluginData();
        }
        this.windowController.detach();
        this.contentManager.close();
    }

    private onResize(entries: ResizeObserverEntry[]) {
        // Full screen is temporary: keep the user's normal window size
        if (this.windowController.isFullscreen()) return;
        const modalEl = entries[0].target as HTMLElement;
        const parent = modalEl.parentElement;

        if (parent === null) return;

        const elementHeight = modalEl.offsetHeight;
        const parentHeight = parent.offsetHeight;
        const heightPercent = (elementHeight / parentHeight) * 100;

        const elementWidth = modalEl.offsetWidth;
        const parentWidth = parent.offsetWidth;
        const widthPercent = (elementWidth / parentWidth) * 100;

        this.setRoundedModalCorners(!(heightPercent >= 100 || widthPercent >= 100));

        this.saveSizeToSettings(
            heightPercent,
            widthPercent,
            Platform.isMobile || EmulatedPlatform().isMobile,
        );
    }

    private setRoundedModalCorners(rounded: boolean) {
        this.modalEl.setCssProps({ "border-Radius": rounded ? "var(--modal-radius)" : "0" });
    }

    private setModalSize(heightPercent: number, widthPercent: number) {
        this.modalEl.setCssProps({ height: heightPercent + "%" });
        this.modalEl.setCssProps({ width: widthPercent + "%" });

        this.setRoundedModalCorners(
            !(
                parseInt(this.modalEl.getCssPropertyValue("height").split("%")[0]) >= 100 ||
                parseInt(this.modalEl.getCssPropertyValue("width").split("%")[0]) >= 100
            ),
        );
    }

    /**
     * Remembers a size changed by the user (dragging the corner). Only a real change is saved,
     * and only once the dragging stops: the observer also fires when the window opens and while
     * Obsidian's window is resized, and every save used to rewrite data.json (synced to the
     * other devices, where it could overwrite their newer data).
     */
    private saveSizeToSettings(heightPercent: number, widthPercent: number, isMobile: boolean) {
        if (!Number.isFinite(heightPercent) || !Number.isFinite(widthPercent)) return;

        const settings = this.settingsManager.settings;
        const [oldHeight, oldWidth] = isMobile
            ? [settings.flashcardHeightPercentageMobile, settings.flashcardWidthPercentageMobile]
            : [settings.flashcardHeightPercentage, settings.flashcardWidthPercentage];
        if (Math.abs(oldHeight - heightPercent) < 0.5 && Math.abs(oldWidth - widthPercent) < 0.5)
            return;

        if (isMobile) {
            settings.flashcardHeightPercentageMobile = heightPercent;
            settings.flashcardWidthPercentageMobile = widthPercent;
        } else {
            settings.flashcardHeightPercentage = heightPercent;
            settings.flashcardWidthPercentage = widthPercent;
        }
        if (this.saveSizeTimer !== null) window.clearTimeout(this.saveSizeTimer);
        this.saveSizeTimer = window.setTimeout(() => {
            this.saveSizeTimer = null;
            void this.plugin.dataManager.savePluginData();
        }, 600);
    }
}
