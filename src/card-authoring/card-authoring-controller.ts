import "src/card-authoring/card-authoring.css";
import { EditorView } from "@codemirror/view";
import {
    App,
    Editor,
    editorInfoField,
    MarkdownView,
    Menu,
    Modal,
    Notice,
    Platform,
    SuggestModal,
    TFile,
} from "obsidian";

import { ca } from "src/card-authoring/card-authoring-i18n";
import {
    CardAuthoringSettings,
    CardDeck,
    currentDeck,
    deckForFile,
    deckForTag,
    normalizeCardAuthoringSettings,
} from "src/card-authoring/card-authoring-settings";
import {
    cardAtLine,
    CardDetectSettings,
    detectCards,
    DetectedCard,
    DetectResult,
    isFlashcardNote,
} from "src/card-authoring/card-detect";
import {
    CardRef,
    duplicateKey,
    duplicatesOf,
    findDuplicates,
    mergeRefs,
    normalizeQuestion,
} from "src/card-authoring/card-duplicates";
import {
    embedInsert,
    embedSide,
    findEmbed,
    fitWidth,
    imageFileName,
    imageFolderFor,
    isImageExtension,
    isPastedImageName,
    moveEmbedToSide,
    removeEmbed,
    replaceEmbedLink,
    shrinkableExtension,
    uniqueFileName,
} from "src/card-authoring/card-image";
import { CardImageModal } from "src/card-authoring/card-image-modal";
import { openCardPreview } from "src/card-authoring/card-preview";
import {
    appendAtEnd,
    insertAfter,
    multiLineTemplate,
    singleLineTemplate,
    tabAction,
    Template,
} from "src/card-authoring/card-template";
import {
    CardHistory,
    counterText,
    countToday,
    normalizeCardHistory,
    observeCards,
} from "src/card-authoring/daily-counter";
import { refreshDailyGoalViews } from "src/card-authoring/daily-goal-view";
import { cardEditorExtension, refreshCardIcons } from "src/card-authoring/editor-extension";
import {
    refreshScheduleIcons,
    scheduleCommentExtension,
} from "src/card-authoring/schedule-comment-extension";
import { Card } from "src/data/data-structures/card/card";
import { CardType, Question } from "src/data/data-structures/card/questions/question";
import { SettingsUtil, SRSettings } from "src/data/settings";
import { fishNoteDeckTag } from "src/fish-note/fish-note";
import type SRPlugin from "src/main";
import { RepItemState } from "src/scheduling/algorithms/base/repetition-item";
import { isPolish } from "src/speed-streak/speed-streak-i18n";
import { chosenVoiceId, getTtsSettings, ttsLanguageRules } from "src/tts/tts-controller";
import { createTtsProvider, TtsProvider } from "src/tts/tts-provider";
import { resolveCardLanguage, TtsFallbackSide } from "src/tts/tts-settings";
import { buildSpeechPlan, SpeechCard } from "src/tts/tts-text";

/** Plugin-level access to the card authoring settings (normalized on read). */
export function getCardAuthoringSettings(plugin: SRPlugin): CardAuthoringSettings {
    const settings = plugin.dataManager.data.settings;
    const normalized = normalizeCardAuthoringSettings(settings.cardAuthoring);
    settings.cardAuthoring = normalized;
    return normalized;
}

function refsFromDetect(file: string, result: DetectResult): CardRef[] {
    return result.cards
        .filter((c) => c.type !== CardType.Cloze && c.deckTag)
        .map((c) => ({
            deckTag: c.deckTag ?? "",
            key: normalizeQuestion(c.question),
            question: c.question,
            file,
            line: c.firstLine,
        }));
}

/**
 * Glue for "Card authoring": commands, ribbon button, editor icons and Tab,
 * status bar counter, read-aloud of new cards, duplicates and images.
 * All the text logic lives in the pure modules next to this file.
 */
export class CardAuthoringController {
    private plugin: SRPlugin;
    private app: App;
    private statusEl: HTMLElement | null = null;
    private provider: TtsProvider | null = null;
    /** Cards of the whole vault from the last sync (for duplicates) */
    private syncedRefs: CardRef[] = [];
    /** Last paste / drop into an editor: the image file it creates is renamed and moved */
    private lastPaste: {
        time: number;
        editor: Editor;
        file: TFile | null;
        kind: "paste" | "drop";
    } | null = null;

