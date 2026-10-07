import { useMemo } from "react";
import type { Texture } from "three";
import { makeCreamShelfTexture, makeWoodTexture } from "./proceduralTextures";
import { LAYOUT_DEFAULTS } from "./layout";

function ShelfUnit({
  position,
  rotation,
  cream,
  wood,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  cream: Texture;
  wood: Texture;
}) {
  const { shelfWidth, shelfHeight, shelves, shelfDepth, baseY } = LAYOUT_DEFAULTS;
  const height = shelves * shelfHeight + 0.3;
  const shelfYs = Array.from({ length: shelves }, (_, i) => baseY - 0.03 + i * shelfHeight);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, height / 2, -shelfDepth / 2 - 0.02]} receiveShadow>
        <boxGeometry args={[shelfWidth + 0.1, height, 0.06]} />
        <meshStandardMaterial map={cream} color="#f3ebe0" roughness={0.85} />
      </mesh>
      {/* decorative pilasters for center feel */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[(shelfWidth / 2 + 0.03) * s, height / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.07, height, shelfDepth + 0.06]} />
          <meshStandardMaterial map={cream} color="#efe6d8" roughness={0.8} />
        </mesh>
      ))}
      {shelfYs.map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[shelfWidth, 0.045, shelfDepth]} />
          <meshStandardMaterial map={wood} color="#e5d4b8" roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.03, 0.02]} castShadow>
        <boxGeometry args={[shelfWidth + 0.18, 0.09, shelfDepth + 0.1]} />
        <meshStandardMaterial map={cream} color="#ebe2d4" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Shelves() {
  const cream = useMemo(() => makeCreamShelfTexture(), []);
  const wood = useMemo(() => makeWoodTexture("#e8d5b5", "#b8956a"), []);

  return (
    <group>
      <ShelfUnit position={[0, 0, -1.35]} rotation={[0, 0, 0]} cream={cream} wood={wood} />
      <ShelfUnit
        position={[-1.55, 0, 0.45]}
        rotation={[0, Math.PI / 2, 0]}
        cream={cream}
        wood={wood}
      />
      <ShelfUnit
        position={[1.55, 0, 0.45]}
        rotation={[0, -Math.PI / 2, 0]}
        cream={cream}
        wood={wood}
      />
    </group>
  );
}
