/**
 * Card authoring — preview of a card from the editor: rendered exactly like
 * in the review (same RenderMarkdownWrapper), 🔊, status, deck, language,
 * duplicate warning and, for `:::` cards, both directions.
 * A popover next to the icon on computers, a Modal on phones / tablets.
 */

import { App, Modal, Platform, setIcon } from "obsidian";

import { ca } from "src/card-authoring/card-authoring-i18n";
import type { DetectedCard, UnfinishedLine } from "src/card-authoring/card-detect";
import { scheduleDates } from "src/card-authoring/card-detect";
import type { CardRef } from "src/card-authoring/card-duplicates";
import type SRPlugin from "src/main";
import type { SpeechCard } from "src/tts/tts-text";
import { RenderMarkdownWrapper } from "src/utils/renderers";
import { TextDirection } from "src/utils/strings";

export interface PreviewData {
    filePath: string;
    card: DetectedCard | null;
    unfinished: UnfinishedLine | null;
    deckTag: string | null;
    /** Reading language of the card (null = not read) */
    lang: string | null;
    duplicates: CardRef[];
    /** "4/10" — shown on phones (no status bar there) */
    counter: string | null;
}

export interface PreviewCallbacks {
    speak(card: SpeechCard, lang: string | null): void;
    openRef(ref: CardRef): void;
}

function langLabel(lang: string | null): string {
    return lang ? lang.split("-")[0].toUpperCase() : ca("UNKNOWN_LANG");
}

/** Builds the preview content into `el`. */
async function renderPreview(
    el: HTMLElement,
    app: App,
    plugin: SRPlugin,
    data: PreviewData,
    callbacks: PreviewCallbacks,
    close: () => void,
) {
    el.empty();
    el.addClass("sr-ca-preview");

    const head = el.createDiv({ cls: "sr-ca-preview-head" });
    head.createSpan({ cls: "sr-ca-preview-deck", text: data.deckTag ?? "" });
    head.createSpan({ cls: "sr-ca-preview-lang", text: langLabel(data.lang) });
    if (data.counter)
        head.createSpan({ cls: "sr-ca-preview-counter", text: ca("COUNTER", { n: data.counter }) });

    // Unfinished line: the word and a hint
    if (!data.card) {
        const word = data.unfinished?.text ?? "";
        el.createDiv({ cls: "sr-ca-preview-warn", text: ca("UNFINISHED") });
        const body = el.createDiv({ cls: "sr-ca-preview-side" });
        await new RenderMarkdownWrapper(app, plugin, data.filePath).renderMarkdownWrapper(
            word,
            body,
            TextDirection.Ltr,
        );
        addListen(el, () => callbacks.speak({ question: word, answer: "" }, data.lang));
        return;
    }

    const card = data.card;
    if (!card.complete) el.createDiv({ cls: "sr-ca-preview-warn", text: ca("INCOMPLETE") });

    // Directions (`:::` cards): EN → PL and PL → EN
    let reversedSide = false;
    const tabs = card.reversed ? el.createDiv({ cls: "sr-ca-preview-tabs" }) : null;
    const sides = el.createDiv({ cls: "sr-ca-preview-sides" });
    const foreign = langLabel(data.lang);

    const draw = async () => {
        sides.empty();
        const question = reversedSide ? card.answer : card.question;
        const answer = reversedSide ? card.question : card.answer;
        const renderer = new RenderMarkdownWrapper(app, plugin, data.filePath);
        const q = sides.createDiv({ cls: "sr-ca-preview-side" });
        await renderer.renderMarkdownWrapper(question, q, TextDirection.Ltr);
        sides.createEl("hr");
        const a = sides.createDiv({ cls: "sr-ca-preview-side" });
        await renderer.renderMarkdownWrapper(answer, a, TextDirection.Ltr);
    };

    if (tabs) {
        const buttons: HTMLButtonElement[] = [];
        const tab = (label: string, reversed: boolean) => {
            const b = tabs.createEl("button", { cls: "sr-ca-preview-tab", text: label });
            b.toggleClass("is-active", reversed === reversedSide);
            buttons.push(b);
            b.addEventListener("click", () => {
                reversedSide = reversed;
                buttons.forEach((x, i) => x.toggleClass("is-active", (i === 1) === reversed));
                void draw();
            });
        };
        tab(`${foreign} → PL`, false);
        tab(`PL → ${foreign}`, true);
    }
    await draw();

    addListen(el, () =>
        callbacks.speak(
            {
                question: reversedSide ? card.answer : card.question,
                answer: reversedSide ? card.question : card.answer,
                reversedSibling: reversedSide,
            },
            data.lang,
        ),
    );

    // Status: new / next review per direction
    const dates = scheduleDates(card.schedule);
    const status = el.createDiv({ cls: "sr-ca-preview-status" });
    status.createSpan({ cls: "sr-ca-preview-label", text: `${ca("STATUS")}: ` });
    status.createSpan({
        text:
            dates.length === 0 ? ca("STATUS_NEW") : ca("STATUS_NEXT", { date: dates.join(" / ") }),
    });

    // Possible duplicates with links
    if (data.duplicates.length > 0) {
        const dup = el.createDiv({ cls: "sr-ca-preview-dups" });
        dup.createDiv({ cls: "sr-ca-preview-warn", text: ca("POSSIBLE_DUPLICATE") });
        for (const ref of data.duplicates.slice(0, 5)) {
            const link = dup.createEl("button", { cls: "sr-ca-preview-link" });
            link.setText(
                `${ref.question} — ${ref.file.split("/").pop()} · ${ca("LINE", { n: ref.line + 1 })}`,
            );
            link.addEventListener("click", () => {
                close();
                callbacks.openRef(ref);
            });
        }
    }
}

