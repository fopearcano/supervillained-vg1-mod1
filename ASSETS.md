# Assets: replacing the placeholders

Every sprite in the game is described in **`src/assets/manifest.ts`**. Game logic only asks for
textures *by name*; the loader (`src/assets/build.ts`) either loads your PNG or generates a
code-drawn placeholder. To drop in final art you edit the manifest — never game logic. The
manifest also holds the timing: frames per second, or per-frame holds (`frameDurationsMs`).

Put image files under `public/` (served as-is and copied into the Android build). Paths in the
manifest are relative to `public/`, e.g. `sheet: 'sprites/zampano.png'` → `public/sprites/zampano.png`.
If a file is missing or broken the placeholder is used and a warning is printed in the console.

Tip: open the game with `?debug=sprites&char=zampano` (or `bagnaskiz`, `cat`, any cast key) to
see every animation of a character playing side by side in all eight headings, N to NW (the
frames scale to fit, so no row overlaps the next).

## Pixel character cast and Bagnaskiz's eight directions

Two deliveries uploaded to main together:

- **`Supervillained_Pixel_Game_Integration.zip`** (with `Supervillained_Pixel_Animals.zip` and
  `Supervillained_Pixel_Humans.zip`, which add each character's single frames, editable source
  grids and previews): native sheets under `public/sprites/pixel-cast/`. Its installer was not
  run; its patch was read and applied by hand (see `DECISIONS.md`).
- **`Supervillained_VG1_Bagnaskiz_Normal_8_Directions.zip`** and `..._Armoured_8_Directions.zip`:
  Bagnaskiz plain and in Byzantine armour, the twelve dog actions in eight real directions.

All runtime cells are **40 × 40 RGBA**, ground anchor **(20, 36)**, rows `N NE E SE S SW W NW`.

Dedicated NPC sheets (`pixel-cast/<key>.png`, 160 × 1600): `santina`, `professor`, `doge`,
`niketas`, `fulk`, `clerk`, `abbot`, `envoy`, `bishop`, `cook`, `sailmaker`, `prince`,
`householdWoman`, `knight`, `pilgrim`, `venetian`, `greek`, and refreshed `jack`, `watson`,
`confusione`, `bagnaskizMarshal` (the French marshal), `varangian` and `marquis`. Layout: **idle 2,
walk 4, run 4, bark/gesture 2, hurt/recover 2**; running reuses the walk poses at 13 fps. On the
human cast the `bark` slot is a speaking or working gesture: `say()` and `ask()` play it once
when that character is on stage and idle (`story/dialogueGestures.ts`); walking, following and
actions under way are never interrupted, and off-stage voices and animals are left alone. The
role keys are separate: Niketas is no longer the generic `greek`, and the abbot, the envoy and the
bishop no longer share `legate`. The Professor also gets `pixel-cast/professorFace.png`
(24 × 24, his dialogue face); his pacing legs under the desk stay the 28 × 64 strip.

**Bagnaskiz** (`bagnaskiz.png`, `bagnaskiz-tired.png`) and **the emperors** (`bagnaskizEmperor`:
`bagnaskizArmoured.png`, `bagnaskizArmoured-tired.png`; Alexios III and V wear his face) come
from the 8-directions zips, in full colour: 320 × 3520 plus an 80 × 320 tired strip, the twelve
actions `idle, walk, run, sniff, pee, poop, eat, bark, fetch, hurt, sit, tired`, with Sbrimbrulòn's
timing (one-shots return to the behaviour), except that plain Bagnaskiz's hurt keeps looping
through the Green Zone stun. The cast delivery also carried 32-colour copies of these two and of
Sbrimbrulòn's sheets; they were not installed, because the reduction loses Bagnaskiz's yellow
eyes and open mouth (`tests/bagnaskizAnimations.test.ts` checks the eyes are there). Sbrimbrulòn
keeps his sheets below.

**Player-ready dogs.** `PLAYABLE_CHARACTER_KEYS`, `WorldOptions.playerSkin` and the story's
`skin()` step accept Sbrimbrulòn (plain, knight) and Bagnaskiz (plain, Byzantine armour) besides
Zampanò. The story plays as Zampanò; `?as=sbrimbrulon` or `?as=bagnaskiz` plays its scenes as
the other dog, in his own costumes (Zampanò's knight becomes `sbrimbrulonKnight` or
`bagnaskizEmperor`, and any armoured skin carries the sword and the shield).

