import { SystemTtsProvider } from "src/tts/providers/system-tts-provider";

class MockUtterance {
    text: string;
    lang = "";
    voice: unknown = null;
    rate = 1;
    volume = 1;
    onend: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    constructor(text: string) {
        this.text = text;
    }
}

interface MockVoice {
    voiceURI: string;
    name: string;
    lang: string;
    localService: boolean;
    default: boolean;
}

class MockSynth extends EventTarget {
    voices: MockVoice[] = [];
    spoken: MockUtterance[] = [];
    queue: MockUtterance[] = [];
    calls: string[] = [];
    autoEnd = true;
    speaking = false;
    paused = false;

    getVoices() {
        return this.voices;
    }

    speak(u: MockUtterance) {
        this.calls.push(`speak:${u.text}`);
        this.spoken.push(u);
        this.queue.push(u);
        this.speaking = true;
        if (this.autoEnd) setTimeout(() => this.finish(u), 1);
    }

    finish(u: MockUtterance) {
        this.queue = this.queue.filter((q) => q !== u);
        this.speaking = this.queue.length > 0;
        u.onend?.();
    }

    cancel() {
        this.calls.push("cancel");
        const queue = this.queue;
        this.queue = [];
        this.speaking = false;
        for (const u of queue) u.onerror?.({ error: "canceled" });
    }

    resume() {
        this.calls.push("resume");
    }
}

const win = window as unknown as Record<string, unknown>;
let synth: MockSynth;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function mockVoice(voiceURI: string, lang: string, name = voiceURI): MockVoice {
    return { voiceURI, name, lang, localService: true, default: false };
}

beforeEach(() => {
    synth = new MockSynth();
    win.speechSynthesis = synth;
    win.SpeechSynthesisUtterance = MockUtterance;
});

afterEach(() => {
    delete win.speechSynthesis;
    delete win.SpeechSynthesisUtterance;
});

describe("SystemTtsProvider without speech synthesis", () => {
    test("is unavailable and never throws", async () => {
        delete win.speechSynthesis;
        delete win.SpeechSynthesisUtterance;
        const provider = new SystemTtsProvider(20);
        expect(provider.isAvailable()).toBe(false);
        await expect(provider.getVoices()).resolves.toEqual([]);
        await expect(provider.speak("hola", { lang: "es-ES", rate: 1, volume: 1 })).resolves.toBe(
            undefined,
        );
        expect(() => provider.cancel()).not.toThrow();
        expect(() => provider.unlock()).not.toThrow();
        expect(() => provider.dispose()).not.toThrow();
    });
});

describe("SystemTtsProvider voices", () => {
    test("normalizes language codes from the system", async () => {
        synth.voices = [mockVoice("v-es", "es_ES", "Helena"), mockVoice("v-en", "en-GB")];
        const provider = new SystemTtsProvider(20);
        expect(provider.isAvailable()).toBe(true);
        const all = await provider.getVoices();
        expect(all.map((v) => v.lang)).toEqual(["es-ES", "en-GB"]);
        const spanish = await provider.getVoices("es");
        expect(spanish).toEqual([
            { id: "v-es", name: "Helena", lang: "es-ES", localService: true, isDefault: false },
        ]);
    });

    test("waits for voiceschanged when the list is empty at first", async () => {
        const provider = new SystemTtsProvider(1000);
        const pending = provider.getVoices("es-ES");
        await sleep(5);
        synth.voices = [mockVoice("v-es", "es-ES")];
        synth.dispatchEvent(new Event("voiceschanged"));
        const voices = await pending;
        expect(voices.map((v) => v.id)).toEqual(["v-es"]);
    });

    test("gives up after the time limit", async () => {
        const provider = new SystemTtsProvider(20);
        const started = Date.now();
        await expect(provider.getVoices()).resolves.toEqual([]);
        expect(Date.now() - started).toBeLessThan(1000);
    });
});

describe("SystemTtsProvider speaking", () => {
    test("cancel + resume before speaking, then sentence by sentence with the right voice", async () => {
        const es = mockVoice("v-es", "es_ES");
        synth.voices = [mockVoice("v-en", "en-GB"), es];
        const provider = new SystemTtsProvider(20);
        await provider.speak("Hola. ¿Qué tal?", { lang: "es_ES", rate: 0.85, volume: 0.5 });

        expect(synth.calls).toEqual(["cancel", "resume", "speak:Hola.", "speak:¿Qué tal?"]);
        for (const u of synth.spoken) {
            expect(u.lang).toBe("es-ES");
            expect(u.voice).toBe(es);
            expect(u.rate).toBe(0.85);
            expect(u.volume).toBe(0.5);
        }
    });

    test("uses the chosen voice and works without any voice", async () => {
        const natural = mockVoice("v-nat", "es-ES", "Elvira (Natural)");
        const basic = mockVoice("v-basic", "es-ES");
        synth.voices = [natural, basic];
        const provider = new SystemTtsProvider(20);
        await provider.speak("gato", { lang: "es-ES", voiceId: "v-basic", rate: 1, volume: 1 });
        expect(synth.spoken[0].voice).toBe(basic);

        synth.voices = [];
        synth.spoken = [];
        await provider.speak("gato", { lang: "de-DE", rate: 1, volume: 1 });
        expect(synth.spoken[0].voice).toBeNull();
        expect(synth.spoken[0].lang).toBe("de-DE");
    });

    test("cancel stops at once and resolves the pending speak", async () => {
        synth.voices = [mockVoice("v-es", "es-ES")];
        synth.autoEnd = false;
        const provider = new SystemTtsProvider(20);
        const speaking = provider.speak("Uno. Dos. Tres.", { lang: "es-ES", rate: 1, volume: 1 });
        await sleep(5);
        expect(synth.spoken.map((u) => u.text)).toEqual(["Uno."]);
        provider.cancel();
        await speaking;
        await sleep(5);
        expect(synth.spoken.map((u) => u.text)).toEqual(["Uno."]);
    });

    test("a new speak interrupts the previous one", async () => {
        synth.voices = [mockVoice("v-es", "es-ES")];
        synth.autoEnd = false;
        const provider = new SystemTtsProvider(20);
        const first = provider.speak("Uno. Dos.", { lang: "es-ES", rate: 1, volume: 1 });
        await sleep(5);
        synth.autoEnd = true;
        const second = provider.speak("gato", { lang: "es-ES", rate: 1, volume: 1 });
        await Promise.all([first, second]);
        expect(synth.spoken.map((u) => u.text)).toEqual(["Uno.", "gato"]);
    });

    test("empty text does not speak", async () => {
        const provider = new SystemTtsProvider(20);
        await provider.speak("   ", { lang: "es-ES", rate: 1, volume: 1 });
        expect(synth.spoken).toEqual([]);
    });

    test("a throwing speak() does not hang", async () => {
        synth.voices = [mockVoice("v-es", "es-ES")];
        synth.speak = () => {
            throw new Error("blocked");
        };
        const provider = new SystemTtsProvider(20);
        await expect(
            provider.speak("gato", { lang: "es-ES", rate: 1, volume: 1 }),
        ).resolves.toBeUndefined();
    });

    test("unlock speaks one silent utterance, only once", async () => {
        synth.voices = [mockVoice("v-es", "es-ES")];
        const provider = new SystemTtsProvider(20);
        provider.unlock();
        provider.unlock();
        expect(synth.spoken).toHaveLength(1);
        expect(synth.spoken[0].volume).toBe(0);
        await sleep(5);
        provider.dispose();
    });
});
