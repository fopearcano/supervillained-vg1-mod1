/**
 * Story smoke test: plays every sub-level script from start to finish, skipping each step after a
 * few frames (`StoryScene.debugSkip`), and fails on any page error (missing marker, unknown actor,
 * bad sprite key...). Then four groups of checks through the real menus and keys: `progress`
 * (what a scene saves on restart / quit / skip), `menus` (double presses during a transition,
 * Escape and the Android Back button on each kind of screen, the MENU button after a resize, the
 * continue / confirm keys, OPTIONS' MUSIC and SOUNDS levels and ART), `keys` (the letter and rumour
 * mini-games played from the keyboard) and `walk` (the Green Zone: Bagnaskiz's band's ambush half
 * way).
 *
 *   npm run smoke                 all sub-levels, then the four groups of checks
 *   npm run smoke -- 7.3 8.1      selected sub-levels
 *   npm run smoke -- progress menus keys walk   only those checks (any of them)
 *   SMOKE_SHOTS=dir npm run smoke one screenshot per sub-level (first walk / mini-game / choice)
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = Number(process.env.SV_PORT ?? 5198); // SV_PORT: run two checks side by side
const SHOTS = process.env.SMOKE_SHOTS ?? '';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('vite did not start')), 30000);
    proc.stdout.on('data', (d) => {
      if (String(d).includes('Local')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.on('exit', (code) => reject(new Error(`vite exited ${code}`)));
  });
  return proc;
}

const INTERESTING = new Set(['WalkStep', 'MiniGameStep', 'AskStep']);

/**
 * What a story scene changes is saved only when it ends: RESTART SCENE and QUIT TO TITLE drop
 * the attempt (keeping its play time), SKIP SCENE keeps it. Played through the pause menu with
 * the keyboard, checked against the real save in localStorage. Returns the number of failures.
 */
async function progressChecks(page) {
  let fails = 0;
  const check = (ok, what) => {
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} progress: ${what}`);
  };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('supervillained:story') ?? 'null'));
  const scene = () =>
    page.evaluate(() => {
      const top = window.__sv.top();
      return { name: top.constructor.name, sub: top.sub?.id ?? null, meters: top.state ? { ...top.state.meters } : null, flags: top.state ? { ...top.state.flags } : null };
    });
  /** A choice in the scene (the same call a story choice makes). */
  const choose = () => page.evaluate(() => window.__sv.top().apply({ supervillain: 8, flags: { smokeChoice: true } }));
  const pauseAndPick = async (index) => {
    await page.keyboard.press('Escape');
    await wait(300);
    for (let k = 0; k < index; k++) {
      await page.keyboard.press('ArrowDown');
      await wait(60);
    }
    await page.keyboard.press('Enter');
    await wait(1200);
  };
  const PAUSE = { RESTART: 1, SKIP: 2, QUIT: 7 };

  // A saved campaign with Commozione to spend; 6.1 fades it on entry.
  await page.evaluate(() => {
    localStorage.clear();
    const story = window.__sv.flow.story;
    story.debugReset();
    story.state.meters.commozione = 40;
    story.state.completed.push('1.0');
    localStorage.setItem('supervillained:story', JSON.stringify(story.state));
    story.debugPlay('6.1');
  });
  await wait(600);
  const first = await scene();
  await choose();
  await wait(700);
  let s = await saved();
  check(first.name === 'StoryScene' && first.meters.commozione < 40, `6.1 fades Commozione on entry (${first.meters?.commozione})`);
  check(s.meters.supervillain === 10 && !s.flags.smokeChoice, 'nothing the scene changes is saved half way through');

  await pauseAndPick(PAUSE.RESTART);
  const again = await scene();
  check(again.name === 'StoryScene' && again.sub === '6.1', 'RESTART SCENE starts 6.1 again');
  check(again.meters?.supervillain === 10 && !again.flags?.smokeChoice, `RESTART SCENE drops the attempt's choices (supervillain ${again.meters?.supervillain})`);
  check(again.meters?.commozione === first.meters.commozione, `the feeling fades once, not once per attempt (${again.meters?.commozione})`);

  await choose();
  await pauseAndPick(PAUSE.QUIT);
  s = await saved();
  check((await scene()).name === 'TitleScene', 'QUIT TO TITLE goes to the title');
  check(s.meters.supervillain === 10 && s.meters.commozione === 40 && !s.flags.smokeChoice && !s.completed.includes('6.1'), 'QUIT TO TITLE saves none of the abandoned scene');
  check(s.playTime > 1, `the time played in abandoned attempts is kept (${s.playTime?.toFixed?.(1)} s)`);

  await page.evaluate(() => window.__sv.flow.story.debugPlay('6.1'));
  await wait(600);
  await choose();
  await pauseAndPick(PAUSE.SKIP);
  s = await saved();
  check(s.completed.includes('6.1'), 'SKIP SCENE marks 6.1 complete');
  check(s.meters.supervillain === 18 && s.flags.smokeChoice === true && s.meters.commozione === first.meters.commozione, `SKIP SCENE keeps what was done, once (supervillain ${s.meters.supervillain}, commozione ${s.meters.commozione})`);
  await page.evaluate(() => localStorage.clear());
  return fails;
}

