use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::utils::{collect_md_files, is_markdown_file, sanitize_filename, validate_directory};

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
pub fn read_directory(path: String) -> Result<Vec<FileEntry>, AppError> {
    let root = validate_directory(&path)?;

    let md_files = collect_md_files(&root);
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
        let mut children: Vec<fs::DirEntry> = match fs::read_dir(dir) {
            Ok(rd) => rd.filter_map(|e| e.ok()).collect(),
            Err(_) => return Vec::new(),
        };

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
            let name = child.file_name().to_string_lossy().into_owned();

            if child_path.is_dir() {
                if keep_dirs.contains(&child_path) {
                    let sub = build_tree(&child_path, keep_dirs);
                    dirs.push(FileEntry {
                        name,
                        path: child_path.to_string_lossy().into_owned(),
                        is_directory: true,
                        children: Some(sub),
                    });
                }
            } else if child_path.is_file() && is_markdown_file(&child_path) {
                files.push(FileEntry {
                    name,
                    path: child_path.to_string_lossy().into_owned(),
                    is_directory: false,
                    children: None,
                });
            }
        }

        // Directories first, then files (both already alphabetical).
        dirs.extend(files);
        dirs
    }

    Ok(build_tree(&root, &keep_dirs))
}

/// Reads a file's content as a UTF-8 string.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, AppError> {
    fs::read_to_string(&path).map_err(AppError::from)
}

/// Writes `content` to the file at `path`, creating parent directories if needed.
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), AppError> {
    let file_path = PathBuf::from(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&file_path, content)?;
    Ok(())
}

/// Renames (or moves) a file from `old_path` to `new_path`.
#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) -> Result<(), AppError> {
    let source = PathBuf::from(&old_path);
    let dest = PathBuf::from(&new_path);

    if !source.exists() {
        return Err(AppError::NotFound(old_path));
    }
    if dest.exists() {
        return Err(AppError::AlreadyExists(new_path));
    }

    fs::rename(&source, &dest)?;
    Ok(())
}

/// Deletes the file at `path`.
#[tauri::command]
pub fn delete_file(path: String) -> Result<(), AppError> {
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(AppError::NotFound(path));
    }
    fs::remove_file(&file_path)?;
    Ok(())
}

/// Creates a new empty file at `path`.
#[tauri::command]
pub fn create_file(path: String) -> Result<(), AppError> {
    let file_path = PathBuf::from(&path);
    if file_path.exists() {
        return Err(AppError::AlreadyExists(path));
    }
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&file_path, "")?;
    Ok(())
}

/// Writes binary data to a file at `path`, creating parent directories if needed.
#[tauri::command]
pub fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), AppError> {
    let file_path = PathBuf::from(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&file_path, &data)?;
    Ok(())
}

/// Saves image data to `{folder}/assets/{filename}`.
/// The filename is sanitized to prevent path-traversal attacks.
/// Returns the full path of the saved image.
#[tauri::command]
pub fn save_image(folder: String, filename: String, data: Vec<u8>) -> Result<String, AppError> {
    let clean_name = sanitize_filename(&filename)?;
    let assets_dir = PathBuf::from(&folder).join("assets");

    fs::create_dir_all(&assets_dir)?;

    let file_path = assets_dir.join(&clean_name);

    fs::write(&file_path, &data)?;

    Ok(file_path.to_string_lossy().into_owned())
}
