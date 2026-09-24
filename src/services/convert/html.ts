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

/**
 * Shapes tables for GFM: exactly one header row (the first; promoted if the
 * table has none), no redundant bold in header cells, no block content in cells.
 */
function normaliseTables(root: ParentNode) {
  for (const table of root.querySelectorAll("table")) {
    const rows = [...table.querySelectorAll("tr")];
    if (!rows.length) continue;
    rows.forEach((row, i) => {
      for (const cell of [...row.children]) {
        const want = i === 0 ? "TH" : "TD";
        if (cell.tagName === want) continue;
        const repl = cell.ownerDocument.createElement(want);
        repl.innerHTML = cell.innerHTML;
        for (const a of ["colspan", "rowspan", "align", "style"]) {
          const v = cell.getAttribute(a);
          if (v !== null) repl.setAttribute(a, v);
        }
        cell.replaceWith(repl);
      }
    });
    // Move every row into a single tbody so converters see one header row.
    const body = table.ownerDocument.createElement("tbody");
    for (const row of table.querySelectorAll("tr")) body.appendChild(row);
    for (const section of [...table.querySelectorAll("thead, tbody, tfoot")]) if (section !== body) section.remove();
    table.appendChild(body);
  }
  for (const cell of root.querySelectorAll("td, th")) {
    // GFM cells can't hold block content: flatten paragraphs.
    for (const p of [...cell.querySelectorAll("p")]) {
      p.replaceWith(...p.childNodes, cell.ownerDocument.createTextNode(" "));
    }
  }
  for (const th of root.querySelectorAll("th")) {
    // Header cells are already emphasised; drop bold that wraps the whole cell.
    const only = [...th.childNodes].filter((n) => n.nodeType !== 3 || n.textContent?.trim());
    if (only.length === 1 && /^(STRONG|B)$/.test((only[0] as Element).tagName ?? "")) {
      (only[0] as Element).replaceWith(...(only[0] as Element).childNodes);
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
