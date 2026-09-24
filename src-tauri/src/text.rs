//! Text encoding and line-ending policy (SRS §10.1).
//!
//! Policy: documents are decoded as UTF-8 (an optional BOM is remembered). The
//! editor always works with LF internally; on save the file's original line
//! ending and BOM are restored, so opening and saving a file never rewrites its
//! line endings. New documents use LF and no BOM.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

const UTF8_BOM: &[u8] = &[0xEF, 0xBB, 0xBF];

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LineEnding {
    Lf,
    Crlf,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Decoded {
    pub content: String,
    pub line_ending: LineEnding,
    pub bom: bool,
}

pub fn decode(bytes: &[u8]) -> AppResult<Decoded> {
    let (bom, body) = match bytes.strip_prefix(UTF8_BOM) {
        Some(rest) => (true, rest),
        None => (false, bytes),
    };
    let text = std::str::from_utf8(body).map_err(|e| {
        AppError::Encoding(format!(
            "The file is not valid UTF-8 (invalid byte at position {}). It was not opened to avoid corrupting it.",
            e.valid_up_to()
        ))
    })?;
    let crlf = text.matches("\r\n").count();
    let lf_total = text.matches('\n').count();
    let line_ending = if crlf > 0 && crlf >= lf_total - crlf {
        LineEnding::Crlf
    } else {
        LineEnding::Lf
    };
    Ok(Decoded {
        content: text.replace("\r\n", "\n"),
        line_ending,
        bom,
    })
}

pub fn encode(content: &str, line_ending: LineEnding, bom: bool) -> Vec<u8> {
    let normalized = content.replace("\r\n", "\n");
    let body = match line_ending {
        LineEnding::Lf => normalized,
        LineEnding::Crlf => normalized.replace('\n', "\r\n"),
    };
    let mut out = Vec::with_capacity(body.len() + 3);
    if bom {
        out.extend_from_slice(UTF8_BOM);
    }
    out.extend_from_slice(body.as_bytes());
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_crlf_and_round_trips() {
        let bytes = b"# Title\r\n\r\nBody\r\n";
        let d = decode(bytes).unwrap();
        assert_eq!(d.line_ending, LineEnding::Crlf);
        assert_eq!(d.content, "# Title\n\nBody\n");
        assert_eq!(encode(&d.content, d.line_ending, d.bom), bytes.to_vec());
    }

    #[test]
    fn preserves_bom_and_unicode() {
        let mut bytes = UTF8_BOM.to_vec();
        bytes.extend_from_slice("héllo 世界 🚀\n".as_bytes());
        let d = decode(&bytes).unwrap();
        assert!(d.bom);
        assert_eq!(d.content, "héllo 世界 🚀\n");
        assert_eq!(encode(&d.content, d.line_ending, d.bom), bytes);
    }

    #[test]
    fn rejects_invalid_utf8() {
        assert!(matches!(
            decode(&[b'a', 0xFF, b'b']),
            Err(AppError::Encoding(_))
        ));
    }

    #[test]
    fn lf_when_no_newlines() {
        assert_eq!(decode(b"abc").unwrap().line_ending, LineEnding::Lf);
    }
}
