import {
  BookOpen,
  Droplets,
  Flame,
  LayoutGrid,
  Layers,
  List,
  ShoppingBag,
} from "lucide-react";
import { useLibraryStore } from "../store/libraryStore";
import { countAwakened, findNextBook } from "../types";
import type { DockTab } from "../types";
import { ProgressRing } from "./ProgressRing";

type Props = {
  onCompleteNext?: () => void;
  completing?: boolean;
};

const DOCK: { id: DockTab; label: string; icon: typeof BookOpen }[] = [
  { id: "wall", label: "Wall", icon: BookOpen },
  { id: "collection", label: "Collection", icon: LayoutGrid },
  { id: "shop", label: "Shop", icon: ShoppingBag },
  { id: "walls", label: "Walls", icon: Layers },
  { id: "list", label: "List", icon: List },
];

export function Hud({ onCompleteNext, completing }: Props) {
  const walls = useLibraryStore((s) => s.walls);
  const activeWallId = useLibraryStore((s) => s.activeWallId);
  const user = useLibraryStore((s) => s.user);
  const dockTab = useLibraryStore((s) => s.dockTab);
  const setDockTab = useLibraryStore((s) => s.setDockTab);
  const setFocusBook = useLibraryStore((s) => s.setFocusBook);
  const setActiveWall = useLibraryStore((s) => s.setActiveWall);

  const wall = walls.find((w) => w.id === activeWallId) ?? null;
  const awakened = countAwakened(wall);
  const total = wall?.items.length ?? 0;
  const next = findNextBook(wall);

  if (!user || !wall) return null;

  return (
    <>
      {/* Top glass HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#f1e6cc]/15 bg-[#2a1a12]/55 px-3 py-2 shadow-lg backdrop-blur-md">
          <ProgressRing current={awakened} total={total} size={56} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#f2b660]">
              Wall of Stories
            </p>
            <h1 className="font-[Fraunces,serif] text-lg font-bold leading-tight text-[#f1e6cc] sm:text-xl">
              {wall.title}
            </h1>
            <p className="text-xs text-[#f1e6cc]/70">
              {awakened} / {total} awakened
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[#f1e6cc]/15 bg-[#2a1a12]/55 px-3 py-1.5 text-sm font-semibold text-[#f1e6cc] backdrop-blur-md">
            <Droplets className="h-4 w-4 text-[#f2b660]" />
            {user.ink} Ink
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#f1e6cc]/15 bg-[#2a1a12]/55 px-3 py-1.5 text-xs font-semibold text-[#f1e6cc] backdrop-blur-md">
            <Flame className="h-3.5 w-3.5 text-[#f2b660]" />
            {user.streakDays}-day streak
          </div>
        </div>
      </div>

      {/* Next up chip */}
      {next && (
        <button
          type="button"
          onClick={() => {
            setFocusBook(next.id);
            setDockTab("wall");
          }}
          className="absolute left-1/2 top-[5.5rem] z-20 -translate-x-1/2 rounded-full border border-[#f2b660]/45 bg-[#2a1a12]/65 px-4 py-2 text-xs font-semibold text-[#f1e6cc] shadow-lg backdrop-blur-md transition hover:border-[#f2b660] sm:top-24"
        >
          <span className="text-[#f2b660]">Next up · </span>
          {next.title}
        </button>
      )}

      {/* Librarian teaser bubble */}
      <div className="absolute bottom-24 left-3 z-20 max-w-[220px] rounded-2xl border border-[#f1e6cc]/15 bg-[#2a1a12]/6 px-3 py-2 text-xs leading-relaxed text-[#f1e6cc]/90 backdrop-blur-md sm:left-4">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-[#f2b660]">
          Librarian
        </p>
        The wall is dreaming in soft sepia. Finish a task and a chapter will wake.
      </div>

      {/* Dev control — step 4 will own the full awakening FX */}
      {onCompleteNext && (
        <button
          type="button"
          disabled={completing || !next}
          onClick={onCompleteNext}
          className="absolute bottom-24 right-3 z-20 rounded-xl border border-[#f2b660]/40 bg-[#f2b660]/15 px-3 py-2 text-xs font-bold text-[#f2b660] backdrop-blur-md transition hover:bg-[#f2b660]/25 disabled:opacity-40 sm:right-4"
        >
          {completing ? "Awakening…" : "Dev: complete next task"}
        </button>
      )}

      {/* Bottom dock */}
      <nav
        className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 sm:p-4"
        aria-label="Library dock"
      >
        <div className="flex items-center gap-1 rounded-2xl border border-[#f1e6cc]/15 bg-[#2a1a12]/7 p-1.5 shadow-xl backdrop-blur-md">
          {DOCK.map(({ id, label, icon: Icon }) => {
            const active = dockTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === "walls") {
                    const idx = walls.findIndex((w) => w.id === activeWallId);
                    const nextWall = walls[(idx + 1) % walls.length];
                    if (nextWall) setActiveWall(nextWall.id);
                    setDockTab("wall");
                    return;
                  }
                  setDockTab(id);
                }}
                className={`flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 text-[10px] font-semibold transition sm:min-w-[5rem] ${
                  active
                    ? "bg-[#f2b660]/20 text-[#f2b660]"
                    : "text-[#f1e6cc]/75 hover:bg-[#f1e6cc]/8 hover:text-[#f1e6cc]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
