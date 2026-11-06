import { describe, expect, it } from "vitest";
import { atSavePoint, finishLevel, hasFinished, LEVEL_ORDER, nextLevel, normalizeProgress, progressFromSave } from "../src/logic/progress";
import { readProgress, writeProgress, writeSave } from "../src/save";
import { LANTERN_ROW, NEXT_GIVER } from "../src/game/layout";
import { initialState } from "../src/logic/state";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe("what you've finished", () => {
  it("goes through the story in order, with the far bank after the storm", () => {
    let p = { finished: [] as number[] };
    const seen: (number | null)[] = [];
    for (let i = 0; i < 7; i++) {
      seen.push(nextLevel(p));
      p = finishLevel(p, nextLevel(p)!);
    }
    expect(seen).toEqual([1, 2, 3, 7, 4, 5, 6]);
    expect(nextLevel(p)).toBeNull();
  });

  it("every part has a lantern on the map and someone to start it", () => {
    for (const l of LEVEL_ORDER) {
      expect(LANTERN_ROW.some((r) => r.level === l && !r.variant)).toBe(true);
      expect(NEXT_GIVER[l]).toBeDefined();
    }
  });

  it("finishing the next part moves your story along", () => {
    const r = atSavePoint({ finished: [1] }, 2, 3);
    expect(r).toEqual({ progress: { finished: [1, 2] }, firstTime: true, onPath: true });
  });

  it("playing a part again leaves your place in the story alone", () => {
    const p = { finished: [1, 2, 3] };
    const r = atSavePoint(p, 1, 2);
    expect(r).toEqual({ progress: p, firstTime: false, onPath: false });
    expect(nextLevel(r.progress)).toBe(7);
  });

  it("jumping ahead counts the part as finished but doesn't skip what's before it", () => {
    const r = atSavePoint({ finished: [1] }, 5, 6);
    expect(r.onPath).toBe(false);
    expect(hasFinished(r.progress, 5)).toBe(true);
    expect(nextLevel(r.progress)).toBe(2);
  });

  it("catching up to a part you jumped to doesn't play it twice", () => {
    const r = atSavePoint({ finished: [1, 2, 3, 7, 5] }, 4, 5);
    expect(r.onPath).toBe(false);
    expect(nextLevel(r.progress)).toBe(6);
  });

  it("an older save counts everything before it as finished", () => {
    expect(progressFromSave(4).finished).toEqual([1, 2, 3, 7]);
    expect(progressFromSave(undefined).finished).toEqual([]);
  });

  it("is kept, and a damaged record is cleaned up", () => {
    const store = memory();
    writeProgress({ finished: [1, 2] }, store);
    expect(readProgress(store)).toEqual({ finished: [1, 2] });
    expect(normalizeProgress({ finished: [1, 1, 99, "x"] })).toEqual({ finished: [1] });
    expect(normalizeProgress(null)).toEqual({ finished: [] });
  });

  it("works out where you are from an older save when nothing else is kept", () => {
    const store = memory();
    writeSave({ chapter: 7, variant: "main", story: "{}", game: initialState() }, store);
    expect(readProgress(store)).toEqual({ finished: [1, 2, 3] });
  });
});
