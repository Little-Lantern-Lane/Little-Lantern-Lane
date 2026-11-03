import { describe, expect, it } from "vitest";
import { CHARACTER_IDS, EXPRESSIONS, parseSpoken, toExpression } from "../src/logic/cast";
import { applyWorldEvent, initialWorld } from "../src/logic/world";
import { characterMarkup, FEELINGS, portraitSVG } from "../src/ui/plush";

describe("plush characters", () => {
  it("draws every villager in every feeling and frame, with no broken numbers", () => {
    for (const id of CHARACTER_IDS) {
      for (const e of EXPRESSIONS) {
        for (const frame of ["closed", "open", "blink"] as const) {
          const svg = characterMarkup(id, e, { frame });
          expect(svg).not.toMatch(/NaN|undefined/);
          expect(svg.length).toBeGreaterThan(500);
        }
      }
      expect(characterMarkup(id, "neutral", { pointing: true })).not.toMatch(/NaN|undefined/);
    }
  });

  it("each feeling changes the face, and talking opens the mouth", () => {
    for (const e of EXPRESSIONS.filter((x) => x !== "neutral")) {
      expect(characterMarkup("mara", e)).not.toBe(characterMarkup("mara", "neutral"));
    }
    expect(characterMarkup("tobin", "neutral", { frame: "open" })).not.toBe(characterMarkup("tobin", "neutral"));
    expect(characterMarkup("tobin", "neutral", { frame: "blink" })).not.toBe(characterMarkup("tobin", "neutral"));
  });

  it("villagers have their own faces", () => {
    const faces = CHARACTER_IDS.map((id) => characterMarkup(id, "neutral"));
    expect(new Set(faces).size).toBe(CHARACTER_IDS.length);
  });

  it("every feeling has a movement, and portraits carry all three talking frames", () => {
    for (const e of EXPRESSIONS) expect(FEELINGS[e].motion).toBeTruthy();
    const p = portraitSVG("nell", "sad");
    for (const fr of ["fr-closed", "fr-open", "fr-blink", "m-sink"]) expect(p).toContain(fr);
  });
});

describe("expression names", () => {
  it("the story's older names still work", () => {
    expect(toExpression("smile")).toBe("happy");
    expect(toExpression("laugh")).toBe("laughing");
    expect(parseSpoken("mara/smile: Hi.")?.expression).toBe("happy");
    expect(applyWorldEvent(initialWorld(), { name: "face", arg: "you:smile" }).faces.you).toBe("happy");
  });

  it("new feelings parse", () => {
    expect(parseSpoken("tobin/embarrassed: Ha.")?.expression).toBe("embarrassed");
    expect(toExpression("furious")).toBeNull();
  });
});
