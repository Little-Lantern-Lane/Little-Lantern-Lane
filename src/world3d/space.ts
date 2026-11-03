// Where the game's positions sit in 3D. The story, layout and logic all place things by one number,
// x, along the path. Here x becomes a real spot: X runs along the path, Z runs across it (+Z toward
// the camera), Y is up. The player and villagers can stand anywhere across the width of an area.

import { groundY, GROUND_Y, regionAt, type Region } from "../game/layout";

/** Game x units per world unit. */
export const SCALE = 55;

/** Each separate place sits far from the others, so only one is ever in view. */
const REGION_Z: Record<Region["id"], number> = { village: 0, workshop: -400, home: -800, mill: -1200, coast: -1600 };

export const worldX = (x: number) => x / SCALE;
export const gameX = (X: number) => X * SCALE;
export const regionZ = (x: number) => REGION_Z[regionAt(x).id];
/** Height of the ground at x: the hill rises, everywhere else is flat. */
export const groundH = (x: number) => (GROUND_Y - groundY(x)) / SCALE * 1.4;

/** The world position for game x, across-the-path offset z (relative to the place), and height above ground. */
export function at(x: number, z = 0, up = 0): [number, number, number] {
  return [worldX(x), groundH(x) + up, regionZ(x) + z];
}

/** How far you can walk across the path at x, as [back, front] offsets. Wider in open places. */
export function bandAt(x: number): [number, number] {
  const id = regionAt(x).id;
  if (id === "workshop" || id === "home") return [-2.6, 2.4];
  if (id === "mill") return x >= 9000 ? [-2.6, 2.4] : [-3.5, 3.5];
  if (id === "coast") return x >= 12900 ? [-2.4, 2.2] : [-3.5, 4];
  if (x >= 2050 && x < 3200) return [-6.5, 6.5]; // the Square
  if (x >= 3200) return [-3.5, 3.5]; // the Hill
  return [-2.8, 4.2]; // the lanes
}
