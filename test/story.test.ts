// Plays the real Ink story through the engine: scripted paths for the key
// branches, plus random walks to check every branch ends, every tag is known,
// and every world choice points at a place, thing or person that exists.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Compiler } from "inkjs/full";
import { Engine, type StoryLine } from "../src/engine";
import { applyEvent, initialState, type GameState } from "../src/logic/state";
import type { Variant } from "../src/logic/facts";
import { USABLES, ZONES } from "../src/game/layout";

const json = new Compiler(readFileSync("story/festival.ink", "utf8")).Compile().ToJson()!;

interface SceneAnswers {
  fit: boolean;
  /** Check-in answer in chapter two: does the guilt about resting fit? */
  guiltFits?: boolean;
  /** Slow breaths taken each time the breathing scene runs. */
  breaths?: number;
  /** Chapter four: what the say-it scene decides. Defaults to clear, kind and steady. */
  ask?: { clear: boolean; kind: boolean; steady: boolean };
  /** Chapter six: what was carried out of the shed, and how often the player fought the tide. */
  tide?: { saved: string[]; fought: number };
  /** Results of each walk back, in order. Defaults to all the way, head up. */
  approaches?: { reached: boolean; headUp: boolean; turnedBack: boolean }[];
}

interface Run {
  lines: StoryLine[];
  state: GameState;
  engine: Engine;
  scenes: string[];
  choicesTaken: string[];
}

/** Mirror what the TS director does for each scene. Returns events the scene itself causes. */
function handleScene(engine: Engine, scene: string, answers: SceneAnswers): { name: string; arg?: string }[] {
  if (scene === "fit") engine.setVar("fit", answers.fit);
  if (scene === "checkin") engine.setVar("guilt_fits", answers.guiltFits ?? false);
  if (scene === "breathe") {
    const n = answers.breaths ?? 3;
    engine.setVar("breaths", n);
    return Array.from({ length: n }, () => ({ name: "calm", arg: "breath" }));
  }
  if (scene === "sayit") {
    const a = answers.ask ?? { clear: true, kind: true, steady: true };
    engine.setVar("ask_answer", a.clear ? "clear" : "vague");
    engine.setVar("ask_clear", a.clear);
    engine.setVar("ask_kind", a.kind);
    engine.setVar("ask_steady", a.steady);
  }
  if (scene === "tide") {
    const t = answers.tide ?? { saved: ["notebooks", "small_mould", "red_mould"], fought: 0 };
    engine.setVar("saved_count", t.saved.length);
    engine.setVar("saved_red", t.saved.includes("red_mould"));
    engine.setVar("saved_notebooks", t.saved.includes("notebooks"));
    engine.setVar("fought", t.fought);
    return Array.from({ length: t.fought }, () => ({ name: "fight" }));
  }
  if (scene === "approach") {
    const a = answers.approaches?.shift() ?? { reached: true, headUp: true, turnedBack: false };
    engine.setVar("reached", a.reached);
    engine.setVar("head_up", a.headUp);
    engine.setVar("turned_back", a.turnedBack);
  }
  return [];
}

/** The director keeps the story's `distress` in step with the meter. */
function applyAll(_engine: Engine, state: GameState, events: { name: string; arg?: string }[]): GameState {
  for (const ev of events) state = applyEvent(state, ev);
  return state;
}

/** Play the story, picking choices by matching text fragments in order. */
function play(variant: Variant, picks: string[], answers: SceneAnswers, from?: string): Run {
  const holder: { run?: Run } = {};
  const engine = new Engine(json, variant, () => holder.run!.state.meter.distress);
  if (from) engine.startAt(from);
  const run: Run = { lines: [], state: initialState(), engine, scenes: [], choicesTaken: [] };
  holder.run = run;
  const queue = [...picks];
  for (let guard = 0; guard < 500; guard++) {
    let last: StoryLine | undefined;
    for (const line of engine.lines()) {
      last = line;
      run.lines.push(line);
      run.state = applyAll(engine, run.state, line.events);
    }
    if (last?.scene) {
      run.scenes.push(last.scene);
      run.state = applyAll(engine, run.state, handleScene(engine, last.scene, answers));
      engine.choose(0);
      continue;
    }
    if (engine.ended) return run;
    // Runs that only script the first three chapters stop where chapter four begins.
    if (!queue.length && run.lines.some((l) => l.text === "Chapter four: Opening day.")) return run;
    const pick = queue.shift();
    if (pick === undefined) throw new Error(`Ran out of picks at: ${engine.choices.map((c) => c.text).join(" | ")}`);
    const choice = engine.choices.find((c) => c.text.toLowerCase().includes(pick.toLowerCase()));
    if (!choice) throw new Error(`No choice matching "${pick}" in: ${engine.choices.map((c) => c.text).join(" | ")}`);
    run.choicesTaken.push(choice.text);
    engine.choose(choice.index);
  }
  throw new Error("Story did not end");
}

