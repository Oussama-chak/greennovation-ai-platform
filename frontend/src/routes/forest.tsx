import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { AvatarTip } from "@/components/AvatarTip";
import { PENDING_REWARD_KEY } from "@/components/DailyReward";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookMarked,
  BookOpen,
  Eye,
  Flame,
  Gift,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useTreeInventory } from "@/hooks/useTreeInventory";
import { useForest, useForestInventory, usePlantTree } from "@/hooks/useForest";
import { consumeTree } from "@/lib/treeInventory";
import {
  WallOfStories,
  type WallActions,
  type WallSnapshot,
} from "@/features/wallOfStories/WallOfStories";

export const Route = createFileRoute("/forest")({
  validateSearch: (s: Record<string, unknown>) => ({
    reward: s.reward === 1 || s.reward === "1" ? 1 : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Knowledge Library — EcoLearn AI" },
      {
        name: "description",
        content:
          "Your Wall of Stories. Reveal chapters as you study and finish projects.",
      },
      { property: "og:title", content: "Knowledge Library — EcoLearn AI" },
      {
        property: "og:description",
        content: "Every reward wakes a book on your wall.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <KnowledgeLibraryPage />
    </AppLayout>
  ),
});

function KnowledgeLibraryPage() {
  const { reward } = Route.useSearch();
  const { count: localAvailable } = useTreeInventory();
  const { data: backendForest } = useForest();
  const { data: backendInventory } = useForestInventory();
  const { mutate: plantViaBackend, isPending: backendPlacing } = usePlantTree();

  const available = backendInventory?.available ?? localAvailable;
  const streakDays = backendForest?.streak_days ?? 4;

  const [wall, setWall] = useState<WallSnapshot>({
    done: 0,
    total: 0,
    ink: 0,
    inkDisplay: 0,
    streakDays: 5,
    nextTitle: null,
    say: "",
  });
  const actionsRef = useRef<WallActions | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [zoom, setZoom] = useState(1.05);
  const claimedRef = useRef(false);
  const sceneRef = useRef<HTMLElement | null>(null);

  const onStateChange = useCallback((snap: WallSnapshot) => {
    setWall(snap);
  }, []);

  const onActions = useCallback((actions: WallActions) => {
    actionsRef.current = actions;
  }, []);

  const revealNext = useCallback(() => {
    if (!actionsRef.current || revealing || backendPlacing) return;
    if (wall.nextTitle == null && wall.total > 0 && wall.done >= wall.total) return;

    setRevealing(true);
    const finish = () => {
      actionsRef.current?.completeNext();
      setRevealing(false);
      sceneRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    // Spend a reward token when available; always wake the next chapter
    if (available > 0) {
      if (backendInventory) {
        plantViaBackend(
          {
            kind: "oak",
            x: 20 + Math.random() * 60,
            y: 64 + Math.random() * 22,
            scale: 0.75 + Math.random() * 0.15,
          },
          {
            onSuccess: () => {
              consumeTree();
              finish();
            },
            onError: () => {
              consumeTree();
              finish();
            },
          },
        );
        return;
      }
      consumeTree();
    }
    finish();
  }, [
    available,
    backendInventory,
    backendPlacing,
    plantViaBackend,
    revealing,
    wall.done,
    wall.nextTitle,
    wall.total,
  ]);

  const focusNext = useCallback(() => {
    actionsRef.current?.focusNext();
  }, []);

  useEffect(() => {
    if (claimedRef.current) return;
    if (typeof window === "undefined") return;
    const pending = localStorage.getItem(PENDING_REWARD_KEY);
    if (reward === 1 && pending === "1" && available > 0) {
      claimedRef.current = true;
      localStorage.removeItem(PENDING_REWARD_KEY);
      setTimeout(() => revealNext(), 600);
    }
  }, [reward, available, revealNext]);

  const wallReady = wall.total > 0;
  const wallDone = wallReady && wall.nextTitle == null;
  const canReveal = wallReady && !wallDone && !revealing && !backendPlacing;
  const buttonLabel =
    revealing || backendPlacing
      ? "Revealing…"
      : !wallReady
        ? "Opening wall…"
        : wallDone
          ? "Wall complete"
          : available > 0
            ? `Reveal a book (${available})`
            : "Reveal next book";

  const stats = [
    {
      icon: BookMarked,
      label: "Chapters awake",
      value: wall.total ? `${wall.done}/${wall.total}` : "—",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Gift,
      label: "Ready to reveal",
      value: String(available),
      color: "bg-warning/15 text-warning-foreground",
    },
    {
      icon: Flame,
      label: "Streak",
      value: `${streakDays} day${streakDays === 1 ? "" : "s"}`,
      color: "bg-accent text-accent-foreground",
    },
    {
      icon: Sparkles,
      label: "Ink",
      value: String(wall.inkDisplay || wall.ink || "—"),
      color: "bg-info/10 text-info",
    },
  ];

  return (
    <div className="knowledge-page mx-auto max-w-6xl space-y-6">
      <div className="mb-8 flex animate-[fade-in-up_0.5s_ease-out] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Knowledge Library
          </div>
          <h1 className="font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl lg:text-4xl">
            Every lesson leaves a page;
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary to-world-gold bg-clip-text text-transparent">
              {" "}
              every project fills a shelf.
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Explore your Wall of Stories. Reveal the glowing chapter when you earn a
            reward — or tap any book to read its story.
          </p>
        </div>
        <div className="group relative shrink-0">
          <button
            type="button"
            onClick={revealNext}
            disabled={!canReveal}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BookOpen className="h-4 w-4" />
            {buttonLabel}
          </button>
          {!canReveal && wall.nextTitle == null && (
            <span className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-semibold text-background opacity-0 transition group-hover:opacity-100">
              Every chapter on the wall is awake
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-stretch">
        <section
          ref={sceneRef}
          className="knowledge-scene relative overflow-hidden rounded-3xl border border-primary/10 bg-world-wall shadow-soft"
        >
          <WallOfStories
            embed
            hideHud
            hideLibrarian
            scale={zoom}
            onStateChange={onStateChange}
            onActions={onActions}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3 lg:hidden">
            <span className="rounded-full bg-card/90 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-soft">
              Tap a book · Follow the glowing spine · Reveal from the panel
            </span>
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Wand2 className="h-3.5 w-3.5" />
              Reveal books
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              The glowing spine is your next chapter. Reveal it to wake the book and
              ripple light across the shelf.
            </p>
            <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Next chapter
              </div>
              <div className="mt-1 font-display text-sm font-bold leading-snug">
                {!wallReady
                  ? "Loading…"
                  : (wall.nextTitle ?? "Wall complete — every book is awake")}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {wallReady
                  ? `${wall.done} of ${wall.total} chapters awake`
                  : "Opening your Wall of Stories…"}
              </div>
            </div>
            <button
              type="button"
              onClick={revealNext}
              disabled={!canReveal}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {revealing || backendPlacing
                ? "Revealing…"
                : !wallReady
                  ? "Opening wall…"
                  : wall.nextTitle
                    ? "Reveal next book"
                    : "All revealed"}
            </button>
            <button
              type="button"
              onClick={focusNext}
              disabled={!wallReady || !wall.nextTitle}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-xs font-semibold hover:bg-muted/60 disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5" />
              Find glowing book
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              View
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setZoom(1.05)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold hover:bg-muted/60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.08).toFixed(2)))}
                disabled={zoom <= 0.8}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold hover:bg-muted/60 disabled:opacity-50"
              >
                <Minus className="h-3.5 w-3.5" />
                Smaller
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.2, +(z + 0.08).toFixed(2)))}
                disabled={zoom >= 1.2}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold hover:bg-muted/60 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Larger
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              Click a book for its story · Esc closes the card
            </p>
          </div>
        </aside>
      </div>

      <AvatarTip
        mood={revealing ? "reading" : "waving"}
        message={
          revealing
            ? "A new chapter is waking on your wall… 📚"
            : wall.nextTitle
              ? `Next up: “${wall.nextTitle}”. Tap Reveal next book when you’re ready.`
              : wall.say ||
                "Your Wall of Stories is ready — every chapter is awake. 📖"
        }
      />
    </div>
  );
}
