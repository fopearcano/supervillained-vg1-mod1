# Decisions log

Short entries, newest milestone at the bottom. Anything that deviates from or extends `SPEC.md` is here.

## Plan (before M1)

- **Rendering**: PixiJS v8 forced to WebGL (`preference: 'webgl'`), used only as a sprite/graphics
  library. Pixi's ticker is off (`autoStart: false`); our own fixed-timestep loop calls
  `renderer.render()`.
- **Pixel-perfect**: the canvas backing store *is* the logical resolution (≈216 px wide, height
  follows the screen). The browser upscales it by an **integer** factor with `image-rendering: pixelated`.
  `core/display.ts` picks the factor; wide desktop windows are pillarboxed to a portrait aspect.
- **Loop**: 60 Hz fixed logic step with an accumulator, render interpolation via `prev*` positions.
- **Scenes**: a stack (`core/scene.ts`); overlays such as Pause are pushed over the game.
- **Systems**: small classes with pure logic (tested with Vitest); entities own their Pixi views.
  No ECS.

## M1 — Scaffold and movement

- **Dependencies**: runtime = `pixi.js` only. Dev = `typescript`, `vite`, `vitest`, `playwright`
  (pinned to 1.63 to match the browsers preinstalled in the dev container).
- **Font**: Press Start 2P (OFL) taken from the `@fontsource/press-start-2p` npm tarball and committed
  as `src/assets/fonts/PressStart2P.woff2` + `OFL.txt` — bundled by Vite, no runtime CDN and no
  npm dependency.
- **Pixel text**: `ui/pixelText.ts` bakes text into a small canvas texture. Glyphs are rendered once
  at 8 px and **thresholded to 1-bit alpha** (`ui/pixelFont.ts`), so text is crisp at any integer
  scale. Effects (outline, glow, shadow, per-span colors, justified paragraphs) are drawn with
  pixel offsets. Re-rendered only when the text changes.
- **Iso conventions**: tile (i, j) covers grid [i, i+1) × [j, j+1); its top vertex is
  `gridToScreen(i, j)`. Diamond textures are rasterized by pixel-center test (`insideDiamond`), which
  tessellates with no gaps or overlaps (unit-tested).
- **Movement**: the joystick vector is screen space; `screenDirToGrid` is the inverse projection, so
  on-screen motion is exactly parallel to the stick. Speed is normalized in **grid units** (world
  speed is constant; moving vertically on screen looks slower in pixels, as perspective implies).
  Analog: light tilt = slow walk, past 82 % = run. Keyboard: walk by default, **Shift = run**
  (extension, the spec lists no run key).
- **Facing**: 8 directions defined on the ground plane as seen by the camera. Diagonals (NE, SE, ...)
  are the iso grid axes (≈26.6° from horizontal on screen). Sprites are generated for all 8.
- **Depth sorting**: by `gx + gy` of the contact point + small per-object bias, tie-break by `gx`
  then stable id (`iso/depth.ts`). Applied through `zIndex` of visible objects each frame.
  Occlusion fade: a tall object drawn after Zampanò whose sprite box overlaps his fades to 42 %.
- **Level format**: ASCII rows (= gy) × columns (= gx) + metadata in a TS file (`levels/level1.ts`).
  Legend extensions: `,` tall grass, `F` drinking fountain (`W` is a puddle), space = void.
  `loadLevel()` dispatches on `source.format`; `'tiled'` is reserved and throws for now. Every
  loader returns the same `LevelData` shape.
- **Level 1 layout**: 72×72 map, start at the bottom corner and exit at the top corner, so walking
  the path goes *up* the portrait screen; the path zig-zags left/right (~160 tiles ≈ 70 s of pure
  walking, 2–3 min with gameplay). Generated once with a throwaway script, then committed as plain
  ASCII — it is meant to be hand-edited from now on.
- **Bushes are walkable** (slower), so Zampanò can poop *in* bushes as the spec suggests. Trees,
  poles and fountains are solid circles; forest `#` and void are solid squares. Collision is done
  in grid space (circle vs squares/circles) with sliding.
- **Camera**: exponential follow + look-ahead + slight sinusoidal "handheld" sway, clamped to the
  walkable area plus a 4-tile margin. The clear color is dark forest green so map edges never show
  black.
- **Placeholder art**: drawn by a tiny software rasterizer (`assets/placeholders/pixel.ts`, writes
  into an `ImageData`), then packed into 1024-wide atlases so Pixi can batch everything. Characters
  use one parametric quadruped drawer for all 8 directions × 10 animations. Zampanò's frame is
  40×40 (the dog is ~30 px wide) — bigger than the 32 px minimum for readability on phones.
- **Debug hooks**: `window.__sv` (scene access, teleport, debug state) and `?debug=sprites&char=…`
  sprite viewer. `npm run screens` drives the game with Playwright for verification screenshots.

## M2 — Core loop and HUD

- **Zone health** is literally "clean playable tiles / playable tiles" (a tile is clean while its
  dirt < 0.3). Because Level 1 has ~1,700 playable tiles, the stars use a zoomed-in scale:
  80 % clean → 0 stars, 99.5 % → 5 stars (`ZONE` in config), **floored** to half stars so even
  one path poop is visible in the HUD.
- **Pollution**: poops stamp dirt with a radial falloff (max-blend, never additive). Footprint by
  surface: bush/tall grass = small, grass = medium, path = large. Unattended poops slowly
  **spread** (radius ×1.45 over 35 s) until a pee neutralizes the pile (+100 "CLEAN!").
- **Pee** spreads outward over its duration like paint (Splatoon-style), cleaning dirt and leaving
  a short "re-greened" highlight. Marking = a vertical object (tree/pole/bush/fountain) within
  ~1 tile: bigger radius, leg-lift, +150. With no charges the button just shows "EMPTY!".
- **Digestion**: the poop happens when the 3 s warning expires, but waits while Zampanò is busy
  (peeing, drinking) so actions never overlap. Overflow from extra treats carries over.
- **Drinking** is automatic when stepping on a puddle or next to a fountain and a charge is missing
  (short animation, 1.5 s cooldown).
- **Lives**: starving costs a life, refills hunger to 50 and gives 2 s of invulnerability.
- **Events**: gameplay emits typed events (`core/events.ts`); FX (and later audio) subscribe, so
  rules stay free of presentation code.
- **HUD**: drawn with crisp 1 px rects (no stroked shapes). Text uses a 1 px self-colored glow plus
  a dark drop shadow for readability over bright grass (a 2 px glow smeared the 8 px font).
  Radar is screen-aligned (dots are screen offsets), exit shown on the rim when out of range.

## M3 — Scenes

- **Flow** (`scenes/flow.ts`): the GameScene always sits at the bottom of the scene stack; Title,
  Briefing, Pause, Level End and Game Over are overlays pushed on top (the level stays visible
  underneath, as in the video). The Title blurs the frozen level (`BlurFilter`), the Briefing shows
  the HUD dimmed behind the rules text.
- **Glitch filter** written now (one custom GLSL filter: slices, RGB split, scanlines, sepia,
  flash) because the title needs a glitch entrance. Used full-screen for transitions and attached
  only while a transition plays. Note: uniforms shared with the vertex shader are declared `highp`
  in the fragment (precision mismatch otherwise breaks the program on some GPUs).
- **Briefing text** is the spec's sentences, one colored paragraph each (orange / green / red /
  cyan / yellow), fully justified *including* paragraph ends like the video, at 2x scale when it
  fits, else 1x.
- **Level end**: "GOOD BOY!" + stats, stars popping one by one, time bonus, star bonus, total;
  tap skips the animation. Final health applies the PEES < POOPS penalty before computing stars.
  With a single level, NEXT is replaced by TITLE (the flow already supports more levels).
- **Records**: per level best score, best stars and best time are kept independently; coins
  accumulate across runs (also on game over) for the future shop.
- **Auto-pause** on `visibilitychange` (hidden) and window `blur`. Esc / MENU toggle pause.
- Scene changes clear queued input so the key that confirmed a menu can't also trigger a pee.

## M4 — Threats and bonuses

- **Cats** sit until Zampanò is within 5 tiles, then flee: every 0.18 s they score 16 directions
  (moving away + momentum + open space ahead − blocked tiles) — simple, cheap, and they slide
  around trees. Cats run faster than Zampanò walks but slower than he runs; barking at a cat
  startles it (it freezes and hops for 0.8 s), which is the trick to catch one. +5 coins, +250.
- **Balls**: pull strength falls off with distance; walking can't escape near the ball, running
  can. Touching it starts a 2 s uncontrolled fetch run, −8 hunger and +5 s on the timer.
  A pulsing ring converging on the ball shows the magnet area.
- **Spawns** are timed per level (`spawns.cats/balls`: first, interval range, max) and placed
  4–8 tiles from Zampanò, preferably *ahead* on the walk (closer to the exit).
- **Under attack** (`AttackDirector`, pure logic): starts when health < 95 % (cooldown 25 s) or once
  at 55 % of the walk (scripted, level metadata). Ends only when Bagnaskiz has fled **and** health
  is back above the threshold (+0.4 % hysteresis); until then the HUD says "PEE TO HEAL THE ZONE!".
  Effect intensity = 0.35 + deficit / 8 % (capped at 1): sepia/brown palette shift, scanlines and
  random glitch bursts on the world layer only (HUD stays readable).
- **Bagnaskiz** retargets every 2.5 s to the cleanest spot near Zampanò (sampled), stamping a
  pollution trail every 0.22 s. Bumping into Zampanò knocks him back and costs 6 hunger. Barks hit
  when the wave reaches him (range 2.8 tiles, ±43° cone in the facing direction); 3 hits → he flees
  (+400) and fades out.
- The bark sound wave is drawn as three `)` arcs (ground-plane arcs projected to the iso view)
  travelling along the facing direction.

## M5 — Polish and balancing

- **Audio**: own sfxr-style synthesizer (`core/synth.ts`, pure and unit-tested). Every SFX is a
  recipe in `fx/sounds.ts`, rendered once into an `AudioBuffer` at 22 kHz on first use, then played
  as a buffer source (cheap on phones, no audio files). The music loop (8 bars, C–Am–F–G, square
  lead + triangle bass + noise hats) is rendered once after the first tap. The `AudioContext` is
  created/resumed on the first gesture (autoplay rules) and suspended in the background. Music is
  ducked during pause, "under attack" and the level end. Master volume (25/50/70/100 %) and mute
  are in the pause menu and saved.
- **Juice**: squash & stretch spring on Zampanò (treat, poop, bark, cat), screen shake (poop, hurt,
  bark, hit), geometric particles on treats, footstep dust when running, leaves in bushes/tall
  grass, splashes in puddles, HUD values blink when they change.
- **Marking bonus is paid once per object** (re-peeing the same tree is a normal pee), otherwise
  standing next to a tree and spamming PEE was the best strategy.
- **Level 1 rebuilt bigger (96×96)**: a bot showed the first map could be crossed in ~48 s by
  cutting across lawns. Any path that only goes "up" the screen has the same grid length
  (≈ 2 × map size), so the map grew instead. Shortest walk ≈ 75 s at walking speed; with treats,
  peeing, cats and the Bagnaskiz fight a run lands at 2–3 minutes. Par time 180 s.
