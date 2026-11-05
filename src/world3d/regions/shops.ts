// Two shops you can walk into: the bakery on Market Street and Nell's sewing room on Lantern Lane.
// Doll's-house rooms like the ones in your home, with everything solid along the walls so the
// floor stays clear for whoever's serving.

import * as THREE from "three";
import { REGIONS } from "../../game/layout";
import type { WorldState } from "../../logic/world";
import { ball, boardCanvas, cyl, flame, flat, flicker, noShadow, paint, paintPlanks, rbox, room, seeded, soft, surround, wallDoor } from "../kit";
import { regionZ, worldX as X } from "../space";
import type { Blocker, LightSpot, RegionKit } from "../types";
import { drawOutside, viewOf } from "./house";

const WOOD = "#9b6b43";
const WOOD_DARK = "#7a5340";
const WOOD_LIGHT = "#c98a5e";
const BACK = -3.4;
const FRONT = 3.4;
const H = 9;
const PX = 40;
const TOP = 1.3;

function bakeryWall(w: number) {
  return paint(w * PX, H * PX, (c) => {
    paintPlanks(c, 0, 0, w * PX, H * PX, ["#ffe1d4", "#fbd9ca", "#ffe8dc"], 46, "#ecc4b2");
    const top = H * PX - 2 * PX;
    c.fillStyle = "#8bbf74";
    c.fillRect(0, top, w * PX, 2 * PX);
    c.fillStyle = "#9dcc86";
    for (let x = 6; x < w * PX; x += 72) {
      c.beginPath();
      c.roundRect(x, top + 10, 60, 2 * PX - 20, 8);
      c.fill();
    }
  });
}

function sewingWall(w: number) {
  return paint(w * PX, H * PX, (c) => {
    paintPlanks(c, 0, 0, w * PX, H * PX, ["#fde6a8", "#f9df9c", "#feecb8"], 46, "#e9cb86");
    const top = H * PX - 1.9 * PX;
    c.fillStyle = "#d9b27a";
    c.fillRect(0, top, w * PX, 1.9 * PX);
    c.fillStyle = "#e4c08a";
    for (let x = 6; x < w * PX; x += 72) {
      c.beginPath();
      c.roundRect(x, top + 10, 60, 1.9 * PX - 20, 8);
      c.fill();
    }
  });
}

function bricks() {
  return paint(240, 320, (c) => {
    c.fillStyle = "#a8604a";
    c.fillRect(0, 0, 240, 320);
    for (let y = 0, j = 0; y < 320; y += 26, j++) {
      for (let x = j % 2 ? -26 : 0; x < 240; x += 54) {
        c.fillStyle = (x / 2 + j) % 3 < 1 ? "#c97b5e" : "#bd6f54";
        c.beginPath();
        c.roundRect(x + 2, y + 2, 50, 22, 4);
        c.fill();
      }
    }
  });
}

function chalkboard() {
  return paint(320, 240, (c) => {
    c.fillStyle = "#3a4a44";
    c.fillRect(0, 0, 320, 240);
    c.fillStyle = "#fbf3e2";
    c.textAlign = "center";
    c.font = 'bold 40px "Trebuchet MS", sans-serif';
    c.fillText("Fresh today", 160, 62);
    c.font = '26px "Trebuchet MS", sans-serif';
    c.fillStyle = "#f6d36a";
    ["Apple loaf", "Honey buns", "Seed cake"].forEach((t, i) => c.fillText(t, 160, 112 + i * 40));
  });
}

function quilt() {
  return paint(320, 240, (c) => {
    const cols = ["#e98fa0", "#7fb0d9", "#f6d36a", "#8fcc76", "#b986c9"];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
      c.fillStyle = cols[(x * 2 + y * 3) % 5];
      c.fillRect(x * 40, y * 40, 40, 40);
    }
    c.strokeStyle = "rgba(255,255,255,.75)";
    c.lineWidth = 2.5;
    c.setLineDash([6, 6]);
    for (let i = 1; i < 8; i++) {
      c.beginPath();
      c.moveTo(i * 40, 0);
      c.lineTo(i * 40, 240);
      c.moveTo(0, i * 40);
      c.lineTo(320, i * 40);
      c.stroke();
    }
  });
}

