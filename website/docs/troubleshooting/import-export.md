---
title: Import & Export Problems
description: Fix Markdown Studio import and export problems, including scanned PDFs, lost layout, PDF characters the built-in font can't show, and formulas or diagrams shown as code in PDF and Word.
---

# Import & export

## A PDF import is empty

**Problem:** importing a PDF gives an empty document and a message that the PDF has no selectable text.

**Possible cause:** the PDF is a scan, made of images of pages rather than text. Text recognition (OCR) isn't supported.

**Solution:** run the PDF through an OCR tool first, so it has selectable text (you can check by trying to select text in a PDF viewer), then import it again.

## Imported text has the wrong structure

**Problem:** headings, lists or tables from a PDF come out as plain paragraphs.

**Possible cause:** PDFs store positioned text, not structure. Markdown Studio infers headings from font size and lists from bullets or numbers, which doesn't always match the original.

**Solution:** fix the structure in the editor, for example with **Ctrl+Alt+1**–**3** for headings and **Ctrl+Shift+8** for lists. If you have the original Word file, import that instead: `.docx` keeps headings, lists and tables reliably.

## "Some characters need a different PDF method"

**Problem:** exporting to PDF warns that the document contains characters the built-in PDF font can't display.

**Possible cause:** **Export as PDF** uses a built-in font covering Latin, Greek and Cyrillic scripts. Chinese, Japanese, Korean, Arabic, emoji and some symbols aren't in it.

**Solution:** choose **Use Print → Save as PDF**, which uses your system fonts, or export as Word or HTML.

## Formulas appear as LaTeX text in PDF or Word

**Problem:** a PDF or Word export shows formulas as their LaTeX source.

**Possible cause:** the PDF and Word exporters don't render math yet.

**Solution:** use **File → Print / Save as PDF…** for a PDF, or **Export as HTML**. Both render formulas exactly as in the preview.

## A diagram appears as code in PDF or Word

**Possible causes:**

- The diagram has a syntax error. The preview shows **Diagram error:** too; fix the diagram (see [Mermaid](/markdown/mermaid#troubleshooting)).
- **Settings → Preview → Render Mermaid diagrams** is off, so all exports keep the code.
- The version is older than 0.12.0, which exported diagrams as code. Update Markdown Studio.

## "Files larger than 100 MB can't be imported"

**Solution:** split the source document, or reduce its size (for example, by compressing images in Word), then import it again.

## Export Folder says the folder has one file or none

**Problem:** **Combine Folder** or **Export Folder** reports *"This folder has only one Markdown file"* or *"No Markdown files found in this folder"*.

**Solution:** these commands need at least two Markdown files in the open folder. For a single file, use **Export as PDF** or **Export as Word**.

## Report an issue

If a document converts badly and you can share it (or a similar one), [report it on GitHub](https://github.com/nasimuddin-dev/markdown-studio/issues/new). Samples help us improve the converters.
