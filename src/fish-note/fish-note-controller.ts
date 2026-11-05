/**
 * Fish note — glue: the "New fish note" button in the file explorer's top bar (next to "New
 * note" and "New folder"), the same item in a folder's menu and a command; the window that
 * asks for the name and the deck; and three buttons in the header of an open fish note
 * (new card, image, learn). The note's text and look: fish-note.ts / fish-note.css.
 *
 * The file explorer has no API for its top bar, so the button is added to its DOM and added
 * again after every layout change; if Obsidian changes that bar, the command and the folder
 * menu still work.
 */

import "src/fish-note/fish-note.css";
import {
    App,
    getIcon,
    MarkdownView,
    Menu,
    Modal,
    Notice,
    setIcon,
    Setting,
    TAbstractFile,
    TFile,
    TFolder,
    WorkspaceLeaf,
} from "obsidian";

import { getCardAuthoringSettings } from "src/card-authoring/card-authoring-controller";
import { ca } from "src/card-authoring/card-authoring-i18n";
import { CardDeck, normalizeDeckTag } from "src/card-authoring/card-authoring-settings";
import { singleLineTemplate } from "src/card-authoring/card-template";
import { SettingsUtil } from "src/data/settings";
import {
    fishNoteFileName,
    fishNoteText,
    isFishNote,
    uniqueNotePath,
} from "src/fish-note/fish-note";
import { fn } from "src/fish-note/fish-note-i18n";
import { QuickAddModal } from "src/fish-note/quick-add-modal";
import type SRPlugin from "src/main";
import { FlashcardReviewMode } from "src/scheduling/flashcard-review-sequencer";
import { isPolish } from "src/speed-streak/speed-streak-i18n";
import { languageName, sortedLanguages, suggestDeckTag } from "src/tts/languages";

const ICON = "fish";
const NAV_BUTTON_CLASS = "usr-fishnote-nav";
const NEW_DECK = "__new__";

interface ChosenDeck {
    tag: string;
    lang: string;
    isNew: boolean;
}

export class FishNoteController {
    private plugin: SRPlugin;
    private app: App;
    private navButtons = new Set<HTMLElement>();
    private headerActions = new Map<MarkdownView, HTMLElement[]>();