    constructor(plugin: SRPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    // MARK: Settings & data

    get settings(): CardAuthoringSettings {
        return getCardAuthoringSettings(this.plugin);
    }

    private get sr(): SRSettings {
        return this.plugin.dataManager.data.settings;
    }

    private get history(): CardHistory {
        const data = this.plugin.dataManager.data;
        data.cardHistory = normalizeCardHistory(data.cardHistory);
        return data.cardHistory;
    }

    private async saveSettings() {
        await this.plugin.dataManager.settingsManager.save();
    }

    private async saveData() {
        try {
            await this.plugin.dataManager.pluginDataManager.savePluginData();
        } catch (e) {
            console.error("[Card authoring] could not save", e);
        }
    }

    private detectSettings(): CardDetectSettings {
        return this.sr;
    }

    // MARK: Setup

    load() {
        const p = this.plugin;
        p.addCommand({
            id: "srs-card-new",
            name: ca("CMD_NEW"),
            icon: "square-plus",
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "N" }],
            editorCallback: (editor, ctx) => void this.newCard(editor, ctx.file, false),
        });
        p.addCommand({
            id: "srs-card-new-sentence",
            name: ca("CMD_NEW_SENTENCE"),
            icon: "text",
            editorCallback: (editor, ctx) => void this.newCard(editor, ctx.file, true),
        });
        p.addCommand({
            id: "srs-card-language",
            name: ca("CMD_LANGUAGE"),
            icon: "languages",
            callback: () => this.chooseDeck(),
        });
        p.addCommand({
            id: "srs-card-finish",
            name: ca("CMD_FINISH"),
            icon: "check",
            hotkeys: [{ modifiers: ["Mod"], key: "Enter" }],
            editorCheckCallback: (checking, editor, ctx) => {
                if (!ctx.file || !this.cursorOnCardLine(editor)) return false;
                if (!checking) void this.finishCard(editor, ctx.file);
                return true;
            },
        });
        p.addCommand({
            id: "srs-card-image",
            name: ca("CMD_IMAGE"),
            icon: "image-plus",
            editorCheckCallback: (checking, editor, ctx) => {
                if (!ctx.file || !this.cardAtCursor(editor)) return false;
                if (!checking) void this.addImage(editor, ctx.file);
                return true;
            },
        });
        p.addCommand({
            id: "srs-card-duplicates",
            name: ca("CMD_DUPLICATES"),
            icon: "copy",
            callback: () => this.showDuplicates(),
        });
        p.addRibbonIcon("square-plus", ca("RIBBON"), () => void this.newCardFromAnywhere(false));

        p.registerEditorExtension(
            cardEditorExtension({
                iconsEnabled: () => this.settings.editorIcons,
                detectSettings: () => this.detectSettings(),
                openPreview: (view, line, anchor) => this.openPreview(view, line, anchor),
                handleTab: (view) => this.handleTab(view),
                iconLabel: (kind) => (kind === "card" ? ca("PREVIEW") : ca("UNFINISHED")),
                thumbnails: () => this.settings.inlineThumbnails,
                openImage: (view, line, link) => this.openImage(view, line, link),
            }),
        );
        // <!--SR:…--> schedule comments as a small calendar icon (display only)
        p.registerEditorExtension(
            scheduleCommentExtension({
                enabled: () => this.settings.compactScheduleComments,
                label: (dates) => this.scheduleLabel(dates),
            }),
        );

