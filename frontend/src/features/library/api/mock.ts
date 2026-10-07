import type {
  Ambience,
  BookRarity,
  BookStatus,
  LibrarySnapshot,
  ThemeId,
  UserLibrary,
  Wall,
  WallBook,
} from "../types";

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
  effort: number;
  status?: BookStatus;
  isMystery?: boolean;
  rarity?: BookRarity;
  isCorpus?: boolean;
  dueOffset?: number;
  reward?: WallBook["reward"];
};

const THESIS_SEEDS: Seed[] = [
  { title: "Lock research question", subject: "Planning", effort: 2, status: "awake", reward: { kind: "quote", content: "Clarity is kindness to your future self." } },
  { title: "Related-work skim", subject: "Research", effort: 3, status: "awake", reward: { kind: "fact", content: "Most literature reviews start too wide — a tight question saves weeks." } },
  { title: "Thesis outline v1", subject: "Writing", effort: 3, status: "awake", reward: { kind: "summary", content: "You framed three chapters and a clear through-line from problem to contribution." } },
  { title: "Methods handbook", subject: "Methods", effort: 4, status: "awake", isCorpus: true, rarity: "rare", reward: { kind: "fact", content: "Ask this volume anything — it knows your methods corpus." } },
  { title: "Choose methodology", subject: "Methods", effort: 2, status: "awake", reward: { kind: "badge", content: "Method Scout" } },
  { title: "Seed paper collection", subject: "Research", effort: 3, status: "awake" },
  { title: "Intro focus session", subject: "Writing", effort: 2, status: "awake", reward: { kind: "summary", content: "Opening argument sharpened; three next sentences wait on the desk." } },
  { title: "Annotate top 10 papers", subject: "Research", effort: 4, status: "awake" },
  { title: "Draft introduction", subject: "Writing", effort: 4, status: "awake" },
  { title: "Build literature matrix", subject: "Research", effort: 3, status: "awake" },
  { title: "Experiment plan", subject: "Methods", effort: 3, status: "awake" },
  { title: "Figures moodboard", subject: "Design", effort: 2, status: "awake" },
  { title: "Draft methods section", subject: "Writing", effort: 4, status: "next", dueOffset: 3 },
  { title: "Pilot data cleanup", subject: "Methods", effort: 3, dueOffset: 5 },
  { title: "Results skeleton", subject: "Writing", effort: 3, dueOffset: 7 },
  { title: "Peer review checkpoint", subject: "Review", effort: 2, dueOffset: 8 },
  { title: "Citation tidy pass", subject: "Research", effort: 2, dueOffset: 9 },
  { title: "Discussion outline", subject: "Writing", effort: 3, dueOffset: 10 },
  { title: "Figure polish", subject: "Design", effort: 2, dueOffset: 11 },
  { title: "Advisor sync notes", subject: "Planning", effort: 1, dueOffset: 4 },
  { title: "Limitations draft", subject: "Writing", effort: 2, dueOffset: 12 },
  { title: "Abstract v1", subject: "Writing", effort: 2, dueOffset: 14 },
  { title: "Related-work synthesis", subject: "Research", effort: 4, dueOffset: 15 },
  { title: "Ethics checklist", subject: "Planning", effort: 2, dueOffset: 6 },
  { title: "Dataset documentation", subject: "Methods", effort: 3, dueOffset: 13 },
  { title: "Baseline experiments", subject: "Methods", effort: 4, dueOffset: 16 },
  { title: "Ablation notes", subject: "Methods", effort: 3, dueOffset: 18 },
  { title: "Results tables", subject: "Writing", effort: 3, dueOffset: 19 },
  { title: "Visual system pass", subject: "Design", effort: 2, dueOffset: 20 },
  { title: "Conclusion draft", subject: "Writing", effort: 3, dueOffset: 22 },
  { title: "Style guide", subject: "Writing", effort: 3, isCorpus: true, rarity: "rare", dueOffset: 2 },
  { title: "Full proofread", subject: "Review", effort: 3, dueOffset: 24 },
  { title: "Reference polish", subject: "Research", effort: 2, dueOffset: 25 },
  { title: "Appendix pack", subject: "Writing", effort: 2, dueOffset: 26 },
  { title: "Defense slides draft", subject: "Design", effort: 3, dueOffset: 28 },
  { title: "Practice talk", subject: "Planning", effort: 2, dueOffset: 30 },
  { title: "Mystery: first flame", subject: "Planning", effort: 2, isMystery: true, rarity: "legendary", dueOffset: 99 },
  { title: "Mystery: halfway light", subject: "Planning", effort: 2, isMystery: true, rarity: "legendary", dueOffset: 99 },
  { title: "Mystery: wall complete", subject: "Planning", effort: 2, isMystery: true, rarity: "legendary", dueOffset: 99 },
  { title: "Wellbeing check-in", subject: "Wellbeing", effort: 1, dueOffset: 1 },
];

