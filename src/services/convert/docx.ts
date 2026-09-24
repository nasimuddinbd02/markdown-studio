import { htmlToMarkdown } from "./html";

export interface ExtractedImage {
  /** File name to store under assets/ (unique within the import). */
  name: string;
  base64: string;
  contentType: string;
}

export interface ConversionResult {
  markdown: string;
  images: ExtractedImage[];
  warnings: string[];
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-emf": "emf",
  "image/x-wmf": "wmf",
};

/**
 * Word (.docx) → Markdown. Headings, lists, tables, links, bold/italic and
 * images are kept; images are returned separately and referenced as
 * `assets/<name>` so the caller can store them next to the new document.
 */
export async function docxToMarkdown(data: ArrayBuffer, baseName = "image"): Promise<ConversionResult> {
  const mammoth = (await import("mammoth")).default;
  const images: ExtractedImage[] = [];
  const stem = baseName.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "image";
  // The app bundles mammoth's browser build (arrayBuffer); Node tooling uses
  // its Node build (buffer). Provide both.
  const input: { arrayBuffer: ArrayBuffer; buffer?: unknown } = { arrayBuffer: data };
  const NodeBuffer = (globalThis as { Buffer?: { from(d: ArrayBuffer): unknown } }).Buffer;
  if (NodeBuffer) input.buffer = NodeBuffer.from(data);
  const result = await mammoth.convertToHtml(
    input as { arrayBuffer: ArrayBuffer },
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Quote'] => blockquote > p:fresh",
        "p[style-name='Intense Quote'] => blockquote > p:fresh",
        "r[style-name='Code'] => code",
        "p[style-name='Code'] => pre > code:fresh",
      ],
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read("base64");
        const ext = EXT[image.contentType] ?? "png";
        const name = `${stem}-${images.length + 1}.${ext}`;
        images.push({ name, base64, contentType: image.contentType });
        return { src: `assets/${name}` };
      }),
    },
  );
  const warnings = result.messages
    .filter((m) => m.type === "warning")
    .map((m) => m.message)
    .filter((m, i, all) => all.indexOf(m) === i);
  return { markdown: htmlToMarkdown(result.value), images, warnings };
}

/** Web page (.html) → Markdown. Inline data: images are extracted like .docx images. */
export function htmlFileToMarkdown(html: string, baseName = "image"): ConversionResult {
  const images: ExtractedImage[] = [];
  const stem = baseName.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "image";
  const withAssets = html.replace(/(<img\b[^>]*\bsrc=")data:(image\/[\w.+-]+);base64,([^"]+)(")/gi, (_m, pre, type, b64, post) => {
    const name = `${stem}-${images.length + 1}.${EXT[type] ?? "png"}`;
    images.push({ name, base64: b64, contentType: type });
    return `${pre}assets/${name}${post}`;
  });
  return { markdown: htmlToMarkdown(withAssets), images, warnings: [] };
}
