/**
 * The locks of BLUEPRINT.md (Step 0): proof that a restructure step changed nothing the game does
 * or shows. Everything runs in the deterministic harness (scripts/harness.mjs), so the same code
 * gives the same output byte for byte.
 *
 * - playtest: `npm run playtest` with fixed options (skill 0.7, ending knight, seed 1; choices
 *   "first" and "random") gives the same report, with no page error and no walk without controls.
 * - save: the saved data (campaign, settings, records) at the end of those two runs is the same.
 * - pixels: stepped captures of the screens in the lock list (title, menus, glossary, the Green
 *   Zone, story stages with the visor, the bleach, the fog, the snap, the pause, both art banks)
 *   hash the same.
 *
 *   npm run lock -- record [playtest|save|pixels]   write the baselines into docs/baselines/
 *   npm run lock -- check  [playtest|save|pixels]   compare with the baselines (exit 1 on a change)
 *   npm run lock -- prove  [playtest|save|pixels]   run twice and compare the two runs (the harness
 *                                                   check; the baselines are not touched)
 *   npm run lock -- check pixels --only title,glossary   some captures only
 *
 * `save` comes with `playtest` (the same runs). The captures are made on this machine's software
 * WebGL; record the baselines again on another machine before checking there. Never edit src/
 * while a lock runs (the dev server reloads the page).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { capture, openStepped, settle, startServer, step, stepUntil, stopServer } from './harness.mjs';
import { CAPTURES } from './lockCaptures.mjs';

const BASE = 'docs/baselines';
const argv = process.argv.slice(2);
const mode = argv[0];
if (!['record', 'check', 'prove'].includes(mode)) {
  console.error('usage: npm run lock -- record|check|prove [playtest] [save] [pixels] [--only a,b]');
  process.exit(2);
}
const onlyAt = argv.indexOf('--only');
const ONLY = onlyAt >= 0 ? new Set(argv[onlyAt + 1].split(',')) : null;
const named = argv.slice(1).filter((a, k, all) => !a.startsWith('--') && all[k - 1] !== '--only');
const LOCKS = named.length ? named : ['playtest', 'save', 'pixels'];
const PLAYTESTS = [
  { id: 'first', args: ['--skill', '0.7', '--ending', 'knight', '--choice', 'first', '--seed', '1'] },
  { id: 'random', args: ['--skill', '0.7', '--ending', 'knight', '--choice', 'random', '--seed', '1'] },
];

/** Runs the playtests side by side (one dev server each) into `dir`: report-<id>.md, save-<id>.json. */
async function runPlaytests(dir, portBase) {
  return Promise.all(
    PLAYTESTS.map(
      (p, k) =>
        new Promise((resolve) => {
          const report = join(dir, `playtest-${p.id}.md`);
          const save = join(dir, `save-${p.id}.json`);
          const proc = spawn(process.execPath, ['scripts/playtest.mjs', ...p.args, '--out', report, '--save', save], {
            env: { ...process.env, SV_PORT: String(portBase + k) },
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let log = '';
          proc.stdout.on('data', (d) => (log += d));
          proc.stderr.on('data', (d) => (log += d));
          proc.on('exit', (code) => resolve({ id: p.id, code, log, report, save }));
        }),
    ),
  );
}

/** Makes every capture of the lock list into `dir` (PNG files and captures.json with the hashes). */
async function runCaptures(dir, port) {
  const server = await startServer(port);
  const browser = await chromium.launch();
  const hashes = {};
  const errors = [];
  try {
    for (const c of CAPTURES) {
      const wanted = c.shots.filter((s) => !ONLY || ONLY.has(s) || ONLY.has(c.id));
      if (!wanted.length) continue;
      const pageErrors = [];
      const page = await openStepped(browser, { port, query: c.query ?? '', storage: c.storage ?? {}, onError: (e) => pageErrors.push(e) });
      const h = {
        page,
        step: (n) => step(page, n),
        until: (pred, opts) => stepUntil(page, pred, opts),
        ev: (fn, arg) => page.evaluate(fn, arg),
        settle: () => settle(page),
        shot: async (name) => {
          if (!wanted.includes(name)) return;
          const { png, hash } = await capture(page);
          writeFileSync(join(dir, `${name}.png`), png);
          hashes[name] = hash;
          process.stdout.write(`  ${name} ${hash.slice(0, 12)}\n`);
        },
      };
      try {
        await c.run(h);
      } catch (err) {
        errors.push(`${c.id}: ${err.message}`);
        console.log(`  ${c.id} FAILED: ${err.message}`);
      }
      if (pageErrors.length) errors.push(`${c.id}: page errors: ${[...new Set(pageErrors)].slice(0, 3).join(' | ')}`);
      await page.context().close();
    }
  } finally {
    await browser.close();
    stopServer(server);
  }
  // Some captures only (--only): the others keep their recorded hashes.
  const file = join(dir, 'captures.json');
  const all = ONLY && existsSync(file) ? { ...JSON.parse(readFileSync(file, 'utf8')), ...hashes } : hashes;
  const order = CAPTURES.flatMap((c) => c.shots).filter((n) => n in all);
  writeFileSync(file, JSON.stringify(Object.fromEntries(order.map((n) => [n, all[n]])), null, 2) + '\n');
  return { hashes, errors };
}

/** Compares two directories of lock output; returns the differences. */
function compare(a, b) {
  const diffs = [];
  const same = (f) => existsSync(join(a, f)) && existsSync(join(b, f)) && readFileSync(join(a, f)).equals(readFileSync(join(b, f)));
  if (LOCKS.includes('playtest')) for (const p of PLAYTESTS) if (!same(`playtest-${p.id}.md`)) diffs.push(`playtest report "${p.id}" differs (${join(a, `playtest-${p.id}.md`)} vs ${join(b, `playtest-${p.id}.md`)})`);
  if (LOCKS.includes('save')) for (const p of PLAYTESTS) if (!same(`save-${p.id}.json`)) diffs.push(`saved data after "${p.id}" differs (${join(a, `save-${p.id}.json`)} vs ${join(b, `save-${p.id}.json`)})`);
  if (LOCKS.includes('pixels')) {
    const ha = existsSync(join(a, 'captures.json')) ? JSON.parse(readFileSync(join(a, 'captures.json'), 'utf8')) : {};
    const hb = existsSync(join(b, 'captures.json')) ? JSON.parse(readFileSync(join(b, 'captures.json'), 'utf8')) : {};
    for (const name of Object.keys(hb)) {
      if (!(name in ha)) diffs.push(`capture ${name}: no baseline`);
      else if (ha[name] !== hb[name]) diffs.push(`capture ${name} differs (${join(a, name + '.png')} vs ${join(b, name + '.png')})`);
    }
    if (!ONLY) for (const name of Object.keys(ha)) if (!(name in hb)) diffs.push(`capture ${name}: not made this time`);
  }
  return diffs;
}

/** One full run of the chosen locks into `dir`; returns the problems (failed runs, page errors). */
async function runAll(dir, portBase) {
  mkdirSync(dir, { recursive: true });
  const problems = [];
  const jobs = [];
  if (LOCKS.includes('playtest') || LOCKS.includes('save')) {
    jobs.push(
      runPlaytests(dir, portBase).then((rs) => {
        for (const r of rs) {
          const tail = r.log.split('\n').filter((l) => /Page errors|not finished|Ending reached|Error/.test(l)).join(' / ');
          console.log(`playtest "${r.id}": exit ${r.code}. ${tail}`);
          if (r.code !== 0) problems.push(`playtest "${r.id}" failed (exit ${r.code}): ${r.log.slice(-800)}`);
        }
      }),
    );
  }
  if (LOCKS.includes('pixels')) {
    jobs.push(
      runCaptures(dir, portBase + 9).then(({ hashes, errors }) => {
        console.log(`pixels: ${Object.keys(hashes).length} captures`);
        problems.push(...errors);
      }),
    );
  }
  await Promise.all(jobs);
  return problems;
}

const t0 = Date.now();
let code = 0;
if (mode === 'record') {
  const problems = await runAll(BASE, 5400);
  if (problems.length) {
    console.log('PROBLEMS (the baselines were written, but fix these first):\n' + problems.join('\n'));
    code = 1;
  } else console.log(`baselines recorded in ${BASE}/`);
} else if (mode === 'check') {
  const dir = mkdtempSync(join(tmpdir(), 'sv-lock-'));
  const problems = await runAll(dir, 5400);
  const diffs = compare(BASE, dir);
  for (const d of [...problems, ...diffs]) console.log(`FAIL ${d}`);
  code = problems.length || diffs.length ? 1 : 0;
  console.log(code ? `the locks FAIL (this run: ${dir})` : 'the locks hold: identical to the baselines');
} else {
  const a = mkdtempSync(join(tmpdir(), 'sv-prove-a-'));
  const b = mkdtempSync(join(tmpdir(), 'sv-prove-b-'));
  // One after the other (side by side they would starve each other of CPU).
  const pa = await runAll(a, 5400);
  const pb = await runAll(b, 5420);
  const diffs = compare(a, b);
  for (const d of [...pa, ...pb, ...diffs]) console.log(`FAIL ${d}`);
  code = pa.length || pb.length || diffs.length ? 1 : 0;
  console.log(code ? `NOT reproducible (runs in ${a} and ${b})` : `reproducible: the two runs are byte-identical (${a}, ${b})`);
}
console.log(`${((Date.now() - t0) / 60000).toFixed(1)} min`);
process.exit(code);
