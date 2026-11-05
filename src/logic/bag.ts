// What you've gathered, made and earned in the week after the storm. Plain data and pure rules:
// no drawing here. Coins buy extras only. Nothing in the story needs them, and nothing here scores
// the player: a gift that misses is still a gift, and there is no friendship number.

import type { CharacterChoice, Decor } from "./appearance";
import type { GameEvent } from "./tags";

export type ItemKind = "fruit" | "mushroom" | "mineral" | "fish" | "material" | "made" | "sea";
export type Tool = "rod" | "hammer";

export const ITEMS = {
  apple: { name: "Apple", kind: "fruit", price: 6, note: "Windfall from the old orchard trees." },
  blackberry: { name: "Blackberries", kind: "fruit", price: 5, note: "Stains your fingers for a day." },
  plum: { name: "Wild plum", kind: "fruit", price: 9, note: "Small and sharp until it's cooked." },
  moonberry: { name: "Moonberries", kind: "fruit", price: 14, note: "Pale, and cold even in the sun." },
  button_cap: { name: "Button mushroom", kind: "mushroom", price: 7, note: "Comes up in rings under the hazels." },
  chanterelle: { name: "Chanterelle", kind: "mushroom", price: 12, note: "Smells faintly of apricots." },
  bluecap: { name: "Bluecap", kind: "mushroom", price: 15, note: "Only grows on the far bank." },
  glowcap: { name: "Glowcap", kind: "mushroom", price: 22, note: "Keeps a little light after dark." },
  quartz: { name: "River quartz", kind: "mineral", price: 9, note: "Clear as a cold morning." },
  ironstone: { name: "Ironstone", kind: "mineral", price: 11, note: "Heavier than it looks." },
  copper: { name: "Copper ore", kind: "mineral", price: 16, note: "Green at the edges." },
  skyglass: { name: "Skyglass", kind: "mineral", price: 26, note: "Blue stone that lets the light through." },
  perch: { name: "Perch", kind: "fish", price: 10, note: "Quick to bite." },
  trout: { name: "Trout", kind: "fish", price: 16, note: "Comes up if you let it." },
  eel: { name: "Silver eel", kind: "fish", price: 20, note: "Lives under the far bank." },
  carp: { name: "Old carp", kind: "fish", price: 34, note: "Older than the bridge. Takes its time." },
  mackerel: { name: "Mackerel", kind: "fish", price: 12, note: "Striped and in a hurry." },
  bass: { name: "Sea bass", kind: "fish", price: 26, note: "Worth the wait." },
  shell: { name: "Scallop shell", kind: "mineral", price: 6, note: "Ribbed like a little fan." },
  seaglass: { name: "Sea glass", kind: "mineral", price: 18, note: "A bottle, once. The sea took the edges off." },
  seaweed: { name: "Seaweed", kind: "sea", price: 5, note: "Salty, and better than it looks." },
  samphire: { name: "Samphire", kind: "sea", price: 11, note: "Grows where the dunes meet the salt." },
  driftwood: { name: "Driftwood", kind: "material", price: 3, note: "The storm left plenty." },
  birch_bark: { name: "Birch bark", kind: "material", price: 4, note: "Peels away like paper." },
  jam: { name: "Bramble jam", kind: "made", price: 30, note: "Apple and blackberry." },
  soup: { name: "Mushroom soup", kind: "made", price: 38, note: "Better the next day." },
  charm: { name: "Stone charm", kind: "made", price: 28, note: "Quartz on a strip of birch." },
  tart: { name: "Plum tart", kind: "made", price: 40, note: "Plums and apples." },
  moon_tea: { name: "Moon tea", kind: "made", price: 52, note: "Tastes like the far bank." },
  shell_chime: { name: "Shell chime", kind: "made", price: 34, note: "Clinks in any kind of wind." },
  sea_broth: { name: "Sea broth", kind: "made", price: 44, note: "Tastes of the whole beach." },
  pendant: { name: "Skyglass pendant", kind: "made", price: 70, note: "Copper wire around blue stone." },
} as const satisfies Record<string, { name: string; kind: ItemKind; price: number; note: string }>;

export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const isItem = (id: string): id is ItemId => id in ITEMS;

export const RECIPES: { makes: ItemId; needs: Partial<Record<ItemId, number>> }[] = [
  { makes: "jam", needs: { apple: 1, blackberry: 2 } },
  { makes: "soup", needs: { chanterelle: 2, button_cap: 1 } },
  { makes: "charm", needs: { quartz: 1, birch_bark: 1 } },
  { makes: "tart", needs: { plum: 2, apple: 1 } },
  { makes: "moon_tea", needs: { moonberry: 1, bluecap: 1 } },
  { makes: "pendant", needs: { skyglass: 1, copper: 1 } },
  { makes: "shell_chime", needs: { shell: 2, seaglass: 1 } },
  { makes: "sea_broth", needs: { mackerel: 1, seaweed: 1, samphire: 1 } },
];

