use crate::{
    error::{AppError, Result},
    state::AppState,
    vault::models::AuthType,
};
use serde::Serialize;
use std::path::Path;
use tauri::State;
use tokio::{fs::File, io::{AsyncReadExt, AsyncWriteExt}, task::spawn_blocking};
use uuid::Uuid;

/// 50 MiB — files larger than this will not be opened in the system editor.
const MAX_EDITOR_FILE_SIZE: u64 = 50 * 1024 * 1024;
/// 1 GiB — files larger than this cannot be saved-as downloaded in one shot.
const MAX_DOWNLOAD_FILE_SIZE: u64 = 1024 * 1024 * 1024;

#[derive(Debug, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<u64>,
}

/// Open an SFTP session to a host and return the session_id.
#[tauri::command]
pub async fn sftp_connect(
    host_id: String,
    state: State<'_, AppState>,
) -> Result<String> {
    let (hostname, port, username, auth_type, secret) = {
        let lock = state.vault.lock().await;
        let vault = lock.as_ref().ok_or(AppError::VaultLocked)?;
        let host = vault.get_host(&host_id)?;
        let secret = host
            .encrypted_secret
            .as_deref()
            .map(|es| vault.decrypt_secret(es))
            .transpose()?;
        (
            host.hostname.clone(),
            host.port,
            host.username.clone(),
            host.auth_type.clone(),
            secret,
        )
    };

    let (password, key_pem) = match auth_type {
        AuthType::Password => (secret, None),
        AuthType::Key => {
            let key_id = secret.ok_or_else(|| AppError::Ssh("No key selected".into()))?;
            let lock = state.vault.lock().await;
            let pem = lock
                .as_ref()
                .ok_or(AppError::VaultLocked)?
                .decrypt_private_key(&key_id)?;
            (None, Some(pem))
        }
        AuthType::Agent => (None, None),
    };

    let handle = crate::ssh::connect(
        &hostname,
        port,
        &username,
        password.as_deref(),
        key_pem.as_deref(),
    )
    .await?;

    let session_id = Uuid::new_v4().to_string();
    state
        .sessions
        .lock()
        .await
        .open_sftp(session_id.clone(), host_id, handle)
        .await?;

    Ok(session_id)
}

#[tauri::command]
pub async fn sftp_disconnect(session_id: String, state: State<'_, AppState>) -> Result<()> {
    state.sessions.lock().await.close_sftp(&session_id).await
}

