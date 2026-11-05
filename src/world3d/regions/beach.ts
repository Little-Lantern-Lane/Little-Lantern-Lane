// The sands below the Square: a long beach running along the sea, with dunes behind, a headland at
// each end, a pier, and what washes up. You can turn the camera all the way round here, so every
// direction ends in something. Gatherable things work the way they do in the woods.

import * as THREE from "three";
import { distToTrail, TRAILS, BEACH, BEACH_NODES, BEACH_SPOTS, type GatherNode } from "../../game/layout";
import type { ItemId } from "../../logic/bag";
import type { WorldState } from "../../logic/world";
import { flow, own, paint, seeded, seeThrough, soft, waterSheet } from "../kit";
import { regionZ, worldX as X } from "../space";
import type { Blocker, LightSpot, RegionKit } from "../types";
import { bake, dome, dot, Parts, pbox, pipe, Scatter } from "./village-parts";

export interface BeachKit extends RegionKit {
  /** Show or hide what can be picked at this node. */
  setNode(id: string, ready: boolean): void;
}

const WEST = X(BEACH.x0);
const EAST = X(BEACH.x1);
const WATER = BEACH.water;
const BACK = BEACH.back;
// The painted sand.
const GX0 = WEST - 10;
const GX1 = EAST + 10;
const GZ0 = WATER - 4;
const GZ1 = BACK + 36;
const SAND = "#efdcae";
const WET = "#cdb489";
const GRASSES = ["#9ab865", "#86a858", "#a9bf6c"];
const HUTS: [number, string][] = [[25000, "#e98a7a"], [25900, "#7fb0d9"], [26750, "#f2c44a"], [27550, "#8fcc96"]];
const POOLS: [number, number, number][] = [[25150, -9.5, 2], [26650, -8, 1.7], [27250, -3.5, 1.5]];
/** The pier stands just along from the fishing spot at its foot, so a float lands in open water. */
const PIER_X = X(26400) - 2.3;
const GLASS: Partial<Record<ItemId, string>> = { seaglass: "#6fd8c0" };

function sandCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 4096;
  c.height = 1024;
  const g = c.getContext("2d")!;
  const px = (x: number) => ((x - GX0) / (GX1 - GX0)) * c.width;
  const py = (z: number) => ((z - GZ0) / (GZ1 - GZ0)) * c.height;
  const sx = c.width / (GX1 - GX0);
  const sz = c.height / (GZ1 - GZ0);
  const r = seeded(61);
  // Wet near the water, pale and dry further up.
  const fall = g.createLinearGradient(0, py(WATER), 0, py(WATER + 8));
  fall.addColorStop(0, WET);
  fall.addColorStop(1, SAND);
  g.fillStyle = fall;
  g.fillRect(0, 0, c.width, c.height);
  const blot = (x: number, z: number, rx: number, rz: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(px(x), py(z), rx * sx, rz * sz, 0, 0, 7);
    g.fill();
  };
  for (let i = 0; i < 1800; i++) {
    blot(GX0 + r() * (GX1 - GX0), GZ0 + r() * (GZ1 - GZ0), 0.8 + r() * 3, 0.3 + r() * 1, r() < 0.5 ? "rgba(255,244,214,.2)" : "rgba(196,164,116,.1)");
  }
  // Ripples the tide left.
  g.lineCap = "round";
  for (let i = 0; i < 620; i++) {
    const x = GX0 + r() * (GX1 - GX0);
    const z = WATER + r() * 11;
    g.strokeStyle = `rgba(150,120,84,${0.1 + r() * 0.14})`;
    g.lineWidth = 2 + r() * 2;
    g.beginPath();
    g.moveTo(px(x), py(z));
    g.quadraticCurveTo(px(x + 1), py(z + 0.22), px(x + 2.2), py(z));
    g.stroke();
  }
  // Rock pools.
  for (const [x, z, rr] of POOLS) {
    blot(X(x), z, rr * 1.15, rr * 0.8, "#b9a278");
    blot(X(x), z, rr, rr * 0.68, "#7fc4c9");
    blot(X(x) - rr * 0.2, z - rr * 0.1, rr * 0.5, rr * 0.28, "rgba(220,245,240,.5)");
  }
  // The way up to the Square.
  g.strokeStyle = "#dcc596";
  g.lineWidth = 2.4 * sz;
  g.beginPath();
  g.moveTo(px(X(BEACH.gate)), py(BEACH.gateZ));
  g.quadraticCurveTo(px(X(BEACH.gate) + 3), py(BACK - 6), px(WEST + 2), py(BACK + 8));
  g.stroke();
  // Flecks of shell and stone.
  for (let i = 0; i < 2600; i++) {
    blot(GX0 + r() * (GX1 - GX0), GZ0 + r() * (GZ1 - GZ0), 0.05 + r() * 0.08, 0.03 + r() * 0.05, ["#fff8ea", "#c9b08a", "#e6a890", "#a8a29a"][i % 4]);
  }
  return c;
}

