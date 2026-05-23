import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  FolderKanban,
  Home as HomeIcon,
  Sparkles,
  Clock,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — EcoLearn AI" },
      {
        name: "description",
        content:
          "A vibrant monthly view of your study sessions, projects and deadlines — at a glance.",
      },
      { property: "og:title", content: "Calendar — EcoLearn AI" },
      {
        property: "og:description",
        content: "Your week, your month, your momentum — beautifully organized.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <CalendarPage />
    </AppLayout>
  ),
});

type EventKind = "homework" | "study" | "project" | "deadline";

type CalEvent = {
  id: string;
  // day offset from "today" (0 = today, 1 = tomorrow, -1 = yesterday)
  dayOffset: number;
  title: string;
  time?: string;
  kind: EventKind;
  duration?: string;
  /** Opens the course workspace when the event is clicked */
  opensWorkspace?: boolean;
};

const KIND_META: Record<
  EventKind,
  { label: string; icon: typeof HomeIcon; chip: string; dot: string; ring: string }
> = {
  homework: {
    label: "Home work",
    icon: HomeIcon,
    chip: "bg-info/15 text-info",
    dot: "bg-info",
    ring: "ring-info/40",
  },
  study: {
    label: "Study session",
    icon: BookOpen,
    chip: "bg-primary/15 text-primary",
    dot: "bg-primary",
    ring: "ring-primary/40",
  },
  project: {
    label: "Project",
    icon: FolderKanban,
    chip: "bg-accent text-accent-foreground",
    dot: "bg-warning",
    ring: "ring-warning/40",
  },
  deadline: {
    label: "Deadline",
    icon: AlertTriangle,
    chip: "bg-destructive/15 text-destructive",
    dot: "bg-destructive",
    ring: "ring-destructive/40",
  },
};

