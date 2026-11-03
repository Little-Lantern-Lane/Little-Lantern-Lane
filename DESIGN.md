# Design Brief — DBT Skills Game (working title TBD)

## Concept
A browser game that teaches DBT skills and healthy living. The character and the
world visibly change based on what the player does, and effects ripple across the
world (one lantern hung lights the square; avoidance lets darkness spread).

## Core design principle: dialectical, not moral
- No good/evil or karma meter. DBT is nonjudgmental: behaviors are judged by what
  they do for you and what they cost, not labeled good or bad.
- The "monster" form is **emotion mind made visible**, not a punishment. It gives
  real short-term relief; its costs show up later, through the world.
- The world never shames the player and can always recover.
- Withdrawal is not always wrong (rest is legitimate). Avoid rebuilding a moral
  meter in disguise.

## Differentiation from existing games
- Morality-changes-appearance (Fable, Black & White, inFAMOUS) → we model emotion
  states and their function instead of virtue.
- Restore-the-world games (Okami, Terra Nil, Alba) → restoration comes from skill use.
- Therapy games (SPARX, CBT; Game of Real Life, DBT card game) → no narrative DBT
  video game found. Skills are gameplay mechanics, not collectibles or quizzes.
- Planned signature mechanic: **chain analysis** as gameplay.

## First prototype: opposite action for shame (10–15 min, one area)
Scenario: village preparing a lantern festival. Player trips, drops lanterns,
someone laughs (prompting event).

Loop:
1. **Emotion arrives as body cues** (face heat, slump, rising urge meter). Player
   picks the emotion label; wrong guesses allowed, no penalty (Observe/Describe).
2. **Urge offered, and it works:** "Hide" transforms the character into a shell
   creature, burrows into a cozy cave, distress drops immediately. Not punished.
3. **Delayed, indirect costs:** lanterns never hung, square stays dark, NPC assumes
   player is angry, next-day invitation missing, darkness spreads.
4. **Check the facts as a lens:** scene first rendered as shame sees it (everyone
   pointing). Inspecting details reveals facts (one laugher, most didn't notice,
   the laugher dropped one earlier). Player decides: does the emotion fit?
   - Doesn't fit → opposite action.
   - Fits (variant: you broke something you promised to protect) → repair: own it,
     amends, let it go.
5. **Opposite action all the way:** approach = action (go back) + posture (head up)
   + voice (say something). Partial execution = partial result. Distress meter goes
   UP first, then down. Modeling this curve honestly is the key teaching moment.
6. **Positive ripple:** one lantern lights the square, relationship recovers, light spreads.
7. **Chain review:** short timeline (prompting event → emotion → urge → choice →
   outcome); player taps where a different choice changes things.

## What the prototype must show (playtest 5–8 people, think-aloud)
- Is hiding tempting? (Never chosen → relief too weak. Always chosen and costs not
  connected → costs too hidden.)
- Do players push through the "worse before better" curve?
- Transfer: give a new text-only scenario (coworker ignores you in a meeting). Can
  they say whether opposite action applies and why? This is the real success metric.
- Get a DBT clinician to review skill fidelity before investing in art.

## Tech direction
- Browser-playable.
- Story/branching/state in **Ink**, run with **inkjs**.
- Thin **TypeScript** layer for non-text: meter animation, square dimming, the
  distorted-scene inspection.
- Keep game logic (emotion meter, fit-the-facts outcomes, world state) separate
  from rendering, so a later Phaser/Godot visual layer replaces only presentation.
- First version: one page, inkjs, a meter, a CSS class that dims the background.
  No engine, build pipeline, or asset system until the loop is validated.

## Decisions after the first playthrough (2026-11-01)
- **Plain language:** player-facing text describes what each skill is for, never its DBT
  name ("do the opposite, all the way" rather than "opposite action"). DBT names stay in
  code comments and docs.
- **No typing:** everything is a choice or a click.
- **Villagers are people you talk to:** written dialogue in Ink, never AI-generated, so all
  of it can be reviewed by a clinician. A fuller cast with personalities (CHARACTERS.md),
  expressive faces, and portraits beside their lines.
- **The transfer question is out of the game:** it felt preachy inside the story. Playtest
  facilitators ask the coworker scenario out loud after play instead; it is still the
  success measure.

## Decisions after reading the assignment brief (2026-11-01)
The Game Week brief requires one of three genres; the click-through story fit none. Now an
**exploration/adventure** game:
- **A walkable world:** four connected, revisitable areas (Lantern Lane, Market Street with
  an enterable workshop, the Square, the Hill), side-scrolling, built with **Phaser 3**.
  This replaces the earlier "no engine until playtested" rule; the story and logic were
  kept separate from presentation so only the presentation layer changed.
