import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, Sparkles, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { ISLANDS, type IslandId, type IslandProgress } from "@/lib/knowledgeIslands";

type Palette = Record<"sky" | "green" | "gold" | "coral" | "ink" | "paper" | "wood" | "woodDark" | "wall" | "floor", string>;

const CASE_X = [-2.75, 0, 2.75];
const PER_SHELF = 10;
const SHELVES = 4;
const CAPACITY = PER_SHELF * SHELVES;
const SHELF_Y = [0.32, 1.02, 1.72, 2.42];
const DESK: [number, number, number] = [0, 0.95, 2.6];

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function slot(i: number) {
  const shelf = Math.floor(i / PER_SHELF) % SHELVES;
  const col = i % PER_SHELF;
  const h = 0.42 + hash(i) * 0.16;
  return { pos: new THREE.Vector3(-0.95 + col * 0.21, SHELF_Y[shelf] + h / 2, 0.05), h, tilt: col === PER_SHELF - 1 ? -0.18 : 0 };
}

function woodTexture(base: string, dark: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = dark; ctx.globalAlpha = 0.18;
  for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.moveTo(0, i * 5 + hash(i) * 4); ctx.bezierCurveTo(40, i * 5 + 3, 80, i * 5 - 3, 128, i * 5 + hash(i + 9) * 4); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function Book({ index, colors, flying, paused }: { index: number; colors: string[]; flying: boolean; paused: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const age = useRef(flying ? 0 : 9);
  const time = useRef(0);
  const { pos, h, tilt } = useMemo(() => slot(index), [index]);
  const color = colors[Math.floor(hash(index + 3) * colors.length)];
  const caseX = useRef(0);
  useFrame((_, delta) => {
    const g = ref.current; if (!g) return;
    const dt = Math.min(delta, 0.05);
    if (!caseX.current && g.parent) caseX.current = g.parent.getWorldPosition(new THREE.Vector3()).x || 0.0001;
    age.current += dt; if (!paused) time.current += dt;
    const p = Math.min(age.current / 1.8, 1);
    if (p < 1) {
      const e = 1 - Math.pow(1 - p, 3);
      const start = new THREE.Vector3(DESK[0] - caseX.current, DESK[1] + 0.3, DESK[2]);
      g.position.lerpVectors(start, pos, e);
      g.position.y += Math.sin(p * Math.PI) * 1.4;
      g.rotation.set(Math.sin(p * Math.PI) * 0.6, (1 - e) * Math.PI * 3, tilt * e);
      g.scale.setScalar(0.6 + e * 0.4);
    } else {
      g.position.copy(pos); g.rotation.set(0, 0, tilt); g.scale.setScalar(1);
    }
  });
  return <group ref={ref} position={flying ? [0, -10, 0] : pos.toArray()}>
    <mesh castShadow><boxGeometry args={[0.17, h, 0.38]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
    <mesh position={[0, h * 0.28, 0.192]}><planeGeometry args={[0.13, 0.03]} /><meshStandardMaterial color={colors[colors.length - 1]} metalness={0.6} roughness={0.3} /></mesh>
    <mesh position={[0, -h * 0.28, 0.192]}><planeGeometry args={[0.13, 0.03]} /><meshStandardMaterial color={colors[colors.length - 1]} metalness={0.6} roughness={0.3} /></mesh>
    {flying && age.current < 1.8 && <Sparkles count={14} scale={0.6} size={3} speed={0.6} color={colors[colors.length - 1]} />}
  </group>;
}

function Bookcase({ index, palette, wood, selected, onSelect, count, growing, paused }: { index: number; palette: Palette; wood: THREE.Texture; selected: boolean; onSelect: () => void; count: number; growing: boolean; paused: boolean }) {
  const [hover, setHover] = useState(false);
  useCursor(hover);
  const accent = index === 0 ? palette.green : index === 1 ? palette.gold : palette.coral;
  const colors = index === 0 ? [palette.green, "#2f6f73", "#7aa874", palette.ink, palette.gold] : index === 1 ? [palette.gold, "#c9773f", "#3d5a80", palette.ink, palette.paper] : [palette.coral, "#9b5c8f", "#e3a86b", palette.ink, palette.gold];
  const shown = Math.min(count, CAPACITY);
  const glow = useRef<THREE.PointLight>(null);
  const t = useRef(0);
  useFrame((_, d) => { t.current += Math.min(d, .05); if (glow.current) glow.current.intensity = selected ? 3 + (paused ? 0 : Math.sin(t.current * 2) * 0.6) : hover ? 1.5 : 0; });
  return <group position={[CASE_X[index], 0, 0]} onClick={e => { e.stopPropagation(); onSelect(); }} onPointerOver={e => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}>
    <mesh position={[0, 1.5, -0.22]} receiveShadow><boxGeometry args={[2.4, 3.1, 0.06]} /><meshStandardMaterial color={palette.woodDark} map={wood} /></mesh>
    {[-1.17, 1.17].map(x => <mesh key={x} position={[x, 1.5, 0]} castShadow><boxGeometry args={[0.08, 3.1, 0.5]} /><meshStandardMaterial map={wood} color={palette.wood} /></mesh>)}
    {[0.07, ...SHELF_Y.slice(1).map(y => y - 0.02), 3.05].map((y, i) => <mesh key={i} position={[0, y + 0.0, 0]} castShadow receiveShadow><boxGeometry args={[2.3, 0.06, 0.48]} /><meshStandardMaterial map={wood} color={palette.wood} /></mesh>)}
    <mesh position={[0, 3.22, 0.05]} castShadow><boxGeometry args={[2.55, 0.16, 0.6]} /><meshStandardMaterial color={selected ? accent : palette.woodDark} roughness={0.6} /></mesh>
    {Array.from({ length: shown }).map((_, i) => <Book key={i} index={i} colors={colors} flying={growing && i === shown - 1} paused={paused} />)}
    <pointLight ref={glow} position={[0, 2, 1.2]} color={accent} distance={4} intensity={0} />
  </group>;
}

function DeskBook({ palette }: { palette: Palette }) {
  return <group position={DESK} rotation-y={0.3}>
    <mesh position-y={0.02} castShadow><boxGeometry args={[0.9, 0.04, 0.6]} /><meshStandardMaterial color={palette.coral} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.21, 0.06, 0]} rotation-z={-s * 0.08} castShadow><boxGeometry args={[0.41, 0.04, 0.56]} /><meshStandardMaterial color={palette.paper} roughness={0.9} /></mesh>)}
  </group>;
}

