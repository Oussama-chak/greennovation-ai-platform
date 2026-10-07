import {
  getMockSnapshot,
  mockAddMilestone,
  mockPurchase,
  mockSetTheme,
} from "./mock";
import type {
  Ambience,
  LibraryItem,
  LibrarySnapshot,
  ThemeId,
  UserLibrary,
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

  async getSnapshot(): Promise<LibrarySnapshot> {
    if (USE_MOCK) return structuredClone(ensureMock());
    const data = await apiGet<LibrarySnapshot>("/library");
    return data;
  },

  async getAmbience(): Promise<Ambience> {
    if (USE_MOCK) return { ...ensureMock().ambience };
    return apiGet<Ambience>("/library/ambience");
  },

  async simulateMilestone(): Promise<{ item: LibraryItem; inkAwarded: number }> {
    if (USE_MOCK) {
      const session = ensureMock();
      const result = mockAddMilestone(session.items);
      session.items.push(result.item);
      session.user.ink += result.inkAwarded;
      return result;
    }
    return apiPost("/library/simulate-milestone");
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
