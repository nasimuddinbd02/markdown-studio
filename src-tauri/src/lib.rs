mod commands;
mod error;
mod fs_ops;
mod scope;
mod storage;
mod text;

use commands::AppState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // Restores window size/position between launches (FR-003).
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let paths = app.path();
            let config_dir = paths.app_config_dir()?;
            let data_dir = paths.app_data_dir()?;
            let log_dir = paths.app_log_dir()?;
            let logger = storage::Logger::new(log_dir, paths.home_dir().ok());
            logger.log(
                "info",
                "app.start",
                &format!("{} {}", std::env::consts::OS, std::env::consts::ARCH),
            );
            let state = AppState {
                scope: scope::Scope::default(),
                logger,
                config_dir,
                data_dir,
                recents: Mutex::new(Vec::new()),
            };
            state.load_recents();
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::pick_open_file,
            commands::pick_open_folder,
            commands::pick_save_path,
            commands::list_recent,
            commands::open_recent,
            commands::remove_recent,
            commands::list_dir,
            commands::read_text_file,
            commands::write_text_file,
            commands::file_mtime,
            commands::create_file,
            commands::create_folder,
            commands::rename_path,
            commands::delete_path,
            commands::read_image,
            commands::open_external,
            commands::export_file,
            commands::load_settings,
            commands::save_settings,
            commands::load_recovery,
            commands::save_recovery,
            commands::clear_recovery,
            commands::log_event,
            commands::export_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Markdown Studio");
}
