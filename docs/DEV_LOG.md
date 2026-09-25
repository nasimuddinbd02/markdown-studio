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

### Iterations 10–13 (same evening)

| # | Feature | Commit |
| --- | --- | --- |
| 10 | Paste or drop images into a document: saved to `assets/` next to the file via a scoped Rust command, linked on their own line | e27b918 |
| 11 | Code-split the preview and export pipelines: startup bundle 1.4 MB → 612 KB (693 KB after 12–13) | 7cba49a |
| 12 | Markdown lint (broken links and images, anchors, duplicate headings, heading levels, alt text) with a Problems panel | 6a5fe3d |
| 13 | Format Table (CJK-aware alignment) and link autocompletion (files, images, `#anchors`) | 3108380 |

**Final check:** `tsc` is clean. Vitest: 120 tests passing across 17 files. Rust: 22 passing. `vite build` succeeds, and `npm audit` reports 0 vulnerabilities.

**Push status:** still waiting for the GitHub sign-in. 14+ commits are queued on local `main`.

**Next up:**

1. Localization (i18n) scaffolding: extract UI strings; English plus one more locale.
2. Playwright end-to-end tests against the browser demo (open, edit, save, find, export).
3. Auto-update (UPD-*), once the user provides or approves a signing key and update URL.
4. A native macOS menu bar, and "Reveal in File Explorer" / "Copy Path" in the explorer context menu.
5. Performance: trim the highlight.js language set and benchmark 10 MB documents.
6. Spell-check language setting, and word/character count for the selection.

### Iterations 14–19 (continued loop)

| # | Feature | Commit |
| --- | --- | --- |
| 14 | Reusable accessible context menu; explorer Reveal / Copy Path / Copy Relative Path; tab menu (Close Others / to the Right / Saved) | aaab8a3 |
| 15 | Playwright end-to-end suite (6 workflows) on the installed Edge; CI job with Chromium | f093be8 |
| 16 | axe-core WCAG 2.1 AA audit in e2e (light and dark); fixed contrast, labels, nested controls and list semantics | 6106913 |
| 17 | Local file history (30 versions per file) with diff and restore; saving during an in-flight save now queues a re-save | 94cba75 |
| 18 | Focus Mode, Full Screen (F11) and a searchable Keyboard Shortcuts reference | d30af93 |
| 19 | Document statistics popover, spell-check toggle, Windows save-rename retry | 6d6c62d |

**Tests:** Vitest 136, Playwright 14 (including 8 accessibility audits), Rust 24. All passing.

**Push status:** still blocked on the GitHub sign-in. 21 commits are waiting locally.

**Questions for the user:**

- Which UI languages should localization cover (besides English)?
- Auto-update signing key and update URL (UPD-*).

## 2026-09-24: Conversion tools, released as 0.4.0

The user asked for conversion tools (DOCX/PDF to Markdown and the reverse) and continued development.

| # | Feature | Commit |
| --- | --- | --- |
| 21 | Import Word (.docx) and HTML as Markdown (mammoth, turndown + GFM); images saved to `assets/`; paste rich text as Markdown | 08e8fed |
| 22 | Export to Word (.docx) from the Markdown syntax tree; verified by opening the file in Microsoft Word through COM | db8d0b9 |
| 23 | Import PDF as Markdown (pdf.js plus layout heuristics); CMaps and standard fonts bundled for offline use | e70950e |
| 24 | Export to PDF (pdfmake, vector, bookmarks, links, vector checkboxes); non-Latin scripts are offered Print instead | 1c4d0fc |
| — | Native end-to-end check: drove the installed app with Windows UI Automation and the real file dialogs. Found and fixed list marker spacing and missing image alt text | 073225a |
| — | Also shipped: Windows shell integration (0.3.1), offline installer, GitHub Releases through `npm run release:github` | — |

**Release 0.4.0:** the standard installer is 6.3 MB (in `downloads/`) and the offline installer is 212 MB (GitHub Release). Both download URLs return 200, and the checksum is verified.

**Tests:** Vitest 160, Playwright 17, Rust 26. All passing. `npm audit`: 0 vulnerabilities.

**Next up:**

1. Insert or update a Table of Contents from headings.
2. CSV/TSV → Markdown table (paste and import), and export a table to CSV.
3. Batch conversion: convert every .docx/.pdf in a folder to Markdown.
4. Localization: still waiting on the user's language choices.
5. Auto-update (UPD-*), using GitHub Releases as the update source.

## 2026-09-24: Document tools, released as 0.5.0

