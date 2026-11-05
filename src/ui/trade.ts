// The panels for what you've gathered: your bag and log, selling, giving, making and buying.
// None of them score anything: prices are just prices, and a gift has no wrong answer.

import { LANTERN_PAINTS, LANTERN_PRICE, LANTERN_SHAPES, MAX_LANTERNS, NATURE_ITEMS, priceFrom, type MyLantern, BUYERS, canAfford, CLOTHES, counterPrice, COUNTER, countOf, DECOR_SHOP, giftFit, ITEM_IDS, ITEMS, RECIPES, sellable, TOOLS, type BagState, type Buyer, type Friend, type ItemId, type Tool } from "../logic/bag";
import { FURNITURE, FURNITURE_IDS, type Furnishings, type FurnitureId, type RoomId } from "../logic/furniture";
import { COIN, itemIcon } from "./items";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

function btn(text: string, cls: string, run: () => void): HTMLButtonElement {
  const b = el("button", cls, text);
  b.addEventListener("click", run);
  return b;
}

function open(panel: HTMLElement, ...kids: Node[]) {
  const card = el("div", "panel-card trade");
  card.append(...kids);
  panel.replaceChildren(card);
  panel.hidden = false;
}

function close(panel: HTMLElement) {
  panel.hidden = true;
  panel.replaceChildren();
}

function coins(n: number): HTMLElement {
  const c = el("span", "coins");
  c.innerHTML = COIN;
  c.append(String(n));
  return c;
}

function head(eyebrow: string, title: string, bag: BagState): HTMLElement {
  const row = el("div", "trade-head");
  const t = el("div");
  t.append(el("p", "eyebrow", eyebrow), el("h2", "", title));
  row.append(t, coins(bag.coins));
  return row;
}

function tile(id: ItemId, count: number | null, sub: string, run?: () => void, off = false): HTMLElement {
  const t = run ? el("button", "item-tile") : el("div", "item-tile");
  const art = el("span", "item-art");
  art.innerHTML = itemIcon(id);
  if (count !== null) art.append(el("b", "item-count", String(count)));
  t.append(art, el("span", "item-name", ITEMS[id].name), el("span", "item-sub", sub));
  if (run) t.addEventListener("click", run);
  if (off) (t as HTMLButtonElement).disabled = true;
  return t;
}

const NAMES: Record<Friend | "fen", string> = { fen: "Fen", ash: "Ash", wren: "Wren", tobin: "Tobin", nell: "Nell", mara: "Mara", oda: "Oda", pip: "Pip", juno: "Juno" };

/** Your bag, your tools, and a log of everything there is to find. */
export function runBagScreen(panel: HTMLElement, getBag: () => BagState, onTool: (tool: Tool) => void, onChange: () => void): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      close(panel);
      resolve();
    };
    const draw = () => {
      const bag = getBag();
      const have = ITEM_IDS.filter((id) => countOf(bag, id) > 0);
      const grid = el("div", "item-grid");
      grid.append(...have.map((id) => tile(id, countOf(bag, id), ITEMS[id].note)));
      const tools = el("div", "shop-list");
      for (const tool of Object.keys(TOOLS) as Tool[]) {
        const t = TOOLS[tool];
        const owned = bag.tools.includes(tool);
        const row = el("div", "shop-row");
        const text = el("div");
        text.append(el("strong", "", t.name), el("span", "item-sub", owned ? t.use : `Make it from ${needsLine(bag, t.needs)}`));
        const make = btn(owned ? "Yours" : "Make", owned ? "ghost" : "primary", () => {
          onTool(tool);
          draw();
        });
        make.disabled = owned || !canAfford(bag, t.needs);
        row.append(text, make);
        tools.append(row);
      }
      const log = el("div", "item-log");
      for (const id of ITEM_IDS) {
        const seen = bag.found.includes(id);
        const dot = el("span", seen ? "log-dot" : "log-dot unseen");
        dot.title = seen ? ITEMS[id].name : "Not found yet";
        if (seen) dot.innerHTML = itemIcon(id);
        log.append(dot);
      }
      const row = el("div", "row");
      row.append(btn("Close", "primary", done), btn("Get changed", "ghost", () => {
        close(panel);
        onChange();
        resolve();
      }));
      open(
        panel,
        head("Your bag", have.length ? "What you're carrying" : "Nothing in it yet", bag),
        ...(have.length ? [grid] : [el("p", "hint", "Walk up to anything growing or lying about and press E. Fruit, mushrooms, driftwood and bark are free for the taking.")]),
        el("p", "eyebrow", "Tools"),
        tools,
        el("p", "eyebrow", `Found so far: ${bag.found.length} of ${ITEM_IDS.length}`),
        log,
        row,
      );
    };
    draw();
  });
}

