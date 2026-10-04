import "src/tts/tts.css";
import { setIcon } from "obsidian";

import type SRPlugin from "src/main";
import type { SpeedStreakController } from "src/speed-streak/speed-streak-controller";
import { tt } from "src/tts/tts-i18n";
import { createTtsProvider, TtsProvider } from "src/tts/tts-provider";
import {
    langBase,
    normalizeLangCode,
    normalizeTtsSettings,
    parseLanguageRules,
    resolveCardLanguage,
    TtsLanguageRule,
    TtsSettings,
} from "src/tts/tts-settings";
import { buildSpeechPlan } from "src/tts/tts-text";

export interface TtsCardContext {
    tags: string[];
    deckPath: string;
}

interface PlannedSegment {
    text: string;
    lang: string;
}

/** Plugin-level access to the read-aloud settings (normalized on read). */
export function getTtsSettings(plugin: SRPlugin): TtsSettings {
    const settings = plugin.dataManager.data.settings;
    const normalized = normalizeTtsSettings(settings.tts);
    settings.tts = normalized;
    return normalized;
}

/** Voice chosen in the settings for a language (exact code, then same base language). */
export function chosenVoiceId(settings: TtsSettings, lang: string): string {
    const code = normalizeLangCode(lang);
    if (settings.voices[code]) return settings.voices[code];
    const base = langBase(code);
    for (const [key, voice] of Object.entries(settings.voices)) {
        if (voice && langBase(key) === base) return voice;
    }
    return "";
}

/**
 * Glue between the review view and a TTS provider: reads the answer aloud when
 * it is revealed, adds the 🔊 button, makes `<u>` words tappable, handles the
 * replay key, stops speech on card change and holds the Speed Streak timer.
 * All the text logic lives in tts-text.ts / tts-settings.ts.
 */
export class TtsController {
    /** Controller of the open review (used by the "read again" command). */
    static active: TtsController | null = null;

    private plugin: SRPlugin;
    private hostEl: HTMLElement;
    private getSpeedStreak: () => SpeedStreakController | null;
    private settings: TtsSettings;
    private rules: TtsLanguageRule[] = [];
    private provider: TtsProvider;

    private sessionActive = false;
    private answerShown = false;
    private gestureSeen = false;
    private plan: PlannedSegment[] = [];
    private cardLang: string | null = null;
    private generation = 0;
    private replayBtn: HTMLButtonElement | null = null;

    constructor(
        plugin: SRPlugin,
        hostEl: HTMLElement,
        getSpeedStreak: () => SpeedStreakController | null,
    ) {
        this.plugin = plugin;
        this.hostEl = hostEl;
        this.getSpeedStreak = getSpeedStreak;
        this.settings = getTtsSettings(plugin);
        this.rules = parseLanguageRules(this.settings.languageRules);
        this.provider = createTtsProvider(this.settings.provider);
        // iOS: unlock speech inside the first tap of the session (capture phase,
        // i.e. synchronously before e.g. the "Show answer" handler runs)
        this.hostEl.addEventListener("click", this.onGesture, true);
        this.hostEl.addEventListener("touchend", this.onGesture, { capture: true, passive: true });
    }

    // MARK: Public API used by the card container

    get isAvailable(): boolean {
        return this.provider.isAvailable();
    }

    get canReplay(): boolean {
        return (
            this.sessionActive &&
            this.answerShown &&
            this.plan.length > 0 &&
            this.settings.enabled &&
            this.isAvailable
        );
    }

    startSession() {
        this.refreshSettings();
        this.sessionActive = true;
        this.answerShown = false;
        this.gestureSeen = false;
        this.plan = [];
        TtsController.active = this;
        activeDocument.addEventListener("visibilitychange", this.onVisibility);
    }

    endSession() {
        this.cancel();
        this.sessionActive = false;
        this.answerShown = false;
        this.plan = [];
        this.replayBtn = null;
        activeDocument.removeEventListener("visibilitychange", this.onVisibility);
        if (TtsController.active === this) TtsController.active = null;
    }

    /** New card (or the same card redrawn): stop speaking immediately. */
    onQuestionShown() {
        this.cancel();
        this.answerShown = false;
        this.plan = [];
        this.cardLang = null;
        this.replayBtn = null;
    }

    /**
     * Call after the answer has been rendered into `contentEl`.
     * `answerMarkdown` is the card's back (already swapped for reversed cards).
     */
    onAnswerShown(answerMarkdown: string, ctx: TtsCardContext, contentEl: HTMLElement) {
        this.cancel();
        this.answerShown = true;
        this.plan = [];
        this.replayBtn = null;
        if (!this.sessionActive || !this.settings.enabled || !this.isAvailable) return;

        this.cardLang = resolveCardLanguage(
            this.rules,
            ctx.tags,
            ctx.deckPath,
            this.settings.defaultLanguage,
        );
        this.plan = buildSpeechPlan(answerMarkdown, this.cardLang, this.settings.readWholeAnswer);
        this.decorateWords(contentEl);
        if (this.plan.length === 0) return;

        this.addReplayButton(contentEl);
        if (this.settings.autoPlay) void this.play(this.plan);
    }

