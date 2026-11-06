// What the player has chosen for their character and their home, as plain data.
// Drawing lives in src/ui/wardrobe.ts and src/game/homes.ts; this file holds the
// options, the defaults, and the checks that keep a saved choice valid.

import { normalizeFurnishings, NO_FURNITURE, type Furnishings } from "./furniture";

export const BODIES = ["girl", "boy"] as const;
export const ANIMALS = ["redpanda", "fox", "cat", "bunny", "raccoon", "koala"] as const;
export const OUTFITS = ["tunic", "dress", "overalls", "sweater", "hoodie"] as const;
export const HATS = ["none", "bow", "flowercrown", "beanie", "sunhat", "leafcrown", "fishinghat", "mushroomcap"] as const;
export const EXTRAS = ["none", "glasses", "scarf", "bowtie", "leafcape"] as const;
/** Clothes you buy from Nell in the week after the storm, not on offer until then. */
export const BOUGHT_CLOTHES: readonly string[] = ["leafcrown", "fishinghat", "mushroomcap", "leafcape"];
/** Each animal comes in this many fur colors; outfits in this many colors. */
export const FUR_COUNT = 3;
export const OUTFIT_COLOR_COUNT = 6;

export interface CharacterChoice {
  /** What people call you. Empty until you've chosen. */
  name: string;
  body: (typeof BODIES)[number];
  animal: (typeof ANIMALS)[number];
  fur: number;
  outfit: (typeof OUTFITS)[number];
  color: number;
  hat: (typeof HATS)[number];
  extra: (typeof EXTRAS)[number];
}

