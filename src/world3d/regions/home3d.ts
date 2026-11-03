// The player's home in 3D, from what they chose (src/logic/appearance.ts): one of four ready-made
// styles or one designed part by part, plus whatever it has grown. Mirrors src/game/homes.ts.
//
// The group's origin is the foot of the front door. +Z is out of the door, the house runs back into
// -Z and the garden and porch sit in front, within about 1.8 of the door.

import * as THREE from "three";
import { PAINTS } from "../../game/homes";
import { hasAddition, type CustomHome, type HomeChoice } from "../../logic/appearance";
import { rbox, soft } from "../kit";
import { archShape, bake, barrelShape, chimney, cone, dome, door, dot, flowerBox, gableShape, LAMP, markPos, onRound, Parts, pbox, pipe, roofed, shapeOf, slab, snowMat, stovepipe, vane, win, type DoorKind, type WinOpts } from "./village-parts";

const SHADE = new THREE.Color("#000000");

interface Grow {
  up: boolean;
  side: boolean;
  porch: boolean;
  garden: boolean;
}

interface Colours {
  wall: string;
  roof: string;
  trim: string;
  door: string;
}

/** What buildHome leaves on the group's userData, in the group's own coordinates. */
export interface HomeMarks {
  lights: { pos: [number, number, number]; color: string; power: number }[];
  smokes: [number, number, number][];
}

const darker = (c: string, by = 0.08) => `#${new THREE.Color(c).lerp(SHADE, by).getHexString()}`;

function sideRoom(p: Parts, x: number, c: Colours, w: WinOpts): void {
  const rw = 3.3;
  const cx = x + rw / 2;
  p.add(rbox(rw, 2.5, 3.2, 0.26, soft(c.wall), cx, 1.25, -1.8));
  roofed(p, shapeOf([[-rw / 2 - 0.2, 0.9], [rw / 2 + 0.25, 0.1], [rw / 2 + 0.25, -0.2], [-rw / 2 - 0.2, 0.25]]), 3.5, c.roof, cx, 2.45, -1.8);
  win(p, cx + 0.2, 1.4, -0.2, 1.2, 1.05, w);
}

function cottage(p: Parts, g: Grow, c: Colours): void {
  const w = 4.8;
  const h = g.up ? 5.5 : 3.4;
  const d = 4.2;
  const rise = 2.1;
  if (g.side) sideRoom(p, w / 2 - 0.35, c, { shutters: c.trim, box: true });
  p.add(rbox(w, h, d, 0.3, soft(c.wall), 0, h / 2, -d / 2));
  roofed(p, gableShape(w + 0.5, rise), d + 0.7, c.roof, 0, h - 0.05, -d / 2);
  chimney(p, w * 0.2, h + 0.6, h + rise * 0.98, -d / 2 - 0.8);
  win(p, 0, h + 0.72, 0.5, 0.75, 0.75, { kind: "round" });
  if (g.up) {
    p.add(pbox(w - 0.1, 0.12, 0.08, 0.04, soft(darker(c.wall)), 0, 3.4, 0.01));
    for (const x of [-1.4, 1.4]) win(p, x, 4.3, 0, 1.0, 1.1, { shutters: c.trim });
  }
  for (const x of [-1.55, 1.55]) win(p, x, 1.75, 0, 1.0, 1.15, { box: true });
  door(p, 0, 0, 1.25, 2.05, c.door);
}

