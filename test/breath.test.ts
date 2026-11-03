import { describe, expect, it } from "vitest";
import { fullness, initialBreath, IN_MIN, OUT_MIN, press, release, tick, type BreathState } from "../src/logic/breath";

/** Breathe in for `inS` seconds and out for `outS`, ticking along the way. */
function breathe(s: BreathState, t: number, inS: number, outS: number): { s: BreathState; t: number; counted: number } {
  let counted = 0;
  s = press(s, t);
  t += inS;
  s = release(s, t);
  for (let i = 1; i <= Math.ceil(outS * 10); i++) {
    const r = tick(s, t + Math.min(outS, i / 10));
    s = r.state;
    if (r.counted) counted++;
  }
  return { s, t: t + outS, counted };
}

describe("paced breathing", () => {
  it("counts a slow breath as soon as the out-breath is long enough, without pressing again", () => {
    const { s, counted } = breathe(initialBreath(0), 0, IN_MIN + 0.5, OUT_MIN + 0.2);
    expect(counted).toBe(1);
    expect(s.breaths).toBe(1);
    expect(s.phase).toBe("out");
  });

  it("counts each breath once, however long the out-breath goes on", () => {
    const { s, counted } = breathe(initialBreath(0), 0, IN_MIN, OUT_MIN * 3);
    expect(counted).toBe(1);
    expect(s.breaths).toBe(1);
  });

  it("doesn't count a short breath in, and says why", () => {
    const { s, counted } = breathe(initialBreath(0), 0, 1, OUT_MIN + 1);
    expect(counted).toBe(0);
    expect(s.note).toBe("in_short");
  });

  it("doesn't count a breath out cut short, and says why on the next press", () => {
    let { s, t } = breathe(initialBreath(0), 0, IN_MIN + 1, 2);
    expect(s.breaths).toBe(0);
    s = press(s, t);
    expect(s.note).toBe("out_short");
    ({ s, t } = breathe(s, t, 0, 0));
    expect(t).toBeGreaterThan(0);
  });

  it("several slow breaths in a row all count", () => {
    let s = initialBreath(0);
    let t = 0;
    let total = 0;
    for (let i = 0; i < 4; i++) {
      const r = breathe(s, t, IN_MIN + 0.3, OUT_MIN + 0.3);
      s = r.s;
      t = r.t;
      total += r.counted;
    }
    expect(total).toBe(4);
    expect(s.breaths).toBe(4);
  });

  it("holding the key longer than needed is fine (key repeat doesn't restart the breath)", () => {
    let s = press(initialBreath(0), 0);
    s = press(s, 1);
    s = press(s, 2);
    s = release(s, 4);
    expect(s.inLength).toBe(4);
  });

  it("the circle fills while breathing in and empties over the out-breath, by time not frames", () => {
    let s = press(initialBreath(0), 0);
    expect(fullness(s, IN_MIN / 2)).toBeCloseTo(0.5);
    s = release(s, IN_MIN);
    expect(fullness(s, IN_MIN)).toBeCloseTo(1);
    expect(fullness(s, IN_MIN + OUT_MIN / 2)).toBeCloseTo(0.5);
    expect(fullness(s, IN_MIN + OUT_MIN)).toBeCloseTo(0);
  });
});
