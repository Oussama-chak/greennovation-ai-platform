import { create } from "zustand";
import type {
  Ambience,
  DockTab,
  LibrarySnapshot,
  QualityTier,
  ThemeId,
  UserLibrary,
  Wall,
  WallBook,
} from "../types";
import { findNextBook } from "../types";

type AwakeningAnim = {
  bookId: string;
  startedAt: number;
} | null;

type LibraryState = {
  walls: Wall[];
  activeWallId: string | null;
  user: UserLibrary | null;
  ambience: Ambience | null;
  selectedBookId: string | null;
  hoveredBookId: string | null;
  openBookId: string | null;
  focusBookId: string | null;
  dockTab: DockTab;
  quality: QualityTier;
  awakening: AwakeningAnim;
  ready: boolean;
  error: string | null;
  reducedMotion: boolean;

  hydrate: (snapshot: LibrarySnapshot) => void;
  setActiveWall: (wallId: string) => void;
  setSelectedBook: (id: string | null) => void;
  setHoveredBook: (id: string | null) => void;
  setOpenBook: (id: string | null) => void;
  setFocusBook: (id: string | null) => void;
  setDockTab: (tab: DockTab) => void;
  setQuality: (tier: QualityTier) => void;
  setAmbience: (ambience: Ambience) => void;
  setError: (error: string | null) => void;
  setTheme: (theme: ThemeId) => void;
  setReducedMotion: (value: boolean) => void;

  awakenBook: (book: WallBook, inkAwarded: number, nextBookId: string | null) => void;
  clearAwakening: () => void;

  activeWall: () => Wall | null;
  nextBook: () => WallBook | null;
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  walls: [],
  activeWallId: null,
  user: null,
  ambience: null,
  selectedBookId: null,
  hoveredBookId: null,
  openBookId: null,
  focusBookId: null,
  dockTab: "wall",
  quality: "high",
  awakening: null,
  ready: false,
  error: null,
  reducedMotion: false,

  hydrate: (snapshot) =>
    set({
      walls: snapshot.walls,
      activeWallId: snapshot.activeWallId,
      user: snapshot.user,
      ambience: snapshot.ambience,
      ready: true,
      error: null,
    }),

  setActiveWall: (wallId) =>
    set({
      activeWallId: wallId,
      selectedBookId: null,
      openBookId: null,
      hoveredBookId: null,
    }),

  setSelectedBook: (id) => set({ selectedBookId: id }),
  setHoveredBook: (id) => set({ hoveredBookId: id }),
  setOpenBook: (id) => set({ openBookId: id, selectedBookId: id }),
  setFocusBook: (id) => set({ focusBookId: id }),
  setDockTab: (tab) => set({ dockTab: tab }),
  setQuality: (tier) => set({ quality: tier }),
  setAmbience: (ambience) => set({ ambience }),
  setError: (error) => set({ error }),
  setReducedMotion: (value) => set({ reducedMotion: value }),

  setTheme: (theme) =>
    set((s) => (s.user ? { user: { ...s.user, theme } } : s)),

  awakenBook: (book, inkAwarded, nextBookId) =>
    set((s) => {
      if (!s.user || !s.activeWallId) return s;
      const walls = s.walls.map((wall) => {
        if (wall.id !== s.activeWallId) return wall;
        return {
          ...wall,
          items: wall.items.map((b) => {
            if (b.id === book.id) {
              return { ...book, status: "awake" as const };
            }
            if (b.id === nextBookId) {
              return { ...b, status: "next" as const };
            }
            if (b.status === "next" && b.id !== nextBookId) {
              return { ...b, status: "sleeping" as const };
            }
            return b;
          }),
        };
      });
      return {
        walls,
        user: { ...s.user, ink: s.user.ink + inkAwarded },
        awakening: { bookId: book.id, startedAt: performance.now() },
        focusBookId: book.id,
      };
    }),

  clearAwakening: () => set({ awakening: null }),

  activeWall: () => {
    const s = get();
    return s.walls.find((w) => w.id === s.activeWallId) ?? null;
  },

  nextBook: () => findNextBook(get().activeWall()),
}));
