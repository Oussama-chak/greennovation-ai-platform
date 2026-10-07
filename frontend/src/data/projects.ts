export type Milestone = {
  id: string;
  name: string;
  done: boolean;
};

export type Project = {
  id: string;
  name: string;
  tag: string;
  due: string;
  dueISO: string;
  nextStep: string;
  notes: number;
  milestones: Milestone[];
  assignedByTeacher?: boolean;
  classId?: string;
};

export function projectProgressPercent(p: Project): number {
  const m = p.milestones;
  if (!m.length) return 0;
  const done = m.filter((x) => x.done).length;
  return Math.round((done / m.length) * 100);
}

export function isTeacherAssigned(project: Project): boolean {
  return project.assignedByTeacher === true;
}

export function daysUntilDue(dueISO: string): number {
  const [y, mo, d] = dueISO.split("-").map(Number);
  const due = new Date(y, mo - 1, d);
  due.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function deadlineUrgency(days: number): "high" | "med" | "low" {
  if (days <= 3) return "high";
  if (days <= 10) return "med";
  return "low";
}

export function dueRelativePhrase(dueISO: string): string {
  const n = daysUntilDue(dueISO);
  if (n < 0) return `${-n}d overdue`;
  if (n === 0) return "Due today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
}

/** Progress + deadline pressure from API-backed projects. No projects → no score. */
export function deriveReadinessScore(projects: Project[]): number | null {
  if (!projects.length) return null;
  const avgProg = projects.reduce((sum, p) => sum + projectProgressPercent(p), 0) / projects.length;
  const minDays = Math.min(...projects.map((p) => Math.max(0, daysUntilDue(p.dueISO))));
  const urgencyBoost = minDays <= 3 ? 10 : minDays <= 7 ? 5 : 0;
  const raw = 38 + avgProg * 0.42 + urgencyBoost;
  return Math.round(Math.min(96, Math.max(44, raw)));
}

export function createEmptyProject(opts: {
  name: string;
  tag?: string;
  dueISO: string;
  nextStep?: string;
}): Project {
  return {
    id: `p-${crypto.randomUUID().slice(0, 8)}`,
    name: opts.name.trim(),
    tag: opts.tag?.trim() || "General",
    due: "",
    dueISO: opts.dueISO,
    nextStep: opts.nextStep?.trim() ?? "",
    notes: 0,
    milestones: [],
  };
}

export function createMilestone(name: string, projectId: string): Milestone {
  return {
    id: `${projectId}-m-${crypto.randomUUID().slice(0, 8)}`,
    name: name.trim(),
    done: false,
  };
}

export function createTeacherProject(opts: {
  name: string;
  tag: string;
  dueISO: string;
  nextStep: string;
  classId: string;
}): Project {
  return {
    ...createEmptyProject(opts),
    due: new Date(`${opts.dueISO}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    assignedByTeacher: true,
    classId: opts.classId,
  };
}

export function mergeProjectsForStudent(
  saved: Project[],
  templates: Project[],
  classId: string,
): Project[] {
  const assigned = templates.filter((project) => project.classId === classId);
  const byId = new Map(saved.map((project) => [project.id, project]));
  for (const template of assigned) {
    if (!byId.has(template.id)) byId.set(template.id, { ...template });
  }
  return [...byId.values()];
}
