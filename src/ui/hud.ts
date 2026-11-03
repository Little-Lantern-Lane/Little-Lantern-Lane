// Everything drawn over the game besides dialogue: the goal and what to do
// next, the area name as you walk in, controls, the head-up button, and sound.

import type { StoryChoice } from "../engine";
import type { Sound } from "../audio/sound";

export interface Hud {
  setGoal(text: string): void;
  /** The on-screen action button: what tapping it does right now, or hidden. */
  setAction(label: string | null, run: (() => void) | null): void;
  setNext(choices: StoryChoice[]): void;
  showArea(name: string): void;
  controls(mode: "walk" | "approach" | "hang" | "tide" | "hidden"): void;
  onHeadUp(handler: (on: boolean) => void): void;
  toast(node: HTMLElement, ms?: number): void;
}

export function createHud(root: HTMLElement, sound: Sound, touch: boolean): Hud {
  root.innerHTML = `
    <div class="hud-goal"><span class="hud-label">Goal</span><p>Light up the square for the lantern festival.</p><ul class="hud-next"></ul></div>
    <div class="hud-area" aria-live="polite"></div>
    <div class="hud-controls"></div>
    <button class="hud-headup" hidden>Head up</button>
    <button class="hud-action" hidden></button>
    <button class="hud-fullscreen" hidden>Full screen</button>
    <button class="hud-sound" aria-label="Sound"></button>
    <div class="hud-toast" aria-live="polite"></div>`;
  const next = root.querySelector<HTMLElement>(".hud-next")!;
  const area = root.querySelector<HTMLElement>(".hud-area")!;
  const controls = root.querySelector<HTMLElement>(".hud-controls")!;
  const headUp = root.querySelector<HTMLButtonElement>(".hud-headup")!;
  const soundBtn = root.querySelector<HTMLButtonElement>(".hud-sound")!;
  const toastEl = root.querySelector<HTMLElement>(".hud-toast")!;
  const action = root.querySelector<HTMLButtonElement>(".hud-action")!;
  const fullscreen = root.querySelector<HTMLButtonElement>(".hud-fullscreen")!;
  let headUpHandler: (on: boolean) => void = () => {};
  let actionRun: (() => void) | null = null;
  action.addEventListener("click", () => {
    sound.unlock();
    actionRun?.();
  });
  // Full screen helps on phones that support it (not iPhone Safari, which hides the button).
  const stage = root.parentElement!;
  if (document.fullscreenEnabled && touch) {
    fullscreen.hidden = false;
    fullscreen.addEventListener("click", () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void stage.requestFullscreen().catch(() => {});
    });
  }
  let areaTimer: number | undefined;

  const paintSound = () => {
    soundBtn.textContent = sound.muted ? "♪ off" : "♪ on";
    soundBtn.setAttribute("aria-pressed", String(!sound.muted));
  };
  paintSound();
  soundBtn.addEventListener("click", () => {
    sound.unlock();
    sound.toggleMute();
    paintSound();
  });

  const press = (on: boolean) => (e: Event) => {
    e.preventDefault();
    headUp.classList.toggle("held", on);
    headUpHandler(on);
  };
  headUp.addEventListener("pointerdown", press(true));
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) headUp.addEventListener(ev, press(false));

  const CONTROLS = touch
    ? {
        walk: "Tap where to go · tap people and things to talk or use them",
        approach: "Tap toward Mara to walk · hold Head up with your other thumb",
        hang: "Tap a hook to walk there, then tap the button",
        tide: "Tap something on the shelves to carry it out before the water reaches it",
        hidden: "",
      }
    : {
        walk: "<kbd>←</kbd><kbd>→</kbd> or <kbd>A</kbd><kbd>D</kbd> walk · <kbd>E</kbd> talk, use, enter · or click where to go",
        approach: "<kbd>←</kbd> walk toward Mara · hold <kbd>Shift</kbd> (or the Head up button) to keep your head up",
        hang: "Walk under each hook and press <kbd>E</kbd>",
        tide: "Walk to something and press <kbd>E</kbd> to carry it out before the water reaches it",
        hidden: "",
      };

  const goal = root.querySelector<HTMLElement>(".hud-goal p")!;

  return {
    setGoal(text) {
      goal.textContent = text;
    },
    setAction(label, run) {
      actionRun = run;
      action.hidden = !label;
      action.textContent = label ?? "";
    },
    setNext(choices) {
      next.replaceChildren();
      for (const c of choices) {
        if (!c.target || c.target.kind === "talk") continue;
        const li = document.createElement("li");
        li.textContent = c.text;
        next.appendChild(li);
      }
      if (choices.some((c) => c.target?.kind === "talk")) {
        const li = document.createElement("li");
        li.className = "hint";
        li.textContent = "People with a speech bubble want to talk.";
        next.appendChild(li);
      }
    },
    showArea(name) {
      area.textContent = name;
      area.classList.add("on");
      window.clearTimeout(areaTimer);
      areaTimer = window.setTimeout(() => area.classList.remove("on"), 2200);
    },
    controls(mode) {
      controls.innerHTML = CONTROLS[mode];
      controls.hidden = mode === "hidden";
      headUp.hidden = mode !== "approach";
    },
    onHeadUp(handler) {
      headUpHandler = handler;
    },
    toast(node, ms = 6000) {
      toastEl.replaceChildren(node);
      toastEl.classList.add("on");
      window.setTimeout(() => toastEl.classList.remove("on"), ms);
    },
  };
}
