import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { catchUp, createSound, NATURE_FADE_MS, nextBirdGap, nextBubbleGap, nextGullGap, nextInsectGap, nextWaveGap, WAVES_FADE_MS, wavesCutoff, type Mood, type Sfx } from "../src/audio/sound";

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
      s.setWaves(0.5);
      s.setWaves(0);
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

describe("playback that holds up under load", () => {
  it("asks for the larger output buffer", () => {
    stubStorage();
    let options: AudioContextOptions | undefined;
    vi.stubGlobal("AudioContext", class {
      constructor(o?: AudioContextOptions) {
        options = o;
        throw new Error("no audio in tests");
      }
    });
    createSound().unlock();
    expect(options?.latencyHint).toBe("playback");
  });

  it("never schedules a note in the past", () => {
    expect(catchUp(9.9, 10)).toBeGreaterThan(10);
    expect(catchUp(2, 10)).toBeGreaterThan(10);
  });

  it("leaves a note that's on time alone", () => {
    expect(catchUp(10.5, 10)).toBe(10.5);
    expect(catchUp(10, 10)).toBe(10);
  });
});

/** Just enough of an AudioContext to count what the waves start and stop. */
function fakeAudio() {
  const live = { sources: 0, started: 0, stopped: 0, gains: [] as number[] };
  const param = () => ({
    value: 1,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {},
    setTargetAtTime(v: number) { live.gains.push(v); },
  });
  const node = () => ({
    connect(n: unknown) { return n; },
    disconnect() {},
    gain: param(), frequency: param(), Q: param(), pan: param(), playbackRate: param(),
    threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), detune: param(),
    type: "", buffer: null, loop: false, onended: null,
    start() { live.started++; },
    stop() { live.stopped++; },
  });
  class FakeContext {
    currentTime = 0;
    sampleRate = 100;
    state = "running";
    destination = node();
    createGain = node;
    createBiquadFilter = node;
    createDynamicsCompressor = node;
    createConvolver = node;
    createOscillator = node;
    createStereoPanner = node;
    createBufferSource() { live.sources++; return node(); }
    createBuffer(_c: number, length: number) { return { duration: 2, getChannelData: () => new Float32Array(length) }; }
    resume() { return Promise.resolve(); }
  }
  vi.stubGlobal("AudioContext", FakeContext);
  return live;
}

describe("the sound of the waves", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("makes no sound nodes at all away from the sea", () => {
    stubStorage();
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    const before = live.sources;
    s.setWaves(0);
    vi.advanceTimersByTime(30000);
    expect(live.sources).toBe(before);
  });

  it("starts at the shore, and only once however often it's told", () => {
    stubStorage();
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    const before = live.started;
    s.setWaves(0.8);
    const once = live.started;
    expect(once).toBeGreaterThan(before);
    s.setWaves(0.8);
    expect(live.started).toBe(once);
  });

  it("waits for the first click if you're already on the sand", () => {
    stubStorage();
    const live = fakeAudio();
    const s = createSound();
    s.setWaves(0.8);
    expect(live.started).toBe(0);
    s.unlock();
    expect(live.started).toBeGreaterThan(0);
  });

  it("gets quieter as you walk away from the water", () => {
    stubStorage();
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    s.setWaves(1);
    const near = live.gains.at(-2)!;
    s.setWaves(0.4);
    expect(live.gains.at(-2)!).toBeLessThan(near);
  });

  it("stops everything once you've left, so a busy place isn't paying for the sea", () => {
    stubStorage();
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    s.setWaves(0.8);
    const stoppedBefore = live.stopped;
    s.setWaves(0);
    expect(live.stopped).toBe(stoppedBefore);
    vi.advanceTimersByTime(WAVES_FADE_MS + 500);
    expect(live.stopped).toBeGreaterThan(stoppedBefore);
  });

  it("carries on if you come back before it has faded", () => {
    stubStorage();
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    s.setWaves(0.8);
    const stoppedBefore = live.stopped;
    s.setWaves(0);
    vi.advanceTimersByTime(WAVES_FADE_MS / 2);
    s.setWaves(0.8);
    vi.advanceTimersByTime(WAVES_FADE_MS * 2);
    expect(live.stopped).toBe(stoppedBefore);
  });
});

describe("the gulls, birds and brook", () => {
  beforeEach(() => {
    stubStorage();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());
  const quiet = { gulls: 0, birds: 0, insects: 0, brook: 0, fountain: 0 };

  it("makes no sound at all until something can be heard", () => {
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    const started = live.started;
    s.setNature(quiet);
    vi.advanceTimersByTime(2000);
    expect(live.started).toBe(started);
  });

  it("the brook starts where you can hear it, and nothing is left running once you leave", () => {
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    const looping = live.sources;
    s.setNature({ ...quiet, brook: 0.8 });
    expect(live.sources).toBe(looping + 2);
    const stopped = live.stopped;
    s.setNature(quiet);
    vi.advanceTimersByTime(NATURE_FADE_MS + 500);
    expect(live.stopped).toBe(stopped + 2);
  });

  it("the fountain starts near it, with one running sound, and stops once you leave", () => {
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    const looping = live.sources;
    s.setNature({ ...quiet, fountain: 0.8 });
    expect(live.sources).toBe(looping + 1);
    const stopped = live.stopped;
    s.setNature(quiet);
    vi.advanceTimersByTime(NATURE_FADE_MS + 500);
    expect(live.stopped).toBe(stopped + 1);
  });

  it("walking back before it fades keeps the same brook going", () => {
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    s.setNature({ ...quiet, brook: 0.8 });
    const sources = live.sources;
    s.setNature(quiet);
    vi.advanceTimersByTime(NATURE_FADE_MS / 2);
    s.setNature({ ...quiet, brook: 0.8 });
    vi.advanceTimersByTime(NATURE_FADE_MS * 2);
    expect(live.sources).toBe(sources);
  });

  it("gulls, birds and insects call without any running sound behind them", () => {
    const live = fakeAudio();
    const s = createSound();
    s.unlock();
    const sources = live.sources;
    s.setNature({ ...quiet, gulls: 1, birds: 1, insects: 1 });
    vi.advanceTimersByTime(200);
    expect(live.sources).toBe(sources);
    expect(live.started).toBeGreaterThan(0);
  });

  it("spaces calls out, and thins the bubbles the further off you are", () => {
    for (let i = 0; i < 200; i++) {
      expect(nextGullGap()).toBeGreaterThanOrEqual(5);
      expect(nextBirdGap()).toBeGreaterThanOrEqual(2.5);
      expect(nextInsectGap()).toBeGreaterThanOrEqual(3);
      expect(nextBubbleGap(0.01)).toBeLessThanOrEqual(2);
      expect(nextBubbleGap(1)).toBeLessThanOrEqual(0.4);
    }
  });
});

describe("how the waves sound from where you stand", () => {
  it("leaves a natural gap between one wave and the next", () => {
    for (let i = 0; i < 200; i++) {
      const gap = nextWaveGap();
      expect(gap).toBeGreaterThanOrEqual(6);
      expect(gap).toBeLessThanOrEqual(12);
    }
  });

  it("dulls with distance: quieter is also further off", () => {
    expect(wavesCutoff(1)).toBeGreaterThan(wavesCutoff(0.55));
    expect(wavesCutoff(0.55)).toBeGreaterThan(wavesCutoff(0.3));
  });
});
