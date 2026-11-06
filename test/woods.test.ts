// The week after the storm: gathering, selling, giving, making, the river, and the story through it.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Compiler } from "inkjs/full";
import { Engine } from "../src/engine";
import { applyBagEvent, BRIDGE_NEEDS, canAfford, canGift, CLOTHES, countOf, craft, DECOR_SHOP, FAVOURITES, fishFor, FRIENDS, gather, GIFT_GAP, giftFit, give, initialBag, ITEM_IDS, ITEMS, LANTERN_NEEDS, makeTool, normalizeBag, pay, RECIPES, sell, sellable, TOOLS, type BagState, type ItemId } from "../src/logic/bag";
import { BOUGHT_CLOTHES, DECOR } from "../src/logic/appearance";
import { applyEvent, initialState, type GameState } from "../src/logic/state";
import { applyWorldEvent, type WorldState } from "../src/logic/world";
import { bankAt, canVisitWoods, DOORS, FISHING_SPOTS, NODES, NPC_SPOTS, regionAt, riverMidX, WOODS, woodsAreaAt, woodsLimit } from "../src/game/layout";

const withItems = (items: Partial<Record<ItemId, number>>): BagState => ({ ...initialBag(), items });

describe("the bag", () => {
  it("gathering adds to the bag and the log", () => {
    const b = gather(gather(initialBag(), "apple"), "apple");
    expect(countOf(b, "apple")).toBe(2);
    expect(b.found).toEqual(["apple"]);
    expect(b.gathered).toBe(2);
  });

  it("selling swaps an item for its price and can't sell what you don't have", () => {
    const b = sell(withItems({ trout: 1 }), "trout");
    expect(b.coins).toBe(ITEMS.trout.price);
    expect(sell(b, "trout")).toEqual(b);
  });

  it("each buyer takes their own kind of thing and anything you made", () => {
    const b = withItems({ apple: 1, chanterelle: 1, jam: 1 });
    expect(sellable(b, "wren")).toEqual(["apple", "jam"]);
    expect(sellable(b, "ash")).toEqual(["chanterelle", "jam"]);
  });

  it("making uses the ingredients, and needs them all", () => {
    const b = craft(withItems({ apple: 1, blackberry: 2 }), "jam");
    expect(b.items).toMatchObject({ apple: 0, blackberry: 0, jam: 1 });
    expect(craft(withItems({ apple: 1 }), "jam").items.jam).toBeUndefined();
  });

  it("anything you make is worth more than what went into it", () => {
    for (const r of RECIPES) {
      const parts = (Object.entries(r.needs) as [ItemId, number][]).reduce((sum, [id, n]) => sum + ITEMS[id].price * n, 0);
      expect(ITEMS[r.makes].price).toBeGreaterThan(parts);
    }
  });

  it("paying can't take you below nothing", () => {
    expect(pay({ ...initialBag(), coins: 10 }, 20).coins).toBe(10);
    expect(pay({ ...initialBag(), coins: 30 }, 20).coins).toBe(10);
  });

  it("the bridge and lantern use up what they need", () => {
    const b = withItems({ driftwood: 7, ironstone: 2 });
    expect(canAfford(b, BRIDGE_NEEDS)).toBe(true);
    expect(applyBagEvent(b, { name: "use_items", arg: "bridge" }).items).toMatchObject({ driftwood: 1, ironstone: 0 });
  });

  it("a fish that takes patience is worth more than the first nibble", () => {
    for (const bank of ["near", "far"] as const) expect(ITEMS[fishFor(bank, "pull")].price).toBeGreaterThan(ITEMS[fishFor(bank, "nibble")].price);
  });

  it("restores a bag from a save without one", () => {
    expect(normalizeBag(undefined)).toEqual(initialBag());
    expect(normalizeBag({ coins: 5, found: ["apple", "nonsense"] })).toMatchObject({ coins: 5, found: ["apple"], tools: [] });
  });
});

