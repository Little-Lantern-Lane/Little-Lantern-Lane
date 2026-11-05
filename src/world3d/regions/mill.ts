// The Mill Race and Mae's Tea Room. Outdoors the river runs behind the path, where the camera can
// see it, and the wheel turns in it. The mill's end wall stands across the path with a cart arch
// through it; past that is the old mill office, a doll's-house room open toward the camera.

import * as THREE from "three";
import { MILL_PATH, GROUND_Y, PROPS, USABLES } from "../../game/layout";
import type { WorldState } from "../../logic/world";
import {
  ball, BLOCK, boardCanvas, cyl, drift, flat, flow, glowing, groundFrom, isEvening, lantern, LANTERN_COLOURS, many, noShadow, own, paint, rbox, seeded, setLit, soft, steam, stoneWall, teacup, teapot, tree, waterSheet, type Lit, type Piece,
} from "../kit";
import { regionZ, worldX as X } from "../space";
import { woodsPost } from "./village";
import type { Blocker, LightSpot, RegionKit } from "../types";

const WOOD = "#9b6b43";
const WOOD_DARK = "#7a5340";
const WOOD_LIGHT = "#c98a5e";
const AUTUMN = ["#e0a040", "#d9783c", "#c9553c", "#d9b84a"];
const STONE = ["#cfc2b0", "#c6b8a4", "#d8ccba"];
const PALE_STONE = ["#e6dccb", "#ddd2bf", "#ece3d4"];

const WHEEL_X = 8760;
const WHEEL_Y = 2.4;
const WHEEL_R = 2.72;
const WHEEL_Z = -6.5;
const WATER_Y = -0.34;
const BANK_Z = -4.1;
/** The mill's end wall, across the path. The room starts on its far side. */
const WALL_X = 8992;
const WALL_T = 0.8;
const BACK = -3.4;
const FRONT = 3.4;
const H = 9;
/** The cart arch spans the whole of the room's walking width. */
const ARCH_Z0 = -2.75;
const ARCH_Z1 = 2.55;
const ARCH_H = 4.1;
const TABLE_Z = -2.2;
const TABLE_TOP = 1.1;

function pathCanvas(w: number, d: number): HTMLCanvasElement {
  const px = 28;
  const c = document.createElement("canvas");
  c.width = Math.round(w * px);
  c.height = Math.round(d * px);
  const g = c.getContext("2d")!;
  const r = seeded(61);
  g.fillStyle = "#a9b86a";
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = r() < 0.5 ? "rgba(190,205,120,.2)" : "rgba(120,140,70,.16)";
    g.beginPath();
    g.ellipse(r() * c.width, r() * c.height, 18 + r() * 50, 8 + r() * 20, 0, 0, 7);
    g.fill();
  }
  // Packed earth along the middle, with a soft wandering edge.
  const edge = (x: number, side: number) => (side < 0 ? 0.2 : 0.8) * c.height + Math.sin(x / 90 + side) * 10;
  g.fillStyle = "#e2c08e";
  g.beginPath();
  g.moveTo(0, edge(0, -1));
  for (let x = 0; x <= c.width; x += 20) g.lineTo(x, edge(x, -1));
  for (let x = c.width; x >= 0; x -= 20) g.lineTo(x, edge(x, 1));
  g.fill();
  for (let i = 0; i < 90; i++) {
    g.fillStyle = "rgba(214,176,126,.75)";
    g.beginPath();
    g.ellipse(r() * c.width, c.height * (0.24 + r() * 0.52), 14 + r() * 26, 4 + r() * 4, 0, 0, 7);
    g.fill();
  }
  // Fallen leaves.
  for (let i = 0; i < 240; i++) {
    g.fillStyle = AUTUMN[i % 4];
    g.save();
    g.translate(r() * c.width, r() * c.height);
    g.rotate(r() * 3);
    g.beginPath();
    g.ellipse(0, 0, 6, 3.5, 0, 0, 7);
    g.fill();
    g.restore();
  }
  return c;
}

function maeBoard(): THREE.CanvasTexture {
  return paint(512, 224, (c) => {
    c.fillStyle = "#7fa79a";
    c.beginPath();
    c.roundRect(0, 0, 512, 224, 90);
    c.fill();
    c.strokeStyle = "#fff1d6";
    c.lineWidth = 9;
    c.globalAlpha = 0.8;
    c.beginPath();
    c.roundRect(20, 20, 472, 184, 70);
    c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = "#fff6e6";
    c.font = "bold 104px Trebuchet MS, Verdana, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("MAE'S", 215, 118);
    // A little teacup with steam.
    c.fillStyle = "#f6d36a";
    c.beginPath();
    c.moveTo(372, 104);
    c.lineTo(444, 104);
    c.lineTo(432, 152);
    c.lineTo(384, 152);
    c.fill();
    c.strokeStyle = "#f6d36a";
    c.lineWidth = 9;
    c.beginPath();
    c.arc(446, 124, 15, -1.4, 1.6);
    c.stroke();
    c.strokeStyle = "#fff6e6";
    c.lineWidth = 7;
    c.lineCap = "round";
    for (const x of [396, 420]) {
      c.beginPath();
      c.moveTo(x, 92);
      c.quadraticCurveTo(x - 12, 76, x, 60);
      c.stroke();
    }
  });
}

