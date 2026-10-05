import "src/ui/obsidian-ui-components/content-container/deck-container/deck-list-header.css";
import { DropdownComponent, Platform, setIcon } from "obsidian";

import { ad } from "src/addons/addons-i18n";
import { en } from "src/endless/endless-i18n";
import { t } from "src/lang/helpers";
import type { ReviewWindowControls } from "src/review-window/review-window-controller";
import { FlashcardReviewMode } from "src/scheduling/flashcard-review-sequencer";
import FullscreenButtonComponent from "src/ui/obsidian-ui-components/content-container/fullscreen-button";
import ModalCloseButtonComponent from "src/ui/obsidian-ui-components/content-container/modal-close-button";
import SRButtonComponent from "src/ui/sr-button";
import EmulatedPlatform from "src/utils/platform-detector";

export default class DeckListHeaderComponent {
    private header: HTMLDivElement;
    private deckIcon: HTMLElement;
    private title: HTMLDivElement;
    private reviewModeDropdown: DropdownComponent;

    public constructor(
        parentEl: HTMLElement,
        changeReviewMode: (reviewMode: FlashcardReviewMode) => void,
        closeModal?: () => void,
        openOptions?: () => void,
        windowControls?: ReviewWindowControls,
    ) {
        this.header = parentEl.createDiv();
        this.header.addClass("sr-deck-list-header");
        this.header.addClass("sr-header");

        this.deckIcon = this.header.createDiv();
        this.deckIcon.addClass("sr-deck-icon");
        setIcon(this.deckIcon, "layers");

        this.title = this.header.createDiv();
        this.title.addClass("sr-title");
        this.title.setText(t("DECKS"));

        this.header.createDiv().addClass("sr-flex-spacer");
        this.reviewModeDropdown = new DropdownComponent(this.header);
        const reviewModeOptions: Record<string, string> = {
            Review: t("REVIEW_MODE"),
            Cram: t("CRAM_MODE"),
            Endless: en("MODE"),
        };
        this.reviewModeDropdown.addOptions(reviewModeOptions);
        this.reviewModeDropdown.setValue("Review");

        this.reviewModeDropdown.onChange((value) => {
            if (value === undefined) return;
            if (value === "Review") changeReviewMode(FlashcardReviewMode.Review);
            if (value === "Cram") changeReviewMode(FlashcardReviewMode.Cram);
            if (value === "Endless") changeReviewMode(FlashcardReviewMode.Endless);
        });

        const isPhone = EmulatedPlatform().isPhone || Platform.isPhone;

        // Full screen (review window only)
        if (windowControls !== undefined) {
            new FullscreenButtonComponent(this.header, windowControls, [
                isPhone ? "mod-raised" : "clickable-icon",
            ]);
        }

        // Options of the plugin and its built-in plugins: left of the close button
        if (openOptions !== undefined) {
            new SRButtonComponent(this.header, {
                classNames: ["sr-options-button", isPhone ? "mod-raised" : "clickable-icon"],
                icon: "settings",
                tooltip: ad("BUTTON"),
                onClick: () => openOptions(),
            });
        }

        // If we don't have a close modal, we don't need the close button
        if (closeModal === undefined) return;

        // Same style as the neighbouring buttons (on a phone: a big raised button, 44 px)
        const closeButtonClasses = [
            "sr-modal-close-button",
            isPhone ? "mod-raised" : "clickable-icon",
        ];

        new ModalCloseButtonComponent(
            this.header,
            () => closeModal && closeModal(),
            closeButtonClasses,
        );
    }

    public updateReviewMode(reviewMode: FlashcardReviewMode) {
        this.reviewModeDropdown.setValue(
            reviewMode === FlashcardReviewMode.Review
                ? "Review"
                : reviewMode === FlashcardReviewMode.Endless
                  ? "Endless"
                  : "Cram",
        );
    }
}