/**
 * Menus and the Back button: a second press while the glitch transition is changing the scene
 * does nothing (a double QUIT used to recurse without end and crash the page), Escape and the
 * Android Back button (`svback`, as MainActivity sends it) do what each screen says, and a resize
 * under a pause menu does not turn the MENU corner back on. Returns the number of failures.
 */
async function menuChecks(page) {
  let fails = 0;
  const check = (ok, what) => {
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} menus: ${what}`);
  };
  const errors = [];
  const onError = (e) => errors.push(e.message);
  page.on('pageerror', onError);
  const top = () => page.evaluate(() => window.__sv.top().constructor.name);
  const androidBack = async () => {
    await page.evaluate(() => window.dispatchEvent(new Event('svback')));
    await wait(700);
  };
  const press = async (key, n = 1) => {
    for (let k = 0; k < n; k++) {
      await page.keyboard.press(key);
      await wait(90);
    }
  };
  const loopRunning = async () => {
    const t0 = await page.evaluate(() => window.__sv.game.time);
    await wait(300);
    return (await page.evaluate(() => window.__sv.game.time)) > t0;
  };
  const countGlitches = () =>
    page.evaluate(() => {
      const audio = window.__sv.game.audio;
      window.__glitches = 0;
      if (!audio.__counted) {
        const play = audio.play.bind(audio);
        audio.play = (name, o) => {
          if (name === 'glitch') window.__glitches++;
          return play(name, o);
        };
        audio.__counted = true;
      }
    });

  // The walk: Android Back pauses and resumes; QUIT TO TITLE pressed twice in a row.
  await page.evaluate(() => {
    localStorage.clear();
    window.__sv.flow.play(1);
  });
  await wait(900);
  await androidBack();
  check((await top()) === 'PauseScene', 'Back pauses the walk');
  await androidBack();
  check((await top()) === 'GameScene', 'Back resumes the walk');
  await androidBack();
  await press('ArrowDown', 5); // RESUME, RESTART, SOUND, MUSIC, SOUNDS, QUIT TO TITLE
  await page.keyboard.press('Enter');
  await wait(30);
  await page.keyboard.press('Enter');
  await wait(1600);
  check((await top()) === 'TitleScene' && (await loopRunning()) && errors.length === 0, `QUIT TO TITLE pressed twice: one title, the game goes on (${errors[0] ?? 'no errors'})`);

  // Over the title: OPTIONS, CONTROLS, CONFIRM close with Back.
  await page.evaluate(() => window.__sv.top().actions.options());
  await wait(500);
  await press('ArrowDown', 4); // SOUND, MUSIC, SOUNDS, TEXT, CONTROLS
  await page.keyboard.press('Enter');
  await wait(400);
  check((await top()) === 'ControlsScene', 'OPTIONS > CONTROLS opens');
  await androidBack();
  check((await top()) === 'OptionsScene', 'Back closes CONTROLS');
  await androidBack();
  check((await top()) === 'TitleScene' && (await page.evaluate(() => window.__sv.top().root.visible)), 'Back closes OPTIONS and shows the title again');

  // OPTIONS: MUSIC and SOUNDS are two levels, saved apart and given to the audio apart. From 70%
  // each: MUSIC once (100%), SOUNDS twice (100%, then OFF).
  await page.evaluate(() => window.__sv.game.updateSettings((st) => ((st.music = 0.7), (st.sounds = 0.7))));
  await page.evaluate(() => window.__sv.top().actions.options());
  await wait(500);
  await press('ArrowDown'); // MUSIC
  await press('Enter');
  await press('ArrowDown'); // SOUNDS
  await press('Enter', 2);
  await wait(200);
  const levels = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('supervillained:settings') ?? 'null');
    const rows = window.__sv.top().menu.rows.map((r) => r.text.content.map((s) => s.text).join(''));
    return { saved, rows: rows.slice(0, 3) };
  });
  check(
    levels.saved?.music === 1 && levels.saved?.sounds === 0 && !('volume' in (levels.saved ?? {})),
    `OPTIONS saves MUSIC and SOUNDS apart (${JSON.stringify(levels.saved && { music: levels.saved.music, sounds: levels.saved.sounds, volume: levels.saved.volume })})`,
  );
  // What is actually heard: the engine's music and effects buses (WebAudio gain nodes). A bus's
  // gain only moves while sound flows through it (Chromium does not process an idle node, so its
  // reading stays where the last sound left it): a near-silent siren loop keeps the effects bus
  // running while it is read. SOUNDS: OFF silences the effects; MUSIC: 100% is the title track's
  // full level (AUDIO.MUSIC_FILE_VOLUME 0.55; it was 0.385 at 70 %).
  await page.evaluate(() => window.__sv.game.audio.loop('siren', { volume: 0.01 }));
  await wait(700);
  const gains = await page.evaluate(() => {
    const a = window.__sv.game.audio;
    const g = { music: a.music?.gain.value ?? null, sfx: a.sfx?.gain.value ?? null, master: a.master?.gain.value ?? null };
    a.stopLoop('siren');
    return g;
  });
  check(
    gains.sfx !== null && gains.sfx < 0.01 && gains.music > 0.5 && gains.master > 0.99,
    `the audio buses follow both levels (${JSON.stringify(gains, (_k, v) => (typeof v === 'number' ? +v.toFixed(3) : v))})`,
  );
  check(levels.rows[1] === 'MUSIC: 100%' && levels.rows[2] === 'SOUNDS: OFF', `the rows show the new levels (${levels.rows.join(' | ')})`);
  await press('Escape');
  await wait(300);
  await page.evaluate(() => window.__sv.game.updateSettings((st) => ((st.music = 0.7), (st.sounds = 0.7))));

  // OPTIONS > ART (a temporary test option): NEW (TEST) decodes the vibrant environment bank,
  // saves the choice and is still chosen after a restart of the game; CURRENT goes back.
  const artNow = () =>
    page.evaluate(() => ({
      row: window.__sv.top().menu?.rows[7]?.text.content.map((s) => s.text).join('') ?? null,
      saved: JSON.parse(localStorage.getItem('supervillained:settings') ?? 'null')?.newArt,
      bank: window.__sv.art().bank,
      zones: window.__sv.art().loadedZones.length,
    }));
  const bankIs = (bank) => page.waitForFunction((b) => window.__sv?.art().bank === b, bank, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => window.__sv.top().actions.options());
  await wait(500);
  await press('ArrowDown', 7); // SOUND, MUSIC, SOUNDS, TEXT, CONTROLS, LEVELS, BOOK, ART
  await press('Enter');
  await bankIs('new');
  const artNew = await artNow();
  check(
    artNew.row === 'ART: NEW (TEST)' && artNew.saved === true && artNew.bank === 'new' && artNew.zones === 15,
    `OPTIONS > ART: NEW (TEST) loads and saves the vibrant art (${JSON.stringify(artNew)})`,
  );
  // A second start of the game (same storage, a fresh page): it boots with the saved choice.
  const second = await page.context().browser().newContext({ storageState: await page.context().storageState() });
  const restarted = await second.newPage();
  await restarted.goto(`http://127.0.0.1:${PORT}/`);
  await restarted.waitForFunction(() => window.__sv?.top()?.constructor.name === 'TitleScene', null, { timeout: 30000 });
  const artReloaded = await restarted.evaluate(() => window.__sv.art().bank);
  await second.close();
  check(artReloaded === 'new', `the saved ART choice is used at the next start (${artReloaded})`);
  // Still on OPTIONS, the ART row selected: once more.
  await press('Enter');
  await bankIs('current');
  const artBack = await artNow();
  check(
    artBack.row === 'ART: CURRENT' && artBack.saved === false && artBack.bank === 'current' && artBack.zones === 15,
    `OPTIONS > ART: CURRENT goes back to the current art (${JSON.stringify(artBack)})`,
  );
  await press('Escape');
  await wait(300);

  // The story menu's level list: Escape and Back return to the story menu, once.
  await page.evaluate(() => window.__sv.flow.story.openMenu());
  await wait(600);
  await press('ArrowDown'); // BEGIN THE DREAM, then LEVEL 1
  await page.keyboard.press('Enter');
  await wait(1200);
  check((await top()) === 'StoryChapterScene', 'the story menu opens a level');
  await countGlitches();
  await page.keyboard.press('Escape');
  await wait(1200);
  const glitches = await page.evaluate(() => window.__glitches);
  check((await top()) === 'StoryMenuScene' && glitches === 1, `Escape on the level list goes back once (${glitches} transition(s))`);
  await wait(400);
  await press('ArrowDown'); // a new story menu: LEVEL 1 again
  await page.keyboard.press('Enter');
  await wait(1200);
  const reopened = await top();
  await androidBack();
  await wait(500);
  const after = await top();
  check(reopened === 'StoryChapterScene' && after === 'StoryMenuScene', `Back on the level list goes back to the story menu (${reopened} -> ${after})`);
  await wait(400);
  await androidBack();
  await wait(1000);
  check((await top()) === 'TitleScene', `Back on the story menu goes to the title (${await top()})`);
  await page.evaluate(() => window.__sv.flow.story.openMenu());
  await wait(800);
  await press('Escape');
  await wait(1200);
  check((await top()) === 'TitleScene', `Escape on the story menu goes to the title (${await top()})`);

  // A story scene: Back opens and closes the pause menu; a resize under it keeps MENU off.
  await page.evaluate(() => window.__sv.flow.story.debugPlay('1.1'));
  await wait(900);
  await androidBack();
  check((await top()) === 'StoryPauseScene', 'Back pauses a story scene');
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.width - 20, height: vp.height });
  await wait(300);
  await page.setViewportSize(vp);
  await wait(300);
  const corner = await page.evaluate(() => {
    const r = window.__sv.game.canvas.getBoundingClientRect();
    return { x: r.right - (14 * r.width) / window.__sv.game.width, y: r.top + (12 * r.height) / window.__sv.game.height };
  });
  await page.mouse.click(corner.x, corner.y);
  await wait(400);
  check((await top()) === 'StoryPauseScene', 'after a resize, a tap on the hidden MENU corner leaves the pause menu open');
  await androidBack();
  check((await top()) === 'StoryScene', 'Back resumes the story scene');

  // J (and X) continue, confirm and pick wherever Space / Enter do (Input.consumeContinue).
  await page.evaluate(() => window.__sv.flow.story.newGame());
  await wait(900);
  const card = await top();
  await press('KeyJ');
  await wait(1400);
  const afterCard = await top();
  check(card === 'StoryCardScene' && afterCard === 'BriefingScene', `J advances a story card (${card} -> ${afterCard})`);
  const briefing = await page.evaluate(() => ({
    touch: window.__sv.game.input.usingTouch,
    prompt: window.__sv.top().prompt.content.map((s) => s.text).join(''),
  }));
  check(
    briefing.prompt === (briefing.touch ? 'TAP TO START' : 'PRESS SPACE'),
    `the Briefing's hint follows the input in use, like every other hint (${briefing.prompt}, touch seen: ${briefing.touch})`,
  );
  await press('KeyJ');
  await wait(500);
  check((await top()) === 'GameScene', 'J starts the walk from the Briefing');
  await page.evaluate(() => window.__sv.flow.story.debugPlay('1.1'));
  await wait(900);
  await press('Escape');
  await wait(300);
  const paused = await top();
  await press('KeyJ');
  await wait(400);
  const resumed = await top();
  check(paused === 'StoryPauseScene' && resumed === 'StoryScene', `J picks the selected menu item (RESUME: ${paused} -> ${resumed})`);
  // Each of the next checks starts from a fresh title, so one failure does not hide the others.
  const freshTitle = async () => {
    await page.evaluate(() => window.__sv.flow.toTitle());
    await wait(1500);
  };
  await freshTitle();
  await page.evaluate(() => window.__sv.top().actions.glossary());
  await wait(500);
  const glossary = await top();
  await press('KeyJ');
  await wait(300);
  const afterGlossary = await top();
  check(glossary === 'GlossaryScene' && afterGlossary === 'TitleScene', `J closes the GLOSSARY card (${glossary} -> ${afterGlossary})`);

  // Escape does what Back does on OPTIONS and on the NEW GAME? question; on the title, nothing.
  const titleShown = () => page.evaluate(() => window.__sv.top().constructor.name === 'TitleScene' && window.__sv.top().root.visible);
  await freshTitle();
  await page.evaluate(() => window.__sv.top().actions.options());
  await wait(500);
  const options = await top();
  await press('Escape');
  await wait(300);
  check(options === 'OptionsScene' && (await titleShown()), `Escape closes OPTIONS and shows the title again (${options} -> ${await top()})`);
  // A saved story, so NEW GAME asks first.
  await page.evaluate(() => {
    const story = window.__sv.flow.story;
    story.debugReset();
    story.state.completed.push('1.0');
    localStorage.setItem('supervillained:story', JSON.stringify(story.state));
  });
  await freshTitle();
  await page.evaluate(() => window.__sv.top().actions.newGame());
  await wait(500);
  const confirm = await top();
  await press('Escape');
  await wait(300);
  check(confirm === 'ConfirmScene' && (await titleShown()), `Escape closes the NEW GAME? question and shows the title again (${confirm} -> ${await top()})`);
  await freshTitle();
  await press('Escape');
  await wait(400);
  check(await titleShown(), `Escape on the title does nothing (Back quits there; ${await top()})`);
  // Fast text and J held down to skip dialogue: the presses never pick an answer not yet shown.
  await page.evaluate(() => window.__sv.game.updateSettings((st) => (st.textSpeed = 'instant')));
  // The presses are timed by the question's own clock (game time), not the wall clock, so a busy
  // machine cannot push them past the prompt and the guard (0.3 s + STORY.CHOICE_GUARD).
  const askTime = () => page.evaluate(() => window.__sv.top().current?.t ?? -1);
  let mashed = 0;
  for (let attempt = 0; attempt < 3 && mashed < 3; attempt++) {
    mashed = 0;
    await page.evaluate(() => window.__sv.flow.story.debugPlay('1.3'));
    await wait(600);
    for (let k = 0; k < 30; k++) {
      const st = await page.evaluate(() => window.__sv.top().debugState?.().step ?? null);
      if (st === 'AskStep') break;
      await page.evaluate(() => window.__sv.top().debugSkip?.());
      await wait(100);
    }
    for (let k = 0; k < 12; k++) {
      const t = await askTime();
      if (t < 0 || t > 0.48) break;
      await page.keyboard.press('KeyJ');
      mashed++;
      await wait(40);
    }
  }
  await wait(600);
  const asked = await page.evaluate(() => window.__sv.top().debugState());
  await press('KeyJ');
  await wait(300);
  const answered = await page.evaluate(() => window.__sv.top().debugState());
  check(mashed >= 3 && asked.step === 'AskStep' && asked.metrics.choices.length === 0, `J mashed through a question's prompt picks nothing (${mashed} presses; ${asked.step}, picked: ${asked.metrics.choices.join(', ') || 'none'})`);
  check(answered.metrics.choices.length === 1, `a J once the answers are shown picks one (${answered.metrics.choices.join(', ') || 'none'})`);
  await page.evaluate(() => window.__sv.game.updateSettings((st) => (st.textSpeed = 'normal')));

  // The same Briefing reached with a finger on a phone: the touch wording (the page emulates one).
  await page.evaluate(() => window.__sv.flow.story.newGame());
  await wait(900);
  await page.touchscreen.tap(200, 500);
  await wait(1400);
  const touched = await page.evaluate(() => ({
    top: window.__sv.top().constructor.name,
    touch: window.__sv.game.input.usingTouch,
    prompt: window.__sv.top().prompt?.content.map((s) => s.text).join('') ?? '',
  }));
  check(touched.top === 'BriefingScene' && touched.touch && touched.prompt === 'TAP TO START', `a tap on the card: the Briefing says TAP TO START (${touched.prompt}, touch seen: ${touched.touch})`);
  check(errors.length === 0, `no page errors (${errors.join(' | ') || 'none'})`);
  page.off('pageerror', onError);
  await page.evaluate(() => localStorage.clear());
  return fails;
}

