// Plays the whole game (all three chapters, both stories) thousands of times,
// steering toward choices it hasn't taken yet, until every choice in the story
// has been taken. At every step it checks the things a player would trip over:
// story errors, broken text, people you're sent to talk to who aren't there,
// places and things that don't exist or can't be reached, and dead ends.

import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { Compiler } from "inkjs/full";
import { Engine, type StoryChoice, type StoryLine } from "../src/engine";
import { applyEvent, initialState, type GameState } from "../src/logic/state";
import { talkGroup, type CharacterId } from "../src/logic/cast";
import type { Variant } from "../src/logic/facts";
import { areaAt, laneBlocked, NPC_SPOTS, phaseOf, USABLES, ZONES } from "../src/game/layout";

const source = readFileSync("story/festival.ink", "utf8");
const compiler = new Compiler(source);
const json = compiler.Compile().ToJson()!;

// Player-facing text describes skills instead of naming them.
const DBT_TERMS = /opposite action|check(ing)? the facts|chain analysis|\bDBT\b|distress tolerance|emotion regulation|prompting event|vulnerabilit|\bTIPP\b|wise mind|self-soothe|DEAR MAN|radical acceptance/i;

interface Problem {
  where: string;
  what: string;
}

/** Seeded randomness so a failure can be replayed. */
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

type Taken = Map<string, string>; // choice source -> its text

/** Where in the world a choice points, and whether it can be reached right now. */
function checkTarget(c: StoryChoice, all: StoryChoice[], state: GameState, where: string, problems: Problem[]) {
  const t = c.target;
  if (!t) return;
  const w = state.world;
  // Where everyone usually stands now, with anyone the story has moved (or sent away) applied.
  const spots: Partial<Record<CharacterId, number>> = { ...NPC_SPOTS[phaseOf(w, false)] };
  for (const [id, x] of Object.entries(w.placed)) {
    if (x === null) delete spots[id as CharacterId];
    else spots[id as CharacterId] = x;
  }
  const blocked = (x: number) => laneBlocked(w) && areaAt(x).id === "lane";
  if (t.kind === "talk") {
    const ids = [t.id, ...talkGroup(t.id)].filter((id): id is Exclude<CharacterId, "you"> => id !== "you");
    const present = ids.filter((id) => spots[id as CharacterId] !== undefined);
    if (!present.length) problems.push({ where, what: `"${c.text}" asks you to talk to ${t.id}, who isn't anywhere in the village right now` });
    // Ash hands out the candle, so a dark lane is fine while you can still talk to Ash.
    else if (present.every((id) => blocked(spots[id as CharacterId]!)) && !w.hasLight && !all.some((o) => o.target?.kind === "talk" && o.target.id === "ash"))
      problems.push({ where, what: `"${c.text}": ${t.id} is in the dark lane, but you have no light yet and nothing else to do might give you one` });
  } else if (t.kind === "use") {
    const u = USABLES[t.id];
    if (!u) problems.push({ where, what: `"${c.text}" uses "${t.id}", which isn't in the village` });
    else if (blocked(u.x)) problems.push({ where, what: `"${c.text}" is in the dark lane` });
  } else {
    const z = ZONES[t.id];
    if (!z) problems.push({ where, what: `"${c.text}" goes to "${t.id}", which isn't in the village` });
    else if (blocked((z.x0 + z.x1) / 2) && !w.hasLight) problems.push({ where, what: `"${c.text}" needs you to walk into the dark lane with no light` });
  }
}

/** Things villagers remember from earlier chapters. */
const MEMORIES = ["nell_not_me", "nell_door", "ash_shop", "tobin_fall", "tobin_shared", "mara_grandma", "mara_rests", "wren_back", "juno_counting", "carried_bread", "helped_pip", "mended", "rosa_notes", "told_nell", "oda_early", "tobin_offer"];

interface WalkResult {
  steps: number;
  endedAs: string;
}