describe("tools", () => {
  it("can be made from things that need no tools, on the near bank", () => {
    const nearFree = new Set(NODES.filter((n) => !n.tool && bankAt(n.x, n.z) === "wood").map((n) => n.item));
    for (const t of Object.values(TOOLS)) for (const id of Object.keys(t.needs) as ItemId[]) expect(nearFree.has(id), id).toBe(true);
  });

  it("use up what they take, and only once", () => {
    const b = makeTool(withItems({ driftwood: 4, birch_bark: 2 }), "rod");
    expect(b.tools).toEqual(["rod"]);
    expect(b.items).toMatchObject({ driftwood: 2, birch_bark: 1 });
    expect(makeTool(b, "rod")).toEqual(b);
  });

  it("can't be made without the materials", () => {
    expect(makeTool(withItems({ driftwood: 1 }), "rod").tools).toEqual([]);
  });

  it("being given one you already made changes nothing", () => {
    const b = makeTool(withItems({ driftwood: 2, birch_bark: 1 }), "rod");
    expect(applyBagEvent(b, { name: "tool", arg: "rod" }).tools).toEqual(["rod"]);
  });
});

describe("gifts", () => {
  it("never go wrong: every gift to everyone is best, good or simply kind", () => {
    for (const who of FRIENDS) for (const id of ITEM_IDS) expect(["best", "good", "kind"]).toContain(giftFit(who, id));
  });

  it("everyone has favourites that exist", () => {
    for (const who of FRIENDS) for (const id of FAVOURITES[who].best) expect(ITEMS[id]).toBeDefined();
  });

  it("can't be repeated straight away, so they can't be used to buy someone", () => {
    let b = give(withItems({ apple: 3 }), "nell", "apple");
    expect(canGift(b, "nell")).toBe(false);
    expect(canGift(b, "ash")).toBe(true);
    for (let i = 0; i < GIFT_GAP; i++) b = gather(b, "blackberry");
    expect(canGift(b, "nell")).toBe(true);
  });
});

describe("what coins can buy", () => {
  it("everything on sale is something the game can draw", () => {
    for (const c of CLOTHES) expect(BOUGHT_CLOTHES).toContain(c.id);
    expect(DECOR_SHOP.map((d) => d.id).sort()).toEqual([...DECOR].sort());
  });
});

