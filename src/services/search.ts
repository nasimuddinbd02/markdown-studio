import { AppError } from "./errors";
import type { SearchMatch, SearchOptions } from "../types";

const PREVIEW_CONTEXT = 60;

/** Mirrors the native search semantics (src-tauri/src/search.rs). */
export function buildSearchRegex(opts: SearchOptions): RegExp {
  if (!opts.query) throw new AppError("invalidPath", "Search query is empty");
  let source = opts.regex ? opts.query : opts.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (opts.wholeWord) source = `\\b(?:${source})\\b`;
  try {
    return new RegExp(source, opts.caseSensitive ? "gu" : "giu");
  } catch (e) {
    throw new AppError("invalidPath", `Invalid regular expression: ${(e as Error).message}`);
  }
}

export function searchText(text: string, re: RegExp, limit: number): SearchMatch[] {
  const out: SearchMatch[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    re.lastIndex = 0;
    for (const m of line.matchAll(re)) {
      if (!m[0]) continue;
      const col = m.index!;
      const start = Math.max(0, col - PREVIEW_CONTEXT);
      const end = Math.min(line.length, col + m[0].length + PREVIEW_CONTEXT * 2);
      const lead = start > 0 ? "…" : "";
      out.push({
        line: i + 1,
        column: col,
        length: m[0].length,
        preview: lead + line.slice(start, end) + (end < line.length ? "…" : ""),
        previewStart: lead.length + col - start,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
