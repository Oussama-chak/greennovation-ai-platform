import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { useLibraryStore } from "../store/libraryStore";
import { CameraRig } from "./CameraRig";
import { Room } from "./Room";

export function LibraryCanvas() {
  const walls = useLibraryStore((s) => s.walls);
  const activeWallId = useLibraryStore((s) => s.activeWallId);
  const user = useLibraryStore((s) => s.user);
  const ambience = useLibraryStore((s) => s.ambience);
  const quality = useLibraryStore((s) => s.quality);
  const reducedMotion = useLibraryStore((s) => s.reducedMotion);

  const wall = useMemo(
    () => walls.find((w) => w.id === activeWallId) ?? null,
    [walls, activeWallId],
  );

  if (!wall || !user || !ambience) return null;

  const dpr: [number, number] = quality === "high" ? [1, 1.5] : [1, 1];

  return (
    <Canvas
      shadows={quality === "high"}
      dpr={dpr}
      camera={{ position: [0, 1.55, 5.8], fov: 42, near: 0.1, far: 40 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      aria-label="Wall of Stories — interactive 3D reading nook"
    >
      <color attach="background" args={["#2a1a12"]} />
      <fog attach="fog" args={["#3a2818", 7, 18]} />

      <ambientLight intensity={0.42} color="#f1e6cc" />
      <directionalLight
        position={[2.5, 6, 3]}
        intensity={0.65}
        color="#ffd9a0"
        castShadow={quality === "high"}
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={["#f2b660", "#3a2416", 0.4]} />

      <Suspense fallback={null}>
        <Environment preset="apartment" environmentIntensity={0.28} />
        <Room
          books={wall.items}
          stage={user.stage}
          candleLevel={ambience.candleLevel}
          reducedMotion={reducedMotion}
        />
      </Suspense>

      <CameraRig reducedMotion={reducedMotion} />
    </Canvas>
  );
}