describe("the woods", () => {
  it("has one thing per spot, all inside the woods and within walking reach", () => {
    expect(new Set(NODES.map((n) => n.id)).size).toBe(NODES.length);
    for (const n of NODES) {
      expect(regionAt(n.x).id).toBe("woods");
      expect(Math.abs(n.z)).toBeLessThanOrEqual(WOODS.band);
      expect(bankAt(n.x, n.z)).not.toBe("river");
      expect(Math.abs(n.x - riverMidX(n.z))).toBeGreaterThan((WOODS.river1 - WOODS.river0) / 2 + 100);
    }
  });

  it("offers on the near bank everything the bridge needs, and on the far bank everything the lantern needs", () => {
    const nearBank = new Set(NODES.filter((n) => bankAt(n.x, n.z) === "wood").map((n) => n.item));
    const farBank = new Set(NODES.filter((n) => bankAt(n.x, n.z) === "farbank").map((n) => n.item));
    for (const id of Object.keys(BRIDGE_NEEDS) as ItemId[]) expect(nearBank.has(id)).toBe(true);
    for (const id of Object.keys(LANTERN_NEEDS) as ItemId[]) expect(farBank.has(id)).toBe(true);
  });

  it("has enough driftwood for the bridge without waiting for it to wash up again", () => {
    expect(NODES.filter((n) => n.item === "driftwood").length).toBeGreaterThanOrEqual(BRIDGE_NEEDS.driftwood!);
  });

  it("has two different forests", () => {
    expect(woodsAreaAt(15000, 0).id).toBe("wood");
    expect(woodsAreaAt(17220, 0).id).toBe("river");
    expect(woodsAreaAt(18500, 0).id).toBe("farbank");
  });

  it("is a wide place you can walk deep into, not a path", () => {
    expect(WOODS.band).toBeGreaterThan(40);
    const zs = NODES.map((n) => n.z);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(60);
    // Which side you're on depends on the river, not just how far along you are.
    expect(woodsAreaAt(17100, 44).id).toBe("wood");
    expect(woodsAreaAt(17300, -44).id).toBe("farbank");
  });

  it("stops you at the river until there's a bridge, then only the bridge crosses", () => {
    expect(woodsLimit(17100, 0, false)).toBe(WOODS.river0);
    expect(woodsLimit(17100, 0, true)).toBe(17100);
    expect(woodsLimit(17100, 5, true)).toBe(WOODS.river0);
    expect(woodsLimit(17400, 5, true)).toBe(WOODS.river1);
    expect(woodsLimit(16000, 5, false)).toBe(16000);
    // Follows the river as it curves away from the bridge.
    for (const z of [-40, -20, 20, 40]) expect(bankAt(woodsLimit(riverMidX(z) - 50, z, true), z)).not.toBe("farbank");
  });

  it("puts a fishing spot on each bank, with the float in the river", () => {
    for (const bank of ["near", "far"]) expect(FISHING_SPOTS.some((s) => s.bank === bank)).toBe(true);
    for (const s of FISHING_SPOTS) {
      expect(bankAt(s.floatX, s.floatZ)).toBe("river");
      expect(bankAt(s.x, s.z)).toBe(s.bank === "near" ? "wood" : "farbank");
    }
  });

  const at = (o: Partial<WorldState>): WorldState => ({ ...initialState().world, ...o });
  const open = (w: WorldState) => DOORS.filter((d) => regionAt(d.to).id === "woods" && d.when!(w));
  const back = (w: WorldState) => DOORS.filter((d) => regionAt(d.x).id === "woods" && d.when!(w));

  it("can be reached from every chapter, by one way in from where that chapter is", () => {
    const start: [WorldState["level"], string][] = [[1, "village"], [2, "village"], [3, "village"], [4, "mill"], [5, "village"], [6, "coast"], [7, "village"]];
    for (const [level, from] of start) {
      const w = at({ level, weather: level === 5 ? "snow" : "clear", time: level === 5 ? "sunset" : "afternoon" });
      expect(open(w).map((d) => regionAt(d.x).id), `chapter ${level}`).toEqual([from]);
      expect(back(w).map((d) => regionAt(d.to).id), `chapter ${level}`).toEqual([from]);
    }
  });

  it("isn't a way out of the moments the story needs you for", () => {
    for (const o of [{ pull: true }, { form: "shell" as const }, { panic: true }, { weather: "storm" as const }, { ended: true }, { level: 5 as const, time: "night" as const }]) expect(canVisitWoods(at(o))).toBe(false);
  });

  it("always has exactly one way back, whatever has changed", () => {
    for (const level of [1, 2, 3, 4, 5, 6, 7] as const) for (const o of [{}, { pull: true }, { weather: "storm" as const }, { time: "night" as const }]) expect(back(at({ level, ...o }))).toHaveLength(1);
  });

  it("keeps the bridge and lantern once they're built, through later chapters", () => {
    const w = at({ level: 7, props: ["bridge", "bridge_lantern", "sign_up"] });
    expect(applyWorldEvent(w, { name: "chapter", arg: "4" }).props).toEqual(["bridge", "bridge_lantern"]);
  });

  it("the stall takes anything, unlike a villager", () => {
    const b = withItems({ apple: 1, trout: 1 });
    expect(sellable(b, "stall")).toEqual(["apple", "trout"]);
  });

  it("everyone you trade with is somewhere", () => {
    for (const id of ["nell", "ash", "wren", "tobin", "mara", "oda", "pip", "juno"] as const) expect(NPC_SPOTS.woods[id]).toBeDefined();
  });
});

