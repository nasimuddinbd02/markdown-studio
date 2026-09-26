import type { FootnoteDefinition, Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * GFM footnotes for the PDF and Word exporters. Notes are numbered in the
 * order they're first referenced (like GitHub and the preview); definitions
 * that are never referenced are left out.
 */
export interface Footnotes {
  /** Note number for a reference's identifier, or undefined if it has no definition. */
  number(identifier: string): number | undefined;
  /** Referenced notes in number order. */
  notes: Array<{ number: number; definition: FootnoteDefinition }>;
}

export function collectFootnotes(tree: Root): Footnotes {
  const definitions = new Map<string, FootnoteDefinition>();
  visit(tree, "footnoteDefinition", (node) => {
    const id = node.identifier.toLowerCase();
    if (!definitions.has(id)) definitions.set(id, node);
  });
  const numbers = new Map<string, number>();
  visit(tree, "footnoteReference", (node) => {
    const id = node.identifier.toLowerCase();
    if (definitions.has(id) && !numbers.has(id)) numbers.set(id, numbers.size + 1);
  });
  return {
    number: (identifier) => numbers.get(identifier.toLowerCase()),
    notes: [...numbers].map(([id, number]) => ({ number, definition: definitions.get(id)! })),
  };
}
