import { backend } from "../services";
import { describeError } from "../services/errors";
import { buildHtmlDocument, exportFileName, renderHtml } from "../services/exportHtml";
import { activeDoc } from "../stores/documentsStore";
import { notify } from "../stores/uiStore";
import { useSettings } from "../stores/settingsStore";

const features = () => {
  const s = useSettings.getState().settings;
  return { math: s.renderMath, diagrams: s.renderDiagrams };
};

const loadImage = (path: string) => backend().readImage(path);

/** Exports the active document as a standalone HTML file. */
export async function exportActiveAsHtml() {
  const doc = activeDoc();
  if (!doc) return;
  try {
    const html = await buildHtmlDocument({ markdown: doc.content, name: doc.name, docPath: doc.path, loadImage, features: features() });
    const saved = await backend().exportFile(exportFileName(doc.name, "html"), html, "html");
    if (saved) notify("success", `Exported to ${saved}`);
  } catch (e) {
    notify("error", describeError(e, "export the document"));
  }
}

/** Copies the rendered HTML of the active document to the clipboard. */
export async function copyActiveAsHtml() {
  const doc = activeDoc();
  if (!doc) return;
  try {
    const html = await renderHtml(doc.content, doc.path, loadImage, features());
    await navigator.clipboard.writeText(html);
    notify("success", "HTML copied to the clipboard.");
  } catch (e) {
    notify("error", describeError(e, "copy the HTML"));
  }
}

/**
 * Prints the active document (and "Save as PDF" through the system print
 * dialog). The rendered document is placed in a print-only container so it
 * works in every view mode.
 */
export async function printActive() {
  const doc = activeDoc();
  if (!doc) return;
  let container: HTMLElement | null = null;
  try {
    const html = await renderHtml(doc.content, doc.path, loadImage, features());
    container = document.createElement("div");
    container.id = "print-root";
    container.innerHTML = `<article class="markdown-body">${html}</article>`;
    document.body.appendChild(container);
    document.body.classList.add("printing");
    const cleanup = () => {
      document.body.classList.remove("printing");
      container?.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    // Give images a moment to decode before the print snapshot.
    await new Promise((r) => setTimeout(r, 50));
    window.print();
    // Some webviews don't fire afterprint; clean up after the dialog returns.
    setTimeout(cleanup, 1000);
  } catch (e) {
    document.body.classList.remove("printing");
    container?.remove();
    notify("error", describeError(e, "print the document"));
  }
}
