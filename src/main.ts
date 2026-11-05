// Director: runs the Ink story, feeds its events into the game logic, and hands
// the resulting state to the walkable world and the overlays. When the story
// offers choices that live in the world (people, places, things), the player
// walks to them; plain choices appear in the dialogue box.

import { Engine, type StoryChoice, type StoryLine } from "./engine";
import { applyEvent, initialState, type GameState } from "./logic/state";
import type { HotspotId, Variant } from "./logic/facts";
import type { ChainRecord } from "./logic/chain";
import type { Completeness } from "./logic/outcome";
import type { GameEvent } from "./logic/tags";
import { createSound, type Sfx } from "./audio/sound";
import { World3D, type SceneHooks } from "./world3d/World";
import { FISHING_SPOTS, GROUND_Y, NEXT_GIVER, NODES, riverMidX } from "./game/layout";
import { createDialogueBox } from "./ui/dialogue";
import { createHud } from "./ui/hud";
import { createMeterView } from "./ui/meter";
import { factCard, runBreathScene, runChainScene, runCheckInScene, runFitScene, runMendScene, runSaveScene, runSayItScene } from "./ui/scenes";
import { CHAPTER_NAMES, clearSave, readBag, readLooks, readSave, writeBag, writeLooks, writeSave, type Looks, type SaveChapter, type SaveGame } from "./save";
import { buildAddition, DEFAULT_CHARACTER, DEFAULT_HOME, growRoom, hasAddition, remainingAdditions, type Decor } from "./logic/appearance";
import { addPiece, canPlace, FURNITURE, place, putAway, turnPiece, type Furnishings, type FurnitureId } from "./logic/furniture";
import { makeLantern, swapShelf, toTable, buyItem, canAfford, canGift, countOf, craft, gather, give, ITEMS, makeTool, pay, sell, spendItems, type BagState, type Buyer, type Friend, type ItemId } from "./logic/bag";
import { COIN, itemIcon } from "./ui/items";
import { runMapScene, type MapPick } from "./ui/map";
import { runBagScreen, runCraftScene, runFurnishScene, runGiftScene, runLanternScene, runNatureScene, runSellScene, runShopScene, runStallScene, runSwapScene, type ShopRow } from "./ui/trade";
import { applyCharacter, playerSVG, runCharacterScreen, runGrowScene, runHomeScreen } from "./ui/wardrobe";
import { PlaytestLog } from "./playtest";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Phones and tablets get tap-first controls. ?touch forces it (for testing on a desktop).
const touch = window.matchMedia("(pointer: coarse)").matches || new URLSearchParams(location.search).has("touch");
document.body.classList.toggle("touch", touch);
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const sound = createSound();
const dialogue = createDialogueBox($("#dialogue"), sound, reducedMotion, (who, open) => world?.setMouth(who, open));
const hud = createHud($("#hud"), sound, touch);
const meter = createMeterView($("#meter"), reducedMotion);
const panel = $("#panel");
const titleCard = $("#title");

// How you look and your home. The first new game asks; after that it's on the title screen.
const savedLooks = readLooks();
let looks: Looks = savedLooks ?? { character: DEFAULT_CHARACTER, home: DEFAULT_HOME, owned: [] };
let chosenLooks = savedLooks !== null;
function useLooks(next: Looks) {
  looks = next;
  applyCharacter(looks.character);
  writeLooks(looks);
}
applyCharacter(looks.character);

async function chooseCharacter() {
  const character = await runCharacterScreen(panel, looks.character, () => sound.play("ui"), looks.owned);
  useLooks({ ...looks, character });
  world?.refreshLook();
}

async function chooseHome() {
  const home = await runHomeScreen(panel, looks.home, () => sound.play("ui"));
  useLooks({ ...looks, home });
}

