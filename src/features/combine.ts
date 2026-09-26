import GithubSlugger from "github-slugger";
import { basename, isInside, isMarkdownPath, join, relativePath, resolveRelative } from "../services/paths";
import { backend } from "../services";
import { describeError } from "../services/errors";
import { isDirty, useDocuments } from "../stores/documentsStore";
import { useSettings } from "../stores/settingsStore";
import { ask, notify } from "../stores/uiStore";
import { useWorkspace } from "../stores/workspaceStore";
import { openPath } from "./documents";
import { extractHeadings } from "./outline";
import { defaultLineEnding } from "./saveTransforms";
import { refreshDir } from "./workspace";
import { findLinks } from "./lint";
import { buildToc } from "./toc";

export interface CombineSource {
  path: string;
  content: string;
}

export interface CombineOptions {
  /** Folder the combined file is written to; relative links are re-based onto it. */
  outDir: string;
  /** Title of the combined document (an H1 at the top). */
  title: string;
  /** Adds a linked table of contents after the title. */
  toc?: boolean;
}

const FRONT_MATTER = /^---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;
const TOC_BLOCK = /<!-- toc -->[\s\S]*?<!-- tocstop -->\n*/g;
const REF_DEF = /^( {0,3}\[[^\]\n]+\]:[ \t]*)(<[^>\n]*>|\S+)/gm;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const INDEX_NAMES = /^(readme|index)\.(md|markdown)$/i;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * Reading order for a folder of documents: depth-first by folder, with each
 * folder's README/index first and the rest in natural order ("2-x" before "10-x").
 */
export function combineOrder(paths: string[], root: string): string[] {
  const key = (p: string) => (relativePath(root, p) ?? p).split("/");
  return [...paths].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
      const lastA = i === ka.length - 1;
      const lastB = i === kb.length - 1;
      if (ka[i] === kb[i] && !lastA && !lastB) continue;
      // Files in a folder come before its subfolders.
      if (lastA !== lastB) return lastA ? -1 : 1;
      if (lastA && lastB) {
        const ia = INDEX_NAMES.test(ka[i]);
        const ib = INDEX_NAMES.test(kb[i]);
        if (ia !== ib) return ia ? -1 : 1;
      }
      const c = collator.compare(ka[i], kb[i]);
      if (c) return c;
    }
    return ka.length - kb.length;
  });
}

/** "02-getting_started.md" → "Getting started" */
export function titleFromFileName(path: string): string {
  const stem = basename(path).replace(/\.[^.]+$/, "").replace(/^\d+[-_. ]+/, "").replace(/[-_]+/g, " ").trim();
  return stem ? stem[0].toUpperCase() + stem.slice(1) : basename(path);
}

const normKey = (p: string) => p.replace(/\\/g, "/").toLowerCase();

function splitTarget(target: string) {
  const i = target.indexOf("#");
  return i < 0 ? { file: target, fragment: "" } : { file: target.slice(0, i), fragment: target.slice(i + 1) };
}

function decodeFragment(f: string) {
  try {
    return decodeURIComponent(f);
  } catch {
    return f;
  }
}

/** Encodes a re-based path for a Markdown link destination. */
function linkPath(rel: string) {
  const encoded = encodeURI(rel);
  return /[()]/.test(encoded) ? `<${rel}>` : encoded;
}

/**
 * Merges several Markdown documents into one: front matter and old TOC blocks
 * are dropped, each file starts with a heading (its file name if it has none),
 * links between the files become in-document `#anchors` (renamed where heading
 * ids collide), and other relative links and images are re-based onto
 * `outDir` so they still resolve.
 */
