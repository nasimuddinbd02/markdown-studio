import { EditorSelection, type EditorState, type Transaction, type StateCommand } from "@codemirror/state";

/**
 * Markdown formatting commands. They are plain CodeMirror `StateCommand`s so
 * they can be bound to keys, run from menus, and unit-tested without a view.
 */

type Dispatch = (tr: Transaction) => void;

/** Toggles an inline marker (e.g. `**`) around each selection range. */
export function toggleInline(marker: string): StateCommand {
  return ({ state, dispatch }) => {
    const len = marker.length;
    const tr = state.changeByRange((range) => {
      const before = state.sliceDoc(range.from - len, range.from);
      const after = state.sliceDoc(range.to, range.to + len);
      const text = state.sliceDoc(range.from, range.to);

      // Markers just outside the selection: unwrap.
      if (before === marker && after === marker) {
        return {
          changes: [
            { from: range.from - len, to: range.from, insert: "" },
            { from: range.to, to: range.to + len, insert: "" },
          ],
          range: EditorSelection.range(range.from - len, range.to - len),
        };
      }
      // Markers inside the selection: unwrap.
      if (text.length >= len * 2 && text.startsWith(marker) && text.endsWith(marker)) {
        return {
          changes: { from: range.from, to: range.to, insert: text.slice(len, text.length - len) },
          range: EditorSelection.range(range.from, range.to - len * 2),
        };
      }
      // Wrap (or insert an empty pair with the cursor in the middle).
      return {
        changes: [
          { from: range.from, insert: marker },
          { from: range.to, insert: marker },
        ],
        range: EditorSelection.range(range.from + len, range.to + len),
      };
    });
    dispatch(state.update(tr, { scrollIntoView: true, userEvent: "input.format" }));
    return true;
  };
}

export const toggleBold = toggleInline("**");
export const toggleItalic = toggleInline("*");
export const toggleStrikethrough = toggleInline("~~");
export const toggleInlineCode = toggleInline("`");

/** Wraps the selection as `[text](url)` and selects the placeholder that needs editing. */
export const insertLink: StateCommand = ({ state, dispatch }) => {
  const tr = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to);
    const looksLikeUrl = /^(https?:\/\/|mailto:)\S+$/i.test(text);
    if (looksLikeUrl) {
      const insert = `[](${text})`;
      return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + 1) };
    }
    const label = text || "link text";
    const insert = `[${label}](https://)`;
    const urlStart = range.from + label.length + 3;
    return {
      changes: { from: range.from, to: range.to, insert },
      range: text
        ? EditorSelection.range(urlStart, urlStart + "https://".length)
        : EditorSelection.range(range.from + 1, range.from + 1 + label.length),
    };
  });
  dispatch(state.update(tr, { scrollIntoView: true, userEvent: "input.format" }));
  return true;
};

/** Distinct lines touched by the selection, in document order. */
function selectedLines(state: EditorState) {
  const seen = new Set<number>();
  const lines = [];
  for (const r of state.selection.ranges) {
    for (let pos = r.from; pos <= r.to; ) {
      const line = state.doc.lineAt(pos);
      if (!seen.has(line.number)) {
        seen.add(line.number);
        lines.push(line);
      }
      pos = line.to + 1;
    }
  }
  return lines.sort((a, b) => a.number - b.number);
}