/** At a save point the home gets room for one more thing, whatever happened in the chapter. */
async function growHome() {
  const roomier = growRoom(looks.home);
  if (roomier.slots === looks.home.slots || remainingAdditions(roomier).length === 0) return;
  const home = await runGrowScene(panel, roomier, () => sound.play("light"));
  useLooks({ ...looks, home });
  await world?.refreshHome(looks.home);
}

const storyJson = fetch("festival.json").then((r) => {
  if (!r.ok) throw new Error(`Could not load the story (${r.status}).`);
  return r.text();
});

/** Sound effects that go with story events. */
const EVENT_SFX: Partial<Record<string, Sfx>> = {
  carry: "pickup",
  trip: "trip",
  hide: "shell",
  get: "pickup",
  fact: "fact",
  mend: "mend",
  ripple: "light",
  end: "ending",
};

/** Goal and meter labels for each chapter. */
/**
 * Goal and meter words for each chapter. Each meter is a slider between two words: the
 * feeling from painful to easy, and the chapter's pull (left) against its opposite (right).
 */
type Ends = [string, string];
const CHAPTERS: Record<number, { title: string; goal: string; meter: [Ends, Ends] }> = {
  1: { title: "Lantern Night", goal: "Light up the square for the lantern festival.", meter: [["Feeling bad", "Feeling good"], ["Want to hide", "Be with people"]] },
  2: { title: "Chapter two: The morning after", goal: "Get ready for the last night of the festival.", meter: [["Running on empty", "Rested"], ["Stop and rest", "Keep pushing"]] },
  3: { title: "Chapter three: The storm", goal: "Keep the lanterns lit through the storm.", meter: [["Panicking", "Steady"], ["Racing thoughts", "Clear head"]] },
  4: { title: "Chapter four: Opening day", goal: "Help Ash open the tea room.", meter: [["Tense", "At ease"], ["Just say yes", "Say what I mean"]] },
  5: { title: "Chapter five: The first snow", goal: "Get Pip and Juno through the night.", meter: [["Worried", "Settled"], ["Check the road", "Stay with the kids"]] },
  6: { title: "Chapter six: The tide", goal: "Help Tobin and Hesketh with the shed.", meter: [["Hurting", "Okay"], ["Fight it", "Let it be"]] },
  8: { title: "Lantern Night", goal: "Mara's looking for you in the Square.", meter: [["Feeling bad", "Feeling good"], ["Want to hide", "Be with people"]] },
  7: { title: "The week after: The far bank", goal: "Mend the footbridge: 6 driftwood and 2 ironstone, for Mara at the river.", meter: [["Restless", "Content"], ["Get it done", "Be in it"]] },
};

/** The week after the storm moves through three goals. */
const WOODS_GOALS = [
  "Mend the footbridge: 6 driftwood and 2 ironstone, for Mara at the river.",
  "Cross the river. Bring Tobin 2 birch bark, a glowcap and some skyglass for a lantern.",
  "Stay as long as you like, then walk home.",
];

function showChapter(level: number) {
  const c = CHAPTERS[level];
  hud.setGoal(c.goal);
  hud.showArea(c.title);
  meter.setLabels(c.meter);
}

let world: World3D | null = null;
let state: GameState = initialState();
let variant: Variant = "main";

const hooks: SceneHooks = {
  sound,
  onArea: (a) => {
    hud.showArea(a.name);
    hud.showTurn(a.id === "wood" || a.id === "river" || a.id === "farbank" || a.id === "beach", (by) => world?.turnCamera(by));
    furnishButton.hidden = !["home", "bedroom", "sitting", "cellar"].includes(a.id);
    inWoods = a.id === "wood" || a.id === "river" || a.id === "farbank" || a.id === "beach";
    paintBag();
  },
  onApproachEvent: (name, arg) => apply({ name, arg }),
  onAction: (label, run) => hud.setAction(label, run),
  touch,
  bag: () => state.bag,
  onStall: () => void useStall(),
  onMap: () => void openMap(),
  onGather(item, fish) {
    setBag(gather(state.bag, item));
    gatherNote(item, fish ? "Landed" : `In your bag: ${countOf(state.bag, item)}`);
    // Time spent on small things settles you a little.
    if (fish) apply({ name: "soothe", arg: "busy" });
  },
};

