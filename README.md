# Lantern Night in 3D: look test

A throwaway test of how Lantern Night could look in 3D in the browser. It shows the full cast and
a small stretch of Lantern Lane in two styles, side by side:

- **Paper cutout:** the game's own character drawings, die-cut with a bare paper border, on card
  with real thickness. Scenery is cut card and folded paper houses.
- **Soft 3D toy:** the same characters built from rounded felt shapes, using the same character
  data. Their faces are the game's face drawings wrapped over the head, so all eleven feelings work.

Everything is generated in code: no image, model or audio files.

## Run it

    npm install
    npm run dev

Then open http://localhost:8123. Use the buttons to switch style, view, time of day and feeling.
Drag the Characters view to turn everyone round. Walk in the Village view with the arrow keys or WASD.

## How it relates to the game

The live game is in the separate DBT-game repo and is not touched by this one. `src/cast.ts` and
`src/plush.ts` are copies from it; `plush.ts` gains options to draw flat, or only the face or the
feeling's sign. There is no story, dialogue or save system here, and no tests, because this code
is for judging the look and is not meant to be kept as it stands.
