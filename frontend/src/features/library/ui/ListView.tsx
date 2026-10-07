import { BookMarked, Compass, Sparkles } from "lucide-react";
import { useLibraryStore } from "../store/libraryStore";
import { countAwakened, findNextBook } from "../types";
import type { WallBook } from "../types";

const STATUS_LABEL: Record<WallBook["status"], string> = {
  sleeping: "Sleeping — waiting to be discovered",
  next: "Next up — gently calling you",
  awake: "Awakened",
};

export function ListView() {
  const walls = useLibraryStore((s) => s.walls);
  const activeWallId = useLibraryStore((s) => s.activeWallId);
  const setActiveWall = useLibraryStore((s) => s.setActiveWall);
  const setOpenBook = useLibraryStore((s) => s.setOpenBook);
  const setFocusBook = useLibraryStore((s) => s.setFocusBook);
  const setDockTab = useLibraryStore((s) => s.setDockTab);

  const wall = walls.find((w) => w.id === activeWallId) ?? null;
  const awakened = countAwakened(wall);
  const next = findNextBook(wall);
  const books = wall
    ? [...wall.items].sort((a, b) => a.slot - b.slot)
    : [];

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-auto pb-4">
      <header className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f2b660]">
          Accessible list view
        </p>
        <h2
          className="font-[Fraunces,serif] text-2xl font-bold text-[#f1e6cc]"
          id="wall-list-heading"
        >
          {wall?.title ?? "Your wall"}
        </h2>
        <p className="text-sm text-[#f1e6cc]/75">
          {awakened} / {wall?.items.length ?? 0} awakened · same books as the 3D wall
        </p>
      </header>

      {walls.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Project walls">
          {walls.map((w) => {
            const active = w.id === activeWallId;
            return (
              <button
                key={w.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveWall(w.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[#f2b660] text-[#2a1a12]"
                    : "bg-[#f1e6cc]/10 text-[#f1e6cc] hover:bg-[#f1e6cc]/20"
                }`}
              >
                {w.title} · {countAwakened(w)}/{w.items.length}
              </button>
            );
          })}
        </div>
      )}

      {next && (
        <button
          type="button"
          onClick={() => {
            setFocusBook(next.id);
            setOpenBook(next.id);
            setDockTab("wall");
          }}
          className="flex items-start gap-3 rounded-2xl border border-[#f2b660]/40 bg-[#f2b660]/10 p-4 text-left transition hover:bg-[#f2b660]/15"
        >
          <Compass className="mt-0.5 h-5 w-5 shrink-0 text-[#f2b660]" />
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[#f2b660]">
              Next up
            </span>
            <span className="mt-1 block font-[Fraunces,serif] text-lg font-semibold text-[#f1e6cc]">
              {next.title}
            </span>
            <span className="mt-1 block text-xs text-[#f1e6cc]/70">
              {next.subject}
              {next.dueDate ? ` · due ${next.dueDate}` : ""}
            </span>
          </span>
        </button>
      )}

      <ul className="space-y-2" aria-labelledby="wall-list-heading">
        {books.map((book) => (
          <li key={book.id}>
            <button
              type="button"
              onClick={() => setOpenBook(book.id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2b660] ${
                book.status === "next"
                  ? "border-[#f2b660]/50 bg-[#f2b660]/10"
                  : book.status === "awake"
                    ? "border-[#f1e6cc]/20 bg-[#f1e6cc]/5"
                    : "border-transparent bg-[#1a120c]/40 hover:border-[#f1e6cc]/15"
              }`}
            >
              <span
                className="mt-1 h-8 w-2.5 shrink-0 rounded-sm"
                style={{
                  background:
                    book.status === "awake"
                      ? book.color
                      : book.isMystery
                        ? "#d4a537"
                        : "#8a7c6a",
                  opacity: book.status === "sleeping" ? 0.65 : 1,
                }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#f1e6cc]">{book.title}</span>
                  {book.isMystery && (
                    <Sparkles className="h-3.5 w-3.5 text-[#d4a537]" aria-label="Mystery book" />
                  )}
                  {book.status === "awake" && (
                    <BookMarked className="h-3.5 w-3.5 text-[#f2b660]" aria-hidden />
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-[#f1e6cc]/65">
                  {book.subject} · {STATUS_LABEL[book.status]}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
