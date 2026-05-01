import { create } from "zustand";
import * as cmd from "../lib/commands";
import type { ActiveSession } from "../types";

interface SessionsStore {
  sessions: ActiveSession[];

  openTerminal: (hostId: string, hostName: string, cols: number, rows: number) => Promise<string>;
  closeTerminal: (sessionId: string) => Promise<void>;
  openSftp: (hostId: string, hostName: string) => Promise<string>;
  closeSftp: (sessionId: string) => Promise<void>;
}

export const useSessionsStore = create<SessionsStore>((set) => ({
  sessions: [],

  openTerminal: async (hostId, hostName, cols, rows) => {
    const id = await cmd.connectSsh(hostId, cols, rows);
    set((s) => ({
      sessions: [...s.sessions, { id, host_id: hostId, host_name: hostName, kind: "terminal" }],
    }));
    return id;
  },

  closeTerminal: async (sessionId) => {
    await cmd.disconnectSsh(sessionId);
    set((s) => ({ sessions: s.sessions.filter((s) => s.id !== sessionId) }));
  },

  openSftp: async (hostId, hostName) => {
    const id = await cmd.sftpConnect(hostId);
    set((s) => ({
      sessions: [...s.sessions, { id, host_id: hostId, host_name: hostName, kind: "sftp" }],
    }));
    return id;
  },

  closeSftp: async (sessionId) => {
    await cmd.sftpDisconnect(sessionId);
    set((s) => ({ sessions: s.sessions.filter((s) => s.id !== sessionId) }));
  },
}));
