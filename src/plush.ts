// Character art: round, plush animal villagers, drawn as SVG markup. Used for
// the game's character textures and for dialogue portraits. Each villager has
// their own face; a feeling lays its eyes, brows, mouth, cheeks and a small
// sign over that face. Feet sit at (0, 0); the head is centered at (0, -50).

import type { CharacterId, Expression } from "./cast";

const f = (n: number) => Math.round(n * 100) / 100;
const INK = "#2a1c16";

// --- Animals --------------------------------------------------------------------

type Ears = "pointy" | "leaf" | "tiny" | "round" | "bigRound" | "floppy" | "long" | "fluffy";
type Tail = "ringed" | "puff" | "flat" | "stub" | "thin" | "brush" | "curl";
type Pattern = "none" | "redpanda" | "badger" | "wool" | "cheeks" | "mask";

export interface Species {
  nosePlus?: number;
  ears: Ears;
  tail: Tail;
  pattern: Pattern;
  fur: string;
  fur2: string;
  feet: string;
  inner: string;
  nose: string;
  ring?: string;
  face?: string;
  horns?: string;
  beard?: boolean;
  muzzle?: { rx: number; ry: number; dy?: number };
}

export const SPECIES: Record<string, Species> = {
  fox: { ears: "pointy", tail: "brush", pattern: "cheeks", fur: "#e07a3c", fur2: "#fbf1e2", feet: "#4a2e24", inner: "#4a2e24", nose: "#2a1c16" },
  cat: { ears: "pointy", tail: "curl", pattern: "none", fur: "#9aa0ab", fur2: "#f1ede8", feet: "#9aa0ab", inner: "#f2b5b8", nose: "#e58a92", muzzle: { rx: 0.34, ry: 0.24 } },
  bunny: { ears: "long", tail: "puff", pattern: "none", fur: "#f4ede4", fur2: "#ffffff", feet: "#e9ddd0", inner: "#f4b9c0", nose: "#e58a92" },
  raccoon: { ears: "pointy", tail: "ringed", pattern: "mask", fur: "#8f8a86", fur2: "#f3efe9", feet: "#3a3634", inner: "#3a3634", nose: "#1e1a18", ring: "#4a4542" },
  koala: { ears: "fluffy", tail: "stub", pattern: "none", fur: "#a9adb5", fur2: "#e8e8ec", feet: "#7d8189", inner: "#f3f1ee", nose: "#3a3638", nosePlus: 1.9, muzzle: { rx: 0.3, ry: 0.2, dy: 0.4 } },
  redpanda: { ears: "pointy", tail: "ringed", pattern: "redpanda", fur: "#c8582e", fur2: "#f7ecdc", feet: "#3a2420", inner: "#f7ecdc", nose: "#2a1c16", ring: "#7e2f17" },
  deer: { ears: "leaf", tail: "puff", pattern: "none", fur: "#b9875a", fur2: "#f5e6cf", feet: "#5a3d2a", inner: "#efc6ad", nose: "#3a2a22" },
  otter: { ears: "tiny", tail: "flat", pattern: "none", fur: "#8a5a3b", fur2: "#ecd6b2", feet: "#5e3b26", inner: "#5e3b26", nose: "#2a1c16", muzzle: { rx: 0.56, ry: 0.32 } },
  goat: { ears: "leaf", tail: "stub", pattern: "none", fur: "#dccbb1", fur2: "#fbf3e6", feet: "#6b5a48", inner: "#eab7a6", nose: "#7a5a4a", horns: "#a8916f", beard: true },
  badger: { ears: "tiny", tail: "stub", pattern: "badger", fur: "#6f6964", fur2: "#f7f2ea", feet: "#2e2a28", inner: "#2e2a28", nose: "#1e1a18" },
  mouse: { ears: "bigRound", tail: "thin", pattern: "none", fur: "#b9a497", fur2: "#f3e6da", feet: "#b9a497", inner: "#f2a7a9", nose: "#e1858b" },
  sheep: { ears: "floppy", tail: "puff", pattern: "wool", fur: "#f6efe3", fur2: "#f6efe3", face: "#d3b394", feet: "#5a4638", inner: "#c49a80", nose: "#6a4a3a" },
  bear: { ears: "round", tail: "stub", pattern: "none", fur: "#6f4c34", fur2: "#d2ab82", feet: "#4a3222", inner: "#d2ab82", nose: "#2a1c16" },
  // Ash's mother: the same bear, lighter and touched with grey.
  greybear: { ears: "round", tail: "stub", pattern: "none", fur: "#9a7a62", fur2: "#e3cdb4", feet: "#5e4636", inner: "#e3cdb4", nose: "#2a1c16" },
  // Tobin's dad: the same otter, with a greyed muzzle.
  greyotter: { ears: "tiny", tail: "flat", pattern: "none", fur: "#7a5640", fur2: "#d9d2c6", feet: "#4e3322", inner: "#4e3322", nose: "#2a1c16", muzzle: { rx: 0.58, ry: 0.33 } },
  hare: { ears: "long", tail: "puff", pattern: "none", fur: "#cdc6bc", fur2: "#f7f3ec", feet: "#9c9389", inner: "#e9b9b4", nose: "#c48486" },
};

// --- The cast: animal, clothes, size ---------------------------------------------

type Extra =
  | "satchel" | "scarf" | "clipboard" | "apron" | "cap" | "toque" | "bow" | "shawl" | "cane" | "flower" | "glasses"
  | "lapels" | "pearls" | "pillbox" | "oilskin" | "souwester" | "cardigan" | "cape" | "nursecap"
  | "dress" | "overalls" | "sweater" | "hoodie" | "beanie" | "sunhat" | "flowercrown" | "bowtie";

export interface Look {
  /** Overrides the species' fur colors (customization). */
  furs?: { fur: string; fur2: string; ring?: string; feet?: string };
  species: string;
  outfit: string;
  accent: string;
  extras: Extra[];
  scale: number;
  build: number;
  hat?: string;
  /** How far above the head's center the portrait starts, in head radii (default 1.65). */
  crown?: number;
}

export const LOOKS: Record<CharacterId, Look> = {
  you: { species: "redpanda", outfit: "#e0b04a", accent: "#9c6b1f", extras: ["satchel"], scale: 1, build: 1 },
  mara: { species: "deer", outfit: "#5f95bf", accent: "#e9583c", extras: ["scarf", "clipboard"], scale: 1, build: 1 },
  tobin: { species: "otter", outfit: "#7f9152", accent: "#b9874d", extras: ["apron", "cap"], scale: 1.04, build: 1.05, hat: "#4f5d33" },
  wren: { species: "goat", outfit: "#c47e52", accent: "#f6f1e7", extras: ["apron", "toque"], scale: 1.1, build: 0.95 },
  oda: { species: "badger", outfit: "#a3644a", accent: "#f6f1e7", extras: ["apron"], scale: 0.92, build: 1.2 },
  pip: { species: "mouse", outfit: "#d27a8f", accent: "#ffd27a", extras: [], scale: 0.66, build: 1 },
  juno: { species: "mouse", outfit: "#e0b04a", accent: "#5f95bf", extras: ["bow"], scale: 0.74, build: 0.95 },
  nell: { species: "sheep", outfit: "#6f5a7e", accent: "#a6455a", extras: ["shawl", "cane", "flower"], scale: 0.92, build: 1 },
  ash: { species: "bear", outfit: "#4f7d72", accent: "#e7c35a", extras: ["glasses", "scarf"], scale: 1, build: 0.95 },
  iris: { species: "greybear", outfit: "#5a2f4c", accent: "#3b1d31", extras: ["lapels", "pearls", "pillbox"], scale: 1.02, build: 0.92, hat: "#3b1d31" },
  fen: { species: "greyotter", outfit: "#e9b824", accent: "#a87b10", extras: ["oilskin", "souwester"], scale: 1.06, build: 1.12, hat: "#f2c531" },
  hesketh: { species: "hare", outfit: "#8a4048", accent: "#efe6d2", extras: ["cardigan", "glasses"], scale: 0.9, build: 1, crown: 2.05 },
  hettie: { species: "mouse", outfit: "#b3d0ea", accent: "#2c3a63", extras: ["cape", "nursecap"], scale: 0.96, build: 0.95 },
};

// --- Faces and feelings ----------------------------------------------------------

type Eye = "round" | "oval" | "almond" | "small" | "sparkle" | "sleepy" | "calm" | "happy" | "line" | "wide" | "narrow" | "down" | "droopy";
type Brow = "soft" | "worried" | "raised" | "thick" | "fret" | "serious" | "cross" | "high";
type Mouth = "w" | "smile" | "polite" | "grin" | "flat" | "broad" | "toothy" | "o" | "frown" | "pout" | "wobble" | "open" | "openSmile" | "bigO";
type Mark = "sparkle" | "tear" | "sweat" | "puff" | "exclaim" | "zzz" | "blushLines";
export type Motion = "breathe" | "bounce" | "laugh" | "sink" | "stomp" | "hop" | "shiver" | "sway" | "shrink" | "droop";

export interface Face {
  eye?: Eye;
  brow?: Brow;
  mouth?: Mouth;
  spread?: number;
  headW?: number;
  headH?: number;
  blush?: number;
  lashes?: boolean;
  freckles?: boolean;
  lines?: boolean;
  /** Big white eyebrows, kept whatever the feeling. */
  bushy?: boolean;
  /** Soft shadows under the eyes. */
  bags?: boolean;
  blink?: boolean;
}

