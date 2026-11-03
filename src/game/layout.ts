// The village as data: areas, ground height, places you can walk into, things
// you can use, and where everyone stands. No Phaser here, so it can be tested.

import type { CharacterId } from "../logic/cast";
import type { WorldState } from "../logic/world";

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GROUND_Y = 480;
export const WORLD_W = 4400;
/** Your front door on Lantern Lane. */
export const HOME_DOOR = 740;

/** The workshop interior sits off to the side of the outdoor world; its door teleports. */
export const INTERIOR = { x0: 4800, x1: 6080 };

export interface Area {
  id: "lane" | "street" | "square" | "hill" | "workshop" | "home" | "millpath" | "teashop" | "quay" | "shore";
  name: string;
  x0: number;
  x1: number;
}

export const AREAS: Area[] = [
  { id: "lane", name: "Lantern Lane", x0: 0, x1: 1050 },
  { id: "street", name: "Market Street", x0: 1050, x1: 2050 },
  { id: "square", name: "The Square", x0: 2050, x1: 3200 },
  { id: "hill", name: "The Hill", x0: 3200, x1: WORLD_W },
  { id: "workshop", name: "The Lantern Workshop", x0: INTERIOR.x0, x1: INTERIOR.x1 },
  // Chapter five: inside your house on Lantern Lane.
  { id: "home", name: "Your house", x0: 6400, x1: 7680 },
  // Chapter four: the old mill by the river, now Ash's tea room.
  { id: "millpath", name: "The Mill Race", x0: 8000, x1: 9000 },
  { id: "teashop", name: "Mae's Tea Room", x0: 9000, x1: 10400 },
  // Chapter six: Saltmouth, Tobin's home town on the coast.
  { id: "quay", name: "Saltmouth Harbour", x0: 11000, x1: 12400 },
  { id: "shore", name: "Hesketh's Shed", x0: 12400, x1: 13800 },
];

export function areaAt(x: number): Area {
  return AREAS.find((a) => x >= a.x0 && x < a.x1) ?? AREAS[0];
}

/** Separate places you can't walk between: each has its own camera bounds and walking limits. */
export const REGIONS = [
  { id: "village", x0: 0, x1: WORLD_W, min: 40, max: WORLD_W - 60 },
  { id: "workshop", x0: INTERIOR.x0, x1: INTERIOR.x1, min: INTERIOR.x0 + 260, max: INTERIOR.x1 - 260 },
  { id: "home", x0: 6400, x1: 7680, min: 6440, max: 7640 },
  { id: "mill", x0: 8000, x1: 10400, min: 8060, max: 10340 },
  { id: "coast", x0: 11000, x1: 13800, min: 11060, max: 13740 },
] as const;
export type Region = (typeof REGIONS)[number];

export function regionAt(x: number): Region {
  return REGIONS.find((r) => x >= r.x0 && x < r.x1) ?? REGIONS[0];
}

const HILL_START = 3250;
const HILL_TOP = 4100;
const HILL_RISE = 130;

/** Height of the ground (where feet go) at x. */
export function groundY(x: number): number {
  if (x < HILL_START || x >= INTERIOR.x0) return GROUND_Y;
  if (x >= HILL_TOP) return GROUND_Y - HILL_RISE;
  const t = (x - HILL_START) / (HILL_TOP - HILL_START);
  return GROUND_Y - HILL_RISE * t * t * (3 - 2 * t);
}

/** Places a `#go:` choice can name. Auto zones trigger on walking in; others need E. */
export const ZONES: Record<string, { x0: number; x1: number; label: string; auto: boolean }> = {
  fountain: { x0: 2470, x1: 2640, label: "the fountain", auto: true },
  bench: { x0: 2500, x1: 2600, label: "the fountain wall", auto: false },
  hollow: { x0: 4110, x1: 4300, label: "the hollow", auto: true },
  home: { x0: 700, x1: 780, label: "your door", auto: true },
  // Chapter four: the path back to the village, at the far end of the mill race.
  mill_path: { x0: 8060, x1: 8140, label: "the path home", auto: true },
};