const HEADING = /^(#{1,6})\s+/;
const LIST_PREFIX = /^(\s*)(?:[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/;

/** Sets the heading level of each selected line; applying the same level again removes it. */
export function setHeading(level: number): StateCommand {
  return ({ state, dispatch }) => {
    const changes = selectedLines(state).map((line) => {
      const m = HEADING.exec(line.text);
      const current = m ? m[1].length : 0;
      const prefix = current === level || level === 0 ? "" : "#".repeat(level) + " ";
      return { from: line.from, to: line.from + (m ? m[0].length : 0), insert: prefix };
    });
    dispatch(state.update({ changes, scrollIntoView: true, userEvent: "input.format" }));
    return true;
  };
}

/**
 * Moves each selected heading up (`delta` < 0, fewer `#`) or down a level,
 * staying within H1–H6. Lines that aren't headings are left alone.
 */
export function shiftHeadingLevel(delta: -1 | 1): StateCommand {
  return ({ state, dispatch }) => {
    const changes = selectedLines(state).flatMap((line) => {
      const m = HEADING.exec(line.text);
      if (!m) return [];
      const level = Math.min(6, Math.max(1, m[1].length + delta));
      if (level === m[1].length) return [];
      return [{ from: line.from, to: line.from + m[1].length, insert: "#".repeat(level) }];
    });
    if (changes.length === 0) return false;
    dispatch(state.update({ changes, scrollIntoView: true, userEvent: "input.format" }));
    return true;
  };
}

export const promoteHeading = shiftHeadingLevel(-1);
export const demoteHeading = shiftHeadingLevel(1);

type LineKind = "bullet" | "ordered" | "task" | "quote";

function prefixFor(kind: LineKind, index: number) {
  switch (kind) {
    case "bullet":
      return "- ";
    case "ordered":
      return `${index + 1}. `;
    case "task":
      return "- [ ] ";
    case "quote":
      return "> ";
  }
}

function hasKind(text: string, kind: LineKind) {
  switch (kind) {
    case "bullet":
      return /^\s*[-*+]\s+(?!\[[ xX]\])/.test(text);
    case "ordered":
      return /^\s*\d+[.)]\s+/.test(text);
    case "task":
      return /^\s*[-*+]\s+\[[ xX]\]\s+/.test(text);
    case "quote":
      return /^\s*>/.test(text);
  }
}

/**
 * Toggles a line prefix (list, task, quote) on the selected lines. If every
 * non-empty line already has that kind, it is removed; otherwise any existing
 * list/quote prefix is replaced.
 */
export function toggleLinePrefix(kind: LineKind): StateCommand {
  return ({ state, dispatch }) => {
    const lines = selectedLines(state);
    const content = lines.filter((l) => l.text.trim() !== "" || lines.length === 1);
    const remove = content.length > 0 && content.every((l) => hasKind(l.text, kind));
    let n = 0;
    const changes = content.map((line) => {
      const m = LIST_PREFIX.exec(line.text);
      const indent = m ? m[1] : (/^\s*/.exec(line.text)?.[0] ?? "");
      const existing = m ? m[0].length : indent.length;
      const insert = remove ? indent : indent + prefixFor(kind, n++);
      return { from: line.from, to: line.from + existing, insert };
    });
    dispatch(state.update({ changes, scrollIntoView: true, userEvent: "input.format" }));
    return true;
  };
}

export const toggleBulletList = toggleLinePrefix("bullet");
export const toggleOrderedList = toggleLinePrefix("ordered");
export const toggleTaskList = toggleLinePrefix("task");
export const toggleQuote = toggleLinePrefix("quote");

/** Inserts a block, making sure it sits on its own lines. */
function insertBlock(build: (selected: string) => { text: string; cursorOffset: number; selectLength?: number }): StateCommand {
  return ({ state, dispatch }) => {
    const range = state.selection.main;
    const selected = state.sliceDoc(range.from, range.to);
    const { text, cursorOffset, selectLength = 0 } = build(selected);
    const lineStart = state.doc.lineAt(range.from);
    const lineEnd = state.doc.lineAt(range.to);
    const needsLeadingBreak = range.from > lineStart.from ? "\n\n" : lineStart.number > 1 && state.doc.line(lineStart.number - 1).text.trim() !== "" ? "\n" : "";
    const needsTrailingBreak = range.to < lineEnd.to ? "\n\n" : "\n";
    const insert = needsLeadingBreak + text + needsTrailingBreak;
    const anchor = range.from + needsLeadingBreak.length + cursorOffset;
    dispatch(
      state.update({
        changes: { from: range.from, to: range.to, insert },
        selection: EditorSelection.range(anchor, anchor + selectLength),
        scrollIntoView: true,
        userEvent: "input.format",
      }),
    );
    return true;
  };
}

export const insertCodeBlock = insertBlock((selected) => ({
  text: "```\n" + selected + (selected.endsWith("\n") || !selected ? "" : "\n") + "```",
  cursorOffset: 3,
}));

export const insertTable = insertBlock(() => {
  const text = "| Column 1 | Column 2 |\n| -------- | -------- |\n| Cell     | Cell     |";
  return { text, cursorOffset: 2, selectLength: "Column 1".length };
});

export const insertHorizontalRule = insertBlock(() => ({ text: "---", cursorOffset: 4 }));

/** Runs a command against a plain state (used by tests). */
export function applyCommand(state: EditorState, command: StateCommand): EditorState {
  let next = state;
  command({ state, dispatch: ((tr: Transaction) => (next = tr.state)) as Dispatch });
  return next;
}
