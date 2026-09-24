import { formatTable, splitRow } from "../../features/tables";

/** Picks the delimiter that yields the most consistent column count. */
export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20);
  let best = ",";
  let bestScore = -1;
  for (const d of ["\t", ",", ";", "|"]) {
    const counts = sample.map((l) => parseDelimited(l, d)[0]?.length ?? 0);
    if (!counts.length || counts[0] < 2) continue;
    const consistent = counts.filter((c) => c === counts[0]).length;
    const score = consistent * 100 + counts[0];
    if (score > bestScore) [best, bestScore] = [d, score];
  }
  return best;
}

/** RFC 4180-style parser: quoted fields, escaped quotes (""), newlines inside quotes. */
export function parseDelimited(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const cell = (v: string) => v.trim().replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|");

/** Rows → aligned GFM table (first row is the header). */
export function rowsToMarkdownTable(rows: string[][]): string {
  if (!rows.length) return "";
  const cols = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(cols - r.length).fill("")];
  const header = pad(rows[0]).map((c, i) => cell(c) || `Column ${i + 1}`);
  const body = rows.slice(1).map((r) => pad(r).map(cell));
  // Right-align columns that are entirely numeric.
  const numeric = header.map((_, i) => body.length > 0 && body.every((r) => r[i] === "" || /^-?[\d.,]+%?$/.test(r[i])));
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${numeric.map((n) => (n ? "--:" : "---")).join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ];
  return (formatTable(lines) ?? lines).join("\n");
}

export function csvToMarkdownTable(text: string): string {
  return rowsToMarkdownTable(parseDelimited(text));
}

/** Plain clipboard text that looks like spreadsheet data (tab-separated, ≥2 columns and rows). */
export function looksLikeTsv(text: string): boolean {
  const lines = text.replace(/\r?\n$/, "").split(/\r?\n/);
  if (lines.length < 2 || !lines.every((l) => l.includes("\t"))) return false;
  const counts = lines.map((l) => l.split("\t").length);
  return counts.every((c) => c === counts[0]) && counts[0] >= 2;
}

/** A GFM table (lines) → CSV text (header included). */
export function markdownTableToCsv(tableLines: string[]): string {
  const rows = tableLines.filter((_, i) => i !== 1).map(splitRow);
  const quote = (v: string) => {
    const plain = v.replace(/\\\|/g, "|").replace(/<br\s*\/?>/gi, "\n");
    return /[",\n]/.test(plain) ? `"${plain.replace(/"/g, '""')}"` : plain;
  };
  return rows.map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n";
}
