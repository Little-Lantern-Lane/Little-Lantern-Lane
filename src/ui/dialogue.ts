// The dialogue box over the game: narration and speech typed out a letter at a
// time, a portrait for whoever is talking, and numbered choices.

import type { StoryChoice } from "../engine";
import { CAST, type SpokenLine } from "../logic/cast";
import type { Sound } from "../audio/sound";
import type { CharacterId } from "../logic/cast";
import { portraitSVG } from "./plush";

const VOICE: Record<string, number> = { you: 1, mara: 1.15, tobin: 0.85, wren: 0.95, oda: 0.8, pip: 1.45, juno: 1.35, nell: 0.75, ash: 1.0 };
const ADVANCE_KEYS = new Set([" ", "Enter", "e", "E"]);

export interface DialogueBox {
  say(text: string, spoken: SpokenLine | null): Promise<void>;
  /** Show choices. In roam mode the box is a small bar and the world stays playable. */
  ask(choices: StoryChoice[], roam: boolean): Promise<StoryChoice>;
  /** Close any open roam bar (the player picked something in the world instead). */
  dismiss(): void;
  hide(): void;
  readonly open: boolean;
}

/** Called as a speaker's mouth opens and closes with their words. */
export type MouthHandler = (speaker: CharacterId, open: boolean) => void;

export function createDialogueBox(root: HTMLElement, sound: Sound, reducedMotion: boolean, onMouth: MouthHandler = () => {}): DialogueBox {
  root.innerHTML = `<div class="dlg-portrait"></div><div class="dlg-body"><span class="dlg-name"></span><p class="dlg-text"></p><div class="dlg-choices"></div><span class="dlg-next" aria-hidden="true">▼</span></div>`;
  const portrait = root.querySelector<HTMLElement>(".dlg-portrait")!;
  const name = root.querySelector<HTMLElement>(".dlg-name")!;
  const text = root.querySelector<HTMLElement>(".dlg-text")!;
  const choicesEl = root.querySelector<HTMLElement>(".dlg-choices")!;
  let open = false;
  let advance: (() => void) | null = null;
  let shownAt = 0;
  let pendingChoice: { resolve: (c: StoryChoice) => void } | null = null;

  const show = (mode: "line" | "choices" | "roam") => {
    root.hidden = false;
    root.dataset.mode = mode;
    open = mode !== "roam";
    shownAt = performance.now();
  };

  window.addEventListener("keydown", (e) => {
    if (root.hidden || e.repeat) return;
    if (performance.now() - shownAt < 180) return;
    if (advance && ADVANCE_KEYS.has(e.key)) {
      e.preventDefault();
      advance();
      return;
    }
    if (pendingChoice && /^[1-9]$/.test(e.key)) {
      const b = choicesEl.querySelectorAll("button")[Number(e.key) - 1] as HTMLButtonElement | undefined;
      b?.click();
    }
  });
  root.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    advance?.();
  });

  return {
    get open() {
      return open;
    },
    say(line, spoken) {
      show("line");
      choicesEl.replaceChildren();
      portrait.replaceChildren();
      if (spoken) {
        // Trusted markup from our own renderer (no story or user text inside).
        portrait.innerHTML = portraitSVG(spoken.speaker, spoken.expression ?? "neutral");
        name.textContent = CAST[spoken.speaker].name;
        root.classList.toggle("is-you", spoken.speaker === "you");
      } else {
        name.textContent = "";
        root.classList.remove("is-you");
      }
      root.classList.toggle("narration", !spoken);
      text.textContent = "";
      root.classList.remove("done");
      return new Promise((resolve) => {
        let i = 0;
        let timer: number | undefined;
        const pitch = spoken ? VOICE[spoken.speaker] ?? 1 : 0;
        const face = portrait.querySelector<SVGSVGElement>("svg");
        const mouth = (open: boolean) => {
          if (!spoken) return;
          if (face) face.dataset.frame = open ? "open" : "closed";
          onMouth(spoken.speaker, open);
        };
        const finishTyping = () => {
          window.clearInterval(timer);
          mouth(false);
          text.textContent = line;
          i = line.length;
          root.classList.add("done");
          advance = () => {
            advance = null;
            sound.play("ui", { volume: 0.4 });
            resolve();
          };
        };
        advance = finishTyping;
        if (reducedMotion) return finishTyping();
        timer = window.setInterval(() => {
          i += 1;
          text.textContent = line.slice(0, i);
          if (spoken && i % 3 === 0 && /\w/.test(line[i] ?? "")) sound.play("blip", { pitch });
          // The mouth flaps every few letters and closes at spaces and punctuation.
          if (spoken && i % 3 === 0) mouth(/\w/.test(line[i] ?? "") && !(face?.dataset.frame === "open"));
          if (i >= line.length) finishTyping();
        }, 22);
      });
    },
    ask(list, roam) {
      show(roam ? "roam" : "choices");
      choicesEl.replaceChildren();
      advance = null;
      root.classList.add("done");
      // Short answers (feeling words, Yes/No) sit in a row so the scene stays visible.
      choicesEl.classList.toggle("compact", list.every((c) => c.text.length <= 22));
      return new Promise((resolve) => {
        pendingChoice = { resolve };
        list.forEach((c, n) => {
          const b = document.createElement("button");
          b.className = "choice";
          b.innerHTML = `<kbd>${n + 1}</kbd>`;
          b.append(document.createTextNode(c.text));
          b.addEventListener("click", () => {
            sound.play("ui");
            pendingChoice = null;
            choicesEl.replaceChildren();
            resolve(c);
          });
          choicesEl.appendChild(b);
        });
        if (!roam) (choicesEl.firstElementChild as HTMLElement | null)?.focus({ preventScroll: true });
      });
    },
    dismiss() {
      pendingChoice = null;
      choicesEl.replaceChildren();
      if (root.dataset.mode === "roam") root.hidden = true;
    },
    hide() {
      root.hidden = true;
      open = false;
      advance = null;
      pendingChoice = null;
      choicesEl.replaceChildren();
    },
  };
}
