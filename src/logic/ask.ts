// Chapter four: saying no to a friend while keeping the friendship and your own
// footing. The player puts together what they'll say from parts; this works out
// what the other person hears. Pure, so it can be tested.
// CLINICIAN REVIEW: the parts follow DBT's DEAR MAN (describe, express, assert,
// reinforce), GIVE (gentle) and FAST (no over-apologizing); none are named in play.

/** One slot in what you say, and the options for it. `kind` is what the option does. */
export interface AskPart {
  id: "facts" | "feeling" | "ask" | "why" | "how";
  prompt: string;
  options: { text: string; kind: AskKind }[];
}

export type AskKind =
  | "plain" // says what's happening without blame
  | "blame" // a judgment about the other person
  | "own" // your own feeling, as yours
  | "clear" // a clear yes/no with an offer
  | "vague" // maybe, I don't know
  | "flat" // no, and nothing else
  | "both" // why it's good for both of you
  | "gentle" // said kindly, looking at them
  | "sorry" // apologizing over and over
  | "skip"; // leave this part out

export const ASK_PARTS: AskPart[] = [
  {
    id: "facts",
    prompt: "Say what's being asked",
    options: [
      { text: "You're asking me to run the counter every morning, for free, until the shop takes off.", kind: "plain" },
      { text: "You always do this. You just assume I'll say yes.", kind: "blame" },
      { text: "(Leave it out)", kind: "skip" },
    ],
  },
  {
    id: "feeling",
    prompt: "Say how you feel",
    options: [
      { text: "I'm scared I'll run myself into the ground again, like before the storm.", kind: "own" },
      { text: "It's stressing me out, honestly.", kind: "blame" },
      { text: "(Leave it out)", kind: "skip" },
    ],
  },
  {
    id: "ask",
    prompt: "Say what you can do",
    options: [
      { text: "I can't do every morning. I can do Saturdays.", kind: "clear" },
      { text: "Maybe? I don't know. Let me think about it.", kind: "vague" },
      { text: "No.", kind: "flat" },
    ],
  },
  {
    id: "why",
    prompt: "Say why it helps you both",
    options: [
      { text: "You'd get a friend who turns up rested, instead of one who's quietly fed up by December.", kind: "both" },
      { text: "(Leave it out)", kind: "skip" },
    ],
  },
  {
    id: "how",
    prompt: "How you say it",
    options: [
      { text: "Gently, looking at Ash", kind: "gentle" },
      { text: "With a lot of sorries", kind: "sorry" },
      { text: "Fast, to the floor", kind: "skip" },
    ],
  },
];

export type AskAnswers = Partial<Record<AskPart["id"], AskKind>>;

export interface AskResult {
  /** What Ash hears as the answer: a clear offer, a maybe (which sounds like yes), or a bare no. */
  answer: "clear" | "vague" | "flat";
  /** Ash knows exactly what you can and can't do. */
  clear: boolean;
  /** Said in a way that keeps the friendship warm. */
  kind: boolean;
  /** You didn't talk yourself down or blame. */
  steady: boolean;
}

export function judgeAsk(a: AskAnswers): AskResult {
  const blamed = a.facts === "blame" || a.feeling === "blame";
  return {
    answer: a.ask === "vague" ? "vague" : a.ask === "flat" ? "flat" : "clear",
    clear: a.ask === "clear",
    kind: !blamed && (a.how === "gentle" || a.why === "both") && a.ask !== "flat",
    steady: !blamed && a.how !== "sorry" && a.ask !== "vague",
  };
}

/** The sentence as it would be said, for the preview. */
export function sayAsk(a: AskAnswers): string {
  return ASK_PARTS.filter((p) => p.id !== "how")
    .map((p) => p.options.find((o) => o.kind === a[p.id] && o.kind !== "skip")?.text)
    .filter(Boolean)
    .join(" ");
}
