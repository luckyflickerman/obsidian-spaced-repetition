/**
 * Tiny synthesized sound effects (Web Audio API) — no audio files needed.
 */

export type SpeedStreakSound =
    | "reveal"
    | "again"
    | "hard"
    | "good"
    | "easy"
    | "skip"
    | "timeout"
    | "boost"
    | "boost-earned"
    | "tick"
    | "new-best"
    | "blocked";

interface Note {
    f: number; // frequency Hz
    t: number; // start offset s
    d: number; // duration s
    type?: OscillatorType;
    g?: number; // relative gain
    slide?: number; // end frequency
}

const PATCHES: Record<SpeedStreakSound, Note[]> = {
    reveal: [{ f: 880, t: 0, d: 0.05, type: "triangle", g: 0.35 }],
    again: [
        { f: 220, t: 0, d: 0.12, type: "sine", g: 0.7 },
        { f: 165, t: 0.06, d: 0.16, type: "sine", g: 0.5 },
    ],
    hard: [{ f: 392, t: 0, d: 0.1, type: "triangle", g: 0.6 }],
    good: [
        { f: 523.25, t: 0, d: 0.08, type: "triangle", g: 0.6 },
        { f: 783.99, t: 0.06, d: 0.12, type: "triangle", g: 0.55 },
    ],
    easy: [
        { f: 659.25, t: 0, d: 0.07, type: "triangle", g: 0.55 },
        { f: 987.77, t: 0.05, d: 0.07, type: "triangle", g: 0.5 },
        { f: 1318.5, t: 0.1, d: 0.14, type: "triangle", g: 0.45 },
    ],
    skip: [{ f: 600, t: 0, d: 0.08, type: "sine", g: 0.3, slide: 400 }],
    timeout: [
        { f: 330, t: 0, d: 0.35, type: "sawtooth", g: 0.35, slide: 110 },
        { f: 165, t: 0.05, d: 0.4, type: "square", g: 0.15, slide: 70 },
    ],
    boost: [{ f: 300, t: 0, d: 0.25, type: "sawtooth", g: 0.3, slide: 1200 }],
    "boost-earned": [
        { f: 880, t: 0, d: 0.06, type: "square", g: 0.25 },
        { f: 1174.66, t: 0.07, d: 0.1, type: "square", g: 0.25 },
    ],
    tick: [{ f: 1200, t: 0, d: 0.035, type: "square", g: 0.25 }],
    "new-best": [
        { f: 523.25, t: 0, d: 0.1, type: "triangle", g: 0.5 },
        { f: 659.25, t: 0.09, d: 0.1, type: "triangle", g: 0.5 },
        { f: 783.99, t: 0.18, d: 0.1, type: "triangle", g: 0.5 },
        { f: 1046.5, t: 0.27, d: 0.25, type: "triangle", g: 0.55 },
    ],
    blocked: [{ f: 140, t: 0, d: 0.08, type: "square", g: 0.25 }],
};

export class SpeedStreakAudio {
    private ctx: AudioContext | null = null;
    enabled = false;
    volume = 0.6;

    private context(): AudioContext | null {
        if (this.ctx) return this.ctx;
        try {
            const Ctor =
                window.AudioContext ??
                (window as unknown as { webkitAudioContext?: typeof AudioContext })
                    .webkitAudioContext;
            if (!Ctor) return null;
            this.ctx = new Ctor();
        } catch {
            this.ctx = null;
        }
        return this.ctx;
    }

    /** Warm up the audio context (call from a user gesture) */
    prime() {
        if (!this.enabled) return;
        const ctx = this.context();
        if (ctx && ctx.state === "suspended") void ctx.resume();
    }

    play(sound: SpeedStreakSound, force = false) {
        if ((!this.enabled && !force) || this.volume <= 0) return;
        const ctx = this.context();
        if (!ctx) return;
        if (ctx.state === "suspended") void ctx.resume();
        const start = ctx.currentTime + 0.005;
        const master = ctx.createGain();
        master.gain.value = 0.35 * this.volume;
        master.connect(ctx.destination);
        for (const n of PATCHES[sound]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = n.type ?? "sine";
            const t0 = start + n.t;
            osc.frequency.setValueAtTime(n.f, t0);
            if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, t0 + n.d);
            const g = n.g ?? 0.5;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(g, t0 + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.d);
            osc.connect(gain);
            gain.connect(master);
            osc.start(t0);
            osc.stop(t0 + n.d + 0.02);
        }
    }

    dispose() {
        if (this.ctx) {
            void this.ctx.close();
            this.ctx = null;
        }
    }
}
