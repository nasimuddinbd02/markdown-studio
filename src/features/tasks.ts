import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import { splitFrontMatter } from "../services/frontMatter";
import { useDocuments } from "../stores/documentsStore";
import { editorDocId, getEditorView } from "./editorBridge";

/** 1-based line numbers of the task list items (`- [ ]`, `- [x]`), in document order. */
export function taskItemLines(markdown: string): number[] {
  // Front matter is replaced by blank lines, so line numbers still match the source.
  const body = splitFrontMatter(markdown)?.body ?? markdown;
  const tree = unified().use(remarkParse).use(remarkGfm).parse(body) as Root;
  const lines: number[] = [];
  visit(tree, "listItem", (node) => {
    if (typeof node.checked === "boolean" && node.position) lines.push(node.position.start.line);
  });
  return lines;
}

const TASK_MARKER = /^((?:\s*>)*\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])\]/;

/** The edit that checks or unchecks the `index`-th task in the document, or null. */
export function toggleTaskChange(markdown: string, index: number): { from: number; to: number; insert: string } | null {
  const line = taskItemLines(markdown)[index];
  if (line === undefined) return null;
  let from = 0;
  for (let i = 1; i < line; i++) from = markdown.indexOf("\n", from) + 1;
  const end = markdown.indexOf("\n", from);
  const m = TASK_MARKER.exec(markdown.slice(from, end < 0 ? undefined : end));
  if (!m) return null;
  const at = from + m[1].length;
  return { from: at, to: at + 1, insert: m[2] === " " ? "x" : " " };
}

/** Toggles a task from the preview, through the editor when it shows the document (so it can be undone). */
export function toggleTaskInDocument(docId: string, index: number): boolean {
  const view = getEditorView();
  if (view && editorDocId() === docId) {
    const change = toggleTaskChange(view.state.doc.toString(), index);
    if (!change) return false;
    view.dispatch({ changes: change, userEvent: "input.toggleTask" });
    return true;
  }
  const doc = useDocuments.getState().docs.find((d) => d.id === docId);
  const change = doc ? toggleTaskChange(doc.content, index) : null;
  if (!doc || !change) return false;
  useDocuments.getState().setContent(docId, doc.content.slice(0, change.from) + change.insert + doc.content.slice(change.to));
  return true;
}