/**
 * The Green Zone walk (story 1.0): Bagnaskiz's band waits half way. Their voices from a quarter
 * of the way, NOW! at the middle, Zampano frozen with fright, the band's poop piles (not his),
 * the band gone, Bagnaskiz's usual attack held meanwhile; and no ambush when he jumps past it.
 * Returns the number of failures.
 */
async function walkChecks(page) {
  let fails = 0;
  const check = (ok, what) => {
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} walk: ${what}`);
  };
  const errors = [];
  const onError = (e) => errors.push(e.message);
  page.on('pageerror', onError);
  const state = () =>
    page.evaluate(() => {
      const s = window.__sv.scene();
      return {
        phase: s.ambush?.director.phase ?? null,
        player: s.player.state,
        band: s.ambush?.band.length ?? 0,
        piles: s.rules.poops.length,
        own: s.rules.stats.poops,
        pug: !!s.threats.pug,
        attack: s.threats.director.state,
        held: s.ambush?.holdsAttack ?? false,
        voices: window.__voices ?? [],
      };
    });
  await page.evaluate(() => {
    localStorage.clear();
    window.__sv.flow.play(1);
  });
  await wait(1200);
  await page.evaluate(() => {
    window.__voices = [];
    window.__heard = { now: [], barks: 0 };
    const ev = window.__sv.scene().events;
    ev.on('ambushVoice', (e) => window.__voices.push(e.text));
    ev.on('ambushNow', (e) => window.__heard.now.push(e.text));
    ev.on('ambushBark', () => window.__heard.barks++);
  });
  let st = await state();
  check(st.phase === 'waiting' && st.band === 3, `the band waits from the start (${st.phase}, ${st.band} of them)`);
  // Just short of a quarter of the way: still silent.
  await page.evaluate(() => window.__sv.scene().teleport(71.5, 71.5)); // on the road, about 22 %
  await wait(2500);
  st = await state();
  check(st.phase === 'waiting' && st.voices.length === 0, `silent before a quarter of the way (${st.phase}, ${st.voices.length} voices)`);
  // A third of the way up the road: their voices.
  await page.evaluate(() => window.__sv.scene().teleport(58.9, 57.5));
  for (let k = 0; k < 40 && !(await state()).voices.length; k++) await wait(150);
  st = await state();
  check(st.phase === 'voices' && st.voices.length > 0, `their voices from a quarter of the way (${st.voices.join(' / ') || 'none'})`);
  // Dirty the zone well below the attack threshold: without the hold, Bagnaskiz would come now.
  const dirty = await page.evaluate(() => {
    const s = window.__sv.scene();
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) s.map.stampDirt(s.player.gx + a * 4, s.player.gy + b * 4, 3, 1);
    window.__sv.step(90);
    return +s.map.health().toFixed(3);
  });
  st = await state();
  check(dirty < 0.95 && !st.pug && st.attack === 'calm' && st.held, `Bagnaskiz's usual attack waits while he waits with his band, even with the zone dirty (health ${dirty})`);
  // Up the road to the middle.
  await page.evaluate(() => window.__sv.scene().teleport(51.1, 48.6));
  await wait(300);
  await page.keyboard.down('KeyW');
  for (let k = 0; k < 60 && (await state()).phase === 'voices'; k++) await wait(40);
  await page.keyboard.up('KeyW');
  st = await state();
  check(st.phase === 'now' || st.phase === 'jump', `NOW! at the middle of the walk (${st.phase})`);
  for (let k = 0; k < 60 && (await state()).phase !== 'scare'; k++) await wait(50);
  st = await state();
  check(st.phase === 'scare' && st.player === 'scared', `they jump in and he is frozen with fright (${st.phase}, ${st.player})`);
  for (let k = 0; k < 160 && (await state()).phase !== 'done'; k++) await wait(50);
  st = await state();
  check(st.phase === 'done' && st.band === 0 && st.player === 'free', `then they run off and he can move again (${st.phase}, ${st.band} left, ${st.player})`);
  check(st.piles >= 6 && st.own === 0, `they pooped all around him; none counted as his (${st.piles} piles, his POOPS ${st.own})`);
  const spread = await page.evaluate(() => {
    const s = window.__sv.scene();
    const d = s.rules.poops.map((p) => Math.hypot(p.gx - s.player.gx, p.gy - s.player.gy));
    return { min: +Math.min(...d).toFixed(1), max: +Math.max(...d).toFixed(1), heard: window.__heard };
  });
  check(spread.max > 2.5, `the piles are spread, not in one pee's reach (${spread.min} to ${spread.max} tiles)`);
  check(spread.heard.now.join() === 'NOW!' && spread.heard.barks >= 4, `Bagnaskiz shouted NOW! and they barked around him (${spread.heard.now.join()} / ${spread.heard.barks} barks)`);
  check(st.held && !st.pug, 'a grace period before Bagnaskiz comes back on his own');
  // Bagnaskiz comes back alone later (the scripted attack, 70 %), once the grace is over.
  await page.evaluate(() => {
    const s = window.__sv.scene();
    s.teleport(27.5, 29.5); // on the road at 72 %
    window.__sv.step(60 * 9);
  });
  await wait(300);
  st = await state();
  check(st.attack === 'attack' && st.pug && !st.held, `Bagnaskiz comes back alone after the grace, at 70 % (${st.attack}, pug: ${st.pug})`);

  // He walks away at the shout: they still run him down (they chase where he is now).
  await page.evaluate(() => window.__sv.flow.play(1));
  await wait(900);
  await page.evaluate(() => window.__sv.scene().teleport(51.1, 48.6));
  await wait(300);
  await page.keyboard.down('KeyW');
  for (let k = 0; k < 60 && (await state()).phase === 'voices'; k++) await wait(40);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyS');
  for (let k = 0; k < 60 && (await state()).phase !== 'scare'; k++) await wait(40);
  await page.keyboard.up('KeyS');
  const near = await page.evaluate(() => {
    const s = window.__sv.scene();
    return s.ambush.band.map((m) => +Math.hypot(m.actor.gx - s.player.gx, m.actor.gy - s.player.gy).toFixed(1));
  });
  check((await state()).phase === 'scare' && near.every((d) => d < 3.6), `walking away at NOW!, he is still caught (band at ${near.join(', ')} tiles)`);

  // On the west trail, far from where they wait: they pop up ahead of him, clear of hedges.
  await page.evaluate(() => window.__sv.flow.play(1));
  await wait(900);
  await page.evaluate(() => window.__sv.scene().teleport(38.5, 58.5));
  await wait(300);
  await page.keyboard.down('KeyW');
  for (let k = 0; k < 60 && (await state()).phase === 'voices'; k++) await wait(40);
  await page.keyboard.up('KeyW');
  for (let k = 0; k < 60 && (await state()).phase !== 'scare'; k++) await wait(50);
  const west = await page.evaluate(() => {
    const s = window.__sv.scene();
    return {
      phase: s.ambush.director.phase,
      stuck: s.ambush.band.filter((m) => s.map.circleBlocked(m.actor.gx, m.actor.gy, 0.25)).length,
      far: s.ambush.band.map((m) => +Math.hypot(m.actor.gx - s.player.gx, m.actor.gy - s.player.gy).toFixed(1)),
    };
  });
  check(west.phase === 'scare' && west.stuck === 0 && west.far.every((d) => d < 3.6), `from the west trail they pop up ahead and reach him (${west.phase}, band at ${west.far.join(', ')}, stuck ${west.stuck})`);

  // Jumping past the middle (a teleport): no ambush, nothing held.
  await page.evaluate(() => window.__sv.flow.play(1));
  await wait(900);
  await page.evaluate(() => window.__sv.scene().teleport(20.5, 22.5));
  await wait(300);
  st = await state();
  check(st.phase === 'done' && st.band === 0 && !st.held, `no ambush when he gets past it some other way (${st.phase}, held: ${st.held})`);
  check(errors.length === 0, `no page errors (${errors.join(' | ') || 'none'})`);
  page.off('pageerror', onError);
  await page.evaluate(() => localStorage.clear());
  return fails;
}