/** The painted board on its own: a thick rounded slab with the picture on the front. */
function signBoard(t: THREE.Texture, w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  g.add(rbox(w, h, 0.14, h * 0.38, soft("#6a9186")));
  g.add(flat(t, w * 0.985, h * 0.97, 0, 0, 0.074, true));
  return g;
}

function chalkTexture(lines: { t: string; size: number; y: number; col?: string }[], heart: boolean): THREE.CanvasTexture {
  return paint(256, 320, (c) => {
    c.fillStyle = "#3f4a46";
    c.fillRect(0, 0, 256, 320);
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (const l of lines) {
      c.fillStyle = l.col ?? "#f6f2ea";
      c.font = `bold ${l.size}px Trebuchet MS, Verdana, sans-serif`;
      c.fillText(l.t, 128, l.y, 228);
    }
    if (heart) {
      c.fillStyle = "#e98fb4";
      c.beginPath();
      c.moveTo(128, 296);
      c.bezierCurveTo(90, 268, 108, 240, 128, 258);
      c.bezierCurveTo(148, 240, 166, 268, 128, 296);
      c.fill();
    }
  });
}

/** An A-frame chalkboard, feet on y = 0. */
function aFrame(t: THREE.Texture): THREE.Group {
  const g = new THREE.Group();
  const tilt = -0.14;
  const face = new THREE.Group();
  face.rotation.x = tilt;
  face.position.y = 1.02;
  face.add(rbox(1.54, 2, 0.1, 0.06, soft(WOOD_LIGHT)), flat(t, 1.3, 1.72, 0, 0.02, 0.056));
  for (const d of [-0.8, 0.8]) face.add(rbox(0.12, 2.1, 0.12, 0.05, soft(WOOD), d, 0, 0));
  const back = rbox(1.5, 1.96, 0.08, 0.05, soft(WOOD_DARK), 0, 1.02, -0.3);
  back.rotation.x = -tilt;
  g.add(face, back);
  return g;
}

/** A round café table, feet on y = 0. */
function cafeTable(col: string): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.9, 0.9, 0.14, soft(col), 0, TABLE_TOP - 0.07, 0, 28));
  g.add(cyl(0.1, 0.13, TABLE_TOP - 0.14, soft(WOOD_DARK), 0, (TABLE_TOP - 0.14) / 2, 0, 12), cyl(0.46, 0.52, 0.1, soft(WOOD_DARK), 0, 0.05, 0, 20));
  return g;
}

/** A chair facing +X before it's turned. Every chair in the tea room is a different one. */
function chair(col: string, style: number): THREE.Group {
  const g = new THREE.Group();
  const m = soft(col);
  g.add(rbox(0.74, 0.12, 0.74, 0.05, m, 0, 0.72, 0));
  for (const a of [-0.28, 0.28]) for (const b of [-0.28, 0.28]) g.add(rbox(0.09, 0.68, 0.09, 0.03, soft(WOOD_DARK), a, 0.34, b));
  if (style === 0) g.add(rbox(0.1, 0.8, 0.7, 0.05, m, -0.33, 1.16, 0));
  else if (style === 1) for (const b of [-0.27, 0, 0.27]) g.add(rbox(0.08, 0.8, 0.09, 0.03, m, -0.33, 1.14, b)), g.add(rbox(0.1, 0.12, 0.76, 0.04, m, -0.33, 1.54, 0));
  else {
    const round = ball(0.44, m, -0.33, 1.3, 0);
    round.scale.x = 0.16;
    g.add(round, rbox(0.08, 0.3, 0.2, 0.03, m, -0.33, 0.88, 0));
  }
  return g;
}

/** The waterwheel, axle at the origin, facing the camera. */
function buildWheel(): THREE.Group {
  const g = new THREE.Group();
  const wood = soft(WOOD);
  const dark = soft(WOOD_DARK);
  for (const z of [-0.5, 0.5]) {
    for (const [r, t, m] of [[2.26, 0.15, dark], [1.6, 0.08, wood]] as const) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 44), m);
      ring.position.z = z;
      ring.castShadow = true;
      g.add(ring);
    }
    for (let i = 0; i < 4; i++) {
      const s = rbox(4.5, 0.17, 0.12, 0.05, wood, 0, 0, z);
      s.rotation.z = (i / 4) * Math.PI;
      g.add(s);
    }
  }
  const paddles: Piece[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    paddles.push({ x: Math.cos(a) * 2.42, y: Math.sin(a) * 2.42, z: 0, sx: 0.62, sy: 0.14, sz: 1.2, rz: a, color: i % 2 ? WOOD : "#a8784f" });
  }
  g.add(many(BLOCK, paddles));
  const hub = cyl(0.46, 0.46, 1.3, dark, 0, 0, 0, 20);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  return g;
}

/** The old cog, kept on the back wall. */
function cog(r: number): THREE.Mesh {
  const teeth = 20;
  const s = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const w = (Math.PI * 2) / teeth / 4;
    const pts: [number, number][] = [[a - w * 1.5, r], [a - w * 0.7, r * 1.16], [a + w * 0.7, r * 1.16], [a + w * 1.5, r]];
    pts.forEach(([t, d], k) => (i === 0 && k === 0 ? s.moveTo(Math.cos(t) * d, Math.sin(t) * d) : s.lineTo(Math.cos(t) * d, Math.sin(t) * d)));
  }
  s.closePath();
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 + 0.16;
    const a1 = ((i + 1) / 6) * Math.PI * 2 - 0.16;
    const h = new THREE.Path();
    h.absarc(0, 0, r * 0.8, a0, a1, false);
    h.absarc(0, 0, r * 0.32, a1, a0, true);
    h.closePath();
    s.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3, curveSegments: 12 });
  const m = new THREE.Mesh(geo, soft("#8a7a6a", 0.6));
  m.castShadow = true;
  return m;
}