**Reference portraits**: `assets/main-characters-id-images/` holds the main characters' ID images
(front and rear, plain and armoured) the deliveries were drawn from. Not bundled.

## Earlier delivered art
## Earlier delivered art

The game ships only the latest delivered art (in `public/sprites/`): the armoured Zampanò
animations (the knight) and the Zampanò animation integration (plain Zampanò) over sprite update 2
(the rag cross), the Sbrimbrulòn normal and armoured animations, and update 1 (the rest of the
cast). The art
each delivery replaced is kept in `art-archive/` (not bundled). The zips are kept at the repo root
as delivered (`Supervillained_VG1_Zampano_Animation_Integration.zip` has a labelled chart of every
action in `preview/actions.png` and the motion in `preview/animations.gif`;
`Supervillained_VG1_Armoured_Zampano_Animations.zip` has the knight's 256 px source sheets in
five views, their timings in `animations.json` and a contact sheet in `preview/`; the two
`Supervillained_VG1_Sbrimbrulon_*_Animations.zip` the same for Sbrimbrulòn, plain and armoured,
whose installer script and patch were not run: the integration was merged by hand).

| file in `public/sprites/` | size | what it is |
|---|---|---|
| `zampano.png`, `zampano-tired.png` | 320 × 3520, 80 × 320 | plain Zampanò: 11 animations (8-frame idle, walk, run, pee, poop, eat, sit) + tired (animation integration) |
| (`zampanoCross`) | — | the crusader costume is the knight's sheet; update 2's rag-cross sheet is in `art-archive/sprites-update-2/` |
| `zampanoKnight.png`, `zampanoKnight-tired.png` | 320 × 3520, 80 × 320 | the knight (conical helm, shoulder plates, mail coat, red cross on the back), from 2.5: the same 11 animations + tired as plain Zampanò (armoured animations) |
| `bagnaskiz.png`, `bagnaskiz-tired.png` | 320 × 3520, 80 × 320 | fawn pug, black ears, yellow eyes: twelve actions in eight directions (Bagnaskiz 8-directions; update 1's 160 × 1600 sheet is archived) |
| `bagnaskizArmoured.png`, `bagnaskizArmoured-tired.png` | 320 × 3520, 80 × 320 | Bagnaskiz in Byzantine armour, the emperors' face (`bagnaskizEmperor`) |
| `pixel-cast/*.png` | 160 × 1600 (`professorFace.png` 24 × 24) | the pixel cast above; Jack, Watson and Confusione replace update 1's |
| `sbrimbrulon.png`, `sbrimbrulon-tired.png` | 320 × 3520, 80 × 320 | Sbrimbrulòn, long-haired rust, dark and white Shih-tzu: the same 12 actions as Zampanò (Sbrimbrulòn animations) |
| `sbrimbrulonKnight.png`, `sbrimbrulonKnight-tired.png` | 320 × 3520, 80 × 320 | Sbrimbrulòn armoured (helm with nose guard, shoulder plates, mail, red cross on the back), in the dream: 3.1, 5.2, 7.3 |
| `pixel-cast/jack.png` | 160 × 1600 | black chihuahua, pink-lined ears (pixel cast; update 1's is archived) |
| `pixel-cast/watson.png` | 160 × 1600 | white-and-orange Jack Russell, teal cap, cigar (pixel cast) |
| `pixel-cast/confusione.png` | 160 × 1600 | orange tabby fighting cat (pixel cast) |
| `runIcon.png` | 13 × 11 | the RUN button's double chevron (update 1) |

Update 2's own QA notes (the zip's `reports/QA.md`): NE reads more like a side view, the S idle is
seated, S run/fetch is a bobbing cycle rather than a gallop, the helm is blocky.

The animation integration's plain Zampanò: N is the back view, S the front, E and W the right and
left profiles, and since the 8-directions update (`Supervillained_VG1_Normal_8_Directions_Update.zip`
and `..._Armoured_...`) NE, SE, SW and NW are three-quarter views of their own, for plain and
armoured Zampanò and Sbrimbrulòn alike (before it, NE/SE repeated E and NW/SW repeated W). Idle, walk, run, pee, poop, eat
and sit have authored per-frame holds; pee, poop and eat (also used for drinking) are fitted to the
game's action timers (`PEE_TIME`, `SQUAT_TIME`, `DRINK_TIME`...), ending on the standing pose.
Three seconds at rest he sits, then alternates sniffing and sitting (`PLAYER.IDLE_PHASE_TIME`;
the costumes, which have no `sit`, alternate standing and sniffing). The fetching dog carries the
tennis ball. The knight (armoured animations) has the same layout, timing and behaviour
(`ZAMPANO_ANIMS` in the manifest), sitting included; only the rag cross keeps update 2's 4-frame
sheet without `sit`. Sniff, bark, fetch, hurt and tired are 2–4 frames in the 40 × 40 atlases
(the 256 px source sheets have 8).

In the manifest a character with delivered art has `sheet` and, for animations delivered as a
sheet of their own (like `tired`), `animSheets`. A sheet that predates an animation (no rows for
it) shows the idle frames for it. `tests/sprites.test.ts` checks every sheet's size against the
manifest. **The next update**: move the files it replaces into `art-archive/`, put the new ones in
`public/sprites/`, update `sheet`/`animSheets`.

Legacy roles without a delivered sheet and the Green Zone `cat` remain procedural
(`src/assets/placeholders/`). The dedicated pixel cast and all Bagnaskiz masks now load their PNGs.

### Color Ink environments

Delivered environment art lives in `public/environment-ink/`: 15 chapter/theme atlases plus a
validated local `manifest.json`. `src/assets/environment.ts` decodes them during boot, supplies
chapter-specific palettes, and replaces only frames whose dimensions and anchors match the
existing procedural contract. Missing or malformed art falls back to `src/assets/placeholders/`;
no character sheet is replaced by this delivery.

The manifest also carries visual-only authored floor compositions for the story maps. They never
change `LevelData`, collision, props, markers or objectives. The delivered `1:arcade` composition
belongs to the former single-corridor 96 × 96 park, so the redesigned branching Green Zone does
not select it; it still uses the complete `ch01_greenzone` native ground and prop bank. This avoids
painting an obsolete route over the new ponds, plazas and optional circuits.

**Two banks, on trial.** `public/environment-ink-vibrant/` holds the vibrant v2 recolour of the
same 15 atlases (delivered as `Supervillained_Complete_Vibrant_Level_Gameplay_Implementation.zip`):
one dominant hue per chapter, with separate ramps for water, ground, vegetation, earth, masonry,
wood, textiles, snow, pollution and metal. Frame rectangles, anchors, names, floor compositions,
themes and every alpha byte are those of the current bank; only colours differ. OPTIONS > ART
chooses between them (CURRENT, the default, or NEW (TEST)); `?art=new|current` in the address
overrides the choice for one visit. This is a temporary testing option: when the owner picks one,
the other folder moves to `art-archive/` and the option goes (see `docs/BACKLOG.md`).
`scripts/recolor_environment_atlases.py` (Python 3 + Pillow) rebuilds the vibrant bank from the
current one, pixel for pixel; the art direction is in `docs/art-direction/`. Compare the two with
`npm run screens:environments` (`docs/screens/environments/current/` and `new/`) and
`SV_ART=new npm run screens -- m1` (`docs/screens/art-new/`).

## Directions

Eight facing directions, named as seen by the camera (screen space, **N = up/away from the camera**):

```
        N            N  : walking up the screen (seen from behind)
   NW       NE       NE : up-right along the iso grid axis (≈26.6° above horizontal)
 W             E     E  : right
   SW       SE       SE : down-right along the iso grid axis (seen 3/4 from the front)
        S            S  : toward the camera (face visible)
```

Sheet row order is always: `N, NE, E, SE, S, SW, W, NW`.
W/SW/NW may simply be mirrored copies of E/SE/NE (the procedural cast's are); Zampanò's and
Sbrimbrulòn's delivered sheets draw all eight (`tests/eightDirections.test.ts` decodes them and
fails if a diagonal repeats its side view).

## Characters

| key        | frame (px) | anchor (px) | animations                                                         |
|------------|-----------:|------------:|--------------------------------------------------------------------|
| `zampano`  | 40 × 40    | (20, 36)    | idle 8, walk 8, run 8, sniff 2, pee 8, poop 8, eat 8, bark 2, fetch 4, hurt 2, sit 8, tired 2 (own sheet) |
| `bagnaskiz`| 40 × 40    | (20, 36)    | full twelve-action dog layout, as described above |
| `cat`      | 28 × 28    | (14, 25)    | idle 2, walk 4, run 4                                              |

### Story cast

The story cast (`CAST_KEYS` in `src/assets/manifest.ts`) uses 40 × 40 frames,
anchor (20, 36), animations **idle 2, walk 4, run 4, bark 2, hurt 2** (same sheet layout as below,
5 animations × 8 directions = 40 rows), except the full-action player-ready dog skins:

| key | role in the VG1 design |
|-----|------------------------|
| `zampanoCross`, `zampanoKnight` | Zampanò in armour, in the dream (2.1 onwards; `zampanoCross` is an alias of the knight's sheet) |
| `sbrimbrulon`, `sbrimbrulonKnight` | Shih-tzu, on the lawn / armoured in the dream (3.1, 5.2; Pierre d'Amiens in 7.3). Both have Zampanò's 12 actions: standing still 3 s he sits, and `Actor.playAction(anim, seconds?)` plays any action in place |
| `jack`, `watson`, `santina`, `confusione` | the band and friends (Jack the absent general / looter, Watson the sailor, Santina the purple-born princess, Confusione as Aleaume) |
| `bagnaskizMarshal`, `bagnaskizEmperor` | Bagnaskiz's masks: Villehardouin, then the usurpers |
| `doge`, `king`, `emir`, `legate`, `cellarer`, `preacher`, `stranger`, `marquis`, `prince`, `burgher`, `lady`, `greek`, `knight`, `varangian`, `clerkA`, `clerkB` | supporting cast |
| `crowdA`, `crowdB`, `crowdC` | crowds (pilgrims, Venetians) |
| `bear`, `leopard`, `hound` | the band as the three beasts of 2.1 (the hound is also the dream that chases him in 8.1) |

**Bagnaskiz's band in the Green Zone** (1.0, `systems/ambush.ts`): Bagnaskiz, Jack and Watson wait
on the road, jump in barking and poop around Zampanò. Bagnaskiz plays his `sit`, `bark` and
`poop`; Jack and Watson have only the cast's five animations, so they bark and run but their squat
is not drawn yet. When their new sheets arrive with `poop` (and `sit`), give `jack` and `watson`
their own animation list in `castDefs` (`src/assets/manifest.ts`, in the sheet's row order) and
the ambush plays them with no other change (`Actor.playAction('poop')`, and an idle actor sits
after 3 s when it has `sit`). The band's voices are the `bark` sound at three pitches, played by
the `ambushVoice` handler in `src/fx/gameAudio.ts`; recorded lines would be new files in
`src/fx/audioFiles.ts` (`SOUND_FILES`), played by that handler instead of the bark.

They are generated on first use, so a replacement sheet is loaded the same way (`sheet:` in the
manifest). Preview any of them with `?debug=sprites&char=<key>`. Dialogue portraits use frame
`idle_S_0`; the Professor's portrait is the single sprite `professorFace`.

Non-animal figures are single sprites: `legs` (the Professor under the desk), `fortune`,
`falcon`, `stag`.

The **anchor** is the ground contact point, centered between the paws (the shadow is drawn there,
the sprite is depth-sorted by it). Frame counts and fps live in the manifest — change them freely,
the game reads them from there.

Animation meaning: `idle` standing/breathing · `sit` seated idle (plain Zampanò) · `walk` · `run` · `sniff` (head low, idle variant) ·
`pee` (hind leg lifted) · `poop` (squatting) · `eat` (head down, mouth) · `bark` (mouth open,
head forward, played once) · `fetch` (running with the ball in the mouth) · `hurt` (flinch) ·
`tired` (panting, standing still while the energy recovers).

### Sheet layout

One PNG per character, a grid of `frameW × frameH` cells:

- **rows**: for each animation *in the order listed in the manifest*, 8 rows (one per direction,
  order `N NE E SE S SW W NW`);
- **columns**: frame 0, 1, 2, … (unused cells may stay empty).

So plain Zampanò has 11 animations × 8 directions = 88 rows, 8 columns, i.e. a 320 × 3520 px
image (his 12th animation, `tired`, is a sheet of its own: see `animSheets`); the knight's sheet is
the same. The rag cross has 10 animations (no `sit`) and 4 columns: 160 × 3200.

Frame files rendered individually (e.g. from Blender) can be assembled with ImageMagick:

```bash
# frames named <anim>_<dir>_<frame>.png, e.g. walk_NE_2.png
for a in idle walk run sniff pee poop eat bark fetch hurt sit; do
  for d in N NE E SE S SW W NW; do
    montage ${a}_${d}_*.png -tile x1 -geometry 40x40+0+0 -background none row_${a}_${d}.png
  done
done
montage $(for a in idle walk run sniff pee poop eat bark fetch hurt sit; do for d in N NE E SE S SW W NW; do echo row_${a}_${d}.png; done; done) \
  -tile 1x -geometry +0+0 -gravity West -background none zampano.png
```

Then in `manifest.ts`: `zampano: { …, sheet: 'sprites/zampano.png' }`.

## Single sprites

`SPRITES` in the manifest: props (`tree`, `forestTree`, `bush`, `pole`, `fountain`, `exitFlag`),
items (`treat`, `ball`, `poop`, `coin`), shadows, popups (`rainbow`, `thought`), particles and HUD
icons. Story props: `column`, `desk`, `shelf`, `house`, `tent`, `galley`, `rock`, `statue`, `crate`,
`palm`, `altar`, `stall`, `throne`, `vine`, `gate`, `wicket` (a garden gate, map letter `J`), `bones`,
`table`; story items/FX: `shard`, `relic`, `bowl` (the water bowl on the lawn), `tear`, `flame`,
`sparkle`, `professorFace`. Story props are drawn per theme palette
(like ground tiles), so a file replacement should be neutral or one per theme. Each has `w × h`,
an anchor and a number of `variants`. To replace one, add
`file: 'sprites/tree.png'` — a horizontal strip with the variants side by side.

Texture names: `${key}_${variant}` (e.g. `tree_2`); characters: `${key}_${anim}_${dir}_${frame}`
(e.g. `zampano_walk_NE_2`).

## Ground tiles

Tiles are 32 × 16 diamonds (2:1), anchored at the top vertex. They are generated per zone from the
level `palette` (`grass_0..3`, `tallGrass_0..2` (32 × 21, blades poke 5 px above), `path_<mask>_<v>`
(16 edge masks: bit 1 = top-right neighbor is not path, 2 = bottom-right, 4 = bottom-left,
8 = top-left), `water_0..1`, `forest_0..2`, pollution overlay `dirt_0..3`, `fresh_0`, `exitRing_0`).
Story grounds add `floor`, `stone`, `sand`, `snow`, `deep` (animated), `wall`, `dock`, `carpet`, colored
per theme (`story/maps.ts`). Replacing tiles follows the same principle (register a texture under the same name); a file-based
tile set is not wired yet because tiles are palette-driven per zone.

## Sounds and music

Recorded audio lives in `assets/` (uploaded to `main`) and is bundled with the build, so it works
offline. Each file is wired in `src/fx/audioFiles.ts`:

| File | Plays when |
|------|-----------|
| `music/intro-music.mp3` | every reading screen: title, options, level and scene cards, the walk's briefing and score, the Professor's asides, the ending |
| `music/greenzone-music.mp3` | only while playing in the Green Zone: the 1.0 walk and the scenes of levels 1 and 8 |
| `music/Level-2_SLY-Disco-Weapon.mp3` | while playing the scenes of level 2 (On the edge of dreams) |
| `music/Level-3_HM-Plenty-Good-Lovin.mp3` | while playing the scenes of level 3 (Venice) |
| `music/Level-4_CRI-Brother-Sister-(RM-Remix).mp3` | while playing the scenes of level 4 (The sea) |
| `sounds/dog-bark.mp3` | Zampanò barks (arcade and story) |
| `sounds/food-collect.mp3` | a treat is eaten (TREATS +1); story pickups |
| `sounds/poos.mp3` | a poop (POOPS +1) |
| `sounds/pees-drop.mp3` | a pee (PEES +1); a marking adds a short chime |
| `sounds/pees-collect.wav` | pee charges refilled at a puddle or fountain |
| `sounds/water.mp3` | stepping into a puddle |
| `sounds/cat-meow.mp3` + `sounds/cash-after-cat.mp3` | a cat caught: the meow, then the cash; the cash also plays for coins |
| `sounds/ball.mp3` | a magnet ball appears |
| `sounds/alarm-greenzone-under-attack.mp3` | GREEN ZONE UNDER ATTACK starts |
| `sounds/siren.mp3` | loops (quieter) while the attack lasts; the fire in Constantinople (7.4) |
| `sounds/laser-eyes.mp3` | Bagnaskiz knocks Zampanò |

Leading silence is skipped automatically, and per-file loudness trims are in `config.ts`
(`AUDIO.FILE_GAIN`; music: `AUDIO.MUSIC_FILE_GAIN`, which brings the louder level tracks down to
the Green Zone track's level). To replace a sound, overwrite the file with the same name (mp3 or
wav). A level's music is its chapter's `music` (`src/campaign/chapters/chN.ts`). All the
music in the game is re-encoded (MP3 VBR, about 130 kbit/s: `ffmpeg -i <original> -codec:a
libmp3lame -q:a 5 <file>`) to keep the app small; the files as uploaded are kept in
`assets/music/originals/` (not bundled). A new track: put the original there and the re-encoded
copy in `assets/music/`. Levels 5 to 7
keep the synthesized medieval loop, and interface sounds (clicks, glitch
transitions, stars, jingles, game over) stay synthesized in `src/fx/sounds.ts`.

## Title page art

`assets/starting-page-images/` holds the pictures of the title page and the level ends:

- `Zampano-Samemala-3.gif`: Zampanò over the title's buttons, **animated** (99 frames, about
  4 s, 1024 × 1536, transparent; `src/ui/titleAnim.ts`). The app bundles `app/Zampano-Samemala-3.webp`,
  the same animation as a lossless animated WebP (identical frames and delays, 2.3 MB instead of
  6.6 MB; made with Pillow: `save(..., save_all=True, lossless=True, method=6, duration=<the GIF's
  delays>, loop=0)`). Replacing the GIF means redoing that copy. The browser decodes its frames one after
  another (WebCodecs `ImageDecoder`: Chromium and the Android WebView) and each frame plays as
  soon as it is ready, so the dog moves about a second after the title appears. Every frame is
  cropped to the same box (the first frame's dog plus `TITLE.DOG_CROP_MARGIN`) and scaled to the
  title's size. Without `ImageDecoder` (Safari, the dev server opened over plain http on the
  LAN) the first frame stays still. The earlier `Zampano-Samemala-1.gif` and `-2.gif` are kept,
  unused.
- `Retro-16-Bit Ivory Dog Sprite-3-4-front.png`: the first portrait (a still), kept, no longer used.
- `Youve_Been_Supervillained_Logo.png`: not on the title page; it snaps in at the end of every
  level, before the final info (`src/scenes/supervillainedScene.ts`).

They are scaled down in the browser to the exact size each screen needs, so replacing a file
(same name, transparent background) is all it takes; another GIF needs only its name changed in
`titleAnim.ts`. Tuning in `config.ts`: `TITLE` (portrait, glitch, old-film look) and
`SUPERVILLAINED` (size, snap, flash, shake, glow, sprite burst, hold time).

## App icon and logo

`branding/` holds the logo: `logo-source.webp` (the original), `logo.png` (the shape on pure white,
cropped to its edges) and `app-icon.png` (1024 × 1024 square with the whole shape, for stores and
documents). `npm run android:icons` builds everything else from `logo.png`: the Android launcher
icons (square, round, adaptive foreground inside the 66 dp safe zone, white adaptive background),
the white splash screens with the logo in the middle, and the web icons in `public/` (favicons,
Apple touch icon, 192/512). To change the logo, replace `branding/logo.png` (8-bit RGB or RGBA PNG,
the shape on white, cropped) and run the command again.
