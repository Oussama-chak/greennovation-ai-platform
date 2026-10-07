import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Plus, Users } from "lucide-react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { useCatalog } from "@/context/CatalogContext";
import { summarizeClass } from "@/data/teacher";

export const Route = createFileRoute("/teacher/classes/")({
  component: ClassesList,
});

function ClassesList() {
  const { classes } = useCatalog();
  const summaries = classes.map(summarizeClass);

  return (
    <TeacherShell
      eyebrow="Classes"
      title="My classes"
      description="A class is a cohort of students taking one of your courses this term. Open a class to see its students."
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-3 py-2 text-sm font-bold shadow-glow"
        >
          <Plus className="h-4 w-4" />
          New class
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {summaries.map((summary) => (
          <Link
            key={summary.id}
            to="/teacher/classes/$classId"
            params={{ classId: summary.id }}
            className="rounded-3xl bg-card border border-border p-5 shadow-card transition hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
                  {summary.courseTitle}
                </div>
                <h2 className="font-display text-lg font-bold truncate">{summary.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.term} - {summary.schedule}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <Cell value={summary.studentCount} label="Students" icon />
              <Cell value={`${summary.averageProgress}%`} label="Avg progress" />
              <Cell
                value={summary.needsSupport}
                label="Needs help"
                tone={summary.needsSupport > 0 ? "warn" : "ok"}
              />
            </div>
          </Link>
        ))}
      </div>
    </TeacherShell>
  );
}

function Cell({
  value,
  label,
  icon,
  tone,
}: {
  value: string | number;
  label: string;
  icon?: boolean;
  tone?: "ok" | "warn";
}) {
  const toneClass =
    tone === "warn" ? "bg-warning/10 text-warning" : tone === "ok" ? "bg-muted/50" : "bg-muted/50";
  return (
    <div className={`rounded-xl px-2 py-3 ${toneClass}`}>
      <div className="flex items-center justify-center gap-1">
        {icon ? <Users className="h-3.5 w-3.5" /> : null}
        <span className="text-sm font-bold">{value}</span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
