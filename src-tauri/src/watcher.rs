use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::utils::is_markdown_file;

#[derive(Serialize, Clone)]
pub struct FileChangeEvent {
    pub path: String,
    pub change_type: String, // "modified", "created", "deleted"
}

static WATCHER_RUNNING: Mutex<bool> = Mutex::new(false);

/// Helper to read the watcher flag safely even if the mutex was poisoned.
fn is_running() -> bool {
    match WATCHER_RUNNING.lock() {
        Ok(guard) => *guard,
        Err(poisoned) => *poisoned.into_inner(),
    }
}

/// Helper to set the watcher flag safely even if the mutex was poisoned.
fn set_running(val: bool) {
    match WATCHER_RUNNING.lock() {
        Ok(mut guard) => *guard = val,
        Err(poisoned) => *poisoned.into_inner() = val,
    }
}

/// Starts polling the given `folder` for `.md` file changes every 2 seconds.
/// Any previous watcher is stopped before starting a new one.
/// Detected changes are emitted as a `file-changes` event to the frontend.
#[tauri::command]
pub fn start_watching(app: AppHandle, folder: String) -> Result<(), String> {
    // Stop any existing watcher
    set_running(false);

    // Give the old thread a moment to exit
    thread::sleep(Duration::from_millis(100));

    // Mark the new watcher as running
    set_running(true);

    thread::spawn(move || {
        let mut file_hashes: HashMap<String, u64> = HashMap::new();

        // Initial scan to capture baseline state
        scan_files(&folder, &mut file_hashes);

        loop {
            if !is_running() {
                break;
            }

            thread::sleep(Duration::from_secs(2));

            let mut changes: Vec<FileChangeEvent> = Vec::new();
            let mut current_files: HashMap<String, u64> = HashMap::new();

            scan_files(&folder, &mut current_files);

            // Check for modifications and new files
            for (path, hash) in &current_files {
                match file_hashes.get(path) {
                    Some(old_hash) if old_hash != hash => {
                        changes.push(FileChangeEvent {
                            path: path.clone(),
                            change_type: "modified".to_string(),
                        });
                    }
                    None => {
                        changes.push(FileChangeEvent {
                            path: path.clone(),
                            change_type: "created".to_string(),
                        });
                    }
                    _ => {}
                }
            }

            // Check for deleted files
            for path in file_hashes.keys() {
                if !current_files.contains_key(path) {
                    changes.push(FileChangeEvent {
                        path: path.clone(),
                        change_type: "deleted".to_string(),
                    });
                }
            }

            if !changes.is_empty() {
                let _ = app.emit("file-changes", changes);
            }

            file_hashes = current_files;
        }
    });

    Ok(())
}

/// Stops the background file-watching thread.
#[tauri::command]
pub fn stop_watching() -> Result<(), String> {
    set_running(false);
    Ok(())
}

/// Walks `folder` recursively and records every `.md` file together with a
/// simple hash derived from its size and last-modified timestamp.
fn scan_files(folder: &str, files: &mut HashMap<String, u64>) {
    for entry in walkdir::WalkDir::new(folder)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() && is_markdown_file(entry.path()) {
            let path = entry.path().to_string_lossy().into_owned();
            if let Ok(metadata) = fs::metadata(entry.path()) {
                let hash = metadata.len()
                    ^ metadata
                        .modified()
                        .map(|t| {
                            t.duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_secs()
                        })
                        .unwrap_or(0);
                files.insert(path, hash);
            }
        }
    }
}
