/**
 * Add-ons built on top of vanilla Spaced Repetition: their on/off switches,
 * in one place, for the "Add-ons" window next to the deck list.
 *
 * HOW TO ADD A NEW ADD-ON
 * -----------------------
 * 1. Give it an "enabled" (or "show") setting and a settings page
 *    (`SettingsPageType` in settings-page-manager.tsx).
 * 2. Add one entry to `ADDONS` below, and its name / description to
 *    `addons-i18n.ts` (keys `NAME_<ID>` / `DESC_<ID>`).
 * 3. Create its page in `AddonsModal.createPage` (addons-modal.tsx).
 */

import { normalizeCardAuthoringSettings } from "src/card-authoring/card-authoring-settings";
import type { SRSettings } from "src/data/settings";
import { normalizeHeatmapSettings } from "src/heatmap/heatmap-data";
import { normalizeSpeedStreakSettings } from "src/speed-streak/speed-streak-settings";
import { normalizeTtsSettings } from "src/tts/tts-settings";

export type AddonId = "heatmap" | "daily-goal" | "tts" | "speed-streak";

export type AddonPageType = "heatmap-page" | "daily-goal-page" | "tts-page" | "speed-streak-page";

export interface AddonInfo {
    id: AddonId;
    /** Lucide icon name */
    icon: string;
    /** Settings page with all options of the add-on */
    pageType: AddonPageType;
    isEnabled(settings: SRSettings): boolean;
    setEnabled(settings: SRSettings, enabled: boolean): void;
}

export const ADDONS: AddonInfo[] = [
    {
        id: "heatmap",
        icon: "calendar-days",
        pageType: "heatmap-page",
        isEnabled: (s) => normalizeHeatmapSettings(s.heatmap).showInDeckList,
        setEnabled: (s, enabled) => {
            s.heatmap = { ...normalizeHeatmapSettings(s.heatmap), showInDeckList: enabled };
        },
    },
    {
        id: "daily-goal",
        icon: "target",
        pageType: "daily-goal-page",
        isEnabled: (s) => normalizeCardAuthoringSettings(s.cardAuthoring).goalInDeckList,
        setEnabled: (s, enabled) => {
            s.cardAuthoring = {
                ...normalizeCardAuthoringSettings(s.cardAuthoring),
                goalInDeckList: enabled,
            };
        },
    },
    {
        id: "tts",
        icon: "volume-2",
        pageType: "tts-page",
        isEnabled: (s) => normalizeTtsSettings(s.tts).enabled,
        setEnabled: (s, enabled) => {
            s.tts = { ...normalizeTtsSettings(s.tts), enabled };
        },
    },
    {
        id: "speed-streak",
        icon: "zap",
        pageType: "speed-streak-page",
        isEnabled: (s) => normalizeSpeedStreakSettings(s.speedStreak).enabled,
        setEnabled: (s, enabled) => {
            s.speedStreak = { ...normalizeSpeedStreakSettings(s.speedStreak), enabled };
        },
    },
];

export function getAddon(id: AddonId): AddonInfo {
    const addon = ADDONS.find((a) => a.id === id);
    if (!addon) throw new Error(`Unknown add-on: ${id}`);
    return addon;
}