function playFrom(knot: string, picks: string[], answers: SceneAnswers): Run {
  return play("main", picks, answers, knot);
}

// Player-facing text describes skills instead of naming them.
const DBT_TERMS = /opposite action|check(ing)? the facts|chain analysis|\bDBT\b|distress tolerance|emotion regulation|prompting event|vulnerabilit|\bTIPP\b|\bPLEASE skills?\b|wise mind|self-soothe|DEAR MAN|radical acceptance/i;

const text = (r: Run) => r.lines.map((l) => l.text).join("\n");

/** Chapter two: say no once, check in, tell Ash, rest. Chapter three: cold water, breathe, help Pip. */
const REST_WELL = ["talk to the bakers", "anything", "not today", "goodbye", "check in", "talk to ash", "taking the afternoon", "wiped out", "goodbye", "hollow"];
const STORM_CALM = ["cold water", "slow your breathing", "pip", "walk home"];

const FACTS_TRIO = ["talk to tobin", "what happened", "goodbye", "talk to the kids", "red lantern", "laughing at me", "goodbye", "cobblestones", "sit on the fountain"];

describe("story: stay, the feeling doesn't fit, all the way back", () => {
  const run = play(
    "main",
    ["talk to tobin", "knees", "that sounds rough", "goodbye", "pick up", "carry", "shame", "stay", ...FACTS_TRIO, "spectacular", "talk to tobin", "teased", "goodbye", "talk to mara", "about tonight", "okay", "goodbye", "walk home", ...REST_WELL, ...STORM_CALM],
    { fit: false },
  );

  it("runs every challenge through the first three chapters", () => {
    expect(run.scenes).toEqual(["fit", "approach", "hang", "chain", "save", "checkin", "save", "breathe", "secure", "save"]);
    expect(run.engine.getVar("next_chapter")).toBe(4);
  });

  it("the pull to hide lets go once you've chosen to stay", () => {
    expect(run.state.world.pull).toBe(false);
  });

  it("finds facts by exploring", () => {
    expect(run.state.world.factsFound).toEqual(["tobin", "kids", "stone"]);
    expect(run.engine.getVar("facts_seen")).toBe(3);
  });

  it("raises distress during the walk back before it falls", () => {
    const h = run.state.meter.history;
    const peak = Math.max(...h);
    expect(h.lastIndexOf(peak)).toBeLessThan(h.length - 1);
    expect(h[h.length - 1]).toBeLessThan(peak - 40);
  });

  it("lights the square and brings the invitation", () => {
    expect(run.engine.getVar("completeness")).toBe("full");
    expect(run.state.world).toMatchObject({ squareLight: 1, darkness: 0, lanternsHung: 12, invitation: "received" });
  });

  it("parses dialogue and gives speakers their expressions", () => {
    const tobin = run.lines.find((l) => l.spoken?.speaker === "tobin" && l.spoken.expression === "embarrassed");
    expect(tobin?.text).toMatch(/Loose cobblestone/);
  });
});

