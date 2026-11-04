// Inside your house on Lantern Lane: the stove, the kitchen corner, the rug, the music box,
// the big window, the craft table and the bookshelf, left to right as in the story.
// The walls, door and curtains take the colours of the home you chose, an upper floor adds stairs,
// and the window shows the lane as it is right now.

import * as THREE from "three";
import { PROPS, USABLES } from "../../game/layout";
import { hasAddition, type HomeChoice } from "../../logic/appearance";
import type { WorldState } from "../../logic/world";
import {
  ball, BLOCK, boardCanvas, cyl, drift, flat, flame, flicker, many, noShadow, own, paint, paintPlanks, rbox, room, seeded, soft, steam, surround, teacup, wallDoor, type Piece,
} from "../kit";
import { regionZ, worldX as X } from "../space";
import type { Blocker, LightSpot, RegionKit } from "../types";
import { homeColours, type Colours } from "./home3d";

const WOOD = "#9b6b43";
const WOOD_DARK = "#7a5340";
const WOOD_LIGHT = "#c98a5e";
const BACK = -3.4;
const FRONT = 3.4;
const H = 9;
const TOP = 1.3; // table and counter height
const PX = 40;

const shade = (c: string, to: string, by: number) => `#${new THREE.Color(c).lerp(new THREE.Color(to), by).getHexString()}`;

/** Planks in your home's wall colour, warmed a little by the room, over a panelled wainscot in its trim. */
function wallTexture(w: number, c: Colours) {
  const wall = shade(c.wall, "#e8c49a", 0.3);
  const panel = shade(c.trim, wall, 0.45);
  return paint(w * PX, H * PX, (g) => {
    paintPlanks(g, 0, 0, w * PX, H * PX, [wall, shade(wall, "#b08a60", 0.06), shade(wall, "#ffffff", 0.12)], 46, shade(wall, "#a07850", 0.2));
    const top = H * PX - 1.9 * PX;
    g.fillStyle = panel;
    g.fillRect(0, top, w * PX, 1.9 * PX);
    g.fillStyle = shade(panel, "#ffffff", 0.14);
    for (let x = 6; x < w * PX; x += 72) {
      g.beginPath();
      g.roundRect(x, top + 10, 60, 1.9 * PX - 20, 8);
      g.fill();
    }
  });
}

function hearthTiles() {
  return paint(200, 300, (c) => {
    c.fillStyle = "#d98a6a";
    c.fillRect(0, 0, 200, 300);
    for (let y = 4, j = 0; y < 300; y += 33, j++) {
      for (let x = 4, i = 0; x < 200; x += 33, i++) {
        c.fillStyle = (i + j) % 2 ? "#e59a78" : "#e9a888";
        c.beginPath();
        c.roundRect(x, y, 29, 29, 6);
        c.fill();
      }
    }
  });
}

interface View {
  sky: [string, string];
  roofs: string;
  ground: string;
  lit: boolean;
  snow: boolean;
  rain: boolean;
  flowers: boolean;
}

/** What the lane looks like through the glass at this moment. */
function viewOf(ws: WorldState, garden: boolean): View {
  const snow = ws.weather === "snow";
  const rain = ws.weather === "storm";
  const time = ws.time;
  const sky: [string, string] = rain ? ["#1b2236", "#4a5468"]
    : snow ? (time === "morning" ? ["#9fb8dc", "#fbe2d0"] : time === "sunset" ? ["#44508e", "#f6c6a2"] : ["#2f3866", "#7f8fc0"])
    : time === "night" ? ["#0e1336", "#3a3468"] : time === "sunset" ? ["#2b3a78", "#f6ad7c"] : time === "morning" ? ["#a8c6e0", "#f8e6cf"] : ["#8cc4e8", "#f4ecd2"];
  const dark = rain || time === "night" || time === "sunset";
  return {
    sky,
    roofs: snow ? "#4a5488" : dark ? "#4b4470" : "#c9745c",
    ground: snow ? "#fbfdff" : dark ? "#3f5a58" : "#a9d88a",
    lit: dark,
    snow,
    rain,
    flowers: garden && !snow,
  };
}

