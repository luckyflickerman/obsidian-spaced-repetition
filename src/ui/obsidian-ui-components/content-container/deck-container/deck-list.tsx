import "src/ui/obsidian-ui-components/content-container/deck-container/deck-list.css";
import "src/endless/endless.css";
import { setIcon } from "obsidian";

import { bg, bgCount } from "src/appearance/background-i18n";
import { Deck } from "src/data/data-structures/deck/deck";
import { SRSettings } from "src/data/settings";
import { en } from "src/endless/endless-i18n";
import { recordTrack } from "src/endless/endless-record-track";
import { deckKey, isDeckCovered } from "src/endless/endless-settings";
import { t } from "src/lang/helpers";
import { DeckStats, IFlashcardReviewSequencer } from "src/scheduling/flashcard-review-sequencer";

/** Summary of the Endless session that just ended. */
export interface EndlessSummary {
    bestScore: number;
    errors: number;
    ratings: number;
    /** New all-time record set in the session (0 = none) */
    newRecord: number;
}

/** Endless mode: decks are ticked instead of opened (src/endless/). */
export interface EndlessDeckSelection {
    selected: string[];
    /** Cards in the ticked decks */
    cardCount: number;
    /** Endless records: all-time best and today's best score */
    best: number;
    today: number;
    summary: EndlessSummary | null;
    openRecords(): void;
    toggle(key: string): void;
    start(): void;
}

export default class DeckListComponent {
    private scrollWrapper: HTMLDivElement;
    private content: HTMLDivElement;
    private treeContainer: HTMLDivElement;

    private treeHeaderRow: HTMLDivElement;
    private treeHeaderRowSelf: HTMLDivElement;
    private treeHeaderRowInner: HTMLDivElement;
    private treeHeaderRowText: HTMLDivElement;
    private treeHeaderRowTextSpan: HTMLSpanElement;
    private treeHeaderRowNumbersWrapper: HTMLDivElement;

    private dueCardsText: HTMLDivElement;
    private newCardsText: HTMLDivElement;
    private reviewedCardsText: HTMLDivElement;
    private totalCardsText: HTMLDivElement;

    private startReviewOfDeck: (deck: Deck) => void;
    private endless: EndlessDeckSelection | null = null;
    private endlessBar: HTMLDivElement;
    /** "14 cards waiting today" over the photo (phone with a background theme, background.css) */
    private duePill: HTMLDivElement;

    public constructor(parentEl: HTMLElement, startReviewOfDeck: (deck: Deck) => void) {
        this.startReviewOfDeck = startReviewOfDeck;
        // Prep main container
        this.scrollWrapper = parentEl.createDiv();
        this.scrollWrapper.addClass("sr-scroll-wrapper");

        this.duePill = this.scrollWrapper.createDiv({ cls: "usr-due-pill" });

        this.content = this.scrollWrapper.createDiv();
        this.content.addClass("sr-content");

        // Prep header row
        this.treeHeaderRow = this.content.createDiv();
        this.treeHeaderRow.addClass("sr-tree-row");
        this.treeHeaderRow.addClass("sr-header-row");
        this.treeHeaderRow.addClass("tree-item");
        this.treeHeaderRow.addClass("sr-tree-item-container");

        this.treeHeaderRowSelf = this.treeHeaderRow.createDiv();
        this.treeHeaderRowSelf.addClass("tree-item-self");
        this.treeHeaderRowSelf.addClass("sr-tree-item-row");

        this.treeHeaderRowInner = this.treeHeaderRowSelf.createDiv("tree-item-inner");
        this.treeHeaderRowText = this.treeHeaderRowInner.createDiv("tag-pane-tag-text");
        this.treeHeaderRowTextSpan = this.treeHeaderRowText.createSpan("tag-pane-tag-self");
        this.treeHeaderRowTextSpan.addClass("sr-tree-row-text");
        this.treeHeaderRowTextSpan.setText(t("DECK_TITLE"));

        this.treeHeaderRowNumbersWrapper = this.treeHeaderRowSelf.createDiv();
        this.treeHeaderRowNumbersWrapper.addClasses([
            "tree-item-flair-outer",
            "sr-tree-stats-container",
        ]);
        this.treeHeaderRowNumbersWrapper.addClass("sr-tree-row-numbers-wrapper");
        this.treeHeaderRowNumbersWrapper.addClass("sr-tree-stats-container");

        this.dueCardsText = this.treeHeaderRowNumbersWrapper.createDiv();
        this.dueCardsText.addClass("sr-tree-numbers-text");
        this.dueCardsText.addClasses([
            "tag-pane-tag-count",
            "tree-item-flair",
            "sr-tree-stats-count",
            "sr-fg-green",
        ]);
        this.dueCardsText.setText(t("DUE"));

        this.newCardsText = this.treeHeaderRowNumbersWrapper.createDiv();
        this.newCardsText.addClass("sr-tree-numbers-text");
        this.newCardsText.addClasses([
            "tag-pane-tag-count",
            "tree-item-flair",
            "sr-tree-stats-count",
            "sr-fg-blue",
        ]);
        this.newCardsText.setText(t("NEW"));

        this.reviewedCardsText = this.treeHeaderRowNumbersWrapper.createDiv();
        this.reviewedCardsText.addClass("sr-tree-numbers-text");
        this.reviewedCardsText.addClasses([
            "tag-pane-tag-count",
            "tree-item-flair",
            "sr-tree-stats-count",
            "sr-fg-yellow",
        ]);
        this.reviewedCardsText.setText(t("SEEN"));

        this.totalCardsText = this.treeHeaderRowNumbersWrapper.createDiv();
        this.totalCardsText.addClass("sr-tree-numbers-text");
        this.totalCardsText.addClasses([
            "tag-pane-tag-count",
            "tree-item-flair",
            "sr-tree-stats-count",
            "sr-fg-red",
        ]);
        this.totalCardsText.setText(t("TOTAL"));

        // Endless: hint and start button above the decks
        this.endlessBar = this.content.createDiv("sr-endless-bar sr-is-hidden");

        // Prep tree container
        this.treeContainer = this.content.createDiv("sr-tree-container");
    }

