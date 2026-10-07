import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "../lib/quality";

const LOOK = new THREE.Vector3(0, 1.1, -0.2);
const START = new THREE.Vector3(0, 1.5, 5.6);
const HOME = new THREE.Vector3(0, 1.3, 3.9);

export function CameraRig() {
  const { camera, gl } = useThree();
  const reduced = prefersReducedMotion();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const zoom = useRef(0);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const intro = useRef(0);
  const breath = useRef(0);

  useEffect(() => {
    camera.position.copy(START);
    camera.lookAt(LOOK);
  }, [camera]);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const onUp = (e: PointerEvent) => {
      dragging.current = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      yaw.current = THREE.MathUtils.clamp(yaw.current - dx * 0.0035, -0.5, 0.5);
      pitch.current = THREE.MathUtils.clamp(pitch.current - dy * 0.0025, -0.2, 0.25);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom.current = THREE.MathUtils.clamp(zoom.current + e.deltaY * 0.0012, -0.8, 1.3);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    intro.current = Math.min(1, intro.current + dt * 0.45);
    const ease = 1 - Math.pow(1 - intro.current, 3);
    if (!reduced) breath.current += dt;

    const base = new THREE.Vector3().lerpVectors(START, HOME, ease);
    base.z += zoom.current;
    base.x += Math.sin(yaw.current) * 0.8;
    base.z += (1 - Math.cos(yaw.current)) * 0.3;
    base.y += pitch.current * 0.55;
    if (!reduced) {
      base.x += pointer.current.x * 0.07;
      base.y += pointer.current.y * 0.04 + Math.sin(breath.current * 0.7) * 0.018;
    }
    camera.position.lerp(base, 1 - Math.exp(-dt * 4));
    const target = LOOK.clone().add(
      new THREE.Vector3(yaw.current * 0.35, pitch.current * 0.25, 0),
    );
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const desired = target.clone().sub(camera.position).normalize();
    camera.lookAt(camera.position.clone().add(dir.lerp(desired, 1 - Math.exp(-dt * 3))));
  });

  return null;
}
