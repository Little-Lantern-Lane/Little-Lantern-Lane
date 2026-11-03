// A villager as a soft toy: built from rounded shapes out of the same look data.
// The face is the game's own face drawing, wrapped over the front of the head,
// so all eleven feelings carry across.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { CharacterId, Expression } from "../cast";
import type { Character } from "../character";
import { motionPose } from "../motion";
import { characterMarkup, FACES, FEELINGS, LOOKS, S, SPECIES, type Frame } from "../plush";
import { svgToCanvas, toTexture } from "../svg";

const U = 1 / 40;
const R = S.headR;

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
const shiny = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.35 });

const SPHERE = new THREE.SphereGeometry(1, 40, 28);

function mesh(g: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh {
  const x = new THREE.Mesh(g, m);
  x.castShadow = true;
  return x;
}

function ball(rx: number, ry: number, rz: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const b = mesh(SPHERE, m);
  b.scale.set(rx, ry, rz);
  b.position.set(x, y, z);
  return b;
}

/** Part of an egg shape: phi around from the front, theta down from the top. */
function shell(rx: number, ry: number, rz: number, m: THREE.Material, half: number, t0: number, t1: number, around = Math.PI / 2): THREE.Mesh {
  const g = new THREE.SphereGeometry(1, 32, 20, around - half, half * 2, t0, t1 - t0);
  const s = mesh(g, m);
  s.scale.set(rx, ry, rz);
  return s;
}

function tube(pts: [number, number, number][], r: number, m: THREE.Material): THREE.Mesh {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(c, 24, r, 10), m);
}

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const b = mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.3), m);
  b.position.set(x, y, z);
  return b;
}

function ears(head: THREE.Group, id: CharacterId, hw: number, hh: number) {
  const sp = SPECIES[LOOKS[id].species];
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
        // Long ears that fall out to the side and droop.
        e.position.set(d * hw * 0.62, hh * 0.84, -R * 0.1);
        e.rotation.z = -d * 2.05;
        e.add(ball(R * 0.22, R * 0.78, R * 0.13, fur, 0, R * 0.68, 0), ball(R * 0.12, R * 0.58, R * 0.07, inner, 0, R * 0.68, R * 0.09));
        break;
      default:
        e.position.set(d * hw * 0.8, hh * 0.65, 0);
        e.add(ball(R * 0.4, R * 0.4, R * 0.2, fur));
    }
  }
  if (sp.horns) {
    const horn = felt(sp.horns);
    for (const d of [-1, 1]) head.add(tube([[d * R * 0.3, hh * 0.84, 0], [d * R * 0.42, hh * 1.2, -R * 0.08], [d * R * 0.66, hh * 1.32, -R * 0.2]], R * 0.09, horn));
  }
}

function tail(body: THREE.Group, id: CharacterId, bw: number) {
  const sp = SPECIES[LOOKS[id].species];
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
      body.add(tube([[0, y, z], [3, y - 4, z - 9], [8, y + 3, z - 16], [5, y + 10, z - 20]], 1.1, felt(sp.inner)));
      break;
    case "puff":
      body.add(ball(6.5, 6.5, 6, felt(sp.fur2), 0, y + 2, z - 1));
      break;
    default:
      body.add(ball(4.5, 4.5, 4.5, fur, 0, y, z));
  }
}

