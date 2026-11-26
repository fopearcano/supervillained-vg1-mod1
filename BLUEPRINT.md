# SUPERVILLAINED: modular source blueprint

> **Partial result.** The blueprint workflow was stopped at your request on 26 November 2026, while it was checking the symbol map.
> - Everything it finished is in this file. Nothing was resumed or redone after the stop.
> - No source code was changed: this is a plan only.
> - Analysed commit: `0090696` on `claude/relaxed-wright-e0mdk7` (116 files in `src/`, 24,779 lines, 792 top-level declarations).

## Contents

- [1. Where the work stopped](#where-the-work-stopped)
- [2. Summary](#summary)
- [3. Folder tree](#folder-tree)
- [4. The groups](#the-groups)
- [5. Entity model](#entity-model)
- [6. Config plan](#config-plan)
- [7. Dependency rules](#dependency-rules)
- [8. Decisions](#decisions)
- [9. How the three proposals scored](#how-the-three-proposals-scored)
- [10. Migration order](#migration-order)
- [11. Risks](#risks)
- [12. What moves into each new file](#what-moves-into-each-new-file)
- [13. Code to delete](#code-to-delete)
- [14. Where each current file goes](#where-each-current-file-goes)
- [15. Open issues at the stop](#open-issues-at-the-stop)
- [Appendix A. Current files](#appendix-a-current-files)
- [Appendix B. The three proposals](#appendix-b-the-three-proposals)

## 1. Where the work stopped

| Phase | What it does | State at the stop |
|---|---|---|
| Inventory | 9 readers list every symbol of the 116 files, with its concern and the inline constants | **Done** (9/9) |
| Design | 3 architects (faithful, separation, pragmatic) each propose a structure; a judge scores them and merges one | **Done** (3/3 and the judge) |
| Map | Per group of files, every symbol and inline-constant cluster gets a destination file and an action | **Done** (9/9, 1,455 entries) |
| Verify | A skeptic per group checks each entry against the code: ok, fix or reject, and adds what was missed | **5 of 9 done**: core + main + config, scenes/, ui/ + fx/, entities/ world/ iso/ levels/, systems/ + campaign state. Running when stopped: story engine (scene, flow, screens, ui, steps) and campaign/chapters. Not started: story engine (walk, combat, autopilot, maps, mini-games) and assets/ |
| Gap fill | An agent gives a destination to any declaration still without one | **Not run.** A name check made after the stop finds **0** declarations without a destination |
| Critique | Two critics (structure; fit to your request) and their corrections | **Not run** |

**The symbol map in this file: 1,482 entries.**

| Status | Entries | Meaning |
|---|---:|---|
| verified | 796 | A verifier read the code and agreed |
| corrected by verifier | 99 | A verifier changed the destination, action, lines or name; the old value is shown |
| added by verifier | 27 | Missed by the mapper and added by the verifier |
| not verified | 560 | From the four groups whose verification did not finish; treat as a draft |

No entry was rejected. By action: move 777, extract-config 414, split 214, keep 40, merge 24, delete 13.

Actions:
- **move**: the symbol moves as it is.
- **split**: the symbol is cut into parts that go to several files; this entry names one of them.
- **extract-config**: an inline literal (a number, colour or size) becomes a named constant in `src/config/`.
- **keep**: the symbol stays in its class or file, which itself moves.
- **merge**: the symbol joins an existing one.
- **delete**: dead code.

## 2. Summary

The judge's merged blueprint, as written:

Final blueprint for src/ at HEAD 0090696. It starts from the 'faithful' proposal, which scores best, and grafts in the safer mechanics of 'pragmatic' and the rendering primitives of 'separation'.

**The four groups you asked for**
- config/: every number, colour, speed and dimension, in 14 domain files behind an index.ts barrel, so all '../config' imports keep working.
- core/: app start-up, asset loading, scene and state management, input, audio, render services and the stage. core/flow is the composition root: it holds Flow, the walk and story flows, boot and window.\_\_sv, and only main.ts imports it.
- entities/: world objects that extend PIXI.Container. Each has update(dt) on the existing fixed 60 Hz step and render(alpha) for interpolation. This also covers world-space effects and markers.
- ui/: widgets, HUDs, touch controls, mini-game views and every screen.

**Code that fits none of the four** gets three honest extra folders and no more:
- systems/: Pixi-free gameplay rules, movement and physics maths.
- story/: the script runtime the chapters are written against.
- content/: chapter scripts, level data, story maps, palettes and prose. CLAUDE.md says this is level data, not config.

Seven current folders dissolve: assets, iso, world, fx, scenes, levels and campaign.

**How the audit findings become fixable**
- Input becomes one PlayerIntent per step.
- Motion, steering and AI move into pure systems functions that entities call.
- Display writes happen only in render(alpha).
- Render groups get one home in core/render/layers.ts.
- Graphics are redrawn only when their state changes (core/render/redraw.ts), and owned filters and contexts are destroyed in one place (core/scene/sceneBase.ts, core/render/dispose.ts).

**What stays the same:** the save format (CampaignState v2, the supervillained:\* keys), every window.\_\_sv member, the class and field names that scripts/\*.mjs read, and the RNG call order.

**Migration:** 17 steps, each green on npm run build and npm test. A layering test with an allowlist that may only shrink guards each step. Baseline playtest reports and screenshots are diffed after every behaviour-adjacent step.

## 3. Folder tree

308 files in the target structure. Folders first, then files.

```text
└── src/
    ├── config/
    │   ├── index.ts
    │   ├── display.ts
    │   ├── colors.ts
    │   ├── input.ts
    │   ├── ui.ts
    │   ├── fx.ts
    │   ├── audio.ts
    │   ├── motion.ts
    │   ├── greenZone.ts
    │   ├── story.ts
    │   ├── combat.ts
    │   ├── minigames.ts
    │   ├── campaign.ts
    │   ├── art.ts
    │   └── debug.ts
    ├── core/
    │   ├── math/
    │   │   ├── projection.ts
    │   │   ├── depth.ts
    │   │   └── geometry.ts
    │   ├── util/
    │   │   ├── rng.ts
    │   │   ├── emitter.ts
    │   │   └── color.ts
    │   ├── app/
    │   │   ├── game.ts
    │   │   ├── loop.ts
    │   │   ├── display.ts
    │   │   ├── lifecycle.ts
    │   │   ├── native.ts
    │   │   └── settingsActions.ts
    │   ├── render/
    │   │   ├── text/
    │   │   │   ├── pixelFont.ts
    │   │   │   └── pixelText.ts
    │   │   ├── filters/
    │   │   │   ├── filterVertex.ts
    │   │   │   ├── glitchFilter.ts
    │   │   │   ├── textGlitchFilter.ts
    │   │   │   └── titleGlitchFilter.ts
    │   │   ├── layers.ts
    │   │   ├── dispose.ts
    │   │   └── redraw.ts
    │   ├── scene/
    │   │   ├── scene.ts
    │   │   ├── sceneBase.ts
    │   │   └── transition.ts
    │   ├── stage/
    │   │   ├── world.ts
    │   │   ├── stageEntity.ts
    │   │   ├── camera.ts
    │   │   └── mapRenderer.ts
    │   ├── state/
    │   │   ├── storage.ts
    │   │   ├── settings.ts
    │   │   ├── records.ts
    │   │   └── campaignSave.ts
    │   ├── input/
    │   │   ├── index.ts
    │   │   ├── types.ts
    │   │   ├── input.ts
    │   │   ├── keyboard.ts
    │   │   ├── pointer.ts
    │   │   ├── gestures.ts
    │   │   ├── touchLayout.ts
    │   │   └── intent.ts
    │   ├── audio/
    │   │   ├── index.ts
    │   │   ├── engine.ts
    │   │   ├── synth.ts
    │   │   ├── files.ts
    │   │   ├── patches.ts
    │   │   └── medievalMusic.ts
    │   ├── assets/
    │   │   ├── fonts/
    │   │   │   └── PressStart2P.woff2
    │   │   ├── manifest/
    │   │   │   ├── animations.ts
    │   │   │   ├── characters.ts
    │   │   │   ├── sprites.ts
    │   │   │   ├── names.ts
    │   │   │   └── index.ts
    │   │   ├── environment/
    │   │   │   ├── manifest.ts
    │   │   │   ├── banks.ts
    │   │   │   ├── diagnostics.ts
    │   │   │   ├── palettes.ts
    │   │   │   ├── floorDesigns.ts
    │   │   │   └── index.ts
    │   │   ├── placeholders/
    │   │   │   ├── critters/
    │   │   │   │   ├── spec.ts
    │   │   │   │   ├── pose.ts
    │   │   │   │   ├── draw.ts
    │   │   │   │   ├── body.ts
    │   │   │   │   ├── head.ts
    │   │   │   │   └── hats.ts
    │   │   │   ├── registry.ts
    │   │   │   ├── raster.ts
    │   │   │   ├── castSpecs.ts
    │   │   │   ├── items.ts
    │   │   │   ├── fxSprites.ts
    │   │   │   ├── hudIcons.ts
    │   │   │   ├── props.ts
    │   │   │   ├── tiles.ts
    │   │   │   ├── storyTiles.ts
    │   │   │   ├── storyProps.ts
    │   │   │   └── specials.ts
    │   │   ├── index.ts
    │   │   ├── atlas.ts
    │   │   ├── pixelBuffer.ts
    │   │   ├── crisp.ts
    │   │   ├── animatedImage.ts
    │   │   ├── logoArt.ts
    │   │   ├── characterTextures.ts
    │   │   ├── spriteTextures.ts
    │   │   └── levelTextures.ts
    │   └── flow/
    │       ├── greenZone/
    │       │   ├── greenZoneScene.ts
    │       │   ├── greenZoneFx.ts
    │       │   └── greenZoneAudio.ts
    │       ├── bootstrap.ts
    │       ├── urlParams.ts
    │       ├── automation.ts
    │       ├── flow.ts
    │       ├── titleFlow.ts
    │       ├── walkFlow.ts
    │       └── storyFlow.ts
    ├── entities/
    │   ├── animation/
    │   │   ├── animationState.ts
    │   │   ├── characterSprite.ts
    │   │   └── figureSprite.ts
    │   ├── critters/
    │   │   ├── cat.ts
    │   │   ├── ball.ts
    │   │   └── bagnaskiz.ts
    │   ├── items/
    │   │   ├── treat.ts
    │   │   └── poopPile.ts
    │   ├── effects/
    │   │   ├── particles.ts
    │   │   ├── popups.ts
    │   │   ├── ringLayer.ts
    │   │   ├── barkWaves.ts
    │   │   ├── digestionBubble.ts
    │   │   ├── magnetRings.ts
    │   │   └── exitMarker.ts
    │   ├── markers/
    │   │   ├── sightCone.ts
    │   │   ├── goalMarkers.ts
    │   │   ├── flames.ts
    │   │   └── combatMarkers.ts
    │   ├── entity.ts
    │   ├── zampano.ts
    │   ├── actor.ts
    │   ├── prop.ts
    │   ├── pickup.ts
    │   ├── carriedLabel.ts
    │   ├── factory.ts
    │   └── stageDressing.ts
    ├── ui/
    │   ├── widgets/
    │   │   ├── retroBox.ts
    │   │   ├── listNav.ts
    │   │   ├── menu.ts
    │   │   ├── buttonPicker.ts
    │   │   ├── buttonList.ts
    │   │   ├── paperCard.ts
    │   │   ├── overlay.ts
    │   │   └── menuRows.ts
    │   ├── text/
    │   │   ├── markup.ts
    │   │   ├── format.ts
    │   │   └── logo.ts
    │   ├── hud/
    │   │   ├── greenZoneHud.ts
    │   │   ├── radar.ts
    │   │   ├── hungerBar.ts
    │   │   ├── walkHudModel.ts
    │   │   ├── attackBanner.ts
    │   │   ├── storyHud.ts
    │   │   ├── noticeStack.ts
    │   │   └── offscreenArrow.ts
    │   ├── story/
    │   │   ├── dialogueBox.ts
    │   │   └── cardLayer.ts
    │   ├── touch/
    │   │   ├── touchControls.ts
    │   │   ├── touchIcons.ts
    │   │   └── gestureHints.ts
    │   ├── effects/
    │   │   ├── shout.ts
    │   │   ├── discoLights.ts
    │   │   ├── discoBeat.ts
    │   │   ├── screenOverlay.ts
    │   │   └── attackFx.ts
    │   ├── minigames/
    │   │   ├── laddersView.ts
    │   │   ├── tugView.ts
    │   │   ├── boatView.ts
    │   │   ├── rhythmView.ts
    │   │   └── wordsView.ts
    │   └── screens/
    │       ├── title/
    │       │   ├── titleScene.ts
    │       │   ├── titlePortrait.ts
    │       │   ├── livesCounter.ts
    │       │   └── menuShine.ts
    │       ├── story/
    │       │   ├── storyCardScene.ts
    │       │   ├── storyMenuScene.ts
    │       │   ├── storyChapterScene.ts
    │       │   ├── storyPauseScene.ts
    │       │   ├── bookScene.ts
    │       │   └── bookModel.ts
    │       ├── debug/
    │       │   └── spriteViewerScene.ts
    │       ├── briefingScene.ts
    │       ├── pauseScene.ts
    │       ├── levelEndScene.ts
    │       ├── gameOverScene.ts
    │       ├── optionsScene.ts
    │       ├── controlsScene.ts
    │       ├── confirmScene.ts
    │       ├── goodbyeScene.ts
    │       ├── paperCardScene.ts
    │       ├── couchScene.ts
    │       ├── glossaryScene.ts
    │       ├── handRing.ts
    │       └── supervillainedScene.ts
    ├── systems/
    │   ├── world/
    │   │   ├── tiles.ts
    │   │   ├── level.ts
    │   │   ├── asciiMap.ts
    │   │   └── map.ts
    │   ├── player/
    │   │   ├── needs.ts
    │   │   └── playerMotion.ts
    │   ├── motion/
    │   │   ├── behavior.ts
    │   │   ├── steering.ts
    │   │   ├── flee.ts
    │   │   ├── sight.ts
    │   │   └── cone.ts
    │   ├── nav/
    │   │   └── pathfinding.ts
    │   ├── combat/
    │   │   ├── foe.ts
    │   │   └── index.ts
    │   ├── greenZone/
    │   │   ├── events.ts
    │   │   ├── worldAccess.ts
    │   │   ├── scoring.ts
    │   │   ├── lives.ts
    │   │   ├── rules.ts
    │   │   ├── threats.ts
    │   │   ├── threatLogic.ts
    │   │   ├── critterAi.ts
    │   │   ├── ambush.ts
    │   │   ├── ambushLogic.ts
    │   │   ├── ambushEntry.ts
    │   │   └── placement.ts
    │   ├── campaign/
    │   │   ├── model.ts
    │   │   ├── rules.ts
    │   │   ├── costumes.ts
    │   │   └── progression.ts
    │   └── story/
    │       ├── dialogueGesture.ts
    │       └── gaps.ts
    ├── story/
    │   ├── engine/
    │   │   ├── types.ts
    │   │   ├── step.ts
    │   │   ├── context.ts
    │   │   ├── runner.ts
    │   │   ├── stage.ts
    │   │   ├── controls.ts
    │   │   ├── effects.ts
    │   │   └── storyScene.ts
    │   ├── steps/
    │   │   ├── dialogue.ts
    │   │   ├── stage.ts
    │   │   ├── control.ts
    │   │   ├── carry.ts
    │   │   └── index.ts
    │   ├── walk/
    │   │   ├── objectives/
    │   │   │   ├── pickups.ts
    │   │   │   ├── detection.ts
    │   │   │   ├── pace.ts
    │   │   │   ├── thirst.ts
    │   │   │   ├── scramble.ts
    │   │   │   ├── fire.ts
    │   │   │   ├── visor.ts
    │   │   │   └── barriers.ts
    │   │   ├── types.ts
    │   │   ├── walkStep.ts
    │   │   ├── walkInput.ts
    │   │   ├── follow.ts
    │   │   ├── lull.ts
    │   │   └── index.ts
    │   ├── combat/
    │   │   ├── types.ts
    │   │   ├── combatController.ts
    │   │   └── index.ts
    │   ├── minigames/
    │   │   ├── ladders/
    │   │   │   ├── laddersSim.ts
    │   │   │   └── laddersGame.ts
    │   │   ├── tug/
    │   │   │   └── tugGame.ts
    │   │   ├── boat/
    │   │   │   └── boatGame.ts
    │   │   ├── rhythm/
    │   │   │   ├── rhythmSim.ts
    │   │   │   └── rhythmGame.ts
    │   │   ├── words/
    │   │   │   ├── wordGame.ts
    │   │   │   ├── letterGame.ts
    │   │   │   ├── rumourGame.ts
    │   │   │   └── index.ts
    │   │   ├── index.ts
    │   │   ├── miniGame.ts
    │   │   ├── miniGameStep.ts
    │   │   └── miniInput.ts
    │   └── pilot/
    │       ├── autopilot.ts
    │       └── walkPilot.ts
    ├── content/
    │   ├── campaign/
    │   │   ├── chapters/
    │   │   │   ├── ch7/
    │   │   │   │   ├── index.ts
    │   │   │   │   ├── markers.ts
    │   │   │   │   ├── arrival.ts
    │   │   │   │   ├── march.ts
    │   │   │   │   ├── city.ts
    │   │   │   │   └── oath.ts
    │   │   │   ├── index.ts
    │   │   │   ├── ch1.ts
    │   │   │   ├── ch2.ts
    │   │   │   ├── ch3.ts
    │   │   │   ├── ch4.ts
    │   │   │   ├── ch5.ts
    │   │   │   ├── ch6.ts
    │   │   │   └── ch8.ts
    │   │   ├── vocab.ts
    │   │   ├── titles.ts
    │   │   ├── marvels.ts
    │   │   ├── endings.ts
    │   │   ├── cards.ts
    │   │   ├── speakers.ts
    │   │   └── lexicon.ts
    │   ├── maps/
    │   │   ├── stages/
    │   │   │   ├── reality.ts
    │   │   │   ├── champagne.ts
    │   │   │   ├── venice.ts
    │   │   │   ├── sea.ts
    │   │   │   ├── zara.ts
    │   │   │   └── constantinople.ts
    │   │   ├── storyMaps.ts
    │   │   └── themes.ts
    │   ├── levels/
    │   │   ├── greenZone.ts
    │   │   └── index.ts
    │   ├── minigames/
    │   │   ├── rhythmPresets.ts
    │   │   ├── letter.ts
    │   │   └── rumour.ts
    │   └── index.ts
    └── main.ts
```

## 4. The groups

| Folder | Group | Why |
|---|---|---|
| `src/config/` | config | Requested group. Holds every tuning number, colour, speed and layout dimension, split into 14 domain files behind an index.ts barrel. Each file imports only other config files. Story prose, sprite tables, placeholder art data and level data deliberately stay out. |
| `src/core/math/, src/core/util/` | core (pure foundation) | Pure helpers that every layer may import (iso projection, depth order, geometry, Rng, Emitter, colour packing), with no Pixi and no DOM. Only config sits below them. |
| `src/core/app/` | core (app initialization) | Game service hub, fixed-step loop, viewport, app lifecycle listeners, the Capacitor bridge, and the one settings controller. It is the top of the core runtime, so it may use every other core service. |
| `src/core/assets/` | core (asset loading) | Texture registry (still at the module id '../core/assets'), atlas ownership, the sprite manifest (the file ASSETS.md points to), character/sprite/level texture builders, environment art banks, procedural placeholder drawers, the font file and image decoders. The manifest sub-folder is pure data, so systems may read it. |
| `src/core/scene/, src/core/state/` | core (scene and state management) | scene/: the Scene contract and stack, a SceneBase that owns render groups and disposes filters, and the screen transition. state/: guarded storage, the settings model, Green Zone records and the campaign save with its v1 migration. Keys and format are unchanged. |
| `src/core/input/, src/core/audio/, src/core/render/, src/core/stage/` | core (services) | input/: DOM devices, pure gestures, the touch layout (the single writer of hit areas) and the PlayerIntent builder. audio/: engine, synth, file table and patches, which removes today's core-to-fx inversion. render/: render-group layers, GPU-safe dispose, the change-only redraw helper, filters and the pixel text rasterizer, which entities, ui and story all use. stage/: the gameplay scene graph (World, MapRenderer, Camera), which depends only on a StageEntity interface. |
| `src/core/flow/` | core (scene/state flow, composition root) | Title, walk and story flows, the Green Zone scene with its event-to-fx and event-to-audio bindings, boot, debug URL routing and window.\_\_sv. It is the only part of core allowed to import ui, story and content, and only main.ts imports it. |
| `src/entities/` | entities | Requested group. World objects as Entity extends PIXI.Container, with update(dt, ctx) at the fixed step and render(alpha) for interpolation: the player, actors, critters, items, props, pickups and the carried label. Also the factory and stage dressing that spawn them, and the animation components. |
| `src/entities/effects/, src/entities/markers/` | entities | World-space effects and walk/fight markers under the same Container contract: particles, popups, rings, bark waves, the bubble, magnet rings, the exit marker, sight cones, goal rings, flames and combat markers. They advance state in update and redraw Graphics only when something changed. This replaces fx/. |
| `src/ui/` | ui | Requested group, in sub-folders: - widgets/: menu, list navigation, buttons, paper card, overlay base. - text/: markup, formatters, logo. - hud/: both HUDs, the radar, notices, the off-screen arrow. - story/: the dialogue box and card layer. - touch/: the view, icons and hints. - effects/: shout, disco lights, screen overlay, attack glitch. - minigames/: the views. - screens/: title, overlays, cards, story screens, the debug sprite viewer. ui never imports story, content or core/flow. |
| `src/systems/` | extra: pure gameplay rules | Fits none of the four groups. These are rules with no pixi.js, DOM, localStorage or Input, unit-tested without mocks: - world/: the map model. - player/: needs and player motion. - motion/: steering, flee, sight and cone tests. - nav/: pathfinding. - combat/: foe rules. - greenZone/: rules, threats and ambush, run over intents and Spawner/BandMember interfaces. - campaign/: meters, costumes and progression. - story/: the dialogue gesture rule and the gap box. |
| `src/story/` | extra: story engine | Fits none of the four groups: it is the script interpreter that the chapters are written against. It holds the Step contract and runner, the narrow StoryContext, the StoryScene facade, the step vocabulary, walk objectives, the fight controller, mini-game simulations and their glue, and the autopilot strategy (pilot() is part of the step contract that playtest needs). It never imports content: maps, themes, speakers and lexicon arrive through an injected StoryCatalog. |
| `src/content/` | extra: content and level data | Fits none of the four groups, and CLAUDE.md forbids putting it in config. Chapter scripts (ch7 split by sub-level), script vocabulary, titles, marvels, endings and card prose, speakers, lexicon, story stages and themes, the Green Zone level, and the mini-game texts. Scripts reach the engine only through story's public entry points and ctx facades. |
| `src/main.ts` | root | Vite entry (index.html loads it). Shrinks to boot() from core/flow/bootstrap.ts plus the #boot error report. |

## 5. Entity model

How a class that extends `PIXI.Container` gets its `update(delta)`, and where input, movement maths and drawing go.

BASE CLASS: src/entities/entity.ts, `export abstract class Entity extends Container implements Sortable, StageEntity`.

Simulation state, written only in update:
- gx, gy, z (grid floats), depthBias, alive.
- static: true for props, wall blocks and forest trees.
- driver: 'owner' | 'world'.
- baseTint.
- Plain-number clocks: time, flash timers, squash spring, blink and bob phases.

Interpolation: prevX, prevY, prevZ and savePrev(). World.beginStep calls savePrev on dynamic entities only.

Occlusion: fadeable, fade, fadeTarget, written by World's render pass as today.

cullBox (renamed from `bounds`) is derived from the CharacterDef or SpriteDef instead of literals.

`get id()` returns this.uid. It is monotonic in creation order, so compareDepth's tie-break is unchanged and the module-global nextId goes.

update(dt, ctx) is the user's update(delta): the existing fixed 60 Hz step.
- Logic only: timers, the action state machine, calls into pure systems functions, AnimationState.advance(dt).
- It also advances the visual clocks (squash spring, blink, bob, hover). They stay in the fixed step so that \_\_sv.step(n) screenshots and seeded playtests stay deterministic.
- It never writes position, alpha, texture, tint, scale, visible or Graphics.

render(alpha) runs once per display frame from World.render.
- It lerps prev to current, projects with gridToScreenInto(scratch) (no allocation), sets position (rounded, minus z) and alpha = fade.
- It then calls protected renderView(alpha) for subclass visuals: texture swap only when the frame changed, body tint = baseTint times hit flash, squash scale, blink as alpha, scared tremble, mirror, hover, bob.
- It never integrates time on its own.

screenRect(out) fills a caller-owned Rect.

destroy() is overridden: it sets alive = false, then calls super.destroy({ children: true, context: true }). It never passes texture: true, because atlas textures are shared.

A transitional `get view(): this` keeps World, walk, carry, ambush and the storyScene fog compiling for one step. It is removed at cleanup.

EntityContext = { map: GameMap, player: Readonly&lt;{gx, gy, vx, vy}>, time, pollute(x, y, r, strength), signal(kind, e) }.
- pollute replaces map.stampDirt calls from PoopPile and Bagnaskiz.
- signal replaces the mixed step() return values: a boolean for Cat, Ball and PoopPile, 'bump' for Bagnaskiz.

Name collision found in this review: Actor's constructor property `readonly name` collides with Container's deprecated `name` (pixi.js 8.23 findMixin). With noImplicitOverride on and ES2022 class fields, it breaks compilation and would shadow the alias at runtime.
- It becomes Container's own `label`.
- Its only writer is steps.ts:253 through addActor, and nothing outside reads it.
- No other Entity field collides (checked against Container and its mixins). `bounds` is renamed anyway for clarity against getBounds and boundsArea.

MOVEMENT AND PHYSICS: never inside entity classes. Pure functions in systems/ read and mutate plain records that each entity owns:
- systems/player/playerMotion.stepPlayerMotion(body, intent, env {terrainAt, moveCircle}, dt) holds zampano 176-242 in the same arithmetic order: dead zone, screenDirToGrid, RUN gating, analog scaling, fetch run, accel/decel, knockback decay, push velocity, collision, energy, facing.
- systems/motion/steering.steer(behavior, self, target, map, dt, out) holds actor 139-146 and 161-277 and returns a desired velocity.
- systems/greenZone/critterAi holds the cat and pug decisions.
- systems/motion/{flee, sight, cone} and GameMap.moveCircle / pushOutOfProps do the collision.
- Math.random calls stay at the same call sites in the same order, so playtest reports do not drift.

INPUT: entities never read Input. core/input/intent.intentFromInput(input, out) builds one PlayerIntent {mx, my, run, pee, action, bark, strike, guard} per step.
- Controllers that produce intents:
  - GreenZoneScene passes the intent to Rules.update(dt, intent) and Threats.update(dt, intent), which replace (dt, input).
  - story/walk/walkInput adds the scramble rotation and action modes.
  - The story move() step builds a scripted intent with gridDeltaToStick.
- The autopilot keeps driving Input.override, trigger and pushTap, so playtests go through the same path.
- player.setIntent(intent) stores the intent; Zampano consumes it in update.
- Touch hit areas have one writer, core/input/touchLayout. ui/touch only draws.

ANIMATION AND VIEW STATE: CharacterAnimator splits in two.
- AnimationState (pure: key, anim, dir, time, speed, play, definition, finished, advance(dt) returning whether the frame changed) is advanced in update.
- CharacterSprite extends Sprite swaps the texture only on a change, using the name tables in manifest/names. This fixes the per-step textureName string build (entity.ts:101, manifest.ts:370).
- The player keeps the field name `animator`, because scripts read player.animator.key.
- Special figures use FigureSprite instead of a second code path inside Actor.
- STATE_ANIM (a view table) stays in zampano.ts; LOCKS_MOVEMENT moves to systems/player/playerMotion.

Entity.view and Entity.sprite today:
- `view` disappears: the entity is the Container. World adds the entity itself to objectLayer, and children (shadow, then CharacterSprite, FigureSprite or Sprite) are added to `this` in the constructor.
- `sprite` stays as the readonly main body child on Actor, PropEntity and PickupEntity, but outside code stops writing sprite.tint (helpers.ts:269, ch7.ts:362, combat.ts:403). It sets baseTint or calls flash(), and renderView applies it.
- Container.tint is not used for gameplay tints, so it never multiplies with the body tint.
- animator.sprite becomes entity.body.

WORLD LOOP, under the unchanged fixed-step model (the Pixi ticker stays stopped):
- Each step, in order:
  1. world.beginStep() calls savePrev.
  2. Scene logic runs: the intent build, Rules, Threats, Ambush, the script step.
  3. driver 'owner' entities are updated by their owners exactly where they are today: StoryScene steps the player then the actors; Rules steps the player and the poops; Threats steps the cats, balls and pug; Ambush steps the band.
  4. world.updateEntities(dt, ctx) updates the 'world' entities (Treat, PickupEntity, CarriedLabel) in insertion order.
  5. world.endStep(dt) advances the map timers and the camera follow.
- Each frame, world.render(alpha):
  - The camera's viewOrigin(alpha) scrolls a render-group root, so the scroll does not recompute every tile transform (audit world.ts:164, game.ts:87).
  - MapRenderer, its own group, culls and animates visible chunks only.
  - Dynamic entities are culled, then render(alpha) runs.
  - Static props are culled per ground chunk and their alpha is written only when the fade changes.
  - One depth sort runs only when a dynamic entity moved, without the second sort through sortableChildren.
  - Static props stay in objectLayer, because they must interleave in depth with moving entities.

EFFECTS AND MARKERS (Particles, Popups, RingLayer, BarkWaves, DigestionBubble, MagnetRings, ExitMarker, SightCone, GoalMarkers, Flames, CombatMarkers) follow the same contract. They advance plain state arrays in update and write sprites or Graphics in render, through core/render/redraw (a key change triggers the redraw), so a still frame issues no clear(). Pools hide sprites instead of removing them.

SCREENS AND UI WIDGETS:
- Scenes keep their `root` field, because SceneManager and scripts (\_\_sv.top().root.visible) use it. They may extend core/scene/sceneBase to get render-group roots and owned-resource disposal.
- Widgets that own a subtree (Menu, ButtonList, the HUDs, mini-game views) may extend Container with the same update/render split.
- Step and MiniGame gain an optional render?(alpha), forwarded by StoryScene.render. This is the structural fix the audit names at miniGame.ts:13-39.

## 6. Config plan

STRUCTURE
src/config.ts (752 lines, 31 frozen `as const` objects) becomes the folder src/config/, with an index.ts barrel.
- The first commit creates the domain files, moves the 31 objects into them verbatim (same names, same shapes), and deletes src/config.ts in the same commit.
- Under moduleResolution 'bundler', '../config' then resolves to src/config/index.ts. No importer changes: 71 src files, 15 test imports and 2 dynamic test imports.
- Config files import only other config files and stay `Object.freeze({...} as const)`.

DOMAIN FILES
- display.ts: DISPLAY, LOOP, ISO, CAMERA, OCCLUSION, plus VIEW, RENDER, STAGE, GROUND.
- colors.ts: C (moved from ui/retro.ts, which re-exports it until its 31 importers move), NEON numeric twins built by a local parse, INK, PAPER, VOICE, OLD_WORD_COLOR, MODE_BAR, METERS, RADAR, TOUCH_MODES, COMBAT_FX, TINTS, MENU, CARD_BG, LOGO_STYLE, SPARK_TINTS, the particle palettes, SCREEN_FX, GOAL, MAGNET, HUNGER_STOPS.
- input.ts: INPUT, plus KEY_BINDINGS, DEFAULT_CONTROLS, STICK, TOUCH_LAYOUT, BUTTON_IDS, SCRIPTED_WALK.
- ui.ts: TITLE, COUCH, GLOSSARY, SUPERVILLAINED, plus STORY's TEXT_CPS, CHOICE_GUARD, DIALOGUE_BOX and SAY_INSET, plus OVERLAY, TITLE_LAYOUT, LEVEL_END, MENU, HUD, STORY_HUD, CHOICES, CARD, NOTICES, SAY_POPUP, BOOK, STORY_MENU, BANNER, TOUCH_VIEW, GUARDS, FONT_METRIC.
- fx.ts: FX, plus PARTICLE, BURSTS, POPUP, RINGS, BARK_WAVE, SHOUT, ATTACK_GLITCH, TRANSITION, SPARKS, BUBBLE, SHAKE, BLUR.
- audio.ts: AUDIO, plus LEVEL_STEPS, SYNTH, BAND_PITCH, EVENT_PLAYBACK, DUCK, MUSIC, STAR_PITCH_STEP.
- motion.ts: PLAYER, ENERGY, TERRAIN, PLAYER_MOTION, KNOCK_DECAY, STEERING, FLEE_AI. These are shared by the Green Zone and the story, so they are not filed under either.
- greenZone.ts: HUNGER through BARK, plus BAND_BODY, CRITTERS, RULES, THREATS, BAND_RUNTIME, PLACEMENT, STAR_MAX, EXIT_DELAY.
- story.ts: STORY's engine blocks, plus WALK, VISOR, STEPS, FOLLOW/LULL defaults.
- combat.ts: COMBAT, plus COMBAT_RULES, COMBAT_VIEW.
- minigames.ts: RHYTHM, WEEPING, PARADE, LADDERS, TUG (moved out of STORY when each game is split), plus MINI layouts.
- campaign.ts: CAMPAIGN {COMMOZIONE_FADE, GRACE, STANDING, COST}, METER_START, METER_MAX, DREAM_CHAPTERS.
- art.ts: ATLAS, LEVEL_ATLASES_KEPT, FONT, ALPHA_CUT, PORTRAIT_PROBE, TINT_CACHE_MAX.
- debug.ts: PILOT (STORY.PILOT + COMBAT.PILOT), AUTOPILOT, URL, SPRITE_VIEWER.

ORDER OF WORK
1. Move the blocks whole. No values change, and the screenshots must be byte-identical.
2. Split the blocks that mix concerns in the same commit that moves their consumer: PLAYER view numbers, TITLE colours and timing, STORY's UI, campaign and pilot keys, COMBAT.PILOT, INPUT.JOYSTICK_ZONE and GESTURE_FLASH, AMBUSH.SHOUT_\*, VOICE_VOLUME and VOICE_INSET, BARK.WAVE_SPEED and ANIM_TIME, the POLLUTION overlay alphas. Tests that read moved keys update in the same commit: campaign.test reads STORY.GRACE, COMMOZIONE_FADE and STANDING (to CAMPAIGN.\*) and METER_START/MAX (to config).
3. Pull inline literals in file by file as each file moves, with identical values; the screenshots must match the step-0 baseline.

DUPLICATES
- Resolved:
  - 216x400 becomes VIEW.
  - The iso half-tile literals 16/8 (gameFx 334, gameScene 251, world 101, autopilot 141, steps 282-302) become HALF_W/HALF_H and gridDeltaToStick, derived from ISO.
  - Knockback decay 9 becomes one KNOCK_DECAY, with the old keys aliased.
  - ALPHA_CUT 110 becomes one constant.
  - 0xffe23a and the other numeric copies of C become NEON.
  - The ch1/ch2 visor numbers become VISOR.
- Not merged silently:
  - '#f6c8e0' and '#f6c0e0' stay two tokens.
  - 0xff2bd6 is not C.hotPink.
  - The two pee yellows stay separate.

WHAT DELIBERATELY STAYS OUT OF CONFIG
- Sprite manifest data (SPRITES, CHARACTERS, clip timing, delivered paths, PROP_SPRITE): core/assets/manifest, following the ASSETS.md workflow.
- Placeholder drawer colours, geometry and hash salts: procedural pixel art, kept with the drawers.
- GLSL constants: in the shaders.
- THEMES, the LEVEL_1 palette, the story stage ASCII and per-scene coordinates, speeds and card timings in chapter scripts: level data in content/, per CLAUDE.md. Only colours repeated across scenes become tokens, and the duplicated visor and walk rules become walk options plus config.
- The SOUNDS patch table: audio data in core/audio/patches.
- Algorithm constants (mulberry32, xorshift, A4 = 440): inline.
- UI copy (in screens) and story prose (in content).
- Storage keys and v1 migration lists: in core/state/campaignSave.

DOCS: CLAUDE.md's 'config.ts — every tuning number' becomes 'config/ — every tuning number, colour and layout dimension, one file per domain'.

## 7. Dependency rules

- Layers, bottom to top. An import may point down, or sideways inside its own layer; type-only imports obey the same rule:
  - L0 config/
  - L1 core/math/, core/util/
  - L2 core/assets/manifest/
  - L3 systems/
  - L4 core runtime
  - L5 entities/
  - L6 ui/
  - L7 story/
  - L8 content/
  - L9 core/flow/ and src/main.ts
  The layer test resolves imports through barrels to the real file.
- config/ imports only other config files: no src module and no types. Tables keyed by higher-layer unions (KEY_BINDINGS, DEFAULT_CONTROLS, FILE_GAIN) are checked with `satisfies` where they are used.
- core/math/ and core/util/ import only config/: no pixi.js and no DOM.
- core/assets/manifest/ imports only config and core/math (type Dir8). It is pure data. Its tables keyed by higher-layer unions (PROP_SPRITE, PICKUP_SPRITE) use string keys and are checked at their use sites (entities/stageDressing, story/walk).
- systems/ imports only config, core/math, core/util and core/assets/manifest. It never imports pixi.js, DOM, localStorage, Input, entities, ui, story or content. Entities reach systems only through structural interfaces declared in systems (WorldAccess, Spawner, BandMember, PlayerHandle, DialogueGestureTarget), which higher layers implement. Inside systems the order is world, then player and motion, then nav and combat, then greenZone, campaign and story; those last three never import each other.
- The core runtime (L4) may import L0-L3, pixi.js, DOM and @capacitor/core. Its internal order is acyclic: state, audio, input, render, assets (non-manifest), scene, stage, app. It never imports entities, ui, story, content or core/flow. This removes today's core-to-fx edges (transition, audio tables) and the core-to-placeholders edge (PixelBuffer). core/state to systems/greenZone/lives becomes a legal downward edge. core/stage depends on the StageEntity interface, not on entities.
- entities/ may import L0-L4. It never imports ui, story, content or core/flow. Text comes from core/render/text, so popups and the carried label need no ui import.
- ui/ may import L0-L5 (entities only for effect layers such as Particles in the supervillained snap). It never imports story, content or core/flow. Lexicons, speakers and view models (ProgressSummary, menu rows, HudState, LevelResult) arrive as parameters or plain data. Internal order: widgets and text, then hud, story, touch, effects and minigames, then screens.
- story/ may import L0-L6. It never imports content or core/flow: maps, themes, speakers and lexicon arrive through the StoryCatalog, and the chapter schema lives in story/engine/types.ts. Internal order: engine/types, step and context, then steps, walk, combat, minigames and pilot, then engine/storyScene. Type cycles are broken with interfaces: PilotApi in engine/step, WalkSnapshot in walk/types, StoryContext in engine/context.
- content/ may import config, core/math (along, geometry), systems (pure rules and types: Effects, spend, graceTier, dreamSkin, Behavior, Palette) and the public entry points of story (story/steps, story/walk, story/minigames, story/combat/types, story/engine/types and context). It never imports core runtime modules, entities or ui. Scripts reach stage, effects, audio, tints, filters, camera and transitions only through ctx facades.
- core/flow/ and src/main.ts may import anything. Nothing imports core/flow except main.ts.
- Pixi-free set: config, core/math, core/util, core/assets/manifest, core/state, core/input (DOM only) and systems contain no `from 'pixi.js'`, value or type. Their unit tests need no vi.mock('pixi.js'). Entity update(dt, ctx) writes no display state, so entity logic tests need only an empty Container mock.
- Barrels exist only where an outside caller needs a stable path: config/index, core/assets/index (it is the registry itself, so the vi.mock id holds), core/assets/manifest/index, core/assets/environment/index, core/input/index, core/audio/index, systems/combat/index, story/steps/index, story/walk/index, story/combat/index, story/minigames/index, story/minigames/words/index, content/index. Code inside src imports concrete files.
- Enforcement without a new dependency: tests/layers.test.ts reads every src file with node:fs, resolves each specifier to its layer and fails on a forbidden edge or an intra-folder cycle. It starts with an allowlist of today's violations, each step deletes the entries it fixes, and the list must be empty at the end.

## 8. Decisions

- Four requested groups plus three extra top-level folders, each holding code that fits none of the four:
  - systems/: Pixi-free rules.
  - story/: the script runtime.
  - content/: level data and prose, which CLAUDE.md keeps out of config.
  fx/, scenes/, world/, iso/, levels/, campaign/ and assets/ dissolve into these seven. There is no debug/ folder:
  - The sprite viewer is a screen.
  - The autopilot is part of the step contract that playtest needs.
  - findPath is a pure rule.
  - \_\_sv and the URL routing are composition.
- Base proposal: 'faithful' (score 8), with grafts from 'pragmatic' and 'separation' listed in `grafted`.
  Rejected:
  - separation's Math.random ban in pure code: it would reorder RNG draws and drift every seeded playtest and screenshot.
  - separation's Rules/Threats as data records with an entitySync layer: a rewrite that touches the rules.treats objects screenshot.mjs reads.
  - separation's World and Camera under entities.
  - pragmatic's keeping of ten legacy folders and its ui/pixelText exception for entities.
  - pragmatic's gameplay tints through Container.tint, which multiply with the child body tint.
- Entities extend PIXI.Container as asked, with update(dt) on the existing fixed step and render(alpha) for interpolation.
  - Visual clocks advance in update and render only applies them, so stepped screenshots stay deterministic.
  - All motion and steering maths lives in systems as pure functions, so it is unit-testable without Pixi.
  - Input reaches entities only as a PlayerIntent.
- The fixed-step model is unchanged: logic in update(dt) at 60 Hz, visuals in render(alpha) with savePrev interpolation, the Pixi ticker stopped and Pixi events off. Step and MiniGame gain an optional render?(alpha), forwarded by StoryScene.render.
- The text rasterizer (pixelFont, pixelText) moves to core/render/text, not ui/, because entities (popups, the carried label) need text and entities sit below ui. The three vi.mock('../src/ui/pixelText') strings change in the same commit.
- World, MapRenderer and Camera become core/stage. World stops building textures and creating entities: entities/factory and entities/stageDressing do that, called by the stage owners. World depends only on the StageEntity interface, so core never imports entities.
- Rules, Threats and Ambush stay pure systems. They take a PlayerIntent and spawn through a Spawner interface that GameScene implements with entities/factory. The Rng salts, the call order and the field names read by scripts (treats, poops, stats, hunger, pug, catTimer, ballTimer, balls, director, band, holdsAttack, skip) are preserved.
- Path stability:
  - Files that grow into folders use `git mv X.ts X/index.ts`: config, core/assets (the registry itself stays in index.ts, so vi.mock('../src/core/assets') holds), core/input, core/audio, story/steps, story/walk, story/combat, story/minigames/words, content/.../ch7.
  - Other moves leave temporary `export *` shims at the old paths, deleted at cleanup.
  - vi.mock targets never rely on shims; they change in the same commit as their module.
- The save format does not change. CampaignState stays version 2 and STORY_VERSION is not bumped: this is a pure move, so CLAUDE.md requires no migration. The keys supervillained:story, :story-v1-backup, :story-unknown-backup, :settings, :records and :coins are unchanged. STORY_VERSION lives with the model it types (systems/campaign/model) and is re-exported by core/state/campaignSave. migrateV1 and its tests move unchanged.
- Every name scripts/\*.mjs reaches stays reachable:
  - Class names checked with constructor.name: TitleScene, BriefingScene, PauseScene, OptionsScene, ControlsScene, ConfirmScene, LevelEndScene, GlossaryScene, SupervillainedScene, StoryCardScene, StoryScene, GameScene, WalkStep, SayStep, AskStep, CardStep, MiniGameStep, LetterGame, RumourGame, LaddersGame, TugGame, BoatGame, RhythmGame.
  - Fields and methods: \_\_sv.{game, flow, scene, top, storyIds, step, art, faceToward}; flow.{play, toTitle, current, back, story.\*} (including the private showEnding); scene.{rules, threats, ambush, player, events, fx.voices.root, map, world.snapCamera, teleport, debugState}; StoryScene.{current, mapKey, dialogue, apply, actionMode, metrics, marker, knighted, controls.hand, debugSkip}; current.combat.{foes, health, routed}; current.game.{buttons, picker.cursor, picks, placed}; TitleScene.actions; menu.rows; BriefingScene.prompt; player.{animator.key, invulnerable, setPosition, face}.
  scripts/\*.mjs import nothing from src, so they need no path changes.
- Colours become config tokens, but art data does not: the manifest, placeholder palettes, GLSL constants, THEMES and the Green Zone palette stay with assets or content. Chapter scripts keep their coordinates, speeds and card timings as level data. Their duplicated rules (visor, clang, survive 1e9, speedMul writes, blockGap) become walk options or vocab, and their direct engine writes become ctx facades.
- UI copy stays in its screen. Story prose (endings, cards, letter, rumour, rhythm presets, lexicon, speakers) moves to content and reaches the engine through the StoryCatalog and constructor options. ui/text/markup receives its word lists as parameters.
- Pure rules extracted from view classes become testable modules: levelResult, unlocked and the menu row models, walkHudModel, bookModel, handRing, discoBeat, stepPlayerMotion, steer, critterAi, sight, cone, pathfinding, pushOutOfGap, listNav.
- Kept whole on purpose: core/scene/transition.ts (74 cohesive lines), core/audio/engine.ts (one WebAudio graph), core/render/text/pixelText.ts (one renderer), systems/world/map.ts (one heavily tested model), core/assets/manifest/sprites.ts (the table artists edit).
  Every god file in the brief is split:
  - overlays.ts into 14 files.
  - config.ts into 15.
  - maps.ts into stages, storyMaps, themes and asciiMap.
  - storyArt.ts into 3 plus raster.
  - walk.ts into about 18.
  - critters.ts into 6.
  - ch7.ts into 6.
  - storyScene.ts into 7 plus screenOverlay and noticeStack.
  - input.ts into 7 plus config.
  - touchControls.ts into 3 plus touchLayout.
- Test import path changes (tests/ otherwise out of scope):
  - world/{level, map, tiles} -> systems/world/{level or asciiMap, map, tiles}.
  - assets/manifest and animationTiming -> core/assets/manifest.
  - levels and levels/level1 -> content/levels.
  - iso/{projection, depth} -> core/math; iso/camera -> core/stage/camera.
  - core/{loop, display} -> core/app; core/rng -> core/util/rng; core/synth -> core/audio/synth; core/{storage, settings} -> core/state (records split out).
  - fx/sounds -> core/audio/patches and medievalMusic; fx/audioFiles -> core/audio/files; fx/transition -> core/scene/transition.
  - Mocks: '../src/ui/pixelText' -> core/render/text/pixelText (input, touchControls, wordGames); '../src/assets/build' -> core/assets/spriteTextures (touchControls); '../src/fx/glitchFilter' -> core/render/filters/glitchFilter (transition). '../src/core/assets' is unchanged.
  - assets/placeholders/{pixel, tiles, storyArt} -> core/assets/pixelBuffer, core/util/color and core/assets/placeholders/\*; assets/environment -> core/assets/environment.
  - story/names -> ui/text/markup, content/campaign/lexicon and config/colors; story/maps -> content/maps/storyMaps and themes; story/ui (SPEAKERS) -> content/campaign/speakers; story/storyScene (types) -> story/engine/storyScene; story/dialogueGestures -> systems/story/dialogueGesture; story/autopilot -> story/pilot/autopilot. story/minigames/words and miniGame keep their paths.
  - campaign/state -> systems/campaign/{model, rules, costumes}, core/state/campaignSave, content/campaign/endings and config/campaign; campaign/summary -> systems/campaign/progression and ui/text/format; campaign/home -> content/campaign/marvels; campaign/titles and chapters -> content/campaign; campaign/chapters/helpers (blockGap) -> story/walk/objectives/barriers and systems/story/gaps.
  - entities/critters -> entities/critters/bagnaskiz.
  - systems/needs -> systems/player/needs; the systems/scoring formatters -> ui/text/format; threatLogic fleeDirection and inBarkCone -> systems/motion/{flee, cone}; systems/{ambush\*, placement, lives} -> systems/greenZone.
  - ui/touchControls -> ui/touch/touchControls; ui/menu -> ui/widgets/menu; ui/titleAnim -> ui/screens/title/titlePortrait; ui/discoLights -> ui/effects/discoBeat (its pixi.js mock is dropped); scenes/spriteViewerScene -> ui/screens/debug/spriteViewerScene.
- No new runtime or dev dependency. Layering is enforced by tests/layers.test.ts (Vitest plus node:fs), so DECISIONS.md needs only a note on the layer table. CLAUDE.md (Architecture and 'Common changes': config/, story maps in content/maps, chapters in content/campaign/chapters, steps and walk folders, core/app/native.ts), ASSETS.md (manifest, core/audio/files, patches, greenZoneAudio) and docs/BACKLOG.md paths are updated in the step that moves each file they name, and checked again at cleanup.

### Ideas grafted from the other proposals

- From pragmatic: `git mv X.ts X/index.ts` for files that become folders. In particular, core/assets/index.ts is the texture registry itself, so vi.mock('../src/core/assets') keeps working without a shim.
- From pragmatic: step-0 baselines (a seeded playtest report, screens and environments PNGs, smoke logs), diffed after every behaviour-adjacent step.
- From pragmatic: visual clocks (squash spring, blink, bob, hover, flash) advance in update(dt) and render(alpha) only applies them, so \_\_sv.step(n) screenshots stay deterministic.
- From pragmatic and separation: Actor's `readonly name` becomes Container `label`. This review confirmed that pixi.js 8.23 findMixin declares `name` and that tsconfig has noImplicitOverride, so the old property would not compile.
- From pragmatic: the settings controller lives in core/app (the top of the core runtime) as settingsActions.ts, avoiding a core/state-to-Game upward edge.
- From pragmatic: separate config/combat.ts and config/minigames.ts, and `satisfies` checks for AUDIO.FILE_GAIN, KEY_BINDINGS and DEFAULT_CONTROLS at their use sites.
- From separation and pragmatic: core/state/ naming (the user's 'state management' wording) instead of core/save/.
- From separation and pragmatic: core/input split into keyboard.ts and pointer.ts devices behind the Input facade, plus a types.ts.
- From separation: core/render/redraw.ts (CachedGraphics keyed redraw, and blinkAlpha instead of `visible` toggles).
- From separation and pragmatic: core/scene/sceneBase.ts (worldRoot/uiRoot render groups, owned filters, textures and graphics destroyed on exit, input guard, VIEW defaults).
- From separation: ui/widgets/listNav.ts, pure keyboard and tap selection shared by Menu, the DialogueBox choices and ButtonPicker.
- From separation: a PilotApi interface in story/engine/step.ts, so the engine never imports the autopilot; plus WalkSnapshot and StoryContext interfaces to break type cycles.
- From separation: systems/player/ (needs and playerMotion, shared by both modes) and config/motion.ts (PLAYER, ENERGY, TERRAIN, STEERING, KNOCK_DECAY shared by the Green Zone and the story).
- From separation: content/index.ts as the single registry (StoryCatalog, chapters, maps, levels) that the composition root imports and injects.
- New in this synthesis: an explicit internal order for the core runtime layer; STORY_VERSION kept in systems/campaign/model; PROP_SPRITE and PICKUP_SPRITE keyed by strings in the manifest and checked at their use sites; story/minigames/words/index.ts so the wordGames.test path still resolves; endingNotes split into systems endingTiers plus content prose.

## 9. How the three proposals scored

| Proposal | Score /10 | Files | Strengths | Weaknesses |
|---|---:|---:|---|---|
| faithful | 8 | 290 | Answers the request most directly: the four groups hold exactly what you described, and only three honest extras (systems, story, content) take the rest. It splits every god file with line-level receipts. Entity extends Container with a clean update/render split, a PlayerIntent and a driver flag that preserves today's update order. The StoryCatalog injection removes engine-to-content edges. Its 17-step migration is complete, with a layering test whose allowlist only shrinks. It preserves the save format and every \_\_sv and script-read name, and has the most thorough risk list. | - core spans the whole graph (core/math at the bottom, core/flow with GameScene at the top) and never states an order inside core. - settingsActions in core/save needs Game, an upward edge. - PROP_SPRITE goes into the manifest, below the systems layer that owns PropKind. - core/assets/registry.ts would break vi.mock('../src/core/assets'). - It misses the Actor.name collision with Container.name (noImplicitOverride is on). - Computing visual motion in render risks drift in stepped screenshots. - It moves STORY_VERSION away from the model type it describes. |
| separation | 6 | 278 | States the principle best: input becomes intents, intents feed a pure simulation, the simulation feeds views, and world-space and screen-space become separate render groups. It offers useful primitives: - core/render/redraw (key-guarded Graphics, alpha blinks), - a SceneBase that owns and destroys filters, - a pure listNav shared by menus, choices and pickers, - a PilotApi so the engine does not import the autopilot, - content injected by main. It caught the Actor.name collision and split mini-games into sim, view and glue. | - Its migration order stops at step 5 of the 14 its summary announces, so criterion 4 is not met. - Banning Math.random in sim/ would reorder RNG draws and drift every seeded playtest and screenshot; its own risks section contradicts the rule. - Rewriting Rules and Threats as data records with an entitySync layer is a rewrite that touches the fields scripts read. - World, MapRenderer and the pure Camera are filed under entities/. - The story engine is renamed 'modes', there are four extra folders, and the debug/ folder adds one more top-level concept. |
| pragmatic | 7 | 172 | The safest mechanics: - `git mv X.ts X/index.ts` keeps import strings and vi.mock ids. - Step-0 baselines are diffed after the behaviour-adjacent steps. - Visual clocks stay in update, so screenshots stay deterministic. - Actor.name becomes label. - A Transition interface removes the core-to-fx edge. - settingsController sits at the top of core. It has a complete 14-step order with named checks and an explicit Pixi-free set. | - Ten extra top-level folders (fx, iso, world, assets, systems, story, campaign, levels, scenes, debug): the four requested groups are only partly realised, and fx/ still mixes world effects, screen overlays and filters. - Entities import ui/pixelText as a rule exception. - Rules and Threats move to scenes/ instead of becoming pure. - Gameplay tints go through Container.tint, which multiplies with child tints. - UI text formatters sit in core/util. |

## 10. Migration order

Each step keeps `npm run build` and `npm test` green.

### Step 0, guard rails and baselines (no behaviour change)

- Add tests/layers.test.ts with the layer table and an allowlist of today's violations; it passes at HEAD.
- Record the baselines: a seeded `npm run playtest -- --choice random` report, `npm run screens` and `npm run screens:environments` PNGs, and `npm run smoke` logs.
Every later step must keep `npm run build` and `npm test` green and delete the allowlist entries it fixes. Never edit src/ while smoke, playtest or screens run.

### Step 1, config

- Create src/config/{display, colors, input, ui, fx, audio, motion, greenZone, story, combat, minigames, campaign, art, debug, index}.ts with the 31 objects moved verbatim, and delete src/config.ts in the same commit.
- Move C into config/colors.ts, with ui/retro.ts re-exporting it.
Checks: build, test, screens byte-identical.

### Step 2, pure leaves

- iso/{projection, depth} -> core/math (add geometry.ts).
- core/rng and Emitter -> core/util; colour helpers -> core/util/color; PixelBuffer -> core/assets/pixelBuffer.ts.
- GameEvents and At -> systems/greenZone/events.
- Old paths keep `export *` shims; codemod the src imports and update the test imports.
Checks: build, test.

### Step 3, persistence and campaign rules

- core/storage, settings and the new records -> core/state. Keys unchanged; cycling helpers stay in settings.ts.
- campaign/state -> systems/campaign/{model, rules, costumes} + core/state/campaignSave + content/campaign/endings, with migrateV1 untouched.
- campaign/summary -> systems/campaign/progression + ui/text/format.
- Update the campaign, summary, settings and audio test imports.
Checks: build, test, `npm run smoke -- progress`.

### Step 4, pure systems

- world/{tiles, level, map} -> systems/world, plus asciiMap.ts with structureStoryRows; walkableNear and randomSpotNear become GameMap methods.
- needs -> systems/player.
- The pure Green Zone modules (scoring with levelResult, lives, threatLogic, ambushLogic, ambushEntry, placement) -> systems/greenZone.
- combat -> systems/combat/ with its index.
- fleeDirection, cone and sight -> systems/motion; findPath -> systems/nav (same tie-break order).
- dialogueGestures and the gap box -> systems/story.
- rules.ts, threats.ts and ambush.ts move to systems/greenZone/ as-is, still on the allowlist.
Checks: build, test, `npm run playtest -- --from 3.1 --to 3.4`, diffed with the baseline.

### Step 5, core services

- core/audio.ts -> core/audio/ (git mv to index, then split engine, synth, files, patches, medievalMusic; the 17 ?url paths are rebased).
- fx/transition -> core/scene/transition; the three filters plus filterVertex -> core/render/filters.
- ui/pixelFont and pixelText -> core/render/text.
- game, loop, display and native -> core/app; add lifecycle.ts, layers.ts, dispose.ts and redraw.ts (helpers not yet used).
- In the same commit, update the vi.mock strings for pixelText (input, touchControls, wordGames tests) and for glitchFilter plus the ScreenTransition import (transition test).
Checks: build, test, `npm run smoke -- menus`, screens identical.

### Step 6, asset loading

- `git mv src/core/assets.ts src/core/assets/index.ts` (mock id unchanged); add atlas.ts with AtlasHandle and unregister.
- build.ts -> characterTextures (with an explicit ensureCharactersSync), spriteTextures and levelTextures; update the '../src/assets/build' mock in touchControls.test.
- manifest -> core/assets/manifest/\* (src/assets/manifest.ts left as a shim); environment -> environment/\*; placeholders -> core/assets/placeholders/\* (drawer registry, declarative castSpecs, shared raster).
- titleAnim and titleArt decoders -> animatedImage, logoArt and crisp, with cache eviction.
Checks: build, test, screens and screens:environments pixel-identical, smoke.

### Step 7, pure motion extraction with no class change

- Zampano.updateMovement maths -> systems/player/playerMotion; Actor.step steering -> systems/motion/steering; the Cat and pug AI -> systems/greenZone/critterAi.
- Call them from the existing methods with the same arithmetic and RNG order, and add unit tests for them.
Checks: build, test, a full playtest whose report matches the baseline, `npm run smoke -- walk`.

### Step 8, entity base. One commit, because every entity class shares the base

- Entity extends Container, with the update(dt, ctx)/render(alpha) split, visual clocks still in update, cullBox, id from uid, baseTint, driver flags that keep today's call order, and the transitional `view` getter.
- AnimationState, CharacterSprite and FigureSprite; Actor's `name` becomes `label`.
- Extend the pixi.js Container mock in sbrimbrulonActor.test if its constructor now touches position, alpha or label.
Checks: build, test, smoke, playtest identical to the baseline, `npm run screens -- ambush m1 m2 m3 m4` identical.

### Step 9, stage and render groups

- world/{world, mapRenderer} and iso/camera -> core/stage, with the StageEntity interface. entities/factory and stageDressing take over the spawning; buildLevelTextures moves to the stage owners.
- Render groups through core/render/layers for World.root, MapRenderer.root and the scene uiLayers.
- Static props with chunk culling, one dirty-guarded depth sort, pooled overlays.
Checks: build, test, screens reviewed by eye (filters on grouped layers may change pixels), smoke.

### Step 10, effects and markers

- fx/particles and popups -> entities/effects (destroy, alpha blinks, root aliases kept). gameFx splits into RingLayer, BarkWaves, DigestionBubble, MagnetRings and ExitMarker, plus core/flow/greenZone/greenZoneFx.
- gameAudio -> greenZoneAudio.
- The walk and combat drawing -> entities/markers, using redraw.ts.
Checks: build, test, `npm run screens -- ambush m1 m2 m3 m4`, `npm run smoke -- walk 3.4 7.5 8.1`.

### Step 11, input and intents

- core/input.ts -> core/input/ (git mv to index; then types, input, keyboard, pointer, gestures, touchLayout, intent). KEY_ACTIONS -> config/input.
- Rules.update and Threats.update take a PlayerIntent; Rules, Threats and Ambush spawn through Spawner and BandMember, which removes their entity imports from the allowlist.
- touchControls becomes view-only; the MENU hit circles move to touchLayout.
Checks: build, test, `npm run smoke -- progress menus keys walk`, `npm run screens -- joystick`, playtest identical.

### Step 12, UI split

- ui/widgets (with listNav, buttonPicker, buttonList, overlay on top of sceneBase), ui/text, ui/hud (radar, hungerBar, walkHudModel, storyHud, noticeStack, offscreenArrow), ui/story, ui/touch, ui/effects (screenOverlay, attackFx, discoBeat), ui/screens.
- overlays.ts becomes one file per class; story screens get row models; couch and glossary share paperCardScene and receive a ProgressSummary; supervillained sparks go through Particles; the debug viewer moves.
- Class names and the fields scripts read are unchanged; filters are owned and destroyed.
Checks: build, test, `npm run smoke -- progress menus keys`, screens of the title, options, controls, couch, glossary, pause and level end.

### Step 13, story engine

- StoryScene splits into engine/{types, step (PilotApi), context, runner, stage, controls, effects, storyScene}, with an injected StoryCatalog that is temporarily built from the old content paths.
- steps.ts -> steps/; walk.ts -> walk/ (objectives, walkInput, follow, lull, visor, barriers, plus new options); combat -> controller plus markers.
- Each mini-game splits into sim and glue in story/ and a view in ui/minigames, one game per commit:
  - rhythm, then smoke 4.1 4.3;
  - ladders, then smoke 5.2;
  - tug, then smoke 7.1 7.7;
  - boat, then smoke 4.2;
  - words, then smoke 5.4 6.2 and `npm run smoke -- keys`.
- The autopilot moves to story/pilot, plus walkPilot.
Checks: build, test, a full playtest (read the report; it must match the baseline), smoke, screens.

### Step 14, content

- campaign/chapters -> content/campaign/chapters (ch7 split per sub-level); chapter scripts switch to the walk options and ctx facades.
- helpers -> content/campaign/vocab; also titles, marvels, cards, speakers and lexicon.
- story/maps -> content/maps/{stages/\*, storyMaps, themes}; levels -> content/levels; mini-game texts -> content/minigames; add content/index.ts.
- Update the campaign, topology, summary, level, ambush, balance, systems, blockGap, pixelCast and environmentAssets test imports and the 'Common changes' paths in CLAUDE.md.
- docs/STORY.md changes only if a script's behaviour changes; none is intended.
Checks: build, test, full `npm run smoke`, then `npm run playtest -- --from N.1 --to N.9` for every touched level.

### Step 15, flow and boot

- scenes/flow -> core/flow/{flow, titleFlow, walkFlow}; story/storyFlow -> core/flow/storyFlow; gameScene -> core/flow/greenZone/greenZoneScene.
- main.ts -> bootstrap, urlParams, automation, plus core/app/lifecycle and core/app/settingsActions.
- \_\_sv member names unchanged.
Checks: build, test, `npm run smoke -- progress menus keys`, a full playtest, screens.

### Step 16, cleanup

- Delete every shim (ui/retro.ts, src/assets/manifest.ts and the others) and the Entity `view` getter.
- Empty the layers.test allowlist.
- Update CLAUDE.md (architecture, common changes, debug URLs), ASSETS.md (manifest, audio files, patches, greenZoneAudio), DECISIONS.md (layer table) and docs/BACKLOG.md.
Checks: npm run build, npm test, npm run smoke, npm run playtest, npm run screens and screens:environments; look at the PNGs, then commit. android:apk is not needed: no native change.

## 11. Risks

- vi.mock is keyed by module id, and a re-export shim does not intercept imports of the new file. Mocks of '../src/ui/pixelText' (input, touchControls, wordGames tests), '../src/assets/build' (touchControls) and '../src/fx/glitchFilter' (transition) must change in the same commit as their module. '../src/core/assets' is safe only if the registry stays in core/assets/index.ts.
- Update order drives behaviour. Moving player, critter or actor updates into a generic World loop, or reordering Math.random and Rng draws (threats salt 0x5bd1e995, ambush 0x2c1b3c6d, the autopilot xorshift, actor wander and flee, fire spread, decoys), drifts playtest reports and screenshots even when the code is correct. The driver:'owner' flag keeps today's order; diff against the baseline after steps 4, 7, 8, 11 and 13.
- Container clashes once entities extend it: Actor.name (handled), Container.tint multiplying with the body tint (not used for gameplay), `visible` shared between culling and blinks (blinks use alpha), and the destroy() signature. The sbrimbrulonActor.test pixi.js mock has only addChild and destroy, so entity constructors must only build and add children.
- Render groups change how filters and transforms apply. The story bleach filter (today on three sibling layers), the title backdrop blur plus glitch, the attack GlitchFilter on worldRoot and the transition's stage.filterArea need a visual check with npm run screens; step 9 is kept apart from the pure moves for this reason.
- Hidden contracts:
  - storyScene.ensureCharactersNow relies on ensureCharacters being synchronous up to packAtlas; this becomes the explicit ensureCharactersSync.
  - Chapter scripts and the follow and lull factories keep mutable closure state that is reset only because script() runs again on each attempt; the facades must not cache step instances.
- Import-time side effects move with their modules: LEVEL_1 builds 96x96 rows on import (and themes read its palette), CAST_SPECS is mutated at import (made declarative), and registerPlugin('AppQuit'), DIR_VECTORS, SOUNDS and CHARACTERS all run at import. A barrel that eagerly imports content can pull the Green Zone build into tests that did not pay for it before.
- Relative ?url imports break silently when a file moves one level: the 17 audio files, the font woff2, the title WebP and the logo PNG. Run npm run build (not only the typecheck) after each move, and confirm with smoke that the audio and art actually load.
- Scripts reach private or undocumented members (threats.catTimer and ballTimer, flow.story.showEnding, menu.rows, picker.cursor, BriefingScene.prompt.content, fx.voices.root.children, constructor names in debugState().step and metrics.minis). A rename breaks smoke, playtest or screens without breaking the build, so grep scripts/\*.mjs before renaming any member.
- A file and a folder with the same base name (config.ts vs config/, steps.ts vs steps/, walk.ts vs walk/, input.ts vs input/) resolve to the file first. The old file must be deleted or git mv'd in the same commit, or two diverging modules exist.
- Docs drift: CLAUDE.md (architecture, 'Common changes', native.ts, config.ts, story/maps.ts, chapters/chN.ts, helpers.ts, ui/menu.ts, ui/shout.ts), ASSETS.md (manifest.ts, audioFiles.ts, sounds.ts, gameAudio.ts) and docs/BACKLOG.md name current paths. Update each in the step that moves the file it names, or authors will put code back in the old places.
- Scope: about 300 destination files across 17 steps, a 521-test suite and a 10-minute playtest. Steps 8 (entity base), 11 (intents and Spawner) and 13 (story engine) change code close to behaviour and need smoke, playtest and screens, not only build and test. A half-applied step 8 (entities extending Container while World still adds e.view) does not compile, so it must land in one commit.

## 12. What moves into each new file

For every file of the target structure: its purpose, what the judge planned for it ("Plan"), and the entries of the symbol map that land there ("Entries"), sorted by current file and line. Line numbers are those of commit `0090696`.

### Config (requested): 15 files, 501 entries

#### `src/config/index.ts`

Barrel: export \* of every config file.

Plan: Replaces src/config.ts (deleted in the same commit), so the 71 src imports, 15 test imports and 2 dynamic imports of '../config' resolve unchanged.

Entries (1):

- `(whole file)` (file) from `src/config.ts:1-752`: **split** as `barrel: export * from './display', './colors', './input', './ui', './fx', './audio', './motion', './greenZone', './story', './combat', './minigames', './campaign', './art', './debug'` · _verified_
  Create the domain files and delete src/config.ts in the same commit. Under moduleResolution 'bundler', '../config' resolves to config.ts before config/index.ts, so the two cannot exist side by side. Importers that need no edit: 56 src files, 15 test files and 2 dynamic imports (threats.test:34, discoLights.test:6). Those figures are verified; the brief's '71 src' counts src and tests together. PLAN BUG: `export *` raises TS2308 when two config files export the same name, and the plan exports MENU from both colors.ts (MENU {SELECTED 0x3a1050...}) and ui.ts (MENU {WIDTH 120, ROW 18...}). Rename the colour one MENU_COLORS. The header comment (lines 1-5, units) moves to index.ts. Today the objects are only `as const`: there are 0 Object.freeze calls, and no src or test file assigns to a config key. So step 1 stays verbatim, and freezing them is a separate change.
  Verifier: Verified: 56 src files + 15 test files import '../config' statically, plus the 2 dynamic imports (threats.test:34, discoLights.test:6). tsconfig is moduleResolution 'bundler', so config.ts would shadow config/index.ts. The MENU clash is real: TS2308 on `export *`. I checked every name the plan puts in the 14 files and MENU is the only clash. URL in debug.ts shadows a DOM global (see entry 168).

#### `src/config/display.ts`

Logical screen, loop, iso, camera, stage and ground-render dimensions.

Plan: DISPLAY, LOOP, ISO, CAMERA, OCCLUSION (config 7-45, 285-289); new VIEW {W 216, H 400} (the 16 placeholder pairs in overlays 25, couch 44, glossary 38, supervillained 35, story/screens 300, storyScene 64, story/ui 83/261/321, miniGame 15, attackBanner 20, discoLights 80, shout 22, touchControls 90, iso/camera 14, main 25); RENDER {CLEAR 0x0c3a10, renderer options} (main 27-36); STAGE {CAMERA_LIFT 10, BOUNDS_MARGIN 4, BOUNDS_PAD 40, CULL_SIDE 24, CULL_BOTTOM 72} (world 44, 70, 101-106, 167); camera look-ahead/sway factors and shake cut-off (camera 52-68); GROUND {CHUNK 8, TOP_PAD 6, GRASS_WIND [0,1,2,1], WIND_EVERY 0.24, WATER_EVERY 0.55, DEEP_EVERY 0.72} (mapRenderer 12, 31, 92, 181-197).

Entries (35):

- `inline: native floor-frame contract 32x16, anchor (16, 0)` from `src/assets/environment.ts:140, 312, 316`: **extract-config** as `ISO.TILE_W / ISO.TILE_H, read as TW, TH and TW/2 from core/math/projection` · _not verified_
  A hardcoded copy of the tile size. Same values, so the validation is unchanged. No new config key: it reuses ISO through the projection constants.
- `DISPLAY` (const) from `src/config.ts:7-16`: **move** · _verified_
  Read by core/display (to core/app/display) and tests/core.test. Its new neighbour VIEW {W 216, H 400} can define VIEW.W as DISPLAY.TARGET_WIDTH so the 216 lives in one place.
- `LOOP` (const) from `src/config.ts:18-25`: **move** · _verified_
  Only reader: core/loop, which moves to core/app/loop.
- `ISO` (const) from `src/config.ts:27-30`: **move** · _verified_
  Read by core/math/projection (a legal L1 to L0 edge). HALF_W/HALF_H are derived from it there.
- `CAMERA` (const) from `src/config.ts:32-45`: **move** · _verified_
  Read by core/stage/camera and tests/core.test.
- `OCCLUSION` (const) from `src/config.ts:285-289`: **move** · _verified_
  Only reader: world/world, which moves to core/stage/world.
- `POLLUTION.VISIBLE+OVERLAY_MIN_ALPHA+OVERLAY_MAX_ALPHA` (const) from `src/config.ts:359-362`: **split** as `GROUND.DIRT_VISIBLE, GROUND.DIRT_ALPHA_MIN, GROUND.DIRT_ALPHA_MAX` · _verified_
  Ground-render visuals, read only by mapRenderer.ts:227 and :235 (to core/stage/mapRenderer). Keep two scalars so the expression MIN + (MAX - MIN) \* dirt stays identical.
- `inline: default cull box` (inline) from `src/entities/entity.ts:31`: **extract-config** as `STAGE.DEFAULT_CULL_BOX {x: -16, y: -32, w: 32, h: 32}` · _verified_
  The fallback for entities without a def (CarriedLabel).
- `inline: poop depth bias` (inline) from `src/entities/items.ts:52`: **extract-config** as `DEPTH_BIAS.DECAL (-0.3)` · _verified_
- `inline: default view size` (inline) from `src/iso/camera.ts:14-15`: **extract-config** as `VIEW {W: 216, H: 400}` · _verified_
- `inline: look-ahead and sway factors` (inline) from `src/iso/camera.ts:52, 57-58`: **extract-config** as `CAMERA {LOOK_AHEAD_Y: 0.75, SWAY_FX: 2.1, SWAY_FY: 1.3, SWAY_PHASE: 1.7}` · _verified_
- `inline: shake cut-off` (inline) from `src/iso/camera.ts:68`: **extract-config** as `CAMERA.SHAKE_CUTOFF (0.05)` · _verified_
- `inline: initial renderer size 216x400` (inline) from `src/main.ts:25-26`: **extract-config** as `VIEW.W, VIEW.H` · _verified_
  Game.resize replaces it at once. VIEW.W can be DISPLAY.TARGET_WIDTH.
- `inline: renderer options` (inline) from `src/main.ts:27, 35`: **extract-config** as `RENDER.{PREFERENCE 'webgl', POWER_PREFERENCE 'high-performance'}` · _corrected by verifier_
  Excluded on purpose, inline in bootstrap: scaleMode 'nearest' (20), autoStart and sharedTicker (32-33), eventFeatures (36) and ticker.stop (38). These are invariants of the pixel-perfect, fixed-step, DOM-input model, not tuning.
  Before the correction: lines `27-30, 34-35`; newName `RENDER.{PREFERENCE 'webgl', ANTIALIAS false, RESOLUTION 1, AUTO_DENSITY false, ROUND_PIXELS true, POWER_PREFERENCE 'high-performance'}`.
  Verifier: Only these two are real knobs. antialias:false, resolution:1 and autoDensity:false (28-30) are invariants of the integer-scale model: computeViewport picks device px and Game.resize sets the canvas CSS size itself, which autoDensity:true or resolution != 1 would break. roundPixels:true (34) is pixel-perfect rendering. These are the same kind of invariant as scaleMode 'nearest', which the entry already keeps inline in bootstrap, so treat them the same way.
- `inline: renderer clear colour` (inline) from `src/main.ts:31`: **extract-config** as `RENDER.CLEAR (0x0c3a10)` · _verified_
  Following the plan, it goes in RENDER rather than colors.ts, since it is a renderer option.
- `inline: placeholder screen size` (inline) from `src/scenes/couchScene.ts:44-45`: **extract-config** as `VIEW.W / VIEW.H (216 x 400)` · _verified_
  Lives in PaperCardScene after the split.
- `inline: placeholder screen size` (inline) from `src/scenes/glossaryScene.ts:38-39`: **extract-config** as `VIEW.W / VIEW.H` · _verified_
- `inline: overlay placeholder size` (inline) from `src/scenes/overlays.ts:25-26`: **extract-config** as `VIEW.W / VIEW.H` · _verified_
- `inline: placeholder screen size` (inline) from `src/scenes/supervillainedScene.ts:35-36`: **extract-config** as `VIEW.W / VIEW.H` · _verified_
- `inline: default step length` (inline) from `src/story/autopilot.ts:65`: **extract-config** as `LOOP.STEP (existing, 1 / 60)` · _not verified_
  Same value, so nothing changes.
- `inline: default size` (inline) from `src/story/minigames/miniGame.ts:15-16`: **extract-config** as `VIEW.W 216, VIEW.H 400` · _not verified_
- `inline: default logical size` from `src/story/screens.ts:300-301`: **extract-config** as `VIEW.W / VIEW.H` · _not verified_
  Or inherited from BaseScene's w/h defaults.
- `inline: default logical size` from `src/story/storyScene.ts:64-65`: **extract-config** as `VIEW.W / VIEW.H` · _not verified_
- `inline: default logical size` from `src/story/ui.ts:83-84, 261-262, 321`: **extract-config** as `VIEW.W / VIEW.H` · _not verified_
- `inline: default view size` (inline) from `src/ui/discoLights.ts:80-81`: **extract-config** as `VIEW.W / VIEW.H` · _verified_
- `CHUNK` (const) from `src/world/mapRenderer.ts:12`: **extract-config** as `GROUND.CHUNK (8)` · _verified_
  World's per-chunk static-prop culling reads the same constant.
- `GRASS_WIND` (const) from `src/world/mapRenderer.ts:31`: **extract-config** as `GROUND.GRASS_WIND ([0, 1, 2, 1])` · _verified_
- `inline: chunk top padding` (inline) from `src/world/mapRenderer.ts:92`: **extract-config** as `GROUND.TOP_PAD (6)` · _verified_
- `inline: tile animation periods` (inline) from `src/world/mapRenderer.ts:181, 189, 197`: **extract-config** as `GROUND {WIND_EVERY: 0.24, WATER_EVERY: 0.55, DEEP_EVERY: 0.72}` · _verified_
- `inline: dirt tint gain and fresh highlight curve` (inline) from `src/world/mapRenderer.ts:225, 246`: **extract-config** as `GROUND {DIRT_TINT_GAIN: 1.3, FRESH_ALPHA: 0.85, FRESH_EXP: 1.5}` · _verified_
  POLLUTION.OVERLAY_MIN_ALPHA/OVERLAY_MAX_ALPHA (read at 235) are view numbers too. Per the config plan they split from POLLUTION into GROUND in the same commit that moves this file.
- `inline: camera lift and bounds margin` (inline) from `src/world/world.ts:44, 70`: **extract-config** as `STAGE {CAMERA_LIFT: 10, BOUNDS_MARGIN: 4}` · _verified_
  cameraLift stays a writable field initialised from config, because scripts and steps may change it per scene.
- `inline: bush/vine depth bias` (inline) from `src/world/world.ts:61`: **extract-config** as `DEPTH_BIAS.UNDERGROWTH (0.1)` · _verified_
- `inline: walkable-bounds tile half-sizes and vertical pad` (inline) from `src/world/world.ts:101-106`: **extract-config** as `STAGE.BOUNDS_PAD (40); 16/8 replaced by HALF_W/HALF_H from core/math/projection` · _verified_
  16 and 8 are ISO-derived, not new config: use the exported HALF_W/HALF_H.
- `inline: forest density and neighbour radius` (inline) from `src/world/world.ts:116-118, 132`: **extract-config** as `DRESSING {FOREST_NEAR: 0.42, FOREST_FAR: 0.05, NEAR_RADIUS: 2}` · _verified_
  The hash2 salts (3, 21, 22, 5 at 59/117/119/134) stay inline in entities/stageDressing (decision: salts stay with the art).
- `inline: entity cull margins` (inline) from `src/world/world.ts:167`: **extract-config** as `STAGE {CULL_SIDE: 24, CULL_BOTTOM: 72}` · _verified_
  Exact semantics to keep: x - 24, y - 24, w + 2\*24, h + 72 (so 48 px below the view). CULL_BOTTOM is the height increment, not the bottom margin.

#### `src/config/colors.ts`

The one palette: neon C, numeric twins, and named semantic tokens.

Plan: C (ui/retro 4-17); NEON numeric twins built with a local parse; INK {OUTLINE '#120818', SHADOW '#000000'}; PAPER (card 6-8, words 175-176/244-259, book 410-412); VOICE {PARCHMENT, ASIDE, BYZANTINE, EMPEROR, JERUSALEM '#f6c0e0' and JERUSALEM_PALE '#f6c8e0' (kept separate, not merged silently), SHATTER, CLONG, JACK, RATTLE, PILE, CHALK, GRACE_LOW}; OLD_WORD_COLOR (story/names 70); MODE_BAR {NOISE 0xff7a1f, LULL 0x5ac8ff, NERVE, THIRST, OVERHEAR} (helpers 238-241, ch3 219, ch5 100, ch7 214, walk 413/427); METERS (story/ui 386-392, couch 15-23, combat 133); RADAR (gameScene 272-294, hud 217-224); TOUCH_MODES (MODE_STYLE, touchControls 33-38) and button/joystick colours (297-342); COMBAT_FX (combat 366-392); TINTS {HURT, SCARED, STUN, USURPER 0xffd890, RED_BALL 0xff4040, CATS} (zampano 284, actor 149, critters 206, ch7 362, ch1 322, ch8 260, threats 12); MENU {SELECTED 0x3a1050, LOCKED '#5a5a6a', fills} (menu 109-111, story/ui 212-214, words 107, screens 109); CARD_BG (storyFlow 94-318); LOGO_STYLE (overlays 54); SPARK_TINTS (supervillained 9); GLOSSARY_RING, VIOLET_INK, ORANGE_INK (glossary 9-10, couch 15); particle palettes GEO, DIRT, BAND_COLOR, PEE, WATER, LEAVES, DUST (gameFx 33-37, 81-303); SCREEN_FX {FOG, VISOR, SV_FLASH 0xff2bd6} (storyScene 456-465, ch8 242); GOAL 0xfff36a (walk 539-562, gameScene 83, tiles 219 stays as art); MAGNET 0xdcf23a; HUNGER_STOPS (retro 52-57).

Entries (114):

- `inline: HUD star colours (fill, light, empty + alpha 150, outline)` from `src/assets/placeholders/items.ts:175-177, 199`: **extract-config** as `HUD_ICON.FILL (= C.yellow '#ffe23a'), HUD_ICON.LIGHT '#fff7b0', HUD_ICON.EMPTY '#3a2a10' with HUD_ICON.EMPTY_ALPHA 150, HUD_ICON.STAR_OUTLINE '#c0300a'` · _not verified_
  The target says hudIcons are coloured from config/colors. FILL references C.yellow, the same yellow the HUD and touch controls use. Values are identical, so the screenshots are byte-identical.
- `inline: HUD pee icon colours` from `src/assets/placeholders/items.ts:223-224, 232`: **extract-config** as `HUD_ICON.FILL, HUD_ICON.LIGHT, HUD_ICON.PEE_OUTLINE '#5a3a00'` · _not verified_
- `inline: pee charge drop colours (full, empty + alpha 200, highlight, outline)` from `src/assets/placeholders/items.ts:252, 257-258`: **extract-config** as `HUD_ICON.FILL, HUD_ICON.DROP_EMPTY '#40381a' with HUD_ICON.DROP_EMPTY_ALPHA 200, HUD_ICON.LIGHT, HUD_ICON.DROP_OUTLINE '#3a2a00'` · _not verified_
- `inline: parchment colour '#f0d8a0'` (inline) from `src/campaign/chapters/ch1.ts:115, 131, 380, 386`: **extract-config** as `VOICE.PARCHMENT` · _not verified_
  Same value as the Professor's speaker colour (story/ui:23).
- `inline: Jack's voice '#f0b060'` (inline) from `src/campaign/chapters/ch1.ts:167, 180, 264, 272`: **extract-config** as `VOICE.JACK` · _not verified_
- `inline: bowl CLONG colour '#c8d0ff'` (inline) from `src/campaign/chapters/ch1.ts:243`: **extract-config** as `VOICE.CLONG` · _not verified_
  Read inside vocab.clang.
- `inline: red ball tint 0xff4040` (inline) from `src/campaign/chapters/ch1.ts:322`: **extract-config** as `TINTS.RED_BALL` · _not verified_
  Passed as placeObject's tint, which becomes PropEntity.baseTint. Also used at ch8:260.
- `inline: Jerusalem pastel '#f6c8e0'` (inline) from `src/campaign/chapters/ch2.ts:37, 38, 73`: **extract-config** as `VOICE.JERUSALEM_PALE` · _not verified_
  Kept separate from '#f6c0e0' (VOICE.JERUSALEM, ch7 and ch8): not merged silently.
- `inline: aside grey-blue '#9aa4c0'` (inline) from `src/campaign/chapters/ch2.ts:68, 76`: **extract-config** as `VOICE.ASIDE` · _not verified_
- `inline: bell CLONG colour '#c8d0ff'` (inline) from `src/campaign/chapters/ch3.ts:57`: **extract-config** as `VOICE.CLONG` · _not verified_
  Read inside vocab.clang.
- `inline: parchment colour '#f0d8a0'` (inline) from `src/campaign/chapters/ch3.ts:127, 220, 229`: **extract-config** as `VOICE.PARCHMENT` · _not verified_
- `inline: aside grey-blue '#9aa4c0'` (inline) from `src/campaign/chapters/ch3.ts:172, 226`: **extract-config** as `VOICE.ASIDE` · _not verified_
- `inline: overhear mode-bar colour 0xffe23a` (inline) from `src/campaign/chapters/ch3.ts:219`: **extract-config** as `MODE_BAR.OVERHEAR` · _not verified_
  Equals NEON.yellow (C.yellow as a number); define it from NEON.
- `inline: bucket CLONG colour '#c8d0ff'` (inline) from `src/campaign/chapters/ch4.ts:79`: **extract-config** as `VOICE.CLONG` · _not verified_
  Read inside vocab.clang.
- `inline: steady-ladder mode-bar colour 0x5ac8ff` (inline) from `src/campaign/chapters/ch5.ts:100`: **extract-config** as `MODE_BAR.STEADY` · _not verified_
  New key, same value as MODE_BAR.LULL, kept separate because the meaning differs.
- `inline: common-pile colour '#d8d8e8'` (inline) from `src/campaign/chapters/ch5.ts:128`: **extract-config** as `VOICE.PILE` · _not verified_
- `inline: aside grey-blue '#9aa4c0'` (inline) from `src/campaign/chapters/ch5.ts:209, 245`: **extract-config** as `VOICE.ASIDE` · _not verified_
- `inline: board chalk '#f0f0f0'` (inline) from `src/campaign/chapters/ch5.ts:258`: **extract-config** as `VOICE.CHALK` · _not verified_
- `inline: parchment colour '#f0d8a0'` (inline) from `src/campaign/chapters/ch6.ts:145`: **extract-config** as `VOICE.PARCHMENT` · _not verified_
- `inline: Byzantine violet '#c8a0ff'` (inline) from `src/campaign/chapters/ch7.ts:66, 228, 327, 450`: **extract-config** as `VOICE.BYZANTINE` · _not verified_
  Same value as the WITNESS ending colour (storyFlow:320).
- `inline: Emperor violet '#c070f0'` (inline) from `src/campaign/chapters/ch7.ts:180, 359, 364, 421`: **extract-config** as `VOICE.EMPEROR` · _not verified_
  Same value as the emperor's speaker colour (story/ui:18).
- `inline: nerve mode-bar colour 0xff7a1f` (inline) from `src/campaign/chapters/ch7.ts:214`: **extract-config** as `MODE_BAR.NERVE` · _not verified_
  Same value as MODE_BAR.NOISE; kept as its own key.
- `inline: usurper tint 0xffd890` (inline) from `src/campaign/chapters/ch7.ts:362`: **extract-config** as `TINTS.USURPER` · _not verified_
- `inline: rattle grey '#b8b8c8'` (inline) from `src/campaign/chapters/ch7.ts:379`: **extract-config** as `VOICE.RATTLE` · _not verified_
- `inline: parchment colour '#f0d8a0'` (inline) from `src/campaign/chapters/ch7.ts:394`: **extract-config** as `VOICE.PARCHMENT` · _not verified_
- `inline: Niketas's call '#f0f0f0'` (inline) from `src/campaign/chapters/ch7.ts:485`: **extract-config** as `VOICE.CHALK` · _not verified_
  Exactly the same value as the 5.5 board chalk, so it reuses that token; this is not a near-duplicate merge.
- `inline: common-pile colour '#d8d8e8'` (inline) from `src/campaign/chapters/ch7.ts:552`: **extract-config** as `VOICE.PILE` · _not verified_
- `inline: Jerusalem pink '#f6c0e0'` (inline) from `src/campaign/chapters/ch7.ts:559`: **extract-config** as `VOICE.JERUSALEM` · _not verified_
- `inline: shatter violet '#b070ff'` (inline) from `src/campaign/chapters/ch7.ts:560`: **extract-config** as `VOICE.SHATTER` · _not verified_
- `inline: shatter violet '#b070ff'` (inline) from `src/campaign/chapters/ch8.ts:65`: **extract-config** as `VOICE.SHATTER` · _not verified_
- `inline: Jerusalem pink '#f6c0e0'` (inline) from `src/campaign/chapters/ch8.ts:78, 82`: **extract-config** as `VOICE.JERUSALEM` · _not verified_
- `inline: parchment colour '#f0d8a0'` (inline) from `src/campaign/chapters/ch8.ts:86, 105, 158`: **extract-config** as `VOICE.PARCHMENT` · _not verified_
  158 is the mid-grace card colour.
- `inline: low-grace card colour '#c8a070'` (inline) from `src/campaign/chapters/ch8.ts:158`: **extract-config** as `VOICE.GRACE_LOW` · _not verified_
- `inline: supervillained flash 0xff2bd6` (inline) from `src/campaign/chapters/ch8.ts:242`: **extract-config** as `SCREEN_FX.SV_FLASH` · _not verified_
  Not C.hotPink ('#ff5ad6'): a different colour, kept separate.
- `inline: red ball tint 0xff4040` (inline) from `src/campaign/chapters/ch8.ts:260`: **extract-config** as `TINTS.RED_BALL` · _not verified_
  Same token as ch1:322.
- `inline: CUT card colour '#ffffff'` (inline) from `src/campaign/chapters/ch8.ts:297`: **extract-config** as `C.white` · _not verified_
  Existing token (C moves from ui/retro to config/colors).
- `inline: lull mode-bar colours` (inline) from `src/campaign/chapters/helpers.ts:240-241`: **extract-config** as `MODE_BAR.NOISE = 0xff7a1f, MODE_BAR.LULL = 0x5ac8ff` · _not verified_
- `TITLE.FOOTER_GLOW_COLOR` (const) from `src/config.ts:125`: **split** as `TITLE_COLORS.FOOTER_GLOW ('#c8ffb8')` · _verified_
  Read at overlays.ts:121-122. It moves in the commit that moves TitleScene to ui/screens/title/titleScene.
- `TITLE.DISCO.COLORS` (const) from `src/config.ts:162`: **split** as `TITLE_COLORS.DISCO` · _verified_
  Read at discoLights.ts:56 (lightLevels uses COLORS.length, so the colours go with ui/effects/discoBeat, which stays Pixi-free because config is), :124 and :153. The disco test does not read COLORS. The plan's colors.ts list does not name this token: add it.
- `inline: hit flash tint` (inline) from `src/entities/actor.ts:149`: **extract-config** as `TINTS.HURT (0xff8080; same value as zampano.ts:284)` · _verified_
- `inline: stunned tint` (inline) from `src/entities/critters.ts:206`: **extract-config** as `TINTS.STUN (0xff9090)` · _verified_
- `inline: hurt and scared tints` (inline) from `src/entities/zampano.ts:284`: **extract-config** as `TINTS {HURT: 0xff8080, SCARED: 0xd4e0ff}` · _verified_
- `GEO_COLORS` (const) from `src/fx/gameFx.ts:33`: **move** as `GEO` · _verified_
  0xff9a1f, 0xff4fa8 and 0xffe23a are written as NEON.orange, NEON.pink and NEON.yellow. 0xb040ff and 0x6ad8ff stay literal.
  Verifier: 0xff9a1f, 0xff4fa8 and 0xffe23a equal C.orange, C.pink and C.yellow. 0xb040ff is not C.magenta (0xe040ff).
- `inline: particle palettes` (inline) from `src/fx/gameFx.ts:33, 37, 104, 135, 146, 177, 190, 206, 220, 252, 282-286, 298`: **extract-config** as `GEO, DIRT, SPARKLE [0xffffff, GOAL, 0x9dff7a], WATER [0x8fd0ff, 0x3b8cff, 0xffffff], HIT_SPARKS [0xffffff, NEON.cyan, NEON.yellow], COIN_SPARKS, MAGNET sparks [MAGNET, 0xffffff], SCARE [0xaee0ff, 0xffffff], SPLASH, LEAVES, DUST, PEE [NEON.yellow, GOAL]` · _verified_
  The two pee yellows (0xffe23a and 0xfff36a) stay separate tokens, as the plan requires.
  Verifier: Overlaps entries 13 and 15 (lines 33 and 37). Make sure those palettes get one token each.
- `BAND_COLOR` (const) from `src/fx/gameFx.ts:36`: **move** as `BAND_COLOR { bagnaskiz: C.orange, jack: VOICE.JACK, watson: VOICE.WATSON }` · _verified_
  Duplicates story/ui.ts SPEAKERS 19-20 ('#ff8ab8', '#d8d4c8'). The target VOICE has JACK but no WATSON: add VOICE.WATSON '#d8d4c8' and point content/campaign/speakers at it too.
  Verifier: story/ui.ts:19-20 has jack '#ff8ab8' and watson '#d8d4c8', so adding VOICE.WATSON is right. It is indexed by e.who (a string), which needs the same widening as BAND_PITCH.
- `DIRT` (const) from `src/fx/gameFx.ts:37`: **move** as `DIRT` · _verified_
  Also replaces the identical inline arrays at gameFx 104 and 220.
- `inline: default text outline` (inline) from `src/fx/popups.ts:47`: **extract-config** as `INK.SHADOW ('#000000')` · _verified_
- `ORANGE_INK` (const) from `src/scenes/couchScene.ts:15`: **move** as `ORANGE_INK` · _verified_
  Card ink for the COUCH heading, CLOSE text and frame. The fill stays C.orange (passed with it to PaperCardScene).
- `METERS` (const) from `src/scenes/couchScene.ts:16-21`: **split** as `METERS.PAPER = { commozione: 0x3a9ee0, supervillain: 0xe02030, grace: 0xe0a800, standing: 0x2e9e4a }` · _verified_
  Only the colours move. Config may not import MeterKey, so the table uses plain keys and couchScene checks it with `satisfies Record<MeterKey, number>`. Do not merge it with the story HUD bars (story/ui 387: 0x5ac8ff, 0xe02030, 0xffd040, only three meters). Those become METERS.HUD.
  Verifier: Values and lines are correct. Small correction: the story HUD colours sit at story/ui.ts:386 (`const cols = [0x5ac8ff, 0xe02030, 0xffd040]`, for commozione, supervillain and grace), not 387.
- `DONE` (const) from `src/scenes/couchScene.ts:22`: **move** as `PAPER.CELL.DONE` · _corrected by verifier_
  Same value as METERS.PAPER.standing (0x2e9e4a) but a different meaning: keep two tokens.
  Before the correction: newName `METERS.CELL_DONE`.
  Verifier: DONE colours the per-level progress cell, not a meter. The mapper itself calls it a different meaning from METERS.PAPER.standing, and entry 12 already files the cell alphas under PAPER.ALPHA.CELL_DONE and CELL_PART. Keep the cell inks under PAPER.CELL { DONE 0x2e9e4a, PART }.
- `PART` (const) from `src/scenes/couchScene.ts:23`: **move** as `PAPER.CELL.PART` · _corrected by verifier_
  Equals NEON.orange (C.orange 0xff9a1f). It may alias NEON.orange, but only as an explicit alias, never by silently swapping in C.orange.
  Before the correction: newName `METERS.CELL_PART`.
  Verifier: Same reason as entry 3. 0xff9a1f really equals C.orange ('#ff9a1f', ui/retro.ts:6), so PAPER.CELL.PART may be written as an explicit alias of NEON.orange.
- `inline: dim colour` (inline) from `src/scenes/couchScene.ts:62`: **extract-config** as `NEON.black` · _corrected by verifier_
  Shared by Overlay (overlays 39), GlossaryScene 70 and SupervillainedScene 62. The alpha stays COUCH.DIM.
  Before the correction: newName `DIM_COLOR (0x000000)`.
  Verifier: 0x000000 is the numeric copy of C.black ('#000000', retro.ts:15), and the DUPLICATES rule says numeric copies of C become NEON twins. Use NEON.black. A semantic DIM alias of it is fine if it is explicit; do not add a second black literal.
- `inline: ink alphas` (inline) from `src/scenes/couchScene.ts:90, 122, 124, 142, 144`: **extract-config** as `PAPER.ALPHA { RULE 0.6, CELL_DONE 0.85, CELL_PART 0.7, CELL_FRAME 0.8, BAR_TRACK 0.15, BAR_FRAME 0.5 }` · _verified_
- `inline: EXIT label colours` (inline) from `src/scenes/gameScene.ts:83`: **extract-config** as `GOAL_INK '#fff36a' (string twin of GOAL 0xfff36a) + INK.SHADOW '#000000'` · _verified_
- `inline: magnet ring colour` (inline) from `src/scenes/gameScene.ts:258`: **extract-config** as `MAGNET (0xdcf23a)` · _verified_
- `inline: radar dot colours` (inline) from `src/scenes/gameScene.ts:272-294`: **extract-config** as `RADAR { TREAT 0xff3b6b, POOP 0x8a5422, CAT 0x3ff0ff, BALL 0xffe23a, PUG 0xff7a1f, BAND 0xff7a1f }` · _verified_
  BALL equals NEON.yellow and CAT equals NEON.cyan: alias them explicitly. PUG and BAND are the same value but stay two tokens.
  Verifier: Verified: 0xffe23a = C.yellow and 0x3ff0ff = C.cyan (retro.ts:5, 10).
- `RING` (const) from `src/scenes/glossaryScene.ts:9`: **move** as `GLOSSARY_RING (0xd42030)` · _verified_
- `VIOLET_INK` (const) from `src/scenes/glossaryScene.ts:10`: **move** as `VIOLET_INK ('#5b2bc4')` · _verified_
- `inline: dim colour` (inline) from `src/scenes/glossaryScene.ts:70`: **extract-config** as `NEON.black` · _corrected by verifier_
  Before the correction: newName `DIM_COLOR`.
  Verifier: Same as entry 10: 0x000000 is the numeric twin of C.black.
- `inline: overlay dim colour` (inline) from `src/scenes/overlays.ts:39`: **extract-config** as `NEON.black` · _corrected by verifier_
  Before the correction: newName `DIM_COLOR`.
  Verifier: Same as entry 10.
- `LOGO_STYLE` (const) from `src/scenes/overlays.ts:54`: **move** as `LOGO_STYLE` · _corrected by verifier_
  Config may not import LogoStyle (ui/text/logo), so the value is a plain frozen object, checked with `satisfies LogoStyle` in titleScene. Its outline duplicates INK.OUTLINE: reference that.
  Verifier: The value cannot be checked with `satisfies LogoStyle` as LogoStyle stands: - ui/logo.ts:27 types colors as a mutable tuple `[string, string, string]`. - A config value is `Object.freeze({...} as const)`, so colors becomes `readonly ['#f2ffb0', ...]`, which TS will not assign to a mutable tuple (TS4104). - That error hits both the `satisfies` and the logoTexture(…, style: LogoStyle) call. Change LogoStyle.colors to `readonly [string, string, string]` in ui/text/logo in the same commit. Referencing INK.OUTLINE inside colors.ts is fine.
- `inline: text colours and shadows` (inline) from `src/scenes/overlays.ts:100, 110, 118, 123, 137, 430, 433, 590, 607, 612, 671, 678, 854, 895, 935`: **extract-config** as `HINT_INK { SPEED '#8ad4ff', BRIEFING '#c8d0ff', CONTROLS '#9aa4c0' }; every '#000000' shadow -> INK.SHADOW` · _corrected by verifier_
  The letterSpacing values (1 on small lines, 6 on CRUSADER) and the CRUSADER glowAlpha 0.5 go to TITLE_LAYOUT.LETTER_SPACING and TITLE_LAYOUT.EDITION_GLOW in config/ui.
  Before the correction: lines `100, 110, 118, 137, 433, 590, 607, 612, 678, 854, 895, 935`.
  Verifier: Add three lines left out: - 430: the prompt's outline '#000000' becomes INK.SHADOW. - 671: GAME OVER's outline '#ffffff' becomes C.white. - 123: footerGlow's outlineWidth 2 becomes TITLE_LAYOUT.
- `inline: viewer text colours` (inline) from `src/scenes/spriteViewerScene.ts:41, 44, 49`: **extract-config** as `C.yellow ('#ffe23a'), C.white, INK.SHADOW` · _verified_
  These are existing tokens with identical values.
- `inline: chroma background` (inline) from `src/scenes/spriteViewerScene.ts:66`: **extract-config** as `CHROMA_KEY (0x3fcf1f)` · _verified_
  Filed in the one palette. It is debug-only; SPRITE_VIEWER.BACKGROUND in config/debug would also do.
- `SPARK_TINTS` (const) from `src/scenes/supervillainedScene.ts:9`: **move** as `SPARK_TINTS` · _corrected by verifier_
  Its values duplicate NEON twins (white, yellow-green d4ff3a, yellow, pink, cyan). Keep the array order: the tint per spark index depends on it.
  Verifier: The note is wrong: only three of the five values are NEON twins. 0xffffff (C.white), 0xffe23a (C.yellow) and 0x3ff0ff (C.cyan) are. 0xff4fd8 is not C.pink (that is '#ff4fa8', retro.ts:8), and 0xd4ff3a is not in C at all (it is the logo's '#d4ff3a'). Keep the five literals in order. Replacing 0xff4fd8 with NEON.pink would change a colour silently, against the 'not merged silently' rule.
- `inline: halo, flash and star tints` (inline) from `src/scenes/supervillainedScene.ts:48, 63, 135`: **extract-config** as `SV_HALO (0xfff3a0); flash and star tint 0xffffff -> NEON.white` · _verified_
  Not SCREEN_FX.SV_FLASH: that is 0xff2bd6, a different effect (ch8 242).
- `inline: dim colour` (inline) from `src/scenes/supervillainedScene.ts:62`: **extract-config** as `NEON.black` · _corrected by verifier_
  Before the correction: newName `DIM_COLOR`.
  Verifier: Same as entry 10.
- `inline: carried-label text colours` from `src/story/carry.ts:17`: **extract-config** as `C.yellow + INK.OUTLINE` · _not verified_
  The inventory is wrong that '#ffe23a' is 'a yellow that is not C.yellow': C.yellow is exactly '#ffe23a' (ui/retro.ts:5), so no new token is needed. '#120818' becomes INK.OUTLINE.
- `inline: HEALTH meter colour` (inline) from `src/story/combat.ts:133`: **extract-config** as `METERS.HEALTH 0xff4a4a` · _not verified_
- `inline: notice and popup colours` (inline) from `src/story/combat.ts:140, 211, 214`: **extract-config** as `NOTICE.MUTED '#9aa4c0', NOTICE.HINT '#9ad8ff'` · _not verified_
  '#9aa4c0' also appears in cards at ch2.ts:68/76, ch3.ts:172/226 and ch5.ts:209/245, and in story/screens.ts:83/147. If the VOICE token (ASIDE?) already holds this hex, reuse it instead of adding a second one. C.orange, C.yellow and C.red stay as C.
- `inline: fight marker colours` (inline) from `src/story/combat.ts:355-392`: **extract-config** as `COMBAT_FX {SWORD {FILL 0xffffff, EDGE 0x9ad8ff}, BARK_RING 0x3ff0ff, SHIELD {FILL 0x3050c0, ALPHA 0.85, EDGE 0xffc23a, CROSS 0xffffff}, WINDUP 0xff3b3b, STUN 0xffe23a, PIPS {FULL 0xff4a4a, PART 0xff9a6a, EMPTY 0x3a2a2a}}` · _not verified_
- `inline: text shadows` (inline) from `src/story/minigames/action.ts:43, 272, 330`: **extract-config** as `INK.SHADOW '#000000'` · _not verified_
- `inline: ladders colours` (inline) from `src/story/minigames/action.ts:166, 196-210`: **extract-config** as `MINI_INK.LADDERS {WALL_FALLBACK ['#8a7660','#4b3630','#c8ad88'], RAIL 0x5a3a1c, RUNG 0x7a5430, WARN 0xff3030, STONE 0x9a9a9a, STONE_EDGE 0x3a3a3a, PITCH 0x1a1410}` · _not verified_
- `inline: tug and boat colours` (inline) from `src/story/minigames/action.ts:297-307, 378-383`: **extract-config** as `MINI_INK.TUG {BAND_ALPHA 0.5, HOLE 0x0a0606, ROPE 0xd8c8a0, BAR_BG 0x220808, BAR 0xff3030}; MINI_INK.BOAT {BAR_BG_ALPHA 0.6, PROGRESS (= MODE_BAR.LULL 0x5ac8ff), WATER 0x2a6aff}` · _not verified_
- `inline: text styles` (inline) from `src/story/minigames/rhythm.ts:38-41, 56, 64`: **extract-config** as `INK.SHADOW '#000000', INK.OUTLINE '#120818'` · _not verified_
  The title glow alpha 0.3 goes to MINI.RHYTHM.TITLE_GLOW (config/minigames).
- `inline: highlight colours` (inline) from `src/story/minigames/words.ts:108-110`: **extract-config** as `MENU.SELECTED 0x3a1050 (fill alpha 0.75, frame alpha 0.9)` · _not verified_
  The same values as ui/menu.ts's selection.
- `inline: paper text inks` (inline) from `src/story/minigames/words.ts:120, 175-176`: **extract-config** as `PAPER.INK '#3a2410', PAPER.ANSWER '#8a1a10'` · _not verified_
- `inline: paper and backdrop colours` (inline) from `src/story/minigames/words.ts:244-245, 358-359`: **extract-config** as `PAPER.{LETTER_BG 0x1a0e06, RUMOUR_BG 0x0e1420, SHEET 0xf0dcb0}` · _not verified_
- `OLD_WORD_COLOR` (const string) from `src/story/names.ts:70`: **move** as `OLD_WORD_COLOR = '#ffb45a'` · _not verified_
  tests/campaign.test.ts:395 destructures it from story/names. In the same commit it takes it from '../src/config' instead.
- `inline: screen text colours` from `src/story/screens.ts:18, 40-41, 82-85, 147, 157, 206, 228, 292, 294`: **extract-config** as `INK.OUTLINE '#120818', INK.SHADOW '#000000', VOICE.ASIDE '#9aa4c0', PAPER.TITLE_OUTLINE '#3a2410', PAPER.FOOT '#6a4a20'` · _not verified_
  '#9aa4c0' is the shared aside grey: it also appears in storyFlow 103/207, storyScene 102, combat 140/211, overlays 854 and chapter cards ch2/ch3/ch5.
- `inline: progress list colours` from `src/story/screens.ts:109, 171`: **extract-config** as `MENU.PROGRESS { LOCKED: '#5a5a6a', OPEN: C.yellow, DONE: C.cyan }` · _not verified_
  MENU.LOCKED '#5a5a6a' is also the locked choice frame at story/ui.ts:214.
- `inline: list backgrounds` from `src/story/screens.ts:121, 180`: **extract-config** as `CARD_BG.LEVEL 0x140a24` · _not verified_
  The same value is used for the level cards at storyFlow.ts:189/221.
- `inline: book colours` from `src/story/screens.ts:361, 410-412`: **extract-config** as `PAPER { HEAD_INK: '#8a2a10', INK: '#3a2410', FRAME: 0x1a0e06, SHEET: 0xf0dcb0, RULE: 0xc8a060 }` · _not verified_
  These are shared with words.ts (1a0e06, f0dcb0, 3a2410), per the target's PAPER token.
- `inline: flash colour default` from `src/story/steps.ts:344`: **extract-config** as `SCREEN_FX.FLASH 0xffffff` · _not verified_
  The same default appears at storyScene.ts:359/363.
- `inline: card backgrounds` from `src/story/storyFlow.ts:94, 189, 205, 221, 281, 318`: **extract-config** as `CARD_BG { NOTICE: 0x0a0a14, LEVEL: 0x140a24, PROFESSOR: 0x1a1206, ENDING: 0x000000 }` · _not verified_
  content/campaign/cards.ts reads these tokens (content may import config).
- `inline: card text colours` from `src/story/storyFlow.ts:103, 207, 284, 320, 322`: **extract-config** as `VOICE.ASIDE '#9aa4c0', VOICE.PARCHMENT '#f0d8a0', VOICE.BYZANTINE '#c8a0ff', VOICE.ENDING_NOTES '#c8c0e0' (new)` · _not verified_
  '#c8a0ff' is the Niketas lilac shared with ch7 66/228/327/450. Check that the colors.ts author gave BYZANTINE this value and not '#c890e0', which is the niketas/greek speaker colour at story/ui.ts:37/47. Keep them as two tokens, without a silent merge.
- `inline: notice colours` from `src/story/storyScene.ts:102, 312`: **extract-config** as `VOICE.ASIDE '#9aa4c0', VOICE.HINT '#9ad8ff' (new)` · _not verified_
  '#9ad8ff' is shared with the combat hint notice (combat.ts:214) and the parry colour (combat 304/356 as 0x9ad8ff).
- `inline: fog and visor colours` from `src/story/storyScene.ts:457, 463-465`: **extract-config** as `SCREEN_FX.FOG { COLOR: 0x2a2228, ALPHA: 0.92 }, SCREEN_FX.VISOR { PLATE: 0x14161c, EDGE: 0x8a94a8 }` · _not verified_
- `inline: speaker colours shared with other files` from `src/story/ui.ts:18, 23`: **extract-config** as `VOICE.EMPEROR '#c070f0' (also in ch7), VOICE.PARCHMENT '#f0d8a0' (also in storyFlow 284 and ch1/3/6/7/8)` · _not verified_
  The other 38 hex values are used only here (or as placeholder art in cast.ts) and stay as content data.
- `inline: widget text ink` from `src/story/ui.ts:72-76, 256-260, 313-319`: **extract-config** as `INK.SHADOW '#000000', INK.OUTLINE '#120818'` · _not verified_
- `inline: choice colours` from `src/story/ui.ts:177, 212-214`: **extract-config** as `MENU { SELECTED: 0x3a1050, ROW_FILL: 0x000000, ROW_ALPHA: 0.7, LOCKED: '#5a5a6a', LOCKED_TEXT: '#7a7a8a', LOCKED_FRAME: '#4a4a5a', FRAME_ALPHA: 0.9 }` · _not verified_
  0x3a1050 is shared with ui/menu.ts and words.ts.
- `inline: meter colours` from `src/story/ui.ts:386-392, 405`: **extract-config** as `METERS { COMMOZIONE: 0x5ac8ff, SUPERVILLAIN: 0xe02030, GRACE: 0xffd040, BG_ALPHA: 0.55, FULL_STROKE: 0xffffff, MODE_BG_ALPHA: 0.6 }` · _not verified_
  0x5ac8ff also appears as MODE_BAR.LULL in helpers, ch5 and walk. Keep METERS.COMMOZIONE and MODE_BAR.LULL as two tokens with equal values: they have different meanings.
- `inline: sight cone colours` (inline) from `src/story/walk.ts:376`: **extract-config** as `SIGHT_CONE {CALM 0xfff060, ALERT 0xff3030}` · _not verified_
- `inline: walk notice and meter colours` (inline) from `src/story/walk.ts:413, 427, 457`: **extract-config** as `MODE_BAR.NERVE 0xff7a1f, MODE_BAR.THIRST 0x5ac8ff, NOTICE.SCRAMBLE '#b070ff'` · _not verified_
  '#b070ff' is also the violet of the ch7.ts:560 and ch8.ts:65 cards; reuse that VOICE token (SHATTER?) if it holds this hex. The C.\* uses at 303 and 316 stay C.
- `inline: goal and mirage colours` (inline) from `src/story/walk.ts:524-525, 540-541, 547, 562`: **extract-config** as `GOAL 0xfff36a (existing token), MIRAGE {LAKE 0x5ac8ff, GLINT 0xd8f4ff}` · _not verified_
- `CAT_TINTS` (const) from `src/systems/threats.ts:12`: **move** as `TINTS.CATS` · _verified_
  Keep the order and length ([0xffffff, 0xd8d8d8, 0xfff0c0]). this.rng.pick(TINTS.CATS) stays in Threats.spawn, before the factory call, so the seeded draw index and order are unchanged. Rng.pick already accepts readonly arrays.
  Verifier: Rng.pick&lt;T>(items: readonly T[]) already accepts the frozen tuple.
- `inline: banner text styles` (inline) from `src/ui/attackBanner.ts:12-16`: **extract-config** as `BANNER_INK { ATTACK_OUTLINE '#2a0a00', SAVED_OUTLINE '#002a08' } + INK.SHADOW; glowAlpha 0.4 -> config/ui.ts BANNER.GLOW` · _verified_
- `INK` (const) from `src/ui/card.ts:6`: **move** as `PAPER.INK ('#1c1626')` · _verified_
  Name clash: config/colors.ts already defines INK { OUTLINE, SHADOW }, so this string becomes a key of the PAPER object.
  Verifier: Importers: couchScene.ts:11 and glossaryScene.ts:5 (both INK and FADED).
- `FADED` (const) from `src/ui/card.ts:7`: **move** as `PAPER.FADED ('#6a6478')` · _verified_
- `PAPER` (const) from `src/ui/card.ts:8`: **move** as `PAPER.FILL (0xf3ecd8)` · _verified_
  PAPER becomes the object holding the card inks (plus the words/book paper colours from the plan).
- `inline: veil, light colours and alpha threshold` (inline) from `src/ui/discoLights.ts:106, 145, 152-153`: **extract-config** as `DISCO { VEIL 0x000000, LIGHT 0xffffff, COLORS (moved from TITLE.DISCO.COLORS) }; threshold 0.005 -> config/ui.ts TITLE.DISCO.MIN_ALPHA` · _verified_
- `inline: HUD text styles` (inline) from `src/ui/hud.ts:48-62`: **extract-config** as `INK.OUTLINE ('#120818' shadow) + HUD_INK { LEVEL_OUTLINE '#ffe6f6', LIVES_INNER '#a01020' (line 111) }; glow alphas -> config/ui.ts HUD.GLOW { TEXT 0.35, LIVES 0.5, LEVEL 0.3 }` · _verified_
- `inline: radar colours and sweep speed` (inline) from `src/ui/hud.ts:217-224`: **extract-config** as `RADAR { DISK 0x2bd12b @0.45, RIM NEON.yellow @0.95, RING 0x9dff7a @0.35, SWEEP 0xd8ffb0 @0.5 }; sweep 2.4 rad/s -> config/ui.ts HUD.RADAR_SWEEP` · _verified_
- `inline: label shadow` (inline) from `src/ui/menu.ts:42`: **extract-config** as `INK.OUTLINE ('#120818')` · _verified_
- `inline: row fills and inner frame alpha` (inline) from `src/ui/menu.ts:109, 111`: **extract-config** as `MENU_COLORS { SELECTED 0x3a1050, SELECTED_ALPHA 0.75, IDLE 0x000000, IDLE_ALPHA 0.55, INNER_ALPHA 0.9 }` · _verified_
  Name clash in the target: it defines MENU in both config/ui.ts (geometry) and config/colors.ts (SELECTED/LOCKED). With `export *` in config/index.ts that is an ambiguous re-export (TS2308), so the colour table must be renamed, e.g. MENU_COLORS.
  Verifier: Confirmed. The target puts MENU in both config/ui.ts and config/colors.ts, and two `export *` lines exporting the same name give TS2308. Renaming the colour table (MENU_COLORS) is required.
- `C` (const) from `src/ui/retro.ts:4-17`: **move** · _verified_
  Plus NEON numeric twins built with a local parse. src/ui/retro.ts stays as an `export *` shim until its importers move: 30 files at HEAD, 28 of them reading C. The shim must re-export frameRect (8 importers), retroBox (5) and hungerColor (1) too, not only C and hex as the brief says. content/campaign/chapters ch1-ch8 and helpers import C through it, a content->ui edge: they go on the layers allowlist and switch to importing from config when they move.
  Verifier: Counts verified: 30 files; C 28, hex 12, frameRect 8, retroBox 5, hungerColor 1. All nine campaign/chapters files (ch1-ch8 and helpers) import ui/retro.
- `inline: retro box fill and inner frame alpha` (inline) from `src/ui/retro.ts:43, 45, 47`: **extract-config** as `RETRO_BOX { FILL 0x000000, FILL_ALPHA 0.28, INNER_ALPHA 0.9 }` · _verified_
- `inline: hunger gradient stops` (inline) from `src/ui/retro.ts:52-57, 68`: **extract-config** as `HUNGER_STOPS [[0, cyan], [0.45, yellow], [0.75, 0xff8a1f], [1, red]]` · _verified_
  The 0xff2a3a fallback becomes the last stop. 0xff8a1f is not C.orange (0xff9a1f) and stays literal.
- `inline: word outline, glow and burst edge colour` (inline) from `src/ui/shout.ts:20, 116`: **extract-config** as `INK.OUTLINE '#120818' (line 20); burst edge 0x120818 (line 116) as hex(INK.OUTLINE) or a numeric INK token` · _corrected by verifier_
  Before the correction: newName `INK.OUTLINE '#120818' (and its NEON twin 0x120818); outlineWidth 2, glowAlpha 0.5 -> config/fx.ts SHOUT.TEXT`.
  Verifier: NEON is the numeric twin of C, and '#120818' is not in C, so 'its NEON twin' does not exist. Either add numeric INK twins (e.g. INK_NUM.OUTLINE) or call hex(INK.OUTLINE) at the use site. outlineWidth 2 and glowAlpha 0.5 go to fx.ts SHOUT.TEXT as stated.
- `MODE_STYLE` (const) from `src/ui/touchControls.ts:33-38`: **move** as `TOUCH_MODES` · _verified_
  A plain object keyed 'scene'|'bark'|'sword'|'shield', checked with `satisfies Record<ActionMode, ...>` in ui/touch/touchControls. Rings use NEON twins (0x3ff0ff = C.cyan). 0xff3b3b is not C.red and stays separate.
  Verifier: Objects with readonly properties are assignable to mutable object types, so `satisfies Record<ActionMode, ...>` works under `as const`. The sword and shield colours 0xe8f0ff, 0xffc23a and 0x3050c0 are repeated in drawSword and drawShield (456-465). Those may read TOUCH_MODES instead.
- `inline: streak word and hint text styles` (inline) from `src/ui/touchControls.ts:86, 149`: **extract-config** as `INK.OUTLINE ('#120818'), INK.SHADOW ('#000000')` · _added by verifier_
  These are the same ink tokens entry 213 uses for the button labels.
- `inline: button colours and alphas` (inline) from `src/ui/touchControls.ts:297-320`: **extract-config** as `TOUCH_BUTTONS { PEE [NEON.yellow, 0xff3b3b], RUN [NEON.green, NEON.cyan], TIRED NEON.orange, DOT_OFF 0x6a6a7a, SWITCH_RING 0xffffff }; alphas -> config/ui.ts TOUCH_VIEW { DIM 0.35, RUN_DIM 0.6, BARK_MIN 0.4, RING_GAP 2, ENERGY_W 2, RING_ALPHA 0.9, SWITCH_ALPHA 0.9 }` · _verified_
- `inline: joystick drawing` (inline) from `src/ui/touchControls.ts:332-342`: **extract-config** as `TOUCH_BUTTONS.JOYSTICK { RIM NEON.yellow, INNER 0xff3b3b, KNOB NEON.cyan }; sizes and alphas -> config/ui.ts TOUCH_VIEW.JOYSTICK { BASE_ALPHA 0.18, INNER_INSET 3, KNOB_R 8, KNOB_ALPHA 0.55 }` · _verified_
  INPUT.JOYSTICK_RADIUS stays in config/input.ts.
- `inline: polluted tile tint colour` (inline) from `src/world/mapRenderer.ts:226`: **extract-config** as `TINTS.POLLUTED (0xb0784a)` · _verified_

#### `src/config/input.ts`

Input tuning, key bindings, default controls and touch geometry.

Plan: INPUT (minus JOYSTICK_ZONE and GESTURE_FLASH, which go to ui.ts); KEY_BINDINGS = KEY_ACTIONS (core/input 124-146) plus the stray key codes (212-259) and PREVENTED_KEYS (364); DEFAULT_CONTROLS literal (core/settings 59-66; removes the copy at input 161); STICK {DEAD_ZONE 0.01, FULL_WALK 0.55} (zampano 186-191); TOUCH_LAYOUT {WALK (gameScene 159), STORY (storyScene 128-129), SWITCHER (touchControls 175-177), HIT_SLOP 4/3, DROPLET_ARC (193-195)}; BUTTON_IDS {RUN 'run', ACTION 'bark', MENU 'menu', SWITCH 'switch'}; SCRIPTED_WALK {INTENT 0.7, RUN 1} (steps 297-300).

Entries (17):

- `INPUT` (const) from `src/config.ts:253-283`: **move** · _verified_
  Readers: core/input (to input.ts, keyboard.ts, pointer.ts and gestures.ts), tests/input (ACTION_TTL), tests/gestures (SWIPE_MIN, SWIPE_MAX_TIME, DOUBLE_TAP_TIME, DOUBLE_TAP_DIST). The joystick view in ui/touch/touchControls also reads JOYSTICK_RADIUS.
- `INPUT.JOYSTICK_ZONE` (const) from `src/config.ts:257-258`: **split** as `TOUCH_LAYOUT.JOYSTICK_ZONE` · _verified_
  DEVIATION from plan (which says ui.ts). Its only reader is touchControls.setLayout:180, which the plan itself moves into core/input/touchLayout (the single writer of joystickZone and gestureZone). After the refactor no ui file reads it, so it belongs beside the other hit-area geometry in TOUCH_LAYOUT.
- `INPUT.JOYSTICK_ZONE` (config) from `src/config.ts:258`: **keep** as `TOUCH_LAYOUT.JOYSTICK_ZONE` · _added by verifier_
  Its only reader is touchControls.ts:180, which moves into core/input/touchLayout (entry 202). It is input geometry, not UI layout, so the target's move to config/ui.ts is the wrong domain. INPUT.GESTURE_FLASH (read only by the streak view, 398 and 410) can go to ui.ts as planned.
- `KEY_ACTIONS` (const) from `src/core/input.ts:124-146`: **extract-config** as `KEY_BINDINGS.ACTIONS` · _verified_
  Plain strings in config (config cannot import Action). keyboard.ts checks it with `satisfies Record<string, readonly Action[]>`. tests/input.test presses these codes through attach, so the values must stay identical.
- `inline: default gestureActions` (inline) from `src/core/input.ts:161`: **extract-config** as `DEFAULT_CONTROLS (gestureActions = gestureActionsFor(DEFAULT_CONTROLS))` · _verified_
  {swipeUp: 'strike', swipeDown: 'guard', doubleTap: 'bark'} is exactly bindingAction applied to DEFAULT_CONTROLS {sword, shield, bark}. Derive it instead of keeping a second copy.
- `inline: key codes outside KEY_ACTIONS` (inline) from `src/core/input.ts:212-214, 232, 238, 253-256, 259`: **extract-config** as `KEY_BINDINGS.{RUN_HELD ['ShiftLeft','ShiftRight','KeyK'], GUARD_HELD ['KeyI'], ACTION_HELD ['KeyJ','KeyX'], MOVE {UP, DOWN, LEFT, RIGHT}, FULL_STICK ['ShiftLeft','ShiftRight']}` · _verified_
  MOVE has to keep the current pairing, ArrowX plus WASD.
- `inline: virtual button ids` (inline) from `src/core/input.ts:215, 238`: **extract-config** as `BUTTON_IDS {PEE 'pee', ACTION 'bark', RUN 'run', SWITCH 'switch', MENU 'menu'}` · _verified_
  Add PEE: the plan's list omits it, and touchControls registers 'pee'. The values cannot change, because screenshot.mjs:379 reads buttons.get('switch') and 'bark' is the action button's id (not the bark action).
- `inline: keys whose browser default is prevented` (inline) from `src/core/input.ts:364`: **extract-config** as `KEY_BINDINGS.PREVENT_DEFAULT (Arrow* prefix, 'Space', 'Tab')` · _verified_
- `DEFAULT_CONTROLS` (const) from `src/core/settings.ts:59-66`: **extract-config** as `DEFAULT_CONTROLS` · _verified_
  In config it is a plain `as const` literal. core/state/settings re-exports it as `export const DEFAULT_CONTROLS: ControlSettings = CFG_DEFAULT_CONTROLS satisfies ControlSettings`, using an import alias to avoid the name clash. tests/audio.test:6 and tests/settings.test import it from core/settings (to core/state/settings). overlays:843 Object.assign()s it into the controls.
- `inline: stick dead zone and full-walk magnitude` (inline) from `src/entities/zampano.ts:186-191`: **extract-config** as `STICK {DEAD_ZONE: 0.01, FULL_WALK: 0.55}` · _verified_
- `inline: walk touch-button layout` (inline) from `src/scenes/gameScene.ts:159`: **extract-config** as `TOUCH_LAYOUT.WALK { PEE {dx -60, dy -50, r 15}, BARK {dx -23, dy -60, r 17}, RUN {dx -42, dy -98, r 15}, GESTURE_TOP 60 }` · _verified_
- `inline: scripted walk intent` from `src/story/steps.ts:297`: **extract-config** as `SCRIPTED_WALK { INTENT: 0.7, RUN: 1 }` · _not verified_
- `inline: story touch button layout` from `src/story/storyScene.ts:128-129`: **extract-config** as `TOUCH_LAYOUT.STORY { PEE: [-60, -50, 15], BARK: [-26, -40, 19], RUN: [-45, -80, 15], SWITCH: [-66, -30, 10], TOP: 70 } (offsets from the right and bottom edges)` · _not verified_
- `inline: MENU hit circle` from `src/story/ui.ts:344`: **extract-config** as `TOUCH_LAYOUT.MENU { RIGHT: 14, Y: 12, R: 14 }` · _not verified_
  It is shared with the Green Zone HUD registration (hud 125).
- `inline: default radii and view` (inline) from `src/ui/touchControls.ts:87, 90`: **extract-config** as `TOUCH_LAYOUT.WALK radii { PEE 15, BARK 17, RUN 15 }, TOUCH_LAYOUT.TOP 60 (216x400 -> display VIEW)` · _verified_
  The same numbers as gameScene 159 (top: 60).
- `inline: switcher defaults and hit slop` (inline) from `src/ui/touchControls.ts:175-177, 185-190, 313`: **extract-config** as `TOUCH_LAYOUT { SWITCHER { DX -36, DY 10, R 10 }, HIT_SLOP 4, SWITCH_SLOP 3 }` · _corrected by verifier_
  Before the correction: lines `175-177, 185-190`.
  Verifier: redrawButtons repeats the switcher radius default as `l.switchR ?? 10` at line 313, which must read SWITCHER.R too.
- `inline: pee droplet arc` (inline) from `src/ui/touchControls.ts:193-195`: **extract-config** as `TOUCH_LAYOUT.DROPLET_ARC { START 1.05, STEP 0.22, GAP 6 }` · _verified_

#### `src/config/ui.ts`

Screen layout, menu geometry, UI timing and guards.

Plan: TITLE, COUCH, GLOSSARY, SUPERVILLAINED (config 89-251; colours move to colors.ts when their consumer moves); from STORY: TEXT_CPS, CHOICE_GUARD, DIALOGUE_BOX, SAY_INSET; INPUT.JOYSTICK_ZONE and GESTURE_FLASH. New: OVERLAY {dim per overlay (overlays 133, 426, 503, 576, 677, 730, 812, 892, 941), menu geometry per overlay}; TITLE_LAYOUT (overlays 182-332); LEVEL_END (623-660); MENU {WIDTH 120, ROW 18, GAP 6, SLOP 4/3, BLINK_HZ 4} (menu.ts); HUD {MARGIN 3, RADAR_R 17, RADAR_RANGE 230, boxes, FLASH 0.35} (hud 35-210); STORY_HUD (story/ui 335-407); CHOICES (171-181); CARD (story/ui 280-293, card.ts 41-53, steps 184); NOTICES (storyScene 342-350, 436-442); SAY_POPUP (356); BOOK and STORY_MENU (screens 31-414); BANNER (attackBanner 29-61); TOUCH_VIEW (touchControls 118-427); GUARDS {0.15, 0.25, 0.3, 0.4, 0.5, 0.6}; FONT_METRIC {GLYPH_W 8} (couch 133).

Entries (91):

- `TITLE` (const) from `src/config.ts:89-191`: **move** · _corrected by verifier_
  Readers and their targets: ui/discoLights (to ui/effects/discoLights and discoBeat), ui/titleAnim (DOG_CROP_MARGIN, to core/assets/animatedImage), scenes/overlays (to ui/screens/title/\*), scenes/flow (PUBLISHER_URL, to core/flow/titleFlow), fx/titleGlitchFilter (FILM, typed `typeof TITLE.FILM`, to core/render/filters), main (DOG_WIDTH, to core/flow/bootstrap). tests/discoLights reads TITLE.DISCO BPM, FIRST_BEAT, BEAM_ALPHA, BEAM_PULSE, STROBE_ALPHA and WASH_ALPHA, but not COLORS. Per the plan, SHINE_\*, TEXT_GLITCH_\*, GLITCH_\*, FILM and DISCO timing stay in TITLE. PUBLISHER_URL also stays: one outbound URL is not prose, config already holds strings (MUSIC.MENU, BUTTON_IDS), and native.openUrl receives it as an argument.
  Verifier: fx/titleGlitchFilter does not read TITLE today. Its `set film` (titleGlitchFilter.ts:190) has a structural type, and the only TITLE mention there is a comment. It becomes a reader only if the plan types the setter as `typeof TITLE.FILM`, a type-only L4->L0 import. The real writer is overlays.ts:401 (`f.film = TITLE.FILM`, every update). The other readers are verified.
- `COUCH` (const) from `src/config.ts:194-199`: **move** · _verified_
  Imported as `COUCH as K` by scenes/couchScene, which moves to ui/screens/couchScene.
- `GLOSSARY` (const) from `src/config.ts:202-213`: **move** · _verified_
  Imported as `GLOSSARY as G` by scenes/glossaryScene.
- `SUPERVILLAINED` (const) from `src/config.ts:219-251`: **move** · _verified_
  Imported as `SUPERVILLAINED as SV`. Per the plan, the effect keys (SNAP_\*, BOUNCE\*, FLASH_TIME, SHAKE\*, GLOW_\*, SPARK\*) stay in the block. The plan's fx.ts SPARKS holds the inline literals at supervillainedScene 104-140, not these keys.
- `INPUT.GESTURE_FLASH` (const) from `src/config.ts:281-282`: **split** as `TOUCH_VIEW.GESTURE_FLASH` · _verified_
  View timing, read at touchControls.ts:398 and :410, which move to ui/touch/gestureHints.
- `AMBUSH.VOICE_INSET` (const) from `src/config.ts:444-445`: **split** as `AMBUSH_VOICE_INSET` · _verified_
  Read only at gameScene.ts:187, the keepIn rectangle of fx.voices (to core/flow/greenZone/greenZoneScene).
- `STORY.TEXT_CPS` (const) from `src/config.ts:573-574`: **split** as `TEXT_CPS` · _verified_
  Keyed by the TextSpeed union, which config cannot import. Check it with `satisfies Record<TextSpeed, number>` at its use sites, story/ui.ts:89 (to ui/story/dialogueBox) and storyScene.ts:406 (to story/engine).
- `STORY.CHOICE_GUARD` (const) from `src/config.ts:576-580`: **split** as `CHOICE_GUARD` · _verified_
  Read at steps.ts:129 (to story/steps/dialogue).
- `STORY.DIALOGUE_BOX+SAY_INSET` (const) from `src/config.ts:649-658`: **split** as `DIALOGUE_BOX, SAY_INSET` · _verified_
  Readers: story/ui.ts:78, :108 and :112 (to ui/story/dialogueBox) and storyScene.ts:422 (to story/engine/effects or the say popup).
- `inline: card layout margins and gaps` (inline) from `src/scenes/couchScene.ts:72-73, 82, 95-111, 130, 148, 175-185, 195`: **extract-config** as `COUCH.LAYOUT { MARGIN 12, PAD 10, LINE_GAP 3, INDENT 8, MIN_TOP 4, GAP { HEADING 5, SUB 2, LABEL 3, ENTRY 6, OVERLAP -8, CELLS 12, BEST 4, EMPTY 2, TAIL 3, BEFORE_BEST 2 }, RULES { HEAD [4,6], CELLS [7,6], METERS [2,6], BEST [3,6] } }` · _verified_
  Values unchanged. PAD 10 also matches GLOSSARY.LAYOUT.PAD but stays per card.
- `inline: level progress cells` (inline) from `src/scenes/couchScene.ts:113-115, 125-126`: **extract-config** as `COUCH.CELL { GAP 2, H 14, LABEL_Y 4 }` · _verified_
  The '#ffffff' number colour on a done cell becomes C.white (config/colors).
- `inline: pixel font glyph width` (inline) from `src/scenes/couchScene.ts:133`: **extract-config** as `FONT_METRIC.GLYPH_W (8) and COUCH.METER_ROW.LABEL_PAD (4)` · _verified_
- `inline: meter row geometry` (inline) from `src/scenes/couchScene.ts:134-146`: **extract-config** as `COUCH.METER_ROW { VALUE_W 30, MIN_BAR 16, BAR_H 6, BAR_Y 1, STEP 11 }` · _verified_
- `inline: two-column pairs` (inline) from `src/scenes/couchScene.ts:151, 156, 164, 169`: **extract-config** as `COUCH.PAIR { HALF_PAD 4, VALUE_INSET 8, STEP 11 }` · _verified_
- `inline: CLOSE button padding` (inline) from `src/scenes/couchScene.ts:188`: **extract-config** as `CARD.CLOSE_PAD_X (16)` · _verified_
  Shared with glossaryScene 98. Used inside drawCardButton's caller in PaperCardScene.
- `inline: input guard` (inline) from `src/scenes/couchScene.ts:211`: **extract-config** as `GUARDS.CARD (0.25)` · _corrected by verifier_
  Also at glossary 152 and overlays 783, 879, 928. Inside a SceneBase, the inputGuard timer reads it.
  Verifier: The value 0.25 at couch 211 and glossary 152 is right, but the note contradicts entries 115-117. Those map overlays 783, 879 and 928 to GUARDS.MENU, while this note calls them GUARDS.CARD. Use one rule: either couch and glossary use GUARDS.CARD and the overlays use GUARDS.MENU, or one shared key everywhere. Drop 'overlays 783, 879, 928' from this entry.
- `inline: CLOSE hit slop` (inline) from `src/scenes/couchScene.ts:217`: **extract-config** as `CARD.CLOSE_SLOP { X 6, Y 5 }` · _verified_
  Passed to cardHit(). Same values at glossary 159.
- `inline: radar range and dot sizes` (inline) from `src/scenes/gameScene.ts:272, 280-294`: **extract-config** as `HUD.RADAR_TREAT_RANGE (260) + HUD.RADAR_DOT { CAT 3, BALL 2, PUG 4, BAND 3 }` · _verified_
  260 differs from HUD.RADAR_RANGE (230, hud.ts). Keep both.
- `inline: card layout` (inline) from `src/scenes/glossaryScene.ts:49-50, 76-79, 86-98, 103`: **extract-config** as `GLOSSARY.LAYOUT { MARGIN 16, PAD 10, MIN_TOP 8, NOUN_INDENT 8, LINE_GAP { NOUN 3, VERB 4 }, GAP { HEADING 12, HEADWORD 3, RULE 5, IPA 10, LABEL 4, NOUN 11, VERB_LABEL 10, VERB 14 } }` · _corrected by verifier_
  The CLOSE padding 16 at 98 is CARD.CLOSE_PAD_X (see couch 188).
  Before the correction: lines `49-50, 76-78, 86-98, 103`.
  Verifier: Add line 79: `this.noun.setStyle({ maxWidth: inner - 8 })`. That 8 is the same NOUN_INDENT as line 92, and leaving it out would let the wrap width and the indent drift apart.
- `inline: ring shape` (inline) from `src/scenes/glossaryScene.ts:117-121`: **extract-config** as `GLOSSARY.RING_SHAPE { STEPS 64, START -0.9 (x PI), WOBBLE 0.035, WOBBLE_FREQ 3, WOBBLE_PHASE 0.6, GROWTH 0.05, LIFT 2 }` · _corrected by verifier_
  RING_OVERSHOOT is already counted in these 64 steps (config.ts:208).
  Verifier: Values are right (117-121), but fix the note. RING_OVERSHOOT is at config.ts:209, not 208, and it is not 'already counted in these 64 steps'. The loop runs k = 0 .. steps + RING_OVERSHOOT, so the overshoot adds 9 points beyond the 64. Its doc ('overshoot (of 64 steps)') refers to this STEPS value, so the two must stay in the same unit.
- `inline: ring strokes` (inline) from `src/scenes/glossaryScene.ts:132-138`: **extract-config** as `GLOSSARY.RING_STROKE { WIDTH 1.5, ECHO_DX 0.6, ECHO_DY 0.5, ECHO_ALPHA 0.55 }` · _verified_
- `inline: ring redraw tail, input guard, CLOSE slop` (inline) from `src/scenes/glossaryScene.ts:149, 152, 159`: **extract-config** as `GLOSSARY.RING_TAIL (0.1); GUARDS.CARD (0.25); CARD.CLOSE_SLOP { X 6, Y 5 }` · _verified_
  Verifier: Once entry 63 moves drawRing behind a change-only cache, the RING_TAIL guard at 149 is no longer needed and can go.
- `inline: heading and logo inks and glows` (inline) from `src/scenes/overlays.ts:51, 418`: **extract-config** as `OVERLAY.HEADING_GLOW (0.3), OVERLAY.BRIEFING.GLOW (0.25); outline '#120818' -> INK.OUTLINE (colors)` · _verified_
- `inline: dim alpha per overlay` (inline) from `src/scenes/overlays.ts:133, 426, 503, 576, 677, 730, 812, 892, 941`: **extract-config** as `OVERLAY.DIM { TITLE 0.15, BRIEFING 0.42, PAUSE 0.5, LEVEL_END 0.55, GAME_OVER 0.6, OPTIONS 0.94, CONTROLS 1, CONFIRM 0.92, GOODBYE 0.85 }` · _verified_
- `inline: menu geometry per overlay` (inline) from `src/scenes/overlays.ts:148-150, 510, 617, 685-687, 756-758, 848-850, 901-903`: **extract-config** as `OVERLAY.MENU { TITLE [150,18,6], PAUSE [132,18,6], LEVEL_END [120,16,5], GAME_OVER [132,18,6], OPTIONS [160,18,6], CONTROLS [176,16,4], CONFIRM [140,18,6] } (width, row, gap)` · _verified_
  The row colours are already C tokens.
- `inline: title layout` (inline) from `src/scenes/overlays.ts:182, 194-198, 202, 212, 219-220`: **extract-config** as `TITLE_LAYOUT { LOGO_SCALES [4,3,2,1], LOGO_MARGIN 8, EDITION_GAP 10, HEADER_PAD 5, FOOTER_BOTTOM 6, LIVES_ROW_H 12, SPEED_GAP 5, MIN_DOG_W 24 }` · _corrected by verifier_
  Before the correction: lines `182, 194-197, 202, 212, 219-220`.
  Verifier: Add line 198 (`rowH + 5` inside `below`): it is the same SPEED_GAP 5 as line 212, and leaving one copy inline would let the block height and the position drift apart.
- `inline: title reveal timeline` (inline) from `src/scenes/overlays.ts:258, 262, 265, 268-270, 280`: **extract-config** as `TITLE_LAYOUT.REVEAL { BLINK_AFTER 0.6, BLINK_DUTY 0.6, COUNTER 0.5, JITTER_TIME 0.9, JITTER_PX 4, EDITION 0.25, DOG 0.35, MENU 0.5, INPUT 0.6 }` · _verified_
- `inline: publisher tap flash` (inline) from `src/scenes/overlays.ts:275, 289`: **extract-config** as `TITLE_LAYOUT.FOOTER_FLASH { ALPHA 0.55, TIME 0.25 }` · _verified_
- `inline: title tap slops` (inline) from `src/scenes/overlays.ts:286, 294`: **extract-config** as `TITLE_LAYOUT.SLOP { FOOTER { X 6, TOP 8, BOTTOM 6 }, LIVES { X 6, Y 5 } }` · _verified_
- `inline: lives box` (inline) from `src/scenes/overlays.ts:321-322, 328-331`: **extract-config** as `TITLE_LAYOUT.LIVES { PAD 4, ICON_GAP 2, GAP 8, FILL_ALPHA 0.45, FRAME_ALPHA 0.9 }` · _corrected by verifier_
  The fill 0x000000 is DIM_COLOR and the frame is C.yellow (config/colors).
  Before the correction: lines `321-322, 328-329`.
  Verifier: Lines 330-331 repeat PAD 4 and ICON_GAP 2 (bx + 4, + 2) and must read the same keys. The fill 0x000000 is NEON.black (see entry 10), not a new DIM_COLOR.
- `inline: menu shine geometry` (inline) from `src/scenes/overlays.ts:348, 364-366`: **extract-config** as `TITLE.SHINE_MASK_INSET 1, TITLE.SHINE_ECHO { DX0 -5, DX1 -3, ALPHA 0.6 }; colour 0xffffff -> NEON.white` · _verified_
  These join the existing TITLE.SHINE_\* keys (config.ts TITLE block).
- `inline: overlay text line gaps` (inline) from `src/scenes/overlays.ts:418, 433, 678, 854, 895, 935`: **extract-config** as `OVERLAY.LINE_GAP { BRIEFING 3, BRIEFING_HINT 3, GAME_OVER 4, CONTROLS_HELP 3, CONFIRM 3, GOODBYE 4 }` · _added by verifier_
  These lineGap literals are layout dimensions that none of entries 98-118 cover. Entry 109 has only the 2x/1x gaps at 444-445, and entry 111 has 607.
- `inline: briefing layout and timing` (inline) from `src/scenes/overlays.ts:433, 440-450, 455, 458`: **extract-config** as `OVERLAY.BRIEFING { HINT_W 190, TOP 58, BOTTOM 64, SIDE 16, GAP_2X 2, GAP_1X 5, PROMPT_ROOM 26, PROMPT_GAP 14, HINT_GAP 10, OVERFLOW 20, BLINK_HZ 2.5, INPUT_AFTER 0.5 }` · _verified_
- `inline: pause box` (inline) from `src/scenes/overlays.ts:516-521`: **extract-config** as `OVERLAY.PAUSE { HEADER 36, BOTTOM 10, HALF_W 78, W 156, FRAME_ALPHA 0.6, TITLE_Y 18 }` · _corrected by verifier_
  Before the correction: lines `516-520`.
  Verifier: Line 521 (`top + 36`) is the same HEADER 36 as line 516.
- `inline: level end rows` (inline) from `src/scenes/overlays.ts:587-612`: **extract-config** as `LEVEL_END.ROW { LABEL_PAD 14, VALUE_PAD 9, STARS 5, STAR_SCALE 2, BONUS_LINE_GAP 4, GLOW 0.3 }` · _corrected by verifier_
  Before the correction: lines `587-596, 601-611`.
  Verifier: GLOW 0.3 sits at line 612 (the total's glowAlpha), outside 601-611. Line 610-611 repeat the 14 and 9 paddings.
- `inline: level end layout` (inline) from `src/scenes/overlays.ts:623-637`: **extract-config** as `LEVEL_END.LAYOUT { W 196, SIDE 8, BODY_H 222, BOTTOM 9, MIN_TOP 4, COLUMN_CHARS 23, TITLE 16, SUB 34, ROWS 48, ROW_STEP 13, STARS 130, STAR_STEP 26, BONUS 156, TOTAL 186, BEST 206, MENU 222, FRAME_ALPHA 0.65 }` · _verified_
- `inline: level end reveal` (inline) from `src/scenes/overlays.ts:643-660`: **extract-config** as `LEVEL_END.REVEAL { ROW 0.3, ROW_STEP 0.15, STARS 1.2, STAR_STEP 0.35, POP_SCALE 3, SHRINK 8, BONUS 0, TOTAL 0.3, BEST 0.5, MENU 0.6, BEST_BLINK_HZ 3, SKIP_CLOCK 99 }` · _verified_
- `inline: game over layout and jitter` (inline) from `src/scenes/overlays.ts:694-704`: **extract-config** as `OVERLAY.GAME_OVER { TOP 0.3, MSG 22, SCORE 52, MENU 72, JITTER_TIME 1, JITTER_CHANCE 0.3, JITTER_PX 3, MENU_AFTER 0.8 }` · _verified_
- `inline: options layout` (inline) from `src/scenes/overlays.ts:766-767, 783`: **extract-config** as `OVERLAY.OPTIONS { MIN_TOP 32, TOP 0.32, BOTTOM 8, HEADING 0.22, HEADING_GAP 24 }; guard -> GUARDS.MENU (0.25)` · _verified_
- `inline: controls layout` (inline) from `src/scenes/overlays.ts:854, 861-864, 879`: **extract-config** as `OVERLAY.CONTROLS { HELP_W 196, MIN_TOP 64, TOP 0.2, HEADING_GAP 22, HELP_GAP 10 }; guard -> GUARDS.MENU` · _verified_
- `inline: confirm layout` (inline) from `src/scenes/overlays.ts:895, 911-913, 928`: **extract-config** as `OVERLAY.CONFIRM { TEXT_W 180, TOP 0.32, TEXT 16, MENU 30 }; guard -> GUARDS.MENU` · _verified_
- `inline: goodbye layout` (inline) from `src/scenes/overlays.ts:947-948, 959`: **extract-config** as `OVERLAY.GOODBYE { TOP 0.42, TEXT 18, INPUT_AFTER 0.5 }` · _verified_
- `inline: logo minimum width and flash peak` (inline) from `src/scenes/supervillainedScene.ts:71, 104`: **extract-config** as `SUPERVILLAINED.MIN_WIDTH (40), SUPERVILLAINED.FLASH_PEAK (0.9)` · _verified_
- `inline: carried-label lift and depth bias` from `src/story/carry.ts:18-20`: **extract-config** as `CARRY_LABEL { LIFT: 34, DEPTH_BIAS: 0.6 }` · _not verified_
  This is a new key in an existing file. CarriedLabel (entities, L5) may read config (L0).
- `inline: highlight blink` (inline) from `src/story/minigames/words.ts:107`: **extract-config** as `MENU.BLINK_HZ 4` · _not verified_
- `inline: story card layout and text style` from `src/story/screens.ts:31-33, 43-45, 57-65`: **extract-config** as `STORY_CARD { PORTRAIT_SCALE: 2, GAP: 8, SIDE: 20, CENTER: 0.45, MIN_TOP: 16, TAP_BOTTOM: 24, GLOW: 0.3, LINE_GAP: 4 }` · _not verified_
- `inline: card and menu guards and TAP blink` from `src/story/screens.ts:70, 73, 137, 196, 434`: **extract-config** as `GUARDS.CARD_DISMISS 0.6, GUARDS.MENU 0.3; STORY_CARD.TAP_AFTER 0.8, STORY_CARD.TAP_BLINK_HZ 2.5` · _not verified_
- `inline: story menu geometry` from `src/story/screens.ts:114, 123-126, 175, 181-184, 249-251`: **extract-config** as `STORY_MENU { LIST: { W: 200, ROW: 14, GAP: 3 }, PAUSE: { W: 140, ROW: 16, GAP: 4 }, TITLE_Y: 10, SUB_Y: 22, METERS_Y: 34, MENU_Y: 58, CHAPTER_TITLE_Y: 12, NOTE_Y: 42, NOTE_GAP: 10, NOTE_SIDE: 16 }` · _not verified_
- `inline: starfield` from `src/story/screens.ts:122`: **extract-config** as `STORY_MENU.STARS { COUNT: 40, STEP_X: 53, STEP_Y: 97, ALPHA: 0.5 }` · _not verified_
  It is drawn only on resize, which is fine as is.
- `inline: sub-level label fit` from `src/story/screens.ts:164-166`: **extract-config** as `STORY_MENU.LABEL_MAX 24 (cut at LABEL_MAX - 2 plus '..')` · _not verified_
  It is sized for the 200-px LIST row.
- `inline: pause box` from `src/story/screens.ts:257-263`: **extract-config** as `OVERLAY.STORY_PAUSE { DIM: 0.55, BOX_W: 160, HEAD: 36, PAD: 10, TITLE_Y: 16, MENU_Y: 32, ALPHA: 0.65 }` · _not verified_
- `inline: book layout` from `src/story/screens.ts:338, 361, 368-369, 385-398, 413-414`: **extract-config** as `BOOK { PAGE_RESERVED: 70, TEXT_SIDE: 24, ICON_TEXT_SIDE: 40, LINE_GAP: 2, BLANK: 6, ICON_MIN: 12, ROW_PAD: 4, FIRST_Y: 40, TEXT_X: 12, ICON_TEXT_X: 28, ICON_X: 18, ICON_DY: 4, TITLE_Y: 10, FOOT_BOTTOM: 18 }` · _not verified_
- `inline: dialogue press guard` from `src/story/steps.ts:44, 118`: **extract-config** as `GUARDS.DIALOGUE 0.15` · _not verified_
- `inline: choices delay after the prompt` from `src/story/steps.ts:119`: **extract-config** as `CHOICES.SHOW_AFTER 0.3` · _not verified_
  This is separate from STORY.CHOICE_GUARD (0.25), which moves to config/ui as CHOICE_GUARD.
- `inline: card defaults and tap guard` from `src/story/steps.ts:184, 191-192`: **extract-config** as `CARD.DIM 0.55, GUARDS.CARD 0.4 (the default colour stays C.yellow)` · _not verified_
- `inline: notice stack layout and timing` from `src/story/storyScene.ts:102, 342, 346-350, 436-442`: **extract-config** as `NOTICES { STAGGER: 0.25, FADE_DELAY: 2.5, SIDE: 16, TOP: 84, BELOW_HUD: 6, LIFE: 2, RISE: 3, FADE: 2, GAP: 4 }` · _not verified_
- `inline: world speech popup` from `src/story/storyScene.ts:356`: **extract-config** as `SAY_POPUP { LIFT: 40, MAX_W: 150, SIDE: 24, LIFE: 1.2, RISE: -16, GLOW: 0.3 }` · _not verified_
- `inline: dialogue box layout` from `src/story/ui.ts:114-123, 247`: **extract-config** as `DIALOGUE_BOX += { FRAME_X: 3, TEXT_X: 52, TEXT_W_PAD: 62, ALPHA: 0.78, PORTRAIT_X: 8, PORTRAIT_DY: 6, NAME_X_BARE: 8, TEXT_DY: 18, MORE_RIGHT: 14, MORE_UP: 12, MORE_BLINK_HZ: 3, LINE_GAP: 3 }` · _not verified_
  It extends the existing STORY.DIALOGUE_BOX { BOTTOM, MIN_H, PAD }, which moves to config/ui.
- `inline: portrait scales` from `src/story/ui.ts:134, 139, 147`: **extract-config** as `DIALOGUE_BOX.PORTRAIT_SCALE { PROFESSOR: 1.5, CAST: 1, FALLBACK: 3 }` · _not verified_
- `inline: choice list geometry and blink` from `src/story/ui.ts:171-181, 208, 234`: **extract-config** as `CHOICES { GAP: 4, SIDE: 8, TEXT_INSET: 6, ROW_MIN: 16, ROW_PAD: 8, ABOVE: 6, TAP_SLOP: 2, LINE_GAP: 2, BLINK_HZ: 4 }` · _not verified_
- `inline: card layer layout and timing` from `src/story/ui.ts:256, 274-275, 280-293, 303`: **extract-config** as `CARD { BIG_MAX_GLYPHS: 12, GLOW: 0.35, LINE_GAP: 4, BIG_SIDE: 12, SMALL_SIDE: 20, ABOVE_GAP: 10, SMALL_GAP: 12, CENTER: 0.42, TAP_Y: 0.82, TAP_AFTER: 0.6, TAP_BLINK_HZ: 2.5 }` · _not verified_
  CARD.DIM 0.55 comes from steps.ts:184.
- `inline: story HUD layout` from `src/story/ui.ts:335-345, 364, 388-391, 398-407`: **extract-config** as `STORY_HUD { MARGIN: 4, TITLE_SIDE: 70, OBJ_SIDE: 78, ICON_RIGHT: 62, ROW_Y: 26, ROW_H: 9, BURGER: { RIGHT: 17, Y: 4, STEP: 3, W: 13 }, MENU_LABEL: { RIGHT: 3, Y: 13 }, METER: { RIGHT: 51, Y: 28, W: 46, H: 4, FILL: 44 }, MODE: { MIN_Y: 56, BAR_MAX: 120, BAR_SIDE: 80, BAR_H: 6, BELOW_LABEL: 10, BOTTOM: 16 }, FULL_BLINK_HZ: 4 }` · _not verified_
- `inline: off-screen arrow` (inline) from `src/story/walk.ts:553-562`: **extract-config** as `HUD.ARROW {TOP 70, BOTTOM 20, X_CLAMP 14, Y_MIN 80, Y_MAX_UP 70, SIZE 6, WING 2.5, BLINK_HZ 3, BLINK_OFF_PHASE 3}` · _not verified_
- `inline: score display width` (inline) from `src/systems/scoring.ts:50`: **extract-config** as `HUD.SCORE_DIGITS (4)` · _verified_
  It moves with formatScore into ui/text/format.
- `inline: banner layout` (inline) from `src/ui/attackBanner.ts:20, 29-33`: **extract-config** as `BANNER { TITLE_Y 0.36, LINE_GAP 20, SMALL_Y 58, HINT_Y 70, SAVED_Y 0.4 } (default width 216 -> VIEW.W)` · _verified_
- `inline: banner timing` (inline) from `src/ui/attackBanner.ts:50, 52, 54, 56, 61`: **extract-config** as `BANNER { SAVED_TIME 2, SAVED_HZ 6, FLASH_HZ 7, LINE2_STEADY 0.5, REMINDER_HZ 3 }` · _verified_
- `inline: broken-signal jitter` (inline) from `src/ui/attackBanner.ts:58`: **extract-config** as `BANNER.JITTER { CHANCE 0.25, PX 3 }` · _verified_
- `inline: bold line gap` (inline) from `src/ui/card.ts:31`: **extract-config** as `CARD.BOLD_LINE_GAP 3` · _verified_
- `inline: card shadow, inner frame and button fill` (inline) from `src/ui/card.ts:41, 44, 53`: **extract-config** as `CARD { SHADOW_OFFSET 3, SHADOW_ALPHA 0.45, INNER_INSET 2, INNER_ALPHA 0.6, BUTTON_FILL_ALPHA 0.18 }` · _verified_
- `inline: card button geometry` (inline) from `src/ui/card.ts:49-51`: **extract-config** as `CARD.BUTTON { PAD 16, H 15, LABEL_X 8, LABEL_Y 4 }` · _verified_
- `inline: speck scatter ranges` (inline) from `src/ui/discoLights.ts:91`: **extract-config** as `TITLE.DISCO.SPECK_Y { FROM 0.06, SPAN 0.9 }, TITLE.DISCO.SPECK_BIG 0.3` · _verified_
  The seed 0xd15c0 (89) stays inline as a salt. The draw order of rng.next() is unchanged, so the specks are identical.
- `inline: beam geometry` (inline) from `src/ui/discoLights.ts:116, 120-123, 125`: **extract-config** as `TITLE.DISCO { BEAM_LENGTH 1.25, BEAM_PHASE 0.7, BEAM_LEAN 0.6, BEAM_TOP -4, BEAM_CORE { SPREAD 0.4, SHARE 0.9 } }` · _verified_
- `inline: speck wrap and twinkle` (inline) from `src/ui/discoLights.ts:142, 144-145`: **extract-config** as `TITLE.DISCO { SPECK_WRAP 20, TWINKLE { BASE 0.45, AMP 0.35, HZ 5, BEAT 0.4 }, SPECK_ALPHA 0.7 }` · _verified_
- `M` (const) from `src/ui/hud.ts:35`: **move** as `HUD.MARGIN 3` · _verified_
- `RADAR_R` (const) from `src/ui/hud.ts:36`: **move** as `HUD.RADAR_R 17` · _verified_
- `RADAR_RANGE` (const) from `src/ui/hud.ts:38`: **move** as `HUD.RADAR_RANGE 230` · _verified_
- `inline: HUD layout` (inline) from `src/ui/hud.ts:102-135`: **extract-config** as `HUD { STATS_BOX {W 92, H 33, ROWS [4, 14, 24]}, STAR {Y 37, STEP 13}, FACE 17, LIVES_BOX {W 26, H 13, FILL 0.45}, HUNGER {MAX_W 88, SHARE 0.42, LABEL_Y 18, BAR_Y 28}, MENU_ICON {W 14, BARS 3, Y 39}, MENU_BUTTON {R 16}, TIME_BOX {W 98, H 15}, LEVEL_BOX {W 70} }` · _verified_
- `inline: stat change flash` (inline) from `src/ui/hud.ts:151, 155, 176`: **extract-config** as `HUD.FLASH { TIME 0.35, HZ 16 }` · _verified_
- `inline: MENU pressed alpha` (inline) from `src/ui/hud.ts:190`: **extract-config** as `HUD.MENU_PRESSED_ALPHA 0.5` · _added by verifier_
  It is applied in render from the new HudState.menuPressed (entry 98).
- `inline: hunger warning threshold and blink` (inline) from `src/ui/hud.ts:196`: **extract-config** as `HUD.HUNGER_LOW 0.25, HUD.HUNGER_BLINK_HZ 4` · _verified_
- `inline: hunger bar look` (inline) from `src/ui/hud.ts:202-210`: **extract-config** as `HUD.HUNGER_BAR { H 7, BG_ALPHA 0.4, SHINE_ALPHA 0.35 }` · _verified_
- `inline: radar blinks` (inline) from `src/ui/hud.ts:227, 245`: **extract-config** as `HUD.RADAR_BLINK { DOT_HZ 6, EXIT_HZ 3 }` · _verified_
  Verifier: Line 245 blinks with `% 3 !== 0` (visible two thirds of the time), not 50%. Keep the modulus with the rate.
- `inline: default menu geometry` (inline) from `src/ui/menu.ts:36-38`: **extract-config** as `MENU { WIDTH 120, ROW 18, GAP 6 }` · _verified_
- `inline: tap hit slop` (inline) from `src/ui/menu.ts:92`: **extract-config** as `MENU.SLOP { X 4, Y 3 }` · _verified_
- `inline: selection blink` (inline) from `src/ui/menu.ts:104`: **extract-config** as `MENU.BLINK_HZ 4` · _verified_
- `inline: label and icon offsets, label colours` (inline) from `src/ui/touchControls.ts:118-125, 137, 143-144`: **extract-config** as `TOUCH_VIEW.LABELS { PEE_Y 6, PEE_ICON_Y -3, BARK_Y 7, BARK_ICON_Y -4, RUN_ICON_Y -12, RUN_Y 5 }` · _verified_
  The colours '#ffe23a', '#3ff0ff' and '#4dff5a' are exactly C.yellow, C.cyan and C.green. '#0a1a0a' goes to config/colors.ts TOUCH_INK.RUN_OUTLINE, and '#000000' to INK.SHADOW.
- `inline: gesture hints alpha` (inline) from `src/ui/touchControls.ts:154`: **extract-config** as `TOUCH_VIEW.HINT_ALPHA 0.55` · _verified_
- `inline: redraw thresholds` (inline) from `src/ui/touchControls.ts:265, 278, 285`: **extract-config** as `TOUCH_VIEW.EPS { REGEN 0.02, ENERGY 0.01, BARK 0.05 }` · _verified_
- `inline: energy and regen rings and switcher dots` (inline) from `src/ui/touchControls.ts:303, 310, 319-320`: **extract-config** as `TOUCH_VIEW { ENERGY_MIN 0.005, REGEN_W 1, DOTS { STEP 4, Y 6, SIZE 2 } }` · _added by verifier_
  Line 310's ring colour 0xffe23a is NEON.yellow. These are left out of entries 217-218.
- `inline: hint layout` (inline) from `src/ui/touchControls.ts:369-384`: **extract-config** as `TOUCH_VIEW.HINTS { X 6, ABOVE 40, ROW 11, LABEL_X 10, ARROW_X 3, DOTS [1, 5], DOT_R 1.5 }` · _verified_
- `inline: gesture streak geometry` (inline) from `src/ui/touchControls.ts:414-427`: **extract-config** as `TOUCH_VIEW.STREAK { RING { FROM 6, GROW 10, INNER 0.55 }, LEN 26, HEAD { TIP 5, HALF_W 4 }, WORD_Y { UP -34, DOWN -6, TAP -16 } }` · _verified_

#### `src/config/fx.ts`

Effect presets and timings.

Plan: FX; PARTICLE {DRAG 1.5, Y_SPREAD 0.5, FLICKER 0.3 at 30 Hz} (particles 60-93); BURSTS presets: treat/geo/dirt/sparkle/water/leaves/dust/pee (gameFx 81-303), hit/block (combat 243, 304), pickup (walk 305), smell/grace (ch8 57-60, 155-156); POPUP (popups 36-111); RINGS (gameFx 118-120); BARK_WAVE (gameFx 160-166, 318-319, plus BARK.WAVE_SPEED and ANIM_TIME); SHOUT (shout 7, 67-118, plus AMBUSH.SHOUT_\*); ATTACK_GLITCH (gameScene 116-119, 202-212); TRANSITION {FLASH 0.6, curve, TITLE_IN 0.7/1, STORY 0.5/0.6} (transition 15, 61-63; flow 98; storyFlow 126); SPARKS (supervillained 104-140); BUBBLE (gameFx 342-343); SHAKE defaults (steps 4, walk 3, combat 2); BLUR presets (flow 40, overlays 156, supervillained 49).

Entries (54):

- `inline: smell burst preset` (inline) from `src/campaign/chapters/ch8.ts:57-60`: **extract-config** as `BURSTS.smell { count: 5, textures: ['pixel'], colors: [0xa050e0, 0x7a2ab0], speed: [8, 20], life: [0.8, 1.4], drag: 2, lift: 6 }` · _not verified_
- `inline: grace sparkle preset` (inline) from `src/campaign/chapters/ch8.ts:155-156`: **extract-config** as `BURSTS.grace { count: 18, textures: ['sparkle', 'pixel'], colors: [0xffffff, NEON.yellow], speed: [20, 60], life: [0.8, 1.6], drag: 2, lift: 14 }` · _not verified_
- `AMBUSH.SHOUT_IN+SHOUT_HOLD+SHOUT_OUT+SHOUT_FROM+SHOUT_WIDTH+SHOUT_FLASH+SHOUT_JITTER` (const) from `src/config.ts:463-474`: **split** as `SHOUT.{IN, HOLD, OUT, FROM, WIDTH, FLASH, JITTER}` · _verified_
  Read only by ui/shout.ts (as A.SHOUT_\*, lines 56-94), which moves to ui/effects/shout. The shout's inline 0.88, 0.08 and 0.05 tick join the same SHOUT block.
- `AMBUSH.SHAKE` (const key) from `src/config.ts:495-496`: **split** as `FX.SHAKE_AMBUSH` · _added by verifier_
  Camera shake only: gameFx.ts:245 (x1.4), :247 and :253, all moving to core/flow/greenZone/greenZoneFx. It sits beside FX.SHAKE_POOP/HURT/BARK/HIT, by the same reasoning that sends SHOUT_\* to fx.ts.
- `FX` (const) from `src/config.ts:530-539`: **move** · _verified_
  Readers and their targets: fx/gameFx (to core/flow/greenZone/greenZoneFx), fx/transition (TRANSITION_TIME, to core/scene/transition), iso/camera (SHAKE_DECAY, to core/stage/camera).
- `inline: treat bob` (inline) from `src/entities/items.ts:11, 25`: **extract-config** as `BOB.TREAT {PHASE: 6, LIFT: 4, RATE: 3.2, AMP: 1.5}` · _verified_
  PHASE is the Math.random range; the call itself stays.
- `inline: poop hidden alpha` (inline) from `src/entities/items.ts:58`: **extract-config** as `POOP_VIEW.HIDDEN_ALPHA (0.75)` · _verified_
- `inline: cleaned poop fade` (inline) from `src/entities/items.ts:65-67`: **extract-config** as `POOP_VIEW {CLEAN_FADE_RATE: 2.5, CLEAN_GROW: 0.6, CLEAN_TIME: 0.4}` · _verified_
- `inline: digestion bubble look` (inline) from `src/fx/gameFx.ts:70, 342-343`: **extract-config** as `BUBBLE { SCALE 2, BLINK_HZ 8, DX 6, DY -34, BOB_HZ 6, BOB_PX 2 }` · _verified_
- `inline: popup and burst lifts and text offsets` (inline) from `src/fx/gameFx.ts:79-80, 93, 98, 112, 115, 123, 127, 131, 142, 152, 158-159, 168, 173, 182, 186, 197, 200, 202, 205, 209, 215, 235, 249, 251, 256, 262`: **extract-config** as `POPUP.GREEN_ZONE[event].{LIFT, DY}` · _corrected by verifier_
  Before the correction: lines `79, 93, 98, 115, 123, 127, 142, 158-159, 168, 173, 186, 200, 205, 209, 215, 235, 249, 251, 256, 262`; newName `POPUP.GREEN_ZONE[event].{LIFT, DY} (e.g. treat {LIFT 26, DY -8}, score {LIFT 62}, poop {LIFT 30, DY -30}, bark {LIFT 40}, voice {LIFT 44})`.
  Verifier: The line list missed several offsets that the entry's own examples rely on. Missing: 80 (treat DY -8), 112 (poop label DY -30, cited in the example), 131 (poopCleaned lift 4), 152 (drink popup lift 36), 182 (HIT DY -18), 197 (COINS DY -28) and 202 (DISTRACTED DY -22).
- `inline: popup icon scales and text glow and scale` (inline) from `src/fx/gameFx.ts:80, 95, 99, 116, 169, 201, 250, 257`: **extract-config** as `POPUP.GREEN_ZONE[event].{ICON_SCALE, GLOW_ALPHA, SCALE}` · _added by verifier_
  Icon scales 3/3/2/3/2, score glowAlpha 0.3, WOOF glowAlpha 0.5 and '!!' scale 2. These belong in the same per-event table as entries 22-23, which left them out.
- `inline: popup lifetimes and rise speeds` (inline) from `src/fx/gameFx.ts:80, 99, 112, 116, 124, 128, 153, 169, 182, 197, 201-202, 210, 226, 239, 250, 257, 263`: **extract-config** as `POPUP.GREEN_ZONE[event].{LIFE, VY}` · _corrected by verifier_
  Before the correction: lines `112, 124, 128, 153, 169, 182, 197, 201-202, 210, 226, 239, 250, 263`; newName `POPUP.GREEN_ZONE[event].{LIFE, VY} (same table as the lifts)`.
  Verifier: The icon rise speeds were left out: 80 (vy -10), 99 (-8), 116 (-10) and 257 (-8). The icon lifetimes at those lines already use FX.POPUP_TIME.
- `inline: burst presets` (inline) from `src/fx/gameFx.ts:81-89, 101-109, 132-139, 143-151, 174-181, 187-196, 206, 217-225, 252, 259, 282-286, 295-303`: **extract-config** as `BURSTS { treat, poop, poopCleaned, drink, barkHit, cat, ballSpawn, surge, scare, bandPoop, splash, leaves, dust, pee }` · _corrected by verifier_
  BurstOptions.textures is SpriteKey[], which config cannot import. Presets use plain strings and are checked with `satisfies Record<string, BurstOptions>` in greenZoneFx (and walk/combat for their own presets).
  Verifier: Line ranges verified. Problem: config objects are `as const`, so preset arrays become readonly tuples. BurstOptions declares `textures: SpriteKey[]`, `colors: number[]`, `speed: [number, number]`, `life: [number, number]` and `angle?: [number, number]`, all mutable, so `satisfies Record<string, BurstOptions>` fails (readonly is not assignable to mutable). BurstOptions must declare these fields readonly (see entry 40). The surge count (218) is dynamic, so its preset keeps COUNT {BASE, MAX} and greenZoneFx computes the count.
- `inline: ring durations, marking ring, pee stream timers` (inline) from `src/fx/gameFx.ts:118-120, 216`: **extract-config** as `RINGS { PEE 0.7, MARK 0.9, MARK_INNER {DELAY 0.15, SCALE 0.6, DUR 0.8}, SURGE 0.9 }; PEE_STREAM.TIME { PEE 0.65, MARK 0.85 }` · _verified_
  The ring colours (0xfff36a = GOAL, 0x7aff4a, 0x8f6a30 = DIRT[1]) go to config/colors.ts as RING_COLORS.
- `inline: bark wave look` (inline) from `src/fx/gameFx.ts:158-159, 161-166, 318-319`: **extract-config** as `BARK_WAVE {COUNT 3, STAGGER 0.07, EXTRA_LIFE 0.12, START 0.5, LIFT 12, BIG_AT 0.5, FADE_AT 0.75, FADE_ALPHA 0.5}` · _corrected by verifier_
  The middle tint 0x3ff0ff is NEON.cyan.
  Before the correction: newName `BARK_WAVE { COUNT 3, STAGGER 0.07, EXTRA_LIFE 0.12, START 0.5, LIFT 12, BIG_AT 0.5, FADE_AT 0.75, FADE_ALPHA 0.5, SPEED (from BARK.WAVE_SPEED), ANIM_TIME (from BARK.ANIM_TIME) }`.
  Verifier: BARK.WAVE_SPEED and BARK.ANIM_TIME are gameplay rules, not visuals. systems/threats.ts:168 times the pending bark hit as d / BARK.WAVE_SPEED. threats.ts:161 locks the player for BARK.ANIM_TIME. Both must stay in BARK in config/greenZone.ts, and BarkWaves reads BARK.WAVE_SPEED and BARK.RANGE from there so the wave stays in sync with the hit. ANIM_TIME is not used by the wave at all. The target's 'BARK_WAVE ... plus BARK.WAVE_SPEED and ANIM_TIME' is wrong on this point.
- `inline: pollution surge burst count` (inline) from `src/fx/gameFx.ts:218`: **extract-config** as `BURSTS.surge.COUNT { BASE 6, MAX 18 }` · _verified_
- `inline: ambush voice glow steps and wrap width` (inline) from `src/fx/gameFx.ts:237-239`: **extract-config** as `POPUP.VOICE { GLOW_MIN 0.2, GLOW_RANGE 0.4, GLOW_STEPS 3, MAX_WIDTH 150, LIFE 1.1, LIFE_LOUD 0.5, VY -12 }` · _verified_
  Keep the quantized glow even after the pool key includes glow, so the pool stays small.
- `inline: NOW! shake multiplier` (inline) from `src/fx/gameFx.ts:245`: **extract-config** as `SHAKE.NOW_MUL 1.4 (times AMBUSH.SHAKE)` · _verified_
- `inline: footstep interval` (inline) from `src/fx/gameFx.ts:279`: **extract-config** as `FOOTSTEPS { RUN 0.11, WALK 0.22 }` · _verified_
- `inline: pee stream origin offset` (inline) from `src/fx/gameFx.ts:295`: **extract-config** as `PEE_STREAM { BACK 6, UP 8 }` · _verified_
- `inline: burst defaults` (inline) from `src/fx/particles.ts:60, 64`: **extract-config** as `PARTICLE { Y_SPREAD 0.5, DRAG 1.5 }` · _verified_
  The `fade ?? true` default (67) stays an API default inline.
- `inline: end-of-life flicker` (inline) from `src/fx/particles.ts:93`: **extract-config** as `PARTICLE.FLICKER { FROM 0.3, HZ 30, ALPHA 0.2 }` · _verified_
- `inline: icon and text defaults` (inline) from `src/fx/popups.ts:36, 43`: **extract-config** as `POPUP { ICON_SCALE 2, ICON_LIFE 1.1, ICON_VY -14, TEXT_LIFE 0.9, TEXT_VY -22 }` · _verified_
- `inline: text pool cap` (inline) from `src/fx/popups.ts:64`: **extract-config** as `POPUP.POOL_PER_KEY 4` · _verified_
- `inline: rise damping and pop-in` (inline) from `src/fx/popups.ts:94, 107-108`: **extract-config** as `POPUP.RISE_DAMP 2.2; POPUP.POP { TIME 0.18, FROM 0.4, OVERSHOOT 1 }` · _verified_
- `inline: blink-out` (inline) from `src/fx/popups.ts:111`: **extract-config** as `POPUP.BLINK_OUT { TIME 0.3, HZ 20 }` · _verified_
- `inline: default flash amount` (inline) from `src/fx/transition.ts:15, 38`: **extract-config** as `TRANSITION.FLASH 0.6` · _verified_
  The 0.6 written twice becomes one constant. FX.TRANSITION_TIME stays as it is.
- `inline: glitch curve` (inline) from `src/fx/transition.ts:61-63`: **extract-config** as `TRANSITION.CURVE { RGB_BASE 1, RGB_PEAK 3, SCANLINES 0.6, FLASH_FROM 0.6, FLASH_GAIN 2.5 }` · _verified_
- `inline: title backdrop blur` (inline) from `src/scenes/flow.ts:40`: **extract-config** as `BLUR.TITLE_BACKDROP { STRENGTH 3, QUALITY 2, RESOLUTION 1 }` · _verified_
- `inline: title entrance transition` (inline) from `src/scenes/flow.ts:98`: **extract-config** as `TRANSITION.TITLE_IN { DURATION 0.7, FLASH 1 }` · _verified_
- `inline: exit marker geometry and motion` (inline) from `src/scenes/gameScene.ts:82, 234, 236`: **extract-config** as `EXIT_MARKER { FLAG_DX 0.25, FLAG_DY -0.25, PULSE_RATE 5, LABEL_LIFT 44, BOB_RATE 3, BOB_PX 2 }` · _corrected by verifier_
  Before the correction: newName `EXIT_MARKER { FLAG_DX 0.25, FLAG_DY -0.25, PULSE_HZ 5, LABEL_LIFT 44, BOB_HZ 3, BOB_PX 2 }`.
  Verifier: Lines 234 and 236 use sin(time\*5) and sin(time\*3), so these are angular rates in rad/s, not Hz. A key named PULSE_HZ invites someone to apply 2\*PI later and change the pulse. Name them \*_RATE (rad/s), as SUPERVILLAINED.BOUNCE_FREQ documents 'frequency in rad/s'.
- `inline: attack glitch kicks` (inline) from `src/scenes/gameScene.ts:116, 119`: **extract-config** as `ATTACK_GLITCH.KICK { START 0.6, BARK 0.15 }` · _verified_
- `inline: attack fx curve` (inline) from `src/scenes/gameScene.ts:202-212`: **extract-config** as `ATTACK_GLITCH { RISE 2.5, FALL 0.8, ZERO 0.005, BURST_CHANCE [0.006, 0.02], BURST_TIME [0.08, 0.15], SEPIA_MAX 0.9, SEPIA_K 0.95, SCANLINES 0.35, GLITCH [0.35, 0.5], RGB [2, 2], RGB_IDLE_ABOVE 0.5 }` · _verified_
- `inline: magnet ring shape` (inline) from `src/scenes/gameScene.ts:251-259`: **extract-config** as `MAGNET_RINGS { RANGE 1.8 (x BALL.MAGNET_RADIUS), SPEED 0.8, COUNT 2, PHASE 0.5, STROKE 1, ALPHA 0.55, ALPHA_MIN 0.1 }` · _verified_
  The 16 and 8 are not config: they become HALF_W/HALF_H from core/math/projection.
  Verifier: HALF_W and HALF_H are module-private at HEAD (iso/projection.ts:16-17, `const` with no export). The target exports them from core/math/projection, so this works once that step lands.
- `inline: footer glow blur` (inline) from `src/scenes/overlays.ts:156`: **extract-config** as `BLUR.FOOTER { QUALITY 3, RESOLUTION 1 } (strength stays TITLE.FOOTER_GLOW_BLUR)` · _verified_
- `inline: halo blur` (inline) from `src/scenes/supervillainedScene.ts:49`: **extract-config** as `BLUR.SV_HALO { QUALITY 3, RESOLUTION 1 } (strength stays SUPERVILLAINED.GLOW_BLUR)` · _verified_
- `inline: spark burst shape` (inline) from `src/scenes/supervillainedScene.ts:113, 132-140`: **extract-config** as `SPARKS { STAR_EVERY 3, ANGLE_JITTER 0.4, SPAWN_AT 0.8, KICK_Y -40, SPIN 6, FADE_HALF 0.5 }` · _verified_
  The existing SUPERVILLAINED.SPARKS, SPARK_SPEED, SPARK_LIFE and SPARK_GRAVITY stay in that block for step 1 (blocks move whole). They may fold into fx SPARKS later.
  Verifier: FADE_HALF 0.5 used as `left / 0.5` equals `left * 2` exactly (power of two), so the screenshots stay identical.
- `inline: hit and block bursts` (inline) from `src/story/combat.ts:243, 304`: **extract-config** as `BURSTS.HIT {LIFT 14, count 6, pixel, [NEON.white, NEON.yellow], speed [30,80], life [0.2,0.4], drag 4}, BURSTS.BLOCK {LIFT 14, count 8, [.., .., 0x9ad8ff], speed [40,100], life [0.15,0.35], drag 5}` · _not verified_
- `inline: hurt screen shake` (inline) from `src/story/combat.ts:314`: **extract-config** as `SHAKE.HURT 2` · _not verified_
- `inline: shake default` from `src/story/steps.ts:340`: **extract-config** as `SHAKE.STEP 4` · _not verified_
- `inline: glitch transition timings` from `src/story/storyFlow.ts:126`: **extract-config** as `TRANSITION.STORY { IN: 0.5, OUT: 0.6 }` · _not verified_
- `inline: screen flash` from `src/story/storyScene.ts:359, 444`: **extract-config** as `FLASH { ALPHA: 0.9, FADE: 2.5 }` · _not verified_
  The colour default goes to SCREEN_FX.FLASH (colors.ts).
- `inline: fog and visor geometry` from `src/story/storyScene.ts:456-457, 462, 465`: **extract-config** as `FOG { HOLE_R: 34, HOLE_LIFT: 12 }, VISOR_SHAPE { CHEEK: 0.82, EDGE: 2 }` · _not verified_
- `inline: pickup visuals` (inline) from `src/story/walk.ts:109, 123, 127, 138-139`: **extract-config** as `PICKUP_FX {PHASE 6, MARVEL_SCALE 2, DEPTH_BIAS -0.2, BOB {LIFT 6, AMP 2, HZ 3}, MARVEL_PULSE {BASE 0.6, AMP 0.4, HZ 6}}` · _not verified_
  The bounds at 126 become a cullBox derived from the SpriteDef, not config.
- `inline: pickup burst` (inline) from `src/story/walk.ts:305`: **extract-config** as `BURSTS.PICKUP {LIFT 10, count 10, [sparkle, pixel], [NEON.white, NEON.yellow, 0x5ac8ff], speed [30,70], life [0.4,0.8], drag 3}` · _not verified_
- `inline: caught shake` (inline) from `src/story/walk.ts:356`: **extract-config** as `SHAKE.CAUGHT 3` · _not verified_
- `inline: squash bump amounts (poop, treat)` (inline) from `src/systems/rules.ts:196, 229`: **extract-config** as `SQUASH_BUMP.POOP (-0.25), SQUASH_BUMP.TREAT (0.22)` · _verified_
  They move with the bump calls into greenZoneFx.
- `inline: squash bump amounts (cat, bark)` (inline) from `src/systems/threats.ts:93, 162`: **extract-config** as `SQUASH_BUMP.CAT (0.2), SQUASH_BUMP.BARK (0.18)` · _verified_
- `SPIKES` (const) from `src/ui/shout.ts:7`: **move** as `SHOUT.SPIKES 18` · _verified_
  The AMBUSH.SHOUT_\* keys join SHOUT in the same commit (per the plan).
- `inline: default view and word centre` (inline) from `src/ui/shout.ts:22-23, 47, 83`: **extract-config** as `SHOUT.CENTER_Y 0.34 (216x400 -> VIEW)` · _verified_
- `inline: settle and blow-away` (inline) from `src/ui/shout.ts:67-69, 74`: **extract-config** as `SHOUT { SETTLE_FROM 0.88, SETTLE_TIME 0.08, BLOW_GROW 0.35 }` · _verified_
- `inline: jitter step and flash time` (inline) from `src/ui/shout.ts:80, 85`: **extract-config** as `SHOUT { JITTER_STEP 0.05, FLASH_TIME 0.15 }` · _verified_
  The hash constants 12.9898 and 78.233 (81-82) stay inline as algorithm constants.
- `inline: minimum scale and burst radii` (inline) from `src/ui/shout.ts:94, 104-105`: **extract-config** as `SHOUT { MIN_SCALE 2, BURST_RX { K 0.66, ADD 10 }, BURST_RY { K 1.45, ADD 8 } }` · _verified_
- `inline: burst geometry` (inline) from `src/ui/shout.ts:109-111, 116-118`: **extract-config** as `SHOUT { ANGLE_WOBBLE 0.09, OUTER_WOBBLE 0.08, INNER 0.72, LAYERS [1.08, 1, 0.82] }` · _verified_

#### `src/config/audio.ts`

Mix levels, synth constants, ducking and per-event playback.

Plan: AUDIO (FILE_GAIN and MUSIC_FILE_GAIN checked with `satisfies` in core/audio/files.ts); LEVEL_STEPS with tolerances 0.01/0.005 (settings 11-24); SYNTH {SFX_RATE, MUSIC_RATE 22050, fades 0.02/0.08/0.4/0.15/0.05, RETRIGGER 0.045, DUCK_EPS 0.01, PREROLL 0.01} (core/audio 7-341); BAND_PITCH and jitter (gameAudio 4-5, 26); EVENT_PLAYBACK (gameAudio 16-51); DUCK {PAUSE 0.4, ATTACK 0.45, COMPLETE 0.35} (flow 236/276, gameAudio 55-65, storyFlow 337); MUSIC {MENU 'intro', WALK 'greenzone'}; STAR_PITCH_STEP 0.12 (flow 333); AMBUSH.VOICE_VOLUME.

Entries (26):

- `AMBUSH.VOICE_VOLUME` (const) from `src/config.ts:442-443`: **split** as `AMBUSH_VOICE_VOLUME` · _verified_
  Read only at gameAudio.ts:38 (to core/flow/greenZone/greenZoneAudio).
- `AUDIO` (const) from `src/config.ts:541-569`: **move** · _corrected by verifier_
  Drop the casts `as Partial<Record<string, number>>` on MUSIC_FILE_GAIN (558) and FILE_GAIN (561): config cannot import FileSoundName. Instead, core/audio/files.ts exports typed views (`FILE_GAIN: Partial<Record<SoundName, number>> = AUDIO.FILE_GAIN satisfies ...`, and the same for MUSIC_FILE_GAIN keyed by FileMusicTrack), and engine.ts indexes those. Without the cast, AUDIO.FILE_GAIN[name] with name: SoundName no longer type-checks. DEFAULT_VOLUME (0.7) must stay a member of LEVEL_STEPS. LEVEL_CLICK_DELAY (0.06) is documented as about 3 times SYNTH.SETTINGS_FADE (0.02): keep the two side by side. Tests read DEFAULT_VOLUME, MUSIC_VOLUME, MUSIC_FILE_VOLUME and SFX_VOLUME through the barrel.
  Verifier: `as Partial<Record<string, number>>` (558, 561) uses only built-in types and imports nothing, so config may keep it, and step 1 is verbatim anyway. If the casts are dropped later to get key checking, `AUDIO.FILE_GAIN satisfies Partial<Record<FileSoundName, number>>` on a non-literal reference does no excess-key check: a typo key passes as long as one key matches (weak-type rule). Assert `keyof typeof AUDIO.FILE_GAIN extends FileSoundName` (and the same for MUSIC_FILE_GAIN against FileMusicTrack) in core/audio/files.ts, and export the typed views engine.ts indexes.
- `SFX_RATE` (const) from `src/core/audio.ts:7`: **extract-config** as `SYNTH.SFX_RATE` · _verified_
  22050 Hz.
- `MUSIC_RATE` (const) from `src/core/audio.ts:8`: **extract-config** as `SYNTH.MUSIC_RATE` · _verified_
  22050 Hz.
- `inline: initial music track 'intro'` (inline) from `src/core/audio.ts:58`: **extract-config** as `MUSIC.MENU` · _verified_
  The same string as flow's intro track. Check it with `satisfies MusicTrack` in engine.ts.
- `inline: bus fade time constant on settings change` (inline) from `src/core/audio.ts:138-140`: **extract-config** as `SYNTH.SETTINGS_FADE (0.02)` · _verified_
  AUDIO.LEVEL_CLICK_DELAY (0.06) depends on this value (about 3 time constants): keep the two adjacent.
- `inline: same-sound retrigger throttle` (inline) from `src/core/audio.ts:167`: **extract-config** as `SYNTH.RETRIGGER (0.045)` · _verified_
- `inline: loop stop fade and stop delay` (inline) from `src/core/audio.ts:211-213`: **extract-config** as `SYNTH.LOOP_FADE (0.08), SYNTH.LOOP_STOP_AFTER (0.4)` · _verified_
- `inline: duck epsilon and duck fade` (inline) from `src/core/audio.ts:248-250`: **extract-config** as `SYNTH.DUCK_EPS (0.01), SYNTH.DUCK_FADE (0.15)` · _verified_
- `inline: music bus fade on track switch` (inline) from `src/core/audio.ts:259`: **extract-config** as `SYNTH.TRACK_FADE (0.05)` · _verified_
- `inline: leading-silence pre-roll` (inline) from `src/core/audio.ts:341`: **extract-config** as `SYNTH.PREROLL (0.01)` · _verified_
- `LEVEL_STEPS` (const) from `src/core/settings.ts:11`: **extract-config** as `LEVEL_STEPS` · _verified_
  It must stay a plain number array, because settings.test iterates it, maps it with levelLabel and uses toContain, so the tolerances go in a sibling constant. It must keep containing AUDIO.DEFAULT_VOLUME (0.7). settings.test imports it from core/settings, so either re-export it from core/state/settings or point the test at config.
- `inline: level step tolerances` (inline) from `src/core/settings.ts:18, 24`: **extract-config** as `LEVEL_STEP_EPS {NEXT 0.01, OFF 0.005}` · _verified_
  NEXT is used by nextLevel (core/state/settings) and OFF by levelLabel (ui/text/format).
- `BAND_PITCH` (const) from `src/fx/gameAudio.ts:4`: **move** as `BAND_PITCH (frozen { bagnaskiz: 1, jack: 1.35, watson: 0.82 })` · _verified_
  The value is unchanged. Typed Record&lt;string, number> today: under `as const`, greenZoneAudio indexes it as Readonly&lt;Record&lt;string, number>> with the same ?? 1 fallback.
  Verifier: Under `as const` the key type is a literal union, so BAND_PITCH[e.who] with a string fails under strict (TS7053). Widen it at the use site, as the entry says, or keep a Record&lt;string, number> annotation in config the way FILE_GAIN does. BAND_COLOR (entry 14) needs the same treatment.
- `inline: band and Zampano bark pitch jitter` (inline) from `src/fx/gameAudio.ts:5, 26`: **extract-config** as `BAND_JITTER [0.96, 0.08]; EVENT_PLAYBACK.bark.RATE_JITTER [0.95, 0.1]` · _verified_
  Same number of Math.random draws, at the same call sites.
- `inline: per-event playback parameters` (inline) from `src/fx/gameAudio.ts:16, 19, 20, 22, 35, 45, 46, 50, 51`: **extract-config** as `EVENT_PLAYBACK { markStarDelay 0.12, tired {rate 0.8}, poopCleaned {rate 1.5, volume 0.5}, splash {volume 0.7}, surge {rate 0.82, volume 0.75}, nowBarkRate 0.92, nowHitDelay 0.05, ambushBark {volume 0.8}, bandPoop {volume 0.6} }` · _verified_
  Verifier: All nine lines verified (16 star delay 0.12, 19, 20, 22, 35, 45 \*0.92, 46 delay 0.05, 50, 51).
- `inline: music duck levels` (inline) from `src/fx/gameAudio.ts:55, 60, 65`: **extract-config** as `DUCK.ATTACK 0.45, DUCK.NONE 1, DUCK.COMPLETE 0.35` · _verified_
  These join DUCK.PAUSE 0.4 (flow 236/276) in the same table.
- `inline: music track names` (inline) from `src/scenes/flow.ts:74, 188, 201, 323`: **extract-config** as `MUSIC { MENU 'intro', WALK 'greenzone' }` · _corrected by verifier_
  Checked `satisfies` against MusicTrack in core/audio/files at the use site, because config cannot import the type.
  Verifier: Fix the note. MusicTrack is declared in core/audio.ts:10 (FileMusicTrack | 'medieval'), which goes to core/audio/engine.ts; core/audio/files holds FileMusicTrack. No `satisfies` is needed: with `as const`, MUSIC.MENU is the literal 'intro', so playTrack(MUSIC.MENU) is type-checked at the call. Also add the fifth use at overlays.ts:250 (`music?.track === 'intro'`); see missed.
- `inline: music duck levels` (inline) from `src/scenes/flow.ts:236, 276`: **extract-config** as `DUCK { PAUSE 0.4, ATTACK 0.45 } (1 = no duck)` · _verified_
- `inline: star pop pitch step` (inline) from `src/scenes/flow.ts:333`: **extract-config** as `STAR_PITCH_STEP (0.12)` · _verified_
- `inline: title music track check` (inline) from `src/scenes/overlays.ts:250`: **extract-config** as `MUSIC.MENU` · _added by verifier_
  `music?.track === 'intro'` is the fifth use of the menu track name (the others are flow 74/188/323). The disco lights follow the beat only while that track plays, so it has to stay equal to the track Flow starts.
- `inline: snap star pitch` (inline) from `src/scenes/supervillainedScene.ts:127`: **extract-config** as `SV_STAR_RATE (1.5)` · _verified_
- `inline: mini-game sound levels` (inline) from `src/story/minigames/action.ts:109, 294, 354, 358`: **extract-config** as `MINI_SOUNDS {CLIMB {VOLUME 0.4, PITCH_STEP 0.1, CYCLE 4}, TUG 0.4, SPLASH 0.5, STROKE 0.5}` · _not verified_
- `inline: metronome volume` (inline) from `src/story/minigames/rhythm.ts:140`: **extract-config** as `MINI_SOUNDS.METRONOME 0.5` · _not verified_
- `inline: menu and card music track` from `src/story/storyFlow.ts:90, 133, 165, 181, 276, 308`: **extract-config** as `MUSIC.MENU 'intro'` · _not verified_
  Checked with `satisfies MusicTrack` at the use site (config imports no types).
- `inline: pause music duck` from `src/story/storyFlow.ts:337, 343`: **extract-config** as `DUCK.PAUSE 0.4 (restore 1)` · _not verified_

#### `src/config/motion.ts`

Player and actor motion shared by the Green Zone and the story.

Plan: PLAYER, ENERGY (config 47-86); TERRAIN {TALL_GRASS 0.85, WATER 0.8, BUSH 0.7} (zampano 44-48); PLAYER_MOTION {MOVING 0.25, FACE_AT 0.3, FETCH_TURN 0.5, FETCH_SPEED 0.9, RUN_ANIM 1.15, SQUASH 240/14/0.35, BLINK_HZ 12} (zampano 114-282); KNOCK_DECAY 9 (zampano 209, with BAGNASKIZ.KNOCKBACK_DECAY and COMBAT.FOE.KNOCK_DECAY kept as aliases of it); STEERING {radii 0.25/0.45/0.3, KNOCK_STOP 0.05, ARRIVE 0.15, CHASE_STOP 0.3, HOME 0.6, PATROL 2/1.5/0.8, FLEE_THINK 0.2, FOLLOW 1.6/0.5/2, WANDER 0.3/1.5/0.002, FLY, MOVING 0.1, SIT_AFTER 3, EMOTE 0.6, FLASH 0.15} (actor 66-318); FLEE_AI (threatLogic 24-67).

Entries (28):

- `PLAYER` (const) from `src/config.ts:47-69`: **move** · _corrected by verifier_
  WALK/RUN_SPEED, ACCEL, DECEL, RADIUS and BOUNCE are read by entities/zampano, which moves to systems/player/playerMotion. tests/threats and tests/balance read RUN_SPEED and WALK_SPEED through the barrel, unchanged. HURT_INVULN, MARK_DISTANCE and DRINK_DISTANCE are read only by systems/rules.ts (lines 250, 153, 209). They are Green Zone rules the plan leaves in PLAYER, and they are candidates for config/greenZone RULES later.
  Verifier: The move is right, but the reader note is off. PLAYER.BOUNCE is read in Zampano.bump (zampano.ts:168), which stays on the entity, not in playerMotion. WALK_SPEED is also read by the view at zampano.ts:253 and :270 (the run/walk clip choice and the walk anim speed).
- `PLAYER.IDLE_PHASE_TIME` (const) from `src/config.ts:56-57`: **split** as `PLAYER_MOTION.IDLE_PHASE_TIME` · _verified_
  A view/animation number, read only at zampano.ts:258 (the idle sit/sniff clip choice). It moves in the commit that splits Zampano.
  Verifier: zampano.ts:258 uses it to pick the idle/sit/sniff clip. Under the entity model that is AnimationState logic, advanced in update, so PLAYER_MOTION is a fine home.
- `ENERGY` (const) from `src/config.ts:75-86`: **move** · _verified_
  Read by systems/needs (to systems/player/needs), systems/rules and tests/systems. HUNGRY_RECOVERY is arcade-only, but it stays in the block.
- `BAGNASKIZ.KNOCKBACK_DECAY` (const) from `src/config.ts:510`: **split** as `KNOCK_DECAY (kept as BAGNASKIZ.KNOCKBACK_DECAY: KNOCK_DECAY)` · _verified_
  An alias: greenZone.ts imports KNOCK_DECAY from ./motion, and motion.ts must never import greenZone.ts. Reader: critters.ts:191.
- `COMBAT.FOE.KNOCK_DECAY` (const) from `src/config.ts:747`: **split** as `KNOCK_DECAY (kept as COMBAT.FOE.KNOCK_DECAY: KNOCK_DECAY)` · _verified_
  An alias: combat.ts imports ./motion. Reader: actor.ts:143, which moves to systems/motion/steering.
- `inline: collision radii` (inline) from `src/entities/actor.ts:68, 93`: **extract-config** as `STEERING.RADIUS {DEFAULT: 0.25, LEGS: 0.45, FIGURE: 0.3}` · _verified_
- `inline: hit flash duration` (inline) from `src/entities/actor.ts:132`: **extract-config** as `STEERING.FLASH (0.15)` · _verified_
- `inline: knockback stop threshold` (inline) from `src/entities/actor.ts:139`: **extract-config** as `STEERING.KNOCK_STOP (0.05)` · _verified_
- `inline: arrive radii and chase return speed` (inline) from `src/entities/actor.ts:165, 199, 201, 227`: **extract-config** as `STEERING.ARRIVE 0.15, STEERING.CHASE_STOP 0.3, STEERING.HOME 0.6, STEERING.FOLLOW.ARRIVE 0.2` · _verified_
- `inline: patrol look-around and pause` (inline) from `src/entities/actor.ts:184, 191`: **extract-config** as `STEERING.PATROL {SWAY_RATE: 2, SWAY_GAIN: 1.5, PAUSE: 0.8}` · _verified_
- `inline: flee re-think interval` (inline) from `src/entities/actor.ts:208`: **extract-config** as `STEERING.FLEE_THINK (0.2)` · _verified_
- `inline: follow catch-up, trail and run factors` (inline) from `src/entities/actor.ts:227-228`: **extract-config** as `STEERING.FOLLOW {CATCH_UP: 1.6, TRAIL: 0.5, RUN_AT: 2}` · _verified_
- `inline: wander/flail arrive, retarget, skip chance` (inline) from `src/entities/actor.ts:235-240`: **extract-config** as `STEERING.WANDER {ARRIVE: 0.3, FLAIL_RETARGET: 1.5, SKIP: 0.002}` · _verified_
  Values only; the Math.random comparisons stay in the same order.
- `inline: fly behaviour` (inline) from `src/entities/actor.ts:255-274`: **extract-config** as `STEERING.FLY {FLEE_STEP: 2, CIRCLE_RATE: 0.9, CIRCLE_R: 0.8, ARRIVE: 0.05, HOVER_Z: 24, HOVER_AMP: 3, HOVER_RATE: 5}` · _verified_
- `inline: moving threshold and sit delay` (inline) from `src/entities/actor.ts:287, 303`: **extract-config** as `STEERING.MOVING 0.1, STEERING.SIT_AFTER 3` · _verified_
- `inline: emote default duration` (inline) from `src/entities/actor.ts:318`: **extract-config** as `STEERING.EMOTE (0.6)` · _verified_
- `TERRAIN_SPEED` (const) from `src/entities/zampano.ts:44-47`: **extract-config** as `TERRAIN {TALL_GRASS: 0.85, WATER: 0.8}` · _verified_
  Config may not import Ground, so config holds named numbers. The Ground-keyed lookup lives in systems/player/playerMotion.terrainFactor.
- `BUSH_SPEED` (const) from `src/entities/zampano.ts:48`: **extract-config** as `TERRAIN.BUSH (0.7)` · _verified_
- `inline: shadow alpha` (inline) from `src/entities/zampano.ts:92`: **extract-config** as `PLAYER_MOTION.SHADOW_ALPHA (0.9)` · _verified_
- `inline: moving and facing thresholds` (inline) from `src/entities/zampano.ts:114, 228`: **extract-config** as `PLAYER_MOTION {MOVING: 0.25, FACE_AT: 0.3}` · _verified_
  0.25 also appears at 254/263 (walk anim and idle reset): use the same constant.
- `inline: squash impulse gain` (inline) from `src/entities/zampano.ts:146`: **extract-config** as `PLAYER_MOTION.SQUASH.GAIN (30)` · _verified_
- `inline: fetch turn and speed` (inline) from `src/entities/zampano.ts:198-200`: **extract-config** as `PLAYER_MOTION {FETCH_TURN: 0.5, FETCH_SPEED: 0.9}` · _verified_
- `inline: knockback decay` (inline) from `src/entities/zampano.ts:209`: **extract-config** as `KNOCK_DECAY (9)` · _verified_
  BAGNASKIZ.KNOCKBACK_DECAY and COMBAT.FOE.KNOCK_DECAY become aliases of it (both are 9 today).
- `inline: animation thresholds` (inline) from `src/entities/zampano.ts:252-254, 270`: **extract-config** as `PLAYER_MOTION {EAT_WALK_SPEED: 0.4, EAT_WALK_AFTER: 0.2, RUN_ANIM: 1.15, WALK_ANIM_MIN: 0.6}` · _verified_
- `inline: squash spring` (inline) from `src/entities/zampano.ts:275-280`: **extract-config** as `PLAYER_MOTION.SQUASH {STIFFNESS: 240, DAMPING: 14, CLAMP: 0.35, WIDTH: 0.6}` · _verified_
  PLAYER.BOB_AMOUNT (config.ts:55) is unused (grep BOB_AMOUNT: only config.ts:55). Drop it in this commit or leave it for cleanup.
- `inline: invulnerability blink` (inline) from `src/entities/zampano.ts:282`: **extract-config** as `PLAYER_MOTION {BLINK_HZ: 12, BLINK_ALPHA: 0.35}` · _verified_
- `inline: scared tremble` (inline) from `src/entities/zampano.ts:285`: **extract-config** as `PLAYER_MOTION {TREMBLE_HZ: 26, TREMBLE_PX: 1}` · _verified_
- `inline: flee sampling and weights` (inline) from `src/systems/threatLogic.ts:58-67`: **extract-config** as `FLEE_AI {SAMPLES: 16, PROBE_NEAR: 0.6, PROBE_MID: 1.3, AWAY_AT: 2, LOOK_AHEAD: 2.4, DEAD_END: -0.8, MOMENTUM: 0.6, RANDOM: 0.4}` · _verified_
  Keep `(k / SAMPLES) * Math.PI * 2` and the other expressions term for term.

#### `src/config/greenZone.ts`

Tuning of the 1.0 walk rules.

Plan: HUNGER, TREAT, DIGESTION, POOP, BLADDER, POLLUTION, ZONE, LIVES, SCORE, CAT, BALL, ATTACK, AMBUSH (SHOUT_\* to fx.ts, VOICE_VOLUME to audio.ts, VOICE_INSET to ui.ts), BAGNASKIZ, BARK; new BAND_BODY 0.3 (ambushEntry 17); CRITTERS (critters 47-208); RULES {EXIT_REACH 0.8, POOP_OFFSET 0.15, EAT 0.3, HURT 0.6} (rules 139-249); THREATS (threats 145-266, HITS_TO_ROUT 3 shown at gameFx 182); BAND_RUNTIME (ambush 72-232); PLACEMENT (placement 39-209); STAR_MAX 5 (scoring 6); EXIT_DELAY 1.1 (gameScene 192); FLEE spawn ranges (threats 216, 259-266).

Entries (61):

- `PLAYER.HURT_INVULN+MARK_DISTANCE+DRINK_DISTANCE` (const keys) from `src/config.ts:58-63`: **split** as `RULES.{HURT_INVULN, MARK_DISTANCE, DRINK_DISTANCE}` · _added by verifier_
  Green Zone rules read only by systems/rules.ts:250, :153 and :209 (to systems/greenZone/rules). No test reads them. motion.ts is meant for motion shared by the Green Zone and the story, and these are neither motion nor shared. Move them in the commit that moves rules.ts.
- `HUNGER` (const) from `src/config.ts:291-302`: **move** · _verified_
  Read by systems/needs, systems/rules, tests/systems and tests/balance.
- `TREAT` (const) from `src/config.ts:304-317`: **move** · _verified_
  Read by systems/rules, systems/placement (to systems/greenZone/placement), tests/systems and tests/balance.
- `DIGESTION` (const) from `src/config.ts:319-325`: **move** · _verified_
- `POOP` (const) from `src/config.ts:328-338`: **move** · _verified_
  Read by world/map (to systems/world/map), systems/rules and entities/items (to entities/items/poopPile).
- `BLADDER` (const) from `src/config.ts:340-354`: **move** · _verified_
- `POLLUTION` (const) from `src/config.ts:356-365`: **move** · _verified_
  CLEAN_THRESHOLD is read by systems/world/map (246, 264), threats (264) and tests/map. FRESH_TIME is both the model timer (map 271) and the renderer fade (mapRenderer 246), so it stays here.
- `ZONE` (const) from `src/config.ts:367-373`: **move** · _corrected by verifier_
  Read by systems/scoring, campaign/chapters/ch1 (content) and tests/systems.
  Verifier: ch1 does not read ZONE: the hit at ch1.ts:42 is prose ('...POLLUTES THE ZONE.'), and ch1 imports only STORY from config. Readers: systems/scoring and tests/systems.
- `LIVES` (const) from `src/config.ts:375-381`: **move** · _verified_
  Read by systems/lives (to systems/greenZone/lives), systems/rules, core/settings (LIVES.START, to core/state/settings) and tests/lives.
- `SCORE` (const) from `src/config.ts:383-388`: **move** · _verified_
- `CAT` (const) from `src/config.ts:390-404`: **move** · _verified_
- `BALL` (const) from `src/config.ts:406-417`: **move** · _corrected by verifier_
  Content reads it too (ch1 and ch8; a legal L8 to L0 edge), as do gameScene and tests/threats.
  Verifier: No content reads BALL. ch1.ts:325 and ch8.ts:252/263 are prose ('RED BALL.'), and ch8 imports nothing from config. Readers: systems/threats, entities/critters (LIFETIME), scenes/gameScene (LIFETIME, MAGNET_RADIUS) and tests/threats.
- `ATTACK` (const) from `src/config.ts:419-431`: **move** · _corrected by verifier_
  Readers: ui/attackBanner (TITLE_TIME), world/level (to systems/world/level), threatLogic and tests/threats.
  Verifier: world/level.ts does not read ATTACK: line 65 is a doc comment, and level.ts imports only ./tiles. Readers: threatLogic, ui/attackBanner (TITLE_TIME) and tests/threats.
- `AMBUSH` (const) from `src/config.ts:437-497`: **move** · _corrected by verifier_
  SHAKE (gameFx 245-253) stays, as the plan names no other home for it. tests/ambush reads VOICE_EVERY, VOICE_JITTER, ENTRY_DIRS, JUMP_MAX, SCARE_TIME, LEAVE_TIME and ATTACK_GRACE, all of which stay here.
  Verifier: Move the block, but split out AMBUSH.SHAKE (495-496) as the missed entry below shows. It is purely visual: three camera.shake calls in gameFx.ts:245, :247 and :253, which go to core/flow/greenZone/greenZoneFx. That is the same reasoning that sends SHOUT_\* to fx.ts. config/fx.ts already holds FX.SHAKE_\* and the SHAKE block, so 'no other home' does not hold.
- `BAGNASKIZ` (const) from `src/config.ts:499-519`: **move** · _verified_
  tests/sbrimbrulonActor reads STUN_TIME.
- `BARK` (const) from `src/config.ts:521-528`: **move** · _verified_
  DEVIATION: do NOT split WAVE_SPEED and ANIM_TIME into fx.ts. They are gameplay timing as well as visuals: systems/threats.ts:161 uses ANIM_TIME as the bark's action lock (player.startAction), and :168 times the pug hit as d / BARK.WAVE_SPEED. Moved to an fx preset, a visual tweak would change when the bark lands. Instead config/fx.ts BARK_WAVE imports BARK and aliases SPEED: BARK.WAVE_SPEED and TIME: BARK.ANIM_TIME, so the wave and the hit stay in sync.
  Verifier: Verified at threats.ts:161 (ANIM_TIME as the action lock) and :168 (delay d / WAVE_SPEED), and at gameFx.ts:166 (wave life = RANGE / WAVE_SPEED). Keeping BARK whole and aliasing it from fx.ts is correct.
- `inline: cat startle and leave timings` (inline) from `src/entities/critters.ts:47, 69-70`: **extract-config** as `CRITTERS.CAT {STARTLE: 0.8, LEAVE_FADE: 1.2}` · _verified_
- `inline: cat relax and run-anim factors` (inline) from `src/entities/critters.ts:55, 61`: **extract-config** as `CRITTERS.CAT {RELAX_AT: 1.4, RELAX_SPEED: 0.4, RUN_ANIM: 0.6}` · _verified_
- `inline: cat startle hop` (inline) from `src/entities/critters.ts:67`: **extract-config** as `CRITTERS.CAT {HOP_TIME: 0.3, HOP_PX: 5}` · _verified_
- `inline: ball bounce and fade` (inline) from `src/entities/critters.ts:96, 98-99`: **extract-config** as `CRITTERS.BALL {BOUNCE_RATE: 4, BOUNCE_PX: 6, FADE: 0.8}` · _verified_
- `inline: pug retarget arrival, moving threshold, bump reach` (inline) from `src/entities/critters.ts:156, 163, 201-203, 208`: **extract-config** as `CRITTERS.PUG {RETARGET_ARRIVE: 0.5, MOVING: 0.1, BUMP_REACH: 0.35}` · _verified_
- `inline: pug flee phases` (inline) from `src/entities/critters.ts:176-187`: **extract-config** as `CRITTERS.PUG {HURT_TIME: 0.4, FADE_FROM: 2.2, FADE_TIME: 0.8, GONE_AT: 3}` · _verified_
- `inline: stunned blink rate` (inline) from `src/entities/critters.ts:206`: **extract-config** as `CRITTERS.PUG.STUN_BLINK_HZ (16)` · _verified_
- `inline: 'HIT n/3' rout count` (inline) from `src/fx/gameFx.ts:182`: **extract-config** as `BAGNASKIZ.HITS_TO_FLEE (existing key)` · _verified_
  The rule already lives in BAGNASKIZ.HITS_TO_FLEE = 3 (entities/critters.ts:140), so the text reads that key. The target's THREATS.HITS_TO_ROUT would duplicate it: do not add it.
  Verifier: Verified: BAGNASKIZ.HITS_TO_FLEE = 3 (config 504) is the rule used at critters.ts:140. Do not add THREATS.HITS_TO_ROUT.
- `inline: end notify delay` (inline) from `src/scenes/gameScene.ts:192`: **extract-config** as `EXIT_DELAY (1.1)` · _verified_
- `inline: band arrival slack` (inline) from `src/systems/ambush.ts:72`: **extract-config** as `BAND_RUNTIME.ARRIVE_SLACK (0.5)` · _verified_
- `inline: leave fade span` (inline) from `src/systems/ambush.ts:85`: **extract-config** as `BAND_RUNTIME.LEAVE_FADE (0.55)` · _verified_
- `inline: scare timings` (inline) from `src/systems/ambush.ts:119-123, 188`: **extract-config** as `BAND_RUNTIME.SCARE_MARGIN (0.5), BARK_STAGGER (0.17), FIRST_POOP (0.3), POOP_STAGGER (0.22), FIRST_POOP_JITTER (0.4)` · _verified_
  The 0.5 appears twice (lines 119 and 188), and both uses read the one key.
- `inline: leave flee radius` (inline) from `src/systems/ambush.ts:129`: **extract-config** as `BAND_RUNTIME.FLEE_RADIUS (99)` · _verified_
- `inline: bark emote durations` (inline) from `src/systems/ambush.ts:158, 202`: **extract-config** as `BAND_RUNTIME.RUSH_BARK (0.5), CIRCLE_BARK (0.35)` · _verified_
- `inline: nearby fallback search` (inline) from `src/systems/ambush.ts:178-179`: **extract-config** as `BAND_RUNTIME.NEARBY_TRIES (6), NEARBY_RANGE ([2, 4])` · _verified_
- `inline: circling catch-up factor` (inline) from `src/systems/ambush.ts:198`: **extract-config** as `BAND_RUNTIME.CATCH_UP (1.8)` · _verified_
- `inline: bark and poop interval jitter` (inline) from `src/systems/ambush.ts:201, 208`: **extract-config** as `BAND_RUNTIME.BARK_JITTER ([0.8, 1.2]), POOP_JITTER ([0.85, 1.15])` · _verified_
  These are still passed to this.rng.range(lo, hi) in the same order, so the RNG stream does not change.
- `inline: poop relocation radius` (inline) from `src/systems/ambush.ts:221`: **extract-config** as `BAND_RUNTIME.POOP_SEARCH ([0.3, 1.5])` · _verified_
- `inline: post-squat bark delay` (inline) from `src/systems/ambush.ts:232`: **extract-config** as `BAND_RUNTIME.SQUAT_BARK_DELAY (0.05)` · _verified_
- `BAND_BODY` (const) from `src/systems/ambushEntry.ts:17`: **move** as `BAND_BODY` · _verified_
  It is the default for standsAt's `r` parameter. It sits next to AMBUSH.RUN_BODY.
- `inline: clear-run sampling step` (inline) from `src/systems/ambushEntry.ts:29`: **extract-config** as `AMBUSH.ENTRY_SAMPLE` · _corrected by verifier_
  Before the correction: newName `BAND_RUNTIME.RUN_SAMPLE (0.25)`.
  Verifier: BAND_RUNTIME is defined by the target as the ambush.ts runtime block (72-232). ambushEntry already reads AMBUSH.RUN_BODY, ENTRY_MARGIN, ENTRY_ANGLES, ENTRY_STEPS and ENTRY_MIN_PX, so the clear-run sampling step (0.25) belongs beside them in AMBUSH.
- `inline: inside-view fallback step` (inline) from `src/systems/ambushEntry.ts:60`: **extract-config** as `AMBUSH.ENTRY_INSIDE_STEP_PX` · _corrected by verifier_
  Before the correction: newName `BAND_RUNTIME.INSIDE_STEP_PX (8)`.
  Verifier: The 8 px step bounds the same loop as AMBUSH.ENTRY_MIN_PX (`d >= AMBUSH.ENTRY_MIN_PX; d -= 8`), so keep the two together in AMBUSH, not in BAND_RUNTIME.
- `inline: first voice delay` (inline) from `src/systems/ambushLogic.ts:97`: **extract-config** as `AMBUSH.FIRST_VOICE` · _corrected by verifier_
  Before the correction: newName `BAND_RUNTIME.FIRST_VOICE (0.4)`.
  Verifier: AmbushDirector (ambushLogic) already reads AMBUSH.VOICE_EVERY and VOICE_JITTER for the later voices. The first-voice delay (0.4) belongs with them, not in BAND_RUNTIME, which covers the ambush.ts runtime.
- `inline: digestion overflow cap` (inline) from `src/systems/needs.ts:50`: **extract-config** as `DIGESTION.OVERFLOW_FACTOR (2)` · _verified_
  Used as DIGESTION.MAX \* DIGESTION.OVERFLOW_FACTOR, the same product.
- `inline: trail spacing offsets` (inline) from `src/systems/placement.ts:39-41`: **extract-config** as `PLACEMENT.TRAIL {END_SKIP: 4, START_SKIP: 3, STOP: 1}` · _verified_
- `inline: candidate pool and attempts` (inline) from `src/systems/placement.ts:45, 48`: **extract-config** as `PLACEMENT.CANDIDATES (28), ATTEMPTS (8)` · _verified_
- `inline: in-tile jitter` (inline) from `src/systems/placement.ts:53-54, 189-190`: **extract-config** as `PLACEMENT.JITTER ([0.35, 0.65])` · _verified_
  Passed to rng.range(lo, hi). The draw order is unchanged.
- `inline: start clearance (path mode)` (inline) from `src/systems/placement.ts:56`: **extract-config** as `PLACEMENT.START_CLEAR (2)` · _verified_
- `inline: tile-edge inset` (inline) from `src/systems/placement.ts:155-156`: **extract-config** as `PLACEMENT.EDGE_INSET ([0.3, 0.7])` · _verified_
- `inline: random spot attempt limit` (inline) from `src/systems/placement.ts:209`: **extract-config** as `PLACEMENT.SPOT_ATTEMPTS (40)` · _verified_
  It moves with randomSpotNear into systems/world/map, which reads config/greenZone (L0, legal).
  Verifier: Acceptable: every caller of randomSpotNear is a Green Zone system, so systems/world/map reading config/greenZone is legal (L0) and matches the domain.
- `inline: exit reach radius` (inline) from `src/systems/rules.ts:139`: **extract-config** as `RULES.EXIT_REACH (0.8)` · _verified_
- `inline: hold-forever action duration` (inline) from `src/systems/rules.ts:141, 243`: **extract-config** as `RULES.END_HOLD (999)` · _verified_
- `inline: poop drop offset` (inline) from `src/systems/rules.ts:192`: **extract-config** as `RULES.POOP_OFFSET (0.15)` · _verified_
- `inline: eat and hurt action durations` (inline) from `src/systems/rules.ts:228, 249`: **extract-config** as `RULES.EAT (0.3), RULES.HURT (0.6)` · _verified_
- `inline: star scale and half-star steps` (inline) from `src/systems/scoring.ts:6, 8`: **extract-config** as `STAR_MAX (5), STAR_STEPS (2)` · _verified_
  Keep the expression Math.floor(raw \* STAR_STEPS + 1e-6) / STAR_STEPS. The 1e-6 epsilon stays inline (an algorithm constant).
- `inline: magnet falloff exponent` (inline) from `src/systems/threatLogic.ts:37`: **extract-config** as `BALL.MAGNET_FALLOFF (0.6)` · _verified_
  It sits next to BALL.MAGNET_RADIUS and MAGNET_STRENGTH, which magnetPull already receives.
- `inline: pug bump knockback and flinch` (inline) from `src/systems/threats.ts:145-146`: **extract-config** as `THREATS.PUG_KNOCK (6), THREATS.PUG_HURT (0.35)` · _verified_
- `inline: cat startle cone multiplier` (inline) from `src/systems/threats.ts:171`: **extract-config** as `THREATS.CAT_STARTLE_CONE (1.3)` · _verified_
  Applied as BARK.RANGE \* k and BARK.HALF_ANGLE \* k, the same products.
- `inline: spawn-ahead tolerances and wave spacing` (inline) from `src/systems/threats.ts:182, 235`: **extract-config** as `THREATS.AHEAD_SLACK (1), WAVE_AHEAD_SLACK (2), WAVE_SPACING (1.4)` · _verified_
- `inline: pug spawn ring width` (inline) from `src/systems/threats.ts:215`: **extract-config** as `THREATS.PUG_SPAWN_SPAN` · _added by verifier_
  `BAGNASKIZ.SPAWN_DISTANCE - 2`: the inner radius of the first spawn search is an inline 2 that entry 166 (line 216) leaves out. Keep it as SPAWN_DISTANCE - PUG_SPAWN_SPAN, the same subtraction, so the rng.range bounds are unchanged.
- `inline: pug fallback spawn ring` (inline) from `src/systems/threats.ts:216`: **extract-config** as `THREATS.PUG_FALLBACK ([3, 6])` · _verified_
- `inline: green-target search` (inline) from `src/systems/threats.ts:259-266`: **extract-config** as `THREATS.GREEN_TARGET {SAMPLES: 14, RANGE: [1, 6], CLEAN_RADIUS: 1.6, DIST_WEIGHT: 0.15}` · _verified_
  Read by systems/greenZone/critterAi pickGreenTarget.
- `inline: five star sprites` (inline) from `src/ui/hud.ts:74`: **extract-config** as `STAR_MAX (the planned key from scoring 6)` · _added by verifier_
  The HUD hardcodes 5 stars, the scoring maximum.
- `inline: three pee-charge droplets and the maxCharges default` (inline) from `src/ui/touchControls.ts:93, 127`: **extract-config** as `BLADDER.MAX_CHARGES (existing key)` · _added by verifier_
  The constructor creates exactly 3 drop sprites, and maxCharges defaults to 3. setPeeCharges hides drops with k >= max but can never show more than 3. Both are BLADDER.MAX_CHARGES (config 341), a gameplay number duplicated in the view.
- `inline: pollution stamp falloff` (inline) from `src/world/map.ts:241`: **extract-config** as `POLLUTION.STAMP_FALLOFF (0.55)` · _verified_

#### `src/config/story.ts`

Story engine tuning: walks and steps.

Plan: STORY's walk and engine blocks (PICKUP_RADIUS..BUSH_HIDE, PACE..SMOKE, BUMP, LEAD, SHOULDER, HEAR_EVERY, RUMOUR); WALK (walk 147-511: sight step 0.25, cone min 0.8, checkpoint 1.2, pace 0.2/0.3, scramble angles, mirage direction, flame fps 8); VISOR (the ch1 68-81 / ch2 47-61 duplicate plus the STORY.VISOR rates); STEPS {MOVE_SPEED 2.4, ARRIVE 0.2, TIMEOUT 8, EMOTE 0.5} (steps 270-350); FOLLOW and LULL defaults (helpers 17-21, 107, 182); MAP_QUERY_RADIUS 6 (helpers 275).

Entries (18):

- `inline: visor bow, stillness threshold, hint delay` (inline) from `src/campaign/chapters/ch1.ts:68, 74, 81`: **extract-config** as `VISOR.BOW = 0.8, VISOR.STILL_SPEED = 0.2, VISOR.HINT_AFTER = 0.6 (added to STORY.VISOR's rates)` · _not verified_
  Read by story/walk/objectives/visor.ts, not by the script.
- `inline: visor bow and stillness threshold (duplicate of ch1)` (inline) from `src/campaign/chapters/ch2.ts:47, 53`: **extract-config** as `VISOR.BOW, VISOR.STILL_SPEED` · _not verified_
  Same keys as ch1. The duplicate goes away with the visor objective.
- `inline: patrol and wander default speed and pause` (inline) from `src/campaign/chapters/helpers.ts:17, 21`: **extract-config** as `STORY.PATROL { SPEED: 1.4, PAUSE: 0.8 }, STORY.WANDER { SPEED: 1 }` · _not verified_
  Part of the target's 'FOLLOW and LULL defaults (helpers 17-21, 107, 182)'. Values unchanged.
- `inline: bark animation length` (inline) from `src/campaign/chapters/helpers.ts:37`: **extract-config** as `STEPS.BARK_ANIM = 0.3` · _not verified_
  Also read by story/combat's bark (combat.ts:166). It has the same value as the Green Zone BARK.ANIM_TIME (going to config/fx BARK_WAVE) but stays a separate key: not merged silently.
- `inline: leader waypoint arrival radius` (inline) from `src/campaign/chapters/helpers.ts:107`: **extract-config** as `STORY.LEAD.WAYPOINT = 0.5` · _not verified_
  Added to the existing LEAD block (WAIT_DISTANCE, SPEED, ARRIVE).
- `inline: first lull phase factor` (inline) from `src/campaign/chapters/helpers.ts:182`: **extract-config** as `STORY.LULL.FIRST_TALK = 0.6` · _not verified_
- `inline: walkableNear search radius` (inline) from `src/campaign/chapters/helpers.ts:275`: **extract-config** as `MAP_QUERY_RADIUS = 6` · _not verified_
- `STORY` (const) from `src/config.ts:572-691`: **move** · _verified_
  STORY keeps its name in story.ts and keeps PICKUP_RADIUS, GOAL_RADIUS, ALERT_GAIN, ALERT_DECAY, HOSTILE_TOUCH, BUSH_HIDE, PACE, THIRST, SCRAMBLE, FIRE, LEAD, BUMP, LULL, SHOULDER, SMOKE and HEAR_EVERY. tests/blockGap reads STORY.BUMP.EVERY, which is unchanged. The other keys split out as the entries below show, each in the commit that moves its reader.
- `STORY.VISOR` (const) from `src/config.ts:629-630`: **split** as `VISOR` · _verified_
  Merged with the ch1 68-81 and ch2 47-61 duplicates. Readers ch1:58 and :72 and ch2:51 become story/walk/objectives/visor.
- `inline: scripted move defaults` from `src/story/steps.ts:270, 289, 300, 306`: **extract-config** as `STEPS { MOVE_SPEED: 2.4, ARRIVE: 0.2, TIMEOUT: 8 }` · _not verified_
- `inline: player emote duration` from `src/story/steps.ts:350`: **extract-config** as `STEPS.EMOTE 0.5` · _not verified_
- `inline: sight sampling` (inline) from `src/story/walk.ts:147, 155, 168`: **extract-config** as `WALK.SIGHT {STEP 0.25, BUSH_TAIL 2, CONE_MIN 0.8}` · _not verified_
- `inline: walk defaults` (inline) from `src/story/walk.ts:183, 431, 455`: **extract-config** as `WALK.{FORWARD {x 0, y -1}, MIRAGE_DIR {x -1, y -1}, SCRAMBLE_ANGLES [PI/2, PI, -PI/2, 0.75*PI]}` · _not verified_
  Keep the angle order: a Math.random index picks from it.
- `inline: walk card timings` (inline) from `src/story/walk.ts:307, 359, 416, 471`: **extract-config** as `WALK.CARD {PICKUP 3.2, PICKUP_DIM 0.35, CAUGHT 1.6, LINE_BROKE 2.2, FIRE 2}` · _not verified_
  The card strings stay inline as engine copy.
- `inline: checkpoint radius and pace speeds` (inline) from `src/story/walk.ts:313, 386, 393`: **extract-config** as `WALK.CHECKPOINT 1.2, WALK.PACE_SPEED {MOVING 0.2, TURNING 0.3}` · _not verified_
- `inline: sight cone numbers` (inline) from `src/story/walk.ts:371-377`: **extract-config** as `WALK.CONE {SEGMENTS 10, ALERT_AT 0.05, ALPHA 0.12, ALPHA_ALERT 0.25}` · _not verified_
- `inline: flame animation` (inline) from `src/story/walk.ts:492, 510-511`: **extract-config** as `WALK.FLAME {FPS 8, DROP 4}` · _not verified_
  The frame count 3 is read from SPRITES.flame (manifest), not config.
- `inline: goal, spot and mirage geometry` (inline) from `src/story/walk.ts:524-547`: **extract-config** as `WALK.MARKERS {MIRAGE {RX 40, RY 16, ALPHA 0.35, AMP 0.1, HZ 3, GLINT {DX -6, DY -3, RX 18, RY 5, ALPHA 0.4}}, SPOT {R 7, AMP 1.5, HZ 5, ASPECT [1.6, 0.8], INNER [0.9, 0.45], ALPHA 0.85, FILL 0.18}, GOAL {R 10, AMP 2, HZ 5, ALPHA 0.9}}` · _not verified_

#### `src/config/combat.ts`

Fight rules and fight marker geometry.

Plan: COMBAT minus PILOT (config 699-749); COMBAT_RULES {AIM_ASSIST 0.6, LUNGE 0.25, ROUT_FLEE 3.2, SHIELD_FACE 2.6, POINT_BLANK 0.3, BARK_TOUCH 0.35} (story/combat 190-265, systems/combat 22/34, threatLogic 24); COMBAT_VIEW sizes (combat 339-392).

Entries (10):

- `COMBAT` (const) from `src/config.ts:699-752`: **move** · _verified_
  tests/combat reads SWORD, BARK, SHIELD and FOE keys, all unchanged. SWORD.ACTION_TIME (view timing, read at story/combat.ts:339) stays, because the plan does not split it.
- `inline: bark pose and hurt emote` (inline) from `src/story/combat.ts:166, 240`: **extract-config** as `COMBAT_RULES.BARK_POSE 0.3, COMBAT_VIEW.HURT_EMOTE 0.3` · _not verified_
- `inline: aim assist and lunge` (inline) from `src/story/combat.ts:190, 192`: **extract-config** as `COMBAT_RULES.AIM_ASSIST 0.6, COMBAT_RULES.LUNGE 0.25` · _not verified_
- `inline: routed foe flee` (inline) from `src/story/combat.ts:247`: **extract-config** as `COMBAT_RULES.ROUT_FLEE {SPEED 3.2, RADIUS 99}` · _not verified_
- `inline: shield auto-face range` (inline) from `src/story/combat.ts:265`: **extract-config** as `COMBAT_RULES.SHIELD_FACE 2.6` · _not verified_
- `inline: knocked-down card duration` (inline) from `src/story/combat.ts:320`: **extract-config** as `COMBAT_VIEW.KNOCKED_CARD 1.8` · _not verified_
- `inline: fight marker geometry` (inline) from `src/story/combat.ts:339-392`: **extract-config** as `COMBAT_VIEW {SWORD_ARC {FADE 1.6, START -1.1, SWEEP 2.2, RAMP 2.2, RAMP_MIN 0.25, LIFT 10, SEGMENTS 10, R 14, BULGE 11, INNER 13, SQUASH 0.75, ALPHA 0.75}, BARK_RING {FADE 2.5, PX_PER_TILE 22, ASPECT 0.5, WIDTH 2}, SHIELD {AHEAD 0.42, LIFT 14, POLY [...]}, RINGS {WINDUP [13, 6.5], STUN [11, 5.5]}, PIPS {W 4, H 2, STEP 5, HALF 2.5, LIFT 40}}` · _not verified_
- `inline: initial foe cooldown fraction` (inline) from `src/systems/combat.ts:22`: **extract-config** as `COMBAT_RULES.FIRST_COOLDOWN (0.5)` · _verified_
  Used as COMBAT.FOE.COOLDOWN \* COMBAT_RULES.FIRST_COOLDOWN, the same product.
- `inline: point-blank radius` (inline) from `src/systems/combat.ts:34`: **extract-config** as `COMBAT_RULES.POINT_BLANK (0.3)` · _verified_
  It moves with inArc into the systems/motion/cone wrapper.
- `inline: bark touch radius` (inline) from `src/systems/threatLogic.ts:24`: **extract-config** as `COMBAT_RULES.BARK_TOUCH (0.35)` · _verified_
  The target lists threatLogic 24 under both COMBAT_RULES and FLEE_AI. It belongs to the cone test, so COMBAT_RULES. It moves with inBarkCone into the motion/cone wrapper.

#### `src/config/minigames.ts`

Mini-game rules and layouts.

Plan: STORY.RHYTHM, WEEPING, PARADE, LADDERS, TUG, each moved here when its game is split; MINI layouts: LADDERS (action 49-221), TUG (293-308), BOAT (365-385), RHYTHM (rhythm 77-192), WORDS (words 134-365).

Entries (11):

- `STORY.RHYTHM+WEEPING+PARADE+LADDERS+TUG` (const) from `src/config.ts:609-628`: **split** as `RHYTHM, WEEPING, PARADE, LADDERS, TUG` · _verified_
  Readers: rhythm.ts (32, 89, 135, 202, 208, 222) and action.ts (107-155, 290). Each block moves when its game is split. WEEPING and PARADE are also read by the presets in content/minigames/rhythmPresets (a legal L8 to L0 edge).
- `STORY.BOAT` (const) from `src/config.ts:643-644`: **split** as `BOAT (beside MINI.BOAT)` · _verified_
  DEVIATION: the plan's 'PACE..SMOKE' range would leave it in story.ts, but its only readers are BoatGame (action.ts:347, :391), which moves to story/minigames/boat/boatGame.
- `STORY.RUMOUR` (const) from `src/config.ts:661`: **split** as `RUMOUR_GAME (or MINI.RUMOUR)` · _corrected by verifier_
  DEVIATION: the plan lists it in story.ts, but its only reader is RumourGame (words.ts:339), which moves to story/minigames/words/rumourGame. HEAR_EVERY (helpers 252, a walk rule) does stay in STORY.
  Before the correction: newName `RUMOUR`.
  Verifier: Name clash: words.ts:275 has a local `const RUMOUR = [...]` (the rumour text), which the plan moves to content/minigames/rumour.ts as RUMOUR. A top-level config RUMOUR would give two different exported RUMOURs, and ch6 (which passes the text in and imports config for CAMPAIGN) is one import away from a conflict. The reader is unchanged: words.ts:339.
- `inline: ladders rules` (inline) from `src/story/minigames/action.ts:49, 68, 99-104, 121-122, 132, 140, 152-153`: **extract-config** as `LADDERS.{FIRST_SPAWN 1, LANES 3, AXEMEN 2, SPAWN_JITTER [0.7, 0.6], SPAWN_Y -20, HIT_LIFT 14, HIT_BOX 12, DESPAWN 20, AXE_LIFT 4, AXE_REACH 2}; MINI.LADDERS.TAP_SIDE 0.3` · _not verified_
  STORY.LADDERS moves here in the same commit.
- `inline: ladders layout and wall geometry` (inline) from `src/story/minigames/action.ts:78, 83-85, 170-221`: **extract-config** as `MINI.LADDERS {LANE_X0 0.25, LANE_DX 0.25, RUNG_PX 22, BASE_UP 70, SCROLL_AFTER 6, WALL {ROW 10, BRICK 20, PARAPET 30/26, MERLON {EVERY 24, W 14, H 12, UP 40}}, RAIL {OFF 10, W 2}, WARN {W 12, H 3, HZ 10}, STONE_R 6, PITCH [5, 9], HERO {RUNGS_PER_CYCLE 4, FALLBACK_FRAMES 4, FLASH_HZ 12, FLASH_ALPHA 0.4}, INFO {INSET 16, UP 28, FRAME [4, 32, 8, 22]}}` · _not verified_
  The tone hash (\*7, &3) stays inline as a drawing algorithm.
- `inline: tug clamp and boat swamp and bob` (inline) from `src/story/minigames/action.ts:293, 365-367, 372`: **extract-config** as `TUG.POS_MIN -0.3; BOAT.{SWAMP_LOSS 0.5, SWAMP_LOCK 1.2, SWAMP_SHAKE 4, BOB_AMP 1.5, BOB_RATE 2}` · _not verified_
  STORY.BOAT moves to config/minigames too. The target list (RHYTHM, WEEPING, PARADE, LADDERS, TUG) leaves it out.
- `inline: tug and boat layout` (inline) from `src/story/minigames/action.ts:297-308, 376-385`: **extract-config** as `MINI.TUG {BAND 40, HOLE {INSET 20, W 26, H 50}, FRIEND_DY 10, HERO {DX -34, DY 12}, ROPE [24, 2], BAR {X 20, DY 40, H 6}, LABEL_UP 52}; MINI.BOAT {X 30, H 8, PROGRESS_UP 118, WATER_UP 100, LABEL_UP 136, ALMOST 0.75}` · _not verified_
- `inline: rhythm layout` (inline) from `src/story/minigames/rhythm.ts:67, 77-84, 134, 149, 169-173, 192`: **extract-config** as `MINI.RHYTHM {TEARS 14, DIM 0.35, BOX {X 6, UP 120, H 100, ALPHA 0.6}, TITLE_Y 74, SCORE_UP 114, STATUS_UP 140, BUTTONS {X [0.28, 0.72], UP 40}, TEAR_GRID {X0 14, DX 37, Y0 100, DY 53, SPAN 120}, LINE_UP 70, TAP_UP 120, CUE_TOP 90, TARGET {SIZE 24, PULSE 3, WITHIN 0.08}, TEAR_FALL 20, TITLE_GLOW 0.3}` · _not verified_
- `inline: feedback and end timing` (inline) from `src/story/minigames/rhythm.ts:128, 159, 194`: **extract-config** as `RHYTHM.{FEEDBACK 0.6, EARLY_FEEDBACK 0.4, END_AFTER 0.8}` · _not verified_
  STORY.RHYTHM, PARADE, WEEPING and WEEP_HIT move to config/minigames in the same commit.
- `inline: word button geometry` (inline) from `src/story/minigames/words.ts:134-135, 143`: **extract-config** as `MINI.WORDS.BUTTON {LABEL_INSET 8, MIN_H 16, PAD 8, FILL_ALPHA 0.6, LETTER_FILL_ALPHA 0.65}` · _not verified_
- `inline: letter and rumour layout` (inline) from `src/story/minigames/words.ts:200-214, 245, 253-260, 318-322, 359-365`: **extract-config** as `MINI.WORDS {PAPER {X 8, Y 76, LETTER_H 116, RUMOUR_H 136}, TEXT {X 16, Y 84, INSET 32}, LETTER {LABEL_INSET 40, X 16, INSET 32, PAD 8, WRITE_Y 200, ANSWER_Y 320, GAP 4, SEND_GAP 6, ANSWER_TEXT_Y 200}, RUMOUR {X 10, INSET 20, Y 220, GAP 4, HEAD_Y 74, HEAD_INSET 16}}` · _not verified_

#### `src/config/campaign.ts`

Campaign meter rules numbers.

Plan: CAMPAIGN {COMMOZIONE_FADE, GRACE, STANDING, COST} (from STORY 663-674); METER_START, METER_MAX (campaign/state 72-79); DREAM_CHAPTERS {FROM 2, TO 7} (state 193).

Entries (5):

- `METER_START` (const) from `src/campaign/state.ts:72-77`: **move** as `METER_START` · _verified_
  Becomes Object.freeze({commozione: 20, supervillain: 10, grace: 70, standing: 50} as const), dropping the Readonly&lt;Record&lt;MeterKey, number>> annotation because config imports no types. It is checked with `satisfies Record<MeterKey, number>` in systems/campaign/rules newCampaign. tests/campaign.test.ts imports it from '../src/config'.
  Verifier: newCampaign's `{ ...METER_START }` assigned to Record&lt;MeterKey, number> compiles with the as-const literal, because readonly properties are assignable to mutable ones.
- `METER_MAX` (const) from `src/campaign/state.ts:79`: **move** as `METER_MAX` · _verified_
  Read by applyEffects and unshakeable (systems/campaign/rules) and by tests/campaign.test.ts, whose import path becomes '../src/config'.
- `inline: dream chapter range for the Commozione fade` (inline) from `src/campaign/state.ts:193`: **extract-config** as `DREAM_CHAPTERS {FROM: 2, TO: 7}` · _verified_
- `STORY.COMMOZIONE_FADE+WEEP_HIT+COST+STANDING+GRACE` (const) from `src/config.ts:662-674`: **split** as `CAMPAIGN.{COMMOZIONE_FADE, WEEP_HIT, COST, STANDING, GRACE}` · _verified_
  WEEP_HIT (665) sits inside the plan's 663-674 range: it is a Commozione amount, read at rhythm.ts:123. Readers to update in the same commit: campaign/state (195, 203, 219, 221), ch5:64, ch6:67, ch7:477-478, rhythm:123, and tests/campaign.test lines 59-60, 71, 79 and 81 (STORY.X becomes CAMPAIGN.X).
- `inline: meter maximum` (inline) from `src/scenes/couchScene.ts:143`: **extract-config** as `METER_MAX (100)` · _verified_
  Already defined in campaign/state 72-79. Reuse it here instead of the literal 100.
  Verifier: Verified: METER_MAX = 100 is a single number (campaign/state.ts:79), not a per-meter record, so it drops straight into line 143.

#### `src/config/art.ts`

Numbers for texture building and rasterizing.

Plan: ATLAS {SIZE 1024, PAD 1} (core/assets 41-42); LEVEL_ATLASES_KEPT 2 (build 200); FONT {FAMILY, SIZE 8, FIRST 32, LAST 126, CELL 16, BASELINE 12} (pixelFont 8-62); ALPHA_CUT 110 (pixelFont 70/96, titleAnim 45, titleArt 68); PORTRAIT_PROBE 256 (titleAnim 47); TINT_CACHE_MAX 2000 (pixelText 69).

Entries (15):

- `inline: palette atlases kept before eviction` from `src/assets/build.ts:200`: **extract-config** as `LEVEL_ATLASES_KEPT` · _not verified_
  Value 2 (target config/art).
- `ATLAS_SIZE` (const) from `src/core/assets.ts:41`: **extract-config** as `ATLAS.SIZE` · _verified_
  1024: the page width and maximum height.
- `PAD` (const) from `src/core/assets.ts:42`: **extract-config** as `ATLAS.PAD` · _verified_
  The 1 px gutter.
- `FONT_FAMILY` (const) from `src/ui/pixelFont.ts:8`: **move** as `FONT.FAMILY 'PressStart2P'` · _verified_
  Exported but used only inside pixelFont.ts (grep), so the export goes.
- `SIZE` (const) from `src/ui/pixelFont.ts:9`: **move** as `FONT.SIZE 8` · _verified_
- `FIRST` (const) from `src/ui/pixelFont.ts:10`: **move** as `FONT.FIRST 32` · _verified_
- `LAST` (const) from `src/ui/pixelFont.ts:11`: **move** as `FONT.LAST 126` · _verified_
- `inline: raster cell, baseline and x offset` (inline) from `src/ui/pixelFont.ts:52-54, 62`: **extract-config** as `FONT { CELL 16, BASELINE 12, X_OFFSET 4 }` · _verified_
  Verifier: The x offset 4 also appears at line 92 (`k * cw + 4 + x`), so both sites must use FONT.X_OFFSET.
- `inline: 1-bit alpha threshold` (inline) from `src/ui/pixelFont.ts:70, 96`: **extract-config** as `ALPHA_CUT 110` · _verified_
  The same value as titleAnim ALPHA_CUT and titleArt line 68: one constant for all three.
- `inline: fallback glyph box` (inline) from `src/ui/pixelFont.ts:77-78`: **extract-config** as `FONT.FALLBACK { TOP 4, BOTTOM 12 }` · _verified_
  The '?' char code 63 (136) stays inline.
- `inline: tint cache cap` (inline) from `src/ui/pixelText.ts:69`: **extract-config** as `TINT_CACHE_MAX 2000` · _verified_
- `ALPHA_CUT` (const) from `src/ui/titleAnim.ts:45`: **move** as `ALPHA_CUT 110` · _verified_
  Shared with pixelFont 70/96 and titleArt 68.
- `PROBE_WIDTH` (const) from `src/ui/titleAnim.ts:47`: **move** as `PORTRAIT_PROBE 256` · _verified_
- `inline: frame durations` (inline) from `src/ui/titleAnim.ts:82, 176, 198`: **extract-config** as `PORTRAIT_TIMING { FRAME 0.1, STILL 1, MIN 0.02, DEFAULT_US 100000 }` · _verified_
  TitlePlayer (ui) reads FRAME; the decoder reads the rest.
- `inline: alpha threshold` (inline) from `src/ui/titleArt.ts:68`: **extract-config** as `ALPHA_CUT 110` · _verified_

#### `src/config/debug.ts`

Autopilot and debug tuning, kept apart from gameplay.

Plan: PILOT = STORY.PILOT + COMBAT.PILOT; AUTOPILOT {DEFAULT_POLICY values (autopilot 26), SEED 12345, ARRIVE 0.35, WAYPOINT 0.45, scramble reaction delay (152)}; engine pilot margins (walk 573-643, action 234-243, rhythm 96-98, words 266-374); URL {LEVEL 1, skill/ending/choice clamps} (main 50-71); SPRITE_VIEWER layout (spriteViewerScene 15-20).

Entries (15):

- `inline: autopilot follow offsets` (inline) from `src/campaign/chapters/helpers.ts:89`: **extract-config** as `PILOT.FOLLOW { TRAIL: 1.1, HOLD: 1.6 }` · _not verified_
- `inline: autopilot lull margins` (inline) from `src/campaign/chapters/helpers.ts:204`: **extract-config** as `PILOT.LULL { HOLD_MARGIN: 0.6, ACT_MARGIN: 0.4 }` · _not verified_
- `STORY.PILOT` (const) from `src/config.ts:675-690`: **split** as `PILOT (WALK_MAG..DANGER, plus PILOT.FIGHT from COMBAT.PILOT)` · _verified_
  Readers: steps 55, 161 and 198, walk 597, autopilot 170-197, action 233, 243 and 317. WALK_MAG 0.7 and RUN_MAG 1 equal the plan's SCRIPTED_WALK {INTENT 0.7, RUN 1} only by value (the autopilot's stick versus the move() step's). Do not merge them.
- `COMBAT.PILOT` (const) from `src/config.ts:750-751`: **split** as `PILOT.FIGHT {STRIKE_EVERY, CLOSE, GUARD_REACT}` · _verified_
  Read at walk.ts:610, :639 and :646, which move to story/pilot/walkPilot.
- `inline: default ?level` (inline) from `src/main.ts:50`: **extract-config** as `DEBUG_URL.LEVEL` · _corrected by verifier_
  Before the correction: newName `URL.LEVEL (1)`.
  Verifier: Do not name the export URL: it shadows the DOM global URL constructor in any module that imports it, and core/assets/environment already uses `new URL(...)` (environment.ts:227, :268).
- `inline: viewer layout` (inline) from `src/scenes/spriteViewerScene.ts:15-17, 20, 71, 73`: **extract-config** as `SPRITE_VIEWER { MARGIN 2, LABEL_W 44, TOP 28, CELL_PAD_X 4, CELL_PAD_Y 2, MIN_SCALE 0.01, HEADING_PAD 2, HEADING_Y 16 }` · _verified_
  Values unchanged, so the spriteViewerLayout test still passes.
- `inline: default policy values` (inline) from `src/story/autopilot.ts:26`: **extract-config** as `AUTOPILOT.DEFAULT_POLICY {CHOICE: 'first', SKILL: 0.7, ENDING: 'knight'}` · _not verified_
- `inline: default seed` (inline) from `src/story/autopilot.ts:69`: **extract-config** as `AUTOPILOT.SEED 12345` · _not verified_
  The seed-mixing constants (0x9e3779b9, 2654435761, 0x5bd1e995) and the 8 warm-up draws stay inline: they are algorithm constants, like the xorshift itself.
- `inline: scramble reaction delay` (inline) from `src/story/autopilot.ts:152`: **extract-config** as `AUTOPILOT.SCRAMBLE_REACT {BASE: 0.5, CLUMSY: 1.2}` · _not verified_
- `inline: arrive and waypoint radii` (inline) from `src/story/autopilot.ts:168, 207`: **extract-config** as `AUTOPILOT.ARRIVE 0.35, AUTOPILOT.WAYPOINT 0.45` · _not verified_
- `inline: ladders and boat autopilot` (inline) from `src/story/minigames/action.ts:234, 240, 243, 391-392`: **extract-config** as `PILOT.LADDERS {AXE_LOOKAHEAD 3, MOVE 0.12, MOVE_CLUMSY 0.25, TAP_BASE 0.6}; PILOT.BOAT {GAP 1.05, GAP_SKILL 0.4, EAGER 0.08, EAGER_GAP 0.6}` · _not verified_
  STORY.PILOT.LADDER_TAPS, LADDER_LOOKAHEAD and TUG_TAPS move to config/debug PILOT with the block. The p.random() call in the boat pilot (392) stays: it consumes the seeded autopilot RNG.
- `inline: rhythm autopilot` (inline) from `src/story/minigames/rhythm.ts:96-98`: **extract-config** as `PILOT.RHYTHM {SIGMA 0.025, SIGMA_CLUMSY 0.12, RIGHT 0.7, RIGHT_SKILL 0.3}` · _not verified_
- `inline: word games autopilot` (inline) from `src/story/minigames/words.ts:266, 371, 374`: **extract-config** as `PILOT.WORDS {LETTER_TICK 0.8, RUMOUR_TICK 0.9, RUMOUR_SKILL 0.4, WRONG 0.75, WRONG_SKILL 0.25}` · _not verified_
- `inline: autopilot ask tick and card wait` from `src/story/steps.ts:164, 198`: **extract-config** as `PILOT.ASK_EVERY 0.4, PILOT.CARD_AFTER 0.45` · _not verified_
  They sit next to PILOT.CONFIRM_EVERY, which is used at 55/161/198. Values are unchanged, so playtest reports do not drift.
- `inline: walk autopilot` (inline) from `src/story/walk.ts:573, 591, 610, 640, 643`: **extract-config** as `PILOT.WALK {ACT_EVERY 0.35, HOLD 0.6, ARRIVE_HOLD 0.5, ARRIVE 0.3, GUARD_MARGIN 0.4, SWORD_REACH 0.9, BARK_REACH 0.8}` · _not verified_
  STORY.PILOT.DANGER and COMBAT.PILOT move to config/debug PILOT with their blocks.

### Core (requested): 95 files, 424 entries

#### `src/core/math/projection.ts`

Pure iso maths shared by every layer.

Plan: TW, TH, HALF_W, HALF_H, Vec2, gridToScreen, new gridToScreenInto(out), screenToGrid, screenDirToGrid, gridVecToScreen, new gridDeltaToStick (the inline maths at steps.move 282-302 and autopilot.stick 141-142), Dir8, DIRS_BY_ANGLE, DIRS8, DIR_VECTORS, dirFromScreenVector, dirFromGridVector, dirToScreenVector, dirToGridVector, mirrorDir, depthKey, insideDiamond (iso/projection). tileCenterScreen dropped (unused).

Entries (23):

- `inline: iso half-tile 16 and 8` (inline) from `src/fx/gameFx.ts:334-335`: **extract-config** as `HALF_W / HALF_H (derived from config ISO)` · _verified_
  This is not a new config key: it reuses the projection constants.
- `TW` (const) from `src/iso/projection.ts:14`: **move** · _verified_
  About 25 src files and 3 tests (projection, tileArt, ambush) import iso/projection. Leave `export * from '../core/math/projection'` at src/iso/projection.ts until the last importer moves. Pure L1: it imports only config ISO.
- `TH` (const) from `src/iso/projection.ts:15`: **move** · _verified_
- `HALF_W` (const) from `src/iso/projection.ts:16`: **move** as `export const HALF_W` · _corrected by verifier_
  Now exported: it replaces the inline 16 at world.ts:101, gameScene.ts:251, gameFx.ts:334, autopilot.ts:141 and steps.ts:282-302.
  Verifier: The site list is partly wrong. The literal 16/8 pairs are at world.ts:101-102, gameScene.ts:255 (drawMagnetFields, not 251) and gameFx.ts:334-335. autopilot.ts:141-142 and steps.ts:294-297 use no 16: they use the 2:1 ratio (dx - dy, (dx + dy) / 2), which is what the new gridDeltaToStick replaces, not HALF_W.
- `HALF_H` (const) from `src/iso/projection.ts:17`: **move** as `export const HALF_H` · _verified_
  Now exported: it replaces the inline 8 at world.ts:102 and the same sites as HALF_W.
- `Vec2` (interface) from `src/iso/projection.ts:19-22`: **move** · _verified_
- `gridToScreen` (function) from `src/iso/projection.ts:24-26`: **move** · _verified_
  Kept for callers that need a fresh object. Add gridToScreenInto(gx, gy, out) for Entity.render and the World passes (audit entity.ts:51, world.ts:167-181), and gridDeltaToStick(dgx, dgy, out) for steps.move and autopilot.stick.
- `screenToGrid` (function) from `src/iso/projection.ts:28-30`: **move** · _verified_
  Used by systems/ambush and ambushEntry (L3 to L1, allowed).
- `screenDirToGrid` (function) from `src/iso/projection.ts:41-48`: **move** · _verified_
  The player input path (stepPlayerMotion) and dirToGridVector.
- `gridVecToScreen` (function) from `src/iso/projection.ts:51-53`: **move** · _verified_
  tests/ambush.test.ts:7 imports it from '../src/iso/projection'.
- `Dir8` (type) from `src/iso/projection.ts:56`: **move** · _verified_
  Part of the texture-name contract; core/assets/manifest (L2) imports this type (L1), which is legal.
- `DIRS_BY_ANGLE` (const) from `src/iso/projection.ts:59`: **move** · _verified_
  Private.
- `DIRS8` (const) from `src/iso/projection.ts:61`: **move** · _verified_
  manifest SHEET_DIRS becomes an alias of it (target characters.ts); also used by build, the sprite viewer and gameFx.
- `DIR_VECTORS` (const) from `src/iso/projection.ts:63-70`: **move** · _verified_
  Private; computed at import time (pure).
- `dirFromScreenVector` (function) from `src/iso/projection.ts:73-78`: **move** · _verified_
- `dirFromGridVector` (function) from `src/iso/projection.ts:81-85`: **move** · _verified_
  `s.y * 2` assumes TW = 2\*TH; add a comment or an assert on ISO in the projection test.
- `dirToScreenVector` (function) from `src/iso/projection.ts:88-90`: **move** · _verified_
- `dirToGridVector` (function) from `src/iso/projection.ts:93-96`: **move** · _verified_
  Allocates; Actor.face and Zampano.startAction can copy it into their records.
- `mirrorDir` (function) from `src/iso/projection.ts:99-116`: **move** · _verified_
  Test-only (grep: only tests/projection.test.ts:12/112-114); kept as the target lists it.
- `depthKey` (function) from `src/iso/projection.ts:122-124`: **move** · _verified_
  Test-only (grep: only tests/projection.test.ts:5/141); compareDepth supersedes it. A candidate for deletion together with its test at cleanup.
- `insideDiamond` (function) from `src/iso/projection.ts:130-134`: **move** · _corrected by verifier_
  Used by core/assets/placeholders tiles and storyTiles (L4 to L1) and by tests/tileArt.test.ts:5.
  Verifier: Callers are assets/placeholders/tiles.ts (19, 62, 84, 131), which goes to placeholders/tiles.ts and raster.ts, and storyArt.ts:29 (the `fill` helper, which the target merges into placeholders/raster.ts, not storyTiles), plus tests/tileArt.test.ts. All are L4 to L1, so the layering holds.
- `Autopilot.stick` (method) from `src/story/autopilot.ts:141-142`: **split** as `gridDeltaToStick(dx, dy, out): out.x = dx - dy; out.y = (dx + dy) / 2` · _not verified_
  Keep exactly this arithmetic, not gridToScreen's \*16/\*8. The stick is normalised afterwards (143-146), so this keeps it bit-identical and playtest reports do not drift. story/steps/stage.move (steps.ts:293-295) uses the same helper. Each caller keeps its own normalisation: the autopilot returns early below 1e-6, while move uses `|| 1`.
- `move.update` (inline iso maths) from `src/story/steps.ts:294-296`: **split** as `gridDeltaToStick(dx, dy, out): the normalised screen direction (dx - dy, (dx + dy) / 2)` · _not verified_
  It replaces the inline half-tile maths, which is also duplicated at autopilot 141-142. Keep the same arithmetic order so scripted walks stay bit-identical.

#### `src/core/math/depth.ts`

Painter's order and occlusion.

Plan: Sortable, EPS, compareDepth, sortByDepth, Rect, rectsOverlap, occludes (iso/depth).

Entries (7):

- `Sortable` (interface) from `src/iso/depth.ts:9-17`: **move** · _verified_
  Entity satisfies `id` through `get id() { return this.uid }`. tests/depth.test.ts imports '../src/iso/depth': update the path.
- `EPS` (const) from `src/iso/depth.ts:19`: **move** · _verified_
  Private; algorithm constant, stays inline (not config).
- `compareDepth` (function) from `src/iso/depth.ts:21-27`: **move** · _verified_
  World's one dirty-guarded sort uses it, without the second sort through sortableChildren.
- `sortByDepth` (function) from `src/iso/depth.ts:30-32`: **move** · _verified_
  Used only by tests/depth.test.ts (grep: no src caller); kept for the test.
- `Rect` (interface) from `src/iso/depth.ts:35-40`: **move** · _verified_
  Shared screen rect type: camera, mapRenderer, entity, popups.
- `rectsOverlap` (function) from `src/iso/depth.ts:42-44`: **move** · _verified_
- `occludes` (function) from `src/iso/depth.ts:50-52`: **move** · _verified_

#### `src/core/math/geometry.ts`

Small vector and number helpers.

Plan: lerp (ambushLogic 35), along (ch7 16-18), mod (storyArt 37), clamp, ringPoint and distance (ambush 238-246).

Entries (6):

- `mod` (const) from `src/assets/placeholders/storyArt.ts:37`: **move** · _not verified_
  Positive modulo. The other `mod(` hits in src are GLSL inside the filter shaders, not callers.
- `along` (function) from `src/campaign/chapters/ch7.ts:15-18`: **move** as `along(p: Vec2, start: Vec2, dir: Vec2): number` · _not verified_
  Pure projection onto a direction. Point is structurally a Vec2, and content may import core/math. Only caller: 7.3 (ch7/march.ts).
- `rnd (range helper, 4 copies)` (inline) from `src/scenes/overlays.ts:338, 374, 390`: **merge** as `randIn(range: readonly number[]): number` · _added by verifier_
  The identical closure `(r) => r[0] + Math.random() * (r[1] - r[0])` appears in animateShine, animateTitleGlitch, animateGlitch and supervillainedScene.ts:128. It is one Math.random call with the same expression, so the RNG order is unchanged. Math.random in core/math is allowed (the ban was rejected).
- `rnd (range helper)` (inline) from `src/scenes/supervillainedScene.ts:128`: **merge** as `randIn` · _added by verifier_
  The fourth copy of the overlays rnd closure (see the entry above).
- `Ambush.ringPoint+distance` (method) from `src/systems/ambush.ts:238-246`: **split** as `ringPoint(cx, cy, angle, radius) and distance(ax, ay, bx, by)` · _verified_
  Ambush passes player.gx/gy. Keep the arithmetic `cx + Math.cos(angle) * radius` exactly, for identical floats. Line 85's Math.max(0, Math.min(1, ...)) can use geometry.clamp.
- `lerp` (const) from `src/systems/ambushLogic.ts:35`: **merge** · _verified_
  It becomes the shared lerp. It must keep the form `a + (b - a) * t` (not `a * (1 - t) + b * t`) so the voice intervals stay bit-identical and the RNG-driven playtest does not drift.

#### `src/core/util/rng.ts`

Seeded RNG and hash (unchanged).

Plan: Rng, hash2 (core/rng).

Entries (2):

- `Rng` (class) from `src/core/rng.ts:2-32`: **move** · _verified_
  Unchanged, and the mulberry32 constants stay inline (algorithm constants). The imports in tests/core.test.ts:5 and tests/ambush.test.ts:3 change to core/util/rng. A shim at core/rng.ts is safe during migration, because no folder named core/rng exists.
- `hash2` (function) from `src/core/rng.ts:35-40`: **move** · _verified_
  Unchanged, with the hash multipliers inline. Importers: placeholders tiles and storyArt, world, mapRenderer and core.test.

#### `src/core/util/emitter.ts`

Typed event emitter.

Plan: Emitter (core/events 2-24).

Entries (1):

- `Emitter` (class) from `src/core/events.ts:2-24`: **move** · _verified_
  Pure and generic. Importers: gameScene (value) and rules, gameFx and gameAudio (type). systems/greenZone/rules importing core/util is a legal edge. While other files move, core/events.ts can stay as a shim re-exporting Emitter and the GameEvents types (core to systems is a downward edge).

#### `src/core/util/color.ts`

Colour packing and mixing.

Plan: Color, parseCache, rgba, mixHex, alphaOf (placeholders/pixel 6-42); hex (ui/retro 19-21); lerpColor (mapRenderer 255-265). CLEAR dropped (unused).

Entries (7):

- `Color` (type) from `src/assets/placeholders/pixel.ts:6`: **move** · _not verified_
- `parseCache` (const) from `src/assets/placeholders/pixel.ts:8`: **move** · _not verified_
  Module memo. In practice it is bounded by the fixed set of colour literals.
- `rgba` (function) from `src/assets/placeholders/pixel.ts:11-23`: **move** · _not verified_
  tests/tileArt.test.ts:2 imports rgba and alphaOf from '../src/assets/placeholders/pixel': repoint to core/util/color, and PixelBuffer to core/assets/pixelBuffer.
- `mixHex` (function) from `src/assets/placeholders/pixel.ts:28-38`: **move** · _not verified_
  Used by placeholders/props, storyProps, storyTiles and specials.
- `alphaOf` (function) from `src/assets/placeholders/pixel.ts:40-42`: **move** · _not verified_
  Imported by core/assets/pixelBuffer (L4->L1) and tests/tileArt.
- `hex` (function) from `src/ui/retro.ts:19-21`: **move** · _verified_
  Re-exported by the src/ui/retro.ts shim (12 importers).
- `lerpColor` (function) from `src/world/mapRenderer.ts:255-265`: **move** · _verified_
  Pure colour helper; also usable by ui and fx.

#### `src/core/app/game.ts`

Service hub. Public members are unchanged for scripts (width, height, time, view, canvas, updateSettings, loop, input, audio, scenes, transition, toLogical).

Plan: Game (core/game). Stage layers are created as render groups through core/render/layers. The dead overlayLayer is removed. settingsListeners gains an unsubscribe. The window resize listeners move to lifecycle.ts.

Entries (1):

- `Game` (class) from `src/core/game.ts:13-116`: **move** · _corrected by verifier_
  Members that scripts read are unchanged: width, height, time (story-smoke.mjs:144-146), view.scale, canvas, settings, updateSettings, loop.stop, input.\*, audio.ready and loop, scenes, transition. ScreenTransition now comes from core/scene/transition. settingsListeners gains an unsubscribe (e.g. onSettings(fn): () => void). Settings are read twice at boot (main.ts:42 and this field at :21). Optionally let bootstrap pass its already-loaded Settings into the constructor, keeping the `settings` field name. frame() (85-88) is unchanged: the render-group fix comes from the layers.
  Verifier: settingsListeners has no outside subscriber: its only pushes are game.ts:36-37, and nothing in src, tests or scripts touches it. Make it private rather than adding an unsubscribe API. Script-read members are verified against scripts/\*.mjs: width, height, time, view.scale, canvas, updateSettings, loop.stop, audio(.ready, .loop), input.{buttons, gestureZone, lastGesture, usingTouch}.

#### `src/core/app/loop.ts`

Fixed 60 Hz accumulator and rAF driver (the model is unchanged).

Plan: FixedStep, GameLoop (core/loop).

Entries (2):

- `FixedStep` (class) from `src/core/loop.ts:7-31`: **move** · _verified_
  Pure and tested. The import in tests/core.test.ts:4 changes to '../src/core/app/loop'.
- `GameLoop` (class) from `src/core/loop.ts:34-72`: **move** · _verified_
  The model is unchanged. stepNow drives \_\_sv.step(n), and scripts call \_\_sv.game.loop.stop().

#### `src/core/app/display.ts`

Viewport maths and safe-area insets.

Plan: Viewport, computeViewport, Insets, probe, safeAreaInsets (core/display).

Entries (5):

- `Viewport` (interface) from `src/core/display.ts:3-14`: **move** · _verified_
- `computeViewport` (function) from `src/core/display.ts:20-45`: **move** · _verified_
  Pure. The import in tests/core.test.ts:3 changes to '../src/core/app/display'.
- `Insets` (interface) from `src/core/display.ts:47-52`: **move** · _verified_
- `probe` (let) from `src/core/display.ts:54`: **move** · _verified_
  Module state: one hidden div, created once and never removed. That is fine for the app's lifetime.
- `safeAreaInsets` (function) from `src/core/display.ts:61-73`: **move** · _verified_
  Game.resize is its only caller.

#### `src/core/app/lifecycle.ts`

App-lifetime DOM listeners, with dispose.

Plan: resize/visualViewport listeners (game 46-47), visibilitychange/blur that call autoPause (flow 45-55), 'svback' that calls back (main 53).

Entries (3):

- `Game.constructor` (method) from `src/core/game.ts:46-47`: **split** as `installLifecycle({ onResize, onHidden, onBack }): () => void` · _verified_
  Covers the window and visualViewport resize listeners. lifecycle.ts sits in core/app (L4), so it takes callbacks and never imports Flow. Bootstrap wires onHidden to flow.autoPause (from flow 45-55) and onBack to flow.back (main.ts:53).
- `boot` (function) from `src/main.ts:52-53`: **split** as `installLifecycle({ onBack: () => flow.back() })` · _verified_
  The 'svback' listener (dispatched by MainActivity.java). lifecycle takes the callback, so core/app never imports core/flow.
- `Flow.constructor (app listeners)` (method) from `src/scenes/flow.ts:51-54`: **split** as `lifecycle.onBackground(cb) (visibilitychange+hidden, window blur) with dispose()` · _verified_
  core/app (L4) cannot import core/flow. bootstrap registers `lifecycle.onBackground(() => flow.autoPause())`, and also `onBack(() => flow.back())` for the svback event (main 53). Today the listeners are never removed.

#### `src/core/app/native.ts`

Capacitor bridge, the only path from game code to native code.

Plan: AppQuitPlugin, AppQuit, quitApp, openUrl (core/native). Plugin name 'AppQuit' unchanged.

Entries (4):

- `AppQuitPlugin` (interface) from `src/core/native.ts:4-7`: **move** · _verified_
- `AppQuit` (const) from `src/core/native.ts:9`: **move** · _verified_
  registerPlugin('AppQuit') runs at import time. The name must match android/.../QuitPlugin.java and ios/App/App/AppQuitPlugin.swift. Update the core/native.ts path in CLAUDE.md in the same commit.
- `quitApp` (function) from `src/core/native.ts:15-19`: **move** · _verified_
  Its only importer is scenes/flow, which moves to core/flow/titleFlow (a legal L9 to L4 edge).
- `openUrl` (function) from `src/core/native.ts:22-30`: **move** · _verified_
  Called with TITLE.PUBLISHER_URL by titleFlow.

#### `src/core/app/settingsActions.ts`

The settings controller shared by OPTIONS, PAUSE, the story pause, CONTROLS and the title. Every change goes through game.updateSettings.

Plan: toggleSound, cycleMusic, cycleSounds (flow 254-267); toggleArt with preloadEnvironmentArt (flow 165-170); the text-speed toggle (flow 140, storyFlow 332-369); changeLives (overlays 305-310); ControlsScene.change (overlays 815-820).

Entries (6):

- `Flow.openOptions (cycleTextSpeed closure)` (method) from `src/scenes/flow.ts:140`: **merge** as `function cycleTextSpeed(game)` · _verified_
  Merges with the copy in story/storyFlow.ts 332-369 (the story pause), so OPTIONS and the story pause share one writer.
  Verifier: The story pause copy is at storyFlow.ts:360, inside 332-369. The story pause also toggles mute inline at storyFlow.ts:358, which is the same writer as toggleSound (entry 27).
- `Flow.toggleArt` (method) from `src/scenes/flow.ts:161-170`: **split** as `function toggleArt(game): updateSettings(newArt) + preloadEnvironmentArt(next) + click` · _verified_
  core/app may import core/assets/environment/banks. The `leaving` guard stays in titleFlow.openOptions.
- `Flow.toggleSound+cycleMusic+cycleSounds` (method) from `src/scenes/flow.ts:253-267`: **split** as `functions toggleSound(game), cycleMusic(game), cycleSounds(game)` · _verified_
  Behaviour is unchanged: cycleMusic makes no click, and cycleSounds clicks after AUDIO.LEVEL_CLICK_DELAY (from config/audio). Shared by OPTIONS, PAUSE and the story pause.
- `TitleScene.changeLives` (method) from `src/scenes/overlays.ts:305-310`: **split** as `function changeLives(game, step): updateSettings(lives = nextLives(...)) + click` · _verified_
  TitleScene keeps a two-line wrapper: it calls settingsActions.changeLives, then livesCounter.set and layout(). ui may import core/app (L6 -> L4).
- `ControlsScene.constructor (change)` (method) from `src/scenes/overlays.ts:814-820`: **split** as `function changeControls(game, fn: (c: ControlSettings) => void): updateSettings + click` · _verified_
  menu.refreshLabels() stays in the scene. DEFAULTS uses DEFAULT_CONTROLS from config/input, re-exported by core/state/settings.
- `StoryFlow.pause` (settings toggles) from `src/story/storyFlow.ts:358-361`: **split** as `toggleSound(game), cycleTextSpeed(game), soundLabel / textSpeedLabel` · _not verified_
  These are the same toggles as flow.ts:140/254-267. Every change still goes through game.updateSettings. nextTextSpeed stays in core/state/settings.

#### `src/core/render/layers.ts`

Render-group layer factory and stage stack.

Plan: New renderLayer(label, {group}). Used by Game (scene and overlay layers), SceneBase (worldRoot/uiRoot), World.root and MapRenderer.root. This fixes the single render group at game.ts:87 and world.ts:164.

Entries (1):

- `Game.sceneLayer` (method) from `src/core/game.ts:15, 33`: **split** as `sceneLayer = renderLayer('scenes', { group: true })` · _verified_
  The field stays on Game, and SceneManager receives it. Only its construction goes through the factory. This addresses the audit's single render group (game.ts:87). No script reads sceneLayer.

#### `src/core/render/dispose.ts`

One GPU-safe destroy.

Plan: destroyTree(root) = destroy({children: true, context: true}), never with texture: true. Used by SceneManager (scene.ts:94), MiniGame.destroy (miniGame:37), WalkStep.stop, Combat.stop, Particles and the screens.

Entries (1):

- `SceneManager.dispose` (method) from `src/core/scene.ts:94`: **split** as `destroyTree(s.root)` · _verified_
  Replaces root.destroy({children: true}) with destroy({children: true, context: true}), never texture: true (atlas textures are shared). This fixes the GraphicsContext leak (audit scene.ts:94). The method stays in SceneManager. core/scene importing core/render is legal (render comes before scene in the internal order).
  Verifier: Verified in pixi.js 8.23.0 (Graphics.mjs:145-150). With an options object and no context:true, a Graphics' owned context is not destroyed, which is the leak. No src code shares a GraphicsContext (no new Graphics(ctx)), so context:true is safe. PixelText overrides destroy() and frees its own per-instance texture whatever options it gets.

#### `src/core/render/redraw.ts`

Change-only Graphics drawing and alpha blinks.

Plan: New CachedGraphics.draw(key, fn), which clears and redraws only when the key changes, and blinkAlpha(t, hz), which replaces `visible` toggles (popups 111, attackBanner, gameFx 342, zampano 282). Used by menu, HUD, radar, joystick, combat markers, cones, rings and mini-game views.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/core/render/text/pixelFont.ts`

Font atlas loader (boot awaits it).

Plan: PixelFont, current, loadPixelFont, pixelFont, BORROWED, EXTRA (ui/pixelFont). FONT numbers go to config/art. The woff2 ?url path is rebased to core/assets/fonts.

Entries (6):

- `BORROWED` (const) from `src/ui/pixelFont.ts:18`: **move** · _verified_
  A glyph-mapping table, which stays with the font.
- `EXTRA` (const) from `src/ui/pixelFont.ts:19`: **move** · _verified_
- `PixelFont` (class) from `src/ui/pixelFont.ts:21-139`: **move** · _verified_
  fontUrl becomes '../../assets/fonts/PressStart2P.woff2?url' (the font moves to core/assets/fonts). That is a core/render -> core/assets path, upward in core's internal order (render below assets), so tests/layers.test.ts must not count '?url' binary imports as code edges. For the same reason it uses ALPHA_CUT from config directly, not core/assets/crisp.
  Verifier: pixelFont.ts has no pixi.js import, only the woff2 ?url. Alternative to an exemption in the layer test: put the font file next to its only loader (core/render/text/fonts/). That removes the render->assets path entirely.
- `current` (let) from `src/ui/pixelFont.ts:141`: **move** · _verified_
- `loadPixelFont` (function) from `src/ui/pixelFont.ts:143-146`: **move** · _verified_
  core/flow/bootstrap awaits it before any PixelText exists (today main.ts:39).
- `pixelFont` (function) from `src/ui/pixelFont.ts:148-151`: **move** · _verified_

#### `src/core/render/text/pixelText.ts`

Crisp text sprite used by entities, ui and story. Kept whole: one cohesive renderer.

Plan: PixelTextStyle, Span, DEFAULT_TEXT_STYLE, Glyph, tintCache, tintedGlyph, layoutLines, PixelText, toSpans, sameSpans (ui/pixelText).

Entries (11):

- `PixelTextStyle` (interface) from `src/ui/pixelText.ts:9-26`: **move** · _verified_
- `Span` (interface) from `src/ui/pixelText.ts:28-31`: **move** · _verified_
  Type-imported by story/names (later ui/text/markup), story/screens and overlays.
- `DEFAULT_TEXT_STYLE` (const) from `src/ui/pixelText.ts:33-46`: **move** · _verified_
  The renderer's own defaults, kept with it.
- `Glyph` (interface) from `src/ui/pixelText.ts:48-51`: **move** · _verified_
- `tintCache` (const) from `src/ui/pixelText.ts:53`: **move** · _verified_
- `tintedGlyph` (function) from `src/ui/pixelText.ts:55-72`: **move** · _verified_
- `layoutLines` (function) from `src/ui/pixelText.ts:75-112`: **move** · _verified_
  Exported but used only in this file (grep). Keep it exported: it is pure and testable.
- `PixelText` (class) from `src/ui/pixelText.ts:114-265`: **move** · _verified_
  Kept whole. 20 src importers keep working through a temporary `export *` shim at src/ui/pixelText.ts. vi.mock('../src/ui/pixelText') in tests/input, touchControls and wordGames changes to '../src/core/render/text/pixelText' in the same commit; the shim re-exports the mocked module, so this is safe. The private `content` field is kept: story-smoke reads menu.rows[i].text.content and screenshot.mjs:712 reads popup children's .content. The destroy() override keeps freeing its own canvas texture and source, since destroyTree never passes texture: true.
  Verifier: Verified: 20 src importers, and vi.mock('../src/ui/pixelText') in tests/input:25, touchControls:58 and wordGames:27. destroy() (262-264) ignores the options it is passed and uses texture/textureSource: true, so destroyTree does not change it.
- `inline: canvas rounding and glow weights` (inline) from `src/ui/pixelText.ts:190-199, 242, 249`: **move** · _verified_
  Renderer internals (the 16x8 allocation granularity, glow 0.35/0.6) stay with the rasterizer.
- `toSpans` (function) from `src/ui/pixelText.ts:267-269`: **move** · _verified_
- `sameSpans` (function) from `src/ui/pixelText.ts:271-275`: **move** · _verified_

#### `src/core/render/filters/filterVertex.ts`

The shared Pixi v8 filter vertex shader.

Plan: vertex (the identical copies in glitchFilter 3-28, textGlitchFilter 3-28 and titleGlitchFilter 3-28).

Entries (3):

- `vertex` (const (GLSL)) from `src/fx/glitchFilter.ts:3-28`: **merge** as `export const FILTER_VERTEX` · _verified_
  Byte-identical to textGlitchFilter.ts 3-28 and titleGlitchFilter.ts 3-28 (checked); the three copies merge into one.
  Verifier: Checked with diff: lines 3-28 are byte-identical in all three filter files.
- `vertex` (const (GLSL)) from `src/fx/textGlitchFilter.ts:3-28`: **merge** as `FILTER_VERTEX` · _verified_
  Identical copy, merged into one.
- `vertex` (const (GLSL)) from `src/fx/titleGlitchFilter.ts:3-28`: **merge** as `FILTER_VERTEX` · _verified_
  The third identical copy.

#### `src/core/render/filters/glitchFilter.ts`

CRT/glitch post filter.

Plan: fragment, GlitchFilter (fx/glitchFilter).

Entries (3):

- `fragment` (const (GLSL)) from `src/fx/glitchFilter.ts:30-86`: **move** · _verified_
- `inline: shader constants (slices, sepia, scanlines)` (inline) from `src/fx/glitchFilter.ts:54-59, 71-79`: **move** · _verified_
  Stays in the GLSL (CONFIG PLAN: GLSL constants stay in the shaders).
- `GlitchFilter` (class) from `src/fx/glitchFilter.ts:92-144`: **move** · _verified_
  tests/transition.test.ts vi.mock('../src/fx/glitchFilter') changes to '../src/core/render/filters/glitchFilter' in the same commit. Consumers: core/scene/transition and ui/effects/attackFx (today gameScene:50), which owns the filter and destroys it. The program name 'sv-glitch' is unchanged.

#### `src/core/render/filters/textGlitchFilter.ts`

Title lettering glitch.

Plan: fragment, TextGlitchFilter (fx/textGlitchFilter).

Entries (3):

- `fragment` (const (GLSL)) from `src/fx/textGlitchFilter.ts:30-77`: **move** · _verified_
- `inline: shader constants and filter padding 14` (inline) from `src/fx/textGlitchFilter.ts:53-73, 102`: **move** · _verified_
  Stays with the shader: the padding is sized to the GLSL's 24-px maximum shift.
  Verifier: Correct the justification. The GLSL slice shift is (rand-0.5)\*24\*b px (line 59), so at most ±12 px, plus the RGB split floor(idle+3b+0.5) of up to about 4 px. 'Sized to the GLSL's 24-px maximum shift' is wrong; padding 14 covers about 12 px plus the split.
- `TextGlitchFilter` (class) from `src/fx/textGlitchFilter.ts:84-116`: **move** · _verified_
  Its one consumer, TitleScene (overlays:114), registers it with sceneBase own() so it is destroyed in exit(). DECISIONS.md:508 names the old path (a history entry).
  Verifier: Verified: the only consumer is overlays.ts:114, and DECISIONS.md:508 names the old path.

#### `src/core/render/filters/titleGlitchFilter.ts`

Film and tearing backdrop filter.

Plan: fragment, TitleGlitchFilter (fx/titleGlitchFilter). The film setter is typed as typeof TITLE.FILM and set once.

Entries (3):

- `fragment` (const (GLSL)) from `src/fx/titleGlitchFilter.ts:30-145`: **move** · _verified_
- `inline: glitch and film shader constants` (inline) from `src/fx/titleGlitchFilter.ts:58-141`: **move** · _verified_
  Stays in the GLSL.
- `TitleGlitchFilter` (class) from `src/fx/titleGlitchFilter.ts:154-194`: **move** · _verified_
  The `film` setter (190-193) is typed `typeof TITLE.FILM` instead of repeating its shape inline. It is set once when the filter is created, not every step (audit titleGlitchFilter:190-193; today overlays.ts:401). titleFlow (flow:67) creates the filter, owns it and destroys it (audit flow 67-68); overlays.ts:3 type-imports it.
  Verifier: Verified: overlays.ts:401 sets f.film = TITLE.FILM every step in animateGlitch, and flow.ts:67 creates the filter.

#### `src/core/scene/scene.ts`

Scene contract and stack.

Plan: Scene (plus an optional `covered` flag so render can skip hidden HUD and controls work); SceneManager (core/scene), with a reused active array and dispose through destroyTree.

Entries (2):

- `Scene` (interface) from `src/core/scene.ts:4-18`: **move** · _verified_
  Gains an optional `covered` flag so render can skip hidden scenes. root stays readonly Container: SceneManager and scripts (\_\_sv.top().root.visible) use it.
- `SceneManager` (class) from `src/core/scene.ts:21-96`: **move** · _corrected by verifier_
  update() reuses a private active array instead of allocating one each step (line 70), and render() iterates without the `[...this.stack]` copy each frame (line 83). The `includes` guard (78) stays, because update can pop scenes. Owned by Game; no test imports it.
  Verifier: Do not iterate this.stack live in render (line 83). The copy protects against a render() that pushes or pops a scene, and the plan adds more work to render paths (render(alpha) forwarding, covered). To avoid the per-frame allocation, snapshot into a reused private array (copy length then elements) as update() does. The `includes` guard (78) stays.

#### `src/core/scene/sceneBase.ts`

Optional base class for screens and scenes.

Plan: New BaseScene: root, w/h defaulting to VIEW, optional worldRoot/uiRoot render groups, an own(filter|texture|graphics) list destroyed in exit(), and an inputGuard timer (the 0.25-0.6 s guards repeated in overlays, couch, glossary and screens). It fixes the filter leaks at flow 67-68, gameScene 50, overlays 156, supervillained 49 and storyScene 384 in one place.

Entries (1):

- `StoryCardScene.update` (method (input guard)) from `src/story/screens.ts:68-74`: **split** as `BaseScene.inputGuard (GUARDS.CARD_DISMISS)` · _not verified_
  The 0.6 s press guard becomes the shared SceneBase guard. The tap and continue read stays in StoryCardScene.update.

#### `src/core/scene/transition.ts`

Scene-swap transition. Kept whole: a cohesive 74-line timeline.

Plan: ScreenTransition (fx/transition). game.transition and play(mid) are unchanged.

Entries (1):

- `ScreenTransition` (class) from `src/fx/transition.ts:9-74`: **move** · _verified_
  Kept whole. game.transition's API (busy, swapping, play(mid, duration, flash), update, resize) is unchanged. Removes the core->fx edge (core/game.ts:2). tests/transition.test.ts changes both its import and its vi.mock path in the same commit. core/scene importing core/render/filters is downward in core's internal order.

#### `src/core/stage/world.ts`

Gameplay scene graph: layers, entity registry, fixed-step hooks, culling, one depth sort, camera. It neither builds textures nor creates entities.

Plan: WorldOptions, World (world/world) minus buildLevelTextures (51), the spawning code (55-67, 110-138, which goes to entities/stageDressing and entities/factory) and spriteOf (unused). New: static/dynamic lists, updateEntities(dt, ctx), root as a render group, static props culled per ground chunk, one dirty-guarded sort without sortableChildren. Still public: decalLayer, objectLayer, fxLayer, mapRenderer, camera, map, player, snapCamera, teleport, root.

Entries (6):

- `WorldOptions` (interface) from `src/world/world.ts:18-25`: **move** · _verified_
  It shrinks to {floorDesign}, because World no longer spawns anything. `forest` moves to the entities/stageDressing options (dressStage(world, {forest})); `playerSkin` moves to entities/factory createPlayer(skin). Callers: story/storyScene (story/engine/stage) and the Green Zone scene pass those to the dressing and factory calls instead. FloorDesign is a type from core/assets/environment (L4 sideways: assets come before stage in the core order).
- `World` (class) from `src/world/world.ts:31-204`: **move** as `class World<P extends StagePlayer = StagePlayer>` · _corrected by verifier_
  It depends only on the StageEntity/StagePlayer interfaces (core/stage/stageEntity.ts), so core never imports entities. Making it generic lets the Green Zone scene and StoryScene keep `world.player` typed as Zampano. Public API kept: root, decalLayer, objectLayer, fxLayer, mapRenderer, camera, map, player, entities, cameraTarget, cameraLift, addEntity, removeEntity, walkableBounds, snapCamera (screenshot.mjs), teleport, beginStep, endStep, render, destroy. New: setPlayer(p), static/dynamic lists, updateEntities(dt, ctx). root and objectLayer are render groups via core/render/layers. destroy uses core/render/dispose.destroyTree. Importers: story/storyScene.ts:17 and gameScene.ts:26.
  Verifier: Under the target, the render groups are World.root and MapRenderer.root, not objectLayer. objectLayer's children move and reorder every frame, and StoryScene puts the bleach filter on it (storyScene.ts:377/382), so it stays a plain Container under the root group. cameraTarget (42) is retyped as StageEntity | null. Everything else is right.
- `World.addEntity+removeEntity` (method) from `src/world/world.ts:73-82`: **keep** · _added by verifier_
  Use objectLayer.addChild(e) instead of e.view, file the entity in the static or dynamic list by e.static, and mark the depth order dirty in both methods (see 188). removeEntity keeps e.destroy(), which now removes the Container from its parent.
- `World.beginStep` (method) from `src/world/world.ts:147-149`: **keep** · _added by verifier_
  savePrev runs over the dynamic list only. Props placed by scripts (placeObject) must be in that list, because scripts move them (see 70).
- `World.endStep` (method) from `src/world/world.ts:152-159`: **keep** as `updateEntities(dt, ctx) + endStep(dt)` · _corrected by verifier_
  Today line 153 calls update(dt) on every non-player entity, but only Treat does work; under the new contract only driver 'world' entities (Treat, PickupEntity, CarriedLabel) are updated here. Scenes call updateEntities before endStep, as in world-loop step 4. Camera look-ahead keeps reading player.vx/vy through StagePlayer, with gridVecToScreen written into a scratch object.
  Before the correction: newName `updateEntities(dt, ctx) [driver 'world' only, in insertion order] + endStep(dt) [map.update, camera follow]`.
  Verifier: The statement that only Treat does work is wrong. PickupEntity.update (story/walk.ts:131-141) and Carried.update (story/carry.ts:25-28) also run at line 153 today. The conclusion (driver 'world' = Treat, PickupEntity, CarriedLabel, updated after the owners) is correct, and CarriedLabel must stay after the player's step so that it reads the moved position.
- `World.render` (method) from `src/world/world.ts:162-188`: **keep** · _corrected by verifier_
  Reworked in place: root scroll on its own render group; cull with reused Rects (screenRect(out)); occlusion fade still integrated with frameDt here, as today (the entity model's explicit exception); e.render(alpha) instead of sync; static props culled per ground chunk with alpha written only on fade change; one compareDepth sort only when a dynamic entity moved; children reordered without zIndex + sortableChildren (audit world.ts:182-186). e.view.visible becomes e.visible.
  Verifier: The depth order must also be marked dirty on addEntity, on removeEntity and on any depthBias change, not only when a dynamic entity moves. Otherwise a new treat, cat, pickup or band member is drawn at the end of objectLayer until something moves. Static props interleave, so the sort covers all entities. With per-chunk static culling, grow the chunk bounds by the props' sprite extents (see 70). DECISIONS.md:40 describes the zIndex mechanism: update it in the same commit.

#### `src/core/stage/stageEntity.ts`

What World needs from an entity, so that core does not import entities.

Plan: New StageEntity interface (Container & gx, gy, prev\*, z, depthBias, static, driver, fadeable, fade, cullBox, savePrev, update, render).

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/core/stage/camera.ts`

Pure follow camera (fixed-step update, viewOrigin(alpha)).

Plan: Camera, clampAxis (iso/camera).

Entries (2):

- `Camera` (class) from `src/iso/camera.ts:9-98`: **move** · _verified_
  Pure (no Pixi). update() at the fixed step, viewOrigin(alpha) at render, as today. The shake keeps its two Math.random draws per step in the same order. Add out parameters to clamp/viewOrigin/viewRect to stop the per-call allocations. Importers: core/stage/world, the Green Zone scene, and the fx bindings (gameFx.ts:7, type-only). tests/core.test.ts:6 imports '../src/iso/camera': update it to '../src/core/stage/camera' in the same commit, or leave a shim.
- `clampAxis` (function) from `src/iso/camera.ts:101-105`: **move** · _verified_
  Tested in tests/core.test.ts:52-54.

#### `src/core/stage/mapRenderer.ts`

Chunked ground renderer: root is a render group, overlays are pooled, culled chunks are not animated.

Plan: Chunk, TileOverlay, AnimatedTile, MapRenderer (world/mapRenderer). CHUNK and GRASS_WIND go to config/display, lerpColor to core/util/color. Tile names come from manifest/names tileName().

Entries (5):

- `Chunk` (interface) from `src/world/mapRenderer.ts:14-18`: **move** · _verified_
  Gains per-chunk animated-tile lists, so culled chunks are not animated (audit 181).
- `TileOverlay` (interface) from `src/world/mapRenderer.ts:20-23`: **move** · _verified_
  Overlay sprites are pooled (hidden instead of destroyed) per audit 231-249.
- `AnimatedTile` (interface) from `src/world/mapRenderer.ts:25-29`: **move** · _verified_
- `MapRenderer` (class) from `src/world/mapRenderer.ts:37-253`: **move** · _verified_
  `root` becomes a render group created by core/render/layers.renderLayer (audit world.ts:164). `root` stays public, because the storyScene fog/bleach (storyScene.ts:377/382, moving to ui/effects/screenOverlay) sets filters on it; `bounds` stays public for World.walkableBounds. No test covers it. The tile clock (waterTime) advances by the frame dt in update(frameDt, view), called from World.render, as today. Moving that clock to the fixed step would change animation phase in stepped screenshots, so keep it unless that drift is accepted.
- `inline: hash2 salts` (inline) from `src/world/mapRenderer.ts:113, 119, 168-170, 231`: **move** · _verified_
  They stay inline with the code (decision: hash salts stay with the drawers). Changing a salt changes every tile.

#### `src/core/state/storage.ts`

Guarded localStorage (prefix 'supervillained:' unchanged).

Plan: PREFIX, storage (core/storage).

Entries (2):

- `PREFIX` (const) from `src/core/storage.ts:5`: **move** · _verified_
  A persistence key, not config. 'supervillained:' must not change: saves, scripts (smoke progress) and the v1 backup keys depend on it.
- `storage` (const) from `src/core/storage.ts:7-33`: **move** · _corrected by verifier_
  Importers: core/state/settings, core/state/records, core/state/campaignSave (from campaign/state), tests/settings.test:19 and tests/campaign.test (import path changes).
  Verifier: tests/campaign.test.ts does not import storage. Importers: core/settings.ts:3, campaign/state.ts:2 and tests/settings.test.ts:19.

#### `src/core/state/settings.ts`

Settings model, defaults, validation, cycling and persistence.

Plan: TextSpeed, TEXT_SPEEDS, nextLevel, validLevel, nextTextSpeed, GestureBinding, GESTURE_BINDINGS, nextBinding, ControlSettings, validControls, Settings, loadSettings, saveSettings (core/settings). It re-exports DEFAULT_CONTROLS from config, checked with `satisfies ControlSettings`. The 'settings' key is unchanged. It imports clampLives from systems (a legal downward edge).

Entries (13):

- `TextSpeed` (type) from `src/core/settings.ts:7`: **move** · _verified_
- `TEXT_SPEEDS` (const) from `src/core/settings.ts:8`: **move** · _verified_
  It validates and cycles TextSpeed. config/ui TEXT_CPS is checked against TextSpeed at its use sites.
- `nextLevel` (function) from `src/core/settings.ts:17-20`: **move** · _verified_
  Called from flow 260 and 265, which move to core/app/settingsActions (cycleMusic, cycleSounds).
- `validLevel` (function) from `src/core/settings.ts:28-30`: **move** · _verified_
  Private, used by loadSettings.
- `nextTextSpeed` (function) from `src/core/settings.ts:33-35`: **move** · _verified_
  Called from flow:140 and storyFlow:360, which move to core/app/settingsActions.
- `GestureBinding` (type) from `src/core/settings.ts:38`: **move** · _verified_
  Readers: core/input/gestures (type, legal) and overlays BINDING_LABEL (to ui/widgets/menuRows).
- `GESTURE_BINDINGS` (const) from `src/core/settings.ts:39`: **move** · _verified_
  Tested in settings.test.
- `nextBinding` (function) from `src/core/settings.ts:42-44`: **move** · _verified_
  Called from overlays:820 (ControlsScene.change), which moves to core/app/settingsActions.
- `ControlSettings` (interface) from `src/core/settings.ts:46-57`: **move** · _verified_
- `validControls` (function) from `src/core/settings.ts:69-80`: **move** · _verified_
  Pure and tested.
- `Settings` (interface) from `src/core/settings.ts:82-101`: **move** · _verified_
  The doc comment on newArt names Flow.toggleArt and assets/environment.ts: update it to core/app/settingsActions.toggleArt and core/assets/environment.
- `loadSettings` (function) from `src/core/settings.ts:109-125`: **move** · _verified_
  The storage key 'settings' is unchanged (scripts read supervillained:settings). The model defaults (muted false, textSpeed 'normal', newArt false; 116, 119, 123) stay here, optionally as a local DEFAULT_SETTINGS: they are the model's own defaults, not tuning. It imports clampLives from systems/greenZone/lives (a legal L4 to L3 edge) and LIVES and AUDIO from config.
- `saveSettings` (function) from `src/core/settings.ts:127-129`: **move** · _verified_
  Game.updateSettings is its only caller.

#### `src/core/state/records.ts`

Green Zone records and coins.

Plan: LevelRecord, loadRecords, bestFor, saveRecord, loadCoins, addCoins (core/settings 103-167). Keys 'records' and 'coins' unchanged.

Entries (6):

- `LevelRecord` (interface) from `src/core/settings.ts:103-107`: **move** · _verified_
  ui/screens/couchScene receives a LevelRecord as a parameter (a type import, L6 to L4).
- `loadRecords` (function) from `src/core/settings.ts:131-134`: **move** · _verified_
  The key 'records' is unchanged.
- `bestFor` (function) from `src/core/settings.ts:136-138`: **move** · _verified_
  It is called by core/flow/titleFlow, which passes the result to CouchScene, instead of by couchScene itself.
- `saveRecord` (function) from `src/core/settings.ts:144-155`: **move** · _verified_
  Called from flow:307 (to core/flow/walkFlow.levelComplete).
- `loadCoins` (function) from `src/core/settings.ts:158-161`: **move** · _verified_
  Unused in src (`grep -rlw loadCoins src` finds only core/settings.ts), but settings.test covers it. It moves rather than being deleted: deleting it would mean also deleting its tests, a product decision about the 'future shop'. The key 'coins' is unchanged.
- `addCoins` (function) from `src/core/settings.ts:163-167`: **move** · _verified_
  Same case as loadCoins: unused in src, covered by settings.test.

#### `src/core/state/campaignSave.ts`

Campaign persistence and migration (format v2 unchanged).

Plan: KEY, V1_BACKUP_KEY, UNKNOWN_BACKUP_KEY, V1_KEPT_SCENES/FLAGS/SHARDS/REMEMBERED, V1Save, migrateV1, loadCampaign, beginAttempt, keepAttemptTime, saveCampaign, resetCampaign (campaign/state 228-333). It re-exports STORY_VERSION from systems/campaign/model.

Entries (14):

- `KEY` (const) from `src/campaign/state.ts:228`: **move** · _verified_
  The value 'story' is unchanged. With the storage PREFIX it gives 'supervillained:story', which scripts/screenshot.mjs and story-smoke.mjs hardcode.
  Verifier: The scripts hardcode 'supervillained:story' (screenshot.mjs:174/265/294/303, story-smoke.mjs:55/82/409).
- `V1_BACKUP_KEY` (const) from `src/campaign/state.ts:230`: **move** · _verified_
  The value 'story-v1-backup' is unchanged. scripts/screenshot.mjs:304 reads it, and tests/campaign.test.ts imports it from the new path.
- `UNKNOWN_BACKUP_KEY` (const) from `src/campaign/state.ts:235`: **move** · _verified_
  The value 'story-unknown-backup' is unchanged. It is imported by tests/campaign.test.ts.
- `V1_KEPT_SCENES` (const) from `src/campaign/state.ts:242`: **move** · _verified_
  Migration data. Nothing outside the save module reads it (grep), so it could drop its export, but keep it for now.
- `V1_KEPT_FLAGS` (const) from `src/campaign/state.ts:244`: **move** · _verified_
- `V1_KEPT_SHARDS` (const) from `src/campaign/state.ts:246`: **move** · _verified_
- `V1_KEPT_REMEMBERED` (const) from `src/campaign/state.ts:248`: **move** · _verified_
- `V1Save` (type) from `src/campaign/state.ts:250`: **move** · _verified_
- `migrateV1` (function) from `src/campaign/state.ts:258-276`: **move** · _verified_
  Moved unchanged with its tests. The supervillain -3 at line 267 stays inline on purpose. It replays the v1 value of the 1.3 paw-offer effect, so it must not follow future ch1 tuning through config.
- `loadCampaign` (function) from `src/campaign/state.ts:278-307`: **move** · _verified_
  Callers: core/flow/storyFlow, and core/flow/titleFlow, which builds the COUCH ProgressSummary. ui/screens/couchScene stops calling it, because ui never reads storage. tests/summary.test.ts and campaign.test.ts update their paths.
  Verifier: Checked: the callers are storyFlow.ts (36/55/60/76/131) and couchScene.ts:54.
- `beginAttempt` (function) from `src/campaign/state.ts:315-317`: **move** · _verified_
  Pure (structuredClone). Kept next to keepAttemptTime and saveCampaign as the attempt and commit contract that StoryFlow uses.
- `keepAttemptTime` (function) from `src/campaign/state.ts:320-322`: **move** · _verified_
- `saveCampaign` (function) from `src/campaign/state.ts:324-327`: **move** · _verified_
- `resetCampaign` (function) from `src/campaign/state.ts:329-333`: **move** · _verified_

#### `src/core/input/index.ts`

Barrel; '../src/core/input' (4 tests) keeps resolving.

Plan: Re-exports of types, input, gestures, touchLayout and intent.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/core/input/types.ts`

Input vocabulary.

Plan: Action, VirtualButton, JoystickState, Tap, PointerTrack (core/input 21-122).

Entries (4):

- `Action` (type) from `src/core/input.ts:21-35`: **move** · _verified_
  Re-exported by the core/input/index barrel: wordGames.test imports `type Action` from '../src/core/input'.
- `VirtualButton` (interface) from `src/core/input.ts:86-96`: **move** · _verified_
- `JoystickState` (interface) from `src/core/input.ts:98-104`: **move** · _verified_
- `Tap` (interface) from `src/core/input.ts:106-109`: **move** · _verified_

#### `src/core/input/input.ts`

Input facade: movement vector, action queue with TTL, taps (now with a TTL, audit input.ts:173), held states, automation hooks.

Plan: Input (core/input 148-360): move, override, update, consume, peekTaps, consumeTaps, clearPending, consumeAny, consumeContinue, applyControls, trigger, pushTap, setButton, isKeyDown, runHeld, runOn, clearRunLatch, guardHeld, actionHeld, attach. Public names that scripts read are kept: usingTouch, lastGesture, gestureZone, joystickZone, buttons, joystick, leftHanded, switcherWanted.

Entries (4):

- `Input` (class) from `src/core/input.ts:148-485`: **move** · _corrected by verifier_
  A facade that keeps every public name scripts and UI read: move, joystick, joystickZone, joystickEnabled, usingTouch, buttons, gestureZone, gesturesEnabled, gestureActions, runToggle, lastGesture, leftHanded, switcherWanted, override, runHeld, runOn, clearRunLatch, guardHeld, actionHeld, update, consume, peekTaps, consumeTaps, clearPending, applyControls, consumeAny, consumeContinue, trigger, pushTap, setButton, isKeyDown, attach. The zone, button and handedness fields stay here but have a single writer, core/input/touchLayout.applyTouchLayout. taps gains a TTL (audit input.ts:173). attach(el, toLogical) keeps its signature and must register on the global window and document at call time: input.test stubs them with vi.stubGlobal, calls attach and fires the 'keydown' and 'keyup' handlers. It may now return a detach function. The devices must not import input.ts, because a type-only import still counts as an intra-folder cycle. They receive narrow sink interfaces (trigger, fireGesture, pushTap, toggleRun) that Input satisfies structurally. Move it with `git mv core/input.ts core/input/input.ts` and add index.ts in the same commit, since input.ts would shadow the folder.
  Verifier: Correct the single-writer claim. touchLayout writes only joystickZone, gestureZone, joystickEnabled and gesturesEnabled (today touchControls.ts:181-182, 213-214) and the buttons (setButton). Handedness and the other CONTROLS fields (leftHanded, switcherWanted, runToggle, gestureActions) are written by Input.applyControls (306-312) from the settings listener (game.ts:37). touchControls only reads them (touchControls.ts:167, 203, 328). usingTouch must stay a plain writable field: screenshot.mjs:337 assigns it.
- `Input.clearPending (lastTap reset)` (method) from `src/core/input.ts:298-303`: **keep** · _added by verifier_
  Stays on Input, but once lastTap moves to PointerDevice it must call pointer.forgetTap(). Otherwise a tap before a scene change can complete a double tap in the next scene.
- `Input.applyControls` (method) from `src/core/input.ts:305-312`: **keep** · _added by verifier_
  The only writer of leftHanded, switcherWanted, runToggle and gestureActions; touchLayout must not write them. It uses gestureActionsFor from core/input/gestures (entry 95).
- `Input.fireGesture` (method) from `src/core/input.ts:332-337`: **move** · _verified_
  DEVIATION: the plan moves it to pointer.ts, but it stays on Input. tests/touchControls.test.ts:85 reaches in with `(input as unknown as { fireGesture(...) }).fireGesture('swipeUp', x, y)`. It also only mutates Input-owned state (gestureActions, runLatched, lastGesture, gestureSeq, trigger). pointer.ts calls it through the sink.

#### `src/core/input/keyboard.ts`

Keyboard device.

Plan: onKey (362-371), the held-key set, the keyboard movement vector (update 248-260), all driven by config KEY_BINDINGS.

Entries (2):

- `Input.onKey` (method) from `src/core/input.ts:171, 186-188, 362-371`: **split** as `class KeyboardDevice { readonly held: Set<string>; attach(onAction): () => void; release() }` · _verified_
  Takes the held-key set (171), the window keydown and keyup listeners (186-187), and the key half of the blur reset (188 calls releaseAll, which clears keys plus pointers, so blur calls both devices' release). It is driven by KEY_BINDINGS.ACTIONS and PREVENT_DEFAULT. Input.isKeyDown, runHeld, guardHeld and actionHeld read keyboard.held.
- `Input.update` (method) from `src/core/input.ts:250-263`: **split** as `KeyboardDevice.vector(out): boolean` · _verified_
  The keyboard movement vector with KEYBOARD_WALK_MAG or Shift. The TTL expiry (243-244) and the override branch (245-249) stay in Input.update, and the sources are read in the same order (override, then keyboard, then joystick, then zero).

#### `src/core/input/pointer.ts`

Pointer and touch device.

Plan: onPointerDown/Move/Up and releaseAll (373-484), the joystick dead-zone remap (262-276), fireGesture and inGestureZone (332-342).

Entries (5):

- `PointerTrack` (interface) from `src/core/input.ts:111-122`: **move** · _corrected by verifier_
  Private today, and used only by the pointer device. The plan puts it in types.ts; it could just as well stay unexported in pointer.ts.
  Before the correction: to `src/core/input/types.ts`.
  Verifier: It is private today (not exported) and only the pointer device uses it. Keep it unexported in pointer.ts. types.ts is the public input vocabulary that the barrel re-exports.
- `Input.onPointerDown+onPointerMove+onPointerUp+releaseAll` (method) from `src/core/input.ts:174-175, 181, 373-484`: **split** as `class PointerDevice` · _corrected by verifier_
  Button hit testing reads Input.buttons. The run toggle at 389 goes through sink.toggleRun. Gestures go through sink.fireGesture, and taps through sink.pushTap. The joystick state object stays Input.joystick, which scripts and the view read.
  Before the correction: newName `class PointerDevice (pointers, joystickPointer, lastTap; onDown/onMove/onUp/release)`.
  Verifier: Three shared-state details are missing from the sink. (1) Line 389 is not a toggle: `runLatched = runToggle ? !runLatched : false` (hold mode clears the latch). The sink method must be pressRunButton() with exactly that rule, not toggleRun(). (2) Line 376 writes Input.usingTouch, a public field scripts write too, so the sink needs markTouch(). (3) lastTap moves to the device, but Input.clearPending() (302) resets it on every scene change, so Input must call pointer.forgetTap(). releaseAll (477-484) also clears keys (478) and resets the pressed state of Input.buttons (483), so blur calls both devices plus the button reset.
- `Input.attach` (method) from `src/core/input.ts:189-201`: **split** as `PointerDevice.attach(el, toLogical): () => void` · _verified_
  Covers the canvas pointer listeners and the document preventDefault set (contextmenu, touchstart, touchmove, gesturestart, dblclick). Input.attach calls both devices and returns a combined detach.
- `Input.update` (method) from `src/core/input.ts:264-274`: **split** as `joystickVector(joystick, out): boolean` · _verified_
  The joystick dead-zone remap, with the arithmetic unchanged.
- `Input.inGestureZone` (method) from `src/core/input.ts:339-342`: **split** as `PointerDevice.inGestureZone(x, y)` · _verified_
  Verifier: It reads Input-owned gestureZone and gesturesEnabled, so PointerDevice needs a read view of those fields (passed in or held by reference).

#### `src/core/input/gestures.ts`

Pure gesture rules.

Plan: Gesture, GestureAction, GestureEvent, bindingAction, classifySwipe, isDoubleTap (core/input 37-84).

Entries (6):

- `Gesture` (type) from `src/core/input.ts:37`: **move** · _verified_
- `GestureAction` (type) from `src/core/input.ts:40`: **move** · _verified_
- `GestureEvent` (interface) from `src/core/input.ts:42-49`: **move** · _verified_
  It is the type of Input.lastGesture, which scripts and ui/touch/gestureHints read.
- `bindingAction` (function) from `src/core/input.ts:52-69`: **move** · _verified_
  Imports type GestureBinding from core/state/settings (legal: state sits below input). Add a gestureActionsFor(c: ControlSettings) beside it; applyControls (307) and the default at 161 both use it. tests/gestures imports it from '../src/core/input', which keeps working through the barrel.
- `classifySwipe` (function) from `src/core/input.ts:72-77`: **move** · _verified_
  Pure and tested (gestures.test, through the barrel).
- `isDoubleTap` (function) from `src/core/input.ts:80-84`: **move** · _verified_
  Pure and tested (gestures.test, through the barrel).

#### `src/core/input/touchLayout.ts`

The single owner of touch hit areas: a pure layout plus its one application to Input.

Plan: ButtonLayout and ActionMode (touchControls 10-31); TouchLayout, mirrorLayout and applyTouchLayout(input, layout, enabled), built from setLayout 164-199, setEnabled 206-217, configure 220-240 and applyMode 259-260; the MENU hit circle registered at hud 125 and story/ui 344.

Entries (8):

- `GameScene.resize (touch layout)` (method) from `src/scenes/gameScene.ts:159`: **split** as `applyTouchLayout(input, walkLayout(w, h), enabled)` · _verified_
  TouchControls (ui/touch) only draws from the layout, and core/input/touchLayout is the single writer of hit areas.
- `StoryHud.layout+setMenuEnabled` (MENU button registration) from `src/story/ui.ts:343-344, 374-377`: **split** as `TouchLayout.menu hit circle plus applyTouchLayout(input, layout, { menu: enabled })` · _not verified_
  This is the single hit-area writer (audit cat 4, ui.ts:333). StoryHud.setMenuEnabled keeps only the visibility of the burger and label. story/engine/controls calls applyTouchLayout for the enabled state.
- `Hud.layout(menu hit circle)+menuEnabled+setMenuEnabled` (method) from `src/ui/hud.ts:124-125, 139-146`: **split** as `applyMenuButton(input, { x, y, r }, enabled)` · _verified_
  The shared Input 'menu' button gets one writer (audit hud:98-191, cat. 4). GameScene calls it from resize and setUiEnabled (gameScene 154, 318). StoryHud's copy (story/ui 344) uses the same function. The geometry (x = w - MARGIN - 16, y = my + 8, r 16) comes from config/ui.ts HUD.MENU_BUTTON.
  Verifier: Shared state: Hud.menuEnabled (140) survives resizes (comment at 124). applyMenuButton is stateless, so the caller (TouchBinding or the scene) must own `enabled` across resize (gameScene 160), setControlsEnabled (154) and exit (318).
- `ButtonLayout` (interface) from `src/ui/touchControls.ts:10-24`: **move** · _verified_
- `ActionMode` (type) from `src/ui/touchControls.ts:31`: **move** · _verified_
  story/walk.ts:16 and storyScene.ts:15 import it type-only (story -> core/input is downward).
- `TouchControls.setLayout (mirroring, zones, hit circles)` (method) from `src/ui/touchControls.ts:167-182, 185-190`: **split** as `mirrorLayout(given, view, leftHanded): TouchLayout; class TouchBinding { setLayout(given, view) } which calls applyTouchLayout(input, layout, flags)` · _verified_
  Touch hit areas get one writer (audit touchControls:164-199 and 65-430, medium). The view positions (183-184, 187, 189, droplet arc 192-196) stay in ui/touch/touchControls as layoutView(layout).
  Verifier: Shared state: given, view, mirrored and layout are read by both the binding and the view, so the view should read binding.layout and binding.mirrored (entry 204). Config placement: INPUT.JOYSTICK_ZONE is read only at touchControls:180, which moves here into core/input. It defines the joystick's input zone, so it should stay in config/input.ts (TOUCH_LAYOUT), not go to config/ui.ts as the target says. GESTURE_FLASH (398, 410) is view-only and can go to ui.ts.
- `TouchControls.switchShown+setEnabled+configure+applyMode (Input writes)` (method) from `src/ui/touchControls.ts:202-204, 208-215, 224-233, 259-260`: **split** as `TouchFlags { on, pee, run, story, modeCount }; TouchBinding.setEnabled(on) / configure(opts) / setModeCount(n) applying button enabled and pressed, joystickEnabled, gesturesEnabled and clearRunLatch` · _verified_
  enabled is no longer derived from root.visible. switchShown becomes pure: flags.story && modeCount > 1 && input.switcherWanted. The owning scene (GameScene, StoryScene controls facade) calls TouchBinding and passes the same flags to the view.
  Verifier: storyExtras, peeVisible, runVisible and modeCount live in both the binding flags and the view. One owner (the scene, or a TouchBinding the view reads) must pass the same values to both, as the entry says. Callers: gameScene 153, storyScene 92-93, 273, 281, 300 and 318.
- `TouchControls.update (handedness re-layout)` (method) from `src/ui/touchControls.ts:328`: **split** as `TouchBinding.sync(input): re-mirrors and re-applies when input.leftHanded changes` · _verified_
  The scene calls it once per step before drawing. The view reads binding.layout.

#### `src/core/input/intent.ts`

Input controller: builds one PlayerIntent per step.

Plan: New PlayerIntent {mx, my, run, pee, action, bark, strike, guard} and intentFromInput(input, out), taken from rules 93-96, threats 62 and walk 273-291.

Entries (3):

- `GameScene.update (input reads)` (method) from `src/scenes/gameScene.ts:173-183`: **split** as `intentFromInput(input, out: PlayerIntent) built once per step; rules.update(dt, intent), threats.update(dt, intent); inactive -> player.setIntent(ZERO_INTENT)` · _corrected by verifier_
  consume('menu') stays in the scene. Keep the call order: beginStep, rules, threats, ambush, endStep, fx.
  Verifier: The reads are consumed only when the rules state allows it, and an eager intent would change that: - 'pee' is consumed at rules.ts:93, only after the `state !== 'playing'` early return (84-89). - 'action'/'bark' are consumed at threats.ts:62, only when state is still 'playing' after rules.update (gameScene 177). Building one intent with consume semantics before rules.update would eat presses while the level is ending, and a bark pressed in the step where the rules finish. Build the move and run part once per step, but consume pee and bark lazily: pee inside the playing branch, bark only when threats run. Otherwise the input queue no longer behaves the same.
- `Rules.update` (method) from `src/systems/rules.ts:93, 96`: **split** as `intentFromInput(input, out): out.pee = input.consume('pee'); out.mx/out.my = input.move.x/y; out.run = input.runHeld` · _verified_
  Today 'pee' is consumed only while state === 'playing'. GameScene should therefore build the intent after its 'menu' check and only while rules.state === 'playing', so presses during the exit delay are not eaten. They expire anyway at INPUT.ACTION_TTL (0.25 s), which is shorter than EXIT_DELAY (1.1 s), so behaviour does not change. Rules then reads intent.pee where it called consume('pee').
- `Threats.update` (method) from `src/systems/threats.ts:62`: **split** as `intentFromInput sets out.action = consume('action') and out.bark = consume('bark'); Threats tests intent.action || intent.bark` · _verified_
  consumeAny (input.ts:315-317) consumes every listed action, so two separate consumes drain the queue identically. Threats only runs while still playing after Rules.update. If the walk ends in the same step, the bark is dropped instead of staying queued for at most ACTION_TTL. That is harmless: the level-end card opens after EXIT_DELAY 1.1 s.
  Verifier: Verified: consumeAny consumes every listed action (input.ts:315-318). Threats runs only while rules.state === 'playing' after Rules.update (gameScene 177-180).

#### `src/core/audio/index.ts`

Barrel; '../src/core/audio' keeps resolving for audio.test.

Plan: Re-exports of engine, synth, files and patches.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/core/audio/engine.ts`

WebAudio engine. Kept whole: one graph.

Plan: MusicTrack, Clip, BusGains, busGains, AudioEngine, autoplayAllowed, leadingSilence (core/audio). Constants come from config/audio.

Entries (7):

- `MusicTrack` (type) from `src/core/audio.ts:10`: **move** · _verified_
  Built from FileMusicTrack, which now comes from ./files and no longer from fx/audioFiles.
- `Clip` (interface) from `src/core/audio.ts:12-16`: **move** · _verified_
- `BusGains` (interface) from `src/core/audio.ts:19-23`: **move** · _verified_
- `busGains` (function) from `src/core/audio.ts:30-37`: **move** · _verified_
  tests/audio.test imports it from '../src/core/audio', which resolves through the core/audio/index barrel.
- `AudioEngine` (class) from `src/core/audio.ts:47-324`: **move** · _verified_
  Kept whole (one WebAudio graph). `git mv src/core/audio.ts src/core/audio/engine.ts` and add index.ts in the same commit: a remaining audio.ts would shadow audio/index.ts. It imports SOUNDS, SoundName and SynthSoundName from ./patches, renderMedievalMusic from ./medievalMusic, SOUND_FILES and MUSIC_FILES from ./files, renderSound from ./synth, and type Settings from core/state/settings (state sits below audio). That removes the core to fx edges. The constructor's window and document listeners (64-77) stay: it is an app-lifetime singleton, and tests/audio.test stubs window. Script-visible members are kept: ready, loop, play, applySettings, playTrack, setDuck, musicPosition.
- `autoplayAllowed` (function) from `src/core/audio.ts:327-336`: **move** · _verified_
  It keeps its own window.Capacitor check. core/audio sits below core/app in the internal order, so it must not import core/app/native. If wanted, it may import @capacitor/core directly (Capacitor.isNativePlatform).
- `leadingSilence` (function) from `src/core/audio.ts:339-343`: **move** · _verified_

#### `src/core/audio/synth.ts`

Pure sfxr-style synth.

Plan: Wave, SfxDef, SfxPart, Sound, noiseGen, soundDuration, renderVoice, renderSound, noteFreq (core/synth).

Entries (9):

- `Wave` (type) from `src/core/synth.ts:6`: **move** · _verified_
  No clash: gameFx's own private `interface Wave` becomes BarkWave in entities/effects/barkWaves.
- `SfxDef` (interface) from `src/core/synth.ts:8-31`: **move** · _verified_
- `SfxPart` (interface) from `src/core/synth.ts:33-36`: **move** · _verified_
- `Sound` (type) from `src/core/synth.ts:38`: **move** · _verified_
  Its type importer core/audio/patches (from fx/sounds) is a sibling in the same folder. Dependency order: patches imports synth, never the reverse.
- `noiseGen` (function) from `src/core/synth.ts:41-49`: **move** · _verified_
  The xorshift shifts stay inline (algorithm constants).
- `soundDuration` (function) from `src/core/synth.ts:51-54`: **move** · _verified_
  The import in tests/synth.test.ts changes to core/audio/synth (or the core/audio barrel).
- `renderVoice` (function) from `src/core/synth.ts:57-107`: **move** · _verified_
  The voice defaults (volume 0.5, duty 0.5; 66-67) stay inline. They are the documented SfxDef semantics every patch relies on, and extracting them would make a config edit silently change every synthesized sound.
- `renderSound` (function) from `src/core/synth.ts:110-116`: **move** · _verified_
  The per-part noise seeds 7 + i (112) stay inline: they keep the renders bit-identical.
- `noteFreq` (function) from `src/core/synth.ts:119-125`: **move** · _verified_
  A4 = 440 and the semitone table stay inline. Readers: core/audio/patches and medievalMusic (from fx/sounds) and synth.test.

#### `src/core/audio/files.ts`

Recorded audio manifest.

Plan: SOUND_FILES, FileSoundName, MUSIC_FILES, FileMusicTrack (fx/audioFiles). The 17 ?url paths gain one '../'. AUDIO.FILE_GAIN and MUSIC_FILE_GAIN are checked here with `satisfies`.

Entries (5):

- `inline: 17 ?url recorded-audio imports` (inline) from `src/fx/audioFiles.ts:1-17`: **move** · _verified_
  These are asset imports, not config. Each path gains one '../' ('../../../assets/music/...', '../../../assets/sounds/...'). tests/layers.test.ts must treat '?url' specifiers that resolve outside src/ as assets, not as a layer.
- `SOUND_FILES` (const) from `src/fx/audioFiles.ts:23-48`: **move** · _verified_
  Removes the core->fx inversion (core/audio.ts:2). tests/audio.test.ts imports '../src/fx/audioFiles': change it to '../src/core/audio/files' (or the core/audio barrel) in the same commit. AUDIO.FILE_GAIN is checked here with `satisfies Partial<Record<FileSoundName, number>>`. ASSETS.md 194-195 and 268 and CLAUDE.md 136 name this path. The doc comment's 'fx/sounds.ts' becomes core/audio/patches.ts.
  Verifier: Lines 23-48 verified. tests/audio.test.ts:7 imports '../src/fx/audioFiles'; core/audio.ts:2 is the core->fx edge. ASSETS.md 194-195 and 268 and CLAUDE.md 136 confirmed. AUDIO.FILE_GAIN is cast today as `as Partial<Record<string, number>>` (config 560); drop that cast so the `satisfies` check in files.ts actually checks something.
- `FileSoundName` (type) from `src/fx/audioFiles.ts:50`: **move** · _verified_
  Type-imported by core/audio/patches.ts (sideways inside core/audio) and core/audio/engine.ts.
- `MUSIC_FILES` (const) from `src/fx/audioFiles.ts:53-64`: **move** · _verified_
  AUDIO.MUSIC_FILE_GAIN is checked here with `satisfies Partial<Record<FileMusicTrack, number>>` (config cannot import the union).
  Verifier: MUSIC_FILE_GAIN carries the same `as Partial<Record<string, number>>` cast (config 557). Drop it so the check works.
- `FileMusicTrack` (type) from `src/fx/audioFiles.ts:66`: **move** · _verified_

#### `src/core/audio/patches.ts`

Synth patch table and sound-name union (audio data).

Plan: SOUNDS, SynthSoundName, SoundName (fx/sounds 8-63).

Entries (4):

- `SOUNDS` (const) from `src/fx/sounds.ts:8-59`: **move** · _verified_
  Built at import time with noteFreq from core/audio/synth (pure). tests/audio.test.ts and tests/synth.test.ts import '../src/fx/sounds': change to '../src/core/audio/patches' in the same commit. ASSETS.md:299 names the path.
  Verifier: Imports verified: tests/audio.test.ts:8 and tests/synth.test.ts:3 use '../src/fx/sounds', and ASSETS.md:299 names the path. CLAUDE.md:138 also names fx/sounds.ts.
- `inline: synth patch data` (inline) from `src/fx/sounds.ts:9-58`: **move** · _verified_
  Audio data, kept out of config (CONFIG PLAN).
- `SynthSoundName` (type) from `src/fx/sounds.ts:61`: **move** · _verified_
- `SoundName` (type) from `src/fx/sounds.ts:63`: **move** · _verified_
  Imports type FileSoundName from ./files (sideways inside core/audio). The story effects facade's sound(name: SoundName) type-imports it (story to core is downward).

#### `src/core/audio/medievalMusic.ts`

Procedural dream music.

Plan: renderMedievalMusic (fx/sounds 69-111).

Entries (2):

- `renderMedievalMusic` (function) from `src/fx/sounds.ts:69-111`: **move** · _verified_
  tests/synth.test.ts imports it: change to '../src/core/audio/medievalMusic', which the target does not list in the core/audio barrel. Called from core/audio/engine (audio.ts:292).
  Verifier: Verified: tests/synth.test.ts:3 and :34, and core/audio.ts:292.
- `inline: medieval loop tempo, melody, voices, soft clip` (inline) from `src/fx/sounds.ts:70-109`: **move** · _verified_
  Musical content, which stays with the renderer.

#### `src/core/assets/index.ts`

Texture registry, moved with `git mv core/assets.ts core/assets/index.ts` so vi.mock('../src/core/assets') still resolves.

Plan: TextureRegistry (adds delete and deleteMany), textures, tryLoadTexture, subTexture (core/assets 9-32, 106-122).

Entries (4):

- `TextureRegistry` (class) from `src/core/assets.ts:9-30`: **move** · _corrected by verifier_
  Use `git mv src/core/assets.ts src/core/assets/index.ts`, so vi.mock('../src/core/assets') in sbrimbrulonActor.test:21 and touchControls.test:80 still resolves. It gains delete(name) and deleteMany(names), which the AtlasHandle and environment bank swaps use. No file imports the class by name.
  Verifier: A plain delete(name)/deleteMany(names) invites the bug described in entry 59. Add an ownership-aware removal instead: release(names, sources) deletes a name only while map.get(name).source is one of `sources`, plus a non-warning peek(name). get() warns and returns Texture.WHITE on a miss, so it cannot be used for that test.
- `textures` (const) from `src/core/assets.ts:32`: **move** · _verified_
  A module singleton with 23 src importers. Their specifier '…/core/assets' is unchanged: only files that themselves move get new relative paths.
- `tryLoadTexture` (function) from `src/core/assets.ts:106-113`: **move** · _verified_
  Its only caller is assets/build, which moves to core/assets/spriteTextures and characterTextures.
- `subTexture` (function) from `src/core/assets.ts:116-122`: **move** · _verified_
  Its only caller is assets/build.

#### `src/core/assets/atlas.ts`

Shelf packer and atlas ownership.

Plan: AtlasEntry, packAtlas, nextPow2 (core/assets 34-103); new AtlasHandle {names, sources, destroy()}, which also unregisters its names (fixes the stale floorArt_\* entries, audit assets.ts:14).

Entries (4):

- `buildLevelTextures.eviction` from `src/assets/build.ts:199-200`: **split** as `AtlasHandle.destroy() (levelTextures: while (paletteAtlases.length > LEVEL_ATLASES_KEPT) paletteAtlases.shift()!.destroy())` · _not verified_
  Care: newer atlases re-register most of the same names. destroy() must unregister only names whose registered Texture's source is one of this handle's sources, then destroy those sources. This drops the stale floorArt_\* entries of an evicted zone (audit core/assets.ts:14) without deleting names the live atlas owns.
- `AtlasEntry` (interface) from `src/core/assets.ts:34-39`: **move** · _verified_
  tests/environment.test.ts:3 does `import type { AtlasEntry } from '../src/core/assets'`: point it at core/assets/atlas in the same commit. index.ts must NOT re-export atlas.ts, because atlas imports the registry type from index, giving an intra-folder (type) cycle that the layer test rejects. The alternative is a structural TextureSink {set, delete} declared in atlas.ts. Its src importers, assets/build and assets/environment, become levelTextures, spriteTextures, characterTextures and environment/\*.
- `packAtlas` (function) from `src/core/assets.ts:48-97`: **move** as `packAtlas(entries, registry, label): AtlasHandle` · _corrected by verifier_
  It now imports PixelBuffer from core/assets/pixelBuffer, which removes today's core to assets/placeholders inversion. The returned handle's destroy() also unregisters the names (audit assets.ts:14, the stale floorArt_\*). Its one caller, build.ts:199-200, which destroys a palette's sources two builds later, changes in the same commit (to levelTextures, paletteAtlases: AtlasHandle[]).
  Before the correction: newName `packAtlas(entries, registry, label): AtlasHandle {names, sources, destroy()}`.
  Verifier: (1) packAtlas has three callers, not one: build.ts:75 ('cast', in ensureCharacters), :137 ('global') and :199 ('level'). Only :199 keeps the result. (2) BUG in the handle: successive palette atlases register the SAME names (`${kind}_${v}`, spriteName for props, plus pole_0, fountain_0 and exitFlag_0, which also overwrite the global atlas's entries; build.ts:177-198). When palette N's handle is destroyed two builds later (build.ts:200), unregistering all its names would delete the live textures of palettes N+1 and N+2, and the current level would render Texture.WHITE. destroy() must unregister only the names still mapped to one of its own sources, through registry.release(names, sources). That still clears the stale floorArt_\* entries the audit names.
- `nextPow2` (function) from `src/core/assets.ts:99-103`: **move** · _verified_
  A private helper with a single caller (packAtlas). It is not worth a core/util or core/math module.

#### `src/core/assets/pixelBuffer.ts`

CPU raster buffer. Moving it here removes the core-to-assets/placeholders inversion.

Plan: PixelBuffer (placeholders/pixel 44-169). flippedX and silhouette dropped (unused).

Entries (1):

- `PixelBuffer` (class) from `src/assets/placeholders/pixel.ts:44-169`: **move** · _not verified_
  This removes the core -> assets/placeholders inversion (core/assets.ts:2: packAtlas blits and calls toCanvas). toCanvas stays a method: DOM is allowed in L4. tests/environment.test.ts:4 and tests/tileArt.test.ts:2 import it from the old path: repoint them, or leave a shim at src/assets/placeholders/pixel.ts until cleanup.

#### `src/core/assets/crisp.ts`

Shared crisp downscale and alpha threshold.

Plan: The halving downscale (titleArt 42-73) and the alpha cut (titleAnim makeFrame 146-163, pixelFont 70/96), with ALPHA_CUT from config/art.

Entries (4):

- `smooth2d` (function) from `src/ui/titleAnim.ts:98-103`: **move** · _corrected by verifier_
  Before the correction: to `src/core/assets/animatedImage.ts`.
  Verifier: smooth2d is the same smoothing setup that titleArt repeats (54-56, 63-65). Put it in crisp.ts, the lower helper, and have animatedImage import it. If it stays in animatedImage, crisp's crispScale needs it too, and crisp would import animatedImage while animatedImage imports crisp (entry 185). That is an intra-folder cycle the layer test rejects.
- `canvas` (function) from `src/ui/titleAnim.ts:105-110`: **move** · _corrected by verifier_
  core/assets/crisp.ts may import it, or keep its own copy, to build the halving canvases.
  Before the correction: to `src/core/assets/animatedImage.ts`.
  Verifier: 'crisp.ts may import it' creates a cycle. animatedImage.makeFrame imports crispAlpha from crisp (entry 185), so crisp importing canvas() from animatedImage makes core/assets/crisp &lt;-> animatedImage, which tests/layers.test.ts fails on. Move canvas() into crisp.ts. animatedImage (cropBox, makeFrame) and logoArt (via crispScale) import it from there.
- `makeFrame (crisp alpha threshold)` (function) from `src/ui/titleAnim.ts:159-161`: **split** as `crispAlpha(ctx, w, h, cut = ALPHA_CUT)` · _verified_
  Shared with logoArt's titleTexture (67-69).
  Verifier: crisp.ts must import only config (ALPHA_CUT) and DOM, never animatedImage or logoArt (see entries 181-182).
- `titleTexture (halving downscale and alpha cut)` (function) from `src/ui/titleArt.ts:46-69`: **split** as `crispScale(img, width): HTMLCanvasElement (halving steps + crispAlpha)` · _verified_

#### `src/core/assets/animatedImage.ts`

WebCodecs portrait decoder with a disposable per-width cache (audit titleAnim 49-64, overlays 228-229).

Plan: TitleFrames, TITLE_GIF_URL, DecodedImage, ImageDecoderLike, ImageDecoderCtor, cache (plus evict and dispose), titleFrames, smooth2d, canvas, cropBox, makeFrame, decodeInto (ui/titleAnim minus TitlePlayer). The ?url path is rebased.

Entries (10):

- `TitleFrames` (interface) from `src/ui/titleAnim.ts:18-30`: **move** · _verified_
  ui/screens/title/titlePortrait and TitleScene import it type-only.
- `DecodedImage` (type) from `src/ui/titleAnim.ts:35`: **move** · _verified_
- `ImageDecoderLike` (interface) from `src/ui/titleAnim.ts:36-41`: **move** · _verified_
- `ImageDecoderCtor` (type) from `src/ui/titleAnim.ts:42`: **move** · _verified_
- `cache` (const) from `src/ui/titleAnim.ts:49`: **move** · _verified_
  Gains evict(width) and dispose(), which destroy the frame textures. titlePortrait releases the widths it no longer shows (audit titleAnim:49-64, medium: each width refetches 3 MB and decodes 110 frames).
- `titleFrames` (function) from `src/ui/titleAnim.ts:52-64`: **move** · _verified_
  Called by bootstrap's pre-decode (today main.ts:46, now with the height cap, audit main.ts:46) and by titlePortrait's layoutDog.
- `cropBox` (function) from `src/ui/titleAnim.ts:113-143`: **move** · _verified_
  Reads TITLE.DOG_CROP_MARGIN and PORTRAIT_PROBE from config.
- `makeFrame` (function) from `src/ui/titleAnim.ts:146-163`: **move** · _verified_
  Builds the texture through CanvasSource instead of Texture.from, so Pixi's global Cache does not keep every frame (audit titleAnim:162).
- `inline: 2x intermediate resize` (inline) from `src/ui/titleAnim.ts:151`: **move** · _verified_
  An algorithm constant (supersampling), kept inline.
- `decodeInto` (function) from `src/ui/titleAnim.ts:165-208`: **move** · _verified_
  The ?url import (line 4) is rebased to '../../../assets/starting-page-images/app/Zampano-Samemala-4.webp?url'. ASSETS.md:306 and 324 and CLAUDE.md:93 name titleAnim.ts.

#### `src/core/assets/logoArt.ts`

Loader for the 'You've been supervillained' logo, renamed from titleArt because it serves the level-end snap.

Plan: TitleArt, loading, loadImage, loadTitleArt, cache (plus evict), titleTexture (ui/titleArt).

Entries (6):

- `TitleArt` (interface) from `src/ui/titleArt.ts:10-12`: **move** · _verified_
  The file is renamed because it serves the level-end snap (supervillainedScene), not the title. CLAUDE.md:93 names titleArt.ts.
- `loading` (let) from `src/ui/titleArt.ts:14`: **move** · _verified_
- `loadImage` (function) from `src/ui/titleArt.ts:16-23`: **move** · _verified_
- `loadTitleArt` (function) from `src/ui/titleArt.ts:26-34`: **move** · _verified_
  The function name is kept (bootstrap awaits it, today main.ts:43; supervillainedScene:53 calls it). Renaming it to loadLogoArt is optional at cleanup.
  Verifier: Callers verified: main.ts:43 and supervillainedScene.ts:53.
- `cache` (const) from `src/ui/titleArt.ts:36`: **move** · _verified_
  Gains evict(), and textures are built via CanvasSource (audit titleArt:36-72, low).
- `titleTexture` (function) from `src/ui/titleArt.ts:42-73`: **move** · _verified_
  Keeps the cache lookup and the texture creation; the raster work moves to crisp.ts. The ?url import (line 2) is rebased to '../../../assets/starting-page-images/Youve_Been_Supervillained_Logo.png?url'.

#### `src/core/assets/fonts/PressStart2P.woff2 (+ OFL.txt)`

Bundled font file.

Plan: src/assets/fonts/\*.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/core/assets/manifest/animations.ts`

Clip names, timing and frame maths (pure).

Plan: ANIMS, AnimName, AnimDef, timedAnimation, ZAMPANO_ANIMS, CAST_ANIMS, FULL_SET_KEYS (manifest 15-221); animationDuration, animationFrame (animationTiming); cycleFrame (minigames/action 15-18).

Entries (10):

- `animationDuration` (function) from `src/assets/animationTiming.ts:3-5`: **move** · _not verified_
  Pure; it sits beside AnimDef. src importers (entities/actor, entity, zampano, spriteViewerScene, story/minigames/action, systems/ambush; the L3->L2 edge is legal) import manifest/animations directly. tests/sprites, bagnaskizAnimations, sbrimbrulon and sbrimbrulonActor import '../src/assets/animationTiming'. Leave a temporary `export *` shim at that path, or repoint the 4 tests in the same commit.
- `animationFrame` (function) from `src/assets/animationTiming.ts:8-23`: **move** · _not verified_
  Hot path: CharacterAnimator calls it every fixed step. entities/animation/animationState.advance(dt) compares the result with the last frame and reports a change, so the texture-name lookup happens only on a change (audit manifest.ts:370). The arithmetic stays the same, so stepped screenshots do not drift.
- `ANIMS` (const) from `src/assets/manifest.ts:15`: **move** · _not verified_
  src/assets/manifest.ts becomes an `export *` shim of core/assets/manifest/index (plus systems/campaign/costumes while tests/pixelCast reads them there) until ASSETS.md and CLAUDE.md point at the new folder. 7 tests import this path.
- `AnimName` (type) from `src/assets/manifest.ts:16`: **move** · _not verified_
- `AnimDef` (interface) from `src/assets/manifest.ts:21-27`: **move** · _not verified_
- `timedAnimation` (function) from `src/assets/manifest.ts:29-33`: **move** · _not verified_
- `ZAMPANO_ANIMS` (const) from `src/assets/manifest.ts:190-203`: **move** · _not verified_
  Exported (for characters.ts castDefs and CHARACTERS). The clip timing is manifest data, not config.
- `CAST_ANIMS` (const) from `src/assets/manifest.ts:211-215`: **move** · _not verified_
  Exported for characters.ts.
- `FULL_SET_KEYS` (const) from `src/assets/manifest.ts:218-221`: **move** · _not verified_
  Per the target. It stays a ReadonlySet&lt;string>: typing it as CastKey would need animations -> characters while characters -> animations (a cycle). Only castDefs reads it.
- `cycleFrame` (function) from `src/story/minigames/action.ts:15-18`: **move** · _not verified_
  Pure over CHARACTERS (manifest/characters, same layer).

#### `src/core/assets/manifest/characters.ts`

Character definitions (pure data).

Plan: SHEET_DIRS (alias of DIRS8), CharacterDef, CAST_KEYS, CastKey, CharacterKey, tired, DELIVERED, castDefs, CHARACTERS (manifest 19-287); SpecialFigure, Who, SPECIAL_FRAMES (actor 13-38); SPECIALS (storyScene 39); a per-entry gestureSlot flag that replaces HUMAN_GESTURE_KEYS (dialogueGestures 4-7).

Entries (18):

- `SHEET_DIRS` (const) from `src/assets/manifest.ts:19`: **move** as `export const SHEET_DIRS: readonly Dir8[] = DIRS8` · _not verified_
  Same order as DIRS8 (iso/projection.ts:61). This is a value import of core/math (L2->L1, legal). The delivered PNGs' row order is a contract: keep a literal ['N','NE','E','SE','S','SW','W','NW'] assertion in tests/sprites.test.ts, so a reorder of DIRS8 fails a test instead of misreading every sheet.
- `CharacterDef` (interface) from `src/assets/manifest.ts:35-52`: **move** · _not verified_
  May gain the per-entry gestureSlot flag that replaces HUMAN_GESTURE_KEYS (target).
- `CAST_KEYS` (const) from `src/assets/manifest.ts:66-116`: **move** · _not verified_
- `CastKey` (type) from `src/assets/manifest.ts:117`: **move** · _not verified_
- `CharacterKey` (type) from `src/assets/manifest.ts:118`: **move** · _not verified_
- `tired` (const) from `src/assets/manifest.ts:151`: **move** · _not verified_
- `DELIVERED` (const) from `src/assets/manifest.ts:157-184`: **move** · _not verified_
  Delivered PNG paths belong to the ASSETS.md workflow, not config.
- `castDefs` (function) from `src/assets/manifest.ts:224-249`: **move** · _not verified_
  The 40x40 frame and anchor (20, 36) stay as manifest data. The placeholder drawer reads them from the CharacterDef (see critters/spec).
- `CHARACTERS` (const) from `src/assets/manifest.ts:251-287`: **move** · _not verified_
  Computed at import (pure).
- `SpecialFigure` (type) from `src/entities/actor.ts:13`: **move** · _verified_
  Pure sprite-identity data; manifest is L2 so story (steps, storyScene) and entities keep importing it downward. Leave `export type { SpecialFigure, Who } from '../core/assets/manifest/characters'` in entities/actor.ts until story/steps and storyScene move.
- `Who` (type) from `src/entities/actor.ts:14`: **move** · _verified_
  Union of CharacterKey | SpecialFigure; both now live in characters.ts. Importers: story/steps.ts:6, story/storyScene.ts:9 (type-only). systems/story/dialogueGesture reads actor.who through DialogueGestureTarget and can name Who from the manifest (L2 &lt; L3).
- `SPECIAL_FRAMES` (const) from `src/entities/actor.ts:38`: **move** as `SPECIAL_FRAMES (derived: SPRITES[s].variants)` · _corrected by verifier_
  The values {legs 4, fortune 2, falcon 2, stag 1} equal SPRITES.legs/fortune/falcon/stag.variants (manifest.ts:343-346). Derive the values from SPRITES instead of repeating them, so the two tables cannot drift. Consumed by entities/animation/figureSprite.ts.
  Verifier: Values confirmed equal to SPRITES.legs/fortune/falcon/stag.variants, but those are manifest.ts:342-345, not 343-346. characters.ts would then import SPRITES from manifest/sprites.ts (sideways inside manifest; fine as long as sprites.ts never imports characters.ts). Simpler option: FigureSprite reads SPRITES[s].variants directly and SPECIAL_FRAMES disappears.
- `inline special-figure test (who === 'legs' || 'fortune' || 'falcon' || 'stag')` (inline) from `src/entities/actor.ts:83`: **merge** as `isSpecialFigure(who): who is SpecialFigure` · _added by verifier_
  Duplicates storyScene.ts:39 SPECIALS, which the target moves to characters.ts. One type guard serves the Actor constructor, story/engine/stage (addActor's ensureCharactersNow at 218) and FigureSprite.
- `inline: character cull box` (inline) from `src/entities/actor.ts:100`: **move** as `CharacterDef.cullBox (default {x:-15, y:-32, w:30, h:35})` · _verified_
  The box is not derivable from frameW/H and anchor (40x40), so deriving it would change culling and occlusion. Add an explicit optional cullBox to CharacterDef with the current literal as the dog default, so Entity.cullBox is read from the def and screenshots stay identical. The figure boxes {-16,-h,32,h+4} come from FIGURE_VIEW.height.
- `inline: cat and pug cull boxes` (inline) from `src/entities/critters.ts:26, 124`: **move** as `CharacterDef.cullBox: cat {-12,-24,24,26}; bagnaskiz uses the dog default {-15,-32,30,35}` · _verified_
- `inline: player cull box` (inline) from `src/entities/zampano.ts:95`: **move** as `CharacterDef.cullBox (dog default {-15,-32,30,35})` · _verified_
  Same default as actors and Bagnaskiz. It is the player rect used by World's occlusion test, so the value must stay identical.
- `HUMAN_GESTURE_KEYS` (const ReadonlySet) from `src/story/dialogueGestures.ts:4-7`: **merge** as `CharacterDef.gestureSlot?: 'bark' set on the 15 entries (via DELIVERED/castDefs)` · _not verified_
  Folded into the CHARACTERS table. All 15 keys (professor ... greek) are in CAST_KEYS (manifest.ts:66-115), so they are CharacterKeys and the flag fits the def. tests/dialogueGestures.test.ts:33-41 expects 'doge', 'zampano', 'sbrimbrulon' and 'bagnaskiz' to return false, so only these 15 entries get the flag.
- `SPECIALS` (const Set) from `src/story/storyScene.ts:39`: **move** as `SPECIALS, derived from the SPECIAL_FRAMES keys (actor 13-38), which move to the same file` · _not verified_
  It is pure art data. Deriving it from SPECIAL_FRAMES removes the second hand-kept list.

#### `src/core/assets/manifest/sprites.ts`

Non-character sprite definitions: the table ASSETS.md tells artists to edit.

Plan: SpriteDef, SPRITES, SpriteKey, TILE_VARIANTS, RUN_ICON (manifest 54-63, 187, 289-387); PROP_SPRITE (world/tiles 92-116) and PICKUP_SPRITE (walk 99-106), keyed by plain strings here and checked against PropKind and the pickup kinds at their use sites; story tile variant counts (build 188, mapRenderer 137-155).

Entries (11):

- `buildLevelTextures.variantCounts` from `src/assets/build.ts:179, 188`: **split** as `PATH_MASKS = 16; STORY_TILE_VARIANTS = { floor 3, stone 3, sand 3, snow 3, deep 2, dock 3, carpet 3, wallBase 1 }` · _not verified_
  Beside TILE_VARIANTS. mapRenderer's `Math.floor(h * 3)` (137-155) reads the same table, so the counts cannot drift between builder and renderer.
- `SpriteDef` (interface) from `src/assets/manifest.ts:54-63`: **move** · _not verified_
- `RUN_ICON` (const) from `src/assets/manifest.ts:187`: **move** · _not verified_
  tests/sprites.test.ts imports it.
- `SPRITES` (const) from `src/assets/manifest.ts:289-366`: **move** · _not verified_
  The table ASSETS.md tells artists to edit (kept whole). The placeholder registry asserts each drawer's size against it.
- `SpriteKey` (type) from `src/assets/manifest.ts:368`: **move** · _not verified_
- `TILE_VARIANTS` (const) from `src/assets/manifest.ts:379-387`: **move** · _not verified_
  Joined by PATH_MASKS and STORY_TILE_VARIANTS (from build 179/188). tileName() in names.ts reads it.
- `inline: ball cull box` (inline) from `src/entities/critters.ts:89`: **move** as `SpriteDef.cullBox (ball {-5,-14,10,16})` · _verified_
  Not derivable from SPRITES.ball (9x9, anchor 4,8) because of the bounce height, so it is an explicit optional field. PropEntity keeps deriving its box from w/h/anchor.
- `inline: treat and poop cull boxes` (inline) from `src/entities/items.ts:20, 56`: **move** as `SpriteDef.cullBox: treat {-7,-14,14,16}, poop {-5,-9,10,10}` · _verified_
- `PICKUP_SPRITE` (const) from `src/story/walk.ts:99-106`: **move** · _not verified_
  Keyed by plain strings in the manifest. It is checked at its use site, story/walk/objectives/pickups.ts, with `PICKUP_SPRITE satisfies Record<Pickup['kind'], SpriteKey | null>`. The walk resolves the sprite key and passes it to the entity.
- `inline: story tile variant counts and the rare grass variant` (inline) from `src/world/mapRenderer.ts:119, 137-155, 170, 201`: **move** as `TILE_VARIANTS += {floor 3, stone 3, sand 3, snow 3, dock 3, carpet 3, deep 2, wallBase 1}; GRASS_RARE {variant: TILE_VARIANTS.grass - 1, chance: 0.1}` · _corrected by verifier_
  Art data, so it stays out of config (decision). assets/build.ts:188 shares the same counts, so they are written once.
  Before the correction: newName `TILE_VARIANTS += {floor: 3, stone: 3, sand: 3, snow: 3, dock: 3, carpet: 3, deep: 2}; GRASS_RARE {variant: 3, chance: 0.1}`.
  Verifier: wallBase: 1 is missing. build.ts:188 reads `kind === 'deep' ? 2 : kind === 'wallBase' ? 1 : 3`, and mapRenderer.ts:158 uses 'wallBase_0'. Without it, build.ts cannot read all its counts from TILE_VARIANTS. Derive the rare grass variant from the existing TILE_VARIANTS.grass = 4 instead of a second literal 3.
- `PROP_SPRITE` (const) from `src/world/tiles.ts:92-116`: **move** as `PROP_SPRITE: Record<string, {key: SpriteKey; variants: number}>` · _corrected by verifier_
  The manifest (L2) may not import PropKind (L3), so the table is keyed by plain strings and checked at its use site: entities/stageDressing does `PROP_SPRITE satisfies Record<PropKind, unknown>` (or a typed accessor). Its only reader today is world.ts:58/197. Typing `key` as SpriteKey removes the `as SpriteKey` cast at world.ts:60.
  Verifier: Typing bug. Declaring it `: Record<string, {key: SpriteKey; variants: number}>` erases the literal keys, so the proposed `PROP_SPRITE satisfies Record<PropKind, unknown>` would always fail (an index-signature type lacks the required PropKind properties). Declare it `{...} as const satisfies Record<string, {key: SpriteKey; variants: number}>` so the keys stay literal, then check completeness at the use site. Better still, the table is redundant: all 23 entries map a kind to the same-named SPRITES key, and each variants value equals SPRITES[kind].variants (checked against manifest.ts:291-338). stageDressing could use SPRITES[kind] with a compile-time `PropKind extends SpriteKey` check and delete PROP_SPRITE. world.ts:59 then uses the same variant counts, so the hash2 picks are unchanged.

#### `src/core/assets/manifest/names.ts`

The texture-name contract, with precomputed name tables (no per-step string allocation, audit manifest.ts:370).

Plan: textureName, spriteName (manifest 370-376); new tileName(kind, variant, mask?), which replaces the hand-built names at build 175-182 and mapRenderer 122-242; frameNames(key) per-character tables.

Entries (4):

- `buildLevelTextures.tileNames` from `src/assets/build.ts:174-182, 189`: **split** as `tileName(kind, variant, mask?): string (precomputed table)` · _not verified_
  One owner for grass_/tallGrass_/water_/forest_/path_${m}_${v}/dirt_/fresh_0/exitRing_0/${storyKind}_${v}. core/stage/mapRenderer (122-242 today) uses the same helper. The `tile` closure keeps anchorX = TW/2.
- `textureName` (function) from `src/assets/manifest.ts:370-372`: **move** · _not verified_
  Kept for one-off callers (sprite viewer, dialogue portrait, sheet slicing). Per-step paths use the new frameNames(key)[anim][dir][frame] table, built once per character, so no template string is allocated per step (audit manifest.ts:370).
- `spriteName` (function) from `src/assets/manifest.ts:374-376`: **move** · _not verified_
  Backed by a precomputed per-SpriteKey variant table (flames, popups, particles call it per step today). Same returned strings.
- `MapRenderer.makeTile` (method) from `src/world/mapRenderer.ts:111-172`: **split** as `tileName(kind, variant, mask?)` · _corrected by verifier_
  Only the texture-name strings move: `grass_${n}`, `path_${mask}_${v}`, `deep_0`, `wallBase_0` and the variant counts (see the variants entry). The Ground switch, the path autotile mask and the hash2 picks stay in MapRenderer.makeTile. The same helper replaces the hand-built names at assets/build.ts:175-182.
  Before the correction: lines `113-162`; newName `tileName(kind: string, variant: number, mask?: number): string (precomputed tables)`.
  Verifier: The method spans 111-172, and the name strings are built at 119-158. TILE_VARIANTS.grass is already 4 (manifest.ts:381): the rare variant 3 picked when h &lt; 0.1 is the fourth, so tileName needs no extra grass count.

#### `src/core/assets/manifest/index.ts`

Manifest barrel. src/assets/manifest.ts stays as a re-export shim until ASSETS.md and CLAUDE.md are updated.

Plan: Re-exports of animations, characters, sprites and names.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/core/assets/characterTextures.ts`

Character textures, at boot and on demand.

Plan: BOOT_CHARACTERS, builtCharacters, NEW_ONLY_ANIMS, characterEntries, ensureCharacters, loadCharacterSheet (build 37-76, 203-233); a new explicit ensureCharactersSync, which makes the hidden synchronous contract of storyScene.ensureCharactersNow explicit.

Entries (7):

- `BOOT_CHARACTERS` (const) from `src/assets/build.ts:37-39`: **move** · _not verified_
  Computed at import from CHARACTERS (pure). The 'zampano','bagnaskiz','cat' keys are asset data, not config.
- `builtCharacters` (const) from `src/assets/build.ts:40`: **move** · _not verified_
  App-lifetime cache; the 'cast' atlas is never destroyed, on purpose (the audit finding build.ts:75 was rejected).
- `NEW_ONLY_ANIMS` (const) from `src/assets/build.ts:43`: **move** · _not verified_
- `characterEntries` (function) from `src/assets/build.ts:45-62`: **move** · _not verified_
  The `CAST_SPECS[def.key]!` assertion goes once CAST_SPECS is Record&lt;CharacterKey, CritterSpec>. Names come from the manifest/names frameNames(key) table instead of a per-frame textureName string. The loop order (anim, dir, frame) is kept, so the atlas layout is identical.
- `ensureCharacters` (async function) from `src/assets/build.ts:65-76`: **move** · _not verified_
  Hidden contract: storyScene.ensureCharactersNow depends on this running synchronously up to packAtlas when no sheet is awaited. Add an explicit `ensureCharactersSync(keys)`: it builds and packs procedural keys now and warns if a sheet key is not built yet (every sheet character is built at boot). ensureCharacters stays async for the sheet path. Callers: story/steps 321, story/ui 142, story/minigames/action 63/273, storyScene 180/218 (which uses the Sync variant from story/engine/stage), and main.ts 56 (moves to core/flow/urlParams). The two share one per-key helper with bootCharacterEntries.
- `buildGlobalTextures.bootCharacters` from `src/assets/build.ts:96-102`: **split** as `async function bootCharacterEntries(): Promise<AtlasEntry[]>` · _not verified_
  Removes the copy of ensureCharacters' per-key body: one shared helper. The returned entries still go into the 'global' atlas (not 'cast'), at the head of the entry list.
- `loadCharacterSheet` (async function) from `src/assets/build.ts:203-233`: **move** · _not verified_
  Slices with the SHEET_DIRS row order and names frames through frameNames(def.key). The idle-fallback rules are unchanged.

#### `src/core/assets/spriteTextures.ts`

Global boot atlas and sprite strips.

Plan: sprite, loadSpriteStrip, buildGlobalTextures (minus its drawer table and the environment preload, which moves to bootstrap), loadRunIcon, runIconTexture (build 79-138, 235-242).

Entries (5):

- `runIconTexture` (function) from `src/assets/build.ts:79-81`: **move** · _not verified_
  tests/touchControls.test.ts does vi.mock('../src/assets/build', ...runIconTexture). Change that mock to '../src/core/assets/spriteTextures' in the same commit that moves ui/touch (mocks never rely on shims). Consumer: ui/touch/touchControls.
- `loadRunIcon` (async function) from `src/assets/build.ts:83-87`: **move** · _not verified_
  The registry name 'runIcon_0' could become a constant in manifest/names, next to RUN_ICON.
- `sprite` (function) from `src/assets/build.ts:89-91`: **move** · _not verified_
  Exported for levelTextures.ts. The edge must run levelTextures -> spriteTextures only (spriteTextures never imports levelTextures), so there is no intra-folder cycle. It names entries through the precomputed spriteName table.
- `buildGlobalTextures` (async function) from `src/assets/build.ts:94-138`: **move** · _not verified_
  Becomes buildGlobalTextures(): Promise&lt;void>, without the `art` parameter. Keep the entry order (boot characters first, then the drawer table in its current order, then the strip fallbacks), because packAtlas's stable sort breaks ties by insertion order, so the 'global' pages stay byte-identical. packAtlas now returns an AtlasHandle, kept for the app lifetime.
- `loadSpriteStrip` (async function) from `src/assets/build.ts:235-242`: **move** · _not verified_

#### `src/core/assets/levelTextures.ts`

Per-palette level atlas, built by the caller before new World().

Plan: builtPalette, paletteAtlases (as AtlasHandle[]), STORY_TILES, STORY_PROPS, buildLevelTextures (build 140-201).

Entries (5):

- `builtPalette` (let) from `src/assets/build.ts:140`: **move** · _not verified_
  Cache key `${environmentArtBank()}|${JSON.stringify(pal)}` unchanged.
- `paletteAtlases` (const) from `src/assets/build.ts:142`: **move** · _not verified_
  Typed AtlasHandle[] (core/assets/atlas) instead of TextureSource[][].
- `STORY_TILES` (const) from `src/assets/build.ts:144`: **move** · _not verified_
  Add `satisfies readonly StoryTileKind[]`, where StoryTileKind is exported by placeholders/storyTiles. An unknown kind then fails at compile time instead of yielding a blank buffer.
- `STORY_PROPS` (const) from `src/assets/build.ts:145-165`: **move** · _not verified_
  Add `satisfies readonly (SpriteKey & StoryPropKind)[]`. levelTextures owns the order lists and registry.ts owns only the key->drawer lookup. Putting the list in registry would need registry -> levelTextures while levelTextures -> registry: a cycle.
- `buildLevelTextures` (function) from `src/assets/build.ts:168-201`: **move** · _not verified_
  Must stay synchronous. The caller moves out of the World constructor (world.ts:51): story/engine/stage.setStage and core/flow/greenZone/greenZoneScene call it before new World(). The push order of entries is kept for an identical 'level' atlas.

#### `src/core/assets/environment/manifest.ts`

Environment manifest schema and validation.

Plan: FloorDesign, FrameDef, ZoneDef, EnvironmentManifest, DeliveredFrame, SWATCHES, HEX, FLOOR_FRAME, isRecord, parseManifest, readFloorDesigns (environment 7-40, 114-148, 176-210).

Entries (11):

- `FloorDesign` (interface) from `src/assets/environment.ts:7-13`: **move** · _not verified_
  Re-exported by environment/index (core/stage/mapRenderer uses it as a type).
- `FrameDef` (interface) from `src/assets/environment.ts:15-22`: **move** · _not verified_
- `ZoneDef` (interface) from `src/assets/environment.ts:24-28`: **move** · _not verified_
  Palette type from systems/world/level (L4->L3, legal).
- `EnvironmentManifest` (interface) from `src/assets/environment.ts:30-36`: **move** · _not verified_
  Schema `version: 1` stays inline: it is a format version, not tuning.
- `DeliveredFrame` (interface) from `src/assets/environment.ts:38-40`: **move** · _not verified_
  Imports PixelBuffer (type) from core/assets/pixelBuffer.
- `isRecord` (function) from `src/assets/environment.ts:114-116`: **move** · _not verified_
  Only the manifest validation uses it.
- `SWATCHES` (const) from `src/assets/environment.ts:118`: **move** · _not verified_
  Mirrors the Palette field names in systems/world/level. Type it so a renamed Palette field fails compilation, for example `new Set<keyof Palette>([...])`.
- `HEX` (const) from `src/assets/environment.ts:119`: **move** · _not verified_
  A validation regex: it stays with the schema, not in core/util.
- `FLOOR_FRAME` (const) from `src/assets/environment.ts:120`: **move** · _not verified_
  floorDesigns.ts imports it for withEnvironmentArt.
- `readFloorDesigns` (function) from `src/assets/environment.ts:123-148`: **move** · _not verified_
  Takes the structural bank parameter described under BankState.
- `parseManifest` (function) from `src/assets/environment.ts:176-210`: **move** · _not verified_

#### `src/core/assets/environment/banks.ts`

Art bank state machine and DOM decoding.

Plan: ArtBank, BANK_DIRS, BankState, banks, active, wanted, bankState, environmentArtBank, wantedArtBank, chosenArtBank, preloadEnvironmentArt, loadBank, decodeZone (environment 48-101, 224-285).

Entries (14):

- `ArtBank` (type) from `src/assets/environment.ts:48`: **move** · _not verified_
- `BANK_DIRS` (const) from `src/assets/environment.ts:49`: **move** · _not verified_
  Public asset folders, like the DELIVERED paths: they stay with the asset code, not in config. scripts/recolor_environment_atlases.py and a comment in tests/environmentAssets.test.ts (line 35) name this path. Update the comment.
- `BankState` (interface) from `src/assets/environment.ts:52-61`: **move** · _not verified_
  readFloorDesigns (manifest.ts) takes a structural `{ name: string; floorDesigns: Map<string, FloorDesign> }`, not BankState. A manifest -> banks type edge would close a cycle, because banks imports manifest.
- `banks` (const) from `src/assets/environment.ts:63`: **move** · _not verified_
  Module singleton. tests/environment.test.ts calls vi.resetModules() in afterEach and re-imports the barrel per test, so the split singletons (banks.ts, diagnostics.ts) still reset together.
- `active` (let) from `src/assets/environment.ts:65`: **move** · _not verified_
  Written only by preloadEnvironmentArt. palettes.ts and floorDesigns.ts read it through environmentArtBank().
- `wanted` (let) from `src/assets/environment.ts:67`: **move** · _not verified_
- `bankState` (function) from `src/assets/environment.ts:71-78`: **move** · _not verified_
  Exported for palettes.ts and floorDesigns.ts. environment/index uses named re-exports so it stays folder-internal (the current public API is unchanged).
- `environmentArtBank` (function) from `src/assets/environment.ts:81-83`: **move** · _not verified_
  Part of the level-texture cache key (levelTextures).
- `wantedArtBank` (function) from `src/assets/environment.ts:89-91`: **move** · _not verified_
  Read by the OPTIONS > ART row (ui/screens/optionsScene via core/app/settingsActions).
- `chosenArtBank` (function) from `src/assets/environment.ts:97-101`: **move** · _not verified_
  Pure. Called by core/flow/bootstrap. tests/environment.test.ts:274 imports it through the barrel.
- `environmentDiagnostics` (function) from `src/assets/environment.ts:110-112`: **move** · _not verified_
  DEVIATES from the target's diagnostics.ts. It reads `active` and bankState(active).framesByZone, while banks.ts imports warnOnce from diagnostics.ts, so leaving it in diagnostics.ts creates a diagnostics&lt;->banks cycle that tests/layers.test.ts rejects. The return shape {bank, loadedZones, warnings} is unchanged for window.\_\_sv.art() (scripts/story-smoke.mjs 241-282, capture_environment_screens.mjs 79).
- `decodeZone` (async function) from `src/assets/environment.ts:224-250`: **move** · _not verified_
  DOM decode (Image, canvas): allowed in L4.
- `preloadEnvironmentArt` (async function) from `src/assets/environment.ts:258-265`: **move** · _not verified_
  Callers: core/flow/bootstrap (boot) and core/app/settingsActions.toggleArt (OPTIONS > ART, today flow 165-170).
- `loadBank` (async function) from `src/assets/environment.ts:267-285`: **move** · _not verified_

#### `src/core/assets/environment/diagnostics.ts`

Warnings shown by \_\_sv.art(), keeping the .bank and .loadedZones shape.

Plan: warned, warnings, warnOnce, environmentDiagnostics (environment 68-112).

Entries (3):

- `warned` (const) from `src/assets/environment.ts:68`: **move** · _not verified_
- `warnings` (const) from `src/assets/environment.ts:69`: **move** · _not verified_
  diagnostics.ts adds `warningList(): string[]` (a copy), which environmentDiagnostics reads.
- `warnOnce` (function) from `src/assets/environment.ts:103-108`: **move** · _not verified_
  diagnostics.ts is a leaf. manifest.ts (readFloorDesigns), banks.ts (loadBank) and floorDesigns.ts import it.

#### `src/core/assets/environment/palettes.ts`

Chapter palette composition.

Plan: clonePalette, paletteForChapter (environment 212-222).

Entries (2):

- `clonePalette` (function) from `src/assets/environment.ts:212-214`: **move** · _not verified_
- `paletteForChapter` (function) from `src/assets/environment.ts:217-222`: **move** · _not verified_
  Imports bankState and environmentArtBank from banks.ts. Caller: story/engine/stage.

#### `src/core/assets/environment/floorDesigns.ts`

Authored floors and the delivered-frame swap.

Plan: floorDesignForMap, floorFrameForGround, withEnvironmentArt (environment 151-173, 288-319).

Entries (3):

- `floorDesignForMap` (function) from `src/assets/environment.ts:151-161`: **move** · _not verified_
  Caller: story/engine/stage.setStage (from storyScene 181-185).
- `floorFrameForGround` (function) from `src/assets/environment.ts:164-173`: **move** · _not verified_
  Value import of Ground from systems/world/tiles (L4->L3, legal). This removes today's two-way assets&lt;->world edge. Caller: core/stage/mapRenderer.
- `withEnvironmentArt` (function) from `src/assets/environment.ts:288-319`: **move** · _not verified_
  AtlasEntry type from core/assets/atlas. Caller: levelTextures.

#### `src/core/assets/environment/index.ts`

Barrel (tests/environment.test imports it dynamically once per test).

Plan: Re-exports of the five environment files.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/core/assets/placeholders/registry.ts`

SpriteKey-to-drawer table, so the texture builders stop knowing every drawer. It asserts each drawer's size against its SpriteDef.

Plan: The gen table and special-key lists (build 104-132, 126, 184-198); the shadow sizes (build 110-112), read from SPRITES.

Entries (2):

- `buildGlobalTextures.gen` from `src/assets/build.ts:104-132`: **split** as `GLOBAL_SPRITE_DRAWERS: ReadonlyArray<readonly [SpriteKey, (v: number) => PixelBuffer]>; SPECIAL_KEYS (126)` · _not verified_
  The shadow sizes (110-112: 20x7, 10x4, 24x8) are read from SPRITES.shadow/shadowSmall/shadowBig w/h, which hold the same values. The alphas 70/70/60 stay as drawer arguments (art). The registry asserts each drawer's buffer size against its SpriteDef, in a test. SPECIAL_KEYS is typed SpecialKind[] from placeholders/specials.
- `buildLevelTextures.drawers` from `src/assets/build.ts:175-198`: **split** as `PALETTE_TILE_DRAWERS / PALETTE_SPRITE_DRAWERS: Partial<Record<SpriteKey | TileKind, (pal: Palette, v: number, mask?: number) => PixelBuffer>>` · _not verified_
  levelTextures keeps the loops and their order (tiles, tree, forestTree, bush, story tiles, story props, then pole/fountain/exitFlag again so delivered art follows the chapter). Only the key->drawer knowledge moves.

#### `src/core/assets/placeholders/raster.ts`

Shared diamond and box raster helpers, replacing the duplicates.

Plan: uv, fillDiamond, strokeInside, patchNoise (tiles 12-34), merged with fill and materialNoise (storyArt 28-42); outline, isoBox (storyArt 157-178).

Entries (8):

- `fill` from `src/assets/placeholders/storyArt.ts:28-33`: **merge** · _not verified_
  Merged into fillDiamond(pb, 0, color): the same y-outer/x-inner loop over insideDiamond, with the same null skip, so pixels are identical.
- `materialNoise` from `src/assets/placeholders/storyArt.ts:40-42`: **merge** · _not verified_
  Merged into patchNoise (identical body: hash2(floor(x/4), floor(y/2), salt)).
- `outline` (function) from `src/assets/placeholders/storyArt.ts:157-160`: **move** · _not verified_
  Default '#1a1410' kept.
- `isoBox` (function) from `src/assets/placeholders/storyArt.ts:163-178`: **move** · _not verified_
- `uv` (function) from `src/assets/placeholders/tiles.ts:12-14`: **move** · _not verified_
- `fillDiamond` (function) from `src/assets/placeholders/tiles.ts:16-24`: **move** · _not verified_
  Absorbs storyArt.fill.
- `strokeInside` (function) from `src/assets/placeholders/tiles.ts:27-29`: **move** · _not verified_
- `patchNoise` (function) from `src/assets/placeholders/tiles.ts:32-34`: **move** · _not verified_
  Absorbs storyArt.materialNoise.

#### `src/core/assets/placeholders/critters/spec.ts`

Critter spec data. Frame sizes come from the CharacterDef.

Plan: CritterSpec, ZAMPANO_SPEC, BAGNASKIZ_SPEC, CAT_SPEC (critters 10-123).

Entries (4):

- `CritterSpec` (interface) from `src/assets/placeholders/critters.ts:10-51`: **move** · _not verified_
  Target: frame sizes come from the CharacterDef. frameW, frameH and groundY leave the spec, and drawCritter takes them from def (frameW, frameH, anchorY), which hold the same values (40/40/36, cat 28/28/25).
- `ZAMPANO_SPEC` (const) from `src/assets/placeholders/critters.ts:53-75`: **move** · _not verified_
- `BAGNASKIZ_SPEC` (const) from `src/assets/placeholders/critters.ts:77-99`: **move** · _not verified_
- `CAT_SPEC` (const) from `src/assets/placeholders/critters.ts:101-123`: **move** · _not verified_

#### `src/core/assets/placeholders/critters/pose.ts`

Procedural pose per animation frame.

Plan: Pose, BASE_POSE, poseFor (critters 125-215).

Entries (3):

- `Pose` (interface) from `src/assets/placeholders/critters.ts:125-140`: **move** · _not verified_
- `BASE_POSE` (const) from `src/assets/placeholders/critters.ts:142-157`: **move** · _not verified_
- `poseFor` (function) from `src/assets/placeholders/critters.ts:160-215`: **move** · _not verified_
  Type import of AnimName from core/assets/manifest/animations. The pose amplitudes stay as art.

#### `src/core/assets/placeholders/critters/draw.ts`

drawCritter's frame context, paint order and outline, plus drawShadow.

Plan: Pt, the drawCritter shell (critters 217-253, 583-602), drawShadow (605-609).

Entries (2):

- `drawCritter` (function) from `src/assets/placeholders/critters.ts:222-602`: **move** · _not verified_
  draw.ts keeps the shell: build the frame (frame.ts), the paint order per facing (582-598), drawDroplets, and the outline (600). The nested closures become top-level functions over one CritterFrame object, in the same call order, so every pixel is identical.
- `drawShadow` (function) from `src/assets/placeholders/critters.ts:605-609`: **move** · _not verified_
  Called by placeholders/registry for shadow/shadowSmall/shadowBig, with the sizes from SPRITES.

#### `src/core/assets/placeholders/critters/body.ts`

Body-part drawers that take the shared frame context.

Plan: drawLegs, drawBody, drawBodyExtras, drawTail (critters 254-400, nested closures lifted out).

Entries (3):

- `drawCritter.drawLegs` from `src/assets/placeholders/critters.ts:254-290`: **split** as `function drawLegs(f: CritterFrame): void` · _not verified_
- `drawCritter.drawBody+drawBodyExtras` from `src/assets/placeholders/critters.ts:292-373`: **split** as `function drawBody(f: CritterFrame): void; function drawBodyExtras(f, at, rx, ry): void` · _not verified_
  The tabard default '#f4f4f8', the cross red '#d42424' and the scar pink stay as art.
- `drawCritter.drawTail` from `src/assets/placeholders/critters.ts:375-400`: **split** as `function drawTail(f: CritterFrame): void` · _not verified_

#### `src/core/assets/placeholders/critters/head.ts`

Head-part drawers.

Plan: drawEars, drawHead, drawFace, drawDroplets (critters 402-446, 525-580).

Entries (2):

- `drawCritter.drawEars+drawHead` from `src/assets/placeholders/critters.ts:402-446`: **split** as `function drawEars(f, near): void; function drawHead(f): void` · _not verified_
  drawHead calls drawHat(f, hrx, hry, () => drawFace(f)). head.ts imports hats.ts, never the reverse.
- `drawCritter.drawFace+drawDroplets` from `src/assets/placeholders/critters.ts:525-580`: **split** as `function drawFace(f): void; function drawDroplets(f): void` · _not verified_
  drawDroplets goes here per the target, although it draws from the rear. The pee yellow '#ffe23a' and the fetched-ball greens stay as placeholder art, not config tokens: only the HUD icons take config/colors.

#### `src/core/assets/placeholders/critters/hats.ts`

Hats and helms.

Plan: drawHat (critters 448-523).

Entries (1):

- `drawCritter.drawHat` from `src/assets/placeholders/critters.ts:448-523`: **split** as `function drawHat(f: CritterFrame, hrx: number, hry: number, redrawFace: () => void): void` · _not verified_
  The hood, veil and bearEars cases redraw the face. Taking a callback avoids a hats&lt;->head cycle (head.drawHead already imports hats). The hat accent colours stay as art.

#### `src/core/assets/placeholders/castSpecs.ts`

One declarative Record&lt;CharacterKey, CritterSpec> with no import-time mutation.

Plan: DOG, dog, recolor, CAST_SPECS (with the overrides at 118-145 folded in), PIXEL_CAST_FALLBACKS (placeholders/cast).

Entries (6):

- `DOG` (const) from `src/assets/placeholders/cast.ts:8-14`: **move** · _not verified_
- `dog` (function) from `src/assets/placeholders/cast.ts:16-18`: **move** · _not verified_
- `recolor` (function) from `src/assets/placeholders/cast.ts:20-22`: **move** · _not verified_
  The default outline '#2a1e18' stays as placeholder art.
- `CAST_SPECS` (const) from `src/assets/placeholders/cast.ts:24-109`: **move** · _not verified_
  Typed Record&lt;CharacterKey, CritterSpec> (a missing key becomes a compile error instead of a runtime `!` crash at build.ts:46). Built as one declarative literal, with no import-time mutation. tests/pixelCast.test.ts:3 imports '../src/assets/placeholders/cast': repoint it. The colours are placeholder pixel art and stay out of config.
- `PIXEL_CAST_FALLBACKS` (const) from `src/assets/placeholders/cast.ts:113-117`: **move** · _not verified_
  Typed Record&lt;CastKey, CastKey>; it now feeds the declarative build.
- `CAST_SPECS.importTimeOverrides` from `src/assets/placeholders/cast.ts:118-145`: **merge** as `declarative entries: ...fallbacks(PIXEL_CAST_FALLBACKS), jack/santina/confusione final specs, knight(spec) for the 4 *Knight keys` · _not verified_
  Merged into the CAST_SPECS literal. Order matters only for the knights: jackKnight, watsonKnight, santinaKnight and confusioneKnight must derive from the overridden jack/santina/confusione (124-141), so define those finals first. The fallback sources (clerkA, greek, preacher...) are never overridden, so their order is free. Keep the colour-object copies to stay faithful.

#### `src/core/assets/placeholders/items.ts`

Item sprites.

Plan: drawTreat, drawBall, drawPoop, drawCoin (items 6-68).

Entries (4):

- `drawTreat` (function) from `src/assets/placeholders/items.ts:6-23`: **move** · _not verified_
  Buffer size 13x8 is checked against SPRITES.treat by the registry size assertion.
- `drawBall` (function) from `src/assets/placeholders/items.ts:25-43`: **move** · _not verified_
- `drawPoop` (function) from `src/assets/placeholders/items.ts:45-60`: **move** · _not verified_
- `drawCoin` (function) from `src/assets/placeholders/items.ts:62-68`: **move** · _not verified_

#### `src/core/assets/placeholders/fxSprites.ts`

Particle and popup sprites.

Plan: drawRainbow, drawThought, drawWave, drawSparkle, drawTri, drawCross, drawRing, drawPixel (items 70-170).

Entries (8):

- `drawRainbow` (function) from `src/assets/placeholders/items.ts:70-92`: **move** · _not verified_
  The rainbow bands stay as art. Only '#ff9a1f' and '#ffe23a' equal C, and '#ff3b3b' is not C.red, so they are not merged silently into tokens.
- `drawThought` (function) from `src/assets/placeholders/items.ts:94-108`: **move** · _not verified_
- `drawWave` (function) from `src/assets/placeholders/items.ts:111-125`: **move** · _not verified_
  dirToScreenVector and Dir8 come from core/math/projection.
- `drawSparkle` (function) from `src/assets/placeholders/items.ts:127-140`: **move** · _not verified_
- `drawTri` (function) from `src/assets/placeholders/items.ts:142-149`: **move** · _not verified_
- `drawCross` (function) from `src/assets/placeholders/items.ts:151-157`: **move** · _not verified_
- `drawRing` (function) from `src/assets/placeholders/items.ts:159-164`: **move** · _not verified_
- `drawPixel` (function) from `src/assets/placeholders/items.ts:166-170`: **move** · _not verified_

#### `src/core/assets/placeholders/hudIcons.ts`

HUD icons, coloured from config/colors.

Plan: drawStar, drawDogFace, drawPeeIcon, drawBarkIcon, drawDrop (items 173-260).

Entries (5):

- `drawStar` (function) from `src/assets/placeholders/items.ts:173-201`: **move** · _not verified_
- `drawDogFace` (function) from `src/assets/placeholders/items.ts:204-219`: **move** · _not verified_
  Zampanò's face colours stay as art.
- `drawPeeIcon` (function) from `src/assets/placeholders/items.ts:221-234`: **move** · _not verified_
- `drawBarkIcon` (function) from `src/assets/placeholders/items.ts:236-247`: **move** · _not verified_
- `drawDrop` (function) from `src/assets/placeholders/items.ts:250-260`: **move** · _not verified_

#### `src/core/assets/placeholders/props.ts`

Green Zone props.

Plan: drawTree, drawForestTree, drawBush, drawPole, drawFountain, drawExitFlag (props, unchanged).

Entries (6):

- `drawTree` (function) from `src/assets/placeholders/props.ts:7-46`: **move** · _not verified_
  Rng from core/util/rng, Palette type from systems/world/level. The seeds and geometry stay as art (deterministic output).
- `drawForestTree` (function) from `src/assets/placeholders/props.ts:48-78`: **move** · _not verified_
- `drawBush` (function) from `src/assets/placeholders/props.ts:80-100`: **move** · _not verified_
- `drawPole` (function) from `src/assets/placeholders/props.ts:102-119`: **move** · _not verified_
  Drawn for both the global and the level atlas (the registry serves both).
- `drawFountain` (function) from `src/assets/placeholders/props.ts:121-142`: **move** · _not verified_
- `drawExitFlag` (function) from `src/assets/placeholders/props.ts:144-162`: **move** · _not verified_

#### `src/core/assets/placeholders/tiles.ts`

Green Zone tiles.

Plan: drawGrass, TALL_GRASS_OFFSET, drawTallGrass, drawPath, drawWater, drawForest, drawDirt, drawFresh, drawExitRing (tiles 36-226).

Entries (9):

- `drawGrass` (function) from `src/assets/placeholders/tiles.ts:36-66`: **move** · _not verified_
  tests/tileArt.test.ts:4 imports drawGrass, drawPath, drawTallGrass and drawWater from '../src/assets/placeholders/tiles': repoint.
- `TALL_GRASS_OFFSET` (const) from `src/assets/placeholders/tiles.ts:69`: **move** · _not verified_
  Stays with its drawer (target): it is the texture's anchorY, read by levelTextures. Not config.
- `drawTallGrass` (function) from `src/assets/placeholders/tiles.ts:71-92`: **move** · _not verified_
  Contract with core/stage/mapRenderer: variants are the wind poses played 0-1-2-1 (config GROUND.GRASS_WIND).
- `drawPath` (function) from `src/assets/placeholders/tiles.ts:99-143`: **move** · _not verified_
  The mask bit layout (1/2/4/8) is a contract with mapRenderer's path mask. PATH_MASKS (16) lives in manifest/sprites.
- `drawWater` (function) from `src/assets/placeholders/tiles.ts:145-159`: **move** · _not verified_
- `drawForest` (function) from `src/assets/placeholders/tiles.ts:161-179`: **move** · _not verified_
- `drawDirt` (function) from `src/assets/placeholders/tiles.ts:182-199`: **move** · _not verified_
- `drawFresh` (function) from `src/assets/placeholders/tiles.ts:202-214`: **move** · _not verified_
  '#b8ff5a' and '#fff36a' stay as tile art.
- `drawExitRing` (function) from `src/assets/placeholders/tiles.ts:217-226`: **move** · _not verified_
  '#fff36a' stays as art: the config plan says tiles 219 stays art, and the GOAL token covers only the walk and Green Zone markers.

#### `src/core/assets/placeholders/storyTiles.ts`

Story ground tiles.

Plan: DEFAULTS, swatch, drawStoryTile (storyArt 11-26, 44-153).

Entries (3):

- `DEFAULTS` (const) from `src/assets/placeholders/storyArt.ts:11-22`: **move** · _not verified_
  Fallback swatches stay as placeholder art (target). They overlap content/maps/themes THEMES, but are not merged. Type the keys as a literal union (StoryMaterial) instead of Record&lt;string, Swatch>.
- `swatch` (function) from `src/assets/placeholders/storyArt.ts:24-26`: **move** · _not verified_
  Stays exported because storyProps.ts imports it (storyProps -> storyTiles, one direction only). With DEFAULTS typed, `key: StoryMaterial` replaces the current `keyof typeof DEFAULTS`, which is plain string.
- `drawStoryTile` (function) from `src/assets/placeholders/storyArt.ts:44-153`: **move** · _not verified_
  `kind` is typed StoryTileKind (exported here; levelTextures' STORY_TILES satisfies it). The inline u/v at 110-111 and 135-136 use raster.uv(x, y), which gives the same values. Salts and pattern periods stay as art. tests/tileArt.test.ts:3 imports it: repoint.

#### `src/core/assets/placeholders/storyProps.ts`

Palette-coloured story props.

Plan: drawStoryProp (storyArt 180-427).

Entries (1):

- `drawStoryProp` (function) from `src/assets/placeholders/storyArt.ts:180-427`: **move** · _not verified_
  `kind` is typed StoryPropKind. The unknown-kind 4x4 blank fallback becomes unreachable once STORY_PROPS satisfies the type. It imports swatch from storyTiles and outline/isoBox from raster.

#### `src/core/assets/placeholders/specials.ts`

Story specials that do not depend on the palette.

Plan: drawSpecial (storyArt 431-690).

Entries (1):

- `drawSpecial` (function) from `src/assets/placeholders/storyArt.ts:431-690`: **move** · _not verified_
  `kind` is typed SpecialKind (the 20 keys of build.ts:126, now registry SPECIAL_KEYS).

#### `src/core/flow/bootstrap.ts`

Composition root: Pixi init, preloads, Game and Flow.

Plan: boot() from main.ts 18-53: nearest scaleMode, Application.init with config RENDER, ticker stop, events off, loadPixelFont, preloadEnvironmentArt plus buildGlobalTextures with chosenArtBank, loadTitleArt, the portrait pre-decode with the height cap applied (audit main.ts:46), and the StoryCatalog from content/index injected into Flow.

Entries (2):

- `buildGlobalTextures.preloadEnvironmentArt` from `src/assets/build.ts:95`: **split** as `boot(): await preloadEnvironmentArt(chosenArtBank(loadSettings().newArt, location.search)); await buildGlobalTextures()` · _not verified_
  The environment bank flow belongs to the boot sequence. Keep it sequential and before the first World: the global atlas does not read the bank, but buildLevelTextures (synchronous) needs a decoded bank.
- `boot` (function) from `src/main.ts:18-48, 51`: **move** as `export async function boot(): Promise<void>` · _verified_
  Sequence: the nearest scaleMode, Application.init with RENDER, ticker.stop(), loadPixelFont (core/render/text/pixelFont), preloadEnvironmentArt plus buildGlobalTextures(chosenArtBank(...)) (core/assets/spriteTextures, environment), loadTitleArt (core/assets/logoArt), new Game, the portrait pre-decode, removing #boot, new Flow(game, catalog) with the StoryCatalog from content/index. The pre-decode must compute its width with the same rule TitleScene uses (ui/screens/title/titlePortrait, with the height cap). Otherwise the module cache keeps an extra decoded set (audit high, main.ts:46). Read loadSettings() once here and hand the result to Game. The architectural flags stay inline here, not in config: autoStart false, sharedTicker false, ticker.stop and eventFeatures all false encode the fixed-step loop and the raw-DOM input model.

#### `src/core/flow/urlParams.ts`

Debug URL routing.

Plan: main.ts 54-79: ?debug=sprites&char, ?level, ?auto&skill&ending&choice, ?as (PLAY_AS), ?skip=game, ?story, ?art.

Entries (1):

- `boot` (function) from `src/main.ts:49-50, 54-79`: **split** as `routeUrl(game, flow, params: URLSearchParams): Promise<void>` · _verified_
  Handles ?level, ?debug=sprites&char (ensureCharacters from core/assets/characterTextures, SpriteViewerScene from ui/screens/debug), ?auto&skill&ending&choice (DEFAULT_POLICY from story/pilot/autopilot), ?as (PLAY_AS from systems/campaign/costumes), ?skip=game and ?story, and otherwise the title. Its imports change: levelByNumber comes from content/levels, CharacterKey from core/assets/manifest. The order is preserved: the sprite viewer path does not call game.loop.start() before game.start.
  Verifier: `params` (line 49) is shared with automation (entry 162: scene() reads params.get('story')), so bootstrap builds it once and passes it to both. Keep installAutomation after routeUrl, as today (line 82 runs after routing).

#### `src/core/flow/automation.ts`

The window.\_\_sv contract, with the same member names.

Plan: main.ts 81-96: game, flow, scene, top, storyIds, step, art, faceToward.

Entries (1):

- `boot` (function) from `src/main.ts:81-96`: **split** as `installAutomation(game, flow, params, catalog): void` · _verified_
  The window.\_\_sv contract, with every name kept: game, flow, scene (still `params.get('story') ? top : flow.current ?? top`), top, storyIds (from the catalog's chapters, filtering out greenZone), step (game.loop.stepNow), art (environmentDiagnostics from core/assets/environment), faceToward (dirFromGridVector from core/math/projection). scripts/\*.mjs depend on all of them.

#### `src/core/flow/flow.ts`

Flow facade: the public API that main and scripts use.

Plan: Flow (scenes/flow): current, story, back, autoPause, popOverlays, overTitle, closeOverTitle, delegating to titleFlow and walkFlow. Names kept: toTitle, play, playGreenZone, startPlaying, glitch, restart, quitToTitle, pause, resume. The gameScene reference is cleared on leave (audit flow 362).

Entries (1):

- `Flow` (class) from `src/scenes/flow.ts:37-369`: **move** as `class Flow (facade): story, current, back, autoPause, glitch, overTitle, closeOverTitle, popOverlays; delegates toTitle, play, playGreenZone, startPlaying, restart, quitToTitle, pause, resume` · _corrected by verifier_
  Keep every public name, because main.ts and scripts use them: flow.play (6 hits), toTitle (6), current (5), restart, back, and story.{debugPlay, openMenu, newGame, showEnding (private), log, debugReset, continueGame, autopilot, playAs}. The constructor still builds StoryFlow (core/flow/storyFlow.ts) with the toTitle and playGreenZone callbacks, plus the StoryCatalog that bootstrap injects. titleFlow and walkFlow must NOT import each other, or the layer test's intra-folder cycle check fails: Flow wires them together with callbacks (titleFlow receives a backdrop() callback that runs walkFlow.newGameScene; walkFlow receives a toTitle() callback). `current` returns walkFlow.scene. Clear it only by identity (`if (walk.scene === exiting) walk.scene = null`), because newGameScene assigns the new scene BEFORE replaceAll exits the old one. Also, story-smoke.mjs 254-263 and 397-401 compare flow.current before and after an ART change to detect the rebuilt title backdrop, so current must stay non-null while the title is shown. Leave a temporary `export *` shim at src/scenes/flow.ts until main.ts moves to bootstrap.
  Verifier: Three changes to the facade. 1. popOverlays (366-368) belongs in walkFlow, not the facade. It compares the stack against the walk scene, and its only callers are startPlaying and resume, which move to walkFlow. Left in Flow, walkFlow would have to call back up into it. 2. glitch() (204-208) is called from both titleFlow (cont, newGame, levels, OPTIONS back) and walkFlow (restart, quitToTitle). Neither may import flow.ts, because Flow imports both and that would be a cycle. Inject glitch as a callback into both. Everything else holds: - story-smoke 254-263 and 397-401 do compare flow.current. - \_\_sv.scene() at main.ts:85 falls back to scenes.top when current is null. So clearing it by identity on exit changes \_\_sv.scene() during a story started from the title from the stale GameScene to the StoryScene. No script relies on the stale value: only the walk scenarios in screenshot.mjs call \_\_sv.scene().

#### `src/core/flow/titleFlow.ts`

Title page wiring; owns and destroys the backdrop filters.

Plan: toTitle 62-99 (the blur and TitleGlitchFilter are owned and destroyed, audit flow 67-68), openOptions 127-159, newGame 116-125, quit 173-177, and the couch/glossary pushes, which pass a ProgressSummary and LevelRecord (scenes/flow).

Entries (4):

- `CouchScene.constructor` (method) from `src/scenes/couchScene.ts:54-55`: **split** as `couch action: new CouchScene(game, progressSummary(loadCampaign(), CHAPTERS), bestFor(LEVELS[0].id), pop)` · _corrected by verifier_
  The storage reads leave the UI class. loadCampaign comes from core/state/campaignSave, progressSummary from systems/campaign/progression, bestFor from core/state/records, CHAPTERS from content/campaign/chapters and LEVELS from content/levels: all legal imports for L9. Keep loadCampaign() (the saved state) rather than flow.story.state, so the card shows exactly what it shows today.
  Verifier: Moving the reads out is right, but the target makes content/index.ts the one entry point the composition root imports content through. titleFlow should take CHAPTERS and LEVELS from content/index (or from the catalog or registries Flow is handed), not from content/campaign/chapters and content/levels directly. Keep loadCampaign() so the card shows exactly what it shows today.
- `Flow.toTitle` (method) from `src/scenes/flow.ts:38-40, 62-99`: **split** as `TitleFlow.show(): owns the blur BlurFilter and a TitleGlitchFilter, both destroyed when the title backdrop is left` · _corrected by verifier_
  Fixes the audit leak at flow 67-68: a new TitleGlitchFilter is made on every toTitle and never destroyed. Set `glitch.film = TITLE.FILM` once here (it moves out of TitleScene.animateGlitch 401). The direct pokes on the backdrop scene (worldRoot.filters, hud.root.visible, controls.root.visible, active, setControlsEnabled) should become one GameScene.asBackdrop(filters) call, with startPlaying undoing it. Keep the continueLabel fallback copy 'THE STORY IS FINISHED: REPLAY ANY LEVEL' here. The couch and glossary pushes now pass a ProgressSummary and a LevelRecord (see CouchScene.constructor).
  Verifier: toTitle (63-64) also resets walk state before building the backdrop: storyDone = null and level = LEVELS[0]. Both fields move to walkFlow, so the backdrop() callback must be a walkFlow method that resets them and then calls newGameScene. Otherwise a title reached mid-walk keeps the old level and done callback. titleFlow also needs the injected glitch (see entry 21). Two notes on the filters: - The blur is one instance on Flow today, reused by every toTitle. If titleFlow destroys it when the backdrop is left, it must build a new one in each show(). - Nothing ever calls startPlaying on a backdrop scene: playGreenZone and play() always build a new scene. So asBackdrop's undo in startPlaying is harmless but not needed.
- `Flow.newGame+openOptions+quit` (method) from `src/scenes/flow.ts:115-159, 172-177`: **split** as `TitleFlow.newGame(), openOptions(), quit()` · _verified_
  overTitle and closeOverTitle stay on the Flow facade, which passes them in. openOptions keeps its artAtOpen/leaving logic and the ControlsScene and BookScene pushes (BookScene moves to ui/screens/story/bookScene). quit uses quitApp from core/app/native. Copy strings ('NEW GAME?', 'THE SAVED STORY WILL BE LOST.') stay here.
- `TitleScene.animateGlitch (film)` (method) from `src/scenes/overlays.ts:401`: **split** as `glitch.film = TITLE.FILM, set once when titleFlow creates the filter` · _verified_
  The rest of animateGlitch (387-400) stays in TitleScene: it animates the filter that titleFlow owns.

#### `src/core/flow/walkFlow.ts`

Green Zone walk flow.

Plan: playGreenZone, startPlaying, play, restart, quitToTitle, pause, resume, levelComplete (scores through systems levelResult and saveRecord), gameOver, newGameScene (scenes/flow 180-364).

Entries (5):

- `Flow.playGreenZone+startPlaying+play+restart+quitToTitle` (method) from `src/scenes/flow.ts:38-39, 43, 179-202, 210-228`: **split** as `class WalkFlow { scene, level, storyDone; playGreenZone, startPlaying, play, restart, quitToTitle }` · _corrected by verifier_
  The fields gameScene (renamed scene), level and storyDone move here. quitToTitle calls the toTitle callback that Flow injects, so walkFlow never imports titleFlow. Flow keeps the same public method names and delegates to these.
  Verifier: Lines are right. Add to WalkFlow: - popOverlays (366-368), which startPlaying (195) and resume (272) call. - an injected glitch callback: restart (222) and quitToTitle (227) call this.glitch, which stays on the Flow facade. Without both, walkFlow has to reach back into Flow.
- `Flow.pause+resume` (method) from `src/scenes/flow.ts:230-251, 269-278`: **split** as `WalkFlow.pause(), WalkFlow.resume()` · _verified_
  PauseScene receives the settingsActions functions for its sound rows. The duck levels come from config/audio DUCK. `this.game.input.joystick.active = false` stays: it is the flow's job, through Input's public field.
- `Flow.levelComplete` (method) from `src/scenes/flow.ts:300-340`: **split** as `WalkFlow.levelComplete(scene)` · _verified_
  Builds the LevelResult from levelResult(...) plus newBest = saveRecord(...) (core/state/records), coinsTotal = story coins, hasNext = !!storyDone, and nextLabel 'CONTINUE' (UI copy). walkFlow gets narrow callbacks for the story's coins and addWalk instead of the whole StoryFlow, which avoids any coupling back to storyFlow. The SupervillainedScene then LevelEndScene order is unchanged (screenshot.mjs 600-605 waits for those class names).
- `Flow.gameOver+newGameScene` (method) from `src/scenes/flow.ts:342-364`: **split** as `WalkFlow.gameOver(scene), WalkFlow.newGameScene()` · _verified_
  newGameScene calls bindGameAudio from core/flow/greenZone/greenZoneAudio. Flow passes it to titleFlow as the backdrop() callback.
- `Flow.popOverlays` (method) from `src/scenes/flow.ts:366-368`: **move** · _added by verifier_
  Entry 21 keeps it on the facade, but it reads the walk scene (`top !== this.gameScene`) and its only callers are startPlaying (195) and resume (272), which move to WalkFlow.

#### `src/core/flow/storyFlow.ts`

Story navigation and attempt commit/save.

Plan: PlaytestEntry, StoryFlow (story/storyFlow). Card specs come from content/campaign/cards, unlocked() from systems/campaign/progression, and screens get row view-models. Names kept: debugPlay, debugReset, debugSkipCurrent, log, newGame, openMenu, continueGame, showEnding, autopilot, playAs, state, active, addWalk.

Entries (2):

- `PlaytestEntry` (interface) from `src/story/storyFlow.ts:24-33`: **move** · _not verified_
  `metrics: StoryScene['metrics']` stays valid, because core/flow (L9) may import story/engine/storyScene.
- `StoryFlow` (class) from `src/story/storyFlow.ts:35-405`: **move** · _not verified_
  Keep every public and private name scripts reach: state, autopilot, playAs, log, newGame, continueGame, openMenu, active, addWalk, hasProgress, nextLabel, debugPlay, debugReset, debugSkipCurrent, and the private showEnding (screenshot.mjs:219). Also keep the instance at flow.story. `state = loadCampaign()` at field init keeps its localStorage read, now from core/state/campaignSave. CHAPTERS comes from content/index, and StoryScene is constructed with the StoryCatalog. Imports: ui/screens/story/\*, ui/screens/supervillainedScene, ui/screens/controlsScene, story/engine/storyScene, story/pilot/autopilot.

#### `src/core/flow/greenZone/greenZoneScene.ts`

The 1.0 walk scene (class name GameScene kept). It composes the world, systems, effects, HUD and touch controls, and implements WorldAccess and Spawner.

Plan: GameSceneHooks, GameScene (scenes/gameScene): the constructor wiring, the WorldAccess getters, update (one PlayerIntent per step), render (skipped when covered), exit (destroys attackFx), debugState and teleport. Fields kept: rules, threats, ambush, player, events, fx, map, world, active.

Entries (2):

- `GameSceneHooks` (interface) from `src/scenes/gameScene.ts:29-33`: **move** as `GameSceneHooks` · _verified_
  Only scenes/flow.ts uses it (it becomes walkFlow).
- `GameScene` (class) from `src/scenes/gameScene.ts:36-349`: **move** as `class GameScene implements Scene, WorldAccess, Spawner` · _corrected by verifier_
  Keep the class name (constructor.name checks, \_\_sv.scene()). Fields and methods that scripts read stay: rules, threats, ambush, player, events, fx (fx.voices.root), map, world (snapCamera), active, teleport, debugState. Flow also uses worldRoot, hud, controls and setControlsEnabled. The getters and addEntity/removeEntity (122-145) stay and satisfy systems/greenZone/worldAccess structurally. Construction (69-74) now calls buildLevelTextures(levelDef.palette) before new World, then entities/stageDressing and entities/factory for the props and the player, because World no longer builds textures or creates entities. enter, setControlsEnabled, back, debugState and teleport are unchanged. render (232-243) skips controls and HUD work when !active or covered (audit 238-242). exit (314-322) also destroys AttackFx, ExitMarker and MagnetRings. The event-to-UI wiring (109-119) stays here as composition: attackStart and barkHit call attackFx.kick(). The voices keepIn (185-188) stays, reading the inset from config/ui VOICE_INSET (moved from AMBUSH.VOICE_INSET). The exit delay comes from config EXIT_DELAY.
  Verifier: The render skip condition is wrong. 'Skip HUD and controls work when !active or covered' changes the Briefing screen: - playGreenZone (184-189) sets active = false and pushes BriefingScene (dim 0.42) without hiding the HUD or the controls. - GameScene.update never runs under the briefing, but render does (SceneManager.render runs for every scene on the stack). - Hud's texts start as '' (hud.ts:47-60), so the HUD would show empty boxes, and the controls' drop icons would never get their first setPeeCharges. Skip only while hud.root and controls.root are hidden (the title backdrop, flow 69/72), or redraw on change. Everything else in the entry checks out: class name, fields, getters 122-145, wiring 109-119, keepIn 185-188, exit 314-322.

#### `src/core/flow/greenZone/greenZoneFx.ts`

Bindings from GameEvents to effects (class name GameFx and field `voices` kept).

Plan: The GameFx constructor handlers (gameFx 60-266), the footstep emitter (273-289) and the pee-stream spawns without per-step allocation (291-304). The presets come from config BURSTS.

Entries (3):

- `GameFx` (class) from `src/fx/gameFx.ts:43-348`: **move** · _corrected by verifier_
  Class name GameFx is kept, as are the public fields below, above, particles, popups, voices and terrainAt (screenshot.mjs:712 reads \_\_sv.scene().fx.voices.root.children). The constructor's ~25 event handlers (60-266), the footstep emitter (273-289) and the pee stream (291-304) stay here: presets come from config BURSTS/POPUP, and the pee preset object is built once instead of every step (audit gameFx:295-303). The at() helper (73-76) uses gridToScreenInto with a scratch point. New render(alpha) forwards to particles, popups, voices, RingLayer, BarkWaves and DigestionBubble. update(dt) only advances their state.
  Verifier: Placement is right, but the at() scratch-point idea is unsafe. Three handlers hold two at() results at once. In 'poop' (98-112), p is used at 112 after g is computed at 100. In 'bark' (158-166), start is used at 166 after end. In 'pollutionSurge' (214-216), g is used at 216-217 after p. One shared gridToScreenInto scratch would alias them and misplace the rings, waves and labels. These handlers run on events, not every step, so keep at() allocating, or give it two scratch points. The per-step allocations worth removing are the footstep, pee-stream and bubble gridToScreen calls (280, 293, 341).
- `Rules.doPoop+checkTreats` (method) from `src/systems/rules.ts:196, 229`: **split** as `GameFx handlers on 'poop' and 'treat' call player.bump(SQUASH_BUMP.POOP) and player.bump(SQUASH_BUMP.TREAT)` · _verified_
  The squash is purely visual (audit rules.ts:83-144). Both events are emitted synchronously in the same step (lines 199 and 230), so the bump lands in the same fixed step and stepped screenshots stay identical. Do not reuse the existing 'bump' event: it is the pug collision.
  Verifier: Verified: Emitter.emit is synchronous (events.ts:15-19), 'poop' and 'treat' are emitted only at rules 199 and 230, and bump touches only squashVel (zampano 145-146), with no RNG.
- `Threats.update+tryBark` (method) from `src/systems/threats.ts:93, 162`: **split** as `GameFx handlers on 'cat' and 'bark' call player.bump(SQUASH_BUMP.CAT) and player.bump(SQUASH_BUMP.BARK)` · _verified_
  Both events are emitted in the same step (90, 164), so the result is deterministic. GameFx already handles 'cat' and 'bark'.
  Verifier: 'cat' and 'bark' are emitted only at threats 90 and 164. The gameAudio 'bark' handler's Math.random is unaffected, because bump draws no randomness.

#### `src/core/flow/greenZone/greenZoneAudio.ts`

Bindings from GameEvents to audio.

Plan: bandRate, bindGameAudio (fx/gameAudio). BAND_PITCH and the duck levels go to config/audio.

Entries (2):

- `bandRate` (const (arrow function)) from `src/fx/gameAudio.ts:5`: **move** · _verified_
  Keeps one Math.random draw per call, in the same order. The stray imports at lines 6-7 move above it.
- `bindGameAudio` (function) from `src/fx/gameAudio.ts:10-72`: **move** · _verified_
  Imports: type GameEvents from systems/greenZone/events, type Emitter from core/util/emitter, type AudioEngine from core/audio/engine (all legal from L9). Every sound name it plays must stay in SoundName (core/audio/patches). Caller: walkFlow.newGameScene (today flow.ts:356). The handlers die with the per-scene Emitter, so no off() is needed. ASSETS.md:194 names the ambushVoice handler's path.
  Verifier: bindGameAudio spans 10-72. Its one caller is flow.ts:356. GameScene.exit calls events.clear(), which drops the handlers.

#### `src/core/assets/placeholders/critters/frame.ts`

_Not in the judge's file list: proposed by a mapper or verifier (see section 15)._

Entries (2):

- `Pt` (interface) from `src/assets/placeholders/critters.ts:217-220`: **move** · _not verified_
  DEVIATES from the target's draw.ts. body.ts, head.ts and hats.ts need Pt and the frame context type, while draw.ts imports them: draw.ts would close a cycle. See newFilesNeeded.
- `drawCritter.frameContext` from `src/assets/placeholders/critters.ts:223-252`: **split** as `interface CritterFrame { pb, spec, BASE, SHADE, DEEP, EYE, NOSE, MOUTH, fx, fy, px, py, body, rear, front, head, bodyY, groundY, facingCamera, facingAway, pose }; function critterFrame(spec, dir, pose, frame: {w, h, groundY}): CritterFrame` · _not verified_
  The ground-plane squash 0.55 stays here as art.

### Entities (requested): 27 files, 73 entries

#### `src/entities/entity.ts`

Entity extends Container: the base contract (see entityModel).

Plan: Entity (entities/entity 14-65). `bounds` is renamed cullBox, id comes from this.uid (nextId removed), sync becomes render(alpha), screenRect takes an out parameter, and there is a transitional `get view(): this`. New EntityContext and EntitySignal types.

Entries (8):

- `Entity` (class) from `src/entities/entity.ts:14-65`: **keep** as `abstract class Entity extends Container implements Sortable, StageEntity` · _verified_
  Same path. New fields: static, driver ('owner'|'world'), baseTint; `bounds` is renamed cullBox (read from CharacterDef/SpriteDef); `view` is removed (the entity is the Container). Imports change to core/math/depth and core/math/projection (gridToScreenInto), core/assets (registry) and core/stage/stageEntity (interface). Importers to update: core/stage/world (now via StageEntity), story/walk, story/carry, the Green Zone scene, and systems/rules (which switches to the Spawner/PlayerHandle interfaces). tests/sbrimbrulonActor imports only the type.
- `Entity.view` (field) from `src/entities/entity.ts:29`: **keep** as `get view(): this  (transitional, removed at cleanup)` · _verified_
  Outside readers to migrate: world.ts:75/173/184, walk.ts:122, carry.ts:19, storyScene.ts:455 (player.view.getGlobalPosition for the fog), scripts/screenshot.mjs:799 (that one is game.view, not an entity, so it is unaffected).
- `Entity.bounds` (field) from `src/entities/entity.ts:31`: **keep** as `cullBox` · _verified_
  Renamed to avoid confusion with Container getBounds/boundsArea; no Container member collides. Outside writer: story/walk.ts:126 (PickupEntity).
- `Entity.setPosition+savePrev` (method) from `src/entities/entity.ts:33-42`: **keep** · _corrected by verifier_
  Unchanged. World.beginStep now calls savePrev on dynamic entities only (static props never move).
  Verifier: 'Static props never move' is false for props placed by scripts. placeObject PropEntities are moved with setPosition at ch7.ts:105 (the banner follows the Doge every step), ch1.ts:241/330, ch4.ts:77 and ch8.ts:234/279/285. savePrev skipping applies only to entities created with static = true (stage dressing and the Green Zone exit flag), not to every PropEntity. See 70.
- `Entity.update` (method) from `src/entities/entity.ts:44`: **keep** as `update(dt: number, ctx: EntityContext): void` · _verified_
  Unifies the different step() signatures (Cat/Ball/PoopPile boolean, Bagnaskiz 'bump', Actor void). Must write no display state.
- `Entity.sync` (method) from `src/entities/entity.ts:47-54`: **keep** as `render(alpha: number): void + protected renderView(alpha: number): void` · _verified_
  Same arithmetic: lerp prev to current, project, then position.set(round(x), round(y - z)) and alpha = fade. Uses gridToScreenInto(scratch) instead of allocating a Vec2 (audit entity.ts:51). PropEntity's constructor-time sync(1) becomes render(1).
- `Entity.screenRect` (method) from `src/entities/entity.ts:56-59`: **keep** as `screenRect(out: Rect): Rect` · _verified_
  Fills a caller-owned Rect (removes 2 allocations per entity per frame, audit 56-59).
- `Entity.destroy` (method) from `src/entities/entity.ts:61-64`: **keep** as `override destroy(): void { alive = false; super.destroy({ children: true, context: true }) }` · _verified_
  Never pass texture: true (atlas textures are shared). Must match Container's destroy(options?) signature.

#### `src/entities/animation/animationState.ts`

Pure animation clock, advanced in update.

Plan: CharacterAnimator's logic (entity 68-103): key, anim, dir, time, speed, play, definition, finished, plus advance(dt), which reports whether the frame changed.

Entries (1):

- `CharacterAnimator` (class) from `src/entities/entity.ts:68-103`: **split** as `class AnimationState { key, anim, dir, time, speed, play(), definition, finished, advance(dt): boolean /* frame changed */ }` · _verified_
  The pure part: 70-97 and the clock of 98-100. Fields kept because scripts and tests read them: key (player.animator.key in screenshot.mjs and story-smoke.mjs), anim, speed, finished (sbrimbrulonActor.test.ts). The owning entities keep the field name `animator` for this object.

#### `src/entities/animation/characterSprite.ts`

Render side: shows an AnimationState frame and swaps the texture only when it changes.

Plan: CharacterAnimator.sprite and the texture swap in its update (entity 75-77, 98-102), using the name tables in manifest/names.

Entries (1):

- `CharacterAnimator.sprite+update` (method) from `src/entities/entity.ts:69, 77-78, 101`: **split** as `CharacterSprite extends Sprite { show(state) }` · _corrected by verifier_
  Removes the per-step textureName string build (audit entity.ts:101, manifest.ts:370) by using the precomputed frameNames(key) tables in core/assets/manifest/names. roundPixels = true moves with it. `animator.sprite` readers (Cat tint at 24, Bagnaskiz tint at 206, Zampano squash at 280-285) become `entity.body`.
  Before the correction: newName `class CharacterSprite extends Sprite { show(state: AnimationState) }  // texture swapped only when (key, anim, dir, frame) changed`.
  Verifier: The split removes animator.sprite, but tests/sbrimbrulonActor.test.ts reads it after step: actor.animator!.sprite.texture at 97-99 and pug.animator.sprite.texture at 114-118. Those assertions must change in the same commit: add a `frame` getter on AnimationState and assert that it changed, or call entity.render(1) and read entity.body.texture. Inside src, readers are only the entities (Cat 23-24, Bagnaskiz 122/206, Zampano 93/280-285, Actor 98-99).

#### `src/entities/animation/figureSprite.ts`

View for the special figures (legs, fortune, falcon, stag).

Plan: actor 81-100 (figure heights, falcon z and shadow) and 290-315 (texture swap, fps, mirror).

Entries (3):

- `Actor.constructor` (method) from `src/entities/actor.ts:81-93`: **split** as `FigureSprite + FIGURE_VIEW` · _corrected by verifier_
  Only the special-figure view branch moves: shadow choice, figure heights, falcon z and shadow alpha. The CharacterAnimator branch (95-100) becomes `this.body = new CharacterSprite(animState)`. The radius lines 68/93 go to config (STEERING.RADIUS). The initial falcon z 26 is sim state: FigureSprite exports it and Actor writes this.z in the constructor, so the first frame is unchanged.
  Before the correction: newName `class FigureSprite extends Sprite (+ FIGURE_VIEW table: {legs: h 64, shadowBig}, {fortune: h 66}, {falcon: h 12, z 26, shadowAlpha 0.5}, {stag: h 46, shadowBig})`.
  Verifier: Line 81 (the shadow choice) runs for every actor ('shadow' for characters), and the special branch is 83-93. FigureSprite extends Sprite, so it cannot own the sibling shadow: the Actor constructor reads FIGURE_VIEW[s].shadowBig/shadowAlpha and builds the shadow itself. The falcon's start z of 26 is sim state. Put it in config as STEERING.FLY.START_Z (next to HOVER_Z 24) rather than exporting it from a view module, so update-side code never imports render code.
- `Actor.animate` (method) from `src/entities/actor.ts:308-314`: **split** as `FigureSprite.show(time, moving, facing)` · _corrected by verifier_
  The special-figure frame pick (fps legs 5, falcon 8, others 2), the texture swap and the scale.x mirror move to render. The frame index derives from the `time` clock that advances in update, so stepped screenshots stay deterministic.
  Before the correction: newName `FigureSprite.show(time, moving, facing) in Actor.renderView  // frame = f(time, fps), texture swapped only on change, mirror`.
  Verifier: `moving` is a local today, passed from step to animate. The Actor must store the last update's moving flag in a field so that renderView can pass it (the legs pick their frame from it at 310). Values come from the last step, so stepped screenshots stay identical.
- `inline: special-figure fps and mirror threshold` (inline) from `src/entities/actor.ts:310, 314`: **move** as `FIGURE_VIEW[s].fps {legs 5, falcon 8, default 2}; MIRROR_AT 0.2` · _verified_
  Sprite clip timing is art data that stays out of config (decision: manifest and art data stay out). It travels with FigureSprite as the target lists.

#### `src/entities/zampano.ts`

Player dog: holds a PlayerBody record, calls systems/player, renders squash, tint, blink and tremble.

Plan: STATE_ANIM, Zampano (zampano 50-287): setSkin, setIntent(intent), startAction, bump, knockback, bounce, face, canRun, controllable. update(dt, ctx) wraps the old updateMovement, and renderView holds updateAnimation 244-286. Fields kept for scripts: animator(.key), state, invulnerable, setPosition, face, speedMul, noRun, guarding, pushX/Y, energy, moving, running.

Entries (6):

- `STATE_ANIM` (const) from `src/entities/zampano.ts:32-41`: **keep** · _verified_
  View table (state to clip); stays with the entity per the target.
- `Zampano` (class) from `src/entities/zampano.ts:50-287`: **keep** · _corrected by verifier_
  Same path. Holds a PlayerBody record {gx, gy, vx, vy, knockX, knockY, pushX, pushY, facing, state, stateTime, stateDuration, running, fetchDir, intent} consumed by systems/player/playerMotion. driver 'owner': Rules steps it in the Green Zone (rules.ts:88/97) and StoryScene steps it in the story (storyScene.ts:414). CARE: systems/greenZone/rules may not import entities, so it calls it through PlayerHandle.update(dt, ctx); EntityContext must therefore be declared in systems (see newFilesNeeded). Fields and methods that scripts and story read keep their names: animator(.key), state, invulnerable, setPosition, face, speedMul, noRun, guarding, pushX/Y, energy, energyEvent, moving, running, vx/vy (World camera look-ahead), shadow, controllable, canRun, startAction, bump, knockback, bounce, setSkin. The player is created by entities/factory, not World.
  Verifier: Do not keep a separate PlayerBody copy of gx/gy/vx/vy/pushX/pushY/knockX/knockY/state/stateTime/running. All of them are read or written from outside every step: threats writes pushX/Y, World reads vx/vy, setPosition and teleport write gx/gy, startAction writes state, ambush and combat call knockback, and scripts read state and invulnerable. Zampano should implement PlayerBody structurally and pass `this`, with only the private input fields (intentX/Y, runWanted, fetchDir) in a nested record or made non-private. The EntityContext-in-systems point is right (see newFilesNeeded).
- `Zampano.constructor+setSkin+startAction+bump+face+controllable+moving+canRun` (method) from `src/entities/zampano.ts:88-147, 171-174`: **keep** · _verified_
  The constructor adds shadow and CharacterSprite as children of `this` (no view). setSkin swaps animState.key and forces a body refresh in the next render. startAction keeps the action state machine and fetchDir. bump only adds to squashVel (a visual clock). `moving` reads PLAYER_MOTION.MOVING.
- `Zampano.setIntent` (method) from `src/entities/zampano.ts:121-125`: **keep** as `setIntent(intent: Readonly<PlayerIntent>): void` · _verified_
  CARE: PlayerIntent.run must be `boolean | 'scripted'`. story/steps.ts:297 (move step) passes 'scripted', which runs without spending energy; story/walk.ts:281 and rules.ts:96 pass input.runHeld. The zero-intent calls (storyScene 139/284/320, gameScene 182, rules 87, steps 290) become setIntent(NO_INTENT). The intent is screen-space, exactly as today.
- `Zampano.updateAnimation` (method) from `src/entities/zampano.ts:245-278`: **keep** as `private advanceView(dt): void  // clip choice, idleTime, AnimationState speed + advance, squash spring integration` · _verified_
  Runs inside update(dt, ctx) so stepped screenshots and seeded playtests stay deterministic: the spring and the clip timer advance at the fixed step, not per frame.
- `Zampano.updateAnimation` (method) from `src/entities/zampano.ts:279-285`: **keep** as `protected override renderView(alpha): void  // body.show(animState), squash scale, invulnerability blink alpha, hurt/scared tint, scared tremble x` · _verified_
  Display writes only; no time integration. The blink uses alpha, as today.

#### `src/entities/actor.ts`

Scripted character: holds motion state, steers through systems/motion, renders tint, hover and mirror.

Plan: Actor (actor 40-342): face, faceToward, setBehavior, knock, flash, emote, playAction, beginAction, foe, sight, hostile, alert, arrived, speedScale. step() becomes update(dt, ctx). The `readonly name` constructor property becomes Container `label`.

Entries (9):

- `Actor` (class) from `src/entities/actor.ts:40-342`: **keep** · _corrected by verifier_
  Stays at the same path; it now extends Entity (Container), driver 'owner' (StoryScene steps the actors after the player, Ambush steps the band). The constructor property `readonly name` becomes Container `label`: it collides with findMixin's deprecated `name` under noImplicitOverride/ES2022 fields. Its only reader is the storyScene actors Map key, which uses the argument, not the field; also update the ambush.ts:154 construction. Fields that scripts and story read keep their names: behavior, foe (screenshot.mjs:372/392), sight, hostile, alert, arrived, speedScale, who, alive, facing, animator, sprite. New: a plain ActorBody record {gx, gy, z, facing, knockX, knockY, radius, patrolIndex, pauseLeft, wanderTarget, think, fleeDir, arrived} passed to systems/motion/steering. `sprite` stays the readonly main body child, but outside writers (helpers.ts:269, ch7.ts:362, combat.ts:403) switch to baseTint or flash(). tests/sbrimbrulonActor.test.ts: its pixi.js mock Container must gain `uid`, `label`, `position.set`, `visible`, `alpha`, and its `actor.step(dt, map, player)` calls become `actor.update(dt, ctx)` in the same commit.
  Verifier: Two changes. (1) The proposed ActorBody {gx, gy, z, facing, knockX, knockY, radius, patrolIndex, pauseLeft, wanderTarget, think, fleeDir, arrived} lacks `time` (patrol sway at 184, fly circling at 258-259, hover z at 274) and `speedScale` (278-279), and steer cannot work without them. (2) Do not keep a separate copy of gx/gy/z/facing/arrived. setPosition, ambush (m.actor.arrived, m.actor.fade), steps and scripts read and write these on the Actor, so a copied record would go out of sync. Pass the Actor itself as the body for its public fields, and keep only the private motion state (knockX/Y, patrolIndex, pauseLeft, wanderTarget, think, fleeDir, radius) in a nested `motion` record, or make those fields public (TS rejects private fields against a structural interface). Test note: the sbrimbrulonActor mock needs nothing beyond addChild/destroy for update(); what breaks is lines 97-99, which read actor.animator!.sprite.texture (see 59).
- `inline: random initial animation clock` (inline) from `src/entities/actor.ts:66`: **keep** · _verified_
  `Math.random() * 10` at construction is an RNG call site; it stays where it is, in the same order (it de-syncs idle loops). Not config.
- `Actor.face+faceToward+setBehavior+knock` (method) from `src/entities/actor.ts:105-129`: **keep** · _verified_
  State setters; they write into the ActorBody record (faceToward mutates facing in place instead of allocating). face(d) sets animState.dir. knock() is kept because story/combat.ts calls it.
- `Actor.flash` (method) from `src/entities/actor.ts:132-134, 147-150`: **keep** as `flash(seconds = STEERING.FLASH); renderView: body.tint = baseTint x (hitFlash > 0 ? TINTS.HURT : white)` · _verified_
  The timer stays in update; the tint write at 149 moves to renderView and multiplies with baseTint. That replaces story/combat.ts:403 `a.sprite.tint = 0xffffff` and ch7.ts:362 `u.sprite.tint = 0xffd890` (TINTS.USURPER).
- `Actor.step` (method) from `src/entities/actor.ts:137-160, 287`: **keep** as `update(dt, ctx)` · _corrected by verifier_
  The shell stays in the entity: time clock, hitFlash countdown (the tint write at 149 moves to renderView), the foe stun/windup gate (it uses ctx.player instead of the `player` argument), the action-lock gate, then steer(...) and the clip choice. Owners call it where they call step() today: storyScene.ts:415 and systems/ambush.ts:87 (through BandMember.update). The `player: Entity` parameter becomes ctx.player {gx, gy, vx, vy}.
  Before the correction: lines `137-138, 147-148, 151-160, 287`; newName `update(dt: number, ctx: EntityContext): void`.
  Verifier: The shell order must stay exactly as today: time += dt (138) -> stepKnock (139-146) -> hitFlash countdown (147-148; the tint write at 149 goes to renderView) -> foe gate with ctx.player (151-156) -> action-lock gate (157-160) -> steer (161-286) -> chooseClip (287). Callers: storyScene.ts:415 and ambush.ts:87.
- `Actor.animate` (method) from `src/entities/actor.ts:290-306`: **keep** as `private chooseClip(dt, moving, running): void  // AnimationState.play + advance` · _verified_
  The clip choice and the emote/idle-sit counters are logic, called at the end of update(). animator.update(dt) (305) becomes animator.advance(dt) on the pure AnimationState. The texture write moves to CharacterSprite in render. The sit rule reads CHARACTERS[key].anims.sit and STEERING.SIT_AFTER.
- `Actor.emote+playAction+beginAction` (method) from `src/entities/actor.ts:318-341`: **keep** · _verified_
  Drive AnimationState (play with restart, speed = 1) and the movement-lock flag; no display writes. emote's default 0.6 s goes to STEERING.EMOTE.
- `Combat.stop (sprite tint reset)` (method) from `src/story/combat.ts:403`: **split** as `a.baseTint = TINTS.NONE (Actor.baseTint, applied in renderView)` · _not verified_
  Removes the outside write to sprite.tint (the entity model).
- `Ambush.poop` (method) from `src/systems/ambush.ts:229-231`: **split** as `Actor.playAction(anim, seconds, speed?): boolean, used as BandMember.playAction (returns false when the actor has no animator)` · _verified_
  The clip lookup (CHARACTERS[key].anims.poop, animationDuration) stays in Ambush because it reads pure manifest data. Only the animator write (a.animator.speed) moves behind the entity. rules.dropPoop(x, y) and the bandPoop event stay.
  Verifier: Feasible. Actor.playAction(anim, seconds?) exists at actor.ts:325, and beginAction resets animator.speed = 1, so the speed argument must be applied after beginAction. The return value is true only when the animator and clip exist and seconds > 0, the same as today's `clip && a.animator` guard.

#### `src/entities/critters/cat.ts`

Green Zone cat.

Plan: Cat (critters 11-74). The AI goes to systems/greenZone/critterAi; the hop and fade move to render; its end is reported through signal('expired').

Entries (2):

- `Cat` (class) from `src/entities/critters.ts:11-74`: **move** · _verified_
  driver 'owner' (Threats steps cats through Spawner-created handles). Fields kept: state, age, caught (Threats and debugState read them), gx/gy (screenshot.mjs). variantTint (from Threats' CAT_TINTS, which moves to config/colors TINTS.CATS) becomes baseTint, applied in renderView. startle() moves with the class. The importer systems/threats.ts:4 switches to the Spawner interface; tests/sbrimbrulonActor imports only Bagnaskiz.
- `Cat.step` (method) from `src/entities/critters.ts:61-72`: **keep** as `update(dt, ctx)` · _corrected by verifier_
  CARE: the startle hop is z today, so it is lerped via prevZ and enters screenRect. If it becomes a render offset as the target says, compute it from an interpolated stateTime, or the 0.3 s hop can differ by 1 px in stepped screenshots. Alternatively keep the hop in z (sim state) for byte-identical output. The `return stateTime < 1.2` lifecycle becomes signal('expired'); threats.ts:86-98 removes the cat on the signal.
  Before the correction: newName `update(dt, ctx) [clip choice + AnimationState.advance + ctx.signal('expired', this) when the leave fade ends] / renderView(alpha) [hop offset, leave fade into alpha]`.
  Verifier: Choose the byte-identical alternative. Keep the startle hop in z (67) and the leave fade in `fade` (69), both written in update. Under the entity model both are sim state: Entity.render already lerps prevZ to z and applies alpha = fade, and screenRect keeps the hop. Cat is not fadeable, so World never overwrites fade. renderView then only applies baseTint (the variant tint from line 24) to the body. Replace `return stateTime < 1.2` with signal('expired') at the same point. Threats iterates cats backwards and splices, so a synchronous handler that splices the current index is safe.

#### `src/entities/critters/ball.ts`

Bouncing ball.

Plan: Ball (critters 77-103). The bounce and fade move to render.

Entries (2):

- `Ball` (class) from `src/entities/critters.ts:77-103`: **move** · _verified_
  driver 'owner' (Threats). Fields kept: age, taken (Threats sets it), gx/gy (screenshot.mjs:693 teleports next to threats.balls[0]). The magnet pull stays in systems/greenZone/threatLogic.
- `Ball.step` (method) from `src/entities/critters.ts:92-102`: **keep** as `update(dt, ctx) [age, t clocks; signal('expired') when taken or faded] / renderView [bounce y = -round(|sin(t*4)|*6), fade into alpha]` · _verified_
  The sprite.y write (96) leaves the fixed step; the t clock still advances in update, so stepped screenshots are unchanged.

#### `src/entities/critters/bagnaskiz.ts`

Bully pug.

Plan: Bagnaskiz (critters 106-214). The dirt trail goes through ctx.pollute, bumps through signal('bump'), and the flee AI through critterAi with a think timer (audit cat 3).

Entries (3):

- `Bagnaskiz` (class) from `src/entities/critters.ts:106-214`: **move** · _verified_
  driver 'owner' (Threats). Fields kept: state, hits, target, active (story-smoke.mjs and screenshot.mjs:658-674 read threats.pug.gx/gy/state; debugState reads pug). tests/sbrimbrulonActor.test.ts imports it from '../src/entities/critters': change it to '../src/entities/critters/bagnaskiz' in the same commit, or keep a temporary src/entities/critters.ts shim (`export * from './critters/cat'` etc.). With the shim, critters.ts and the critters/ folder coexist; that is legal under bundler resolution, but delete the shim at cleanup.
- `Bagnaskiz.active` (getter) from `src/entities/critters.ts:127-129`: **keep** · _added by verifier_
  hit() (132) and the director's 'pug gone' test read it, and stepPug/hitPug need the same predicate. critterAi exports pugActive(body), and the getter delegates to it.
- `Bagnaskiz.step` (method) from `src/entities/critters.ts:186, 202-206`: **keep** as `update(dt, ctx) / renderView(alpha)` · _corrected by verifier_
  map.stampDirt from inside the entity becomes ctx.pollute; the call stays at the same point in the step, so the dirt field is unchanged. threats.ts:143 stops reading a return value and listens for signal('bump'); signal('expired') fires when state becomes 'gone'.
  Before the correction: lines `147-149, 167-171, 186, 202-206`; newName `update(dt, ctx) [stateTime, bump cooldown, stepPug, trail timer -> ctx.pollute(gx, gy, TRAIL_RADIUS, TRAIL_STRENGTH), clip choice, ctx.signal('bump'|'expired')] / renderView [stun blink tint, flee fade]`.
  Verifier: The entity keeps the clip choice (202-205, via AnimationState), the ctx.pollute call from out.stamp (see 37), and signal('bump') / signal('expired'). The stun-blink tint (206) and the flee fade (186) are applied in render from stateTime, or keep fade in update. Gap: EntityContext {map, player, time, pollute, signal} has no pickTarget, yet stepPug needs threats' pickGreenTarget, which uses threats' seeded Rng and pug position. Inject it at creation: Spawner.pug(x, y, pickTarget), stored on the entity. tests/sbrimbrulonActor.test.ts:106-123 calls pug.step(dt, map, px, py, pick) and reads pug.animator.sprite.texture, so it must build a ctx, inject pick, and assert on a frame index.

#### `src/entities/items/treat.ts`

Treat pickup.

Plan: Treat (items 10-27). Its bob clock advances in update and is applied in render.

Entries (2):

- `Treat` (class) from `src/entities/items.ts:10-27`: **move** · _corrected by verifier_
  driver 'world': World.updateEntities advances it (today World.endStep calls update(dt) on every non-player entity, and Treat is the only one that does work). The Math.random() \* 6 phase stays a construction-time RNG call in the same place. Created by the factory as Spawner.treat (rules.ts:64); scripts read rules.treats[].gx/gy.
  Verifier: Driver 'world' is right, but the claim that Treat is the only entity doing work in World.endStep is wrong. PickupEntity.update (story/walk.ts:131-141: bob and marvel pulse, writing sprite.y and alpha) and Carried.update (story/carry.ts:25-28: follows the player) also run there, so all three are the driver 'world' set. The Math.random()\*6 phase stays at construction.
- `Treat.update` (method) from `src/entities/items.ts:23-26`: **keep** as `update(dt, ctx) [t += dt] / renderView [sprite.y = -LIFT - round((sin(t*RATE)+1)*AMP)]` · _verified_

#### `src/entities/items/poopPile.ts`

Poop pile.

Plan: PoopPile (items 32-79). The spread goes through ctx.pollute, the cleaned fade is applied in render, and removal goes through signal.

Entries (2):

- `PoopPile` (class) from `src/entities/items.ts:32-79`: **move** · _verified_
  driver 'owner' (Rules steps poops, rules.ts:130). Fields kept: surface, baseRadius, strength, radius, age, cleaned (Rules writes it); scripts read rules.poops.length. The PoopSurface type comes from systems/world/tiles.
- `PoopPile.step` (method) from `src/entities/items.ts:62-78`: **keep** as `update(dt, ctx) [fadeOut/age/tick clocks; growth -> ctx.pollute(gx, gy, radius, strength); signal('expired') after CLEAN_TIME] / renderView [cleaned alpha and scale, hidden alpha]` · _verified_
  map.stampDirt becomes ctx.pollute at the same tick, so the dirt field is unchanged. rules.ts:130 `if (!poop.step(dt, map))` becomes a signal listener. The sprite.alpha/scale writes at 58/65-66 move to renderView.

#### `src/entities/prop.ts`

Static scenery (static = true: positioned once; alpha is written only when the fade changes).

Plan: PropEntity (prop). A baseTint option replaces the sprite.tint writes at helpers 269 and ch7 362.

Entries (3):

- `CH7.subLevels['7.2'] banner follow` (walk-callbacks) from `src/campaign/chapters/ch7.ts:84, 89, 103-106`: **split** as `PropEntity follow option { target, dx: 0.3, dy: -0.1 } (driver 'world'), requested by ctx.stage.place('banner', at, { follow: { actor: 'doge', dx: 0.3, dy: -0.1 } })` · _not verified_
  The initial offset (S - 0.3, S - 1.1) equals the Doge's spawn (S - 0.6, S - 1) plus (0.3, -0.1), so one offset covers both lines. world.updateEntities applies the follow after the owners have moved the actors, so the banner no longer lags one step behind the Doge. This is visual only: the prop is not solid (mapProp null). There is no playtest effect, but a 7.2 screenshot may move by a pixel. followLeader's onUpdate at 103-106 goes away.
- `placeObject.tint` (function-part) from `src/campaign/chapters/helpers.ts:269`: **split** as `PropEntity option baseTint, applied in renderView` · _not verified_
  Content no longer writes sprite.tint (audit cat 4). Used for the red ball in ch1 1.4 and ch8 8.4.
- `PropEntity` (class) from `src/entities/prop.ts:8-26`: **keep** · _corrected by verifier_
  Same path. static = true, driver 'world' with a no-op update, so it gets no savePrev and no per-frame position write; World writes alpha only when fade changes and culls it per ground chunk (audit world.ts:167-181, about 692 props in the Green Zone). The cull box stays derived from SPRITES[kind] (no change). New `baseTint` constructor option replaces helpers.ts:269 `e.sprite.tint = tint`. Created by entities/stageDressing (map props, forest, walls), the factory (placeObject in ch1/ch7/ch8) and the Green Zone scene (exitFlag, gameScene.ts:82). `kind` and `mapProp` do not collide with Container.
  Verifier: static must be a constructor option (default false), not a property of every PropEntity. Only entities/stageDressing (map props, wall blocks, forest) and the Green Zone exit flag (gameScene.ts:82) are static. Props created through placeObject (factory/ctx.stage.place) are moved by scripts (ch7.ts:105 every step, ch1.ts:241/330, ch4.ts:77, ch8.ts:234/279/285): with static = true they would get no savePrev, no position write and no re-sort, and the Doge's banner would stay put. For per-chunk culling of static props, the chunk's screen bounds must be grown by each prop's SpriteDef extent: trees, gates (64x66) and wall blocks overhang their tile's chunk.

#### `src/entities/pickup.ts`

Walk pickup.

Plan: PickupEntity (walk 108-142). The bob and pulse are applied in render.

Entries (1):

- `PickupEntity` (class) from `src/story/walk.ts:108-142`: **move** · _not verified_
  entities never imports story, so `readonly def: Pickup` cannot stay. The constructor takes {sprite: SpriteKey | null, lying, marvel}. Either the entity carries a generic payload (PickupEntity&lt;T>, `readonly data: T`), or the walk keeps a Map&lt;PickupEntity, Pickup>; WalkStep reads e.def at 300/537. The phase draw `Math.random() * 6` stays in the constructor, so spawn order keeps the RNG order. t advances in update, and the bob and pulse are applied in renderView. bounds becomes cullBox, derived from the SpriteDef. entities/factory constructs it. The shadow and body become children of the entity itself (no `view`).

#### `src/entities/carriedLabel.ts`

Label above a target entity.

Plan: Carried (story/carry 11-29), renamed CarriedLabel, which follows a target entity instead of a StoryScene.

Entries (1):

- `Carried` (class (extends Entity)) from `src/story/carry.ts:11-29`: **move** as `class CarriedLabel extends Entity (driver 'world'; constructor(text, target: Readonly<{gx, gy}>))` · _not verified_
  It follows a target entity (the player) instead of holding the whole StoryScene. `this.view.addChild(label)` becomes `this.addChild(label)`, and PixelText comes from core/render/text/pixelText. update(dt, ctx) copies target.gx/gy into gx/gy; render(alpha) projects as for any entity. Order is preserved: today World.endStep (world.ts:153) runs it after StoryScene has moved the player (storyScene.ts:414). In the target, world.updateEntities runs after the owner-driven player step, so the label still copies the player's position after he moves.

#### `src/entities/factory.ts`

EntityFactory: implements the systems Spawner and the story stage's place().

Plan: The constructions at rules 64/182, threats 190-220 and ambush 154, placeObject's construction (helpers 266-272), and the player creation (world 67).

Entries (7):

- `placeObject.construct` (function-part) from `src/campaign/chapters/helpers.ts:267-268`: **split** as `EntityFactory.prop(key, variant, at, { baseTint?, follow? }): PropEntity` · _not verified_
  new PropEntity(key, variant, x, y, null, false): no map prop (not solid), not fadeable. The factory is the one place that builds props for story stages.
- `Ambush.rushIn+handle` (method) from `src/systems/ambush.ts:154, 159, 134`: **split** as `EntityFactory.bandMember(key, x, y): BandMember and EntityFactory.remove(e), implementing Spawner.bandMember and Spawner.remove` · _verified_
  Only the construction and destruction move. rushIn keeps the entry search, faceToward, setBehavior and emote calls through the BandMember handle, in the same order.
  Verifier: The Actor constructor draws Math.random (actor.ts:66, the time field), so factory.bandMember must run at the same point inside the forEach (the note already keeps the order).
- `Rules.constructor` (method) from `src/systems/rules.ts:64-66`: **split** as `EntityFactory.treat(x, y): TreatHandle (Spawner.treat)` · _verified_
  The placeTreats loop and this.treats.push stay in Rules, in the same order. Treat is a 'world' driver, so World.updateEntities advances its bob.
  Verifier: The Treat constructor draws Math.random (items.ts:11), so factory.treat must stay inside the placeTreats loop at the same position, as the note says.
- `Rules.dropPoop` (method) from `src/systems/rules.ts:182, 184`: **split** as `EntityFactory.poop(x, y, surface, footprint): PoopHandle (Spawner.poop)` · _verified_
  dropPoop stays public in Rules (Ambush calls it) with the surface and footprint queries, the poops.push and map.stampDirt. Its return type becomes PoopHandle.
- `Threats.spawn` (method) from `src/systems/threats.ts:190-192, 202-204`: **split** as `EntityFactory.cat(x, y, tint): CatHandle and EntityFactory.ball(x, y): BallHandle (Spawner.cat / Spawner.ball)` · _verified_
  The timers, rng.range, the spot search through map.randomSpotNear, rng.pick(TINTS.CATS) and the ballSpawn event stay in Threats, in the same order.
- `Threats.startAttack` (method) from `src/systems/threats.ts:218-220`: **split** as `EntityFactory.pug(x, y, target): PugHandle (Spawner.pug)` · _verified_
  The spot search and the attackStart event stay in Threats.
- `World.constructor` (method) from `src/world/world.ts:67-69`: **split** as `EntityFactory.createPlayer(map: GameMap, skin: PlayableCharacterKey = 'zampano'): Zampano  // at map.start, face('N'); then world.setPlayer(p)` · _verified_
  Created last, after the dressing, as today, so its uid (depth tie-break) keeps the same rank. camera.bounds = walkableBounds(4) (line 70) stays in the World constructor.

#### `src/entities/stageDressing.ts`

Map props, wall blocks and forest decoration.

Plan: The prop loop (world 55-63), spawnWallBlocks and spawnForest (world 110-138); the PROP_SPRITE key check against PropKind.

Entries (2):

- `World.constructor` (method) from `src/world/world.ts:57-63`: **split** as `function dressMapProps(world: World): void  // a PropEntity per map prop, variant = floor(hash2(i, j, 3) * variants), bush/vine depthBias` · _verified_
  Must run in the same order relative to the walls, forest and player (props, then walls, then forest, then player): insertion order feeds the depth tie-break via uid, and objectLayer child order.
- `World.spawnForest+spawnWallBlocks` (method) from `src/world/world.ts:110-138`: **split** as `function spawnWallBlocks(world): void; function spawnForest(world): void` · _verified_
  The hash2 salts 5, 21 and 22 stay inline. Call order: walls before forest (world.ts:64-65). Forest is skipped when opts.forest === false.

#### `src/entities/effects/particles.ts`

Pooled particles: state integrated in update, sprites written in render, destroy() frees the pool; optional spin, used for the snap sparks.

Plan: Particle, BurstOptions, Particles (fx/particles); Spark and its integration (supervillained 11-18, 106-115). The pool hides sprites instead of removing them. A `root` getter is kept for one step.

Entries (6):

- `Particle` (interface) from `src/fx/particles.ts:5-18`: **move** · _corrected by verifier_
  `spin` is declared but always 0 at HEAD. It becomes live when supervillainedScene's Spark (11-18, 106-115) merges into Particles.
  Verifier: Particle.spin's doc comment (line 16) says 'Texture frames to blink through', and the class doc (lines 34-36) says 'no rotation'. supervillainedScene's Spark.spin is a rotation speed in rad/s (`s.rotation += spin*dt`, line 111). Spark also differs in other ways: no drag, a linear alpha fade (left\*2) instead of the flicker, unrounded positions, and different Math.random draws (ang, speed, life, spin) from Particles.burst (angle, speed, life, 2x spread). Merging it needs spin redocumented as rotation plus per-burst options for fade style and drag 0. The snap's look and random-draw order will change, so diff its screenshot.
- `BurstOptions` (interface) from `src/fx/particles.ts:20-32`: **move** · _corrected by verifier_
  Gains optional spin. Config presets are string-keyed and checked with `satisfies` at the use sites.
  Verifier: Declare the array fields readonly (textures: readonly SpriteKey[], colors: readonly number[], speed/life/angle: readonly [number, number]). Without that, the `as const` config presets fail `satisfies BurstOptions` (see entry 21). It also gains spin, plus the fade-style option for the Spark merge.
- `Particles` (class) from `src/fx/particles.ts:38-105`: **move** as `class Particles extends Container` · _corrected by verifier_
  update(dt) integrates drag, gravity and life; render(alpha) writes positions and flicker alpha (audit cat. 4 particles:73-96). Dead sprites are hidden and stay pooled as children instead of removeChild/addChild (audit cat. 3 particles:54-81). New destroy() frees the pool (audit cat. 2 particles:79). A `root` getter returns `this` for one step (storyScene:191 and gameFx:67 add .root). Consumers: greenZoneFx, StoryScene, and the story ctx.effects.burst facade.
  Verifier: Hiding dead sprites with `visible = false` does not fix the audit finding. In pixi.js 8.23 the Container visible setter sets parentRenderGroup.structureDidChange (node_modules/pixi.js/lib/scene/container/Container.mjs:1059-1063), and so does renderable (1102-1110). Only alpha (952-956) is a plain UPDATE_COLOR. The pee stream and footsteps spawn and kill particles on most steps, so pooled particles must stay as children parked at alpha = 0, never toggled visible. The rest holds: update integrates, render writes; destroy() frees the pool; the `root` getter covers storyScene:191 and gameFx:67.
- `Spark` (interface) from `src/scenes/supervillainedScene.ts:11-18`: **merge** as `Particle (gains rotation and spin)` · _verified_
  Particle already has a `spin` field, always 0 and mis-documented (fx/particles.ts:16-17). Make it a real angular velocity.
- `SupervillainedScene.update (spark integration)` (method) from `src/scenes/supervillainedScene.ts:33, 106-115`: **split** as `Particles.update(dt) with per-particle { drag: 0, round: false, fade: 'half', rotation += spin*dt }` · _verified_
  Screenshots must stay identical. Particles today applies drag (default 1.5), rounds positions, flickers at the end and removes dead sprites. Sparks have no drag, keep fractional positions, fade with clamp(left\*2), rotate, and are hidden rather than removed. Each of these must be an option. The Particles root goes into this.stage at index 1 (behind the logo, in front of the halo), so it shakes with the stage.
- `SupervillainedScene.snap (spark spawn)` (method) from `src/scenes/supervillainedScene.ts:128-142`: **split** as `Particles.spawn(x, y, { texture, tint, vx, vy, life, spin, gravity, drag: 0, fade: 'half', round: false })` · _corrected by verifier_
  Use a single-spawn API, not burst(): burst draws Math.random in a different order (angle, speed, life, spread) and spreads angles uniformly. The per-index loop (every third a star, angle i/N plus jitter, start at 0.8 of the half-size, upward kick, spin) stays in snap() so the draw order is unchanged.
  Verifier: Keeping the loop in snap() with a single-spawn API is right for the Math.random order (angle jitter, speed, life, spin). But draw order would flip: - Today each spark is inserted with `this.stage.addChildAt(s, 1)` (141), so every new spark goes under the previous ones: [glow, s33, …, s0, logo]. - Particles appends with addChild, which gives [s0 … s33] inside its root: the reverse stacking. Overlapping stars and sparkles of different tints would change pixels. Particles.spawn needs an option to insert at index 0 of its root (or a reversed-order flag).

#### `src/entities/effects/popups.ts`

World popups and voices.

Plan: Popup, Popups (fx/popups). The pool key gains glow, align and maxWidth; blinks use alpha; the `root` alias is kept (scripts read fx.voices.root.children).

Entries (2):

- `Popup` (interface) from `src/fx/popups.ts:7-19`: **move** · _verified_
- `Popups` (class) from `src/fx/popups.ts:25-119`: **move** as `class Popups extends Container` · _corrected by verifier_
  keepIn is kept (set every step at gameScene:188 and storyScene:423). Rect comes from core/math/depth and PixelText from core/render/text, so there is no ui import. The pool key adds glow, align and maxWidth (fixes the gameFx:236 workaround). Icon sprites are pooled (audit popups:37). The blink-out uses alpha (audit popups:111). Pooled texts stay as hidden children (visible=false), so screenshot.mjs:712's `c.visible && c.content` test still holds. A `root` getter returns `this` (scripts read fx.voices.root.children). Motion and keepIn run in update; position, scale and alpha are written in render. destroy() keeps freeing pooled texts.
  Verifier: The design is fine, but 'fixes the gameFx:236 workaround' is inaccurate. glowAlpha is already in the pool key (popups 218). The 236 comment only quantizes glowAlpha to keep the pool small, as entry 28 rightly keeps. The real latent bug is that the key omits glow (colour), align, maxWidth, outlineWidth and shadow, so a pooled text could come back with the wrong wrap or alignment. Add those. Hiding pooled texts with visible=false is acceptable here: popups are event-driven (rare structure changes), and screenshot.mjs:712's `c.visible && c.content` needs it. keepIn sites (gameScene:188, storyScene:423) are verified.

#### `src/entities/effects/ringLayer.ts`

Expanding iso rings, redrawn only while rings are alive.

Plan: Ring, the ring list and the ringG drawing (gameFx 24-31, 118-120, 322-337).

Entries (2):

- `Ring` (interface) from `src/fx/gameFx.ts:24-31`: **move** · _verified_
- `GameFx.update+ringG+rings (iso rings)` (method) from `src/fx/gameFx.ts:50, 52, 66, 118-119, 216, 321-337`: **split** as `class RingLayer extends Container { add(x, y, radius, dur, color, delay = 0); update(dt); render() }` · _verified_
  Today ringG.clear() runs every step even with no rings (audit gameFx:323-336, medium). RingLayer redraws through core/render/redraw only while a ring is alive, and once more to clear. It uses HALF_W/HALF_H from core/math/projection instead of 16/8.
  Verifier: HALF_W and HALF_H are module-private today (iso/projection.ts:16-17). core/math/projection must export them, as the target lists.

#### `src/entities/effects/barkWaves.ts`

Pooled bark sound waves.

Plan: Wave (renamed BarkWave), the spawn (gameFx 160-170) and the motion (306-320).

Entries (2):

- `Wave` (interface) from `src/fx/gameFx.ts:14-22`: **move** as `interface BarkWave` · _verified_
  Renamed to avoid a clash with core/audio/synth's exported Wave. Its sprite comes from a pool, not new Sprite() per bark (audit cat. 3 gameFx:162).
  Verifier: core/synth.ts:6 exports `type Wave`, so the rename is justified.
- `GameFx.update+constructor (bark waves)` (method) from `src/fx/gameFx.ts:160-167, 305-320`: **split** as `class BarkWaves extends Container { spawn(start, end, dirIndex, life); update(dt); render(alpha) } with pooled sprites` · _verified_
  The 'bark' handler keeps the popup, the shake and computing start/end, then calls waves.spawn. Motion advances in update; position, scale and alpha are written in render (audit cat. 4 gameFx:268-347).
  Verifier: Z-order: wave sprites today are appended to `above` after particles, popups, voices and the bubble (65-71, 165), so they draw on top. Add the BarkWaves container to `above` last.

#### `src/entities/effects/digestionBubble.ts`

Need-to-poop bubble.

Plan: gameFx 70, 339-346 (the blink uses alpha).

Entries (1):

- `GameFx.bubble (digestion bubble)` (method) from `src/fx/gameFx.ts:53, 68-71, 338-346`: **split** as `class DigestionBubble extends Container { update(dt, warning); render(alpha, playerScreen) }` · _verified_
  The 8 Hz blink becomes alpha instead of `visible` (audit gameFx:342). GameFx passes bubbleState() into update.

#### `src/entities/effects/magnetRings.ts`

Ball magnet rings, drawn only near balls.

Plan: drawMagnetFields (gameScene 246-263), using HALF_W/HALF_H.

Entries (1):

- `GameScene.drawMagnetFields` (method) from `src/scenes/gameScene.ts:60, 96, 245-263`: **split** as `class MagnetRings (update(dt, balls, player), render(alpha) through CachedGraphics; skips the clear() when no ball is near)` · _verified_
  Fixes the per-frame Graphics.clear (audit 246-263). The literal iso 16/8 becomes HALF_W/HALF_H from core/math/projection.

#### `src/entities/effects/exitMarker.ts`

Exit ring, flag offset and bobbing label.

Plan: gameScene 77-84, 234-236.

Entries (2):

- `GameScene.constructor (exit visuals)+render (exit)` (method) from `src/scenes/gameScene.ts:59, 61, 76-84, 234-236`: **split** as `class ExitMarker (ring Sprite in decalLayer, flag PropEntity via factory, label PixelText in fxLayer; update(dt) advances the clock, render(alpha) sets pulse and bob)` · _verified_
  A composite effect that mounts into three world layers. The flag must stay a depth-sorted PropEntity in objectLayer. The label text comes from core/render/text/pixelText (entities may not import ui).
  Verifier: Also see missed: the 'exitRing_0' texture name at line 78 is built by hand.
- `inline: exit ring texture name` (inline) from `src/scenes/gameScene.ts:78`: **move** as `textures.get(tileName('exitRing', 0))` · _added by verifier_
  The hand-built name 'exitRing_0' matches the one built at assets/build.ts:182 (`tile('exitRing_0', ...)`). The target replaces the hand-built names at build 175-182 with manifest/names tileName(). The consumer must switch in the same commit, or the two drift apart.

#### `src/entities/markers/sightCone.ts`

An actor's sight cone, redrawn on change.

Plan: drawCone and cones.clear (walk 343-378).

Entries (1):

- `WalkStep.cones+drawCone` (method-group) from `src/story/walk.ts:178, 343, 351, 364-378`: **split** as `class SightCone extends Container (one per sighted actor; redrawn when facing, position or alert changes)` · _not verified_
  Used only in ch3.ts:197 today; the audit (walk.ts:343-377) flags clear() every step in every walk.

#### `src/entities/markers/goalMarkers.ts`

Goal ring, spot rings and mirage.

Plan: drawGoal world parts (walk 516-552).

Entries (1):

- `WalkStep.ring+drawGoal (world parts)` (method-group) from `src/story/walk.ts:179, 224-225, 516-548`: **split** as `class GoalMarkers extends Container { render(alpha, {goal, hidden, mirage, spots, time}) }` · _not verified_
  The pulses follow ctx.time, which advances in the fixed step, so screenshots stay deterministic.

#### `src/entities/markers/flames.ts`

Pooled, culled flame sprites over a Set of burning tiles.

Plan: The flame sprites and their animation (walk 492, 503-514).

Entries (1):

- `WalkStep fire sprites (deco, flame frames, ignite sprite)` (method-group) from `src/story/walk.ts:177, 492, 509-512`: **split** as `class Flames extends Container { sync(tiles); render(alpha, time) } (pooled, culled)` · _not verified_
  Keep the frame phase from the tile's screen x (gridToScreen(i + 0.5, j + 0.5).x, the `s.x` at 492), so the frames stay identical. The texture name comes from the manifest/names tables, with no per-step string. Frame count 3 = SPRITES.flame frames.

#### `src/entities/markers/combatMarkers.ts`

Fight markers (swing arc, bark ring, shield kite, windup and stun rings, HP pips) with their visual timers, drawn only while a fight or an effect is live.

Plan: Combat.draw (combat 331-395) and the swing and barkRing timers.

Entries (1):

- `Combat.draw+fx+rings+swing+swingAngle+barkRing+start(mount)+stop(destroy)` (method-group) from `src/story/combat.ts:58-59, 65-67, 87-89, 171, 195-197, 331-395, 406-407`: **split** as `class CombatMarkers { swing(facing); bark(); update(dt); render(alpha, snap: {player, facing, guarding, foes}); mount(world); destroy() }` · _not verified_
  One Container cannot sit in two layers. Use two child Graphics: the foe rings go in world.decalLayer, and the arc, bark ring, shield kite and HP pips go in world.fxLayer. The swing and barkRing decay (339, 360) moves to update(dt) with the same formulas, so stepped screenshots stay deterministic. The swing angle (gridToScreen of the facing) is computed in the marker. The arc and the shield also show in fightless walks: swing is set before the `if (!this.def)` check at 198. Redraw through core/render/redraw only while swing > 0, barkRing > 0, guarding, or a foe is live; this fixes the audit's per-step clears in 54 of 58 walks. destroy goes through destroyTree, and the walk's stop must also run when the scene exits during an interrupt (audit walk.ts:652-662).

### UI (requested): 58 files, 127 entries

#### `src/ui/widgets/retroBox.ts`

Retro box drawing.

Plan: frameRect, retroBox, hungerColor with precomputed stops (ui/retro 24-69). ui/retro.ts stays as a shim re-exporting C and hex until its 31 importers move.

Entries (3):

- `frameRect` (function) from `src/ui/retro.ts:24-29`: **move** · _verified_
- `retroBox` (function) from `src/ui/retro.ts:35-48`: **move** · _verified_
- `hungerColor` (function) from `src/ui/retro.ts:51-69`: **move** · _verified_
  Reads precomputed stops from config HUNGER_STOPS instead of allocating them on every call (audit retro, low). Its only consumer is ui/hud/hungerBar.

#### `src/ui/widgets/listNav.ts`

Pure keyboard and tap list selection, shared by Menu, the dialogue choices and ButtonPicker.

Plan: KeyCursor, MOVES (words 24-68); Menu's selection, keyboard flag and hit test (menu 49-101); the selection logic of DialogueBox.updateChoices (story/ui 222-239), which now returns an intent.

Entries (4):

- `KeyCursor` (class) from `src/story/minigames/words.ts:24-61`: **move** · _not verified_
  tests/wordGames.test.ts:4 imports it from story/minigames/words. words/index.ts (from `git mv words.ts words/index.ts`) re-exports it from ui/widgets/listNav, a legal story -> ui edge. Menu and the dialogue choices reuse it.
- `MOVES` (const) from `src/story/minigames/words.ts:63-68`: **move** · _not verified_
- `DialogueBox.updateChoices` (method) from `src/story/ui.ts:222-239`: **split** as `ListNav.step({ up, down, confirm, taps }) -> pick index | -1, hitTest(rows, tap, slop)` · _not verified_
  DialogueBox.updateChoices(intent) becomes Input-free (audit cat 4, ui.ts:222-239). AskStep reads Input and builds the intent. Keyboard and tap outcomes are unchanged: up/down wrap, confirm picks the selection, and a tap inside a row (±2 px) picks it.
- `Menu.update (selection, keys, tap hit test)` (method) from `src/ui/menu.ts:79-99`: **split** as `class ListNav { selected; keyboard; step(input, count, hitAt: (tap) => number): number | null }` · _corrected by verifier_
  Pure navigation shared with the dialogue choices and ButtonPicker. It returns the row to activate, and Menu.update calls item.action() (audit menu:77-101, cat. 4). The hit slop is a parameter (MENU.SLOP).
  Verifier: Shared state is not noted. Menu.selected is written from outside (overlays.ts:152 `this.menu.selected = 1`, overlays.ts:905), and redraw() reads selected and keyboard (106). Menu must keep a public `selected` accessor (get and set) that delegates to its ListNav, and redraw reads nav.keyboard. The tap branch calls redraw() before the action (95), which the Menu wrapper must keep. hitAt needs Menu's row rects, so Menu passes a closure over rows.

#### `src/ui/widgets/menu.ts`

Vertical button menu, redrawn only when the selection, keyboard flag or blink phase changes.

Plan: MenuItem, Row, Menu, label (ui/menu). The `rows` field is kept (scripts read menu.rows).

Entries (4):

- `MenuItem` (interface) from `src/ui/menu.ts:6-10`: **move** · _verified_
  Leave a temporary `export *` shim at src/ui/menu.ts for overlays and story/screens until they move.
- `Row` (interface) from `src/ui/menu.ts:12-20`: **move** · _verified_
  The names Row.item and Row.text are kept: story-smoke reads menu.rows[i].text.content and screenshot.mjs:448 reads .item.action and .item.label.
- `Menu` (class) from `src/ui/menu.ts:26-114`: **move** · _verified_
  The `rows` field is kept (scripts read it). Menu keeps composition (`readonly root`) rather than extending Container: its `get height()` is read before layout at overlays 198/211/516/624/766/864 and screens 258, and would collide with Container's height accessor. redraw() runs only when (selected, keyboard, blink phase) changes, through core/render/redraw (audit menu:100-113, medium). tests/input.test.ts imports '../src/ui/menu' (change to '../src/ui/widgets/menu') and mocks '../src/ui/pixelText' (change to core/render/text/pixelText). CLAUDE.md:176 says 'menus use ui/menu.ts'.
  Verifier: Height reads verified at overlays 198, 211, 516, 624, 766 and 864 and screens 258. Container's own height accessor (get and set) would collide, so composition is correct.
- `label` (function) from `src/ui/menu.ts:116-118`: **move** · _verified_

#### `src/ui/widgets/buttonPicker.ts`

Picks a button by tap or by arrows and confirm.

Plan: Button, ButtonPicker.pick (words 10-17, 76-100), built on listNav. The field name picker.cursor is kept.

Entries (2):

- `Button` (interface) from `src/story/minigames/words.ts:10-17`: **move** as `ButtonHit {x, y, w, h, id} (picker) + Button = ButtonHit & {t: PixelText} (re-exported for buttonList)` · _not verified_
  The picker needs only the hit rect and the id. The PixelText belongs to ButtonList. The test's Peek type (wordGames.test.ts:80) reads id, x, y, w and h.
- `ButtonPicker` (class) from `src/story/minigames/words.ts:76-101, 112`: **move** · _not verified_
  pick(input, buttons, unlit) keeps the same consume order: taps, then the arrows, then consumeContinue. It keeps the field name `cursor`, because story-smoke.mjs:669 reads g.picker.cursor.current() and the test reads picker.cursor. ui may import core/input.

#### `src/ui/widgets/buttonList.ts`

Owns the button PixelTexts, hit rects and highlight; redraws only on change.

Plan: ButtonPicker.draw (words 103-111), WordGame.clearButtons/button/drawButtons (128-148), and LetterGame.rebuild's copy of them (195-218).

Entries (3):

- `ButtonPicker.draw` (method) from `src/story/minigames/words.ts:102-111`: **split** as `ButtonList.render(cursor, time): highlight redrawn only when the lit index, the shown flag or the blink phase changes` · _not verified_
- `WordGame.clearButtons+button+drawButtons (+ g, buttons)` (method-group) from `src/story/minigames/words.ts:116-117, 128-148`: **split** as `class ButtonList extends Container { clear(); add(id, label, x, y, w, opts); readonly buttons: Button[]; render(cursor, time) }` · _not verified_
  clear() destroys the label PixelTexts, as today (129). The button boxes are redrawn only when the list changes (audit cat 3 at 243-250 and 357-364). It must run under the tests' pixi mock: Graphics has clear/rect/fill only, and Container has addChild/destroy only. The vi.mock target moves to core/render/text/pixelText in the same commit.
- `LetterGame.rebuild (button creation)` (method) from `src/story/minigames/words.ts:180-181, 195-206`: **merge** · _not verified_
  Merged into ButtonList.add, with options that keep today's differences from WordGame.button: label maxWidth w - 40 (not button width - 8), no 16 px minimum height, centred on screen x, x 16, width w - 32, fill alpha 0.65 and no yellow inner frame. Without them the screenshots would change. The list of ids and labels per phase (207-217) stays in letterGame.

#### `src/ui/widgets/paperCard.ts`

Paper-card drawing and hit helpers.

Plan: textW, textH, bold, drawPaperCard, drawCardButton (ui/card); new cardHit(tap, cardRect, closeRect, slop). INK, FADED and PAPER go to config/colors.

Entries (6):

- `CouchScene.update (hit test)` (method) from `src/scenes/couchScene.ts:213-219`: **split** as `function cardHit(tap, cardRect, closeRect, slop): boolean` · _verified_
  Pure. Merges the identical test at glossaryScene 155-161. Returns true for a tap outside the card or on CLOSE (with slop).
- `textW` (function) from `src/ui/card.ts:14-18`: **move** · _verified_
- `textH` (function) from `src/ui/card.ts:21-25`: **move** · _verified_
- `bold` (function) from `src/ui/card.ts:28-36`: **move** · _verified_
- `drawPaperCard` (function) from `src/ui/card.ts:39-45`: **move** · _verified_
  Imports frameRect from ./retroBox and hex from core/util/color.
- `drawCardButton` (function) from `src/ui/card.ts:48-56`: **move** · _verified_
  Fix the doc comment: it says 'Returns its height' but returns {w, h}. CLAUDE.md:99 names ui/card.ts.

#### `src/ui/widgets/overlay.ts`

Overlay base (extends SceneBase) and heading factory.

Plan: Overlay, big (overlays 21-51).

Entries (2):

- `Overlay` (class) from `src/scenes/overlays.ts:21-48`: **move** as `export abstract class Overlay extends BaseScene (core/scene/sceneBase)` · _verified_
  Not exported today, so it gains an export. Its w and h default to VIEW. The per-subclass dimAlpha comes from config/ui OVERLAY.DIM. Through BaseScene.own(), its filters are destroyed in exit().
- `big` (const) from `src/scenes/overlays.ts:50-51`: **move** as `function big(text, color, scale, extra)` · _verified_
  The outline '#120818' becomes INK.OUTLINE (config/colors) and glowAlpha 0.3 becomes OVERLAY.HEADING_GLOW.

#### `src/ui/widgets/menuRows.ts`

Menu rows shared between screens.

Plan: SoundActions, soundItems (overlays 463-487), BINDING_LABEL (787-795).

Entries (3):

- `SoundActions` (interface) from `src/scenes/overlays.ts:463-470`: **move** as `export interface SoundActions` · _verified_
- `soundItems` (function) from `src/scenes/overlays.ts:473-487`: **move** as `export function soundItems(actions, refresh): MenuItem[]` · _verified_
  levelLabel comes from ui/text/format. Keep exactly three rows in this order: story-smoke.mjs 282 reads OptionsScene menu.rows[7] as the ART row (SOUND, MUSIC, SOUNDS, TEXT, CONTROLS, LEVELS, BOOK, ART, BACK).
  Verifier: Verified: story-smoke 239 and 282 read rows[7]. The OPTIONS rows are SOUND, MUSIC, SOUNDS, TEXT, CONTROLS, LEVELS, BOOK, ART, BACK.
- `BINDING_LABEL` (const) from `src/scenes/overlays.ts:787-795`: **move** as `BINDING_LABEL: Record<GestureBinding, string>` · _verified_
  GestureBinding comes from core/state/settings.

#### `src/ui/text/markup.ts`

Coloured span builders; the word and name lists are passed in.

Plan: isLetter, oldWordRanges (list sorted once, ranges cached per line, audit names 77-86), withOldWords, withNames (story/names 72-121).

Entries (4):

- `isLetter` (const arrow) from `src/story/names.ts:72`: **move** · _not verified_
  It stays module-private.
- `oldWordRanges` (function) from `src/story/names.ts:75-87`: **move** as `oldWordRanges(text, words: SortedWords) + sortWords(list): SortedWords (sort once)` · _not verified_
  This fixes audit names.ts:77-86, where the word list is copied and re-sorted on every call during typewriting. The caller now sorts the list once and DialogueBox caches the ranges per line. The signature gains the word list because ui may not import content. tests/campaign.test.ts:395-407 then passes sortWords(OLD_WORDS).
- `withOldWords` (function) from `src/story/names.ts:93-105`: **move** as `withOldWords(text, shown, color, ranges: Array<[number, number]>, wordColor = OLD_WORD_COLOR)` · _not verified_
  It takes precomputed ranges, so the typewriter step does no sort. The test call at campaign.test.ts:401/405 must be updated.
- `withNames` (function) from `src/story/names.ts:108-121`: **move** as `withNames(text, color, names: ReadonlySet<string>, nameColor = C.yellow)` · _not verified_
  Its only src caller is core/flow/storyFlow (L9), which may import content/campaign/lexicon directly. content/campaign/cards.ts cannot call it, because content may not import ui. The card specs therefore carry a `names: true` flag, and storyFlow converts those lines. tests/summary.test.ts:88-89 changes its import and passes NAMES.

#### `src/ui/text/format.ts`

Text formatters.

Plan: formatTime, formatScore (scoring 43-51); formatPlayTime, MONTHS, formatSavedAt (summary 65-83); levelLabel (settings 23-25); subLevelLabel (screens 162-167).

Entries (7):

- `formatPlayTime` (function) from `src/campaign/summary.ts:65-72`: **move** · _verified_
  It sits next to formatTime and formatScore. The 3600 and 60 are unit conversions, not config. tests/summary.test.ts imports it from '../src/ui/text/format', which needs no pixi mock.
- `MONTHS` (const) from `src/campaign/summary.ts:74`: **move** · _verified_
  UI text, not config.
- `formatSavedAt` (function) from `src/campaign/summary.ts:77-83`: **move** · _verified_
- `levelLabel` (function) from `src/core/settings.ts:23-25`: **move** · _verified_
  The 'OFF' and '%' text is UI copy and stays in the function. Its only src reader is overlays 484-485 (to ui/widgets/menuRows soundItems). Update settings.test's import in the same commit. Do NOT re-export it from a core/settings shim: that would add a core to ui edge, so the one importer is updated directly.
- `StoryChapterScene.constructor` (label fit) from `src/story/screens.ts:162-167`: **split** as `subLevelLabel(id, title, max = STORY_MENU.LABEL_MAX)` · _not verified_
  A pure formatter, matching the target's ui/text/format entry. It becomes testable.
- `formatTime` (function) from `src/systems/scoring.ts:43-47`: **move** · _verified_
  Importers: ui/hud/greenZoneHud, the overlay screens and couchScene. tests/systems.test.ts splits its import between '../src/systems/greenZone/scoring' and '../src/ui/text/format' in the same commit. No shim at systems/scoring, because that would be an upward systems-to-ui edge.
  Verifier: Checked: the importers are ui/hud.ts:5, scenes/overlays.ts:10, scenes/couchScene.ts:10 and tests/systems.test.ts:6, all ui or tests.
- `formatScore` (function) from `src/systems/scoring.ts:49-51`: **move** · _verified_

#### `src/ui/text/logo.ts`

Bitmap logo texture.

Plan: GLYPHS, ROWS, GAP, LogoStyle, logoWidth, cache, logoTexture (ui/logo).

Entries (8):

- `GLYPHS` (const) from `src/ui/logo.ts:8-21`: **move** · _verified_
  Bitmap art data: it stays with the rasterizer, not in config.
- `ROWS` (const) from `src/ui/logo.ts:22`: **move** · _verified_
  A glyph metric tied to GLYPHS.
- `GAP` (const) from `src/ui/logo.ts:23`: **move** · _verified_
- `LogoStyle` (interface) from `src/ui/logo.ts:25-31`: **move** · _corrected by verifier_
  config/colors.ts LOGO_STYLE (from overlays 54) is checked with `satisfies LogoStyle` in TitleScene, since config cannot import the type.
  Verifier: LogoStyle.colors is a mutable tuple `[string, string, string]` (line 27). An `as const` LOGO_STYLE in config gets `readonly ['#f2ffb0', ...]`, which does not satisfy it. Change it to `readonly [string, string, string]` (logoTexture only reads it) so the `satisfies LogoStyle` check in TitleScene compiles.
- `logoWidth` (function) from `src/ui/logo.ts:34-38`: **move** · _verified_
- `inline: logo raster constants` (inline) from `src/ui/logo.ts:36, 47, 49, 69-74`: **move** · _verified_
  Pad 3, glow grow 2 at 0.25, shadow offset and gradient bands are procedural art, kept with the drawer (CONFIG PLAN).
- `cache` (const) from `src/ui/logo.ts:40`: **move** · _verified_
  Gains evict/dispose (called when the title exits). The canvas texture is built with new Texture({ source: new CanvasSource(...) }) instead of Texture.from, so Pixi's global Cache does not keep it (audit cat. 1/2 logo.ts:77).
- `logoTexture` (function) from `src/ui/logo.ts:43-80`: **move** · _verified_

#### `src/ui/hud/greenZoneHud.ts`

Green Zone HUD (class Hud): static boxes drawn in layout, texts set only on change.

Plan: RadarDot, HudState, Hud (ui/hud 9-191), minus the radar, the hunger bar and the menu hit registration (which moves to core/input/touchLayout).

Entries (4):

- `GameScene.render (HUD and controls clocks)` (method) from `src/scenes/gameScene.ts:238-242`: **split** · _added by verifier_
  hud.update(state, frameDt) and controls.update(frameDt) advance clocks inside render: Hud.clock and its flash timers (hud.ts 148-153, the radar and stat blinks), and the joystick redraw. The entity and screen model says render never integrates time. Split it: Hud.tick(dt) is called from GameScene.update, and render only draws (change-only for the radar and joystick). Caveat: \_\_sv.step(n) (loop.stepNow) renders only once after n updates, so the blink phases in stepped screenshots would change. Diff against the baseline before accepting, or defer to a later step.
- `RadarDot` (interface) from `src/ui/hud.ts:9-16`: **move** · _verified_
  ui/hud/radar.ts and ui/hud/walkHudModel.ts import it type-only, so the model's test needs no pixi mock.
  Verifier: Cleaner option: declare RadarDot and HudState in the pure walkHudModel.ts and have the view type-import them. The model then owns its own types. The entry's version also works, since type imports are erased.
- `HudState` (interface) from `src/ui/hud.ts:18-33`: **move** · _verified_
  Gains menuPressed: boolean, so the view stops reading Input (lines 189-190). walkHudModel builds it and reuses its radar array.
- `Hud` (class) from `src/ui/hud.ts:45-249`: **move** · _verified_
  Class name Hud is kept. Keep the `root` field: flow.ts:69 and 197 write scene.hud.root.visible. Static boxes are drawn in layout only, and texts are set only when a value changes (audit hud:148-186). formatScore and formatTime come from ui/text/format. The constructor still needs the boot atlas. Behaviour-adjacent: clock and flash timers move to update(dt) in the fixed step (today driven by frameDt from GameScene.render:242), and render() draws. That shifts the radar sweep phase, so diff the baseline screenshots.
  Verifier: Verified: gameScene.ts:242 calls hud.update(hudState(), frameDt) from render, and flow.ts:69 and 197 write hud.root.visible.

#### `src/ui/hud/radar.ts`

Radar: static disk and rings plus a dynamic dots layer.

Plan: drawRadar (hud 213-248).

Entries (1):

- `Hud.drawRadar` (method) from `src/ui/hud.ts:213-248`: **split** as `class Radar extends Container { layout(cx, cy); render(state, clock) }` · _verified_
  The disk and both rings go into a static Graphics drawn in layout(); the sweep, dots and exit go into a dynamic Graphics (audit hud:213-248, medium).

#### `src/ui/hud/hungerBar.ts`

Hunger bar.

Plan: drawHunger (hud 193-211).

Entries (1):

- `Hud.drawHunger` (method) from `src/ui/hud.ts:193-211`: **split** as `class HungerBar extends Container { layout(width); render(fraction, clock) }` · _verified_
  Keeps the px/blink change guard. hungerColor reads precomputed stops (audit hud:193-211, low).

#### `src/ui/hud/walkHudModel.ts`

Pure HUD view model that reuses its radar array.

Plan: hudState (gameScene 265-312).

Entries (1):

- `GameScene.hudState` (method) from `src/scenes/gameScene.ts:265-312`: **split** as `function walkHudModel(src, out: HudState): HudState (reuses out.radar)` · _verified_
  Stops allocating the radar array every frame (audit 265-312). src = { stats, rules, threats, ambush, map, player, levelDef }. It must stay pure: no pixi.

#### `src/ui/hud/attackBanner.ts`

UNDER ATTACK banner (blinks use alpha).

Plan: AttackBanner (ui/attackBanner).

Entries (2):

- `GameScene.updateAttackFx (banner hint)` (method) from `src/scenes/gameScene.ts:219-229`: **split** as `function attackHint(pugActive, usingTouch, health, threshold): string | null` · _verified_
  The hint copy ('BARK AT BAGNASKIZ!', 'BARK (J) AT BAGNASKIZ!', 'PEE TO HEAL THE ZONE!') moves with the banner. The banner.update(dt, hint) and shout.update(dt) calls stay in GameScene.update, still only when active.
- `AttackBanner` (class) from `src/ui/attackBanner.ts:10-65`: **move** · _verified_
  The blinks (52, 55, 56, 61) use alpha instead of `visible` (audit cat. 3). update(dt, hint) advances t/savedT and rolls the jitter, keeping the same Math.random draws in the fixed step; render() applies alpha and x. `root` is kept, since GameScene adds banner.root.
  Verifier: Verified: updated from GameScene.updateAttackFx in the fixed step, and gameScene:108 adds banner.root.

#### `src/ui/hud/storyHud.ts`

Story HUD; meters and mode bar redrawn only on change.

Plan: StoryHud (story/ui 311-410), minus the MENU input registration.

Entries (1):

- `StoryHud` (class) from `src/story/ui.ts:311-410`: **move** as `class StoryHud (constructor without Input)` · _not verified_
  Meters and the mode bar are redrawn only when values, the blink phase or the layout change (audit cat 3, ui.ts:381-409). The meter icon keys 'tear', 'mask' and 'halo' stay inline as SpriteKeys, which is art data. Keep setTitle, setObjective, setMode, bottom and setMenuEnabled (ctx.hud.setMode 8 uses, setObjective 5).

#### `src/ui/hud/noticeStack.ts`

Stacked change notices.

Plan: StoryScene.notice (345-351) and the stack layout (428-443).

Entries (1):

- `StoryScene.notice+update` (notice stack) from `src/story/storyScene.ts:60, 345-351, 428-443`: **split** as `class NoticeStack { push(text, color, delay), update(dt, top), destroy() }` · _not verified_
  StoryScene.notice stays as a delegate (37 uses). The layout top is max(NOTICES.TOP, hud.bottom + NOTICES.BELOW_HUD).

#### `src/ui/hud/offscreenArrow.ts`

Screen-edge arrow to an off-screen goal.

Plan: walk drawGoal 553-562.

Entries (1):

- `WalkStep.arrow+drawGoal (off-screen arrow)` (method-group) from `src/story/walk.ts:180, 226, 519, 549-563`: **split** as `class OffscreenArrow extends Graphics { render(targetScreen, camera, w, h, time) }` · _not verified_
  Lives in ctx.uiLayer; story may import ui.

#### `src/ui/story/dialogueBox.ts`

Dialogue box with portrait, typewriter and choices (through listNav). Speaker info and the old-word list come in as arguments.

Plan: ChoiceView, DialogueBox (story/ui 59-250); the `measure` text is now destroyed (audit ui.ts:76).

Entries (2):

- `ChoiceView` (interface) from `src/story/ui.ts:59-62`: **move** · _not verified_
  optionView (systems) returns the same shape structurally, with no import.
- `DialogueBox` (class) from `src/story/ui.ts:68-250`: **move** · _not verified_
  The constructor takes the injected speakerOf and the sorted old-word list. Keep show(speakerKey, line) and the field names `full`, `root`, `typing`, `cps`, `selected` (screenshot.mjs:319 reads `full`). The off-tree `measure` PixelText is destroyed in a new destroy() (audit cat 2, ui.ts:76). Old-word ranges are cached per line instead of recomputed each step (audit 241-246, names 77-86). drawChoices runs only on a selection, keyboard or blink change, through CachedGraphics (audit 207-248). The portrait's async ensureCharacters stays, from core/assets/characterTextures (ui may import L4).

#### `src/ui/story/cardLayer.ts`

Big centred card.

Plan: CardLayer (story/ui 253-305).

Entries (1):

- `CardLayer` (class) from `src/story/ui.ts:253-305`: **move** · _not verified_
  Keep `root`, `showTap`, show and hide (capture_environment_screens.mjs:99 reads cards.root). The TAP blink is applied as alpha in render.

#### `src/ui/touch/touchControls.ts`

Touch control view only: draws from a TouchLayout plus an input snapshot.

Plan: TouchControls (touchControls 65-351), minus the Input writes (now in core/input/touchLayout). The joystick is redrawn only when it moves, and the pressed-key string is gone.

Entries (1):

- `TouchControls` (class) from `src/ui/touchControls.ts:65-430`: **move** · _verified_
  View only; it no longer writes Input. Keep `root`: flow.ts:72 and 199 write scene.controls.root.visible. Keep update(dt = 1/60): the test calls update() with no argument. setPeeCharges, setEnergy, setBarkReady, setActionMode and the view half of configure stay. The joystick is redrawn only when it moves (audit 330-343), the per-frame pressed-key string (344) is replaced by a CachedGraphics key, and buttons redraw only on a key change (audit 264-322). tests/touchControls.test.ts: change the import path; change vi.mock '../src/ui/pixelText' and '../src/assets/build' to core/render/text/pixelText and core/assets/spriteTextures; it reads the private `streakText` (keep a forwarding accessor or update the test); it calls Input.fireGesture, so keep that method on Input when it moves to core/input/pointer.ts. CLAUDE.md:92 names the path.
  Verifier: Verified: flow.ts:72 and 199 write controls.root.visible; the test calls update() with no argument (97-116), reads private streakText (90) and calls Input.fireGesture (85). Behaviour note: TouchControls.update runs from render with frameDt (gameScene:237, storyScene:449). Moving the streak timer to the fixed step changes its timing slightly.

#### `src/ui/touch/touchIcons.ts`

Stateless pixel icons.

Plan: drawChevrons, drawSwap, drawSword, drawShield, drawArrow, drawButton (touchControls 433-479).

Entries (7):

- `drawChevrons` (function) from `src/ui/touchControls.ts:433-437`: **move** · _verified_
- `inline: pixel icon geometry and colours` (inline) from `src/ui/touchControls.ts:433-479`: **move** · _verified_
  Procedural pixel icons: their geometry and colours (0xe8f0ff, 0xffc23a, 0x8a5a2a, 0x3050c0) and drawButton's fill alphas 0.45/0.28 stay with the drawers (CONFIG PLAN).
- `drawSwap` (function) from `src/ui/touchControls.ts:440-452`: **move** · _verified_
- `drawSword` (function) from `src/ui/touchControls.ts:455-459`: **move** · _verified_
- `drawShield` (function) from `src/ui/touchControls.ts:462-466`: **move** · _verified_
- `drawArrow` (function) from `src/ui/touchControls.ts:469-472`: **move** · _verified_
- `drawButton` (function) from `src/ui/touchControls.ts:474-479`: **move** · _verified_

#### `src/ui/touch/gestureHints.ts`

Gesture hints and streak.

Plan: GESTURE_WORD, updateHints, updateStreak (touchControls 41-57, 354-429).

Entries (2):

- `GESTURE_WORD` (const) from `src/ui/touchControls.ts:41-57`: **move** · _verified_
  UI copy stays with its view. Keyed by GestureAction from core/input/gestures.
- `TouchControls.updateHints+updateStreak` (method) from `src/ui/touchControls.ts:82-86, 107-112, 354-429`: **split** as `class GestureHints { render(snapshot) }; class GestureStreak { update(dt, lastGesture, gestureActions); render() }` · _corrected by verifier_
  The hint key string (359) is replaced by a compare of the three actions plus mirrored (audit cat. 3 touchControls:359). streak.clear() runs only while a streak fades (audit 404-424). The constructor's streakSeq seed (116) moves with it: only gestures made after these controls are drawn (tested).
  Verifier: Test impact not noted. tests/touchControls.test.ts asserts streakText.visible right after controls.update() (97-117). If GestureStreak sets visibility in render(), the test must also call render() (or TouchControls.render). Otherwise keep the visible flag in update. Z-order: hints sit below the buttons and the streak above them (root order at line 157), so the two new containers must be inserted at those positions.

#### `src/ui/effects/shout.ts`

Comic NOW! burst, rebuilt only on its 0.05 s jitter tick.

Plan: SPIKES, Shout (ui/shout).

Entries (1):

- `Shout` (class) from `src/ui/shout.ts:15-120`: **move** · _verified_
  Keep composition (`readonly root`); do not extend Container. Its private `scale: number` (story-smoke 548 reads s.shout.scale >= 4) would collide with Container's `scale` ObservablePoint accessor. The `active` getter is kept (story-smoke 547). The burst is rebuilt only when the 0.05 s jitter tick k changes, with star() writing into reused arrays; the flash is redrawn only while f > 0 (audit shout:84-119). CLAUDE.md:88 names ui/shout.ts.
  Verifier: Verified: story-smoke.mjs:547-548 reads shout.active and shout.scale. The private `scale` would collide with Container.scale.

#### `src/ui/effects/discoLights.ts`

Disco light layers (the veil stays static once faded in).

Plan: D, Speck, DiscoLights (discoLights 60-155).

Entries (2):

- `Speck` (interface) from `src/ui/discoLights.ts:60-65`: **move** · _verified_
- `DiscoLights` (class) from `src/ui/discoLights.ts:72-155`: **move** · _verified_
  update(dt, musicSeconds) advances only time and beatPos. drawBeams, drawSpecks and drawFlash run in render(). The veil is drawn once per size and only its alpha changes during the fade-in, instead of four clears every step (audit discoLights:101-154, medium; it runs up to 6 steps a frame). `root` is kept for TitleScene (overlays:79, 174, 250). Rng comes from core/util/rng.

#### `src/ui/effects/discoBeat.ts`

Pure beat maths (its test then needs no pixi.js mock).

Plan: followBeat, beatAt, LightLevels, lightLevels (discoLights 15-58).

Entries (5):

- `D` (const) from `src/ui/discoLights.ts:6`: **move** · _verified_
  A local alias of TITLE.DISCO, also declared locally in ui/effects/discoLights.ts (not exported).
- `followBeat` (function) from `src/ui/discoLights.ts:15-20`: **move** · _verified_
  Pure. tests/discoLights.test.ts dynamic-imports from '../src/ui/discoLights': change it to '../src/ui/effects/discoBeat' and drop its vi.mock('pixi.js'), since discoBeat imports only config.
  Verifier: tests/discoLights.test.ts:3 mocks pixi.js and :5 dynamic-imports. It reads TITLE.DISCO but not COLORS, so moving COLORS does not touch the test.
- `beatAt` (function) from `src/ui/discoLights.ts:23-25`: **move** · _verified_
- `LightLevels` (interface) from `src/ui/discoLights.ts:27-37`: **move** · _verified_
- `lightLevels` (function) from `src/ui/discoLights.ts:44-58`: **move** · _verified_
  If TITLE.DISCO.COLORS moves to colors.ts DISCO.COLORS, discoBeat reads its length from there (still config only).

#### `src/ui/effects/screenOverlay.ts`

Flash, visor, fog and bleach, redrawn on change. Owns one bleach filter on a grouped layer and destroys it.

Plan: StoryScene's flash/visor/fog/bleach/shake state (359-388) and overlay drawing (452-467).

Entries (1):

- `StoryScene.flash+visor+fog+bleach+render` (screen-effect state and drawing) from `src/story/storyScene.ts:55, 359-384, 444, 452-467`: **split** as `class ScreenOverlay { flash/visor/fog/bleach state, update(dt) (flash fade), render(playerScreenPos) through CachedGraphics, destroy() }` · _not verified_
  overlayG becomes its owned Graphics, redrawn only when a value changes (audit cat 3, storyScene.ts:452-467). It owns one ColorMatrixFilter applied to one grouped container (World must expose a scenery group holding mapRenderer.root, decalLayer and objectLayer, without fxLayer) and destroys it (audit 374-384). The fog centre is passed in as a screen position computed without getGlobalPosition/toLocal allocations (audit 455).

#### `src/ui/effects/attackFx.ts`

Attack glitch controller; owns and destroys its GlitchFilter.

Plan: attackFilter (gameScene 50-53), updateAttackFx (200-230).

Entries (1):

- `GameScene.updateAttackFx (filter part)` (method) from `src/scenes/gameScene.ts:50-53, 200-218`: **split** as `class AttackFx { kick(seconds), update(dt, target, time), apply(worldRoot, active), destroy() }` · _verified_
  Owns and destroys the GlitchFilter (audit: never destroyed, 50/314). Keep the Math.random at 206 in update, at the same point of the step. Keep the `if (!active) return` guard before the worldRoot.filters swap: Flow writes [blur, glitch] there for the title backdrop and clears it in startPlaying.

#### `src/ui/minigames/laddersView.ts`

Cached wall and ladders, falling sprites, hero; reads the sim in render.

Plan: LaddersGame view code (action 55-87, 162-221; audit high 164-221).

Entries (1):

- `LaddersGame view (g/hero/info/axemen, sprite build, laneX, rungY, draw)` (method-group) from `src/story/minigames/action.ts:41-44, 63-87, 152, 162-221`: **split** as `class LaddersView extends Container { layout(w,h); render(sim, wallPalette, skin) }` · _not verified_
  Cache the brick wall in a Graphics or RenderTexture, rebuilt only when the scroll row (floor(scroll/10)), the size or the palette changes; this fixes audit high 164-221. Rebuild the ladders when `top` changes. info.setStyle moves to layout. ensureCharacters (fire-and-forget, 63) moves to the view constructor (core/assets/characterTextures). The 0.5/0.9 anchors stay inline (art) or come from CharacterDef. The glue passes the wall palette (166) from ctx.world.palette. laneX and rungY become the view's px mapping.

#### `src/ui/minigames/tugView.ts`

Tug board.

Plan: TugGame view (action 269-279, 295-311).

Entries (1):

- `TugGame view` (method-group) from `src/story/minigames/action.ts:263-266, 272-278, 295-311`: **split** as `class TugView extends Container { render(pos, time) }` · _not verified_
  The band and the hole are static and drawn in layout. The rope and bar are redrawn only when pos changes (audit low 296-307). The run frames use manifest animationFrame. ensureCharacters moves to the view constructor.

#### `src/ui/minigames/boatView.ts`

Boat bars.

Plan: BoatGame view (action 373-385).

Entries (1):

- `BoatGame view` (method-group) from `src/story/minigames/action.ts:329-330, 343, 373-385`: **split** as `class BoatView extends Container { render(progress, water, swamped) }` · _not verified_
  The bars are redrawn and the label set only when their values change (audit low 375-383).

#### `src/ui/minigames/rhythmView.ts`

Beat lane, cues, tears and banners.

Plan: RhythmGame view (rhythm 53-85, 165-192).

Entries (1):

- `RhythmGame view (texts, lane, cues, tears, layout)` (method-group) from `src/story/minigames/rhythm.ts:35-43, 56, 64-72, 75-85, 120-122, 165-192`: **split** as `class RhythmView extends Container { layout(w,h); showTear(n); update(dt); render(sim, time) }` · _not verified_
  The tears' fall offset (192) is a visual clock advanced in update(dt) and applied in render; the sprite is no longer the state. Choice-mode setText (175) runs only when a cue's text changes, and status setStyle (191) moves to layout (audit medium 190-191). The lane is redrawn only while the pulse changes (audit low 167-170).

#### `src/ui/minigames/wordsView.ts`

Paper backdrop and texts for the letter and rumour games, built on ButtonList.

Plan: LetterGame and RumourGame drawing (words 242-260, 330-333, 356-365).

Entries (3):

- `WordGame head/body texts` (field) from `src/story/minigames/words.ts:119-120, 125`: **split** · _not verified_
- `LetterGame view (g, text, answer, draw)` (method-group) from `src/story/minigames/words.ts:174-176, 242-260`: **split** as `class LetterView extends Container { layout(w,h); render(letterText, answerText|null) }` · _not verified_
  setText runs only when the text changes, and setStyle moves to layout (audit medium 252-259).
- `RumourGame view (onLayout, draw)` (method-group) from `src/story/minigames/words.ts:329-333, 356-365`: **split** as `class RumourView extends Container { layout(w,h); render(header, body) }` · _not verified_
  The head and body setText run only when placed changes (audit low 357-364).

#### `src/ui/screens/title/titleScene.ts`

Title page. Class name and the fields actions, menu, footer and root are kept. It has an exit() that destroys its filters.

Plan: LOGO_TEXT, TitleActions, TitleScene (overlays 53-403), minus the parts below.

Entries (4):

- `LOGO_TEXT` (const) from `src/scenes/overlays.ts:53`: **move** as `LOGO_TEXT` · _verified_
  UI copy stays in its screen, per the target (the inventory tagged it config).
- `TitleActions` (interface) from `src/scenes/overlays.ts:56-70`: **move** as `TitleActions` · _verified_
  The glitch?: TitleGlitchFilter type comes from core/render/filters/titleGlitchFilter (L4, legal for ui). Keep the member names: scripts call actions.couch/glossary/options/newGame.
- `TitleScene` (class) from `src/scenes/overlays.ts:77-403`: **move** as `class TitleScene extends Overlay (with a new exit() that destroys titleGlitch and the footer BlurFilter)` · _corrected by verifier_
  Keep the class name and the fields actions, menu, footer and root (scripts: \_\_sv.top().actions.\*, root.visible). It keeps the logo, edition, INSERT BRAIN, LIFE FOR SPEED, footer and footerGlow, disco lights, animateTitleGlitch and animateGlitch, the publisher tap test (280-291), back(), and menu.update in update. The 0.25-0.6 s reveal and the input guard read config/ui TITLE_LAYOUT. Audit: neither TextGlitchFilter (114) nor the footer BlurFilter (156) is ever destroyed. The footer glow is re-blurred every frame although its text is static: bake it once with cacheAsTexture (optional, visually identical). livesIcon calls textures.get at field init, so the registry must be ready at construction (it is today).
  Verifier: Everything holds except the optional footer bake: footer, actions, menu and root are read by screenshot.mjs:469 and story-smoke 190/264/391, and the TextGlitchFilter (114) and BlurFilter (156) are never destroyed. The bake claim is 'cacheAsTexture is visually identical', but footerGlow's alpha animates every frame (277) over a blurred texture. Caching changes where alpha is applied relative to the blur, and v8's handling of the cached container's own filters is not guaranteed to match. Call it 'expected to be near identical, accept only after a screenshot diff', not identical.
- `TitleScene.update (visual writes)` (method) from `src/scenes/overlays.ts:257-277`: **split** as `TitleScene.render(alpha)` · _verified_
  The clocks, the jitter value (Math.random at 265) and the glitch and shine timers stay in update. Only the writes to visible, x and alpha move to render, so stepped screenshots stay deterministic. The blinks can use blinkAlpha from core/render/redraw.
  Verifier: Keep update's own gating on clocks. Input already uses time > 0.6 (280); see entry 79 for the shine.

#### `src/ui/screens/title/titlePortrait.ts`

Animated portrait; releases the frames of widths it no longer shows.

Plan: TitlePlayer (titleAnim 70-96), layoutDog (overlays 224-240).

Entries (2):

- `TitleScene.layoutDog` (method) from `src/scenes/overlays.ts:80-88, 223-240, 251-256`: **split** as `class TitlePortrait { sprite; layout(width): number; update(dt): boolean (first frame arrived -> relayout); render() }` · _verified_
  Takes the dog, frames, player, animWidth and dogSized fields. It must release the frames of widths it no longer shows, through animatedImage's evict (audit high, 228-229: about 110 textures leak). TitlePlayer comes from ui/titleAnim (also in titlePortrait.ts).
- `TitlePlayer` (class) from `src/ui/titleAnim.ts:70-96`: **move** · _verified_
  A pure frame player. tests/titleAnim.test.ts dynamic-imports '../src/ui/titleAnim': change to '../src/ui/screens/title/titlePortrait'. Keep the test's WebP vi.mock: titlePortrait (layoutDog) value-imports animatedImage, and the mock path is relative to the test, so it does not change.
  Verifier: The test's vi.mock path ('../assets/starting-page-images/app/Zampano-Samemala-4.webp?url') resolves from tests/ to repo-root assets, so it is unchanged. TitlePlayer uses only the Texture type.

#### `src/ui/screens/title/livesCounter.ts`

Lives counter widget (changes go through settingsActions).

Plan: showLives, layoutLives and the hit rect (overlays 313-332).

Entries (1):

- `TitleScene.showLives+layoutLives` (method) from `src/scenes/overlays.ts:98-102, 292-298, 312-332`: **split** as `class LivesCounter { set(lives); layout(cx, y, rowH, label: PixelText); hit(taps): boolean; setVisible(on) }` · _verified_
  clampLives comes from systems/greenZone/lives. The LEFT/RIGHT keys (299-300) stay in TitleScene.update, which then calls changeLives.
  Verifier: layoutLives (318-332) also positions the INSERT BRAIN text (this.best, 324) and reads its textWidth, so LivesCounter.layout must take that PixelText, as the entry's `label` parameter does.

#### `src/ui/screens/title/menuShine.ts`

Menu shine sweep.

Plan: animateShine, lastShine (overlays 335-369).

Entries (1):

- `TitleScene.animateShine` (method) from `src/scenes/overlays.ts:103-108, 334-369`: **split** as `class MenuShine { update(dt, menu) (clock and Math.random pick), render() through CachedGraphics; lastShine kept }` · _corrected by verifier_
  Stops clearing the Graphics every step (audit 336). The Math.random calls stay in update, in the same order.
  Verifier: Two ordering issues. 1. animateShine bails out on `!this.menu.root.visible` (337). Today that flag is written earlier in the same update (270). Entry 80 moves the write to render, so MenuShine.update would read last frame's value: the nextShine countdown, and the Math.random pick with it, would start one step later and stepped screenshots would shift. MenuShine.update must test the clock (time > TITLE_LAYOUT.REVEAL.MENU) instead of the display flag. 2. The shineMask Graphics is drawn in update (348). It moves to render together with the streak.

#### `src/ui/screens/briefingScene.ts`

Green Zone briefing (its UI copy stays here).

Plan: BRIEFING, BriefingScene (overlays 405-460). The `prompt` field is kept.

Entries (2):

- `BRIEFING` (const) from `src/scenes/overlays.ts:405-414`: **move** as `BRIEFING` · _verified_
  UI copy stays with its screen (the target overrides the inventory's content tag). Its colours are C tokens.
- `BriefingScene` (class) from `src/scenes/overlays.ts:417-460`: **move** as `class BriefingScene extends Overlay` · _verified_
  Keep the `prompt` field: story-smoke.mjs 358 reads \_\_sv.top().prompt.content. Its blink (455) moves to render with blinkAlpha, which leaves content untouched.
  Verifier: Verified: story-smoke.mjs 358 and 463 read prompt.content, and nothing reads prompt.visible.

#### `src/ui/screens/pauseScene.ts`

Walk pause.

Plan: PauseScene (overlays 490-538).

Entries (1):

- `PauseScene` (class) from `src/scenes/overlays.ts:490-538`: **move** as `class PauseScene extends Overlay` · _verified_
  Keep the class name (constructor.name).

#### `src/ui/screens/levelEndScene.ts`

Level end.

Plan: LevelEndScene (overlays 555-667). The LevelResult type comes from systems/greenZone/scoring.

Entries (1):

- `LevelEndScene` (class) from `src/scenes/overlays.ts:555-667`: **move** as `class LevelEndScene extends Overlay` · _corrected by verifier_
  Keep the class name and the onStar hook. The star count and the onStar sound stay in update; the star texture, scale and visible writes move to render. It takes the level number instead of a LevelDef (only level.number is read). formatScore and formatTime come from ui/text/format.
  Verifier: Update's own logic reads display state: - Line 661 decides 'skip, or run the menu' from `this.menu.root.visible`, which is written in the same update. If that write moves to render, update must test the clock (t > after + LEVEL_END.REVEAL.MENU), or the menu would come live a frame late and the skip logic would change. - The star shrink (655) integrates on sprite scale (`s.scale.x - dt*8`). Keep a per-star scale number in update and apply it in render. The rest is verified: level.number is the only LevelDef field read (577), the onStar hook stays, and screenshot.mjs:605 waits for 'LevelEndScene'.

#### `src/ui/screens/gameOverScene.ts`

Game over.

Plan: GameOverScene (overlays 670-707).

Entries (1):

- `GameOverScene` (class) from `src/scenes/overlays.ts:670-707`: **move** as `class GameOverScene extends Overlay` · _verified_
  The title jitter (Math.random 702) stays in update and is applied in render. LevelStats comes from systems/greenZone/scoring.
  Verifier: If menu.root.visible ever moves to render, line 705 has the same issue as entry 88: gate menu.update on time > 0.8, not on the flag.

#### `src/ui/screens/optionsScene.ts`

OPTIONS.

Plan: OptionsScene (overlays 710-785).

Entries (1):

- `OptionsScene` (class) from `src/scenes/overlays.ts:710-785`: **move** as `class OptionsScene extends Overlay` · _verified_
  Keep the class name and menu.rows. The row order is load-bearing (rows[7] = ART in story-smoke.mjs 282). The actions arrive from titleFlow, with the settingsActions functions bound to game.

#### `src/ui/screens/controlsScene.ts`

CONTROLS; changes go through settingsActions.

Plan: ControlsScene (overlays 802-881).

Entries (1):

- `ControlsScene` (class) from `src/scenes/overlays.ts:802-881`: **move** as `class ControlsScene extends Overlay` · _verified_
  There are two importers: scenes/flow.ts and story/storyFlow.ts:13 (the story pause). Both move to core/flow and must import ui/screens/controlsScene. Until then, keep an `export *` shim at scenes/overlays.ts. screenshot.mjs 448 finds it through the OptionsScene CONTROLS row and checks constructor.name.
  Verifier: Verified importers: scenes/flow.ts:18 and story/storyFlow.ts:13. Scripts check it by name at screenshot.mjs 448-451 and story-smoke.mjs 186.

#### `src/ui/screens/confirmScene.ts`

Yes/no question.

Plan: ConfirmScene (overlays 884-930).

Entries (1):

- `ConfirmScene` (class) from `src/scenes/overlays.ts:884-930`: **move** as `class ConfirmScene extends Overlay` · _verified_
  Keep the class name (constructor.name).

#### `src/ui/screens/goodbyeScene.ts`

Browser QUIT card.

Plan: GoodbyeScene (overlays 933-961).

Entries (1):

- `GoodbyeScene` (class) from `src/scenes/overlays.ts:933-961`: **move** as `class GoodbyeScene extends Overlay` · _verified_

#### `src/ui/screens/paperCardScene.ts`

Shared base for paper cards: dim, card, CLOSE and tap-outside.

Plan: The shared fields, update and close of CouchScene 203-228 and GlossaryScene 143-170.

Entries (4):

- `CouchScene.resize+back+update+close` (method) from `src/scenes/couchScene.ts:33-48, 59-64, 202-228`: **split** as `abstract class PaperCardScene (root, pausesBelow = false, dim, card, body, closeBox, closeText, cardRect, closeRect, time, closed; resize -> dim + abstract layout(); back(); update(); close())` · _verified_
  This is a near copy of GlossaryScene (19-41, 67-72, 142-170). The base takes {fill, ink} (C.orange/ORANGE_INK or C.violet/VIOLET_INK) and onClose. pausesBelow must stay false: TitleScene keeps animating below and ignores input through `scenes.top !== this`.
  Verifier: Verified: couch 33-48/59-64/202-228 and glossary 19-41/67-72/142-170 are near-identical. Shared state to carry into the base: time, closed, cardRect, closeRect, dim alpha (K.DIM / G.DIM), and the {fill, ink} pair. GlossaryScene needs an update hook, because its update redraws the ring before reading input (line 149).
- `CouchScene.layout (CLOSE button and card placement)` (method) from `src/scenes/couchScene.ts:187-199`: **split** as `PaperCardScene.finishCard(contentH)` · _added by verifier_
  These lines repeat glossaryScene 97-109: they centre CLOSE, drawCardButton, compute cardH, cx and cy (min top 4 vs 8), set cardRect, closeRect and body.position, and call drawPaperCard. The base class from entry 7 should own them, taking MIN_TOP per card; otherwise the shared closeRect and cardRect hit areas are still computed in two places.
- `GlossaryScene.resize+back+update+close` (method) from `src/scenes/glossaryScene.ts:19-41, 67-72, 142-170`: **merge** as `PaperCardScene (shared with CouchScene)` · _verified_
  The tap test 155-161 merges into cardHit() in ui/widgets/paperCard.ts.
- `GlossaryScene.layout (CLOSE button and card placement)` (method) from `src/scenes/glossaryScene.ts:97-109`: **merge** as `PaperCardScene.finishCard(contentH)` · _added by verifier_
  The second copy, merged with couch 187-199.

#### `src/ui/screens/couchScene.ts`

COUCH card, given a ProgressSummary and a LevelRecord instead of reading storage.

Plan: CouchScene (couchScene 32-229), minus the loadCampaign and bestFor calls. Its colours go to config/colors.

Entries (1):

- `CouchScene` (class) from `src/scenes/couchScene.ts:32-229`: **move** as `class CouchScene extends PaperCardScene; constructor(game, summary: ProgressSummary, best: LevelRecord | null, onClose)` · _verified_
  Keeps layout() (67-200), the gfx Graphics (39) and the UI copy. formatScore and formatTime come from ui/text/format, formatPlayTime and formatSavedAt from ui/text/format (were campaign/summary), bold/textW/textH/drawPaperCard/drawCardButton from ui/widgets/paperCard, and C from config/colors. Only importer today: scenes/flow.ts. scripts/screenshot.mjs opens it through TitleScene.actions.couch(), not by class name. No test imports it.
  Verifier: Only importer: scenes/flow.ts:29 (verified). scripts/screenshot.mjs:271 opens it through actions.couch(). No test imports it.

#### `src/ui/screens/glossaryScene.ts`

GLOSSARY card; the ring is drawn in render.

Plan: GlossaryScene (glossaryScene 18-171).

Entries (2):

- `GlossaryScene` (class) from `src/scenes/glossaryScene.ts:18-171`: **move** as `class GlossaryScene extends PaperCardScene` · _verified_
  Keep the class name: story-smoke.mjs checks constructor.name === 'GlossaryScene' and opens it through TitleScene.actions.glossary(). The entry text (headword, IPA, noun and verb) stays here as UI copy. The only src importer is scenes/flow.ts (it becomes titleFlow).
- `GlossaryScene.drawRing` (method) from `src/scenes/glossaryScene.ts:126-140, 149`: **split** as `GlossaryScene.render(alpha): CachedGraphics.draw(n, ...)` · _corrected by verifier_
  Moves from update into render, keyed by the number of points reached, so a still frame does no clear() (audit 147-149). The time clock still advances in update.
  Verifier: Keying the cache by n alone is not enough. layout() runs on every resize and rebuilds ringPts (line 116) for the new verb position. Once the ring is fully drawn, n stays at its maximum, so a key of just n would never redraw it after a resize: the ring would be left at the old position. Key it by (n, layout generation), or invalidate the cache in layout().

#### `src/ui/screens/handRing.ts`

Pure hand-drawn ring points.

Plan: Ring geometry (glossaryScene 111-122).

Entries (1):

- `GlossaryScene.layout (ring points)` (method) from `src/scenes/glossaryScene.ts:111-122`: **split** as `function handRingPoints(cx, cy, rx, ry, overshoot, out: Array<[number, number]>): void` · _verified_
  Pure and unit-testable. Keep the arithmetic order so the points are bit-identical.

#### `src/ui/screens/supervillainedScene.ts`

End-of-level snap: sparks through Particles, halo blurred once, its BlurFilter owned and destroyed.

Plan: SupervillainedScene (supervillainedScene 25-150), minus Spark.

Entries (2):

- `SupervillainedScene` (class) from `src/scenes/supervillainedScene.ts:25-150`: **move** as `class SupervillainedScene extends BaseScene` · _corrected by verifier_
  Keep the class name: screenshot.mjs 600 waits for constructor.name === 'SupervillainedScene'. There are two importers, scenes/flow.ts (levelComplete) and story/storyFlow.ts:12 (every story level end). Both become core/flow and must update their imports. ui may import entities/effects/particles (the target allows this exception). loadTitleArt and titleTexture come from core/assets/logoArt. Guard the loadTitleArt().then callback when the scene has already exited. Own the halo BlurFilter (49) and destroy it in exit (audit: never destroyed). Optionally blur the halo once instead of every frame (audit 96-98). The snap sounds (125-127) stay in snap().
  Verifier: The move is right: screenshot.mjs 481/600 checks the class name, the importers are flow.ts:10 and storyFlow.ts:12, the .then guard is needed, and the BlurFilter at 49 must be owned. But 'blur the halo once' is not neutral. The halo's scale animates (96, scale \* GLOW_SCALE) and its filter blurs after scaling. Pre-blurring at rest scale and then scaling changes the blur radius on screen, so the pixels differ. Accept it only after a screenshot diff.
- `SupervillainedScene.update (display writes)` (method) from `src/scenes/supervillainedScene.ts:86-104`: **split** as `SupervillainedScene.render(alpha)` · _verified_
  The clock and the two shake Math.random draws (101-102) stay in update. The writes to logo/glow scale, glow alpha, stage position and flash alpha move to render. The tap/continue skip (117-118) stays in update.

#### `src/ui/screens/story/storyCardScene.ts`

Tap-to-continue card.

Plan: StoryCardScene (screens 13-75).

Entries (1):

- `StoryCardScene` (class (Scene)) from `src/story/screens.ts:13-75`: **move** · _not verified_
  Keep the class name: scripts compare constructor.name with it (screenshot.mjs:487, story-smoke.mjs:355). Its `lines` param gains `names?: boolean`; the highlighting is done by the caller (see withNames). The TAP blink moves from update to render via blinkAlpha(t, hz) in core/render/redraw, replacing the `visible` toggle (audit cat 4, screens.ts:68-74).

#### `src/ui/screens/story/storyMenuScene.ts`

Level select, built from a row model.

Plan: StoryMenuScene (screens 78-139). The lock and colour rules go to systems/campaign/progression.

Entries (1):

- `StoryMenuScene` (class (Scene)) from `src/story/screens.ts:78-139`: **move** · _not verified_
  Keep the class name: story-smoke.mjs:308/317 compares constructor.name with it, and it is missing from the agreed list of constructor.name classes, so add it there. It is built from row models (below) instead of CampaignState plus ChapterDef, so ui does not import the story/engine/types chapter schema.

#### `src/ui/screens/story/storyChapterScene.ts`

Sub-level list.

Plan: StoryChapterScene (screens 142-198).

Entries (1):

- `StoryChapterScene` (class (Scene)) from `src/story/screens.ts:142-198`: **move** · _not verified_
  Keep the class name: story-smoke.mjs:303/317 compares constructor.name with it (add it to the agreed list).

#### `src/ui/screens/story/storyPauseScene.ts`

Story pause.

Plan: StoryPauseScene (screens 201-279).

Entries (1):

- `StoryPauseScene` (class (Scene)) from `src/story/screens.ts:201-279`: **move** · _not verified_
  Keep the class name: story-smoke.mjs:332/344/375 compares constructor.name with it (add it to the agreed list). The labels stay as UI copy. The sound and textSpeed actions arrive already bound to core/app/settingsActions.

#### `src/ui/screens/story/bookScene.ts`

Meraviglia book; its icon sprites are destroyed (audit screens 376-380).

Plan: BookScene view parts (screens 288-442).

Entries (1):

- `BookScene` (class (Scene)) from `src/story/screens.ts:288-442`: **move** · _not verified_
  clearTexts and exit must also destroy the per-page icon Sprites (audit cat 2, screens.ts:376-380). It is pushed from src/scenes/flow.ts:144 (which becomes core/flow/titleFlow.ts) and storyFlow.ts:357/379; update both imports in the move commit, with no shim needed because nothing in tests/ imports it. Paging stays in update. The audio click stays (audit cat 4, screens.ts:426, accepted).

#### `src/ui/screens/story/bookModel.ts`

Pure book rows and pagination.

Plan: BookRow, build, paginate, rowHeight (screens 282-370).

Entries (3):

- `BookRow` (interface) from `src/story/screens.ts:282-286`: **move** · _not verified_
- `BookScene.build` (method) from `src/story/screens.ts:312-333`: **split** as `buildBookRows(state: CampaignState): BookRow[]` · _not verified_
  It is pure. The section icons ('tear', 'tri', 'cross', 'coin', 'relic', 'sparkle', 'shard', 'thought') are art keys and stay here as SpriteKey literals. ui may import core/assets/manifest.
- `BookScene.paginate+rowHeight` (methods) from `src/story/screens.ts:336-356, 367-370`: **split** as `paginate(rows, avail, heightOf: (r) => number): BookRow[][]; rowHeight(row, textHeight)` · _not verified_
  They become pure through an injected measure. textFor (358-365) stays in BookScene as the view cache.

#### `src/ui/screens/debug/spriteViewerScene.ts`

The ?debug=sprites page; the frame swap moves to render.

Plan: SPRITE_VIEW_DIRS, spriteViewerLayout, SpriteViewerScene (scenes/spriteViewerScene).

Entries (4):

- `SPRITE_VIEW_DIRS` (const) from `src/scenes/spriteViewerScene.ts:11`: **move** as `SPRITE_VIEW_DIRS (= DIRS8 from core/math/projection)` · _verified_
  tests/spriteViewerLayout.test.ts imports it from '../src/scenes/spriteViewerScene'. Change that import in the same commit, or keep a shim until cleanup.
- `spriteViewerLayout` (function) from `src/scenes/spriteViewerScene.ts:14-22`: **move** as `spriteViewerLayout` · _verified_
  Keep the return shape { margin, labelWidth, top, columnWidth, rowHeight, scale } and the values: the test asserts layout boxes from them.
- `SpriteViewerScene` (class) from `src/scenes/spriteViewerScene.ts:25-94`: **move** as `class SpriteViewerScene` · _verified_
  main.ts:8 imports it for ?debug=sprites, which becomes core/flow/urlParams.ts. animationFrame comes from core/assets/manifest/animations, and CHARACTERS and textureName from core/assets/manifest.
- `SpriteViewerScene.update` (method) from `src/scenes/spriteViewerScene.ts:86-93`: **split** as `update(dt) advances time only; render(alpha) swaps a cell's texture only when its frame changed, through frameNames(key) (core/assets/manifest/names)` · _verified_
  Removes the per-cell textureName string build and the textures.get on every step (audit cat. 3).

### systems/ (extra: pure gameplay rules): 32 files, 158 entries

#### `src/systems/world/tiles.ts`

Ground and prop catalogue.

Plan: Ground, PropKind, PropInfo, P, PROP_INFO, isGroundWalkable, PoopSurface (world/tiles). PROP_SPRITE goes to the manifest and LEGEND to asciiMap.

Entries (8):

- `Ground` (const) from `src/world/tiles.ts:3-24`: **move** · _verified_
  Imported by core/assets/environment, systems placement/ambushEntry, the Green Zone scene, zampano (it becomes playerMotion.terrainFactor) and tests level, environment, topology, systems, balance from '../src/world/tiles'. Keep a shim at world/tiles.ts or update those paths.
- `Ground` (type) from `src/world/tiles.ts:25`: **move** · _verified_
  Moves with the const of the same name (the enum pattern).
- `PropKind` (type) from `src/world/tiles.ts:27-50`: **move** · _verified_
- `PropInfo` (interface) from `src/world/tiles.ts:52-61`: **move** · _verified_
- `P` (const) from `src/world/tiles.ts:63`: **move** · _verified_
  Private constructor for PROP_INFO entries.
- `PROP_INFO` (const) from `src/world/tiles.ts:65-89`: **move** · _verified_
  Collision radii and flags keyed by PropKind: catalogue data in systems, not config (config may not import PropKind). Only GameMap reads it.
- `isGroundWalkable` (function) from `src/world/tiles.ts:175-177`: **move** · _verified_
- `PoopSurface` (type) from `src/world/tiles.ts:180`: **move** · _verified_
  Read by GameMap.poopSurfaceAt and entities/items/poopPile.

#### `src/systems/world/level.ts`

Level and map types.

Plan: Swatch, Palette, SpawnSettings, EventSettings, AmbushSettings, PollutionWaveSettings, LevelSource, LevelDef, PropPlacement, LevelData, groundAt (world/level 4-152, 220-223).

Entries (11):

- `Swatch` (type) from `src/world/level.ts:4`: **move** · _verified_
  Used by core/assets/placeholders storyTiles (L4 to L3, allowed). About 17 src and 11 test files import world/level: leave `export * from '../systems/world/level'; export * from '../systems/world/asciiMap'` at src/world/level.ts until the tests are updated.
- `Palette` (interface) from `src/world/level.ts:6-30`: **move** · _verified_
  Read by core/assets (build, environment, placeholders) and content/maps/themes; tests environment and tileArt import it as a type.
- `SpawnSettings` (interface) from `src/world/level.ts:32-61`: **move** · _verified_
  tests/balance.test.ts imports it as a type.
- `EventSettings` (interface) from `src/world/level.ts:63-82`: **move** · _verified_
- `AmbushSettings` (interface) from `src/world/level.ts:85-101`: **move** · _verified_
  Read by systems/greenZone/ambush (sideways inside systems: world comes first in the systems order, so this is allowed).
- `PollutionWaveSettings` (interface) from `src/world/level.ts:103-112`: **move** · _verified_
- `LevelSource` (type) from `src/world/level.ts:115-117`: **move** · _verified_
- `LevelDef` (interface) from `src/world/level.ts:119-131`: **move** · _verified_
- `PropPlacement` (interface) from `src/world/level.ts:133-137`: **move** · _verified_
- `LevelData` (interface) from `src/world/level.ts:140-152`: **move** · _verified_
- `groundAt` (function) from `src/world/level.ts:220-223`: **move** · _verified_
  Unused at HEAD: `grep -rn "import.*groundAt" src tests scripts` finds nothing, and every groundAt( call is the GameMap method. Moved as the target lists it; a candidate for deletion at cleanup.

#### `src/systems/world/asciiMap.ts`

ASCII parser and pure row transforms.

Plan: LegendEntry, LEGEND (tiles 118-173); ParseOptions, LevelFormatError, parseAsciiMap, loadLevel (level 154-218); structureStoryRows (story/maps 135-148).

Entries (7):

- `structureStoryRows` (function) from `src/story/maps.ts:135-148`: **move** · _not verified_
  Pure. The stage files call it at import time (lido, zara, winter, desert, city, field). The paving periods and accent characters stay at those call sites as level data.
- `ParseOptions` (interface) from `src/world/level.ts:154-159`: **move** · _verified_
- `LevelFormatError` (class) from `src/world/level.ts:161`: **move** · _verified_
  tests/level.test.ts:3 imports it with loadLevel and parseAsciiMap from '../src/world/level': change it to '../src/systems/world/asciiMap'.
- `parseAsciiMap` (function) from `src/world/level.ts:167-205`: **move** · _verified_
  Callers: story/storyScene (becoming story/engine/stage) and tests level, threats, topology, map, environmentAssets, campaign. asciiMap.ts also receives LEGEND and LegendEntry from tiles.ts, so the parser no longer imports a sibling's legend.
- `loadLevel` (function) from `src/world/level.ts:211-218`: **move** · _verified_
  Callers: the Green Zone scene and tests systems, ambush, balance, topology.
- `LegendEntry` (interface) from `src/world/tiles.ts:118-123`: **move** · _verified_
- `LEGEND` (const) from `src/world/tiles.ts:134-173`: **move** · _corrected by verifier_
  Only the parser reads it (world/level.ts:168/189). DECISIONS.md documents the legend: update its path reference when this moves.
  Verifier: DECISIONS.md does not name the legend's path; it documents only the symbols (43, 183). The path reference to update is CLAUDE.md:79 ('world/ — tiles.ts (ground types, props, ASCII legend)'). The legend's own comment pointing to DECISIONS.md stays valid.

#### `src/systems/world/map.ts`

Runtime map model. Kept whole: cohesive and heavily tested.

Plan: MapProp, MoveResult, GameMap (world/map). New methods walkableNear (helpers 275-292) and randomSpotNear (placement 200-221). Fresh tiles are re-marked once per highlight step, not every step (audit mapRenderer 231-249).

Entries (7):

- `walkableNear` (function) from `src/campaign/chapters/helpers.ts:274-292`: **move** as `GameMap.walkableNear(x: number, y: number, maxR = MAP_QUERY_RADIUS): Point | null` · _not verified_
  No caller at HEAD: grep 'walkableNear' finds only this declaration and CLAUDE.md:108. It is a pure square-ring search over isWalkable, as the target says. Falling back to the player's position (291) is the caller's decision, so the method returns null instead. Update the CLAUDE.md 'Architecture' line that lists it among the chapter helpers.
- `GameScene.constructor (fx.terrainAt)` (method) from `src/scenes/gameScene.ts:97-103`: **split** as `GameMap.footTerrain(x, y): 'water' | 'bush' | 'tall' | 'ground'` · _verified_
  A pure map query (isWaterAt, propAt bush, Ground.TallGrass). greenZoneFx then reads it instead of an injected closure. Add a unit test.
  Verifier: Verified: GameMap has isWaterAt (map 207), propAt (93) and groundAt (88), and terrainAt's only reader is gameFx 278.
- `randomSpotNear` (function) from `src/systems/placement.ts:200-221`: **move** as `GameMap.randomSpotNear(x, y, minD, maxD, rng, accept?)` · _verified_
  A general map query. Its 9 call sites (ambush 179 and 221; threats 188, 200, 215, 216, 239, 240 and 260) become map.randomSpotNear(...). Two rng.range draws per attempt, in the same order. systems/world/map imports Rng from core/util/rng (L1, legal).
  Verifier: Verified: exactly 9 call sites (ambush 179/221, threats 188/200/215/216/239/240/260), and no test imports randomSpotNear.
- `MapProp` (interface) from `src/world/map.ts:5-14`: **move** · _verified_
  entities/prop.ts types PropEntity.mapProp with it (L5 to L3).
- `MoveResult` (interface) from `src/world/map.ts:16-20`: **move** · _verified_
- `GameMap` (class) from `src/world/map.ts:26-353`: **move** · _verified_
  Kept whole (heavily tested: level, map, threats, topology, systems, ambush, balance, sbrimbrulonActor type). Every test imports '../src/world/map': update them, or keep a shim at world/map.ts. scripts/screenshot.mjs reads s.map.dirt, clean(), props, exit and width, so the names are unchanged. The changed/fresh sets stay public (MapRenderer reads them). The target adds walkableNear and randomSpotNear from helpers and placement (other groups).
- `GameMap.update` (method) from `src/world/map.ts:289-296`: **keep** · _verified_
  CARE: the target's 're-mark fresh tiles once per highlight step, not every step' (audit mapRenderer.ts:231-249) changes how often refreshTile recomputes the fresh alpha, so stepped screenshots of a pee clean can differ. Do it in its own commit after the pure move and diff it against the screenshot baseline.

#### `src/systems/player/needs.ts`

Hunger, digestion, bladder and run energy.

Plan: Activity, Hunger, DigestionEvent, Digestion, Bladder, EnergyEvent, Energy (systems/needs, unchanged). Field names kept (scripts write rules.hunger.value).

Entries (7):

- `Activity` (type) from `src/systems/needs.ts:7`: **move** · _verified_
- `Hunger` (class) from `src/systems/needs.ts:9-33`: **move** · _verified_
  The `value` field name is kept (screenshot.mjs:618 writes rules.hunger.value). tests/systems.test.ts and balance.test.ts change their paths.
  Verifier: Checked: screenshot.mjs:618 writes rules.hunger.value.
- `DigestionEvent` (type) from `src/systems/needs.ts:35`: **move** · _verified_
- `Digestion` (class) from `src/systems/needs.ts:41-84`: **move** · _verified_
- `Bladder` (class) from `src/systems/needs.ts:87-132`: **move** · _verified_
- `EnergyEvent` (type) from `src/systems/needs.ts:134`: **move** · _verified_
- `Energy` (class) from `src/systems/needs.ts:140-177`: **move** · _verified_
  Owned by Zampano (entities to systems, legal). playerMotion's stepPlayerMotion reads canRun and calls update through the PlayerBody record. It imports ENERGY from config/motion. HUNGER, DIGESTION and BLADDER come from config/greenZone.
  Verifier: Its only src importer is entities/zampano.ts:6.

#### `src/systems/player/playerMotion.ts`

Pure player motion and action-state rules.

Plan: ZState, LOCKS_MOVEMENT (zampano 16-30); stepPlayerMotion(body, intent, env, dt), from updateMovement 176-234 (dead zone, screenDirToGrid, RUN gating, analog scaling, fetch run, accel/decel, knockback decay, moveCircle, energy, facing) in the same arithmetic order; terrainFactor (236-242).

Entries (5):

- `ZState` (type) from `src/entities/zampano.ts:16`: **move** · _verified_
  No importer outside zampano.ts today (grep ZState). The PlayerHandle interface in systems/greenZone/worldAccess types `state` with it.
- `LOCKS_MOVEMENT` (const) from `src/entities/zampano.ts:18-30`: **move** · _verified_
  Rule table read by stepPlayerMotion and by Zampano.controllable.
- `Zampano.knockback+bounce` (method) from `src/entities/zampano.ts:149-169`: **split** as `applyKnockback(body, dx, dy, speed); applyBounce(body, nx, ny)` · _corrected by verifier_
  The entity methods stay as one-line delegates, because story/combat (192/209/311), story/walk:496, systems/ambush:118, systems/rules and helpers.ts:141 (blockGap, which becomes story/walk/objectives/barriers) call player.knockback/bounce through PlayerHandle.
  Before the correction: newName `function applyKnockback(body, dx, dy, speed): void; function applyBounce(body, nx, ny): void`.
  Verifier: Corrected caller list: story/combat.ts:209 and 311 (192 is p.bump), story/walk.ts:496, systems/ambush.ts:118, systems/threats.ts:145 (not rules), and campaign/chapters/helpers.ts:141 (bounce). PlayerHandle must expose knockback for threats and ambush.
- `Zampano.updateMovement` (method) from `src/entities/zampano.ts:176-234`: **split** as `function stepPlayerMotion(body: PlayerBody, intent: PlayerIntent, env: {terrainAt(x,y): number; moveCircle: GameMap['moveCircle']}, energy: Energy, dt): EnergyEvent` · _verified_
  Same arithmetic order: dead zone, screenDirToGrid, RUN gating ('scripted' or held and canRun), analog scaling, fetch run with the half-time flip, accel/decel, knockback decay (KNOCK_DECAY), push + knock, moveCircle, energy.update, facing. The timers at 177-179 (stateTime, invulnerable, return to 'free') stay first, in Zampano.update, before the call. The call to updateAnimation (233) becomes the view part of Zampano.update. Callers rules.ts:88/97 and storyScene.ts:414 become player.update(dt, ctx). The first unit tests of player motion become possible (none exist today).
- `Zampano.terrainFactor` (method) from `src/entities/zampano.ts:236-242`: **split** as `function terrainFactor(map: GameMap, x: number, y: number): number` · _verified_
  Maps Ground.TallGrass/Water and the bush prop to config TERRAIN.\*.

#### `src/systems/motion/behavior.ts`

Behaviour, sight and point types.

Plan: Point (actor 16-19; also replaces the private copies in level1 3-6 and ambushEntry 6-9), Behavior, Sight (actor 21-36).

Entries (5):

- `Point` (interface) from `src/entities/actor.ts:16-19`: **move** · _verified_
  Most-imported actor type: campaign/chapters ch6/ch7/ch8/helpers, story/steps, walk, combat, autopilot, storyScene (all type-only). Also absorbs the private Point of levels/level1.ts:3-6 (see merge entry). Keep a type re-export in entities/actor.ts until the content/story moves land; content may import systems, so chapters import it from systems/motion/behavior directly.
- `Behavior` (type) from `src/entities/actor.ts:21-30`: **move** · _verified_
  CARE: the 'follow' arm has `target?: Entity`, and systems may not import entities. Retype it as a structural `Positioned = { readonly gx: number; readonly gy: number }` (declared in behavior.ts); Actor and Zampano still satisfy it. scripts/story-smoke.mjs:551 reads m.actor.behavior.kind, so the field name and the `kind` tags stay.
- `Sight` (interface) from `src/entities/actor.ts:32-36`: **move** · _verified_
  Read by systems/motion/sight (canSee) and the walk detection objective; the Actor field `sight` keeps its name.
- `Point` (interface) from `src/levels/level1.ts:3-6`: **merge** · _verified_
  Merged into the exported Point moved from entities/actor.ts (identical shape {x, y}). content may import systems, so greenZone.ts imports it from there.
- `Point` (interface) from `src/systems/ambushEntry.ts:6-9`: **merge** · _verified_
  Merged into the single Point {x, y} (from actor 16-19, which also replaces the level1 copy). Entry extends it. tests/ambush.test.ts does not import Point.

#### `src/systems/motion/steering.ts`

Pure steering per behaviour; returns a desired velocity. Math.random calls stay in the same order.

Plan: Actor.step 139-146 (knock decay) and 161-277 (idle, patrol, chase, flee, follow, wander, flail, goto, fly).

Entries (1):

- `Actor.step` (method) from `src/entities/actor.ts:139-146, 161-286`: **split** as `stepKnock(body, map, dt) + steer(b, body, target, map, dt, rng, out)` · _corrected by verifier_
  Pure; no Pixi. CARE (RNG): keep Math.random draws at the same points in the same order: fleeDirection(..., Math.random) at 209 and wander/flail at 235-240 (retarget test, angle, radius, skip). Pass `rng = Math.random` as a parameter and never reorder. The `toward` closure becomes a module function writing into `out` (removes the per-step closure and facing-object allocations, audit cat 3 actor.ts:115-311): write facing.x/y in place instead of `this.facing = {...}`. Fly writes body.z = HOVER_Z + sin(time\*HOVER_RATE)\*HOVER_AMP. Keep it as z (sim state, lerped via prevZ, used by screenRect) so screenshots stay byte-identical. Knock decay reads KNOCK_DECAY (COMBAT.FOE.KNOCK_DECAY stays an alias).
  Before the correction: newName `function steer(b: Behavior, body: ActorBody, target: Readonly<{gx,gy}>, map: GameMap, dt: number, out: SteerResult): void  // knock decay, all 9 behaviours, fly direct integration + hover z, speedScale, moveCircle, facing; out = {moving, running}`.
  Verifier: One function cannot hold both knock decay and the behaviours. Knock decay (139-146) runs BEFORE the hitFlash countdown and the two early-return gates (foe stun/windup 152-156, action lock 157-160), while the behaviours (161-286) run only AFTER those gates. A stunned or windup foe is still knocked back but does not steer. So export two functions and have Actor.update call them in today's order. Also, the idle branch calls this.face(b.face) (178), which writes animator.dir: steer must set body.facing only, and chooseClip re-derives dir via dirFromGridVector (291). The RNG notes are correct: 209, and 235/236/237/240 with short-circuit evaluation; keep the order.

#### `src/systems/motion/flee.ts`

Flee direction sampling.

Plan: fleeDirection (threatLogic 45-74).

Entries (1):

- `fleeDirection` (function) from `src/systems/threatLogic.ts:45-74`: **move** · _verified_
  Callers become systems/motion/steering (from Actor.step) and systems/greenZone/critterAi (from Cat and Bagnaskiz). Entities stop importing it directly. The random() callback is invoked once per unblocked direction in the same order, so Math.random draws do not drift. tests/threats.test.ts changes its path for fleeDirection.
  Verifier: Checked: the callers are actor.ts:209 and critters.ts:52/180, each passing Math.random.

#### `src/systems/motion/sight.ts`

Line of sight and sight test.

Plan: lineOfSight, canSee (walk 145-172).

Entries (2):

- `lineOfSight` (function) from `src/story/walk.ts:145-158`: **move** · _not verified_
  Pure over GameMap (systems/world/map; world comes before motion inside systems).
- `canSee` (function) from `src/story/walk.ts:161-172`: **move** as `canSee(map, a: {gx, gy, facing: Point, sight: Sight | null}, x, y)` · _not verified_
  Takes a structural subject instead of Actor (systems cannot import entities). Sight comes from systems/motion/behavior. BUSH_HIDE moves to config/story with the STORY engine block.

#### `src/systems/motion/cone.ts`

The one cone test.

Plan: inArc (combat 29-37) merged with inBarkCone (threatLogic 10-28), with the touch radius as a parameter (0.3 and 0.35 kept).

Entries (2):

- `inArc` (function) from `src/systems/combat.ts:29-37`: **merge** as `inCone(ox, oy, fx, fy, tx, ty, range, halfAngle, touch) with exported wrappers inArc (touch = COMBAT_RULES.POINT_BLANK) and inBarkCone (touch = COMBAT_RULES.BARK_TOUCH)` · _verified_
  The arithmetic of inArc and inBarkCone is identical (checked line by line), so the merge is exact. systems/combat/index re-exports inArc, so tests/combat.test.ts ('../src/systems/combat', including the dynamic import at line 77) keeps resolving. shieldBlocks in foe.ts imports cone.ts: combat sits above motion in the systems order, so this is legal.
  Verifier: Verified: inArc and inBarkCone are term-for-term identical apart from the touch radius (0.3 vs 0.35), with the same check order (range, then touch, then the cosine). The importers are story/combat.ts:6 and the tests.
- `inBarkCone` (function) from `src/systems/threatLogic.ts:10-28`: **merge** · _verified_
  Merged into inCone (see inArc), with an inBarkCone wrapper that passes touch = COMBAT_RULES.BARK_TOUCH. Same float arithmetic. tests/threats.test.ts imports inBarkCone from '../src/systems/motion/cone'.

#### `src/systems/nav/pathfinding.ts`

Danger-weighted grid Dijkstra with reusable buffers and the same tie-break order.

Plan: DIRS, findPath (autopilot 40-49, 224-275), over (w, h, isWalkable, danger).

Entries (2):

- `DIRS` (const) from `src/story/autopilot.ts:40-49`: **move** · _not verified_
  The entry order is the Dijkstra tie-break order, so keep it. The diagonal cost 1.414 is an algorithm constant: it stays inline and does not go to config.
- `Autopilot.findPath` (method) from `src/story/autopilot.ts:223-275`: **split** as `function findPath(w, h, isWalkable: (i,j)=>boolean, danger: ((i,j)=>number)|undefined, si, sj, ti, tj): number[]` · _not verified_
  navigate (198) calls findPath(map.width, map.height, (i,j)=>map.isWalkable(i,j), o.danger, ...). The tile index must stay j\*w+i, the same as GameMap.index (world/map.ts:84-86). The walk's danger closure keeps using map.index, including its row wrap at i = width. The reusable buffers must be refilled on every call (Infinity, -1, 0, NaN). Keep the open-list scan with its strict `<`, so the tie-break order does not change. Keep the bounds check: an out-of-bounds start or target returns [].

#### `src/systems/combat/foe.ts`

Fight rules.

Plan: Foe, newFoe, damageFoe, staggerFoe, stepFoe, isOpen, shieldBlocks (systems/combat).

Entries (7):

- `Foe` (interface) from `src/systems/combat.ts:9-19`: **move** · _verified_
  entities/actor imports the type (L5 to L3, legal), and story/combat/combatController the functions. Code inside src imports foe.ts directly, never the barrel.
  Verifier: Checked: entities/actor.ts:3 imports the type.
- `newFoe` (function) from `src/systems/combat.ts:21-23`: **move** · _verified_
- `damageFoe` (function) from `src/systems/combat.ts:44-57`: **move** · _verified_
- `staggerFoe` (function) from `src/systems/combat.ts:60-65`: **move** · _verified_
- `stepFoe` (function) from `src/systems/combat.ts:71-91`: **move** · _verified_
- `isOpen` (function) from `src/systems/combat.ts:97-100`: **move** · _verified_
  story/walk (now story/walk/walkStep or the walk pilot) imports it from foe.ts.
  Verifier: Its importers are story/walk.ts:15 and story/combat.ts:6. The test imports it dynamically at combat.test.ts:77.
- `shieldBlocks` (function) from `src/systems/combat.ts:103-105`: **move** · _verified_
  It calls inArc from systems/motion/cone with range Infinity. The 0.3 point-blank rule is unchanged.

#### `src/systems/combat/index.ts`

Barrel; '../src/systems/combat' keeps resolving for combat.test.

Plan: Re-exports of foe.ts and inArc from motion/cone.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/systems/greenZone/events.ts`

The Green Zone event map.

Plan: At, GameEvents (core/events 26-70).

Entries (2):

- `At` (interface) from `src/core/events.ts:26-29`: **move** · _verified_
  Used only inside GameEvents.
- `GameEvents` (interface) from `src/core/events.ts:32-70`: **move** · _verified_
  The Green Zone event map: Rules emits it, greenZoneFx and greenZoneAudio listen, and greenZoneScene owns the instance. No test imports it. Optionally type `bark.dir` as Dir8 from core/math/projection instead of string.

#### `src/systems/greenZone/worldAccess.ts`

Structural contracts that the composition root implements.

Plan: WorldAccess (rules 15-21); new Spawner (treat, poop, cat, ball, pug, bandMember), BandMember and PlayerHandle (gx, gy, state, startAction, face, bump, knockback, pushX/Y, setIntent) interfaces.

Entries (1):

- `WorldAccess` (interface) from `src/systems/rules.ts:15-21`: **move** · _corrected by verifier_
  `player: Zampano` becomes `player: PlayerHandle`, and addEntity/removeEntity become `spawn: Spawner` (treat, poop, cat, ball, pug, bandMember and remove). `events` keeps Emitter&lt;GameEvents> from core/util/emitter and systems/greenZone/events. GameScene (core/flow/greenZone/greenZoneScene) implements it with entities/factory. The target's handle list is too small. PlayerHandle must also expose vx, vy, facing, moving, running, controllable, energy, energyEvent, invulnerable (writable) and step(dt), on top of gx, gy, state, startAction, face, knockback, pushX/Y and setIntent. The file also needs TreatHandle, PoopHandle (gx, gy, cleaned, surface, step, expired), CatHandle, BallHandle and PugHandle, because Rules.treats/poops and Threats.cats/balls/pug are typed by entity classes today. Handles expose step(dt) plus an `expired` flag, and the adapter binds EntityContext, so systems never imports the entities-layer EntityContext type.
  Verifier: The rule that every handle 'exposes step(dt) plus an expired flag' does not fit the pug. Bagnaskiz.step(dt, map, px, py, pickTarget) (critters 146) takes the target picker, which must use Threats' rng at retarget time (entry 161), and returns 'bump'. PugHandle therefore needs step(dt, pickTarget: () => Point): 'bump' | null (or a bumped flag), plus active, state, hits, hit(fromX, fromY) and a writable target (threats 219). CatHandle needs state and startle(); BallHandle needs age and a writable taken. BandMember needs gx, gy, arrived, a readable behavior (story-smoke.mjs:551), setBehavior, faceToward, emote, playAction(anim, s, speed) and a writable fade. PlayerHandle as listed is complete for rules, threats and ambush once bump moves to greenZoneFx.

#### `src/systems/greenZone/scoring.ts`

Scoring maths and level result.

Plan: starsFromHealth, finalHealth, timeBonus, starBonus, LevelStats, newStats (scoring 4-41); LevelResult (overlays 540-552); levelResult() from flow.levelComplete 301-320.

Entries (8):

- `Flow.levelComplete (score assembly)` (method) from `src/scenes/flow.ts:301-306`: **split** as `function levelResult(stats: LevelStats, mapHealth: number, parTime: number): { health, stars, timeBonus, starBonus, total }` · _verified_
  Pure (finalHealth, starsFromHealth, timeBonus, starBonus). Unit-test it next to scoring.test. Persistence (saveRecord) and story data stay in walkFlow, because systems may not import core/state.
- `LevelResult` (interface) from `src/scenes/overlays.ts:540-552`: **move** as `LevelResult` · _verified_
  Imported as a type by ui/screens/levelEndScene and core/flow/walkFlow.
- `starsFromHealth` (function) from `src/systems/scoring.ts:4-9`: **move** · _verified_
  Also used by levelResult() (moved here from flow.levelComplete) and by Rules.stars.
- `finalHealth` (function) from `src/systems/scoring.ts:12-15`: **move** · _verified_
- `timeBonus` (function) from `src/systems/scoring.ts:17-19`: **move** · _verified_
- `starBonus` (function) from `src/systems/scoring.ts:21-23`: **move** · _verified_
- `LevelStats` (interface) from `src/systems/scoring.ts:26-37`: **move** · _verified_
  Field names are kept (screenshot.mjs writes rules.stats.coins and reads stats.poops). ui/screens/levelEndScene and pauseScene import the type (ui to systems, legal).
- `newStats` (function) from `src/systems/scoring.ts:39-41`: **move** · _verified_

#### `src/systems/greenZone/lives.ts`

Lives rules.

Plan: clampLives, nextLives, livesSpeed (systems/lives).

Entries (3):

- `clampLives` (function) from `src/systems/lives.ts:4-6`: **move** · _verified_
  core/state/settings imports it, which is now a legal L4-to-L3 edge. Also imported by core/app/settingsActions and core/flow/greenZone/greenZoneScene. tests/lives.test.ts changes its path.
  Verifier: Importer list is incomplete but the move is right: overlays.ts:314 (the title lives counter, to ui/screens/title/livesCounter) also calls clampLives (ui to systems, legal). The other importers are core/settings.ts:2, gameScene.ts:13 and tests/lives.test.ts.
- `nextLives` (function) from `src/systems/lives.ts:9-12`: **move** · _verified_
  Its caller moves from overlays 305-310 to core/app/settingsActions changeLives.
- `livesSpeed` (function) from `src/systems/lives.ts:15-17`: **move** · _verified_
  Verifier: Its caller is gameScene.ts:89.

#### `src/systems/greenZone/rules.ts`

Walk rules over a PlayerIntent and a Spawner; never Input or entity classes.

Plan: ActivePee, RunState, Rules (systems/rules). update(dt, intent) replaces update(dt, input); visual cues such as bump go through events. Fields kept: treats, poops, stats, hunger, state; dropPoop kept.

Entries (3):

- `ActivePee` (interface) from `src/systems/rules.ts:24-30`: **move** · _verified_
- `RunState` (type) from `src/systems/rules.ts:32`: **move** · _verified_
- `Rules` (class) from `src/systems/rules.ts:38-262`: **move** as `Rules, with update(dt, intent: PlayerIntent)` · _verified_
  Kept: treats, poops, stats, hunger, digestion, bladder, state, hooks, dropPoop, addScore, loseLife, endedFor and poopWarning (screenshot.mjs and story-smoke.mjs read rules.treats, rules.poops, rules.stats.\* and rules.hunger.value). Rules stays the 'owner' driver of the player and the poops. Lines 87-88 and 96-97 become player.setIntent(intent) followed by player.step(dt), and the motion maths lives in systems/player/playerMotion through Zampano.update. startAction and face calls stay: they lock movement or set the facing, which is gameplay. removeEntity (132, 224) becomes world.spawn.remove. map.clean and map.stampDirt (118, 185) stay as rules. The 'CLEAN!' and 'MARKING!' labels stay inline as game text. LAYERING CARE: the PlayerIntent type must be declared in systems/player/playerMotion.ts (L3) and re-exported by core/input/intent.ts. Declaring it in core/input (L4), as the target says, would make the type imports from systems/greenZone/rules and threats and from systems/player/playerMotion point upward.
  Verifier: The PlayerIntent layering correction is right: a type import from systems into core/input would point upward (L3 to L4). Declare it in systems/player/playerMotion and re-export it from core/input/intent.

#### `src/systems/greenZone/threats.ts`

Cats, balls, bark, pug and pollution waves, over a PlayerIntent and a Spawner.

Plan: PendingHit, Threats (systems/threats). CAT_TINTS go to colors. The Rng salt and call order are kept. Fields kept: pug, catTimer, ballTimer, balls, director, barkReadiness.

Entries (2):

- `PendingHit` (interface) from `src/systems/threats.ts:14-18`: **move** · _verified_
- `Threats` (class) from `src/systems/threats.ts:24-274`: **move** as `Threats, with update(dt, intent: PlayerIntent)` · _verified_
  Kept: cats, balls, pug, director, pollutionDirector, attackHeld, barkReadiness, and the TS-private catTimer and ballTimer (screenshot.mjs:684-685 writes them). The Rng salt 0x5bd1e995 stays inline, and every rng call keeps its order. Threats stays the 'owner' driver of cats, balls and the pug: cat.step and ball.step become step(dt), with 'expired' signals read through the handle, and removeEntity (92, 98, 108, 151) becomes world.spawn.remove. The magnet pushX/pushY writes (125-126), knockback (145) and startAction (117, 146, 161) stay as rules through PlayerHandle. tryBark, spawn (timers and RNG), startPollutionWave and stampDirt stay. The 'BYE PUG!' and 'MEOW!' labels stay inline. Merge the two config imports (lines 1 and 7). CARE: BARK.WAVE_SPEED (hit delay, line 168) and BARK.ANIM_TIME (action lock, line 161) are gameplay. The target moves them to config/fx BARK_WAVE, which would make this file depend on fx tuning. Keep them in BARK (config/greenZone) and let fx read them, or alias them there.
  Verifier: Checked: screenshot.mjs:684-685 write catTimer and ballTimer, :658 reads threats.pug and :693 reads threats.balls.

#### `src/systems/greenZone/threatLogic.ts`

Directors and the magnet pull.

Plan: magnetPull, AttackSignal, PollutionWaveDirector, AttackDirector (threatLogic 34-148).

Entries (4):

- `magnetPull` (function) from `src/systems/threatLogic.ts:34-38`: **move** · _verified_
- `AttackSignal` (type) from `src/systems/threatLogic.ts:76`: **move** · _verified_
- `PollutionWaveDirector` (class) from `src/systems/threatLogic.ts:82-101`: **move** · _verified_
  Imports PollutionWaveSettings from systems/world/level.
- `AttackDirector` (class) from `src/systems/threatLogic.ts:108-148`: **move** · _verified_
  Kept whole, including intensity(health): it is a pure function of the rules state that greenZoneFx and ui/effects/attackFx read. The `state` field name is kept (story-smoke.mjs:497).
  Verifier: intensity() is called at gameScene.ts:201 and threats.ts:223. story-smoke.mjs:497 reads director.state.

#### `src/systems/greenZone/critterAi.ts`

Pure cat and pug decisions.

Plan: Cat.step AI (critters 36-56), the Bagnaskiz target, stun and flee logic (153-188), pickGreenTarget (threats 254-273).

Entries (5):

- `inline state unions of Cat and Bagnaskiz` (type) from `src/entities/critters.ts:13, 108`: **move** as `CatState, PugState` · _added by verifier_
  CatBody.state and PugBody.state need these unions in systems. The entities type their public `state` fields with them, and threats, debugState and screenshot.mjs read state.
- `Cat.step` (method) from `src/entities/critters.ts:36-60`: **split** as `stepCat(body, px, py, map, dt, rng = Math.random)` · _corrected by verifier_
  Pure. RNG: fleeDirection(..., Math.random) stays behind the CAT.THINK_INTERVAL timer exactly as today. CatBody = {gx, gy, state, age, stateTime, think, dir, speed}.
  Before the correction: newName `function stepCat(body: CatBody, px, py, map: GameMap, dt, rng = Math.random): void  // lifetime, idle/startled/flee/leave, think timer, fleeDirection, speed, moveCircle`.
  Verifier: CatBody must not be a copied record. threats.ts reads cat.state, age, gx and gy directly (86-98, plus debugState), and screenshot.mjs teleports next to cats, so pass the Cat itself (Cat implements CatBody). Make dir, think and stateTime non-private, or put them in a nested record. The CatState union (critters.ts:13) moves to critterAi with it.
- `Bagnaskiz.hit` (method) from `src/entities/critters.ts:131-142`: **split** as `function hitPug(body: PugBody, fromX, fromY): boolean  // hits++, knock velocity, stunned|flee` · _verified_
  The Bagnaskiz.hit() wrapper stays on the entity, because threats and story call pug.hit(); it calls hitPug and then animState.play('hurt', dir, true).
- `Bagnaskiz.step` (method) from `src/entities/critters.ts:147-201, 208-211`: **split** as `stepPug(body, px, py, map, dt, pickTarget, rng = Math.random, out)` · _corrected by verifier_
  pickGreenTarget (threats.ts:254-273) moves here too, per the target. CARE (RNG drift): fleeDirection is drawn on every flee step today (180). The audit fix (a think timer, as Cat and Actor have) changes how many Math.random draws happen, so it is a behaviour change: make it a separate commit and diff the baseline playtest report, not part of the pure move. Knock decay reads KNOCK_DECAY (BAGNASKIZ.KNOCKBACK_DECAY kept as an alias). `out` replaces the 'bump' | null return value.
  Before the correction: lines `150-166, 172-201, 208-211`; newName `function stepPug(body: PugBody, px, py, map: GameMap, dt, pickTarget: () => Point, rng = Math.random, out: PugStep): void  // roam retarget, stun/flee states, knock decay, moveCircle, lastDir; out = {vx, vy, anim, bump, stampDirt}`.
  Verifier: Entries 37 and 38 conflict: `out.stampDirt` puts the trail timer in stepPug, while 38 keeps 167-171 in the entity. Ordering also matters, because pickGreenTarget (threats.ts:254-273) READS map.dirt and runs at 158, before the stamp at 170. Stamping before stepPug could change the target chosen in a step where both timers fire. Stamping after stepPug at the post-move position would change the dirt field, because the stamp uses the pre-move gx/gy and moveCircle runs at 197. Resolve it by putting the whole sim (stateTime and bumpCooldown at 148-149, retarget, the trail timer, the stun/flee machine, fleeDirection, knock decay, moveCircle, lastDir, the bump test) in stepPug. Set out.stamp = {x, y} to the pre-move position, and have the entity call ctx.pollute(out.stamp...) after stepPug. Pass the body as the Bagnaskiz itself (state, hits, target and active are read by threats and the scripts). Use a PugState union and pugActive(body).
- `Threats.pickGreenTarget` (method) from `src/systems/threats.ts:254-273`: **split** as `pickGreenTarget(map, from: {gx, gy}, pug: {gx, gy}, rng): Point` · _verified_
  It must receive Threats' rng and be invoked at the same moment as today, inside the pug's retarget (critters 156-158, now critterAi), so its 14 randomSpotNear draws stay at the same place in the stream.

#### `src/systems/greenZone/ambush.ts`

Ambush runtime over BandMember handles; spawns through the Spawner.

Plan: Member, ViewSize, Ambush (systems/ambush). Fields kept: director, band, holdsAttack, revealed, skip.

Entries (3):

- `Member` (interface) from `src/systems/ambush.ts:13-26`: **move** · _verified_
  `actor: Actor` becomes `actor: BandMember` (systems/greenZone/worldAccess). The field names key, actor, entry, angle, barkIn, poopIn, poopsLeft and squatLeft are kept. story-smoke.mjs reads m.actor.gx/gy, m.actor.behavior.kind and m.entry.offscreen, so BandMember must expose gx, gy and a readable `behavior`.
  Verifier: Checked: story-smoke.mjs:550-551/595/609/628 read m.entry.offscreen, m.actor.behavior.kind and m.actor.gx/gy.
- `ViewSize` (type) from `src/systems/ambush.ts:29`: **move** · _verified_
- `Ambush` (class) from `src/systems/ambush.ts:40-247`: **move** · _verified_
  Kept: director, band, holdsAttack, revealed and skip() (screenshot.mjs:636). The Rng salt 0x2c1b3c6d stays inline (RNG stream identity, not tuning), and every rng.range call keeps its order. The leave fade (line 85) stays here as a write to the sim field BandMember.fade, and Actor.render applies it as alpha. Actors are not fadeable, so the World occlusion pass never writes it. Line 87 actor.step(dt, map, player) becomes m.actor.update(dt), with the EntityContext bound by the adapter, so systems never names an entities type (Ambush is an 'owner' driver). this.world.removeEntity (134) becomes world.spawn.remove. Imports: core/util/rng, core/assets/manifest (CHARACTERS, animationDuration; L2, legal), core/math/projection, systems/world/level, systems/world/map (randomSpotNear method) and the greenZone siblings rules, ambushLogic, ambushEntry and worldAccess. No cycle, because rules imports none of them. Only GameScene imports it.
  Verifier: Checked: Actor never sets fadeable (Entity default false). skip() is called at screenshot.mjs:636.

#### `src/systems/greenZone/ambushLogic.ts`

Ambush state machine.

Plan: AmbushPhase, AmbushSignal, AmbushTiming, AmbushDirector (lerp goes to core/math).

Entries (4):

- `AmbushPhase` (type) from `src/systems/ambushLogic.ts:15`: **move** · _verified_
- `AmbushSignal` (type) from `src/systems/ambushLogic.ts:17-25`: **move** · _verified_
  tests/ambush.test.ts imports the type from the new path.
- `AmbushTiming` (interface) from `src/systems/ambushLogic.ts:27-33`: **move** · _verified_
- `AmbushDirector` (class) from `src/systems/ambushLogic.ts:37-148`: **move** · _verified_
  Pure and kept whole. The `phase` field name is kept (story-smoke.mjs reads ambush.director.phase). The Rng is still injected.
  Verifier: Checked: story-smoke.mjs:491/609/627 read director.phase.

#### `src/systems/greenZone/ambushEntry.ts`

Entry geometry for the band.

Plan: Entry, standsAt, clearRun, offscreenEntry, at (ambushEntry). BAND_BODY goes to config.

Entries (6):

- `Ambush.beyondView edge distance (duplicate of offscreenEntry's)` (inline-duplicate) from `src/systems/ambush.ts:172`: **merge** as `viewEdge(ux, uy, halfW, halfH)` · _added by verifier_
  ambush.ts:172 and ambushEntry.ts:54 compute the same screen distance to the view edge: `Math.min(|ux| > 1e-6 ? halfW/|ux| : Infinity, |uy| > 1e-6 ? halfH/|uy| : Infinity)`. Ambush passes w/2 and h/2 (`w / 2 / Math.abs(ux)`, the same as halfW/|ux| once w/2 is computed first), so one pure helper in ambushEntry is bit-identical. beyondView then adds AMBUSH.ENTRY_MARGIN as today.
- `Entry` (interface) from `src/systems/ambushEntry.ts:12-14`: **move** · _verified_
  The `offscreen` field name is kept (story-smoke.mjs:550).
- `standsAt` (function) from `src/systems/ambushEntry.ts:20-24`: **move** · _verified_
  Imports Ground from systems/world/tiles and GameMap from systems/world/map. Both are downward edges inside systems.
- `clearRun` (function) from `src/systems/ambushEntry.ts:27-35`: **move** · _verified_
  tests/ambush.test.ts changes its path to '../src/systems/greenZone/ambushEntry'.
- `offscreenEntry` (function) from `src/systems/ambushEntry.ts:44-71`: **move** · _verified_
- `at` (function) from `src/systems/ambushEntry.ts:73-76`: **move** · _verified_
  Private. It uses screenToGrid from core/math/projection (L1).

#### `src/systems/greenZone/placement.ts`

Treat placement and route geometry.

Plan: TreatSettings, placeTreats, RouteLine, routeLine, pointOnRoute, distanceToRoute, nearestOnRoute, placeAlongRoute (placement 7-197).

Entries (8):

- `TreatSettings` (type) from `src/systems/placement.ts:7`: **move** · _verified_
- `placeTreats` (function) from `src/systems/placement.ts:14-66`: **move** · _verified_
  The Rng(seed) draw order is unchanged. tests/systems.test.ts and balance.test.ts change their paths.
- `RouteLine` (interface) from `src/systems/placement.ts:69-73`: **move** · _verified_
- `routeLine` (function) from `src/systems/placement.ts:75-80`: **move** · _verified_
- `pointOnRoute` (function) from `src/systems/placement.ts:83-92`: **move** · _verified_
- `distanceToRoute` (function) from `src/systems/placement.ts:95-97`: **move** · _verified_
- `nearestOnRoute` (function) from `src/systems/placement.ts:99-114`: **move** · _verified_
- `placeAlongRoute` (function) from `src/systems/placement.ts:123-197`: **move** · _verified_

#### `src/systems/campaign/model.ts`

Campaign state types and format version.

Plan: MeterKey, Ability, FlagValue, Effects, Book, STORY_VERSION, StoryNotice, CampaignState, Change, Ending, GraceTier (campaign/state).

Entries (11):

- `MeterKey` (type) from `src/campaign/state.ts:18`: **move** · _verified_
  Importers: progression (was summary), ui/screens/couchScene (ui to systems is a legal downward edge), and config/campaign METER_START through `satisfies` at its use site. Config itself imports no types.
  Verifier: Checked: the importers are summary.ts and couchScene.ts.
- `Ability` (type) from `src/campaign/state.ts:19`: **move** · _verified_
- `FlagValue` (type) from `src/campaign/state.ts:20`: **move** · _verified_
- `Effects` (interface) from `src/campaign/state.ts:22-35`: **move** · _verified_
  Used by story/steps, walk, combat, minigames/miniGame and storyScene (L7 to L3), and by content chapters (content may import systems types). Every edge is legal.
  Verifier: The grep hit in systems/ambush.ts:38 is only the word in a comment, not an import.
- `Book` (interface) from `src/campaign/state.ts:37-48`: **move** · _verified_
- `STORY_VERSION` (const) from `src/campaign/state.ts:51`: **move** · _verified_
  The value stays 2 and is not bumped: this is a pure move, so CLAUDE.md requires no migration. core/state/campaignSave re-exports it. tests/campaign.test.ts then imports it from '../src/core/state/campaignSave', next to migrateV1 and the backup keys.
- `StoryNotice` (type) from `src/campaign/state.ts:54`: **move** · _verified_
- `CampaignState` (interface) from `src/campaign/state.ts:56-70`: **move** · _corrected by verifier_
  The `version: 2` literal type and every field name stay as they are, because the save JSON is supervillained:story and scripts/screenshot.mjs and story-smoke.mjs write it raw. Until all importers move, src/campaign/state.ts stays as a temporary `export *` shim over model, rules, costumes and campaignSave.
  Verifier: The temporary src/campaign/state.ts shim must also re-export endingNotes (content/campaign/endings) and METER_START/METER_MAX (config). Otherwise move story/storyFlow.ts:2 and tests/campaign.test.ts:5 in the same commit. As written ('model, rules, costumes and campaignSave'), storyFlow's endingNotes import and the test's METER_START/METER_MAX imports break the build. A shim that re-exports content is only acceptable because campaign/ is an allowlisted legacy folder; no cycle results, since endings imports only systems.
- `Change` (interface) from `src/campaign/state.ts:97-100`: **move** · _verified_
- `Ending` (type) from `src/campaign/state.ts:173`: **move** · _verified_
  The 'alpha' key is kept for save compatibility. scripts/playtest.mjs passes ending=knight|alpha.
- `GraceTier` (type) from `src/campaign/state.ts:200`: **move** · _verified_

#### `src/systems/campaign/rules.ts`

Meter rules.

Plan: newCampaign, addUnique, METER_LABEL, applyEffects, canSpend, spend, markComplete, isComplete, unshakeable, ending, fadeCommozione, graceTier, a new endingTiers(state) (the selection logic of endingNotes, state 209/217-221), optionView (steps 83-89).

Entries (15):

- `newCampaign` (function) from `src/campaign/state.ts:81-94`: **move** · _verified_
  Called by core/state/campaignSave (migrateV1, loadCampaign, resetCampaign). L4 to L3 is legal. tests/summary.test.ts and campaign.test.ts import it from the new path.
- `METER_LABEL` (const) from `src/campaign/state.ts:102-107`: **move** · _verified_
  Stays private, next to applyEffects, which builds the popup labels from it (per the target). The meter names are game text, not config.
- `addUnique` (function) from `src/campaign/state.ts:109-113`: **move** · _verified_
  Private helper of applyEffects. It is not generic enough to go to core/util.
- `applyEffects` (function) from `src/campaign/state.ts:116-143`: **move** · _verified_
  Kept whole. The label strings (MARVEL:, GOT:, VALUE:, SCRAP:, UNLOCKED:, COINS) stay with the rule that emits them. Callers: storyScene and core/flow/storyFlow.
  Verifier: Checked: the callers are story/storyScene.ts and story/storyFlow.ts.
- `canSpend` (function) from `src/campaign/state.ts:146-148`: **move** · _verified_
  Verifier: Its only caller is story/steps.ts.
- `spend` (function) from `src/campaign/state.ts:150-154`: **move** · _verified_
  ch7 content imports it. content to systems is legal.
  Verifier: Callers: ch7.ts and story/steps.ts.
- `markComplete` (function) from `src/campaign/state.ts:156-158`: **move** · _verified_
- `isComplete` (function) from `src/campaign/state.ts:160-162`: **move** · _verified_
  Also used by progressSummary and by unlocked() in systems/campaign/progression. That is a sideways import inside systems/campaign.
- `unshakeable` (function) from `src/campaign/state.ts:165-167`: **move** · _verified_
  Verifier: Its caller is story/walk.ts (L7 to L3, legal).
- `ending` (function) from `src/campaign/state.ts:174-176`: **move** · _verified_
- `fadeCommozione` (function) from `src/campaign/state.ts:192-197`: **move** · _verified_
  STORY.COMMOZIONE_FADE becomes CAMPAIGN.COMMOZIONE_FADE (config/campaign). tests/campaign.test.ts lines 59-60 change keys in the same commit.
- `graceTier` (function) from `src/campaign/state.ts:201-204`: **move** · _verified_
  STORY.GRACE becomes CAMPAIGN.GRACE. ch8 (content) imports it. tests/campaign.test.ts lines 79-81 change keys.
- `endingNotes.tiers` (function) from `src/campaign/state.ts:209, 217-221`: **split** as `endingTiers(state): { grace: GraceTier; standing: 'fond' | 'fair' | 'low' }` · _verified_
  The threshold selection is pure rules over CAMPAIGN.GRACE and CAMPAIGN.STANDING, testable without prose.
- `METERS` (const) from `src/scenes/couchScene.ts:16-21`: **merge** as `METER_LABEL (exported)` · _verified_
  The labels are identical to METER_LABEL in campaign/state.ts:102-107, which moves to systems/campaign/rules. Export it and iterate its keys in order (commozione, supervillain, grace, standing) instead of keeping a second label list.
  Verifier: Verified: campaign/state.ts:102-107 has `const METER_LABEL` (not exported) with the same four labels in the same key order. Exporting it and iterating its keys keeps the row order and the label width at line 133.
- `optionView` (function) from `src/story/steps.ts:83-89`: **move** as `optionView(o: { label: string; locked?: string; cost?: number }, state): ChoiceView-shaped { label, locked? }` · _not verified_
  The parameter becomes structural, because Option holds Step[]. The cost-label strings travel with it as game text. In the same commit, the tests/campaign.test.ts:7 import changes to '../src/systems/campaign/rules' (or story/steps/index re-exports it; prefer the direct path).

#### `src/systems/campaign/costumes.ts`

Costume and skin rules in one place.

Plan: ZampanoCostume, PLAYABLE_CHARACTER_KEYS, PlayableCharacterKey, PlayAs, PLAY_AS, ARMOURED_SKINS, costumeFor (manifest 124-149); dreamSkin (state 183-186); the costume rule of summary 57.

Entries (9):

- `PLAYABLE_CHARACTER_KEYS` (const) from `src/assets/manifest.ts:124-128`: **move** · _not verified_
  `satisfies readonly CharacterKey[]` through a type import of core/assets/manifest/characters (L3->L2, legal). tests/pixelCast.test.ts:2 imports it from '../src/assets/manifest': repoint it, or keep it in the shim until cleanup. Consumers: core/stage/world (playerSkin type), story/steps, story/engine.
- `PlayableCharacterKey` (type) from `src/assets/manifest.ts:129`: **move** · _not verified_
- `ZampanoCostume` (type) from `src/assets/manifest.ts:132`: **move** · _not verified_
- `PlayAs` (type) from `src/assets/manifest.ts:134`: **move** · _not verified_
  Consumers: core/flow/storyFlow, story/engine/storyScene.
- `PLAY_AS` (const) from `src/assets/manifest.ts:135`: **move** · _not verified_
  main.ts:74 (?as=) moves to core/flow/urlParams.
- `ARMOURED_SKINS` (const) from `src/assets/manifest.ts:138`: **move** · _not verified_
  Combat gating (story/engine/stage knighted). pixelCast.test:56 imports it dynamically from '../src/assets/manifest'.
- `costumeFor` (function) from `src/assets/manifest.ts:144-149`: **move** · _not verified_
  Pure and tested (pixelCast.test:56, dynamic import). Repoint it with PLAYABLE_CHARACTER_KEYS.
- `dreamSkin` (function) from `src/campaign/state.ts:183-186`: **move** · _verified_
  The return type becomes ZampanoCostume (moved to the same file from manifest 124-149). It never returns 'zampanoCross' (grep: only manifest, cast placeholders and this signature name it). It shares one ability test with costumeOf, the summary's costume rule. Importers: ch5 (content), story/minigames/action and storyScene.
  Verifier: Checked: the importers are ch5.ts:7, story/minigames/action.ts:6 and story/storyScene.ts:5. ZampanoCostume is at manifest 132, inside 124-149. Only the manifest and placeholders/cast.ts name 'zampanoCross'.
- `progressSummary.costume` (function) from `src/campaign/summary.ts:57`: **split** as `costumeOf(state): 'knight' | 'cross' | null` · _verified_
  One costume rule, shared with dreamSkin (the duplicate the inventory flagged).

#### `src/systems/campaign/progression.ts`

Unlocks, the COUCH summary and menu row models.

Plan: New ChapterOutline (a structural type, not ChapterDef); unlocked (storyFlow 146-150); ProgressSummary, progressSummary (summary 5-62); the lock, colour and label rules (screens 89-177).

Entries (5):

- `ProgressSummary` (interface) from `src/campaign/summary.ts:5-26`: **move** · _verified_
  It is the plain view model that ui/screens/couchScene receives as a parameter.
- `progressSummary` (function) from `src/campaign/summary.ts:28-62`: **move** as `progressSummary(state, chapters: readonly ChapterOutline[])` · _verified_
  ChapterDef is replaced by the structural ChapterOutline {number; subLevels: readonly {id; title}[]}, because systems cannot import story/engine/types. CHAPTERS still satisfies it structurally, so titleFlow and tests/summary.test.ts pass the chapter list unchanged. Only the import path changes.
- `StoryMenuScene.constructor` (menu model) from `src/story/screens.ts:102-111`: **split** as `levelRows(state, chapters: ChapterOutline[], isUnlocked): Array<{ number, label, status: 'locked'|'open'|'done' }>` · _not verified_
  The done/open counting and the label rule are pure. The screen maps status to colour through MENU.PROGRESS (config/colors), so both list screens share one rule. The CONTINUE/BEGIN THE DREAM label choice (102) stays in the screen as UI copy.
- `StoryChapterScene.constructor` (menu model) from `src/story/screens.ts:158-161, 168-172`: **split** as `subLevelRows(state, chapter: ChapterOutline): Array<{ id, title, status }>` · _not verified_
  The firstOpen and done rule. Colours come from MENU.PROGRESS.
- `StoryFlow.unlocked` (method) from `src/story/storyFlow.ts:146-150`: **split** as `unlocked(state, chapters: readonly ChapterOutline[], ch: ChapterOutline): boolean` · _not verified_
  StoryFlow.unlocked stays as a one-line delegate, because StoryMenuScene receives it as a callback and it is public.

#### `src/systems/story/dialogueGesture.ts`

The speaking-gesture rule.

Plan: DialogueGestureTarget, playDialogueGesture (story/dialogueGestures 9-30). It reads the gestureSlot flag from the manifest.

Entries (2):

- `DialogueGestureTarget` (interface) from `src/story/dialogueGestures.ts:9-15`: **move** · _not verified_
  It is structural, so Actor implements it without systems importing entities. The AnimName type comes from core/assets/manifest/animations (L2, allowed).
- `playDialogueGesture` (function) from `src/story/dialogueGestures.ts:21-30`: **move** · _not verified_
  The HUMAN_GESTURE_KEYS.has(portrait) test becomes `portrait in CHARACTERS && CHARACTERS[portrait].gestureSlot === 'bark'`. In the same commit, the tests/dialogueGestures.test.ts:2 import changes to '../src/systems/story/dialogueGesture'.

#### `src/systems/story/gaps.ts`

Pure gap-box test.

Plan: Gap, and the push-out maths of blockGap (helpers 121-146) as pushOutOfGap(body, gap).

Entries (2):

- `Gap` (interface) from `src/campaign/chapters/helpers.ts:120-126`: **move** · _not verified_
  Pure type. ch1's two gate boxes (level data) are typed with it; content may import systems types.
- `blockGap.pushOut` (function-part) from `src/campaign/chapters/helpers.ts:138-140`: **split** as `export function pushOutOfGap(body: { gx: number; gy: number }, gap: Gap): -1 | 0 | 1` · _not verified_
  Moves body.gx to the edge it came in from and returns the side (0 = outside the box). Pure, so it is unit-tested without a ctx. The west/east tie-break (p.gx - x0 &lt; x1 - p.gx) is unchanged. barriers.ts calls player.bounce(side, 0) with the returned side.

### story/ (extra: the story engine): 46 files, 107 entries

#### `src/story/engine/types.ts`

Content schema owned by the engine (removes the type cycle between campaign and story).

Plan: SubLevelDef, ChapterDef (campaign/types). theme and music are typed as strings, and content narrows them.

Entries (2):

- `SubLevelDef` (interface) from `src/campaign/types.ts:5-20`: **move** · _corrected by verifier_
  `script: () => Step[]` imports Step from story/engine/step, a sideways import in story. This removes the type cycle between campaign and story. The 9 chapter files (ch1..ch8 and chapters/index) change `from '../types'` to the story/engine/types public entry, because content/campaign/types.ts will not exist.
  Verifier: The importer list is incomplete. story/screens.ts:7 imports ChapterDef and SubLevelDef (lines 92-98, 154-155), and those screens move to ui/screens/story (L6), which may not import story/engine/types (L7). StoryMenuScene and StoryChapterScene must switch to ChapterOutline and the row models of systems/campaign/progression in the same commit. Otherwise the layer test fails, or the edge has to be allowlisted. Other importers: campaign/summary.ts (becomes ChapterOutline), story/storyFlow.ts (to core/flow, legal) and story/storyScene.ts (story, legal). ch7 becomes 5 files, so more than '9 chapter files' change their import.
- `ChapterDef` (interface) from `src/campaign/types.ts:23-36`: **move** · _corrected by verifier_
  theme becomes string (content narrows it with `satisfies ThemeKey`, and storyScene resolves it through StoryCatalog.themes). For music, prefer `MusicTrack` from core/audio/engine (story to core/audio, L7 to L4, is legal) over a bare string: it replaces the hardcoded union at line 32 with the real track table and keeps the check. The '216-px-wide' comment refers to VIEW.W.
  Verifier: Same importer gap as entry 53: story/screens.ts reaches ChapterDef from ui. Typing music as MusicTrack deviates from the agreed target ('theme and music are typed as strings'). It is legal as a type-only import (L7 to L4) and better, because storyFlow.ts:241/399 pass ch.music to playTrack/setTrack, which would otherwise need a cast. Record the deviation in the layer note. The ThemeKey import from story/maps (content) must go: theme becomes a string.

#### `src/story/engine/step.ts`

The Step contract.

Plan: StepStatus, Step (plus render?(alpha)), ResumeStep (story/step); a new PilotApi interface that the autopilot implements, so the engine does not import it.

Entries (5):

- `PilotPolicy` (interface) from `src/story/autopilot.ts:16-24`: **move** · _not verified_
  This deviates from the target, which puts it in pilot/autopilot.ts. The PilotApi interface in engine/step.ts needs `policy: PilotPolicy`, and the story order (engine before pilot) forbids engine/step importing story/pilot, even type-only. story/pilot/autopilot.ts re-exports it, so core/flow/storyFlow.ts (today story/storyFlow.ts:9) and core/flow/urlParams.ts can import it from the pilot.
- `NavOptions` (interface) from `src/story/autopilot.ts:28-38`: **move** · _not verified_
  Same reason as PilotPolicy: PilotApi.navigate(ctx, target, o: NavOptions) is declared in engine/step. story/pilot/autopilot.ts re-exports it.
- `StepStatus` (type) from `src/story/step.ts:4`: **move** · _not verified_
- `Step` (interface) from `src/story/step.ts:10-19`: **move** as `Step { start(ctx: StoryContext); update(dt, ctx); stop?; resume?; pilot?(dt, ctx, p: PilotApi); render?(alpha) }` · _not verified_
  ctx narrows from StoryScene to StoryContext (engine/context.ts), and the Autopilot type becomes the PilotApi interface declared here. That removes the type cycles step&lt;->storyScene and step&lt;->autopilot. Importers to update: walk, combat, minigames/miniGame, carry, the campaign/types schema (now story/engine/types), and campaign/chapters/helpers (now story/walk/follow and lull).
- `ResumeStep` (class) from `src/story/step.ts:22-36`: **move** · _not verified_
  It also forwards render?(alpha). The runner must call stop on any queued ResumeStep when the scene exits (audit walk.ts:652-662: StoryScene.exit stops only `current`, so a walk suspended under an interrupt card is never stopped).

#### `src/story/engine/context.ts`

The narrow StoryContext that steps and scripts use, and the injected StoryCatalog.

Plan: StoryHooks, StageOptions (storyScene 24-37); new StoryContext (runner, stage, controls, effects, dialogue, cards, hud facades, apply, state, metrics, time), StoryCatalog (maps, themes, speakers, oldWords, names), and the StoryActor and PropHandle types.

Entries (2):

- `StoryHooks` (interface) from `src/story/storyScene.ts:24-28`: **move** · _not verified_
- `StageOptions` (interface) from `src/story/storyScene.ts:30-37`: **move** · _not verified_
  PlayableCharacterKey comes from systems/campaign/costumes, and Point and Dir8 from systems/motion/behavior and core/math/projection.

#### `src/story/engine/runner.ts`

Step queue.

Plan: queue, current, finished, next, interrupt, insert (storyScene 135-164).

Entries (1):

- `StoryScene.next+interrupt+insert` (runner) from `src/story/storyScene.ts:61-63, 135-164`: **split** as `class StoryRunner { queue, current, finished, start(steps), next(), interrupt(steps), insert(steps), stopAll() }` · _not verified_
  The clearPending and setIntent(0,0) side effects (138-139) run through hooks given by the facade. interrupt and insert stay on StoryScene as delegates: they are used 8 times each by content, walk and combat.

#### `src/story/engine/stage.ts`

Stage and actor registry, driven by the catalog.

Plan: setStage (169-202, which now calls buildLevelTextures before new World), marker, addActor, actor, removeActor, player, knighted, costume (205-261); ensureCharactersNow, now backed by ensureCharactersSync (492-494); place() for placeObject (helpers 266-272).

Entries (5):

- `placeObject.addEntity` (function-part) from `src/campaign/chapters/helpers.ts:267, 270`: **split** as `stage.place(key, where, opts): PropHandle (resolves the marker, asks the factory, calls world.addEntity)` · _not verified_
  ctx.world! disappears from content.
- `BoatGame.update (actor bob)` (method) from `src/story/minigames/action.ts:371-372`: **split** as `ctx.stage.lift(name, z) (StoryContext stage facade; Actor.render applies z)` · _not verified_
  The bob value stays Math.sin(time \* 2) \* 1.5, computed in the glue.
- `StoryScene.setStage+marker+addActor+actor+removeActor+player+knighted+playAs+costume` (stage and actor registry) from `src/story/storyScene.ts:169-261`: **split** as `class StoryStage` · _not verified_
  setStage reads maps and themes from the StoryCatalog, not content/maps. It calls buildLevelTextures(palette) before new World(...), entities/stageDressing for props, and entities/factory for the player. paletteForChapter and floorDesignForMap come from core/assets/environment, dreamSkin from systems/campaign/costumes, and parseAsciiMap from systems/world/asciiMap. It resets the screen effects through effects.reset() (172-174). knighted uses ARMOURED_SKINS from systems/campaign/costumes. The facade keeps delegates for marker, addActor, actor, removeActor, player, knighted, costume and the playAs field (storyFlow.ts:247 writes scene.playAs). marker stays pure apart from the world read.
- `ensureCharactersNow` (function) from `src/story/storyScene.ts:491-494`: **move** as `StoryStage.ensureCharacters(keys) -> ensureCharactersSync (core/assets/characterTextures)` · _not verified_
  It makes explicit the hidden contract that placeholder textures exist synchronously before an Actor is built.
- `World.constructor` (method) from `src/world/world.ts:51`: **split** as `buildLevelTextures(palette) called by setStage before `new World(...)`` · _verified_
  The same call goes in core/flow/greenZone/greenZoneScene.ts before its `new World`. It is a texture side effect that core/stage must not perform; it must still run before MapRenderer is constructed (textures.get on tile names), so the call order is unchanged.

#### `src/story/engine/controls.ts`

Story controls and action modes.

Plan: setControls, actionModes, setActionMode, cycleActionMode, suspendControls, resumeAfterPause, requestMenu (storyScene 268-332).

Entries (2):

- `StoryScene.resize` (touch layout call) from `src/story/storyScene.ts:127-130`: **split** as `StoryControls.layout(w, h) -> applyTouchLayout(input, TOUCH_LAYOUT.STORY(w, h), enabled)` · _not verified_
- `StoryScene.setControls+setActionMode+cycleActionMode+suspendControls+resumeAfterPause+requestMenu` (controls and action modes) from `src/story/storyScene.ts:268-332`: **split** as `class StoryControls (fields controlsWanted/Action/Run/Opts, actionModes, actionMode)` · _not verified_
  The joystick.active and menu-button writes go through core/input/touchLayout.applyTouchLayout (the single hit-area writer). The facade keeps setControls, actionModes, actionMode (screenshot.mjs:384 reads it), setActionMode, cycleActionMode, suspendControls and resumeAfterPause, because storyFlow.ts:335/344 calls the last two.

#### `src/story/engine/effects.ts`

Effects facade for scripts: apply, say, flash, visor, fog, bleach, shake, burst(kind, at), sound(SoundName), tint, transition, snapCamera.

Plan: apply (340-343), say (354-357), the screen-effect setters (359-388). It replaces content's direct writes to ctx.particles, game.audio, filters, sprite.tint, game.transition and world.snapCamera (ch7 53/164/313-324/362/449/461, ch8 57-60/155-156/233/280, ch4 78).

Entries (5):

- `CH8.subLevels['8.1'] cushion smell burst` (closure-part) from `src/campaign/chapters/ch8.ts:54-61`: **split** as `ctx.effects.burst('smell', ctx.marker('5'))` · _not verified_
  The 0.5 s timer stays in the script. The facade projects the grid point (gridToScreenInto, no allocation), applies the preset's screen lift (-6 px) and calls Particles.burst with the same arguments, so the particle RNG draws keep their order.
- `CH8.subLevels['8.2'] high-grace sparkle burst` (step-body) from `src/campaign/chapters/ch8.ts:154-157`: **split** as `ctx.effects.burst('grace', ctx.marker('4'))` · _not verified_
  Same facade, preset BURSTS.grace (lift -14 px).
- `Combat side effects (audio, popups, bursts, shake)` (method-group) from `src/story/combat.ts:167-168, 193, 210-211, 241-243, 249-250, 267, 300-305, 313-314`: **split** as `ctx.effects.sound(name), ctx.effects.say(text, at, color), ctx.effects.burst('hit'|'block', gridPoint), ctx.effects.shake(SHAKE.HURT)` · _not verified_
  The calls stay in combatController and only route through the facade. The facade projects grid to screen and applies the preset's 14 px lift, so the controller no longer calls gridToScreen. The block burst is centred on the midpoint of the player and the foe (303).
- `StoryScene.apply+say` (effects facade) from `src/story/storyScene.ts:340-343, 353-357`: **split** as `StoryEffects.apply(fx), StoryEffects.say(text, at, color)` · _not verified_
  apply uses applyEffects from systems/campaign/rules. say projects with gridToScreenInto (no allocation). The facade keeps apply (story-smoke.mjs:62 calls `top().apply`) and say (37 content uses).
- `StoryScene.flash+visor+fog+bleach+shake` (screen-effect setters) from `src/story/storyScene.ts:359-388`: **split** as `StoryEffects.flash(color, alpha), visor, fog, bleach (setters), shake(amount)` · _not verified_
  These are the script-facing setters. ctx.visor/fog/bleach/flash/shake stay on the facade as delegates (ch1/ch2 visor, ch7 fog/bleach).

#### `src/story/engine/storyScene.ts`

A thin Scene facade implementing StoryContext. The class name and the fields scripts read are kept.

Plan: StoryScene's enter, exit, resize, update, render (which forwards to step.render), back, debugSkip, debugState. Still readable: current, mapKey, dialogue, apply, actionMode, metrics, player, marker, knighted, world, controls. The dead `locked` field is dropped.

Entries (1):

- `StoryScene` (class (Scene)) from `src/story/storyScene.ts:42-489`: **move** · _not verified_
  It becomes a thin facade implementing StoryContext. It keeps enter, exit, resize, update, render (with a `covered` skip, audit 447-451, and forwarding current.render?(alpha)), back, debugSkip and debugState. Keep these names for scripts and src: root, current (now a getter over the runner; story-smoke.mjs:667 and screenshot.mjs:372/391 read `top().current`), state, sub, chapter, time, metrics, mapKey, world, player, marker, knighted, apply, actionMode, actors, dialogue (must stay the DialogueBox instance: screenshot.mjs:319 reads `dialogue.full`, and capture_environment_screens.mjs:98-99 reads `dialogue.root` and `cards.root`), cards, hud, controls (the TouchControls view; name the new engine controller something else, e.g. `controlModes`, to avoid a clash), particles, popups, stageLayer, gameLayer, uiLayer, pilot, playAs and restarted. The constructor gains `catalog: StoryCatalog`, and builds DialogueBox(catalog.speakerOf, catalog oldWords) and StoryHud() without Input. In update, `player.updateMovement` and `a.step` (413-415) become player.update(dt, ctx) and actor.update(dt, ctx) in the same order (player, then actors: the 'owner' driver), followed by world.updateEntities and world.endStep. exit also destroys the particles pool (audit 113) and the screenOverlay filter, and stops queued ResumeSteps.

#### `src/story/steps/dialogue.ts`

Dialogue, choice and card steps.

Plan: tapped, SayStep, say, prof, Option, AskStep, ask, CardStep, CardOptions, card (steps 21-215). speakerOf comes from the catalog.

Entries (10):

- `tapped` (function) from `src/story/steps.ts:21-26`: **move** · _not verified_
  It reads input through the StoryContext (ctx.input) instead of ctx.game.input.
- `SayStep` (class (Step)) from `src/story/steps.ts:28-57`: **move** · _not verified_
  Keep the class name: screenshot.mjs:411-415 and debugState.step compare it. The speaker portrait comes from ctx.catalog.speakerOf(key) instead of importing story/ui, which removes the engine-to-view edge. Keep the call ctx.dialogue.show(speakerKey, text): tests/dialogueGestures.test.ts:44-52 asserts show('bishop', 'SWEAR.') with a fake ctx {actors, dialogue}, and that fake must gain `catalog: { speakerOf }` in the same commit.
- `say` (Step factory) from `src/story/steps.ts:60-62`: **move** · _not verified_
  It stays public through the story/steps/index barrel (chapters, tests/dialogueGestures.test.ts:3).
- `prof` (Step factory) from `src/story/steps.ts:65-67`: **move** · _not verified_
- `Option` (interface) from `src/story/steps.ts:69-80`: **move** · _not verified_
  It stays in story because `then?: Step[]` is a story type that systems may not import.
- `AskStep` (class (Step)) from `src/story/steps.ts:91-168`: **move** · _not verified_
  Keep the class name: story-smoke.mjs:42/434/451 and screenshot.mjs:144/201 compare it. The pick comes from the DialogueBox list intent fed by ListNav (ui/widgets/listNav); the step reads Input and passes it on. The choice rows are drawn only on change, which fixes audit steps.ts:134 / ui.ts:207-248 (rows drawn twice per step). The audio click goes through ctx.effects.sound('click').
- `ask` (Step factory) from `src/story/steps.ts:171-173`: **move** · _not verified_
- `CardStep` (class (Step)) from `src/story/steps.ts:175-200`: **move** · _not verified_
  Keep the class name: screenshot.mjs:131 compares it. `sound as 'glitch'` becomes a typed SoundName (core/audio/patches) played through ctx.effects.sound. flash goes through ctx.effects.flash().
- `CardOptions` (interface) from `src/story/steps.ts:202-210`: **move** as `CardOptions { ...; sound?: SoundName }` · _not verified_
- `card` (Step factory) from `src/story/steps.ts:213-215`: **move** · _not verified_
  It is also imported by story/walk and story/combat. They switch to the concrete file ../steps/dialogue, since code inside src imports concrete files.

#### `src/story/steps/stage.ts`

Stage and actor steps.

Plan: stage, actor, behave, remove, move (using gridDeltaToStick), moveAsync, face, skin, emote (steps 246-353).

Entries (9):

- `stage` (Step factory) from `src/story/steps.ts:246-255`: **move** · _not verified_
  MapKey becomes a string key validated by the StoryCatalog, because story may not import content/maps. Content narrows it with its own MapKey type.
- `actor` (Step factory) from `src/story/steps.ts:257-259`: **move** · _not verified_
  addActor's `name` is stored as Container.label on the Actor (name collision with Container.name, per the entity model). The only writer is the line at 253.
- `behave` (Step factory) from `src/story/steps.ts:261-263`: **move** · _not verified_
- `remove` (Step factory) from `src/story/steps.ts:265-267`: **move** · _not verified_
- `move` (Step factory) from `src/story/steps.ts:270-303`: **move** · _not verified_
  It drives the player through a scripted PlayerIntent: player.setIntent(intent) with run 'scripted'.
- `moveAsync` (Step factory) from `src/story/steps.ts:306-308`: **move** · _not verified_
- `face` (Step factory) from `src/story/steps.ts:310-315`: **move** · _not verified_
- `skin` (Step factory) from `src/story/steps.ts:318-324`: **move** · _not verified_
  `void ensureCharacters([skin])` becomes ctx.stage.ensureCharacters([skin]), backed by ensureCharactersSync, so the step no longer imports the asset builder directly.
- `emote` (Step factory) from `src/story/steps.ts:348-353`: **move** · _not verified_

#### `src/story/steps/control.ts`

Control and effect steps.

Plan: call, fx, wait, branch, objective, sound (typed SoundName), shake, flash (steps 218-346).

Entries (9):

- `bark` (function) from `src/campaign/chapters/helpers.ts:35-40`: **move** as `export function bark(ctx: StoryContext, text = 'WOOF!'): void, exported through story/steps/index` · _not verified_
  DEVIATION from the target, which puts bark in content vocab. lullWalk (moving to story/walk/lull.ts) calls bark at 208 and 212, and story never imports content. In story/steps/control.ts it stays on the public script API that ch1 and ch2 already import. The body goes through facades: ctx.player.startAction('bark', STEPS.BARK_ANIM), ctx.effects.sound('bark'), ctx.effects.say(text, player). Combat.bark's no-fight path (story/combat.ts:166-168) is the same three lines, so combatController should call this function there and the bark exists once (story/combat sits after story/steps in story's internal order).
- `call` (Step factory) from `src/story/steps.ts:218-225`: **move** · _not verified_
  Imported by carry, walk and combat.
- `fx` (Step factory) from `src/story/steps.ts:228-230`: **move** · _not verified_
- `wait` (Step factory) from `src/story/steps.ts:232-243`: **move** · _not verified_
- `branch` (Step factory) from `src/story/steps.ts:327-329`: **move** · _not verified_
- `objective` (Step factory) from `src/story/steps.ts:332-334`: **move** · _not verified_
  It calls ctx.hud.setObjective through the hud facade.
- `sound` (Step factory) from `src/story/steps.ts:336-338`: **move** as `sound(name: SoundName)` · _not verified_
  Chapter calls get typed. A misspelt sound name becomes a compile error.
- `shake` (Step factory) from `src/story/steps.ts:340-342`: **move** · _not verified_
- `flash` (Step factory) from `src/story/steps.ts:344-346`: **move** · _not verified_

#### `src/story/steps/carry.ts`

Carry steps.

Plan: carried, drop, carry, dropCarried (story/carry 31-52).

Entries (4):

- `carried` (const WeakMap) from `src/story/carry.ts:31`: **move** · _not verified_
  Keyed by the StoryContext (same object as the StoryScene facade), so it stays GC-safe.
- `drop` (function) from `src/story/carry.ts:33-37`: **move** · _not verified_
  It reads the World through the stage facade (ctx.stage.world / removeEntity). World stays core/stage, which story (L7) may import.
- `carry` (Step factory) from `src/story/carry.ts:40-48`: **move** · _not verified_
  It imports `call` from ./control, a sibling in story/steps that never imports carry, so there is no cycle. It is re-exported by story/steps/index.ts. Chapters ch1/ch3/ch4/ch5/ch7 import '../../story/carry', so leave an `export *` shim at src/story/carry.ts until content/campaign/chapters move to the story/steps barrel.
- `dropCarried` (Step factory) from `src/story/carry.ts:50-52`: **move** · _not verified_
  Same shim and barrel as carry.

#### `src/story/steps/index.ts`

Script API barrel, replacing story/steps.ts.

Plan: Re-exports of dialogue, stage, control and carry.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/story/walk/types.ts`

Walk schema.

Plan: Pickup, PaceDef, PilotHint, WalkState, WalkDef (walk 24-97), plus a WalkSnapshot for the pilot and new options: visor, barriers, actionCompletes (replaces survive:1e9 at ch5 251), walkSpeedMul (replaces the player.speedMul writes at ch2 201/205).

Entries (5):

- `Pickup` (interface) from `src/story/walk.ts:24-34`: **move** · _not verified_
  Point comes from systems/motion/behavior and SpriteKey from core/assets/manifest. Re-exported by story/walk/index.ts for helpers, ch3, ch6 and ch8 (type imports).
- `PaceDef` (interface) from `src/story/walk.ts:36-43`: **move** · _not verified_
  Latent: grep finds no `pace:` in src/campaign.
- `PilotHint` (interface) from `src/story/walk.ts:46-52`: **move** · _not verified_
- `WalkState` (interface) from `src/story/walk.ts:54-65`: **move** · _not verified_
- `WalkDef` (interface) from `src/story/walk.ts:67-97`: **move** · _not verified_
  ctx changes from StoryScene to StoryContext, and pilot's p from Autopilot to PilotApi. fight is FightDef from story/combat/types. It adds the target's options visor, barriers, actionCompletes and walkSpeedMul, plus a WalkSnapshot for walkPilot. thirst is latent at HEAD.

#### `src/story/walk/walkStep.ts`

Walk orchestration. Class name WalkStep and field `combat` kept.

Plan: WalkStep start, resume, reset, update, stop and completion (walk 174-337, 652-662); walk(). Pickups are spawned through the factory, markers are mounted through entities/markers, and stop() also runs when the scene exits during an interrupt.

Entries (3):

- `CH5.subLevels['5.5'] chalk walk (survive 1e9 sentinel)` (walk-option) from `src/campaign/chapters/ch5.ts:246-257`: **split** as `walk({ actionCompletes: { radius: 1.5 } })` · _not verified_
  Replaces survive: 1e9 (251) and the onAction distance check (253-256). Reaching the goal no longer finishes the walk; the scene action within `radius` of the goal sets complete. setControls must count actionCompletes as the scene's own action (own: !!onAction || !!actionCompletes, walk.ts:240), or the CHALK button disappears. The radius 1.5 and the pilot hint (252, act &lt; 1.2) stay as level data. Option type in story/walk/types.ts.
- `WalkStep` (class) from `src/story/walk.ts:174-176, 181-182, 193-194, 198-206, 227-243, 255-271, 319-334, 652-663`: **move** · _not verified_
  Keeps the class name: story-smoke INTERESTING and screenshot.mjs skipTo(page, 'WalkStep'). Keeps the field `combat` (screenshot.mjs:372/391 reads current.combat). It holds start, resume, reset, the objective calls in update, completion (326-334) and stop. The STORY engine reads (PICKUP_RADIUS, GOAL_RADIUS, ALERT_\*, HOSTILE_TOUCH, PACE, THIRST, SCRAMBLE, FIRE) move with the block to config/story. stop() destroys markers through destroyTree. It must also run when the scene exits while the walk sits under an interrupt as a ResumeStep (audit 652-662). Gains render(alpha), which drives the markers and the arrow. `git mv walk.ts walk/index.ts` keeps '../../story/walk' resolving for all eight chapters and helpers.
- `walk` (function) from `src/story/walk.ts:665-667`: **move** · _not verified_
  Re-exported by story/walk/index.ts; content/campaign/vocab and the chapters import it from there.

#### `src/story/walk/walkInput.ts`

Input to PlayerIntent, with scramble rotation and action dispatch.

Plan: perform (walk 246-253), the input reads in update (273-291).

Entries (2):

- `CH2.subLevels['2.3'] charge speedMul` (walk-callbacks) from `src/campaign/chapters/ch2.ts:196-207`: **split** as `walk({ walkSpeedMul: 0.8 })` · _not verified_
  Replaces the player.speedMul writes at 201 and 205. walkInput sets player.speedMul = running ? 1 : walkSpeedMul where setIntent is called today: the same step, still before movement, and `running` is the last step's value either way. WalkStep.stop resets it to 1. Stop runs inside StoryScene.next() just before the following call step's start(), in the same frame, so the timing does not change. The call at 204-207 keeps only addActor('pierre'). The 0.8 stays in the script as level data. Option type in story/walk/types.ts.
- `WalkStep.perform+update input` (method-group) from `src/story/walk.ts:245-253, 272-291`: **split** as `readWalkIntent(input, scrambleAngle, out: PlayerIntent) + dispatchActions(ctx, combat, def, mode)` · _not verified_
  Built on core/input/intent.intentFromInput. Keep the scramble rotation arithmetic (277-279) and the consume order (switch, action, pee, bark, strike, guard). Then combat.update(dt, ctx, intent.guard), where guard = guardHeld || (actionMode === 'shield' && actionHeld). player.setIntent(intent).

#### `src/story/walk/objectives/pickups.ts`

Pickups and checkpoints.

Plan: walk update 294-318.

Entries (2):

- `WalkStep.start spawn + update pickups and checkpoints` (method-group) from `src/story/walk.ts:192, 216-222, 293-318`: **split** as `spawnPickup(ctx, list, def) / collectPickups(ctx, state, def) / passCheckpoints(ctx, state, def)` · _not verified_
  Construction goes through entities/factory.pickup(...) and world.addEntity. The sparkle burst goes through ctx.effects.burst('pickup', at) and the label popup through ctx.effects.say. The interrupt card keeps its options. Keep the reverse iteration order (294).
- `WalkStep.drawGoal+pilotMove (nearest pickup)` (method-group) from `src/story/walk.ts:527-533, 584-588`: **merge** as `nearestPickup(pickups, p): PickupEntity | null` · _not verified_
  Merges the two identical loops. Keep the strict `<` where the first entry wins, so the target choice (and the pilot path) is unchanged.

#### `src/story/walk/objectives/detection.ts`

Alerts and caught.

Plan: updateDetection (walk 339-362, without the drawing).

Entries (1):

- `WalkStep.updateDetection` (method) from `src/story/walk.ts:339-342, 344-350, 352-362`: **split** as `updateDetection(dt, ctx, def, state, onReset)` · _not verified_
  Without the drawing. Uses canSee from systems/motion/sight and SHAKE.CAUGHT through ctx.effects.shake. The caught card and reset interrupt stay.

#### `src/story/walk/objectives/pace.ts`

Nerve and pace.

Plan: updatePace (walk 380-418).

Entries (1):

- `WalkStep.updatePace (+ forward, warnT, forward init)` (method-group) from `src/story/walk.ts:183-184, 207-215, 380-418`: **split** as `initPace(def, start, goal) + updatePace(dt, ctx, def, state)` · _not verified_
  Latent at HEAD (no chapter sets pace). It reads input.move today (383-384); in the target it reads the step's PlayerIntent magnitude. unshakeable comes from systems/campaign/rules.

#### `src/story/walk/objectives/thirst.ts`

Thirst and mirage (unused at HEAD; moved as is).

Plan: updateThirst (walk 420-437).

Entries (1):

- `WalkStep.updateThirst (+ mirage init)` (method-group) from `src/story/walk.ts:188, 223, 420-437`: **split** · _not verified_
  Latent at HEAD; moved as is.

#### `src/story/walk/objectives/scramble.ts`

Control scramble.

Plan: updateScramble (walk 439-460).

Entries (1):

- `WalkStep.updateScramble (+ scramble fields)` (method-group) from `src/story/walk.ts:185-187, 439-460`: **split** · _not verified_
  Only ch8.ts:69 uses it. The Math.random index into the angle list keeps the same list order.

#### `src/story/walk/objectives/fire.ts`

Fire as a Set of tiles, with no Sprites.

Plan: updateFire, ignite (walk 462-514).

Entries (1):

- `WalkStep.updateFire+ignite (logic)` (method-group) from `src/story/walk.ts:189-191, 462-491, 493-508, 513`: **split** as `class FireSpread { tiles: Set<number>; on; t; ignite(map, i, j, goal); update(dt, ctx) }` · _not verified_
  The Map&lt;number, Sprite> becomes a Set&lt;number>. Set iteration order is insertion order, the same as Map keys, so `burning[Math.floor(Math.random() * n)]` picks the same tiles. The knockback, hurt and notice stay. Only the 7.5 walk (ch7.ts:322) uses it.

#### `src/story/walk/objectives/visor.ts`

The visor walk rule, written once.

Plan: ch1 70-85 and ch2 49-63.

Entries (2):

- `CH1.subLevels['1.1'] visor rule` (walk-callbacks) from `src/campaign/chapters/ch1.ts:66-85`: **split** as `walk({ visor: { hint: 'WALK ON TO PUSH THE BUCKET UP. STOP AND IT SLIDES DOWN', hintAt: 'start' } })` · _not verified_
  The visor rule is written once, merged with ch2 49-63. The objective keeps stillT and bow in its own state instead of w.data. The visor lowers on stillness (speed &lt; VISOR.STILL_SPEED for longer than VISOR.STILL_AFTER) or during a bow, and the objective writes ctx.effects.visor. The bow (VISOR.BOW) starts only when the walk's scene action runs (WalkStep.perform 'scene' calls def.onAction), not on the B and bark-gesture path that goes to Combat.bark, exactly as today. onAction keeps only bark(ctx, 'WOOF! (IT ECHOES INSIDE THE BUCKET.)'). hintAt 'start' shows the notice once w.time > VISOR.HINT_AFTER; ch2 uses 'down'. The objective does not reset the visor when it stops: the reset stays in the call at 92, after the slap card.
- `CH2.subLevels['2.1'] visor rule` (walk-callbacks) from `src/campaign/chapters/ch2.ts:45-63`: **merge** as `walk({ visor: { hint: 'THE HELMET SLIPS DOWN. WALK ON TO PUSH IT UP', hintAt: 'down' } })` · _not verified_
  Merged into the same objective as CH1 1.1. onAction keeps bark(ctx, 'JERUSALEM!'). onUpdate keeps only the whisper behind the door (64-69: timer in w.data.t, 3.2 s, offset (+2, -2), level data). Nothing sets the visor before this walk (unlike 1.1), so the objective starts from the current value.

#### `src/story/walk/objectives/barriers.ts`

Gap barriers, resolved inside the walk before movement.

Plan: The runtime of blockGap (helpers 134-146), over systems/story/gaps, with the STORY.BUMP rate limit.

Entries (3):

- `CH1.subLevels['1.2'] jackGate` (walk-callbacks) from `src/campaign/chapters/ch1.ts:111, 172-185`: **split** as `walk({ barriers: [{ gap: { x0: 6.55, x1: 8.45, y0: 2, y1: 5 }, active: () => !open, onBump: (ctx) => { bumps++; NOPE! popup; emote; notice at 3 and 8; letThrough at 14 } }] })` · _not verified_
  onUpdate keeps only `if (open) w.complete = true`. active() reproduces today's early return: no gate once open. Barriers run right after onUpdate, so a letThrough at bump 14 still completes the walk on the next step, as now. The gap box stays in ch1 as level data, typed Gap from systems/story/gaps.
- `CH1.subLevels['1.3'] cutGate` (walk-callbacks) from `src/campaign/chapters/ch1.ts:206-207, 259-266`: **split** as `walk({ barriers: [{ gap: { x0: 17.4, x1: 18.9, y0: 2, y1: 5 }, onBump: (ctx) => { jack.setPosition(18.5, 3.5); emote; say; notice the first time } }] })` · _not verified_
  Jack's teleport goes through the StoryActor handle. onUpdate keeps only the joke timer. The joke zone (gy > 6.6) and the gate (gy &lt; 5) never overlap, so running the barrier after onUpdate changes nothing.
- `blockGap` (function) from `src/campaign/chapters/helpers.ts:128-146`: **split** as `export function blockGap(gap: Gap): (ctx: Pick<StoryContext, 'time' | 'player'>) => boolean (same contract), built once per entry of walk({ barriers: [{ gap, active?, onBump }] })` · _not verified_
  Keeps the STORY.BUMP.EVERY rate limit (135, 142-144) and the player.bounce call. The walk runs each barrier at the slot onUpdate has today: right after def.onUpdate, before drawGoal and completion, and before StoryScene moves the player. So the order of push-out, bump callback and completion is unchanged. tests/blockGap.test.ts only changes imports: '../src/story/walk/objectives/barriers', and the StoryScene type from story/engine/storyScene. Its fake ctx {time, player{gx, gy, bounce}} still fits the narrowed type. This fixes the audit's ch1.ts:257-275 finding: content no longer writes player.gx.

#### `src/story/walk/follow.ts`

Follow-the-leader walk factory (fresh closure state per script() call).

Plan: FollowOptions, followLeader (helpers 44-116).

Entries (2):

- `FollowOptions` (interface) from `src/campaign/chapters/helpers.ts:44-60`: **move** · _not verified_
  Callback ctx types become StoryContext. Step comes from story/engine/step; WalkState and Pickup come from story/walk/types. Exported through the story/walk/index barrel.
- `followLeader` (function) from `src/campaign/chapters/helpers.ts:62-116`: **move** · _not verified_
  A walk factory, so it belongs to the engine. The closure state (idx, current, waiting) must stay inside the function body: every script() call builds a fresh step, which is what resets an attempt. The pilot offsets (89) and the waypoint radius (107) go to config (entries below). setBehavior goes through the StoryActor handle. Callers: ch1 1.2, ch2 2.3, ch3 3.1 and 3.4, ch5 5.2, ch6 6.3, ch7 7.2. They import it from story/walk.

#### `src/story/walk/lull.ts`

Lull walk factory.

Plan: LullOptions, lullWalk (helpers 150-248).

Entries (2):

- `LullOptions` (interface) from `src/campaign/chapters/helpers.ts:150-172`: **move** · _not verified_
  pilotActs is typed (p: PilotApi) => boolean (story/engine/step) instead of (p: Autopilot), so the engine does not import the autopilot. PilotApi must expose readonly policy, because ch7 7.8 reads p.policy.ending.
- `lullWalk` (function) from `src/campaign/chapters/helpers.ts:174-248`: **move** · _not verified_
  Walk factory. Its closure state (talking, phaseT, phraseT, k, good, usedThisLull) stays per call. Math.random (180) keeps its call sites and order, so seeded playtests do not drift. bark comes from story/steps/control and the distance from core/math/geometry. The default texts ('WOOF?', 'TOO FAR: NOBODY HEARS HIM', 'LOST UNDER THE NOISE. WAIT FOR A LULL', 'NOISE', 'A LULL: NOW!') are UI copy and stay as option defaults. The per-step hud.setMode/setObjective calls stay: StoryHud redraws only on change (ui/hud/storyHud), which is where the audit put the cost. Callers: ch2 2.2, ch3 3.3, ch7 7.8.

#### `src/story/walk/index.ts`

Barrel replacing story/walk.ts.

Plan: walk, the types, followLeader, lullWalk.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/story/combat/types.ts`

Fight schema.

Plan: FightDef, Snapshot (combat 15-44).

Entries (2):

- `FightDef` (interface) from `src/story/combat.ts:15-38`: **move** · _not verified_
  Effects comes from systems/campaign/model. Content reaches it through story/combat/types, which is a public entry point. The file grows into a folder with `git mv story/combat.ts story/combat/index.ts` (a barrel); walk.ts:14 is the only importer.
- `Snapshot` (interface) from `src/story/combat.ts:40-44`: **move** · _not verified_
  Point and Behavior come from systems/motion/behavior, and Actor (type only) from entities/actor. It is exported from types.ts for the controller only; the barrel does not re-export it.

#### `src/story/combat/combatController.ts`

Fight logic with no Graphics; drives CombatMarkers. Public foes, health and routed are kept for screenshot.mjs.

Plan: Combat (combat 51-329, 397-409) minus draw. Foe tints go through Actor.flash and baseTint (combat 403).

Entries (1):

- `Combat` (class) from `src/story/combat.ts:51-329, 397-405, 408-409`: **move** · _not verified_
  Keeps the class name Combat and no Graphics. These public members stay, because scripts/screenshot.mjs:372/391 reads `current.combat.foes[].foe.windup/hp`, `.health` and `.routed`: foes, health, maxHealth, routed, guarding, active, need, won, onKnockedDown. card comes from story/steps/dialogue and call from story/steps/control; both steps tiers sit before combat. ctx changes from StoryScene to StoryContext. update(dt, ctx, guard) now gets the guard value from the walk's PlayerIntent. faceNearest, arm, reset, land and updateFoes stay here. Math.random at 249 (rout line) stays at the same call site. Rout-line and knocked-down default strings stay inline as engine copy.

#### `src/story/combat/index.ts`

Barrel.

Plan: Re-exports.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/story/minigames/index.ts`

Stable mini-game API for the chapters (same exports).

Plan: Re-exports. weeping, parade and rowing come from content/minigames/rhythmPresets.

Entries (1):

- `(whole file)` (barrel) from `src/story/minigames/index.ts:1-4`: **keep** · _not verified_
  It stays the chapters' API, re-exporting mini (miniGameStep), MiniGame and MiniResult (miniGame), RhythmGame, LaddersGame, TugGame, BoatGame, LetterGame and RumourGame. It must drop parade, rowing, weeping and WEEPING. The target says the barrel re-exports them from content/minigames/rhythmPresets, but that is a story -> content edge (L7 -> L8). The layer test resolves barrels, so it would fail. ch4.ts:2 must import parade and rowing from content/minigames/rhythmPresets directly.

#### `src/story/minigames/miniGame.ts`

Mini-game contract (path kept for wordGames.test).

Plan: MiniResult, MiniGame (plus render?(alpha), and destroy through destroyTree) (miniGame 7-39).

Entries (2):

- `MiniResult` (type) from `src/story/minigames/miniGame.ts:7`: **keep** · _not verified_
  tests/wordGames.test.ts:5 imports it from this path.
- `MiniGame` (class) from `src/story/minigames/miniGame.ts:13-39`: **keep** · _not verified_
  Gains render?(alpha), which StoryScene.render forwards through MiniGameStep.render; this fixes the audit's structural problem at miniGame.ts:13-39. destroy() uses core/render/dispose destroyTree ({children, context}; audit :37). The pilot parameter becomes PilotApi and ctx becomes StoryContext. w and h default to VIEW. root stays a Container that the ui/minigames views mount into. The tests' pixi mock (Container: addChild/destroy only) must still be enough for the root.

#### `src/story/minigames/miniGameStep.ts`

Hosting step. Field `game` and the metrics.minis names kept.

Plan: MiniGameStep, mini (miniGame 41-89).

Entries (2):

- `MiniGameStep` (class) from `src/story/minigames/miniGame.ts:41-82`: **move** · _not verified_
  Keeps the class name: scripts/story-smoke.mjs:42/685/701 checks debugState().step === 'MiniGameStep'. It keeps the private field `game` (story-smoke.mjs:667 reads top.current.game) and the metrics.minis and miniRetries names (playtest.mjs). It uses ctx.gameLayer, stageLayer and hud through StoryContext, and adds render(alpha) -> game.render?.(alpha).
- `mini` (function) from `src/story/minigames/miniGame.ts:84-89`: **move** · _not verified_
  The options object type duplicated at 45 and 86 becomes one MiniOptions type.

#### `src/story/minigames/miniInput.ts`

Shared press reading.

Plan: act (action 21-24).

Entries (1):

- `act` (function) from `src/story/minigames/action.ts:21-24`: **move** · _not verified_
  Shared by Ladders, Tug and Boat.

#### `src/story/minigames/ladders/laddersSim.ts`

Climb simulation in rung units, not pixels.

Plan: Falling, and the LaddersGame logic (action 93-160, 225-227).

Entries (2):

- `Falling` (interface) from `src/story/minigames/action.ts:28-33`: **move** · _not verified_
  The target wants y in rung units. Today y is screen px relative to the scrolled view; see the LaddersGame sim entry.
- `LaddersGame sim (state and update simulation)` (method-group) from `src/story/minigames/action.ts:45-53, 105-151, 153-160`: **split** as `class LaddersSim { lane, rung, slide, falling, spawnT, hitT, axeLane, axeT, climbT; step(dt, cmd: {climb, laneDelta}): LaddersEvent[]; get won() }` · _not verified_
  Keep the Math.random order: spawn jitter, then lane, then the pitch draw (only in hard mode), and the axe lane. Today the hit tests run in screen px through rungY (scroll-relative, hero at heroY - 14 ± 12), and despawn at h + 20 depends on the screen height. Converting to rung units (RUNG_PX 22) must scale STONE_SPEED, PITCH_SPEED, the 14/12 px hit box, the despawn margin and PILOT.LADDER_LOOKAHEAD (px) together. Spawns are unseeded, so playtest diffs can only compare outcomes.

#### `src/story/minigames/ladders/laddersGame.ts`

Glue between sim and view, plus the pilot (class name kept).

Plan: LaddersGame shell, pilot (action 40-91, 230-245).

Entries (1):

- `LaddersGame` (class) from `src/story/minigames/action.ts:40, 55-62, 89-104, 222-246`: **move** · _not verified_
  The glue keeps the class name: metrics.minis records 'LaddersGame:won' through constructor.name (miniGame.ts:61), and playtest.mjs strips 'Game'. It keeps rungs, hard, hidesStage, the objective strings, start and the input read (94-104, through miniInput.act). It then calls sim.step(dt, cmd), routes the sim's events to audio and notices (109, 135-136, 156-157), and does view.render(sim) in render(alpha). heroSkin (225-227) also stays here, which deviates from the target's line list: it reads ctx.state through dreamSkin (systems/campaign/costumes), and the sim should stay free of ctx. The pilot (229-245) reads sim state. Only ch5.ts:89 uses it (hard = false), so the axe-men and pitch are not reached at HEAD.

#### `src/story/minigames/tug/tugGame.ts`

Tug simulation and glue.

Plan: TugOptions, TugGame (logic 285-294, pilot 316-318).

Entries (2):

- `TugOptions` (interface) from `src/story/minigames/action.ts:250-255`: **move** · _not verified_
- `TugGame` (class) from `src/story/minigames/action.ts:262, 267, 270-271, 281-294, 312-319`: **move** · _not verified_
  Keeps the class name (metrics.minis). It holds the force/pos logic (285-294), the click sound in the glue, the result, and the pilot.

#### `src/story/minigames/boat/boatGame.ts`

Boat simulation and glue. The stage actor's bob goes through ctx.

Plan: BoatGame (logic 346-372, pilot 390-393).

Entries (1):

- `BoatGame` (class) from `src/story/minigames/action.ts:328, 331-342, 344-370, 386-394`: **move** · _not verified_
  Keeps the class name. It holds the stroke, splash, drain and swamp logic and the pilot. The default objective stays: ch4.ts:57 passes its own.

#### `src/story/minigames/rhythm/rhythmSim.ts`

Pure beat clock and judging.

Plan: WINDOW, beatAt, judge, the timing at rhythm 110-163, the decoy layout (59-63).

Entries (2):

- `WINDOW` (const) from `src/story/minigames/rhythm.ts:32`: **move** as `const WINDOW = RHYTHM.WINDOW (config/minigames)` · _not verified_
  STORY.RHYTHM moves to config/minigames RHYTHM. It is still read at import time.
- `RhythmGame sim (beat clock, layout, judging)` (method-group) from `src/story/minigames/rhythm.ts:44-51, 58-63, 110-118, 124-125, 128, 137-139, 143-145, 153-163, 189, 194`: **split** as `class RhythmSim { beatTime, hits, judged, feedback, feedbackText, lastBeatSound, layoutBeats; beatAt(k); judge(k, ok); press(side, time): 'early'|'judged'|null; missed(time); result(time) }` · _not verified_
  Math.random order (59-63): the decoy draw, then the side draw, per beat. The cue PixelText built in the same loop draws nothing, so moving it into the view's own loop keeps the order. The `feedback -= dt` at 189 is sim state, even though it sits inside today's drawing block. The pure beat maths becomes testable without pixi.

#### `src/story/minigames/rhythm/rhythmGame.ts`

Glue (class name kept).

Plan: RhythmOptions, RhythmGame shell, pilot (rhythm 93-108).

Entries (2):

- `RhythmOptions` (interface) from `src/story/minigames/rhythm.ts:17-30`: **move** · _not verified_
- `RhythmGame` (class) from `src/story/minigames/rhythm.ts:34, 53-55, 57, 87-108, 119, 123, 126, 140, 147-152`: **move** · _not verified_
  Keeps the class name (metrics.minis). The glue holds the default objective (57), start (time = -START_DELAY), the pilot and its plan (the p.random/p.gauss order is unchanged), the input read (147-152) turned into a pressed side, and the audio (119, 126, 140). It also keeps ctx.apply({commozione: WEEP_HIT}) (123); STORY.WEEP_HIT moves to config/minigames WEEPING.HIT. render(alpha) calls view.render(sim).

#### `src/story/minigames/words/wordGame.ts`

Word game base, built on ButtonList.

Plan: WordGame (words 115-154).

Entries (1):

- `WordGame` (class) from `src/story/minigames/words.ts:115, 118, 122-124, 150-154`: **move** · _not verified_
  Built on ButtonList. It keeps `picker` and tapped(), and exposes `get buttons()` over list.buttons: scripts (story-smoke.mjs:667-676) and the test read game.buttons[].id/x/y/w/h. The ctx type becomes StoryContext.

#### `src/story/minigames/words/letterGame.ts`

5.4 letter rules; now extends WordGame; its text is injected from content.

Plan: LetterGame (words 173-271). Fields buttons, picker and picks kept.

Entries (1):

- `LetterGame` (class) from `src/story/minigames/words.ts:173, 177-179, 183-185, 187, 190-193, 207-241, 261-271`: **move** as `class LetterGame extends WordGame (constructor(text: LetterText))` · _not verified_
  Keeps the class name: story-smoke.mjs:705 checks 'LetterGame'. It keeps picks, buttons (through the WordGame getter) and picker (scripts and tests). It holds the pick rules, phase, sent, the flag apply and the pilot. The letter sentence composed from picks (251) stays here as letterText(). tests/wordGames.test.ts:155-209 calls `new LetterGame()` and must pass LETTER from content/minigames/letter. If the sounds go through ctx.effects.sound, the test's ctx mock (game.audio.play) must change too.

#### `src/story/minigames/words/rumourGame.ts`

6.2 rumour rules; its text is injected from content.

Plan: RumourGame (words 294-377). Fields buttons, picker and placed kept.

Entries (1):

- `RumourGame` (class) from `src/story/minigames/words.ts:294-301, 303-327, 335-355, 366-377`: **move** · _not verified_
  Keeps the class name (story-smoke.mjs) and the field `placed` (script and test). The Math.random shuffle in the constructor (303-307) keeps its order. rebuild uses WordGame.button through ButtonList and clamps the cursor right away. Arrival, the order check and the pilot stay here.

#### `src/story/minigames/words/index.ts`

Barrel, so '../src/story/minigames/words' still resolves for wordGames.test.

Plan: Re-exports of LetterGame, RumourGame, and KeyCursor from ui/widgets/listNav.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/story/pilot/autopilot.ts`

Autopilot implementing PilotApi. The private xorshift is kept bit for bit.

Plan: PilotPolicy, NavOptions, Autopilot (story/autopilot) minus findPath; DEFAULT_POLICY built from config/debug.

Entries (3):

- `inline: autopilot URL clamps and choices` (inline) from `src/main.ts:66-71`: **move** as `PILOT_CHOICES, PILOT_ENDINGS (const arrays beside PilotPolicy)` · _corrected by verifier_
  Checked against PilotPolicy['ending'] and ['choice'] with `satisfies` in core/flow/urlParams. The current fallbacks are kept: anything other than 'alpha' becomes 'knight', and an unknown choice becomes 'first'.
  Before the correction: to `src/config/debug.ts`; action `extract-config`; newName `URL.{SKILL_RANGE [0, 1], ENDINGS ['knight', 'alpha'] (first is the default), CHOICES ['first', 'last', 'random'] (first is the default)}`.
  Verifier: These are not tuning numbers. ['first','last','random'] and ['knight','alpha'] are the value domain of PilotPolicy.choice and .ending (autopilot.ts:16-24). Declare them `as const` next to the type and derive the union from them, so urlParams can validate with .find/.includes without a config copy that can drift. The skill clamp [0, 1] is the definition of skill ('0 = clumsy, 1 = perfect') and stays inline in core/flow/urlParams. The current fallbacks are kept.
- `DEFAULT_POLICY` (const) from `src/story/autopilot.ts:26`: **move** as `DEFAULT_POLICY: PilotPolicy = { choice: AUTOPILOT.DEFAULT_POLICY.CHOICE, skill: ..., ending: ... }` · _not verified_
  Today main.ts:16/64-67 imports it as a value; in the target, core/flow/urlParams.ts does. Moving it does not shrink the bundle, because core/flow/storyFlow.ts already imports Autopilot as a value.
- `Autopilot` (class) from `src/story/autopilot.ts:51-276`: **move** · _not verified_
  Implements the PilotApi interface (engine/step) and keeps its name, because tests/wordGames.test.ts:3/210/299 calls `new Autopilot()`. random() and gauss() (74-88) stay as they are: the private xorshift is kept bit for bit, since seeded playtests depend on its sequence. beginStep, press, every, tick and tap keep driving Input.override, trigger and pushTap. ctx changes from StoryScene to StoryContext. Point comes from systems/motion/behavior and Action from core/input/types. The STORY.PILOT.\* reads (WALK_MAG, RUN_MAG, STUCK_\*, JITTER_TIME, REPATH) move with the block to config/debug PILOT. Keep an `export *` shim at story/autopilot.ts until main.ts, storyFlow and the test move.

#### `src/story/pilot/walkPilot.ts`

Walk and fight pilot strategy over a WalkSnapshot.

Plan: pilot, pilotMove, pilotFight (walk 568-650).

Entries (1):

- `WalkStep.pilot+pilotMove+pilotFight (+ reacts)` (method-group) from `src/story/walk.ts:195-196, 567-650`: **split** as `pilotWalk(dt, ctx, pl: PilotApi, snap: WalkSnapshot), pilotMove, pilotFight` · _not verified_
  WalkStep.pilot delegates and passes a WalkSnapshot: def, state, pickups, goal, fire tiles, scrambleAngle, the combat view, and the per-walk `reacts` map owned by the step. walkPilot imports only walk/types and combat/types (not walkStep), so there is no cycle. Keep the pl.random order: the hint first, then pilotFight (one draw per new windup), then navigate. The danger closure keeps map.index.

### content/ (extra: level data and prose): 35 files, 78 entries

#### `src/content/index.ts`

The one entry point the composition root imports: it assembles the StoryCatalog and the registries.

Plan: New: {chapters, findSubLevel, storyMaps, themes, speakers, lexicon, cards, levels}.

Entries: none. This is a new file (barrel or new helper) with no code moved into it.

#### `src/content/campaign/chapters/index.ts`

Chapter registry.

Plan: CHAPTERS, findSubLevel (campaign/chapters/index).

Entries (2):

- `CHAPTERS` (const) from `src/campaign/chapters/index.ts:11-12`: **move** · _not verified_
  Importers and what happens to each: story/storyFlow becomes core/flow/storyFlow and gets the chapters through content/index. scenes/couchScene becomes ui/screens/couchScene, which stops importing them and receives a ProgressSummary. main.ts:88 becomes core/flow/automation, which builds \_\_sv.storyIds() from content/index. tests/campaign.test and tests/summary.test change their path to '../src/content/campaign/chapters'. An export \* shim at src/campaign/chapters/index.ts covers the runtime importers until they move. Exception: tests/campaign.test.ts:147 and :411 readdirSync + readFileSync the folder, so they must switch to the new folder and read it recursively (ch7 becomes a directory, and readFileSync on it throws EISDIR) in the same commit as the chapter files. Leaving them on the shim folder would make the marvel test fail (awarded.size > 10). Order and the sub-level counts [6,3,4,3,5,3,9,4] are asserted. story/engine/types types theme and music as strings, so each chN should end with `satisfies ChapterDef & { theme: ThemeKey }` (ThemeKey from content/maps/themes) to keep typos a build error. No runtime cycle: chapters import only config, core/math, systems, content and the story entry points.
- `findSubLevel` (function) from `src/campaign/chapters/index.ts:14-20`: **move** · _not verified_
  Only caller: tests/campaign.test.ts:118-119. ChapterDef comes from story/engine/types. Re-exported by content/index for core/flow.

#### `src/content/campaign/chapters/ch1.ts`

Level 1 script.

Plan: heads, CH1. Colours become VOICE tokens; the visor uses walk({visor}), the gates walk({barriers}); Jack's teleport and the CLONG go through ctx facades.

Entries (2):

- `heads` (function) from `src/campaign/chapters/ch1.ts:12-17`: **move** · _not verified_
  Scene helper. It uses ctx.addActor, ctx.actor and emote, all StoryContext and StoryActor members.
- `CH1` (const) from `src/campaign/chapters/ch1.ts:19-390`: **move** · _not verified_
  Import rewrites shared by every chapter: C and STORY from config; CHAPTER_TITLES from content/campaign/titles; ChapterDef from story/engine/types; type StoryScene becomes StoryContext; PropEntity becomes PropHandle (story/engine/context); carry and dropCarried from story/steps (story/steps/carry.ts); bark from story/steps; followLeader and lullWalk from story/walk; distTo, patrol, sounder, placeObject and clang from content/campaign/vocab. Everything scripts call on ctx today (say, notice, marker, addActor, actor, actors, removeActor, player, setStage, insert, interrupt, apply, state, metrics, time, hud.setMode/setObjective) stays a StoryContext member that delegates to the facades. So chapter bodies change only at the engine-internal sites listed in these entries. Changes in CH1: lines 58 and 92, ctx.visor = ..., become ctx.effects.visor(STORY.VISOR.MAX) and ctx.effects.visor(0); the 242 audio goes into clang. 1.0 keeps greenZone: 1 and its empty script: campaign.test asserts it and core/flow plays it with GameScene. The closure state (echoes, open, bumps, bowl, cutOff, jokeT, j, ball, used) stays inside each script() so every attempt starts fresh. These stay inline as level data, per CLAUDE.md: the gate boxes (111, 207), Jack's rules (bark range 3, heads at 2, through at 3, hints at 3 and 8, gives way at 14), the pilot waypoints (161, 253-254), the joke zone and interval (268-272), Confusione's slap spawn (87), and the card seconds and dims.

#### `src/content/campaign/chapters/ch2.ts`

Level 2 script.

Plan: CH2, with the visor option and walkSpeedMul.

Entries (1):

- `CH2` (const) from `src/campaign/chapters/ch2.ts:9-245`: **move** · _not verified_
  Imports rewritten as in CH1. Line 72, ctx.visor = 0, becomes ctx.effects.visor(0). These stay as level data: the fight presets (175, 221), the sermon lull (101-115), the companion follow (161), the whisper timer and the card seconds. The card texts at 172 and 217 name the input bindings (round button, B, U, I, Q, swipes) and must change if config/input KEY_BINDINGS or the gestures change. skin('zampanoKnight') at 191 depends on that manifest key.

#### `src/content/campaign/chapters/ch3.ts`

Level 3 script.

Plan: tents, SQUARE, CH3 (CLONG through vocab.clang).

Entries (3):

- `tents` (function) from `src/campaign/chapters/ch3.ts:9`: **move** · _not verified_
  The Pickup type comes from story/walk.
- `SQUARE` (const) from `src/campaign/chapters/ch3.ts:11-12`: **move** · _not verified_
  Marker ids on the 'venice' stage (content/maps/stages/venice.ts).
- `CH3` (const) from `src/campaign/chapters/ch3.ts:14-237`: **move** · _not verified_
  Imports rewritten as in CH1; patrol, distTo and clang come from vocab. The g.sight write (197) stays through the StoryActor handle: it is actor state, not display. Math.random at 165 and 220 stays at the same call sites (RNG order; popups only). These stay as level data: the bell interval and position, the weeping lull (range 2.5, need 2, +5 commozione), the tears interval (0.5 s, 50%), the guard patrol (1, 1.2) and sight (3, 0.5), the overhear rule (radius 1.8, 5 s, 0.8/s), and the card seconds. npm run playtest -- --from 3.1 --to 3.4 covers the follow with caught: 'restart'.

#### `src/content/campaign/chapters/ch4.ts`

Level 4 script.

Plan: CH4 (audio through ctx.effects.sound).

Entries (1):

- `CH4` (const) from `src/campaign/chapters/ch4.ts:10-123`: **move** · _not verified_
  mini and BoatGame come from story/minigames. parade and rowing are imported from content/minigames/rhythmPresets, not through story/minigames: a story barrel re-exporting content would be a forbidden story-to-content edge. BoatGame's bob actor goes through ctx. These stay as level data: Watson's follow (1.2, 2.6, 0.8), the mini-game rewards, the bucket offsets and the card seconds. The audit's call sites here (40, 57, 117) are fixed inside the mini-games, not in this file.

#### `src/content/campaign/chapters/ch5.ts`

Level 5 script.

Plan: CH5 (actionCompletes instead of survive 1e9; LetterGame(LETTER)).

Entries (1):

- `CH5` (const) from `src/campaign/chapters/ch5.ts:12-263`: **move** · _not verified_
  dreamSkin comes from systems/campaign/costumes. STORY.COST.SPEAK_UP becomes CAMPAIGN.COST.SPEAK_UP when STORY is split into config/campaign; update this read in that commit. LaddersGame, LetterGame and mini come from story/minigames. LetterGame gets its text injected: new LetterGame(LETTER), with LETTER from content/minigames/letter. The 5.2 steady walk reads ctx.player.vx/vy, read-only through the player handle. These stay as level data: ladder height 16, the steady walk (3 s, 0.3), the cloth interval 1.4 s, Aleaume's follow, the brawl flail and fight numbers, the brawl shout interval and the card seconds. '#ff6a6a' (125) appears once, so it stays inline as scene data (CONFIG PLAN: only colours repeated across scenes become tokens). Math.random at 168 stays at its call site.

#### `src/content/campaign/chapters/ch6.ts`

Level 6 script.

Plan: NAME_TRAIL, CH6 (RumourGame(RUMOUR)).

Entries (2):

- `NAME_TRAIL` (const) from `src/campaign/chapters/ch6.ts:11-17`: **move** · _not verified_
  The Point type comes from systems/motion/behavior.
- `CH6` (const) from `src/campaign/chapters/ch6.ts:19-166`: **move** · _not verified_
  RumourGame gets its text injected: new RumourGame(RUMOUR), with RUMOUR from content/minigames/rumour. STORY.COST.SHARE becomes CAMPAIGN.COST.SHARE when STORY is split. The comradeship flag set at 68 and 77 is read in ch7 7.7 (branch at 400-418); its meaning does not change, so no save migration. `let next` (96) is closure state, reset by every script() call. Speeds, the emote length and the card seconds stay as level data.

#### `src/content/campaign/chapters/ch7/index.ts`

CH7 metadata, assembling 7.1-7.9 (the import './ch7' resolves here).

Plan: CH7 meta (ch7 32-41).

Entries (1):

- `CH7` (const) from `src/campaign/chapters/ch7.ts:25-41, 42, 563-564`: **move** as `CH7 = { ...meta (33-41), subLevels: [...ARRIVAL, MARCH, ...CITY, ...OATH] }` · _not verified_
  Do `git mv ch7.ts ch7/index.ts` first, so './ch7' in chapters/index resolves unchanged. The order must stay 7.1 to 7.9: campaign.test counts 9 sub-levels, and storyFlow's next-scene logic follows the array order. tests/campaign.test.ts reads the chapters folder with readdirSync + readFileSync; a ch7 directory makes readFileSync throw EISDIR, so both scans (the marvels at 147 and the period words at 411) must walk the folder recursively in the same commit.

#### `src/content/campaign/chapters/ch7/markers.ts`

City markers.

Plan: COLUMN, HERCULES, DOORWAY (ch7 21-23).

Entries (3):

- `COLUMN` (const) from `src/campaign/chapters/ch7.ts:20-21`: **move** · _not verified_
  Marker '5' on the 'city' stage. Used by city.ts (7.4) and oath.ts (7.9).
- `HERCULES` (const) from `src/campaign/chapters/ch7.ts:22`: **move** · _not verified_
  Marker '1' on 'city'. Used by 7.4 and 7.9.
- `DOORWAY` (const) from `src/campaign/chapters/ch7.ts:23`: **move** · _not verified_
  Marker '9' on 'city'. Used by 7.4, 7.5 and 7.8.

#### `src/content/campaign/chapters/ch7/arrival.ts`

Sub-levels 7.1-7.2.

Plan: ch7 44-142 (bleach through ctx.effects; the banner follows the Doge through an entity option).

Entries (1):

- `CH7.subLevels['7.1'+'7.2']` (sub-levels) from `src/campaign/chapters/ch7.ts:43-144`: **split** as `export const ARRIVAL: readonly SubLevelDef[]` · _not verified_
  7.1, line 53: ctx.bleach = -0.6 becomes ctx.effects.bleach(-0.6). The value stays as scene data; the effects layer (ui/effects/screenOverlay) owns and destroys the filter (audit ch7.ts:53). TugGame comes from story/minigames. 7.2: the banner (a PropHandle) is placed with a follow option instead of being moved every step (next entry). The fight numbers, survive 18 and the varangian spawns stay as level data.

#### `src/content/campaign/chapters/ch7/march.ts`

Sub-level 7.3.

Plan: ch7 146-252 (along from core/math; teleport and camera snap through ctx).

Entries (1):

- `CH7.subLevels['7.3']` (sub-level) from `src/campaign/chapters/ch7.ts:145-253`: **split** as `export const MARCH: SubLevelDef` · _not verified_
  along comes from core/math/geometry and STORY.SHOULDER from config. In reset (159-167): the teleports go through ctx.player.setPosition and ctx.actor('sbrim').setPosition; ctx.world!.snapCamera() becomes ctx.effects.snapCamera(); ctx.metrics.restarts++ stays. Playtest reads metrics.restarts, nerveBroken and ran. These stay as level data: the side tolerance 3, the warning every 2.4 s, the cues at 0.15, 0.25 and 0.45, the window (2.2 s, first 1.5), done at 0.95, and the follows. A reusable 'keep level with an actor' walk objective, shared with 8.3, is a later option and not part of this move.

#### `src/content/campaign/chapters/ch7/city.ts`

Sub-levels 7.4-7.6.

Plan: ch7 255-368 (fog and tint through ctx).

Entries (1):

- `CH7.subLevels['7.4'..'7.6']` (sub-levels) from `src/campaign/chapters/ch7.ts:254-370`: **split** as `export const CITY: readonly SubLevelDef[]` · _not verified_
  7.5: the teleport at 312 goes through ctx.player.setPosition and 313 becomes ctx.effects.snapCamera(). ctx.fog = STORY.SMOKE (314) becomes ctx.effects.fog(STORY.SMOKE), and 324 becomes ctx.effects.fog(0). The fire walk (322) keeps its walk option; the engine changes fire to a Set of tiles with pooled Flames (audit ch7.ts:322). 7.6: runCheck reads ctx.player.running and writes ctx.metrics.ran. u.sprite.tint = 0xffd890 (362) becomes ctx.effects.tint('usurper', TINTS.USURPER), which sets Actor.baseTint and is applied in renderView. DOORWAY, HERCULES and COLUMN come from ./markers.

#### `src/content/campaign/chapters/ch7/oath.ts`

Sub-levels 7.7-7.9.

Plan: ch7 372-561 (the page turn through ctx.effects.transition).

Entries (2):

- `CH7.subLevels['7.7'..'7.9']` (sub-levels) from `src/campaign/chapters/ch7.ts:371-562`: **split** as `export const OATH: readonly SubLevelDef[]` · _not verified_
  7.7: rattle = sounder(..., VOICE.RATTLE) from vocab; the comradeship branch is unchanged. 7.8: ctx.game.transition.play(null, 0.6, 1) (449) becomes ctx.effects.transition(0.6, 1), with the timing kept as scene data, and 461 becomes ctx.effects.snapCamera(). spend comes from systems/campaign/rules. STORY.COST.OATH_BARK becomes CAMPAIGN.COST.OATH_BARK when STORY is split. The oath flag values ('undecided', 'enforced', 'silent') are read by ch8 and the endings; their meaning does not change, so no migration. pilotActs reads p.policy.ending through PilotApi. 7.9 uses HERCULES and COLUMN from ./markers.
- `TugGame constructor default options` (const) from `src/story/minigames/action.ts:269`: **split** · _not verified_
  The default {objective 'HOLD CONFUSIONE BACK BY A HIND LEG', label, friend 'confusioneKnight'} is 7.7 prose, used only by ch7.ts:397 `new TugGame()`. That call passes it explicitly, and the parameter becomes required. 7.1 (ch7.ts:70) already passes its own.

#### `src/content/campaign/chapters/ch8.ts`

Level 8 script.

Plan: CH8; bursts through ctx.effects.burst (no gridToScreen), audio through ctx.effects.sound. STUDY_SPOTS stays here as scene data.

Entries (2):

- `STUDY_SPOTS` (const) from `src/campaign/chapters/ch8.ts:17-23`: **move** · _not verified_
  Scene data (positions on the 'study' stage); it stays with 8.2, as the target says. Its `marvel: '...'` keys also match the campaign.test scan, and all four are in KNOWN_MARVELS.
- `CH8` (const) from `src/campaign/chapters/ch8.ts:25-303`: **move** · _not verified_
  Imports: gridToScreen goes away (no iso maths in content). homeObject from content/campaign/marvels; graceTier from systems/campaign/rules; Point from systems/motion/behavior; PropEntity becomes PropHandle; distTo, placeObject and sounder from vocab. ctx.game.audio.play('drink') (233) and play('ball') (280) become ctx.effects.sound(...). ctx.player.startAction (232, 278, 293) stays on the player handle. The 8.3 flinch reads player vx/vy, read-only. The scene reads saved state (book.marvels, flags.oath, lamp, vanguard); meanings do not change, so no migration. These stay as level data: the knock every 1.3 s, Jerusalem's start, hop and reach, its label every 1.6 s, the friends' side (0.9) and follow (1, 3.6), the flinch thresholds, the act radii, the animation seconds and the card seconds. The 8.3 snap (flash plus the 'SUPER VILLAINED' card) stays as scene steps.

#### `src/content/campaign/vocab.ts`

Script shortcuts.

Plan: at, patrol, wander, near, distTo, bark, sounder, placeObject (through ctx.stage.place) (helpers 13-40, 253-272); clang (the copies at ch1 243, ch3 57, ch4 79).

Entries (10):

- `CH1.subLevels['1.3'] bowl clang` (step-body) from `src/campaign/chapters/ch1.ts:240-244`: **split** as `clang(ctx, at: Point, sound = true): ctx.effects.sound('hit') then ctx.say('CLONG.', at, VOICE.CLONG)` · _not verified_
  New vocab helper that replaces the three copies (ch1 242-243, ch3 57, ch4 78-79). The bowl move, bowl.setPosition(14.6, 2.4), stays in the script.
- `CH3.subLevels['3.1'] harbor bell` (walk-callbacks) from `src/campaign/chapters/ch3.ts:53-59`: **split** as `clang(ctx, { x: 14.5, y: 3.5 }, false)` · _not verified_
  The bell has no sound today, only the popup, hence sound = false. The 1.6 s timer in w.data.t stays in the script. sounder() is not used: it fires at t = 0 instead of after 1.6 s.
- `CH4.subLevels['4.2'] bucket clang` (step-body) from `src/campaign/chapters/ch4.ts:76-80`: **split** as `clang(c, { x: b.gx, y: b.gy })` · _not verified_
  b.setPosition(b.gx + 1.6, b.gy + 0.8) stays in the script; b is a PropHandle. c.game.audio.play('hit') leaves content: the audit noted that content reached the audio service directly.
- `at` (function) from `src/campaign/chapters/helpers.ts:13-15`: **move** · _not verified_
  Script vocabulary. ctx is typed as StoryContext (story/engine/context); ctx.marker stays a StoryContext member. Its only caller is patrol.
- `patrol` (function) from `src/campaign/chapters/helpers.ts:17-19`: **move** · _not verified_
  Returns Behavior, typed from systems/motion/behavior (content may import it). The default speed and pause come from STORY.PATROL (see the inline entry). Caller: ch3 3.4, the Lido guard.
- `wander` (function) from `src/campaign/chapters/helpers.ts:21-23`: **move** · _not verified_
  No caller at HEAD: grep '\bwander(' over src, tests and scripts finds only this declaration. The target keeps it in vocab. It is a deletion candidate for the cleanup step.
- `near` (function) from `src/campaign/chapters/helpers.ts:25-29`: **move** · _not verified_
  No caller at HEAD: grep '[^a-zA-Z_.]near(' finds only this declaration. It reads ctx.actors and ctx.player, both StoryContext members. Deletion candidate.
- `distTo` (function) from `src/campaign/chapters/helpers.ts:31-33`: **move** · _not verified_
  Used by ch1, ch3, ch5 and ch8, and today also by lullWalk (202, 207). lullWalk moves to story/, which may not import content, so lull.ts measures with distance() from core/math/geometry instead. vocab.distTo stays a one-line wrapper for the chapters.
- `sounder` (function) from `src/campaign/chapters/helpers.ts:250-261`: **move** · _not verified_
  Says through ctx.say (a StoryContext member). The default colour is C.cyan from config/colors; the default interval STORY.HEAR_EVERY is already config. One closure timer per call. Callers: ch7 7.7 (the rattle) and ch8 8.1 (the knock).
- `placeObject` (function) from `src/campaign/chapters/helpers.ts:263-272`: **split** as `placeObject(ctx, key: PlaceKey, where, tint?, variant = 0): PropHandle, delegating to ctx.stage.place(key, where, { baseTint: tint, variant })` · _not verified_
  Keeps the call shape used by ch1, ch4, ch7 and ch8. It returns a PropHandle {gx, gy, setPosition} from story/engine/context, so the chapters stop typing bowl, ball and banner as PropEntity (content may not import entities). PlaceKey is a SpriteKey re-export from story/engine/context, because content may not import core/assets/manifest.

#### `src/content/campaign/titles.ts`

Chapter titles.

Plan: CHAPTER_TITLES.

Entries (1):

- `CHAPTER_TITLES` (const) from `src/campaign/titles.ts:2-11`: **move** · _verified_
  Content text. The chapters' `import ... from '../titles'` still resolves from content/campaign/chapters/chN.ts. Only ch7 (now a folder) needs '../../titles'. tests/campaign.test.ts path changes.
  Verifier: Its only importers are the eight chapters and tests/campaign.test.ts.

#### `src/content/campaign/marvels.ts`

One marvel catalogue.

Plan: HOME_OBJECTS, homeObject, KNOWN_MARVELS (campaign/home); SHIP_MARVELS, CITY_MARVELS (ch8 14-15).

Entries (5):

- `SHIP_MARVELS` (const) from `src/campaign/chapters/ch8.ts:14`: **move** · _not verified_
  One marvel catalogue, next to HOME_OBJECTS, homeObject and KNOWN_MARVELS from campaign/home. Best derived from a group field per marvel (ships or city), so renaming a marvel cannot silently break the 8.2 drawing locks. Keep the chapters' pickups writing marvel names as literals: tests/campaign.test.ts:147-160 scans chapter sources with /marvel: '...'/ and expects more than 10 names, including THE PALACE OF THE LION'S MOUTH and AN EMPTY PEDESTAL.
- `CITY_MARVELS` (const) from `src/campaign/chapters/ch8.ts:15`: **move** · _not verified_
  Same as SHIP_MARVELS.
- `HOME_OBJECTS` (const) from `src/campaign/home.ts:6-21`: **move** · _verified_
  Private table. Level data and prose, not config. Its keys must match the marvel strings that chapter scripts award through Effects.marvel. ch8's SHIP_MARVELS and CITY_MARVELS join it in the same file (the 'one marvel catalogue').
- `homeObject` (function) from `src/campaign/home.ts:23-25`: **move** · _verified_
  Importers: ch8 (content, same layer, so legal) and tests/campaign.test.ts (path becomes '../src/content/campaign/marvels'). The 'A SOUVENIR OF' fallback is game text and stays inline.
  Verifier: Checked: the only importers are ch8.ts:8 (its import path changes from '../home' to '../marvels') and tests/campaign.test.ts:4.
- `KNOWN_MARVELS` (const) from `src/campaign/home.ts:28`: **move** · _verified_
  Only tests/campaign.test.ts reads it. The test import path changes in the same commit.

#### `src/content/campaign/endings.ts`

Ending prose.

Plan: endingNotes (state 207-226), now composing the sentences over systems endingTiers; the KNIGHT and WITNESS paragraphs (storyFlow 313-314).

Entries (2):

- `endingNotes` (function) from `src/campaign/state.ts:207-226`: **split** as `endingNotes(state): string[], which picks the Grace and Standing sentences from endingTiers(state)` · _verified_
  The six sentences are story prose, so they go to content. It stays exported under the same name. core/flow/storyFlow (the composition root) calls it, and tests/campaign.test.ts imports it from '../src/content/campaign/endings'. STORY.STANDING becomes CAMPAIGN.STANDING (test line 71).
  Verifier: Its only src caller is storyFlow.ts:322, which moves to core/flow (L9 to L8, legal).
- `StoryFlow.showEnding` (ending prose) from `src/story/storyFlow.ts:311-314`: **split** as `ENDING_TEXT: Record<Ending, string>` · _not verified_
  It joins endingNotes, which moves to the same file.

#### `src/content/campaign/cards.ts`

Card specs for the story flow.

Plan: The texts and scales of showNotice, showSub, finishSub and showEnding (storyFlow 86-330).

Entries (4):

- `StoryFlow.showNotice` (card content) from `src/story/storyFlow.ts:95-104`: **split** as `rewrittenNoticeCard(): { bg, lines }` · _not verified_
  The texts, scales and gaps are content (level data). The flow keeps the save, the music and the scene push (86-93, 105-108).
- `StoryFlow.showSub` (card content) from `src/story/storyFlow.ts:183, 188-195, 204-211, 220-226`: **split** as `greenZoneCard(ch, sub, replay), subLevelCard(ch, sub, replay), levelCard(ch)` · _not verified_
  Lines that use withNames get `names: true` instead, because content may not import ui. storyFlow applies withNames(text, color, NAMES).
- `StoryFlow.finishSub` (card content) from `src/story/storyFlow.ts:280-286`: **split** as `professorCard(ch): { bg, lines }` · _not verified_
  The commit, save and navigation logic (256-275, 287-294) stays in StoryFlow.
- `StoryFlow.showEnding` (card content) from `src/story/storyFlow.ts:317-326`: **split** as `endingCard(e: Ending, state, notes: string[]): { bg, lines }` · _not verified_
  ending() comes from systems/campaign/rules and endingNotes from content/campaign/endings. The autopilot log push (310) stays in the flow.

#### `src/content/campaign/speakers.ts`

Speaker table.

Plan: SPEAKERS, speakerOf (story/ui 13-57).

Entries (2):

- `SPEAKERS` (const Record) from `src/story/ui.ts:13-53`: **move** · _not verified_
  It reaches the engine and DialogueBox through StoryCatalog.speakerOf. Per-speaker colours are content data and stay here, except those repeated elsewhere, which become VOICE tokens (next entry). The portrait type `CharacterKey | 'professor'` comes from core/assets/manifest. In the same commit, the tests/pixelCast.test.ts:4 import changes to '../src/content/campaign/speakers'.
- `speakerOf` (function) from `src/story/ui.ts:55-57`: **move** · _not verified_
  It is exposed as StoryCatalog.speakerOf. steps.ts no longer imports it, which removes the story-to-view edge.

#### `src/content/campaign/lexicon.ts`

Name and period-word lists (sources: docs/STORY-SOURCES.md).

Plan: NAMES, OLD_WORDS (story/names 9-67).

Entries (2):

- `NAMES` (const ReadonlySet) from `src/story/names.ts:9-37`: **move** · _not verified_
  It reaches ui only as a parameter: through the StoryCatalog for the story, and imported directly by core/flow/storyFlow for card spans. tests/summary.test.ts:88 must pass it to withNames.
- `OLD_WORDS` (const string[]) from `src/story/names.ts:44-67`: **move** · _not verified_
  Its source is docs/STORY-SOURCES.md ('Period words'). The dynamic import at tests/campaign.test.ts:416 changes to '../src/content/campaign/lexicon'.

#### `src/content/maps/storyMaps.ts`

The assembled stage registry.

Plan: StoryMap, STORY_MAPS, MapKey (story/maps 123-128, 150, 710).

Entries (3):

- `StoryMap` (interface) from `src/story/maps.ts:123-128`: **move** · _not verified_
  The engine cannot import content, so story/engine/context.ts declares its own structural map shape for the StoryCatalog: {theme: string; base: string; rows: readonly string[]}.
- `STORY_MAPS` (const) from `src/story/maps.ts:150-153, 708`: **move** as `STORY_MAPS = { jerusalem: CHAMPAGNE.jerusalem, study: REALITY.study, ... } satisfies Record<string, StoryMap>` · _not verified_
  List the keys explicitly in today's order: jerusalem, study, lawn, darkwood, fair, venice, lido, ship, interior, island, zara, winter, road, palace, desert, city, breach, shattered, neighborhood, field. Object.entries order in campaign.test.ts:139 and topology.test.ts:27 then stays the same. Apply `satisfies` once, here. The stage files export `as const` objects and do not import StoryMap, which avoids a storyMaps &lt;-> stages cycle. tests/topology.test.ts:3 changes its import path, and CLAUDE.md 'story/maps.ts (STORY_MAPS)' becomes content/maps. Keep an `export *` shim at story/maps.ts for one step.
- `MapKey` (type) from `src/story/maps.ts:710`: **move** · _not verified_
  steps.ts:9/247 stage(map: MapKey) and storyScene.ts:18/57/169 setStage(key: MapKey) cannot keep this type, because the engine never imports content. The engine takes a string checked against StoryCatalog.maps, and an unknown key throws. To keep compile-time checks of stage names in scripts, content/campaign/vocab.ts can export a typed wrapper `stage(key: MapKey, ...)` over story/steps.stage.

#### `src/content/maps/themes.ts`

Chapter palettes.

Plan: ThemeKey, G, theme, THEMES (story/maps 9-121).

Entries (4):

- `ThemeKey` (type) from `src/story/maps.ts:9-24`: **move** · _not verified_
  campaign/types.ts:2 no longer imports it. story/engine/types.ts types `theme` as a string, and content narrows it to ThemeKey.
- `G` (const) from `src/story/maps.ts:26`: **move** · _not verified_
  Evaluated at import time from LEVEL_1 in content/levels/greenZone. That is a sideways content import, which is legal.
- `theme` (function) from `src/story/maps.ts:28-30`: **move** · _not verified_
- `THEMES` (const) from `src/story/maps.ts:32-121`: **move** · _not verified_
  The hex triples are level and art data: they do not go to config. Palette comes from systems/world/level. The stage reaches THEMES through StoryCatalog.themes, and core/assets/environment/palettes.paletteForChapter keeps receiving it as an argument. tests/campaign.test.ts:9 and tests/environmentAssets.test.ts:3 change their import path.

#### `src/content/maps/stages/reality.ts`

Reality stages (levels 1 and 8).

Plan: study, neighborhood, lawn (unused at HEAD).

Entries (1):

- `STORY_MAPS.study+lawn+neighborhood` (const-entries) from `src/story/maps.ts:179-230, 654-673`: **split** · _not verified_
  No chapter stages lawn. tests/topology.test.ts:43 (layeredMaps) still reads it, so move it; do not delete it.

#### `src/content/maps/stages/champagne.ts`

Level 2 stages.

Plan: jerusalem, fair, road, darkwood (unused at HEAD).

Entries (1):

- `STORY_MAPS.jerusalem+darkwood+fair+road` (const-entries) from `src/story/maps.ts:151-178, 231-290, 465-500`: **split** · _not verified_
  darkwood is referenced only by tests/topology.test.ts:43, so keep it.

#### `src/content/maps/stages/venice.ts`

Level 3 stages.

Plan: venice, lido.

Entries (1):

- `STORY_MAPS.venice+lido` (const-entries) from `src/story/maps.ts:291-344`: **split** · _not verified_
  lido calls structureStoryRows from systems/world/asciiMap.

#### `src/content/maps/stages/sea.ts`

Sea and Corfu stages.

Plan: ship, island, interior (unused at HEAD).

Entries (1):

- `STORY_MAPS.ship+interior+island` (const-entries) from `src/story/maps.ts:345-412`: **split** · _not verified_
  Grep finds no `interior` in src/campaign or tests: it is unused at HEAD. Moved as is, as the target says.

#### `src/content/maps/stages/zara.ts`

Level 5-6 stages.

Plan: zara, winter.

Entries (1):

- `STORY_MAPS.zara+winter` (const-entries) from `src/story/maps.ts:413-464`: **split** · _not verified_

#### `src/content/maps/stages/constantinople.ts`

Level 7-8 stages.

Plan: palace, city, breach, field, shattered, desert (unused at HEAD).

Entries (1):

- `STORY_MAPS.palace+desert+city+breach+shattered+field` (const-entries) from `src/story/maps.ts:501-653, 674-707`: **split** · _not verified_
  Grep finds `desert` nowhere in src/campaign or tests: it is unused at HEAD. Moved as is.

#### `src/content/levels/greenZone.ts`

Level data for 1.0.

Plan: GREEN_ZONE_ROAD, buildGreenZoneRows, LEVEL_1 (levels/level1).

Entries (4):

- `GREEN_ZONE_ROAD` (const) from `src/levels/level1.ts:13-28`: **move** · _verified_
  Imported by tests/systems.test.ts:3 and tests/balance.test.ts:3 from '../src/levels/level1': update both (or keep a shim at levels/level1.ts).
- `buildGreenZoneRows` (function) from `src/levels/level1.ts:35-198`: **move** · _verified_
  tests/topology.test.ts:2 imports it. Its local paint/noise helpers stay inside it (level data, not config).
- `inline: Green Zone level data (paint radii, ellipses, noise thresholds, landmarks, seed, parTime, palette hexes, spawns, waves, ambush lines)` (inline) from `src/levels/level1.ts:36-197, 205-245`: **move** · _verified_
  Level data stays with the level, not config (CLAUDE.md: per-scene values are level data; decision: the LEVEL_1 palette stays in content).
- `LEVEL_1` (const) from `src/levels/level1.ts:201-248`: **move** · _verified_
  Import-time side effect kept: source.rows = buildGreenZoneRows() runs at module load (a 96x96 paint plus a BFS). Making it lazy would change the LevelSource shape that systems/world/asciiMap.loadLevel and the tests read, so leave it. story/maps.ts:1 (which becomes content/maps/storyMaps) imports it sideways inside content. Tests: ambush, systems, balance, topology.

#### `src/content/levels/index.ts`

Arcade level registry.

Plan: LEVELS, levelByNumber.

Entries (2):

- `LEVELS` (const) from `src/levels/index.ts:5`: **move** · _verified_
  CARE: the directory imports '../levels' (scenes/flow.ts:5, scenes/couchScene.ts:9, main.ts:6 './levels', tests/level.test.ts:2 '../src/levels') resolve to src/levels/index.ts. Keep it as `export * from '../content/levels'` until they move; then core/flow imports content (L9 to L8). couchScene (ui) may not import content, so it receives the LevelRecord instead. tests/level.test.ts changes to '../src/content/levels'.
- `levelByNumber` (function) from `src/levels/index.ts:7-9`: **move** · _verified_
  Callers: core/flow/urlParams (?level=, from main.ts) and core/flow/walkFlow.

#### `src/content/minigames/rhythmPresets.ts`

Beat game presets.

Plan: WEEPING, weeping (unused at HEAD), parade, rowing (rhythm 199-234).

Entries (4):

- `WEEPING` (const) from `src/story/minigames/rhythm.ts:199`: **move** · _not verified_
  Unused at HEAD: grep finds it only in minigames/index.ts:2. The target keeps it.
- `weeping` (function) from `src/story/minigames/rhythm.ts:201-204`: **move** · _not verified_
  Unused at HEAD (only re-exported by minigames/index.ts:2). It reads config/minigames WEEPING, the former STORY.WEEPING.
- `parade` (function) from `src/story/minigames/rhythm.ts:207-218`: **move** · _not verified_
  ch4.ts:2 imports it from here, not through the story barrel. It reads config/minigames PARADE.
- `rowing` (function) from `src/story/minigames/rhythm.ts:221-234`: **move** · _not verified_
  The bpm offset PARADE.BPM - 8 stays in the preset as level data.

#### `src/content/minigames/letter.ts`

5.4 letter text.

Plan: SLOTS, NAMES_THE_DEBT and the letter strings (words 159-166, 186-257).

Entries (3):

- `SLOTS` (const) from `src/story/minigames/words.ts:159-163`: **move** · _not verified_
  It becomes part of a LETTER text object injected into new LetterGame(LETTER) by ch5.ts:224.
- `NAMES_THE_DEBT` (const) from `src/story/minigames/words.ts:166`: **move** · _not verified_
  Goes into the LETTER object; the 'named' / 'necessity' flag rule stays in letterGame and reads it from there.
- `LetterGame strings` (inline) from `src/story/minigames/words.ts:186, 212, 215-216, 257`: **split** as `LETTER {objective, send, again, accept, answer(sent)}` · _not verified_

#### `src/content/minigames/rumour.ts`

6.2 rumour text.

Plan: RUMOUR, GARBLE and the strings (words 275-364).

Entries (3):

- `RUMOUR` (const) from `src/story/minigames/words.ts:275-282`: **move** · _not verified_
  Part of the RUMOUR_TEXT object injected into new RumourGame(...) by ch6.ts:109. tests/wordGames.test.ts:236-299 must pass it.
- `GARBLE` (const) from `src/story/minigames/words.ts:284-291`: **move** · _not verified_
- `RumourGame strings` (inline) from `src/story/minigames/words.ts:302, 351, 361, 364`: **split** as `RUMOUR_TEXT {objective, garbled, header, placeholder, pieces: RUMOUR, garble: GARBLE}` · _not verified_

### Entry point: 1 files, 1 entries

#### `src/main.ts`

Vite entry.

Plan: Only the boot() call and the #boot error handler (main 99-103).

Entries (1):

- `inline: #boot error report and boot() call` (inline) from `src/main.ts:99-103`: **keep** · _verified_
  main.ts shrinks to `import { boot } from './core/flow/bootstrap'` plus this catch. index.html keeps loading src/main.ts.

## 13. Code to delete

- `CLEAR` (const) from `src/assets/placeholders/pixel.ts:25`: **delete** · _not verified_
  Dead: `grep -rnw CLEAR src tests scripts` matches only its declaration (pixel.ts:25). The target drops it.
- `PixelBuffer.flippedX+silhouette` from `src/assets/placeholders/pixel.ts:146-157`: **delete** · _not verified_
  Dead: `grep -rn '\.flippedX\|\.silhouette' src tests scripts` finds no call. The only matches are the declarations at pixel.ts:146 and :153. The target drops them.
- `PLAYER.BOB_AMOUNT` (const) from `src/config.ts:54-55`: **delete** · _verified_
  Dead: `grep -rnw BOB_AMOUNT src tests scripts` finds only src/config.ts:55. Zampano's squash uses the inline 240/14/0.35, which become PLAYER_MOTION.SQUASH. Remove it in step 2 with the other PLAYER view splits, not in the verbatim step 1.
- `Game.overlayLayer` (method) from `src/core/game.ts:16-17, 33`: **delete** · _corrected by verifier_
  Dead: `grep -rn overlayLayer src scripts tests` finds only game.ts:17 and :33 (an empty container added to the stage). If the transition should get its own render group, create it with renderLayer('transition', {group: true}) and pass it to ScreenTransition instead of app.stage.
  Verifier: Dead, as stated. Drop the suggestion to give ScreenTransition its own layer: ScreenTransition puts its GlitchFilter and filterArea on the container it gets (transition.ts:29, :51, :71) to glitch the whole screen. Given an empty sibling layer, it would glitch nothing. It must keep receiving app.stage.
- `nextId` (let) from `src/entities/entity.ts:8`: **delete** · _verified_
  Replaced by `get id() { return this.uid }` (pixi.js 8.23 Container.uid: readonly, assigned at construction, monotonic). grep -rn nextId src tests scripts: only entity.ts:8 and 15. The depth tie-break order is unchanged because uid also follows creation order. CARE: test mocks of Container (sbrimbrulonActor) must provide uid, or compareDepth gets NaN.
- `GlitchFilter.active` (getter) from `src/fx/glitchFilter.ts:139-143`: **delete** · _verified_
  Dead: grep '\.active' over src/ finds no read on a GlitchFilter. transition.ts:51/71 and gameScene.ts:214-218 attach and detach the filter themselves. Its 0.001/0.5 thresholds go with it.
  Verifier: Dead: the `.active` reads at gameScene 214 and 220 are GameScene.active and pug.active. The getter is 140-143 (139 is its doc comment).
- `Particles.clear` (method) from `src/fx/particles.ts:98-104`: **delete** · _verified_
  Dead: grep 'particles.clear' over src/ finds nothing (only Popups.clear is called, gameFx:244). destroy() takes over freeing the pool.
  Verifier: Dead: no caller of particles.clear in src.
- `tileCenterScreen` (function) from `src/iso/projection.ts:33-35`: **delete** · _verified_
  Dead: grep -rn tileCenterScreen src tests scripts finds only its definition (projection.ts:33).
- `StoryScene.locked` (field) from `src/story/storyScene.ts:67-68`: **delete** · _not verified_
  Dead code. `grep -rn -E "ctx\.locked|scene\.locked|this\.locked" src scripts tests` returns nothing. The only `.locked` hits are Option.locked and ChoiceView.locked (steps.ts:84-165, ui.ts:169-176). Its doc comment ('Seconds the scene has been paused') also contradicts its boolean type.
- `DialogueBox.hasChoices` (getter) from `src/story/ui.ts:194-196`: **delete** · _not verified_
  Dead code. `grep -rn hasChoices src tests scripts` finds only its own declaration at ui.ts:194.
- `WalkStep.update (dead map local)` (statement) from `src/story/walk.ts:266, 335`: **delete** · _not verified_
  `const map = world.map` (266) is read only by `void map;` (335). A grep of update 264-337 finds no other use of `map`.
- `TITLE_GIF_URL` (const) from `src/ui/titleAnim.ts:32`: **delete** · _corrected by verifier_
  An unused export: grep finds only the declaration at titleAnim.ts:32, and the module uses gifUrl directly. Drop the export at cleanup.
  Before the correction: action `move`.
  Verifier: Unused export: grep finds no reader in src, tests or scripts, and the module uses gifUrl directly. Drop it in the move commit instead of carrying it to cleanup.
- `World.spriteOf` (method) from `src/world/world.ts:196-198`: **delete** · _verified_
  Dead: `grep -rn spriteOf src tests scripts` finds only its definition (world.ts:196).

## 14. Where each current file goes

For each current file, the new files its code moves to (number of entries in brackets).

| Current file | Lines | Goes to |
|---|---:|---|
| `src/assets/animationTiming.ts` | 23 | `src/core/assets/manifest/animations.ts` (2) |
| `src/assets/build.ts` | 242 | `src/core/assets/characterTextures.ts` (7), `src/core/assets/spriteTextures.ts` (5), `src/core/assets/levelTextures.ts` (5), `src/core/assets/placeholders/registry.ts` (2), `src/core/flow/bootstrap.ts` (1), `src/core/assets/manifest/names.ts` (1), `src/core/assets/manifest/sprites.ts` (1), `src/core/assets/atlas.ts` (1), `src/config/art.ts` (1) |
| `src/assets/environment.ts` | 319 | `src/core/assets/environment/banks.ts` (14), `src/core/assets/environment/manifest.ts` (11), `src/core/assets/environment/diagnostics.ts` (3), `src/core/assets/environment/floorDesigns.ts` (3), `src/core/assets/environment/palettes.ts` (2), `src/config/display.ts` (1) |
| `src/assets/manifest.ts` | 387 | `src/core/assets/manifest/characters.ts` (9), `src/core/assets/manifest/animations.ts` (7), `src/systems/campaign/costumes.ts` (7), `src/core/assets/manifest/sprites.ts` (5), `src/core/assets/manifest/names.ts` (2) |
| `src/assets/placeholders/cast.ts` | 145 | `src/core/assets/placeholders/castSpecs.ts` (6) |
| `src/assets/placeholders/critters.ts` | 610 | `src/core/assets/placeholders/critters/spec.ts` (4), `src/core/assets/placeholders/critters/pose.ts` (3), `src/core/assets/placeholders/critters/body.ts` (3), `src/core/assets/placeholders/critters/frame.ts` (2), `src/core/assets/placeholders/critters/draw.ts` (2), `src/core/assets/placeholders/critters/head.ts` (2), `src/core/assets/placeholders/critters/hats.ts` (1) |
| `src/assets/placeholders/items.ts` | 260 | `src/core/assets/placeholders/fxSprites.ts` (8), `src/core/assets/placeholders/hudIcons.ts` (5), `src/core/assets/placeholders/items.ts` (4), `src/config/colors.ts` (3) |
| `src/assets/placeholders/pixel.ts` | 169 | `src/core/util/color.ts` (6), `src/core/assets/pixelBuffer.ts` (2) |
| `src/assets/placeholders/props.ts` | 162 | `src/core/assets/placeholders/props.ts` (6) |
| `src/assets/placeholders/storyArt.ts` | 690 | `src/core/assets/placeholders/raster.ts` (4), `src/core/assets/placeholders/storyTiles.ts` (3), `src/core/math/geometry.ts` (1), `src/core/assets/placeholders/storyProps.ts` (1), `src/core/assets/placeholders/specials.ts` (1) |
| `src/assets/placeholders/tiles.ts` | 226 | `src/core/assets/placeholders/tiles.ts` (9), `src/core/assets/placeholders/raster.ts` (4) |
| `src/campaign/chapters/ch1.ts` | 390 | `src/config/colors.ts` (4), `src/content/campaign/chapters/ch1.ts` (2), `src/story/walk/objectives/barriers.ts` (2), `src/story/walk/objectives/visor.ts` (1), `src/content/campaign/vocab.ts` (1), `src/config/story.ts` (1) |
| `src/campaign/chapters/ch2.ts` | 245 | `src/config/colors.ts` (2), `src/content/campaign/chapters/ch2.ts` (1), `src/story/walk/objectives/visor.ts` (1), `src/story/walk/walkInput.ts` (1), `src/config/story.ts` (1) |
| `src/campaign/chapters/ch3.ts` | 237 | `src/config/colors.ts` (4), `src/content/campaign/chapters/ch3.ts` (3), `src/content/campaign/vocab.ts` (1) |
| `src/campaign/chapters/ch4.ts` | 123 | `src/content/campaign/chapters/ch4.ts` (1), `src/content/campaign/vocab.ts` (1), `src/config/colors.ts` (1) |
| `src/campaign/chapters/ch5.ts` | 263 | `src/config/colors.ts` (4), `src/content/campaign/chapters/ch5.ts` (1), `src/story/walk/walkStep.ts` (1) |
| `src/campaign/chapters/ch6.ts` | 166 | `src/content/campaign/chapters/ch6.ts` (2), `src/config/colors.ts` (1) |
| `src/campaign/chapters/ch7.ts` | 564 | `src/config/colors.ts` (10), `src/content/campaign/chapters/ch7/markers.ts` (3), `src/core/math/geometry.ts` (1), `src/content/campaign/chapters/ch7/index.ts` (1), `src/content/campaign/chapters/ch7/arrival.ts` (1), `src/entities/prop.ts` (1), `src/content/campaign/chapters/ch7/march.ts` (1), `src/content/campaign/chapters/ch7/city.ts` (1), `src/content/campaign/chapters/ch7/oath.ts` (1) |
| `src/campaign/chapters/ch8.ts` | 303 | `src/config/colors.ts` (7), `src/content/campaign/marvels.ts` (2), `src/content/campaign/chapters/ch8.ts` (2), `src/story/engine/effects.ts` (2), `src/config/fx.ts` (2) |
| `src/campaign/chapters/helpers.ts` | 292 | `src/content/campaign/vocab.ts` (7), `src/config/story.ts` (5), `src/story/walk/follow.ts` (2), `src/systems/story/gaps.ts` (2), `src/story/walk/lull.ts` (2), `src/config/debug.ts` (2), `src/story/steps/control.ts` (1), `src/story/walk/objectives/barriers.ts` (1), `src/entities/factory.ts` (1), `src/entities/prop.ts` (1), `src/story/engine/stage.ts` (1), `src/systems/world/map.ts` (1), `src/config/colors.ts` (1) |
| `src/campaign/chapters/index.ts` | 20 | `src/content/campaign/chapters/index.ts` (2) |
| `src/campaign/home.ts` | 28 | `src/content/campaign/marvels.ts` (3) |
| `src/campaign/state.ts` | 333 | `src/core/state/campaignSave.ts` (14), `src/systems/campaign/rules.ts` (13), `src/systems/campaign/model.ts` (11), `src/config/campaign.ts` (3), `src/systems/campaign/costumes.ts` (1), `src/content/campaign/endings.ts` (1) |
| `src/campaign/summary.ts` | 83 | `src/ui/text/format.ts` (3), `src/systems/campaign/progression.ts` (2), `src/systems/campaign/costumes.ts` (1) |
| `src/campaign/titles.ts` | 11 | `src/content/campaign/titles.ts` (1) |
| `src/campaign/types.ts` | 36 | `src/story/engine/types.ts` (2) |
| `src/config.ts` | 752 | `src/config/greenZone.ts` (16), `src/config/ui.ts` (9), `src/config/display.ts` (6), `src/config/motion.ts` (6), `src/config/input.ts` (3), `src/config/fx.ts` (3), `src/config/minigames.ts` (3), `src/config/colors.ts` (2), `src/config/audio.ts` (2), `src/config/story.ts` (2), `src/config/debug.ts` (2), `src/config/index.ts` (1), `src/config/campaign.ts` (1), `src/config/combat.ts` (1) |
| `src/core/assets.ts` | 122 | `src/core/assets/index.ts` (4), `src/core/assets/atlas.ts` (3), `src/config/art.ts` (2) |
| `src/core/audio.ts` | 343 | `src/config/audio.ts` (9), `src/core/audio/engine.ts` (7) |
| `src/core/display.ts` | 73 | `src/core/app/display.ts` (5) |
| `src/core/events.ts` | 70 | `src/systems/greenZone/events.ts` (2), `src/core/util/emitter.ts` (1) |
| `src/core/game.ts` | 116 | `src/core/app/game.ts` (2), `src/core/render/layers.ts` (1), `src/core/app/lifecycle.ts` (1) |
| `src/core/input.ts` | 485 | `src/core/input/gestures.ts` (6), `src/core/input/pointer.ts` (5), `src/config/input.ts` (5), `src/core/input/types.ts` (4), `src/core/input/input.ts` (4), `src/core/input/keyboard.ts` (2) |
| `src/core/loop.ts` | 72 | `src/core/app/loop.ts` (2) |
| `src/core/native.ts` | 30 | `src/core/app/native.ts` (4) |
| `src/core/rng.ts` | 40 | `src/core/util/rng.ts` (2) |
| `src/core/scene.ts` | 96 | `src/core/scene/scene.ts` (2), `src/core/render/dispose.ts` (1) |
| `src/core/settings.ts` | 167 | `src/core/state/settings.ts` (13), `src/core/state/records.ts` (6), `src/config/audio.ts` (2), `src/ui/text/format.ts` (1), `src/config/input.ts` (1) |
| `src/core/storage.ts` | 33 | `src/core/state/storage.ts` (2) |
| `src/core/synth.ts` | 125 | `src/core/audio/synth.ts` (9) |
| `src/entities/actor.ts` | 342 | `src/config/motion.ts` (11), `src/entities/actor.ts` (7), `src/core/assets/manifest/characters.ts` (5), `src/systems/motion/behavior.ts` (3), `src/entities/animation/figureSprite.ts` (3), `src/systems/motion/steering.ts` (1), `src/config/colors.ts` (1) |
| `src/entities/critters.ts` | 214 | `src/config/greenZone.ts` (7), `src/systems/greenZone/critterAi.ts` (4), `src/entities/critters/bagnaskiz.ts` (3), `src/entities/critters/cat.ts` (2), `src/entities/critters/ball.ts` (2), `src/core/assets/manifest/characters.ts` (1), `src/core/assets/manifest/sprites.ts` (1), `src/config/colors.ts` (1) |
| `src/entities/entity.ts` | 103 | `src/entities/entity.ts` (9), `src/entities/animation/animationState.ts` (1), `src/entities/animation/characterSprite.ts` (1), `src/config/display.ts` (1) |
| `src/entities/items.ts` | 79 | `src/config/fx.ts` (3), `src/entities/items/treat.ts` (2), `src/entities/items/poopPile.ts` (2), `src/core/assets/manifest/sprites.ts` (1), `src/config/display.ts` (1) |
| `src/entities/prop.ts` | 26 | `src/entities/prop.ts` (1) |
| `src/entities/zampano.ts` | 287 | `src/config/motion.ts` (11), `src/entities/zampano.ts` (6), `src/systems/player/playerMotion.ts` (5), `src/core/assets/manifest/characters.ts` (1), `src/config/input.ts` (1), `src/config/colors.ts` (1) |
| `src/fx/audioFiles.ts` | 66 | `src/core/audio/files.ts` (5) |
| `src/fx/gameAudio.ts` | 72 | `src/config/audio.ts` (4), `src/core/flow/greenZone/greenZoneAudio.ts` (2) |
| `src/fx/gameFx.ts` | 348 | `src/config/fx.ts` (12), `src/config/colors.ts` (4), `src/entities/effects/barkWaves.ts` (2), `src/entities/effects/ringLayer.ts` (2), `src/core/flow/greenZone/greenZoneFx.ts` (1), `src/entities/effects/digestionBubble.ts` (1), `src/config/greenZone.ts` (1), `src/core/math/projection.ts` (1) |
| `src/fx/glitchFilter.ts` | 144 | `src/core/render/filters/glitchFilter.ts` (4), `src/core/render/filters/filterVertex.ts` (1) |
| `src/fx/particles.ts` | 105 | `src/entities/effects/particles.ts` (4), `src/config/fx.ts` (2) |
| `src/fx/popups.ts` | 119 | `src/config/fx.ts` (4), `src/entities/effects/popups.ts` (2), `src/config/colors.ts` (1) |
| `src/fx/sounds.ts` | 111 | `src/core/audio/patches.ts` (4), `src/core/audio/medievalMusic.ts` (2) |
| `src/fx/textGlitchFilter.ts` | 116 | `src/core/render/filters/textGlitchFilter.ts` (3), `src/core/render/filters/filterVertex.ts` (1) |
| `src/fx/titleGlitchFilter.ts` | 194 | `src/core/render/filters/titleGlitchFilter.ts` (3), `src/core/render/filters/filterVertex.ts` (1) |
| `src/fx/transition.ts` | 74 | `src/config/fx.ts` (2), `src/core/scene/transition.ts` (1) |
| `src/iso/camera.ts` | 105 | `src/config/display.ts` (3), `src/core/stage/camera.ts` (2) |
| `src/iso/depth.ts` | 52 | `src/core/math/depth.ts` (7) |
| `src/iso/projection.ts` | 134 | `src/core/math/projection.ts` (21) |
| `src/levels/index.ts` | 9 | `src/content/levels/index.ts` (2) |
| `src/levels/level1.ts` | 248 | `src/content/levels/greenZone.ts` (4), `src/systems/motion/behavior.ts` (1) |
| `src/main.ts` | 103 | `src/config/display.ts` (3), `src/core/flow/bootstrap.ts` (1), `src/core/flow/urlParams.ts` (1), `src/core/flow/automation.ts` (1), `src/core/app/lifecycle.ts` (1), `src/main.ts` (1), `src/config/debug.ts` (1), `src/story/pilot/autopilot.ts` (1) |
| `src/scenes/couchScene.ts` | 229 | `src/config/ui.ts` (8), `src/config/colors.ts` (6), `src/ui/screens/paperCardScene.ts` (2), `src/systems/campaign/rules.ts` (1), `src/ui/screens/couchScene.ts` (1), `src/core/flow/titleFlow.ts` (1), `src/ui/widgets/paperCard.ts` (1), `src/config/display.ts` (1), `src/config/campaign.ts` (1) |
| `src/scenes/flow.ts` | 369 | `src/core/flow/walkFlow.ts` (5), `src/core/app/settingsActions.ts` (3), `src/config/audio.ts` (3), `src/core/flow/titleFlow.ts` (2), `src/config/fx.ts` (2), `src/core/flow/flow.ts` (1), `src/core/app/lifecycle.ts` (1), `src/systems/greenZone/scoring.ts` (1) |
| `src/scenes/gameScene.ts` | 349 | `src/config/fx.ts` (4), `src/config/colors.ts` (3), `src/core/flow/greenZone/greenZoneScene.ts` (2), `src/entities/effects/exitMarker.ts` (2), `src/entities/effects/magnetRings.ts` (1), `src/ui/effects/attackFx.ts` (1), `src/ui/hud/attackBanner.ts` (1), `src/systems/world/map.ts` (1), `src/core/input/touchLayout.ts` (1), `src/core/input/intent.ts` (1), `src/ui/hud/walkHudModel.ts` (1), `src/config/input.ts` (1), `src/config/greenZone.ts` (1), `src/config/ui.ts` (1), `src/ui/hud/greenZoneHud.ts` (1) |
| `src/scenes/glossaryScene.ts` | 171 | `src/config/ui.ts` (4), `src/config/colors.ts` (3), `src/ui/screens/glossaryScene.ts` (2), `src/ui/screens/paperCardScene.ts` (2), `src/ui/screens/handRing.ts` (1), `src/config/display.ts` (1) |
| `src/scenes/overlays.ts` | 962 | `src/config/ui.ts` (20), `src/ui/screens/title/titleScene.ts` (4), `src/config/colors.ts` (3), `src/ui/widgets/menuRows.ts` (3), `src/ui/widgets/overlay.ts` (2), `src/core/app/settingsActions.ts` (2), `src/ui/screens/briefingScene.ts` (2), `src/ui/screens/title/titlePortrait.ts` (1), `src/ui/screens/title/livesCounter.ts` (1), `src/ui/screens/title/menuShine.ts` (1), `src/core/flow/titleFlow.ts` (1), `src/ui/screens/pauseScene.ts` (1), `src/systems/greenZone/scoring.ts` (1), `src/ui/screens/levelEndScene.ts` (1), `src/ui/screens/gameOverScene.ts` (1), `src/ui/screens/optionsScene.ts` (1), `src/ui/screens/controlsScene.ts` (1), `src/ui/screens/confirmScene.ts` (1), `src/ui/screens/goodbyeScene.ts` (1), `src/config/display.ts` (1), `src/config/fx.ts` (1), `src/config/audio.ts` (1), `src/core/math/geometry.ts` (1) |
| `src/scenes/spriteViewerScene.ts` | 94 | `src/ui/screens/debug/spriteViewerScene.ts` (4), `src/config/colors.ts` (2), `src/config/debug.ts` (1) |
| `src/scenes/supervillainedScene.ts` | 150 | `src/config/colors.ts` (3), `src/entities/effects/particles.ts` (3), `src/ui/screens/supervillainedScene.ts` (2), `src/config/fx.ts` (2), `src/config/display.ts` (1), `src/config/ui.ts` (1), `src/config/audio.ts` (1), `src/core/math/geometry.ts` (1) |
| `src/story/autopilot.ts` | 276 | `src/config/debug.ts` (4), `src/story/engine/step.ts` (2), `src/story/pilot/autopilot.ts` (2), `src/systems/nav/pathfinding.ts` (2), `src/core/math/projection.ts` (1), `src/config/display.ts` (1) |
| `src/story/carry.ts` | 52 | `src/story/steps/carry.ts` (4), `src/entities/carriedLabel.ts` (1), `src/config/colors.ts` (1), `src/config/ui.ts` (1) |
| `src/story/combat.ts` | 409 | `src/config/combat.ts` (6), `src/config/colors.ts` (3), `src/story/combat/types.ts` (2), `src/config/fx.ts` (2), `src/story/combat/combatController.ts` (1), `src/entities/markers/combatMarkers.ts` (1), `src/story/engine/effects.ts` (1), `src/entities/actor.ts` (1) |
| `src/story/dialogueGestures.ts` | 30 | `src/systems/story/dialogueGesture.ts` (2), `src/core/assets/manifest/characters.ts` (1) |
| `src/story/maps.ts` | 710 | `src/content/maps/themes.ts` (4), `src/content/maps/storyMaps.ts` (3), `src/systems/world/asciiMap.ts` (1), `src/content/maps/stages/reality.ts` (1), `src/content/maps/stages/champagne.ts` (1), `src/content/maps/stages/venice.ts` (1), `src/content/maps/stages/sea.ts` (1), `src/content/maps/stages/zara.ts` (1), `src/content/maps/stages/constantinople.ts` (1) |
| `src/story/minigames/action.ts` | 394 | `src/config/minigames.ts` (4), `src/config/colors.ts` (3), `src/story/minigames/ladders/laddersSim.ts` (2), `src/story/minigames/tug/tugGame.ts` (2), `src/core/assets/manifest/animations.ts` (1), `src/story/minigames/miniInput.ts` (1), `src/story/minigames/ladders/laddersGame.ts` (1), `src/ui/minigames/laddersView.ts` (1), `src/ui/minigames/tugView.ts` (1), `src/content/campaign/chapters/ch7/oath.ts` (1), `src/story/minigames/boat/boatGame.ts` (1), `src/ui/minigames/boatView.ts` (1), `src/story/engine/stage.ts` (1), `src/config/audio.ts` (1), `src/config/debug.ts` (1) |
| `src/story/minigames/index.ts` | 4 | `src/story/minigames/index.ts` (1) |
| `src/story/minigames/miniGame.ts` | 89 | `src/story/minigames/miniGame.ts` (2), `src/story/minigames/miniGameStep.ts` (2), `src/config/display.ts` (1) |
| `src/story/minigames/rhythm.ts` | 234 | `src/content/minigames/rhythmPresets.ts` (4), `src/story/minigames/rhythm/rhythmGame.ts` (2), `src/story/minigames/rhythm/rhythmSim.ts` (2), `src/config/minigames.ts` (2), `src/ui/minigames/rhythmView.ts` (1), `src/config/colors.ts` (1), `src/config/debug.ts` (1), `src/config/audio.ts` (1) |
| `src/story/minigames/words.ts` | 377 | `src/ui/widgets/buttonList.ts` (3), `src/ui/minigames/wordsView.ts` (3), `src/content/minigames/letter.ts` (3), `src/content/minigames/rumour.ts` (3), `src/config/colors.ts` (3), `src/ui/widgets/buttonPicker.ts` (2), `src/ui/widgets/listNav.ts` (2), `src/config/minigames.ts` (2), `src/story/minigames/words/wordGame.ts` (1), `src/story/minigames/words/letterGame.ts` (1), `src/story/minigames/words/rumourGame.ts` (1), `src/config/ui.ts` (1), `src/config/debug.ts` (1) |
| `src/story/names.ts` | 121 | `src/ui/text/markup.ts` (4), `src/content/campaign/lexicon.ts` (2), `src/config/colors.ts` (1) |
| `src/story/screens.ts` | 442 | `src/config/ui.ts` (7), `src/config/colors.ts` (4), `src/ui/screens/story/bookModel.ts` (3), `src/systems/campaign/progression.ts` (2), `src/ui/screens/story/storyCardScene.ts` (1), `src/core/scene/sceneBase.ts` (1), `src/ui/screens/story/storyMenuScene.ts` (1), `src/ui/screens/story/storyChapterScene.ts` (1), `src/ui/text/format.ts` (1), `src/ui/screens/story/storyPauseScene.ts` (1), `src/ui/screens/story/bookScene.ts` (1), `src/config/display.ts` (1) |
| `src/story/step.ts` | 36 | `src/story/engine/step.ts` (3) |
| `src/story/steps.ts` | 353 | `src/story/steps/dialogue.ts` (10), `src/story/steps/stage.ts` (9), `src/story/steps/control.ts` (8), `src/config/ui.ts` (3), `src/config/story.ts` (2), `src/systems/campaign/rules.ts` (1), `src/config/debug.ts` (1), `src/core/math/projection.ts` (1), `src/config/input.ts` (1), `src/config/fx.ts` (1), `src/config/colors.ts` (1) |
| `src/story/storyFlow.ts` | 405 | `src/content/campaign/cards.ts` (4), `src/core/flow/storyFlow.ts` (2), `src/config/colors.ts` (2), `src/config/audio.ts` (2), `src/systems/campaign/progression.ts` (1), `src/content/campaign/endings.ts` (1), `src/core/app/settingsActions.ts` (1), `src/config/fx.ts` (1) |
| `src/story/storyScene.ts` | 494 | `src/story/engine/context.ts` (2), `src/story/engine/stage.ts` (2), `src/story/engine/controls.ts` (2), `src/story/engine/effects.ts` (2), `src/config/colors.ts` (2), `src/config/ui.ts` (2), `src/config/fx.ts` (2), `src/core/assets/manifest/characters.ts` (1), `src/story/engine/storyScene.ts` (1), `src/story/engine/runner.ts` (1), `src/ui/hud/noticeStack.ts` (1), `src/ui/effects/screenOverlay.ts` (1), `src/story/storyScene.ts` (1), `src/config/display.ts` (1), `src/config/input.ts` (1) |
| `src/story/ui.ts` | 410 | `src/config/ui.ts` (5), `src/config/colors.ts` (4), `src/content/campaign/speakers.ts` (2), `src/ui/story/dialogueBox.ts` (2), `src/ui/widgets/listNav.ts` (1), `src/story/ui.ts` (1), `src/config/display.ts` (1), `src/ui/story/cardLayer.ts` (1), `src/ui/hud/storyHud.ts` (1), `src/core/input/touchLayout.ts` (1), `src/config/input.ts` (1) |
| `src/story/walk.ts` | 667 | `src/config/story.ts` (7), `src/story/walk/types.ts` (5), `src/story/walk/walkStep.ts` (3), `src/config/fx.ts` (3), `src/config/colors.ts` (3), `src/systems/motion/sight.ts` (2), `src/story/walk/objectives/pickups.ts` (2), `src/core/assets/manifest/sprites.ts` (1), `src/entities/pickup.ts` (1), `src/story/walk/walkInput.ts` (1), `src/story/walk/objectives/detection.ts` (1), `src/entities/markers/sightCone.ts` (1), `src/story/walk/objectives/pace.ts` (1), `src/story/walk/objectives/thirst.ts` (1), `src/story/walk/objectives/scramble.ts` (1), `src/story/walk/objectives/fire.ts` (1), `src/entities/markers/flames.ts` (1), `src/entities/markers/goalMarkers.ts` (1), `src/ui/hud/offscreenArrow.ts` (1), `src/story/pilot/walkPilot.ts` (1), `src/config/ui.ts` (1), `src/config/debug.ts` (1) |
| `src/systems/ambush.ts` | 247 | `src/config/greenZone.ts` (10), `src/systems/greenZone/ambush.ts` (3), `src/entities/factory.ts` (1), `src/entities/actor.ts` (1), `src/core/math/geometry.ts` (1), `src/systems/greenZone/ambushEntry.ts` (1) |
| `src/systems/ambushEntry.ts` | 76 | `src/systems/greenZone/ambushEntry.ts` (5), `src/config/greenZone.ts` (3), `src/systems/motion/behavior.ts` (1) |
| `src/systems/ambushLogic.ts` | 148 | `src/systems/greenZone/ambushLogic.ts` (4), `src/core/math/geometry.ts` (1), `src/config/greenZone.ts` (1) |
| `src/systems/combat.ts` | 105 | `src/systems/combat/foe.ts` (7), `src/config/combat.ts` (2), `src/systems/motion/cone.ts` (1) |
| `src/systems/lives.ts` | 17 | `src/systems/greenZone/lives.ts` (3) |
| `src/systems/needs.ts` | 177 | `src/systems/player/needs.ts` (7), `src/config/greenZone.ts` (1) |
| `src/systems/placement.ts` | 221 | `src/systems/greenZone/placement.ts` (8), `src/config/greenZone.ts` (6), `src/systems/world/map.ts` (1) |
| `src/systems/rules.ts` | 263 | `src/config/greenZone.ts` (4), `src/systems/greenZone/rules.ts` (3), `src/entities/factory.ts` (2), `src/systems/greenZone/worldAccess.ts` (1), `src/core/input/intent.ts` (1), `src/core/flow/greenZone/greenZoneFx.ts` (1), `src/config/fx.ts` (1) |
| `src/systems/scoring.ts` | 51 | `src/systems/greenZone/scoring.ts` (6), `src/ui/text/format.ts` (2), `src/config/greenZone.ts` (1), `src/config/ui.ts` (1) |
| `src/systems/threatLogic.ts` | 148 | `src/systems/greenZone/threatLogic.ts` (4), `src/systems/motion/cone.ts` (1), `src/systems/motion/flee.ts` (1), `src/config/combat.ts` (1), `src/config/greenZone.ts` (1), `src/config/motion.ts` (1) |
| `src/systems/threats.ts` | 274 | `src/config/greenZone.ts` (6), `src/systems/greenZone/threats.ts` (2), `src/entities/factory.ts` (2), `src/config/colors.ts` (1), `src/core/input/intent.ts` (1), `src/core/flow/greenZone/greenZoneFx.ts` (1), `src/systems/greenZone/critterAi.ts` (1), `src/config/fx.ts` (1) |
| `src/ui/attackBanner.ts` | 65 | `src/config/ui.ts` (3), `src/ui/hud/attackBanner.ts` (1), `src/config/colors.ts` (1) |
| `src/ui/card.ts` | 56 | `src/ui/widgets/paperCard.ts` (5), `src/config/colors.ts` (3), `src/config/ui.ts` (3) |
| `src/ui/discoLights.ts` | 155 | `src/ui/effects/discoBeat.ts` (5), `src/config/ui.ts` (3), `src/ui/effects/discoLights.ts` (2), `src/config/display.ts` (1), `src/config/colors.ts` (1) |
| `src/ui/hud.ts` | 249 | `src/config/ui.ts` (9), `src/ui/hud/greenZoneHud.ts` (3), `src/config/colors.ts` (2), `src/core/input/touchLayout.ts` (1), `src/ui/hud/hungerBar.ts` (1), `src/ui/hud/radar.ts` (1), `src/config/greenZone.ts` (1) |
| `src/ui/logo.ts` | 80 | `src/ui/text/logo.ts` (8) |
| `src/ui/menu.ts` | 118 | `src/ui/widgets/menu.ts` (4), `src/config/ui.ts` (3), `src/config/colors.ts` (2), `src/ui/widgets/listNav.ts` (1) |
| `src/ui/pixelFont.ts` | 151 | `src/config/art.ts` (7), `src/core/render/text/pixelFont.ts` (6) |
| `src/ui/pixelText.ts` | 275 | `src/core/render/text/pixelText.ts` (11), `src/config/art.ts` (1) |
| `src/ui/retro.ts` | 69 | `src/config/colors.ts` (3), `src/ui/widgets/retroBox.ts` (3), `src/core/util/color.ts` (1) |
| `src/ui/shout.ts` | 120 | `src/config/fx.ts` (6), `src/ui/effects/shout.ts` (1), `src/config/colors.ts` (1) |
| `src/ui/titleAnim.ts` | 208 | `src/core/assets/animatedImage.ts` (11), `src/config/art.ts` (3), `src/core/assets/crisp.ts` (3), `src/ui/screens/title/titlePortrait.ts` (1) |
| `src/ui/titleArt.ts` | 73 | `src/core/assets/logoArt.ts` (6), `src/core/assets/crisp.ts` (1), `src/config/art.ts` (1) |
| `src/ui/touchControls.ts` | 479 | `src/ui/touch/touchIcons.ts` (7), `src/config/ui.ts` (6), `src/core/input/touchLayout.ts` (5), `src/config/colors.ts` (4), `src/config/input.ts` (3), `src/ui/touch/gestureHints.ts` (2), `src/ui/touch/touchControls.ts` (1), `src/config/greenZone.ts` (1) |
| `src/world/level.ts` | 223 | `src/systems/world/level.ts` (11), `src/systems/world/asciiMap.ts` (4) |
| `src/world/map.ts` | 353 | `src/systems/world/map.ts` (4), `src/config/greenZone.ts` (1) |
| `src/world/mapRenderer.ts` | 265 | `src/config/display.ts` (5), `src/core/stage/mapRenderer.ts` (5), `src/core/assets/manifest/names.ts` (1), `src/core/util/color.ts` (1), `src/core/assets/manifest/sprites.ts` (1), `src/config/colors.ts` (1) |
| `src/world/tiles.ts` | 180 | `src/systems/world/tiles.ts` (8), `src/systems/world/asciiMap.ts` (2), `src/core/assets/manifest/sprites.ts` (1) |
| `src/world/world.ts` | 204 | `src/core/stage/world.ts` (7), `src/config/display.ts` (5), `src/entities/stageDressing.ts` (2), `src/story/engine/stage.ts` (1), `src/entities/factory.ts` (1) |

## 15. Open issues at the stop

These would have been handled by the steps that did not run.

- **Four groups are not verified** (560 entries): story engine (scene, flow, screens, ui, steps), story engine (walk, combat, autopilot, maps, mini-games), campaign/chapters and assets/. In the verified groups the verifier corrected about 1 entry in 9, so expect similar corrections here.
- **The two critics did not run**: one would have checked import direction and cycles across the whole map, the other whether the result matches what you asked for (Core / Entities / UI / Config).
- **Files proposed outside the judge's list**:
  - `src/systems/world/entityContext.ts` (mapper, entities/ world/ iso/ levels/): EntityContext and EntitySignal ({map, player: Readonly&lt;{gx,gy,vx,vy}>, time, pollute, signal}) have to be nameable from systems. systems/greenZone/rules.ts and ambush.ts step the player and the band through PlayerHandle.update(dt, ctx) and BandMember.update(dt, ctx), and systems may not import entities/entity.ts, where the target declares the type. Declare it here (L3, next to GameMap, which it references) and re-export it from entities/entity.ts.
  - `src/core/assets/placeholders/critters/frame.ts` (mapper, assets/): Holds Pt and the shared CritterFrame context (buffer, packed colours, facing and perpendicular vectors, body/rear/front/head points, bodyY, groundY, facing flags, pose), built once by critterFrame() in drawCritter. body.ts, head.ts and hats.ts all need this type, while draw.ts imports them to run the paint order. Putting Pt and the context in draw.ts, as the target lists Pt, would make a draw &lt;-> parts cycle that tests/layers.test.ts rejects (type-only imports count).
- **Files in the plan that no entry fills** (barrels and new helpers, as expected): `src/core/render/redraw.ts`, `src/core/stage/stageEntity.ts`, `src/core/input/index.ts`, `src/core/audio/index.ts`, `src/core/assets/fonts/PressStart2P.woff2`, `src/core/assets/manifest/index.ts`, `src/core/assets/environment/index.ts`, `src/systems/combat/index.ts`, `src/story/steps/index.ts`, `src/story/walk/index.ts`, `src/story/combat/index.ts`, `src/story/minigames/words/index.ts`, `src/content/index.ts`.
- **Corrections the verifiers flagged as bugs in the plan** (21; full text under each entry in section 12):
  - `src/config.ts` `(whole file)` → `src/config/index.ts`: Verified: 56 src files + 15 test files import '../config' statically, plus the 2 dynamic imports (threats.test:34, discoLights.test:6). tsconfig is moduleResolution 'bundler', so config.ts would shadow config/index.ts. The MENU clash is real: TS2308 on `export *`. I checked every name the plan puts in the 14 files and MENU is the only clash. URL in debug.ts shadows a DOM global (see entry 168).
  - `src/config.ts` `STORY.RUMOUR` → `src/config/minigames.ts`: Name clash: words.ts:275 has a local `const RUMOUR = [...]` (the rumour text), which the plan moves to content/minigames/rumour.ts as RUMOUR. A top-level config RUMOUR would give two different exported RUMOURs, and ch6 (which passes the text in and imports config for CAMPAIGN) is one import away from a conflict. The reader is unchanged: words.ts:339.
  - `src/core/assets.ts` `TextureRegistry` → `src/core/assets/index.ts`: A plain delete(name)/deleteMany(names) invites the bug described in entry 59. Add an ownership-aware removal instead: release(names, sources) deletes a name only while map.get(name).source is one of `sources`, plus a non-warning peek(name). get() warns and returns Texture.WHITE on a miss, so it cannot be used for that test.
  - `src/core/assets.ts` `packAtlas` → `src/core/assets/atlas.ts`: (1) packAtlas has three callers, not one: build.ts:75 ('cast', in ensureCharacters), :137 ('global') and :199 ('level'). Only :199 keeps the result. (2) BUG in the handle: successive palette atlases register the SAME names (`${kind}_${v}`, spriteName for props, plus pole_0, fountain_0 and exitFlag_0, which also overwrite the global atlas's entries; build.ts:177-198). When palette N's handle is des…
  - `src/main.ts` `inline: renderer options` → `src/config/display.ts`: Only these two are real knobs. antialias:false, resolution:1 and autoDensity:false (28-30) are invariants of the integer-scale model: computeViewport picks device px and Game.resize sets the canvas CSS size itself, which autoDensity:true or resolution != 1 would break. roundPixels:true (34) is pixel-perfect rendering. These are the same kind of invariant as scaleMode 'nearest', which the entry alr…
  - `src/scenes/flow.ts` `Flow` → `src/core/flow/flow.ts`: Three changes to the facade. 1. popOverlays (366-368) belongs in walkFlow, not the facade. It compares the stack against the walk scene, and its only callers are startPlaying and resume, which move to walkFlow. Left in Flow, walkFlow would have to call back up into it. 2. glitch() (204-208) is called from both titleFlow (cont, newGame, levels, OPTIONS back) and walkFlow (restart, quitToTitle). Nei…
  - `src/scenes/gameScene.ts` `GameScene` → `src/core/flow/greenZone/greenZoneScene.ts`: The render skip condition is wrong. 'Skip HUD and controls work when !active or covered' changes the Briefing screen: - playGreenZone (184-189) sets active = false and pushes BriefingScene (dim 0.42) without hiding the HUD or the controls. - GameScene.update never runs under the briefing, but render does (SceneManager.render runs for every scene on the stack). - Hud's texts start as '' (hud.ts:47-…
  - `src/scenes/supervillainedScene.ts` `SPARK_TINTS` → `src/config/colors.ts`: The note is wrong: only three of the five values are NEON twins. 0xffffff (C.white), 0xffe23a (C.yellow) and 0x3ff0ff (C.cyan) are. 0xff4fd8 is not C.pink (that is '#ff4fa8', retro.ts:8), and 0xd4ff3a is not in C at all (it is the logo's '#d4ff3a'). Keep the five literals in order. Replacing 0xff4fd8 with NEON.pink would change a colour silently, against the 'not merged silently' rule.
  - `src/fx/gameFx.ts` `inline: bark wave look` → `src/config/fx.ts`: BARK.WAVE_SPEED and BARK.ANIM_TIME are gameplay rules, not visuals. systems/threats.ts:168 times the pending bark hit as d / BARK.WAVE_SPEED. threats.ts:161 locks the player for BARK.ANIM_TIME. Both must stay in BARK in config/greenZone.ts, and BarkWaves reads BARK.WAVE_SPEED and BARK.RANGE from there so the wave stays in sync with the hit. ANIM_TIME is not used by the wave at all. The target's 'B…
  - `src/fx/popups.ts` `Popups` → `src/entities/effects/popups.ts`: The design is fine, but 'fixes the gameFx:236 workaround' is inaccurate. glowAlpha is already in the pool key (popups 218). The 236 comment only quantizes glowAlpha to keep the pool small, as entry 28 rightly keeps. The real latent bug is that the key omits glow (colour), align, maxWidth, outlineWidth and shadow, so a pooled text could come back with the wrong wrap or alignment. Add those. Hiding …
  - `src/fx/textGlitchFilter.ts` `inline: shader constants and filter padding 14` → `src/core/render/filters/textGlitchFilter.ts`: Correct the justification. The GLSL slice shift is (rand-0.5)\*24\*b px (line 59), so at most ±12 px, plus the RGB split floor(idle+3b+0.5) of up to about 4 px. 'Sized to the GLSL's 24-px maximum shift' is wrong; padding 14 covers about 12 px plus the split.
  - `src/ui/menu.ts` `Menu` → `src/ui/widgets/menu.ts`: Height reads verified at overlays 198, 211, 516, 624, 766 and 864 and screens 258. Container's own height accessor (get and set) would collide, so composition is correct.
  - `src/ui/shout.ts` `Shout` → `src/ui/effects/shout.ts`: Verified: story-smoke.mjs:547-548 reads shout.active and shout.scale. The private `scale` would collide with Container.scale.
  - `src/ui/titleAnim.ts` `smooth2d` → `src/core/assets/crisp.ts`: smooth2d is the same smoothing setup that titleArt repeats (54-56, 63-65). Put it in crisp.ts, the lower helper, and have animatedImage import it. If it stays in animatedImage, crisp's crispScale needs it too, and crisp would import animatedImage while animatedImage imports crisp (entry 185). That is an intra-folder cycle the layer test rejects.
  - `src/ui/titleAnim.ts` `canvas` → `src/core/assets/crisp.ts`: 'crisp.ts may import it' creates a cycle. animatedImage.makeFrame imports crispAlpha from crisp (entry 185), so crisp importing canvas() from animatedImage makes core/assets/crisp &lt;-> animatedImage, which tests/layers.test.ts fails on. Move canvas() into crisp.ts. animatedImage (cropBox, makeFrame) and logoArt (via crispScale) import it from there.
  - `src/entities/critters.ts` `Cat.step` → `src/systems/greenZone/critterAi.ts`: CatBody must not be a copied record. threats.ts reads cat.state, age, gx and gy directly (86-98, plus debugState), and screenshot.mjs teleports next to cats, so pass the Cat itself (Cat implements CatBody). Make dir, think and stateTime non-private, or put them in a nested record. The CatState union (critters.ts:13) moves to critterAi with it.
  - `src/entities/items.ts` `Treat` → `src/entities/items/treat.ts`: Driver 'world' is right, but the claim that Treat is the only entity doing work in World.endStep is wrong. PickupEntity.update (story/walk.ts:131-141: bob and marvel pulse, writing sprite.y and alpha) and Carried.update (story/carry.ts:25-28: follows the player) also run there, so all three are the driver 'world' set. The Math.random()\*6 phase stays at construction.
  - `src/iso/projection.ts` `HALF_W` → `src/core/math/projection.ts`: The site list is partly wrong. The literal 16/8 pairs are at world.ts:101-102, gameScene.ts:255 (drawMagnetFields, not 251) and gameFx.ts:334-335. autopilot.ts:141-142 and steps.ts:294-297 use no 16: they use the 2:1 ratio (dx - dy, (dx + dy) / 2), which is what the new gridDeltaToStick replaces, not HALF_W.
  - `src/world/tiles.ts` `PROP_SPRITE` → `src/core/assets/manifest/sprites.ts`: Typing bug. Declaring it `: Record<string, {key: SpriteKey; variants: number}>` erases the literal keys, so the proposed `PROP_SPRITE satisfies Record<PropKind, unknown>` would always fail (an index-signature type lacks the required PropKind properties). Declare it `{...} as const satisfies Record<string, {key: SpriteKey; variants: number}>` so the keys stay literal, then check completeness at the…
  - `src/world/world.ts` `World.endStep` → `src/core/stage/world.ts`: The statement that only Treat does work is wrong. PickupEntity.update (story/walk.ts:131-141) and Carried.update (story/carry.ts:25-28) also run at line 153 today. The conclusion (driver 'world' = Treat, PickupEntity, CarriedLabel, updated after the owners) is correct, and CarriedLabel must stay after the player's step so that it reads the moved position.
  - `src/campaign/state.ts` `CampaignState` → `src/systems/campaign/model.ts`: The temporary src/campaign/state.ts shim must also re-export endingNotes (content/campaign/endings) and METER_START/METER_MAX (config). Otherwise move story/storyFlow.ts:2 and tests/campaign.test.ts:5 in the same commit. As written ('model, rules, costumes and campaignSave'), storyFlow's endingNotes import and the test's METER_START/METER_MAX imports break the build. A shim that re-exports content…

## Appendix A. Current files

What each current file does, from the inventory.

| File | Lines | Role |
|---|---:|---|
| `src/assets/animationTiming.ts` | 23 | Pure helpers that turn an AnimDef into a duration and into a frame index for an elapsed time. Handles both fixed-fps clips and authored per-frame holds. |
| `src/assets/build.ts` | 242 | Texture builder. At boot it builds a global atlas (boot characters, items, FX, HUD icons, global props) from delivered PNGs or procedural placeholders. It also builds characters on demand, and rebuilds the per-palette level atlas (tiles and props) with delivered environment frames swapped in. |
| `src/assets/environment.ts` | 319 | Loads and validates the Color Ink environment art banks ('current' and 'new'): manifest.json, zone atlases decoded to CPU PixelBuffers, zone palettes, chapter themes and authored floor designs. Delivered frames replace the generated level entries before packing. It also tracks which bank is active or wanted and collects diagnostics for window.\_\_sv.art(). |
| `src/assets/manifest.ts` | 387 | The sprite manifest: animation names and clip timing, character definitions (frame size, anchor, anims, delivered sheet paths), every non-character SpriteDef, tile variant counts and the texture-name contract. It also holds the cast roster, the playable-skin rules and costumeFor. |
| `src/assets/placeholders/cast.ts` | 145 | Placeholder CritterSpec per character key: every story character is a recoloured variation of the Maltese, pug or cat drawer. It also holds emergency fallbacks for the delivered pixel cast and the armoured (\*Knight) variants. |
| `src/assets/placeholders/critters.ts` | 610 | Parametric quadruped rasterizer used for every placeholder animal in all 8 directions. It defines the spec and pose types, the base Maltese, pug and cat specs, the pose per animation frame, and a soft ground-shadow drawer. |
| `src/assets/placeholders/items.ts` | 260 | Procedural pixel art for items (treat, ball, poop, coin), popups and particles (rainbow, thought, bark wave, sparkle, tri, cross, ring, pixel) and HUD icons (star, dog face, pee icon, bark icon, pee drop). |
| `src/assets/placeholders/pixel.ts` | 169 | A tiny software rasterizer on a Uint32Array in ImageData-native ABGR. It provides colour packing and mixing helpers and the PixelBuffer class (set, rect, disc, ellipse, line, outline, blit, toCanvas). All procedural art and the decoded environment frames go through it. |
| `src/assets/placeholders/props.ts` | 162 | Procedural Green Zone props: palette-coloured tree, forest tree and bush, plus the fixed-colour lamp pole, fountain and checkered exit flag. |
| `src/assets/placeholders/storyArt.ts` | 690 | Procedural art for the story campaign. It draws the extra ground tiles (floor and dock planks, stone and wall courses, sand, snow, deep water, carpet) and the palette-coloured story props (column, desk, house, galley, gate and so on). It also draws the palette-independent story specials (the Professor's legs, Fortune, the stag, items to pick up, horses, flames, faces). |
| `src/assets/placeholders/tiles.ts` | 226 | Procedural Green Zone ground tiles (TW x TH diamonds that tessellate through insideDiamond): grass, tall grass (wind poses), path with grass bleeding in at the edges by neighbour mask, water, forest, pollution dirt, the re-greened highlight and the exit ring. |
| `src/campaign/chapters/ch1.ts` | 390 | Level 1, The Greenzone (reality): the 1.0 Green Zone marker and five story sub-levels (bucket, study lecture and Jack's gate, toll at the bowl, Santina's ball, the rag cross). Pure content, but several walk callbacks do physics and view work inline. |
| `src/campaign/chapters/ch2.ts` | 245 | Level 2, Edge of dreams: the Jerusalem prologue (visor walk), Fulk's sermon and the list (a lull walk), and the coat of mail on the road (pickups, the first fights, the charge, following Pierre). |
| `src/campaign/chapters/ch3.ts` | 237 | Level 3, Venice 1202: the quay and the marvels book, the collection rounds, the weeping memory at Saint Mark's (a lull walk), and the stealth follow and overhearing on the Lido. |
| `src/campaign/chapters/ch4.ts` | 123 | Level 4, The sea 1202: the Veni Creator parade mini-game, the boat and horse feeding, and the rumours on deck ending in the rowing mini-game. |
| `src/campaign/chapters/ch5.ts` | 263 | Level 5, Zara 1202-03: the messenger between two groups and the dissent choice, the ladder mini-game, steadying the ladder and the cloth route, the brawl fight, the letter mini-game, and the winter board. |
| `src/campaign/chapters/ch6.ts` | 166 | Level 6, The long winter to Corfu: short rations and the comradeship choice, the 'Boniface' talk trail with the rumour mini-game, and the leaders kneeling at Corfu. |
| `src/campaign/chapters/ch7.ts` | 564 | Level 7, Constantinople 1203-04: nine sub-levels (looking at the city, the Doge's banner stand, Pierre's walk with a nerve meter, the visit, the fire walk, the envoys' pace rule, the breach, the oath at Niketas's doorway, the common pile). The largest and most mixed chapter script. |
| `src/campaign/chapters/ch8.ts` | 303 | Level 8, Back to the Greenzone: the shattered dream walk with a moving Jerusalem, the study (marvels mapped to objects, the oath told, the drawing choice, the grace tier), the vanguard walk to the bowl, and Santina's ball returned. |
| `src/campaign/chapters/helpers.ts` | 292 | Shared script vocabulary for the chapter files: marker and behaviour shortcuts, the followLeader and lullWalk walk factories, the blockGap collision closure, a rate-limited sounder, and prop and tile helpers. It sits between content (chapter scripts) and the story engine (walk.ts). |
| `src/campaign/chapters/index.ts` | 20 | Registry of the eight levels in order (CHAPTERS) and lookup of a sub-level id to its chapter and index. |
| `src/campaign/home.ts` | 28 | Pure data table for 8.2: maps each dream marvel name to the household object it was borrowed from, with a fallback souvenir string. |
| `src/campaign/state.ts` | 333 | The campaign's persistent state model: types, meter rules (effects, spending, Grace tiers, ending), and persistence (load/save, v1 migration, attempt copies) to localStorage key supervillained:story. |
| `src/campaign/summary.ts` | 83 | Pure view-model for the COUCH card: derives a progress summary from the saved campaign and chapter list, plus play-time and saved-date text formatters. |
| `src/campaign/titles.ts` | 11 | The eight level (chapter) titles from the VG1 level design, as a readonly tuple. |
| `src/campaign/types.ts` | 36 | Type definitions for campaign content: a sub-level (id, card text, source, script factory, optional Green Zone walk) and a chapter (level). |
| `src/config.ts` | 752 | The single home of gameplay tuning: 31 frozen `as const` objects (display, loop, iso, camera, the Green Zone rules, title and card UI, FX, audio, the story campaign and combat). It imports nothing and is the leaf of the dependency graph. |
| `src/core/assets.ts` | 122 | Global texture registry (name to Texture, with Texture.WHITE as the fallback for a missing name) plus a shelf atlas packer for generated pixel buffers. It also has helpers to load a texture from a URL and to cut sub-frames from a sheet. |
| `src/core/audio.ts` | 343 | The WebAudio engine. It builds master, music and sfx gain buses on the first gesture, decodes recorded SFX and synthesizes the rest on demand, and plays one-shots and loops. Music is either streamed &lt;audio> elements routed into the graph or the synthesized medieval loop. Ducking, mute and levels come from settings, and the engine exposes a music clock for beat-synced visuals. |
| `src/core/display.ts` | 73 | Pure viewport math: a low logical resolution with an integer device-pixel scale, clamped to a portrait aspect range (pillarbox or letterbox). Also reads the CSS safe-area insets through a hidden probe element. |
| `src/core/events.ts` | 70 | A minimal typed event emitter, plus the Green Zone walk's gameplay event map (positions in grid space) that decouples systems/rules from FX, HUD and audio. |
| `src/core/game.ts` | 116 | Service hub shared by every scene: the Pixi Application and its stage layers, the screen transition, Input, AudioEngine, Settings (with the one updateSettings path), SceneManager, GameLoop, viewport/resize and client-to-logical coordinate mapping. |
| `src/core/input.ts` | 485 | Unified keyboard, mouse and multi-touch input on raw DOM events. It produces a screen-space movement vector (keyboard or floating joystick), a TTL action queue, a tap queue and held states (run, guard, action), and recognizes the right-hand gestures bound by CONTROLS. Touch buttons register their hit circles with it, and the autopilot drives it through `override`. |
| `src/core/loop.ts` | 72 | The fixed-timestep accumulator (pure) and its requestAnimationFrame driver: it runs update(dt) at 60 Hz up to MAX_STEPS per frame, then render(alpha, frameDt) for interpolation. |
| `src/core/native.ts` | 30 | Bridge to the app's own Capacitor plugin: QUIT closes the app on Android, and links open in the system browser on Android and iOS or in a new tab in a browser. |
| `src/core/rng.ts` | 40 | A seeded deterministic RNG (mulberry32) and a stable two-integer hash, for reproducible levels, placement and decoration. |
| `src/core/scene.ts` | 96 | The Scene contract (root container, update, optional render, resize, enter/exit, Android back) and the scene stack manager. The manager updates from the top down to the first scene that pauses those below, renders every scene, resizes them, and destroys a scene's root when it leaves. |
| `src/core/settings.ts` | 167 | The persistent player settings model (mute, music and sounds levels, text speed, lives, controls, art bank) with validation and migration of old saves. It also holds the UI's cycling and label helpers and the Green Zone level records and coins, all in guarded localStorage. |
| `src/core/storage.ts` | 33 | Guarded JSON localStorage wrapper under the 'supervillained:' key prefix. It never throws when storage is unavailable. |
| `src/core/synth.ts` | 125 | A tiny sfxr-style synthesizer: pure functions that render deterministic voices (waveform, pitch slide, envelope, vibrato, arpeggio, low-pass, bit-crush) into a Float32Array, plus note-name-to-frequency conversion. |
| `src/entities/actor.ts` | 342 | Scripted story characters. It holds the behaviour and sight data types, plus Actor, an Entity subclass that runs AI behaviours, knockback, hit flash, emotes and animation in each fixed step. |
| `src/entities/critters.ts` | 214 | Green Zone critters: Cat, Ball and Bagnaskiz the pug. Each is an Entity whose own step() mixes steering, collision, gameplay side effects and animation. |
| `src/entities/entity.ts` | 103 | The base Entity (grid position, prev position for interpolation, fade, bounds, a composed Pixi Container view) and CharacterAnimator, the view component that plays directional sprite animations. |
| `src/entities/items.ts` | 79 | Green Zone pickups and hazards: the bobbing Treat and the PoopPile, whose pollution spreads over time. |
| `src/entities/prop.ts` | 26 | PropEntity: a static scenery sprite placed on the map, with bounds taken from the sprite manifest. |
| `src/entities/zampano.ts` | 287 | The player dog Zampanò: action-state tables, terrain speed multipliers, and an Entity that turns stick intent into movement, energy, action states and animation in one fixed-step call. |
| `src/fx/audioFiles.ts` | 66 | Audio asset manifest. It imports the recorded music and sound files as Vite ?url URLs and names each one after its use in the game (SOUND_FILES, MUSIC_FILES). |
| `src/fx/gameAudio.ts` | 72 | Binds the Green Zone walk's gameplay events (Emitter&lt;GameEvents>) to audio: sound effects, the siren loop, music ducking and a separate bark pitch for each band member. |
| `src/fx/gameFx.ts` | 348 | The Green Zone walk's cosmetic reactions to gameplay events: popups, particle bursts, pee and pollution rings, bark sound waves, footstep dust, the pee stream, the digestion bubble and camera shake. Two containers: below (rings) and above (particles, popups, voices, bubble, waves). |
| `src/fx/glitchFilter.ts` | 144 | Full-screen retro CRT/glitch post filter: horizontal slices, RGB split, sepia palette shift, scanlines and a white flash. Used by screen transitions and the Green Zone attack. |
| `src/fx/particles.ts` | 105 | Pooled pixel particle bursts (tinted sprites with drag, gravity and an end flicker) in a container, positioned in world pixels. |
| `src/fx/popups.ts` | 119 | World-space popups: big pixel icons and pooled pixel-text labels that pop in, float up and blink out. Optionally clamped into the visible rect (keepIn) so a speaker at the edge stays readable. |
| `src/fx/sounds.ts` | 111 | Synthesized (sfxr-style) sound-effect patches for every sound with no recording, the full SoundName union, and the procedurally rendered medieval music loop of the dream. |
| `src/fx/textGlitchFilter.ts` | 116 | Glitch filter for the title lettering. In a burst, slices jump sideways, the colours split and rows flicker bright; in between, a faint shiver. |
| `src/fx/titleGlitchFilter.ts` | 194 | Filter for the title page backdrop: an old dirty film look (grain, flicker, sepia, scratches, dust, vignette, gate weave) plus occasional, mostly vertical glitch bursts. |
| `src/fx/transition.ts` | 74 | Full-screen glitch transition on the stage (RGB split, slices, flash). The midpoint callback, usually a change of scene, runs at the strongest glitch frame. |
| `src/iso/camera.ts` | 105 | A pure screen-space follow camera with look-ahead, sway, shake and bounds clamping, interpolated at render time. |
| `src/iso/depth.ts` | 52 | Pure painter's-order comparison, rectangle overlap and occlusion test for isometric objects. |
| `src/iso/projection.ts` | 134 | Pure isometric math: grid/screen projection, screen-direction to grid conversion, and the 8-direction (Dir8) helpers. |
| `src/levels/index.ts` | 9 | Registry of the arcade levels. |
| `src/levels/level1.ts` | 248 | Level data for 1.0 The Green Zone: the procedurally painted park map, its main road and the level definition. |
| `src/main.ts` | 103 | Entry point. It initializes the Pixi Application (WebGL, nearest sampling, ticker stopped, Pixi events off) and preloads the pixel font, environment textures and title art. Then it creates Game and Flow, wires the Android back event, routes debug URL parameters and installs the window.\_\_sv automation hook. |
| `src/scenes/couchScene.ts` | 229 | COUCH card pushed over the title: a read-only paper card summarising the saved story (next scene, per-level progress cells, the four meters, book counts, Green Zone best, play time). It reads the save itself at construction and closes on CLOSE, a tap outside, a continue key or Back. |
| `src/scenes/flow.ts` | 369 | App-lifetime controller of the top-level game flow: title (with blurred Green Zone backdrop), NEW GAME/CONTINUE/OPTIONS/COUCH/GLOSSARY/QUIT, the Green Zone walk (1.0) with briefing, pause, level end and game over, and the bridge into StoryFlow. Also owns Back/auto-pause dispatch, sound/text-speed/art setting toggles and the end-of-walk score assembly and record save. |
| `src/scenes/gameScene.ts` | 349 | The Green Zone walk (story 1.0) scene: builds the World stage from level data, wires Rules/Threats/Ambush systems, GameFx, HUD, touch controls, attack banner and shout; runs the fixed-step simulation and the per-frame visuals (exit ring/label, magnet rings, attack glitch filter, HUD radar view-model). Exposes debug helpers used by automation. |
| `src/scenes/glossaryScene.ts` | 171 | GLOSSARY card pushed over the title: a paper card with the dictionary entry for 'supervillain, supervillained', whose verb is circled by a hand-drawn red ring that animates in. Closes on CLOSE, a tap outside, a continue key or Back. |
| `src/scenes/overlays.ts` | 962 | Grab-bag of nine menu-like overlay scenes sharing an abstract Overlay base: the title page (logo, animated portrait, disco lights, menu, lives counter, publisher link), the Green Zone briefing, the walk's pause menu, level end, game over, OPTIONS, CONTROLS, a yes/no confirm and the browser goodbye card, plus shared helpers (big heading factory, sound menu rows). |
| `src/scenes/spriteViewerScene.ts` | 94 | Debug page (?debug=sprites&char=...) that shows every animation of one character in all eight facing directions in a grid, with a pure exported layout function. |
| `src/scenes/supervillainedScene.ts` | 150 | The 'You've been supervillained' snap shown at the end of every level (the walk and story levels): the logo scales in with a flash, shake, halo and a burst of sparkle/star sprites, then calls onDone after SV.HOLD or a tap. |
| `src/story/autopilot.ts` | 276 | The automated player for `npm run playtest` and `?auto=1`. It plays through the real inputs (input.override, trigger, pushTap), picks choices by policy, and steers Zampano along a grid Dijkstra path that avoids danger. |
| `src/story/carry.ts` | 52 | Script steps carry(text)/dropCarried() that show a yellow label over Zampano's head for something he carries. The label is a tiny Entity that follows the player. |
| `src/story/combat.ts` | 409 | BARK, SWORD and SHIELD inside story walks. With a FightDef, foes chase and swing, Zampano has hearts, foes are routed, and a knock-down restarts the walk. It also draws the sword arc, bark ring, shield, windup rings and HP pips. |
| `src/story/dialogueGestures.ts` | 30 | Pure rule: when a speaker's line starts, an idle on-stage human actor whose portrait matches plays its 'bark' clip as a speaking gesture. |
| `src/story/maps.ts` | 710 | The story stages as ASCII level data (STORY_MAPS) and their chapter palettes (THEMES), with a pure helper that overlays a paving motif on flat stages without changing topology. |
| `src/story/minigames/action.ts` | 394 | Three action mini-games drawn in screen space: LaddersGame (5.2 siege-ladder climb), TugGame (7.1 / 7.7 mash, lost by design) and BoatGame (4.2 ease a skiff alongside), each with an autopilot strategy. |
| `src/story/minigames/index.ts` | 4 | Barrel that re-exports the mini-game API (mini, MiniGame, MiniResult, RhythmGame, parade, rowing, weeping, WEEPING, BoatGame, LaddersGame, TugGame, LetterGame, RumourGame) for the chapter scripts. |
| `src/story/minigames/miniGame.ts` | 89 | The mini-game contract (abstract MiniGame with a root Container, layout, start, update -> result, optional pilot) and the Step that hosts one over the stage: mount, hide the stage, apply won/lost effects, retry, unmount. |
| `src/story/minigames/rhythm.ts` | 234 | The beat game RhythmGame: cues scroll to a hit line and the player presses on the beat. Choice mode picks the right gesture of two; single mode presses every beat. Its content factories (weeping, parade 4.1, rowing 4.3) set it up per scene. |
| `src/story/minigames/words.ts` | 377 | The word mini-games and their tap+keyboard button picking: KeyCursor (pure, tested highlight), ButtonPicker (taps, arrows, confirm), WordGame base, LetterGame (5.4 the barons' letter) and RumourGame (6.2 put garbled news in order), with their text content. |
| `src/story/names.ts` | 121 | Story text lexicon (the cast and historical NAMES, the period OLD_WORDS) and pure helpers that turn a string into coloured PixelText spans: names in yellow in cards, period words in amber in the dialogue box. |
| `src/story/screens.ts` | 442 | Five full-screen story Scenes plus a row type: a generic tap-to-continue card, the level select, one level's sub-level list, the story pause menu, and the paginated Meraviglia book. |
| `src/story/step.ts` | 36 | The story engine's contract: the Step interface every script beat implements (start, fixed-step update, stop, resume, pilot) and ResumeStep, which continues a step after an interrupt. |
| `src/story/steps.ts` | 353 | The script vocabulary: Step classes for dialogue (say/ask), cards, and many one-shot call() factories (stage, actors, movement, campaign effects, HUD objective, sound, shake, flash, emote) that chapter scripts compose into arrays. |
| `src/story/storyFlow.ts` | 405 | The campaign's navigation and commit controller: menu -> level card -> sub-level card -> StoryScene -> Professor aside -> next level -> ending. It owns the committed CampaignState, starts each attempt on a copy, saves on finish or skip, and runs the pause menu and the autopilot log. |
| `src/story/storyScene.ts` | 494 | The Scene that runs a sub-level's Step queue over an isometric World stage. It is also the god-context every step, walk, mini-game and combat uses: stage and actor registry, touch controls and action modes, campaign effects and notices, screen fx (flash, visor, fog, bleach), the HUD/dialogue/card widgets, the fixed-step update, the render overlay and debug hooks. |
| `src/story/ui.ts` | 410 | The story's in-scene UI widgets: the speaker table (names, colours, portraits), DialogueBox (typewriter line, portrait, choice list with keyboard/tap picking), CardLayer (big centred card text) and StoryHud (title, objective, three meters, mode bar, MENU button). |
| `src/story/walk.ts` | 667 | The dream-walk Step (reach, collect, stealth, pace/nerve, thirst, scramble, fire, fight) and its data schema, plus the floating pickup entity, sight-line rules, goal/arrow drawing and the walk's autopilot strategy. |
| `src/systems/ambush.ts` | 247 | Runtime side of Bagnaskiz's band ambush in the Green Zone walk: drives AmbushDirector signals, spawns band Actors off-screen, makes them circle, bark and poop around Zampano, then flee and despawn. |
| `src/systems/ambushEntry.ts` | 76 | Pure placement geometry for the ambush: whether a band member can stand at a point, whether a straight run is clear, and where to enter just outside the view. |
| `src/systems/ambushLogic.ts` | 148 | Pure state machine for the band ambush (waiting, voices, jump, scare, leave, done) driven by route progress; returns signals per step. |
| `src/systems/combat.ts` | 105 | Pure fight rules: foe state, sword arc test, damage/stagger, a foe's swing cycle, openness and shield blocking. |
| `src/systems/lives.ts` | 17 | Pure rules for the title's lives counter: clamping, cycling to the next value, and the walk speed penalty per extra life. |
| `src/systems/needs.ts` | 177 | Pure bodily-need meters for Zampano in the Green Zone walk: hunger, hidden digestion with poop warning, bladder charges with drinking, and running energy. |
| `src/systems/placement.ts` | 221 | Deterministic spawn placement: treat trails along the shortest path or a designed route plus side-lane treats, route geometry helpers, and a random walkable spot finder. |
| `src/systems/rules.ts` | 263 | Core Green Zone walk rules: needs, treats, digestion/poops, pees and marking, drinking, pollution cleaning, lives, scoring and exit; also reads input and drives the player's movement step. |
| `src/systems/scoring.ts` | 51 | Pure scoring math for the Green Zone walk (stars from zone health, final health penalty, time and star bonuses), the per-run stats record, and score/time text formatters. |
| `src/systems/threatLogic.ts` | 148 | Pure helpers for threats: bark cone test, ball magnet pull, critter flee direction sampling, and two directors (pollution waves by progress, 'under attack' event with hysteresis). |
| `src/systems/threats.ts` | 274 | Green Zone threats and bonuses at runtime: cat and ball spawning and stepping, ball magnet pull and fetch penalty, Zampano's bark with delayed hits, Bagnaskiz's under-attack event and pollution waves. |
| `src/ui/attackBanner.ts` | 65 | The 'GREEN ZONE / UNDER ATTACK' HUD banner: a big flashing title at the start of the attack, then a small blinking reminder with a hint, and 'ZONE SAVED!' at the end. |
| `src/ui/card.ts` | 56 | Paper-card helpers for the title's GLOSSARY and COUCH cards: ink and paper colours, text measuring, faux bold, the card frame and a small framed button. |
| `src/ui/discoLights.ts` | 155 | The title backdrop's disco lights on the intro music's beat: sweeping beams, mirror-ball specks, a coloured wash or white strobe each beat, and a darkening veil. Also holds the pure beat-following and light-level maths. |
| `src/ui/hud.ts` | 249 | The Green Zone's retro neon HUD: stats box with stars, lives and face, hunger bar, MENU button, radar, score, zone, time and level boxes. |
| `src/ui/logo.ts` | 80 | The SUPERVILLAINED title logo: a narrow 6x7 bitmap lettering drawn into a cached canvas texture at an integer scale, with glow, shadow, outline and a three-band gradient. |
| `src/ui/menu.ts` | 118 | A vertical list of retro buttons, driven by taps (hit test on release) and the keyboard (up/down plus consumeContinue). |
| `src/ui/pixelFont.ts` | 151 | Builds the 1-bit bitmap font atlas at runtime from the bundled Press Start 2P (with an IPA schwa and borrowed marks) and holds it as a module singleton. |
| `src/ui/pixelText.ts` | 275 | Crisp pixel-text Sprite. The text is baked into its own canvas texture (outline, 1-px glow, drop shadow, per-span colours, word wrap, justify) and re-rendered only when the content or style changes. |
| `src/ui/retro.ts` | 69 | The retro neon palette C (hex strings) and Graphics helpers: hex parse, a crisp 1-px frame, the double-bordered HUD box and the hunger gradient. |
| `src/ui/shout.ts` | 120 | The big comic-book sound word over the walk (the band's NOW!): a white flash, then the word at the largest whole scale that fits, on a jagged red-and-yellow burst. It punches in, holds while shaking, and blows away. |
| `src/ui/titleAnim.ts` | 208 | Decodes the title's animated Zampano portrait (an animated WebP) frame by frame with WebCodecs ImageDecoder. Each frame is cropped to the dog, scaled, given crisp alpha and cached per width. TitlePlayer plays the frames with their delays and never runs ahead of the decoder. |
| `src/ui/titleArt.ts` | 73 | Loads the 'You've been supervillained' logo PNG once and returns it scaled to an exact width, halved step by step with crisp alpha, as a cached texture. Despite the name, it serves the level-end snap, not the title. |
| `src/ui/touchControls.ts` | 479 | On-screen touch controls: floating joystick, PEE / action / RUN buttons, pee-charge droplets, RUN energy ring, the action-mode switcher, and the gesture hints and streak. Mirrored for left hands. It also owns the Input hit areas and button enable states. |
| `src/world/level.ts` | 223 | Level definition types (palette, spawns, events, sources), the engine-facing LevelData shape, and the ASCII map parser and loader. |
| `src/world/map.ts` | 353 | GameMap, the pure runtime map model: collision, pollution field, zone health, BFS progress, and the dirty set the renderer reads. |
| `src/world/mapRenderer.ts` | 265 | The Pixi ground renderer: chunked tile sprites with culling, animated tiles, and pollution and fresh-highlight overlays. |
| `src/world/tiles.ts` | 180 | Ground types, prop kinds with their collision and visual flags and sprite keys, the ASCII legend, the walkability rule and the poop-surface type. |
| `src/world/world.ts` | 204 | World, the shared isometric stage (map, renderer, layers, camera, entities, player). It has fixed-step hooks and a per-frame render that culls, fades occluders and depth-sorts. |

## Appendix B. The three proposals

The judge built on "faithful" and grafted ideas from the other two (section 8).

### faithful (score 8, 290 files)

Read-only blueprint for src/ at HEAD 0090696. The four groups you named (config/, core/, entities/, ui/) hold everything that honestly fits them. Three extra top-level folders hold what fits none of them: systems/ (Pixi-free gameplay rules: needs, scoring, the map model, steering, combat rules, campaign meters), story/ (the script runtime: step runner, walks, fights, mini-game logic, autopilot) and content/ (chapter scripts, the Green Zone level, story stages and palettes, story prose). Seven current folders go away. assets/ moves to core/assets. iso/ splits into core/math and core/stage. world/ splits into systems/world, core/stage and entities/stageDressing. fx/ is shared out among core/render/filters, core/scene, core/audio, entities/effects, ui/effects and core/flow/greenZone. scenes/ moves to ui/screens and core/flow. levels/ and campaign/ split into content/, systems/campaign and core/save.

Entities become `class X extends Entity extends PIXI.Container`. update(dt, ctx) runs at the fixed 60 Hz step and only does logic: it never writes display state. render(alpha) handles interpolation and writes to the view. Movement and steering math moves into pure functions in systems/motion. Input reaches entities only as a PlayerIntent, built once per step. config/ becomes a folder of files that import nothing, behind config/index.ts, so every `from '../config'` keeps working. It gains colors.ts (the palette C plus about 40 colour tokens now written inline) and the UI, FX and audio dimensions that are inline today.

The layers form a strict one-way chain: config, then core/math and util, then the asset manifest, systems, the core runtime, entities, ui, story, content, and finally core/flow as the composition root. A new Vitest test that scans imports checks this. The things that must keep working do: the fixed-step loop, the localStorage keys, CampaignState v2 (no STORY_VERSION bump), and every window.\_\_sv member, class name and field the scripts read. The migration takes 17 steps, each a move with a temporary re-export plus a codemod, and npm run build and npm test stay green after each one.

Folders:
- `src/config/` (config): Every tuning number, colour and dimension, split by domain, with no imports at all. index.ts re-exports everything so the existing 71 src and 15 test imports of '../config' resolve unchanged.
- `src/core/app/` (core): App startup services: the Game service hub, the fixed-step GameLoop, viewport maths, app lifecycle listeners and the native bridge.
- `src/core/math/ + src/core/util/` (core): Pure leaf helpers that almost every module needs: iso projection, depth order, geometry, Rng/hash2, Emitter, colour packing. Only config sits below them.
- `src/core/assets/` (core): Asset loading: the texture registry and atlas ownership, the sprite manifest (pure data, which ASSETS.md points to), building character, sprite and level textures, the environment art banks, procedural placeholders, the font file, and the decoders for the title portrait and logo.
- `src/core/audio/` (core): The audio engine together with its synth, file manifest and patch tables. This removes today's core -> fx inversion.
- `src/core/input/` (core): Raw DOM input, pure gesture rules, the touch layout (which hit areas Input owns), and the PlayerIntent builder (the input controller).
- `src/core/render/` (core): Rendering services: render-group layers, GPU disposal, GLSL filters, and the pixel-font text rasterizer. Entities need text (popups, the carried label), so text sits below entities.
- `src/core/scene/ + src/core/stage/` (core): Scene management: the scene stack and screen transition, plus the gameplay stage's scene graph (World, ground renderer, camera). World no longer creates entities, so it can sit below entities/.
- `src/core/save/` (core): State persistence: guarded storage, settings and setting actions, Green Zone records, and the campaign save and its v1 migration. Keys and format are unchanged.
- `src/core/flow/` (core): Scene and state flow at the top of the graph (the composition root): Flow, title, walk and story flows, the Green Zone scene and its event bindings, bootstrap, URL params and window.\_\_sv. Only main.ts imports it.
- `src/entities/` (entities): World objects as Entity extends Container, with update(dt, ctx) at the fixed step and render(alpha) for interpolation: player, actors, critters, items, props, pickups, the carried label, plus the entity factory and stage dressing.
- `src/entities/effects/ + src/entities/markers/` (entities): World-space effects and walk markers that follow the same Container + update/render contract: particles, popups, rings, bark waves, bubble, exit marker, sight cones, goal rings, flames, combat markers.
- `src/ui/` (ui): HUD, menus, buttons and the screens built from them: widgets/, text/ (markup, formatters, logo), hud/, story/ (dialogue, cards), touch/, effects/ (shout, disco, screen overlay), minigames/ (board views), screens/ (title, overlays, cards, story menus, debug).
- `src/systems/` (extra: pure rules): Fits none of the four. Gameplay rules with no Pixi and no DOM, unit-tested: map model and collision, Green Zone needs/threats/ambush/scoring, motion and steering, sight, pathfinding, combat rules, campaign meters and progression. They are not app infrastructure, not Containers, not UI and not bare numbers.
- `src/story/` (extra: story engine): Fits none of the four. The script runtime the chapters are written against: Step contract and runner, StoryScene/context, the step vocabulary, walk objectives, the fight controller, mini-game logic, and the autopilot that plays them through the real inputs.
- `src/content/` (extra: content): Fits none of the four. CLAUDE.md classes chapter scripts, coordinates, map ASCII, palettes and story prose as level data, not config: chapters ch1-ch8, the Green Zone level, story stages and themes, speakers, lexicon, mini-game texts.
- `src/main.ts` (core (entry)): Shrinks to a single boot() call into core/flow/bootstrap.ts, keeping the module-load side effect and the #boot error reporting.

### separation (score 6, 278 files)

Blueprint for splitting src/ along a separation-of-concerns line. The four groups you named become config/, core/, entities/ and ui/, and four more top-level folders hold what fits none of them: sim/, modes/, content/ and debug/. The ordering principle is that input becomes intents, intents feed a pure simulation, and the simulation feeds views.

- **Input:** raw devices stay in core/input. Small controllers turn the device state into intents: PlayerIntent, plus the Green Zone and walk action intents.
- **Simulation:** every gameplay rule and all movement and physics math goes in sim/. It imports nothing from pixi.js or the DOM, and it takes an Rng instead of calling Math.random.
- **Entities:** every world-space display object is a class in entities/ that extends PIXI.Container. Its fixed-step update(dt) only calls sim functions on its own fields. Its render(alpha) is the only place that writes position, texture, tint or Graphics.
- **UI:** every screen-space display object goes in ui/: widgets, HUDs, touch controls, mini-game views and the scenes built from them.
- **Render groups:** world space and screen space become two render groups per scene (World and the ground renderer are their own groups). This is the structural fix for the single-render-group findings (game.ts:87, world.ts:164). A static-vs-dynamic Graphics helper, core/render/redraw.ts, replaces the per-frame clear() calls that category 3 lists. Because of this split, fx/ no longer needs to exist.
- **Content:** chapter scripts, level data, maps, themes, the lexicon, speakers and mini-game presets go in content/. Content imports only the story script API, and main.ts injects it into the modes, so the engine never imports content.
- **Config:** src/config.ts becomes src/config/ with an index barrel, split by domain: display, colors, input, ui, fx, audio, greenZone, motion, story, campaign and debug. Sprite tables, placeholder art, themes, level data, text and storage keys are deliberately left out of config.
- **Unchanged:** the fixed 60 Hz loop, the save format (supervillained:\* keys, CampaignState v2) and every name that window.\_\_sv and scripts/\*.mjs read.
- **God files:** the ten large files are all split; the file list says which functions and variables go where.
- **Migration:** a 14-step order keeps npm run build and npm test green at each step. It uses re-export shims at the old paths, except for the five vi.mock targets (pixelText, core/assets, assets/build, glitchFilter, and the pixi.js mock shape), which must be updated in the same commit as their move.

Folders:
- `src/config/` (Config): The one home for magic numbers, colours, speeds and dimensions, split by domain, with an index.ts barrel so every existing `from '../config'` import keeps working. It is a leaf: it imports nothing.
- `src/core/math/, src/core/util/` (Core (pure foundation)): Pure maths and helpers with no Pixi and no DOM: iso projection, depth, rng, geometry, emitter, colour parsing. Everything else can import them, which removes today's inversions (core->assets/placeholders/pixel, core->systems/lives).
- `src/core/app/, src/core/scene/, src/core/state/` (Core (app init, scene and state management)): The user's 'Core'. app/ holds boot, Game, loop, viewport, lifecycle and render layers. scene/ holds the Scene contract, the stack, a SceneBase with render groups and owned-resource disposal, and the transition scheduler. state/ holds storage, settings, records and the campaign save.
- `src/core/input/` (Core (input devices and controllers)): Raw DOM devices (keyboard, pointer, joystick, gestures) feed one Input facade. controllers/ turns device state into intents. Nothing below modes/ reads Input, so the category-4 input+physics coupling cannot come back.
- `src/core/assets/, src/core/audio/, src/core/render/, src/core/platform/` (Core (asset loading, audio, render primitives, native)): The user's 'Asset loading'. It holds the texture registry with atlas ownership, the manifest, texture builders, placeholder drawers, environment banks and image loaders. It also holds the audio engine and its tables, and the render primitives that both entities and ui need (PixelText, filters, redraw helper). The Capacitor bridge is here too.
- `src/sim/` (Extra: pure simulation (fits none of the four)): Every gameplay rule and all movement, physics and AI maths: map model, motion and steering, player motion and needs, combat rules, Green Zone rules and threats, walk objectives, mini-game simulations, campaign rules. It has no pixi.js, no DOM and no Math.random, so it can be unit-tested without mocks. This is where the category-4 maths goes.
- `src/entities/` (Entities): Every world-space display object: classes that extend PIXI.Container, with update(dt) for logic and render(alpha) for interpolation and view writes. It includes the stage (World, MapRenderer, Camera) and the world-space fx (particles, popups, rings, walk and combat views), so the old fx/ and world/ folders go away.
- `src/ui/` (UI): Every screen-space display object: widgets (menu, buttons, paper card), text markup and formatters, touch controls, HUDs, story dialogue and cards, screen-space fx (shout, screen overlay, sparks), mini-game views, and the Scene screens built from them (title, overlays, couch, glossary, story menus, book).
- `src/modes/` (Extra: mode controllers (fits none of the four)): The Scenes that compose sim + entities + ui and own the input-to-intent step. greenZone/ is the 1.0 walk. story/ is the story engine: runner, stage, controls, steps vocabulary, walk, combat and mini-game glue. Next to them sit the top Flow facade, the title flow and the settings actions. One extra folder instead of separate story/, scenes/ and greenZone/.
- `src/content/` (Extra: content and level data (not config)): Chapter scripts, Green Zone level data, ASCII story maps, chapter themes, lexicon, speakers, card prose, marvels and mini-game presets. Per CLAUDE.md, per-scene values are level data, not config. Content imports only the story script API and config colour tokens. main.ts injects it, so the engine never imports it.
- `src/debug/` (Extra: debug and automation tools): The autopilot, playtest log, sprite viewer, window.\_\_sv hook and debug URL routing. Only main.ts imports it, and the autopilot loads dynamically, so it leaves the production bundle. The engine reaches it only through the PilotApi interface.
- `src/main.ts` (Composition root): Thin entry: core/app/boot, new Flow(game, content), installAutomationHook, routeDebugParams. It is the only file that sees every layer.

### pragmatic (score 7, 172 files)

Blueprint for a low-risk migration (HEAD 0090696). The goal is to reorganise src/ into the four groups you asked for without breaking the game, the 521 tests, smoke, playtest or window.\_\_sv. No existing top-level folder goes away. Only two are new: config/ (the split of config.ts plus a colour palette) and debug/ (URL routing, the \_\_sv hook, the sprite viewer).

The four groups:
- **core/** gets sub-folders: app (Game, loop, display, renderer init, lifecycle, settings controller), assets (texture registry, atlas, character/sprite/level textures, environment banks, font, title images), scene (Scene, SceneManager, BaseScene, a Transition interface), state (storage, settings, records), input (Input split, plus intent polling), audio (engine plus the sound data that sits in fx/ today), platform (native) and util (rng, Emitter, maths, colours, PixelBuffer, text formatters).
- **entities/** classes extend PIXI.Container. They keep the project's fixed-step model: update(dt) is logic and runs at 60 Hz; render(alpha, frameDt) only copies state to display objects. Movement, steering and sight become pure functions in systems/. Input reaches entities only as intents polled once per step by the scene that owns them.
- **ui/** keeps its flat widget kit (pixelText, retro, menu, card, logo) and gains hud/, touch/, story/, title/ and screens/. The 962-line overlays.ts, the story screens, the story widgets and the touch controls split into these.
- **config/** has one file per domain (display, input, actors, greenZone, story, combat, minigames, ui, fx, audio, colors, debug) behind a barrel, src/config/index.ts, so every `from '../config'` import keeps working.

Code that fits none of the four keeps a named home:
- systems/: pure rules only. Rules, Threats and Ambush spawn entities, so they move up to scenes/greenZone/.
- story/: the story engine, split into steps/, walk/, combat/, scene/, minigames/ and maps/.
- campaign/: pure campaign model, rules and save at its root; chapter scripts in campaign/chapters/.
- levels/: Green Zone level data.
- iso/ and world/: pure maths and the map model. The Pixi stage moves to world/stage/.
- fx/: effects and filters.
- assets/: art data (manifest, placeholder drawers, fonts).
- scenes/: composition (Flow, GameScene).
- debug/.

Two mechanisms keep each step safe:
- **`git mv X.ts X/index.ts`**: import strings and vi.mock ids keep resolving after the move.
- **An architecture test**: a Vitest test with an allow-list enforces the acyclic layer table and keeps pixi.js out of pure code.

The save format and the localStorage keys do not change, so STORY_VERSION stays at 2. Every \_\_sv name, scene/class name and runtime field that the scripts read is kept.

Folders:
- `src/config/` (Config): The user's Config group. It splits src/config.ts (752 lines, 31 frozen blocks) by domain. It is also the first home for colours and for the layout/visual numbers that are inline across ui/, fx/, scenes/ and story/ today. It imports nothing (it is the leaf of the graph). src/config/index.ts is the barrel, so the 71 src and 17 test imports of '../config' do not change.
- `src/core/app/` (Core): App initialisation: Game (the service hub), the fixed 60 Hz loop, the viewport, Pixi renderer init (taken from main.ts), app lifecycle listeners (taken from Flow) and the one SettingsController that changes settings.
- `src/core/assets/` (Core): Asset loading. It holds the texture registry (git mv of core/assets.ts to index.ts, so the vi.mock id is unchanged), atlas packing and ownership, the boot/character/level texture builds (from assets/build.ts), the environment art banks (from assets/environment.ts), the pixel font loader, and the animated title image and supervillained logo loaders.
- `src/core/scene/` (Core): Scene management: the Scene contract and the SceneManager stack, a BaseScene that destroys its filters and Graphics in one place, and a Transition interface, so core no longer imports fx/transition.
- `src/core/state/` (Core): Generic persistent state: guarded localStorage, the Settings model, Green Zone records and coins. The campaign save stays with the campaign model, because core must not depend on story content.
- `src/core/input/` (Core): Raw devices (keyboard, pointer, gestures) behind the existing Input facade, plus intent.ts: the controller layer that turns Input into per-step intents for systems and entities.
- `src/core/audio/` (Core): The WebAudio engine together with its data: the synth, the SOUNDS patches and the ?url audio file table. This removes the core-to-fx inversion.
- `src/core/platform/` (Core): The Capacitor bridge (QUIT, openUrl): the only path from game code to native code, as CLAUDE.md says.
- `src/core/util/` (Core): Pure, Pixi-free helpers that every layer may use: rng, Emitter, maths/Point, colour helpers, PixelBuffer, text formatters.
- `src/entities/` (Entities): World objects as Entity subclasses that extend PIXI.Container: update(dt, ctx) is fixed-step logic and render(alpha, frameDt) does the display writes. CharacterAnimator, ZampanoView and FigureView are view components inside entities, not entities themselves.
- `src/ui/ (root files)` (UI): The widget kit: PixelText, retro boxes, Menu and its pure model, paper-card helpers, logo, markup, ButtonPicker and ButtonList, the Overlay base, the shout. fx/ and entities/ may import these primitives and nothing else from ui/.
- `src/ui/hud/, src/ui/touch/, src/ui/story/` (UI): In-scene widgets: the Green Zone HUD (radar, hunger bar, attack banner), the touch controls split into layout, input binding, view and icons, and the story's DialogueBox, CardLayer, StoryHud, NoticeStack and off-screen arrow.
- `src/ui/title/, src/ui/screens/, src/ui/screens/story/` (UI): Screens built from the widgets. TitleScene and its parts; Briefing, Pause, LevelEnd, GameOver, Options, Controls, Confirm, Goodbye, Couch, Glossary and Supervillained; the story menu, chapter list, pause, card and book. These may also import fx/ (filters, disco lights).
- `src/systems/` (none: pure gameplay rules): Pixi-free, entity-free and unit-tested: needs, scoring, lives, combat, threatLogic, ambushLogic/Entry, placement, plus new files for player motion, steering, sight, pathfinding, barriers, costumes and the Green Zone events. Entities call these functions. The three runtime directors that create entities leave this folder.
- `src/world/ and src/world/stage/` (none: map model and iso stage): world/ is the pure map model (level types and parser, tiles, GameMap, mapPatterns). world/stage/ holds the Pixi stage (World, MapRenderer, decor), which creates entities. With that split, entities can depend on the map model while the stage depends on entities, with no cycle.
- `src/iso/` (none: pure isometric maths): Unchanged. projection, depth and camera are a dependency-free maths leaf imported by about 25 files, including the art drawers.
- `src/assets/` (none: art data): What the art is, not how it is loaded: the sprite manifest (ASSETS.md workflow), animation timing, the procedural placeholder drawers and fonts. These are pure CPU data and need no Pixi. The loaders move to core/assets.
- `src/fx/` (none: visual effects): Particles, popups, the Green Zone fx (split into ring layer, bark waves, footsteps and bubble), the screen overlay (flash/visor/fog/bleach), sparks, disco lights, glitch filters, the transition and the event-to-audio binding.
- `src/story/` (none: story engine): The Step contract and vocabulary, the StoryScene facade and its runner/stage/controls, StoryFlow, walks, combat, mini-games, the autopilot (part of the Step contract through pilot()) and the story stage data (story/maps, read by the engine; CLAUDE.md names it).
- `src/campaign/ (root) and src/campaign/chapters/` (none: content and campaign model): The root holds the pure campaign model, rules and save (state.ts stays as the barrel) and pure story data the engine reads (speakers, lexicon, mini-game texts, marvels, titles, home objects). chapters/ holds the scripts (level data). Scripts import the engine; the engine never imports chapters/.
- `src/levels/` (none: level data): Unchanged. The Green Zone level (1.0) and its registry. main, flow, couch and tests/level import it as the directory '../levels'.
- `src/scenes/ and src/scenes/greenZone/` (none: composition): The app's flow controllers (the Flow facade over titleFlow and walkFlow) and the Green Zone walk scene with the runtime directors Rules, Threats and Ambush. These compose ui, fx, entities, world and systems, so they sit near the top of the graph.
- `src/debug/` (none: debug tools (new)): URL routing (?debug, ?level, ?auto, ?as, ?skip, ?story), the window.\_\_sv automation hook and the sprite viewer. Only main.ts imports it.
- `src/main.ts` (root): Composition root and Vite entry (index.html loads /src/main.ts). It is the only module that may import everything. It injects the concrete fx transition into Game and the chapter registry into StoryFlow, and installs debug hooks.

