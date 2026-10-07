import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "@tanstack/react-router";
import "./wallOfStories.css";
import type { RewardKind, WallActions, WallBook, WallSnapshot } from "./types";

export type { WallActions, WallSnapshot } from "./types";


/** Subject labels + reveal spine colors (coral / teal / gold — matches Wall prototype) */
const SUBJ: Record<string, [string, string[]]> = {
  AI: ["Artificial Intelligence", ["#c45c4a", "#d4684f", "#e07a5f", "#b84a3a", "#a84838"]],
  DS: ["Distributed Systems", ["#1a9b8e", "#2a9d8f", "#14b8a6", "#0f8a7c", "#2dd4bf"]],
  Math: ["Mathematics", ["#3d7ec9", "#4a8fd4", "#2f6eb5", "#5b9de0", "#2563a8"]],
  Web: ["Web Development", ["#e8b84a", "#f0c35a", "#d4a017", "#f5c84a", "#c99220"]],
  Well: ["Well-being", ["#2a9d8f", "#34b4a4", "#1f8a7c", "#3db8a8", "#0d9488"]],
  Write: ["Thesis Writing", ["#c45c4a", "#b86b7a", "#d4786a", "#9b6b8d", "#c07080"]],
};
const SK = Object.keys(SUBJ);

const TITLES = [
  "Define the research question",
  "Literature scan",
  "Set up the repo",
  "Linear algebra refresher",
  "Collect the dataset",
  "Clean the data",
  "Baseline model",
  "Read the attention paper",
  "Fine-tune the encoder",
  "Design the API",
  "Write the intro",
  "Evaluation plan",
  "Set up FAISS index",
  "Chunking experiments",
  "Raft notes",
  "Run ablation study",
  "Plot the results",
  "Mid-term review",
  "Sleep schedule reset",
  "Draft methodology",
  "Retrieval benchmarks",
  "Peer feedback round",
  "Error analysis",
  "Frontend dashboard",
  "Write related work",
  "Tune hyperparameters",
  "Test edge cases",
  "Prepare demo data",
  "Statistics check",
  "Revise methodology",
  "Write results section",
  "Slides outline",
  "Practice defense",
  "Proofread chapter 3",
  "Final experiments",
  "Abstract draft",
  "Citations cleanup",
  "Submit draft v1",
  "Handle feedback",
  "Polish figures",
  "Final proofread",
  "Defense rehearsal",
  "Submit thesis",
  "Celebrate",
  "Sketch the architecture",
  "Wire the auth flow",
  "Build the quiz loop",
  "Label training samples",
  "Tune the prompt pack",
  "Ship a weekend demo",
  "Write the discussion",
  "Map related papers",
  "Fix flaky tests",
  "Compress the model",
  "Plan user study",
  "Draft the conclusion",
  "Prep poster figures",
  "Rehearse Q&A",
  "Archive the dataset",
  "Log experiment notes",
  "Review ethics checklist",
  "Sync with advisor",
  "Cut the demo video",
  "Polish the abstract",
];

const BOOKS_PER_SHELF = 26;
const SHELF_COUNT = 4;
const TOTAL_BOOKS = BOOKS_PER_SHELF * SHELF_COUNT;
const MYSTERY_SLOTS = [25, 51, 77, 103];
const MYSTERY_THRESHOLDS = [14, 28, 42, 56];

/** Ornate spine + matching incline (3D) cover PNGs in /public/wallOfStories/books */
const BOOK_ASSETS = [
  { spine: "spine-burgundy", cover: "cover-burgundy", w: 20 },
  { spine: "spine-charcoal", cover: "cover-charcoal", w: 20 },
  { spine: "spine-caramel", cover: "cover-caramel", w: 20 },
  { spine: "spine-honey", cover: "cover-honey", w: 22 },
  { spine: "spine-navy", cover: "cover-navy", w: 20 },
  { spine: "spine-ruby", cover: "cover-ruby", w: 21 },
  { spine: "spine-amber", cover: "cover-amber", w: 22 },
  { spine: "spine-turquoise", cover: "cover-turquoise", w: 20 },
] as const;

function bookAsset(id: number, mystery: boolean) {
  if (mystery) return BOOK_ASSETS[3]; // honey/gold for mystery
  return BOOK_ASSETS[id % BOOK_ASSETS.length];
}

function bookAssetSrc(id: number, mystery: boolean) {
  return `/wallOfStories/books/${bookAsset(id, mystery).spine}.png`;
}

