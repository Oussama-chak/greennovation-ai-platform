import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { libraryApi } from "@/features/library/api/libraryApi";
import { useLibraryStream } from "@/features/library/api/useLibraryStream";
import { detectQuality } from "@/features/library/lib/quality";
import { useLibraryStore } from "@/features/library/store/libraryStore";
import { BookPanel } from "@/features/library/ui/BookPanel";
import { Hud } from "@/features/library/ui/Hud";
import { ListView } from "@/features/library/ui/ListView";
import { RagChat } from "@/features/library/ui/RagChat";

const LibraryCanvas = lazy(() =>
  import("@/features/library/scene/LibraryCanvas").then((m) => ({
    default: m.LibraryCanvas,
  })),
);

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Living Library — Routiny" },
      {
        name: "description",
        content:
          "A 3D library that grows with every study milestone. Warm, inviting, and yours.",
      },
      { property: "og:title", content: "Living Library — Routiny" },
    ],
  }),
  component: () => (
    <AppLayout>
      <LivingLibraryPage />
    </AppLayout>
  ),
});

function SceneLoader() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#3a2416] via-[#4a3020] to-[#2a1a12]">
      <div className="h-14 w-14 animate-pulse rounded-full bg-[#f2b660]/25 ring-2 ring-[#f2b660]/40" />
      <p className="font-serif text-xl text-[#f1e6cc]">Opening your reading nook…</p>
      <p className="text-sm text-[#f1e6cc]/65">Lanterns warming up</p>
    </div>
  );
}

function LivingLibraryPage() {
  const hydrate = useLibraryStore((s) => s.hydrate);
  const setQuality = useLibraryStore((s) => s.setQuality);
  const setError = useLibraryStore((s) => s.setError);
  const ready = useLibraryStore((s) => s.ready);
  const error = useLibraryStore((s) => s.error);
  const quality = useLibraryStore((s) => s.quality);
  const dockTab = useLibraryStore((s) => s.dockTab);
  const addItem = useLibraryStore((s) => s.addItem);
  const clearDrop = useLibraryStore((s) => s.clearDrop);
  const setOpenItem = useLibraryStore((s) => s.setOpenItem);
  const openItemId = useLibraryStore((s) => s.openItemId);

  const [simulating, setSimulating] = useState(false);
  const [rag, setRag] = useState<{ sourceId: string; title: string } | null>(null);

  useLibraryStream(ready);

  useEffect(() => {
    setQuality(detectQuality());
    let cancelled = false;
    libraryApi
      .getSnapshot()
      .then((snap) => {
        if (!cancelled) hydrate(snap);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load library");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hydrate, setQuality, setError]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenItem(null);
        setRag(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpenItem]);

  const onSimulate = useCallback(async () => {
    if (simulating) return;
    setSimulating(true);
    try {
      const result = await libraryApi.simulateMilestone();
      addItem(result.item, result.inkAwarded);
      toast.success(`New book shelved: ${result.item.title}`, {
        description: `+${result.inkAwarded} Ink`,
      });
      window.setTimeout(() => clearDrop(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add book");
    } finally {
      setSimulating(false);
    }
  }, [simulating, addItem, clearDrop, setError]);

  const show3d = quality !== "none" && dockTab === "library";
  const showList = quality === "none" || dockTab === "list";

  return (
    <div className="relative h-[calc(100dvh-0px)] min-h-[560px] w-full overflow-hidden bg-[#2a1a12]">
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
        <div className="absolute inset-0 z-10 overflow-hidden bg-gradient-to-b from-[#3a2416] to-[#2a1a12] p-4 pb-24 pt-20 sm:p-6 sm:pb-28 sm:pt-24">
          <ListView />
        </div>
      )}

      {ready && (dockTab === "shop" || dockTab === "collection" || dockTab === "friends") && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#2a1a12]/88 p-6 pb-28">
          <p className="max-w-sm text-center font-serif text-xl text-[#f1e6cc]/80">
            {dockTab === "shop" &&
              "Shop arrives soon — spend Ink on themes, rugs, and a sleepy cat."}
            {dockTab === "collection" &&
              "Collection arrives soon — every book you earn, searchable and filterable."}
            {dockTab === "friends" &&
              "Visit friends arrives soon — peek into their libraries with kindness."}
          </p>
        </div>
      )}

      {ready && openItemId && show3d && (
        <BookPanel
          onOpenRag={(sourceId, title) => setRag({ sourceId, title })}
        />
      )}

      {ready && rag && (
        <RagChat
          title={rag.title}
          sourceId={rag.sourceId}
          onClose={() => setRag(null)}
        />
      )}

      {ready && (
        <Hud onSimulate={onSimulate} simulating={simulating} />
      )}

      <Toaster position="top-center" />
    </div>
  );
}
