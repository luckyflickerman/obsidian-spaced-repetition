import { now } from "moment";
import { App, MarkdownView, Notice, Platform } from "obsidian";

import { DataManager } from "src/data/data-manager";
import { Card } from "src/data/data-structures/card/card";
import { Question } from "src/data/data-structures/card/questions/question";
import { Deck } from "src/data/data-structures/deck/deck";
import { SRSettings } from "src/data/settings";
import { en } from "src/endless/endless-i18n";
import { bestScore } from "src/endless/endless-records";
import { cardsOfDecks, EndlessReviewSequencer } from "src/endless/endless-sequencer";
import { needsFewCardsWarning, normalizeEndlessSettings } from "src/endless/endless-settings";
import { getEndlessRecords, storeEndlessRun, storeEndlessSession } from "src/endless/endless-store";
import { askFewCards } from "src/endless/few-cards-modal";
import { flushReviewLog, recordCardReview } from "src/heatmap/heatmap-view";
import { t } from "src/lang/helpers";
import SRPlugin from "src/main";
import { Note } from "src/note/note";
import type { ReviewWindowControls } from "src/review-window/review-window-controller";
import { RepItemScheduleInfo } from "src/scheduling/algorithms/base/rep-item-schedule-info";
import { ReviewResponse } from "src/scheduling/algorithms/base/repetition-item";
import {
    DeckStats,
    FlashcardReviewMode,
    IFlashcardReviewSequencer,
} from "src/scheduling/flashcard-review-sequencer";
import { CardContainer } from "src/ui/obsidian-ui-components/content-container/card-container/card-container";
import CardInfoNotice from "src/ui/obsidian-ui-components/content-container/card-container/toolbar/toolbar-buttons/card-info-notice";
import { DeckContainer } from "src/ui/obsidian-ui-components/content-container/deck-container/deck-container";
import { ConfirmationModal } from "src/ui/obsidian-ui-components/modals/confirmation-modal";
import { FlashcardEditModal } from "src/ui/obsidian-ui-components/modals/edit-modal";
import { ReviewQueueLoader } from "src/ui/review-queue-loader";
import { UIManager, UIState } from "src/ui/ui-manager";
import EmulatedPlatform from "src/utils/platform-detector";

export enum ContentState {
    Deck,
    CardFront,
    CardBack,
    Closed,
}

export enum CardState {
    Front,
    Back,
    Closed,
}

export interface CardData {
    currentCard: Card | null;
    currentCardState: CardState;
}

export interface DeckData {
    chosenDeck: Deck;
    currentDeck: Deck | null;
    previousDeck: Deck | null;
    currentDeckTotalCardsInQueue: number;
    currentDeckStats: DeckStats | null;
    previousDeckStats: DeckStats | null;
    chosenDeckStats: DeckStats;
}

export interface SessionData {
    cardData: CardData;
    deckData: DeckData;

    totalDecksInSession: number;
    totalCardsInSession: number;

    currentQuestion: Question;
    currentNote: Note;

    /** Endless session (src/endless/): own Speed Streak records */
    endless?: boolean;
    /** Endless score (answers without an error in a row) and whether it beats the record */
    endlessScore?: { score: number; newRecord: boolean };
}

// TODO: Refactor/integrate this code with the backend

/**
 * Manages the content of the deck and flashcard views, by determining their behavior.
 *
 * @method open - Opens the content manager, loading the review queue and initializing the deck and flashcard views.
 * @method close - Closes the content manager, shutting down the deck and flashcard views.
 */
export default class ContentManager {
    private app: App;
    private plugin: SRPlugin;
    private uiManager: UIManager;
    private dataManager: DataManager;
    private reviewSequencer: IFlashcardReviewSequencer | null = null;
    private settings: SRSettings;
    private reviewMode: FlashcardReviewMode;
    private deckContainer: DeckContainer;
    private cardContainer: CardContainer;

