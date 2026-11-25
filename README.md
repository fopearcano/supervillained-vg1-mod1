# SUPERVILLAINED

A 2D isometric game about **Zampanò**, a bullied Maltese dog, with a retro video-game HUD.
Browser + Android, written from scratch in TypeScript with PixiJS as a pure WebGL renderer — no
game engine.

> MAKE A WALK. COLLECT ENOUGH TREATS TO COMPENSATE THE HUNGER. PEE ENOUGH TO COMPENSATE THE POOPS
> AS TOO MANY POOPS CAN ENDANGER THE ENVIRONMENT OF THE ZONE YOU ARE PLAYING IN. CATS MEAN MONEY.
> DON'T GET DISTRACTED BY THE BALLS.

One game, one story (title menu: NEW GAME, CONTINUE, COUCH, OPTIONS, GLOSSARY, QUIT; COUCH shows
the saved story at a glance). It starts in the Green
Zone: the walk in the park above (1.0, the level from `SPEC.md`) and the bullying of the lawn.
Then Zampanò falls asleep under the Professor's desk with a rag cross on his back and dreams one
story, the Fourth Crusade (1202–1204), from the place of a small knight of Picardy, Robert de
Clari: the preaching and the list of names, the fleet bought on credit in Venice, Zara, the
winter, the prince who promised everything, Constantinople in 1203 and its sack in 1204. The
marshal Villehardouin speaks for the leaders, Niketas Choniates for the city. At the end he wakes
up *supervillained* (with character), not to be bullied again in the Green Zone.

8 levels (The Greenzone, On the edge of dreams, Venice, The sea, Zara, The long winter,
Constantinople, Back to the Greenzone), 1.0 + 36 scenes, built from the design documents
*Supervillained — VG1 implemented* and *Levels implementation 2* and rewritten around the
chronicles: the Green Zone walk, then dialogue with choices, dream walks (following someone,
carrying things, acting in a lull, stealth, a nerve gauge beside Pierre, smoke and fire,
scrambled controls), mini-games, the Meraviglia book of marvels (which ends on an empty
pedestal), and two endings — THE KNIGHT or THE WITNESS — decided by whether he calls the
pilgrims to their oath himself at the sack. The story, scene by scene, is in
[`docs/STORY.md`](docs/STORY.md); its sources and what is invented, in
[`docs/STORY-SOURCES.md`](docs/STORY-SOURCES.md). Saves from the earlier version of the dream are
migrated (the walk and the unchanged Level 1 scenes are kept; the old save is kept aside). Progress is saved after every scene; OPTIONS has
sound, volume, text speed, the character art (NEW: the delivered sprite sheets; OLD: the art they
replaced, kept), level replays and the book.

## Run it

```bash
npm install
npm run dev
```

Open the printed `Local` URL on the computer, or the `Network` URL on a phone on the same Wi-Fi.

### Controls

| Action | Touch | Keyboard |
|--------|-------|----------|
| Move   | virtual joystick (appears under your thumb, left side) | WASD / arrow keys |
| Run    | hold RUN, or tap it on/off (OPTIONS > CONTROLS); only while the energy ring has energy | hold Shift or K |
| Pee    | PEE button (Green Zone) | Space |
| Action button | the round button: BARK in the Green Zone; in the story the scene's action, BARK, SWORD or SHIELD | J or X |
| Switch the action button | the small ⇄ button next to it | Q or Tab |
| Bark   | double tap over the buttons | B |
| Sword (once a knight) | swipe up over the buttons | U |
| Shield (once a knight) | swipe down over the buttons (or hold the round button in SHIELD mode) | hold I |
| Menu   | MENU (top right) | Esc |
| Story: next line / choose | tap the line / tap an option | Space or Enter / arrows + Space |

