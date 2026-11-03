// One small stretch of Lantern Lane, as data, so both styles show the same place.

import type { CharacterId, Expression } from "./cast";

export const PAPER = ["#e9583c", "#f2b54a", "#e98a3c", "#d9473f", "#f0c75e", "#c94f6d"];

export const WALK = { x0: -19, x1: 19, z0: -2.6, z1: 5.5 };

export interface House {
  x: number; z: number; w: number; d: number; h: number;
  wall: string; roof: string; door: string; shop?: string;
}

export const HOUSES: House[] = [
  { x: -14.5, z: -7.5, w: 5.4, d: 4.4, h: 3, wall: "#ecd0a6", roof: "#b5563e", door: "#5f7f9c" },
  { x: -7.6, z: -8, w: 6, d: 4.4, h: 3.5, wall: "#d9b48f", roof: "#55776f", door: "#a8483a", shop: "#e9583c" },
  { x: 7.6, z: -7.6, w: 5.6, d: 4.4, h: 3.2, wall: "#f0dcb8", roof: "#7c4f6a", door: "#4f7d72", shop: "#f2b54a" },
  { x: 14.6, z: -8, w: 5.2, d: 4.4, h: 2.9, wall: "#c9c3a4", roof: "#a8663c", door: "#7c4f6a" },
];

export const STALL = { x: 0.4, z: -5 };

export const TREES: { x: number; z: number; s: number }[] = [
  { x: -18.5, z: -4.2, s: 1.15 }, { x: -3.7, z: -8.6, s: 1.3 }, { x: 3.9, z: -9.2, s: 1.05 },
  { x: 18.8, z: -4.6, s: 1.2 }, { x: -11, z: -11.5, s: 1.4 }, { x: 11, z: -12, s: 1.35 },
  { x: -21.5, z: 1.5, s: 1.3 }, { x: 22, z: 2, s: 1.25 },
];

export const BUSHES: { x: number; z: number }[] = [
  { x: -11, z: -5.2 }, { x: -4.8, z: -5.4 }, { x: 4.9, z: -5.2 }, { x: 11.2, z: -5.3 }, { x: -17.6, z: -5.4 }, { x: 17.5, z: -5.8 },
];

/** Poles at these x, with a string of lanterns between each pair. */
export const POLES = [-17, -8.5, 0, 8.5, 17];
export const POLE_Z = -3.5;
export const POLE_H = 4.3;

export const VILLAGERS: { id: CharacterId; x: number; z: number; feeling: Expression }[] = [
  { id: "mara", x: -2.4, z: -1.6, feeling: "worried" },
  { id: "tobin", x: 0.5, z: -2.8, feeling: "happy" },
  { id: "nell", x: -11, z: -1.4, feeling: "warm" },
  { id: "ash", x: 7.6, z: -1.8, feeling: "neutral" },
  { id: "wren", x: -7.2, z: -3, feeling: "neutral" },
  { id: "oda", x: -5.7, z: -3, feeling: "laughing" },
  { id: "pip", x: 12.2, z: 0.8, feeling: "surprised" },
  { id: "juno", x: 13.5, z: 0.4, feeling: "neutral" },
];

/** Where each lantern hangs on the strings. */
export function lanternSpots(): { x: number; y: number; z: number; i: number }[] {
  const out: { x: number; y: number; z: number; i: number }[] = [];
  let n = 0;
  for (let p = 0; p < POLES.length - 1; p++) {
    for (let k = 1; k <= 5; k++) {
      const t = k / 6;
      out.push({ x: POLES[p] + (POLES[p + 1] - POLES[p]) * t, y: stringY(t) - 0.3, z: POLE_Z, i: n++ });
    }
  }
  return out;
}

/** Height of the string between two poles, 0..1 along it. */
export function stringY(t: number): number {
  return POLE_H - 0.75 * 4 * t * (1 - t);
}
