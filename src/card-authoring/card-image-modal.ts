/**
 * Card authoring — the window opened by tapping an image thumbnail in a card line: the image
 * bigger, and buttons to move it to the question / answer, replace it, remove it from the card
 * or open the file. Works the same with a mouse and a finger (44 px buttons).
 */

import { App, Modal, setIcon, TFile } from "obsidian";

import { ca } from "src/card-authoring/card-authoring-i18n";

export interface CardImageActions {
    /** Image file (null when the link points to nothing) */
    file: TFile | null;
    link: string;
    /** Side of a one-line card the image is on (null: a multi-line card — no moving) */
    side: "front" | "back" | null;
    move(side: "front" | "back"): void;
    replace(): void;
    remove(): void;
    openFile(): void;
}

export class CardImageModal extends Modal {
    constructor(
        app: App,
        private actions: CardImageActions,
    ) {
        super(app);
    }

    onOpen() {
        const a = this.actions;
        this.setTitle(a.file?.basename ?? a.link);
        this.modalEl.addClass("sr-ca-image-modal");
        const el = this.contentEl;

        if (a.file) {
            el.createEl("img", {
                cls: "sr-ca-image-big",
                attr: { src: this.app.vault.getResourcePath(a.file), alt: a.file.basename },
            });
        } else {
            el.createDiv({ cls: "sr-ca-muted", text: ca("IMAGE_MISSING", { name: a.link }) });
        }
        if (a.side) {
            el.createDiv({
                cls: "sr-ca-muted sr-ca-image-side",
                text: a.side === "front" ? ca("IMAGE_ON_FRONT") : ca("IMAGE_ON_BACK"),
            });
        }

        const bar = el.createDiv({ cls: "sr-ca-image-actions" });
        const button = (icon: string, text: string, run: () => void, warning = false) => {
            const b = bar.createEl("button", { cls: warning ? "mod-warning" : "" });
            setIcon(b.createSpan({ cls: "sr-ca-image-action-icon" }), icon);
            b.createSpan({ text });
            b.addEventListener("click", () => {
                this.close();
                run();
            });
        };
        if (a.side === "back") button("arrow-up", ca("IMAGE_TO_FRONT"), () => a.move("front"));
        if (a.side === "front") button("arrow-down", ca("IMAGE_TO_BACK"), () => a.move("back"));
        button("replace", ca("IMAGE_REPLACE"), () => a.replace());
        if (a.file) button("external-link", ca("IMAGE_OPEN"), () => a.openFile());
        button("trash-2", ca("IMAGE_REMOVE"), () => a.remove(), true);
    }

    onClose() {
        this.contentEl.empty();
    }
}
