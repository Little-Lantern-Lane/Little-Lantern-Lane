// The guide to everything outside the story: gathering, tools, fishing, making, trading and your home.
// Plain data and pure rules. A step is ticked by what you've actually done, and nothing here scores
// you: you can skip any of it, in any order.

import { canAfford, countOf, ITEMS, RECIPES, TOOLS, type BagState, type ItemId, type Tool } from "./bag";

/** Always on the guide: what this game is not, and where to turn. */
export const GUIDE_NOTE = "This game isn't therapy or a crisis service. If you're in danger or thinking about hurting yourself, contact local emergency services (in the US, call or text 988).";

/** The free village, the week after the storm, or a chapter you've wandered out of into the woods. */
export type GuideMode = "village" | "week" | "chapter";

export interface GuideFacts {
  bag: BagState;
  mode: GuideMode;
  touch: boolean;
  /** Something of yours is out in a room. */
  furnished: boolean;
}

export interface GuideStep {
  id: string;
  title: string;
  /** One line for the tip on screen. */
  short: string;
  /** The whole of it, for the guide. */
  how: string;
  done: boolean;
  /** Whether you can do it where you are now. */
  open: boolean;
}

const STONES: ItemId[] = ["quartz", "ironstone", "copper", "skyglass", "seaglass"];
const FISH: ItemId[] = ["perch", "trout", "eel", "carp", "mackerel", "bass"];

function toolShort(b: BagState, tool: Tool): string {
  const needs = Object.entries(TOOLS[tool].needs) as [ItemId, number][];
  if (canAfford(b, TOOLS[tool].needs)) return "You have what it takes. Open your bag (B) and choose Make.";
  return `Collect ${needs.map(([id, n]) => `${ITEMS[id].name.toLowerCase()} ${Math.min(countOf(b, id), n)} of ${n}`).join(", ")}.`;
}

