import { create } from "zustand";
import { persist } from "zustand/middleware";

export const FONT_FAMILIES = [
  "JetBrains Mono",
  "Cascadia Code",
  "Fira Code",
  "Menlo",
  "Consolas",
  "monospace",
] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number];
export type SortOrder = "name" | "lastConnected" | "favorites";

interface SettingsStore {
  terminalFontSize: number;
  terminalFontFamily: FontFamily;
  terminalLineHeight: number;
  terminalCursorBlink: boolean;
  favorites: string[];
  lastConnected: Record<string, number>;
  sortOrder: SortOrder;
  quickConnectHistory: string[];
  themeId: string;
  setTerminalFontSize: (v: number) => void;
  setTerminalFontFamily: (v: FontFamily) => void;
  setTerminalLineHeight: (v: number) => void;
  setTerminalCursorBlink: (v: boolean) => void;
  toggleFavorite: (id: string) => void;
  setLastConnected: (id: string) => void;
  setSortOrder: (o: SortOrder) => void;
  pushQuickConnectHistory: (addr: string) => void;
  setThemeId: (id: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      terminalFontSize: 13,
      terminalFontFamily: "JetBrains Mono",
      terminalLineHeight: 1.5,
      terminalCursorBlink: true,
      favorites: [],
      lastConnected: {},
      sortOrder: "name",
      quickConnectHistory: [],
      themeId: "dark-grey",
      setTerminalFontSize: (v) => set({ terminalFontSize: v }),
      setTerminalFontFamily: (v) => set({ terminalFontFamily: v }),
      setTerminalLineHeight: (v) => set({ terminalLineHeight: v }),
      setTerminalCursorBlink: (v) => set({ terminalCursorBlink: v }),
      toggleFavorite: (id) => {
        const favs = get().favorites;
        set({ favorites: favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id] });
      },
      setLastConnected: (id) =>
        set((s) => ({ lastConnected: { ...s.lastConnected, [id]: Date.now() } })),
      setSortOrder: (o) => set({ sortOrder: o }),
      pushQuickConnectHistory: (addr) => {
        const hist = get().quickConnectHistory.filter((a) => a !== addr);
        set({ quickConnectHistory: [addr, ...hist].slice(0, 10) });
      },
      setThemeId: (id) => set({ themeId: id }),
    }),
    { name: "dash-settings" }
  )
);
