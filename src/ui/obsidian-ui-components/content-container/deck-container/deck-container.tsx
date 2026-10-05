import "src/ui/obsidian-ui-components/content-container/deck-container/deck-container.css";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import h from "vhtml";

import { DailyGoalView } from "src/card-authoring/daily-goal-view";
import { Deck } from "src/data/data-structures/deck/deck";
import { TopicPath } from "src/data/data-structures/deck/topic-path";
import { SRSettings } from "src/data/settings";
import { bestScore, bestTodayScore } from "src/endless/endless-records";
import { EndlessRecordsModal } from "src/endless/endless-records-modal";
import { cardsOfDecks } from "src/endless/endless-sequencer";
import { normalizeEndlessSettings, toggleDeck } from "src/endless/endless-settings";
import { getEndlessRecords } from "src/endless/endless-store";
import { getHeatmapSettings, HeatmapView } from "src/heatmap/heatmap-view";
import type SRPlugin from "src/main";
import type { ReviewWindowControls } from "src/review-window/review-window-controller";
import {
    FlashcardReviewMode,
    IFlashcardReviewSequencer as IFlashcardReviewSequencer,
} from "src/scheduling/flashcard-review-sequencer";
import DeckListComponent, {
    EndlessSummary,
} from "src/ui/obsidian-ui-components/content-container/deck-container/deck-list";
import DeckListHeaderComponent from "src/ui/obsidian-ui-components/content-container/deck-container/deck-list-header";
import { OptionsModal } from "src/ui/obsidian-ui-components/modals/options-modal";

export class DeckContainer {
    private containerEl: HTMLDivElement;
    private deckList: DeckListComponent;
    private deckListHeader: DeckListHeaderComponent;
    private plugin: SRPlugin;
    private heatmap: HeatmapView;
    private dailyGoal: DailyGoalView;
    private lastReviewSequencer: IFlashcardReviewSequencer | null = null;
    private reviewMode: FlashcardReviewMode = FlashcardReviewMode.Review;
    private startEndless: (decks: Deck[]) => void;
    private endlessSummary: EndlessSummary | null = null;

    constructor(
        parentEl: HTMLElement,
        plugin: SRPlugin,
        changeReviewMode: (reviewMode: FlashcardReviewMode) => void,
        startReviewOfDeck: (deck: Deck) => void,
        startEndless: (decks: Deck[]) => void,
        closeModal?: () => void,
        windowControls?: ReviewWindowControls,
    ) {
        this.plugin = plugin;
        this.startEndless = startEndless;
        // Build ui
        this.containerEl = parentEl.createDiv();
        this.containerEl.addClasses(["sr-container", "sr-deck-container", "sr-is-hidden"]);

        this.deckListHeader = new DeckListHeaderComponent(
            this.containerEl,
            changeReviewMode,
            closeModal,
            () => new OptionsModal(plugin, () => this.onAddonsChanged()).open(),
            windowControls,
        );

        this.deckList = new DeckListComponent(this.containerEl, startReviewOfDeck);

        // Daily goal of new cards, then the review calendar below the deck tree
        this.dailyGoal = new DailyGoalView(this.deckList.contentEl, plugin);
        this.heatmap = new HeatmapView(this.deckList.contentEl, plugin);
    }

    /** Add-on switched on/off or its settings changed: redraw what depends on it. */
    private onAddonsChanged() {
        this.dailyGoal.render();
        if (this.lastReviewSequencer) this.redrawHeatmap(this.lastReviewSequencer);
    }

    private redrawHeatmap(reviewSequencer: IFlashcardReviewSequencer) {
        this.lastReviewSequencer = reviewSequencer;
        this.dailyGoal.render();
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
        this.reviewMode = reviewMode;
        this.deckListHeader.updateReviewMode(reviewMode);

        this.redrawDecks(reviewSequencer, settings);
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
        this.redrawDecks(reviewSequencer, settings);
        this.redrawHeatmap(reviewSequencer);
    }

    /** Summary of the Endless session that just ended (shown above the decks). */
    setEndlessSummary(summary: EndlessSummary | null) {
        this.endlessSummary = summary;
    }

    /** The deck tree; in Endless mode with tick boxes and the start bar. */
    private redrawDecks(reviewSequencer: IFlashcardReviewSequencer, settings: SRSettings) {
        if (this.reviewMode !== FlashcardReviewMode.Endless) {
            this.deckList.redraw(reviewSequencer, settings);
            return;
        }
        const tree = reviewSequencer.originalDeckTree;
        const endless = normalizeEndlessSettings(settings.endless);
        const decks = this.selectedDecks(tree, endless.selectedDecks);
        const records = getEndlessRecords(this.plugin);
        this.deckList.redraw(reviewSequencer, settings, {
            selected: endless.selectedDecks,
            cardCount: cardsOfDecks(decks).length,
            best: bestScore(records),
            today: bestTodayScore(records, Date.now()),
            summary: this.endlessSummary,
            openRecords: () => new EndlessRecordsModal(this.plugin.app, records).open(),
            toggle: (key) => {
                settings.endless = {
                    ...endless,
                    selectedDecks: toggleDeck(endless.selectedDecks, key),
                };
                void this.plugin.dataManager.settingsManager.save();
                this.redrawDecks(reviewSequencer, settings);
            },
            start: () => this.startEndless(decks),
        });
    }

    /** Ticked decks that still exist (a renamed tag is simply skipped). */
    private selectedDecks(tree: Deck, keys: string[]): Deck[] {
        const decks: Deck[] = [];
        for (const key of keys) {
            const deck = tree.getDeck(new TopicPath(key === "" ? [] : key.split("/")));
            if (deck) decks.push(deck);
        }
        return decks;
    }
}
