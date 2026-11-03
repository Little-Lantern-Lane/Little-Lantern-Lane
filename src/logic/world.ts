// World state: what the village looks like. Costs and recoveries show up here,
// never as a score. The world can always recover: no event makes it permanent.

import type { GameEvent } from "./tags";
import type { Completeness } from "./outcome";
import { isCharacterId, toExpression, type CharacterId, type Expression } from "./cast";
import { isHotspotId, type HotspotId } from "./facts";

export const LANTERN_COUNT = 12;
export const MAX_DARKNESS = 3;

export type TimeOfDay = "afternoon" | "sunset" | "night" | "morning";

export interface WorldState {
  time: TimeOfDay;
  location: "square" | "edge" | "cave" | "lane" | "home" | "mill" | "coast" | "shed";
  form: "person" | "shell";
  posture: "upright" | "neutral" | "slumped";
  faceHot: boolean;
  lanterns: "workshop" | "carried" | "scattered" | "heaped" | "hung";
  lanternsHung: number;
  /** How lit the square is, 0..1. */
  squareLight: number;
  /** How far darkness has spread into the lanes, 0..MAX_DARKNESS. */
  darkness: number;
  /** Each character's current face. Missing means neutral. */
  faces: Partial<Record<CharacterId, Expression>>;
  invitation: "none" | "missing" | "pending" | "received";
  heirloom: "whole" | "torn" | "mended";
  /** Which lens the square is drawn through during check the facts. */
  lens: "none" | "shame" | "facts";
  /** Details found while looking again at what happened. */
  factsFound: HotspotId[];
  /** The pull to hide drags the player toward the hollow. */
  pull: boolean;
  /** Carrying Ash's candle jar: dark lanes can be walked. */
  hasLight: boolean;
  /** Chapter: 1 the fall, 2 the morning after, 3 the storm, 4 opening day, 5 the first snow, 6 the tide. */
  level: Level;
  weather: "clear" | "storm" | "snow";
  /** Scenery that comes and goes with the story (names of PROPS in layout.ts). */
  props: string[];
  /** People the story has moved: a world x, or null for gone. Overrides where they'd usually stand. */
  placed: Partial<Record<CharacterId, number | null>>;
  /** In the grip of the storm's panic wave, before the body comes down. */
  panic: boolean;
  /** Lanterns the wind took. */
  lanternsLost: number;
  ended: boolean;
}

export type Level = 1 | 2 | 3 | 4 | 5 | 6;
export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6];
const LOCATIONS: readonly WorldState["location"][] = ["square", "edge", "cave", "lane", "home", "mill", "coast", "shed"];

/** Where each later chapter starts, and what time and weather it is. */
const CHAPTER_START: Record<Exclude<Level, 1>, Pick<WorldState, "location" | "time" | "weather">> = {
  2: { location: "lane", time: "morning", weather: "clear" },
  3: { location: "square", time: "night", weather: "clear" },
  4: { location: "mill", time: "morning", weather: "clear" },
  5: { location: "lane", time: "sunset", weather: "snow" },
  6: { location: "coast", time: "afternoon", weather: "clear" },
};

export function initialWorld(): WorldState {
  return {
    time: "afternoon",
    location: "square",
    form: "person",
    posture: "neutral",
    faceHot: false,
    lanterns: "workshop",
    lanternsHung: 0,
    squareLight: 1,
    darkness: 0,
    faces: {},
    invitation: "none",
    heirloom: "whole",
    lens: "none",
    factsFound: [],
    pull: false,
    hasLight: false,
    level: 1,
    weather: "clear",
    panic: false,
    lanternsLost: 0,
    props: [],
    placed: {},
    ended: false,
  };
}

const RIPPLE: Record<Completeness, (w: WorldState) => Partial<WorldState>> = {
  full: () => ({ squareLight: 1, darkness: 0 }),
  partial: (w) => ({ squareLight: 0.75, darkness: Math.max(0, w.darkness - 1) }),
  // Other people hang the lanterns; the square lights, the lanes stay as they were.
  minimal: (w) => ({ squareLight: 0.6, darkness: w.darkness }),
};

const INVITES: readonly WorldState["invitation"][] = ["none", "missing", "pending", "received"];

export const WORLD_EVENTS = new Set([
  "afternoon",
  "carry",
  "pull",
  "get",
  "fact",
  "trip",
  "tear",
  "cue_heat",
  "cue_slump",
  "hide",
  "morning",
  "nightfall",
  "square_dark",
  "darkness_spreads",
  "return_distress",
  "lens",
  "go_back",
  "go_edge",
  "posture",
  "face",
  "hang",
  "ripple",
  "invitation",
  "mend",
  "end",
  "chapter",
  "sunset",
  "rest",
  "storm",
  "wave",
  "clear",
  "lose_lantern",
  "prop",
  "place",
  "go",
  "nightfall_snow",
]);