/** Each villager's own calm face. */
export const FACES: Record<CharacterId, Face> = {
  you: { eye: "oval", mouth: "w", headW: 1.06, headH: 1, blush: 0.6 },
  mara: { eye: "almond", lashes: true, brow: "worried", mouth: "smile", headW: 0.98, headH: 1.08, blush: 0.5 },
  tobin: { eye: "small", spread: 0.46, brow: "raised", mouth: "grin", freckles: true, headW: 1.16, headH: 0.94, blush: 0.45 },
  wren: { eye: "oval", brow: "fret", mouth: "flat", headW: 0.92, headH: 1.14, blush: 0.35 },
  oda: { eye: "small", spread: 0.48, brow: "thick", mouth: "broad", headW: 1.2, headH: 0.92, blush: 0.55 },
  pip: { eye: "sparkle", spread: 0.4, mouth: "toothy", freckles: true, headW: 1.08, headH: 1, blush: 0.95 },
  juno: { eye: "round", brow: "serious", mouth: "o", headW: 1, headH: 1.04, blush: 0.4 },
  nell: { eye: "sleepy", mouth: "smile", lines: true, headW: 1.04, headH: 1, blush: 0.45 },
  ash: { eye: "calm", brow: "soft", mouth: "smile", headW: 1.1, headH: 0.98, blush: 0.3 },
  iris: { eye: "almond", lashes: true, brow: "raised", mouth: "polite", spread: 0.4, headW: 1.02, headH: 1.04, blush: 0.2 },
  fen: { eye: "happy", brow: "raised", mouth: "grin", freckles: true, lines: true, spread: 0.46, headW: 1.2, headH: 0.96, blush: 0.5 },
  hesketh: { eye: "small", brow: "soft", mouth: "smile", bushy: true, lines: true, spread: 0.4, headW: 1, headH: 1.02, blush: 0.4 },
  hettie: { eye: "calm", brow: "worried", mouth: "smile", bags: true, headW: 1.02, headH: 1.04, blush: 0.4 },
};

interface Feeling {
  eye?: Eye;
  brow?: Brow;
  mouth?: Mouth;
  blush?: number;
  mark?: Mark;
  motion: Motion;
  /** Mouth shape while talking. */
  talk?: Mouth;
}

/** How each feeling changes a face and moves the body. CLINICIAN REVIEW: signs for sad and embarrassed. */
export const FEELINGS: Record<Expression, Feeling> = {
  neutral: { motion: "breathe" },
  happy: { eye: "happy", brow: "soft", mouth: "broad", blush: 0.25, mark: "sparkle", motion: "bounce", talk: "openSmile" },
  laughing: { eye: "happy", brow: "raised", mouth: "grin", blush: 0.3, mark: "sparkle", motion: "laugh", talk: "grin" },
  warm: { eye: "happy", brow: "soft", mouth: "smile", blush: 0.2, motion: "breathe" },
  surprised: { eye: "wide", brow: "high", mouth: "bigO", mark: "exclaim", motion: "hop", talk: "bigO" },
  worried: { brow: "worried", mouth: "flat", mark: "sweat", motion: "sway" },
  sad: { eye: "droopy", brow: "worried", mouth: "frown", blush: -0.2, mark: "tear", motion: "sink" },
  upset: { eye: "narrow", brow: "cross", mouth: "pout", blush: 0.1, mark: "puff", motion: "stomp" },
  scared: { eye: "wide", brow: "worried", mouth: "wobble", blush: -0.3, mark: "sweat", motion: "shiver" },
  embarrassed: { eye: "down", brow: "worried", mouth: "wobble", blush: 0.7, mark: "blushLines", motion: "shrink" },
  tired: { eye: "calm", brow: "soft", mouth: "flat", mark: "zzz", motion: "droop" },
};

// The drawing's proportions (the "Classic plush" style).
export const S = { headR: 24, headY: -50, bodyTop: -34, legH: 6, bodyW: 32, eyeSpread: 0.42, eyeY: 0.1, blush: 0.6, arm: 0.85 };

/** The SVG viewBox every character texture uses, and where the feet sit in it. */
export const VIEWBOX = { x: -46, y: -122, w: 92, h: 128 };
export const FEET = { x: 0.5, y: -VIEWBOX.y / VIEWBOX.h };

export type Frame = "closed" | "open" | "blink";

function faceFor(own: Face, expr: Expression, frame: Frame): Face {
  const F = FEELINGS[expr];
  const face: Face =
    expr === "neutral"
      ? { ...own }
      : { ...own, eye: F.eye ?? own.eye, brow: F.brow ?? own.brow, mouth: F.mouth ?? own.mouth, blush: Math.max(0, Math.min(1, (own.blush ?? 0.5) + (F.blush ?? 0))) };
  if (frame === "open") face.mouth = F.talk ?? "open";
  if (frame === "blink" && face.eye !== "happy" && face.eye !== "sleepy") face.blink = true;
  return face;
}

// --- Drawing helpers ------------------------------------------------------------

function bodyShape(bw: number, top: number, bh: number, fill: string) {
  return `<ellipse cx="0" cy="${f(top + bh / 2)}" rx="${f(bw / 2)}" ry="${f(bh / 2 + 2)}" fill="${fill}"/>`;
}

function tailSVG(sp: Species, bw: number, top: number, bot: number, k: number) {
  const bx = bw * 0.4;
  const by = bot - (bot - top) * 0.3;
  switch (sp.tail) {
    case "ringed": {
      let s = "";
      for (let i = 5; i >= 0; i--) {
        const t = i / 5;
        const cx = bx + 30 * k;
        const cy = by + 2 * k;
        const ex = bx + 20 * k;
        const ey = by - 30 * k;
        const x = (1 - t) ** 2 * bx + 2 * (1 - t) * t * cx + t * t * ex;
        const y = (1 - t) ** 2 * by + 2 * (1 - t) * t * cy + t * t * ey;
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f((7 - t) * k)}" fill="${i % 2 ? sp.ring : sp.fur}"/>`;
      }
      return s;
    }
    case "puff":
      return `<circle cx="${f(bx + k)}" cy="${f(by + 4 * k)}" r="${f(6 * k)}" fill="${sp.fur2}"/>`;
    case "flat":
      return `<ellipse cx="${f(bx + 9 * k)}" cy="${f(by + 8 * k)}" rx="${f(14 * k)}" ry="${f(4.5 * k)}" transform="rotate(28 ${f(bx + 9 * k)} ${f(by + 8 * k)})" fill="${sp.fur}"/>`;
    case "thin":
      return `<path d="M${f(bx)} ${f(by)} Q${f(bx + 24 * k)} ${f(by + 8 * k)} ${f(bx + 22 * k)} ${f(by - 18 * k)}" fill="none" stroke="${sp.fur}" stroke-width="${f(2.6 * k)}" stroke-linecap="round"/>`;
    case "brush": {
      // A big bushy fox tail swept up behind, with a white tip.
      const d = `M${f(bx - 2 * k)} ${f(by + 6 * k)} Q${f(bx + 30 * k)} ${f(by + 8 * k)} ${f(bx + 26 * k)} ${f(by - 26 * k)} Q${f(bx + 14 * k)} ${f(by - 14 * k)} ${f(bx - 2 * k)} ${f(by - 4 * k)} Z`;
      return `<path d="${d}" fill="${sp.fur}"/><ellipse cx="${f(bx + 25 * k)}" cy="${f(by - 22 * k)}" rx="${f(6 * k)}" ry="${f(7.5 * k)}" transform="rotate(20 ${f(bx + 25 * k)} ${f(by - 22 * k)})" fill="${sp.fur2}"/>`;
    }
    case "curl":
      return `<path d="M${f(bx)} ${f(by + 4 * k)} Q${f(bx + 22 * k)} ${f(by + 6 * k)} ${f(bx + 20 * k)} ${f(by - 16 * k)} Q${f(bx + 19 * k)} ${f(by - 26 * k)} ${f(bx + 12 * k)} ${f(by - 24 * k)}" fill="none" stroke="${sp.fur}" stroke-width="${f(5 * k)}" stroke-linecap="round"/>`;
    default:
      return `<circle cx="${f(bx + 2 * k)}" cy="${f(by + 3 * k)}" r="${f(4 * k)}" fill="${sp.fur}"/>`;
  }
}

