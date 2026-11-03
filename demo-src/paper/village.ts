// Lantern Lane as a paper craft: cut card scenery stood up in layers, folded
// houses, and lanterns hanging on thread.

import * as THREE from "three";
import { BUSHES, HOUSES, lanternSpots, PAPER, POLE_H, POLE_Z, POLES, STALL, stringY, TREES, type House } from "../layout";
import { addGrain, dieCut, glowTexture, svgToCanvas, toTexture } from "../svg";
import type { Built } from "../world";

const PX = 64; // texture pixels per world unit

/** A flat piece of cut card standing in the scene. Its bottom middle sits at the given spot. */
async function card(scene: THREE.Scene, markup: string, w: number, h: number, x: number, y: number, z: number, border = 7, lean = 0): Promise<THREE.Mesh> {
  const pad = 0.2;
  const W = (w + pad * 2) * PX;
  const H = (h + pad * 2) * PX;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${-w / 2 - pad} ${-h - pad} ${w + pad * 2} ${h + pad * 2}">${markup}</svg>`;
  const tex = toTexture(dieCut(await svgToCanvas(svg, W, H), border));
  const geo = new THREE.PlaneGeometry(w + pad * 2, h + pad * 2);
  geo.translate(0, h / 2, 0);
  const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 1, shadowSide: THREE.DoubleSide }));
  front.castShadow = true;
  front.position.set(x, y, z);
  front.rotation.x = lean;
  const edge = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, color: "#a88f6c", roughness: 1, side: THREE.DoubleSide });
  for (let i = 1; i <= 4; i++) {
    const m = new THREE.Mesh(geo, edge);
    m.position.z = -i * 0.016;
    front.add(m);
  }
  scene.add(front);
  return front;
}

/** A sheet of coloured paper with fibre, as a texture. */
function sheet(color: string, w: number, h: number, draw?: (g: CanvasRenderingContext2D, W: number, H: number) => void) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * PX);
  c.height = Math.round(h * PX);
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  draw?.(g, c.width, c.height);
  // A pale cut edge, where the card's core shows
  g.strokeStyle = "#fdf6e6";
  g.lineWidth = 5;
  g.strokeRect(1, 1, c.width - 2, c.height - 2);
  addGrain(c);
  return toTexture(c);
}

const paperMat = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 1 });

function ground(scene: THREE.Scene) {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8fb56a";
  g.fillRect(0, 0, 2048, 1024);
  // Little cut tufts of a second green
  g.fillStyle = "#a1c47a";
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 1024;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      g.lineTo(x + k * 12 + 6, y - 13);
      g.lineTo(x + k * 12 + 12, y);
    }
    g.fill();
  }
  // The lane: a cut strip laid on top, with its pale edge showing
  const y = (x: number) => 640 + Math.sin(x / 260) * 26;
  const lane = (w: number, color: string) => {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    for (let x = -40; x <= 2090; x += 34) (x === -40 ? g.moveTo.bind(g) : g.lineTo.bind(g))(x, y(x) + (x % 68 ? 2 : -2));
    g.stroke();
  };
  lane(204, "#fdf6e6");
  lane(186, "#e7cd9c");
  // Stitched dashes down the middle
  g.setLineDash([26, 22]);
  lane(4, "#c4a26e");
  g.setLineDash([]);
  addGrain(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ map: toTexture(c), roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.position.z = -4;
  m.receiveShadow = true;
  scene.add(m);
}