/** Sell to one villager, one thing at a time. */
export function runSellScene(panel: HTMLElement, who: Buyer | "stall", bag: () => BagState, onSell: (id: ItemId) => void): Promise<void> {
  return new Promise((resolve) => {
    const draw = () => {
      const b = bag();
      const list = sellable(b, who);
      const grid = el("div", "item-grid");
      grid.append(...list.map((id) => tile(id, countOf(b, id), `${priceFrom(who, id)} coins`, () => {
        onSell(id);
        draw();
      })));
      const wants = who === "stall" ? "" : BUYERS[who].filter((k) => k !== "made").join(" and ");
      const name = who === "stall" ? "the stall" : NAMES[who];
      open(
        panel,
        head(`Selling to ${name}`, list.length ? "Pick what to sell" : who === "stall" ? "Nothing to sell yet" : "Nothing they're after", b),
        ...(list.length ? [grid] : [el("p", "hint", who === "stall" ? "Anything you gather or make can be left here, and the coins are in the tin." : `${name} buys ${wants === "fish" ? "fish" : wants === "fruit" ? "fruit" : wants === "mineral" ? "stones" : "mushrooms"}, and anything you've made.`)]),
        btn("That's all", "primary", () => {
          close(panel);
          resolve();
        }),
      );
    };
    draw();
  });
}

/** Design a lantern at Tobin's bench. */
export function runLanternScene(panel: HTMLElement, bag: () => BagState, onMake: (l: MyLantern) => void): Promise<void> {
  return new Promise((resolve) => {
    const pick: MyLantern = { colour: LANTERN_PAINTS[0], shape: "round" };
    const SIZE = { round: [34, 38], tall: [26, 50], wide: [46, 30] } as const;
    const draw = () => {
      const b = bag();
      const [rx, ry] = SIZE[pick.shape];
      const art = el("div", "lantern-preview");
      art.innerHTML = `<svg viewBox="0 0 120 130" aria-hidden="true"><path d="M60 0v${64 - ry}" stroke="#8a6a52" stroke-width="3"/><rect x="48" y="${60 - ry}" width="24" height="7" rx="2" fill="#3a3340"/><ellipse cx="60" cy="68" rx="${rx}" ry="${ry}" fill="${pick.colour}"/><ellipse cx="${60 - rx * 0.35}" cy="${68 - ry * 0.35}" rx="${rx * 0.2}" ry="${ry * 0.26}" fill="#fff" opacity=".45"/><rect x="50" y="${66 + ry}" width="20" height="6" rx="2" fill="#3a3340"/></svg>`;
      const paints = el("div", "lantern-paints");
      for (const c of LANTERN_PAINTS) {
        const s = el("button", c === pick.colour ? "paint on" : "paint");
        s.style.background = c;
        s.setAttribute("aria-label", "Colour");
        s.addEventListener("click", () => {
          pick.colour = c;
          draw();
        });
        paints.append(s);
      }
      const shapes = el("div", "row");
      for (const sh of LANTERN_SHAPES) shapes.append(btn(sh[0].toUpperCase() + sh.slice(1), sh === pick.shape ? "primary" : "ghost", () => {
        pick.shape = sh;
        draw();
      }));
      const full = b.lanterns.length >= MAX_LANTERNS;
      const make = btn(full ? "The string is full" : `Make it (${LANTERN_PRICE} coins)`, "primary", () => {
        onMake({ ...pick });
        draw();
      });
      make.disabled = full || b.coins < LANTERN_PRICE;
      const row = el("div", "row");
      row.append(make, btn("Done", "ghost", () => {
        close(panel);
        resolve();
      }));
      open(panel, head("Tobin's bench", "Make a lantern", b), art, paints, shapes, el("p", "hint", `Yours hang on the string in the Square. ${b.lanterns.length} of ${MAX_LANTERNS} up so far.`), row);
    };
    draw();
  });
}

