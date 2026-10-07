import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCursor } from "@react-three/drei";
import type { LibraryItem } from "../types";
import { layoutBooks } from "./layout";
import { useLibraryStore } from "../store/libraryStore";

const _color = new THREE.Color();
const _dummy = new THREE.Object3D();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();

type BooksProps = {
  items: LibraryItem[];
  excludeId?: string | null;
};

export function Books({ items, excludeId }: BooksProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoverRef = useRef(-1);
  const setHoveredItem = useLibraryStore((s) => s.setHoveredItem);
  const setOpenItem = useLibraryStore((s) => s.setOpenItem);
  const hoveredItemId = useLibraryStore((s) => s.hoveredItemId);
  const openItemId = useLibraryStore((s) => s.openItemId);
  const dropAnim = useLibraryStore((s) => s.dropAnim);

  const visible = useMemo(
    () => items.filter((i) => i.id !== excludeId),
    [items, excludeId],
  );
  const slots = useMemo(() => layoutBooks(visible), [visible]);
  const itemById = useMemo(() => new Map(visible.map((i) => [i.id, i])), [visible]);

  const writeInstance = (i: number, pull: number, dropY: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const slot = slots[i];
    const item = itemById.get(slot.itemId);
    if (!item) return;

    const outX = Math.sin(slot.rotY) * pull;
    const outZ = Math.cos(slot.rotY) * pull;
    _dummy.position.set(slot.x + outX, slot.y + dropY, slot.z + outZ);
    _euler.set(0, slot.rotY, slot.tilt);
    _quat.setFromEuler(_euler);
    _dummy.quaternion.copy(_quat);
    _dummy.scale.set(slot.width, slot.height, slot.depth);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);

    _color.set(item.color);
    if (item.rarity === "legendary") _color.lerp(new THREE.Color("#d4a537"), 0.35);
    if (item.onTime) _color.offsetHSL(0.02, 0.05, 0.06);
    mesh.setColorAt(i, _color);
  };

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !slots.length) return;
    for (let i = 0; i < slots.length; i++) writeInstance(i, 0, 0);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, itemById]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const now = performance.now();

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const item = itemById.get(slot.itemId)!;
      const hover = hoveredItemId === item.id;
      const open = openItemId === item.id;
      let pull = hover || open ? 0.07 : 0;
      let dropY = 0;

      if (dropAnim?.itemId === item.id) {
        const p = Math.min(1, (now - dropAnim.startedAt) / 900);
        const e = 1 - Math.pow(1 - p, 3);
        dropY = (1 - e) * 2.2;
        pull += Math.sin(p * Math.PI) * 0.05;
        if (p >= 1) {
          // keep settled
        }
      }

      if (item.rarity === "legendary") {
        pull += Math.sin(t * 2) * 0.008;
      }

      writeInstance(i, pull, dropY);
      if ((hover || item.rarity === "legendary") && mesh.instanceColor) {
        mesh.getColorAt(i, _color);
        _color.multiplyScalar(hover ? 1.15 : 1.08 + Math.sin(t * 2) * 0.04);
        mesh.setColorAt(i, _color);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  useCursor(Boolean(hoveredItemId));

  if (!slots.length) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, slots.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
      onPointerMove={(e) => {
        e.stopPropagation();
        const id = e.instanceId;
        if (id === undefined || id < 0 || id >= slots.length) return;
        if (hoverRef.current === id) return;
        hoverRef.current = id;
        setHoveredItem(slots[id].itemId);
      }}
      onPointerOut={() => {
        hoverRef.current = -1;
        setHoveredItem(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        const id = e.instanceId;
        if (id === undefined || id < 0 || id >= slots.length) return;
        setOpenItem(slots[id].itemId);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.62} metalness={0.08} />
    </instancedMesh>
  );
}
