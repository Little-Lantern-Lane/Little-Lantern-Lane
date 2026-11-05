// The ground under the village: one strip that follows the hill, painted on a canvas (grass, the
// lane, the paved Square, the worn track up the Hill), with a second painting for snow.

import * as THREE from "three";
import { groundH, gameX } from "../space";

const X0 = -12;
const X1 = 92;
const Z0 = -22;
const Z1 = 16;
const W = 4096;
const H = 1024;

const clampX = (X: number) => Math.max(0, Math.min(gameX(X), 4399));
const smooth = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};

/** Height of the ground anywhere: the hill's rise along the path, and land climbing away far behind. */
export const groundAt = (X: number, z: number) => groundH(clampX(X)) + smooth((-z - 15) / 30) * 7;

/** The strip mesh, with no texture yet. It reaches well past the painted part; the canvas's edges are plain. */
export function groundMesh(): THREE.Mesh {
  const xs: number[] = [];
  for (let X = -70; X < -10; X += 10) xs.push(X);
  for (let X = -10; X < 56; X += 6) xs.push(X);
  for (let X = 56; X < 84; X += 0.7) xs.push(X);
  for (let X = 84; X <= 164; X += 10) xs.push(X);
  const zs = [-90, -70, -55, -45, -38, -32, -27, -23, -19, -15, -11, -7, -3, 1, 5, 9, 13, 17, 22, 30, 45];
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (const z of zs) {
    for (const X of xs) {
      pos.push(X, groundAt(X, z), z);
      uv.push((X - X0) / (X1 - X0), 1 - (z - Z0) / (Z1 - Z0));
    }
  }
  const n = xs.length;
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ roughness: 1 }));
  m.receiveShadow = true;
  return m;
}

const px = (X: number) => ((X - X0) / (X1 - X0)) * W;
const py = (z: number) => ((z - Z0) / (Z1 - Z0)) * H;

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

/** Fill the area between a back edge and a front edge along the path, with soft sides. */
function band(g: CanvasRenderingContext2D, x0: number, x1: number, back: (X: number) => number, front: (X: number) => number, color: string, blur = 16) {
  g.save();
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = blur;
  g.beginPath();
  for (let X = x0; X <= x1; X += 0.5) (X === x0 ? g.moveTo.bind(g) : g.lineTo.bind(g))(px(X), py(back(X)));
  for (let X = x1; X >= x0; X -= 0.5) g.lineTo(px(X), py(front(X)));
  g.closePath();
  g.fill();
  g.restore();
}

function blot(g: CanvasRenderingContext2D, X: number, z: number, rx: number, rz: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(px(X), py(z), (rx / (X1 - X0)) * W, (rz / (Z1 - Z0)) * H, 0, 0, 7);
  g.fill();
}

const laneBack = (X: number) => -3.1 + 0.16 * Math.sin(X * 0.55);
const laneFront = (X: number) => 4.9 + 0.3 * Math.sin(X * 0.33 + 1);
const hillMid = (X: number) => 0.5 * Math.sin((X - 58) * 0.22);
/** The track up the Hill narrows out of the Square and thins away past the hollow. */
const hillHalf = (X: number) => (X < 62 ? 4.6 - (X - 58) * 0.75 : 1.6) * (X > 80 ? Math.max(0, 1 - (X - 80) / 8) : 1);

function paved(g: CanvasRenderingContext2D, color: string, blur: number) {
  g.save();
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = blur;
  g.beginPath();
  g.roundRect(px(36.4), py(-8.2), px(59) - px(36.4), py(7.9) - py(-8.2), 150);
  g.fill();
  g.restore();
}

/** Short paths from the doors to the lane. */
const YARDS = [5.45, 13.45, 22.2, 27, 31.35];

function feather(g: CanvasRenderingContext2D, c: string) {
  const edge = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    const l = g.createLinearGradient(x0, y0, x1, y1);
    l.addColorStop(0, c);
    l.addColorStop(1, `${c}00`);
    g.fillStyle = l;
    g.fillRect(rx, ry, rw, rh);
  };
  edge(0, 0, 0, 90, 0, 0, W, 90);
  edge(0, H, 0, H - 90, 0, H - 90, W, 90);
  edge(W, 0, W - 120, 0, W - 120, 0, 120, H);
}

export function summerGround(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const r = rng(11);
  const grass = "#8fbb68";
  g.fillStyle = grass;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = r() < 0.5 ? "rgba(176,214,122,.14)" : "rgba(92,140,76,.12)";
    g.beginPath();
    g.ellipse(r() * W, r() * H, 20 + r() * 70, 10 + r() * 30, 0, 0, 7);
    g.fill();
  }
  band(g, X0 - 2, 38, laneBack, laneFront, "#e8d1a2");
  for (const X of YARDS) band(g, X - 0.7, X + 0.7, () => -6, () => -2.8, "#e0c896", 8);
  band(g, 57, X1, (X) => hillMid(X) - hillHalf(X), (X) => hillMid(X) + hillHalf(X), "#ddc698", 22);
  paved(g, "#e6cc9f", 26);
  // Big flat stones worn into the lane, as in the 2D lane.
  for (let i = 0; i < 70; i++) {
    const X = r() * 38 - 2;
    const z = laneBack(X) + 0.5 + r() * 7;
    const s = 0.3 + r() * 0.5;
    blot(g, X, z, s * 1.4, s * 0.6, "rgba(224,189,134,.55)");
  }
  feather(g, grass);
  return finish(c);
}

export function snowGround(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const r = rng(29);
  const snow = "#eef3f9";
  g.fillStyle = snow;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) {
    const X = X0 + r() * (X1 - X0);
    const z = Z0 + r() * (Z1 - Z0);
    const s = 1 + r() * 3;
    blot(g, X, z + 0.12, s, s * 0.34, "rgba(203,216,233,.42)");
    blot(g, X - 0.2, z - 0.04, s * 0.7, s * 0.2, "rgba(255,255,255,.9)");
  }
  // Paths pressed down a little by feet and carts.
  band(g, X0 - 2, 38, (X) => laneBack(X) + 0.9, (X) => laneFront(X) - 1.2, "rgba(218,228,240,.8)", 40);
  paved(g, "rgba(226,234,244,.7)", 60);
  band(g, 57, X1, (X) => hillMid(X) - hillHalf(X) * 0.6, (X) => hillMid(X) + hillHalf(X) * 0.6, "rgba(218,228,240,.7)", 40);
  feather(g, snow);
  return finish(c);
}

function finish(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
