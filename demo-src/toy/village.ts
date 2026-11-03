// Lantern Lane as a toy village: chunky rounded shapes in soft colours.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BUSHES, HOUSES, lanternSpots, PAPER, POLE_H, POLE_Z, POLES, STALL, stringY, TREES, type House } from "../layout";
import { glowTexture, toTexture } from "../svg";
import type { Built } from "../world";

const soft = (color: string, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });

function shadowed<T extends THREE.Object3D>(o: T): T {
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

function rbox(w: number, h: number, d: number, r: number, m: THREE.Material, x: number, y: number, z: number) {
  const b = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m));
  b.position.set(x, y, z);
  return b;
}

function roof(w: number, d: number, rise: number, m: THREE.Material) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(0, rise);
  s.lineTo(w / 2, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: 0.16, bevelThickness: 0.16, bevelSegments: 5, curveSegments: 8 });
  g.translate(0, 0, -d / 2);
  return shadowed(new THREE.Mesh(g, m));
}

function ground(): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#86ad62";
  g.fillRect(0, 0, 2048, 1024);
  // Soft patches of lighter and darker grass
  for (let i = 0; i < 420; i++) {
    g.fillStyle = Math.random() < 0.5 ? "rgba(160,200,110,.13)" : "rgba(90,130,70,.11)";
    g.beginPath();
    g.ellipse(Math.random() * 2048, Math.random() * 1024, 20 + Math.random() * 60, 12 + Math.random() * 30, 0, 0, 7);
    g.fill();
  }
  // The lane: a broad, gently curving sandy path
  const y = (x: number) => 640 + Math.sin(x / 260) * 26;
  g.strokeStyle = "#e0c896";
  g.lineWidth = 190;
  g.lineCap = "round";
  g.beginPath();
  for (let x = -40; x <= 2090; x += 20) (x === -40 ? g.moveTo.bind(g) : g.lineTo.bind(g))(x, y(x));
  g.stroke();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ map: toTexture(c), roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.position.z = -4;
  m.receiveShadow = true;
  return m;
}

function house(scene: THREE.Scene, h: House, built: Built) {
  const g = new THREE.Group();
  g.position.set(h.x, 0, h.z);
  g.add(rbox(h.w, h.h, h.d, 0.3, soft(h.wall), 0, h.h / 2, 0));
  const r = roof(h.w + 0.7, h.d + 0.8, 1.9, soft(h.roof, 0.7));
  r.position.y = h.h - 0.05;
  g.add(r);
  g.add(rbox(0.7, 1.5, 0.7, 0.12, soft("#8a6a58"), h.w * 0.26, h.h + 1.25, -0.4));
  // Door, step and porch light
  const front = h.d / 2;
  g.add(rbox(1.05, 1.9, 0.22, 0.14, soft(h.door, 0.6), -h.w * 0.2, 0.95, front + 0.04));
  g.add(rbox(1.5, 0.2, 0.7, 0.08, soft("#cbb99a"), -h.w * 0.2, 0.1, front + 0.3));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), soft("#f0d27a", 0.3));
  knob.position.set(-h.w * 0.2 + 0.32, 0.92, front + 0.18);
  g.add(knob);
  // A round-cornered window that lights up
  const glass = new THREE.MeshStandardMaterial({ color: "#ffe2a8", emissive: "#ffc66a", emissiveIntensity: 1.3, roughness: 0.3 });
  built.lit.push({ m: glass, on: 1.3 });
  g.add(rbox(1.45, 1.25, 0.14, 0.14, soft("#fbf3e2"), h.w * 0.22, h.h * 0.58, front + 0.02));
  g.add(rbox(1.15, 0.95, 0.14, 0.1, glass, h.w * 0.22, h.h * 0.58, front + 0.07));
  g.add(rbox(0.08, 0.95, 0.06, 0.03, soft("#fbf3e2"), h.w * 0.22, h.h * 0.58, front + 0.15));
  if (h.shop) {
    // A striped awning over a shop
    const n = 6;
    const w = (h.w * 0.62) / n;
    for (let i = 0; i < n; i++) {
      const a = rbox(w * 0.98, 0.16, 1.05, 0.07, soft(i % 2 ? "#fbf3e2" : h.shop), h.w * 0.22 - (n / 2 - 0.5 - i) * w * 0.68, h.h * 0.88, front + 0.42);
      a.rotation.x = 0.35;
      a.scale.x = 0.7;
      g.add(a);
    }
  }
  scene.add(g);
}

function tree(scene: THREE.Scene, x: number, z: number, s: number, i: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 1.9, 14), soft("#7c5a42")));
  trunk.position.y = 0.95;
  g.add(trunk);
  const greens = ["#5f9a5c", "#6ba65f", "#528a58"];
  const leaf = soft(greens[i % 3]);
  for (const [dx, dy, dz, r] of [[0, 2.5, 0, 1.2], [-0.72, 2.0, 0.22, 0.82], [0.76, 2.1, 0.1, 0.86], [0.1, 3.2, -0.1, 0.8]]) {
    const b = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, 26, 20), leaf));
    b.position.set(dx, dy, dz);
    g.add(b);
  }
  scene.add(g);
}

