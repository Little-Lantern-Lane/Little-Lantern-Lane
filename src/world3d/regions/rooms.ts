// The rooms your home can grow: a bedroom upstairs, a side room and a cellar. Mostly empty, because
// they're yours to fill. The walls take your home's colours and the windows look out on the real day.

import * as THREE from "three";
import { REGIONS } from "../../game/layout";
import { hasAddition, type HomeChoice } from "../../logic/appearance";
import type { WorldState } from "../../logic/world";
import { ball, boardCanvas, cyl, flame, flat, flicker, noShadow, paint, rbox, room, soft, stoneWall, surround } from "../kit";
import { regionZ, worldX as X } from "../space";
import type { Blocker, LightSpot, RegionKit } from "../types";
import { homeColours } from "./home3d";
import { drawOutside, roomSide, viewOf, wallTexture } from "./house";

export interface RoomKit extends RegionKit {
  refreshHome(home: HomeChoice): void;
}
export type ExtraRoom = "bedroom" | "sitting" | "cellar";

const WOOD = "#9b6b43";
const WOOD_DARK = "#7a5340";
const WOOD_LIGHT = "#c98a5e";
const BACK = -3.4;
const FRONT = 3.4;
const H = 9;
/** How far in from the left wall the way back is. */
const EXIT = 80 / 55;

/** A window on the back wall, showing the lane as it is now. */
function outlook(g: THREE.Group, x: number, w: number, h: number, curtain: () => THREE.Mesh[]): (ws: WorldState, garden: boolean) => void {
  const y = 4.1;
  const view = paint(430, 340, () => {});
  const pane = flat(view, w, h, x, y, BACK + 0.22);
  const glass = pane.material as THREE.MeshStandardMaterial;
  glass.emissive.set("#ffffff");
  glass.emissiveMap = glass.map;
  g.add(rbox(w + 0.5, h + 0.5, 0.2, 0.14, soft(WOOD), x, y, BACK + 0.1), pane);
  g.add(rbox(0.14, h, 0.1, 0.04, soft(WOOD), x, y, BACK + 0.28), rbox(w, 0.14, 0.1, 0.04, soft(WOOD), x, y, BACK + 0.28));
  g.add(rbox(w + 1, 0.18, 0.5, 0.07, soft(WOOD_LIGHT), x, y - h / 2 - 0.3, BACK + 0.26), rbox(w + 1.6, 0.11, 0.11, 0.05, soft(WOOD_DARK), x, y + h / 2 + 0.5, BACK + 0.4));
  for (const d of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const c = cyl(0.17, 0.2, h + 0.8, soft("#e98f9a"), x + d * (w / 2 + 0.2 + i * 0.26), y + 0.06, BACK + 0.42 - (i % 2) * 0.08, 10);
      curtain().push(c);
      g.add(c);
    }
  }
  let key = "";
  return (ws, garden) => {
    const v = viewOf(ws, garden);
    const k = JSON.stringify(v);
    if (k !== key) {
      key = k;
      drawOutside((view.image as HTMLCanvasElement).getContext("2d")!, v);
      view.needsUpdate = true;
    }
    glass.emissiveIntensity = ws.time === "morning" || (ws.time === "afternoon" && ws.weather === "clear") ? 1.1 : 0.65;
  };
}

/** A framed way through the back wall, dark beyond. */
function opening(g: THREE.Group, x: number, w: number, h: number, beyond: string) {
  g.add(rbox(w + 0.4, h + 0.24, 0.16, 0.08, soft(WOOD_DARK), x, (h + 0.24) / 2, BACK + 0.06));
  g.add(rbox(w, h, 0.04, 0.03, soft(beyond), x, h / 2, BACK + 0.16));
}

function bedroom(g: THREE.Group, x0: number, x1: number, z: number, blockers: Blocker[]) {
  const ex = x0 + EXIT;
  // The top of the stairs: an opening with steps going down into it, and a rail beside it.
  opening(g, ex, 1.9, 3.2, "#2e241c");
  for (let i = 0; i < 3; i++) g.add(rbox(1.7, 0.1, 0.34, 0.03, soft(WOOD_LIGHT), ex, 0.72 - i * 0.26, BACK + 0.32));
  const railX = ex + 1.5;
  for (let i = 0; i < 4; i++) g.add(cyl(0.05, 0.05, 1.3, soft(WOOD_DARK), railX + i * 0.4, 0.65, BACK + 0.7, 8));
  g.add(rbox(1.6, 0.1, 0.12, 0.04, soft(WOOD), railX + 0.6, 1.34, BACK + 0.7));
  blockers.push({ X: railX + 0.6, Z: z + BACK + 0.6, r: 0.5 });
  // A low beam across the room, under the eaves.
  const mid = (x0 + x1) / 2;
  g.add(noShadow(rbox(x1 - x0, 0.46, 0.5, 0.1, soft(WOOD_DARK), mid, 7.2, BACK + 0.24)));
  g.add(noShadow(rbox(0.36, 7, 0.22, 0.08, soft(WOOD), mid - 2.4, 3.5, BACK + 0.11)));
  // A little rug by where the bed might go.
  for (const [r, c, y] of [[1, "#c9a37a", 0.03], [0.74, "#f6efe2", 0.04]] as const) {
    const ring = noShadow(cyl(1, 1, 0.02, soft(c), mid + 1, y, 0.8, 36));
    ring.scale.set(2.1 * r, 1, 1.3 * r);
    g.add(ring);
  }
}