        p.registerEvent(
            this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, info) => {
                if (!info.file || !this.cardAtCursor(editor)) return;
                const file = info.file;
                menu.addItem((item) =>
                    item
                        .setTitle(ca("CMD_IMAGE"))
                        .setIcon("image-plus")
                        .onClick(() => void this.addImage(editor, file)),
                );
            }),
        );

        // Pasted images: remember the paste, rename the file it creates
        p.registerEvent(
            this.app.workspace.on("editor-paste", (_evt, editor, info) => {
                this.lastPaste = {
                    time: Date.now(),
                    editor,
                    file: info.file ?? null,
                    kind: "paste",
                };
            }),
        );
        // An image dragged from the gallery / a browser / the desktop onto a card line
        p.registerEvent(
            this.app.workspace.on("editor-drop", (_evt, editor, info) => {
                this.lastPaste = {
                    time: Date.now(),
                    editor,
                    file: info.file ?? null,
                    kind: "drop",
                };
            }),
        );
        p.registerEvent(
            this.app.vault.on("create", (file) => {
                if (file instanceof TFile) void this.onFileCreated(file);
            }),
        );

        if (!Platform.isMobile) this.statusEl = p.addStatusBarItem();
        this.onVaultSynced();
    }

    /** After the plugin synced the vault: remember all cards, update the counter. */
    onVaultSynced() {
        try {
            this.syncedRefs = this.collectVaultRefs();
            const history = this.history;
            const before = JSON.stringify(history);
            observeCards(
                history,
                this.syncedRefs.map((r) => duplicateKey(r.deckTag, r.question)),
                new Date(),
                this.sr.startOfDay,
            );
            if (JSON.stringify(history) !== before) void this.saveData();
        } catch (e) {
            console.error("[Card authoring] could not read the synced cards", e);
        }
        this.updateStatusBar();
    }

    /** Settings changed: redraw icons and the counter. */
    refresh() {
        this.updateStatusBar();
        const views: EditorView[] = [];
        this.app.workspace.iterateAllLeaves((leaf) => {
            const view = leaf.view;
            if (view instanceof MarkdownView) {
                const cm = (view.editor as unknown as { cm?: EditorView }).cm;
                if (cm) views.push(cm);
            }
        });
        refreshCardIcons(views);
        refreshScheduleIcons(views);
    }

    /** "Next review: 8 Oct 2026 · 12 Oct 2026" for the schedule comment icon. */
    private scheduleLabel(dates: string[]): string {
        if (dates.length === 0) return ca("SCHEDULE_COMMENT");
        let format: Intl.DateTimeFormat | null = null;
        try {
            format = new Intl.DateTimeFormat(isPolish() ? "pl-PL" : "en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            format = null;
        }
        const text = dates
            .map((d) => {
                const [y, m, day] = d.split("-").map(Number);
                return format ? format.format(new Date(y, m - 1, day)) : d;
            })
            .join(" · ");
        return ca("SCHEDULE_NEXT", { dates: text });
    }

    private collectVaultRefs(): CardRef[] {
        const refs: CardRef[] = [];
        let tree;
        try {
            tree = this.plugin.dataManager.osrCore.reviewableDeckTree;
        } catch {
            return refs;
        }
        const seen = new Set<Question>();
        for (const item of tree.getFlattenedRepItemArray(RepItemState.AnyItem, true)) {
            const q = (item as Card).question;
            if (!q || seen.has(q) || q.questionType === CardType.Cloze) continue;
            seen.add(q);
            const tag =
                q.questionText?.topicPathWithWs?.topicPath?.formatAsTag() ??
                q.topicPathList?.list?.[0]?.formatAsTag() ??
                "";
            const front = (q.cards?.[0]?.front ?? "").trim();
            refs.push({
                deckTag: tag,
                key: normalizeQuestion(front),
                question: front,
                file: q.note?.filePath ?? "",
                line: q.lineNo,
            });
        }
        return refs;
    }

    private allRefs(filePath: string, current: DetectResult): CardRef[] {
        return mergeRefs(this.syncedRefs, filePath, refsFromDetect(filePath, current));
    }

    // MARK: Counter

    private todayCount(): number {
        return countToday(this.history, new Date(), this.sr.startOfDay);
    }

    private counterValue(): string {
        return counterText(this.todayCount(), this.settings.dailyGoal);
    }

    private updateStatusBar() {
        refreshDailyGoalViews();
        if (!this.statusEl) return;
        const show = this.settings.showDailyCounter;
        this.statusEl.toggleClass("sr-is-hidden", !show);
        if (show) this.statusEl.setText(ca("COUNTER", { n: this.counterValue() }));
    }

    // MARK: New card

    private template(deck: CardDeck, multi: boolean): Template {
        const both = this.settings.bothDirections;
        return multi
            ? multiLineTemplate(deck.tag, this.sr, both)
            : singleLineTemplate(deck.tag, this.sr, both);
    }

    private async rememberDeck(deck: CardDeck) {
        const s = this.settings;
        if (s.lastDeckTag === deck.tag) return;
        s.lastDeckTag = deck.tag;
        await this.saveSettings();
    }

    /** Ribbon: works without an open editor too. */
    private async newCardFromAnywhere(multi: boolean) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view?.file && view.getMode() === "source")
            await this.newCard(view.editor, view.file, multi);
        else await this.openDeckAndInsert(null, multi);
    }

    async newCard(editor: Editor, file: TFile | null, multi: boolean) {
        const s = this.settings;
        if (s.decks.length === 0) {
            new Notice(ca("NO_DECKS"));
            return;
        }
        const deck = file ? this.deckForNote(file) : null;
        if (!deck) {
            await this.openDeckAndInsert(null, multi);
            return;
        }
        this.insertTemplate(editor, deck, multi, false);
        await this.rememberDeck(deck);
    }

    /**
     * Deck of a note: the deck whose file it is, else the deck named in a fish note
     * (`fishcards: "#DEN"`; a tag without a deck in the settings still works, without a language).
     */
    deckForNote(file: TFile): CardDeck | null {
        const s = this.settings;
        const byFile = deckForFile(s, file.path);
        if (byFile) return byFile;
        const tag = fishNoteDeckTag(this.app.metadataCache.getFileCache(file)?.frontmatter);
        if (!tag) return null;
        return deckForTag(s, tag) ?? { tag, file: file.path, lang: "" };
    }

    /**
     * Deck file: append at the end. A note without any card yet: insert below
     * the cursor. Existing lines are never changed.
     */
    private insertTemplate(editor: Editor, deck: CardDeck, multi: boolean, forceEnd: boolean) {
        const doc = editor.getValue();
        const template = this.template(deck, multi);
        const found = detectCards(doc, this.detectSettings());
        const hasCards = found.cards.length > 0 || found.unfinished.length > 0;
        let at: number;
        let text: string;
        let cursor: number;
        if (hasCards || forceEnd) {
            ({ at, text, cursor } = appendAtEnd(doc, template));
        } else {
            const line = editor.getCursor().line;
            const lineText = editor.getLine(line);
            at = editor.posToOffset({ line, ch: lineText.length });
            const prefix = lineText.trim() === "" ? "" : "\n";
            text = prefix + template.text;
            cursor = at + prefix.length + template.cursor;
        }
        editor.replaceRange(text, editor.offsetToPos(at));
        const pos = editor.offsetToPos(cursor);
        editor.setCursor(pos);
        editor.scrollIntoView({ from: pos, to: pos }, true);
        editor.focus();
    }

    /** Opens (or creates) the deck file and appends a template at its end. */
    private async openDeckAndInsert(deck: CardDeck | null, multi: boolean) {
        const target = deck ?? currentDeck(this.settings);
        if (!target) {
            new Notice(ca("NO_DECKS"));
            return;
        }
        let file = this.app.vault.getAbstractFileByPath(target.file);
        if (!(file instanceof TFile)) {
            const folder = target.file.split("/").slice(0, -1).join("/");
            if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
                await this.app.vault.createFolder(folder);
            }
            // a deck tag outside `flashcardTags` needs a flashcard tag in the file
            const needsHeader = !SettingsUtil.isTagInList(this.sr.flashcardTags, target.tag);
            const header = needsHeader ? `${this.sr.flashcardTags[0] ?? "#flashcards"}\n\n` : "";
            file = await this.app.vault.create(target.file, header);
        }
        if (!(file instanceof TFile)) return;
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file, { state: { mode: "source" } });
        const view = leaf.view instanceof MarkdownView ? leaf.view : null;
        if (!view) return;
        this.insertTemplate(view.editor, target, multi, true);
        await this.rememberDeck(target);
    }

    private chooseDeck() {
        const decks = this.settings.decks;
        if (decks.length === 0) {
            new Notice(ca("NO_DECKS"));
            return;
        }
        new DeckSuggestModal(this.app, decks, (deck) => {
            void this.rememberDeck(deck);
        }).open();
    }

    // MARK: Tab

    private handleTab(view: EditorView): boolean {
        const sel = view.state.selection.main;
        if (!sel.empty) return false;
        const line = view.state.doc.lineAt(sel.head);
        const action = tabAction(
            line.text,
            sel.head - line.from,
            this.sr,
            this.settings.bothDirections,
        );
        if (!action) return false;
        if (!isFlashcardNote(view.state.doc.toString(), this.detectSettings())) return false;
        view.dispatch({
            changes:
                action.insert || action.from !== action.to
                    ? {
                          from: line.from + action.from,
                          to: line.from + action.to,
                          insert: action.insert,
                      }
                    : undefined,
            selection: { anchor: line.from + action.cursor },
            scrollIntoView: true,
        });
        return true;
    }

    // MARK: Finish card

    private cardAtCursor(editor: Editor): DetectedCard | null {
        const found = detectCards(editor.getValue(), this.detectSettings());
        return cardAtLine(found.cards, editor.getCursor().line);
    }

    private cursorOnCardLine(editor: Editor): boolean {
        const found = detectCards(editor.getValue(), this.detectSettings());
        const line = editor.getCursor().line;
        return !!cardAtLine(found.cards, line) || found.unfinished.some((u) => u.line === line);
    }

    private languageFor(deckTag: string | null): string | null {
        const deck = deckForTag(this.settings, deckTag);
        if (deck?.lang) return deck.lang;
        const tts = getTtsSettings(this.plugin);
        return resolveCardLanguage(
            ttsLanguageRules(this.plugin, tts),
            deckTag ? [deckTag] : [],
            "",
            tts.defaultLanguage,
        );
    }

    async finishCard(editor: Editor, file: TFile) {
        const found = detectCards(editor.getValue(), this.detectSettings());
        const line = editor.getCursor().line;
        const card = cardAtLine(found.cards, line);
        if (!card) {
            new Notice(
                found.unfinished.some((u) => u.line === line)
                    ? ca("MISSING_TRANSLATION")
                    : ca("NOT_A_CARD"),
            );
            return;
        }
        if (!card.question) {
            new Notice(ca("MISSING_WORD"));
            return;
        }
        if (!card.answer && card.type !== CardType.Cloze) {
            new Notice(ca("MISSING_TRANSLATION"));
            return;
        }
        const deckTag = card.deckTag ?? currentDeck(this.settings)?.tag ?? "";

        // 1. duplicate warning (does not block)
        const dupes = duplicatesOf(card.question, deckTag, this.allRefs(file.path, found), {
            file: file.path,
            line: card.firstLine,
        });
        if (dupes.length > 0) this.noticeDuplicate(card.question, dupes[0]);

        // 2. hear the word right away
        this.provider?.unlock?.();
        void this.speak(
            { question: card.question, answer: card.answer },
            this.languageFor(deckTag),
            "question",
        );

        // 3. daily counter
        const history = this.history;
        if (!history.initialized) {
            const others = this.allRefs(file.path, found).filter(
                (r) => r.line !== card.firstLine || r.file !== file.path,
            );
            observeCards(
                history,
                others.map((r) => duplicateKey(r.deckTag, r.question)),
                new Date(),
                this.sr.startOfDay,
            );
        }
        observeCards(
            history,
            [duplicateKey(deckTag, card.question)],
            new Date(),
            this.sr.startOfDay,
        );
        void this.saveData();
        this.updateStatusBar();

        // 4. next empty template on the next line
        const deck = deckForTag(this.settings, deckTag) ?? currentDeck(this.settings);
        if (deck) {
            const lastLine = card.lastLine;
            const lineEnd = editor.posToOffset({
                line: lastLine,
                ch: editor.getLine(lastLine).length,
            });
            const multi =
                card.type === CardType.MultiLineBasic || card.type === CardType.MultiLineReversed;
            const ins = insertAfter(
                lineEnd,
                singleLineTemplate(deck.tag, this.sr, this.settings.bothDirections),
                multi,
            );
            editor.replaceRange(ins.text, editor.offsetToPos(ins.at));
            const pos = editor.offsetToPos(ins.cursor);
            editor.setCursor(pos);
            editor.scrollIntoView({ from: pos, to: pos }, true);
            await this.rememberDeck(deck);
        }
    }

    private noticeDuplicate(word: string, ref: CardRef) {
        const frag = createFragment();
        frag.createSpan({ text: ca("DUPLICATE", { word }) + " " });
        const btn = frag.createEl("button", { cls: "sr-ca-notice-btn", text: ca("SHOW") });
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            void this.openRef(ref);
        });
        new Notice(frag, 8000);
    }

    async openRef(ref: CardRef) {
        const file = this.app.vault.getAbstractFileByPath(ref.file);
        if (!(file instanceof TFile)) return;
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file, { state: { mode: "source" }, eState: { line: ref.line } });
        const view = leaf.view instanceof MarkdownView ? leaf.view : null;
        if (view) {
            const pos = { line: ref.line, ch: 0 };
            view.editor.setCursor(pos);
            view.editor.scrollIntoView({ from: pos, to: pos }, true);
        }
    }

    // MARK: Read aloud

    async speak(card: SpeechCard, lang: string | null, fallback?: TtsFallbackSide) {
        const tts = getTtsSettings(this.plugin);
        if (!tts.enabled) return;
        if (!this.provider || this.provider.id !== tts.provider)
            this.provider = createTtsProvider(tts.provider);
        const provider = this.provider;
        if (!provider.isAvailable()) return;
        provider.unlock?.();
        const plan = buildSpeechPlan(card, lang, fallback ?? tts.fallbackSide);
        for (const segment of plan) {
            await provider.speak(segment.text, {
                lang: segment.lang,
                voiceId: chosenVoiceId(tts, segment.lang),
                rate: tts.rate,
                volume: tts.volume / 100,
            });
        }
    }

    // MARK: Preview

    private openPreview(view: EditorView, line: number, anchor: HTMLElement) {
        const file = view.state.field(editorInfoField, false)?.file ?? null;
        const filePath = file?.path ?? "";
        const found = detectCards(view.state.doc.toString(), this.detectSettings());
        const card = found.cards.find((c) => c.firstLine === line) ?? cardAtLine(found.cards, line);
        const unfinished = card ? null : (found.unfinished.find((u) => u.line === line) ?? null);
        const deckTag = card?.deckTag ?? unfinished?.deckTag ?? null;
        const duplicates =
            card && deckTag
                ? duplicatesOf(card.question, deckTag, this.allRefs(filePath, found), {
                      file: filePath,
                      line: card.firstLine,
                  })
                : [];
        openCardPreview(
            this.app,
            this.plugin,
            {
                filePath,
                card,
                unfinished,
                deckTag,
                lang: this.languageFor(deckTag),
                duplicates,
                counter:
                    Platform.isMobile && this.settings.showDailyCounter
                        ? this.counterValue()
                        : null,
            },
            {
                speak: (c, lang) => void this.speak(c, lang),
                openRef: (ref) => void this.openRef(ref),
            },
            anchor,
        );
    }

    // MARK: Duplicates

    private showDuplicates() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const file = view?.file ?? null;
        const deck =
            (file ? deckForFile(this.settings, file.path) : null) ?? currentDeck(this.settings);
        const deckTag = deck?.tag ?? "";
        let refs = this.syncedRefs;
        if (view && file)
            refs = this.allRefs(
                file.path,
                detectCards(view.editor.getValue(), this.detectSettings()),
            );
        const groups = findDuplicates(
            refs.filter((r) => r.deckTag.toLowerCase() === deckTag.toLowerCase()),
        );
        new DuplicatesModal(this.app, deckTag, groups, (ref) => void this.openRef(ref)).open();
    }

    // MARK: Images

    async addImage(editor: Editor, file: TFile) {
        const card = this.cardAtCursor(editor);
        if (!card) {
            new Notice(ca("NOT_A_CARD"));
            return;
        }
        try {
            let blob: Blob | null = null;
            if (!Platform.isMobile) blob = await readClipboardImage();
            if (!blob) blob = await pickImageFile();
            if (!blob) return;
            const image = await this.saveCardImage(blob, card.question, file);
            const link = this.app.metadataCache.fileToLinktext(image, file.path, true);
            // the document may have changed while choosing the file
            const fresh =
                cardAtLine(
                    detectCards(editor.getValue(), this.detectSettings()).cards,
                    card.firstLine,
                ) ?? card;
            const lines = editor.getValue().split("\n");
            const ins = embedInsert(lines, fresh, link);
            editor.replaceRange(ins.text, { line: ins.line, ch: ins.ch });
        } catch (e) {
            console.error("[Card authoring] image", e);
            new Notice(ca("IMAGE_FAILED"));
        }
    }

    /**
     * The folder for a new card image (created when missing): `obrazy` next to the note, or
     * Obsidian's attachment folder when the setting is empty.
     */
    private async imageFolder(note: TFile): Promise<string | null> {
        const folder = imageFolderFor(note.path, this.settings.imageFolder);
        if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
            await this.app.vault.createFolder(folder);
        }
        return folder;
    }

    /** Saves a picked image for a card (shrunk, named after the word) and returns the file. */
    private async saveCardImage(blob: Blob, question: string, note: TFile): Promise<TFile> {
        const s = this.settings;
        const image = s.resizeImages ? await shrinkImage(blob, s.maxImageWidth) : blob;
        const name = imageFileName(question, extensionFor(image.type));
        const folder = await this.imageFolder(note);
        const path = folder
            ? `${folder}/${uniqueFileName(name, (n) => !!this.app.vault.getAbstractFileByPath(`${folder}/${n}`))}`
            : await this.app.fileManager.getAvailablePathForAttachment(name, note.path);
        return await this.app.vault.createBinary(path, await image.arrayBuffer());
    }

    /** A png / jpeg wider than the limit is shrunk in place (same format, same name). */
    private async shrinkInPlace(file: TFile) {
        const mime = shrinkableExtension(file.extension);
        if (!mime || !this.settings.resizeImages) return;
        try {
            const data = await this.app.vault.readBinary(file);
            const blob = new Blob([data], { type: mime });
            const small = await shrinkImage(blob, this.settings.maxImageWidth);
            if (small === blob || small.type !== mime || small.size >= blob.size) return;
            await this.app.vault.modifyBinary(file, await small.arrayBuffer());
        } catch (e) {
            console.error("[Card authoring] shrink image", e);
        }
    }

    /**
     * An image pasted or dropped into a card line: shrunk, named after the word
     * ("Pasted image 2026…" → forestalled.png) and moved to the image folder next to the note.
     */
    private async onFileCreated(file: TFile) {
        const paste = this.lastPaste;
        if (!paste || Date.now() - paste.time > 5000 || !isImageExtension(file.extension)) return;
        if (paste.kind === "paste" && !isPastedImageName(file.name)) return;
        // let Obsidian insert the link first
        await new Promise((r) => window.setTimeout(r, 300));
        const card = this.cardAtCursor(paste.editor);
        if (!card || !card.question) return;
        await this.shrinkInPlace(file);

        const s = this.settings;
        const note = paste.file;
        const folder =
            (note ? await this.imageFolder(note) : null) ??
            (file.parent?.path && file.parent.path !== "/" ? file.parent.path : "");
        const wantedName = s.renamePastedImages
            ? imageFileName(card.question, file.extension)
            : file.name;
        const currentFolder = file.parent?.path && file.parent.path !== "/" ? file.parent.path : "";
        if (folder === currentFolder && wantedName === file.name) return;
        const prefix = folder ? `${folder}/` : "";
        const name = uniqueFileName(
            wantedName,
            (n) => !!this.app.vault.getAbstractFileByPath(prefix + n),
        );
        try {
            await this.app.fileManager.renameFile(file, prefix + name);
        } catch (e) {
            console.error("[Card authoring] rename pasted image", e);
        }
    }

    // MARK: Image in a card line (tap on the thumbnail)

    private openImage(view: EditorView, line: number, link: string) {
        const note = view.state.field(editorInfoField, false)?.file ?? null;
        if (line < 0 || line >= view.state.doc.lines) return;
        const text = view.state.doc.line(line + 1).text;
        const embed = findEmbed(text, link);
        if (!embed) return;
        const seps = [this.sr.singleLineCardSeparator, this.sr.singleLineReversedCardSeparator];
        const target = this.app.metadataCache.getFirstLinkpathDest(embed.link, note?.path ?? "");

        /** Applies a change to the line, read again (the note may have changed meanwhile) */
        const editLine = (change: (current: string) => string | null) => {
            if (line >= view.state.doc.lines) return;
            const docLine = view.state.doc.line(line + 1);
            const next = change(docLine.text);
            if (next === null || next === docLine.text) return;
            view.dispatch({ changes: { from: docLine.from, to: docLine.to, insert: next } });
        };
        const current = (lineText: string) => findEmbed(lineText, embed.link);

        new CardImageModal(this.app, {
            file: target,
            link: embed.link,
            side: embedSide(text, embed, seps),
            move: (side) =>
                editLine((t) => {
                    const e = current(t);
                    return e ? moveEmbedToSide(t, e, side, seps) : null;
                }),
            remove: () => {
                editLine((t) => {
                    const e = current(t);
                    return e ? removeEmbed(t, e) : null;
                });
                new Notice(ca("IMAGE_REMOVED"));
            },
            replace: () => void this.replaceImage(view, line, embed.link, note, editLine),
            openFile: () => {
                if (target) void this.app.workspace.getLeaf("tab").openFile(target);
            },
        }).open();
    }

    private async replaceImage(
        view: EditorView,
        line: number,
        oldLink: string,
        note: TFile | null,
        editLine: (change: (current: string) => string | null) => void,
    ) {
        if (!note) return;
        try {
            const blob = await pickImageFile();
            if (!blob) return;
            const lineText = view.state.doc.line(line + 1).text;
            const card = cardAtLine(
                detectCards(view.state.doc.toString(), this.detectSettings()).cards,
                line,
            );
            const image = await this.saveCardImage(blob, card?.question ?? lineText, note);
            const link = this.app.metadataCache.fileToLinktext(image, note.path, true);
            editLine((t) => {
                const e = findEmbed(t, oldLink);
                return e ? replaceEmbedLink(t, e, link) : null;
            });
        } catch (e) {
            console.error("[Card authoring] replace image", e);
            new Notice(ca("IMAGE_FAILED"));
        }
    }
}

