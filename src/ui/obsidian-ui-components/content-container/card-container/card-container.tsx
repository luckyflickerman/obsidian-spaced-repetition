import "src/ui/obsidian-ui-components/content-container/card-container/card-container.css";
import moment from "moment";
import { App, Platform } from "obsidian";

import { isReversedSibling } from "src/card-authoring/card-detect";
import { CardType } from "src/data/data-structures/card/questions/question";
import { SRSettings } from "src/data/settings";
import { t } from "src/lang/helpers";
import type SRPlugin from "src/main";
import { displayRatingLabel } from "src/review-window/rating-labels";
import type { ReviewWindowControls } from "src/review-window/review-window-controller";
import { RepItemScheduleInfo } from "src/scheduling/algorithms/base/rep-item-schedule-info";
import { ReviewResponse } from "src/scheduling/algorithms/base/repetition-item";
import { FlashcardReviewMode } from "src/scheduling/flashcard-review-sequencer";
import { SpeedStreakController } from "src/speed-streak/speed-streak-controller";
import { TtsController } from "src/tts/tts-controller";
import ContextSectionComponent from "src/ui/obsidian-ui-components/content-container/card-container/context-section/context-section";
import ResponseSectionComponent from "src/ui/obsidian-ui-components/content-container/card-container/response-section/response-section";
import CardToolbarComponent from "src/ui/obsidian-ui-components/content-container/card-container/toolbar/toolbar";
import {
    CardState,
    SessionData,
} from "src/ui/obsidian-ui-components/content-container/content-manager";
import { ConfirmationModal } from "src/ui/obsidian-ui-components/modals/confirmation-modal";
import { escapeHtml } from "src/utils/escape-html";
import EmulatedPlatform from "src/utils/platform-detector";
import { RenderMarkdownWrapper } from "src/utils/renderers";

// TODO: Refactor cloze rendering into the renderers file
export class CardContainer {
    private app: App;
    private plugin: SRPlugin;
    private cardState: CardState;

    private view: HTMLDivElement;

    private toolbar: CardToolbarComponent;
    private contextSection: ContextSectionComponent | null = null;

    private scrollWrapper: HTMLDivElement;
    private content: HTMLDivElement;
    private pendingClock: HTMLDivElement | null = null;
    private pendingResumeTimeout: number | null = null;

    private response: ResponseSectionComponent;

    /** Speed Streak timer/streak game. */
    public speedStreak: SpeedStreakController;

    /** Reads the answer aloud. */
    public tts: TtsController;

    /** When the current card's question was shown (epoch ms, 0 = none). */
    private cardShownAt = 0;

    private clozeInputs: NodeListOf<HTMLInputElement> | null = null;
    private clozeAnswers: NodeListOf<Element> | null = null;

    private processReviewHandler: (response: ReviewResponse) => Promise<void>;
    private skipCardHandler: () => void;
    private showAnswerHandler: () => void;
    private jumpToCardHandler: () => Promise<void>;

