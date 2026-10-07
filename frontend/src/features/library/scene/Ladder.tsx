import { useMemo } from "react";

export function Ladder({ slide = 0 }: { slide?: number }) {
  const rungs = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);
  return (
    <group position={[-1.35 + slide * 0.25, 0, -0.2]} rotation={[0, 0.32, 0.035]}>
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 1.45, 0]} castShadow>
          <cylinderGeometry args={[0.016, 0.016, 2.9, 8]} />
          <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.22} />
        </mesh>
      ))}
      {rungs.map((i) => (
        <mesh key={i} position={[0, 0.22 + i * 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, 0.28, 8]} />
          <meshStandardMaterial color="#d4a537" metalness={0.85} roughness={0.28} />
        </mesh>
      ))}
      {[-0.13, 0.13].map((x) => (
        <mesh key={`w-${x}`} position={[x, 0.05, 0.04]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.035, 0.01, 8, 16]} />
          <meshStandardMaterial color="#6b5420" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 2.95, -0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, 0.45, 8]} />
        <meshStandardMaterial color="#b8953a" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}
