import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { useLibraryStore } from "../store/libraryStore";
import { findSlot, layoutBooks } from "./layout";
import { prefersReducedMotion } from "../lib/quality";

/** Floating open-book mesh in front of the camera when a book is selected. */
export function BookDetail3D() {
  const group = useRef<THREE.Group>(null);
  const leftPage = useRef<THREE.Mesh>(null);
  const rightPage = useRef<THREE.Mesh>(null);
  const openItemId = useLibraryStore((s) => s.openItemId);
  const items = useLibraryStore((s) => s.items);
  const item = items.find((i) => i.id === openItemId) ?? null;
  const reduced = prefersReducedMotion();

  const slot = useMemo(() => {
    if (!item) return null;
    return findSlot(layoutBooks(items), item.id) ?? null;
  }, [item, items]);

  useEffect(() => {
    const g = group.current;
    if (!g || !item) return;

    const start = slot
      ? new THREE.Vector3(slot.x, slot.y, slot.z)
      : new THREE.Vector3(0, 1.2, -1);
    const end = new THREE.Vector3(0, 1.35, 2.35);

    g.position.copy(start);
    g.scale.setScalar(0.35);
    g.rotation.set(0, slot?.rotY ?? 0, 0);

    if (leftPage.current) leftPage.current.rotation.y = 0;
    if (rightPage.current) rightPage.current.rotation.y = 0;

    if (reduced) {
      g.position.copy(end);
      g.scale.setScalar(1);
      g.rotation.set(-0.15, 0, 0);
      if (leftPage.current) leftPage.current.rotation.y = -1.05;
      if (rightPage.current) rightPage.current.rotation.y = 1.05;
      return;
    }

    const tl = gsap.timeline();
    tl.to(g.position, { x: end.x, y: end.y, z: end.z, duration: 0.7, ease: "power3.out" }, 0)
      .to(g.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: "power3.out" }, 0)
      .to(g.rotation, { x: -0.15, y: 0, z: 0, duration: 0.7, ease: "power2.out" }, 0)
      .to(leftPage.current!.rotation, { y: -1.05, duration: 0.55, ease: "power2.out" }, 0.35)
      .to(rightPage.current!.rotation, { y: 1.05, duration: 0.55, ease: "power2.out" }, 0.35);

    return () => {
      tl.kill();
    };
  }, [item, slot, reduced]);

  useFrame(({ camera }) => {
    if (!group.current || !item) return;
    // Keep book facing camera softly
    const target = camera.position.clone();
    target.y = group.current.position.y;
    group.current.lookAt(target);
    group.current.rotateX(-0.12);
  });

  if (!item) return null;

  return (
    <group ref={group}>
      {/* cover spine */}
      <mesh castShadow>
        <boxGeometry args={[0.04, 0.55, 0.38]} />
        <meshStandardMaterial color={item.color} roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh ref={leftPage} position={[-0.02, 0, 0]} castShadow>
        <boxGeometry args={[0.28, 0.52, 0.02]} />
        <meshStandardMaterial color="#f1e6cc" roughness={0.9} />
      </mesh>
      <mesh ref={rightPage} position={[0.02, 0, 0]} castShadow>
        <boxGeometry args={[0.28, 0.52, 0.02]} />
        <meshStandardMaterial color="#f7efe0" roughness={0.9} />
      </mesh>
      {item.onTime && (
        <mesh position={[0, 0.18, 0.2]}>
          <circleGeometry args={[0.05, 16]} />
          <meshStandardMaterial color="#d4a537" emissive="#d4a537" emissiveIntensity={0.5} metalness={0.8} roughness={0.25} />
        </mesh>
      )}
      <pointLight position={[0, 0.2, 0.4]} color="#f2b660" intensity={0.6} distance={2} />
    </group>
  );
}
