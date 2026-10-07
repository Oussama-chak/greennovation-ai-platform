import type {
  Ambience,
  LibraryItem,
  LibraryItemType,
  LibrarySnapshot,
  ThemeId,
  UserLibrary,
} from "../types";
import { stageFromLevel } from "../types";

const SUBJECT_COLORS: Record<string, string> = {
  Research: "#8b2f3a",
  Writing: "#2f6f73",
  Methods: "#3d5a80",
  Design: "#c9773f",
  Review: "#6b4c7a",
  Planning: "#d4a537",
  Wellbeing: "#5a8f7b",
};

type Seed = {
  title: string;
  subject: string;
  type: LibraryItemType;
  effort: number;
  rarity?: LibraryItem["rarity"];
  onTime?: boolean;
  summary?: string;
  daysAgo: number;
};

const SEEDS: Seed[] = [
  { title: "Research question locked in", subject: "Planning", type: "milestone", effort: 2, onTime: true, daysAgo: 28 },
  { title: "Related-work skim", subject: "Research", type: "milestone", effort: 3, onTime: true, daysAgo: 26 },
  { title: "Thesis outline v1", subject: "Writing", type: "milestone", effort: 3, onTime: true, daysAgo: 24 },
  { title: "Methods handbook", subject: "Methods", type: "corpus_doc", effort: 4, rarity: "rare", daysAgo: 22, summary: "Your uploaded methods reference. Ask questions scoped to this document." },
  { title: "Methodology chosen", subject: "Methods", type: "milestone", effort: 2, onTime: true, daysAgo: 21 },
  { title: "Seed paper collection", subject: "Research", type: "milestone", effort: 3, daysAgo: 19 },
  { title: "Focus session — intro draft", subject: "Writing", type: "session_summary", effort: 2, daysAgo: 18, summary: "You clarified the opening argument and left three clean next sentences. Keep the thread warm tomorrow." },
  { title: "Top-10 annotations", subject: "Research", type: "milestone", effort: 4, onTime: true, daysAgo: 16 },
  { title: "Introduction draft", subject: "Writing", type: "milestone", effort: 4, daysAgo: 14 },
  { title: "Literature matrix", subject: "Research", type: "milestone", effort: 3, onTime: true, daysAgo: 12 },
  { title: "Experiment plan", subject: "Methods", type: "milestone", effort: 3, onTime: true, daysAgo: 10 },
  { title: "Figures moodboard", subject: "Design", type: "milestone", effort: 2, daysAgo: 9 },
  { title: "Peer review checkpoint", subject: "Review", type: "milestone", effort: 2, onTime: true, daysAgo: 7 },
  { title: "7-day streak seal", subject: "Planning", type: "achievement", effort: 2, rarity: "legendary", daysAgo: 5, summary: "A golden seal for showing up seven days in a row. The candle burns a little brighter." },
  { title: "Mood journal", subject: "Wellbeing", type: "journal", effort: 2, rarity: "rare", daysAgo: 3, summary: "Pages tinted by how you felt this week — soft greens, quiet blues, a few amber evenings." },
  { title: "Style guide", subject: "Writing", type: "corpus_doc", effort: 3, rarity: "rare", daysAgo: 2, summary: "Corpus document for writing voice and citation style." },
  { title: "Methods section draft", subject: "Writing", type: "milestone", effort: 4, onTime: true, daysAgo: 1 },
  { title: "Evening focus — analysis prep", subject: "Methods", type: "session_summary", effort: 2, daysAgo: 0, summary: "You mapped metrics and left a checklist for the next lab hour. Small, solid progress." },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function buildMockItems(): LibraryItem[] {
  return SEEDS.map((seed, i) => ({
    id: `item-${i + 1}`,
    type: seed.type,
    title: seed.title,
    subject: seed.subject,
    color: SUBJECT_COLORS[seed.subject] ?? "#8a7c6a",
    thickness: 0.08 + seed.effort * 0.032,
    shelfSlot: i,
    sourceId: seed.type === "corpus_doc" ? `doc-${i + 1}` : undefined,
    rarity: seed.rarity ?? "common",
    onTime: seed.onTime,
    summary: seed.summary,
    unlockedAt: isoDaysAgo(seed.daysAgo),
  }));
}

export const MOCK_USER: UserLibrary = {
  level: 3,
  ink: 260,
  theme: "cozy-cabin",
  stage: 1,
  streakDays: 5,
  unlockedDecor: ["brass-bookmark"],
  levelProgress: 0.62,
  todaysGoal: "Draft two paragraphs of the methods section",
};

export const MOCK_AMBIENCE: Ambience = {
  timeOfDay: "evening",
  weather: "clear",
  candleLevel: 0.85,
};

export function getMockSnapshot(): LibrarySnapshot {
  return {
    items: buildMockItems(),
    user: {
      ...MOCK_USER,
      stage: stageFromLevel(MOCK_USER.level),
      unlockedDecor: [...MOCK_USER.unlockedDecor],
    },
    ambience: { ...MOCK_AMBIENCE },
  };
}

const MILESTONE_POOL = [
  { title: "Pilot data cleaned", subject: "Methods", effort: 3 },
  { title: "Results skeleton", subject: "Writing", effort: 3 },
  { title: "Advisor sync notes", subject: "Planning", effort: 1 },
  { title: "Citation library tidy", subject: "Research", effort: 2 },
  { title: "Discussion outline", subject: "Writing", effort: 3 },
  { title: "Figure polish pass", subject: "Design", effort: 2 },
];

export function mockAddMilestone(items: LibraryItem[]): {
  item: LibraryItem;
  inkAwarded: number;
} {
  const pick = MILESTONE_POOL[items.length % MILESTONE_POOL.length];
  const item: LibraryItem = {
    id: `item-${Date.now()}`,
    type: "milestone",
    title: pick.title,
    subject: pick.subject,
    color: SUBJECT_COLORS[pick.subject] ?? "#8a7c6a",
    thickness: 0.08 + pick.effort * 0.032,
    shelfSlot: items.length,
    rarity: "common",
    onTime: true,
    unlockedAt: new Date().toISOString(),
    summary: "A fresh chapter for your shelf — earned by finishing a milestone.",
  };
  return { item, inkAwarded: 20 };
}

export function mockPurchase(
  user: UserLibrary,
  itemId: string,
  cost: number,
): UserLibrary | null {
  if (user.ink < cost) return null;
  if (user.unlockedDecor.includes(itemId)) return user;
  return {
    ...user,
    ink: user.ink - cost,
    unlockedDecor: [...user.unlockedDecor, itemId],
  };
}

export function mockSetTheme(user: UserLibrary, theme: ThemeId): UserLibrary {
  return { ...user, theme };
}
