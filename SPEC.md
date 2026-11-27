# SUPERVILLAINED — Prompt for Claude Code

Build **SUPERVILLAINED**, a 2D isometric arcade game for browser and Android, **without a game engine**. The protagonist is **Zampanò**, a Maltese dog going for a walk in a park. The game originates from a video I shot: real footage of my dog overlaid with a retro video game HUD. In the `reference/` folder, you will find several frames from the video: look at them before starting, especially for the HUD.

Work in milestones (see bottom). Before writing code, read this entire document and propose a brief plan to me. Then proceed without asking me for confirmation at every step: only stop if you are truly stuck, and log the decisions made in `DECISIONS.md`.

---

## 1. Technical Constraints

- **No game engine**: no Phaser, Godot, Unity, Babylon, or similar. We will write the game loop, input, scenes, collisions, and isometric math ourselves.
- **Stack**: TypeScript (strict) + Vite. For rendering, use **PixiJS** (latest major version), used strictly as a WebGL graphics library. If Canvas 2D is simpler for a specific part at some point, that is fine.
- **Testing**: Vitest for pure logic (isometric math, game systems). Playwright for verification screenshots.
- **Android**: Capacitor, but only in the final milestone. Until then, the game runs in the browser, including on a phone over the local network (`vite --host`).
- **Zero mandatory assets**: all placeholder graphics are generated via code (textures created at runtime) and sounds are synthesized using WebAudio. The game must work right after cloning with `npm install && npm run dev`.
- **Offline**: no runtime resources from CDNs. The font must be bundled in the project.
- **Performance**: 60 fps on a mid-range Android device. Pixel-perfect (nearest-neighbor scaling), low logical resolution scaled to full screen.
- **Minimal dependencies.** Any additional library must be justified in `DECISIONS.md`.
- Game text **in English** (as in the video), code and comments in English.

## 2. Suggested Architecture

```
src/
  main.ts
  config.ts          ← ALL tuning numbers (speeds, timers, thresholds, scores)
  core/              ← fixed-timestep game loop, input (touch + keyboard), assets, audio, scene manager, storage
  iso/               ← grid↔screen projection, depth sorting, camera
  world/             ← map, tiles, level loading
  entities/          ← Zampanò, treat, cat, ball, Bagnaskiz, pollution, etc.
  systems/           ← hunger, digestion, bladder, zone health, spawner, events
  ui/                ← HUD, virtual joystick, buttons, overlays, menus
  fx/                ← particles, pixel popups, glitch/CRT filter, screen shake
  scenes/            ← Title, Briefing, Game, Pause, LevelEnd, GameOver
  levels/            ← level data
tests/
reference/           ← video frames (for reference only, excluded from build)
```

Simple and readable, no over-engineered ECS. Also create a `CLAUDE.md` with architecture, conventions, and commands so future sessions can jump right in.

## 3. Isometry

- 2:1 diamond tiles (e.g., 32×16 at logical resolution).
- World positions in floating-point grid coordinates (`gx`, `gy`). Conversion: `sx = (gx - gy) * TW/2`, `sy = (gx + gy) * TH/2`. Conversion functions tested in both directions.
- **Depth sorting** by `gx + gy` of the footprint/contact point, with a stable tie-breaker. Tall objects (trees, bushes, poles) have their anchor at the base. Zampanò must be able to walk behind trees: when occluded, the tree becomes semi-transparent.
- **Movement**: the joystick direction is in *screen space* (up = up on screen), then converted to grid space. This is crucial for game feel.
- **Camera**: follows Zampanò with a slight lag (like the handheld camera in the video), clamped to the map borders.

## 4. Levels

Easy-to-handwrite level format: an ASCII map plus metadata in a TS or JSON file.

```
. grass   = path   T tree   B bush   P pole/lamppost
W puddle/drinking fountain   S start   E exit   # unwalkable border
```

Metadata: zone name, level number, palette, spawn frequencies, event durations. First level: **Level 1 — Green Zone**, a dirt path running through a park with lawns, trees, and bushes (like in the video), about 2–3 minutes of walking long. The loader must be written so that a Tiled import (isometric, JSON) can be added later, though it doesn't need to be implemented now.

## 5. Game Design

