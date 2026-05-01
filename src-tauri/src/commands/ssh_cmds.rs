use crate::{
    error::{AppError, Result},
    state::AppState,
    vault::models::AuthType,
};
use tauri::State;
use uuid::Uuid;

/// Resolve credentials from vault and open a terminal session.
/// Returns the new session_id.
#[tauri::command]
pub async fn connect_ssh(
    host_id: String,
    cols: u32,
    rows: u32,
    app: tauri::AppHandle,
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

    let (password, key_pem) = resolve_auth(&state, &auth_type, secret.as_deref()).await?;

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
        .open_terminal(app, session_id.clone(), host_id, handle, cols, rows)
        .await?;

    Ok(session_id)
}

#[tauri::command]
pub async fn get_session_buffer(session_id: String, state: State<'_, AppState>) -> Result<Vec<u8>> {
    state.sessions.lock().await.get_output_buffer(&session_id)
}

#[tauri::command]
pub async fn disconnect_ssh(session_id: String, state: State<'_, AppState>) -> Result<()> {
    state.sessions.lock().await.close_terminal(&session_id).await
}

#[tauri::command]
pub async fn send_input(
    session_id: String,
    data: Vec<u8>,
    state: State<'_, AppState>,
) -> Result<()> {
    state.sessions.lock().await.send_input(&session_id, data).await
}

#[tauri::command]
pub async fn resize_terminal(
    session_id: String,
    cols: u32,
    rows: u32,
    state: State<'_, AppState>,
) -> Result<()> {
    state
        .sessions
        .lock()
        .await
        .resize_terminal(&session_id, cols, rows)
        .await
}

// ── Helpers ───────────────────────────────────────────────────────────────

/// Convert an AuthType + decrypted secret into (password, pem) options.
async fn resolve_auth(
    state: &State<'_, AppState>,
    auth_type: &AuthType,
    secret: Option<&str>,
) -> Result<(Option<String>, Option<String>)> {
    match auth_type {
        AuthType::Password => Ok((secret.map(String::from), None)),
        AuthType::Key => {
            let key_id = secret.ok_or_else(|| AppError::Ssh("No key selected for host".into()))?;
            let lock = state.vault.lock().await;
            let pem = lock
                .as_ref()
                .ok_or(AppError::VaultLocked)?
                .decrypt_private_key(key_id)?;
            Ok((None, Some(pem)))
        }
        AuthType::Agent => Ok((None, None)), // TODO: SSH agent forwarding
    }
}