function mushroom(p: Parts, g: Grow, c: Colours): void {
  const r = 1.77;
  const cx = 0.6;
  const zc = -Math.sqrt(r * r - cx * cx);
  const sh = g.up ? 5.1 : 3;
  if (g.side) {
    const x2 = cx + 4.3;
    p.add(pbox(3.2, 1.7, 2, 0.26, soft(c.wall), cx + 2.4, 0.85, zc));
    p.add(pipe(1.05, 1.15, 2.4, soft(c.wall), x2, 1.2, zc, 22));
    p.add(dome(2, 2, 1.9, soft(c.roof, 0.7), x2, 2.1, zc), pipe(1.9, 2, 0.16, soft("#fdf3e0"), x2, 2.08, zc, 24));
    p.winter.add(dome(1.96, 2.06, 1.86, snowMat(), x2, 2.16, zc, 1.05));
    for (const [az, el, s] of [[-0.6, 0.6, 0.26], [0.2, 0.9, 0.32], [0.8, 0.4, 0.22]]) spotOn(p, x2, 2.1, zc, 2, 2, 1.9, az, el, s);
    win(onRound(p, x2, zc, 1.1, 0), 0, 1.1, 0, 0.8, 0.8, { kind: "round" });
  }
  p.add(pipe(r * 0.95, r * 1.02, sh, soft(c.wall), cx, sh / 2, zc, 26));
  const capY = sh - 0.05;
  p.add(dome(3.8, 3.7, 3.6, soft(c.roof, 0.7), cx, capY, zc), pipe(3.65, 3.78, 0.22, soft("#fdf3e0"), cx, capY - 0.02, zc, 30));
  p.winter.add(dome(3.72, 3.78, 3.52, snowMat(), cx, capY + 0.1, zc, 1.05));
  for (const [az, el, s] of [[-0.9, 0.5, 0.48], [-0.25, 0.85, 0.38], [0.45, 0.55, 0.55], [1.05, 0.32, 0.36], [-1.35, 0.2, 0.3], [0.1, 0.25, 0.28], [2.2, 0.7, 0.45], [-2.3, 0.6, 0.42]]) spotOn(p, cx, capY, zc, 3.8, 3.7, 3.6, az, el, s);
  stovepipe(p, cx + 2.1, capY + 2, capY + 3.7, zc - 0.6);
  if (g.up) for (const dx of [-0.75, 0.75]) win(onRound(p, cx, zc, r * 0.97, dx), 0, 3.7, 0, 0.8, 0.8, { kind: "round" });
  const right = onRound(p, cx, zc, r, 0.75);
  win(right, 0, 1.65, 0, 0.8, 0.95, { box: true });
  door(onRound(p, cx, zc, r, -cx), 0, 0, 1.15, 1.95, c.door);
}

/** A flat white spot lying on a dome, at a turn `az` from the front and height `el`. */
function spotOn(p: Parts, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, az: number, el: number, s: number): void {
  const n = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const m = dot(s, soft("#fffaf0"), cx + rx * n.x, cy + ry * n.y, cz + rz * n.z);
  m.scale.set(1, 1, 0.3);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.normalize());
  m.castShadow = false;
  p.add(m);
}