function walk(variant: Variant, start: string | null, seed: number, taken: Taken, offered: Taken, sceneOutcomes: Set<string>, problems: Problem[]): WalkResult {
  const rand = rng(seed);
  let state = initialState();
  const engine = new Engine(json, variant, () => state.meter.distress);
  if (start) {
    engine.startAt(start);
    // Jumping into a later chapter: give it a random history of what the player did and heard before.
    for (const v of MEMORIES) engine.setVar(v, rand() < 0.5);
  }
  let steps = 0;
  let lastLines: string[] = [];
  const where = () => `${variant}/${start ?? "start"} seed ${seed}, step ${steps}: …${lastLines.slice(-2).join(" / ")}`;

  while (!engine.ended) {
    if (++steps > 10000) {
      problems.push({ where: where(), what: "the walk never ended (possible loop with no way out)" });
      break;
    }
    let last: StoryLine | undefined;
    for (const line of engine.lines()) {
      last = line;
      for (const ev of line.events) {
        try {
          state = applyEvent(state, ev);
        } catch (e) {
          problems.push({ where: where(), what: `bad event ${JSON.stringify(ev)}: ${(e as Error).message}` });
        }
      }
      const t = line.text;
      if (t) lastLines.push(t);
      if (/undefined|NaN|\{|\}|\[object/.test(t)) problems.push({ where: where(), what: `broken text: "${t}"` });
      if (DBT_TERMS.test(t)) problems.push({ where: where(), what: `DBT term reaches the player: "${t}"` });
      if (/^[a-z]+(\/[a-z]+)?: /.test(t)) problems.push({ where: where(), what: `dialogue line not parsed: "${t}"` });
      if (/  |\s[,.!?]/.test(t)) problems.push({ where: where(), what: `spacing glitch: "${t}"` });
      if (line.spoken && !line.text.trim()) problems.push({ where: where(), what: `${line.spoken.speaker} says nothing` });
    }
    for (const p of engine.problems) problems.push({ where: where(), what: `story warning: ${p}` });
    if (lastLines.length > 6) lastLines = lastLines.slice(-6);

    if (last?.scene) {
      const s = last.scene;
      let outcome = "";
      if (s === "fit") engine.setVar("fit", (outcome = rand() < 0.5 ? "fits" : "doesn't") === "fits");
      if (s === "checkin") engine.setVar("guilt_fits", (outcome = rand() < 0.35 ? "fits" : "doesn't") === "fits");
      if (s === "approach") {
        const kinds = ["reached, head up", "reached, head down", "stayed at the edge", "turned back"];
        outcome = kinds[Math.floor(rand() * kinds.length)];
        engine.setVar("reached", outcome.startsWith("reached"));
        engine.setVar("head_up", outcome === "reached, head up");
        engine.setVar("turned_back", outcome === "turned back");
      }
      if (s === "sayit") {
        const [clear, kind, steady] = [rand() < 0.6, rand() < 0.6, rand() < 0.6];
        outcome = `${clear ? "clear" : "unclear"}, ${kind ? "kind" : "not kind"}`;
        engine.setVar("ask_answer", clear ? "clear" : rand() < 0.5 ? "vague" : "flat");
        engine.setVar("ask_clear", clear);
        engine.setVar("ask_kind", kind);
        engine.setVar("ask_steady", steady);
      }
      if (s === "tide") {
        const ids = ["notebooks", "small_mould", "tools", "photo", "red_mould"].filter(() => rand() < 0.5);
        const fought = Math.floor(rand() * 5);
        outcome = ids.length === 0 ? "saved nothing" : ids.length === 5 ? "saved everything" : "saved some";
        engine.setVar("saved_count", ids.length);
        engine.setVar("saved_red", ids.includes("red_mould"));
        engine.setVar("saved_notebooks", ids.includes("notebooks"));
        engine.setVar("fought", fought);
        for (let i = 0; i < fought; i++) state = applyEvent(state, { name: "fight" });
      }
      if (s === "breathe") {
        const n = Math.floor(rand() * 5);
        outcome = `${n} breaths`;
        engine.setVar("breaths", n);
        for (let i = 0; i < n; i++) state = applyEvent(state, { name: "calm", arg: "breath" });
      }
      sceneOutcomes.add(`${s}: ${outcome || "done"}`);
      const choices = engine.choices;
      if (choices.length !== 1) problems.push({ where: where(), what: `scene "${s}" should be followed by exactly one placeholder choice, found ${choices.length}` });
      engine.choose(0);
      continue;
    }
    if (engine.ended) break;

    const choices = engine.choices;
    if (!choices.length) {
      problems.push({ where: where(), what: "no choices and the story hasn't ended" });
      break;
    }
    for (const c of choices) {
      offered.set(c.source, c.text);
      if (!c.text.trim() || c.text === "·") problems.push({ where: where(), what: `a choice with no text outside a scene` });
      if (DBT_TERMS.test(c.text)) problems.push({ where: where(), what: `DBT term in a choice: "${c.text}"` });
      checkTarget(c, choices, state, where(), problems);
    }

    // Prefer what hasn't been tried; otherwise lean toward moving on so walks finish.
    const fresh = choices.filter((c) => !taken.has(c.source));
    let pick: StoryChoice;
    if (fresh.length && rand() < 0.95) pick = fresh[Math.floor(rand() * fresh.length)];
    else {
      const onward = choices.filter((c) => c.target?.kind !== "talk");
      const pool = rand() < 0.75 && onward.length ? onward : choices;
      pick = pool[Math.floor(rand() * pool.length)];
    }
    taken.set(pick.source, pick.text);
    engine.choose(pick.index);
  }
  if (engine.ended && !state.world.ended) problems.push({ where: where(), what: "the story ended without the ending event" });
  return { steps, endedAs: String(engine.getVar("completeness")) };
}

/** Every choice written in the story source, as its visible text (with `{...}` left as is). */
function choicesInSource(): string[] {
  const out: string[] = [];
  for (const line of source.split("\n")) {
    const m = /^\s*[+*]+\s*(?:\{[^}]*\}\s*)*\[(.*?)(?:\s*#[^\]]*)?\]/.exec(line);
    if (m) out.push(m[1].trim());
  }
  return out;
}

// Slow (a few minutes): run with `npm run explore`. Skipped in the everyday `npm test`.
// A few choices sit at the end of long chains the explorer rarely completes; story.test.ts
// plays them on purpose: "Let Ash take over" (all three errands), "Ask about the stone"
// (asked at the festival, then after the storm), and telling Nell what was in Rosa's notes
// (her door story, then how the festival started, then Rosa's box after the storm).
const PLAYED_BY_STORY_TESTS = ["Let Ash take over", "Ask about the stone", "Tell her what was in Rosa's notes", "Sit with her", "\"She didn't want you to have to thank her.\""];

describe.skipIf(!process.env.EXPLORE)("exploring every choice", () => {
  const taken: Taken = new Map();
  const offered: Taken = new Map();
  const scenes = new Set<string>();
  const problems: Problem[] = [];
  const endings = new Set<string>();
  let walks = 0;

  const starts: [Variant, string | null][] = [
    ["main", null], ["promise", null], ["main", "start_day_two"], ["main", "start_storm"],
    ["main", "start_mill"], ["main", "start_snow"], ["main", "start_coast"], ["main", "start_mill"],
  ];
  beforeAll(() => {
    let quiet = 0;
    // Keep walking until nothing new has been tried for a good while.
    for (let seed = 1; seed < 20000 && quiet < 1500; seed++) {
      const before = taken.size;
      const [variant, start] = starts[seed % starts.length];
      const r = walk(variant, start, seed, taken, offered, scenes, problems);
      endings.add(`${variant}: ${r.endedAs}`);
      walks++;
      quiet = taken.size > before ? 0 : quiet + 1;
      if (new Set(problems.map((p) => p.what)).size > 40) break;
    }
  }, 900_000);

  it("finds no problems on any path", () => {
    const unique = [...new Map(problems.map((p) => [p.what, p])).values()];
    expect(unique.map((p) => `${p.what}\n    at ${p.where}`)).toEqual([]);
  });

  it("takes every choice the story offers", () => {
    const never = [...offered].filter(([src]) => !taken.has(src)).map(([, text]) => text);
    expect(never).toEqual([]);
  });

  it("every choice written in the story can be reached", () => {
    const reachedTexts = new Set([...offered.values()]);
    const unreached = choicesInSource().filter((text) => {
      if (text === "·" || PLAYED_BY_STORY_TESTS.includes(text)) return false;
      // Choices with a {label} in them show the player's own words.
      if (text.includes("{")) return ![...reachedTexts].some((t) => t.startsWith(text.split("{")[0]));
      return !reachedTexts.has(text);
    });
    expect(unreached).toEqual([]);
  });

  it("tries every challenge outcome and reaches every kind of ending", () => {
    for (const s of ["fit: fits", "fit: doesn't", "checkin: fits", "checkin: doesn't", "approach: reached, head up", "approach: reached, head down", "approach: stayed at the edge", "approach: turned back", "breathe: 0 breaths", "breathe: 4 breaths", "hang: done", "mend: done", "secure: done", "chain: done", "save: done",
      "sayit: clear, kind", "sayit: unclear, not kind", "tide: saved nothing", "tide: saved some"]) {
      expect(scenes).toContain(s);
    }
    for (const e of ["main: full", "main: partial", "main: minimal", "promise: full", "promise: partial", "promise: minimal"]) expect(endings).toContain(e);
    console.log(`explored ${walks} playthroughs, took ${taken.size} distinct choices`);
  });
}, 300_000);
