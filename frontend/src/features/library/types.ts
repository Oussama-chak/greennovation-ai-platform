export type LibraryItemType =
  | "milestone"
  | "corpus_doc"
  | "session_summary"
  | "achievement"
  | "journal";

export type BookRarity = "common" | "rare" | "legendary";
export type LibraryStage = 1 | 2 | 3;
export type TimeOfDay = "morning" | "day" | "evening" | "night";
export type Weather = "clear" | "cloudy" | "rain";
export type ThemeId =
  | "cozy-cabin"
  | "gothic-archive"
  | "futuristic-neon"
  | "japanese-study";
export type QualityTier = "high" | "low" | "none";
export type DockTab = "library" | "shop" | "collection" | "friends" | "list";

export interface LibraryItem {
  id: string;
  type: LibraryItemType;
  title: string;
  subject: string;
  color: string;
  thickness: number;
  shelfSlot: number;
  sourceId?: string;
  rarity: BookRarity;
  onTime?: boolean;
  summary?: string;
  unlockedAt: string;
}

export interface UserLibrary {
  level: number;
  ink: number;
  theme: ThemeId;
  stage: LibraryStage;
  streakDays: number;
  unlockedDecor: string[];
  /** Progress 0..1 toward next level */
  levelProgress: number;
  todaysGoal: string;
}

export interface Ambience {
  timeOfDay: TimeOfDay;
  weather: Weather;
  candleLevel: number;
}

export interface LibrarySnapshot {
  items: LibraryItem[];
  user: UserLibrary;
  ambience: Ambience;
}

export type LibrarySseEvent =
  | { type: "item_added"; item: LibraryItem; inkAwarded: number }
  | { type: "ambience"; ambience: Ambience }
  | { type: "level_up"; level: number; stage: LibraryStage };

/** Level bands → room stage */
export function stageFromLevel(level: number): LibraryStage {
  if (level >= 8) return 3;
  if (level >= 4) return 2;
  return 1;
}
