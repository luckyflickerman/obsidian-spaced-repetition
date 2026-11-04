/**
 * Card authoring — CodeMirror 6 extension (Live Preview only): every `<!--SR:…-->` schedule
 * comment is shown as a small calendar icon; its tooltip says when the next review is.
 *
 * A comment on its own line under a card is folded into the card's line: the icon sits at the
 * end of the card (next to the preview icon) and the comment line takes no room, so many cards
 * fit on the screen.
 *
 * Display only: the note text is never changed. When the cursor (or a selection) is on the card
 * or on the comment, both lines are shown as they are, so the comment can still be edited or
 * copied (and Enter at the end of the card never lands between the card and its comment unseen).
 * Tapping the icon puts the cursor there. Source mode always shows the plain text.
 *
 * Hiding a line break is only allowed for decorations from a state field (not a view plugin),
 * so the decorations live in a StateField; the comment positions are found again only when the
 * text changes.
 */

import { EditorState, Extension, Range, StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { editorLivePreviewField, setIcon } from "obsidian";

import {
    findScheduleComments,
    isScheduleOnlyLine,
    ScheduleComment,
} from "src/card-authoring/schedule-comment";

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
            // Cursor onto the comment: the lines then show the plain text for editing
            view.dispatch({ selection: { anchor: this.pos } });
            view.focus();
        });
        return el;
    }

    ignoreEvent(): boolean {
        return true;
    }
}

function isLivePreview(state: EditorState): boolean {
    try {
        return state.field(editorLivePreviewField, false) === true;
    } catch {
        return false;
    }
}

/** Line numbers touched by the cursor or a selection. */
function activeLines(state: EditorState): Set<number> {
    const doc = state.doc;
    const lines = new Set<number>();
    for (const r of state.selection.ranges) {
        const first = doc.lineAt(r.from).number;
        const last = doc.lineAt(r.to).number;
        for (let n = first; n <= last; n++) lines.add(n);
    }
    return lines;
}

/** Comments grouped by line (a line may hold more than one). */
function byLine(state: EditorState, comments: ScheduleComment[]): Map<number, ScheduleComment[]> {
    const lines = new Map<number, ScheduleComment[]>();
    for (const c of comments) {
        const n = state.doc.lineAt(c.from).number;
        const list = lines.get(n);
        if (list) list.push(c);
        else lines.set(n, [c]);
    }
    return lines;
}

function buildDecorations(
    state: EditorState,
    comments: ScheduleComment[],
    host: ScheduleCommentHost,
): DecorationSet {
    if (comments.length === 0 || !host.enabled() || !isLivePreview(state)) return Decoration.none;
    const doc = state.doc;
    const active = activeLines(state);
    const decos: Range<Decoration>[] = [];

    for (const [lineNo, list] of byLine(state, comments)) {
        const line = doc.line(lineNo);
        if (active.has(lineNo)) continue;
        const dates = list.flatMap((c) => c.dates);
        const widget = (pos: number) =>
            Decoration.replace({ widget: new ScheduleIconWidget(host.label(dates), pos) });

        if (isScheduleOnlyLine(line.text)) {
            const prev = lineNo > 1 ? doc.line(lineNo - 1) : null;
            if (prev && prev.text.trim() !== "" && !active.has(prev.number)) {
                // Comment line under a card: the icon at the end of the card, the line folded away
                decos.push(widget(list[0].from).range(prev.to, line.to));
                continue;
            }
            decos.push(Decoration.line({ class: "usr-sr-only-line" }).range(line.from));
        }
        for (const c of list) decos.push(widget(c.from).range(c.from, c.to));
    }
    return Decoration.set(decos, true);
}

interface ScheduleState {
    comments: ScheduleComment[];
    decorations: DecorationSet;
}

export function scheduleCommentExtension(host: ScheduleCommentHost): Extension {
    const find = (state: EditorState) => findScheduleComments(state.doc.toString());
    return StateField.define<ScheduleState>({
        create(state) {
            const comments = find(state);
            return { comments, decorations: buildDecorations(state, comments, host) };
        },
        update(value, tr) {
            const refresh = tr.effects.some((e) => e.is(REFRESH));
            const modeChanged = isLivePreview(tr.startState) !== isLivePreview(tr.state);
            if (!tr.docChanged && !tr.selection && !refresh && !modeChanged) return value;
            const comments = tr.docChanged ? find(tr.state) : value.comments;
            return { comments, decorations: buildDecorations(tr.state, comments, host) };
        },
        provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
    });
}

/** Redraws the icons in every open editor (after a settings change). */
export function refreshScheduleIcons(views: EditorView[]) {
    for (const view of views) view.dispatch({ effects: REFRESH.of(null) });
}
