// A person in the 3D world, as a soft felt toy, built from rounded shapes out of the same look data
// the 2D drawing uses (src/ui/plush.ts). The face is the drawing's own face, wrapped over the front
// of the head, so all eleven feelings carry across. Built in drawing units (feet at 0, y up, +Z
// front), then scaled to world units. The figure animates itself; whoever owns it moves root.position.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CharacterId, Expression } from "../logic/cast";
import { FACES, FEELINGS, LOOKS, lookMarkup, S, SPECIES, type Frame, type Look, type Species } from "../ui/plush";
import { motionPose, settledMotion } from "./motion";
import type { Figure } from "./types";

const U = 1 / 40;
const R = S.headR;
const FACE_PX = 512;
const MARK_PX = 256;
/** Pictures kept at once, across all figures: about 1.3 MB each on the GPU. */
const MAX_PICTURES = 120;

// --- Materials: shared while building; each figure then gets its own copies, so tints stay its own --

const mats = new Map<string, THREE.Material>();

/** Soft felt: colour with a pale sheen at glancing angles. */
function felt(color: string): THREE.Material {
  let m = mats.get(color);
  if (!m) {
    const c = new THREE.Color(color);
    m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.82, sheen: 1, sheenRoughness: 0.5, sheenColor: c.clone().lerp(new THREE.Color("#fff"), 0.55), side: THREE.DoubleSide });
    mats.set(color, m);
  }
  return m;
}

function shiny(color: string): THREE.Material {
  const key = `shiny${color}`;
  let m = mats.get(key);
  if (!m) mats.set(key, (m = new THREE.MeshStandardMaterial({ color, roughness: 0.35 })));
  return m;
}

/** A colour with some black laid over it, for the drawing's see-through shadows. */
const darker = (color: string, by: number) => `#${new THREE.Color(color).lerp(new THREE.Color("#000"), by).getHexString()}`;

// --- Shapes -----------------------------------------------------------------------------------

const SPHERE_BIG = new THREE.SphereGeometry(1, 32, 22);
const SPHERE_MID = new THREE.SphereGeometry(1, 18, 12);
const SPHERE_SMALL = new THREE.SphereGeometry(1, 10, 7);

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(g, m);

function ball(rx: number, ry: number, rz: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const r = Math.max(rx, ry, rz);
  const b = mesh(r >= 14 ? SPHERE_BIG : r >= 3.5 ? SPHERE_MID : SPHERE_SMALL, m);
  b.scale.set(rx, ry, rz);
  b.position.set(x, y, z);
  return b;
}

/** Part of an egg shape: phi around from the front, theta down from the top. */
function shell(rx: number, ry: number, rz: number, m: THREE.Material, half: number, t0: number, t1: number, around = Math.PI / 2): THREE.Mesh {
  const s = mesh(new THREE.SphereGeometry(1, 32, 16, around - half, half * 2, t0, t1 - t0), m);
  s.scale.set(rx, ry, rz);
  return s;
}

function tube(pts: [number, number, number][], r: number, m: THREE.Material): THREE.Mesh {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(c, 16, r, 8), m);
}

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const b = mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.3), m);
  b.position.set(x, y, z);
  return b;
}

/** A flat ring lying level around the body or head, squashed front to back by `depth`. */
function ring(r: number, thick: number, m: THREE.Material, y: number, depth = 1): THREE.Mesh {
  const t = mesh(new THREE.TorusGeometry(r, thick, 10, 28), m);
  t.rotation.x = Math.PI / 2;
  t.scale.y = depth;
  t.position.y = y;
  return t;
}

// --- Ears and tails ---------------------------------------------------------------------------

function ears(head: THREE.Group, look: Look, sp: Species, hw: number, hh: number) {
  const fur = felt(sp.fur);
  const inner = felt(sp.inner);
  for (const d of [-1, 1]) {
    const e = new THREE.Group();
    head.add(e);
    switch (sp.ears) {
      case "pointy": {
        e.position.set(d * hw * 0.68, hh * 0.72, 0);
        e.rotation.z = -d * 0.42;
        const c = mesh(new THREE.ConeGeometry(R * 0.42, R * 0.8, 24), fur);
        c.scale.z = 0.55;
        c.position.y = R * 0.26;
        const n = mesh(new THREE.ConeGeometry(R * 0.26, R * 0.52, 20), inner);
        n.scale.z = 0.4;
        n.position.set(0, R * 0.2, R * 0.11);
        e.add(c, n);
        break;
      }
      case "leaf": {
        e.position.set(d * hw * 0.95, hh * 0.32, -R * 0.05);
        e.rotation.z = -d * 1.15;
        e.add(ball(R * 0.25, R * 0.52, R * 0.13, fur, 0, R * 0.42, 0), ball(R * 0.15, R * 0.36, R * 0.08, inner, 0, R * 0.42, R * 0.08));
        break;
      }
      case "tiny":
        e.position.set(d * hw * 0.74, hh * 0.68, 0);
        e.add(ball(R * 0.21, R * 0.21, R * 0.14, fur), ball(R * 0.12, R * 0.12, R * 0.08, inner, 0, 0, R * 0.09));
        break;
      case "round":
        e.position.set(d * hw * 0.72, hh * 0.76, 0);
        e.add(ball(R * 0.33, R * 0.33, R * 0.2, fur), ball(R * 0.2, R * 0.2, R * 0.1, inner, 0, 0, R * 0.14));
        break;
      case "bigRound":
        e.position.set(d * hw * 0.82, hh * 0.8, -R * 0.05);
        e.add(ball(R * 0.54, R * 0.54, R * 0.15, fur), ball(R * 0.36, R * 0.36, R * 0.09, inner, 0, 0, R * 0.1));
        break;
      case "floppy":
        e.position.set(d * hw * 0.8, hh * 0.15, 0);
        e.rotation.z = d * 0.5;
        e.add(ball(R * 0.2, R * 0.38, R * 0.13, felt(sp.face ?? sp.fur), 0, -R * 0.26, 0));
        break;
      case "long":
        if (look.species === "hare") {
          // An old hare's long ears fall out to the side and droop.
          e.position.set(d * hw * 0.62, hh * 0.84, -R * 0.1);
          e.rotation.z = -d * 2.05;
        } else {
          // A bunny's stand up.
          e.position.set(d * hw * 0.38, hh * 0.8, -R * 0.08);
          e.rotation.set(-0.1, 0, -d * 0.17);
        }
        e.add(ball(R * 0.22, R * 0.78, R * 0.13, fur, 0, R * 0.68, 0), ball(R * 0.12, R * 0.58, R * 0.07, inner, 0, R * 0.68, R * 0.09));
        break;
      case "fluffy":
        // Big round koala ears with a pale fluffy middle.
        e.position.set(d * hw * 0.86, hh * 0.52, -R * 0.06);
        e.rotation.y = d * 0.25;
        e.add(ball(R * 0.54, R * 0.54, R * 0.2, fur));
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          e.add(ball(R * 0.17, R * 0.17, R * 0.1, inner, d * R * 0.05 + Math.cos(a) * R * 0.15, Math.sin(a) * R * 0.15, R * 0.16));
        }
        break;
    }
  }
  if (sp.horns) {
    const horn = felt(sp.horns);
    for (const d of [-1, 1]) head.add(tube([[d * R * 0.3, hh * 0.84, 0], [d * R * 0.42, hh * 1.2, -R * 0.08], [d * R * 0.66, hh * 1.32, -R * 0.2]], R * 0.09, horn));
  }
}

