// Building blocks shared by the village and the player's home: windows, doors, roofs that take a
// snow cap, and the two ways of keeping draw calls down (merging what stands still, instancing what
// repeats). Everything here is the same soft, chunky toy look as kit.ts.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { own, shaded, soft } from "../kit";

export const SNOW = "#fbfdff";
export const snowMat = () => soft(SNOW, 1);

/** Window glass and lamp glass: one material each, so the whole village lights up together. */
export const GLASS = own("#bfe3ef", { roughness: 0.3, emissive: "#ffb85e", emissiveIntensity: 0 });
export const LAMP = own("#fde6a8", { roughness: 0.4, emissive: "#ffc66a", emissiveIntensity: 0 });
const DAY_GLASS = new THREE.Color("#bfe3ef");
const LIT_GLASS = new THREE.Color("#ffe2a8");

/** 0 is daylight, 1 is full night. */
export function lightWindows(level: number): void {
  GLASS.color.lerpColors(DAY_GLASS, LIT_GLASS, level);
  GLASS.emissiveIntensity = 1.35 * level;
  LAMP.emissiveIntensity = 1.8 * level;
}

// --- Parts: what's always there, what only shows in summer, what only shows in snow --------------

interface Mark {
  from: THREE.Object3D;
  p: THREE.Vector3;
}
export interface SpotMark extends Mark {
  color: string;
  power: number;
}

export class Parts {
  constructor(
    public base = new THREE.Group(),
    public summer = new THREE.Group(),
    public winter = new THREE.Group(),
    public spots: SpotMark[] = [],
    public smokes: Mark[] = [],
  ) {}

  /** The same three layers, moved and turned together. */
  sub(x: number, y: number, z: number, ry = 0): Parts {
    const [a, b, c] = [this.base, this.summer, this.winter].map((parent) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = ry;
      parent.add(g);
      return g;
    });
    return new Parts(a, b, c, this.spots, this.smokes);
  }

  add(...o: THREE.Object3D[]): this {
    this.base.add(...o);
    return this;
  }

  spot(x: number, y: number, z: number, color: string, power: number): void {
    this.spots.push({ from: this.base, p: new THREE.Vector3(x, y, z), color, power });
  }

  smoke(x: number, y: number, z: number): void {
    this.smokes.push({ from: this.base, p: new THREE.Vector3(x, y, z) });
  }
}

/** Where a mark ended up, in the coordinates of whatever holds the top of its Parts. */
export function markPos(m: Mark): [number, number, number] {
  m.from.updateWorldMatrix(true, false);
  const v = m.from.localToWorld(m.p.clone());
  return [v.x, v.y, v.z];
}

const stripped = (src: THREE.BufferGeometry, m: THREE.Matrix4) => {
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
  return g.applyMatrix4(m);
};

/**
 * One mesh per material (and per stretch of the path, so what's off screen isn't drawn) from
 * everything under `root`. Meshes with `userData.keep` stay as they are.
 */