function burrow(p: Parts, g: Grow, c: Colours): void {
  const grass = "#8fcc76";
  const rx = 3.6;
  const ry = 3.7;
  const rz = 3.1;
  const zc = -2.7;
  if (g.up) {
    const x = 0.9;
    p.add(rbox(2.04, 3.2, 2.04, 0.3, soft(c.wall), x, 3.9, zc - 0.4));
    roofed(p, gableShape(2.5, 1.7), 2.5, c.roof, x, 5.45, zc - 0.4);
    vane(p, x, 7.15, zc - 0.4);
    win(p, x, 4.7, zc + 0.62, 0.9, 1.05, { shutters: c.trim });
  }
  if (g.side) {
    const x2 = 4.7;
    p.add(dome(2.5, 3, 2.4, soft("#7fbf6a"), x2, 0, zc + 0.2));
    p.winter.add(dome(2.54, 3.06, 2.44, snowMat(), x2, 0.02, zc + 0.2, 1.15));
    const f = onRound(p, x2, zc + 0.2, 2.26, 0.4);
    win(f, 0, 1.3, 0, 1.0, 1.0, { kind: "round" });
    flowerBox(f, 0, 0.62, 0, 1.2);
  }
  p.add(dome(rx, ry, rz, soft(grass), 0, 0, zc));
  p.winter.add(dome(rx * 1.015, ry * 1.02, rz * 1.015, snowMat(), 0, 0.02, zc, 1.15));
  for (const [x, y, z, col] of [[-2.1, 2.9, -1.3, "#f08a6a"], [-0.6, 3.5, -1.6, "#f6d36a"], [1.2, 3.3, -1.3, "#e98fb4"], [2.7, 2.1, -1.2, "#fffaf0"], [-3.05, 1.5, -1.4, "#f6d36a"], [-1.5, 2.2, -0.65, "#fffaf0"], [1.9, 2.5, -0.9, "#f08a6a"]] as const) p.summer.add(dot(0.13, soft(col), x, y, z));
  // The doorway: a stone arch and a short passage out of the hill.
  const stone = slab(archShape(2.6, 2.6), 1.3, soft("#c9b9a8"), 0.08);
  stone.position.set(0, 0, -0.35);
  const inner = slab(archShape(2.15, 2.35), 1.4, soft(c.wall), 0.05);
  inner.position.set(0, 0, -0.32);
  p.add(stone, inner);
  door(p, 0, 0.38, 1.4, 1.95, c.door);
  for (const s of [-1, 1]) {
    const x = s * 2.4;
    const y = 1.5;
    const z = zc + rz * Math.sqrt(1 - (x / rx) ** 2 - (y / ry) ** 2);
    const f = p.sub(x, 0, z - 0.1, Math.atan2(x / (rx * rx), z === zc ? 1 : (z - zc) / (rz * rz)));
    const ring = pipe(0.68, 0.68, 0.34, soft("#c9b9a8"), 0, y, 0.02, 20);
    ring.rotation.x = Math.PI / 2;
    f.add(ring);
    win(f, 0, y, 0.12, 0.98, 0.98, { kind: "round" });
    flowerBox(f, 0, y - 0.72, 0.12, 0.9);
  }
  chimney(p, -1.35, 2.8, 4.2, -3.2, 0.5);
}

function tower(p: Parts, g: Grow, c: Colours): void {
  const r = 1.65;
  const dx = 0.62;
  const cx = -dx;
  const zc = -Math.sqrt(r * r - dx * dx);
  const h = g.up ? 6.7 : 4.4;
  if (g.side) {
    const wx = cx + r - 0.25 + 1.85;
    p.add(rbox(3.7, 2.9, 3.4, 0.3, soft(c.wall), wx, 1.45, zc - 0.25));
    roofed(p, barrelShape(4, 1.45), 3.7, c.roof, wx, 2.85, zc - 0.25);
    win(p, wx - 0.75, 1.55, zc + 1.45, 0.95, 1.05, { shutters: c.trim, box: true });
    win(p, wx + 0.8, 1.55, zc + 1.45, 0.95, 1.05, { shutters: c.trim });
  }
  p.add(pipe(r, r * 1.02, h, soft(c.wall), cx, h / 2, zc, 28));
  cone(p, r + 0.4, 2.7, c.roof, cx, h - 0.05, zc);
  vane(p, cx, h + 2.6, zc, "#f6d36a");
  const stone = soft(darker(c.wall, 0.07));
  for (let i = 0; i < Math.floor(h / 0.7); i++) {
    const f = onRound(p, cx, zc, r, -1.1 + ((i * 0.87) % 2.2));
    f.add(pbox(0.6, 0.25, 0.08, 0.04, stone, 0, 0.5 + i * 0.68, 0));
  }
  if (g.up) {
    const by = 3.95;
    p.add(pipe(r + 0.5, r + 0.5, 0.24, soft("#c9a37a"), cx, by, zc, 28));
    const rail = new THREE.Mesh(new THREE.TorusGeometry(r + 0.42, 0.06, 8, 36), soft("#ffffff"));
    rail.rotation.x = Math.PI / 2;
    rail.position.set(cx, by + 0.66, zc);
    rail.castShadow = true;
    p.add(rail);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      p.add(pipe(0.035, 0.035, 0.62, soft("#ffffff"), cx + Math.sin(a) * (r + 0.42), by + 0.34, zc + Math.cos(a) * (r + 0.42), 6));
    }
    p.winter.add(pipe(r + 0.52, r + 0.52, 0.1, snowMat(), cx, by + 0.14, zc, 28));
    win(onRound(p, cx, zc, r, 0), 0, 5.2, 0, 1.0, 1.25, { shutters: c.trim, kind: "arch" });
  } else {
    win(onRound(p, cx, zc, r, 0), 0, 3.5, 0, 0.9, 0.9, { kind: "round" });
  }
  win(onRound(p, cx, zc, r, -0.75), 0, 1.75, 0, 0.85, 1.05, { box: true });
  door(onRound(p, cx, zc, r, dx), 0, 0, 1.15, 1.95, c.door);
}

