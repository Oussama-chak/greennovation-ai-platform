import { CalendarDays } from "lucide-react";

type CardTone = "primary";

const TONE: Record<CardTone, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
};

/** Result of POST /api/session/:id/end (planner run when study session ends). */
export type SessionEndPlannerInfo = {
  planning_task?: Record<string, unknown> | null;
  status?: string;
  skipped?: boolean;
  reason?: string;
} | null;

type StudyNotificationsProps = {
  /** Planner output after ending a study session (cleared on next chat send). */
  sessionEndPlanner?: SessionEndPlannerInfo;
};

export function StudyNotifications({ sessionEndPlanner = null }: StudyNotificationsProps) {
  const planTask = sessionEndPlanner?.planning_task;
  const todaySummary =
    planTask && typeof planTask.today_summary === "string" ? planTask.today_summary.trim() : "";
  const tomorrowPlan = Array.isArray(planTask?.tomorrow_plan) ? planTask.tomorrow_plan : [];
  const recommendedDuration =
    typeof planTask?.recommended_duration === "number" ? planTask.recommended_duration : null;
  const planIntensity = typeof planTask?.intensity === "string" ? planTask.intensity : null;
  const showPlannerCard = Boolean(sessionEndPlanner);

  if (!showPlannerCard) {
    return null;
  }

  return (
    <div className="space-y-3">
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
    </div>
  );
}
