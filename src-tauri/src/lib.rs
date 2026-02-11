mod ai;
mod commands;
mod git;
mod images;
mod search;
mod watcher;
mod wiki;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_directory,
            commands::read_file,
            commands::write_file,
            commands::rename_file,
            commands::delete_file,
            commands::create_file,
            commands::save_image,
            commands::write_binary_file,
            search::search_files,
            git::git_status,
            git::git_diff,
            git::git_commit,
            watcher::start_watching,
            watcher::stop_watching,
            ai::ai_request,
            images::scan_images,
            images::get_image_base64,
            images::delete_image,
            wiki::scan_wiki_links,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
