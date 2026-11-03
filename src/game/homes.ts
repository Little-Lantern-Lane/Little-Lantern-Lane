// The player's home, drawn from what they chose (src/logic/appearance.ts): one of
// four ready-made styles or one designed part by part, plus whatever it has
// grown (an upper floor, a side room, a porch, a garden). Same look as the
// village: soft pastel shapes, rounded corners, white-framed windows.
//
// Homes are drawn in their own units with the ground at y = G; Lantern Lane
// scales one onto your plot, and the customization panels show it with a sky.

import { hasAddition, type CustomHome, type HomeChoice } from "../logic/appearance";

const f = (n: number) => Math.round(n * 100) / 100;

export const HOME_W = 440;
export const HOME_H = 300;
export const G = 240;
const SNOW = "#fbfdff";

export const PAINTS = [
  { name: "Butter and lilac", wall: "#fde6a8", roof: "#b986c9", trim: "#9a6bb0", door: "#a8674a" },
  { name: "Peach and sea blue", wall: "#f7d9c4", roof: "#7a9fd0", trim: "#5f8fb0", door: "#5f8fb0" },
  { name: "Mint and berry", wall: "#d8efdc", roof: "#d9677a", trim: "#b8505f", door: "#c97b6a" },
  { name: "Cloud and moss", wall: "#eef0f4", roof: "#7fae6a", trim: "#5f8a4f", door: "#7a9a5a" },
];
type Paint = (typeof PAINTS)[number];

interface Grow {
  up: boolean;
  side: boolean;
  porch: boolean;
  garden: boolean;
}

/** Drawing options: winter, and where to report windows so they glow at night. */
export interface DrawCtx {
  snow?: boolean;
  light?: (x: number, y: number) => void;
}
let ctx: DrawCtx = {};
let uid = 0;

// --- Small parts ----------------------------------------------------------------

/** A roof or cap shape; in snow, a white copy sits a little higher so a soft cap shows. */
function cap(d: string, color: string, extra = "") {
  const snow = ctx.snow ? `<path d="${d}" fill="${SNOW}" ${extra.replace(/stroke="[^"]*"/, `stroke="${SNOW}"`)} transform="translate(0 -8)"/>` : "";
  return snow + `<path d="${d}" fill="${color}" ${extra}/>`;
}

function glow(x: number, y: number) {
  ctx.light?.(x, y);
}

function win(x: number, y: number, w: number, h: number, shutters?: string) {
  glow(x + w / 2, y + h / 2);
  let s = "";
  if (shutters) s += `<rect x="${f(x - 9)}" y="${f(y)}" width="7" height="${h}" rx="2.5" fill="${shutters}"/><rect x="${f(x + w + 2)}" y="${f(y)}" width="7" height="${h}" rx="2.5" fill="${shutters}"/>`;
  return s + `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="5" fill="#bfe3ef" stroke="#ffffff" stroke-width="3"/><path d="M${f(x + w / 2)} ${f(y + 2)} V${f(y + h - 2)} M${f(x + 2)} ${f(y + h / 2)} H${f(x + w - 2)}" stroke="#ffffff" stroke-width="2.2"/>`;
}

function round(cx: number, cy: number, r: number) {
  glow(cx, cy);
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="#bfe3ef" stroke="#ffffff" stroke-width="3"/><path d="M${f(cx - r + 2)} ${f(cy)} H${f(cx + r - 2)} M${f(cx)} ${f(cy - r + 2)} V${f(cy + r - 2)}" stroke="#ffffff" stroke-width="2"/>`;
}

function flowerBox(x: number, y: number, w: number) {
  let s = `<rect x="${f(x - 3)}" y="${f(y)}" width="${w + 6}" height="7" rx="3" fill="#a8674a"/>`;
  if (ctx.snow) return s + `<rect x="${f(x - 4)}" y="${f(y - 4)}" width="${w + 8}" height="6" rx="3" fill="${SNOW}"/>`;
  for (let i = 0; i < 4; i++) s += `<circle cx="${f(x + 3 + (i * (w - 6)) / 3)}" cy="${f(y - 1)}" r="3.8" fill="${["#f08a6a", "#f6d36a", "#e98fb4", "#f6d36a"][i]}"/>`;
  return s;
}

function roundDoor(cx: number, w: number, color: string, base = G + 3) {
  const x = cx - w / 2;
  return `<path d="M${f(x)} ${base} L${f(x)} ${f(base - w * 0.75)} A${w / 2} ${w / 2} 0 0 1 ${f(x + w)} ${f(base - w * 0.75)} L${f(x + w)} ${base} Z" fill="${color}"/><circle cx="${f(x + w - 7)}" cy="${f(base - w * 0.5)}" r="2.4" fill="#f6d36a"/>`;
}