- **Speeds** slightly lower (walk 2.2, run 3.8 tiles/s) — a Maltese is small, and the camera has
  more time to show what's ahead. Cats (3.1) and the magnet (3.2) sit between walk and run.
- **Hunger drain raised** (idle 0.9, walk 1.5, run 2.3 per second): walking straight to the exit
  without eating now starves, so treats (and therefore poops) are part of every run.
  `tests/balance.test.ts` runs a bot through Level 1 to keep these numbers honest.
- Bagnaskiz trail slightly thinner (radius 0.95, every 0.25 s): one attack now costs about one star
  if left alone instead of two.

## M6 — Android

- **Capacitor 8** (`@capacitor/core`, `@capacitor/android`, dev `@capacitor/cli`): the official,
  minimal way to ship the Vite build as an APK; no Capacitor plugins are used.
- `appId` is `com.zampano.supervillained` (placeholder: change it before publishing anywhere).
- **Portrait lock** in the manifest; **immersive fullscreen** and **keep screen on** in
  `MainActivity.java` with AndroidX `WindowInsetsControllerCompat` (bars reappear with a swipe).
  The display cutout is left in its default mode so the HUD never sits under a camera hole.
- **Back button** without the `@capacitor/app` plugin: an `OnBackPressedCallback` in
  `MainActivity` fires a `svback` window event; the game toggles the pause menu (ignored on title
  and result screens, so Back never kills a run by accident).
- **Icons and splash**: generated pixel-art Zampanò face (legacy, round and adaptive icons, black
  splash screens) by `scripts/gen-android-assets.mjs`, a dependency-free PNG writer.
- Verified in the dev container: `assembleDebug` succeeds with JDK 21 + SDK platform 36
  (≈4 MB APK, portrait, assets and font bundled).

## VG1 — The story campaign (from "Supervillained — VG1 implemented")

The PDF is a narrative design (8 levels, 42 sub-levels, characters, systems, sources). It says
itself that it "is not a playable build"; this phase turns it into one, on the same engine.

- **Two modes**: the title menu now offers **STORY** (the VG1 campaign, "The dream of the cross")
  and **ARCADE: GREEN ZONE** (the original SPEC level, unchanged and still tested by m1–m6).
- **Shared world**: the arcade `GameScene` was refactored around `world/world.ts` (map, map
  renderer, depth-sorted layers, camera, entities). Story stages use the same class, so movement,
  collision, occlusion, camera and art are identical in both modes.
- **Stages are ASCII maps** (`story/maps.ts`, 19 maps) parsed by the same parser with two options:
  `base` (ground under props/markers) and `requireExit: false`. Legend extensions: grounds `_` floor,
  `:` stone, `-` sand, `*` snow, `~` deep water (solid), `%` wall (solid), `^` dock, `+` carpet;
  props `C` column, `D` desk, `K` shelf, `H` house, `N` tent, `G` galley, `R` rock, `U` statue,
  `X` crate, `Y` palm, `A` altar, `M` stall, `O` throne, `V` vine, `Q` gate, `Z` bones, `L` table;
  digits `0–9` are script markers. Each map names a **theme** (palette swatches per ground/prop).
- **Look**: "pastel for the Jerusalem dreams, full colour for the Greek world" — each theme is a
  palette; level atlases are rebuilt per palette and the last two are kept (memory on phones).
- **Scripts are data**: a sub-level is an array of `Step`s (`story/steps.ts`: `say`, `ask`, `card`,
  `stage`, `move`, `walk`, `mini`, `branch`, `blackHoleIn/Out`, …) run by `StoryScene`. Steps can
  `interrupt` (caught by a guard, nerve broken) and `insert` (branches, runtime-built walks).
  Scripts are rebuilt on every play (closures hold per-run state).
- **Dream walk** (`story/walk.ts`): one configurable step covers reach / collect / wonder hunt /
  stealth (sight cones with line of sight; bushes hide) / chase / **pace** (7.3 and 8.3: a nerve
  meter replaces health; full stick = "do not charge", moving back = "do not turn back", standing
  still drains too; Supervillain full = "unshakeable", drains at 40 %) / **thirst** (6.4: the lake
  recedes whenever you get close) / **scramble** (8.1: controls rotate, then settle near the goal)
  / **fire** (7.4: spreading flames that push you back).
- **Mini-games** (`story/minigames/`): rhythm (3.3 weeping, 4.1 parade), ladders (5.2 rehearsal,
  7.2 real assault), calm rescue (4.2), toy catapult (6.1), tug of war meant to be lost (7.7),
  euphemism letter (5.4), rumour ordering (6.2). They hide the stage and draw their own screen.
- **Systems as rules** (`campaign/state.ts`, unit-tested): meters Commozione 20, Supervillain 10,
  Grace 70, Standing 50 (max 100). "An unmoved Zampanò cannot act": the preacher's sermon (2.3)
  spends Commozione. Forms: breaking a rule (dice, Friday meat) costs Grace even when absolved.
  Dissent costs Standing, never the level. The **Meraviglia book** (pause menu / story menu)
  lists meters, values, marvels, items, shards and the "remembered" line of each dream scene.
- **Unlocking**: level 1 is always open; a level opens when the previous one is complete *or* when
  its memory shard was picked up in the Professor's study (1.2). Progress is saved after every
  sub-level (localStorage key `story`).
- **Costumes**: plain → rag cross (1.5) → knight (2.5); the dream stages dress him with the best
  unlocked one, Greenzone stages (1.x, 8.x) in his own fur ("armour is costume").
- **Ending**: decided at 7.8 by doing, not by a menu — bark three times at Jack to enforce the oath
  ("no woman touched") or walk on to the common pile. `flags.oath === 'enforced'` → THE KNIGHT
  (Bagnaskiz turns in 8.3 and ends in the rest home); otherwise THE ALPHA-DOG (he steps aside and
  smiles: the offer stands). Both end with "YOU HAVE BEEN SUPERVILLAINED" and the 8.4 scene.
- **"The goal not reached"**: after 7.8 a JERUSALEM / LOADING… card never loads; 8.3 opens with the
  PDF's "We were going to Jerusalem … It was pastel." exchange.
- **Comradeship carries over**: not laughing at the wake (6.6) changes Confusione's line and adds
  Supervillain at the breach (7.7).
- **8.2**: each marvel in the book becomes an object at home (`campaign/home.ts`, e.g. the
  Hippodrome → "THE RUG (IT IS A RACETRACK)"); up to six are placed by hand, the rest are counted.