function Desk({ palette, wood, growing, paused }: { palette: Palette; wood: THREE.Texture; growing: boolean; paused: boolean }) {
  const orb = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, d) => { if (paused) return; t.current += Math.min(d, .05); if (orb.current) { orb.current.position.y = DESK[1] + 0.9 + Math.sin(t.current * 1.5) * 0.08; orb.current.rotation.y = t.current; } });
  return <group>
    <mesh position={[0, 0.9, 2.6]} castShadow receiveShadow><boxGeometry args={[2, 0.1, 0.9]} /><meshStandardMaterial map={wood} color={palette.wood} /></mesh>
    {[[-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35]].map(([x, z], i) => <mesh key={i} position={[x, 0.43, 2.6 + z]} castShadow><boxGeometry args={[0.08, 0.86, 0.08]} /><meshStandardMaterial color={palette.woodDark} /></mesh>)}
    <DeskBook palette={palette} />
    <mesh ref={orb} position={[0, DESK[1] + 0.9, DESK[2]]}><icosahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color={palette.gold} emissive={palette.gold} emissiveIntensity={growing ? 2.5 : 0.7} flatShading /></mesh>
    <pointLight position={[0, DESK[1] + 0.9, DESK[2]]} color={palette.gold} intensity={growing ? 4 : 1.2} distance={3} />
    {/* reading lamp */}
    <group position={[0.75, 0.95, 2.4]}>
      <mesh position-y={0.02}><cylinderGeometry args={[0.12, 0.14, 0.04, 16]} /><meshStandardMaterial color={palette.ink} metalness={0.5} roughness={0.4} /></mesh>
      <mesh position-y={0.3}><cylinderGeometry args={[0.015, 0.015, 0.56, 8]} /><meshStandardMaterial color={palette.ink} metalness={0.5} /></mesh>
      <mesh position-y={0.6}><coneGeometry args={[0.16, 0.18, 16, 1, true]} /><meshStandardMaterial color={palette.green} side={THREE.DoubleSide} /></mesh>
      <pointLight position-y={0.5} color={palette.paper} intensity={1.5} distance={2.5} />
    </group>
  </group>;
}

