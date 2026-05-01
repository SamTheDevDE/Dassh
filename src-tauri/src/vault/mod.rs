pub mod models;

use crate::{
    crypto,
    error::{AppError, Result},
};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use models::{Host, SshKey, SshKeyInfo, VaultData, VaultFile};
use std::path::PathBuf;

pub struct Vault {
    key: [u8; 32],
    data: VaultData,
    path: PathBuf,
}

impl Vault {
    pub fn vault_path() -> Result<PathBuf> {
        let dir = dirs::data_local_dir()
            .ok_or_else(|| AppError::Vault("Cannot locate app data directory".into()))?
            .join("dash-ssh");
        std::fs::create_dir_all(&dir)?;
        Ok(dir.join("vault.json"))
    }

    pub fn exists() -> bool {
        Self::vault_path().map(|p| p.exists()).unwrap_or(false)
    }

    pub fn create(password: &str) -> Result<Self> {
        let salt = crypto::generate_salt();
        let key = crypto::derive_key(password, &salt)?;
        let data = VaultData { version: 1, ..Default::default() };
        let vault = Vault { key, data, path: Self::vault_path()? };
        vault.save_with_salt(&salt)?;
        Ok(vault)
    }

    pub fn unlock(password: &str) -> Result<Self> {
        let path = Self::vault_path()?;
        if !path.exists() {
            return Err(AppError::VaultNotFound);
        }
        let raw = std::fs::read_to_string(&path)?;
        let file: VaultFile = serde_json::from_str(&raw)?;

        let salt_bytes = B64
            .decode(&file.salt)
            .map_err(|e| AppError::Crypto(e.to_string()))?;
        let salt: [u8; 32] = salt_bytes
            .try_into()
            .map_err(|_| AppError::Crypto("Invalid salt length".into()))?;

        let key = crypto::derive_key(password, &salt)?;
        let plain = crypto::decrypt(&key, &file.encrypted_data)?;
        let data: VaultData = serde_json::from_slice(&plain)?;

        Ok(Vault { key, data, path })
    }

    pub fn save(&self) -> Result<()> {
        let raw = std::fs::read_to_string(&self.path)?;
        let file: VaultFile = serde_json::from_str(&raw)?;
        let salt_bytes = B64
            .decode(&file.salt)
            .map_err(|e| AppError::Crypto(e.to_string()))?;
        let salt: [u8; 32] = salt_bytes
            .try_into()
            .map_err(|_| AppError::Crypto("Invalid salt".into()))?;
        self.save_with_salt(&salt)
    }

    fn save_with_salt(&self, salt: &[u8; 32]) -> Result<()> {
        let json = serde_json::to_string(&self.data)?;
        let encrypted = crypto::encrypt(&self.key, json.as_bytes())?;
        let out = serde_json::to_string_pretty(&VaultFile {
            version: 1,
            salt: B64.encode(salt),
            encrypted_data: encrypted,
        })?;
        std::fs::write(&self.path, out)?;
        Ok(())
    }

    // ── Hosts ────────────────────────────────────────────────────────────

    pub fn hosts(&self) -> &[Host] {
        &self.data.hosts
    }

    pub fn get_host(&self, id: &str) -> Result<&Host> {
        self.data
            .hosts
            .iter()
            .find(|h| h.id == id)
            .ok_or_else(|| AppError::HostNotFound(id.into()))
    }

    pub fn add_host(&mut self, host: Host) -> Result<()> {
        self.data.hosts.push(host);
        self.save()
    }

    pub fn update_host(&mut self, updated: Host) -> Result<()> {
        let pos = self
            .data
            .hosts
            .iter()
            .position(|h| h.id == updated.id)
            .ok_or_else(|| AppError::HostNotFound(updated.id.clone()))?;
        self.data.hosts[pos] = updated;
        self.save()
    }

    pub fn delete_host(&mut self, id: &str) -> Result<()> {
        let before = self.data.hosts.len();
        self.data.hosts.retain(|h| h.id != id);
        if self.data.hosts.len() == before {
            return Err(AppError::HostNotFound(id.into()));
        }
        self.save()
    }

    // ── Keys ─────────────────────────────────────────────────────────────

    pub fn keys(&self) -> Vec<SshKeyInfo> {
        self.data.keys.iter().map(|k| k.to_info()).collect()
    }

    pub fn add_key(&mut self, key: SshKey) -> Result<SshKeyInfo> {
        let info = key.to_info();
        self.data.keys.push(key);
        self.save()?;
        Ok(info)
    }

    pub fn delete_key(&mut self, id: &str) -> Result<()> {
        self.data.keys.retain(|k| k.id != id);
        self.save()
    }

    /// Decrypt the private key PEM for the given key id.
    pub fn decrypt_private_key(&self, id: &str) -> Result<String> {
        let k = self
            .data
            .keys
            .iter()
            .find(|k| k.id == id)
            .ok_or_else(|| AppError::Key(format!("Key not found: {id}")))?;
        let bytes = crypto::decrypt(&self.key, &k.encrypted_private_key)?;
        String::from_utf8(bytes).map_err(|e| AppError::Key(e.to_string()))
    }

    /// Encrypt an arbitrary plaintext secret with the vault key.
    pub fn encrypt_secret(&self, s: &str) -> Result<String> {
        crypto::encrypt(&self.key, s.as_bytes())
    }

    /// Decrypt a secret previously encrypted with encrypt_secret.
    pub fn decrypt_secret(&self, enc: &str) -> Result<String> {
        let bytes = crypto::decrypt(&self.key, enc)?;
        String::from_utf8(bytes).map_err(|e| AppError::Crypto(e.to_string()))
    }
}