function addListen(el: HTMLElement, onClick: () => void) {
    const btn = el.createEl("button", { cls: "sr-ca-preview-listen" });
    const icon = btn.createSpan();
    setIcon(icon, "volume-2");
    btn.createSpan({ text: ca("LISTEN") });
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        onClick();
    });
}

class CardPreviewModal extends Modal {
    constructor(
        app: App,
        private plugin: SRPlugin,
        private data: PreviewData,
        private callbacks: PreviewCallbacks,
    ) {
        super(app);
    }

    onOpen() {
        this.setTitle(ca("PREVIEW"));
        this.modalEl.addClass("sr-ca-preview-modal");
        void renderPreview(this.contentEl, this.app, this.plugin, this.data, this.callbacks, () =>
            this.close(),
        );
    }

    onClose() {
        this.contentEl.empty();
    }
}

let openPopover: { el: HTMLElement; close: () => void } | null = null;

/** Opens the preview: popover next to `anchor` on computers, Modal on phones / tablets. */
export function openCardPreview(
    app: App,
    plugin: SRPlugin,
    data: PreviewData,
    callbacks: PreviewCallbacks,
    anchor: HTMLElement,
) {
    openPopover?.close();
    if (Platform.isMobile) {
        new CardPreviewModal(app, plugin, data, callbacks).open();
        return;
    }

    const el = activeDocument.body.createDiv({ cls: "sr-ca-popover" });
    const close = () => {
        el.remove();
        activeDocument.removeEventListener("pointerdown", onOutside, true);
        activeDocument.removeEventListener("keydown", onKey, true);
        if (openPopover?.el === el) openPopover = null;
    };
    const onOutside = (e: PointerEvent) => {
        if (!el.contains(e.target as Node) && e.target !== anchor) close();
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
    };
    activeDocument.addEventListener("pointerdown", onOutside, true);
    activeDocument.addEventListener("keydown", onKey, true);
    openPopover = { el, close };

    // place below the icon, inside the window
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(380, window.innerWidth - 16);
    const left = Math.max(
        8,
        Math.min(rect.left - width + rect.width, window.innerWidth - width - 8),
    );
    el.setCssProps({
        "--sr-ca-left": `${left}px`,
        "--sr-ca-top": `${rect.bottom + 6}px`,
        "--sr-ca-width": `${width}px`,
    });
    void renderPreview(el, app, plugin, data, callbacks, close).then(() => {
        // flip above the icon when it does not fit below
        const h = el.offsetHeight;
        if (rect.bottom + 6 + h > window.innerHeight && rect.top - 6 - h > 0)
            el.setCssProps({ "--sr-ca-top": `${rect.top - 6 - h}px` });
    });
}
