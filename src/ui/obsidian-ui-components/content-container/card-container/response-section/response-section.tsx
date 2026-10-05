import "src/ui/obsidian-ui-components/content-container/card-container/response-section/response-section.css";

import { SRSettings } from "src/data/settings";
import { en } from "src/endless/endless-i18n";
import { t } from "src/lang/helpers";
import { displayRatingLabel, localizeInterval } from "src/review-window/rating-labels";
import { RepItemScheduleInfo } from "src/scheduling/algorithms/base/rep-item-schedule-info";
import { ReviewResponse } from "src/scheduling/algorithms/base/repetition-item";
import { formatScheduleInterval } from "src/scheduling/algorithms/schedule-display";
import { FlashcardReviewMode } from "src/scheduling/flashcard-review-sequencer";
import { isPolish } from "src/speed-streak/speed-streak-i18n";
import SRResponseButtonComponent from "src/ui/obsidian-ui-components/content-container/card-container/response-section/sr-response-button";

export default class ResponseSectionComponent {
    public responseEl: HTMLDivElement;
    public againButton: SRResponseButtonComponent;
    public hardButton: SRResponseButtonComponent;
    public goodButton: SRResponseButtonComponent;
    public easyButton: SRResponseButtonComponent;
    public answerButton: SRResponseButtonComponent;

    constructor(
        container: HTMLElement,
        settings: SRSettings,
        showAnswer: () => void,
        processReview: (response: ReviewResponse) => Promise<void>,
    ) {
        this.responseEl = container.createDiv();
        this.responseEl.addClass("sr-response");

        this.answerButton = new SRResponseButtonComponent(this.responseEl, {
            classNames: ["sr-bg-accent", "sr-show-answer-button"],
            text: t("SHOW_ANSWER"),
            onClick: () => {
                showAnswer();
            },
        });

        this.againButton = new SRResponseButtonComponent(this.responseEl, {
            classNames: ["sr-bg-red", "sr-again-button", "sr-is-hidden"],
            text: displayRatingLabel(settings.flashcardAgainText, "again", t("AGAIN")),
            onClick: async () => {
                await processReview(ReviewResponse.Again);
            },
        });

        this.hardButton = new SRResponseButtonComponent(this.responseEl, {
            classNames: ["sr-bg-yellow", "sr-hard-button", "sr-is-hidden"],
            text: displayRatingLabel(settings.flashcardHardText, "hard", t("HARD")),
            onClick: async () => {
                await processReview(ReviewResponse.Hard);
            },
        });

        this.goodButton = new SRResponseButtonComponent(this.responseEl, {
            classNames: ["sr-bg-blue", "sr-good-button", "sr-is-hidden"],
            text: displayRatingLabel(settings.flashcardGoodText, "good", t("GOOD")),
            onClick: async () => {
                await processReview(ReviewResponse.Good);
            },
        });

        this.easyButton = new SRResponseButtonComponent(this.responseEl, {
            classNames: ["sr-bg-green", "sr-easy-button", "sr-is-hidden"],
            text: displayRatingLabel(settings.flashcardEasyText, "easy", t("EASY")),
            onClick: async () => {
                await processReview(ReviewResponse.Easy);
            },
        });
    }

    public resetResponseButtons() {
        // Sets all buttons in to their default state
        if (this.responseEl.hasClass("sr-is-hidden")) {
            this.responseEl.removeClass("sr-is-hidden");
        }
        this.answerButton.buttonEl.removeClass("sr-is-hidden");
        this.againButton.buttonEl.addClass("sr-is-hidden");
        this.hardButton.buttonEl.addClass("sr-is-hidden");
        this.goodButton.buttonEl.addClass("sr-is-hidden");
        this.easyButton.buttonEl.addClass("sr-is-hidden");
    }

    public hideAllButtons() {
        if (!this.responseEl.hasClass("sr-is-hidden")) {
            this.responseEl.addClass("sr-is-hidden");
        }
        this.answerButton.buttonEl.addClass("sr-is-hidden");
        this.againButton.buttonEl.addClass("sr-is-hidden");
        this.hardButton.buttonEl.addClass("sr-is-hidden");
        this.goodButton.buttonEl.addClass("sr-is-hidden");
        this.easyButton.buttonEl.addClass("sr-is-hidden");
    }

