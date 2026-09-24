import type { EditorState, StateCommand } from "@codemirror/state";

type Align = "left" | "center" | "right" | "none";

const isTableLine = (line: string) => /^\s*\|.*\|\s*$/.test(line) || (/\|/.test(line) && line.trim() !== "");
const DELIMITER_CELL = /^\s*:?-{1,}:?\s*$/;

/** Splits a table row into cells, honouring escaped pipes and code spans. */
export function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && s[i + 1] === "|") {
      cur += "\\|";
      i++;
    } else if (ch === "`") {
      inCode = !inCode;
      cur += ch;
    } else if (ch === "|" && !inCode) {
      cells.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/** Display width: East Asian wide/fullwidth characters and emoji count as 2 columns. */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x300 && cp <= 0x36f) continue; // combining marks
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe4f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) ||
      (cp >= 0x1f300 && cp <= 0x1faff) ||
      (cp >= 0x20000 && cp <= 0x3fffd);
    w += wide ? 2 : 1;
  }
  return w;
}

function alignOf(cell: string): Align {
  const c = cell.trim();
  const l = c.startsWith(":");
  const r = c.endsWith(":");
  return l && r ? "center" : r ? "right" : l ? "left" : "none";
}

function pad(text: string, width: number, align: Align) {
  const gap = width - displayWidth(text);
  if (gap <= 0) return text;
  if (align === "right") return " ".repeat(gap) + text;
  if (align === "center") return " ".repeat(Math.floor(gap / 2)) + text + " ".repeat(Math.ceil(gap / 2));
  return text + " ".repeat(gap);
}

/**
 * Formats a GFM table: pads every column to the same width and normalises
 * the delimiter row. Returns `null` if the lines are not a valid table.
 */
export function formatTable(lines: string[]): string[] | null {
  if (lines.length < 2) return null;
  const rows = lines.map(splitRow);
  const delimiter = rows[1];
  if (!delimiter.every((c) => DELIMITER_CELL.test(c))) return null;
  const indent = /^\s*/.exec(lines[0])![0];
  const cols = Math.max(...rows.map((r) => r.length));
  const aligns: Align[] = Array.from({ length: cols }, (_, i) => (delimiter[i] ? alignOf(delimiter[i]) : "none"));
  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(3, ...rows.filter((_, ri) => ri !== 1).map((r) => displayWidth(r[i] ?? ""))),
  );
  return rows.map((r, ri) => {
    const cells = Array.from({ length: cols }, (_, i) => {
      if (ri === 1) {
        const a = aligns[i];
        const dashes = "-".repeat(widths[i] - (a === "center" ? 2 : a === "none" ? 0 : 1));
        return a === "center" ? `:${dashes}:` : a === "left" ? `:${dashes}` : a === "right" ? `${dashes}:` : dashes;
      }
      return pad(r[i] ?? "", widths[i], aligns[i]);
    });
    return `${indent}| ${cells.join(" | ")} |`;
  });
}

/** Line range (1-based, inclusive) of the table around `line`, if any. */
export function tableAround(state: EditorState, lineNo: number): { first: number; last: number } | null {
  const doc = state.doc;
  if (!isTableLine(doc.line(lineNo).text)) return null;
  let first = lineNo;
  let last = lineNo;
  while (first > 1 && isTableLine(doc.line(first - 1).text)) first--;
  while (last < doc.lines && isTableLine(doc.line(last + 1).text)) last++;
  return { first, last };
}

/** Command: format the table containing the cursor (Format → Format Table). */
export const formatTableAtCursor: StateCommand = ({ state, dispatch }) => {
  const lineNo = state.doc.lineAt(state.selection.main.head).number;
  const range = tableAround(state, lineNo);
  if (!range) return false;
  const lines: string[] = [];
  for (let n = range.first; n <= range.last; n++) lines.push(state.doc.line(n).text);
  const formatted = formatTable(lines);
  if (!formatted) return false;
  const from = state.doc.line(range.first).from;
  const to = state.doc.line(range.last).to;
  const insert = formatted.join("\n");
  if (insert === state.sliceDoc(from, to)) return true;
  // Keep the cursor in the same row and roughly the same cell.
  const cursorLine = lineNo - range.first;
  const head = state.selection.main.head - state.doc.line(lineNo).from;
  const cellIndex = (state.doc.line(lineNo).text.slice(0, head).match(/\|/g) ?? []).length;
  const rowStart = from + formatted.slice(0, cursorLine).reduce((n, l) => n + l.length + 1, 0);
  const row = formatted[cursorLine];
  let pipes = 0;
  let offset = row.length;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === "|" && ++pipes === cellIndex) {
      offset = Math.min(i + 2, row.length);
      break;
    }
  }
  dispatch(state.update({ changes: { from, to, insert }, selection: { anchor: rowStart + offset }, userEvent: "input.format" }));
  return true;
};