    private reviewQueueLoader: ReviewQueueLoader;
    private sessionData: SessionData | null = null;

    private lastPressedOnProcessReview: number = 0;
    /** Endless: highest new all-time record set in this session (0 = none) */
    private endlessNewRecord = 0;
    /** Endless session whose records were already saved */
    private finishingEndless: EndlessReviewSequencer | null = null;
    private pendingResumeTimeout: number | null = null;

    constructor(
        app: App,
        plugin: SRPlugin,
        reviewQueueLoader: ReviewQueueLoader,
        settings: SRSettings,
        parentEl: HTMLElement,
        closeModal?: () => void,
        windowControls?: ReviewWindowControls,
    ) {
        this.app = app;
        this.plugin = plugin;
        this.reviewQueueLoader = reviewQueueLoader;
        this.settings = settings;
        this.reviewMode = reviewQueueLoader.getReviewMode();

        this.uiManager = this.plugin.uiManager;
        this.dataManager = this.plugin.dataManager;

        this.deckContainer = new DeckContainer(
            parentEl,
            this.plugin,
            this._changeReviewMode.bind(this),
            this._startReviewOfDeck.bind(this),
            this._startEndless.bind(this),
            closeModal,
            windowControls,
        );

        this.cardContainer = new CardContainer(
            this.app,
            this.plugin,
            this.settings,
            parentEl,
            this._deleteCurrentCard.bind(this),
            this._showDecksList.bind(this),
            this._doEditQuestionText.bind(this),
            this._processReview.bind(this),
            this._skipCurrentCard.bind(this),
            this._showAnswer.bind(this),
            this._jumpToCurrentCard.bind(this),
            this._displayCurrentCardInfoNotice.bind(this),
            closeModal,
            windowControls,
        );
    }

    public close() {
        this._clearPendingResumeTimeout();
        void this._finishEndlessSession();
        this.uiManager.setSRViewInFocus(false);
        this.deckContainer.closeList();
        this.cardContainer.closeSession();
        this.uiManager.setUIState(UIState.Closed);
        void flushReviewLog(this.plugin);
    }

    public async open() {
        // Prepare a review queue to display
        this.reviewSequencer = await this.reviewQueueLoader.loadReviewQueue();

        // Endless: the decks are ticked first
        if (this.reviewMode === FlashcardReviewMode.Endless) {
            await this._showDecksList();
            return;
        }

        // Determine if the card view should be opened immediately
        const subdecksWithCardsInQueue: Deck[] = this.reviewSequencer.getSubDecksWithCardsInQueue(
            this.reviewSequencer.originalDeckTree,
        );

        let openImmediately: boolean = false;
        let deckWithCards: Deck | null = null;

        // Loop through all decks and determine if any have cards in queue
        for (const subdeck of subdecksWithCardsInQueue) {
            const subdeckStats = this.reviewSequencer.getDeckStats(subdeck.getTopicPath());

            if (
                openImmediately &&
                (subdeckStats.cardsInQueueOfThisDeckCount ||
                    this.reviewMode === FlashcardReviewMode.Cram)
            ) {
                openImmediately = false;
                break;
            }

            if (
                subdeckStats.cardsInQueueOfThisDeckCount ||
                this.reviewMode === FlashcardReviewMode.Cram
            ) {
                openImmediately = true;
                deckWithCards = subdeck;
            }
        }

        if (openImmediately && deckWithCards !== null) {
            await this._reviewDeck(deckWithCards);
        } else {
            await this._showDecksList();
        }
    }

    // MARK: Content Manager

