import "src/tts/tts.css";
import { Platform, Setting, SettingGroup } from "obsidian";

import { DataManager } from "src/data/data-manager";
import { SettingsManager } from "src/data/settings-manager";
import SRPlugin from "src/main";
import { TtsController } from "src/tts/tts-controller";
import { sampleSentence, tt } from "src/tts/tts-i18n";
import { createTtsProvider, TTS_PROVIDERS, TtsProvider } from "src/tts/tts-provider";
import {
    configuredLanguages,
    DEFAULT_TTS_SETTINGS,
    normalizeLangCode,
    normalizeTtsSettings,
    TTS_RATE_MAX,
    TTS_RATE_MIN,
    TtsSettings,
    TtsVoice,
    voicesForLanguage,
} from "src/tts/tts-settings";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import { SettingsPageType } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-manager";

type BoolKey = {
    [K in keyof TtsSettings]: TtsSettings[K] extends boolean ? K : never;
}[keyof TtsSettings];

/** How to install more voices on the current platform. */
function installHint(): string {
    if (Platform.isIosApp) return tt("HINT_IOS");
    if (Platform.isAndroidApp) return tt("HINT_ANDROID");
    if (Platform.isMacOS) return tt("HINT_MAC");
    return tt("HINT_WINDOWS");
}

/**
 * Settings page for reading aloud (TTS).
 */
export class TtsPage extends SettingsPage {
    private provider: TtsProvider;
    private voicesHost: HTMLElement;
    private diagnosticsHost: HTMLElement;
    private renderToken = 0;

    constructor(
        pageContainerEl: HTMLElement,
        plugin: SRPlugin,
        settingsManager: SettingsManager,
        dataManager: DataManager,
        pageType: SettingsPageType,
        applySettingsUpdate: (callback: () => unknown) => void,
        display: () => void,
        openPage: (pageType: SettingsPageType) => void,
        scrollListener: (scrollPosition: number) => void,
    ) {
        super(
            pageContainerEl,
            plugin,
            settingsManager,
            dataManager,
            pageType,
            applySettingsUpdate,
            display,
            openPage,
            scrollListener,
        );
        this.provider = createTtsProvider(this.ttsSettings.provider);
        this.build();
    }

    private get ttsSettings(): TtsSettings {
        const settings = this.settingsManager.settings;
        settings.tts = normalizeTtsSettings(settings.tts);
        return settings.tts;
    }

    private async save() {
        this.settingsManager.settings.tts = normalizeTtsSettings(this.settingsManager.settings.tts);
        await this.settingsManager.save();
        TtsController.active?.refreshSettings();
    }

    private addToggle(group: SettingGroup, key: BoolKey, name: string, desc?: string) {
        group.addSetting((setting: Setting) => {
            setting.setName(name);
            if (desc) setting.setDesc(desc);
            setting.addToggle((toggle) =>
                toggle.setValue(this.ttsSettings[key]).onChange(async (value) => {
                    this.ttsSettings[key] = value;
                    await this.save();
                }),
            );
        });
    }

