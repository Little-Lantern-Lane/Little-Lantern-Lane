// Procedural audio for Little Lantern Lane. Every sound is synthesized with the Web
// Audio API: oscillators, a shared noise buffer, filters, envelopes and a
// generated-impulse reverb. No samples, no assets.
// Music is generative: each mood is a small "composer" that decides what to
// play one step at a time, scheduled ahead on AudioContext time so it never
// drifts. Effects are one-shots that disconnect themselves when done.

export type Mood = "day" | "night" | "shame" | "hollow" | "festival" | "silent";
export type Sfx =
  | "step" | "pickup" | "blip" | "fact" | "trip" | "shell" | "light"
  | "hang" | "heartbeat" | "ui" | "mend" | "door" | "ending";
export interface Nature {
  gulls: number;
  birds: number;
  insects: number;
  brook: number;
  fountain: number;
}
export interface Sound {
  /** Call from the first user gesture; creates/resumes the AudioContext. Safe to call repeatedly. */
  unlock(): void;
  /** Crossfade (about 2 s) to the generative music for this mood. */
  setMood(mood: Mood): void;
  /** How much of the sea to hear, 0..1, on top of whatever music is playing. 0 stops it altogether. */
  setWaves(level: number): void;
  /** How much of the gulls, birds, insects, river and fountain to hear, each 0..1, on top of the music. All 0 stops them. */
  setNature(levels: Nature): void;
  /** One-shot effect. pitch is a multiplier (1 = default); used e.g. for per-character dialogue blips. */
  play(sfx: Sfx, opts?: { pitch?: number; volume?: number }): void;
  /** 0..1 master volume. */
  volume: number;
  setVolume(v: number): void;
  muted: boolean;
  toggleMute(): void;
}

// ---------------------------------------------------------------------------
// Settings: volume and mute, persisted. Shared by the real and no-op versions.

const STORAGE_KEY = "lantern-night:audio";
const DEFAULT_VOLUME = 0.6;
const MUSIC_LEVEL = 0.35;
const SFX_LEVEL = 0.8;
const CROSSFADE = 2;

interface Settings {
  volume: number;
  muted: boolean;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

function loadSettings(): Settings {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Settings>;
      return {
        volume: typeof s.volume === "number" ? clamp01(s.volume) : DEFAULT_VOLUME,
        muted: s.muted === true,
      };
    }
  } catch {
    // Storage blocked or corrupt: fall back to defaults.
  }
  return { volume: DEFAULT_VOLUME, muted: false };
}

function saveSettings(s: Settings): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Private mode or quota: settings just won't persist.
  }
}

// ---------------------------------------------------------------------------
// Engine: the context and the fixed bus graph.
//   music bus (0.35) ┐
//   sfx bus   (0.8)  ├─> master (volume) -> compressor -> speakers
//   reverb (wet)     ┘

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  /** Input to the shared reverb; connect a send gain here. */
  reverb: AudioNode;
  noise: AudioBuffer;
}

type AudioCtor = new (options?: AudioContextOptions) => AudioContext;

function findAudioContext(): AudioCtor | undefined {
  const g = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return g.AudioContext ?? g.webkitAudioContext;
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** A soft, dark room: decaying stereo noise, low-passed by averaging. */
function makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const decay = Math.pow(1 - i / len, 3);
      prev = prev * 0.6 + (Math.random() * 2 - 1) * 0.4;
      d[i] = prev * decay;
    }
  }
  return buf;
}

function buildEngine(Ctor: AudioCtor, settings: Settings): Engine {
  // A bigger output buffer: nothing here needs split-second timing, and the default small one
  // crackles when a busy scene (the woods) starves the audio thread.
  const ctx = new Ctor({ latencyHint: "playback" });
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 8;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.25;
  limiter.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.value = settings.muted ? 0 : settings.volume;
  master.connect(limiter);

  const music = ctx.createGain();
  music.gain.value = MUSIC_LEVEL;
  music.connect(master);

  const sfx = ctx.createGain();
  sfx.gain.value = SFX_LEVEL;
  sfx.connect(master);

  const conv = ctx.createConvolver();
  conv.buffer = makeImpulse(ctx, 2.8);
  // Tame the reverb's top end so it stays warm.
  const wetTone = ctx.createBiquadFilter();
  wetTone.type = "lowpass";
  wetTone.frequency.value = 3500;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  conv.connect(wetTone).connect(wet).connect(master);

  return { ctx, master, music, sfx, reverb: conv, noise: makeNoise(ctx) };
}

// ---------------------------------------------------------------------------
// Primitives. Each builds a tiny chain, schedules it, and disconnects itself
// when its source ends so nothing leaks.

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** Attack to peak, hold, then exponential decay. Returns the end time. */
function envelope(p: AudioParam, t: number, attack: number, hold: number, decay: number, peak: number): number {
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + attack);
  p.setValueAtTime(peak, t + attack + hold);
  p.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
  return t + attack + hold + decay;
}

interface ToneOpts {
  freq: number;
  t: number;
  peak: number;
  decay: number;
  attack?: number;
  hold?: number;
  type?: OscillatorType;
  /** Glide to this frequency over `glide` seconds. */
  to?: number;
  glide?: number;
  detune?: number;
  lowpass?: number;
}

function tone(e: Engine, dest: AudioNode, o: ToneOpts): void {
  const { ctx } = e;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, o.t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, o.t + (o.glide ?? o.decay));
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  const end = envelope(g.gain, o.t, o.attack ?? 0.005, o.hold ?? 0, o.decay, o.peak);
  const nodes: AudioNode[] = [osc, g];
  if (o.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.lowpass;
    f.Q.value = 0.5;
    osc.connect(f).connect(g);
    nodes.push(f);
  } else {
    osc.connect(g);
  }
  g.connect(dest);
  osc.onended = () => nodes.forEach((n) => n.disconnect());
  osc.start(o.t);
  osc.stop(end + 0.05);
}

interface NoiseOpts {
  t: number;
  peak: number;
  decay: number;
  attack?: number;
  hold?: number;
  filter: BiquadFilterType;
  freq: number;
  /** Sweep the filter to this frequency over the whole envelope. */
  to?: number;
  q?: number;
}

function noise(e: Engine, dest: AudioNode, o: NoiseOpts): void {
  const { ctx } = e;
  const src = ctx.createBufferSource();
  src.buffer = e.noise;
  src.loop = true; // a long wash can outlast the shared buffer
  const f = ctx.createBiquadFilter();
  f.type = o.filter;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.freq, o.t);
  const g = ctx.createGain();
  const end = envelope(g.gain, o.t, o.attack ?? 0.003, o.hold ?? 0, o.decay, o.peak);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, end);
  src.connect(f).connect(g).connect(dest);
  src.onended = () => [src, f, g].forEach((n) => n.disconnect());
  const len = end - o.t + 0.05;
  src.start(o.t, rand(0, Math.max(0, e.noise.duration - len)), len);
}

