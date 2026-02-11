use serde::Serialize;
use std::fs;

use crate::error::AppError;
use crate::utils::{collect_md_files, validate_directory};

#[derive(Serialize, Clone)]
pub struct SearchResult {
    pub file_path: String,
    pub file_name: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

/// Maximum number of results returned to avoid overwhelming the UI.
const MAX_RESULTS: usize = 500;

/// Recursively searches `.md` files under `folder` for lines containing `query`.
///
/// Returns a list of [`SearchResult`] entries sorted by file path then line number,
/// capped at 500 results. Unreadable files are silently skipped.
#[tauri::command]
pub fn search_files(
    folder: String,
    query: String,
    case_sensitive: bool,
) -> Result<Vec<SearchResult>, AppError> {
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let root = validate_directory(&folder)?;

    let search_query = if case_sensitive {
        query.clone()
    } else {
        query.to_lowercase()
    };

    let mut results: Vec<SearchResult> = Vec::new();

    let mut md_files = collect_md_files(&root);
    md_files.sort();

    'outer: for file_path in md_files {
        let content = match fs::read_to_string(&file_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let file_path_str = file_path.to_string_lossy().into_owned();
        let file_name = file_path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        for (line_idx, line) in content.lines().enumerate() {
            let haystack = if case_sensitive {
                line.to_string()
            } else {
                line.to_lowercase()
            };

            let mut search_start = 0;
            while let Some(pos) = haystack[search_start..].find(&search_query) {
                let match_start = search_start + pos;
                let match_end = match_start + query.len();

                results.push(SearchResult {
                    file_path: file_path_str.clone(),
                    file_name: file_name.clone(),
                    line_number: line_idx + 1,
                    line_content: line.to_string(),
                    match_start,
                    match_end,
                });

                if results.len() >= MAX_RESULTS {
                    break 'outer;
                }

                search_start = match_start + 1;
            }
        }
    }

    Ok(results)
}
