# Backlog

What is known to be left, by kind, most important first in each section. Fixed items move to
`DECISIONS.md` (what changed and why); new findings are added here with the file and line that
shows them. Nothing here is a new feature idea: every entry is a bug that was observed in the
code, a structural cost, something a design document asks for, or release work.

Last passes: the foundations cleanup (attempts, settings, transitions, Back button) and the
backlog fixes (one confirm rule, Escape, keyboard mini-games, unknown saves, music helper); see
the last sections of `DECISIONS.md`.

## 1. Confirmed bugs (not fixed yet)

Found by reading the code; each one is reproducible as described.

1. **Mini-game hints say TAP to everyone.** The keyboard now reaches every outcome of every
   mini-game, but the on-screen hints still speak to touch only: the letter's "(TAP A WORD TO
   CHANGE IT)", the rumour's "TAP THE PIECES IN THE ORDER THEY HAPPENED...", the ladders' "TAP
   MIDDLE: CLIMB SIDES: LADDER", "ROW! (TAP)", "TAP ON THE BEAT" (`story/minigames/`). Choose the
   wording with `input.usingTouch`, as the Briefing and the walk do. Matters for a desktop build.

## Deferred by the owner

1. **Combat** (the fights of 2.3, 5.3, 7.2 and the BARK / SWORD / SHIELD modes) is a draft the
   owner has not played yet: no balancing or rework until then. Open question kept for that
   pass: shield by gesture is a pulse (one blow), shield by key a hold (`walk.ts` →
   `combat.raiseShield`).
2. **Mini-games** are a side problem for now (item 1.1 above included).

## 2. Remaining structural problems

None blocks work; fix each when the code around it is next changed.

1. **`scenes/overlays.ts` holds nine scenes (~950 lines).** Title, Briefing, Pause, Level End,
   Game Over, Options, Controls, Confirm, Goodbye. Split by screen when one of them is next
   reworked; not worth a move on its own.
2. **The choice wheel (`story/ui.ts`) re-implements `ui/menu.ts`** with a different tap margin,
   and the GLOSSARY / COUCH cards copy their close logic. (Their keys now agree:
   `Input.consumeContinue`.)
3. **`Flow.gameScene` keeps the last Green Zone scene referenced after it is destroyed**
   (JS heap only; every use is guarded). Clear it when the story takes over.
4. **Per-scene filters are not destroyed** (title glitch, blur, attack, bleach). They hold no
   textures, so this is ordinary garbage; destroy them if a GPU profile ever points there.
5. **The art deliveries are committed as zips at the repository root (~300 MB)**, as delivered
   (`DECISIONS.md`, sprite updates). Every clone pays for them; Git LFS or release attachments
   would keep the history smaller. Owner's decision.

## 3. Specified but not implemented

From the design documents (`SPEC.md`, the VG1 PDFs as summarised in `DECISIONS.md`).

1. **The optional Jack race ("honour against craft")** from the VG1 design is not implemented
   (`DECISIONS.md`, "Interpretations where the PDF leaves a choice").
2. **The shop**: coins are counted and saved for it (`settings.ts` `addCoins`, the story's
   purse) but SPEC.md keeps it out of scope for now.
3. **Tiled import** for levels: the loader is ready for it (SPEC.md §4), not implemented, out of
   scope.

## 4. Story revisions awaiting direction

The story is `docs/STORY.md` (canonical) and `docs/STORY-SOURCES.md`; the cleanup changed none of
it. When a revision comes, change together: the chapter scripts (`src/campaign/chapters/`), the
maps they use (`src/story/maps.ts`), `docs/STORY.md`, and, if saved scene ids change meaning, a
new save version with a migration and its test (see "Saves" in `CLAUDE.md`).

Announced by the owner, to come: the story and the dialogue rewritten, the gameplay and the level
design improved, starting from Level 1, which defines Zampanò (bullied by Bagnaskiz's band, filled
with history by the Professor, his human dad, and hopeless with girls). **Santina's part (1.4)
is to be changed.** The Green Zone walk got the band's ambush and more treats first (see
`DECISIONS.md`).

**Who wears armour, and where.** Jack, Watson, Santina and Confusione now have armoured costumes
(`jackKnight`, `watsonKnight`, `santinaKnight`, `confusioneKnight`). Cast so far by the rule used for
Sbrimbrulòn (armoured where the story makes them fighting crusaders): Aleaume from the breach
(7.7, 7.9), Jack from the oath before the assault (7.7, 7.8). No scene calls for Watson (a
Venetian sailor) or Santina (a woman on the walls) in armour yet; their costumes are ready for the
rewrite (`ctx.addActor(name, 'watsonKnight', ...)` or `who: 'santinaKnight'` in a stage).

## 5. Polish and release

1. **OPTIONS > ART is a temporary testing option**: the owner chooses between the current
   environment art and the vibrant recolour (`DECISIONS.md`, "Vibrant environment art on
   trial"), on a device. Then: the chosen bank becomes `public/environment-ink/` (the other moves
   to `art-archive/`), the ART row, `Settings.newArt`, `?art=`, `SV_ART` and the second bank in
   `environment.ts` go, and `docs/screens/environments/` keeps one set. A saved `newArt` is then
   simply ignored (`loadSettings` keeps only known fields), so no migration is needed.
2. **Watson's art, for a later delivery**: his sheets (plain and armoured) draw four views, the
   diagonal rows reusing the side profiles, where the other dogs have eight; and armoured Watson
   is drawn about 15 % smaller than plain Watson (idle height 22 px against 26). As delivered;
   `tests/castAnimations.test.ts` records the four views.
3. **The Green Zone ambush needs playing by a person**: its numbers were set by eye and checked
   by scripts, not by play. Timings in `AMBUSH` (`config.ts`: how often the voices come, the
   fright's length, six poop piles, the grace before Bagnaskiz comes back); where it starts and
   springs (25 % / 50 %), the band's spot and the lines in the level data
   (`LEVEL_1.events.ambush`). The voices are barks until recorded lines exist.
4. **Android release signing**: `android:release` signs with the debug key
   (`android/app/build.gradle`, `signingConfig signingConfigs.debug`). A store upload needs a
   real upload key, kept out of the repository.
5. **Application id** `com.zampano.supervillained` is marked as a placeholder in `DECISIONS.md`
   (M6); fix it before the first store upload, since it cannot change afterwards.
6. **APK size** (~40 MB debug): mostly the recorded music (`assets/music`, ~6 MB a track).
7. **Device checks**: the owner confirmed Back works on an installed build from before these
   passes. The newer changes (Back on a level's scene list, the double-tap guard, the MENU
   corner, Escape on OPTIONS / NEW GAME?, the wrapped rumour heading) were checked in a desktop
   Chromium with phone emulation and the same `svback` event the app sends, not on a phone.
   Play through once on a device: Back on every screen, double taps on QUIT / SKIP / CONTINUE,
   rotate or resize while paused, the rumour (6.2).
8. **The committed screenshots in `docs/screens/` were stale** (older art in several) until this
   pass regenerated them; regenerate after visual changes (`npm run screens`).
9. **Gameplay feel and balance are not covered by any check.** The playtest proves every scene
   can be finished by the autopilot, not that it is fun or fair at human speed.
