// Shops you can walk into: the bakery, Nell's sewing room, Ash's tea room and Tobin's workshop.

import { describe, expect, it } from "vitest";
import { buyItem, COUNTER, counterPrice, initialBag, ITEMS, LANTERN_PAINTS, LANTERN_PRICE, makeLantern, MAX_LANTERNS, NATURE_ITEMS, normalizeBag, sell, sellable, swapShelf, toTable } from "../src/logic/bag";
import { initialState } from "../src/logic/state";
import { applyWorldEvent } from "../src/logic/world";
import { areaAt, DOORS, NPC_SPOTS, regionAt } from "../src/game/layout";

const village = applyWorldEvent(initialState().world, { name: "chapter", arg: "8" });

describe("shops", () => {
  it("the bakery and sewing room can be walked into from the street, and left again", () => {
    for (const shop of ["bakery", "sewing"] as const) {
      const into = DOORS.find((d) => regionAt(d.to).id === shop)!;
      expect(regionAt(into.x).id).toBe("village");
      expect(into.when!(village)).toBe(true);
      expect(into.when!(initialState().world)).toBe(false);
      const out = DOORS.find((d) => regionAt(d.x).id === shop)!;
      expect(regionAt(out.to).id).toBe("village");
      expect(out.when).toBeUndefined();
    }
  });

  it("puts each shopkeeper in their shop when you're free", () => {
    expect(regionAt(NPC_SPOTS.hub.wren!).id).toBe("bakery");
    expect(regionAt(NPC_SPOTS.hub.oda!).id).toBe("bakery");
    expect(regionAt(NPC_SPOTS.hub.nell!).id).toBe("sewing");
    expect(areaAt(NPC_SPOTS.hub.ash!).id).toBe("teashop");
    expect(regionAt(NPC_SPOTS.hub.tobin!).id).toBe("workshop");
  });

  it("leaves everyone where the story wants them in the chapters", () => {
    expect(regionAt(NPC_SPOTS.afternoon.wren!).id).toBe("village");
    expect(NPC_SPOTS.afternoon.ash).toBe(1880); // Ash's cart, before the tea room opens
  });

  it("sells over the counter for more than it buys back, so coins can't be made from nothing", () => {
    for (const id of [...COUNTER.wren, ...COUNTER.ash, ...COUNTER.fen]) {
      expect(counterPrice(id)).toBeGreaterThan(ITEMS[id].price);
      const b = buyItem({ ...initialBag(), coins: 100 }, id);
      expect(b.items[id]).toBe(1);
      expect(sell(b, id).coins).toBeLessThan(100);
    }
  });

  it("can't be bought without the coins", () => {
    expect(buyItem(initialBag(), "honey_bun")).toEqual(initialBag());
  });
});

describe("Fen's stall", () => {
  it("pays a little over the odds for fish, and only fish", () => {
    const b = { ...initialBag(), items: { trout: 1, apple: 1 } };
    expect(sellable(b, "fen")).toEqual(["trout"]);
    expect(sell(b, "trout", "fen").coins).toBeGreaterThan(sell(b, "trout", "nell").coins);
  });
  it("is at Saltmouth when you're free", () => {
    expect(regionAt(NPC_SPOTS.hub.fen!).id).toBe("coast");
  });
});

describe("your own lanterns", () => {
  const coins = { ...initialBag(), coins: 100 };
  it("cost coins and go on the string", () => {
    const b = makeLantern(coins, { colour: LANTERN_PAINTS[2], shape: "tall" });
    expect(b.lanterns).toHaveLength(1);
    expect(b.coins).toBe(100 - LANTERN_PRICE);
  });
  it("stop when the string is full, or the coins run out", () => {
    const l = { colour: LANTERN_PAINTS[0], shape: "round" as const };
    const full = { ...coins, lanterns: Array(MAX_LANTERNS).fill(l) };
    expect(makeLantern(full, l)).toEqual(full);
    expect(makeLantern(initialBag(), l).lanterns).toEqual([]);
  });
  it("are kept, and anything odd is dropped", () => {
    expect(normalizeBag({ lanterns: [{ colour: "#e9583c", shape: "tall" }, { colour: "purple", shape: "tall" }] }).lanterns).toHaveLength(1);
  });
});

describe("Juno's nature table", () => {
  it("takes one of each found thing, and nothing bought or made", () => {
    const b = toTable({ ...initialBag(), items: { apple: 2, jam: 1 } }, "apple");
    expect(b.nature).toEqual(["apple"]);
    expect(b.items.apple).toBe(1);
    expect(toTable(b, "apple")).toEqual(b);
    expect(toTable(b, "jam")).toEqual(b);
  });
  it("has room for everything you can find, and costs nothing", () => {
    expect(NATURE_ITEMS).toContain("skyglass");
    expect(NATURE_ITEMS).toContain("bass");
    expect(NATURE_ITEMS.some((id) => ITEMS[id].kind === "made")).toBe(false);
    expect(toTable({ ...initialBag(), coins: 9, items: { apple: 1 } }, "apple").coins).toBe(9);
  });
});

describe("Mara's swap shelf", () => {
  it("swaps one for one, with no coins", () => {
    const b = { ...initialBag(), coins: 5, items: { apple: 1 } };
    const after = swapShelf(b, "apple", "quartz");
    expect(after.items).toMatchObject({ apple: 0, quartz: 1 });
    expect(after.shelf).toContain("apple");
    expect(after.shelf).not.toContain("quartz");
    expect(after.shelf).toHaveLength(b.shelf.length);
    expect(after.coins).toBe(5);
  });
  it("needs something to leave, and something to take", () => {
    const b = initialBag();
    expect(swapShelf(b, "apple", "quartz")).toEqual(b);
    expect(swapShelf({ ...b, items: { apple: 1 } }, "apple", "skyglass").shelf).toEqual(b.shelf);
  });
});
