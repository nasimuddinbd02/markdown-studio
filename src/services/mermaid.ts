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

/**
 * `forImage` draws labels as SVG text instead of HTML, with a concrete font,
 * so the SVG can be turned into a picture (HTML labels would taint the canvas
 * and "inherit" means nothing outside the page).
 */
export async function renderMermaid(code: string, dark: boolean, { forImage = false } = {}): Promise<string> {
  const run = queue.then(async () => {
    const mermaid = await load();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: dark ? "dark" : "default",
      fontFamily: forImage ? "Arial, Helvetica, sans-serif" : "inherit",
      htmlLabels: !forImage,
      flowchart: { htmlLabels: !forImage },
      // SVG edge labels get a half-transparent background; make it solid so lines don't show through.
      themeCSS: forImage ? ".edgeLabel rect, .labelBkg { opacity: 1 !important; fill: #ffffff !important; }" : undefined,
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

/** The display size of a rendered diagram, from its viewBox (or width/height). */
export function svgSize(svg: string): { width: number; height: number } | null {
  const viewBox = /viewBox="[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/.exec(svg);
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  const w = /<svg[^>]*\swidth="([\d.]+)(?:px)?"/.exec(svg);
  const h = /<svg[^>]*\sheight="([\d.]+)(?:px)?"/.exec(svg);
  return w && h ? { width: Number(w[1]), height: Number(h[1]) } : null;
}

/**
 * Draws a Mermaid diagram as a PNG (for PDF and Word export), at twice its
 * size so it stays sharp when printed. Throws if the diagram has an error.
 */
export async function mermaidToPng(code: string): Promise<{ data: Uint8Array; width: number; height: number }> {
  const svg = await renderMermaid(code, false, { forImage: true });
  const size = svgSize(svg);
  if (!size || !size.width || !size.height) throw new Error("The diagram has no size");
  // An explicit size, so the image renders at its natural size rather than 100%.
  const sized = svg.replace(/<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/\s(?:width|height)="[^"]*"/g, "")
      .replace(/\sstyle="[^"]*"/, "")
      .replace(/^<svg/, `<svg width="${size.width}" height="${size.height}"`),
  );
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
  await img.decode();
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(size.width * scale);
  canvas.height = Math.ceil(size.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The diagram couldn't be converted to an image");
  return { data: new Uint8Array(await blob.arrayBuffer()), width: size.width, height: size.height };
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
