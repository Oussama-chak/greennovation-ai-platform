import { BookMarked, FileText, Flame, ScrollText, Sparkles } from "lucide-react";
import { useLibraryStore } from "../store/libraryStore";
import type { LibraryItem } from "../types";

function TypeIcon({ type }: { type: LibraryItem["type"] }) {
  switch (type) {
    case "corpus_doc":
      return <BookMarked className="h-4 w-4 text-[#d4a537]" />;
    case "session_summary":
      return <ScrollText className="h-4 w-4 text-[#2f6f73]" />;
    case "achievement":
      return <Sparkles className="h-4 w-4 text-[#f2b660]" />;
    case "journal":
      return <Flame className="h-4 w-4 text-[#8b2f3a]" />;
    default:
      return <FileText className="h-4 w-4 text-[#f1e6cc]/70" />;
  }
}

export function ListView() {
  const items = useLibraryStore((s) => s.items);
  const selectedItemId = useLibraryStore((s) => s.selectedItemId);
  const setOpenItem = useLibraryStore((s) => s.setOpenItem);
  const user = useLibraryStore((s) => s.user);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <header className="shrink-0">
        <p className="text-xs uppercase tracking-[0.2em] text-[#f2b660]/80">
          Accessible view
        </p>
        <h2 className="mt-1 font-serif text-2xl text-[#f1e6cc]">Your living library</h2>
        <p className="mt-1 text-sm text-[#f1e6cc]/75">
          {items.length} books · Level {user?.level ?? "—"} ·{" "}
          {user?.todaysGoal ?? "Open a book when you are ready."}
        </p>
      </header>

      <ul
        className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
        aria-label="Library books"
      >
        {items.map((item) => {
          const selected = item.id === selectedItemId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenItem(item.id)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2b660] ${
                  selected
                    ? "border-[#f2b660]/70 bg-[#f2b660]/15"
                    : "border-white/10 bg-[#3a2416]/50 hover:border-[#f2b660]/35"
                }`}
              >
                <span
                  className="mt-0.5 h-8 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <TypeIcon type={item.type} />
                    <span className="truncate text-sm font-medium text-[#f1e6cc]">
                      {item.title}
                    </span>
                    {item.onTime && (
                      <span className="rounded bg-[#d4a537]/25 px-1.5 py-0.5 text-[10px] text-[#f2b660]">
                        On time
                      </span>
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-2 text-xs text-[#f1e6cc]/65">
                    <span>{item.subject}</span>
                    <span aria-hidden>·</span>
                    <span className="capitalize">{item.type.replace("_", " ")}</span>
                    <span aria-hidden>·</span>
                    <span className="capitalize">{item.rarity}</span>
                  </span>
                  {item.summary && (
                    <span className="mt-2 block text-xs text-[#f1e6cc]/80">
                      {item.summary}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
