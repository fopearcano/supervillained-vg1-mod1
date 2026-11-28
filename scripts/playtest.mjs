/**
 * Automated playtest: the story autopilot plays the whole campaign (1.1 → ending) through the
 * same inputs a person uses, at accelerated speed, and reports per sub-level how long it took,
 * how often it had to restart, and how the mini-games went. Fails if a sub-level cannot be
 * finished within the time limit (it is then skipped and marked FAIL).
 *
 *   npm run playtest
 *   npm run playtest -- --skill 0.4 --ending alpha --choice random --from 5.1 --out docs/PLAYTEST.md
 *   npm run playtest -- --from 1.1 --to 1.5     (one level; no ending expected)
 *   npm run playtest -- --seed 7 --save save.json   (another Math.random seed; dump the saved data)
 *
 * It runs in the deterministic harness (scripts/harness.mjs): Math.random is seeded (--seed, 1 by
 * default; --seed off keeps the browser's), the game moves only by steps and every load finishes
 * between batches, so the same options give the same report, byte for byte (the playtest lock,
 * npm run lock).
 */
import { writeFileSync } from 'node:fs';
import { draws, launchBrowser, openStepped, savedData, settle, startServer, stopServer } from './harness.mjs';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(' ')
    .split('--')
    .filter(Boolean)
    .map((a) => a.trim().split(/\s+/))
    .map(([k, v]) => [k, v ?? 'true']),
);
const SKILL = Number(args.skill ?? 0.7);
const ENDING = args.ending === 'alpha' ? 'alpha' : 'knight';
const CHOICE = ['first', 'last', 'random'].includes(args.choice) ? args.choice : 'first';
const FROM = args.from ?? '1.1';
const TO = args.to ?? '';
const OUT = args.out ?? '';
const SAVE = args.save ?? '';
const SEED = args.seed === 'off' ? null : Number(args.seed ?? 1) >>> 0;
const MAX_SUB_SECONDS = Number(args.max ?? 420);
const PORT = Number(process.env.SV_PORT ?? 5196); // SV_PORT: run two checks side by side
const STEPS = 600; // 10 s of game time per call

const server = await startServer(PORT);
const browser = await launchBrowser();
let code = 0;
try {
  const errors = [];
  const page = await openStepped(browser, {
    port: PORT,
    query: `?auto=1&skill=${SKILL}&ending=${ENDING}&choice=${CHOICE}`,
    seed: SEED,
    onError: (e) => errors.push(e),
  });
  await page.evaluate((from) => {
    localStorage.clear();
    window.__sv.game.loop.stop();
    window.__sv.flow.story.debugReset();
    window.__sv.flow.story.debugPlay(from);
  }, FROM);
  await settle(page);
  const t0 = Date.now();
  let last = '';
  for (;;) {
    const st = await page.evaluate(
      ({ steps, max, to }) => {
        const sv = window.__sv;
        // Frame by frame, checking that a walk always has its controls (joystick and buttons) on,
        // after any card or line that cut in (a 2.3 bug: they stayed off after the second one).
        for (let k = 0; k < steps; k++) {
          sv.step(1);
          const s = sv.top();
          let inner = s.current;
          while (inner && inner.constructor.name === 'ResumeStep') inner = inner.inner;
          if (inner?.constructor.name === 'WalkStep' && !s.controlsWanted && s.debugState) {
            (window.__noControls ??= new Set()).add(`${s.debugState().sub} (${s.current.constructor.name})`);
          }
        }
        const top = sv.top();
        const d = top.debugState ? top.debugState() : null;
        if (d && d.time > max && !d.finished) sv.flow.story.debugSkipCurrent();
        const log = sv.flow.story.log;
        return { now: d ? `${d.sub} ${d.time}s ${d.step}` : top.constructor.name, done: log.some((e) => e.id === 'ending' || (to && e.id === to)), n: log.length };
      },
      { steps: STEPS, max: MAX_SUB_SECONDS, to: TO },
    );
    // Loads started by these steps finish now, before the next batch (always at the same step).
    await settle(page);
    if (st.now !== last) {
      last = st.now;
      process.stdout.write(`\r${st.n} done · ${st.now}`.padEnd(70));
    }
    if (st.done) break;
    if (Date.now() - t0 > 25 * 60 * 1000) throw new Error('playtest took more than 25 minutes');
  }
  process.stdout.write('\n');
  const log = await page.evaluate(() => window.__sv.flow.story.log);
  const noControls = await page.evaluate(() => [...(window.__noControls ?? [])]);
  if (noControls.length) errors.push(`a walk ran without its controls: ${noControls.join(', ')}`);
  const rows = [];
  let fails = 0;
  let warns = 0;
  let total = 0;
  for (const e of log) {
    if (e.id === 'ending') continue;
    if (e.greenZone) {
      rows.push(`| ${e.id} | - | - | - | - | - | - | the Green Zone walk: not autoplayed (npm run screens covers it) |`);
      continue;
    }
    const m = e.metrics ?? { restarts: 0, caught: 0, nerveBroken: 0, ran: 0, miniRetries: 0, minis: [] };
    const flags = [];
    if (e.skipped) flags.push('FAIL: not finished');
    if (m.restarts >= 3) flags.push(`${m.restarts} restarts`);
    if (m.miniRetries >= 2) flags.push(`${m.miniRetries} mini-game retries`);
    if (e.time > 240) flags.push('long');
    if (e.skipped) fails++;
    else if (flags.length) warns++;
    total += e.time;
    const minis = m.minis.map((x) => x.replace('Game', '')).join(' ');
    const met = e.meters;
    rows.push(`| ${e.id} | ${e.time.toFixed(0)} | ${m.restarts} | ${m.caught} | ${m.nerveBroken} | ${minis || '-'} | ${met.commozione}/${met.supervillain}/${met.grace}/${met.standing} | ${flags.join(', ') || 'ok'} |`);
  }
  const ending = log.find((e) => e.id === 'ending');
  const report = [
    `# Playtest report`,
    '',
    `Autopilot: skill ${SKILL}, choices "${CHOICE}", ending policy "${ENDING}", seed ${SEED ?? 'off'}. Generated by \`npm run playtest\`.`,
    `Game time ${(total / 60).toFixed(1)} min over ${rows.length} sub-levels. Ending reached: ${ending ? ending.ending.toUpperCase() : 'no'}.`,
    `Sub-levels not finished: ${fails}. Flagged: ${warns}. Page errors: ${errors.length}.${SEED === null ? '' : ` Math.random draws: ${await draws(page)}.`}`,
    '',
    'Columns: game seconds; restarts of a walk (caught, nerve broken, fell back, knocked down); times caught or hit in a fight; nerve broken; mini-game results; meters after (Commozione/Supervillain/Grace/Standing).',
    '',
    '| Sub | s | Restarts | Caught | Nerve | Mini-games | Meters | Notes |',
    '|-----|---|----------|--------|-------|------------|--------|-------|',
    ...rows,
    '',
  ].join('\n');
  console.log(report);
  if (errors.length) console.log('Page errors:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
  if (OUT) writeFileSync(OUT, report);
  if (SAVE) writeFileSync(SAVE, JSON.stringify(await savedData(page), null, 2) + '\n');
  if (fails || errors.length || (!ending && !TO)) code = 1;
} catch (err) {
  console.error(err);
  code = 1;
} finally {
  await browser.close();
  stopServer(server);
}
process.exit(code);