// --- Designed part by part ----------------------------------------------------------------------

const BODY = { cottage: { w: 5.1, h: 3.4, r: 0.3 }, tall: { w: 4.2, h: 5.7, r: 0.3 }, long: { w: 7.3, h: 3.05, r: 0.3 }, round: { w: 4.3, h: 4.5, r: 1.3 } };

/** The roof over a wall of width w at height h. Returns its peak, and its height partway across. */
function customRoof(p: Parts, c: CustomHome, x: number, w: number, d: number, h: number, z: number) {
  const col = c.roofColor;
  switch (c.roof) {
    case "steep": {
      const rise = Math.min(w * 0.85, 4);
      roofed(p, gableShape(w + 0.45, rise), d + 0.7, col, x, h - 0.05, z);
      return { peak: [x, h + rise], at: (u: number) => rise * (1 - Math.abs(2 * u - 1)) };
    }
    case "round": {
      const rise = Math.min(w * 0.42, 2.2);
      roofed(p, barrelShape(w + 0.5, rise), d + 0.7, col, x, h - 0.05, z);
      return { peak: [x, h + rise], at: (u: number) => rise * 0.95 * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) };
    }
    case "thatch": {
      const rise = Math.min(w * 0.5, 2.5);
      roofed(p, barrelShape(w + 0.9, rise), d + 1, col, x, h - 0.08, z);
      // A scalloped straw edge along the front and sides.
      const m = soft(col, 0.95);
      for (let ex = -w / 2 - 0.45; ex <= w / 2 + 0.46; ex += 0.48) p.add(dot(0.3, m, x + ex, h - 0.05, z + d / 2 + 0.55, 0.8));
      for (const s of [-1, 1]) for (let ez = -d / 2 - 0.3; ez <= d / 2 + 0.3; ez += 0.5) p.add(dot(0.3, m, x + s * (w / 2 + 0.5), h - 0.05, z + ez, 0.8));
      const line = soft(darker(col, 0.12), 0.95);
      for (const k of [0.4, 0.72]) {
        const y = h + rise * k;
        const half = (w + 0.9) / 2 * Math.sqrt(1 - k * k) * 0.92;
        p.add(pbox(half * 2, 0.09, 0.06, 0.03, line, x, y, z + (d + 1) / 2 + 0.14));
      }
      return { peak: [x, h + rise], at: (u: number) => rise * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) };
    }
    case "flat": {
      p.add(pbox(w + 0.6, 0.42, d + 0.6, 0.16, soft(col, 0.7), x, h + 0.1, z));
      p.winter.add(pbox(w + 0.64, 0.14, d + 0.64, 0.07, snowMat(), x, h + 0.36, z));
      // A little terrace: a railing and a potted tree.
      const white = soft("#ffffff");
      const front = z + d / 2 + 0.18;
      for (let px = -w / 2 - 0.1; px <= w / 2 + 0.11; px += 0.42) p.add(pipe(0.04, 0.04, 0.62, white, x + px, h + 0.62, front, 6));
      p.add(pbox(w + 0.3, 0.1, 0.1, 0.04, white, x, h + 0.95, front));
      p.add(pbox(0.6, 0.5, 0.6, 0.1, soft("#c97b6a"), x - w * 0.3, h + 0.55, z), dot(0.5, soft("#7fbf6a"), x - w * 0.3, h + 1.2, z));
      p.winter.add(dome(0.5, 0.42, 0.5, snowMat(), x - w * 0.3, h + 1.28, z));
      return { peak: [x + w / 2 - 0.5, h + 0.3], at: () => 0.3 };
    }
    default: {
      const rise = Math.min(w * 0.42, 2.25);
      roofed(p, gableShape(w + 0.5, rise), d + 0.7, col, x, h - 0.05, z);
      return { peak: [x, h + rise], at: (u: number) => rise * (1 - Math.abs(2 * u - 1)) };
    }
  }
}

