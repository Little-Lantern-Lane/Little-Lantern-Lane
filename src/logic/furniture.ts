// Furniture you make or buy, and where you've put it. Plain data and pure rules: no drawing here.
// Made things and bought things are the same to the house: it's yours either way.

import type { ItemId } from "./bag";

export const ROOMS = ["home", "bedroom", "sitting", "cellar"] as const;
export type RoomId = (typeof ROOMS)[number];

interface Piece {
  name: string;
  /** Coins from Tobin, if he sells it. */
  price?: number;
  /** What it takes to make it yourself, if you can. */
  needs?: Partial<Record<ItemId, number>>;
  /** How big it is on the floor, in world units; 0 means you can walk over it. */
  r: number;
}

export const FURNITURE = {
  stool: { name: "Stool", r: 0.3, needs: { driftwood: 2 }, price: 20 },
  crate: { name: "Crate shelf", r: 0.5, needs: { driftwood: 3 } },
  side_table: { name: "Side table", r: 0.45, needs: { driftwood: 2, birch_bark: 1 }, price: 35 },
  bench: { name: "Log bench", r: 0.7, needs: { driftwood: 4 } },
  plant: { name: "Big potted plant", r: 0.4, needs: { chanterelle: 1, birch_bark: 1 }, price: 30 },
  lantern_stand: { name: "Standing lantern", r: 0.3, needs: { birch_bark: 2, quartz: 1 }, price: 55 },
  rug_round: { name: "Round rug", r: 0, price: 45 },
  chest: { name: "Chest", r: 0.6, needs: { driftwood: 3, ironstone: 1 }, price: 60 },
  chair: { name: "Soft chair", r: 0.5, price: 70 },
  desk: { name: "Writing desk", r: 0.8, needs: { driftwood: 4, ironstone: 1 }, price: 85 },
  bookcase: { name: "Tall bookcase", r: 0.7, price: 95 },
  wardrobe: { name: "Wardrobe", r: 0.8, price: 110 },
  bed: { name: "Bed", r: 1.05, price: 130 },
  sofa: { name: "Sofa", r: 1, price: 150 },
  moon_lamp: { name: "Moon lamp", r: 0.3, needs: { skyglass: 1, copper: 1, glowcap: 1 } },
} as const satisfies Record<string, Piece>;

export type FurnitureId = keyof typeof FURNITURE;
export const FURNITURE_IDS = Object.keys(FURNITURE) as FurnitureId[];
export const isFurniture = (id: unknown): id is FurnitureId => typeof id === "string" && id in FURNITURE;

export interface Placed {
  id: FurnitureId;
  room: RoomId;
  x: number;
  z: number;
  /** Quarter turns. */
  turn: number;
}

export interface Furnishings {
  /** Things you own that aren't out in a room. */
  stored: FurnitureId[];
  placed: Placed[];
}

export const NO_FURNITURE: Furnishings = { stored: [], placed: [] };

/** Keep the story's spots in your main room clear: the wall where you use things, and where the kids sleep. */
export function canPlace(f: Furnishings, id: FurnitureId, room: RoomId, x: number, z: number): boolean {
  if (room === "home" && (z < 0.2 || x < 6600 || (x > 6880 && x < 7080))) return false;
  const r = FURNITURE[id].r;
  if (r === 0) return true;
  return f.placed.every((p) => p.room !== room || FURNITURE[p.id].r === 0 || Math.hypot((p.x - x) / 55, p.z - z) >= r + FURNITURE[p.id].r);
}

export const addPiece = (f: Furnishings, id: FurnitureId): Furnishings => ({ ...f, stored: [...f.stored, id] });

export function place(f: Furnishings, id: FurnitureId, room: RoomId, x: number, z: number, turn: number): Furnishings {
  const at = f.stored.indexOf(id);
  if (at < 0 || !canPlace(f, id, room, x, z)) return f;
  return { stored: f.stored.filter((_, i) => i !== at), placed: [...f.placed, { id, room, x, z, turn: ((turn % 4) + 4) % 4 }] };
}

export function putAway(f: Furnishings, index: number): Furnishings {
  const p = f.placed[index];
  if (!p) return f;
  return { stored: [...f.stored, p.id], placed: f.placed.filter((_, i) => i !== index) };
}

export function turnPiece(f: Furnishings, index: number): Furnishings {
  return { ...f, placed: f.placed.map((p, i) => (i === index ? { ...p, turn: (p.turn + 1) % 4 } : p)) };
}

/** Furniture from storage, with anything unknown dropped. */
export function normalizeFurnishings(raw: unknown): Furnishings {
  const r = (raw ?? {}) as Partial<Furnishings>;
  const stored = Array.isArray(r.stored) ? r.stored.filter(isFurniture) : [];
  const placed = Array.isArray(r.placed)
    ? r.placed.filter((p): p is Placed => !!p && isFurniture(p.id) && ROOMS.includes(p.room) && Number.isFinite(p.x) && Number.isFinite(p.z)).map((p) => ({ ...p, turn: Number.isInteger(p.turn) ? ((p.turn % 4) + 4) % 4 : 0 }))
    : [];
  return { stored, placed };
}