describe("story: hiding", () => {
  const run = play(
    "main",
    ["pick up", "carry", "anger", "look again", "shame", "hide", "rest", "stay quiet", "sleep", "go back to the hollow", "rest", "sleep", "talk to ash", "last night", "goodbye", "talk to nell", "came looking", "angry", "goodbye", "talk to the kids", "red lantern", "laughing at me", "goodbye", "talk to tobin", "what happened", "goodbye", "sit on the fountain", "nothing", "walk home", ...REST_WELL, ...STORM_CALM],
    { fit: false, approaches: [{ reached: false, headUp: false, turnedBack: false }] },
  );

  it("gives real relief right away", () => {
    const h = run.state.meter.history;
    const afterTrip = Math.max(...h.slice(0, 14));
    expect(Math.min(...h.slice(0, 20))).toBeLessThan(afterTrip - 40);
  });

  it("shows costs through the world, not text judgment", () => {
    const t = text(run);
    expect(t).toMatch(/Yours doesn't/);
    expect(t).toMatch(/must be angry with me/);
    expect(t).not.toMatch(/\b(bad|wrong|good job|should have|failed)\b/i);
  });

  it("Ash's candle opens the dark lane, where Nell has a fact", () => {
    expect(run.lines.some((l) => l.events.some((e) => e.name === "get" && e.arg === "candle"))).toBe(true);
    expect(run.state.world.factsFound).toContain("mara");
  });

  it("partial execution gives a partial result", () => {
    expect(run.engine.getVar("hide_count")).toBe(2);
    expect(run.engine.getVar("completeness")).toBe("minimal");
    expect(run.scenes).not.toContain("hang");
    expect(run.state.world.squareLight).toBeLessThan(1);
  });
});

describe("story: borrowed lantern, the feeling fits, making it right", () => {
  const run = play("promise", ["pick up", "carry", "guilt", "stay", ...FACTS_TRIO, "i stacked", "fix it together", "let it be done", "talk to mara", "about tonight", "nod", "goodbye", "walk home", ...REST_WELL, ...STORM_CALM], { fit: true });

  it("mends the heirloom and recovers fully", () => {
    expect(run.scenes).toEqual(["fit", "approach", "mend", "hang", "chain", "save", "checkin", "save", "breathe", "secure", "save"]);
    expect(run.engine.getVar("path")).toBe("repair");
    expect(run.engine.getVar("completeness")).toBe("full");
    expect(run.state.world).toMatchObject({ heirloom: "mended", lanternsHung: 12, squareLight: 1 });
  });
});

describe("story: turning back on the walk can still recover", () => {
  const run = play(
    "main",
    ["pick up", "carry", "not sure", "stay", ...FACTS_TRIO, "rest", "here", "sleep", "sit on the fountain", "spectacular", "walk home", ...REST_WELL, ...STORM_CALM],
    { fit: false, approaches: [{ reached: false, headUp: false, turnedBack: true }] },
  );

  it("hides, comes back, and ends fully recovered", () => {
    expect(run.engine.getVar("bailed")).toBe(true);
    expect(run.scenes.filter((s) => s === "approach")).toHaveLength(2);
    expect(run.state.world.squareLight).toBe(1);
  });
});

describe("story: structure", () => {
  it("the afternoon offers people to talk to and the workshop", () => {
    const engine = new Engine(json, "main");
    engine.continueBatch();
    const targets = engine.choices.map((c) => c.target);
    expect(targets).toContainEqual({ kind: "use", id: "lantern_table" });
    expect(targets.filter((t) => t?.kind === "talk").map((t) => t!.id)).toEqual(["nell", "ash", "wren", "tobin", "mara", "pip"]);
    expect(engine.choices.filter((c) => c.target?.kind === "talk").every((c) => c.fresh)).toBe(true);
  });

  it("someone you've already talked to stops showing as new, but you can talk again", () => {
    const engine = new Engine(json, "main");
    engine.continueBatch();
    engine.choose(engine.choices.find((c) => c.text === "Talk to Nell")!.index);
    engine.continueBatch();
    engine.choose(engine.choices.find((c) => /goodbye/i.test(c.text))!.index);
    engine.continueBatch();
    const nell = engine.choices.find((c) => c.text === "Talk to Nell")!;
    expect(nell.fresh).toBe(false);
    engine.choose(nell.index);
    const again = engine.continueBatch().map((l) => l.text);
    expect(again).toContain("Back again? I'm not going anywhere.");
  });
});

describe("story: random walks", () => {
  // Seeded so failures reproduce.
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

  it("every path ends, every tag is known, every world choice exists, no DBT terms reach the player", () => {
    for (let i = 0; i < 300; i++) {
      const variant: Variant = i % 2 ? "main" : "promise";
      let state = initialState();
      const engine = new Engine(json, variant, () => state.meter.distress);
      let steps = 0;
      while (!engine.ended) {
        if (++steps > 3000) throw new Error("walk did not end");
        let last: StoryLine | undefined;
        for (const line of engine.lines()) {
          last = line;
          if (/^[a-z]+(\/[a-z]+)?: /.test(line.text)) throw new Error(`Unparsed dialogue: ${line.text}`);
          expect(line.text).not.toMatch(DBT_TERMS);
          state = applyAll(engine, state, line.events);
        }
        if (last?.scene) {
          const extra = handleScene(engine, last.scene, {
            fit: rand() < 0.5,
            guiltFits: rand() < 0.3,
            breaths: Math.floor(rand() * 4),
            approaches: [{ reached: rand() < 0.7, headUp: rand() < 0.6, turnedBack: rand() < 0.15 }],
          });
          state = applyAll(engine, state, extra);
          engine.choose(0);
          continue;
        }
        if (engine.ended) break;
        const choices = engine.choices;
        for (const c of choices) {
          expect(c.text).not.toMatch(DBT_TERMS);
          if (c.target?.kind === "go") expect(ZONES).toHaveProperty(c.target.id);
          if (c.target?.kind === "use") expect(USABLES).toHaveProperty(c.target.id);
        }
        // Lean away from hiding and from chatting, so walks finish in a sensible number of steps.
        const onward = choices.filter((c) => !/hollow|hide/i.test(c.text) && c.target?.kind !== "talk");
        const pool = rand() < 0.8 && onward.length ? onward : choices;
        engine.choose(pool[Math.floor(rand() * pool.length)].index);
      }
      expect(state.world.ended).toBe(true);
      expect(["full", "partial", "minimal"]).toContain(engine.getVar("completeness"));
    }
  }, 60_000);
});

describe("chapter two: resting on purpose", () => {
  const rested = playFrom("start_day_two", ["talk to mara", "anything", "on it", "goodbye", "take down the bunting", "check in", "talk to mara", "taking the afternoon", "need to rest", "holding up", "maybe you could", "goodbye", "hollow", ...STORM_CALM], { fit: false, guiltFits: false });

  it("an errand wears you down, and telling someone before resting keeps the village easy", () => {
    expect(rested.engine.getVar("tasks_done")).toBe(1);
    expect(rested.engine.getVar("told")).toBe(true);
    expect(rested.engine.getVar("rest_kind")).toBe("full");
    expect(text(rested)).not.toMatch(/I looked everywhere/);
  });

  const pushed = playFrom("start_day_two", ["talk to the bakers", "anything", "sure", "goodbye", "carry the bread", "talk to mara", "anything", "on it", "goodbye", "take down the bunting", "talk to tobin", "anything", "okay", "goodbye", "sort the broken", "let ash take over", ...STORM_CALM], { fit: false });

  it("pushing through every errand ends with the body deciding, and a bigger wave later", () => {
    expect(pushed.engine.getVar("rest_kind")).toBe("partial");
    expect(text(pushed)).toMatch(/When did you last sleep/);
    const restedPeak = Math.max(...rested.state.meter.history.slice(-25));
    const pushedPeak = Math.max(...pushed.state.meter.history.slice(-25));
    expect(pushedPeak).toBeGreaterThan(restedPeak);
  });
});

describe("chapter three: bringing the body down first", () => {
  const run = playFrom("start_storm", ["grab at the lanterns", "cold water", "slow your breathing", "run straight", "walk home"], { fit: false, breaths: 2 });

  it("can't make a plan until distress comes down, and panicking costs a lantern", () => {
    expect(run.engine.getVar("lost")).toBe(true);
    expect(run.state.world.lanternsLost).toBe(1);
    expect(run.scenes).toEqual(["breathe", "secure", "save"]);
    expect(run.state.world).toMatchObject({ weather: "clear", panic: false });
  });

  it("cold water brings distress down faster than one slow breath", () => {
    const t = text(run);
    expect(t).toMatch(/heartbeat drops a notch/);
  });
});

describe("save points", () => {
  it("each chapter boundary is a save point that names the chapter it leads into", () => {
    const run = playFrom("start_day_two", [...REST_WELL, ...STORM_CALM], { fit: false, guiltFits: false });
    expect(run.scenes.filter((s) => s === "save")).toHaveLength(2);
    expect(run.engine.getVar("next_chapter")).toBe(4);
  });

  it("a saved story resumes at the start of the next chapter and plays to the end", () => {
    // Play chapter two up to its save point, the way the director does.
    let state = initialState();
    const first = new Engine(json, "main", () => state.meter.distress);
    first.startAt("start_day_two");
    const picks = [...REST_WELL];
    for (let guard = 0; guard < 200; guard++) {
      let last: StoryLine | undefined;
      for (const line of first.lines()) {
        last = line;
        for (const ev of line.events) state = applyEvent(state, ev);
      }
      if (last?.scene === "save") break;
      if (last?.scene) {
        handleScene(first, last.scene, { fit: false, guiltFits: false });
        first.choose(0);
        continue;
      }
      const pick = picks.shift()!;
      first.choose(first.choices.find((c) => c.text.toLowerCase().includes(pick))!.index);
    }
    first.choose(0);
    const saved = JSON.stringify({ story: first.saveState(), game: state });

    // A fresh page load: new engine, restored state.
    const restored = JSON.parse(saved) as { story: string; game: GameState };
    let resumedState = restored.game;
    const resumed = new Engine(json, "main", () => resumedState.meter.distress);
    resumed.loadState(restored.story);
    const lines = [...resumed.lines()];
    for (const l of lines) for (const ev of l.events) resumedState = applyEvent(resumedState, ev);
    expect(lines[0].text).toBe("Chapter three: The storm.");
    expect(resumed.getVar("rested")).toBe(true);
    expect(resumedState.world.level).toBe(3);
  });
});

describe("conversations remember", () => {
  const run = play(
    "main",
    ["talk to tobin", "knees", "that sounds rough", "goodbye", "talk to nell", "how many festivals", "not me", "goodbye", "pick up", "carry", "shame", "stay", ...FACTS_TRIO, "spectacular",
     "talk to tobin", "teased", "goodbye", "talk to nell", "remind her", "goodbye", "walk home", ...REST_WELL, ...STORM_CALM],
    { fit: false },
  );
  const t = text(run);

  it("Tobin remembers you were kind about his fall", () => {
    expect(t).toMatch(/only one who said it sounded rough/);
  });

  it("Nell remembers what you told her", () => {
    expect(t).toMatch(/"Not me, not today\." I remember/);
  });
});

describe("long chains", () => {
  it("Tobin remembers the stone from the festival after the storm", () => {
    const run = play(
      "main",
      ["pick up", "carry", "shame", "stay", ...FACTS_TRIO, "spectacular", "talk to tobin", "talk about the stone", "somebody should fix", "goodbye", "walk home",
       ...REST_WELL, "cold water", "slow your breathing", "pip", "talk to tobin", "ask about the stone", "goodbye", "walk home"],
      { fit: false },
    );
    expect(text(run)).toMatch(/Fixed it this morning/);
  });

  // Hear about Nell's door and how the festival started, open Rosa's box with Mara after
  // the storm, then tell Nell what was in it.
  const rosaChain = (nellReply: string) =>
    play(
      "main",
      ["talk to nell", "yellow front door", "listen", "goodbye", "talk to mara", "how the festival started", "goodbye", "pick up", "carry", "shame", "stay", ...FACTS_TRIO, "spectacular", "walk home",
       ...REST_WELL, "cold water", "slow your breathing", "pip", "talk to mara", "what she kept", "open it together", "goodbye", "talk to nell", "rosa's notes", nellReply, "goodbye", "walk home"],
      { fit: false },
    );

  it("Rosa's notes tell Mara who the first lantern was for, and Nell hears it", () => {
    for (const reply of ["sit with her", "didn't want you to have to thank her"]) {
      const run = rosaChain(reply);
      const t = text(run);
      expect(t).toMatch(/The first one was for Nell/);
      expect(t).toMatch(/It was never the mill/);
      expect(run.engine.getVar("told_nell")).toBe(true);
    }
  });

  it("Wren finds out about Oda's early starts, and Tobin answers Hesketh", () => {
    const run = play(
      "main",
      ["pick up", "carry", "shame", "stay", ...FACTS_TRIO, "spectacular", "talk to tobin", "hesketh wrote", "what's stopping you", "goodbye", "walk home",
       "talk to the bakers", "oda if she slept", "goodbye", ...REST_WELL, ...STORM_CALM.slice(0, 3),
       "talk to the bakers", "early starts", "goodbye", "talk to tobin", "written back", "goodbye", "walk home"],
      { fit: false },
    );
    const t = text(run);
    expect(t).toMatch(/getting up at three/);
    expect(t).toMatch(/I said yes/);
  });
});
