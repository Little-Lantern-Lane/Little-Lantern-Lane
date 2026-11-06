// The guide panel: everything you can do outside the story, ticked off by doing it.

import { GUIDE_NOTE, guideProgress, guideSteps, nextStep, type GuideFacts } from "../logic/guide";

/** Shows the guide. `tips` says whether the tip on screen is showing; `onTips` changes that. */
export function runGuide(panel: HTMLElement, facts: () => GuideFacts, tips: () => boolean, onTips: (on: boolean) => void): Promise<void> {
  return new Promise((resolve) => {
    const draw = () => {
      const f = facts();
      const next = nextStep(f);
      const { done, total } = guideProgress(f);
      const card = document.createElement("div");
      card.className = "panel-card trade guide";
      const head = document.createElement("div");
      head.innerHTML = `<p class="eyebrow">Between the stories</p><h2>Things to do</h2>`;
      const lede = document.createElement("p");
      lede.className = "hint";
      lede.textContent = `Do any of these, in any order, or none of them. You've tried ${done} of ${total}.`;
      const list = document.createElement("ol");
      list.className = "guide-list";
      for (const s of guideSteps(f)) {
        const li = document.createElement("li");
        li.className = [s.done ? "done" : "", next?.id === s.id ? "next" : "", s.open ? "" : "shut"].filter(Boolean).join(" ");
        const mark = document.createElement("span");
        mark.className = "guide-mark";
        mark.textContent = s.done ? "✓" : "";
        mark.setAttribute("aria-label", s.done ? "Done" : "Not yet");
        const text = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = s.title;
        const how = document.createElement("p");
        how.textContent = s.open ? s.how : `${s.how} This one's open when you're in the village between stories.`;
        text.append(title, how);
        li.append(mark, text);
        list.append(li);
      }
      const row = document.createElement("div");
      row.className = "row";
      const close = document.createElement("button");
      close.className = "primary";
      close.textContent = "Close";
      close.addEventListener("click", () => {
        panel.hidden = true;
        panel.replaceChildren();
        resolve();
      });
      const toggle = document.createElement("button");
      toggle.className = "ghost";
      toggle.textContent = tips() ? "Hide the tip on screen" : "Show the tip on screen";
      toggle.addEventListener("click", () => {
        onTips(!tips());
        draw();
      });
      row.append(close, toggle);
      const note = document.createElement("p");
      note.className = "guide-note";
      note.textContent = GUIDE_NOTE;
      card.append(head, lede, list, note, row);
      panel.replaceChildren(card);
      panel.hidden = false;
      close.focus();
    };
    draw();
  });
}
