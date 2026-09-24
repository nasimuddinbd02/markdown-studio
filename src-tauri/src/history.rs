//! Local file history: before a save overwrites a file, its previous contents
//! are kept in the app data folder (not next to the user's files), so earlier
//! versions can be inspected and restored (SRS §19 version history, §20
//! data-loss mitigation).

use crate::error::AppResult;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub const MAX_VERSIONS: usize = 30;
const MAX_VERSION_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    /// Milliseconds since the epoch when this version was replaced.
    pub id: u64,
    pub size: u64,
}

/// Stable 64-bit FNV-1a hash (std's hasher isn't stable across releases).
fn fnv1a(s: &str) -> u64 {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in s.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    h
}

/// Folder holding the versions of one document. Keyed by a hash of the
/// (case-normalised on Windows) path, so names never leak into the layout.
pub fn folder_for(root: &Path, doc: &Path) -> PathBuf {
    let key = doc.to_string_lossy();
    let key = if cfg!(windows) { key.to_lowercase() } else { key.into_owned() };
    root.join(format!("{:016x}", fnv1a(&key)))
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// Copies the current contents of `doc` (if it exists) into its history folder
/// and prunes old versions. Failures are non-fatal for the save.
pub fn snapshot(root: &Path, doc: &Path) -> AppResult<Option<u64>> {
    let Ok(meta) = fs::metadata(doc) else { return Ok(None) };
    if !meta.is_file() || meta.len() > MAX_VERSION_BYTES {
        return Ok(None);
    }
    let bytes = fs::read(doc)?;
    let dir = folder_for(root, doc);
    fs::create_dir_all(&dir)?;
    // Skip if identical to the most recent version.
    if let Some(latest) = list(root, doc)?.first() {
        if fs::read(dir.join(format!("{}.md", latest.id))).map(|b| b == bytes).unwrap_or(false) {
            return Ok(None);
        }
    }
    let mut id = now_ms();
    while dir.join(format!("{id}.md")).exists() {
        id += 1;
    }
    fs::write(dir.join(format!("{id}.md")), &bytes)?;
    fs::write(dir.join("path.txt"), doc.to_string_lossy().as_bytes())?;
    prune(&dir)?;
    Ok(Some(id))
}

fn prune(dir: &Path) -> AppResult<()> {
    let mut ids = ids_in(dir);
    ids.sort_unstable_by(|a, b| b.cmp(a));
    for old in ids.into_iter().skip(MAX_VERSIONS) {
        let _ = fs::remove_file(dir.join(format!("{old}.md")));
    }
    Ok(())
}

fn ids_in(dir: &Path) -> Vec<u64> {
    let Ok(entries) = fs::read_dir(dir) else { return Vec::new() };
    entries
        .flatten()
        .filter_map(|e| e.file_name().to_str()?.strip_suffix(".md")?.parse::<u64>().ok())
        .collect()
}

/// Versions of `doc`, newest first.
pub fn list(root: &Path, doc: &Path) -> AppResult<Vec<HistoryEntry>> {
    let dir = folder_for(root, doc);
    let mut out: Vec<HistoryEntry> = ids_in(&dir)
        .into_iter()
        .map(|id| HistoryEntry {
            id,
            size: fs::metadata(dir.join(format!("{id}.md"))).map(|m| m.len()).unwrap_or(0),
        })
        .collect();
    out.sort_unstable_by(|a, b| b.id.cmp(&a.id));
    Ok(out)
}

pub fn read(root: &Path, doc: &Path, id: u64) -> AppResult<Vec<u8>> {
    Ok(fs::read(folder_for(root, doc).join(format!("{id}.md")))?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_previous_versions_and_prunes() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("history");
        let doc = tmp.path().join("doc.md");
        assert_eq!(snapshot(&root, &doc).unwrap(), None); // new file: nothing to keep

        fs::write(&doc, "v1").unwrap();
        let first = snapshot(&root, &doc).unwrap().unwrap();
        // Unchanged content isn't stored twice.
        assert_eq!(snapshot(&root, &doc).unwrap(), None);
        fs::write(&doc, "v2").unwrap();
        snapshot(&root, &doc).unwrap().unwrap();

        let versions = list(&root, &doc).unwrap();
        assert_eq!(versions.len(), 2);
        assert_eq!(read(&root, &doc, first).unwrap(), b"v1");
        assert!(versions[0].id > versions[1].id);

        for i in 0..(MAX_VERSIONS + 5) {
            fs::write(&doc, format!("x{i}")).unwrap();
            snapshot(&root, &doc).unwrap();
        }
        assert_eq!(list(&root, &doc).unwrap().len(), MAX_VERSIONS);
    }

    #[test]
    fn folder_names_are_hashed() {
        let a = folder_for(Path::new("/h"), Path::new("/secret/plans.md"));
        assert!(!a.to_string_lossy().contains("secret"));
        assert_eq!(a, folder_for(Path::new("/h"), Path::new("/secret/plans.md")));
    }
}
