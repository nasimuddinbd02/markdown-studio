import type { EditorView } from "@codemirror/view";
import { EditorSelection, type EditorState, type TransactionSpec } from "@codemirror/state";

/**
 * Pastes clipboard HTML (from a browser, Word, Google Docs…) as Markdown.
 * Plain-looking HTML (e.g. from code editors, which wrap text in styled
 * spans) is pasted as the plain-text flavour instead.
 */
export async function pasteHtmlAsMarkdown(view: EditorView, html: string, plain: string) {
  const { htmlToMarkdown, isRichHtml } = await import("../services/convert/html");
  let insert = plain;
  if (isRichHtml(html)) {
    try {
      insert = htmlToMarkdown(html).replace(/\n$/, "");
    } catch {
      insert = plain;
    }
  }
  if (!insert) return;
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    scrollIntoView: true,
    userEvent: "input.paste",
  });
}

/** Tab-separated text (copied from a spreadsheet) becomes a Markdown table; other text pastes as is. */
export async function pastePlainTable(view: EditorView, text: string) {
  const { looksLikeTsv, rowsToMarkdownTable, parseDelimited } = await import("../services/convert/csv");
  const insert = looksLikeTsv(text) ? rowsToMarkdownTable(parseDelimited(text, "\t")) + "\n" : text;
  const { from, to } = view.state.selection.main;
  view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length }, scrollIntoView: true, userEvent: "input.paste" });
}

const PASTED_URL = /^(?:https?:\/\/|mailto:)\S+$/i;

/**
 * Pasting a URL while text is selected turns the selection into a link:
 * select "our docs", paste https://example.com → [our docs](https://example.com).
 * Returns the transaction, or null when the normal paste should happen
 * (nothing selected, multi-line selection, the selection is itself a URL, or
 * the clipboard isn't a single URL).
 */
export function linkOverSelection(state: EditorState, pasted: string): TransactionSpec | null {
  const url = pasted.trim();
  if (!PASTED_URL.test(url)) return null;
  const ranges = state.selection.ranges;
  if (ranges.some((r) => r.empty)) return null;
  const texts = ranges.map((r) => state.sliceDoc(r.from, r.to));
  if (texts.some((t) => t.includes("\n") || PASTED_URL.test(t.trim()))) return null;
  const dest = /[()<>\s]/.test(url) ? `<${url.replace(/[<>]/g, encodeURIComponent)}>` : url;
  return {
    ...state.changeByRange((range) => {
      const insert = `[${state.sliceDoc(range.from, range.to)}](${dest})`;
      return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) };
    }),
    scrollIntoView: true,
    userEvent: "input.paste",
  };
}
