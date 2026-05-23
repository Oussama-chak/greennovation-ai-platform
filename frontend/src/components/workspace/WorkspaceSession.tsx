import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Sparkles,
  ListChecks,
  MessageCircleQuestion,
  Send,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  MessagesSquare,
  Download,
  Loader2,
  CircleStop,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
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
  postChat,
  type EnergySnapshot,
  type PromptHint,
} from "@/lib/api";
import { getStoredChatSessionId, setStoredChatSessionId } from "@/lib/chatSession";
import { stripSessionInsightLines } from "@/lib/parseSessionInsights";
import {
  extractQuizItems,
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
import { Switch } from "@/components/ui/switch";
import { useOpenBreathingBreak } from "@/context/BreathingBreakContext";

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

type ToolKind = "summary" | "quiz" | "explain";

type ChatMessage = {
  id: string;
  role: "user" | "bamboo";
  text: string;
  streaming?: boolean;
  quizItems?: QuizItem[];
  summarySections?: SummarySections | null;
  variant?: "default" | "summary" | "explain";
};

/** Per-chapter chat thread inside a course study session. */
type ChapterChatState = {
  messages: ChatMessage[];
  chatSessionId: string | null;
  energySnapshot: EnergySnapshot | null;
  routingSnapshot: RoutingSummary | null;
  sourcesList: string[];
  draftSummary: string;
  draftQuiz: string;
  draftExplain: string;
};

function emptyChapterChatState(): ChapterChatState {
  return {
    messages: [],
    chatSessionId: null,
    energySnapshot: null,
    routingSnapshot: null,
    sourcesList: [],
    draftSummary: "",
    draftQuiz: "",
    draftExplain: "",
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
  return q
    ? `Explain in clear, student-friendly language (examples welcome): ${q}`
    : `Explain the main concepts of the current lesson in simple terms. Use only the course materials.`;
}

function intentForTool(tab: ToolKind): "revise" | "practice" | "learn_concept" {
  if (tab === "summary") return "revise";
  if (tab === "quiz") return "practice";
  return "learn_concept";
}

const CHAT_SUGGESTION_CHIPS: { label: string; hint: PromptHint }[] = [
  { label: "Explain this concept simply", hint: "explain_simple" },
  { label: "Give me an example", hint: "give_example" },
  { label: "Summarize this page", hint: "summarize_page" },
];

function chapterKindLabel(kind: string): string {
  if (kind === "download") return "File";
  if (kind === "pdf") return "PDF";
  if (kind === "pptx") return "PPTX";
  if (kind === "mixed") return "Mixed";
  if (kind === "rich") return "Text";
  return kind;
}

/** Study block length before auto end + breathing break. */
const WORKSPACE_STUDY_COUNTDOWN_SECONDS = 2 * 60;

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorkspaceSession({
  courseId,
  courseTitle,
  classLabel,
  materials,
  materialsLoading = false,
  materialsError = null,
  initialChapterId,
  onChapterChange,
}: WorkspaceSessionProps) {
  const openBreathingBreak = useOpenBreathingBreak();
  const [tab, setTab] = useState<ToolKind>("summary");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftQuiz, setDraftQuiz] = useState("");
  const [draftExplain, setDraftExplain] = useState("");
  const [view, setView] = useState<"reader" | "chat">("reader");
  const workspaceMaterials: Material[] = materials;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeChapter, setActiveChapter] = useState<string>(initialChapterId ?? "");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
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
    draftSummary,
    draftQuiz,
    draftExplain,
  });
  chatStateRef.current = {
    messages,
    sessionId,
    energySnapshot,
    routingSnapshot,
    sourcesList,
    draftSummary,
    draftQuiz,
    draftExplain,
  };
  /** Tracks whether the learner is in an active study session (synced after mount from localStorage). */
  const [studySessionActive, setStudySessionActive] = useState(false);
  /** Counts down while study session is on; at 0 we finalize + show breathing break. */
  const [studyCountdownSeconds, setStudyCountdownSeconds] = useState<number | null>(null);
  const timerExpiryHandled = useRef(false);
  const endingFromTimer = useRef(false);
  /** Planner output from POST /api/session/:id/end — shown until the user sends another chat message. */
  const [sessionEndPlanner, setSessionEndPlanner] = useState<SessionEndPlannerInfo>(null);
  const [endSessionDialogOpen, setEndSessionDialogOpen] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sid = getStoredChatSessionId();
    setStudySessionId(sid);
    if (sid) {
      setStudySessionActive(true);
      timerExpiryHandled.current = false;
      setStudyCountdownSeconds(WORKSPACE_STUDY_COUNTDOWN_SECONDS);
    }
  }, []);

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
      draftSummary: s.draftSummary,
      draftQuiz: s.draftQuiz,
      draftExplain: s.draftExplain,
    };
  }, []);

  const applyChapterChatState = useCallback((state: ChapterChatState) => {
    setMessages(state.messages);
    setSessionId(state.chatSessionId);
    setEnergySnapshot(state.energySnapshot);
    setRoutingSnapshot(state.routingSnapshot);
    setSourcesList(state.sourcesList);
    setDraftSummary(state.draftSummary);
    setDraftQuiz(state.draftQuiz);
    setDraftExplain(state.draftExplain);
    setChatInput("");
  }, []);

  const switchChapter = useCallback(
    (chapterId: string, opts?: { syncUrl?: boolean }) => {
      if (!chapterId || chapterId === activeChapterRef.current) return;
      persistCurrentChapterChat();
      activeChapterRef.current = chapterId;
      setActiveChapter(chapterId);
      applyChapterChatState(chapterChatRef.current[chapterId] ?? emptyChapterChatState());
      setView("reader");
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
    setDraftSummary("");
    setDraftQuiz("");
    setDraftExplain("");
    setChatInput("");
    setStudySessionActive(false);
    setStudyCountdownSeconds(null);
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
      setStudySessionActive(true);
      setStudyCountdownSeconds(WORKSPACE_STUDY_COUNTDOWN_SECONDS);
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
    const next: Record<string, boolean> = {};
    for (const m of materials) next[m.id] = true;
    setExpanded(next);
  }, [materials]);

  const selectChapter = (chapterId: string) => {
    switchChapter(chapterId);
  };

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const flatChapters: FlatChapter[] = flattenChapters(workspaceMaterials);
  const currentChapter = flatChapters.find((c) => c.id === activeChapter);

  useEffect(() => {
    if (view === "chat") {
      chatScrollRef.current?.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, thinking, view]);

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
    setView("chat");
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
      const sourcesFromReply = parseSourcesFromReply(cleaned);
      setSourcesList(sourcesFromReply);
      const withoutSources = stripSourcesBlock(cleaned);

      let bambooText = withoutSources;
      let quizItems: QuizItem[] | undefined;
      let summarySections: SummarySections | null | undefined;
      let variant: ChatMessage["variant"] = "default";

      if (tool === "quiz") {
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
    const text = (textArg ?? chatInput).trim();
    if (!text) return;
    setChatInput("");
    await runChatTurn(text, text, { intent: null, tool: null, promptHint: promptHint ?? null });
  };

  const submitTool = async (kind: ToolKind) => {
    const draft = kind === "summary" ? draftSummary : kind === "quiz" ? draftQuiz : draftExplain;
    const apiMessage = buildToolApiMessage(kind, draft);
    const display =
      draft.trim() ||
      (kind === "summary"
        ? "Summarize this lesson"
        : kind === "quiz"
          ? "Quiz me on this lesson"
          : "Explain this lesson");
    await runChatTurn(display, apiMessage, { intent: intentForTool(kind), tool: kind });
    if (kind === "summary") setDraftSummary("");
    else if (kind === "quiz") setDraftQuiz("");
    else setDraftExplain("");
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col min-h-0 lg:h-[calc(100dvh-9.5rem)] lg:max-h-[calc(100dvh-9.5rem)] lg:overflow-hidden">
      <div className="flex flex-wrap items-start justify-between mb-3 gap-4 shrink-0">
        <div className="min-w-0 flex-1">
          <Link
            to="/learning"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            My classroom
          </Link>
          <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Study session · {classLabel}
          </div>
          <h1 className="font-display text-lg lg:text-xl font-bold truncate leading-tight">
            {courseTitle}
          </h1>
          {flatChapters.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label
                htmlFor="chapter-switcher"
                className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold"
              >
                Active chapter
              </label>
              <select
                id="chapter-switcher"
                value={activeChapter}
                onChange={(e) => selectChapter(e.target.value)}
                className="h-9 max-w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold"
              >
                {flatChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.materialGroup} · {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex p-1 bg-muted rounded-2xl">
            <button
              onClick={() => setView("reader")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                view === "reader"
                  ? "bg-card shadow-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Reader
            </button>
            <button
              onClick={() => setView("chat")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                view === "chat"
                  ? "bg-card shadow-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessagesSquare className="h-3.5 w-3.5" /> Chat
              {messages.length > 0 && (
                <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                  {messages.length}
                </span>
              )}
            </button>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-2.5 py-1.5 shadow-sm">
              <CircleStop
                className={`h-3.5 w-3.5 shrink-0 ${studySessionActive ? "text-primary" : "text-muted-foreground"}`}
                aria-hidden
              />
              <Switch
                id="workspace-study-session"
                checked={studySessionActive}
                onCheckedChange={onStudySessionSwitch}
                aria-label="Study session active"
              />
              <label
                htmlFor="workspace-study-session"
                className="text-[11px] font-semibold text-foreground cursor-pointer select-none whitespace-nowrap"
              >
                Study session
              </label>
              {studySessionActive && studyCountdownSeconds !== null && studyCountdownSeconds > 0 ? (
                <span
                  className="text-[11px] font-mono tabular-nums font-semibold text-primary shrink-0 min-w-[3.25rem] text-right"
                  aria-live="polite"
                >
                  {formatCountdown(studyCountdownSeconds)}
                </span>
              ) : null}
            </div>
            {studySessionActive && studyCountdownSeconds !== null && studyCountdownSeconds > 0 ? (
              <p className="text-[9px] text-muted-foreground max-w-[14rem] text-right leading-tight">
                Timer resets when you turn the session on again. At zero (or if you end early), your
                session closes and the breathing break opens.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 lg:flex-1 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)]">
        {/* Materials with expandable chapters */}
        <aside className="col-span-12 lg:col-span-3 rounded-3xl bg-card border border-border p-4 shadow-card lg:min-h-0 lg:max-h-full lg:overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Materials</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              By chapter
            </span>
          </div>
          {materialsLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading course materials…
            </div>
          )}
          {materialsError && (
            <p className="text-[11px] text-muted-foreground mb-3 rounded-lg bg-muted/50 px-2 py-1.5">
              Could not load documents ({materialsError}). Some PDFs may still open from course
              metadata.
            </p>
          )}
          {!materialsLoading && !materialsError && workspaceMaterials.length === 0 && (
            <p className="text-sm text-muted-foreground mb-3 rounded-xl border border-dashed border-border px-3 py-4">
              No published materials for this course yet. Your professor can add chapters from the
              Teacher Office.
            </p>
          )}
          <ul className="space-y-1">
            {workspaceMaterials.map((m) => {
              const open = expanded[m.id];
              return (
                <li key={m.id}>
                  <button
                    onClick={() => toggle(m.id)}
                    className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-muted transition text-left"
                  >
                    {open ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    {open ? (
                      <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Folder className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className="text-sm font-semibold truncate">{m.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-medium">
                      {m.chapters.length}
                    </span>
                  </button>
                  {open && (
                    <ul className="ml-4 mt-1 mb-2 space-y-0.5 border-l border-border pl-2">
                      {m.chapters.map((c) => {
                        const active = activeChapter === c.id;
                        return (
                          <li key={c.id}>
                            <button
                              onClick={() => selectChapter(c.id)}
                              className={`w-full text-left rounded-lg px-2.5 py-2 flex items-start gap-2 transition ${
                                active
                                  ? "bg-primary/10 border border-primary/30"
                                  : "hover:bg-muted border border-transparent"
                              }`}
                            >
                              <FileText
                                className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                                  active ? "text-primary" : "text-muted-foreground"
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">{c.name}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                  {c.pages > 0 ? <span>{c.pages} pages</span> : <span>·</span>}
                                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold">
                                    {chapterKindLabel(c.kind)}
                                  </span>
                                </div>
                              </div>
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
        </aside>

        {/* Reader / Chat panel + aligned sticky chat bar */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-2 min-h-[min(70vh,28rem)] lg:h-full lg:min-h-0">
          <section className="rounded-3xl bg-card border border-border shadow-card overflow-hidden flex flex-col flex-1 min-h-0">
            {view === "reader" && !currentChapter && (
              <div className="p-6 lg:p-8 flex-1 overflow-y-auto grid place-items-center min-h-[280px]">
                <div className="text-center text-sm text-muted-foreground max-w-sm">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-primary/40" />
                  <p>Select a chapter from Materials, or use the chapter switcher above.</p>
                </div>
              </div>
            )}

            {view === "reader" && currentChapter && (
              <div className="p-6 lg:p-8 flex-1 overflow-y-auto min-w-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {currentChapter.pages > 0 ? `${currentChapter.pages} pages · ` : ""}
                    {currentChapter.kind === "pdf"
                      ? "PDF document"
                      : currentChapter.kind === "pptx"
                        ? "PowerPoint"
                        : currentChapter.kind === "mixed"
                          ? "Notes + PDF"
                          : currentChapter.kind === "download"
                            ? "Download to open locally"
                            : "Study notes"}
                  </span>
                </div>

                {currentChapter.kind === "rich" && currentChapter.blocks && (
                  <RichContent blocks={currentChapter.blocks} />
                )}
                {currentChapter.kind === "pdf" && currentChapter.pdfUrl && (
                  <PdfViewer url={currentChapter.pdfUrl} />
                )}
                {currentChapter.kind === "pptx" && currentChapter.pptxUrl && (
                  <PptxViewer url={currentChapter.pptxUrl} downloadName={currentChapter.name} />
                )}
                {currentChapter.kind === "download" && currentChapter.sourceFilename && (
                  <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center space-y-4">
                    <Download className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      This file type is not shown in the browser. Download it to open with the right
                      app (e.g. PowerPoint).
                    </p>
                    <a
                      href={corpusFileUrl(currentChapter.sourceFilename)}
                      download={currentChapter.sourceFilename}
                      className="inline-flex items-center justify-center rounded-xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-glow hover:opacity-95"
                    >
                      Download {currentChapter.name}
                    </a>
                  </div>
                )}
                {currentChapter.kind === "mixed" && (
                  <div className="space-y-6">
                    {currentChapter.blocks && <RichContent blocks={currentChapter.blocks} />}
                    {currentChapter.pdfUrl && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
                          Source paper
                        </div>
                        <PdfViewer url={currentChapter.pdfUrl} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {view === "chat" && (
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-primary">
                      Chat · grounded in {currentChapter?.name ?? "your material"}
                    </div>
                    <div className="font-display text-lg font-bold">Discuss this chapter</div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Each chapter has its own chat thread during this study session.
                    </p>
                  </div>
                  {studySessionActive && (
                    <button
                      type="button"
                      onClick={() => setEndSessionDialogOpen(true)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      End study session
                    </button>
                  )}
                </div>
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
                  {messages.length === 0 && !thinking && (
                    <div className="grid place-items-center h-full text-center text-sm text-muted-foreground py-12">
                      <div>
                        <MessagesSquare className="h-8 w-8 mx-auto mb-2 text-primary/50" />
                        Ask anything about this chapter to get started.
                      </div>
                    </div>
                  )}
                  {messages.map((m) => (
                    <ChatBubble
                      key={m.id}
                      role={m.role}
                      text={m.text}
                      streaming={m.streaming}
                      quizItems={m.quizItems}
                      summarySections={m.summarySections}
                      variant={m.variant ?? "default"}
                    />
                  ))}
                  {thinking && <TypingDots />}
                </div>
              </div>
            )}
          </section>

          {/* Chat bar — aligned under reader, compact */}
          <div className="z-30">
            <div className="rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-glow p-2">
              {view === "chat" && (
                <div className="flex gap-2 mb-2 overflow-x-auto px-1">
                  {CHAT_SUGGESTION_CHIPS.map((s) => (
                    <button
                      key={s.hint}
                      type="button"
                      onClick={() => void sendChat(s.label, s.hint)}
                      className="shrink-0 text-[11px] font-medium rounded-full border border-border bg-muted/40 px-2.5 py-1 hover:border-primary/50 hover:bg-primary/5 transition"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChat();
                }}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition"
              >
                <MessagesSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Ask Bamboo about ${currentChapter?.name ?? "this material"}…`}
                  className="flex-1 bg-transparent px-1 py-1 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  aria-label="Send"
                  className="h-7 w-7 rounded-lg gradient-primary grid place-items-center text-primary-foreground hover:scale-105 transition disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* AI tools + notifications */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0 lg:h-full lg:min-h-0 lg:max-h-full">
          <div className="rounded-3xl bg-card border border-border shadow-card overflow-hidden shrink-0">
            <div className="flex p-1 bg-muted/60">
              {(
                [
                  { id: "summary", label: "Summary", icon: Sparkles },
                  { id: "quiz", label: "Quiz", icon: ListChecks },
                  { id: "explain", label: "Explain", icon: MessageCircleQuestion },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                    tab === t.id
                      ? "bg-card shadow-card text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-3">
              {tab === "summary" && (
                <>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Describe what to summarize (topic, section, or page). Leave blank to summarize
                    the whole open lesson.
                  </p>
                  <textarea
                    value={draftSummary}
                    onChange={(e) => setDraftSummary(e.target.value)}
                    placeholder="e.g. Summarize the section on inheritance and polymorphism…"
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 resize-y min-h-[88px]"
                  />
                </>
              )}
              {tab === "quiz" && (
                <>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Say what the quiz should cover. Leave blank for a general quiz on the current
                    lesson. Answers appear as expandable cards below each question.
                  </p>
                  <textarea
                    value={draftQuiz}
                    onChange={(e) => setDraftQuiz(e.target.value)}
                    placeholder="e.g. Quiz me on loops and functions from this chapter…"
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 resize-y min-h-[88px]"
                  />
                </>
              )}
              {tab === "explain" && (
                <>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Ask for a simpler explanation of a concept or passage. Leave blank for a gentle
                    overview of the open lesson.
                  </p>
                  <textarea
                    value={draftExplain}
                    onChange={(e) => setDraftExplain(e.target.value)}
                    placeholder="e.g. Explain recursion like I’m new to programming…"
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 resize-y min-h-[88px]"
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => void submitTool(tab)}
                disabled={thinking}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold py-2.5 px-3 shadow-glow hover:opacity-95 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {thinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {tab === "summary"
                  ? "Generate summary"
                  : tab === "quiz"
                    ? "Generate quiz"
                    : "Generate explanation"}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin] pr-0.5 pb-2">
            <StudyNotifications
              energySnapshot={energySnapshot}
              routingSummary={routingSnapshot}
              sources={sourcesList}
              sessionEndPlanner={sessionEndPlanner}
            />
          </div>
        </aside>
      </div>

      <AlertDialog open={endSessionDialogOpen} onOpenChange={setEndSessionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End study session?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears all chapter chats, runs the planner, deletes the AI session on the server,
              and opens a short breathing break. Turn the study session on again to restart the
              timer from {Math.floor(WORKSPACE_STUDY_COUNTDOWN_SECONDS / 60)} minutes.
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