/** The mill's end wall with the cart arch through it, facing -X before it's turned. */
function endWall(): THREE.Mesh {
  const w = FRONT + 0.2 - BACK;
  const s = new THREE.Shape();
  s.moveTo(0, -1);
  s.lineTo(ARCH_Z0 - BACK, -1);
  s.lineTo(ARCH_Z0 - BACK, ARCH_H - 1.1);
  s.quadraticCurveTo(ARCH_Z0 - BACK + 0.2, ARCH_H, (ARCH_Z0 + ARCH_Z1) / 2 - BACK, ARCH_H);
  s.quadraticCurveTo(ARCH_Z1 - BACK - 0.2, ARCH_H, ARCH_Z1 - BACK, ARCH_H - 1.1);
  s.lineTo(ARCH_Z1 - BACK, -1);
  s.lineTo(w, -1);
  s.lineTo(w, H);
  s.lineTo(0, H);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: WALL_T, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 14 });
  const m = new THREE.Mesh(geo, soft("#d6cab8"));
  m.rotation.y = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

function teaWall(w: number): THREE.CanvasTexture {
  const px = 36;
  return paint(w * px, H * px, (c) => {
    const r = seeded(83);
    c.fillStyle = "#efdcc0";
    c.fillRect(0, 0, w * px, H * px);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = "rgba(227,204,170,.6)";
      c.beginPath();
      c.ellipse(r() * w * px, r() * H * px, 30 + r() * 60, 10 + r() * 22, 0, 0, 7);
      c.fill();
    }
  });
}

function riverView(): THREE.CanvasTexture {
  return paint(384, 384, (c) => {
    const sky = c.createLinearGradient(0, 0, 0, 220);
    sky.addColorStop(0, "#cfeaf4");
    sky.addColorStop(1, "#f6e4b6");
    c.fillStyle = sky;
    c.fillRect(0, 0, 384, 220);
    c.fillStyle = "#7fbfd6";
    c.fillRect(0, 214, 384, 170);
    c.fillStyle = "#d9c98a";
    c.beginPath();
    c.moveTo(0, 214);
    c.quadraticCurveTo(100, 176, 190, 200);
    c.quadraticCurveTo(290, 170, 384, 206);
    c.lineTo(384, 230);
    c.lineTo(0, 230);
    c.fill();
    for (const [x, y, r, col] of [[70, 170, 34, "#e98a3c"], [300, 160, 40, "#f2b54a"]] as const) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, r, 0, 7);
      c.fill();
    }
    c.strokeStyle = "rgba(255,255,255,.65)";
    c.lineWidth = 5;
    c.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const x = 40 + i * 46;
      const y = 262 + (i % 3) * 36;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 20, y - 8, x + 40, y);
      c.stroke();
    }
  });
}

/** A shape with an arched top, for the river window. */
function archShape(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h - w * 0.42);
  s.quadraticCurveTo(-w / 2, h, 0, h);
  s.quadraticCurveTo(w / 2, h, w / 2, h - w * 0.42);
  s.lineTo(w / 2, 0);
  s.closePath();
  return s;
}