function earsSVG(sp: Species, R: number, hy: number) {
  let s = "";
  for (const d of [-1, 1]) {
    switch (sp.ears) {
      case "pointy": {
        const p = [[d * R * 0.22, hy - R * 0.72], [d * R * 0.9, hy - R * 0.3], [d * R * 0.7, hy - R * 1.38]];
        const cx = (p[0][0] + p[1][0] + p[2][0]) / 3;
        const cy = (p[0][1] + p[1][1] + p[2][1]) / 3;
        const q = p.map(([x, y]) => [cx + (x - cx) * 0.5, cy + (y - cy) * 0.5 - R * 0.04]);
        s += `<path d="M${p.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z" fill="${sp.fur}"/>`;
        s += `<path d="M${q.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z" fill="${sp.inner}"/>`;
        break;
      }
      case "round":
        s += `<circle cx="${f(d * R * 0.72)}" cy="${f(hy - R * 0.72)}" r="${f(R * 0.36)}" fill="${sp.fur}"/><circle cx="${f(d * R * 0.72)}" cy="${f(hy - R * 0.72)}" r="${f(R * 0.19)}" fill="${sp.inner}"/>`;
        break;
      case "bigRound":
        s += `<circle cx="${f(d * R * 0.86)}" cy="${f(hy - R * 0.62)}" r="${f(R * 0.56)}" fill="${sp.fur}"/><circle cx="${f(d * R * 0.86)}" cy="${f(hy - R * 0.6)}" r="${f(R * 0.36)}" fill="${sp.inner}"/>`;
        break;
      case "leaf":
        s += `<ellipse cx="${f(d * R * 1.02)}" cy="${f(hy - R * 0.42)}" rx="${f(R * 0.5)}" ry="${f(R * 0.22)}" transform="rotate(${-d * 25} ${f(d * R * 1.02)} ${f(hy - R * 0.42)})" fill="${sp.fur}"/>` +
          `<ellipse cx="${f(d * R * 1.05)}" cy="${f(hy - R * 0.43)}" rx="${f(R * 0.3)}" ry="${f(R * 0.1)}" transform="rotate(${-d * 25} ${f(d * R * 1.05)} ${f(hy - R * 0.43)})" fill="${sp.inner}"/>`;
        break;
      case "floppy":
        s += `<ellipse cx="${f(d * R)}" cy="${f(hy + R * 0.02)}" rx="${f(R * 0.44)}" ry="${f(R * 0.2)}" transform="rotate(${d * 30} ${f(d * R)} ${f(hy + R * 0.02)})" fill="${sp.face}"/>`;
        break;
      case "long": {
        // Tall hare ears whose tips droop outward.
        const path = `M${f(d * R * 0.3)} ${f(hy - R * 0.55)} Q${f(d * R * 0.42)} ${f(hy - R * 1.75)} ${f(d * R * 1.0)} ${f(hy - R * 1.42)}`;
        s += `<path d="${path}" fill="none" stroke="${sp.fur}" stroke-width="${f(R * 0.38)}" stroke-linecap="round"/>`;
        s += `<path d="${path}" fill="none" stroke="${sp.inner}" stroke-width="${f(R * 0.16)}" stroke-linecap="round" stroke-dasharray="${f(R * 1.2)} ${f(R * 4)}" stroke-dashoffset="${f(-R * 0.25)}"/>`;
        break;
      }
      case "fluffy":
        // Big round koala ears with a pale fluffy middle.
        s += `<circle cx="${f(d * R * 0.95)}" cy="${f(hy - R * 0.5)}" r="${f(R * 0.5)}" fill="${sp.fur}"/>`;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          s += `<circle cx="${f(d * R * 1.0 + Math.cos(a) * R * 0.14)}" cy="${f(hy - R * 0.5 + Math.sin(a) * R * 0.14)}" r="${f(R * 0.15)}" fill="${sp.inner}"/>`;
        }
        break;
      case "tiny":
        s += `<circle cx="${f(d * R * 0.8)}" cy="${f(hy - R * 0.6)}" r="${f(R * 0.21)}" fill="${sp.fur}"/><circle cx="${f(d * R * 0.8)}" cy="${f(hy - R * 0.6)}" r="${f(R * 0.1)}" fill="${sp.inner}"/>`;
        break;
    }
  }
  if (sp.horns) {
    for (const d of [-1, 1]) {
      s += `<ellipse cx="${f(d * R * 0.36)}" cy="${f(hy - R * 1.02)}" rx="${f(R * 0.12)}" ry="${f(R * 0.3)}" transform="rotate(${d * 22} ${f(d * R * 0.36)} ${f(hy - R * 1.02)})" fill="${sp.horns}"/>`;
    }
  }
  return s;
}

function eyeSVG(kind: Eye, d: number, x: number, y: number, R: number, lashes?: boolean) {
  const glint = (dx: number, dy: number, r: number) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(r)}" fill="#ffffff"/>`;
  switch (kind) {
    case "oval":
      return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(R * 0.09)}" ry="${f(R * 0.14)}" fill="${INK}"/>` + glint(R * 0.03, -R * 0.05, R * 0.035);
    case "almond":
      return `<path d="M${f(x - R * 0.13)} ${f(y)} Q${f(x)} ${f(y - R * 0.16)} ${f(x + R * 0.13)} ${f(y)} Q${f(x)} ${f(y + R * 0.13)} ${f(x - R * 0.13)} ${f(y)} Z" fill="${INK}"/>` +
        glint(R * 0.03, -R * 0.04, R * 0.03) +
        (lashes ? `<path d="M${f(x + d * R * 0.12)} ${f(y - R * 0.03)} l${f(d * R * 0.09)} ${f(-R * 0.06)}" stroke="${INK}" stroke-width="${f(R * 0.04)}" stroke-linecap="round"/>` : "");
    case "small":
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.07)}" fill="${INK}"/>` + glint(R * 0.02, -R * 0.03, R * 0.022);
    case "sparkle":
      return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(R * 0.13)}" ry="${f(R * 0.15)}" fill="${INK}"/>` + glint(R * 0.045, -R * 0.055, R * 0.05) + glint(-R * 0.04, R * 0.06, R * 0.025);
    case "sleepy":
    case "happy":
      return `<path d="M${f(x - R * 0.12)} ${f(y + R * 0.03)} Q${f(x)} ${f(y - R * 0.13)} ${f(x + R * 0.12)} ${f(y + R * 0.03)}" fill="none" stroke="${INK}" stroke-width="${f(R * 0.055)}" stroke-linecap="round"/>`;
    case "line":
      return `<path d="M${f(x - R * 0.1)} ${f(y + R * 0.01)} H${f(x + R * 0.1)}" stroke="${INK}" stroke-width="${f(R * 0.05)}" stroke-linecap="round"/>`;
    case "wide":
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.15)}" fill="#ffffff" stroke="${INK}" stroke-width="${f(R * 0.035)}"/><circle cx="${f(x)}" cy="${f(y + R * 0.01)}" r="${f(R * 0.065)}" fill="${INK}"/>` + glint(R * 0.02, -R * 0.02, R * 0.02);
    case "narrow":
      return `<path d="M${f(x - R * 0.11)} ${f(y - R * 0.02)} H${f(x + R * 0.11)} Q${f(x + R * 0.1)} ${f(y + R * 0.08)} ${f(x)} ${f(y + R * 0.08)} Q${f(x - R * 0.1)} ${f(y + R * 0.08)} ${f(x - R * 0.11)} ${f(y - R * 0.02)} Z" fill="${INK}"/>`;
    case "down":
      return `<circle cx="${f(x - d * R * 0.02)}" cy="${f(y + R * 0.05)}" r="${f(R * 0.08)}" fill="${INK}"/><path d="M${f(x - R * 0.12)} ${f(y - R * 0.03)} Q${f(x)} ${f(y - R * 0.07)} ${f(x + R * 0.12)} ${f(y - R * 0.03)}" fill="none" stroke="${INK}" stroke-width="${f(R * 0.045)}" stroke-linecap="round"/>`;
    case "droopy":
      return `<circle cx="${f(x)}" cy="${f(y + R * 0.02)}" r="${f(R * 0.085)}" fill="${INK}"/>` + glint(R * 0.025, -R * 0.02, R * 0.028) +
        `<path d="M${f(x - d * R * 0.12)} ${f(y - R * 0.1)} L${f(x + d * R * 0.12)} ${f(y - R * 0.03)}" stroke="${INK}" stroke-width="${f(R * 0.045)}" stroke-linecap="round"/>`;
    case "calm":
      return `<circle cx="${f(x)}" cy="${f(y + R * 0.02)}" r="${f(R * 0.09)}" fill="${INK}"/><path d="M${f(x - R * 0.13)} ${f(y - R * 0.02)} H${f(x + R * 0.13)}" stroke="${INK}" stroke-width="${f(R * 0.05)}" stroke-linecap="round"/>`;
    default:
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.1)}" fill="${INK}"/>` + glint(R * 0.03, -R * 0.045, R * 0.035);
  }
}

/** Two lashes at the outer top of any eye shape (almond eyes draw their own). */
function lashSVG(kind: Eye, d: number, x: number, y: number, R: number) {
  const closed = kind === "happy" || kind === "sleepy" || kind === "line";
  // Where the eye's outer top edge is, and which way the lashes sweep.
  const [ox, oy] = closed ? [x + d * R * 0.11, y + R * 0.01] : [x + d * R * 0.07, y - R * 0.1];
  const st = `stroke="${INK}" stroke-width="${f(R * 0.045)}" stroke-linecap="round"`;
  return `<path d="M${f(ox)} ${f(oy)} l${f(d * R * 0.05)} ${f(-R * 0.025)} M${f(ox - d * R * 0.03)} ${f(oy - R * 0.03)} l${f(d * R * 0.035)} ${f(-R * 0.04)}" ${st}/>`;
}

