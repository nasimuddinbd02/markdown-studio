import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { imageSize, makeImageLoader, markdownToDocx } from "../src/services/convert/toDocx";
import { docxToMarkdown } from "../src/services/convert/docx";
import { exportActiveAsDocx } from "../src/features/exporting";
import { openPath } from "../src/features/documents";
import { setupBackend } from "./helpers";

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const SAMPLE = `# Project Plan

Intro with **bold**, *italic*, ~~old~~ and \`code\` and a [link](https://example.com).

## Tasks

1. First
2. Second
   - nested bullet
3. Third

- [x] done
- [ ] todo

| Name | Qty |
| :--- | --: |
| Pens | 10 |

> Quoted text

\`\`\`js
const x = 1;
\`\`\`

---

![Dot](data:image/png;base64,${PNG_B64})
`;

async function documentXml(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  return zip.file("word/document.xml")!.async("string");
}

describe("Markdown → Word (.docx)", () => {
  it("produces a valid Word package with Word heading styles, lists, tables and images", async () => {
    const bytes = await markdownToDocx(SAMPLE, {
      title: "Project Plan",
      loadImage: makeImageLoader(null, async () => ""),
    });
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
    const xml = await documentXml(bytes);
    expect(xml).toContain('w:val="Heading1"');
    expect(xml).toContain('w:val="Heading2"');
    expect(xml).toContain("<w:b/>");
    expect(xml).toContain("<w:i/>");
    expect(xml).toContain("<w:strike/>");
    expect(xml).toContain("<w:tbl>");
    expect(xml).toContain("w:tblHeader");
    expect(xml).toContain("☑ ");
    expect(xml).toContain("<w:drawing>");
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).some((f) => f.startsWith("word/media/"))).toBe(true);
    expect(await zip.file("docProps/core.xml")!.async("string")).toContain("Project Plan");
  }, 20_000);

  it("round-trips through the Word importer", async () => {
    const bytes = await markdownToDocx(SAMPLE, { loadImage: makeImageLoader(null, async () => "") });
    const back = await docxToMarkdown(bytes.buffer as ArrayBuffer, "roundtrip");
    const md = back.markdown;
    expect(md).toContain("# Project Plan");
    expect(md).toContain("## Tasks");
    expect(md).toContain("**bold**");
    expect(md).toContain("*italic*");
    expect(md).toContain("[link](https://example.com)");
    expect(md).toMatch(/1\. +First/);
    expect(md).toMatch(/\| Name +\| Qty +\|/);
    expect(md).toMatch(/\| Pens +\| 10 +\|/);
    expect(md).toContain("const x = 1;");
    expect(back.images).toHaveLength(1);
  }, 20_000);

  it("falls back to alt text for images it can't embed", async () => {
    const bytes = await markdownToDocx("![Remote](https://example.com/a.png)");
    expect(await documentXml(bytes)).toContain("[Remote]");
  });

  it("reads image sizes from headers", () => {
    const png = Uint8Array.from(atob(PNG_B64), (c) => c.charCodeAt(0));
    expect(imageSize(png)).toEqual({ width: 1, height: 1 });
    expect(imageSize(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it("exports the active document through the backend", async () => {
    const backend = setupBackend({ "/ws/plan.md": "# Plan\n\nHello" });
    await openPath("/ws/plan.md");
    await exportActiveAsDocx();
    expect(backend.lastExport?.name).toBe("plan.docx");
    expect(atob(backend.lastExport!.content).slice(0, 2)).toBe("PK");
  }, 20_000);
});
