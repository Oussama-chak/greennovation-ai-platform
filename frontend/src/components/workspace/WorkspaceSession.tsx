import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Send,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Download,
  Loader2,
  ArrowLeft,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  Lightbulb,
  HelpCircle,
  ListChecks,
  AlignLeft,
  MessageCircle,
  Check,
  type LucideIcon,
} from "lucide-react";
import { Panda } from "@/components/PandaCompanion";
import type { Material } from "@/data/chapters";
import { flattenChapters, type FlatChapter } from "@/data/studentLearning";
import { RichContent } from "@/components/RichContent";
import { PdfViewer } from "@/components/PdfViewer";
import { PptxViewer } from "@/components/PptxViewer";
import { StudyNotifications, type SessionEndPlannerInfo } from "@/components/StudyNotifications";
import { ChatBubble, TypingDots } from "@/components/FloatingBamboo";
import {
  corpusFileUrl,
  deleteSession,
  finalizeSession,
  fetchReadiness,
  postChat,
  type AgentSignals,
  type EnergySnapshot,
  type PromptHint,
} from "@/lib/api";
import { getStoredChatSessionId, setStoredChatSessionId } from "@/lib/chatSession";
import { stripSessionInsightLines } from "@/lib/parseSessionInsights";
import {
  detectComposerMode,
  extractQuizItems,
  formatExplainStructuredReply,
  formatRoutingSummary,
  parseSourcesFromReply,
  parseSummarySections,
  quizIntroText,
  stripSourcesBlock,
  type QuizItem,
  type RoutingSummary,
  type SummarySections,
} from "@/lib/parseToolReplies";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useOpenBreathingBreak } from "@/context/BreathingBreakContext";

const STUDY_SPLIT_KEY = "routiny-study-split-v2";

function loadStudySplit(): Record<string, number> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STUDY_SPLIT_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (typeof parsed["study-reader"] === "number" && typeof parsed["study-chat"] === "number") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function saveStudySplit(layout: Record<string, number>) {
  try {
    window.localStorage.setItem(STUDY_SPLIT_KEY, JSON.stringify(layout));
  } catch {
    /* quota */
  }
}

const FILES_OPEN_KEY = "routiny-study-files-open";

function loadFilesOpen() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(FILES_OPEN_KEY) !== "0";
}

export type WorkspaceSessionProps = {
  courseId: string;
  courseTitle: string;
  classLabel: string;
  materials: Material[];
  materialsLoading?: boolean;
  materialsError?: string | null;
  initialChapterId: string | null;
  onChapterChange: (chapterId: string) => void;
};

type ToolKind = "summary" | "quiz" | "mcq" | "explain";

type ChatMessage = {
  id: string;
  role: "user" | "bamboo";
  text: string;
  streaming?: boolean;
  quizItems?: QuizItem[];
  summarySections?: SummarySections | null;
  variant?: "default" | "summary" | "explain";
  signals?: AgentSignals | null;
};

function signalText(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "—";
  return String(value);
}

function SignalGroup({ title, rows }: { title: string; rows: [string, unknown][] }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">{title}</p>
      <dl className="mt-1 space-y-0.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2 text-[11px] leading-4">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-foreground/90">{signalText(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AgentSignalsStrip({ signals }: { signals: AgentSignals }) {
  const energy = signals.energy ?? {};
  const readiness = signals.readiness ?? {};
  const learning = signals.learning ?? {};
  const routing = signals.routing ?? {};
  const rag = signals.rag ?? {};
  return (
    <details className="mt-1.5 rounded-xl border border-primary/15 bg-card/80 px-2.5 py-1.5">
      <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground select-none">
        Agent signals · {signalText(routing.intent)} · quiz {signalText(learning.quiz_level)}
      </summary>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <SignalGroup
          title="Energy"
          rows={[
            ["mode", energy.mode],
            ["depth", energy.depth],
            ["tokens", energy.max_tokens],
            ["quiz on", energy.quiz],
            ["use RAG", energy.use_rag],
            ["cached answer", energy.cached_answer],
            ["cached RAG", energy.cached_rag],
            ["cached readiness", energy.cached_readiness],
            ["status", energy.status],
            ["reason", energy.reason],
          ]}
        />
        <SignalGroup
          title="Readiness"
          rows={[
            ["difficulty", readiness.difficulty],
            ["intensity", readiness.intensity],
            ["tone", readiness.tone],
            ["minutes", readiness.minutes],
            ["break", readiness.break],
            ["fatigue", readiness.fatigue],
            ["workload", readiness.workload],
            ["status", readiness.status],
            ["reason", readiness.reason],
          ]}
        />
        <SignalGroup
          title="Learning"
          rows={[
            ["quiz level", learning.quiz_level],
            ["tone", learning.tone],
            ["minutes", learning.minutes],
            ["break", learning.break],
            ["question levels", learning.quiz_difficulties],
            ["status", learning.status],
          ]}
        />
        <SignalGroup
          title="Routing + RAG"
          rows={[
            ["intent", routing.intent],
            ["agents", routing.agents],
            ["reason", routing.reason],
            ["chunks", rag.chunks],
            ["RAG status", rag.status],
          ]}
        />
      </div>
    </details>
  );
}

