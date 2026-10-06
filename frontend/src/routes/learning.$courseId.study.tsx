import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceSession } from "@/components/workspace/WorkspaceSession";
import { fetchCorpusFiles } from "@/lib/api";
import type { Material } from "@/data/chapters";
import {
  buildCourseMaterials,
  getEnrolledCourse,
  resolveStudyChapter,
  saveLastStudy,
} from "@/data/studentLearning";

type StudySearch = {
  chapter?: string;
};

export const Route = createFileRoute("/learning/$courseId/study")({
  validateSearch: (search: Record<string, unknown>): StudySearch => ({
    chapter: typeof search.chapter === "string" ? search.chapter : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Study — ${params.courseId} — Routiny` },
      {
        name: "description",
        content: "Course workspace with reader, AI chat, summaries and quizzes.",
      },
    ],
  }),
  component: StudySessionPage,
});

function StudySessionPage() {
  const { courseId } = Route.useParams();
  const { chapter: chapterSearch } = Route.useSearch();
  const navigate = useNavigate();
  const enrolled = getEnrolledCourse(courseId);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchCorpusFiles();
        if (cancelled) return;
        setMaterials(buildCourseMaterials(courseId, res.files));
      } catch (e) {
        if (!cancelled) {
          setMaterials(buildCourseMaterials(courseId, []));
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const activeChapterId = useMemo(
    () => resolveStudyChapter(courseId, materials, chapterSearch),
    [courseId, materials, chapterSearch],
  );

  if (!enrolled) {
    throw notFound();
  }

  const handleChapterChange = (chapterId: string) => {
    saveLastStudy(courseId, chapterId);
    void navigate({
      to: "/learning/$courseId/study",
      params: { courseId },
      search: { chapter: chapterId },
      replace: true,
    });
  };

  if (!loading && materials.length === 0) {
    return (
      <div className="max-w-lg mx-auto rounded-3xl border border-border bg-card p-8 text-center shadow-card">
        <h1 className="font-display text-xl font-bold">No materials yet</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your professor has not published any chapters for {enrolled.title} yet.
        </p>
        <Link
          to="/learning"
          className="inline-flex mt-5 rounded-xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold"
        >
          Back to classroom
        </Link>
      </div>
    );
  }

  return (
    <WorkspaceSession
      courseId={courseId}
      courseTitle={enrolled.title}
      classLabel={`${enrolled.className} · ${enrolled.term}`}
      materials={materials}
      materialsLoading={loading}
      materialsError={error}
      initialChapterId={activeChapterId}
      onChapterChange={handleChapterChange}
    />
  );
}
