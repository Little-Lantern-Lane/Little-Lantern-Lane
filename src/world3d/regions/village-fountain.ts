// The fountain in the Square: two tiers of water that run, and freeze still in snow.

import * as THREE from "three";
import { own, soft } from "../kit";
import { dome, dot, Parts, pipe, snowMat } from "./village-parts";

const R = 2.35;
const POOL_Y = 0.8;
const TOP_Y = 3.5;
const BOWL_Y = 2.72;
const ARCS = 44;
const FALLS = 40;

export interface Fountain {
  group: THREE.Group;
  setFrozen(on: boolean): void;
  update(t: number): void;
}

function ring(r: number, tube: number, m: THREE.Material, y: number): THREE.Mesh {
  const t = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 40), m);
  t.rotation.x = Math.PI / 2;
  t.position.y = y;
  t.castShadow = true;
  t.receiveShadow = true;
  return t;
}

export function buildFountain(p: Parts): Fountain {
  const stone = soft("#e8e2f0");
  const pale = soft("#f6f2fa");
  p.add(pipe(R, R + 0.1, 0.85, stone, 0, 0.42, 0, 36), ring(R - 0.06, 0.2, pale, 0.92));
  p.add(pipe(0.34, 0.5, BOWL_Y - 0.3, stone, 0, BOWL_Y / 2 + 0.2, 0, 16));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.28, 0], [0.75, 0.1], [1.15, 0.32], [1.26, 0.46], [1.2, 0.54], [1.05, 0.44], [0.2, 0.38]].map(([x, y]) => new THREE.Vector2(x, y)), 26), pale);
  bowl.position.y = BOWL_Y - 0.42;
  bowl.castShadow = true;
  p.add(bowl, pipe(0.14, 0.22, 0.6, stone, 0, BOWL_Y + 0.25, 0, 12), dot(0.3, stone, 0, TOP_Y - 0.2, 0));

  p.winter.add(ring(R - 0.06, 0.25, snowMat(), 1.03), ring(1.2, 0.13, snowMat(), BOWL_Y + 0.2), dome(0.32, 0.3, 0.32, snowMat(), 0, TOP_Y - 0.14, 0));
  // Icicles where the water used to spill.
  const ice = soft("#d8ecf5", 0.25);
  for (let i = 0; i < 22; i++) {
    const a = i * 0.286;
    const l = 0.2 + ((i * 7) % 5) * 0.09;
    const c = pipe(0.05, 0.0, l, ice, Math.cos(a) * 1.24, BOWL_Y - l / 2 + 0.06, Math.sin(a) * 1.24, 6);
    c.castShadow = false;
    p.winter.add(c);
  }

  // Everything that moves or changes lives apart from the baked stone.
  const group = new THREE.Group();
  const water = own("#9fd6ea", { roughness: 0.2, metalness: 0.05 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(R - 0.16, 40), water);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = POOL_Y;
  pool.receiveShadow = true;
  const top = new THREE.Mesh(new THREE.CircleGeometry(1.08, 24), water);
  top.rotation.x = -Math.PI / 2;
  top.position.y = BOWL_Y + 0.08;
  group.add(pool, top);

  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), own("#c9ecf7", { roughness: 0.25, emissive: "#9fd6ea", emissiveIntensity: 0.15 }), ARCS + FALLS);
  drops.frustumCulled = false;
  group.add(drops);

  const ripples = [0, 1, 2].map(() => {
    const m = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.4, depthWrite: false });
    const o = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 40), m);
    o.rotation.x = -Math.PI / 2;
    o.position.y = POOL_Y + 0.015;
    group.add(o);
    return o;
  });

  const mtx = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const place = (i: number, x: number, y: number, z: number, r: number) => {
    drops.setMatrixAt(i, mtx.compose(v.set(x, y, z), quat, s.setScalar(r)));
  };

  let frozen = false;
  return {
    group,
    setFrozen(on) {
      frozen = on;
      drops.visible = !on;
      for (const r of ripples) r.visible = !on;
      water.color.set(on ? "#dcebf4" : "#9fd6ea");
      water.roughness = on ? 0.35 : 0.2;
    },
    update(t) {
      if (frozen) return;
      for (let i = 0; i < ARCS; i++) {
        const u = (t * 0.75 + (i * 0.618) % 1) % 1;
        const a = (i / ARCS) * Math.PI * 2;
        const rr = 0.08 + u * 0.92;
        place(i, Math.cos(a) * rr, TOP_Y + 0.05 + 3.1 * u * (0.76 - u), Math.sin(a) * rr, 0.058);
      }
      for (let i = 0; i < FALLS; i++) {
        const u = (t * 0.9 + (i * 0.382) % 1) % 1;
        const a = (i / FALLS) * Math.PI * 2 + 0.2;
        const rr = 1.26 + u * 0.38;
        place(ARCS + i, Math.cos(a) * rr, BOWL_Y + 0.08 - (BOWL_Y + 0.08 - POOL_Y) * u * u, Math.sin(a) * rr, 0.055);
      }
      drops.instanceMatrix.needsUpdate = true;
      ripples.forEach((o, i) => {
        const u = (t * 0.32 + i / 3) % 1;
        const r = 1.45 + u * 0.72;
        o.scale.set(r, r, 1);
        (o.material as THREE.MeshBasicMaterial).opacity = 0.42 * (1 - u);
      });
    },
  };
}
