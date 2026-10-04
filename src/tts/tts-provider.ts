/**
 * Read aloud (TTS) — voice providers.
 *
 * A provider turns text into speech. Today there is only `system` (the voices
 * installed on the device, via the Web Speech API), but the controller only
 * talks to the `TtsProvider` interface, so other voices can be added later
 * without touching it.
 *
 * HOW TO ADD A NEW PROVIDER (e.g. Azure, Google, ElevenLabs)
 * ----------------------------------------------------------
 * 1. Create `src/tts/providers/<name>-tts-provider.ts` with a class that
 *    implements `TtsProvider`:
 *      - `id`            unique, lowercase, never change once used (stored in settings)
 *      - `isAvailable()` false when it can't work here (no API key, offline, …);
 *                        the controller then stays silent instead of throwing
 *      - `getVoices()`   list of `TtsVoice` (id, name, lang) shown in the settings
 *      - `speak()`       resolves when speaking ENDS (or is cancelled) — the
 *                        Speed Streak timer is held until then; never reject
 *                        for a cancel
 *      - `cancel()`      stop immediately (next card, skip, closing the view)
 *    Only use web APIs (`fetch`, `Audio`, `requestUrl` from obsidian) — no
 *    Node/Electron, the plugin must keep working on iOS and Android.
 *    Recordings can be cached in the vault through `app.vault.adapter`.
 * 2. Add it to `TTS_PROVIDERS` below.
 * 3. Add its name to `tts-i18n.ts` (key `PROVIDER_<ID>`) and, if it needs an
 *    API key or other options, add fields to `TtsSettings` + `normalizeTtsSettings`
 *    and show them on the settings page (`tts-page.tsx`).
 */

import { SystemTtsProvider } from "src/tts/providers/system-tts-provider";
import type { TtsVoice } from "src/tts/tts-settings";

export type { TtsVoice };

export interface TtsSpeakOptions {
    /** Normalized language code, e.g. `es-ES` */
    lang: string;
    /** Chosen voice id; missing / "" = pick the best voice for `lang` */
    voiceId?: string;
    /** 0.5–1.5 */
    rate: number;
    /** 0–1 */
    volume: number;
}

export interface TtsProvider {
    readonly id: string;
    /** Can this provider speak on this device right now? Must not throw. */
    isAvailable(): boolean;
    /** Available voices, optionally only for one language (exact code, then base language). */
    getVoices(lang?: string): Promise<TtsVoice[]>;
    /** Speaks the text. Resolves when finished or cancelled. Never rejects on cancel. */
    speak(text: string, options: TtsSpeakOptions): Promise<void>;
    /** Stops speaking immediately. */
    cancel(): void;
    /**
     * Optional: called synchronously inside a user gesture (tap / click / key).
     * iOS only allows speech that started from a gesture, so a provider can
     * "unlock" audio here.
     */
    unlock?(): void;
    /** Optional: release resources when the review view is destroyed. */
    dispose?(): void;
}

export interface TtsProviderInfo {
    id: string;
    create: () => TtsProvider;
}

/** Registry of voice providers. Add new providers here. */
export const TTS_PROVIDERS: TtsProviderInfo[] = [
    { id: "system", create: () => new SystemTtsProvider() },
];

export const DEFAULT_TTS_PROVIDER_ID = "system";

/** Creates the provider with the given id (falls back to the system voices). */
export function createTtsProvider(id: string): TtsProvider {
    const info =
        TTS_PROVIDERS.find((p) => p.id === id) ??
        TTS_PROVIDERS.find((p) => p.id === DEFAULT_TTS_PROVIDER_ID) ??
        TTS_PROVIDERS[0];
    return info.create();
}
