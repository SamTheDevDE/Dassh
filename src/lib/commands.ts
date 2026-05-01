import { invoke } from "@tauri-apps/api/core";
import type { FileEntry, Host, HostInput, SshKeyInfo } from "../types";

export const vaultExists = () => invoke<boolean>("vault_exists");
export const vaultCreate = (password: string) => invoke<void>("vault_create", { password });
export const vaultUnlock = (password: string) => invoke<void>("vault_unlock", { password });
export const vaultLock = () => invoke<void>("vault_lock");
export const vaultIsLocked = () => invoke<boolean>("vault_is_locked");

export const getHosts = () => invoke<Host[]>("get_hosts");
export const addHost = (input: HostInput) => invoke<Host>("add_host", { input });
export const updateHost = (host: Host) => invoke<void>("update_host", { host });
export const deleteHost = (id: string) => invoke<void>("delete_host", { id });

export const getKeys = () => invoke<SshKeyInfo[]>("get_keys");
export const generateKey = (name: string) => invoke<SshKeyInfo>("generate_key", { name });
export const importKey = (name: string, pem: string) =>
  invoke<SshKeyInfo>("import_key", { name, pem });
export const deleteKey = (id: string) => invoke<void>("delete_key", { id });

export const connectSsh = (hostId: string, cols: number, rows: number) =>
  invoke<string>("connect_ssh", { hostId, cols, rows });
export const disconnectSsh = (sessionId: string) =>
  invoke<void>("disconnect_ssh", { sessionId });
export const getSessionBuffer = (sessionId: string) =>
  invoke<number[]>("get_session_buffer", { sessionId });
export const sendInput = (sessionId: string, data: number[]) =>
  invoke<void>("send_input", { sessionId, data });
export const resizeTerminal = (sessionId: string, cols: number, rows: number) =>
  invoke<void>("resize_terminal", { sessionId, cols, rows });

export const sftpConnect = (hostId: string) =>
  invoke<string>("sftp_connect", { hostId });
export const sftpDisconnect = (sessionId: string) =>
  invoke<void>("sftp_disconnect", { sessionId });
export const sftpListDir = (sessionId: string, path: string) =>
  invoke<FileEntry[]>("sftp_list_dir", { sessionId, path });
export const sftpDownload = (sessionId: string, remotePath: string, localPath: string) =>
  invoke<void>("sftp_download", { sessionId, remotePath, localPath });
export const sftpUpload = (sessionId: string, localPath: string, remotePath: string) =>
  invoke<void>("sftp_upload", { sessionId, localPath, remotePath });
export const sftpMkdir = (sessionId: string, path: string) =>
  invoke<void>("sftp_mkdir", { sessionId, path });
export const sftpDelete = (sessionId: string, path: string, isDir: boolean) =>
  invoke<void>("sftp_delete", { sessionId, path, isDir });
