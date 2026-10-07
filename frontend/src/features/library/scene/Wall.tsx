import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WallBook } from "../types";
import { layoutBooks, type BookSlot } from "./layout";

const SEPIA = new THREE.Color("#8a7c6a");
const GOLD = new THREE.Color("#d4a537");

type Props = {
  books: WallBook[];
  reducedMotion?: boolean;
};

/**
 * Step 2: single InstancedMesh for the whole wall.
 * Books render as soft sleeping sepia (shader wake/pulse arrives in step 3).
 * Mystery books get a gentle gold tint so they feel special even while sleeping.
 */
export function Wall({ books, reducedMotion = false }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const slots = useMemo(() => layoutBooks(books), [books]);
  const bookById = useMemo(() => {
    const m = new Map<string, WallBook>();
    books.forEach((b) => m.set(b.id, b));
    return m;
  }, [books]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const breath = useRef(0);

  // Initial instance matrices + colors
  useMemo(() => {
    const mesh = meshRef.current;
    if (!mesh || !slots.length) return;
    slots.forEach((slot, i) => writeInstance(mesh, dummy, color, slot, bookById.get(slot.bookId), 0));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
  }, [slots, bookById, dummy, color]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh || !slots.length) return;
    if (!reducedMotion) breath.current += dt;
    const t = breath.current;
    // Soft collective sway so the sleeping wall feels alive
    slots.forEach((slot, i) => {
      const book = bookById.get(slot.bookId);
      const sway = reducedMotion ? 0 : Math.sin(t * 0.6 + i * 0.15) * 0.004;
      writeInstance(mesh, dummy, color, slot, book, sway);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  if (!slots.length) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, slots.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        roughness={0.82}
        metalness={0.05}
        color="#8a7c6a"
        emissive="#3a3228"
        emissiveIntensity={0.08}
      />
    </instancedMesh>
  );
}

function writeInstance(
  mesh: THREE.InstancedMesh,
  dummy: THREE.Object3D,
  color: THREE.Color,
  slot: BookSlot,
  book: WallBook | undefined,
  sway: number,
) {
  dummy.position.set(slot.x, slot.y + sway, slot.z);
  dummy.rotation.set(slot.tilt * 0.3, slot.rotY, slot.tilt);
  dummy.scale.set(slot.width, slot.height, slot.depth);
  dummy.updateMatrix();
  mesh.setMatrixAt(slot.index, dummy.matrix);

  if (!mesh.instanceColor) {
    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(mesh.count * 3),
      3,
    );
  }

  // Step 2: wall of sleeping silhouettes. Mystery books whisper gold.
  if (book?.isMystery) {
    color.copy(GOLD).lerp(SEPIA, 0.55);
  } else if (book?.status === "awake") {
    // Hint of true color under mist — full wake shader comes later
    color.set(book.color).lerp(SEPIA, 0.72);
  } else {
    color.copy(SEPIA);
    const seed = (slot.index * 17) % 10;
    color.offsetHSL(0, 0, (seed - 5) * 0.008);
  }
  mesh.setColorAt(slot.index, color);
}
