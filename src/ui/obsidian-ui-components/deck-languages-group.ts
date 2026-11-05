/**
 * "Decks and languages" — one list shared by Settings → Card authoring and Settings → Read
 * aloud: per deck its tag, its language (picked from a list) and its file; "+" adds a deck
 * (a language from the list, then the tag, e.g. Niemiecki → #DEN).
 * The data is `settings.cardAuthoring.decks`; reading aloud uses it as language rules.
 */

import { App, Modal, Notice, Setting, SettingGroup } from "obsidian";

import { getCardAuthoringSettings } from "src/card-authoring/card-authoring-controller";
import { ca } from "src/card-authoring/card-authoring-i18n";
import { CardDeck, normalizeDeckTag } from "src/card-authoring/card-authoring-settings";
import { defaultDeckFile } from "src/card-authoring/deck-languages";
import { SettingsUtil } from "src/data/settings";
import type SRPlugin from "src/main";
import { isPolish } from "src/speed-streak/speed-streak-i18n";
import { languageName, sortedLanguages, suggestDeckTag } from "src/tts/languages";

/** Language dropdown: "not read aloud", every known language, and the deck's own code if unknown. */
function fillLanguages(select: HTMLSelectElement, current: string) {
    const polish = isPolish();
    const add = (value: string, text: string) => select.createEl("option", { value, text });
    add("", ca("LANG_NONE"));
    const list = sortedLanguages(polish);
    if (current && !list.some((l) => l.code.toLowerCase() === current.toLowerCase())) {
        add(current, current);
    }
    for (const l of list) add(l.code, polish ? l.pl : l.en);
    select.value =
        list.find((l) => l.code.toLowerCase() === current.toLowerCase())?.code ?? current;
}

/**
 * Renders the list into `hostEl` (emptied first). `onChanged` runs after every saved change
 * (e.g. the read-aloud page re-renders its voices).
 */
export function renderDeckLanguages(
    hostEl: HTMLElement,
    plugin: SRPlugin,
    applySettingsUpdate: (callback: () => unknown) => void,
    onChanged: () => void = () => {},
) {
    hostEl.empty();
    const decks = () => getCardAuthoringSettings(plugin).decks;
    const save = async () => {
        await plugin.dataManager.settingsManager.save();
        plugin.cardAuthoring?.refresh();
        onChanged();
    };
    const rerender = () => renderDeckLanguages(hostEl, plugin, applySettingsUpdate, onChanged);
    const flashcardTags = plugin.dataManager.data.settings.flashcardTags;

    const group = new SettingGroup(hostEl).setHeading(ca("G_DECKS"));
    group.addSetting((setting: Setting) => {
        setting.setDesc(ca("DECKS_DESC"));
        setting.addButton((button) =>
            button
                .setIcon("plus")
                .setTooltip(ca("ADD_DECK"))
                .setCta()
                .onClick(() =>
                    new AddDeckModal(plugin.app, decks(), async (deck) => {
                        getCardAuthoringSettings(plugin).decks = [...decks(), deck];
                        await save();
                        rerender();
                    }).open(),
                ),
        );
    });

    decks().forEach((deck, index) => {
        group.addSetting((setting: Setting) => {
            setting.settingEl.addClass("sr-ca-deck-row");
            const describe = () => {
                const d = decks()[index];
                if (!d) return;
                setting.setName(d.lang ? `${d.tag} · ${languageName(d.lang, isPolish())}` : d.tag);
                setting.setDesc(
                    SettingsUtil.isTagInList(flashcardTags, d.tag)
                        ? ""
                        : ca("TAG_NOT_FLASHCARD", {
                              tag: d.tag,
                              first: flashcardTags[0] ?? "#flashcards",
                          }),
                );
            };
            describe();
            const update = (change: (d: CardDeck) => void, delayed = true) => {
                const run = async () => {
                    const d = decks()[index];
                    if (!d) return;
                    change(d);
                    await save();
                    // only the heading: re-rendering would take the focus away
                    describe();
                };
                if (delayed) applySettingsUpdate(run);
                else void run();
            };
            setting.addDropdown((dropdown) => {
                dropdown.selectEl.addClass("sr-ca-deck-lang");
                dropdown.selectEl.setAttr("aria-label", ca("DECK_LANG"));
                fillLanguages(dropdown.selectEl, deck.lang);
                dropdown.onChange((v) => update((d) => (d.lang = v), false));
            });
            setting.addText((text) => {
                text.inputEl.addClass("sr-ca-deck-tag");
                text.inputEl.setAttr("aria-label", ca("DECK_TAG"));
                text.setPlaceholder("#DEN")
                    .setValue(deck.tag)
                    .onChange((v) => update((d) => (d.tag = v)));
            });
            setting.addText((text) => {
                text.inputEl.addClass("sr-ca-deck-file");
                text.inputEl.setAttr("aria-label", ca("DECK_FILE"));
                text.setPlaceholder(defaultDeckFile(deck.tag))
                    .setValue(deck.file)
                    .onChange((v) => update((d) => (d.file = v)));
            });
            setting.addExtraButton((button) =>
                button
                    .setIcon("trash-2")
                    .setTooltip(ca("REMOVE_DECK"))
                    .onClick(async () => {
                        decks().splice(index, 1);
                        await save();
                        rerender();
                    }),
            );
        });
    });
}

