import "src/ui/obsidian-ui-components/content-container/deck-container/deck-container.css";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from "vhtml";

import { Deck } from "src/data/data-structures/deck/deck";
import { SRSettings } from "src/data/settings";
import { getHeatmapSettings, HeatmapView } from "src/heatmap/heatmap-view";
import type SRPlugin from "src/main";
import type { ReviewWindowControls } from "src/review-window/review-window-controller";
import {
    FlashcardReviewMode,
    IFlashcardReviewSequencer as IFlashcardReviewSequencer,
} from "src/scheduling/flashcard-review-sequencer";
import DeckListComponent from "src/ui/obsidian-ui-components/content-container/deck-container/deck-list";
import DeckListHeaderComponent from "src/ui/obsidian-ui-components/content-container/deck-container/deck-list-header";
import { AddonsModal } from "src/ui/obsidian-ui-components/modals/addons-modal";

export class DeckContainer {
    private containerEl: HTMLDivElement;
    private deckList: DeckListComponent;
    private deckListHeader: DeckListHeaderComponent;
    private plugin: SRPlugin;
    private heatmap: HeatmapView;
    private lastReviewSequencer: IFlashcardReviewSequencer | null = null;

    constructor(
        parentEl: HTMLElement,
        plugin: SRPlugin,
        changeReviewMode: (reviewMode: FlashcardReviewMode) => void,
        startReviewOfDeck: (deck: Deck) => void,
        closeModal?: () => void,
        windowControls?: ReviewWindowControls,
    ) {
        this.plugin = plugin;
        // Build ui
        this.containerEl = parentEl.createDiv();
        this.containerEl.addClasses(["sr-container", "sr-deck-container", "sr-is-hidden"]);

        this.deckListHeader = new DeckListHeaderComponent(
            this.containerEl,
            changeReviewMode,
            closeModal,
            () => new AddonsModal(plugin, () => this.onAddonsChanged()).open(),
            windowControls,
        );

        this.deckList = new DeckListComponent(this.containerEl, startReviewOfDeck);

        // Review calendar below the deck tree
        this.heatmap = new HeatmapView(this.deckList.contentEl, plugin);
    }

    /** Add-on switched on/off or its settings changed: redraw what depends on it. */
    private onAddonsChanged() {
        if (this.lastReviewSequencer) this.redrawHeatmap(this.lastReviewSequencer);
    }

    private redrawHeatmap(reviewSequencer: IFlashcardReviewSequencer) {
        this.lastReviewSequencer = reviewSequencer;
        try {
            const visible = getHeatmapSettings(this.plugin).showInDeckList;
            this.heatmap.show(visible);
            if (!visible) return;
            const stats = reviewSequencer.getDeckStats(
                reviewSequencer.originalDeckTree.getTopicPath(),
            );
            this.heatmap.render({
                due: stats.dueCount,
                newCards: stats.newCount,
                total: stats.totalCount,
            });
        } catch (e) {
            console.error("[Review calendar] could not render", e);
        }
    }

    /**
     * Shows the DeckListView & rerenders dynamic elements
     */
    showList(
        reviewSequencer: IFlashcardReviewSequencer,
        settings: SRSettings,
        reviewMode: FlashcardReviewMode,
    ) {
        // Redraw in case the stats have changed
        this.deckListHeader.updateReviewMode(reviewMode);

        this.deckList.redraw(reviewSequencer, settings);
        this.redrawHeatmap(reviewSequencer);

        if (this.containerEl.hasClass("sr-is-hidden")) {
            this.containerEl.removeClass("sr-is-hidden");
        }
    }

    /**
     * Hides the DeckListView
     */
    closeList() {
        if (!this.containerEl.hasClass("sr-is-hidden")) {
            this.containerEl.addClass("sr-is-hidden");
        }
    }

    redrawWithNewData(reviewSequencer: IFlashcardReviewSequencer, settings: SRSettings) {
        this.deckList.redraw(reviewSequencer, settings);
        this.redrawHeatmap(reviewSequencer);
    }
}
