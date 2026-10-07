import { useEffect } from "react";
import { libraryApi } from "./libraryApi";
import { useLibraryStore } from "../store/libraryStore";
import type { LibrarySseEvent } from "../types";

export function useLibraryStream(enabled = true) {
  const addItem = useLibraryStore((s) => s.addItem);
  const setAmbience = useLibraryStore((s) => s.setAmbience);
  const setUser = useLibraryStore((s) => s.setUser);

  useEffect(() => {
    if (!enabled || libraryApi.useMock) return;
    const url = libraryApi.streamUrl();
    if (!url) return;

    const source = new EventSource(url);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LibrarySseEvent;
        if (data.type === "item_added") {
          addItem(data.item, data.inkAwarded);
        } else if (data.type === "ambience") {
          setAmbience(data.ambience);
        } else if (data.type === "level_up") {
          const user = useLibraryStore.getState().user;
          if (user) {
            setUser({ ...user, level: data.level, stage: data.stage });
          }
        }
      } catch {
        /* ignore */
      }
    };
    return () => source.close();
  }, [enabled, addItem, setAmbience, setUser]);
}