/** A chair facing the way it's turned, feet at the origin. */
function chair(col: string): THREE.Group {
  const g = new THREE.Group();
  g.add(rbox(0.72, 0.1, 0.72, 0.04, soft(col), 0, 0.82, 0), rbox(0.72, 0.8, 0.1, 0.04, soft(col), 0, 1.24, -0.31));
  for (const [a, b] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) g.add(cyl(0.045, 0.045, 0.8, soft(WOOD_DARK), a, 0.4, b, 8));
  return g;
}

function bakery(g: THREE.Group, x0: number, x1: number, Z: number, blockers: Blocker[], flames: THREE.Object3D[]): number {
  // The brick oven, with the fire showing through its arch.
  const ox = x0 + 4.75;
  g.add(rbox(3.7, 4.9, 1.2, 0.16, soft("#b0654e"), ox, 2.42, BACK + 0.08));
  g.add(noShadow(flat(bricks(), 3.5, 4.7, ox, 2.4, BACK + 0.7)));
  g.add(rbox(4, 0.26, 1.5, 0.1, soft("#8a4f3c"), ox, 4.95, BACK + 0.74), rbox(3.9, 0.4, 1.4, 0.08, soft("#d8cdb4"), ox, 0.2, BACK + 0.74));
  g.add(cyl(0.34, 0.42, 4.4, soft("#8a4f3c"), ox + 0.6, 7.1, BACK + 0.5, 14));
  g.add(rbox(1.7, 1.25, 0.08, 0.3, soft("#2e2430"), ox, 1.65, BACK + 0.76));
  const fire = new THREE.Group();
  fire.position.set(ox, 1.1, BACK + 0.8);
  for (const [fx, s] of [[-0.42, 0.72], [0.4, 0.78], [0, 1.1]] as const) {
    const f = flame(s);
    f.position.x = fx;
    flames.push(f);
    fire.add(f);
  }
  g.add(fire);
  // A peel leaning by the oven, and logs for it.
  const peel = rbox(0.1, 3.6, 0.1, 0.03, soft(WOOD), ox - 2.3 + 4.3, 1.8, BACK + 0.4);
  peel.rotation.z = -0.12;
  g.add(peel, rbox(0.7, 0.5, 0.06, 0.1, soft(WOOD_LIGHT), ox + 2.22, 3.5, BACK + 0.4));
  blockers.push({ X: ox - 1.1, Z: Z + BACK + 0.7, r: 1 }, { X: ox + 1.1, Z: Z + BACK + 0.7, r: 1 });

  // The counter along the back, with the bread behind it.
  const cx = x0 + 10.1;
  const cw = 6;
  g.add(rbox(cw, TOP - 0.1, 0.9, 0.08, soft("#b07a50"), cx, (TOP - 0.1) / 2, BACK + 0.5), rbox(cw + 0.3, 0.16, 1.04, 0.06, soft(WOOD_LIGHT), cx, TOP - 0.05, BACK + 0.52));
  for (let i = 0; i < 4; i++) g.add(rbox(1.2, 0.72, 0.05, 0.06, soft("#bf8a5e"), cx - 2.1 + i * 1.4, 0.62, BACK + 0.97));
  const crust = soft("#c47e3f");
  const pale = soft("#e0a862");
  [2.2, 3.4, 4.6].forEach((y, row) => {
    g.add(rbox(cw - 0.4, 0.14, 0.62, 0.05, soft(WOOD), cx, y, BACK + 0.32));
    for (const d of [-2.4, 0, 2.4]) g.add(rbox(0.1, 0.3, 0.3, 0.04, soft(WOOD_DARK), cx + d, y - 0.2, BACK + 0.16));
    for (let i = 0; i < 7; i++) {
      const x = cx - 2.34 + i * 0.78;
      if (row === 0) {
        const loaf = ball(0.3, i % 2 ? crust : pale, x, y + 0.24, BACK + 0.34, 0.72);
        loaf.scale.x = 1.28;
        g.add(loaf);
      } else if (row === 1) g.add(ball(0.2, i % 3 ? pale : soft("#f2d9a8"), x, y + 0.2, BACK + 0.34, 0.74), ball(0.05, soft("#fbf3e2"), x, y + 0.34, BACK + 0.42));
      else if (i % 2 === 0) {
        g.add(cyl(0.34, 0.26, 0.14, soft("#d9a05e"), x, y + 0.15, BACK + 0.34, 16), cyl(0.28, 0.28, 0.03, soft(i % 4 ? "#6a3a78" : "#c9604a"), x, y + 0.23, BACK + 0.34, 16));
      }
    }
  });
  // On the counter: a cake under glass, a basket of buns, and the till.
  g.add(cyl(0.5, 0.42, 0.12, soft("#e3ecf7", 0.4), cx - 2.2, TOP + 0.09, BACK + 0.56, 18), cyl(0.38, 0.38, 0.34, soft("#fbf3e2"), cx - 2.2, TOP + 0.3, BACK + 0.56, 18), ball(0.09, soft("#e0574c"), cx - 2.2, TOP + 0.52, BACK + 0.56));
  g.add(cyl(0.46, 0.34, 0.28, soft("#c9a37a"), cx - 0.4, TOP + 0.17, BACK + 0.56, 16));
  for (const [a, b] of [[-0.18, 0], [0.16, -0.08], [0, 0.14]]) g.add(ball(0.17, pale, cx - 0.4 + a, TOP + 0.36, BACK + 0.56 + b, 0.76));
  g.add(rbox(0.8, 0.5, 0.56, 0.08, soft("#7f9a78"), cx + 2.2, TOP + 0.28, BACK + 0.56), rbox(0.66, 0.2, 0.3, 0.04, soft("#5f7a5c"), cx + 2.2, TOP + 0.6, BACK + 0.46), ball(0.05, soft("#f6d36a", 0.4), cx + 2.5, TOP + 0.34, BACK + 0.85));

  // Flour sacks in the corner, and the chalkboard above them.
  const sx = x1 - 1.9;
  const sack = soft("#efe3cc", 0.95);
  for (const [a, y, b] of [[-0.56, 0.5, 0.05], [0.56, 0.5, 0], [0, 1.26, 0.03]]) g.add(ball(0.62, sack, sx + a, y, BACK + 0.72 + b, 0.84));
  g.add(cyl(0.05, 0.16, 0.2, soft("#c9b08a"), sx, 1.88, BACK + 0.75, 8));
  g.add(rbox(2.5, 1.95, 0.1, 0.06, soft(WOOD), sx, 3.9, BACK + 0.06), noShadow(flat(chalkboard(), 2.26, 1.7, sx, 3.9, BACK + 0.13)));
  blockers.push({ X: sx - 0.5, Z: Z + BACK + 0.72, r: 0.6 }, { X: sx + 0.5, Z: Z + BACK + 0.72, r: 0.6 });

  // A table for two at the front.
  const tx = x1 - 3.1;
  const tz = 1.1;
  g.add(cyl(0.86, 0.86, 0.1, soft(WOOD_LIGHT), tx, 1.22, tz, 24), cyl(0.08, 0.1, 1.14, soft(WOOD_DARK), tx, 0.6, tz, 10), cyl(0.42, 0.46, 0.06, soft(WOOD_DARK), tx, 0.04, tz, 16));
  g.add(cyl(0.34, 0.28, 0.04, soft("#fbf3e2", 0.4), tx - 0.1, 1.3, tz, 16), ball(0.18, pale, tx - 0.1, 1.42, tz, 0.72));
  for (const d of [-1, 1]) {
    const c = chair("#8bbf74");
    c.position.set(tx + d * 1.4, 0, tz);
    c.rotation.y = -d * Math.PI / 2;
    g.add(c);
    blockers.push({ X: tx + d * 1.4, Z: Z + tz, r: 0.42 });
  }
  blockers.push({ X: tx, Z: Z + tz, r: 0.82 });
  return ox;
}

