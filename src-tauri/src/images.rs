use base64::Engine as _;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

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
/// Walks the directory tree, collects all image files (png, jpg, jpeg, gif, svg, webp),
/// reads every `.md` file, and checks whether each image's filename appears in any
/// markdown file's content. Returns an `ImageInfo` for each image found.
#[tauri::command]
pub fn scan_images(folder: String) -> Result<Vec<ImageInfo>, String> {
    let root = PathBuf::from(&folder);
    if !root.is_dir() {
        return Err(format!("'{}' is not a directory", folder));
    }

    // Collect all entries in one pass so we can separate images and md files.
    let entries: Vec<walkdir::DirEntry> = WalkDir::new(&root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .collect();

    // Separate image files and markdown files.
    let mut image_paths: Vec<PathBuf> = Vec::new();
    let mut md_paths: Vec<PathBuf> = Vec::new();

    for entry in &entries {
        let path = entry.path();
        if let Some(ext) = path.extension() {
            let ext_lower = ext.to_string_lossy().to_lowercase();
            if IMAGE_EXTENSIONS.contains(&ext_lower.as_str()) {
                image_paths.push(path.to_path_buf());
            } else if ext.eq_ignore_ascii_case("md") {
                md_paths.push(path.to_path_buf());
            }
        }
    }

    // Read all markdown files into memory (path + content).
    let md_contents: Vec<(String, String)> = md_paths
        .iter()
        .filter_map(|p| {
            let content = fs::read_to_string(p).ok()?;
            Some((p.to_string_lossy().to_string(), content))
        })
        .collect();

    // Build ImageInfo for each image file.
    let mut results: Vec<ImageInfo> = Vec::new();

    for img_path in &image_paths {
        let name = img_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let extension = img_path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        let size = fs::metadata(img_path).map(|m| m.len()).unwrap_or(0);

        // Check which markdown files reference this image by filename.
        let used_in: Vec<String> = md_contents
            .iter()
            .filter(|(_md_path, content)| content.contains(&name))
            .map(|(md_path, _content)| md_path.clone())
            .collect();

        results.push(ImageInfo {
            path: img_path.to_string_lossy().to_string(),
            name,
            size,
            extension,
            used_in,
        });
    }

    // Sort by name for consistent ordering.
    results.sort_by(|a, b| {
        a.name
            .to_lowercase()
            .cmp(&b.name.to_lowercase())
    });

    Ok(results)
}

/// Read an image file and return its base64 representation as a data URI.
///
/// The returned string has the format `data:<mime>;base64,<encoded>`.
/// Supported MIME types: png, jpg/jpeg, gif, svg, webp.
#[tauri::command]
pub fn get_image_base64(path: String) -> Result<String, String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(format!("Image file '{}' does not exist", path));
    }

    let data = fs::read(&file_path)
        .map_err(|e| format!("Failed to read image '{}': {}", path, e))?;

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
        _ => return Err(format!("Unsupported image extension: {}", extension)),
    };

    let encoded = base64::engine::general_purpose::STANDARD.encode(&data);

    Ok(format!("data:{};base64,{}", mime, encoded))
}

/// Delete an image file from disk.
#[tauri::command]
pub fn delete_image(path: String) -> Result<(), String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(format!("Image file '{}' does not exist", path));
    }

    fs::remove_file(&file_path)
        .map_err(|e| format!("Failed to delete image '{}': {}", path, e))
}