The briefing text in the video summarizes the rules: *"MAKE A WALK. COLLECT ENOUGH TREATS TO COMPENSATE THE HUNGER. PEE ENOUGH TO COMPENSATE THE POOPS AS TOO MANY POOPS CAN ENDANGER THE ENVIRONMENT OF THE ZONE YOU ARE PLAYING IN. CATS MEAN MONEY. DON'T GET DISTRACTED BY THE BALLS."*

**Level Objective**: guide Zampanò from the start (S) to the exit (E). The timer counts up, like in the video. At the end of the level, stars (0–5) rate the health of the zone.

**Hunger**
- 0–100 bar that depletes over time (faster if Zampanò is running).
- **Treats** (bones) are scattered over the whole park in small groups, like the rings of a Sonic level (short rows, arcs, little circles and diamonds, a few alone): +hunger, +points, TREATS +1. Level 1 has 160.
- If hunger reaches 0, Zampanò loses a life and the bar refills halfway.

**Digestion → Poops**
- Each treat fills a hidden digestion meter. When full, a warning appears (icon above head, ~3 seconds) and then Zampanò poops automatically. The meter fills slowly (a poop every ~29 treats): eating all 160 treats of Level 1 makes 5 poops.
- During the warning, the player can reposition him: pooping **in bushes or tall grass** causes little pollution, whereas **on the path** causes heavy pollution.
- Pooping leaves a **pollution** stain (tiles turning brown within a radius). POOPS +1, popup with the pixel poop icon.
- This creates the core trade-off of the game: eating is necessary for hunger, but it produces poop.

**Bladder → Pees** (territory painting, Splatoon-style)
- The **PEE button** consumes one bladder charge. Charges regenerate slowly over time and instantly when drinking at a puddle or drinking fountain (W).
- Peeing **cleans and re-greens** tiles within a radius, removing pollution. PEES +1, popup with the pixel rainbow.
- When done near a vertical object (tree, pole, bush), Zampanò lifts his leg: larger radius and bonus points ("marking").

**Zone Health and Stars**
- Zone health = percentage of clean tiles in the playable area, with a penalty if PEES < POOPS at the end of the level.
- The 5 stars in the HUD display health in real time, including half-stars.

**"GREEN ZONE UNDER ATTACK" Event**
- Triggers when health drops below a threshold, or at a scripted moment in the level.
- Effects: large flashing text, screen glitch, palette shifting toward brown/sepia (like in the video at 0:46). Intensity depends on how unhealthy the zone is.
- **Bagnaskiz**, the bully pug, arrives: he heads toward green areas and leaves a trail of pollution.
- **BARK button**: Zampanò barks and fires a short-range sound wave (pixel arcs `)))`) that pushes Bagnaskiz back. After N hits, he flees. The attack ends when he flees and zone health is back above the threshold.
- This is the "shooter" part of the game: aiming is determined by the direction Zampanò is facing.

**Cats = Money**
- Occasionally, cats appear and run away from Zampanò (simple fleeing AI that navigates around obstacles).
- Touching them awards coins and points. Coins are saved and will be used for a future shop, which should **not** be implemented now.

**Balls = Distraction**
- Occasionally, tennis balls appear. Within a certain radius, they pull Zampanò in like a magnet, and the player must move in the opposite direction to resist.
- If Zampanò grabs the ball, a fetch animation triggers: ~2 seconds without control, hunger drops, time penalty.

**Lives**: starts with 2 (the "2x" in the HUD). At 0 lives, game over.

**Scoring**: treats, cats, marking pees, time bonus, and end-of-level zone health bonus. All values live in `config.ts`.

## 6. HUD (Faithful to the video, see `reference/`)

Retro neon style: blocky pixel font (e.g., **Press Start 2P**, OFL license, file bundled in the project). Boxes with colored double borders (yellow/red), saturated text with a slight glow. Portrait screen layout:

