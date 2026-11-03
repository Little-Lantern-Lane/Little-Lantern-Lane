// The Lantern Workshop: a doll's-house room with shelves of lanterns and the big table.

import * as THREE from "three";
import { USABLES } from "../../game/layout";
import type { WorldState } from "../../logic/world";
import { boardCanvas, cyl, glowing, isEvening, lantern, LANTERN_COLOURS, noShadow, own, paint, paintPlanks, rbox, room, seeded, soft, surround, wallDoor } from "../kit";
import { regionZ, worldX as X } from "../space";
import type { Blocker, LightSpot, RegionKit } from "../types";

const WOOD = "#9b6b43";
const WOOD_DARK = "#7a5340";
const WOOD_LIGHT = "#c98a5e";
const BACK = -3.4;
const FRONT = 3.4;
const H = 9;
const TABLE_TOP = 1.3;
const TABLE_Z = -2.5;

/** One paper lantern with its middle at the origin. */
function loose(col: string): THREE.Group {
  const g = new THREE.Group();
  const l = lantern(soft(col, 0.6));
  l.position.y = 0.37;
  g.add(l);
  return g;
}

export function buildWorkshop(): RegionKit {
  const Z = regionZ(5500);
  const group = new THREE.Group();
  const g = new THREE.Group();
  g.position.z = Z;
  group.add(g);

  const x0 = X(5020);
  const x1 = X(5860);
  const mid = (x0 + x1) / 2;
  const w = x1 - x0;
  const wall = paint(w * 40, H * 40, (c) => paintPlanks(c, 0, 0, w * 40, H * 40, ["#f6e3c4", "#f2dcba", "#f4e0bf"], 46, "#e3c8a0"));
  g.add(surround(x0, x1, BACK));
  g.add(room({ x0, x1, back: BACK, front: FRONT, height: H, wall, side: "#e6cba6", floor: boardCanvas(w, FRONT - BACK, ["#d9a77c", "#d3a075", "#deae84"], "#b98a62"), lip: "#a8784f" }));
  g.add(noShadow(rbox(w, 0.36, 0.2, 0.08, soft(WOOD), mid, 0.18, BACK + 0.1)), noShadow(rbox(w, 0.5, 0.42, 0.12, soft("#a8784f"), mid, 7.2, BACK + 0.2)));

  // The door out to Market Street, and the window above it.
  const door = wallDoor(2, 3.2, "#a8674a");
  door.position.set(X(5170), 0, BACK);
  g.add(door);
  g.add(rbox(1.8, 0.1, 0.9, 0.04, soft("#8fae6a"), X(5170), 0.05, BACK + 1.1));
  g.add(rbox(3, 2.3, 0.2, 0.12, soft(WOOD_LIGHT), X(5170), 5.1, BACK + 0.1));
  const glass = own("#cfe9f4", { emissive: "#bfe3ef", emissiveIntensity: 0.6, roughness: 0.3 });
  g.add(rbox(2.6, 1.9, 0.1, 0.08, glass, X(5170), 5.1, BACK + 0.2));
  g.add(rbox(0.1, 1.9, 0.08, 0.03, soft(WOOD_LIGHT), X(5170), 5.1, BACK + 0.27), rbox(2.6, 0.1, 0.08, 0.03, soft(WOOD_LIGHT), X(5170), 5.1, BACK + 0.27));

  // Two long shelves of finished lanterns.
  const sx0 = X(5340);
  const sx1 = X(5780);
  [3.7, 5.5].forEach((y, row) => {
    g.add(rbox(sx1 - sx0, 0.2, 0.74, 0.08, soft("#b98a5e"), (sx0 + sx1) / 2, y, BACK + 0.38));
    for (const bx of [sx0 + 0.5, (sx0 + sx1) / 2, sx1 - 0.5]) g.add(rbox(0.14, 0.42, 0.42, 0.05, soft(WOOD_DARK), bx, y - 0.28, BACK + 0.22));
    for (let i = 0; i < 9; i++) {
      const l = loose(LANTERN_COLOURS[(i + row * 2) % LANTERN_COLOURS.length]);
      l.position.set(sx0 + 0.45 + i * 0.9, y + 0.47, BACK + 0.42);
      g.add(l);
    }
  });

  // The big table, against the back wall so you can walk up to it from the front.
  const tx = X(USABLES.lantern_table.x);
  g.add(rbox(4.8, 0.2, 1.6, 0.09, soft(WOOD_LIGHT), tx, TABLE_TOP - 0.1, TABLE_Z));
  for (const dx of [-2.1, 2.1]) for (const dz of [-0.6, 0.6]) g.add(rbox(0.24, TABLE_TOP - 0.2, 0.24, 0.07, soft(WOOD), tx + dx, (TABLE_TOP - 0.2) / 2, TABLE_Z + dz));
  g.add(rbox(4.2, 0.12, 0.2, 0.05, soft(WOOD), tx, 0.5, TABLE_Z));

  // Half-made work at the ends of the table: paper, twine, a pot of paste.
  g.add(rbox(0.9, 0.05, 0.7, 0.02, soft("#fbf3e2"), tx + 1.8, TABLE_TOP + 0.03, TABLE_Z + 0.12), rbox(0.82, 0.05, 0.62, 0.02, soft("#f2b54a"), tx + 1.84, TABLE_TOP + 0.08, TABLE_Z + 0.1));
  g.add(cyl(0.17, 0.17, 0.24, soft("#c9a37a"), tx - 2.0, TABLE_TOP + 0.12, TABLE_Z + 0.4, 14), cyl(0.15, 0.13, 0.28, soft("#7fb0c9"), tx - 1.95, TABLE_TOP + 0.14, TABLE_Z - 0.3, 14));
  const brush = rbox(0.06, 0.5, 0.06, 0.02, soft(WOOD_DARK), tx - 1.95, TABLE_TOP + 0.4, TABLE_Z - 0.3);
  brush.rotation.z = 0.25;
  g.add(brush);

  // The heap of lanterns waiting to be carried to the square: all twelve of them.
  const heap = new THREE.Group();
  const r = seeded(29);
  const rows: [number, number, number][] = [[6, 0.34, 0.24], [4, 0.82, 0.16], [2, 1.28, 0.08]];
  let n = 0;
  for (const [count, y, dz] of rows) {
    for (let i = 0; i < count; i++) {
      const l = loose(LANTERN_COLOURS[n++ % LANTERN_COLOURS.length]);
      l.position.set(tx - 0.3 + (i - (count - 1) / 2) * 0.58 + (r() - 0.5) * 0.08, TABLE_TOP + y, TABLE_Z + (i % 2 ? dz : -dz));
      l.rotation.set((r() - 0.5) * 0.9, r() * 3, (r() - 0.5) * 0.9);
      heap.add(l);
    }
  }
  g.add(heap);

  // A basket of paper rolls, and a cupboard of paint pots.
  const px = X(5320);
  g.add(cyl(0.6, 0.48, 0.8, soft("#c9a37a"), px, 0.4, BACK + 0.8, 18));
  ["#e9583c", "#fbf3e2", "#f2b54a", "#c94f6d"].forEach((c, i) => {
    const roll = cyl(0.11, 0.11, 1.6, soft(c), px - 0.25 + (i % 2) * 0.42, 1.1, BACK + 0.66 + (i >> 1) * 0.3, 12);
    roll.rotation.z = (i - 1.5) * 0.08;
    g.add(roll);
  });
  const cx = X(5795);
  g.add(rbox(1.9, 1.2, 0.9, 0.12, soft("#bf8a5e"), cx, 0.6, BACK + 0.5), rbox(2.05, 0.14, 1, 0.06, soft(WOOD_LIGHT), cx, 1.26, BACK + 0.5));
  ["#e9583c", "#f0c75e", "#7fb0c9"].forEach((c, i) => g.add(cyl(0.2, 0.2, 0.3, soft(c, 0.5), cx - 0.55 + i * 0.55, 1.48, BACK + 0.5, 14)));

  // A round rug in the open floor.
  g.add(noShadow(cyl(2.3, 2.3, 0.04, soft("#c98a6a"), X(5440), 0.03, 0.7, 40)), noShadow(cyl(1.7, 1.7, 0.05, soft("#e9c48a"), X(5440), 0.04, 0.7, 40)));

  // Two lit lanterns hanging from out of sight, on all day: the room has only the one window.
  const hung = [X(5300), X(5720)];
  for (const hx of hung) {
    const l = lantern(glowing("#f2b54a", 0.9));
    l.position.set(hx, 6, -0.9);
    g.add(l, cyl(0.016, 0.016, 4, soft("#4a3a30"), hx, 8, -0.9, 6));
  }

  const lights: LightSpot[] = hung.map((hx) => ({ pos: [hx, 4.9, Z + 0.2], color: "#ffd9a0", power: 26, on: () => true }));
  const blockers: Blocker[] = [
    ...[-1.7, 0, 1.7].map((dx) => ({ X: tx + dx, Z: Z + TABLE_Z - 0.1, r: 0.8 })),
    { X: px, Z: Z + BACK + 0.8, r: 0.5 },
    { X: cx, Z: Z + BACK + 0.5, r: 0.7 },
    { X: cx - 0.8, Z: Z + BACK + 0.5, r: 0.5 },
  ];

  return {
    group,
    lights,
    blockers,
    setState(ws: WorldState) {
      heap.visible = ws.lanterns === "workshop";
      const dark = isEvening(ws);
      glass.color.set(dark ? "#2f3866" : "#cfe9f4");
      glass.emissiveIntensity = dark ? 0.1 : 0.6;
    },
    update() {},
  };
}