/** Things a `#use:` choice can name. */
export const USABLES: Record<string, { x: number; label: string }> = {
  lantern_table: { x: 5530, label: "the lanterns" },
  stone: { x: 2470, label: "the loose stone" },
  heap: { x: 2610, label: "the lanterns" },
  bunting: { x: 1450, label: "the bunting" },
  fountain_water: { x: 2550, label: "the fountain" },
  // Chapter four: the tea room.
  shop_sign: { x: 8950, label: "the sign" },
  chalkboard: { x: 10280, label: "the chalkboard" },
  // Chapter five: the snowy lane and your house.
  nell_path: { x: 430, label: "Nell's path" },
  front_door: { x: HOME_DOOR, label: "your front door" },
  stove: { x: 6640, label: "the stove" },
  kettle: { x: 6800, label: "the kettle" },
  music_box: { x: 7160, label: "the music box" },
  window: { x: 7330, label: "the window" },
  craft_table: { x: 7500, label: "the table" },
  // Chapter six: the harbour and Hesketh's shed.
  harbour_wall: { x: 12100, label: "the harbour wall" },
  shed: { x: 12850, label: "the shed" },
};

/** Doors between places. `when` limits a door to the chapters it's used in. */
export const DOORS: { x: number; to: number; label: string; when?: (w: WorldState) => boolean }[] = [
  { x: 1650, to: 5210, label: "the workshop" },
  { x: 5170, to: 1650, label: "Market Street" },
  // Chapter five: during the night you can step in and out; the story takes you in and out at dusk and dawn.
  { x: HOME_DOOR, to: 6510, label: "your house", when: (w) => w.level === 5 && w.time === "night" },
  { x: 6470, to: HOME_DOOR + 50, label: "Lantern Lane", when: (w) => w.level === 5 && w.time === "night" },
];

export const FOUNTAIN_X = 2550;
export const EDGE_X = 3080;
export const HOME_X = 740;

/** Hooks on the lantern string across the square. */
export const HOOKS = Array.from({ length: 12 }, (_, i) => {
  const t = (i + 0.5) / 12;
  const x = 2210 + t * 680;
  const sag = 4 * t * (1 - t);
  return { x, y: GROUND_Y - 350 + sag * 60 };
});
export const POLES = [2180, 2920];

export type Phase =
  | "afternoon" | "after" | "night" | "festival" | "approach" | "day2" | "storm"
  | "mill_morning" | "mill_party" | "snow_evening" | "snow_night" | "snow_dawn" | "coast" | "coast_dusk";

export function phaseOf(w: WorldState, approaching: boolean): Phase {
  if (w.level === 4) return w.time === "night" ? "mill_party" : "mill_morning";
  if (w.level === 5) return w.time === "morning" ? "snow_dawn" : w.time === "night" ? "snow_night" : "snow_evening";
  if (w.level === 6) return w.time === "sunset" || w.time === "night" ? "coast_dusk" : "coast";
  if (approaching) return "approach";
  if (w.weather === "storm") return "storm";
  if (w.level === 2 && w.time !== "night") return "day2";
  if (w.time === "night") return w.lanterns === "hung" ? "festival" : "night";
  if (w.lanterns === "workshop" || w.lanterns === "carried") return "afternoon";
  return "after";
}

type Spots = Partial<Record<Exclude<CharacterId, "you">, number>>;

const BASE: Spots = { nell: 330, ash: 1880, wren: 1240, oda: 1300, pip: 2820, juno: 2870 };

