import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { AvatarTip } from "@/components/AvatarTip";
import { PENDING_REWARD_KEY } from "@/components/DailyReward";
import { useEffect, useRef, useState, useCallback } from "react";
import { Trees, Flame, Leaf, Award, Sprout, Sparkles, Gift } from "lucide-react";
import treeOak from "@/assets/tree-oak.png";
import treePine from "@/assets/tree-pine.png";
import treeBlossom from "@/assets/tree-blossom.png";
import treeBamboo from "@/assets/tree-bamboo.png";
import { useTreeInventory } from "@/hooks/useTreeInventory";
import { useForest, useForestInventory, usePlantTree } from "@/hooks/useForest";
import { consumeTree } from "@/lib/treeInventory";

export const Route = createFileRoute("/forest")({
  validateSearch: (s: Record<string, unknown>) => ({
    reward: s.reward === 1 || s.reward === "1" ? 1 : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Eco Forest — EcoLearn AI" },
      {
        name: "description",
        content: "Grow a virtual forest by studying consistently — every session waters a tree.",
      },
      { property: "og:title", content: "Eco Forest — EcoLearn AI" },
      {
        property: "og:description",
        content: "Gamified, sustainable, and a little bit magical.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <ForestPage />
    </AppLayout>
  ),
});

type TreeKind = "oak" | "pine" | "blossom" | "bamboo";
type Tree = {
  id: number;
  kind: TreeKind;
  x: number;
  y: number;
  scale: number;
  growing?: boolean;
  isBamboo?: boolean;
};

const TREE_IMG: Record<TreeKind, string> = {
  oak: treeOak,
  pine: treePine,
  blossom: treeBlossom,
  bamboo: treeBamboo,
};

const PLANT_KINDS: TreeKind[] = ["oak", "pine", "blossom", "bamboo"];

function pickKind(): TreeKind {
  return PLANT_KINDS[Math.floor(Math.random() * PLANT_KINDS.length)];
}

function asTreeKind(kind: string): TreeKind {
  return PLANT_KINDS.includes(kind as TreeKind) ? (kind as TreeKind) : "oak";
}

// Pre-planted trees scattered to look like a real forest (back → front).
const INITIAL_TREES: Tree[] = [
  { id: 1, kind: "oak", x: 10, y: 50, scale: 0.55 },
  { id: 2, kind: "blossom", x: 24, y: 48, scale: 0.58 },
  { id: 3, kind: "pine", x: 38, y: 51, scale: 0.6 },
  { id: 4, kind: "oak", x: 52, y: 49, scale: 0.56 },
  { id: 5, kind: "pine", x: 66, y: 50, scale: 0.58 },
  { id: 6, kind: "blossom", x: 80, y: 48, scale: 0.56 },
  { id: 7, kind: "oak", x: 92, y: 51, scale: 0.55 },
  { id: 8, kind: "blossom", x: 14, y: 76, scale: 0.78 },
  { id: 9, kind: "pine", x: 32, y: 80, scale: 0.82 },
  { id: 10, kind: "oak", x: 50, y: 78, scale: 0.85 },
  { id: 11, kind: "blossom", x: 68, y: 80, scale: 0.78 },
  { id: 12, kind: "pine", x: 86, y: 76, scale: 0.8 },
];

function ForestPage() {
  const { reward } = Route.useSearch();
  const { count: localAvailable } = useTreeInventory();
  const { data: backendForest, isLoading: forestLoading } = useForest();
  const { data: backendInventory } = useForestInventory();
  const { mutate: plantViaBackend, isPending: backendPlanting } = usePlantTree();

  const available = backendInventory?.available ?? localAvailable;
  const backendTrees = backendForest?.trees ?? [];

  const [trees, setTrees] = useState<Tree[]>(INITIAL_TREES);
  const [planting, setPlanting] = useState(false);
  const [growSpot, setGrowSpot] = useState<{ x: number; y: number } | null>(null);
  const claimedRef = useRef(false);
  const sceneRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!forestLoading && backendTrees.length > 0) {
      const convertedTrees: Tree[] = backendTrees.map((t) => ({
        id: parseInt(t.id.slice(0, 10), 10) || Date.now() + Math.random(),
        kind: asTreeKind(t.kind),
        x: t.x,
        y: t.y,
        scale: t.scale,
        growing: false,
      }));
      setTrees(INITIAL_TREES.concat(convertedTrees));
    }
  }, [forestLoading, backendTrees]);

  const stats = [
    {
      icon: Trees,
      label: "Trees grown",
      value: String(trees.length),
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Gift,
      label: "Trees to plant",
      value: String(available),
      color: "bg-warning/15 text-warning-foreground",
    },
    { icon: Flame, label: "Streak", value: "4 days", color: "bg-accent text-accent-foreground" },
    { icon: Award, label: "Level", value: "Sprout · 3", color: "bg-info/10 text-info" },
  ];

  const plantTreeAt = useCallback((x: number, y: number, treekind?: TreeKind) => {
    const kind = treekind ?? pickKind();
    const scale = 0.7 + Math.random() * 0.2;
    const newTree: Tree = {
      id: Date.now(),
      kind,
      x,
      y,
      scale,
      growing: true,
      isBamboo: kind === "bamboo",
    };
    setGrowSpot({ x, y });
    setTrees((t) => [...t, newTree]);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        sceneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    setTimeout(() => setGrowSpot(null), 1800);
    setTimeout(() => {
      setTrees((t) => t.map((tr) => (tr.id === newTree.id ? { ...tr, growing: false } : tr)));
      setPlanting(false);
    }, 2600);
  }, []);

  const plantTree = useCallback(() => {
    if (planting || backendPlanting) return;
    if (available <= 0) return;

    const x = 8 + Math.random() * 84;
    const y = 60 + Math.random() * 28;
    const kind = pickKind();
    setPlanting(true);

    if (backendInventory) {
      plantViaBackend(
        { kind, x, y, scale: 0.7 + Math.random() * 0.2 },
        {
          onSuccess: () => {
            consumeTree();
            plantTreeAt(x, y, kind);
          },
          onError: () => {
            if (consumeTree()) {
              plantTreeAt(x, y, kind);
            } else {
              setPlanting(false);
            }
          },
        },
      );
    } else if (consumeTree()) {
      plantTreeAt(x, y, kind);
    } else {
      setPlanting(false);
    }
  }, [planting, backendPlanting, available, backendInventory, plantViaBackend, plantTreeAt]);

  useEffect(() => {
    if (claimedRef.current) return;
    if (typeof window === "undefined") return;
    const pending = localStorage.getItem(PENDING_REWARD_KEY);
    if (reward === 1 && pending === "1" && available > 0) {
      claimedRef.current = true;
      localStorage.removeItem(PENDING_REWARD_KEY);

      const x = 20 + Math.random() * 60;
      const y = 64 + Math.random() * 22;
      const kind = pickKind();

      if (backendInventory) {
        plantViaBackend(
          { kind, x, y, scale: 0.7 + Math.random() * 0.2 },
          {
            onSuccess: () => {
              consumeTree();
              setPlanting(true);
              setTimeout(() => plantTreeAt(x, y, kind), 700);
            },
            onError: () => {
              if (consumeTree()) {
                setPlanting(true);
                setTimeout(() => plantTreeAt(x, y, kind), 700);
              }
            },
          },
        );
      } else if (consumeTree()) {
        setPlanting(true);
        setTimeout(() => plantTreeAt(x, y, kind), 700);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward, available, backendInventory, plantViaBackend, plantTreeAt]);

  const canPlant = available > 0 && !planting && !backendPlanting;
  const buttonLabel =
    planting || backendPlanting
      ? "Planting…"
      : available > 0
        ? `Plant a tree (${available})`
        : "No trees available";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 animate-[fade-in-up_0.5s_ease-out]">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
            Eco Forest
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-snug">
            Trees are planted one seed at a time;
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              {" "}
              success is built one step at a time.
            </span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm sm:text-base">
            Earn trees by studying daily and completing projects. Each one you plant grows here
            forever.
          </p>
        </div>
        <div className="relative group shrink-0">
          <button
            type="button"
            onClick={plantTree}
            disabled={!canPlant}
            className="inline-flex items-center gap-2 rounded-xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sprout className="h-4 w-4" />
            {buttonLabel}
          </button>
          {available <= 0 && !planting && (
            <span className="pointer-events-none absolute right-0 top-full mt-2 rounded-lg bg-foreground text-background text-[11px] font-semibold px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
              No trees available — earn one by studying or completing a project
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-card border border-border p-4">
            <div className={`h-10 w-10 rounded-xl grid place-items-center ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <section
        ref={sceneRef}
        className="rounded-3xl relative overflow-hidden border border-primary/10"
      >
        <div
          className="relative w-full"
          style={{
            height: "min(620px, 75vh)",
            background:
              "linear-gradient(to bottom, oklch(0.92 0.06 230) 0%, oklch(0.95 0.05 200) 35%, oklch(0.88 0.10 145) 55%, oklch(0.78 0.13 140) 80%, oklch(0.70 0.14 145) 100%)",
          }}
        >
          <div
            className="absolute h-20 w-20 rounded-full"
            style={{
              top: "8%",
              right: "10%",
              background:
                "radial-gradient(circle, oklch(0.95 0.14 90) 0%, oklch(0.92 0.12 80 / 0.4) 60%, transparent 100%)",
            }}
          />

          <svg
            className="absolute inset-x-0 top-[18%] w-full"
            viewBox="0 0 1000 120"
            preserveAspectRatio="none"
            style={{ height: "12%" }}
            aria-hidden
          >
            <path
              d="M0,120 L0,70 L120,30 L220,80 L340,20 L460,70 L580,30 L720,80 L860,40 L1000,70 L1000,120 Z"
              fill="oklch(0.78 0.06 200 / 0.55)"
            />
            <path
              d="M0,120 L0,90 L160,55 L300,90 L440,50 L600,90 L760,60 L900,90 L1000,80 L1000,120 Z"
              fill="oklch(0.70 0.07 180 / 0.65)"
            />
          </svg>

          <svg
            className="absolute inset-x-0 bottom-0 w-full"
            viewBox="0 0 1000 220"
            preserveAspectRatio="none"
            style={{ height: "55%" }}
            aria-hidden
          >
            <path
              d="M0,220 L0,80 Q250,20 500,70 T1000,60 L1000,220 Z"
              fill="oklch(0.82 0.12 145)"
            />
            <path
              d="M0,220 L0,140 Q300,90 600,130 T1000,120 L1000,220 Z"
              fill="oklch(0.74 0.14 145)"
            />
            <path
              d="M0,220 L0,180 Q350,150 700,175 T1000,170 L1000,220 Z"
              fill="oklch(0.66 0.15 145)"
            />
          </svg>

          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute text-2xl pointer-events-none animate-[leaf-fall_6s_ease-in-out_infinite]"
              style={{
                left: `${15 + i * 22}%`,
                top: 0,
                animationDelay: `${i * 1.4}s`,
              }}
            >
              🍃
            </div>
          ))}

          {growSpot && (
            <>
              <div
                className="absolute pointer-events-none rounded-full"
                style={{
                  left: `${growSpot.x}%`,
                  top: `${growSpot.y}%`,
                  width: 130,
                  height: 130,
                  background:
                    "radial-gradient(circle, oklch(0.95 0.18 90 / 0.8) 0%, oklch(0.85 0.18 145 / 0.5) 45%, transparent 80%)",
                  animation: "ground-pulse 1.8s ease-out forwards",
                  zIndex: 1,
                  transform: "translate(-50%, -50%)",
                }}
              />
              {Array.from({ length: 12 }).map((_, i) => {
                const drift = (i % 2 === 0 ? 1 : -1) * (8 + ((i * 7) % 28));
                const delay = (i * 0.12).toFixed(2);
                const dur = (1.8 + (i % 4) * 0.35).toFixed(2);
                return (
                  <div
                    key={`p-${i}`}
                    className="absolute pointer-events-none"
                    style={{
                      left: `calc(${growSpot.x}% + ${(i - 6) * 6}px)`,
                      top: `${growSpot.y}%`,
                      width: 8,
                      height: 8,
                      borderRadius: "9999px",
                      background:
                        "radial-gradient(circle, oklch(0.95 0.16 145 / 0.95) 0%, oklch(0.88 0.18 90 / 0.6) 60%, transparent 100%)",
                      ["--px" as string]: `${drift}px`,
                      animation: `particle-float ${dur}s ease-out ${delay}s forwards`,
                      zIndex: 90,
                    }}
                  />
                );
              })}
              {Array.from({ length: 5 }).map((_, i) => {
                const drift = (i % 2 === 0 ? 1 : -1) * (14 + i * 6);
                const delay = (0.3 + i * 0.18).toFixed(2);
                return (
                  <div
                    key={`l-${i}`}
                    className="absolute pointer-events-none text-base"
                    style={{
                      left: `calc(${growSpot.x}% + ${(i - 2) * 10}px)`,
                      top: `calc(${growSpot.y}% - 6px)`,
                      ["--px" as string]: `${drift}px`,
                      animation: `particle-float ${2.6 + (i % 3) * 0.4}s ease-out ${delay}s forwards`,
                      opacity: 0.85,
                      zIndex: 91,
                    }}
                  >
                    🍃
                  </div>
                );
              })}
            </>
          )}

          {trees.map((t) => {
            const idleAnim = !t.growing
              ? `leaf-sway ${4 + (t.id % 5) * 0.5}s ease-in-out ${(t.id % 7) * 0.3}s infinite`
              : undefined;
            const growAnim = t.growing
              ? t.isBamboo
                ? `bamboo-grow 2.3s cubic-bezier(0.34, 1.2, 0.64, 1) forwards`
                : `tree-grow 2.4s cubic-bezier(0.34, 1.2, 0.64, 1) forwards`
              : undefined;
            return (
              <img
                key={t.id}
                src={TREE_IMG[t.kind]}
                alt={`${t.kind} tree`}
                className="absolute pointer-events-none"
                style={{
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  transform: `translate(-50%, -100%) scale(${t.scale})`,
                  transformOrigin: "bottom center",
                  width: 130,
                  height: 130,
                  zIndex: Math.round(t.y),
                  animation: growAnim ?? idleAnim,
                }}
                loading="lazy"
              />
            );
          })}

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-50">
            <div className="rounded-2xl bg-card/80 px-3 py-1.5 border border-border/40">
              <div className="text-[10px] uppercase tracking-widest font-bold text-primary">
                Spring grove · 2025
              </div>
              <div className="text-xs font-semibold">{trees.length} trees thriving</div>
            </div>
            <span className="rounded-full bg-card/80 px-3 py-1.5 text-xs font-semibold border border-border/40 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" /> Bamboo specialty 🎋
            </span>
          </div>
        </div>
      </section>

      <AvatarTip
        mood={planting ? "reading" : "waving"}
        message={
          planting
            ? "A tiny seed is unfurling into a bamboo tree… watch it grow! 🎋"
            : available > 0
              ? `You have ${available} ${available === 1 ? "tree" : "trees"} ready to plant. Tap “Plant a tree” to grow your forest. 🌱`
              : "No trees in your inventory yet — finish a project or come back tomorrow to earn one. 🌿"
        }
      />
    </div>
  );
}