    public showRatingButtons(
        reviewMode: FlashcardReviewMode,
        againButtonText: string,
        hardButtonText: string,
        goodButtonText: string,
        easyButtonText: string,
        showIntervalInReviewButtons: boolean,
        determineButtonSchedule: (response: ReviewResponse) => RepItemScheduleInfo | null,
    ) {
        if (this.responseEl.hasClass("sr-is-hidden")) {
            this.responseEl.removeClass("sr-is-hidden");
        }
        // Shows the rating buttons and hides the show answer button
        this.answerButton.buttonEl.addClass("sr-is-hidden");

        if (reviewMode === FlashcardReviewMode.Cram) {
            this.responseEl.removeClass("is-endless");
            this.responseEl.addClass("is-cram");
            this.againButton.setButtonText(`${againButtonText}`);
            this.easyButton.setButtonText(`${easyButtonText}`);

            if (this.againButton.buttonEl.hasClass("sr-is-hidden")) {
                this.againButton.buttonEl.removeClass("sr-is-hidden");
            }
            if (this.easyButton.buttonEl.hasClass("sr-is-hidden")) {
                this.easyButton.buttonEl.removeClass("sr-is-hidden");
            }

            if (!this.goodButton.buttonEl.hasClass("sr-is-hidden")) {
                this.goodButton.buttonEl.addClass("sr-is-hidden");
            }
            if (!this.hardButton.buttonEl.hasClass("sr-is-hidden")) {
                this.hardButton.buttonEl.addClass("sr-is-hidden");
            }
        } else if (reviewMode === FlashcardReviewMode.Endless) {
            // Nothing is scheduled: the second line says when the card comes back
            this.responseEl.removeClass("is-cram");
            this.responseEl.addClass("is-endless");
            const lines: [SRResponseButtonComponent, string, string][] = [
                [this.againButton, againButtonText, en("SOON")],
                [this.hardButton, hardButtonText, en("LATER")],
                [this.goodButton, goodButtonText, en("ROUND_END")],
                [this.easyButton, easyButtonText, en("ROUND_END")],
            ];
            for (const [button, name, when] of lines) {
                button.buttonEl.removeClass("sr-is-hidden");
                this._setTwoLines(button, name, when);
            }
        } else {
            if (this.responseEl.hasClass("is-cram")) this.responseEl.removeClass("is-cram");
            this.responseEl.removeClass("is-endless");
            this.againButton.buttonEl.removeClass("sr-is-hidden");
            this.hardButton.buttonEl.removeClass("sr-is-hidden");
            this.goodButton.buttonEl.removeClass("sr-is-hidden");
            this.easyButton.buttonEl.removeClass("sr-is-hidden");
            this._setupEaseButton(
                this.againButton,
                againButtonText,
                determineButtonSchedule(ReviewResponse.Again),
                showIntervalInReviewButtons,
            );
            this._setupEaseButton(
                this.hardButton,
                hardButtonText,
                determineButtonSchedule(ReviewResponse.Hard),
                showIntervalInReviewButtons,
            );
            this._setupEaseButton(
                this.goodButton,
                goodButtonText,
                determineButtonSchedule(ReviewResponse.Good),
                showIntervalInReviewButtons,
            );
            this._setupEaseButton(
                this.easyButton,
                easyButtonText,
                determineButtonSchedule(ReviewResponse.Easy),
                showIntervalInReviewButtons,
            );
        }
    }

    private _setupEaseButton(
        button: SRResponseButtonComponent,
        buttonName: string,
        schedule: RepItemScheduleInfo | null,
        showInterval: boolean,
    ) {
        if (showInterval) {
            // Two lines on every device: the rating name, and the full interval under it
            // ("1 min", "8 dni"), so the buttons are never told apart by colour alone
            const interval = localizeInterval(formatScheduleInterval(schedule, false), isPolish());
            this._setTwoLines(button, buttonName, interval);
        } else {
            button.buttonEl.removeClass("sr-two-line");
            if (button.buttonEl.hasClass("sr-show-small-text")) {
                button.buttonEl.removeClass("sr-show-small-text");
            }
            if (!button.buttonEl.hasClass("sr-show-large-text")) {
                button.buttonEl.addClass("sr-show-large-text");
            }
            button.setLargeText(buttonName);
            button.buttonEl.setAttr("aria-label", buttonName);
        }
    }

    /** Rating name, and under it the interval (or when the card comes back). */
    private _setTwoLines(button: SRResponseButtonComponent, name: string, second: string) {
        button.setLargeText(name);
        button.setSmallText(second);
        button.buttonEl.addClass("sr-show-large-text");
        button.buttonEl.addClass("sr-show-small-text");
        button.buttonEl.addClass("sr-two-line");
        button.buttonEl.setAttr("aria-label", `${name}, ${second}`);
    }
}