function stall(scene: THREE.Scene) {
  const g = new THREE.Group();
  g.position.set(STALL.x, 0, STALL.z);
  g.add(rbox(4.4, 1.05, 1.5, 0.14, soft("#a8784f"), 0, 0.52, 0));
  g.add(rbox(4.7, 0.16, 1.8, 0.07, soft("#c99a5e"), 0, 1.1, 0));
  for (const d of [-1, 1]) g.add(rbox(0.16, 2.6, 0.16, 0.06, soft("#7c5a42"), d * 2.1, 2.3, 0.7), rbox(0.16, 2.6, 0.16, 0.06, soft("#7c5a42"), d * 2.1, 2.3, -0.7));
  for (let i = 0; i < 7; i++) {
    const a = rbox(0.68, 0.14, 2.3, 0.06, soft(i % 2 ? "#fbf3e2" : "#e9583c"), -2.04 + i * 0.68, 3.68, 0);
    a.rotation.x = 0.1;
    g.add(a);
  }
  // Small lanterns for sale on the counter
  for (let i = 0; i < 5; i++) {
    const l = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), soft(PAPER[i], 0.6)));
    l.scale.y = 1.15;
    l.position.set(-1.6 + i * 0.8, 1.48, 0.1);
    g.add(l);
  }
  scene.add(g);
}

export function buildToyVillage(scene: THREE.Scene): Built {
  const built: Built = { lit: [], glows: [], lamps: [] };
  scene.add(ground());
  for (const h of HOUSES) house(scene, h, built);
  stall(scene);
  TREES.forEach((t, i) => tree(scene, t.x, t.z, t.s, i));

  for (const b of BUSHES) {
    const m = soft("#5f9a5c");
    for (const [dx, r] of [[-0.45, 0.48], [0.1, 0.62], [0.6, 0.44]]) {
      const s = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m));
      s.position.set(b.x + dx, r * 0.72, b.z);
      scene.add(s);
    }
    for (let i = 0; i < 5; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), soft(i % 2 ? "#f4b9c0" : "#fbe08a"));
      fl.position.set(b.x - 0.7 + i * 0.36, 0.72 + Math.sin(i * 2.3) * 0.14, b.z + 0.46);
      scene.add(fl);
    }
  }

  // Smooth pebbles along the edge of the lane, all drawn in one go
  const stones = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), soft("#cdbf9f"), 70);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < 70; i++) {
    const x = -32 + (i / 70) * 64 + Math.sin(i * 7) * 0.4;
    const z = (i % 2 ? -0.95 : 7.2) + Math.sin(i * 3.1) * 0.25 - 2.4 + 0.2;
    const r = 0.12 + (i % 4) * 0.035;
    mtx.compose(new THREE.Vector3(x, 0.03, z), new THREE.Quaternion(), new THREE.Vector3(r * 1.3, r * 0.55, r));
    stones.setMatrixAt(i, mtx);
  }
  stones.receiveShadow = true;
  scene.add(stones);

  // Far hills
  for (const [x, z, rx, ry, c] of [[-30, -34, 24, 7, "#6f9a78"], [6, -40, 30, 9, "#638f76"], [36, -32, 20, 6, "#74a07a"]] as const) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), soft(c));
    m.scale.set(rx, ry, 8);
    m.position.set(x, -1, z);
    scene.add(m);
  }

  // Poles and strings of lanterns
  const wood = soft("#7c5a42");
  for (const x of POLES) {
    const p = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, POLE_H, 12), wood));
    p.position.set(x, POLE_H / 2, POLE_Z);
    scene.add(p);
  }
  for (let p = 0; p < POLES.length - 1; p++) {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      pts.push(new THREE.Vector3(POLES[p] + (POLES[p + 1] - POLES[p]) * t, stringY(t), POLE_Z));
    }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.022, 6), soft("#4a3a30")));
  }
  const glowMap = glowTexture();
  for (const s of lanternSpots()) {
    const c = PAPER[s.i % PAPER.length];
    const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8, roughness: 0.6 });
    built.lit.push({ m, on: 0.8 });
    const l = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.3, 22, 16), m));
    l.scale.y = 1.12;
    l.position.set(s.x, s.y, s.z);
    l.castShadow = false;
    scene.add(l);
    for (const dy of [0.32, -0.32]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.07, 14), soft("#3a2a22"));
      cap.position.set(s.x, s.y + dy, s.z);
      scene.add(cap);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(2.1);
    glow.position.set(s.x, s.y, s.z + 0.05);
    built.glows.push(glow);
    scene.add(glow);
  }
  for (const x of [-12.7, -4.2, 4.2, 12.7]) {
    const l = new THREE.PointLight("#ffb56a", 26, 12, 1.7);
    l.position.set(x, 3.2, POLE_Z + 0.7);
    built.lamps.push(l);
    scene.add(l);
  }
  return built;
}
