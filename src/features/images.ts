import { backend } from "../services";
import { describeError } from "../services/errors";
import { basename } from "../services/paths";
import { activeDoc } from "../stores/documentsStore";
import { notify } from "../stores/uiStore";
import { getEditorView } from "./editorBridge";

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/avif": "avif",
};

export const isImageFile = (f: File) => f.type in IMAGE_TYPES || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(f.name);

export async function toBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Clipboard screenshots arrive as a generic "image.png"; give them a
 * timestamped, URL-friendly name instead.
 */
export function assetFileName(file: File, now = new Date()): string {
  const ext = IMAGE_TYPES[file.type] ?? file.name.split(".").pop()?.toLowerCase() ?? "png";
  const generic = !file.name || /^image\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name);
  if (generic) {
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `image-${stamp}.${ext}`;
  }
  const stem = file.name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "") || "image";
  return `${stem}.${ext}`;
}

/** Markdown for an image stored at `assets/<name>` next to the document. */
export function imageMarkdown(savedPath: string): string {
  const name = basename(savedPath);
  const alt = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return `![${alt}](assets/${encodeURI(name)})`;
}

/**
 * Saves pasted/dropped images next to the active document and inserts
 * Markdown image links at the cursor. Returns `true` if the event was handled.
 */
export async function insertImageFiles(files: File[]): Promise<boolean> {
  const images = files.filter(isImageFile);
  if (images.length === 0) return false;
  const doc = activeDoc();
  if (!doc) return false;
  if (!doc.path) {
    notify("info", "Save the document first. Pasted images are stored in an “assets” folder next to it.");
    return true;
  }
  const links: string[] = [];
  for (const file of images) {
    try {
      const saved = await backend().saveImageAsset(doc.path, assetFileName(file), await toBase64(file));
      links.push(imageMarkdown(saved));
    } catch (e) {
      const msg = describeError(e, `add “${file.name || "the image"}”`);
      notify("error", /outOfScope|access/i.test(msg) ? msg + " Open the document's folder to allow adding images." : msg);
    }
  }
  const view = getEditorView();
  if (links.length && view) {
    const { from, to } = view.state.selection.main;
    // Keep images on their own line(s).
    const before = view.state.doc.lineAt(from);
    const after = view.state.doc.lineAt(to);
    const lead = from > before.from ? "\n" : "";
    const trail = to < after.to ? "\n" : "";
    const insert = lead + links.join("\n") + trail;
    view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length }, userEvent: "input.paste" });
    view.focus();
  }
  return true;
}