/** Per-chapter chat thread inside a course study session. */
type ChapterChatState = {
  messages: ChatMessage[];
  chatSessionId: string | null;
  energySnapshot: EnergySnapshot | null;
  routingSnapshot: RoutingSummary | null;
  sourcesList: string[];
};

function emptyChapterChatState(): ChapterChatState {
  return {
    messages: [],
    chatSessionId: null,
    energySnapshot: null,
    routingSnapshot: null,
    sourcesList: [],
  };
}

function buildToolApiMessage(tab: ToolKind, userHint: string): string {
  const q = userHint.trim();
  if (tab === "summary") {
    return q
      ? `Summarize this topic using only the course materials. Topic or focus: ${q}`
      : `Summarize the key ideas of the current lesson, then add revision questions with answers. Use only the course materials.`;
  }
  if (tab === "quiz") {
    return q
      ? `Generate exactly 3 practice questions about: ${q}. Return ONLY valid JSON as specified in your instructions. Use only the course materials.`
      : `Generate exactly 3 practice questions from the current lesson. Return ONLY valid JSON as specified in your instructions. Use only the course materials.`;
  }
  if (tab === "mcq") {
    return q
      ? `Generate exactly 3 multiple-choice questions about: ${q}. Each question has exactly 3 options and exactly one correct answer. Return ONLY valid JSON as specified in your instructions. Use only the course materials.`
      : `Generate exactly 3 multiple-choice questions from the current lesson. Each question has exactly 3 options and exactly one correct answer. Return ONLY valid JSON as specified in your instructions. Use only the course materials.`;
  }
  return q
    ? `Explain in clear, student-friendly language (examples welcome): ${q}`
    : `Explain the main concepts of the current lesson in simple terms. Use only the course materials.`;
}

function intentForTool(tab: ToolKind): "revise" | "practice" | "learn_concept" {
  if (tab === "summary") return "revise";
  if (tab === "quiz" || tab === "mcq") return "practice";
  return "learn_concept";
}

const COMPOSER_MODES: {
  kind: ToolKind;
  label: string;
  chip: string;
  placeholder: string;
  emptySend: string;
  icon: LucideIcon;
  idleClass: string;
  activeClass: string;
}[] = [
  {
    kind: "summary",
    label: "Summarize",
    chip: "Summarize",
    placeholder: "What should I summarize…",
    emptySend: "Summarize this lesson",
    icon: AlignLeft,
    idleClass: "bg-[oklch(0.94_0.05_230)] text-[oklch(0.42_0.1_230)] hover:bg-[oklch(0.9_0.07_230)]",
    activeClass: "bg-[oklch(0.72_0.12_230)] text-white shadow-sm",
  },
  {
    kind: "explain",
    label: "Explain",
    chip: "Explain",
    placeholder: "What should I explain…",
    emptySend: "Explain this lesson",
    icon: Lightbulb,
    idleClass: "bg-[oklch(0.95_0.07_85)] text-[oklch(0.45_0.12_70)] hover:bg-[oklch(0.91_0.09_85)]",
    activeClass: "bg-[oklch(0.75_0.14_70)] text-white shadow-sm",
  },
  {
    kind: "quiz",
    label: "Quiz me",
    chip: "Quiz",
    placeholder: "Topic for the quiz…",
    emptySend: "Quiz me on this lesson",
    icon: HelpCircle,
    idleClass: "bg-primary/12 text-primary hover:bg-primary/18",
    activeClass: "bg-primary text-primary-foreground shadow-sm",
  },
  {
    kind: "mcq",
    label: "Multiple choice",
    chip: "Multiple choice",
    placeholder: "Topic for the multiple choice…",
    emptySend: "Multiple choice on this lesson",
    icon: ListChecks,
    idleClass: "bg-[oklch(0.94_0.05_175)] text-[oklch(0.4_0.1_175)] hover:bg-[oklch(0.9_0.07_175)]",
    activeClass: "bg-[oklch(0.62_0.12_175)] text-white shadow-sm",
  },
];

