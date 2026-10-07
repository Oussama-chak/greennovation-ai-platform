/** Procedural brass rolling ladder leaning on the left wing. */
export function Ladder() {
  const rungs = Array.from({ length: 8 }, (_, i) => i);
  return (
    <group position={[-1.55, 0.1, 0.1]} rotation={[0, 0.35, 0.08]}>
      {/* Rails */}
      <mesh position={[-0.18, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 2.8, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.18, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 2.8, 8]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} />
      </mesh>
      {rungs.map((i) => (
        <mesh key={i} position={[0, 0.25 + i * 0.32, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.4, 8]} />
          <meshStandardMaterial color="#d4a537" metalness={0.75} roughness={0.35} />
        </mesh>
      ))}
      {/* Wheels */}
      <mesh position={[-0.18, 0.06, 0.05]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.018, 8, 16]} />
        <meshStandardMaterial color="#5a4a30" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0.18, 0.06, 0.05]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.018, 8, 16]} />
        <meshStandardMaterial color="#5a4a30" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}
