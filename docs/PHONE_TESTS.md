# What to test on the phone

Run `npm run dev`, open the `Network` URL in Chrome on the phone (same Wi-Fi), portrait.
Or install the debug APK (see README → Android).

## M1 — Scaffold and movement
- Put your thumb anywhere on the left 60% of the screen: a joystick appears there; Zampanò walks
  in the exact on-screen direction you push (up = up the screen). Push all the way to run.
- Walk behind a tree: the tree turns semi-transparent. Camera follows with a slight lag and sway.
- No pinch-zoom, no page scroll, no long-press menu. Text and pixels look crisp (not blurry).

## M2 — Core loop and HUD
- Walk up the main gravel road: a bone every two or three steps all the way to the exit; plenty
  more out on the side lanes, spread over every loop and the quiet lane along the west and south
  edges (88 in all).
- Half way: voices from off-screen ("HE'S COMING!", "GET READY!"), then a big NOW! fills the screen
  and Bagnaskiz, Jack and Watson rush in from the sides, frighten Zampanò, poop around him, run off.
- Eat bones: TREATS goes up, the hunger bar refills; after ~4 bones a poop bubble appears, then a
  poop: try doing it on the path (big brown stain) vs. in a bush/tall grass (tiny stain).
- Press PEE on a stain: the area turns green again; next to a tree/pole/bush you get "MARKING!".
- Watch the stars drop in half steps when the park gets dirty; let the hunger run out (−1 life).
- Walk into a puddle or next to a fountain with missing pee charges: they refill.

## M3 — Scenes
- Title (glitch entrance, disco lights: coloured beams sweeping, mirror-ball specks, a flash on
  every beat of the title music once it plays after the first tap) → tap → briefing → tap → play. MENU (top right): resume, restart,
  sound, music, sounds, quit. Switch app / lock the screen during play: it comes back paused.
- Reach the EXIT flag (top of the map): stars pop one by one, bonuses, NEXT/RETRY; best score
  shows on the title. Starve twice → GAME OVER → RETRY.

## M4 — Threats and bonuses
- Cats run away around trees: run to catch them (+5 coins); BARK at a cat makes it freeze.
- A tennis ball pulls you in (pulsing rings): walk away and it wins, run away and you escape.
  Touching it = 2 s fetch, +5 s on the timer.
- Past halfway (or with a dirty park): "GREEN ZONE UNDER ATTACK", brown/glitchy world, Bagnaskiz
  the pug dirties the grass. Face him and BARK 3 times; then pee until the alarm stops.

## M5 — Polish
- Sound starts after the first tap: barks, pee, poop, treats, alarm, stars, game over, music.
  Check the SOUND, MUSIC and SOUNDS items in the pause menu and in OPTIONS (saved across
  restarts): MUSIC changes only the music, SOUNDS only the effects (with a click at the new
  level), OFF silences each alone, SOUND: OFF silences both.
- Feel: shake on poop/hits, squash on eating, dust when running, leaves in bushes, splashes.
- Balance: a full walk should take 2–3 minutes and you should need several treats.

## M6 — Android
- Install the APK: fullscreen (no status/navigation bar; swipe to peek), portrait locked, screen
  stays on, launcher icon is Zampanò's face.
- Hardware Back during play opens the pause menu, Back again resumes. Home → return: paused.
- Check 60 fps feel while running through the forest edges and during the attack effect.

## VG1 — Story mode
- Title → STORY → BEGIN THE DREAM. Level card, then each sub-level card ("what happens" +
  source). Tap advances dialogue (a first tap finishes the typewriter). MENU pauses: resume,
  restart, skip, Meraviglia book, sound, quit.
- **1.1** pastel Jerusalem in armour, walk to the city: it never gets closer; the slap wakes him.
  **1.2** pick up the memory shards falling from the Professor's sentences (they unlock levels in
  the story menu). **1.3** cross the lawn unseen (cones turn red when they see you; bushes hide you)
  or pay the toll. **1.4** every option is wrong. **1.5** the rag cross.
- **2.x** dark wood (evade the beasts), falcon chase + flying stag, the preacher (BARK = preach,
  spends Commozione), Fortune's wheel.
- **3.1** wonder hunt (LOOK at sparkles; MARVEL popups fill the book). **3.3** weeping rhythm.
  **3.4** stealth: listen at the barons' tent for 6 s without being seen.
- **4.1** parade rhythm, **4.2** calm rescue, **4.3–4.5** black holes (purple cards, one value each).
- **5.2** ladders rehearsal, **5.4** the letter (pick euphemisms), **6.1** catapult (tap at the right
  power), **6.2** put the rumour in order, **6.4** thirst march: the lake moves away when you get
  close.
- **7.3 the vanguard (key test)**: walk at the usurper with the joystick at *walking* tilt. Full
  tilt = "DO NOT CHARGE", pulling back = "DO NOT TURN BACK", standing still also drains the NERVE
  bar; if it empties the line breaks and you restart. Sbrimbrulon and the count walk beside you.
- **7.4** sightseeing, then a fire spreads: run to the far corner. **7.5** sneak past a flailing
  emperor (no running). **7.6** walk in, speak, walk out — running restarts you. **7.7** mash to hold
  Confusione back (you are meant to lose), then follow him through the hole.
- **7.8 decides the ending**: BARK three times at Jack to make him let go (THE KNIGHT ending), or
  walk on to the pile (THE ALPHA-DOG). Then JERUSALEM / LOADING… never loads.
- **8.1** scrambled controls in a shattered dream with a hound behind you; they settle near the
  end. **8.2** place the relics (one per marvel) and the altar. **8.3** the lawn vanguard without
  armour → YOU HAVE BEEN SUPERVILLAINED. **8.4** the right answer is greyed out. Then the
  Professor, the ending card, THE END.
- Close the app mid-level and reopen: STORY → CONTINUE resumes at the first unfinished sub-level.
- Medieval music in the dream, chip music in the Greenzone levels and the arcade.

## Playability and systems pass
- At the start of each dream scene a grey notice says "-2 COMMOZIONE: THE FEELING FADES". Looking
  at marvels and weeping on the beat fill it again.
- Big actions show their cost ("(-10 COMMOZIONE)"). With too little the option is grey with
  "TOO UNMOVED: NEEDS 10 COMMOZIONE" — try 4.4 (atone), 5.1 (speak up), 6.5, 6.6, 7.6. At 7.8 each
  bark at Jack costs 5.
- 7.3: with Standing below 45 the count of Saint-Pol keeps his distance; above 65 Flanders comes
  back beside you. The nerve bar drains less with more companions. 8.3: Watson crosses the lawn to
  you only with Standing 60+.
- 8.2: the altar card depends on Grace (glows / crooked / chew toys); the ending card has a Grace
  line and a Standing line.
- Ladders (5.2, 7.2) are longer now: tapping faster than about 8 per second does not help.
- 2.1: CHECKPOINT notices; being caught sends you back to the last one.
- Pause → TEXT: NORMAL/FAST/INSTANT/SLOW changes the dialogue speed (kept after restarting the app).
- Story menu → a level → its scene list: finished scenes in cyan can be replayed; the card says
  REPLAY and your meters/book do not change afterwards.
- Book (pause → MERAVIGLIA BOOK): icons per section, AT HOME first, no heading alone at the bottom
  of a page.
