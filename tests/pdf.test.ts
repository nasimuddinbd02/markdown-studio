import { beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { pdfToMarkdown, setPdfJsLoader, stripRunningText, type Line } from "../src/services/convert/pdf";
import { makePdf, sampleReportPdf } from "./pdfFixture";

beforeAll(() => {
  // In Node tooling pdf.js runs its legacy build with an in-process worker.
  const require = createRequire(import.meta.url);
  setPdfJsLoader(async () => {
    const lib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    lib.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
    const root = require.resolve("pdfjs-dist/package.json").replace(/package\.json$/, "");
    return {
      lib: lib as unknown as typeof import("pdfjs-dist"),
      cMapUrl: root + "cmaps/",
      standardFontDataUrl: root + "standard_fonts/",
    };
  });
});

const buf = (u8: Uint8Array) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;

describe("PDF → Markdown", () => {
  it("reconstructs headings, paragraphs, lists and drops running headers/footers", async () => {
    const { markdown, warnings } = await pdfToMarkdown(buf(sampleReportPdf()));
    expect(warnings).toEqual([]);
    expect(markdown).toBe(
      [
        "# Annual Report",
        "",
        "## Overview",
        "",
        "This year the company grew in every region and opened two new offices in Europe, with strong performance overall.",
        "",
        "### Key results",
        "",
        "- Revenue up 20%",
        "- Costs down 5%",
        "",
        "1. Hire more engineers",
        "2. Expand to Asia",
        "",
        "## Outlook",
        "",
        "Next year looks bright.",
        "",
      ].join("\n"),
    );
  }, 30_000);

  it("reports PDFs without text (e.g. scans)", async () => {
    const empty = makePdf([[]]);
    const r = await pdfToMarkdown(buf(empty));
    expect(r.markdown).toBe("");
    expect(r.warnings[0]).toMatch(/no selectable text/);
  }, 30_000);

  it("rejects files that aren't PDFs", async () => {
    await expect(pdfToMarkdown(buf(new TextEncoder().encode("hello")))).rejects.toThrow();
  }, 30_000);
});

describe("running text detection", () => {
  it("removes repeated edge lines and page numbers, keeps body text", () => {
    const line = (text: string, page: number, y: number): Line => ({ text, page, y, x: 0, size: 10, bold: false, pageHeight: 792 });
    const pages = [1, 2, 3].map((p) => [line("Report 2026", p, 780), line(`Body ${p}`, p, 500), line(`${p} / 3`, p, 20)]);
    expect(stripRunningText(pages).map((p) => p.map((l) => l.text))).toEqual([["Body 1"], ["Body 2"], ["Body 3"]]);
  });
});
