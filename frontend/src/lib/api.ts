import type { Project } from "@/data/projects";

/**
 * Backend base URL. Empty string = same origin (use Vite dev proxy to your API).
 * Optional: VITE_API_BASE_URL if you call the API directly.
 */
const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export type SessionInsightsPayload = {
  sessionMinutes?: string | null;
  breakNeeded?: string | null;
  difficultyAdjustment?: string | null;
};

export type PromptHint = "explain_simple" | "give_example" | "summarize_page";

/** Energy agent output (subset), surfaced per chat reply. */
export type EnergySnapshot = {
  mode: string;
  responseDepth: string;
  maxTokens: number;
  reason: string;
  reuseCachedAnswer?: boolean;
  reuseCachedRag?: boolean;
  reuseReadinessSignal?: boolean;
};

/** Per-turn snapshot of energy, readiness, learning, routing, and RAG. */
export type AgentSignals = {
  energy?: Record<string, unknown>;
  readiness?: Record<string, unknown>;
  learning?: Record<string, unknown>;
  routing?: Record<string, unknown>;
  rag?: Record<string, unknown>;
};

export type ChatResponse = {
  session_id: string;
  reply: string;
  reply_raw?: string | unknown[] | null;
  routing?: Record<string, unknown> | null;
  errors: string[];
  warnings: string[];
  session_insights?: SessionInsightsPayload | null;
  energy?: EnergySnapshot | null;
  agent_signals?: AgentSignals | null;
};

export async function postChat(body: {
  message: string;
  session_id?: string | null;
  /** Passed through to the orchestrator (e.g. revise, practice, learn_concept). */
  intent?: string | null;
  /** Workspace suggestion chips — steers learning prompt shape. */
  prompt_hint?: PromptHint | null;
  course_context?: Record<string, unknown> | null;
}): Promise<ChatResponse> {
  const r = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: body.message,
      session_id: body.session_id ?? null,
      intent: body.intent ?? null,
      prompt_hint: body.prompt_hint ?? null,
      course_context: body.course_context ?? null,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<ChatResponse>;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const r = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
}

/** Run planner on session context, then remove server session (workspace “end study session”). */
export type FinalizeSessionResponse = {
  ok: boolean;
  planner: {
    status: string;
    skipped?: boolean;
    reason?: string;
    planning_task?: Record<string, unknown> | null;
  };
};

export async function finalizeSession(sessionId: string): Promise<FinalizeSessionResponse> {
  const r = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}/end`, {
    method: "POST",
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<FinalizeSessionResponse>;
}

export type CorpusFile = {
  name: string;
  size_bytes: number;
  kind: "document" | "rag_index";
};

export type CourseUpload = {
  filename: string;
  slug: string;
  course_id: string;
  chapter_id: string;
  size_bytes: number;
  pages: number;
  chunks: number;
  uploaded_at: string;
};

export async function fetchCourseUploads(): Promise<CourseUpload[]> {
  const r = await fetch(`${base}/api/corpus/uploads`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  const data = (await r.json()) as { uploads?: CourseUpload[] };
  return data.uploads ?? [];
}

export async function uploadCoursePdf(
  file: File,
  courseId: string,
  chapterId: string,
): Promise<CourseUpload> {
  const body = new FormData();
  body.append("file", file);
  body.append("course_id", courseId);
  body.append("chapter_id", chapterId);
  const r = await fetch(`${base}/api/corpus/upload`, { method: "POST", body });
  if (!r.ok) {
    let detail = "";
    try {
      const data = (await r.json()) as { detail?: string };
      detail = typeof data.detail === "string" ? data.detail : "";
    } catch {
      detail = await r.text();
    }
    throw new Error(detail || `${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<CourseUpload>;
}

export async function fetchCorpusFiles(): Promise<{
  data_dir: string;
  files: CorpusFile[];
  error?: string;
}> {
  const r = await fetch(`${base}/api/corpus/files`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<{ data_dir: string; files: CorpusFile[]; error?: string }>;
}

/** URL to stream a corpus file (same-origin in dev via Vite proxy). */
export function corpusFileUrl(filename: string): string {
  return `${base}/api/corpus/file/${encodeURIComponent(filename)}`;
}

export async function fetchProjects(): Promise<Project[]> {
  const r = await fetch(`${base}/api/projects`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  const data = (await r.json()) as { projects: Project[] };
  return data.projects ?? [];
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const r = await fetch(`${base}/api/projects`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projects }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
}

export type CatalogApiPayload = {
  courses: import("@/data/teacher").TeacherCourse[];
  classes: import("@/data/teacher").TeacherClass[];
  students: import("@/data/teacher").TeacherStudent[];
};

export async function fetchCatalog(): Promise<CatalogApiPayload> {
  const r = await fetch(`${base}/api/catalog`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<CatalogApiPayload>;
}

export async function saveCatalog(payload: CatalogApiPayload): Promise<CatalogApiPayload> {
  const r = await fetch(`${base}/api/catalog`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<CatalogApiPayload>;
}

export async function fetchTeacherProjects(): Promise<Project[]> {
  const r = await fetch(`${base}/api/teacher/projects`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  const data = (await r.json()) as { projects: Project[] };
  return data.projects ?? [];
}

export async function saveTeacherProjects(projects: Project[]): Promise<Project[]> {
  const r = await fetch(`${base}/api/teacher/projects`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projects }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  const data = (await r.json()) as { projects: Project[] };
  return data.projects ?? [];
}

export type ReadinessApiResponse = {
  readiness_percent: number;
  readiness_signal: Record<string, unknown>;
  recommended_intensity: string;
  session_id: string | null;
};

/** Same readiness pipeline as chat (`run_readiness_agent`). Uses projects for passive signals; optional session merges stored signals from workspace chat. */
export async function fetchReadiness(sessionId: string | null): Promise<ReadinessApiResponse> {
  const q =
    sessionId && sessionId.length > 0
      ? `?session_id=${encodeURIComponent(sessionId)}`
      : "";
  const r = await fetch(`${base}/api/readiness${q}`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<ReadinessApiResponse>;
}

export async function getHealth(): Promise<{
  status: string;
  data_dir: string;
  data_dir_exists: boolean;
  groq_configured: boolean;
}> {
  const r = await fetch(`${base}/health`);
  if (!r.ok) throw new Error(r.statusText);
  return r.json() as Promise<{
    status: string;
    data_dir: string;
    data_dir_exists: boolean;
    groq_configured: boolean;
  }>;
}
