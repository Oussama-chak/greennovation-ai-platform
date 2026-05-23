import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, ChevronRight, FileText, Layers, Plus } from "lucide-react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { classesForCourse, courses } from "@/data/teacher";

export const Route = createFileRoute("/teacher/courses/")({
  component: CoursesList,
});

function CoursesList() {
  return (
    <TeacherShell
      eyebrow="Courses"
      title="My courses"
      description="A course is the curriculum: chapters and learning materials. The same course can be assigned to several classes."
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-3 py-2 text-sm font-bold shadow-glow"
        >
          <Plus className="h-4 w-4" />
          New course
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.map((course) => {
          const courseClasses = classesForCourse(course.id);
          const totalMaterials = course.chapters.reduce(
            (sum, chapter) => sum + chapter.materials.length,
            0,
          );
          return (
            <Link
              key={course.id}
              to="/teacher/courses/$courseId"
              params={{ courseId: course.id }}
              className="rounded-3xl bg-card border border-border p-5 shadow-card transition hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <StatusBadge status={course.status} />
              </div>
              <h2 className="font-display text-lg font-bold mt-4">{course.title}</h2>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {course.description}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Cell icon={Layers} value={course.chapters.length} label="Chapters" />
                <Cell icon={FileText} value={totalMaterials} label="Materials" />
                <Cell value={courseClasses.length} label="Classes" />
              </div>
              <div className="flex items-center justify-end mt-4 text-xs font-semibold text-primary">
                Open builder <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </TeacherShell>
  );
}

function Cell({
  value,
  label,
  icon: Icon,
}: {
  value: string | number;
  label: string;
  icon?: typeof BookOpen;
}) {
  return (
    <div className="rounded-xl bg-muted/50 px-2 py-2">
      <div className="flex items-center justify-center gap-1">
        {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
        <span className="text-sm font-bold">{value}</span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "Published" | "Draft" | "Updating" }) {
  const tone =
    status === "Published"
      ? "bg-primary/15 text-primary"
      : status === "Draft"
        ? "bg-muted text-foreground"
        : "bg-warning/15 text-warning";
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${tone}`}>{status}</span>
  );
}