/** A folded paper house: a box of card with a roof creased along the top. */
function house(scene: THREE.Scene, h: House, built: Built) {
  const g = new THREE.Group();
  g.position.set(h.x, 0, h.z);

  const front = sheet(h.wall, h.w, h.h, (c, W, H) => {
    const s = PX;
    // Plank lines drawn by hand
    c.strokeStyle = "rgba(90,60,30,.16)";
    c.lineWidth = 2;
    for (let y = s * 0.5; y < H; y += s * 0.5) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y + 3);
      c.stroke();
    }
    // Door, a cut layer with a pale edge
    const dx = W * 0.3 - s * 0.55;
    c.fillStyle = "#fdf6e6";
    c.fillRect(dx - 5, H - s * 2 - 5, s * 1.1 + 10, s * 2 + 5);
    c.fillStyle = h.door;
    c.fillRect(dx, H - s * 2, s * 1.1, s * 2);
    c.fillStyle = "#f0d27a";
    c.beginPath();
    c.arc(dx + s * 0.86, H - s * 1, 5, 0, 7);
    c.fill();
    if (h.shop) {
      const ax = W * 0.5;
      const aw = W * 0.42;
      const n = 6;
      for (let i = 0; i < n; i++) {
        c.fillStyle = i % 2 ? "#fbf3e2" : h.shop;
        c.beginPath();
        const x = ax + (i * aw) / n;
        c.moveTo(x, H * 0.14);
        c.lineTo(x + aw / n, H * 0.14);
        c.lineTo(x + aw / n, H * 0.27);
        c.arc(x + aw / n / 2, H * 0.27, aw / n / 2, 0, Math.PI);
        c.fill();
      }
    }
  });
  const side = sheet(h.wall, h.d, h.h);
  const dim = new THREE.Color("#d8cfc0");
  const sideMat = paperMat(side);
  sideMat.color = dim;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h, h.d), [sideMat, sideMat, sideMat, sideMat, paperMat(front), sideMat]);
  walls.position.y = h.h / 2;
  walls.castShadow = walls.receiveShadow = true;
  g.add(walls);

  // The window is its own small card, glowing, laid over the wall
  const lit = new THREE.MeshStandardMaterial({ color: "#ffe2a8", emissive: "#ffc66a", emissiveIntensity: 1.1, roughness: 1 });
  built.lit.push({ m: lit, on: 1.1 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.04), new THREE.MeshStandardMaterial({ color: "#fdf6e6", roughness: 1 }));
  frame.position.set(h.w * 0.22, h.h * 0.5, h.d / 2 + 0.02);
  const pane = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.96, 0.04), lit);
  pane.position.set(h.w * 0.22, h.h * 0.5, h.d / 2 + 0.05);
  const barV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.96, 0.03), frame.material);
  barV.position.set(h.w * 0.22, h.h * 0.5, h.d / 2 + 0.08);
  g.add(frame, pane, barV);

  // Roof: two sheets of card creased at the ridge, overhanging, with scalloped tiles
  const rise = 1.7;
  const over = 0.45;
  const slope = Math.hypot(h.d / 2 + over, rise);
  const tiles = sheet(h.roof, h.w + over * 2, slope, (c, W, H) => {
    c.strokeStyle = "rgba(0,0,0,.2)";
    c.lineWidth = 3;
    for (let y = 22, r = 0; y < H; y += 34, r++) {
      for (let x = r % 2 ? 0 : 22; x < W + 40; x += 44) {
        c.beginPath();
        c.arc(x, y, 22, 0, Math.PI);
        c.stroke();
      }
    }
  });
  const tilt = Math.atan2(rise, h.d / 2 + over);
  for (const d of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(h.w + over * 2, 0.06, slope), paperMat(tiles));
    r.position.set(0, h.h + rise / 2, (d * (h.d / 2 + over)) / 2);
    r.rotation.x = d * tilt;
    r.castShadow = true;
    g.add(r);
  }
  // The gable ends
  const gs = new THREE.Shape();
  gs.moveTo(-h.d / 2, 0);
  gs.lineTo(0, rise * (h.d / 2 / (h.d / 2 + over)));
  gs.lineTo(h.d / 2, 0);
  gs.closePath();
  const gm = new THREE.MeshStandardMaterial({ color: h.wall, roughness: 1, side: THREE.DoubleSide });
  for (const d of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(gs), gm);
    m.rotation.y = Math.PI / 2;
    m.position.set((d * h.w) / 2, h.h, 0);
    g.add(m);
  }
  scene.add(g);
}

const treeSVG = (i: number) => {
  const c = ["#5f9a5c", "#6ba65f", "#528a58"][i % 3];
  const d = ["#4f8a50", "#5a9553", "#46784d"][i % 3];
  return `<rect x="-.3" y="-2.2" width=".6" height="2.2" rx=".08" fill="#7c5a42"/>
    <path d="M-.1 -.4 V-1.8 M.12 -.2 V-1.5" stroke="#5e4330" stroke-width=".05"/>
    <circle cx="-.95" cy="-2.6" r="1" fill="${c}"/><circle cx=".95" cy="-2.7" r="1.05" fill="${c}"/><circle cx="0" cy="-3.5" r="1.3" fill="${c}"/><circle cx="0" cy="-2.5" r="1.1" fill="${c}"/>
    <path d="M-1.3 -2.8 q.3 -.4 .6 0 M.3 -3.8 q.3 -.4 .6 0 M.4 -2.6 q.3 -.4 .6 0 M-.5 -3.3 q.3 -.4 .6 0" fill="none" stroke="${d}" stroke-width=".09" stroke-linecap="round"/>`;
};

const bushSVG = `<circle cx="-.6" cy="-.45" r=".5" fill="#5f9a5c"/><circle cx=".55" cy="-.45" r=".5" fill="#5f9a5c"/><circle cx="0" cy="-.65" r=".65" fill="#6ba65f"/>
  <rect x="-1.1" y="-.42" width="2.2" height=".42" rx=".1" fill="#5f9a5c"/>
  <circle cx="-.55" cy="-.5" r=".1" fill="#f4b9c0"/><circle cx=".1" cy="-.82" r=".1" fill="#fbe08a"/><circle cx=".6" cy="-.42" r=".1" fill="#f4b9c0"/>`;