function sitting(g: THREE.Group, x0: number, x1: number, z: number, blockers: Blocker[], flames: THREE.Object3D[]): number {
  const ex = x0 + EXIT;
  opening(g, ex, 1.9, 3.2, "#6e4e38");
  // A small hearth with a low fire, and a wall shelf beside it.
  const hx = x1 - 3;
  g.add(rbox(3, 3.1, 0.7, 0.1, soft("#d9c4ae"), hx, 1.55, BACK + 0.35), rbox(3.3, 0.18, 0.9, 0.06, soft(WOOD), hx, 3.14, BACK + 0.42));
  g.add(rbox(1.6, 1.5, 0.1, 0.2, soft("#3a2e28"), hx, 0.8, BACK + 0.72), rbox(3, 0.1, 0.9, 0.04, soft("#b7a8a0"), hx, 0.06, BACK + 1.06));
  const fire = new THREE.Group();
  fire.position.set(hx, 0.2, BACK + 0.8);
  for (const [fx, s] of [[-0.24, 0.6], [0.24, 0.62], [0, 0.9]] as const) {
    const f = flame(s);
    f.position.x = fx;
    flames.push(f);
    fire.add(f);
  }
  g.add(fire);
  g.add(ball(0.2, soft("#8fae6a"), hx - 1, 3.44, BACK + 0.42), cyl(0.15, 0.15, 0.4, soft("#cfe3ec", 0.3), hx + 0.9, 3.43, BACK + 0.42, 12));
  blockers.push({ X: hx - 0.9, Z: z + BACK + 0.6, r: 0.75 }, { X: hx + 0.9, Z: z + BACK + 0.6, r: 0.75 });
  return hx;
}

function cellar(g: THREE.Group, x0: number, x1: number, z: number, blockers: Blocker[], flames: THREE.Object3D[]): number {
  const w = x1 - x0;
  const mid = (x0 + x1) / 2;
  const stone = stoneWall(w, H, ["#8d8580", "#9a928a", "#7f7874", "#a09890"], "#5f5854", 21);
  stone.position.set(mid, 0, BACK + 0.14);
  g.add(noShadow(stone));
  g.add(noShadow(rbox(w, 0.5, 0.46, 0.1, soft("#5f4634"), mid, 6.5, BACK + 0.4)));
  for (const bx of [mid - 4.4, mid + 4.4]) g.add(noShadow(rbox(0.42, 6.3, 0.34, 0.08, soft("#6e5240"), bx, 3.15, BACK + 0.32)));
  // The ladder up to the hatch.
  const lx = x0 + EXIT;
  for (const d of [-0.42, 0.42]) g.add(rbox(0.1, H, 0.1, 0.03, soft(WOOD), lx + d, H / 2, BACK + 0.5));
  for (let y = 0.5; y < H; y += 0.56) g.add(rbox(0.84, 0.07, 0.08, 0.02, soft(WOOD_LIGHT), lx, y, BACK + 0.5));
  // Barrels at one end, shelves of jars along the wall.
  const barrel = (x: number, zz: number, s = 1) => {
    g.add(cyl(0.62 * s, 0.62 * s, 1.5 * s, soft("#8a6242"), x, 0.75 * s, zz, 18));
    for (const y of [0.3, 1.2]) g.add(cyl(0.65 * s, 0.65 * s, 0.09, soft("#5f5a5a", 0.5), x, y * s, zz, 18));
    g.add(cyl(0.54 * s, 0.54 * s, 0.03, soft("#a27a56"), x, 1.5 * s, zz, 18));
  };
  barrel(x1 - 1.1, BACK + 0.95);
  barrel(x1 - 2.5, BACK + 0.9, 0.9);
  blockers.push({ X: x1 - 1.1, Z: z + BACK + 0.95, r: 0.62 }, { X: x1 - 2.5, Z: z + BACK + 0.9, r: 0.56 });
  const sx = mid - 0.6;
  const cols = ["#f2b54a", "#c97b6a", "#8fcc76", "#b986c9", "#e57b5f", "#cfe3ec"];
  [1.5, 2.9, 4.3].forEach((y, k) => {
    g.add(rbox(6, 0.14, 0.62, 0.05, soft(WOOD), sx, y, BACK + 0.5));
    for (const d of [-2.6, 2.6]) g.add(rbox(0.1, 0.34, 0.34, 0.04, soft(WOOD_DARK), sx + d, y - 0.22, BACK + 0.34));
    for (let i = 0; i < 9; i++) {
      const c = cols[(i + k * 2) % 6];
      const h = 0.4 + ((i * 3 + k) % 3) * 0.1;
      g.add(cyl(0.17, 0.17, h, soft(c, 0.4), sx - 2.5 + i * 0.62, y + 0.07 + h / 2, BACK + 0.5, 12), cyl(0.18, 0.18, 0.07, soft("#f6efe2"), sx - 2.5 + i * 0.62, y + 0.1 + h, BACK + 0.5, 12));
    }
  });
  blockers.push(...[-2.2, -0.7, 0.7, 2.2].map((d) => ({ X: sx + d, Z: z + BACK + 0.4, r: 0.55 })));
  // One warm lamp on a hook.
  const lampX = mid + 2.2;
  g.add(cyl(0.015, 0.015, 1.4, soft("#4a4250"), lampX, 5.5, 0.4, 6), cyl(0.22, 0.26, 0.42, soft("#4a4250", 0.6), lampX, 4.6, 0.4, 12));
  const lamp = flame(0.42);
  lamp.position.set(lampX, 4.32, 0.4);
  flames.push(lamp);
  g.add(lamp);
  return lampX;
}