export function combineDocuments(sources: CombineSource[], opts: CombineOptions): string {
  // 1. Normalize each part so its heading list is final.
  const parts = sources.map((s) => {
    let text = s.content.replace(/\r\n?/g, "\n").replace(FRONT_MATTER, "").replace(TOC_BLOCK, "").trim();
    const first = extractHeadings(text)[0];
    const firstContentLine = text.split("\n").findIndex((l) => l.trim()) + 1;
    if (!first || first.line !== firstContentLine) text = `# ${titleFromFileName(s.path)}\n\n${text}`;
    return { path: s.path, text };
  });

  // 2. Heading ids in the combined document (one slugger across all parts, as
  //    the preview assigns them), mapped from each part's own ids.
  const global = new GithubSlugger();
  global.slug(opts.title);
  const ids = new Map<string, { first: string; map: Map<string, string> }>();
  for (const part of parts) {
    const local = new GithubSlugger();
    const map = new Map<string, string>();
    let first = "";
    for (const h of extractHeadings(part.text)) {
      const own = local.slug(h.text);
      const combined = global.slug(h.text);
      if (!map.has(own)) map.set(own, combined);
      first ||= combined;
    }
    ids.set(normKey(part.path), { first, map });
  }

  // 3. Rewrite link targets.
  const rewrite = (target: string, from: string): string => {
    if (!target || URL_SCHEME.test(target) && !/^[a-zA-Z]:[\\/]/.test(target)) return target;
    const { file, fragment } = splitTarget(target);
    const self = ids.get(normKey(from))!;
    if (!file) return `#${self.map.get(decodeFragment(fragment)) ?? fragment}`;
    const resolved = resolveRelative(from, file);
    if (!resolved) return target;
    const other = isMarkdownPath(resolved) ? ids.get(normKey(resolved)) : undefined;
    if (other) return `#${fragment ? other.map.get(decodeFragment(fragment)) ?? fragment : other.first}`;
    const rel = relativePath(opts.outDir, resolved);
    if (rel === null) return target;
    return linkPath(rel) + (fragment ? `#${fragment}` : "");
  };

  const bodies = parts.map((part) => {
    let text = part.text;
    const edits: { from: number; to: number; insert: string }[] = [];
    for (const link of findLinks(text)) {
      const next = rewrite(link.target, part.path);
      if (next === link.target) continue;
      const raw = text.slice(link.from, link.to);
      // The destination is the first "(...)" after the link text.
      const open = raw.indexOf("](") + 2;
      const inner = raw.slice(open);
      const lead = inner.length - inner.trimStart().length;
      const destLen = inner.trimStart().startsWith("<") ? inner.indexOf(">") + 1 - lead : link.target.length;
      const at = link.from + open + lead;
      edits.push({ from: at, to: at + destLen, insert: next });
    }
    for (const e of edits.sort((a, b) => b.from - a.from)) text = text.slice(0, e.from) + e.insert + text.slice(e.to);
    return text.replace(REF_DEF, (_m, head: string, dest: string) => {
      const plain = dest.startsWith("<") ? dest.slice(1, -1) : dest;
      return head + rewrite(plain, part.path);
    });
  });

  const body = bodies.map(demoteHeadings).join("\n\n---\n\n");
  const header = `# ${opts.title}`;
  const toc = opts.toc ? `${buildToc(`${header}\n\n${body}`)}\n\n` : "";
  return `${header}\n\n${toc}${body}\n`;
}

/**
 * Moves every heading one level down (H1 → H2, …; H6 stays) so the combined
 * title is the only H1. Setext headings become ATX headings.
 */