/**
 * The word mini-games with the keyboard only: 5.4 (the letter) is played to the 'named' outcome
 * through every kind of button (change a word, send, write it again, accept), 6.2 (the rumour)
 * to the end. Returns the number of failures.
 */
async function keyChecks(page) {
  let fails = 0;
  const check = (ok, what) => {
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} keys: ${what}`);
  };
  const errors = [];
  const onError = (e) => errors.push(e.message);
  page.on('pageerror', onError);
  /** The scene, and the mini-game it is running (its buttons and the highlighted one). */
  const state = () =>
    page.evaluate(() => {
      const top = window.__sv.top();
      if (!top.debugState) return { scene: top.constructor.name };
      const d = top.debugState();
      const g = top.current?.game;
      const ids = g?.buttons?.map((b) => b.id) ?? [];
      const k = g?.picker ? g.picker.cursor.current(ids.length) : -1;
      return {
        scene: top.constructor.name,
        sub: d.sub,
        step: d.step,
        minis: [...d.metrics.minis],
        flags: { ...top.state.flags },
        game: g ? { name: g.constructor.name, ids, lit: k >= 0 ? ids[k] : null, picks: g.picks ? [...g.picks] : null, placed: g.placed?.length ?? null } : null,
      };
    });
  /** Starts a sub-level and skips its steps until a mini-game runs. */
  const toMini = async (id) => {
    await page.evaluate((s) => window.__sv.flow.story.debugPlay(s), id);
    await wait(600);
    for (let k = 0; k < 40; k++) {
      const s = await state();
      if (s.step === 'MiniGameStep' && s.game) return s;
      await page.evaluate(() => window.__sv.top().debugSkip?.());
      await wait(150);
    }
    return state();
  };
  /** Presses a key, then waits (a little) for what it should do. */
  const press = async (key, done) => {
    await page.keyboard.press(key);
    for (let k = 0; k < 30; k++) {
      await wait(50);
      const s = await state();
      if (done(s)) return s;
    }
    return state();
  };
  const ended = (name) => (s) => s.minis.includes(`${name}:won`) && s.step !== 'MiniGameStep';

  // 5.4: write, send, write it again with the debt named, send, hear the answer out.
  let s = await toMini('5.4');
  check(s.game?.name === 'LetterGame', `5.4 reaches the letter (${s.step})`);
  if (s.game?.name === 'LetterGame') {
    await wait(300);
    s = await state();
    check(s.game.lit === null, 'no highlight before a direction key (touch players see nothing new)');
    s = await press('ArrowDown', (q) => q.game?.lit === 'slot0');
    check(s.game?.lit === 'slot0', `the first arrow shows the highlight on the first word (${s.game?.lit})`);
    s = await press('ArrowUp', (q) => q.game?.lit === 'send');
    check(s.game?.lit === 'send', `up from the first button wraps to READ IT ALOUD AND SEND IT (${s.game?.lit})`);
    s = await press('Enter', (q) => q.game?.ids.includes('again'));
    check(s.game?.ids.join() === 'again,accept', `Enter sends the letter (${s.game?.ids})`);
    s = await press('ArrowUp', (q) => q.game?.lit === 'again');
    s = await press('KeyJ', (q) => q.game?.ids.includes('send'));
    check(s.game?.ids.includes('slot1'), 'J on WRITE IT AGAIN goes back to the writing table');
    s = await press('ArrowRight', (q) => q.game?.lit === 'slot1');
    s = await press('Space', (q) => q.game?.picks?.[1] === 1);
    check(s.game?.picks?.[1] === 1, `Space on the second word changes it to the debt (${s.game?.picks})`);
    s = await press('ArrowDown', (q) => q.game?.lit === 'slot2');
    s = await press('ArrowDown', (q) => q.game?.lit === 'send');
    s = await press('KeyX', (q) => q.game?.ids.includes('accept'));
    s = await press('Enter', ended('LetterGame'));
    check(s.flags.letter === 'named', `the debt is named (letter: ${s.flags.letter})`);
    check(ended('LetterGame')(s), `the scene moves on past the mini-game (${s.step}; ${s.minis})`);
  }

  // 6.2: put the pieces in order as they arrive, with the arrows and the confirm keys.
  s = await toMini('6.2');
  check(s.game?.name === 'RumourGame', `6.2 reaches the rumour (${s.step})`);
  if (s.game?.name === 'RumourGame') {
    check(s.game.lit === null, 'no highlight before a direction key');
    const confirms = ['Enter', 'Space', 'KeyJ', 'KeyX'];
    for (let k = 0; k < 120 && s.game?.name === 'RumourGame'; k++) {
      const { ids, lit, placed } = s.game;
      const target = ids.indexOf(String(placed));
      if (target < 0) {
        await wait(200);
        s = await state();
      } else if (lit === null) s = await press('ArrowDown', (q) => q.game?.lit != null);
      else if (ids.indexOf(lit) !== target) {
        const key = ids.indexOf(lit) < target ? 'ArrowDown' : 'ArrowUp';
        s = await press(key, (q) => q.game?.lit !== lit || q.game?.ids.join() !== ids.join());
      } else s = await press(confirms[placed % confirms.length], (q) => !q.game || q.game.placed !== placed);
    }
    check(ended('RumourGame')(s), `the pieces in order with the keyboard only, and the scene moves on (${s.step}; ${s.minis})`);
  }
  check(errors.length === 0, `no page errors (${errors.join(' | ') || 'none'})`);
  page.off('pageerror', onError);
  await page.evaluate(() => localStorage.clear());
  return fails;
}

const server = await startServer();
const browser = await chromium.launch();
let failures = 0;
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' || /missing texture|GL_INVALID/.test(text)) errors.push(text);
  });
  await page.goto(`http://127.0.0.1:${PORT}/?story=1.1`);
  await page.waitForFunction(() => window.__sv && window.__sv.top(), null, { timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  const all = await page.evaluate(() => window.__sv.storyIds());
  const GROUPS = ['progress', 'menus', 'keys', 'walk'];
  const named = process.argv.slice(2).filter((a) => !GROUPS.includes(a));
  const groups = process.argv.slice(2).length ? GROUPS.filter((g) => process.argv.includes(g)) : GROUPS;
  const ids = named.length ? named : groups.length && process.argv.slice(2).length ? [] : all;
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  for (const id of ids) {
    errors.length = 0;
    await page.evaluate((s) => window.__sv.flow.story.debugPlay(s), id);
    await wait(250);
    let steps = 0;
    let shot = false;
    const seen = [];
    for (let guard = 0; guard < 400; guard++) {
      const st = await page.evaluate(
        (s) => {
          const top = window.__sv.top();
          if (!top.debugSkip) return null;
          const d = top.debugState();
          return d.sub === s ? d : null;
        },
        id,
      );
      if (!st) break;
      if (st.step) seen.push(st.step);
      if (SHOTS && !shot && INTERESTING.has(st.step)) {
        await wait(st.step === 'WalkStep' ? 900 : 500);
        await page.screenshot({ path: `${SHOTS}/${id}.png` });
        shot = true;
      }
      await wait(90);
      await page.evaluate((s) => {
        const top = window.__sv.top();
        if (top.debugSkip && top.debugState().sub === s) top.debugSkip();
      }, id);
      steps++;
      if (errors.length) break;
    }
    if (SHOTS && !shot) await page.screenshot({ path: `${SHOTS}/${id}.png` });
    const kinds = [...new Set(seen)].join(',');
    if (errors.length) {
      failures++;
      console.log(`FAIL ${id} after ${steps} steps: ${errors.join(' | ')}`);
    } else console.log(`ok   ${id}  ${steps} steps  [${kinds}]`);
  }
  // With no sub-levels named (or `npm run smoke -- progress`): the saving rules, through the
  // real pause menu and the real save.
  if (groups.includes('progress')) failures += await progressChecks(page);
  if (groups.includes('menus')) failures += await menuChecks(page);
  if (groups.includes('keys')) failures += await keyChecks(page);
  if (groups.includes('walk')) failures += await walkChecks(page);
  await page.close();
} catch (err) {
  console.error(err);
  failures++;
} finally {
  await browser.close();
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill();
  }
}
console.log(failures ? `${failures} failure(s)` : 'all ok');
process.exit(failures ? 1 : 0);
