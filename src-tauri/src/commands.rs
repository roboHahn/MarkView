use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub children: Option<Vec<FileEntry>>,
}

/// Recursively reads a directory and returns a tree of `.md` files and
/// directories that (transitively) contain `.md` files.
/// Directories come first, then files, both sorted alphabetically.
#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }

    // Collect every .md file path found under `root`.
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

    if md_files.is_empty() {
        return Ok(Vec::new());
    }

    // Build a set of all directories that should be kept because they sit
    // on the path between `root` and at least one .md file.
    let mut keep_dirs: std::collections::HashSet<PathBuf> = std::collections::HashSet::new();
    for file in &md_files {
        let mut ancestor = file.parent();
        while let Some(dir) = ancestor {
            if dir == root || keep_dirs.contains(dir) {
                keep_dirs.insert(dir.to_path_buf());
                break;
            }
            keep_dirs.insert(dir.to_path_buf());
            ancestor = dir.parent();
        }
    }

    fn build_tree(
        dir: &Path,
        keep_dirs: &std::collections::HashSet<PathBuf>,
    ) -> Vec<FileEntry> {
        let mut entries: Vec<FileEntry> = Vec::new();

        let mut children: Vec<fs::DirEntry> = match fs::read_dir(dir) {
            Ok(rd) => rd.filter_map(|e| e.ok()).collect(),
            Err(_) => return entries,
        };

        // Sort alphabetically by file name (case-insensitive).
        children.sort_by(|a, b| {
            a.file_name()
                .to_string_lossy()
                .to_lowercase()
                .cmp(&b.file_name().to_string_lossy().to_lowercase())
        });

        let mut dirs: Vec<FileEntry> = Vec::new();
        let mut files: Vec<FileEntry> = Vec::new();

        for child in children {
            let child_path = child.path();
            let name = child
                .file_name()
                .to_string_lossy()
                .to_string();

            if child_path.is_dir() {
                if keep_dirs.contains(&child_path) {
                    let sub = build_tree(&child_path, keep_dirs);
                    dirs.push(FileEntry {
                        name,
                        path: child_path.to_string_lossy().to_string(),
                        is_directory: true,
                        children: Some(sub),
                    });
                }
            } else if child_path.is_file() {
                let is_md = child_path
                    .extension()
                    .map(|ext| ext.eq_ignore_ascii_case("md"))
                    .unwrap_or(false);
                if is_md {
                    files.push(FileEntry {
                        name,
                        path: child_path.to_string_lossy().to_string(),
                        is_directory: false,
                        children: None,
                    });
                }
            }
        }

        // Directories first, then files (both already alphabetical).
        entries.extend(dirs);
        entries.extend(files);
        entries
    }

    Ok(build_tree(&root, &keep_dirs))
}

/// Reads a file's content as a UTF-8 string.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read '{}': {}", path, e))
}

/// Writes `content` to the file at `path`, creating parent directories if needed.
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let file_path = PathBuf::from(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories for '{}': {}", path, e))?;
    }
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write '{}': {}", path, e))
}
