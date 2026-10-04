/**
 * Settings page types, names and icons.
 *
 * Kept apart from settings-page-manager.tsx (which imports every page): pages
 * import this file, so it must not import any page, otherwise the bundle has
 * an import cycle and a page class can be defined before SettingsPage.
 */

import { ca } from "src/card-authoring/card-authoring-i18n";
import { hm } from "src/heatmap/heatmap-i18n";
import { t } from "src/lang/helpers";
import { ss } from "src/speed-streak/speed-streak-i18n";
import { tt } from "src/tts/tts-i18n";

/**
 * Represents a possible settings page type.
 *
 * @type {SettingsPageType}
 */
export type SettingsPageType =
    | "main-page"
    | "flashcards-page"
    | "speed-streak-page"
    | "tts-page"
    | "heatmap-page"
    | "daily-goal-page"
    | "card-authoring-page"
    | "notes-page"
    | "scheduling-page"
    | "ui-preferences-page"
    | "data-page"
    | "statistics-page";

/**
 * Represents an array of all available settings page types.
 *
 * @type {ReadonlyArray<SettingsPageType>}
 */
export const SettingsPageTypesArray: ReadonlyArray<SettingsPageType> = [
    "main-page",
    "flashcards-page",
    "speed-streak-page",
    "tts-page",
    "heatmap-page",
    "daily-goal-page",
    "card-authoring-page",
    "notes-page",
    "scheduling-page",
    "ui-preferences-page",
    "data-page",
    "statistics-page",
];

/**
 * Gets the name of a settings page.
 *
 * @param {SettingsPageType} pageType - The settings page type.
 * @returns {string} The name of the settings page.
 */
export function getPageName(pageType: SettingsPageType): string {
    switch (pageType) {
        case "main-page":
            return t("MAIN_SETTINGS_PAGE");
        case "flashcards-page":
            return t("FLASHCARDS");
        case "speed-streak-page":
            return ss("PAGE_NAME");
        case "tts-page":
            return tt("PAGE_NAME");
        case "heatmap-page":
            return hm("PAGE_NAME");
        case "daily-goal-page":
            return ca("GOAL");
        case "card-authoring-page":
            return ca("PAGE_NAME");
        case "notes-page":
            return t("NOTES");
        case "scheduling-page":
            return t("SCHEDULING");
        case "ui-preferences-page":
            return t("UI");
        case "data-page":
            return t("DATA_PAGE_NAME");
        case "statistics-page":
            return t("STATS_TITLE");
    }
}

/**
 * Gets the icon of a settings page.
 *
 * @param {SettingsPageType} pageType - The settings page type.
 * @returns {string} The icon of the settings page.
 */
export function getPageIcon(pageType: SettingsPageType): string {
    switch (pageType) {
        case "main-page":
            return "Settings";
        case "flashcards-page":
            return "SpacedRepIcon";
        case "speed-streak-page":
            return "zap";
        case "tts-page":
            return "volume-2";
        case "heatmap-page":
            return "calendar-days";
        case "daily-goal-page":
            return "target";
        case "card-authoring-page":
            return "square-plus";
        case "notes-page":
            return "book-text";
        case "scheduling-page":
            return "calendar";
        case "ui-preferences-page":
            return "presentation";
        case "data-page":
            return "hard-drive";
        case "statistics-page":
            return "bar-chart-3";
    }
}
