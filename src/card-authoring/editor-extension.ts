/**
 * Card authoring — CodeMirror 6 extension (Live Preview and source mode):
 * a preview icon at the end of every card line, a "!" icon plus a soft yellow underline for
 * unfinished cards, a tap on the icon opens the preview, and Tab in a card
 * template jumps from the word to the translation.
 *
 * Performance: only the visible part of the note is parsed (expanded to the
 * surrounding blank lines so multi-line cards stay whole), 300 ms after typing.
 */

import { Extension, Prec, RangeSetBuilder, StateEffect, Text } from "@codemirror/state";
import {
    Decoration,
    DecorationSet,
    EditorView,
    keymap,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from "@codemirror/view";

import { CardDetectSettings, detectCards, isFlashcardNote } from "src/card-authoring/card-detect";

export interface CardEditorHost {
    /** Icons switched on in the settings */
    iconsEnabled(): boolean;
    detectSettings(): CardDetectSettings;
    /** Tap on an icon (line is 0-based) */
    openPreview(view: EditorView, line: number, anchor: HTMLElement): void;
    /** Tab pressed; return true when handled */
    handleTab(view: EditorView): boolean;
    iconLabel(kind: "card" | "warn"): string;
}

const REBUILD = StateEffect.define<null>();
const DEBOUNCE_MS = 300;
/** How far to look for the blank line that starts / ends a block of cards */
const MAX_EXPAND = 200;

/**
 * Line icons drawn in the text color: a rounded square with a side panel
 * ("open the preview") or with an exclamation mark (unfinished card).
 */
function iconSvg(kind: "card" | "warn"): SVGSVGElement {
    const NS = "http://www.w3.org/2000/svg";
    const svg = activeDocument.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const add = (tag: string, attrs: Record<string, string>) => {
        const el = activeDocument.createElementNS(NS, tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        svg.appendChild(el);
    };
    add("rect", { x: "3", y: "3", width: "18", height: "18", rx: "4" });
    if (kind === "card") {
        add("path", { d: "M15 3v18" });
    } else {
        add("path", { d: "M12 7.5v5.5" });
        add("path", { d: "M12 16.5h.01" });
    }
    return svg;
}

class CardIconWidget extends WidgetType {
    constructor(
        private kind: "card" | "warn",
        private line: number,
        private host: CardEditorHost,
    ) {
        super();
    }

    eq(other: CardIconWidget): boolean {
        return other.kind === this.kind && other.line === this.line;
    }

    toDOM(view: EditorView): HTMLElement {
        const el = activeDocument.createElement("span");
        el.className = `sr-ca-icon sr-ca-icon-${this.kind}`;
        el.appendChild(iconSvg(this.kind));
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", this.host.iconLabel(this.kind));
        // keep the cursor where it is
        el.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        el.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.host.openPreview(view, this.line, el);
        });
        return el;
    }

    ignoreEvent(): boolean {
        return true;
    }
}

/** Line ranges (0-based, inclusive) to parse: visible lines grown to blank-line boundaries. */
function sliceRanges(view: EditorView): Array<[number, number]> {
    const doc = view.state.doc;
    const isBlank = (n: number) => doc.line(n + 1).text.trim() === "";
    const ranges: Array<[number, number]> = [];
    for (const { from, to } of view.visibleRanges) {
        let start = doc.lineAt(from).number - 1;
        let end = doc.lineAt(to).number - 1;
        for (let i = 0; i < MAX_EXPAND && start > 0 && !isBlank(start - 1); i++) start--;
        for (let i = 0; i < MAX_EXPAND && end < doc.lines - 1 && !isBlank(end + 1); i++) end++;
        const last = ranges[ranges.length - 1];
        if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
        else ranges.push([start, end]);
    }
    return ranges;
}

function buildDecorations(
    view: EditorView,
    host: CardEditorHost,
    isCardNote: boolean,
): DecorationSet {
    if (!host.iconsEnabled() || !isCardNote) return Decoration.none;
    const doc = view.state.doc;
    const settings = host.detectSettings();
    const marks: Array<{ pos: number; deco: Decoration; order: number }> = [];
    const seen = new Set<number>();

    for (const [start, end] of sliceRanges(view)) {
        const text = doc.sliceString(doc.line(start + 1).from, doc.line(end + 1).to);
        const result = detectCards(text, settings, { assumeFlashcardNote: true });
        const add = (line: number, kind: "card" | "warn") => {
            if (seen.has(line)) return;
            seen.add(line);
            const docLine = doc.line(line + 1);
            if (kind === "warn") {
                marks.push({
                    pos: docLine.from,
                    deco: Decoration.line({ class: "sr-ca-unfinished-line" }),
                    order: 0,
                });
            }
            marks.push({
                pos: docLine.to,
                deco: Decoration.widget({ widget: new CardIconWidget(kind, line, host), side: 1 }),
                order: 1,
            });
        };
        for (const card of result.cards)
            add(start + card.firstLine, card.complete ? "card" : "warn");
        for (const u of result.unfinished) add(start + u.line, "warn");
    }

    marks.sort((a, b) => a.pos - b.pos || a.order - b.order);
    const builder = new RangeSetBuilder<Decoration>();
    for (const m of marks) builder.add(m.pos, m.pos, m.deco);
    return builder.finish();
}

export function cardEditorExtension(host: CardEditorHost): Extension {
    const plugin = ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;
            private pending: DecorationSet | null = null;
            private timer: number | null = null;
            private checkedDoc: Text | null = null;
            private cardNote = false;

            constructor(private view: EditorView) {
                this.decorations = this.compute();
            }

            /** Full-note check for a flashcard tag, only when the text changed. */
            private isCardNote(): boolean {
                const doc = this.view.state.doc;
                if (doc !== this.checkedDoc) {
                    this.checkedDoc = doc;
                    this.cardNote = isFlashcardNote(doc.toString(), host.detectSettings());
                }
                return this.cardNote;
            }

            private compute(): DecorationSet {
                try {
                    return buildDecorations(this.view, host, this.isCardNote());
                } catch (e) {
                    console.error("[Card authoring] editor icons failed", e);
                    return Decoration.none;
                }
            }

            private schedule(ms: number) {
                if (this.timer !== null) window.clearTimeout(this.timer);
                this.timer = window.setTimeout(() => {
                    this.timer = null;
                    this.pending = this.compute();
                    this.view.dispatch({ effects: REBUILD.of(null) });
                }, ms);
            }

            update(u: ViewUpdate) {
                if (u.transactions.some((t) => t.effects.some((e) => e.is(REBUILD)))) {
                    // pending: computed by the timer; none: a refresh request (settings changed)
                    this.decorations = this.pending ?? this.compute();
                    this.pending = null;
                    return;
                }
                if (u.docChanged) {
                    this.decorations = this.decorations.map(u.changes);
                    this.schedule(DEBOUNCE_MS);
                } else if (u.viewportChanged) {
                    this.schedule(100);
                }
            }

            destroy() {
                if (this.timer !== null) window.clearTimeout(this.timer);
            }
        },
        { decorations: (v) => v.decorations },
    );

    const tab = Prec.highest(keymap.of([{ key: "Tab", run: (view) => host.handleTab(view) }]));
    return [plugin, tab];
}

/** Asks every open editor to redraw the icons (after a settings change). */
export function refreshCardIcons(views: EditorView[]) {
    for (const view of views) view.dispatch({ effects: REBUILD.of(null) });
}