const lanternSVG = (c: string) => `<rect x="-.13" y="-.86" width=".26" height=".08" rx=".02" fill="#3a2a22"/><rect x="-.13" y="-.1" width=".26" height=".08" rx=".02" fill="#3a2a22"/>
  <ellipse cx="0" cy="-.44" rx=".34" ry=".38" fill="${c}"/>
  <path d="M-.17 -.76 Q-.3 -.44 -.17 -.12 M0 -.8 V-.08 M.17 -.76 Q.3 -.44 .17 -.12" fill="none" stroke="#00000030" stroke-width=".025"/>`;

const stallSVG = (() => {
  let stripes = "";
  for (let i = 0; i < 7; i++) stripes += `<path d="M${-2.45 + i * 0.7} -3.7 h.7 v.62 a.35 .35 0 0 1 -.7 0 Z" fill="${i % 2 ? "#fbf3e2" : "#e9583c"}"/>`;
  let wares = "";
  for (let i = 0; i < 5; i++) wares += `<ellipse cx="${-1.6 + i * 0.8}" cy="-1.5" rx=".27" ry=".31" fill="${PAPER[i]}"/>`;
  return `<rect x="-2.3" y="-3.6" width=".16" height="3.6" fill="#7c5a42"/><rect x="2.14" y="-3.6" width=".16" height="3.6" fill="#7c5a42"/>
    <rect x="-2.4" y="-1.25" width="4.8" height="1.25" fill="#a8784f"/><path d="M-2.4 -.85 H2.4 M-2.4 -.45 H2.4" stroke="#8a6040" stroke-width=".04"/>
    <rect x="-2.5" y="-1.32" width="5" height=".16" fill="#c99a5e"/>${wares}${stripes}`;
})();

const hillsSVG = (w: number, h: number, c: string, bumps: number, seed: number) => {
  let d = `M${-w / 2} 0`;
  for (let i = 0; i <= bumps; i++) {
    const x = -w / 2 + (i * w) / bumps;
    const y = -h * (0.62 + 0.38 * Math.sin(i * 1.7 + seed));
    d += ` Q${x - w / bumps / 2} ${y - h * 0.22} ${x} ${y}`;
  }
  return `<path d="${d} L${w / 2} 0 Z" fill="${c}"/>`;
};

export async function buildPaperVillage(scene: THREE.Scene): Promise<Built> {
  const built: Built = { lit: [], glows: [], lamps: [] };
  ground(scene);
  for (const h of HOUSES) house(scene, h, built);

  // Layers of cut hills behind the lane, each standing further back
  await card(scene, hillsSVG(100, 7, "#7fa684", 7, 2), 100, 7, 0, 0, -34, 14);
  await card(scene, hillsSVG(90, 4.5, "#8fb28a", 9, 0.6), 90, 4.5, 4, 0, -24, 12);

  const jobs: Promise<unknown>[] = [];
  TREES.forEach((t, i) => jobs.push(card(scene, treeSVG(i), 4.4, 5, t.x, 0, t.z, 7)));
  for (const b of BUSHES) jobs.push(card(scene, bushSVG, 2.4, 1.4, b.x, 0, b.z, 6));
  jobs.push(card(scene, stallSVG, 5.2, 4.3, STALL.x, 0, STALL.z, 7));

  // A paper moon hung on thread
  jobs.push(card(scene, `<circle cx="0" cy="-1.3" r="1.25" fill="#f8e7b4"/><circle cx="-.4" cy="-1.6" r=".2" fill="#ecd49a"/><circle cx=".4" cy="-.9" r=".28" fill="#ecd49a"/>`, 2.8, 2.8, 12, 9.5, -22, 8));

  // Thin poles and thread
  const pole = new THREE.MeshStandardMaterial({ color: "#8a6a4e", roughness: 1 });
  for (const x of POLES) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.17, POLE_H, 0.07), pole);
    p.position.set(x, POLE_H / 2, POLE_Z);
    p.castShadow = true;
    scene.add(p);
  }
  for (let p = 0; p < POLES.length - 1; p++) {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      pts.push(new THREE.Vector3(POLES[p] + (POLES[p + 1] - POLES[p]) * t, stringY(t), POLE_Z));
    }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.016, 5), new THREE.MeshStandardMaterial({ color: "#f3e8d0" })));
  }

  const glowMap = glowTexture();
  for (const s of lanternSpots()) {
    jobs.push(
      card(scene, lanternSVG(PAPER[s.i % PAPER.length]), 0.9, 0.92, s.x, s.y - 0.5, s.z, 4).then((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissive = new THREE.Color("#ffffff");
        mat.emissiveMap = mat.map;
        mat.emissiveIntensity = 0.55;
        mat.needsUpdate = true;
        built.lit.push({ m: mat, on: 0.55 });
      }),
    );
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(1.7);
    glow.position.set(s.x, s.y, s.z + 0.06);
    built.glows.push(glow);
    scene.add(glow);
  }
  for (const x of [-12.7, -4.2, 4.2, 12.7]) {
    const l = new THREE.PointLight("#ffb56a", 24, 12, 1.7);
    l.position.set(x, 3.2, POLE_Z + 0.7);
    built.lamps.push(l);
    scene.add(l);
  }
  await Promise.all(jobs);
  return built;
}
