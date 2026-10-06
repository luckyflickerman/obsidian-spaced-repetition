/**
 * Background photo — the colours of the whole review view, taken from the
 * photo (70 / 20 / 10):
 * - base (70 %): the photo's main hue, made dark — the glass panels,
 * - ink / soft (20 %): very light and light tints of the same hue — text, lines,
 * - accent (10 %): the photo's most striking colour of another hue (golden
 *   larches by a lake, pink clouds over a city) — only a few key places.
 * A lake gives a teal panel with gold, a purple dusk a violet panel with pink.
 * The text colours always reach WCAG contrast on the base (checked in tests).
 *
 * Pure logic, no DOM. Easy to unit test.
 */

export type RGB = [number, number, number];

export interface PhotoPalette {
    base: RGB;
    ink: RGB;
    soft: RGB;
    accent: RGB;
    /** Text on the accent colour */
    onAccent: RGB;
    /** Review calendar: 5 levels from the base hue to the accent */
    heat: RGB[];
}

// MARK: Colour maths

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
    const hh = (((h % 360) + 360) % 360) / 360;
    if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t: number) => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
    };
    return [
        Math.round(f(hh + 1 / 3) * 255),
        Math.round(f(hh) * 255),
        Math.round(f(hh - 1 / 3) * 255),
    ];
}

function luminance([r, g, b]: RGB): number {
    const ch = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** WCAG contrast ratio (1–21). */
export function contrastRatio(a: RGB, b: RGB): number {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function mix(a: RGB, b: RGB, t: number): RGB {
    return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
}

export function hueDistance(a: number, b: number): number {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
}

// MARK: Palette from pixels

const BINS = 24;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Defaults for a photo without colour (black and white): blue-grey with gold. */
const GREY_BASE_HUE = 210;
const DEFAULT_ACCENT_HUE = 38;

/**
 * Builds the palette from RGBA pixels (e.g. a 64×64 `getImageData`), every
 * 4 values one pixel.
 */
export function paletteFromPixels(data: ArrayLike<number>): PhotoPalette {
    const baseBins = new Array<number>(BINS).fill(0);
    const baseSat = new Array<number>(BINS).fill(0);
    const accentBins = new Array<number>(BINS).fill(0);
    const accentSat = new Array<number>(BINS).fill(0);
    let coloured = 0;
    let pixels = 0;

    for (let i = 0; i + 3 < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        pixels++;
        const [h, s, l] = rgbToHsl([data[i], data[i + 1], data[i + 2]]);
        if (s < 0.12 || l < 0.06 || l > 0.96) continue;
        coloured++;
        const bin = Math.floor(h / (360 / BINS)) % BINS;
        // the base: what fills the photo (any brightness), weighted by colour strength
        const w = s * (1 - Math.abs(2 * l - 1) * 0.5);
        baseBins[bin] += w;
        baseSat[bin] += s * w;
        // the accent: strong colour of medium brightness (not tiny white-hot lights)
        if (s > 0.3 && l > 0.35 && l < 0.88) {
            const a = s * s * Math.max(0, 1 - Math.abs(l - 0.62) * 2);
            accentBins[bin] += a;
            accentSat[bin] += s * a;
        }
    }

    const binHue = (bin: number) => (bin + 0.5) * (360 / BINS);
    const greyPhoto = pixels === 0 || coloured / pixels < 0.08;

    // Base hue: the heaviest bin (smoothed with its neighbours)
    let baseBin = 0;
    let best = -1;
    for (let b = 0; b < BINS; b++) {
        const v = baseBins[b] + 0.5 * (baseBins[(b + 1) % BINS] + baseBins[(b + BINS - 1) % BINS]);
        if (v > best) {
            best = v;
            baseBin = b;
        }
    }
    const baseHue = greyPhoto ? GREY_BASE_HUE : binHue(baseBin);
    const baseS = greyPhoto
        ? 0.12
        : clamp(baseBins[baseBin] > 0 ? baseSat[baseBin] / baseBins[baseBin] : 0.3, 0.22, 0.55);

    // Accent hue: the strongest bright colour of another hue (≥ 35° away)
    let accentBin = -1;
    best = 0;
    for (let b = 0; b < BINS; b++) {
        if (hueDistance(binHue(b), baseHue) < 35) continue;
        if (accentBins[b] > best) {
            best = accentBins[b];
            accentBin = b;
        }
    }
    const accentHue = accentBin >= 0 ? binHue(accentBin) : DEFAULT_ACCENT_HUE;
    const accentS =
        accentBin >= 0 && accentBins[accentBin] > 0
            ? clamp(accentSat[accentBin] / accentBins[accentBin], 0.55, 0.85)
            : 0.75;

    return buildPalette(baseHue, baseS, accentHue, accentS);
}

/** The palette from the two hues, with readable text guaranteed. */
export function buildPalette(
    baseHue: number,
    baseS: number,
    accentHue: number,
    accentS: number,
): PhotoPalette {
    const base = hslToRgb(baseHue, baseS, 0.17);
    const ink = hslToRgb(baseHue, 0.35, 0.96);
    let soft = hslToRgb(baseHue, 0.3, 0.84);
    let accent = hslToRgb(accentHue, accentS, 0.72);
    // keep the 20 % and 10 % colours readable on the panel
    for (let l = 0.84; contrastRatio(soft, base) < 7 && l < 0.95; l += 0.02)
        soft = hslToRgb(baseHue, 0.3, l);
    for (let l = 0.72; contrastRatio(accent, base) < 4.5 && l < 0.9; l += 0.02)
        accent = hslToRgb(accentHue, accentS, l);
    const onAccent = hslToRgb(accentHue, 0.55, 0.12);
    const low = hslToRgb(baseHue, clamp(baseS + 0.1, 0.25, 0.6), 0.36);
    const heat = [0.0, 0.25, 0.5, 0.75, 1].map((t) => mix(low, accent, t));
    return { base, ink, soft, accent, onAccent, heat };
}

/** "r, g, b" for `rgba(var(--x), alpha)` style CSS variables. */
export function rgbTriple(c: RGB): string {
    return `${c[0]}, ${c[1]}, ${c[2]}`;
}

export function rgbCss(c: RGB): string {
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
