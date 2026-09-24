import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
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
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https", "data"],
  },
};

export const remarkPlugins: Options["remarkPlugins"] = [remarkGfm];
export const rehypePlugins: Options["rehypePlugins"] = [
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
  [rehypeHighlight, { detect: false }],
  rehypeSlug,
];

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

export function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu);
  return m ? m.length : 0;
}