function chimney(x: number, y: number, w: number, h: number) {
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${f(h)}" rx="4" fill="#b9775a"/><rect x="${f(x - 2)}" y="${f(y)}" width="${w + 4}" height="6" rx="3" fill="#a3684f"/>`;
  if (ctx.snow) s += `<rect x="${f(x - 3)}" y="${f(y - 4)}" width="${w + 6}" height="7" rx="3.5" fill="${SNOW}"/>`;
  return s;
}

function shine(d: string) {
  return `<path d="${d}" stroke="#ffffff" stroke-opacity=".3" stroke-width="5" stroke-linecap="round" fill="none"/>`;
}

/** A covered porch in front of a door: deck, two posts, a little roof, a bench and a lantern. */
function porch(cx: number, roofY: number, roofColor: string) {
  const w = 96;
  const x = cx - w / 2;
  let s = `<rect x="${f(x - 6)}" y="${G - 3}" width="${w + 12}" height="9" rx="3" fill="#c9a37a"/>`;
  for (const px of [x, x + w - 6]) s += `<rect x="${f(px)}" y="${f(roofY + 8)}" width="6" height="${f(G - roofY - 10)}" fill="#ffffff"/>`;
  s += cap(`M${f(x - 10)} ${f(roofY + 12)} H${f(x + w + 10)} L${f(x + w)} ${f(roofY - 4)} H${f(x)} Z`, roofColor);
  s += `<path d="M${f(x - 4)} ${f(roofY + 12)} q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0" fill="#ffffff" opacity=".7"/>`;
  // Bench beside the door, and a lantern hanging from the porch roof.
  s += `<rect x="${f(x + w - 30)}" y="${G - 18}" width="26" height="5" rx="2" fill="#9b6b43"/><rect x="${f(x + w - 28)}" y="${G - 14}" width="3" height="12" fill="#7a5340"/><rect x="${f(x + w - 9)}" y="${G - 14}" width="3" height="12" fill="#7a5340"/><rect x="${f(x + w - 30)}" y="${G - 32}" width="26" height="4" rx="2" fill="#9b6b43"/>`;
  glow(x + 14, roofY + 27);
  s += `<path d="M${f(x + 14)} ${f(roofY + 12)} v8" stroke="#7a5a44" stroke-width="1.5"/><ellipse cx="${f(x + 14)}" cy="${f(roofY + 27)}" rx="6" ry="8" fill="#f2b54a"/><ellipse cx="${f(x + 14)}" cy="${f(roofY + 27)}" rx="3" ry="4.5" fill="#fde6a8"/>`;
  return s;
}

/** A small vegetable garden starting at x0: a fence, three rows of sprouts, a watering can. */
function garden(x0 = 14) {
  const o = x0 - 14;
  let s = `<path d="M${14 + o} ${G + 8} H${132 + o}" stroke="#b37a52" stroke-width="2"/>`;
  for (let r = 0; r < 3; r++) {
    const y = G - 2 - r * 11;
    s += `<rect x="${24 + r * 4 + o}" y="${y - 3}" width="${92 - r * 8}" height="7" rx="3.5" fill="#9b6b43" opacity="${0.75 - r * 0.12}"/>`;
    if (ctx.snow) {
      s += `<rect x="${22 + r * 4 + o}" y="${y - 7}" width="${96 - r * 8}" height="6" rx="3" fill="${SNOW}"/>`;
      continue;
    }
    for (let i = 0; i < 6 - r; i++) {
      const x = 32 + r * 4 + i * 15 + o;
      const col = r === 0 ? "#f08a6a" : r === 1 ? "#f6d36a" : "#8fcc76";
      s += `<path d="M${x} ${y - 2} q-5 -7 -8 -6 q3 6 8 6 q5 -7 8 -6 q-3 6 -8 6" fill="#6db35f"/><circle cx="${x}" cy="${y - 2}" r="2.6" fill="${col}"/>`;
    }
  }
  for (let x = 14; x <= 132; x += 13) s += `<rect x="${x + o}" y="${G - 30}" width="7" height="34" rx="3.5" fill="#fffaf0"/>`;
  s += `<rect x="${12 + o}" y="${G - 22}" width="124" height="4" rx="2" fill="#fffaf0"/><rect x="${12 + o}" y="${G - 8}" width="124" height="4" rx="2" fill="#fffaf0"/>`;
  if (ctx.snow) for (let x = 14; x <= 132; x += 13) s += `<ellipse cx="${x + 3.5 + o}" cy="${G - 30}" rx="5" ry="3" fill="${SNOW}"/>`;
  s += `<path d="M${118 + o} ${G + 2} h16 v-12 h-16 Z M${134 + o} ${G - 8} l9 -7" fill="#7fc4dc" stroke="#7fc4dc" stroke-width="3" stroke-linejoin="round"/><path d="M${121 + o} ${G - 10} q5 -8 10 0" fill="none" stroke="#5f9fb8" stroke-width="2"/>`;
  return s;
}

interface Drawn {
  s: string;
  door: number;
  porchY: number;
}

// --- The four ready-made homes ------------------------------------------------------

