// The woods past Lantern Lane: Hazel Wood, the river running across your way, and the far bank,
// in its own blue-green light. Everything you can gather is drawn in a handful of instanced meshes,
// so picking something only shrinks its pieces to nothing.

import * as THREE from "three";
import { FISHING_SPOTS, NODES, riverMidX, WOODS, type GatherNode } from "../../game/layout";
import type { ItemId } from "../../logic/bag";
import type { WorldState } from "../../logic/world";
import { flow, lantern, own, paint, seeded, seeThrough, soft, waterSheet } from "../kit";
import { regionZ, worldX as X } from "../space";
import type { Blocker, LightSpot, RegionKit } from "../types";
import { bake, dot, Parts, pbox, pipe, Scatter } from "./village-parts";

export interface WoodsKit extends RegionKit {
  /** Show or hide what can be picked at this node. */
  setNode(id: string, ready: boolean): void;
}

const NEAR_GREENS = ["#6fae5c", "#7cb25c", "#5f9f5a", "#88b860", "#94b95c"];
const FAR_LEAVES = ["#4fa3a0", "#5a9cc0", "#7f86c8", "#4b8f9a", "#6fb8ae"];
const FLOWERS = ["#fbe08a", "#f4b9c0", "#fffaf0", "#f08a6a"];
const FAR_FLOWERS = ["#bfe6ff", "#d9c4ff", "#a8f0dc"];
const NEAR_GROUND = "#9cc876";
const FAR_GROUND = "#7cb6a4";
const PEBBLES = ["#d8cdb4", "#c8bda4", "#e2d8c2", "#b8b0a4"];

const WEST = X(WOODS.x0);
const EAST = X(WOODS.x1);
const R0 = X(WOODS.river0);
const R1 = X(WOODS.river1);
const RMID = (R0 + R1) / 2;
const RHALF = (R1 - R0) / 2 - 0.25;
// The painted ground.
const GX0 = WEST - 8;
const GX1 = EAST + 8;
const GZ0 = -74;
const GZ1 = 74;
/** How far you can walk from the middle of the wood, and where the forest closes in. */
const B = WOODS.band;

const riverMid = (z: number) => X(riverMidX(z));

/** The trail's middle: winding, but straight onto the bridge. */
function trailZ(x: number): number {
  const bridge = Math.min(1, Math.abs(x - RMID) / 16);
  return (Math.sin(x * 0.17) * 1.1 + Math.sin(x * 0.07 + 1) * 0.5) * bridge;
}

/** Side paths that wander off the main trail into the depths of each bank, as [x, z] points. */
const PATHS: [number, number][][] = [
  [[272, 0], [270, -10], [276, -22], [272, -36]],
  [[292, 0], [296, 12], [288, 24], [292, 38]],
  [[258, 0], [262, 14], [270, 24], [288, 24]],
  [[276, -22], [290, -26], [300, -20]],
  [[334, 0], [338, -12], [332, -26], [340, -38]],
  [[352, 0], [348, 14], [356, 26], [350, 38]],
  [[338, -12], [352, -18], [344, -30]],
];
/** Open places to find your way by, as [x, z, radius]: sunlit glades here, stones and moss over there. */
const GLADES: [number, number, number][] = [[276, -24, 8], [262, 26, 7], [296, 30, 6], [344, -30, 9], [352, 26, 7], [336, 34, 5]];

const distToPath = (x: number, z: number) => {
  let best = 99;
  for (const line of PATHS) {
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1];
      const [bx, bz] = line[i];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
      best = Math.min(best, Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az)));
    }
  }
  return best;
};

function groundCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 4096;
  c.height = 2048;
  const g = c.getContext("2d")!;
  const px = (x: number) => ((x - GX0) / (GX1 - GX0)) * c.width;
  const py = (z: number) => ((z - GZ0) / (GZ1 - GZ0)) * c.height;
  const r = seeded(211);
  g.fillStyle = NEAR_GROUND;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = FAR_GROUND;
  g.beginPath();
  g.moveTo(c.width, 0);
  for (let z = GZ0; z <= GZ1; z += 1) g.lineTo(px(riverMid(z)), py(z));
  g.lineTo(c.width, c.height);
  g.fill();
  const blot = (x: number, z: number, rx: number, rz: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(px(x), py(z), (rx / (GX1 - GX0)) * c.width, (rz / (GZ1 - GZ0)) * c.height, 0, 0, 7);
    g.fill();
  };
  for (let i = 0; i < 3200; i++) {
    const x = GX0 + r() * (GX1 - GX0);
    const z = GZ0 + r() * (GZ1 - GZ0);
    const far = x > riverMid(z);
    const col = far ? (r() < 0.5 ? "rgba(150,215,200,.22)" : "rgba(80,130,150,.18)") : r() < 0.5 ? "rgba(190,220,120,.24)" : "rgba(100,150,80,.16)";
    blot(x, z, 1 + r() * 3, 0.5 + r() * 1.4, col);
  }
  // Sunny clearings in Hazel Wood, and pools of cooler moss on the far bank.
  for (const [x, z, rr] of GLADES) blot(x, z, rr * 1.2, rr * 1.1, x < RMID ? "rgba(226,230,140,.34)" : "rgba(120,190,200,.32)");
  // The trail.
  const stroke = (from: number, to: number, w: number, color: string) => {
    g.strokeStyle = color;
    g.lineWidth = (w / (GZ1 - GZ0)) * c.height;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    for (let x = from; x <= to; x += 0.6) (x === from ? g.moveTo.bind(g) : g.lineTo.bind(g))(px(x), py(trailZ(x)));
    g.stroke();
  };
  stroke(WEST, R0 + 0.5, 3.1, "#c9b184");
  stroke(WEST, R0 + 0.5, 2.3, "#dec49a");
  stroke(R1 - 0.5, EAST, 2.9, "#a7b5a8");
  stroke(R1 - 0.5, EAST, 2.1, "#c4cbbb");
  for (const line of PATHS) {
    const near = line[0][0] < RMID;
    for (const [w, color] of [[2.5, near ? "#c9b184" : "#a7b5a8"], [1.8, near ? "#dec49a" : "#c4cbbb"]] as const) {
      g.strokeStyle = color;
      g.lineWidth = (w / (GZ1 - GZ0)) * c.height;
      g.beginPath();
      line.forEach(([x, z], i) => (i ? g.lineTo(px(x), py(z)) : g.moveTo(px(x), py(z))));
      g.stroke();
    }
  }
  for (let i = 0; i < 260; i++) {
    const x = WEST + r() * (EAST - WEST);
    if (x > R0 && x < R1) continue;
    blot(x, trailZ(x) + (r() - 0.5) * 2, 0.3 + r() * 0.7, 0.1 + r() * 0.16, x < RMID ? "rgba(190,160,115,.6)" : "rgba(150,170,165,.6)");
  }
  // Pebble banks either side of the water.
  for (let z = GZ0; z < GZ1; z += 0.5) {
    const mid = riverMid(z);
    blot(mid, z, RHALF + 1.5 + Math.sin(z * 0.8) * 0.3, 0.7, "#d8cfb6");
  }
  for (let i = 0; i < 2400; i++) {
    const z = GZ0 + r() * (GZ1 - GZ0);
    const side = r() < 0.5 ? -1 : 1;
    blot(riverMid(z) + side * (RHALF + r() * 1.5), z, 0.1 + r() * 0.16, 0.05 + r() * 0.09, PEBBLES[Math.floor(r() * 4)]);
  }
  // Fallen leaves on the near side.
  for (let i = 0; i < 1600; i++) {
    const z = -B + r() * 2 * B;
    const x = WEST + r() * (riverMid(z) - WEST);
    blot(x, z, 0.14, 0.07, ["#e0a84e", "#d98a4a", "#c9b04e"][i % 3]);
  }
  return c;
}

/** The ground: a painted strip over two wide plain sheets that reach past where you can see. */
function buildGround(Z: number): THREE.Group {
  const g = new THREE.Group();
  const big = (x0: number, x1: number, color: string) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 420), soft(color, 1));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, -0.04, Z);
    m.receiveShadow = true;
    return m;
  };
  g.add(big(WEST - 90, RMID, NEAR_GROUND), big(RMID, EAST + 90, FAR_GROUND));
  const t = new THREE.CanvasTexture(groundCanvas());
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(GX1 - GX0, GZ1 - GZ0), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  strip.rotation.x = -Math.PI / 2;
  strip.position.set((GX0 + GX1) / 2, 0, Z + (GZ0 + GZ1) / 2);
  strip.receiveShadow = true;
  g.add(strip);
  return g;
}

