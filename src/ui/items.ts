// Little drawings of everything you can gather or make, as SVG, in the game's soft toy colours.

import type { ItemId } from "../logic/bag";

const round = (cx: number, cy: number, r: number, c: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`;
const shine = (cx: number, cy: number, r = 3) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity=".65"/>`;

const fruit = (c: string) => `${round(32, 37, 18, c)}${shine(25, 30)}<path d="M32 21c0-5 2-8 5-10" stroke="#7c5a42" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M36 17c4-5 10-5 13-3-2 5-8 7-13 3z" fill="#7fae6a"/>`;
const berries = (c: string, d: string) => [[24, 28], [38, 28], [31, 38], [20, 40], [42, 40], [31, 49]].map(([x, y], i) => round(x, y, 8, i % 2 ? d : c) + shine(x - 2, y - 3, 1.8)).join("") + `<path d="M27 19c3-5 8-6 12-4-3 4-8 6-12 4z" fill="#7fae6a"/>`;
const cap = (c: string, spots = "#fff") => `<rect x="26" y="34" width="12" height="20" rx="6" fill="#f6efe2"/><path d="M10 37c0-14 10-23 22-23s22 9 22 23c-12 5-32 5-44 0z" fill="${c}"/>${round(24, 26, 3.4, spots)}${round(38, 23, 2.8, spots)}${round(44, 32, 2.2, spots)}`;
const stone = (c: string, d: string) => `<path d="M12 46 20 22l16-8 15 14 2 18-14 8H21z" fill="${c}"/><path d="M20 22l16-8 3 18-12 10z" fill="${d}"/><path d="M36 14l15 14-12 4z" fill="#fff" opacity=".35"/>`;
const fish = (c: string, d: string) => `<path d="M8 32c10-13 28-14 40 0-12 14-30 13-40 0z" fill="${c}"/><path d="M46 32l12-10v20z" fill="${d}"/>${round(19, 29, 2.6, "#3a3340")}<path d="M28 24c3 5 3 11 0 16" stroke="${d}" stroke-width="2.4" fill="none"/>`;

const ICONS: Record<ItemId, string> = {
  apple: fruit("#e0574c"),
  plum: fruit("#7a5aa8"),
  blackberry: berries("#4a3560", "#6a4a84"),
  moonberry: berries("#cfe0f4", "#a9c4e8"),
  button_cap: cap("#e6d6bc", "#f6efe2"),
  chanterelle: cap("#f2b54a", "#f8d27a"),
  bluecap: cap("#5f8fc9"),
  glowcap: `${round(32, 32, 28, "#f4ecb0")}`.replace("/>", ' opacity=".35"/>') + cap("#c9e88a", "#fbfbd0"),
  quartz: stone("#e4edf2", "#c4d6e0"),
  ironstone: stone("#8a7a78", "#6e5f60"),
  copper: stone("#c98a5e", "#7fb8a0"),
  skyglass: stone("#7fc4e8", "#4f9fd0"),
  perch: fish("#9dbb6a", "#e98a5a"),
  trout: fish("#b9a0a0", "#e98fa0"),
  eel: `<path d="M8 40c8-14 14-14 22-2s14 12 26-6" stroke="#c4cdd8" stroke-width="9" fill="none" stroke-linecap="round"/>${round(11, 36, 1.8, "#3a3340")}`,
  carp: fish("#e2b24f", "#c97b3a"),
  mackerel: fish("#6f9fb8", "#3f6f8a"),
  bass: fish("#c4cdd8", "#7f93a8"),
  shell: `<path d="M32 54 10 28c4-12 40-12 44 0z" fill="#f4c9b8"/><path d="M32 54 20 22M32 54V19M32 54l12-32" stroke="#e09f8a" stroke-width="2.4"/><rect x="26" y="50" width="12" height="7" rx="3" fill="#e09f8a"/>`,
  seaglass: `<path d="M14 34 24 16l20 2 8 18-14 16-18-2z" fill="#8fd8c0" opacity=".85"/><path d="M24 16l20 2-6 12-16 2z" fill="#fff" opacity=".35"/>`,
  seaweed: `<path d="M22 56c-8-12 6-18-2-30s4-16 2-20M34 56c-6-14 8-18 2-32M44 56c-8-10 4-16-2-26" stroke="#4f8f6a" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  samphire: `<path d="M32 56V22M32 40 20 28M32 34l12-12M32 46l13-9M32 48 19 40" stroke="#7fae5c" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  kipper: fish("#c9884a", "#8a5a2e"),
  apple_loaf: `<path d="M10 46c0-20 12-28 22-28s22 8 22 28z" fill="#c98a4e"/><path d="M22 28l6 8M32 26v10M42 28l-6 8" stroke="#f2d9a8" stroke-width="3" stroke-linecap="round"/>`,
  honey_bun: `<circle cx="32" cy="36" r="20" fill="#d9a05e"/><path d="M32 36c6-8-10-10-10 0s14 12 20 2" stroke="#f2c44a" stroke-width="4" fill="none"/>`,
  seed_cake: `<rect x="12" y="24" width="40" height="26" rx="6" fill="#e6c48a"/><rect x="12" y="24" width="40" height="8" rx="4" fill="#f6e7c8"/><circle cx="24" cy="40" r="1.8" fill="#5f4029"/><circle cx="34" cy="37" r="1.8" fill="#5f4029"/><circle cx="42" cy="43" r="1.8" fill="#5f4029"/>`,
  mint_tea: `<path d="M14 26h32v14a16 16 0 0 1-32 0z" fill="#f6efe2"/><ellipse cx="30" cy="26" rx="16" ry="4.4" fill="#8fcc76"/><path d="M46 30c10 0 10 13-2 13" stroke="#f6efe2" stroke-width="4" fill="none"/>`,
  mill_blend: `<rect x="18" y="16" width="28" height="38" rx="5" fill="#a8674a"/><rect x="22" y="10" width="20" height="8" rx="2" fill="#7a5340"/><rect x="23" y="28" width="18" height="14" rx="2" fill="#f6e7c8"/>`,
  shell_chime: `<path d="M12 12h40" stroke="#b9a388" stroke-width="5" stroke-linecap="round"/><path d="M20 12v18M32 12v28M44 12v14" stroke="#c4a67a" stroke-width="2"/><circle cx="20" cy="34" r="6" fill="#f4c9b8"/><circle cx="32" cy="46" r="7" fill="#8fd8c0"/><circle cx="44" cy="31" r="6" fill="#f4c9b8"/>`,
  sea_broth: `<path d="M9 30h46c0 14-10 24-23 24S9 44 9 30z" fill="#7fb8c8"/><ellipse cx="32" cy="30" rx="23" ry="6" fill="#4f8f6a"/><path d="M24 20c-3-4 3-6 0-10M38 20c-3-4 3-6 0-10" stroke="#f6efe2" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  driftwood: `<rect x="8" y="24" width="48" height="16" rx="8" fill="#b9a388"/><path d="M14 30h26M20 35h24" stroke="#94806a" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="51" cy="32" rx="4.6" ry="7" fill="#d8c8ae"/>`,
  birch_bark: `<path d="M14 14c12-4 24-4 36 0v36c-12-4-24-4-36 0z" fill="#f6f1e4"/><path d="M20 24h10M36 32h8M22 40h6" stroke="#3a3340" stroke-width="2.6" stroke-linecap="round"/>`,
  jam: `<rect x="16" y="20" width="32" height="34" rx="7" fill="#7a2f4e"/><rect x="14" y="12" width="36" height="11" rx="3" fill="#f2d9a8"/><rect x="21" y="32" width="22" height="13" rx="2.5" fill="#fff6e6"/>`,
  soup: `<path d="M9 30h46c0 14-10 24-23 24S9 44 9 30z" fill="#e9b26a"/><ellipse cx="32" cy="30" rx="23" ry="6" fill="#c9884a"/><path d="M24 20c-3-4 3-6 0-10M38 20c-3-4 3-6 0-10" stroke="#f6efe2" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  charm: `<path d="M32 8v16" stroke="#c4a67a" stroke-width="4" stroke-linecap="round"/><path d="M32 22l13 15-13 18-13-18z" fill="#dfeaf0"/><path d="M32 22l13 15H19z" fill="#fff" opacity=".6"/>`,
  tart: `<path d="M8 38h48l-5 14H13z" fill="#d9a05e"/><ellipse cx="32" cy="38" rx="24" ry="9" fill="#6a3a78"/>${round(24, 37, 3, "#8a5aa0")}${round(38, 39, 3, "#8a5aa0")}${round(31, 34, 2.6, "#8a5aa0")}`,
  moon_tea: `<path d="M12 26h34v14a16 16 0 0 1-32 0z" fill="#e8eff8" transform="translate(1 0)"/><ellipse cx="30" cy="26" rx="17" ry="4.6" fill="#a9c4e8"/><path d="M47 30c10 0 10 13-2 13" stroke="#e8eff8" stroke-width="4" fill="none"/>`,
  pendant: `<path d="M12 10c4 18 36 18 40 0" stroke="#c98a5e" stroke-width="3" fill="none"/><path d="M32 26l12 13-12 16-12-16z" fill="#7fc4e8"/><path d="M32 26l12 13-12 16" fill="#4f9fd0"/>`,
};

export function itemIcon(id: ItemId): string {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${ICONS[id]}</svg>`;
}

export const COIN = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="24" fill="#f2c44a"/><circle cx="32" cy="32" r="17" fill="#e2a93a"/><path d="M32 20c-6 7-6 18 0 24 6-6 6-17 0-24z" fill="#f8dc8a"/></svg>`;
