// Paced breathing (DBT: the P in TIPP): breathe in, then out for longer.
// A breath counts the moment its out-breath has lasted long enough, so the
// player sees it count without having to start the next one.

export const IN_MIN = 3; // seconds
export const OUT_MIN = 4.5;
export const BREATH_GOAL = 4;

export type BreathNote = "in_short" | "out_short" | null;

export interface BreathState {
  phase: "idle" | "in" | "out";
  /** When the current phase started, in seconds. */
  since: number;
  inLength: number;
  /** Whether the current out-breath has already been counted. */
  counted: boolean;
  breaths: number;
  /** Feedback about the last breath that didn't count. */
  note: BreathNote;
}

export function initialBreath(t: number): BreathState {
  return { phase: "idle", since: t, inLength: 0, counted: false, breaths: 0, note: null };
}

/** Start breathing in. */
export function press(s: BreathState, t: number): BreathState {
  if (s.phase === "in") return s;
  // Starting again before the out-breath was long enough: say so.
  const cutShort = s.phase === "out" && !s.counted && s.inLength >= IN_MIN;
  return { ...s, phase: "in", since: t, counted: false, note: cutShort ? "out_short" : null };
}

/** Let go: start breathing out. */
export function release(s: BreathState, t: number): BreathState {
  if (s.phase !== "in") return s;
  const inLength = t - s.since;
  return { ...s, phase: "out", since: t, inLength, note: inLength < IN_MIN ? "in_short" : null };
}

/** Advance time. Counts the breath once the out-breath is long enough. */
export function tick(s: BreathState, t: number): { state: BreathState; counted: boolean } {
  if (s.phase === "out" && !s.counted && s.inLength >= IN_MIN && t - s.since >= OUT_MIN) {
    return { state: { ...s, counted: true, breaths: s.breaths + 1 }, counted: true };
  }
  return { state: s, counted: false };
}

/** How full the lungs are, 0..1, for drawing. */
export function fullness(s: BreathState, t: number): number {
  const dt = t - s.since;
  if (s.phase === "in") return Math.min(1, dt / IN_MIN);
  if (s.phase === "out") return Math.max(0, Math.min(1, s.inLength / IN_MIN) * (1 - dt / OUT_MIN));
  return 0;
}
