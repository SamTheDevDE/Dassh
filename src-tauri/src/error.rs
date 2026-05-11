use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Vault does not exist — create one first")]
    VaultNotFound,
    #[error("Vault is locked")]
    VaultLocked,
    #[error("Wrong master password")]
    WrongPassword,
    #[error("Vault error: {0}")]
    Vault(String),
    #[error("SSH error: {0}")]
    Ssh(String),
    #[error("SFTP error: {0}")]
    Sftp(String),
    #[error("Open error: {0}")]
    ExternalOpen(String),
    #[error("Crypto error: {0}")]
    Crypto(String),
    #[error("Key error: {0}")]
    Key(String),
    #[error("Session not found: {0}")]
    SessionNotFound(String),
    #[error("Host not found: {0}")]
    HostNotFound(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

// Tauri commands must return serialisable errors.
impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