function cottage(g: Grow, p: Paint): Drawn {
  const x = 150;
  const w = 140;
  const t = g.up ? G - 170 : G - 100;
  const rh = 62;
  let s = "";
  if (g.side) {
    // A side room with a sloping roof, tucked against the right wall.
    s += `<rect x="${x + w - 10}" y="${G - 74}" width="96" height="${74 + 8}" rx="10" fill="${p.wall}"/>`;
    s += cap(`M${x + w - 14} ${G - 92} L${x + w + 98} ${G - 68} L${x + w + 98} ${G - 56} L${x + w - 14} ${G - 76} Z`, p.roof);
    s += win(x + w + 26, G - 58, 36, 30, p.trim) + flowerBox(x + w + 26, G - 26, 36);
  }
  s += chimney(x + w * 0.68, t - rh * 0.85, 18, rh * 0.75);
  s += `<rect x="${x}" y="${t}" width="${w}" height="${G - t + 8}" rx="14" fill="${p.wall}"/>`;
  s += cap(`M${x - 14} ${t + 10} L${x + w / 2} ${t - rh} L${x + w + 14} ${t + 10} Z`, p.roof, `stroke="${p.roof}" stroke-width="14" stroke-linejoin="round"`);
  s += shine(`M${x + 6} ${t - 2} L${x + w / 2 - 8} ${t - rh + 14}`);
  s += round(x + w / 2, t - rh * 0.36, 11);
  if (g.up) {
    s += `<rect x="${x}" y="${G - 100}" width="${w}" height="8" fill="#000" opacity=".06"/>`;
    s += win(x + 22, t + 22, 30, 32, p.trim) + win(x + w - 52, t + 22, 30, 32, p.trim);
  }
  s += win(x + 18, G - 72, 30, 34) + flowerBox(x + 18, G - 36, 30) + win(x + w - 48, G - 72, 30, 34) + flowerBox(x + w - 48, G - 36, 30);
  s += roundDoor(x + w / 2, 36, p.door);
  return { s, door: x + w / 2, porchY: G - 74 };
}

function mushroom(g: Grow, p: Paint): Drawn {
  const cx = 214;
  const sw = 104;
  const sh = g.up ? 150 : 88;
  const t = G - sh;
  let s = "";
  if (g.side) {
    // A small mushroom beside the big one, joined by a low wall.
    const x2 = 340;
    s += `<rect x="${cx + 30}" y="${G - 42}" width="${x2 - cx - 30}" height="50" rx="8" fill="${p.wall}"/>`;
    s += `<rect x="${x2 - 32}" y="${G - 64}" width="64" height="72" rx="22" fill="${p.wall}"/>`;
    s += cap(`M${x2 - 58} ${G - 60} Q${x2 - 58} ${G - 118} ${x2} ${G - 120} Q${x2 + 58} ${G - 118} ${x2 + 58} ${G - 60} Q${x2} ${G - 50} ${x2 - 58} ${G - 60} Z`, p.roof);
    if (!ctx.snow) for (const [dx, dy, r] of [[-26, -84, 7], [8, -102, 9], [32, -78, 6]]) s += `<circle cx="${x2 + dx}" cy="${G + dy}" r="${r}" fill="#fffaf0"/>`;
    s += round(x2, G - 32, 12);
  }
  s += `<rect x="${cx - sw / 2}" y="${t}" width="${sw}" height="${sh + 8}" rx="34" fill="${p.wall}"/>`;
  // The cap: a wide dome with soft white spots.
  const capY = t + 14;
  s += cap(`M${cx - 112} ${capY} Q${cx - 112} ${capY - 112} ${cx} ${capY - 116} Q${cx + 112} ${capY - 112} ${cx + 112} ${capY} Q${cx} ${capY + 20} ${cx - 112} ${capY} Z`, p.roof);
  s += `<path d="M${cx - 100} ${capY + 2} Q${cx} ${capY + 18} ${cx + 100} ${capY + 2}" stroke="#000" stroke-opacity=".1" stroke-width="6" fill="none"/>`;
  for (const [dx, dy, r] of [[-62, -52, 14], [-16, -86, 11], [30, -58, 16], [74, -36, 10], [-88, -18, 8], [8, -30, 7]]) if (!ctx.snow || dy > -40) s += `<circle cx="${cx + dx}" cy="${capY + dy}" r="${r}" fill="#fffaf0"/>`;
  s += shine(`M${cx - 92} ${capY - 30} Q${cx - 74} ${capY - 82} ${cx - 30} ${capY - 98}`);
  if (g.up) s += round(cx - 22, t + 46, 12) + round(cx + 22, t + 46, 12);
  s += win(cx + 18, G - 64, 24, 28) + flowerBox(cx + 18, G - 34, 24);
  s += roundDoor(cx - 18, 34, p.door);
  // A stovepipe through the cap.
  s += `<rect x="${cx + 58}" y="${capY - 86}" width="10" height="34" rx="3" fill="#8a7a6a"/><rect x="${cx + 55}" y="${capY - 90}" width="16" height="7" rx="3" fill="#6f6256"/>`;
  return { s, door: cx - 18, porchY: G - 72 };
}

