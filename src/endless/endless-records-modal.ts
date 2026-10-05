/**
 * Endless mode — window with the records: top 5 runs, last sessions, totals.
 */

import { App, Modal } from "obsidian";

import { en } from "src/endless/endless-i18n";
import { EndlessRecords, formatSessionTime } from "src/endless/endless-records";
import { isPolish } from "src/speed-streak/speed-streak-i18n";
import { formatRunDate } from "src/speed-streak/speed-streak-records";

export class EndlessRecordsModal extends Modal {
    private records: EndlessRecords;

    constructor(app: App, records: EndlessRecords) {
        super(app);
        this.records = records;
    }

    onOpen(): void {
        this.modalEl.addClass("sr-endless-records-modal");
        this.setTitle(en("RECORDS_TITLE"));
        const r = this.records;
        const now = Date.now();
        const polish = isPolish();
        const date = (ms: number) => formatRunDate(ms, now, polish);

        if (r.top.length === 0 && r.recent.length === 0) {
            this.contentEl.createEl("p", { cls: "sr-endless-empty", text: en("RECORDS_EMPTY") });
        }

        if (r.top.length > 0) {
            this.contentEl.createEl("h3", { text: en("TOP_5") });
            const list = this.contentEl.createEl("ol", { cls: "sr-endless-top" });
            for (const run of r.top) {
                list.createEl("li", {
                    text: en("RUN_LINE", {
                        score: run.score,
                        decks: run.decks || "—",
                        date: date(run.endedAt),
                    }),
                });
            }
        }

        if (r.recent.length > 0) {
            this.contentEl.createEl("h3", { text: en("RECENT") });
            const list = this.contentEl.createEl("ul", { cls: "sr-endless-recent" });
            for (const s of r.recent) {
                list.createEl("li", {
                    text: en("SESSION_LINE", {
                        date: date(s.endedAt),
                        decks: s.decks || "—",
                        ratings: s.ratings,
                        best: s.bestScore,
                        errors: s.errors,
                        time: formatSessionTime(s.durationMs),
                    }),
                });
            }
        }

        this.contentEl.createEl("p", {
            cls: "sr-endless-totals",
            text: en("TOTALS", { ratings: r.totals.ratings, sessions: r.totals.sessions }),
        });
        this.contentEl.createEl("p", { cls: "sr-endless-honesty", text: en("HONESTY") });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
