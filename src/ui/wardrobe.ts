// Choosing how you look and what your home is like. The choices themselves are
// plain data (src/logic/appearance.ts); this file turns them into a look for the
// plush drawing code and runs the panels where the player picks.

import {
  ADDITIONS, ANIMALS, BODIES, CUSTOM_PARTS, DOOR_COLORS, EXTRAS, HATS, HOME_STYLES, OUTFITS, ROOF_COLORS, WALL_COLORS,
  remainingAdditions, toggleAddition,
  type Addition, type CharacterChoice, type CustomHome, type HomeChoice,
} from "../logic/appearance";
import type { Expression } from "../logic/cast";
import { characterMarkup, setPlayerLook, VIEWBOX, type Face, type Look } from "./plush";
import { fitHomeSVG, HOME_H, homeSceneSVG, PAINTS, STYLES } from "../game/homes";

// --- What each choice looks like ---------------------------------------------------

type Furs = NonNullable<Look["furs"]> & { name: string };

export const ANIMAL_LOOKS: Record<CharacterChoice["animal"], { name: string; furs: Furs[] }> = {
  redpanda: { name: "Red panda", furs: [
    { name: "Classic", fur: "#c8582e", fur2: "#f7ecdc", ring: "#7e2f17" },
    { name: "Strawberry", fur: "#de7a5c", fur2: "#fbefe4", ring: "#a4452f" },
    { name: "Chestnut", fur: "#94492a", fur2: "#f2e2cc", ring: "#5a2812" },
  ] },
  fox: { name: "Fox", furs: [
    { name: "Ember", fur: "#e07a3c", fur2: "#fbf1e2" },
    { name: "Snow", fur: "#eef1f6", fur2: "#ffffff", feet: "#b9c2cf" },
    { name: "Silver", fur: "#7c8390", fur2: "#f3f3f5", feet: "#3a3d44" },
  ] },
  cat: { name: "Cat", furs: [
    { name: "Grey", fur: "#9aa0ab", fur2: "#f1ede8", feet: "#9aa0ab" },
    { name: "Ginger", fur: "#e8a25c", fur2: "#fbeedd", feet: "#e8a25c" },
    { name: "Cream", fur: "#f1e2c8", fur2: "#fffaf0", feet: "#e3cfae" },
  ] },
  bunny: { name: "Bunny", furs: [
    { name: "Snow", fur: "#f4ede4", fur2: "#ffffff", feet: "#e9ddd0" },
    { name: "Cocoa", fur: "#a67b5b", fur2: "#f1e3d2", feet: "#8a6448" },
    { name: "Pebble", fur: "#b8b3ae", fur2: "#f3f0ec", feet: "#9c968f" },
  ] },
  raccoon: { name: "Raccoon", furs: [
    { name: "Classic", fur: "#8f8a86", fur2: "#f3efe9", ring: "#4a4542" },
    { name: "Hazel", fur: "#9b8370", fur2: "#f4ece2", ring: "#4e3e32" },
    { name: "Frost", fur: "#b7bcc4", fur2: "#ffffff", ring: "#5d6470" },
  ] },
  koala: { name: "Koala", furs: [
    { name: "Grey", fur: "#a9adb5", fur2: "#e8e8ec" },
    { name: "Cocoa", fur: "#a08f84", fur2: "#ece4de" },
    { name: "Mist", fur: "#9fb0c0", fur2: "#e6edf3" },
  ] },
};

export const OUTFIT_COLORS = [
  { name: "Marigold", outfit: "#e0b04a", accent: "#9c6b1f" },
  { name: "Sky", outfit: "#7fb3d9", accent: "#3f6f99" },
  { name: "Rose", outfit: "#e39aab", accent: "#b8506a" },
  { name: "Sage", outfit: "#9cb67a", accent: "#5f7a44" },
  { name: "Lilac", outfit: "#b99ad6", accent: "#7a5aa0" },
  { name: "Tomato", outfit: "#e9735a", accent: "#f6d36a" },
];

