// A villager as a paper cutout: the game's own drawing, die-cut with a bare paper
// border, on card with real thickness, turning on the spot like a page.

import * as THREE from "three";
import type { CharacterId, Expression } from "../cast";
import type { Character } from "../character";
import { motionPose } from "../motion";
import { characterMarkup, FEELINGS, type Frame } from "../plush";
import { dieCut, svgToCanvas, toTexture } from "../svg";

const PX = 6; // texture pixels per drawing unit
const BOX = { x: -58, y: -128, w: 116, h: 138 };
const U = 1 / 40; // world units per drawing unit
const STEPS = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7];
const LAYERS = 5;
const GAP = 0.011;

type Key = string;

export function makePaperCharacter(id: CharacterId, start: Expression): Character {
  const root = new THREE.Group();
  const pivot = new THREE.Group(); // feeling movement
  const turner = new THREE.Group(); // turning like a page
  root.add(pivot);
  pivot.add(turner);

  const geo = new THREE.PlaneGeometry(BOX.w * U, BOX.h * U);
  geo.translate((BOX.x + BOX.w / 2) * U, -(BOX.y + BOX.h / 2) * U, 0);

  const face = new THREE.MeshStandardMaterial({ alphaTest: 0.5, roughness: 0.95, emissive: "#ffffff", emissiveIntensity: 0.16, shadowSide: THREE.DoubleSide });
  const edge = new THREE.MeshStandardMaterial({ alphaTest: 0.5, roughness: 1, color: "#b9a079", side: THREE.DoubleSide });
  const front = new THREE.Mesh(geo, face);
  front.castShadow = true;
  turner.add(front);
  for (let i = 1; i <= LAYERS; i++) {
    const m = new THREE.Mesh(geo, edge);
    m.position.z = -i * GAP;
    turner.add(m);
  }

  const cache = new Map<Key, THREE.Texture | "loading">();
  function texture(expr: Expression, frame: Frame, step: number | null): THREE.Texture | null {
    const key = `${expr}|${frame}|${step}`;
    const have = cache.get(key);
    if (have === "loading") return null;
    if (have) return have;
    cache.set(key, "loading");
    const opts = step === null
      ? { frame, flat: true, marks: true }
      : { frame, flat: true, marks: true, step, turn: 1, swing: true };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX.w * PX}" height="${BOX.h * PX}" viewBox="${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}">${characterMarkup(id, expr, opts)}</svg>`;
    void svgToCanvas(svg, BOX.w * PX, BOX.h * PX).then((c) => cache.set(key, toTexture(dieCut(c, 15))));
    return null;
  }

  let expr = start;
  let blinkAt = 1 + Math.random() * 4;
  let blinkUntil = 0;
  let facing = 1; // +1 right, -1 left
  let shown = 1;
  let walkT = 0;
  let current: THREE.Texture | null = null;

  function show(t: THREE.Texture | null) {
    if (!t || t === current) return;
    current = t;
    face.map = t;
    face.emissiveMap = t;
    edge.map = t;
    face.needsUpdate = true;
    edge.needsUpdate = true;
  }

  return {
    root,
    setFeeling(e) {
      expr = e;
    },
    update(dt, t, vx, vz, view, spin) {
      const moving = Math.hypot(vx, vz) > 0.05;
      if (vx > 0.05) facing = 1;
      if (vx < -0.05) facing = -1;
      // Turning round: the card swings through edge-on, as paper would.
      shown += (facing - shown) * Math.min(1, dt * 11);
      turner.scale.x = Math.abs(shown) < 0.04 ? 0.04 * Math.sign(facing) : shown;

      if (t > blinkAt) {
        blinkUntil = t + 0.13;
        blinkAt = t + 2 + Math.random() * 4;
      }
      if (moving) {
        walkT += dt * 11;
        const step = STEPS[Math.floor(walkT) % STEPS.length];
        show(texture(expr, "closed", step) ?? texture(expr, "closed", null));
      } else {
        show(texture(expr, t < blinkUntil ? "blink" : "closed", null) ?? texture(expr, "closed", null));
      }

      const p = moving ? { dy: Math.abs(Math.sin(walkT * 0.57)) * 0.09, angle: Math.sin(walkT * 0.57) * 0.07, sx: 1, sy: 1 } : motionPose(FEELINGS[expr].motion, t);
      pivot.position.y = p.dy;
      pivot.rotation.z = p.angle;
      pivot.scale.set(p.sx, p.sy, 1);

      // Always square to the camera, unless being spun by hand.
      const dx = view.x - root.position.x;
      const dz = view.z - root.position.z;
      root.rotation.y = Math.atan2(dx, dz) * 0.85 + spin;
    },
  };
}
