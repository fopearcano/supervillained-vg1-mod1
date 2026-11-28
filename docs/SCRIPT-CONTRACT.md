# Script contract

This is the list that BLUEPRINT.md, Rule 2, lock 13 ("Script contract") refers to. It names every part of the game that the scripts in `scripts/*.mjs` reach at runtime: `window.__sv`, class names read through `constructor.name`, fields and methods of scenes, steps, mini-games, menus, the HUD, the touch controls, the effects, the dialogue box and the cards, URL query parameters, localStorage keys, DOM ids and events, the console texts the scripts match, and the browser APIs the harness wraps. Each entry gives the script lines that use it and the src line that defines it today. A restructure step may rename, move or hide one of these only if the same commit updates every script line listed. This list must be regenerated from the scripts before any restructure step that renames or moves these names, step 1 included.

**Generated at** HEAD `699e37c`. `scripts/` and `src/` there are byte-identical to `abc7662`. Since `ee9756d`, src differs in one place: `src/story/walk.ts:492-494`, the flame-frame fix of `abc7662`. That moves `WalkStep.stop` from line 652 to line 654. No other src line listed here moved. Scripts covered: `playtest.mjs`, `story-smoke.mjs`, `screenshot.mjs`, `capture_environment_screens.mjs`, plus `harness.mjs`, `lock.mjs` and `lockCaptures.mjs`, which were added by Step 0. `gen-android-assets.mjs` reaches no game name: it only reads `branding/logo.png` and writes icon files.

**Aliases.** `playtest` = scripts/playtest.mjs, `smoke` = scripts/story-smoke.mjs, `screens` = scripts/screenshot.mjs, `envshots` = scripts/capture_environment_screens.mjs, `harness` = scripts/harness.mjs, `lock` = scripts/lock.mjs, `captures` = scripts/lockCaptures.mjs. Src paths are relative to `src/` unless stated otherwise.

**private** marks a TypeScript `private` or `protected` member, or a class the module does not export, that a script reads or writes at runtime. TypeScript privacy disappears at compile time, so these work today. Turning one into a `#private` field, a closure variable or a renamed member breaks the script without a type error. Most reads are optional-chained, so they turn into `undefined`, and a check can then pass with nothing tested or a loop can run to its limit.

**How to regenerate.**

```
grep -nE "__sv|__harness|constructor\.name|localStorage|sessionStorage|svback|#game|[?&](story|skip|auto|art|as|debug|char|skill|ending|choice)=|missing texture|GL_INVALID" scripts/*.mjs
```

Then follow every variable bound to a scene or step through its uses (`const s = window.__sv.top()`, `scene()`, `top.current`, `s.ambush`, `g = top.current?.game`). Look each member up in src.

## 1. The automation hook `window.__sv` (main.ts:82-96)

| Member | What it is | Scripts | Defined |
|---|---|---|---|
| `__sv.game` | the Game | all except lock | main.ts:83 |
| `__sv.flow` | the Flow | playtest, smoke, screens, captures | main.ts:84 |
| `__sv.scene()` | `game.scenes.top` when the URL has `?story=`, otherwise `flow.current ?? game.scenes.top` | screens:51, 516, 526, 539, 552, 568, 574, 604, 626, 645, 663, 667, 684, 687, 691, 693, 699, 702, 707, 717, 719, 722, 727, 745, 766, 775, 786, 796, 816, 823; smoke:503, 524, 532, 537, 543, 551, 559, 579, 588, 599, 608, 616, 622, 632, 639, 651, 756; captures:30, 150, 174, 186, 215, 235, 252, 257, 273, 279, 285, 288, 312 | main.ts:85 |
| `__sv.top()` | `game.scenes.top` | harness:239; playtest:69, 76; envshots:77, 84, 87, 97; captures:18, 39, 42, 51, 59, 100, 116, 127, 317, 323, 346, 348, 352, 366, 382, 402, 432, 438; screens:71-493, 610-634, 809 (32 sites); smoke:59-477, 684-814, 896, 914, 930 (38 sites) | main.ts:86 |
| `__sv.storyIds()` | the scripted sub-level ids (all but the Green Zone) | smoke:898 | main.ts:88 |
| `__sv.step(n)` | `game.loop.stepNow(n)`: n updates of LOOP.STEP (1/60 s), then one render; `step(0)` only renders | harness:273, 299; playtest:68; smoke:545, 590, 679 | main.ts:89; core/loop.ts:68-71 |
| `__sv.art()` | `{ bank, loadedZones, warnings }` | smoke:242-245, 283; envshots:79-81 | main.ts:91; assets/environment.ts:110-112 |
| `__sv.faceToward(x, y)` | turns `flow.current`'s player | screens:677; captures:245 | main.ts:92-95 |
| boot signal: `window.__sv && window.__sv.top()` is truthy | `__sv` is assigned after the first scene starts | harness:239; smoke:896; envshots:77; screens:51 (polls `scene()`) | main.ts:76-82 |

## 2. Game services (core/game.ts, core/loop.ts)

| Member | Scripts | Defined |
|---|---|---|
| `game.loop.stop()` | harness:240; playtest:54; smoke:714 | core/loop.ts:62-65 |
| `game.loop.start()` | smoke:775 | core/loop.ts:45-60 (main.ts:59 starts it at boot; under the harness its requestAnimationFrame never calls back) |
| `game.loop.stepNow(n)` (through `__sv.step`) | see 1 | core/loop.ts:68-71 |
| `game.time` (must still be 0 after the boot, so the boot runs no step) | harness:243-244; smoke:145, 147 | core/game.ts:26, 75 |
| `game.input` | see 3 | core/game.ts:14 |
| `game.audio` | see 10 | core/game.ts:24 |
| `game.canvas` (`getBoundingClientRect`) | smoke:340; screens:350 | core/game.ts:30 |
| `game.width`, `game.height` (logical px, 216 wide) | smoke:341; screens:351, 474, 809 | core/game.ts:51-57; main.ts:25 |
| `game.view.scale` | screens:809 | core/game.ts:25; core/display.ts:8 |
| `game.updateSettings(fn)` | smoke:195, 232, 437, 467; screens:387 | core/game.ts:63-67 |
| `game.transition.busy` and `.swapping` (only the proposed controls guard uses them) | none yet | fx/transition.ts:19-26 |

