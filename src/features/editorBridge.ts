import type { EditorView } from "@codemirror/view";
import type { StateCommand } from "@codemirror/state";
import { undo, redo, selectAll } from "@codemirror/commands";
import { openSearchPanel, gotoLine } from "@codemirror/search";

/** The mounted editor view, so menu commands can drive the editor. */
let view: EditorView | null = null;

export function registerEditorView(v: EditorView | null) {
  view = v;
}

export function getEditorView() {
  return view;
}

/** Runs a CodeMirror command against the active editor and returns focus to it. */
export function runOnEditor(command: StateCommand) {
  if (!view) return;
  command({ state: view.state, dispatch: view.dispatch });
  view.focus();
}

/** Opens the search panel and moves focus to its Replace field (FR-051). */
export function openReplacePanel(v: EditorView): boolean {
  openSearchPanel(v);
  // CodeMirror focuses the search field asynchronously; move focus after it.
  setTimeout(() => {
    const input = v.dom.querySelector<HTMLInputElement>(".cm-search input[name=replace]");
    input?.focus();
    input?.select();
  }, 30);
  return true;
}

export type EditorCommandName = "undo" | "redo" | "find" | "replace" | "gotoLine" | "selectAll";

export function editorCommand(name: EditorCommandName) {
  if (!view) return;
  switch (name) {
    case "undo":
      undo(view);
      view.focus();
      break;
    case "redo":
      redo(view);
      view.focus();
      break;
    case "selectAll":
      selectAll(view);
      view.focus();
      break;
    case "find":
      openSearchPanel(view);
      break;
    case "replace":
      openReplacePanel(view);
      break;
    case "gotoLine":
      gotoLine(view);
      break;
  }
}