    constructor(plugin: SRPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    load() {
        const p = this.plugin;
        p.addCommand({
            id: "usr-new-fish-note",
            name: fn("NEW_FISH_NOTE"),
            icon: ICON,
            callback: () => this.askAndCreate(null),
        });
        p.addCommand({
            id: "usr-fishnote-quick-add",
            name: fn("ACTION_QUICK"),
            icon: "list-plus",
            checkCallback: (checking) => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                const file = view?.file;
                if (!file || !this.plugin.cardAuthoring?.deckForNote(file)) return false;
                if (!checking) this.openQuickAdd(view);
                return true;
            },
        });
        p.registerEvent(
            this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => {
                if (!(file instanceof TFolder)) return;
                menu.addItem((item) =>
                    item
                        .setTitle(fn("NEW_FISH_NOTE"))
                        .setIcon(ICON)
                        .onClick(() => this.askAndCreate(file)),
                );
            }),
        );
        const refresh = () => {
            this.addNavButtons();
            this.updateHeaderActions();
        };
        p.registerEvent(this.app.workspace.on("layout-change", refresh));
        p.registerEvent(this.app.workspace.on("file-open", () => this.updateHeaderActions()));
        p.registerEvent(this.app.metadataCache.on("changed", () => this.updateHeaderActions()));
        p.register(() => this.unload());
        refresh();
    }

    private unload() {
        for (const btn of this.navButtons) btn.remove();
        this.navButtons.clear();
        for (const els of this.headerActions.values()) els.forEach((el) => el.remove());
        this.headerActions.clear();
    }

    // MARK: File explorer button

    private addNavButtons() {
        for (const leaf of this.app.workspace.getLeavesOfType("file-explorer")) {
            const bar = leaf.view.containerEl.querySelector(".nav-buttons-container");
            if (!bar || bar.querySelector(`.${NAV_BUTTON_CLASS}`)) continue;
            const btn = createDiv({
                cls: `clickable-icon nav-action-button ${NAV_BUTTON_CLASS}`,
                attr: { "aria-label": fn("NEW_FISH_NOTE"), role: "button", tabindex: "0" },
            });
            setIconSafe(btn, ICON);
            btn.addEventListener("click", () => this.askAndCreate(null));
            btn.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    this.askAndCreate(null);
                }
            });
            // right after "New note" and "New folder"
            bar.insertBefore(btn, bar.children[2] ?? null);
            this.navButtons.add(btn);
        }
    }

    // MARK: Buttons in an open fish note

    private updateHeaderActions() {
        const open = new Set<MarkdownView>();
        this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
            if (!(leaf.view instanceof MarkdownView)) return;
            const view = leaf.view;
            open.add(view);
            const file = view.file;
            const fish =
                !!file && isFishNote(this.app.metadataCache.getFileCache(file)?.frontmatter);
            const added = this.headerActions.get(view);
            if (fish && !added) this.headerActions.set(view, this.addActions(view));
            if (!fish && added) {
                added.forEach((el) => el.remove());
                this.headerActions.delete(view);
            }
        });
        for (const [view, els] of this.headerActions) {
            if (open.has(view)) continue;
            els.forEach((el) => el.remove());
            this.headerActions.delete(view);
        }
    }

    /** Learn / image / new card (Obsidian puts each new action in front of the last one). */
    private addActions(view: MarkdownView): HTMLElement[] {
        const authoring = () => this.plugin.cardAuthoring;
        return [
            view.addAction("play", fn("ACTION_LEARN"), () => {
                if (view.file)
                    void this.plugin.uiManager.openDeckContainer(
                        FlashcardReviewMode.Review,
                        view.file,
                    );
            }),
            view.addAction("image-plus", fn("ACTION_IMAGE"), () => {
                const file = view.file;
                if (!file || !authoring()) return;
                void authoring()?.addImage(view.editor, file);
            }),
            view.addAction("list-plus", fn("ACTION_QUICK"), () => this.openQuickAdd(view)),
            view.addAction("square-plus", fn("ACTION_NEW_CARD"), () => {
                if (view.getMode() !== "source")
                    void view.setState({ mode: "source" }, { history: false });
                void authoring()?.newCard(view.editor, view.file, false);
            }),
        ];
    }

    /** The Anki-like "Add cards quickly" window for the note in `view`. */
    private openQuickAdd(view: MarkdownView | null) {
        const file = view?.file ?? null;
        const deck = file ? this.plugin.cardAuthoring?.deckForNote(file) : null;
        if (!file || !deck) {
            new Notice(fn("NOT_FISH"));
            return;
        }
        new QuickAddModal(
            this.app,
            this.plugin,
            file,
            deck.tag,
            getCardAuthoringSettings(this.plugin).bothDirections,
        ).open();
    }

    // MARK: Creating a fish note

    askAndCreate(folder: TFolder | null) {
        const decks = getCardAuthoringSettings(this.plugin).decks;
        new FishNoteModal(this.app, decks, (name, deck) => {
            void this.create(folder, name, deck).catch((e) => {
                console.error("[Fish note] could not create", e);
                new Notice(String(e));
            });
        }).open();
    }

    private async create(folder: TFolder | null, name: string, deck: ChosenDeck) {
        const sr = this.plugin.dataManager.data.settings;
        const authoring = getCardAuthoringSettings(this.plugin);
        const parent =
            folder ??
            this.app.fileManager.getNewFileParent(this.app.workspace.getActiveFile()?.path ?? "");
        const fallback = deck.lang ? languageName(deck.lang, isPolish()) : deck.tag.slice(1);
        const path = uniqueNotePath(
            parent.path,
            fishNoteFileName(name, fallback),
            (p) => !!this.app.vault.getAbstractFileByPath(p),
        );
        // the deck tag alone must make it a flashcard note, else a flashcard tag goes on top
        const header = SettingsUtil.isTagInList(sr.flashcardTags, deck.tag)
            ? null
            : (sr.flashcardTags[0] ?? "#flashcards");
        const note = fishNoteText(
            deck.tag,
            header,
            singleLineTemplate(deck.tag, sr, authoring.bothDirections),
        );
        const file = await this.app.vault.create(path, note.text);

        if (
            deck.isNew &&
            !authoring.decks.some((d) => d.tag.toLowerCase() === deck.tag.toLowerCase())
        )
            authoring.decks = [...authoring.decks, { tag: deck.tag, file: path, lang: deck.lang }];
        authoring.lastDeckTag = deck.tag;
        await this.plugin.dataManager.settingsManager.save();
        this.plugin.cardAuthoring?.refresh();

        await this.openAt(file, note.cursor);
    }

    private async openAt(file: TFile, cursor: number) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file, { state: { mode: "source" } });
        if (!(leaf.view instanceof MarkdownView)) return;
        const editor = leaf.view.editor;
        const pos = editor.offsetToPos(Math.min(cursor, editor.getValue().length));
        editor.setCursor(pos);
        editor.focus();
    }
}

