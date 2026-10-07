import type { CorpusFile } from "@/lib/api";
import { materials as catalog, type Chapter, type Material } from "@/data/chapters";

export type EnrolledChapter = {
  studyChapterId: string;
  name: string;
  pages: number;
};

export type EnrolledCourse = {
  courseId: string;
  title: string;
  className: string;
  term: string;
  description: string;
  progress: number;
  chapters: EnrolledChapter[];
};

export type FlatChapter = Chapter & { materialGroup: string };

const courses: EnrolledCourse[] = catalog.map((material, index) => ({
  courseId: material.id,
  title: material.name,
  className: `Section ${String.fromCharCode(65 + (index % 3))}`,
  term: "Spring 2026",
  description: `Study ${material.name} through guided chapters, examples, and AI-supported practice.`,
  progress: index === 0 ? 42 : index === 1 ? 18 : 0,
  chapters: material.chapters.map((chapter) => ({
    studyChapterId: chapter.id,
    name: chapter.name,
    pages: chapter.pages,
  })),
}));

const LAST_STUDY_KEY = "greennovation-last-study-v1";

export function enrolledCoursesForStudent(): EnrolledCourse[] {
  return courses;
}

export function getEnrolledCourse(courseId: string): EnrolledCourse | undefined {
  return courses.find((course) => course.courseId === courseId);
}

export function loadLastStudy(): { courseId: string; chapterId: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(LAST_STUDY_KEY) ?? "null") as unknown;
    if (
      value &&
      typeof value === "object" &&
      "courseId" in value &&
      "chapterId" in value &&
      typeof value.courseId === "string" &&
      typeof value.chapterId === "string"
    ) {
      return value;
    }
  } catch {
    // Ignore malformed browser storage and use the default chapter.
  }
  return null;
}

export function saveLastStudy(courseId: string, chapterId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_STUDY_KEY, JSON.stringify({ courseId, chapterId }));
  }
}

export function continueStudyTarget(): { courseId: string; chapterId: string } | null {
  const last = loadLastStudy();
  return last && getEnrolledCourse(last.courseId) ? last : null;
}

export function buildCourseMaterials(courseId: string, files: CorpusFile[]): Material[] {
  const course = getEnrolledCourse(courseId);
  if (!course) return [];
  const source = catalog.find((material) => material.id === courseId);
  if (!source) return [];
  if (!files.length) return [source];
  return [
    {
      ...source,
      chapters: source.chapters.map((chapter) => ({
        ...chapter,
        sourceFilename: chapter.sourceFilename ?? files[0]?.name,
      })),
    },
  ];
}

export function resolveStudyChapter(
  courseId: string,
  courseMaterials: Material[],
  requestedChapter?: string,
): string {
  const chapters = flattenChapters(courseMaterials);
  return (
    chapters.find((chapter) => chapter.id === requestedChapter)?.id ??
    loadLastStudy()?.chapterId ??
    chapters[0]?.id ??
    `${courseId}-syllabus`
  );
}

export function flattenChapters(courseMaterials: Material[]): FlatChapter[] {
  return courseMaterials.flatMap((material) =>
    material.chapters.map((chapter) => ({ ...chapter, materialGroup: material.name })),
  );
}
