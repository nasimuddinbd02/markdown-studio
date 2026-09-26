---
title: Import & Export Problems
description: Fix Markdown Studio import and export problems, including scanned PDFs, lost layout, PDF characters the built-in font can't show, and missing diagrams, math or footnotes in PDF and Word.
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

## Diagrams, formulas or footnotes are missing in PDF or Word

**Problem:** a PDF or Word export shows Mermaid diagrams as code and formulas as LaTeX text, and footnotes are missing (PDF) or appear as plain paragraphs at the end (Word).

**Possible cause:** the PDF and Word exporters don't render diagrams, math or footnotes yet.

**Solution:** use **File → Print / Save as PDF…** for a PDF, or **Export as HTML**. Both keep diagrams, math and footnotes exactly as in the preview.

## "Files larger than 100 MB can't be imported"

**Solution:** split the source document, or reduce its size (for example, by compressing images in Word), then import it again.

## Export Folder says the folder has one file or none

**Problem:** **Combine Folder** or **Export Folder** reports *"This folder has only one Markdown file"* or *"No Markdown files found in this folder"*.

**Solution:** these commands need at least two Markdown files in the open folder. For a single file, use **Export as PDF** or **Export as Word**.

## Report an issue

If a document converts badly and you can share it (or a similar one), [report it on GitHub](https://github.com/nasimuddinbd02/markdown-studio/issues/new). Samples help us improve the converters.