/** "fish" is a Lucide icon; a plain "new file" icon when an Obsidian build lacks it */
function setIconSafe(el: HTMLElement, icon: string) {
    setIcon(el, getIcon(icon) ? icon : "file-plus");
}

/** Name, deck (or a new deck: tag + language) → Create. */
class FishNoteModal extends Modal {
    private name = "";
    private choice: string;
    private newTag = "";
    private newLang = "";
    private tagInput: HTMLInputElement | null = null;

    constructor(
        app: App,
        private decks: CardDeck[],
        private onCreate: (name: string, deck: ChosenDeck) => void,
    ) {
        super(app);
        this.choice = decks[0]?.tag ?? NEW_DECK;
    }

    onOpen() {
        this.setTitle(fn("TITLE"));
        this.modalEl.addClass("usr-fishnote-modal");
        this.render();
    }

    private render() {
        const el = this.contentEl;
        el.empty();
        const polish = isPolish();

        new Setting(el)
            .setName(fn("NAME"))
            .setDesc(fn("NAME_DESC"))
            .addText((text) => {
                text.setValue(this.name).onChange((v) => (this.name = v));
                text.inputEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        this.submit();
                    }
                });
                window.setTimeout(() => text.inputEl.focus(), 0);
            });

        new Setting(el)
            .setName(fn("DECK"))
            .setDesc(fn("DECK_DESC"))
            .addDropdown((dropdown) => {
                for (const deck of this.decks) {
                    const lang = deck.lang ? ` · ${languageName(deck.lang, polish)}` : "";
                    dropdown.addOption(deck.tag, `${deck.tag}${lang}`);
                }
                dropdown.addOption(NEW_DECK, fn("DECK_NEW"));
                dropdown.setValue(this.choice).onChange((v) => {
                    this.choice = v;
                    this.render();
                });
            });

        if (this.choice === NEW_DECK) {
            new Setting(el)
                .setName(fn("LANGUAGE"))
                .setDesc(fn("LANGUAGE_DESC"))
                .addDropdown((dropdown) => {
                    dropdown.addOption("", fn("LANGUAGE_NONE"));
                    for (const l of sortedLanguages(polish))
                        dropdown.addOption(l.code, polish ? l.pl : l.en);
                    dropdown.setValue(this.newLang).onChange((v) => {
                        this.newLang = v;
                        // a tag suggestion from the language, until the user types one
                        if (v && this.tagInput && !this.newTag) {
                            this.tagInput.value = suggestDeckTag(languageName(v, polish));
                        }
                    });
                });
            new Setting(el)
                .setName(fn("TAG"))
                .setDesc(fn("TAG_DESC"))
                .addText((text) => {
                    this.tagInput = text.inputEl;
                    text.setPlaceholder("#DEN")
                        .setValue(this.newTag)
                        .onChange((v) => (this.newTag = v));
                });
        }

        new Setting(el)
            .addButton((b) => b.setButtonText(fn("CANCEL")).onClick(() => this.close()))
            .addButton((b) =>
                b
                    .setButtonText(fn("CREATE"))
                    .setCta()
                    .onClick(() => this.submit()),
            );
    }

    private submit() {
        let deck: ChosenDeck;
        if (this.choice === NEW_DECK) {
            const tag = normalizeDeckTag(this.newTag || this.tagInput?.value || "");
            if (!tag) {
                new Notice(fn("NEED_TAG"));
                return;
            }
            const existing = this.decks.find((d) => d.tag.toLowerCase() === tag.toLowerCase());
            deck = existing
                ? { tag: existing.tag, lang: existing.lang, isNew: false }
                : { tag, lang: this.newLang, isNew: true };
        } else {
            const existing = this.decks.find((d) => d.tag === this.choice);
            if (!existing) {
                new Notice(ca("NO_DECKS"));
                return;
            }
            deck = { tag: existing.tag, lang: existing.lang, isNew: false };
        }
        this.close();
        this.onCreate(this.name, deck);
    }

    onClose() {
        this.contentEl.empty();
    }
}
