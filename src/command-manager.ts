import { Editor, Menu, Notice, Platform, TFile } from "obsidian";

import { SettingsManager } from "src/data/settings-manager";
import { t } from "src/lang/helpers";
import SRPlugin from "src/main";
import { ReviewWindowController } from "src/review-window/review-window-controller";
import { rw } from "src/review-window/review-window-i18n";
import { ReviewResponse } from "src/scheduling/algorithms/base/repetition-item";
import { FlashcardReviewMode } from "src/scheduling/flashcard-review-sequencer";
import {
    getSpeedStreakSettings,
    SpeedStreakController,
} from "src/speed-streak/speed-streak-controller";
import { ss } from "src/speed-streak/speed-streak-i18n";
import { boostsActive } from "src/speed-streak/speed-streak-settings";
import { TtsController } from "src/tts/tts-controller";
import { tt } from "src/tts/tts-i18n";
import { toggleUnderline } from "src/tts/tts-text";
import { UIManager, UIState } from "src/ui/ui-manager";
import EmulatedPlatform from "src/utils/platform-detector";

/** Wraps the selection in `<u>…</u>` (or unwraps it) — "Mark for reading aloud". */
function toggleTtsMark(editor: Editor) {
    const doc = editor.getValue();
    const from = editor.posToOffset(editor.getCursor("from"));
    const to = editor.posToOffset(editor.getCursor("to"));
    const edit = toggleUnderline(doc, from, to);
    editor.replaceRange(edit.insert, editor.offsetToPos(edit.from), editor.offsetToPos(edit.to));
    editor.setSelection(
        editor.offsetToPos(edit.selectionFrom),
        editor.offsetToPos(edit.selectionTo),
    );
    editor.focus();
}

export class CommandManager {
    private plugin: SRPlugin;
    private settingsManager: SettingsManager;
    private uiManager: UIManager;

    constructor(plugin: SRPlugin, settingsManager: SettingsManager, uiManager: UIManager) {
        this.plugin = plugin;
        this.settingsManager = settingsManager;
        this.uiManager = uiManager;
    }

    /**
     * register all the plugin commands once the plugin is loaded
     */
    public onLayoutReady() {
        if (this.settingsManager.settings.useCustomHotkeys) {
            this.addCustomHotkeys();
        }

        this.addPluginCommands();
    }

    /**
     * remove all the plugin commands once the plugin is unloaded
     */
    public onunload() {
        this.removeCustomHotkeys();
    }

    /**
     * remove all the hotkeys
     */
    public removeCustomHotkeys() {
        this.plugin.removeCommand("srs-card-review-again");
        this.plugin.removeCommand("srs-card-review-hard");
        this.plugin.removeCommand("srs-card-review-good");
        this.plugin.removeCommand("srs-card-review-easy");
        this.plugin.removeCommand("srs-card-review-show-answer");
        this.plugin.removeCommand("srs-card-review-reset");
        this.plugin.removeCommand("srs-card-review-skip");
    }

    /**
     * add all the hotkeys
     */
    public addCustomHotkeys() {
        this.plugin.addCommand({
            id: "srs-card-review-again",
            name: t("REVIEW_CARD_DIFFICULTY_CMD", {
                difficulty: this.settingsManager.settings.flashcardAgainText,
            }),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                if (
                    this.plugin.isInitialized &&
                    this.uiManager.uiState === UIState.CardBack &&
                    this.uiManager.isSRInFocus &&
                    this.uiManager.contentManager !== null &&
                    !(
                        Platform.isMobile || // No keyboard events on mobile
                        EmulatedPlatform().isMobile
                    ) &&
                    !(
                        activeDocument.activeElement !== null &&
                        (activeDocument.activeElement.nodeName === "TEXTAREA" ||
                            activeDocument.activeElement.nodeName === "INPUT")
                    )
                ) {
                    if (!checking) {
                        void this.uiManager.contentManager._processReview(ReviewResponse.Again);
                    }
                    return true;
                }
                return false;
            },
        });

