/** Minimal PDF writer for tests: Helvetica / Helvetica-Bold text at given positions. */
export interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  x?: number;
  y: number;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function makePdf(pages: PdfLine[][]): Uint8Array {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalog = add(""); // filled later
  const pagesObj = add("");
  const regular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];
  for (const lines of pages) {
    const stream = lines
      .map((l) => `BT /${l.bold ? "F2" : "F1"} ${l.size ?? 11} Tf ${l.x ?? 72} ${l.y} Td (${esc(l.text)}) Tj ET`)
      .join("\n");
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${content} 0 R >>`,
      ),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // WinAnsiEncoding: one byte per character (• is 0x95).
  return Uint8Array.from(pdf, (ch) => (ch === "•" ? 0x95 : ch.charCodeAt(0) & 0xff));
}

/** A two-page report with title, headings, a list, hyphenation and running header/footer. */
export function sampleReportPdf() {
  const header = (n: number): PdfLine[] => [
    { text: "ACME Corp - Confidential", size: 8, y: 770 },
    { text: `Page ${n}`, size: 8, y: 30 },
  ];
  return makePdf([
    [
      ...header(1),
      { text: "Annual Report", size: 24, bold: true, y: 700 },
      { text: "Overview", size: 16, bold: true, y: 660 },
      { text: "This year the company grew in every", y: 635 },
      { text: "region and opened two new offices in", y: 621 },
      { text: "Europe, with strong per-", y: 607 },
      { text: "formance overall.", y: 593 },
      { text: "Key results", bold: true, y: 560 },
      { text: "• Revenue up 20%", y: 540 },
      { text: "• Costs down 5%", y: 526 },
      { text: "1. Hire more engineers", y: 500 },
      { text: "2. Expand to Asia", y: 486 },
    ],
    [
      ...header(2),
      { text: "Outlook", size: 16, bold: true, y: 700 },
      { text: "Next year looks bright.", y: 675 },
    ],
  ]);
}
