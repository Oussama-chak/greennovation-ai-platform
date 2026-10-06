import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { AvatarTip } from "@/components/AvatarTip";
import { useReadinessToday, useReadinessHistory, useSubmitCheckin } from "@/hooks/useReadiness";
import {
  Smile,
  Meh,
  Frown,
  Heart,
  Moon,
  Coffee,
  Wind,
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Flame,
} from "lucide-react";

export const Route = createFileRoute("/wellbeing")({
  head: () => ({
    meta: [
      { title: "Well-being — Routiny" },
      {
        name: "description",
        content:
          "Smart emotional and productivity dashboard. Check in, see insights, and balance your study habits.",
      },
      { property: "og:title", content: "Well-being — Routiny" },
      {
        property: "og:description",
        content: "Your personal mental coach. Mood, focus, sleep, and AI-powered insights.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <WellbeingPage />
    </AppLayout>
  ),
});

// ─── Mock data (realistic patterns) ────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// mood 1=sad, 2=neutral, 3=happy
const moodWeek = [2, 3, 2, 2, 3, 3, 3];
const sleepWeek = [6.5, 7, 5.5, 6, 7.5, 8, 7]; // hours
const focusWeek = [3, 4, 2, 3, 4, 5, 4]; // 1-5
// Realistic study pattern (Mon→Sun) — never empty, with one lighter day
const studyWeek = [3.5, 4.2, 5, 4.5, 3, 2, 0.8]; // hours

// Emotional timeline (today)
const TIMELINE = [
  { time: "08:00", emoji: "😴", note: "Slow start, coffee needed" },
  { time: "10:30", emoji: "😐", note: "Warming up" },
  { time: "12:00", emoji: "😊", note: "Deep focus session" },
  { time: "14:30", emoji: "🙂", note: "Productive lunch break" },
  { time: "16:00", emoji: "😫", note: "Energy dip" },
  { time: "18:00", emoji: "😊", note: "Bounced back" },
];

type Choice<T extends string> = { value: T; label: string; emoji: string };

const SLEEP_OPTS: Choice<"bad" | "okay" | "great">[] = [
  { value: "bad", label: "Bad", emoji: "😴" },
  { value: "okay", label: "Okay", emoji: "🙂" },
  { value: "great", label: "Great", emoji: "✨" },
];
const FOCUS_OPTS: Choice<"low" | "medium" | "high">[] = [
  { value: "low", label: "Low", emoji: "🌫️" },
  { value: "medium", label: "Medium", emoji: "🧠" },
  { value: "high", label: "High", emoji: "⚡" },
];
const MOOD_OPTS: Choice<"sad" | "neutral" | "happy">[] = [
  { value: "sad", label: "Sad", emoji: "😔" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "happy", label: "Happy", emoji: "😊" },
];

function WellbeingPage() {
  const [sleep, setSleep] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [journal, setJournal] = useState("");

  // ─── Fetch data from backend ───
  const { data: todayCheckin, isLoading: loadingToday } = useReadinessToday();
  const { data: historyData, isLoading: loadingHistory } = useReadinessHistory(7);
  const { mutate: submitCheckin, isPending: submitting } = useSubmitCheckin();

  // ─── Pre-fill if already checked in today ───
  useEffect(() => {
    if (todayCheckin) {
      setSleep(todayCheckin.sleep);
      setFocus(todayCheckin.focus);
      setMood(todayCheckin.mood);
      setJournal(todayCheckin.journal || "");
    }
  }, [todayCheckin]);

  const checkedIn = sleep && focus && mood;

  // ─── Handle submit ───
  const handleSubmit = useCallback(() => {
    if (checkedIn) {
      submitCheckin({
        sleep,
        focus,
        mood,
        journal: journal || undefined,
      });
    }
  }, [checkedIn, sleep, focus, mood, journal, submitCheckin]);

  // ─── Smart insights (AI feel) ───
  const insights = useMemo(() => {
    if (!checkedIn) return [];
    const out: { tone: "good" | "warn" | "info"; text: string; icon: typeof Sparkles }[] = [];
    if (focus === "high" && sleep === "bad") {
      out.push({
        tone: "warn",
        icon: AlertCircle,
        text: "Your focus is high but sleep is low → avoid heavy tasks tonight.",
      });
    }
    if (mood === "happy") {
      out.push({
        tone: "good",
        icon: TrendingUp,
        text: "Mood improved compared to yesterday 📈 Ride the wave.",
      });
    }
    if (mood === "sad") {
      out.push({
        tone: "info",
        icon: Heart,
        text: "Heavy day. Try a short walk or call a friend before studying.",
      });
    }
    if (sleep === "great" && focus !== "low") {
      out.push({
        tone: "good",
        icon: CheckCircle2,
        text: "Sleep recovery is paying off — perfect window for deep work.",
      });
    }
    if (focus === "low") {
      out.push({
        tone: "warn",
        icon: TrendingDown,
        text: "Focus dipping — break tasks into 25-min Pomodoros.",
      });
    }
    if (out.length === 0) {
      out.push({
        tone: "info",
        icon: Sparkles,
        text: "You're balanced today. Maintain your current rhythm.",
      });
    }
    return out;
  }, [checkedIn, sleep, focus, mood]);

  // ─── Emotion distribution (donut) ───
  const emotionDist = useMemo(() => {
    if (!historyData?.summary) {
      return { happy: 40, neutral: 40, sad: 20 };
    }
    return {
      happy: historyData.summary.happy_pct,
      neutral: historyData.summary.neutral_pct,
      sad: historyData.summary.sad_pct,
    };
  }, [historyData?.summary]);

  // ─── Real data from backend ───
  const moodWeekReal = useMemo(() => {
    if (!historyData?.checkins || historyData.checkins.length === 0) return moodWeek;
    const moodMap = { happy: 3, neutral: 2, sad: 1 };
    const values = historyData.checkins.map((c) => moodMap[c.mood as keyof typeof moodMap] || 2);
    // Pad with defaults only if fewer than 7 days
    return values.length < 7 ? values.concat(Array(7 - values.length).fill(2)) : values.slice(-7);
  }, [historyData?.checkins]);

  const sleepWeekReal = useMemo(() => {
    if (!historyData?.checkins || historyData.checkins.length === 0) return sleepWeek;
    const sleepMap = { bad: 4, okay: 6, great: 8 };
    const values = historyData.checkins.map((c) => sleepMap[c.sleep as keyof typeof sleepMap] || 6);
    // Pad with defaults only if fewer than 7 days
    return values.length < 7 ? values.concat(Array(7 - values.length).fill(6)) : values.slice(-7);
  }, [historyData?.checkins]);

  const focusWeekReal = useMemo(() => {
    if (!historyData?.checkins || historyData.checkins.length === 0) return focusWeek;
    const focusMap = { low: 1, medium: 3, high: 5 }; // 1-5 scale for chart
    const values = historyData.checkins.map((c) => focusMap[c.focus as keyof typeof focusMap] || 3);
    // Pad with defaults only if fewer than 7 days
    return values.length < 7 ? values.concat(Array(7 - values.length).fill(3)) : values.slice(-7);
  }, [historyData?.checkins]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Well-being"
        title="Your emotional dashboard"
        description="A gentle check-in — Routiny turns your signals into a kinder schedule."
      />

      {/* ─── Daily Check-in ─── */}
      <section className="rounded-3xl bg-card border border-border p-6 lg:p-8 shadow-card animate-fade-in-up">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center">
            <Heart className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold leading-tight">Daily check-in</h3>
            <p className="text-xs text-muted-foreground">
              3 quick taps. Be honest, panda won't tell.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PillGroup
            label="😴 Sleep quality"
            options={SLEEP_OPTS}
            value={sleep}
            onChange={setSleep}
            accent="info"
          />
          <PillGroup
            label="🧠 Focus level"
            options={FOCUS_OPTS}
            value={focus}
            onChange={setFocus}
            accent="primary"
          />
          <PillGroup
            label="😊 Mood"
            options={MOOD_OPTS}
            value={mood}
            onChange={setMood}
            accent="warning"
          />
        </div>

        <div className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            What's affecting you today? <span className="font-normal">(optional)</span>
          </label>
          <input
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            placeholder="A line for your future self…"
            className="w-full h-11 px-4 rounded-xl bg-muted/60 border border-transparent focus:bg-card focus:border-ring focus:outline-none text-sm transition-colors"
          />
        </div>

        <div className="mt-6 flex gap-3 items-center flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={!checkedIn || submitting}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
              checkedIn && !submitting
                ? "gradient-primary text-primary-foreground hover:shadow-lg cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            }`}
          >
            {submitting ? "Saving..." : "Save Check-in"}
          </button>
          {todayCheckin && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-success/10 text-success text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Saved today</span>
            </div>
          )}
        </div>
      </section>

      {/* ─── Smart insights ─── */}
      {checkedIn && (
        <section className="rounded-3xl bg-gradient-to-br from-primary/5 via-card to-info/5 border border-primary/20 p-6 lg:p-8 shadow-card animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-primary/15 grid place-items-center animate-pulse-soft">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold leading-tight">Smart insights</h3>
              <p className="text-xs text-muted-foreground">Based on your check-in + 7-day trends</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => {
              const Icon = ins.icon;
              const tone =
                ins.tone === "good"
                  ? "bg-success/10 text-success border-success/30"
                  : ins.tone === "warn"
                    ? "bg-warning/10 text-warning-foreground border-warning/40"
                    : "bg-info/10 text-info border-info/30";
              return (
                <div
                  key={i}
                  className={`flex gap-3 rounded-2xl p-4 border-2 ${tone} animate-fade-in-up`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium leading-snug">{ins.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <AvatarTip message="Your study time has crept up the last 3 days. Let's protect tonight — no sessions after 22:00. 💚" />

      {/* ─── Charts row 1: Mood line + Donut ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 lg:p-8 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-bold">Weekly mood</h3>
              <p className="text-xs text-muted-foreground">Smoothed curve · last 7 days</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-success/10 text-success font-semibold">
              ↑ Improving
            </span>
          </div>
          {loadingHistory ? (
            <div className="h-44 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <MoodLineChart data={moodWeekReal} labels={DAYS} />
          )}
        </section>

        <section className="rounded-3xl bg-card border border-border p-6 shadow-card">
          <h3 className="font-display text-lg font-bold mb-1">Emotion mix</h3>
          <p className="text-xs text-muted-foreground mb-4">This week's breakdown</p>
          <EmotionDonut
            happy={emotionDist.happy}
            neutral={emotionDist.neutral}
            sad={emotionDist.sad}
          />
        </section>
      </div>

      {/* ─── Charts row 2: Sleep vs Focus ─── */}
      <section className="rounded-3xl bg-card border border-border p-6 lg:p-8 shadow-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-display text-lg font-bold">Sleep vs Focus</h3>
            <p className="text-xs text-muted-foreground">When you sleep well, focus follows</p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-info" /> Sleep (h)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Focus
            </span>
          </div>
        </div>
        {loadingHistory ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <DualLineChart sleep={sleepWeekReal} focus={focusWeekReal} labels={DAYS} />
        )}
      </section>

      {/* ─── Study intensity (improved) ─── */}
      <StudyIntensitySection data={studyWeek} labels={DAYS} />

      {/* ─── Emotional timeline ─── */}
      <section className="rounded-3xl bg-card border border-border p-6 lg:p-8 shadow-card">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="h-4 w-4 text-accent-foreground" />
          <h3 className="font-display text-lg font-bold">Emotional timeline · today</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-6">Hover a moment to see the context.</p>
        <EmotionalTimeline />
      </section>

      {/* ─── Adaptive suggestions ─── */}
      <section className="rounded-3xl bg-card border border-border p-6 lg:p-8 shadow-card">
        <h3 className="font-display text-lg font-bold mb-4">Smart suggestions</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              icon: Wind,
              label: "Take a 5-min breathing break",
              hint: "Focus dropping mid-afternoon",
              priority: "high",
            },
            {
              icon: Flame,
              label: "You're consistent — keep going",
              hint: "5-day streak detected 🔥",
              priority: "good",
            },
            {
              icon: Moon,
              label: "Sleep is decreasing — recover tonight",
              hint: "Wind-down at 22:30",
              priority: "warn",
            },
            {
              icon: Coffee,
              label: "Hydrate & stretch",
              hint: "It's been 90 min since you moved",
              priority: "low",
            },
          ].map((s) => {
            const Icon = s.icon;
            const dot =
              s.priority === "high"
                ? "bg-destructive"
                : s.priority === "warn"
                  ? "bg-warning"
                  : s.priority === "good"
                    ? "bg-success"
                    : "bg-info";
            return (
              <li
                key={s.label}
                className="group flex items-center gap-3 rounded-2xl p-3 border border-border hover:border-primary/40 hover:shadow-soft transition-all"
              >
                <div className="h-11 w-11 rounded-xl gradient-sky grid place-items-center shrink-0 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{s.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.hint}</div>
                </div>
                <span className={`h-2 w-2 rounded-full ${dot} animate-pulse-soft`} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

// ─── Pill selector ────────────────────────────────────────────────────────────
function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  accent,
}: {
  label: string;
  options: Choice<T>[];
  value: string | null;
  onChange: (v: string) => void;
  accent: "primary" | "info" | "warning";
}) {
  const accentMap = {
    primary: "bg-primary text-primary-foreground border-primary shadow-glow",
    info: "bg-info text-info-foreground border-info shadow-glow",
    warning: "bg-warning text-warning-foreground border-warning shadow-glow",
  };
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      <div className="flex gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`flex-1 rounded-2xl border-2 px-2 py-3 flex flex-col items-center gap-1 transition-all duration-200 ${
                active
                  ? `${accentMap[accent]} scale-[1.04]`
                  : "border-border hover:border-primary/40 hover:scale-[1.02] hover:bg-muted/50"
              }`}
            >
              <span className="text-2xl leading-none">{o.emoji}</span>
              <span className="text-[11px] font-semibold">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mood line chart (smooth SVG path with draw-on animation) ─────────────────
function MoodLineChart({ data, labels }: { data: number[]; labels: string[] }) {
  const w = 600;
  const h = 180;
  const pad = 28;
  const stepX = (w - pad * 2) / (data.length - 1);
  const yFor = (v: number) => h - pad - ((v - 1) / 2) * (h - pad * 2);
  const points = data.map((v, i) => [pad + i * stepX, yFor(v)] as const);

  // Catmull-Rom-ish smooth path
  const path = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p[0]} ${p[1]}`;
    const prev = arr[i - 1];
    const cx = (prev[0] + p[0]) / 2;
    return `${acc} Q ${cx} ${prev[1]}, ${cx} ${(prev[1] + p[1]) / 2} T ${p[0]} ${p[1]}`;
  }, "");

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
        <defs>
          <linearGradient id="moodFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[1, 2, 3].map((v) => (
          <line
            key={v}
            x1={pad}
            x2={w - pad}
            y1={yFor(v)}
            y2={yFor(v)}
            stroke="var(--color-border)"
            strokeDasharray="3 4"
          />
        ))}
        {/* area fill */}
        <path
          d={`${path} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`}
          fill="url(#moodFill)"
          opacity={0}
          style={{ animation: "fade-in 1.2s 0.8s ease-out forwards" }}
        />
        {/* line */}
        <path
          d={path}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: 1,
            animation: "wb-draw 1.6s ease-out forwards",
          }}
        />
        {/* points */}
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={5}
            fill="var(--color-card)"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            opacity={0}
            style={{ animation: `fade-in 0.4s ${1.2 + i * 0.06}s ease-out forwards` }}
          >
            <title>{`${labels[i]}: ${["Sad", "Neutral", "Happy"][data[i] - 1]}`}</title>
          </circle>
        ))}
        {/* labels */}
        {labels.map((d, i) => (
          <text
            key={d + i}
            x={pad + i * stepX}
            y={h - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 11 }}
          >
            {d}
          </text>
        ))}
      </svg>
      <style>{`@keyframes wb-draw { to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}

// ─── Dual line chart (sleep vs focus) ─────────────────────────────────────────
function DualLineChart({
  sleep,
  focus,
  labels,
}: {
  sleep: number[];
  focus: number[];
  labels: string[];
}) {
  const w = 600;
  const h = 200;
  const pad = 30;
  const stepX = (w - pad * 2) / (sleep.length - 1);
  const ySleep = (v: number) => h - pad - ((v - 4) / 5) * (h - pad * 2); // 4-9h
  const yFocus = (v: number) => h - pad - ((v - 1) / 4) * (h - pad * 2); // 1-5

  const mkPath = (arr: number[], yfn: (v: number) => number) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * stepX} ${yfn(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-52">
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={pad}
          x2={w - pad}
          y1={pad + (i * (h - pad * 2)) / 4}
          y2={pad + (i * (h - pad * 2)) / 4}
          stroke="var(--color-border)"
          strokeDasharray="3 4"
        />
      ))}
      <path
        d={mkPath(sleep, ySleep)}
        fill="none"
        stroke="var(--color-info)"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: "wb-draw 1.6s ease-out forwards",
        }}
      />
      <path
        d={mkPath(focus, yFocus)}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: "wb-draw 1.6s 0.3s ease-out forwards",
        }}
      />
      {sleep.map((v, i) => (
        <circle key={`s${i}`} cx={pad + i * stepX} cy={ySleep(v)} r={3.5} fill="var(--color-info)">
          <title>{`${labels[i]} · ${v}h sleep`}</title>
        </circle>
      ))}
      {focus.map((v, i) => (
        <circle
          key={`f${i}`}
          cx={pad + i * stepX}
          cy={yFocus(v)}
          r={3.5}
          fill="var(--color-primary)"
        >
          <title>{`${labels[i]} · focus ${v}/5`}</title>
        </circle>
      ))}
      {labels.map((d, i) => (
        <text
          key={d + i}
          x={pad + i * stepX}
          y={h - 8}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 11 }}
        >
          {d}
        </text>
      ))}
    </svg>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function EmotionDonut({ happy, neutral, sad }: { happy: number; neutral: number; sad: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const segments = [
    { v: happy, color: "var(--color-success)", label: "Happy", emoji: "😊" },
    { v: neutral, color: "var(--color-warning)", label: "Neutral", emoji: "😐" },
    { v: sad, color: "var(--color-info)", label: "Sad", emoji: "😔" },
  ];
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 160 160" className="h-36 w-36 -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="18" />
        {segments.map((s, i) => {
          const len = (s.v / 100) * c;
          const dash = `${len} ${c - len}`;
          const dashoffset = -offset;
          offset += len;
          return (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
              style={{
                transformOrigin: "80px 80px",
                animation: `wb-donut 1.2s ${i * 0.18}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
              }}
            />
          );
        })}
      </svg>
      <ul className="space-y-2 flex-1">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="text-base">{s.emoji}</span>
              <span className="font-medium">{s.label}</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: s.color }}>
              {s.v}%
            </span>
          </li>
        ))}
      </ul>
      <style>{`@keyframes wb-donut { from { transform: scale(0.6) rotate(-30deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ─── Study intensity section (with smart label + lighter day highlight) ──────
function StudyIntensitySection({ data, labels }: { data: number[]; labels: string[] }) {
  const total = data.reduce((s, v) => s + v, 0);
  const avg = total / data.length;
  // "lighter day" = the minimum value (only highlight if meaningfully lighter than avg)
  const min = Math.min(...data);
  const lighterIdx = min < avg * 0.7 ? data.indexOf(min) : -1;
  const max = Math.max(...data);

  // Smart balance label
  const overworking = data.filter((v) => v >= 6).length >= 3 || avg > 5.5;
  const tooLight = avg < 2;
  const balance = overworking
    ? { tone: "warn" as const, text: "You may be overworking", emoji: "🔥" }
    : tooLight
      ? { tone: "info" as const, text: "Plenty of room to grow this week", emoji: "🌱" }
      : { tone: "good" as const, text: "Good balance this week", emoji: "🌿" };

  const badgeClass =
    balance.tone === "good"
      ? "bg-success/10 text-success border-success/30"
      : balance.tone === "warn"
        ? "bg-warning/15 text-warning-foreground border-warning/40"
        : "bg-info/10 text-info border-info/30";

  return (
    <section className="rounded-3xl bg-card border border-border p-6 lg:p-8 shadow-card">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="font-display text-lg font-bold">Study intensity · this week</h3>
        <span className="text-xs text-muted-foreground">hours / day · avg {avg.toFixed(1)}h</span>
      </div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Aim for steady 4–5h with at least one lighter day.
        </p>
        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 ${badgeClass} animate-fade-in`}
        >
          {balance.emoji} {balance.text}
        </span>
      </div>
      <IntensityBars
        data={data}
        labels={labels.map((d) => d.slice(0, 3))}
        max={max}
        lighterIdx={lighterIdx}
      />
    </section>
  );
}