function drawOutside(c: CanvasRenderingContext2D, v: View) {
  const sky = c.createLinearGradient(0, 0, 0, 340);
  sky.addColorStop(0, v.sky[0]);
  sky.addColorStop(1, v.sky[1]);
  c.fillStyle = sky;
  c.fillRect(0, 0, 430, 340);
  c.fillStyle = v.roofs;
  c.beginPath();
  c.moveTo(0, 250);
  c.lineTo(90, 170);
  c.lineTo(200, 250);
  c.lineTo(240, 225);
  c.lineTo(310, 160);
  c.lineTo(385, 225);
  c.lineTo(430, 215);
  c.lineTo(430, 340);
  c.lineTo(0, 340);
  c.fill();
  if (v.snow) {
    c.strokeStyle = "#fbfdff";
    c.lineWidth = 11;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(0, 248);
    c.lineTo(90, 170);
    c.lineTo(200, 248);
    c.moveTo(240, 223);
    c.lineTo(310, 160);
    c.lineTo(385, 223);
    c.stroke();
  }
  c.fillStyle = v.lit ? "#ffd98a" : "#bfe3ef";
  c.fillRect(74, 258, 26, 28);
  c.fillRect(296, 236, 22, 24);
  c.fillStyle = v.ground;
  c.beginPath();
  c.moveTo(0, 340);
  c.lineTo(0, 300);
  c.quadraticCurveTo(80, 280, 150, 296);
  c.quadraticCurveTo(240, 316, 310, 288);
  c.quadraticCurveTo(380, 272, 430, 300);
  c.lineTo(430, 340);
  c.fill();
  if (v.flowers) {
    const r = seeded(31);
    for (let i = 0; i < 26; i++) {
      c.fillStyle = ["#f08a6a", "#f6d36a", "#e98fb4", "#fffaf0"][i % 4];
      c.beginPath();
      c.arc(r() * 430, 312 + r() * 26, 5 + r() * 3, 0, 7);
      c.fill();
    }
  }
  if (v.rain) {
    c.strokeStyle = "rgba(200,215,240,.5)";
    c.lineWidth = 2;
    const r = seeded(19);
    for (let i = 0; i < 70; i++) {
      const x = r() * 450;
      const y = r() * 340;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - 7, y + 24);
      c.stroke();
    }
  }
  if (v.snow) {
    // Frost in the corners.
    c.fillStyle = "rgba(255,255,255,.45)";
    for (const [x, y, sx, sy] of [[0, 0, 1, 1], [430, 0, -1, 1], [0, 340, 1, -1], [430, 340, -1, -1]]) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + sx * 76, y);
      c.quadraticCurveTo(x + sx * 34, y + sy * 30, x, y + sy * 76);
      c.fill();
    }
  }
}

