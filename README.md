# Markdown Studio

A fast, local-first, privacy-conscious Markdown editor for Windows, macOS and Linux, built with **Tauri 2**, **React + TypeScript**, **CodeMirror 6** and the **remark/rehype** ecosystem.

The requirements are in [docs/SRS.md](docs/SRS.md), and implementation status per requirement is in [docs/TRACEABILITY.md](docs/TRACEABILITY.md).

## Features (v0.1 MVP)

- Create, open, edit, save and Save As Markdown files (`.md`, `.markdown`) with native dialogs
- Opens files from the OS: double-click / "Open with" (file association), drag and drop onto the window, and single-instance hand-off
- Workspace folders with a file explorer: new file/folder, rename (F2), delete to the Trash/Recycle Bin
- Tabs with dirty indicators, and Save / Don't Save / Cancel prompts on close and on quit
- Format menu and shortcuts: bold (Ctrl/Cmd+B), italic (I), link (K), inline code (E), strikethrough, headings (Ctrl/Cmd+Alt+1–3), lists, task lists, quotes, code blocks and tables
- CodeMirror 6 editor with Markdown syntax highlighting, code-block languages, undo/redo, multi-cursor, find & replace (case-sensitive, regex, whole word) and go to line
- Export to standalone HTML (styled, images inlined, sanitized), Copy as HTML, and Print / Save as PDF (Ctrl/Cmd+P)
- Command palette (Ctrl/Cmd+Shift+P), document outline, and Find in Files across the workspace (Ctrl/Cmd+Shift+F; match case, whole word, regex)
- Mermaid diagrams (lazy-loaded, strict security mode) and LaTeX math (`$…$`, `$$…$$`, rendered as MathML) in the preview and exports
- Live GitHub Flavored Markdown preview (tables, task lists, strikethrough, autolinks, fenced code with highlighting) with a configurable debounce
- Editor-only, split and preview-only views, resizable panels and synced scrolling
- Light, dark and system themes; configurable font, font size, line numbers, wrapping and tab size
- Optional auto save (after a delay, or on tab/window focus change) that never overwrites external changes
- Save options: trim trailing whitespace (keeps Markdown hard breaks and code blocks), final newline, default line ending for new files
- Large-document mode: live preview pauses above 1 MB of text, with render-on-demand
- Safe saves: atomic temp-file writes, conflict detection when a file changed on disk, and actionable errors (permission denied → Save As, disk full, and so on)
- External change detection: clean tabs reload automatically; dirty tabs get Reload / Compare / Keep Mine
- Crash recovery for unsaved documents, and session restore for the last folder and open files
- UTF-8 (with or without BOM), with LF/CRLF line endings preserved per file
- Keyboard-first: every core action has a shortcut and an accessible menu, with visible focus states

## Security model

- The frontend has **no direct filesystem, dialog or shell permissions** ([capabilities/default.json](src-tauri/capabilities/default.json)). Every native operation goes through validated Rust commands ([src-tauri/src/commands.rs](src-tauri/src/commands.rs)).
- A path is accessible only after the user selects it in a native dialog, or re-opens it from the backend-owned recent list. Relative paths and `..` traversal are rejected, and symlinks are resolved before the scope check ([scope.rs](src-tauri/src/scope.rs)).
- The preview parses raw HTML and then sanitizes it with GitHub's allow-list. Scripts, event handlers, iframes, forms, styles and `javascript:` URLs are removed. A strict CSP forbids inline scripts.
- Links open in the system browser, and only `http`, `https` and `mailto` links are allowed.
- Logs record the operation and error category, never document content; the home directory is redacted.

## Development

Prerequisites: **Node.js 20+**, **Rust (stable)** and the [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/) for your OS: Microsoft C++ Build Tools and WebView2 on Windows, Xcode Command Line Tools on macOS, and `libwebkit2gtk-4.1-dev` and friends on Linux.

```bash
npm install
```

```bash
npm run tauri:dev
```

That runs the desktop app with hot reload. Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | UI only, in a browser, using an in-memory demo workspace (no Rust needed) |
| `npm test` | Frontend unit/component tests (Vitest + Testing Library) |
| `npm run typecheck` | TypeScript type check |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rust tests (scope, safe save, encoding, settings) |
| `npm run tauri:build` | Builds installers for the current OS |

### Browser demo mode

When it runs outside Tauri, the app uses [`MemoryBackend`](src/services/memoryBackend.ts). This is an in-memory filesystem that enforces the same scope and conflict rules, is seeded with sample documents, and persists to `localStorage`. It makes UI work and tests possible without the native shell.

## Project structure

```text
src/
  components/   UI: MenuBar, FileExplorer, TabBar, Editor, Preview, StatusBar, dialogs
  features/     Behaviour: document/workspace actions, commands & shortcuts, lifecycle
  services/     Backend abstraction (Tauri + in-memory), Markdown pipeline, paths, errors
  stores/       Zustand stores: documents, workspace, settings, UI
  styles/       App and preview CSS (theme tokens)
  types/        Shared types
src-tauri/
  src/          Rust: commands, scope, safe file ops, text encoding, settings/recovery/logs
  capabilities/ Least-privilege permission set
tests/          Vitest tests
docs/           SRS and requirement traceability
```

## Packaging and releases

`npm run tauri:build` produces:

- **Windows**: `.msi` and NSIS `.exe` installers
- **macOS**: `.app` and `.dmg`
- **Linux**: `.AppImage`, `.deb` and `.rpm`

Pushing a tag like `v0.1.0` runs [.github/workflows/release.yml](.github/workflows/release.yml), which builds every platform (including both macOS architectures) and creates a draft GitHub Release. Code signing and notarization secrets are documented inline in the workflow.

Settings, recovery data and logs live in the platform's application-data folders, under the identifier `com.markdownstudio.app`.
