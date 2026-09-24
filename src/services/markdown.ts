import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Options } from "react-markdown";

/**
 * Preview security policy (FR-034, SEC-004):
 * raw HTML in documents is parsed, then sanitized with GitHub's allow-list
 * (rehype-sanitize's default schema). Scripts, event handlers, iframes, forms,
 * styles and `javascript:` URLs are removed. Syntax highlighting and heading
 * ids are added *after* sanitizing so they are not stripped.
 */
export const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Keep the classes remark-math uses to mark formulas.
    code: [["className", /^language-./, "math-inline", "math-display"]],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https", "data"],
  },
};

export interface MarkdownFeatures {
  /** `$inline$` and `$$display$$` LaTeX math, rendered as MathML. */
  math: boolean;
}

/**
 * The Markdown pipeline shared by the preview and exports. Math is rendered
 * by KaTeX to native MathML (no fonts or stylesheets needed) *after*
 * sanitizing, so it cannot be used to smuggle in unsafe markup.
 */
export function markdownPlugins(features: MarkdownFeatures = { math: true }) {
  const remarkPlugins: NonNullable<Options["remarkPlugins"]> = [remarkGfm];
  const rehypePlugins: NonNullable<Options["rehypePlugins"]> = [rehypeRaw, [rehypeSanitize, sanitizeSchema]];
  if (features.math) {
    remarkPlugins.push([remarkMath, { singleDollarTextMath: true }]);
    rehypePlugins.push([rehypeKatex, { output: "mathml", throwOnError: false, strict: "ignore", trust: false }]);
  }
  rehypePlugins.push([rehypeHighlight, { detect: false, plainText: ["mermaid", "math"] }], rehypeSlug);
  return { remarkPlugins, rehypePlugins };
}

const defaults = markdownPlugins();
export const remarkPlugins = defaults.remarkPlugins;
export const rehypePlugins = defaults.rehypePlugins;

/** How a link clicked in the preview should be handled. */
export type LinkTarget =
  | { type: "anchor"; id: string }
  | { type: "external"; url: string }
  | { type: "document"; href: string }
  | { type: "blocked" };

export function classifyLink(href: string | undefined | null): LinkTarget {
  if (!href) return { type: "blocked" };
  const h = href.trim();
  if (h.startsWith("#")) return { type: "anchor", id: decodeURIComponent(h.slice(1)) };
  if (/^(https?:|mailto:)/i.test(h)) return { type: "external", url: h };
  // Any other scheme (javascript:, file:, data:, custom) is refused.
  if (/^[a-z][a-z0-9+.-]*:/i.test(h) && !/^[a-zA-Z]:[\\/]/.test(h)) return { type: "blocked" };
  return { type: "document", href: h };
}

export { countWords } from "./textStats";
