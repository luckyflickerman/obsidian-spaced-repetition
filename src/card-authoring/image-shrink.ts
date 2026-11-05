/**
 * "Shrink card images" — which images to shrink, where the copies of the originals go, and
 * the sizes in the report. Pure logic, no DOM (the shrinking itself is in the controller).
 */

import { shrinkableExtension } from "src/card-authoring/card-image";

/** Images smaller than this are left alone (no need to open them) */
export const SHRINK_MIN_BYTES = 300 * 1024;

/** Folder for the copies of the originals, one per run */
export const BACKUP_ROOT = "Fishcards/kopie zdjęć";

export interface ImageCandidate {
    path: string;
    extension: string;
    size: number;
}

/** PNG / JPEG images over the size limit, each once, the biggest first. */
export function shrinkCandidates<T extends ImageCandidate>(
    files: T[],
    minBytes = SHRINK_MIN_BYTES,
): T[] {
    const seen = new Set<string>();
    return files
        .filter((f) => {
            if (seen.has(f.path)) return false;
            seen.add(f.path);
            return shrinkableExtension(f.extension) !== null && f.size >= minBytes;
        })
        .sort((a, b) => b.size - a.size);
}

/** `Fishcards/kopie zdjęć/2026-11-05 14.30/Niemiecki/obrazy/hund.jpg` */
export function backupPath(date: Date, filePath: string, root = BACKUP_ROOT): string {
    const p = (n: number) => String(n).padStart(2, "0");
    const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}.${p(date.getMinutes())}`;
    return `${root}/${stamp}/${filePath.replace(/^\/+/, "")}`;
}

/** 1536000 → "1,5 MB" (Polish) / "1.5 MB"; under 1 MB in KB. */
export function formatSize(bytes: number, polish: boolean): string {
    const mb = bytes / (1024 * 1024);
    const text = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return polish ? text.replace(".", ",") : text;
}

/** Every `![[…]]` image link in a card text (without the `|size` part). */
export function embeddedImageLinks(text: string): string[] {
    const links: string[] = [];
    for (const m of String(text ?? "").matchAll(/!\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
        const link = m[1].trim();
        const ext = link.split(".").pop() ?? "";
        if (/^(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)$/i.test(ext) && !links.includes(link))
            links.push(link);
    }
    return links;
}
