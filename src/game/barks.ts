// Passing remarks: one-liners villagers say when you walk by. Flavor only;
// they never carry story or teach anything. Rules: CHARACTERS.md.

import type { CharacterId } from "../logic/cast";
import type { HotspotId } from "../logic/facts";
import type { WorldState } from "../logic/world";

type Npc = Exclude<CharacterId, "you">;
export type BarkPhase = "afternoon" | "facts" | "festival" | "day2" | "after_storm" | "mill_morning" | "mill_party" | "snow" | "snow_dawn" | "coast" | "coast_dusk";

export const BARKS: Record<BarkPhase, Partial<Record<Npc, string[]>>> = {
  afternoon: {
    nell: ["Mind the step.", "Lovely day for it.", "Somebody always drops something."],
    ash: ["Tea's on!", "Chipped cup's waiting for you."],
    wren: ["Sundown. SUNDOWN.", "Is that the oven?"],
    oda: ["It's always ready at sundown.", "Mind the flour, love."],
    tobin: ["Mind the stone by the fountain!", "Twelve lanterns. I counted."],
    mara: ["Lanterns, bread, candles...", "Okay. Okay. Okay."],
    pip: ["Is it sundown yet?", "I'm staying up ALL night!"],
    juno: ["Four hundred and twelve.", "Pip, that's not sundown."],
  },
  facts: {
    nell: ["Lanes go dark sometimes.", "Take your time."],
    ash: ["Tea's here when you want it."],
    wren: ["Bread's nearly ready."],
    oda: ["Come by later, love."],
    tobin: ["Sorry again. About the laugh."],
    mara: [],
    pip: ["It went round TWICE!"],
    juno: ["Still twelve."],
  },
  festival: {
    nell: ["Sixty-one festivals!", "Look at that light."],
    ash: ["Fresh pot!"],
    wren: ["They're not burnt. They're well done."],
    oda: ["Burnt ones! Free!"],
    tobin: ["Two falls, one stone!"],
    mara: ["It's lovely. It's actually lovely."],
    pip: ["LOOK at the red one!"],
    juno: ["Twelve. All lit."],
  },
  day2: {
    nell: ["A lie-in. Highly recommended."],
    ash: ["Offer stands!"],
    wren: ["My back is FINE."],
    oda: ["Trays, trays, trays."],
    tobin: ["Glue. Everywhere."],
    mara: ["Bunting, tables, chairs..."],
    pip: ["Lantern tag! Who's it?"],
    juno: ["Seventy-three flags."],
  },
  after_storm: {
    nell: ["Best storm yet!"],
    ash: ["Tea's hot!"],
    wren: ["I asked for help. Out loud."],
    oda: ["Dry in here. Mostly."],
    tobin: ["The stone held!"],
    mara: ["We're all still here."],
    pip: ["In, and slow out!"],
    juno: ["I counted the whole time."],
  },
  mill_morning: {
    ash: ["Forty cups. Forty.", "Is the sign straight? Don't tell me."],
    nell: ["My desk was right here.", "Sixty-one years. Smells better now."],
    tobin: ["The wheel still turns!", "Mind the race, it's deep."],
    iris: ["Charming. Very... rustic.", "Is there an espresso machine?"],
  },
  mill_party: {
    ash: ["Refills!", "We're out of chairs. We're OUT of chairs."],
    nell: ["Best seat in the house.", "Fancy cups, these."],
    tobin: ["Ten lanterns, none crooked. Nearly none."],
    mara: ["I left the list at home. On purpose."],
    wren: ["The scones are holding up."],
    oda: ["Burnt ones on the end, love."],
    pip: ["I'm on my THIRD cocoa."],
    juno: ["Thirty-eight cups. Thirty-nine."],
    iris: ["...It's rather good tea."],
  },
  snow: {
    nell: ["Mind the ice.", "Snow like this, you stay in."],
    oda: ["Pipes froze solid, love."],
    pip: ["Is it a BLIZZARD?"],
    juno: ["Hundreds of flakes. Thousands."],
  },
  snow_dawn: {
    nell: ["Look at that. Morning.", "Path's clear, thanks to someone."],
    hettie: ["I'm here. I'm here.", "Thank you. Thank you."],
    oda: ["Ovens are back on!"],
    pip: ["MUM!", "We made SNOWFLAKES."],
    juno: ["Eleven hours. I counted."],
  },
  coast: {
    fen: ["Bit of weather last week, ha!", "Mind the nets."],
    tobin: ["It smells exactly the same here.", "Dad. Dad. Not now."],
    hesketh: ["Mind your feet. The sea's been in."],
  },
  coast_dusk: {
    fen: ["Look at it, though. Look at it."],
    tobin: ["First one from the old mould."],
    hesketh: ["The sea takes. You make another."],
  },
};

/** Which details free each villager from the shame haze; they only chat once freed. */
const FREED_BY: Partial<Record<Npc, HotspotId>> = {
  tobin: "tobin",
  wren: "bakers",
  oda: "bakers",
  pip: "kids",
  juno: "kids",
  mara: "mara",
};

/** Which set of remarks fits the moment, or null when nobody should chat (storm, night, hiding). */
export function barkPhase(w: WorldState): BarkPhase | null {
  if (w.weather === "storm" || w.form === "shell" || w.ended) return null;
  if (w.level === 4) return w.time === "night" ? "mill_party" : "mill_morning";
  if (w.level === 5) return w.time === "morning" ? "snow_dawn" : w.time === "night" ? null : "snow";
  if (w.level === 6) return w.time === "sunset" || w.time === "night" ? "coast_dusk" : "coast";
  if (w.level === 3) return w.time === "night" ? "after_storm" : null;
  if (w.level === 2) return w.time === "night" ? null : "day2";
  if (w.time === "night") return w.lanterns === "hung" ? "festival" : null;
  if (w.lens === "shame") return "facts";
  if (w.lanterns === "workshop" || w.lanterns === "carried") return "afternoon";
  return null;
}

/** A remark for this villager right now, or null. `roll` is 0..1. */
export function pickBark(w: WorldState, id: Npc, roll: number): string | null {
  const phase = barkPhase(w);
  if (!phase) return null;
  if (phase === "facts") {
    const fact = FREED_BY[id];
    if (fact && !w.factsFound.includes(fact)) return null;
  }
  const lines = BARKS[phase][id] ?? [];
  if (!lines.length) return null;
  return lines[Math.min(lines.length - 1, Math.floor(roll * lines.length))];
}