/** Tools you can make yourself, from what lies about in Hazel Wood. Nell and Tobin also hand them over. */
export const TOOLS: Record<Tool, { name: string; use: string; needs: Partial<Record<ItemId, number>> }> = {
  rod: { name: "Fishing rod", use: "For the jetties along the river", needs: { driftwood: 2, birch_bark: 1 } },
  hammer: { name: "Hammer", use: "For stones with colour in them", needs: { driftwood: 2, birch_bark: 1 } },
};

/** What the footbridge takes, and the first lantern for the far bank. */
export const BRIDGE_NEEDS: Partial<Record<ItemId, number>> = { driftwood: 6, ironstone: 2 };
export const LANTERN_NEEDS: Partial<Record<ItemId, number>> = { birch_bark: 2, glowcap: 1, skyglass: 1 };

export type Buyer = "ash" | "wren" | "tobin" | "nell";
/** Who wants what, and why they're buying it, in the villager's own trade. */
export const BUYERS: Record<Buyer, ItemKind[]> = {
  ash: ["mushroom", "sea", "made"],
  wren: ["fruit", "made"],
  tobin: ["mineral", "made"],
  nell: ["fish", "made"],
};

export type Friend = Buyer | "mara" | "oda" | "pip" | "juno";
export const FRIENDS: readonly Friend[] = ["ash", "wren", "oda", "tobin", "nell", "mara", "pip", "juno"];
/** What each villager would really like. Conversations give it away if you listen. */
export const FAVOURITES: Record<Friend, { best: ItemId[]; good: ItemKind[] }> = {
  nell: { best: ["jam", "trout"], good: ["fish", "made"] },
  ash: { best: ["moon_tea", "chanterelle"], good: ["mushroom"] },
  tobin: { best: ["pendant", "skyglass"], good: ["mineral"] },
  wren: { best: ["tart", "plum"], good: ["fruit"] },
  oda: { best: ["soup", "perch"], good: ["fish", "mushroom"] },
  mara: { best: ["charm", "moon_tea"], good: ["made"] },
  pip: { best: ["blackberry", "glowcap"], good: ["fruit"] },
  juno: { best: ["quartz", "charm"], good: ["mineral"] },
};
export type GiftFit = "best" | "good" | "kind";

export function giftFit(who: Friend, item: ItemId): GiftFit {
  const f = FAVOURITES[who];
  if (f.best.includes(item)) return "best";
  return f.good.includes(ITEMS[item].kind) ? "good" : "kind";
}

/** Extras coins can buy. Clothes from Nell, things for the house from Tobin. */
export const CLOTHES: { id: CharacterChoice["hat"] | CharacterChoice["extra"]; slot: "hat" | "extra"; name: string; price: number }[] = [
  { id: "leafcrown", slot: "hat", name: "Leaf crown", price: 60 },
  { id: "fishinghat", slot: "hat", name: "Fishing hat", price: 75 },
  { id: "mushroomcap", slot: "hat", name: "Mushroom cap", price: 90 },
  { id: "leafcape", slot: "extra", name: "Leaf cape", price: 110 },
];
export const DECOR_SHOP: { id: Decor; name: string; note: string; price: number }[] = [
  { id: "ferns", name: "Potted ferns", note: "Green in every corner of the room", price: 40 },
  { id: "keepsakes", name: "Keepsake shelf", note: "A shelf for the things you've found", price: 50 },
  { id: "lamps", name: "Wall lamps", note: "Warm light either side of the window", price: 60 },
  { id: "fence", name: "Picket fence", note: "Around the front of the house", price: 60 },
  { id: "rug", name: "Big woven rug", note: "Soft underfoot, in your home's colours", price: 70 },
  { id: "armchair", name: "Armchair", note: "By the stove", price: 80 },
  { id: "lights", name: "String of lights", note: "Along the front of the house", price: 95 },
  { id: "cellar", name: "A cellar", note: "A room under the floor, cool and quiet", price: 90 },
];

export interface BagState {
  items: Partial<Record<ItemId, number>>;
  coins: number;
  /** Everything you've ever held, for the log. */
  found: ItemId[];
  tools: Tool[];
  /** How many things you've gathered in all: the clock that lets you give someone another gift. */
  gathered: number;
  /** The `gathered` count when you last gave each person something. */
  gaveAt: Partial<Record<Friend, number>>;
  /** What you've built in the world, kept from game to game like the bag itself. */
  built: string[];
}

/** Gather this many more things before giving the same person another gift, so gifts stay gifts. */
export const GIFT_GAP = 5;

export const initialBag = (): BagState => ({ items: {}, coins: 0, found: [], tools: [], gathered: 0, gaveAt: {}, built: [] });