// ---------------------------------------------------------------------------
// Instruments shared by music and effects.

/** Soft plucked string: triangle body plus a quiet octave sparkle. */
function pluck(e: Engine, dest: AudioNode, t: number, freq: number, vel: number, bright = 2400, decay = 1.2): void {
  tone(e, dest, { type: "triangle", freq, t, peak: 0.22 * vel, decay, lowpass: bright });
  tone(e, dest, { freq: freq * 2, t, peak: 0.05 * vel, decay: decay * 0.4 });
}

/** Bell-ish chime: sine with an inharmonic partial. */
function chime(e: Engine, dest: AudioNode, t: number, freq: number, vel: number, decay = 2.5): void {
  tone(e, dest, { freq, t, peak: 0.12 * vel, decay });
  tone(e, dest, { freq: freq * 2.76, t, peak: 0.03 * vel, decay: decay * 0.35 });
}

/** Warm pad chord: detuned saws, slow attack, low-passed. */
function pad(e: Engine, dest: AudioNode, t: number, notes: number[], len: number, vel: number, cutoff = 900): void {
  for (const n of notes) {
    for (const det of [-6, 6]) {
      tone(e, dest, {
        type: "sawtooth", freq: mtof(n), t, detune: det, peak: 0.025 * vel,
        attack: len * 0.35, hold: len * 0.3, decay: len * 0.6, lowpass: cutoff,
      });
    }
  }
}

function bass(e: Engine, dest: AudioNode, t: number, note: number, len: number, vel: number): void {
  tone(e, dest, { freq: mtof(note), t, peak: 0.2 * vel, attack: 0.03, hold: len * 0.3, decay: len * 0.7 });
  tone(e, dest, { type: "triangle", freq: mtof(note), t, peak: 0.05 * vel, attack: 0.03, decay: len * 0.5, lowpass: 400 });
}

function waterDrip(e: Engine, dest: AudioNode, t: number, vel: number): void {
  const f = rand(1100, 1600);
  tone(e, dest, { freq: f, to: f * 2.2, glide: 0.04, t, peak: 0.09 * vel, decay: 0.12 });
}

// ---------------------------------------------------------------------------
// Composers. A composer is called once per step and schedules whatever that
// step should contain. State lives in the closure, so each mood can remember
// its phrases and chord path.

interface Composer {
  stepDur: number;
  /** Mood level on the music bus. */
  level: number;
  /** Amount sent to the reverb. */
  wet: number;
  step(e: Engine, out: AudioNode, n: number, t: number): void;
}

// D major pentatonic, D E F# A B, across a few octaves.
const PENTA = new Set([2, 4, 6, 9, 11]);
const SCALE: number[] = [];
for (let m = 38; m <= 98; m++) if (PENTA.has(m % 12)) SCALE.push(m);

const inRange = (lo: number, hi: number) => SCALE.filter((m) => m >= lo && m <= hi);

interface Chord { pad: number[]; root: number }
const CHORDS: Record<string, Chord> = {
  D: { pad: [50, 54, 57], root: 38 },
  G: { pad: [50, 55, 59], root: 43 },
  Bm: { pad: [50, 54, 59], root: 35 },
  A: { pad: [49, 52, 57], root: 45 },
  Em: { pad: [52, 55, 59], root: 40 },
};
const DAY_PATHS = [
  ["D", "G", "Bm", "A"],
  ["D", "Bm", "G", "A"],
  ["G", "D", "Em", "A"],
  ["D", "G", "D", "A"],
];

/** A melody that wanders the scale, but often repeats its last phrase with a
 *  small change so it feels composed rather than random. */
function phraseMaker(lo: number, hi: number, density: [number, number]) {
  const notes = inRange(lo, hi);
  let idx = Math.floor(notes.length / 2);
  let last: (number | null)[] = [];

  const fresh = (len: number) => {
    const out: (number | null)[] = [];
    for (let i = 0; i < len; i++) {
      const p = i % 2 === 0 ? density[0] : density[1];
      if (!chance(p)) { out.push(null); continue; }
      idx = Math.max(0, Math.min(notes.length - 1, idx + pick([-2, -1, -1, 1, 1, 2])));
      out.push(notes[idx]);
    }
    // Phrases settle on a held note near the end.
    out[len - 2] = notes[idx];
    out[len - 1] = null;
    return out;
  };

  return (len: number): (number | null)[] => {
    if (last.length === len && chance(0.45)) {
      const varied = [...last];
      const i = Math.floor(rand(0, len - 2));
      if (varied[i] !== null) varied[i] = pick(notes);
      last = varied;
    } else {
      last = fresh(len);
    }
    return last;
  };
}

/** Day, and festival (the same tune, fuller, brighter and a little faster). */
function composeDay(festival: boolean): Composer {
  const stepDur = festival ? 60 / 100 / 2 : 60 / 80 / 2; // eighth notes
  const bar = 8;
  const phrase = phraseMaker(62, 81, festival ? [0.8, 0.45] : [0.65, 0.25]);
  let path = DAY_PATHS[0];
  let melody: (number | null)[] = [];

  return {
    stepDur,
    level: festival ? 1 : 0.9,
    wet: festival ? 0.2 : 0.28,
    step(e, out, n, t) {
      const s = n % bar;
      const barN = Math.floor(n / bar);
      if (n % (bar * 4) === 0 && n > 0) path = pick(DAY_PATHS);
      if (n % (bar * 2) === 0) melody = phrase(bar * 2);
      const chord = CHORDS[path[barN % 4]];
      const barLen = stepDur * bar;

      if (s === 0) {
        pad(e, out, t, festival ? [...chord.pad, chord.pad[0] + 12] : chord.pad, barLen * 1.2, festival ? 1.1 : 0.9,
          festival ? 1500 : 900);
        bass(e, out, t, chord.root, barLen * 0.6, 0.9);
      }
      if (s === 4 && chance(festival ? 0.8 : 0.4)) bass(e, out, t, chord.root + 7, barLen * 0.4, 0.6);

      const note = melody[n % (bar * 2)];
      const swing = s % 2 === 1 ? stepDur * 0.08 : 0; // a little human lilt
      if (note !== null && note !== undefined) {
        pluck(e, out, t + swing, mtof(note), rand(0.75, 1), festival ? 3800 : 2200);
        // Festival: a second voice a scale step or two below, sometimes.
        if (festival && chance(0.35)) {
          const i = SCALE.indexOf(note);
          if (i > 2) pluck(e, out, t + swing, mtof(SCALE[i - 2]), 0.5, 3000);
        }
      }
      if (festival) percussion(e, out, s, t, stepDur);
    },
  };
}

