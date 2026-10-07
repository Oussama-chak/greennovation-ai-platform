import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { libraryApi } from "./api/libraryApi";
import { useLibraryStream } from "./api/useLibraryStream";
import { detectQuality, prefersReducedMotion } from "./lib/quality";
import { useLibraryStore } from "./store/libraryStore";
import { Hud } from "./ui/Hud";
import { ListView } from "./ui/ListView";

const LibraryCanvas = lazy(() =>
  import("./scene/LibraryCanvas").then((m) => ({ default: m.LibraryCanvas })),
);

function SceneLoader() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#3a2416] via-[#4a3020] to-[#2a1a12]">
      <div className="h-14 w-14 animate-pulse rounded-full bg-[#f2b660]/25 ring-2 ring-[#f2b660]/40" />
      <p className="font-[Fraunces,serif] text-xl text-[#f1e6cc]">
        Opening the Wall of Stories…
      </p>
      <p className="text-sm text-[#f1e6cc]/65">Lanterns warming up</p>
    </div>
  );
}

export function WallOfStories() {
  const hydrate = useLibraryStore((s) => s.hydrate);
  const setQuality = useLibraryStore((s) => s.setQuality);
  const setReducedMotion = useLibraryStore((s) => s.setReducedMotion);
  const setError = useLibraryStore((s) => s.setError);
  const ready = useLibraryStore((s) => s.ready);
  const error = useLibraryStore((s) => s.error);
  const quality = useLibraryStore((s) => s.quality);
  const dockTab = useLibraryStore((s) => s.dockTab);
  const awakenBook = useLibraryStore((s) => s.awakenBook);
  const clearAwakening = useLibraryStore((s) => s.clearAwakening);

  const [completing, setCompleting] = useState(false);

  useLibraryStream(ready);

  useEffect(() => {
    setQuality(detectQuality());
    setReducedMotion(prefersReducedMotion());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);

    let cancelled = false;
    libraryApi
      .getSnapshot()
      .then((snap) => {
        if (!cancelled) hydrate(snap);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load wall");
        }
      });

    return () => {
      cancelled = true;
      mq.removeEventListener("change", onChange);
    };
  }, [hydrate, setQuality, setReducedMotion, setError]);

  const onCompleteNext = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const result = await libraryApi.completeNextTask();
      awakenBook(result.book, result.inkAwarded, result.nextBookId);
      toast.success(`Chapter awakened: ${result.book.title}`, {
        description: `+${result.inkAwarded} Ink · ripple polish arrives in step 4`,
      });
      window.setTimeout(() => clearAwakening(), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not awaken chapter");
    } finally {
      setCompleting(false);
    }
  }, [completing, awakenBook, clearAwakening, setError]);

  const show3d = quality !== "none" && dockTab === "wall";
  const showList = quality === "none" || dockTab === "list";

  return (
    <div className="relative -mx-4 -my-6 min-h-[560px] w-[calc(100%+2rem)] overflow-hidden bg-[#2a1a12] lg:-mx-8 lg:-my-8 lg:w-[calc(100%+4rem)] h-[calc(100dvh-5rem)]">
      {!ready && <SceneLoader />}

      {ready && error && (
        <div className="absolute inset-x-0 top-20 z-30 flex justify-center px-4">
          <p className="rounded-xl border border-red-400/40 bg-red-950/70 px-4 py-2 text-sm text-red-100">
            {error}
          </p>
        </div>
      )}

      {ready && show3d && (
        <Suspense fallback={<SceneLoader />}>
          <div className="absolute inset-0">
            <LibraryCanvas />
          </div>
        </Suspense>
      )}

      {ready && showList && (
        <div className="absolute inset-0 z-10 overflow-hidden bg-gradient-to-b from-[#3a2416] to-[#2a1a12] p-4 pb-28 pt-20 sm:p-6 sm:pb-28 sm:pt-24">
          <ListView />
        </div>
      )}

      {ready && (dockTab === "shop" || dockTab === "collection") && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#2a1a12]/88 p-6 pb-28">
          <p className="max-w-sm text-center font-[Fraunces,serif] text-xl text-[#f1e6cc]/80">
            {dockTab === "shop" &&
              "Shop arrives soon — themes, rugs, lamps, and a sleepy cat for Ink."}
            {dockTab === "collection" &&
              "Collection arrives soon — every awakened chapter, searchable."}
          </p>
        </div>
      )}

      {ready && (
        <Hud onCompleteNext={onCompleteNext} completing={completing} />
      )}

      <Toaster position="top-center" />
    </div>
  );
}
