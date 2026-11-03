import { afterEach, describe, expect, it, vi } from "vitest";
import { createSound, type Mood, type Sfx } from "../src/audio/sound";

const MOODS: Mood[] = ["day", "night", "shame", "hollow", "festival", "silent"];
const SFX: Sfx[] = [
  "step", "pickup", "blip", "fact", "trip", "shell", "light",
  "hang", "heartbeat", "ui", "mend", "door", "ending",
];

/** A tiny in-memory localStorage so persistence can be checked in Node. */
function stubStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe("sound without AudioContext", () => {
  it("creates a no-op sound with default settings", () => {
    stubStorage();
    const s = createSound();
    expect(s.volume).toBe(0.6);
    expect(s.muted).toBe(false);
  });

  it("clamps volume to 0..1", () => {
    stubStorage();
    const s = createSound();
    s.setVolume(2);
    expect(s.volume).toBe(1);
    s.setVolume(-1);
    expect(s.volume).toBe(0);
    s.setVolume(0.3);
    expect(s.volume).toBe(0.3);
    s.volume = 5;
    expect(s.volume).toBe(1);
    s.setVolume(Number.NaN);
    expect(s.volume).toBe(0);
  });

  it("toggleMute flips muted", () => {
    stubStorage();
    const s = createSound();
    s.toggleMute();
    expect(s.muted).toBe(true);
    s.toggleMute();
    expect(s.muted).toBe(false);
  });

  it("setMood, play and unlock do not throw", () => {
    stubStorage();
    const s = createSound();
    expect(() => {
      s.unlock();
      s.unlock();
      for (const m of MOODS) s.setMood(m);
      for (const x of SFX) s.play(x, { pitch: 1.3, volume: 0.5 });
      s.play("blip");
    }).not.toThrow();
  });

  it("persists volume and muted across instances", () => {
    stubStorage();
    const a = createSound();
    a.setVolume(0.25);
    a.toggleMute();
    const b = createSound();
    expect(b.volume).toBe(0.25);
    expect(b.muted).toBe(true);
  });

  it("survives a localStorage that throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    });
    const s = createSound();
    expect(s.volume).toBe(0.6);
    expect(() => s.setVolume(0.4)).not.toThrow();
    expect(s.volume).toBe(0.4);
  });
});