function sewing(g: THREE.Group, x0: number, x1: number, Z: number, blockers: Blocker[]): (ws: WorldState) => void {
  // The window, showing the lane as it is.
  const wx = x0 + 4.7;
  const [ww, wh, wy] = [3, 2.7, 4.1];
  g.add(rbox(ww + 0.46, wh + 0.46, 0.2, 0.14, soft(WOOD), wx, wy, BACK + 0.1));
  const lane = paint(430, 340, () => {});
  const glass = flat(lane, ww, wh, wx, wy, BACK + 0.22);
  const view = glass.material as THREE.MeshStandardMaterial;
  view.emissive.set("#ffffff");
  view.emissiveMap = view.map;
  view.emissiveIntensity = 0.85;
  g.add(glass, rbox(0.12, wh, 0.1, 0.04, soft(WOOD), wx, wy, BACK + 0.28), rbox(ww, 0.12, 0.1, 0.04, soft(WOOD), wx, wy, BACK + 0.28));
  g.add(rbox(ww + 0.8, 0.16, 0.46, 0.06, soft(WOOD_LIGHT), wx, wy - wh / 2 - 0.28, BACK + 0.26));
  for (const d of [-1, 1]) for (let i = 0; i < 3; i++) g.add(cyl(0.15, 0.18, wh + 0.6, soft("#7fb0c9"), wx + d * (ww / 2 + 0.16 + i * 0.22), wy + 0.04, BACK + 0.38 - (i % 2) * 0.07, 10));

  // Nell's mother's quilt, on the wall behind where she stands.
  const qx = x0 + 8.3;
  g.add(rbox(3.5, 0.12, 0.12, 0.05, soft(WOOD_DARK), qx, 5.6, BACK + 0.12), noShadow(flat(quilt(), 3.2, 2.4, qx, 4.34, BACK + 0.14)));

  // The treadle sewing machine.
  const mx = x0 + 11;
  g.add(rbox(2.5, 0.14, 1.04, 0.05, soft(WOOD_LIGHT), mx, TOP - 0.07, BACK + 0.62));
  const iron = soft("#3a3340", 0.5);
  for (const d of [-1.02, 1.02]) g.add(rbox(0.12, TOP - 0.2, 0.86, 0.05, iron, mx + d, (TOP - 0.2) / 2, BACK + 0.62));
  g.add(rbox(1.8, 0.1, 0.5, 0.03, iron, mx, 0.2, BACK + 0.7));
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 8, 22), iron);
  wheel.position.set(mx + 0.72, 0.62, BACK + 0.62);
  wheel.castShadow = true;
  g.add(wheel);
  g.add(rbox(1.2, 0.28, 0.42, 0.08, iron, mx, TOP + 0.16, BACK + 0.62), rbox(0.28, 0.66, 0.4, 0.08, iron, mx + 0.5, TOP + 0.5, BACK + 0.62), rbox(1.1, 0.26, 0.38, 0.1, iron, mx, TOP + 0.9, BACK + 0.62), rbox(0.12, 0.42, 0.14, 0.03, iron, mx - 0.5, TOP + 0.62, BACK + 0.62));
  g.add(cyl(0.16, 0.16, 0.05, soft("#f6d36a", 0.4), mx + 0.68, TOP + 0.9, BACK + 0.62, 14), cyl(0.05, 0.05, 0.22, soft("#e0574c"), mx + 0.1, TOP + 1.14, BACK + 0.62, 8));
  g.add(rbox(0.9, 0.05, 0.66, 0.02, soft("#e98fa0"), mx - 0.72, TOP + 0.04, BACK + 0.7));
  blockers.push({ X: mx - 0.7, Z: Z + BACK + 0.62, r: 0.62 }, { X: mx + 0.7, Z: Z + BACK + 0.62, r: 0.62 });

  // A dress form with a half-made dress pinned to it.
  const fx = x0 + 13.1;
  const fz = BACK + 0.9;
  g.add(cyl(0.34, 0.38, 0.1, soft(WOOD_DARK), fx, 0.05, fz, 16), cyl(0.05, 0.05, 1.3, soft(WOOD_DARK), fx, 0.7, fz, 8));
  const torso = ball(0.42, soft("#e6d3b4"), fx, 1.9, fz, 1.3);
  torso.scale.x = 0.92;
  g.add(torso, cyl(0.42, 0.6, 1, soft("#7fb0d9"), fx, 1.36, fz, 18), cyl(0.09, 0.14, 0.28, soft("#e6d3b4"), fx, 2.56, fz, 10));
  blockers.push({ X: fx, Z: Z + fz, r: 0.5 });

  // Rolls of cloth on the shelves in the corner.
  const sx = x1 - 1.3;
  const r = seeded(29);
  const cloth = ["#e98fa0", "#7fb0d9", "#f6d36a", "#8fcc76", "#b986c9", "#e57b5f", "#fbf3e2"];
  g.add(rbox(2.4, 6, 0.8, 0.08, soft(WOOD), sx, 3, BACK + 0.42));
  for (let k = 0; k < 4; k++) {
    const y = 0.74 + k * 1.34;
    g.add(rbox(2.1, 0.1, 0.5, 0.03, soft(WOOD_DARK), sx, y - 0.32, BACK + 0.86));
    for (let i = 0; i < 3; i++) {
      const roll = cyl(0.26, 0.26, 0.62, soft(cloth[Math.floor(r() * cloth.length)]), sx - 0.66 + i * 0.66, y, BACK + 0.9, 14);
      roll.rotation.x = Math.PI / 2;
      g.add(roll);
    }
  }
  blockers.push({ X: sx - 0.6, Z: Z + BACK + 0.5, r: 0.6 }, { X: sx + 0.6, Z: Z + BACK + 0.5, r: 0.6 });

  // A clothes rail by the front, with things Nell has finished.
  const rx = x0 + 3.9;
  const rz = 1.5;
  const wood = soft(WOOD_DARK);
  for (const d of [-1.7, 1.7]) g.add(cyl(0.05, 0.06, 2.7, wood, rx + d, 1.35, rz, 8), rbox(0.14, 0.08, 0.8, 0.03, wood, rx + d, 0.05, rz));
  const pole = cyl(0.04, 0.04, 3.5, wood, rx, 2.66, rz, 8);
  pole.rotation.z = Math.PI / 2;
  g.add(pole);
  ["#e0574c", "#f2b54a", "#7fb0d9", "#8fcc76", "#b986c9", "#e98fa0"].forEach((c, i) => {
    const x = rx - 1.35 + i * 0.54;
    g.add(cyl(0.012, 0.012, 0.2, soft("#c4ccd4", 0.4), x, 2.56, rz, 5), rbox(0.46, 1.1, 0.2, 0.08, soft(c), x, 1.92, rz), cyl(0.2, 0.3, 0.46, soft(c), x, 1.2, rz, 10));
  });
  for (const d of [-1.3, 0, 1.3]) blockers.push({ X: rx + d, Z: Z + rz, r: 0.5 });

  // A standing mirror and a basket of wool by the end wall.
  const ex = x1 - 1;
  const glassy = new THREE.Group();
  glassy.position.set(ex, 0, 0.1);
  glassy.rotation.y = -Math.PI / 2;
  glassy.add(rbox(1.2, 2.6, 0.1, 0.5, soft(WOOD), 0, 1.5, 0), rbox(1, 2.4, 0.04, 0.46, soft("#cfe7f0", 0.15), 0, 1.5, 0.07), rbox(1.2, 0.1, 0.6, 0.04, soft(WOOD_DARK), 0, 0.05, 0));
  g.add(glassy);
  blockers.push({ X: ex, Z: Z + 0.1, r: 0.4 });
  const bz = 1.9;
  g.add(cyl(0.6, 0.48, 0.62, soft("#c9a37a"), ex - 0.3, 0.31, bz, 16));
  for (const [a, b, c] of [[-0.24, 0, "#e98fa0"], [0.22, 0.1, "#7fb0d9"], [0, -0.2, "#f6d36a"]] as const) g.add(ball(0.26, soft(c), ex - 0.3 + a, 0.72, bz + b));
  blockers.push({ X: ex - 0.3, Z: Z + bz, r: 0.55 });

  let key = "";
  const context = (lane.image as HTMLCanvasElement).getContext("2d")!;
  return (ws) => {
    const v = viewOf(ws, false);
    const next = JSON.stringify(v);
    if (next === key) return;
    key = next;
    drawOutside(context, v);
    lane.needsUpdate = true;
  };
}