- **The skills are the obstacles:**
  1. Finding out what happened: explore and talk to people to collect facts under a red
     "as the feeling sees it" haze.
  2. Walking back: a movement challenge against the pull to hide, where holding your head
     up is the mechanic, and distress rises before it falls.
  3. Making it right: a hands-on mending puzzle.
  4. Hanging the lanterns: the final challenge.
- **Progression:** hiding spreads darkness that blocks your lane; Ash's candle opens it.
  Facts found free villagers from the haze; lanterns hung light the lanes.
- **Every asset generated in code:** SVG art, synthesized music and sound.
- **Public link:** GitHub Pages, repo made public. The brief PDF is kept out of the repo.

## Chapters two and three (2026-11-01)
- **The morning after (pulling back as the effective choice):** answers the earlier open
  item "a scenario where withdrawing is the effective choice", so the game doesn't read as
  "hiding is bad". Same hollow, different function: escaping a feeling versus looking after
  yourself. Errands wear you down; saying no is a choice; a check-in asks whether guilt about
  resting fits; resting effectively means telling someone first.
- **The storm (bringing the body down first):** cold water and paced breathing lower
  distress until planning becomes possible; acting while flooded loses a lantern.
- **Vulnerability carries across chapters:** resting fully in chapter two makes the panic
  wave smaller in chapter three.

## Chapters four to six (2026-11-02)
Three more chapters, each in a new place, each teaching a skill the first three don't. They
run in story order (a week after the festival, then winter, then spring) and each ends at a
save point. Scenery changes with the story (props switched on and off by `#event: prop`), so
what's on screen matches what's said.

- **Opening day (asking and saying no):** Ash's tea room, Mae's, opens in the old mill. Ash
  asks you to run the counter every morning, unpaid. You put together what you'll say from
  parts (what's being asked, how you feel, what you can do, why it helps you both, how you
  say it), then hold it when Ash pushes. Clear, kind and steady gets Saturdays written on the
  chalkboard; giving in costs you the afternoon at the sink; snapping leaves things stiff. Each
  can be taken back later at the party. Then you help Ash tell their mother Iris they're not
  coming back to the family company. (DBT: DEAR MAN, GIVE, FAST.)
- **The first snow (getting through a night you can't fix):** Pip and Juno's mum is stuck at
  the infirmary in Haddon. Power and phone are out. Each action takes an hour; worry rises
  with every hour. Comfort for the senses (the stove, warm milk, the music box) and things to
  do (paper snowflakes, digging out Nell's step, toast) bring it down. Checking the road gives
  a moment's relief and a stronger pull to check again. Dawn comes whatever you do; how the
  night went shows in what's on the window and what the kids tell their mum. (DBT: distress
  tolerance: self-soothe, distracting.)
- **The tide (accepting what can't be changed):** in Saltmouth, Tobin's home town, the sea
  has taken most of Hesketh's lantern moulds. The spring tide comes back into the shed on a
  timer: carry out what you can, or heave at the sandbags (the water comes anyway, and the
  time is gone). Afterwards, saying "it shouldn't have happened" keeps it hurting; saying
  "it's gone" (or opening your hands and breathing out) lets everyone move. Fen stops joking
  for once. They make one new lantern and hang it on the harbour wall. (DBT: radical
  acceptance, turning the mind, willing hands.)

## Your look and your home (2026-11-02)
Something to keep coming back to, without a currency or a shop.
- **Your character:** chosen on the first new game, changeable from the title screen. Two bodies
  (girl, boy) that change only the face; six animals, three furs each, five outfits in six colors,
  a hat and an extra. All outfits are open to both bodies; the defaults match the body.
- **Your home:** your house on Lantern Lane (door still at x 740). Four ready-made styles (gable
  cottage, mushroom house, hill burrow, round tower) in four paints, or one designed part by part
  (shape, roof, walls, door, windows, chimney, something on the roof, four colors).
- **It grows:** each save point gives the home room for one more addition (an upper floor, a side
  room, a porch, a garden), whatever happened in the chapter, so it never rewards "good" choices.
  The player picks which, then or later from the title screen. The garden is where light farming
  could go later.
- Choices are saved in their own browser save (`lantern-night:looks`), so starting over keeps them.

## Open decisions
- Audience: clinical adjunct (with therapist) vs. general wellness product.
  Affects evidence needs, content review, crisis handling, business model.
- Crisis/safety handling if at-risk players use it.
- ~~Optional second scenario where withdrawing is the effective choice.~~ Built as chapter two.
