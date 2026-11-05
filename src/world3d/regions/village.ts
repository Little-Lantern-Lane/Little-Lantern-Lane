// The village: Lantern Lane, Market Street, the Square and the Hill with its hollow.
// Positions along the path come from src/game/layout.ts. Across the path, the walkable band is
// bandAt(x); buildings stand behind it, and only low things stand in front, so the camera (at +Z
// looking toward -Z) always sees the player.

import * as THREE from "three";
import { distToTrail, EDGE_X, FOUNTAIN_X, HOME_DOOR, LANE_GATE, POLES, PROPS, TRAILS, USABLES, ZONES } from "../../game/layout";
import type { HomeChoice } from "../../logic/appearance";
import type { WorldState } from "../../logic/world";
import { ball, cyl, LANTERN_COLOURS, own, rbox, soft } from "../kit";
import { worldX } from "../space";
import type { Blocker, BuildContext, LightSpot, RegionKit } from "../types";
import { buildHome, disposeHome, type HomeMarks } from "./home3d";
import { buildFountain } from "./village-fountain";
import { groundAt, groundMesh, snowGround, summerGround } from "./village-ground";
import { archShape, bake, barrelShape, chimney, cone, dome, door, dot, gableShape, GLASS, hipShape, LAMP, lightWindows, markPos, noShadows, Parts, pbox, pipe, roofed, Scatter, shapeOf, slab, snowMat, SNOW, vane, win } from "./village-parts";

/** How far across the path things stand that the story or core may need to line up with. */
export const VILLAGE_Z = { homeFront: -4.6, fountain: -4.1, stone: -0.6, poles: -1.5, hollow: -3.5, teaCart: -3.3, edgeCart: -4.4 };
/** Height of the lantern poles in the Square. */
export const POLE_HEIGHT = 6.4;

export interface VillageKit extends RegionKit {
  /** Rebuild your home after it changes. */
  refreshHome(home: HomeChoice): void;
}

const GREENS = ["#5f9a5c", "#6ba65f", "#528a58", "#74ad62"];
const BLOOMS = ["#f08a6a", "#f6d36a", "#e98fb4", "#fffaf0", "#7fc4dc"];
const FLAGS = ["#f08a6a", "#f6d36a", "#8fcc76", "#7fc4dc", "#e98fb4"];
const PEBBLES = ["#cdbf9f", "#d8c9a8", "#c2b292"];

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

// --- Signs ------------------------------------------------------------------------------------

