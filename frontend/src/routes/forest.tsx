import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { AvatarTip } from "@/components/AvatarTip";
import { PENDING_REWARD_KEY } from "@/components/DailyReward";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Atom,
  BookOpen,
  Compass,
  Flame,
  Gift,
  Library,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  BookMarked,
} from "lucide-react";
import { useTreeInventory } from "@/hooks/useTreeInventory";
import { useForest, useForestInventory, usePlantTree } from "@/hooks/useForest";
import { consumeTree } from "@/lib/treeInventory";
import {
  ISLANDS,
  readWorldProgress,
  totalBooks,
  writeWorldProgress,
  islandToTreeKind,
  treeKindToIsland,
  type IslandId,
  type IslandProgress,
} from "@/lib/knowledgeIslands";

const LibraryScene = lazy(() =>
  import("@/components/knowledge/LibraryScene").then((m) => ({ default: m.LibraryScene })),
);

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
          "Build your own 3D library. Every daily lesson and finished project adds a new book to your shelves.",
      },
      { property: "og:title", content: "Knowledge Library — EcoLearn AI" },
      {
        property: "og:description",
        content: "Every reward becomes a book. Watch your personal library grow.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <KnowledgeLibraryPage />
    </AppLayout>
  ),
});

const WING_ICONS = {
  compass: Compass,
  atom: Atom,
  book: BookOpen,
} as const;

const PER_WING_CAPACITY = 40;

function SceneFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-world-wall/80 text-world-ink">
      <Library className="h-10 w-10 animate-pulse text-world-green" />
      <p className="text-sm font-medium">Opening your library…</p>
    </div>
  );
}