function fallingSnow() {
  const t = paint(256, 256, (c) => {
    const r = seeded(53);
    c.fillStyle = "#ffffff";
    for (let i = 0; i < 46; i++) {
      c.globalAlpha = 0.6 + r() * 0.4;
      c.beginPath();
      c.arc(r() * 256, r() * 256, 1.8 + r() * 3, 0, 7);
      c.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Paper snowflakes taped to the glass. */
function paperFlakes() {
  return paint(440, 400, (c) => {
    c.strokeStyle = "#ffffff";
    c.fillStyle = "#ffffff";
    c.lineCap = "round";
    const flakes = [[92, 96, 60, 0], [328, 84, 52, 15], [216, 208, 68, 8], [80, 312, 48, 20], [352, 304, 60, 5], [208, 356, 32, 12]];
    for (const [cx, cy, r, rot] of flakes) {
      c.lineWidth = Math.max(5, r * 0.15);
      for (let i = 0; i < 6; i++) {
        const a = ((i * 60 + rot) * Math.PI) / 180;
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        for (const k of [0.45, 0.7]) {
          const bx = cx + Math.cos(a) * r * k;
          const by = cy + Math.sin(a) * r * k;
          const bl = r * (k === 0.45 ? 0.32 : 0.22);
          for (const da of [-0.8, 0.8]) {
            c.moveTo(bx, by);
            c.lineTo(bx + Math.cos(a + da) * bl, by + Math.sin(a + da) * bl);
          }
        }
        c.stroke();
      }
      c.beginPath();
      c.arc(cx, cy, r * 0.28, 0, 7);
      c.fill();
    }
  });
}

function quiltTexture() {
  return paint(512, 256, (c) => {
    const cols = ["#f6d36a", "#e98fa0", "#7fb0d9", "#8fcc76"];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 16; col++) {
      c.fillStyle = cols[(row * 3 + col) % 4];
      c.fillRect(col * 32, row * 32, 32, 32);
    }
    c.strokeStyle = "rgba(255,255,255,.75)";
    c.lineWidth = 2.5;
    c.setLineDash([6, 6]);
    for (let i = 1; i < 16; i++) {
      c.beginPath();
      c.moveTo(i * 32, 0);
      c.lineTo(i * 32, 256);
      c.moveTo(0, i * 32);
      c.lineTo(512, i * 32);
      c.stroke();
    }
  });
}

/** One sleeping mouse's head, chin at the origin. */
function sleepyMouse(): THREE.Group {
  const g = new THREE.Group();
  const fur = soft("#b9a497");
  const ear = soft("#f2a7a9");
  g.add(ball(0.36, fur, 0, 0.3, 0, 0.92));
  for (const d of [-1, 1]) {
    g.add(ball(0.2, fur, d * 0.3, 0.62, -0.03), ball(0.12, ear, d * 0.3, 0.62, 0.1, 1));
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 6, 12, Math.PI), soft("#4a3a34"));
    eye.position.set(d * 0.14, 0.3, 0.34);
    eye.rotation.z = Math.PI;
    g.add(eye);
  }
  g.add(ball(0.05, ear, 0, 0.22, 0.36));
  return g;
}

/** Stairs up the back wall to the floor you added, rising to the left and out of sight. */
function stairs(foot: number): THREE.Group {
  const g = new THREE.Group();
  const steps = 13;
  const run = 0.27;
  const rise = 0.62;
  for (let i = 0; i < steps; i++) {
    const x = foot - i * run;
    const y = (i + 1) * rise;
    g.add(rbox(run + 0.08, 0.14, 1, 0.04, soft(WOOD_LIGHT), x, y, BACK + 0.6));
    g.add(rbox(run, y - 0.07, 0.9, 0.03, soft(WOOD), x, (y - 0.07) / 2, BACK + 0.58));
    if (i % 2 === 0) g.add(cyl(0.035, 0.035, 1.3, soft(WOOD_DARK), x, y + 0.7, BACK + 1.04, 8));
  }
  const len = Math.hypot(run * (steps - 1), rise * (steps - 1));
  const rail = rbox(len + 0.4, 0.1, 0.1, 0.04, soft(WOOD_DARK), foot - (run * (steps - 1)) / 2, rise * (steps + 1) / 2 + 1.3, BACK + 1.04);
  rail.rotation.z = -Math.atan2(rise, run);
  g.add(rail);
  return g;
}

export interface HouseKit extends RegionKit {
  /** Repaint the room after your home changes. */
  refreshHome(home: HomeChoice): void;
}

export function buildHouse(home: HomeChoice): HouseKit {
  const Z = regionZ(7000);
  const group = new THREE.Group();
  const g = new THREE.Group();
  g.position.z = Z;
  group.add(g);
  const props: Record<string, THREE.Object3D> = {};
  const flames: THREE.Object3D[] = [];
  const puffs: THREE.Object3D[] = [];

  const x0 = X(6400);
  const x1 = X(7680);
  const mid = (x0 + x1) / 2;
  const w = x1 - x0;
  g.add(surround(x0, x1, BACK));
  const shell = room({ x0, x1, back: BACK, front: FRONT, height: H, wall: wallTexture(w, homeColours(home)), side: "#d9b285", floor: boardCanvas(w, FRONT - BACK, ["#c98a5e", "#c48458", "#cf9064"], "#a8744e"), lip: WOOD_DARK });
  g.add(shell);
  const wallMat = (shell.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
  const sideWalls = shell.children.slice(-2) as THREE.Mesh[];
  g.add(noShadow(rbox(w, 0.16, 0.14, 0.06, soft(WOOD), mid, 1.96, BACK + 0.07)), noShadow(rbox(w, 0.5, 0.44, 0.12, soft(WOOD_DARK), mid, 7.2, BACK + 0.22)));
  for (const bx of [X(6950), X(7570)]) g.add(noShadow(rbox(0.4, 7, 0.24, 0.08, soft(WOOD), bx, 3.5, BACK + 0.12)));

  // The front door, with its mat and a little snow blown in.
  const dx = X(6470);
  const yours = new THREE.Group(); // the parts that follow your home: rebuilt when it changes
  g.add(yours);
  g.add(rbox(0.7, 0.55, 0.05, 0.05, soft("#bfe3ef", 0.3), dx, 2.5, BACK + 0.27));
  const blownIn = ball(0.34, soft("#fbfdff"), dx - 0.5, 0.05, BACK + 0.8, 0.28);
  g.add(rbox(1.8, 0.08, 0.9, 0.04, soft("#8fae6a"), dx, 0.05, BACK + 1), blownIn);

  // Coat hooks with a scarf and your satchel, and a basket of logs below.
  const hx = X(6545);
  g.add(rbox(1, 0.16, 0.1, 0.05, soft(WOOD), hx, 3.7, BACK + 0.08));
  g.add(rbox(0.26, 1.6, 0.08, 0.08, soft("#7fb0c9"), hx - 0.3, 2.9, BACK + 0.16));
  for (let i = 0; i < 3; i++) g.add(rbox(0.27, 0.12, 0.09, 0.03, soft("#e3ecf7"), hx - 0.3, 3.2 - i * 0.42, BACK + 0.17));
  g.add(rbox(0.56, 0.62, 0.22, 0.14, soft("#a8674a"), hx + 0.2, 2.9, BACK + 0.18), rbox(0.58, 0.28, 0.24, 0.1, soft("#8a5a3a"), hx + 0.2, 3.06, BACK + 0.2));
  g.add(cyl(0.46, 0.38, 0.54, soft("#c9a37a"), hx, 0.27, BACK + 0.62, 16));
  for (let i = 0; i < 3; i++) {
    const log = cyl(0.11, 0.11, 0.66, soft("#9b6b43"), hx - 0.22 + i * 0.22, 0.62, BACK + 0.62, 10);
    log.rotation.x = Math.PI / 2;
    g.add(log);
  }

  // The woodstove on its tiled hearth, its pipe going up out of sight.
  const sx = X(USABLES.stove.x);
  g.add(noShadow(flat(hearthTiles(), 2.9, 4.2, sx, 2.1, BACK + 0.02)));
  g.add(rbox(3.1, 0.14, 1.9, 0.06, soft("#b7a8a0"), sx, 0.07, BACK + 0.95));
  const iron = soft("#4a4250", 0.6);
  const ironDark = soft("#3a3340", 0.6);
  for (const d of [-0.68, 0.68]) g.add(rbox(0.2, 0.34, 0.2, 0.05, ironDark, sx + d, 0.3, BACK + 0.8));
  g.add(rbox(2, 1.8, 1.3, 0.26, iron, sx, 1.34, BACK + 0.8), rbox(2.2, 0.2, 1.42, 0.08, ironDark, sx, 2.3, BACK + 0.8));
  g.add(cyl(0.2, 0.2, 7, ironDark, sx, 5.8, BACK + 0.8, 14), cyl(0.27, 0.27, 0.14, soft("#2e2834"), sx, 3.4, BACK + 0.8, 14));
  g.add(rbox(1.1, 1.05, 0.08, 0.3, soft("#2e2834"), sx, 1.16, BACK + 1.47));
  const hatch = rbox(0.14, 1, 0.48, 0.05, ironDark, sx + 0.66, 1.16, BACK + 1.7);
  hatch.rotation.y = -0.5;
  g.add(hatch, rbox(0.9, 0.07, 0.07, 0.03, soft("#2e2834"), sx, 1.98, BACK + 1.47));

  const fire = new THREE.Group();
  fire.position.set(sx, 0.72, BACK + 1.53);
  for (const [fx, s] of [[-0.24, 0.66], [0.22, 0.72], [0, 1.02]] as const) {
    const f = flame(s);
    f.position.x = fx;
    flames.push(f);
    fire.add(f);
  }
  for (const r of [-0.14, 0.14]) {
    const log = cyl(0.08, 0.08, 0.9, soft("#7a4a30"), 0, 0.06, 0.02, 10);
    log.rotation.z = Math.PI / 2 + r;
    fire.add(log);
  }
  g.add(fire);
  props.stove_fire = fire;

  // The kitchen corner: counter, kettle, jars, two shelves and the chipped teacup.
  const kx = X(USABLES.kettle.x);
  g.add(rbox(2.3, TOP - 0.1, 1.1, 0.1, soft("#b07a50"), kx, (TOP - 0.1) / 2, BACK + 0.56), rbox(2.58, 0.18, 1.24, 0.07, soft(WOOD_LIGHT), kx, TOP - 0.06, BACK + 0.6));
  for (const d of [-0.56, 0.56]) g.add(rbox(0.96, 0.9, 0.06, 0.08, soft("#bf8a5e"), kx + d, 0.58, BACK + 1.12), ball(0.05, soft("#f6d36a", 0.35), kx + d * 0.18, 0.6, BACK + 1.17));
  const kettle = new THREE.Group();
  kettle.position.set(kx - 0.3, TOP + 0.03, BACK + 0.66);
  const coral = soft("#e57b5f", 0.4);
  kettle.add(ball(0.42, coral, 0, 0.34, 0, 0.86));
  const spout = cyl(0.06, 0.12, 0.5, coral, -0.48, 0.48, 0, 12);
  spout.rotation.z = 0.8;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 18, Math.PI), soft("#3a3340"));
  handle.position.y = 0.62;
  kettle.add(spout, handle, ball(0.06, soft("#3a3340"), 0, 0.72, 0));
  g.add(kettle);
  const kettleSteam = steam(4);
  kettleSteam.position.set(kx - 0.3 - 0.66, TOP + 0.76, BACK + 0.66);
  g.add(kettleSteam);
  puffs.push(kettleSteam);
  g.add(cyl(0.2, 0.2, 0.46, own("#cfe3ec", { roughness: 0.3 }), kx + 0.7, TOP + 0.26, BACK + 0.6, 14), cyl(0.21, 0.21, 0.1, soft("#c97b6a"), kx + 0.7, TOP + 0.54, BACK + 0.6, 14));

  [3.2, 4.5].forEach((y) => {
    g.add(rbox(2.4, 0.16, 0.6, 0.06, soft(WOOD), kx, y, BACK + 0.32));
    for (const d of [-0.9, 0.9]) g.add(rbox(0.1, 0.3, 0.3, 0.04, soft(WOOD_DARK), kx + d, y - 0.22, BACK + 0.16));
  });
  ["#f6d36a", "#8fcc76"].forEach((c, i) => g.add(cyl(0.16, 0.16, 0.46, soft(c), kx - 0.3 + i * 0.42, 3.51, BACK + 0.32, 12)));
  for (const d of [0, 0.1]) g.add(ball(0.2, soft(d ? "#e3ecf7" : "#f6efe2", 0.4), kx - 0.84 + d * 1.4, 3.5, BACK + 0.14 + d, 1));
  // The chipped cup: cream with a blue band and a nick out of the rim.
  const cup = teacup(0.2, "#f6efe2");
  cup.position.set(kx + 0.72, 3.3, BACK + 0.36);
  g.add(cup, cyl(0.24, 0.17, 0.03, soft("#e3ecf7", 0.4), kx + 0.72, 3.29, BACK + 0.36, 16));
  g.add(cyl(0.206, 0.19, 0.08, soft("#7fc4dc", 0.45), kx + 0.72, 3.5, BACK + 0.36, 16), ball(0.05, soft(WOOD), kx + 0.6, 3.6, BACK + 0.5));
  ["#c97b6a", "#cfe3ec", "#f2b54a", "#b986c9"].forEach((c, i) => g.add(cyl(0.16, 0.16, 0.4 + (i % 2) * 0.12, soft(c), kx - 0.78 + i * 0.52, 4.8 + (i % 2) * 0.06, BACK + 0.32, 12)));
  for (const d of [-0.74, 0, 0.74]) {
    g.add(cyl(0.012, 0.012, 0.7, soft("#8a6a52"), kx + d, 6.6, BACK + 0.4, 5));
    const herb = cyl(0.17, 0.02, 0.56, soft("#8fae6a"), kx + d, 6.0, BACK + 0.4, 10);
    g.add(herb);
  }

  // The rug in the middle of the room, and the cushions either side.
  const rx = X(PROPS.quilt.x);
  const rugZ = 0.5;
  for (const [r, c, y] of [[1, "#c96a6a", 0.03], [0.8, "#e9a06a", 0.04], [0.56, "#f6d36a", 0.05]] as const) {
    const ring = noShadow(cyl(1, 1, 0.03, soft(c), rx, y, rugZ, 44));
    ring.scale.set(3.6 * r, 1, 1.9 * r);
    g.add(ring);
  }
  const cushions: [number, string][] = [[X(6856), "#7fc4dc"], [X(7114), "#f6d36a"]];
  for (const [cx, c] of cushions) g.add(ball(0.56, soft(c), cx, 0.28, 1.55, 0.52));

  // Quilt with two small mice asleep under it.
  const quilt = new THREE.Group();
  quilt.position.set(rx, 0, rugZ);
  const m1 = sleepyMouse();
  m1.position.set(-0.52, 0.5, -0.38);
  m1.rotation.z = 0.14;
  const m2 = sleepyMouse();
  m2.position.set(0.52, 0.5, -0.36);
  m2.rotation.z = -0.18;
  const cover = ball(1, new THREE.MeshStandardMaterial({ map: quiltTexture(), roughness: 0.9 }), 0, 0.2, 0.34);
  // Turned on its side so the patchwork doesn't pinch together at the top.
  cover.rotation.z = Math.PI / 2;
  cover.scale.set(0.5, 1.75, 0.95);
  quilt.add(m1, m2, cover);
  g.add(quilt);
  props.quilt = quilt;

  // The side table: a picture above it, books below, the music box and the candles on it.
  const tx = X(USABLES.music_box.x);
  g.add(rbox(2.7, 0.18, 1.1, 0.07, soft(WOOD_LIGHT), tx, TOP - 0.09, BACK + 0.62));
  for (const d of [-1.14, 1.14]) g.add(rbox(0.2, TOP - 0.18, 0.86, 0.06, soft(WOOD_DARK), tx + d, (TOP - 0.18) / 2, BACK + 0.62));
  g.add(rbox(2.3, 0.12, 0.8, 0.05, soft(WOOD), tx, 0.46, BACK + 0.62));
  ["#7fb0c9", "#e98fb4", "#8fae6a"].forEach((c, i) => g.add(rbox(0.22, 0.42 - i * 0.03, 0.56, 0.03, soft(c), tx - 0.7 + i * 0.26, 0.72 - i * 0.015, BACK + 0.62)));
  g.add(rbox(1.1, 1.2, 0.1, 0.1, soft(WOOD), X(7075), 4.2, BACK + 0.06), rbox(0.86, 0.96, 0.04, 0.05, soft("#f6efe2"), X(7075), 4.2, BACK + 0.13));
  g.add(ball(0.32, soft("#8fcc76"), X(7075), 3.92, BACK + 0.16, 0.7), ball(0.1, soft("#f6d36a"), X(7075) + 0.2, 4.45, BACK + 0.16));

  const box = new THREE.Group();
  box.position.set(tx + 0.66, TOP, BACK + 0.6);
  box.add(rbox(0.7, 0.42, 0.5, 0.08, soft("#a8674a"), 0, 0.21, 0), rbox(0.72, 0.07, 0.52, 0.02, soft("#f6d36a", 0.4), 0, 0.24, 0));
  const lid = new THREE.Group();
  lid.position.set(0, 0.42, -0.24);
  lid.rotation.x = -0.62;
  lid.add(rbox(0.7, 0.46, 0.06, 0.03, soft("#8a5a3a"), 0, 0.23, 0), rbox(0.56, 0.34, 0.02, 0.01, soft("#f6d36a", 0.4), 0, 0.23, 0.035));
  box.add(lid, rbox(0.18, 0.05, 0.05, 0.02, soft("#f6d36a", 0.35), 0.44, 0.22, 0), rbox(0.05, 0.2, 0.05, 0.02, soft("#f6d36a", 0.35), 0.53, 0.22, 0));
  g.add(box);

  const candles = new THREE.Group();
  candles.position.set(tx - 0.62, TOP, BACK + 0.72);
  for (const [cx, h] of [[-0.4, 0.42], [0, 0.56], [0.4, 0.36]] as const) {
    candles.add(cyl(0.17, 0.17, h, own("#cfe3ec", { transparent: true, opacity: 0.55, roughness: 0.25 }), cx, h / 2, 0, 14));
    candles.add(cyl(0.09, 0.09, h - 0.06, soft("#f6efe2"), cx, (h - 0.06) / 2, 0, 12));
    const f = flame(0.34);
    f.position.set(cx, h - 0.08, 0);
    flames.push(f);
    candles.add(f);
  }
  g.add(candles);
  props.candles = candles;

  // The big window: snow falling on the lane outside, curtains tied back, a deep sill.
  const wx = X(USABLES.window.x);
  const wy = 4.05;
  const ww = 3.9;
  const wh = 3.1;
  g.add(rbox(ww + 0.5, wh + 0.5, 0.2, 0.14, soft(WOOD), wx, wy, BACK + 0.1));
  const viewPaint = paint(430, 340, () => {});
  const outside = flat(viewPaint, ww, wh, wx, wy, BACK + 0.22);
  const view = outside.material as THREE.MeshStandardMaterial;
  view.emissive.set("#ffffff");
  view.emissiveMap = view.map;
  view.emissiveIntensity = 0.65;
  const flakes = fallingSnow();
  flakes.repeat.set(1.8, 1.4);
  const falling = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: flakes, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  falling.position.set(wx, wy, BACK + 0.24);
  g.add(outside, falling);
  const bar = soft(WOOD);
  g.add(rbox(0.14, wh, 0.1, 0.04, bar, wx, wy, BACK + 0.28), rbox(ww, 0.14, 0.1, 0.04, bar, wx, wy, BACK + 0.28));
  g.add(rbox(ww + 1, 0.18, 0.5, 0.07, soft(WOOD_LIGHT), wx, wy - wh / 2 - 0.3, BACK + 0.26));
  g.add(rbox(ww + 1.6, 0.11, 0.11, 0.05, soft(WOOD_DARK), wx, wy + wh / 2 + 0.5, BACK + 0.4));
  const curtains: THREE.Mesh[] = [];
  const curtain = soft("#e98f9a");
  for (const d of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const c = cyl(0.17, 0.2, wh + 0.8, curtain, wx + d * (ww / 2 + 0.2 + i * 0.26), wy + 0.06, BACK + 0.42 - (i % 2) * 0.08, 10);
      curtains.push(c);
      g.add(c);
    }
    g.add(rbox(0.86, 0.14, 0.5, 0.06, soft("#f6d36a"), wx + d * (ww / 2 + 0.44), wy - 0.3, BACK + 0.42));
  }
  const paper = flat(paperFlakes(), ww * 0.96, wh * 0.96, wx, wy, BACK + 0.34, true);
  g.add(paper);
  props.snowflakes = paper;

  // The craft table: paper, a cut snowflake, scissors, room for the toast, and a stool.
  const cx = X(USABLES.craft_table.x);
  g.add(rbox(2.9, 0.18, 1.1, 0.07, soft(WOOD_LIGHT), cx, TOP - 0.09, BACK + 0.62));
  for (const d of [-1.2, 1.2]) for (const e of [-0.36, 0.36]) g.add(rbox(0.18, TOP - 0.18, 0.18, 0.06, soft(WOOD_DARK), cx + d, (TOP - 0.18) / 2, BACK + 0.62 + e));
  g.add(rbox(0.8, 0.05, 0.6, 0.02, soft("#f6efe2"), cx - 0.92, TOP + 0.03, BACK + 0.6), rbox(0.72, 0.05, 0.54, 0.02, soft("#7fc4dc"), cx - 0.88, TOP + 0.08, BACK + 0.6));
  const scissors = new THREE.Group();
  scissors.position.set(cx + 0.82, TOP + 0.03, BACK + 0.78);
  for (const a of [-0.2, 0.2]) {
    const blade = rbox(0.5, 0.03, 0.06, 0.01, soft("#b9c4cc", 0.3), 0.24, 0, 0);
    blade.rotation.y = a;
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.024, 8, 14), soft("#e9583c"));
    loop.rotation.x = Math.PI / 2;
    loop.position.set(-0.1, 0, a * 0.5);
    scissors.add(blade, loop);
  }
  g.add(scissors);
  g.add(cyl(0.34, 0.34, 0.14, soft("#c97b6a"), cx - 2, 0.86, BACK + 1.3, 18));
  for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [0, 0.22]]) g.add(cyl(0.05, 0.05, 0.8, soft(WOOD_DARK), cx - 2 + a, 0.4, BACK + 1.3 + b, 8));

  const toast = new THREE.Group();
  toast.position.set(cx, TOP, BACK + 0.66);
  toast.add(cyl(0.44, 0.34, 0.05, soft("#e3ecf7", 0.4), 0, 0.03, 0, 22));
  for (const [dx2, tilt] of [[-0.14, 0.18], [0.14, -0.14]] as const) {
    const s = rbox(0.36, 0.36, 0.08, 0.1, soft("#b9773e"), dx2, 0.22, 0);
    s.rotation.set(-0.3, 0, tilt);
    const f = rbox(0.3, 0.3, 0.02, 0.08, soft("#e9b26a"), dx2, 0.22, 0.05);
    f.rotation.set(-0.3, 0, tilt);
    toast.add(s, f);
  }
  toast.add(rbox(0.14, 0.03, 0.08, 0.012, soft("#fff1b0"), 0.14, 0.34, 0.08));
  g.add(toast);
  props.toast = toast;

  // The bookshelf at the far end.
  const bx = X(7634);
  g.add(rbox(1.9, 5.6, 0.86, 0.1, soft(WOOD), bx, 2.8, BACK + 0.44), rbox(1.6, 5.3, 0.1, 0.04, soft(WOOD_DARK), bx, 2.8, BACK + 0.88));
  const r = seeded(87);
  const books: Piece[] = [];
  for (let k = 0; k < 4; k++) {
    const y = 0.42 + k * 1.28;
    g.add(rbox(1.7, 0.1, 0.5, 0.03, soft(WOOD), bx, y, BACK + 0.96));
    let px = bx - 0.72;
    while (px < bx + 0.62) {
      const bw = 0.13 + r() * 0.1;
      const bh = 0.72 + r() * 0.36;
      books.push({ x: px + bw / 2, y: y + 0.05 + bh / 2, z: BACK + 0.98, sx: bw, sy: bh, sz: 0.42, color: ["#c97b6a", "#7fb0c9", "#f2b54a", "#8fae6a", "#b986c9", "#e3ecf7"][Math.floor(r() * 6)] });
      px += bw + 0.025;
    }
  }
  g.add(many(BLOCK, books));

  // A candle-warm light from the room itself, so it never feels empty, even with the stove out.
  // Only chapter five starts with the stove cold; the story lights it.
  const stoveLit = (ws: WorldState) => ws.level !== 5 || ws.props.includes("stove_fire");
  const lights: LightSpot[] = [
    // The stove carries the room through the power cut; by day it's only a warm corner.
    { pos: [sx, 1.6, Z + BACK + 2.4], color: "#ffa45e", power: 40, on: (ws) => stoveLit(ws) && (ws.level === 5 || ws.time === "night") },
    { pos: [sx, 1.6, Z + BACK + 2.4], color: "#ffa45e", power: 12, on: (ws) => stoveLit(ws) && ws.level !== 5 && ws.time !== "night" },
    { pos: [tx - 0.62, 2.3, Z + BACK + 1.5], color: "#ffc27a", power: 16, on: (ws) => ws.props.includes("candles") },
    { pos: [mid - 3, 5.2, Z + 0.6], color: "#ffdcb0", power: 16, on: () => true },
    { pos: [mid + 6, 5.2, Z + 0.6], color: "#ffdcb0", power: 16, on: () => true },
  ];
  // Everything along the wall stops short of where you stand to use it (z = -1.2).
  const wallZ = Z + BACK + 0.65;
  const blockers: Blocker[] = [
    { X: sx, Z: Z + BACK + 0.72, r: 1 },
    ...[-0.72, 0.72].map((d) => ({ X: kx + d, Z: wallZ, r: 0.72 })),
    ...[-0.72, 0.72].map((d) => ({ X: tx + d, Z: wallZ, r: 0.72 })),
    ...[-0.8, 0.8].map((d) => ({ X: cx + d, Z: wallZ, r: 0.72 })),
    { X: cx - 2, Z: Z + BACK + 1.3, r: 0.3 },
    { X: bx, Z: Z + BACK + 0.6, r: 0.9 },
    { X: hx, Z: Z + BACK + 0.62, r: 0.4 },
    ...cushions.map(([x]) => ({ X: x, Z: Z + 1.55, r: 0.4 })),
  ];

  // Your home's colours, and what it has grown.
  const stairFoot = X(7040);
  const stairBlockers: Blocker[] = [-0.5, -1.7, -2.9].map((d) => ({ X: stairFoot + d, Z: Z + BACK + 0.5, r: 0.62 }));
  let garden = false;
  const refreshHome = (h: HomeChoice) => {
    const c = homeColours(h);
    yours.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    yours.clear();
    const door = wallDoor(1.9, 3.2, c.door);
    door.position.set(dx, 0, BACK);
    yours.add(door);
    wallMat.map?.dispose();
    wallMat.map = wallTexture(w, c);
    wallMat.needsUpdate = true;
    for (const m of sideWalls) m.material = soft(shade(shade(c.wall, "#e8c49a", 0.3), "#8a6a48", 0.14));
    for (const m of curtains) m.material = soft(c.roof);
    garden = hasAddition(h, "garden");
    for (const b of stairBlockers) if (blockers.includes(b)) blockers.splice(blockers.indexOf(b), 1);
    if (hasAddition(h, "up")) {
      yours.add(stairs(stairFoot));
      blockers.push(...stairBlockers);
    }
    viewKey = "";
  };

  let viewKey = "";
  refreshHome(home);

  return {
    group,
    lights,
    blockers,
    refreshHome,
    setState(ws: WorldState) {
      for (const [name, o] of Object.entries(props)) o.visible = ws.props.includes(name);
      const lit = stoveLit(ws);
      fire.visible = lit;
      kettleSteam.visible = lit;
      blownIn.visible = ws.weather === "snow";
      const v = viewOf(ws, garden);
      const key = JSON.stringify(v);
      if (key !== viewKey) {
        viewKey = key;
        drawOutside((viewPaint.image as HTMLCanvasElement).getContext("2d")!, v);
        viewPaint.needsUpdate = true;
      }
      // Dawn on the last morning: the glass goes pale. Daylight outside reads brighter than the room.
      view.emissiveIntensity = ws.time === "morning" || (ws.time === "afternoon" && ws.weather === "clear") ? 1.1 : 0.65;
      falling.visible = ws.weather === "snow";
    },
    update(dt: number, t: number) {
      flicker(flames, t);
      drift(puffs, t);
      flakes.offset.y += dt * 0.09;
      flakes.offset.x = Math.sin(t * 0.3) * 0.04;
    },
  };
}
