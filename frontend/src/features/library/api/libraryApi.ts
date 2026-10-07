import {
  getMockSnapshot,
  mockAwakenNext,
  mockPurchase,
  mockSetTheme,
} from "./mock";
import type {
  Ambience,
  LibrarySnapshot,
  ThemeId,
  UserLibrary,
  Wall,
  WallBook,
} from "../types";

const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) !== "false";

let mockSession: LibrarySnapshot | null = null;

function ensureMock(): LibrarySnapshot {
  if (!mockSession) mockSession = getMockSnapshot();
  return mockSession;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const libraryApi = {
  useMock: USE_MOCK,

  async getWalls(): Promise<Wall[]> {
    if (USE_MOCK) return structuredClone(ensureMock().walls);
    return apiGet<Wall[]>("/library/walls");
  },

  async getWall(id: string): Promise<Wall> {
    if (USE_MOCK) {
      const wall = ensureMock().walls.find((w) => w.id === id);
      if (!wall) throw new Error("Wall not found");
      return structuredClone(wall);
    }
    return apiGet<Wall>(`/library/walls/${id}`);
  },

  async getSnapshot(): Promise<LibrarySnapshot> {
    if (USE_MOCK) return structuredClone(ensureMock());
    const [walls, ambience, user] = await Promise.all([
      apiGet<Wall[]>("/library/walls"),
      apiGet<Ambience>("/library/ambience"),
      apiGet<UserLibrary>("/library/user"),
    ]);
    return {
      walls,
      activeWallId: walls[0]?.id ?? "",
      user,
      ambience,
    };
  },

  async getAmbience(): Promise<Ambience> {
    if (USE_MOCK) return { ...ensureMock().ambience };
    return apiGet<Ambience>("/library/ambience");
  },

  /** Dev / mock: complete the next sleeping task and awaken its book. */
  async completeNextTask(): Promise<{
    book: WallBook;
    inkAwarded: number;
    nextBookId: string | null;
  }> {
    if (USE_MOCK) {
      const session = ensureMock();
      const result = mockAwakenNext(session);
      if (!result) throw new Error("No sleeping books waiting to be discovered");
      return result;
    }
    return apiPost("/library/dev/complete-next");
  },

  async openBook(wallId: string, bookId: string): Promise<WallBook> {
    if (USE_MOCK) {
      const wall = ensureMock().walls.find((w) => w.id === wallId);
      const book = wall?.items.find((b) => b.id === bookId);
      if (!book) throw new Error("Book not found");
      return { ...book };
    }
    return apiPost<WallBook>(`/library/walls/${wallId}/books/${bookId}/open`);
  },

  async setTheme(theme: ThemeId): Promise<UserLibrary> {
    if (USE_MOCK) {
      const session = ensureMock();
      session.user = mockSetTheme(session.user, theme);
      return { ...session.user };
    }
    return apiPost<UserLibrary>("/library/theme", { theme });
  },

  async purchase(itemId: string, cost: number): Promise<UserLibrary> {
    if (USE_MOCK) {
      const session = ensureMock();
      const next = mockPurchase(session.user, itemId, cost);
      if (!next) throw new Error("Not enough Ink");
      session.user = next;
      return { ...session.user };
    }
    return apiPost<UserLibrary>("/library/purchase", { itemId, cost });
  },

  streamUrl(): string {
    return USE_MOCK ? "" : "/api/library/stream";
  },
};
