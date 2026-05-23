import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Project } from "@/data/projects";
import { mergeProjectsForStudent } from "@/data/projects";
import { currentStudent } from "@/data/studentProfile";
import { loadTeacherAssignments } from "@/context/TeacherProjectsContext";
import { fetchProjects, saveProjects } from "@/lib/api";

const STORAGE_KEY = "greennovation-projects-v1";
const SAVE_DEBOUNCE_MS = 800;

function loadFromStorage(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Project[];
  } catch {
    return [];
  }
}

function mergeWithTeacherAssignments(saved: Project[]): Project[] {
  const templates = loadTeacherAssignments();
  return mergeProjectsForStudent(saved, templates, currentStudent.classId);
}

type ProjectsContextValue = {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  /** True after first load from API or local fallback (avoid saving defaults before hydrate). */
  hydrated: boolean;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchProjects();
        if (cancelled) return;
        setProjects(mergeWithTeacherAssignments(remote));
      } catch {
        if (!cancelled) setProjects(mergeWithTeacherAssignments(loadFromStorage()));
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-merge when teacher updates assignments in another tab
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "greennovation-teacher-projects-v1") return;
      setProjects((prev) => mergeWithTeacherAssignments(prev));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      /* quota */
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void saveProjects(projects).catch(() => {
        /* offline or API down — localStorage still has latest */
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [projects, hydrated]);

  const value = useMemo(() => ({ projects, setProjects, hydrated }), [projects, hydrated]);

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error("useProjects must be used within ProjectsProvider");
  }
  return ctx;
}

export function useProjectsOptional() {
  return useContext(ProjectsContext);
}

/** @deprecated Used internally — exported for tests if needed */
export { mergeWithTeacherAssignments };
