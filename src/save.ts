// Save points between chapters. One save per browser, in localStorage: the
// story's position and variables plus the game state (meter and village).
// No playtest notes or other personal text are saved.

import type { GameState } from "./logic/state";
import type { Variant } from "./logic/facts";
import { normalizeBag, type BagState } from "./logic/bag";
import { BOUGHT_CLOTHES, normalizeCharacter, normalizeHome, type CharacterChoice, type HomeChoice } from "./logic/appearance";

const KEY = "lantern-night:save";
export type SaveChapter = 2 | 3 | 4 | 5 | 6 | 7;
const CHAPTERS: readonly number[] = [2, 3, 4, 5, 6, 7];
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
    return { ...save, game: { ...save.game, bag: normalizeBag(save.game.bag) } };
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
  7: "the week after: The far bank",
};

// --- What you've gathered ------------------------------------------------------------
// Your bag belongs to you, not to one game: the woods are open from anywhere and you can start any chapter.

const BAG_KEY = "lantern-night:bag";

export function writeBag(bag: BagState, store: Storage | null = storage()): void {
  try {
    store?.setItem(BAG_KEY, JSON.stringify(bag));
  } catch {
    // It just won't last past this visit.
  }
}

export function readBag(store: Storage | null = storage()): BagState {
  try {
    return normalizeBag(JSON.parse(store?.getItem(BAG_KEY) ?? "null"));
  } catch {
    return normalizeBag(null);
  }
}

// Whether the tip about what to try next shows on screen.
const TIPS_KEY = "lantern-night:tips";

export function readTips(store: Storage | null = storage()): boolean {
  try {
    return store?.getItem(TIPS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeTips(on: boolean, store: Storage | null = storage()): void {
  try {
    store?.setItem(TIPS_KEY, on ? "on" : "off");
  } catch {
    // It just won't last past this visit.
  }
}

// --- Your look and your home --------------------------------------------------------
// Kept apart from the chapter save: starting over keeps how you look and your home.

const LOOKS_KEY = "lantern-night:looks";

export interface Looks {
  character: CharacterChoice;
  home: HomeChoice;
  /** Clothes bought from Nell, kept across games like the rest of your look. */
  owned: string[];
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
    const owned = Array.isArray(data.owned) ? data.owned.filter((id) => BOUGHT_CLOTHES.includes(id)) : [];
    return { character: normalizeCharacter(data.character), home: normalizeHome(data.home), owned };
  } catch {
    return null;
  }
}