/** A small note when something lands in your bag. */
function gatherNote(item: ItemId, line: string) {
  const n = document.createElement("div");
  n.className = "gather-toast";
  n.innerHTML = itemIcon(item);
  const t = document.createElement("div");
  t.textContent = ITEMS[item].name;
  const sub = document.createElement("span");
  sub.textContent = line;
  t.append(sub);
  n.append(t);
  hud.toast(n, 2600);
}

function setBag(bag: BagState) {
  state = { ...state, bag };
  writeBag(bag);
  paintBag();
}

let inWoods = false;
let mapButton: HTMLButtonElement;
const villageButton = document.createElement("button");
villageButton.className = "hud-village";
villageButton.textContent = "Back to the village";
villageButton.hidden = true;
villageButton.addEventListener("click", () => {
  if (window.confirm("Go back to the village? You'll pick up from your last save.")) location.reload();
});
$("#hud").append(villageButton);
const bagButton = document.createElement("button");
bagButton.className = "hud-bag";
bagButton.hidden = true;
$("#hud").append(bagButton);
function paintBag() {
  bagButton.hidden = state.world.level !== 7 && state.world.level !== 8 && state.bag.found.length === 0 && !inWoods;
  document.body.classList.toggle("in-hub", state.world.level === 8);
  villageButton.hidden = state.world.level === 8;
  mapButton.hidden = state.world.level !== 8;
  bagButton.innerHTML = `<span>Bag (B)</span><span class="coins">${COIN}${state.bag.coins}</span>`;
}

async function openBag() {
  if (bagButton.hidden || !panel.hidden || !bagFree) return;
  world?.setLocked(true);
  let change = false;
  await runBagScreen(panel, () => state.bag, (tool) => {
    setBag(makeTool(state.bag, tool));
    sound.play("mend");
  }, () => (change = true));
  if (change) await chooseCharacter();
  if (bagFree) world?.setLocked(false);
}
/** The stall in the woods: selling, buying and making, whichever chapter you've wandered in from. */
async function useStall() {
  if (!panel.hidden || !bagFree) return;
  world?.setLocked(true);
  for (;;) {
    const pick = await runStallScene(panel, state.bag);
    if (!pick) break;
    if (pick === "sell") await runSellScene(panel, "stall", () => state.bag, (id) => {
      setBag(sell(state.bag, id));
      sound.play("pickup");
    });
    if (pick === "make") await runCraftScene(panel, () => state.bag, (id) => {
      setBag(craft(state.bag, id));
      sound.play("mend");
    });
    if (pick === "clothes") await runShopScene(panel, "nell", () => state.bag, () => looks.owned, buy);
    if (pick === "house") await runShopScene(panel, "tobin", () => state.bag, ownedAtTobin, buy);
    if (pick === "furniture") await runShopScene(panel, "furniture", () => state.bag, () => [], buy);
  }
  if (bagFree) world?.setLocked(false);
}

/** M, or a map board: go anywhere you've been able to reach, or start any part of the story. */
async function openMap() {
  if (!world || state.world.level !== 8 || !panel.hidden || !bagFree) return;
  world.setLocked(true);
  const pick = await runMapScene(panel, state.world.props.includes("bridge"));
  if (bagFree) world.setLocked(false);
  if (pick?.kind === "place") world.travel(pick.x, pick.z);
  if (pick?.kind === "part") leaveVillage?.(pick);
}
let leaveVillage: ((part: Extract<MapPick, { kind: "part" }>) => void) | null = null;

