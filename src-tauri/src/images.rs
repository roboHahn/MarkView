use base64::Engine as _;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

use crate::error::AppError;
use crate::utils::{is_markdown_file, validate_directory};

/// Image file extensions we consider for scanning.
const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "svg", "webp"];

#[derive(Serialize, Clone)]
pub struct ImageInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub extension: String,
    pub used_in: Vec<String>, // list of .md files that reference this image
}

/// Scan a folder for image files and check which .md files reference them.
///
/// Streams through markdown files one at a time to avoid loading everything
/// into RAM simultaneously.
#[tauri::command]
pub fn scan_images(folder: String) -> Result<Vec<ImageInfo>, AppError> {
    let root = validate_directory(&folder)?;

    // Collect all entries in one pass so we can separate images and md files.
    let entries: Vec<walkdir::DirEntry> = WalkDir::new(&root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .collect();

    let mut image_paths: Vec<PathBuf> = Vec::new();
    let mut md_paths: Vec<PathBuf> = Vec::new();

    for entry in &entries {
        let path = entry.path();
        if let Some(ext) = path.extension() {
            let ext_lower = ext.to_string_lossy().to_lowercase();
            if IMAGE_EXTENSIONS.contains(&ext_lower.as_str()) {
                image_paths.push(path.to_path_buf());
            } else if is_markdown_file(path) {
                md_paths.push(path.to_path_buf());
            }
        }
    }

    // Collect all image names first so we can search efficiently.
    let image_names: Vec<String> = image_paths
        .iter()
        .map(|p| {
            p.file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default()
        })
        .collect();

    // Stream through markdown files one at a time instead of loading all at once.
    // For each markdown file, check which image names it references.
    // Build a map: image_index -> vec of md paths that reference it.
    let mut used_in_map: Vec<Vec<String>> = vec![Vec::new(); image_names.len()];

    for md_path in &md_paths {
        let content = match fs::read_to_string(md_path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let md_path_str = md_path.to_string_lossy().into_owned();

        for (i, img_name) in image_names.iter().enumerate() {
            if content.contains(img_name.as_str()) {
                used_in_map[i].push(md_path_str.clone());
            }
        }
    }

    // Build results.
    let mut results: Vec<ImageInfo> = Vec::with_capacity(image_paths.len());

    for (i, img_path) in image_paths.iter().enumerate() {
        let extension = img_path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        let size = fs::metadata(img_path).map(|m| m.len()).unwrap_or(0);

        results.push(ImageInfo {
            path: img_path.to_string_lossy().into_owned(),
            name: image_names[i].clone(),
            size,
            extension,
            used_in: std::mem::take(&mut used_in_map[i]),
        });
    }

    results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(results)
}

/// Read an image file and return its base64 representation as a data URI.
#[tauri::command]
pub fn get_image_base64(path: String) -> Result<String, AppError> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(AppError::NotFound(path));
    }

    let data = fs::read(&file_path)?;

    let extension = file_path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let mime = match extension.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        _ => return Err(AppError::Other(format!("Unsupported image extension: {}", extension))),
    };

    let encoded = base64::engine::general_purpose::STANDARD.encode(&data);

    Ok(format!("data:{};base64,{}", mime, encoded))
}

/// Delete an image file from disk.
#[tauri::command]
pub fn delete_image(path: String) -> Result<(), AppError> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(AppError::NotFound(path));
    }

    fs::remove_file(&file_path)?;
    Ok(())
}
