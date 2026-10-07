import { useEffect } from "react";
import { libraryApi } from "./libraryApi";
import { useLibraryStore } from "../store/libraryStore";
import type { LibrarySseEvent } from "../types";

/**
 * Subscribes to library SSE when not in mock mode.
 * Mock awakening is driven by the completeNextTask API + store.
 */
export function useLibraryStream(enabled: boolean) {
  const awakenBook = useLibraryStore((s) => s.awakenBook);
  const setAmbience = useLibraryStore((s) => s.setAmbience);

  useEffect(() => {
    if (!enabled || libraryApi.useMock) return;
    const url = libraryApi.streamUrl();
    if (!url) return;

    const es = new EventSource(url);
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as LibrarySseEvent;
        if (event.type === "awakened") {
          awakenBook(event.book, event.inkAwarded, event.nextBookId);
        } else if (event.type === "ambience") {
          setAmbience(event.ambience);
        }
      } catch {
        /* ignore malformed events */
      }
    };
    return () => es.close();
  }, [enabled, awakenBook, setAmbience]);
}