- **8.4**: the 1.4 dialogue wheel returns with one right option ("NOBODY. I WANTED YOU TO THINK
  SO."), shown locked — he still fails to pick it.
- **Interpretations where the PDF leaves a choice**: black holes 7.5 has no named value, so it
  gives "A dream embraces nothing"; 8.3 gives "Resistance" (board: the ending as "resistenza");
  7.3 and 7.8 give "Physical courage" and "Kept oaths" from the "being a knight" table. The
  optional Jack race ("honour against craft") is not implemented. Marvel and home-object names
  are short paraphrases of Clari's catalogue as quoted by the PDF; no outside history was added.
- **Characters**: all cast members are generated placeholders on the same quadruped drawer
  (hats, marks, costumes, eyes, topknots), built lazily on first use (`ensureCharacters`); a
  dialogue portrait for a speaker who is not on stage is generated on demand.
- **Music**: a second synthesized loop, `medieval` (modal melody over a drone), for the dream;
  `chip` stays for the Greenzone. No audio files, still offline.
- **Text**: notices and world popups now wrap to the screen width; choice rows grow with their
  wrapped labels; cards double their size only when every line fits 12 glyphs.
- **Bug fix (all modes)**: PixiJS uploads a `CanvasSource` on `resize` *before* resizing the canvas
  element, so a text that grew in one dimension and shrank in the other uploaded a stale canvas
  into a smaller texture ("GL_INVALID_VALUE: offset overflows"). `PixelText` now grows first and
  shrinks in a second call.
- **Testing**: `tests/campaign.test.ts` (state rules, 8 levels / 42 sub-levels numbering, every
  script builds, every map parses, every awarded marvel has a home object) and
  `npm run smoke`, a Playwright run that plays every sub-level start to finish by skipping steps
  (`StoryScene.debugSkip`) and fails on page errors, missing textures or GL errors.

## Playability and systems pass

- **Autopilot** (`story/autopilot.ts`): an in-game player for automated playtests. It plays through
  the same inputs a person uses (movement vector override and injected taps on `Input`, never by
  calling game logic): confirm on dialogue, a policy for choices (first / last / random; a prompt
  seen again gets the next option, so loops end), Dijkstra paths that avoid what guards can see
  (it waits on a safe tile while a cone passes), hostile animals and fire, walking pace for pace
  walks, scrambled-control compensation after a human-like reaction delay. Each mini-game has its
  own strategy with `skill`-based error (rhythm timing noise and wrong gestures, tapping rate,
  ladder dodges, catapult timing). Steps opt in with an optional `pilot()` method.
- **`npm run playtest`** plays the whole campaign (1.1 → ending) at accelerated speed and writes a
  report (`docs/PLAYTEST.md`): game seconds, restarts, times caught, nerve broken, mini-game
  results and the meters after each sub-level. It fails if a sub-level cannot be finished.
  `StoryScene.metrics` counts restarts for every player, not only the bot.
- **What the first playtests showed**: everything was winnable, but Commozione reached 100 by 3.3
  and stayed there, ladders took 4-5 s, and 2.1 (the beasts) was the only walk that kept
  restarting. Fixes:
  - **The feeling fades**: every dream sub-level (levels 2-7) starts with 2 less Commozione;
    weeping gives 1 per correct beat, the weeping rounds 6, marvels 3 (5 in 7.8).
  - **An unmoved Zampanò cannot act**: the big actions cost Commozione and are locked without it
    ("TOO UNMOVED: NEEDS 10 COMMOZIONE"): atoning at the emir's table (8), speaking up at Zara
    (10), serving the saint unpaid (10), the vigil at the wake (8), defying the emperors (10),
    each bark at Jack at the sack (5; the 7.8 marvels refill exactly enough). A choice never
    dead-ends: if every option is out of reach, the costly ones open.
  - **Standing decides who walks beside him**: in 7.3 Sbrimbrulon always, the count of Saint-Pol
    from Standing 45, Flanders (shamed back to the front) from 65; on the lawn in 8.3 Confusione
    always, Sbrimbrulon from 35, Watson crosses over from 60. Each companion beside him removes
    some of the pace pressure.
  - **Grace shows**: the 8.2 altar glows (≥70), is crooked (≥40) or is made of chew toys, and
    the ending card adds a Grace line and a Standing line.
  - **Ladders**: 18 rungs (5.2) and 30 (7.2), stones every 0.55 s in the real assault, at most one
    rung per 0.12 s however fast he taps.
  - **2.1**: checkpoints after the first stretch and near the end; the bear and the hound are a
    little slower.
  - Result: two full runs (skill 0.7 / knight / first choices, and skill 0.4 / alpha / random
    choices) finish all 42 sub-levels with at most one restart each; Commozione now moves
    between roughly 10 and 60.
- **Tuning moved to `config.ts`** (`STORY`): sight cones, pace, thirst, scramble, fire, rhythm,
  weeping and parade, ladders, tug of war, calm, catapult, rumour, costs, companion thresholds,
  Grace tiers, text speeds, autopilot. Per-scene numbers (a walk's pressure, a ladder's rungs)
  stay in the chapter scripts, which are level data like the maps.
- **Quality of life**: text speed (slow / normal / fast / instant) in the story pause menu, saved
  with the settings; a level's sub-level list from the story menu, where any finished scene can
  be replayed on a copy of the campaign (nothing is saved, the card says so); the Meraviglia book
  pages by real text height, with an icon per section and an "AT HOME" section first.
- **Bugs found on the way**: changing stage inside a sub-level destroyed the scene's own particle
  and popup layers (crash at the next burst; it surfaced as soon as the bot played everything);
  a catapult shot could break every glass with shots to spare and the game then waited forever.
- **Review fixes**: RESTART SCENE no longer fades Commozione a second time (only a fresh visit
  does); only companions who actually fell in beside him (following him) ease the pace pressure,
  not bystanders on the path who stayed back for lack of Standing; the autopilot's `skill` URL
  parameter is clamped, its timers use the real step length, and its tuning lives in
  `STORY.PILOT`; the Meraviglia book builds each line's text once; scene titles in the level list
  keep a complete last word when shortened.
- **Title screen**: SUPERVILLAINED is the logo, always on one line, as big as fits. It is drawn
  with its own bold 6×7 pixel lettering (`ui/logo.ts`, same chunky style as the game font but
  narrower), so it fits at double size on ~200-px phones (186 px) and grows on wider screens;
  outline, drop shadow, soft glow and a small vertical gradient. CRUSADER is the edition title
  under it (the story menu reads "SUPERVILLAINED: CRUSADER"). The footer reads
  SUPERVOID EDITIONS, dimmed, at the pixel font's smallest crisp size.
- **App icon and logo**: the logo supplied by the user (a blue pixel brush shape) replaces the
  generated Zampanò face. Its cream background was white-balanced to pure white and it was
  cropped to the shape (`branding/logo.png`); every launcher icon, the splash screens (now white
  with the logo in the middle) and the web icons are derived from it by
  `scripts/gen-android-assets.mjs`, still dependency-free (a small PNG decoder and an
  area-average resize). The whole shape is always visible: it fits the square icon, the circle of
  the round icon and the adaptive icon's safe zone.
- **Recorded music and sounds** (uploaded to `assets/` on `main`) replace the synthesized ones they
  correspond to, and the old chiptune loop is removed (table in `ASSETS.md`). This departs from the
  SPEC's "zero mandatory assets": the files ship in the repo, so the game still runs offline right
  after cloning. Sound effects are decoded once into buffers (leading silence skipped); the two
  music tracks are streamed through an `<audio>` element routed into WebAudio (decoding the 4-minute
  track whole would take ~80 MB on a phone), so mute, volume and ducking still apply; music pauses
  in the background. Readings where the file name left a choice: `pees-drop` is the pee itself and
  `pees-collect` the refill at water ("collect" like `food-collect`); `water` is stepping into a
  puddle; `siren` loops under the "under attack" alarm until the attack ends (and is the fire alarm
  in 7.4); `laser-eyes` is Bagnaskiz's hit on Zampanò. There was no file for the dream, so levels
  2-7 keep the synthesized medieval loop. Capacitor already lets media play without a fresh tap,
  so music changes work inside the app, and there the audio starts at launch so the intro music
  plays on the title without a tap. Browsers forbid sound before the first tap, so on the web it
  still starts with the first touch or key.
- **RUN is a button, and it costs energy.** Running used to happen by pushing the joystick all
  the way (or holding Shift). Now it is a third touch button, RUN (above PEE and BARK; Shift or K
  on a keyboard), held while moving. Running spends an energy meter drawn as a ring around the
  button (`ENERGY` in `config.ts`: a 5-second sprint from full). It refills while walking or
  standing, slower in the arcade while Zampanò is hungry, and once it is empty he is "TIRED!" and
  can't run until it is back to 35%. The joystick now only walks, at any push. In the story the
  button is hidden in walking-pace scenes, scripted runs in cutscenes cost nothing, and the
  autopilot holds RUN when it wants to run; the full playtest still wins every sub-level.
- **Faster Zampanò, more treats.** Walking 2.2 → 3.4 and running 3.8 → 5.8 tiles/s (in two
  steps). What depends on those speeds keeps its meaning: the ball's pull still beats walking near
  the ball but not running, Bagnaskiz chases slower than a walk, cats (3.9) still need a run to
  catch, and hunger drains in proportion, so a tile walked costs the same as before and not eating
  at all still loses a life. Level 1 has 44 treats instead of 30 (closer spacing). The shortest
  walk is about 48 s instead of 74 s, and food is much easier to find.

## VG1 level design, revision 2 ("Supervillained VG1 — Levels implementation 2")

The second PDF rewrites every sub-level (same 8 levels, 42 sub-levels). The scripts in
`campaign/chapters/` now follow it scene by scene; where it supersedes the first PDF, it wins.

- **New engine pieces** (all reusable): `followLeader()` (he follows his father, Sbrimbrulon, the
  bread seller, a bolt of cloth, the Doge's banner; the leader waits when he lags), `lullWalk()`
  (a voice fills the air, then pauses: only what he does in the lull is heard — 2.3 Fulk, 3.3 the
  trumpets of San Marco, 7.8 the looting; the PDF's "learn to wait for another voice"),
  `carry()` (a label over his head: red cloth, the collecting bowl, the vote, a message, the
  sail, a crate), hidden goals found by ear (`goal.hidden` + `sounder()`: 7.5 the previous room,
  7.7 the rattle of mail), scene overlays (`visor` for 1.1's slipping helmet, `fog` for 7.4's
  smoke, `bleach` for 6.4's desert and 7.1's saturated city), a boat mini-game (4.2), a rowing
  rhythm (4.5), the tug game reused for rowing the prince (7.1).
- **The neighborhood** (`neighborhood` map, levels 1 and 8): home and study, Jack's garden gates,
  the common lawn and the band's water bowl, Jack's next opening, the hedge with its gaps and the
  longer lower lane, Santina's garden gate. New art: a garden gate prop (`J`) and the water bowl.
- **Removed or changed from the first version**: the memory shards no longer unlock later levels
  (levels open in order); 1.2's sniffed "scraps of the lecture" live in the book in their place.
  Standing no longer decides who walks beside him (7.3 and 8.3 follow the PDF: Pierre, Saint-Pol
  and Flanders in 7.3, Sbrimbrulon and Confusione in 8.3); it still shapes the ending notes. 7.3's
  nerve gauge now measures staying level with Pierre's shoulder. The 6.1 catapult is now about
  whisking the glass away before the shot lands. 8.1 has no chasing hound.
- **Hard cuts** (4.3–4.5, 6.3–6.5, 7.5) keep the black-hole cards and their values.
- **Endings**: 7.8 is "call the oath in a lull" or "stand silent while Niketas calls it". Both
  leave the girl with her family; the book records his own words or Niketas's, and 8.2 reads it
  back. Internally the endings are still `knight` / `alpha`; the screen now says THE KNIGHT or
  THE WITNESS (staying silent is not villainy in this version: Bagnaskiz steps aside either way).
- **8.4 ends on a cut**: no answer wheel; the PDF says to cut before he finds an answer.
- The autopilot plays all of it (`npm run playtest`, new `--to` option for one level); three full
  runs (both endings; first, last and random choices; skill 0.4–0.9) finish every sub-level.

## One game: the Green Zone walk is Level 1, not a separate mode

The arcade "Green Zone" and the story were two modes on the title screen. They are one game now:
the dog walks the Green Zone, falls asleep, dreams the crusade and wakes up supervillained, no
longer bullied in the Green Zone.

- **1.0 The Green Zone**: the SPEC walk is the first scene of Level 1 (`greenZone: 1` on the
  sub-level; `StoryFlow` hands it to `Flow.playGreenZone`). Briefing → walk → level end with
  CONTINUE into 1.1, which opens with him dozing off on the lawn after the walk. RETRY replays the
  walk; game over offers RETRY. Coins from the walk go to the story's purse. Numbered 1.0 so the
  PDF's 1.1–1.5 keep their numbers. Saves made before this count 1.0 as done if 1.1 is.
- **Title**: NEW GAME (asks before wiping a saved story), CONTINUE (the next unfinished scene; the
  label under the menu says which; always yellow, and with no save it starts the story), OPTIONS (sound, volume, text speed,
  LEVELS for replays, the Meraviglia book), QUIT. The story's pause menu now quits to the title.
- **QUIT**: on Android it closes the app through a tiny local Capacitor plugin (`QuitPlugin.java`,
  registered in `MainActivity`; `src/core/native.ts` uses `@capacitor/core`, already a
  dependency). A browser tab cannot close itself, so the web version shows a goodbye card. The
  phone's back button on the title also quits.
- The autopilot does not play the walk (it marks 1.0 as done and goes on); the screenshot
  scenarios m1–m6 play it, now starting from NEW GAME.
- **Music follows what the player is doing**: the intro music plays on every screen meant for
  reading (title, cards, briefing, score, the Professor, the ending); a level's own music (Green
  Zone or medieval) starts only when the play starts. Each track resumes where it was paused
  instead of restarting from the top.
- **Title page**: the SUPERVILLAINED logo and CRUSADER sit at the top; Zampanò's portrait
  (`assets/starting-page-images`) over the buttons, 1/3 of the screen wide (the "You've been
  supervillained" logo that sat under them moved to the end of the levels: see below); the
  blurred Green Zone behind is an old dirty film (fine grain, a slight brightness flicker, faded
  warm colors, darker edges, two thin vertical scratches that stay put, drift and break up, dust
  specks that change every film frame, the picture jumping a pixel now and then) that glitches
  only now and then (every 3.5 to 8 s, short and mild: a constant strong glitch was annoying),
  mostly vertically (`fx/titleGlitchFilter.ts`: columns tearing up and down, a vertical RGB
  split, rolling, tall corrupted blocks, vertical bars, a few horizontal tears). Tuning:
  `TITLE.GLITCH_*` and `TITLE.FILM`. The stack
  is laid out as below ("Title page layout").
  The pictures are scaled in the browser (step-by-step halving, crisp alpha) to the logical
  resolution, so they match the pixel art at any screen size.


## Sprite update 1: delivered character art, the old art kept

`Supervillained-vg1-sprite-update-1.zip` (uploaded to main, kept at the repo root as delivered)
brings sheets for Zampanò (new run), Bagnaskiz, Sbrimbrulon, Jack, Watson and Confusione, a
`tired` animation for Zampanò and a RUN icon. Wired as its README asks (sheets in
`public/sprites/`, `sheet:` in the manifest), with these choices:

- **The replaced art is kept as the old version, never deleted.** `public/sprites/old/` holds the
  procedural art each sheet replaced, frozen as PNGs in the same layout by
  `npm run sprites:old` (it draws them with the game's own generator, which stays in
  `src/assets/placeholders/`). OPTIONS > ART: NEW / OLD switches between them at once and is
  saved; `?art=old|new` for tests. The old art keeps its RUN chevrons and its dialogue name
  colors; the new art gets name colors that match it (Sbrimbrulon rust, Jack pink, Confusione
  orange).
- **Tired**: Zampanò pants (the delivered `tired`, its own sheet via `animSheets`) while he
  stands still with the energy emptied, until RUN is available again. It is new-only: the old art
  (and a sheet without the rows) shows the idle frames.
- Every character with a sheet is loaded at boot (≈150 KB of PNGs), because a sheet loads
  asynchronously and a story scene spawns its actors at once; the rest of the cast is still
  generated on demand.
- The costumes (`zampanoCross`, `zampanoKnight`, `bagnaskizMarshal`, `bagnaskizEmperor`) were not
  in the update and stay procedural in both versions.
- `tests/sprites.test.ts` checks every sheet's size against the manifest layout, the old ones
  included.

## "You've been supervillained" at the end of every level

The logo left the title page. It now marks the end of each level, before the level's final info:

- **When**: the Green Zone walk (1.0) before its score card, and every story level (1 to 8) before
  the Professor's aside (so Level 1 has it twice: after the walk and after 1.5). Not for replays
  of a single scene, not for the autopilot.
- **How**: it appears at once, over the frozen last frame (dimmed): twice its size snapping down
  to it in 0.12 s with a decaying thump, a white flash, a shake, the glitch sound with a bark, and
  a burst of sparkle and star sprites flying out of it; a pale halo pulses behind. It holds 2.4 s
  (a tap skips it after 0.45 s), then the final info. All numbers in `config.ts` (`SUPERVILLAINED`).
- The title page keeps its portrait, buttons and glitch; with the logo gone the stack sits a bit
  lower.

## Title page: the animated portrait

The portrait over the title's buttons is now `Zampano-Samemala-2.gif` (44 frames, about 2 s,
1024 × 1536), animated. A browser draws only one frame of a GIF into a canvas, so the frames are
decoded with WebCodecs' `ImageDecoder` (built into Chromium and the Android WebView; no new
dependency), halved down to 256 px, cropped to the dog (the union of the frames' opaque areas, so
it fills the same width as the old portrait), scaled to the title's width with crisp edges and
packed into one texture; each frame keeps its GIF delay. Decoding starts at boot and takes a few
hundred ms; until then the title keeps the portrait's place (`TITLE.DOG_ASPECT`) so nothing moves
when it appears. Where `ImageDecoder` is missing the first frame is shown still. The old portrait
is kept as the old art (OPTIONS > ART: OLD), like the replaced sprites. SUPERVOID EDITIONS is
green.

## Title page: GLOSSARY and the publisher link

- **GLOSSARY** (violet, before QUIT) opens a floating paper card over the title (which keeps
  animating behind it, without input): the dictionary entry of "supervillain, supervillained" as
  given (headword, pronunciation, a) noun, b) verb). The b) verb ("to grow up strong; to get
  character"), the sense the game is about, is circled by hand in red, as in the source image: the
  ring draws itself when the card opens; the noun is in a faded ink. The text follows the game's
  uppercase rule except the pronunciation, which stays lowercase IPA: Press Start 2P has no IPA,
  so the pixel font borrows ' and : for the stress and length marks and makes the schwa from its
  own "e" turned upside down. It closes with CLOSE, a tap outside it, Enter or back. Tuning:
  `GLOSSARY` in `config.ts`.
- **SUPERVOID EDITIONS** (now green and underlined) opens https://supervoideditions.com/: in the
  phone's browser on Android (a new `openUrl` method on the app's own plugin, `QuitPlugin.java`, an
  ACTION_VIEW intent: the game stays open behind), in a new tab in a browser.

