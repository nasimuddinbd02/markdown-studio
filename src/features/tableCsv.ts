import { notify } from "../stores/uiStore";
import { getEditorView } from "./editorBridge";
import { tableAround } from "./tables";

/** Copies the Markdown table at the cursor to the clipboard as CSV (for spreadsheets). */
export async function copyTableAsCsv() {
  const view = getEditorView();
  if (!view) return;
  const state = view.state;
  const range = tableAround(state, state.doc.lineAt(state.selection.main.head).number);
  if (!range) {
    notify("info", "Place the cursor inside a table to copy it as CSV.");
    return;
  }
  const lines: string[] = [];
  for (let n = range.first; n <= range.last; n++) lines.push(state.doc.line(n).text);
  const { markdownTableToCsv } = await import("../services/convert/csv");
  try {
    await navigator.clipboard.writeText(markdownTableToCsv(lines));
    notify("success", `Copied ${lines.length - 2} row${lines.length === 3 ? "" : "s"} as CSV.`);
  } catch {
    notify("error", "Couldn't access the clipboard.");
  }
}
