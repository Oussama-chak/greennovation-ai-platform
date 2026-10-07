import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { useLibraryStore } from "../store/libraryStore";
import { CameraRig } from "./CameraRig";
import { NookStage } from "./stages/NookStage";

function Scene() {
  const quality = useLibraryStore((s) => s.quality);
  const setQuality = useLibraryStore((s) => s.setQuality);
  const stage = useLibraryStore((s) => s.user?.stage ?? 1);

  return (
    <>
      <color attach="background" args={["#3d2818"]} />
      <fog attach="fog" args={["#3d2818", 7, 15]} />
      <CameraRig />
      {/* Hall / Archive arrive in a later step */}
      {(stage === 1 || stage === 2 || stage === 3) && <NookStage />}
      <Environment preset="warehouse" environmentIntensity={0.32} />
      <PerformanceMonitor
        onDecline={() => {
          if (quality !== "low") setQuality("low");
        }}
        onIncline={() => {
          if (quality !== "high") setQuality("high");
        }}
      />
    </>
  );
}

export function LibraryCanvas() {
  const quality = useLibraryStore((s) => s.quality);

  return (
    <Canvas
      className="h-full w-full touch-none"
      dpr={quality === "high" ? [1, 1.5] : [1, 1]}
      gl={{
        antialias: quality === "high",
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.08,
      }}
      shadows={quality === "high"}
      camera={{ fov: 42, near: 0.1, far: 40, position: [0, 1.5, 5.6] }}
      onPointerMissed={() => {
        useLibraryStore.getState().setOpenItem(null);
      }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
