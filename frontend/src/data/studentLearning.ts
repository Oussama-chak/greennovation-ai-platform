import type { CourseUpload, CorpusFile } from "@/lib/api";
import { corpusFileUrl } from "@/lib/api";
import type { Chapter, Material } from "@/data/chapters";
import { getClasses, getCourse, getCourses } from "@/lib/catalogStore";

export type EnrolledChapter = {
  id: string;
  order: number;
  title: string;
  summary: string;
  materialCount: number;
  /** Set when the chapter has something published the student can open. */
  studyChapterId: string | null;
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

const LAST_STUDY_KEY = "greennovation-last-study-v1";

/** Published teacher courses, from the same catalog the teacher page edits. */
export function enrolledCoursesForStudent(): EnrolledCourse[] {
  return getCourses()
    .filter((course) => course.status !== "Draft")
    .map((course) => {
      const cls = getClasses().find((item) => item.courseId === course.id);
      const progress =
        cls && cls.enrollments.length > 0
          ? Math.round(
              cls.enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0) /
                cls.enrollments.length,
            )
          : 0;
      return {
        courseId: course.id,
        title: course.title,
        className: cls?.name ?? "Your class",
        term: cls?.term ?? "",
        description: course.description,
        progress,
        chapters: [...course.chapters]
          .sort((a, b) => a.order - b.order)
          .map((chapter) => {
            const published = chapter.materials.filter((material) => material.status === "Published");
            return {
              id: chapter.id,
              order: chapter.order,
              title: chapter.title,
              summary: chapter.summary,
              materialCount: published.length,
              studyChapterId: published.length > 0 ? chapter.id : null,
            };
          }),
      };
    });
}

export function getEnrolledCourse(courseId: string): EnrolledCourse | undefined {
  return enrolledCoursesForStudent().find((course) => course.courseId === courseId);
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

export function buildCourseMaterials(
  courseId: string,
  _files: CorpusFile[],
  uploads: CourseUpload[] = [],
): Material[] {
  const course = getCourse(courseId);
  if (!course || course.status === "Draft") return [];

  const courseUploads = uploads.filter((upload) => upload.course_id === courseId);
  const chapters: Chapter[] = [];

  for (const chapter of [...course.chapters].sort((a, b) => a.order - b.order)) {
    const published = chapter.materials.filter((material) => material.status === "Published");
    const chapterUploads = courseUploads.filter((upload) => upload.chapter_id === chapter.id);
    if (published.length === 0 && chapterUploads.length === 0) continue;

    if (chapterUploads.length > 0) {
      for (const upload of chapterUploads) {
        const isSlides = /\.pptx?$/i.test(upload.filename);
        chapters.push({
          id: `${chapter.id}-${upload.slug}`,
          name: upload.filename.replace(/\.(pdf|pptx|docx|ppt)$/i, ""),
          pages: upload.pages,
          kind: isSlides ? "pptx" : "pdf",
          pdfUrl: isSlides ? undefined : corpusFileUrl(upload.filename),
          pptxUrl: isSlides ? corpusFileUrl(upload.filename) : undefined,
          sourceFilename: upload.filename,
        });
      }
      continue;
    }

    chapters.push({
      id: chapter.id,
      name: `Ch. ${chapter.order} — ${chapter.title}`,
      pages: Math.max(published.length, 1),
      kind: "rich",
      blocks: [
        { type: "h2", text: chapter.title },
        { type: "p", text: chapter.summary || "Published course material." },
      ],
    });
  }

  if (chapters.length === 0) return [];
  return [{ id: course.id, name: course.title, chapters }];
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
