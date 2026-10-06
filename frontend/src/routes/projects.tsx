import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { AvatarTip } from "@/components/AvatarTip";
import { useState } from "react";
import { Plus, Flame, MessageSquare, Sparkles, CheckCircle2, Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { awardTree } from "@/lib/treeInventory";
import { useProjects } from "@/context/ProjectsContext";
import {
  createEmptyProject,
  isTeacherAssigned,
  projectProgressPercent,
  type Milestone,
  type Project,
} from "@/data/projects";
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

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Routiny" },
      {
        name: "description",
        content: "Track milestones, deadlines and AI-suggested next steps for every project.",
      },
      { property: "og:title", content: "Projects — Routiny" },
      {
        property: "og:description",
        content: "A smart project manager built for students.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <ProjectsPage />
    </AppLayout>
  ),
});

function defaultDueISO() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ProjectCard({
  project: p,
  onRequestToggle,
  onAddTask,
}: {
  project: Project;
  onRequestToggle: (project: Project, m: Milestone) => void;
  onAddTask: (projectId: string, taskName: string) => void;
}) {
  const progress = projectProgressPercent(p);
  const [taskDraft, setTaskDraft] = useState("");
  const fromTeacher = isTeacherAssigned(p);

  const submitTask = () => {
    const name = taskDraft.trim();
    if (!name || fromTeacher) return;
    onAddTask(p.id, name);
    setTaskDraft("");
  };

  return (
    <article className="rounded-3xl bg-card border border-border p-6 shadow-card hover:shadow-soft transition">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-bold rounded-full bg-secondary text-secondary-foreground px-2.5 py-1">
              {p.tag}
            </span>
            {fromTeacher ? (
              <span className="text-[10px] uppercase tracking-widest font-bold rounded-full bg-primary/10 text-primary px-2.5 py-1">
                Class assignment
              </span>
            ) : null}
          </div>
          <h3 className="font-display text-lg font-bold mt-2 leading-tight">{p.name}</h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Due</div>
          <div className="font-semibold">{p.due}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-semibold">{progress}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-5">
        <div
          className="h-full gradient-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="rounded-2xl gradient-warm p-4 mb-4">

        <p className="text-sm font-medium">{p.nextStep}</p>
      </div>

      <ul className="space-y-1.5 mb-3">
        {p.milestones.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onRequestToggle(p, m)}
              className="w-full flex items-center gap-2.5 text-sm text-left rounded-lg px-2 py-1.5 transition hover:bg-muted/60"
              aria-pressed={m.done}
            >
              <span
                className={`h-5 w-5 rounded-md grid place-items-center text-[11px] shrink-0 transition ${
                  m.done
                    ? "bg-primary text-primary-foreground"
                    : "border-2 border-border bg-card hover:border-primary/60"
                }`}
              >
                {m.done && <CheckCircle2 className="h-3.5 w-3.5" />}
              </span>
              <span className={m.done ? "text-muted-foreground line-through" : "text-foreground"}>
                {m.name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {fromTeacher ? (
        <p className="text-xs text-muted-foreground rounded-2xl border border-dashed border-border bg-muted/30 px-3 py-2.5 mb-4">
          Tasks are set by your professor — check them off as you complete each step.
        </p>
      ) : (
        <div className="rounded-2xl border border-border bg-muted/40 p-2.5 mb-4">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
            <MessageSquare className="h-3 w-3" />
            Task chat — add a task
          </div>
          <form
            className="flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition"
            onSubmit={(e) => {
              e.preventDefault();
              submitTask();
            }}
          >
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
            <Input
              value={taskDraft}
              onChange={(e) => setTaskDraft(e.target.value)}
              placeholder="Type a task for this project…"
              className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 text-sm"
              autoComplete="off"
              aria-label="New task for this project"
            />
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg"
              disabled={!taskDraft.trim()}
              aria-label="Add task"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" /> {p.notes} notes
        </span>
        <span className="inline-flex items-center gap-1 text-accent-foreground">
          <Flame className="h-3.5 w-3.5" /> on track
        </span>
      </div>
    </article>
  );
}

function ProjectsPage() {
  const { projects, setProjects } = useProjects();
  const [newOpen, setNewOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTag, setFormTag] = useState("");
  const [formDue, setFormDue] = useState(defaultDueISO);
  const [formNext, setFormNext] = useState("");
  const [pending, setPending] = useState<{
    projectId: string;
    milestoneId: string;
    name: string;
    completing: boolean; // true = ticking, false = un-ticking
  } | null>(null);

  const requestToggle = (project: Project, m: Milestone) => {
    setPending({
      projectId: project.id,
      milestoneId: m.id,
      name: m.name,
      completing: !m.done,
    });
  };

  const confirmToggle = () => {
    if (!pending) return;
    setProjects((ps) =>
      ps.map((p) => {
        if (p.id !== pending.projectId) return p;
        const updatedMilestones = p.milestones.map((m) =>
          m.id === pending.milestoneId ? { ...m, done: pending.completing } : m,
        );
        const wasComplete = p.milestones.every((m) => m.done);
        const isComplete = updatedMilestones.every((m) => m.done);
        if (!wasComplete && isComplete) {
          // Award a tree exactly once per project completion.
          awardTree(
            "project",
            `Project complete: "${p.name}" — you earned a bamboo tree! 🎋`,
            `project-${p.id}`,
          );
        }
        return { ...p, milestones: updatedMilestones };
      }),
    );
    setPending(null);
  };

  const openNewDialog = () => {
    setFormName("");
    setFormTag("");
    setFormDue(defaultDueISO());
    setFormNext("");
    setNewOpen(true);
  };

  const submitNewProject = () => {
    const name = formName.trim();
    if (!name) return;
    const created = createEmptyProject({
      name,
      tag: formTag,
      dueISO: formDue,
      nextStep: formNext,
    });
    setProjects((prev) => [...prev, created]);
    setNewOpen(false);
  };

  const addTaskToProject = (projectId: string, taskName: string) => {
    const trimmed = taskName.trim();
    if (!trimmed) return;
    setProjects((ps) =>
      ps.map((p) => {
        if (p.id !== projectId) return p;
        const milestone: Milestone = {
          id: `m-${crypto.randomUUID().slice(0, 8)}`,
          name: trimmed,
          done: false,
        };
        return { ...p, milestones: [...p.milestones, milestone] };
      }),
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Projects"
        title="Your active work"
        description="Milestones, deadlines and AI-suggested next steps — all in one place."
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
      />

      <AvatarTip
        mood="reading"
        message="Your Lab Report is almost done — tick off the last task to free your weekend."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            onRequestToggle={requestToggle}
            onAddTask={addTaskToProject}
          />
        ))}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Add a project to your list. You can edit milestones on the card after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="proj-name">Name</Label>
              <Input
                id="proj-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. CS 101 final project"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proj-tag">Tag</Label>
              <Input
                id="proj-tag"
                value={formTag}
                onChange={(e) => setFormTag(e.target.value)}
                placeholder="e.g. CS / AI"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proj-due">Due date</Label>
              <Input
                id="proj-due"
                type="date"
                value={formDue}
                onChange={(e) => setFormDue(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proj-next">Next step (optional)</Label>
              <Input
                id="proj-next"
                value={formNext}
                onChange={(e) => setFormNext(e.target.value)}
                placeholder="What should you do first?"
                autoComplete="off"
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

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.completing ? "Mark task as completed?" : "Mark task as not completed?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.completing ? (
                <>
                  You're about to tick <strong className="text-foreground">{pending?.name}</strong>{" "}
                  as done. Bamboo will celebrate with you 🐼🎉
                </>
              ) : (
                <>
                  You're about to un-tick{" "}
                  <strong className="text-foreground">{pending?.name}</strong>. Are you sure it's
                  not finished?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              {pending?.completing ? "Yes, mark done" : "Yes, un-tick"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
