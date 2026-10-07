import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

function Lantern({
  position,
  reducedMotion,
}: {
  position: [number, number, number];
  reducedMotion?: boolean;
}) {
  const flame = useRef<Group>(null);
  const t = useRef(Math.random() * 10);

  useFrame((_, dt) => {
    if (reducedMotion || !flame.current) return;
    t.current += dt;
    const flicker = 0.85 + Math.sin(t.current * 9.5) * 0.08 + Math.sin(t.current * 17) * 0.04;
    flame.current.scale.setScalar(flicker);
  });

  return (
    <group position={position}>
      {/* Bracket */}
      <mesh position={[0, 0.35, -0.08]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#3a2416" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Brass cage */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.28, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.1, 0.12, 8]} />
        <meshStandardMaterial color="#b8922a" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Warm glass / flame */}
      <group ref={flame} position={[0, 0.02, 0]}>
        <mesh>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial
            color="#f2b660"
            emissive="#f2b660"
            emissiveIntensity={2.2}
            transparent
            opacity={0.9}
          />
        </mesh>
        <pointLight color="#f2b660" intensity={1.6} distance={4.5} decay={2} />
      </group>
    </group>
  );
}

/** Flanking lanterns on pillars beside the center wall (Image 1). */
export function Lanterns({ reducedMotion }: { reducedMotion?: boolean }) {
  return (
    <group>
      <Lantern position={[-1.15, 2.15, -1.2]} reducedMotion={reducedMotion} />
      <Lantern position={[1.15, 2.15, -1.2]} reducedMotion={reducedMotion} />
    </group>
  );
}
