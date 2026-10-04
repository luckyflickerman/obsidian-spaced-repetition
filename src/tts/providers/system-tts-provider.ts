/**
 * Read aloud (TTS) — system voices through the Web Speech API
 * (`window.speechSynthesis`). Works on Windows, macOS, iOS and most Androids,
 * without Node or Electron APIs.
 *
 * Workarounds for known browser bugs:
 * - voices load asynchronously (`getVoices()` is often empty at first) →
 *   wait for `voiceschanged`, with a time limit;
 * - iOS / Android report `es_ES` instead of `es-ES` → codes are normalized;
 * - a stuck queue keeps new utterances silent → `cancel()` + `resume()` before speaking;
 * - Chrome cuts utterances longer than ~15 s → the text is spoken sentence by sentence;
 * - the utterance can be garbage-collected before `onend` fires → we keep a reference;
 * - `onend` sometimes never fires → a watchdog timer finishes the chunk;
 * - iOS only speaks after a user gesture → `unlock()` speaks a silent utterance
 *   from inside the first tap.
 */

import type { TtsProvider, TtsSpeakOptions } from "src/tts/tts-provider";
import { chooseVoice, normalizeLangCode, TtsVoice, voicesForLanguage } from "src/tts/tts-settings";
import { splitIntoSentences } from "src/tts/tts-text";

const VOICES_TIMEOUT_MS = 2000;

export class SystemTtsProvider implements TtsProvider {
    readonly id = "system";

    private voices: TtsVoice[] = [];
    private rawVoices: SpeechSynthesisVoice[] = [];
    private voicesPromise: Promise<void> | null = null;

    /** Increased by every speak/cancel; older speak loops stop when it changes. */
    private generation = 0;
    /** Strong reference to the utterance being spoken (GC bug workaround). */
    private current: SpeechSynthesisUtterance | null = null;
    private finishCurrent: (() => void) | null = null;
    private unlockUtterance: SpeechSynthesisUtterance | null = null;
    private unlocked = false;

    constructor(private voicesTimeoutMs: number = VOICES_TIMEOUT_MS) {}

    isAvailable(): boolean {
        try {
            return (
                typeof window !== "undefined" &&
                "speechSynthesis" in window &&
                !!window.speechSynthesis &&
                typeof window.SpeechSynthesisUtterance === "function"
            );
        } catch {
            return false;
        }
    }

    private get synth(): SpeechSynthesis | null {
        return this.isAvailable() ? window.speechSynthesis : null;
    }

    async getVoices(lang?: string): Promise<TtsVoice[]> {
        await this.loadVoices();
        return lang ? voicesForLanguage(this.voices, lang) : [...this.voices];
    }

    private readVoices(synth: SpeechSynthesis) {
        let raw: SpeechSynthesisVoice[];
        try {
            raw = synth.getVoices() ?? [];
        } catch {
            raw = [];
        }
        this.rawVoices = raw;
        this.voices = raw.map((v) => ({
            id: v.voiceURI || v.name,
            name: v.name,
            lang: normalizeLangCode(v.lang) || v.lang,
            localService: !!v.localService,
            isDefault: !!v.default,
        }));
    }

    private loadVoices(): Promise<void> {
        const synth = this.synth;
        if (!synth) return Promise.resolve();
        this.readVoices(synth);
        if (this.voices.length > 0) return Promise.resolve();
        if (this.voicesPromise) return this.voicesPromise;

        this.voicesPromise = new Promise<void>((resolve) => {
            let timer: number | null = null;
            const done = () => {
                if (timer !== null) window.clearTimeout(timer);
                timer = null;
                try {
                    synth.removeEventListener("voiceschanged", onChange);
                } catch {
                    /* old WebKit */
                }
                this.readVoices(synth);
                this.voicesPromise = null;
                resolve();
            };
            const onChange = () => {
                this.readVoices(synth);
                if (this.voices.length > 0) done();
            };
            try {
                synth.addEventListener("voiceschanged", onChange);
            } catch {
                /* old WebKit: rely on the timeout */
            }
            timer = window.setTimeout(done, this.voicesTimeoutMs);
        });
        return this.voicesPromise;
    }

    async speak(text: string, options: TtsSpeakOptions): Promise<void> {
        const synth = this.synth;
        if (!synth) return;
        const generation = ++this.generation;
        this.stopSpeaking(synth);

        const chunks = splitIntoSentences(text);
        if (chunks.length === 0) return;

        await this.loadVoices();
        if (generation !== this.generation) return;

        const voice = chooseVoice(this.voices, options.lang, options.voiceId);
        const rawVoice = voice
            ? (this.rawVoices.find((v) => (v.voiceURI || v.name) === voice.id) ?? null)
            : null;

        for (const chunk of chunks) {
            if (generation !== this.generation) return;
            await this.speakChunk(synth, chunk, options, rawVoice);
        }
    }

    private speakChunk(
        synth: SpeechSynthesis,
        text: string,
        options: TtsSpeakOptions,
        voice: SpeechSynthesisVoice | null,
    ): Promise<void> {
        return new Promise<void>((resolve) => {
            const utterance = new window.SpeechSynthesisUtterance(text);
            utterance.lang = normalizeLangCode(options.lang) || options.lang;
            if (voice) utterance.voice = voice;
            utterance.rate = Math.min(2, Math.max(0.1, options.rate || 1));
            utterance.volume = Math.min(1, Math.max(0, options.volume));

            let settled = false;
            let watchdog: number | null = null;
            const finish = () => {
                if (settled) return;
                settled = true;
                if (watchdog !== null) window.clearTimeout(watchdog);
                if (this.current === utterance) {
                    this.current = null;
                    this.finishCurrent = null;
                }
                resolve();
            };
            utterance.onend = finish;
            utterance.onerror = finish;
            this.current = utterance;
            this.finishCurrent = finish;

            // `onend` is not always fired (Chrome, some Androids): give up generously late
            const rate = Math.max(0.5, utterance.rate);
            watchdog = window.setTimeout(finish, 5000 + (text.length * 250) / rate);

            try {
                synth.speak(utterance);
            } catch {
                finish();
            }
        });
    }

    /** cancel() + resume(): clears a stuck queue (Chromium) and ends the current chunk. */
    private stopSpeaking(synth: SpeechSynthesis) {
        const finish = this.finishCurrent;
        try {
            synth.cancel();
        } catch {
            /* ignore */
        }
        finish?.();
        try {
            synth.resume();
        } catch {
            /* ignore */
        }
    }

    cancel(): void {
        this.generation++;
        const synth = this.synth;
        if (synth) {
            this.stopSpeaking(synth);
        } else {
            this.finishCurrent?.();
        }
    }

    unlock(): void {
        if (this.unlocked) return;
        const synth = this.synth;
        if (!synth) return;
        this.unlocked = true;
        try {
            if (synth.speaking) return; // already allowed to speak
            const utterance = new window.SpeechSynthesisUtterance(" ");
            utterance.volume = 0;
            utterance.onend = () => {
                if (this.unlockUtterance === utterance) this.unlockUtterance = null;
            };
            this.unlockUtterance = utterance;
            synth.speak(utterance);
        } catch {
            /* ignore */
        }
        // start loading voices early
        void this.loadVoices();
    }

    dispose(): void {
        this.cancel();
        this.unlockUtterance = null;
    }
}
