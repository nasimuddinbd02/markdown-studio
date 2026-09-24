//! Settings, crash recovery and diagnostic logs, all stored in the platform's
//! application data locations (FR-062, FR-063, FR-004, SRS §16).

use crate::error::AppResult;
use serde_json::Value;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_LOG_BYTES: u64 = 1024 * 1024;

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Writes JSON through a temporary file so a crash mid-write cannot corrupt it.
pub fn write_json(path: &Path, value: &Value) -> AppResult<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, serde_json::to_vec_pretty(value).unwrap_or_default())?;
    fs::rename(&tmp, path)?;
    Ok(())
}

/// Reads JSON. A missing file yields `Null`. A corrupt file is renamed aside
/// (so it can still be recovered by hand) and `Null` is returned so the caller
/// falls back to safe defaults (SRS §12, "Corrupt configuration").
pub fn read_json(path: &Path) -> Value {
    let Ok(bytes) = fs::read(path) else {
        return Value::Null;
    };
    match serde_json::from_slice(&bytes) {
        Ok(v) => v,
        Err(_) => {
            let aside = path.with_extension(format!("corrupt-{}.json", now_secs()));
            let _ = fs::rename(path, aside);
            Value::Null
        }
    }
}

pub struct Logger {
    path: PathBuf,
    home: Option<String>,
}

impl Logger {
    pub fn new(dir: PathBuf, home: Option<PathBuf>) -> Self {
        let _ = fs::create_dir_all(&dir);
        Logger {
            path: dir.join("markdown-studio.log"),
            home: home.map(|h| h.to_string_lossy().into_owned()),
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Replaces the user's home directory with `~` so logs shared for support
    /// don't reveal account names (SRS §16).
    pub fn redact(&self, msg: &str) -> String {
        match &self.home {
            Some(home) if !home.is_empty() => msg.replace(home.as_str(), "~"),
            _ => msg.to_string(),
        }
    }

    pub fn log(&self, level: &str, category: &str, message: &str) {
        if let Ok(meta) = fs::metadata(&self.path) {
            if meta.len() > MAX_LOG_BYTES {
                let _ = fs::rename(&self.path, self.path.with_extension("log.1"));
            }
        }
        let line = format!(
            "{} [{}] v{} {}: {}\n",
            now_secs(),
            level.to_uppercase(),
            env!("CARGO_PKG_VERSION"),
            category,
            self.redact(message).replace('\n', " ")
        );
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&self.path) {
            let _ = f.write_all(line.as_bytes());
        }
        if cfg!(debug_assertions) {
            eprint!("{line}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn corrupt_json_falls_back_to_null_and_is_preserved() {
        let tmp = tempfile::tempdir().unwrap();
        let p = tmp.path().join("settings.json");
        fs::write(&p, "{ not json").unwrap();
        assert_eq!(read_json(&p), Value::Null);
        assert!(!p.exists());
        assert_eq!(fs::read_dir(tmp.path()).unwrap().count(), 1);
    }

    #[test]
    fn json_round_trip() {
        let tmp = tempfile::tempdir().unwrap();
        let p = tmp.path().join("nested").join("settings.json");
        let v = serde_json::json!({ "theme": "dark", "fontSize": 15 });
        write_json(&p, &v).unwrap();
        assert_eq!(read_json(&p), v);
    }

    #[test]
    fn redacts_home_directory() {
        let tmp = tempfile::tempdir().unwrap();
        let logger = Logger::new(tmp.path().to_path_buf(), Some(PathBuf::from("/home/alice")));
        assert_eq!(logger.redact("open /home/alice/notes.md"), "open ~/notes.md");
    }
}
