// The village map: every place you can walk to, and a lantern for each part of the story.
// Click a place to go there, or a lantern to start that part. All of them are open from the start.

import { LANTERN_ROW, MAP_PLACES } from "../game/layout";

export type MapPick = { kind: "place"; x: number; z: number } | { kind: "part"; knot?: string; variant?: "promise" };

/** Where each place's label sits, and where each part's lantern hangs, on the drawing. */
const LABELS: Record<string, [number, number]> = {
  lane: [76, 402], street: [236, 356], square: [414, 350], hill: [560, 300], wood: [70, 72], farbank: [530, 66], beach: [640, 498], mill: [716, 106], saltmouth: [812, 356],
};
const LAMPS: Record<string, [number, number, string]> = {
  lantern_1: [440, 290, "#e9583c"], lantern_1b: [486, 306, "#f0c75e"], lantern_2: [116, 306, "#f2b54a"], lantern_3: [520, 256, "#5f7fc0"],
  lantern_far: [240, 120, "#4fa3a0"], lantern_4: [690, 140, "#d98a4a"], lantern_5: [176, 322, "#a9c4e8"], lantern_6: [848, 392, "#c94f6d"],
};

/** The borrowed lantern is another telling of the first night, so finishing that night doesn't count as playing it. */
const isPlayed = (l: (typeof LANTERN_ROW)[number], played: number[]) => !l.variant && played.includes(l.level);