export function bake(root: THREE.Group, stretch = 0): THREE.Group {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const out = new THREE.Group();
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; geos: THREE.BufferGeometry[] }>();
  const kept: THREE.Mesh[] = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.userData.keep || Array.isArray(mesh.material) || (mesh as THREE.InstancedMesh).isInstancedMesh) return void kept.push(mesh);
    const part = stretch ? Math.floor(v.setFromMatrixPosition(mesh.matrixWorld).x / stretch) : 0;
    const key = `${(mesh.material as THREE.Material).uuid}|${mesh.castShadow}|${part}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { mat: mesh.material as THREE.Material, cast: mesh.castShadow, geos: [] }));
    b.geos.push(stripped(mesh.geometry, inverse.clone().multiply(mesh.matrixWorld)));
  });
  for (const b of buckets.values()) {
    const m = new THREE.Mesh(mergeGeometries(b.geos), b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = true;
    out.add(m);
    for (const g of b.geos) g.dispose();
  }
  for (const m of kept) {
    m.applyMatrix4(inverse.clone().multiply(m.parent!.matrixWorld));
    out.add(m);
  }
  return out;
}

/** Everything in `root` stops casting shadows: for what stands far back. */
export function noShadows(p: Parts): void {
  for (const g of [p.base, p.summer, p.winter]) g.traverse((o) => (o.castShadow = false));
}

// --- Small shapes -----------------------------------------------------------------------------

/** A rounded box cheaper than kit's, for the many small pieces. */
export function pbox(w: number, h: number, d: number, r: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 1): THREE.Mesh {
  const b = shaded(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.01, h / 2.01, d / 2.01)), m));
  b.position.set(x, y, z);
  return b;
}

/** A small, cheap ball. */
export function dot(r: number, m: THREE.Material, x = 0, y = 0, z = 0, sy = 1): THREE.Mesh {
  const b = shaded(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), m));
  b.position.set(x, y, z);
  b.scale.y = sy;
  return b;
}

export function pipe(rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 12): THREE.Mesh {
  const c = shaded(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m));
  c.position.set(x, y, z);
  return c;
}

/** The top of an ellipsoid, flat side at y = 0. `open` is how far down it reaches (radians from the top). */
export function dome(rx: number, ry: number, rz: number, m: THREE.Material, x = 0, y = 0, z = 0, open = Math.PI / 2): THREE.Mesh {
  const d = shaded(new THREE.Mesh(new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, 0, open), m));
  d.scale.set(rx, ry, rz);
  d.position.set(x, y, z);
  return d;
}

export function shapeOf(pts: [number, number][]): THREE.Shape {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

/** Round-topped door or window outline, standing on y = 0. */
export function archShape(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true);
  s.lineTo(w / 2, 0);
  s.closePath();
  return s;
}

/** Barrel-shaped roof outline. */
export function barrelShape(w: number, rise: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.bezierCurveTo(-w / 2, rise * 0.72, -w * 0.28, rise, 0, rise);
  s.bezierCurveTo(w * 0.28, rise, w / 2, rise * 0.72, w / 2, 0);
  s.closePath();
  return s;
}

export const gableShape = (w: number, rise: number) => shapeOf([[-w / 2, 0], [0, rise], [w / 2, 0]]);
/** A roof with a flat top, narrower than its eaves. */
export const hipShape = (w: number, rise: number, top: number) => shapeOf([[-w / 2, 0], [-top / 2, rise], [top / 2, rise], [w / 2, 0]]);

/** A shape given depth, centred on z = 0 and rounded at the edges. */
export function slab(s: THREE.Shape, d: number, m: THREE.Material, bevel = 0.12, curves = 12): THREE.Mesh {
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: bevel > 0.2 ? 6 : 3, curveSegments: curves });
  g.translate(0, 0, -d / 2);
  return shaded(new THREE.Mesh(g, m));
}

/** A roof from an outline, with its ridge along Z; in snow, a white copy lies on top of it. */
export function roofed(p: Parts, s: THREE.Shape, d: number, color: string, x: number, y: number, z: number): void {
  const r = slab(s, d, soft(color, 0.7), 0.14);
  r.position.set(x, y, z);
  p.add(r);
  const c = slab(s, d - 0.02, snowMat(), 0.14);
  c.position.set(x, y + 0.17, z);
  p.winter.add(c);
}

/** A pointed round roof sitting on y, with a white top in snow. */
export function cone(p: Parts, r: number, h: number, color: string, x: number, y: number, z: number): void {
  p.add(pipe(0.03, r, h, soft(color, 0.7), x, y + h / 2, z, 22));
  p.winter.add(pipe(0.03, r * 0.8, h * 0.8, snowMat(), x, y + h * 0.6 + 0.16, z, 22));
}

/** A thing lying on a round wall: a Parts turned to face out at `dx` across a circle. */
export function onRound(p: Parts, cx: number, zc: number, r: number, dx: number, y = 0): Parts {
  return p.sub(cx + dx, y, zc + Math.sqrt(Math.max(0.01, r * r - dx * dx)), Math.asin(Math.max(-1, Math.min(1, dx / r))));
}

// --- Windows, doors, chimneys -------------------------------------------------------------------

export type WinKind = "square" | "round" | "arch" | "diamond";

export interface WinOpts {
  kind?: WinKind;
  shutters?: string;
  box?: boolean;
  frame?: string;
}

const FLOWERS = ["#f08a6a", "#f6d36a", "#e98fb4", "#f6d36a"];

export function flowerBox(p: Parts, x: number, y: number, z: number, w: number): void {
  p.add(pbox(w + 0.24, 0.2, 0.3, 0.07, soft("#a8674a"), x, y, z + 0.14));
  const n = Math.max(3, Math.round(w / 0.28));
  for (let i = 0; i < n; i++) {
    const fx = x - w / 2 + 0.06 + (i * (w - 0.12)) / (n - 1);
    p.summer.add(dot(0.12, soft("#6db35f"), fx, y + 0.12, z + 0.12), dot(0.095, soft(FLOWERS[i % 4]), fx, y + 0.24, z + 0.17));
  }
  p.winter.add(pbox(w + 0.3, 0.14, 0.34, 0.06, snowMat(), x, y + 0.15, z + 0.14));
}

/** A window centred at x, y on a wall whose face is at z. */
export function win(p: Parts, x: number, y: number, z: number, w: number, h: number, o: WinOpts = {}): void {
  const frame = soft(o.frame ?? "#fbf3e2");
  const kind = o.kind ?? "square";
  if (kind === "round") {
    const r = Math.min(w, h) / 2;
    const f = pipe(r + 0.1, r + 0.1, 0.14, frame, x, y, z + 0.05, 20);
    const g = pipe(r, r, 0.14, GLASS, x, y, z + 0.09, 20);
    f.rotation.x = g.rotation.x = Math.PI / 2;
    g.castShadow = false;
    p.add(f, g, pbox(r * 1.9, 0.05, 0.05, 0.02, frame, x, y, z + 0.17), pbox(0.05, r * 1.9, 0.05, 0.02, frame, x, y, z + 0.17));
  } else if (kind === "arch") {
    const f = slab(archShape(w + 0.2, h + 0.2), 0.1, frame, 0.02);
    f.position.set(x, y - h / 2 - 0.1, z + 0.05);
    const g = slab(archShape(w, h), 0.1, GLASS, 0.02);
    g.position.set(x, y - h / 2, z + 0.09);
    g.castShadow = false;
    p.add(f, g, pbox(0.05, h - 0.05, 0.05, 0.02, frame, x, y, z + 0.17), pbox(w, 0.05, 0.05, 0.02, frame, x, y - h * 0.1, z + 0.17));
  } else {
    const g = pbox(w, h, 0.12, 0.06, GLASS, x, y, z + 0.09);
    g.castShadow = false;
    p.add(pbox(w + 0.22, h + 0.22, 0.12, 0.08, frame, x, y, z + 0.05), g);
    if (kind === "diamond") {
      const s = Math.min(w, h) * Math.SQRT2;
      for (const a of [Math.PI / 4, -Math.PI / 4]) {
        for (const [off, len] of [[0, 0.98], [0.3, 0.5], [-0.3, 0.5]]) {
          const b = pbox(0.04, s * len, 0.04, 0.015, frame, x + off * Math.cos(a) * w * 0.8, y + off * Math.sin(a) * h * 0.8, z + 0.17);
          b.rotation.z = a;
          p.add(b);
        }
      }
    } else {
      p.add(pbox(0.06, h - 0.04, 0.05, 0.02, frame, x, y, z + 0.17), pbox(w - 0.04, 0.06, 0.05, 0.02, frame, x, y, z + 0.17));
    }
  }
  if (o.shutters && kind !== "round") for (const s of [-1, 1]) p.add(pbox(0.24, h + 0.04, 0.08, 0.05, soft(o.shutters), x + s * (w / 2 + 0.25), y, z + 0.05));
  if (o.box) flowerBox(p, x, y - h / 2 - 0.22, z, w);
}

export type DoorKind = "round" | "square" | "double" | "porthole";

/** A door standing on the ground at x, on a wall whose face is at z, with a step in front. */
export function door(p: Parts, x: number, z: number, w: number, h: number, color: string, kind: DoorKind = "round", step = true): void {
  const m = soft(color, 0.6);
  const knob = soft("#f0d27a", 0.3);
  if (kind === "square") {
    p.add(pbox(w + 0.2, h + 0.12, 0.1, 0.06, soft("#fbf3e2"), x, h / 2, z + 0.03), pbox(w, h, 0.16, 0.08, m, x, h / 2, z + 0.07));
    p.add(pbox(w * 0.66, h * 0.3, 0.06, 0.03, soft("#fbf3e2"), x, h * 0.72, z + 0.16), dot(0.07, knob, x + w * 0.34, h * 0.46, z + 0.2));
  } else {
    const f = slab(archShape(w + 0.2, h + 0.1), 0.08, soft("#fbf3e2"), 0.02);
    f.position.set(x, 0, z + 0.03);
    const d = slab(archShape(w, h), 0.12, m, 0.03);
    d.position.set(x, 0, z + 0.08);
    p.add(f, d);
    if (kind === "double") {
      p.add(pbox(0.05, h - 0.1, 0.04, 0.015, soft("#4a3428"), x, h / 2, z + 0.18), dot(0.07, knob, x - 0.15, h * 0.44, z + 0.2), dot(0.07, knob, x + 0.15, h * 0.44, z + 0.2));
    } else {
      p.add(dot(0.07, knob, x + w * 0.32, h * 0.46, z + 0.2));
    }
    if (kind === "porthole") win(p, x, h * 0.62, z + 0.12, 0.54, 0.54, { kind: "round" });
  }
  if (step) {
    p.add(pbox(w + 0.5, 0.2, 0.7, 0.08, soft("#cbb99a"), x, 0.1, z + 0.36));
    p.winter.add(pbox(w + 0.56, 0.1, 0.74, 0.05, snowMat(), x, 0.23, z + 0.36));
  }
}

/** A brick chimney with its top at `top`, reaching down to `bottom`; smoke comes from it. */
export function chimney(p: Parts, x: number, bottom: number, top: number, z: number, w = 0.62): void {
  p.add(pbox(w, top - bottom, w, 0.08, soft("#b9775a"), x, (top + bottom) / 2, z), pbox(w + 0.14, 0.2, w + 0.14, 0.07, soft("#a3684f"), x, top, z));
  p.winter.add(pbox(w + 0.2, 0.16, w + 0.2, 0.08, snowMat(), x, top + 0.16, z));
  p.smoke(x, top + 0.14, z);
}

/** A stovepipe, with its top at `top`. */
export function stovepipe(p: Parts, x: number, bottom: number, top: number, z: number): void {
  p.add(pipe(0.17, 0.17, top - bottom, soft("#8a7a6a"), x, (top + bottom) / 2, z), pipe(0.26, 0.26, 0.16, soft("#6f6256"), x, top, z));
  p.winter.add(dome(0.27, 0.16, 0.27, snowMat(), x, top + 0.08, z));
  p.smoke(x, top + 0.1, z);
}

/** A thin mast with a little arrow or pennant on top, the sort that sits on a roof peak. */
export function vane(p: Parts, x: number, y: number, z: number, flag?: string): void {
  const w = soft("#7a5a44");
  p.add(pipe(0.04, 0.05, 0.9, w, x, y + 0.45, z, 8));
  if (flag) {
    const f = slab(shapeOf([[0, 0], [0.8, -0.22], [0, -0.45]]), 0.04, soft(flag), 0.015);
    f.position.set(x, y + 0.9, z);
    p.add(f);
  } else {
    p.add(pbox(0.8, 0.05, 0.05, 0.02, w, x, y + 0.68, z), dot(0.08, w, x, y + 0.93, z), pipe(0, 0.1, 0.2, w, x + 0.46, y + 0.68, z, 8));
    p.base.children[p.base.children.length - 1].rotation.z = -Math.PI / 2;
  }
}

// --- Things that repeat -------------------------------------------------------------------------

type Layer = "base" | "summer" | "winter";

const CAP = () => new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.46);
const KINDS = {
  leaf: { geo: () => new THREE.SphereGeometry(1, 16, 12), rough: 0.85, cast: true, layer: "base" },
  farLeaf: { geo: () => new THREE.SphereGeometry(1, 11, 8), rough: 0.85, cast: false, layer: "base" },
  trunk: { geo: () => new THREE.CylinderGeometry(0.62, 1, 1, 9), rough: 0.85, cast: true, layer: "base" },
  cap: { geo: CAP, rough: 1, cast: false, layer: "winter" },
  drift: { geo: () => new THREE.SphereGeometry(1, 24, 7, 0, Math.PI * 2, 0, Math.PI / 2), rough: 1, cast: false, layer: "winter" },
  boulder: { geo: () => new THREE.SphereGeometry(1, 18, 13), rough: 0.9, cast: true, layer: "base" },
  lump: { geo: () => new THREE.SphereGeometry(1, 10, 6), rough: 1, cast: false, layer: "winter" },
  rock: { geo: () => new THREE.SphereGeometry(1, 10, 7), rough: 0.9, cast: true, layer: "base" },
  pebble: { geo: () => new THREE.SphereGeometry(1, 9, 5), rough: 0.9, cast: false, layer: "summer" },
  cobble: { geo: () => new THREE.SphereGeometry(1, 13, 5), rough: 0.9, cast: false, layer: "summer" },
  flower: { geo: () => new THREE.SphereGeometry(1, 6, 5), rough: 0.8, cast: false, layer: "summer" },
  clump: { geo: () => new THREE.SphereGeometry(1, 7, 4), rough: 0.9, cast: false, layer: "summer" },
  tuft: { geo: () => new THREE.ConeGeometry(1, 1, 5), rough: 0.9, cast: false, layer: "summer" },
  post: { geo: () => new THREE.CapsuleGeometry(1, 1, 2, 7), rough: 0.8, cast: true, layer: "base" },
  rail: { geo: () => new RoundedBoxGeometry(1, 1, 1, 1, 0.2), rough: 0.8, cast: true, layer: "base" },
} satisfies Record<string, { geo: () => THREE.BufferGeometry; rough: number; cast: boolean; layer: Layer }>;
export type Kind = keyof typeof KINDS;

interface Item {
  m: THREE.Matrix4;
  c: THREE.Color;
  x: number;
  z: number;
}

const q = new THREE.Quaternion();
const e = new THREE.Euler();

/** Collects every repeated thing, then draws each kind with one instanced mesh per stretch of path. */
export class Scatter {
  private items = new Map<Kind, Item[]>();

  put(kind: Kind, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, ry = 0, rz = 0): void {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, ry, rz)), new THREE.Vector3(sx, sy, sz));
    let list = this.items.get(kind);
    if (!list) this.items.set(kind, (list = []));
    list.push({ m, c: new THREE.Color(color), x, z });
  }

  /** A leafy blob, with a white cap in snow. */
  blob(x: number, y: number, z: number, r: number, color: string, far = false): void {
    this.put(far ? "farLeaf" : "leaf", x, y, z, r, r, r, color);
    this.put("cap", x, y + r * 0.2, z, r * 1.03, r * 0.9, r * 1.03, SNOW);
  }

  /** A round tree with its feet at x, y, z. Same shape as kit's, drawn in bulk. */
  tree(x: number, y: number, z: number, s: number, green: string, turn = 0, far = false): void {
    this.put("trunk", x, y + 0.95 * s, z, 0.32 * s, 1.95 * s, 0.32 * s, "#7c5a42");
    const c = Math.cos(turn);
    const n = Math.sin(turn);
    for (const [dx, dy, dz, r] of [[0, 2.5, 0, 1.2], [-0.72, 2.0, 0.22, 0.82], [0.76, 2.1, 0.1, 0.86], [0.1, 3.2, -0.1, 0.8]]) {
      this.blob(x + (dx * c - dz * n) * s, y + dy * s, z + (dx * n + dz * c) * s, r * s, green, far);
    }
  }

  /** A low bush of three blobs, with flowers on it in summer. */
  bush(x: number, y: number, z: number, s: number, green: string, flowers: string[], seed = 0): void {
    for (const [dx, r] of [[-0.45, 0.48], [0.1, 0.62], [0.6, 0.44]]) this.blob(x + dx * s, y + r * 0.72 * s, z, r * s, green);
    flowers.forEach((f, i) => {
      const t = (i + 0.5) / flowers.length;
      const a = seed + i * 2.4;
      this.put("flower", x + (t - 0.5) * 1.5 * s, y + (0.5 + 0.28 * Math.sin(a)) * s, z + (0.42 + 0.06 * Math.cos(a)) * s, 0.085 * s, 0.085 * s, 0.085 * s, f);
    });
  }

  /** `deep` also splits by depth, for wide places, so what's out of view isn't drawn. */
  build(out: Parts, stretch = 26, deep = 0): void {
    for (const [kind, items] of this.items) {
      const k = KINDS[kind];
      const geo = k.geo();
      const mat = soft("#ffffff", k.rough);
      const groups = new Map<string, Item[]>();
      for (const it of items) {
        const key = `${Math.floor(it.x / stretch)}:${deep ? Math.floor(it.z / deep) : 0}`;
        const g = groups.get(key);
        if (g) g.push(it);
        else groups.set(key, [it]);
      }
      for (const list of groups.values()) {
        const mesh = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((it, i) => {
          mesh.setMatrixAt(i, it.m);
          mesh.setColorAt(i, it.c);
        });
        mesh.castShadow = k.cast;
        mesh.receiveShadow = true;
        mesh.computeBoundingSphere();
        out[k.layer].add(mesh);
      }
    }
  }
}
