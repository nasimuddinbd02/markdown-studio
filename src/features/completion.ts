import { autocompletion, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import GithubSlugger from "github-slugger";
import { backend } from "../services";
import { basename, dirname, isMarkdownPath, relativePath } from "../services/paths";
import { activeDoc } from "../stores/documentsStore";
import { useWorkspace } from "../stores/workspaceStore";
import { extractHeadings } from "./outline";

const CACHE_MS = 10_000;
let cache: { root: string; at: number; files: Promise<string[]> } | null = null;

/** Workspace file list for completion, cached briefly. */
export function workspaceFiles(root: string): Promise<string[]> {
  if (!cache || cache.root !== root || Date.now() - cache.at > CACHE_MS) {
    cache = { root, at: Date.now(), files: backend().listWorkspaceFiles(root).catch(() => []) };
  }
  return cache.files;
}

export function invalidateWorkspaceFiles() {
  cache = null;
}

/** `#anchor` completions for the headings of the current document. */
export function headingCompletions(text: string): Completion[] {
  const slugger = new GithubSlugger();
  return extractHeadings(text).map((h) => ({
    label: "#" + slugger.slug(h.text),
    detail: `${"#".repeat(h.level)} ${h.text}`,
    type: "constant",
  }));
}

/** File completions relative to the document's folder. */
export function fileCompletions(files: string[], docPath: string, images: boolean): Completion[] {
  const dir = dirname(docPath);
  const out: Completion[] = [];
  for (const f of files) {
    if (f === docPath) continue;
    const isMd = isMarkdownPath(f);
    if (images ? isMd : !isMd) continue;
    const rel = relativePath(dir, f);
    if (rel === null) continue;
    out.push({
      label: encodeURI(rel),
      detail: basename(f),
      type: images ? "variable" : "text",
      // Closer files first.
      boost: -rel.split("/").length,
    });
  }
  return out;
}

/** Completes link destinations after `](`: headings for `#`, otherwise workspace files. */
export async function linkCompletionSource(ctx: CompletionContext): Promise<CompletionResult | null> {
  const m = ctx.matchBefore(/!?\[[^\]\n]*\]\([^)\s]*/);
  if (!m) return null;
  const at = m.text.indexOf("](") + 2;
  const from = m.from + at;
  const typed = m.text.slice(at);
  const image = m.text.startsWith("!");

  if (typed.startsWith("#")) {
    return { from, options: headingCompletions(ctx.state.doc.toString()), validFor: /^#[^)\s]*$/ };
  }
  const doc = activeDoc();
  const root = useWorkspace.getState().root;
  if (!doc?.path || !root) return null;
  const files = await workspaceFiles(root);
  if (ctx.aborted) return null;
  const options = fileCompletions(files, doc.path, image);
  return options.length ? { from, options, validFor: /^[^)\s#]*$/ } : null;
}

export function linkCompletion(): Extension {
  return autocompletion({ override: [linkCompletionSource], icons: false, activateOnTyping: true });
}