function drawing(bridge: boolean, played: number[]): string {
  const trees = Array.from({ length: 34 }, (_, i) => [30 + ((i * 53) % 330), 86 + ((i * 31) % 120)]);
  const places = Object.entries(MAP_PLACES).map(([id, p]) => {
    const [x, y] = LABELS[id];
    const shut = id === "farbank" && !bridge;
    return `<g class="map-go${shut ? " shut" : ""}" data-place="${id}" role="button" tabindex="${shut ? -1 : 0}" aria-label="${p.name}${shut ? ", the bridge is out" : ""}"><text x="${x}" y="${y}">${p.name}</text></g>`;
  });
  const lamps = LANTERN_ROW.map((l) => {
    const [x, y, c] = LAMPS[l.id];
    const done = isPlayed(l, played);
    const tick = done ? `<circle cx="${x + 13}" cy="${y + 13}" r="9" fill="#fffaf0" stroke="#5f4029" stroke-width="2"/><path d="M${x + 9} ${y + 13}l3 3 5-6" fill="none" stroke="#5f8a4f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : "";
    return `<g class="map-go lamp" data-part="${l.id}" role="button" tabindex="0" aria-label="${done ? "Play again" : "Play"}: ${l.name}"><title>${l.name}</title><circle cx="${x}" cy="${y}" r="24" fill="${c}" opacity=".3"/><path d="M${x} ${y - 24}v9" stroke="#5f4029" stroke-width="2.5"/><ellipse cx="${x}" cy="${y}" rx="13" ry="15" fill="${c}" stroke="#5f4029" stroke-width="2"/>${tick}</g>`;
  });
  return `<svg class="map-svg" viewBox="0 0 960 540" role="group" aria-label="Map of the village">
    <rect width="960" height="540" fill="#5a3d2a"/>
    <path d="M28 24 930 18 942 516 40 526z" fill="#f3e2bb"/>
    <path d="M28 24 930 18 942 516 40 526z" fill="none" stroke="#c9a874" stroke-width="3" stroke-dasharray="14 8"/>
    <path d="M520 520c30-40 110-40 160-90s190-40 260-70v156z" fill="#a9d4e4"/>
    <path d="M420 20c-30 60 20 90-10 140s30 60 150 70 170-30 250-60" fill="none" stroke="#8fc4dc" stroke-width="20" stroke-linecap="round"/>
    ${trees.map(([x, y]) => `<path d="M${x} ${y}l-12 24h24z" fill="#7fae5c"/><rect x="${x - 2}" y="${y + 24}" width="4" height="6" fill="#7c5a42"/>`).join("")}
    ${[[470, 70], [530, 104], [600, 74], [650, 120], [560, 150]].map(([x, y]) => `<path d="M${x} ${y}l-12 24h24z" fill="#5fa8a0"/>`).join("")}
    ${bridge ? `<path d="M396 118h34" stroke="#7a5340" stroke-width="9"/>` : ""}
    <path d="M90 340c80-40 160-50 240-40s150 0 200-30 140-70 160-120" fill="none" stroke="#b08a5e" stroke-width="5" stroke-dasharray="12 10" stroke-linecap="round"/>
    <path d="M530 280c30 60 70 120 130 170s150-10 190-50" fill="none" stroke="#b08a5e" stroke-width="5" stroke-dasharray="12 10" stroke-linecap="round"/>
    <path d="M100 340c-10-60 40-160 60-190" fill="none" stroke="#b08a5e" stroke-width="5" stroke-dasharray="12 10" stroke-linecap="round"/>
    ${[[80, 340], [122, 336], [230, 318], [270, 310], [320, 304]].map(([x, y], i) => `<path d="M${x} ${y}v-20l16-12 16 12v20z" fill="${["#fde6a8", "#f7d9c4", "#d8efdc", "#e3ecf7", "#fde6a8"][i]}" stroke="#7a5340" stroke-width="2"/>`).join("")}
    <circle cx="470" cy="262" r="30" fill="#e6d3a8" stroke="#a8875c" stroke-width="3"/><circle cx="470" cy="262" r="9" fill="#8fc4dc"/>
    <path d="M660 146v-34h46v34z" fill="#c9b08a" stroke="#7a5340" stroke-width="2"/><circle cx="716" cy="136" r="15" fill="none" stroke="#7a5340" stroke-width="4"/>
    <path d="M820 410v-26h40v26z" fill="#a8784e" stroke="#5f4029" stroke-width="2"/>
    ${places.join("")}${lamps.join("")}
  </svg>`;
}

/** Shows the map. Resolves with where to go, or null if you close it. */
export function runMapScene(panel: HTMLElement, bridge: boolean, played: number[]): Promise<MapPick | null> {
  return new Promise((resolve) => {
    const card = document.createElement("div");
    card.className = "panel-card map-card";
    const note = document.createElement("p");
    note.className = "map-note";
    note.textContent = "Click a place to go there, or a lantern to play that part of the story.";
    const box = document.createElement("div");
    box.innerHTML = drawing(bridge, played);
    const close = document.createElement("button");
    close.className = "primary";
    close.textContent = "Close";
    // A part you've finished asks first, so a stray click can't take you out of the village.
    const again = document.createElement("button");
    again.className = "primary";
    again.hidden = true;
    const buttons = document.createElement("div");
    buttons.className = "row";
    buttons.append(again, close);
    card.append(box, note, buttons);
    panel.replaceChildren(card);
    panel.hidden = false;
    const finish = (v: MapPick | null) => {
      panel.hidden = true;
      panel.replaceChildren();
      resolve(v);
    };
    const choose = (el: Element | null) => {
      const g = el?.closest<SVGGElement>(".map-go");
      if (!g) return;
      const place = g.dataset.place;
      if (place) {
        if (g.classList.contains("shut")) {
          note.textContent = "The bridge is out. It gets mended in the week after the storm.";
          return;
        }
        const p = MAP_PLACES[place];
        finish({ kind: "place", x: p.x, z: p.z });
        return;
      }
      const part = LANTERN_ROW.find((l) => l.id === g.dataset.part);
      if (!part) return;
      const pick: MapPick = { kind: "part", knot: part.knot, variant: part.variant };
      if (!isPlayed(part, played)) return finish(pick);
      const river = part.knot === "start_woods" ? " The bridge comes down for the replay, and it's back when you return." : "";
      note.textContent = `You've played ${part.name}. Playing it again starts it over; your place in the story and everything you've built stay as they are.${river}`;
      again.textContent = "Play it again";
      again.hidden = false;
      again.onclick = () => finish(pick);
      again.focus();
    };
    box.addEventListener("click", (e) => choose(e.target as Element));
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") choose(e.target as Element);
    });
    box.addEventListener("pointerover", (e) => {
      const g = (e.target as Element).closest?.<SVGGElement>(".map-go.lamp");
      const part = g && LANTERN_ROW.find((l) => l.id === g.dataset.part);
      if (part && again.hidden) note.textContent = `${isPlayed(part, played) ? "Play again" : "Play"}: ${part.name}`;
    });
    close.addEventListener("click", () => finish(null));
    close.focus();
  });
}
