import * as THREE from "three";

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  return [c, ctx];
}

export function woodTexture(base = "#b9835a", dark = "#6e4a33"): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = dark;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    const y = i * 6.5 + (i % 3) * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(64, y + 3, 160, y - 3, 256, y + 2);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

export function herringboneTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256);
  ctx.fillStyle = "#c4a06a";
  ctx.fillRect(0, 0, 256, 256);
  const plankW = 28;
  const plankH = 10;
  for (let row = -2; row < 30; row++) {
    for (let col = -2; col < 20; col++) {
      const x = col * plankW + (row % 2) * (plankW / 2);
      const y = row * (plankH - 1);
      ctx.save();
      ctx.translate(x + 128, y);
      ctx.rotate(row % 2 === 0 ? Math.PI / 4 : -Math.PI / 4);
      ctx.fillStyle = col % 2 === 0 ? "#d4b078" : "#b8925a";
      ctx.fillRect(-plankW / 2, -plankH / 2, plankW - 1, plankH - 1);
      ctx.strokeStyle = "rgba(80,50,25,0.25)";
      ctx.strokeRect(-plankW / 2, -plankH / 2, plankW - 1, plankH - 1);
      ctx.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  return t;
}

export function rugTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512);
  // Teal border
  ctx.fillStyle = "#2f6f73";
  ctx.fillRect(0, 0, 512, 512);
  // Cream field
  ctx.fillStyle = "#f1e6cc";
  ctx.fillRect(36, 36, 440, 440);
  // Inner medallion
  ctx.strokeStyle = "#8b2f3a";
  ctx.lineWidth = 8;
  ctx.strokeRect(70, 70, 372, 372);
  ctx.fillStyle = "#8b2f3a";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(256, 256, 110, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#d4a537";
  ctx.beginPath();
  ctx.ellipse(256, 256, 55, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  // Corner flourishes
  ctx.strokeStyle = "#d4a537";
  ctx.lineWidth = 3;
  for (const [cx, cy] of [
    [90, 90],
    [422, 90],
    [90, 422],
    [422, 422],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