/** Where each villager stands in each phase. Missing means not around. */
export const NPC_SPOTS: Record<Phase, Spots> = {
  afternoon: { ...BASE, tobin: 5720, mara: 2380 },
  after: { ...BASE, tobin: 2720, mara: 2600 },
  night: {},
  festival: { ...BASE, tobin: 2700, mara: 2420, pip: 2780, juno: 2830 },
  approach: { ...BASE, tobin: 2470, mara: 2400 },
  day2: { ...BASE, tobin: 5720, mara: 2400 },
  storm: { ...BASE, tobin: 2720, mara: 2400, pip: 2640, juno: 2880 },
  // Chapter four: Ash behind the counter, Nell at the window table where her desk used to be.
  mill_morning: { ash: 9640, nell: 9200, tobin: 8600 },
  mill_party: { nell: 9200, tobin: 9330, ash: 9640, pip: 9800, juno: 9850, mara: 10000, wren: 10140, oda: 10200 },
  // Chapter five: Oda brings the kids to your door; Nell is snowed in at hers.
  snow_evening: { nell: 300, oda: 840, pip: 900, juno: 950 },
  snow_night: { pip: 6960, juno: 7010 },
  snow_dawn: { nell: 300, hettie: 860, pip: 920, juno: 970, oda: 1240 },
  // Chapter six: Fen on the quay, Hesketh at his shed.
  coast: { fen: 11500, tobin: 11640, hesketh: 12620 },
  coast_dusk: { fen: 11860, tobin: 11960, hesketh: 12240 },
};

/** Where the player stands when the story moves them. */
export const PLAYER_SPOTS: Record<WorldState["location"], number> = {
  square: 2560,
  edge: EDGE_X,
  cave: 4200,
  lane: 600,
  home: 6560,
  mill: 8200,
  coast: 11200,
  shed: 12700,
};

/**
 * Things in the scenery that appear and disappear with the story (`#event: prop on name`), so
 * what you see matches what's said. `y` is where the image's bottom sits, unless `center` is set.
 * Images are `prop-<name>` textures from art.ts. `glow` lights up the dark around it.
 */
export const PROPS: Record<string, { x: number; y: number; center?: boolean; glow?: number; depth?: number; shown?: (w: WorldState) => boolean }> = {
  // Market Street's bunting: up until you take it down in chapter two; gone by winter.
  street_bunting: { x: 1550, y: GROUND_Y, shown: (w) => !w.props.includes("bunting_down") && w.weather !== "snow" && w.level <= 2, depth: -9 },
  // Chapter four
  sign_down: { x: 8880, y: GROUND_Y },
  sign_up: { x: 8950, y: GROUND_Y - 215, center: true },
  chalk_open: { x: 10280, y: GROUND_Y },
  chalk_saturdays: { x: 10280, y: GROUND_Y },
  mill_lanterns: { x: 8500, y: GROUND_Y - 270, center: true, glow: 4 },
  busy_tables: { x: 9800, y: GROUND_Y },
  // Chapter five
  nell_snow: { x: 330, y: GROUND_Y + 10 },
  stove_fire: { x: 6640, y: GROUND_Y - 40, glow: 1, depth: -4 },
  candles: { x: 7160, y: GROUND_Y - 96, glow: 1, depth: -4 },
  snowflakes: { x: 7330, y: GROUND_Y - 250, center: true, depth: -4 },
  quilt: { x: 6985, y: GROUND_Y + 6, depth: 4 },
  toast: { x: 7500, y: GROUND_Y - 92, depth: -4 },
  plough: { x: 1150, y: GROUND_Y, glow: 1 },
  // Chapter six
  sandbags: { x: 12850, y: GROUND_Y + 4 },
  crate: { x: 12560, y: GROUND_Y + 4 },
  harbour_lantern: { x: 12100, y: GROUND_Y - 110, glow: 1 },
};

/** Chapter six: what's on the shed's shelves when the tide comes in, and how high each sits. */
export const SHED_ITEMS = [
  { id: "notebooks", x: 12960, y: GROUND_Y - 18, label: "Hesketh's notebooks" },
  { id: "small_mould", x: 13090, y: GROUND_Y - 120, label: "a small lantern mould" },
  { id: "tools", x: 13220, y: GROUND_Y - 18, label: "the tool roll" },
  { id: "photo", x: 13350, y: GROUND_Y - 220, label: "a photograph" },
  { id: "red_mould", x: 13480, y: GROUND_Y - 120, label: "the red lantern mould" },
] as const;
/** The shed floor, where the tide comes in. */
export const SHED = { x0: 12900, x1: 13700 };

/** The lane is too dark to walk into without a light after hiding. */
export function laneBlocked(w: WorldState): boolean {
  return w.time === "morning" && w.darkness > 0 && !w.hasLight;
}

export const INTERACT_RANGE = 80;
