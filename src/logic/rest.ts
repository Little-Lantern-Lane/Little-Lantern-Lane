// Chapter two: checking whether the guilt about stopping matches what's
// actually happening (DBT: check the facts, applied to guilt), and noticing
// the body's signs of running on empty. CLINICIAN REVIEW: see CLINICIAN_REVIEW.md.

export interface RestAnswers {
  /** Would resting let down someone who's counting on you, with nobody else to step in? */
  letsDown: boolean;
  /** Would people you care about push you away for taking a rest? */
  pushedAway: boolean;
}

export const REST_QUESTIONS: { key: keyof RestAnswers; text: string }[] = [
  { key: "letsDown", text: "Would resting let down someone who's counting on you, with nobody else to step in?" },
  { key: "pushedAway", text: "Would people you care about push you away for taking a rest?" },
];

export function guiltFits(a: RestAnswers): boolean {
  return a.letsDown || a.pushedAway;
}

/** What your body has been telling you, by how many errands you've run. */
export function bodySignals(tasksDone: number): string[] {
  const signals = ["You slept about three hours.", "Your eyes sting."];
  if (tasksDone >= 1) signals.push("Your arms are heavy. You keep yawning.");
  if (tasksDone >= 2) signals.push("Your hands are shaking a little, and there's a headache behind your eyes.");
  if (tasksDone >= 3) signals.push("Everything is too bright and too loud.");
  return signals;
}