/** "+": language from the list → a tag suggestion (editable) → optional file → Add. */
class AddDeckModal extends Modal {
    private lang = "";
    private tag = "";
    private file = "";

    constructor(
        app: App,
        private existing: CardDeck[],
        private onAdd: (deck: CardDeck) => void | Promise<void>,
    ) {
        super(app);
    }

    onOpen() {
        this.setTitle(ca("ADD_DECK_TITLE"));
        const el = this.contentEl;
        let tagInput: HTMLInputElement | null = null;
        let fileSetting: Setting | null = null;
        const fileDesc = () =>
            ca("ADD_DECK_FILE_DESC", {
                file: defaultDeckFile(normalizeDeckTag(this.tag) || "#DEN"),
            });

        new Setting(el)
            .setName(ca("DECK_LANG"))
            .setDesc(ca("ADD_DECK_LANG_DESC"))
            .addDropdown((dropdown) => {
                fillLanguages(dropdown.selectEl, "");
                dropdown.onChange((v) => {
                    this.lang = v;
                    if (v && tagInput && !this.tag) {
                        tagInput.value = suggestDeckTag(languageName(v, isPolish()));
                    }
                });
            });
        new Setting(el)
            .setName(ca("DECK_TAG"))
            .setDesc(ca("ADD_DECK_TAG_DESC"))
            .addText((text) => {
                tagInput = text.inputEl;
                text.setPlaceholder("#DEN").onChange((v) => {
                    this.tag = v;
                    fileSetting?.setDesc(fileDesc());
                });
            });
        fileSetting = new Setting(el)
            .setName(ca("DECK_FILE"))
            .setDesc(fileDesc())
            .addText((text) => text.setPlaceholder("Fiszki/…").onChange((v) => (this.file = v)));
        new Setting(el).addButton((b) =>
            b
                .setButtonText(ca("ADD"))
                .setCta()
                .onClick(() => {
                    const tag = normalizeDeckTag(this.tag || tagInput?.value || "");
                    if (!tag) {
                        new Notice(ca("NO_TAG"));
                        return;
                    }
                    if (this.existing.some((d) => d.tag.toLowerCase() === tag.toLowerCase())) {
                        new Notice(ca("DECK_EXISTS", { tag }));
                        return;
                    }
                    this.close();
                    void this.onAdd({
                        tag,
                        lang: this.lang,
                        file: this.file.trim() || defaultDeckFile(tag),
                    });
                }),
        );
    }

    onClose() {
        this.contentEl.empty();
    }
}