// MARK: Image helpers (browser APIs only — work on iOS and Android)

function extensionFor(mime: string): string {
    const m = /image\/(png|jpe?g|gif|webp|heic|heif|bmp|svg)/i.exec(mime ?? "");
    if (!m) return "png";
    const ext = m[1].toLowerCase();
    return ext === "jpeg" ? "jpg" : ext === "svg" ? "svg" : ext;
}

async function readClipboardImage(): Promise<Blob | null> {
    try {
        if (!navigator.clipboard?.read) return null;
        const items = await navigator.clipboard.read();
        for (const item of items) {
            const type = item.types.find((t) => t.startsWith("image/"));
            if (type) return await item.getType(type);
        }
    } catch {
        /* no permission or empty clipboard */
    }
    return null;
}

/** File picker; on phones / iPad it offers the gallery and the camera. */
function pickImageFile(): Promise<Blob | null> {
    return new Promise((resolve) => {
        const input = activeDocument.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
        input.click();
    });
}

/** Scales a photo down to `maxWidth` (canvas). GIF / SVG are kept as they are. */
async function shrinkImage(blob: Blob, maxWidth: number): Promise<Blob> {
    if (/gif|svg/i.test(blob.type) || typeof createImageBitmap === "undefined") return blob;
    try {
        const bitmap = await createImageBitmap(blob);
        const size = fitWidth(bitmap.width, bitmap.height, maxWidth);
        if (size.width === bitmap.width) {
            bitmap.close();
            return blob;
        }
        const canvas = activeDocument.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0, size.width, size.height);
        bitmap.close();
        const type = blob.type === "image/png" ? "image/png" : "image/jpeg";
        return await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b ?? blob), type, 0.85),
        );
    } catch {
        return blob;
    }
}