    constructor(
        app: App,
        plugin: SRPlugin,
        settings: SRSettings,
        parentEl: HTMLElement,
        deleteCurrentCard: () => void,
        backToDeckHandler: () => Promise<void>,
        editCardHandler: () => void,
        processReviewHandler: (response: ReviewResponse) => Promise<void>,
        skipCardHandler: () => void,
        showAnswerHandler: () => void,
        jumpToCurrentCardHandler: () => Promise<void>,
        displayCurrentCardInfoNoticeHandler: () => void,
        closeModal?: () => void,
        windowControls?: ReviewWindowControls,
    ) {
        // Init properties
        this.app = app;
        this.plugin = plugin;
        this.cardState = CardState.Closed;
        // Speed Streak hooks: notify the game before the review continues
        this.processReviewHandler = async (response: ReviewResponse) => {
            // The Speed Streak pause screen covers the card: no rating until it is resumed
            if (this.speedStreak?.isPauseScreenShown) return;
            if (this.cardState === CardState.Back) this.speedStreak?.onRate(response);
            this.tts?.cancel();
            await processReviewHandler(response);
        };
        this.skipCardHandler = () => {
            if (this.cardState !== CardState.Closed) this.speedStreak?.onSkip();
            this.tts?.cancel();
            skipCardHandler();
        };
        this.showAnswerHandler = () => {
            if (this.speedStreak?.isPauseScreenShown) return;
            showAnswerHandler();
        };
        this.jumpToCardHandler = jumpToCurrentCardHandler;

        // Build ui
        this.view = parentEl.createDiv();
        this.view.addClasses(["sr-container", "sr-card-container", "sr-is-hidden"]);

        this.setCustomHotKeyState(settings.useCustomHotkeys);

        this.toolbar = new CardToolbarComponent(
            this.view,
            settings.showDeleteButtonInCardView,
            deleteCurrentCard,
            backToDeckHandler,
            editCardHandler,
            jumpToCurrentCardHandler,
            displayCurrentCardInfoNoticeHandler,
            this.skipCardHandler,
            () => {
                new ConfirmationModal(
                    app,
                    t("DELETE_SCHEDULING_DATA_OF_CURRENT_CARD"),
                    t("CONFIRM_SCHEDULING_DATA_DELETION_OF_CURRENT_CARD"),
                    t("SCHEDULING_DATA_DELETION_IN_PROGRESS_OF_CURRENT_CARD"),
                    async () => {
                        await this.processReviewHandler(ReviewResponse.Reset);
                    },
                ).open();
            },
            closeModal,
            windowControls,
        );

        this.scrollWrapper = this.view.createDiv();
        this.scrollWrapper.addClass("sr-scroll-wrapper");

        this.content = this.scrollWrapper.createDiv();
        this.content.addClass("sr-content");

        this.response = new ResponseSectionComponent(
            this.view,
            settings,
            this.showAnswerHandler,
            this.processReviewHandler,
        );

        this.speedStreak = new SpeedStreakController(
            plugin,
            this.view,
            this.scrollWrapper,
            this.response.responseEl,
        );

        this.tts = new TtsController(plugin, this.view, () => this.speedStreak ?? null);
    }

    // #region -> public methods

    /**
     * Shows the FlashcardView if it is hidden
     */
    async openSession(sessionData: SessionData, settings: SRSettings) {
        // Prevents rest of code, from running if this was executed multiple times after one another
        if (!this.view.hasClass("sr-is-hidden")) {
            return;
        }

        this.speedStreak.startSession(sessionData.deckData.chosenDeck?.deckName ?? "");
        this.tts.startSession();
        await this.drawCardFront(sessionData, settings);

        this.view.removeClass("sr-is-hidden");
        activeDocument.addEventListener("keydown", this._keydownHandler);
    }

    /**
     * Hides the FlashcardView if it is visible
     */
    closeSession() {
        // Prevents the rest of code, from running if this was executed multiple times after one another

        if (this.view.hasClass("sr-is-hidden")) {
            return;
        }
        if (this.pendingResumeTimeout !== null) {
            window.clearTimeout(this.pendingResumeTimeout);
            this.pendingResumeTimeout = null;
        }
        this.cardState = CardState.Closed;
        this.tts.endSession();
        this.speedStreak.endSession();
        activeDocument.removeEventListener("keydown", this._keydownHandler);
        this.view.addClass("sr-is-hidden");
    }

    /**
     * Blocks the key input to the FlashcardView
     *
     * @param block
     */
    blockKeyInput(block: boolean) {
        if (block) {
            activeDocument.addEventListener("keydown", this._keydownHandler);
        } else {
            activeDocument.removeEventListener("keydown", this._keydownHandler);
        }
    }

    /** Time since the current card's question was shown (review calendar). */
    public msOnCurrentCard(): number {
        return this.cardShownAt > 0 ? Date.now() - this.cardShownAt : 0;
    }

