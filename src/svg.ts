// Turning generated SVG into pictures the 3D scene can use. Nothing here is a file on disk.

import * as THREE from "three";

export async function svgToCanvas(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return c;
}

export function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let grain: HTMLCanvasElement | null = null;

/** Paper fibre: speckles and short strands, tiled over anything paper. */
export function paperGrain(): HTMLCanvasElement {
  if (grain) return grain;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 5200; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${0.02 + Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  g.lineWidth = 0.7;
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const a = Math.random() * Math.PI * 2;
    g.strokeStyle = `rgba(90,60,30,${0.03 + Math.random() * 0.05})`;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
    g.stroke();
  }
  return (grain = c);
}

/** Lays paper grain over whatever is already drawn, leaving empty areas empty. */
export function addGrain(c: HTMLCanvasElement): void {
  const g = c.getContext("2d")!;
  g.save();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = g.createPattern(paperGrain(), "repeat")!;
  g.fillRect(0, 0, c.width, c.height);
  g.restore();
}

/** A die-cut: the drawing with a border of bare paper all round its outline. */
export function dieCut(src: HTMLCanvasElement, border: number, paper = "#fdf6e6"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    g.drawImage(src, Math.cos(a) * border, Math.sin(a) * border);
  }
  g.globalCompositeOperation = "source-in";
  g.fillStyle = paper;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "source-over";
  g.drawImage(src, 0, 0);
  addGrain(c);
  return c;
}

/** A soft round glow, for lantern light. */
export function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,190,110,.5)");
  r.addColorStop(0.3, "rgba(255,160,80,.22)");
  r.addColorStop(1, "rgba(255,140,50,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

export function skyTexture(top: string, mid: string, low: string, paper: boolean): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  const r = g.createLinearGradient(0, 0, 0, 512);
  r.addColorStop(0, top);
  r.addColorStop(0.6, mid);
  r.addColorStop(1, low);
  g.fillStyle = r;
  g.fillRect(0, 0, 512, 512);
  if (paper) addGrain(c);
  return toTexture(c);
}