function burrow(g: Grow, p: Paint): Drawn {
  const cx = 215;
  const grass = ctx.snow ? SNOW : "#8fcc76";
  let s = "";
  if (g.up) {
    // A little lookout room on top of the hill, with a pointed roof and a weathervane.
    const tx = cx + 26;
    const tt = G - 176;
    s += `<rect x="${tx - 30}" y="${tt}" width="60" height="90" rx="12" fill="${p.wall}"/>`;
    s += cap(`M${tx - 40} ${tt + 8} L${tx} ${tt - 52} L${tx + 40} ${tt + 8} Z`, p.roof, `stroke="${p.roof}" stroke-width="8" stroke-linejoin="round"`);
    s += `<path d="M${tx} ${tt - 56} V${tt - 78}" stroke="#7a5a44" stroke-width="2.5"/><path d="M${tx - 10} ${tt - 74} h20 M${tx + 6} ${tt - 78} l5 4 l-5 4" stroke="#7a5a44" stroke-width="2.5" fill="none"/>`;
    s += win(tx - 14, tt + 18, 28, 32, p.trim);
  }
  if (g.side) {
    s += `<path d="M${cx + 60} ${G + 8} Q${cx + 70} ${G - 92} ${cx + 140} ${G - 94} Q${cx + 196} ${G - 92} ${cx + 204} ${G + 8} Z" fill="${ctx.snow ? SNOW : "#7fbf6a"}"/>`;
    s += shine(`M${cx + 92} ${G - 70} Q${cx + 112} ${G - 88} ${cx + 140} ${G - 88}`);
    s += round(cx + 146, G - 38, 15) + `<path d="M${cx + 126} ${G - 18} h40" stroke="#a8674a" stroke-width="6" stroke-linecap="round"/>`;
  }
  // The hill: a grassy mound, a stone doorway and round windows set into it.
  s += `<path d="M${cx - 120} ${G + 8} Q${cx - 112} ${G - 124} ${cx} ${G - 128} Q${cx + 112} ${G - 124} ${cx + 120} ${G + 8} Z" fill="${grass}"/>`;
  if (ctx.snow) s += `<path d="M${cx - 116} ${G + 8} Q${cx - 108} ${G - 60} ${cx - 40} ${G - 70} Q${cx} ${G - 40} ${cx + 116} ${G + 8} Z" fill="#dbe5f1" opacity=".6"/>`;
  s += shine(`M${cx - 84} ${G - 80} Q${cx - 60} ${G - 116} ${cx - 10} ${G - 120}`);
  if (!ctx.snow) for (const [dx, dy, col] of [[-70, -96, "#f08a6a"], [-20, -112, "#f6d36a"], [40, -104, "#e98fb4"], [86, -70, "#fffaf0"], [-96, -40, "#f6d36a"]] as const) s += `<circle cx="${cx + dx}" cy="${G + dy}" r="3.6" fill="${col}"/>`;
  s += `<circle cx="${cx}" cy="${G - 30}" r="34" fill="#c9b9a8"/><circle cx="${cx}" cy="${G - 30}" r="28" fill="${p.wall}"/>`;
  s += `<rect x="${cx - 28}" y="${G - 30}" width="56" height="38" fill="${p.wall}"/>`;
  s += `<circle cx="${cx}" cy="${G - 26}" r="21" fill="${p.door}"/><rect x="${cx - 21}" y="${G - 26}" width="42" height="29" fill="${p.door}"/><circle cx="${cx}" cy="${G - 22}" r="3" fill="#f6d36a"/>`;
  s += round(cx - 72, G - 44, 15) + flowerBox(cx - 85, G - 26, 26) + round(cx + 72, G - 44, 15) + flowerBox(cx + 59, G - 26, 26);
  s += chimney(cx - 40, G - 150, 14, 34);
  return { s, door: cx, porchY: G - 70 };
}