/** Juno's table: bring one of each thing you've found. Returns whether you brought anything. */
export function runNatureScene(panel: HTMLElement, bag: () => BagState, onBring: (id: ItemId) => void): Promise<boolean> {
  return new Promise((resolve) => {
    let brought = false;
    const draw = () => {
      const b = bag();
      const grid = el("div", "item-grid");
      for (const id of NATURE_ITEMS) {
        if (b.nature.includes(id)) grid.append(tile(id, null, "On the table"));
        else if (countOf(b, id) > 0) grid.append(tile(id, countOf(b, id), "Bring one", () => {
          onBring(id);
          brought = true;
          draw();
        }));
        else {
          const t = el("div", "item-tile empty");
          t.append(el("span", "item-art"), el("span", "item-name", "Not yet"), el("span", "item-sub", b.found.includes(id) ? ITEMS[id].name : ""));
          grid.append(t);
        }
      }
      open(panel, head("Juno's nature table", `${b.nature.length} of ${NATURE_ITEMS.length} found`, b), grid, btn("Done", "primary", () => {
        close(panel);
        resolve(brought);
      }));
    };
    draw();
  });
}

/** Mara's shelf: pick what to take, then what to leave. */
export function runSwapScene(panel: HTMLElement, bag: () => BagState, onSwap: (leave: ItemId, take: ItemId) => void): Promise<void> {
  return new Promise((resolve) => {
    let want: ItemId | null = null;
    const draw = () => {
      const b = bag();
      const shelf = el("div", "item-grid");
      shelf.append(...b.shelf.map((id) => tile(id, null, id === want ? "You'll take this" : "Take this", () => {
        want = id;
        draw();
      })));
      const mine = el("div", "item-grid");
      const have = ITEM_IDS.filter((id) => countOf(b, id) > 0);
      mine.append(...have.map((id) => tile(id, countOf(b, id), want ? "Leave this" : "", want ? () => {
        onSwap(id, want!);
        want = null;
        draw();
      } : undefined)));
      open(
        panel,
        head("Mara's swap shelf", "Leave one, take one", b),
        el("p", "eyebrow", "On the shelf"),
        shelf,
        el("p", "eyebrow", want ? "Now leave something of yours" : "In your bag"),
        ...(have.length ? [mine] : [el("p", "hint", "You'll need something to leave.")]),
        btn("Done", "primary", () => {
          close(panel);
          resolve();
        }),
      );
    };
    draw();
  });
}

/** Furniture Tobin sells. Some things you can only make yourself. */
export const furnitureRows = (): ShopRow[] =>
  FURNITURE_IDS.flatMap((id) => {
    const f = FURNITURE[id] as { name: string; price?: number };
    return f.price ? [{ id: `piece_${id}`, name: f.name, note: "Goes in your store, ready to put anywhere", price: f.price }] : [];
  });

function needsLine(b: BagState, needs: Partial<Record<ItemId, number>>): string {
  return (Object.entries(needs) as [ItemId, number][]).map(([id, n]) => `${n} ${ITEMS[id].name.toLowerCase()} (${countOf(b, id)})`).join(", ");
}

export type FurnishAct = { kind: "place"; id: FurnitureId } | { kind: "make"; id: FurnitureId } | { kind: "away"; index: number } | { kind: "turn"; index: number } | null;

