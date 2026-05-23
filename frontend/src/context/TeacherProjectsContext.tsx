import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Project } from "@/data/projects";
import { createMilestone, createTeacherProject } from "@/data/projects";

const STORAGE_KEY = "greennovation-teacher-projects-v1";

const SEED_PROJECTS: Project[] = [
  {
    id: "tproj-oop-lab",
    name: "OOP Lab — Bank Account",
    tag: "Python",
    due: "Jun 15, 2026",
    dueISO: "2026-06-15",
    nextStep: "Implement the Account class with deposit and withdraw",
    milestones: [
      { id: "tproj-oop-lab-m1", name: "Draw UML class diagram", done: false },
      { id: "tproj-oop-lab-m2", name: "Implement Account class", done: false },
      { id: "tproj-oop-lab-m3", name: "Write unit tests", done: false },
      { id: "tproj-oop-lab-m4", name: "Submit lab report PDF", done: false },
    ],
    notes: 0,
    assignedByTeacher: true,
    classId: "py-section-b",
  },
];

function loadFromStorage(): Project[] {
  if (typeof window === "undefined") return SEED_PROJECTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PROJECTS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return SEED_PROJECTS;
    return parsed as Project[];
  } catch {
    return SEED_PROJECTS;
  }
}

type TeacherProjectsContextValue = {
  assignments: Project[];
  hydrated: boolean;
  createProject: (opts: {
    name: string;
    tag: string;
    dueISO: string;
    nextStep: string;
    classId: string;
  }) => void;
  deleteProject: (projectId: string) => void;
  addTask: (projectId: string, taskName: string) => void;
  removeTask: (projectId: string, milestoneId: string) => void;
  updateProject: (
    projectId: string,
    patch: Partial<Pick<Project, "name" | "tag" | "dueISO" | "nextStep">>,
  ) => void;
  projectsForClass: (classId: string) => Project[];
};

const TeacherProjectsContext = createContext<TeacherProjectsContextValue | null>(null);

export function TeacherProjectsProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAssignments(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    } catch {
      /* quota */
    }
  }, [assignments, hydrated]);

  const value = useMemo<TeacherProjectsContextValue>(() => {
    const createProject = (opts: {
      name: string;
      tag: string;
      dueISO: string;
      nextStep: string;
      classId: string;
    }) => {
      const created = createTeacherProject(opts);
      setAssignments((prev) => [...prev, created]);
    };

    const deleteProject = (projectId: string) => {
      setAssignments((prev) => prev.filter((p) => p.id !== projectId));
    };

    const addTask = (projectId: string, taskName: string) => {
      const trimmed = taskName.trim();
      if (!trimmed) return;
      setAssignments((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            milestones: [...p.milestones, createMilestone(trimmed, projectId)],
          };
        }),
      );
    };

    const removeTask = (projectId: string, milestoneId: string) => {
      setAssignments((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return { ...p, milestones: p.milestones.filter((m) => m.id !== milestoneId) };
        }),
      );
    };

    const updateProject = (
      projectId: string,
      patch: Partial<Pick<Project, "name" | "tag" | "dueISO" | "nextStep">>,
    ) => {
      setAssignments((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const dueISO = patch.dueISO ?? p.dueISO;
          return {
            ...p,
            ...patch,
            dueISO,
            due:
              patch.dueISO != null
                ? new Date(`${dueISO}T12:00:00`).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : p.due,
          };
        }),
      );
    };

    const projectsForClass = (classId: string) => assignments.filter((p) => p.classId === classId);

    return {
      assignments,
      hydrated,
      createProject,
      deleteProject,
      addTask,
      removeTask,
      updateProject,
      projectsForClass,
    };
  }, [assignments, hydrated]);

  return (
    <TeacherProjectsContext.Provider value={value}>{children}</TeacherProjectsContext.Provider>
  );
}

export function useTeacherProjects() {
  const ctx = useContext(TeacherProjectsContext);
  if (!ctx) {
    throw new Error("useTeacherProjects must be used within TeacherProjectsProvider");
  }
  return ctx;
}

export function loadTeacherAssignments(): Project[] {
  return loadFromStorage();
}

export const TEACHER_PROJECTS_STORAGE_KEY = STORAGE_KEY;