/** True while you're free to walk about, so the bag doesn't open over a conversation. */
let bagFree = false;
bagButton.addEventListener("click", () => void openBag());
addEventListener("keydown", (e) => {
  if (e.code === "KeyB" && !e.repeat) void openBag();
  if (e.code === "KeyF" && !e.repeat) void openFurnish();
  if (e.code === "KeyM" && !e.repeat) void openMap();
});
mapButton = document.createElement("button");
mapButton.className = "hud-bag hud-map";
mapButton.textContent = "Map (M)";
mapButton.hidden = true;
mapButton.addEventListener("click", () => void openMap());
$("#hud").append(mapButton);
const furnishButton = document.createElement("button");
furnishButton.className = "hud-bag hud-furnish";
furnishButton.textContent = "Furnish (F)";
furnishButton.hidden = true;
furnishButton.addEventListener("click", () => void openFurnish());
$("#hud").append(furnishButton);

function setFurniture(furniture: Furnishings) {
  useLooks({ ...looks, home: { ...looks.home, furniture } });
  void world?.refreshHome(looks.home);
}

/** What's already yours, so the shops can say so. */
function ownedAtTobin(): string[] {
  return [...looks.home.decor, ...(hasAddition(looks.home, "up") ? ["room_up"] : []), ...(hasAddition(looks.home, "side") ? ["room_side"] : [])];
}

/** F, inside your home: put furniture down, move it, or make some. */
async function openFurnish() {
  const room = world?.roomHere();
  if (!world || !room || !panel.hidden || !bagFree) return;
  world.setLocked(true);
  const chosen = await runFurnishScene(panel, room, () => looks.home.furniture, () => state.bag, (id) => {
    const needs = (FURNITURE[id] as { needs?: Parameters<typeof canAfford>[1] }).needs;
    if (!needs || !canAfford(state.bag, needs)) return;
    setBag(spendItems(state.bag, needs));
    setFurniture(addPiece(looks.home.furniture, id));
    sound.play("mend");
  }, (act) => {
    if (act.kind === "away") setFurniture(putAway(looks.home.furniture, act.index));
    if (act.kind === "turn") setFurniture(turnPiece(looks.home.furniture, act.index));
  });
  if (chosen) {
    const spot = world.spotAhead();
    if (canPlace(looks.home.furniture, chosen, room, spot.x, spot.z)) {
      setFurniture(place(looks.home.furniture, chosen, room, spot.x, spot.z, spot.turn));
      sound.play("hang");
    } else {
      const n = document.createElement("div");
      n.className = "gather-toast";
      n.textContent = "There's no room for that here. Try another spot.";
      hud.toast(n, 2800);
    }
  }
  if (bagFree) world.setLocked(false);
}

/** Counter items take their own payment, so undo the general one first. */
const payBack = (price: number): BagState => ({ ...state.bag, coins: state.bag.coins + price });

function buy(row: ShopRow) {
  if (state.bag.coins < row.price) return;
  setBag(pay(state.bag, row.price));
  sound.play("pickup");
  const clothes = ["leafcrown", "fishinghat", "mushroomcap", "leafcape"].includes(row.id);
  if (row.id.startsWith("item_")) {
    setBag(buyItem(payBack(row.price), row.id.slice(5) as ItemId));
  } else if (row.id.startsWith("piece_")) {
    setFurniture(addPiece(looks.home.furniture, row.id.slice(6) as FurnitureId));
  } else if (row.id === "room_up" || row.id === "room_side") {
    useLooks({ ...looks, home: buildAddition(looks.home, row.id === "room_up" ? "up" : "side") });
    void world?.refreshHome(looks.home);
  } else if (clothes) {
    const slot = row.id === "leafcape" ? "extra" : "hat";
    useLooks({ ...looks, owned: [...looks.owned, row.id], character: { ...looks.character, [slot]: row.id } });
    world?.refreshLook();
  } else {
    useLooks({ ...looks, home: { ...looks.home, decor: [...looks.home.decor, row.id as Decor] } });
    void world?.refreshHome(looks.home);
  }
}

