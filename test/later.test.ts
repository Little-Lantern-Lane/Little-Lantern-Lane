// Chapters four to six: the new logic (saying no, the long night, the tide) and
// scripted runs through each chapter's main paths.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Compiler } from "inkjs/full";
import { Engine, type StoryLine } from "../src/engine";
import { applyEvent, initialState, type GameState } from "../src/logic/state";
import { judgeAsk, sayAsk } from "../src/logic/ask";
import { applyWorldEvent, initialWorld } from "../src/logic/world";
import { readSave, writeSave } from "../src/save";

const json = new Compiler(readFileSync("story/festival.ink", "utf8")).Compile().ToJson()!;

describe("saying no to a friend", () => {
  it("a clear, gentle no with an offer is clear, kind and steady", () => {
    expect(judgeAsk({ facts: "plain", feeling: "own", ask: "clear", why: "both", how: "gentle" })).toEqual({ answer: "clear", clear: true, kind: true, steady: true });
  });

  it("blame costs warmth and footing even when the answer is clear", () => {
    expect(judgeAsk({ facts: "blame", feeling: "own", ask: "clear", why: "skip", how: "gentle" })).toEqual({ answer: "clear", clear: true, kind: false, steady: false });
  });

  it("a bare no is heard as no, even said harshly; a maybe is heard as yes", () => {
    expect(judgeAsk({ facts: "blame", feeling: "blame", ask: "flat", why: "skip", how: "skip" })).toMatchObject({ answer: "flat", clear: false });
    expect(judgeAsk({ facts: "plain", feeling: "own", ask: "vague", why: "both", how: "gentle" })).toMatchObject({ answer: "vague", clear: false });
  });

  it("maybe isn't clear, and a string of sorries isn't steady", () => {
    expect(judgeAsk({ facts: "plain", feeling: "skip", ask: "vague", why: "skip", how: "sorry" })).toMatchObject({ clear: false, steady: false });
  });

  it("the preview reads as one thing said, leaving out skipped parts", () => {
    expect(sayAsk({ facts: "skip", feeling: "own", ask: "clear", why: "skip", how: "gentle" })).toBe(
      "I'm scared I'll run myself into the ground again, like before the storm. I can't do every morning. I can do Saturdays.",
    );
  });
});

describe("scenery that follows the story", () => {
  it("props switch on and off, and people can be moved or sent away", () => {
    let w = initialWorld();
    w = applyWorldEvent(w, { name: "prop", arg: "on:sign_up" });
    w = applyWorldEvent(w, { name: "place", arg: "iris:9460" });
    expect(w.props).toEqual(["sign_up"]);
    expect(w.placed.iris).toBe(9460);
    w = applyWorldEvent(w, { name: "prop", arg: "off:sign_up" });
    w = applyWorldEvent(w, { name: "place", arg: "pip:off" });
    expect(w.props).toEqual([]);
    expect(w.placed.pip).toBeNull();
  });

  it("each new chapter starts in its own place, with its own weather, and clears the last chapter's scenery", () => {
    let w = applyWorldEvent(initialWorld(), { name: "prop", arg: "on:quilt" });
    expect(applyWorldEvent(w, { name: "chapter", arg: "4" })).toMatchObject({ level: 4, location: "mill", time: "morning", props: [] });
    w = applyWorldEvent(w, { name: "chapter", arg: "5" });
    expect(w).toMatchObject({ level: 5, location: "lane", weather: "snow", lanterns: "workshop" });
    expect(applyWorldEvent(w, { name: "chapter", arg: "6" })).toMatchObject({ level: 6, location: "coast", weather: "clear" });
  });

  it("rejects props and places it can't show", () => {
    expect(() => applyWorldEvent(initialWorld(), { name: "prop", arg: "sign_up" })).toThrow();
    expect(() => applyWorldEvent(initialWorld(), { name: "place", arg: "nobody:100" })).toThrow();
    expect(() => applyWorldEvent(initialWorld(), { name: "go", arg: "moon" })).toThrow();
  });
});

describe("saves reach the later chapters", () => {
  it("keeps a save that leads into chapter six", () => {
    const data = new Map<string, string>();
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
    writeSave({ chapter: 6, variant: "main", story: "{}", game: initialState() }, store);
    expect(readSave(store)?.chapter).toBe(6);
  });
});