/** Hand drum on a folk pattern, shaker on the offbeats. */
function percussion(e: Engine, out: AudioNode, s: number, t: number, stepDur: number): void {
  const low = [1, 0, 0, 1, 0, 0, 1, 0][s];
  const high = [0, 0, 1, 0, 1, 0, 0, 1][s];
  if (low) tone(e, out, { freq: 150, to: 75, glide: 0.12, t, peak: 0.35, decay: 0.25 });
  if (high && chance(0.85)) {
    tone(e, out, { freq: 330, to: 220, glide: 0.06, t, peak: 0.12, decay: 0.12 });
    noise(e, out, { t, peak: 0.04, decay: 0.05, filter: "bandpass", freq: 1800, q: 1.5 });
  }
  noise(e, out, { t: t + stepDur * 0.5, peak: rand(0.02, 0.045), attack: 0.01, decay: 0.06, filter: "highpass", freq: 6000 });
  if (chance(0.5)) noise(e, out, { t, peak: 0.02, attack: 0.01, decay: 0.05, filter: "highpass", freq: 7000 });
}

/** Night: slow, low and sparse, with star chimes up high. */
function composeNight(): Composer {
  const stepDur = 0.6;
  const bar = 8;
  const paths = [["D", "Bm", "G", "D"], ["D", "Em", "G", "A"], ["Bm", "G", "D", "A"]];
  let path = paths[0];
  const low = inRange(55, 74);
  const stars = inRange(86, 98);
  return {
    stepDur,
    level: 0.7,
    wet: 0.55,
    step(e, out, n, t) {
      const s = n % bar;
      if (n % (bar * 4) === 0 && n > 0) path = pick(paths);
      const chord = CHORDS[path[Math.floor(n / bar) % 4]];
      const barLen = stepDur * bar;
      if (s === 0) {
        pad(e, out, t, chord.pad.map((m) => m - 12), barLen * 1.3, 0.8, 600);
        bass(e, out, t, chord.root, barLen, 0.5);
      }
      if (chance(0.12)) pluck(e, out, t, mtof(pick(low)), 0.6, 1400, 2.6);
      if (chance(0.06)) chime(e, out, t + rand(0, stepDur), mtof(pick(stars)), 0.5, 3.5);
    },
  };
}

/** Shame: a low, muffled drone with slow detuned swells. Uneasy, never harsh,
 *  no melody to hold onto. */
function composeShame(): Composer {
  const stepDur = 1;
  const bar = 8;
  const colors = [[53], [46], [52, 55], [51]]; // F, Bb, Em-ish, Eb: shaded, not menacing
  return {
    stepDur,
    level: 0.8,
    wet: 0.35,
    step(e, out, n, t) {
      const s = n % bar;
      if (s === 0) {
        // Overlapping 12 s drones make an unbroken bed.
        for (const m of [38, 45]) {
          for (const det of [-9, 9]) {
            tone(e, out, { type: "sawtooth", freq: mtof(m), t, detune: det, peak: 0.05, attack: 4, hold: 4, decay: 4, lowpass: 260 });
          }
        }
      }
      if (s === 2 && Math.floor(n / bar) % 2 === 0) {
        for (const m of pick(colors)) {
          for (const det of [-16, 14]) {
            tone(e, out, { type: "triangle", freq: mtof(m), t, detune: det, peak: 0.05, attack: 4.5, hold: 1, decay: 4, lowpass: 480 });
          }
        }
      }
      if (s === 5 && chance(0.5)) {
        // A faint breath of air under everything.
        noise(e, out, { t, peak: 0.03, attack: 2.5, decay: 3, filter: "lowpass", freq: 250, q: 0.7 });
      }
    },
  };
}

/** Hollow: close and cozy inside the shell. Very quiet warmth, a drip now and then. */
function composeHollow(): Composer {
  const stepDur = 1;
  const bar = 8;
  return {
    stepDur,
    level: 0.55,
    wet: 0.3,
    step(e, out, n, t) {
      const s = n % bar;
      if (s === 0) {
        for (const m of [50, 57]) {
          tone(e, out, { type: "triangle", freq: mtof(m), t, peak: 0.05, attack: 3.5, hold: 3, decay: 4, lowpass: 380 });
        }
        tone(e, out, { freq: mtof(38), t, peak: 0.08, attack: 3, hold: 4, decay: 4 });
      }
      if (chance(0.14)) waterDrip(e, out, t + rand(0, stepDur), rand(0.5, 1));
    },
  };
}

function composerFor(mood: Exclude<Mood, "silent">): Composer {
  switch (mood) {
    case "day": return composeDay(false);
    case "festival": return composeDay(true);
    case "night": return composeNight();
    case "shame": return composeShame();
    case "hollow": return composeHollow();
  }
}

// ---------------------------------------------------------------------------
// Mood player: owns one composer's output gain and its place in time.

// Long enough to ride out a slow frame or a heavy scene change without the music running dry.
const LOOKAHEAD = 1.2;
const TICK_MS = 50;
const LONGEST_TAIL = 14; // seconds: long drones scheduled just before a fade

/** When the next step plays. A note scheduled in the past would start partway through its
 *  envelope, which is a click, so anything late moves just ahead of now. */
export function catchUp(next: number, now: number): number {
  return next < now ? now + 0.05 : next;
}

class MoodPlayer {
  private out: GainNode;
  private send: GainNode;
  private next: number;
  private n = 0;
  private stopped = false;

  constructor(private e: Engine, private c: Composer) {
    const { ctx } = e;
    this.out = ctx.createGain();
    this.send = ctx.createGain();
    this.send.gain.value = c.wet;
    this.out.connect(e.music);
    this.out.connect(this.send).connect(e.reverb);
    const now = ctx.currentTime;
    this.out.gain.setValueAtTime(0.0001, now);
    this.out.gain.linearRampToValueAtTime(c.level, now + CROSSFADE);
    this.next = now + 0.1;
  }

  /** Schedule every step that starts before the lookahead horizon. */
  tick(): void {
    if (this.stopped) return;
    const now = this.e.ctx.currentTime;
    this.next = catchUp(this.next, now);
    while (this.next < now + LOOKAHEAD) {
      this.c.step(this.e, this.out, this.n, this.next);
      this.next += this.c.stepDur;
      this.n++;
    }
  }

  fadeOut(): void {
    this.stopped = true;
    const now = this.e.ctx.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.0001, now + CROSSFADE);
    setTimeout(() => {
      this.out.disconnect();
      this.send.disconnect();
    }, (CROSSFADE + LONGEST_TAIL) * 1000);
  }
}

// ---------------------------------------------------------------------------
// The sea. Not a mood: it plays alongside the music, wherever the shore can be heard. A quiet hush
// runs all the time, and over it each wave swells, breaks to one side and drains away as foam. It
// runs only near the water, because the audio thread has little to spare in the busier places.

const WAVES_LEVEL = 1;
const WAVES_WET = 0.12;
/** How quickly the sea follows you, as a time constant in seconds. */
const WAVES_EASE = 0.7;
/** How long after you leave the shore the sea is shut down. */
export const WAVES_FADE_MS = 4000;

/** Seconds from one wave to the next. Each lasts about as long, so they run on into each other. */
export const nextWaveGap = () => rand(6.5, 11.5);

