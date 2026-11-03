// Thin wrapper around the inkjs Story. Steps the story line by line, parses tags,
// and binds TS game logic as Ink external functions. No DOM here, so the same
// engine runs in the browser and in tests.

import { Story } from "inkjs";
import { outcome } from "./logic/outcome";
import { parseTags, type GameEvent, type SceneName } from "./logic/tags";
import type { Variant } from "./logic/facts";
import { isCharacterId, parseSpoken, type CharacterId, type SpokenLine } from "./logic/cast";

export interface StoryLine {
  text: string;
  /** Set when the line is dialogue; `text` is then the spoken words only. */
  spoken: SpokenLine | null;
  events: GameEvent[];
  scene: SceneName | null;
}

/** Where a choice lives in the world, from a tag inside its brackets. */
export type ChoiceTarget =
  | { kind: "talk"; id: CharacterId } // `#talk: mara`: walk up to Mara and talk
  | { kind: "go"; id: string } //        `#go: hollow`: walk into that place
  | { kind: "use"; id: string }; //      `#use: stone`: walk up to that thing and use it

export interface StoryChoice {
  index: number;
  text: string;
  target: ChoiceTarget | null;
  /** `#new`: someone you haven't talked to yet in this part of the story. */
  fresh: boolean;
  /** Where the choice is written in the story; stable across playthroughs. */
  source: string;
}

export function parseChoiceTarget(tags: readonly string[] | null | undefined): ChoiceTarget | null {
  for (const tag of tags ?? []) {
    const m = /^\s*(talk|go|use)\s*:\s*(\w+)\s*$/.exec(tag);
    if (!m) continue;
    const [, kind, id] = m;
    if (kind === "talk") {
      if (!isCharacterId(id)) throw new Error(`Unknown character in #talk: ${id}`);
      return { kind, id };
    }
    return { kind: kind as "go" | "use", id };
  }
  return null;
}

type InkValue = string | number | boolean;

export class Engine {
  private story: Story;

  /** `distress` reads the meter live; Ink never calls it while reading ahead. */
  constructor(json: string | object, variant: Variant, distress: () => number = () => 0) {
    this.story = new Story(typeof json === "string" ? json : JSON.stringify(json));
    this.story.BindExternalFunction(
      "outcome",
      (a: boolean, b: boolean, c: boolean) => outcome(Boolean(a), Boolean(b), Boolean(c)),
      true,
    );
    this.story.BindExternalFunction("distress", () => distress(), false);
    this.setVar("variant", variant);
  }

  /** The story's full position and variables, for a save point. */
  saveState(): string {
    return this.story.state.ToJson();
  }

  loadState(json: string): void {
    this.story.state.LoadJson(json);
  }

  /** Start somewhere other than the beginning, e.g. a chapter. */
  startAt(knot: string): void {
    this.story.ChoosePathString(knot);
  }

  /**
   * Lines up to the next choice point, or up to a line that opens a scene.
   * Lazy: each line is read only after the caller has handled the previous one,
   * so its events are applied before the story asks the game anything.
   */
  *lines(): Generator<StoryLine> {
    while (this.story.canContinue) {
      const raw = (this.story.Continue() ?? "").trim();
      const { events, scene } = parseTags(this.story.currentTags);
      const spoken = parseSpoken(raw);
      if (spoken?.expression) events.push({ name: "face", arg: `${spoken.speaker}:${spoken.expression}` });
      yield { text: spoken ? spoken.text : raw, spoken, events, scene };
      if (scene) return;
    }
  }

  /** All lines up to the next choice point at once (for callers that don't apply events). */
  continueBatch(): StoryLine[] {
    return [...this.lines()];
  }

  get choices(): StoryChoice[] {
    return this.story.currentChoices.map((c) => ({
      index: c.index,
      text: c.text,
      target: parseChoiceTarget(c.tags),
      fresh: (c.tags ?? []).some((t) => t.trim() === "new"),
      source: c.sourcePath,
    }));
  }

  choose(index: number): void {
    this.story.ChooseChoiceIndex(index);
  }

  /** Problems the story reported while running (Ink warnings and errors). */
  get problems(): string[] {
    return [...(this.story.currentErrors ?? []), ...(this.story.currentWarnings ?? [])];
  }

  get ended(): boolean {
    return !this.story.canContinue && this.story.currentChoices.length === 0;
  }

  getVar(name: string): InkValue {
    return this.story.variablesState[name] as InkValue;
  }

  setVar(name: string, value: InkValue): void {
    this.story.variablesState[name] = value;
  }
}