export function buildRoom(id: ExtraRoom, home: HomeChoice): RoomKit {
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
  const cold = id === "cellar";

  const floor = cold ? boardCanvas(w, FRONT - BACK, ["#8a8078", "#7f766e", "#938a80"], "#5f5854", 9) : boardCanvas(w, FRONT - BACK, ["#c98a5e", "#c48458", "#cf9064"], "#a8744e", 12);
  const blank = paint(4, 4, (c) => {
    c.fillStyle = "#6f6862";
    c.fillRect(0, 0, 4, 4);
  });
  const shell = room({ x0, x1, back: BACK, front: FRONT, height: H, wall: cold ? blank : wallTexture(w, homeColours(home)), side: cold ? "#6f6862" : "#d9b285", floor, lip: WOOD_DARK });
  g.add(surround(x0, x1, BACK), shell);
  const wallMat = (shell.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
  const sideWalls = shell.children.slice(-2) as THREE.Mesh[];

  const curtains: THREE.Mesh[] = [];
  let look: ((ws: WorldState, garden: boolean) => void) | null = null;
  if (id === "bedroom") {
    bedroom(g, x0, x1, Z, blockers);
    look = outlook(g, mid + 2.6, 3.2, 2.8, () => curtains);
    lights.push({ pos: [mid - 3, 5.2, Z + 0.6], color: "#ffdcb0", power: 18, on: () => true }, { pos: [mid + 3.5, 5.2, Z + 0.6], color: "#ffdcb0", power: 18, on: () => true });
  } else if (id === "sitting") {
    const hx = sitting(g, x0, x1, Z, blockers, flames);
    look = outlook(g, mid - 1, 4.4, 3, () => curtains);
    lights.push({ pos: [hx, 1.4, Z + BACK + 2], color: "#ffa45e", power: 22, on: () => true }, { pos: [mid - 3, 5.2, Z + 0.6], color: "#ffdcb0", power: 18, on: () => true }, { pos: [mid + 2, 5.2, Z + 0.6], color: "#ffdcb0", power: 14, on: () => true });
  } else {
    const lampX = cellar(g, x0, x1, Z, blockers, flames);
    lights.push({ pos: [lampX, 4, Z + 0.8], color: "#ffc27a", power: 30, on: () => true }, { pos: [mid - 3.5, 4.6, Z + 0.8], color: "#ffc98a", power: 20, on: () => true });
  }

  let garden = false;
  let latest: WorldState | null = null;
  const refreshHome = (h: HomeChoice) => {
    garden = hasAddition(h, "garden");
    if (cold) return;
    const c = homeColours(h);
    wallMat.map?.dispose();
    wallMat.map = wallTexture(w, c);
    wallMat.needsUpdate = true;
    for (const m of sideWalls) m.material = soft(roomSide(c));
    for (const m of curtains) m.material = soft(c.roof);
    if (latest) look?.(latest, garden);
  };
  refreshHome(home);

  return {
    group,
    lights,
    blockers,
    refreshHome,
    setState(ws: WorldState) {
      latest = ws;
      look?.(ws, garden);
    },
    update(_dt: number, t: number) {
      flicker(flames, t);
    },
  };
}
