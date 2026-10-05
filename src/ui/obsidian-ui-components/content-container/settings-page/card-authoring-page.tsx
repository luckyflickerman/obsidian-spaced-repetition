import { Setting, SettingGroup } from "obsidian";

import { ca } from "src/card-authoring/card-authoring-i18n";
import {
    CardAuthoringSettings,
    normalizeCardAuthoringSettings,
} from "src/card-authoring/card-authoring-settings";
import { DataManager } from "src/data/data-manager";
import { SettingsUtil } from "src/data/settings";
import { SettingsManager } from "src/data/settings-manager";
import SRPlugin from "src/main";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import { SettingsPageType } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-types";

type BoolKey = {
    [K in keyof CardAuthoringSettings]: CardAuthoringSettings[K] extends boolean ? K : never;
}[keyof CardAuthoringSettings];

/**
 * Settings page "Card authoring": card decks (tag → file → reading language),
 * second direction, editor icons, daily counter and images.
 */
export class CardAuthoringPage extends SettingsPage {
    private decksHost: HTMLElement;

    constructor(
        pageContainerEl: HTMLElement,
        plugin: SRPlugin,
        settingsManager: SettingsManager,
        dataManager: DataManager,
        pageType: SettingsPageType,
        applySettingsUpdate: (callback: () => unknown) => void,
        display: () => void,
        openPage: (pageType: SettingsPageType) => void,
        scrollListener: (scrollPosition: number) => void,
    ) {
        super(
            pageContainerEl,
            plugin,
            settingsManager,
            dataManager,
            pageType,
            applySettingsUpdate,
            display,
            openPage,
            scrollListener,
        );
        this.build();
    }

    private get caSettings(): CardAuthoringSettings {
        const settings = this.settingsManager.settings;
        settings.cardAuthoring = normalizeCardAuthoringSettings(settings.cardAuthoring);
        return settings.cardAuthoring;
    }

    private async save() {
        this.settingsManager.settings.cardAuthoring = normalizeCardAuthoringSettings(
            this.settingsManager.settings.cardAuthoring,
        );
        await this.settingsManager.save();
        this.plugin.cardAuthoring?.refresh();
    }

    private addToggle(group: SettingGroup, key: BoolKey, name: string, desc?: string) {
        group.addSetting((setting: Setting) => {
            setting.setName(name);
            if (desc) setting.setDesc(desc);
            setting.addToggle((toggle) =>
                toggle.setValue(this.caSettings[key]).onChange(async (value) => {
                    this.caSettings[key] = value;
                    await this.save();
                }),
            );
        });
    }

    private addNumber(
        group: SettingGroup,
        key: "dailyGoal" | "maxImageWidth",
        name: string,
        desc?: string,
    ) {
        group.addSetting((setting: Setting) => {
            setting.setName(name);
            if (desc) setting.setDesc(desc);
            setting.addText((text) => {
                text.inputEl.type = "number";
                text.inputEl.addClass("sr-ss-number-input");
                text.setValue(String(this.caSettings[key])).onChange((value) => {
                    this.applySettingsUpdate(async () => {
                        const n = parseInt(value, 10);
                        if (!Number.isFinite(n)) return;
                        this.caSettings[key] = n;
                        await this.save();
                    });
                });
            });
        });
    }

