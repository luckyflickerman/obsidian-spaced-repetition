import { createTtsProvider, TTS_PROVIDERS } from "src/tts/tts-provider";
import {
    chooseVoice,
    configuredLanguages,
    DEFAULT_TTS_SETTINGS,
    langBase,
    normalizeLangCode,
    normalizeTtsSettings,
    parseLanguageRules,
    resolveCardLanguage,
    rulesFromDecks,
    TtsSettings,
    TtsVoice,
    voicesForLanguage,
} from "src/tts/tts-settings";

function voice(id: string, lang: string, name = id, extra: Partial<TtsVoice> = {}): TtsVoice {
    return { id, name, lang, localService: true, isDefault: false, ...extra };
}

describe("normalizeLangCode", () => {
    test.each([
        ["es_ES", "es-ES"],
        ["es-es", "es-ES"],
        ["EN-gb", "en-GB"],
        ["en", "en"],
        ["es-419", "es-419"],
        ["zh_hans_cn", "zh-Hans-CN"],
        [" de-DE ", "de-DE"],
        ["", ""],
        ["not a code", ""],
        ["e", ""],
    ])("%s → %s", (input, expected) => {
        expect(normalizeLangCode(input)).toBe(expected);
    });

    test("langBase", () => {
        expect(langBase("es_ES")).toBe("es");
        expect(langBase("zh-Hans-CN")).toBe("zh");
        expect(langBase("")).toBe("");
    });
});

describe("parseLanguageRules", () => {
    test("parses rules, skips comments and invalid lines", () => {
        const rules = parseLanguageRules(
            [
                "#hiszpanski = es-ES",
                "  #Angielski = en_gb  ",
                "// comment",
                "% comment",
                "",
                "#niemiecki: de-DE",
                "no equals sign",
                "= es-ES",
                "#zly = ???",
                "jezyki/chinski = zh-CN",
            ].join("\n"),
        );
        expect(rules).toEqual([
            { matcher: "#hiszpanski", lang: "es-ES" },
            { matcher: "#angielski", lang: "en-GB" },
            { matcher: "#niemiecki", lang: "de-DE" },
            { matcher: "jezyki/chinski", lang: "zh-CN" },
        ]);
    });

    test("empty input", () => {
        expect(parseLanguageRules("")).toEqual([]);
        expect(parseLanguageRules(undefined as unknown as string)).toEqual([]);
    });
});

describe("resolveCardLanguage", () => {
    const rules = parseLanguageRules(
        "#hiszpanski = es-ES\n#angielski = en-GB\njezyki/niemiecki = de-DE",
    );

    test("matches note tags (also nested tags)", () => {
        expect(resolveCardLanguage(rules, ["#hiszpanski"], "")).toBe("es-ES");
        expect(resolveCardLanguage(rules, ["#flashcards", "#Hiszpanski/czasowniki"], "")).toBe(
            "es-ES",
        );
        expect(resolveCardLanguage(rules, ["#angielski"], "")).toBe("en-GB");
    });

    test("matches the deck path", () => {
        expect(resolveCardLanguage(rules, [], "#jezyki/niemiecki/slowka")).toBe("de-DE");
    });

    test("the first tag decides: the card's own tag before the note's tags", () => {
        // a note tagged #hiszpanski with an `#angielski word:: …` card
        expect(resolveCardLanguage(rules, ["#angielski", "#hiszpanski"], "")).toBe("en-GB");
        expect(resolveCardLanguage(rules, ["#hiszpanski", "#angielski"], "")).toBe("es-ES");
        // unknown card tag: the note's tag is next
        expect(resolveCardLanguage(rules, ["#historia", "#hiszpanski"], "")).toBe("es-ES");
    });

    test("card decks work as rules", () => {
        const deckRules = rulesFromDecks([
            { tag: "#ENG", lang: "en_GB" },
            { tag: "#ESP", lang: "" },
            { tag: "", lang: "de" },
        ]);
        expect(deckRules).toEqual([{ matcher: "#eng", lang: "en-GB" }]);
        expect(resolveCardLanguage([...rules, ...deckRules], ["#ENG"], "")).toBe("en-GB");
        expect(configuredLanguages(normalizeTtsSettings({}), deckRules)).toEqual(["en-GB"]);
    });

    test("what to read without <u>: question by default, old 'whole answer off' = nothing", () => {
        expect(normalizeTtsSettings({}).fallbackSide).toBe("question");
        expect(normalizeTtsSettings({ readWholeAnswer: false }).fallbackSide).toBe("none");
        expect(normalizeTtsSettings({ readWholeAnswer: true }).fallbackSide).toBe("question");
        expect(normalizeTtsSettings({ fallbackSide: "answer" }).fallbackSide).toBe("answer");
        expect(normalizeTtsSettings({ fallbackSide: "x" as never }).fallbackSide).toBe("question");
    });

    test("no match: default language or null", () => {
        expect(resolveCardLanguage(rules, ["#historia"], "historia")).toBeNull();
        expect(resolveCardLanguage(rules, ["#historia"], "", "pl_PL")).toBe("pl-PL");
        expect(resolveCardLanguage([], [], "", "")).toBeNull();
    });

    test("does not match a tag that only starts with the same letters", () => {
        expect(resolveCardLanguage(rules, ["#hiszpanskie-filmy"], "")).toBeNull();
    });
});