export function demoteHeadings(text: string): string {
  const lines = text.split("\n");
  for (const h of extractHeadings(text).reverse()) {
    const i = h.line - 1;
    const line = lines[i];
    if (/^ {0,3}#/.test(line)) {
      if (h.level < 6) lines[i] = line.replace(/^( {0,3})#/, "$1##");
    } else {
      lines.splice(i, 2, `${"#".repeat(Math.min(h.level + 1, 6))} ${line.trim()}`);
    }
  }
  return lines.join("\n");
}

/** Where the combined file for a folder goes: `<folder>/<Folder name> (combined).md`. */
export function combinedPathFor(root: string): string {
  return join(root, `${basename(root)} (combined).md`);
}

/** The Markdown files that take part (everything but a previous combined file). */
export function combineInputs(files: string[], root: string): string[] {
  const out = normKey(combinedPathFor(root));
  return combineOrder(
    files.filter((p) => isMarkdownPath(p) && isInside(p, root) && normKey(p) !== out),
    root,
  );
}

/** The open folder's Markdown files, combined in memory; null (after telling the user) if there is nothing to combine. */
export async function readCombinableFolder(): Promise<{ root: string; files: string[]; inputs: string[] } | null> {
  const root = useWorkspace.getState().root;
  if (!root) {
    notify("info", "Open a folder first to combine its documents.");
    return null;
  }
  const files = await backend().listWorkspaceFiles(root);
  const inputs = combineInputs(files, root);
  if (inputs.length < 2) {
    notify("info", inputs.length ? "This folder has only one Markdown file." : "No Markdown files found in this folder.");
    return null;
  }
  return { root, files, inputs };
}

/** Reads the inputs (unsaved edits in open tabs included, as shown in the editor) and combines them. */
export async function combineFolderText(root: string, inputs: string[]): Promise<{ markdown: string; count: number; unreadable: string[] }> {
  const b = backend();
  const open = new Map(useDocuments.getState().docs.filter((d) => d.path).map((d) => [normKey(d.path!), d.content]));
  const sources: CombineSource[] = [];
  const unreadable: string[] = [];
  for (const path of inputs) {
    const content = open.get(normKey(path)) ?? (await b.readTextFile(path).then((f) => f.content, () => null));
    if (content === null) unreadable.push(basename(path));
    else sources.push({ path, content });
  }
  return { markdown: combineDocuments(sources, { outDir: root, title: basename(root), toc: true }), count: sources.length, unreadable };
}

/**
 * Command: merges every Markdown file in the open folder into
 * `<Folder> (combined).md` (replacing an earlier one) and opens it, ready to
 * export as a single PDF or Word document.
 */
export async function combineWorkspace(): Promise<string | null> {
  const folder = await readCombinableFolder();
  if (!folder) return null;
  const { root, files, inputs } = folder;
  const b = backend();
  const dest = combinedPathFor(root);
  const openCombined = useDocuments.getState().docs.find((d) => d.path && normKey(d.path) === normKey(dest));
  if (openCombined && isDirty(openCombined)) {
    notify("warning", `“${basename(dest)}” has unsaved changes. Save or close it before combining again.`);
    return null;
  }
  const replacing = files.some((p) => normKey(p) === normKey(dest));
  const choice = await ask({
    title: "Combine folder into one document",
    message: `Combine ${inputs.length} Markdown files into “${basename(dest)}”?`,
    detail:
      "Files are joined in folder order (README/index first) with a table of contents; links between them become links within the document. " +
      (replacing ? "The existing combined file will be replaced. " : "") +
      "The originals are not changed. Export the result as PDF or Word to share it as one file.",
    buttons: [
      { id: "cancel", label: "Cancel" },
      { id: "combine", label: replacing ? "Replace" : "Combine", variant: "primary" },
    ],
    cancelId: "cancel",
  });
  if (choice !== "combine") return null;

  const { markdown, count, unreadable } = await combineFolderText(root, inputs);
  try {
    await b.writeTextFile({
      path: dest,
      content: markdown,
      lineEnding: defaultLineEnding(useSettings.getState().settings.newFileLineEnding),
      bom: false,
      expectedMtime: null,
      force: true,
    });
  } catch (e) {
    notify("error", describeError(e, `save “${basename(dest)}”`));
    return null;
  }
  // A tab showing an earlier combined file would now be stale: reopen it.
  if (openCombined) useDocuments.getState().remove(openCombined.id);
  await refreshDir(root);
  await openPath(dest);
  const summary = `Combined ${count} files into “${basename(dest)}”.`;
  if (unreadable.length) notify("warning", `${summary} Skipped ${unreadable.length} that could not be read (${unreadable.slice(0, 3).join(", ")}).`);
  else notify("success", summary);
  return dest;
}
