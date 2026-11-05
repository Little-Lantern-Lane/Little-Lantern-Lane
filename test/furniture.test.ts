// Furniture and the extra rooms.

import { describe, expect, it } from "vitest";
import { buildAddition, DEFAULT_HOME, growRoom, hasRoom, normalizeHome, toggleAddition } from "../src/logic/appearance";
import { ITEMS } from "../src/logic/bag";
import { addPiece, canPlace, FURNITURE, FURNITURE_IDS, normalizeFurnishings, NO_FURNITURE, place, putAway, turnPiece } from "../src/logic/furniture";
import { DOORS, regionAt, USABLES } from "../src/game/layout";
import { bandAt } from "../src/world3d/space";

const withStool = addPiece(NO_FURNITURE, "stool");

describe("furniture", () => {
  it("every piece can be got somehow, and what it needs exists", () => {
    for (const id of FURNITURE_IDS) {
      const f = FURNITURE[id] as { price?: number; needs?: Record<string, number> };
      expect(f.price !== undefined || f.needs !== undefined, id).toBe(true);
      for (const item of Object.keys(f.needs ?? {})) expect(ITEMS[item as keyof typeof ITEMS], item).toBeDefined();
    }
  });

  it("offers things you can only make, as well as things you can only buy", () => {
    const list = FURNITURE_IDS.map((id) => FURNITURE[id] as { price?: number; needs?: unknown });
    expect(list.some((f) => f.needs && !f.price)).toBe(true);
    expect(list.some((f) => f.price && !f.needs)).toBe(true);
  });

  it("goes from your store into a room and back", () => {
    const f = place(withStool, "stool", "bedroom", 21000, 0, 1);
    expect(f.stored).toEqual([]);
    expect(f.placed).toEqual([{ id: "stool", room: "bedroom", x: 21000, z: 0, turn: 1 }]);
    expect(putAway(f, 0)).toEqual({ stored: ["stool"], placed: [] });
  });

  it("can't be placed if you don't have it, or on top of something else", () => {
    expect(place(NO_FURNITURE, "stool", "bedroom", 21000, 0, 0)).toEqual(NO_FURNITURE);
    const f = addPiece(place(withStool, "stool", "bedroom", 21000, 0, 0), "bed");
    expect(canPlace(f, "bed", "bedroom", 21000, 0.5)).toBe(false);
    expect(canPlace(f, "bed", "bedroom", 21200, 0)).toBe(true);
    expect(canPlace(f, "bed", "sitting", 21000, 0)).toBe(true);
  });

  it("a rug can go under anything", () => {
    const f = addPiece(place(withStool, "stool", "bedroom", 21000, 0, 0), "rug_round");
    expect(canPlace(f, "rug_round", "bedroom", 21000, 0)).toBe(true);
  });

  it("keeps the story's spots clear in the main room", () => {
    for (const id of ["stove", "kettle", "music_box", "window", "craft_table"] as const) expect(canPlace(withStool, "stool", "home", USABLES[id].x, -1.2)).toBe(false);
    expect(canPlace(withStool, "stool", "home", 6985, 1)).toBe(false); // where the kids sleep
    expect(canPlace(withStool, "stool", "home", 7300, 1)).toBe(true);
  });

  it("turns in quarter turns", () => {
    let f = place(withStool, "stool", "bedroom", 21000, 0, 3);
    f = turnPiece(f, 0);
    expect(f.placed[0].turn).toBe(0);
  });

  it("survives a save, and drops anything it doesn't recognise", () => {
    expect(normalizeHome({}).furniture).toEqual(NO_FURNITURE);
    expect(normalizeFurnishings({ stored: ["bed", "dragon"], placed: [{ id: "stool", room: "attic", x: 1, z: 1 }, { id: "chest", room: "cellar", x: 22900, z: 0, turn: 9 }] })).toEqual({ stored: ["bed"], placed: [{ id: "chest", room: "cellar", x: 22900, z: 0, turn: 1 }] });
  });
});

describe("extra rooms", () => {
  it("come with the additions, and a cellar can be bought", () => {
    expect(hasRoom(DEFAULT_HOME, "bedroom")).toBe(false);
    const up = toggleAddition(growRoom(DEFAULT_HOME), "up");
    expect(hasRoom(up, "bedroom")).toBe(true);
    expect(hasRoom({ ...DEFAULT_HOME, decor: ["cellar"] }, "cellar")).toBe(true);
  });

  it("can be built for coins without using up what save points give you", () => {
    const built = buildAddition(DEFAULT_HOME, "side");
    expect(hasRoom(built, "sitting")).toBe(true);
    expect(built.slots).toBe(1);
    expect(buildAddition(built, "side")).toBe(built);
  });

  it("each has a way in that needs the room, and a way out that doesn't", () => {
    for (const room of ["bedroom", "sitting", "cellar"] as const) {
      const into = DOORS.filter((d) => d.needs === room);
      expect(into).toHaveLength(1);
      expect(regionAt(into[0].x).id).toBe("home");
      expect(regionAt(into[0].to).id).toBe(room);
      const out = DOORS.filter((d) => regionAt(d.x).id === room);
      expect(out).toHaveLength(1);
      expect(regionAt(out[0].to).id).toBe("home");
      expect(out[0].when).toBeUndefined();
    }
  });

  it("are rooms you can walk around in", () => {
    expect(bandAt(21000)).toEqual(bandAt(7000));
  });
});
