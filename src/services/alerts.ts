/**
 * GitHub-style alerts (callouts):
 *
 *   > [!NOTE]
 *   > Useful information.
 *
 * Kinds: NOTE, TIP, IMPORTANT, WARNING, CAUTION. Anything else stays a
 * normal block quote.
 */
export const ALERT_KINDS = {
  note: { label: "Note", color: "0969DA" },
  tip: { label: "Tip", color: "1A7F37" },
  important: { label: "Important", color: "8250DF" },
  warning: { label: "Warning", color: "9A6700" },
  caution: { label: "Caution", color: "D1242F" },
} as const;

export type AlertKind = keyof typeof ALERT_KINDS;

const MARKER = /^\s*\[!(note|tip|important|warning|caution)\][ \t]*(?:\r?\n|$)/i;

/** Returns the alert kind and the text with the marker removed, if `text` starts with one. */
export function matchAlertMarker(text: string): { kind: AlertKind; rest: string } | null {
  const m = MARKER.exec(text);
  return m ? { kind: m[1].toLowerCase() as AlertKind, rest: text.slice(m[0].length) } : null;
}

// ---------------------------------------------------------------- preview / HTML (hast)

interface HNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
}

const isWhitespaceText = (n: HNode) => n.type === "text" && !/\S/.test(n.value ?? "");

function transform(node: HNode) {
  for (const child of node.children ?? []) {
    transform(child);
    if (child.type !== "element" || child.tagName !== "blockquote") continue;
    const first = child.children?.find((c) => !isWhitespaceText(c));
    if (first?.type !== "element" || first.tagName !== "p") continue;
    const text = first.children?.[0];
    if (text?.type !== "text") continue;
    const match = matchAlertMarker(text.value ?? "");
    if (!match) continue;

    text.value = match.rest;
    // Drop what's left of the marker line: an empty text node and/or a <br>.
    const kids = first.children!;
    while (kids.length && (isWhitespaceText(kids[0]) || (kids[0].type === "element" && kids[0].tagName === "br"))) kids.shift();
    if (!kids.length) child.children = child.children!.filter((c) => c !== first);

    const { label } = ALERT_KINDS[match.kind];
    child.tagName = "div";
    child.properties = { ...child.properties, className: ["markdown-alert", `markdown-alert-${match.kind}`] };
    child.children = [
      { type: "text", value: "\n" },
      { type: "element", tagName: "p", properties: { className: ["markdown-alert-title"] }, children: [{ type: "text", value: label }] },
      ...(child.children ?? []),
    ];
  }
}

/**
 * Rehype plugin: turns alert block quotes into `div.markdown-alert`. It runs
 * after sanitizing and only adds fixed class names and a fixed label, so it
 * can't introduce unsafe markup.
 */
export function rehypeAlerts() {
  return (tree: HNode) => transform(tree);
}

// ---------------------------------------------------------------- PDF / Word (mdast)

interface MNode {
  type: string;
  value?: string;
  children?: MNode[];
}

/**
 * If an mdast blockquote is an alert, removes the marker from it (in place)
 * and returns its kind; otherwise returns null.
 */
export function takeMdastAlert(blockquote: MNode): AlertKind | null {
  const para = blockquote.children?.[0];
  if (para?.type !== "paragraph") return null;
  const text = para.children?.[0];
  if (text?.type !== "text") return null;
  const match = matchAlertMarker(text.value ?? "");
  if (!match) return null;
  text.value = match.rest;
  if (!text.value) para.children!.shift();
  if (para.children![0]?.type === "break") para.children!.shift();
  if (!para.children!.length) blockquote.children!.shift();
  return match.kind;
}
