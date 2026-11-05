// Saltmouth Harbour and Hesketh's Shed. The sea lies behind everything, where the camera can see it.
// The quay runs along the path, cobbles giving way to sand; the shed has lost its front to the storm,
// which is why you can see in. The tide challenge moves the shelf items and floods the floor.

import * as THREE from "three";
import { COAST_PATH, GROUND_Y, PROPS, SHED, SHED_ITEMS, USABLES, VIEW_H } from "../../game/layout";
import type { WorldState } from "../../logic/world";
import {
  ball, BLOCK, boardCanvas, cyl, flat, flow, glowing, groundFrom, isEvening, lantern, LANTERN_COLOURS, many, noShadow, own, paint, paintPlanks, rbox, roof, seeded, setLit, soft, stoneWall, tree, waterSheet, type Lit, type Piece,
} from "../kit";
import { regionZ, SCALE, worldX as X } from "../space";
import { woodsPost } from "./village";
import type { Blocker, LightSpot, RegionKit } from "../types";

const WOOD = "#9b6b43";
const WOOD_DARK = "#7a5340";
const WOOD_LIGHT = "#c98a5e";
const STONE = ["#c9c4bc", "#bdb7ae", "#d4cfc7"];
const SEA_Y = -0.5;
const KERB_Z = -4.3;

const SHED_X0 = 12880;
const SHED_X1 = 13706;
const BACK = -3.4;
const FRONT = 3;
const H = 7.8;
/** The gap the storm left in the end wall spans the whole of the shed's walking width. */
const GAP_Z0 = -2.5;
const GAP_Z1 = 2.3;
/** How high the tide comes on the shed walls, in world units (2.7 = TIDE_TOP in the story's numbers). */
const WATER_TOP = 2.7;
/** The tide challenge's level at which the water reaches the floor: below this it only creeps in. */
const AT_FLOOR = (VIEW_H - GROUND_Y) / (VIEW_H - (GROUND_Y - 150));

/** Height on the wall for a y in the story's numbers. */
const heightOf = (y: number) => (GROUND_Y - y) / SCALE;

function quayCanvas(x0: number, x1: number, d: number): HTMLCanvasElement {
  const px = 26;
  const w = x1 - x0;
  const c = document.createElement("canvas");
  c.width = Math.round(w * px);
  c.height = Math.round(d * px);
  const g = c.getContext("2d")!;
  const r = seeded(107);
  g.fillStyle = "#ddd6ca";
  g.fillRect(0, 0, c.width, c.height);
  for (let y = 4, row = 0; y < c.height; y += 24, row++) {
    for (let x = (row % 2) * 16 - 16; x < c.width; x += 32) {
      g.fillStyle = ["#cbc2b4", "#d4ccbf", "#e4ddd0", "#d9d1c4"][Math.floor(r() * 4)];
      g.beginPath();
      g.roundRect(x + 2, y + 1, 27, 20, 8);
      g.fill();
    }
  }
  // The cobbles give way to sand.
  const a = ((12100 / SCALE - x0) / w) * c.width;
  const b = ((12400 / SCALE - x0) / w) * c.width;
  const grad = g.createLinearGradient(a, 0, b, 0);
  grad.addColorStop(0, "rgba(242,223,180,0)");
  grad.addColorStop(1, "#f2dfb4");
  g.fillStyle = grad;
  g.fillRect(a, 0, c.width - a, c.height);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = r() < 0.5 ? "rgba(255,245,215,.5)" : "rgba(214,190,140,.32)";
    g.beginPath();
    g.ellipse(b + r() * (c.width - b), r() * c.height, 12 + r() * 40, 5 + r() * 12, 0, 0, 7);
    g.fill();
  }
  return c;
}

interface CottageSpec {
  x: number;
  w: number;
  h: number;
  wall: string;
  roof: string;
  door: string;
  doorAt?: number;
}

/** A fisher's cottage, chunky like the village houses. Feet on y = 0, front at z = d / 2. */
function cottage(s: CottageSpec, lit: Lit[]): THREE.Group {
  const d = 3.4;
  const g = new THREE.Group();
  g.add(rbox(s.w, s.h, d, 0.28, soft(s.wall), 0, s.h / 2, 0));
  const r = roof(s.w + 0.6, d + 0.7, 1.6, soft(s.roof, 0.7));
  r.position.y = s.h - 0.05;
  g.add(r, rbox(0.6, 1.3, 0.6, 0.1, soft("#8a6a58"), s.w * 0.26, s.h + 1, -0.4));
  const front = d / 2;
  const dx = s.doorAt ?? -s.w * 0.22;
  g.add(rbox(0.95, 1.8, 0.2, 0.13, soft(s.door, 0.6), dx, 0.9, front + 0.04), rbox(1.3, 0.18, 0.6, 0.07, soft("#c9bfb5"), dx, 0.09, front + 0.28), ball(0.07, soft("#f0d27a", 0.3), dx + 0.3, 0.9, front + 0.17));
  const wx = dx < 0 ? s.w * 0.24 : -s.w * 0.24;
  const y = s.h * 0.56;
  const glass = new THREE.MeshStandardMaterial({ color: "#ffe2a8", emissive: "#ffc66a", emissiveIntensity: 0, roughness: 0.3 });
  lit.push({ m: glass, day: 0, night: 1.3 });
  g.add(rbox(1.15, 1, 0.14, 0.12, soft("#fbf3e2"), wx, y, front + 0.02), rbox(0.9, 0.76, 0.14, 0.09, glass, wx, y, front + 0.07), rbox(0.07, 0.76, 0.06, 0.03, soft("#fbf3e2"), wx, y, front + 0.15));
  return g;
}

