import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Mail, MoreHorizontal } from "lucide-react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import {
  getClass,
  getCourse,
  getStudent,
  summarizeClass,
  type ClassEnrollment,
  type StudentStanding,
} from "@/data/teacher";

export const Route = createFileRoute("/teacher/classes/$classId")({
  component: ClassDetailPage,
  loader: ({ params }) => {
    const cls = getClass(params.classId);
    if (!cls) throw notFound();
    return { cls };
  },
});

function ClassDetailPage() {
  const { cls } = Route.useLoaderData();
  const course = getCourse(cls.courseId);
  const summary = summarizeClass(cls);

  return (
    <TeacherShell
      eyebrow="Class"
      title={cls.name}
      description={`${summary.courseTitle} - ${cls.term} - ${cls.schedule}`}
      actions={
        <Link
          to="/teacher/classes"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          All classes
        </Link>
      }
    >
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Students" value={summary.studentCount} />
        <Stat label="Avg progress" value={`${summary.averageProgress}%`} />
        <Stat
          label="Needs support"
          value={summary.needsSupport}
          tone={summary.needsSupport > 0 ? "warn" : undefined}
        />
        <Stat label="Term" value={cls.term} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
                Roster
              </div>
              <h2 className="font-display text-xl font-bold">Students in this class</h2>
            </div>
            <button type="button" className="text-xs font-semibold text-primary hover:underline">
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Progress</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2 pr-3">Last active</th>
                  <th className="py-2 pr-3">Standing</th>
                  <th className="py-2 pr-3" aria-label="actions"></th>
                </tr>
              </thead>
              <tbody>
                {cls.enrollments.map((enrollment) => (
                  <StudentRow key={enrollment.studentId} enrollment={enrollment} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
            <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
              Course
            </div>
            <h2 className="font-display text-xl font-bold">{summary.courseTitle}</h2>
            {course ? (
              <>
                <p className="text-sm text-muted-foreground mt-2">{course.description}</p>
                <div className="mt-4 space-y-2">
                  {course.chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm"
                    >
                      <span className="font-medium truncate">
                        {chapter.order}. {chapter.title}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {chapter.materials.length} item
                        {chapter.materials.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/teacher/courses/$courseId"
                  params={{ courseId: course.id }}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                >
                  <BookOpen className="h-4 w-4" />
                  Open course builder
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Course not found.</p>
            )}
          </div>

          <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
            <div className="text-[10px] uppercase tracking-widest text-warning font-bold">Tip</div>
            <p className="text-sm mt-2">
              Editing the chapters above changes content for <strong>every class</strong> using this
              course. Class rosters stay separate.
            </p>
          </div>
        </div>
      </section>
    </TeacherShell>
  );
}

function StudentRow({ enrollment }: { enrollment: ClassEnrollment }) {
  const student = getStudent(enrollment.studentId);
  if (!student) return null;
  const initials = student.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <tr className="border-t border-border">
      <td className="py-3 pr-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground grid place-items-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{student.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{student.email}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 pr-3 min-w-[140px]">
        <ProgressBar value={enrollment.progress} />
      </td>
      <td className="py-3 pr-3 text-sm font-semibold whitespace-nowrap">
        {enrollment.averageScore}%
      </td>
      <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">
        {enrollment.lastActive}
      </td>
      <td className="py-3 pr-3 whitespace-nowrap">
        <StandingBadge standing={enrollment.standing} />
      </td>
      <td className="py-3 pr-3">
        <button
          type="button"
          className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Actions for ${student.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full gradient-primary" style={{ width: `${safe}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-9 text-right">{safe}%</span>
    </div>
  );
}

function StandingBadge({ standing }: { standing: StudentStanding }) {
  const tone =
    standing === "Excellent"
      ? "bg-primary/15 text-primary"
      : standing === "On track"
        ? "bg-muted text-foreground"
        : "bg-warning/15 text-warning";
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${tone}`}>{standing}</span>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "warn" }) {
  return (
    <article
      className={`rounded-3xl border p-5 shadow-card ${
        tone === "warn" ? "bg-warning/5 border-warning/30" : "bg-card border-border"
      }`}
    >
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </article>
  );
}
