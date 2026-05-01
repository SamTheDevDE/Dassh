use crate::{ssh::manager::SessionManager, vault::Vault};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub vault: Arc<Mutex<Option<Vault>>>,
    pub sessions: Arc<Mutex<SessionManager>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            vault: Arc::new(Mutex::new(None)),
            sessions: Arc::new(Mutex::new(SessionManager::new())),
        }
    }
}
