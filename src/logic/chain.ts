// Looking back (DBT: chain analysis): a short timeline of the day, moment by
// moment. The player taps the moment where a different choice would change
// things. Every moment gets an answer; none is marked right or wrong.
// Player-facing text describes what each step is for, without DBT terms.

import type { Completeness } from "./outcome";
import type { Variant } from "./facts";

export interface ChainRecord {
  variant: Variant;
  label: string;
  hideCount: number;
  bailed: boolean;
  path: "opposite" | "repair";
  completeness: Completeness;
  fit: boolean;
  factsSeen: number;
}

export type LinkId = "vulnerability" | "prompt" | "emotion" | "urge" | "action" | "facts" | "skill" | "outcome";

export interface ChainLink {
  id: LinkId;
  title: string;
  detail: string;
  /** What changes if something different happens at this link. */
  reflection: string;
}

const PART_NAMES = {
  opposite: "go back, head up, say something steady",
  repair: "own it, make amends, let it go",
};

function outcomeText(r: ChainRecord): string {
  if (r.completeness === "full") return "The lanterns went up. Light reached your lane. An invitation came.";
  if (r.completeness === "partial") return "The square lit, mostly. Things with Mara felt a little unfinished.";
  return "The lanterns went up without you. The shadow in your lane stayed.";
}

export function buildChain(r: ChainRecord): ChainLink[] {
  const promise = r.variant === "promise";
  const named = r.label ? `You called it ${r.label}.` : "You didn't put a name on it.";
  return [
    {
      id: "vulnerability",
      title: "Before it happened",
      detail: promise
        ? "Rushing before sunset, arms full, the heirloom stacked on top."
        : "Rushing before sunset, all twelve lanterns in one trip.",
      reflection:
        "Rushing and full arms make a fall more likely. Two trips instead of one" +
        (promise ? ", or carrying her grandmother's lantern on its own as promised," : "") +
        " might have meant no fall at all. Not everything is in your control, but this partly was.",
    },
    {
      id: "prompt",
      title: "What set it off",
      detail: "You tripped. Someone laughed.",
      reflection:
        "This is the hardest moment to change. Stones are loose; people laugh. " +
        "What happens after it is where most of the choices are.",
    },
    {
      id: "emotion",
      title: "What you felt",
      detail: `Hot face, eyes down, wanting to vanish. ${named}`,
      reflection:
        "Putting a name on the feeling gives you something to check against what happened. " +
        "The hot face and the pull to hide are useful clues for finding the name.",
    },
    {
      id: "urge",
      title: "What it pushed you to do",
      detail: "Get out of sight. Hide.",
      reflection:
        "A pull isn't a choice yet. Noticing \"this is the pull to hide\" is what makes room " +
        "to pick something else, or to pick hiding on purpose.",
    },
    {
      id: "action",
      title: "What you did",
      detail:
        r.hideCount === 0
          ? "You stayed in the square, urge and all."
          : `You hid${r.hideCount > 1 ? `, ${r.hideCount} times` : ""}${r.bailed ? ", including partway back" : ""}. The relief was real.`,
      reflection:
        r.hideCount === 0
          ? "Staying kept you next to the facts while they were still fresh. Distress stayed high for a while; that was the cost."
          : "Hiding worked: the bad feeling dropped fast. Meanwhile the lanterns stayed down, and Mara and Tobin each decided it was their fault. This is a moment where doing something different changes what happens next.",
    },
    {
      id: "facts",
      title: "Looking again",
      detail: `You looked at ${r.factsSeen} details. You decided the feeling ${r.fit ? "matched what happened" : "didn't match what happened"}.`,
      reflection: promise
        ? "Here it was mixed: the laugh and the stares weren't what the feeling said, but the broken promise was real. Whether a feeling fits is what decides between doing the opposite and fixing something."
        : "Here the story the feeling told and what actually happened came apart: one laugh, most people didn't notice, and the one who laughed had fallen too. Whether a feeling fits is what decides between doing the opposite and fixing something.",
    },
    {
      id: "skill",
      title: r.path === "opposite" ? "Doing the opposite" : "Making it right",
      detail:
        r.completeness === "full"
          ? `All the way: ${PART_NAMES[r.path]}.`
          : `Part of the way (${PART_NAMES[r.path]}).`,
      reflection:
        r.completeness === "full"
          ? "It felt worse before it felt better. Doing every part is what let the feeling come all the way down."
          : "Each part you leave out keeps a piece of the old pull in charge. The result followed: partway down, not all the way.",
    },
    {
      id: "outcome",
      title: "What followed",
      detail: outcomeText(r),
      reflection:
        "This is where the day ended up, not where it could change. To change it, look at the moments before.",
    },
  ];
}
