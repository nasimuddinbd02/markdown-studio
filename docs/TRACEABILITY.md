# Requirements Traceability

Status of each [SRS](SRS.md) requirement. **Done** means implemented and tested (automated or manual). **Partial** means some of it is implemented and the gap is noted. **Planned** means it's scheduled for the release named in the SRS.

## Functional requirements

| ID | Status | Implementation / notes |
| --- | --- | --- |
| FR-001 | Done | Tauri 2 native shell ([src-tauri/src/lib.rs](../src-tauri/src/lib.rs)) |
| FR-002 | Done | Startup time is logged (`app.ready`); UI renders before async restore |
| FR-003 | Done | `tauri-plugin-window-state` (size/position), theme and settings, panel sizes, last session |
| FR-004 | Done | Dirty documents snapshotted every 5 s to app-data `recovery/session.json`; restore offered on the next launch ([lifecycle.ts](../src/features/lifecycle.ts)) |
| FR-010 | Done | Native Open dialog through Rust (`pick_open_file`) |
| FR-011 | Done | Native folder dialog (`pick_open_folder`) |
| FR-012 | Done | Lazy tree of folders and `.md`/`.markdown` files; hidden and dependency folders skipped |
| FR-013 | Done | New File (Ctrl/Cmd+N), New File in Folder |
| FR-014 | Done | Save (Ctrl/Cmd+S), atomic write |
| FR-015 | Done | Save As (Ctrl/Cmd+Shift+S) |
| FR-016 | Done | Rename from context menu or F2; open tabs follow the rename |
| FR-017 | Done | Delete with confirmation; moves to the OS Trash (`trash` crate) |
| FR-018 | Done | mtime conflict check on save, plus polling and focus checks with Reload / Compare / Keep Mine |
| FR-020 | Done | CodeMirror Markdown language with nested code-block languages |
| FR-021 | Done | Per-tab undo history (state preserved across tab switches) |
| FR-022 | Done | CodeMirror default keymap and native clipboard |
| FR-023 | Done | Ln/Col in the status bar; Go to Line (Ctrl/Cmd+G) |
| FR-024 | Done | Tab dot and "(unsaved)" label, window title marker, status bar text |
| FR-025 | Done | Font size, font family, line numbers, wrapping, tab size |
| FR-026 | Done | UTF-8 with BOM preservation; invalid UTF-8 refused rather than corrupted |
| FR-030 | Done | react-markdown preview |
| FR-031 | Done | Debounce 0–1000 ms (Settings) |
| FR-032 | Done | remark-gfm |
| FR-033 | Done | rehype-highlight (highlight.js common languages) |
| FR-034 | Done | rehype-raw followed by rehype-sanitize (GitHub schema), plus CSP |
| FR-035 | Done | Editor / Split / Preview (Ctrl/Cmd+1/2/3, Ctrl/Cmd+\\) |
| FR-040 | Done | Tabs with drag reordering |
| FR-041 | Done | Accent bar, bold label, `aria-selected` |
| FR-042 | Done | Save / Don't Save / Cancel on tab close and window close |
| FR-043 | Done | Ctrl+Tab / Ctrl+Shift+Tab, arrow keys in the tab list |
| FR-044 | Done | Backend-owned recent files and folders (File menu, Welcome screen) |
| FR-050 | Done | CodeMirror search panel |
| FR-051 | Done | Replace / Replace All (Ctrl+H, or Cmd+Alt+F on macOS) |
| FR-052 | Done | Match-case toggle |
| FR-053 | Done | Regex toggle (delivered early) |
| FR-060 | Done | Light / Dark / System |
| FR-061 | Done | Font size setting and zoom shortcuts |
| FR-062 | Done | Settings saved to `settings.json` |
| FR-063 | Done | Tauri `app_config_dir()` |

## Non-functional and security requirements

| ID | Status | Notes |
| --- | --- | --- |
| NFR-001/002 | Done | CodeMirror virtualised rendering; debounced preview. A benchmark for very large files is still to be added |
| NFR-003 | Done | Measured at startup and logged |
| NFR-004 | Done | Save failures keep the document dirty; errors are shown as toasts or dialogs |
| NFR-005 | Done | No network access is required |
| NFR-006 | Done | Tauri bundles for all 3 operating systems via GitHub Actions |
| NFR-007 | Done | Scope enforced in Rust ([scope.rs](../src-tauri/src/scope.rs)) |
| NFR-008 | Done | No telemetry; content never leaves the machine |
| NFR-009 | Done | Modular services and stores; Vitest and Rust tests |
| NFR-010 | Done | Keyboard menus, tree, tabs and dialogs; focus rings; automated axe-core WCAG 2.1 AA audit (light and dark) in e2e |
| NFR-011 | Partial | Minimum OS versions still need to be documented (open question in SRS §21) |
| SEC-001 | Done | Capability grants only `core:default`, set-title and destroy |
| SEC-002/003 | Done | Absolute paths only, `..` rejected, canonicalised scope check |
| SEC-004 | Done | Sanitisation tests in [markdown.test.tsx](../tests/markdown.test.tsx) |
| SEC-005 | Done | `open_external` accepts only http, https and mailto |
| SEC-006/007 | N/A | No AI or secrets in the MVP |
| SEC-008 | Partial | Signing hooks exist in the release workflow; certificates are needed |
| UPD-001..006 | Planned (v1.0) | Add `tauri-plugin-updater` with a signing key and update endpoint |

## Beyond the MVP (delivered early)

| Feature | SRS reference |
| --- | --- |
| Document outline | §19 Future: document outline and navigation |
| Mermaid diagrams and LaTeX math | §18 v0.3 |
| Export to HTML, Print / Save as PDF | §19 Future: export to HTML and PDF |
| Find in Files, command palette, formatting commands | §5 Power user needs |
| Open from OS (file association, single instance, drag and drop) | §13 packaging and desktop integration |
| Auto save, save options, large-document mode | §10.2, NFR-002 |

## Known gaps and next improvements

- Auto-update (UPD-*), planned for v1.0.
- Startup bundle is 612 KB; the preview pipeline, export and Mermaid are lazy-loaded. Further trimming (highlight.js language subset) is possible.
- A native OS menu bar on macOS (the in-app menu is used on all platforms today).
- Large-file benchmark (10 MB+) and incremental preview rendering.
- Playwright e2e covers the browser demo (6 workflows); a Tauri-driver e2e run against the native build is still to do.
- i18n (localization), Playwright end-to-end tests.
