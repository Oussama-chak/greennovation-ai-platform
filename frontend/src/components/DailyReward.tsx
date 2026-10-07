import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Gift, X, ArrowRight } from "lucide-react";
import { Panda } from "@/components/PandaCompanion";
import treeSapling from "@/assets/tree-sapling.png";
import { awardTree, todayDedupeKey } from "@/lib/treeInventory";

const QUOTES = [
  "Small steps every day grow into mighty forests. 🌳",
  "Your future self is cheering for the work you do today.",
  "Consistency beats intensity. One page, one quiz, one breath.",
  "The best time to plant a tree was 20 years ago. The second best is today. 🌱",
  "Progress, not perfection — your forest grows leaf by leaf.",
  "You don't have to be great to start, but you have to start to be great.",
  "Every focused minute waters a sapling somewhere in your mind.",
  "Knowledge is the only thing that grows when you share it. 🌿",
];

const STORAGE_KEY = "routiny:lastReward";
export const PENDING_REWARD_KEY = "routiny:pendingTree";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function DailyReward() {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState(QUOTES[0]);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const last = localStorage.getItem(STORAGE_KEY);
    if (last !== todayKey()) {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      setQuote(q);
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const claim = (visit: boolean) => {
    localStorage.setItem(STORAGE_KEY, todayKey());
    localStorage.setItem(PENDING_REWARD_KEY, "1");
    // Add to inventory (deduped per day) so it shows up on /forest as available.
    awardTree("daily", "Daily activity bonus — a new knowledge seed for your library!", todayDedupeKey());
    setOpen(false);
    if (visit) {
      navigate({ to: "/forest", search: { reward: 1 } });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 animate-[fade-in-up_0.3s_ease-out]">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-md"
        onClick={() => claim(false)}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-card border border-primary/20 shadow-glow overflow-hidden animate-[tree-pop_0.7s_cubic-bezier(0.34,1.56,0.64,1)]">
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
              🍃
            </div>
          ))}
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative">
              <img
                src={treeSapling}
                alt="Daily tree reward"
                className="h-24 drop-shadow-xl animate-[float_4s_ease-in-out_infinite]"
              />
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-warning animate-[seed-sparkle_1.6s_ease-in-out_infinite]" />
              <Sparkles
                className="absolute -bottom-1 -left-3 h-4 w-4 text-primary animate-[seed-sparkle_1.6s_ease-in-out_infinite]"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
          <button
            onClick={() => claim(false)}
            aria-label="Close"
            className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-card/70 hover:bg-card transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            <Gift className="h-3 w-3" /> Daily reward
          </div>
          <h2 className="font-display text-2xl font-bold mt-3">
            A knowledge seed for you! 🌱
          </h2>
          <p className="text-sm text-muted-foreground mt-2 italic leading-relaxed">
            "{quote}"
          </p>

          <div className="flex items-center gap-3 mt-5 rounded-2xl bg-muted/60 p-3 text-left">
            <Panda mood="waving" size={48} className="shrink-0" />
            <p className="text-xs text-foreground/80 leading-snug">
              Take it to your Knowledge Library and add a new book.
            </p>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => claim(false)}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted transition"
            >
              Later
            </button>
            <button
              onClick={() => claim(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-bold shadow-glow hover:opacity-95 transition"
            >
              Add a book
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
