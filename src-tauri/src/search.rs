//! Workspace-wide search across Markdown files ("Find in Files").

use crate::error::{AppError, AppResult};
use crate::fs_ops::{self, is_markdown};
use regex::{Regex, RegexBuilder};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const MAX_FILE_BYTES: u64 = 10 * 1024 * 1024;
const MAX_FILES: usize = 20_000;
const PREVIEW_CONTEXT: usize = 60;
const SKIPPED_DIRS: &[&str] = &["node_modules", "target", "dist", "build"];

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
    pub query: String,
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default)]
    pub whole_word: bool,
    #[serde(default)]
    pub regex: bool,
    #[serde(default = "default_max")]
    pub max_results: usize,
}

fn default_max() -> usize {
    2000
}

/// Positions are in UTF-16 code units so they map directly onto JavaScript
/// strings and CodeMirror offsets.
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    /// 1-based line number.
    pub line: usize,
    /// 0-based column (UTF-16) of the match within the line.
    pub column: usize,
    /// Match length (UTF-16).
    pub length: usize,
    pub preview: String,
    /// Match position within `preview` (UTF-16).
    pub preview_start: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMatches {
    pub path: String,
    pub matches: Vec<SearchMatch>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub files: Vec<FileMatches>,
    pub total_matches: usize,
    pub files_searched: usize,
    pub truncated: bool,
}

pub fn build_matcher(opts: &SearchOptions) -> AppResult<Regex> {
    if opts.query.is_empty() {
        return Err(AppError::InvalidPath("Search query is empty".into()));
    }
    let mut pattern = if opts.regex { opts.query.clone() } else { regex::escape(&opts.query) };
    if opts.whole_word {
        pattern = format!(r"\b(?:{pattern})\b");
    }
    RegexBuilder::new(&pattern)
        .case_insensitive(!opts.case_sensitive)
        .size_limit(1 << 20)
        .build()
        .map_err(|e| AppError::InvalidPath(format!("Invalid regular expression: {e}")))
}

fn utf16_len(s: &str) -> usize {
    s.encode_utf16().count()
}

/// Largest char boundary <= `i`.
fn floor_boundary(s: &str, mut i: usize) -> usize {
    while i > 0 && !s.is_char_boundary(i) {
        i -= 1;
    }
    i
}

fn ceil_boundary(s: &str, mut i: usize) -> usize {
    while i < s.len() && !s.is_char_boundary(i) {
        i += 1;
    }
    i.min(s.len())
}

pub fn search_text(text: &str, re: &Regex, limit: usize) -> Vec<SearchMatch> {
    let mut out = Vec::new();
    for (idx, line) in text.lines().enumerate() {
        let line = line.strip_suffix('\r').unwrap_or(line);
        for m in re.find_iter(line) {
            if m.start() == m.end() {
                continue; // zero-width matches aren't useful results
            }
            let start = floor_boundary(line, m.start().saturating_sub(PREVIEW_CONTEXT));
            let end = ceil_boundary(line, m.end() + PREVIEW_CONTEXT * 2);
            let mut preview = String::new();
            if start > 0 {
                preview.push('…');
            }
            let lead = preview.encode_utf16().count();
            preview.push_str(&line[start..end]);
            if end < line.len() {
                preview.push('…');
            }
            out.push(SearchMatch {
                line: idx + 1,
                column: utf16_len(&line[..m.start()]),
                length: utf16_len(m.as_str()),
                preview,
                preview_start: lead + utf16_len(&line[start..m.start()]),
            });
            if out.len() >= limit {
                return out;
            }
        }
    }
    out
}

fn collect_files(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let Ok(entries) = fs::read_dir(&dir) else { continue };
        let mut children: Vec<_> = entries.flatten().collect();
        children.sort_by_key(|e| e.file_name());
        for entry in children.into_iter().rev() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') {
                continue;
            }
            let Ok(file_type) = entry.file_type() else { continue };
            // Symlinks are not followed, so a search can never escape the workspace.
            if file_type.is_dir() {
                if !SKIPPED_DIRS.contains(&name.as_str()) {
                    stack.push(entry.path());
                }
            } else if file_type.is_file() && is_markdown(&entry.path()) {
                files.push(entry.path());
                if files.len() >= MAX_FILES {
                    return files;
                }
            }
        }
    }
    files.sort();
    files
}