function browSVG(kind: Brow, d: number, x: number, y: number, R: number, bushy = false) {
  const by = y - R * (bushy ? 0.32 : 0.24);
  const w = R * (bushy ? 0.16 : 0.12);
  const sw = f(R * (kind === "thick" ? 0.085 : 0.045));
  const line = (x0: number, y0: number, x1: number, y1: number, curve = 0) => {
    const d0 = `M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2)} ${f((y0 + y1) / 2 - curve)} ${f(x1)} ${f(y1)}`;
    if (bushy) {
      return `<path d="${d0}" fill="none" stroke="#8f877d" stroke-width="${f(R * 0.17)}" stroke-linecap="round"/><path d="${d0}" fill="none" stroke="#ffffff" stroke-width="${f(R * 0.12)}" stroke-linecap="round"/>`;
    }
    return `<path d="${d0}" fill="none" stroke="#4a3226" stroke-width="${sw}" stroke-linecap="round"/>`;
  };
  switch (kind) {
    case "worried": return line(x - d * w, by - R * 0.05, x + d * w, by + R * 0.02);
    case "fret": return line(x - d * w, by - R * 0.08, x + d * w, by + R * 0.03, -R * 0.02);
    case "raised": return line(x - w, by - R * 0.04, x + w, by - R * 0.04, R * 0.06);
    case "thick": return line(x - w * 1.1, by, x + w * 1.1, by, R * 0.02);
    case "serious": return line(x - d * w, by + R * 0.03, x + d * w, by - R * 0.02);
    case "cross": return line(x - d * w, by + R * 0.05, x + d * w, by - R * 0.04);
    case "high": return line(x - w, by - R * 0.1, x + w, by - R * 0.1, R * 0.07);
    default: return line(x - w, by, x + w, by, R * 0.03);
  }
}

function mouthSVG(kind: Mouth, R: number, my: number) {
  const st = `fill="none" stroke="#3a2620" stroke-width="${f(Math.max(1, R * 0.06))}" stroke-linecap="round" stroke-linejoin="round"`;
  const open = (path: string) => `<path d="${path}" fill="#8a3a36" stroke="#3a2620" stroke-width="${f(R * 0.05)}" stroke-linejoin="round"/>`;
  switch (kind) {
    case "smile": return `<path d="M${f(-R * 0.12)} ${f(my)} Q0 ${f(my + R * 0.12)} ${f(R * 0.12)} ${f(my)}" ${st}/>`;
    case "polite": return `<path d="M${f(-R * 0.08)} ${f(my + R * 0.03)} Q0 ${f(my + R * 0.08)} ${f(R * 0.08)} ${f(my + R * 0.03)}" ${st}/>`;
    case "grin":
      return open(`M${f(-R * 0.17)} ${f(my - R * 0.02)} Q0 ${f(my + R * 0.24)} ${f(R * 0.17)} ${f(my - R * 0.02)} Z`) +
        `<path d="M${f(-R * 0.08)} ${f(my + R * 0.1)} Q0 ${f(my + R * 0.05)} ${f(R * 0.08)} ${f(my + R * 0.1)}" fill="#f08a8a"/>`;
    case "flat": return `<path d="M${f(-R * 0.1)} ${f(my + R * 0.03)} Q${f(-R * 0.03)} ${f(my)} 0 ${f(my + R * 0.03)} Q${f(R * 0.03)} ${f(my + R * 0.06)} ${f(R * 0.1)} ${f(my + R * 0.02)}" ${st}/>`;
    case "broad": return `<path d="M${f(-R * 0.2)} ${f(my - R * 0.02)} Q0 ${f(my + R * 0.15)} ${f(R * 0.2)} ${f(my - R * 0.02)}" ${st}/>`;
    case "toothy":
      return open(`M${f(-R * 0.15)} ${f(my - R * 0.01)} Q0 ${f(my + R * 0.2)} ${f(R * 0.15)} ${f(my - R * 0.01)} Z`) +
        `<rect x="${f(-R * 0.07)}" y="${f(my - R * 0.01)}" width="${f(R * 0.06)}" height="${f(R * 0.08)}" rx="1" fill="#fffaf0"/><rect x="${f(R * 0.01)}" y="${f(my - R * 0.01)}" width="${f(R * 0.06)}" height="${f(R * 0.08)}" rx="1" fill="#fffaf0"/>`;
    case "o": return `<ellipse cx="0" cy="${f(my + R * 0.04)}" rx="${f(R * 0.05)}" ry="${f(R * 0.065)}" fill="#8a3a36" stroke="#3a2620" stroke-width="${f(R * 0.04)}"/>`;
    case "frown": return `<path d="M${f(-R * 0.12)} ${f(my + R * 0.07)} Q0 ${f(my - R * 0.05)} ${f(R * 0.12)} ${f(my + R * 0.07)}" ${st}/>`;
    case "pout": return `<path d="M${f(-R * 0.11)} ${f(my + R * 0.05)} Q${f(-R * 0.05)} ${f(my - R * 0.02)} 0 ${f(my + R * 0.03)} Q${f(R * 0.05)} ${f(my - R * 0.02)} ${f(R * 0.11)} ${f(my + R * 0.05)}" ${st}/>`;
    case "wobble": return `<path d="M${f(-R * 0.14)} ${f(my + R * 0.04)} l${f(R * 0.05)} ${f(-R * 0.04)} l${f(R * 0.045)} ${f(R * 0.04)} l${f(R * 0.045)} ${f(-R * 0.04)} l${f(R * 0.045)} ${f(R * 0.04)} l${f(R * 0.045)} ${f(-R * 0.04)}" ${st}/>`;
    case "open":
      return `<ellipse cx="0" cy="${f(my + R * 0.05)}" rx="${f(R * 0.1)}" ry="${f(R * 0.09)}" fill="#8a3a36" stroke="#3a2620" stroke-width="${f(R * 0.04)}"/><ellipse cx="0" cy="${f(my + R * 0.1)}" rx="${f(R * 0.06)}" ry="${f(R * 0.03)}" fill="#f08a8a"/>`;
    case "openSmile": return open(`M${f(-R * 0.15)} ${f(my - R * 0.01)} Q0 ${f(my + R * 0.22)} ${f(R * 0.15)} ${f(my - R * 0.01)} Z`);
    case "bigO": return `<ellipse cx="0" cy="${f(my + R * 0.06)}" rx="${f(R * 0.08)}" ry="${f(R * 0.11)}" fill="#8a3a36" stroke="#3a2620" stroke-width="${f(R * 0.04)}"/>`;
    default:
      return `<path d="M${f(-R * 0.13)} ${f(my)} Q${f(-R * 0.06)} ${f(my + R * 0.1)} 0 ${f(my - R * 0.02)} Q${f(R * 0.06)} ${f(my + R * 0.1)} ${f(R * 0.13)} ${f(my)}" ${st}/>`;
  }
}

function star4(x: number, y: number, r: number, color: string) {
  return `<path d="M${f(x)} ${f(y - r)} Q${f(x + r * 0.2)} ${f(y - r * 0.2)} ${f(x + r)} ${f(y)} Q${f(x + r * 0.2)} ${f(y + r * 0.2)} ${f(x)} ${f(y + r)} Q${f(x - r * 0.2)} ${f(y + r * 0.2)} ${f(x - r)} ${f(y)} Q${f(x - r * 0.2)} ${f(y - r * 0.2)} ${f(x)} ${f(y - r)} Z" fill="${color}"/>`;
}

function drop(x: number, y: number, r: number, color: string) {
  return `<path d="M${f(x)} ${f(y - r * 1.6)} Q${f(x + r)} ${f(y - r * 0.2)} ${f(x + r)} ${f(y + r * 0.2)} A${f(r)} ${f(r)} 0 0 1 ${f(x - r)} ${f(y + r * 0.2)} Q${f(x - r)} ${f(y - r * 0.2)} ${f(x)} ${f(y - r * 1.6)} Z" fill="${color}" stroke="#ffffff" stroke-width="${f(r * 0.25)}"/>`;
}

function markSVG(kind: Mark | undefined, R: number, hy: number, ex: number, ey: number) {
  switch (kind) {
    case "sparkle": return star4(R * 1.2, hy - R * 0.85, R * 0.2, "#f6c445") + star4(-R * 1.2, hy - R * 0.45, R * 0.13, "#f6c445");
    case "tear": return drop(-ex - R * 0.02, ey + R * 0.3, R * 0.08, "#7cc6ea");
    case "sweat": return drop(R * 1.02, hy - R * 0.55, R * 0.11, "#9fd6f0");
    case "puff":
      return `<g fill="#f3f1ee" stroke="#b9b3ad" stroke-width="${f(R * 0.04)}"><circle cx="${f(R * 1.05)}" cy="${f(hy - R * 1.05)}" r="${f(R * 0.16)}"/><circle cx="${f(R * 1.28)}" cy="${f(hy - R * 1.15)}" r="${f(R * 0.13)}"/><circle cx="${f(R * 1.22)}" cy="${f(hy - R * 0.92)}" r="${f(R * 0.12)}"/></g>`;
    case "exclaim":
      return `<g fill="#e9583c"><rect x="${f(R * 1.08)}" y="${f(hy - R * 1.45)}" width="${f(R * 0.13)}" height="${f(R * 0.42)}" rx="${f(R * 0.06)}"/><circle cx="${f(R * 1.145)}" cy="${f(hy - R * 0.9)}" r="${f(R * 0.075)}"/></g>`;
    case "zzz":
      return `<g fill="#7d93cf" font-family="Trebuchet MS, Verdana, sans-serif" font-weight="800"><text x="${f(R * 0.95)}" y="${f(hy - R * 0.75)}" font-size="${f(R * 0.32)}">z</text><text x="${f(R * 1.18)}" y="${f(hy - R * 1.05)}" font-size="${f(R * 0.42)}">z</text></g>`;
    case "blushLines": {
      let t = "";
      for (const d of [-1, 1]) for (let i = 0; i < 3; i++) t += `<path d="M${f(d * R * (0.48 + i * 0.1))} ${f(hy + R * 0.24)} l${f(d * R * 0.05)} ${f(R * 0.1)}" stroke="#e2584f" stroke-width="${f(R * 0.035)}" stroke-linecap="round"/>`;
      return t;
    }
    default: return "";
  }
}

