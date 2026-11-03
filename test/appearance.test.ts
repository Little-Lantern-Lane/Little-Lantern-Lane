import { describe, expect, it } from "vitest";
import {
  ADDITIONS, ANIMALS, CUSTOM_PARTS, DEFAULT_CHARACTER, DEFAULT_HOME, EXTRAS, HATS, HOME_STYLES, OUTFITS,
  growRoom, normalizeCharacter, normalizeHome, remainingAdditions, toggleAddition, type HomeChoice,
} from "../src/logic/appearance";
import { EXPRESSIONS } from "../src/logic/cast";
import { characterMarkup } from "../src/ui/plush";
import { applyCharacter } from "../src/ui/wardrobe";
import { homeMarkup, homeSceneSVG } from "../src/game/homes";
import { readLooks, writeLooks } from "../src/save";

const clean = (svg: string) => expect(svg).not.toMatch(/NaN|undefined|Infinity/);

describe("your character", () => {
  it("every animal, fur, outfit, hat and extra draws cleanly", () => {
    for (const animal of ANIMALS) {
      for (const fur of [0, 1, 2]) {
        for (const outfit of OUTFITS) {
          for (const hat of HATS) {
            applyCharacter({ ...DEFAULT_CHARACTER, animal, fur, outfit, hat, extra: EXTRAS[(fur + HATS.indexOf(hat)) % EXTRAS.length] });
            clean(characterMarkup("you", "neutral"));
          }
        }
      }
    }
  });

  it("feelings, talking and walking still work in any look", () => {
    applyCharacter({ ...DEFAULT_CHARACTER, body: "girl", animal: "koala", outfit: "hoodie", hat: "beanie" });
    for (const e of EXPRESSIONS) for (const frame of ["closed", "open", "blink"] as const) clean(characterMarkup("you", e, { frame }));
    clean(characterMarkup("you", "neutral", { step: 1, turn: 1, swing: true }));
  });

  it("the girl's face has lashes and the boy's doesn't", () => {
    applyCharacter({ ...DEFAULT_CHARACTER, body: "girl" });
    const girl = characterMarkup("you", "neutral");
    applyCharacter({ ...DEFAULT_CHARACTER, body: "boy" });
    const boy = characterMarkup("you", "neutral");
    expect(girl).not.toBe(boy);
    // Lashes are short strokes in the eye color, drawn only on the girl's face.
    const strokes = (svg: string) => (svg.match(/stroke="#2a1c16" stroke-width="1\.08"/g) ?? []).length;
    expect(strokes(girl)).toBeGreaterThan(strokes(boy));
    applyCharacter(DEFAULT_CHARACTER);
  });

  it("a saved choice with unknown values falls back to the defaults", () => {
    expect(normalizeCharacter(null)).toEqual(DEFAULT_CHARACTER);
    expect(normalizeCharacter({ animal: "dragon", fur: 9, outfit: "dress", color: 2 })).toEqual({ ...DEFAULT_CHARACTER, outfit: "dress", color: 2 });
  });
});

describe("your home", () => {
  const all = (home: HomeChoice): HomeChoice => ({ ...home, slots: 4, grown: [...ADDITIONS] });

  it("every style draws with any additions, in summer and snow", () => {
    for (const style of HOME_STYLES) {
      for (let mask = 0; mask < 16; mask++) {
        const grown = ADDITIONS.filter((_, i) => mask & (1 << i));
        const home: HomeChoice = { ...DEFAULT_HOME, style, slots: 4, grown };
        clean(homeMarkup(home).svg);
        clean(homeMarkup(home, { snow: true, gardenInFront: true }).svg);
      }
    }
  });

  it("every designed part draws, grown or not", () => {
    for (const [part, values] of Object.entries(CUSTOM_PARTS)) {
      for (const v of values) {
        const home: HomeChoice = { ...DEFAULT_HOME, kind: "custom", custom: { ...DEFAULT_HOME.custom, [part]: v } };
        clean(homeSceneSVG(home));
        clean(homeSceneSVG(all(home)));
      }
    }
  });

  it("growing changes the home, and windows are reported so they glow at night", () => {
    const small = homeMarkup(DEFAULT_HOME).svg;
    expect(homeMarkup(all(DEFAULT_HOME)).svg).not.toBe(small);
    const lights: [number, number][] = [];
    homeMarkup(all(DEFAULT_HOME), { light: (x, y) => lights.push([x, y]) });
    expect(lights.length).toBeGreaterThan(4);
  });

  it("a home gets room for one more addition at each save point, up to four", () => {
    let home = DEFAULT_HOME;
    expect(toggleAddition(home, "porch")).toBe(home);
    home = growRoom(home);
    home = toggleAddition(home, "porch");
    expect(home.grown).toEqual(["porch"]);
    // Full: another addition waits for the next save point.
    expect(toggleAddition(home, "garden").grown).toEqual(["porch"]);
    for (let i = 0; i < 6; i++) home = growRoom(home);
    expect(home.slots).toBe(4);
    home = toggleAddition(toggleAddition(home, "garden"), "up");
    expect(remainingAdditions(home)).toEqual(["side"]);
    expect(toggleAddition(home, "porch").grown).not.toContain("porch");
  });

  it("a saved home is checked: unknown parts, colors and extra additions are dropped", () => {
    const home = normalizeHome({ kind: "custom", style: "castle", slots: 1, grown: ["porch", "garden", "moat"], custom: { roof: "steep", wall: "#000000", door: "hatch" } });
    expect(home.kind).toBe("custom");
    expect(home.style).toBe(DEFAULT_HOME.style);
    expect(home.grown).toEqual(["porch"]);
    expect(home.custom.roof).toBe("steep");
    expect(home.custom.wall).toBe(DEFAULT_HOME.custom.wall);
    expect(home.custom.door).toBe(DEFAULT_HOME.custom.door);
  });
});

describe("saving your look", () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  };

  it("round-trips, and nothing saved means the player hasn't chosen yet", () => {
    const store = memory();
    expect(readLooks(store)).toBeNull();
    const looks = { character: { ...DEFAULT_CHARACTER, animal: "fox" as const }, home: growRoom(DEFAULT_HOME) };
    expect(writeLooks(looks, store)).toBe(true);
    expect(readLooks(store)).toEqual(looks);
  });

  it("a broken save is ignored", () => {
    const store = memory();
    store.setItem("lantern-night:looks", "{not json");
    expect(readLooks(store)).toBeNull();
  });
});