function tower(g: Grow, p: Paint): Drawn {
  const tx = 200;
  const tw = 96;
  const tt = g.up ? G - 196 : G - 128;
  let s = "";
  if (g.side) {
    // A cottage wing on the right with a rounded roof.
    const x = tx + tw - 8;
    s += `<rect x="${x}" y="${G - 78}" width="110" height="86" rx="12" fill="${p.wall}"/>`;
    s += cap(`M${x - 6} ${G - 72} Q${x - 4} ${G - 118} ${x + 55} ${G - 120} Q${x + 114} ${G - 118} ${x + 118} ${G - 72} Z`, p.roof);
    s += win(x + 22, G - 62, 32, 32, p.trim) + flowerBox(x + 22, G - 28, 32) + win(x + 66, G - 62, 32, 32, p.trim);
  }
  s += `<rect x="${tx}" y="${tt}" width="${tw}" height="${G - tt + 8}" rx="18" fill="${p.wall}"/>`;
  // Stones scattered in the wall.
  for (let i = 0; i < Math.floor((G - tt) / 22); i++) s += `<rect x="${tx + 10 + ((i * 31) % (tw - 30))}" y="${tt + 14 + i * 20}" width="18" height="8" rx="4" fill="#000" opacity=".06"/>`;
  s += cap(`M${tx - 12} ${tt + 12} L${tx + tw / 2} ${tt - 78} L${tx + tw + 12} ${tt + 12} Z`, p.roof, `stroke="${p.roof}" stroke-width="10" stroke-linejoin="round"`);
  s += shine(`M${tx + 4} ${tt + 2} L${tx + tw / 2 - 6} ${tt - 64}`);
  s += `<path d="M${tx + tw / 2} ${tt - 82} V${tt - 104}" stroke="#7a5a44" stroke-width="2.5"/><path d="M${tx + tw / 2} ${tt - 104} l20 6 l-20 6 Z" fill="#f6d36a"/>`;
  if (g.up) {
    // A balcony around the upper floor.
    const by = G - 116;
    s += win(tx + tw / 2 - 15, tt + 22, 30, 38, p.trim);
    s += `<rect x="${tx - 14}" y="${by}" width="${tw + 28}" height="7" rx="3" fill="#c9a37a"/>`;
    for (let x = tx - 10; x <= tx + tw + 10; x += 10) s += `<rect x="${x}" y="${by - 18}" width="3" height="18" fill="#ffffff"/>`;
    s += `<rect x="${tx - 14}" y="${by - 21}" width="${tw + 28}" height="4" rx="2" fill="#ffffff"/>`;
  } else {
    s += round(tx + tw / 2, tt + 32, 13);
  }
  s += win(tx + 16, G - 84, 26, 32) + flowerBox(tx + 16, G - 50, 26);
  s += roundDoor(tx + tw - 30, 34, p.door);
  return { s, door: tx + tw - 30, porchY: G - 70 };
}

/** The ready-made styles, with what growing up and out means for each. */
export const STYLES = {
  cottage: { name: "Gable cottage", draw: cottage, up: "Upstairs bedroom", side: "Side room" },
  mushroom: { name: "Mushroom house", draw: mushroom, up: "Taller, with an upstairs", side: "Little mushroom next door" },
  burrow: { name: "Hill burrow", draw: burrow, up: "Lookout on top", side: "Second hill room" },
  tower: { name: "Round tower", draw: tower, up: "Upper floor and balcony", side: "Cottage wing" },
} as const;

// --- Designed part by part ----------------------------------------------------------

const BODY = { cottage: { w: 150, h: 100, rx: 14 }, tall: { w: 124, h: 168, rx: 12 }, long: { w: 214, h: 90, rx: 14 }, round: { w: 126, h: 132, rx: 44 } };

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

function texture(kind: CustomHome["texture"], x: number, t: number, w: number, h: number) {
  let s = "";
  const r = rng(Math.round(x + w));
  if (kind === "planks") for (let y = t + 14; y < t + h; y += 13) s += `<path d="M${x} ${y} H${x + w}" stroke="#000" stroke-opacity=".08" stroke-width="2"/>`;
  if (kind === "stone") for (let i = 0; i < (w * h) / 900; i++) s += `<rect x="${f(x + 6 + r() * (w - 30))}" y="${f(t + 6 + r() * (h - 20))}" width="${f(14 + r() * 10)}" height="${f(8 + r() * 4)}" rx="4" fill="#000" opacity=".07"/>`;
  if (kind === "brick") {
    for (let row = 0, y = t + 4; y < t + h; row++, y += 11) {
      for (let bx = x - (row % 2 ? 11 : 0); bx < x + w; bx += 22) s += `<rect x="${bx + 1}" y="${y}" width="20" height="9" rx="2" fill="#c96e5a" opacity=".22"/>`;
    }
  }
  return s;
}

function customWindow(c: CustomHome, x: number, y: number, w: number, h: number, clip: string) {
  let s = "";
  if (c.shutters && c.window !== "round") s += `<rect x="${f(x - 9)}" y="${y}" width="7" height="${h}" rx="2.5" fill="${c.trim}"/><rect x="${f(x + w + 2)}" y="${y}" width="7" height="${h}" rx="2.5" fill="${c.trim}"/>`;
  switch (c.window) {
    case "round":
      s += round(x + w / 2, y + h / 2, Math.min(w, h) / 2);
      if (c.shutters) s += `<path d="M${f(x + w / 2 - h / 2 - 2)} ${f(y + h / 2)} a${h / 2 + 2} ${h / 2 + 2} 0 0 1 ${h + 4} 0" fill="none" stroke="${c.trim}" stroke-width="5"/>`;
      break;
    case "arch":
      glow(x + w / 2, y + h / 2);
      s += `<path d="M${x} ${y + h} V${f(y + w / 2)} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${f(y + w / 2)} V${y + h} Z" fill="#bfe3ef" stroke="#ffffff" stroke-width="3"/><path d="M${f(x + w / 2)} ${y + 2} V${y + h - 2} M${x + 2} ${f(y + h * 0.6)} H${x + w - 2}" stroke="#ffffff" stroke-width="2.2"/>`;
      break;
    case "diamond": {
      glow(x + w / 2, y + h / 2);
      s += `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/></clipPath><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#bfe3ef"/>`;
      let lines = "";
      for (let k = -h; k < w + h; k += 9) lines += `M${x + k} ${y} l${h} ${h} M${x + k} ${y} l${-h} ${h} `;
      s += `<path d="${lines}" stroke="#ffffff" stroke-width="1.6" clip-path="url(#${clip})"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="#ffffff" stroke-width="3"/>`;
      break;
    }
    default:
      s += win(x, y, w, h);
  }
  if (c.boxes) s += flowerBox(x, y + h + 2, w);
  return s;
}

