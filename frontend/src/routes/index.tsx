import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { AvatarTip } from "@/components/AvatarTip";
import { Link } from "@tanstack/react-router";
import { useProjects } from "@/context/ProjectsContext";
import { useEffect, useState } from "react";
import { fetchReadiness } from "@/lib/api";
import { getStoredChatSessionId } from "@/lib/chatSession";
import {
  deadlineUrgency,
  daysUntilDue,
  dueRelativePhrase,
  projectProgressPercent,
} from "@/data/projects";
import { continueStudyTarget } from "@/data/studentLearning";
import {
  Flame,
  Clock,
  TrendingUp,
  ArrowRight,
  Trees,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Calendar,
  Brain,
  Zap,
} from "lucide-react";
import magicBookPandaVideo from "@/assets/magic-book-panda1.webm";
import magicBookPandaPoster from "@/assets/magic-book-panda.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Routiny" },
      {
        name: "description",
        content:
          "Your command center: readiness, study plan, deadlines and Eco Forest at a glance.",
      },
      { property: "og:title", content: "Dashboard — Routiny" },
      {
        property: "og:description",
        content: "What should I do now? Your AI-powered student dashboard answers it.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

function Dashboard() {
  const [readiness, setReadiness] = useState<{
    pct: number | null;
    intensity: string;
    signal: Record<string, unknown> | null;
    loading: boolean;
    error: string | null;
  }>({
    pct: null,
    intensity: "",
    signal: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sid = getStoredChatSessionId();
        const r = await fetchReadiness(sid);
        if (cancelled) return;
        setReadiness({
          pct: r.readiness_percent,
          intensity: r.recommended_intensity,
          signal: r.readiness_signal,
          loading: false,
          error: null,
        });
      } catch (e) {
        if (!cancelled) {
          setReadiness((x) => ({
            ...x,
            loading: false,
            error: e instanceof Error ? e.message : String(e),
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const readinessLine =
    readiness.loading || readiness.pct == null
      ? "Checking readiness…"
      : `You're ${readiness.pct}% ready for today. Here's your next best move.`;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 animate-[fade-in-up_0.5s_ease-out]">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
            Tuesday · Week 7
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">
            Good morning, <span className="text-gradient-primary">Sara</span> 
          </h1>
          <p className="text-muted-foreground mt-2">{readinessLine}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/calendar"
            className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition shadow-card"
          >
            <Calendar className="h-4 w-4" />
            View calendar
          </Link>
          <StartSessionLink className="cta-attention rounded-xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95" />
        </div>
      </div>

      {/* Top grid: Readiness + Next Action + Forest */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ReadinessCard
          loading={readiness.loading}
          error={readiness.error}
          pct={readiness.pct}
          intensity={readiness.intensity}
          signal={readiness.signal}
        />
        <NextActionCard />
        <EcoForestCard />
      </div>

      {/* Middle grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <StudyPlanCard />
        <DeadlinesCard />
        <WeakTopicsCard />
      </div>

      {/* Bottom row: avatar tip + projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <AvatarTip
            mood="reading"
            message="You learn calculus best in 25-min sprints. Try one before lunch — I'll keep your forest watered. 🌳"
          />
        </div>
        <ActiveProjectsCard className="lg:col-span-2" />
      </div>
    </div>
  );
}

/* ---------------- Cards ---------------- */

function Card({
  children,
  className = "",
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "primary" | "warm" | "sky";
}) {
  const variants: Record<string, string> = {
    default: "bg-card border border-border",
    primary: "gradient-primary text-primary-foreground",
    warm: "gradient-warm",
    sky: "gradient-sky",
  };
  return (
    <div
      className={`rounded-3xl p-5 lg:p-6 shadow-card transition-all hover:shadow-soft ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

function intensityPillLabel(intensity: string): string {
  switch (intensity) {
    case "recovery_light":
      return "Recovery focus";
    case "light":
      return "Light session";
    case "full":
      return "Peak ready";
    default:
      return "Balanced";
  }
}

function readinessAxisBars(signal: Record<string, unknown> | null): {
  workloadEase: number;
  stability: number;
  recovery: number;
} {
  if (!signal) {
    return { workloadEase: 0, stability: 0, recovery: 0 };
  }
  const w = Number(signal.workload_pressure_score ?? 0);
  const s = Number(signal.study_stability_score ?? 0);
  const f = Number(signal.behavioral_fatigue_score ?? 0);
  return {
    workloadEase: Math.round(Math.min(100, Math.max(0, (1 - w) * 100))),
    stability: Math.round(Math.min(100, Math.max(0, s * 100))),
    recovery: Math.round(Math.min(100, Math.max(0, (1 - f) * 100))),
  };
}

function ReadinessCard({
  loading,
  error,
  pct,
  intensity,
  signal,
}: {
  loading: boolean;
  error: string | null;
  pct: number | null;
  intensity: string;
  signal: Record<string, unknown> | null;
}) {
  const score = pct ?? 0;
  const bars = readinessAxisBars(signal);

  return (
    <Card className="lg:col-span-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary-glow/40 blur-3xl" />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Brain className="h-4 w-4 text-primary" />
            Readiness today
          </div>
          <span className="text-xs rounded-full bg-success/10 text-success px-2.5 py-1 font-semibold">
            {loading ? "…" : intensityPillLabel(intensity)}
          </span>
        </div>

        {error && (
          <p className="text-xs text-destructive mb-3">
            Readiness unavailable ({error}). Start the API to sync with the readiness agent.
          </p>
        )}

        <div className="flex items-center gap-5">
          <div
            className="relative h-32 w-32 rounded-full grid place-items-center"
            style={{
              background: `conic-gradient(var(--primary) ${loading ? 0 : score * 3.6}deg, color-mix(in oklab, var(--muted) 90%, transparent) 0deg)`,
            }}
          >
            <div className="h-[104px] w-[104px] rounded-full bg-card grid place-items-center">
              <div className="text-center">
                <div className="font-display text-3xl font-bold">
                  {loading ? "…" : error ? "—" : score}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  / 100
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            <Stat
              label="Workload ease"
              value={loading || error ? 0 : bars.workloadEase}
              color="primary"
            />
            <Stat
              label="Study stability"
              value={loading || error ? 0 : bars.stability}
              color="info"
            />
            <Stat label="Recovery" value={loading || error ? 0 : bars.recovery} color="warning" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "primary" | "info" | "warning";
}) {
  const bg = {
    primary: "bg-primary",
    info: "bg-info",
    warning: "bg-warning",
  }[color];
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${bg}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function NextActionCard() {
  return (
    <Card variant="primary" className="lg:col-span-5 relative overflow-hidden">
      <div className="absolute -bottom-12 -right-8 h-48 w-48 rounded-full bg-primary-foreground/10 blur-3xl" />
      <div className="absolute top-4 right-4">
        <span className="text-[10px] uppercase tracking-widest font-bold bg-primary-foreground/15 px-2.5 py-1 rounded-full">
          Next best action
        </span>
      </div>
      <div className="relative">
        <div className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-2">.</div>
        <h2 className="font-display text-2xl lg:text-3xl font-bold leading-tight">
          Review{" "}
          <span className="underline decoration-primary-foreground/40 decoration-2 underline-offset-4">
            chap1-Python_OOP
          </span>{" "}
        </h2>
        <p className="opacity-85 text-sm mt-3 max-w-md">
          A quick pass through your Python readings before you practice keeps the next session
          sharp.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <StartSessionLink
            className="cta-attention inline-flex items-center gap-2 rounded-xl bg-primary-foreground text-primary px-4 py-2.5 text-sm font-bold hover:scale-[1.02]"
            showArrow
          />
          <button className="rounded-xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-medium hover:bg-primary-foreground/25 transition">
            Explain why
          </button>
          {/* <div className="ml-auto flex items-center gap-1.5 text-xs opacity-80">
            <Zap className="h-3.5 w-3.5" />
            ~ 0.04 kWh
          </div> */}
        </div>
      </div>
    </Card>
  );
}

function EcoForestCard() {
  return (
    <Card className="lg:col-span-3 relative overflow-hidden gradient-forest">
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-primary/20 to-transparent" />
      </div>
      <div className="relative flex h-full min-h-[20rem] flex-col">
        <div className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trees className="h-4 w-4 text-primary" />
            Knowledge Library
          </div>
          <span className="text-xs rounded-full bg-card/70 px-2 py-1 font-semibold">
            🔥 4-day streak
          </span>
        </div>
        <div className="magic-book-hero">
          <div className="magic-book-stage">
            <span className="magic-book-glow" aria-hidden />
            <video
              className="magic-book-art"
              src={magicBookPandaVideo}
              poster={magicBookPandaPoster}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              aria-label="Panda emerging from a glowing storybook"
            />
          </div>
        </div>
        <div className="shrink-0 text-center">
          <div className="font-display text-xl font-bold">A world of ideas</div>
          <div className="text-xs text-muted-foreground">Your floating learning sanctuary</div>
          <Link
            to="/forest"
            search={{ reward: undefined }}
            className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Explore your library <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function StudyPlanCard() {
  const blocks = [
    { time: "09:00", title: "Linear Algebra review", dur: "25 min", type: "review", done: true },
    { time: "10:30", title: "Quiz: Eigenvectors", dur: "10 min", type: "quiz", done: false },
    { time: "14:00", title: "ML notes summary", dur: "20 min", type: "summary", done: false },
    { time: "16:30", title: "Group project sync", dur: "30 min", type: "project", done: false },
  ];
  const typeStyle: Record<string, string> = {
    review: "bg-primary/10 text-primary",
    quiz: "bg-warning/15 text-warning-foreground",
    summary: "bg-info/15 text-info",
    project: "bg-accent text-accent-foreground",
  };
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Today's plan</h3>
        </div>
        <button className="text-xs font-semibold text-primary hover:underline">Edit</button>
      </div>
      <ul className="space-y-2.5">
        {blocks.map((b) => (
          <li
            key={b.title}
            className={`flex items-center gap-3 rounded-2xl p-3 border border-transparent hover:border-border transition ${
              b.done ? "opacity-60" : ""
            }`}
          >
            <div className="text-xs font-mono text-muted-foreground w-12">{b.time}</div>
            <div
              className={`h-9 w-9 rounded-xl grid place-items-center text-xs font-bold ${typeStyle[b.type]}`}
            >
              {b.type[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate ${b.done ? "line-through" : ""}`}>
                {b.title}
              </div>
              <div className="text-xs text-muted-foreground">{b.dur}</div>
            </div>
            {b.done && <CheckCircle2 className="h-4 w-4 text-success" />}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DeadlinesCard() {
  const { projects } = useProjects();
  const items = [...projects]
    .sort((a, b) => a.dueISO.localeCompare(b.dueISO))
    .slice(0, 3)
    .map((p) => ({
      title: p.name,
      sub: dueRelativePhrase(p.dueISO),
      urgency: deadlineUrgency(daysUntilDue(p.dueISO)),
      key: p.id,
    }));
  const urgencyColor: Record<string, string> = {
    high: "bg-destructive/10 text-destructive",
    med: "bg-warning/15 text-warning-foreground",
    low: "bg-info/10 text-info",
  };
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Upcoming deadlines</h3>
        </div>
        <Link to="/projects" className="text-xs font-semibold text-primary hover:underline">
          All
        </Link>
      </div>
      <ul className="space-y-3">
        {items.map((d) => (
          <li
            key={d.key}
            className="flex items-center gap-3 rounded-2xl p-3 hover:bg-muted/60 transition"
          >
            <AlertTriangle
              className={`h-4 w-4 ${
                d.urgency === "high"
                  ? "text-destructive"
                  : d.urgency === "med"
                    ? "text-warning"
                    : "text-info"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{d.title}</div>
              <div className="text-xs text-muted-foreground">{d.sub}</div>
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-1 font-bold ${urgencyColor[d.urgency]}`}
            >
              {d.urgency}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function WeakTopicsCard() {
  /** Labels mirror materials under the workspace data folder (PDFs / PPTX). */
  const topics = [
    { name: "Python fondamentaux (0865)", level: 44 },
    { name: "POO — chap1-Python_OOP", level: 52 },
    { name: "Fichiers & exceptions (slides ch.5)", level: 58 },
  ];
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Topics to strengthen</h3>
        </div>
        <span className="text-xs text-muted-foreground">Mastery</span>
      </div>
      <ul className="space-y-4">
        {topics.map((t) => (
          <li key={t.name}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-medium">{t.name}</span>
              <span className="text-muted-foreground text-xs">{t.level}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full gradient-primary"
                style={{ width: `${t.level}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <StartSessionLink
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        label="Continue learning"
        showArrow
      />
    </Card>
  );
}

function ActiveProjectsCard({ className = "" }: { className?: string }) {
  const { projects } = useProjects();
  const top = [...projects].sort((a, b) => a.dueISO.localeCompare(b.dueISO)).slice(0, 2);
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Active projects</h3>
        </div>
        <Link to="/projects" className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {top.map((p) => {
          const progress = projectProgressPercent(p);
          return (
            <Link
              key={p.id}
              to="/projects"
              className="rounded-2xl border border-border p-4 hover:border-primary/40 hover:shadow-soft transition block text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 line-clamp-1">
                  {p.tag}
                </span>
                <Flame className="h-3.5 w-3.5 text-accent-foreground shrink-0" />
              </div>
              <div className="font-semibold text-sm leading-snug">{p.name}</div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full gradient-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs gap-2">
                <span className="text-muted-foreground line-clamp-1">Next: {p.nextStep}</span>
                <span className="font-semibold text-foreground shrink-0">
                  {dueRelativePhrase(p.dueISO)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function StartSessionLink({
  className,
  label = "Start session",
  showArrow = false,
}: {
  className?: string;
  label?: string;
  showArrow?: boolean;
}) {
  const target = continueStudyTarget();
  if (target) {
    return (
      <Link
        to="/learning/$courseId/study"
        params={{ courseId: target.courseId }}
        search={{ chapter: target.chapterId }}
        className={className}
      >
        {label}
        {showArrow ? <ArrowRight className="h-4 w-4" /> : null}
      </Link>
    );
  }
  return (
    <Link to="/learning" className={className}>
      {label}
      {showArrow ? <ArrowRight className="h-3.5 w-3.5" /> : null}
    </Link>
  );
}
