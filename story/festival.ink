// Lantern festival: doing the opposite of what shame urges, when shame doesn't fit.
// (DBT: opposite action, check the facts, repair. Player-facing text never uses
// those names; it describes what each skill is for.)
//
// The player walks a side-scrolling village. Ink is the authority on what can
// happen next; the game maps choices onto the world:
//   [Text #talk: id]     walk up to that character and talk
//   [Text #go: place]    walk into that place (fountain, hollow, bench, home)
//   [Text #use: thing]   walk up to that thing and use it (lantern_table, stone, heap)
//   [Text]               a plain choice, shown as a button in the dialogue box
// Line tags:
//   #event: name [arg]   world and meter changes (src/logic/world.ts, meter.ts)
//   #scene: name         a TS challenge (fit, approach, mend, hang, chain); the TS
//                        layer picks the single placeholder choice that follows.
// Dialogue lines are `id: text` or `id/expression: text` (src/logic/cast.ts).
// Choice text in quotes is shown as the player's own spoken line.
// Characters and dialogue rules: CHARACTERS.md. Never frame choices as good or bad.

VAR variant = "main"      // "main" | "promise", set by the TS layer before start
VAR label = ""
VAR have_lanterns = false
VAR hide_count = 0
VAR stayed = false
VAR bailed = false
VAR answered_ash = false
VAR facts_seen = 0
VAR fit = false           // set by the fit scene
VAR reached = false       // set by the approach scene: got all the way to Mara
VAR head_up = false       // set by the approach scene: kept head up most of the way
VAR turned_back = false   // set by the approach scene: walked into the hollow instead
VAR path = ""             // "opposite" | "repair"
VAR part_a = false        // opposite: go back    | repair: own it
VAR part_b = false        // opposite: head up    | repair: make it right
VAR part_c = false        // opposite: voice      | repair: let it go
VAR completeness = ""     // "full" | "partial" | "minimal"
// Chapter two: the morning after
VAR task = ""             // errand in progress: "bread" | "bunting" | "sort"
VAR tasks_done = 0
VAR said_no = 0
VAR rest_ok = false       // the check-in found the tiredness real and the guilt not matching
VAR guilt_fits = false    // set by the check-in scene
VAR told = false          // told someone before going to rest
VAR rested = false
VAR rest_kind = ""        // "full" | "partial"
// Chapter three: the storm
VAR breaths = 0           // set by the breathing scene: slow breaths taken
VAR lost = false
VAR next_chapter = 0      // which chapter a save point leads into
// Conversations: which part of the story we're in, and who you've talked to in it
VAR phase = ""            // "afternoon" | "facts" | "festival" | "day2" | "after_storm"
VAR seen_nell = ""
VAR seen_ash = ""
VAR seen_bakers = ""
VAR seen_tobin = ""
VAR seen_mara = ""
VAR seen_kids = ""
// What villagers remember, across chapters
VAR nell_not_me = false   // you told Nell "Not me. Not today."
VAR nell_door = false     // heard the story of Nell's yellow door
VAR ash_shop = false      // Ash told you about the tea shop
VAR ash_cheer = ""        // how you answered: "encourage" | "joke" | "ask"
VAR tobin_fall = false    // Tobin told you about his own fall
VAR tobin_tone = ""       // how you took it: "laughed" | "kind" | "quiet"
VAR tobin_shared = false  // you told Tobin you'd wanted to vanish too
VAR mara_grandma = false  // Mara told you how the festival started
VAR mara_rests = false    // Mara agreed to take an hour off too
VAR wren_back = false     // you noticed Wren's back
VAR juno_counting = false // Juno told you why she counts
VAR carried_bread = false
VAR helped_pip = false
VAR mended = false     // patched Mara's grandmother's lantern together
VAR rosa_notes = false   // opened Rosa's box of festival notes with Mara
VAR told_nell = false    // told Nell who lit the first lantern and painted her door
VAR oda_early = false    // noticed Oda is more tired than the early start explains
VAR tobin_offer = false  // Tobin told you Hesketh offered him the workshop
// Chapter four
VAR sign_hung = false
VAR iris_here = false
VAR ask_answer = "clear"  // set by the say-it scene: "clear", "vague" (sounds like yes) or "flat" (just no)
VAR ask_clear = false     // set by the say-it scene: Ash knows exactly what you can do
VAR ask_kind = false      // set by the say-it scene: said in a way that keeps the friendship warm
VAR ask_steady = false    // set by the say-it scene: no blame, no string of sorries
VAR gave_in = false       // said yes to every morning
VAR snapped = false
VAR saturdays = false     // agreed on Saturdays instead
VAR ash_ready = false     // helped Ash work out what to tell Iris
VAR ash_mended = false
VAR seen_iris = ""
// Chapter five
VAR cleared_path = false
VAR has_quilt = false
VAR hour = 0
VAR checks = 0            // times you looked out at the road
VAR warmed = false
VAR had_milk = false
VAR played_music = false
VAR made_snowflakes = false
VAR made_toast = false
VAR kids_asleep = false
VAR promised = false      // told Pip her mum would definitely be back by morning
VAR seen_hettie = ""
// Chapter six
VAR seen_fen = ""
VAR seen_hesketh = ""
VAR saved_count = 0       // set by the tide scene
VAR saved_red = false
VAR saved_notebooks = false
VAR fought = 0            // times you heaved at the sandbags against the tide
VAR argued = 0
VAR open_hands = false

EXTERNAL outcome(a, b, c)
EXTERNAL distress()       // the meter's current distress, read live from the TS layer

-> start

=== start ===
Lantern Lane, the afternoon of the festival. #event: afternoon
Tonight at sundown, every lantern in the square gets lit at once. You promised to bring them.
{ variant == "promise":
    This morning Mara asked you to carry her grandmother's paper lantern on its own. "It's the oldest thing I have." You promised.
}
They're waiting on the bench in the lantern workshop, on Market Street.
-> afternoon