#[tauri::command]
pub async fn sftp_list_dir(
    session_id: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<Vec<FileEntry>> {
    let mut sessions = state.sessions.lock().await;
    let sftp = sessions.get_sftp_mut(&session_id)?;

    let entries = sftp
        .read_dir(&path)
        .await
        .map_err(|e| AppError::Sftp(e.to_string()))?;

    let base = path.trim_end_matches('/');
    let result = entries
        .into_iter()
        .map(|e| {
            let meta = e.metadata();
            let name = e.file_name().to_string();
            FileEntry {
                path: format!("{base}/{name}"),
                is_dir: meta.is_dir(),
                size: meta.size.unwrap_or(0),
                modified: meta.mtime.map(|t| t as u64),
                name,
            }
        })
        .collect();

    Ok(result)
}

#[tauri::command]
pub async fn sftp_download(
    session_id: String,
    remote_path: String,
    local_path: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut sessions = state.sessions.lock().await;
    let sftp = sessions.get_sftp_mut(&session_id)?;

    let mut remote_file = sftp
        .open(&remote_path)
        .await
        .map_err(|e| AppError::Sftp(e.to_string()))?;

    let mut buf = Vec::new();
    remote_file
        .take(MAX_DOWNLOAD_FILE_SIZE + 1)
        .read_to_end(&mut buf)
        .await
        .map_err(|e| AppError::Sftp(e.to_string()))?;
    if buf.len() as u64 > MAX_DOWNLOAD_FILE_SIZE {
        return Err(AppError::Sftp(format!(
            "File exceeds download limit ({} GiB)",
            MAX_DOWNLOAD_FILE_SIZE / (1024 * 1024 * 1024)
        )));
    }

    tokio::fs::write(&local_path, &buf).await?;
    Ok(())
}

#[tauri::command]
pub async fn sftp_upload(
    session_id: String,
    local_path: String,
    remote_path: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let data = tokio::fs::read(&local_path).await?;

    let mut sessions = state.sessions.lock().await;
    let sftp = sessions.get_sftp_mut(&session_id)?;

    let mut remote_file = sftp
        .create(&remote_path)
        .await
        .map_err(|e| AppError::Sftp(e.to_string()))?;

    remote_file
        .write_all(&data)
        .await
        .map_err(|e| AppError::Sftp(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn sftp_mkdir(
    session_id: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut sessions = state.sessions.lock().await;
    let sftp = sessions.get_sftp_mut(&session_id)?;
    sftp.create_dir(&path)
        .await
        .map_err(|e| AppError::Sftp(e.to_string()))
}

#[tauri::command]
pub async fn sftp_delete(
    session_id: String,
    path: String,
    is_dir: bool,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut sessions = state.sessions.lock().await;
    let sftp = sessions.get_sftp_mut(&session_id)?;
    if is_dir {
        sftp.remove_dir(&path)
            .await
            .map_err(|e| AppError::Sftp(e.to_string()))
    } else {
        sftp.remove_file(&path)
            .await
            .map_err(|e| AppError::Sftp(e.to_string()))
    }
}

#[tauri::command]
pub async fn sftp_rename(
    session_id: String,
    old_path: String,
    new_path: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut sessions = state.sessions.lock().await;
    let sftp = sessions.get_sftp_mut(&session_id)?;
    sftp.rename(&old_path, &new_path)
        .await
        .map_err(|e| AppError::Sftp(e.to_string()))
}

/// Download a remote file to the OS temp directory and open it with the system default app.
#[tauri::command]
pub async fn sftp_open_in_editor(
    session_id: String,
    remote_path: String,
    state: State<'_, AppState>,
) -> Result<String> {
    let normalized_remote_path = remote_path.replace('\\', "/");
    let filename = Path::new(&normalized_remote_path)
        .file_name()
        .and_then(|s| s.to_str())
        .filter(|s| !s.is_empty() && !s.contains('/') && !s.contains('\\'))
        .unwrap_or("file");

    let unique_name = format!("{filename}-{}", Uuid::new_v4().simple());
    let local_path = std::env::temp_dir().join(unique_name);
    let temp_path = local_path.with_extension("part");

    let buf = {
        let mut sessions = state.sessions.lock().await;
        let sftp = sessions.get_sftp_mut(&session_id)?;
        let mut remote_file = sftp
            .open(&remote_path)
            .await
            .map_err(|e| AppError::Sftp(e.to_string()))?;
        let mut buf = Vec::new();
        remote_file
            .take(MAX_EDITOR_FILE_SIZE + 1)
            .read_to_end(&mut buf)
            .await
            .map_err(|e| AppError::Sftp(e.to_string()))?;
        if buf.len() as u64 > MAX_EDITOR_FILE_SIZE {
            return Err(AppError::Sftp(format!(
                "File too large to open in editor (max {} MiB)",
                MAX_EDITOR_FILE_SIZE / (1024 * 1024)
            )));
        }
        buf
    };

    let mut temp_file = File::create(&temp_path).await?;
    temp_file.write_all(&buf).await?;
    temp_file.sync_all().await?;
    drop(temp_file);

    tokio::fs::rename(&temp_path, &local_path).await?;

    let open_target = local_path.clone();
    spawn_blocking(move || open::that(&open_target))
        .await
        .map_err(|e| AppError::ExternalOpen(format!("Open task join error: {e}")))?
        .map_err(|e| AppError::ExternalOpen(e.to_string()))?;

    Ok(local_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn sftp_cleanup_temp_file(local_path: String) -> Result<()> {
    let path = std::path::PathBuf::from(&local_path);
    let temp_dir = std::env::temp_dir();
    // Canonicalize both paths to resolve symlinks and prevent traversal
    let canonical = tokio::fs::canonicalize(&path).await.unwrap_or(path.clone());
    let canonical_temp = std::fs::canonicalize(&temp_dir).unwrap_or(temp_dir);
    if !canonical.starts_with(&canonical_temp) {
        return Err(AppError::Io(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            "Refusing to delete file outside temp directory",
        )));
    }
    match tokio::fs::remove_file(&canonical).await {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(AppError::Io(e)),
    }
}
