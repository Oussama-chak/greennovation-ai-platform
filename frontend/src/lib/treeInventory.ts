// Lightweight global tree-inventory store with subscription API.
// Used by DailyReward, Projects, Forest, and the floating reward toast.

const INVENTORY_KEY = "routiny:treeInventory";
const HISTORY_KEY = "routiny:treeHistory"; // dedupe daily/project rewards
const SEED_KEY = "routiny:treeSeeded"; // tracks initial seed grant
const INITIAL_TREES = 3;

export type TreeReward = {
  id: string;
  reason: "daily" | "project" | "manual";
  message: string;
  earnedAt: number;
};

type Listener = (state: { count: number; lastReward: TreeReward | null }) => void;

let listeners = new Set<Listener>();
let lastReward: TreeReward | null = null;

function read(): number {
  if (typeof window === "undefined") return 0;
  // Seed initial inventory once per browser
  if (!localStorage.getItem(SEED_KEY)) {
    localStorage.setItem(INVENTORY_KEY, String(INITIAL_TREES));
    localStorage.setItem(SEED_KEY, "1");
    return INITIAL_TREES;
  }
  const raw = localStorage.getItem(INVENTORY_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function write(n: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(INVENTORY_KEY, String(Math.max(0, n)));
}

function emit() {
  const state = { count: read(), lastReward };
  listeners.forEach((l) => l(state));
}

export function getInventory(): number {
  return read();
}

export function subscribeInventory(listener: Listener): () => void {
  listeners.add(listener);
  // emit current snapshot immediately
  listener({ count: read(), lastReward });
  return () => {
    listeners.delete(listener);
  };
}

export function awardTree(reason: TreeReward["reason"], message: string, dedupeKey?: string) {
  if (typeof window === "undefined") return;
  if (dedupeKey) {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: string[] = raw ? JSON.parse(raw) : [];
    if (history.includes(dedupeKey)) return; // already awarded
    history.push(dedupeKey);
    // Keep last 100 keys
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-100)));
  }
  write(read() + 1);
  lastReward = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reason,
    message,
    earnedAt: Date.now(),
  };
  emit();
}

export function consumeTree(): boolean {
  const n = read();
  if (n <= 0) return false;
  write(n - 1);
  emit();
  return true;
}

export function clearLastReward() {
  lastReward = null;
  emit();
}

// Convenience: returns YYYY-MM-DD for daily dedupe
export function todayDedupeKey(): string {
  const d = new Date();
  return `daily-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
