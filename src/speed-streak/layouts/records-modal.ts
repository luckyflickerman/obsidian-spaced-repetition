/**
 * Records window: the top 5 and the details of a streak (active time, cards,
 * pauses, Boosts, deck). Opened by tapping the record or a row of the list.
 */

import { App, Modal } from "obsidian";

import type { ListedRun } from "src/speed-streak/layouts/layout-types";
import { ss } from "src/speed-streak/speed-streak-i18n";
import { formatDuration, formatRunDate, runBadge } from "src/speed-streak/speed-streak-records";
import type { SpeedStreakRunRecord } from "src/speed-streak/speed-streak-settings";

export class RecordsModal extends Modal {
    constructor(
        app: App,
        private runs: ListedRun[],
        private listTitle: string,
        private selected: SpeedStreakRunRecord | null,
        private polish: boolean,
    ) {
        super(app);
    }

    onOpen() {
        this.modalEl.addClass("sr-ss-records-modal");
        if (this.selected) this.showDetails(this.selected, false);
        else this.showList();
    }

    onClose() {
        this.contentEl.empty();
    }

    private showList() {
        this.setTitle(ss("RECORDS_TITLE"));
        const el = this.contentEl;
        el.empty();
        el.createDiv({ cls: "sr-ss-panel-label", text: this.listTitle });
        if (this.runs.length === 0) {
            el.createDiv({ cls: "sr-ss-panel-empty", text: ss("RECORDS_EMPTY") });
            return;
        }
        const rows = el.createDiv({ cls: "sr-ss-panel-rows" });
        for (const item of this.runs) {
            const row = rows.createEl("button", { cls: "sr-ss-panel-row" });
            row.createSpan({ cls: "sr-ss-row-rank", text: `#${item.rank}` });
            row.createSpan({ cls: "sr-ss-row-date", text: item.date });
            row.createSpan({
                cls: `sr-ss-badge ${item.badge === "pure" ? "is-pure" : ""}`,
                text: item.badge === "pure" ? ss("PURE_BADGE") : ss("BREAKS_BADGE"),
            });
            row.createSpan({ cls: "sr-ss-row-streak", text: String(item.run.streak) });
            row.addEventListener("click", () => this.showDetails(item.run, true));
        }
    }

    private showDetails(run: SpeedStreakRunRecord, canGoBack: boolean) {
        this.setTitle(ss("RUN_DETAILS", { n: run.streak }));
        const el = this.contentEl;
        el.empty();
        const badge = runBadge(run);
        el.createSpan({
            cls: `sr-ss-badge ${badge === "pure" ? "is-pure" : ""}`,
            text: badge === "pure" ? ss("PURE_BADGE") : ss("BREAKS_BADGE"),
        });
        const table = el.createDiv({ cls: "sr-ss-details" });
        const row = (label: string, value: string) => {
            table.createDiv({ cls: "sr-ss-details-label", text: label });
            table.createDiv({ cls: "sr-ss-details-value", text: value });
        };
        const end =
            run.endReason === "again"
                ? ss("END_AGAIN")
                : run.endReason === "session-end"
                  ? ss("END_SESSION")
                  : ss("END_TIMEOUT");
        row(ss("D_DATE"), formatRunDate(run.endedAt, Date.now(), this.polish));
        row(ss("D_ACTIVE"), formatDuration(run.activeMs));
        row(ss("D_CARDS"), String(run.cards ?? run.streak));
        row(ss("D_PAUSES"), String(run.pauses ?? 0));
        row(ss("D_BOOSTS"), String(run.boostsUsed ?? 0));
        if (run.deck) row(ss("D_DECK"), run.deck);
        row(ss("D_END"), end);
        if (run.score > 0) row(ss("SCORE"), String(run.score));

        if (canGoBack) {
            const back = el.createEl("button", { cls: "sr-ss-details-back", text: ss("BACK") });
            back.addEventListener("click", () => this.showList());
        }
    }
}
