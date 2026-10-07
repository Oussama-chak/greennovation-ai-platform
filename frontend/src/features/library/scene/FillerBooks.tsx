import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LAYOUT_DEFAULTS, hashId } from "./layout";

const FILLER_PALETTE = [
  "#8b2f3a",
  "#2f6f73",
  "#3d5a80",
  "#5a4030",
  "#6b4c7a",
  "#4a6741",
  "#8a6a3a",
  "#7a3b4a",
];

/**
 * Dense decorative spines for empty shelf space (non-interactive).
 * Real LibraryItems remain the interactive Books mesh.
 */
export function FillerBooks({ occupiedSlots }: { occupiedSlots: Set<string> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const fillers = useMemo(() => {
    const { booksPerShelf, shelves, shelfWidth, shelfHeight, baseY } = LAYOUT_DEFAULTS;
    const sections = [
      { origin: { x: -1.55, z: 0.45 }, rotY: Math.PI / 2 },
      { origin: { x: 0, z: -1.35 }, rotY: 0 },
      { origin: { x: 1.55, z: 0.45 }, rotY: -Math.PI / 2 },
    ];
    const list: {
      x: number;
      y: number;
      z: number;
      w: number;
      h: number;
      d: number;
      rotY: number;
      tilt: number;
      color: string;
    }[] = [];

    for (let section = 0; section < 3; section++) {
      const meta = sections[section];
      for (let shelf = 0; shelf < shelves; shelf++) {
        const key = `${section}-${shelf}`;
        // Skip shelves that already have many real books
        if (occupiedSlots.has(key)) continue;

        let cursor = -shelfWidth / 2 + 0.08;
        let col = 0;
        while (cursor < shelfWidth / 2 - 0.1 && col < booksPerShelf + 4) {
          const id = `fill-${section}-${shelf}-${col}`;
          const h = hashId(id);
          const w = 0.07 + h * 0.1;
          const height = 0.24 + h * 0.12;
          const depth = 0.16 + (1 - h) * 0.06;
          const along = cursor + w / 2;
          cursor += w + 0.008;
          const localZ = depth / 2 + 0.02;
          const cos = Math.cos(meta.rotY);
          const sin = Math.sin(meta.rotY);
          list.push({
            x: meta.origin.x + along * cos + localZ * sin,
            y: baseY + shelf * shelfHeight + height / 2 + 0.02,
            z: meta.origin.z - along * sin + localZ * cos,
            w,
            h: height,
            d: depth,
            rotY: meta.rotY,
            tilt: (h - 0.5) * 0.06,
            color: FILLER_PALETTE[Math.floor(h * FILLER_PALETTE.length)],
          });
          col += 1;
        }
      }
    }
    return list;
  }, [occupiedSlots]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !fillers.length) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const euler = new THREE.Euler();
    const quat = new THREE.Quaternion();
    fillers.forEach((f, i) => {
      dummy.position.set(f.x, f.y, f.z);
      euler.set(0, f.rotY, f.tilt);
      quat.setFromEuler(euler);
      dummy.quaternion.copy(quat);
      dummy.scale.set(f.w, f.h, f.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // Slightly muted decorative spines
      color.set(f.color).multiplyScalar(0.82);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [fillers]);

  if (!fillers.length) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, fillers.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.75} metalness={0.05} />
    </instancedMesh>
  );
}