// MARK: Modals

class DeckSuggestModal extends SuggestModal<CardDeck> {
    constructor(
        app: App,
        private decks: CardDeck[],
        private onChoose: (deck: CardDeck) => void,
    ) {
        super(app);
        this.setPlaceholder(ca("CHOOSE_DECK"));
    }

    getSuggestions(query: string): CardDeck[] {
        const q = query.toLowerCase();
        return this.decks.filter((d) => `${d.tag} ${d.file} ${d.lang}`.toLowerCase().includes(q));
    }

    renderSuggestion(deck: CardDeck, el: HTMLElement) {
        el.createDiv({ text: `${deck.tag} → ${deck.file}` });
        if (deck.lang) el.createEl("small", { text: deck.lang, cls: "sr-ca-muted" });
    }

    onChooseSuggestion(deck: CardDeck) {
        this.onChoose(deck);
    }
}

class DuplicatesModal extends Modal {
    constructor(
        app: App,
        private deckTag: string,
        private groups: CardRef[][],
        private openRef: (ref: CardRef) => void,
    ) {
        super(app);
    }

    onOpen() {
        this.setTitle(ca("DUPLICATES_TITLE", { deck: this.deckTag }));
        const el = this.contentEl;
        el.addClass("sr-ca-duplicates");
        if (this.groups.length === 0) {
            el.createDiv({ text: ca("NO_DUPLICATES", { deck: this.deckTag }) });
            return;
        }
        el.createDiv({ cls: "sr-ca-muted", text: ca("DUPLICATES_HINT") });
        for (const group of this.groups) {
            const box = el.createDiv({ cls: "sr-ca-dup-group" });
            box.createDiv({ cls: "sr-ca-dup-word", text: group[0].question });
            for (const ref of group) {
                const link = box.createEl("button", { cls: "sr-ca-preview-link" });
                link.setText(`${ref.file.split("/").pop()} · ${ca("LINE", { n: ref.line + 1 })}`);
                link.addEventListener("click", () => {
                    this.close();
                    this.openRef(ref);
                });
            }
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
