import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Calendar,
  CheckCircle2,
  FolderKanban,
  ListChecks,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { useCatalog } from "@/context/CatalogContext";
import { useTeacherProjects } from "@/context/TeacherProjectsContext";
import { getClass, summarizeClass } from "@/data/teacher";
import { type Project } from "@/data/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/teacher/projects")({
  component: TeacherProjectsPage,
});

function defaultDueISO() {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return d.toISOString().slice(0, 10);
}

function TeacherProjectsPage() {
  const { classes } = useCatalog();
  const { assignments, createProject, deleteProject, addTask, removeTask } = useTeacherProjects();
  const [classFilter, setClassFilter] = useState<string>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTag, setFormTag] = useState("");
  const [formDue, setFormDue] = useState(defaultDueISO);
  const [formNext, setFormNext] = useState("");
  const [formClassId, setFormClassId] = useState(classes[0]?.id ?? "");

  const filtered = useMemo(() => {
    if (classFilter === "all") return assignments;
    return assignments.filter((p) => p.classId === classFilter);
  }, [assignments, classFilter]);

  const openNewDialog = () => {
    setFormName("");
    setFormTag("");
    setFormDue(defaultDueISO());
    setFormNext("");
    setFormClassId(classes[0]?.id ?? "");
    setNewOpen(true);
  };

  const submitNewProject = () => {
    const name = formName.trim();
    if (!name || !formClassId) return;
    createProject({
      name,
      tag: formTag,
      dueISO: formDue,
      nextStep: formNext,
      classId: formClassId,
    });
    setNewOpen(false);
  };

  return (
    <TeacherShell
      eyebrow="Assignments"
      title="Class projects"
      description="Create projects and tasks for your classes. Students see them on their Projects page and can check off milestones as they work."
      actions={
        <Button
          type="button"
          onClick={openNewDialog}
          className="rounded-xl gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          New project
        </Button>
      }
    >
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total projects" value={assignments.length} />
        <Stat label="Classes with work" value={new Set(assignments.map((p) => p.classId)).size} />
        <Stat
          label="Open tasks"
          value={assignments.reduce((n, p) => n + p.milestones.filter((m) => !m.done).length, 0)}
        />
        <Stat
          label="Tasks defined"
          value={assignments.reduce((n, p) => n + p.milestones.length, 0)}
        />
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Filter by class
        </span>
        <FilterPill active={classFilter === "all"} onClick={() => setClassFilter("all")}>
          All classes
        </FilterPill>
        {classes.map((cls) => (
          <FilterPill
            key={cls.id}
            active={classFilter === cls.id}
            onClick={() => setClassFilter(cls.id)}
          >
            {cls.name}
          </FilterPill>
        ))}
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
          <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-display text-xl font-bold">No projects yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Create a project, pick a class, then add the tasks students should complete step by
            step.
          </p>
          <Button type="button" onClick={openNewDialog} className="mt-5 rounded-xl">
            <Plus className="h-4 w-4" />
            Create first project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filtered.map((project) => (
            <TeacherProjectCard
              key={project.id}
              project={project}
              onDelete={() => deleteProject(project.id)}
              onAddTask={(name) => addTask(project.id, name)}
              onRemoveTask={(milestoneId) => removeTask(project.id, milestoneId)}
            />
          ))}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New class project</DialogTitle>
            <DialogDescription>
              Students enrolled in the selected class will see this project on their Projects page.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tp-class">Class</Label>
              <select
                id="tp-class"
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} · {summarizeClass(cls).courseTitle}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tp-name">Project name</Label>
              <Input
                id="tp-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. OOP Lab — Bank Account"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tp-tag">Tag</Label>
              <Input
                id="tp-tag"
                value={formTag}
                onChange={(e) => setFormTag(e.target.value)}
                placeholder="e.g. Python / Lab"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tp-due">Due date</Label>
              <Input
                id="tp-due"
                type="date"
                value={formDue}
                onChange={(e) => setFormDue(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tp-next">Suggested first step</Label>
              <Input
                id="tp-next"
                value={formNext}
                onChange={(e) => setFormNext(e.target.value)}
                placeholder="What should students do first?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitNewProject} disabled={!formName.trim()}>
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TeacherShell>
  );
}

function TeacherProjectCard({
  project,
  onDelete,
  onAddTask,
  onRemoveTask,
}: {
  project: Project;
  onDelete: () => void;
  onAddTask: (name: string) => void;
  onRemoveTask: (milestoneId: string) => void;
}) {
  const cls = project.classId ? getClass(project.classId) : undefined;
  const summary = cls ? summarizeClass(cls) : null;
  const [taskDraft, setTaskDraft] = useState("");

  const submitTask = () => {
    const name = taskDraft.trim();
    if (!name) return;
    onAddTask(name);
    setTaskDraft("");
  };

  return (
    <article className="rounded-3xl bg-card border border-border p-5 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold rounded-full bg-secondary text-secondary-foreground px-2.5 py-1">
              {project.tag}
            </span>
            {cls ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full bg-primary/10 text-primary px-2 py-0.5">
                <Users className="h-3 w-3" />
                {cls.name}
              </span>
            ) : null}
          </div>
          <h3 className="font-display text-lg font-bold leading-tight">{project.name}</h3>
          {summary ? (
            <p className="text-xs text-muted-foreground mt-1">{summary.courseTitle}</p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <Calendar className="h-3 w-3" />
            Due
          </div>
          <div className="font-semibold text-sm">{project.due}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-muted/50 border border-border p-3 mb-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
          Suggested first step
        </div>
        <p className="text-sm">{project.nextStep}</p>
      </div>

      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5" />
          Tasks ({project.milestones.length})
        </span>
      </div>

      <ul className="space-y-1.5 mb-3">
        {project.milestones.length === 0 ? (
          <li className="text-sm text-muted-foreground rounded-xl border border-dashed border-border px-3 py-4 text-center">
            No tasks yet — add the steps below.
          </li>
        ) : (
          project.milestones.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 min-w-0 truncate">{m.name}</span>
              <button
                type="button"
                onClick={() => onRemoveTask(m.id)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label={`Remove task ${m.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="flex gap-2">
        <Input
          value={taskDraft}
          onChange={(e) => setTaskDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitTask()}
          placeholder="Add a task…"
          className="rounded-xl"
        />
        <Button
          type="button"
          onClick={submitTask}
          disabled={!taskDraft.trim()}
          className="rounded-xl"
        >
          Add
        </Button>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        {cls ? (
          <Link
            to="/teacher/classes/$classId"
            params={{ classId: cls.id }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View class roster
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete project
        </button>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </div>
      <div className="font-display text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {children}
    </button>
  );
}
