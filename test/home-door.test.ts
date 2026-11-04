// Your front door: when it opens, and that you can never get shut inside.

import { describe, expect, it } from "vitest";
import { canEnterHome, canLeaveHome, DOORS, HOME_DOOR, regionAt } from "../src/game/layout";
import { initialState } from "../src/logic/state";
import type { WorldState } from "../src/logic/world";
import { bandAt } from "../src/world3d/space";

const base = initialState().world;
const w = (o: Partial<WorldState>): WorldState => ({ ...base, ...o });

describe("your front door", () => {
  it("opens from the street in the village chapters", () => {
    for (const level of [1, 2, 3] as const) expect(canEnterHome(w({ level }))).toBe(true);
  });

  it("opens on the snowy night, and the story moves you at dusk and dawn", () => {
    expect(canEnterHome(w({ level: 5, time: "night" }))).toBe(true);
    expect(canEnterHome(w({ level: 5, time: "sunset" }))).toBe(false);
    expect(canEnterHome(w({ level: 5, time: "morning" }))).toBe(false);
  });

  it("stays shut in chapters set somewhere else", () => {
    expect(canEnterHome(w({ level: 4 }))).toBe(false);
    expect(canEnterHome(w({ level: 6 }))).toBe(false);
  });

  it("can't be used to step out of the walk back to Mara or the hollow", () => {
    expect(canEnterHome(w({ pull: true }))).toBe(false);
    expect(canEnterHome(w({ form: "shell" }))).toBe(false);
  });

  it("stays shut when the lane is too dark to reach it", () => {
    expect(canEnterHome(w({ level: 2, time: "morning", darkness: 1, hasLight: false }))).toBe(false);
  });

  it("always lets you back out whenever you could have come in", () => {
    const states = [1, 2, 3, 5].flatMap((level) => (["morning", "afternoon", "sunset", "night"] as const).map((time) => w({ level: level as WorldState["level"], time })));
    for (const s of states) if (canEnterHome(s)) expect(canLeaveHome(s)).toBe(true);
  });

  it("has one way in and one way out, and they lead to each other's places", () => {
    const into = DOORS.find((d) => d.x === HOME_DOOR)!;
    const out = DOORS.find((d) => regionAt(d.x).id === "home")!;
    expect(regionAt(into.to).id).toBe("home");
    expect(regionAt(out.to).id).toBe("village");
  });

  it("can be walked up to, past the edge of the lane", () => {
    expect(bandAt(HOME_DOOR)[0]).toBeLessThan(bandAt(HOME_DOOR + 300)[0]);
    // No sudden step at the edge of the path up to the door.
    for (let x = HOME_DOOR; x < HOME_DOOR + 200; x += 5) expect(Math.abs(bandAt(x + 5)[0] - bandAt(x)[0])).toBeLessThan(0.1);
  });
});
