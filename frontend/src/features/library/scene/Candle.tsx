import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

/** Streak candle on a side table — dims with missed days, never extinguishes. */
export function Candle({
  level = 0.85,
  reducedMotion,
}: {
  level?: number;
  reducedMotion?: boolean;
}) {
  const flame = useRef<Mesh>(null);
  const t = useRef(0);
  const intensity = 0.4 + level * 1.2;

  useFrame((_, dt) => {
    if (reducedMotion || !flame.current) return;
    t.current += dt;
    const f = 0.9 + Math.sin(t.current * 11) * 0.1;
    flame.current.scale.set(f, 1.1 * f, f);
  });

  return (
    <group position={[1.55, 0.72, 1.1]}>
      {/* Table */}
      <mesh position={[0, -0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.3, 0.06, 20]} />
        <meshStandardMaterial color="#3a2416" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.55, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.4, 8]} />
        <meshStandardMaterial color="#2a1a12" />
      </mesh>
      {/* Candle body */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.28, 12]} />
        <meshStandardMaterial color="#f1e6cc" roughness={0.9} />
      </mesh>
      <mesh ref={flame} position={[0, 0.12, 0]}>
        <coneGeometry args={[0.035, 0.1, 8]} />
        <meshStandardMaterial
          color="#f2b660"
          emissive="#f2b660"
          emissiveIntensity={intensity}
          transparent
          opacity={0.95}
        />
      </mesh>
      <pointLight color="#f2b660" intensity={intensity * 0.6} distance={2.2} />
    </group>
  );
}
