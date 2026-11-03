// The look test page: pick a style, a view, the time of day and a feeling.

import { EXPRESSIONS, type Expression } from "./cast";
import { input, Stage, type Light, type Style, type View } from "./stage";

const q = new URLSearchParams(location.search);
const state = {
  style: (q.get("style") ?? "both") as Style | "both",
  view: (q.get("view") ?? "cast") as View,
  light: (q.get("light") ?? "day") as Light,
  feeling: (q.get("feeling") ?? "neutral") as Expression,
};

const panels = document.getElementById("panels")!;
let stages: Stage[] = [];

async function mount() {
  stages.forEach((s) => s.dispose());
  panels.innerHTML = "";
  panels.dataset.count = state.style === "both" ? "2" : "1";
  document.body.dataset.ready = "no";
  const styles: Style[] = state.style === "both" ? ["paper", "toy"] : [state.style];
  stages = styles.map((style) => {
    const host = document.createElement("section");
    host.className = "panel";
    host.innerHTML = `<h2>${style === "paper" ? "Paper cutout" : "Soft 3D toy"}</h2>`;
    panels.appendChild(host);
    return new Stage(host, style, state.view, state.light, state.feeling);
  });
  await Promise.all(stages.map((s) => s.build()));
  document.body.dataset.ready = "yes";
  syncHelp();
}

function syncHelp() {
  document.getElementById("help")!.textContent =
    state.view === "cast" ? "Drag a scene to turn everyone round." : "Walk with the arrow keys or WASD.";
  document.getElementById("feelingBox")!.hidden = state.view !== "cast";
}

function group(id: string, key: "style" | "view" | "light", rebuild: boolean) {
  const box = document.getElementById(id)!;
  const paint = () => box.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === state[key])));
  box.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    (state[key] as string) = b.dataset.v!;
    paint();
    if (rebuild) void mount();
    else stages.forEach((s) => s.setLight(state.light));
  });
  paint();
}

group("styleBox", "style", true);
group("viewBox", "view", true);
group("lightBox", "light", false);

const select = document.getElementById("feeling") as HTMLSelectElement;
for (const e of EXPRESSIONS) select.add(new Option(e === "neutral" ? "calm" : e, e));
select.value = state.feeling;
select.addEventListener("change", () => {
  state.feeling = select.value as Expression;
  stages.forEach((s) => s.setFeeling(state.feeling));
});

const held = new Set<string>();
const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
};
function readKeys() {
  let x = 0;
  let z = 0;
  for (const k of held) {
    x += KEYS[k][0];
    z += KEYS[k][1];
  }
  const n = Math.hypot(x, z) || 1;
  input.x = x / n;
  input.z = z / n;
}
addEventListener("keydown", (e) => {
  if (!(e.code in KEYS)) return;
  e.preventDefault();
  held.add(e.code);
  readKeys();
});
addEventListener("keyup", (e) => {
  held.delete(e.code);
  readKeys();
});
addEventListener("blur", () => {
  held.clear();
  readKeys();
});

void mount();
