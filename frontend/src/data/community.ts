export type PostSort = "hot" | "new" | "top";
export type LeaderboardKind = "weekly-xp" | "improvement" | "helpful" | "streak";

export type CommunityStudent = {
  id: string;
  name: string;
  initials: string;
  xp: number;
  streakDays: number;
  isYou?: boolean;
};

export type CommunityAnswer = {
  id: string;
  authorId: string;
  body: string;
  votes: number;
  isAccepted: boolean;
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  channelId: string;
  authorId: string;
  title: string;
  body: string;
  votes: number;
  views: number;
  tags: string[];
  ageMinutes: number;
  answers: CommunityAnswer[];
};

export type CommunityBadge = { id: string; name: string; description: string; emoji: string };

export const communityClass = { name: "GreenNovation Class Lobby", term: "Spring 2026" };
export const channels = [
  { id: "general", name: "General", description: "Study tips and class updates" },
  { id: "help", name: "Help & questions", description: "Ask classmates for a hand" },
  { id: "projects", name: "Projects", description: "Share progress and ideas" },
];
export const students: CommunityStudent[] = [
  { id: "stu-sara", name: "Sara Ben Ali", initials: "SB", xp: 820, streakDays: 8, isYou: true },
  { id: "stu-yassine", name: "Yassine Mansour", initials: "YM", xp: 760, streakDays: 6 },
  { id: "stu-nour", name: "Nour Haddad", initials: "NH", xp: 690, streakDays: 11 },
];
export const currentUser = () => students[0]!;
export const posts: CommunityPost[] = [
  {
    id: "post-welcome",
    channelId: "general",
    authorId: "stu-nour",
    title: "Welcome to the class lobby",
    body: "Share study tips, questions, and project progress here.",
    votes: 12,
    views: 48,
    tags: ["welcome"],
    ageMinutes: 90,
    answers: [],
  },
];
export const allBadges: CommunityBadge[] = [
  { id: "first-post", name: "First post", description: "Start a conversation", emoji: "💬" },
  { id: "helper", name: "Helpful", description: "Help a classmate", emoji: "🌱" },
];
export const levelTiers = [
  { level: 1, name: "Seedling", minXp: 0 },
  { level: 2, name: "Sprout", minXp: 500 },
  { level: 3, name: "Sapling", minXp: 1000 },
];
export const lobbyStats = { channelCount: channels.length };

export function levelFor(xp: number) {
  const tier = [...levelTiers].reverse().find((item) => xp >= item.minXp) ?? levelTiers[0]!;
  return { tier, progress: Math.min(100, Math.round((xp % 500) / 5)) };
}
export function authorLabel(id: string) {
  return students.find((student) => student.id === id)?.name ?? "Classmate";
}
export function getChannel(id: string) {
  return channels.find((channel) => channel.id === id) ?? channels[0]!;
}
export function relativeFromMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
export function filterPosts(items: CommunityPost[], query: string, tags: string[]) {
  const q = query.trim().toLowerCase();
  return items.filter(
    (post) =>
      (!q || `${post.title} ${post.body}`.toLowerCase().includes(q)) &&
      tags.every((tag) => post.tags.includes(tag)),
  );
}
export function sortPosts(items: CommunityPost[], sort: PostSort) {
  return [...items].sort((a, b) =>
    sort === "new" ? a.ageMinutes - b.ageMinutes : sort === "top" ? b.votes - a.votes : b.votes - a.votes,
  );
}
export function uniqueTags(items: CommunityPost[]) {
  return [...new Set(items.flatMap((post) => post.tags))];
}
export function findEntry(kind: LeaderboardKind, id: string) {
  return leaderboard(kind).find((entry) => entry.student.id === id);
}
export function topN(kind: LeaderboardKind, limit: number) {
  return leaderboard(kind).slice(0, limit);
}
export function risingStars(limit: number) {
  return students.slice(0, limit);
}
export function leaderboard(kind: LeaderboardKind) {
  return students
    .map((student, index) => ({
      student,
      rank: index + 1,
      metric: kind === "streak" ? student.streakDays : student.xp,
      metricLabel: kind === "streak" ? `${student.streakDays} days` : `${student.xp} XP`,
    }))
    .sort((a, b) => b.metric - a.metric);
}
