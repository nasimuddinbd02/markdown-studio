---
title: FAQ
description: Answers to common questions about Markdown Studio, covering supported systems, price, offline use, privacy, where documents are stored, Markdown features, bug reports and uninstalling.
---

# Frequently asked questions

## What is Markdown Studio?

A desktop Markdown editor for Windows, macOS and Linux. You edit `.md` files on your computer with a live preview, organize them in folders and tabs, and export them to PDF, Word or HTML. See [Features](/features).

## Which operating systems are supported?

- **Windows** 10 (version 1803 or later) and 11, 64-bit (x64).
- **macOS** 10.15 or later, on Apple Silicon and Intel Macs.
- **Linux** x86_64 distributions from 2022 or later, as an AppImage, `.deb` or `.rpm`.

ARM64 builds for Windows and Linux aren't available yet. See [Installation](/getting-started/installation).

## Is Markdown Studio free?

Yes. Markdown Studio is free to download and use, and there's no paid edition. The source code is public on [GitHub](https://github.com/nasimuddinbd02/markdown-studio); a license for reusing the code hasn't been published yet.

## Does it work offline?

Yes. Everything works without an internet connection. The only connections are the optional update check, downloading an update if you choose to, and web images or links in your documents. See [Privacy](/privacy#network-access).

## Where are my documents stored?

Wherever you save them. Markdown Studio edits files in place in your folders; there's no internal library or database. Its own settings, file history and recovery data are kept in your user profile (see [Configuration](/reference/configuration)).

## Does Markdown Studio upload my documents?

No. There's no cloud service, account or telemetry. Import and export run on your computer. See [Privacy](/privacy).

## Does it support GitHub Flavored Markdown?

Yes: tables, task lists, strikethrough, autolinks, fenced code with highlighting, footnotes and alerts, with GitHub-compatible heading anchors. See [GitHub Flavored Markdown](/markdown/gfm) for details and small differences.

## Does it support Mermaid?

Yes. Code blocks marked `mermaid` are drawn as diagrams in the preview and in every export (HTML, PDF, Word and Print). See [Mermaid](/markdown/mermaid).

## Does it support LaTeX?

Yes, LaTeX **math**: `$…$` inline and `$$…$$` for display, rendered with KaTeX. Full LaTeX documents aren't supported. See [Math / LaTeX](/markdown/math).

## Can I export to PDF or Word?

Yes: **Export as PDF**, **Export as Word (.docx)**, **Export as HTML** and **Print / Save as PDF**, for one document or a whole folder. See [Import & export](/guide/import-export#export), including which features each format keeps.

## Does it update itself?

On Windows, yes: it offers new versions at startup and installs them after checking their signature. On macOS and Linux, it tells you about new versions and opens the download page. See [Updates](/getting-started/installation#updating).

## Why does Windows or macOS warn me when installing?

The installers aren't code-signed with a commercial certificate yet (Windows) or notarized by Apple (macOS). The installation guides show how to continue: [Windows](/installation/windows#install), [macOS](/installation/macos#first-launch).

## How do I report a bug?

Open an issue on [GitHub](https://github.com/nasimuddinbd02/markdown-studio/issues/new). Include your version (**Help → About Markdown Studio**), your operating system, the steps to reproduce, and if relevant the log from **Help → Export Diagnostic Logs…** (it never contains your text). See [Troubleshooting](/troubleshooting/#report-an-issue).

## How do I request a feature?

Open an issue on [GitHub](https://github.com/nasimuddinbd02/markdown-studio/issues/new) describing what you'd like to do and why. Check the [roadmap](/roadmap) first; it may already be planned.

## How do I uninstall Markdown Studio?

- **Windows:** Settings → Apps → Installed apps → Markdown Studio → Uninstall.
- **macOS:** drag Markdown Studio from Applications to the Trash.
- **Linux:** `sudo apt remove markdown-studio` or `sudo dnf remove markdown-studio`, or delete the AppImage.

Your documents are never removed. To remove settings and history too, see [Configuration](/reference/configuration#reset-markdown-studio).
