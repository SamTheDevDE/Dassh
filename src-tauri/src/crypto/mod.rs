use crate::error::{AppError, Result};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    ChaCha20Poly1305, Key, Nonce,
};
use rand::RngCore;

/// Derive a 32-byte key from a master password + salt via Argon2id.
/// Salt is stored in plaintext in the vault file; it is not secret.
pub fn derive_key(password: &str, salt: &[u8; 32]) -> Result<[u8; 32]> {
    // 64 MiB memory, 3 iterations, 4 lanes — reasonable desktop defaults
    let params = Params::new(65536, 3, 4, Some(32))
        .map_err(|e| AppError::Crypto(e.to_string()))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| AppError::Crypto(e.to_string()))?;
    Ok(key)
}

pub fn generate_salt() -> [u8; 32] {
    let mut s = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut s);
    s
}

/// Encrypt `plaintext` and return `base64(nonce ‖ ciphertext)`.
pub fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<String> {
    let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
    let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);
    let mut out = nonce.to_vec();
    out.extend(
        cipher
            .encrypt(&nonce, plaintext)
            .map_err(|e| AppError::Crypto(e.to_string()))?,
    );
    Ok(B64.encode(&out))
}

/// Decrypt `base64(nonce ‖ ciphertext)` produced by `encrypt`.
pub fn decrypt(key: &[u8; 32], encoded: &str) -> Result<Vec<u8>> {
    let data = B64
        .decode(encoded)
        .map_err(|e| AppError::Crypto(e.to_string()))?;
    if data.len() < 12 {
        return Err(AppError::Crypto("Ciphertext too short".into()));
    }
    let (nonce_bytes, ct) = data.split_at(12);
    let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
    cipher
        .decrypt(Nonce::from_slice(nonce_bytes), ct)
        .map_err(|_| AppError::WrongPassword)
}