    private async _showDecksList(reloadReviewQueue: boolean = false): Promise<void> {
        this._clearPendingResumeTimeout();
        // After an Endless session: save the records, then the normal queue again
        const endedEndless = this.reviewSequencer instanceof EndlessReviewSequencer;
        if (endedEndless) await this._finishEndlessSession();
        if (reloadReviewQueue || endedEndless) {
            this.reviewSequencer = await this.reviewQueueLoader.loadReviewQueue();
        }
        if (this.reviewSequencer === null) return;
        this.cardContainer.closeSession();
        this.uiManager.setUIState(UIState.DeckList);
        this.deckContainer.showList(this.reviewSequencer, this.settings, this.reviewMode);
    }

    private async _reviewDeck(deck: Deck): Promise<void> {
        this.deckContainer.closeList();
        this.sessionData = this._getNewSessionData(deck);
        if (this.sessionData === null) return;
        this.sessionData.endless = this.reviewSequencer instanceof EndlessReviewSequencer;
        this._updateEndlessScore();
        this.uiManager.setUIState(UIState.CardFront);
        await this.cardContainer.openSession(this.sessionData, this.settings);
    }

    private async _showNextCard(): Promise<void> {
        if (this.sessionData === null || this.reviewSequencer === null) {
            await this._showDecksList(true);
            return;
        }

        if (!this.reviewSequencer.hasCurrentCard) {
            // TODO: Re-enable pending state, once it is more integrated with the rest of the ui & once data refreshing is better implemented
            // if (this.reviewSequencer.hasPendingCards) {
            //     await this._showPendingState();
            // } else {
            //     await this._showDecksList(true);
            // }
            await this._showDecksList(true);
            return;
        }

        if (this.reviewSequencer.currentDeck === null) {
            await this._showDecksList(true);
            return;
        }

        const chosenDeckStats = this.reviewSequencer.getDeckStats(
            this.sessionData.deckData.chosenDeck.getTopicPath(),
        );
        this.sessionData.deckData.chosenDeckStats = chosenDeckStats;

        this.sessionData.deckData.previousDeck = this.sessionData.deckData.currentDeck;
        this.sessionData.deckData.previousDeckStats = this.sessionData.deckData.currentDeckStats;

        this.sessionData.deckData.currentDeck = this.reviewSequencer.currentDeck;

        const currentDeckStats = this.reviewSequencer.getDeckStats(
            this.reviewSequencer.currentDeck.getTopicPath(),
        );
        this.sessionData.deckData.currentDeckStats = currentDeckStats;

        if (this.sessionData.deckData.previousDeck !== this.sessionData.deckData.currentDeck) {
            this.sessionData.deckData.currentDeckTotalCardsInQueue =
                currentDeckStats.cardsInQueueOfThisDeckCount;
        }

        this.sessionData.currentNote = this.reviewSequencer.currentNote;
        this.sessionData.currentQuestion = this.reviewSequencer.currentQuestion;

        this.sessionData.cardData.currentCard = this.reviewSequencer.currentCard;
        this._updateEndlessScore();
        this.uiManager.setUIState(UIState.CardFront);
        this.sessionData.cardData.currentCardState = CardState.Front;

        if (
            this.sessionData.cardData.currentCard !== null &&
            this.sessionData.cardData.currentCard !== undefined
        ) {
            await this.cardContainer.drawCardFront(this.sessionData, this.settings);
        } else {
            await this._showDecksList(true);
        }
    }

    private async _showPendingState(): Promise<void> {
        if (this.reviewSequencer === null) return;
        this._clearPendingResumeTimeout();
        const nextPendingDueUnix = this.reviewSequencer.nextPendingDueUnix;
        if (nextPendingDueUnix === null) {
            await this._showDecksList(true);
            return;
        }

        this.uiManager.setUIState(UIState.CardFront);
        this.cardContainer.drawPendingState(nextPendingDueUnix);

        const delayMs = Math.max(0, nextPendingDueUnix - Date.now());
        this.pendingResumeTimeout = window.setTimeout(() => {
            if (this.reviewSequencer === null) return;
            this.reviewSequencer.refreshCurrentDeck();
            void this._showNextCard();
        }, delayMs + 50);
    }