export function buildShop(id: "bakery" | "sewing"): RegionKit {
  const spec = REGIONS.find((r) => r.id === id)!;
  const Z = regionZ(spec.x0);
  const x0 = X(spec.x0);
  const x1 = X(spec.x1);
  const w = x1 - x0;
  const mid = (x0 + x1) / 2;
  const group = new THREE.Group();
  const g = new THREE.Group();
  g.position.z = Z;
  group.add(g);
  const flames: THREE.Object3D[] = [];
  const blockers: Blocker[] = [];
  const lights: LightSpot[] = [];
  const baking = id === "bakery";

  g.add(surround(x0, x1, BACK));
  g.add(room({
    x0, x1, back: BACK, front: FRONT, height: H,
    wall: baking ? bakeryWall(w) : sewingWall(w),
    side: baking ? "#f2cdbd" : "#efd492",
    floor: boardCanvas(w, FRONT - BACK, baking ? ["#d9a77a", "#d29f72", "#dfae82"] : ["#c98a5e", "#c48458", "#cf9064"], baking ? "#b8865c" : "#a8744e"),
    lip: WOOD_DARK,
  }));
  g.add(noShadow(rbox(w, 0.46, 0.42, 0.12, soft(WOOD_DARK), mid, 7.2, BACK + 0.21)));

  const doorX = X(baking ? 28900 : 30000);
  const door = wallDoor(1.9, 3.2, baking ? "#a8674a" : "#f2c43a");
  door.position.set(doorX, 0, BACK);
  g.add(door, rbox(1.7, 0.08, 0.9, 0.04, soft("#8fae6a"), doorX, 0.05, BACK + 1));

  let look: ((ws: WorldState) => void) | null = null;
  if (baking) {
    const ox = bakery(g, x0, x1, Z, blockers, flames);
    lights.push({ pos: [ox, 1.6, Z + BACK + 2.2], color: "#ffa45e", power: 26, on: () => true });
  } else {
    look = sewing(g, x0, x1, Z, blockers);
  }
  lights.push({ pos: [mid - 3.5, 5.2, Z + 0.6], color: "#ffdcb0", power: 18, on: () => true }, { pos: [mid + 3.5, 5.2, Z + 0.6], color: "#ffdcb0", power: 18, on: () => true });

  return {
    group,
    lights,
    blockers,
    setState(ws: WorldState) {
      look?.(ws);
    },
    update(_dt: number, t: number) {
      flicker(flames, t);
    },
  };
}
