/**
 * Endless mode — glue between the pure records logic and the plugin data
 * (`data.endless.records` in data.json).
 */

import {
    addRun,
    addSession,
    EndlessData,
    EndlessRecords,
    EndlessSessionRecord,
    localDay,
    normalizeEndlessData,
} from "src/endless/endless-records";
import type SRPlugin from "src/main";

export function getEndlessData(plugin: SRPlugin): EndlessData {
    const data = plugin.dataManager.data;
    const normalized = normalizeEndlessData(data.endless);
    data.endless = normalized;
    return normalized;
}

export function getEndlessRecords(plugin: SRPlugin): EndlessRecords {
    return getEndlessData(plugin).records;
}

async function save(plugin: SRPlugin) {
    try {
        await plugin.dataManager.pluginDataManager.savePluginData();
    } catch (e) {
        console.error("[Endless] could not save the records", e);
    }
}

/** Stores a finished run; returns true when it is a new all-time record. */
export async function storeEndlessRun(
    plugin: SRPlugin,
    score: number,
    decks: string,
): Promise<boolean> {
    const data = getEndlessData(plugin);
    const now = Date.now();
    const { records, newBest } = addRun(data.records, {
        score,
        endedAt: now,
        day: localDay(now),
        decks,
    });
    data.records = records;
    await save(plugin);
    return newBest;
}

export async function storeEndlessSession(
    plugin: SRPlugin,
    session: Omit<EndlessSessionRecord, "day">,
): Promise<void> {
    const data = getEndlessData(plugin);
    data.records = addSession(data.records, { ...session, day: localDay(session.endedAt) });
    await save(plugin);
}
