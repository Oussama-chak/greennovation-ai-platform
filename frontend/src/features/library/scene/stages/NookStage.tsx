import { useMemo } from "react";
import type { Texture } from "three";
import { LAYOUT_DEFAULTS, SECTION_META } from "../layout";
import { herringboneTexture, woodTexture } from "../proceduralTextures";

/**
 * Stage 1 — Reading Nook (Image 1):
 * three-sided cream bookcases, warm wood floor, cozy wrap-around shelves.
 */
export function NookStage() {
  const wood = useMemo(() => woodTexture("#e8d9c0", "#b8a088"), []);
  const woodDark = useMemo(() => woodTexture("#b9835a", "#6e4a33"), []);
  const floor = useMemo(() => herringboneTexture(), []);

  const { shelves, shelfWidth, shelfHeight, shelfDepth, baseY } = LAYOUT_DEFAULTS;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0.4]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial map={floor} roughness={0.75} color="#d4b078" />
      </mesh>

      <mesh position={[0, 2.4, -2.2]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#f3e9d6" roughness={1} />
      </mesh>

      {SECTION_META.map((meta, section) => (
        <Bookcase
          key={section}
          origin={meta.origin}
          rotY={meta.rotY}
          shelves={shelves}
          shelfWidth={shelfWidth}
          shelfHeight={shelfHeight}
          shelfDepth={shelfDepth}
          baseY={baseY}
          wood={wood}
          woodDark={woodDark}
        />
      ))}

      <mesh position={[-1.15, 1.5, -1.35]} castShadow>
        <boxGeometry args={[0.22, 3.2, 0.22]} />
        <meshStandardMaterial map={woodDark} color="#e8d9c0" roughness={0.7} />
      </mesh>
      <mesh position={[1.15, 1.5, -1.35]} castShadow>
        <boxGeometry args={[0.22, 3.2, 0.22]} />
        <meshStandardMaterial map={woodDark} color="#e8d9c0" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Bookcase({
  origin,
  rotY,
  shelves,
  shelfWidth,
  shelfHeight,
  shelfDepth,
  baseY,
  wood,
  woodDark,
}: {
  origin: { x: number; z: number };
  rotY: number;
  shelves: number;
  shelfWidth: number;
  shelfHeight: number;
  shelfDepth: number;
  baseY: number;
  wood: Texture;
  woodDark: Texture;
}) {
  const height = baseY + shelves * shelfHeight + 0.2;
  const boards = Array.from({ length: shelves + 1 }, (_, i) => i);

  return (
    <group position={[origin.x, 0, origin.z]} rotation-y={rotY}>
      <mesh position={[0, height / 2, -shelfDepth / 2 - 0.02]} receiveShadow>
        <boxGeometry args={[shelfWidth + 0.2, height, 0.06]} />
        <meshStandardMaterial map={woodDark} color="#efe4d0" roughness={0.85} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[side * (shelfWidth / 2 + 0.04), height / 2, 0]}
          castShadow
        >
          <boxGeometry args={[0.08, height, shelfDepth + 0.08]} />
          <meshStandardMaterial map={wood} color="#f1e6cc" roughness={0.75} />
        </mesh>
      ))}
      {boards.map((i) => {
        const y = baseY + i * shelfHeight;
        return (
          <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[shelfWidth, 0.05, shelfDepth]} />
            <meshStandardMaterial map={wood} color="#e8d9c0" roughness={0.7} />
          </mesh>
        );
      })}
      <mesh position={[0, height + 0.06, 0.02]} castShadow>
        <boxGeometry args={[shelfWidth + 0.28, 0.1, shelfDepth + 0.12]} />
        <meshStandardMaterial color="#e8d9c0" roughness={0.65} />
      </mesh>
    </group>
  );
}