export function buildMill(): RegionKit {
  const Z = regionZ(9000);
  const group = new THREE.Group();
  const g = new THREE.Group();
  g.position.z = Z;
  group.add(g);
  const props: Record<string, THREE.Object3D> = {};
  const lit: Lit[] = [];
  const puffs: THREE.Object3D[] = [];

  const wallX = X(WALL_X);
  const roomX0 = wallX + WALL_T;
  const roomX1 = X(10400);
  const roomMid = (roomX0 + roomX1) / 2;
  const roomW = roomX1 - roomX0;

  // --- Outdoors: the path, the bank, the river --------------------------------------------------
  const left = X(7200);
  const pathW = wallX - left + 0.1;
  const ground = groundFrom(pathCanvas(pathW, 10), pathW, 10);
  ground.position.set(left + pathW / 2, 0, 0.9);
  g.add(ground);
  // Grass carries on along the foot of the mill, in front of the open room.
  const verge = noShadow(rbox(roomX1 - wallX + 16, 0.6, 12, 0.1, soft("#a9b86a"), wallX + (roomX1 - wallX + 16) / 2, -0.62, FRONT + 6.2));
  g.add(verge);
  const near = rbox(pathW, 0.7, 0.5, 0.14, soft("#b3a594"), left + pathW / 2, -0.32, BANK_Z + 0.04);
  g.add(noShadow(near));

  const river = waterSheet(90, 26, "#6fb0cc", "#a8dcec", [11, 3.2]);
  river.position.set(left + 44, WATER_Y, BANK_Z - 13);
  g.add(river);

  // The far bank and the hills beyond it.
  const farZ = -14;
  const far = new THREE.Mesh(new THREE.PlaneGeometry(130, 110), soft("#9cb56c"));
  far.rotation.x = -Math.PI / 2;
  far.position.set(left + 44, 0.05, farZ - 55);
  far.receiveShadow = true;
  g.add(far, noShadow(rbox(100, 0.8, 0.6, 0.2, soft("#b3a97c"), left + 44, -0.2, farZ + 0.2)));
  for (const [x, z, rx, ry, c] of [[150, -52, 30, 11, "#8fae78"], [186, -60, 34, 14, "#7fa374"], [126, -46, 22, 8, "#9cb97e"]] as const) {
    const hill = ball(1, soft(c), x, -1, z);
    hill.scale.set(rx, ry, 12);
    g.add(noShadow(hill));
  }
  const r = seeded(19);
  for (let i = 0; i < 15; i++) {
    const t = tree(1.25 + r() * 0.6, AUTUMN[i % 4], "#7c5a42");
    t.position.set(left + 4 + i * 3.6 + r() * 1.4, 0, farZ - 1.5 - r() * 7);
    g.add(t);
  }

  // Reeds and cattails at the water's edge.
  const reeds: Piece[] = [];
  const heads: Piece[] = [];
  for (const rx of [8040, 8066, 8300, 8322, 8560, 8584, 8690, 8820]) {
    for (let i = 0; i < 3; i++) {
      const x = X(rx) + (i - 1) * 0.16;
      const h = 1.1 + r() * 0.6;
      const lean = (r() - 0.5) * 0.24;
      reeds.push({ x, y: WATER_Y + h / 2, z: BANK_Z - 0.32, sx: 0.06, sy: h, sz: 0.06, rz: lean, color: "#8fae6a" });
      if (i !== 1) heads.push({ x: x - Math.sin(lean) * h * 0.5, y: WATER_Y + h, z: BANK_Z - 0.32, sx: 0.12, sy: 0.36, sz: 0.12, rz: lean, color: "#7a5340" });
    }
  }
  g.add(many(BLOCK, [...reeds, ...heads]));

  // --- The wheel, its stone housing and the flume that feeds it ----------------------------------
  const hx0 = X(8590);
  const housing = stoneWall(wallX - hx0 + 0.2, 6.9, STONE, "#b3a594", 67);
  housing.position.set((hx0 + wallX) / 2, WATER_Y, -8.5);
  g.add(housing);
  const lean = noShadow(rbox(wallX - hx0 + 1.2, 0.34, 2.8, 0.1, soft("#7a8a96"), (hx0 + wallX) / 2, 6.95, -8.2));
  lean.rotation.x = 0.26;
  g.add(lean);
  // The mill's side, running back from the end wall.
  const side = stoneWall(5.2, 9, PALE_STONE, "#c4b8a6", 73);
  side.rotation.y = -Math.PI / 2;
  side.position.set(wallX, WATER_Y, -6);
  g.add(side);

  const wx = X(WHEEL_X);
  const wheel = buildWheel();
  wheel.position.set(wx, WHEEL_Y, WHEEL_Z);
  g.add(wheel);
  const axle = cyl(0.17, 0.17, 2.2, soft("#4a4250", 0.5), wx, WHEEL_Y, WHEEL_Z - 1, 12);
  axle.rotation.x = Math.PI / 2;
  g.add(axle, rbox(1.3, 1.3, 0.3, 0.14, soft("#a89a88"), wx, WHEEL_Y, -8.2));

  const fy = WHEEL_Y + WHEEL_R + 0.62;
  const fx0 = X(8350);
  const fx1 = wx - 0.72;
  g.add(rbox(fx1 - fx0, 0.3, 1, 0.08, soft(WOOD), (fx0 + fx1) / 2, fy, WHEEL_Z));
  for (const d of [-0.46, 0.46]) g.add(rbox(fx1 - fx0, 0.34, 0.1, 0.04, soft(WOOD_DARK), (fx0 + fx1) / 2, fy + 0.2, WHEEL_Z + d));
  const flumeWater = own("#8fd0e6", { roughness: 0.25, emissive: "#4f9fc0", emissiveIntensity: 0.2 });
  g.add(rbox(fx1 - fx0 + 0.1, 0.1, 0.8, 0.04, flumeWater, (fx0 + fx1) / 2, fy + 0.18, WHEEL_Z));
  for (const lx of [8470, 8600]) {
    const x = X(lx);
    for (const d of [-0.42, 0.42]) g.add(rbox(0.2, fy - WATER_Y, 0.2, 0.06, soft(WOOD_DARK), x, (fy + WATER_Y) / 2, WHEEL_Z + d));
    g.add(rbox(0.16, 0.16, 1.1, 0.05, soft(WOOD_DARK), x, fy * 0.5, WHEEL_Z));
  }
  // Upstream, the flume comes out of a stone header standing in the river.
  g.add(rbox(1.9, fy - WATER_Y + 0.5, 2, 0.2, soft("#b3a594"), fx0 - 0.5, (fy + WATER_Y + 0.5) / 2, WHEEL_Z), rbox(2.2, 0.24, 2.3, 0.1, soft("#d8ccba"), fx0 - 0.5, fy + 0.54, WHEEL_Z));
  // Water spilling over the end of the flume onto the top of the wheel.
  const spill = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(fx1 - 0.1, fy + 0.2, WHEEL_Z), new THREE.Vector3(fx1 + 0.42, fy + 0.2, WHEEL_Z), new THREE.Vector3(fx1 + 0.56, fy - 0.8, WHEEL_Z)), 12, 0.26, 8),
    new THREE.MeshStandardMaterial({ color: "#bfeaf6", emissive: "#6fb8d6", emissiveIntensity: 0.3, roughness: 0.2 }),
  );
  g.add(spill);
  const foam: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const f = ball(0.2 + (i % 3) * 0.08, soft("#ffffff", 0.5), wx - 1.5 + i * 0.5, WATER_Y + 0.02, WHEEL_Z + 1 + (i % 2) * 0.3, 0.5);
    f.castShadow = false;
    foam.push(f);
    g.add(f);
  }

  // The post at the village end of the lantern string, and the string itself.
  const postX = X(8100);
  const stringZ = -3.3;
  g.add(cyl(0.11, 0.15, 5.4, soft("#b98a5e"), postX, 2.7, stringZ, 12), ball(0.16, soft(WOOD), postX, 5.4, stringZ));
  const strung = new THREE.Group();
  const endX = wallX - 0.1;
  const yAt = (u: number) => 5.2 * (1 - u) + 5.95 * u - 3.3 * u * (1 - u) * (1 - u);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    pts.push(new THREE.Vector3(postX + (endX - postX) * u, yAt(u), stringZ));
  }
  strung.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.024, 6), soft("#8a6a52")));
  const stringGlow: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const u = 0.04 + (i / 9) * 0.63;
    const col = LANTERN_COLOURS[i % LANTERN_COLOURS.length];
    const m = glowing(col, 0.1);
    lit.push({ m, day: 0.12, night: 1 });
    const l = lantern(m);
    const x = postX + (endX - postX) * u;
    const y = yAt(u);
    l.position.set(x, y, stringZ);
    strung.add(l);
    stringGlow.push({ x, y });
  }
  g.add(strung);
  props.mill_lanterns = strung;

  // --- The mill's end wall and hanging sign ------------------------------------------------------
  const end = endWall();
  end.position.set(wallX + WALL_T, 0, BACK);
  g.add(noShadow(end));
  const onOutside = stoneWall(FRONT + 0.2 - BACK, H, PALE_STONE, "#d6cab8", 41, (x, y) => {
    const z = x + (BACK + FRONT + 0.2) / 2;
    return z > ARCH_Z0 - 0.12 && z < ARCH_Z1 + 0.12 && y < ARCH_H + 0.12;
  });
  onOutside.children[0].visible = false;
  onOutside.rotation.y = -Math.PI / 2;
  onOutside.position.set(wallX - 0.03, 0, (BACK + FRONT + 0.2) / 2);
  g.add(onOutside);
  const threshold = rbox(WALL_T + 0.5, 0.05, ARCH_Z1 - ARCH_Z0, 0.02, soft("#b3a594"), wallX + WALL_T / 2, 0.02, (ARCH_Z0 + ARCH_Z1) / 2);
  g.add(noShadow(threshold));

  const signZ = -1.1;
  const iron = soft("#4a4250", 0.55);
  g.add(rbox(2.5, 0.14, 0.14, 0.05, iron, wallX - 1.2, 4.9, signZ));
  const scroll = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 18, Math.PI * 1.1), iron);
  scroll.position.set(wallX - 0.46, 4.46, signZ);
  scroll.rotation.z = Math.PI * 0.9;
  g.add(scroll);

  const board = maeBoard();
  const up = new THREE.Group();
  // Hung clear of the wall: a little nearer the path than its spot in the story's numbers.
  const sx = wallX - 1.32;
  const sy = (GROUND_Y - PROPS.sign_up.y) / 55;
  up.position.set(sx, sy - 0.2, signZ);
  up.add(signBoard(board, 2.3, 1.02));
  for (const d of [-0.74, 0.74]) g.add(ball(0.07, iron, sx + d, 4.8, signZ));
  for (const d of [-0.74, 0.74]) for (let i = 0; i < 4; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 10), iron);
    link.scale.y = 1.5;
    link.rotation.y = i % 2 ? Math.PI / 2 : 0;
    link.position.set(d, 0.58 + i * 0.13, 0);
    up.add(link);
  }
  g.add(up);
  props.sign_up = up;

  // Waiting to go up: propped against a crate by the wall.
  const down = new THREE.Group();
  down.position.set(X(PROPS.sign_down.x), 0, -2.9);
  const lying = signBoard(board, 2, 0.9);
  lying.position.y = 0.46;
  lying.rotation.set(-0.3, 0, -0.08);
  down.add(lying, rbox(0.9, 0.56, 0.5, 0.06, soft(WOOD_LIGHT), 0.3, 0.28, -0.42));
  g.add(down);
  props.sign_down = down;

  // --- Mae's Tea Room ----------------------------------------------------------------------------
  const floor = boardCanvas(roomW + 1, FRONT - BACK, ["#b98a5e", "#b48458", "#be9064"], "#94693f", 101);
  const f = groundFrom(floor, roomW + 1, FRONT - BACK);
  f.position.set(roomMid - 0.5, 0.004, (BACK + FRONT) / 2);
  g.add(f);
  g.add(noShadow(rbox(roomW + 1.6, 1.3, 0.5, 0.1, soft("#a89a88"), roomMid, -0.66, FRONT + 0.1)));
  g.add(noShadow(rbox(roomW + 1.6, 1.2, FRONT - BACK, 0.08, soft("#6b4a36"), roomMid, -0.62, (BACK + FRONT) / 2)));
  g.add(noShadow(flat(teaWall(roomW), roomW, H, roomMid, H / 2, BACK)));
  const eastEnd = noShadow(rbox(0.7, H + 1, FRONT - BACK + 0.4, 0.12, soft("#d6cab8"), roomX1 + 0.35, H / 2 - 0.5, (BACK + FRONT) / 2));
  g.add(eastEnd);

  // Stone below, timber rail, posts and braces, the big beam at the top.
  const wainscot = stoneWall(roomW, 2.7, PALE_STONE, "#b3a594", 89, (x, y) => Math.abs(x - (X(9200) - roomMid)) < 1.9 && y > 2.2);
  wainscot.position.set(roomMid, 0, BACK + 0.04);
  g.add(wainscot);
  g.add(noShadow(rbox(roomW, 0.24, 0.3, 0.08, soft(WOOD), roomMid, 2.86, BACK + 0.15)));
  for (const px of [9350, 9830, 10236]) {
    g.add(noShadow(rbox(0.46, 4, 0.26, 0.08, soft(WOOD), X(px), 4.9, BACK + 0.13)));
    for (const d of [-1, 1]) {
      if (px === 10236 ? d > 0 : d < 0) continue;
      const brace = noShadow(rbox(1.5, 0.22, 0.18, 0.05, soft(WOOD), X(px) + d * 0.72, 6.1, BACK + 0.1));
      brace.rotation.z = d * 0.68;
      g.add(brace);
    }
  }
  g.add(noShadow(rbox(roomW, 0.86, 0.5, 0.12, soft("#8a5a3a"), roomMid, 7.1, BACK + 0.25)));
  const office = paint(512, 80, (c) => {
    c.fillStyle = "rgba(246,230,200,.42)";
    c.font = "bold 58px Trebuchet MS, Verdana, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("M I L L   O F F I C E", 256, 44, 500);
    c.globalCompositeOperation = "destination-out";
    c.fillRect(70, 40, 34, 18);
    c.fillRect(350, 14, 26, 20);
  });
  g.add(flat(office, 4.6, 0.72, X(9220), 7.1, BACK + 0.52, true));

  // The window over the river, with the wheel going round beyond it.
  const winX = X(9200);
  const winY = 2.5;
  const frameS = archShape(3.5, 3.6);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameS, { depth: 0.12, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 16 }), soft("#c4b8a6"));
  frame.position.set(winX, winY - 0.04, BACK + 0.02);
  g.add(noShadow(frame));
  const glassS = archShape(3.06, 3.3);
  const glassGeo = new THREE.ShapeGeometry(glassS, 16);
  const uv = glassGeo.attributes.uv as THREE.BufferAttribute;
  const pos = glassGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 3.06 + 0.5, pos.getY(i) / 3.3);
  const view = new THREE.MeshStandardMaterial({ map: riverView(), emissive: "#ffffff", roughness: 1 });
  view.emissiveMap = view.map;
  view.emissiveIntensity = 0.7;
  const glass = new THREE.Mesh(glassGeo, view);
  glass.position.set(winX, winY + 0.1, BACK + 0.22);
  g.add(glass);
  const smallWheel = new THREE.Group();
  smallWheel.position.set(winX + 0.84, winY + 1, BACK + 0.24);
  const dim = soft(WOOD_DARK);
  smallWheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 8, 26), dim));
  for (let i = 0; i < 3; i++) {
    const s = rbox(0.9, 0.05, 0.03, 0.01, dim);
    s.rotation.z = (i / 3) * Math.PI;
    smallWheel.add(s);
  }
  noShadow(smallWheel);
  g.add(smallWheel);
  g.add(rbox(0.1, 3.3, 0.08, 0.03, soft(WOOD_DARK), winX, winY + 1.75, BACK + 0.29), rbox(3.06, 0.1, 0.08, 0.03, soft(WOOD_DARK), winX, winY + 1.5, BACK + 0.29));
  g.add(rbox(3.7, 0.2, 0.6, 0.08, soft("#d6cab8"), winX, winY, BACK + 0.32));
  g.add(cyl(0.2, 0.15, 0.24, soft("#7fb0c9"), winX - 0.2, winY + 0.22, BACK + 0.34, 12), ball(0.28, soft("#8fae6a"), winX - 0.2, winY + 0.52, BACK + 0.34, 0.9));

  // The old cog from the mill's works, and dried flowers by the chalkboard spot.
  const gear = cog(1.3);
  gear.position.set(X(10040), 4.95, BACK + 0.04);
  g.add(noShadow(gear));
  g.add(noShadow(cyl(0.3, 0.3, 0.24, soft("#7a6a5c"), X(10040), 4.95, BACK + 0.24, 18)));
  (g.children[g.children.length - 1] as THREE.Mesh).rotation.x = Math.PI / 2;
  const fx = X(10300);
  for (const [dx, c] of [[-0.24, "#e98fb4"], [0, "#f6d36a"], [0.24, "#c97b6a"]] as const) {
    const st = rbox(0.05, 1.1, 0.05, 0.02, soft("#8fae6a"), fx + dx * 0.5, 4.7, BACK + 0.14);
    st.rotation.z = -dx * 0.8;
    g.add(st, ball(0.15, soft(c), fx + dx, 4.2, BACK + 0.16));
  }

  // The shelf of forty cups behind the counter: four rows of ten, every one different.
  const CUPS = ["#f6efe2", "#7fc4dc", "#e98fb4", "#f6d36a", "#8fcc76", "#f08a6a", "#b986c9", "#e3ecf7", "#c97b6a", "#6fa7c9", "#fde6a8", "#a8d8c8"];
  const cupX = X(9660);
  g.add(rbox(5.4, 3.5, 0.14, 0.12, soft("#c99a6c"), cupX, 4.75, BACK + 0.08), rbox(5.1, 3.2, 0.06, 0.08, soft("#d9ac7c"), cupX, 4.75, BACK + 0.17));
  const cr = seeded(40);
  const bodies: Piece[] = [];
  const handles: Piece[] = [];
  for (let row = 0; row < 4; row++) {
    const y = 3.34 + row * 0.8;
    g.add(rbox(5.2, 0.09, 0.42, 0.03, soft(WOOD), cupX, y, BACK + 0.34));
    for (let k = 0; k < 10; k++) {
      const x = cupX - 2.28 + k * 0.5 + (row % 2) * 0.04;
      const s = 0.14 + cr() * 0.05;
      const h = 0.22 + cr() * 0.13;
      const color = CUPS[(row * 10 + k * 7) % CUPS.length];
      bodies.push({ x, y: y + 0.05 + h / 2, z: BACK + 0.38, sx: s, sy: h, sz: s, color });
      handles.push({ x: x + s + 0.02, y: y + 0.07 + h / 2, z: BACK + 0.38, sx: 0.07, sy: 0.08, sz: 0.07, color });
    }
  }
  g.add(many(new THREE.CylinderGeometry(1, 0.74, 1, 14), bodies, 0.5), many(new THREE.TorusGeometry(1, 0.32, 8, 12), handles, 0.5));

  // The counter, the big teapot, a cake under glass and a tin of tea.
  const counterX = X(9660);
  const counterZ = -2.5;
  const counterTop = 1.36;
  g.add(rbox(3.7, counterTop - 0.08, 1.1, 0.1, soft("#a8674a"), counterX, (counterTop - 0.08) / 2, counterZ), rbox(4.1, 0.18, 1.3, 0.07, soft(WOOD_LIGHT), counterX, counterTop - 0.03, counterZ));
  for (let i = 0; i < 4; i++) g.add(rbox(0.76, 1, 0.06, 0.08, soft("#b97a54"), counterX - 1.32 + i * 0.88, 0.62, counterZ + 0.56));
  const big = teapot(0.5, "#7fb0a0");
  big.position.set(counterX + 0.98, counterTop + 0.06, counterZ);
  const bigSteam = steam(4, 1.3);
  bigSteam.position.set(counterX + 1.72, counterTop + 0.78, counterZ);
  puffs.push(bigSteam);
  g.add(big, bigSteam);
  g.add(cyl(0.52, 0.42, 0.05, soft("#e3ecf7", 0.4), counterX - 1.1, counterTop + 0.08, counterZ, 22), cyl(0.34, 0.34, 0.32, soft("#f2c46a"), counterX - 1.1, counterTop + 0.26, counterZ, 20), cyl(0.35, 0.35, 0.07, soft("#fff1d6"), counterX - 1.1, counterTop + 0.44, counterZ, 20));
  const dome = ball(0.48, own("#e3f1fb", { transparent: true, opacity: 0.3, roughness: 0.15, depthWrite: false }), counterX - 1.1, counterTop + 0.1, counterZ, 1.3);
  dome.castShadow = false;
  g.add(dome, cyl(0.21, 0.21, 0.5, soft("#c94f6d"), counterX - 0.16, counterTop + 0.31, counterZ, 16), cyl(0.22, 0.22, 0.1, soft("#f6d36a"), counterX - 0.16, counterTop + 0.58, counterZ, 16));

  // Tables with chairs that don't match. The story's morning table sits under the window.
  const tables: [number, string, [number, string, number][]][] = [
    [9200, "#c98a5e", [[-1, "#7fb0c9", 1], [1, "#c97b6a", 0]]],
    [9420, "#c98a5e", [[1, "#e98fb4", 2]]],
    [9900, "#b98a5e", [[-1, "#f6d36a", 1], [1, "#7fb0c9", 0]]],
    [10120, "#d9a77c", [[-1, "#c97b6a", 2]]],
  ];
  g.add(woodsPost(X(MILL_PATH), -3.1));
  const blockers: Blocker[] = [];
  for (const [tx, col, chairs] of tables) {
    const t = cafeTable(col);
    t.position.set(X(tx), 0, TABLE_Z);
    g.add(t);
    blockers.push({ X: X(tx), Z: Z + TABLE_Z, r: 0.85 });
    for (const [d, c, style] of chairs) {
      const ch = chair(c, style);
      ch.position.set(X(tx) + d * 1.32, 0, TABLE_Z);
      if (d > 0) ch.rotation.y = Math.PI;
      g.add(ch);
      blockers.push({ X: X(tx) + d * 1.32, Z: Z + TABLE_Z, r: 0.4 });
    }
  }
  // A pot of fern on Nell's table, always.
  g.add(cyl(0.13, 0.1, 0.2, soft("#cfe3ec"), X(9200) - 0.1, TABLE_TOP + 0.1, TABLE_Z, 12), ball(0.2, soft("#8fae6a"), X(9200) - 0.1, TABLE_TOP + 0.34, TABLE_Z));

  // Opening day: every table with a pot on it, cups, and something to eat.
  const busy = new THREE.Group();
  const sets: [number, string, string[]][] = [[9420, "#e98fb4", ["#f6efe2", "#7fc4dc"]], [9900, "#f6d36a", ["#8fcc76", "#f6efe2", "#c97b6a"]], [10120, "#7fc4dc", ["#e98fb4", "#fde6a8"]]];
  for (const [tx, pot, cups] of sets) {
    const p = teapot(0.24, pot);
    p.position.set(X(tx) - 0.36, TABLE_TOP, TABLE_Z - 0.2);
    busy.add(p);
    cups.forEach((c, i) => {
      const cu = teacup(0.13, c);
      cu.position.set(X(tx) + 0.1 + i * 0.3, TABLE_TOP + 0.01, TABLE_Z + 0.26 - (i % 2) * 0.3);
      busy.add(cu);
    });
    busy.add(cyl(0.2, 0.15, 0.03, soft("#f6efe2", 0.4), X(tx) - 0.3, TABLE_TOP + 0.02, TABLE_Z + 0.42, 16), ball(0.1, soft("#d9984f"), X(tx) - 0.3, TABLE_TOP + 0.1, TABLE_Z + 0.42, 0.7));
    const puff = steam(3, 0.8);
    puff.position.set(X(tx) - 0.02, TABLE_TOP + 0.4, TABLE_Z - 0.2);
    puffs.push(puff);
    busy.add(puff);
  }
  g.add(busy);
  props.busy_tables = busy;

  // The chalkboard, either wording.
  const chalkX = X(USABLES.chalkboard.x);
  const openBoard = aFrame(chalkTexture([{ t: "OPEN", size: 76, y: 92 }, { t: "Lantern", size: 44, y: 182, col: "#f6d36a" }, { t: "tea", size: 44, y: 234, col: "#f6d36a" }], false));
  const satBoard = aFrame(chalkTexture([{ t: "OPEN", size: 50, y: 52 }, { t: "EVERY DAY", size: 36, y: 104 }, { t: "SATURDAYS:", size: 34, y: 170, col: "#f6d36a" }, { t: "TWO OF US", size: 34, y: 216, col: "#f6d36a" }], true));
  for (const b of [openBoard, satBoard]) {
    b.position.set(chalkX, 0, -2.5);
    b.rotation.y = -0.16;
    g.add(b);
  }
  props.chalk_open = openBoard;
  props.chalk_saturdays = satBoard;
  blockers.push({ X: chalkX, Z: Z - 2.6, r: 0.5 });

  // Pendant lamps, on all day: the old office is dim.
  const lampXs = [9420, 9900, 10120];
  const lamps: Lit[] = [];
  for (const lx of lampXs) {
    const x = X(lx);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.5, 0.44, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#7fa79a", roughness: 0.5, side: THREE.DoubleSide }));
    shade.position.set(x, 4.7, -1.2);
    const bulb = glowing("#ffe2a8", 1.8);
    g.add(cyl(0.015, 0.015, 5, soft("#4a4250"), x, 7.4, -1.2, 6), shade, ball(0.15, bulb, x, 4.56, -1.2));
    lamps.push({ m: bulb, day: 1.4, night: 2 });
  }

  // --- Lights ------------------------------------------------------------------------------------
  const party = (ws: WorldState) => ws.props.includes("mill_lanterns") && isEvening(ws);
  const lights: LightSpot[] = [
    ...lampXs.map((lx): LightSpot => ({ pos: [X(lx), 4.1, Z - 0.6], color: "#ffd9a0", power: 24, on: () => true })),
    { pos: [roomMid - 6.5, 4.8, Z + 0.4], color: "#ffdcb0", power: 14, on: () => true },
    ...[stringGlow[1], stringGlow[4], stringGlow[8]].map((s): LightSpot => ({ pos: [s.x, s.y - 0.5, Z - 2.6], color: "#ffbe78", power: 20, on: party })),
  ];

  blockers.push(
    // The counter stops short of where you stand to talk to Ash.
    ...[-1.45, 0, 1.45].map((d) => ({ X: counterX + d, Z: Z + counterZ, r: 0.72 })),
    // The piers either side of the arch.
    { X: wallX, Z: Z + FRONT - 0.15, r: 0.6 },
    { X: wallX + 0.5, Z: Z + FRONT - 0.15, r: 0.6 },
    { X: wallX, Z: Z + BACK - 0.05, r: 0.5 },
    { X: wallX + 0.5, Z: Z + BACK - 0.05, r: 0.5 },
  );

  const all = [...lit, ...lamps];
  return {
    group,
    lights,
    blockers,
    setState(ws: WorldState) {
      for (const [name, o] of Object.entries(props)) o.visible = ws.props.includes(name);
      setLit(all, isEvening(ws));
      // After dark the river window goes dim: nothing lights the water.
      view.emissiveIntensity = isEvening(ws) ? 0.12 : 0.7;
      view.color.set(isEvening(ws) ? "#5a6490" : "#ffffff");
    },
    update(dt: number, t: number) {
      wheel.rotation.z -= dt * 0.42;
      smallWheel.rotation.z -= dt * 0.42;
      flow(river, dt * 0.05, 0);
      foam.forEach((b, i) => b.scale.setScalar(0.85 + Math.sin(t * 3 + i * 1.3) * 0.2));
      drift(puffs, t);
    },
  };
}
