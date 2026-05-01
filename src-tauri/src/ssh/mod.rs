pub mod manager;

use crate::error::{AppError, Result};
use russh::client;
use russh_keys::key::PublicKey;
use std::sync::Arc;

pub struct DashHandler;

#[async_trait::async_trait]
impl client::Handler for DashHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &PublicKey,
    ) -> std::result::Result<bool, Self::Error> {
        // TODO: implement known_hosts verification before 1.0
        Ok(true)
    }
}

pub type SshHandle = client::Handle<DashHandler>;

/// Connect and authenticate. Returns an authenticated SSH handle.
pub async fn connect(
    hostname: &str,
    port: u16,
    username: &str,
    password: Option<&str>,
    private_key_pem: Option<&str>,
) -> Result<SshHandle> {
    let config = Arc::new(client::Config {
        inactivity_timeout: Some(std::time::Duration::from_secs(300)),
        ..<_>::default()
    });

    let mut handle =
        client::connect(config, format!("{hostname}:{port}"), DashHandler)
            .await
            .map_err(|e| AppError::Ssh(e.to_string()))?;

    let authed = if let Some(pem) = private_key_pem {
        let kp = russh_keys::decode_secret_key(pem, None)
            .map_err(|e| AppError::Key(e.to_string()))?;
        handle
            .authenticate_publickey(username, Arc::new(kp))
            .await
            .map_err(|e| AppError::Ssh(e.to_string()))?
    } else if let Some(pass) = password {
        handle
            .authenticate_password(username, pass)
            .await
            .map_err(|e| AppError::Ssh(e.to_string()))?
    } else {
        return Err(AppError::Ssh("No authentication method provided".into()));
    };

    if !authed {
        return Err(AppError::Ssh(
            "Authentication failed — check credentials".into(),
        ));
    }

    Ok(handle)
}