/** Your furniture: put something down where you're standing, change what's in this room, or make something. */
export function runFurnishScene(panel: HTMLElement, room: RoomId, f: () => Furnishings, bag: () => BagState, onMake: (id: FurnitureId) => void, onChange: (act: Exclude<FurnishAct, null>) => void): Promise<FurnitureId | null> {
  return new Promise((resolve) => {
    const finish = (v: FurnitureId | null) => {
      close(panel);
      resolve(v);
    };
    const draw = () => {
      const now = f();
      const b = bag();
      const store = el("div", "shop-list");
      const counts = new Map<FurnitureId, number>();
      for (const id of now.stored) counts.set(id, (counts.get(id) ?? 0) + 1);
      for (const [id, n] of counts) {
        const row = el("div", "shop-row");
        const t = el("div");
        t.append(el("strong", "", FURNITURE[id].name), el("span", "item-sub", n > 1 ? `You have ${n}` : "In your store"));
        row.append(t, btn("Put it here", "primary", () => finish(id)));
        store.append(row);
      }
      const here = el("div", "shop-list");
      now.placed.forEach((p, i) => {
        if (p.room !== room) return;
        const row = el("div", "shop-row");
        row.append(el("strong", "", FURNITURE[p.id].name));
        const acts = el("div", "row");
        acts.append(btn("Turn", "ghost", () => {
          onChange({ kind: "turn", index: i });
          draw();
        }), btn("Put away", "ghost", () => {
          onChange({ kind: "away", index: i });
          draw();
        }));
        row.append(acts);
        here.append(row);
      });
      const make = el("div", "shop-list");
      for (const id of FURNITURE_IDS) {
        const piece = FURNITURE[id] as { name: string; needs?: Partial<Record<ItemId, number>> };
        if (!piece.needs) continue;
        const row = el("div", "shop-row");
        const t = el("div");
        t.append(el("strong", "", piece.name), el("span", "item-sub", needsLine(b, piece.needs)));
        const go = btn("Make", "ghost", () => {
          onMake(id);
          draw();
        });
        go.disabled = !canAfford(b, piece.needs);
        row.append(t, go);
        make.append(row);
      }
      open(
        panel,
        head("Your home", "Furnish", b),
        el("p", "eyebrow", "Your store"),
        ...(counts.size ? [store] : [el("p", "hint", "Nothing stored. Make something below, or buy from Tobin.")]),
        ...(here.children.length ? [el("p", "eyebrow", "In this room"), here] : []),
        el("p", "eyebrow", "Make something"),
        make,
        btn("Done", "primary", () => finish(null)),
      );
    };
    draw();
  });
}

/** The stall by the woods gate: what you'd do with villagers in the week after the storm, when nobody's about. */
export function runStallScene(panel: HTMLElement, bag: BagState): Promise<"sell" | "clothes" | "house" | "furniture" | "make" | null> {
  return new Promise((resolve) => {
    const go = (v: "sell" | "clothes" | "house" | "furniture" | "make" | null) => () => {
      close(panel);
      resolve(v);
    };
    const row = el("div", "row");
    row.append(btn("Sell things", "primary", go("sell")), btn("Clothes", "ghost", go("clothes")), btn("For the house", "ghost", go("house")), btn("Furniture", "ghost", go("furniture")), btn("Make something", "ghost", go("make")), btn("Leave", "ghost", go(null)));
    open(panel, head("By the gate", "The woods stall", bag), el("p", "hint", "Nell and Tobin leave things here, and there's a tin for coins. Nobody's watching it."), row);
  });
}

