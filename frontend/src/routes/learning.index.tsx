import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AvatarTip } from "@/components/AvatarTip";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Play,
  Sparkles,
  Users,
} from "lucide-react";
import { useCatalog } from "@/context/CatalogContext";
import {
  continueStudyTarget,
  enrolledCoursesForStudent,
  loadLastStudy,
  saveLastStudy,
} from "@/data/studentLearning";

export const Route = createFileRoute("/learning/")({
  head: () => ({
    meta: [
      { title: "My Classroom — Routiny" },
      {
        name: "description",
        content: "Your enrolled courses, chapters, and study sessions in one place.",
      },
      { property: "og:title", content: "My Classroom — Routiny" },
      {
        property: "og:description",
        content: "Pick a course, choose a chapter, and start a focused study session.",
      },
    ],
  }),
  component: LearningPage,
});

function LearningPage() {
  const navigate = useNavigate();
  const { hydrated } = useCatalog();
  const courses = useMemo(() => enrolledCoursesForStudent(), [hydrated]);
  const continueTarget = continueStudyTarget();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useEffect(() => {
    if (expandedCourse == null && courses[0]?.courseId) {
      setExpandedCourse(courses[0].courseId);
    }
  }, [courses, expandedCourse]);

  const continueCourse = useMemo(
    () => courses.find((c) => c.courseId === continueTarget?.courseId),
    [courses, continueTarget],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="My classroom"
        title="Your courses"
        description="Pick a course, choose a chapter, then open your study workspace with materials and AI support."
      />

      {continueTarget && continueCourse ? (
        <div className="rounded-3xl gradient-sky p-6 lg:p-8 shadow-card relative overflow-hidden">
          <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-card/30 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold bg-card/70 px-2.5 py-1 rounded-full">
                Continue where you left off
              </span>
              <h2 className="font-display text-2xl lg:text-3xl font-bold mt-3 leading-tight">
                {continueCourse.title}
              </h2>
              <p className="mt-2 text-foreground/80 max-w-md text-sm">
                {continueCourse.className} · {continueCourse.term} · {continueCourse.progress}%
                course progress
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                saveLastStudy(continueTarget.courseId, continueTarget.chapterId);
                void navigate({
                  to: "/learning/$courseId/study",
                  params: { courseId: continueTarget.courseId },
                  search: { chapter: continueTarget.chapterId },
                });
              }}
              className="cta-attention relative z-10 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary text-primary-foreground px-5 py-3 text-sm font-bold shadow-glow hover:opacity-95 shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              Continue session
            </button>
          </div>
        </div>
      ) : null}

      <AvatarTip message="Open a course below, pick a chapter, then start your session — chat and tools stay scoped to that chapter." />

      {courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
          <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-display text-xl font-bold">No enrolled courses</h2>
          <p className="text-sm text-muted-foreground mt-2">
            When your professor adds you to a class, your courses will show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {courses.map((course) => {
            const open = expandedCourse === course.courseId;
            const last = loadLastStudy();
            const defaultChapter =
              course.chapters.find((ch) => ch.studyChapterId) ?? course.chapters[0];
            const startChapterId =
              last?.courseId === course.courseId
                ? last.chapterId
                : (defaultChapter?.studyChapterId ?? `${course.courseId}-syllabus`);

            return (
              <article
                key={course.courseId}
                className="rounded-3xl bg-card border border-border p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full bg-primary/10 text-primary px-2 py-0.5">
                        <Users className="h-3 w-3" />
                        {course.className}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{course.term}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold leading-tight">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {course.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">Progress</div>
                    <div className="font-display text-2xl font-bold">{course.progress}%</div>
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full gradient-primary rounded-full"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-5">
                  {defaultChapter ? (
                    <Link
                      to="/learning/$courseId/study"
                      params={{ courseId: course.courseId }}
                      search={{ chapter: startChapterId }}
                      onClick={() => saveLastStudy(course.courseId, startChapterId)}
                      className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-bold shadow-soft hover:opacity-95"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Start session
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setExpandedCourse(open ? null : course.courseId)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Choose chapter
                  </button>
                </div>

                {open ? (
                  <ul className="mt-4 space-y-2 border-t border-border pt-4">
                    <li className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1">
                      Chapters
                    </li>
                    {course.chapters.map((ch) => (
                      <li key={ch.id}>
                        <div className="rounded-2xl border border-border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold">
                                Ch. {ch.order} — {ch.title}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {ch.summary}
                              </p>
                              <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {ch.materialCount} published material
                                {ch.materialCount === 1 ? "" : "s"}
                              </div>
                            </div>
                            {ch.studyChapterId ? (
                              <Link
                                to="/learning/$courseId/study"
                                params={{ courseId: course.courseId }}
                                search={{ chapter: ch.studyChapterId }}
                                onClick={() => saveLastStudy(course.courseId, ch.studyChapterId!)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-muted px-3 py-2 text-xs font-bold hover:bg-primary/10 hover:text-primary"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Open
                              </Link>
                            ) : (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