/** A small fishing boat, waterline at the origin, bow toward +X. */
function boat(hull: string, stripe: string, cabin: string): THREE.Group {
  const s = new THREE.Shape();
  s.moveTo(-1.5, 0.75);
  s.lineTo(1.75, 0.8);
  s.quadraticCurveTo(1.35, -0.25, 0.75, -0.32);
  s.lineTo(-0.9, -0.32);
  s.quadraticCurveTo(-1.42, -0.2, -1.5, 0.75);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 4, curveSegments: 10 });
  geo.translate(0, 0, -0.5);
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo, soft(hull, 0.6));
  body.castShadow = true;
  g.add(body, rbox(3.3, 0.12, 1.28, 0.05, soft(stripe), 0.1, 0.54, 0), rbox(0.8, 0.66, 0.84, 0.12, soft(cabin), -0.45, 1.16, 0), rbox(0.9, 0.08, 0.94, 0.03, soft(WOOD_DARK), -0.45, 1.5, 0), rbox(0.36, 0.28, 0.05, 0.05, soft("#7fc4dc", 0.3), -0.45, 1.18, 0.43));
  g.add(cyl(0.05, 0.06, 2.1, soft(WOOD_DARK), 0.42, 1.8, 0, 8));
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 3), soft("#f6d36a"));
  flag.rotation.z = -Math.PI / 2;
  flag.position.set(0.72, 2.66, 0);
  g.add(flag);
  return g;
}

function gull(): THREE.Group {
  const g = new THREE.Group();
  const white = soft("#ffffff", 0.6);
  g.add(ball(0.17, white, 0, 0, 0, 0.8));
  g.children[0].scale.x = 1.7;
  for (const d of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.z = d * 0.1;
    wing.add(rbox(0.32, 0.04, 0.62, 0.02, white, 0, 0, d * 0.3));
    wing.userData.d = d;
    g.add(wing);
  }
  return g;
}

/** A gull sitting on something: feet at the origin. */
function sittingGull(): THREE.Group {
  const g = new THREE.Group();
  const white = soft("#ffffff", 0.6);
  g.add(ball(0.24, white, 0, 0.2, 0, 0.8), ball(0.14, white, 0.2, 0.42, 0));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), soft("#f2b54a"));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.38, 0.42, 0);
  g.add(beak, ball(0.024, soft("#3a3340"), 0.25, 0.46, 0.11));
  return g;
}

function netTexture(): THREE.CanvasTexture {
  return paint(256, 256, (c) => {
    c.strokeStyle = "#5f6f66";
    c.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.moveTo(i * 22 + 8, 10 + Math.abs(5.5 - i) * 4);
      c.lineTo(i * 22 + 6, 250);
      c.stroke();
    }
    for (let j = 0; j < 11; j++) {
      c.beginPath();
      c.moveTo(0, 26 + j * 21);
      c.quadraticCurveTo(128, 56 + j * 19, 256, 26 + j * 21);
      c.stroke();
    }
  });
}

function shedWall(w: number) {
  const px = 40;
  return paint(w * px, H * px, (c) => {
    const W = w * px;
    const Hh = H * px;
    paintPlanks(c, 0, 0, W, Hh, ["#b89a7c", "#b0927a", "#bea284"], 46, "#8f7a64", 23);
    c.fillStyle = "rgba(42,28,22,.1)";
    c.fillRect(0, 0, W, Hh);
    const r = seeded(131);
    // Pale shapes where the moulds used to hang, each under its empty hook.
    for (let k = 0; k < 12; k++) {
      const x = ((530 + k * 64 + 12400 - SHED_X0) / SCALE) * px;
      if (x > 8.6 * px && x < 11 * px) continue; // the photograph's shelf
      const big = k % 3 === 1;
      const mw = big ? 34 : 26;
      const mh = big ? 46 : 36;
      c.fillStyle = "rgba(230,214,188,.55)";
      c.beginPath();
      c.roundRect(x - mw / 2, Hh - 5.05 * px, mw, mh, 10);
      c.fill();
    }
    // The tide line and the stain under it.
    const y = Hh - 1.64 * px;
    c.beginPath();
    c.moveTo(0, y);
    const pts: [number, number][] = [];
    for (let x = 0; x <= W; x += 20) {
      const p: [number, number] = [x, y + Math.sin(x * 0.07) * 5 + (r() - 0.5) * 5];
      pts.push(p);
      c.lineTo(p[0], p[1]);
    }
    c.lineTo(W, Hh);
    c.lineTo(0, Hh);
    c.fillStyle = "rgba(95,111,116,.32)";
    c.fill();
    c.strokeStyle = "rgba(239,230,212,.75)";
    c.lineWidth = 4;
    c.beginPath();
    pts.forEach(([x, py], i) => (i ? c.lineTo(x, py) : c.moveTo(x, py)));
    c.stroke();
  });
}

function eavesSign(): THREE.CanvasTexture {
  return paint(1024, 74, (c) => {
    c.fillStyle = "#b9775a";
    c.fillRect(0, 0, 1024, 74);
    c.fillStyle = "rgba(246,230,200,.68)";
    c.font = "bold 42px Trebuchet MS, Verdana, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("H E S K E T H  ·  L A N T E R N S", 512, 40, 980);
    c.fillStyle = "#b9775a";
    c.fillRect(190, 18, 60, 16);
    c.fillRect(640, 42, 46, 20);
  });
}

