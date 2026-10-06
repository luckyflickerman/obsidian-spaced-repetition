/**
 * Background photo — settings: which photo (one for computers and tablets, an
 * optional one for phones), which part of it to show, and how strongly the
 * glass panels cover it.
 *
 * Pure logic, no DOM. Easy to unit test.
 */

export type BackgroundPosition = "top" | "center" | "bottom";

export interface BackgroundSettings {
    /** Off = the review looks like before (Obsidian's theme colours) */
    enabled: boolean;
    /** Path of an image in the vault, e.g. "Tła/jezioro.jpg" */
    photo: string;
    /** Optional other photo for phones (an upright one fits best); "" = same */
    photoPhone: string;
    position: BackgroundPosition;
    /** How much the panels cover the photo (0.3 = very see-through, 0.9 = almost solid) */
    glass: number;
    /** Darkening of the whole photo */
    dim: number;
    /** Blur behind the panels, px */
    blur: number;
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
    enabled: false,
    photo: "",
    photoPhone: "",
    position: "center",
    glass: 0.55,
    dim: 0.12,
    blur: 20,
};

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif", "gif"];

export function isImagePath(path: string): boolean {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    return IMAGE_EXTENSIONS.includes(ext);
}

export function normalizeBackgroundSettings(
    stored: Partial<BackgroundSettings> | null | undefined,
): BackgroundSettings {
    const s = stored && typeof stored === "object" ? stored : {};
    const d = DEFAULT_BACKGROUND_SETTINGS;
    const num = (v: unknown, def: number, min: number, max: number) => {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
    };
    const path = (v: unknown) =>
        typeof v === "string" && isImagePath(v.trim()) ? v.trim().replace(/^\/+/, "") : "";
    return {
        enabled: typeof s.enabled === "boolean" ? s.enabled : d.enabled,
        photo: path(s.photo),
        photoPhone: path(s.photoPhone),
        position: s.position === "top" || s.position === "bottom" ? s.position : "center",
        glass: num(s.glass, d.glass, 0.3, 0.9),
        dim: num(s.dim, d.dim, 0, 0.6),
        blur: Math.round(num(s.blur, d.blur, 0, 40)),
    };
}

/** The photo to show: the phone one on phones when set. */
export function photoFor(settings: BackgroundSettings, isPhone: boolean): string {
    return isPhone && settings.photoPhone ? settings.photoPhone : settings.photo;
}

/** CSS object-position for the chosen part of the photo. */
export function objectPosition(position: BackgroundPosition): string {
    return position === "top" ? "center 20%" : position === "bottom" ? "center 80%" : "center";
}