function tail(body: THREE.Group, sp: Species, bw: number) {
  const fur = felt(sp.fur);
  const y = 13;
  const z = -bw * 0.4;
  switch (sp.tail) {
    case "ringed":
      for (let i = 0; i < 6; i++) body.add(ball(6.6 - i * 0.45, 6.6 - i * 0.45, 6.6 - i * 0.45, felt(i % 2 ? sp.ring ?? sp.fur : sp.fur), Math.sin(i * 0.5) * 4, y + 1.4 * i, z - 3 - i * 3.5));
      break;
    case "flat":
      { const t = ball(5.5, 3, 14, fur, 0, 6, z - 9); t.rotation.x = 0.35; body.add(t); }
      break;
    case "thin":
      body.add(tube([[0, y, z], [3, y - 4, z - 9], [8, y + 3, z - 16], [5, y + 10, z - 20]], 1.1, fur));
      break;
    case "puff":
      body.add(ball(6.5, 6.5, 6, felt(sp.fur2), 0, y + 2, z - 1));
      break;
    case "brush": {
      // A big bushy fox tail swept up behind, with a pale tip.
      const g = new THREE.Group();
      g.position.set(1, y - 2, z - 1);
      g.rotation.set(-0.6, 0, -0.3);
      g.add(ball(7.5, 14, 7.5, fur, 0, 12, 0), ball(6, 7, 6, felt(sp.fur2), 0, 23, 0));
      body.add(g);
      break;
    }
    case "curl":
      // A cat's tail, up behind and curled over at the tip.
      body.add(tube([[0, y - 1, z], [3, y - 2, z - 8], [6, y + 7, z - 13], [6, y + 17, z - 13], [3, y + 21, z - 10], [0, y + 17, z - 8]], 2.5, fur));
      break;
    default:
      body.add(ball(4.5, 4.5, 4.5, fur, 0, y, z));
  }
}

// --- Baking: one mesh per colour per moving part, so 13 figures stay a few hundred draw calls ------

const baked = new Map<string, THREE.BufferGeometry>();

function bake(part: THREE.Group, others: Set<THREE.Object3D>, key: string): void {
  part.updateWorldMatrix(true, true);
  const back = part.matrixWorld.clone().invert();
  const byMat = new Map<THREE.Material, THREE.Mesh[]>();
  const found: THREE.Mesh[] = [];
  const walk = (o: THREE.Object3D) => {
    for (const c of o.children) {
      if (others.has(c) || c.userData.live) continue;
      if (c instanceof THREE.Mesh) found.push(c);
      walk(c);
    }
  };
  walk(part);
  for (const m of found) {
    const mat = m.material as THREE.Material;
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat)!.push(m);
    m.removeFromParent();
  }
  for (const [mat, list] of byMat) {
    const k = `${key}|${mat.uuid}`;
    let g = baked.get(k);
    if (!g) {
      const parts = list.map((m) => {
        const c = m.geometry.clone();
        c.applyMatrix4(back.clone().multiply(m.matrixWorld));
        if (!c.index) c.setIndex([...Array(c.getAttribute("position").count).keys()]);
        return c;
      });
      g = mergeGeometries(parts, false);
      baked.set(k, g);
    }
    const out = mesh(g, mat);
    out.castShadow = true;
    part.add(out);
  }
  // Empty holders left by the baking.
  for (const c of [...part.children]) if (c.type === "Group" && !others.has(c) && !c.userData.live) c.removeFromParent();
}

// --- Pictures ---------------------------------------------------------------------------------

async function svgToCanvas(svg: string, size: number): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d")!.drawImage(img, 0, 0, size, size);
  return c;
}

const pictures = new Map<string, THREE.Texture | "loading">();

/** A picture from generated SVG, or null while it's being made. Shared by figures that look the same. */
function picture(key: string, svg: () => string, size: number): THREE.Texture | null {
  const have = pictures.get(key);
  if (have === "loading") return null;
  if (have) {
    // Most recently used goes last; the oldest are let go first.
    pictures.delete(key);
    pictures.set(key, have);
    return have;
  }
  pictures.set(key, "loading");
  svgToCanvas(svg(), size).then(
    (c) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      pictures.set(key, t);
      if (pictures.size <= MAX_PICTURES) return;
      for (const [k, v] of pictures) {
        if (v === "loading") continue;
        v.dispose();
        pictures.delete(k);
        break;
      }
    },
    (e) => console.error("Couldn't draw a figure's picture", key, e),
  );
  return null;
}

