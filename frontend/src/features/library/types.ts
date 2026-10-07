export type BookStatus = "sleeping" | "next" | "awake";
export type BookRarity = "common" | "rare" | "legendary";
export type RewardKind = "quote" | "fact" | "summary" | "badge" | "decor";
export type LibraryStage = 1 | 2 | 3;
export type TimeOfDay = "morning" | "day" | "evening" | "night";
export type Weather = "clear" | "cloudy" | "rain";
export type ThemeId =
  | "cozy-cabin"
  | "gothic-archive"
  | "futuristic-neon"
  | "japanese-study";
export type QualityTier = "high" | "low" | "none";
export type DockTab = "wall" | "collection" | "shop" | "walls" | "list";

export interface BookReward {
  kind: RewardKind;
  content: string;
  decorId?: string;
}

export interface WallBook {
  id: string;
  taskId: string;
  title: string;
  subject: string;
  color: string;
  thickness: number;
  slot: number;
  status: BookStatus;
  awakenedAt?: string;
  dueDate?: string;
  isMystery?: boolean;
  reward?: BookReward;
  rarity: BookRarity;
  /** Large side books that open RAG chat */
  isCorpus?: boolean;
  sourceId?: string;
}

export interface Wall {
  id: string;
  projectId: string;
  title: string;
  items: WallBook[];
}

export interface UserLibrary {
  level: number;
  ink: number;
  theme: ThemeId;
  stage: LibraryStage;
  streakDays: number;
  unlockedDecor: string[];
}

export interface Ambience {
  timeOfDay: TimeOfDay;
  weather: Weather;
  candleLevel: number;
}

export interface LibrarySnapshot {
  walls: Wall[];
  activeWallId: string;
  user: UserLibrary;
  ambience: Ambience;
}

export type LibrarySseEvent =
  | {
      type: "awakened";
      wallId: string;
      bookId: string;
      book: WallBook;
      inkAwarded: number;
      nextBookId: string | null;
    }
  | { type: "ambience"; ambience: Ambience }
  | { type: "stage_up"; stage: LibraryStage };

export function countAwakened(wall: Wall | null | undefined): number {
  if (!wall) return 0;
  return wall.items.filter((b) => b.status === "awake").length;
}

export function findNextBook(wall: Wall | null | undefined): WallBook | null {
  if (!wall) return null;
  const marked = wall.items.find((b) => b.status === "next");
  if (marked) return marked;
  return (
    wall.items
      .filter((b) => b.status === "sleeping" && !b.isMystery)
      .sort((a, b) => a.slot - b.slot)[0] ?? null
  );
}