export function applyWorldEvent(w: WorldState, ev: GameEvent): WorldState {
  switch (ev.name) {
    case "afternoon":
      return { ...w, time: "afternoon" };
    case "carry":
      return { ...w, lanterns: "carried" };
    case "pull":
      return { ...w, pull: ev.arg === "on" };
    case "get":
      if (ev.arg !== "candle") throw new Error(`Unknown item: ${ev.arg}`);
      return { ...w, hasLight: true };
    case "fact":
      if (!isHotspotId(ev.arg ?? "")) throw new Error(`Unknown fact: ${ev.arg}`);
      return w.factsFound.includes(ev.arg as HotspotId) ? w : { ...w, factsFound: [...w.factsFound, ev.arg as HotspotId] };
    case "trip":
      return { ...w, lanterns: "scattered", faceHot: true, posture: "slumped", pull: false };
    case "tear":
      return { ...w, heirloom: "torn" };
    case "cue_heat":
      return { ...w, faceHot: true };
    case "cue_slump":
      return { ...w, posture: "slumped" };
    case "hide":
      return { ...w, form: "shell", location: "cave", faceHot: false, pull: false };
    case "nightfall":
      return { ...w, time: "night" };
    case "square_dark":
      return { ...w, lanterns: "heaped", squareLight: 0.1 };
    case "morning":
      return { ...w, time: "morning", form: "person", squareLight: 1 };
    case "darkness_spreads":
      return { ...w, darkness: Math.min(MAX_DARKNESS, w.darkness + 1) };
    case "return_distress":
      return { ...w, faceHot: true, posture: "slumped" };
    case "lens":
      return { ...w, lens: ev.arg === "shame" || ev.arg === "facts" ? ev.arg : "none" };
    case "go_back":
      return { ...w, location: "square", form: "person" };
    case "go_edge":
      return { ...w, location: "edge", form: "person" };
    case "posture":
      return { ...w, posture: ev.arg === "up" ? "upright" : "slumped", faceHot: ev.arg !== "up" };
    case "face": {
      // arg is "id:expression", e.g. "mara:sad"
      const [id, name] = (ev.arg ?? "").split(":");
      const expr = toExpression(name ?? "");
      if (!isCharacterId(id) || !expr) throw new Error(`Bad face: ${ev.arg}`);
      return { ...w, faces: { ...w.faces, [id]: expr } };
    }
    case "hang": {
      const n = Math.max(0, Math.min(LANTERN_COUNT, Number(ev.arg ?? LANTERN_COUNT)));
      return { ...w, lanterns: "hung", lanternsHung: n };
    }
    case "ripple": {
      const apply = RIPPLE[ev.arg as Completeness];
      if (!apply) throw new Error(`ripple needs full|partial|minimal, got ${ev.arg}`);
      return { ...w, time: "night", lens: "none", pull: false, ...apply(w) };
    }
    case "invitation":
      if (!INVITES.includes(ev.arg as WorldState["invitation"])) {
        throw new Error(`Unknown invitation state: ${ev.arg}`);
      }
      return { ...w, invitation: ev.arg as WorldState["invitation"] };
    case "mend":
      return { ...w, heirloom: "mended" };
    case "chapter": {
      const level = Number(ev.arg) as Level;
      if (!LEVELS.includes(level) || level === 1) throw new Error(`Unknown chapter: ${ev.arg}`);
      // Each chapter starts from a festival that went ahead, whatever happened before.
      // By chapter five it's winter, and the lanterns are back in the workshop.
      return {
        ...w,
        level,
        lens: "none",
        pull: false,
        form: "person",
        faceHot: false,
        posture: "neutral",
        lanterns: level >= 5 ? "workshop" : "hung",
        lanternsHung: w.lanternsHung || 12,
        hasLight: false,
        darkness: 0,
        panic: false,
        props: [],
        placed: {},
        faces: {},
        ...CHAPTER_START[level],
      };
    }
    case "prop": {
      // arg is "on:name" or "off:name"
      const [onOff, name] = (ev.arg ?? "").split(":");
      if ((onOff !== "on" && onOff !== "off") || !name) throw new Error(`prop needs on:name or off:name, got ${ev.arg}`);
      const others = w.props.filter((p) => p !== name);
      return { ...w, props: onOff === "on" ? [...others, name] : others };
    }
    case "place": {
      // arg is "id:x" or "id:off"
      const [id, where] = (ev.arg ?? "").split(":");
      if (!isCharacterId(id) || !where) throw new Error(`place needs id:x or id:off, got ${ev.arg}`);
      const x = where === "off" ? null : Number(where);
      if (x !== null && !Number.isFinite(x)) throw new Error(`Bad place: ${ev.arg}`);
      return { ...w, placed: { ...w.placed, [id]: x } };
    }
    case "go": {
      if (!LOCATIONS.includes(ev.arg as WorldState["location"])) throw new Error(`Unknown place to go: ${ev.arg}`);
      return { ...w, location: ev.arg as WorldState["location"], form: "person" };
    }
    case "sunset":
      return { ...w, time: "sunset" };
    case "rest":
      return { ...w, location: "cave", form: "person", faceHot: false, posture: "neutral" };
    case "storm":
      return { ...w, weather: ev.arg === "on" ? "storm" : "clear", panic: ev.arg === "on" ? w.panic : false };
    case "wave":
      return { ...w, panic: true, faceHot: true };
    case "clear":
      return { ...w, panic: false, faceHot: false };
    case "lose_lantern":
      return { ...w, lanternsLost: w.lanternsLost + 1 };
    case "end":
      return { ...w, ended: true };
    default:
      return w;
  }
}
