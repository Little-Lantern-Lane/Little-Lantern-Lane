import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cleanName, DEFAULT_CHARACTER, normalizeCharacter } from "../src/logic/appearance";
import { gather, give, initialBag, ITEMS, makeLantern, makeTool, RECIPES, sell, swapShelf, toTable, type BagState, type ItemId } from "../src/logic/bag";
import { GUIDE_NOTE, guideSteps, nextStep, type GuideFacts } from "../src/logic/guide";

const facts = (bag: BagState, more: Partial<GuideFacts> = {}): GuideFacts => ({ bag, mode: "village", touch: false, furnished: false, ...more });
const collect = (b: BagState, ...ids: ItemId[]) => ids.reduce(gather, b);

describe("the guide", () => {
  it("says what the game isn't and where to turn, without naming the therapy", () => {
    expect(GUIDE_NOTE).toContain("988");
    expect(GUIDE_NOTE).toContain("isn't therapy");
    expect(GUIDE_NOTE).not.toMatch(/DBT|dialectical/i);
    expect(readFileSync("src/ui/guide.ts", "utf8")).toContain("GUIDE_NOTE");
  });

  it("starts with picking something up, and moves on as you do things", () => {
    let b = initialBag();
    expect(nextStep(facts(b))?.id).toBe("gather");
    b = collect(b, "driftwood");
    expect(nextStep(facts(b))?.id).toBe("rod");
    expect(nextStep(facts(b))?.short).toContain("driftwood 1 of 2");
    b = collect(b, "driftwood", "birch_bark");
    expect(nextStep(facts(b))?.short).toContain("choose Make");
    b = makeTool(b, "rod");
    expect(nextStep(facts(b))?.id).toBe("fish");
  });

  it("ticks each thing off from what you've actually done", () => {
    let b = collect(initialBag(), "apple", "quartz", "perch", "driftwood", "driftwood", "birch_bark", "blackberry");
    const done = (bag: BagState, id: string) => guideSteps(facts(bag)).find((s) => s.id === id)!.done;
    expect(done(b, "sell")).toBe(false);
    b = sell(b, "perch");
    expect(done(b, "sell")).toBe(true);
    expect(done(b, "give")).toBe(false);
    b = give(b, "pip", "blackberry");
    expect(done(b, "give")).toBe(true);
    b = toTable(b, "apple");
    expect(done(b, "table")).toBe(true);
    b = swapShelf(b, "quartz", "shell");
    expect(done(b, "swap")).toBe(true);
    b = makeLantern({ ...b, coins: 25 }, { colour: "#e9583c", shape: "round" });
    expect(done(b, "lantern")).toBe(true);
  });

  it("only suggests what you can do where you are", () => {
    const all = { ...initialBag(), gathered: 1, tools: ["rod", "hammer"] as BagState["tools"], found: ["perch", "quartz", "jam"] as ItemId[], tried: ["sell", "buy"] as BagState["tried"] };
    expect(nextStep(facts(all, { mode: "chapter" }))).toBeNull();
    expect(nextStep(facts(all, { mode: "week" }))?.id).toBe("give");
    expect(nextStep(facts(all))?.id).toBe("give");
  });

  it("says tap on a phone and press E on a keyboard", () => {
    const text = (touch: boolean) => guideSteps(facts(initialBag(), { touch })).map((s) => s.how + s.short).join(" ");
    expect(text(true)).not.toContain("press E");
    expect(text(false)).not.toContain("tap the button");
  });

  it("has recipes that match what it says", () => {
    const jam = RECIPES.find((r) => r.makes === "jam")!;
    expect(jam.needs).toEqual({ apple: 1, blackberry: 2 });
    expect(ITEMS.jam.price).toBeGreaterThan(ITEMS.apple.price + 2 * ITEMS.blackberry.price);
  });

  it("uses plain words: no scores, no judging, no skill names", () => {
    const text = guideSteps(facts(initialBag())).map((s) => `${s.title} ${s.how} ${s.short}`).join(" ");
    expect(text).not.toMatch(/\b(wise mind|opposite action|distress tolerance|mindfulness|dbt|score|points|good job|well done|should)\b/i);
  });
});

describe("your name", () => {
  it("tidies what you type", () => {
    expect(cleanName("  Sam   Lee ")).toBe("Sam Lee");
    expect(cleanName("<b>{x}#</b>")).toBe("bx/b");
    expect(cleanName("A".repeat(40))).toHaveLength(16);
    expect(cleanName(7)).toBe("");
  });

  it("keeps a saved name, and older saves simply have none yet", () => {
    expect(normalizeCharacter({ ...DEFAULT_CHARACTER, name: "Noor" }).name).toBe("Noor");
    expect(normalizeCharacter({ body: "boy" }).name).toBe("");
  });

  it("is used by people in the story", () => {
    const uses = readFileSync("story/festival.ink", "utf8").match(/\{player_name\}/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(15);
  });
});