    private _getNewSessionData(deck: Deck): SessionData | null {
        if (this.reviewSequencer === null) return null;
        const chosenDeckStats = this.reviewSequencer.getDeckStats(deck.getTopicPath());
        const totalCardsInSession: number = chosenDeckStats.cardsInQueueCount;
        const totalDecksInSession: number = chosenDeckStats.decksInQueueOfThisDeckCount;
        const currentCardState: CardState = CardState.Front;

        const currentDeckStats =
            this.reviewSequencer.currentDeck === null
                ? null
                : this.reviewSequencer.getDeckStats(
                      this.reviewSequencer.currentDeck.getTopicPath(),
                  );

        return {
            cardData: {
                currentCard: this.reviewSequencer.currentCard,
                currentCardState,
            },
            deckData: {
                chosenDeck: deck,
                currentDeck: this.reviewSequencer.currentDeck,
                previousDeck: null,
                currentDeckTotalCardsInQueue:
                    currentDeckStats === null ? 0 : currentDeckStats.cardsInQueueOfThisDeckCount,
                currentDeckStats: currentDeckStats,
                previousDeckStats: null,
                chosenDeckStats: chosenDeckStats,
            },
            totalCardsInSession,
            totalDecksInSession,
            currentQuestion: this.reviewSequencer.currentQuestion,
            currentNote: this.reviewSequencer.currentNote,
        };
    }

    // MARK: Card button handlers

    public _deleteCurrentCard() {
        if (
            this.sessionData === null ||
            this.reviewSequencer === null ||
            this.dataManager.data === null
        )
            return;

        const timeNow = now();
        if (
            this.lastPressedOnProcessReview &&
            timeNow - this.lastPressedOnProcessReview <
                this.dataManager.data.settings.reviewButtonDelay
        ) {
            return;
        }
        this.lastPressedOnProcessReview = timeNow;

        new ConfirmationModal(
            this.app,
            t("DELETE_CARD"),
            t("DELETE_CARD_CONFIRMATION"),
            t("CANCEL"),
            async () => {
                if (this.sessionData === null || this.reviewSequencer === null) return;
                await this.reviewSequencer.deleteCurrentCardFromNote();
                await this._showNextCard();
            },
        ).open();
    }

    public async _showAnswer() {
        if (this.sessionData === null) return;

        const timeNow = now();
        if (
            this.lastPressedOnProcessReview &&
            timeNow - this.lastPressedOnProcessReview <
                this.dataManager.data.settings.reviewButtonDelay
        ) {
            return;
        }
        this.lastPressedOnProcessReview = timeNow;

        this.uiManager.setUIState(UIState.CardBack);
        this.sessionData.cardData.currentCardState = CardState.Back;

        await this.cardContainer.drawBack(
            this.sessionData,
            this.reviewMode,
            this.settings,
            this._determineButtonSchedule.bind(this),
        );
    }

    private async _doEditQuestionText(): Promise<void> {
        if (this.reviewSequencer === null) return;
        const currentCard: Card | null = this.reviewSequencer.currentCard;
        const currentQ: Question = this.reviewSequencer.currentQuestion;

        // Just the question/answer text; without any preceding topic tag
        const textPrompt = currentQ.questionText.actualQuestion;
        const currentUIState = this.uiManager.uiState;
        this.uiManager.setUIState(UIState.EditModal);
        this.cardContainer.speedStreak.beginInterruption();
        const editModal = FlashcardEditModal.Prompt(
            this.app,
            this.settings,
            currentCard,
            textPrompt,
            currentQ.questionText.textDirection,
        );
        await editModal
            .then(async (modifiedCardText) => {
                if (this.reviewSequencer === null) return;
                await this.reviewSequencer.updateCurrentQuestionTextAndCards(modifiedCardText);
                this.uiManager.setUIState(currentUIState);

                if (this.sessionData !== null) {
                    if (this.uiManager.uiState === UIState.CardFront) {
                        await this.cardContainer.drawCardFront(this.sessionData, this.settings);
                    }

                    if (this.uiManager.uiState === UIState.CardBack) {
                        await this.cardContainer.drawBack(
                            this.sessionData,
                            this.reviewMode,
                            this.settings,
                            this._determineButtonSchedule.bind(this),
                        );
                    }
                }
            })
            .catch((reason) => console.log(reason))
            .finally(() => this.cardContainer.speedStreak.endInterruption());
    }

