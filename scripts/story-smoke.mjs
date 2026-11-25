/**
 * Story smoke test: plays every sub-level script from start to finish, skipping each step after a
 * few frames (`StoryScene.debugSkip`), and fails on any page error (missing marker, unknown actor,
 * bad sprite key...).
 *
 *   npm run smoke                 all sub-levels
 *   npm run smoke -- 7.3 8.1      selected sub-levels
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
  const named = process.argv.slice(2).filter((a) => a !== 'progress');
  const ids = named.length ? named : process.argv.includes('progress') ? [] : all;
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
  if (!process.argv.slice(2).length || process.argv.includes('progress')) failures += await progressChecks(page);
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
