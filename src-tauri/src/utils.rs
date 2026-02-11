use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::error::AppError;

/// Check whether `path` points to a markdown file (`.md` extension, case-insensitive).
pub fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .map(|ext| ext.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

/// Validate that `path` is an existing directory and return it as a `PathBuf`.
pub fn validate_directory(path: &str) -> Result<PathBuf, AppError> {
    let root = PathBuf::from(path);
    if !root.is_dir() {
        return Err(AppError::NotDirectory(path.to_string()));
    }
    Ok(root)
}

/// Recursively collect all `.md` file paths under `folder`.
pub fn collect_md_files(folder: &Path) -> Vec<PathBuf> {
    WalkDir::new(folder)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file() && is_markdown_file(e.path()))
        .map(|e| e.into_path())
        .collect()
}

/// Sanitize a filename to prevent path-traversal attacks.
///
/// Strips any directory components and rejects names that contain `..`.
/// Returns the clean basename or an error.
pub fn sanitize_filename(name: &str) -> Result<String, AppError> {
    // Take only the last path component (basename).
    let clean = Path::new(name)
        .file_name()
        .ok_or_else(|| AppError::PathTraversal(name.to_string()))?
        .to_string_lossy()
        .to_string();

    if clean.is_empty() || clean == ".." || clean == "." {
        return Err(AppError::PathTraversal(name.to_string()));
    }

    Ok(clean)
}