    /** Scrollable content (the review calendar is added below the tree). */
    get contentEl(): HTMLDivElement {
        return this.content;
    }

    /**
     * Redraws the deck list.
     * @param startReviewOfDeck - Callback for starting the review of a deck.
     * @param settings - The settings object.
     * @param reviewSequencer - The review sequencer object.
     */
    redraw(
        reviewSequencer: IFlashcardReviewSequencer,
        settings: SRSettings,
        endless: EndlessDeckSelection | null = null,
    ) {
        this.endless = endless;
        this.treeContainer.empty();
        this.treeContainer.toggleClass("is-endless", endless !== null);
        this._drawEndlessBar();

        const originDeckStats = reviewSequencer.getDeckStats(
            reviewSequencer.originalDeckTree.getTopicPath(),
        );

        this.duePill.setText(
            originDeckStats.dueCount > 0
                ? bgCount("DUE_WAITING", originDeckStats.dueCount)
                : bg("ALL_DONE"),
        );
        this.duePill.toggleClass("is-done", originDeckStats.dueCount === 0);

        if (originDeckStats.totalCount === 0) {
            const noDecksToReviewEl = this.treeContainer.createDiv();
            noDecksToReviewEl.addClass("sr-no-decks-to-review");
            noDecksToReviewEl.setText(t("NO_DECKS_TO_REVIEW"));
            return;
        }

        // Creates the "All Decks" row
        this._crateTreeRow(
            t("ALL_DECKS"),
            originDeckStats,
            0,
            this.treeContainer,
            false,
            reviewSequencer.originalDeckTree,
            this.startReviewOfDeck,
        );

        for (const subdeck of reviewSequencer.originalDeckTree.subdecks) {
            // Create the tree row for each deck
            this._createTree(
                subdeck,
                this.treeContainer,
                reviewSequencer,
                settings,
                this.startReviewOfDeck,
            );
        }
    }

    private _createTree(
        deck: Deck,
        parentEl: HTMLDivElement,
        reviewSequencer: IFlashcardReviewSequencer,
        settings: SRSettings,
        startReviewOfDeck: (deck: Deck) => void,
    ) {
        const deckStats = reviewSequencer.getDeckStats(deck.getTopicPath());

        // Create the tree row for the deck
        const treeRowChildren = this._crateTreeRow(
            deck.deckName,
            deckStats,
            deck.subdecks.length,
            parentEl,
            settings.initiallyExpandAllSubdecksInTree,
            deck,
            startReviewOfDeck,
        );

        for (const subdeck of deck.subdecks) {
            // Create the tree row for each subdeck
            this._createTree(
                subdeck,
                treeRowChildren,
                reviewSequencer,
                settings,
                startReviewOfDeck,
            );
        }
    }

