import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Notebook,
  Plus,
  Presentation,
  Upload,
  Users,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { useCatalog } from "@/context/CatalogContext";
import { fetchCourseUploads, uploadCoursePdf, type CourseUpload } from "@/lib/api";
import {
  classesForCourse,
  getCourse,
  summarizeClass,
  type CourseMaterial,
  type MaterialKind,
} from "@/data/teacher";

export const Route = createFileRoute("/teacher/courses/$courseId")({
  component: CourseDetailPage,
  loader: ({ params }) => {
    // Seed/catalog may still be hydrating; validate id shape only.
    if (!params.courseId) throw notFound();
    return { courseId: params.courseId };
  },
});

function CourseDetailPage() {
  const { courseId } = Route.useLoaderData();
  const { courses, updateCourses, hydrated } = useCatalog();
  const course = useMemo(
    () => courses.find((c) => c.id === courseId) ?? getCourse(courseId),
    [courses, courseId],
  );
  const courseClasses = course ? classesForCourse(course.id) : [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chapterTargetRef = useRef<string | null>(null);
  const [uploads, setUploads] = useState<CourseUpload[]>([]);
  const [uploadingChapterId, setUploadingChapterId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!course) return;
    let cancelled = false;
    void fetchCourseUploads()
      .then((rows) => {
        if (!cancelled) setUploads(rows.filter((row) => row.course_id === course.id));
      })
      .catch(() => {
        if (!cancelled) setUploads([]);
      });
    return () => {
      cancelled = true;
    };
  }, [course]);

  if (!course) {
    if (!hydrated) {
      return (
        <TeacherShell eyebrow="Course" title="Loading…" description="Fetching the shared catalog.">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading course…
          </div>
        </TeacherShell>
      );
    }
    throw notFound();
  }

  const toggleMaterialStatus = async (chapterId: string, materialId: string) => {
    const nextCourses = courses.map((c) => {
      if (c.id !== course.id) return c;
      return {
        ...c,
        chapters: c.chapters.map((ch) => {
          if (ch.id !== chapterId) return ch;
          return {
            ...ch,
            materials: ch.materials.map((m) => {
              if (m.id !== materialId) return m;
              return {
                ...m,
                status: m.status === "Published" ? ("Draft" as const) : ("Published" as const),
              };
            }),
          };
        }),
      };
    });
    await updateCourses(nextCourses);
  };

  const totalMaterials =
    course.chapters.reduce((sum, chapter) => sum + chapter.materials.length, 0) +
    uploads.length;

  const openUpload = (chapterId: string) => {
    chapterTargetRef.current = chapterId;
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const onPdfSelected = async (file: File | undefined) => {
    const chapterId = chapterTargetRef.current;
    if (!file || !chapterId) return;
    setUploadingChapterId(chapterId);
    setUploadError(null);
    try {
      const saved = await uploadCoursePdf(file, course.id, chapterId);
      setUploads((current) => [
        ...current.filter((row) => row.filename.toLowerCase() !== saved.filename.toLowerCase()),
        saved,
      ]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploadingChapterId(null);
    }
  };

  return (
    <TeacherShell
      eyebrow="Course"
      title={course.title}
      description={course.description}
      actions={
        <Link
          to="/teacher/courses"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          All courses
        </Link>
      }
    >
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Chapters" value={course.chapters.length} />
        <Stat label="Materials" value={totalMaterials} />
        <Stat label="Classes using it" value={courseClasses.length} />
        <Stat label="Status" value={course.status} />
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onPdfSelected(file);
        }}
      />

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
                Curriculum
              </div>
              <h2 className="font-display text-xl font-bold">Chapters</h2>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add chapter
            </button>
          </div>

          {uploadError ? (
            <p className="text-sm text-destructive">{uploadError}</p>
          ) : null}

          {course.chapters.map((chapter) => {
            const chapterUploads = uploads.filter((row) => row.chapter_id === chapter.id);
            const indexing = uploadingChapterId === chapter.id;
            return (
            <article
              key={chapter.id}
              className="rounded-3xl bg-card border border-border p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    Chapter {chapter.order}
                  </div>
                  <h3 className="font-display text-lg font-bold mt-1">{chapter.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{chapter.summary}</p>
                </div>
                <button
                  type="button"
                  disabled={indexing}
                  onClick={() => openUpload(chapter.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted whitespace-nowrap disabled:opacity-60"
                >
                  {indexing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {indexing ? "Indexing…" : "Upload PDF"}
                </button>
              </div>

              {chapter.materials.length === 0 && chapterUploads.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-4 italic">
                  No materials yet. Upload a PDF to index it for students.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {chapter.materials.map((material) => (
                    <MaterialRow
                      key={material.id}
                      material={material}
                      onToggleStatus={() => void toggleMaterialStatus(chapter.id, material.id)}
                    />
                  ))}
                  {chapterUploads.map((upload) => (
                    <MaterialRow key={upload.filename} material={materialFromUpload(upload)} />
                  ))}
                </ul>
              )}
            </article>
            );
          })}
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
            <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
              Reach
            </div>
            <h2 className="font-display text-xl font-bold">Classes using this course</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Edits to chapters above flow to every class below.
            </p>
            {courseClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-4">
                No classes assigned yet. Create a class to start teaching this course.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {courseClasses.map((cls) => {
                  const summary = summarizeClass(cls);
                  return (
                    <Link
                      key={cls.id}
                      to="/teacher/classes/$classId"
                      params={{ classId: cls.id }}
                      className="flex items-center gap-3 rounded-2xl border border-border p-3 hover:border-primary/40 transition"
                    >
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{cls.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {summary.studentCount} students - {cls.schedule}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {summary.averageProgress}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
            <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
              Heads up
            </div>
            <p className="text-sm mt-2">
              Materials marked <strong>Draft</strong> are invisible to students. Publish them when
              they're ready.
            </p>
          </div>
        </div>
      </section>
    </TeacherShell>
  );
}

function materialFromUpload(upload: CourseUpload): CourseMaterial {
  const kb = upload.size_bytes / 1024;
  const size = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
  const uploadedAt = upload.uploaded_at.slice(0, 10);
  return {
    id: `upload:${upload.filename}`,
    title: upload.filename,
    kind: "pdf",
    size: `${upload.pages} pages · ${size}`,
    uploadedAt,
    status: "Published",
  };
}

function MaterialRow({
  material,
  onToggleStatus,
}: {
  material: CourseMaterial;
  onToggleStatus?: () => void;
}) {
  const Icon = iconForKind(material.kind);
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 p-3">
      <div className="h-9 w-9 rounded-xl bg-card text-primary grid place-items-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{material.title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {kindLabel(material.kind)} - {material.size} - Uploaded {material.uploadedAt}
        </div>
      </div>
      {onToggleStatus ? (
        <button
          type="button"
          onClick={onToggleStatus}
          title={material.status === "Published" ? "Unpublish for students" : "Publish for students"}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition hover:opacity-80 ${
            material.status === "Published"
              ? "bg-primary/15 text-primary"
              : "bg-warning/15 text-warning"
          }`}
        >
          {material.status}
        </button>
      ) : (
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            material.status === "Published"
              ? "bg-primary/15 text-primary"
              : "bg-warning/15 text-warning"
          }`}
        >
          {material.status}
        </span>
      )}
    </li>
  );
}

function iconForKind(kind: MaterialKind) {
  if (kind === "pdf") return FileText;
  if (kind === "slides") return Presentation;
  if (kind === "exercise") return FileSpreadsheet;
  return Notebook;
}

function kindLabel(kind: MaterialKind) {
  if (kind === "pdf") return "PDF";
  if (kind === "slides") return "Slides";
  if (kind === "exercise") return "Exercise";
  return "Notes";
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
        <Layers className="h-5 w-5" />
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </article>
  );
}
