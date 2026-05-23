import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Layers,
  Notebook,
  Plus,
  Presentation,
  Upload,
  Users,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
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
    const course = getCourse(params.courseId);
    if (!course) throw notFound();
    return { course };
  },
});

function CourseDetailPage() {
  const { course } = Route.useLoaderData();
  const courseClasses = classesForCourse(course.id);
  const totalMaterials = course.chapters.reduce(
    (sum, chapter) => sum + chapter.materials.length,
    0,
  );

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

          {course.chapters.map((chapter) => (
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
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
              </div>

              {chapter.materials.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-4 italic">
                  No materials yet. Drop a PDF, slide deck, or notes to get started.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {chapter.materials.map((material) => (
                    <MaterialRow key={material.id} material={material} />
                  ))}
                </ul>
              )}
            </article>
          ))}
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

function MaterialRow({ material }: { material: CourseMaterial }) {
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
      <span
        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
          material.status === "Published"
            ? "bg-primary/15 text-primary"
            : "bg-warning/15 text-warning"
        }`}
      >
        {material.status}
      </span>
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
