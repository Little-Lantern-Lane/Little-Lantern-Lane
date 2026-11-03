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
import { GROUND_Y } from "./game/layout";
import { createDialogueBox } from "./ui/dialogue";
import { createHud } from "./ui/hud";
import { createMeterView } from "./ui/meter";
import { factCard, runBreathScene, runChainScene, runCheckInScene, runFitScene, runMendScene, runSaveScene, runSayItScene } from "./ui/scenes";
import { CHAPTER_NAMES, clearSave, readLooks, readSave, writeLooks, writeSave, type Looks, type SaveChapter, type SaveGame } from "./save";
import { DEFAULT_CHARACTER, DEFAULT_HOME, growRoom, remainingAdditions } from "./logic/appearance";
import { applyCharacter, runCharacterScreen, runGrowScene, runHomeScreen } from "./ui/wardrobe";
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
let looks: Looks = savedLooks ?? { character: DEFAULT_CHARACTER, home: DEFAULT_HOME };
let chosenLooks = savedLooks !== null;
function useLooks(next: Looks) {
  looks = next;
  applyCharacter(looks.character);
  writeLooks(looks);
}
applyCharacter(looks.character);

async function chooseCharacter() {
  const character = await runCharacterScreen(panel, looks.character, () => sound.play("ui"));
  useLooks({ ...looks, character });
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
};

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
  onArea: (a) => hud.showArea(a.name),
  onApproachEvent: (name, arg) => apply({ name, arg }),
  onAction: (label, run) => hud.setAction(label, run),
  touch,
};

function apply(ev: GameEvent) {
  try {
    state = applyEvent(state, ev);
  } catch (err) {
    console.warn(err);
    return;
  }
  world?.applyState(state.world);
  world?.setFeeling(state.meter.distress);
  meter.render(state.meter);
  if (ev.name === "chapter") showChapter(state.world.level);
  const sfx = EVENT_SFX[ev.name];
  if (sfx) sound.play(sfx);
  if (ev.name === "fact" && ev.arg) {
    hud.toast(factCard(variant, ev.arg as HotspotId), 7000);
    world?.sparkle(world.playerX(), GROUND_Y - 180);
  }
}

function bootWorld(): Promise<World3D> {
  // A new game gets a fresh world, so a changed look or home shows.
  world?.dispose();
  world = new World3D($("#game"), hooks, state.world, looks.home);
  return Promise.resolve(world);
}

/** Let the player walk to a world choice, or click a plain one. */
function waitForChoice(choices: StoryChoice[]): Promise<StoryChoice> {
  const inWorld = choices.filter((c) => c.target);
  const plain = choices.filter((c) => !c.target);
  hud.setNext(choices);
  if (inWorld.length === 0) {
    world!.setLocked(true);
    return dialogue.ask(plain, false);
  }
  return new Promise((resolve) => {
    const done = (c: StoryChoice) => {
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

const CHAPTER_ORDINAL: Record<SaveChapter, string> = { 2: "chapter two", 3: "chapter three", 4: "chapter four", 5: "chapter five", 6: "chapter six" };
const FINISHED: Record<SaveChapter, string> = { 2: "Chapter one", 3: "Chapter two", 4: "Chapter three", 5: "Chapter four", 6: "Chapter five" };

async function play(chosen: Variant, from?: string, resume?: SaveGame) {
  variant = resume?.variant ?? chosen;
  state = resume?.game ?? initialState();
  meter.render(state.meter);
  showChapter(state.world.level);
  const engine = new Engine(await storyJson, variant, () => state.meter.distress);
  if (resume) engine.loadState(resume.story);
  else if (from) engine.startAt(from);
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
        sound.setMood("silent");
        showTitle();
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
    const choice = await waitForChoice(engine.choices);
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
  again.textContent = "Play again";
  again.addEventListener("click", () => {
    panel.hidden = true;
    showTitle();
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
showTitle();
window.addEventListener("pointerdown", () => sound.unlock(), { once: true });
window.addEventListener("keydown", () => sound.unlock(), { once: true });

// ?debug exposes the world for automated playtesting (walk the player, read state).
if (new URLSearchParams(location.search).has("debug")) {
  Object.assign(window, { lantern: { world: () => world, state: () => state, growHome } });
}

const requested = new URLSearchParams(location.search).get("variant");
if (requested === "main" || requested === "promise") begin(requested);
