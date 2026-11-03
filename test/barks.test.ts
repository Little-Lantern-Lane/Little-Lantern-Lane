import { describe, expect, it } from "vitest";
import { BARKS, barkPhase, pickBark } from "../src/game/barks";
import { CAST } from "../src/logic/cast";
import { initialWorld } from "../src/logic/world";

const DBT_TERMS = /opposite action|check(ing)? the facts|chain analysis|\\bDBT\\b|TIPP|wise mind|self-soothe/i;

describe("passing remarks", () => {
  it("every villager has remarks for every phase in plain words", () => {
    for (const lines of Object.values(BARKS)) {
      for (const [id, list] of Object.entries(lines)) {
        expect(id in CAST).toBe(true);
        for (const line of list) {
          expect(line.length).toBeLessThan(50);
          expect(line).not.toMatch(DBT_TERMS);
        }
      }
    }
  });

  it("nobody chats during the storm, while hiding, or on the night you hid", () => {
    expect(barkPhase({ ...initialWorld(), level: 3, weather: "storm", time: "night" })).toBeNull();
    expect(barkPhase({ ...initialWorld(), form: "shell" })).toBeNull();
    expect(barkPhase({ ...initialWorld(), lanterns: "heaped", time: "night" })).toBeNull();
  });

  it("under the shame haze, only people you've found out about make friendly remarks", () => {
    const haze = { ...initialWorld(), lanterns: "scattered" as const, lens: "shame" as const };
    expect(pickBark(haze, "tobin", 0)).toBeNull();
    expect(pickBark({ ...haze, factsFound: ["tobin"] }, "tobin", 0)).toBe("Sorry again. About the laugh.");
    expect(pickBark(haze, "nell", 0)).not.toBeNull();
  });

  it("chapters get their own remarks", () => {
    expect(barkPhase({ ...initialWorld(), level: 2, time: "morning" })).toBe("day2");
    expect(barkPhase({ ...initialWorld(), level: 3, time: "night" })).toBe("after_storm");
    expect(barkPhase({ ...initialWorld(), time: "night", lanterns: "hung" })).toBe("festival");
  });
});
