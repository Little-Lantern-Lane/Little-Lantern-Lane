# Lantern Night in 3D

A browser game that teaches skills from DBT (dialectical behavior therapy) through a story set in a
small village of soft toy animals. This is the 3D version; the 2D game in the DBT-game repo is the backup.

It is not therapy and not a crisis resource.

## Run it

    npm install
    npm run dev

Then open http://localhost:8140. Tests: `npm test`. Types: `npm run typecheck`.

## How it is built

| Part | Where | What it does |
| --- | --- | --- |
| Story | `story/` | All dialogue and branching, written by hand in Ink |
| Rules | `src/logic/` | The feeling meters, world state and outcomes. Pure and tested |
| Layout | `src/game/layout.ts` | Where everything is, as one position along the path |
| 3D world | `src/world3d/` | Movement, camera, light, weather and the challenges (`World.ts`), the characters (`figure.ts`) and each place (`regions/`) |
| Overlays | `src/ui/` | Dialogue, panels, wardrobe and home screens |
| Sound | `src/audio/` | Generated with Web Audio |

`src/world3d/space.ts` turns a story position into a real spot in 3D, so the story and rules never
needed to change. All art is generated in code and all sound is synthesized: there are no asset files.

The character look test lives in `demo-src/` and is published at `/look/`.
