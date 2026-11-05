// Furniture you can make or buy, drawn in the same soft toy style as everything else. Feet at the
// origin, front toward +Z. Everything uses shared materials except what glows, so throwing a piece
// away only means freeing its geometry.

import * as THREE from "three";
import type { FurnitureId } from "../logic/furniture";
import { ball, cyl, glowing, noShadow, rbox, soft } from "./kit";
import type { Colours } from "./regions/home3d";

const WOOD = "#9b6b43";
const DARK = "#7a5340";
const LIGHT = "#c98a5e";
const DRIFT = "#b7a78f";
const CREAM = "#f6efe2";

const mix = (a: string, b: string, t: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

function legs(g: THREE.Group, w: number, d: number, h: number, col: string, t = 0.14) {
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) g.add(rbox(t, h, t, 0.04, soft(col), x, h / 2, z));
}

function books(g: THREE.Group, x0: number, x1: number, y: number, z: number, seed: number) {
  const cols = ["#c97b6a", "#7fb0c9", "#f2b54a", "#8fae6a", "#b986c9", "#e3ecf7"];
  let x = x0;
  let i = seed;
  while (x < x1) {
    const w = 0.13 + (i % 3) * 0.04;
    const h = 0.56 + (i % 4) * 0.08;
    g.add(rbox(w, h, 0.34, 0.03, soft(cols[i % 6]), x + w / 2, y + h / 2, z));
    x += w + 0.03;
    i += 5;
  }
}