function apply(ev: GameEvent) {
  try {
    state = applyEvent(state, ev);
  } catch (err) {
    console.warn(err);
    return;
  }
  if (ev.name === "tool" || ev.name === "use_items" || ev.name === "prop") writeBag(state.bag);
  world?.applyState(state.world);
  world?.setFeeling(state.meter.distress);
  meter.render(state.meter);
  if (ev.name === "chapter") showChapter(state.world.level);
  if (ev.name === "woods_goal") hud.setGoal(WOODS_GOALS[Number(ev.arg)] ?? "");
  paintBag();
  const sfx = EVENT_SFX[ev.name];
  if (sfx) sound.play(sfx);
  if (ev.name === "fact" && ev.arg) {
    hud.toast(factCard(variant, ev.arg as HotspotId), 7000);
    world?.sparkle(world.playerX(), GROUND_Y - 180);
  }
}

const loader = $("#loader");
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

function showLoader() {
  $("#loader-you").innerHTML = playerSVG("happy");
  $("#loader-go").hidden = true;
  $("#loader-note").textContent = "Lighting the lanterns…";
  loader.classList.remove("gone");
  loader.hidden = false;
}

function hideLoader() {
  loader.classList.add("gone");
  window.setTimeout(() => (loader.hidden = true), 480);
}

async function bootWorld(): Promise<World3D> {
  // A new game gets a fresh world, so a changed look or home shows. Building it takes a moment,
  // and the loading screen's animation keeps moving while it does.
  showLoader();
  await nextFrame();
  world?.dispose();
  world = new World3D($("#game"), hooks, state.world, looks.home);
  await nextFrame();
  hideLoader();
  return world;
}

/** Let the player walk to a world choice, or click a plain one. */
function waitForChoice(choices: StoryChoice[]): Promise<StoryChoice> {
  const inWorld = choices.filter((c) => c.target);
  const plain = choices.filter((c) => !c.target);
  hud.setNext(state.world.level === 8 ? [] : choices);
  bagFree = inWorld.length > 0;
  if (inWorld.length === 0) {
    world!.setLocked(true);
    return dialogue.ask(plain, false);
  }
  return new Promise((resolve) => {
    const done = (c: StoryChoice) => {
      bagFree = false;
      world!.clearTargets();
      world!.setLocked(true);
      dialogue.dismiss();
      hud.controls("hidden");
      resolve(c);
    };
    if (plain.length) void dialogue.ask(plain, true).then(done);
    else dialogue.hide();
    hud.controls("walk");
    world!.setTargets(inWorld, done);
    world!.setLocked(false);
  });
}

const CHAPTER_ORDINAL: Record<SaveChapter, string> = { 2: "chapter two", 3: "chapter three", 4: "chapter four", 5: "chapter five", 6: "chapter six", 7: "the far bank" };
const FINISHED: Record<SaveChapter, string> = { 2: "Chapter one", 3: "Chapter two", 4: "The far bank", 5: "Chapter four", 6: "Chapter five", 7: "Chapter three" };

