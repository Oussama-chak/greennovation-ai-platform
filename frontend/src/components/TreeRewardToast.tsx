import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, X, Sparkles, Gift } from "lucide-react";
import { Panda } from "@/components/PandaCompanion";
import { PENDING_REWARD_KEY } from "@/components/DailyReward";
import { useTreeInventory } from "@/hooks/useTreeInventory";
import { clearLastReward, type TreeReward } from "@/lib/treeInventory";

const BOOK_COVER = "/wallOfStories/books/cover-honey.png";

// Plays a soft, pleasant chime when a tree is earned.
function playChime() {
  try {
    type AC = typeof AudioContext;
    const w = window as unknown as { AudioContext?: AC; webkitAudioContext?: AC };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(now + i * 0.08);
      o.stop(now + i * 0.08 + 0.4);
    });
  } catch {
    // ignore
  }
}

export function TreeRewardToast() {
  const { lastReward } = useTreeInventory();
  const [active, setActive] = useState<TreeReward | null>(null);
  const navigate = useNavigate();
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!lastReward) return;
    if (seenIds.current.has(lastReward.id)) return;
    seenIds.current.add(lastReward.id);
    setActive(lastReward);
    playChime();
  }, [lastReward]);

  const close = (visit: boolean) => {
    setActive(null);
    clearLastReward();
    if (visit) {
      localStorage.setItem(PENDING_REWARD_KEY, "1");
      navigate({ to: "/forest", search: { reward: 1 } as never });
    }
  };

  if (!active) return null;

  // Daily rewards have their own dedicated DailyReward modal — don't double-show.
  if (active.reason === "daily") return null;

  const isProject = active.reason === "project";

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-4 animate-[fade-in-up_0.3s_ease-out]">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-md"
        onClick={() => close(false)}
      />
      <div
        className="relative w-full max-w-md rounded-3xl bg-card border border-primary/20 shadow-glow overflow-hidden animate-[tree-pop_0.7s_cubic-bezier(0.34,1.56,0.64,1)]"
        role="status"
        aria-live="polite"
      >
        {/* Decorative gradient header */}
        <div className="relative h-32 gradient-forest overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary-glow/40 blur-3xl" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-accent/40 blur-2xl" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute text-xl animate-[leaf-fall_5s_ease-in-out_infinite]"
              style={{
                left: `${10 + i * 18}%`,
                top: 0,
                animationDelay: `${i * 0.6}s`,
              }}
            >
              ✨
            </div>
          ))}
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative">
              <img
                src={BOOK_COVER}
                alt="New book for your library"
                className="h-24 w-auto drop-shadow-xl animate-[float_4s_ease-in-out_infinite]"
              />
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-warning animate-[seed-sparkle_1.6s_ease-in-out_infinite]" />
              <Sparkles
                className="absolute -bottom-1 -left-3 h-4 w-4 text-primary animate-[seed-sparkle_1.6s_ease-in-out_infinite]"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
          <button
            onClick={() => close(false)}
            aria-label="Close"
            className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-card/70 hover:bg-card transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            <Gift className="h-3 w-3" /> {isProject ? "Project complete" : "New chapter"}
          </div>
          <h2 className="font-display text-2xl font-bold mt-3">
            {isProject ? "You earned a new book!" : "A new book is ready"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 italic leading-relaxed">
            "{active.message}"
          </p>

          <div className="flex items-center gap-3 mt-5 rounded-2xl bg-muted/60 p-3 text-left">
            <Panda mood="waving" size={48} className="shrink-0" />
            <p className="text-xs text-foreground/80 leading-snug">
              Open your Knowledge Library and it will wake the next chapter on your Wall of Stories.
            </p>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => close(false)}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted transition"
            >
              Later
            </button>
            <button
              onClick={() => close(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-bold shadow-glow hover:opacity-95 transition"
            >
              Open your library
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
