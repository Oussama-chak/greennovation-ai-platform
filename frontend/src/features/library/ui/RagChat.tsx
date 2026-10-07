import { X } from "lucide-react";

type RagChatProps = {
  title: string;
  sourceId: string;
  onClose: () => void;
};

/** Lightweight scoped chat panel — wires to Learning Agent later. */
export function RagChat({ title, sourceId, onClose }: RagChatProps) {
  return (
    <div
      className="absolute bottom-24 left-3 z-30 flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#3a2416]/92 shadow-2xl backdrop-blur-md sm:left-4"
      role="dialog"
      aria-label={`Ask about ${title}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#f2b660]/85">
            Document chat
          </p>
          <h3 className="font-serif text-lg text-[#f1e6cc]">{title}</h3>
          <p className="text-[11px] text-[#f1e6cc]/50">Scoped to {sourceId}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#f1e6cc]/70 hover:bg-white/10"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-2 px-4 py-3 text-sm text-[#f1e6cc]/85">
        <p>
          Ask anything about this document. Full RAG wiring lands with the backend
          step — for now this panel is ready for the Learning Agent.
        </p>
      </div>
      <form
        className="flex gap-2 border-t border-white/10 p-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <input
          type="text"
          placeholder="Ask a question…"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-[#f1e6cc] placeholder:text-[#f1e6cc]/40 focus:outline focus:outline-2 focus:outline-[#f2b660]"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#2f6f73] px-3 py-2 text-sm font-medium text-[#f1e6cc]"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
