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

## 2026-09-25: Writing features, released as 0.9.0

The user asked for a continuous loop: suggest a feature, build it, test it, push it.

| # | Feature | Commit |
| --- | --- | --- |
| 31 | YAML front matter is shown as a metadata table in the preview (not a rule plus a stray heading), left out of exports, and its `title` names exported documents | a95a571 |
| 32 | GitHub alerts (`> [!NOTE]`, TIP, IMPORTANT, WARNING, CAUTION): coloured callouts with icons in the preview and HTML export, and labelled callouts in PDF and Word. Styled after sanitizing | e06dfe6 |
| 33 | New from Template: 7 built-in templates plus the workspace `templates/` folder; `{{date}}`, `{{week}}` and `{{cursor}}` placeholders | 392c308 |
| 34 | Paste a URL over selected text to make `[text](url)` | ef472f7 |

**Release 0.9.0:** the first release delivered through the in-app updater. Installed 0.8.0 apps offer it at startup.

**Tests:** Vitest 207, Playwright 18, Rust 27. All passing.

## 2026-09-25 (evening): Heading levels and clickable tasks, released as 0.10.0

| # | Feature | Commit |
| --- | --- | --- |
| 35 | Promote / Demote Heading (Format menu, palette, Ctrl/Cmd+Alt+= and Ctrl/Cmd+Alt+-): each selected heading moves one level, staying within H1–H6. Other lines are unchanged | 0b22bef |
| 36 | Task checkboxes in the preview can be clicked (or toggled with Space) to check or uncheck the task in the source. The change goes through the editor, so Ctrl+Z undoes it. Tasks are located with the preview's GFM parser, so code blocks, quotes, nested lists, front matter and CRLF files are handled | 704e342 |

**Verification:** Vitest and a Playwright workflow in Edge: the shortcut changes H3→H2→H4 in the preview; clicking the second task checks `- [x] second` in the source and leaves the first alone. An early version of the checkbox logged a React "uncontrolled to controlled" warning. It is now an uncontrolled input keyed on its state, and the warning is gone. The preview dev server can't start in unattended runs, so browser checks ran through Playwright.

**Release 0.10.0** (33742ac): standard installer 6.9 MB (SHA-256 6442eb92…); offline installer 211.9 MB (SHA-256 b9fec90b…). Both GitHub download URLs return 200, and `latest.json` shows 0.10.0, so installed apps are offered the update at startup. The README (version, links, checksums, features), INSTALL.md (the standard installer size is now ~7 MB, not ~4 MB) and TRACEABILITY are updated. **Local install skipped:** the silent install needs UAC elevation, and nobody was present to approve it. The machine still has 0.9.0, which will offer 0.10.0 at its next startup.

**Tests:** Vitest 212, Playwright 18, Rust 27. All passing.

**Next up:**

1. Move a whole section (a heading plus its subheadings) up or down, or promote it, from the outline.
2. Performance: a subset of highlight.js languages to shrink the preview bundle; a 10 MB document benchmark.
3. Tauri-driver e2e against the native build.
4. Localization: waiting on the language choice.

**Questions for the user:**

- Which UI languages should localization cover?
- Code-signing certificate (Authenticode) so SmartScreen doesn't warn on install?
- Local installs need an elevated (UAC) prompt, which unattended runs can't approve. Should the scheduled run skip the local install, or will you run the installer yourself?

## 2026-09-25 (late evening): Separate installers for Windows, macOS and Linux

The user asked for the app to be platform-independent, with a separate installer for each of Windows, macOS and Linux.

| # | Change | Commit |
| --- | --- | --- |
| 37 | The release workflow builds macOS (Apple Silicon and Intel `.dmg`) and Linux (`.AppImage`, `.deb`, `.rpm`) installers with stable names, and attaches them and `SHA256SUMS-macos-linux.txt` to the release that `release:github` creates for Windows. It had failed on every release since 0.3.1: empty Apple secrets broke macOS signing (the app is now ad-hoc signed without a certificate), and the updater key isn't in CI (no updater artifacts are built there). It can be run by hand for an existing tag | see git log |
| — | README Download section: a table for all three systems, then per-OS install steps. The release script generates it, so every release refreshes all three. docs/INSTALL.md has full macOS and Linux guides (requirements, Gatekeeper, apt/dnf/AppImage, updating, uninstalling, checksums) | same |
| — | On macOS and Linux the update check falls back to the GitHub release page ("Download"), because signed in-place updates are published for Windows only. Takes effect from the next release | same |

