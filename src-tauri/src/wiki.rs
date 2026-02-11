use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

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
pub fn scan_wiki_links(folder: String) -> Result<WikiScanResult, String> {
    let root = PathBuf::from(&folder);
    if !root.is_dir() {
        return Err(format!("'{}' is not a directory", folder));
    }

    let md_files: Vec<PathBuf> = WalkDir::new(&root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file()
                && e.path()
                    .extension()
                    .map(|ext| ext.eq_ignore_ascii_case("md"))
                    .unwrap_or(false)
        })
        .map(|e| e.into_path())
        .collect();

    let mut links: Vec<WikiLink> = Vec::new();
    let mut files: Vec<String> = Vec::new();

    let re = regex::Regex::new(r"\[\[([^\]]+)\]\]").unwrap_or_else(|_| {
        // Fallback: this should never fail for this simple pattern
        regex::Regex::new(r"\[\[([^\]]+)\]\]").unwrap()
    });

    for md_path in &md_files {
        let path_str = md_path.to_string_lossy().to_string();
        files.push(path_str.clone());

        if let Ok(content) = fs::read_to_string(md_path) {
            for cap in re.captures_iter(&content) {
                let inner = cap[1].to_string();
                let (target, alias) = if let Some(pos) = inner.find('|') {
                    (inner[..pos].trim().to_string(), Some(inner[pos + 1..].trim().to_string()))
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