function bookCoverSrc(id: number, mystery: boolean) {
  return `/wallOfStories/books/${bookAsset(id, mystery).cover}.png`;
}

const QUOTES = [
  "Small steps still count as steps.",
  "You do not need to feel ready to begin.",
  "Rest is part of the work, not a break from it.",
  "Progress is quiet most days. Today it was loud.",
];
const FACTS = [
  "Transformers read every token in parallel, which is why they train faster than recurrent nets.",
  "Raft uses randomized election timeouts so leaders rarely collide.",
  "FAISS can search millions of vectors in milliseconds with the right index.",
  "Spaced review beats cramming for long-term memory.",
];
const SUMMARIES = [
  "You covered the core idea, worked two examples and flagged one open question for tomorrow.",
  "Key takeaway: the method works, but the evaluation needs a stronger baseline.",
  "You connected this chapter to your earlier notes. Next, tighten the argument.",
];
const BADGES = ["On-Time Hero", "Deep Focus", "Early Bird", "Steady Pace"];
const MYSTERY_REWARD = {
  kind: "rare decor",
  text: "A brass reading lamp for your wall. Rare find!",
};
const STREAK_DAYS = 5;

function makeRnd() {
  let a = 5;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBooks(): WallBook[] {
  const rnd = makeRnd();
  const books: WallBook[] = [];
  let ti = 0;
  for (let i = 0; i < TOTAL_BOOKS; i++) {
    const my = MYSTERY_SLOTS.indexOf(i);
    const mystery = my > -1;
    const s = SK[(ti * 5 + i) % 6];
    const palette = SUBJ[s][1];
    const asset = bookAsset(i, mystery);
    const tall = rnd() > 0.55;
    const b: WallBook = {
      id: i,
      mystery,
      th: mystery ? MYSTERY_THRESHOLDS[my] : 0,
      subj: s,
      c: mystery
        ? ["#c9a84a", "#d4b056", "#b8922e", "#e0c060"][my % 4]
        : palette[Math.floor(rnd() * palette.length)],
      w: asset.w + Math.floor(rnd() * 3),
      h: tall ? 92 + Math.floor(rnd() * 14) : 78 + Math.floor(rnd() * 14),
      row: Math.floor(i / BOOKS_PER_SHELF),
      col: i % BOOKS_PER_SHELF,
      awake: false,
      a: 0,
      title: mystery ? "Mystery book" : TITLES[ti % TITLES.length],
    };
    if (!mystery) {
      b.due = new Date(2026, 9, 7 + ti * 2).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      });
      const k = (["quote", "fact", "summary", "badge"] as RewardKind[])[ti % 4];
      b.reward = {
        kind: k,
        text:
          k === "quote"
            ? QUOTES[ti % 4]
            : k === "fact"
              ? FACTS[ti % 4]
              : k === "summary"
                ? SUMMARIES[ti % 3]
                : BADGES[ti % 4],
      };
      ti++;
    }
    books.push(b);
  }
  let woken = 0;
  for (const b of books) {
    if (!b.mystery && woken < 9) {
      b.awake = true;
      b.a = 1;
      woken += 1;
    }
  }
  return books;
}

function Lantern({ side }: { side: "l" | "r" }) {
  return (
    <svg
      className={`wos-lan ${side}`}
      width="42"
      height="72"
      viewBox="0 0 40 70"
      aria-hidden
    >
      <ellipse cx="20" cy="30" rx="16" ry="22" fill="url(#wos-lan-aura)" opacity="0.85" />
      <path d="M20 2v8" stroke="#c9a45a" strokeWidth="2" />
      <path d="M9 13h22l-4-7H13z" fill="#8a6238" />
      <rect x="11" y="13" width="18" height="33" rx="3" fill="url(#wos-lg)" />
      <path d="M14 18h12M14 28h12M14 38h12" stroke="#ffe9b0" strokeWidth="0.6" opacity="0.55" />
      <path d="M8 46h24l-3 9H11z" fill="#6b4424" />
    </svg>
  );
}

type WallOfStoriesProps = {
  /** When true, fills a parent card (forest-page scene slot) without full-page chrome */
  embed?: boolean;
  /** Hide the built-in sticky HUD (parent page owns stats / CTAs) */
  hideHud?: boolean;
  /** Hide floating librarian bubble (parent may show AvatarTip instead) */
  hideLibrarian?: boolean;
  /** CSS scale for the wall stage */
  scale?: number;
  onStateChange?: (snapshot: WallSnapshot) => void;
  onActions?: (actions: WallActions) => void;
};

