/**
 * Card authoring — CodeMirror 6 extension (Live Preview only): every `<!--SR:…-->` schedule
 * comment is shown as a small calendar icon; its tooltip says when the next review is.
 *
 * Display only: the note text is never changed. When the cursor (or a selection) is on the line,
 * the comment is shown as it is, so it can still be edited or copied. Tapping the icon puts the
 * cursor there. Source mode always shows the plain text.
 */

import { Extension, Range, StateEffect } from "@codemirror/state";
import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from "@codemirror/view";
import { editorLivePreviewField, setIcon } from "obsidian";

import { findScheduleComments, isScheduleOnlyLine } from "src/card-authoring/schedule-comment";

export interface ScheduleCommentHost {
    /** Switched on in the settings */
    enabled(): boolean;
    /** Tooltip / screen reader text for the next review dates (YYYY-MM-DD) */
    label(dates: string[]): string;
}

const REFRESH = StateEffect.define<null>();

class ScheduleIconWidget extends WidgetType {
    constructor(
        private label: string,
        private pos: number,
    ) {
        super();
    }

    eq(other: ScheduleIconWidget): boolean {
        return other.label === this.label && other.pos === this.pos;
    }

    toDOM(view: EditorView): HTMLElement {
        const el = activeDocument.createElement("span");
        el.className = "usr-sr-chip";
        setIcon(el, "calendar-clock");
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", this.label);
        el.setAttribute("title", this.label);
        el.addEventListener("mousedown", (e) => e.preventDefault());
        el.addEventListener("click", (e) => {
            e.preventDefault();
            // Cursor onto the comment: the line then shows the plain text for editing
            view.dispatch({ selection: { anchor: this.pos } });
            view.focus();
        });
        return el;
    }

    ignoreEvent(): boolean {
        return true;
    }
}

function isLivePreview(view: EditorView): boolean {
    try {
        return view.state.field(editorLivePreviewField, false) === true;
    } catch {
        return false;
    }
}

function buildDecorations(view: EditorView, host: ScheduleCommentHost): DecorationSet {
    if (!host.enabled() || !isLivePreview(view)) return Decoration.none;
    const doc = view.state.doc;

    // Lines with the cursor or a selection keep the plain text
    const activeLines = new Set<number>();
    for (const r of view.state.selection.ranges) {
        const first = doc.lineAt(r.from).number;
        const last = doc.lineAt(r.to).number;
        for (let n = first; n <= last; n++) activeLines.add(n);
    }

    const decos: Range<Decoration>[] = [];
    const doneLines = new Set<number>();
    for (const { from, to } of view.visibleRanges) {
        const start = doc.lineAt(from).from;
        const end = doc.lineAt(to).to;
        const text = doc.sliceString(start, end);
        for (const c of findScheduleComments(text)) {
            const pos = start + c.from;
            const line = doc.lineAt(pos);
            if (activeLines.has(line.number)) continue;
            if (!doneLines.has(line.number) && isScheduleOnlyLine(line.text)) {
                decos.push(Decoration.line({ class: "usr-sr-only-line" }).range(line.from));
            }
            doneLines.add(line.number);
            decos.push(
                Decoration.replace({
                    widget: new ScheduleIconWidget(host.label(c.dates), pos),
                }).range(pos, start + c.to),
            );
        }
    }
    return Decoration.set(decos, true);
}

export function scheduleCommentExtension(host: ScheduleCommentHost): Extension {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(private view: EditorView) {
                this.decorations = this.compute();
            }

            private compute(): DecorationSet {
                try {
                    return buildDecorations(this.view, host);
                } catch (e) {
                    console.error("[Card authoring] schedule comment icons failed", e);
                    return Decoration.none;
                }
            }

            update(u: ViewUpdate) {
                const modeChanged =
                    u.startState.field(editorLivePreviewField, false) !==
                    u.state.field(editorLivePreviewField, false);
                if (
                    u.docChanged ||
                    u.viewportChanged ||
                    u.selectionSet ||
                    modeChanged ||
                    u.transactions.some((t) => t.effects.some((e) => e.is(REFRESH)))
                ) {
                    this.decorations = this.compute();
                }
            }
        },
        { decorations: (v) => v.decorations },
    );
}

/** Redraws the icons in every open editor (after a settings change). */
export function refreshScheduleIcons(views: EditorView[]) {
    for (const view of views) view.dispatch({ effects: REFRESH.of(null) });
}