**Verification:** re-ran the workflow for v0.10.0. All 4 jobs passed, and all 5 new assets plus the checksum file are on the release. Every README download link returns 200. The `.deb` declares `libwebkit2gtk-4.1-0, libgtk-3-0`, so apt installs the dependencies. **Not verified:** installing and running on a real Mac or Linux machine (not available here). Note that the 0.10.0 macOS/Linux builds were made from the v0.10.0 tag, so the update-check fallback applies only from the next release.

**Tests:** Vitest 213, Playwright 18, Rust 27. All passing.

**Questions for the user:**

- Apple Developer ID (for notarization, so macOS doesn't warn): do you have one to add as `APPLE_*` repository secrets?
- Should the updater signing key be added as a repository secret (`TAURI_SIGNING_PRIVATE_KEY`), so macOS and Linux get in-place automatic updates like Windows?
- Linux ARM64 (for example Raspberry Pi) and Windows ARM64 builds: wanted?

## 2026-09-25 (night): Documentation brought up to date with the current design

The user asked for all project documents to match the current design, and to be updated whenever a feature is developed.

- **README:** added missing features (Save All and recent files, word count and statistics, spell check, Export Diagnostic Logs, the three-OS note). The security model now describes the only network request (the update check) and signed updates. Development now covers the Node 22 requirement, `npm run build`, the release scripts and what CI runs. The project structure lists every folder and module, and a new Documentation section describes each doc and the update policy.
- **TRACEABILITY:** status as of 0.10.0. NFR-011 is now Done (minimum OS versions are documented). NFR-006, SEC-001, SEC-008 and the UPD rows are corrected. The "Beyond the MVP" table grew from 7 to 16 rows with source locations, and there is a new test-coverage table. Known gaps are refreshed: startup bundle 691 KB (232 KB gzipped), ARM64, and the stale "Playwright to do" item removed.
- **SRS:** now version 1.1, with a revision history, an implementation-status summary, status notes for §13 (per-OS installers) and §18 (release scopes), and §21 open questions marked answered, partly answered or open. The requirement text is unchanged.
- **INSTALL.md:** macOS and Linux troubleshooting rows.

**Policy from now on:** every feature commit updates the README feature list and TRACEABILITY (plus INSTALL.md or the SRS status notes if affected), and every release updates the download section, INSTALL.md and this log.

## 2026-09-25 (extra hour, 6:18–7:00 PM): Writing and structure tools, released as 0.11.0

The user asked for one more hour today.

| # | Feature | Commit |
| --- | --- | --- |
| 38 | Check / Uncheck Task (Ctrl/Cmd+Enter; on other lines the key keeps its default) and Insert Footnote (Ctrl/Cmd+Alt+R: the next `[^n]` at the cursor, its definition at the end, definitions kept together) | 969a371 |
| 39 | File → Export Folder as One PDF / One Word Document: combines the folder in memory and exports it without writing a combined `.md`. The PDF/Word exporters now take any Markdown source | f63b69e |
| 40 | Sort Table by Column (A to Z / Z to A): numeric when every filled cell is a number (1,200, 3.5%, $9), otherwise natural order; empty cells last; stable | 1a29f1d |
| 41 | Reopen Closed Tab (Ctrl/Cmd+Shift+T; up to 20; skips files that are open again or gone) | a03fde0 |
| 42 | Move Section Up / Down: a heading with its text and subsections moves past its same-level neighbour within its parent; headings in code fences are ignored | 3e39e44 |

**Verification:** Vitest for every command, and a Playwright workflow in Edge for each: the task toggle and footnote rendering in the preview, a folder export producing a real `.docx` download (and no combined file), reopen via the palette, and move section via the palette.

**Release 0.11.0** (6d1ba36): Windows standard 6.9 MB (SHA-256 24037ac8…) and offline 211.9 MB (d5c3f463…). macOS arm64/x64 `.dmg` and Linux `.AppImage`/`.deb`/`.rpm` were built by the release workflow (all 4 jobs green). All 6 README release links return 200, and `latest.json` shows 0.11.0. The docs were updated with each feature (README, TRACEABILITY) and at the release (SRS current version 0.11.0, TRACEABILITY as-of and test counts, INSTALL links).

**Tests:** Vitest 225 (37 files), Playwright 21, Rust 27. All passing.

**Next up:**

1. Outline panel: drag to reorder sections (reusing `sections.ts`), and Copy Link to Heading.
2. Performance: a highlight.js language subset; a 10 MB document benchmark.
3. Tauri-driver e2e against the native build; test the macOS and Linux builds on real machines.

**Questions for the user:** unchanged. Apple Developer ID, the updater key as a CI secret, ARM64 builds, licensing, UI languages.

## 2026-09-25 (night): Documentation website

The user asked for the documents to follow `docs/DOCUMENTATION_SITE_SPEC.md`: a public documentation and product website.

- **Framework:** VitePress 1.6 in `website/`, with its own `package.json`, so the app's dependencies are untouched. Vite is overridden to 6.4.3, giving 0 vulnerabilities; stock VitePress pulls in a vulnerable Vite 5/esbuild dev server.
- **47 pages:** home, download, features, FAQ, changelog (v0.3.1–v0.11.0 from the git history), roadmap, privacy; Getting Started (3); installation per OS (3); user guide (10); Markdown reference (8); troubleshooting (9, each in Problem / Symptoms / Cause / Solution / Diagnostics / Report form); reference (keyboard shortcuts, configuration); blog (index and 4 articles).
- **Single sources of truth:** the version, release date and installer links come from the app's `package.json`, the git tags and the release naming convention (`docs/data/release.data.ts`). The keyboard shortcut tables are parsed from `src/features/commands.ts` with the TypeScript parser at build time.
- **Screenshots:** real UI captures (`npm run docs:screenshots` drives the browser build with Playwright and encodes WebP), 20–92 KB each.
- **SEO:** a unique title and description per page (enforced), canonical URLs, Open Graph and Twitter tags, JSON-LD (SoftwareApplication, WebSite and Organization on the home page; BreadcrumbList on documentation pages; Article on blog posts; no ratings, prices or counts), `sitemap.xml` and `robots.txt`.
- **Validation:** `npm run docs:check` runs the type check, the content check (front matter, one H1, alt text, stray interpolation), the build (fails on dead links) and a link check of every href and src in the output. `--external` checked 69 GitHub and release links, all OK. `npm run docs:test` runs 24 browser checks: axe-core WCAG 2.1 AA on 11 pages in light and dark (all pass), mobile at 375 px with no horizontal scrolling, and the mobile menu.
- **Accessibility fixes found by the audit:** brand button contrast, code language labels and syntax colours (now `github-light-high-contrast`), collapsible sidebar groups (nested-interactive), and an unlabelled theme switch before hydration (component override with a static `aria-label`).
- **Deployment:** `.github/workflows/documentation.yml` builds and checks on pull requests and deploys to GitHub Pages on pushes to `main` (website, version or shortcut changes), on releases, and by hand.
- **Accuracy fixes found while writing:** web (`https`) images do make network requests, so "the only network request is the update check" was corrected in the README and SRS too. A probe showed that PDF export drops footnotes and Word export drops footnote references. This is documented, and recorded in TRACEABILITY known gaps and on the roadmap.

**Desktop app unaffected:** typecheck, Vitest 225, Playwright 21 and `vite build` all pass.

**Next up:** footnotes, Mermaid and math in PDF/Word export; website search console setup (owner); keep the website changelog updated with each release.

**Questions for the user:** enable GitHub Pages (Settings → Pages → Source: GitHub Actions)? Choose a license (the FAQ says one hasn't been published)?
