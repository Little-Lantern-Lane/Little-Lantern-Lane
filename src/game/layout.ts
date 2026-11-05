// The village as data: areas, ground height, places you can walk into, things
// you can use, and where everyone stands. No Phaser here, so it can be tested.

import type { ItemId, Tool } from "../logic/bag";
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
  id: "lane" | "street" | "square" | "hill" | "workshop" | "home" | "millpath" | "teashop" | "quay" | "shore" | "wood" | "river" | "farbank" | "bedroom" | "sitting" | "cellar" | "beach" | "bakery" | "sewing";
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
  // The week after the storm: the woods past Lantern Lane, the river, and the far bank.
  { id: "wood", name: "Hazel Wood", x0: 14200, x1: 17000 },
  { id: "river", name: "The River", x0: 17000, x1: 17440 },
  { id: "farbank", name: "The Far Bank", x0: 17440, x1: 20200 },
  // The rooms your home can grow.
  { id: "bedroom", name: "Your bedroom", x0: 20600, x1: 21500 },
  { id: "sitting", name: "The side room", x0: 21700, x1: 22600 },
  { id: "cellar", name: "The cellar", x0: 22800, x1: 23700 },
  // Down from the Square to the sea.
  { id: "beach", name: "Lantern Sands", x0: 24000, x1: 28400 },
  // Shops you can walk into.
  { id: "bakery", name: "The Bakery", x0: 28800, x1: 29700 },
  { id: "sewing", name: "Nell's Sewing Room", x0: 29900, x1: 30800 },
];

/** The woods: you walk east from the gate. The river runs across your way; the bridge is the only crossing. */
export const WOODS = { x0: 14200, x1: 20200, gate: 14290, stall: 14440, stallZ: 2.6, river0: 17000, river1: 17440, bridgeHalf: 1.2, band: 46 };
const RIVER_MID = (WOODS.river0 + WOODS.river1) / 2;
const RIVER_HALF = (WOODS.river1 - WOODS.river0) / 2;

/** The river's middle at depth z: straight at the bridge, wandering away from it. */
export function riverMidX(z: number): number {
  const a = Math.abs(z);
  const t = Math.min(1, Math.max(0, (a - 6) / 34));
  return RIVER_MID + Math.sign(z || 1) * 300 * t * t * (3 - 2 * t) + Math.sin(z * 0.11) * t * 70;
}

/** Which side of the river you're on, or in it. */
export function bankAt(x: number, z: number): "wood" | "river" | "farbank" {
  const off = x - riverMidX(z);
  return off < -RIVER_HALF ? "wood" : off > RIVER_HALF ? "farbank" : "river";
}

/** The gate at the end of Lantern Lane that leads to the woods. */
export const LANE_GATE = 110;

export function areaAt(x: number): Area {
  return AREAS.find((a) => x >= a.x0 && x < a.x1) ?? AREAS[0];
}

/** The woods are a wide place, not a path, so where you are depends on which side of the river you're on. */
export function woodsAreaAt(x: number, z: number): Area {
  return AREAS.find((a) => a.id === bankAt(x, z))!;
}

