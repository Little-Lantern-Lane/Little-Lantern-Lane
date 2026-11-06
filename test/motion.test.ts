import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVELY_SECONDS, motionPose, settledMotion } from "../src/world3d/motion";

describe("how long a body keeps moving", () => {
  it("lets a smile bounce at first, then settles, so nobody bounces for ever", () => {
    expect(settledMotion("bounce", 0.5)).toBe("bounce");
    expect(settledMotion("bounce", LIVELY_SECONDS + 1)).toBe("breathe");
    expect(motionPose(settledMotion("bounce", 60), 60.4).dy).toBe(0);
  });

  it("settles every big movement, but leaves quiet feelings alone", () => {
    for (const m of ["hop", "laugh", "stomp"] as const) expect(settledMotion(m, 10)).toBe("breathe");
    for (const m of ["sway", "sink", "shiver", "droop"] as const) expect(settledMotion(m, 10)).toBe(m);
  });
});

describe("the dented lantern", () => {
  it("pushes a real dent into the front of the red lantern and nowhere else", async () => {
    const THREE = await import("three");
    const { dented } = await import("../src/world3d/kit");
    const round = new THREE.SphereGeometry(0.3, 22, 16);
    const a = round.attributes.position;
    const b = dented(round).attributes.position;
    let deepest = 0;
    let moved = 0;
    for (let i = 0; i < a.count; i++) {
      const before = Math.hypot(a.getX(i), a.getY(i), a.getZ(i));
      const after = Math.hypot(b.getX(i), b.getY(i), b.getZ(i));
      deepest = Math.max(deepest, before - after);
      if (before - after > 0.001) moved++;
    }
    expect(deepest).toBeGreaterThan(0.1);
    expect(moved / a.count).toBeLessThan(0.3);
  });

  it("says one dented lantern everywhere", () => {
    const story = readFileSync("story/festival.ink", "utf8");
    expect(story).not.toMatch(/two dented|Two are dented|dents and all|dented ones/i);
  });
});
