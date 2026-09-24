/** Lightweight text statistics (kept out of the Markdown pipeline bundle). */
const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu;

export function countWords(text: string): number {
  const m = text.match(WORD);
  return m ? m.length : 0;
}

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  lines: number;
  paragraphs: number;
  /** Estimated minutes at 230 words per minute (at least 1 for non-empty text). */
  readingMinutes: number;
}

export function textStats(text: string): TextStats {
  const words = countWords(text);
  const chars = [...text];
  return {
    words,
    characters: chars.length,
    charactersNoSpaces: chars.filter((c) => !/\s/.test(c)).length,
    lines: text === "" ? 0 : text.split("\n").length,
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim()).length,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / 230)),
  };
}
