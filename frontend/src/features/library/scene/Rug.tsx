import { useMemo } from "react";
import { rugTexture } from "./proceduralTextures";

export function Rug() {
  const map = useMemo(() => rugTexture(), []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0.35]} receiveShadow>
      <planeGeometry args={[2.8, 2.2]} />
      <meshStandardMaterial map={map} roughness={0.95} />
    </mesh>
  );
}