describe("normalizeTtsSettings", () => {
    test("missing settings → defaults", () => {
        expect(normalizeTtsSettings(undefined)).toEqual(DEFAULT_TTS_SETTINGS);
        expect(normalizeTtsSettings(null)).toEqual(DEFAULT_TTS_SETTINGS);
        expect(normalizeTtsSettings("x" as unknown as TtsSettings)).toEqual(DEFAULT_TTS_SETTINGS);
    });

    test("defaults are sensible", () => {
        expect(DEFAULT_TTS_SETTINGS.rate).toBe(0.85);
        expect(DEFAULT_TTS_SETTINGS.pauseSpeedStreak).toBe(true);
        expect(DEFAULT_TTS_SETTINGS.languageRules).toBe("");
    });

    test("clamps and repairs values", () => {
        const s = normalizeTtsSettings({
            rate: 3,
            volume: -5,
            enabled: "yes" as unknown as boolean,
            provider: "",
            replayHotkey: "RX",
            defaultLanguage: "en_us",
            languageRules: undefined as unknown as string,
        });
        expect(s.rate).toBe(1.5);
        expect(s.volume).toBe(0);
        expect(s.enabled).toBe(true);
        expect(s.provider).toBe("system");
        expect(s.replayHotkey).toBe("r");
        expect(s.defaultLanguage).toBe("en-US");
        expect(s.languageRules).toBe("");
        expect(normalizeTtsSettings({ rate: 0.1 }).rate).toBe(0.5);
        expect(normalizeTtsSettings({ rate: "1,2" as unknown as number }).rate).toBe(1);
        expect(normalizeTtsSettings({ rate: "abc" as unknown as number }).rate).toBe(0.85);
        expect(normalizeTtsSettings({ volume: 55.4 }).volume).toBe(55);
    });

    test("normalizes the voice map", () => {
        const s = normalizeTtsSettings({
            voices: {
                ["es" + "_ES"]: "voice-1",
                "en-gb": "voice-2",
                "???": "x",
                de: 5 as unknown as string,
            },
        });
        expect(s.voices).toEqual({ "es-ES": "voice-1", "en-GB": "voice-2" });
        expect(
            normalizeTtsSettings({ voices: [] as unknown as Record<string, string> }).voices,
        ).toEqual({});
    });

    test("does not share the voice map with the defaults", () => {
        const s = normalizeTtsSettings({});
        s.voices["es-ES"] = "x";
        expect(DEFAULT_TTS_SETTINGS.voices).toEqual({});
    });
});

describe("configuredLanguages", () => {
    test("distinct rule languages plus the default language", () => {
        const s = normalizeTtsSettings({
            languageRules: "#a = es-ES\n#b = es_ES\n#c = en-GB",
            defaultLanguage: "de-DE",
        });
        expect(configuredLanguages(s)).toEqual(["es-ES", "en-GB", "de-DE"]);
        expect(configuredLanguages(normalizeTtsSettings({}))).toEqual([]);
    });
});

describe("voices", () => {
    const voices: TtsVoice[] = [
        voice("mx", "es-MX"),
        voice("es-basic", "es_ES", "Helena"),
        voice("es-natural", "es-ES", "Microsoft Elvira Online (Natural)", { localService: false }),
        voice("gb", "en-GB"),
        voice("us", "en-US", "Samantha", { isDefault: true }),
    ];

    test("voicesForLanguage: exact code first, then same language", () => {
        expect(voicesForLanguage(voices, "es-ES").map((v) => v.id)).toEqual([
            "es-basic",
            "es-natural",
            "mx",
        ]);
        expect(voicesForLanguage(voices, "es").map((v) => v.id)).toEqual([
            "mx",
            "es-basic",
            "es-natural",
        ]);
        expect(voicesForLanguage(voices, "de-DE")).toEqual([]);
        expect(voicesForLanguage(voices, "")).toEqual([]);
    });

    test("chooseVoice prefers the full code and natural voices", () => {
        expect(chooseVoice(voices, "es-ES")?.id).toBe("es-natural");
        expect(chooseVoice(voices, "es_es")?.id).toBe("es-natural");
        expect(chooseVoice(voices, "es-MX")?.id).toBe("mx");
        expect(chooseVoice(voices, "en-GB")?.id).toBe("gb");
    });

    test("chooseVoice falls back to the base language", () => {
        expect(chooseVoice(voices, "es-AR")?.id).toBe("es-natural");
        expect(chooseVoice(voices, "en")?.id).toBe("us");
    });

    test("chooseVoice uses the chosen voice while it is installed", () => {
        expect(chooseVoice(voices, "es-ES", "mx")?.id).toBe("mx");
        expect(chooseVoice(voices, "es-ES", "removed-voice")?.id).toBe("es-natural");
    });

    test("chooseVoice returns null when nothing fits", () => {
        expect(chooseVoice(voices, "zh-CN")).toBeNull();
        expect(chooseVoice(voices, "")).toBeNull();
        expect(chooseVoice([], "es-ES")).toBeNull();
    });
});

describe("provider registry", () => {
    test("system provider is registered and is the fallback", () => {
        expect(TTS_PROVIDERS.map((p) => p.id)).toContain("system");
        expect(createTtsProvider("system").id).toBe("system");
        expect(createTtsProvider("does-not-exist").id).toBe("system");
    });
});
