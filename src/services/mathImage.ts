/**
 * Draws a LaTeX formula as a PNG, for PDF export: KaTeX renders it as MathML,
 * the browser engine lays it out inside an SVG <foreignObject>, and a canvas
 * turns that into pixels. Engines that refuse to read back a canvas holding
 * a foreignObject (WebKit on macOS) make this throw, and the caller keeps the
 * LaTeX text instead.
 */
const FONT_PX = 14; // about the size of PDF body text (10.5 pt)
const SCALE = 3; // pixels per CSS pixel, so formulas print sharply

export async function mathToPng(latex: string): Promise<{ data: Uint8Array; width: number; height: number }> {
  const katex = (await import("katex")).default;
  const html = katex.renderToString(latex, { output: "mathml", displayMode: true, throwOnError: true, strict: "ignore", trust: false });

  // Measure the formula as the engine lays it out.
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;left:-10000px;top:0;display:inline-block;padding:2px 4px;font-size:${FONT_PX}px;line-height:1.2;color:#1d2330;background:#fff`;
  probe.innerHTML = html;
  document.body.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  // Well-formed XHTML for the foreignObject.
  const xhtml = new XMLSerializer().serializeToString(probe);
  probe.remove();
  if (!width || !height) throw new Error("The formula has no size");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${xhtml.replace(/position:\s*fixed;\s*left:\s*-10000px;\s*top:\s*0px?;?/, "")}</foreignObject></svg>`;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // Throws a SecurityError where the engine taints canvases with foreignObject content.
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The formula couldn't be converted to an image");
  return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
}