pub fn search_workspace(root: &Path, opts: &SearchOptions) -> AppResult<SearchResult> {
    let re = build_matcher(opts)?;
    let limit = opts.max_results.clamp(1, 10_000);
    let files = collect_files(root);
    let mut result = SearchResult { files: Vec::new(), total_matches: 0, files_searched: 0, truncated: false };
    for path in files {
        if result.total_matches >= limit {
            result.truncated = true;
            break;
        }
        let Ok(meta) = fs::metadata(&path) else { continue };
        if meta.len() > MAX_FILE_BYTES {
            continue;
        }
        let Ok(bytes) = fs::read(&path) else { continue };
        let Ok(text) = std::str::from_utf8(bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(&bytes)) else {
            continue;
        };
        result.files_searched += 1;
        let matches = search_text(text, &re, limit - result.total_matches);
        if !matches.is_empty() {
            result.total_matches += matches.len();
            result.files.push(FileMatches { path: fs_ops::path_string(&path), matches });
        }
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opts(q: &str) -> SearchOptions {
        SearchOptions { query: q.into(), case_sensitive: false, whole_word: false, regex: false, max_results: 100 }
    }

    #[test]
    fn literal_case_and_word_modes() {
        let text = "Hello world\nhello World, worldwide\r\n";
        let re = build_matcher(&opts("world")).unwrap();
        let m = search_text(text, &re, 100);
        assert_eq!(m.len(), 3);
        assert_eq!((m[0].line, m[0].column, m[0].length), (1, 6, 5));

        let re = build_matcher(&SearchOptions { case_sensitive: true, ..opts("World") }).unwrap();
        assert_eq!(search_text(text, &re, 100).len(), 1);

        let re = build_matcher(&SearchOptions { whole_word: true, ..opts("world") }).unwrap();
        assert_eq!(search_text(text, &re, 100).len(), 2);

        // Literal mode escapes regex syntax.
        let re = build_matcher(&opts("a.b")).unwrap();
        assert_eq!(search_text("axb a.b", &re, 100).len(), 1);
    }

    #[test]
    fn regex_mode_and_errors() {
        let re = build_matcher(&SearchOptions { regex: true, ..opts(r"\d{3}") }).unwrap();
        assert_eq!(search_text("a 123 b 45 c 678", &re, 100).len(), 2);
        assert!(build_matcher(&SearchOptions { regex: true, ..opts("(") }).is_err());
        assert!(build_matcher(&opts("")).is_err());
    }

    #[test]
    fn utf16_columns_for_non_ascii() {
        let re = build_matcher(&opts("x")).unwrap();
        let m = search_text("🚀é x", &re, 100);
        // 🚀 is 2 UTF-16 units, é is 1, space 1.
        assert_eq!(m[0].column, 4);
        assert_eq!(&m[0].preview, "🚀é x");
        assert_eq!(m[0].preview_start, 4);
    }

    #[test]
    fn walks_markdown_files_and_limits_results() {
        let tmp = tempfile::tempdir().unwrap();
        fs::create_dir_all(tmp.path().join("docs")).unwrap();
        fs::create_dir_all(tmp.path().join("node_modules")).unwrap();
        fs::create_dir_all(tmp.path().join(".git")).unwrap();
        fs::write(tmp.path().join("a.md"), "needle\nneedle").unwrap();
        fs::write(tmp.path().join("docs").join("b.markdown"), "a needle").unwrap();
        fs::write(tmp.path().join("c.txt"), "needle").unwrap();
        fs::write(tmp.path().join("node_modules").join("x.md"), "needle").unwrap();
        fs::write(tmp.path().join(".git").join("y.md"), "needle").unwrap();

        let r = search_workspace(tmp.path(), &opts("needle")).unwrap();
        assert_eq!(r.files.len(), 2);
        assert_eq!(r.total_matches, 3);
        assert!(!r.truncated);

        let r = search_workspace(tmp.path(), &SearchOptions { max_results: 1, ..opts("needle") }).unwrap();
        assert_eq!(r.total_matches, 1);
        assert!(r.truncated);
    }
}