## Title page: COUCH, the saved story at a glance

There are no accounts (the game is offline and saves on the device), so the "account" is the
save itself: **COUCH** (orange, after CONTINUE; his couch is where the story starts and ends)
opens a floating paper card like GLOSSARY, read-only:

- the next scene (or, once it is finished, the ending his choices lead to: THE KNIGHT or THE
  WITNESS), the scenes done out of 43 with a percentage, and one cell per level filled with its
  share of scenes (green when done);
- the four meters (Commozione, Supervillain, Grace, Standing) as bars with their values;
- the Meraviglia book (values, marvels, things carried home, shards), coins, the costume
  (none / rag cross / armour), the Green Zone best (score, stars, time);
- play time and when it was last saved. Both are new in the save (`playTime`, `savedAt`; older
  saves start at 0 / never): story scenes add their time while they run (not replays), the Green
  Zone walk adds its time when it is over, and every save stamps the date.

`campaign/summary.ts` (`progressSummary`, pure and tested) builds what the card shows. With six
buttons the title's stack could overflow a short screen (a desktop window), so the portrait now
shrinks to the room left. Measuring text uses `textWidth`/`textHeight` (a PixelText sprite is
padded and rounded up to 16 px), which also centers GLOSSARY's ring and the footer's underline
exactly.

## Title page layout, the title's glitch, the publisher's glow

- **Layout**: SUPERVILLAINED and CRUSADER sit near the top (their top at 7% of the screen height,
  `TITLE.TOP`), the buttons (and where CONTINUE goes) one button's space above SUPERVOID
  EDITIONS (`TITLE.BOTTOM_GAP`), and the animated portrait in the middle of the space between them
  (smaller if that space is short).
- **The title glitches** (`fx/textGlitchFilter.ts`, on the title and CRUSADER together): short
  bursts every 1.8 to 4.5 s in which horizontal slices of the letters jump sideways, the colors
  split and rows flicker; a faint shiver in between. It touches only the letters (premultiplied
  colors are clamped to their alpha), never the space around them.
- **SUPERVOID EDITIONS** lost its underline (it is still a link) and glows slowly: a blurred,
  outlined pale-green copy behind it breathes in and out (about 5 s per breath).
  Tuning: `TITLE.TEXT_GLITCH_*`, `TITLE.FOOTER_GLOW_*`.

## Story cards: no design notes, one Green Zone page, names in yellow

- The level card no longer shows `CAST: ...`: the chapter's `cast` field is design information
  (who plays whom), kept in the data and the bible, not shown in the game.
- The Green Zone walk (1.0) has a single presentation page: LEVEL 1, THE GREENZONE and what the
  walk is (the scene's text), then the rules briefing. The level's own intro and the separate 1.0
  card (with its SOURCE line) are not shown for it.
- Names in the card texts (level intros, scene cards, the Professor, the ending) are yellow:
  the cast and the historical people, not places (`story/names.ts`, `NAMES`).

## The Green Zone page's text, the third title portrait

- The Green Zone page (1.0) reads: ZAMPANO WAKES ON THE COMMON LAWN. THE WAY HOME RUNS THROUGH A
  NEIGHBORHOOD WHERE EVERY OTHER DOG CAN WALK STRAIGHT TO THE WATER BOWL. EAT TREATS AGAINST
  HUNGER, PEE TO CLEAN WHAT THE POOPS SPOIL, CATCH CATS FOR COINS, IGNORE THE BALLS, AND BARK AWAY
  AT BAGNASKIZ WHEN HE POLLUTES THE ZONE. AT THE END OF THE WALK, TIRED, HE LIES DOWN ON THE LAWN.
  (ZAMPANO without the accent: the pixel font has no ò, like everywhere else in the game.)
- The title portrait is `Zampano-Samemala-3.gif` (99 frames, about 4 s, 6.6 MB). Frames are
  reduced to 192 px before cropping (256 before) to keep memory low while 99 frames are packed;
  the previous GIFs stay in the folder.

## Sprite update 2: the complete Zampanò, a third art version

`Supervillained-vg1-sprite-update-2.zip` (uploaded to main, kept at the repo root) brings the
complete new Zampanò and, for the first time, his two dream costumes as sheets (rag cross,
armour), each with a tired sheet. Its other six files are byte-identical to update 1. Its README
mentions source changes made on Codex's local copy; they were not delivered, so the integration is
done here, with these choices:

- **Three art versions**, cycled by OPTIONS > ART: NEW (update 2), UPDATE 1, OLD. The update-1
  Zampanò it replaces moved to `public/sprites/v1/`; the procedural costumes it replaces were
  frozen into `public/sprites/old/` by `npm run sprites:old` (the other old PNGs came out
  byte-identical). Saved settings keep working ('new' / 'old'; 'v1' is new).
- The manifest's `sheet` / `oldSheet` / `animSheets` became `sheets`: sets tagged with the version
  that introduced them; a version shows the newest set at or before it. So the band keeps update
  1 under NEW, and the costumes show the procedural art under UPDATE 1, as that version did.
- The costumes gained the `tired` animation (from their own sheets); with older art it shows idle.
- Every character with a sheet in any version loads at boot (now about 450 KB of PNGs), as
  before, so story scenes never spawn a character before its textures exist.

## Title: the portrait moves at once, INSERT BRAIN; no SOURCE lines

- The animated portrait used to wait for all 99 GIF frames to be decoded and scaled (about 5 s in
  a test browser, a few seconds on a phone), showing the first frame still meanwhile. Now each
  frame plays as soon as it is decoded (`TitlePlayer` holds a frame if playback catches up with
  the decoder; decoding runs faster than the GIF plays): the dog moves about a second after the
  title appears. The crop is fixed from the first frame (its dog plus a margin) instead of the
  union of all frames, and frames are scaled with the browser's resizing `createImageBitmap`
  instead of step-by-step halving (about twice as fast).
- Under the buttons, the line saying where CONTINUE goes is replaced by a blinking INSERT BRAIN
  (an arcade INSERT COIN), centered, nearer the buttons than the publisher line
  (`TITLE.INSERT_BRAIN_AT`). Where CONTINUE goes is in COUCH.
- The scene cards no longer show `SOURCE: ...` (the conference or board reference): like CAST, it
  is design information, kept in the chapter data and the bible.
- The buttons and INSERT BRAIN then rose by one more button's space (`TITLE.BUTTONS_RAISE`), towards
  the portrait, which stays where it was (it only shrinks or moves up if a short screen leaves no
  room).

## Music for levels 2, 3 and 4

Three recorded tracks (uploaded to main, `assets/music/Level-N_...mp3`) play while the scenes of
their level are played, like the Green Zone track in levels 1 and 8; the reading screens keep the
intro music and levels 5 to 7 the synthesized medieval loop. They are mastered louder than the
Green Zone track (by 4.7, 1.5 and 6 dB on average), so each gets a gain trim
(`AUDIO.MUSIC_FILE_GAIN`) through its own gain node. They are long (about 6 minutes) and came at up
to 320 kbit/s (38 MB, a 59 MB APK), so the game bundles copies re-encoded as MP3 VBR at about
130 kbit/s (`ffmpeg -codec:a libmp3lame -q:a 5`, 18.8 MB; same loudness, so the trims stand); the
uploaded files are kept untouched in `assets/music/originals/`, which nothing imports.

## A smaller app

The debug APK had reached 59 MB. What changed (originals always kept in the repo, unbundled):

- **Music**: every track is bundled as MP3 VBR at about 130 kbit/s (`ffmpeg -q:a 5`; the level
  tracks came at up to 320 kbit/s); same loudness, so the gain trims stand. Uploads stay in
  `assets/music/originals/`.
- **Title portrait**: the 6.6 MB GIF is bundled as a lossless animated WebP (2.3 MB), checked
  frame by frame and delay by delay against the GIF; `ImageDecoder` decodes WebP like GIF.
- **Old still portrait** (ART: OLD): a 384-px copy (0.2 MB) instead of the 1024-px original.
- **Release build** (`npm run android:release`): R8 shrinks and optimizes the code (about 8.6 MB of
  dex in the debug build, 0.8 MB here). Capacitor's own ProGuard rules keep its plugins and their
  `@PluginMethod` methods (QuitPlugin's `quit` and `openUrl` checked in the dex), Android's default
  rules keep the WebView's `@JavascriptInterface` bridge. It is signed with the debug key so it
  installs from a file like the debug APK; publishing on the Play Store needs an upload key kept by
  the publisher (never in the repo), set in `android/app/build.gradle`.

## Faster dog; lives for speed

- Zampanò walks at 3.9 tiles/s and runs at 6.7 (were 3.4 and 5.8), everywhere he is played. The
  Green Zone's hunger drain while walking and running grows in proportion (2.64 and 4.04 per
  second), so hunger per tile walked is unchanged and finishing the walk without eating is still
  not viable; the balance test's floor for the shortest walk drops from 45 to 40 seconds.
- **INSERT BRAIN [Nx]**: the title's counter, right of INSERT BRAIN, sets the lives of the Green
  Zone walk (the only part of the game with lives): from 2 (the old default) up to 9, a tap (or
  RIGHT) adds one and wraps back to 2, LEFT takes one off. It is saved. Each life above 2 costs 5%
  of his speed in the walk (9 lives: 65%) - **SPEED FOR LIVES**, the blinking light-grey line
  under it, two lines of space above SUPERVOID EDITIONS. The dream walks have no lives (they
  restart), so the speed cost stays in the Green Zone. Tuning: `LIVES.MAX`, `LIVES.SPEED_COST`
  (`systems/lives.ts`, tested).
- Faster again at the base 2 lives: walk 4.4, run 7.5 tiles/s (hunger drain 2.98 and 4.52 per
  second, same hunger per tile). The balance test now checks the shortest walk in tiles (over 150)
  instead of seconds, so it does not move with the speed. The full playtest passes.
- Title layout: the block under the title (portrait, buttons, INSERT BRAIN, SPEED FOR LIVES) is
  centered between CRUSADER and SUPERVOID EDITIONS, measured from the dog's visible top (the
  frame's transparent crop margin is left out): the same space above and below it, the title
  where it was. On short screens the portrait shrinks to keep at least `TITLE.BLOCK_MIN_MARGIN`.

## Only the latest art; shining buttons

- The game now ships only the latest delivered art: OPTIONS > ART and the `?art=` debug parameter
  are gone, and so are the old version's still portrait on the title. The replaced art (the frozen
  procedural sheets and update 1's Zampanò) moved to `art-archive/` (kept, not bundled), with the
  `sprites:old` export script that made them. The procedural generator stays: it still draws the
  cast without delivered sheets. Dialogue name colors follow the delivered art (Sbrimbrulon rust,
  Jack pink, Confusione orange). A saved `art` setting is simply ignored.
- The title's buttons shine now and then: every 1.4 to 3.6 s a slow slanted light band (with a
  thinner streak behind it) crosses one button, inside its frame, never the same button twice in a
  row (`TITLE.SHINE_*`).