export const countOf = (b: BagState, id: ItemId) => b.items[id] ?? 0;

export function canAfford(b: BagState, needs: Partial<Record<ItemId, number>>): boolean {
  return (Object.entries(needs) as [ItemId, number][]).every(([id, n]) => countOf(b, id) >= n);
}

function add(b: BagState, id: ItemId, n: number): BagState {
  return { ...b, items: { ...b.items, [id]: countOf(b, id) + n }, found: b.found.includes(id) ? b.found : [...b.found, id] };
}

function take(b: BagState, id: ItemId, n: number): BagState {
  return { ...b, items: { ...b.items, [id]: Math.max(0, countOf(b, id) - n) } };
}

export const gather = (b: BagState, id: ItemId): BagState => ({ ...add(b, id, 1), gathered: b.gathered + 1 });

export function craft(b: BagState, makes: ItemId): BagState {
  const r = RECIPES.find((x) => x.makes === makes);
  if (!r || !canAfford(b, r.needs)) return b;
  let next = b;
  for (const [id, n] of Object.entries(r.needs) as [ItemId, number][]) next = take(next, id, n);
  return add(next, makes, 1);
}

export function makeTool(b: BagState, tool: Tool): BagState {
  if (b.tools.includes(tool) || !canAfford(b, TOOLS[tool].needs)) return b;
  return { ...spendItems(b, TOOLS[tool].needs), tools: [...b.tools, tool] };
}

export function spendItems(b: BagState, needs: Partial<Record<ItemId, number>>): BagState {
  let next = b;
  for (const [id, n] of Object.entries(needs) as [ItemId, number][]) next = take(next, id, n);
  return next;
}

export function sell(b: BagState, id: ItemId): BagState {
  if (countOf(b, id) < 1) return b;
  return { ...take(b, id, 1), coins: b.coins + ITEMS[id].price };
}

export const pay = (b: BagState, price: number): BagState => (b.coins >= price ? { ...b, coins: b.coins - price } : b);

export const canGift = (b: BagState, who: Friend) => b.gaveAt[who] === undefined || b.gathered - b.gaveAt[who]! >= GIFT_GAP;

export function give(b: BagState, who: Friend, id: ItemId): BagState {
  if (countOf(b, id) < 1 || !canGift(b, who)) return b;
  return { ...take(b, id, 1), gaveAt: { ...b.gaveAt, [who]: b.gathered } };
}

/** What a buyer will take from your bag. */
export function sellable(b: BagState, who: Buyer | "stall"): ItemId[] {
  return ITEM_IDS.filter((id) => countOf(b, id) > 0 && (who === "stall" || BUYERS[who].includes(ITEMS[id].kind)));
}

export const BAG_EVENTS = new Set(["tool", "use_items", "woods_goal"]);
const BUILT = ["bridge", "bridge_lantern"];

/** Story events: `tool rod` hands you something; `use_items bridge` or `use_items lantern` spends what those take. */
export function applyBagEvent(b: BagState, ev: GameEvent): BagState {
  if (ev.name === "prop" && ev.arg?.startsWith("on:") && BUILT.includes(ev.arg.slice(3)) && !b.built.includes(ev.arg.slice(3))) return { ...b, built: [...b.built, ev.arg.slice(3)] };
  if (ev.name === "tool") {
    if (ev.arg !== "rod" && ev.arg !== "hammer") throw new Error(`Unknown tool: ${ev.arg}`);
    return b.tools.includes(ev.arg) ? b : { ...b, tools: [...b.tools, ev.arg] };
  }
  if (ev.name === "use_items") {
    if (ev.arg === "bridge") return spendItems(b, BRIDGE_NEEDS);
    if (ev.arg === "lantern") return spendItems(b, LANTERN_NEEDS);
    throw new Error(`Unknown use_items: ${ev.arg}`);
  }
  return b;
}

/** What's on the line. A nibble is a small fish; let it go by and the real pull brings a better one. */
export function fishFor(bank: "near" | "far" | "sea", pull: "nibble" | "pull"): ItemId {
  if (bank === "sea") return pull === "nibble" ? "mackerel" : "bass";
  if (bank === "near") return pull === "nibble" ? "perch" : "trout";
  return pull === "nibble" ? "eel" : "carp";
}

/** A bag from a save, with anything missing filled in. */
export function normalizeBag(raw: unknown): BagState {
  const r = (raw ?? {}) as Partial<BagState>;
  const d = initialBag();
  return { ...d, ...r, items: { ...r.items }, found: Array.isArray(r.found) ? r.found.filter(isItem) : [], tools: Array.isArray(r.tools) ? r.tools : [], gaveAt: { ...r.gaveAt }, built: Array.isArray(r.built) ? r.built : [] };
}