In the story the round button changes name with the scene (LOOK, SNIFF, VOW, PLACE…); the switcher
cycles it through the scene's action, BARK and, once Zampanò is a knight (2.3), SWORD and SHIELD.
The gestures are read on the button side of the screen, above the buttons; what each one does,
RUN held or switched, the switcher and a left-hand layout (buttons on the left, joystick on the
right) are in OPTIONS > CONTROLS (also in the story's pause menu). The pause menu sets the text
speed; the story menu opens each level's scene list, where any finished scene can be replayed
without changing your campaign.

**Fights** (2.3, 5.3, 7.2): the foes come at him and swing; a red ring filling under one means a
blow is coming. Raise the shield (it takes blows from the front), then strike while he staggers;
armed foes parry a blow they see coming. A bark pushes back everyone near and is never parried,
but barely staggers. Nobody dies: a beaten foe runs off ("routed"), and at 0 HEALTH Zampanò is
knocked down and the fight starts again. At Zara (5.3) the pope has forbidden attacks on
Christians: every sword blow that lands costs Grace.

## Play on a phone (browser)

With `npm run dev` running, open the `Network` URL (e.g. `http://192.168.1.20:5173`) in Chrome on a
phone connected to the same Wi-Fi. Hold the phone in portrait. Sound starts after the first tap.

## Android (debug APK)

The Android app is a [Capacitor](https://capacitorjs.com) shell around the same web build: portrait
locked, fullscreen (immersive), screen kept on, hardware **Back** opens/closes the pause menu.

### Prerequisites (once)

- **Node 22+** and `npm install` done.
- **JDK 21** (`java -version`). Android Studio ships one (`File > Settings > Build Tools > Gradle >
  Gradle JDK`), or install e.g. Temurin 21.
- **Android SDK** with *Android SDK Platform 36* and *Build-Tools 36* — easiest via Android Studio
  (SDK Manager). Then either set `ANDROID_HOME` (e.g. `~/Android/Sdk`) or create
  `android/local.properties` containing `sdk.dir=/path/to/Android/Sdk`.

### Build

```bash
npm run android:apk
```

This builds the web app, copies it into the Android project (`cap sync`) and runs Gradle.
The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
(Windows: run `npm run android:sync`, then `cd android` and `gradlew.bat assembleDebug`.)

### Install

Over USB: enable *Developer options* → *USB debugging* on the phone, plug it in, then

```bash
npm run android:install
```

(`adb` comes with the SDK *platform-tools*.) Or copy `app-debug.apk` to the phone and open it
(allow "install unknown apps" for your file manager / browser when asked).

To open the native project in Android Studio (run on an emulator, debug): `npm run android:open`.
After changing game code, `npm run android:sync` is enough before rebuilding.
App icons, splash screens and web icons are generated from the logo (`branding/logo.png`) with
`npm run android:icons`.

## iPhone / iPad (iOS)

The iOS app is the same Capacitor shell (`ios/`, Swift Package Manager, no CocoaPods): portrait
locked, fullscreen, screen kept on, the SUPERVOID EDITIONS link opens Safari. iOS apps do not
close themselves, so QUIT shows the goodbye card, as in a browser. The game is laid out inside
the safe area (notch / Dynamic Island, home indicator).

iPhone apps can only be compiled on a Mac, so there are two ways to get one:

- **Without a Mac — GitHub Actions.** Every push that touches the game or `ios/` runs the
  *iOS build* workflow (`.github/workflows/ios.yml`) on a GitHub-hosted Mac; it can also be
  started by hand from the Actions tab (*Run workflow*, once the workflow is on the default
  branch). Its artifact *SUPERVILLAINED-ios* holds `SUPERVILLAINED-ios-unsigned.ipa` (an
  unsigned device build) and `SUPERVILLAINED-ios-simulator.zip`. Apple only runs signed apps on a
  phone: install the `.ipa` with a sideloading tool that signs it with your own Apple ID (for
  example Sideloadly or AltStore; a free Apple ID's signature lasts 7 days), or sign it as below.
- **With a Mac (Xcode 16+).**

  ```bash
  npm run ios:sync
  ```

  ```bash
  npm run ios:open
  ```

  In Xcode select the *App* target → *Signing & Capabilities* → your Team (a free Apple ID works
  for your own phone), plug in the iPhone, pick it as the run destination and press Run. For
  TestFlight / the App Store: *Product → Archive* with a paid developer account.

After changing game code, `npm run ios:sync` copies the new web build into the project. Icons
and launch images come from the logo too: `npm run ios:icons` (the same script as Android).

## Develop

```bash
npm run build      # typecheck + production build (dist/)
npm test           # unit tests (Vitest)
npm run screens    # Playwright screenshots into docs/screens/
npm run smoke      # runs every story script start to finish (skipping steps), then the flow checks
npm run playtest   # the autopilot plays the whole campaign for real; report in docs/PLAYTEST.md
```

See `CLAUDE.md` for the architecture and where each kind of change goes ("Common changes", with
the checks to run after it), `ASSETS.md` to replace the placeholder art (and how the replaced art
is kept as the old version), `DECISIONS.md` for design decisions, and `docs/BACKLOG.md` for known
bugs and the work left.

## License notes

Font: Press Start 2P by CodeMan38, SIL Open Font License 1.1 (`src/assets/fonts/OFL.txt`).