## 3. Input (core/input.ts)

| Member | Scripts | Defined |
|---|---|---|
| `input.trigger(action)` | captures:13; smoke:681 | input.ts:344-346 |
| actions triggered: `menu`, `back`, `confirm`, `down`, `right`, `pee`, `bark` | captures:105, 106, 132, 134, 203, 247, 299, 307, 310, 416, 419; smoke:724, 726, 741, 753, 767, 769 | input.ts:21-35 (`Action`) |
| `input.override` = `{ x, y }` or null (movement held) | captures:24, 26, 278, 280, 316, 318 | input.ts:205; read in `update` 245-249 |
| `input.pushTap(x, y)` (logical px; 108, 250 is the middle of the view) | captures:301, 304 | input.ts:349-351 |
| `input.usingTouch` (read; screens writes `true`) | smoke:358, 476; screens:337 | input.ts:155 |
| `input.joystickEnabled` | smoke:690, 760 | input.ts:153; written by ui/touchControls.ts:213 |
| `input.buttons` (a Map): `.get(id)` then `.enabled`, `.x`, `.y` | smoke:690, 761; screens:379-380 | input.ts:156; `VirtualButton` 86-96 |
| button ids `bark` (its action is `action`), `pee`, `run`, `switch` | smoke:690, 761; screens:379 | ui/touchControls.ts:185-190 |
| button id `menu` | smoke:761 | ui/hud.ts:125 (Green Zone); story/ui.ts:347 (story: at w - 14, 12, radius 14, the MENU corner that smoke:339-343 taps) |
| `input.gestureZone` `{ x, y, w, h }` | screens:354-356 | input.ts:158; set at ui/touchControls.ts:182 |
| `input.lastGesture` | screens:365 | input.ts:165, 332-337 |
| key codes pressed as real DOM keys (only smoke and screens do this): Escape (`menu` + `back`), Enter (`confirm`), Space (`pee` + `confirm`), KeyJ and KeyX (`action`), KeyU (`strike`), KeyW, KeyS, KeyD, the arrows, ShiftLeft (run) | smoke:65-71, 138-143, 174-177, 301-313, 353-373, 388-399, 413, 429, 433, 455, 462, 553-555, 601-626, 820-874; screens:65, 181-212, 433, 467-472, 510-511, 570, 585, 596-600, 620-621, 679, 731-733, 756, 762-764, 783 | input.ts:124-146 (`KEY_ACTIONS`); Shift at 208-217 and 258 |
| real pointer input (smoke and screens): a joystick drag from css (110, 640), taps at css (200, 500), swipes inside `gestureZone`, the switcher at its button's x and y, the glossary footer | screens:91-105, 355-361, 382, 476, 591, 594, 758, 760, 803, 817-822; smoke:343, 472 | input.ts:373-475; joystick zone ui/touchControls.ts:180-181 |

## 4. Flow and StoryFlow

