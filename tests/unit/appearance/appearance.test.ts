import {
    isImagePath,
    normalizeBackgroundSettings,
    objectPosition,
    photoFor,
} from "src/appearance/background-settings";
import {
    buildPalette,
    contrastRatio,
    hslToRgb,
    hueDistance,
    paletteFromPixels,
    RGB,
    rgbToHsl,
    rgbTriple,
} from "src/appearance/photo-palette";

/** RGBA pixels: `share` of each colour (out of 100 pixels). */
function photo(parts: [RGB, number][]): number[] {
    const data: number[] = [];
    for (const [c, n] of parts) for (let i = 0; i < n; i++) data.push(c[0], c[1], c[2], 255);
    return data;
}

const hueOf = (c: RGB) => rgbToHsl(c)[0];

describe("photo palette", () => {
    test("HSL round trip", () => {
        for (const c of [[234, 176, 90], [30, 20, 56], [12, 200, 140], [128, 128, 128]] as RGB[]) {
            const [h, s, l] = rgbToHsl(c);
            const back = hslToRgb(h, s, l);
            back.forEach((v, i) => expect(Math.abs(v - c[i])).toBeLessThanOrEqual(1));
        }
        expect(hueDistance(350, 10)).toBe(20);
    });

    test("lake at golden hour: teal panel, gold accent", () => {
        const p = paletteFromPixels(
            photo([
                [[22, 70, 80], 40], // dark lake
                [[40, 90, 70], 25], // forest
                [[110, 160, 200], 20], // sky
                [[230, 160, 60], 10], // golden larches
                [[240, 240, 240], 5], // snow
            ]),
        );
        expect(hueDistance(hueOf(p.base), 190)).toBeLessThan(40);
        expect(hueDistance(hueOf(p.accent), 36)).toBeLessThan(25);
    });

    test("purple dusk over a city: violet panel, pink accent", () => {
        const p = paletteFromPixels(
            photo([
                [[90, 70, 160], 45], // violet sky
                [[50, 40, 80], 30], // dark buildings
                [[230, 150, 200], 15], // pink clouds
                [[250, 230, 180], 10], // window lights
            ]),
        );
        expect(hueDistance(hueOf(p.base), 255)).toBeLessThan(30);
        expect(hueDistance(hueOf(p.accent), 322)).toBeLessThan(30);
    });

    test("text is always readable on the panel", () => {
        for (let h = 0; h < 360; h += 15) {
            for (const a of [0, 60, 120, 200, 300]) {
                const p = buildPalette(h, 0.5, a, 0.8);
                expect(contrastRatio(p.ink, p.base)).toBeGreaterThanOrEqual(7);
                expect(contrastRatio(p.soft, p.base)).toBeGreaterThanOrEqual(7);
                expect(contrastRatio(p.accent, p.base)).toBeGreaterThanOrEqual(4.5);
                expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
            }
        }
    });

    test("black and white photo or no pixels: a calm default", () => {
        const grey = paletteFromPixels(photo([[[120, 120, 120], 100]]));
        expect(hueDistance(hueOf(grey.accent), 38)).toBeLessThan(10);
        expect(paletteFromPixels([]).heat.length).toBe(5);
        expect(rgbTriple([1, 2, 3])).toBe("1, 2, 3");
    });
});

describe("background settings", () => {
    test("old data.json loads with background off", () => {
        const s = normalizeBackgroundSettings(undefined);
        expect(s.enabled).toBe(false);
        expect(s.photo).toBe("");
        expect(s.glass).toBe(0.55);
    });

    test("values are checked", () => {
        const s = normalizeBackgroundSettings({
            enabled: true,
            photo: "/Tła/jezioro.JPG",
            photoPhone: "notatka.md",
            position: "nope" as never,
            glass: 5,
            dim: -1,
            blur: 22.6,
        });
        expect(s.photo).toBe("Tła/jezioro.JPG");
        expect(s.photoPhone).toBe("");
        expect(s.position).toBe("center");
        expect(s.glass).toBe(0.9);
        expect(s.dim).toBe(0);
        expect(s.blur).toBe(23);
        expect(isImagePath("a/b.webp")).toBe(true);
        expect(isImagePath("a/b.pdf")).toBe(false);
    });

    test("phone photo and position", () => {
        const s = normalizeBackgroundSettings({ photo: "a.jpg", photoPhone: "b.jpg" });
        expect(photoFor(s, true)).toBe("b.jpg");
        expect(photoFor(s, false)).toBe("a.jpg");
        expect(photoFor({ ...s, photoPhone: "" }, true)).toBe("a.jpg");
        expect(objectPosition("top")).toBe("center 20%");
    });
});