/** The face sits on its own shape, per head size, with the picture projected from straight ahead. */
const faceShapes = new Map<string, THREE.SphereGeometry>();
const SPAN = R * 1.5;

function faceShape(fx: number, fy: number): THREE.SphereGeometry {
  const key = `${fx.toFixed(3)}|${fy.toFixed(3)}`;
  let g = faceShapes.get(key);
  if (!g) {
    g = new THREE.SphereGeometry(1, 40, 28, Math.PI / 2 - 1.5, 3, 0.1, 2.94);
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + (pos.getX(i) * fx * 1.012) / (2 * SPAN), 0.5 + (pos.getY(i) * fy * 1.012) / (2 * SPAN));
    faceShapes.set(key, g);
  }
  return g;
}

const looksSeen = new Map<string, number>();

let motionQuery: MediaQueryList | null = null;
function reducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  motionQuery ??= matchMedia("(prefers-reduced-motion: reduce)");
  return motionQuery.matches;
}

const towards = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

// --- The figure -------------------------------------------------------------------------------

/** Build a figure. The player's look is read now: after a change of clothes, make a new one. */
export function makeFigure(id: CharacterId, start: Expression): Figure {
  const look = LOOKS[id];
  const own = FACES[id];
  const sp: Species = { ...SPECIES[look.species], ...(look.furs ?? {}) };
  const has = (x: string) => (look.extras as string[]).includes(x);

  const sig = JSON.stringify([look, own]);
  let lookNo = looksSeen.get(sig);
  if (lookNo === undefined) looksSeen.set(sig, (lookNo = looksSeen.size));

  const top = S.bodyTop;
  const bot = -S.legH;
  const bh = bot - top;
  const bw = S.bodyW * look.build;
  const by = -(top + bot) / 2; // body center height
  const brx = bw * 0.54;
  const bry = bh / 2 + 3;
  const brz = bw * 0.46;
  const hy = -S.headY;
  const hw = R * 1.08 * (own.headW ?? 1);
  const hh = R * (own.headH ?? 1);
  const hd = R * 0.98;
  /** The drawing's y (negative, up the page) as a height here. */
  const up = (y: number) => -y;
  const kk = Math.max(bh / 40, 0.8);

  const root = new THREE.Group();
  const pivot = new THREE.Group(); // feeling movement; world units from here up
  const body = new THREE.Group(); // turns to the heading; drawing units from here down
  root.add(pivot);
  pivot.add(body);
  body.scale.setScalar(U * look.scale);
  body.rotation.order = "YXZ";

  /** A point on the front of the body at height y, x across. */
  const onBody = (x: number, y: number, out = 0.6): [number, number, number] => {
    const k = 1 - (x / brx) ** 2 - ((y - by) / bry) ** 2;
    return [x, y, brz * Math.sqrt(Math.max(0, k)) + out];
  };

  // Legs and feet
  const legs: THREE.Group[] = [];
  for (const d of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(d * bw * 0.22, 9, 0);
    leg.add(ball(bw * 0.15, 6.5, bw * 0.15, felt(sp.feet), 0, -4, 0), ball(bw * 0.17, 3.2, bw * 0.24, felt(sp.feet), 0, -6.4, 1.5));
    body.add(leg);
    legs.push(leg);
  }

  // Body and clothes
  body.add(ball(brx, bry, brz, felt(look.outfit), 0, by, 0));
  tail(body, sp, bw);
  const patch = (m: THREE.Material, half: number, t0: number, t1: number, grow = 1.035, around?: number) => {
    const s = shell(brx * grow, bry * grow, brz * grow, m, half, t0, t1, around);
    s.position.y = by;
    body.add(s);
    return s;
  };
  /** How far down the body (theta) a height is. */
  const thetaAt = (y: number) => Math.acos(Math.max(-1, Math.min(1, (y - by) / bry)));
  /** A band all the way round the body between two heights. */
  const band = (m: THREE.Material, yTop: number, yBot: number, grow = 1.035) => patch(m, Math.PI, thetaAt(yTop), thetaAt(yBot), grow);
  /** Where the neck shows, under the chin. */
  const neckY = 29.5;
  const collar = (m: THREE.Material, thick: number) => body.add(ring(brx * 0.84, thick, m, neckY, brz / brx));

  if (has("apron")) {
    patch(felt(look.accent), 0.72, 1.05, 2.5);
    for (const d of [-1, 1]) body.add(tube([onBody(d * bw * 0.26, by + 3, 0.8), onBody(d * bw * 0.27, by + 9, 0.8), [d * bw * 0.22, by + bry * 0.92, 1]], 1, felt(look.accent)));
  }
  if (has("satchel")) {
    const m = felt(look.accent);
    body.add(tube([[-brx * 0.68, by + bry * 0.72, 2], onBody(-bw * 0.14, by + 7), onBody(bw * 0.18, by - 2), onBody(bw * 0.4, by - 9, 1)], 1.3, m));
    const bag = box(bw * 0.38, bh * 0.34, 4.5, m, bw * 0.34, by - 7, brz * 0.74);
    bag.rotation.y = 0.5;
    body.add(bag);
  }
  if (has("dress")) {
    // A skirt flaring from the waist, a scalloped hem, a waistband and a round collar.
    const m = felt(look.accent);
    const wy = up(top + bh * 0.42);
    const hem = 5.5;
    const profile = [0, 0.25, 0.5, 0.75, 1].map((t) => new THREE.Vector2(bw * (0.56 + 0.17 * t ** 1.4), mix(wy, hem, t)));
    const skirt = mesh(new THREE.LatheGeometry(profile, 36), felt(look.outfit));
    skirt.scale.z = brz / brx;
    body.add(skirt);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      body.add(ball(2.3 * kk, 2.3 * kk, 1.7 * kk, m, Math.sin(a) * bw * 0.73, hem, Math.cos(a) * bw * 0.73 * (brz / brx)));
    }
    band(m, wy + 1.3, wy - 1.3, 1.07);
    for (const d of [-1, 1]) {
      const c = ball(bw * 0.16, 2.8 * kk, 1.4, felt("#fffaf0"), ...onBody(d * bw * 0.17, 25, 0.8));
      c.rotation.z = -d * 0.4;
      body.add(c);
    }
  }
  if (has("overalls")) {
    // A bib and trousers over the shirt, two straps and two buttons.
    const m = felt(look.accent);
    band(m, up(top + bh * 0.5), -20);
    const bibTop = up(top + bh * 0.26);
    patch(m, 0.55, thetaAt(bibTop), thetaAt(up(top + bh * 0.54)));
    for (const d of [-1, 1]) {
      body.add(tube([onBody(d * bw * 0.2, bibTop - 1, 0.7), onBody(d * bw * 0.3, by + bry * 0.72, 1), [d * bw * 0.31, by + bry * 1.02, 0], [d * bw * 0.26, by + bry * 0.72, -brz * 0.72]], 1.5, m));
      body.add(ball(1.5 * kk, 1.5 * kk, 0.8, felt("#f6d36a"), ...onBody(d * bw * 0.17, bibTop - 2, 1)));
    }
    body.add(box(bw * 0.24, bh * 0.14, 1, felt(darker(look.accent, 0.14)), ...onBody(0, up(top + bh * 0.46), 0.7)));
  }
  if (has("sweater")) {
    // Knitted stripes all the way round, and a ribbed collar.
    const m = felt(look.accent);
    for (const t of [0.36, 0.6, 0.84]) {
      const y = up(top + bh * t);
      band(m, y + 2.2 * kk, y - 2.2 * kk);
    }
    collar(m, 2.1);
  }
  if (has("hoodie")) {
    // A front pocket and drawstrings; the hood sits behind the head.
    patch(felt(darker(look.outfit, 0.1)), 0.68, thetaAt(up(bot - bh * 0.42)), thetaAt(up(bot - bh * 0.08)));
    const cord = felt("#fffaf0");
    for (const d of [-1, 1]) {
      const x = d * bw * 0.09;
      body.add(tube([onBody(x, 28, 0.5), onBody(x, 24, 0.5), onBody(x, 19.5, 0.5)], 0.75, cord));
      body.add(ball(1.3, 1.3, 1.3, cord, ...onBody(x, 19, 0.9)));
    }
    body.add(ball(R * 1.02, R * 0.62, R * 0.78, felt(look.accent), 0, up(S.headY + R * 0.55), -R * 0.55));
  }
  if (has("lapels")) {
    const m = felt(look.accent);
    for (const d of [-1, 1]) body.add(tube([onBody(d * bw * 0.04, by - 3, 0.9), onBody(d * bw * 0.16, by + 5, 0.9), onBody(d * bw * 0.27, by + 12, 0.9)], 2.2, m));
    for (const y of [-5, -10]) body.add(ball(1.4, 1.4, 0.8, m, ...onBody(0, by + y, 0.5)));
  }
  if (has("oilskin")) {
    const m = felt(look.accent);
    body.add(tube([onBody(bw * 0.05, by + 12, 0.4), onBody(bw * 0.05, by, 0.6), onBody(bw * 0.05, by - 12, 0.4)], 0.7, m));
    for (const y of [7, 0, -7]) body.add(box(6, 2, 1.6, m, ...onBody(bw * 0.05, by + y, 0.8)));
    band(m, up(bot - bh * 0.12) + 0.8, up(bot - bh * 0.12) - 0.8);
  }
  if (has("cardigan")) {
    patch(felt(look.accent), 0.3, 0.45, 2.75);
    for (const y of [7, 1, -5]) body.add(ball(1.3, 1.3, 0.8, felt("#e7d3a8"), ...onBody(bw * 0.12, by + y, 0.8)));
    for (const d of [-1, 1]) body.add(box(bw * 0.22, bh * 0.24, 1, felt(darker(look.outfit, 0.16)), ...onBody(d * bw * 0.3, by - 6, 0)));
    band(felt(darker(look.outfit, 0.18)), up(bot - bh * 0.1) + 1, up(bot - bh * 0.1) - 1);
  }

  // Arms and paws, swung from the shoulder
  const paw = felt(sp.pattern === "wool" ? sp.face! : sp.fur);
  const arms: THREE.Group[] = [];
  const arx = Math.max(3.6, bw * 0.15) * S.arm;
  for (const d of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(d * brx * 0.92, by + bry * 0.42, 0);
    arm.rotation.z = d * 0.3;
    arm.add(ball(arx, bh * 0.32, arx, felt(look.outfit), 0, -bh * 0.22, 0), ball(arx * 0.95, arx * 0.95, arx * 0.95, paw, 0, -bh * 0.48, 0));
    body.add(arm);
    arms.push(arm);
  }
  if (has("clipboard")) {
    const wood = box(13, 17, 1.4, felt("#c99a5e"), -2, -bh * 0.42, arx + 0.6);
    const sheet = box(10, 12.5, 0.6, felt("#fffaf0"), -2, -bh * 0.43, arx + 1.5);
    wood.rotation.z = sheet.rotation.z = -0.3;
    arms[0].add(wood, sheet);
  }
  if (has("cane")) {
    const x = brx + 7;
    body.add(tube([[x, 0, 5], [x, 18, 5], [x, 26, 5], [x - 2, 29, 5], [x - 5.5, 27, 5]], 1.3, felt("#6b4a2b")));
  }
  if (has("cape")) {
    const m = felt(look.accent);
    patch(m, 2.65, 0.1, 1.75, 1.3, -Math.PI / 2);
    for (const d of [-1, 1]) body.add(tube([onBody(d * bw * 0.28, by + 14, 3), onBody(d * bw * 0.4, by + 2, 4), onBody(d * bw * 0.42, by - 4, 4)], 0.8, felt("#b8434a")));
    body.add(ball(2, 2, 1, felt("#e6e8ec"), ...onBody(-bw * 0.08, by + 2, 0.6)));
    collar(felt("#fbfcfe"), 1.6);
  }
  if (has("leafcape")) {
    // A green cape over the shoulders, covered in overlapping leaves.
    patch(felt("#5f9a58"), 2.65, 0.1, 1.75, 1.3, -Math.PI / 2);
    const greens = ["#7fb86a", "#5f9a58", "#94c67a"].map(felt);
    for (const d of [-1, 1]) for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) {
      const leaf = ball(2.1, 3, 0.7, greens[(row + i) % 3], ...onBody(d * bw * (0.3 + i * 0.13), by + 12 - row * 6, 1.4));
      leaf.rotation.z = d * -0.35;
      body.add(leaf);
    }
    collar(felt("#7fb86a"), 1.6);
  }
  if (has("shawl")) {
    const m = felt(look.accent);
    patch(m, 3.14, 0.1, 1.35, 1.22);
    body.add(ball(bw * 0.2, bh * 0.28, 2.4, m, ...onBody(0, by + 1, 2)));
  }
  if (has("pearls")) {
    const pearl = shiny("#f6f1e6");
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = -bw * 0.34 + t * bw * 0.68;
      body.add(ball(1.5, 1.5, 1.5, pearl, ...onBody(x, up(top + bh * 0.3) - Math.sin(t * Math.PI) * bh * 0.14, 1.2)));
    }
  }
  if (has("scarf")) {
    const m = felt(look.accent);
    // Low enough on the neck to show under the chin.
    const wrap = ring(brx * 0.86, 3.6, m, neckY - 1, brz / brx);
    wrap.rotation.x = Math.PI / 2 - 0.1;
    body.add(wrap);
    const end = box(7, bh * 0.5, 2.6, m, ...onBody(bw * 0.2, by + 3, 1.2));
    end.rotation.z = -0.1;
    body.add(end);
  }
  if (has("bowtie")) {
    const m = felt(look.hat ?? look.accent);
    const [, y, z] = onBody(0, 23.5, 2);
    for (const d of [-1, 1]) {
      const wing = mesh(new THREE.ConeGeometry(R * 0.2, R * 0.34, 16), m);
      wing.rotation.z = d * Math.PI / 2;
      wing.scale.z = 0.5;
      wing.position.set(d * R * 0.17, y, z);
      body.add(wing);
    }
    body.add(ball(R * 0.08, R * 0.08, R * 0.07, m, 0, y, z + 0.4));
  }

  // Head
  const head = new THREE.Group();
  head.position.y = hy;
  body.add(head);
  const wool = sp.pattern === "wool";
  head.add(ball(wool ? R * 0.86 : hw, wool ? R * 0.92 : hh, hd, felt(wool ? sp.face! : sp.fur)));
  if (wool) {
    const w = felt(sp.fur);
    for (let i = 0; i < 11; i++) {
      const a = 0.1 * Math.PI + (i / 10) * Math.PI * 1.2 - 0.1 * Math.PI;
      head.add(ball(R * 0.42, R * 0.42, R * 0.42, w, Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86 + R * 0.04, -R * 0.1));
    }
    head.add(ball(R * 0.98, R * 0.98, R * 0.8, w, 0, R * 0.08, -R * 0.42));
    head.add(ball(R * 0.34, R * 0.3, R * 0.3, w, -R * 0.26, R * 0.8, R * 0.4), ball(R * 0.36, R * 0.3, R * 0.3, w, R * 0.24, R * 0.82, R * 0.4));
  }
  ears(head, look, sp, hw, hh);

  // The face, wrapped over the front of the head from straight ahead. Hidden until its picture is ready.
  const fx = wool ? R * 0.86 : hw;
  const fy = wool ? R * 0.92 : hh;
  const faceMat = new THREE.MeshPhysicalMaterial({ transparent: true, roughness: 0.82, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color("#c8c8c8"), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const faceMesh = mesh(faceShape(fx, fy), faceMat);
  faceMesh.scale.set(fx * 1.012, fy * 1.012, hd * 1.012);
  faceMesh.renderOrder = 1;
  faceMesh.visible = false;
  faceMesh.userData.live = true;
  head.add(faceMesh);

  const eyeX = R * (own.spread ?? S.eyeSpread);
  const eyeY = -R * S.eyeY;
  const surf = (x: number, y: number) => hd * Math.sqrt(Math.max(0.02, 1 - (x / hw) ** 2 - (y / hh) ** 2));

  // A small raised nose
  const muzzle = { dy: 0.42, ...(sp.muzzle ?? {}) };
  if (!wool) {
    const ny = -R * (muzzle.dy - 0.14);
    const nk = sp.nosePlus ?? 1;
    head.add(ball(R * 0.14 * nk, R * 0.095 * nk, R * 0.08, shiny(sp.nose), 0, ny, surf(0, ny) + R * 0.02));
  }
  if (sp.beard) head.add(ball(R * 0.15, R * 0.3, R * 0.14, felt(sp.fur2), 0, -hh * 1.02, hd * 0.42));

  // Things worn on the head
  const hatC = look.hat ?? look.accent;
  if (has("glasses")) {
    const gm = shiny("#2a1c16");
    const r = R * 0.23;
    for (const d of [-1, 1]) {
      const rim = mesh(new THREE.TorusGeometry(r, R * 0.035, 10, 30), gm);
      rim.position.set(d * eyeX, eyeY, surf(eyeX, eyeY) + R * 0.05);
      rim.rotation.y = d * 0.4;
      head.add(rim);
    }
    head.add(tube([[-eyeX + r, eyeY, surf(eyeX * 0.5, eyeY) + R * 0.06], [0, eyeY + R * 0.03, surf(0, eyeY) + R * 0.05], [eyeX - r, eyeY, surf(eyeX * 0.5, eyeY) + R * 0.06]], R * 0.03, gm));
  }
  if (has("cap")) {
    const c = felt(hatC);
    const dome = shell(hw * 1.03, hh * 1.08, hd * 1.05, c, 3.14, 0, 1.25);
    dome.position.y = R * 0.04;
    head.add(dome);
    const brim = ball(R * 0.72, R * 0.07, R * 0.56, c, 0, hh * 0.34, hd * 0.82);
    brim.rotation.x = 0.16;
    head.add(brim);
  }
  if (has("toque")) {
    const w = felt("#fbf8f2");
    const crown = mesh(new THREE.CylinderGeometry(R * 0.72, R * 0.74, R * 0.42, 32), w);
    crown.position.y = hh * 0.98;
    head.add(crown, ball(R * 0.5, R * 0.44, R * 0.5, w, -R * 0.42, hh * 1.34, 0), ball(R * 0.5, R * 0.44, R * 0.5, w, R * 0.42, hh * 1.34, 0), ball(R * 0.56, R * 0.5, R * 0.56, w, 0, hh * 1.54, 0));
  }
  if (has("pillbox")) {
    const hat = new THREE.Group();
    hat.position.set(R * 0.18, hh * 1.0, R * 0.05);
    hat.rotation.z = -0.2;
    const crown = mesh(new THREE.CylinderGeometry(R * 0.44, R * 0.46, R * 0.34, 28), felt(hatC));
    const lid = mesh(new THREE.CylinderGeometry(R * 0.4, R * 0.42, R * 0.03, 28), felt("#6d3e5e"));
    lid.position.y = R * 0.175;
    const trim = mesh(new THREE.CylinderGeometry(R * 0.47, R * 0.47, R * 0.08, 28), felt("#c9a3b6"));
    trim.position.y = -R * 0.08;
    hat.add(crown, lid, trim, ball(R * 0.08, R * 0.08, R * 0.08, felt("#c9a3b6"), R * 0.42, -R * 0.06, R * 0.1));
    head.add(hat);
  }
  if (has("souwester")) {
    const c = felt(hatC);
    const dome = shell(hw * 1.02, hh * 1.14, hd * 1.04, c, 3.14, 0, 1.15);
    dome.position.y = R * 0.04;
    const brim = ball(hw * 1.24, R * 0.07, hd * 1.24, c, 0, hh * 0.5, -R * 0.1);
    brim.rotation.x = 0.14;
    const seam = shell(hw * 1.035, hh * 1.155, hd * 1.055, felt(look.accent), 3.14, 1.02, 1.1);
    seam.position.y = R * 0.04;
    head.add(dome, brim, seam);
  }
  if (has("nursecap")) {
    head.add(box(R * 0.86, R * 0.36, R * 0.5, felt("#fbfcfe"), 0, hh * 0.96, R * 0.2), box(R * 0.88, R * 0.07, R * 0.52, felt(look.accent), 0, hh * 0.98, R * 0.21));
  }
  if (has("beanie")) {
    // A knitted hat: a dome, a folded band with ribs, and a pompom.
    const c = felt(hatC);
    const dome = shell(hw * 1.05, hh * 1.2, hd * 1.06, c, Math.PI, 0, 1.2);
    head.add(dome);
    const y = hh * 0.45;
    const k = Math.sqrt(1 - 0.45 ** 2);
    const fold = ring(hw * k * 1.03, R * 0.15, c, y, hd / hw);
    fold.scale.z = 1.25;
    head.add(fold);
    const rib = felt(darker(hatC, 0.14));
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const b = ball(R * 0.03, R * 0.15, R * 0.03, rib, Math.sin(a) * hw * k * 1.17, y, Math.cos(a) * hd * k * 1.17);
      head.add(b);
    }
    head.add(ball(R * 0.26, R * 0.26, R * 0.26, felt("#fffaf0"), 0, hh * 1.28, 0));
  }
  if (has("sunhat")) {
    // A wide straw hat with a ribbon, tipped back to show the face.
    const hat = new THREE.Group();
    hat.position.y = hh * 0.62;
    hat.rotation.x = -0.16;
    hat.add(ball(R * 1.5, R * 0.08, R * 1.5, felt("#ecc97a")));
    const crown = shell(R * 0.92, R * 0.76, R * 0.92, felt("#f3d88f"), Math.PI, 0, Math.PI / 2);
    const ribbon = shell(R * 0.945, R * 0.78, R * 0.945, felt(hatC), Math.PI, 1.05, Math.PI / 2);
    hat.add(crown, ribbon);
    head.add(hat);
  }
  if (has("fishinghat")) {
    // A soft bucket hat with a feather fly in the band.
    const hat = new THREE.Group();
    hat.position.y = hh * 0.62;
    hat.rotation.x = -0.14;
    hat.add(ball(R * 1.18, R * 0.09, R * 1.18, felt("#8a9a6a")));
    hat.add(shell(R * 0.9, R * 0.74, R * 0.9, felt("#a3b27e"), Math.PI, 0, Math.PI / 2));
    hat.add(shell(R * 0.925, R * 0.76, R * 0.925, felt("#6f7f52"), Math.PI, 1.12, Math.PI / 2));
    const fly = ball(R * 0.1, R * 0.2, R * 0.05, felt("#e9705a"), R * 0.5, R * 0.34, R * 0.76);
    fly.rotation.z = -0.6;
    hat.add(fly);
    head.add(hat);
  }
  if (has("mushroomcap")) {
    // A red mushroom cap with white spots, sat right down over the crown.
    const hat = new THREE.Group();
    hat.position.y = hh * 0.56;
    hat.rotation.x = -0.12;
    const [cw, ch] = [R * 1.32, R * 0.98];
    hat.add(shell(cw, ch, cw, felt("#d9574a"), Math.PI, 0, Math.PI / 2));
    hat.add(ball(cw * 0.99, R * 0.08, cw * 0.99, felt("#f6efe2")));
    const spot = felt("#fff6ea");
    for (const [a, h, r] of [[0.2, 0.45, 0.2], [1.5, 0.5, 0.17], [2.9, 0.42, 0.2], [4.3, 0.5, 0.18], [5.5, 0.4, 0.16], [0.9, 0.86, 0.17], [3.7, 0.84, 0.15]]) {
      const k = Math.sqrt(1 - h * h);
      hat.add(ball(R * r, R * r * 0.5, R * r, spot, Math.sin(a) * cw * k, ch * h, Math.cos(a) * cw * k));
    }
    head.add(hat);
  }
  if (has("leafcrown")) {
    // A ring of green and gold leaves round the head.
    const cols = ["#7fb86a", "#a9c96a", "#5f9a58", "#e2b24f"].map(felt);
    const forward = new THREE.Vector3(0, 0, 1);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const y = hh * (0.58 + 0.08 * Math.cos(a));
      const k = Math.sqrt(1 - (y / hh) ** 2);
      const p = new THREE.Vector3(Math.sin(a) * hw * k, y, Math.cos(a) * hd * k);
      const out = new THREE.Vector3(p.x / hw ** 2, p.y / hh ** 2, p.z / hd ** 2).normalize();
      const g = new THREE.Group();
      g.position.copy(p).addScaledVector(out, R * 0.05);
      g.quaternion.setFromUnitVectors(forward, out);
      const leaf = ball(R * 0.17, R * 0.32, R * 0.06, cols[i % 4]);
      leaf.rotation.z = i % 2 ? 0.45 : -0.45;
      g.add(leaf);
      head.add(g);
    }
  }
  if (has("flowercrown")) {
    // A ring of small five-petal flowers round the head, with leaves tucked between.
    const cols: [string, string][] = [["#f4a08a", "#e9705a"], ["#fbe08a", "#f0b93a"], ["#f5b3cc", "#e07ea3"], ["#ffffff", "#e9dff0"], ["#c9b3ee", "#9f82d6"]];
    const leaf = felt("#7fb86a");
    const heart = felt("#f6c445");
    const n = 13;
    const forward = new THREE.Vector3(0, 0, 1);
    const spot = (a: number) => {
      const y = hh * (0.56 + 0.1 * Math.cos(a));
      const k = Math.sqrt(1 - (y / hh) ** 2);
      const p = new THREE.Vector3(Math.sin(a) * hw * k, y, Math.cos(a) * hd * k);
      const out = new THREE.Vector3(p.x / hw ** 2, p.y / hh ** 2, p.z / hd ** 2).normalize();
      const g = new THREE.Group();
      g.position.copy(p).addScaledVector(out, R * 0.04);
      g.quaternion.setFromUnitVectors(forward, out);
      head.add(g);
      return g;
    };
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const l = spot(a + Math.PI / n);
      const lf = ball(R * 0.17, R * 0.07, R * 0.04, leaf);
      lf.rotation.z = i % 2 ? 0.7 : -0.7;
      l.add(lf);
      const g = spot(a);
      const [petal, deep] = cols[i % cols.length];
      const pr = R * (i % 2 ? 0.1 : 0.115);
      for (let j = 0; j < 5; j++) {
        const b = (j / 5) * Math.PI * 2 + i * 0.3;
        const p = ball(pr * 0.98, pr * 0.72, pr * 0.34, felt(petal), Math.cos(b) * pr, Math.sin(b) * pr, R * 0.03);
        p.rotation.z = b;
        const vein = ball(pr * 0.5, pr * 0.1, pr * 0.1, felt(deep), Math.cos(b) * pr * 0.9, Math.sin(b) * pr * 0.9, R * 0.03 + pr * 0.3);
        vein.rotation.z = b;
        g.add(p, vein);
      }
      g.add(ball(pr * 0.55, pr * 0.55, pr * 0.34, heart, 0, 0, R * 0.05));
    }
  }
  if (has("bow")) {
    const bm = felt(look.accent);
    const y = hh * 0.92;
    const z = R * 0.28;
    for (const d of [-1, 1]) {
      const c = ball(R * 0.26, R * 0.17, R * 0.09, bm, R * 0.62 + d * R * 0.24, y, z);
      c.rotation.z = d * 0.25;
      head.add(c);
    }
    head.add(ball(R * 0.09, R * 0.09, R * 0.09, bm, R * 0.62, y, z + R * 0.05));
  }
  if (has("flower")) {
    const fm = felt(look.accent);
    const fx2 = R * 0.56;
    const fy2 = hh * 0.74;
    const fz = surf(R * 0.5, R * 0.6) + R * 0.18;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      head.add(ball(R * 0.11, R * 0.11, R * 0.06, fm, fx2 + Math.cos(a) * R * 0.14, fy2 + Math.sin(a) * R * 0.14, fz));
    }
    head.add(ball(R * 0.08, R * 0.08, R * 0.07, felt("#f6d36a"), fx2, fy2, fz + R * 0.03));
  }

  // Bake each moving part down to a few meshes, then give this figure its own materials.
  const moving = new Set<THREE.Object3D>([head, ...legs, ...arms]);
  const named: [string, THREE.Group][] = [["body", body], ["head", head], ["leg0", legs[0]], ["leg1", legs[1]], ["arm0", arms[0]], ["arm1", arms[1]]];
  for (const [name, part] of named) bake(part, moving, `${lookNo}|${name}`);

  const copies = new Map<THREE.Material, THREE.Material>();
  const tintable: { m: THREE.MeshStandardMaterial | THREE.SpriteMaterial; color: THREE.Color; sheen?: THREE.Color }[] = [];
  const remember = (m: THREE.MeshStandardMaterial | THREE.SpriteMaterial) => {
    tintable.push({ m, color: m.color.clone(), sheen: m instanceof THREE.MeshPhysicalMaterial ? m.sheenColor.clone() : undefined });
  };
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o === faceMesh) return;
    const shared = o.material as THREE.Material;
    let c = copies.get(shared);
    if (!c) {
      copies.set(shared, (c = shared.clone()));
      remember(c as THREE.MeshStandardMaterial);
    }
    o.material = c;
  });
  remember(faceMat);

  // The feeling's small sign, floating beside the head. It doesn't turn with the body: it stays on the camera's side.
  const markMat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  remember(markMat);
  const mark = new THREE.Sprite(markMat);
  mark.scale.set(3.2 * R * U * look.scale, 3.2 * R * U * look.scale, 1);
  mark.position.set(0, hy * U * look.scale, hd * 1.15 * U * look.scale);
  mark.visible = false;
  pivot.add(mark);

  const faceSVG = (e: Expression, frame: Frame) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${FACE_PX}" height="${FACE_PX}" viewBox="${-SPAN} ${S.headY - SPAN} ${SPAN * 2} ${SPAN * 2}">${lookMarkup(look, own, e, { frame, faceOnly: true })}</svg>`;
  const faceAt = (e: Expression, frame: Frame) => picture(`face|${lookNo}|${e}|${frame}`, () => faceSVG(e, frame), FACE_PX);
  const markAt = (e: Expression) => {
    if (e === "neutral" || !FEELINGS[e].mark) return null;
    const H = 1.6 * R;
    return picture(`mark|${lookNo}|${e}`, () => `<svg xmlns="http://www.w3.org/2000/svg" width="${MARK_PX}" height="${MARK_PX}" viewBox="${-H} ${S.headY - H} ${H * 2} ${H * 2}">${lookMarkup(look, own, e, { markOnly: true })}</svg>`, MARK_PX);
  };
  /** Get a feeling's pictures on their way, so talking and blinking are ready when wanted. */
  const prepare = (e: Expression) => {
    faceAt(e, "closed");
    faceAt(e, "blink");
    faceAt(e, "open");
    markAt(e);
  };

  let expr = start;
  faceAt("neutral", "closed");
  prepare(start);

  let blinkAt = 1 + Math.random() * 4;
  let blinkUntil = 0;
  let talking = false;
  let freshFeeling = true;
  let livelyAt = 0;
  let shownFace: THREE.Texture | null = null;

  let speed = 0;
  let wantYaw = 0;
  let yaw = 0;
  let walkT = 0;
  let stride = 0; // how much of the walk is showing, 0..1

  let pointing = false;
  let point = 0;
  let wantPosture = 1;
  let posture = 1;

  const showFace = (t: number) => {
    if (t > blinkAt) {
      blinkUntil = t + 0.13;
      blinkAt = t + 2 + Math.random() * 4;
    }
    const frame: Frame = talking ? "open" : t < blinkUntil ? "blink" : "closed";
    // Until a picture is ready, keep the one showing.
    const tex = (frame === "closed" ? null : faceAt(expr, frame)) ?? faceAt(expr, "closed") ?? (shownFace ? null : faceAt("neutral", "closed"));
    if (tex && tex !== shownFace) {
      if (!shownFace) {
        faceMat.needsUpdate = true;
        faceMesh.visible = true;
      }
      shownFace = tex;
      faceMat.map = tex;
    }
    const mk = markAt(expr);
    // Facing away, a sign drawn for the face would float on the back of the head.
    mark.visible = !!mk && Math.cos(yaw) > -0.2;
    if (mk && markMat.map !== mk) {
      markMat.map = mk;
      markMat.needsUpdate = true;
    }
  };

  return {
    root,
    setFeeling(e) {
      if (e !== expr) freshFeeling = true;
      expr = e;
      prepare(e);
    },
    setMouth(open) {
      talking = open;
    },
    setPointing(on) {
      pointing = on;
    },
    setTint(color) {
      const k = color ? new THREE.Color(color) : null;
      for (const { m, color: base, sheen } of tintable) {
        m.color.copy(base);
        if (k) m.color.multiply(k);
        if (sheen && m instanceof THREE.MeshPhysicalMaterial) {
          m.sheenColor.copy(sheen);
          if (k) m.sheenColor.multiply(k);
        }
      }
    },
    setPosture(scale) {
      wantPosture = scale;
    },
    move(s, heading) {
      speed = s;
      if (s > 0) wantYaw = heading;
    },
    face(heading) {
      wantYaw = heading;
    },
    update(dt, t) {
      showFace(t);
      if (freshFeeling || talking) {
        livelyAt = t;
        freshFeeling = false;
      }

      let d = wantYaw - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * towards(9, dt);

      const walking = speed > 0.05;
      if (walking) walkT += dt * Math.min(13, Math.max(7, speed * 3.2));
      stride = mix(stride, walking ? 1 : 0, towards(12, dt));
      const swing = Math.sin(walkT) * stride;
      legs[0].rotation.x = swing * 0.75;
      legs[1].rotation.x = -swing * 0.75;
      arms[0].rotation.x = -swing * 0.6;

      // The right-hand arm as you look at them, as in the drawing, can reach forward and up.
      point = mix(point, pointing ? 1 : 0, towards(10, dt));
      arms[1].rotation.x = mix(swing * 0.6, -1.75, point);
      arms[1].rotation.z = mix(0.3, 0.05, point);
      arms[1].scale.y = mix(1, 1.7, point);

      posture = mix(posture, wantPosture, towards(6, dt));
      const slump = 1 - posture;
      body.rotation.set(slump * 0.8, yaw, 0);
      head.rotation.x = slump * 2.5;

      const calm = reducedMotion();
      const p = calm ? null : walking ? { dy: Math.abs(Math.sin(walkT)) * 0.07 * stride, angle: Math.sin(walkT) * 0.05 * stride, sx: 1, sy: 1 } : motionPose(settledMotion(FEELINGS[expr].motion, t - livelyAt), t);
      pivot.position.y = p?.dy ?? 0;
      pivot.rotation.z = p?.angle ?? 0;
      const sx = (p?.sx ?? 1) * (1 + slump * 0.35);
      pivot.scale.set(sx, (p?.sy ?? 1) * posture, sx);
    },
  };
}