/** The top of what you can hear: distance takes the hiss off the sea before it takes the rumble. */
export const wavesCutoff = (level: number) => 300 * Math.pow(2, 4.5 * level);

class WavesPlayer {
  private out: GainNode;
  private send: GainNode;
  private tone: BiquadFilterNode;
  private pans: StereoPannerNode[];
  private hush: AudioBufferSourceNode[];
  private hushTone: BiquadFilterNode;
  private hushLevel: GainNode;
  private next: number;
  private level = 0;
  private closing: ReturnType<typeof setTimeout> | null = null;

  constructor(private e: Engine) {
    const { ctx } = e;
    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.send = ctx.createGain();
    this.send.gain.value = WAVES_WET;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.Q.value = 0.4;
    this.tone.connect(this.out).connect(e.master);
    this.out.connect(this.send).connect(e.reverb);
    this.pans = [-0.45, 0, 0.45].map((side) => {
      const p = ctx.createStereoPanner();
      p.pan.value = side;
      p.connect(this.tone);
      return p;
    });
    this.hushTone = ctx.createBiquadFilter();
    this.hushTone.type = "lowpass";
    this.hushTone.frequency.value = 420;
    this.hushLevel = ctx.createGain();
    this.hushLevel.gain.value = 0.16;
    this.hushTone.connect(this.hushLevel);
    // Two copies at different speeds, one to each side, so the short noise buffer never audibly repeats.
    this.hush = [0.93, 1.07].map((rate, i) => {
      const src = ctx.createBufferSource();
      src.buffer = e.noise;
      src.loop = true;
      src.playbackRate.value = rate;
      const pan = ctx.createStereoPanner();
      pan.pan.value = i === 0 ? -0.6 : 0.6;
      src.connect(pan).connect(this.hushTone);
      src.start();
      return src;
    });
    this.hushLevel.connect(this.tone);
    this.next = ctx.currentTime + 0.3;
  }

  setLevel(level: number, onGone: () => void): void {
    this.level = level;
    const now = this.e.ctx.currentTime;
    this.out.gain.setTargetAtTime(Math.max(0.0001, level * WAVES_LEVEL), now, WAVES_EASE);
    this.tone.frequency.setTargetAtTime(wavesCutoff(level), now, WAVES_EASE);
    if (level > 0) {
      if (this.closing) clearTimeout(this.closing);
      this.closing = null;
    } else if (!this.closing) {
      this.closing = setTimeout(() => {
        this.stop();
        onGone();
      }, WAVES_FADE_MS);
    }
  }

  /** Schedule the next wave once it comes inside the lookahead. */
  tick(): void {
    if (this.level <= 0) return;
    const now = this.e.ctx.currentTime;
    this.next = catchUp(this.next, now);
    while (this.next < now + LOOKAHEAD) {
      this.wave(this.next);
      this.next += nextWaveGap();
    }
  }

  private wave(t: number): void {
    const { e, tone } = this;
    const size = rand(0.65, 1);
    const side = pick(this.pans);
    // The swell coming in, the break as it falls, and the foam draining back down the sand.
    noise(e, tone, { t, peak: 0.5 * size, attack: 2.4, hold: 0.3, decay: 3.2, filter: "lowpass", freq: 140, to: 520, q: 0.5 });
    noise(e, side, { t: t + 1.9, peak: 0.4 * size, attack: 0.7, hold: 0.2, decay: 2.6, filter: "bandpass", freq: 1800, to: 500, q: 0.5 });
    noise(e, side, { t: t + 2.8, peak: 0.16 * size, attack: 0.9, decay: 4.6, filter: "highpass", freq: 2800, to: 5000, q: 0.4 });
  }

  private stop(): void {
    for (const src of this.hush) {
      src.stop();
      src.disconnect();
    }
    for (const n of [...this.pans, this.hushTone, this.hushLevel, this.tone, this.send, this.out]) n.disconnect();
  }
}

// ---------------------------------------------------------------------------
// Effects. Each gets its own output gain (volume) and a reverb amount.

type SfxFn = (e: Engine, out: AudioNode, t: number, p: number) => void;
// ---------------------------------------------------------------------------
// Gulls, birds and the brook. Like the sea, not a mood: they play alongside the music, and only
// where they can be heard. Gulls and birds are scattered calls; the river is a light, low flow
// with a few soft ripples over it.

const GULLS_LEVEL = 0.28;
const BIRDS_LEVEL = 0.8;
const INSECTS_LEVEL = 1.3;
const BROOK_LEVEL = 0.28;
const FOUNTAIN_LEVEL = 0.3;
const NATURE_WET = 0.1;
/** How quickly each sound follows you, as a time constant in seconds. */
const NATURE_EASE = 0.6;
/** How long after the last of them goes quiet they are shut down. */
export const NATURE_FADE_MS = 4000;

/** Seconds from one gull's cry, or one bird's song, to the next. */
export const nextGullGap = () => rand(5, 14);
export const nextBirdGap = () => rand(2.5, 8);
/** Seconds from one cricket, or passing bee, to the next. */
export const nextInsectGap = () => rand(3, 9);
/** Seconds between drops landing in the fountain's basin. */
export const nextDropGap = (level: number) => rand(0.04, 0.16) / Math.max(0.3, level);
/** Seconds between ripples. A few near the bank; further off, hardly any. */
export const nextBubbleGap = (level: number) => rand(0.08, 0.4) / Math.max(0.2, level);

const audible = (n: Nature) => Object.values(n).some((level) => level > 0);

class NaturePlayer {
  private out: GainNode;
  private send: GainNode;
  private layers: Record<keyof Nature, GainNode>;
  private levels: Nature = { gulls: 0, birds: 0, insects: 0, brook: 0, fountain: 0 };
  private rush: AudioBufferSourceNode[] = [];
  private rushNodes: AudioNode[] = [];
  private spray: AudioBufferSourceNode | null = null;
  private sprayNodes: AudioNode[] = [];
  private next: Record<keyof Nature, number>;
  private closing: ReturnType<typeof setTimeout> | null = null;

  constructor(private e: Engine) {
    const { ctx } = e;
    this.out = ctx.createGain();
    this.out.connect(e.master);
    this.send = ctx.createGain();
    this.send.gain.value = NATURE_WET;
    this.out.connect(this.send).connect(e.reverb);
    const layer = () => {
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      g.connect(this.out);
      return g;
    };
    this.layers = { gulls: layer(), birds: layer(), insects: layer(), brook: layer(), fountain: layer() };
    const now = ctx.currentTime;
    this.next = { gulls: now + rand(0.5, 3), birds: now + rand(0.3, 1.5), insects: now + rand(1, 4), brook: now + 0.2, fountain: now + 0.2 };
  }

