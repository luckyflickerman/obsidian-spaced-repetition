/**
 * Fish note — "Add cards quickly": a small window like Anki's "Add". Front, back, both
 * directions, an image from the gallery / camera / disk, Add. Each card is added as the last
 * line of the note (`#DEN Hund:: pies ![[hund.jpg]]`); nothing above it changes. The window
 * stays open for the next card, so many cards go in one after another, also on a phone.
 */

import { App, Modal, Notice, setIcon, TFile } from "obsidian";

import { appendCardLine, quickCardLine } from "src/fish-note/fish-note";
import { fn } from "src/fish-note/fish-note-i18n";
import type SRPlugin from "src/main";
import { pickImageFile } from "src/utils/image-files";

export class QuickAddModal extends Modal {
    private image: Blob | null = null;
    private added: string[] = [];
    private busy = false;

    constructor(
        app: App,
        private plugin: SRPlugin,
        private file: TFile,
        private tag: string,
        private bothDirections: boolean,
    ) {
        super(app);
    }

    onOpen() {
        this.setTitle(fn("QUICK_TITLE", { tag: this.tag }));
        this.modalEl.addClass("usr-fishnote-quick");
        const el = this.contentEl;

        const field = (label: string) => {
            const wrap = el.createDiv({ cls: "usr-fq-field" });
            wrap.createEl("label", { text: label });
            const input = wrap.createEl("input", { attr: { type: "text", autocomplete: "off" } });
            return input;
        };
        const front = field(fn("FRONT"));
        const back = field(fn("BACK"));

        const row = el.createDiv({ cls: "usr-fq-row" });
        const both = row.createEl("label", { cls: "usr-fq-both" });
        const check = both.createEl("input", { attr: { type: "checkbox" } });
        check.checked = this.bothDirections;
        both.createSpan({ text: fn("BOTH") });

        const imageBtn = row.createEl("button", { cls: "usr-fq-image" });
        const imageIcon = imageBtn.createSpan();
        setIcon(imageIcon, "image-plus");
        const imageText = imageBtn.createSpan({ text: fn("IMAGE") });
        imageBtn.addEventListener("click", () => {
            void pickImageFile().then((blob) => {
                this.image = blob;
                imageBtn.toggleClass("is-chosen", !!blob);
                imageText.setText(
                    blob ? fn("IMAGE_CHOSEN", { name: (blob as File).name ?? "" }) : fn("IMAGE"),
                );
            });
        });

        const addBtn = el.createEl("button", { cls: "mod-cta usr-fq-add", text: fn("ADD") });
        const list = el.createDiv({ cls: "usr-fq-list" });

        const add = async () => {
            if (this.busy) return;
            const sr = this.plugin.dataManager.data.settings;
            const sep = check.checked
                ? sr.singleLineReversedCardSeparator
                : sr.singleLineCardSeparator;
            if (!front.value.trim() || (!back.value.trim() && !this.image)) {
                new Notice(fn("NEED_BOTH"));
                return;
            }
            this.busy = true;
            addBtn.disabled = true;
            try {
                let link: string | null = null;
                if (this.image && this.plugin.cardAuthoring) {
                    const saved = await this.plugin.cardAuthoring.saveCardImage(
                        this.image,
                        front.value,
                        this.file,
                    );
                    link = this.app.metadataCache.fileToLinktext(saved, this.file.path, true);
                }
                const line = quickCardLine(this.tag, front.value, back.value, sep, link);
                if (!line) return;
                await this.app.vault.process(this.file, (text) => appendCardLine(text, line));
                this.added.unshift(line.slice(this.tag.length).trim());
                list.empty();
                list.createDiv({
                    cls: "usr-fq-count",
                    text: fn("ADDED", { n: this.added.length }),
                });
                for (const card of this.added.slice(0, 5)) list.createDiv({ text: card });
                front.value = "";
                back.value = "";
                this.image = null;
                imageBtn.removeClass("is-chosen");
                imageText.setText(fn("IMAGE"));
                front.focus();
            } catch (e) {
                console.error("[Fish note] quick add", e);
                new Notice(String(e));
            } finally {
                this.busy = false;
                addBtn.disabled = false;
            }
        };

        addBtn.addEventListener("click", () => void add());
        front.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                back.focus();
            }
        });
        back.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                void add();
            }
        });
        window.setTimeout(() => front.focus(), 0);
    }

    onClose() {
        this.contentEl.empty();
    }
}