function wallTexture(p: Parts, c: CustomHome, x: number, w: number, h: number, seed: number): void {
  const r = rand(seed);
  const m = soft(c.texture === "brick" ? mix(c.wall, "#c96e5a", 0.28) : darker(c.wall, 0.09));
  if (c.texture === "planks") for (let y = 0.45; y < h - 0.1; y += 0.44) p.add(pbox(w - 0.4, 0.05, 0.03, 0.01, m, x, y, 0.01));
  if (c.texture === "stone") {
    for (let i = 0; i < (w * h) / 1.05; i++) p.add(pbox(0.5 + r() * 0.35, 0.28 + r() * 0.14, 0.05, 0.02, m, x - w / 2 + 0.45 + r() * (w - 0.9), 0.3 + r() * (h - 0.6), 0.01));
  }
  if (c.texture === "brick") {
    for (let row = 0, y = 0.2; y < h - 0.12; row++, y += 0.38) {
      for (let bx = -w / 2 + 0.3 + (row % 2) * 0.37; bx < w / 2 - 0.3; bx += 0.75) p.add(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.3, 0.03), m).translateX(x + bx).translateY(y).translateZ(0.01));
    }
  }
}

const mix = (a: string, b: string, t: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

function rand(seed: number) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

function topper(p: Parts, c: CustomHome, x: number, y: number, z: number): void {
  if (c.topper === "weathervane") vane(p, x, y, z);
  if (c.topper === "flag") vane(p, x, y, z, c.doorColor);
  if (c.topper === "lantern") {
    const wood = soft("#7a5a44");
    p.add(pipe(0.04, 0.05, 0.85, wood, x, y + 0.42, z, 8), pbox(0.5, 0.05, 0.05, 0.02, wood, x + 0.24, y + 0.84, z));
    const l = dot(0.24, LAMP, x + 0.46, y + 0.55, z, 1.2);
    l.castShadow = false;
    p.add(l);
    p.spot(x + 0.46, y + 0.55, z + 0.2, "#ffb56a", 14);
  }
}

function custom(p: Parts, c: CustomHome, g: Grow): void {
  const b = BODY[c.body];
  const h = b.h + (g.up ? 2.2 : 0);
  const d = c.body === "round" ? 4.3 : 4.2;
  const w = b.w;
  const cx = c.body === "long" ? w * 0.14 : 0;
  const colours: Colours = { wall: c.wall, roof: c.roofColor, trim: c.trim, door: c.doorColor };
  const look: WinOpts = { kind: c.window, shutters: c.shutters ? c.trim : undefined, box: c.boxes };
  if (g.side) {
    sideRoom(p, cx + w / 2 - 0.35, colours, look);
    if (c.texture !== "plain") wallTexture(p.sub(0, 0, -0.2, 0), c, cx + w / 2 + 1.4, 3, 2.4, 7);
  }
  p.add(rbox(w, h, d, b.r, soft(c.wall), cx, h / 2, -d / 2));
  if (c.texture !== "plain") wallTexture(p, c, cx, w - (c.body === "round" ? 1.4 : 0), h, Math.round(w * 10));
  const roof = customRoof(p, c, cx, w, d, h, -d / 2);
  if (c.chimney !== "none") {
    const u = 0.74;
    const x = cx + (u - 0.5) * w;
    const top = h + roof.at(u) + 0.9;
    if (c.chimney === "brick") chimney(p, x, h, top, -d / 2 - 0.6);
    else stovepipe(p, x, h, top, -d / 2 - 0.6);
  }
  if (c.roof === "gable" || c.roof === "steep") win(p, cx, h + 0.8, 0.5, 0.68, 0.68, { kind: "round" });

  const ww = c.body === "tall" ? 0.8 : 0.95;
  const wh = c.window === "round" ? 0.95 : 1.1;
  const row = (y: number, ground: boolean) => {
    if (c.body === "long") {
      for (const x of [-w / 2 + 0.95, w * 0.08, w / 2 - 0.95]) win(p, cx + x, y, 0, ww, wh, look);
      if (!ground) win(p, 0, y, 0, ww, wh, look);
    } else {
      const off = c.body === "round" ? 1.35 : c.body === "tall" ? 1.33 : w / 2 - 0.85;
      for (const s of [-1, 1]) win(p, s * off, y, 0, ww, wh, look);
    }
  };
  row(1.95, true);
  if (g.up) row(4.2, false);
  if (c.body === "tall") for (const s of [-1, 1]) win(p, s * 1.33, g.up ? 6.2 : 4.1, 0, ww, wh, look);
  if (c.body === "round") win(p, 0, h - 1.1, 0, ww, wh, look);
  door(p, 0, 0, c.door === "double" ? 1.75 : 1.25, 2.1, c.doorColor, c.door as DoorKind);
  topper(p, c, roof.peak[0], roof.peak[1], -d / 2);
}

// --- Additions -----------------------------------------------------------------------------------

function porch(p: Parts, roofColor: string, z: number): void {
  const w = 3.5;
  const wood = soft("#c9a37a");
  const white = soft("#ffffff");
  p.add(pbox(w + 0.3, 0.2, 1.5, 0.08, wood, 0, 0.12, z + 0.75));
  for (const s of [-1, 1]) p.add(pbox(0.16, 2.5, 0.16, 0.05, white, s * (w / 2 - 0.1), 1.35, z + 1.35));
  const top = pbox(w + 0.6, 0.2, 1.95, 0.08, soft(roofColor, 0.7), 0, 2.72, z + 0.72);
  top.rotation.x = 0.24;
  p.add(top);
  const cap = pbox(w + 0.64, 0.12, 1.98, 0.06, snowMat(), 0, 2.87, z + 0.72);
  cap.rotation.x = 0.24;
  p.winter.add(cap);
  // A bench beside the door and a lantern hanging from the porch roof.
  const bench = soft("#9b6b43");
  p.add(pbox(0.95, 0.1, 0.36, 0.03, bench, 1.15, 0.72, z + 0.42), pbox(0.95, 0.34, 0.06, 0.03, bench, 1.15, 1.05, z + 0.27));
  for (const s of [-1, 1]) p.add(pbox(0.09, 0.5, 0.3, 0.02, soft("#7a5340"), 1.15 + s * 0.38, 0.45, z + 0.42));
  p.add(pipe(0.015, 0.015, 0.3, soft("#7a5a44"), -1.25, 2.42, z + 0.95, 5));
  const l = dot(0.2, LAMP, -1.25, 2.1, z + 0.95, 1.25);
  l.castShadow = false;
  p.add(l);
  p.spot(-1.25, 2.1, z + 1.1, "#ffb56a", 16);
}

function garden(p: Parts, x0: number): void {
  const w = 3.35;
  const white = soft("#fffaf0");
  const z0 = 0.35;
  const z1 = 1.7;
  const soil = soft("#9b6b43");
  for (let r = 0; r < 3; r++) {
    const z = z0 + 0.22 + r * 0.38;
    const y = 0.07;
    p.add(pbox(w - 0.5, 0.14, 0.28, 0.06, soil, x0 + w / 2, y, z));
    p.winter.add(pbox(w - 0.42, 0.14, 0.34, 0.06, snowMat(), x0 + w / 2, y + 0.1, z));
    const col = ["#8fcc76", "#f6d36a", "#f08a6a"][r];
    for (let i = 0; i < 6; i++) {
      const x = x0 + 0.42 + i * 0.5;
      p.summer.add(dot(0.11, soft("#6db35f"), x, 0.2, z, 0.8), dot(0.075, soft(col), x, 0.3, z + 0.02));
    }
  }
  for (let x = 0; x <= w + 0.01; x += 0.43) {
    p.add(pbox(0.14, 0.72, 0.07, 0.04, white, x0 + x, 0.36, z1));
    p.winter.add(dot(0.12, snowMat(), x0 + x, 0.74, z1, 0.6));
  }
  for (const s of [0, 1]) p.add(pbox(0.14, 0.72, 0.07, 0.04, white, x0 + s * w, 0.36, z0 - 0.05));
  for (const y of [0.24, 0.52]) {
    p.add(pbox(w + 0.14, 0.07, 0.05, 0.02, white, x0 + w / 2, y, z1 + 0.04));
    for (const s of [0, 1]) p.add(pbox(0.05, 0.07, z1 - z0 + 0.05, 0.02, white, x0 + s * w, y, (z0 + z1) / 2));
  }
  // The watering can.
  const can = soft("#7fc4dc");
  p.summer.add(pipe(0.17, 0.2, 0.34, can, x0 + w - 0.42, 0.18, z0 + 0.0, 12));
  const spout = pipe(0.035, 0.05, 0.42, can, x0 + w - 0.2, 0.28, z0, 6);
  spout.rotation.z = -0.9;
  p.summer.add(spout);
}

/** A home from what the player chose, with snow on it if `snow`. See the top of this file for its origin. */
export function buildHome(home: HomeChoice, snow: boolean): THREE.Group {
  const p = new Parts();
  const g: Grow = { up: hasAddition(home, "up"), side: hasAddition(home, "side"), porch: hasAddition(home, "porch"), garden: hasAddition(home, "garden") };
  const c: Colours = home.kind === "custom"
    ? { wall: home.custom.wall, roof: home.custom.roofColor, trim: home.custom.trim, door: home.custom.doorColor }
    : PAINTS[home.paint];
  if (home.kind === "custom") custom(p, home.custom, g);
  else if (home.style === "mushroom") mushroom(p, g, c);
  else if (home.style === "burrow") burrow(p, g, c);
  else if (home.style === "tower") tower(p, g, c);
  else cottage(p, g, c);
  const front = home.kind === "style" && home.style === "burrow" ? 0.45 : 0;
  if (g.porch) porch(p, c.roof, front);
  if (g.garden) garden(p, g.porch ? 2.15 : 1.0);

  const lights = p.spots.map((s) => ({ pos: markPos(s), color: s.color, power: s.power }));
  const smokes = p.smokes.map(markPos);
  lights.push({ pos: [0, 2.2, 1], color: "#ffc98a", power: 14 });
  const out = new THREE.Group();
  out.add(bake(p.base), bake(snow ? p.winter : p.summer));
  out.userData.marks = { lights, smokes } satisfies HomeMarks;
  return out;
}

/** Free a home's geometry once it's been replaced. Materials are shared and stay. */
export function disposeHome(g: THREE.Group): void {
  g.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
}