export function makeToyCharacter(id: CharacterId, start: Expression): Character {
  const look = LOOKS[id];
  const own = FACES[id];
  const sp = SPECIES[look.species];
  const has = (x: string) => (look.extras as string[]).includes(x);

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

  const root = new THREE.Group();
  const pivot = new THREE.Group(); // feeling movement, in drawing units from here down
  const body = new THREE.Group();
  root.add(pivot);
  pivot.add(body);
  body.scale.setScalar(U * look.scale);

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
  tail(body, id, bw);
  const patch = (m: THREE.Material, half: number, t0: number, t1: number, grow = 1.035, around?: number) => {
    const s = shell(brx * grow, bry * grow, brz * grow, m, half, t0, t1, around);
    s.position.y = by;
    body.add(s);
    return s;
  };
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
  if (has("lapels")) {
    const m = felt(look.accent);
    for (const d of [-1, 1]) body.add(tube([onBody(d * bw * 0.04, by - 3, 0.9), onBody(d * bw * 0.16, by + 5, 0.9), onBody(d * bw * 0.27, by + 12, 0.9)], 2.2, m));
    for (const y of [-5, -10]) body.add(ball(1.4, 1.4, 0.8, m, ...onBody(0, by + y, 0.5)));
  }
  if (has("oilskin")) {
    const m = felt(look.accent);
    body.add(tube([onBody(bw * 0.05, by + 12, 0.4), onBody(bw * 0.05, by, 0.6), onBody(bw * 0.05, by - 12, 0.4)], 0.7, m));
    for (const y of [7, 0, -7]) body.add(box(6, 2, 1.6, m, ...onBody(bw * 0.05, by + y, 0.8)));
  }
  if (has("cardigan")) {
    patch(felt(look.accent), 0.3, 0.45, 2.75);
    for (const y of [7, 1, -5]) body.add(ball(1.3, 1.3, 0.8, felt("#e7d3a8"), ...onBody(bw * 0.12, by + y, 0.8)));
    for (const d of [-1, 1]) body.add(box(bw * 0.22, bh * 0.24, 1, felt("#6f3039"), ...onBody(d * bw * 0.3, by - 6, 0)));
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
  }
  if (has("shawl")) {
    const m = felt(look.accent);
    patch(m, 3.14, 0.1, 1.35, 1.22);
    body.add(ball(bw * 0.2, bh * 0.28, 2.4, m, ...onBody(0, by + 1, 2)));
  }
  if (has("pearls")) {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = -bw * 0.34 + t * bw * 0.68;
      body.add(ball(1.5, 1.5, 1.5, shiny("#f6f1e6"), ...onBody(x, by + 11 - Math.sin(t * Math.PI) * 6, 1.2)));
    }
  }
  if (has("scarf")) {
    const m = felt(look.accent);
    const ring = mesh(new THREE.TorusGeometry(bw * 0.4, 3.8, 14, 36), m);
    ring.rotation.x = Math.PI / 2 - 0.12;
    ring.scale.y = 0.92;
    ring.position.y = -top - 1;
    body.add(ring);
    const end = box(7, bh * 0.5, 2.6, m, ...onBody(bw * 0.2, by + 3, 1.2));
    end.rotation.z = -0.1;
    body.add(end);
  }

  // Head
  const head = new THREE.Group();
  head.position.y = hy;
  body.add(head);
  const skin = sp.pattern === "wool" ? sp.face! : sp.fur;
  head.add(ball(sp.pattern === "wool" ? R * 0.86 : hw, sp.pattern === "wool" ? R * 0.92 : hh, hd, felt(skin)));
  if (sp.pattern === "wool") {
    const wool = felt(sp.fur);
    for (let i = 0; i < 11; i++) {
      const a = 0.1 * Math.PI + (i / 10) * Math.PI * 1.2 - 0.1 * Math.PI;
      head.add(ball(R * 0.42, R * 0.42, R * 0.42, wool, Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86 + R * 0.04, -R * 0.1));
    }
    head.add(ball(R * 0.98, R * 0.98, R * 0.8, wool, 0, R * 0.08, -R * 0.42));
    head.add(ball(R * 0.34, R * 0.3, R * 0.3, wool, -R * 0.26, R * 0.8, R * 0.4), ball(R * 0.36, R * 0.3, R * 0.3, wool, R * 0.24, R * 0.82, R * 0.4));
  }
  ears(head, id, hw, hh);

  // The face, wrapped over the front of the head from straight ahead.
  const SPAN = R * 1.5;
  const fx = sp.pattern === "wool" ? R * 0.86 : hw;
  const fy = sp.pattern === "wool" ? R * 0.92 : hh;
  const fg = new THREE.SphereGeometry(1, 56, 40, Math.PI / 2 - 1.5, 3, 0.1, 2.94);
  const pos = fg.getAttribute("position") as THREE.BufferAttribute;
  const uv = fg.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + (pos.getX(i) * fx * 1.012) / (2 * SPAN), 0.5 + (pos.getY(i) * fy * 1.012) / (2 * SPAN));
  const faceMat = new THREE.MeshPhysicalMaterial({ transparent: true, roughness: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const faceMesh = new THREE.Mesh(fg, faceMat);
  faceMesh.scale.set(fx * 1.012, fy * 1.012, hd * 1.012);
  faceMesh.renderOrder = 1;
  head.add(faceMesh);

  const eyeX = R * (own.spread ?? S.eyeSpread);
  const eyeY = -R * S.eyeY;
  const surf = (x: number, y: number) => hd * Math.sqrt(Math.max(0.02, 1 - (x / hw) ** 2 - (y / hh) ** 2));

  // A small raised nose
  const m = { dy: 0.42, ...(sp.muzzle ?? {}) };
  if (sp.pattern !== "wool") {
    const ny = -R * (m.dy - 0.14);
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
      const ring = mesh(new THREE.TorusGeometry(r, R * 0.035, 10, 30), gm);
      ring.position.set(d * eyeX, eyeY, surf(eyeX, eyeY) + R * 0.05);
      ring.rotation.y = d * 0.4;
      head.add(ring);
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
    const band = mesh(new THREE.CylinderGeometry(R * 0.72, R * 0.74, R * 0.42, 32), w);
    band.position.y = hh * 0.98;
    head.add(band, ball(R * 0.5, R * 0.44, R * 0.5, w, -R * 0.42, hh * 1.34, 0), ball(R * 0.5, R * 0.44, R * 0.5, w, R * 0.42, hh * 1.34, 0), ball(R * 0.56, R * 0.5, R * 0.56, w, 0, hh * 1.54, 0));
  }
  if (has("pillbox")) {
    const hat = new THREE.Group();
    hat.position.set(R * 0.18, hh * 1.0, R * 0.05);
    hat.rotation.z = -0.2;
    const crown = mesh(new THREE.CylinderGeometry(R * 0.44, R * 0.46, R * 0.34, 28), felt(hatC));
    const band = mesh(new THREE.CylinderGeometry(R * 0.47, R * 0.47, R * 0.08, 28), felt("#c9a3b6"));
    band.position.y = -R * 0.08;
    hat.add(crown, band, ball(R * 0.08, R * 0.08, R * 0.08, felt("#c9a3b6"), R * 0.42, -R * 0.06, R * 0.1));
    head.add(hat);
  }
  if (has("souwester")) {
    const c = felt(hatC);
    const dome = shell(hw * 1.02, hh * 1.14, hd * 1.04, c, 3.14, 0, 1.15);
    dome.position.y = R * 0.04;
    const brim = ball(hw * 1.24, R * 0.07, hd * 1.24, c, 0, hh * 0.5, -R * 0.1);
    brim.rotation.x = 0.14;
    head.add(dome, brim);
  }
  if (has("nursecap")) {
    head.add(box(R * 0.86, R * 0.36, R * 0.5, felt("#fbfcfe"), 0, hh * 0.96, R * 0.2), box(R * 0.88, R * 0.07, R * 0.52, felt(look.accent), 0, hh * 0.98, R * 0.21));
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

  // The feeling's small sign, floating beside the head
  const markMat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  const mark = new THREE.Sprite(markMat);
  mark.scale.set(3.2 * R * U, 3.2 * R * U, 1);
  mark.position.set(0, hy * U * look.scale, hd * 1.15 * U * look.scale);
  mark.visible = false;
  pivot.add(mark);

  // Face pictures, made as they are needed
  const faces = new Map<string, THREE.Texture | "loading">();
  function faceTexture(expr: Expression, frame: Frame): THREE.Texture | null {
    const key = `${expr}|${frame}`;
    const have = faces.get(key);
    if (have === "loading") return null;
    if (have) return have;
    faces.set(key, "loading");
    const inner = characterMarkup(id, expr, { frame, faceOnly: true });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="${-SPAN} ${S.headY - SPAN} ${SPAN * 2} ${SPAN * 2}">${inner}</svg>`;
    void svgToCanvas(svg, 768, 768).then((c) => faces.set(key, toTexture(c)));
    return null;
  }
  const marks = new Map<Expression, THREE.Texture | "loading" | "none">();
  function markTexture(expr: Expression): THREE.Texture | null {
    const have = marks.get(expr);
    if (have === "none" || have === "loading") return null;
    if (have) return have;
    const inner = characterMarkup(id, expr, { markOnly: true });
    if (!inner) {
      marks.set(expr, "none");
      return null;
    }
    marks.set(expr, "loading");
    const H = 1.6 * R;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="${-H} ${S.headY - H} ${H * 2} ${H * 2}">${inner}</svg>`;
    void svgToCanvas(svg, 384, 384).then((c) => marks.set(expr, toTexture(c)));
    return null;
  }

  let expr = start;
  let blinkAt = 1 + Math.random() * 4;
  let blinkUntil = 0;
  let walkT = 0;
  let yaw = 0;
  let shownFace: THREE.Texture | null = null;

  return {
    root,
    setFeeling(e) {
      expr = e;
    },
    update(dt, t, vx, vz, view, spin) {
      const speed = Math.hypot(vx, vz);
      const moving = speed > 0.05;

      if (t > blinkAt) {
        blinkUntil = t + 0.13;
        blinkAt = t + 2 + Math.random() * 4;
      }
      const tex = faceTexture(expr, t < blinkUntil ? "blink" : "closed") ?? faceTexture(expr, "closed");
      if (tex && tex !== shownFace) {
        shownFace = tex;
        faceMat.map = tex;
        faceMat.needsUpdate = true;
      }
      const mk = markTexture(expr);
      mark.visible = !!mk;
      if (mk && markMat.map !== mk) {
        markMat.map = mk;
        markMat.needsUpdate = true;
      }

      // Turn smoothly to walk where you're going; otherwise look toward the camera.
      const want = moving ? Math.atan2(vx, vz) : Math.atan2(view.x - root.position.x, view.z - root.position.z) * 0.6;
      let d = want - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * Math.min(1, dt * 9);
      body.rotation.y = yaw + spin;

      if (moving) walkT += dt * 11;
      const swing = moving ? Math.sin(walkT) : 0;
      legs[0].rotation.x = swing * 0.75;
      legs[1].rotation.x = -swing * 0.75;
      arms[0].rotation.x = -swing * 0.6;
      arms[1].rotation.x = swing * 0.6;

      const p = moving ? { dy: Math.abs(Math.sin(walkT)) * 0.07, angle: Math.sin(walkT) * 0.05, sx: 1, sy: 1 } : motionPose(FEELINGS[expr].motion, t);
      pivot.position.y = p.dy;
      pivot.rotation.z = p.angle;
      pivot.scale.set(p.sx, p.sy, p.sx);
    },
  };
}