const OUTFIT_LOOKS: Record<CharacterChoice["outfit"], { name: string; extras: Look["extras"] }> = {
  tunic: { name: "Tunic and satchel", extras: ["satchel"] },
  dress: { name: "Dress", extras: ["dress"] },
  overalls: { name: "Overalls", extras: ["overalls"] },
  sweater: { name: "Striped sweater", extras: ["sweater"] },
  hoodie: { name: "Hoodie", extras: ["hoodie"] },
};
const HAT_NAMES: Record<CharacterChoice["hat"], string> = { none: "No hat", bow: "Bow", flowercrown: "Flower crown", beanie: "Beanie", sunhat: "Sun hat" };
const EXTRA_NAMES: Record<CharacterChoice["extra"], string> = { none: "Nothing", glasses: "Glasses", scarf: "Scarf", bowtie: "Bow tie" };
const BODY_NAMES: Record<CharacterChoice["body"], string> = { girl: "Girl", boy: "Boy" };

/** The two faces: lashes and rounder cheeks, or soft brows. */
const BODY_FACES: Record<CharacterChoice["body"], Face> = {
  girl: { eye: "oval", lashes: true, mouth: "w", headW: 1.04, headH: 1.02, blush: 0.75 },
  boy: { eye: "oval", brow: "soft", mouth: "w", headW: 1.08, headH: 0.98, blush: 0.5 },
};

export function lookFor(c: CharacterChoice): { look: Look; face: Face } {
  const color = OUTFIT_COLORS[c.color];
  // Overalls go over a cream shirt, in the chosen color.
  const overalls = c.outfit === "overalls";
  const extras = [...OUTFIT_LOOKS[c.outfit].extras, ...(c.hat === "none" ? [] : [c.hat]), ...(c.extra === "none" ? [] : [c.extra])] as Look["extras"];
  return {
    look: {
      species: c.animal,
      furs: ANIMAL_LOOKS[c.animal].furs[c.fur],
      outfit: overalls ? "#fffaf0" : color.outfit,
      accent: overalls ? color.outfit : color.accent,
      hat: color.accent,
      extras,
      scale: 1,
      build: 1,
    },
    face: BODY_FACES[c.body],
  };
}

/** Dress the player: their sprite and portrait use this from now on. */
export function applyCharacter(c: CharacterChoice): void {
  const { look, face } = lookFor(c);
  setPlayerLook(look, face);
}

export function describeCharacter(c: CharacterChoice): string {
  const a = ANIMAL_LOOKS[c.animal];
  const bits = [`${a.furs[c.fur].name.toLowerCase()} ${a.name.toLowerCase()}`, `${OUTFIT_COLORS[c.color].name.toLowerCase()} ${OUTFIT_LOOKS[c.outfit].name.toLowerCase()}`];
  if (c.hat !== "none") bits.push(HAT_NAMES[c.hat].toLowerCase());
  if (c.extra !== "none") bits.push(EXTRA_NAMES[c.extra].toLowerCase());
  return bits.join(", ");
}

/** The player (as currently dressed) drawn on its own. */
function playerSVG(expr: Expression = "neutral", cls = "") {
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX.x} ${VIEWBOX.y + 14} ${VIEWBOX.w} ${VIEWBOX.h - 8}" aria-hidden="true">${characterMarkup("you", expr)}</svg>`;
}

/** A home scene with the player standing on the grass beside the path. */
export function homeWithYouSVG(home: HomeChoice): string {
  return homeSceneSVG(home, (door) => `<g transform="translate(${Math.min(400, door + 66)} ${HOME_H - 14}) scale(.78)">${characterMarkup("you", "neutral")}</g>`);
}

// --- Panel building blocks ----------------------------------------------------------

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: { class?: string; text?: string } = {}, ...children: (Node | null)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.text) node.textContent = props.text;
  for (const c of children) if (c) node.appendChild(c);
  return node;
}