// --- Scripted runs ---------------------------------------------------------------

interface Answers {
  ask?: { answer?: string; clear: boolean; kind: boolean; steady: boolean };
  tide?: { saved: string[]; fought: number };
}

function play(start: string, picks: string[], answers: Answers = {}) {
  let state: GameState = initialState();
  const engine = new Engine(json, "main", () => state.meter.distress);
  engine.startAt(start);
  const lines: StoryLine[] = [];
  const scenes: string[] = [];
  const queue = [...picks];
  const meter: number[] = [];
  for (let guard = 0; guard < 600; guard++) {
    let last: StoryLine | undefined;
    for (const line of engine.lines()) {
      last = line;
      lines.push(line);
      for (const ev of line.events) state = applyEvent(state, ev);
      meter.push(state.meter.distress);
    }
    for (const p of engine.problems) throw new Error(`story problem: ${p}`);
    if (last?.scene) {
      scenes.push(last.scene);
      if (last.scene === "sayit") {
        const a = answers.ask ?? { clear: true, kind: true, steady: true };
        engine.setVar("ask_answer", a.answer ?? (a.clear ? "clear" : "vague"));
        engine.setVar("ask_clear", a.clear);
        engine.setVar("ask_kind", a.kind);
        engine.setVar("ask_steady", a.steady);
      }
      if (last.scene === "tide") {
        const t = answers.tide ?? { saved: ["notebooks", "red_mould"], fought: 0 };
        engine.setVar("saved_count", t.saved.length);
        engine.setVar("saved_red", t.saved.includes("red_mould"));
        engine.setVar("saved_notebooks", t.saved.includes("notebooks"));
        engine.setVar("fought", t.fought);
        for (let i = 0; i < t.fought; i++) state = applyEvent(state, { name: "fight" });
      }
      engine.choose(0);
      // Each chapter's run stops at its save point.
      if (last.scene === "save") break;
      continue;
    }
    if (engine.ended) break;
    const pick = queue.shift();
    if (pick === undefined) throw new Error(`Ran out of picks at: ${engine.choices.map((c) => c.text).join(" | ")}`);
    const choice = engine.choices.find((c) => c.text.toLowerCase().includes(pick.toLowerCase()));
    if (!choice) throw new Error(`No choice matching "${pick}" in: ${engine.choices.map((c) => c.text).join(" | ")}`);
    engine.choose(choice.index);
  }
  return { lines, scenes, state, engine, text: lines.map((l) => l.text).join("\n"), meter };
}

