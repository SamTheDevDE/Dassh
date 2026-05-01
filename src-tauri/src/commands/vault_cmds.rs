use crate::{
    error::{AppError, Result},
    state::AppState,
    vault::models::{AuthType, Host, SshKeyInfo},
};
use russh_keys::PublicKeyBase64;
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct HostInput {
    pub name: String,
    pub hostname: String,
    pub port: u16,
    pub username: String,
    pub auth_type: AuthType,
    /// Plaintext password OR key id — encrypted before storage.
    pub secret: Option<String>,
    pub tags: Vec<String>,
    pub jump_host_id: Option<String>,
}

#[tauri::command]
pub fn vault_exists() -> bool {
    crate::vault::Vault::exists()
}

#[tauri::command]
pub async fn vault_create(password: String, state: State<'_, AppState>) -> Result<()> {
    let vault = crate::vault::Vault::create(&password)?;
    *state.vault.lock().await = Some(vault);
    Ok(())
}

#[tauri::command]
pub async fn vault_unlock(password: String, state: State<'_, AppState>) -> Result<()> {
    let vault = crate::vault::Vault::unlock(&password)?;
    *state.vault.lock().await = Some(vault);
    Ok(())
}

#[tauri::command]
pub async fn vault_lock(state: State<'_, AppState>) -> Result<()> {
    *state.vault.lock().await = None;
    Ok(())
}

#[tauri::command]
pub async fn vault_is_locked(state: State<'_, AppState>) -> Result<bool> {
    Ok(state.vault.lock().await.is_none())
}

#[tauri::command]
pub async fn get_hosts(state: State<'_, AppState>) -> Result<Vec<Host>> {
    let lock = state.vault.lock().await;
    Ok(lock.as_ref().ok_or(AppError::VaultLocked)?.hosts().to_vec())
}

#[tauri::command]
pub async fn add_host(input: HostInput, state: State<'_, AppState>) -> Result<Host> {
    let mut lock = state.vault.lock().await;
    let vault = lock.as_mut().ok_or(AppError::VaultLocked)?;

    let encrypted_secret = input
        .secret
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(|s| vault.encrypt_secret(s))
        .transpose()?;

    let host = Host {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        hostname: input.hostname,
        port: input.port,
        username: input.username,
        auth_type: input.auth_type,
        encrypted_secret,
        tags: input.tags,
        jump_host_id: input.jump_host_id,
    };

    let result = host.clone();
    vault.add_host(host)?;
    Ok(result)
}

#[tauri::command]
pub async fn update_host(host: Host, state: State<'_, AppState>) -> Result<()> {
    let mut lock = state.vault.lock().await;
    lock.as_mut().ok_or(AppError::VaultLocked)?.update_host(host)
}

#[tauri::command]
pub async fn delete_host(id: String, state: State<'_, AppState>) -> Result<()> {
    let mut lock = state.vault.lock().await;
    lock.as_mut().ok_or(AppError::VaultLocked)?.delete_host(&id)
}

#[tauri::command]
pub async fn get_keys(state: State<'_, AppState>) -> Result<Vec<SshKeyInfo>> {
    let lock = state.vault.lock().await;
    Ok(lock.as_ref().ok_or(AppError::VaultLocked)?.keys())
}

#[tauri::command]
pub async fn generate_key(name: String, state: State<'_, AppState>) -> Result<SshKeyInfo> {
    let mut lock = state.vault.lock().await;
    let vault = lock.as_mut().ok_or(AppError::VaultLocked)?;

    let kp = russh_keys::key::KeyPair::generate_ed25519()
        .ok_or_else(|| AppError::Key("Ed25519 key generation failed".into()))?;

    let pub_key = kp
        .clone_public_key()
        .map_err(|e| AppError::Key(e.to_string()))?;

    let fingerprint = pub_key.fingerprint();

    // Serialize public key as "ssh-ed25519 <base64>"
    let pub_str = format!("ssh-ed25519 {}", pub_key.public_key_base64());

    // Serialize private key to OpenSSH PEM
    let mut pem_buf: Vec<u8> = Vec::new();
    russh_keys::encode_pkcs8_pem(&kp, &mut pem_buf)
        .map_err(|e| AppError::Key(e.to_string()))?;
    let pem = String::from_utf8(pem_buf).map_err(|e| AppError::Key(e.to_string()))?;

    let encrypted_private_key = vault.encrypt_secret(&pem)?;

    vault.add_key(crate::vault::models::SshKey {
        id: Uuid::new_v4().to_string(),
        name,
        key_type: "ed25519".into(),
        public_key: pub_str,
        fingerprint,
        encrypted_private_key,
    })
}

#[tauri::command]
pub async fn import_key(name: String, pem: String, state: State<'_, AppState>) -> Result<SshKeyInfo> {
    let mut lock = state.vault.lock().await;
    let vault = lock.as_mut().ok_or(AppError::VaultLocked)?;

    let kp = russh_keys::decode_secret_key(&pem, None)
        .map_err(|e| AppError::Key(e.to_string()))?;

    let pub_key = kp
        .clone_public_key()
        .map_err(|e| AppError::Key(e.to_string()))?;

    let fingerprint = pub_key.fingerprint();
    let key_type = match &kp {
        russh_keys::key::KeyPair::Ed25519(_) => "ed25519",
        russh_keys::key::KeyPair::RSA { .. } => "rsa",
        russh_keys::key::KeyPair::EC { .. } => "ecdsa",
    };
    let pub_str = format!("ssh-{key_type} {}", pub_key.public_key_base64());
    let encrypted_private_key = vault.encrypt_secret(&pem)?;

    vault.add_key(crate::vault::models::SshKey {
        id: Uuid::new_v4().to_string(),
        name,
        key_type: key_type.into(),
        public_key: pub_str,
        fingerprint,
        encrypted_private_key,
    })
}

#[tauri::command]
pub async fn delete_key(id: String, state: State<'_, AppState>) -> Result<()> {
    let mut lock = state.vault.lock().await;
    lock.as_mut().ok_or(AppError::VaultLocked)?.delete_key(&id)
}