function KnowledgeLibraryPage() {
  const { reward } = Route.useSearch();
  const { count: localAvailable } = useTreeInventory();
  const { data: backendForest, isLoading: forestLoading } = useForest();
  const { data: backendInventory } = useForestInventory();
  const { mutate: plantViaBackend, isPending: backendPlacing } = usePlantTree();

  const available = backendInventory?.available ?? localAvailable;
  const backendTrees = backendForest?.trees ?? [];
  const streakDays = backendForest?.streak_days ?? 4;

  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<IslandProgress>(() =>
    typeof window !== "undefined" ? readWorldProgress() : { discovery: 0, logic: 0, imagination: 0 },
  );
  const [selected, setSelected] = useState<IslandId>("discovery");
  const [growth, setGrowth] = useState<IslandId | null>(null);
  const [placing, setPlacing] = useState(false);
  const [cameraReset, setCameraReset] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const claimedRef = useRef(false);
  const sceneRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!forestLoading && backendTrees.length > 0) {
      setProgress((current) => {
        const localTotal = totalBooks(current);
        if (backendTrees.length <= localTotal) return current;

        const next = { ...current };
        backendTrees.slice(localTotal).forEach((t) => {
          const wing = treeKindToIsland(t.kind);
          next[wing] = Math.min(PER_WING_CAPACITY, next[wing] + 1);
        });
        writeWorldProgress(next);
        return next;
      });
    }
  }, [forestLoading, backendTrees]);

  const booksTotal = useMemo(() => totalBooks(progress), [progress]);
  const selectedWing = ISLANDS.find((w) => w.id === selected)!;
  const SelectedIcon = WING_ICONS[selectedWing.icon];

  const bumpProgress = useCallback((wing: IslandId) => {
    setProgress((prev) => {
      if (prev[wing] >= PER_WING_CAPACITY) return prev;
      const next = { ...prev, [wing]: prev[wing] + 1 };
      writeWorldProgress(next);
      return next;
    });
    setGrowth(wing);
    setTimeout(() => setGrowth(null), 2200);
  }, []);

  const placeBookOn = useCallback(
    (wing: IslandId) => {
      if (placing || backendPlacing) return;
      if (available <= 0) return;
      if (progress[wing] >= PER_WING_CAPACITY) return;

      const kind = islandToTreeKind(wing);
      const x = 20 + Math.random() * 60;
      const y = 64 + Math.random() * 22;
      setPlacing(true);
      setSelected(wing);

      const finish = () => {
        bumpProgress(wing);
        setPlacing(false);
        sceneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      };

      if (backendInventory) {
        plantViaBackend(
          { kind, x, y, scale: 0.75 + Math.random() * 0.15 },
          {
            onSuccess: () => {
              consumeTree();
              finish();
            },
            onError: () => {
              if (consumeTree()) finish();
              else setPlacing(false);
            },
          },
        );
      } else if (consumeTree()) {
        finish();
      } else {
        setPlacing(false);
      }
    },
    [placing, backendPlacing, available, progress, backendInventory, plantViaBackend, bumpProgress],
  );

  const placeBook = useCallback(() => placeBookOn(selected), [placeBookOn, selected]);

  useEffect(() => {
    if (claimedRef.current) return;
    if (typeof window === "undefined") return;
    const pending = localStorage.getItem(PENDING_REWARD_KEY);
    if (reward === 1 && pending === "1" && available > 0) {
      claimedRef.current = true;
      localStorage.removeItem(PENDING_REWARD_KEY);
      const wing = selected;
      setTimeout(() => placeBookOn(wing), 600);
    }
  }, [reward, available, selected, placeBookOn]);

  const wingFull = progress[selected] >= PER_WING_CAPACITY;
  const canPlace = available > 0 && !placing && !backendPlacing && !wingFull;
  const buttonLabel =
    placing || backendPlacing
      ? "Shelving your book…"
      : available <= 0
        ? "No books to shelve"
        : wingFull
          ? "This wing is full"
          : `Shelve a book (${available})`;

  const stats = [
    {
      icon: BookMarked,
      label: "Books shelved",
      value: String(booksTotal),
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Gift,
      label: "Ready to shelve",
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
      label: "Library tier",
      value: booksTotal >= 30 ? "Scholar · 3" : booksTotal >= 10 ? "Reader · 2" : "Curious · 1",
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
            Drag to explore your 3D reading room. Choose a wing, then shelve rewards you earn from
            daily study and completed projects — watch each volume fly from the desk to its place.
          </p>
        </div>
        <div className="group relative shrink-0">
          <button
            type="button"
            onClick={placeBook}
            disabled={!canPlace}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BookOpen className="h-4 w-4" />
            {buttonLabel}
          </button>
          {available <= 0 && !placing && (
            <span className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-semibold text-background opacity-0 transition group-hover:opacity-100">
              Earn a book by studying today or finishing a project
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section
          ref={sceneRef}
          className="knowledge-scene relative overflow-hidden rounded-3xl border border-primary/10 bg-world-wall shadow-soft"
        >
          {mounted ? (
            <Suspense fallback={<SceneFallback />}>
              <LibraryScene
                selected={selected}
                onSelect={setSelected}
                progress={progress}
                growth={growth}
                paused={reducedMotion || placing}
                reset={cameraReset}
                zoom={zoom}
              />
            </Suspense>
          ) : (
            <SceneFallback />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3 lg:hidden">
            <span className="rounded-full bg-card/90 px-3 py-1 text-[10px] font-semibold text-muted-foreground shadow-soft">
              Drag to look around · Tap a bookcase to select a wing
            </span>
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Library className="h-3.5 w-3.5" />
              Wings
            </div>
            <ul className="mt-3 space-y-2">
              {ISLANDS.map((wing) => {
                const Icon = WING_ICONS[wing.icon];
                const active = selected === wing.id;
                const count = progress[wing.id];
                return (
                  <li key={wing.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(wing.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-world-green/40 bg-world-green/10"
                          : "border-transparent hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                          active ? "bg-world-green text-primary-foreground" : "bg-muted text-world-ink"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{wing.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{wing.subject}</span>
                        <span className="mt-1 block text-xs font-medium text-primary">
                          {count}/{PER_WING_CAPACITY} books
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            className={`island-toast rounded-2xl border border-border bg-card p-4 ${
              growth === selected ? "ring-2 ring-world-gold/50" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4 text-world-green" />
              <h3 className="font-display text-sm font-bold">{selectedWing.name}</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {selectedWing.description}
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-world-ink">Next reward</span>
              <span className="rounded-full bg-world-gold/20 px-2 py-0.5 text-world-ink">
                {selectedWing.reward}
              </span>
            </div>
            <button
              type="button"
              onClick={() => placeBookOn(selected)}
              disabled={!canPlace}
              className="mt-3 w-full rounded-xl border border-world-green/30 bg-world-green/10 py-2 text-xs font-semibold text-world-green transition hover:bg-world-green/15 disabled:opacity-50"
            >
              Shelve here
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              View
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCameraReset((n) => n + 1)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold hover:bg-muted/60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, z - 0.15))}
                disabled={zoom <= 0.8}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold hover:bg-muted/60"
              >
                <Minus className="h-3.5 w-3.5" />
                Zoom out
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
                disabled={zoom >= 1.6}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold hover:bg-muted/60"
              >
                <Plus className="h-3.5 w-3.5" />
                Zoom in
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              Drag to rotate · Scroll or pinch to zoom · Labels follow each bookcase in 3D
            </p>
          </div>
        </aside>
      </div>

      <AvatarTip
        mood={placing ? "reading" : "waving"}
        message={
          placing
            ? "Your new volume is gliding from the desk to the shelf… 📚"
            : available > 0
              ? `You have ${available} ${available === 1 ? "book" : "books"} waiting. Pick a wing and tap “Shelve a book”.`
              : "No books in your stack yet — finish a project or come back tomorrow for a daily reward. 📖"
        }
      />
    </div>
  );
}