function dueISO(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildThesisWall(): Wall {
  const items: WallBook[] = THESIS_SEEDS.map((seed, i) => {
    const status: BookStatus = seed.status ?? "sleeping";
    return {
      id: `thesis-book-${i + 1}`,
      taskId: `task-thesis-${i + 1}`,
      title: seed.title,
      subject: seed.subject,
      color: seed.isMystery ? "#d4a537" : (SUBJECT_COLORS[seed.subject] ?? "#8a7c6a"),
      thickness: 0.08 + seed.effort * 0.032,
      slot: i,
      status,
      awakenedAt: status === "awake" ? isoDaysAgo(28 - i) : undefined,
      dueDate: seed.dueOffset !== undefined ? dueISO(seed.dueOffset) : undefined,
      isMystery: seed.isMystery,
      reward: seed.reward,
      rarity: seed.rarity ?? (seed.isMystery ? "legendary" : "common"),
      isCorpus: seed.isCorpus,
      sourceId: seed.isCorpus ? `doc-thesis-${i + 1}` : undefined,
    };
  });

  return {
    id: "wall-thesis",
    projectId: "proj-thesis",
    title: "Thesis wall",
    items,
  };
}

function buildMethodsWall(): Wall {
  const titles = [
    "Lab notebook setup",
    "Metric definitions",
    "Pilot run A",
    "Pilot run B",
    "Error analysis",
    "Reproducibility notes",
    "Code freeze checklist",
    "Share results with peers",
  ];
  return {
    id: "wall-methods",
    projectId: "proj-methods",
    title: "Methods lab wall",
    items: titles.map((title, i) => ({
      id: `methods-book-${i + 1}`,
      taskId: `task-methods-${i + 1}`,
      title,
      subject: "Methods",
      color: SUBJECT_COLORS.Methods,
      thickness: 0.1 + (i % 3) * 0.03,
      slot: i,
      status: (i < 2 ? "awake" : i === 2 ? "next" : "sleeping") as BookStatus,
      awakenedAt: i < 2 ? isoDaysAgo(4 - i) : undefined,
      dueDate: dueISO(i + 2),
      rarity: "common" as const,
    })),
  };
}

export const MOCK_USER: UserLibrary = {
  level: 3,
  ink: 260,
  theme: "cozy-cabin",
  stage: 1,
  streakDays: 5,
  unlockedDecor: ["brass-bookmark"],
};

export const MOCK_AMBIENCE: Ambience = {
  timeOfDay: "evening",
  weather: "clear",
  candleLevel: 0.85,
};

export function getMockSnapshot(): LibrarySnapshot {
  const walls = [buildThesisWall(), buildMethodsWall()];
  return {
    walls,
    activeWallId: walls[0].id,
    user: { ...MOCK_USER, unlockedDecor: [...MOCK_USER.unlockedDecor] },
    ambience: { ...MOCK_AMBIENCE },
  };
}

export function mockAwakenNext(snapshot: LibrarySnapshot): {
  book: WallBook;
  inkAwarded: number;
  nextBookId: string | null;
} | null {
  const wall = snapshot.walls.find((w) => w.id === snapshot.activeWallId);
  if (!wall) return null;

  const target =
    wall.items.find((b) => b.status === "next") ??
    wall.items.find((b) => b.status === "sleeping" && !b.isMystery);
  if (!target) return null;

  target.status = "awake";
  target.awakenedAt = new Date().toISOString();
  if (!target.reward) {
    target.reward = {
      kind: "quote",
      content: "Another chapter finds its color. You showed up — that matters.",
    };
  }

  const inkAwarded = target.rarity === "legendary" ? 50 : target.rarity === "rare" ? 30 : 20;
  snapshot.user.ink += inkAwarded;

  wall.items.forEach((b) => {
    if (b.id !== target.id && b.status === "next") b.status = "sleeping";
  });
  const next =
    wall.items
      .filter((b) => b.status === "sleeping" && !b.isMystery)
      .sort((a, b) => a.slot - b.slot)[0] ?? null;
  if (next) next.status = "next";

  return { book: { ...target }, inkAwarded, nextBookId: next?.id ?? null };
}

export function mockSetTheme(user: UserLibrary, theme: ThemeId): UserLibrary {
  return { ...user, theme };
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