/** A wooden pill with words on it, centred at x, y on a wall whose face is at z. */
function textSign(p: Parts, text: string, x: number, y: number, z: number, w: number, h: number): void {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const g = c.getContext("2d")!;
  g.fillStyle = "#a8674a";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#fff6e6";
  g.font = `bold ${Math.round(c.height * 0.56)}px "Trebuchet MS", "Segoe UI", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height * 0.54);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  p.add(pbox(w + h * 0.7, h + 0.08, 0.16, h / 2, soft("#a8674a"), x, y, z + 0.06, 3));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  face.position.set(x, y, z + 0.15);
  face.userData.keep = true;
  p.add(face);
  p.winter.add(pbox(w + h * 0.5, 0.1, 0.2, 0.05, snowMat(), x, y + h / 2 + 0.05, z + 0.06));
}

/** A post pointing the way somewhere. */
export function signPost(x: number, z: number, text: string): THREE.Group {
  const p = new Parts();
  const post = p.sub(x, 0, z);
  post.add(pipe(0.07, 0.09, 2.3, soft("#7c5a42"), 0, 1.15, -0.06));
  textSign(post, text, 0, 2.05, 0, 2.3, 0.4);
  return bake(p.base);
}

export const woodsPost = (x: number, z: number) => signPost(x, z, "TO THE WOODS");

/** A worn path on the ground: a dirt ribbon with a softer edge, following `heightAt` so it lies on the land. */
export function groundTrail(pts: [number, number][], heightAt: (X: number, z: number) => number, offsetZ: number, colour = "#d9bf94", edge = "#c4a878"): THREE.Group {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(worldX(x), 0, z)));
  const n = Math.max(24, Math.round(curve.getLength() * 3));
  const ribbon = (half: number, lift: number, col: string) => {
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const c = curve.getPoint(i / n);
      const t = curve.getTangent(i / n);
      const [nx, nz] = [-t.z, t.x];
      const wobble = half + Math.sin(i * 0.9) * 0.12 + Math.sin(i * 0.37) * 0.1;
      for (const d of [-1, 1]) {
        const [x, z] = [c.x + nx * wobble * d, c.z + nz * wobble * d];
        pos.push(x, heightAt(x, z) + lift, z + offsetZ);
      }
      if (i) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 1, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    return m;
  };
  g.add(ribbon(1.65, 0.035, edge), ribbon(1.25, 0.05, colour));
  return g;
}

/** A board with the map on it, standing in each place. */
export function mapBoard(x: number, z: number): THREE.Group {
  const p = new Parts();
  const post = p.sub(x, 0, z);
  for (const d of [-0.85, 0.85]) post.add(pipe(0.07, 0.09, 2.5, soft("#7c5a42"), d, 1.25, -0.08));
  post.add(pbox(2.1, 1.45, 0.1, 0.06, soft("#8a5f3e"), 0, 1.75, -0.02), pbox(1.86, 1.2, 0.04, 0.03, soft("#f3e2bb"), 0, 1.75, 0.05));
  for (const [dx, dy, c] of [[-0.55, 0.2, "#e9583c"], [-0.1, -0.2, "#f2b54a"], [0.35, 0.25, "#4fa3a0"], [0.6, -0.3, "#c94f6d"]] as const) post.add(dot(0.08, soft(c), dx, 1.75 + dy, 0.09));
  post.add(pbox(1.5, 0.05, 0.03, 0.01, soft("#b08a5e"), 0, 1.74, 0.08));
  textSign(post, "MAP", 0, 2.66, 0.02, 0.8, 0.3);
  return bake(p.base);
}

function awning(p: Parts, x: number, y: number, z: number, w: number, a: string, b: string, n = 8, out = 1.1): void {
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    const col = soft(i % 2 ? b : a, 0.75);
    const s = pbox(sw * 1.02, 0.12, out, 0.05, col, x - w / 2 + sw * (i + 0.5), y, z + out * 0.46);
    s.rotation.x = 0.4;
    p.add(s, dot(sw * 0.5, col, x - w / 2 + sw * (i + 0.5), y - out * 0.2 - 0.02, z + out * 0.92, 0.55));
  }
  const cap = pbox(w + 0.04, 0.1, out, 0.05, snowMat(), x, y + 0.11, z + out * 0.46);
  cap.rotation.x = 0.4;
  p.winter.add(cap);
}

function lamppost(p: Parts, x: number, y: number, z: number): void {
  const m = soft("#6b5a6a");
  p.add(pipe(0.08, 0.11, 2.6, m, x, y + 1.3, z), pipe(0.17, 0.2, 0.2, m, x, y + 0.1, z), pipe(0.13, 0.13, 0.08, m, x, y + 2.6, z));
  const l = pipe(0.3, 0.2, 0.46, LAMP, x, y + 2.86, z, 10);
  l.castShadow = false;
  p.add(l, pipe(0.05, 0.36, 0.22, m, x, y + 3.2, z, 10), dot(0.07, m, x, y + 3.36, z));
  p.winter.add(dome(0.37, 0.24, 0.37, snowMat(), x, y + 3.14, z));
  p.spot(x, y + 2.86, z + 0.3, "#ffc27a", 20);
}

// --- Buildings ---------------------------------------------------------------------------------
// Each is built at the origin with its front wall on z = 0 and its middle on x = 0.

const D = 4.2;

function gableCottage(p: Parts, w: number, h: number, wall: string, roofCol: string, doorX: number, doorCol: string): void {
  p.add(rbox(w, h, D, 0.3, soft(wall), 0, h / 2, -D / 2));
  const rise = w * 0.43;
  roofed(p, gableShape(w + 0.55, rise), D + 0.7, roofCol, 0, h - 0.05, -D / 2);
  chimney(p, w * 0.2, h + 0.5, h + rise * 0.95, -D / 2 - 0.7);
  win(p, 0, h + rise * 0.34, 0.5, 0.72, 0.72, { kind: "round" });
  const ww = w < 4.2 ? 0.78 : 1.05;
  for (const x of [-w / 2 + ww * 0.92, w / 2 - ww * 0.92]) if (Math.abs(x - doorX) > 1.1) win(p, x, h * 0.55, 0, ww, 1.15, { box: true });
  door(p, doorX, 0, 1.25, 2.05, doorCol);
}

function townhouse(p: Parts, w: number, h: number, wall: string, roofCol: string): void {
  p.add(rbox(w, h, D - 0.6, 0.22, soft(wall), 0, h / 2, -(D - 0.6) / 2));
  roofed(p, hipShape(w + 0.4, 1.5, w * 0.34), D - 0.2, roofCol, 0, h - 0.05, -(D - 0.6) / 2);
  vane(p, 0, h + 1.55, -(D - 0.6) / 2, "#f6d36a");
  win(p, 0, h + 0.72, 0.28, 0.62, 0.8, { kind: "arch" });
  const off = w / 2 - 0.62;
  for (const y of [h - 0.95, h - 2.3]) for (const s of [-1, 1]) win(p, s * off, y, 0, 0.62, 0.86, { shutters: "#7fb0c9" });
  door(p, 0, 0, 0.98, 1.9, "#5f8fb0", "square");
}

function bakery(p: Parts, w: number, h: number, wall: string, roofCol: string, doorX: number): void {
  p.add(rbox(w, h, D, 0.3, soft(wall), 0, h / 2, -D / 2));
  roofed(p, barrelShape(w + 0.5, 1.5), D + 0.7, roofCol, 0, h - 0.05, -D / 2);
  chimney(p, w * 0.28, h + 0.8, h + 2.1, -D / 2 - 0.6, 0.72);
  textSign(p, "BAKERY", 0, h - 0.48, 0, 2.5, 0.52);
  awning(p, 0, h - 1.1, 0, w - 0.5, "#ef7a6a", "#fffaf0", 10);
  // The shop window, with loaves in it.
  const wx = -w * 0.2;
  const ww = w * 0.46;
  p.add(pbox(ww + 0.24, 1.3, 0.12, 0.08, soft("#fbf3e2"), wx, 1.15, 0.05));
  const g = pbox(ww, 1.08, 0.12, 0.06, GLASS, wx, 1.15, 0.09);
  g.castShadow = false;
  p.add(g);
  for (let i = 0; i < 4; i++) p.add(dot(0.27, soft(i % 2 ? "#d9984f" : "#c47e3f"), wx - ww * 0.33 + i * ww * 0.22, 0.86, 0.26, 0.62));
  p.winter.add(pbox(ww + 0.3, 0.1, 0.3, 0.05, snowMat(), wx, 1.84, 0.1));
  door(p, doorX, 0, 1.15, 2.05, "#a8674a", "square");
  p.spot(wx, 1.2, 0.6, "#ffc98a", 18);
}

function workshop(p: Parts, w: number, h: number, wall: string, roofCol: string): void {
  p.add(rbox(w, h, D + 0.3, 0.3, soft(wall), 0, h / 2, -(D + 0.3) / 2));
  const rise = w * 0.34;
  roofed(p, gableShape(w + 0.8, rise), D + 1, roofCol, 0, h - 0.05, -(D + 0.3) / 2);
  for (const s of [-1, 1]) p.add(pbox(0.26, h - 0.1, 0.12, 0.06, soft("#d8b48a"), s * (w / 2 - 0.16), h / 2, 0.03));
  chimney(p, -w * 0.22, h + 0.4, h + rise * 0.9, -2.9, 0.6);
  textSign(p, "LANTERNS", 0, h - 0.42, 0, 2.5, 0.52);
  win(p, 0, h + rise * 0.3, 0.55, 0.7, 0.7, { kind: "round" });
  for (const s of [-1, 1]) win(p, s * (w / 2 - 0.92), 1.6, 0, 0.82, 1.5, { kind: "arch" });
  door(p, 0, 0, 1.5, 2.45, "#8a5a3a", "double");
  // A paper lantern on a bracket at the corner.
  const iron = soft("#7a5a44");
  p.add(pbox(0.8, 0.07, 0.07, 0.03, iron, w / 2 + 0.25, 3.1, 0.3), pipe(0.02, 0.02, 0.2, iron, w / 2 + 0.56, 3, 0.3, 5));
  const l = dot(0.27, LAMP, w / 2 + 0.56, 2.66, 0.3, 1.2);
  l.castShadow = false;
  p.add(l);
  p.winter.add(pbox(0.84, 0.06, 0.12, 0.03, snowMat(), w / 2 + 0.25, 3.16, 0.3));
  p.spot(w / 2 + 0.56, 2.66, 0.6, "#ffb56a", 22);
  p.spot(0, 2.8, 1, "#ffb56a", 14);
  // Finished lanterns waiting by the door, in the warm months.
  for (let i = 0; i < 4; i++) {
    const s = i < 2 ? -1 : 1;
    p.summer.add(dot(0.25, soft(LANTERN_COLOURS[i], 0.6), s * (1.15 + (i % 2) * 0.46), 0.26, 0.5 + (i % 2) * 0.1, 1.05));
  }
}

function turretCottage(p: Parts, w: number, h: number, wall: string, roofCol: string): void {
  const mw = w - 1.4;
  const cx = -0.7;
  p.add(rbox(mw, h, D, 0.3, soft(wall), cx, h / 2, -D / 2));
  roofed(p, hipShape(mw + 0.5, 1.5, mw * 0.5), D + 0.6, roofCol, cx, h - 0.05, -D / 2);
  chimney(p, cx - mw * 0.2, h + 0.6, h + 2, -D / 2 - 0.5);
  const tx = w / 2 - 1;
  const r = 1.2;
  const th = h + 1.4;
  p.add(pipe(r, r, th, soft(wall), tx, th / 2, -r + 0.2, 24));
  cone(p, r + 0.3, 2, "#7a9fd0", tx, th - 0.05, -r + 0.2);
  vane(p, tx, th + 1.9, -r + 0.2);
  win(p, tx, th - 1, 0.2, 0.72, 0.72, { kind: "round" });
  win(p, tx, 1.7, 0.2, 0.72, 1.1, { kind: "arch" });
  win(p, cx - 1, 1.75, 0, 1.0, 1.05, { box: true });
  door(p, cx + 0.7, 0, 1.2, 2, "#7a9a5a");
}

function porchHouse(p: Parts, w: number, h: number, wall: string, roofCol: string): void {
  p.add(rbox(w, h, D, 0.3, soft(wall), 0, h / 2, -D / 2));
  roofed(p, hipShape(w + 0.55, 1.5, w * 0.56), D + 0.6, roofCol, 0, h - 0.05, -D / 2);
  chimney(p, -w * 0.3, h + 0.5, h + 2, -D / 2, 0.52);
  // A dormer.
  const dz = 0.05;
  p.add(pbox(1.2, 1, 1.2, 0.12, soft(wall), 0, h + 0.75, dz - 0.5));
  roofed(p, gableShape(1.55, 0.62), 1.5, roofCol, 0, h + 1.2, dz - 0.5);
  win(p, 0, h + 0.72, dz + 0.1, 0.62, 0.62);
  for (const s of [-1, 1]) win(p, s * (w / 2 - 0.92), 1.85, 0, 1, 1, { shutters: "#c97b6a" });
  door(p, 0, 0, 1.1, 1.95, "#c97b6a", "square", false);
  // The little porch over the door.
  p.add(pbox(w * 0.5, 0.18, 1.4, 0.07, soft("#c9a37a"), 0, 0.11, 0.7));
  const top = pbox(w * 0.5 + 0.4, 0.18, 1.6, 0.07, soft(roofCol, 0.7), 0, 2.5, 0.62);
  top.rotation.x = 0.2;
  p.add(top);
  const cap = pbox(w * 0.5 + 0.44, 0.1, 1.62, 0.05, snowMat(), 0, 2.63, 0.62);
  cap.rotation.x = 0.2;
  p.winter.add(cap);
  for (const s of [-1, 1]) p.add(pbox(0.14, 2.3, 0.14, 0.05, soft("#ffffff"), s * w * 0.23, 1.28, 1.25));
}

/** A plainer house for the rows behind. */
function backHouse(p: Parts, w: number, h: number, wall: string, roofCol: string, kind: number): void {
  const d = 3.6;
  p.add(pbox(w, h, d, 0.24, soft(wall), 0, h / 2, -d / 2, 2));
  const s = kind % 3 === 0 ? gableShape(w + 0.5, w * 0.42) : kind % 3 === 1 ? barrelShape(w + 0.5, 1.5) : hipShape(w + 0.5, 1.4, w * 0.45);
  roofed(p, s, d + 0.5, roofCol, 0, h - 0.05, -d / 2);
  chimney(p, w * 0.22, h + 0.4, h + 1.7, -d / 2 - 0.3, 0.5);
  win(p, -w * 0.25, h * 0.58, 0, 0.8, 0.9);
  win(p, w * 0.25, h * 0.58, 0, 0.8, 0.9);
  p.add(pbox(0.9, 1.7, 0.1, 0.1, soft(["#a8674a", "#5f8fb0", "#7a9a5a"][kind % 3]), 0, 0.85, 0.04));
}

// --- Street furniture ---------------------------------------------------------------------------

function bench(p: Parts, x: number, y: number, z: number, ry = 0): void {
  const b = p.sub(x, y + 0.56, z, ry);
  const seat = soft("#c98a5e");
  b.add(pbox(1.9, 0.14, 0.52, 0.05, seat), pbox(1.9, 0.14, 0.1, 0.04, seat, 0, 0.28, -0.24), pbox(1.9, 0.14, 0.1, 0.04, seat, 0, 0.5, -0.26));
  for (const s of [-1, 1]) b.add(pbox(0.12, 0.56, 0.46, 0.04, soft("#9b6b43"), s * 0.76, -0.28, 0));
  b.winter.add(pbox(1.96, 0.1, 0.56, 0.05, snowMat(), 0, 0.11, 0));
}

function wheel(r: number, x: number, y: number, z: number, tyre: string, hub: string): THREE.Mesh[] {
  const a = pipe(r, r, 0.14, soft(tyre), x, y, z, 18);
  const b = pipe(r * 0.38, r * 0.38, 0.18, soft(hub), x, y, z, 12);
  a.rotation.x = b.rotation.x = Math.PI / 2;
  return [a, b];
}

function teaCart(p: Parts): void {
  const body = soft("#4f7d72");
  const dark = soft("#3c6158");
  p.add(pbox(2.5, 0.9, 1.2, 0.12, body, 0, 1.05, 0), pbox(2.6, 0.14, 1.3, 0.06, dark, 0, 1.56, 0));
  for (const z of [-0.65, 0.65]) p.add(...wheel(0.42, -0.8, 0.42, z, "#2e3b38", "#c9b98e"), ...wheel(0.42, 0.8, 0.42, z, "#2e3b38", "#c9b98e"));
  for (const [x, z] of [[-1.15, 0.5], [1.15, 0.5], [-1.15, -0.5], [1.15, -0.5]]) p.add(pipe(0.05, 0.05, 1.05, dark, x, 2.08, z, 8));
  const roof = slab(barrelShape(2.9, 0.5), 1.5, soft("#e7c35a", 0.7), 0.06);
  roof.position.y = 2.58;
  p.add(roof);
  const cap = slab(barrelShape(2.9, 0.5), 1.46, snowMat(), 0.06);
  cap.position.y = 2.68;
  p.winter.add(cap);
  // Kettle and two cups on the counter.
  p.add(dot(0.3, soft("#e7c35a", 0.5), -0.55, 1.84, 0.15, 0.78), pipe(0.04, 0.07, 0.3, soft("#e7c35a", 0.5), -0.2, 1.88, 0.15, 7));
  for (const x of [0.25, 0.65]) p.add(pipe(0.13, 0.1, 0.22, soft("#f6efe2"), x, 1.74, 0.25, 10));
}

function marketCart(p: Parts): void {
  const wood = soft("#c98a5e");
  p.add(pbox(2.9, 0.78, 1.5, 0.12, wood, 0, 1.05, 0), pbox(3, 0.1, 1.6, 0.04, soft("#b37a4f"), 0, 1.46, 0));
  for (const z of [-0.82, 0.82]) p.add(...wheel(0.48, -0.85, 0.48, z, "#7a5a44", "#c98a5e"), ...wheel(0.48, 0.85, 0.48, z, "#7a5a44", "#c98a5e"));
  const h = pbox(1.5, 0.1, 0.1, 0.04, soft("#9b6b43"), 2, 1.1, 0.4);
  const h2 = pbox(1.5, 0.1, 0.1, 0.04, soft("#9b6b43"), 2, 1.1, -0.4);
  h.rotation.z = h2.rotation.z = -0.36;
  p.add(h, h2);
  // Sacks and crates in it.
  p.add(pbox(0.9, 0.7, 0.9, 0.12, soft("#a8784f"), -0.75, 1.8, 0), dot(0.42, soft("#e9dcc0"), 0.25, 1.82, 0.2, 1.05), dot(0.38, soft("#ddcda8"), 0.85, 1.76, -0.2, 1));
  p.winter.add(pbox(2.92, 0.26, 1.52, 0.12, snowMat(), 0, 2.26, 0));
}

function stall(p: Parts): void {
  const wood = soft("#7c5a42");
  p.add(pbox(4.4, 1.05, 1.5, 0.14, soft("#a8784f"), 0, 0.52, 0), pbox(4.7, 0.16, 1.8, 0.07, soft("#c99a5e"), 0, 1.1, 0));
  for (const s of [-1, 1]) for (const z of [-0.7, 0.7]) p.add(pbox(0.16, 2.6, 0.16, 0.06, wood, s * 2.1, 2.3, z));
  for (let i = 0; i < 7; i++) {
    const a = pbox(0.68, 0.14, 2.3, 0.06, soft(i % 2 ? "#fbf3e2" : "#e9583c"), -2.04 + i * 0.68, 3.68, 0);
    a.rotation.x = 0.1;
    p.add(a);
  }
  const cap = pbox(4.8, 0.12, 2.34, 0.05, snowMat(), 0, 3.8, 0);
  cap.rotation.x = 0.1;
  p.winter.add(cap);
  for (let i = 0; i < 5; i++) p.summer.add(dot(0.26, soft(LANTERN_COLOURS[i], 0.6), -1.6 + i * 0.8, 1.46, 0.1, 1.15));
}

function barrel(p: Parts, x: number, z: number, s = 1): void {
  p.add(pipe(0.34 * s, 0.34 * s, 0.86 * s, soft("#9b6b43"), x, 0.43 * s, z, 12), pipe(0.37 * s, 0.37 * s, 0.07 * s, soft("#6b5244"), x, 0.62 * s, z, 12), pipe(0.37 * s, 0.37 * s, 0.07 * s, soft("#6b5244"), x, 0.24 * s, z, 12));
  p.winter.add(dome(0.34 * s, 0.2 * s, 0.34 * s, snowMat(), x, 0.86 * s, z));
}

function crate(p: Parts, x: number, z: number, s = 1, ry = 0): void {
  const c = pbox(0.8 * s, 0.7 * s, 0.8 * s, 0.09, soft("#b98a5e"), x, 0.35 * s, z);
  c.rotation.y = ry;
  p.add(c);
  p.winter.add(dome(0.42 * s, 0.14 * s, 0.42 * s, snowMat(), x, 0.7 * s, z));
}

function pot(p: Parts, s: Scatter, x: number, z: number, col: string): void {
  p.add(pipe(0.3, 0.23, 0.42, soft("#c97b6a"), x, 0.21, z, 12));
  s.blob(x, 0.66, z, 0.33, "#6ba65f");
  for (let i = 0; i < 4; i++) s.put("flower", x + Math.cos(i * 1.6) * 0.24, 0.78 + (i % 2) * 0.12, z + Math.sin(i * 1.6) * 0.2 + 0.1, 0.08, 0.08, 0.08, col);
}

/** A white picket fence along x, low enough to look over. */
function fence(s: Scatter, x0: number, x1: number, z: number, y: (X: number) => number, h = 0.56, color = "#fffaf0"): void {
  for (let x = x0; x <= x1; x += 0.46) {
    s.put("post", x, y(x) + h / 2, z, 0.05, h / 3, 0.05, color);
    s.put("lump", x, y(x) + h + 0.03, z, 0.09, 0.05, 0.09, SNOW);
  }
  const step = 3;
  for (let x = x0; x < x1; x += step) {
    const e = Math.min(x + step, x1);
    const mid = (x + e) / 2;
    const len = e - x;
    const slope = Math.atan2(y(e) - y(x), len);
    for (const up of [0.2, 0.4]) s.put("rail", mid, y(mid) + up * (h / 0.56), z + 0.04, len / Math.cos(slope), 0.05, 0.04, color, 0, slope);
  }
}

/** A dry-stone wall: rows of rounded stones. */
function stoneWall(s: Scatter, r: () => number, x0: number, x1: number, z: number, rows = 2, ax: "x" | "z" = "x", y0 = groundAt): void {
  for (let row = 0; row < rows; row++) {
    for (let t = x0 + (row % 2) * 0.28; t < x1; t += 0.56) {
      const [x, zz] = ax === "x" ? [t, z] : [z, t];
      const c = ["#c9c0ae", "#b9b0a2", "#d6cec0"][Math.floor(r() * 3)];
      const sz = 0.3 + r() * 0.06;
      s.put("rock", x, y0(x, zz) + 0.16 + row * 0.26, zz, ax === "x" ? sz : 0.24, 0.19, ax === "x" ? 0.24 : sz, c);
      if (row === rows - 1) s.put("lump", x, y0(x, zz) + 0.3 + row * 0.26, zz, 0.32, 0.1, 0.28, SNOW);
    }
  }
}

function bunting(p: Parts, pts: [number, number, number][], sag: number): void {
  const wood = soft("#7a5a44");
  const flagMats = FLAGS.map((c) => own(c, { side: THREE.DoubleSide }));
  const tri = new THREE.ShapeGeometry(shapeOf([[-0.17, 0], [0.17, 0], [0, -0.38]]));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i]);
    const b = new THREE.Vector3(...pts[i + 1]);
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= sag * 2;
    mid.z += 0.2;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.022, 5), soft("#8a6a52"));
    line.castShadow = true;
    p.add(line, dot(0.08, wood, a.x, a.y, a.z), dot(0.08, wood, b.x, b.y, b.z));
    const n = Math.floor(a.distanceTo(b) / 0.55);
    for (let k = 1; k < n; k++) {
      const q = curve.getPoint(k / n);
      const f = new THREE.Mesh(tri, flagMats[(k + i) % FLAGS.length]);
      f.position.copy(q);
      f.castShadow = true;
      p.add(f);
    }
  }
}

function plough(p: Parts): void {
  // Built facing +X, as in the 2D picture; the caller turns it toward the lane.
  const yellow = soft("#e8a04f");
  const lit = own("#ffd98a", { emissive: "#ffd98a", emissiveIntensity: 1.6 });
  p.add(pbox(3.5, 0.8, 1.7, 0.24, yellow, 0, 1, 0), pbox(3.52, 0.1, 1.72, 0.04, soft("#c97b3a"), 0, 0.78, 0));
  p.add(pbox(1.5, 1.2, 1.5, 0.24, soft("#e57b5f"), 0.6, 1.9, 0));
  const glass = soft("#bfe3ef", 0.3);
  p.add(pbox(0.06, 0.74, 1.2, 0.03, glass, 1.36, 2, 0), pbox(1.1, 0.74, 0.06, 0.03, glass, 0.6, 2, 0.76), pbox(1.1, 0.74, 0.06, 0.03, glass, 0.6, 2, -0.76));
  for (const x of [-1, 1]) for (const z of [-0.92, 0.92]) p.add(...wheel(0.46, x, 0.46, z, "#3a3340", "#b9c4cc"));
  // The blade, with the snow it's pushing.
  const blade = pbox(0.28, 1.15, 2.7, 0.1, soft("#7a8a96"), 2.2, 0.62, 0);
  blade.rotation.z = -0.2;
  p.add(blade, dot(0.62, snowMat(), 2.85, 0.36, -0.7, 0.75), dot(0.75, snowMat(), 2.95, 0.4, 0.15, 0.8), dot(0.55, snowMat(), 2.8, 0.32, 0.9, 0.75));
  p.add(dot(0.15, lit, 1.78, 1.1, 0.6), dot(0.15, lit, 1.78, 1.1, -0.6), dot(0.11, lit, 1.42, 2.62, 0));
  p.add(pbox(1.5, 0.12, 1.5, 0.06, snowMat(), 0.6, 2.56, 0), pbox(1.6, 0.14, 1.5, 0.07, snowMat(), -0.95, 1.46, 0));
  // Grit in the back.
  p.add(pbox(0.7, 0.36, 0.5, 0.08, soft("#f2b54a"), -1.3, 1.6, 0.3));
}

function shadedBall(m: THREE.Material, x: number, y: number, z: number, rx: number, ry: number, rz: number): THREE.Mesh {
  const b = ball(1, m, x, y, z);
  b.scale.set(rx, ry, rz);
  return b;
}

// --- The whole village ----------------------------------------------------------------------------

export function buildVillage(ctx: BuildContext): VillageKit {
  const group = new THREE.Group();
  const lights: LightSpot[] = [];
  const blockers: Blocker[] = [];
  const p = new Parts();
  const far = new Parts();
  const s = new Scatter();
  const r = rng(7);
  const gyAt = groundAt;
  const X = worldX;
  const block = (x: number, z: number, rad: number) => blockers.push({ X: x, Z: z, r: rad });

  // Ground.
  const ground = groundMesh();
  const groundMat = ground.material as THREE.MeshStandardMaterial;
  const nearTrail = (x: number, z: number) => distToTrail(x * 55, z, TRAILS.toBeach) < 3.2 || distToTrail(x * 55, z, TRAILS.toMill) < 3.2 || distToTrail(x * 55, z, TRAILS.toWoods) < 2.6;
  const summerMap = summerGround();
  let snowMap: THREE.CanvasTexture | null = null;
  groundMat.map = summerMap;
  group.add(ground);

  // Far hills behind everything, blue-green with distance.
  for (const [x, z, rx, ry, rz, c] of [[-40, -62, 42, 15, 16, "#6f9a78"], [6, -74, 56, 22, 20, "#638f76"], [52, -66, 46, 18, 16, "#6b9779"], [100, -72, 58, 24, 20, "#5f8c74"], [140, -60, 40, 16, 14, "#6f9a78"]] as const) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 18), soft(c, 1));
    m.scale.set(rx, ry, rz);
    m.position.set(x, 4, z);
    far.add(m);
    far.winter.add(dome(rx * 1.004, ry * 1.01, rz * 1.004, snowMat(), x, 4 + ry * 0.12, z, 1.2));
  }

  // --- Lantern Lane ---
  const FRONT = -3.8;
  gableCottage(p.sub(5, 0, FRONT), 4.3, 3.5, "#fff1d6", "#e57b5f", 0.45, "#f2c43a");
  p.add(pbox(1.8, 0.14, 1, 0.06, soft("#d8c4a8"), 5.45, 0.07, -3.1));
  townhouse(p.sub(8.85, 0, -4.6), 2.45, 4.7, "#dcefe1", "#6fa7c9");
  lamppost(p, X(415), 0, -3.2);
  block(X(415), -3.2, 0.3);
  // The lane sign, on two posts between the houses.
  const laneSign = p.sub(-0.75, 0, -3.5);
  for (const x of [-1.1, 1.1]) laneSign.add(pipe(0.07, 0.09, 2.5, soft("#7c5a42"), x, 1.25, -0.08));
  textSign(laneSign, "LANTERN LANE", 0, 2.25, 0, 2.4, 0.42);
  lamppost(p, 19.15, 0, -3);
  block(19.15, -3, 0.3);
  // The way to your own door: stepping stones up from the lane, and a sign so you can find it.
  const doorX = X(HOME_DOOR);
  for (const [dx, z, w] of [[0.1, -3, 0.95], [-0.14, -3.45, 0.85], [0.08, -3.9, 0.9]] as const) p.add(pbox(w, 0.08, 0.42, 0.04, soft("#e6d6b8"), doorX + dx, 0.04, z));
  const homeSign = p.sub(doorX - 1.75, 0, -3.3);
  homeSign.add(pipe(0.07, 0.09, 1.9, soft("#7c5a42"), 0, 0.95, -0.06));
  textSign(homeSign, "HOME", 0, 1.75, 0, 1.15, 0.42);
  block(doorX - 1.75, -3.3, 0.14);

  // Hedges and pots along the house fronts.
  s.bush(2.9, 0, -3.7, 0.72, GREENS[0], ["#f4b9c0", "#fbe08a", "#f4b9c0"]);
  s.bush(7.4, 0, -3.7, 0.7, GREENS[1], ["#fbe08a", "#f08a6a"], 1);
  s.bush(10.6, 0, -3.5, 0.72, GREENS[0], ["#e98fb4", "#fbe08a", "#fffaf0"], 2);
  pot(p, s, 3.8, -3.4, "#f08a6a");
  pot(p, s, 6.95, -3.4, "#e98fb4");
  // The gate to the woods, and the trail going off behind it.
  const gateX = X(LANE_GATE);
  const gateWood = soft("#8a6444");
  for (const d of [-1.25, 1.25]) p.add(pipe(0.12, 0.15, 3.1, gateWood, gateX + d, 1.55, -3.2));
  p.add(pbox(3.2, 0.22, 0.24, 0.08, soft("#6e4e38"), gateX, 3.1, -3.2));
  const woodsSign = p.sub(gateX, 0, -3.22);
  textSign(woodsSign, "TO THE WOODS", 0, 2.6, 0, 1.9, 0.38);
  for (const d of [-1.25, 1.25]) block(gateX + d, -3.2, 0.14);
  for (const [dx, z, w] of [[0.1, -3.05, 1], [-0.12, -3.6, 0.9], [0.14, -4.15, 0.95], [-0.05, -4.75, 0.85], [0.1, -5.4, 0.8]] as const) p.add(pbox(w, 0.08, 0.4, 0.04, soft("#d8c9a8"), gateX + dx, 0.04, z));

  // --- Market Street ---
  const BAKERY_X = 23.2;
  bakery(p.sub(BAKERY_X, 0, FRONT), 5.5, 3.9, "#ffe1d4", "#8bbf74", 1.7);
  workshop(p.sub(X(1650), 0, FRONT - 0.2), 4.9, 4.1, "#fde6a8", "#b986c9");
  townhouse(p.sub(35.8, 0, -5.4), 2.7, 5, "#e3ecf7", "#e57b5f");
  lamppost(p, X(1430), 0, -3.2);
  lamppost(p, X(1860), 0, -3.2);
  block(X(1430), -3.2, 0.3);
  block(X(1860), -3.2, 0.3);
  teaCart(p.sub(X(1880), 0, VILLAGE_Z.teaCart - 0.1));
  block(X(1880) - 0.8, VILLAGE_Z.teaCart, 0.85);
  block(X(1880) + 0.8, VILLAGE_Z.teaCart, 0.85);
  p.spot(X(1880), 2.5, VILLAGE_Z.teaCart + 0.4, "#ffc98a", 14);
  barrel(p, 21, -3.15);
  barrel(p, 20.45, -3.35, 0.85);
  crate(p, 26.75, -3.45, 1, 0.3);
  crate(p, 27.15, -3.5, 0.75, 0.9);
  s.bush(26.75, 0, -4.8, 0.7, GREENS[1], ["#fbe08a", "#f4b9c0"], 3);
  s.bush(33.1, 0, -4.4, 0.75, GREENS[2], ["#f4b9c0", "#fffaf0", "#fbe08a"], 4);
  pot(p, s, 21.9, -3.45, "#f6d36a");
  pot(p, s, 32.75, -3.45, "#e98fb4");

  // --- The Square ---
  const SQ = -8.2;
  gableCottage(p.sub(41.75, 0, SQ), 3.9, 3.6, "#ffe1d4", "#e57b5f", 0, "#a8674a");
  porchHouse(p.sub(51.5, 0, SQ), 3.8, 3.3, "#fff1d6", "#8bbf74");
  turretCottage(p.sub(56, 0, SQ - 0.1), 4.4, 3.6, "#e3ecf7", "#b986c9");
  stall(p.sub(47.3, 0, -8.8));
  bench(p, X(2320), 0, -6.95);
  bench(p, X(2810), 0, -6.95);
  block(X(2320) - 0.55, -6.95, 0.5);
  block(X(2320) + 0.55, -6.95, 0.5);
  block(X(2810) - 0.55, -6.95, 0.5);
  block(X(2810) + 0.55, -6.95, 0.5);
  lamppost(p, X(2120), 0, -7);
  lamppost(p, X(3000), 0, -7);
  block(X(2120), -7, 0.3);
  block(X(3000), -7, 0.3);
  for (const x of POLES) {
    const wood = soft("#b98a5e");
    p.add(pipe(0.12, 0.17, POLE_HEIGHT, wood, X(x), POLE_HEIGHT / 2, VILLAGE_Z.poles), pipe(0.3, 0.36, 0.3, soft("#d8cfc0"), X(x), 0.15, VILLAGE_Z.poles), dot(0.2, soft("#9b6b43"), X(x), POLE_HEIGHT + 0.06, VILLAGE_Z.poles));
    p.winter.add(dome(0.23, 0.2, 0.23, snowMat(), X(x), POLE_HEIGHT + 0.14, VILLAGE_Z.poles));
    block(X(x), VILLAGE_Z.poles, 0.35);
  }

  const FX = X(FOUNTAIN_X);
  const FZ = VILLAGE_Z.fountain;
  const fountainParts = p.sub(FX, 0, FZ);
  const fountain = buildFountain(fountainParts);
  fountain.group.position.set(FX, 0, FZ);
  block(FX, FZ, 2.5);
  // Flower beds and planters at the corners of the paving.
  for (const [x, z] of [[38.6, 6.4], [57.4, 6.4]]) {
    p.add(pipe(0.85, 0.95, 0.42, soft("#d8cfc0"), x, 0.21, z, 18));
    p.winter.add(dome(0.86, 0.3, 0.86, snowMat(), x, 0.42, z));
    s.blob(x, 0.56, z, 0.6, "#6ba65f");
    for (let i = 0; i < 12; i++) s.put("flower", x + Math.cos(i * 2.4) * (0.2 + (i % 3) * 0.2), 0.7 + (i % 3) * 0.1, z + Math.sin(i * 2.4) * (0.2 + (i % 3) * 0.2), 0.09, 0.09, 0.09, BLOOMS[i % 5]);
    block(x, z, 1);
  }
  s.bush(44.6, 0, -8.6, 0.8, GREENS[2], ["#fbe08a", "#f4b9c0", "#fffaf0"], 5);
  s.bush(49.6, 0, -8.5, 0.7, GREENS[1], ["#f08a6a", "#fbe08a"], 6);
  s.bush(39.3, 0, -8.2, 0.75, GREENS[0], ["#f4b9c0", "#fbe08a"], 7);
  barrel(p, 45.6, -7.8);
  crate(p, 49.5, -7.6, 0.9, 0.5);

  // The market cart at the edge of the Square.
  const cart = p.sub(X(EDGE_X), 0, VILLAGE_Z.edgeCart, -0.18);
  marketCart(cart);
  block(X(EDGE_X) - 0.9, VILLAGE_Z.edgeCart + 0.1, 1);
  block(X(EDGE_X) + 0.5, VILLAGE_Z.edgeCart, 1);
  block(X(EDGE_X) + 2.1, VILLAGE_Z.edgeCart - 0.1, 0.7);

  // The loose stone, tipped up out of the paving.
  const stone = p.sub(X(USABLES.stone.x), 0, VILLAGE_Z.stone);
  const lifted = dot(0.34, soft("#d8b582"), 0, 0.14, 0, 0.5);
  lifted.rotation.z = -0.26;
  lifted.scale.x = 1.3;
  stone.summer.add(lifted, dot(0.42, soft("#a58a68"), 0.08, 0.015, 0.02, 0.08));
  stone.summer.children[stone.summer.children.length - 1].castShadow = false;

  // Cobbles: one flattened stone each, leaving room for the fountain.
  const cobbleCols = ["#e0c08c", "#e6c99a", "#dcb884", "#ead0a4"];
  for (let row = 0, z = -7.9; z < 7.7; row++, z += 0.47) {
    for (let x = 36.9 + (row % 2) * 0.44; x < 59; x += 0.88) {
      const edge = Math.min(x - 36.6, 58.8 - x);
      if (r() > Math.min(1, edge / 1.3) * 0.96 + 0.04) continue;
      if (Math.hypot(x - FX, z - FZ) < 2.5 || Math.hypot(x - X(USABLES.stone.x), z - VILLAGE_Z.stone) < 0.45) continue;
      const jx = (r() - 0.5) * 0.1;
      s.put("cobble", x + jx, 0.012, z + (r() - 0.5) * 0.06, 0.37 + r() * 0.05, 0.05, 0.19 + r() * 0.03, cobbleCols[Math.floor(r() * 4)], (r() - 0.5) * 0.3);
    }
  }

  // --- The Hill ---
  const hillTrees: [number, number, number][] = [[62.5, -5.2, 1.2], [68.4, -5.6, 1.35], [79.2, -4.6, 1.15], [65.2, -7.2, 1.25], [71.8, -6.4, 1.15], [59.8, -6, 1]];
  hillTrees.forEach(([x, z, sc], i) => {
    if (distToTrail(x * 55, z, TRAILS.toMill) > 3) s.tree(x, gyAt(x, z), z, sc, GREENS[i % 4], i);
  });
  stoneWall(s, r, 59.4, 71.6, -4.4, 2);
  for (const [x, z, sz] of [[60.8, -3.9, 0.5], [66.9, -4, 0.42], [72.2, -3.95, 0.58], [73.1, -4.2, 0.4]]) s.put("boulder", x, gyAt(x, z) + sz * 0.5, z, sz * 1.2, sz, sz, "#c8bdca");
  bench(p, 64.2, gyAt(64.2, -3.95), -3.95);
  block(63.65, -3.95, 0.5);
  block(64.75, -3.95, 0.5);
  // A worn stone step or two in the track as it climbs.
  for (let x = 59.5; x < 74; x += 1.25) {
    const z = 0.5 * Math.sin((x - 58) * 0.22) + (r() - 0.5) * 1.6;
    s.put("pebble", x, gyAt(x, z) + 0.02, z, 0.42, 0.07, 0.24, "#e6d3a8", r());
  }

  // The hollow: a soft rock with a real mouth you can stand in.
  const HX = X((ZONES.hollow.x0 + ZONES.hollow.x1) / 2);
  const hy = gyAt(HX, -3);
  const rock = soft("#d6cbd9");
  const hollow = p.sub(HX, hy, 0);
  const face = new THREE.Shape();
  face.moveTo(-4.3, -0.1);
  face.bezierCurveTo(-4.4, 2.2, -3.2, 4.2, -0.2, 4.35);
  face.bezierCurveTo(3, 4.3, 4.4, 2.2, 4.4, -0.1);
  face.closePath();
  const mouth = archShape(2.95, 2.75);
  face.holes.push(mouth);
  const front = slab(face, 0.5, rock, 0.24, 40);
  front.position.z = -2.75;
  // The dark passage: a sleeve of dark rock with a back wall.
  const dark = soft("#2e2836", 1);
  const sleeveOuter = archShape(3.5, 3.05);
  sleeveOuter.holes.push(archShape(2.9, 2.72));
  const sleeve = slab(sleeveOuter, 2.4, dark, 0);
  sleeve.position.z = -4.1;
  const backWall = slab(archShape(3.5, 3.05), 0.2, soft("#1f1a26", 1), 0);
  backWall.position.z = -5.3;
  hollow.add(front, sleeve, backWall, pbox(3, 0.06, 2.5, 0.02, dark, 0, 0.03, -4.1));
  for (const [x, y, z, rx, ry, rz] of [[0, 0, -9.3, 5.4, 5.2, 3.8], [-3.7, 0.2, -4.6, 1.9, 3.2, 2.1], [3.8, 0.2, -4.6, 1.9, 3, 2.1], [0, 4.1, -4.5, 3.4, 1.2, 1.9]]) {
    hollow.add(shadedBall(rock, x, y, z, rx, ry, rz));
    const cap = dome(rx * 1.01, ry * 1.01, rz * 1.01, snowMat(), x, y + ry * 0.15, z, 0.9);
    hollow.winter.add(cap);
  }
  // Lumps on the face, so it reads as rock rather than a wall.
  for (const [x, y, z, rx, ry, rz] of [[-3.5, 0.45, -2.15, 1.05, 0.85, 0.7], [3.55, 0.4, -2.2, 1.15, 0.8, 0.65], [3.75, 1.5, -2.55, 0.62, 0.8, 0.4], [-2.5, 0.3, -2.1, 0.62, 0.48, 0.5]]) {
    const b = shadedBall(rock, x, y, z, rx, ry, rz);
    hollow.add(b);
    hollow.winter.add(dome(rx * 1.04, ry * 0.9, rz * 1.04, snowMat(), x, y + ry * 0.25, z, 1));
  }
  const fw = hollow.sub(0, 0, -2.3);
  for (let i = 0; i < 20; i++) {
    const a = Math.PI * (0.06 + 0.88 * (i / 19));
    const x = Math.cos(a) * 1.78;
    const y = 1.38 + Math.sin(a) * 1.72;
    fw.summer.add(dot(0.2 + (i % 3) * 0.05, soft(i % 2 ? "#8fcc76" : "#6db35f"), x, y, 0.1));
    if (i % 3 === 0) fw.summer.add(dot(0.08, soft(FLAGS[i % 5]), x, y + 0.1, 0.3));
    if (a > 0.5 && a < 2.6) {
      fw.winter.add(dot(0.24, snowMat(), x, y + 0.08, 0.08));
      const l = 0.22 + ((i * 5) % 4) * 0.08;
      const ice = pipe(0.05, 0, l, soft("#d8ecf5", 0.25), x * 0.9, y - 0.22 - l / 2, 0.02, 6);
      ice.castShadow = false;
      fw.winter.add(ice);
    }
  }
  for (const side of [-1, 1]) {
    block(HX + side * 2.75, -3.1, 1.1);
    block(HX + side * 4, -3.1, 0.95);
  }

  // --- Behind everything ---
  const rows: [number, number, number, number, string, string][] = [
    [0.8, -13.2, 4.2, 3, "#f7e0c8", "#7a9fd0"], [9.6, -14.4, 4.6, 3.3, "#e9e4d4", "#c97a5e"], [17.8, -13, 4.2, 3, "#f6d9d0", "#7fae6a"],
    [26.4, -14.6, 4.8, 3.3, "#dfeadf", "#b986c9"], [33.6, -13.6, 4.2, 3.1, "#fbeac4", "#6fa7c9"], [40.8, -16.4, 4.6, 3.4, "#e3ecf7", "#d9677a"],
    [47.6, -17.4, 5, 3.4, "#f7e3cf", "#7a9fd0"], [54.8, -16.8, 4.4, 3.2, "#e4efdf", "#e2b24f"], [-4.8, -15, 4.6, 3.2, "#fff1d6", "#8bbf74"],
  ];
  const houses: [number, number, number][] = [];
  rows.forEach(([x, z, w, h, wall, roofCol], i) => {
    const y = gyAt(x, z - 1.5);
    const b = far.sub(x, y, z);
    backHouse(b, w, h, wall, roofCol, i);
    b.spot(x, y + h * 0.58, z + 0.6, "#ffc98a", 8);
    houses.push([x, z, w]);
  });
  // Trees fill everything behind the buildings; none on top of a house.
  const clear = (x: number, z: number) => !houses.some(([hx, hz, w]) => Math.abs(x - hx) < w / 2 + 1.8 && z < hz + 2 && z > hz - 6);
  for (const [x, z, sc] of [[-0.4, -6.4, 1.1], [19.8, -4.4, 0.8], [26.9, -6.8, 1.15], [37.9, -7.6, 1.15], [57.9, -7.8, 1.1], [3, -8.8, 1.3], [7.2, -9, 1.2], [11, -10.2, 1.3], [20.6, -10, 1.3], [33.3, -8.8, 1.2], [37.2, -11, 1.3], [44.2, -12.2, 1.35], [49.3, -11.8, 1.3], [53, -13, 1.3]]) {
    s.tree(x, gyAt(x, z), z, sc, GREENS[Math.floor(r() * 4)], r() * 6);
  }
  for (let i = 0; i < 150; i++) {
    const x = -34 + r() * 150;
    const z = -11 - r() * r() * 42;
    if (x > -2 && x < 58 && z > -12.5) continue;
    if (x >= 58 && x < 75 && z > -8 + (x > 70 ? 2 : 0)) continue;
    if (x > 70 && x < 83 && z > -13) continue;
    if (!clear(x, z)) continue;
    s.tree(x, gyAt(x, z), z, 1 + r() * 0.75, GREENS[Math.floor(r() * 4)], r() * 6, true);
  }
  // Hedge along the backs of the shops.
  for (let x = 3; x < 36; x += 1.5) {
    const z = -11 + Math.sin(x) * 0.3;
    if (!clear(x, z)) continue;
    s.blob(x, 0.55, z, 0.8, GREENS[(x | 0) % 3]);
  }

  // The ends of the world: a wall and woods past Lantern Lane; rocks and trees past the hollow.
  stoneWall(s, r, -9, 12, -1.5, 3, "z");
  for (const [x, z, sc] of [[-4, -7, 1.3], [-6.4, -2, 1.45], [-4.6, 3.2, 1.25], [-7.4, 7, 1.35], [-10.8, -5, 1.5], [-11.2, 2, 1.5], [-3.6, 9.6, 1]]) s.tree(x, 0, z, sc, GREENS[Math.floor(r() * 4)], r() * 6);
  for (const [x, z, sc] of [[82.6, -3.8, 1.3], [84.2, 1.2, 1.5], [83.2, 5.6, 1.2], [87, -2.2, 1.5], [88, 4, 1.4], [85, 9, 1.3], [90.5, 0.5, 1.5]]) s.tree(x, gyAt(x, z), z, sc, GREENS[Math.floor(r() * 4)], r() * 6);
  for (const [x, z, sz] of [[81, -2, 0.9], [81.2, 0.8, 1.1], [81.1, 3.4, 0.8], [81.8, -0.4, 0.7], [81.6, 2.2, 0.75]]) s.put("boulder", x, gyAt(x, z) + sz * 0.55, z, sz * 1.25, sz, sz, "#c8bdca");

  // --- In front: nothing taller than a fence, kept far enough forward not to hide feet ---
  fence(s, -0.6, 8.6, 6.2, (x) => gyAt(x, 6.2));
  fence(s, 11.8, 21.5, 6.2, (x) => gyAt(x, 6.2));
  fence(s, 24.5, 35, 6.2, (x) => gyAt(x, 6.2));
  stoneWall(s, r, 59.8, 73, 5.6, 2);
  fence(s, 73.6, 80.5, 5.6, (x) => gyAt(x, 5.6), 0.5, "#c9a37a");
  // The Square's low hedge.
  for (let x = 38; x < 58.4; x += 0.62) {
    if (Math.abs(x - 48) < 1.9) continue;
    const z = 8.5 + Math.sin(x * 0.7) * 0.1;
    if (nearTrail(x, z)) continue;
    s.blob(x, 0.2, z, 0.42, Math.floor(x * 3) % 4 ? "#62a05e" : "#6ba65f");
    if (r() < 0.32) s.put("flower", x, 0.48, z + 0.26, 0.08, 0.08, 0.08, BLOOMS[Math.floor(r() * 5)]);
  }
  for (let i = 0; i < 60; i++) {
    const x = -2 + r() * 84;
    const z = 7.2 + r() * 8;
    if ((x > 37 && x < 59 && z < 9.6) || nearTrail(x, z)) continue;
    s.bush(x, gyAt(x, z), z, 0.42 + r() * 0.22, GREENS[Math.floor(r() * 4)], r() < 0.6 ? [BLOOMS[Math.floor(r() * 5)], BLOOMS[Math.floor(r() * 5)]] : [], i);
  }

  // Grass, flowers and pebbles over everything green.
  const onGrass = (x: number, z: number) => {
    if (nearTrail(x, z)) return false;
    if (x >= 36 && x < 59.4) return z > 8.2 || z < -8.6;
    if (x >= 59.4) return Math.abs(z - 0.5 * Math.sin((x - 58) * 0.22)) > 2;
    return z > 5.2 || z < -3.4;
  };
  for (let i = 0; i < 1300; i++) {
    const x = -6 + r() * 92;
    const z = -9 + r() * 25;
    if (!onGrass(x, z) || (Math.abs(x - HX) < 4.6 && z < -1.8)) continue;
    const y = gyAt(x, z);
    if (i % 3 === 0) {
      s.put("flower", x, y + 0.14, z, 0.075, 0.075, 0.075, FLAGS[i % 5]);
      s.put("tuft", x, y + 0.07, z, 0.03, 0.16, 0.03, "#5f9a5c");
    } else {
      const q = 0.1 + r() * 0.09;
      s.put("clump", x, y, z, q * 1.2, q * 1.25, q, r() < 0.5 ? "#86b763" : "#79ab5c", r() * 6);
    }
  }
  // Pebbles along both edges of the lane, as in the approved look.
  for (let i = 0; i < 110; i++) {
    const x = -1 + (i / 110) * 38 + Math.sin(i * 7) * 0.2;
    const z = i % 2 ? -2.95 + Math.sin(i * 3.1) * 0.1 : 5.05 + Math.sin(i * 3.1) * 0.22;
    const q = 0.12 + (i % 4) * 0.045;
    s.put("pebble", x, 0.03, z, q * 1.4, q * 0.55, q, PEBBLES[i % 3], i);
  }
  // Soft drifts where snow gathers: against walls and along the fences.
  for (let i = 0; i < 90; i++) {
    const x = -2 + r() * 84;
    const z = i % 3 === 0 ? 6.5 + r() * 1.5 : i % 3 === 1 ? -3.3 - r() * 0.5 : 7 + r() * 8;
    if (x > 36.5 && x < 59 && z < 8) continue;
    const q = 0.5 + r() * 0.8;
    s.put("drift", x, gyAt(x, z) - 0.01, z, q * 1.7, 0.1 + r() * 0.1, q * 0.65, "#f5f8fc");
  }

  // --- Story props ---
  const buntingParts = new Parts();
  // Strung between two poles of its own, either side of the workshop, so it's always tied to something.
  const flagZ = -3.1;
  const flagPoles = [27, 32.45];
  for (const x of flagPoles) {
    buntingParts.add(pipe(0.07, 0.11, 5.7, soft("#a8784e"), x, 2.85, flagZ), pipe(0.17, 0.2, 0.22, soft("#d8cdb4"), x, 0.11, flagZ), dot(0.12, soft("#f2c44a", 0.4), x, 5.76, flagZ));
  }
  bunting(buntingParts, [[flagPoles[0], 5.45, flagZ], [flagPoles[1], 5.45, flagZ]], 0.3);
  const nellSnow = new Parts();
  const nx = X(PROPS.nell_snow.x);
  for (const [dx, y, dz, rx, ry, rz] of [[-1.3, 0.1, 0, 1.25, 0.72, 0.85], [0, 0.1, 0.05, 1.5, 1.05, 1], [1.35, 0.1, -0.05, 1.3, 0.8, 0.85], [0.5, 0.75, 0, 0.8, 0.5, 0.6]]) {
    nellSnow.add(shadedBall(snowMat(), nx + dx, y, -3 + dz, rx, ry, rz));
  }
  const ploughParts = new Parts();
  const px = X(PROPS.plough.x);
  plough(ploughParts.sub(px, 0, -1.4, Math.PI));
  const ploughBlock: Blocker[] = [{ X: px - 1.7, Z: -1.4, r: 1.35 }, { X: px, Z: -1.4, r: 1.35 }, { X: px + 1.4, Z: -1.4, r: 1.3 }];
  const props: { name: string; g: THREE.Group }[] = [
    { name: "street_bunting", g: bake(buntingParts.base) },
    { name: "nell_snow", g: bake(nellSnow.base) },
    { name: "plough", g: bake(ploughParts.base) },
  ];

  // --- Lights and smoke, read off the marks left while building ---
  noShadows(far);
  const toSpot = (m: { color: string; power: number } & Parameters<typeof markPos>[0]): LightSpot => ({ pos: markPos(m), color: m.color, power: m.power });
  for (const m of [...p.spots, ...far.spots]) lights.push(toSpot(m));
  const fixedSmokes = [...p.smokes, ...far.smokes].map(markPos);
  const ploughLight: LightSpot = { pos: [px - 2.6, 1.3, -1.2], color: "#ffd98a", power: 34, on: (w) => w.props.includes("plough") };
  lights.push(ploughLight);

  // Windows you can look at from the lane.
  for (const [x, y, z] of [[3.45, 1.9, -2.9], [6.6, 1.9, -2.9], [8.85, 3, -3.7], [40.8, 2.2, -7.2], [51.5, 2.2, -7.2], [54.9, 2.1, -7.3]] as const) lights.push({ pos: [x, y, z], color: "#ffc98a", power: 8 });

  // Baked layers.
  const STRETCH = 26;
  const baseLayer = bake(p.base, STRETCH);
  const summer = bake(p.summer, STRETCH);
  const winter = bake(p.winter, STRETCH);
  const farBase = bake(far.base, 60);
  const farWinter = bake(far.winter, 60);
  const scattered = new Parts(new THREE.Group(), new THREE.Group(), new THREE.Group());
  s.build(scattered);
  summer.add(scattered.summer);
  winter.add(scattered.winter);
  winter.add(farWinter);
  group.add(baseLayer, farBase, scattered.base, summer, winter, fountain.group);
  for (const pr of props) {
    pr.g.visible = false;
    group.add(pr.g);
  }

  // Paths leave the village through gaps in the green.
  for (const [x, z] of [[X(2860), 7.6], [X(3010), 12], [X(3290), 9], [X(3320), 13]] as const) s.bush(x, gyAt(x, z), z, 0.95, GREENS[0], ["#fbe08a", "#f4b9c0"], 8);

  // The village between stories: a row of chapter lanterns in the Square, and things to change your look and home.
  const hubParts = new Parts();
  const mirrorX = X(USABLES.mirror.x);
  const mirrorPost = hubParts.sub(mirrorX, 0, USABLES.mirror.z! - 0.6);
  mirrorPost.add(pbox(1.1, 2, 0.12, 0.3, soft("#b9895e"), 0, 1.15, 0), pbox(0.86, 1.72, 0.04, 0.26, own("#cfe7f0", { roughness: 0.12, metalness: 0.35 }), 0, 1.15, 0.07));
  textSign(mirrorPost, "YOUR LOOK", 0, 0.12, 0.14, 1.2, 0.3);
  const potsPost = hubParts.sub(X(USABLES.paint_pots.x), 0, USABLES.paint_pots.z! - 0.6);
  (["#e57b5f", "#7a9fd0", "#8bbf74"] as const).forEach((c, i) => {
    const pot = cyl(0.26, 0.24, 0.42, soft("#c4ccd4", 0.4), -0.56 + i * 0.56, 0.21, 0);
    const paint = cyl(0.23, 0.23, 0.03, soft(c), -0.56 + i * 0.56, 0.43, 0);
    pot.userData.keep = paint.userData.keep = true;
    potsPost.add(pot, paint);
  });
  potsPost.add(pipe(0.05, 0.07, 1.5, soft("#7c5a42"), 0, 0.75, -0.3));
  textSign(potsPost, "YOUR HOME", 0, 1.35, -0.26, 1.2, 0.3);
  const hubScene = bake(hubParts.base);
  group.add(hubScene);

  // Your home.
  const homeSpot = new THREE.Group();
  homeSpot.position.set(X(HOME_DOOR), 0, VILLAGE_Z.homeFront);
  group.add(homeSpot);
  let homeNow = ctx.home;
  let snowNow = false;
  let homeMesh: THREE.Group | null = null;
  let homeLights: LightSpot[] = [];
  let smokes: [number, number, number][] = fixedSmokes;

  const placeHome = () => {
    if (homeMesh) {
      homeSpot.remove(homeMesh);
      disposeHome(homeMesh);
    }
    homeMesh = buildHome(homeNow, snowNow);
    homeSpot.add(homeMesh);
    const marks = homeMesh.userData.marks as HomeMarks;
    const o = homeSpot.position;
    for (const l of homeLights) lights.splice(lights.indexOf(l), 1);
    homeLights = marks.lights.map((l) => ({ pos: [l.pos[0] + o.x, l.pos[1] + o.y, l.pos[2] + o.z], color: l.color, power: l.power }));
    lights.push(...homeLights);
    smokes = [...fixedSmokes, ...marks.smokes.map(([x, y, z]): [number, number, number] => [x + o.x, y + o.y, z + o.z])];
  };
  placeHome();

  // Chimney smoke: a few soft puffs per chimney, all in one mesh.
  const PUFFS = 5;
  const smoke = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), new THREE.MeshStandardMaterial({ color: "#f4f1ee", roughness: 1, transparent: true, opacity: 0.5, depthWrite: false }), (smokes.length + 6) * PUFFS);
  smoke.frustumCulled = false;
  group.add(smoke);
  const mtx = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const vp = new THREE.Vector3();
  const vs = new THREE.Vector3();

  // Fireflies on the Hill after dark.
  const FLIES = 54;
  const flyBase = Array.from({ length: FLIES }, () => {
    const x = 59 + r() * 22;
    const z = -6 + r() * 12;
    return { x, y: gyAt(x, z) + 0.5 + r() * 2.2, z, a: r() * 6.28, b: 0.5 + r() };
  });
  const flyPos = new Float32Array(FLIES * 3);
  const flyCol = new Float32Array(FLIES * 3);
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute("position", new THREE.BufferAttribute(flyPos, 3));
  flyGeo.setAttribute("color", new THREE.BufferAttribute(flyCol, 3));
  const dotCanvas = document.createElement("canvas");
  dotCanvas.width = dotCanvas.height = 64;
  const dg = dotCanvas.getContext("2d")!;
  const grad = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.2, "rgba(255,255,255,.75)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  dg.fillStyle = grad;
  dg.fillRect(0, 0, 64, 64);
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ size: 0.55, map: new THREE.CanvasTexture(dotCanvas), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flies.frustumCulled = false;
  flies.visible = false;
  group.add(flies);

  const setSnow = (on: boolean) => {
    summer.visible = !on;
    winter.visible = on;
    groundMat.map = on ? (snowMap ??= snowGround()) : summerMap;
    groundMat.needsUpdate = true;
    fountain.setFrozen(on);
  };
  setSnow(false);

  return {
    group,
    lights,
    blockers,
    setState(w: WorldState) {
      const snow = w.weather === "snow";
      if (snow !== snowNow) {
        snowNow = snow;
        setSnow(snow);
        placeHome();
      }
      lightWindows(w.time === "night" ? 1 : w.time === "sunset" ? 0.6 : w.weather === "storm" ? 0.45 : 0);
      flies.visible = w.time === "night" && w.weather === "clear";
      for (const pr of props) pr.g.visible = (PROPS[pr.name].shown?.(w) ?? false) || w.props.includes(pr.name);
      const ploughOut = w.props.includes("plough");
      hubScene.visible = w.level === 8;
      const has = blockers.includes(ploughBlock[0]);
      if (ploughOut && !has) blockers.push(...ploughBlock);
      if (!ploughOut && has) for (const b of ploughBlock) blockers.splice(blockers.indexOf(b), 1);
    },
    update(_dt: number, t: number) {
      fountain.update(t);
      smoke.count = smokes.length * PUFFS;
      smokes.forEach(([x, y, z], i) => {
        for (let k = 0; k < PUFFS; k++) {
          const u = (t * 0.16 + k / PUFFS + i * 0.37) % 1;
          const size = (0.15 + 0.42 * u) * Math.min(1, u * 8) * Math.min(1, (1 - u) * 3.5);
          vp.set(x + u * 0.8 + Math.sin(t * 0.8 + k * 2 + i) * 0.12 * u, y + u * 3, z + Math.cos(t * 0.6 + k) * 0.1 * u);
          smoke.setMatrixAt(i * PUFFS + k, mtx.compose(vp, quat, vs.setScalar(Math.max(size, 0.001))));
        }
      });
      smoke.instanceMatrix.needsUpdate = true;
      if (flies.visible) {
        flyBase.forEach((f, i) => {
          flyPos[i * 3] = f.x + Math.sin(t * 0.5 * f.b + f.a) * 0.9;
          flyPos[i * 3 + 1] = f.y + Math.sin(t * 0.8 * f.b + f.a * 2) * 0.4;
          flyPos[i * 3 + 2] = f.z + Math.cos(t * 0.4 * f.b + f.a) * 0.9;
          const on = Math.max(0, Math.sin(t * 1.7 * f.b + f.a * 3)) ** 2;
          flyCol[i * 3] = on;
          flyCol[i * 3 + 1] = on * 0.9;
          flyCol[i * 3 + 2] = on * 0.34;
        });
        flyGeo.attributes.position.needsUpdate = true;
        flyGeo.attributes.color.needsUpdate = true;
      }
    },
    refreshHome(home: HomeChoice) {
      homeNow = home;
      placeHome();
    },
  };
}