/** Separate places you can't walk between: each has its own camera bounds and walking limits. */
export const REGIONS = [
  { id: "village", x0: 0, x1: WORLD_W, min: 40, max: WORLD_W - 60 },
  { id: "workshop", x0: INTERIOR.x0, x1: INTERIOR.x1, min: INTERIOR.x0 + 260, max: INTERIOR.x1 - 260 },
  { id: "home", x0: 6400, x1: 7680, min: 6440, max: 7640 },
  { id: "mill", x0: 8000, x1: 10400, min: 8060, max: 10340 },
  { id: "coast", x0: 11000, x1: 13800, min: 11060, max: 13740 },
  { id: "woods", x0: 14200, x1: 20200, min: 14260, max: 20140 },
  { id: "bedroom", x0: 20600, x1: 21500, min: 20640, max: 21460 },
  { id: "sitting", x0: 21700, x1: 22600, min: 21740, max: 22560 },
  { id: "cellar", x0: 22800, x1: 23700, min: 22840, max: 23660 },
  { id: "beach", x0: 24000, x1: 28400, min: 24060, max: 28340 },
  { id: "bakery", x0: 28800, x1: 29700, min: 28840, max: 29660 },
  { id: "sewing", x0: 29900, x1: 30800, min: 29940, max: 30760 },
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

/** Every part of the story, as lanterns on the map. All of them are always open. */
export const LANTERN_ROW: { id: string; name: string; plate: string; knot?: string; variant?: "promise" }[] = [
  { id: "lantern_1", name: "Lantern Night", plate: "1" },
  { id: "lantern_1b", name: "The borrowed lantern", plate: "1b", variant: "promise" },
  { id: "lantern_2", name: "The morning after", plate: "2", knot: "start_day_two" },
  { id: "lantern_3", name: "The storm", plate: "3", knot: "start_storm" },
  { id: "lantern_far", name: "The far bank", plate: "Far", knot: "start_woods" },
  { id: "lantern_4", name: "Opening day", plate: "4", knot: "start_mill" },
  { id: "lantern_5", name: "The first snow", plate: "5", knot: "start_snow" },
  { id: "lantern_6", name: "The tide", plate: "6", knot: "start_coast" },
];

/** Things a `#use:` choice can name. */
export const USABLES: Record<string, { x: number; label: string; z?: number }> = {
  // The village where every game starts.
  swap_shelf: { x: 2230, z: 3.2, label: "the swap shelf" },
  nature_table: { x: 2900, z: 3.2, label: "the nature table" },
  mirror: { x: 7300, z: -2.3, label: "the mirror" },
  paint_pots: { x: 860, z: -2.2, label: "the paint pots" },
  lantern_table: { x: 5530, label: "the lanterns" },
  stone: { x: 2470, label: "the loose stone" },
  heap: { x: 2610, label: "the lanterns" },
  bunting: { x: 1285, label: "the bunting" },
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

/** The snowy night in chapter five, when the story keeps you going in and out. */
const snowNight = (w: WorldState) => w.level === 5 && w.time === "night";

/**
 * Your front door opens from the street whenever you're free to walk the village. Not while the
 * pull to hide is on or you're in your shell: those are the game's own moments, and a door out of
 * them would skip them. At dusk and dawn in chapter five the story takes you through it.
 */
export function canEnterHome(w: WorldState): boolean {
  if (snowNight(w)) return true;
  return (w.level <= 3 || w.level === 7 || w.level === 8) && w.form === "person" && !w.pull && !laneBlocked(w);
}

/** Wider than the way in, so nothing can shut you inside. */
export function canLeaveHome(w: WorldState): boolean {
  return snowNight(w) || w.level <= 3 || w.level === 7 || w.level === 8;
}

/** The path down to the beach, at the far corner of the Square. The sands run along the sea. */
export const BEACH = { x0: 24000, x1: 28400, arrive: 24640, gate: 24560, gateZ: 8, water: -14, back: 20 };

/** Street doors of the shops. */
/** The bakery door on Market Street: bakery() draws it 1.7 along from the shop's middle at world x 23.2. */
const BAKERY_DOOR_X = 1221;
export const SHOP_DOORS = { bakery: BAKERY_DOOR_X, sewing: 300, furniture: 1724 };

/** Every place you can walk to when you're free, with the sign that points the way. */
const free = (w: WorldState) => w.level === 8;

/** How close to the end of a path you need to walk for it to take you onward. */
export const PATH_REACH = 1.3;

/** A path on the ground, as [x, z] points from where it starts to where it leaves. */
export type Trail = [number, number][];
const HALF_PATH = 1.5;

export const TRAILS = {
  toBeach: [[2760, 2.2], [2930, 3], [3040, 5.4], [3090, 8.5], [3120, 13], [3105, 19]],
  toMill: [[3210, 0.2], [3300, -1.4], [3350, -5], [3400, -9], [3440, -14], [3430, -20]],
  toWoods: [[520, 1.2], [300, 0.4], [130, -1.4], [110, -3.2], [110, -8]],
  woodsExit: [[14900, 0.3], [14560, 0], [14300, -0.6], [14290, -2.6], [14290, -6]],
  beachExit: [[25150, 7], [24800, 8], [24660, 13], [24670, 20], [24640, 28]],
  shore: [[27500, 7], [27900, 9], [28080, 14], [28060, 21], [28080, 28]],
  millExit: [[8620, 0.4], [8340, 0.4], [8080, 0.4]],
  coastExit: [[11460, 0.4], [11300, 0], [11085, 0]],
} satisfies Record<string, Trail>;

/** How far a spot is from a path's middle, in world units. */
export function distToTrail(x: number, z: number, t: Trail): number {
  let best = Infinity;
  for (let i = 1; i < t.length; i++) {
    const [ax, az] = [t[i - 1][0] / 55, t[i - 1][1]];
    const [bx, bz] = [t[i][0] / 55, t[i][1]];
    const [px, pz] = [x / 55, z];
    const k = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
    best = Math.min(best, Math.hypot(px - ax - k * (bx - ax), pz - az - k * (bz - az)));
  }
  return best;
}

export const onTrail = (x: number, z: number, t: Trail) => distToTrail(x, z, t) <= HALF_PATH;
const endOf = (t: Trail) => ({ x: t[t.length - 1][0], z: t[t.length - 1][1] - (t[t.length - 1][1] > t[t.length - 2][1] ? 0.5 : t[t.length - 1][1] < t[t.length - 2][1] ? -0.5 : 0), trail: t, path: true });

/** Where the map stands in each place, and where it takes you. */
export const MAP_BOARDS: { x: number; z: number }[] = [
  { x: 2030, z: 5 }, { x: 860, z: 3.8 }, { x: 14420, z: -3.6 }, { x: 18000, z: 2.5 }, { x: 25420, z: 4.6 }, { x: 8380, z: -3 }, { x: 11240, z: 2.8 },
];
/** The signs that show the walking routes, in the village between stories. */
export const WALK_SIGNS: { x: number; z: number; text: string; always?: boolean; only?: number }[] = [
  { x: 2760, z: 0.3, text: "TO THE BEACH →", always: true },
  { x: 3180, z: -2.2, text: "TO THE MILL →" },
  { x: 8560, z: -3.1, text: "← TO THE VILLAGE" },
  { x: 27520, z: 4.8, text: "TO SALTMOUTH →" },
  { x: 11383, z: -2.2, text: "← TO THE BEACH" },
  // In the two chapters away from the village, the same paths lead to the woods.
  { x: 8560, z: -3.1, text: "← TO THE WOODS", only: 4 },
  { x: 11383, z: -2.2, text: "← TO THE WOODS", only: 6 },
];

/** Places on the map you can go to, by name, as [x, z]. */
export const MAP_PLACES: Record<string, { name: string; x: number; z: number }> = {
  lane: { name: "Lantern Lane", x: 700, z: 1 },
  street: { name: "Market Street", x: 1500, z: 1 },
  square: { name: "The Square", x: 2500, z: 3 },
  hill: { name: "The Hill", x: 3900, z: 0 },
  wood: { name: "Hazel Wood", x: 14400, z: 0 },
  farbank: { name: "The Far Bank", x: 17800, z: 0 },
  beach: { name: "Lantern Sands", x: 24900, z: 6 },
  mill: { name: "The Mill", x: 8400, z: 0 },
  saltmouth: { name: "Saltmouth", x: 11300, z: 0 },
};

/** Who starts the next part of the story, keyed by the chapter a save leads into. */
export const NEXT_GIVER: Record<number, { who: string; line: string }> = {
  1: { who: "mara", line: "Mara's looking for you in the Square." },
  2: { who: "nell", line: "Nell's looking for you in her sewing room on Lantern Lane." },
  3: { who: "mara", line: "Mara's looking for you in the Square." },
  7: { who: "mara", line: "Mara's looking for you in the Square." },
  4: { who: "ash", line: "Ash has something to ask you, at the tea room by the mill." },
  5: { who: "oda", line: "Oda's looking for you at the bakery." },
  6: { who: "tobin", line: "Tobin's looking for you in his shop on Market Street." },
};

/** Paths to the woods from the two chapters that don't happen in the village. */

/**
 * The woods are open from every chapter, whenever you're free to wander. Not during the moments the
 * story needs you for: the pull to hide, the shell, the storm's panic or weather, or the snowy night,
 * when Pip and Juno are in your house.
 */
export function canVisitWoods(w: WorldState): boolean {
  if (w.form !== "person" || w.pull || w.panic || w.weather === "storm" || w.ended || laneBlocked(w)) return false;
  return !(w.level === 5 && w.time === "night");
}

const inVillageChapter = (w: WorldState) => w.level !== 4 && w.level !== 6;

/** Doors between places. `when` limits a door to when it can be used; `z` is where it stands if not the back of the path; `toZ` is where you land. */
export const DOORS: { x: number; z?: number; to: number; toZ?: number; label: string; when?: (w: WorldState) => boolean; needs?: "bedroom" | "sitting" | "cellar"; path?: boolean; trail?: Trail }[] = [
  { x: 1485, to: 5210, label: "Go into the workshop" },
  { x: 5170, to: 1485, label: "Go out to Market Street" },
  { x: HOME_DOOR, to: 6510, toZ: -1.4, label: "Go into your house", when: canEnterHome },
  { x: 6470, to: HOME_DOOR, toZ: -3.1, label: "Go out to Lantern Lane", when: canLeaveHome },
  // Shops you can walk into when you're free.
  { x: SHOP_DOORS.bakery, to: 28940, toZ: -1, label: "Go into the bakery", when: free },
  { x: 28900, to: SHOP_DOORS.bakery, toZ: -1.6, label: "Go back to Market Street" },
  { x: SHOP_DOORS.furniture, to: 5700, toZ: -0.8, label: "Go into the furniture shop", when: free },
  { x: 5700, to: SHOP_DOORS.furniture, toZ: -1.6, label: "Go back to Market Street", when: free },
  { x: SHOP_DOORS.sewing, to: 30040, toZ: -1, label: "Go into Nell's sewing room", when: free },
  { x: 30000, to: SHOP_DOORS.sewing, toZ: -1.6, label: "Go back to Lantern Lane" },
  // Rooms your home has grown. The stairs, a door in the end wall, and a hatch in the floor.
  { x: 7040, z: -1.6, to: 20720, toZ: -1, label: "Go upstairs", needs: "bedroom" },
  { x: 20680, to: 7040, toZ: -1.4, label: "Go downstairs" },
  { x: 7620, z: 0.9, to: 21820, toZ: -1, label: "Go into the side room", needs: "sitting" },
  { x: 21780, to: 7560, toZ: 0.9, label: "Go back to the main room" },
  { x: 6560, z: 1.7, to: 22920, toZ: -1, label: "Go down to the cellar", needs: "cellar" },
  { x: 22880, to: 6620, toZ: 1.7, label: "Go back up" },
  // Paths: walk along one to the end and you're there. The Hill leads to the mill, the sands to Saltmouth.
  { ...endOf(TRAILS.toMill), to: 8240, toZ: 0.4, label: "Walk down to the mill", when: free },
  { ...endOf(TRAILS.millExit), to: 3380, toZ: -6.5, label: "Walk back up to the village", when: free },
  { ...endOf(TRAILS.shore), to: 11300, toZ: 0, label: "Follow the shore to Saltmouth", when: free },
  { ...endOf(TRAILS.coastExit), to: 28070, toZ: 16, label: "Walk back along the shore", when: free },
  { ...endOf(TRAILS.toBeach), to: BEACH.arrive, toZ: 14, label: "Go down to the beach", when: (w) => inVillageChapter(w) && canVisitWoods(w) },
  { ...endOf(TRAILS.beachExit), to: 3100, toZ: 8, label: "Go back up to the Square" },
  { ...endOf(TRAILS.toWoods), to: WOODS.gate + 150, toZ: 0, label: "Go through to the woods", when: (w) => inVillageChapter(w) && canVisitWoods(w) },
  { ...endOf(TRAILS.millExit), to: WOODS.gate + 150, toZ: 0, label: "Take the path to the woods", when: (w) => w.level === 4 && canVisitWoods(w) },
  { ...endOf(TRAILS.coastExit), to: WOODS.gate + 150, toZ: 0, label: "Take the road to the woods", when: (w) => w.level === 6 && canVisitWoods(w) },
  // The way back goes wherever the chapter is, and is never shut.
  { ...endOf(TRAILS.woodsExit), to: 150, toZ: -1.2, label: "Go back to Lantern Lane", when: inVillageChapter },
  { ...endOf(TRAILS.woodsExit), to: 8240, toZ: 0.4, label: "Go back to the mill", when: (w) => w.level === 4 },
  { ...endOf(TRAILS.woodsExit), to: 11230, toZ: 0, label: "Go back to the harbour", when: (w) => w.level === 6 },
];

/** One thing growing or lying in the woods. `shape` says how the woods draw it. */
export interface GatherNode {
  id: string;
  item: ItemId;
  x: number;
  z: number;
  shape: "tree" | "bramble" | "cap" | "rock" | "log" | "birch" | "shell" | "weed" | "grass";
  tool?: Tool;
}

const DEEP = 4.7; // the lists below were laid out narrow; this spreads them through the whole wood

const near = (item: ItemId, shape: GatherNode["shape"], spots: [number, number][], tool?: Tool): GatherNode[] =>
  spots.map(([x, depth], i) => {
    const z = depth * DEEP;
    // Keep everything on its own bank, however the river wanders.
    const mid = riverMidX(z);
    const safe = x < RIVER_MID ? Math.min(x, mid - RIVER_HALF - 130) : Math.max(x, mid + RIVER_HALF + 130);
    return { id: `${item}${i}`, item, x: safe, z, shape, tool };
  });

export const NODES: GatherNode[] = [
  // Hazel Wood: everyday things.
  ...near("apple", "tree", [[14720, -4.5], [15050, 3.6], [15420, -6.2], [15980, 5], [15080, -7.4], [15560, -7.8]]),
  ...near("blackberry", "bramble", [[14560, 3], [14980, -3], [15360, 4.8], [16160, -3.6], [15700, 8]]),
  ...near("button_cap", "cap", [[14860, 1.8], [15230, -2], [15640, 2.6], [16300, 1.4], [14700, 7]]),
  ...near("chanterelle", "cap", [[15560, -5.4], [16080, -6.6], [16520, 4.4], [15940, 8.6]]),
  ...near("birch_bark", "birch", [[14640, -6.6], [15760, 6.4], [16420, -6], [15180, 8.4]]),
  ...near("driftwood", "log", [[16760, -1], [16860, 0.8], [16620, 1.6], [16920, -0.7], [16700, 0.5], [16900, 1.5], [16800, -1.8], [16560, -0.6]]),
  ...near("quartz", "rock", [[16660, 7.6], [16480, -7.6]], "hammer"),
  ...near("ironstone", "rock", [[15860, -3.2], [16240, 6.8], [15480, 7]], "hammer"),
  // The far bank: rarer things, and a different light.
  ...near("plum", "tree", [[17760, 4.6], [18340, -5.2], [19020, 5.4], [18800, -8]]),
  ...near("moonberry", "bramble", [[17900, -3.6], [18620, 3.2], [19360, -4.4], [19100, 8.2]]),
  ...near("bluecap", "cap", [[17680, -5.6], [18180, 2.2], [18820, -2.4], [19520, 2.8]]),
  ...near("glowcap", "cap", [[18480, -6.8], [19180, 6.8], [19820, -1.6], [18100, 8.2]]),
  ...near("copper", "rock", [[18060, 6.6], [18920, -6.8], [19660, 6]], "hammer"),
  ...near("skyglass", "rock", [[19280, -7.2], [19940, 3.6]], "hammer"),
  ...near("birch_bark", "birch", [[18260, 7.2], [19740, -6.8]]).map((n) => ({ ...n, id: `far_${n.id}` })),
];

/** Where you can fish. The two banks hold different fish. */
export const FISHING_SPOTS = ([[-30, "near"], [-9, "near"], [20, "near"], [-22, "far"], [9, "far"], [34, "far"]] as const).map(([z, bank], i) => {
  const mid = riverMidX(z);
  const dir = bank === "near" ? -1 : 1;
  return { id: `fish${i}`, x: mid + dir * (RIVER_HALF + 40), z, floatX: mid + dir * 50, floatZ: z + 0.4, bank };
});

const sand = (item: ItemId, shape: GatherNode["shape"], spots: [number, number][], tool?: Tool): GatherNode[] => spots.map(([x, z], i) => ({ id: `sea_${item}${i}`, item, x, z, shape, tool }));

/** What washes up and grows along the sands. Shells and weed near the water, samphire by the dunes, glass among the rocks. */
export const BEACH_NODES: GatherNode[] = [
  ...sand("shell", "shell", [[24700, -6], [25300, -9], [25900, -5], [26400, -10], [27000, -7], [27600, -9], [28000, -4]]),
  ...sand("seaweed", "weed", [[24900, -11], [25600, -11.5], [26200, -7], [26900, -11], [27400, -12], [28100, -10]]),
  ...sand("samphire", "grass", [[25100, 13], [25500, 14], [26300, 10], [27100, 15], [27400, 12]]),
  ...sand("seaglass", "rock", [[25100, 2], [26700, -2], [27800, 4]], "hammer"),
  ...sand("driftwood", "log", [[25700, 3.4], [26100, 3], [27000, 3.6]]),
];

/** The rocks and the end of the pier, for fishing the open sea. */
export const BEACH_SPOTS = ([[25400, -13.4], [26400, -13.4], [27500, -13.4]] as const).map(([x, z], i) => ({ id: `sea${i}`, x, z, floatX: x + 30, floatZ: z - 5, bank: "sea" as const }));

/** You can't step into the river. Only the bridge, once it's built, gets you across. */
export function woodsLimit(x: number, z: number, bridge: boolean): number {
  if (bridge && Math.abs(z) <= WOODS.bridgeHalf) return x;
  const mid = riverMidX(z);
  if (Math.abs(x - mid) >= RIVER_HALF) return x;
  return x < mid ? mid - RIVER_HALF : mid + RIVER_HALF;
}

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
  | "mill_morning" | "mill_party" | "snow_evening" | "snow_night" | "snow_dawn" | "coast" | "coast_dusk" | "woods" | "hub";

export function phaseOf(w: WorldState, approaching: boolean): Phase {
  if (w.level === 8) return "hub";
  if (w.level === 7) return "woods";
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

const BASE: Spots = { nell: 330, ash: 1880, wren: 1130, oda: 1195, pip: 2820, juno: 2870 };

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
  // The week after the storm: Mara and Nell at the river, the kids in the wood, everyone else at work.
  // The village between stories: everyone at their own place, ready to trade.
  hub: { fen: 11500, nell: 30320, wren: 29220, oda: 29340, tobin: 5580, ash: 9640, mara: 2300, pip: 2850, juno: 2960 },
  woods: { mara: 16700, nell: 16880, pip: 15000, juno: 15060, ash: 1880, wren: 1130, oda: 1195, tobin: 1760 },
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
  bridge: 17220,
  hub: 2300,
};

/**
 * Things in the scenery that appear and disappear with the story (`#event: prop on name`), so
 * what you see matches what's said. `y` is where the image's bottom sits, unless `center` is set.
 * Images are `prop-<name>` textures from art.ts. `glow` lights up the dark around it.
 */
export const PROPS: Record<string, { x: number; y: number; center?: boolean; glow?: number; depth?: number; shown?: (w: WorldState) => boolean }> = {
  // Market Street's bunting: up until you take it down in chapter two; gone by winter.
  street_bunting: { x: 1385, y: GROUND_Y, shown: (w) => !w.props.includes("bunting_down") && w.weather !== "snow" && w.level <= 2, depth: -9 },
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
