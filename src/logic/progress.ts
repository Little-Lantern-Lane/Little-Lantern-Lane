// Which parts of the story you've finished. Plain data and pure rules: the village asks this who
// to send you to next, and a save point asks it whether this run moves your story along or is
// you playing something again. Nothing here scores anything; finished only means finished.

/** The story's order. The far bank (7) comes after the storm. */
export const LEVEL_ORDER = [1, 2, 3, 7, 4, 5, 6] as const;

export interface Progress {
  finished: number[];
}

const isLevel = (n: unknown): n is number => (LEVEL_ORDER as readonly unknown[]).includes(n);

export const hasFinished = (p: Progress, level: number) => p.finished.includes(level);

/** The first part you haven't finished, or null when you've finished them all. */
export function nextLevel(p: Progress): number | null {
  return LEVEL_ORDER.find((l) => !hasFinished(p, l)) ?? null;
}

export function finishLevel(p: Progress, level: number): Progress {
  return !isLevel(level) || hasFinished(p, level) ? p : { finished: [...p.finished, level] };
}

/** A save from before this was kept: everything ahead of the chapter it leads into is finished. */
export function progressFromSave(chapter: number | undefined): Progress {
  const at = LEVEL_ORDER.indexOf(chapter as (typeof LEVEL_ORDER)[number]);
  return { finished: at < 0 ? [] : LEVEL_ORDER.slice(0, at) };
}

export function normalizeProgress(raw: unknown): Progress {
  const finished = (raw as Partial<Progress> | null)?.finished;
  return { finished: Array.isArray(finished) ? [...new Set(finished.filter(isLevel))] : [] };
}

/**
 * Reaching the end of `done`, whose story leads into `next`. `onPath` means this run is your story
 * moving along, so it saves and can carry on. Otherwise it was a replay or a jump ahead: the part
 * is finished, your place in the story stays where it was, and you go back to the village.
 */
export function atSavePoint(p: Progress, done: number, next: number) {
  const firstTime = !hasFinished(p, done);
  const wasNext = nextLevel(p) === done;
  const progress = finishLevel(p, done);
  return { progress, firstTime, onPath: wasNext && nextLevel(progress) === next };
}
