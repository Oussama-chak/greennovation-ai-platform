export type RewardKind = "quote" | "fact" | "summary" | "badge";

export type WallBook = {
  id: number;
  mystery: boolean;
  th: number;
  subj: string;
  c: string;
  w: number;
  h: number;
  row: number;
  col: number;
  awake: boolean;
  a: number;
  title: string;
  due?: string;
  reward?: { kind: RewardKind; text: string };
  dl?: string;
  shaking?: boolean;
};

export type WallSnapshot = {
  done: number;
  total: number;
  ink: number;
  inkDisplay: number;
  streakDays: number;
  nextTitle: string | null;
  say: string;
};

export type WallActions = {
  completeNext: () => void;
  focusNext: () => void;
};