export function WallOfStories({
  embed = false,
  hideHud = false,
  hideLibrarian = false,
  scale,
  onStateChange,
  onActions,
}: WallOfStoriesProps) {

  const [books, setBooks] = useState<WallBook[]>(() => buildBooks());
  const [ink, setInk] = useState(128);
  const [inkDisplay, setInkDisplay] = useState(128);
  const [openId, setOpenId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [say, setSay] = useState(
    "Your wall is waking up, one chapter at a time. Pick any book, or follow the glowing one.",
  );
  const [theme, setTheme] = useState<"light" | "dark" | "">("");
  const bookRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const toastTimer = useRef<number | null>(null);

  const total = useMemo(() => books.filter((b) => !b.mystery).length, [books]);
  const done = useMemo(
    () => books.filter((b) => !b.mystery && b.awake).length,
    [books],
  );
  const next = useMemo(
    () => books.find((b) => !b.mystery && !b.awake) ?? null,
    [books],
  );
  const openBook = openId === null ? null : (books.find((b) => b.id === openId) ?? null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const tickInk = useCallback(
    (to: number) => {
      setInk(to);
      const start = inkDisplay;
      const t0 = performance.now();
      const step = (n: number) => {
        const p = Math.min(1, (n - t0) / 700);
        setInkDisplay(Math.round(start + (to - start) * p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    [inkDisplay],
  );

  const sparks = useCallback((el: HTMLElement | null) => {
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 24; i++) {
      const s = document.createElement("span");
      s.className = "wos-sp";
      s.style.left = `${r.left + r.width / 2}px`;
      s.style.top = `${r.top + r.height / 3}px`;
      const an = Math.random() * 6.28;
      const di = 40 + Math.random() * 90;
      s.style.setProperty("--dx", `${Math.cos(an) * di}px`);
      s.style.setProperty("--dy", `${Math.sin(an) * di - 30}px`);
      document.body.appendChild(s);
      window.setTimeout(() => s.remove(), 1000);
    }
  }, []);

  const awaken = useCallback(
    (id: number) => {
      setBooks((prev) => {
        const target = prev.find((b) => b.id === id);
        if (!target || target.awake) return prev;
        return prev.map((o) => {
          if (o.id === id) {
            return { ...o, awake: true, a: 1, dl: ".35s", shaking: true };
          }
          if (o.awake) return o;
          const d = Math.hypot(o.col - target.col, (o.row - target.row) * 1.8);
          if (d < 3.4) {
            return {
              ...o,
              a: Math.max(o.a, 0.34 * (1 - d / 3.4)),
              dl: `${0.35 + d * 0.12}s`,
            };
          }
          return o;
        });
      });
      window.setTimeout(() => {
        setBooks((prev) =>
          prev.map((b) => (b.id === id ? { ...b, shaking: false } : b)),
        );
        sparks(bookRefs.current.get(id) ?? null);
      }, 550);
    },
    [sparks],
  );

  const complete = useCallback(
    (id: number) => {
      const b = books.find((x) => x.id === id);
      if (!b || b.awake) return;
      awaken(id);
      const gain = 10 + (Math.random() > 0.35 ? 5 : 0);
      const nextInk = ink + gain;
      tickInk(nextInk);

      const afterAwake = books.map((x) =>
        x.id === id ? { ...x, awake: true, a: 1 } : x,
      );
      const nextBook = afterAwake.find((x) => !x.mystery && !x.awake);
      const d = afterAwake.filter((x) => !x.mystery && x.awake).length;

      showToast(`Chapter awakened: ${b.title}`);
      setSay(
        nextBook
          ? `Lovely. “${b.title}” is awake. Next up: “${nextBook.title}”. Take it at your pace.`
          : "The whole wall is awake. You built this, one chapter at a time.",
      );

      afterAwake
        .filter((m) => m.mystery && !m.awake && d >= m.th)
        .forEach((m, i) => {
          window.setTimeout(() => {
            awaken(m.id);
            showToast("A mystery book woke up!");
            setSay("A mystery book woke up. Go and see what it holds.");
          }, 1500 + i * 600);
        });

      if (!nextBook) {
        window.setTimeout(() => {
          afterAwake.forEach((x, i) => {
            window.setTimeout(
              () => sparks(bookRefs.current.get(x.id) ?? null),
              i * 25,
            );
          });
        }, 1200);
      }

      setOpenId(null);
    },
    [books, ink, awaken, tickInk, showToast, sparks],
  );

  const completeNext = useCallback(() => {
    if (next) complete(next.id);
  }, [next, complete]);

  const focusNext = useCallback(() => {
    if (!next) return;
    const el = bookRefs.current.get(next.id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }, [next]);

  const closeSheet = useCallback(() => setOpenId(null), []);

  // Sync parent chrome before paint so reveal controls aren't stuck disabled
  useLayoutEffect(() => {
    onStateChange?.({
      done,
      total,
      ink,
      inkDisplay,
      streakDays: STREAK_DAYS,
      nextTitle: next?.title ?? null,
      say,
    });
    onActions?.({ completeNext, focusNext });
  }, [
    done,
    total,
    ink,
    inkDisplay,
    next,
    say,
    completeNext,
    focusNext,
    onStateChange,
    onActions,
  ]);


  useEffect(() => {
    if (openId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    // Use capture on next tick so the opening click doesn't instantly dismiss
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".wos-sheet, .wos-book, .wos-chip")) closeSheet();
    };
    window.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => {
      document.addEventListener("click", onClick);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [openId, closeSheet]);

  const toggleTheme = () => {
    const dark =
      theme === "dark" ||
      (theme === "" && matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(dark ? "light" : "dark");
  };

  const shelves = Array.from({ length: SHELF_COUNT }, (_, row) =>
    books.filter((b) => b.row === row),
  );

  const stageStyle = (() => {
    if (embed) {
      const z = scale ?? 1;
      // Fit all 4 shelves snugly in the scene card without clipping
      const u = Math.min(1.35, Math.max(0.55, 1.18 * z));
      return {
        ["--wos-scale" as string]: "1",
        ["--wos-u" as string]: `${u}px`,
      } as CSSProperties;
    }
    if (scale != null) {
      return { ["--wos-scale" as string]: String(scale) } as CSSProperties;
    }
    return undefined;
  })();

  return (
    <div
      className={`wos-root${embed ? " wos-embed" : ""}`}
      data-theme={theme || undefined}
      style={stageStyle}
    >
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="wos-lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff4c8" />
            <stop offset="0.45" stopColor="#ffd078" />
            <stop offset="1" stopColor="#e09040" />
          </linearGradient>
          <radialGradient id="wos-lan-aura" cx="50%" cy="45%" r="50%">
            <stop offset="0" stopColor="#ffe8a0" stopOpacity="0.7" />
            <stop offset="0.55" stopColor="#f0b050" stopOpacity="0.2" />
            <stop offset="1" stopColor="#f0b050" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {!hideHud && (
        <header className="wos-hud">
          <div className="wos-sp1">
            <h1>Thesis Wall</h1>
            <small>
              {done} of {total} chapters awake
            </small>
          </div>
          <div className="wos-ring">
            <svg width="48" height="48" viewBox="0 0 54 54" aria-hidden>
              <circle
                cx="27"
                cy="27"
                r="22"
                fill="none"
                stroke="var(--wos-line)"
                strokeWidth="5"
              />
              <circle
                cx="27"
                cy="27"
                r="22"
                fill="none"
                stroke="oklch(0.72 0.14 160)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="138.2"
                strokeDashoffset={138.2 * (1 - done / Math.max(total, 1))}
                transform="rotate(-90 27 27)"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <b>
              {done}/{total}
            </b>
          </div>
          <span className="wos-chip" aria-live="polite">
            {inkDisplay} Ink
          </span>
          <span className="wos-candle">
            <svg width="14" height="26" viewBox="0 0 14 26" aria-hidden>
              <rect x="3" y="10" width="8" height="15" rx="1.5" fill="#e8f5e9" />
              <path d="M7 1c3 3 3 6 0 8c-3-2-3-5 0-8z" fill="#7ed6b0">
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="1;1.12;.95;1"
                  dur="1.6s"
                  repeatCount="indefinite"
                  additive="sum"
                />
              </path>
            </svg>
            <span>{STREAK_DAYS}-day streak</span>
          </span>
          <button
            type="button"
            className="wos-chip"
            disabled={!next}
            onClick={focusNext}
          >
            {next ? `Next up: ${next.title}` : "Wall complete"}
          </button>
          <button
            type="button"
            className="wos-chip g"
            disabled={!next}
            onClick={completeNext}
          >
            Complete next task (demo)
          </button>
          <button
            type="button"
            className="wos-chip"
            aria-label="Toggle light or dark theme"
            onClick={toggleTheme}
          >
            Theme
          </button>
        </header>
      )}

      <div className="wos-stage">
        <main
          className="wos-wall"
          aria-label="Wall of Stories"
          style={{ ["--wos-p" as string]: done / Math.max(total, 1) } as CSSProperties}
        >
          <Lantern side="l" />
          <Lantern side="r" />
          <div className="wos-magic" aria-hidden>
            <span className="wos-mote" />
            <span className="wos-mote" />
            <span className="wos-mote" />
            <span className="wos-mote" />
            <span className="wos-mote" />
            <span className="wos-mote" />
            <span className="wos-mote" />
            <span className="wos-mote" />
          </div>
          <div>
            {shelves.map((rowBooks, row) => (
              <div key={row} className="wos-shelf">
                {rowBooks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    ref={(el) => {
                      if (el) bookRefs.current.set(b.id, el);
                      else bookRefs.current.delete(b.id);
                    }}
                    className={[
                      "wos-book",
                      "asset",
                      b.mystery ? "m" : "",
                      next?.id === b.id ? "next" : "",
                      b.shaking ? "shake" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      {
                        ["--wos-c" as string]: b.c,
                        ["--wos-w" as string]: String(b.w),
                        ["--wos-h" as string]: String(b.h),
                        ["--wos-a" as string]: String(b.a),
                        ["--wos-dl" as string]: b.dl ?? "0s",
                      } as CSSProperties
                    }
                    aria-label={
                      b.mystery
                        ? b.awake
                          ? "Mystery book, awake"
                          : "Mystery book, sleeping"
                        : `${b.title}, ${b.awake ? "awake" : "sleeping"}, due ${b.due}`
                    }
                    onClick={() => setOpenId(b.id)}
                  >
                    <img
                      className="wos-book-img"
                      src={bookAssetSrc(b.id, b.mystery)}
                      alt=""
                      draggable={false}
                    />
                    {b.mystery && !b.awake && (
                      <span className="wos-t mystery">?</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </main>
      </div>

      <div
        className={`wos-sheet${openBook ? " on" : ""}`}
        role="dialog"
        aria-live="polite"
        aria-hidden={!openBook}
      >
        {openBook && (
          <>
            <button
              type="button"
              className="wos-x"
              aria-label="Close"
              onClick={closeSheet}
            >
              ✕
            </button>
            <div
              className={`wos-cover asset incline${openBook.awake ? "" : " sl"}`}
              style={{ ["--wos-c" as string]: openBook.c } as CSSProperties}
            >
              <img
                src={bookCoverSrc(openBook.id, openBook.mystery)}
                alt=""
                draggable={false}
              />
            </div>
            <div>
              {openBook.mystery ? (
                openBook.awake ? (
                  <>
                    <h3>Mystery book</h3>
                    <p>{MYSTERY_REWARD.text}</p>
                    <span className="wos-k">{MYSTERY_REWARD.kind}</span>
                  </>
                ) : (
                  <>
                    <h3>Mystery book</h3>
                    <p>
                      It wakes up when you reach {openBook.th} chapters.
                      Something nice is inside.
                    </p>
                  </>
                )
              ) : openBook.awake ? (
                <>
                  <h3>{openBook.title}</h3>
                  <span className="wos-k">{SUBJ[openBook.subj]?.[0]}</span>
                  <span className="wos-k">{openBook.reward?.kind}</span>
                  <p>{openBook.reward?.text}</p>
                </>
              ) : (
                <>
                  <h3>{openBook.title}</h3>
                  <span className="wos-k">{SUBJ[openBook.subj]?.[0]}</span>
                  <span className="wos-k">due {openBook.due}</span>
                  <p>This chapter is waiting to be discovered.</p>
                  <div className="wos-row">
                    <Link
                      to="/projects"
                      className="wos-chip"
                      style={{ textDecoration: "none" }}
                    >
                      Start this task
                    </Link>
                    <button
                      type="button"
                      className="wos-chip g"
                      onClick={() => complete(openBook.id)}
                    >
                      Mark done (demo)
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {!hideLibrarian && (
        <div className={`wos-lib${openBook ? " h" : ""}`}>
          <b>Librarian</b>
          <span>{say}</span>
        </div>
      )}

      <div className={`wos-toast${toast ? " on" : ""}`}>{toast}</div>
    </div>
  );
}