function button(text: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = h("button", { class: cls, text });
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

/** A labeled row of buttons, one of which is chosen. `swatch` puts a color dot before the name. */
function pickRow<T>(label: string, items: readonly T[], name: (t: T) => string, current: T, onPick: (t: T) => void, swatch?: (t: T) => string) {
  const row = h("div", { class: "pick-row" });
  for (const item of items) {
    const b = button(name(item), "pick", () => onPick(item));
    b.setAttribute("aria-pressed", String(item === current));
    if (swatch) b.prepend(Object.assign(h("span", { class: "swatch" }), { style: `background:${swatch(item)}` }));
    row.appendChild(b);
  }
  return h("div", { class: "pick-group" }, h("span", { class: "pick-label", text: label }), row);
}

/** A row of color dots. */
function colorRow(label: string, colors: string[], current: string, onPick: (c: string) => void) {
  const row = h("div", { class: "pick-row" });
  colors.forEach((c, i) => {
    const b = button("", "dot", () => onPick(c));
    b.style.background = c;
    b.setAttribute("aria-pressed", String(c === current));
    b.setAttribute("aria-label", `${label} ${i + 1}`);
    row.appendChild(b);
  });
  return h("div", { class: "pick-group" }, h("span", { class: "pick-label", text: label }), row);
}

function toggle(label: string, on: boolean, onChange: (on: boolean) => void, disabled = false) {
  const input = h("input");
  input.type = "checkbox";
  input.checked = on;
  input.disabled = disabled;
  input.addEventListener("change", () => onChange(input.checked));
  return h("label", { class: "pick-toggle" + (disabled ? " off" : "") }, input, h("span", { text: label }));
}

/** Show a card in the panel. Keeps the scroll position when the card is redrawn after a pick. */
function show(panel: HTMLElement, card: HTMLElement) {
  const old = panel.querySelector(".wardrobe-choices");
  const scroll = old?.scrollTop ?? 0;
  panel.replaceChildren(card);
  panel.hidden = false;
  const fresh = panel.querySelector(".wardrobe-choices");
  if (fresh) fresh.scrollTop = scroll;
}

function close(panel: HTMLElement) {
  panel.hidden = true;
  panel.replaceChildren();
}

// --- Your character -----------------------------------------------------------------

/** Pick how you look. Resolves with the choice when the player is done. */
export function runCharacterScreen(panel: HTMLElement, start: CharacterChoice, onPick?: () => void): Promise<CharacterChoice> {
  return new Promise((resolve) => {
    let c = { ...start };
    const set = (patch: Partial<CharacterChoice>) => {
      c = { ...c, ...patch };
      onPick?.();
      render();
    };
    const render = () => {
      applyCharacter(c);
      const preview = h("div", { class: "wardrobe-preview" });
      const stage = h("div", { class: "wardrobe-stage" });
      stage.innerHTML = playerSVG("neutral", "wardrobe-you");
      const feelings = h("div", { class: "wardrobe-feelings" });
      feelings.innerHTML = (["happy", "surprised", "worried", "tired"] as Expression[]).map((e) => playerSVG(e)).join("");
      preview.append(stage, h("p", { class: "hint", text: describeCharacter(c) }), feelings);

      const a = ANIMAL_LOOKS[c.animal];
      const choices = h(
        "div",
        { class: "wardrobe-choices" },
        pickRow("Body", BODIES, (b) => BODY_NAMES[b], c.body, (body) => set({ body })),
        pickRow("Animal", ANIMALS, (x) => ANIMAL_LOOKS[x].name, c.animal, (animal) => set({ animal, fur: 0 })),
        pickRow("Fur", [0, 1, 2], (i) => a.furs[i].name, c.fur, (fur) => set({ fur }), (i) => a.furs[i].fur),
        pickRow("Outfit", OUTFITS, (o) => OUTFIT_LOOKS[o].name, c.outfit, (outfit) => set({ outfit })),
        pickRow("Outfit color", [0, 1, 2, 3, 4, 5], (i) => OUTFIT_COLORS[i].name, c.color, (color) => set({ color }), (i) => OUTFIT_COLORS[i].outfit),
        pickRow("Hat", HATS, (x) => HAT_NAMES[x], c.hat, (hat) => set({ hat })),
        pickRow("Extra", EXTRAS, (x) => EXTRA_NAMES[x], c.extra, (extra) => set({ extra })),
      );
      const done = button("That's me", "primary", () => {
        close(panel);
        resolve(c);
      });
      show(
        panel,
        h(
          "div",
          { class: "panel-card wardrobe" },
          h("p", { class: "eyebrow", text: "Your character" }),
          h("h2", { text: "How do you look?" }),
          h("div", { class: "wardrobe-body" }, preview, choices),
          h("div", { class: "row" }, done),
        ),
      );
    };
    render();
    panel.querySelector<HTMLButtonElement>(".wardrobe .primary")?.focus();
  });
}

// --- Your home ----------------------------------------------------------------------

const ADDITION_NAMES: Record<Exclude<Addition, "up" | "side">, string> = { porch: "Porch with a bench and lantern", garden: "Vegetable garden" };

const PART_LABELS: Record<keyof typeof CUSTOM_PARTS, string> = { body: "House shape", roof: "Roof", texture: "Walls", door: "Door", window: "Windows", chimney: "Chimney", topper: "On the roof" };
const PART_NAMES: Record<string, string> = {
  cottage: "Cottage", tall: "Tall", long: "Long", round: "Round",
  gable: "Pointed", steep: "Steep", thatch: "Thatch", flat: "Flat with a terrace",
  plain: "Smooth", planks: "Wood boards", stone: "Stone", brick: "Brick",
  square: "Square", double: "Double", porthole: "With a round window",
  arch: "Arched", diamond: "Diamond panes",
  none: "None", pipe: "Stovepipe",
  weathervane: "Weathervane", flag: "Flag", lantern: "Paper lantern",
};
/** Where a part name differs by row ("Round" door vs "Round top"). */
const PART_OVERRIDES: Partial<Record<keyof typeof CUSTOM_PARTS, Record<string, string>>> = {
  roof: { round: "Rounded" },
  door: { round: "Round top" },
  window: { square: "Four panes", round: "Round" },
  topper: { none: "Nothing" },
};

/** What an addition is called for this home (growing up means different things for each). */
export function additionName(home: HomeChoice, a: Addition): string {
  if (a === "porch" || a === "garden") return ADDITION_NAMES[a];
  if (home.kind === "custom") return a === "up" ? "Another floor" : "Side room";
  return STYLES[home.style][a];
}

/** Choose a home: a ready-made style or one designed part by part, and its additions. */
export function runHomeScreen(panel: HTMLElement, start: HomeChoice, onPick?: () => void): Promise<HomeChoice> {
  return new Promise((resolve) => {
    let home: HomeChoice = { ...start, custom: { ...start.custom } };
    const set = (patch: Partial<HomeChoice>) => {
      home = { ...home, ...patch };
      onPick?.();
      render();
    };
    const setPart = (patch: Partial<CustomHome>) => set({ custom: { ...home.custom, ...patch } });
    const render = () => {
      const stage = h("div", { class: "wardrobe-home" });
      stage.innerHTML = homeWithYouSVG(home);
      const tabs = pickRow("Kind of home", ["style", "custom"] as const, (k) => (k === "style" ? "Ready-made" : "Design your own"), home.kind, (kind) => set({ kind }));

      const groups: HTMLElement[] = [tabs];
      if (home.kind === "style") {
        groups.push(pickRow("Style", HOME_STYLES, (s) => STYLES[s].name, home.style, (style) => set({ style })));
        groups.push(pickRow("Paint", [0, 1, 2, 3], (i) => PAINTS[i].name, home.paint, (paint) => set({ paint }), (i) => `linear-gradient(135deg, ${PAINTS[i].wall} 50%, ${PAINTS[i].roof} 50%)`));
      } else {
        for (const k of Object.keys(CUSTOM_PARTS) as (keyof typeof CUSTOM_PARTS)[]) {
          const options = CUSTOM_PARTS[k] as readonly string[];
          groups.push(pickRow(PART_LABELS[k], options, (v) => PART_OVERRIDES[k]?.[v] ?? PART_NAMES[v] ?? v, home.custom[k], (v) => setPart({ [k]: v } as Partial<CustomHome>)));
        }
        groups.push(colorRow("Wall color", WALL_COLORS, home.custom.wall, (wall) => setPart({ wall })));
        groups.push(colorRow("Roof color", ROOF_COLORS, home.custom.roofColor, (roofColor) => setPart({ roofColor })));
        groups.push(colorRow("Door color", DOOR_COLORS, home.custom.doorColor, (doorColor) => setPart({ doorColor })));
        groups.push(colorRow("Shutter color", DOOR_COLORS, home.custom.trim, (trim) => setPart({ trim })));
        groups.push(h("div", { class: "pick-group" }, toggle("Shutters", home.custom.shutters, (shutters) => setPart({ shutters })), toggle("Flower boxes", home.custom.boxes, (boxes) => setPart({ boxes }))));
      }

      // Additions: as many as the home has room for, which grows at each save point.
      const full = home.grown.length >= home.slots;
      const adds = h("div", { class: "pick-group" }, h("span", { class: "pick-label", text: "Additions" }));
      adds.append(
        h("p", {
          class: "hint",
          text: home.slots === 0
            ? "Your home grows as you play: at each save point it gets room for one more thing."
            : `Room for ${home.slots} of 4. Your home gets room for one more at each save point.`,
        }),
      );
      for (const a of ADDITIONS) {
        const on = home.grown.includes(a);
        adds.append(toggle(additionName(home, a), on, () => set({ grown: toggleAddition(home, a).grown }), !on && full));
      }
      groups.push(adds);

      const done = button("Done", "primary", () => {
        close(panel);
        resolve(home);
      });
      show(
        panel,
        h(
          "div",
          { class: "panel-card wardrobe" },
          h("p", { class: "eyebrow", text: "Your home" }),
          h("h2", { text: "What is your home like?" }),
          h("div", { class: "wardrobe-body" }, h("div", { class: "wardrobe-preview" }, stage), h("div", { class: "wardrobe-choices" }, ...groups)),
          h("div", { class: "row" }, done),
        ),
      );
      fitHomeSVG(stage.querySelector("svg"));
    };
    render();
  });
}

/** At a save point: the home has room for one more thing. Pick it now, or later from the title screen. */
export function runGrowScene(panel: HTMLElement, home: HomeChoice, onPick?: () => void): Promise<HomeChoice> {
  return new Promise((resolve) => {
    const options = remainingAdditions(home);
    const grid = h("div", { class: "grow-options" });
    for (const a of options) {
      const next = toggleAddition(home, a);
      const b = h("button", { class: "grow-option" });
      b.type = "button";
      b.innerHTML = homeWithYouSVG(next);
      b.append(h("span", { text: additionName(home, a) }));
      b.addEventListener("click", () => {
        onPick?.();
        close(panel);
        resolve(next);
      });
      grid.append(b);
    }
    const later = button("Decide later", "ghost", () => {
      close(panel);
      resolve(home);
    });
    show(
      panel,
      h(
        "div",
        { class: "panel-card wardrobe" },
        h("p", { class: "eyebrow", text: "Your home" }),
        h("h2", { text: "Your home has room to grow" }),
        h("p", { class: "hint", text: "Choose one thing to add. You can change it any time from the title screen." }),
        grid,
        h("div", { class: "row" }, later),
      ),
    );
    grid.querySelectorAll("svg").forEach((svg) => fitHomeSVG(svg));
  });
}
