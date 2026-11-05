// The beach: down from the Square, with its own fish and things to gather.

import { describe, expect, it } from "vitest";
import { BEACH, BEACH_NODES, BEACH_SPOTS, DOORS, regionAt } from "../src/game/layout";
import { fishFor, ITEMS, sellable, initialBag } from "../src/logic/bag";
import { initialState } from "../src/logic/state";
import type { WorldState } from "../src/logic/world";
import { bandAt } from "../src/world3d/space";

const at = (o: Partial<WorldState>): WorldState => ({ ...initialState().world, ...o });
const down = DOORS.find((d) => d.label === "Go down to the beach")!;
const up = DOORS.find((d) => d.label === "Go back up to the Square")!;

describe("the beach", () => {
  it("is reached from the far corner of the Square, and leads back there", () => {
    expect(regionAt(down.x).id).toBe("village");
    expect(down.x).toBeLessThan(3200);
    expect(down.trail).toBeDefined();
    expect(regionAt(down.to).id).toBe("beach");
    expect(regionAt(up.to).id).toBe("village");
  });

  it("is shut for the moments the story needs you, and open otherwise", () => {
    expect(down.when!(at({}))).toBe(true);
    expect(down.when!(at({ level: 8 }))).toBe(true);
    for (const o of [{ pull: true }, { weather: "storm" as const }, { level: 4 as const }, { level: 6 as const }]) expect(down.when!(at(o))).toBe(false);
  });

  it("can always be left", () => {
    expect(up.when).toBeUndefined();
  });

  it("has everything inside the sands, with unique names", () => {
    expect(new Set(BEACH_NODES.map((n) => n.id)).size).toBe(BEACH_NODES.length);
    const [water, back] = bandAt(25000);
    expect(water).toBe(BEACH.water);
    for (const n of BEACH_NODES) {
      expect(regionAt(n.x).id).toBe("beach");
      expect(n.z).toBeGreaterThanOrEqual(water);
      expect(n.z).toBeLessThanOrEqual(back);
    }
  });

  it("has things to gather without a tool, and fish of its own", () => {
    expect(BEACH_NODES.filter((n) => !n.tool).length).toBeGreaterThan(15);
    expect(fishFor("sea", "nibble")).toBe("mackerel");
    expect(ITEMS[fishFor("sea", "pull")].price).toBeGreaterThan(ITEMS[fishFor("sea", "nibble")].price);
  });

  it("has fishing spots at the water's edge, with the float out at sea", () => {
    for (const s of BEACH_SPOTS) {
      expect(s.z).toBeGreaterThanOrEqual(BEACH.water);
      expect(s.floatZ).toBeLessThan(BEACH.water);
    }
  });

  it("gives everything a buyer", () => {
    const b = { ...initialBag(), items: { seaweed: 1, shell: 1, bass: 1 } };
    expect(sellable(b, "ash")).toContain("seaweed");
    expect(sellable(b, "tobin")).toContain("shell");
    expect(sellable(b, "nell")).toContain("bass");
  });
});