function brokenWindow(): THREE.CanvasTexture {
  return paint(176, 128, (c) => {
    c.fillStyle = "#bfe3ef";
    c.fillRect(0, 0, 176, 128);
    c.fillStyle = "#3a3340";
    c.beginPath();
    c.moveTo(48, 0);
    c.lineTo(76, 48);
    c.lineTo(40, 80);
    c.lineTo(92, 100);
    c.lineTo(112, 52);
    c.lineTo(136, 0);
    c.fill();
    c.strokeStyle = "#ffffff";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(76, 48);
    c.lineTo(8, 20);
    c.moveTo(92, 100);
    c.lineTo(144, 124);
    c.moveTo(112, 52);
    c.lineTo(172, 72);
    c.stroke();
  });
}

/** Item materials are each their own, ready to fade: set `opacity` on any of them. */
function mine(color: string, roughness = 0.75) {
  return own(color, { roughness, transparent: true });
}

function notebooks(): THREE.Group {
  const g = new THREE.Group();
  ([[0, 0.02, "#6f8fb8"], [0.06, -0.05, "#c97b8a"], [-0.04, 0.08, "#8fae6a"]] as const).forEach(([x, r, col], i) => {
    const b = rbox(1.1, 0.2, 0.76, 0.05, mine(col), x, 0.1 + i * 0.2, 0);
    b.rotation.y = r;
    const pages = rbox(1.02, 0.1, 0.7, 0.02, mine("#f6efe2"), x + 0.03, 0.1 + i * 0.2, 0.04);
    pages.rotation.y = r;
    g.add(b, pages);
  });
  return g;
}

function mould(s: number, col: string, shade: string): THREE.Group {
  const g = new THREE.Group();
  g.scale.setScalar(s);
  const m = mine(col, 0.35);
  const d = mine(shade, 0.45);
  g.add(ball(0.42, m, 0, 0.52, 0, 1.1), cyl(0.27, 0.3, 0.1, d, 0, 0.05, 0, 16), cyl(0.2, 0.22, 0.1, d, 0, 1, 0, 16));
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.022, 8, 28), d);
  seam.position.y = 0.52;
  seam.rotation.x = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.026, 8, 16), d);
  ring.position.y = 1.14;
  g.add(seam, ring);
  return g;
}

function toolRoll(): THREE.Group {
  const g = new THREE.Group();
  const roll = cyl(0.27, 0.27, 1.05, mine("#8a5a3a"), 0, 0.28, 0, 16);
  roll.rotation.z = Math.PI / 2;
  const end = cyl(0.2, 0.2, 0.02, mine("#a8674a"), 0.53, 0.28, 0, 14);
  end.rotation.z = Math.PI / 2;
  const tie = cyl(0.285, 0.285, 0.12, mine("#c9a37a"), -0.1, 0.28, 0, 16);
  tie.rotation.z = Math.PI / 2;
  g.add(roll, end, tie);
  ([[0.56, 0.5, -0.5, "#c98a5e"], [0.62, 0.54, 0.25, "#b9c4cc"], [0.68, 0.48, 0.55, "#e9583c"]] as const).forEach(([x, y, r, c]) => {
    const t = rbox(0.09, 0.42, 0.09, 0.03, mine(c), x, y, 0);
    t.rotation.z = r;
    g.add(t);
  });
  return g;
}

function photo(): THREE.Group {
  const g = new THREE.Group();
  const face = new THREE.Group();
  face.rotation.x = -0.16;
  face.position.y = 0.54;
  const t = paint(128, 160, (c) => {
    c.fillStyle = "#e9d8b8";
    c.fillRect(0, 0, 128, 160);
    // An old hare, long ears, and a young otter beside him.
    c.fillStyle = "#9a8a7c";
    for (const x of [36, 54]) {
      c.beginPath();
      c.ellipse(x, 34, 7, 22, 0, 0, 7);
      c.fill();
    }
    c.beginPath();
    c.arc(46, 70, 22, 0, 7);
    c.fill();
    c.fillStyle = "#8a7a6c";
    c.beginPath();
    c.roundRect(24, 88, 42, 72, 16);
    c.fill();
    c.fillStyle = "#7a5a44";
    c.beginPath();
    c.arc(90, 100, 16, 0, 7);
    c.fill();
    c.fillStyle = "#6b4c3a";
    c.beginPath();
    c.roundRect(74, 114, 32, 46, 14);
    c.fill();
    c.fillStyle = "#3a2c26";
    for (const [x, y] of [[40, 68], [52, 68], [85, 97], [95, 97]]) {
      c.beginPath();
      c.arc(x, y, 2.6, 0, 7);
      c.fill();
    }
    c.fillStyle = "rgba(201,163,106,.18)";
    c.fillRect(0, 0, 128, 160);
  });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.92), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, transparent: true }));
  pic.position.z = 0.05;
  face.add(rbox(0.9, 1.1, 0.08, 0.05, mine("#c9a37a")), pic);
  const stand = rbox(0.08, 0.86, 0.05, 0.02, mine(WOOD_DARK), 0, 0.42, -0.2);
  stand.rotation.x = 0.28;
  g.add(face, stand);
  return g;
}

