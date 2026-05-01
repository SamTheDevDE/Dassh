use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuthType {
    Password,
    Key,
    Agent,
}

/// A host entry stored in the vault.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Host {
    pub id: String,
    pub name: String,
    pub hostname: String,
    pub port: u16,
    pub username: String,
    pub auth_type: AuthType,
    /// For Password auth: encrypted password.
    /// For Key auth: encrypted key_id referencing a SshKey in the vault.
    pub encrypted_secret: Option<String>,
    pub tags: Vec<String>,
    /// Future: bastion jump host id
    pub jump_host_id: Option<String>,
}

/// Safe key metadata exposed to the frontend — no private key material.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKeyInfo {
    pub id: String,
    pub name: String,
    pub key_type: String,
    pub public_key: String,
    pub fingerprint: String,
}

/// Full SSH key record stored in the vault (private key is always encrypted).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKey {
    pub id: String,
    pub name: String,
    pub key_type: String,
    pub public_key: String,
    pub fingerprint: String,
    /// ChaCha20Poly1305-encrypted PEM private key, base64-encoded.
    pub encrypted_private_key: String,
}

impl SshKey {
    pub fn to_info(&self) -> SshKeyInfo {
        SshKeyInfo {
            id: self.id.clone(),
            name: self.name.clone(),
            key_type: self.key_type.clone(),
            public_key: self.public_key.clone(),
            fingerprint: self.fingerprint.clone(),
        }
    }
}

/// Decrypted vault contents — lives in memory only while unlocked.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VaultData {
    pub version: u32,
    pub hosts: Vec<Host>,
    pub keys: Vec<SshKey>,
}

/// On-disk vault file format.
#[derive(Debug, Serialize, Deserialize)]
pub struct VaultFile {
    pub version: u32,
    /// Argon2 salt, base64-encoded.
    pub salt: String,
    /// ChaCha20Poly1305-encrypted JSON of VaultData, base64-encoded.
    pub encrypted_data: String,
}