    private _crateTreeRow(
        deckName: string,
        deckStats: DeckStats,
        numOfSubdecks: number,
        parentEl: HTMLDivElement,
        initiallyExpanded: boolean = false,
        deck: Deck | null = null,
        startReviewOfDeck: (deck: Deck) => void = () => {},
    ): HTMLDivElement {
        const disableInteraction = deck === null;
        const treeRow = parentEl.createDiv();
        treeRow.addClass("sr-tree-row");
        treeRow.addClass("tree-item");
        treeRow.addClass("sr-tree-item-container");

        const treeRowSelf = treeRow.createDiv();
        treeRowSelf.addClass("tree-item-self");
        if (!disableInteraction) {
            treeRowSelf.addClass("tag-pane-tag");
        }
        treeRowSelf.addClass("sr-tree-item-row");

        let collapsed = !initiallyExpanded;
        const collapseIconEl = treeRowSelf.createDiv("tree-item-icon collapse-icon");
        setIcon(collapseIconEl, "chevron-down");
        if (collapsed) collapseIconEl.addClass("is-collapsed");
        if (numOfSubdecks === 0) collapseIconEl.setCssProps({ display: "none" });

        const treeRowInner: HTMLElement = treeRowSelf.createDiv("tree-item-inner");
        const treeRowInnerText: HTMLElement = treeRowInner.createDiv("tag-pane-tag-text");
        const treeRowInnerTextSpan: HTMLElement = treeRowInnerText.createSpan("tag-pane-tag-self");
        treeRowInnerTextSpan.setText(deckName);

        const treeRowOuter: HTMLDivElement = treeRowSelf.createDiv();
        treeRowOuter.addClasses(["tree-item-flair-outer", "sr-tree-stats-container"]);

        const treeRowChildren: HTMLDivElement = treeRow.createDiv("tree-item-children");
        treeRowChildren.setCssProps({ display: collapsed ? "none" : "block" });

        // Endless: a tick box in front of the name; the row ticks the deck
        const endless = this.endless;
        const key = deck ? deckKey(deck.getTopicPath().path) : "";
        if (endless && deck && deckStats.totalCount > 0) {
            const covered = isDeckCovered(endless.selected, key);
            const byParent = covered && !endless.selected.includes(key);
            const box = createEl("input", {
                cls: "sr-endless-check",
                attr: {
                    type: "checkbox",
                    "aria-label": en("SELECT_DECK", { deck: deckName }),
                },
            });
            box.checked = covered;
            box.disabled = byParent;
            treeRowSelf.insertBefore(box, treeRowInner);
            treeRowSelf.toggleClass("is-endless-selected", covered);
        }

        const selectable = endless !== null && deckStats.totalCount > 0;
        if (
            disableInteraction ||
            (!selectable && deckStats.dueCount === 0 && deckStats.newCount === 0)
        ) {
            if (!disableInteraction) {
                treeRowSelf.addClass("is-disabled");
            }
        } else {
            treeRowSelf.addClass("is-clickable");
            collapseIconEl.addEventListener("click", (e) => {
                if (collapsed) {
                    collapseIconEl.removeClass("is-collapsed");
                    treeRowChildren.setCssProps({ display: "block" });
                } else {
                    collapseIconEl.addClass("is-collapsed");
                    treeRowChildren.setCssProps({ display: "none" });
                }

                // We stop the propagation of the event so that the click event for treeRowSelf doesn't get called
                // if the user clicks on the collapse icon
                e.stopPropagation();
                collapsed = !collapsed;
            });
        }

        // Add the click handler to treeRowSelf instead of treeRowInner so that it activates
        // over the entire rectangle of the tree item, not just the text of the topic name
        // https://github.com/st3v3nmw/obsidian-spaced-repetition/issues/709

        if (!disableInteraction) {
            treeRowSelf.addEventListener("click", (e) => {
                if (this.endless) {
                    // a deck ticked through its parent is changed on the parent
                    const selected = this.endless.selected;
                    if (!selectable || (isDeckCovered(selected, key) && !selected.includes(key)))
                        return;
                    e.preventDefault();
                    this.endless.toggle(key);
                    return;
                }
                startReviewOfDeck(deck);
            });
        }

        this._createStatsInRow(treeRowOuter, deckStats);
        return treeRowChildren;
    }