function sandbags(): THREE.Group {
  const g = new THREE.Group();
  const list: Piece[] = [];
  const row = (n: number, y: number, z: number) => {
    for (let i = 0; i < n; i++) list.push({ x: (i - (n - 1) / 2) * 0.76, y, z, sx: 0.8, sy: 0.38, sz: 0.56, ry: (i % 2 ? 1 : -1) * 0.08, color: i % 2 ? "#c9b48a" : "#d2bd94" });
  };
  row(3, 0.19, 0.1);
  row(2, 0.53, 0.06);
  row(1, 0.87, 0.02);
  const m = many(new THREE.SphereGeometry(0.62, 16, 12), list);
  g.add(m);
  return g;
}

/** The crate on the sand where the things you save are stacked: top at about 0.9. */
function crate(): THREE.Group {
  const g = new THREE.Group();
  const wood = soft(WOOD_LIGHT);
  const dark = soft("#a8674a");
  g.add(rbox(2.1, 0.14, 1.5, 0.04, dark, 0, 0.08, 0));
  for (const [x, z, w, d] of [[0, 0.72, 2.1, 0.1], [0, -0.72, 2.1, 0.1], [1, 0, 0.1, 1.5], [-1, 0, 0.1, 1.5]]) {
    for (const y of [0.26, 0.54, 0.8]) g.add(rbox(w, 0.22, d, 0.03, wood, x, y, z));
  }
  const lid = rbox(0.1, 1.5, 0.1, 0.03, dark, 1.22, 0.7, 0.72);
  lid.rotation.z = -0.22;
  g.add(lid);
  return g;
}