// --- The character --------------------------------------------------------------

export interface DrawOptions {
  frame?: Frame;
  /** Draw the small sign for the feeling (tear, sparkles, "!"...). */
  marks?: boolean;
  /** An arm pointing forward, for the shame haze. */
  pointing?: boolean;
  /** Walking: -1..1, which foot is lifted (left when negative) and how far. */
  step?: number;
  /** Turned toward the direction of travel (+x), 0 facing the camera to 1 three-quarters. */
  turn?: number;
  /** Arms swing against the legs while walking. */
  swing?: boolean;
  /** Leave out the ground shadow and soft highlights, for flat paper. */
  flat?: boolean;
  /** Draw only the face (patches, muzzle, mouth, eyes, brows), head centered at (0, -50). */
  faceOnly?: boolean;
  /** Draw only the feeling's small sign. */
  markOnly?: boolean;
}

/** SVG markup for a villager (no outer <svg>), feet at (0, 0), already scaled to their size. */
export function characterMarkup(id: CharacterId, expr: Expression, opts: DrawOptions = {}): string {
  return lookMarkup(LOOKS[id], FACES[id], expr, opts);
}

/** The same drawing from a look and face directly, for a customized character. */
export function lookMarkup(look: Look, own: Face, expr: Expression, opts: DrawOptions = {}): string {
  const sp = { ...SPECIES[look.species], ...(look.furs ?? {}) };
  const face = faceFor(own, expr, opts.frame ?? "closed");
  const R = S.headR;
  const hy = S.headY;
  const top = S.bodyTop;
  const bot = -S.legH;
  const bh = bot - top;
  const bw = S.bodyW * look.build;
  const k = bh / 40;
  const has = (x: Extra) => look.extras.includes(x);
  let s = "";

  if (!opts.flat) s += `<ellipse cx="0" cy="1" rx="${f(bw * 0.62)}" ry="4" fill="#3b2a1e" opacity=".18"/>`;
  // Turned toward +x, the tail trails out behind (-x).
  s += (opts.turn ?? 0) > 0 ? `<g transform="scale(-1 1)">${tailSVG(sp, bw, top, bot, k)}</g>` : tailSVG(sp, bw, top, bot, k);
  const lw = bw * 0.28;
  const lx = bw * 0.2;
  const step = opts.step ?? 0;
  const turn = opts.turn ?? 0;
  for (const d of [-1, 1]) {
    // While walking, one foot lifts at a time; turned, the lifted foot also reaches forward.
    const lift = (d < 0 ? Math.max(0, -step) : Math.max(0, step)) * 4;
    const reach = (d < 0 ? -step : step) * 3 * turn;
    s += `<rect x="${f(d * lx - lw / 2 + reach)}" y="${f(bot - 4 - lift)}" width="${f(lw)}" height="${f(S.legH + 4)}" rx="${f(lw / 2)}" fill="${sp.feet}"/>`;
  }
  s += bodyShape(bw, top, bh, look.outfit);
  if (has("apron")) s += `<rect x="${f(-bw * 0.3)}" y="${f(top + bh * 0.28)}" width="${f(bw * 0.6)}" height="${f(bh * 0.72)}" rx="${f(bw * 0.08)}" fill="${look.accent}"/>`;
  if (has("satchel")) {
    s += `<path d="M${f(-bw * 0.34)} ${f(top + 1)} L${f(bw * 0.36)} ${f(bot - bh * 0.3)}" stroke="${look.accent}" stroke-width="${f(2.6 * Math.max(k, 0.8))}" stroke-linecap="round"/>`;
    s += `<rect x="${f(bw * 0.18)}" y="${f(bot - bh * 0.38)}" width="${f(bw * 0.36)}" height="${f(bh * 0.3)}" rx="${f(bw * 0.06)}" fill="${look.accent}"/>`;
  }

  const kk = Math.max(k, 0.8);
  if (has("dress")) {
    // A skirt that flares out below the waist, a scalloped hem and a round collar.
    const wy = top + bh * 0.42;
    s += `<path d="M${f(-bw * 0.4)} ${f(wy)} Q${f(-bw * 0.62)} ${f(bot - 2)} ${f(-bw * 0.66)} ${f(bot + 1)} Q0 ${f(bot + 6)} ${f(bw * 0.66)} ${f(bot + 1)} Q${f(bw * 0.62)} ${f(bot - 2)} ${f(bw * 0.4)} ${f(wy)} Z" fill="${look.outfit}"/>`;
    for (let i = 0; i < 6; i++) s += `<circle cx="${f(-bw * 0.55 + (i * bw * 1.1) / 5)}" cy="${f(bot + 1.5)}" r="${f(1.8 * kk)}" fill="${look.accent}"/>`;
    s += `<path d="M${f(-bw * 0.36)} ${f(wy)} Q0 ${f(wy + 3 * kk)} ${f(bw * 0.36)} ${f(wy)}" fill="none" stroke="${look.accent}" stroke-width="${f(1.6 * kk)}"/>`;
    for (const d of [-1, 1]) s += `<ellipse cx="${f(d * bw * 0.14)}" cy="${f(top + 2)}" rx="${f(bw * 0.16)}" ry="${f(3.2 * kk)}" fill="#fffaf0"/>`;
  }
  if (has("overalls")) {
    // A bib and trousers over the shirt, two straps and two buttons.
    s += `<path d="M${f(-bw * 0.26)} ${f(top + bh * 0.3)} H${f(bw * 0.26)} V${f(top + bh * 0.5)} Q${f(bw * 0.5)} ${f(top + bh * 0.52)} ${f(bw * 0.5)} ${f(bot - bh * 0.1)} Q0 ${f(bot + 4)} ${f(-bw * 0.5)} ${f(bot - bh * 0.1)} Q${f(-bw * 0.5)} ${f(top + bh * 0.52)} ${f(-bw * 0.26)} ${f(top + bh * 0.5)} Z" fill="${look.accent}"/>`;
    for (const d of [-1, 1]) {
      s += `<path d="M${f(d * bw * 0.2)} ${f(top + bh * 0.32)} L${f(d * bw * 0.3)} ${f(top + 1)}" stroke="${look.accent}" stroke-width="${f(2.4 * kk)}" stroke-linecap="round"/>`;
      s += `<circle cx="${f(d * bw * 0.18)}" cy="${f(top + bh * 0.36)}" r="${f(1.3 * kk)}" fill="#f6d36a"/>`;
    }
    s += `<rect x="${f(-bw * 0.1)}" y="${f(top + bh * 0.4)}" width="${f(bw * 0.2)}" height="${f(bh * 0.12)}" rx="1.5" fill="#000" opacity=".12"/>`;
  }
  if (has("sweater")) {
    // Knitted stripes across the body, each as wide as the body at that height.
    const cy = top + bh / 2;
    const ry = bh / 2 + 2;
    for (const t of [0.36, 0.6, 0.84]) {
      const y = top + bh * t;
      const hw = (bw / 2) * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)) - 0.5;
      s += `<rect x="${f(-hw)}" y="${f(y - 2.2 * kk)}" width="${f(hw * 2)}" height="${f(4.4 * kk)}" fill="${look.accent}"/>`;
    }
    s += `<path d="M${f(-bw * 0.3)} ${f(top + 1)} Q0 ${f(top + 5)} ${f(bw * 0.3)} ${f(top + 1)}" fill="none" stroke="${look.accent}" stroke-width="${f(2.6 * kk)}" stroke-linecap="round"/>`;
  }
  if (has("hoodie")) {
    // A front pocket and drawstrings; the hood itself sits behind the head.
    s += `<path d="M${f(-bw * 0.28)} ${f(bot - bh * 0.42)} H${f(bw * 0.28)} L${f(bw * 0.34)} ${f(bot - bh * 0.08)} H${f(-bw * 0.34)} Z" fill="#000" opacity=".1"/>`;
    for (const d of [-1, 1]) s += `<path d="M${f(d * bw * 0.08)} ${f(top + 1)} v${f(bh * 0.3)}" stroke="#fffaf0" stroke-width="${f(1.2 * kk)}" stroke-linecap="round"/><circle cx="${f(d * bw * 0.08)}" cy="${f(top + 1 + bh * 0.3)}" r="${f(1.1 * kk)}" fill="#fffaf0"/>`;
  }

  if (has("lapels")) {
    // A tailored coat: two lapels meeting in a V, and buttons.
    for (const d of [-1, 1]) s += `<path d="M${f(d * bw * 0.06)} ${f(top + 1)} L${f(d * bw * 0.34)} ${f(top + 1.5)} L${f(d * bw * 0.22)} ${f(top + bh * 0.3)} L0 ${f(top + bh * 0.52)} Z" fill="${look.accent}"/>`;
    for (const t of [0.62, 0.8]) s += `<circle cx="0" cy="${f(top + bh * t)}" r="${f(1.2 * Math.max(k, 0.8))}" fill="${look.accent}"/>`;
  }
  if (has("oilskin")) {
    // A fisherman's oilskin: a front seam, toggles, and a deep hem.
    s += `<path d="M${f(bw * 0.06)} ${f(top + 2)} L${f(bw * 0.06)} ${f(bot + 1)}" stroke="${look.accent}" stroke-width="${f(1.4 * Math.max(k, 0.8))}"/>`;
    for (const t of [0.3, 0.52, 0.74]) s += `<rect x="${f(bw * 0.06 - 2.4 * k)}" y="${f(top + bh * t - 0.9 * k)}" width="${f(4.8 * k)}" height="${f(1.8 * k)}" rx="${f(0.9 * k)}" fill="${look.accent}"/>`;
    s += `<path d="M${f(-bw * 0.44)} ${f(bot - bh * 0.12)} Q0 ${f(bot - bh * 0.02)} ${f(bw * 0.44)} ${f(bot - bh * 0.12)}" fill="none" stroke="${look.accent}" stroke-width="${f(1.2 * Math.max(k, 0.8))}" opacity=".7"/>`;
  }
  if (has("cardigan")) {
    // An open knitted cardigan over a shirt, with two pockets and buttons.
    s += `<path d="M${f(-bw * 0.13)} ${f(top - 1)} L${f(bw * 0.13)} ${f(top - 1)} L${f(bw * 0.05)} ${f(bot)} L${f(-bw * 0.05)} ${f(bot)} Z" fill="${look.accent}"/>`;
    for (const t of [0.35, 0.55, 0.75]) s += `<circle cx="${f(bw * 0.11)}" cy="${f(top + bh * t)}" r="${f(1.1 * Math.max(k, 0.8))}" fill="#e7d3a8"/>`;
    for (const d of [-1, 1]) {
      s += `<rect x="${f(d * bw * 0.27 - bw * 0.1)}" y="${f(top + bh * 0.58)}" width="${f(bw * 0.2)}" height="${f(bh * 0.22)}" rx="${f(bw * 0.03)}" fill="#000000" opacity=".16"/>`;
      s += `<path d="M${f(d * bw * 0.27 - bw * 0.1)} ${f(top + bh * 0.6)} h${f(bw * 0.2)}" stroke="#ffffff" stroke-width="${f(0.8 * Math.max(k, 0.8))}" stroke-dasharray="1 1" opacity=".35"/>`;
    }
    s += `<path d="M${f(-bw * 0.46)} ${f(bot - bh * 0.1)} Q0 ${f(bot)} ${f(bw * 0.46)} ${f(bot - bh * 0.1)}" fill="none" stroke="#000000" stroke-width="${f(1.6 * Math.max(k, 0.8))}" stroke-dasharray="1.2 1" opacity=".18"/>`;
  }

  // Arms and paws. The pointing arm reaches forward and up.
  const arx = Math.max(3.6, bw * 0.15) * S.arm;
  const ary = bh * 0.32;
  const ay = top + bh * 0.42;
  const paw = sp.pattern === "wool" ? sp.face! : sp.fur;
  for (const d of [-1, 1]) {
    const ax = d * (bw / 2 - arx * 0.2);
    if (opts.pointing && d === 1) {
      const px = ax + R * 1.05;
      const py = top - R * 0.15;
      s += `<path d="M${f(ax)} ${f(ay - ary * 0.4)} L${f(px)} ${f(py)}" stroke="${look.outfit}" stroke-width="${f(arx * 1.9)}" stroke-linecap="round"/>`;
      s += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(arx * 0.92)}" fill="${paw}"/>`;
      continue;
    }
    // Arms swing opposite the legs: a small tilt about the shoulder.
    const swing = opts.swing ? (d < 0 ? step : -step) * 14 : 0;
    const arm = `<ellipse cx="${f(ax)}" cy="${f(ay)}" rx="${f(arx)}" ry="${f(ary)}" fill="${look.outfit}"/><circle cx="${f(ax)}" cy="${f(ay + ary - arx * 0.4)}" r="${f(arx * 0.92)}" fill="${paw}"/>`;
    s += swing ? `<g transform="rotate(${f(swing)} ${f(ax)} ${f(ay - ary * 0.8)})">${arm}</g>` : arm;
  }
  if (has("clipboard")) s += `<rect x="${f(-bw / 2 - 9 * k)}" y="${f(ay + ary * 0.1)}" width="${f(11 * k)}" height="${f(14 * k)}" rx="1.5" fill="#c99a5e"/><rect x="${f(-bw / 2 - 7.5 * k)}" y="${f(ay + ary * 0.1 + 2.5 * k)}" width="${f(8 * k)}" height="${f(10 * k)}" fill="#fffaf0"/>`;
  if (has("shawl")) s += `<path d="M${f(-bw * 0.5)} ${f(top + 2)} Q0 ${f(top - 3)} ${f(bw * 0.5)} ${f(top + 2)} L${f(bw * 0.12)} ${f(top + bh * 0.6)} Q0 ${f(top + bh * 0.66)} ${f(-bw * 0.12)} ${f(top + bh * 0.6)} Z" fill="${look.accent}"/>`;
  if (has("cane")) {
    const cx = bw / 2 + 4 * k + 3;
    const cy = top + bh * 0.45;
    s += `<path d="M${f(cx)} 0 L${f(cx)} ${f(cy)} Q${f(cx)} ${f(cy - 6 * k)} ${f(cx - 5 * k)} ${f(cy - 6 * k)}" fill="none" stroke="#6b4a2b" stroke-width="${f(2.6 * Math.max(k, 0.8))}" stroke-linecap="round"/>`;
  }
  if (has("scarf")) s += `<rect x="${f(bw * 0.12)}" y="${f(top + 2)}" width="${f(5.5 * Math.max(k, 0.8))}" height="${f(bh * 0.45)}" rx="2" fill="${look.accent}"/><rect x="${f(-bw * 0.42)}" y="${f(top - 3)}" width="${f(bw * 0.84)}" height="${f(7 * Math.max(k, 0.8))}" rx="${f(3.5 * Math.max(k, 0.8))}" fill="${look.accent}"/>`;

  if (has("cape")) {
    // A nurse's cape over the shoulders, open at the front, with a red lining edge and a watch.
    for (const d of [-1, 1]) {
      s += `<path d="M${f(d * bw * 0.1)} ${f(top - 1)} Q${f(d * bw * 0.66)} ${f(top - 2)} ${f(d * bw * 0.62)} ${f(top + bh * 0.62)} Q${f(d * bw * 0.4)} ${f(top + bh * 0.72)} ${f(d * bw * 0.2)} ${f(top + bh * 0.58)} Z" fill="${look.accent}"/>`;
      s += `<path d="M${f(d * bw * 0.1)} ${f(top - 1)} L${f(d * bw * 0.2)} ${f(top + bh * 0.58)}" stroke="#b8434a" stroke-width="${f(1.3 * Math.max(k, 0.8))}" stroke-linecap="round"/>`;
    }
    s += `<circle cx="${f(-bw * 0.13)}" cy="${f(top + bh * 0.4)}" r="${f(1.8 * Math.max(k, 0.8))}" fill="#e6e8ec" stroke="#8e96a3" stroke-width=".6"/>`;
    s += `<path d="M${f(-bw * 0.42)} ${f(top + 1)} Q0 ${f(top + 4)} ${f(bw * 0.42)} ${f(top + 1)}" fill="none" stroke="#fbfcfe" stroke-width="${f(2 * Math.max(k, 0.8))}" stroke-linecap="round"/>`;
  }
  if (has("pearls")) {
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      // Hung low enough to show below the chin.
      const x = -bw * 0.34 + t * bw * 0.68;
      const y = top + bh * 0.3 + Math.sin(t * Math.PI) * bh * 0.14;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.25 * Math.max(k, 0.8))}" fill="#f6f1e6" stroke="#cfc4b0" stroke-width=".3"/>`;
    }
  }

  // Head
  const hw = R * 1.08 * (face.headW ?? 1);
  const hh = R * (face.headH ?? 1);
  if (has("hoodie")) s += `<ellipse cx="0" cy="${f(hy + R * 0.55)}" rx="${f(R * 1.02)}" ry="${f(R * 0.62)}" fill="${look.accent}"/>`;
  s += earsSVG(sp, R, hy);
  if (sp.pattern === "wool") {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      s += `<circle cx="${f(Math.cos(a) * R * 0.72)}" cy="${f(hy - R * 0.05 + Math.sin(a) * R * 0.72)}" r="${f(R * 0.4)}" fill="${sp.fur}"/>`;
    }
    s += `<circle cx="0" cy="${f(hy - R * 0.05)}" r="${f(R * 0.8)}" fill="${sp.fur}"/>`;
    s += `<ellipse cx="0" cy="${f(hy + R * 0.14)}" rx="${f(R * 0.66)}" ry="${f(R * 0.74)}" fill="${sp.face}"/>`;
    s += `<circle cx="${f(-R * 0.2)}" cy="${f(hy - R * 0.62)}" r="${f(R * 0.3)}" fill="${sp.fur}"/><circle cx="${f(R * 0.2)}" cy="${f(hy - R * 0.64)}" r="${f(R * 0.3)}" fill="${sp.fur}"/>`;
  } else {
    s += `<ellipse cx="0" cy="${f(hy)}" rx="${f(hw)}" ry="${f(hh)}" fill="${sp.fur}"/>`;
  }
  // Everything on the face moves toward where they're walking when turned.
  const faceStart = s.length;
  if (sp.pattern === "mask") {
    // A raccoon's dark mask across the eyes, pale above it.
    for (const d of [-1, 1]) s += `<ellipse cx="${f(d * R * 0.44)}" cy="${f(hy + R * 0.12)}" rx="${f(R * 0.32)}" ry="${f(R * 0.22)}" transform="rotate(${d * 12} ${f(d * R * 0.44)} ${f(hy + R * 0.12)})" fill="${sp.ring}"/>`;
    for (const d of [-1, 1]) s += `<ellipse cx="${f(d * R * 0.4)}" cy="${f(hy - R * 0.22)}" rx="${f(R * 0.22)}" ry="${f(R * 0.09)}" fill="${sp.fur2}"/>`;
  }
  if (sp.pattern === "redpanda" || sp.pattern === "badger" || sp.pattern === "cheeks") {
    for (const d of [-1, 1]) s += `<ellipse cx="${f(d * R * 0.48)}" cy="${f(hy + R * 0.36)}" rx="${f(R * 0.42)}" ry="${f(R * 0.32)}" fill="${sp.fur2}"/>`;
  }
  if (sp.pattern === "redpanda") for (const d of [-1, 1]) s += `<circle cx="${f(d * R * 0.38)}" cy="${f(hy - R * 0.34)}" r="${f(R * 0.11)}" fill="${sp.fur2}"/>`;
  if (sp.pattern === "badger") s += `<ellipse cx="0" cy="${f(hy - R * 0.3)}" rx="${f(R * 0.2)}" ry="${f(R * 0.72)}" fill="${sp.fur2}"/>`;
  const m = { rx: 0.4, ry: 0.28, dy: 0.42, ...(sp.muzzle ?? {}) };
  if (sp.pattern !== "wool") s += `<ellipse cx="0" cy="${f(hy + R * m.dy)}" rx="${f(R * m.rx)}" ry="${f(R * m.ry)}" fill="${sp.fur2}"/>`;
  s += `<ellipse cx="0" cy="${f(hy + R * (m.dy - 0.14))}" rx="${f(R * 0.13 * (sp.nosePlus ?? 1))}" ry="${f(R * 0.085 * (sp.nosePlus ?? 1))}" fill="${sp.nose}"/>`;
  const my = hy + R * (m.dy + 0.02);
  s += mouthSVG(face.mouth ?? "w", R, my);
  if (sp.beard) s += `<path d="M${f(-R * 0.14)} ${f(hy + R * 0.88)} L${f(R * 0.14)} ${f(hy + R * 0.88)} L0 ${f(hy + R * 1.25)} Z" fill="${sp.fur2}"/>`;

  // Eyes, cheeks, brows
  const ex = R * (face.spread ?? S.eyeSpread);
  const ey = hy + R * S.eyeY;
  const eye: Eye = face.blink ? "line" : face.eye ?? "round";
  for (const d of [-1, 1]) {
    s += eyeSVG(eye, d, d * ex, ey, R, face.lashes);
    if (face.lashes && eye !== "almond") s += lashSVG(eye, d, d * ex, ey, R);
    s += `<ellipse cx="${f(d * R * 0.6)}" cy="${f(hy + R * 0.3)}" rx="${f(R * 0.16)}" ry="${f(R * 0.09)}" fill="#f07f86" opacity="${face.blush ?? S.blush}"/>`;
    if (face.freckles) for (const [fx, fy] of [[0.52, 0.2], [0.64, 0.26], [0.56, 0.32]]) s += `<circle cx="${f(d * R * fx)}" cy="${f(hy + R * fy)}" r="${f(R * 0.03)}" fill="#7a4a32" opacity=".6"/>`;
    if (face.lines) s += `<path d="M${f(d * (ex + R * 0.2))} ${f(ey + R * 0.02)} l${f(d * R * 0.08)} ${f(R * 0.05)} M${f(d * (ex + R * 0.2))} ${f(ey - R * 0.05)} l${f(d * R * 0.08)} ${f(-R * 0.03)}" stroke="#7a5a4a" stroke-width="${f(R * 0.035)}" stroke-linecap="round" opacity=".6"/>`;
    if (face.bags) s += `<path d="M${f(d * ex - R * 0.11)} ${f(ey + R * 0.15)} Q${f(d * ex)} ${f(ey + R * 0.22)} ${f(d * ex + R * 0.11)} ${f(ey + R * 0.15)}" fill="none" stroke="#8a6f86" stroke-width="${f(R * 0.035)}" stroke-linecap="round" opacity=".55"/>`;
    if (face.brow) s += browSVG(face.brow, d, d * ex, ey, R, face.bushy);
  }
  if (opts.faceOnly) return s.slice(faceStart);
  if (opts.markOnly) return expr === "neutral" ? "" : markSVG(FEELINGS[expr].mark, R * (face.headW ?? 1), hy, ex, ey);
  if (turn) s = s.slice(0, faceStart) + `<g transform="translate(${f(turn * R * 0.3)} 0)">` + s.slice(faceStart) + `</g>`;
  // Soft highlights
  if (!opts.flat) s += `<ellipse cx="${f(-R * 0.32)}" cy="${f(hy - R * 0.48)}" rx="${f(R * 0.4)}" ry="${f(R * 0.22)}" fill="#ffffff" opacity=".25"/>`;
  if (!opts.flat) s += `<ellipse cx="${f(-bw * 0.18)}" cy="${f(top + bh * 0.25)}" rx="${f(bw * 0.16)}" ry="${f(bh * 0.12)}" fill="#ffffff" opacity=".18"/>`;

  // Accessories on the head
  if (has("glasses")) {
    for (const d of [-1, 1]) s += `<circle cx="${f(d * ex)}" cy="${f(ey)}" r="${f(R * 0.22)}" fill="#ffffff" fill-opacity=".15" stroke="#2a1c16" stroke-width="${f(Math.max(1.1, R * 0.07))}"/>`;
    s += `<path d="M${f(-ex + R * 0.22)} ${f(ey)} L${f(ex - R * 0.22)} ${f(ey)}" stroke="#2a1c16" stroke-width="${f(Math.max(1.1, R * 0.07))}"/>`;
  }
  if (has("cap")) {
    s += `<path d="M${f(-R * 0.95)} ${f(hy - R * 0.28)} Q${f(-R * 0.92)} ${f(hy - R * 1.12)} 0 ${f(hy - R * 1.1)} Q${f(R * 0.92)} ${f(hy - R * 1.12)} ${f(R * 0.95)} ${f(hy - R * 0.28)} Z" fill="${look.hat}"/>`;
    s += `<ellipse cx="${f(R * 0.38)}" cy="${f(hy - R * 0.3)}" rx="${f(R * 0.78)}" ry="${f(R * 0.16)}" fill="${look.hat}"/>`;
  }
  if (has("toque")) {
    const w = "#fbf8f2";
    s += `<circle cx="${f(-R * 0.45)}" cy="${f(hy - R * 1.32)}" r="${f(R * 0.45)}" fill="${w}"/><circle cx="${f(R * 0.45)}" cy="${f(hy - R * 1.32)}" r="${f(R * 0.45)}" fill="${w}"/><circle cx="0" cy="${f(hy - R * 1.55)}" r="${f(R * 0.55)}" fill="${w}"/>`;
    s += `<rect x="${f(-R * 0.72)}" y="${f(hy - R * 1.12)}" width="${f(R * 1.44)}" height="${f(R * 0.42)}" rx="${f(R * 0.12)}" fill="${w}"/>`;
  }
  if (has("pillbox")) {
    // A neat small hat, tilted, with a band and a tiny bow.
    const cx = R * 0.18;
    const cy = hy - R * 1.02;
    s += `<g transform="rotate(12 ${f(cx)} ${f(cy)})"><rect x="${f(cx - R * 0.42)}" y="${f(cy - R * 0.22)}" width="${f(R * 0.84)}" height="${f(R * 0.34)}" rx="${f(R * 0.1)}" fill="${look.hat}"/>` +
      `<ellipse cx="${f(cx)}" cy="${f(cy - R * 0.22)}" rx="${f(R * 0.42)}" ry="${f(R * 0.09)}" fill="#6d3e5e"/>` +
      `<rect x="${f(cx - R * 0.42)}" y="${f(cy + R * 0.02)}" width="${f(R * 0.84)}" height="${f(R * 0.08)}" fill="#c9a3b6"/>` +
      `<circle cx="${f(cx + R * 0.3)}" cy="${f(cy + R * 0.06)}" r="${f(R * 0.07)}" fill="#c9a3b6"/></g>`;
  }
  if (has("souwester")) {
    // A yellow rain hat: a domed crown and a wide brim, longer at the back.
    s += `<path d="M${f(-R * 1.28)} ${f(hy - R * 0.42)} Q${f(-R * 1.1)} ${f(hy - R * 0.74)} 0 ${f(hy - R * 0.78)} Q${f(R * 1.1)} ${f(hy - R * 0.74)} ${f(R * 1.28)} ${f(hy - R * 0.42)} Q${f(R * 1.2)} ${f(hy - R * 0.22)} ${f(R * 0.95)} ${f(hy - R * 0.32)} Q0 ${f(hy - R * 0.5)} ${f(-R * 0.95)} ${f(hy - R * 0.32)} Q${f(-R * 1.2)} ${f(hy - R * 0.22)} ${f(-R * 1.28)} ${f(hy - R * 0.42)} Z" fill="${look.hat}"/>`;
    s += `<path d="M${f(-R * 0.78)} ${f(hy - R * 0.66)} Q${f(-R * 0.72)} ${f(hy - R * 1.3)} 0 ${f(hy - R * 1.3)} Q${f(R * 0.72)} ${f(hy - R * 1.3)} ${f(R * 0.78)} ${f(hy - R * 0.66)} Z" fill="${look.hat}"/>`;
    s += `<path d="M${f(-R * 0.78)} ${f(hy - R * 0.68)} Q0 ${f(hy - R * 0.8)} ${f(R * 0.78)} ${f(hy - R * 0.68)}" fill="none" stroke="${look.accent}" stroke-width="${f(R * 0.06)}" opacity=".7"/>`;
    s += `<path d="M0 ${f(hy - R * 1.3)} L0 ${f(hy - R * 0.76)}" stroke="${look.accent}" stroke-width="${f(R * 0.04)}" opacity=".5"/>`;
  }
  if (has("nursecap")) {
    // A small white folded cap with a navy stripe.
    const cy = hy - R * 0.92;
    s += `<path d="M${f(-R * 0.42)} ${f(cy + R * 0.14)} L${f(-R * 0.32)} ${f(cy - R * 0.2)} L${f(R * 0.32)} ${f(cy - R * 0.2)} L${f(R * 0.42)} ${f(cy + R * 0.14)} Q0 ${f(cy + R * 0.06)} ${f(-R * 0.42)} ${f(cy + R * 0.14)} Z" fill="#fbfcfe" stroke="#c9d3e0" stroke-width="${f(R * 0.025)}"/>`;
    s += `<path d="M${f(-R * 0.36)} ${f(cy - R * 0.04)} L${f(R * 0.36)} ${f(cy - R * 0.04)}" stroke="${look.accent}" stroke-width="${f(R * 0.06)}"/>`;
  }
  if (has("beanie")) {
    // A knitted hat: a dome, a folded band, and a pompom.
    s += `<path d="M${f(-R * 0.98)} ${f(hy - R * 0.42)} Q${f(-R * 0.96)} ${f(hy - R * 1.22)} 0 ${f(hy - R * 1.22)} Q${f(R * 0.96)} ${f(hy - R * 1.22)} ${f(R * 0.98)} ${f(hy - R * 0.42)} Z" fill="${look.hat ?? look.accent}"/>`;
    s += `<rect x="${f(-R * 1.02)}" y="${f(hy - R * 0.62)}" width="${f(R * 2.04)}" height="${f(R * 0.3)}" rx="${f(R * 0.14)}" fill="${look.hat ?? look.accent}"/>`;
    for (let i = 0; i < 7; i++) s += `<path d="M${f(-R * 0.84 + i * R * 0.28)} ${f(hy - R * 0.58)} v${f(R * 0.22)}" stroke="#000" stroke-opacity=".14" stroke-width="${f(R * 0.05)}"/>`;
    s += `<circle cx="0" cy="${f(hy - R * 1.28)}" r="${f(R * 0.22)}" fill="#fffaf0"/>`;
  }
  if (has("sunhat")) {
    // A wide straw hat with a ribbon.
    s += `<ellipse cx="0" cy="${f(hy - R * 0.62)}" rx="${f(R * 1.5)}" ry="${f(R * 0.3)}" fill="#ecc97a"/>`;
    s += `<path d="M${f(-R * 0.7)} ${f(hy - R * 0.66)} Q${f(-R * 0.66)} ${f(hy - R * 1.36)} 0 ${f(hy - R * 1.36)} Q${f(R * 0.66)} ${f(hy - R * 1.36)} ${f(R * 0.7)} ${f(hy - R * 0.66)} Z" fill="#f3d88f"/>`;
    s += `<path d="M${f(-R * 0.69)} ${f(hy - R * 0.8)} Q0 ${f(hy - R * 0.9)} ${f(R * 0.69)} ${f(hy - R * 0.8)}" fill="none" stroke="${look.hat ?? look.accent}" stroke-width="${f(R * 0.16)}"/>`;
  }
  if (has("flowercrown")) {
    // A ring of small five-petal flowers set close together over the crown, with leaves tucked between.
    const cols: [string, string][] = [["#f4a08a", "#e9705a"], ["#fbe08a", "#f0b93a"], ["#f5b3cc", "#e07ea3"], ["#ffffff", "#e9dff0"], ["#c9b3ee", "#9f82d6"]];
    const n = 8;
    const at = (t: number) => {
      const a = Math.PI * (1.17 + t * 0.66);
      return [Math.cos(a) * hw * 0.84, hy - R * 0.08 + Math.sin(a) * hh * 0.86];
    };
    for (let i = 0; i < n - 1; i++) {
      const [lx, ly] = at((i + 0.5) / (n - 1));
      const rot = f(((i + 0.5) / (n - 1) - 0.5) * 120 + (i % 2 ? 35 : -35));
      s += `<ellipse cx="${f(lx)}" cy="${f(ly)}" rx="${f(R * 0.13)}" ry="${f(R * 0.055)}" transform="rotate(${rot} ${f(lx)} ${f(ly)})" fill="#7fb86a"/>`;
    }
    for (let i = 0; i < n; i++) {
      const [cx, cy] = at(i / (n - 1));
      const [petal, deep] = cols[i % cols.length];
      const pr = R * (i % 2 ? 0.075 : 0.085);
      const spin = i * 17;
      for (let j = 0; j < 5; j++) {
        const a = ((j / 5) * 360 + spin) * (Math.PI / 180);
        const px = cx + Math.cos(a) * pr;
        const py = cy + Math.sin(a) * pr;
        s += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(pr * 0.95)}" ry="${f(pr * 0.68)}" transform="rotate(${f((j / 5) * 360 + spin)} ${f(px)} ${f(py)})" fill="${petal}"/>`;
        s += `<path d="M${f(cx + Math.cos(a) * pr * 0.45)} ${f(cy + Math.sin(a) * pr * 0.45)} L${f(cx + Math.cos(a) * pr * 1.25)} ${f(cy + Math.sin(a) * pr * 1.25)}" stroke="${deep}" stroke-width="${f(R * 0.018)}" stroke-linecap="round" opacity=".7"/>`;
      }
      s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(pr * 0.55)}" fill="#f6c445"/><circle cx="${f(cx - pr * 0.15)}" cy="${f(cy - pr * 0.18)}" r="${f(pr * 0.2)}" fill="#fff6c8"/>`;
    }
  }
  if (has("bowtie")) {
    const by = hy + hh + 1.5;
    s += `<path d="M0 ${f(by)} L${f(-R * 0.3)} ${f(by - R * 0.15)} L${f(-R * 0.3)} ${f(by + R * 0.15)} Z M0 ${f(by)} L${f(R * 0.3)} ${f(by - R * 0.15)} L${f(R * 0.3)} ${f(by + R * 0.15)} Z" fill="${look.hat ?? look.accent}"/><circle cx="0" cy="${f(by)}" r="${f(R * 0.07)}" fill="${look.hat ?? look.accent}"/>`;
  }
  if (has("bow")) {
    const bx = R * 0.62;
    const by = hy - R * 0.95;
    s += `<path d="M${f(bx)} ${f(by)} L${f(bx - R * 0.3)} ${f(by - R * 0.18)} L${f(bx - R * 0.3)} ${f(by + R * 0.18)} Z M${f(bx)} ${f(by)} L${f(bx + R * 0.3)} ${f(by - R * 0.18)} L${f(bx + R * 0.3)} ${f(by + R * 0.18)} Z" fill="${look.accent}"/><circle cx="${f(bx)}" cy="${f(by)}" r="${f(R * 0.08)}" fill="${look.accent}"/>`;
  }
  if (has("flower")) {
    const fx = R * 0.55;
    const fy = hy - R * 0.72;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      s += `<circle cx="${f(fx + Math.cos(a) * R * 0.13)}" cy="${f(fy + Math.sin(a) * R * 0.13)}" r="${f(R * 0.1)}" fill="${look.accent}"/>`;
    }
    s += `<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(R * 0.07)}" fill="#f6d36a"/>`;
  }
  if (opts.marks !== false && expr !== "neutral") s += markSVG(FEELINGS[expr].mark, R * (face.headW ?? 1), hy, ex, ey);

  return `<g transform="scale(${look.scale})">${s}</g>`;
}

