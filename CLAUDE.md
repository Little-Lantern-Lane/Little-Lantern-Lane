# Project context for Claude Code

Browser game teaching DBT skills. Read `DESIGN.md` before doing design or
gameplay work. It holds the decisions made so far and the first prototype spec.

## Current goal
Ship Little Lantern Lane (the 3D game, formerly Lantern Night) for Game Week (due Thursday 2026-11-05, midnight). The 2D game in the DBT-game repo is the backup.
exploration/adventure game meeting the brief, without losing the DBT teaching.

## Stack
- Ink for story, dialogue, branching and choice state, run in the browser with inkjs
- TypeScript game logic in `src/logic/` (pure, tested)
- Three.js for the walkable 3D world (`src/world3d/`); HTML overlays for dialogue and panels
- All art generated as SVG in code; all audio synthesized with Web Audio. No pre-made assets
  (an assignment rule: docs/Game_Week_Assignment_PRD.pdf, kept out of git)
- esbuild bundle, vitest tests, GitHub Pages deploy on push to main

## Rules
- Keep game logic (emotion meter, fit-the-facts outcomes, world state) separate
  from rendering code.
- Never frame player behavior as good/bad or moral. No karma meters, no shaming
  feedback text. Costs show up through the world, not through judgment.
- DBT skill content must stay faithful to standard DBT; flag anything that
  needs clinician review instead of improvising.
- Player-facing text uses plain language: describe what a skill does, never its
  DBT name. A test enforces this.
- Dialogue is written in Ink by hand (see CHARACTERS.md), not generated at runtime.

## Working style
- Be direct and point out flaws in ideas; no flattery.
- Complete multi-step tasks end to end without pausing for approval checkpoints.
