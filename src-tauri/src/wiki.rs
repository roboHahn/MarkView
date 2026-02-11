use once_cell::sync::Lazy;
use regex::Regex;
use serde::Serialize;
use std::fs;

use crate::error::AppError;
use crate::utils::{collect_md_files, validate_directory};

static WIKI_LINK_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\[\[([^\]]+)\]\]").expect("invalid wiki link regex"));

#[derive(Serialize, Clone)]
pub struct WikiLink {
    pub source_file: String,
    pub target: String,
    pub alias: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct WikiScanResult {
    pub links: Vec<WikiLink>,
    pub files: Vec<String>,
}

/// Scan all .md files in a folder for [[wiki links]].
/// Returns all found links and the list of .md file paths.
#[tauri::command]
pub fn scan_wiki_links(folder: String) -> Result<WikiScanResult, AppError> {
    let root = validate_directory(&folder)?;
    let md_files = collect_md_files(&root);

    let mut links: Vec<WikiLink> = Vec::new();
    let mut files: Vec<String> = Vec::new();

    for md_path in &md_files {
        let path_str = md_path.to_string_lossy().into_owned();
        files.push(path_str.clone());

        if let Ok(content) = fs::read_to_string(md_path) {
            for cap in WIKI_LINK_RE.captures_iter(&content) {
                let inner = cap[1].to_string();
                let (target, alias) = if let Some(pos) = inner.find('|') {
                    (
                        inner[..pos].trim().to_string(),
                        Some(inner[pos + 1..].trim().to_string()),
                    )
                } else {
                    (inner.trim().to_string(), None)
                };

                links.push(WikiLink {
                    source_file: path_str.clone(),
                    target,
                    alias,
                });
            }
        }
    }

    Ok(WikiScanResult { links, files })
}