  setLevels(levels: Nature, onGone: () => void): void {
    this.levels = levels;
    const now = this.e.ctx.currentTime;
    this.layers.gulls.gain.setTargetAtTime(Math.max(0.0001, levels.gulls * GULLS_LEVEL), now, NATURE_EASE);
    this.layers.birds.gain.setTargetAtTime(Math.max(0.0001, levels.birds * BIRDS_LEVEL), now, NATURE_EASE);
    this.layers.insects.gain.setTargetAtTime(Math.max(0.0001, levels.insects * INSECTS_LEVEL), now, NATURE_EASE);
    this.layers.brook.gain.setTargetAtTime(Math.max(0.0001, levels.brook * BROOK_LEVEL), now, NATURE_EASE);
    this.layers.fountain.gain.setTargetAtTime(Math.max(0.0001, levels.fountain * FOUNTAIN_LEVEL), now, NATURE_EASE);
    if (levels.brook > 0 && !this.rush.length) this.startRush();
    if (levels.fountain > 0 && !this.spray) this.startSpray();
    if (audible(levels)) {
      if (this.closing) clearTimeout(this.closing);
      this.closing = null;
    } else if (!this.closing) {
      this.closing = setTimeout(() => {
        this.stop();
        onGone();
      }, NATURE_FADE_MS);
    }
  }

  /** Schedule whatever comes inside the lookahead. */
  tick(): void {
    const now = this.e.ctx.currentTime;
    const horizon = now + LOOKAHEAD;
    const run = (kind: keyof Nature, play: (t: number) => void, gap: () => number) => {
      if (this.levels[kind] <= 0) return;
      this.next[kind] = catchUp(this.next[kind], now);
      while (this.next[kind] < horizon) {
        play(this.next[kind]);
        this.next[kind] += gap();
      }
    };
    run("gulls", (t) => this.gull(t), nextGullGap);
    run("birds", (t) => this.bird(t), nextBirdGap);
    run("insects", (t) => this.insect(t), nextInsectGap);
    run("brook", (t) => this.bubble(t), () => nextBubbleGap(this.levels.brook));
    run("fountain", (t) => this.drop(t), () => nextDropGap(this.levels.fountain));
  }

  /** Calls come from all around: a path into a layer from a random side. */
  private from(layer: GainNode): StereoPannerNode {
    const p = this.e.ctx.createStereoPanner();
    p.pan.value = rand(-0.7, 0.7);
    p.connect(layer);
    return p;
  }

  /**
   * A herring gull. Real gulls have two voices, and neither sits in between: a high "kyow" with
   * its fundamental around 1.2 to 1.5 kHz, and a low, barking "kek" around 370 Hz. Most often this
   * plays a long call, one drawn-out note and then a run of shorter ones. Each note is one voice
   * that falls late, and it only roughens briefly, near the end. Far-off gulls lose their top.
   */
  private gull(t: number): void {
    const { e } = this;
    const { ctx } = e;
    const kind = pick(["long", "long", "long", "kyow", "kek"] as const);
    const distant = chance(0.35);
    const distance = distant ? rand(0.25, 0.45) : rand(0.8, 1);
    const pitch = rand(0.94, 1.06);
    const pace = rand(0.9, 1.12);
    const roughness = rand(0.06, 0.16) * (distant ? 0.6 : 1);
    const path = this.from(this.layers.gulls);

    const out = ctx.createGain();
    out.gain.value = 0.9 * distance; // Matching trim before GULLS_LEVEL.
    out.connect(path);

    const air = ctx.createBiquadFilter();
    air.type = "lowpass";
    air.frequency.value = distant ? rand(2300, 2900) : rand(4400, 5200);
    air.Q.value = 0.5;
    air.connect(out);

    // Shared articulation filter: note envelopes do not overlap.
    const mouth = ctx.createBiquadFilter();
    mouth.type = "lowpass";
    mouth.Q.value = 0.6;
    mouth.connect(air);

    const voice = ctx.createGain();
    const nodes: AudioNode[] = [path, out, air, mouth, voice];

    if (kind === "kek") {
      // Low source pitch with strong upper harmonics gives a nasal bark.
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 600;
      hp.Q.value = 0.5;
      voice.connect(hp);
      let tail: AudioNode = hp;
      nodes.push(hp);

      const tract = rand(0.96, 1.04);
      for (const [hz, db, q] of [[1230, 8, 1.6], [1990, 5, 2]]) {
        const f = ctx.createBiquadFilter();
        f.type = "peaking";
        f.frequency.value = hz * tract;
        f.gain.value = db;
        f.Q.value = q;
        tail.connect(f);
        tail = f;
        nodes.push(f);
      }
      tail.connect(mouth);
    } else {
      // Keep the fundamental and a coherent, sparse harmonic ladder.
      voice.connect(mouth);
    }

    const count = kind === "long" ? pick([6, 7, 8])
      : kind === "kek" ? pick([5, 6, 7, 8]) : pick([1, 1, 2]);

    let at = t;
    let last: OscillatorNode | undefined;

    for (let i = 0; i < count; i++) {
      const intro = kind === "long" && i === 0;
      const u = i / Math.max(1, count - 1);

      const len = pace * (intro ? rand(0.65, 0.85)
        : kind === "kek" ? rand(0.10, 0.15)
        : kind === "kyow" ? rand(0.36, 0.55)
        : 0.29 - 0.07 * Math.sin(Math.PI * u) + rand(-0.015, 0.015));

      // Repeated long-call notes become brighter, without a downward staircase.
      const top = pitch * (intro ? rand(1050, 1200)
        : kind === "kek" ? rand(365, 395)
        : rand(1450, 1540) * (1 + 0.025 * Math.sin(Math.PI * u)));

      const endRatio = intro ? rand(0.66, 0.73)
        : kind === "kek" ? rand(0.85, 0.9) : rand(0.77, 0.82);

      const level = (kind === "kek" ? 0.46 : 0.42)
        * rand(0.88, 1)
        * (i === count - 1 && count > 2 ? 0.8 : 1);

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const amp = ctx.createGain();
      amp.gain.value = 0;
      osc.connect(amp).connect(voice);

      // Half-frequency FM briefly adds subharmonic sidebands.
      // It approximates rough phonation rather than adding an independent voice.
      const mod = ctx.createOscillator();
      mod.type = "sine";
      const depth = ctx.createGain();
      depth.gain.value = 0;
      mod.connect(depth).connect(osc.frequency);

      const points: readonly (readonly [number, number])[] = [
        [0, intro ? 0.82 : 1],
        [0.10, 1],
        [0.43, 0.98],
        [0.76, endRatio + 0.07],
        [1, endRatio],
      ];

      for (const [param, ratio] of [
        [osc.frequency, 1], [mod.frequency, 0.5],
      ] as const) {
        points.forEach(([x, y], j) => {
          const value = top * y * ratio;
          if (j === 0) param.setValueAtTime(value, at);
          else param.exponentialRampToValueAtTime(value, at + x * len);
        });
      }

      depth.gain.setValueAtTime(0, at);
      depth.gain.linearRampToValueAtTime(top * 0.008, at + len * 0.35);
      depth.gain.linearRampToValueAtTime(
        top * roughness * (kind === "kek" ? 0.3 : 1),
        at + len * 0.68,
      );
      depth.gain.linearRampToValueAtTime(0, at + len);

      // Sustain enough amplitude to hear the falling "ow".
      amp.gain.setValueAtTime(0, at);
      amp.gain.linearRampToValueAtTime(level, at + len * 0.09);
      amp.gain.linearRampToValueAtTime(level * 0.85, at + len * 0.48);
      amp.gain.linearRampToValueAtTime(level * 0.38, at + len * 0.83);
      amp.gain.linearRampToValueAtTime(0, at + len);

      mouth.frequency.setValueAtTime(intro ? 2600 : 3300, at);
      mouth.frequency.linearRampToValueAtTime(
        kind === "kek" ? 4800 : 4500,
        at + len * 0.16,
      );
      mouth.frequency.exponentialRampToValueAtTime(
        kind === "kek" ? 2600 : 2100,
        at + len,
      );

      noise(e, voice, {
        t: at,
        peak: level * (distant ? 0.018 : 0.035),
        attack: 0.006,
        decay: len * 0.6,
        filter: "bandpass",
        freq: intro ? 1500 : 2200,
        q: 0.7,
      });

      nodes.push(osc, amp, mod, depth);
      osc.start(at);
      mod.start(at);
      osc.stop(at + len + 0.06);
      mod.stop(at + len + 0.06);
      last = osc;

      // Quicker middle and a slight easing at the end.
      const gap = intro ? rand(0.22, 0.30)
        : kind === "kek" ? 0.11 - 0.035 * Math.sin(Math.PI * u)
        : kind === "kyow" ? rand(0.28, 0.42)
        : 0.19 - 0.055 * Math.sin(Math.PI * u);

      at += len + pace * gap * rand(0.94, 1.06);
    }

    // Every oscillator has a scheduled stop. Noise helpers clean up themselves.
    // Audio-clock cleanup remains correct during lookahead or suspension.
    if (last) {
      last.onended = () => nodes.forEach((node) => node.disconnect());
    }
  }

