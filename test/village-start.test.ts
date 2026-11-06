// The village every game starts in: lanterns for each chapter, all open, and people to trade with.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Compiler } from "inkjs/full";
import { Engine } from "../src/engine";
import { initialBag, ITEM_IDS, applyBagEvent, normalizeBag } from "../src/logic/bag";
import { applyEvent, initialState } from "../src/logic/state";
import { applyWorldEvent } from "../src/logic/world";
import { canEnterHome, canLeaveHome, canVisitWoods, distToTrail, USABLES, DOORS, LANTERN_ROW, MAP_BOARDS, MAP_PLACES, NEXT_GIVER, NPC_SPOTS, onTrail, PATH_REACH, phaseOf, PLAYER_SPOTS, regionAt, TRAILS, WALK_SIGNS } from "../src/game/layout";
import { bandAt } from "../src/world3d/space";
import { readBag, writeBag } from "../src/save";

const source = readFileSync("story/festival.ink", "utf8");
const json = new Compiler(source).Compile().ToJson()!;
const inVillage = () => applyWorldEvent(initialState().world, { name: "chapter", arg: "8" });

function start(giver = "mara") {
  const engine = new Engine(json, "main", () => 0, () => ({ ...initialBag(), items: Object.fromEntries(ITEM_IDS.map((id) => [id, 3])) }));
  engine.startAt("village_hub");
  engine.setVar("next_giver", giver);
  engine.continueBatch();
  return engine;
}

describe("the village", () => {
  it("every part of the story exists, and all of them are on the map", () => {
    for (const l of LANTERN_ROW) if (l.knot) expect(source).toContain(`=== ${l.knot} ===`);
    expect(LANTERN_ROW).toHaveLength(8);
  });

  it("puts you in the Square", () => {
    expect(inVillage()).toMatchObject({ level: 8, location: "hub" });
    expect(PLAYER_SPOTS.hub).toBeGreaterThan(2050);
    expect(PLAYER_SPOTS.hub).toBeLessThan(3200);
  });

  it("names someone to start every part of the story, and they're in the village", () => {
    const spots = NPC_SPOTS[phaseOf(inVillage(), false)];
    for (const n of [1, 2, 3, 4, 5, 6, 7]) expect(spots[NEXT_GIVER[n].who as "mara"], String(n)).toBeDefined();
  });

  it("only the person the story needs has a bright bubble and the next step", () => {
    for (const who of ["mara", "nell", "ash", "oda", "tobin"]) {
      const e = start(who);
      const fresh = e.choices.filter((c) => c.fresh);
      expect(fresh).toHaveLength(1);
      e.choose(fresh[0].index);
      e.continueBatch();
      const go = e.choices.find((c) => c.text.includes("I'm ready"));
      expect(go, who).toBeDefined();
      e.choose(go!.index);
      expect(e.continueBatch().at(-1)?.scene).toBe("startpart");
    }
  });

  it("nobody else offers it", () => {
    const e = start("ash");
    e.choose(e.choices.find((c) => c.text === "Talk to Nell")!.index);
    e.continueBatch();
    expect(e.choices.some((c) => c.text.includes("I'm ready"))).toBe(false);
  });

  it("has everyone you can talk to", () => {
    const spots = NPC_SPOTS[phaseOf(inVillage(), false)];
    for (const id of ["nell", "tobin", "ash", "wren", "oda", "mara", "pip", "juno"] as const) expect(spots[id]).toBeDefined();
  });

  it("lets you go home and to the woods", () => {
    expect(canEnterHome(inVillage())).toBe(true);
    expect(canLeaveHome(inVillage())).toBe(true);
    expect(canVisitWoods(inVillage())).toBe(true);
  });

  it("lets you walk everywhere the map can take you", () => {
    const w = inVillage();
    const open = DOORS.filter((d) => (!d.when || d.when(w)) && !d.needs);
    const seen = new Set(["village"]);
    for (let i = 0; i < 6; i++) for (const d of open) if (seen.has(regionAt(d.x).id)) seen.add(regionAt(d.to).id);
    for (const p of Object.values(MAP_PLACES)) expect(seen.has(regionAt(p.x).id), p.name).toBe(true);
  });

  it("never lands you on the end of a path, so walking through one can't bounce you back", () => {
    for (const d of DOORS.filter((x) => x.path)) {
      for (const back of DOORS.filter((x) => x.path && regionAt(x.x) === regionAt(d.to))) {
        const z = back.z ?? bandAt(back.x)[0];
        expect(Math.hypot((back.x - d.to) / 55, z - (d.toZ ?? 0.6)), `${d.label} lands on ${back.label}`).toBeGreaterThan(PATH_REACH);
      }
    }
  });

  it("marks every way between outdoor places as a path you can just walk along", () => {
    for (const d of DOORS) {
      const a = regionAt(d.x).id;
      const b = regionAt(d.to).id;
      const outside = (id: string) => ["village", "woods", "beach", "mill", "coast"].includes(id);
      if (outside(a) && outside(b) && d.label !== "Go into the workshop") expect(d.path, d.label).toBe(true);
    }
  });

  it("gives every way out a real path, ending where it takes you", () => {
    for (const d of DOORS.filter((x) => x.path)) {
      expect(d.trail, d.label).toBeDefined();
      expect(regionAt(d.trail![0][0]).id, d.label).toBe(regionAt(d.x).id);
      expect(onTrail(d.x, d.z!, d.trail!), d.label).toBe(true);
    }
  });

  it("paths start inside the place you can walk, and lead out past its edge or to its end", () => {
    for (const t of Object.values(TRAILS)) {
      const [back, front] = bandAt(t[0][0]);
      expect(t[0][1]).toBeGreaterThanOrEqual(back);
      expect(t[0][1]).toBeLessThanOrEqual(front);
    }
  });

  it("lets you walk the middle of a path, but not wander off beside it", () => {
    const t = TRAILS.toBeach;
    expect(onTrail(3130, 10, t)).toBe(true);
    expect(onTrail(3130 + 5 * 55, 10, t)).toBe(false);
  });

  it("signposts the way to the beach from the Square", () => {
    expect(WALK_SIGNS.find((s) => /BEACH/.test(s.text) && s.x < 3200)?.always).toBe(true);
  });

  it("keeps signs and map boards clear of each other, of paths and of doors", () => {
    const posts = [...WALK_SIGNS.filter((s) => !s.only), ...MAP_BOARDS];
    posts.forEach((a, i) => {
      posts.slice(i + 1).forEach((b) => {
        if (regionAt(a.x) !== regionAt(b.x) || Math.abs(a.z - b.z) > 3) return;
        expect(Math.abs(a.x - b.x) / 55, `${a.x} and ${b.x}`).toBeGreaterThan(2.3);
      });
      for (const t of Object.values(TRAILS)) if (regionAt(t[0][0]) === regionAt(a.x)) expect(distToTrail(a.x, a.z, t), `${a.x} on a path`).toBeGreaterThan(1.6);
    });
    // Saltmouth's front doors, and the Square's.
    for (const door of [11058, 11300, 11467, 2296, 2832]) {
      for (const p of posts) if (regionAt(p.x) === regionAt(door) && p.z < 0) expect(Math.abs(p.x - door) / 55, `${p.x} in front of a door`).toBeGreaterThan(1.4);
    }
  });

  it("shows only one sign in any spot, whichever chapter it is", () => {
    for (const level of [undefined, 4, 6]) {
      const shown = WALK_SIGNS.filter((s) => (level ? s.only === level || s.always : !s.only));
      shown.forEach((a, i) => shown.slice(i + 1).forEach((b) => expect(Math.hypot((a.x - b.x) / 55, a.z - b.z), `${a.text} and ${b.text}`).toBeGreaterThan(2.3)));
    }
  });

  it("keeps the mirror inside your home", () => {
    expect(regionAt(USABLES.mirror.x).id).toBe("home");
  });

  it("has a map board in every outdoor place", () => {
    const places = new Set(MAP_BOARDS.map((m) => regionAt(m.x).id));
    for (const id of ["village", "woods", "beach", "mill", "coast"] as const) expect(places.has(id), id).toBe(true);
  });

  it("lets you trade and come back to the village", () => {
    const e = start();
    e.choose(e.choices.find((c) => c.text === "Talk to Nell")!.index);
    e.continueBatch();
    e.choose(e.choices.find((c) => c.text.startsWith("Sell her"))!.index);
    const lines = e.continueBatch();
    expect(lines.at(-1)?.scene).toBe("sell");
    e.choose(0);
    e.continueBatch();
    e.choose(e.choices.find((c) => c.text === "Off you go")!.index);
    e.continueBatch();
    expect(e.choices.some((c) => c.text === "Change how you look")).toBe(true);
  });
});