// Seed events relative to today so the calendar always feels alive.
const SEED_EVENTS: CalEvent[] = [
  { id: "e1", dayOffset: 0, title: "Linear Algebra · review", time: "09:00", duration: "25 min", kind: "study" },
  {
    id: "e2",
    dayOffset: 0,
    title: "Python · cours-python study session",
    time: "10:30",
    duration: "25 min",
    kind: "study",
    opensWorkspace: true,
  },
  { id: "e3", dayOffset: 0, title: "ML notes summary", time: "14:00", duration: "20 min", kind: "homework" },
  { id: "e4", dayOffset: 0, title: "Group project sync", time: "16:30", duration: "30 min", kind: "project" },
  { id: "e5", dayOffset: 1, title: "Calculus problem set", time: "11:00", duration: "45 min", kind: "homework" },
  { id: "e6", dayOffset: 2, title: "ML Capstone · Phase 2 due", time: "23:59", kind: "deadline" },
  { id: "e7", dayOffset: 3, title: "Read Ch.4 — Backprop", time: "08:30", duration: "30 min", kind: "study" },
  { id: "e8", dayOffset: 4, title: "Essay outline", time: "15:00", duration: "40 min", kind: "homework" },
  { id: "e9", dayOffset: 5, title: "Calculus pset due", time: "23:59", kind: "deadline" },
  { id: "e10", dayOffset: 6, title: "History essay draft", time: "10:00", duration: "1 h", kind: "project" },
  { id: "e11", dayOffset: 7, title: "Bayesian inference review", time: "09:30", duration: "25 min", kind: "study" },
  { id: "e12", dayOffset: 9, title: "Ethics essay draft due", time: "23:59", kind: "deadline" },
  { id: "e13", dayOffset: 10, title: "Group sync · ML project", time: "17:00", duration: "30 min", kind: "project" },
  { id: "e14", dayOffset: -1, title: "Quiz · Diagonalization", time: "14:00", kind: "study" },
  { id: "e15", dayOffset: -2, title: "ML reading", time: "20:00", kind: "homework" },
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function CalendarPage() {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [cursor, setCursor] = useState<Date>(startOfMonth(today));
  const [selected, setSelected] = useState<Date>(today);

  // Build events with absolute dates anchored to today.
  const events = useMemo<(CalEvent & { date: Date })[]>(
    () => SEED_EVENTS.map((e) => ({ ...e, date: addDays(today, e.dayOffset) })),
    [today],
  );

  // Build the 6-week grid for the visible month.
  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    // Start week on Monday: getDay() Sun=0..Sat=6 → shift so Mon=0..Sun=6
    const startWeekday = (first.getDay() + 6) % 7;
    const totalDays = last.getDate();
    const cellCount = Math.ceil((startWeekday + totalDays) / 7) * 7;
    return Array.from({ length: cellCount }, (_, i) => {
      const day = i - startWeekday + 1;
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      return {
        date,
        inMonth: day >= 1 && day <= totalDays,
      };
    });
  }, [cursor]);

  const eventsForDate = (d: Date) => events.filter((e) => isSameDay(e.date, d));
  const selectedEvents = eventsForDate(selected);

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Stats
  const monthEvents = events.filter(
    (e) => e.date.getMonth() === cursor.getMonth() && e.date.getFullYear() === cursor.getFullYear(),
  );
  const stats = [
    {
      label: "Study sessions",
      value: monthEvents.filter((e) => e.kind === "study").length,
      meta: KIND_META.study,
    },
    {
      label: "Homework",
      value: monthEvents.filter((e) => e.kind === "homework").length,
      meta: KIND_META.homework,
    },
    {
      label: "Projects",
      value: monthEvents.filter((e) => e.kind === "project").length,
      meta: KIND_META.project,
    },
    {
      label: "Deadlines",
      value: monthEvents.filter((e) => e.kind === "deadline").length,
      meta: KIND_META.deadline,
    },
  ];

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => {
    setCursor(startOfMonth(today));
    setSelected(today);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title="Your month, beautifully planned ✨"
        description="Home work, study sessions, projects and deadlines — all in one calm view."
        actions={
          <button
            onClick={goToday}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-glow hover:opacity-95 transition"
          >
            <Sparkles className="h-4 w-4" />
            Jump to today
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-card border border-border p-4 shadow-card relative overflow-hidden"
          >
            <div className={`h-10 w-10 rounded-xl grid place-items-center ${s.meta.chip}`}>
              <s.meta.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calendar */}
        <section className="lg:col-span-8 rounded-3xl bg-card border border-border shadow-card overflow-hidden">
          {/* Header */}
          <div className="relative gradient-primary text-primary-foreground p-5">
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary-foreground/20 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/40 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] font-bold opacity-80">
                  Month view
                </div>
                <h2 className="font-display text-2xl lg:text-3xl font-bold capitalize mt-0.5">
                  {monthLabel}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={goPrev}
                  className="h-9 w-9 grid place-items-center rounded-xl bg-primary-foreground/15 hover:bg-primary-foreground/25 transition"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={goNext}
                  className="h-9 w-9 grid place-items-center rounded-xl bg-primary-foreground/15 hover:bg-primary-foreground/25 transition"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday strip */}
          <div className="grid grid-cols-7 px-3 pt-3 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            {weekdayLabels.map((w) => (
              <div key={w} className="text-center py-1.5">
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1.5 p-3">
            {cells.map(({ date, inMonth }, i) => {
              const dayEvents = eventsForDate(date);
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selected);
              const visible = dayEvents.slice(0, 2);
              const overflow = dayEvents.length - visible.length;

              return (
                <button
                  key={i}
                  onClick={() => setSelected(date)}
                  className={`group relative aspect-square sm:aspect-auto sm:min-h-[88px] flex flex-col items-stretch p-1.5 rounded-xl text-left transition-all border ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-transparent hover:border-border hover:bg-muted/50"
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 grid place-items-center rounded-full ${
                        isToday
                          ? "gradient-primary text-primary-foreground shadow-glow"
                          : "text-foreground"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="flex gap-0.5">
                        {Array.from(new Set(dayEvents.map((e) => e.kind)))
                          .slice(0, 3)
                          .map((k) => (
                            <span
                              key={k}
                              className={`h-1.5 w-1.5 rounded-full ${KIND_META[k].dot}`}
                            />
                          ))}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 hidden sm:flex flex-col gap-1 overflow-hidden">
                    {visible.map((e) =>
                      e.opensWorkspace ? (
                        <Link
                          key={e.id}
                          to="/learning"
                          onClick={(ev) => ev.stopPropagation()}
                          className={`truncate text-[10px] font-semibold rounded-md px-1.5 py-0.5 ${KIND_META[e.kind].chip} hover:opacity-90`}
                        >
                          {e.title}
                        </Link>
                      ) : (
                        <div
                          key={e.id}
                          className={`truncate text-[10px] font-semibold rounded-md px-1.5 py-0.5 ${KIND_META[e.kind].chip}`}
                        >
                          {e.title}
                        </div>
                      ),
                    )}
                    {overflow > 0 && (
                      <div className="text-[10px] text-muted-foreground font-semibold pl-1">
                        +{overflow} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-t border-border bg-muted/30 text-xs">
            {(Object.keys(KIND_META) as EventKind[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5 font-medium">
                <span className={`h-2 w-2 rounded-full ${KIND_META[k].dot}`} />
                {KIND_META[k].label}
              </span>
            ))}
          </div>
        </section>

        {/* Day detail */}
        <aside className="lg:col-span-4 rounded-3xl bg-card border border-border shadow-card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border">
            <div className="text-[10px] uppercase tracking-widest font-bold text-primary">
              {isSameDay(selected, today) ? "Today" : "Selected day"}
            </div>
            <h3 className="font-display text-xl font-bold mt-1">
              {selected.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedEvents.length === 0
                ? "Nothing planned. A perfect day to read ahead. 🌿"
                : `${selectedEvents.length} ${selectedEvents.length === 1 ? "event" : "events"} scheduled`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {selectedEvents.length === 0 ? (
              <div className="m-4 rounded-2xl border border-dashed border-border p-6 text-center">
                <div className="text-4xl">🌱</div>
                <div className="mt-2 text-sm font-semibold">A clear horizon</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Take a breath. Or get ahead by previewing tomorrow.
                </p>
              </div>
            ) : (
              selectedEvents
                .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
                .map((e) => {
                  const meta = KIND_META[e.kind];
                  const Icon = meta.icon;
                  const body = (
                    <>
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${meta.chip}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5 ${meta.chip}`}
                            >
                              {meta.label}
                            </span>
                            {e.time && (
                              <span className="text-[11px] font-mono text-muted-foreground inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {e.time}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm font-semibold leading-snug">
                            {e.title}
                          </div>
                          {e.duration && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {e.duration}
                            </div>
                          )}
                          {e.opensWorkspace && (
                            <div className="mt-2 text-xs font-semibold text-primary inline-flex items-center gap-1">
                              Open workspace to study
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                  return e.opensWorkspace ? (
                    <Link
                      key={e.id}
                      to="/learning"
                      className={`group block rounded-2xl border border-border p-3 hover:shadow-soft transition ring-0 hover:ring-2 ${meta.ring}`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div
                      key={e.id}
                      className={`group rounded-2xl border border-border p-3 hover:shadow-soft transition ring-0 hover:ring-2 ${meta.ring}`}
                    >
                      {body}
                    </div>
                  );
                })
            )}
          </div>

          <div className="p-4 border-t border-border bg-muted/30">
            <Link
              to="/projects"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Manage projects & deadlines
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
