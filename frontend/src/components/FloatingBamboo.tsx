import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, X, Sparkles } from "lucide-react";
import { Panda } from "@/components/PandaCompanion";
import type { QuizItem, SummarySections } from "@/lib/parseToolReplies";

type Message = { id: string; role: "user" | "bamboo"; text: string; streaming?: boolean };

const SUGGESTIONS = [
  "What should I study today?",
  "How's my focus this week?",
  "Tell me a fun eco fact",
];

const REPLIES = [
  "Great question! Based on your last session, I'd start with eigenvectors — you were on a roll. 🌱",
  "You've been focused for 3.5h this week. Beautiful consistency — the forest is loving it.",
  "Bamboo grows up to 91 cm in a single day. Some species are technically the fastest plants on Earth! 🌿",
  "Try a 25-minute focus block, then I'll quiz you. Sound good?",
];

function pickReply(text: string) {
  const t = text.toLowerCase();
  if (t.includes("study") || t.includes("today")) return REPLIES[0];
  if (t.includes("focus") || t.includes("week")) return REPLIES[1];
  if (t.includes("eco") || t.includes("fact") || t.includes("fun")) return REPLIES[2];
  return REPLIES[3];
}

export function FloatingBamboo() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bamboo",
      text: "Hi! I'm Bamboo 🐼 your study companion. Ask me anything — I'll keep it short and useful.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [bamboomood, setBamboomood] = useState<"waving" | "reading">("waving");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    setBamboomood("reading");

    setTimeout(() => {
      const reply = pickReply(text);
      const id = crypto.randomUUID();
      setThinking(false);
      setMessages((m) => [...m, { id, role: "bamboo", text: "", streaming: true }]);

      // word-by-word streaming
      const words = reply.split(" ");
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setMessages((m) =>
          m.map((msg) =>
            msg.id === id
              ? { ...msg, text: words.slice(0, i).join(" "), streaming: i < words.length }
              : msg,
          ),
        );
        if (i >= words.length) {
          clearInterval(interval);
          setBamboomood("waving");
        }
      }, 55);
    }, 900);
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Bamboo assistant"
        className={`fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full gradient-primary shadow-glow grid place-items-center transition-all duration-300 hover:scale-110 active:scale-95 ${
          open ? "opacity-0 scale-75 pointer-events-none" : "opacity-100 scale-100"
        }`}
        style={{ animation: "bamboo-breathe 3.5s ease-in-out infinite" }}
      >
        <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-40" />
        <div className="relative h-12 w-12 rounded-full bg-card/40 grid place-items-center overflow-hidden">
          <Panda mood="reading" size={44} />
        </div>
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-warning grid place-items-center ring-2 ring-background">
          <Sparkles className="h-2.5 w-2.5 text-warning-foreground" />
        </span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4 animate-[fade-in-up_0.25s_ease-out]"
          onClick={() => setOpen(false)}
        >
          {/* glass backdrop */}
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-md" />

          <div
            className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-3xl bg-card border border-border shadow-glow overflow-hidden"
            style={{ animation: "scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative gradient-forest p-5 border-b border-border">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-card/60 grid place-items-center shrink-0">
                  <Panda mood={bamboomood} size={56} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-primary">
                    Bamboo · Online
                  </div>
                  <div className="font-display text-xl font-bold mt-0.5">
                    Hey there! Need a hand?
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    I learn from your sessions and grow with you 🌱
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 hover:bg-card/60 transition shrink-0"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[240px]">
              {messages.map((m) => (
                <ChatBubble key={m.id} role={m.role} text={m.text} streaming={m.streaming} />
              ))}
              {thinking && <TypingDots />}
            </div>

            {/* Suggestions */}
            <div className="px-4 pt-2 pb-1 flex gap-2 flex-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs font-medium rounded-full border border-border bg-muted/40 px-3 py-1.5 hover:border-primary/50 hover:bg-primary/5 transition"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2 focus-within:border-ring transition"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-transparent px-2 py-1.5 text-sm focus:outline-none"
                  placeholder="Ask Bamboo..."
                  autoFocus
                />
                <button
                  type="submit"
                  className="h-9 w-9 rounded-xl gradient-primary grid place-items-center text-primary-foreground hover:scale-105 transition disabled:opacity-50"
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bamboo-breathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.04); }
        }
        @keyframes scale-in {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

/** Compact, managed Markdown for assistant bubbles (GFM + tighter study layout). */
const chatMarkdownComponents = {
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="text-[15px] font-bold mt-3 mb-1 first:mt-0 text-foreground tracking-tight" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-[13.5px] font-bold mt-2.5 mb-1 first:mt-0 text-foreground tracking-tight" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-[13px] font-semibold mt-2 mb-0.5 first:mt-0 text-foreground/95" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mb-1.5 last:mb-0 text-foreground/95 leading-6" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="my-1.5 ml-0.5 list-disc list-outside space-y-0.5 pl-4 marker:text-primary/70" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="my-1.5 ml-0.5 list-decimal list-outside space-y-0.5 pl-4 marker:font-semibold marker:text-primary/80" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="leading-6 pl-0.5 [&>p]:mb-0.5 [&>p]:leading-6" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props: ComponentPropsWithoutRef<"em">) => <em className="italic text-foreground/90" {...props} />,
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a className="text-primary font-medium underline underline-offset-2 decoration-primary/50 hover:decoration-primary" {...props} />
  ),
  code: ({ className, children, ...rest }: { className?: string; children?: React.ReactNode }) => {
    const text = String(children ?? "");
    const isBlock = Boolean(className?.includes("language-") || text.includes("\n"));
    if (!isBlock) {
      return (
        <code
          className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[0.82em] text-foreground"
          {...rest}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`block w-full font-mono text-[12px] leading-5 text-inherit ${className ?? ""}`} {...rest}>
        {children}
      </code>
    );
  },
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="my-1.5 overflow-x-auto rounded-xl bg-[oklch(0.22_0.02_160)] text-[oklch(0.93_0.02_155)] p-2.5 shadow-sm [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit"
      {...props}
    />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-2 w-full overflow-x-auto rounded-xl border border-primary/15 bg-card/80">
      <table className="w-full min-w-[16rem] border-collapse text-[12.5px] leading-5" {...props} />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-primary/10 text-foreground" {...props} />
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th className="px-2.5 py-1.5 text-left font-semibold border-b border-primary/15 whitespace-nowrap" {...props} />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="px-2.5 py-1.5 align-top border-b border-border/50 last:border-b-0" {...props} />
  ),
  tr: (props: ComponentPropsWithoutRef<"tr">) => (
    <tr className="even:bg-muted/35" {...props} />
  ),
  hr: () => <hr className="my-2 border-border/70" />,
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="my-1.5 border-l-2 border-primary/45 pl-2.5 text-muted-foreground text-[13px] leading-6 not-italic"
      {...props}
    />
  ),
};

