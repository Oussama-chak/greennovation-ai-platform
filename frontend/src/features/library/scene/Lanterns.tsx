import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "../lib/quality";

function Lantern({ position }: { position: [number, number, number] }) {
  const light = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.Mesh>(null);
  const reduced = prefersReducedMotion();
  const phase = useRef(Math.random() * 10);

  useFrame(({ clock }) => {
    if (reduced) {
      if (light.current) light.current.intensity = 1.5;
      return;
    }
    const t = clock.elapsedTime + phase.current;
    const flicker = 1.25 + Math.sin(t * 7.2) * 0.1 + Math.sin(t * 13.4) * 0.06;
    if (light.current) light.current.intensity = flicker;
    if (glow.current) {
      const mat = glow.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.85 + Math.sin(t * 6) * 0.18;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, -0.02, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.24, 6]} />
        <meshStandardMaterial color="#8a7028" metalness={0.75} roughness={0.3} transparent opacity={0.88} />
      </mesh>
      <mesh ref={glow} position={[0, -0.02, 0]}>
        <sphereGeometry args={[0.065, 14, 14]} />
        <meshStandardMaterial color="#f2b660" emissive="#f2b660" emissiveIntensity={0.9} transparent opacity={0.95} />
      </mesh>
      <pointLight ref={light} color="#f2b660" intensity={1.45} distance={5.5} decay={2} castShadow />
    </group>
  );
}

export function Lanterns() {
  return (
    <group>
      <Lantern position={[-0.72, 2.95, -1.15]} />
      <Lantern position={[0.72, 2.95, -1.15]} />
    </group>
  );
}
