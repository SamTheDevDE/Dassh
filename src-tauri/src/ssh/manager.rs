use crate::error::{AppError, Result};
use russh::ChannelMsg;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

/// Maximum bytes retained in the replay buffer per terminal session.
const MAX_OUTPUT_BUF: usize = 2 * 1024 * 1024; // 2 MiB

pub enum SessionInput {
    Data(Vec<u8>),
    Resize { cols: u32, rows: u32 },
    Close,
}

pub struct TerminalSession {
    #[allow(dead_code)]
    pub host_id: String,
    pub input_tx: mpsc::Sender<SessionInput>,
    /// All SSH output since the session opened; used to replay data that
    /// arrived before the frontend listener was registered.
    pub output_buf: Arc<Mutex<Vec<u8>>>,
}

pub struct SftpSession {
    #[allow(dead_code)]
    pub host_id: String,
    pub sftp: russh_sftp::client::SftpSession,
}

pub struct SessionManager {
    terminals: HashMap<String, TerminalSession>,
    sftp: HashMap<String, SftpSession>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            terminals: HashMap::new(),
            sftp: HashMap::new(),
        }
    }

    // ── Terminal ─────────────────────────────────────────────────────────

    pub async fn open_terminal(
        &mut self,
        app: AppHandle,
        session_id: String,
        host_id: String,
        handle: super::SshHandle,
        cols: u32,
        rows: u32,
    ) -> Result<()> {
        let channel = handle
            .channel_open_session()
            .await
            .map_err(|e| AppError::Ssh(e.to_string()))?;

        channel
            .request_pty(true, "xterm-256color", cols, rows, 0, 0, &[])
            .await
            .map_err(|e| AppError::Ssh(e.to_string()))?;

        channel
            .request_shell(true)
            .await
            .map_err(|e| AppError::Ssh(e.to_string()))?;

        let (input_tx, mut input_rx) = mpsc::channel::<SessionInput>(256);
        let sid = session_id.clone();
        let output_buf = Arc::new(Mutex::new(Vec::<u8>::new()));
        let buf_ref = output_buf.clone();

        tokio::spawn(async move {
            let mut channel = channel;
            loop {
                let mut pending: Option<SessionInput> = None;

                tokio::select! {
                    biased;
                    msg = channel.wait() => {
                        match msg {
                            Some(ChannelMsg::Data { ref data }) => {
                                let bytes = data.to_vec();
                                if let Ok(mut b) = buf_ref.lock() {
                                    b.extend_from_slice(&bytes);
                                    if b.len() > MAX_OUTPUT_BUF {
                                        let drop = b.len() - MAX_OUTPUT_BUF;
                                        b.drain(..drop);
                                    }
                                }
                                app.emit(&format!("ssh-output-{sid}"), bytes).ok();
                            }
                            Some(ChannelMsg::ExtendedData { ref data, .. }) => {
                                // stderr — write to terminal same as stdout
                                let bytes = data.to_vec();
                                if let Ok(mut b) = buf_ref.lock() {
                                    b.extend_from_slice(&bytes);
                                    if b.len() > MAX_OUTPUT_BUF {
                                        let drop = b.len() - MAX_OUTPUT_BUF;
                                        b.drain(..drop);
                                    }
                                }
                                app.emit(&format!("ssh-output-{sid}"), bytes).ok();
                            }
                            Some(ChannelMsg::ExitStatus { exit_status }) => {
                                app.emit(&format!("ssh-closed-{sid}"), exit_status).ok();
                                break;
                            }
                            None => {
                                app.emit(&format!("ssh-closed-{sid}"), 0u32).ok();
                                break;
                            }
                            _ => {}
                        }
                    }
                    input = input_rx.recv() => {
                        pending = input;
                    }
                }

                if let Some(input) = pending {
                    match input {
                        SessionInput::Data(d) => {
                            if channel.data(d.as_ref()).await.is_err() { break; }
                        }
                        SessionInput::Resize { cols, rows } => {
                            channel.window_change(cols, rows, 0, 0).await.ok();
                        }
                        SessionInput::Close => break,
                    }
                }
            }
        });

        self.terminals.insert(session_id, TerminalSession { host_id, input_tx, output_buf });
        Ok(())
    }

    pub fn get_output_buffer(&self, session_id: &str) -> Result<Vec<u8>> {
        let session = self.terminals
            .get(session_id)
            .ok_or_else(|| AppError::SessionNotFound(session_id.into()))?;
        Ok(session.output_buf.lock().unwrap_or_else(|e| e.into_inner()).clone())
    }

    pub async fn send_input(&self, session_id: &str, data: Vec<u8>) -> Result<()> {
        self.terminals
            .get(session_id)
            .ok_or_else(|| AppError::SessionNotFound(session_id.into()))?
            .input_tx
            .send(SessionInput::Data(data))
            .await
            .map_err(|_| AppError::Ssh("Session closed".into()))
    }

    pub async fn resize_terminal(&self, session_id: &str, cols: u32, rows: u32) -> Result<()> {
        self.terminals
            .get(session_id)
            .ok_or_else(|| AppError::SessionNotFound(session_id.into()))?
            .input_tx
            .send(SessionInput::Resize { cols, rows })
            .await
            .map_err(|_| AppError::Ssh("Session closed".into()))
    }

    pub async fn close_terminal(&mut self, session_id: &str) -> Result<()> {
        if let Some(s) = self.terminals.remove(session_id) {
            s.input_tx.send(SessionInput::Close).await.ok();
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn terminal_ids(&self) -> Vec<String> {
        self.terminals.keys().cloned().collect()
    }

    // ── SFTP ─────────────────────────────────────────────────────────────

    pub async fn open_sftp(
        &mut self,
        session_id: String,
        host_id: String,
        handle: super::SshHandle,
    ) -> Result<()> {
        let channel = handle
            .channel_open_session()
            .await
            .map_err(|e| AppError::Ssh(e.to_string()))?;

        channel
            .request_subsystem(true, "sftp")
            .await
            .map_err(|e| AppError::Ssh(e.to_string()))?;

        let sftp = russh_sftp::client::SftpSession::new(channel.into_stream())
            .await
            .map_err(|e| AppError::Sftp(e.to_string()))?;

        self.sftp.insert(session_id, SftpSession { host_id, sftp });
        Ok(())
    }

    pub fn get_sftp_mut(&mut self, session_id: &str) -> Result<&mut russh_sftp::client::SftpSession> {
        self.sftp
            .get_mut(session_id)
            .map(|s| &mut s.sftp)
            .ok_or_else(|| AppError::SessionNotFound(session_id.into()))
    }

    pub async fn close_sftp(&mut self, session_id: &str) -> Result<()> {
        self.sftp.remove(session_id);
        Ok(())
    }
}
