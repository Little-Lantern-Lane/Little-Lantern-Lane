// Who is in the village. Personalities live in CHARACTERS.md; looks live in
// src/ui/looks.ts. This file holds only what the story and logic need.

export const CAST = {
  you: { name: "You" },
  mara: { name: "Mara" },
  tobin: { name: "Tobin" },
  wren: { name: "Wren" },
  oda: { name: "Oda" },
  pip: { name: "Pip" },
  juno: { name: "Juno" },
  nell: { name: "Nell" },
  ash: { name: "Ash" },
  iris: { name: "Iris" },
  fen: { name: "Fen" },
  hesketh: { name: "Hesketh" },
  hettie: { name: "Hettie" },
} as const;

export type CharacterId = keyof typeof CAST;
export const CHARACTER_IDS = Object.keys(CAST) as CharacterId[];

/** Characters who are talked to together: the bakers and the kids. */
const GROUPS: Partial<Record<CharacterId, CharacterId[]>> = { wren: ["oda"], pip: ["juno"] };

export function talkGroup(id: CharacterId): CharacterId[] {
  return GROUPS[id] ?? [];
}

/** The feelings a face can show. "neutral" is each villager's own calm face. */
export const EXPRESSIONS = [
  "neutral", "happy", "laughing", "warm", "surprised", "worried", "sad", "upset", "scared", "embarrassed", "tired",
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Older names still used in the story. */
const ALIASES: Record<string, Expression> = { smile: "happy", laugh: "laughing", calm: "neutral" };

/** An expression by name or alias, or null if unknown. */
export function toExpression(name: string): Expression | null {
  if ((EXPRESSIONS as readonly string[]).includes(name)) return name as Expression;
  return ALIASES[name] ?? null;
}

export function isCharacterId(id: string): id is CharacterId {
  return id in CAST;
}

export function isExpression(e: string): boolean {
  return toExpression(e) !== null;
}

export interface SpokenLine {
  speaker: CharacterId;
  expression: Expression | null;
  text: string;
}

/**
 * Ink writes dialogue as `mara: text` or `mara/worried: text`.
 * Returns null for narration.
 */
export function parseSpoken(line: string): SpokenLine | null {
  const match = /^([a-z]+)(?:\/([a-z]+))?:\s+(.+)$/.exec(line);
  if (!match) return null;
  const [, id, expr, text] = match;
  if (!isCharacterId(id)) return null;
  const expression = expr === undefined ? null : toExpression(expr);
  if (expr !== undefined && !expression) throw new Error(`Unknown expression "${expr}" in: ${line}`);
  return { speaker: id, expression, text };
}
