import { create } from "zustand";
import * as cmd from "../lib/commands";
import type { Host, HostInput, SshKeyInfo } from "../types";

interface VaultStore {
  isLocked: boolean;
  vaultExists: boolean;
  hosts: Host[];
  keys: SshKeyInfo[];
  error: string | null;

  checkVault: () => Promise<void>;
  createVault: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  loadHosts: () => Promise<void>;
  addHost: (input: HostInput) => Promise<Host>;
  updateHost: (host: Host) => Promise<void>;
  deleteHost: (id: string) => Promise<void>;
  loadKeys: () => Promise<void>;
  generateKey: (name: string) => Promise<SshKeyInfo>;
  importKey: (name: string, pem: string) => Promise<SshKeyInfo>;
  deleteKey: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  isLocked: true,
  vaultExists: false,
  hosts: [],
  keys: [],
  error: null,

  clearError: () => set({ error: null }),

  checkVault: async () => {
    const exists = await cmd.vaultExists();
    const locked = exists ? await cmd.vaultIsLocked() : true;
    set({ vaultExists: exists, isLocked: locked });
  },

  createVault: async (password) => {
    try {
      await cmd.vaultCreate(password);
      set({ vaultExists: true, isLocked: false, error: null });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  unlock: async (password) => {
    try {
      await cmd.vaultUnlock(password);
      set({ isLocked: false, error: null });
      await get().loadHosts();
      await get().loadKeys();
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  lock: async () => {
    await cmd.vaultLock();
    set({ isLocked: true, hosts: [], keys: [] });
  },

  loadHosts: async () => {
    const hosts = await cmd.getHosts();
    set({ hosts });
  },

  addHost: async (input) => {
    const host = await cmd.addHost(input);
    set((s) => ({ hosts: [...s.hosts, host] }));
    return host;
  },

  updateHost: async (host) => {
    await cmd.updateHost(host);
    set((s) => ({
      hosts: s.hosts.map((h) => (h.id === host.id ? host : h)),
    }));
  },

  deleteHost: async (id) => {
    await cmd.deleteHost(id);
    set((s) => ({ hosts: s.hosts.filter((h) => h.id !== id) }));
  },

  loadKeys: async () => {
    const keys = await cmd.getKeys();
    set({ keys });
  },

  generateKey: async (name) => {
    const key = await cmd.generateKey(name);
    set((s) => ({ keys: [...s.keys, key] }));
    return key;
  },

  importKey: async (name, pem) => {
    const key = await cmd.importKey(name, pem);
    set((s) => ({ keys: [...s.keys, key] }));
    return key;
  },

  deleteKey: async (id) => {
    await cmd.deleteKey(id);
    set((s) => ({ keys: s.keys.filter((k) => k.id !== id) }));
  },
}));