function customDoor(c: CustomHome, cx: number) {
  const col = c.doorColor;
  switch (c.door) {
    case "square":
      return `<rect x="${cx - 18}" y="${G - 54}" width="36" height="58" rx="5" fill="${col}" stroke="#ffffff" stroke-width="3"/><rect x="${cx - 12}" y="${G - 48}" width="24" height="18" rx="3" fill="#ffffff" opacity=".2"/><circle cx="${cx + 10}" cy="${G - 24}" r="2.6" fill="#f6d36a"/>`;
    case "double":
      return `<path d="M${cx - 26} ${G + 3} V${G - 40} A26 26 0 0 1 ${cx + 26} ${G - 40} V${G + 3} Z" fill="${col}"/><path d="M${cx} ${G - 64} V${G + 3}" stroke="#000" stroke-opacity=".2" stroke-width="2.5"/><circle cx="${cx - 6}" cy="${G - 22}" r="2.4" fill="#f6d36a"/><circle cx="${cx + 6}" cy="${G - 22}" r="2.4" fill="#f6d36a"/>`;
    case "porthole":
      return roundDoor(cx, 38, col) + round(cx, G - 30, 8);
    default:
      return roundDoor(cx, 36, col);
  }
}

/** Roof over a wall from x to x + w whose top is at t: the drawing, its peak, and its height at u (0..1 across). */
function customRoof(c: CustomHome, x: number, w: number, t: number) {
  const cx = x + w / 2;
  const col = c.roofColor;
  switch (c.roof) {
    case "steep": {
      const rh = Math.min(w * 0.85, 118);
      return { s: cap(`M${x - 12} ${t + 10} L${cx} ${t - rh} L${x + w + 12} ${t + 10} Z`, col, `stroke="${col}" stroke-width="12" stroke-linejoin="round"`) + shine(`M${x + 4} ${t} L${cx - 6} ${t - rh + 18}`), peak: [cx, t - rh - 6], at: (u: number) => rh * (1 - Math.abs(2 * u - 1)) };
    }
    case "round": {
      const rh = Math.min(w * 0.42, 64);
      return { s: cap(`M${x - 12} ${t + 8} Q${x - 12} ${t - rh} ${cx} ${t - rh - 2} Q${x + w + 12} ${t - rh} ${x + w + 12} ${t + 8} Z`, col) + shine(`M${x} ${t - 4} Q${x + 6} ${t - rh * 0.7} ${cx - 10} ${t - rh * 0.9}`), peak: [cx, t - rh * 0.98], at: (u: number) => rh * 0.95 * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) };
    }
    case "thatch": {
      // A soft, thick straw roof with layered rows and a scalloped edge.
      const rh = Math.min(w * 0.5, 74);
      let s = cap(`M${x - 18} ${t + 12} Q${x - 18} ${t - rh} ${cx} ${t - rh - 4} Q${x + w + 18} ${t - rh} ${x + w + 18} ${t + 12} Z`, col);
      for (const k of [0.35, 0.65]) s += `<path d="M${f(x - 18 + k * 10)} ${f(t + 12 - rh * k)} Q${cx} ${f(t + 6 - rh * k - 10)} ${f(x + w + 18 - k * 10)} ${f(t + 12 - rh * k)}" fill="none" stroke="#000" stroke-opacity=".1" stroke-width="4"/>`;
      for (let ex = x - 14; ex <= x + w + 14; ex += 14) s += `<circle cx="${ex}" cy="${t + 12}" r="8" fill="${col}"/>`;
      return { s: s + shine(`M${x - 4} ${t - 6} Q${x + 2} ${t - rh * 0.7} ${cx - 10} ${t - rh * 0.92}`), peak: [cx, t - rh], at: (u: number) => rh * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) };
    }
    case "flat": {
      // A flat roof with a little terrace: a railing and a potted tree.
      let s = cap(`M${x - 10} ${t - 6} Q${x - 10} ${t - 12} ${x - 4} ${t - 12} H${x + w + 4} Q${x + w + 10} ${t - 12} ${x + w + 10} ${t - 6} V${t + 2} Q${x + w + 10} ${t + 8} ${x + w + 4} ${t + 8} H${x - 4} Q${x - 10} ${t + 8} ${x - 10} ${t + 2} Z`, col);
      for (let px = x - 4; px <= x + w + 4; px += 11) s += `<rect x="${px}" y="${t - 30}" width="3" height="18" fill="#ffffff"/>`;
      s += `<rect x="${x - 6}" y="${t - 33}" width="${w + 12}" height="4" rx="2" fill="#ffffff"/>`;
      s += `<rect x="${x + 16}" y="${t - 26}" width="16" height="14" rx="3" fill="#c97b6a"/><circle cx="${x + 24}" cy="${t - 36}" r="13" fill="${ctx.snow ? SNOW : "#7fbf6a"}"/><circle cx="${x + 20}" cy="${t - 40}" r="6" fill="${ctx.snow ? "#dbe5f1" : "#9fd486"}"/>`;
      return { s, peak: [x + w - 18, t - 34], at: () => 12 };
    }
    default: {
      const rh = Math.min(w * 0.42, 66);
      return { s: cap(`M${x - 14} ${t + 10} L${cx} ${t - rh} L${x + w + 14} ${t + 10} Z`, col, `stroke="${col}" stroke-width="14" stroke-linejoin="round"`) + shine(`M${x + 6} ${t - 2} L${cx - 8} ${t - rh + 14}`), peak: [cx, t - rh - 7], at: (u: number) => rh * (1 - Math.abs(2 * u - 1)) };
    }
  }
}

