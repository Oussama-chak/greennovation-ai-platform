import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TeacherClass, TeacherCourse, TeacherStudent } from "@/data/teacher";
import { fetchCatalog, saveCatalog } from "@/lib/api";
import { getCatalogState, hydrateCatalog, subscribeCatalog } from "@/lib/catalogStore";

type CatalogContextValue = {
  courses: TeacherCourse[];
  classes: TeacherClass[];
  students: TeacherStudent[];
  hydrated: boolean;
  refresh: () => Promise<void>;
  replaceCatalog: (next: {
    courses: TeacherCourse[];
    classes: TeacherClass[];
    students: TeacherStudent[];
  }) => Promise<void>;
  updateCourses: (courses: TeacherCourse[]) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => subscribeCatalog(() => setVersion((v) => v + 1)), []);

  const refresh = useCallback(async () => {
    try {
      const remote = await fetchCatalog();
      hydrateCatalog(remote);
    } catch {
      /* keep seed / last good catalog */
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const replaceCatalog = useCallback(
    async (next: {
      courses: TeacherCourse[];
      classes: TeacherClass[];
      students: TeacherStudent[];
    }) => {
      hydrateCatalog(next);
      try {
        const saved = await saveCatalog(next);
        hydrateCatalog(saved);
      } catch {
        /* offline — local store still updated */
      }
    },
    [],
  );

  const updateCourses = useCallback(
    async (courses: TeacherCourse[]) => {
      const current = getCatalogState();
      await replaceCatalog({
        courses,
        classes: current.classes,
        students: current.students,
      });
    },
    [replaceCatalog],
  );

  const snapshot = getCatalogState();
  const value = useMemo<CatalogContextValue>(
    () => ({
      courses: snapshot.courses,
      classes: snapshot.classes,
      students: snapshot.students,
      hydrated,
      refresh,
      replaceCatalog,
      updateCourses,
    }),
    // version bumps whenever the store hydrates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, hydrated, refresh, replaceCatalog, updateCourses],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }
  return ctx;
}

export function useCatalogOptional() {
  return useContext(CatalogContext);
}
