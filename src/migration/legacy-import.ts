/**
 * One-time import of data from the original "Spaced Repetition" plugin
 * (`.obsidian/plugins/obsidian-spaced-repetition/data.json`).
 *
 * Pure logic only (no Obsidian, no DOM) - the controller reads the file and shows the window.
 * The original file is never modified.
 */
import { normalizeCardAuthoringSettings } from "src/card-authoring/card-authoring-settings";
import { normalizeCardHistory } from "src/card-authoring/daily-counter";
import { DEFAULT_DATA, ISerializedScheduleData, PluginData } from "src/data/plugin-data";
import { DEFAULT_SETTINGS, SRSettings, upgradeSettings } from "src/data/settings";
import { normalizeHeatmapSettings, normalizeReviewLog } from "src/heatmap/heatmap-data";
import { normalizeReviewWindowSettings } from "src/review-window/review-window";
import {
    normalizeSpeedStreakData,
    normalizeSpeedStreakSettings,
} from "src/speed-streak/speed-streak-settings";
import { normalizeTtsSettings } from "src/tts/tts-settings";

/**
 * What happened with the import offer, kept in this plugin's data:
 * - `pending`  - offered, the user chose "Later" (ask again on the next start)
 * - `declined` - the user chose "No" (do not ask again; the command still works)
 * - `done`     - imported
 */
export type LegacyImportState = "pending" | "declined" | "done";

/** Result of reading the original plugin's data.json text. */
export type LegacyParseResult = { ok: true; value: Record<string, unknown> } | { ok: false };

function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone<T>(value: T): T {
    if (value === undefined) return value;
    return JSON.parse(JSON.stringify(value)) as T;
}

/** Parses the original data.json. Broken JSON or anything that is not an object → `ok: false`. */
export function parseLegacyData(raw: string | null | undefined): LegacyParseResult {
    if (typeof raw !== "string" || raw.trim() === "") return { ok: false };
    try {
        const value: unknown = JSON.parse(raw);
        return isObject(value) ? { ok: true, value } : { ok: false };
    } catch {
        return { ok: false };
    }
}

function normalizeScheduleData(stored: unknown): ISerializedScheduleData {
    const def = clone(DEFAULT_DATA.scheduleData);
    if (!isObject(stored)) return def;
    return {
        version: typeof stored.version === "number" ? stored.version : def.version,
        noteSchedules: isObject(stored.noteSchedules)
            ? (clone(stored.noteSchedules) as ISerializedScheduleData["noteSchedules"])
            : {},
        cardSchedules: isObject(stored.cardSchedules)
            ? (clone(stored.cardSchedules) as ISerializedScheduleData["cardSchedules"])
            : {},
    };
}

function mergeSettings(stored: unknown): SRSettings {
    // Same order as PluginDataManager.loadData: upgrade the old settings first (it converts
    // options only while the new ones are still missing), then fill in the defaults
    const old = (isObject(stored) ? clone(stored) : {}) as unknown as SRSettings;
    upgradeSettings(old);
    const settings = Object.assign(clone(DEFAULT_SETTINGS), old);
    settings.speedStreak = normalizeSpeedStreakSettings(settings.speedStreak);
    settings.tts = normalizeTtsSettings(settings.tts);
    settings.heatmap = normalizeHeatmapSettings(settings.heatmap);
    settings.reviewWindow = normalizeReviewWindowSettings(settings.reviewWindow);
    settings.cardAuthoring = normalizeCardAuthoringSettings(settings.cardAuthoring);
    return settings;
}

/**
 * Builds complete plugin data from the original plugin's data: missing or broken fields get
 * defaults, new fields (Speed Streak, calendar, card authoring…) are filled in, so data from any
 * older version loads correctly. The input is not modified.
 */
export function buildImportedData(legacy: unknown): PluginData {
    const src = isObject(legacy) ? legacy : {};
    const data = clone(DEFAULT_DATA);
    data.settings = mergeSettings(src.settings);
    data.buryDate = typeof src.buryDate === "string" ? src.buryDate : "";
    data.buryList = Array.isArray(src.buryList)
        ? src.buryList.filter((h): h is string => typeof h === "string")
        : [];
    data.historyDeck = typeof src.historyDeck === "string" ? src.historyDeck : null;
    data.scheduleData = normalizeScheduleData(src.scheduleData);
    data.speedStreak = normalizeSpeedStreakData(clone(src.speedStreak));
    data.reviewLog = normalizeReviewLog(clone(src.reviewLog));
    data.cardHistory = normalizeCardHistory(clone(src.cardHistory));
    return data;
}

/**
 * Should the import window open on start-up?
 * - asked before and the answer was "Later" → yes
 * - first start of this plugin (no own data yet) → yes
 * - always only when the original plugin's data.json exists
 */
export function shouldOfferImport(
    ownDataWasEmpty: boolean,
    state: LegacyImportState | undefined,
    legacyExists: boolean,
): boolean {
    if (!legacyExists) return false;
    if (state === "pending") return true;
    if (state === "declined" || state === "done") return false;
    return ownDataWasEmpty;
}
