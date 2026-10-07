import {
  createContext,
  useCallback,
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
import {
  loadTeacherAssignments,
  loadTeacherAssignmentsAsync,
  TEACHER_PROJECTS_STORAGE_KEY,
} from "@/context/TeacherProjectsContext";
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

function mergeWithTemplates(saved: Project[], templates: Project[]): Project[] {
  return mergeProjectsForStudent(saved, templates, currentStudent.classId);
}

type ProjectsContextValue = {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  /** True after first load from API or local fallback (avoid saving defaults before hydrate). */
  hydrated: boolean;
  refreshFromTeacher: () => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templatesRef = useRef<Project[]>([]);
  const skipNextSave = useRef(true);

  const applyMerge = useCallback((saved: Project[], templates: Project[]) => {
    templatesRef.current = templates;
    setProjects(mergeWithTemplates(saved, templates));
  }, []);

  const refreshFromTeacher = useCallback(async () => {
    const templates = await loadTeacherAssignmentsAsync();
    setProjects((prev) => mergeWithTemplates(prev, templates));
    templatesRef.current = templates;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [remote, templates] = await Promise.all([
          fetchProjects(),
          loadTeacherAssignmentsAsync(),
        ]);
        if (cancelled) return;
        skipNextSave.current = true;
        applyMerge(remote, templates);
      } catch {
        if (!cancelled) {
          skipNextSave.current = true;
          applyMerge(loadFromStorage(), loadTeacherAssignments());
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMerge]);

  // Re-merge when teacher updates assignments (other tab localStorage OR same-tab custom event)
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;

    const rematch = () => {
      void loadTeacherAssignmentsAsync().then((templates) => {
        setProjects((prev) => mergeWithTemplates(prev, templates));
        templatesRef.current = templates;
      });
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== TEACHER_PROJECTS_STORAGE_KEY) return;
      rematch();
    };
    const onCustom = () => rematch();

    window.addEventListener("storage", onStorage);
    window.addEventListener("greennovation-teacher-projects-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("greennovation-teacher-projects-changed", onCustom);
    };
  }, [hydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      /* quota */
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      // Persist student-owned + progress on class assignments (templates stay on /api/teacher/projects).
      void saveProjects(projects).catch(() => {
        /* offline or API down — localStorage still has latest */
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [projects, hydrated]);

  const value = useMemo(
    () => ({ projects, setProjects, hydrated, refreshFromTeacher }),
    [projects, hydrated, refreshFromTeacher],
  );

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
export function mergeWithTeacherAssignments(saved: Project[]): Project[] {
  return mergeWithTemplates(saved, loadTeacherAssignments());
}
