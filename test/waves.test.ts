import { describe, expect, it } from "vitest";
import { BEACH, wavesAt } from "../src/game/layout";

const SHED_INSIDE = 13300;
const QUAY = 11700;

describe("where you can hear the sea", () => {
  it("is silent everywhere away from the coast", () => {
    for (const x of [500, 2500, 5000, 7000, 8500, 9500, 15000, 21000, 29000, 30000]) expect(wavesAt(x, 0)).toBe(0);
  });

  it("is loudest at the water's edge on the beach, and softer up by the dunes", () => {
    expect(wavesAt(26000, BEACH.water)).toBe(1);
    expect(wavesAt(26000, BEACH.back)).toBeGreaterThan(0);
    expect(wavesAt(26000, BEACH.back)).toBeLessThan(wavesAt(26000, 0));
    expect(wavesAt(26000, 0)).toBeLessThan(wavesAt(26000, BEACH.water));
  });

  it("stays in range past the ends of the sand", () => {
    expect(wavesAt(26000, BEACH.water - 5)).toBe(1);
    expect(wavesAt(26000, BEACH.back + 30)).toBe(wavesAt(26000, BEACH.back));
  });

  it("is steady along the harbour and muffled inside the shed", () => {
    expect(wavesAt(QUAY, 0)).toBeGreaterThan(0);
    expect(wavesAt(SHED_INSIDE, 0)).toBeGreaterThan(0);
    expect(wavesAt(SHED_INSIDE, 0)).toBeLessThan(wavesAt(QUAY, 0));
  });

  it("gets louder as the tide comes into the shed, wherever you stand", () => {
    expect(wavesAt(SHED_INSIDE, 0, 0.5)).toBeGreaterThan(wavesAt(SHED_INSIDE, 0));
    expect(wavesAt(SHED_INSIDE, 0, 1)).toBe(1);
    expect(wavesAt(QUAY, 0, 1)).toBe(1);
  });

  it("the tide doesn't reach anywhere else", () => {
    expect(wavesAt(2500, 0, 1)).toBe(0);
  });
});