  /** One small songbird: a warble, a two-note whistle, or a quick trill. */
  private bird(t: number): void {
    const { e } = this;
    const path = this.from(this.layers.birds);
    const lift = rand(0.9, 1.2);
    const far = rand(0.5, 1);
    const song = pick(["warble", "whistle", "trill"] as const);
    let at = t;
    if (song === "warble") {
      const notes = 3 + Math.floor(rand(0, 4));
      for (let i = 0; i < notes; i++) {
        const f = rand(2800, 4600) * lift;
        const len = rand(0.06, 0.11);
        tone(e, path, { t: at, freq: f, to: f * rand(0.8, 1.3), glide: len, peak: 0.07 * far, attack: 0.012, decay: len });
        at += len + rand(0.02, 0.07);
      }
    } else if (song === "whistle") {
      const f = rand(3100, 3700) * lift;
      tone(e, path, { t: at, freq: f, to: f * 0.96, glide: 0.3, peak: 0.06 * far, attack: 0.04, hold: 0.16, decay: 0.16 });
      at += 0.42;
      tone(e, path, { t: at, freq: f * 0.82, to: f * 0.79, glide: 0.34, peak: 0.055 * far, attack: 0.04, hold: 0.18, decay: 0.18 });
      at += 0.42;
    } else {
      const f = rand(3800, 5000) * lift;
      const pulses = 7 + Math.floor(rand(0, 6));
      for (let i = 0; i < pulses; i++) {
        tone(e, path, { t: at, freq: f, to: f * 1.08, glide: 0.03, peak: 0.05 * far, attack: 0.006, decay: 0.035 });
        at += 0.055;
      }
    }
    setTimeout(() => path.disconnect(), (at - e.ctx.currentTime + 2) * 1000);
  }

  /** Mostly a cricket in the grass, now and then a bumblebee drifting across. */
  private insect(t: number): void {
    const { e } = this;
    const path = this.from(this.layers.insects);
    let at = t;
    if (chance(0.75)) {
      const f = rand(4200, 5000);
      const far = rand(0.5, 1);
      const chirps = 2 + Math.floor(rand(0, 3));
      for (let c = 0; c < chirps; c++) {
        for (let p = 0; p < 3; p++) tone(e, path, { t: at + p * 0.045, freq: f, peak: 0.05 * far, attack: 0.005, decay: 0.025 });
        at += rand(0.32, 0.42);
      }
    } else {
      const side = chance(0.5) ? -0.7 : 0.7;
      const len = rand(2.2, 3.4);
      const f = rand(170, 215);
      path.pan.setValueAtTime(side, t);
      path.pan.linearRampToValueAtTime(-side, t + len);
      for (const detune of [-9, 8]) tone(e, path, { t, freq: f, to: f * rand(0.92, 1.08), glide: len, type: "sawtooth", peak: 0.018, attack: len * 0.4, hold: len * 0.1, decay: len * 0.5, detune, lowpass: 800 });
      at += len;
    }
    setTimeout(() => path.disconnect(), (at - e.ctx.currentTime + 2) * 1000);
  }

  /** The rush of the water, two copies at different speeds so the noise buffer never audibly repeats. */
  private startRush(): void {
    const { e } = this;
    const { ctx } = e;
    const low = ctx.createBiquadFilter();
    low.type = "bandpass";
    low.frequency.value = 520;
    low.Q.value = 0.5;
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 3200;
    const lowLevel = ctx.createGain();
    lowLevel.gain.value = 0.11;
    const highLevel = ctx.createGain();
    highLevel.gain.value = 0.006;
    low.connect(lowLevel).connect(this.layers.brook);
    high.connect(highLevel).connect(this.layers.brook);
    this.rushNodes = [low, high, lowLevel, highLevel];
    this.rush = [0.88, 1.13].map((rate, i) => {
      const src = ctx.createBufferSource();
      src.buffer = e.noise;
      src.loop = true;
      src.playbackRate.value = rate;
      const pan = ctx.createStereoPanner();
      pan.pan.value = i === 0 ? -0.5 : 0.5;
      src.connect(pan);
      pan.connect(low);
      pan.connect(high);
      src.start();
      this.rushNodes.push(pan);
      return src;
    });
  }

  /** Water falling into the basin: one copy of the noise, as the Square has little audio to spare. */
  private startSpray(): void {
    const { e } = this;
    const { ctx } = e;
    const src = ctx.createBufferSource();
    src.buffer = e.noise;
    src.loop = true;
    const splash = ctx.createBiquadFilter();
    splash.type = "bandpass";
    splash.frequency.value = 1500;
    splash.Q.value = 0.7;
    const basin = ctx.createBiquadFilter();
    basin.type = "bandpass";
    basin.frequency.value = 600;
    basin.Q.value = 0.7;
    const splashLevel = ctx.createGain();
    splashLevel.gain.value = 0.11;
    const basinLevel = ctx.createGain();
    basinLevel.gain.value = 0.07;
    src.connect(splash).connect(splashLevel).connect(this.layers.fountain);
    src.connect(basin).connect(basinLevel).connect(this.layers.fountain);
    src.start();
    this.spray = src;
    this.sprayNodes = [splash, basin, splashLevel, basinLevel];
  }

