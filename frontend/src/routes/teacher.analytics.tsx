import { createFileRoute } from "@tanstack/react-router";
import { Brain, Lightbulb, MessageCircle, Sparkles, TrendingUp } from "lucide-react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import {
  commonQuestions,
  conceptInsights,
  contentSuggestions,
  studentsNeedingSupport,
} from "@/data/teacher";

export const Route = createFileRoute("/teacher/analytics")({
  component: TeacherAnalytics,
});

function TeacherAnalytics() {
  const allAlerts = studentsNeedingSupport();

  return (
    <TeacherShell
      eyebrow="Analytics"
      title="Insights"
      description="Where students struggle, what they ask the most, and where to invest your next hour of content work."
    >
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-warning font-bold">
                Struggle signals
              </div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Brain className="h-5 w-5 text-warning" />
                Concepts students struggle with
              </h2>
            </div>
          </div>
          <ul className="space-y-3">
            {conceptInsights.map((insight) => (
              <li
                key={insight.concept}
                className="rounded-2xl border border-border p-4 bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{insight.concept}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{insight.signal}</p>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2 font-bold">
                      {insight.course}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-2xl font-bold text-warning">
                      {insight.struggleRate}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">struggle rate</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
            Trending
          </div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Most-asked questions
          </h2>
          <ul className="mt-4 space-y-3">
            {commonQuestions.map((entry) => (
              <li key={entry.question} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">
                  {entry.count}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.question}</p>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-bold">
                    {entry.course}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
            Suggestions
          </div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Where to invest next
          </h2>
          <ul className="mt-4 space-y-3">
            {contentSuggestions.map((suggestion) => (
              <li
                key={suggestion.title}
                className="rounded-2xl border border-border p-4 bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{suggestion.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{suggestion.detail}</p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      suggestion.impact === "High"
                        ? "bg-primary/15 text-primary"
                        : suggestion.impact === "Medium"
                          ? "bg-warning/15 text-warning"
                          : "bg-muted text-foreground"
                    }`}
                  >
                    {suggestion.impact} impact
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="text-[10px] uppercase tracking-widest text-warning font-bold">Roster</div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-warning" />
            All students needing support
          </h2>
          {allAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">
              <Sparkles className="inline-block h-4 w-4 mr-1 text-primary" />
              No flagged students. Nice work.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {allAlerts.map((alert) => (
                <li
                  key={`${alert.studentId}-${alert.classId}`}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3"
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </TeacherShell>
  );
}