=== afternoon ===
~ phase = "afternoon"
- (hub)
+ {not have_lanterns} [Pick up the lanterns in the workshop #use: lantern_table]
    -> pick_up -> hub
+ {seen_nell != phase} [Talk to Nell #talk: nell #new]
    -> talk_nell -> hub
+ {seen_nell == phase} [Talk to Nell #talk: nell]
    -> talk_nell -> hub
+ {seen_ash != phase} [Talk to Ash #talk: ash #new]
    -> talk_ash -> hub
+ {seen_ash == phase} [Talk to Ash #talk: ash]
    -> talk_ash -> hub
+ {seen_bakers != phase} [Talk to the bakers #talk: wren #new]
    -> talk_bakers -> hub
+ {seen_bakers == phase} [Talk to the bakers #talk: wren]
    -> talk_bakers -> hub
+ {seen_tobin != phase} [Talk to Tobin #talk: tobin #new]
    -> talk_tobin -> hub
+ {seen_tobin == phase} [Talk to Tobin #talk: tobin]
    -> talk_tobin -> hub
+ {seen_mara != phase} [Talk to Mara #talk: mara #new]
    -> talk_mara -> hub
+ {seen_mara == phase} [Talk to Mara #talk: mara]
    -> talk_mara -> hub
+ {seen_kids != phase} [Talk to the kids #talk: pip #new]
    -> talk_kids -> hub
+ {seen_kids == phase} [Talk to the kids #talk: pip]
    -> talk_kids -> hub
+ {have_lanterns} [Carry the lanterns to the fountain #go: fountain] -> trip

=== pick_up ===
~ have_lanterns = true
Twelve lanterns. You stack them in your arms, all in one trip, to save time. #event: carry
{ variant == "promise":
    Her grandmother's lantern goes on top. It's just quicker this way.
}
->->

=== trip ===
Halfway to the fountain, your foot catches a loose cobblestone. #event: trip
The lanterns scatter across the stones. One rolls all the way around the fountain.
{ variant == "promise":
    You hear paper tear. #event: tear
}
Somebody laughs.
-> body

= body
Before any thought, your body answers.
Your face goes hot. #event: cue_heat
Your shoulders curl forward. Your eyes drop to the ground. #event: cue_slump
Something in you wants to be very small, very fast. #event: cue_urge
- (naming)
What is this feeling?
+ [Anger]
    ~ label = "anger"
    Anger can make your face hot too. It usually comes with a push forward: snap back, confront, fight.
    Is that the pull right now? Or is it to disappear?
    -> keep_or_look
+ [Fear]
    ~ label = "fear"
    Fear makes you want to get away from danger. Close. Is there danger here, or is it more about being seen?
    -> keep_or_look
+ [Sadness]
    ~ label = "sadness"
    Sadness can make you want to pull away, too. It usually comes after losing something. Did you lose something just now, or is it more about being seen?
    -> keep_or_look
+ [Embarrassment]
    ~ label = "shame"
    Embarrassment is a lighter kind of shame: the same heat, the same eyes-down, the same wish to vanish. Here, call it shame.
    -> urge
+ [Shame]
    ~ label = "shame"
    Hot face, eyes down, wanting to drop out of sight. That's what shame often feels like.
    -> urge
+ [Guilt]
    ~ label = "guilt"
    { variant == "promise":
        Guilt is the feeling of having gone against something you care about. You did make a promise about that lantern. Guilt and shame are tangled up here.
    - else:
        Guilt is the feeling of having gone against something you care about. Did you? Or is this more about being seen?
        -> keep_or_look
    }
    -> urge
+ [Not sure]
    ~ label = ""
    That's all right. You can notice it without a name: heat, eyes down, wanting to vanish.
    -> urge

= keep_or_look
+ [Look again] -> body.naming
+ [Stay with "{label}"]
    Okay. Notice what it wants you to do, too. Not fight. Not run from danger. Hide. That pull usually comes with shame.
    -> urge

=== urge ===
Up the hill, past the edge of the square, there's a hollow in the rocks where you used to hide as a kid. Nobody can see in.
The pull is loud now: get out of sight. You can feel it dragging at your feet. #event: pull on
+ [Hide in the hollow, up the hill #go: hollow] -> hide
+ [Stay where you are] -> stay

=== stay ===
~ stayed = true
You stay on the cobblestones. Your face is burning. The pull to run doesn't go anywhere. It just sits there, loud. #event: urge_hold
You don't follow it. Your feet stay where they are. #event: pull off
-> facts

=== hide ===
~ hide_count++
You let the shell come. #event: hide
{ hide_count == 1:
    Your back curves and hardens. Your arms fold in. In three heartbeats you're something round and armored, tucked into the hollow.
- else:
    The shell closes over you, easy as breathing.
}
The hollow is exactly the right size. Cool stone, moss, the festival far away and muffled. #event: cave_rest
Your breathing slows. The heat drains out of your face. Nobody is looking at you in here.
It works. It really does.
+ [Rest] -> costs

=== costs ===
{ hide_count == 1: -> first_night }
-> another_night

= first_night
The sun goes down. #event: nightfall
In the square, people wait for the lanterns. They're still lying where they fell. #event: square_dark
Footsteps on the hill path. They stop outside the hollow.
ash/worried: You in there?
ash: I brought the chipped cup. I'll leave it here.
+ ["I'm here. I just can't right now."]
    ~ answered_ash = true
    ash/warm: Okay. That's allowed. Tea's on the rock.
+ [Stay quiet]
    A pause. The cup clinks down on the rock. The footsteps go away.
-
Later, voices on the path below. Mara and Tobin, walking home.
mara/worried: Did I do something? They just left. They must be angry with me.
{ variant == "promise":
    mara/sad: And my grandmother's lantern...
}
tobin/sad: Maybe it was me. I laughed. I always laugh at the worst times.
You stay very still inside your shell.
+ [Sleep] -> morning

= another_night
Another night in the hollow. #event: nightfall
Down in the square, the festival goes on with a handful of candles. You can just see them from here.
The shadow has crept further up your lane. #event: darkness_spreads
+ [Sleep] -> morning

= morning
Morning. You uncurl. #event: morning
{ hide_count == 1:
    There's a cup of cold tea on the rock outside.
    Down the hill, every door on Lantern Lane has a paper invitation for tonight's supper at Mara's. Yours doesn't. #event: invitation missing
    The shadow has spread down your lane. It's too dark to walk there without a light. #event: darkness_spreads
}
{ hide_count > 1:
    #event: darkness_spreads
}
The relief from last night is gone. Thinking about the square, your face heats up all over again. #event: return_distress
-> facts

=== facts ===
The village looks the way the feeling sees it. Everyone is staring. Everyone is pointing. Everyone saw. #event: lens shame
But is that what actually happened? Talk to people. Look around the fountain. Find out.
-> facts_hub

=== facts_hub ===
~ phase = "facts"
- (hub)
+ {seen_nell != phase} [Talk to Nell #talk: nell #new]
    -> talk_nell -> hub
+ {seen_nell == phase} [Talk to Nell #talk: nell]
    -> talk_nell -> hub
+ {seen_ash != phase} [Talk to Ash #talk: ash #new]
    -> talk_ash -> hub
+ {seen_ash == phase} [Talk to Ash #talk: ash]
    -> talk_ash -> hub
+ {seen_bakers != phase} [Talk to the bakers #talk: wren #new]
    -> talk_bakers -> hub
+ {seen_bakers == phase} [Talk to the bakers #talk: wren]
    -> talk_bakers -> hub
+ {seen_tobin != phase} [Talk to Tobin #talk: tobin #new]
    -> talk_tobin -> hub
+ {seen_tobin == phase} [Talk to Tobin #talk: tobin]
    -> talk_tobin -> hub
+ {seen_kids != phase} [Talk to the kids #talk: pip #new]
    -> talk_kids -> hub
+ {seen_kids == phase} [Talk to the kids #talk: pip]
    -> talk_kids -> hub
+ {not fact_stone} [Look at the cobblestones by the fountain #use: stone]
    -> fact_stone -> hub
+ {not fact_lanterns} [Look at the lanterns #use: heap]
    -> fact_lanterns -> hub
+ {hide_count > 0} [Go back to the hollow #go: hollow] -> hide
+ {facts_seen >= 3} [Sit on the fountain wall and think it over #go: bench] -> decide

=== fact_tobin ===
~ facts_seen++
tobin/sad: Hey. I'm sorry I laughed. I went down on that same stone this morning. Took out a whole string of bunting.
tobin/embarrassed: I laugh when I'm nervous. It wasn't about you. #event: fact tobin
->->

=== fact_bakers ===
~ facts_seen++
{ hide_count > 0:
    oda: There you are. We missed you at the candles last night.
- else:
    wren/worried: Is it sundown? It feels like sundown.
}
+ ["Did you see me fall?"]
    wren/surprised: You fell? When?
+ ["Did you hear anyone laughing?"]
    wren/surprised: Laughing? At what?
-
oda: We were up to our elbows in dough, love. We didn't see a thing. #event: fact bakers
->->

=== fact_kids ===
~ facts_seen++
pip/laugh: Did you SEE the red lantern? It rolled ALL the way around the fountain!
+ ["You weren't laughing at me?"]
    juno/surprised: At you? We were watching the lantern.
+ ["I saw."]
    juno: It went around twice. I counted.
-
pip/smile: Best thing that happened all day. #event: fact kids
->->

=== fact_stone ===
~ facts_seen++
You crouch by the fountain. One cobblestone sticks up at an angle, loose under your hand. #event: fact stone
Anyone could catch a foot on it.
->->

=== fact_lanterns ===
~ facts_seen++
{ variant == "promise":
    You count them. Eleven are fine. Her grandmother's lantern has a long tear down one side. #event: fact lanterns
- else:
    You count them. Ten are fine. Two are dented. Paper and wire bend back. #event: fact lanterns
}
->->

=== ash_morning ===
{ answered_ash:
    ash/warm: You didn't drink the tea. Fair. It was terrible tea.
- else:
    ash/worried: I left tea on the rock. Wasn't sure you were in there.
}
ash: Mara thinks you're angry with her. She's been asking everyone.
ash: And your lane's gone dark. Here. Take this.
Ash hands you a candle in a jar. It's warm in your hands. #event: get candle
->->

=== fact_mara_nell ===
~ facts_seen++
nell: There you are. Mara came down this lane last night with a candle, asking after you.
+ ["Was she angry?"]
    nell/laugh: Angry? She was worried sick. She kept saying, "Are they okay? That looked like it hurt."
+ ["What did you tell her?"]
    nell: That you'd turn up. People do. She kept asking if you were hurt.
-
nell/warm: Lanes go dark sometimes. They light back up. Usually somebody has to walk down them with a lantern first. #event: fact mara
->->

=== fact_mara_ash ===
~ facts_seen++
ash/worried: You okay? Mara was asking if you were hurt. She saw you go down.
+ ["Was she upset?"]
    ash: Upset? She looked worried. About you, not the lanterns.
+ ["I'm fine."]
    ash/warm: Okay.
-
ash: Tea's here when you want it. #event: fact mara
->->

=== decide ===
You sit on the edge of the fountain. You found out {facts_seen} things about what actually happened. #scene: fit
+ [·] -> decided

= decided
{ fit: -> fits }
-> not_fits

=== not_fits ===
~ path = "opposite"
The feeling is real. It just doesn't match what happened. #event: lens facts
When a feeling doesn't match what happened, doing what it says keeps it going. Every time you hide, your body learns there was something to hide from.
Doing the opposite is how the feeling settles. Halfway doesn't do much: the feeling is watching how you walk, where you look, and how you sound.
The opposite of hiding is to go back, keep your head up, and say something.
-> opposite

=== opposite ===
~ part_a = false
~ part_b = false
~ part_c = false
Mara is by the fountain with the lanterns. Walk back to her. The pull to hide will drag at you. Hold Shift (or the Head up button) to keep your head up. #event: pull on #scene: approach
+ [·] -> walked

= walked
{ turned_back:
    ~ bailed = true
    -> hide
}
~ part_a = reached
~ part_b = head_up
{ reached:
    You're standing in front of Mara. Every part of you is loud. #event: pull off
- else:
    You stop at the edge of the square, half behind a cart. #event: pull off
}
-> voice

= voice
Mara looks over. Tobin is next to her.
+ ["Well. That was a spectacular fall. Want help checking which ones still work?"]
    ~ part_c = true
    Your voice shakes on the first word and steadies by the last. #event: oa_step
+ ["Sorry. I'm so sorry. I ruin everything."]
    The sorries keep coming, one after another.
+ [Say nothing]
    You don't trust your voice. You stay quiet.
-
~ completeness = outcome(part_a, part_b, part_c)
-> opposite_result

=== opposite_result ===
{ completeness:
- "full": -> full
- "partial": -> partial
- else: -> minimal
}

= full
mara/surprised: There you are! #event: settle full
mara/worried: Are you okay? That looked like it hurt.
tobin/sad: Sorry I laughed. I went down on that same stone this morning. Laughing is what I do instead of hiding.
tobin/laugh: Mostly.
{ variant == "promise":
    Then Mara picks up her grandmother's lantern and turns it over.
    mara/sad: It was my grandmother's.
    You keep your head up. It doesn't close the tear.
- else:
    tobin/smile: Two are dented. Dents give them character.
}
mara/smile: Help me get them up before sundown?
Hang the lanterns along the string. #scene: hang
+ [·] -> lit

= lit
{ variant == "promise":
    At sundown all twelve lanterns are lit. Her grandmother's lantern glows at the end of the string, light spilling out through the tear down its side. #event: hang 12
- else:
    At sundown all twelve lanterns are lit. #event: hang 12
}
One catches, then the next, then the whole string. The square fills with light, and it spills down the lanes as far as your door. #event: ripple full
Later you find an invitation tucked in your door frame. #event: invitation received
-> festival

= partial
{ part_a:
    mara/worried: Are you... okay? #event: settle partial
- else:
    From the edge, you catch Mara's eye. She waves, a little unsure. #event: settle partial
}
mara: Could you help hang them?
Hang the lanterns along the string. #scene: hang
+ [·] -> partial_lit

= partial_lit
You help, mostly with your hands, not your eyes. The heat in your face hangs around all evening.
{ variant == "promise":
    The lanterns are lit. The torn one hangs at the end of the string, light leaking out through its tear. #event: hang 12
- else:
    The lanterns are lit. #event: hang 12
}
The square lights up, mostly. The shadow on your lane pulls back a little. #event: ripple partial
Mara hands you an invitation herself. She doesn't stay to talk. #event: invitation pending
-> festival

= minimal
{ part_a:
    Mara starts toward you, then stops, not sure you want company. #event: settle minimal
- else:
    From behind the cart, you watch Mara and Tobin sort the lanterns without you. #event: settle minimal
}
Mara and Tobin hang the lanterns without you.
{ variant == "promise":
    At sundown they're lit. The torn one glows at the end of the string, the tear showing. #event: hang 12
- else:
    At sundown they're lit. #event: hang 12
}
You watch the square light up from where you stand. #event: ripple minimal
The light stops at the end of your lane. The heat in your face fades slowly, and stays longer than you'd like.
-> festival

=== fits ===
~ path = "repair"
The feeling matches what happened. { variant == "promise": You did promise to carry that lantern on its own. You didn't. | You've decided this one fits. } #event: lens facts
When a feeling like this fits, it's pointing at something to fix. So fix it: say plainly what happened, make it right as best you can, and then put it down instead of carrying it around.
-> repair

=== repair ===
~ part_a = false
~ part_b = false
~ part_c = false
Mara is by the fountain with the lanterns. Go to her. The pull to hide will drag at you. Hold Shift (or the Head up button) to keep your head up. #event: pull on #scene: approach
+ [·] -> walked

= walked
{ turned_back:
    ~ bailed = true
    -> hide
}
You're with Mara. #event: pull off
+ { variant == "promise" } ["I stacked your grandmother's lantern with the others to save a trip. It tore when I fell. I'm sorry."]
    ~ part_a = true
    Saying it out loud makes your face burn hotter. #event: oa_step
    mara/sad: Thank you for telling me.
+ { variant == "main" } ["I dropped them. I'm sorry."]
    ~ part_a = true
    Saying it out loud makes your face burn hotter. #event: oa_step
    mara/warm: Hey. It was an accident. You don't owe me anything.
+ ["That stone. Someone should fix that stone."]
    mara: Mm. Someone should.
+ [Don't bring it up]
    You start gathering lanterns and don't mention it. Neither does she.
-
-> make_right

= make_right
+ { variant == "promise" } ["Can we fix it together? Now, before sundown?"]
    ~ part_b = true
    mara/sad: ...Okay. Yes.
    She finds glue and a sheet of gold paper. Patch the tear. #scene: mend
    ++ [·]
    ~ mended = true
    You work on it side by side until the last seam is down. #event: mend
+ { variant == "promise" } ["I'll buy you a new one."]
    mara/sad: That's kind. It wouldn't be hers, though.
+ { variant == "main" } [Help fix the two dented lanterns]
    ~ part_b = true
    Mara holds them steady. Bend the wire back into shape. #scene: mend
    ++ [·]
    Good as new. Nearly. #event: oa_step
+ [Leave it]
    { variant == "promise":
        The torn lantern stays on the fountain step.
    - else:
        You set the dented ones aside.
    }
-
-> let_go

= let_go
Afterward, you want to keep apologizing, just in case.
+ [Let it be done. Help hang the lanterns.]
    ~ part_c = true
    You let the apology stand.
+ [Keep apologizing all evening]
    You say sorry again, and again later. Mara keeps saying it's fine. She starts to look tired.
-
~ completeness = outcome(part_a, part_b, part_c)
-> repair_result

=== repair_result ===
{ completeness == "minimal":
    #event: settle minimal
    Mara and Tobin hang the lanterns.
    { variant == "promise":
        At sundown they're lit, the torn one too. #event: hang 12
    - else:
        At sundown they're lit. #event: hang 12
    }
    You and Mara don't quite look at each other. #event: ripple minimal
    The light stops at the end of your lane.
    -> festival
}
Hang the lanterns along the string. #scene: hang
+ [·] -> lit

= lit
{ completeness:
- "full":
    { variant == "promise":
        At sundown the lanterns are lit. Her grandmother's lantern glows with a gold seam down one side. #event: hang 12
        mara/warm: I think I like it better.
    - else:
        At sundown all twelve are lit, dents and all. #event: hang 12
    }
    Your heart was racing an hour ago. Now it's slow. #event: settle full
    The square fills with light, and it spills down the lanes as far as your door. #event: ripple full
    Later you find an invitation tucked in your door frame. #event: invitation received
- else:
    #event: settle partial
    { variant == "promise" && not part_b:
        At sundown the lanterns are lit. The torn one glows at the end of the string, tear and all. #event: hang 12
    - else:
        At sundown the lanterns are lit. #event: hang 12
    }
    The square is lit. Things with Mara feel a little unfinished. #event: ripple partial
    She hands you an invitation herself. #event: invitation pending
}
-> festival

=== festival ===
~ phase = "festival"
{ completeness:
- "full": The festival is here. The square is full of people and light.
- "partial": The festival is here. The square is lit and busy.
- else: The festival goes on. You can still walk over to anyone you like.
}
Talk to anyone you like. When you're ready, walk home to Lantern Lane.
- (hub)
+ {seen_mara != phase} [Talk to Mara #talk: mara #new]
    -> talk_mara -> hub
+ {seen_mara == phase} [Talk to Mara #talk: mara]
    -> talk_mara -> hub
+ {seen_tobin != phase} [Talk to Tobin #talk: tobin #new]
    -> talk_tobin -> hub
+ {seen_tobin == phase} [Talk to Tobin #talk: tobin]
    -> talk_tobin -> hub
+ {seen_kids != phase} [Talk to the kids #talk: pip #new]
    -> talk_kids -> hub
+ {seen_kids == phase} [Talk to the kids #talk: pip]
    -> talk_kids -> hub
+ {seen_bakers != phase} [Talk to the bakers #talk: wren #new]
    -> talk_bakers -> hub
+ {seen_bakers == phase} [Talk to the bakers #talk: wren]
    -> talk_bakers -> hub
+ {seen_ash != phase} [Talk to Ash #talk: ash #new]
    -> talk_ash -> hub
+ {seen_ash == phase} [Talk to Ash #talk: ash]
    -> talk_ash -> hub
+ {seen_nell != phase} [Talk to Nell #talk: nell #new]
    -> talk_nell -> hub
+ {seen_nell == phase} [Talk to Nell #talk: nell]
    -> talk_nell -> hub
+ [Walk home #go: home] -> chain_review

=== mara_evening ===
{ completeness:
- "full":
    { variant == "promise":
        { path == "repair":
            mara/warm: I keep looking at that gold seam. Grandma would have loved it. She fixed everything with whatever was nearby.
        - else:
            mara/sad: I'm glad you came back. I'm still sad about the lantern. Both of those are true.
        }
    - else:
        mara/smile: Supper's at mine tomorrow too. You're coming. That's not a question.
    }
- "partial":
    mara/worried: I'm glad you're here. Are we... okay?
- else:
    mara/worried: I didn't know if you wanted company. I still don't, really.
}
+ ["We're okay."]
    mara/smile: Okay. Good. Okay.
+ [Nod]
    She nods back.
- ->->

=== tobin_evening ===
{ completeness == "full":
    tobin/laugh: Two falls on one stone in one day. They should name it after us.
- else:
    tobin/worried: Hey. About yesterday. I laugh when I'm nervous. It wasn't about you.
}
+ ["Somebody should fix that stone."]
    tobin/smile: I'm fixing it tomorrow. With a hammer. Personally.
+ ["Thanks for saying that."]
    tobin/warm: Yeah. Thanks for listening to it.
- ->->

=== bakers_evening ===
oda/smile: Burnt ones, as promised.
wren: They're not burnt. They're well done.
+ [Take one]
    It's warm and a little bitter at the edges. It's perfect.
+ ["What do I owe you?"]
    oda/laugh: Owe us? Eat the bread.
- ->->

=== kids_evening ===
pip/laugh: The red one is the brightest! Look! LOOK!
{ variant == "promise":
    { mended:
        juno: It's the same as the others. It just has a gold stripe.
    - else:
        juno: It's the same as the others. It just has a rip in it.
    }
- else:
    juno: It's the same as the others. It just has a dent.
}
pip/smile: That's why it's the best.
+ ["It's my favorite too."]
    pip/laugh: I KNEW it.
+ [Look up at it]
    It is, actually, the brightest.
- ->->

=== nell_evening ===
{ completeness == "full":
    nell/smile: Your lane's lit all the way to my step. I can see my own feet. Haven't seen them in years.
- else:
    nell: Lane's still a bit dim. It'll come.
}
+ ["Sixty-two festivals now."]
    nell/laugh: Don't count for me. I'll get ideas.
+ [Sit on the step with her for a minute]
    She doesn't say anything. It's nice.
- ->->

=== ash_evening ===
{ hide_count > 0:
    ash/warm: The chipped cup's still on the rock up the hill, by the way. I'll let you fetch it.
- else:
    ash/smile: You never came back for your tea.
}
ash: Fresh pot. Sit.
+ [Sit]
    The tea is terrible. You drink all of it.
+ ["Tomorrow. I promise."]
    ash/laugh: I'll hold you to it.
- ->->

=== chain_review ===
At home, you think back over the day, one moment at a time. #scene: chain
+ [·] -> chapter_one_done

// Save points between chapters. The TS layer saves the story here and offers
// a break; resuming picks up at the start of the next chapter.
=== chapter_one_done ===
~ next_chapter = 2
Chapter one is done. #scene: save
+ [·] -> day_two

=== chapter_two_done ===
~ next_chapter = 3
Chapter two is done. #scene: save
+ [·] -> storm

=== ending ===
The new lantern burns on into the night, and the tide goes out, and comes back in, the way it always does. #event: end
-> END

// ---------------------------------------------------------------------------
// Chapter two: the morning after. When pulling back is the right call.
// (DBT: checking the facts on guilt; resting and saying no as effective action,
// not avoidance. Player-facing text never names these.)

=== start_day_two ===
// Entry point for "jump to chapter two" on the title screen.
~ completeness = "full"
-> day_two

=== day_two ===
Chapter two: The morning after. #event: chapter 2
You slept badly. Three hours, maybe. Your eyes feel full of sand.
Outside, the whole village is already up. Tonight is the last night of the festival, and everyone has something that needs doing.
-> day_two_hub

=== day_two_hub ===
~ phase = "day2"
- (hub)
{ tasks_done >= 3 && not rested: -> collapse }
+ {seen_bakers != phase} [Talk to the bakers #talk: wren #new]
    -> talk_bakers -> hub
+ {seen_bakers == phase} [Talk to the bakers #talk: wren]
    -> talk_bakers -> hub
+ {seen_mara != phase} [Talk to Mara #talk: mara #new]
    -> talk_mara -> hub
+ {seen_mara == phase} [Talk to Mara #talk: mara]
    -> talk_mara -> hub
+ {seen_tobin != phase} [Talk to Tobin #talk: tobin #new]
    -> talk_tobin -> hub
+ {seen_tobin == phase} [Talk to Tobin #talk: tobin]
    -> talk_tobin -> hub
+ {seen_ash != phase} [Talk to Ash #talk: ash #new]
    -> talk_ash -> hub
+ {seen_ash == phase} [Talk to Ash #talk: ash]
    -> talk_ash -> hub
+ {seen_nell != phase} [Talk to Nell #talk: nell #new]
    -> talk_nell -> hub
+ {seen_nell == phase} [Talk to Nell #talk: nell]
    -> talk_nell -> hub
+ {seen_kids != phase} [Talk to the kids #talk: pip #new]
    -> talk_kids -> hub
+ {seen_kids == phase} [Talk to the kids #talk: pip]
    -> talk_kids -> hub
+ {task == "bread"} [Carry the bread trays to the fountain #go: fountain]
    -> bread_done -> hub
+ {task == "bunting"} [Take down the bunting on Market Street #use: bunting]
    -> bunting_done -> hub
+ {task == "sort"} [Sort the broken lanterns in the workshop #use: lantern_table]
    -> sort_done -> hub
+ {not check_in} [Sit on the fountain wall and check in with yourself #go: bench] -> check_in
+ [Go up to the hollow #go: hollow] -> hollow_choice

=== bread_ask ===
oda: Morning! Could you carry the bread trays to the square? Wren's back is acting up.
wren/upset: My back is fine. My back has never been better.
+ ["Sure, I'll take them."]
    ~ task = "bread"
    oda/smile: You're a treasure.
+ ["Not today, sorry. I'm running on empty."]
    ~ said_no++
    oda/warm: Then don't run. Pip and Juno can carry the small ones.
- ->->

=== bunting_ask ===
mara: Could you take the bunting down on Market Street? Tobin says the wind's picking up tonight.
+ ["On it."]
    ~ task = "bunting"
    mara/smile: Thank you. Really.
+ ["I can't today. I'm wiped out."]
    ~ said_no++
    mara/warm: Of course. Tobin can do it. He likes ladders. He says he doesn't, but he does.
- ->->

=== sort_ask ===
tobin: Help me sort the broken lanterns? Two piles: fixable and not.
+ ["Okay."]
    ~ task = "sort"
    tobin/smile: Great. They're on the bench.
+ ["Can it wait? I'm exhausted."]
    ~ said_no++
    tobin/laugh: It's waited a year. It can wait a day.
- ->->

=== bread_done ===
~ task = ""
~ carried_bread = true
~ tasks_done++
You set the trays down by the fountain. They were heavier than they looked. #event: tire
-> body_notice ->
->->

=== bunting_done ===
~ task = ""
~ tasks_done++
You climb the ladder and unhook the bunting, one flag at a time. Your arms ache by the last one. #event: tire #event: prop on:bunting_down
-> body_notice ->
->->

=== sort_done ===
~ task = ""
~ tasks_done++
You sort lanterns into two piles until the colors start to blur together. #event: tire
-> body_notice ->
->->

=== body_notice ===
{ tasks_done:
- 1: You yawn so hard your jaw clicks. Your arms feel heavy.
- 2: Your hands are shaking a little. A headache is starting behind your eyes.
- else: Everything is too bright and too loud.
}
->->

=== nell_day2 ===
nell/smile: You look like a candle burned at both ends.
+ ["I'm fine."]
    nell: Mm. That's what candles say.
+ ["I'm exhausted."]
    nell/warm: In my day we called it a lie-in. I recommend it highly. I've had about sixty of them.
- ->->

=== ash_day2 ===
ash/smile: You look terrible. Lovingly.
ash: If you need someone to take your stall shift this afternoon, I'm free.
+ ["I might take you up on that."]
    ash/warm: Offer stands.
+ ["I'll be fine."]
    ash: Offer still stands.
- ->->

=== kids_day2 ===
pip/laugh: Will you play lantern tag with us?
{ tasks_done >= 2:
    You hear yourself say "Not NOW" much louder than you meant to.
    pip/sad: ...Okay.
    juno: She was only asking.
    ->->
}
+ ["Maybe later. I'm really tired."]
    juno: Later counts. I'm writing it down.
+ ["One round."]
    You play one round. You're it the whole time. #event: tire
- ->->

=== check_in ===
You sit on the fountain wall and check in. Not with the list. With yourself. #scene: checkin
+ [·] -> checked

= checked
{ guilt_fits:
    Okay. Then do what's needed, and keep an eye on how you're doing.
    -> day_two_hub
}
~ rest_ok = true
The tiredness matches what's happening: three hours of sleep, and you've been going since dawn. The guilt about stopping doesn't.
Resting isn't the same as hiding. Hiding gets you away from a feeling. Resting looks after the person who's having it.
The difference is how you go: tell someone, say when you'll be back, and then really rest.
-> day_two_hub

=== tell_ash ===
+ ["I'm wiped out. Could you take my stall this afternoon? I'll be back for the last night."]
    ~ told = true
    ash/warm: Finally. Go. I've got it.
- ->->

=== tell_mara ===
+ ["I need to rest this afternoon. I'll be back for the last night."]
    ~ told = true
    mara/smile: Of course. Thank you for telling me. I'd have worried.
- ->->

=== hollow_choice ===
{ told:
    -> rest
}
The hollow is right there. Nobody knows you're up here.
+ [Rest here anyway] -> rest
+ [Go back down first] -> day_two_hub

=== collapse ===
You sit down on the edge of the fountain and can't make yourself stand back up. #event: tire
ash/worried: Hey. Hey. When did you last sleep?
ash: Go. Up the hill, home, anywhere. I've got your stall.
~ told = true
+ [Let Ash take over] -> rest

=== rest ===
~ rested = true
{ tasks_done >= 3:
    ~ rest_kind = "partial"
- else:
    ~ rest_kind = "full"
}
You don't let the shell come this time. You just sit, back against the cool stone, and close your eyes. #event: rest {rest_kind}
{ told:
    Down below, someone knows where you are. Nothing needs you for a few hours.
}
The afternoon goes by without you. It turns out that's allowed.
You wake as the sun is going down. #event: sunset
{ rest_kind == "full":
    Your head is clear. Your hands are steady.
- else:
    You feel better. Not all the way. Your body is still catching up.
}
{ not told:
    mara/worried: There you are! I looked everywhere.
    mara/smile: You look better, though. Good.
}
-> chapter_two_done

// ---------------------------------------------------------------------------
// Chapter three: the storm. When a feeling is too big to think through,
// bring the body down first. (DBT: TIPP: cold water and paced breathing.)

=== start_storm ===
// Entry point for "jump to chapter three" on the title screen.
~ completeness = "full"
~ rested = true
~ rest_kind = "full"
-> storm

=== storm ===
Chapter three: The storm. #event: chapter 3
The last night of the festival. The lanterns are lit and the square is full.
Then the wind changes. #event: storm on
A gust tears across the square. The lantern string bucks and snaps. Someone's hat cartwheels past the fountain.
pip/scared: The lanterns!
Your heart slams. Your breath goes short and high. Everything is too loud at once. #event: wave
-> storm_hub

=== storm_hub ===
- (hub)
{ distress() < 50: -> clear_head }
{ storm_hub.hub > 1:
    Your thoughts are still racing too fast to make a plan.
- else:
    You can't think. There's no plan in your head, just noise. First, your body has to come down.
}
+ {not cold_water} [Splash cold water from the fountain on your face #use: fountain_water]
    -> cold_water -> hub
+ [Slow your breathing]
    -> breathe -> hub
+ {not grab} [Grab at the lanterns now]
    -> grab -> hub

=== cold_water ===
You plunge your hands into the fountain and press the cold water to your face. You hold your breath for a few seconds, face wet. #event: calm cold
Your heartbeat drops a notch. Then another.
->->

=== breathe ===
Breathe in through your nose, and out slower than in. #scene: breathe
+ [·]
- { breaths:
- 0: It's hard to slow down. Your breath keeps catching.
- 1: One slow breath. A little room opens up.
- else: {breaths} slow breaths. Your shoulders come down from around your ears.
}
->->

=== grab ===
~ lost = true
You lunge for the nearest lantern. Your hands are shaking too hard. It slips, and the wind takes it up over the rooftops. #event: lose_lantern
It's gone. The others are still there.
->->

=== clear_head ===
The storm is just as loud. But you can think again. #event: clear
Pip is crouched behind the fountain, crying. The lantern string whips back and forth.
+ ["Pip. Breathe with me. In... and slowly out."]
    ~ helped_pip = true
    pip/sad: I can't.
    "In," you say, and breathe in. "And out, slow." You do it again. Then she does it with you.
    pip/worried: Okay. Okay. I'm okay.
+ [Run straight to the lanterns]
    You leave Pip with Juno and run for the string.
-
mara/worried: Help me tie them down!
Tie each lantern to the string before the wind takes it. #scene: secure
+ [·] -> storm_end

=== storm_end ===
The wind drops as fast as it came. The rain stops. #event: storm off #event: settle full
{ lost:
    One lantern is somewhere over the hill. The rest still glow.
- else:
    Every lantern still glows.
}
Everyone comes out from doorways and from under the bakery awning, soaked and laughing. #event: face you:smile
-> after_storm

=== after_storm ===
~ phase = "after_storm"
- (hub)
+ {seen_mara != phase} [Talk to Mara #talk: mara #new]
    -> talk_mara -> hub
+ {seen_mara == phase} [Talk to Mara #talk: mara]
    -> talk_mara -> hub
+ {seen_tobin != phase} [Talk to Tobin #talk: tobin #new]
    -> talk_tobin -> hub
+ {seen_tobin == phase} [Talk to Tobin #talk: tobin]
    -> talk_tobin -> hub
+ {seen_kids != phase} [Talk to the kids #talk: pip #new]
    -> talk_kids -> hub
+ {seen_kids == phase} [Talk to the kids #talk: pip]
    -> talk_kids -> hub
+ {seen_bakers != phase} [Talk to the bakers #talk: wren #new]
    -> talk_bakers -> hub
+ {seen_bakers == phase} [Talk to the bakers #talk: wren]
    -> talk_bakers -> hub
+ {seen_ash != phase} [Talk to Ash #talk: ash #new]
    -> talk_ash -> hub
+ {seen_ash == phase} [Talk to Ash #talk: ash]
    -> talk_ash -> hub
+ {seen_nell != phase} [Talk to Nell #talk: nell #new]
    -> talk_nell -> hub
+ {seen_nell == phase} [Talk to Nell #talk: nell]
    -> talk_nell -> hub
+ [Walk home #go: home] -> chapter_three_done


// ===========================================================================
// Conversations. Each villager has a menu of topics that changes with `phase`
// and opens up as you learn things. Story-critical talks (facts, errands,
// telling someone you're resting) are topics here too. Rules: CHARACTERS.md.
// Villagers talk about their own lives; nobody explains a skill.
// ===========================================================================

=== talk_nell ===
{ seen_nell != phase:
    ~ seen_nell = phase
    { phase:
    - "afternoon": nell/smile: Look at you. Off to fetch the lanterns?
    - "facts":
        { hide_count > 0:
            nell/warm: Come here, then.
        - else:
            nell/worried: I heard a clatter from up here. You all right?
        }
    - "festival": nell/smile: Look at that. Sixty-one festivals and they still get me.
    - "day2": nell: Morning.
    - else: nell/laugh: Well! Sixty-two festivals. That was the best storm.
    }
- else:
    nell: Back again? I'm not going anywhere.
}
- (menu)
* {phase == "afternoon"} [Ask how many festivals she's seen]
    nell: Sixty-one, from this step. Somebody always drops something.
    ** ["Not me. Not today."]
        ~ nell_not_me = true
        nell/laugh: That's what they all say.
    ** ["Which one was the best?"]
        nell/warm: The year it poured and not one lantern would light. We all sat in the bakery till morning. Best one.
    -- 
* {phase == "afternoon"} [Ask about her yellow front door]
    -> nell_door_story ->
* {phase == "afternoon"} [Ask what she's watching]
    nell: Everyone. Best show in the village.
    nell/smile: Mara's walked past six times with that list. Tobin twice, limping. Pip once, at a gallop.
* {phase == "facts" && hide_count > 0} [Ask if anyone came looking for you]
    -> fact_mara_nell ->
* {phase == "facts" && hide_count == 0} [Ask if she saw you fall]
    nell: From up here? I saw a lantern rolling and somebody getting up.
    nell/warm: That's all a fall is, from a distance.
* {phase == "facts" && nell_door && hide_count > 0} [Ask about her yellow door again]
    nell/warm: You've been up in that hollow, haven't you.
    nell: Whoever painted my door never knocked. They just made it a bit easier to come out.
* {phase == "festival"} [Ask how this one compares]
    -> nell_evening ->
* {phase == "festival" && nell_not_me} [Remind her what you said this afternoon]
    nell/laugh: "Not me, not today." I remember.
    nell/warm: Somebody always drops something. Doesn't mean it stays dropped.
* {phase == "day2"} [Tell her how you're doing]
    -> nell_day2 ->
* {phase == "day2" && nell_door} [Ask who she thinks painted her door]
    nell: Sixty years of guessing. I've decided it was everybody.
* {phase == "after_storm"} [Talk about the storm]
    nell: Best storm in sixty-two festivals. Nobody went home.
    nell/warm: I saw you by the fountain, mid-storm. Steady as a post, in the end.
* {phase == "after_storm" && nell_door} [Ask if she'll ever repaint her door]
    nell/smile: Never. Yellow's the only color a door should be.
* {phase == "afternoon"} [Ask how long she's known you]
    nell/smile: Since you were eight, and new, and hiding behind a moving van.
    nell: You used to vanish up that hill for hours. I always knew where you'd gone.
    nell/warm: I never said. A person's allowed a hiding place.
* {phase == "after_storm" && rosa_notes && nell_door} [Tell her what was in Rosa's notes]
    -> nell_truth ->
+ [Say goodbye]
    -> bye
- -> menu
= bye
nell/smile: Go on, then.
->->

=== nell_door_story ===
nell: You've noticed my door, then. Yellow as a yolk.
nell: One winter, a long time ago, I lost my place at the mill. I couldn't face anybody. I didn't come out till spring.
+ ["What happened in spring?"]
    nell/warm: I opened the door, and it was yellow. Somebody had painted it while I was in there.
+ [Listen]
    nell/warm: When I finally opened it, it was yellow. Somebody had painted it while I was hiding.
-
nell/smile: Nobody ever owned up. I've never painted over it.
~ nell_door = true
->->

=== nell_truth ===
~ told_nell = true
You tell her. The lantern on Rosa's step, every night that first winter. The yellow paint in spring. "Don't tell her."
Nell doesn't say anything for a long time. #event: face nell:surprised
nell/sad: Rosa.
nell: Wil had died that autumn. Then the mill shut. Everyone thought it was the mill I was hiding from.
nell/sad: It was never the mill.
nell: I used to sit at that window in the dark and look at her light. I thought she'd just taken to sitting out.
+ [Sit with her]
    You sit on the step beside her. The lanterns move a little in what's left of the wind.
+ ["She didn't want you to have to thank her."]
    nell/laugh: Well, she's out of luck. I'll thank her granddaughter instead.
-
nell/warm: Sixty-two festivals. I thought I'd been watching them. Turns out they were watching me.
nell/smile: I'll go and see Mara tomorrow. Bring her something. Something yellow.
->->

=== talk_ash ===
{ seen_ash != phase:
    ~ seen_ash = phase
    { phase:
    - "afternoon": ash/smile: Tea when you're done? I'm saving you the chipped cup. It's your favorite, don't argue.
    - "facts":
        { hide_count > 0:
            ash/worried: Hey. There you are.
        - else:
            ash: Hey.
        }
    - "festival": ash/smile: There you are.
    - "day2": ash: Morning.
    - else: ash/warm: Here. Hot. Drink it.
    }
- else:
    ash: Still here. Still pouring.
}
- (menu)
* {phase == "afternoon"} [Ask what's in the pot]
    ash: Smoky black with orange peel. I'm calling it Lantern. Very marketable.
    ** ["Save me a cup. I'll be back before sundown."]
        ash: I'll hold you to it.
    ** ["You could help me carry the lanterns."]
        ash/laugh: And leave the tea alone? Wren would drink all of it.
    --
* {phase == "afternoon"} [Ask about the tea cart]
    -> ash_shop_story ->
* {phase == "afternoon"} [Ask about the chipped cup]
    ash/laugh: You chipped it. You were twelve. You cried for an hour.
    ash: I told you it was my favorite now, so you'd stop.
    ash/warm: Then it actually was.
* {phase == "facts" && hide_count > 0} [Ask how Ash knew where you were]
    ash/warm: Same place as when we were ten. I sat outside that time, too.
    ash: You came out when the tea went cold. I figured it might work twice.
* {phase == "facts" && hide_count > 0 && not ash_morning} [Ask how last night went]
    -> ash_morning ->
* {phase == "facts" && hide_count == 0} [Ask if anyone said anything about the fall]
    -> fact_mara_ash ->
* {phase == "facts" && ash_shop} [Ask about the tea shop]
    ash: Not now. You first. How are you doing?
    ** ["Embarrassed, honestly."]
        ash/warm: Yeah. That stone has embarrassed half the village this week.
    ** ["I'm fine."]
        ash: Okay. Offer stands, whenever.
    --
* {phase == "festival"} [Have some tea]
    -> ash_evening ->
* {phase == "festival"} [Ask if Ash's family is coming to the festival]
    ash: My parents run a tea company in the city. Forty shops. They think the cart is a phase.
    ash/laugh: I've been in this phase for six years.
    ash/warm: Gran had this cart before me. She taught us both to drink tea, remember? She'd have come.
* {phase == "festival" && ash_shop} [Ask about the tea shop]
    ash/laugh: I put a sign up. Then I took it down. Then I put it back up.
    { ash_cheer == "encourage":
        ash/warm: You said you'd come. I'm holding you to that, too.
    }
* {phase == "day2" && not (rest_ok && not told)} [Ask about the stall]
    -> ash_day2 ->
* {phase == "day2" && rest_ok && not told} [Tell Ash you're taking the afternoon]
    -> tell_ash ->
* {phase == "day2" && ash_shop} [Ask how the shop plans are going]
    ash/tired: I signed the lease this morning. I haven't slept either. Don't tell anyone.
    ** ["That's huge. Well done."]
        ash/warm: It's terrifying. Thank you.
    ** ["You should take a rest too."]
        ash/laugh: After you.
    --
* {phase == "after_storm"} [Drink the tea]
    The tea is terrible. You drink all of it.
    ash/warm: You looked like you were going to bolt for a second, back there. Then you didn't.
* {phase == "after_storm" && ash_shop} [Ask about opening day]
    ash: Next week. I'm terrified. I'm doing it anyway.
    ash/smile: The chipped cup's yours, obviously.
+ [Say goodbye]
    -> bye
- -> menu
= bye
ash: See you.
->->

=== ash_shop_story ===
ash: Can I tell you something? I'm thinking of turning the old mill office into a tea shop. A real one. With chairs.
ash/worried: What if nobody comes? What if I open the door and it's just me and forty cups?
+ ["People will come. I'll come."]
    ~ ash_cheer = "encourage"
    ash/warm: That's one.
+ ["Then you'll have forty cups of tea. Sounds fine to me."]
    ~ ash_cheer = "joke"
    ash/laugh: You're no help at all. Thank you.
+ ["What scares you most about it?"]
    ~ ash_cheer = "ask"
    ash: That I'll try, and it'll be... just okay.
    ash/smile: Huh. Saying it out loud makes it smaller.
-
~ ash_shop = true
->->

=== talk_tobin ===
{ seen_tobin != phase:
    ~ seen_tobin = phase
    { phase:
    - "afternoon":
        { have_lanterns:
            tobin/laugh: Careful with those! Ha. Listen to me, saying careful.
        - else:
            tobin/smile: They're all on the bench. Twelve. I counted, so Juno doesn't have to.
        }
        There's dust on his knees, and a cracked lantern by his elbow.
    - "facts": tobin/worried: Oh. Hi.
    - "festival": tobin/smile: Look at them go.
    - "day2": tobin: Morning. Mind the glue.
    - else: tobin/laugh: Did you SEE that wind?
    }
- else:
    tobin: Back for more?
}
- (menu)
* {phase == "afternoon"} [Ask about his knees]
    tobin/embarrassed: Loose cobblestone by the fountain. Went down in front of everyone this morning. Took a whole string of bunting with me.
    tobin/laugh: I've been laughing about it all day, so nobody else gets to first.
    ~ tobin_fall = true
    ** [Laugh with him]
        ~ tobin_tone = "laughed"
        tobin/laugh: See? Better already.
    ** ["That sounds rough, actually."]
        ~ tobin_tone = "kind"
        tobin/sad: ...Yeah. It was a bit.
    ** [Say nothing]
        ~ tobin_tone = "quiet"
        He fiddles with a twist of wire.
    --
* {phase == "afternoon"} [Ask about the lanterns]
    tobin/smile: Eleven of them are mine. Took me all spring.
    { variant == "promise":
        tobin: The twelfth is Mara's grandmother's. Older than me. Don't drop that one. Ha.
    - else:
        tobin: The red one's Pip's favorite. She's named it. I'm not allowed to say the name.
        tobin/embarrassed: It's the first one I designed myself. Don't tell Hesketh it's crooked.
    }
* {phase == "afternoon"} [Ask about the workshop]
    tobin: Old Hesketh taught me. He retired to the coast. Writes me letters about glue.
    tobin/laugh: Long letters.
* {phase == "facts"} [Ask Tobin what happened]
    -> fact_tobin ->
* {phase == "facts" && fact_tobin} [Ask why he laughs so much]
    tobin: My dad laughed at everything. Even when it hurt. Especially when it hurt.
    tobin/worried: I think I learned that if you laugh first, nobody can laugh at you.
    tobin/sad: Doesn't really work, does it.
    ** ["It's a good laugh, though."]
        tobin/smile: Thanks.
    ** ["No. But I get it."]
        tobin/warm: Yeah.
    --
* {phase == "festival"} [Talk about the stone]
    -> tobin_evening ->
* {phase == "festival"} [Ask what Hesketh wrote last]
    ~ tobin_offer = true
    tobin: He wants to give me the workshop. For good. Not apprentice. Just... mine.
    tobin/laugh: I haven't written back. Ha. It's been three weeks.
    ** ["What's stopping you?"]
        tobin/worried: What if I'm just the apprentice who kept it warm? What if it's all crooked lanterns from here?
        tobin/sad: Nobody laughs at an apprentice for getting it wrong.
    ** ["You should take it."]
        tobin/embarrassed: Everybody says that. Then I go and look at the red one, and it's crooked.
    --
* {phase == "festival"} [Ask if anyone teased him]
    tobin/laugh: Pip asked me to fall again so her cousin could see. Twice.
    { tobin_tone == "kind":
        tobin/warm: You were the only one who said it sounded rough. I thought about that all afternoon.
    }
* {phase == "day2" && task == "" && not sort_ask} [Ask if he needs anything]
    -> sort_ask ->
* {phase == "day2"} [Ask how he's doing]
    tobin/embarrassed: Honestly? Pip's been telling everyone about my fall. With actions. It's a whole show now.
    ** {hide_count > 0} ["I hid in the hollow all night, after mine."]
        ~ tobin_shared = true
        tobin/surprised: You did? Huh.
        tobin/smile: I thought it was just me who wanted to vanish. Two of us, then.
    ** {hide_count == 0} ["I wanted to vanish yesterday, too."]
        ~ tobin_shared = true
        tobin/surprised: You? You looked so... still.
        tobin/smile: Huh. Two of us, then.
    ** ["You'll be old news by tonight."]
        tobin: Promise?
    --
* {phase == "after_storm"} [Talk about the storm]
    tobin/laugh: Best festival in years. Nobody will ever forget that wind.
    { tobin_shared:
        tobin/warm: Neither of us vanished. Look at that.
    }
* {phase == "after_storm" && tobin_offer} [Ask if he's written back to Hesketh]
    tobin/surprised: This morning. I said yes. Then I laughed for about ten minutes.
    tobin/warm: Not the hiding kind of laughing. The other kind.
* {phase == "after_storm" && tobin_evening} [Ask about the stone]
    tobin/smile: Fixed it this morning. With a hammer. Personally. It held through all that.
+ [Say goodbye]
    -> bye
- -> menu
= bye
tobin: Mind the stone.
->->

=== talk_mara ===
{ seen_mara != phase:
    ~ seen_mara = phase
    { phase:
    - "afternoon": mara/worried: There you are. Okay. Okay. Lanterns, then bread, then candles, then... okay.
    - "festival": mara/smile: Hi.
    - "day2": mara/worried: Morning! Sorry. Morning. I've got a list.
    - else: mara/surprised: We're all still here.
    }
- else:
    mara: Hi again.
}
- (menu)
* {phase == "afternoon"} [Ask how she's doing]
    mara/worried: Fine. Great. Everything's fine. Three things are on fire, metaphorically.
    ** ["Breathe. It's going to be lovely."]
        mara/smile: Tell me that again at sundown.
    ** ["Where do you want the lanterns?"]
        mara: By the fountain. Thank you. Really.
    --
* {phase == "afternoon"} [Ask how the festival started]
    mara: My grandmother started it. Sixty-one years ago, with one lantern on her own front step.
    mara/smile: Then a neighbor put one out. Then the whole lane. Then the square.
    { variant == "promise":
        mara/warm: That's her lantern you've got. The first one.
    }
    ~ mara_grandma = true
* {phase == "afternoon"} [Ask why she asked you to carry the lanterns]
    mara: Because you came back. Grandma used to say the festival's how you know you live somewhere.
    mara/smile: You carry something, you hang it up, and then it's yours too.
* {phase == "afternoon"} [Offer to help]
    mara/warm: You already are. Just get them here in one piece.
* {phase == "festival"} [Talk about tonight]
    -> mara_evening ->
* {phase == "festival" && mara_grandma} [Ask about her grandmother]
    mara/warm: She used to say the lanterns aren't for seeing by. They're for seeing each other.
* {phase == "festival"} [Ask what she was worried about]
    mara/worried: Last night? That something had gone wrong and it was my fault. It's always my first guess.
    ** ["It wasn't."]
        mara/smile: I know. Now.
    ** ["That's my first guess, too."]
        mara/laugh: Then we should start a club. We'd blame ourselves for the snacks.
    --
* {phase == "day2" && task == "" && not bunting_ask && not (rest_ok && not told)} [Ask if she needs anything]
    -> bunting_ask ->
* {phase == "day2" && rest_ok && not told} [Tell Mara you're taking the afternoon]
    -> tell_mara ->
* {phase == "day2"} [Ask how she's holding up]
    mara/tired: Fine. Great. I've slept four hours since Tuesday.
    ** {rest_ok} ["I'm going to rest this afternoon. Maybe you could, too."]
        ~ mara_rests = true
        mara: ...An hour. Maybe. If Tobin watches the list.
        mara/laugh: He'll lose the list.
    ** ["You should rest after the festival."]
        mara/laugh: After the festival. I always say that.
    ** [Nod]
        She nods back, already looking at the list.
    --
* {phase == "after_storm"} [Talk about the storm]
    mara/scared: I froze. Everything was flying and I just stood there.
    ** ["You came back, though."]
        mara/smile: We both did.
    ** ["Me too, at first."]
        mara/warm: It was a lot, wasn't it.
    --
    { mara_rests:
        mara/laugh: Good thing I had that nap.
    }
* {phase == "after_storm" && mara_grandma} [Ask what she kept of her grandmother's]
    -> rosa_box ->
* {phase == "after_storm" && mara_grandma} [Look up at the lanterns with her]
    mara/warm: For seeing each other.
    { lost:
        mara/smile: One's somewhere over the hill. Grandma would say it's lighting somebody else's way.
    }
+ [Say goodbye]
    -> bye
- -> menu
= bye
mara/smile: Thank you. For everything.
->->

=== rosa_box ===
mara: Her lantern. Her house. And a box in the attic that says FESTIVAL on the lid.
mara/embarrassed: Five years, and I've never opened it. What if it's all the things I've been doing wrong?
+ ["Want to open it together? Now?"]
    mara/worried: ...Okay. Okay. Now, before I think about it.
    She comes back with a shoebox tied with string. Inside: years of little notes, in pencil.
    mara: "Year three. Forgot the candles. Used turnips. Nobody noticed."
    mara/laugh: "Year nine. Set fire to the bakery awning. Bet forgave me by Easter."
    mara/laughing: They're all mistakes. Sixty years of her getting it wrong. On purpose, practically.
    At the bottom there's an older note, folded small. Mara reads it, and goes quiet. #event: face mara:surprised
    mara: "The first one was for Nell. Wil's gone and the mill's shut and she hasn't opened her curtains since October. I thought if there was a light on my step, she'd have something to look at."
    mara: "Painted her door in April. Yellow. Don't tell her. She'd only feel she had to thank me."
    mara/warm: The whole festival. It started for Nell.
    ~ rosa_notes = true
    { nell_door:
        mara: You know her better than I do. Grandma said don't tell her. But Grandma's not here to decide.
    }
+ ["You don't have to open it."]
    mara/warm: No. I don't, do I.
    mara: Maybe next year. With tea.
-
->->

=== talk_bakers ===
{ seen_bakers != phase:
    ~ seen_bakers = phase
    { phase:
    - "afternoon":
        wren/worried: Oda. The bread. Sundown.
        oda: The bread will be ready at sundown, because the bread is always ready at sundown.
    - "facts":
        oda: Hello, love.
    - "festival": wren/smile: You made it.
    - "day2": oda: Morning! Mind the flour.
    - else: oda/laugh: Still dry in here. Mostly.
    }
- else:
    oda: Back for more bread?
}
- (menu)
* {phase == "afternoon"} [Ask about the bread]
    wren/worried: You don't know it'll be ready.
    oda/smile: Twenty years, Wren.
    oda: Don't mind us. We do this every year.
    ** ["It smells amazing."]
        oda/warm: Come by later. The burnt ones are free.
    ** [Leave them to it]
        They're already back to arguing.
    --
* {phase == "afternoon"} [Ask how long they've been married]
    oda: Twenty years.
    wren: Nineteen of them arguing about bread.
    oda/smile: And one about the oven.
* {phase == "afternoon"} [Ask Wren why she keeps rubbing her back]
    wren: I'm not.
    oda: She is.
    wren/worried: It's fine. It's always fine.
    ~ wren_back = true
* {phase == "facts"} [Ask if they saw anything]
    -> fact_bakers ->
* {phase == "festival"} [Have some bread]
    -> bakers_evening ->
* {phase == "festival" && wren_back} [Ask Wren about her back]
    oda: Go on. Tell them.
    wren/sad: ...It's sore. It's been sore all week.
    oda/warm: First time in twenty years she's said so out loud.
* {phase == "day2" && task == "" && not bread_ask} [Ask if they need anything]
    -> bread_ask ->
* {phase == "day2"} [Ask how Wren's back is]
    ~ wren_back = true
    { carried_bread:
        wren/warm: Better, for not carrying those trays. Thank you. I wouldn't have asked.
    - else:
        oda/laugh: Pip and Juno carried the trays. Wren supervised. Loudly.
    }
* {phase == "day2"} [Ask Oda if she slept]
    ~ oda_early = true
    oda/tired: Like a log. A log that gets up early.
    wren: We start at four. Same as always.
    oda: ...Mm.
* {phase == "after_storm" && oda_early} [Ask Oda about the early starts]
    oda/embarrassed: Oh. Well.
    oda: I've been getting up at three. Doing Wren's kneading before she comes down.
    wren/surprised: Since when?
    oda: Since about last spring. Since your back started.
    wren/sad: You daft badger. A whole year?
    oda/warm: You'd never have let me if I'd asked.
    wren/warm: ...No. I wouldn't.
    wren: Tomorrow we put a sign in the window. Help wanted. Out loud.
* {phase == "after_storm"} [Ask how they got through the storm]
    oda: Wren let me carry the bread in off the porch. All of it.
    wren: I asked. Out loud.
    oda/laugh: I nearly fainted.
+ [Say goodbye]
    -> bye
- -> menu
= bye
oda: Take a roll for the road.
->->

=== talk_kids ===
{ seen_kids != phase:
    ~ seen_kids = phase
    { phase:
    - "afternoon": pip/surprised: Are you bringing ALL the lanterns?
    - "facts": juno: Oh. Hi.
    - "festival": juno: Hi.
    - "day2": juno: Morning.
    - else: pip/surprised: That was the LOUDEST thing ever.
    }
- else:
    juno: You again.
}
- (menu)
* {phase == "afternoon"} [Ask what they're up to]
    juno: Counting the lanterns. There are twelve. Tobin counted. I counted again.
    ** ["Want to see the red one later?"]
        pip/laugh: YES.
    ** ["Twelve exactly."]
        juno/smile: I know.
    --
* {phase == "afternoon"} [Ask Juno what else she counts]
    juno: Cobblestones. There are four hundred and twelve in the square.
    pip: She counts when it's loud.
    juno: It gives the noise somewhere to go.
    ~ juno_counting = true
* {phase == "afternoon"} [Ask Pip about tonight]
    pip/laugh: I'm staying up the WHOLE night.
    juno: She says that every year.
* {phase == "facts"} [Ask them about the red lantern]
    -> fact_kids ->
* {phase == "facts"} [Ask Juno how many lanterns there are now]
    juno: Still twelve. I checked. Twice.
* {phase == "festival"} [Look at the red lantern]
    -> kids_evening ->
* {phase == "festival"} [Ask Pip if she's tired yet]
    pip/tired: I'm not even tired.
    juno: She's yawning.
    pip/laugh: I'm yawning ON PURPOSE.
* {phase == "day2"} [Ask what they're playing]
    -> kids_day2 ->
* {phase == "day2"} [Ask who's looking after them today]
    juno: Wren and Oda. Mum's a nurse at the infirmary in Haddon. She works nights, so she sleeps in the day.
    pip/happy: We get the burnt rolls!
    juno: I count the days to Saturday. When she's home all day. It's two.
    pip: She counted when Mum first started nights, too. Every single day.
* {phase == "festival" && variant == "main"} [Ask Pip what she named the red lantern]
    pip/laugh: STRAWBERRY.
    juno: It's not even a strawberry color.
    pip: It's a strawberry IN ITS HEART.
* {phase == "day2" && juno_counting} [Ask Juno what she's counting today]
    juno: Bunting flags. Seventy-three. Two are on the wrong way round.
* {phase == "after_storm"} [Ask Pip how she's doing]
    { helped_pip:
        pip/smile: I did the breathing. In, and slow out. I'm going to do it at school.
    - else:
        pip/sad: I was scared.
        juno: I held her hand. And counted.
    }
* {phase == "after_storm" && juno_counting} [Ask Juno how many she counted]
    juno/smile: Four hundred and twelve cobblestones. Twice. It helped.
+ [Say goodbye]
    -> bye
- -> menu
= bye
pip/laugh: BYE!
->->

// ---------------------------------------------------------------------------
// Chapter four: opening day. Asking for what you need, and saying no to a
// friend, in a way that keeps the friend and keeps you. (DBT: DEAR MAN, GIVE,
// FAST. Player-facing text never names these.)

=== chapter_three_done ===
~ next_chapter = 4
Chapter three is done. #scene: save
+ [·] -> mill

=== start_mill ===
// Entry point for "jump to chapter four" on the title screen.
~ completeness = "full"
-> mill

=== mill ===
Chapter four: Opening day. #event: chapter 4
A week after the festival. The river is high and full of fallen leaves, and the old mill wheel is turning for the first time in sixty years. #event: prop on:sign_down
Tobin freed it yesterday, for luck. Ash opens the tea room at noon.
Ash asked you to come early. You're not sure what for.
-> mill_hub

=== mill_hub ===
~ phase = "mill"
- (hub)
+ {not sign_hung && seen_ash != phase} [Talk to Ash #talk: ash #new]
    -> talk_ash_mill -> hub
+ {not sign_hung && seen_ash == phase} [Talk to Ash #talk: ash]
    -> talk_ash_mill -> hub
+ {seen_tobin != phase} [Talk to Tobin #talk: tobin #new]
    -> talk_tobin_mill -> hub
+ {seen_tobin == phase} [Talk to Tobin #talk: tobin]
    -> talk_tobin_mill -> hub
+ {seen_nell != phase} [Talk to Nell #talk: nell #new]
    -> talk_nell_mill -> hub
+ {seen_nell == phase} [Talk to Nell #talk: nell]
    -> talk_nell_mill -> hub
+ {not sign_hung} [Hang the sign over the door #use: shop_sign]
    -> hang_sign -> hub
+ {sign_hung} [Talk to Ash about the sign #talk: ash #new]
    -> iris_arrives -> ash_asks

=== hang_sign ===
~ sign_hung = true
You climb the ladder by the door. The sign is heavier than it looks: MAE'S, with a little painted teacup. #event: prop off:sign_down
You hook both chains over the bracket. It swings once and settles. #event: prop on:sign_up
Ash comes out, looks up at it, and doesn't say anything for a second. #event: face ash:surprised
ash/warm: Gran would hate it. She'd say it was showing off. She'd love it.
->->

=== iris_arrives ===
~ iris_here = true
ash/happy: It's up? It's really up. Okay. Okay, it's real now.
A car stops on the lane above the mill. Someone in a plum coat picks her way down the path, holding her hat on. #event: place iris:9460
ash/surprised: That's... Mum. She said she might come. She never comes.
iris: Darling. #event: face iris:warm
iris: It's... sweet. Very rustic. Is that a real water wheel? How charming.
ash/embarrassed: Hi, Mum.
iris: I won't stay long. I just wanted to see it before you, well. Before you decide what's next.
ash: This is what's next, Mum.
iris: Of course it is. #event: face iris:neutral
She drifts off to look at the cups. Ash turns to you, very fast, in a low voice. #event: tense
->->

=== ash_asks ===
ash/worried: Okay. I need to ask you something, and I need you to say yes, because I don't have a plan B.
ash: Could you run the counter? Mornings. Every morning, just until it takes off. I can't pay you yet. I know. I know.
ash: Mum's here. If I can't keep it open, she's right. I need a second person.
You think about two weeks ago: the bread trays, the bunting, the lantern sorting, sitting down on the fountain and not being able to get up. #event: tense
Every morning is a lot. You want Ash to have this. You also know what every morning would do to you.
Work out what you'll say. #scene: sayit
+ [·] -> answer

= answer
~ gave_in = false
~ snapped = false
{ not ask_kind:
    ash/sad: Oh. Right. #event: face ash:sad
    { ask_clear:
        Ash heard you. It landed harder than you meant it to.
    }
}
{ not ask_clear:
    -> unclear
}
-> pushback

= unclear
{ ask_answer == "flat":
    ash/worried: So that's a no? Just... no?
- else:
    ash/happy: So that's a yes? Oh, thank you. I'll put you down for mornings.
}
+ ["Not every morning. I can do Saturdays. Every Saturday."]
    ~ ask_clear = true
    You say it again, plainer. It's easier the second time.
    -> pushback
+ ["...Sure. Mornings."]
    -> give_in

= pushback
ash/worried: Just the first month? Please? I really can't do it on my own. #event: tense
+ ["I know you're scared. I still can't do every morning. I can do Saturdays."]
    You say the same thing again, the same way. You don't add a new reason. You don't take it back.
    -> held
+ ["What are you scared will happen, if it's just you?"]
    ash/sad: That I'll open the door every morning and it'll be me and forty cups. And she'll be right.
    ash: That I'll have picked this over everything, and it'll be... just okay.
    ++ ["That's a real fear. And I still can't do every morning. Saturdays I'm yours."]
        You say it gently. You don't move.
        -> held
    ++ ["Okay. I'll do mornings."]
        -> give_in
+ ["Okay. Fine. Every morning."]
    -> give_in
+ ["I SAID no, Ash."]
    -> snap

= held
{ ask_kind:
    ash/surprised: Saturdays.
    ash/laughing: Every Saturday? You'd do every Saturday?
    ash/warm: That's... actually that's more than I thought I'd get, when I stopped panicking long enough to hear it.
- else:
    ash: Saturdays. Okay.
    ash/sad: Okay. That's fair. That's fair.
    Ash goes to fuss with the teapots. It's quiet for a minute. Things are a bit stiff between you, and they don't fix themselves.
}
~ saturdays = true
-> ash_and_iris

= give_in
~ gave_in = true
ash/happy: Really? Oh, thank you. Thank you. You're the best.
Something in your chest sinks a little as you say it. You already know what every morning will feel like by December. #event: tense
-> ash_and_iris

= snap
~ snapped = true
It comes out louder than you meant. Iris looks up from the cups. #event: face ash:sad
ash/embarrassed: Right. Sorry. Sorry I asked.
Ash goes back behind the counter and starts drying a cup that's already dry.
-> ash_and_iris

=== ash_and_iris ===
Ash glances over at Iris, who is reading the price board with her glasses on the end of her nose. #event: face iris:neutral
ash/worried: She's going to offer me my old job back. She does it every time. "When this has run its course." I've never actually told her no. Not once, in six years.
+ ["What do you want her to know?"]
    ash: That it isn't a phase. That I love her. That I'm staying.
    ash/surprised: Huh. That's... that's actually it, isn't it. That's the whole thing.
    ~ ash_ready = true
+ ["Want me to tell her for you?"]
    ash/warm: Ha. No. That's kind. It has to be me, or it doesn't count.
+ ["Just tell her. Get it over with."]
    ash/worried: Easy for you to say. She's not your mum.
    ash: ...But yeah. Okay.
-
Ash walks over to Iris. You stay near the counter. You can hear most of it anyway.
ash: Mum. Before you say it. I'm not coming back to the company.
{ ash_ready:
    ash: This isn't a phase. It's been six years, and it's what I want. I love you, and I'm staying here.
- else:
    ash: I'm staying here. This is it. This is the thing.
}
iris/surprised: Ash. Forty shops.
ash: I know, Mum. This is one shop. It's mine.
Iris doesn't say anything for a long moment. She looks at the forty cups, and the wheel turning outside the window. #event: face iris:sad
iris: Your grandmother used to say I'd never understand that cart.
iris/warm: ...Pour me a cup, then. The orange one. The one you're calling Lantern.
ash/surprised: You remembered.
iris: I remember everything you tell me, darling. I just don't always like it.
Ash pours. Their hands are shaking a bit. Iris drinks the whole cup and doesn't say a word about the price. #event: face ash:warm
-> mill_noon

=== mill_noon ===
At noon Ash turns the key in the door, and people come. Then more people. Then the whole lane. #event: prop on:busy_tables
{ saturdays:
    Ash writes on the chalkboard outside, in big careful letters. #event: prop on:chalk_saturdays
- else:
    Ash props the chalkboard by the door. OPEN, it says. #event: prop on:chalk_open
}
{ gave_in:
    You spend the afternoon behind the counter, washing cups. And then washing them again. #event: tire
}
By the time the light goes, every one of the forty cups has been used at least twice. #event: nightfall
Tobin strings lanterns along the front of the mill, and the water wheel turns underneath them. #event: prop on:mill_lanterns
-> mill_party

=== mill_party ===
~ phase = "mill_party"
- (hub)
+ {seen_ash != phase} [Talk to Ash #talk: ash #new]
    -> talk_ash_mill -> hub
+ {seen_ash == phase} [Talk to Ash #talk: ash]
    -> talk_ash_mill -> hub
+ {seen_mara != phase} [Talk to Mara #talk: mara #new]
    -> talk_mara_mill -> hub
+ {seen_mara == phase} [Talk to Mara #talk: mara]
    -> talk_mara_mill -> hub
+ {seen_tobin != phase} [Talk to Tobin #talk: tobin #new]
    -> talk_tobin_mill -> hub
+ {seen_tobin == phase} [Talk to Tobin #talk: tobin]
    -> talk_tobin_mill -> hub
+ {seen_nell != phase} [Talk to Nell #talk: nell #new]
    -> talk_nell_mill -> hub
+ {seen_nell == phase} [Talk to Nell #talk: nell]
    -> talk_nell_mill -> hub
+ {seen_bakers != phase} [Talk to the bakers #talk: wren #new]
    -> talk_bakers_mill -> hub
+ {seen_bakers == phase} [Talk to the bakers #talk: wren]
    -> talk_bakers_mill -> hub
+ {seen_kids != phase} [Talk to the kids #talk: pip #new]
    -> talk_kids_mill -> hub
+ {seen_kids == phase} [Talk to the kids #talk: pip]
    -> talk_kids_mill -> hub
+ {seen_iris != phase} [Talk to Iris #talk: iris #new]
    -> talk_iris -> hub
+ {seen_iris == phase} [Talk to Iris #talk: iris]
    -> talk_iris -> hub
+ [Walk home along the river #go: mill_path] -> chapter_four_done

=== chapter_four_done ===
~ next_chapter = 5
You walk home along the river. Behind you, the mill's lanterns shake in the water.
Chapter four is done. #scene: save
+ [·] -> snow

// --- Chapter four conversations ---------------------------------------------

=== talk_ash_mill ===
{ seen_ash != phase:
    ~ seen_ash = phase
    { phase:
    - "mill": ash/worried: You came! Good. Great. Is the sign straight? Don't look at the sign. Look at the sign.
    - else:
        { snapped && not ash_mended:
            ash: Hey. Tea?
        - else:
            ash/laughing: Forty cups. All of them. I have to wash forty cups.
        }
    }
- else:
    ash: Still pouring.
}
- (menu)
* {phase == "mill"} [Ask how Ash is feeling]
    ash/worried: Like I'm about to open a door and find out if I've wasted six years.
    ash/laughing: So, great. Fine. Lovely.
* {phase == "mill"} [Ask about the name]
    ash/warm: Mae's. After Gran. She ran the cart for forty years and never once had a chair.
    ash: Now there are twenty-two chairs. None of them match. She'd have hated that, too.
* {phase == "mill_party"} [Ask how the first day went]
    ash/happy: Forty cups. Every one of them, twice. Nell sat at her old desk for four hours and ordered one pot.
    { saturdays:
        ash/warm: And I've got Saturdays. Every Saturday. Two of us. I wrote it on the board so you can't back out.
    }
    { gave_in:
        ash/warm: And you, every morning. I don't know what I'd do without you.
        You smile. Your arms ache from the sink. It's going to be a long winter of mornings.
    }
* {phase == "mill_party" && gave_in} [Tell Ash every morning is too much after all]
    ash/surprised: Oh.
    You tell Ash: not every morning. Saturdays you can do, and you mean it. You should have said so at the start. You don't apologize more than once.
    ash: ...Okay. Saturdays. Honestly? I'd rather have you rested on Saturdays than wrecked on Tuesdays.
    ~ gave_in = false
    ~ saturdays = true
    Ash rubs OPEN off the chalkboard and writes something new. #event: prop off:chalk_open #event: prop on:chalk_saturdays
* {phase == "mill_party" && snapped && not ash_mended} [Say sorry for snapping, and say it again, gently]
    ~ ash_mended = true
    You tell Ash you're sorry you shouted. And then you say the thing you meant: not every morning, but Saturdays, every Saturday, if Ash wants.
    ash/warm: I do want. I panicked at you. You panicked back. We're quite good at it.
    ~ saturdays = true
    Ash writes it on the chalkboard by the door, in big careful letters. #event: prop off:chalk_open #event: prop on:chalk_saturdays
* {phase == "mill_party"} [Ask about Iris]
    ash/surprised: She's still here. She's on her third pot. She asked where the toilet is, which means she's staying.
    ash/warm: She said it was "rather good tea." From her, that's a parade.
+ [Say goodbye]
    -> bye
- -> menu
= bye
ash: Mind the river on the way home.
->->

=== talk_tobin_mill ===
{ seen_tobin != phase:
    ~ seen_tobin = phase
    { phase:
    - "mill": tobin/laughing: Look at it go! Sixty years stuck, and it just needed someone to hit it with a mallet.
    - else: tobin/happy: Ten lanterns, all along the front. Only one crooked.
    }
- else:
    tobin: Hello again.
}
- (menu)
* {phase == "mill"} [Ask how he got the wheel turning]
    tobin: Grease, a mallet, and a lot of swearing at a rusty pin. Ha.
    tobin/warm: Hesketh says the mill made the whole village, once. Felt right to wake it up.
* {phase == "mill"} [Ask how the workshop is, now it's his]
    tobin/embarrassed: Mine. Still weird to say. I put my name on the door. Then I took it off. Then I put it back on.
    tobin: Hesketh sent a letter. Says the sea's been rough at home. His old shed's right on the shingle. He keeps all the original moulds in there.
* {phase == "mill_party"} [Ask about the lanterns along the mill]
    tobin/happy: Ten. Made them this week. One's crooked, but it's at the back, so it's fine.
    tobin/laughing: Pip found it in about four seconds.
* {phase == "mill_party" && tobin_offer} [Ask if he's heard from Hesketh]
    tobin/worried: He says there's a big tide due in the spring. He's moving the moulds up a shelf. He's eighty-six. He shouldn't be moving anything.
    tobin: I might go down and help. Dad's there, too. Ha. That'll be fun.
+ [Say goodbye]
    -> bye
- -> menu
= bye
tobin: Mind the race. It's deep.
->->

=== talk_nell_mill ===
{ seen_nell != phase:
    ~ seen_nell = phase
    { phase:
    - "mill": nell/warm: My desk was right here. Under this window. Sixty-one years ago.
    - else: nell/happy: Best seat in the house. I've had it twice.
    }
- else:
    nell: Still here.
}
- (menu)
* {phase == "mill"} [Ask what she did at the mill]
    nell: I did the wages. Every Friday, a little brown envelope for everyone. I knew what every family in the village earned.
    nell/laughing: Which is why nobody ever argued with me.
* {phase == "mill"} [Ask what it's like being back]
    nell: I thought it would be sad. It smells of tea and new paint. It's hard to be sad in a room that smells of new paint.
    { told_nell:
        nell/warm: And I came in thinking about Rosa. She'd have brought a lantern. I brought one for her.
    }
* {phase == "mill_party"} [Ask how the tea is]
    nell: Terrible. Ash makes it like the grandmother did. I've had four cups.
* {phase == "mill_party" && told_nell} [Ask if she gave Mara something yellow]
    nell/warm: A teapot. Yellow as a yolk. She cried into it, so now it's been christened.
+ [Say goodbye]
    -> bye
- -> menu
= bye
nell: Go on, then.
->->

=== talk_mara_mill ===
{ seen_mara != phase:
    ~ seen_mara = phase
    mara/happy: I left my list at home. On purpose. I keep reaching for it.
- else:
    mara: Hi again.
}
- (menu)
* [Ask how the festival clean-up went]
    mara: Tobin's got the lanterns back in the workshop. The bunting's in a box. I didn't make a single list.
    mara/laughing: Two lists. Small ones.
* {rosa_notes} [Ask about Rosa's box]
    mara/warm: I read the whole thing. Sixty years of turnips and fires and forgetting the candles.
    mara: She wasn't keeping track of what she got right. She was keeping track of what was funny.
* {told_nell} [Ask about Nell's teapot]
    mara/embarrassed: She came over with it the next morning, and I cried on her doorstep. She told me to stop or I'd rust it.
+ [Say goodbye]
    -> bye
- -> menu
= bye
mara/happy: Isn't it lovely? It's lovely.
->->

=== talk_bakers_mill ===
{ seen_bakers != phase:
    ~ seen_bakers = phase
    oda/happy: Scones! Eat one before Pip finds them.
- else:
    oda: Another scone?
}
- (menu)
* [Ask how the bakery's doing]
    { oda_early:
        wren/warm: We hired a helper. Starts Monday. I asked out loud, in the window, in writing.
        oda/laughing: She practised in the mirror.
    - else:
        wren: Busy. My back's better. Oda's been very... efficient, lately.
        oda: Mm.
    }
* [Ask who made the scones]
    wren: Me. Oda says they're dense.
    oda/warm: They're the best thing I've ever eaten and I'm not allowed to say so.
+ [Say goodbye]
    -> bye
- -> menu
= bye
oda: Mind the river, love.
->->

=== talk_kids_mill ===
{ seen_kids != phase:
    ~ seen_kids = phase
    pip/surprised: I'm on my THIRD cocoa.
    juno: Second. She's lying.
- else:
    juno: Hi again.
}
- (menu)
* [Ask Juno what she's counting]
    juno: Cups. There are forty. Thirty-nine are being used. One is in Pip.
    pip/laughing: It's IN me.
* [Ask Pip about the wheel]
    pip/happy: It goes round and round and it NEVER STOPS.
    juno: It stops if the river stops.
    pip: The river never stops.
* [Ask when their mum's coming]
    juno: She's on nights. She'll pick us up from Wren's in the morning.
    pip/tired: I'm not tired.
+ [Say goodbye]
    -> bye
- -> menu
= bye
pip/happy: BYE!
->->

=== talk_iris ===
{ seen_iris != phase:
    ~ seen_iris = phase
    iris/warm: Hello. You're the friend. The chipped-cup friend.
- else:
    iris: Hello again.
}
- (menu)
* [Ask what she thinks of the tea room]
    iris: Honestly? I came to talk Ash out of it.
    iris/warm: It's rather good tea. Don't tell anyone in the city.
* [Ask about Ash's gran]
    iris: My mother. Mae. She ran that cart for forty years and I spent the whole time trying to get her to sell it.
    iris/sad: Ash is so like her it frightens me a little.
* {gave_in} [Ask if she'd help Ash out, too]
    iris/surprised: Me? Behind a counter?
    iris: ...I could send a proper coffee machine. That's helping, isn't it?
+ [Say goodbye]
    -> bye
- -> menu
= bye
iris: Lovely to meet you, dear.
->->

// ---------------------------------------------------------------------------
// Chapter five: the first snow. A night you can't fix, got through without
// making it worse: comfort for the senses, something to do, and not chasing
// news that isn't coming. (DBT: distress tolerance: self-soothe and
// distracting. Player-facing text never names these.)

=== start_snow ===
// Entry point for "jump to chapter five" on the title screen.
~ completeness = "full"
-> snow

=== snow ===
Chapter five: The first snow. #event: chapter 5
Two months later. It starts snowing at lunchtime and doesn't stop. By sunset the lane is knee-deep and silent. #event: prop on:nell_snow
There's a knock at your door. Oda, white to the eyebrows, with Pip and Juno in their coats.
oda/worried: Pipes froze at the bakery, love. Wren did her back in shoveling. And the Haddon road's shut.
oda: Hettie's on nights at the infirmary. She can't get back till the plough's through. Could they stay with you? Just till she's home?
+ ["Of course."]
+ ["Me? ...Yes. Of course."]
-
oda/warm: Bless you. I've got to keep the oven going or there's no bread tomorrow for anyone.
pip/scared: Is Mum stuck?
oda: She's warm and safe at the infirmary, pet. She'll come when the road's open.
juno: When is that?
Oda doesn't know. Nobody does. #event: worry
-> snow_evening

=== snow_evening ===
~ phase = "snow"
- (hub)
+ {seen_kids != phase} [Talk to the kids #talk: pip #new]
    -> talk_kids_snow -> hub
+ {seen_kids == phase} [Talk to the kids #talk: pip]
    -> talk_kids_snow -> hub
+ {seen_bakers != phase} [Talk to Oda #talk: oda #new]
    -> talk_oda_snow -> hub
+ {seen_bakers == phase} [Talk to Oda #talk: oda]
    -> talk_oda_snow -> hub
+ {seen_nell != phase} [Talk to Nell #talk: nell #new]
    -> talk_nell_snow -> hub
+ {seen_nell == phase} [Talk to Nell #talk: nell]
    -> talk_nell_snow -> hub
+ {not cleared_path} [Dig out Nell's step #use: nell_path]
    -> clear_path -> hub
+ [Take the kids inside #use: front_door] -> indoors

=== clear_path ===
~ cleared_path = true
You find a shovel and dig out Nell's step, one heavy scoop at a time. Pip helps by throwing snow at Juno. #event: prop off:nell_snow
It takes twenty minutes. For twenty minutes you don't think about the road at all. #event: soothe busy
nell/warm: Well. Look at that. I can get down my own front step.
{ not has_quilt:
    nell: Here. Take this. My mother made it. It's kept a lot of children warm in a lot of snow.
    She hands you a patchwork quilt, folded small and heavier than it looks.
    ~ has_quilt = true
}
->->

=== indoors ===
You bring the kids in and shut the door on the snow. #event: go home #event: place oda:off
The house is warm. The stove's going. #event: prop on:stove_fire
Then the lights flicker, and go out. #event: nightfall
pip/scared: The LIGHTS.
juno/worried: The phone's not working either. I checked.
You light three candles and stand them on the side table. #event: prop on:candles
So that's that. No lights, no phone, no news, and a long night until the plough comes.
-> night

=== night ===
~ phase = "snow_night"
- (hub)
{ hour >= 3 && not kids_asleep: -> kids_sleep }
{ hour >= 6: -> dawn }
{ hour > 0:
    { hour:
    - 1: It's nine o'clock. The snow's still coming down.
    - 2: Ten o'clock. The candles are a little shorter.
    - 3: Eleven.
    - 4: Midnight. The house ticks as it cools.
    - else: Two in the morning. Somewhere out there, a road.
    }
}
+ {not kids_asleep && seen_kids != phase} [Talk to the kids #talk: pip #new]
    -> talk_kids_night -> hub
+ {not kids_asleep && seen_kids == phase} [Talk to the kids #talk: pip]
    -> talk_kids_night -> hub
+ [Look out of the window at the road #use: window]
    -> check_road -> next
+ {not warmed} [Sit close to the stove #use: stove]
    -> by_stove -> next
+ {not had_milk} [Warm some milk on the stove, with honey #use: kettle]
    -> warm_milk -> next
+ {not played_music} [Wind up the music box #use: music_box]
    -> music -> next
+ {not kids_asleep && not made_snowflakes} [Make paper snowflakes with the kids #use: craft_table]
    -> snowflakes -> next
+ {kids_asleep && not made_toast} [Make toast for when they wake up #use: craft_table]
    -> toast -> next
= next
~ hour++
#event: worry
-> hub

=== check_road ===
~ checks++
{ checks:
- 1: You wipe a circle in the frost and look out. The lane is white. The road at the end of it is white. No lights.
- 2: You look again. Still white. Still no lights. For a second it's a relief just to know. Then the not-knowing comes straight back.
- 3: You look again. Nothing has changed, except you're more wound up than before you looked.
- else: You look again. White. Dark. The pull to look again is stronger every time.
}
#event: check
{ not kids_asleep && checks >= 2:
    juno/worried: Can you see her? Is she coming?
    You shake your head. Juno goes to the window and looks too.
}
->->

=== by_stove ===
~ warmed = true
You sit right up against the stove, close enough that your knees go hot. #event: face you:warm
{ not kids_asleep:
    Pip and Juno squash in on either side. Three of you, and the heat, and the little window of fire.
- else:
    You hold your hands out to it. The heat goes all the way up your arms.
}
For a few minutes, your whole body is just warm. #event: soothe comfort
->->

=== warm_milk ===
~ had_milk = true
You heat milk in the small pan on top of the stove, with a spoon of honey in each cup.
{ not kids_asleep:
    pip/happy: It's got a SKIN on it.
    juno: That's the best bit.
}
It's sweet and too hot and exactly right. #event: soothe comfort
->->

=== music ===
~ played_music = true
You wind the music box. It was your grandmother's, or someone's grandmother's. It plays a tune nobody can name, slightly too slow.
{ not kids_asleep:
    Pip lies on the rug and conducts it with both hands. Juno counts the notes under her breath.
}
For as long as it plays, the room is just the tune and the candles. #event: soothe comfort
->->

=== snowflakes ===
~ made_snowflakes = true
You get out paper and scissors. You show them the trick: fold, fold, fold again, cut, unfold.
pip/surprised: It's a SNOWFLAKE. I made a SNOWFLAKE.
juno: Mine's got eight sides. Real ones have six.
You tape them all over the window, until you can hardly see the road. #event: prop on:snowflakes
Nobody looks at the road for a whole hour. #event: soothe busy
->->

=== toast ===
~ made_toast = true
You make toast on a fork at the stove, a stack of it, for when they wake up. You butter every piece right to the edges. #event: prop on:toast
It's something to do with your hands, and somebody will be glad of it. #event: soothe busy
->->

=== kids_sleep ===
~ kids_asleep = true
Somewhere around eleven, Pip falls asleep mid-sentence, and Juno a minute after, both in a heap on the rug. #event: place pip:off #event: place juno:off
{ has_quilt:
    You tuck Nell's quilt over the two of them. Only their ears stick out. #event: prop on:quilt
- else:
    You put every blanket in the house over them. Only their ears stick out. #event: prop on:quilt
}
Now it's just you, and the candles, and the snow, and a road you can't see. #event: worry
-> night

=== dawn ===
Somewhere after four, you must close your eyes.
You open them to grey light, and a rumble at the end of the lane. #event: morning
Through the snowflakes on the window, two yellow lights. The plough. And behind it, someone running.
-> meet_hettie

=== meet_hettie ===
You open the door. #event: go lane #event: prop on:plough #event: prop off:candles #event: place pip:920 #event: place juno:970 #event: place oda:1240
The kids are past you before you can say anything, still in socks, into the snow.
pip/happy: MUM!
hettie/sad: Oh, my loves. Oh. I'm so sorry. I tried. I sat by the door all night.
hettie/warm: Look at you. You're warm. You're fine.
juno: We were fine.
{ made_snowflakes:
    pip/happy: We made SNOWFLAKES. They're on the window. Mine's the wonky one.
}
{ played_music:
    juno: There was a music box. It plays too slow.
}
{ checks >= 3:
    juno: We kept looking out the window for you. I looked eleven times.
}
-> morning_hub

=== morning_hub ===
~ phase = "snow_dawn"
- (hub)
+ {seen_hettie != phase} [Talk to Hettie #talk: hettie #new]
    -> talk_hettie -> hub
+ {seen_hettie == phase} [Talk to Hettie #talk: hettie]
    -> talk_hettie -> hub
+ {seen_kids != phase} [Talk to the kids #talk: pip #new]
    -> talk_kids_snow -> hub
+ {seen_kids == phase} [Talk to the kids #talk: pip]
    -> talk_kids_snow -> hub
+ {seen_nell != phase} [Talk to Nell #talk: nell #new]
    -> talk_nell_snow -> hub
+ {seen_nell == phase} [Talk to Nell #talk: nell]
    -> talk_nell_snow -> hub
+ {seen_bakers != phase} [Talk to Oda #talk: oda #new]
    -> talk_oda_snow -> hub
+ {seen_bakers == phase} [Talk to Oda #talk: oda]
    -> talk_oda_snow -> hub
+ [Go back inside and sleep #use: front_door] -> chapter_five_done

=== chapter_five_done ===
~ next_chapter = 6
You go inside, push the quilt aside, and sleep on the rug in your coat until lunchtime.
Chapter five is done. #scene: save
+ [·] -> coast

// --- Chapter five conversations ----------------------------------------------

=== talk_kids_snow ===
{ seen_kids != phase:
    ~ seen_kids = phase
    { phase:
    - "snow": pip/surprised: Is it a BLIZZARD? Is this a real blizzard?
    - else: pip/happy: Mum's HERE.
    }
- else:
    juno: Hi.
}
- (menu)
* {phase == "snow"} [Ask Juno what she's counting]
    juno: Flakes. On my sleeve. I'm at a hundred and four.
    juno/worried: It's a lot quieter than when it's loud. But it's still a lot.
* {phase == "snow"} [Ask Pip if she's cold]
    pip: My TOES are cold. The rest of me is FINE.
* {phase == "snow_dawn"} [Ask Pip how the night was]
    { made_snowflakes || played_music:
        pip/happy: It was the best night EVER. Can it snow again tomorrow?
    - else:
        pip/tired: Long. I kept thinking about Mum. Then I fell asleep.
    }
* {phase == "snow_dawn"} [Ask Juno how many hours it was]
    juno: Eleven. I counted till I fell asleep, then I guessed.
+ [Say goodbye]
    -> bye
- -> menu
= bye
pip/happy: BYE!
->->

=== talk_kids_night ===
{ seen_kids != phase:
    ~ seen_kids = phase
    juno/worried: It's very dark. Is that normal?
- else:
    pip: Hi.
}
- (menu)
* [Ask Pip what's wrong]
    pip/scared: What if Mum's stuck FOREVER? What if the snow never stops?
    ** ["She'll definitely be here by morning."]
        juno: You don't know that.
        pip/worried: ...Do you know that?
        You don't. Pip can tell.
        ~ promised = true
    ** ["I don't know when. I know she's trying to get here. And we're okay, here, together."]
        pip/sad: ...Okay.
        pip: Can I sit next to you, though?
        She sits so close she's practically on your lap. #event: soothe comfort
    ** ["Let's not think about it right now. Want to do something?"]
        pip: ...Okay. Something good.
    --
* [Ask Juno what she's counting]
    juno: Candles. Three. Hours. Two. Times Pip asked about Mum. Nine.
    ** ["Want to count something together?"]
        juno: Flakes on the window. You do left, I do right.
        You count until you both lose count, and then you count again. #event: soothe busy
    ** ["That's a good count."]
        juno: I know.
    --
* [Ask them what their mum's like]
    juno: She sings in the car. Badly. She always smells of the hand soap at work.
    pip/happy: She does the voices when she reads. ALL the voices.
    For a minute they're just telling you about her, not waiting for her.
+ [Say goodbye]
    -> bye
- -> menu
= bye
juno: Okay.
->->

=== talk_oda_snow ===
{ seen_bakers != phase:
    ~ seen_bakers = phase
    { phase:
    - "snow": oda/worried: I'll be back first thing with bread. If there's bread.
    - else: oda/happy: Ovens are back on! Here. Rolls. Still warm.
    }
- else:
    oda: Still here, love.
}
- (menu)
* {phase == "snow"} [Ask how Wren is]
    oda: Flat on her back on the kitchen floor, telling me how to shovel.
    oda/laughing: She asked me to help her up. Out loud. I'm counting that as progress.
* {phase == "snow_dawn"} [Ask how the night went at the bakery]
    oda/tired: Kept the fire in all night. Didn't sleep. Got the dough proved, though.
    oda/warm: Looks like you didn't sleep either.
+ [Say goodbye]
    -> bye
- -> menu
= bye
oda: Mind the ice, love.
->->

=== talk_nell_snow ===
{ seen_nell != phase:
    ~ seen_nell = phase
    { phase:
    - "snow":
        { cleared_path:
            nell/warm: Come and stand on a clear step a minute. Luxury.
        - else:
            nell: I came out for the post and now I can't get past that drift. Stuck on my own step, at my age.
        }
    - else: nell/happy: Morning! Path's still clear, thanks to someone.
    }
- else:
    nell: Still here.
}
- (menu)
* {phase == "snow"} [Ask if she's all right in the snow]
    nell: I've got a stove, a kettle and sixty years of practice. Snow like this, you stay in. You don't fight it.
    nell/warm: The hard part's the waiting. You can't hurry a road.
* {phase == "snow"} [Ask what she used to do on long snow nights]
    nell: Wil used to read to me. Out loud, the whole of whatever we had.
    nell: After he went, I'd do the wages in my head. Every family, every Friday. It gave the night somewhere to go.
* {phase == "snow_dawn"} [Ask how she slept]
    nell/laughing: Like a stone. I'm eighty-four. I've stopped waiting up for anything.
+ [Say goodbye]
    -> bye
- -> menu
= bye
nell: Mind the ice.
->->

=== talk_hettie ===
{ seen_hettie != phase:
    ~ seen_hettie = phase
    hettie/tired: Thank you. I sat by the door at the infirmary all night with my coat on. Every time a car came past I thought it was the plough.
- else:
    hettie: Hello again.
}
- (menu)
* [Ask how her night was]
    hettie/sad: Long. I couldn't do anything. I'm a nurse. I'm supposed to be able to do something.
    hettie: In the end I made tea for the night porter and did a crossword I already knew the answers to. It helped, a bit.
* [Tell her how the night went]
    { made_snowflakes:
        You tell her about the snowflakes, and the music box, and Pip conducting.
        hettie/warm: Snowflakes. She's going to want to do that every night now.
    - else:
        You tell her about the candles, and the waiting, and the kids falling asleep in a heap.
        hettie/warm: Asleep in a heap. That's my two.
    }
    { promised:
        pip: You SAID she'd be here by morning. And she WAS.
        hettie: Just about.
    }
* [Ask how she got here]
    hettie: Rode in the plough. The driver let me sit on a bag of grit.
    hettie/laughing: I've never been so glad to see a bag of grit.
+ [Say goodbye]
    -> bye
- -> menu
= bye
hettie: Thank you. Really.
->->

// ---------------------------------------------------------------------------
// Chapter six: the tide. Something is gone and can't be got back. Fighting
// that it happened hurts more than the loss; letting it be true lets you move.
// (DBT: radical acceptance, turning the mind, willing hands. Player-facing text
// never names these. CLINICIAN REVIEW: accepting is not approving, or giving up.)

=== start_coast ===
// Entry point for "jump to chapter six" on the title screen.
~ completeness = "full"
~ tobin_offer = true
-> coast

=== coast ===
Chapter six: The tide. #event: chapter 6
Early spring. A letter came from Hesketh, in his tiny careful writing. #event: prop on:crate #event: prop on:sandbags
"The March storm brought the sea into my shed. Most of the moulds are gone. Come and take what's left before the spring tide. I can't lift it any more."
Tobin read it twice and asked you to come with him to Saltmouth, where he grew up. His dad meets you on the quay.
fen/laughing: There he is! Back to see the sea that ate Hesketh's shed! Ha!
tobin/embarrassed: Hi, Dad.
fen/happy: And you brought a friend. Good. Someone to carry things. Ha!
-> coast_hub

=== coast_hub ===
~ phase = "coast"
- (hub)
+ {seen_fen != phase} [Talk to Fen #talk: fen #new]
    -> talk_fen -> hub
+ {seen_fen == phase} [Talk to Fen #talk: fen]
    -> talk_fen -> hub
+ {seen_tobin != phase} [Talk to Tobin #talk: tobin #new]
    -> talk_tobin_coast -> hub
+ {seen_tobin == phase} [Talk to Tobin #talk: tobin]
    -> talk_tobin_coast -> hub
+ {seen_hesketh != phase} [Talk to Hesketh #talk: hesketh #new]
    -> talk_hesketh -> hub
+ {seen_hesketh == phase} [Talk to Hesketh #talk: hesketh]
    -> talk_hesketh -> hub
+ {seen_hesketh == phase} [Go into the shed before the tide turns #use: shed] -> into_shed

=== into_shed ===
Inside, the shed smells of salt and wet wood. There's a dark line across every wall, higher than your knees, where the sea came in. #event: go shed
All along the back wall are empty hooks, dozens of them, each with a pale shape on the wood where a mould used to hang. #event: grief
tobin/sad: Forty years of moulds. Every lantern on Lantern Lane came off these hooks.
hesketh: The tide's on the turn. It'll be back in this floor in a few minutes. Take what you can.
Water's already sliding in under the door. #event: place tobin:off #event: place hesketh:12760
Carry out what you can before the water reaches it. #scene: tide
+ [·] -> after_tide

=== after_tide ===
The tide comes in, slow and grey, and fills the shed to the line on the wall. Then it stops, the way it always does. #event: place tobin:12650 #event: place hesketh:12740
{ saved_count:
- 0: Nothing came out of the shed. The crate is empty.
- 1: One thing is in the crate. Everything else is under the water.
- 5: Everything from the shelves is in the crate, dripping.
- else: {saved_count} things are in the crate, dripping. The rest are under the water.
}
{ fought >= 3:
    Your arms are shaking from the sandbags. The water came in around them anyway, the way water does.
}
tobin/sad: It's gone. All of it. The first moulds Hesketh ever made.
Fen comes down the shingle with a flask. #event: place fen:12560
fen/laughing: Well! Lighter to carry home! Ha!
tobin/upset: Dad. Can you NOT. Just once. #event: face fen:surprised
Fen stops. For once he doesn't say anything.
-> stay_with_it

=== stay_with_it ===
Everyone's looking at the water. Somebody has to say something, and it's you.
+ ["It shouldn't have happened. It's not fair."]
    ~ argued++
    It's true. It isn't fair. Saying it doesn't move the water an inch. #event: fight
    tobin/upset: Forty years. It SHOULDN'T have.
    The two of you stand there being right about it, and the water stays exactly where it is. #event: fight
    -> stay_with_it
+ ["It's gone. That's awful. And it's gone."]
    -> it_is
+ [Say nothing. Let your hands open on your knees, and breathe out]
    ~ open_hands = true
    You sit down on the wet step and let your hands lie open, palms up, on your knees. You breathe out, long. #event: face you:sad
    It's gone. You don't have to like it. It's just true. #event: accept
    -> it_is

= it_is
{ argued >= 2:
    You notice you've said "it shouldn't have" twice now. You let it go, and look at what's actually in front of you instead.
}
tobin/sad: ...It's gone.
Tobin says it like it's the first time it's been true. His shoulders come down an inch. #event: accept
hesketh: Sixty years I argued with the sea. Lost every single time.
hesketh/warm: Then one winter I stopped arguing and started building higher shelves.
hesketh: Doesn't mean I like it. Means I stopped spending my days on a fight I'd already lost.
fen/sad: When the boats came back empty, I joked. When your mum cried, I joked. I couldn't stand still in it.
fen: I'm sorry, lad.
tobin/sad: I do that. I do it all the time.
fen/warm: I know. Where do you think you got it?
For a while nobody jokes, and nobody fixes anything, and the tide just sits there, full.
-> dusk

=== dusk ===
The tide goes out again, as it always does. By evening the shed floor is wet sand and seaweed. #event: sunset #event: go coast #event: face you:neutral #event: place fen:11860 #event: place tobin:11960 #event: place hesketh:12240
{ saved_red:
    tobin: The red mould. The one Hesketh made the first red lantern with. It's dented, but it's there.
    Hesketh and Tobin make one lantern from it, there and then, on the kitchen table in Fen's cottage. Red paper, a little crooked.
- else:
    { saved_notebooks:
        tobin: The notebooks have all the measurements. Every mould. We can make new ones.
        hesketh/warm: You can. I'll watch and tell you you're doing it wrong.
    - else:
        hesketh: I've the measurements in my head still. Most of them. We'll make new ones.
    }
    Hesketh and Tobin make one lantern without a mould, there and then, on the kitchen table in Fen's cottage. Red paper, very crooked.
}
-> dusk_hub

=== dusk_hub ===
~ phase = "coast_dusk"
- (hub)
+ {seen_fen != phase} [Talk to Fen #talk: fen #new]
    -> talk_fen -> hub
+ {seen_fen == phase} [Talk to Fen #talk: fen]
    -> talk_fen -> hub
+ {seen_tobin != phase} [Talk to Tobin #talk: tobin #new]
    -> talk_tobin_coast -> hub
+ {seen_tobin == phase} [Talk to Tobin #talk: tobin]
    -> talk_tobin_coast -> hub
+ {seen_hesketh != phase} [Talk to Hesketh #talk: hesketh #new]
    -> talk_hesketh -> hub
+ {seen_hesketh == phase} [Talk to Hesketh #talk: hesketh]
    -> talk_hesketh -> hub
+ [Hang the new lantern on the harbour wall #use: harbour_wall] -> last_lantern

=== last_lantern ===
You hang the new lantern on the hook at the end of the harbour wall, and Tobin lights it. #event: prop on:harbour_lantern
It isn't any of the old ones. It's the first of the new ones.
fen/warm: Look at it, though. Look at it.
tobin/warm: Next festival, the twelfth one on the string is this one. Crooked.
hesketh/happy: The sea takes. You make another. That's the whole trade.
-> ending

// --- Chapter six conversations ------------------------------------------------

=== talk_fen ===
{ seen_fen != phase:
    ~ seen_fen = phase
    { phase:
    - "coast": fen/laughing: Mind the nets! And the gulls! And my boat, she bites! Ha!
    - else: fen/warm: Look at the light on the water. Never gets old.
    }
- else:
    fen: Back again? Ha.
}
- (menu)
* {phase == "coast"} [Ask about his boat]
    fen/happy: The Marigold. Older than Tobin, better behaved. Ha!
    fen: Forty years on the water. She's the only thing that's never once laughed at my jokes.
* {phase == "coast"} [Ask what Tobin was like as a kid]
    fen/laughing: Fell in the harbour twice a week. Came up laughing every time.
    fen: ...Came up laughing. Yeah. That was me, too.
* {phase == "coast_dusk"} [Ask how he's doing]
    fen/sad: Not great. Honestly. That's the first time I've said that in about thirty years.
    fen/warm: Feels odd. Not bad. Odd.
* {phase == "coast_dusk"} [Ask about the empty years]
    fen: Three winters the fish didn't come. We nearly lost the house. I made a joke out of every bill.
    fen: Tobin's mum did the crying for both of us. Not fair on her.
+ [Say goodbye]
    -> bye
- -> menu
= bye
fen: Mind the gulls!
->->

=== talk_tobin_coast ===
{ seen_tobin != phase:
    ~ seen_tobin = phase
    { phase:
    - "coast": tobin/worried: It smells exactly the same here. Fish and tar. Ha. Sorry. I'm doing it.
    - else: tobin/warm: First lantern of the new lot.
    }
- else:
    tobin: Hey.
}
- (menu)
* {phase == "coast"} [Ask how he feels about being back]
    tobin: Weird. Everyone here still thinks of me as the kid who fell in the harbour.
    tobin/embarrassed: Which I did. A lot.
* {phase == "coast"} [Ask what's in the shed]
    tobin/worried: Everything Hesketh ever made, near enough. The first moulds. Notebooks. He kept a photo of us on the shelf, from my first week.
    tobin: The letter says most of it's gone. I keep picturing it like it was.
* {phase == "coast_dusk"} [Ask about his dad]
    tobin/sad: He said sorry. He's never said sorry. He made a joke straight after, but it was a small one.
    tobin/warm: I didn't mind that one.
* {phase == "coast_dusk"} [Ask what happens to the workshop now]
    tobin: New moulds. New lanterns. Old ones in the notebooks, maybe. Crooked ones, definitely.
    tobin/laughing: I'm keeping the crooked ones. That's my thing now.
+ [Say goodbye]
    -> bye
- -> menu
= bye
tobin: Mind the shingle.
->->

=== talk_hesketh ===
{ seen_hesketh != phase:
    ~ seen_hesketh = phase
    { phase:
    - "coast": hesketh/warm: You'll be the friend from the festival. Tobin writes about you. Mind your feet. The sea's been in.
    - else: hesketh: Sit, if you like. The wall's dry now.
    }
- else:
    hesketh: Still here. Not going far, at my age.
}
- (menu)
* {phase == "coast"} [Ask what was in the shed]
    hesketh: The first moulds I ever made, forty years back, when Rosa asked me to give the village lanterns of its own. Then all the others.
    hesketh/sad: I moved them up a shelf in the autumn. The sea came up two.
* {phase == "coast"} [Ask how he's taking it]
    hesketh: I was angry for a week. Then I was angry at being angry, which is a waste of a good week.
    hesketh/warm: I'm eighty-six. I don't have many spare weeks.
* {phase == "coast_dusk"} [Ask how he stopped arguing with the sea]
    hesketh: Practice. You say "it's gone" and some part of you says "but it shouldn't be." So you say "it's gone" again. And again. Every time you catch yourself.
    hesketh/warm: Like turning a boat. You don't do it once. You keep leaning on the tiller.
* {phase == "coast_dusk" && told_nell} [Tell him Nell knows about Rosa's lantern now]
    hesketh/surprised: Nell knows? After sixty years?
    hesketh/warm: Rosa made me promise not to say. I'm glad somebody else broke it. I'm too old to break promises. I don't have the knees.
+ [Say goodbye]
    -> bye
- -> menu
= bye
hesketh: Go carefully.
->->
