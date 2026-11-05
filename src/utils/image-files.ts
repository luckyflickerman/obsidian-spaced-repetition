/**
 * Image files — browser APIs only (canvas, file picker, clipboard), so they work on Windows,
 * iOS and Android. Used by card authoring (card images) and the background (own photo).
 */

import { huesFromPixels, PaletteHues } from "src/appearance/photo-palette";
import { fitWidth } from "src/card-authoring/card-image";

export function extensionFor(mime: string): string {
    const m = /image\/(png|jpe?g|gif|webp|heic|heif|bmp|svg)/i.exec(mime ?? "");
    if (!m) return "png";
    const ext = m[1].toLowerCase();
    return ext === "jpeg" ? "jpg" : ext === "svg" ? "svg" : ext;
}

export async function readClipboardImage(): Promise<Blob | null> {
    try {
        if (!navigator.clipboard?.read) return null;
        const items = await navigator.clipboard.read();
        for (const item of items) {
            const type = item.types.find((t) => t.startsWith("image/"));
            if (type) return await item.getType(type);
        }
    } catch {
        /* no permission or empty clipboard */
    }
    return null;
}

/** File picker; on phones / iPad it offers the gallery and the camera. */
export function pickImageFile(): Promise<Blob | null> {
    return new Promise((resolve) => {
        const input = activeDocument.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
        // closing the picker without a choice (browsers that report it)
        input.addEventListener("cancel", () => resolve(null));
        input.click();
    });
}

interface Picture {
    source: CanvasImageSource;
    width: number;
    height: number;
    close(): void;
}

/** Decodes an image (createImageBitmap, or an <img> where it is missing / fails, e.g. HEIC). */
async function loadPicture(blob: Blob): Promise<Picture | null> {
    if (typeof createImageBitmap !== "undefined") {
        try {
            const bitmap = await createImageBitmap(blob);
            return {
                source: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                close: () => bitmap.close(),
            };
        } catch {
            /* try an <img> below */
        }
    }
    const url = URL.createObjectURL(blob);
    try {
        const img = activeDocument.createElement("img");
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("image"));
            img.src = url;
        });
        return {
            source: img,
            width: img.naturalWidth,
            height: img.naturalHeight,
            close: () => URL.revokeObjectURL(url),
        };
    } catch {
        URL.revokeObjectURL(url);
        return null;
    }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/** Scales a photo down to `maxWidth` (canvas). GIF / SVG are kept as they are. */
export async function shrinkImage(blob: Blob, maxWidth: number): Promise<Blob> {
    if (/gif|svg/i.test(blob.type)) return blob;
    const picture = await loadPicture(blob);
    if (!picture) return blob;
    try {
        const size = fitWidth(picture.width, picture.height, maxWidth);
        if (size.width === picture.width) return blob;
        const canvas = activeDocument.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        canvas.getContext("2d")?.drawImage(picture.source, 0, 0, size.width, size.height);
        const type = blob.type === "image/png" ? "image/png" : "image/jpeg";
        return (await toBlob(canvas, type, 0.85)) ?? blob;
    } catch {
        return blob;
    } finally {
        picture.close();
    }
}

export interface BackgroundPhoto {
    /** JPEG, at most `maxWidth` wide */
    data: ArrayBuffer;
    /** Colours for the panels, taken from the photo */
    hues: PaletteHues;
}

/**
 * The user's own background photo: a JPEG at most `maxWidth` wide (a phone photo is often
 * 4000 px and several MB) and its colours, read from a 64×64 copy.
 */
export async function prepareBackgroundPhoto(
    blob: Blob,
    maxWidth = 2000,
): Promise<BackgroundPhoto | null> {
    const picture = await loadPicture(blob);
    if (!picture || picture.width <= 0 || picture.height <= 0) {
        picture?.close();
        return null;
    }
    try {
        const size = fitWidth(picture.width, picture.height, maxWidth);
        const canvas = activeDocument.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(picture.source, 0, 0, size.width, size.height);
        const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
        if (!jpeg) return null;

        const small = activeDocument.createElement("canvas");
        small.width = 64;
        small.height = 64;
        const sctx = small.getContext("2d");
        if (!sctx) return null;
        sctx.drawImage(canvas, 0, 0, 64, 64);
        const hues = huesFromPixels(sctx.getImageData(0, 0, 64, 64).data);
        return { data: await jpeg.arrayBuffer(), hues };
    } finally {
        picture.close();
    }
}
