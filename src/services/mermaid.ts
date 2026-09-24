/**
 * Mermaid diagrams, loaded on demand: the library is large, so it is only
 * fetched when a document actually contains a ```mermaid block.
 * `securityLevel: "strict"` disables click handlers and HTML labels and runs
 * the output through Mermaid's DOMPurify sanitizer.
 */

type Mermaid = typeof import("mermaid").default;

let loading: Promise<Mermaid> | null = null;
let counter = 0;
/** Serialises renders: Mermaid keeps global state while rendering. */
let queue: Promise<unknown> = Promise.resolve();

function load(): Promise<Mermaid> {
  loading ??= import("mermaid").then((m) => m.default);
  return loading;
}

export async function renderMermaid(code: string, dark: boolean): Promise<string> {
  const run = queue.then(async () => {
    const mermaid = await load();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: dark ? "dark" : "default",
      fontFamily: "inherit",
    });
    const id = `mermaid-${Date.now().toString(36)}-${counter++}`;
    try {
      const { svg } = await mermaid.render(id, code);
      return svg;
    } finally {
      // Mermaid leaves a temporary element behind when rendering fails.
      document.getElementById(id)?.remove();
      document.getElementById("d" + id)?.remove();
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Replaces ```mermaid code blocks in rendered HTML with SVG diagrams, for
 * exports. Blocks that fail to render are left as code.
 */
export async function inlineMermaidDiagrams(html: string): Promise<string> {
  if (!html.includes("language-mermaid")) return html;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const blocks = [...tpl.content.querySelectorAll("pre > code.language-mermaid")];
  for (const code of blocks) {
    try {
      const svg = await renderMermaid(code.textContent ?? "", false);
      const figure = document.createElement("div");
      figure.className = "mermaid-diagram";
      figure.innerHTML = svg;
      code.parentElement!.replaceWith(figure);
    } catch {
      /* keep the source block */
    }
  }
  return tpl.innerHTML;
}