function topper(c: CustomHome, px: number, py: number) {
  switch (c.topper) {
    case "weathervane":
      return `<path d="M${px} ${py} V${py - 24}" stroke="#7a5a44" stroke-width="2.5"/><path d="M${px - 11} ${py - 19} h22 M${px + 7} ${py - 23} l5 4 l-5 4" stroke="#7a5a44" stroke-width="2.5" fill="none"/><circle cx="${px}" cy="${py - 25}" r="2.5" fill="#7a5a44"/>`;
    case "flag":
      return `<path d="M${px} ${py} V${py - 30}" stroke="#7a5a44" stroke-width="2.5"/><path d="M${px} ${py - 30} q10 -4 20 2 q-10 4 -20 10 Z" fill="${c.doorColor}"/>`;
    case "lantern":
      glow(px + 10, py - 10);
      return `<path d="M${px} ${py} V${py - 26} h10 v6" stroke="#7a5a44" stroke-width="2.5" fill="none"/><circle cx="${px + 10}" cy="${py - 10}" r="13" fill="#f2b54a" opacity=".25"/><ellipse cx="${px + 10}" cy="${py - 10}" rx="7" ry="9" fill="#e9583c"/><path d="M${px + 4} ${py - 10} h12 M${px + 5} ${py - 14} h10 M${px + 5} ${py - 6} h10" stroke="#f2b54a" stroke-width="1.2"/><rect x="${px + 7}" y="${py - 1}" width="6" height="3" rx="1" fill="#7a5a44"/>`;
    default:
      return "";
  }
}

function custom(c: CustomHome, g: Grow): Drawn {
  const id = `hm${uid++}`;
  const b = BODY[c.body];
  // Growing up adds a floor to the main house.
  const h = b.h + (g.up ? 66 : 0);
  const x = c.body === "long" ? (g.side ? 116 : 146) : 236 - b.w / 2 - (g.side ? 30 : 0);
  const t = G - h;
  const roofOut = customRoof(c, x, b.w, t);
  const door = c.body === "long" ? x + b.w * 0.36 : x + b.w / 2;
  let s = "";
  if (g.side) {
    // A side room on the right in the same walls, with a sloping roof.
    const sx = x + b.w - 10;
    s += `<clipPath id="${id}s"><rect x="${sx}" y="${G - 74}" width="94" height="82" rx="10"/></clipPath>`;
    s += `<rect x="${sx}" y="${G - 74}" width="94" height="82" rx="10" fill="${c.wall}"/><g clip-path="url(#${id}s)">${texture(c.texture, sx, G - 74, 94, 82)}</g>`;
    s += cap(`M${sx - 4} ${G - 92} L${sx + 108} ${G - 68} L${sx + 108} ${G - 56} L${sx - 4} ${G - 76} Z`, c.roofColor);
    s += customWindow(c, sx + 34, G - 58, 30, 28, `${id}sw`);
  }
  if (c.chimney !== "none") {
    const u = 0.74;
    const top = t - roofOut.at(u) - 26;
    const cxp = x + b.w * u;
    s += c.chimney === "brick" ? chimney(cxp - 9, top, 18, t - top + 10) : `<rect x="${cxp - 5}" y="${top}" width="10" height="${t - top + 10}" rx="3" fill="#8a7a6a"/><rect x="${cxp - 8}" y="${top - 4}" width="16" height="7" rx="3" fill="#6f6256"/>`;
  }
  s += `<clipPath id="${id}w"><rect x="${x}" y="${t}" width="${b.w}" height="${h + 8}" rx="${b.rx}"/></clipPath>`;
  s += `<rect x="${x}" y="${t}" width="${b.w}" height="${h + 8}" rx="${b.rx}" fill="${c.wall}"/>`;
  s += `<g clip-path="url(#${id}w)">${texture(c.texture, x, t, b.w, h + 8)}</g>`;
  s += roofOut.s;
  if (c.roof === "gable" || c.roof === "steep") s += round(x + b.w / 2, t - 24, 10);

  // Windows: a ground-floor row either side of the door, and upper rows on taller homes.
  const ww = 28;
  const wh = c.window === "round" ? 28 : 32;
  let n = 0;
  const w1 = (wx: number, y: number) => customWindow(c, wx, y, ww, wh, `${id}d${n++}`);
  const row = (y: number, ground: boolean) => {
    if (c.body === "long") return w1(x + 18, y) + w1(x + b.w * 0.58, y) + w1(x + b.w - 18 - ww, y) + (ground ? "" : w1(x + b.w * 0.36 - ww / 2, y));
    if (c.body === "round") return w1(x + 14, y) + w1(x + b.w - 14 - ww, y);
    return w1(x + 20, y) + w1(x + b.w - 20 - ww, y);
  };
  s += row(G - 74, true);
  if (g.up) s += row(G - 140, false);
  if (c.body === "tall") s += w1(x + 20, t + 26) + w1(x + b.w - 20 - ww, t + 26);
  if (c.body === "round") s += w1(x + b.w / 2 - ww / 2, t + 22);
  s += customDoor(c, door);
  s += topper(c, roofOut.peak[0], roofOut.peak[1]);
  return { s, door, porchY: G - 76 };
}