const MAKERS: Record<FurnitureId, (g: THREE.Group, c: Colours) => void> = {
  stool(g) {
    g.add(cyl(0.3, 0.3, 0.14, soft(LIGHT), 0, 0.84, 0, 18));
    for (const [a, b] of [[-0.18, -0.16], [0.18, -0.16], [0, 0.2]]) g.add(cyl(0.05, 0.06, 0.8, soft(DRIFT), a, 0.4, b, 8));
  },
  crate(g) {
    const m = soft(DRIFT);
    for (const y of [0.06, 0.74, 1.42]) g.add(rbox(1, 0.1, 0.62, 0.03, m, 0, y, 0));
    for (const x of [-0.46, 0.46]) g.add(rbox(0.09, 1.5, 0.62, 0.03, soft("#a3917a"), x, 0.74, 0));
    g.add(rbox(1, 1.4, 0.05, 0.02, soft("#a3917a"), 0, 0.74, -0.29));
    g.add(ball(0.17, soft("#e0574c"), -0.2, 0.96, 0.06), cyl(0.13, 0.13, 0.32, soft("#cfe3ec", 0.3), 0.22, 0.95, 0.04, 12));
  },
  side_table(g) {
    g.add(cyl(0.5, 0.5, 0.1, soft(LIGHT), 0, 1.02, 0, 24));
    g.add(cyl(0.09, 0.11, 0.96, soft(WOOD), 0, 0.5, 0, 12), cyl(0.34, 0.38, 0.08, soft(WOOD), 0, 0.05, 0, 20));
  },
  bench(g) {
    const top = cyl(0.3, 0.3, 1.9, soft(DRIFT), 0, 0.72, 0, 14);
    top.rotation.z = Math.PI / 2;
    top.scale.z = 0.7;
    g.add(top);
    for (const x of [-0.92, 0.92]) g.add(cyl(0.3, 0.3, 0.02, soft("#d8c8ae"), x + Math.sign(x) * 0.05, 0.72, 0, 14).rotateZ(Math.PI / 2));
    for (const x of [-0.6, 0.6]) g.add(cyl(0.16, 0.2, 0.56, soft("#94806a"), x, 0.28, 0, 10));
  },
  plant(g) {
    g.add(cyl(0.34, 0.26, 0.6, soft("#c97b5a"), 0, 0.3, 0, 18), cyl(0.37, 0.37, 0.1, soft("#b96a4c"), 0, 0.62, 0, 18));
    g.add(cyl(0.05, 0.07, 1, soft("#7c5a42"), 0, 1, 0, 8));
    for (const [x, y, z, r] of [[0, 1.75, 0, 0.56], [-0.42, 1.45, 0.1, 0.4], [0.42, 1.5, -0.08, 0.42], [0.08, 2.2, 0.02, 0.36]]) g.add(ball(r, soft("#6ba65f"), x, y, z));
  },
  lantern_stand(g) {
    g.add(cyl(0.3, 0.36, 0.1, soft(DARK), 0, 0.05, 0, 18), cyl(0.05, 0.06, 2.1, soft(DARK), 0, 1.12, 0, 10));
    g.add(cyl(0.3, 0.34, 0.68, glowing("#ffd98a", 1.3), 0, 2.46, 0, 14));
    g.add(cyl(0.36, 0.36, 0.07, soft(DARK), 0, 2.1, 0, 14), cyl(0.1, 0.4, 0.2, soft(DARK), 0, 2.88, 0, 14));
  },
  rug_round(g, c) {
    for (const [r, col, y] of [[1.5, c.roof, 0.03], [1.16, mix(c.wall, "#ffffff", 0.2), 0.04], [0.8, c.trim, 0.05], [0.42, mix(c.wall, "#ffffff", 0.2), 0.06]] as const) g.add(cyl(r, r, 0.02, soft(col), 0, y, 0, 40));
    noShadow(g);
  },
  chest(g) {
    g.add(rbox(1.3, 0.7, 0.86, 0.1, soft(WOOD), 0, 0.37, 0));
    const lid = cyl(0.43, 0.43, 1.3, soft(DARK), 0, 0.72, 0, 16);
    lid.rotation.z = Math.PI / 2;
    lid.scale.x = 0.7;
    g.add(lid);
    for (const x of [-0.46, 0.46]) g.add(rbox(0.1, 0.86, 0.9, 0.03, soft("#6e6a70", 0.5), x, 0.56, 0));
    g.add(rbox(0.2, 0.26, 0.06, 0.03, soft("#f0d27a", 0.35), 0, 0.68, 0.44));
  },
  chair(g, c) {
    const seat = soft(c.roof);
    const edge = soft(mix(c.roof, "#000000", 0.14));
    g.add(rbox(1.04, 0.32, 0.96, 0.14, seat, 0, 0.56, 0.02), rbox(1.04, 1.1, 0.3, 0.14, edge, 0, 1.06, -0.4));
    for (const x of [-0.56, 0.56]) g.add(rbox(0.22, 0.56, 0.96, 0.1, edge, x, 0.72, 0.02));
    g.add(rbox(0.6, 0.4, 0.16, 0.12, soft(c.wall), 0, 0.96, -0.18));
    for (const x of [-0.42, 0.42]) for (const z of [-0.36, 0.38]) g.add(cyl(0.05, 0.06, 0.4, soft(DARK), x, 0.2, z, 8));
  },
  desk(g) {
    g.add(rbox(1.9, 0.12, 0.92, 0.05, soft(LIGHT), 0, 1.2, 0));
    g.add(rbox(0.56, 1.14, 0.84, 0.06, soft(WOOD), 0.62, 0.58, 0));
    for (const y of [0.4, 0.86]) g.add(rbox(0.46, 0.34, 0.05, 0.03, soft("#b07a50"), 0.62, y, 0.44), ball(0.04, soft("#f0d27a", 0.35), 0.62, y, 0.48));
    for (const z of [-0.36, 0.36]) g.add(rbox(0.13, 1.14, 0.13, 0.04, soft(WOOD), -0.84, 0.58, z));
    g.add(rbox(0.56, 0.03, 0.42, 0.01, soft(CREAM), -0.26, 1.28, 0.08), cyl(0.09, 0.08, 0.2, soft("#7fb0c9"), 0.56, 1.36, -0.16, 10));
    const pen = cyl(0.018, 0.018, 0.4, soft("#e9583c"), 0.6, 1.5, -0.14, 6);
    pen.rotation.z = -0.3;
    g.add(pen);
  },
  bookcase(g) {
    g.add(rbox(1.5, 3.3, 0.14, 0.04, soft(DARK), 0, 1.65, -0.26));
    for (const x of [-0.72, 0.72]) g.add(rbox(0.12, 3.4, 0.62, 0.05, soft(WOOD), x, 1.7, 0));
    [0.08, 0.86, 1.64, 2.42, 3.34].forEach((y, i) => {
      g.add(rbox(1.5, 0.11, 0.62, 0.04, soft(WOOD), 0, y, 0));
      if (i < 4) books(g, -0.62, 0.56, y + 0.05, -0.02, i * 3 + 1);
    });
  },
  wardrobe(g, c) {
    g.add(rbox(1.9, 3.3, 1, 0.1, soft(WOOD), 0, 1.72, 0), rbox(2.04, 0.14, 1.12, 0.06, soft(DARK), 0, 3.42, 0));
    for (const x of [-0.46, 0.46]) {
      g.add(rbox(0.86, 2.9, 0.06, 0.05, soft(LIGHT), x, 1.72, 0.51), rbox(0.56, 1, 0.03, 0.03, soft(c.trim), x, 2.4, 0.55));
      g.add(ball(0.06, soft("#f0d27a", 0.35), x * 0.2, 1.7, 0.58));
    }
    for (const x of [-0.76, 0.76]) g.add(rbox(0.2, 0.16, 0.8, 0.04, soft(DARK), x, 0.08, 0));
  },
  bed(g, c) {
    // Along Z, with the headboard at the back.
    g.add(rbox(1.9, 0.4, 3.1, 0.08, soft(WOOD), 0, 0.36, 0));
    for (const x of [-0.8, 0.8]) for (const z of [-1.4, 1.4]) g.add(cyl(0.08, 0.1, 0.2, soft(DARK), x, 0.1, z, 8));
    g.add(rbox(2.04, 1.6, 0.18, 0.12, soft(DARK), 0, 0.8, -1.56), rbox(2.04, 0.86, 0.14, 0.1, soft(DARK), 0, 0.44, 1.56));
    g.add(rbox(1.76, 0.3, 2.9, 0.14, soft(CREAM), 0, 0.68, 0));
    g.add(rbox(1.84, 0.3, 1.9, 0.14, soft(c.roof), 0, 0.84, 0.5), rbox(1.86, 0.1, 0.38, 0.05, soft(mix(c.wall, "#ffffff", 0.3)), 0, 0.99, -0.34));
    for (const x of [-0.42, 0.42]) g.add(rbox(0.74, 0.26, 0.52, 0.13, soft("#fffaf0"), x, 0.96, -1.08));
  },
  sofa(g, c) {
    const seat = soft(c.roof);
    const edge = soft(mix(c.roof, "#000000", 0.14));
    g.add(rbox(2.5, 0.3, 1, 0.12, edge, 0, 0.42, 0), rbox(2.5, 1, 0.34, 0.16, edge, 0, 1.02, -0.42));
    for (const x of [-0.6, 0.6]) g.add(rbox(1.14, 0.28, 0.9, 0.13, seat, x, 0.7, 0.06), rbox(1.08, 0.7, 0.24, 0.12, seat, x, 1.14, -0.2));
    for (const x of [-1.3, 1.3]) g.add(rbox(0.3, 0.74, 1.08, 0.14, edge, x, 0.68, 0));
    g.add(rbox(0.46, 0.44, 0.16, 0.12, soft(c.wall), -0.72, 1.08, 0.02).rotateZ(0.2));
    for (const x of [-1.1, 1.1]) for (const z of [-0.38, 0.4]) g.add(cyl(0.06, 0.07, 0.28, soft(DARK), x, 0.14, z, 8));
  },
  moon_lamp(g) {
    g.add(cyl(0.3, 0.34, 0.14, soft("#b9c4cc", 0.4), 0, 0.07, 0, 20), cyl(0.05, 0.07, 1.1, soft("#c98a5e", 0.4), 0, 0.68, 0, 10));
    g.add(ball(0.52, glowing("#bfe0ff", 1.5), 0, 1.68, 0));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.035, 8, 34), soft("#c98a5e", 0.4));
    ring.position.y = 1.68;
    g.add(ring);
  },
};

export function furnitureModel(id: FurnitureId, c: Colours): THREE.Group {
  const g = new THREE.Group();
  MAKERS[id](g, c);
  return g;
}