/** Choose something to give. Returns what you chose and how it lands, or null if you changed your mind. */
export function runGiftScene(panel: HTMLElement, who: Friend, bag: BagState): Promise<{ item: ItemId; fit: ReturnType<typeof giftFit> } | null> {
  return new Promise((resolve) => {
    const have = ITEM_IDS.filter((id) => countOf(bag, id) > 0);
    const grid = el("div", "item-grid");
    grid.append(...have.map((id) => tile(id, countOf(bag, id), ITEMS[id].kind === "made" ? "You made this" : "", () => {
      close(panel);
      resolve({ item: id, fit: giftFit(who, id) });
    })));
    open(
      panel,
      head(`For ${NAMES[who]}`, "What would they like?", bag),
      ...(have.length ? [grid] : [el("p", "hint", "Your bag's empty. Bring something back from the woods.")]),
      btn("Not today", "ghost", () => {
        close(panel);
        resolve(null);
      }),
    );
  });
}

/** Make things at your table. */
export function runCraftScene(panel: HTMLElement, bag: () => BagState, onMake: (id: ItemId) => void): Promise<void> {
  return new Promise((resolve) => {
    const draw = () => {
      const b = bag();
      const grid = el("div", "item-grid");
      for (const r of RECIPES) {
        const needs = (Object.entries(r.needs) as [ItemId, number][]).map(([id, n]) => `${n} ${ITEMS[id].name.toLowerCase()} (${countOf(b, id)})`).join(", ");
        const can = canAfford(b, r.needs);
        grid.append(tile(r.makes, countOf(b, r.makes) || null, needs, () => {
          onMake(r.makes);
          draw();
        }, !can));
      }
      open(panel, head("Your table", "Make something", b), el("p", "hint", "Things you make are worth more, and people notice them."), grid, btn("Done", "primary", () => {
        close(panel);
        resolve();
      }));
    };
    draw();
  });
}

/** Tobin builds these: the house grows outside as well as in. */
const ROOM_ROWS: ShopRow[] = [
  { id: "room_up", name: "An upstairs bedroom", note: "Stairs, and a new floor on the house", price: 120 },
  { id: "room_side", name: "A side room", note: "A new room on the side of the house", price: 140 },
];

const SHOP_NAMES: Record<string, [string, string]> = {
  nell: ["Nell's sewing room", "Something to wear"],
  furniture: ["Tobin's workshop", "Furniture"],
  wren: ["The bakery", "Fresh today"],
  ash: ["Mae's Tea Room", "From the counter"],
  fen: ["Fen's fish stall", "Off the smoker"],
};

export interface ShopRow {
  id: string;
  name: string;
  note: string;
  price: number;
}

/** What each seller has on offer. */
export function shopRows(who: string): ShopRow[] {
  if (who === "wren" || who === "ash" || who === "fen") return COUNTER[who].map((id) => ({ id: `item_${id}`, name: ITEMS[id].name, note: ITEMS[id].note, price: counterPrice(id) }));
  if (who === "furniture") return furnitureRows();
  if (who === "nell") return CLOTHES.map((c) => ({ id: c.id, name: c.name, note: c.slot === "hat" ? "To wear on your head" : "To wear round your shoulders", price: c.price }));
  return [...ROOM_ROWS, ...DECOR_SHOP];
}

/** Buy extras. `owned` says what you already have. */
export function runShopScene(panel: HTMLElement, who: string, bag: () => BagState, owned: () => readonly string[], onBuy: (row: ShopRow) => void): Promise<void> {
  return new Promise((resolve) => {
    const draw = () => {
      const b = bag();
      const list = el("div", "shop-list");
      for (const r of shopRows(who)) {
        const have = owned().includes(r.id);
        const row = el("div", "shop-row");
        const text = el("div");
        text.append(el("strong", "", r.name), el("span", "item-sub", r.note));
        const buy = btn(have ? "Yours" : `${r.price} coins`, have ? "ghost" : "primary", () => {
          onBuy(r);
          draw();
        });
        buy.disabled = have || b.coins < r.price;
        row.append(text, buy);
        list.append(row);
      }
      open(panel, head(SHOP_NAMES[who]?.[0] ?? "Tobin's bench", SHOP_NAMES[who]?.[1] ?? "Something for the house", b), list, btn("That's all", "primary", () => {
        close(panel);
        resolve();
      }));
    };
    draw();
  });
}