export function buildCoast(): RegionKit & { shedItem(id: string): THREE.Object3D; setWater(level01: number): void } {
  const Z = regionZ(12000);
  const group = new THREE.Group();
  const g = new THREE.Group();
  g.position.z = Z;
  group.add(g);
  const props: Record<string, THREE.Object3D> = {};
  const lit: Lit[] = [];
  g.add(woodsPost(X(COAST_PATH), -3.2));
  const blockers: Blocker[] = [];

  // --- The sea, and the ground along the front of it ---------------------------------------------
  const sea = waterSheet(420, 330, "#6fb2cc", "#a4d8e8", [34, 26]);
  sea.position.set(225, SEA_Y, -160);
  g.add(sea);

  const gx0 = X(10100);
  const gx1 = X(14500);
  const depth = 22;
  const groundZ = KERB_Z + depth / 2;
  const quay = groundFrom(quayCanvas(gx0, gx1, depth), gx1 - gx0, depth);
  quay.position.set((gx0 + gx1) / 2, 0, groundZ);
  g.add(quay);
  // Behind the quay's left end, cottages stand on more cobbles.
  const px1 = X(11586);
  const plot = noShadow(rbox(px1 - gx0, 1.1, 7, 0.14, soft("#d4ccbf"), (gx0 + px1) / 2, -0.56, KERB_Z - 3.46));
  g.add(plot);
  // The kerb along the edge of the quay, where it isn't sand.
  const kerbX1 = X(12180);
  g.add(noShadow(rbox(kerbX1 - px1, 1.2, 0.5, 0.12, soft("#c9c4bc"), (px1 + kerbX1) / 2, -0.5, KERB_Z)));

  // A headland closes off the village end.
  for (const [x, y, z, rx, ry, rz, c] of [[180, -1, -12, 16, 9, 16, "#7fa374"], [177, -1, 2, 14, 6, 16, "#8fae78"], [200, -1, -24, 14, 5, 9, "#8fae78"]] as const) {
    const hill = ball(1, soft(c), x, y, z);
    hill.scale.set(rx, ry, rz);
    g.add(noShadow(hill));
  }
  for (const [x, z, s] of [[194, -9, 1.1], [191, -7, 1.3], [197, -9.5, 0.9]] as const) {
    const t = tree(s, "#6ba65f");
    t.position.set(x, 0, z);
    g.add(t);
  }

  // The beach past the end of the quay, bending back toward the sea.
  const sx0 = X(12100);
  const beach = new THREE.Shape();
  beach.moveTo(sx0 - 1, 0);
  for (let x = sx0; x <= gx1; x += 1.5) beach.lineTo(x, 3.6 + Math.sin(x * 0.45) * 0.4 + Math.sin(x * 0.17) * 0.7 + Math.min(1, (x - sx0) / 8) * 2);
  beach.lineTo(gx1, 0);
  beach.closePath();
  const sandGeo = new THREE.ExtrudeGeometry(beach, { depth: 0.8, bevelEnabled: false });
  sandGeo.rotateX(-Math.PI / 2);
  sandGeo.translate(0, -0.8, 0);
  const sand = new THREE.Mesh(sandGeo, soft("#f2dfb4", 1));
  sand.position.set(0, 0, KERB_Z + 0.04);
  sand.receiveShadow = true;
  g.add(sand);
  const foam = new THREE.Mesh(sandGeo, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7, transparent: true, opacity: 0.7 }));
  foam.position.set(0, SEA_Y + 0.05, KERB_Z - 0.4);
  g.add(foam);

  // A dune with marram grass, where the dry sand sits a little higher.
  const dune = ball(1, soft("#f8ebc8"), X(12560), -0.1, -6.2);
  dune.scale.set(4.6, 1.3, 2.2);
  g.add(noShadow(dune));
  const grass: Piece[] = [];
  const gr = seeded(5);
  for (let i = 0; i < 34; i++) {
    const x = X(12560) - 3.6 + gr() * 7.2;
    const z = -5.2 - gr() * 2;
    const h = 0.6 + gr() * 0.5;
    grass.push({ x, y: 0.72 + h / 2 - Math.abs(x - X(12560)) * 0.12, z, sx: 0.05, sy: h, sz: 0.05, rz: (gr() - 0.5) * 0.7, color: i % 2 ? "#a8b46a" : "#94a45e" });
  }
  g.add(many(BLOCK, grass));

  // --- Cottages ----------------------------------------------------------------------------------
  const cottages: CottageSpec[] = [
    { x: 11095, w: 3.1, h: 2.9, wall: "#ffe1d4", roof: "#e57b5f", door: "#7fa79a" },
    { x: 11300, w: 3.8, h: 3.2, wall: "#f4f0e6", roof: "#7fa0b8", door: "#4f86c6", doorAt: 0 },
    { x: 11497, w: 2.5, h: 4, wall: "#dcefe1", roof: "#6fa7c9", door: "#c97b6a" },
  ];
  for (const s of cottages) {
    const c = cottage(s, lit);
    c.position.set(X(s.x), 0, -7.2);
    g.add(c);
  }
  // A pot of flowers by Fen's blue door.
  g.add(cyl(0.2, 0.15, 0.26, soft("#c97b6a"), X(11340), 0.13, -5.1, 12), ball(0.24, soft("#e98fb4"), X(11340), 0.4, -5.1));

  // --- The harbour wall, and everything along it --------------------------------------------------
  const wx1 = X(USABLES.harbour_wall.x);
  const wallW = wx1 - px1;
  const wallZ = -4.5;
  const stones = stoneWall(wallW, 1, STONE, "#9a9590", 109);
  stones.position.set((px1 + wx1) / 2, 0, wallZ);
  g.add(stones);
  g.add(rbox(wallW + 0.3, 0.2, 0.86, 0.09, soft("#d9d4cc"), (px1 + wx1) / 2, 1.08, wallZ - 0.2));
  g.add(cyl(0.46, 0.5, 1.5, soft("#bdb7ae"), wx1, 0.42, wallZ - 0.2, 20));
  g.add(cyl(0.5, 0.5, 0.16, soft("#d9d4cc"), wx1, 1.2, wallZ - 0.2, 20));
  g.add(noShadow(rbox(wallW, 1.4, 0.6, 0.1, soft("#9a9590"), (px1 + wx1) / 2, -0.3, wallZ - 0.34)));

  // A street lamp at the root of the wall.
  const lampX = X(11590);
  const lampGlass = new THREE.MeshStandardMaterial({ color: "#fde6a8", emissive: "#ffc66a", emissiveIntensity: 0, roughness: 0.3 });
  lit.push({ m: lampGlass, day: 0, night: 1.8 });
  g.add(cyl(0.07, 0.1, 2.3, soft("#6b5a6a"), lampX, 1.15, -3.95, 10), rbox(0.5, 0.48, 0.5, 0.1, lampGlass, lampX, 2.5, -3.95), rbox(0.66, 0.1, 0.66, 0.04, soft("#6b5a6a"), lampX, 2.78, -3.95));

  // Nets drying on poles.
  const n0 = X(11620);
  const n1 = X(11720);
  for (const x of [n0, n1]) g.add(cyl(0.07, 0.09, 2.8, soft(WOOD), x, 1.4, -4.05, 10));
  const net = flat(netTexture(), n1 - n0, 2.2, (n0 + n1) / 2, 1.6, -4.05, true);
  (net.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  (net.material as THREE.MeshStandardMaterial).alphaTest = 0.3;
  g.add(net, ball(0.1, soft("#f2b54a"), X(11650), 0.8, -3.98), ball(0.1, soft("#e9583c"), X(11698), 0.76, -3.98));

  // Fish crates, some full; a coil of rope.
  const fishCrate = (x: number, y: number, full: boolean) => {
    g.add(rbox(1, 0.6, 0.72, 0.06, soft(WOOD_LIGHT), x, y + 0.3, -3.95), rbox(1.02, 0.07, 0.74, 0.02, soft("#a8674a"), x, y + 0.22, -3.95), rbox(1.02, 0.07, 0.74, 0.02, soft("#a8674a"), x, y + 0.44, -3.95));
    if (full) g.add(ball(0.26, soft("#b9c4cc", 0.4), x - 0.2, y + 0.62, -3.95, 0.45), ball(0.27, soft("#9fb0bc", 0.4), x + 0.2, y + 0.63, -3.95, 0.45));
  };
  fishCrate(X(11776), 0, true);
  fishCrate(X(11836), 0, false);
  fishCrate(X(11804), 0.6, true);
  for (let i = 0; i < 4; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.5 - i * 0.05, 0.08, 8, 26), soft(i % 2 ? "#d9b98a" : "#c9a36a"));
    coil.rotation.x = Math.PI / 2;
    coil.position.set(X(11910), 0.09 + i * 0.13, -3.9);
    coil.castShadow = true;
    g.add(coil);
  }

  // Bollards, one with a gull on it.
  for (const bx of [12030, 12180, 12320]) {
    const x = X(bx);
    g.add(cyl(0.2, 0.24, 0.66, soft("#4a4250"), x, 0.33, -3.95, 14), cyl(0.3, 0.3, 0.12, soft("#5a5260"), x, 0.68, -3.95, 14));
  }
  const sitter = sittingGull();
  sitter.position.set(X(12030), 0.74, -3.95);
  g.add(sitter);

  // The post at the wall's end. The lantern hangs from its arm.
  const hookX = X(PROPS.harbour_lantern.x);
  g.add(rbox(0.22, 3.6, 0.22, 0.07, soft(WOOD), hookX - 0.4, 1.8, -3.95), rbox(0.56, 0.08, 0.08, 0.03, soft("#4a4250"), hookX - 0.16, 3.46, -3.95));
  const harbourGlass = glowing(LANTERN_COLOURS[1], 0.25);
  lit.push({ m: harbourGlass, day: 0.25, night: 1.4 });
  const hung = lantern(harbourGlass);
  hung.position.set(hookX, 3.42, -3.95);
  g.add(hung);
  props.harbour_lantern = hung;

  // --- Boats, a lighthouse, gulls ----------------------------------------------------------------
  const boats: { o: THREE.Group; y: number; k: number }[] = [];
  const moored: [number, number, string, string, string, boolean][] = [
    [11840, -9, "#e9583c", "#ffffff", "#f6efe2", false],
    [12000, -11.5, "#4f86c6", "#f6d36a", "#ffe1d4", true],
    [12250, -13, "#f2b54a", "#4f86c6", "#ffffff", false],
    [11660, -14, "#7fa79a", "#f6efe2", "#f6d36a", true],
  ];
  moored.forEach(([x, z, hull, stripe, cabin, flip], i) => {
    const o = boat(hull, stripe, cabin);
    o.position.set(X(x), SEA_Y, z);
    o.scale.setScalar(1.1);
    if (flip) o.rotation.y = Math.PI;
    g.add(o);
    boats.push({ o, y: SEA_Y, k: i * 1.9 });
  });

  const lighthouse = new THREE.Group();
  lighthouse.position.set(X(12540), SEA_Y, -38);
  const rock = ball(1, soft("#8f8a86"), 0, 0, 0);
  rock.scale.set(6, 1.6, 4);
  lighthouse.add(noShadow(rock));
  for (let i = 0; i < 5; i++) lighthouse.add(noShadow(cyl(0.98 - (i + 1) * 0.09, 0.98 - i * 0.09, 1.05, soft(i % 2 ? "#e9583c" : "#fbf3e2"), 0, 1.2 + i * 1.05, 0, 22)));
  const beam = glowing("#fde6a8", 0.3);
  lit.push({ m: beam, day: 0.3, night: 2.4 });
  lighthouse.add(noShadow(cyl(0.68, 0.68, 0.12, soft("#3a3340"), 0, 6.1, 0, 20)), noShadow(cyl(0.42, 0.42, 0.7, beam, 0, 6.5, 0, 16)), noShadow(cyl(0.05, 0.7, 0.5, soft("#e9583c"), 0, 7.1, 0, 20)));
  g.add(lighthouse);

  const gulls: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const b = gull();
    g.add(noShadow(b));
    gulls.push(b);
  }

  // --- Hesketh's Shed ----------------------------------------------------------------------------
  const x0 = X(SHED_X0);
  const x1 = X(SHED_X1);
  const mid = (x0 + x1) / 2;
  const w = x1 - x0;
  const depthIn = FRONT - BACK;
  const midZ = (BACK + FRONT) / 2;

  const floor = groundFrom(boardCanvas(w, depthIn, ["#a8927a", "#b09a82", "#9f8a72"], "#8f7a64", 37), w, depthIn);
  floor.position.set(mid, 0.015, midZ);
  g.add(floor);
  g.add(noShadow(flat(shedWall(w), w, H, mid, H / 2, BACK)));
  g.add(noShadow(rbox(w + 0.8, H, 0.4, 0.06, soft("#8f7a64"), mid, H / 2, BACK - 0.24)));

  // The far wall, whole. The near end was torn open by the storm.
  g.add(noShadow(rbox(0.5, H, depthIn + 0.2, 0.08, soft("#a8927a"), x1 + 0.25, H / 2, midZ)));
  g.add(noShadow(rbox(0.4, H, 0.4, 0.08, soft(WOOD_DARK), x1 + 0.1, H / 2, FRONT)));
  const planks: Piece[] = [];
  const wr = seeded(131);
  const plankAt = (z: number, bottom: number, top: number) => planks.push({ x: x0 - 0.2, y: (top + bottom) / 2, z, sx: 0.28, sy: top - bottom, sz: 0.5, color: ["#b89a7c", "#c9b496", "#d1bd9f"][Math.floor(wr() * 3)] });
  for (let z = BACK; z < GAP_Z0; z += 0.52) plankAt(z + 0.26, 0, H);
  for (let z = GAP_Z1; z < FRONT; z += 0.52) plankAt(z + 0.26, 0, H);
  for (let z = GAP_Z0; z < GAP_Z1; z += 0.52) plankAt(z + 0.26, 3.5 + wr() * 0.8, H);
  g.add(noShadow(many(BLOCK, planks)));
  g.add(noShadow(rbox(0.36, H, 0.36, 0.08, soft(WOOD_DARK), x0 - 0.2, H / 2, FRONT + 0.1)));

  // The door, hanging off its last hinge at the edge of the gap.
  const hinge = new THREE.Group();
  hinge.position.set(x0 - 0.3, 3.1, GAP_Z0 - 0.1);
  const leaf = new THREE.Group();
  leaf.rotation.z = -0.2;
  leaf.add(rbox(1.5, 3, 0.13, 0.08, soft("#b89a7c"), -0.76, -1.5, 0));
  for (const y of [-0.6, -2.4]) leaf.add(rbox(1.5, 0.16, 0.05, 0.02, soft("#8f7a64"), -0.76, y, 0.08));
  leaf.add(rbox(0.04, 2.9, 0.03, 0.01, soft("#8f7a64"), -0.76, -1.5, 0.08));
  hinge.add(leaf, rbox(0.3, 0.12, 0.1, 0.02, soft("#4a4250"), -0.1, -0.04, 0.08));
  g.add(hinge);

  // Roof and the faded sign along the eaves. Nothing hangs in front of the shelves.
  const roofM = noShadow(rbox(w + 2.2, 0.3, depthIn + 1.6, 0.08, soft("#7a8a96"), mid, 7.95, midZ));
  roofM.rotation.x = -0.1;
  g.add(roofM);
  g.add(noShadow(rbox(w + 0.4, 0.5, 0.24, 0.06, soft(WOOD_DARK), mid, 6.42, FRONT + 0.05)));
  g.add(flat(eavesSign(), 9.1, 0.66, mid, 6.42, FRONT + 0.2));

  // The rail of empty mould hooks.
  g.add(noShadow(rbox(w - 0.7, 0.14, 0.12, 0.05, soft(WOOD_DARK), mid, 5.3, BACK + 0.08)));
  const hooks: Piece[] = [];
  for (let k = 0; k < 12; k++) {
    const hx = X(530 + k * 64 + 12400);
    if (hx < x0 + 0.3 || hx > x1 - 0.3) continue;
    hooks.push({ x: hx, y: 5.12, z: BACK + 0.14, sx: 0.06, sy: 0.3, sz: 0.06, color: "#4a4250" });
  }
  g.add(many(BLOCK, hooks));

  // The broken window, boarded across.
  const bwx = X(13620);
  g.add(rbox(1.95, 1.5, 0.14, 0.1, soft(WOOD_DARK), bwx, 4, BACK + 0.08), flat(brokenWindow(), 1.6, 1.16, bwx, 4, BACK + 0.17));
  const board = rbox(2.2, 0.26, 0.06, 0.02, soft("#c9a37a"), bwx, 3.95, BACK + 0.22);
  board.rotation.z = -0.3;
  g.add(board);

  // The shelves at the heights the story uses.
  const shelf = (a: number, b: number, top: number) => {
    const sx = X(a);
    const ex = X(b);
    g.add(rbox(ex - sx, 0.18, 0.95, 0.06, soft(WOOD), (sx + ex) / 2, top - 0.09, BACK + 0.48));
    for (const bx of [sx + 0.36, ex - 0.36]) g.add(rbox(0.12, 0.5, 0.5, 0.04, soft(WOOD_DARK), bx, top - 0.42, BACK + 0.26));
  };
  const highY = heightOf(GROUND_Y - 220);
  const midY = heightOf(GROUND_Y - 120);
  shelf(13290, 13410, highY);
  shelf(13040, 13540, midY);
  // Low pallets that keep what's on the floor just off it.
  const floorY = heightOf(GROUND_Y - 18);
  for (const a of [12960, 13220]) {
    g.add(rbox(1.7, floorY - 0.1, 1, 0.05, soft("#c9b496"), X(a), (floorY - 0.1) / 2 + 0.02, BACK + 0.62), rbox(1.8, 0.1, 1.1, 0.03, soft("#a8927a"), X(a), floorY - 0.05, BACK + 0.62));
  }

  // Seaweed left behind: on the floor and caught on the brackets.
  const weed: Piece[] = [];
  for (const [wx, s] of [[12950, 1], [13110, 0.8], [13410, 1.1], [13670, 0.8]] as const) {
    for (let i = 0; i < 5; i++) weed.push({ x: X(wx) + (i - 2) * 0.22 * s, y: 0.06, z: 0.6 + (i % 2) * 0.3 + (wx % 3) * 0.3, sx: 0.32 * s, sy: 0.12, sz: 0.2, ry: i * 1.1, color: i % 2 ? "#6f8a4a" : "#5f7a3a" });
  }
  for (const [wx, top] of [[13060, midY], [13520, midY]] as const) {
    for (let i = 0; i < 3; i++) weed.push({ x: X(wx) + i * 0.08, y: top - 0.6 - i * 0.1, z: BACK + 0.93, sx: 0.09, sy: 0.74 - i * 0.14, sz: 0.06, rz: (i - 1) * 0.22, color: "#6f8a4a" });
  }
  g.add(many(BLOCK, weed));

  // The jagged stubs of the missing front wall.
  const stubs: Piece[] = [];
  const sr = seeded(9);
  for (let x = x0 + 0.4; x < x1 - 0.2; x += 0.55 + sr() * 0.9) {
    const h = 0.28 + sr() * 0.5;
    stubs.push({ x, y: h / 2 - 0.02, z: FRONT - 0.06, sx: 0.46, sy: h, sz: 0.14, rz: (sr() - 0.5) * 0.14, color: sr() < 0.5 ? "#c9b496" : "#d1bd9f" });
  }
  g.add(many(BLOCK, stubs));

  // --- The things on the shelves -------------------------------------------------------------------
  const builders: Record<(typeof SHED_ITEMS)[number]["id"], () => THREE.Group> = {
    notebooks,
    small_mould: () => mould(0.92, "#b9c4cc", "#7a8a96"),
    tools: toolRoll,
    photo,
    red_mould: () => mould(1.16, "#d9473f", "#8a3a34"),
  };
  const items = new Map<string, THREE.Object3D>();
  for (const it of SHED_ITEMS) {
    const o = builders[it.id]();
    // Straight in the region's world position, so the challenge can carry them out across it.
    o.position.set(X(it.x), heightOf(it.y), Z + BACK + 0.55);
    group.add(o);
    items.set(it.id, o);
  }

  // The tide: a translucent block filling the shed floor. Its sides are one material, its top another.
  const sideM = own("#5fa6c4", { roughness: 0.3, transparent: true, opacity: 0.5, depthWrite: false });
  const top = waterSheet(4, 4, "#6fb2cc", "#a4d8e8", [3, 1.2], 8);
  const topM = top.material as THREE.MeshStandardMaterial;
  topM.transparent = true;
  topM.opacity = 0.72;
  topM.depthWrite = false;
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(-0.5, 0.5, 0); // anchored at the sea end, on the floor, so it can creep in from there
  const water = new THREE.Mesh(box, [sideM, sideM, topM, sideM, sideM, sideM]);
  const waterX1 = X(SHED.x1);
  const waterW = waterX1 - X(SHED.x0);
  water.position.set(waterX1, 0.03, midZ);
  water.renderOrder = 2;
  water.visible = false;
  g.add(water);
  let waterH = 0;

  function setWater(level01: number) {
    const l = THREE.MathUtils.clamp(level01, 0, 1);
    water.visible = l > 0.001;
    // The challenge counts things as lost by the level it keeps in the story's numbers, which reach
    // the floor at AT_FLOOR. Until then the tide is a thin film creeping in from the sea end, so the
    // water on screen and the moment a thing is lost always agree.
    const creep = Math.min(1, l / AT_FLOOR);
    waterH = 0.05 + Math.max(0, (l - AT_FLOOR) / (1 - AT_FLOOR)) * WATER_TOP;
    water.scale.set(waterW * creep, waterH, depthIn);
  }

  // --- Story props on the sand ---------------------------------------------------------------------
  const bags = sandbags();
  const bagsZ = -2.05;
  bags.position.set(X(PROPS.sandbags.x) - 0.5, 0, bagsZ);
  g.add(bags);
  props.sandbags = bags;
  const box2 = crate();
  // The tide challenge stacks saved things here: across the path at 0.6, about 0.9 up.
  box2.position.set(X(PROPS.crate.x), 0, 0.6);
  g.add(box2);
  props.crate = box2;

  // Solid when they're there, nothing when they're not.
  const solid: Record<string, Blocker[]> = {
    sandbags: [{ X: bags.position.x, Z: Z + bagsZ - 0.15, r: 0.55 }],
    crate: [-0.6, 0.6].map((d) => ({ X: box2.position.x + d, Z: Z + 0.6, r: 0.8 })),
  };

  blockers.push(
    // Either side of the gap, and the fallen door.
    { X: x0 - 0.2, Z: Z + FRONT - 0.1, r: 0.6 },
    { X: x0 - 0.2, Z: Z + BACK + 0.3, r: 0.6 },
    { X: x0 - 1, Z: Z + GAP_Z0 - 0.15, r: 0.45 },
    // The far wall: the walking limit runs just past it.
    ...[-2.4, -1.2, 0, 1.2, 2.2].map((z) => ({ X: x1 + 1.1, Z: Z + z, r: 1 })),
  );

  const lights: LightSpot[] = [
    { pos: [hookX, 2.6, Z - 3], color: "#ffbe78", power: 20, on: (ws) => ws.props.includes("harbour_lantern") && isEvening(ws) },
    { pos: [lampX, 2.5, Z - 3.2], color: "#ffcf8a", power: 18 },
    // The shed has a gap for a front wall, but it's dim in there under the roof.
    { pos: [mid - 3.4, 4.6, Z + 0.6], color: "#ffe6c8", power: 15, on: () => true },
    { pos: [mid + 3.4, 4.6, Z + 0.6], color: "#ffe6c8", power: 15, on: () => true },
  ];

  return {
    group,
    lights,
    blockers,
    setWater,
    shedItem(id: string) {
      const o = items.get(id);
      if (!o) throw new Error(`No shed item called ${id}`);
      return o;
    },
    setState(ws: WorldState) {
      for (const [name, o] of Object.entries(props)) o.visible = ws.props.includes(name);
      for (const [name, list] of Object.entries(solid)) {
        for (const b of list) {
          const i = blockers.indexOf(b);
          if (ws.props.includes(name) && i < 0) blockers.push(b);
          else if (!ws.props.includes(name) && i >= 0) blockers.splice(i, 1);
        }
      }
      setLit(lit, isEvening(ws));
    },
    update(dt: number, t: number) {
      flow(sea, dt * 0.012, dt * 0.02);
      foam.position.z = KERB_Z - 0.4 + Math.sin(t * 0.7) * 0.22;
      for (const b of boats) {
        b.o.position.y = b.y + Math.sin(t * 0.9 + b.k) * 0.08;
        b.o.rotation.z = Math.sin(t * 0.7 + b.k) * 0.035;
      }
      gulls.forEach((b, i) => {
        const a = t * (0.16 + i * 0.02) + i * 1.6;
        b.position.set(212 + i * 9 + Math.cos(a) * 9, 4.4 + i * 0.5 + Math.sin(a * 2) * 0.4, -14 + Math.sin(a) * 4);
        b.rotation.y = -a + Math.PI / 2;
        const flap = Math.sin(t * 6 + i) * 0.4;
        for (const wing of b.children) if (wing.userData.d) wing.rotation.x = wing.userData.d * flap;
      });
      if (water.visible) {
        flow(top, dt * 0.03, dt * 0.012);
        water.position.y = 0.03 + Math.sin(t * 1.3) * Math.min(0.04, waterH * 0.2);
      }
    },
  };
}
