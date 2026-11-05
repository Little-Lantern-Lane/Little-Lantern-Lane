// Shared building blocks for the toy world: chunky, rounded, soft colours.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const mats = new Map<string, THREE.MeshStandardMaterial>();

/** A soft matte material; shared per colour. Don't change one you got here: use `own`. */
export function soft(color: string, roughness = 0.85): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}`;
  let m = mats.get(key);
  if (!m) mats.set(key, (m = new THREE.MeshStandardMaterial({ color, roughness })));
  return m;
}

/** A material of your own, for one you'll change (glow, fade). */
export const own = (color: string, opts: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });

/** Something that glows after dark. */
export const glowing = (color: string, power = 1) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: power, roughness: 0.5 });

export function shaded<T extends THREE.Object3D>(o: T): T {
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

export function rbox(w: number, h: number, d: number, r: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const b = shaded(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)), m));
  b.position.set(x, y, z);
  return b;
}

export function ball(r: number, m: THREE.Material, x = 0, y = 0, z = 0, sy = 1): THREE.Mesh {
  const b = shaded(new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), m));
  b.position.set(x, y, z);
  b.scale.y = sy;
  return b;
}

export function cyl(rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 18): THREE.Mesh {
  const c = shaded(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m));
  c.position.set(x, y, z);
  return c;
}

/** A gable roof, ridge along Z, sitting on y = 0. */
export function roof(w: number, d: number, rise: number, m: THREE.Material): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(0, rise);
  s.lineTo(w / 2, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.14, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -d / 2);
  return shaded(new THREE.Mesh(g, m));
}

/** A round leafy tree, feet at the origin. */
export function tree(s = 1, green = "#6ba65f", trunk = "#7c5a42"): THREE.Group {
  const g = new THREE.Group();
  g.scale.setScalar(s);
  g.add(cyl(0.2, 0.32, 1.9, soft(trunk), 0, 0.95, 0, 12));
  const leaf = soft(green);
  for (const [x, y, z, r] of [[0, 2.5, 0, 1.2], [-0.72, 2.0, 0.22, 0.82], [0.76, 2.1, 0.1, 0.86], [0.1, 3.2, -0.1, 0.8]]) g.add(ball(r, leaf, x, y, z));
  return g;
}

/** A paper lantern, hanging from its top (origin). */
export function lantern(m: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const cap = soft("#3a2a22");
  g.add(cyl(0.11, 0.12, 0.07, cap, 0, -0.04, 0, 12), ball(0.3, m, 0, -0.37, 0, 1.12), cyl(0.12, 0.11, 0.07, cap, 0, -0.71, 0, 12));
  g.traverse((o) => (o.castShadow = false));
  return g;
}

/** A ground sheet for one place, from a painted canvas. */
export function groundFrom(canvas: HTMLCanvasElement, w: number, d: number): THREE.Mesh {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

export const LANTERN_COLOURS = ["#e9583c", "#f2b54a", "#e98a3c", "#d9473f", "#f0c75e", "#c94f6d"];

// --- Rooms, water and small shared pieces, used by the workshop, house, mill and coast ---------

/** Repeatable random numbers, so a place looks the same every time. */
export function seeded(n: number): () => number {
  let s = n >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A texture painted in code. */
export function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = Math.round(w);
  c.height = Math.round(h);
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A flat picture facing +Z (walls, signs, what's outside a window). */
export function flat(t: THREE.Texture, w: number, h: number, x = 0, y = 0, z = 0, see = false): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 1, transparent: see }));
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

/** Paint upright planks over part of a canvas. */
export function paintPlanks(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cols: string[], step: number, seam: string, seed = 7) {
  const r = seeded(seed);
  g.fillStyle = seam;
  g.fillRect(x, y, w, h);
  for (let px = x, i = 0; px < x + w; px += step, i++) {
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.beginPath();
    g.roundRect(px + 1.5, y - 8, Math.min(step - 3, x + w - px - 1.5), h + 16, 6);
    g.fill();
  }
}

/** A plank floor for a room: boards running along the path. */
export function boardCanvas(w: number, d: number, cols: string[], seam: string, seed = 11): HTMLCanvasElement {
  const px = 40;
  const c = document.createElement("canvas");
  c.width = Math.round(w * px);
  c.height = Math.round(d * px);
  const g = c.getContext("2d")!;
  const r = seeded(seed);
  g.fillStyle = seam;
  g.fillRect(0, 0, c.width, c.height);
  const row = 44;
  for (let y = 0; y < c.height; y += row) {
    let x = -r() * 300;
    while (x < c.width) {
      const len = 260 + r() * 300;
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.beginPath();
      g.roundRect(x + 2, y + 2, len - 4, row - 4, 8);
      g.fill();
      x += len;
    }
  }
  return c;
}

export interface Piece {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry?: number;
  rz?: number;
  color: string;
}

/** Many small things of one shape in a single draw: stones, books, cups. */
export function many(geo: THREE.BufferGeometry, list: Piece[], roughness = 0.85): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness }), list.length);
  const mat = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();
  list.forEach((p, i) => {
    q.setFromEuler(e.set(0, p.ry ?? 0, p.rz ?? 0));
    mat.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.sx, p.sy, p.sz));
    m.setMatrixAt(i, mat);
    m.setColorAt(i, col.set(p.color));
  });
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A unit rounded block, for `many`. */
export const BLOCK = new RoundedBoxGeometry(1, 1, 1, 2, 0.16);

/** A wall of chunky stones facing +Z: centred on x, bottom at y = 0. `skip` leaves gaps. */
export function stoneWall(w: number, h: number, cols: string[], mortar: string, seed = 3, skip?: (x: number, y: number) => boolean): THREE.Group {
  const r = seeded(seed);
  const g = new THREE.Group();
  const back = rbox(w, h, 0.3, 0.05, soft(mortar), 0, h / 2, -0.15);
  back.castShadow = false;
  g.add(back);
  const list: Piece[] = [];
  const rowH = 0.52;
  for (let y = 0, row = 0; y < h - 0.1; y += rowH, row++) {
    const hh = Math.min(rowH, h - y);
    let x = -w / 2 - (row % 2 ? 0.5 : 0);
    while (x < w / 2) {
      const len = 0.75 + r() * 0.6;
      const x0 = Math.max(x, -w / 2);
      const x1 = Math.min(x + len, w / 2);
      const cx = (x0 + x1) / 2;
      if (x1 - x0 > 0.15 && !skip?.(cx, y + hh / 2)) list.push({ x: cx, y: y + hh / 2, z: 0.03 + r() * 0.05, sx: x1 - x0 - 0.06, sy: hh - 0.06, sz: 0.2, color: cols[Math.floor(r() * cols.length)] });
      x += len;
    }
  }
  const s = many(BLOCK, list);
  s.castShadow = false;
  g.add(s);
  return g;
}

/** Stop a whole set of pieces throwing shadows: walls must not shade their own room from the sun. */
export function noShadow<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => (c.castShadow = false));
  return o;
}

/** The dark that surrounds a room, with no outside to see. */
export function surround(x0: number, x1: number, back: number): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: "#1e1712", fog: false });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 90, 60), m);
  wall.position.set((x0 + x1) / 2, 20, back - 1);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 90, 80), m);
  under.rotation.x = -Math.PI / 2;
  under.position.set((x0 + x1) / 2, -0.9, back + 30);
  g.add(wall, under);
  return g;
}

export interface RoomSpec {
  x0: number;
  x1: number;
  back: number;
  front: number;
  height: number;
  wall: THREE.Texture;
  side: string;
  floor: HTMLCanvasElement;
  lip: string;
}

/** A doll's-house room: floor, back wall and side walls, open toward the camera. */
export function room(o: RoomSpec): THREE.Group {
  const g = new THREE.Group();
  const w = o.x1 - o.x0;
  const d = o.front - o.back;
  const mid = (o.x0 + o.x1) / 2;
  g.add(flat(o.wall, w, o.height, mid, o.height / 2, o.back));
  const f = groundFrom(o.floor, w, d);
  f.position.set(mid, 0, (o.back + o.front) / 2);
  g.add(f);
  g.add(rbox(w + 1, 0.8, d + 0.3, 0.2, soft(o.lip), mid, -0.42, (o.back + o.front) / 2));
  for (const x of [o.x0 - 0.3, o.x1 + 0.3]) g.add(rbox(0.6, o.height, d + 0.3, 0.14, soft(o.side), x, o.height / 2, (o.back + o.front) / 2));
  return noShadow(g);
}

/** A door on a back wall: centred on x, bottom at y = 0, facing +Z. */
export function wallDoor(w: number, h: number, color: string, frame = "#7a5340"): THREE.Group {
  const g = new THREE.Group();
  g.add(rbox(w + 0.36, h + 0.2, 0.16, 0.08, soft(frame), 0, (h + 0.2) / 2, 0.06));
  g.add(rbox(w, h, 0.14, 0.1, soft(color, 0.6), 0, h / 2, 0.14));
  for (const y of [h * 0.3, h * 0.72]) g.add(rbox(w * 0.68, h * 0.3, 0.05, 0.05, soft(color, 0.75), 0, y, 0.22));
  g.add(ball(0.08, soft("#f0d27a", 0.3), w * 0.36, h * 0.47, 0.26));
  return g;
}

/** A small fire or candle flame, base at the origin. Make it move with `flicker`. */
export function flame(s = 1): THREE.Group {
  const g = new THREE.Group();
  g.scale.setScalar(s);
  for (const [r, y, c] of [[0.3, 0.42, "#e9583c"], [0.2, 0.34, "#f2b54a"], [0.11, 0.24, "#fde6a8"]] as const) {
    // Unlit, and each layer sits in front of the last so all three colours show.
    const b = ball(r, new THREE.MeshBasicMaterial({ color: c, toneMapped: false }), 0, y, (0.3 - r) * 1.3 + 0.1, 1.7);
    b.castShadow = false;
    g.add(b);
  }
  return g;
}

export function flicker(flames: THREE.Object3D[], t: number) {
  flames.forEach((f, i) => {
    const s = f.userData.s ?? (f.userData.s = f.scale.x);
    f.scale.y = s * (1 + Math.sin(t * 9 + i * 1.7) * 0.1 + Math.sin(t * 17 + i) * 0.06);
    f.scale.x = s * (1 + Math.sin(t * 11 + i * 2.3) * 0.06);
  });
}

/** Rising steam, from the origin. Move it with `drift`. */
export function steam(n = 4, s = 1): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.4, depthWrite: false }));
    b.userData.k = i / n;
    g.add(b);
  }
  return g;
}

export function drift(puffs: THREE.Object3D[], t: number) {
  for (const p of puffs) {
    if (!p.visible) continue;
    p.children.forEach((c) => {
      const b = c as THREE.Mesh;
      const k = (t * 0.32 + (b.userData.k as number)) % 1;
      b.position.set(Math.sin(k * 7 + (b.userData.k as number) * 9) * 0.1, k * 1.1, 0);
      b.scale.setScalar(0.7 + k * 1.6);
      (b.material as THREE.MeshBasicMaterial).opacity = 0.42 * (1 - k);
    });
  }
}

/** A sheet of water, lying flat. Move it with `flow`. */
export function waterSheet(w: number, d: number, deep: string, light: string, repeat: [number, number], seed = 5): THREE.Mesh {
  const t = paint(512, 512, (g) => {
    const r = seeded(seed);
    g.fillStyle = deep;
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = light;
    // Everything is drawn again one tile over each way, so the sheet repeats without a seam.
    const wrapped = (x: number, y: number, draw: (x: number, y: number) => void) => {
      for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) draw(x + dx, y + dy);
    };
    for (let i = 0; i < 70; i++) {
      g.globalAlpha = 0.12 + r() * 0.16;
      const rx = 40 + r() * 70;
      const ry = 10 + r() * 20;
      wrapped(r() * 512, r() * 512, (x, y) => {
        g.beginPath();
        g.ellipse(x, y, rx, ry, 0, 0, 7);
        g.fill();
      });
    }
    g.globalAlpha = 0.55;
    g.strokeStyle = "#ffffff";
    g.lineWidth = 5;
    g.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      wrapped(r() * 512, r() * 512, (x, y) => {
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 18, y - 9, x + 36, y);
        g.stroke();
      });
    }
    g.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

export function flow(m: THREE.Mesh, dx: number, dy: number) {
  const t = (m.material as THREE.MeshStandardMaterial).map!;
  t.offset.x = (t.offset.x + dx) % 1;
  t.offset.y = (t.offset.y + dy) % 1;
}

/** A cup, sitting on y = 0. */
export function teacup(r: number, col: string): THREE.Group {
  const g = new THREE.Group();
  const m = soft(col, 0.45);
  g.add(cyl(r, r * 0.72, r * 1.3, m, 0, r * 0.65, 0, 16));
  const h = new THREE.Mesh(new THREE.TorusGeometry(r * 0.42, r * 0.13, 8, 14), m);
  h.position.set(r * 1.05, r * 0.68, 0);
  g.add(shaded(h));
  return g;
}

/** A round pot with a spout and lid, sitting on y = 0. */
export function teapot(r: number, col: string): THREE.Group {
  const g = new THREE.Group();
  const m = soft(col, 0.45);
  g.add(ball(r, m, 0, r * 0.82, 0, 0.86));
  const spout = cyl(r * 0.17, r * 0.27, r * 0.95, m, r * 1.12, r * 1.0, 0, 12);
  spout.rotation.z = -0.8;
  g.add(spout);
  const h = new THREE.Mesh(new THREE.TorusGeometry(r * 0.42, r * 0.11, 8, 16), m);
  h.position.set(-r * 1.02, r * 0.9, 0);
  g.add(shaded(h));
  g.add(cyl(r * 0.44, r * 0.54, r * 0.14, m, 0, r * 1.6, 0, 16), ball(r * 0.13, m, 0, r * 1.76, 0));
  return g;
}

/** Things that glow after dark, and how much by day. */
export interface Lit {
  m: THREE.MeshStandardMaterial;
  day: number;
  night: number;
}

export const isEvening = (w: { time: string; weather: string }) => w.time === "night" || w.time === "sunset" || w.weather === "storm";

export function setLit(list: Lit[], evening: boolean) {
  for (const l of list) l.m.emissiveIntensity = evening ? l.night : l.day;
}

/** Shared by every see-through material: the spot to keep in view, and where it's seen from. */
export const sight = { uYou: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() } };

/**
 * A copy of a material that dissolves between `sight`'s two points, so trees never hide the player
 * in a place the camera can turn around in. Works on instanced meshes.
 */
export function seeThrough(base: THREE.Material): THREE.Material {
  const m = base.clone();
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, sight);
    sh.vertexShader = `varying vec3 vSee;\n${sh.vertexShader}`.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      vec4 seeP = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        seeP = instanceMatrix * seeP;
      #endif
      vSee = (modelMatrix * seeP).xyz;`,
    );
    sh.fragmentShader = `varying vec3 vSee;\nuniform vec3 uYou;\nuniform vec3 uCam;\n${sh.fragmentShader}`.replace(
      "#include <clipping_planes_fragment>",
      `#include <clipping_planes_fragment>
      vec3 seeLine = uCam - uYou;
      float seeT = clamp(dot(vSee - uYou, seeLine) / dot(seeLine, seeLine), 0.0, 1.0);
      float seeD = length(vSee - (uYou + seeLine * seeT)) / 1.7;
      if (seeT > 0.02 && seeD < 1.0) {
        vec2 seeQ = floor(gl_FragCoord.xy * 0.5);
        if (seeD < 0.72 || mod(seeQ.x + seeQ.y, 2.0) < 1.0) discard;
      }`,
    );
  };
  m.customProgramCacheKey = () => "see-through";
  return m;
}
