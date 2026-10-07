import type { LibraryItem } from "../types";

export type BookSlot = {
  index: number;
  itemId: string;
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
  shelves: 8,
  shelfWidth: 2.85,
  shelfHeight: 0.38,
  shelfDepth: 0.28,
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

const SECTION_META = [
  { origin: { x: -1.55, z: 0.45 }, rotY: Math.PI / 2 },
  { origin: { x: 0, z: -1.35 }, rotY: 0 },
  { origin: { x: 1.55, z: 0.45 }, rotY: -Math.PI / 2 },
] as const;

/**
 * Deterministic U-nook layout from item id / shelfSlot.
 * Fills center wall first, then left/right alcove walls.
 */
export function layoutBooks(
  items: LibraryItem[],
  config: WallLayoutConfig = {},
): BookSlot[] {
  const cfg = { ...LAYOUT_DEFAULTS, ...config };
  const capacity = cfg.booksPerShelf * cfg.shelves * 3;
  const ordered = [...items]
    .sort((a, b) => a.shelfSlot - b.shelfSlot)
    .slice(0, capacity);

  const lanes: LibraryItem[][][] = Array.from({ length: 3 }, () =>
    Array.from({ length: cfg.shelves }, () => [] as LibraryItem[]),
  );

  const centerCap = cfg.booksPerShelf * cfg.shelves;
  ordered.forEach((item, index) => {
    const preferred = item.shelfSlot >= 0 ? item.shelfSlot : index;
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
    while (lanes[section][shelf].length >= cfg.booksPerShelf && shelf < cfg.shelves - 1) {
      shelf += 1;
    }
    lanes[section][shelf].push(item);
  });

  const slots: BookSlot[] = [];
  let index = 0;

  for (let section = 0; section < 3; section++) {
    const meta = SECTION_META[section];
    for (let shelf = 0; shelf < cfg.shelves; shelf++) {
      const lane = lanes[section][shelf];
      if (!lane.length) continue;

      const widths = lane.map((item) => {
        const h = hashId(item.id);
        return Math.min(0.2, Math.max(0.075, item.thickness * 0.9 + h * 0.015));
      });
      const gap = 0.01;
      const totalW =
        widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, lane.length - 1);
      let cursor = -Math.min(totalW, cfg.shelfWidth - 0.2) / 2;

      lane.forEach((item, col) => {
        const h = hashId(item.id);
        const width = widths[col];
        const height = 0.26 + h * 0.11;
        const depth = 0.18 + (1 - h) * 0.07;
        const tilt = (h - 0.5) * 0.07;
        const along = cursor + width / 2;
        cursor += width + gap;

        const y = cfg.baseY + shelf * cfg.shelfHeight + height / 2 + 0.02;
        const localX = along;
        const localZ = depth / 2 + 0.02;
        const cos = Math.cos(meta.rotY);
        const sin = Math.sin(meta.rotY);

        slots.push({
          index,
          itemId: item.id,
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

export function findSlot(slots: BookSlot[], itemId: string): BookSlot | undefined {
  return slots.find((s) => s.itemId === itemId);
}