    private _drawEndlessBar() {
        const bar = this.endlessBar;
        bar.empty();
        bar.toggleClass("sr-is-hidden", this.endless === null);
        if (!this.endless) return;
        const endless = this.endless;

        // Summary of the session that just ended
        const summary = endless.summary;
        if (summary) {
            const box = bar.createDiv({ cls: "sr-endless-summary" });
            box.toggleClass("is-record", summary.newRecord > 0);
            box.setAttr("role", "status");
            box.createDiv({ cls: "sr-endless-summary-title", text: en("SUMMARY_TITLE") });
            box.createDiv({
                text: en("SUMMARY", {
                    best: summary.bestScore,
                    errors: summary.errors,
                    ratings: summary.ratings,
                }),
            });
            if (summary.newRecord > 0) {
                box.createDiv({
                    cls: "sr-endless-summary-record",
                    text: en("SUMMARY_RECORD", { n: summary.newRecord }),
                });
            }
        }

        // Record card: today's best and the all-time record, with the way between them on a bar
        // (tap for the top 5 and the last sessions)
        this._drawRecordCard(bar, endless);

        bar.createDiv({ cls: "sr-endless-hint", text: en("HINT") });
        const button = bar.createEl("button", {
            cls: "sr-endless-start sr-bg-accent",
            text: endless.cardCount > 0 ? en("START_N", { n: endless.cardCount }) : en("START"),
        });
        if (endless.cardCount === 0) {
            button.disabled = true;
            button.setAttr("title", en("NOTHING_SELECTED"));
        }
        button.addEventListener("click", () => endless.start());
    }

    private _drawRecordCard(parentEl: HTMLElement, endless: EndlessDeckSelection) {
        const track = recordTrack(endless.best, endless.today);
        const card = parentEl.createEl("button", {
            cls: "sr-endless-record",
            attr: {
                "aria-label": en("RECORDS_BAR_ARIA", { best: endless.best, today: endless.today }),
            },
        });
        card.addEventListener("click", () => endless.openRecords());

        const head = card.createDiv({
            cls: "sr-endless-record-head",
            attr: { "aria-hidden": "true" },
        });
        const todayEl = head.createDiv({ cls: "sr-endless-record-side" });
        todayEl.createSpan({ cls: "sr-endless-record-label", text: en("TODAY_BEST") });
        todayEl.createSpan({ cls: "sr-endless-record-value is-today", text: String(track.today) });
        const bestEl = head.createDiv({ cls: "sr-endless-record-side is-end" });
        bestEl.createSpan({ cls: "sr-endless-record-label", text: en("RECORD") });
        bestEl.createSpan({ cls: "sr-endless-record-value", text: String(track.best) });

        const pct = (f: number) => `${Math.round(f * 1000) / 10}%`;
        const line = card.createDiv({ cls: "sr-endless-track", attr: { "aria-hidden": "true" } });
        line.createDiv({ cls: "sr-endless-track-fill" }).setCssProps({
            "--sr-track-at": pct(track.fraction),
        });
        for (const tick of track.ticks) {
            line.createDiv({ cls: "sr-endless-track-tick" }).setCssProps({
                "--sr-track-at": pct(tick.at),
            });
        }
        line.createDiv({ cls: "sr-endless-track-dot" }).setCssProps({
            "--sr-track-at": pct(track.fraction),
        });
        setIcon(line.createDiv({ cls: "sr-endless-track-flag" }), "flag");

        const labels = card.createDiv({
            cls: "sr-endless-track-labels",
            attr: { "aria-hidden": "true" },
        });
        labels.createSpan({ text: "0" }).setCssProps({ "--sr-track-at": "0%" });
        for (const tick of track.ticks) {
            labels.createSpan({ text: String(tick.value) }).setCssProps({
                "--sr-track-at": pct(tick.at),
            });
        }
        labels.createSpan({ cls: "is-end", text: String(track.best) });
    }

    private _createStatsInRow(parentEl: HTMLDivElement, deckStats: DeckStats) {
        parentEl.empty();

        this._createStatsContainer(t("DUE_CARDS"), deckStats.dueCount, "sr-bg-green", parentEl);
        this._createStatsContainer(t("NEW_CARDS"), deckStats.newCount, "sr-bg-blue", parentEl);
        const reviewedCards: number =
            deckStats.totalCount - deckStats.newCount - deckStats.dueCount;
        this._createStatsContainer(t("SEEN_CARDS"), reviewedCards, "sr-bg-yellow", parentEl);
        this._createStatsContainer(t("TOTAL_CARDS"), deckStats.totalCount, "sr-bg-red", parentEl);
    }

    private _createStatsContainer(
        statsLable: string,
        statsNumber: number,
        statsClass: string,
        statsWrapper: HTMLDivElement,
    ): void {
        const statsContainer = statsWrapper.createDiv();

        statsContainer.ariaLabel = statsLable;

        statsContainer.addClasses([
            "tag-pane-tag-count",
            "tree-item-flair",
            "sr-tree-stats-count",
            statsClass,
        ]);

        statsContainer.setText(statsNumber.toString());
    }
}