function composerModeMeta(kind: ToolKind) {
  return COMPOSER_MODES.find((mode) => mode.kind === kind) ?? COMPOSER_MODES[0];
}

const CONVERSATION_STARTERS: { label: string; hint: PromptHint }[] = [
  { label: "What's the main idea of this page?", hint: "summarize_page" },
  { label: "Walk me through an example", hint: "give_example" },
  { label: "Explain this like I'm new to it", hint: "explain_simple" },
];

function displayFileName(name: string) {
  return name.replace(/\.(pdf|pptx|docx|ppt)$/i, "");
}

/** Used only if the readiness agent cannot be reached. Matches its "normal" length. */
const FALLBACK_SESSION_MINUTES = 30;

function minutesFromReadinessSignal(signal: Record<string, unknown> | null | undefined): number | null {
  const raw = signal?.suggested_session_minutes ?? signal?.minutes;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(90, Math.max(10, Math.round(n)));
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorkspaceSession({
  courseId,
  courseTitle,
  materials,
  materialsLoading = false,
  materialsError = null,
  initialChapterId,
  onChapterChange,
}: WorkspaceSessionProps) {
  const openBreathingBreak = useOpenBreathingBreak();
  const workspaceMaterials: Material[] = materials;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filesOpen, setFilesOpen] = useState(true);
  const [savedSplit, setSavedSplit] = useState<Record<string, number> | undefined>(undefined);
  const [activeChapter, setActiveChapter] = useState<string>(initialChapterId ?? "");

  useEffect(() => {
    setFilesOpen(loadFilesOpen());
    setSavedSplit(loadStudySplit());
  }, []);

  const toggleFiles = () => {
    setFilesOpen((open) => {
      const next = !open;
      try {
        window.localStorage.setItem(FILES_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* quota */
      }
      return next;
    });
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [composerMode, setComposerMode] = useState<ToolKind | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [thinking, setThinking] = useState(false);
  /** Backend chat session for the active chapter only. */
  const [sessionId, setSessionId] = useState<string | null>(null);
  /** Global study session id (timer, planner finalize, dashboard readiness). */
  const [studySessionId, setStudySessionId] = useState<string | null>(null);
  /** Energy agent snapshot from the last successful /api/chat response */
  const [energySnapshot, setEnergySnapshot] = useState<EnergySnapshot | null>(null);
  /** Orchestrator routing from the last reply (intent, agents, reason) */
  const [routingSnapshot, setRoutingSnapshot] = useState<RoutingSummary | null>(null);
  /** RAG citations parsed from the assistant reply (shown in sidebar, stripped from bubble) */
  const [sourcesList, setSourcesList] = useState<string[]>([]);
  const chapterChatRef = useRef<Record<string, ChapterChatState>>({});
  const activeChapterRef = useRef(activeChapter);
  activeChapterRef.current = activeChapter;
  const chatStateRef = useRef({
    messages,
    sessionId,
    energySnapshot,
    routingSnapshot,
    sourcesList,
  });
  chatStateRef.current = {
    messages,
    sessionId,
    energySnapshot,
    routingSnapshot,
    sourcesList,
  };
  /** Tracks whether the learner is in an active study session (synced after mount from localStorage). */
  const [studySessionActive, setStudySessionActive] = useState(false);
  /** Counts down while study session is on; at 0 we finalize + show breathing break. */
  const [studyCountdownSeconds, setStudyCountdownSeconds] = useState<number | null>(null);
  const [plannedMinutes, setPlannedMinutes] = useState(FALLBACK_SESSION_MINUTES);
  /** Set once per study block so later chat turns do not restart the clock. */
  const sessionMinutesRef = useRef<number | null>(null);
  const timerExpiryHandled = useRef(false);
  const endingFromTimer = useRef(false);
  /** Planner output from POST /api/session/:id/end — shown until the user sends another chat message. */
  const [sessionEndPlanner, setSessionEndPlanner] = useState<SessionEndPlannerInfo>(null);
  const [endSessionDialogOpen, setEndSessionDialogOpen] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const applySessionMinutes = useCallback((mins: number) => {
    if (sessionMinutesRef.current != null) return;
    sessionMinutesRef.current = mins;
    setPlannedMinutes(mins);
    setStudyCountdownSeconds(mins * 60);
  }, []);

  const loadSessionLength = useCallback(async () => {
    try {
      const readiness = await fetchReadiness(getStoredChatSessionId());
      applySessionMinutes(minutesFromReadinessSignal(readiness.readiness_signal) ?? FALLBACK_SESSION_MINUTES);
    } catch {
      applySessionMinutes(FALLBACK_SESSION_MINUTES);
    }
  }, [applySessionMinutes]);

  useEffect(() => {
    const sid = getStoredChatSessionId();
    setStudySessionId(sid);
    if (sid) {
      setStudySessionActive(true);
      timerExpiryHandled.current = false;
      sessionMinutesRef.current = null;
      void loadSessionLength();
    }
  }, [loadSessionLength]);

  const persistCurrentChapterChat = useCallback(() => {
    const chapterId = activeChapterRef.current;
    if (!chapterId) return;
    const s = chatStateRef.current;
    chapterChatRef.current[chapterId] = {
      messages: s.messages,
      chatSessionId: s.sessionId,
      energySnapshot: s.energySnapshot,
      routingSnapshot: s.routingSnapshot,
      sourcesList: s.sourcesList,
    };
  }, []);

  const applyChapterChatState = useCallback((state: ChapterChatState) => {
    setMessages(state.messages);
    setSessionId(state.chatSessionId);
    setEnergySnapshot(state.energySnapshot);
    setRoutingSnapshot(state.routingSnapshot);
    setSourcesList(state.sourcesList);
    setChatInput("");
  }, []);

  const switchChapter = useCallback(
    (chapterId: string, opts?: { syncUrl?: boolean }) => {
      if (!chapterId || chapterId === activeChapterRef.current) return;
      persistCurrentChapterChat();
      activeChapterRef.current = chapterId;
      setActiveChapter(chapterId);
      applyChapterChatState(chapterChatRef.current[chapterId] ?? emptyChapterChatState());
      if (opts?.syncUrl !== false) {
        onChapterChange(chapterId);
      }
    },
    [applyChapterChatState, onChapterChange, persistCurrentChapterChat],
  );

  const clearLocalStudySessionState = () => {
    chapterChatRef.current = {};
    setStoredChatSessionId(null);
    setStudySessionId(null);
    setSessionId(null);
    setMessages([]);
    setEnergySnapshot(null);
    setRoutingSnapshot(null);
    setSourcesList([]);
    setChatInput("");
    setStudySessionActive(false);
    setStudyCountdownSeconds(null);
    sessionMinutesRef.current = null;
    timerExpiryHandled.current = false;
  };

  /** Ends session on server: runs planner agent, then deletes session; falls back to DELETE if /end fails. */
  const finalizeEndStudySession = useCallback(
    async (opts?: { withBreathingBreak?: boolean }) => {
      const showBreak = opts?.withBreathingBreak !== false;
      const sid = studySessionId;
      if (sid) {
        try {
          const res = await finalizeSession(sid);
          setSessionEndPlanner({
            planning_task: res.planner?.planning_task ?? null,
            status: res.planner?.status,
            skipped: res.planner?.skipped,
            reason: typeof res.planner?.reason === "string" ? res.planner.reason : undefined,
          });
        } catch {
          try {
            await deleteSession(sid);
          } catch {
            /* offline — local state still clears */
          }
          setSessionEndPlanner(null);
        }
      }
      clearLocalStudySessionState();
      if (showBreak) {
        openBreathingBreak?.();
      }
    },
    [studySessionId, openBreathingBreak],
  );

  const onStudySessionSwitch = (checked: boolean) => {
    if (checked) {
      timerExpiryHandled.current = false;
      sessionMinutesRef.current = null;
      setStudySessionActive(true);
      void loadSessionLength();
      return;
    }
    if (!sessionId && messages.length === 0) {
      setStudySessionActive(false);
      setStudyCountdownSeconds(null);
      return;
    }
    setEndSessionDialogOpen(true);
  };

  const confirmEndStudySession = async () => {
    if (endingSession) return;
    setEndingSession(true);
    try {
      await finalizeEndStudySession({ withBreathingBreak: true });
    } finally {
      setEndingSession(false);
      setEndSessionDialogOpen(false);
    }
  };

  const timerExpiredRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    timerExpiredRef.current = async () => {
      if (timerExpiryHandled.current || endingSession || endingFromTimer.current) return;
      timerExpiryHandled.current = true;
      endingFromTimer.current = true;
      try {
        await finalizeEndStudySession({ withBreathingBreak: true });
      } finally {
        endingFromTimer.current = false;
      }
    };
  }, [finalizeEndStudySession, endingSession]);

  useEffect(() => {
    if (!studySessionActive) return;
    const id = window.setInterval(() => {
      setStudyCountdownSeconds((prev) => {
        if (prev === null || prev <= 0) return prev;
        if (prev === 1) {
          queueMicrotask(() => void timerExpiredRef.current());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [studySessionActive]);

  useEffect(() => {
    if (!initialChapterId) return;
    switchChapter(initialChapterId, { syncUrl: false });
  }, [initialChapterId, switchChapter]);

  useEffect(() => {
    setExpanded((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const m of materials) {
        const holdsActive = m.chapters.some((c) => c.id === activeChapter);
        if (next[m.id] === undefined) next[m.id] = holdsActive;
        else if (holdsActive) next[m.id] = true;
      }
      return next;
    });
  }, [materials, activeChapter]);

  const selectChapter = (chapterId: string) => {
    switchChapter(chapterId);
  };

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const flatChapters: FlatChapter[] = flattenChapters(workspaceMaterials);
  const currentChapter = flatChapters.find((c) => c.id === activeChapter);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking, sessionEndPlanner]);

  const coursePayload = currentChapter
    ? {
        lesson_title: currentChapter.name,
        course_name: courseTitle,
        course_id: courseId,
        chapter_group: currentChapter.materialGroup,
        ...(currentChapter.sourceFilename
          ? { allowed_sources: [currentChapter.sourceFilename] }
          : {}),
      }
    : undefined;

  const runChatTurn = async (
    userDisplay: string,
    apiMessage: string,
    opts?: {
      intent?: "revise" | "practice" | "learn_concept" | null;
      tool?: ToolKind | null;
      promptHint?: PromptHint | null;
    },
  ) => {
    const intent = opts?.intent ?? null;
    const tool = opts?.tool ?? null;
    const promptHint = opts?.promptHint ?? null;
    if (!apiMessage.trim()) return;
    setSessionEndPlanner(null);
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text: userDisplay }]);
    setThinking(true);

    try {
      const res = await postChat({
        message: apiMessage,
        session_id: sessionId,
        intent,
        prompt_hint: promptHint,
        course_context: coursePayload,
      });
      setSessionId(res.session_id);
      if (studySessionActive && !studySessionId) {
        setStudySessionId(res.session_id);
        setStoredChatSessionId(res.session_id);
      }
      setStudySessionActive(true);
      const reply =
        res.errors?.length && !res.reply?.trim()
          ? `Error: ${res.errors.join("; ")}`
          : [res.reply, ...(res.warnings?.length ? [`\n\n_${res.warnings.join(" ")}_`] : [])].join(
              "",
            );
      const { cleaned } = stripSessionInsightLines(reply);
      setEnergySnapshot(res.energy ?? null);
      setRoutingSnapshot(formatRoutingSummary(res.routing ?? null));
      const pipelineMinutes = minutesFromReadinessSignal(
        (res.agent_signals?.readiness ?? null) as Record<string, unknown> | null,
      );
      if (pipelineMinutes != null) applySessionMinutes(pipelineMinutes);
      const sourcesFromReply = parseSourcesFromReply(cleaned);
      setSourcesList(sourcesFromReply);
      const withoutSources = stripSourcesBlock(cleaned);

      let bambooText = withoutSources;
      let quizItems: QuizItem[] | undefined;
      let summarySections: SummarySections | null | undefined;
      let variant: ChatMessage["variant"] = "default";

      const explainMd = formatExplainStructuredReply(withoutSources);
      if (explainMd) {
        bambooText = explainMd;
        variant = "explain";
      } else if (tool === "quiz" || tool === "mcq") {
        const items = extractQuizItems(withoutSources, res.reply_raw);
        if (items?.length) {
          quizItems = items;
          bambooText = quizIntroText(withoutSources);
        }
      } else if (tool === "summary") {
        variant = "summary";
        const sections = parseSummarySections(withoutSources);
        if (sections) {
          summarySections = sections;
          bambooText = "";
        }
      } else if (tool === "explain") {
        variant = "explain";
      }

      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "bamboo",
          text: bambooText,
          streaming: false,
          quizItems,
          summarySections: summarySections ?? undefined,
          variant,
          signals: res.agent_signals ?? null,
        },
      ]);
    } catch (e) {
      setEnergySnapshot(null);
      setRoutingSnapshot(null);
      setSourcesList([]);
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "bamboo",
          text: `Could not reach the AI backend (${msg}). Start: \`uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001\` (match VITE_API_PROXY_TARGET in frontend/.env.local).`,
          streaming: false,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const sendChat = async (textArg?: string, promptHint?: PromptHint | null) => {
    const fromComposer = textArg === undefined;
    const text = (textArg ?? chatInput).trim();
    if (!text && !composerMode) return;

    const resolvedMode = composerMode ?? (text ? detectComposerMode(text) : null);
    if (resolvedMode) {
      if (!composerMode) setComposerMode(resolvedMode);
      const mode = composerModeMeta(resolvedMode);
      const displayText = text || mode.emptySend;
      const apiMessage = buildToolApiMessage(resolvedMode, text);
      if (fromComposer) setChatInput("");
      await runChatTurn(displayText, apiMessage, {
        intent: intentForTool(resolvedMode),
        tool: resolvedMode,
        promptHint: promptHint ?? null,
      });
      return;
    }

    if (fromComposer) setChatInput("");
    await runChatTurn(text, text, { intent: null, tool: null, promptHint: promptHint ?? null });
  };

  const selectComposerMode = (kind: ToolKind | null) => {
    setComposerMode(kind);
    composerRef.current?.focus();
  };

  const activeModeMeta = composerMode ? composerModeMeta(composerMode) : null;
  const ActiveModeIcon = activeModeMeta?.icon ?? MessageCircle;

  return (
    <div className="flex flex-col min-h-0 gap-1.5 lg:h-full">
      <header className="flex items-center justify-between gap-3 shrink-0 rounded-xl bg-gradient-to-r from-primary/[0.08] via-[oklch(0.96_0.04_95/0.65)] to-[oklch(0.94_0.05_200/0.45)] px-2.5 py-1.5 border border-primary/10">
        <div className="min-w-0 flex items-center gap-2">
          <Link
            to="/learning"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-card/80 transition"
            aria-label="Back to classroom"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-[15px] font-semibold truncate leading-tight">{courseTitle}</h1>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              {currentChapter ? displayFileName(currentChapter.name) : "Choose a file to begin"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {studySessionActive ? (
            <button
              type="button"
              onClick={() => setEndSessionDialogOpen(true)}
              className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground px-1"
            >
              I'm done
            </button>
          ) : null}
          <div className="flex items-center gap-2 rounded-full bg-card/90 border border-primary/10 px-2.5 py-1 shadow-sm">
            <Switch
              id="workspace-study-session"
              checked={studySessionActive}
              onCheckedChange={onStudySessionSwitch}
              aria-label="Study session active"
            />
            <label
              htmlFor="workspace-study-session"
              className="text-xs text-foreground/80 cursor-pointer select-none"
            >
              Studying
            </label>
            {studySessionActive && studyCountdownSeconds !== null && studyCountdownSeconds > 0 ? (
              <span className="text-xs font-mono tabular-nums text-primary/80" aria-live="polite">
                {formatCountdown(studyCountdownSeconds)}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-1.5 flex-1 min-h-0">
        <aside
          className={`shrink-0 rounded-2xl bg-gradient-to-b from-card/90 to-[oklch(0.96_0.03_155/0.55)] border border-primary/10 shadow-sm transition-[width] duration-200 ${
            filesOpen
              ? "p-2 max-h-[32vh] lg:max-h-none lg:w-[200px] xl:w-[220px] lg:h-full lg:overflow-y-auto"
              : "p-1 lg:w-11 lg:h-full"
          }`}
        >
          <div className={`flex items-center ${filesOpen ? "justify-between px-1 pb-2" : "justify-center"}`}>
            {filesOpen ? (
              <h2 className="text-xs font-medium text-muted-foreground">Files</h2>
            ) : null}
            <button
              type="button"
              onClick={toggleFiles}
              aria-expanded={filesOpen}
              aria-label={filesOpen ? "Hide files" : "Show files"}
              title={filesOpen ? "Hide files" : "Show files"}
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 grid place-items-center transition"
            >
              {filesOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>
          </div>
          {filesOpen && materialsLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          )}
          {filesOpen && materialsError && (
            <p className="text-xs text-muted-foreground px-2 py-2">Some files may still open from the course.</p>
          )}
          {filesOpen && !materialsLoading && !materialsError && workspaceMaterials.length === 0 && (
            <p className="text-sm text-muted-foreground px-2 py-4">No files published yet.</p>
          )}
          {filesOpen && (
          <ul className="space-y-3">
            {workspaceMaterials.map((m) => {
              const open = expanded[m.id];
              return (
                <li key={m.id}>
                  <button
                    onClick={() => toggle(m.id)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    {open ? (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    )}
                    {open ? (
                      <FolderOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    )}
                    <span className="truncate normal-case tracking-normal text-xs">{m.name}</span>
                  </button>
                  {open && (
                    <ul className="mt-0.5 space-y-0.5">
                      {m.chapters.map((c) => {
                        const active = activeChapter === c.id;
                        return (
                          <li key={c.id}>
                            <button
                              onClick={() => selectChapter(c.id)}
                              className={`w-full text-left rounded-xl px-2.5 py-2 flex items-center gap-2 transition ${
                                active
                                  ? "bg-primary/10 text-foreground"
                                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                              }`}
                            >
                              <FileText
                                className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : ""}`}
                              />
                              <span className="text-[13px] leading-snug line-clamp-2">
                                {displayFileName(c.name)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          )}
        </aside>

        <ResizablePanelGroup
          key={savedSplit ? "restored" : "default"}
          id="study-split"
          orientation="horizontal"
          className="flex-1 min-w-0 min-h-[min(70vh,32rem)] lg:h-full lg:min-h-0"
          defaultLayout={savedSplit}
          onLayoutChanged={saveStudySplit}
        >
          <ResizablePanel id="study-reader" defaultSize="40%" minSize="24%" className="min-h-0 pr-0.5">
        <section className="h-full min-h-0 rounded-2xl bg-gradient-to-b from-card via-card to-[oklch(0.97_0.02_155/0.7)] border border-primary/10 shadow-sm overflow-hidden flex flex-col">
          {!currentChapter && (
            <div className="flex-1 grid place-items-center p-8">
              <div className="text-center text-sm text-muted-foreground max-w-xs leading-relaxed">
                <BookOpen className="h-8 w-8 mx-auto mb-3 text-primary/30" />
                <p>Open a file on the left when you're ready.</p>
              </div>
            </div>
          )}

          {currentChapter && (
            <div className="flex-1 overflow-y-auto min-w-0 p-3 lg:p-4">
              {currentChapter.kind === "rich" && currentChapter.blocks && (
                <div className="max-w-2xl mx-auto py-4">
                  <RichContent blocks={currentChapter.blocks} />
                </div>
              )}
              {currentChapter.kind === "pdf" && currentChapter.pdfUrl && (
                <PdfViewer url={currentChapter.pdfUrl} />
              )}
              {currentChapter.kind === "pptx" && currentChapter.pptxUrl && (
                <PptxViewer url={currentChapter.pptxUrl} downloadName={currentChapter.name} />
              )}
              {currentChapter.kind === "download" && currentChapter.sourceFilename && (
                <div className="h-full grid place-items-center p-8">
                  <div className="max-w-sm text-center space-y-4">
                    <Download className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This file opens better in its own app. Download it, then come back if you want to talk it through.
                    </p>
                    <a
                      href={corpusFileUrl(currentChapter.sourceFilename)}
                      download={currentChapter.sourceFilename}
                      className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm hover:opacity-90"
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}
              {currentChapter.kind === "mixed" && (
                <div className="space-y-8">
                  {currentChapter.blocks && <RichContent blocks={currentChapter.blocks} />}
                  {currentChapter.pdfUrl && <PdfViewer url={currentChapter.pdfUrl} />}
                </div>
              )}
            </div>
          )}
        </section>
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className="mx-0 w-3 bg-transparent hover:bg-primary/10 data-[resize-handle-active]:bg-primary/15"
          />

          <ResizablePanel id="study-chat" defaultSize="60%" minSize="42%" maxSize="78%" className="min-h-0 pl-0.5">
        <aside className="h-full min-h-0 flex flex-col">
          <div className="flex flex-col flex-1 min-h-0 rounded-2xl bg-gradient-to-b from-[oklch(0.97_0.03_155)] via-card to-[oklch(0.96_0.04_95/0.9)] border border-primary/15 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-3.5 py-2 shrink-0 border-b border-primary/8 bg-gradient-to-r from-primary/[0.07] to-transparent">
              <Panda mood={thinking ? "reading" : "waving"} size={32} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-semibold leading-tight flex items-center gap-1.5">
                  Bamboo
                  <Sparkles className="h-3 w-3 text-primary/70" />
                </div>
                <p className="text-[11px] text-muted-foreground truncate leading-tight">
                  {currentChapter
                    ? `Grounded in ${displayFileName(currentChapter.name)}`
                    : "Here if you want to talk"}
                </p>
              </div>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
              {messages.length === 0 && !thinking && (
                <div className="pt-1 space-y-3">
                  <p className="text-sm leading-6 text-foreground/80">
                    I'm reading this with you. Ask in your own words, or start wherever feels easy.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {CONVERSATION_STARTERS.map((s) => (
                      <button
                        key={s.hint}
                        type="button"
                        onClick={() => void sendChat(s.label, s.hint)}
                        className="block w-full text-left text-sm leading-relaxed text-foreground/80 rounded-xl px-3 py-2 bg-card/70 border border-primary/10 hover:border-primary/25 hover:bg-primary/8 transition"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id}>
                  <ChatBubble
                    calm
                    role={m.role}
                    text={m.text}
                    streaming={m.streaming}
                    quizItems={m.quizItems}
                    summarySections={m.summarySections}
                    variant={m.variant ?? "default"}
                  />
                  {m.role === "bamboo" && m.signals ? <AgentSignalsStrip signals={m.signals} /> : null}
                </div>
              ))}
              {thinking && <TypingDots />}
              {sessionEndPlanner ? (
                <StudyNotifications sessionEndPlanner={sessionEndPlanner} />
              ) : null}
            </div>

            <div className="px-2.5 pb-2.5 pt-1 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendChat();
                }}
                className="flex items-center gap-1.5 rounded-2xl bg-card/95 border border-primary/15 pl-1.5 pr-1.5 py-1 shadow-sm focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/10 transition"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={thinking}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-40 ${
                        activeModeMeta
                          ? `${activeModeMeta.idleClass} border-transparent`
                          : "border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <ActiveModeIcon className="h-3 w-3" />
                      <span>{activeModeMeta?.chip ?? "Ask"}</span>
                      <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-52 rounded-xl p-1.5">
                    <DropdownMenuItem
                      onClick={() => selectComposerMode(null)}
                      className="rounded-lg gap-2.5 cursor-pointer"
                    >
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">Ask</span>
                      {!composerMode ? <Check className="h-4 w-4 text-primary" /> : null}
                    </DropdownMenuItem>
                    {COMPOSER_MODES.map((mode) => {
                      const Icon = mode.icon;
                      const active = composerMode === mode.kind;
                      return (
                        <DropdownMenuItem
                          key={mode.kind}
                          onClick={() => selectComposerMode(mode.kind)}
                          className="rounded-lg gap-2.5 cursor-pointer"
                        >
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${mode.idleClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="flex-1">{mode.label}</span>
                          {active ? <Check className="h-4 w-4 text-primary" /> : null}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <textarea
                  ref={composerRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendChat();
                    }
                  }}
                  rows={1}
                  placeholder={activeModeMeta?.placeholder ?? "Ask about this page…"}
                  className="flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 focus:outline-none placeholder:text-muted-foreground/60 max-h-24 overflow-y-auto"
                />
                <button
                  type="submit"
                  disabled={thinking || (!chatInput.trim() && !composerMode)}
                  aria-label="Send"
                  className="shrink-0 h-8 w-8 rounded-full gradient-primary grid place-items-center text-primary-foreground hover:opacity-90 transition disabled:opacity-40 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </aside>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <AlertDialog open={endSessionDialogOpen} onOpenChange={setEndSessionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End study session?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears all chapter chats, runs the planner, deletes the AI session on the server,
              and opens a short breathing break. Turn the study session on again to restart the
              timer from {plannedMinutes} minutes, the length the readiness agent suggested for this block.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endingSession}>Keep studying</AlertDialogCancel>
            <AlertDialogAction
              disabled={endingSession}
              onClick={(e) => {
                e.preventDefault();
                void confirmEndStudySession();
              }}
            >
              {endingSession ? "Running planner…" : "End session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
