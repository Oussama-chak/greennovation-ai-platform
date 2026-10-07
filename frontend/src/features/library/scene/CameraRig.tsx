import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLibraryStore } from "../store/libraryStore";

const START = new THREE.Vector3(0, 1.55, 5.8);
const REST = new THREE.Vector3(0, 1.65, 4.2);
const LOOK = new THREE.Vector3(0, 1.35, -0.4);

/**
 * Entrance dolly + gentle parallax / drag-pan / scroll-zoom.
 */
export function CameraRig({ reducedMotion }: { reducedMotion?: boolean }) {
  const { camera, gl } = useThree();
  const intro = useRef(0);
  const target = useRef(START.clone());
  const look = useRef(LOOK.clone());
  const pointer = useRef({ x: 0, y: 0 });
  const drag = useRef({ active: false, lx: 0, ly: 0, yaw: 0, pitch: 0 });
  const zoom = useRef(1);
  const focusBookId = useLibraryStore((s) => s.focusBookId);

  useEffect(() => {
    camera.position.copy(START);
    camera.lookAt(LOOK);
  }, [camera]);

  useEffect(() => {
    const el = gl.domElement;

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (drag.current.active) {
        const dx = e.clientX - drag.current.lx;
        const dy = e.clientY - drag.current.ly;
        drag.current.lx = e.clientX;
        drag.current.ly = e.clientY;
        drag.current.yaw = THREE.MathUtils.clamp(
          drag.current.yaw - dx * 0.003,
          -0.55,
          0.55,
        );
        drag.current.pitch = THREE.MathUtils.clamp(
          drag.current.pitch - dy * 0.002,
          -0.2,
          0.25,
        );
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      drag.current.active = true;
      drag.current.lx = e.clientX;
      drag.current.ly = e.clientY;
      el.setPointerCapture(e.pointerId);
    };

    const onPointerUp = (e: PointerEvent) => {
      drag.current.active = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom.current = THREE.MathUtils.clamp(
        zoom.current + e.deltaY * 0.0012,
        0.75,
        1.35,
      );
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((state, dt) => {
    // Entrance dolly
    if (intro.current < 1) {
      intro.current = Math.min(1, intro.current + dt * (reducedMotion ? 2.5 : 0.55));
      const e = 1 - Math.pow(1 - intro.current, 3);
      target.current.lerpVectors(START, REST, e);
    } else {
      target.current.lerp(REST, 1 - Math.exp(-dt * 2));
    }

    const breath = reducedMotion
      ? 0
      : Math.sin(state.clock.elapsedTime * 0.45) * 0.025;
    const parallaxX = reducedMotion ? 0 : pointer.current.x * 0.12;
    const parallaxY = reducedMotion ? 0 : pointer.current.y * 0.06;

    const z = REST.z * zoom.current;
    const desired = new THREE.Vector3(
      target.current.x + drag.current.yaw * 0.8 + parallaxX,
      REST.y + drag.current.pitch * 0.5 + breath + parallaxY * 0.3,
      z,
    );

    // Mild focus pull when a book is highlighted (step 4 will dramatize this)
    if (focusBookId) {
      desired.z = THREE.MathUtils.lerp(desired.z, 3.6, 0.35);
    }

    camera.position.lerp(desired, 1 - Math.exp(-dt * 3.2));
    look.current.set(
      LOOK.x + drag.current.yaw * 0.4 + parallaxX * 0.3,
      LOOK.y + drag.current.pitch * 0.3,
      LOOK.z,
    );
    camera.lookAt(look.current);
  });

  return null;
}
