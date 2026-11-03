// Save points between chapters. One save per browser, in localStorage: the
// story's position and variables plus the game state (meter and village).
// No playtest notes or other personal text are saved.

import type { GameState } from "./logic/state";
import type { Variant } from "./logic/facts";
import { normalizeCharacter, normalizeHome, type CharacterChoice, type HomeChoice } from "./logic/appearance";

const KEY = "lantern-night:save";
export type SaveChapter = 2 | 3 | 4 | 5 | 6;
const CHAPTERS: readonly number[] = [2, 3, 4, 5, 6];
const VERSION = 1;

export interface SaveGame {
  version: typeof VERSION;
  /** The chapter the save leads into. */
  chapter: SaveChapter;
  variant: Variant;
  /** Ink story state, from Engine.saveState(). */
  story: string;
  game: GameState;
  savedAt: string;
}

/** Storage can be missing or throw (private windows, blocked site data). */
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Returns false when this browser can't keep the save. */
export function writeSave(save: Omit<SaveGame, "version" | "savedAt">, store: Storage | null = storage()): boolean {
  if (!store) return false;
  try {
    store.setItem(KEY, JSON.stringify({ ...save, version: VERSION, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function readSave(store: Storage | null = storage()): SaveGame | null {
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as SaveGame;
    // A save from an older build may not match the story any more; ignore it.
    if (save.version !== VERSION || !CHAPTERS.includes(save.chapter) || typeof save.story !== "string") return null;
    return save;
  } catch {
    return null;
  }
}

export function clearSave(store: Storage | null = storage()): void {
  try {
    store?.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

export const CHAPTER_NAMES: Record<SaveGame["chapter"], string> = {
  2: "chapter two: The morning after",
  3: "chapter three: The storm",
  4: "chapter four: Opening day",
  5: "chapter five: The first snow",
  6: "chapter six: The tide",
};

// --- Your look and your home --------------------------------------------------------
// Kept apart from the chapter save: starting over keeps how you look and your home.

const LOOKS_KEY = "lantern-night:looks";

export interface Looks {
  character: CharacterChoice;
  home: HomeChoice;
}

export function writeLooks(looks: Looks, store: Storage | null = storage()): boolean {
  if (!store) return false;
  try {
    store.setItem(LOOKS_KEY, JSON.stringify(looks));
    return true;
  } catch {
    return false;
  }
}

/** The saved look and home, checked; null if the player hasn't chosen yet. */
export function readLooks(store: Storage | null = storage()): Looks | null {
  if (!store) return null;
  try {
    const raw = store.getItem(LOOKS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Looks>;
    return { character: normalizeCharacter(data.character), home: normalizeHome(data.home) };
  } catch {
    return null;
  }
}