async function play(chosen: Variant, from?: string, resume?: SaveGame) {
  variant = resume?.variant ?? chosen;
  state = resume?.game ?? initialState();
  // Your bag is yours, whichever game you're in, and so is what you've built with it.
  const bag = readBag();
  state = { ...state, bag, world: { ...state.world, props: [...new Set([...state.world.props, ...bag.built])] } };
  const inVillage = from === "village_hub";
  if (inVillage) {
    state = applyEvent(state, { name: "chapter", arg: "8" });
  }
  meter.render(state.meter);
  showChapter(state.world.level);
  const engine = new Engine(await storyJson, variant, () => state.meter.distress, () => state.bag);
  if (resume) engine.loadState(resume.story);
  else if (from) engine.startAt(from);
  if (inVillage) {
    const next = NEXT_GIVER[readSave()?.chapter ?? 1];
    engine.setVar("next_giver", next.who);
    hud.setGoal(next.line);
  }
  const log = new PlaytestLog(variant);
  await bootWorld();
  hud.onHeadUp((on) => world!.setHeadUp(on));
  log.record("start", { variant, from, resumedChapter: resume?.chapter });

  while (true) {
    let scene: StoryLine["scene"] = null;
    for (const line of engine.lines()) {
      scene = line.scene;
      for (const ev of line.events) {
        apply(ev);
        log.record("event", ev);
      }
      if (!line.text) continue;
      world!.setLocked(true);
      if (line.spoken) {
        const expression = line.spoken.expression ?? state.world.faces[line.spoken.speaker] ?? "neutral";
        await dialogue.say(line.text, { ...line.spoken, expression });
      } else {
        await dialogue.say(line.text, null);
      }
    }

    if (scene === "save") {
      // Save at the start of the next chapter, so resuming begins there.
      dialogue.hide();
      hud.setNext([]);
      const next = Number(engine.getVar("next_chapter")) as SaveChapter;
      engine.choose(0);
      const saved = writeSave({ chapter: next, variant, story: engine.saveState(), game: state });
      await growHome();
      log.record("save", { chapter: next, saved });
      const choice = await runSaveScene(panel, FINISHED[next], CHAPTER_ORDINAL[next], saved);
      if (choice === "break") {
        log.record("break", { chapter: next });
        void begin("main", "village_hub");
        return;
      }
      continue;
    }

    if (scene) {
      dialogue.hide();
      hud.setNext([]);
      if (scene === "fit") {
        const r = await runFitScene(panel, variant, state.world.factsFound);
        log.record("fit", r);
        engine.setVar("fit", r.fit);
      } else if (scene === "approach") {
        hud.controls("approach");
        const r = await world!.runApproach();
        log.record("approach", r);
        engine.setVar("reached", r.reached);
        engine.setVar("head_up", r.headUp);
        engine.setVar("turned_back", r.turnedBack);
        hud.controls("hidden");
      } else if (scene === "mend") {
        await runMendScene(panel, variant, sound);
      } else if (scene === "hang") {
        hud.controls("hang");
        await world!.runHang();
        hud.controls("hidden");
      } else if (scene === "checkin") {
        const r = await runCheckInScene(panel, Number(engine.getVar("tasks_done")));
        log.record("checkin", r);
        engine.setVar("guilt_fits", r.guiltFits);
      } else if (scene === "breathe") {
        const n = await runBreathScene(panel, sound, () => apply({ name: "calm", arg: "breath" }), reducedMotion);
        log.record("breathe", n);
        engine.setVar("breaths", n);
      } else if (scene === "sayit") {
        const r = await runSayItScene(panel);
        log.record("sayit", r);
        engine.setVar("ask_answer", r.answer);
        engine.setVar("ask_clear", r.clear);
        engine.setVar("ask_kind", r.kind);
        engine.setVar("ask_steady", r.steady);
      } else if (scene === "tide") {
        hud.controls("tide");
        const r = await world!.runTide(() => apply({ name: "fight" }));
        log.record("tide", r);
        engine.setVar("saved_count", r.saved.length);
        engine.setVar("saved_red", r.saved.includes("red_mould"));
        engine.setVar("saved_notebooks", r.saved.includes("notebooks"));
        engine.setVar("fought", r.fought);
        hud.controls("hidden");
      } else if (scene === "secure") {
        hud.controls("hang");
        await world!.runSecure();
        hud.controls("hidden");
      } else if (scene === "startpart") {
        // Whoever has the bright bubble starts the next part: your save if you've one, or the beginning.
        const save = readSave();
        void (save ? begin(save.variant, undefined, save) : begin("main"));
        return;
      } else if (scene === "lanterns") {
        await runLanternScene(panel, () => state.bag, (l) => {
          setBag(makeLantern(state.bag, l));
          sound.play("light");
          world?.applyState(state.world);
        });
      } else if (scene === "nature") {
        const brought = await runNatureScene(panel, () => state.bag, (id) => {
          setBag(toTable(state.bag, id));
          sound.play("fact");
          world?.refreshNature();
        });
        engine.setVar("nature_new", brought);
        engine.setVar("nature_count", state.bag.nature.length);
      } else if (scene === "swap") {
        await runSwapScene(panel, () => state.bag, (leave, take) => {
          setBag(swapShelf(state.bag, leave, take));
          sound.play("pickup");
        });
      } else if (scene === "look") {
        await chooseCharacter();
      } else if (scene === "homelook") {
        await chooseHome();
        await world?.refreshHome(looks.home);
      } else if (scene === "sell") {
        const buyer = engine.getVar("trade_with") as Buyer;
        await runSellScene(panel, buyer, () => state.bag, (id) => {
          setBag(sell(state.bag, id, buyer));
          sound.play("pickup");
        });
      } else if (scene === "shop") {
        const who = String(engine.getVar("trade_with"));
        await runShopScene(panel, who, () => state.bag, () => (who === "nell" ? looks.owned : who === "tobin" ? ownedAtTobin() : []), buy);
        if (who === "tobin" && state.world.level === 7) await runShopScene(panel, "furniture", () => state.bag, () => [], buy);

      } else if (scene === "craft") {
        await runCraftScene(panel, () => state.bag, (id) => {
          setBag(craft(state.bag, id));
          sound.play("mend");
        });
      } else if (scene === "gift") {
        const who = engine.getVar("trade_with") as Friend;
        const r = canGift(state.bag, who) ? await runGiftScene(panel, who, state.bag) : null;
        if (r) {
          setBag(give(state.bag, who, r.item));
          engine.setVar("gift_item", r.item);
          engine.setVar("gift_name", ITEMS[r.item].name);
          engine.setVar("gift_fit", r.fit);
          sound.play("light");
        }
      } else if (scene === "chain") {
        const record: ChainRecord = {
          variant,
          label: String(engine.getVar("label")),
          hideCount: Number(engine.getVar("hide_count")),
          bailed: Boolean(engine.getVar("bailed")),
          path: engine.getVar("path") === "repair" ? "repair" : "opposite",
          completeness: engine.getVar("completeness") as Completeness,
          fit: Boolean(engine.getVar("fit")),
          factsSeen: Number(engine.getVar("facts_seen")),
        };
        log.record("chain_record", record);
        await runChainScene(panel, record, (id) => log.record("chain_tap", id));
      }
      engine.choose(0);
      continue;
    }

    if (engine.ended) break;
    // In the village the map can start a chapter at any moment.
    const exit = new Promise<{ part: Extract<MapPick, { kind: "part" }> }>((r) => (leaveVillage = (part) => r({ part })));
    const picked = await Promise.race([waitForChoice(engine.choices), exit]);
    leaveVillage = null;
    if ("part" in picked) {
      world?.clearTargets();
      dialogue.hide();
      void begin(picked.part.variant ?? "main", picked.part.knot);
      return;
    }
    const choice = picked;
    log.record("choice", choice.text);
    engine.choose(choice.index);
    const said = /^"(.*)"$/.exec(choice.text);
    if (said) await dialogue.say(said[1], { speaker: "you", expression: state.world.faces.you ?? null, text: said[1] });
  }

  log.record("end");
  clearSave();
  dialogue.hide();
  showEnd(log);
}

