import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Plus,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { useCatalog } from "@/context/CatalogContext";
import {
  draftMaterials,
  studentsNeedingSupport,
  summarizeClass,
  teacherStats,
} from "@/data/teacher";

export const Route = createFileRoute("/teacher/")({
  component: TeacherOverview,
});

function TeacherOverview() {
  const { classes } = useCatalog();
  const summaries = classes.map(summarizeClass);
  const supportAlerts = studentsNeedingSupport(5);
  const drafts = draftMaterials();

  return (
    <TeacherShell
      eyebrow="Teacher Office"
      title="Overview"
      description="Daily snapshot: who you teach, who needs help today, and what's still in draft."
      actions={
        <Link
          to="/teacher/courses"
          className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-3 py-2 text-sm font-bold shadow-glow"
        >
          <Plus className="h-4 w-4" />
          New course
        </Link>
      }
    >
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Classes" value={teacherStats.classes} detail="This term" />
        <Stat
          icon={GraduationCap}
          label="Students"
          value={teacherStats.students}
          detail="Across classes"
        />
        <Stat
          icon={AlertTriangle}
          label="Need support"
          value={teacherStats.needsSupport}
          detail="Flagged today"
        />
        <Stat icon={BookOpen} label="Courses" value={teacherStats.courses} detail="Owned by you" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
                Classes
              </div>
              <h2 className="font-display text-xl font-bold">My classes</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Cohorts you teach this term. Open a class to see its students.
              </p>
            </div>
            <Link
              to="/teacher/classes"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summaries.map((summary) => (
              <Link
                key={summary.id}
                to="/teacher/classes/$classId"
                params={{ classId: summary.id }}
                className="rounded-2xl border border-border p-4 transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                      {summary.courseTitle}
                    </div>
                    <h3 className="text-sm font-semibold truncate">{summary.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {summary.term} - {summary.schedule}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <MiniMetric value={summary.studentCount} label="Students" />
                  <MiniMetric value={`${summary.averageProgress}%`} label="Avg progress" />
                  <MiniMetric value={summary.needsSupport} label="Needs help" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-warning font-bold">
                Alerts
              </div>
              <h2 className="font-display text-xl font-bold">Students needing support</h2>
            </div>
            <Link
              to="/teacher/classes"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {supportAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing flagged right now. Check back after the next quiz.
            </p>
          ) : (
            <div className="space-y-3">
              {supportAlerts.map((alert) => (
                <Link
                  key={`${alert.studentId}-${alert.classId}`}
                  to="/teacher/classes/$classId"
                  params={{ classId: alert.classId }}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3 hover:border-primary/40 transition"
                >
                  <div className="h-9 w-9 rounded-xl bg-warning/15 text-warning grid place-items-center text-xs font-bold shrink-0">
                    {alert.progress}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{alert.studentName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {alert.courseTitle} - {alert.className}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {alert.lastActive}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
              Content
            </div>
            <h2 className="font-display text-xl font-bold">Draft materials</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Resources that are uploaded but not visible to students yet.
            </p>
          </div>
          <Link
            to="/teacher/courses"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Manage courses
          </Link>
        </div>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drafts. All materials are published.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {drafts.map((draft) => (
              <Link
                key={`${draft.courseId}-${draft.materialTitle}`}
                to="/teacher/courses/$courseId"
                params={{ courseId: draft.courseId }}
                className="rounded-2xl border border-border bg-warning/5 p-3 hover:border-primary/40 transition"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{draft.materialTitle}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {draft.courseTitle} - {draft.chapterTitle}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </TeacherShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="text-sm font-semibold mt-1">{label}</div>
      <p className="text-xs text-muted-foreground mt-1">{detail}</p>
    </article>
  );
}

function MiniMetric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-2 py-2">
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
