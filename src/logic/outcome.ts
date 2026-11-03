// Opposite action and repair are both scored on three parts. Doing all three is
// "all the way"; partial execution gives a partial result.
//   Opposite action (shame does not fit): action (go back), posture (head up),
//   voice (say something steady, without over-apologizing).
//   Repair (shame/guilt fits): own it, make amends, let it go.

export type Completeness = "full" | "partial" | "minimal";

export function scoreParts(parts: readonly boolean[]): Completeness {
  const done = parts.filter(Boolean).length;
  if (done === parts.length) return "full";
  if (done >= parts.length - 1) return "partial";
  return "minimal";
}

export function outcome(a: boolean, b: boolean, c: boolean): Completeness {
  return scoreParts([a, b, c]);
}

/** Walking back counts as "head up" when it was held for most of the walk. */
export const HEAD_UP_SHARE = 0.6;

export function heldHeadUp(headUpSeconds: number, walkSeconds: number): boolean {
  return walkSeconds > 0 && headUpSeconds / walkSeconds >= HEAD_UP_SHARE;
}