function showEnd(log: PlaytestLog) {
  const card = document.createElement("div");
  card.className = "panel-card end";
  const title = document.createElement("h2");
  title.textContent = "The lantern burns on into the night.";
  const thanks = document.createElement("p");
  thanks.textContent = "Thank you for playing Lantern Night.";
  const again = document.createElement("button");
  again.className = "primary";
  again.textContent = "Back to the village";
  again.addEventListener("click", () => {
    panel.hidden = true;
    void begin("main", "village_hub");
  });
  const notes = document.createElement("button");
  notes.className = "ghost";
  notes.textContent = "Download playtest notes";
  notes.addEventListener("click", () => log.download());
  const row = document.createElement("div");
  row.className = "row";
  row.append(again, notes);
  card.append(title, thanks, row);
  panel.replaceChildren(card);
  panel.hidden = false;
}

/** The title screen, with a Continue button when there's a save to go back to. */
function showTitle() {
  hideLoader();
  const save = readSave();
  const row = $("#continue-row");
  row.hidden = !save;
  $("#start-main").className = save ? "ghost" : "primary";
  if (save) {
    $("#continue").textContent = `Continue ${CHAPTER_NAMES[save.chapter]}`;
    const when = new Date(save.savedAt);
    $(".saved-at").textContent = Number.isNaN(when.getTime()) ? "" : `Saved ${when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  }
  dialogue.hide();
  titleCard.hidden = false;
}

async function begin(v: Variant, from?: string, resume?: SaveGame) {
  sound.unlock();
  sound.play("ui");
  titleCard.hidden = true;
  // A first new game starts with choosing how you look and your home.
  if (!chosenLooks && !from && !resume) {
    await chooseCharacter();
    await chooseHome();
    chosenLooks = true;
  }
  play(v, from, resume).catch((err) => {
    console.error(err);
    void dialogue.say(String(err instanceof Error ? err.message : err), null);
  });
}

$("#start-main").addEventListener("click", () => void begin("main"));
$("#start-promise").addEventListener("click", () => void begin("promise"));
$("#start-ch2").addEventListener("click", () => begin("main", "start_day_two"));
$("#start-ch3").addEventListener("click", () => begin("main", "start_storm"));
$("#start-woods").addEventListener("click", () => begin("main", "start_woods"));
$("#start-ch4").addEventListener("click", () => begin("main", "start_mill"));
$("#start-ch5").addEventListener("click", () => begin("main", "start_snow"));
$("#start-ch6").addEventListener("click", () => begin("main", "start_coast"));
$("#continue").addEventListener("click", () => {
  const save = readSave();
  if (save) begin(save.variant, undefined, save);
  else showTitle();
});
for (const [id, choose] of [["#edit-look", chooseCharacter], ["#edit-home", chooseHome]] as const) {
  $(id).addEventListener("click", async () => {
    sound.unlock();
    sound.play("ui");
    titleCard.hidden = true;
    await choose();
    chosenLooks = true;
    showTitle();
  });
}
$("#start-over").addEventListener("click", () => {
  clearSave();
  showTitle();
});
window.addEventListener("pointerdown", () => sound.unlock(), { once: true });
window.addEventListener("keydown", () => sound.unlock(), { once: true });

// ?debug exposes the world for automated playtesting (walk the player, read state).
if (new URLSearchParams(location.search).has("debug")) {
  Object.assign(window, { lantern: { world: () => world, state: () => state, growHome, NODES, FISHING_SPOTS, riverMidX } });
}

/** The first thing you see: the lanterns light, and then you come in. ?title shows the old chapter list instead. */
async function open() {
  const params = new URLSearchParams(location.search);
  const requested = params.get("variant");
  if (requested === "main" || requested === "promise") return void begin(requested);
  if (params.has("title")) return showTitle();
  $("#loader-you").innerHTML = playerSVG("happy");
  await storyJson;
  await new Promise((r) => window.setTimeout(r, 1800));
  $("#loader-note").textContent = "The village is ready for you.";
  const go = $<HTMLButtonElement>("#loader-go");
  go.hidden = false;
  go.focus();
  await new Promise<void>((resolve) => go.addEventListener("click", () => resolve(), { once: true }));
  sound.unlock();
  if (!chosenLooks) {
    hideLoader();
    await chooseCharacter();
    await chooseHome();
    chosenLooks = true;
  }
  void begin("main", "village_hub");
}
void open();
