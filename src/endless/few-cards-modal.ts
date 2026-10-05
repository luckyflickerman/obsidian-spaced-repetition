/**
 * Endless mode — the warning before starting with fewer than ENDLESS_MIN_CARDS
 * cards: "Start anyway" / "Back to the decks", and "Don't show this again".
 */

import { App, Modal, Setting } from "obsidian";

import { en } from "src/endless/endless-i18n";
import { ENDLESS_MIN_CARDS } from "src/endless/endless-settings";

export interface FewCardsAnswer {
    start: boolean;
    dontShowAgain: boolean;
}

class FewCardsModal extends Modal {
    private count: number;
    private resolve: (answer: FewCardsAnswer) => void;
    private answer: FewCardsAnswer = { start: false, dontShowAgain: false };

    constructor(app: App, count: number, resolve: (answer: FewCardsAnswer) => void) {
        super(app);
        this.count = count;
        this.resolve = resolve;
    }

    onOpen(): void {
        this.modalEl.addClass("sr-endless-few-modal");
        this.setTitle(en("FEW_TITLE"));
        this.contentEl.createEl("p", {
            text: en("FEW_TEXT", { n: this.count, min: ENDLESS_MIN_CARDS }),
        });

        new Setting(this.contentEl).setName(en("FEW_DONT_SHOW")).addToggle((toggle) =>
            toggle.setValue(false).onChange((value) => {
                this.answer.dontShowAgain = value;
            }),
        );

        const buttons = this.contentEl.createDiv("modal-button-container");
        const back = buttons.createEl("button", { text: en("FEW_BACK") });
        back.addEventListener("click", () => this.close());
        const start = buttons.createEl("button", { cls: "sr-bg-accent", text: en("FEW_START") });
        start.addEventListener("click", () => {
            this.answer.start = true;
            this.close();
        });
        start.focus();
    }

    onClose(): void {
        this.contentEl.empty();
        this.resolve(this.answer);
    }
}

/** Shows the warning; resolves when it is closed (Escape = back to the decks). */
export function askFewCards(app: App, count: number): Promise<FewCardsAnswer> {
    return new Promise((resolve) => new FewCardsModal(app, count, resolve).open());
}
