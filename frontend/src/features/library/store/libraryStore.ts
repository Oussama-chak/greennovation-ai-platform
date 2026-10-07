import { create } from "zustand";
import type {
  Ambience,
  DockTab,
  LibraryItem,
  LibrarySnapshot,
  QualityTier,
  ThemeId,
  UserLibrary,
} from "../types";
import { stageFromLevel } from "../types";

export type DropAnim = { itemId: string; startedAt: number } | null;

type LibraryState = {
  items: LibraryItem[];
  user: UserLibrary | null;
  ambience: Ambience | null;
  selectedItemId: string | null;
  hoveredItemId: string | null;
  openItemId: string | null;
  dockTab: DockTab;
  quality: QualityTier;
  dropAnim: DropAnim;
  ready: boolean;
  error: string | null;

  hydrate: (snapshot: LibrarySnapshot) => void;
  setSelectedItem: (id: string | null) => void;
  setHoveredItem: (id: string | null) => void;
  setOpenItem: (id: string | null) => void;
  setDockTab: (tab: DockTab) => void;
  setQuality: (tier: QualityTier) => void;
  setAmbience: (ambience: Ambience) => void;
  setUser: (user: UserLibrary) => void;
  setError: (error: string | null) => void;
  setTheme: (theme: ThemeId) => void;

  addItem: (item: LibraryItem, inkAwarded: number) => void;
  startDrop: (itemId: string) => void;
  clearDrop: () => void;
};

export const useLibraryStore = create<LibraryState>((set) => ({
  items: [],
  user: null,
  ambience: null,
  selectedItemId: null,
  hoveredItemId: null,
  openItemId: null,
  dockTab: "library",
  quality: "high",
  dropAnim: null,
  ready: false,
  error: null,

  hydrate: (snapshot) =>
    set({
      items: snapshot.items,
      user: snapshot.user,
      ambience: snapshot.ambience,
      ready: true,
      error: null,
    }),

  setSelectedItem: (id) => set({ selectedItemId: id }),
  setHoveredItem: (id) => set({ hoveredItemId: id }),
  setOpenItem: (id) => set({ openItemId: id, selectedItemId: id }),
  setDockTab: (tab) => set({ dockTab: tab }),
  setQuality: (tier) => set({ quality: tier }),
  setAmbience: (ambience) => set({ ambience }),
  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),

  setTheme: (theme) =>
    set((s) => (s.user ? { user: { ...s.user, theme } } : s)),

  addItem: (item, inkAwarded) =>
    set((s) => {
      if (!s.user) return s;
      const ink = s.user.ink + inkAwarded;
      let level = s.user.level;
      let levelProgress = Math.min(1, s.user.levelProgress + 0.18);
      if (levelProgress >= 1) {
        level += 1;
        levelProgress = 0.05;
      }
      const stage = stageFromLevel(level);
      return {
        items: [...s.items, item],
        user: { ...s.user, ink, level, levelProgress, stage },
        dropAnim: { itemId: item.id, startedAt: performance.now() },
      };
    }),

  startDrop: (itemId) =>
    set({ dropAnim: { itemId, startedAt: performance.now() } }),

  clearDrop: () => set({ dropAnim: null }),
}));