| Member | Scripts | Defined |
|---|---|---|
| `flow.current` (the GameScene; also the title's backdrop) | smoke:255, 259, 264, 411, 415 | scenes/flow.ts:57-59 |
| `flow.toTitle()` | smoke:379, 774; screens:176, 268, 295, 582, 754 | flow.ts:62-99 |
| `flow.play(level)` (what `?skip=game` does: no briefing) | smoke:166, 518, 597, 614, 630, 649 | flow.ts:211-218 |
| `flow.playGreenZone(level, done)` | smoke:748 | flow.ts:180-190 |
| `flow.restart()` | screens:622 | flow.ts:220-223 |
| `flow.back()` | screens:806 | flow.ts:285-288 |
| `flow.story` | everywhere | flow.ts:41 |
| `story.debugPlay(id)` | playtest:56; smoke:84, 107, 330, 368, 444, 716, 731, 809, 906; screens:119, 199 | story/storyFlow.ts:395-404 (calls `startSub` 232; for `greenZone` it calls `playGreenZone` 239) |
| `story.debugReset()` | playtest:55; smoke:80, 421, 715 | storyFlow.ts:389-392 |
| `story.debugSkipCurrent()` | playtest:78 | storyFlow.ts:383-386 |
| `story.log` entries: `id`, `time`, `metrics`, `meters`, `skipped`, `ending`, `greenZone`; the id `'ending'` | playtest:79-80, 94, 101-125 | storyFlow.ts:42; `PlaytestEntry` 24-33; pushed at 236, 264, 310 |
| `story.state` (smoke sets `meters.commozione` and pushes onto `completed`) | smoke:81-83, 422-423 | storyFlow.ts:36 |
| `story.newGame()` | smoke:350, 470; screens:800 | storyFlow.ts:66-71 |
| `story.continueGame()` | screens:299 | storyFlow.ts:74-80 |
| `story.openMenu()` | smoke:299, 323; screens:147, 187 | storyFlow.ts:129 |
| `story.showEnding()` **private** | screens:219 | storyFlow.ts:307 |
| `story.autopilot` (set from `?auto=1`; seed = policy seed + log length) | playtest:48 (URL) | storyFlow.ts:38, 248; main.ts:62-72 |

## 5. Classes read through `constructor.name`

The dev server serves unminified ES modules, so `constructor.name` is the class name in the source. No script runs against the production build.

| Class | Scripts | Defined |
|---|---|---|
| StoryScene | smoke:91, 96, 347, 376, 728; captures:417, 420 | story/storyScene.ts:43 |
| GameScene | smoke:172, 367, 765, 771; captures:308 | scenes/gameScene.ts:36 |
| TitleScene | smoke:103, 179, 191, 259, 274, 280, 322, 327, 402, 405, 416, 431, 435 | scenes/overlays.ts:77 |
| OptionsScene | smoke:189, 416; captures:102 | overlays.ts:710 |
| ControlsScene | smoke:187; captures:107 | overlays.ts:802 |
| BriefingScene | smoke:356, 479, 752 | overlays.ts:417 |
| PauseScene | smoke:170, 771 | overlays.ts:490 |
| LevelEndScene | screens:615; captures:323 | overlays.ts:555 |
| ConfirmScene | smoke:431 | overlays.ts:884 |
| GameOverScene (printed only) | screens:634 | overlays.ts:670 |
| StoryCardScene | smoke:356; screens:493; captures:438 | story/screens.ts:13 |
| StoryMenuScene | smoke:309, 318 | story/screens.ts:78 |
| StoryChapterScene | smoke:304, 318 | story/screens.ts:142 |
| StoryPauseScene | smoke:333, 345, 376 | story/screens.ts:201 |
| SupervillainedScene | screens:487, 610; captures:317, 431, 435 | scenes/supervillainedScene.ts:25 |
| GlossaryScene | smoke:402; captures:130 | scenes/glossaryScene.ts:33 |
| CouchScene | captures:118 | scenes/couchScene.ts:32 |
| WalkStep **private** (module-private class) | playtest:72; smoke:43, 699, 728, 741, 745, 924; captures:67, 80, 347, 364, 380, 394, 414; screens:113, 121, 231, 339, 413, 426 | story/walk.ts:174 |
| ResumeStep | playtest:71; smoke:708; captures:52 | story/step.ts:27 |
| SayStep **private** (module-private) | screens:411, 412, 415 | story/steps.ts:28 |
| AskStep **private** (module-private) | smoke:43, 448, 465; captures:80; screens:144, 201 | story/steps.ts:91 |
| CardStep **private** (module-private) | screens:131 | story/steps.ts:175 |
| MiniGameStep **private** (module-private) | smoke:43, 813, 829; captures:80 | story/minigames/miniGame.ts:41 |
| LetterGame | smoke:804, 829, 833-855 | story/minigames/words.ts:173 |
| RumourGame (extends the module-private WordGame, words.ts:115) | smoke:860-876 | words.ts:294 |
| all six mini-games, through `metrics.minis` entries `<ClassName>:<won or lost>`, printed in the playtest report with `Game` removed: RhythmGame, LetterGame, RumourGame, LaddersGame, TugGame, BoatGame | playtest:116; smoke:829 | miniGame.ts:61; rhythm.ts:34; words.ts:173, 294; action.ts:40, 262, 328 |

Notes. Scripts read a step's kind as `debugState().step`, which is `current.constructor.name` (storyScene.ts:524). For a walk resumed after a cut-in it is the wrapper's name, `ResumeStep`. The scripts that need the walk itself unwrap `.inner` (playtest:70-71, smoke:707-708, captures:51-52). Renaming any of the six mini-game classes changes the playtest report, so the playtest lock fails. For each sub-level, the smoke also prints every step kind it saw (smoke:922, 937-941), including `Object` for literal steps such as `call` (steps.ts:218-225). That is output only.

## 6. StoryScene (story/storyScene.ts)

| Member | Scripts | Defined |
|---|---|---|
| `current` **private** (the running step, null between steps) | playtest:70, 73; smoke:440, 707, 795; captures:51; screens:372, 391 | 65 |
| `controlsWanted` **private** | playtest:72; captures:402 | 316; written only by `setControls` (297) |
| `debugState()`: `sub`, `finished`, `time`, `metrics` (`choices`, `minis`), `step`, `queue`, `player` (`gx`, `gy`), `meters` | playtest:72-80; smoke:447, 461-466, 698, 793-802, 914-931; captures:39, 346; screens:71, 79, 96, 130-131 | 517-529 |
| `debugSkip()` | smoke:449, 700, 814, 931; captures:42, 348, 432; screens:82, 132, 321, 488; envshots:87-89 | 512-514 |
| `marker(m)` returns `{ x, y }` (throws on a missing marker) | smoke:737; captures:60; screens:90, 124 | 211-223 |
| `player` (getter): `setPosition` (entities/entity.ts:33), `animator.key` (entity.ts:76), `gx`, `gy` | smoke:738; captures:61; screens:125, 344, 429, 436 | 253 |
| `world.snapCamera()` | screens:345, 430 | 59; world/world.ts:140 |
| `mapKey` | envshots:84 | 60 |
| `dialogue.root` (envshots sets `visible` to false) | envshots:98 | 51; story/ui.ts:69 |
| `dialogue.full` **private** (the line being typed) | screens:319 | story/ui.ts:81 |
| `cards.root` (envshots sets `visible` to false) | envshots:99 | 52; story/ui.ts:257 |
| `controls.root.visible` | smoke:690 | 53; ui/touchControls.ts:66 |
| `visor` | captures:366, 382 | 398 |
| `fog` | captures:346, 352 | 401 |
| `knighted` (getter) | screens:436 | 261-264 |
| `actionMode` | screens:384 | 322 |
| `state.meters`, `state.flags` | smoke:60, 803 | 85 |
| `sub.id` | smoke:60 | 87 |
| `apply(effects)` | smoke:63 | 368-371 |
| `metrics` (read through `debugState` and `story.log`) | playtest:107-118; smoke:465-466, 802 | 80 |
| `back()` (Android Back opens the pause) | smoke:332 (svback) | 425 |

## 7. Steps and mini-games

| Member | Scripts | Defined |
|---|---|---|
| `ResumeStep.inner` | playtest:71; smoke:708; captures:52 | story/step.ts:29 |
| `AskStep.t` **private** (seconds since the question started) | smoke:440 | story/steps.ts:93 |
| `WalkStep.combat` **private**: `Combat.foes` (story/combat.ts:52), each foe's `.foe` (entities/actor.ts:52) with `.windup` and `.hp` (systems/combat.ts:17, 10); `Combat.health` (53); `Combat.routed` (55) | screens:372, 391-392 | story/walk.ts:193 |
| `MiniGameStep.game` **private** | smoke:795 | story/minigames/miniGame.ts:42 |
| `LetterGame.buttons`, `.picker`, `.picks` **private** | smoke:796-797, 804 | words.ts:180, 181, 177 |
| `RumourGame.buttons`, `.picker` **private** (protected, in WordGame); `RumourGame.placed` **private** | smoke:796-797, 804 | words.ts:117, 118, 296 |
| `Button.id`; `ButtonPicker.cursor` (module-private class); `KeyCursor.current(count)` | smoke:796-797 | words.ts:16, 76-77, 30-32 |
| LetterGame button ids: `slot0`, `slot1`, `slot2`, `send`, `again`, `accept` | smoke:838-853 | words.ts:210-216 |
| RumourGame button ids: each piece's index as a string | smoke:866 | words.ts:321 |
| the letter's outcome flag, `letter`: `'named'` or `'necessity'` | smoke:854 | words.ts:238 |

## 8. GameScene: the Green Zone walk, 1.0 (scenes/gameScene.ts)

Scripts reach it through `__sv.scene()` or `__sv.flow.current`.

| Member | Scripts | Defined |
|---|---|---|
| `debugState()`: `player` (`gx`, `gy`, `facing`, `state`), `state`, `stats` (`time`, `score`, `marks`), `attack`, `pug`, `ambush`, `cats`, `balls` | screens:526, 568, 663, 684, 691, 699, 707, 717, 746, 786, 816, 823; captures:279, 285, 288 | 325-343 |
| `teleport(gx, gy)` | smoke:532, 537, 551, 589, 599, 616, 632, 651; screens:521, 543, 562, 606, 657, 673, 704, 719, 727, 769, 780; captures:30, 155, 178, 196, 227, 241, 314 | 346-348 (calls world/world.ts:190) |
| `player`: `state` (`'scared'`, `'free'`), `gx`, `gy`, `face(dir)`, `invulnerable` (written) | smoke:506, 544, 580, 609, 623, 643; screens:517-522, 541, 554, 627, 767; captures:151-156, 176 | 129-131; entities/zampano.ts:57, 171, 67; entity.ts:16-17 |
| `rules.poops` (`.length`, each pile's `gx` and `gy`) | smoke:508, 580; screens:746 | 42; systems/rules.ts:44 |
| `rules.stats`: `poops`, `coins` (written 10), `score`, `marks`, `time` | smoke:509; screens:605, 746; captures:313 | rules.ts:39; systems/scoring.ts:26-37 |
| `rules.digestion.warning` | screens:540; captures:175 | rules.ts:41; systems/needs.ts:43 |
| `rules.treats` (each treat's `gx` and `gy`) | screens:542, 768; captures:177 | rules.ts:43 |
| `rules.hunger.value` (written 0.01) | screens:628 | rules.ts:40; needs.ts:10 |
| `threats.pug` (`gx`, `gy`) | smoke:510; screens:668-677; captures:236-245 | 43; systems/threats.ts:27 |
| `threats.director.state` (`'calm'` or `'attack'`) | smoke:511 | threats.ts:28; systems/threatLogic.ts:109 |
| `threats.catTimer`, `threats.ballTimer` **private** (written 0) | screens:694-695; captures:258-259 | threats.ts:31-32 |
| `threats.balls` | screens:703 | threats.ts:26 |
| `ambush` (null when the level has no ambush), `.director.phase` (`waiting`, `voices`, `jump`, `scare`, `leave`, `done`) | smoke:505, 623, 641 | 45; systems/ambush.ts:41; systems/ambushLogic.ts:15, 38 |
| `ambush.band`: each member's `.entry.offscreen`, `.actor.behavior.kind` (`'goto'`), `.actor.gx`, `.actor.gy` | smoke:507, 563-565, 609, 623, 642-643 | ambush.ts:42; `Member` 13-17; systems/ambushEntry.ts:13; entities/actor.ts:43 |
| `ambush.holdsAttack` (getter) | smoke:512 | ambush.ts:60-63 |
| `ambush.skip()` | screens:646; captures:216 | ambush.ts:91 |
| `map.props` (`kind` `'tree'`, `x`, `y`) | screens:518-520, 777-779; captures:152-154 | 126 (getter); world/map.ts:30; `MapProp` 5-12 |
| `map.width`, `map.height`, `map.groundAt(i, j)` (2 is `Ground.Path`) | screens:556-558, 650-652, 688; captures:190-192, 220-222, 253 | map.ts:27-28, 88; world/tiles.ts:6 |
| `map.exitDistance`, `map.index(i, j)`, `map.startTile`, `map.exit` | screens:606, 648, 653; captures:218, 223, 314 | map.ts:44, 84, 47, 46 |
| `map.isWalkable(i, j)` | screens:672; captures:240 | map.ts:105 |
| `map.dirt`, `map.clean(x, y, r)` | screens:688; captures:253 | map.ts:34, 258 |
| `map.stampDirt(x, y, r, s)`, `map.health()` | smoke:544, 546 | map.ts:236, 278 |
| `map.circleBlocked(x, y, r)` | smoke:642 | map.ts:112 |
| `events.on('ambushVoice')`, `events.on('ambushNow')`, `events.on('ambushBark')` (payload `.text`) | smoke:524-527 | 41; core/events.ts:5, 59, 61, 65 |
| `shout.active` (getter) | smoke:561 | 49; ui/shout.ts:30 |
| `shout.scale` **private** | smoke:562 | ui/shout.ts:21 |
| `fx.voices.root.children`: each child's `.visible` and `.content[].text` | screens:722; captures:273 | 54; fx/gameFx.ts:49; fx/popups.ts:26 |
| `controls.root.visible`, `hud.root.visible` | smoke:759 | 55, 46; ui/touchControls.ts:66; ui/hud.ts:46 |
| `back()` (Android Back opens the pause) | smoke:169 (svback) | 166 |

## 9. Menus, overlays and text

| Member | Scripts | Defined |
|---|---|---|
| `TitleScene.actions` **private**: `options()`, `couch()`, `glossary()`, `newGame()` | smoke:182, 196, 248, 281, 383, 407, 426; captures:100, 116, 127; screens:271, 445, 463 | scenes/overlays.ts:131; `TitleActions` 56-66 |
| `TitleScene.footer` **private** (`.x`, `.y`) | screens:475 | overlays.ts:118 |
| `TitleScene.root.visible` (hidden while a menu is open over the title) | smoke:191, 266, 405 | overlays.ts:22; scenes/flow.ts:104, 112 |
| `OptionsScene.menu` **private** | smoke:205, 240, 283; screens:448 | overlays.ts:712 |
| `Menu.rows` **private**: each row's `.text` (a PixelText), `.item.label`, `.item.action()` | smoke:205, 240, 283; screens:448 | ui/menu.ts:28; `Row` 12-20; `MenuItem` 6-10 |
| `PixelText.content` **private**, each span's `.text` | smoke:205, 240, 283, 359, 477; screens:722; captures:273 | ui/pixelText.ts:117; `Span` 28-31 |
| `PixelText.text` does not exist. The first test at screens:448 is always false; the `String(r.item.label)` test is the one that matches. | screens:448 | none |
| `BriefingScene.prompt` **private** | smoke:359, 477 | overlays.ts:419, 430 |
| `GlossaryScene.pageIndex` (getter) | smoke:387 | scenes/glossaryScene.ts:78 |
| `Menu.rowRect(i)` (public; only the proposed RESUME tap uses it) | none yet | ui/menu.ts:53-56 |
| `back()` on the top scene (svback, then `Flow.back`): GameScene gameScene.ts:166, PauseScene overlays.ts:525, StoryScene storyScene.ts:425, StoryPauseScene story/screens.ts:267, OptionsScene overlays.ts:772, ControlsScene overlays.ts:868, StoryChapterScene story/screens.ts:188, StoryMenuScene story/screens.ts:130 | smoke:135, 169-172, 188-190, 315-322, 332-347; screens:806 | core/scene.ts:17; scenes/flow.ts:285-288 |

## 10. Audio (core/audio.ts)

| Member | Scripts | Defined |
|---|---|---|
| `audio.play(name, opts)` (smoke replaces it on the instance with a wrapper that counts `'glitch'`) | smoke:151-160, 305-309 | 162; the transitions play `'glitch'` at scenes/flow.ts:206 and story/storyFlow.ts:125 |
| `audio.loop('siren', { volume })`, `audio.stopLoop('siren')` | smoke:217, 222 | 181, 207; the sound is `siren`, fx/audioFiles.ts:45 |
| `audio.music`, `audio.sfx`, `audio.master` **private** (GainNodes; `.gain.value` is read) | smoke:221 | 49-51 |
| `audio.ready` (getter) | screens:786 | 83 |
| how the audio unlocks: `navigator.getAutoplayPolicy` at boot; window `pointerdown` and `keydown`. The harness reports `'disallowed'` and sends no DOM event, so no music plays and the title's lights never follow the music position | harness:84-86 | 326-334, 65-67; music position 268-273 |

## 11. Saves, settings and storage

| Name | Scripts | Defined |
|---|---|---|
| key prefix `supervillained:` (`savedData` keeps keys starting with `supervillained`) | harness:316 | core/storage.ts:5 |
| `supervillained:story` | smoke:56, 83, 423; screens:174, 265, 294, 303, 581, 753 | campaign/state.ts:247 (`KEY`), 345 (`saveCampaign`) |
| `supervillained:story-v1-backup` | screens:304 | state.ts:249, 303 |
| `supervillained:story-unknown-backup` (dumped by `playtest --save`) | harness:316 | state.ts:254, 310 |
| `supervillained:settings` | smoke:204, 241 | core/settings.ts:110, 128 |
| `supervillained:records` | screens:266, 635 | settings.ts:132, 153 |
| `supervillained:coins` | screens:635 | settings.ts:159, 165 |
| sessionStorage `__harness_seeded` (the harness's own key) | harness:103-104 | none |
| campaign fields written in literal saves and read back: `version` (2, or 1 for the migration), `completed`, `meters` (`commozione`, `supervillain`, `grace`, `standing`), `flags` (`smokeChoice`, `pawOffered`, `letter`), `book` (`marvels`, `items`, `values`, `remembered`, `shards`), `abilities` (`cross`, `knight`, `sermon`), `coins`, `playTime`, `savedAt`, `notice` | screens:155-172, 249-260, 280-290, 302-306; smoke:81-83, 92, 97, 104-105, 112-113, 422 | state.ts:52 (`STORY_VERSION`), 57-71, 19-20, 38; `migrateV1` 277; `loadCampaign` 297 |
| the starting meters the smoke asserts (supervillain 10, commozione 20) | smoke:92, 97, 104, 113 | state.ts:73-75 |
| `savedAt` = `Date.now()` (fixed by the harness) | harness:83 | state.ts:343-344 |
| settings fields `music`, `sounds` (levels from 0 to 1), `textSpeed` (`instant`, `normal`), `controls.hand` (`left`), `newArt`, and the legacy `volume`, which a save drops | smoke:195, 209, 232, 241, 437, 467; screens:387 | settings.ts:82-101, 7, 56, 111-114 |
| record shape `{ level1: { score, stars, time } }` | screens:266 | settings.ts:103-107; levels/level1.ts:201 |

## 12. URL query parameters

| Parameter | Scripts | Defined |
|---|---|---|
| `?story=<sub id>` (it also makes `__sv.scene()` return the top scene) | smoke:895; captures:76, 341, 360, 376, 390, 410, 427; screens:111, 142, 227, 316, 334, 418, 425, 484; envshots:76 | main.ts:60, 77, 85 |
| `?skip=game` (straight into the walk, without the briefing) | captures:141, 165, 210, 268, 455; screens:509, 532, 641, 715, 815 | main.ts:76, which calls scenes/flow.ts:211 |
| `?auto=1&skill=&ending=&choice=` (ending `knight` or `alpha`; choice `first`, `last` or `random`) | playtest:48 | main.ts:62-72; story/autopilot.ts:26 |
| `?art=new` or `?art=current` (also `&art=`) | smoke:288; captures:76, 446, 455; screens:21; envshots:76 | assets/environment.ts:97-101 (called from main.ts:42) |
| `?as=sbrimbrulon` | screens:425 | main.ts:74-75; assets/manifest.ts:135 |
| `?debug=sprites&char=<key>` | screens:405, 502 | main.ts:54-57; scenes/spriteViewerScene.ts:25 |
| `?level` (no script uses it) | none | main.ts:50 |

## 13. DOM, window events and browser APIs

| Name | Scripts | Defined or used in src |
|---|---|---|
| `#game` (the canvas; the capture is clipped to it) | harness:302 | index.html:55; main.ts:21 |
| window event `svback` | smoke:135 | main.ts:53; android/app/src/main/java/com/zampano/supervillained/MainActivity.java:32 |
| `window.open` (stubbed: no new tab) | screens:459-460; harness:94 | core/native.ts:29 |
| `blur`, `focusout` and `visibilitychange` are swallowed; `document.hidden` reads false and `visibilityState` reads `'visible'` | harness:90-93 | scenes/flow.ts:51-54 (`autoPause`); core/input.ts:188; core/audio.ts:68-76 |
| `webglcontextlost` is reported | harness:95 | the Pixi renderer (main.ts:23-37) |
| `requestAnimationFrame` never calls back; `cancelAnimationFrame` does nothing | harness:99-100 | core/loop.ts:57-64 |
| `Math.random` is seeded (mulberry32) and its draws are counted in `__harness.draws` | harness:73-82, 298-301, 308 | 47 calls in 19 files (for example story/walk.ts:109, ui/attackBanner.ts:58) |
| `Date.now` is fixed at 2026-01-01 12:00 UTC | harness:29, 83 | campaign/state.ts:343; campaign/summary.ts:77 |
| `navigator.getAutoplayPolicy` returns `'disallowed'` | harness:86 | core/audio.ts:326-334 |
| `fetch` and the Response body methods (`arrayBuffer`, `blob`, `json`, `text`) are counted | harness:134-138 | ui/titleAnim.ts:181; assets/environment.ts:270; core/audio.ts:120; Pixi `Assets.load` in core/assets.ts:108 |
| `createImageBitmap` | harness:139-142 | ui/titleAnim.ts:151 |
| `HTMLImageElement` `src` and `decode()` | harness:143-163 | ui/titleAnim.ts:169-171; ui/titleArt.ts:18; assets/environment.ts:225-228 |
| an `ImageDecoder` counts as busy from its creation until `close()`. A decoder that is never closed would make `settle` time out | harness:164-178 | ui/titleAnim.ts:182, 206 (closed in `finally`) |
| `FontFace.load`, `document.fonts.load` | harness:179-183 | ui/pixelFont.ts:40-42 |
| `BaseAudioContext.decodeAudioData` | harness:184 | core/audio.ts:121 |
| `Worker.postMessage` (each message waits for one reply) | harness:185-200 | Pixi's texture worker, behind core/assets.ts:108 |
| not wrapped: `performance.now` (used only by `GameLoop.start`, loop.ts:48); `HTMLAudioElement.currentTime` (audio.ts:273, silent until audio unlocks); `AudioContext.currentTime` (audio.ts:137, 166, 203) | none | as listed |
| page set-up: viewport 400 x 860, device scale 1, touch, mobile, locale en-US, time zone UTC (harness:208-216); smoke uses 400 x 860 at scale 1 (smoke:888); screens and envshots use scale 2 (screens:45; envshots:69) | as listed | core/display.ts; core/game.ts:90-107 |
| a navigation after the boot means src was edited during the run (Vite reloaded the page) | harness:227-230 | the Vite dev server |
| software WebGL is pinned (`--use-angle=swiftshader`) | harness:31-34 | none |

## 14. Console texts the scripts match

| Text | Scripts | Source |
|---|---|---|
| `missing texture` (a warning) | harness:234; smoke:893 | core/assets.ts:26 |
| `GL_INVALID` | harness:234; smoke:893 | the WebGL implementation |
| any `console.error` | harness:234; smoke:893; envshots:72-74; screens:46-48 (prints errors and warnings) | for example main.ts:100 (boot failure) |
| uncaught page errors | harness:232; smoke:132, 499, 787, 890; envshots:71; screens:49, 794 | none |
| `Local` in Vite's output (the server is up) | harness:45; smoke:33; screens:34; envshots:52 | Vite, not the game |
| the playtest's own output lines containing `Page errors`, `not finished`, `Ending reached` or `Error` | lock:146 | scripts/playtest.mjs:125-126, 136 |

## 15. Game data and texts the scripts depend on

| Data | Scripts | Defined |
|---|---|---|
| sub-level ids played: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.4, 4.1, 5.1, 5.4, 6.1, 6.2, 6.3, 7.1, 7.3, 7.5, 7.6, 7.7, 7.8, 8.1, 8.2, 8.3, plus every id of `storyIds()`, plus any `--from` and `--to`. The Green Zone is 1.0, with `greenZone: 1` | smoke:84, 330, 444, 716, 731, 809, 898; captures:328-337, 341-427; screens:111-484; envshots:24-41; playtest:33-34 | campaign/chapters/ch1.ts to ch8.ts (1.0 at ch1.ts:40, 45) |
| the order of steps inside those scenes: 2.3's second WalkStep is the pickups and its fourth is the sparring; 7.8's second WalkStep; 2.2's first SayStep; the second SayStep of 7.3 and of 7.7; 8.3's CardStep with one step left in the queue; 1.3's first AskStep; 5.4 is LetterGame and 6.2 is RumourGame; 7.5 has a WalkStep with fog above 0; the first WalkStep of 1.1 and of 2.1 has the visor; 6.1 fades Commozione on entry | smoke:91, 444-448, 733, 808-818; captures:341-354, 364, 380, 394; screens:113-131, 339, 410-416, 426 | the chapter scripts (2.3 at campaign/chapters/ch2.ts:181-204) |
| markers: in 2.3, `'2'` and `'3'` (the sword and the belt, ch2.ts:192-193); `'6'` in 1.1; `'1'` in 7.3; `'4'` in 8.3 | smoke:734-739; captures:396-397; screens:114-116, 124, 232-234 | the rows of `STORY_MAPS`, story/maps.ts:150 |
| map keys (`mapKey`): neighborhood, study, jerusalem, fair, road, venice, lido, ship, zara, winter, island, city, field, palace, breach, shattered | envshots:24-41, 84 | story/maps.ts:150-709 (jerusalem 151, study 179, fair 267, venice 291, lido 319, ship 345, island 389, zara 413, winter 439, road 465, palace 501, city 559, breach 589, shattered 611, neighborhood 654, field 674) |
| character keys in `?char=`: zampano, zampanoCross, zampanoKnight, bagnaskiz, bagnaskizEmperor, bagnaskizMarshal, niketas, sbrimbrulon, jack, jackKnight, watson, watsonKnight, santina, santinaKnight, confusione, confusioneKnight, cat | screens:403-404, 501 | assets/manifest.ts:66 (`CAST_KEYS`), 265 (`CHARACTERS`), 288 (cat) |
| texts `'TAP TO START'` and `'PRESS SPACE'` | smoke:362, 479 | overlays.ts:430 |
| texts `'MUSIC: 100%'` and `'SOUNDS: OFF'` | smoke:229 | overlays.ts:484-485; core/settings.ts:23-25 |
| texts `'ART: NEW (TEST)'` and `'ART: CURRENT'` | smoke:271, 290-294 | overlays.ts:747 |
| the row label `'CONTROLS'` | screens:448 | overlays.ts:743 |
| the band's voices (matched by /COMING/ or /READY/) and `'NOW!'` | screens:722; captures:273; smoke:584 | levels/level1.ts:241-244 |
| `'THOSE OF THE WEST'` (a 7.1 line) | screens:320 | campaign/chapters/ch7.ts:68 |
| ending ids `knight` and `alpha` (the report prints them uppercase) | playtest:31, 125 | campaign/state.ts:175-177 |
| sound names `glitch` and `siren` | smoke:156, 217, 222 | fx/sounds.ts:52; fx/audioFiles.ts:45 |
| title menu order: NEW GAME, CONTINUE, COUCH, OPTIONS, GLOSSARY, QUIT. CONTINUE is selected when a story is saved; otherwise NEW GAME is | screens:179-184; captures:299 | overlays.ts:138-152 |
| OPTIONS order: SOUND, MUSIC, SOUNDS, TEXT, CONTROLS, LEVELS (REPLAY), MERAVIGLIA BOOK, ART, BACK | smoke:184, 198-200, 240, 250, 283; captures:104-106 | overlays.ts:732-754 |
| walk pause order: RESUME, RESTART, SOUND, MUSIC, SOUNDS, QUIT TO TITLE | smoke:174 | overlays.ts:504-510 |
| story pause order: RESUME, RESTART SCENE, SKIP SCENE, MERAVIGLIA BOOK, SOUND, TEXT, CONTROLS, QUIT TO TITLE | smoke:74; screens:207-212 | story/screens.ts:224-248 |
| story menu: CONTINUE (or BEGIN THE DREAM), then the levels | smoke:301, 311; screens:190-195 | story/screens.ts:102 |
| GLOSSARY keys: right and left turn a page, down and up jump a section, confirm closes. Page indices 1 and 4 are asserted | smoke:386-402; captures:132-135; screens:467-472 | scenes/glossaryScene.ts:229-234; scenes/glossaryEntries.ts |
| 15 decoded zones in each art bank | smoke:271, 294; envshots:81 | public/environment-ink/manifest.json; public/environment-ink-vibrant/manifest.json |
| `AUDIO.MUSIC_FILE_VOLUME` 0.55 (the music bus reads above 0.5 at 100 %) | smoke:216, 226 | config.ts:591 |
| Green Zone teleport targets (71.5, 71.5), (58.9, 57.5), (51.1, 48.6), (27.5, 29.5), (53.5, 51.5), (38.5, 58.5), (20.5, 22.5) and 2.3's sparring spot (8.5, 10.5) | smoke:532-651; captures:272, 275; screens:344, 429, 719, 727 | levels/level1.ts (the park map); story/maps.ts:465 (road) |
| the playtest report's columns: `restarts`, `caught`, `nerveBroken`, `ran`, `miniRetries`, `minis` | playtest:107-118 | storyScene.ts:80 |

## 16. Names the scripts add to the page

These must not collide with anything the game defines.

| Name | Scripts |
|---|---|
| `window.__harness` `{ pending, started, kinds, draws }` | harness:69-70, 257, 300, 308 |
| `HTMLImageElement.__harnessEnd`, `Worker.__ends`, `ImageDecoder.__end`; the classes `HarnessWorker` and `HarnessImageDecoder` | harness:151-159, 168-176, 188-197 |
| `page.__inFlight` (on the Node side) | harness:226 |
| `window.__noControls` | playtest:73, 95 |
| `window.__glitches`, `audio.__counted` | smoke:152-159, 308 |
| `window.__backdrop` | smoke:255, 259, 264, 411, 415 |
| `window.__voices`, `window.__heard` | smoke:513, 522-527, 581 |
| `window.__opened` | screens:459-460, 478 |
| proposed for the controls checks: `window.__story`, `window.__walk`, `window.__seen` | none yet |

## 17. Private members read or written at runtime (summary)

| Member | Kind | Scripts | Defined |
|---|---|---|---|
| StoryScene.current | private field | playtest, smoke, captures, screens | story/storyScene.ts:65 |
| StoryScene.controlsWanted | private field | playtest, captures | storyScene.ts:316 |
| WalkStep (the class) and WalkStep.combat | module-private class; private field | all (by name); screens | story/walk.ts:174, 193 |
| MiniGameStep (the class) and MiniGameStep.game | module-private class; private field | smoke, captures (by name); smoke | story/minigames/miniGame.ts:41-42 |
| AskStep (the class) and AskStep.t | module-private class; private field | smoke, captures, screens; smoke | story/steps.ts:91, 93 |
| SayStep, CardStep (the classes) | module-private classes, read by name | screens | steps.ts:28, 175 |
| LetterGame.buttons, .picker, .picks | private fields | smoke | words.ts:180, 181, 177 |
| WordGame.buttons, .picker (read on RumourGame) | protected fields | smoke | words.ts:117-118 |
| RumourGame.placed | private field | smoke | words.ts:296 |
| ButtonPicker (the class) | module-private class | smoke | words.ts:76 |
| TitleScene.actions | private constructor parameter | smoke, captures, screens | overlays.ts:131 |
| TitleScene.footer | private field | screens | overlays.ts:118 |
| OptionsScene.menu | private field | smoke, screens | overlays.ts:712 |
| Menu.rows | private field | smoke, screens | ui/menu.ts:28 |
| PixelText.content | private field | smoke, screens, captures | ui/pixelText.ts:117 |
| BriefingScene.prompt | private field | smoke | overlays.ts:419 |
| DialogueBox.full | private field | screens | story/ui.ts:81 |
| Shout.scale | private field | smoke | ui/shout.ts:21 |
| Threats.catTimer, Threats.ballTimer | private fields, written | screens, captures | systems/threats.ts:31-32 |
| AudioEngine.music, .sfx, .master | private fields | smoke | core/audio.ts:49-51 |
| StoryFlow.showEnding() | private method | screens | story/storyFlow.ts:307 |
| proposed: StoryPauseScene.menu and PauseScene.menu (to tap RESUME through `rowRect`) | private fields | none yet | story/screens.ts:207; overlays.ts:493 |

## 18. Changes against the list in BLUEPRINT.md, lock 13

- Lines that moved. The playtest's per-frame controls check is now at playtest:67-75; lock 13 says 81-84. `GlossaryScene.pageIndex` is read at smoke:387; lock 13 says 386. The Shout member that smoke:562 reads is `scale`, which is private (ui/shout.ts:21). `wordScale` is only the planned rename that avoids the clash with `Container.scale` under Rule 3; it is not today's name.
- Missing from lock 13:
  - the six mini-game class names reach the playtest report through `metrics.minis`;
  - `__sv.scene()` depends on `?story=`;
  - these private members: WalkStep.combat, MiniGameStep.game, AskStep.t, the word games' `buttons`, `picker`, `picks` and `placed`, TitleScene.footer, OptionsScene.menu with Menu.rows and PixelText.content, BriefingScene.prompt, DialogueBox.full, Threats.catTimer and ballTimer (written), AudioEngine's `music`, `sfx` and `master`, and StoryFlow.showEnding;
  - the GameMap members and the literal 2 for `Ground.Path`;
  - the menu orders that the keyboard presses count on, and the texts the scripts match;
  - the harness's dependencies: the boot runs no step (`game.time` is 0), the title's ImageDecoder is closed, the audio unlocks only through `getAutoplayPolicy` or a DOM event, focus and visibility events, `requestAnimationFrame` is the only frame driver, and the counted load APIs;
  - CouchScene (captures:118) among the overlays read by name.
- "Every overlay" in lock 13 means today: TitleScene, OptionsScene, ControlsScene, BriefingScene, PauseScene, LevelEndScene, ConfirmScene, CouchScene, StoryCardScene, StoryMenuScene, StoryChapterScene, StoryPauseScene, SupervillainedScene and GlossaryScene. GameOverScene is only printed.