export function guideSteps({ bag: b, mode, touch, furnished }: GuideFacts): GuideStep[] {
  const press = touch ? "tap the button" : "press E";
  const found = (ids: ItemId[]) => ids.some((id) => b.found.includes(id));
  const toWoods = mode === "village" ? "Open the map (M) and pick Hazel Wood, or walk through the gate at the end of Lantern Lane." : "Walk through the gate at the end of Lantern Lane.";
  const askAround = mode === "week" ? " Or talk to Nell by the river, who has a spare." : "";
  const askTobin = mode === "week" ? " Or talk to Tobin, who'll lend you his." : "";
  const makeAt = mode === "week" ? "the table in your home" : mode === "village" ? "the table in your home, or the stall just inside the woods gate" : "the stall just inside the woods gate";
  const sellAt = mode === "chapter" ? "The stall just inside the woods gate takes anything." : mode === "week" ? "Talk to someone and choose to sell." : "The stall just inside the woods gate takes anything. Or talk to someone and choose to sell.";
  const inVillage = mode === "village";
  const notChapter = mode !== "chapter";

  return [
    {
      id: "gather",
      title: "Pick something up",
      short: `Go to Hazel Wood, walk up to anything growing and ${press}.`,
      how: `${toWoods} Walk up to fruit, mushrooms, bark or driftwood and ${press} when its name appears. It goes in your bag, and grows back in a minute or two. Lantern Sands has shells, seaweed and samphire too.`,
      done: b.gathered > 0,
      open: true,
    },
    {
      id: "rod",
      title: "Make a fishing rod",
      short: toolShort(b, "rod"),
      how: `Driftwood lies along the riverbank in Hazel Wood and on the beach. Birch bark peels from the white trees in the wood. With 2 driftwood and 1 birch bark, open your bag (B) and choose Make next to the rod.${askAround}`,
      done: b.tools.includes("rod"),
      open: true,
    },
    {
      id: "fish",
      title: "Catch a fish",
      short: `Stand on a jetty until "Fish here" appears, then ${press}.`,
      how: `Find a jetty on the river, or the rocks at Lantern Sands, and ${press} at "Fish here". Watch the float. When it twitches, ${press} for a small fish, or wait: let it go by and ${press} on the real pull for a bigger one. If you miss, it just settles again. Walk away to stop.`,
      done: found(FISH),
      open: true,
    },
    {
      id: "hammer",
      title: "Make a hammer",
      short: toolShort(b, "hammer"),
      how: `A hammer takes the same as a rod: 2 driftwood and 1 birch bark. Open your bag (B) and choose Make next to the hammer.${askTobin}`,
      done: b.tools.includes("hammer"),
      open: true,
    },
    {
      id: "stone",
      title: "Break off a stone",
      short: `Walk up to a rock with colour in it and ${press}.`,
      how: `Rocks with colour in them need the hammer. Ironstone and river quartz are in Hazel Wood, sea glass is among the rocks at Lantern Sands, and copper and skyglass are on the far bank, over the bridge.`,
      done: found(STONES),
      open: true,
    },
    {
      id: "make",
      title: "Make something",
      short: `Use ${makeAt}.`,
      how: `Use ${makeAt}. Every recipe shows what it takes, with what you have in brackets. Bramble jam is an easy first one: 1 apple and 2 blackberries. Things you make sell for more than what went into them, and they make good gifts. The recipes with plums, moonberries, bluecaps, copper or skyglass need things from the far bank.`,
      done: found(RECIPES.map((r) => r.makes)),
      open: true,
    },
    {
      id: "sell",
      title: "Sell something",
      short: mode === "chapter" ? "Use the stall just inside the woods gate." : "Talk to someone who buys what you have.",
      how: `${sellAt} Wren and Oda buy fruit, Ash buys mushrooms and sea plants, Tobin buys stones and shells, and Nell buys fish. All of them buy anything you've made. Fen, at Saltmouth, only buys fish, and pays the most for it.`,
      done: b.tried.includes("sell") || b.coins > 0,
      open: true,
    },
    {
      id: "give",
      title: "Give someone a gift",
      short: "Talk to someone and choose to give them something.",
      how: "Talk to someone and choose to give them something. Anything is welcome, and if you listen to what people talk about you'll learn what they like best. Once you've given someone a gift, the option goes away until you've gathered 5 more things.",
      done: Object.keys(b.gaveAt).length > 0,
      open: notChapter,
    },
    {
      id: "buy",
      title: "Spend your coins",
      short: "See what Nell, Tobin or the bakers have.",
      how: "Coins only buy extras. Nothing in the story needs them. Nell sells clothes, Tobin sells furniture and can add to your house, and the bakery, Ash and Fen sell food that makes a good gift.",
      done: b.tried.includes("buy") || b.lanterns.length > 0,
      open: true,
    },
    {
      id: "furnish",
      title: "Furnish your home",
      short: "Go home and open Furnish (F).",
      how: "Go into your home and open Furnish (F). Make something from what you've gathered, or use what you bought from Tobin. Stand where you want it and choose Put it here. You can turn it or put it away from the same place.",
      done: furnished,
      open: notChapter,
    },
    {
      id: "lantern",
      title: "Make a lantern",
      short: "Ask Tobin about making a lantern of your own.",
      how: "Ask Tobin about making a lantern of your own. Choose a colour and a shape. It costs 25 coins and hangs on the string in the Square, which has room for 12.",
      done: b.lanterns.length > 0,
      open: inVillage,
    },
    {
      id: "table",
      title: "Add to Juno's nature table",
      short: "Bring something you found to the table in the Square.",
      how: "Juno's table is in the Square. Bring one of each thing you find, and she'll write it down. Anything you've found counts; things you've made or bought don't.",
      done: b.nature.length > 0,
      open: inVillage,
    },
    {
      id: "swap",
      title: "Try Mara's swap shelf",
      short: "Leave one thing on the shelf in the Square and take another.",
      how: "The shelf is in the Square. Choose what to take, then choose something of yours to leave. No coins, and it's a good way to get something you can't find yet.",
      done: b.tried.includes("swap"),
      open: inVillage,
    },
  ];
}

/** The next thing to try here, if there's anything left. */
export const nextStep = (facts: GuideFacts): GuideStep | null => guideSteps(facts).find((s) => s.open && !s.done) ?? null;

/** Everything there is to do, and how much of it you've tried. */
export function guideProgress(facts: GuideFacts): { done: number; total: number } {
  const steps = guideSteps(facts);
  return { done: steps.filter((s) => s.done).length, total: steps.length };
}
