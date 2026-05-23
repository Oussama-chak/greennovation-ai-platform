import { Zap, GitBranch, Library, CalendarDays } from "lucide-react";
import type { EnergySnapshot } from "@/lib/api";
import type { RoutingSummary } from "@/lib/parseToolReplies";

type CardTone = "primary" | "warm" | "sky";

const TONE: Record<CardTone, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  warm: "bg-accent/40 text-accent-foreground border-accent/40",
  sky: "bg-secondary/60 text-secondary-foreground border-secondary",
};

/** Result of POST /api/session/:id/end (planner run when study session ends). */
export type SessionEndPlannerInfo = {
  planning_task?: Record<string, unknown> | null;
  status?: string;
  skipped?: boolean;
  reason?: string;
} | null;

type StudyNotificationsProps = {
  /** Energy agent decision for the last reply (mode, depth, token budget, reuse flags). */
  energySnapshot?: EnergySnapshot | null;
  /** Orchestrator intent / agents for the last reply. */
  routingSummary?: RoutingSummary | null;
  /** Parsed RAG citations from the assistant message (duplicated in sidebar). */
  sources?: string[];
  /** Planner output after ending a study session (cleared on next chat send). */
  sessionEndPlanner?: SessionEndPlannerInfo;
};

export function StudyNotifications({
  energySnapshot = null,
  routingSummary = null,
  sources = [],
  sessionEndPlanner = null,
}: StudyNotificationsProps) {
  const reuseTags: string[] = [];
  if (energySnapshot?.reuseCachedAnswer) reuseTags.push("Cached answer");
  if (energySnapshot?.reuseCachedRag) reuseTags.push("Cached retrieval");
  if (energySnapshot?.reuseReadinessSignal) reuseTags.push("Readiness skipped");

  const planTask = sessionEndPlanner?.planning_task;
  const todaySummary =
    planTask && typeof planTask.today_summary === "string" ? planTask.today_summary.trim() : "";
  const tomorrowPlan = Array.isArray(planTask?.tomorrow_plan) ? planTask.tomorrow_plan : [];
  const recommendedDuration =
    typeof planTask?.recommended_duration === "number" ? planTask.recommended_duration : null;
  const planIntensity = typeof planTask?.intensity === "string" ? planTask.intensity : null;
  const showPlannerCard = Boolean(sessionEndPlanner);

  return (
    <div className="space-y-3">
      {energySnapshot && (
        <div className="relative rounded-2xl bg-card border border-border shadow-card p-4 flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-full border grid place-items-center shrink-0 ${TONE.sky}`}
          >
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-primary">Energy mode</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <span className="font-semibold text-foreground capitalize">{energySnapshot.mode}</span>
              {" · "}
              {energySnapshot.responseDepth} depth
              {" · ~"}
              {energySnapshot.maxTokens} tokens
            </p>
            {energySnapshot.reason ? (
              <p className="text-[10px] text-muted-foreground/90 mt-2 leading-snug line-clamp-5">
                {energySnapshot.reason}
              </p>
            ) : null}
            {reuseTags.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {reuseTags.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] font-semibold uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
      {routingSummary && (
        <div className="relative rounded-2xl bg-card border border-border shadow-card p-4 flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-full border grid place-items-center shrink-0 ${TONE.warm}`}
          >
            <GitBranch className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-primary">Routing</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <span className="font-semibold text-foreground capitalize">{routingSummary.intent}</span>
            </p>
            <p className="text-[10px] text-muted-foreground/90 mt-1.5 leading-snug line-clamp-4">
              {routingSummary.reason}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              <span className="font-semibold text-foreground/80">Agents:</span> {routingSummary.agents}
            </p>
          </div>
        </div>
      )}
      {sources.length > 0 && (
        <div className="relative rounded-2xl bg-card border border-border shadow-card p-4 flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-full border grid place-items-center shrink-0 ${TONE.primary}`}
          >
            <Library className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-primary">Sources</div>
            <ul className="mt-2 space-y-1.5 text-[10px] text-muted-foreground leading-snug">
              {sources.map((s, i) => (
                <li key={`${i}-${s.slice(0, 24)}`} className="border-l-2 border-primary/25 pl-2">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {showPlannerCard && (
        <div className="relative rounded-2xl bg-card border border-border shadow-card p-4 flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-full border grid place-items-center shrink-0 ${TONE.primary}`}
          >
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-primary">Study session plan</div>
            {sessionEndPlanner?.skipped ? (
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                {sessionEndPlanner.reason
                  ? String(sessionEndPlanner.reason)
                  : "Planner did not regenerate a new plan (cadence: already generated today). Your session still ended."}
              </p>
            ) : (
              <>
                {todaySummary ? (
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{todaySummary}</p>
                ) : null}
                {tomorrowPlan.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-[10px] text-foreground/90">
                    {tomorrowPlan.map((item, i) => {
                      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
                      const task = typeof row.task === "string" ? row.task : `Task ${i + 1}`;
                      const mins = typeof row.duration_minutes === "number" ? row.duration_minutes : null;
                      const pri = typeof row.priority === "string" ? row.priority : null;
                      return (
                        <li
                          key={`${i}-${task.slice(0, 24)}`}
                          className="border-l-2 border-primary/30 pl-2 leading-snug"
                        >
                          <span className="font-medium">{task}</span>
                          {mins != null ? (
                            <span className="text-muted-foreground"> · {mins} min</span>
                          ) : null}
                          {pri ? (
                            <span className="text-[9px] uppercase text-muted-foreground ml-1">({pri})</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : !todaySummary ? (
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                    Session ended. No structured plan was returned — check the API or try again later.
                  </p>
                ) : null}
                {(recommendedDuration != null || planIntensity) && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {recommendedDuration != null ? (
                      <span>Suggested block: ~{recommendedDuration} min</span>
                    ) : null}
                    {recommendedDuration != null && planIntensity ? " · " : null}
                    {planIntensity ? (
                      <span className="capitalize">Intensity: {planIntensity}</span>
                    ) : null}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
