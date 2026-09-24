# Development Log

Daily development sessions (4–6 PM). Newest entries at the bottom.

## 2026-09-23 — Initial MVP build (v0.1)

**What was built:** the full v0.1 MVP from [SRS.md](SRS.md). Per-requirement status is in [TRACEABILITY.md](TRACEABILITY.md).

- Tauri 2 Rust backend (`src-tauri/src/`):
  - backend-enforced file scope and path-traversal rejection
  - native dialogs, atomic safe save with mtime conflict detection, and UTF-8/BOM/CRLF preservation
  - delete to Trash, recent list, settings, crash recovery, redacted logs
  - least-privilege capability
- React/TypeScript frontend (`src/`):
  - menu bar, explorer, tabs, CodeMirror editor and sanitized GFM preview
  - status bar, settings, dialogs and toasts
  - external-change banner, recovery, session restore, keyboard shortcuts
- `MemoryBackend` browser demo mode, so the UI runs without Rust.
- CI (`.github/workflows/ci.yml`) and a cross-platform release workflow (`release.yml`).
- The SRS was converted to [SRS.md](SRS.md) (the original .docx was moved to the Recycle Bin).

**Verification:**

- `npm run typecheck`: clean. `npm test`: 38 passed. `vite build`: OK.
- Verified by hand in the browser demo: open folder, open, edit, save, the Save As flow, the unsafe-HTML document, external-change banner, conflict dialog, close-dirty prompt, find/replace, view modes, settings, crash recovery and session restore.

**Unverified:** the Rust code has **not been compiled yet**, because there's no Rust toolchain on this machine. It includes unit tests (`cargo test`). To compile it, install Rust (https://rustup.rs) plus the Tauri prerequisites, then run `npm run tauri:dev`.

**Update (same day):** Rust 1.98.1 was installed via `winget install Rustlang.Rustup`, and MSVC Build Tools and WebView2 were already present. The Rust backend compiled without changes, and `cargo test` gives 15 passed. `npm run tauri:dev` launches the native window, which shows the welcome screen, with a logged startup time of about 100 ms. In Git Bash, `cargo` needs `export PATH="$HOME/.cargo/bin:$PATH"` until the shell is restarted. The first launch exited cleanly (code 0) shortly after starting, for an unknown reason (possibly the window was closed); the relaunch stayed up.

**Next up:**

1. Smoke-test the native flows in `npm run tauri:dev`: Open File/Folder dialogs, Save/Save As, the close guard on unsaved changes, window-state restore, delete-to-Recycle-Bin, and external links.
2. Shrink the ~1 MB main bundle: lazy-load CodeMirror language data and highlight.js languages.
3. Large-file benchmark (10 MB+) and preview performance (NFR-001/002).
4. v0.2 polish (SRS §18): a richer compare view for external changes and search improvements.
5. Playwright end-to-end tests for the critical flows (§17.1).
6. Document minimum supported OS versions (NFR-011).

**Questions for the user:**

- Should scheduled sessions commit their work to git? No commits are made until you approve.
- Several SRS §21 questions are still open: license, application identifier (currently `com.markdownstudio.app`), and minimum OS versions.

## 2026-09-23 (evening): Enterprise feature loop, iterations 1–9

The user approved a continuous loop: build a feature, test it, run it, then commit and push. The Rust toolchain is now installed and all Rust code compiles, with `cargo test` passing 20 tests.

| # | Feature | Commit |
| --- | --- | --- |
| 1 | Format menu and shortcuts (bold/italic/link/headings/lists/quote/code/table); explorer toggle moved to Ctrl+Shift+E | dccadea |
| 2 | Command palette (Ctrl+Shift+P / F1) with fuzzy search | 5c658c5 |
| 3 | Document outline panel (current-section highlight, jump to heading) | 03f29b1 |
| 4 | Export to HTML (self-contained, sanitized, images inlined), Copy as HTML, Print / Save as PDF | e54128b |
| 5 | Open files from the OS: launch args / file association, single instance, drag and drop onto the window | 8d6d794 |
| 6 | Auto save (after delay / on focus change), quiet on conflicts | 5f8ae2a |
| 7 | Find in Files: native Rust search with case, word and regex options; Search sidebar view | a092caf |
| 8 | Mermaid diagrams (lazy, strict) and LaTeX math (MathML); lodash-es pinned via overrides (`npm audit`: 0 vulnerabilities) | c6da031 |
| 9 | Save options (trim whitespace, final newline, new-file EOL), minimal-diff editor sync, large-document preview pause | c5f1bc7 |

**Tests:** 96 Vitest and 20 Rust, all passing. Each feature was also checked in the browser demo. The native behaviour of iteration 5 was checked with the debug build: the second instance forwarded its file and the log recorded `os.open`.

**Push status:** the push to `origin/main` is waiting for an interactive GitHub sign-in (Git Credential Manager), so these commits exist locally only until the user signs in once.

**Next up:**

1. Paste or drop an image into a document, saving it to an `assets/` folder next to the file.
2. Performance: code-split the main bundle (~1.4 MB) by lazy-loading the preview and export pipeline and the highlight.js languages.
3. Auto-update (UPD-001..006) with `tauri-plugin-updater`. This needs a signing keypair and an update endpoint from the user.
4. Markdown lint / Problems panel (broken relative links, duplicate headings, missing image files).
5. Table formatter (align columns) and link autocompletion for workspace files.
6. Localization (i18n) scaffolding.
7. Playwright end-to-end tests against the browser demo.

**Questions for the user:**

- Please complete the GitHub sign-in so pushes can go through. Running `git push` once in a terminal will cache the credentials.
- Auto-update needs an update-signing key and an update URL (for example GitHub Releases `latest.json`). Should I generate the keypair?
- License, final app identifier (currently `com.markdownstudio.app`), and minimum OS versions (SRS §21).
