/**
 * Story smoke test: plays every sub-level script from start to finish, skipping each step after a
 * few frames (`StoryScene.debugSkip`), and fails on any page error (missing marker, unknown actor,
 * bad sprite key...). Then two groups of flow checks through the real menus: `progress` (what a
 * scene saves on restart / quit / skip) and `menus` (double presses during a transition, Escape
 * and the Android Back button on each kind of screen, the MENU button after a resize).
 *
 *   npm run smoke                 all sub-levels, then both groups of checks
 *   npm run smoke -- 7.3 8.1      selected sub-levels
 *   npm run smoke -- progress menus   only those checks
 *   SMOKE_SHOTS=dir npm run smoke one screenshot per sub-level (first walk / mini-game / choice)
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 5198;
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
  await press('ArrowDown', 4);
  await page.keyboard.press('Enter');
  await wait(30);
  await page.keyboard.press('Enter');
  await wait(1600);
  check((await top()) === 'TitleScene' && (await loopRunning()) && errors.length === 0, `QUIT TO TITLE pressed twice: one title, the game goes on (${errors[0] ?? 'no errors'})`);

  // Over the title: OPTIONS, CONTROLS, CONFIRM close with Back.
  await page.evaluate(() => window.__sv.top().actions.options());
  await wait(500);
  await press('ArrowDown', 3);
  await page.keyboard.press('Enter');
  await wait(400);
  check((await top()) === 'ControlsScene', 'OPTIONS > CONTROLS opens');
  await androidBack();
  check((await top()) === 'OptionsScene', 'Back closes CONTROLS');
  await androidBack();
  check((await top()) === 'TitleScene' && (await page.evaluate(() => window.__sv.top().root.visible)), 'Back closes OPTIONS and shows the title again');

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
  const GROUPS = ['progress', 'menus'];
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
