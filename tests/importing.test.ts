import { describe, expect, it } from "vitest";
import { Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, ExternalHyperlink } from "docx";
import { htmlToMarkdown, isRichHtml } from "../src/services/convert/html";
import { docxToMarkdown, htmlFileToMarkdown } from "../src/services/convert/docx";

// 1×1 transparent PNG
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const pngBytes = () => Uint8Array.from(atob(PNG_B64), (c) => c.charCodeAt(0));

async function sampleDocx(): Promise<ArrayBuffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Quarterly Report", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [new TextRun("Revenue grew "), new TextRun({ text: "strongly", bold: true }), new TextRun(" and "), new TextRun({ text: "steadily", italics: true }), new TextRun(".")],
          }),
          new Paragraph({ text: "Highlights", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "First point", bullet: { level: 0 } }),
          new Paragraph({ text: "Second point", bullet: { level: 0 } }),
          new Paragraph({
            children: [new ExternalHyperlink({ link: "https://example.com", children: [new TextRun("Example site")] })],
          }),
          new Table({
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Region")] }), new TableCell({ children: [new Paragraph("Sales")] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("North")] }), new TableCell({ children: [new Paragraph("42")] })] }),
            ],
          }),
          new Paragraph({ children: [new ImageRun({ type: "png", data: pngBytes(), transformation: { width: 10, height: 10 } })] }),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  return blob.arrayBuffer();
}

describe("HTML → Markdown", () => {
  it("converts headings, emphasis, lists, links, code and tables", () => {
    const md = htmlToMarkdown(`
      <h1>Title</h1><p>Some <strong>bold</strong> and <em>italic</em> and <del>gone</del>.</p>
      <ul><li>one</li><li>two</li></ul>
      <p><a href="https://x.y">link</a> <a href="javascript:alert(1)">bad</a></p>
      <pre><code class="language-js">const a = 1;</code></pre>
      <table><tr><td>A</td><td>B</td></tr><tr><td>1</td><td><p>2</p></td></tr></table>
      <script>alert(1)</script>`);
    expect(md).toContain("# Title");
    expect(md).toContain("Some **bold** and *italic* and ~~gone~~.");
    expect(md).toMatch(/^- +one$/m);
    expect(md).toContain("[link](https://x.y)");
    expect(md).not.toContain("javascript:");
    expect(md).toContain("bad");
    expect(md).toContain("```js\nconst a = 1;\n```");
    expect(md).toMatch(/\| A +\| B +\|\n\| -+ \| -+ \|\n\| 1 +\| 2 +\|/);
    expect(md).not.toContain("alert");
  });

  it("detects whether clipboard HTML is worth converting", () => {
    expect(isRichHtml("<meta charset='utf-8'><div><span style='color:red'>code</span></div>")).toBe(false);
    expect(isRichHtml("<p>Hello <b>world</b></p>")).toBe(true);
  });

  it("extracts inline images from HTML files", () => {
    const r = htmlFileToMarkdown(`<h2>Pic</h2><img alt="dot" src="data:image/png;base64,${PNG_B64}">`, "Page One");
    expect(r.images).toEqual([{ name: "Page-One-1.png", base64: PNG_B64, contentType: "image/png" }]);
    expect(r.markdown).toContain("![dot](assets/Page-One-1.png)");
  });
});

describe("Word (.docx) → Markdown", () => {
  it("converts a real Word document including tables and images", async () => {
    const result = await docxToMarkdown(await sampleDocx(), "Quarterly Report");
    const md = result.markdown;
    expect(md).toContain("# Quarterly Report");
    expect(md).toContain("Revenue grew **strongly** and *steadily*.");
    expect(md).toContain("## Highlights");
    expect(md).toMatch(/^- +First point$/m);
    expect(md).toContain("[Example site](https://example.com)");
    expect(md).toMatch(/\| Region +\| Sales +\|/);
    expect(md).toMatch(/\| North +\| 42 +\|/);
    expect(result.images).toHaveLength(1);
    expect(result.images[0].name).toBe("Quarterly-Report-1.png");
    expect(md).toContain("](assets/Quarterly-Report-1.png)");
  }, 20_000);

  it("rejects files that aren't Word documents", async () => {
    await expect(docxToMarkdown(new TextEncoder().encode("not a zip").buffer)).rejects.toThrow();
  });
});
