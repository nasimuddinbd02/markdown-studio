// Generates e2e test fixtures (run: node scripts/make-fixtures.mjs).
import { writeFileSync } from "node:fs";
import { Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from "docx";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: "Imported Report", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun("Made in "), new TextRun({ text: "Word", bold: true }), new TextRun(".")] }),
        new Paragraph({ text: "Alpha", bullet: { level: 0 } }),
        new Paragraph({ text: "Beta", bullet: { level: 0 } }),
        new Table({
          rows: [
            new TableRow({ children: ["Name", "Score"].map((t) => new TableCell({ children: [new Paragraph(t)] })) }),
            new TableRow({ children: ["Ada", "99"].map((t) => new TableCell({ children: [new Paragraph(t)] })) }),
          ],
        }),
        new Paragraph({ children: [new ImageRun({ type: "png", data: png, transformation: { width: 16, height: 16 } })] }),
      ],
    },
  ],
});
writeFileSync("e2e/fixtures/report.docx", await Packer.toBuffer(doc));
console.log("wrote e2e/fixtures/report.docx");