    public async drawCardFront(sessionData: SessionData, settings: SRSettings) {
        // Next card / skip / redraw: stop reading the previous answer at once
        this.tts.onQuestionShown();
        this.cardShownAt = Date.now();
        this.toolbar.setResetButtonDisabled(true);
        // Update current deck info
        this.cardState = sessionData.cardData.currentCardState;

        this._updateInfoBar(sessionData, settings.flashcardCardOrder);

        // Update card content
        await this.drawCardFrontContent(sessionData, settings);

        // Update response buttons
        this.response.resetResponseButtons();

        // Setup cloze input listeners
        this._setupClozeInputListeners();

        // Start the Speed Streak question timer
        this.speedStreak.onQuestionShown(this._speedStreakCardContext(sessionData));

        // auto-focus the first cloze input if this card is a cloze card
        if (sessionData.currentQuestion.questionType === CardType.Cloze) {
            const firstInput: HTMLInputElement | null =
                activeDocument.querySelector(".cloze-input");
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    private _speedStreakCardContext(sessionData: SessionData): {
        tags: string[];
        deckPath: string;
    } {
        const tags: string[] = [];
        try {
            tags.push(...(sessionData.currentNote?.file?.getAllTagsFromCache() ?? []));
        } catch {
            /* metadata cache not ready */
        }
        try {
            const list = sessionData.currentQuestion?.topicPathList?.list ?? [];
            for (const topicPath of list) tags.push(topicPath.formatAsTag());
        } catch {
            /* no topic paths */
        }
        let deckPath: string;
        try {
            deckPath = sessionData.deckData.currentDeck?.getTopicPath()?.formatAsTag() ?? "";
        } catch {
            deckPath = "";
        }
        return { tags, deckPath };
    }

    /** Read-aloud context: the card's own tag (`#ENG word:: …`) before the note's tags. */
    private _ttsCardContext(sessionData: SessionData): { tags: string[]; deckPath: string } {
        const ctx = this._speedStreakCardContext(sessionData);
        let cardTag: string | null = null;
        try {
            cardTag =
                sessionData.currentQuestion?.questionText?.topicPathWithWs?.topicPath?.formatAsTag() ??
                null;
        } catch {
            cardTag = null;
        }
        if (cardTag) ctx.tags = [cardTag, ...ctx.tags.filter((t) => t !== cardTag)];
        return ctx;
    }

    private drawCardContext(sessionData: SessionData, settings: SRSettings) {
        if (settings.showContextInCards) {
            this.contextSection = new ContextSectionComponent(this.content);
            this.contextSection.updateCardContext(
                settings.showContextInCards,
                sessionData.currentQuestion,
                sessionData.currentNote,
            );
        }
    }

    private async drawCardFrontContent(sessionData: SessionData, settings: SRSettings) {
        // Update card content
        this.content.empty();

        // Create context section
        this.drawCardContext(sessionData, settings);

        // Build card content
        const wrapper: RenderMarkdownWrapper = new RenderMarkdownWrapper(
            this.app,
            this.plugin,
            sessionData.currentNote.filePath,
        );

        await wrapper.renderMarkdownWrapper(
            sessionData.cardData.currentCard.front.trimStart(),
            this.content,
            sessionData.currentQuestion.questionText.textDirection,
            // sessionData.cardData.currentCardState
        );
        // Set scroll position back to top
        this.content.scrollTop = 0;
    }

    public drawPendingState(nextPendingDueUnix: number): void {
        this.tts.onQuestionShown();
        this.toolbar.setResetButtonDisabled(true);
        this.cardState = CardState.Front;
        this.content.empty();
        this.response.hideAllButtons();
        this.pendingClock = this.content.createDiv({
            cls: "sr-centered",
        });

        const updatePendingClock = () => {
            const startTime = moment();
            const endTime = moment(nextPendingDueUnix);

            // Calculate the difference in milliseconds
            const duration = moment.duration(endTime.diff(startTime));

            const hours = Math.floor(duration.asHours());
            const minutes = duration.minutes();
            const seconds = duration.seconds();

            const formatted = `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

            this.pendingClock?.setText(
                `Waiting for the next FSRS review step. Next card due in ${formatted} (HH:mm:ss).`,
            );
            this.pendingResumeTimeout = window.setTimeout(() => {
                updatePendingClock();
            }, 1000);
        };

        updatePendingClock();
    }

    // #region -> Deck Info

    private setCustomHotKeyState(state: boolean) {
        if (state) {
            if (!this.view.hasClass("sr-custom-hotkeys")) {
                this.view.addClass("sr-custom-hotkeys");
            }
        } else {
            if (this.view.hasClass("sr-custom-hotkeys")) {
                this.view.removeClass("sr-custom-hotkeys");
            }
        }
    }

    private _updateInfoBar(sessionData: SessionData, flashcardCardOrder: string) {
        if (sessionData.deckData.chosenDeck === null || sessionData.deckData.currentDeck === null)
            return;

        this.toolbar.updateInfo(
            sessionData.deckData.chosenDeck,
            sessionData.deckData.currentDeck,
            sessionData.deckData.chosenDeckStats,
            sessionData.deckData.currentDeckStats,
            sessionData.totalCardsInSession,
            sessionData.totalDecksInSession,
            sessionData.deckData.currentDeckTotalCardsInQueue,
            flashcardCardOrder,
        );
    }

    private _setupClozeInputListeners(): void {
        this.clozeInputs = activeDocument.querySelectorAll(".cloze-input");

        this.clozeInputs.forEach((input) => {
            input.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    (input as HTMLElement).blur();
                    this.showAnswerHandler();
                }
            });
        });
    }
    private _evaluateClozeAnswers(): void {
        this.clozeAnswers = activeDocument.querySelectorAll(".cloze-answer");

        if (this.clozeInputs !== null && this.clozeAnswers.length === this.clozeInputs.length) {
            for (let i = 0; i < this.clozeAnswers.length; i++) {
                const clozeInput = this.clozeInputs[i];
                const clozeAnswer = this.clozeAnswers[i] as HTMLElement;

                const inputText = clozeInput.value.trim();
                const answerText = clozeAnswer.innerText.trim();

                clozeAnswer.empty();

                const answerElement = clozeAnswer.createSpan({
                    text: escapeHtml(inputText),
                    cls: "cloze-answer",
                });

                answerElement.setCssProps({
                    color: inputText === answerText ? "green" : "red",
                    "text-Decoration": inputText === answerText ? "none" : "line-through",
                });

                if (inputText !== answerText) {
                    const span = clozeAnswer.createSpan({
                        text: escapeHtml(answerText),
                        cls: "cloze-answer-wrong",
                    });
                    span.setCssProps({
                        color: "green",
                        "text-decoration": "none",
                    });
                }
            }
        }
    }

    public async drawBack(
        sessionData: SessionData,
        reviewMode: FlashcardReviewMode,
        settings: SRSettings,
        determineButtonSchedule: (response: ReviewResponse) => RepItemScheduleInfo | null,
    ) {
        this.setCustomHotKeyState(settings.useCustomHotkeys);
        this.cardState = sessionData.cardData.currentCardState;

        this.toolbar.setResetButtonDisabled(false);

        // Show answer text
        if (sessionData.currentQuestion.questionType !== CardType.Cloze) {
            await this.drawCardFrontContent(sessionData, settings);
            const hr: HTMLElement = activeDocument.createElement("hr");
            this.content.appendChild(hr);
        } else {
            this.content.empty();
            this.drawCardContext(sessionData, settings);
        }

        const wrapper: RenderMarkdownWrapper = new RenderMarkdownWrapper(
            this.app,
            this.plugin,
            sessionData.currentNote.filePath,
        );
        await wrapper.renderMarkdownWrapper(
            sessionData.cardData.currentCard.back,
            this.content,
            sessionData.currentQuestion.questionText.textDirection,
            // sessionData.cardData.currentCardState,
        );

        // Evaluate cloze answers
        this._evaluateClozeAnswers();

        // Switch Speed Streak to the answer timer
        this.speedStreak.onAnswerShown();

        // Read the answer aloud (holds the Speed Streak answer timer while speaking)
        const shownCard = sessionData.cardData.currentCard;
        this.tts.onAnswerShown(
            {
                question: shownCard.front,
                answer: shownCard.back,
                reversedSibling: isReversedSibling(
                    sessionData.currentQuestion.questionType,
                    shownCard.cardIdx,
                ),
            },
            this._ttsCardContext(sessionData),
            this.content,
        );

        // Show response buttons
        this.response.showRatingButtons(
            reviewMode,
            displayRatingLabel(settings.flashcardAgainText, "again", t("AGAIN")),
            displayRatingLabel(settings.flashcardHardText, "hard", t("HARD")),
            displayRatingLabel(settings.flashcardGoodText, "good", t("GOOD")),
            displayRatingLabel(settings.flashcardEasyText, "easy", t("EASY")),
            settings.showIntervalInReviewButtons,
            determineButtonSchedule,
        );
        // NEW: restore keyboard focus after cloze confirmation
        if (this.plugin.uiManager === null) throw new Error("UI manager not initialized!!!");
        this.plugin.uiManager.setSRViewInFocus(true);
        this.response.againButton.buttonEl.focus();
    }

    private _keydownHandler = (e: KeyboardEvent) => {
        if (!this.plugin.isInitialized) throw new Error("SR plugin or data not initialized!!!");
        if (this.plugin.uiManager === null) throw new Error("UI manager not initialized!!!");
        // Prevents any input, if the edit modal is open or if the view is not in focus
        if (
            this.plugin.dataManager.data.settings.useCustomHotkeys ||
            (activeDocument.activeElement !== null &&
                (activeDocument.activeElement.nodeName === "TEXTAREA" ||
                    activeDocument.activeElement.nodeName === "INPUT")) ||
            this.cardState === CardState.Closed ||
            !this.plugin.uiManager.getSRInFocusState() ||
            Platform.isMobile || // No keyboard events on mobile
            EmulatedPlatform().isMobile
        ) {
            return;
        }

        const consumeKeyEvent = () => {
            e.preventDefault();
            e.stopPropagation();
        };

        // Speed Streak shortcuts (pause / boost)
        if (this.speedStreak.handleKey(e)) {
            consumeKeyEvent();
            return;
        }

        // No answering or rating while the Speed Streak pause screen covers the card
        if (this.speedStreak.isPauseScreenShown) return;

        // Read aloud again
        if (this.cardState === CardState.Back && this.tts.handleKey(e)) {
            consumeKeyEvent();
            return;
        }

        switch (e.code) {
            case "KeyS":
                this.skipCardHandler();
                consumeKeyEvent();
                break;
            case "KeyJ":
                void this.jumpToCardHandler();
                consumeKeyEvent();
                break;
            case "Enter":
            case "NumpadEnter":
            case "Space":
                if (this.cardState === CardState.Front) {
                    this.showAnswerHandler();
                    consumeKeyEvent();
                } else if (this.cardState === CardState.Back) {
                    void this.processReviewHandler(ReviewResponse.Good);
                    consumeKeyEvent();
                }
                break;
            case "Numpad1":
            case "Digit1":
                if (this.cardState !== CardState.Back) {
                    break;
                }
                void this.processReviewHandler(ReviewResponse.Hard);
                consumeKeyEvent();
                break;
            case "Numpad2":
            case "Digit2":
                if (this.cardState !== CardState.Back) {
                    break;
                }
                void this.processReviewHandler(ReviewResponse.Good);
                consumeKeyEvent();
                break;
            case "Numpad3":
            case "Digit3":
                if (this.cardState !== CardState.Back) {
                    break;
                }
                void this.processReviewHandler(ReviewResponse.Easy);
                consumeKeyEvent();
                break;
            case "Numpad0":
            case "Digit0":
                if (this.cardState !== CardState.Back) {
                    break;
                }
                void this.processReviewHandler(ReviewResponse.Reset);
                consumeKeyEvent();
                break;
            default:
                break;
        }
    };
}