    private build() {
        const s = () => this.ttsSettings;

        // Diagnostics first: tells at once whether TTS works on this device
        this.diagnosticsHost = this.containerEl.createDiv();

        // General
        const general = new SettingGroup(this.containerEl).setHeading(tt("G_GENERAL"));
        this.addToggle(general, "enabled", tt("ENABLED"), tt("ENABLED_DESC"));
        this.addToggle(general, "autoPlay", tt("AUTO_PLAY"), tt("AUTO_PLAY_DESC"));
        this.addToggle(general, "readWholeAnswer", tt("WHOLE_ANSWER"), tt("WHOLE_ANSWER_DESC"));
        if (TTS_PROVIDERS.length > 1) {
            general.addSetting((setting: Setting) =>
                setting.setName(tt("PROVIDER")).addDropdown((dropdown) => {
                    for (const p of TTS_PROVIDERS) {
                        dropdown.addOption(p.id, p.id === "system" ? tt("PROVIDER_SYSTEM") : p.id);
                    }
                    dropdown.setValue(s().provider).onChange(async (value) => {
                        s().provider = value;
                        this.provider.cancel();
                        this.provider = createTtsProvider(value);
                        await this.save();
                        this.renderDynamic();
                    });
                }),
            );
        }

        // Languages
        const languages = new SettingGroup(this.containerEl).setHeading(tt("G_LANGUAGES"));
        languages.addSetting((setting: Setting) => {
            setting.setName(tt("RULES")).setDesc(tt("RULES_DESC"));
            setting.addTextArea((text) => {
                text.inputEl.rows = 5;
                text.inputEl.addClass("sr-tts-rules-input");
                text.setPlaceholder("#hiszpanski = es-ES\n#angielski = en-GB\n#niemiecki = de-DE");
                text.setValue(s().languageRules).onChange((value) => {
                    this.applySettingsUpdate(async () => {
                        s().languageRules = value;
                        await this.save();
                        this.renderDynamic();
                    });
                });
            });
        });
        languages.addSetting((setting: Setting) =>
            setting
                .setName(tt("DEFAULT_LANG"))
                .setDesc(tt("DEFAULT_LANG_DESC"))
                .addText((text) => {
                    text.inputEl.addClass("sr-tts-lang-input");
                    text.setPlaceholder("en-GB");
                    text.setValue(s().defaultLanguage).onChange((value) => {
                        this.applySettingsUpdate(async () => {
                            s().defaultLanguage = normalizeLangCode(value);
                            await this.save();
                            this.renderDynamic();
                        });
                    });
                }),
        );

        // Voices (per language, filled asynchronously)
        this.voicesHost = this.containerEl.createDiv();

        // Speed & volume
        const sound = new SettingGroup(this.containerEl);
        sound.addSetting((setting: Setting) =>
            setting
                .setName(tt("RATE"))
                .setDesc(tt("RATE_DESC"))
                .addExtraButton((button) =>
                    button
                        .setIcon("reset")
                        .setTooltip(tt("RESET_DEFAULT"))
                        .onClick(async () => {
                            s().rate = DEFAULT_TTS_SETTINGS.rate;
                            await this.save();
                            this.display();
                        }),
                )
                .addSlider((slider) =>
                    slider
                        .setLimits(TTS_RATE_MIN, TTS_RATE_MAX, 0.05)
                        .setValue(s().rate)
                        .setDynamicTooltip()
                        .onChange((value) => {
                            this.applySettingsUpdate(async () => {
                                s().rate = value;
                                await this.save();
                            });
                        }),
                ),
        );
        sound.addSetting((setting: Setting) =>
            setting.setName(tt("VOLUME")).addSlider((slider) =>
                slider
                    .setLimits(0, 100, 5)
                    .setValue(s().volume)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.applySettingsUpdate(async () => {
                            s().volume = value;
                            await this.save();
                        });
                    }),
            ),
        );

        // Speed Streak
        const streak = new SettingGroup(this.containerEl).setHeading(tt("G_SPEED_STREAK"));
        this.addToggle(streak, "pauseSpeedStreak", tt("PAUSE_STREAK"), tt("PAUSE_STREAK_DESC"));

        // Shortcuts
        const keys = new SettingGroup(this.containerEl).setHeading(tt("G_SHORTCUTS"));
        keys.addSetting((setting: Setting) =>
            setting
                .setName(tt("REPLAY_HOTKEY"))
                .setDesc(tt("REPLAY_HOTKEY_DESC"))
                .addText((text) => {
                    text.inputEl.maxLength = 1;
                    text.inputEl.addClass("sr-tts-key-input");
                    text.setValue(s().replayHotkey.toUpperCase()).onChange((value) => {
                        this.applySettingsUpdate(async () => {
                            s().replayHotkey = value.trim().slice(0, 1).toLowerCase();
                            await this.save();
                        });
                    });
                }),
        );

        this.renderDynamic();
    }

    public render(): void {
        this.renderDynamic();
    }

    public destroy(): void {
        this.provider.cancel();
        super.destroy();
    }

    /** Re-renders the parts that depend on installed voices and language rules. */
    private renderDynamic() {
        const token = ++this.renderToken;
        const available = this.provider.isAvailable();
        const languages = configuredLanguages(this.ttsSettings);

        this.diagnosticsHost.empty();
        this.voicesHost.empty();
        const diagGroup = new SettingGroup(this.diagnosticsHost).setHeading(tt("G_DIAGNOSTICS"));
        const diag: { el: HTMLElement | null } = { el: null };
        diagGroup.addSetting((setting: Setting) => {
            const el = setting.descEl.createDiv({ cls: "sr-tts-diagnostics" });
            el.createDiv({ text: available ? tt("DIAG_AVAILABLE") : tt("DIAG_UNAVAILABLE") });
            if (available) el.createDiv({ text: tt("VOICE_LOADING") });
            diag.el = el;
        });

        if (!available) return;

        const voicesGroup = new SettingGroup(this.voicesHost).setHeading(tt("G_VOICES"));
        if (languages.length === 0) {
            voicesGroup.addSetting((setting: Setting) => setting.setDesc(tt("VOICES_EMPTY")));
        }

        void this.provider.getVoices().then((voices) => {
            if (token !== this.renderToken) return;
            this.renderDiagnostics(diag.el, voices, languages);
            for (const lang of languages) this.addVoiceSetting(voicesGroup, lang, voices);
        });
    }

    private renderDiagnostics(diagEl: HTMLElement | null, voices: TtsVoice[], languages: string[]) {
        if (!diagEl) return;
        diagEl.empty();
        diagEl.createDiv({ text: tt("DIAG_AVAILABLE") });
        diagEl.createDiv({ text: tt("DIAG_TOTAL", { n: voices.length }) });
        if (languages.length === 0) diagEl.createDiv({ text: tt("DIAG_NO_RULES") });
        let missing = voices.length === 0;
        for (const lang of languages) {
            const n = voicesForLanguage(voices, lang).length;
            if (n === 0) missing = true;
            diagEl.createDiv({ text: `${n > 0 ? "✅" : "⚠️"} ${tt("DIAG_LANG", { lang, n })}` });
        }
        if (missing) diagEl.createDiv({ text: `💡 ${installHint()}` });
    }

    private addVoiceSetting(group: SettingGroup, lang: string, voices: TtsVoice[]) {
        const matching = voicesForLanguage(voices, lang);
        group.addSetting((setting: Setting) => {
            setting
                .setName(tt("VOICE_FOR", { lang }))
                .setDesc(
                    matching.length > 0
                        ? tt("VOICE_COUNT", { n: matching.length })
                        : tt("VOICE_NONE", { hint: installHint() }),
                );
            setting.addDropdown((dropdown) => {
                dropdown.selectEl.addClass("sr-tts-voice-select");
                dropdown.addOption("", tt("VOICE_AUTO"));
                for (const voice of matching) {
                    dropdown.addOption(voice.id, `${voice.name} (${voice.lang})`);
                }
                const current = this.ttsSettings.voices[lang] ?? "";
                dropdown.setValue(matching.some((v) => v.id === current) ? current : "");
                dropdown.onChange(async (value) => {
                    const voicesSetting = { ...this.ttsSettings.voices };
                    if (value) voicesSetting[lang] = value;
                    else delete voicesSetting[lang];
                    this.ttsSettings.voices = voicesSetting;
                    await this.save();
                });
            });
            setting.addButton((button) =>
                button.setButtonText(tt("TEST")).onClick(() => {
                    const s = this.ttsSettings;
                    this.provider.unlock?.();
                    void this.provider.speak(sampleSentence(lang), {
                        lang,
                        voiceId: s.voices[lang] ?? "",
                        rate: s.rate,
                        volume: s.volume / 100,
                    });
                }),
            );
        });
    }
}