function QuizQuestionCard({
  item,
  index,
  calm,
}: {
  item: QuizItem;
  index: number;
  calm: boolean;
}) {
  const options = (item.options ?? []).map((option) => option.trim()).filter(Boolean).slice(0, 3);
  const [picked, setPicked] = useState<number | null>(null);
  const correctIndex = options.findIndex((option) => option.toLowerCase() === item.answer.trim().toLowerCase());
  const isMcq = options.length >= 2;

  return (
    <li>
      <div className={calm ? "rounded-xl bg-background/70 px-3.5 py-3" : "rounded-xl border border-border bg-background/90 p-3 shadow-sm"}>
        <div className="flex items-center justify-between gap-2">
          <span className={calm ? "text-xs font-medium text-primary" : "text-[10px] font-bold uppercase tracking-wider text-primary"}>
            Question {index + 1}
          </span>
          {item.difficulty ? (
            <span className="text-[10px] font-medium text-muted-foreground capitalize">{item.difficulty}</span>
          ) : null}
        </div>
        <p className="mt-1.5 font-medium text-foreground">{item.question}</p>
        {isMcq ? (
          <div className="mt-3 space-y-2">
            {options.map((option, optionIndex) => {
              const revealed = picked !== null;
              const isCorrect = optionIndex === correctIndex;
              const isChosen = picked === optionIndex;
              const tone = !revealed
                ? "border-border bg-background hover:border-primary/40"
                : isCorrect
                  ? "border-primary bg-primary/10"
                  : isChosen
                    ? "border-destructive/50 bg-destructive/10"
                    : "border-border bg-background opacity-70";
              return (
                <button
                  key={option}
                  type="button"
                  disabled={revealed}
                  onClick={() => setPicked(optionIndex)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition disabled:cursor-default ${tone}`}
                >
                  <span className="font-semibold text-primary">{String.fromCharCode(65 + optionIndex)}</span>
                  <span>{option}</span>
                </button>
              );
            })}
            {picked !== null ? (
              <p className="text-xs text-muted-foreground">
                {picked === correctIndex
                  ? "Correct."
                  : `The answer is ${correctIndex >= 0 ? options[correctIndex] : item.answer}.`}
              </p>
            ) : null}
          </div>
        ) : (
          <details className="mt-2 group">
            <summary className="cursor-pointer text-xs font-semibold text-primary list-none [&::-webkit-details-marker]:hidden">
              Show answer
            </summary>
            <div className="mt-2 text-sm text-muted-foreground leading-relaxed border-t border-border/60 pt-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
                {item.answer}
              </ReactMarkdown>
            </div>
          </details>
        )}
      </div>
    </li>
  );
}

export function ChatBubble({
  role,
  text,
  streaming,
  quizItems,
  summarySections,
  variant = "default",
  calm = false,
}: {
  role: "user" | "bamboo";
  text: string;
  streaming?: boolean;
  quizItems?: QuizItem[] | null;
  summarySections?: SummarySections | null;
  variant?: "default" | "summary" | "explain";
  /** Softer study-page thread: no boxed chrome, room to breathe. */
  calm?: boolean;
}) {
  const isUser = role === "user";
  const hasQuiz = !isUser && !streaming && quizItems && quizItems.length > 0;
  const hasSummaryLayout = !isUser && !streaming && summarySections && summarySections.lead.trim().length > 0;
  const summaryFallback =
    !isUser &&
    !streaming &&
    variant === "summary" &&
    !hasSummaryLayout &&
    text.trim().length > 0;
  const useMarkdown =
    !isUser &&
    !streaming &&
    !hasQuiz &&
    !hasSummaryLayout &&
    !summaryFallback &&
    text.trim().length > 0;

  const bubbleShell = isUser
    ? calm
      ? "bg-primary/12 text-foreground rounded-2xl rounded-br-md whitespace-pre-wrap"
      : "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
    : calm
      ? "bg-muted/55 text-foreground rounded-2xl rounded-tl-md"
      : variant === "explain"
        ? "bg-muted text-foreground rounded-bl-md ring-1 ring-primary/15"
        : "bg-muted text-foreground rounded-bl-md";

  const bubblePad = calm ? (isUser ? "px-3.5 py-2" : "px-3.5 py-2.5") : "px-4 py-2.5";
  const clamp = calm
    ? "max-h-[min(62vh,26rem)] overflow-y-auto pr-0.5 [scrollbar-gutter:stable]"
    : "max-h-[min(70vh,28rem)] overflow-y-auto pr-1 -mr-1 [scrollbar-gutter:stable]";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-[fade-in-up_0.35s_ease-out]`}>
      <div
        className={`${calm ? (isUser ? "max-w-[88%]" : "w-full") : "max-w-[85%]"} rounded-2xl ${bubblePad} ${
          calm ? "text-[14px] leading-6" : "text-[15px] leading-7"
        } ${bubbleShell}`}
      >
        {isUser ? (
          text
        ) : hasQuiz ? (
          <div className={`${clamp} space-y-5`}>
            {text.trim().length > 0 && (
              <div className="chat-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
                  {text}
                </ReactMarkdown>
              </div>
            )}
            <ol className="space-y-3 list-none m-0 p-0">
              {quizItems!.map((q, i) => (
                <QuizQuestionCard key={i} item={q} index={i} calm={calm} />
              ))}
            </ol>
          </div>
        ) : hasSummaryLayout ? (
          <div className={`${clamp} space-y-4`}>
            <div className={calm ? "space-y-2" : "rounded-xl border border-primary/25 bg-background/80 p-3"}>
              <div className={calm ? "text-xs font-medium text-primary" : "text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5"}>
                Summary
              </div>
              <div className="chat-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
                  {summarySections!.lead}
                </ReactMarkdown>
              </div>
            </div>
            <div className={calm ? "space-y-2 pt-1" : "rounded-xl border border-border bg-muted/50 p-3"}>
              <div className={calm ? "text-xs font-medium text-muted-foreground" : "text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5"}>
                Review
              </div>
              <div className="chat-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
                  {summarySections!.rest}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : summaryFallback ? (
          <div className={clamp}>
            <div className={calm ? "chat-md" : "rounded-xl border border-primary/25 bg-background/90 p-3 chat-md"}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
                {text}
              </ReactMarkdown>
            </div>
          </div>
        ) : useMarkdown ? (
          <div className={`chat-md ${clamp}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
              {text}
            </ReactMarkdown>
          </div>
        ) : (
          <span className="whitespace-pre-wrap">{text}</span>
        )}
        {streaming && <span className="inline-block w-1.5 h-4 align-middle ml-0.5 bg-current animate-pulse" />}
      </div>
    </div>
  );
}

export function TypingDots() {
  return (
    <div className="flex justify-start animate-[fade-in-up_0.2s_ease-out]">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
