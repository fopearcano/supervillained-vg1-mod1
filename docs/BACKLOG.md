# Backlog

What is known to be left, by kind, most important first in each section. Fixed items move to
`DECISIONS.md` (what changed and why); new findings are added here with the file and line that
shows them. Nothing here is a new feature idea: every entry is a bug that was observed in the
code, a structural cost, something a design document asks for, or release work.

Last full pass: the foundations cleanup (attempts, settings, transitions, Back button); see the
last sections of `DECISIONS.md`.

## 1. Confirmed bugs (not fixed yet)

Found by reading the code; each one is reproducible as described.

1. **The rumour mini-game (6.2) cannot be played from the keyboard.** `RumourGame` reads taps
   only (`src/story/minigames/words.ts`, its `update`). Mouse and touch work; a keyboard-only
   player has to SKIP SCENE. Matters for a desktop build, not for Android.
2. **The letter mini-game (5.4) is only half playable from the keyboard.** Changing a word and
   WRITE IT AGAIN are taps (`LetterGame` in `words.ts`), so the `letter: 'named'` outcome cannot
   be reached with keys; the comment on `WordGame.tapped` promises keyboard selection.
3. **J / X confirm some screens and not others.** They advance dialogue and story cards
   (`story/steps.ts` `tapped`, `story/screens.ts` StoryCardScene) but not the Briefing,
   "You've been supervillained", the Level End skip, the book, GLOSSARY / COUCH, menus or the
   choice wheel, which take Space / Enter / taps only.
4. **Escape is ignored on OPTIONS, the NEW GAME confirmation and the story menu**, while the
   Android Back button closes the first two (`Scene.back`). The story menu has a BACK item but
   neither Escape nor Back reaches it. Decide whether Back on the story menu should go to the
   title (it does nothing today, kept as it was).
5. **The Briefing decides "TAP" or "PRESS" differently from the game** (`'ontouchstart' in
   window` in `scenes/overlays.ts` BriefingScene, `input.usingTouch` everywhere else): on a
   touchscreen laptop the hints disagree.
6. **Shield by gesture is a pulse, shield by key a hold.** Swipe down raises the shield for one
   blow (`walk.ts` → `combat.raiseShield`); I and the round button in SHIELD mode hold it.
   Possibly intended; confirm.

## 2. Remaining structural problems

None blocks work; fix each when the code around it is next changed.

1. **`scenes/overlays.ts` holds nine scenes (~950 lines).** Title, Briefing, Pause, Level End,
   Game Over, Options, Controls, Confirm, Goodbye. Split by screen when one of them is next
   reworked; not worth a move on its own.
2. **"Tap or key to continue" is written four times with different keys** (`story/steps.ts`,
   `story/screens.ts`, `story/minigames/action.ts`, `story/minigames/rhythm.ts`), the choice
   wheel (`story/ui.ts`) re-implements `ui/menu.ts` with a different tap margin, and the
   GLOSSARY / COUCH cards copy their close logic. One helper on `Input` would also settle bug 3.
3. **Music changes are spelled out at every call site** (`setTrack` + `setDuck` + `startMusic`,
   and `reading()` exists in both `Flow` and `StoryFlow`). An `AudioEngine.playTrack(name)`
   would remove the repetition.
4. **`Flow.gameScene` keeps the last Green Zone scene referenced after it is destroyed**
   (JS heap only; every use is guarded). Clear it when the story takes over.
5. **Per-scene filters are not destroyed** (title glitch, blur, attack, bleach). They hold no
   textures, so this is ordinary garbage; destroy them if a GPU profile ever points there.
6. **The art deliveries are committed as zips at the repository root (~170 MB)**, as delivered
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
new save version with a migration and its test (see "Saves" in `CLAUDE.md`). No revision is
pending in the repository today.

## 5. Polish and release

1. **Android release signing**: `android:release` signs with the debug key
   (`android/app/build.gradle`, `signingConfig signingConfigs.debug`). A store upload needs a
   real upload key, kept out of the repository.
2. **Application id** `com.zampano.supervillained` is marked as a placeholder in `DECISIONS.md`
   (M6); fix it before the first store upload, since it cannot change afterwards.
3. **APK size** (~40 MB debug): mostly the recorded music (`assets/music`, ~6 MB a track).
4. **Device checks not done in this pass**: the Back button changes, the double-tap guard and
   the MENU corner were checked in a desktop Chromium with the same `svback` event the app
   sends, not on a phone. Play through once on a device: Back on every screen, double taps on
   QUIT / SKIP / CONTINUE, rotate or resize while paused.
5. **The committed screenshots in `docs/screens/` were stale** (older art in several) until this
   pass regenerated them; regenerate after visual changes (`npm run screens`).
6. **Gameplay feel and balance are not covered by any check.** The playtest proves every scene
   can be finished by the autopilot, not that it is fun or fair at human speed.
