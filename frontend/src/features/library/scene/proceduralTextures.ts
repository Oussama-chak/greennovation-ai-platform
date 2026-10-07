import * as THREE from "three";

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function makeWoodTexture(base = "#c4a574", dark = "#6b4423"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.12 + hash(i) * 0.12;
    ctx.beginPath();
    const y = i * 6.5 + hash(i) * 4;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(64, y + 3, 160, y - 4, 256, y + hash(i + 3) * 5);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

export function makeHerringboneTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const lights = ["#c9a078", "#b89068", "#d4ae88"];
  const darks = ["#8f6d48", "#7a5a3a"];
  ctx.fillStyle = "#b89068";
  ctx.fillRect(0, 0, 256, 256);
  const plankW = 48;
  const plankH = 16;
  for (let row = -2; row < 20; row++) {
    for (let col = -2; col < 12; col++) {
      const x = col * plankW + (row % 2) * (plankW / 2);
      const y = row * (plankH / 2);
      ctx.save();
      ctx.translate(x + plankW / 2, y + plankH / 2);
      ctx.rotate(((row + col) % 2 === 0 ? 1 : -1) * (Math.PI / 4));
      ctx.fillStyle = lights[(row + col + 20) % lights.length];
      ctx.fillRect(-plankW / 2, -plankH / 2, plankW - 1, plankH - 1);
      ctx.strokeStyle = darks[(row + col) % darks.length];
      ctx.globalAlpha = 0.35;
      ctx.strokeRect(-plankW / 2, -plankH / 2, plankW - 1, plankH - 1);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

export function makeRugTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 280);
  g.addColorStop(0, "#3a8a8e");
  g.addColorStop(1, "#2f6f73");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#8b2f3a";
  ctx.lineWidth = 28;
  ctx.strokeRect(24, 24, 464, 464);
  ctx.strokeStyle = "#d4a537";
  ctx.lineWidth = 10;
  ctx.strokeRect(48, 48, 416, 416);
  ctx.strokeStyle = "#c45c4a";
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(256 + Math.cos(a) * 120, 256 + Math.sin(a) * 120, 36, 0, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.fillStyle = "#f1e6cc";
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(256, 256, 50, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeCreamShelfTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f3ebe0";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(180,160,130,${0.03 + hash(i) * 0.05})`;
    ctx.fillRect(hash(i + 2) * 128, hash(i + 5) * 128, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
