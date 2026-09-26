---
title: Search & Replace
description: Find and replace text in a Markdown document, with match case, whole word and regular expressions, and search every Markdown file in a folder with Find in Files.
---

# Search & replace

## Find in the document

Press **Ctrl+F** (**Cmd+F** on macOS) to open the search bar at the top of the editor. Matches are highlighted, and **Enter** / **Shift+Enter** move to the next or previous one.

The search bar has three options:

- **match case**: `Readme` doesn't match `README`.
- **by word**: finds whole words only.
- **regexp**: treats the search as a regular expression, for example `^## ` for level-2 headings or `\bTODO\b`.

Press **Esc** to close it.

## Replace

Press **Ctrl+H** (**Cmd+Option+F** on macOS) to open the search bar with the replace field. **replace** replaces the current match, and **replace all** replaces every match. With **regexp** on, the replacement can use groups such as `$1`. A replacement can be undone with **Ctrl+Z**.

## Go to line

**Ctrl+G** jumps to a line number.

## Find in Files

**Find in Files** (**Ctrl+Shift+F**, or the **Search** tab in the sidebar) searches every Markdown file in the open folder.

- Options: **Match case**, **Match whole word** and **Use regular expression**.
- Results are grouped by file, with the matching lines.
- Click a result to open the file with the match selected.
- Unsaved changes in open tabs are not searched; the search reads the files on disk.

Find in Files needs an open folder. Replacing across files isn't available; open the file and use **Replace**.

## Command palette

To find a **command** rather than text, open the command palette with **Ctrl+Shift+P** or **F1** and type part of its name, for example "table" or "export".