  /** One drop landing: brighter and quicker than the river's ripples. */
  private drop(t: number): void {
    const f = rand(700, 1900);
    const len = rand(0.02, 0.05);
    tone(this.e, this.layers.fountain, { t, freq: f, to: f * rand(1.2, 1.6), glide: len, peak: rand(0.04, 0.13), attack: 0.003, decay: len });
  }

  /** One ripple: a tiny, soft rising blip, just enough that the flow doesn't sound like plain hiss. */
  private bubble(t: number): void {
    const f = rand(320, 950);
    const len = rand(0.04, 0.09);
    tone(this.e, this.layers.brook, { t, freq: f, to: f * rand(1.3, 1.9), glide: len, peak: rand(0.05, 0.14), attack: 0.012, decay: len });
  }

  private stop(): void {
    for (const src of this.rush) {
      src.stop();
      src.disconnect();
    }
    this.spray?.stop();
    this.spray?.disconnect();
    for (const n of [...this.rushNodes, ...this.sprayNodes, ...Object.values(this.layers), this.send, this.out]) n.disconnect();
  }
}

interface SfxDef { fn: SfxFn; wet: number; len: number }

const SFX: Record<Sfx, SfxDef> = {
  step: {
    wet: 0, len: 0.2,
    fn: (e, out, t, p) => {
      noise(e, out, { t, peak: rand(0.12, 0.18), decay: rand(0.05, 0.08), filter: "lowpass", freq: rand(500, 900) * p });
      tone(e, out, { freq: rand(85, 100) * p, to: 55 * p, glide: 0.06, t, peak: 0.12, decay: 0.07 });
    },
  },
  pickup: {
    wet: 0.25, len: 1,
    fn: (e, out, t, p) => {
      pluck(e, out, t, mtof(81) * p, 0.9, 4000, 0.4);
      pluck(e, out, t + 0.08, mtof(86) * p, 1, 4000, 0.6);
    },
  },
  blip: {
    wet: 0, len: 0.15,
    fn: (e, out, t, p) => {
      const f = 520 * p * rand(0.96, 1.04);
      tone(e, out, { type: "triangle", freq: f, to: f * 0.85, glide: 0.05, t, peak: 0.1, attack: 0.004, decay: 0.05, lowpass: 2000 });
    },
  },
  fact: {
    wet: 0.5, len: 3,
    fn: (e, out, t, p) => {
      [74, 78, 81, 86].forEach((m, i) => chime(e, out, t + i * 0.07, mtof(m) * p, 1 - i * 0.1, 1.8));
      noise(e, out, { t, peak: 0.025, attack: 0.05, decay: 0.6, filter: "highpass", freq: 7000 });
    },
  },
  trip: {
    wet: 0.15, len: 1,
    fn: (e, out, t, p) => {
      tone(e, out, { freq: 110 * p, to: 45 * p, glide: 0.15, t, peak: 0.5, decay: 0.25 });
      noise(e, out, { t, peak: 0.12, decay: 0.12, filter: "lowpass", freq: 600 });
      // Paper lanterns tumbling: a scatter of crinkles and light knocks.
      for (let i = 0; i < 7; i++) {
        const at = t + 0.04 + rand(0, 0.45) * (i / 7 + 0.3);
        noise(e, out, { t: at, peak: rand(0.05, 0.1), decay: rand(0.03, 0.07), filter: "bandpass", freq: rand(2000, 4500) * p, q: 2 });
        if (chance(0.4)) tone(e, out, { type: "triangle", freq: rand(500, 800) * p, t: at, peak: 0.06, decay: 0.04 });
      }
    },
  },
  shell: {
    wet: 0.2, len: 1.2,
    fn: (e, out, t, p) => {
      noise(e, out, { t, peak: 0.16, attack: 0.2, decay: 0.3, filter: "bandpass", freq: 300 * p, to: 1400 * p, q: 1.2 });
      const c = t + 0.45;
      tone(e, out, { type: "triangle", freq: 620 * p, to: 480 * p, glide: 0.03, t: c, peak: 0.16, decay: 0.05 });
      noise(e, out, { t: c, peak: 0.07, decay: 0.03, filter: "bandpass", freq: 2500 * p, q: 2 });
    },
  },
  light: {
    wet: 0.3, len: 1.8,
    fn: (e, out, t, p) => {
      noise(e, out, { t, peak: 0.2, attack: 0.08, decay: 0.55, filter: "lowpass", freq: 180 * p, to: 1100 * p, q: 0.8 });
      tone(e, out, { freq: 110 * p, to: 165 * p, glide: 0.25, t, peak: 0.14, attack: 0.06, decay: 0.5 });
      chime(e, out, t + 0.18, mtof(81) * p, 0.35, 1.2);
    },
  },
  hang: {
    wet: 0.1, len: 0.5,
    fn: (e, out, t, p) => {
      tone(e, out, { type: "triangle", freq: 880 * p, to: 700 * p, glide: 0.02, t, peak: 0.12, decay: 0.035 });
      noise(e, out, { t, peak: 0.06, decay: 0.02, filter: "bandpass", freq: 2200 * p, q: 3 });
      noise(e, out, { t: t + 0.04, peak: 0.03, attack: 0.03, decay: 0.12, filter: "highpass", freq: 3000 });
    },
  },
  heartbeat: {
    wet: 0, len: 0.7,
    fn: (e, out, t, p) => {
      tone(e, out, { freq: 62 * p, to: 44 * p, glide: 0.12, t, peak: 0.6, attack: 0.01, decay: 0.16, lowpass: 200 });
      tone(e, out, { freq: 56 * p, to: 40 * p, glide: 0.12, t: t + 0.22, peak: 0.42, attack: 0.01, decay: 0.2, lowpass: 200 });
    },
  },
  ui: {
    wet: 0, len: 0.1,
    fn: (e, out, t, p) => {
      tone(e, out, { freq: 1100 * p, to: 900 * p, glide: 0.02, t, peak: 0.06, attack: 0.002, decay: 0.025 });
    },
  },
  mend: {
    wet: 0.35, len: 2,
    fn: (e, out, t, p) => {
      for (let i = 0; i < 5; i++) {
        noise(e, out, { t: t + i * 0.06 + rand(0, 0.02), peak: rand(0.03, 0.06), attack: 0.01, decay: 0.05, filter: "bandpass", freq: rand(2500, 4000), q: 1.5 });
      }
      chime(e, out, t + 0.32, mtof(81) * p, 0.7, 1.4);
      chime(e, out, t + 0.42, mtof(86) * p, 0.4, 1.4);
    },
  },
  door: {
    wet: 0.15, len: 1,
    fn: (e, out, t, p) => {
      // Creak: a buzzy low tone through a narrow band, wobbling in pitch.
      const { ctx } = e;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const curve = new Float32Array(16).map((_, i) => (95 + 25 * Math.sin(i * 1.3) + rand(-8, 8)) * p);
      osc.frequency.setValueCurveAtTime(curve, t, 0.4);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1000 * p;
      bp.Q.value = 6;
      const g = ctx.createGain();
      const end = envelope(g.gain, t, 0.05, 0.25, 0.1, 0.12);
      osc.connect(bp).connect(g).connect(out);
      osc.onended = () => [osc, bp, g].forEach((n) => n.disconnect());
      osc.start(t);
      osc.stop(end + 0.05);
      // Thunk as it settles.
      const th = t + 0.42;
      tone(e, out, { freq: 90 * p, to: 50 * p, glide: 0.1, t: th, peak: 0.35, decay: 0.15 });
      noise(e, out, { t: th, peak: 0.08, decay: 0.08, filter: "lowpass", freq: 700 });
    },
  },
  ending: {
    wet: 0.45, len: 6,
    fn: (e, out, t, p) => {
      [62, 66, 69, 74, 76, 78, 81].forEach((m, i) => pluck(e, out, t + i * 0.22, mtof(m) * p, 0.8, 2800, 1.8));
      const last = t + 7 * 0.22;
      pluck(e, out, last + 0.1, mtof(74) * p, 0.9, 2800, 3);
      chime(e, out, last + 0.1, mtof(86) * p, 0.6, 3.5);
      pad(e, out, t, [50, 54, 57, 62], 4, 1.4, 1200);
    },
  },
};