/** The river as a strip following its curve, flowing toward the camera. */
function buildRiver(Z: number): THREE.Mesh {
  const m = waterSheet(1, 1, "#5fb0c6", "#a2e0e2", [1, 1], 17);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const zs: number[] = [];
  for (let z = -160; z <= 160; z += 2) zs.push(z);
  zs.forEach((z, i) => {
    const mid = riverMid(z);
    for (const side of [-1, 1]) {
      pos.push(mid + side * RHALF, 0.02, Z + z);
      uv.push(side < 0 ? 0 : 1.2, z / 9);
    }
    if (i) {
      const a = (i - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  m.geometry.dispose();
  m.geometry = geo;
  m.rotation.x = 0;
  m.frustumCulled = false;
  return m;
}

function sign(text: string, w: number, h: number): THREE.Mesh {
  const t = paint(512, Math.round((512 * h) / w), (g) => {
    const c = g.canvas;
    g.fillStyle = "#a8674a";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#fff6e6";
    g.font = `bold ${Math.round(c.height * 0.56)}px "Trebuchet MS", "Segoe UI", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width / 2, c.height * 0.54);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  m.userData.keep = true;
  return m;
}

function gate(p: Parts, x: number, z: number): void {
  const wood = soft("#8a6444");
  const dark = soft("#6e4e38");
  for (const d of [-1.35, 1.35]) p.add(pipe(0.13, 0.16, 3.3, wood, x + d, 1.65, z));
  p.add(pbox(3.5, 0.24, 0.26, 0.08, dark, x, 3.3, z));
  p.add(pbox(2.5, 0.6, 0.12, 0.1, soft("#a8674a"), x, 2.75, z + 0.04));
  const face = sign("TO THE LANE", 2.2, 0.46);
  face.position.set(x, 2.75, z + 0.12);
  p.add(face);
}

/** The bridge, once it's built: planks across the river, posts and rails. */
function bridge(Z: number): THREE.Group {
  const p = new Parts();
  const x0 = R0 - 0.3;
  const x1 = R1 + 0.3;
  const wood = ["#b98a5e", "#a97a50", "#c49a6c"];
  let i = 0;
  for (let x = x0; x < x1; x += 0.46, i++) p.add(pbox(0.42, 0.07, 2.7, 0.03, soft(wood[i % 3]), x + 0.2, 0.05, Z));
  const rail = soft("#7a5a40");
  for (const side of [-1.32, 1.32]) {
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 6) p.add(pipe(0.07, 0.09, 1.1, rail, x, 0.55, Z + side));
    p.add(pbox(x1 - x0 + 0.2, 0.1, 0.1, 0.04, rail, (x0 + x1) / 2, 1.05, Z + side), pbox(x1 - x0, 0.06, 0.06, 0.03, rail, (x0 + x1) / 2, 0.62, Z + side));
  }
  return bake(p.base);
}

/** What the storm left: stumps, a snapped plank or two, and a trailing rope. */
function wreck(Z: number): THREE.Group {
  const p = new Parts();
  const dark = soft("#7a5a40");
  const plank = soft("#a97a50");
  for (const [x, z, h, tilt] of [[R0 - 0.1, 1.3, 1, 0], [R0 - 0.1, -1.3, 0.7, 0.1], [R0 + 1.5, 1.3, 0.5, -0.25], [RMID, -1.3, 0.34, 0.18], [R1 - 1.4, 1.3, 0.42, 0.3], [R1 + 0.1, -1.3, 0.9, -0.08], [R1 + 0.1, 1.3, 1, 0]] as const) {
    const post = pipe(0.08, 0.1, h, dark, x, h / 2, Z + z);
    post.rotation.z = tilt;
    p.add(post);
  }
  for (let k = 0; k < 3; k++) p.add(pbox(0.42, 0.07, 2.5 - k * 0.5, 0.03, plank, R0 - 0.4 + k * 0.46, 0.05, Z + k * 0.12));
  for (let k = 0; k < 2; k++) p.add(pbox(0.42, 0.07, 2.4 - k * 0.7, 0.03, plank, R1 + 0.4 - k * 0.46, 0.05, Z - k * 0.14));
  const snapped = pbox(1.9, 0.07, 0.42, 0.03, plank, R0 + 1.1, 0.22, Z + 0.5);
  snapped.rotation.set(0.1, 0.5, -0.2);
  const other = pbox(1.3, 0.07, 0.42, 0.03, plank, R1 - 1.5, 0.12, Z - 1);
  other.rotation.set(0, -0.8, 0.14);
  p.add(snapped, other);
  const rope = soft("#d8c49a");
  for (let k = 0; k < 9; k++) p.add(dot(0.05, rope, R0 + 0.1 + k * 0.16, 0.86 - k * k * 0.0105, Z + 1.3 - k * 0.012));
  return bake(p.base);
}

// --- Things to gather -------------------------------------------------------------------------

const FRUIT: Partial<Record<ItemId, string>> = { apple: "#e0473f", plum: "#7a4bb0", blackberry: "#3f2f5e", moonberry: "#dfe9ff" };
const CAPS: Partial<Record<ItemId, { cap: string; stem: string; r: number; n: number }>> = {
  button_cap: { cap: "#f1e6d2", stem: "#fbf4e6", r: 0.17, n: 5 },
  chanterelle: { cap: "#f2a93c", stem: "#f7cf7a", r: 0.2, n: 4 },
  bluecap: { cap: "#4f86d0", stem: "#dcecff", r: 0.21, n: 4 },
  glowcap: { cap: "#7ff0d8", stem: "#d8fff4", r: 0.22, n: 4 },
};
const CRYSTAL: Partial<Record<ItemId, string>> = { quartz: "#f2f6ff", ironstone: "#b0654a", copper: "#d98a4e", skyglass: "#58a8f0" };

interface Bit {
  node: string;
  mesh: 0 | 1 | 2 | 3;
  m: THREE.Matrix4;
  c: string;
}

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const bitMatrix = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

export function buildWoods(): WoodsKit {
  const Z = regionZ(WOODS.x0 + 100);
  const group = new THREE.Group();
  group.add(buildGround(Z));
  const river = buildRiver(Z);
  group.add(river);
  // In snow the painted ground goes under a white sheet; the river keeps moving.
  const snowfield = new THREE.Mesh(new THREE.PlaneGeometry(GX1 - GX0 + 180, 420), new THREE.MeshStandardMaterial({ color: "#f1f4f8", roughness: 1 }));
  snowfield.rotation.x = -Math.PI / 2;
  snowfield.position.set((GX0 + GX1) / 2, 0.015, Z);
  snowfield.receiveShadow = true;
  group.add(snowfield);
  const blockers: Blocker[] = [];
  const lights: LightSpot[] = [];

  const p = new Parts();
  const s = new Scatter();
  const r = seeded(97);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(r() * list.length)];
  const farSide = (x: number, z = 0) => x > riverMid(z);
  const nodeSpots = NODES.map((n) => [X(n.x), n.z] as const);
  const spots = FISHING_SPOTS.map((f) => [X(f.x), f.z] as const);
  const clear = (x: number, z: number, ring: number) => nodeSpots.every(([a, b]) => Math.hypot(a - x, b - z) > ring) && spots.every(([a, b]) => Math.hypot(a - x, b - z) > ring + 0.6);
  const offRiver = (x: number, z: number, m: number) => Math.abs(x - riverMid(z)) > RHALF + m;

  const hazel = (x: number, z: number, sc: number, far: boolean) => {
    const leaf = far ? "farLeaf" : "leaf";
    const green = pick(NEAR_GREENS);
    s.put("trunk", x, 1.75 * sc, z, 0.34 * sc, 3.5 * sc, 0.34 * sc, "#7c5a42");
    const lift = 1.3;
    const crown = far ? [[0, 2.9, 0, 1.6], [-1, 2.4, 0.2, 1.1], [1, 2.5, 0.1, 1.15]] : [[0, 2.9, 0, 1.45], [-0.95, 2.3, 0.2, 1], [0.95, 2.4, 0.1, 1.05], [0.1, 3.8, -0.1, 1], [0.2, 2.2, 0.8, 0.8]];
    for (const [dx, dy, dz, rr] of crown) {
      s.put(leaf, x + dx * sc, (dy + lift) * sc, z + dz * sc, rr * sc, rr * sc, rr * sc, r() < 0.3 ? pick(NEAR_GREENS) : green);
      s.put("cap", x + dx * sc, (dy + lift + rr * 0.2) * sc, z + dz * sc, rr * 1.03 * sc, rr * 0.9 * sc, rr * 1.03 * sc, "#fbfdff");
    }
  };
  /** Tall and slender with a pale trunk: the far bank's trees. */
  const slender = (x: number, z: number, sc: number, far: boolean) => {
    const leaf = far ? "farLeaf" : "leaf";
    const col = pick(FAR_LEAVES);
    s.put("trunk", x, 2.4 * sc, z, 0.2 * sc, 4.8 * sc, 0.2 * sc, "#dcd8ea");
    for (const [dy, rr, dx] of far ? [[4.3, 1.2, 0.1], [5.6, 1.1, -0.1]] : [[3.9, 1.05, 0.2], [4.9, 1.2, -0.15], [5.9, 0.9, 0.1], [6.6, 0.55, 0]]) {
      s.put(leaf, x + dx * sc, dy * sc, z, rr * sc, rr * 0.85 * sc, rr * sc, r() < 0.3 ? pick(FAR_LEAVES) : col);
      s.put("cap", x + dx * sc, (dy + rr * 0.2) * sc, z, rr * 1.03 * sc, rr * 0.78 * sc, rr * 1.03 * sc, "#fbfdff");
    }
  };
  const treeAt = (x: number, z: number, sc: number, far: boolean) => (farSide(x, z) ? slender(x, z, sc, far) : hazel(x, z, sc, far));
  const inGlade = (x: number, z: number) => GLADES.some(([a, b, rr]) => Math.hypot(a - x, b - z) < rr);

  // Standing trees all through the wood, kept clear of paths, glades and what you gather.
  for (let i = 0, made = 0; i < 4000 && made < 300; i++) {
    const x = WEST + 3 + r() * (EAST - WEST - 6);
    const z = -B + r() * 2 * B;
    if (Math.abs(z - trailZ(x)) < 2.8 || distToPath(x, z) < 2.2 || inGlade(x, z) || !clear(x, z, 2.1) || !offRiver(x, z, 3.2)) continue;
    if (Math.abs(x - X(WOODS.gate)) < 4 && Math.abs(z) < 6) continue;
    const sc = 0.85 + r() * 0.5;
    treeAt(x, z, sc, made % 6 !== 0);
    blockers.push({ X: x, Z: Z + z, r: 0.42 * sc });
    made++;
  }
  // The forest closes in on every side, thick enough that the edge is just more trees.
  const wall = (x: number, z: number) => {
    if (offRiver(x, z, 2)) treeAt(x, z, 1.25 + r() * 0.8, true);
  };
  for (let x = WEST - 12; x < EAST + 12; x += 2.6) {
    for (const depth of [1.5, 5, 9, 14, 20]) {
      wall(x + r() * 1.6, -B - depth - r() * 2.5);
      wall(x + r() * 1.6, B + depth + r() * 2.5);
    }
  }
  for (let z = -B; z < B; z += 2.6) {
    for (const depth of [1, 4.5, 8.5]) {
      wall(WEST - depth - r() * 2, z + r() * 1.6);
      wall(EAST + depth + r() * 2, z + r() * 1.6);
    }
  }
  // Hills past the trees, all the way round.
  const hill = (x: number, z: number) => {
    const big = 11 + r() * 9;
    const m = dot(1, soft(farSide(x, z) ? "#4f8f94" : "#5f9a5c"), x, 0, Z + z, 0.55);
    m.scale.set(big * 1.6, big, big * 1.6);
    m.castShadow = false;
    p.add(m);
  };
  for (let x = WEST - 44; x < EAST + 44; x += 13) {
    hill(x, -B - 42 - r() * 14);
    hill(x, B + 42 + r() * 14);
  }
  for (let z = -B - 30; z < B + 30; z += 13) {
    hill(WEST - 42 - r() * 12, z);
    hill(EAST + 42 + r() * 12, z);
  }
  // Boulders mark where you can't walk further.
  for (const x of [WEST + 0.2, EAST - 0.2]) for (let z = -B - 1; z < B + 1; z += 1.3) s.put("rock", x, 0.3, z, 0.8, 0.6, 0.7, "#9fa89a");
  for (const z of [-B - 0.6, B + 0.6]) {
    for (let x = WEST; x < EAST; x += 1.3) if (offRiver(x, z, 1)) s.put("rock", x, 0.3, z, 0.7, 0.6, 0.8, "#9fa89a");
  }

  // Bushes through the wood.
  for (let i = 0; i < 260; i++) {
    const x = WEST + r() * (EAST - WEST);
    const z = -B + r() * 2 * B;
    if (!offRiver(x, z, 1.8) || distToPath(x, z) < 1.6 || Math.abs(z - trailZ(x)) < 2.2 || !clear(x, z, 1.7)) continue;
    const far = farSide(x, z);
    const size = 0.5 + r() * 0.3;
    s.bush(x, 0, z, size, far ? pick(FAR_LEAVES) : pick(NEAR_GREENS), r() < 0.5 ? [pick(far ? FAR_FLOWERS : FLOWERS), pick(far ? FAR_FLOWERS : FLOWERS)] : [], i);
    blockers.push({ X: x, Z: Z + z, r: 0.72 * size });
  }
  // Ferns, grass, flowers and pebbles everywhere that isn't trail.
  for (let i = 0; i < 9000; i++) {
    const x = WEST - 2 + r() * (EAST - WEST + 4);
    const z = -B - 3 + r() * (2 * B + 6);
    if (Math.abs(z - trailZ(x)) < 1.7 || distToPath(x, z) < 1.3 || !offRiver(x, z, 1.7)) continue;
    const far = farSide(x, z);
    const roll = r();
    if (roll < 0.34) s.put("tuft", x, 0.14, z, 0.09, 0.3, 0.09, far ? "#5fae9c" : "#74ad52", r() * 6);
    else if (roll < 0.5) {
      // A fern: a fan of leaning fronds.
      const col = far ? "#4f9f90" : "#5f9f52";
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * 6.28 + r();
        s.put("clump", x + Math.cos(a) * 0.22, 0.14, z + Math.sin(a) * 0.22, 0.27, 0.07, 0.1, col, -a, 0.3);
      }
    } else if (roll < 0.76) s.put("flower", x, 0.09, z, 0.07, 0.07, 0.07, pick(far ? FAR_FLOWERS : FLOWERS));
    else if (roll < 0.86) s.put("pebble", x, 0.04, z, 0.14, 0.07, 0.11, far ? "#b4c0bc" : "#c8bda4", r() * 6);
    else s.put("clump", x, 0.05, z, 0.34, 0.09, 0.25, far ? "#6cb29c" : "#86bb60");
  }
  // Landmarks to find your way by: a great old hazel, and a ring of stones on the far bank.
  {
    const [ox, oz] = [262, 26];
    s.put("trunk", ox, 3, oz, 1.1, 6, 1.1, "#6e4e38");
    for (const [dx, dy, dz, rr] of [[0, 7.4, 0, 4], [-3, 6, 1, 2.9], [3, 6.2, -1, 3], [0.5, 9.8, 0, 2.5]]) {
      s.put("leaf", ox + dx, dy, oz + dz, rr, rr * 0.9, rr, "#5f9f5a");
      s.put("cap", ox + dx, dy + rr * 0.2, oz + dz, rr * 1.03, rr * 0.8, rr * 1.03, "#fbfdff");
    }
    blockers.push({ X: ox, Z: Z + oz, r: 1 });
    const [cx, cz] = [344, -30];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283;
      const [sx, sz, h] = [cx + Math.cos(a) * 6.4, cz + Math.sin(a) * 6.4, 1.7 + (i % 3) * 0.5];
      s.put("boulder", sx, h * 0.55, sz, 0.85, h * 0.62, 0.7, "#a8b4bc", a);
      s.put("clump", sx, h * 1.1, sz, 0.55, 0.2, 0.45, "#6fb88e");
      blockers.push({ X: sx, Z: Z + sz, r: 0.6 });
    }
  }
  // Mossy stones and standing stones on the far bank.
  for (const [x, z, h] of [[324.5, -8.6, 2.2], [326.2, -9, 1.7], [346, 8.8, 2.4], [348, 9.4, 1.8], [361, 8, 1.2], [356, -34, 2]] as const) {
    s.put("boulder", x, h * 0.55, z, 0.85, h * 0.62, 0.7, "#a8b4bc", 0.3 + x);
    s.put("clump", x, h * 1.1, z, 0.55, 0.2, 0.45, "#6fb88e");
    blockers.push({ X: x, Z: Z + z, r: 0.6 });
  }
  for (let i = 0; i < 160; i++) {
    const x = R1 + 2 + r() * (EAST - R1 - 3);
    const z = -B + r() * 2 * B;
    if (!farSide(x, z) || !offRiver(x, z, 2) || Math.abs(z - trailZ(x)) < 2.4 || distToPath(x, z) < 1.6 || !clear(x, z, 1.8)) continue;
    const sz = 0.3 + r() * 0.34;
    s.put("rock", x, sz * 0.4, z, sz * 1.3, sz * 0.8, sz, "#a2b2ae");
    s.put("clump", x, sz * 0.86, z, sz, sz * 0.26, sz * 0.8, "#72bb94");
    blockers.push({ X: x, Z: Z + z, r: sz * 0.9 });
  }

  // The river: rocks in the water and reeds on the banks.
  for (let z = -B; z < B; z += 4.4) {
    if (Math.abs(z) < 2.4) continue;
    const x = riverMid(z) + (r() - 0.5) * 3.4;
    if (spots.some(([, b]) => Math.abs(b - z) < 1.3)) continue;
    const sz = 0.3 + r() * 0.34;
    s.put("rock", x, 0.1, z, sz * 1.25, sz * 0.7, sz, "#a8aaa8");
  }
  for (let i = 0; i < 620; i++) {
    const z = -B - 8 + r() * (2 * B + 16);
    if (Math.abs(z) < 2.2) continue;
    const side = r() < 0.5 ? -1 : 1;
    const x = riverMid(z) + side * (RHALF + 0.05 + r() * 0.7);
    if (spots.some(([a, b]) => Math.hypot(a - x, b - z) < 1.3)) continue;
    const h = 0.5 + r() * 0.5;
    s.put("tuft", x, h / 2, z, 0.05, h, 0.05, r() < 0.5 ? "#7fae5c" : "#94b868", r() * 6);
    if (r() < 0.22) s.put("post", x, h + 0.04, z, 0.045, 0.06, 0.045, "#7a4f34");
  }
  // Pebbles at the water's edge.
  for (let i = 0; i < 800; i++) {
    const z = -B - 8 + r() * (2 * B + 16);
    const x = riverMid(z) + (r() < 0.5 ? -1 : 1) * (RHALF + r() * 1.4);
    s.put("pebble", x, 0.05, z, 0.12 + r() * 0.1, 0.07, 0.1, pick(PEBBLES), r() * 6);
  }

  // A jetty stub or flat stone at each place to fish.
  for (const f of FISHING_SPOTS) {
    const fx = X(f.x);
    const dir = f.bank === "near" ? 1 : -1;
    const wood = soft("#a97a50");
    for (let i = 0; i < 5; i++) p.add(pbox(0.34, 0.08, 1.5, 0.03, wood, fx + dir * (i * 0.38 - 0.3), 0.08, Z + f.z));
    for (const d of [-0.7, 0.7]) p.add(pipe(0.07, 0.08, 0.7, soft("#7a5a40"), fx + dir * 1.3, 0.3, Z + f.z + d));
  }

  gate(p, X(WOODS.gate), Z - 2.4);
  // A signpost on each side of the crossing.
  const arrow = sign("FAR BANK", 1.5, 0.36);
  arrow.position.set(R0 - 2.4, 1.75, Z - 2.15);
  p.add(pipe(0.07, 0.09, 2, soft("#7c5a42"), R0 - 2.4, 1, Z - 2.3), pbox(1.7, 0.46, 0.1, 0.08, soft("#a8674a"), R0 - 2.4, 1.75, Z - 2.22), arrow);
  blockers.push({ X: R0 - 2.4, Z: Z - 2.3, r: 0.14 });

  // Fruit trees, brambles, rocks, birches: the part that stays after picking.
  const bits: Bit[] = [];
  const addBit = (n: GatherNode, mesh: Bit["mesh"], m: THREE.Matrix4, c: string) => bits.push({ node: n.id, mesh, m, c });
  const nr = seeded(431);
  for (const n of NODES) {
    const x = X(n.x);
    const z = n.z;
    const wz = Z + z;
    const far = farSide(x, z);
    if (n.shape === "tree") {
      const sc = 1.05;
      s.put("trunk", x, 0.85 * sc, z, 0.26 * sc, 1.7 * sc, 0.26 * sc, far ? "#a89ab8" : "#7c5a42");
      const leaf = far ? "#5fa8a0" : "#6fae5c";
      const crown: [number, number, number, number][] = [[0, 2.2, 0, 1.05], [-0.72, 1.8, 0.15, 0.72], [0.72, 1.85, 0.1, 0.74], [0.05, 2.8, -0.1, 0.68]];
      for (const [dx, dy, dz, rr] of crown) s.put("leaf", x + dx * sc, dy * sc, z + dz * sc, rr * sc, rr * sc, rr * sc, leaf);
      for (let k = 0; k < 8; k++) {
        const [dx, dy, dz, rr] = crown[k % 4];
        const a = nr() * 6.28;
        const fx = dx + Math.cos(a) * rr * 0.7;
        const fy = dy - 0.1 + (nr() - 0.4) * rr * 1.1;
        const fz = dz + rr * 0.72 + nr() * 0.1;
        addBit(n, 0, bitMatrix(x + fx * sc, fy * sc, z + fz * sc + Z, 0.14, 0.14, 0.14), FRUIT[n.item]!);
      }
      blockers.push({ X: x, Z: wz, r: 0.95 });
    } else if (n.shape === "bramble") {
      const green = far ? "#4f9a9e" : "#4f8f4f";
      for (const [dx, dz, rr] of [[-0.5, 0, 0.5], [0.1, -0.1, 0.62], [0.6, 0.05, 0.46]]) s.put("leaf", x + dx, rr * 0.72, z + dz, rr, rr * 0.9, rr, green);
      for (let k = 0; k < 11; k++) {
        const bx = (nr() - 0.5) * 1.5;
        addBit(n, 0, bitMatrix(x + bx, 0.3 + nr() * 0.55, z + 0.42 + nr() * 0.14 + Z - Math.abs(bx) * 0.14, 0.075, 0.075, 0.075), FRUIT[n.item]!);
      }
      blockers.push({ X: x - 0.45, Z: wz, r: 0.4 }, { X: x + 0.45, Z: wz, r: 0.4 });
    } else if (n.shape === "cap") {
      const c = CAPS[n.item]!;
      const glow = n.item === "glowcap";
      s.put("clump", x, 0.05, z, 0.55, 0.08, 0.45, far ? "#5faa92" : "#78ad58");
      for (let k = 0; k < c.n; k++) {
        const a = (k / c.n) * 6.28 + nr();
        const rad = k === 0 ? 0 : 0.2 + nr() * 0.16;
        const sc = (k === 0 ? 1.25 : 0.8 + nr() * 0.3) * c.r;
        const cx = x + Math.cos(a) * rad;
        const cz = z + Math.sin(a) * rad + Z;
        const h = sc * 1.7;
        addBit(n, 1, bitMatrix(cx, h / 2, cz, sc * 0.42, h, sc * 0.42), c.stem);
        addBit(n, glow ? 3 : 0, bitMatrix(cx, h, cz, sc * 1.25, sc * 0.72, sc * 1.25), c.cap);
      }
    } else if (n.shape === "rock") {
      const sz = 0.72;
      s.put("boulder", x, sz * 0.62, z, sz * 1.2, sz * 0.95, sz, far ? "#9aa8ac" : "#a8a49a", nr() * 6);
      s.put("clump", x - 0.15, sz * 1.42, z - 0.1, sz * 0.7, sz * 0.16, sz * 0.5, far ? "#6fb894" : "#86ae60");
      const col = CRYSTAL[n.item]!;
      for (let k = 0; k < 5; k++) {
        const a = -0.9 + (k / 4) * 1.8;
        const h = 0.22 + nr() * 0.18;
        addBit(n, 2, bitMatrix(x + Math.sin(a) * sz * 0.92, sz * (0.72 + nr() * 0.5), z + Math.cos(a) * sz * 0.72 + Z, h * 0.6, h, h * 0.6, 0.3 * Math.cos(a), nr() * 3, -0.5 * Math.sin(a)), col);
      }
      blockers.push({ X: x, Z: wz, r: 0.68 });
    } else if (n.shape === "log") {
      const len = 1.5 + nr() * 0.5;
      const ry = nr() * 3;
      const col = "#b7a78f";
      addBit(n, 1, bitMatrix(x, 0.2, z + Z, 0.2, len, 0.2, 0, ry, Math.PI / 2), col);
      const end = Math.cos(ry) * len * 0.35;
      addBit(n, 1, bitMatrix(x + end, 0.32, z + Z - Math.sin(ry) * len * 0.35, 0.06, 0.5, 0.06, 0, ry, 0.9), "#a39078");
    } else {
      // A birch: white trunk, dark marks, and a curl of bark to peel.
      const white = "#f3f0e8";
      s.put("trunk", x, 2.3, z, 0.2, 4.6, 0.2, white);
      for (let k = 0; k < 7; k++) s.put("rail", x + (nr() - 0.5) * 0.12, 0.5 + k * 0.56, z + 0.17, 0.16, 0.05, 0.04, "#4a4648");
      const leaf = far ? "#74bca0" : "#a6c75e";
      for (const [dy, rr, dx] of [[4.3, 1.05, 0.15], [5.2, 0.95, -0.15], [5.9, 0.6, 0]]) s.put("leaf", x + dx, dy, z, rr, rr * 0.9, rr, leaf);
      addBit(n, 1, bitMatrix(x + 0.2, 1.3, z + 0.14 + Z, 0.1, 0.8, 0.03, 0, 0, 0.1), "#fffaf0");
      addBit(n, 1, bitMatrix(x + 0.26, 1.7, z + 0.16 + Z, 0.11, 0.2, 0.09, 0.5, 0, 0.1), "#e2c8a8");
      blockers.push({ X: x, Z: wz, r: 0.28 });
    }
  }

  // A stall by the gate, for the chapters when nobody's about to sell to.
  const stallGroup = new Parts();
  const stall = stallGroup.sub(X(WOODS.stall), 0, WOODS.stallZ);
  for (const d of [-1.05, 1.05]) stall.add(pipe(0.06, 0.07, 2.3, soft("#7c5a42"), d, 1.15, -0.1));
  stall.add(pbox(2.5, 0.14, 1, 0.05, soft("#b9895e"), 0, 0.95, 0), pbox(2.2, 0.85, 0.8, 0.05, soft("#a8784e"), 0, 0.46, 0));
  for (let i = 0; i < 6; i++) stall.add(pbox(0.46, 0.1, 1.2, 0.04, soft(i % 2 ? "#fffaf0" : "#7fae6a"), -1.15 + i * 0.46, 2.3, 0.05));
  for (const [dx, col] of [[-0.7, "#e0574c"], [0, "#f2b54a"], [0.7, "#7fc4e8"]] as const) stall.add(dot(0.2, soft(col), dx, 1.14, 0.08));
  const stallSign = sign("THE WOODS STALL", 2.2, 0.36);
  stallSign.position.set(0, 2.72, 0.1);
  stall.add(stallSign);
  const stallMesh = bake(stallGroup.base);
  stallMesh.position.z = Z;
  group.add(stallMesh);
  const stallBlocks: Blocker[] = [-0.7, 0.7].map((d) => ({ X: X(WOODS.stall) + d, Z: Z + WOODS.stallZ, r: 0.65 }));

  const sp = new Parts();
  s.build(sp, 22, 22);
  // Trees and rocks dissolve between you and the camera, wherever it's turned.
  const see = new Map<THREE.Material, THREE.Material>();
  for (const layer of [sp.base, sp.winter]) {
    layer.traverse((o) => {
      const m = o as THREE.InstancedMesh;
      if (!m.isInstancedMesh) return;
      const was = m.material as THREE.Material;
      if (!see.has(was)) see.set(was, seeThrough(was));
      m.material = see.get(was)!;
    });
  }
  // Scatter works in place coordinates; the whole lot moves to this region's z.
  const scattered = new THREE.Group();
  scattered.position.z = Z;
  scattered.add(sp.base, sp.summer, sp.winter);
  group.add(scattered);
  group.add(bake(p.base));

  // Gatherable pieces: spheres, rods, crystals and glowing caps, one instanced mesh each.
  const geos = [new THREE.SphereGeometry(1, 12, 9), new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.OctahedronGeometry(1, 0), new THREE.SphereGeometry(1, 12, 9, 0, Math.PI * 2, 0, Math.PI / 2)];
  const mats = [soft("#ffffff", 0.6), soft("#ffffff", 0.85), own("#ffffff", { roughness: 0.3, flatShading: true }), own("#ffffff", { emissive: "#6fe8d0", emissiveIntensity: 0.65, roughness: 0.5 })];
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const byNode = new Map<string, { list: THREE.InstancedMesh; at: number; m: THREE.Matrix4 }[]>();
  geos.forEach((geo, gi) => {
    const mine = bits.filter((b) => b.mesh === gi);
    const mesh = new THREE.InstancedMesh(geo, mats[gi], Math.max(1, mine.length));
    const col = new THREE.Color();
    mine.forEach((b, i) => {
      mesh.setMatrixAt(i, b.m);
      mesh.setColorAt(i, col.set(b.c));
      const l = byNode.get(b.node) ?? [];
      l.push({ list: mesh, at: i, m: b.m });
      byNode.set(b.node, l);
    });
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  });

  // A small twinkle over everything ready to pick, so it reads at a glance.
  const twinkleAt = NODES.map((n) => {
    const y = n.shape === "tree" ? 2.9 : n.shape === "birch" ? 2.1 : n.shape === "rock" ? 1.6 : n.shape === "bramble" ? 1.15 : 0.75;
    return new THREE.Vector3(X(n.x) + (n.shape === "birch" ? 0.3 : 0), y, Z + n.z + (n.shape === "tree" ? 1 : 0.2));
  });
  const twinkle = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: "#fff3c4", toneMapped: false }), NODES.length);
  twinkle.frustumCulled = false;
  twinkle.castShadow = false;
  group.add(twinkle);
  const ready = new Map(NODES.map((n) => [n.id, true]));

  // Fireflies on the far bank: soft lights drifting in the air, moved in one small array.
  const FLIES = 420;
  const fly = seeded(7);
  const base = Array.from({ length: FLIES }, () => [R1 + 1 + fly() * (EAST - R1 - 2), 0.5 + fly() * 3, Z - B + fly() * 2 * B, fly() * 6.28]);
  const flyPos = new Float32Array(FLIES * 3);
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute("position", new THREE.BufferAttribute(flyPos, 3));
  const dotTex = paint(32, 32, (g) => {
    const grad = g.createRadialGradient(16, 16, 1, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(200,255,240,.7)");
    grad.addColorStop(1, "rgba(160,240,230,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
  });
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: "#d8fff0" }));
  flies.frustumCulled = false;
  group.add(flies);

  const built = bridge(Z);
  const broken = wreck(Z);
  built.visible = false;
  group.add(built, broken);

  // The first lantern of the far bank, on a post in the middle of the bridge.
  const lanternMat = own("#f2b54a", { emissive: "#f2a84a", emissiveIntensity: 0.9, roughness: 0.6 });
  const hung = new THREE.Group();
  hung.add(pipe(0.07, 0.09, 2.5, soft("#7a5a40"), RMID, 1.25, Z - 1.5), pbox(0.7, 0.08, 0.08, 0.03, soft("#7a5a40"), RMID + 0.3, 2.45, Z - 1.5));
  const lamp = lantern(lanternMat);
  lamp.position.set(RMID + 0.55, 2.4, Z - 1.5);
  hung.add(lamp);
  hung.visible = false;
  group.add(hung);
  lights.push({ pos: [RMID + 0.55, 2, Z - 1.1], color: "#ffc27a", power: 26, on: (w) => w.props.includes("bridge_lantern") });

  const m4 = new THREE.Matrix4();
  return {
    group,
    lights,
    blockers,
    setNode(id, on) {
      ready.set(id, on);
      for (const b of byNode.get(id) ?? []) {
        b.list.setMatrixAt(b.at, on ? b.m : zero);
        b.list.instanceMatrix.needsUpdate = true;
      }
    },
    setState(ws: WorldState) {
      const up = ws.props.includes("bridge");
      built.visible = up;
      broken.visible = !up;
      hung.visible = ws.props.includes("bridge_lantern");
      const snow = ws.weather === "snow";
      snowfield.visible = snow;
      sp.winter.visible = snow;
      sp.summer.visible = !snow;
      stallMesh.visible = ws.level !== 7;
      for (const b of stallBlocks) {
        const at = blockers.indexOf(b);
        if (stallMesh.visible && at < 0) blockers.push(b);
        if (!stallMesh.visible && at >= 0) blockers.splice(at, 1);
      }
    },
    update(dt: number, t: number) {
      flow(river, 0, dt * 0.13);
      NODES.forEach((n, i) => {
        const on = ready.get(n.id);
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
        const sc = on ? 0.03 + pulse * pulse * 0.06 : 0;
        const v = twinkleAt[i];
        tmpQ.setFromEuler(tmpE.set(0, t + i, 0));
        m4.compose(v, tmpQ, new THREE.Vector3(sc, sc * 1.5, sc));
        twinkle.setMatrixAt(i, m4);
      });
      twinkle.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < FLIES; i++) {
        const b = base[i];
        flyPos[i * 3] = b[0] + Math.sin(t * 0.35 + b[3]) * 0.9;
        flyPos[i * 3 + 1] = b[1] + Math.sin(t * 0.6 + b[3] * 2) * 0.35;
        flyPos[i * 3 + 2] = b[2] + Math.cos(t * 0.3 + b[3]) * 0.9;
      }
      flyGeo.attributes.position.needsUpdate = true;
    },
  };
}
