import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

/**
 * HTML → Markdown (GitHub Flavored), used for .docx/.html import and for
 * pasting rich text. Scripts, styles and other non-content elements are
 * dropped; tables become GFM tables.
 */
function createService() {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
    hr: "---",
  });
  td.use(gfm);
  // Double tildes are understood by every GFM renderer (single ones aren't).
  td.addRule("strikethroughDouble", {
    filter: ["del", "s", "strike"] as never,
    replacement: (content) => `~~${content}~~`,
  });
  td.remove(["script", "style", "noscript", "iframe", "object", "embed", "form", "button", "select", "textarea", "head", "title", "meta", "link"]);
  // Word/HTML bookmarks (<a id="_Toc123"></a>) carry no text.
  td.addRule("emptyAnchors", {
    filter: (node) => node.nodeName === "A" && !node.getAttribute("href") && !node.textContent?.trim(),
    replacement: () => "",
  });
  // Links without a safe target keep only their text.
  td.addRule("unsafeLinks", {
    filter: (node) => node.nodeName === "A" && /^\s*(javascript|vbscript|data):/i.test(node.getAttribute("href") ?? ""),
    replacement: (content) => content,
  });
  // <pre><code class="language-x"> keeps its language.
  td.addRule("fencedWithLanguage", {
    filter: (node) => node.nodeName === "PRE" && node.firstChild?.nodeName === "CODE",
    replacement: (_content, node) => {
      const code = node.firstChild as HTMLElement;
      const lang = /language-([\w+-]+)/.exec(code.getAttribute("class") ?? "")?.[1] ?? "";
      const text = (code.textContent ?? "").replace(/\n$/, "");
      const fence = text.includes("```") ? "~~~" : "```";
      return `\n\n${fence}${lang}\n${text}\n${fence}\n\n`;
    },
  });
  return td;
}

let service: TurndownService | null = null;

/** Promotes the first row of header-less tables so they convert to GFM tables. */
function normaliseTables(root: ParentNode) {
  for (const table of root.querySelectorAll("table")) {
    if (table.querySelector("th")) continue;
    const firstRow = table.querySelector("tr");
    if (!firstRow) continue;
    for (const td of [...firstRow.children]) {
      const th = td.ownerDocument.createElement("th");
      th.innerHTML = td.innerHTML;
      td.replaceWith(th);
    }
  }
  // GFM cells can't hold block content: flatten paragraphs inside cells.
  for (const cell of root.querySelectorAll("td, th")) {
    for (const p of [...cell.querySelectorAll("p")]) {
      p.replaceWith(...p.childNodes, cell.ownerDocument.createTextNode(" "));
    }
  }
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  normaliseTables(doc.body);
  service ??= createService();
  const md = service.turndown(doc.body.innerHTML);
  return (
    md
      // collapse 3+ blank lines and trim trailing spaces
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+$/gm, "")
      .trim() + "\n"
  );
}

/**
 * Whether pasted HTML carries real formatting worth converting (headings,
 * lists, links, tables, emphasis). Code editors put styled <span>s on the
 * clipboard; those should paste as plain text.
 */
export function isRichHtml(html: string): boolean {
  return /<(h[1-6]|ul|ol|li|table|strong|b|em|i|a\s[^>]*href|blockquote|img|pre|code|p)\b/i.test(html);
}