function playSfx(e: Engine, name: Sfx, pitch: number, volume: number): void {
  const def = SFX[name];
  const { ctx } = e;
  const out = ctx.createGain();
  out.gain.value = volume;
  out.connect(e.sfx);
  let send: GainNode | null = null;
  if (def.wet > 0) {
    send = ctx.createGain();
    send.gain.value = def.wet;
    out.connect(send).connect(e.reverb);
  }
  def.fn(e, out, ctx.currentTime + 0.01, pitch);
  setTimeout(() => {
    out.disconnect();
    send?.disconnect();
  }, (def.len + 1) * 1000);
}

// ---------------------------------------------------------------------------
// Public factory.

/** Volume/mute state with persistence; the base of both implementations. */
function settingsApi(s: Settings, apply: () => void) {
  const commit = () => {
    saveSettings(s);
    apply();
  };
  return {
    get volume() { return s.volume; },
    set volume(v: number) { s.volume = clamp01(v); commit(); },
    setVolume(v: number) { s.volume = clamp01(v); commit(); },
    get muted() { return s.muted; },
    set muted(m: boolean) { s.muted = m; commit(); },
    toggleMute() { s.muted = !s.muted; commit(); },
  };
}

function createNoopSound(s: Settings): Sound {
  const api = settingsApi(s, () => {});
  return Object.defineProperties(
    { unlock() {}, setMood(_m: Mood) {}, setWaves(_l: number) {}, setNature(_n: Nature) {}, play(_x: Sfx) {} },
    Object.getOwnPropertyDescriptors(api),
  ) as Sound;
}

export function createSound(): Sound {
  const settings = loadSettings();
  const Ctor = findAudioContext();
  if (!Ctor) return createNoopSound(settings);

  let engine: Engine | null = null;
  let failed = false;
  let mood: Mood = "silent";
  let player: MoodPlayer | null = null;
  let wavesLevel = 0;
  let waves: WavesPlayer | null = null;
  let natureLevels: Nature = { gulls: 0, birds: 0, insects: 0, brook: 0, fountain: 0 };
  let nature: NaturePlayer | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const applyVolume = () => {
    if (!engine) return;
    const target = settings.muted ? 0 : settings.volume;
    engine.master.gain.setTargetAtTime(target, engine.ctx.currentTime, 0.05);
  };

  const startMood = () => {
    if (!engine) return;
    player?.fadeOut();
    player = mood === "silent" ? null : new MoodPlayer(engine, composerFor(mood));
    player?.tick();
  };

  const applyWaves = () => {
    if (!engine) return;
    if (wavesLevel > 0 && !waves) waves = new WavesPlayer(engine);
    waves?.setLevel(wavesLevel, () => { waves = null; });
  };

  const applyNature = () => {
    if (!engine) return;
    if (audible(natureLevels) && !nature) nature = new NaturePlayer(engine);
    nature?.setLevels(natureLevels, () => { nature = null; });
  };

  const api = settingsApi(settings, applyVolume);
  const sound = {
    unlock() {
      if (failed) return;
      try {
        if (!engine) {
          engine = buildEngine(Ctor, settings);
          timer = setInterval(() => {
            player?.tick();
            waves?.tick();
            nature?.tick();
          }, TICK_MS);
          startMood();
          applyWaves();
          applyNature();
        }
        if (engine.ctx.state === "suspended") void engine.ctx.resume().catch(() => {});
      } catch {
        // Audio refused (policy, hardware): stay silent rather than break the game.
        failed = true;
        if (timer) clearInterval(timer);
        engine = null;
      }
    },
    setMood(next: Mood) {
      if (next === mood) return;
      mood = next;
      try { startMood(); } catch { /* keep playing whatever was there */ }
    },
    setWaves(level: number) {
      const next = clamp01(level);
      // The world calls this every frame; only a real change, or arriving or leaving, does anything.
      if (next > 0 === wavesLevel > 0 && Math.abs(next - wavesLevel) < 0.01) return;
      wavesLevel = next;
      try { applyWaves(); } catch { /* the walk goes on without the sea */ }
    },
    setNature(levels: Nature) {
      const next = { gulls: clamp01(levels.gulls), birds: clamp01(levels.birds), insects: clamp01(levels.insects), brook: clamp01(levels.brook), fountain: clamp01(levels.fountain) };
      // Called every frame, like the sea: only a real change, or a sound arriving or leaving, does anything.
      const same = (Object.keys(next) as (keyof Nature)[]).every((k) => next[k] > 0 === natureLevels[k] > 0 && Math.abs(next[k] - natureLevels[k]) < 0.01);
      if (same) return;
      natureLevels = next;
      try { applyNature(); } catch { /* the walk goes on without them */ }
    },
    play(name: Sfx, opts?: { pitch?: number; volume?: number }) {
      if (!engine || !(name in SFX)) return;
      const pitch = opts?.pitch && opts.pitch > 0 ? opts.pitch : 1;
      const vol = clamp01(opts?.volume ?? 1);
      try { playSfx(engine, name, pitch, vol); } catch { /* a dropped effect is fine */ }
    },
  };
  return Object.defineProperties(sound, Object.getOwnPropertyDescriptors(api)) as Sound;
}
