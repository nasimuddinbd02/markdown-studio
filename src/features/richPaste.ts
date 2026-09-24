import type { EditorView } from "@codemirror/view";

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