| # | Feature | Commit |
| --- | --- | --- |
| 25 | Insert / Update Table of Contents (GitHub-style anchors, refreshed on save); CSV/TSV import as a table; paste spreadsheet cells as a table; Copy Table as CSV | 4d83ecd |
| 26 | Convert Folder to Markdown: batch-converts every .docx/.pdf/.html/.csv/.tsv in the workspace, skipping files that already have a .md | 9be8c7b |

**Release 0.5.0:** the standard installer is 6.3 MB (SHA-256 27a735ea…) and the offline installer is 212 MB (SHA-256 0b34bac0…).

**Tests:** Vitest 174, Playwright 17, Rust 27. All passing.

**Next up:** see 0.6.0 below.

## 2026-09-24: Updates and link checking, released as 0.6.0

| # | Feature | Commit |
| --- | --- | --- |
| 27 | Check for updates: Help menu plus an optional daily check against the GitHub Releases API. Offers Download, Later or Skip This Version (UPD-001/002/004). CSP `connect-src` allows only `api.github.com` | a6dbc00 |
| 28 | Workspace link check (sidebar → Links): missing files and images, bad `#anchors` within and across files, empty links; click a problem to jump to it | 2102208 |

**Native check:** installed 0.6.0 and drove Help → Check for Updates through UI Automation. It reported "You're up to date", so the request to GitHub passes the production CSP.

**Release 0.6.0:** standard installer SHA-256 c0fd2549…; offline installer SHA-256 d4425112….

**Tests:** Vitest 182, Playwright 17, Rust 27. All passing.

**Next up:**

1. Signed in-app updates (`tauri-plugin-updater`). This needs a signing key held by the maintainer.
2. Localization: still waiting on the user's language choices.
3. Export a folder (all .md) to PDF or Word in one step; merge several files into one document.

## 2026-09-24 (evening): Combine a folder, released as 0.7.0

| # | Feature | Commit |
| --- | --- | --- |
| — | Fixed an e2e flake: the accessibility audits timed out when the dev server started cold under parallel load (`test.slow()`) | 0fd48e0 |
| 29 | File → Combine Folder into One Document: merges every .md in the folder (README/index first, natural order, depth-first) into `<Folder> (combined).md` with a TOC. Headings move one level down under the combined title, links between files become in-document anchors (renumbered where heading ids collide), and relative images and links are re-based. Front matter and old TOC blocks are dropped. Unsaved edits in open tabs are included, and a dirty combined tab is never overwritten | 7b2fa6e |

**Verification:** 6 Vitest tests and a Playwright workflow (palette → Combine → the combined tab opens and the preview shows the heading hierarchy). The preview server can't start in unattended runs, so the browser check ran through Playwright instead. Not verified in the native app this session (the feature uses only existing backend commands).

**Release 0.7.0:** standard installer 6.3 MB (SHA-256 22d3ae03…); offline installer 211.3 MB (SHA-256 7cda0c7d…). Both GitHub download URLs return 200. Installed locally with `/S`, and the registry shows 0.7.0.

**Tests:** Vitest 188, Playwright 18, Rust 27. All passing.

**Next up:**

1. Export a folder straight to one PDF or Word file (combine plus export in one step, without writing the .md).
2. Signed in-app updates (`tauri-plugin-updater`). Needs a maintainer-held signing key.
3. Performance: a subset of highlight.js languages; a 10 MB document benchmark.
4. Localization: waiting on the language choice.

**Questions for the user:**

- Which UI languages should localization cover?
- Signing key and update endpoint for in-app updates.

## 2026-09-25: Automatic in-app updates, released as 0.8.0

The user asked for automatic updates: check at startup, ask, then replace the old version with the new one.

| # | Feature |
| --- | --- |
| 30 | `tauri-plugin-updater` driven from Rust commands (`check_app_update`, `install_app_update`), so the frontend needs no updater permissions. Checks on every startup (can be turned off in Settings), with Update Now, Later and Skip This Version. Open documents are saved first, a progress dialog shows the download, and the verified NSIS installer replaces the current version in place and relaunches. |
| — | Release pipeline: the standard installer is signed with the updater key (`~/.tauri/markdown-studio.key`, never committed), and `latest.json` is written and uploaded to the GitHub Release. The endpoint is `releases/latest/download/latest.json`. |

**Native end-to-end test:**

1. Built a test 0.7.9 whose update endpoint was a local server, and installed it.
2. Served a manifest with the wrong signature. It was rejected ("signature verification failed"), and 0.7.9 kept running.
3. Served the real signed 0.8.0. Update Now from the startup prompt installed 0.8.0 in place (registry and exe both 0.8.0), and the app relaunched in about 3 seconds.

**Tests:** Vitest 191, Playwright 17, Rust 27. All passing.