        this.plugin.addCommand({
            id: "srs-card-review-hard",
            name: t("REVIEW_CARD_DIFFICULTY_CMD", {
                difficulty: this.settingsManager.settings.flashcardHardText,
            }),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                if (
                    this.plugin.isInitialized &&
                    this.uiManager.uiState === UIState.CardBack &&
                    this.uiManager.isSRInFocus &&
                    this.uiManager.contentManager !== null &&
                    !(
                        Platform.isMobile || // No keyboard events on mobile
                        EmulatedPlatform().isMobile
                    ) &&
                    !(
                        activeDocument.activeElement !== null &&
                        (activeDocument.activeElement.nodeName === "TEXTAREA" ||
                            activeDocument.activeElement.nodeName === "INPUT")
                    )
                ) {
                    if (!checking) {
                        void this.uiManager.contentManager._processReview(ReviewResponse.Hard);
                    }
                    return true;
                }
                return false;
            },
        });

        this.plugin.addCommand({
            id: "srs-card-review-good",
            name: t("REVIEW_CARD_DIFFICULTY_CMD", {
                difficulty: this.settingsManager.settings.flashcardGoodText,
            }),
            checkCallback: (checking: boolean) => {
                if (
                    this.plugin.isInitialized &&
                    this.uiManager.uiState === UIState.CardBack &&
                    this.uiManager.isSRInFocus &&
                    this.uiManager.contentManager !== null &&
                    !(
                        Platform.isMobile || // No keyboard events on mobile
                        EmulatedPlatform().isMobile
                    ) &&
                    !(
                        activeDocument.activeElement !== null &&
                        (activeDocument.activeElement.nodeName === "TEXTAREA" ||
                            activeDocument.activeElement.nodeName === "INPUT")
                    )
                ) {
                    if (!checking) {
                        void this.uiManager.contentManager._processReview(ReviewResponse.Good);
                    }
                    return true;
                }
                return false;
            },
        });

        this.plugin.addCommand({
            id: "srs-card-review-easy",
            name: t("REVIEW_CARD_DIFFICULTY_CMD", {
                difficulty: this.settingsManager.settings.flashcardEasyText,
            }),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                if (
                    this.plugin.isInitialized &&
                    this.uiManager.uiState === UIState.CardBack &&
                    this.uiManager.isSRInFocus &&
                    this.uiManager.contentManager !== null &&
                    !(
                        Platform.isMobile || // No keyboard events on mobile
                        EmulatedPlatform().isMobile
                    ) &&
                    !(
                        activeDocument.activeElement !== null &&
                        (activeDocument.activeElement.nodeName === "TEXTAREA" ||
                            activeDocument.activeElement.nodeName === "INPUT")
                    )
                ) {
                    if (!checking) {
                        void this.uiManager.contentManager._processReview(ReviewResponse.Easy);
                    }
                    return true;
                }
                return false;
            },
        });

        this.plugin.addCommand({
            id: "srs-card-review-show-answer",
            name: t("SHOW_ANSWER"),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                if (
                    this.plugin.isInitialized &&
                    this.uiManager.uiState === UIState.CardFront &&
                    this.uiManager.isSRInFocus &&
                    this.uiManager.contentManager !== null &&
                    !(
                        Platform.isMobile || // No keyboard events on mobile
                        EmulatedPlatform().isMobile
                    ) &&
                    !(
                        activeDocument.activeElement !== null &&
                        (activeDocument.activeElement.nodeName === "TEXTAREA" ||
                            activeDocument.activeElement.nodeName === "INPUT")
                    )
                ) {
                    if (!checking) {
                        void this.uiManager.contentManager._showAnswer();
                    }
                    return true;
                }
                return false;
            },
        });

        this.plugin.addCommand({
            id: "srs-card-review-skip",
            name: t("SKIP"),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                if (
                    this.plugin.isInitialized &&
                    (this.uiManager.uiState === UIState.CardBack ||
                        this.uiManager.uiState === UIState.CardFront) &&
                    this.uiManager.isSRInFocus &&
                    this.uiManager.contentManager !== null &&
                    !(
                        Platform.isMobile || // No keyboard events on mobile
                        EmulatedPlatform().isMobile
                    ) &&
                    !(
                        activeDocument.activeElement !== null &&
                        (activeDocument.activeElement.nodeName === "TEXTAREA" ||
                            activeDocument.activeElement.nodeName === "INPUT")
                    )
                ) {
                    if (!checking) {
                        void this.uiManager.contentManager._skipCurrentCard();
                    }
                    return true;
                }
                return false;
            },
        });

        this.plugin.addCommand({
            id: "srs-card-review-reset",
            name: t("RESET_CARD_PROGRESS"),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                if (
                    this.plugin.isInitialized &&
                    this.uiManager.uiState === UIState.CardBack &&
                    this.uiManager.isSRInFocus &&
                    this.uiManager.contentManager !== null &&
                    !(
                        Platform.isMobile || // No keyboard events on mobile
                        EmulatedPlatform().isMobile
                    ) &&
                    !(
                        activeDocument.activeElement !== null &&
                        (activeDocument.activeElement.nodeName === "TEXTAREA" ||
                            activeDocument.activeElement.nodeName === "INPUT")
                    )
                ) {
                    if (!checking) {
                        void this.uiManager.contentManager._processReview(ReviewResponse.Reset);
                    }
                    return true;
                }
                return false;
            },
        });

        this.plugin.addCommand({
            id: "srs-card-review-reset",
            name: t("OPEN_IN_BACKGROUND"),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                if (
                    this.plugin.isInitialized &&
                    this.uiManager.uiState === UIState.CardBack &&
                    this.uiManager.isSRInFocus &&
                    this.uiManager.contentManager !== null &&
                    !(
                        Platform.isMobile || // No keyboard events on mobile
                        EmulatedPlatform().isMobile
                    ) &&
                    !(
                        activeDocument.activeElement !== null &&
                        (activeDocument.activeElement.nodeName === "TEXTAREA" ||
                            activeDocument.activeElement.nodeName === "INPUT")
                    )
                ) {
                    if (!checking) {
                        void this.uiManager.contentManager._jumpToCurrentCard();
                    }
                    return true;
                }
                return false;
            },
        });
    }

    /**
     * add all the plugin commands
     */
    private addPluginCommands() {
        // Read aloud: editorCallback → also in the mobile command palette & toolbar
        this.plugin.addCommand({
            id: "srs-tts-mark",
            name: tt("CMD_MARK"),
            icon: "volume-2",
            hotkeys: [{ modifiers: ["Mod", "Shift"], key: "U" }],
            editorCallback: (editor: Editor) => toggleTtsMark(editor),
        });
        this.plugin.registerEvent(
            this.plugin.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
                menu.addItem((item) =>
                    item
                        .setTitle(tt("CMD_MARK"))
                        .setIcon("volume-2")
                        .onClick(() => toggleTtsMark(editor)),
                );
            }),
        );
        this.plugin.addCommand({
            id: "srs-tts-replay",
            name: tt("CMD_REPLAY"),
            icon: "volume-2",
            checkCallback: (checking: boolean) => {
                const controller = TtsController.active;
                if (!controller || !controller.canReplay) return false;
                if (!checking) controller.replay();
                return true;
            },
        });

        // Review window
        this.plugin.addCommand({
            id: "srs-review-window-fullscreen",
            name: rw("CMD_FULLSCREEN"),
            icon: "maximize-2",
            checkCallback: (checking: boolean) => {
                const controller = ReviewWindowController.active;
                if (!controller) return false;
                if (!checking) controller.toggleFullscreen();
                return true;
            },
        });

        // Speed Streak
        this.plugin.addCommand({
            id: "srs-speed-streak-boost",
            name: ss("CMD_BOOST"),
            checkCallback: (checking: boolean) => {
                const controller = SpeedStreakController.active;
                if (!controller || !controller.engine.sessionActive) return false;
                if (!boostsActive(controller.engine.settings)) return false;
                if (!checking) controller.useBoost();
                return true;
            },
        });
        this.plugin.addCommand({
            id: "srs-speed-streak-pause",
            name: ss("CMD_PAUSE"),
            checkCallback: (checking: boolean) => {
                const controller = SpeedStreakController.active;
                if (!controller || !controller.engine.sessionActive) return false;
                if (!checking) controller.togglePause();
                return true;
            },
        });
        this.plugin.addCommand({
            id: "srs-speed-streak-toggle",
            name: ss("CMD_TOGGLE"),
            callback: async () => {
                const settings = getSpeedStreakSettings(this.plugin);
                settings.enabled = !settings.enabled;
                await this.settingsManager.save();
                SpeedStreakController.active?.refreshSettings();
                new Notice(settings.enabled ? ss("TOGGLED_ON") : ss("TOGGLED_OFF"));
            },
        });

        this.plugin.addCommand({
            id: "srs-note-review-open-note",
            name: t("OPEN_NOTE_FOR_REVIEW"),
            callback: async () => {
                if (
                    !this.plugin.dataManager.syncLock &&
                    this.plugin.nextNoteReviewHandler !== null &&
                    this.plugin.isInitialized
                ) {
                    await this.plugin.dataManager.sync();
                    await this.plugin.nextNoteReviewHandler.reviewNextNoteModal();
                }
            },
        });

        this.plugin.addCommand({
            id: "srs-note-review-easy",
            name: t("REVIEW_NOTE_DIFFICULTY_CMD", {
                difficulty: this.settingsManager.settings.flashcardEasyText,
            }),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                const openFile: TFile | null = this.plugin.app.workspace.getActiveFile();

                if (openFile === null || openFile.extension !== "md" || !this.plugin.isInitialized)
                    return false;

                if (!checking) {
                    void this.plugin.dataManager.saveNoteReviewResponse(
                        openFile,
                        ReviewResponse.Easy,
                    );
                }
                return true;
            },
        });

        this.plugin.addCommand({
            id: "srs-note-review-good",
            name: t("REVIEW_NOTE_DIFFICULTY_CMD", {
                difficulty: this.settingsManager.settings.flashcardGoodText,
            }),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                const openFile: TFile | null = this.plugin.app.workspace.getActiveFile();

                if (openFile === null || openFile.extension !== "md" || !this.plugin.isInitialized)
                    return false;

                if (!checking) {
                    void this.plugin.dataManager.saveNoteReviewResponse(
                        openFile,
                        ReviewResponse.Good,
                    );
                }
                return true;
            },
        });

        this.plugin.addCommand({
            id: "srs-note-review-hard",
            name: t("REVIEW_NOTE_DIFFICULTY_CMD", {
                difficulty: this.settingsManager.settings.flashcardHardText,
            }),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                const openFile: TFile | null = this.plugin.app.workspace.getActiveFile();

                if (openFile === null || openFile.extension !== "md" || !this.plugin.isInitialized)
                    return false;

                if (!checking) {
                    void this.plugin.dataManager.saveNoteReviewResponse(
                        openFile,
                        ReviewResponse.Hard,
                    );
                }
                return true;
            },
        });

        this.plugin.addCommand({
            id: "srs-review-flashcards",
            name: t("REVIEW_ALL_CARDS"),
            callback: async () => {
                if (!this.plugin.isInitialized) return;
                await this.uiManager.openDeckContainer(FlashcardReviewMode.Review);
            },
        });

        this.plugin.addCommand({
            id: "srs-cram-flashcards",
            name: t("CRAM_ALL_CARDS"),
            callback: async () => {
                if (!this.plugin.isInitialized) return;
                await this.uiManager.openDeckContainer(FlashcardReviewMode.Cram);
            },
        });

        this.plugin.addCommand({
            id: "srs-review-flashcards-in-note",
            name: t("REVIEW_CARDS_IN_NOTE"),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                const openFile: TFile | null = this.plugin.app.workspace.getActiveFile();

                if (openFile === null || openFile.extension !== "md" || !this.plugin.isInitialized)
                    return false;

                if (!checking) {
                    void this.uiManager.openDeckContainer(FlashcardReviewMode.Review, openFile);
                }
                return true;
            },
        });

        this.plugin.addCommand({
            id: "srs-cram-flashcards-in-note",
            name: t("CRAM_CARDS_IN_NOTE"),
            repeatable: false,
            checkCallback: (checking: boolean) => {
                const openFile: TFile | null = this.plugin.app.workspace.getActiveFile();

                if (openFile === null || openFile.extension !== "md" || !this.plugin.isInitialized)
                    return false;

                if (!checking) {
                    void this.uiManager.openDeckContainer(FlashcardReviewMode.Cram, openFile);
                }
                return true;
            },
        });

        this.plugin.addCommand({
            id: "srs-open-review-queue-view",
            name: t("OPEN_REVIEW_QUEUE_VIEW"),
            callback: async () => {
                if (!this.plugin.isInitialized) return;
                await this.uiManager.sidebarManager.openReviewQueueView();
            },
        });
    }
}