    /** Reads the current answer again (🔊 button, key, command). */
    replay() {
        if (!this.canReplay) return;
        this.provider.unlock?.();
        void this.play(this.plan);
    }

    /** Returns true when the key was consumed. */
    handleKey(e: KeyboardEvent): boolean {
        if (!this.canReplay || !this.settings.replayHotkey) return false;
        if (e.ctrlKey || e.metaKey || e.altKey) return false;
        if ((e.key ?? "").toLowerCase() !== this.settings.replayHotkey) return false;
        this.replay();
        return true;
    }

    /** Stops speaking now (next card, skip, closing the view). */
    cancel() {
        this.generation++;
        try {
            this.provider.cancel();
        } catch (e) {
            console.warn("[Read aloud] cancel failed", e);
        }
        this.setSpeaking(false);
    }

    refreshSettings() {
        this.settings = getTtsSettings(this.plugin);
        this.rules = parseLanguageRules(this.settings.languageRules);
        if (this.provider.id !== this.settings.provider) {
            this.cancel();
            this.provider.dispose?.();
            this.provider = createTtsProvider(this.settings.provider);
        }
        if (!this.settings.enabled) this.cancel();
    }

    destroy() {
        this.endSession();
        this.hostEl.removeEventListener("click", this.onGesture, true);
        this.hostEl.removeEventListener("touchend", this.onGesture, true);
        this.provider.dispose?.();
    }

    // MARK: Speaking

    private play(segments: PlannedSegment[]): Promise<void> {
        if (segments.length === 0 || !this.isAvailable) return Promise.resolve();
        const run = this.speakSegments(segments, ++this.generation);
        if (this.settings.pauseSpeedStreak) this.getSpeedStreak()?.holdTimerWhile(run);
        return run;
    }

    private async speakSegments(segments: PlannedSegment[], generation: number) {
        this.setSpeaking(true);
        try {
            for (const segment of segments) {
                if (generation !== this.generation) return;
                await this.provider.speak(segment.text, {
                    lang: segment.lang,
                    voiceId: chosenVoiceId(this.settings, segment.lang),
                    rate: this.settings.rate,
                    volume: this.settings.volume / 100,
                });
            }
        } catch (e) {
            console.warn("[Read aloud] speaking failed", e);
        } finally {
            if (generation === this.generation) this.setSpeaking(false);
        }
    }

    private setSpeaking(speaking: boolean) {
        this.replayBtn?.toggleClass("is-speaking", speaking);
    }

    private onGesture = () => {
        if (!this.sessionActive || this.gestureSeen) return;
        if (!this.settings.enabled || !this.isAvailable) return;
        this.gestureSeen = true;
        try {
            this.provider.unlock?.();
        } catch {
            /* ignore */
        }
    };

    private onVisibility = () => {
        if (activeDocument.hidden) this.cancel();
    };

    // MARK: DOM

    /** Makes every `<u>` on the card tappable: reads just that word. */
    private decorateWords(contentEl: HTMLElement) {
        contentEl.querySelectorAll("u").forEach((el) => {
            const lang = normalizeLangCode(el.getAttribute("lang") ?? "") || this.cardLang;
            if (!lang) return;
            el.addClass("sr-tts-word");
            el.setAttr("role", "button");
            el.setAttr("tabindex", "0");
            el.setAttr("aria-label", tt("READ_WORD"));
            const speakWord = (ev: Event) => {
                ev.preventDefault();
                ev.stopPropagation();
                const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
                if (!text) return;
                this.provider.unlock?.();
                void this.play([{ text, lang }]);
            };
            el.addEventListener("click", speakWord);
            el.addEventListener("keydown", (ev: KeyboardEvent) => {
                if (ev.key === "Enter" || ev.key === " ") speakWord(ev);
            });
        });
    }

    private addReplayButton(contentEl: HTMLElement) {
        const bar = contentEl.createDiv({ cls: "sr-tts-bar" });
        const btn = bar.createEl("button", { cls: "sr-tts-replay clickable-icon" });
        setIcon(btn, "volume-2");
        const key = this.settings.replayHotkey;
        btn.setAttr(
            "aria-label",
            key ? tt("REPLAY_KEY", { key: key.toUpperCase() }) : tt("REPLAY"),
        );
        btn.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.replay();
        });
        this.replayBtn = btn;
    }
}
