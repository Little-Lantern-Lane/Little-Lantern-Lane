import { describe, expect, it } from "vitest";
import { clearSave, readSave, writeSave } from "../src/save";
import { initialState } from "../src/logic/state";

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const sample = { chapter: 2 as const, variant: "main" as const, story: "{\"ink\":1}", game: initialState() };

describe("save points", () => {
  it("round-trips a save", () => {
    const store = memoryStore();
    expect(writeSave(sample, store)).toBe(true);
    const save = readSave(store)!;
    expect(save).toMatchObject({ chapter: 2, variant: "main", story: "{\"ink\":1}", version: 1 });
    expect(save.game.world.level).toBe(1);
    expect(Number.isNaN(new Date(save.savedAt).getTime())).toBe(false);
  });

  it("start over deletes the save", () => {
    const store = memoryStore();
    writeSave(sample, store);
    clearSave(store);
    expect(readSave(store)).toBeNull();
  });

  it("ignores saves from another version or that are corrupted", () => {
    const store = memoryStore();
    store.setItem("lantern-night:save", JSON.stringify({ ...sample, version: 99 }));
    expect(readSave(store)).toBeNull();
    store.setItem("lantern-night:save", "{not json");
    expect(readSave(store)).toBeNull();
  });

  it("reports when the browser won't save, without crashing", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(writeSave(sample, broken)).toBe(false);
    expect(readSave(broken)).toBeNull();
    expect(() => clearSave(broken)).not.toThrow();
    expect(writeSave(sample, null)).toBe(false);
  });

  it("keeps no playtest notes or free text", () => {
    const store = memoryStore();
    writeSave(sample, store);
    expect(Object.keys(JSON.parse(store.data.get("lantern-night:save")!)).sort()).toEqual(["chapter", "game", "savedAt", "story", "variant", "version"]);
  });
});
