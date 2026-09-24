import type { ConversionResult } from "./docx";

/** PDF import is added in a later iteration. */
export async function pdfToMarkdown(_data: ArrayBuffer): Promise<ConversionResult> {
  throw new Error("PDF import is not available yet");
}
