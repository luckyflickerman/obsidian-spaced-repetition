import "src/migration/legacy-import.css";
import { App, Modal, normalizePath, Notice } from "obsidian";

import { ORIGINAL_PLUGIN_ID } from "src/data/constants";
import type SRPlugin from "src/main";
import { buildImportedData, parseLegacyData, shouldOfferImport } from "src/migration/legacy-import";
import { li } from "src/migration/legacy-import-i18n";

type Answer = "yes" | "no" | "later";

/** Yes / No / Later window. Closing it (Esc, ✕, tapping outside) counts as "Later". */
class LegacyImportModal extends Modal {
    private answered = false;

    constructor(
        app: App,
        private withReplaceWarning: boolean,
        private onAnswer: (answer: Answer) => void,
    ) {
        super(app);
    }

    onOpen(): void {
        this.setTitle(li("TITLE"));
        this.modalEl.addClass("usr-legacy-import-modal");
        const { contentEl } = this;
        contentEl.createEl("p", { text: li("QUESTION"), cls: "usr-legacy-import-question" });
        contentEl.createEl("p", { text: li("DETAILS"), cls: "usr-legacy-import-details" });
        if (this.withReplaceWarning) {
            contentEl.createEl("p", {
                text: li("REPLACE_WARNING"),
                cls: "usr-legacy-import-warning",
            });
        }
        const buttons = contentEl.createDiv({ cls: "usr-legacy-import-buttons" });
        const add = (answer: Answer, text: string, cta = false) => {
            const btn = buttons.createEl("button", { text, cls: cta ? "mod-cta" : "" });
            btn.addEventListener("click", () => this.answer(answer));
        };
        add("later", li("LATER"));
        add("no", li("NO"));
        add("yes", li("YES"), true);
    }

    private answer(answer: Answer): void {
        if (this.answered) return;
        this.answered = true;
        this.close();
        this.onAnswer(answer);
    }

    onClose(): void {
        this.contentEl.empty();
        if (!this.answered) {
            this.answered = true;
            this.onAnswer("later");
        }
    }
}

/**
 * Offers (once) to copy data from the original Spaced Repetition plugin, and adds a command to do
 * it later. Reads the original data.json through the vault adapter (works on mobile too) and never
 * writes to it.
 */
export class LegacyImportController {
    private plugin: SRPlugin;

    constructor(plugin: SRPlugin) {
        this.plugin = plugin;
    }

    load(): void {
        this.plugin.addCommand({
            id: "usr-import-original-data",
            name: li("COMMAND"),
            callback: () => void this.runFromCommand(),
        });
    }

    private get legacyPath(): string {
        const configDir = this.plugin.app.vault.configDir;
        return normalizePath(`${configDir}/plugins/${ORIGINAL_PLUGIN_ID}/data.json`);
    }

    private async legacyExists(): Promise<boolean> {
        try {
            return await this.plugin.app.vault.adapter.exists(this.legacyPath);
        } catch {
            return false;
        }
    }

    /** Called once after the layout is ready. */
    async checkOnStartup(): Promise<void> {
        const dataManager = this.plugin.dataManager;
        const state = dataManager.data.legacyImport;
        const offer = shouldOfferImport(
            dataManager.pluginDataManager.loadedEmpty,
            state,
            await this.legacyExists(),
        );
        if (!offer) return;

        if (state !== "pending") {
            // Remember that we asked, so "Later" asks again on the next start
            dataManager.data.legacyImport = "pending";
            await dataManager.savePluginData();
        }
        new LegacyImportModal(this.plugin.app, false, (answer) => {
            void this.onStartupAnswer(answer);
        }).open();
    }

    private async onStartupAnswer(answer: Answer): Promise<void> {
        if (answer === "yes") {
            await this.importNow();
        } else if (answer === "no") {
            this.plugin.dataManager.data.legacyImport = "declined";
            await this.plugin.dataManager.savePluginData();
        }
        // "later": stays "pending"
    }

    private async runFromCommand(): Promise<void> {
        if (!(await this.legacyExists())) {
            new Notice(li("NOT_FOUND"));
            return;
        }
        new LegacyImportModal(this.plugin.app, true, (answer) => {
            if (answer === "yes") void this.importNow();
        }).open();
    }

    private async importNow(): Promise<void> {
        let raw: string | null;
        try {
            raw = await this.plugin.app.vault.adapter.read(this.legacyPath);
        } catch {
            raw = null;
        }
        const parsed = parseLegacyData(raw);
        if (!parsed.ok) {
            new Notice(li("BROKEN"), 10000);
            return;
        }

        const data = buildImportedData(parsed.value);
        data.legacyImport = "done";
        await this.plugin.saveData(data);
        new Notice(li("DONE"), 0);
        await this.reloadPlugin();
    }

    /** Restart this plugin so every part picks up the imported data. */
    private async reloadPlugin(): Promise<void> {
        const plugins = (
            this.plugin.app as unknown as {
                plugins?: {
                    disablePlugin?: (id: string) => Promise<void>;
                    enablePlugin?: (id: string) => Promise<void>;
                };
            }
        ).plugins;
        const id = this.plugin.manifest.id;
        if (plugins?.disablePlugin && plugins?.enablePlugin) {
            try {
                await plugins.disablePlugin(id);
                await plugins.enablePlugin(id);
                return;
            } catch (e) {
                console.warn("Upgraded Spaced Repetition: reload after import failed", e);
            }
        }
        new Notice(li("RESTART"), 0);
    }
}
