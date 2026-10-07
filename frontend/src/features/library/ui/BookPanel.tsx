import { X } from "lucide-react";
import { useLibraryStore } from "../store/libraryStore";

type BookPanelProps = {
  onOpenRag?: (sourceId: string, title: string) => void;
};

export function BookPanel({ onOpenRag }: BookPanelProps) {
  const openItemId = useLibraryStore((s) => s.openItemId);
  const items = useLibraryStore((s) => s.items);
  const setOpenItem = useLibraryStore((s) => s.setOpenItem);
  const item = items.find((i) => i.id === openItemId);

  if (!item) return null;

  return (
    <aside
      className="absolute bottom-24 right-3 z-30 w-[min(92vw,360px)] rounded-2xl border border-white/15 bg-[#3a2416]/90 p-4 text-[#f1e6cc] shadow-2xl backdrop-blur-md sm:right-4"
      role="dialog"
      aria-label={`Book: ${item.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#f2b660]/85">
            {item.type.replace("_", " ")} · {item.rarity}
          </p>
          <h3 className="mt-1 font-serif text-xl leading-snug">{item.title}</h3>
          <p className="mt-1 text-xs text-[#f1e6cc]/65">
            {item.subject}
            {item.onTime ? " · Gold seal: on time" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenItem(null)}
          className="rounded-lg p-1.5 text-[#f1e6cc]/70 hover:bg-white/10 hover:text-[#f1e6cc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2b660]"
          aria-label="Close book"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="mt-3 h-1.5 w-16 rounded-full"
        style={{ backgroundColor: item.color }}
        aria-hidden
      />

      <p className="mt-3 text-sm leading-relaxed text-[#f1e6cc]/90">
        {item.summary ??
          "A chapter earned by your study. Open it anytime to remember how far you have come."}
      </p>

      {item.type === "corpus_doc" && item.sourceId && (
        <button
          type="button"
          onClick={() => onOpenRag?.(item.sourceId!, item.title)}
          className="mt-4 w-full rounded-xl bg-[#2f6f73]/80 px-3 py-2.5 text-sm font-medium text-[#f1e6cc] transition hover:bg-[#2f6f73]"
        >
          Ask about this document
        </button>
      )}

      <p className="mt-3 text-[11px] text-[#f1e6cc]/50">
        Unlocked {new Date(item.unlockedAt).toLocaleDateString()}
      </p>
    </aside>
  );
}