// ─── Animated bars ────────────────────────────────────────────────────────────
function IntensityBars({
  data,
  labels,
  max,
  lighterIdx,
}: {
  data: number[];
  labels: string[];
  max: number;
  lighterIdx: number;
}) {
  return (
    <div className="flex items-end gap-2 sm:gap-3 h-52">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="wb-bar-eco" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.16 155)" />
            <stop offset="100%" stopColor="oklch(0.55 0.14 165)" />
          </linearGradient>
          <linearGradient id="wb-bar-light" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.85 0.13 90)" />
            <stop offset="100%" stopColor="oklch(0.7 0.15 70)" />
          </linearGradient>
        </defs>
      </svg>
      {data.map((h, i) => {
        const isLighter = i === lighterIdx;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full">
            <div className="w-full flex-1 flex items-end relative">
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-foreground text-background text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-card pointer-events-none">
                {h} hours
                <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 h-2 w-2 rotate-45 bg-foreground" />
              </div>
              {isLighter && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs animate-bounce">
                  🌿
                </div>
              )}
              <div
                className="w-full rounded-t-2xl shadow-soft transition-all group-hover:brightness-110 group-hover:scale-[1.03] origin-bottom"
                style={{
                  height: "0%",
                  background: isLighter
                    ? "url(#wb-bar-light) oklch(0.78 0.14 80)"
                    : "url(#wb-bar-eco) oklch(0.6 0.14 160)",
                  backgroundImage: isLighter
                    ? "linear-gradient(to bottom, oklch(0.86 0.13 90), oklch(0.7 0.15 70))"
                    : "linear-gradient(to bottom, oklch(0.78 0.16 155), oklch(0.5 0.14 165))",
                  animation: `wb-bar 1s ${i * 0.09}s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                  ["--bar-h" as string]: `${Math.max((h / max) * 100, 4)}%`,
                  outline: isLighter ? "2px dashed oklch(0.7 0.15 70 / 0.6)" : "none",
                  outlineOffset: 2,
                }}
              />
            </div>
            <div
              className={`text-xs font-mono ${
                isLighter ? "text-warning-foreground font-bold" : "text-muted-foreground"
              }`}
            >
              {labels[i]}
            </div>
          </div>
        );
      })}
      <style>{`@keyframes wb-bar { from { height: 0%; } to { height: var(--bar-h); } }`}</style>
    </div>
  );
}

// ─── Emotional timeline (today) ───────────────────────────────────────────────
function EmotionalTimeline() {
  return (
    <div className="relative">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-info/40 via-primary/40 to-accent/60" />
      <ul className="relative grid grid-cols-3 sm:grid-cols-6 gap-3">
        {TIMELINE.map((m, i) => (
          <li
            key={m.time}
            className="group flex flex-col items-center gap-1.5 animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="text-[10px] font-mono text-muted-foreground">{m.time}</div>
            <div className="h-12 w-12 rounded-full bg-card border-2 border-border grid place-items-center text-2xl shadow-soft transition-all group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-glow cursor-default">
              {m.emoji}
            </div>
            <div className="text-[10px] text-muted-foreground text-center max-w-[90px] leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
              {m.note}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
