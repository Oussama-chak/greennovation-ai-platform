import { useMemo } from "react";
import { makeHerringboneTexture } from "../proceduralTextures";
import { Shelves } from "../Shelves";
import { Lanterns } from "../Lanterns";
import { Ladder } from "../Ladder";
import { Rug } from "../Rug";
import { Books } from "../Books";
import { BookDetail3D } from "../BookDetail3D";
import { FillerBooks } from "../FillerBooks";
import { useLibraryStore } from "../../store/libraryStore";
import { layoutBooks } from "../layout";

export function NookStage() {
  const floor = useMemo(() => makeHerringboneTexture(), []);
  const items = useLibraryStore((s) => s.items);
  const openItemId = useLibraryStore((s) => s.openItemId);
  const occupied = useMemo(() => {
    const set = new Set<string>();
    for (const slot of layoutBooks(items)) {
      set.add(`${slot.section}-${slot.shelf}`);
    }
    return set;
  }, [items]);

  return (
    <group>
      <ambientLight intensity={0.55} color="#f7ead2" />
      <hemisphereLight args={["#fff1d6", "#5c3a22", 0.65]} />
      <directionalLight
        position={[2.2, 4.5, 2.8]}
        intensity={0.7}
        color="#ffe0b0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 2.2, 1.1]} color="#f2b660" intensity={0.5} distance={7} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} receiveShadow>
        <planeGeometry args={[7.5, 6.5]} />
        <meshStandardMaterial map={floor} roughness={0.62} metalness={0.05} />
      </mesh>

      {/* soft upper vignette */}
      <mesh position={[0, 3.7, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.5, 6.5]} />
        <meshBasicMaterial color="#2a1a12" transparent opacity={0.28} />
      </mesh>

      <Shelves />
      <Rug />
      <Lanterns />
      <Ladder />
      <FillerBooks occupiedSlots={occupied} />
      <Books items={items} excludeId={openItemId} />
      <BookDetail3D />

      {/* side table stub */}
      <group position={[1.2, 0, 1.4]}>
        <mesh position={[0, 0.26, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.52, 16]} />
          <meshStandardMaterial color="#5c3a22" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.58, 0]} castShadow>
          <cylinderGeometry args={[0.028, 0.032, 0.12, 10]} />
          <meshStandardMaterial color="#f1e6cc" roughness={0.85} />
        </mesh>
        <pointLight position={[0, 0.72, 0]} color="#f2b660" intensity={0.4} distance={2.2} />
      </group>
    </group>
  );
}