function buildSand(Z: number): THREE.Group {
  const g = new THREE.Group();
  const big = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), soft(SAND, 1));
  big.rotation.x = -Math.PI / 2;
  big.position.set((WEST + EAST) / 2, -0.04, Z + WATER + 150);
  big.receiveShadow = true;
  const t = new THREE.CanvasTexture(sandCanvas());
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(GX1 - GX0, GZ1 - GZ0), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  strip.rotation.x = -Math.PI / 2;
  strip.position.set((GX0 + GX1) / 2, 0, Z + (GZ0 + GZ1) / 2);
  strip.receiveShadow = true;
  g.add(big, strip);
  return g;
}

function foamTexture(): THREE.CanvasTexture {
  const t = paint(1024, 64, (g) => {
    const r = seeded(29);
    const fade = g.createLinearGradient(0, 0, 0, 64);
    fade.addColorStop(0, "rgba(255,255,255,0)");
    fade.addColorStop(0.62, "rgba(255,255,255,.5)");
    fade.addColorStop(0.8, "rgba(255,255,255,.95)");
    fade.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = fade;
    g.fillRect(0, 0, 1024, 64);
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 90; i++) {
      g.beginPath();
      g.ellipse(r() * 1024, 34 + r() * 30, 10 + r() * 34, 3 + r() * 6, 0, 0, 7);
      g.fill();
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(12, 1);
  return t;
}

function post(text: string, w: number, h: number): THREE.Mesh {
  const t = paint(512, Math.round((512 * h) / w), (g) => {
    const c = g.canvas;
    g.fillStyle = "#a8674a";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#fff6e6";
    g.font = `bold ${Math.round(c.height * 0.5)}px "Trebuchet MS", "Segoe UI", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width / 2, c.height * 0.54);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  m.userData.keep = true;
  return m;
}

function hut(p: Parts, x: number, z: number, colour: string): void {
  const white = soft("#fffaf0");
  const w = 2.4;
  const h = 2.7;
  const d = 2.2;
  p.add(pbox(w, h, d, 0.1, white, x, h / 2 + 0.3, z));
  // Painted boards down the front and sides, then the door.
  for (let i = 0; i < 4; i++) {
    const bx = x - w / 2 + 0.3 + i * 0.6;
    p.add(pbox(0.3, h - 0.08, 0.05, 0.02, soft(colour), bx, h / 2 + 0.3, z - d / 2 - 0.01));
    p.add(pbox(0.3, h - 0.08, 0.05, 0.02, soft(colour), bx, h / 2 + 0.3, z + d / 2 + 0.01));
  }
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.add(pbox(0.05, h - 0.08, 0.34, 0.02, soft(colour), x + s * (w / 2 + 0.01), h / 2 + 0.3, z - d / 2 + 0.38 + i * 0.72));
  p.add(pbox(0.9, 1.9, 0.08, 0.04, soft("#fffaf0"), x, 1.25, z - d / 2 - 0.05), dot(0.05, soft("#f0d27a", 0.3), x + 0.3, 1.3, z - d / 2 - 0.1));
  // A low pitched roof, and steps down to the sand on its short stilts.
  for (const s of [-1, 1]) {
    const slope = pbox(w / 2 + 0.42, 0.14, d + 0.5, 0.05, soft("#8a7a78"), x + s * (w / 4 + 0.08), h + 0.62, z);
    slope.rotation.z = -s * 0.42;
    p.add(slope);
  }
  for (const a of [-1, 1]) for (const b of [-1, 1]) p.add(pipe(0.07, 0.08, 0.34, soft("#8a6a50"), x + a * (w / 2 - 0.12), 0.17, z + b * (d / 2 - 0.12)));
  p.add(pbox(1.1, 0.1, 0.5, 0.03, soft("#a97a50"), x, 0.34, z - d / 2 - 0.3));
}

interface Bit {
  node: string;
  mesh: 0 | 1 | 2;
  m: THREE.Matrix4;
  c: string;
}

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const bitMatrix = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

export function buildBeach(): BeachKit {
  const Z = regionZ(BEACH.x0 + 100);
  const group = new THREE.Group();
  group.add(buildSand(Z));
  const blockers: Blocker[] = [];
  const lights: LightSpot[] = [];
  const p = new Parts();
  const huts = new Parts();
  const s = new Scatter();
  const r = seeded(83);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(r() * list.length)];
  const taken = [...BEACH_NODES.map((n) => [X(n.x), n.z] as const), ...BEACH_SPOTS.map((f) => [X(f.x), f.z] as const), [X(BEACH.gate), BEACH.gateZ] as const];
  const clear = (x: number, z: number, ring: number) => taken.every(([a, b]) => Math.hypot(a - x, b - z) > ring);

  // The open sea, right out to the sky.
  const sea = waterSheet(1000, 700, "#58b4c9", "#a6e4e4", [46, 32], 41);
  sea.position.set((WEST + EAST) / 2, 0.012, Z + WATER - 0.2 - 350);
  group.add(sea);
  // The shallows and the foam line, which run up the sand and back.
  const shallow = new THREE.Mesh(new THREE.PlaneGeometry(1000, 5), new THREE.MeshStandardMaterial({ color: "#9fe0dc", transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false }));
  shallow.rotation.x = -Math.PI / 2;
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(1000, 2.4), new THREE.MeshBasicMaterial({ map: foamTexture(), transparent: true, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2;
  group.add(shallow, foam);

  // Dunes behind, thick with grass, and low green hills past them.
  for (let x = WEST - 20; x < EAST + 20; x += 5.5) {
    for (const [z0, h] of [[BACK + 4, 2.2], [BACK + 9, 3.4], [BACK + 16, 4.6]] as const) {
      const z = z0 + r() * 3;
      const rx = 5 + r() * 3;
      // The paths inland run through gaps in the dunes.
      if (Math.min(distToTrail((x + 1) * 55, z, TRAILS.beachExit), distToTrail((x + 1) * 55, z, TRAILS.shore)) < 8) continue;
      p.add(dome(rx, h + r(), 4.4 + r() * 2, soft(r() < 0.5 ? "#ecd8a8" : "#e6cf9c", 1), x + r() * 2, 0, Z + z));
    }
  }
  for (let x = WEST - 60; x < EAST + 60; x += 14) {
    const m = dot(1, soft("#7fa864"), x, 0, Z + BACK + 46 + r() * 12, 0.55);
    m.scale.set(13 + r() * 8, 11 + r() * 6, 13);
    m.castShadow = false;
    p.add(m);
  }
  for (let i = 0; i < 1300; i++) {
    const x = WEST - 6 + r() * (EAST - WEST + 12);
    const z = BACK - 2 + r() * 24;
    if (!clear(x, z, 1.2) || Math.min(distToTrail(x * 55, z, TRAILS.beachExit), distToTrail(x * 55, z, TRAILS.shore)) < 2.2) continue;
    const h = 0.4 + r() * 0.5;
    s.put("tuft", x, h / 2 + Math.max(0, z - BACK) * 0.14, z, 0.07, h, 0.07, pick(GRASSES), r() * 6);
  }

  // A headland at each end, running out into the water.
  for (const [edge, dir] of [[WEST - 1, -1], [EAST + 1, 1]] as const) {
    for (let z = WATER - 34; z < BACK + 26; z += 6.5) {
      for (const [out, size] of [[3, 7], [10, 11], [19, 14]] as const) {
        const rx = size + r() * 2.5;
        const x = edge + dir * (out + r() * 2);
        p.add(dome(rx, size * 1.15 + r() * 3, 6 + r() * 2, soft(r() < 0.5 ? "#c9a67e" : "#b8967a", 0.95), x, 0, Z + z));
        if (out > 3) p.add(dome(rx * 0.9, size * 0.34, 5.8, soft("#8fae68"), x, size * 0.98, Z + z));
      }
    }
    for (let i = 0; i < 26; i++) {
      const z = WATER - 12 + r() * 30;
      const sz = 0.5 + r() * 0.9;
      s.put("boulder", edge - dir * (r() * 1.4), sz * 0.45, z, sz * 1.3, sz * 0.9, sz, "#a89a88", r() * 6);
    }
  }

  // Beach huts, facing the sea.
  for (const [x, colour] of HUTS) {
    hut(huts, X(x), Z + 17.4, colour);
    blockers.push({ X: X(x) - 0.65, Z: Z + 17.4, r: 1.2 }, { X: X(x) + 0.65, Z: Z + 17.4, r: 1.2 });
    lights.push({ pos: [X(x), 2.4, Z + 15.6], color: "#ffc98a", power: 12 });
  }

  // The pier, out over the water on its posts.
  const plank = soft("#a97a50");
  const leg = soft("#7a5a40");
  for (let z = WATER + 1.4; z > WATER - 34; z -= 0.72) p.add(pbox(3, 0.1, 0.62, 0.03, plank, PIER_X, 1, Z + z));
  for (let z = WATER + 1.2; z > WATER - 34; z -= 4.2) {
    for (const d of [-1.4, 1.4]) {
      p.add(pipe(0.13, 0.15, 2.2, leg, PIER_X + d, 0.2, Z + z), pipe(0.05, 0.05, 1, leg, PIER_X + d, 1.5, Z + z));
      if (z >= WATER) blockers.push({ X: PIER_X + d, Z: Z + z, r: 0.2 });
    }
  }
  for (const d of [-1.4, 1.4]) p.add(pbox(0.09, 0.09, 35.4, 0.03, leg, PIER_X + d, 1.95, Z + WATER - 16.3));
  p.add(pbox(2.6, 0.12, 2.4, 0.05, plank, PIER_X, 0.5, Z + WATER + 2.6).rotateX(0.32));

  // Somewhere to stand and fish at each spot.
  for (const f of BEACH_SPOTS) {
    const x = X(f.x);
    p.add(pbox(2.2, 0.22, 2.1, 0.1, soft("#a8a498"), x, 0.08, Z + f.z - 0.7));
    s.put("boulder", x + 1.3, 0.3, f.z - 1.5, 0.7, 0.55, 0.6, "#9c988c", r() * 6);
    s.put("boulder", x - 1.3, 0.24, f.z - 1.1, 0.55, 0.42, 0.5, "#a8a498", r() * 6);
  }

  // Rocks round the pools, a lifebuoy on its post, and the way back up.
  for (const [x, z, rr] of POOLS) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28 + r();
      const [bx, bz] = [X(x) + Math.cos(a) * rr * 1.15, z + Math.sin(a) * rr * 0.82];
      if (!clear(bx, bz, 1.7)) continue;
      const sz = 0.26 + r() * 0.26;
      s.put("rock", bx, sz * 0.4, bz, sz * 1.25, sz * 0.8, sz, pick(["#a8a498", "#b4aa98", "#98948c"]));
    }
  }
  const buoyX = X(25650);
  const buoyZ = -1.2;
  p.add(pipe(0.07, 0.09, 2.4, soft("#8a6a50"), buoyX, 1.2, Z + buoyZ));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.11, 10, 24), soft("#e9583c", 0.6));
  ring.position.set(buoyX, 1.5, Z + buoyZ + 0.12);
  ring.castShadow = true;
  p.add(ring);
  for (const a of [0.78, 2.36, 3.92, 5.5]) p.add(pbox(0.14, 0.26, 0.26, 0.03, soft("#fffaf0"), buoyX + Math.cos(a) * 0.4, 1.5 + Math.sin(a) * 0.4, Z + buoyZ + 0.12));
  blockers.push({ X: buoyX, Z: Z + buoyZ, r: 0.16 });

  const gx = X(BEACH.gate) - 1.5;
  const gz = BEACH.gateZ + 1.2;
  const board = post("TO THE SQUARE", 2, 0.4);
  board.position.set(gx, 2.05, Z + gz + 0.09);
  p.add(pipe(0.07, 0.09, 2.3, soft("#7c5a42"), gx, 1.15, Z + gz), pbox(2.2, 0.52, 0.1, 0.08, soft("#a8674a"), gx, 2.05, Z + gz + 0.02), board);
  blockers.push({ X: gx, Z: Z + gz, r: 0.14 });

  // Pebbles and odd stones all along.
  for (let i = 0; i < 700; i++) {
    const x = WEST + r() * (EAST - WEST);
    const z = WATER + 1 + r() * (BACK - WATER);
    if (!clear(x, z, 0.8)) continue;
    s.put("pebble", x, 0.04, z, 0.08 + r() * 0.1, 0.05, 0.07 + r() * 0.08, pick(["#c8bda4", "#d8cdb4", "#b4aca0", "#e6c4b4"]), r() * 6);
  }

  // What you can gather.
  const bits: Bit[] = [];
  const addBit = (n: GatherNode, mesh: Bit["mesh"], m: THREE.Matrix4, c: string) => bits.push({ node: n.id, mesh, m, c });
  const nr = seeded(557);
  for (const n of BEACH_NODES) {
    const x = X(n.x);
    const z = n.z;
    const wz = Z + z;
    if (n.shape === "shell") {
      for (const [dx, dz, sc, col] of [[-0.14, 0, 0.3, "#f6d8c8"], [0.2, 0.14, 0.22, "#fff1e4"]] as const) {
        addBit(n, 0, bitMatrix(x + dx, 0.06, wz + dz, sc, 0.08, sc * 0.86), col);
        for (const a of [-0.5, 0, 0.5]) addBit(n, 1, bitMatrix(x + dx + Math.sin(a) * sc * 0.45, 0.13, wz + dz + Math.cos(a) * sc * 0.3, 0.018, sc * 1.3, 0.018, Math.PI / 2, 0, -a), "#e9a890");
      }
    } else if (n.shape === "weed") {
      for (let k = 0; k < 9; k++) {
        const a = nr() * 6.28;
        const len = 0.7 + nr() * 0.8;
        addBit(n, 1, bitMatrix(x + Math.cos(a) * len * 0.4, 0.05, wz + Math.sin(a) * len * 0.4, 0.05, len, 0.03, 0, -a, Math.PI / 2), k % 2 ? "#3f7a58" : "#2f6a58");
      }
      addBit(n, 0, bitMatrix(x, 0.08, wz, 0.34, 0.1, 0.28), "#2f6a58");
    } else if (n.shape === "grass") {
      s.put("clump", x, 0.05, z, 0.55, 0.08, 0.45, "#a9bf6c");
      for (let k = 0; k < 11; k++) {
        const a = nr() * 6.28;
        const rad = nr() * 0.42;
        const h = 0.3 + nr() * 0.3;
        addBit(n, 1, bitMatrix(x + Math.cos(a) * rad, h / 2 + 0.04, wz + Math.sin(a) * rad, 0.045, h, 0.045, (nr() - 0.5) * 0.4, 0, (nr() - 0.5) * 0.4), k % 3 ? "#7fae5c" : "#94c068");
      }
    } else if (n.shape === "rock") {
      const sz = 0.74;
      s.put("boulder", x, sz * 0.6, z, sz * 1.25, sz * 0.92, sz, "#a8a498", nr() * 6);
      for (let k = 0; k < 5; k++) {
        const a = -0.9 + (k / 4) * 1.8;
        const h = 0.2 + nr() * 0.16;
        addBit(n, 2, bitMatrix(x + Math.sin(a) * sz * 0.92, sz * (0.68 + nr() * 0.5), wz + Math.cos(a) * sz * 0.72, h * 0.7, h, h * 0.7, 0.3 * Math.cos(a), nr() * 3, -0.5 * Math.sin(a)), GLASS[n.item] ?? "#6fd8c0");
      }
      blockers.push({ X: x, Z: wz, r: 0.68 });
    } else {
      const len = 1.5 + nr() * 0.5;
      const ry = nr() * 3;
      addBit(n, 1, bitMatrix(x, 0.2, wz, 0.2, len, 0.2, 0, ry, Math.PI / 2), "#c4b49a");
      const end = Math.cos(ry) * len * 0.35;
      addBit(n, 1, bitMatrix(x + end, 0.32, wz - Math.sin(ry) * len * 0.35, 0.06, 0.5, 0.06, 0, ry, 0.9), "#b0a088");
    }
  }

  const sp = new Parts();
  s.build(sp, 22, 22);
  const see = new Map<THREE.Material, THREE.Material>();
  const fade = (o: THREE.Object3D) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    if (!see.has(m.material)) see.set(m.material, seeThrough(m.material));
    m.material = see.get(m.material)!;
  };
  const scattered = new THREE.Group();
  scattered.position.z = Z;
  scattered.add(sp.base, sp.summer, sp.winter);
  group.add(scattered);
  group.add(bake(p.base));
  // Huts dissolve between you and the camera, the same as the trees do.
  const hutMeshes = bake(huts.base);
  hutMeshes.traverse(fade);
  group.add(hutMeshes);

  // Snow on the dry sand, and the sea left to itself.
  const snowfield = new THREE.Mesh(new THREE.PlaneGeometry(GX1 - GX0 + 300, 280), new THREE.MeshStandardMaterial({ color: "#f1f4f8", roughness: 1 }));
  snowfield.rotation.x = -Math.PI / 2;
  snowfield.position.set((GX0 + GX1) / 2, 0.015, Z + WATER + 5 + 140);
  snowfield.receiveShadow = true;
  group.add(snowfield);

  const geos = [new THREE.SphereGeometry(1, 12, 9), new THREE.CylinderGeometry(1, 1, 1, 7), new THREE.OctahedronGeometry(1, 0)];
  const mats = [soft("#ffffff", 0.6), soft("#ffffff", 0.85), own("#ffffff", { roughness: 0.3, flatShading: true })];
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

  // A small twinkle over everything ready to pick.
  const twinkleAt = BEACH_NODES.map((n) => new THREE.Vector3(X(n.x), n.shape === "rock" ? 1.6 : 0.75, Z + n.z + 0.2));
  const twinkle = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: "#fff3c4", toneMapped: false }), BEACH_NODES.length);
  twinkle.frustumCulled = false;
  twinkle.castShadow = false;
  group.add(twinkle);
  const ready = new Map(BEACH_NODES.map((n) => [n.id, true]));

  // Sailing boats far out.
  const boats = new Parts();
  for (const [x, z, col] of [[WEST + 18, WATER - 46, "#fffaf0"], [EAST - 22, WATER - 60, "#f4b9a0"]] as const) {
    boats.add(pbox(3.4, 0.5, 1.1, 0.2, soft("#a8674a"), x, 0.35, Z + z), pipe(0.05, 0.06, 3.4, soft("#7a5a40"), x, 2.1, Z + z));
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1.5, 0);
    shape.lineTo(0, 3);
    shape.closePath();
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(shape), own(col, { side: THREE.DoubleSide }));
    sail.position.set(x + 0.08, 0.7, Z + z);
    boats.add(sail);
  }
  const boatMesh = bake(boats.base);
  group.add(boatMesh);

  // Gulls wheeling over the water: a flat V each, flapped by scaling.
  const GULLS = 12;
  const wings = new THREE.BufferGeometry();
  wings.setAttribute("position", new THREE.Float32BufferAttribute([-1, 0.32, 0, 0, 0, 0.14, 0, 0, -0.14, 1, 0.32, 0, 0, 0, -0.14, 0, 0, 0.14], 3));
  wings.computeVertexNormals();
  const gulls = new THREE.InstancedMesh(wings, new THREE.MeshBasicMaterial({ color: "#fbfdff", side: THREE.DoubleSide }), GULLS);
  gulls.frustumCulled = false;
  group.add(gulls);
  const gr = seeded(13);
  const gullPath = Array.from({ length: GULLS }, () => ({ x: WEST + 8 + gr() * (EAST - WEST - 16), z: Z + WATER - 4 + gr() * 18, y: 6 + gr() * 6, r: 4 + gr() * 7, a: gr() * 6.28, v: 0.18 + gr() * 0.2 }));
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const size = new THREE.Vector3();

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
      const snow = ws.weather === "snow";
      snowfield.visible = snow;
      sp.summer.visible = !snow;
    },
    update(dt: number, t: number) {
      flow(sea, dt * 0.012, dt * 0.02);
      // The tide breathes in and out at the edge of the sand.
      const reach = Math.sin(t * 0.55);
      foam.position.set((WEST + EAST) / 2, 0.03, Z + WATER + 0.7 + reach * 1.1);
      shallow.position.set((WEST + EAST) / 2, 0.022, Z + WATER - 1.5 + reach * 1.1);
      (foam.material as THREE.MeshBasicMaterial).opacity = 0.75 + reach * 0.2;
      boatMesh.position.y = Math.sin(t * 0.7) * 0.06;
      BEACH_NODES.forEach((n, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
        const sc = ready.get(n.id) ? 0.03 + pulse * pulse * 0.06 : 0;
        tmpQ.setFromEuler(tmpE.set(0, t + i, 0));
        m4.compose(twinkleAt[i], tmpQ, size.set(sc, sc * 1.5, sc));
        twinkle.setMatrixAt(i, m4);
      });
      twinkle.instanceMatrix.needsUpdate = true;
      gullPath.forEach((g, i) => {
        const a = g.a + t * g.v;
        pos.set(g.x + Math.cos(a) * g.r, g.y + Math.sin(a * 2) * 0.5, g.z + Math.sin(a) * g.r);
        tmpQ.setFromEuler(tmpE.set(0, -a, 0));
        m4.compose(pos, tmpQ, size.set(0.42, 0.42 * (0.55 + Math.sin(t * 5 + i) * 0.55), 0.42));
        gulls.setMatrixAt(i, m4);
      });
      gulls.instanceMatrix.needsUpdate = true;
    },
  };
}