    private build() {
        // Decks
        this.decksHost = this.containerEl.createDiv();
        this.renderDecks();

        // Writing
        const writing = new SettingGroup(this.containerEl).setHeading(ca("G_WRITING"));
        const sep = this.settingsManager.settings.singleLineReversedCardSeparator;
        this.addToggle(writing, "bothDirections", ca("BOTH"), ca("BOTH_DESC", { sep }));
        this.addToggle(writing, "editorIcons", ca("ICONS"), ca("ICONS_DESC"));
        this.addToggle(writing, "compactScheduleComments", ca("COMPACT_SR"), ca("COMPACT_SR_DESC"));

        // Counter
        const counter = new SettingGroup(this.containerEl).setHeading(ca("G_COUNTER"));
        this.addNumber(counter, "dailyGoal", ca("GOAL"), ca("GOAL_DESC"));
        this.addToggle(counter, "showDailyCounter", ca("SHOW_COUNTER"), ca("SHOW_COUNTER_DESC"));
        this.addToggle(counter, "goalInDeckList", ca("GOAL_IN_DECKS"), ca("GOAL_IN_DECKS_DESC"));

        // Images
        const images = new SettingGroup(this.containerEl).setHeading(ca("G_IMAGES"));
        this.addToggle(images, "renamePastedImages", ca("RENAME_PASTED"), ca("RENAME_PASTED_DESC"));
        this.addToggle(images, "resizeImages", ca("RESIZE"), ca("RESIZE_DESC"));
        this.addNumber(images, "maxImageWidth", ca("MAX_WIDTH"));
    }

    /** One row per deck: tag, file, language, remove; plus "Add deck". */
    private renderDecks() {
        this.decksHost.empty();
        const group = new SettingGroup(this.decksHost).setHeading(ca("G_DECKS"));
        group.addSetting((setting: Setting) => setting.setDesc(ca("DECKS_DESC")));
        const flashcardTags = this.settingsManager.settings.flashcardTags;

        this.caSettings.decks.forEach((deck, index) => {
            group.addSetting((setting: Setting) => {
                setting.settingEl.addClass("sr-ca-deck-row");
                setting.setName(deck.tag);
                if (!SettingsUtil.isTagInList(flashcardTags, deck.tag)) {
                    setting.setDesc(
                        ca("TAG_NOT_FLASHCARD", {
                            tag: deck.tag,
                            first: flashcardTags[0] ?? "#flashcards",
                        }),
                    );
                }
                const update = (change: (d: typeof deck) => void) => {
                    this.applySettingsUpdate(async () => {
                        const decks = this.caSettings.decks;
                        if (!decks[index]) return;
                        change(decks[index]);
                        await this.save();
                        // only the heading: re-rendering would take the focus away
                        setting.setName(this.caSettings.decks[index]?.tag ?? "");
                    });
                };
                setting.addText((text) => {
                    text.inputEl.addClass("sr-ca-deck-tag");
                    text.inputEl.setAttr("aria-label", ca("DECK_TAG"));
                    text.setPlaceholder("#ENG")
                        .setValue(deck.tag)
                        .onChange((v) => update((d) => (d.tag = v)));
                });
                setting.addText((text) => {
                    text.inputEl.addClass("sr-ca-deck-file");
                    text.inputEl.setAttr("aria-label", ca("DECK_FILE"));
                    text.setPlaceholder("Fiszki/Angielski.md")
                        .setValue(deck.file)
                        .onChange((v) => update((d) => (d.file = v)));
                });
                setting.addText((text) => {
                    text.inputEl.addClass("sr-ca-deck-lang");
                    text.inputEl.setAttr("aria-label", ca("DECK_LANG"));
                    text.setPlaceholder("en-GB")
                        .setValue(deck.lang)
                        .onChange((v) => update((d) => (d.lang = v)));
                });
                setting.addExtraButton((button) =>
                    button
                        .setIcon("trash-2")
                        .setTooltip(ca("REMOVE_DECK"))
                        .onClick(async () => {
                            this.caSettings.decks.splice(index, 1);
                            await this.save();
                            this.renderDecks();
                        }),
                );
            });
        });

        group.addSetting((setting: Setting) =>
            setting.addButton((button) =>
                button.setButtonText(ca("ADD_DECK")).onClick(async () => {
                    const n = this.caSettings.decks.length + 1;
                    this.caSettings.decks.push({
                        tag: `#TALIA${n}`,
                        file: `Fiszki/Talia ${n}.md`,
                        lang: "",
                    });
                    await this.save();
                    this.renderDecks();
                }),
            ),
        );
    }
}