describe("what lasts between games", () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  };

  it("your bag is kept, whichever chapter you start", () => {
    const store = memory();
    writeBag({ ...initialBag(), coins: 40, tools: ["rod"] }, store);
    expect(readBag(store)).toMatchObject({ coins: 40, tools: ["rod"] });
  });

  it("a bag can't break anything if it's missing or broken", () => {
    const store = memory();
    expect(readBag(store)).toEqual(normalizeBag(null));
    store.setItem("lantern-night:bag", "{oops");
    expect(readBag(store)).toEqual(normalizeBag(null));
  });

  it("remembers what you built, but the far bank week starts with the bridge still out", () => {
    const b = applyBagEvent(initialBag(), { name: "prop", arg: "on:bridge" });
    expect(b.built).toEqual(["bridge"]);
    expect(applyBagEvent(initialBag(), { name: "prop", arg: "on:sign_up" }).built).toEqual([]);
    const w = { ...initialState().world, props: ["bridge"] };
    expect(applyWorldEvent(w, { name: "chapter", arg: "7" }).props).toEqual(["bridge"]);
    expect(applyWorldEvent(w, { name: "chapter", arg: "4" }).props).toEqual(["bridge"]);
    expect(applyEvent(initialState(), { name: "prop", arg: "on:bridge" }).bag.built).toEqual(["bridge"]);
  });
});

describe("the paths stay clear", () => {
  const paths = [TRAILS.toBeach, TRAILS.toMill, TRAILS.toWoods];
  const away = (x: number, z: number) => Math.min(...paths.map((t) => distToTrail(x, z, t)));

  it("keeps the shelf, the nature table and the map board off the paths", () => {
    for (const u of [USABLES.swap_shelf, USABLES.nature_table]) expect(away(u.x, u.z! - 0.9), u.label).toBeGreaterThan(3);
    for (const m of MAP_BOARDS.filter((m) => m.x < 3400)) expect(away(m.x, m.z)).toBeGreaterThan(3);
  });

  it("keeps people in the village off the paths", () => {
    for (const [who, x] of Object.entries(NPC_SPOTS.hub)) if (x > 2050 && x < 3400) expect(away(x, 1), who).toBeGreaterThan(1.9);
  });
});