describe("chapter four: opening day", () => {
  const MORNING = ["talk to tobin", "wheel turning", "goodbye", "hang the sign", "about the sign"];
  const PARTY = ["talk to ash", "first day", "goodbye", "talk to iris", "tea room", "goodbye", "walk home"];

  it("a clear, kind no with an offer: Saturdays go up on the chalkboard", () => {
    const r = play("start_mill", [...MORNING, "I know you're scared", "what do you want her to know", ...PARTY]);
    expect(r.engine.getVar("saturdays")).toBe(true);
    expect(r.state.world.props).toEqual(expect.arrayContaining(["sign_up", "chalk_saturdays", "mill_lanterns", "busy_tables"]));
    expect(r.state.world.props).not.toContain("sign_down");
    expect(r.text).toMatch(/This isn't a phase/);
    expect(r.scenes).toEqual(["sayit", "save"]);
  });

  it("giving in costs you the afternoon at the sink, and you can still take it back", () => {
    const r = play("start_mill", [...MORNING, "okay. fine", "just tell her", "talk to ash", "too much after all", "goodbye", "walk home"]);
    expect(r.text).toMatch(/washing cups/);
    expect(r.engine.getVar("saturdays")).toBe(true);
    expect(r.state.world.props).toContain("chalk_saturdays");
    expect(r.state.world.props).not.toContain("chalk_open");
  });

  it("snapping leaves things stiff until you go back and say it gently", () => {
    const r = play("start_mill", [...MORNING, "I SAID no", "for you", "talk to ash", "sorry for snapping", "goodbye", "walk home"]);
    expect(r.engine.getVar("ash_mended")).toBe(true);
    expect(r.state.world.props).toContain("chalk_saturdays");
  });

  it("a bare no gets heard as just no, and you can still offer Saturdays", () => {
    const r = play("start_mill", [...MORNING, "not every morning", "I know you're scared", "what do you want her", "walk home"], {
      ask: { answer: "flat", clear: false, kind: false, steady: false },
    });
    expect(r.text).toMatch(/So that's a no\? Just\.\.\. no\?/);
    expect(r.text).not.toMatch(/So that's a yes/);
    expect(r.engine.getVar("saturdays")).toBe(true);
  });

  it("a maybe sounds like a yes until you say it plainly", () => {
    const r = play("start_mill", [...MORNING, "not every morning", "what are you scared", "that's a real fear", "what do you want her", "walk home"], {
      ask: { clear: false, kind: true, steady: false },
    });
    expect(r.text).toMatch(/So that's a yes\?/);
    expect(r.engine.getVar("saturdays")).toBe(true);
  });
});

describe("chapter five: the first snow", () => {
  it("a night of comfort and things to do: snowflakes on the window, kids asleep under Nell's quilt, Hettie home at dawn", () => {
    const r = play("start_snow", [
      "of course", "dig out", "take the kids inside",
      "talk to the kids", "what's wrong", "I don't know when", "goodbye",
      "snowflakes", "music box", "stove", "milk", "toast", "look out",
      "talk to hettie", "how the night went", "goodbye", "go back inside",
    ]);
    expect(r.state.world.props).toEqual(expect.arrayContaining(["snowflakes", "quilt", "toast", "plough"]));
    expect(r.state.world.props).not.toContain("nell_snow");
    expect(r.text).toMatch(/Nell's quilt/);
    expect(r.text).toMatch(/We made SNOWFLAKES/);
    expect(r.state.world.time).toBe("morning");
  });

  it("checking the road over and over keeps the worry high, without anyone saying so", () => {
    const calm = play("start_snow", ["of course", "take the kids inside", "snowflakes", "music box", "stove", "milk", "toast", "look out", "go back inside"]);
    const watching = play("start_snow", ["of course", "take the kids inside", "look out", "look out", "look out", "look out", "look out", "look out", "go back inside"]);
    const peak = (m: number[]) => Math.max(...m.slice(-40));
    expect(peak(watching.meter)).toBeGreaterThan(peak(calm.meter));
    expect(watching.text).toMatch(/I looked eleven times/);
    expect(watching.text).not.toMatch(/should|shouldn't|wrong|bad/i);
  });
});

describe("chapter six: the tide", () => {
  const ARRIVE = ["talk to hesketh", "what was in the shed", "goodbye", "go into the shed"];
  it("letting it be true: a new lantern from the saved red mould, hung on the harbour wall, and the story ends", () => {
    const r = play("start_coast", [...ARRIVE, "it's gone. that's awful", "talk to fen", "how he's doing", "goodbye", "hang the new lantern"]);
    expect(r.scenes).toEqual(["tide"]);
    expect(r.text).toMatch(/The red mould/);
    expect(r.state.world.props).toContain("harbour_lantern");
    expect(r.state.world.ended).toBe(true);
  });

  it("arguing that it shouldn't have happened keeps it hurting; it ends when you let it be true", () => {
    const r = play("start_coast", [...ARRIVE, "shouldn't have happened", "shouldn't have happened", "let your hands open", "hang the new lantern"], { tide: { saved: [], fought: 4 } });
    expect(r.text).toMatch(/Nothing came out of the shed/);
    expect(r.text).toMatch(/said "it shouldn't have" twice/);
    expect(r.text).toMatch(/without a mould/);
    expect(r.state.world.ended).toBe(true);
  });
});

describe("two-sided meters", () => {
  it("calm sits toward the easy end, the worst toward the painful end, and neither end is quite reached", async () => {
    const { meterMarks } = await import("../src/logic/meter");
    expect(meterMarks(10, 0).feeling).toBeGreaterThan(75);
    expect(meterMarks(100, 100)).toEqual({ feeling: 4, pull: 4 });
    expect(meterMarks(0, 0).pull).toBeLessThan(80);
    expect(meterMarks(50, 50).feeling).toBeGreaterThan(40);
    expect(meterMarks(50, 50).feeling).toBeLessThan(60);
  });
});
