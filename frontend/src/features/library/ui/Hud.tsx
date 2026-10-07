import { Droplets, Flame, Target } from "lucide-react";
import { useLibraryStore } from "../store/libraryStore";
import type { DockTab } from "../types";

const DOCK: { id: DockTab; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "shop", label: "Shop" },
  { id: "collection", label: "Collection" },
  { id: "friends", label: "Visit friends" },
  { id: "list", label: "List view" },
];

type HudProps = {
  onSimulate?: () => void;
  simulating?: boolean;
};

export function Hud({ onSimulate, simulating }: HudProps) {
  const user = useLibraryStore((s) => s.user);
  const ambience = useLibraryStore((s) => s.ambience);
  const items = useLibraryStore((s) => s.items);
  const dockTab = useLibraryStore((s) => s.dockTab);
  const setDockTab = useLibraryStore((s) => s.setDockTab);

  if (!user) return null;

  const stageLabel =
    user.stage === 1 ? "Reading Nook" : user.stage === 2 ? "Study Hall" : "Grand Archive";

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto max-w-[min(100%,420px)] rounded-2xl border border-white/15 bg-[#3a2416]/55 px-3 py-2.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f2b660]/20 font-serif text-lg text-[#f2b660]">
              {user.level}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-lg leading-tight text-[#f1e6cc]">
                Living Library
              </p>
              <p className="text-xs text-[#f1e6cc]/70">
                {stageLabel} · {items.length} books
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#f2b660] transition-all duration-500"
                  style={{ width: `${Math.round(user.levelProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#3a2416]/55 px-2.5 py-2 text-sm text-[#f1e6cc] backdrop-blur-md">
            <Droplets className="h-4 w-4 text-[#2f6f73]" />
            <span className="font-medium tabular-nums">{user.ink}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#3a2416]/55 px-2.5 py-2 text-sm text-[#f1e6cc] backdrop-blur-md">
            <Flame
              className="h-4 w-4 text-[#f2b660]"
              style={{ opacity: 0.35 + (ambience?.candleLevel ?? 0.5) * 0.65 }}
            />
            <span className="tabular-nums">{user.streakDays}d</span>
          </div>
        </div>
      </div>

      {dockTab === "library" && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 px-3 sm:top-24">
          <div className="pointer-events-auto flex max-w-[min(92vw,440px)] items-center gap-2 rounded-full border border-[#d4a537]/40 bg-[#3a2416]/60 px-4 py-2 text-sm text-[#f1e6cc] shadow-lg backdrop-blur-md">
            <Target className="h-3.5 w-3.5 shrink-0 text-[#f2b660]" />
            <span className="truncate">
              Today&apos;s goal:{" "}
              <span className="font-medium">{user.todaysGoal}</span>
            </span>
          </div>
        </div>
      )}

      {dockTab === "library" && (
        <div className="pointer-events-none absolute right-3 top-24 z-20 sm:right-4 sm:top-28">
          <button
            type="button"
            disabled={simulating}
            onClick={onSimulate}
            className="pointer-events-auto rounded-xl border border-[#f2b660]/40 bg-[#f2b660]/15 px-3 py-2 text-xs font-medium text-[#f1e6cc] backdrop-blur-md transition hover:bg-[#f2b660]/25 disabled:opacity-40"
          >
            {simulating ? "Shelving…" : "Simulate milestone"}
          </button>
        </div>
      )}

      <nav
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 sm:p-4"
        aria-label="Library sections"
      >
        <div className="pointer-events-auto flex flex-wrap justify-center gap-1 rounded-2xl border border-white/15 bg-[#3a2416]/65 p-1.5 shadow-lg backdrop-blur-md">
          {DOCK.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDockTab(item.id)}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition sm:text-sm ${
                dockTab === item.id
                  ? "bg-[#f2b660]/25 text-[#f1e6cc]"
                  : "text-[#f1e6cc]/75 hover:bg-white/10 hover:text-[#f1e6cc]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