- The line under INSERT BRAIN now reads LIFE FOR SPEED, in light blue (#8ad4ff), still blinking.

## 1.2: Jack's gate after the faster dog

- Bug: in 1.2 the dog walked into Jack, and half a second later he was through, without the bark
  puzzle, in a pile of NOPE! texts and JACK WILL NOT MOVE notices. The script pushed him back at a
  fixed 3 tiles/s and counted every frame he was past the line as a new bump; once he walked at
  4.4 tiles/s the push no longer beat his walk, so he was "bumping" 60 times a second and the
  give-up counter (meant for several seconds of pushing) filled in 0.5 s. 1.3's cut-off had the
  same pattern (a NOT THIS WAY, SIGNOR! every frame).
- Fix: `Zampano.bounce()` stops his motion into the obstacle and knocks him back at
  `PLAYER.BOUNCE` times his running speed, so it works at any speed; `blockGap()`
  (`chapters/helpers.ts`) holds the gap and reports at most one bump every `STORY.BUMP.EVERY`
  seconds. In 1.2 the hint comes at the 3rd and 8th bump, and after 14 bumps (about 7 s of
  pushing) he gets through anyway; when he does (or after the third echoed bark) Jack steps aside
  first, during the CREAK line, and then the walk to the bowl continues (it used to play after he
  had already walked through Jack).

## Zampanò animation integration

- The `Supervillained_VG1_Zampano_Animation_Integration.zip` delivery (an overlay made against this
  branch) replaces plain Zampanò's sheets: 8-frame idle, walk, run, pee, poop and eat, a new
  `sit` (seated idle), and redrawn sniff, bark, fetch (with the tennis ball), hurt and tired, all
  in the new ivory, shaggy design. Update 2's sheets moved to `art-archive/sprites-update-2/`; the
  rag-cross and knight costumes keep update 2's sheets.
- Timing: an animation can give per-frame holds (`frameDurationsMs`, `assets/animationTiming.ts`,
  tested) instead of a single fps. Pee, poop and eat/drink are fitted to the existing action timers,
  so no gameplay timing changed (nothing in the rules waits on an animation).
- At rest: standing for 3 s, then sitting, then sniffing and sitting in turn
  (`PLAYER.IDLE_PHASE_TIME`); the costumes alternate standing and sniffing. Rest counts again
  after any action (the delivery did this for the plain costume only; here for all).
- The code-drawn fallback (if a sheet fails to load) shows idle frames for `sit`.

## Armoured Zampanò animations

- `Supervillained_VG1_Armoured_Zampano_Animations.zip` (an overlay on the same base as the plain
  animation integration, with that delivery's files included unchanged) replaces the knight's
  sheets: the 12 actions of plain Zampanò, drawn with the conical helm, shoulder plates, mail coat
  and the red cross on his back. The knight now shares plain Zampanò's animation table
  (`ZAMPANO_ANIMS`), so from 2.5 on he also sits and sniffs at rest and his pee, squat and eat
  are fitted to the action timers. Update 2's knight sheets moved to `art-archive/sprites-update-2/`;
  the rag cross keeps update 2's.
- The zip's large sheets (256 px, five views including a top-down one, 8 frames for every action)
  are the sources; the game uses its 40 × 40 atlas as delivered, which has 2–4 frames for sniff,
  bark, fetch, hurt and tired. Its cells are cropped and fitted per pose, not a plain downscale,
  so no frames were added from the sources here.
- Kept from the delivery: changing costume restarts the animation on the new sheet at once, and
  the sit-and-sniff rest applies to any costume with a `sit` animation. Kept from before: rest
  counts from the end of any action for every costume (the overlay limited that to costumes with
  `sit`).
- Two mini-games picked hero frames with a fixed `% 4` (the 4-frame sheets): the ladders (walk) and
  the tug of war (the knight's run). With 8-frame cycles that showed half the cycle; they now use
  the sheet's frame count (one walk cycle every four rungs, as before) and the run's authored
  timing.

## Sbrimbrulòn, plain and armoured

- `Supervillained_VG1_Sbrimbrulon_Normal_Animations.zip` and `..._Armoured_Animations.zip` replace
  update 1's Sbrimbrulòn (5 animations, moved to `art-archive/sprites-update-1/`) with the same 12
  actions as Zampanò, and add an armoured variant, `sbrimbrulonKnight` (helm with nose guard,
  shoulder plates, mail coat, red cross on the back). Both share Zampanò's table except fetch and
  hurt, which play once (`SBRIMBRULON_ANIMS`).
- The zips carried an installer script and a patch against an earlier commit. The script was not
  run; the patch was read and merged by hand on top of the armoured Zampanò update: the manifest by
  hand, the rest (`Actor.playAction`, actors sitting after 3 s still when their sheet has `sit`,
  the fitted sprite viewer with S/W/E/N columns, the placeholder spec, its tests) as delivered.
- Where the armour is worn: the delivery left that to the story. Sbrimbrulòn is armoured in the
  dream, where he is a crusader (3.1 the Venice quay, 5.2 the wall of Zara, 7.3 Pierre at the
  walls), and plain on the lawn (1.3, 8.3). His dialogue portrait stays plain, as Zampanò's does.

## Eight real directions for Zampanò and Sbrimbrulòn

- `Supervillained_VG1_Normal_8_Directions_Update.zip` and `..._Armoured_8_Directions_Update.zip`
  (uploaded to this branch, not to main) redraw the diagonals of plain and armoured Zampanò and
  Sbrimbrulòn: NE/NW are three-quarter back views, SE/SW three-quarter front views, for all twelve
  actions. Before, the sheets had eight rows but four views (NE/SE = E, NW/SW = W). Checked on the
  delivered PNGs: same sizes and layout, all 528 N/E/S/W frames identical to the previous sheets,
  all 528 diagonal frames new, none blank, the same ground line; no manifest or movement change.
  The previous sheets are in `art-archive/directions-before-8way/`.
- The sprite viewer shows all eight headings (the delivered `spriteViewerScene.ts`). The zips'
  notes mention source sheets, rebuild scripts and pixel tests that were not in them; the
  regression test here is `tests/eightDirections.test.ts` (decodes the sheets with zlib, no new
  dependency; it fails on the old sheets).

## The Fourth Crusade rewrite: Robert de Clari as the viewpoint

Supersedes the story direction of the sections above ("VG1 — The story campaign", "VG1 level
design, revision 2") where they differ. Those sections stay as the log of how the engine was
built; the story itself is now [`docs/STORY.md`](docs/STORY.md), with sources, inventions and the
save migration in [`docs/STORY-SOURCES.md`](docs/STORY-SOURCES.md).

- **One dream, one crusade.** Levels 2–7 are the Fourth Crusade, 1202–1204, from the place of a
  minor Picard knight (Clari's lord Pierre d'Amiens = Sbrimbrulòn, his brother Aleaume = Confusione);
  Villehardouin (Bagnaskiz as the marshal) for agreements and leadership, Niketas Choniates (as
  himself, no lawn face) for the city and its loss. The anthology episodes are gone: Dante's
  beasts, Charles VI's falcon and stag, Leutard's bees, Joinville (rules, rescue, cellarer, emir,
  Lampedusa, catapult, wake, Soissons), Christine de Pizan and Fortune, the penitentials and
  Urban II, Anna Komnene and 1096–97, Hattin, Louis IX, Cligès, the relic altar and chapel, the
  floating sailor, the hermit. The **black holes** (cuts into other crusades) are retired:
  `blackHole` on `SubLevelDef`, `blackHoleIn/Out` steps and the BLACK HOLE card variant are removed.
- **Boundaries.** 1.1 is reality (a sand bucket over his head, slapped off), no premature dream;
  1.5 is a rag cross carried home, not a Louis IX reenactment, and its last card is the sleep
  boundary. Nothing physical comes back from the dream: 8.2 replaces the relics with the study's
  own objects, a told story and a drawing.
- **Distinctions kept on purpose.** 1203 and 1204 are separate sieges; Alexios III, IV and V are
  three different men (Bagnaskiz wears the first and the last: "the dream runs out of faces");
  disagreements between the chronicles (34,000 vs 36,000 marks; who was absolved after Zara; how
  Alexios IV and Isaac died; Clari's "no mischief" vs Choniates's grief) are shown, not resolved.
- **The column** (7.4, 7.9) is Clari 92's carved pillars: scenes nobody can read until afterwards,
  when everyone says they knew. An inscription recognized late, not a prophecy machine.
- **Meraviglia** turns: the book of marvels ends on AN EMPTY PEDESTAL (the bronze Hercules melted
  for coin, after Choniates), and 8.2's drawing can be of that pedestal.
- **Endings.** Still decided at 7.8, now by a lull walk: call the pilgrims to their oath yourself
  (THE KNIGHT) or stand silent while Niketas calls them (THE WITNESS; internal key `alpha`, kept so
  saves and the playtest flag `--ending alpha` keep working). The girl is let go either way.
- **Meters re-anchored.** Grace is the forms he swore to or was given (vow, prohibition, oath,
  declaring booty), not divine favour; the ending notes say so. `STORY.COST` is now SPEAK_UP (5.1),
  SHARE (6.1), OATH_BARK (7.8).
- **Unlocks relocated.** Rag cross 1.5 (real); the vow (`sermon`) 2.2 at Fulk's preaching; the
  armour (`knight`) 2.3 on the road. **Comradeship** is set up by sharing the last half loaf with
  Aleaume at Zara (6.1) and read at the breach (7.7): his voice leads you in, or only his mail
  rattles.
- **New scenes:** 2.2 Names on a list, 2.3 A coat of mail too big, 4.2 Horses below deck,
  4.3 Rumours on deck, 5.3 Whose orders?, 6.1 Short rations, 6.3 On their knees at Corfu,
  7.9 The common pile, 8.2 What he can tell. 43 scenes became 37 (1.0 + 36). The calm-rescue and
  catapult mini-games had no scene left and were removed (with their `STORY` tuning and the unused
  WHISK / BLEACH_TIME numbers); the boat game takes its objective as an option.
- **Saves.** `CampaignState.version` 2. A version-1 save is migrated on first load (`migrateV1`):
  1.0, 1.2, 1.3, 1.4 and their flags, scraps, remembered lines, coins and play time are kept;
  everything from 1.1 is played again with fresh meters, book and costumes; the untouched v1 save
  is copied once to `story-v1-backup`; CONTINUE / the story menu show THE DREAM HAS BEEN REWRITTEN
  once. Unit-tested; the `migration` screenshot scenario checks it in the browser.
- **Sources.** The two lecture transcripts named in the brief were not available (not in the
  repo, on `main`, or on the machine); no scene cites them any more. Quotations are limited to the
  editions listed in `docs/STORY-SOURCES.md`; invented material is marked ADAPTATION. Episodes
  not verifiable in those editions (Niketas's flight with a Venetian protector; the mosque of 1203)
  are either marked as adaptation or omitted.

## Period words, the mosque, Niketas's flight; speech kept on screen

- **Barbero's lecture on the Fourth Crusade** (Italian transcript, `barbero - 4a crociata.txt` in the repository root) is now a
  consulted source. From it the dream's characters speak about twenty **period words** — the holy
  voyage, the general passage, *crucesignati*, pilgrims, *messire*, dromons, *uissiers*, a weight
  of silver, our company, in thrall to the Turks, Outremer, the Lombard, *li rike homme*, *li povre
  chevalier*, in God's name, those of the West, Latins, barbarians, Romans, the year 6711, on the
  saints, *merveille* — each given to the character who would use it (`docs/STORY-SOURCES.md`,
  "Period words"). The dialogue box colours them amber as they are typed (`OLD_WORDS` and
  `withOldWords` in `story/names.ts`, tested); names in the cards stay yellow.
- **7.5** now says how the fire of 1203 started, as Barbero tells it: pilgrims set out to burn the
  mosque, the Greeks defend their Muslim neighbours. Niketas's house burns in it.
- **7.8** follows Niketas's flight as Barbero tells it from Niketas (the house with a dark
  entrance, the Venetian friend, mud on the girls' faces, the oath recalled); it is no longer
  "unverified". The second transcript (*Il sogno nel Medioevo*) is still not available.
- **Speech on screen**: text over a character (`ctx.say`) is kept inside the view and below the
  HUD (`Popups.keepIn`, `STORY.SAY_INSET`), so a speaker at the edge of the screen (the woman on
  the walls in 7.3) is read in full.
- **Dialogue box fits the line**: it was a fixed four-line box, and many lines of the rewrite are
  longer, so their end ran out of the box. It now measures the whole line and grows upwards
  (`STORY.DIALOGUE_BOX`); its bottom edge and short lines are unchanged, and choices still stack
  above it.

## iOS: the same Capacitor shell, built on GitHub's Macs

- **`@capacitor/ios` 8.6.2** (new dependency, the iOS counterpart of `@capacitor/android`, same
  version) and the generated `ios/` project, with Swift Package Manager (no CocoaPods, so the
  project can be generated and synced on Linux).
- **Native bits mirror Android**: `MainViewController` (a `CAPBridgeViewController` subclass)
  registers the app's `AppQuit` plugin, disables the idle timer (screen kept on), hides the status
  bar and allows portrait only (the home indicator stays: Capacitor's controller does not let a
  subclass override `prefersHomeIndicatorAutoHidden`, and the safe area keeps the game above it); `Info.plist` adds portrait-only
  orientations, `UIRequiresFullScreen`, `UIStatusBarHidden`, `arm64` and no export-compliance
  question. `AppQuitPlugin.swift` opens web links in Safari; `quit` is unavailable because iOS
  apps must not close themselves (Apple's guidelines), so `quitApp()` returns false on iOS and the
  title's QUIT shows the goodbye card, as in a browser.
- **Safe area**: the canvas is laid out inside `env(safe-area-inset-*)` (read through a probe
  element, `safeAreaInsets()`), so the HUD is not under an iPhone's notch or Dynamic Island and
  the bottom buttons stay clear of the home indicator. All insets are 0 on desktop browsers;
  Android phones with a camera cutout benefit too.
- **Icons**: `scripts/gen-android-assets.mjs` also writes the iOS app icon (1024 px, opaque) and the
  three 2732 px launch images, with the logo small enough to survive "aspect fill" on a tall phone.
- **Building without a Mac**: this container is Linux, and iPhone apps compile only on macOS.
  `.github/workflows/ios.yml` builds on a GitHub-hosted Mac (free for this public repository) an
  unsigned device `.ipa` and a simulator `.app`, uploaded as the *SUPERVILLAINED-ios* artifact.
  Installing on a phone still needs a signature: a sideloading tool with the user's Apple ID, or
  Xcode with a team selected. A shared `App` scheme is committed so `xcodebuild -scheme App` works
  without opening Xcode first.

## Fighting, the action button's modes, gestures and the CONTROLS settings

- **Three fight actions.** BARK from the start (an area push, never parried, barely staggers);
  the SWORD and the SHIELD once Zampanò wears the knight's costume (`StoryScene.knighted`, from
  2.3 to 7.9; the plain dog of level 8 has neither). Rules are pure and tested
  (`systems/combat.ts`); the scene side is `story/combat.ts`, run by every walk, with numbers in
  `COMBAT` (config.ts). A walk becomes a fight with `fight: { foes, rout, health, parry, ... }`.
- **Non-lethal.** A foe with no HP left is *routed* (runs off shouting); Zampanò at 0 HEALTH is
  *knocked down* and the walk starts again with everyone back in place. The story stays about a
  small knight who witnesses: no deaths, and 7.3 keeps "nobody strikes a blow".
- **Readable timing.** A foe winds up for half a second before each blow, drawn as a red ring
  filling under him: time to raise the shield. The shield takes blows from the front (it turns to
  the nearest threat) and a blocked blow staggers the attacker. Armed foes (`parry`) parry the
  sword unless staggered, mid-swing or just after a swing, and one blow uses up the opening
  (its stagger is shorter than the sword's cooldown; an interrupted swing still costs the foe its
  cooldown). This removed the stun-locks the first tuning had: the autopilot cleared 2.3 in three
  seconds without being touched. Raising the shield shoves foes back but opens nobody.
- **Where the fights are** (all ADAPTATION, in `docs/STORY.md`): 2.3 Jack's lads on the road
  (bark only, before the armour) and the sparring with Pierre's squires (the sword-and-shield
  tutorial); 5.3 through the Zara brawl, where every sword blow that lands costs Grace (the pope's
  prohibition: bark or shield instead); 7.2 a stand by the Doge's banner against the axe-men
  (survive 18 s). The breach (7.7) stays Aleaume's deed.
- **The action button has modes**: the scene's own action (LOOK, VOW...), BARK, and for a knight
  SWORD and SHIELD. A small switcher button next to it (or Q / Tab) cycles them; Space always does
  the scene's action and B / U / I go straight to bark / sword / shield. A fight walk starts on
  the SWORD (knights) or BARK. The input action of the button became `action` (it was `bark`):
  dialogue, menus and mini-games accept it as before.
- **Gestures** on the button side of the screen, above the buttons (not on them, so a press on a
  button stays instant): swipe up (default SWORD), swipe down (SHIELD), double tap (BARK). A swipe
  fires as soon as it is one, a double tap on the second press. Hints with the current bindings
  sit over the buttons in story walks, and a streak with the word shows where a gesture was made.
- **OPTIONS > CONTROLS** (also in the story's pause menu): what each gesture does (off, the action
  button, bark, sword, shield, switch, RUN on/off), RUN held or tapped on/off, the switcher on or
  off, and the buttons for the right or the left hand (everything mirrored: joystick on the right,
  buttons and gestures on the left). Saved with the settings (`validControls` repairs old or bad
  values); no new dependency.
- **Sounds**: a synthesized swish (sword) and clang (shield, parry) join `fx/sounds.ts`.
- The playtest's "caught" column now also counts blows taken in fights.

## The pixel cast and Bagnaskiz in eight directions

- **Two deliveries on main.** `Supervillained_VG1_Bagnaskiz_Normal_8_Directions.zip` /
  `..._Armoured_8_Directions.zip` (Bagnaskiz plain and in Byzantine armour, the twelve dog actions
  in eight real directions) and the pixel cast (`Supervillained_Pixel_Game_Integration.zip`, with
  `..._Animals.zip` and `..._Humans.zip` for single frames, source grids and previews): 24 new or
  refreshed character sheets. The zips are kept at the repo root as delivered.
- **How it went in.** Neither installer was run (`apply_to_game.py`, the Bagnaskiz rebuild
  scripts). The cast's `INTEGRATION.patch`, made against this branch's previous commit, was read in
  full (code only: manifest, placeholder fallbacks, cast keys in the chapters, speaking gestures,
  player-skin types, tests) and applied with `git apply`; the PNGs were copied by hand.
- **Bagnaskiz in full colour.** The cast delivery re-quantized the Bagnaskiz and Sbrimbrulòn
  sheets to 32 colours "for a consistent palette". Compared on the pixels: same silhouettes, but
  Bagnaskiz loses his yellow eyes and open mouth, his trademark. The game uses the 8-directions
  zips' full-colour sheets for Bagnaskiz and the emperors and keeps Sbrimbrulòn's current sheets;
  a test checks the yellow eyes. The French marshal is the cast's own sheet.
- **Dedicated roles.** Fulk, the clerk, the abbot, the envoy, the bishop, Niketas, the cook, the
  sailmaker, the woman of Niketas's household, pilgrims, Venetians, a Greek citizen, the knight,
  the Varangian guard, Boniface, the young Alexios, the Doge, Santina, the Professor (his face for
  the dialogue box; the legs under the desk stay) now have their own art, replacing the code-drawn
  crowd and the shared `legate` / `greek` / `crowdA..C` stand-ins in the dream. The secondary cast
  is drawn as people, as delivered. Code-drawn figures remain only where no sheet exists (the
  neighbourhood dogs on the lawn, Santina's friend, the porter at Zara, the Green Zone cat) and as
  fallbacks if a sheet fails to load. The fights' lads and squires (2.3) use the pilgrim and
  knight sheets.
- **Speaking gestures** (delivered): a human speaker on stage plays his gesture once when his
  line starts, if he is standing idle.
- **Player-ready dogs.** The player skin accepts Sbrimbrulòn and Bagnaskiz in all their costumes.
  No story section was written for them (the delivery added none, and the story stays Zampanò's);
  `?as=sbrimbrulon|bagnaskiz` plays the story's scenes as the other dog in his own costumes, and
  every armoured skin carries the sword and the shield (`ARMOURED_SKINS`).
- **Notices** in the story now start below the HUD (a long objective with a progress bar pushed the
  bar under them).

## Color Ink environment delivery over the redesigned levels

- The delivered `public/environment-ink/` atlases are loaded locally and replace matching
  generated environment frames; the procedural art remains the guarded fallback. Character art,
  collision and story logic are outside this delivery.
- Story maps may use the manifest's authored floor compositions because they are visual-only and
  retain the current map dimensions, markers and collision. The current ground arrays remain
  authoritative.
- The arcade does **not** use the manifest's `1:arcade` cell composition. That composition was
  authored for the previous single corridor and validates only its unchanged 96 × 96 dimensions;
  applying it would ghost the obsolete path across the new branching park. The arcade still uses
  the delivered `ch01_greenzone` tile and prop art.
- The same delivery (`Supervillained_Complete_Level_Gameplay_Color_Ink_Implementation.zip`,
  made against commit 879ac0f) also redesigns the Green Zone: a deterministic 96 × 96 park built
  by `buildGreenZoneRows()` (a main route through linked districts, optional circuits, plazas,
  ponds crossed by gravel bridges), treats placed along one canonical shortest route
  (`placeTreats`), three progress-triggered pollution waves (`PollutionWaveDirector`, level data
  in `events.pollutionWaves`, one POLLUTION SURGE cue per wave), phase-offset tall-grass, pond and
  deep-water animation, chapter-coloured masonry in the ladders mini-game, and a paving motif on
  flat story stages (`structureStoryRows`: only walkable floors are swapped for one another, so
  speed, collision and markers are unchanged).
- Merged on top of the pixel-cast work (which came after 879ac0f): files only the delivery changed
  were taken as delivered; `storyScene.ts`, `world.ts`, `ASSETS.md` and this file were merged three
  ways (the chapter palette and floor design join the player-skin choice, `costume()`). The
  overlay's sources had Windows line endings and were converted to the repository's; the
  environment PNGs and `manifest.json` are byte-identical to the delivery.

## Armour in the whole dream; things you pick up are drawn

- **No more rag-cross sprite.** Sprite update 2's rag-cross sheet (`zampanoCross`, a 4-frame white
  dog with a red cross) still showed from the end of 1.5 to 2.3. In the dream Zampanò now wears
  the armour from 2.1 on (`dreamSkin`: the cross is enough), which the scenes already described
  ("his helmet is far too big", "a small knight of Picardy now"); the old sheet is archived and
  the `zampanoCross` key points at the knight's sheet, so it can never come back. On the lawn
  (1.5) he stays the plain dog and carries the rag on his back (a carried label): no armour in
  reality. Sword and shield still come with the `knight` mark at 2.3, so `knighted` now needs the
  armour *and* the mark; 2.3 hands him a sword, a sword belt and a shield instead of armour he
  is already wearing.
- **Spots you could not see.** `spot` pickups had no sprite: the red cloth (1.5), the arms (2.3),
  the empty berths (3.1), the horses (4.2), the lamp (7.9) were invisible, so a player could walk
  around looking for nothing and the scene seemed to hang. Every spot now has a pulsing ring on
  the ground, things lying there have a sprite (`Pickup.sprite`: `rag`, `sword`, `belt`,
  `shieldItem`, `lamp`, code-drawn in `placeholders/storyArt.ts`), and the three horses of 4.2
  stand where he feeds them (`horse`, three coats).
- The Color Ink frames were checked for the same symptom: none is blank and none ends above its
  ground anchor (nothing in the delivered banks floats).

## A scene's changes count once (attempts)

- **Bug**: a story scene applied its effects straight to the campaign and saved them half way
  through (`StoryScene.apply`). RESTART SCENE, or QUIT TO TITLE and CONTINUE, then played the
  scene again over the already-changed campaign: meters, Commozione costs and coins applied
  twice, and a flag set early in the scene could switch a `branch` on the second try. Measured
  through the real pause menu: three tries at 6.1 left Supervillain at 34 instead of 18 and the
  feeling faded twice (`npm run smoke -- progress` against the previous commit).
- **Rule now**: every attempt at a sub-level plays on a copy of the campaign
  (`campaign/state.ts` `beginAttempt`). The copy becomes the campaign and is saved when the scene
  is finished, or skipped from the pause menu (SKIP SCENE keeps what was done so far, as before).
  RESTART SCENE and QUIT TO TITLE drop it and keep only its play time (`keepAttemptTime`, also
  saved when the pause menu opens, so time is not lost if the app is closed while paused). The
  feeling fades once per attempt, on the copy, so a finished scene has faded exactly once; a
  restart no longer repeats its notice. Replays of finished scenes are attempts never committed.
- The pause menu's MERAVIGLIA BOOK shows the running attempt's book (what he found in this
  scene included). The save format is unchanged (version 2): no migration needed.


## Foundations: settings, transitions, the Back button, scene cleanup

A focused audit of the scene flow, input and lifecycle (this repository is the PixiJS track,
copied from `supervillained-vg1` branch `claude/gallant-pascal-wjy5l2`). Fixed what was shown to
break; the rest is in `docs/BACKLOG.md`.

- **Settings have one owner.** Mute, volume and text speed were changed by copy-pasted code in
  OPTIONS, the walk's pause menu and the story's pause menu, CONTROLS and the title's lives
  counter each saved on their own, and only some copies told the audio and input.
  `Game.updateSettings(change)` now applies, saves and notifies; the steps are pure
  (`nextVolume`, `nextTextSpeed`, `nextBinding`). Labels, steps and clicks unchanged.
- **Bug: a double tap on QUIT TO TITLE crashed the game.** A transition started while another's
  midpoint was pending ran that midpoint without taking it off first; `toTitle` starts a
  transition itself, so it ran again, without end (in a browser the tab died). Same for SKIP
  SCENE, CONTINUE after the walk (coins counted twice) and BACK on the story menu. The pending
  midpoint (and whatever it schedules) now runs once, in order (`fx/transition.ts`, tested), and
  presses and taps are dropped while a transition is about to change the scene (`Game.step`), so
  the leaving scene cannot act twice. Escape on a level's scene list no longer goes back twice
  (Escape sends `menu` and `back`; the second arrived after the first had started the change).
- **The Android Back button is decided by the scene on top** (`Scene.back()`), instead of two
  `instanceof` chains in `Flow` and `StoryFlow`. Same behaviour everywhere it worked; on a
  level's scene list it now goes back to the story menu, as Escape does (it did nothing). The
  story menu, cards, briefing and result screens still ignore Back. GLOSSARY and COUCH close with
  their click, as with Escape.
- **Bug: the MENU corner came back to life.** Every HUD registered Input's single `menu` button
  as enabled on each layout, and every scene on the stack is laid out on a resize (a mobile
  browser's bar showing or hiding is enough): a tap in the top-right corner of a pause menu then
  resumed the game, and on the title or the story cards the corner swallowed taps. A HUD now
  keeps the button's state, and a scene turns it off when it leaves.
- **Popup texts are freed with their scene.** Popups pool their texts out of the display tree,
  so destroying the scene never reached them, and each held a canvas texture on the GPU; a story
  scene's particle and popup layers were not destroyed at all. `Popups.destroy()` now runs when
  the walk or a story scene ends.
- **A level's scene list plays the menu music**, not the replayed level's music (still ducked
  after pause → SKIP during a replay).
- Checks: `npm run smoke` now ends with two groups of flow checks through the real menus,
  `progress` and `menus`, which fail on the previous code for each bug above.

## Unknown saves kept aside; no stale gesture streaks

- **A save the game does not know is kept aside.** `loadCampaign` started a fresh campaign for a
  save of any version other than 1 or 2 (one written by a newer game, or damaged: no version, or
  a garbled one), and the next save overwrote the player's data for good. It now copies such a
  save once, untouched, to `story-unknown-backup` (`UNKNOWN_BACKUP_KEY` in `campaign/state.ts`)
  before starting afresh, as a version-1 save is kept in `story-v1-backup`; a later unknown save
  never overwrites that copy. Empty storage and versions 1 and 2 load exactly as before. A save
  that is not valid JSON still reads as no save (`storage.get`). Tested in
  `tests/campaign.test.ts`.
- **A gesture's streak is not drawn again in the next scene.** `Input.lastGesture` outlives the
  scene (nothing else needs it cleared), and a new scene's `TouchControls` started counting at
  0, so it drew the previous scene's last swipe or double tap again for about half a second. The
  controls now start from the gesture that was last made when they are created
  (`ui/touchControls.ts`); gestures made after that show as before. Tested in
  `tests/touchControls.test.ts`.

## One confirm rule; Escape; mini-games from the keyboard; one music call

Fixes from `docs/BACKLOG.md`, made in parallel worktrees and each checked by two independent
reviewers before merging.

- **J and X confirm everywhere Space and Enter do.** They advanced dialogue and story cards but
  did nothing on menus, the choice wheel, the Briefing, "You've been supervillained", the Level
  End, the book, GLOSSARY / COUCH and the goodbye card. `Input.consumeContinue()` is now the one
  rule for continue / confirm / pick (Space, Enter, J, X, the PEE or round button); gameplay
  presses (walks, rhythm, ladders) are unchanged.
- **Escape closes OPTIONS and the NEW GAME? confirmation**, as the Android Back button already
  did. It still does nothing on the title (where Back quits) and on the story menu (a decision is
  pending, see the backlog).
- **The Briefing words its hints like the rest of the game** (`input.usingTouch`, set by the
  first real touch) instead of asking the browser whether a touchscreen exists: a touchscreen
  laptop played with keys no longer reads TAP TO START. On a phone the player has always tapped
  by then (title, cards), so it still says TAP.
- **The letter (5.4) and the rumour (6.2) can be played from the keyboard**, every outcome
  included (the letter's "named" ending was tap-only, the rumour tap-only altogether). The arrows
  move a highlight over the buttons (`ButtonPicker` / `KeyCursor` in `story/minigames/words.ts`,
  shared by both); confirm picks it. The highlight shows only after a key, so touch players see
  nothing new; with nothing highlighted, a first confirm press in the rumour shows it, and in the
  letter it sends and accepts as before (how the autopilot plays it). The other mini-games were
  checked: every outcome was already reachable with keys.
- **The rumour's heading fits the screen.** "ALEXIOS'S PROMISE, AS IT REACHED HIM" was wider than
  a phone (cut off on both sides); it now wraps above the paper. Its text widths are set on
  layout instead of every frame (each `setStyle` redrew the text).
- **One music call for a new screen**: `AudioEngine.playTrack(name)` (track, full level, start)
  replaces the three calls spelled out at each site and the two copies of `reading()`. The
  pause menus' ducking, the walk's attack ducking and the siren keep their own calls.
- **A press never picks an answer the player has not seen.** Found by the cross-check of the
  merged fixes: with fast text, a question's prompt is shown at once and looks like any line, and
  a J (or Space, Enter, a tap) pressed to skip it stayed queued and picked the first answer the
  moment the choices appeared (in 1.3, OFFER THE PAW, unread). The question now takes every press
  while its prompt shows, and ignores presses for `STORY.CHOICE_GUARD` (0.25 s) after the
  answers appear (the autopilot's pick waits out the same quarter second).
- **A stylus gets the touch hints** (`Input.usingTouch` counts `pen` pointers too): after the
  Briefing switched to `usingTouch`, an S Pen player on a phone would have read PRESS SPACE.
- **The rumour's highlight is pulled back as soon as its list shrinks**, not at the next key: a
  piece placed from the end of the list, followed by a new piece on the very next frame, lit the
  new piece by itself.
- Checks: `npm run smoke` gains the `keys` group and more `menus` checks (J on cards, menus and
  GLOSSARY; Escape on OPTIONS, NEW GAME? and the title; the Briefing's wording by keyboard and by
  touch; J mashed through a question at INSTANT text picks nothing); unit tests for the input
  rule, touch / pen / mouse hints, the keyboard highlight (a deterministic rumour order), both
  games and `playTrack`. Each new check fails on the code before its fix.

## Bagnaskiz's band waits half way (the Green Zone ambush)

The owner's design for the walk (story 1.0), which defines Zampanò as bullied: Bagnaskiz waits in
the middle of the level with his band (Jack and Watson); from a quarter of the way their voices
are heard and written, "HE'S COMING! HE'S COMING!" and "GET READY!", more and more often; when
Zampanò reaches the middle Bagnaskiz says "NOW!" and they jump in barking to frighten him and
poop everywhere.

- **Where**: on the road just before the middle plaza (45.2, 44.4), about 53 % of the way, so
  Zampanò coming up the road sees them waiting from about 40 % (Bagnaskiz sits; Jack and Watson
  watch for him). If he reaches the middle on another lane, they pop out a few tiles ahead of
  him instead (`AMBUSH.REACH`, `APPEAR_AT`). Who, where and the lines are level data
  (`LEVEL_1.events.ambush`), so a later level can have its own.
- **The voices**: from 25 % of the route, alternating Jack's and Watson's lines in their story
  colours, from where the band waits and kept inside the view below the HUD when that is off
  screen (ahead is up the screen); the interval shrinks from 3.4 s to 0.55 s and the bark under
  each line grows louder as he gets closer (the closest he has been counts: stepping back does not
  quieten them). The sound is the bark at three pitches until recorded voices exist.
- **NOW!** at 50 %: Bagnaskiz shouts (big, orange), a beat, they run at him (7.5 tiles/s), and
  he is frozen with fright for 2.4 s (a new `scared` state: the flinch, pale, trembling, "!!",
  a yelp, a small push away from Bagnaskiz) while they circle him barking. Each of the three
  poops twice where it stands (`Rules.dropPoop`: the piles pollute, spread, show on the radar and
  are cleaned by his pee for CLEAN! points, like his own, but are not counted in his POOPS or the
  pee-deficit penalty). Their circle widens from 2 to 3.4 tiles as they run round him, so the
  piles land 1.2 to 3.2 tiles away ("everywhere"): measured, a pee where he stands cleans about
  one, and the rest take moving round and two or three more pees (three charges, one back every
  18 s); until each pile is cleaned it keeps staining the ground around it. Then they run off
  and vanish.
- **Bagnaskiz's usual attack** (the pug that roams and pollutes, `threats.ts`) is held while he
  waits with his band and for 8 s after they leave (`AMBUSH.ATTACK_GRACE`): he cannot be in two
  places. The level's scripted attack moves from 56 % to 70 % (`events.underAttack`): at 56 % it
  fell inside the hold, and a player walking on reached the exit before the grace ended, so it
  never came; at 70 % he comes back alone in the second half of the walk.
- **Skipped** when Zampanò gets past 62 % without triggering it (a teleport in the screenshot
  scripts), so nothing is held then.
- **Review fixes** (an adversarial review of the first version, each finding checked by two
  skeptics): they chase where he is during the jump (walking away at NOW! no longer leaves him
  frozen with the band 5 to 9 tiles off); popping up ahead of him they are placed clear of hedges
  and trees (a body half inside one could not move again); Bagnaskiz's squat plays its whole clip
  sped up into 0.6 s and his next bark waits for it (it was cut off); the voices brighten in four
  steps (a pooled text kept its first glow); the shout's bark is never throttled away by a voice
  just before it; losing a life to hunger during the fright keeps him frozen.
- Pure sequence in `systems/ambushLogic.ts` (tested), the band in `systems/ambush.ts` (story
  `Actor`s), effects in `fx/gameFx.ts`, sounds in `fx/gameAudio.ts`, numbers in `AMBUSH`.
  Checks: `tests/ambush.test.ts`, `npm run smoke -- walk` (the whole sequence in the real game:
  silent before 25 %, the voices, the hold against a dirtied zone, NOW!, the barking, the fright,
  the spread piles, the band gone, the grace, Bagnaskiz back at 70 %, walking away at NOW!, the
  west trail, a teleport past it), `npm run screens -- ambush` (five pictures). Jack's and Watson's squat waits for their animation
  delivery (`ASSETS.md`).

## More treats, spread over the road and the loops

- **Level 1 has 44 treats instead of 30**, and they are where the player walks. The trail
  followed one BFS shortest route, which (taking west before north) hugs the park's west and
  south edges: all 30 treats lay on that gravel spine and none on the designed diagonal road,
  the one holding "up" follows. A bot walking the road ate 1 treat.
- **32 on the road** (`GREEN_ZONE_ROAD` in `levels/level1.ts`, now a module constant: the map
  is painted from it exactly as before, the rows are byte-identical): even spacing along the
  road, about one every 3.8 tiles from 2.5 tiles after the start to 2.5 before the exit, each
  wandering a little across the gravel and nudged sideways only off water, solid props or a
  treat too close. **12 on the side lanes**: progress 0.05–0.95 split into 12 bands, one treat
  per band on the gravel tile at least 6 tiles from the road that is farthest from every treat
  already placed, on alternate sides of the road (a review found the first version put 9 of 12
  in the west: the farthest tile is usually there). They land on the spine and the loops, 7 west
  and 5 east (near the exit only the west has lanes), a reward for a detour. Level data: `spawns.treats.route` and `side`; the distances in `TREAT`
  (`config.ts`). A level without a route places exactly as before (a test pins the positions).
- **Balance** (`tests/balance.test.ts`, walking speed, detours within 2.5 tiles): the spine bot
  now eats 9 treats (2 poops, hunger never below 77), the new road bot all 32 on the trail
  (8 poops, the test's bound, hunger never below 96). Eating every treat in the park means about
  11 poops (44 × 26 / 100) instead of 7: more food, and more to clean, by the player's choice.
  Measured on the way (already true before this change): walking the road straight to the exit
  without eating arrives with about 17 hunger, so on the road it is the stops (peeing, barking,
  chases, the pug) that make food necessary, not the distance alone.

## Separate MUSIC and SOUNDS levels

The owner asked for two levels in the settings, one for the music and one for the sounds, instead
of the single VOLUME.

- **Settings**: `music` and `sounds` (0..1) replace `volume`. SOUND: ON/OFF (`muted`) stays the
  master switch and keeps both levels for when it is back on. Each level steps OFF, 25, 50, 70,
  100 % and wraps (100 % → OFF); `nextLevel` and `levelLabel` (pure, tested) replace
  `nextVolume`. A level between steps (hand-edited storage) goes to the step just above it (the
  old `nextVolume` skipped one).
- **Old saves**: no version is needed. `loadSettings` gives a save without `music` / `sounds` its
  old `volume` for both (clamped), so a player hears exactly what he heard before (the old master
  gain moves onto the two buses: the product is the same); the next save drops `volume`. With
  nothing saved both start at `AUDIO.DEFAULT_VOLUME` (70 %). A save that is not an object (`null`,
  a number) now loads the defaults instead of throwing.
- **Audio**: the graph is unchanged (effects bus and music bus into the master). The master is
  0 or 1; the effects bus is `SFX_VOLUME` × SOUNDS; the music bus is the track's base × MUSIC × the
  ducking, so the pause menu, "under attack" and track changes keep the level. The arithmetic is
  one pure function, `busGains(settings, track, duck)` (tested), used at unlock, by
  `applySettings` (which now fades all three buses, so a level changed before the first tap
  applies from the first sound), `setDuck` and `setTrack`. Still GainNodes, never
  `element.volume`, which iOS ignores. With SOUNDS: OFF a one-shot effect is not played at all; a loop (the attack's siren) still runs, silent, on the effects bus at gain 0.
- **Menus**: OPTIONS reads SOUND, MUSIC, SOUNDS, TEXT, CONTROLS, LEVELS (REPLAY), MERAVIGLIA
  BOOK, BACK (8 rows: on the shortest screen, 192 × 310, the last ends at 285); the walk's pause
  menu RESUME, RESTART, SOUND, MUSIC, SOUNDS, QUIT TO TITLE. Labels like "SOUNDS: 100%" and
  "MUSIC: OFF" fit the pause menu's 132-px buttons. Changing SOUNDS plays a click at the new level
  (delayed `AUDIO.LEVEL_CLICK_DELAY`, 0.06 s, until the bus has faded to it); changing MUSIC
  plays nothing (the music is heard). The story's pause menu keeps SOUND alone.
- Checks: unit tests for the old-save migration, defaults, corrupted values, the steps and
  labels, `busGains`, and the engine's buses over a stand-in AudioContext (applySettings retargets
  music and effects, levels set before unlock apply at unlock, ducking and track changes keep the
  level); `npm run smoke -- menus` follows the new rows and changes MUSIC and SOUNDS from the
  keyboard in OPTIONS, then checks the save, the audio's settings and the labels.
