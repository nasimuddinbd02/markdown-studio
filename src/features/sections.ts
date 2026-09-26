import { EditorState, type StateCommand, type Text } from "@codemirror/state";
import { useDocuments } from "../stores/documentsStore";
import { editorDocId, getEditorView } from "./editorBridge";

interface Heading {
  /** 1-based line number. */
  line: number;
  level: number;
}

/** ATX headings (`#` to `######`), ignoring lines inside fenced code blocks. */
function headings(doc: Text): Heading[] {
  const out: Heading[] = [];
  let fence: string | null = null;
  for (let n = 1; n <= doc.lines; n++) {
    const text = doc.line(n).text;
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(text);
    if (f) {
      if (fence === null) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const h = /^\s{0,3}(#{1,6})(\s|$)/.exec(text);
    if (h) out.push({ line: n, level: h[1].length });
  }
  return out;
}

/** The section starting at heading `i`: through the line before the next heading of the same or a higher level. */
function sectionEnd(list: Heading[], i: number, lastLine: number): number {
  for (let j = i + 1; j < list.length; j++) if (list[j].level <= list[i].level) return list[j].line - 1;
  return lastLine;
}

/**
 * Moves the section around the cursor (its heading, text and subsections)
 * above the previous section or below the next one at the same level, within
 * the same parent. The cursor stays at the same place in the moved section.
 */
export function moveSection(direction: -1 | 1): StateCommand {
  return ({ state, dispatch }) => {
    const doc = state.doc;
    const list = headings(doc);
    const cursorLine = doc.lineAt(state.selection.main.head).number;
    let i = -1;
    for (let k = 0; k < list.length && list[k].line <= cursorLine; k++) i = k;
    if (i < 0) return false;

    // The sibling: the neighbouring section at the same level, without leaving the parent.
    let j = -1;
    if (direction < 0) {
      for (let k = i - 1; k >= 0 && list[k].level >= list[i].level; k--) if (list[k].level === list[i].level) { j = k; break; }
    } else {
      const end = sectionEnd(list, i, doc.lines);
      const k = list.findIndex((h) => h.line === end + 1);
      if (k >= 0 && list[k].level === list[i].level) j = k;
    }
    if (j < 0) return false;

    const [first, second] = direction < 0 ? [j, i] : [i, j];
    const firstStart = list[first].line;
    const secondStart = list[second].line;
    const secondEnd = sectionEnd(list, second, doc.lines);
    const lines = (from: number, to: number) => {
      const out: string[] = [];
      for (let n = from; n <= to; n++) out.push(doc.line(n).text);
      return out;
    };
    let a = lines(firstStart, secondStart - 1);
    let b = lines(secondStart, secondEnd);
    // The last section of the document may lack the blank line the others end with.
    if (b[b.length - 1] !== "" && a[a.length - 1] === "") {
      b = [...b, ""];
      a = a.slice(0, -1);
    }
    const from = doc.line(firstStart).from;
    const to = doc.line(secondEnd).to;
    const insert = [...b, ...a].join("\n");

    // Keep the cursor at the same spot within the section it was in.
    const head = state.selection.main.head;
    const moved = direction < 0 ? secondStart : firstStart;
    const offset = head - doc.line(moved).from;
    const newStart = direction < 0 ? from : from + b.join("\n").length + 1;
    dispatch(
      state.update({
        changes: { from, to, insert },
        selection: { anchor: Math.min(newStart + offset, from + insert.length) },
        scrollIntoView: true,
        userEvent: "move.section",
      }),
    );
    return true;
  };
}

export const moveSectionUp = moveSection(-1);
export const moveSectionDown = moveSection(1);

/**
 * Moves the section whose heading is on `line` (1-based), for the outline.
 * Goes through the editor when it shows the document, so it can be undone.
 */
export function moveSectionAtLine(docId: string, line: number, direction: -1 | 1): boolean {
  const command = moveSection(direction);
  const view = getEditorView();
  if (view && editorDocId() === docId) {
    const at = view.state.doc.line(Math.min(line, view.state.doc.lines)).from;
    view.dispatch({ selection: { anchor: at } });
    return command({ state: view.state, dispatch: view.dispatch });
  }
  const doc = useDocuments.getState().docs.find((d) => d.id === docId);
  if (!doc) return false;
  let state = EditorState.create({ doc: doc.content });
  state = state.update({ selection: { anchor: state.doc.line(Math.min(line, state.doc.lines)).from } }).state;
  let moved = false;
  command({ state, dispatch: (tr) => { useDocuments.getState().setContent(docId, tr.newDoc.toString()); moved = true; } });
  return moved;
}
