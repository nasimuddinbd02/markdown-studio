import { beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { markdownToPdf, pdfExportUnsupportedText } from "../src/services/convert/toPdf";
import { makeImageLoader } from "../src/services/convert/toDocx";
import { pdfToMarkdown, setPdfJsLoader } from "../src/services/convert/pdf";
import { exportActiveAsPdf } from "../src/features/exporting";
import { openPath } from "../src/features/documents";
import { autoAnswer, setupBackend } from "./helpers";

const require = createRequire(import.meta.url);
async function pdfjs() {
  const lib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  lib.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
  return lib;
}
beforeAll(() => {
  const root = require.resolve("pdfjs-dist/package.json").replace(/package\.json$/, "");
  setPdfJsLoader(async () => ({
    lib: (await pdfjs()) as unknown as typeof import("pdfjs-dist"),
    cMapUrl: root + "cmaps/",
    standardFontDataUrl: root + "standard_fonts/",
  }));
});

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const SAMPLE = `# Handbook

Welcome to the **team**. Visit [our site](https://example.com).

## Getting started

1. Read this
2. Ask questions

### Tools

- [x] Laptop
- [ ] Badge

| Item | Owner |
| --- | --- |
| Laptop | IT |

\`\`\`
npm install
\`\`\`

> Remember to rest.

![Logo](data:image/png;base64,${PNG_B64})
`;

const buf = (u8: Uint8Array) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;

describe("Markdown → PDF", () => {
  it("produces a PDF with selectable text, links, an image and a heading bookmark tree", async () => {
    const bytes = await markdownToPdf(SAMPLE, { title: "Handbook", loadImage: makeImageLoader(null, async () => "") });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");

    const lib = await pdfjs();
    const task = lib.getDocument({ data: bytes.slice() });
    const pdf = await task.promise;
    const meta = await pdf.getMetadata();
    expect((meta.info as { Title?: string }).Title).toBe("Handbook");
    const outline = await pdf.getOutline();
    expect(outline.map((o) => o.title)).toEqual(["Handbook"]);
    expect(outline[0].items.map((o) => o.title)).toEqual(["Getting started"]);
    expect(outline[0].items[0].items.map((o: { title: string }) => o.title)).toEqual(["Tools"]);

    const page = await pdf.getPage(1);
    const annotations = await page.getAnnotations();
    expect(annotations.some((a: { url?: string }) => a.url === "https://example.com/" || a.url === "https://example.com")).toBe(true);
    const ops = await page.getOperatorList();
    expect(ops.fnArray).toContain(lib.OPS.paintImageXObject);
    await task.destroy();
  }, 30_000);

  it("round-trips through the PDF importer", async () => {
    const bytes = await markdownToPdf(SAMPLE, { loadImage: makeImageLoader(null, async () => "") });
    const { markdown } = await pdfToMarkdown(buf(bytes));
    expect(markdown).toContain("# Handbook");
    expect(markdown).toContain("## Getting started");
    expect(markdown).toContain("Welcome to the team. Visit our site.");
    expect(markdown).toMatch(/Laptop/);
    expect(markdown).toContain("npm install");
  }, 30_000);

  it("flags characters the built-in font can't display", () => {
    expect(pdfExportUnsupportedText("Hello Ωμέγα Привет café — “quotes” ™ €")).toEqual([]);
    expect(pdfExportUnsupportedText("你 م 🚀 ✓")).toEqual(expect.arrayContaining(["你", "م", "🚀", "✓"]));
  });

  it("offers Print → Save as PDF for unsupported scripts, otherwise exports", async () => {
    const backend = setupBackend({ "/ws/zh.md": "# 你好", "/ws/en.md": "# Hello" });
    await openPath("/ws/zh.md");
    const answers = autoAnswer("cancel");
    await exportActiveAsPdf();
    answers.stop();
    expect(answers.titles).toEqual(["Some characters need a different PDF method"]);
    expect(backend.lastExport).toBeNull();

    await openPath("/ws/en.md");
    await exportActiveAsPdf();
    expect(backend.lastExport?.name).toBe("en.pdf");
    expect(atob(backend.lastExport!.content).slice(0, 5)).toBe("%PDF-");
  }, 30_000);
});