    public async _jumpToCurrentCard(): Promise<void> {
        if (this.reviewSequencer === null) return;
        const currentQuestion = this.reviewSequencer.currentQuestion;
        if (!currentQuestion) return;
        this.cardContainer.speedStreak.pauseForDeparture();

        if (
            (!this.settings.openViewInNewTab &&
                !(Platform.isMobile || EmulatedPlatform().isMobile)) ||
            (!this.settings.openViewInNewTabMobile &&
                (Platform.isMobile || EmulatedPlatform().isMobile))
        ) {
            new Notice("Note was opened in new tab in the background");
        }

        const file = currentQuestion.note.file.tfile;
        const blockId = currentQuestion.questionText.obsidianBlockId;
        const line = Math.max(0, currentQuestion.lineNo ?? 0);

        if (blockId) {
            await this.app.workspace.openLinkText(`${file.path}#${blockId}`, file.path, false);
            return;
        }

        // If the file is already open in another leaf, open it in the current one to prevent duplicates
        const existingLeaf = this.app.workspace.getLeavesOfType("markdown").find((leaf) => {
            const view = leaf.view as MarkdownView;
            return view.file?.path === file.path;
        });

        if (existingLeaf) {
            await existingLeaf.openFile(file, { eState: { line } });
            this.app.workspace.setActiveLeaf(existingLeaf);
            const markdownView = existingLeaf.view as MarkdownView;
            if (markdownView?.editor) {
                markdownView.editor.setCursor({ line, ch: 0 });
                markdownView.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } });
            }
            return;
        }

        const leaf = this.app.workspace.getLeaf("tab");
        await leaf.openFile(file, { eState: { line } });

        const markdownView = leaf.view as MarkdownView;
        if (markdownView?.editor) {
            markdownView.editor.setCursor({ line, ch: 0 });
            markdownView.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } });
        }
    }

    public async _skipCurrentCard() {
        if (this.reviewSequencer === null) return;
        this.reviewSequencer.skipCurrentCard();
        await this._showNextCard();
    }

    private _displayCurrentCardInfoNotice() {
        if (this.sessionData === null) return;
        new CardInfoNotice(
            this.sessionData.cardData.currentCard.scheduleInfo,
            this.sessionData.currentNote.file.path,
        );
    }

    public async _processReview(response: ReviewResponse): Promise<void> {
        if (this.reviewSequencer === null) return;
        const timeNow = now();
        if (
            timeNow - this.lastPressedOnProcessReview <
            this.dataManager.data.settings.reviewButtonDelay
        ) {
            return;
        }
        this.lastPressedOnProcessReview = timeNow;

        // Review calendar: count the card (a reset is not a review)
        const isNew = !(this.reviewSequencer.currentCard?.hasSchedule ?? true);
        const msOnCard = this.cardContainer.msOnCurrentCard();

        await this.reviewSequencer.processReview(response);
        if (response !== ReviewResponse.Reset) recordCardReview(this.plugin, msOnCard, isNew);
        await this._showNextCard();
    }

    // MARK: Deck button handlers

    private async _startReviewOfDeck(deck: Deck) {
        if (this.reviewSequencer === null) return;
        this.reviewSequencer.setCurrentDeck(deck.getTopicPath());
        if (this.reviewSequencer.hasCurrentCard) {
            await this._reviewDeck(deck);
        } else {
            await this._showDecksList();
        }
    }

    /** Endless: the ticked decks over and over (nothing is scheduled). */
    private async _startEndless(decks: Deck[]) {
        if (this.reviewSequencer === null) return;
        const cards = cardsOfDecks(decks);
        if (cards.length === 0) {
            new Notice(en("NOTHING_SELECTED"));
            return;
        }
        // Few cards: the same ones come back too often — ask first
        const endlessSettings = normalizeEndlessSettings(this.settings.endless);
        if (needsFewCardsWarning(cards.length, endlessSettings)) {
            const answer = await askFewCards(this.app, cards.length);
            if (answer.dontShowAgain) {
                this.settings.endless = { ...endlessSettings, hideFewCardsWarning: true };
                await this.plugin.dataManager.settingsManager.save();
            }
            if (!answer.start) return;
        }

        const decksName = decks.map((d) => (d.isRootDeck ? t("ALL_DECKS") : d.deckName)).join(", ");
        const records = getEndlessRecords(this.plugin);
        const endless = new EndlessReviewSequencer(
            this.reviewSequencer,
            cards,
            {
                decks: decksName,
                bestAtStart: bestScore(records),
                onRunEnded: (score) => {
                    void storeEndlessRun(this.plugin, score, decksName).then((newBest) => {
                        if (newBest) this.endlessNewRecord = Math.max(this.endlessNewRecord, score);
                    });
                },
            },
            this.settings,
        );
        this.endlessNewRecord = 0;
        this.deckContainer.setEndlessSummary(null);
        this.reviewSequencer = endless;
        await this._reviewDeck(endless.sessionDeck);
    }

    /** Endless score into the session data (badge above the card, hourglass). */
    private _updateEndlessScore() {
        if (this.sessionData === null) return;
        const seq = this.reviewSequencer;
        this.sessionData.endlessScore =
            seq instanceof EndlessReviewSequencer
                ? { score: seq.score.score, newRecord: seq.isNewRecord }
                : undefined;
    }

    /** End of an Endless session: the last run, the session record and the summary. */
    private async _finishEndlessSession() {
        const seq = this.reviewSequencer;
        if (!(seq instanceof EndlessReviewSequencer) || this.finishingEndless === seq) return;
        this.finishingEndless = seq;
        const s = seq.score;
        if (s.ratings === 0) return;
        if (s.score > 0 && (await storeEndlessRun(this.plugin, s.score, seq.info.decks))) {
            this.endlessNewRecord = Math.max(this.endlessNewRecord, s.score);
        }
        await storeEndlessSession(this.plugin, {
            endedAt: Date.now(),
            decks: seq.info.decks,
            ratings: s.ratings,
            bestScore: s.bestScore,
            errors: s.errors,
            durationMs: Date.now() - seq.startedAt,
        });
        this.deckContainer.setEndlessSummary({
            bestScore: s.bestScore,
            errors: s.errors,
            ratings: s.ratings,
            newRecord: this.endlessNewRecord,
        });
    }

    private async _changeReviewMode(reviewMode: FlashcardReviewMode) {
        this.reviewQueueLoader.setReviewMode(reviewMode);
        this.reviewMode = reviewMode;
        this.reviewSequencer = await this.reviewQueueLoader.loadReviewQueue();
        this.deckContainer.closeList();
        await this._showDecksList();
    }

    // MARK: Utils

    private _determineButtonSchedule(reviewResponse: ReviewResponse): RepItemScheduleInfo | null {
        if (this.sessionData === null) return null;
        if (this.reviewSequencer === null) return null;
        return this.reviewSequencer.determineCardSchedule(
            reviewResponse,
            this.sessionData.cardData.currentCard,
        );
    }

    private _clearPendingResumeTimeout(): void {
        if (this.pendingResumeTimeout !== null) {
            window.clearTimeout(this.pendingResumeTimeout);
            this.pendingResumeTimeout = null;
        }
    }
}
