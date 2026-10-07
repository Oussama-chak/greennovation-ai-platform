import { useMemo } from "react";
import { makeRugTexture } from "./proceduralTextures";

export function Rug() {
  const texture = useMemo(() => makeRugTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0.12]} position={[0, 0.012, 0.65]} receiveShadow>
      <planeGeometry args={[2.2, 1.55]} />
      <meshStandardMaterial map={texture} roughness={0.9} metalness={0.04} />
    </mesh>
  );
}