describe("the far bank story", () => {
  const json = new Compiler(readFileSync("story/festival.ink", "utf8")).Compile().ToJson()!;

  function play(picks: string[], bag: Partial<Record<ItemId, number>>) {
    let state: GameState = { ...initialState(), bag: withItems(bag) };
    const engine = new Engine(json, "main", () => state.meter.distress, () => state.bag);
    engine.startAt("start_woods");
    const lines: string[] = [];
    const scenes: string[] = [];
    const queue = [...picks];
    while (!engine.ended) {
      let scene: string | null = null;
      for (const line of engine.lines()) {
        scene = line.scene;
        for (const ev of line.events) state = applyEvent(state, ev);
        lines.push(line.text);
      }
      if (scene) {
        scenes.push(scene);
        engine.choose(0);
        if (scene === "save") break;
        continue;
      }
      const want = queue.shift();
      if (want === undefined) break;
      const c = engine.choices.find((x) => x.text.toLowerCase().includes(want));
      if (!c) throw new Error(`No choice "${want}" in: ${engine.choices.map((x) => x.text).join(" | ")}`);
      engine.choose(c.index);
    }
    return { engine, state, text: lines.join("\n"), scenes };
  }

  const FULL = { driftwood: 6, ironstone: 2, birch_bark: 2, glowcap: 1, skyglass: 1 };

  it("starts at your door with nothing to do", () => {
    const r = play([], {});
    expect(r.state.world).toMatchObject({ level: 7, location: "lane", time: "morning" });
    expect(r.text).toContain("footbridge");
  });

  it("people hand you what you need to get going", () => {
    const r = play(["talk to tobin", "let him get on", "talk to nell", "sit a while"], {});
    expect(r.state.bag.tools.sort()).toEqual(["hammer", "rod"]);
  });

  it("won't offer the bridge until you have what it takes", () => {
    const r = play(["talk to mara"], {});
    expect(r.engine.choices.some((c) => c.text.includes("I've got the driftwood"))).toBe(false);
  });

  it("goes from the bridge to the lantern to home, and on to opening day", () => {
    const r = play([
      "talk to mara", "i've got the driftwood",
      "talk to tobin", "i've got the bark", "the river",
      "walk home",
    ], FULL);
    expect(r.state.world.props).toEqual(expect.arrayContaining(["bridge", "bridge_lantern"]));
    expect(r.state.bag.items).toMatchObject({ driftwood: 0, skyglass: 0 });
    expect(r.engine.getVar("next_chapter")).toBe(4);
    expect(r.scenes).toContain("save");
    expect(r.state.world.placed.tobin).toBeUndefined();
  });

  it("every answer to Nell's question is met warmly, and none of them changes anything", () => {
    for (const a of ["the river", "finding things", "people", "i don't know"]) {
      const r = play(["talk to mara", "i've got the driftwood", "talk to tobin", "i've got the bark", a], FULL);
      expect(r.state.world.props).toContain("bridge_lantern");
      expect(r.engine.getVar("woods_stage")).toBe(2);
    }
  });

  it("gives every villager a reply for every kind of gift", () => {
    for (const who of FRIENDS) for (const fit of ["best", "good", "kind"]) {
      const engine = new Engine(json, "main");
      engine.setVar("gift_item", "jam");
      engine.setVar("gift_name", "Bramble jam");
      engine.setVar("gift_fit", fit);
      engine.startAt("start_woods");
      // Jump to the reply on its own by asking the story for it directly.
      (engine as unknown as { story: { ChoosePathString(p: string, reset: boolean, args: unknown[]): void } }).story.ChoosePathString("given", true, [who]);
      const first = engine.lines().next().value;
      expect(first?.spoken?.text.length, `${who} ${fit}`).toBeGreaterThan(0);
    }
  });
});

describe("a bridge you've built", () => {
  it("is still there when you play the week again, and nothing asks you to build it twice", async () => {
    const { Engine } = await import("../src/engine");
    const { initialBag } = await import("../src/logic/bag");
    const { Compiler } = await import("inkjs/full");
    const json = new Compiler((await import("node:fs")).readFileSync("story/festival.ink", "utf8")).Compile().ToJson()!;
    const bag = { ...initialBag(), built: ["bridge"], items: { driftwood: 9, ironstone: 9 } };
    const e = new Engine(json, "main", () => 0, () => bag);
    e.startAt("start_woods");
    const text = e.continueBatch().map((l) => l.text).join(" ");
    expect(text).toContain("still standing");
    expect(e.getVar("woods_stage")).toBe(1);
    expect(text).not.toContain("Six good lengths");
  });
});
