import type { WallBook } from "../types";

export type BookSlot = {
  index: number;
  bookId: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotY: number;
  tilt: number;
  shelf: number;
  column: number;
  section: number;
};

export type WallLayoutConfig = {
  booksPerShelf?: number;
  shelves?: number;
  shelfWidth?: number;
  shelfHeight?: number;
  shelfDepth?: number;
  baseY?: number;
};

export const LAYOUT_DEFAULTS: Required<WallLayoutConfig> = {
  booksPerShelf: 10,
  shelves: 5,
  shelfWidth: 2.95,
  shelfHeight: 0.48,
  shelfDepth: 0.3,
  baseY: 0.28,
};

export function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Three-sided reading nook: left · center · right (Image 1 composition). */
const SECTION_META = [
  { origin: { x: -1.85, z: 0.55 }, rotY: Math.PI / 2.35 },
  { origin: { x: 0, z: -1.55 }, rotY: 0 },
  { origin: { x: 1.85, z: 0.55 }, rotY: -Math.PI / 2.35 },
] as const;

/**
 * Deterministic layout from book id / slot.
 * Fills center wall first, then left/right wings. Stable across sessions.
 */
export function layoutBooks(
  books: WallBook[],
  config: WallLayoutConfig = {},
): BookSlot[] {
  const cfg = { ...LAYOUT_DEFAULTS, ...config };
  const capacity = cfg.booksPerShelf * cfg.shelves * 3;
  const ordered = [...books]
    .sort((a, b) => a.slot - b.slot)
    .slice(0, capacity);

  const lanes: WallBook[][][] = Array.from({ length: 3 }, () =>
    Array.from({ length: cfg.shelves }, () => [] as WallBook[]),
  );

  // Fill center wall first (dense Image-1 look), then spill to left/right wings.
  const centerCap = cfg.booksPerShelf * cfg.shelves;
  ordered.forEach((book, index) => {
    const preferred = book.slot >= 0 ? book.slot : index;
    let section: number;
    let shelf: number;
    if (preferred < centerCap) {
      section = 1;
      shelf = Math.floor(preferred / cfg.booksPerShelf) % cfg.shelves;
    } else {
      const sideIndex = preferred - centerCap;
      section = sideIndex % 2 === 0 ? 0 : 2;
      shelf = Math.floor(sideIndex / 2 / cfg.booksPerShelf) % cfg.shelves;
    }
    let guard = 0;
    while (lanes[section][shelf].length >= cfg.booksPerShelf && guard < 20) {
      shelf += 1;
      if (shelf >= cfg.shelves) {
        shelf = 0;
        section = section === 1 ? 0 : section === 0 ? 2 : 1;
      }
      guard += 1;
    }
    lanes[section][shelf].push(book);
  });

  const slots: BookSlot[] = [];
  let index = 0;

  for (let section = 0; section < 3; section++) {
    const meta = SECTION_META[section];
    for (let shelf = 0; shelf < cfg.shelves; shelf++) {
      const lane = lanes[section][shelf];
      if (!lane.length) continue;

      const widths = lane.map((book) => {
        const h = hashId(book.id);
        return Math.min(0.22, Math.max(0.07, book.thickness * 0.95 + h * 0.02));
      });
      const gap = 0.008;
      const totalW =
        widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, lane.length - 1);
      let cursor = -Math.min(totalW, cfg.shelfWidth - 0.18) / 2;

      lane.forEach((book, col) => {
        const h = hashId(book.id);
        const width = widths[col];
        const height = 0.28 + h * 0.12;
        const depth = 0.16 + (1 - h) * 0.08;
        const tilt = (h - 0.5) * 0.06;
        const along = cursor + width / 2;
        cursor += width + gap;

        const y = cfg.baseY + shelf * cfg.shelfHeight + height / 2 + 0.02;
        const localX = along;
        const localZ = depth / 2 + 0.02;
        const cos = Math.cos(meta.rotY);
        const sin = Math.sin(meta.rotY);

        slots.push({
          index,
          bookId: book.id,
          x: meta.origin.x + localX * cos + localZ * sin,
          y,
          z: meta.origin.z - localX * sin + localZ * cos,
          width,
          height,
          depth,
          rotY: meta.rotY,
          tilt,
          shelf,
          column: col,
          section,
        });
        index += 1;
      });
    }
  }

  return slots;
}

export function findSlot(slots: BookSlot[], bookId: string): BookSlot | undefined {
  return slots.find((s) => s.bookId === bookId);
}

export { SECTION_META };