// --- The whole home -------------------------------------------------------------------

function grow(home: HomeChoice): Grow {
  return { up: hasAddition(home, "up"), side: hasAddition(home, "side"), porch: hasAddition(home, "porch"), garden: hasAddition(home, "garden") };
}

/**
 * The home and its additions, in home units, without sky or ground. The garden sits to
 * the left in the panels; on the lane there's a neighbor there, so it goes in front.
 */
export function homeMarkup(home: HomeChoice, opts: DrawCtx & { gardenInFront?: boolean } = {}): { svg: string; door: number } {
  ctx = opts;
  try {
    const g = grow(home);
    const drawn = home.kind === "custom" ? custom(home.custom, g) : STYLES[home.style].draw(g, PAINTS[home.paint]);
    let s = "";
    if (g.garden && !opts.gardenInFront) s += garden();
    s += drawn.s;
    const roof = home.kind === "custom" ? home.custom.roofColor : PAINTS[home.paint].roof;
    if (g.porch) s += porch(drawn.door, drawn.porchY, roof);
    if (g.garden && opts.gardenInFront) s += garden(drawn.door + (g.porch ? 64 : 34));
    return { svg: s, door: drawn.door };
  } finally {
    ctx = {};
  }
}

/** The home in a sunny meadow, for the customization panels. `extra` is drawn on top (the player). */
export function homeSceneSVG(home: HomeChoice, extra?: (door: number) => string): string {
  const id = `sky${uid++}`;
  const { svg, door } = homeMarkup(home);
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9dcf0"/><stop offset=".5" stop-color="#bfe6f4"/><stop offset="1" stop-color="#f3f8ea"/></linearGradient></defs>`;
  // The sky reaches well above the frame, for homes tall enough to need it (see fitHomeSVG).
  s += `<rect y="-300" width="${HOME_W}" height="${HOME_H + 300}" fill="url(#${id})"/>`;
  s += `<ellipse cx="70" cy="${G - 4}" rx="140" ry="40" fill="#b9e0a2"/><ellipse cx="380" cy="${G - 2}" rx="160" ry="36" fill="#b9e0a2"/>`;
  s += `<rect y="${G}" width="${HOME_W}" height="${HOME_H - G}" fill="#9fd486"/><rect y="${G}" width="${HOME_W}" height="6" fill="#8bc674"/>`;
  s += `<path d="M${door - 20} ${G + 4} Q${door - 10} ${HOME_H - 20} ${door - 50} ${HOME_H} H${door + 50} Q${door + 10} ${HOME_H - 20} ${door + 20} ${G + 4} Z" fill="#ecd9b4"/>`;
  s += `<g class="home">${svg}</g>` + (extra ? extra(door) : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${HOME_W} ${HOME_H}" role="img" aria-hidden="true">${s}</svg>`;
}

/** Once a home picture is on the page, open its frame upward if the home is taller than it. */
export function fitHomeSVG(svg: SVGSVGElement | null): void {
  const home = svg?.querySelector<SVGGraphicsElement>(".home");
  if (!svg || !home) return;
  const top = Math.min(0, home.getBBox().y - 12);
  svg.setAttribute("viewBox", `0 ${f(top)} ${HOME_W} ${f(HOME_H - top)}`);
}
