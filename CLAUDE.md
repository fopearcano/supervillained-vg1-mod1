# CLAUDE.md — SUPERVILLAINED

2D isometric game (browser + Android via Capacitor), **no game engine**. **One game, one story**
(title: NEW GAME / CONTINUE / COUCH / OPTIONS / GLOSSARY / QUIT), from the VG1 design PDFs ("Supervillained — VG1
implemented", then the level design revision "Supervillained VG1 — Levels implementation 2"),
rewritten as one dream of the Fourth Crusade seen by a small knight in Robert de Clari's place:
8 levels, 1.0 + 36 sub-levels. **The canonical story is `docs/STORY.md`** (sources, inventions
and save migration: `docs/STORY-SOURCES.md`); it wins over the PDFs where they differ.
- **1.0 The Green Zone** (`SPEC.md`, the former "arcade"): Zampanò, a Maltese dog, walks through a
  park: eat treats, pee to clean, avoid pollution, bark at the bully pug. It is the first scene
  of Level 1, played by `scenes/gameScene.ts` (`SubLevelDef.greenZone`), not by a story script.
- Then the rest of Level 1 (reality: the bucket, the lecture, the bowl, Santina's ball, the rag
  cross; he falls asleep under the Professor's desk at the end of 1.5), the Fourth-Crusade dream
  (levels 2–7: Champagne, Venice, the sea, Zara, the winter, Constantinople 1203–1204, with
  Villehardouin as the marshal and Niketas Choniates as the city's voice) and the return
  (level 8): dialogue, dream walks, mini-games and two endings (THE KNIGHT / THE WITNESS, decided
  at 7.8). No other crusade or dream cuts in; nothing physical comes back from the dream.

Decisions/deviations: `DECISIONS.md`. Sprite replacement: `ASSETS.md`. Delivered art goes in
`public/sprites/` and the game ships only the latest art; the art it replaces moves to
`art-archive/` (kept, not bundled).

## Commands

```bash
npm install
npm run dev          # Vite dev server on the LAN (open the printed Network URL on a phone)
npm run build        # typecheck (tsc --noEmit) + production build into dist/
npm run typecheck
npm test             # Vitest (pure logic)
npm run screens      # Playwright verification screenshots → docs/screens/ (all scenarios)
npm run screens -- m1 joystick   # selected scenarios (see scripts/screenshot.mjs)
npm run smoke        # plays every story sub-level start to finish (fails on errors / missing textures),
                     # then the flow checks: saving (restart / quit / skip) and menus / Back button
npm run smoke -- 7.3 8.1         # selected sub-levels
npm run smoke -- progress menus keys  # only the flow checks (any group alone works too)
npm run playtest     # the autopilot plays the whole campaign for real → report (fails if a sub-level can't be won)
npm run playtest -- --skill 0.4 --ending alpha --choice random --from 5.1 --out docs/PLAYTEST.md
npm run playtest -- --from 3.1 --to 3.4          # one level
npm run android:apk  # web build + cap sync + Gradle debug APK (needs JDK 21 + Android SDK 36)
npm run android:release  # the same, shrunk with R8 (about 23 MB less code): the APK to hand out
npm run ios:sync     # web build + cap sync ios (the Xcode project in ios/; building it needs a Mac)
npm run ios:open     # open it in Xcode (macOS)
npm run ios:icons    # app icon + launch images from branding/logo.png (same script as android:icons)
```
iOS without a Mac: `.github/workflows/ios.yml` builds an unsigned `.ipa` and a simulator app on a
GitHub-hosted Mac at every push that touches the game or `ios/` (artifact *SUPERVILLAINED-ios*).

Debug URLs: `?skip=game` (straight into the Green Zone walk, outside the story), `?story=7.3` (straight into a story
sub-level), `?auto=1` (the autopilot plays the story; `&skill=0.7&ending=knight|alpha&choice=first|last|random`),
`?as=sbrimbrulon|bagnaskiz` (the story's scenes played as that dog, in his own costumes),
`?debug=sprites&char=zampano|bagnaskiz|cat|<cast key>`.
`window.__sv` exposes the game for automation (`__sv.scene()` = top scene, `__sv.top()`,
`__sv.storyIds()`, `__sv.flow.story.debugPlay(id)`; a `StoryScene` has `debugState()`,
`debugSkip()`, `marker(m)`).

## Architecture (src/)

- `config.ts` — **every tuning number** (speeds, timers, radii, scores, thresholds; `STORY` for the
  campaign: walks, mini-games, Commozione costs, companion thresholds, Grace tiers, text speeds,
  autopilot). Never hardcode gameplay numbers elsewhere (per-scene values in chapter scripts are
  level data).
- `core/` — `game.ts` (services: renderer, input, scenes, loop, resize; `updateSettings` is the one
  way to change a setting: applies, saves, tells audio and input), `loop.ts` (fixed 60 Hz
  step + interpolation), `input.ts` (keyboard, floating joystick, touch buttons, taps, right-hand
  gestures: swipe up / down and double tap, bound by the CONTROLS settings; RUN held or toggled;
  actions `action` (the round button), `bark`, `strike`, `guard`, `switch`; `consumeContinue()` is
  the one rule for continue / confirm / pick: Space, Enter, J, X, taps aside), `settings.ts`
  (sound, text speed, lives, `controls`),
  `scene.ts` (scene stack; a scene's optional `back()` is what the Android Back button does on it),
  `display.ts` (logical resolution + integer scale), `assets.ts`
  (texture registry + atlas packer), `storage.ts` (guarded localStorage), `rng.ts`.
- `iso/` — `projection.ts` (grid↔screen, screen-direction → grid, 8 directions), `depth.ts`
  (painter's sort, occlusion test), `camera.ts`.
- `world/` — `tiles.ts` (ground types, props, ASCII legend), `level.ts` (level types + ASCII parser
  + `loadLevel`), `map.ts` (runtime map: collision, pollution field, zone health, BFS distances),
  `mapRenderer.ts` (chunked ground sprites + pollution overlays).
- `levels/` — level data (`level1.ts`) and registry (`index.ts`).
- `entities/` — `Entity` base (grid position, interpolation, view), `CharacterAnimator`,
  `Zampano`, `PropEntity`, …
- `systems/` — gameplay rules as small, mostly pure classes (unit-tested). `ambushLogic.ts` (the
  band's ambush as a pure sequence) and `ambush.ts` (Bagnaskiz, Jack and Watson as story `Actor`s
  in the Green Zone: waiting half way, voices, NOW!, the fright, their poop via
  `Rules.dropPoop`); who, where and the lines are level data (`events.ambush`), timings `AMBUSH`.
- `ui/` — `pixelFont.ts` + `pixelText.ts` (crisp bitmap text with glow/outline), HUD, touch controls
  (`touchControls.ts`: the action button's modes, the switcher, gesture hints, left-hand mirror),
  `titleArt.ts` / `titleAnim.ts` (title portrait: the animated GIF decoded with `ImageDecoder`).
- `fx/` — particles, popups, screen effects, glitch filter.
- `scenes/` — `flow.ts` (title → new game / continue / options / quit; plays the 1.0 walk for the
  story), Title, Options, Confirm, Goodbye, Briefing, Game (the walk), Pause, LevelEnd, GameOver,
  `supervillainedScene.ts` (the "You've been supervillained" snap at the end of every level),
  `glossaryScene.ts` / `couchScene.ts` (the title's GLOSSARY and COUCH cards; `ui/card.ts`),
  sprite viewer. `core/native.ts`: QUIT closes the app on Android and SUPERVOID EDITIONS opens
  the publisher's site in the phone's browser (`QuitPlugin.java`: `quit`, `openUrl`).
- `world/world.ts` — the shared isometric stage (map + renderer + layers + camera + entities),
  used by the arcade `GameScene` and by story stages.
- `campaign/` — the VG1 campaign as data: `state.ts` (meters, flags, book, unlocks, ending, play
  time, last saved; pure, tested), `summary.ts` (the saved story at a glance, for COUCH), `titles.ts`, `home.ts` (8.2 marvel → object at home), `chapters/ch1..ch8.ts` (one file
  per level: sub-levels with `happens`, `source` (chronicle references or ADAPTATION), and a `script()` that
  returns `Step[]`), `chapters/helpers.ts` (`followLeader`, `lullWalk`, `placeObject`,
  `sounder`, `walkableNear`).
- `story/` — the story engine: `step.ts` (Step interface), `steps.ts` (script vocabulary: say, ask,
  card, stage, move, walk, mini, branch, fx…), `walk.ts` (dream walk: reach,
  pickups, sight cones, pace/nerve, thirst, scramble, fire), `minigames/`, `storyScene.ts` (runs a
  script over a World stage), `ui.ts` (dialogue box + choice wheel, cards, story HUD with meters),
  `combat.ts` (BARK / SWORD / SHIELD in every walk; `walk({ fight })` makes foes swing back; rules
  in `systems/combat.ts`, numbers in `COMBAT`),
  `screens.ts` (story menu, level's sub-level list, cards, pause, Meraviglia book), `storyFlow.ts`
  (menu → cards → sub-level → Professor aside → ending; every attempt at a sub-level plays on a
  copy of the campaign, `beginAttempt`, which becomes the campaign and is saved only when the
  scene is finished or skipped; RESTART SCENE / QUIT TO TITLE keep only its play time; replays are
  attempts never committed),
  `maps.ts` (story stages + palettes/themes), `carry.ts` (what he carries, shown over his head),
  `names.ts` (names shown in yellow in the card texts; the period words, `OLD_WORDS`, coloured in the dialogue box),
  `dialogueGestures.ts` (a human speaker on stage gestures when his line starts),
  `autopilot.ts` (automated player: steps and
  mini-games implement an optional `pilot()` that drives the real inputs).
- `entities/actor.ts` — scripted characters (idle/patrol/chase/flee/follow/wander/flail/goto/fly,
  sight cones, hostile contact; a character with a `sit` animation sits after 3 s still;
  `playAction(anim, seconds?)` plays an action in place, then the behavior resumes).
- `assets/` — `manifest.ts` (all sprites: sizes, anchors, anims, delivered `sheet`/`animSheets`;
  `PLAYABLE_CHARACTER_KEYS`, `costumeFor`, `ARMOURED_SKINS` for the player-ready dogs),
  `build.ts` (load the delivered PNGs or generate placeholders), `environment.ts` (the Color Ink
  environment atlases in `public/environment-ink/`: chapter palettes, native tile/prop frames,
  visual-only story floor designs; procedural fallback), `placeholders/*` (procedural
  pixel art for the cast without delivered sheets, and the fallback environment art), `fonts/`.
- Repo-root `assets/music` and `assets/sounds` — recorded audio, wired in `src/fx/audioFiles.ts`
  (table in `ASSETS.md`); `core/audio.ts` plays them (sfx decoded, music streamed) alongside the
  synthesized sounds of `fx/sounds.ts`.
- `ios/` — Capacitor iOS project (committed; Swift Package Manager). Custom bits:
  `MainViewController.swift` (registers the plugin, screen kept on, no status bar, portrait),
  `AppQuitPlugin.swift` (`openUrl` → Safari; `quit` unavailable, iOS apps do not close),
  portrait/fullscreen keys in `Info.plist`, the shared `App` scheme. `App/App/public` is generated.
  The canvas is laid out inside the safe area (`safeAreaInsets` in `core/display.ts`).
- `android/` — Capacitor project (committed). Custom bits: `MainActivity.java` (immersive
  fullscreen, keep-screen-on, back button → `svback` window event), portrait lock in
  `AndroidManifest.xml`, fullscreen themes in `res/values/styles.xml`, icons/splash generated from
  `branding/logo.png` (`npm run android:icons` → `scripts/gen-android-assets.mjs`, which also writes
  the web icons in `public/`). `app/src/main/assets/public` is generated by `cap sync`.

## Common changes

Where each kind of change goes, and what to run after it. Run the commands from the repository
root, and never edit `src/` while `smoke`, `playtest` or `screens` runs: they use the Vite dev
server, which reloads the page on every change and breaks the run.

- **A story scene (sub-level)**: add it to its level's `subLevels` in
  `src/campaign/chapters/chN.ts` with `id`, `title`, `happens` (the card), `source` and a
  `script()` returning steps from `story/steps.ts` (`stage`, `say`, `ask`, `card`, `walk`,
  `mini`, `branch`, `fx`...). A new stage goes in `story/maps.ts` (`STORY_MAPS`: ASCII rows, digits
  are markers). Update `docs/STORY.md`. Run `npm test` (the campaign tests check ids, scripts and
  maps), `npm run smoke -- N.M`, then `npm run playtest -- --from N.1 --to N.9`.
- **A walk objective or a mechanic inside a walk**: an option of `walk()` (`story/walk.ts`:
  `goal`, `pickups`, `need`, `survive`, `pace`, `fight`, `onAction`, `onUpdate`...). If the
  autopilot cannot infer it from `goal`/`pickups`, add a `pilot` hint, or the playtest will fail.
  Numbers go in `config.ts` (`STORY`), not in the script. Rules that can be pure (meters, costs,
  endings) go in `campaign/state.ts` with a test.
- **A mini-game**: a `MiniGame` subclass in `story/minigames/` (`start`, `update` returning
  `'running' | 'won' | 'lost'`, and a `pilot()` strategy), used with `mini(() => new X(), { won,
  lost })`. Read input as actions and taps, never raw keys; every outcome a tap can reach must be
  reachable from the keys too (a list of buttons: `ButtonPicker` in `story/minigames/words.ts`,
  arrows + `consumeContinue()`). Set text widths in `onLayout()`, not every frame (`setStyle`
  redraws the text). `npm run smoke -- keys` plays the letter and the rumour from the keyboard.
- **A screen (menu, card, overlay)**: a class implementing `Scene` (`core/scene.ts`): a `root`
  container, `update(dt)`, `resize(w, h)`, and `back()` if the Android Back button should do
  something on it (usually what Escape does). Push it from `scenes/flow.ts` or
  `story/storyFlow.ts`; menus use `ui/menu.ts`; continue / confirm with
  `input.consumeContinue()`; Escape is `input.consume('back')`. Change scenes inside `game.transition.play(mid)`
  (the flows' `glitch()`): presses during the first half are dropped, so a double tap cannot run an
  action twice.
- **Green Zone walk (1.0) rules**: `systems/` (pure, tested: needs, scoring, threats, lives,
  ambush) and `scenes/gameScene.ts` (the scene that hosts them); tuning in `config.ts`; level
  data (treats, waves, the band's ambush) in `levels/level1.ts`. Nothing plays the walk in
  `npm run playtest`: check it with `npm run smoke -- walk` and `npm run screens -- ambush m1 m2 m3
  m4`.
- **Art, animations, sounds, music**: `ASSETS.md` (the manifest in `src/assets/manifest.ts`, never
  game logic). Run `npm test` (sprite tests), `npm run screens`, and look at the PNGs.
- **Settings**: add the field to `Settings` in `core/settings.ts` with a default in
  `loadSettings` (old saves lack it), change it only through `game.updateSettings`, test it in
  `tests/settings.test.ts`.
- **Saves and progression**: the campaign is `campaign/state.ts` (`CampaignState`, version 2),
  saved in localStorage under `supervillained:story`. Story scenes play on a copy of it (an
  attempt, `beginAttempt`) that `StoryFlow` commits and saves when the scene ends; nothing a script
  does is saved half way. A field added with a default needs no new version (`loadCampaign` fills
  gaps). Renaming scene ids, changing what a flag or a completed scene means, or removing data
  needs `STORY_VERSION + 1`, a pure `migrateVn` that keeps what still makes sense, the old save
  kept aside, a notice if played scenes are lost, and tests with a realistic old save (see
  `migrateV1` and its tests). Then `npm run smoke -- progress`.
- **Android**: game code needs no Android change: `npm run android:sync` copies the web build.
  Native behaviour (fullscreen, Back → `svback`, QUIT, links) lives in
  `android/app/src/main/java/com/zampano/supervillained/` and is reached from the game only
  through `core/native.ts` and `scenes/flow.ts` `back()`. Build with `npm run android:apk` (JDK
  21, Android SDK 36; set `ANDROID_HOME` or `android/local.properties`).
- **Which checks**: every change: `npm run build` and `npm test`. Story or maps: `npm run smoke`
  for the touched sub-levels. Gameplay, walks, mini-games: `npm run playtest` (whole campaign,
  about 10 minutes) and read the report. Menus, flow, saving, Back, keys: `npm run smoke --
  progress menus keys`. Anything visible: `npm run screens` and look at the PNGs. Android code or config:
  `npm run android:apk`. Known gaps and open bugs: `docs/BACKLOG.md`.

## Conventions

- TypeScript strict, ES modules, `import type` for types (`verbatimModuleSyntax`).
- Grid space: tile (i, j) covers [i, i+1) × [j, j+1); entity positions are floats `gx, gy`.
  Screen: `sx = (gx - gy) * 16`, `sy = (gx + gy) * 8`. Map rows = gy, columns = gx.
- Directions (`Dir8`) are screen-space names: N = up on screen.
- Logic in fixed steps (`update(dt)`), visuals in `render(alpha)`; entities call `savePrev()` at
  the start of each step so rendering can interpolate.
- Everything visible in the world goes through the depth-sorted `objectLayer` (props, characters,
  items). Ground decals live in the map renderer / decal layer.
- No new runtime dependencies without a note in `DECISIONS.md`. No CDN resources (offline).
- Game text in English, uppercase pixel font. Story text is written uppercase in the scripts
  (values are stored in mixed case and uppercased for display).
- Story maps: digits are markers used by scripts (`'1'`, `ctx.marker('1')`); `S` is the start.
  A missing marker throws — run `npm run smoke` after editing maps or scripts.
- Meter rules live in `campaign/state.ts` (pure, tested): `fadeCommozione`, `graceTier`,
  `endingNotes`, `ending`. Choices that are big actions take `cost` (Commozione).
- Story changes: keep `docs/STORY.md` (and the scene's `source`) in step with the script. Quote a
  chronicle only from an edition listed in `docs/STORY-SOURCES.md`, never invent a quotation or a
  page reference, and mark invented material as ADAPTATION. Renumbering or changing the meaning of
  saved scenes needs a new save version with a migration in `campaign/state.ts` (see `migrateV1`)
  and a test.
- Scripted characters walk in straight lines (no pathfinding): give `followLeader` paths whose
  segments stay on walkable ground, and test a level with `npm run playtest -- --from 3.1 --to 3.4`.
- A new walk objective the autopilot can't infer from `goal`/`pickups` gets a `pilot` hint in the
  `walk()` definition; a new mini-game gets a `pilot()` strategy. Fights (`fight`) are piloted by
  the walk itself (go for foes, shield up when a ring fills, strike when open).
- Fights are non-lethal (foes are routed, Zampanò is knocked down and retries); sword and shield
  only while he wears the knight's costume. Mark new fights ADAPTATION in `docs/STORY.md`. After gameplay changes run
  `npm run playtest` and read the report.
- After each milestone: `npm run build`, `npm test`, `npm run screens`, look at the PNGs, commit.