/** A complete SVG document of one character, for a texture. */
export function characterSVG(id: CharacterId, expr: Expression, opts: DrawOptions = {}, pxPerUnit = 2): string {
  const { x, y, w, h } = VIEWBOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * pxPerUnit}" height="${h * pxPerUnit}" viewBox="${x} ${y} ${w} ${h}">${characterMarkup(id, expr, opts)}</svg>`;
}

/** A head-and-shoulders portrait with all three talking frames, for the dialogue box. */
export function portraitSVG(id: CharacterId, expr: Expression): string {
  const look = LOOKS[id];
  const R = S.headR * look.scale;
  const hy = S.headY * look.scale;
  // Head and shoulders, with room above for ears, hats and the feeling's sign.
  const crown = look.crown ?? 1.65;
  const size = R * (2.9 + crown - 1.65);
  const top = hy - R * crown;
  const frames = (["closed", "open", "blink"] as Frame[])
    .map((fr) => `<g class="fr fr-${fr}">${characterMarkup(id, expr, { frame: fr })}</g>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(-size / 2)} ${f(top)} ${f(size)} ${f(size)}" class="portrait" data-frame="closed" aria-hidden="true"><g class="mot m-${FEELINGS[expr].motion}">${frames}</g></svg>`;
}

/** Dress the player in what they chose (see src/ui/wardrobe.ts). Portraits and textures made after this use it. */
export function setPlayerLook(look: Look, face: Face): void {
  LOOKS.you = look;
  FACES.you = face;
}
