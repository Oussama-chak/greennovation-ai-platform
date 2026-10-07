export const ISLANDS = [
    { id: "discovery", name: "Explorer's Wing", subject: "Your learning journey", description: "Every journey begins with one page. Fill these shelves with your daily curiosity.", tone: "mint", reward: "Knowledge crystal", icon: "compass" },
    { id: "logic", name: "Logic Wing", subject: "Mathematics & science", description: "Equations, experiments and brilliant connections, one volume at a time.", tone: "gold", reward: "Logic crystal", icon: "atom" },
    { id: "imagination", name: "Story Wing", subject: "Arts & humanities", description: "Stories, art and history: every book opens another world.", tone: "coral", reward: "Imagination crystal", icon: "book" },
] as const;
  
  export type IslandId = typeof ISLANDS[number]["id"];
  export type IslandProgress = Record<IslandId, number>;
  export const INITIAL_PROGRESS: IslandProgress = { discovery: 0, logic: 0, imagination: 0 };
  export const WORLD_STORAGE_KEY = "ecolearn:knowledgeIslands";
  
  export function readWorldProgress(): IslandProgress {
    try {
      const raw = localStorage.getItem(WORLD_STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return Object.fromEntries(ISLANDS.map(({ id }) => [id, typeof data[id] === "number" && Number.isFinite(data[id]) ? Math.max(0, Math.floor(data[id])) : 0])) as IslandProgress;
    } catch {
      return { ...INITIAL_PROGRESS };
    }
  }

  export function writeWorldProgress(progress: IslandProgress) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* ignore quota errors */
    }
  }

  export function totalBooks(progress: IslandProgress): number {
    return ISLANDS.reduce((sum, { id }) => sum + progress[id], 0);
  }

  export function islandToTreeKind(id: IslandId): "oak" | "pine" | "blossom" {
    if (id === "logic") return "pine";
    if (id === "imagination") return "blossom";
    return "oak";
  }

  export function treeKindToIsland(kind: string): IslandId {
    if (kind === "pine") return "logic";
    if (kind === "blossom") return "imagination";
    return "discovery";
  }