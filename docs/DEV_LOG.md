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
