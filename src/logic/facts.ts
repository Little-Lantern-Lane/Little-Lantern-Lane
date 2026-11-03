// Check the facts. The square is first drawn the way shame sees it; inspecting
// each detail separates the interpretation from what actually happened.
// Fit criteria follow DBT Emotion Regulation (Linehan, ER Handout 11):
//   shame fits when people you care about would reject you if this were known;
//   guilt fits when your own behavior went against your values.
// Both lead to the same repair path here. CLINICIAN REVIEW: see CLINICIAN_REVIEW.md.

export type Variant = "main" | "promise";

export type HotspotId = "tobin" | "mara" | "bakers" | "kids" | "lanterns" | "stone";
export const HOTSPOT_IDS: readonly HotspotId[] = ["tobin", "mara", "bakers", "kids", "lanterns", "stone"];

export function isHotspotId(id: string): id is HotspotId {
  return (HOTSPOT_IDS as readonly string[]).includes(id);
}

export interface Hotspot {
  id: HotspotId;
  name: string;
  /** The interpretation, as shame tells it. */
  shameView: string;
  /** What is actually observable. */
  fact: string;
}

const SHARED: Record<Exclude<HotspotId, "mara" | "lanterns">, Hotspot> = {
  tobin: {
    id: "tobin",
    name: "Tobin",
    shameView: "He's laughing at you. By tonight the whole village will have heard.",
    fact:
      "One short laugh, then he stopped. His knees are dusty, and a cracked lantern sits on " +
      "his cart: he went down on the same loose stone this morning.",
  },
  bakers: {
    id: "bakers",
    name: "The bakers",
    shameView: "They all saw. They're all thinking about it.",
    fact:
      "Their backs are to you. They're arguing about whether the bread will be out of the oven " +
      "by sunset. They didn't notice.",
  },
  kids: {
    id: "kids",
    name: "The kids",
    shameView: "They're pointing at you.",
    fact:
      "They're pointing at the red lantern still rolling toward the fountain. They think it's " +
      "the best thing that's happened all day.",
  },
  stone: {
    id: "stone",
    name: "The loose stone",
    shameView: "You fell because you're clumsy and useless.",
    fact: "A cobblestone sticks up by the fountain, loose. Anyone could trip on it. You tripped on it. That is what happened.",
  },
};

export const HOTSPOTS: Record<Variant, Hotspot[]> = {
  main: [
    SHARED.tobin,
    {
      id: "mara",
      name: "Mara",
      shameView: "She's disgusted. You've ruined her festival.",
      fact: "She was asking everyone whether you were hurt. Worried about you, not angry, and not thinking about the lanterns.",
    },
    SHARED.bakers,
    SHARED.kids,
    {
      id: "lanterns",
      name: "The lanterns",
      shameView: "Ruined. All of them.",
      fact: "Ten are fine. Two are dented. Paper and wire bend back.",
    },
    SHARED.stone,
  ],
  promise: [
    SHARED.tobin,
    {
      id: "mara",
      name: "Mara",
      shameView: "She'll never trust you with anything again.",
      fact:
        "She's sad about her grandmother's lantern. She was also asking everyone whether you were hurt. " +
        "Sad and worried, not cruel.",
    },
    SHARED.bakers,
    SHARED.kids,
    {
      id: "lanterns",
      name: "The lanterns",
      shameView: "Ruined. All of them.",
      fact:
        "Eleven are fine. Mara's grandmother's lantern has a long tear down one side. It was on " +
        "top of the stack, where you put it after promising to carry it on its own.",
    },
    SHARED.stone,
  ],
};

export const MIN_INSPECTED = 3;

export interface FactsState {
  inspected: HotspotId[];
}

export function initialFacts(): FactsState {
  return { inspected: [] };
}

export function inspect(state: FactsState, id: HotspotId): FactsState {
  return state.inspected.includes(id) ? state : { inspected: [...state.inspected, id] };
}

export function canDecide(state: FactsState): boolean {
  return state.inspected.length >= MIN_INSPECTED;
}

export interface FitAnswers {
  /** Would people you care about reject you if they knew about this? */
  rejection: boolean;
  /** Did your own behavior go against your values? */
  values: boolean;
}

export const FIT_QUESTIONS: { key: keyof FitAnswers; text: string }[] = [
  { key: "rejection", text: "Would people you care about really push you away over this?" },
  { key: "values", text: "Did you go against something you care about?" },
];

export function emotionFits(a: FitAnswers): boolean {
  return a.rejection || a.values;
}

/** What the facts in each variant support, for chain review and playtest notes. */
export function factsSupport(variant: Variant): FitAnswers {
  return variant === "promise" ? { rejection: false, values: true } : { rejection: false, values: false };
}
