mod commands;
mod crypto;
mod error;
mod ssh;
mod state;
mod vault;

use commands::{sftp_cmds::*, ssh_cmds::*, vault_cmds::*};
use state::AppState;
#[cfg(debug_assertions)]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            // vault
            vault_exists,
            vault_create,
            vault_unlock,
            vault_lock,
            vault_is_locked,
            get_hosts,
            add_host,
            update_host,
            delete_host,
            get_keys,
            generate_key,
            import_key,
            delete_key,
            // terminal
            connect_ssh,
            disconnect_ssh,
            get_session_buffer,
            send_input,
            resize_terminal,
            // sftp
            sftp_connect,
            sftp_disconnect,
            sftp_list_dir,
            sftp_download,
            sftp_upload,
            sftp_mkdir,
            sftp_delete,
            sftp_rename,
            sftp_open_in_editor,
            sftp_cleanup_temp_file,
        ])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            _app.get_webview_window("main")
                .unwrap()
                .open_devtools();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Dassh");
}