function Room({ palette, wood }: { palette: Palette; wood: THREE.Texture }) {
  const floor = useMemo(() => { const t = wood.clone(); t.repeat.set(6, 6); t.rotation = Math.PI / 2; t.needsUpdate = true; return t; }, [wood]);
  return <group>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[30, 20]} /><meshStandardMaterial map={floor} color={palette.floor} roughness={0.9} /></mesh>
    <mesh position={[0, 5, -0.4]} receiveShadow><planeGeometry args={[30, 12]} /><meshStandardMaterial color={palette.wall} roughness={1} /></mesh>
    <mesh position={[0, 0.02, 1.6]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[2.2, 48]} /><meshStandardMaterial color={palette.coral} roughness={1} transparent opacity={0.35} /></mesh>
    {/* round window */}
    <mesh position={[0, 4.15, -0.38]}><circleGeometry args={[0.55, 32]} /><meshStandardMaterial color={palette.sky} emissive={palette.sky} emissiveIntensity={0.6} /></mesh>
    <mesh position={[0, 4.15, -0.37]}><torusGeometry args={[0.55, 0.05, 8, 40]} /><meshStandardMaterial color={palette.woodDark} /></mesh>
  </group>;
}

function LabelTracker({ labels }: { labels: RefObject<(HTMLDivElement | null)[]> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    CASE_X.forEach((x, i) => {
      const el = labels.current?.[i]; if (!el) return;
      v.set(x, 0, 0.6).project(camera);
      el.style.transform = `translate(-50%, -50%) translate(${(v.x + 1) / 2 * size.width}px, ${(1 - v.y) / 2 * size.height}px)`;
    });
  });
  return null;
}

function Controls({ reset, zoom }: { reset: number; zoom: number }) {
  const { camera } = useThree();
  const ref = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => { (camera as THREE.PerspectiveCamera).zoom = zoom; camera.updateProjectionMatrix(); }, [camera, zoom]);
  useEffect(() => { ref.current?.reset(); }, [reset]);
  return (
    <OrbitControls
      ref={ref}
      target={[0, 1.6, 0.6]}
      enablePan={false}
      enableZoom
      minDistance={5.5}
      maxDistance={13}
      minPolarAngle={0.65}
      maxPolarAngle={1.55}
      enableDamping
      autoRotate={false}
    />
  );
}

export function LibraryScene({ selected, onSelect, progress, growth, paused, reset, zoom }: { selected: IslandId; onSelect: (id: IslandId) => void; progress: IslandProgress; growth: IslandId | null; paused: boolean; reset: number; zoom: number }) {
  const [palette, setPalette] = useState<Palette | null>(null);
  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    const tk = (n: string) => s.getPropertyValue(`--world-${n}`).trim();
    setPalette({ sky: tk("sky"), green: tk("green"), gold: tk("gold"), coral: tk("coral"), ink: tk("ink"), paper: tk("paper"), wood: tk("wood"), woodDark: tk("wood-dark"), wall: tk("wall"), floor: tk("floor") });
  }, []);
  const wood = useMemo(() => palette ? woodTexture(palette.wood, palette.woodDark) : null, [palette]);
  useEffect(() => () => wood?.dispose(), [wood]);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  if (!palette || !wood) return null;
  return <div className="relative h-full w-full"><Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 2.1, 9], fov: 42 }} aria-label="Interactive 3D knowledge library">
    <color attach="background" args={[palette.wall]} />
    <fog attach="fog" args={[palette.wall, 10, 20]} />
    <ambientLight intensity={0.55} />
    <directionalLight position={[3, 7, 6]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-2} />
    <Environment resolution={64}><Lightformer intensity={1.2} position={[0, 6, 4]} scale={[10, 10, 1]} /><Lightformer color={palette.gold} intensity={0.6} position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} /></Environment>
    <Room palette={palette} wood={wood} />
    {ISLANDS.map((w, i) => <Bookcase key={w.id} index={i} palette={palette} wood={wood} selected={selected === w.id} onSelect={() => onSelect(w.id)} count={progress[w.id]} growing={growth === w.id} paused={paused} />)}
    <LabelTracker labels={labels} />
    <Desk palette={palette} wood={wood} growing={growth !== null} paused={paused} />
    {!paused && <Sparkles count={40} scale={[10, 4, 4]} position={[0, 2, 1]} size={2} speed={0.2} opacity={0.5} color={palette.paper} />}
    <Controls reset={reset} zoom={zoom} />
  </Canvas>
    {ISLANDS.map((w, i) => <div key={w.id} ref={el => { labels.current[i] = el; }} className={`absolute left-0 top-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold shadow-soft pointer-events-none ${selected === w.id ? "bg-world-green text-primary-foreground" : "bg-card/90 text-world-ink"}`}>{w.name} · {progress[w.id]}</div>)}
  </div>;
}