- **Top left**: box with `PEES:` (yellow), `POOPS:` (orange), `TREATS:` (red/pink). Values are in cyan or magenta.
- **Below**: row of 5 yellow pixel stars (zone health).
- **Top right**: lives box `2x` with Zampanò's face icon. Below it, the `HUNGER` label (yellow) and a cyan→yellow→orange/red gradient bar with a red border. Below that, the yellow `MENU` hamburger icon.
- **Bottom left**: circular radar (green background, yellow ring) with colored dots: treats, cats, balls, Bagnaskiz, exit direction.
- **Bottom**: `SCORE: 0000` in cyan on the left, zone name (`Green Zone`) in green on the right. Below that, the `TIME: 00:00` box (red border) on the left and the `Level 1` box (yellow border, pink text) on the right.
- **Touch controls** (above or integrated with the bottom HUD): virtual joystick on the left, appearing wherever you place your thumb; **PEE** and **BARK** buttons on the right, with the pee charge indicator.
- **World-center popups**: pixel rainbow (pee), pixel poop (poop), large bone with geometric particles (orange/purple/light-blue triangles, crosses, circles) when collecting a treat, floating score numbers.

## 7. Scenes

1. **Title card**: `SUPERVILLAINED` (yellow-green), large pink `Level 1` with white outline, green `Green Zone`, over the blurred level. Glitch entrance.
2. **Briefing**: the rules text in uppercase pixel font, with colored keywords as in the video (green/red/cyan/yellow). Tap to start.
3. **Game**.
4. **Pause/Menu** (from the MENU button or Esc): Resume, Restart, Sound on/off, Quit to title.
5. **Level End**: time, score, pees/poops/treats, coins, stars animated one by one. Next/Retry buttons.
6. **Game Over**: Retry.

Automatically pauses when the app goes into the background (`visibilitychange`).

## 8. Visual Style

- Highly saturated colors and bright greens, matching the video footage.
- Code-generated placeholders:
  - **Zampanò**: white cloud with 3 black dots (eyes and nose), readable at ~32–48 px. A few frames for walk, pee, poop, bark, and eat are enough.
  - **Bagnaskiz**: beige/brown pug with a dark muzzle.
  - **Tiles**: grass, path, brown pollution.
- Glitch/CRT filter (RGB split, horizontal slices, scanlines) active **only** during transitions and "under attack".
- Juice: subtle screen shake, squash and stretch on Zampanò, particles.

**Final sprites**: I will produce these later (Blender/ComfyUI pipeline). Prepare an `ASSETS.md` and a manifest that allow replacing placeholders without touching game logic:
- 8 directions: N, NE, E, SE, S, SW, W, NW.
- Animations: idle, walk, run, sniff, pee (leg lifted), poop (squatting), eat, bark, fetch, hurt.
- Frame dimensions, anchor point, and file naming convention.

## 9. Audio

Chiptune sound effects synthesized with WebAudio (sfxr-style): bark, pee, poop, treat, cat, ball, "under attack" alarm, stars, game over. An optional simple music loop. Master volume and mute saved in localStorage (wrapped in try/catch).

## 10. Input

- **Touch**: virtual joystick, PEE and BARK buttons. Disable zoom, scrolling, and the long-press context menu.
- **Keyboard** for desktop testing: WASD/arrow keys to move, Space = PEE, J or X = BARK, Esc = menu.

## 11. Milestones

After **each** milestone: `npm run build` with zero errors, clean typecheck, passing tests, a Playwright screenshot of the game in `docs/screens/` that you inspect yourself to verify, and a git commit with a clear message. Then tell me in 3–5 lines what I should test on my phone.

1. **Scaffold and movement**: Vite+TS+Pixi project, isometric map from ASCII format, Zampanò moving via keyboard and joystick, camera, depth sorting with trees.
2. **Core loop**: hunger, treats, digestion and poop, bladder and pee, tile pollution and cleaning, zone health, stars, lives. Full HUD.
3. **Scenes**: Title, Briefing, Pause, Level End, Game Over, high score saving.
4. **Threats and bonuses**: cats, magnet-balls, Under Attack event with Bagnaskiz and BARK, glitch filter.
5. **Polish**: audio, pixel popups, particles, screen shake, initial balancing of values in `config.ts`.
6. **Android**: Capacitor setup, locked portrait orientation, fullscreen, placeholder icon, instructions in `README.md` to build and install the debug APK.

## 12. Out of Scope for Now

Shop, multiple levels beyond the first (though the system must support them), multiplayer, accounts and analytics, Tiled import.