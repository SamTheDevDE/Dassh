export type AuthType = "password" | "key" | "agent";

export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  auth_type: AuthType;
  encrypted_secret?: string;
  tags: string[];
  jump_host_id?: string;
}

export interface HostInput {
  name: string;
  hostname: string;
  port: number;
  username: string;
  auth_type: AuthType;
  secret?: string;
  tags: string[];
  jump_host_id?: string;
}

export interface SshKeyInfo {
  id: string;
  name: string;
  key_type: string;
  public_key: string;
  fingerprint: string;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified?: number;
}

export type SessionKind = "terminal" | "sftp";

export interface ActiveSession {
  id: string;
  host_id: string;
  host_name: string;
  kind: SessionKind;
}
