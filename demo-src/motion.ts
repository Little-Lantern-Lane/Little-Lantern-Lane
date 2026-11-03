// How a body moves with each feeling. Both styles use the same movement.

import type { Motion } from "./plush";

export interface Pose {
  dy: number;
  angle: number;
  sx: number;
  sy: number;
}

export function motionPose(m: Motion, t: number): Pose {
  const p: Pose = { dy: 0, angle: 0, sx: 1, sy: 1 };
  switch (m) {
    case "breathe":
      p.sy = 1 + 0.014 * Math.sin(t * 2);
      p.sx = 1 - 0.008 * Math.sin(t * 2);
      break;
    case "bounce":
      p.dy = Math.abs(Math.sin(t * 4)) * 0.13;
      p.sy = 1 + 0.03 * Math.cos(t * 8);
      break;
    case "laugh":
      p.angle = 0.06 * Math.sin(t * 12);
      p.sy = 1 + 0.025 * Math.sin(t * 24);
      break;
    case "sink":
      p.sy = 0.94 + 0.008 * Math.sin(t * 1.4);
      p.sx = 1.02;
      break;
    case "stomp":
      p.dy = Math.max(0, Math.sin(t * 7)) * 0.06;
      p.angle = 0.035 * Math.sin(t * 7);
      break;
    case "hop":
      p.dy = Math.max(0, Math.sin(t * 3)) ** 2 * 0.24;
      break;
    case "shiver":
      p.angle = 0.022 * Math.sin(t * 42);
      break;
    case "sway":
      p.angle = 0.065 * Math.sin(t * 2.4);
      break;
    case "shrink":
      p.sx = p.sy = 0.9 + 0.006 * Math.sin(t * 2);
      break;
    case "droop":
      p.angle = 0.05;
      p.sy = 0.93 + 0.012 * Math.sin(t * 1.2);
      break;
  }
  return p;
}