/** The name people use if you leave it blank. */
export const DEFAULT_NAME = "Robin";
export const MAX_NAME = 16;
/** A name as typed, tidied: no control characters or stray spaces, and short enough to fit a name tag. */
export const cleanName = (raw: unknown): string =>
  (typeof raw === "string" ? raw : "").replace(/[\p{C}{}<>#]/gu, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME).trim();

/** Close to the red panda the game always had: a marigold tunic and a satchel. */
export const DEFAULT_CHARACTER: CharacterChoice = { name: "", body: "boy", animal: "redpanda", fur: 0, outfit: "tunic", color: 0, hat: "none", extra: "none" };

/** A starting outfit for each body. Every outfit can still be worn by either. */
export const STARTING_OUTFIT: Record<CharacterChoice["body"], Pick<CharacterChoice, "outfit" | "hat">> = {
  girl: { outfit: "dress", hat: "flowercrown" },
  boy: { outfit: "tunic", hat: "none" },
};

// --- Home -------------------------------------------------------------------------

export const HOME_STYLES = ["cottage", "mushroom", "burrow", "tower"] as const;
export const PAINT_COUNT = 4;
export const ADDITIONS = ["up", "side", "porch", "garden"] as const;
/** Extras bought from Tobin with what you've earned. Additions are his too, after the first one, which is free. */
export const DECOR = ["armchair", "ferns", "lamps", "rug", "keepsakes", "fence", "lights", "cellar"] as const;
export type Decor = (typeof DECOR)[number];
export type Addition = (typeof ADDITIONS)[number];

export const CUSTOM_PARTS = {
  body: ["cottage", "tall", "long", "round"],
  roof: ["gable", "steep", "round", "thatch", "flat"],
  texture: ["plain", "planks", "stone", "brick"],
  door: ["round", "square", "double", "porthole"],
  window: ["square", "round", "arch", "diamond"],
  chimney: ["none", "brick", "pipe"],
  topper: ["none", "weathervane", "flag", "lantern"],
} as const;
type Parts = typeof CUSTOM_PARTS;

export const WALL_COLORS = ["#fde6a8", "#f7d9c4", "#d8efdc", "#eef0f4", "#d6e8f7", "#f6d3dc", "#e6dcf3", "#ead7b7"];
export const ROOF_COLORS = ["#b986c9", "#7a9fd0", "#d9677a", "#7fae6a", "#d98a5e", "#7d8aa3", "#e2b24f", "#9a6b4f"];
export const DOOR_COLORS = ["#a8674a", "#5f8fb0", "#c97b6a", "#7a9a5a", "#9a6bb0", "#e2b24f", "#d9677a", "#5d6470"];

export type CustomHome = { [K in keyof Parts]: Parts[K][number] } & {
  shutters: boolean;
  boxes: boolean;
  wall: string;
  roofColor: string;
  doorColor: string;
  trim: string;
};

export interface HomeChoice {
  /** A ready-made style, or one the player designed part by part. */
  kind: "style" | "custom";
  style: (typeof HOME_STYLES)[number];
  paint: number;
  custom: CustomHome;
  /** What has been added to the home so far. */
  grown: Addition[];
  /** How many additions you have room for: the free one, and any Tobin has built. Once chosen, an addition stays. */
  slots: number;
  /** Whether you've had the addition that comes free with finishing your first chapter. */
  gotFree: boolean;
  /** Things you've bought for it. */
  decor: Decor[];
  /** Furniture you've made or bought, and where it stands. */
  furniture: Furnishings;
}

export const DEFAULT_CUSTOM: CustomHome = {
  body: "cottage", roof: "thatch", texture: "planks", door: "porthole", window: "arch", chimney: "brick", topper: "lantern",
  shutters: true, boxes: true, wall: WALL_COLORS[4], roofColor: ROOF_COLORS[6], doorColor: DOOR_COLORS[2], trim: DOOR_COLORS[1],
};

export const DEFAULT_HOME: HomeChoice = { kind: "style", style: "cottage", paint: 1, custom: DEFAULT_CUSTOM, grown: [], slots: 0, gotFree: false, decor: [], furniture: NO_FURNITURE };

/** Which extra rooms the home has. A bedroom comes with the upper floor, a side room with the side addition. */
export function hasRoom(home: HomeChoice, room: "bedroom" | "sitting" | "cellar"): boolean {
  if (room === "bedroom") return home.grown.includes("up");
  if (room === "sitting") return home.grown.includes("side");
  return home.decor.includes("cellar");
}

/** Tobin builds an addition for coins. */
export function buildAddition(home: HomeChoice, a: Addition): HomeChoice {
  if (home.grown.includes(a)) return home;
  return { ...home, grown: ADDITIONS.filter((x) => x === a || home.grown.includes(x)), slots: Math.min(ADDITIONS.length, home.slots + 1) };
}

export function hasAddition(home: HomeChoice, a: Addition): boolean {
  return home.grown.includes(a);
}

export const hasDecor = (home: HomeChoice, d: Decor): boolean => (home.decor ?? []).includes(d);

/** Additions the home doesn't have yet. */
export function remainingAdditions(home: HomeChoice): Addition[] {
  return ADDITIONS.filter((a) => !home.grown.includes(a));
}

/** The first chapter you finish gives your home one addition for free. Every other one is built for coins. */
export const freeAdditionDue = (home: HomeChoice): boolean => !home.gotFree && remainingAdditions(home).length > 0;

/** Room for one more addition, up to all four. */
export function growRoom(home: HomeChoice): HomeChoice {
  return { ...home, slots: Math.min(ADDITIONS.length, home.slots + 1) };
}

/**
 * Switch an addition on or off, keeping within the room the home has. `kept` is what the home
 * already had: those stay, so a cheap addition can't be swapped for a dearer one.
 */
export function toggleAddition(home: HomeChoice, a: Addition, kept: readonly Addition[] = []): HomeChoice {
  if (kept.includes(a)) return home;
  if (home.grown.includes(a)) return { ...home, grown: home.grown.filter((x) => x !== a) };
  if (home.grown.length >= home.slots) return home;
  return { ...home, grown: ADDITIONS.filter((x) => x === a || home.grown.includes(x)) };
}

// --- Checking saved choices ----------------------------------------------------------

const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const index = (v: unknown, count: number, fallback: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < count ? (v as number) : fallback);
const color = (list: string[], v: unknown, fallback: string) => (list.includes(v as string) ? (v as string) : fallback);

/** A character choice from storage, with anything unknown replaced by the default. */
export function normalizeCharacter(raw: unknown): CharacterChoice {
  const r = (raw ?? {}) as Partial<Record<keyof CharacterChoice, unknown>>;
  const d = DEFAULT_CHARACTER;
  return {
    name: cleanName(r.name),
    body: oneOf(BODIES, r.body, d.body),
    animal: oneOf(ANIMALS, r.animal, d.animal),
    fur: index(r.fur, FUR_COUNT, d.fur),
    outfit: oneOf(OUTFITS, r.outfit, d.outfit),
    color: index(r.color, OUTFIT_COLOR_COUNT, d.color),
    hat: oneOf(HATS, r.hat, d.hat),
    extra: oneOf(EXTRAS, r.extra, d.extra),
  };
}

/** A home choice from storage, with anything unknown replaced by the default. */
export function normalizeHome(raw: unknown): HomeChoice {
  const r = (raw ?? {}) as Partial<Record<keyof HomeChoice, unknown>>;
  const c = (r.custom ?? {}) as Partial<Record<keyof CustomHome, unknown>>;
  const d = DEFAULT_CUSTOM;
  const custom = { ...d } as CustomHome;
  for (const k of Object.keys(CUSTOM_PARTS) as (keyof Parts)[]) (custom as Record<string, unknown>)[k] = oneOf(CUSTOM_PARTS[k] as readonly string[], c[k], d[k]);
  custom.shutters = typeof c.shutters === "boolean" ? c.shutters : d.shutters;
  custom.boxes = typeof c.boxes === "boolean" ? c.boxes : d.boxes;
  custom.wall = color(WALL_COLORS, c.wall, d.wall);
  custom.roofColor = color(ROOF_COLORS, c.roofColor, d.roofColor);
  custom.doorColor = color(DOOR_COLORS, c.doorColor, d.doorColor);
  custom.trim = color(DOOR_COLORS, c.trim, d.trim);
  const slots = index(r.slots, ADDITIONS.length + 1, 0);
  const grown = Array.isArray(r.grown) ? ADDITIONS.filter((a) => (r.grown as unknown[]).includes(a)).slice(0, slots) : [];
  return {
    kind: r.kind === "custom" ? "custom" : "style",
    style: oneOf(HOME_STYLES, r.style, DEFAULT_HOME.style),
    paint: index(r.paint, PAINT_COUNT, DEFAULT_HOME.paint),
    custom,
    grown,
    slots,
    // Homes from before additions cost coins have already had theirs.
    gotFree: typeof r.gotFree === "boolean" ? r.gotFree : slots > 0,
    decor: Array.isArray(r.decor) ? DECOR.filter((d) => (r.decor as unknown[]).includes(d)) : [],
    furniture: normalizeFurnishings(r.furniture),
  };
}
