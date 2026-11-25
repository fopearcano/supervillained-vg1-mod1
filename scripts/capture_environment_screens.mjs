// The environment art of every chapter, in both banks of OPTIONS > ART (a temporary test option):
// one screenshot per story stage, dialogue and cards hidden, for comparing the current Color Ink
// art (v1) with the vibrant recolour (v2) side by side.
//
//   npm run screens:environments                 # both banks
//   npm run screens:environments -- new          # one bank: current | new
//
// Output: docs/screens/environments/current/*.png and docs/screens/environments/new/*.png.
// Uses the Vite dev server: do not edit src/ while it runs.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = Number(process.env.SV_PORT ?? 5203); // SV_PORT: run two checks side by side
const OUT = 'docs/screens/environments';
const VIEWPORT = { width: 400, height: 860 };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const asked = process.argv.slice(2).filter((a) => a === 'current' || a === 'new');
const BANKS = asked.length ? asked : ['current', 'new'];

/** [story sub-level, the stage it shows, file name] */
const captures = [
  ['1.1', 'neighborhood', 'ch01-neighborhood'],
  ['1.2', 'study', 'ch01-study'],
  ['2.1', 'jerusalem', 'ch02-jerusalem'],
  ['2.2', 'fair', 'ch02-fair'],
  ['2.3', 'road', 'ch02-road'],
  ['3.1', 'venice', 'ch03-venice'],
  ['3.2', 'lido', 'ch03-lido'],
  ['4.1', 'ship', 'ch04-ship'],
  ['5.1', 'zara', 'ch05-zara'],
  ['6.1', 'winter', 'ch06-winter'],
  ['6.3', 'island', 'ch06-island'],
  ['7.1', 'city', 'ch07-city'],
  ['7.3', 'field', 'ch07-field'],
  ['7.6', 'palace', 'ch07-palace'],
  ['7.7', 'breach', 'ch07-breach'],
  ['8.1', 'shattered', 'ch08-shattered'],
  ['8.2', 'study', 'ch08-study'],
  ['8.3', 'neighborhood', 'ch08-neighborhood'],
];

async function startServer() {
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('vite did not start')), 30000);
    proc.stdout.on('data', (data) => {
      if (String(data).includes('Local')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.on('exit', (code) => reject(new Error(`vite exited ${code}`)));
  });
  return proc;
}

const server = await startServer();
const browser = await chromium.launch();
let failed = false;
try {
  for (const bank of BANKS) {
    mkdirSync(`${OUT}/${bank}`, { recursive: true });
    for (const [story, expectedMap, label] of captures) {
      const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      try {
        await page.goto(`http://127.0.0.1:${PORT}/?story=${story}&art=${bank}`);
        await page.waitForFunction(() => window.__sv && window.__sv.top(), null, { timeout: 30000 });
        // The bank asked for is the one shown, with all its zones decoded.
        const art = await page.evaluate(() => window.__sv.art());
        if (art.bank !== bank) throw new Error(`art bank ${art.bank}, expected ${bank}`);
        if (art.loadedZones.length !== 15) throw new Error(`${art.loadedZones.length}/15 zones decoded: ${art.warnings.join('; ')}`);
        let actual = null;
        for (let attempt = 0; attempt < 100; attempt++) {
          actual = await page.evaluate(() => window.__sv.top().mapKey ?? null);
          if (actual === expectedMap) break;
          const skipped = await page.evaluate(() => {
            const scene = window.__sv.top();
            if (!scene.debugSkip) return false;
            scene.debugSkip();
            return true;
          });
          if (!skipped) break;
          await wait(90);
        }
        if (actual !== expectedMap) throw new Error(`expected stage ${expectedMap}, got ${actual}`);
        await page.evaluate(() => {
          const scene = window.__sv.top();
          if (scene.dialogue?.root) scene.dialogue.root.visible = false;
          if (scene.cards?.root) scene.cards.root.visible = false;
        });
        await wait(350);
        await page.screenshot({ path: `${OUT}/${bank}/${label}.png` });
        if (errors.length) throw new Error(errors.join('; '));
        console.log(`${bank}/${label}: ok`);
      } catch (error) {
        failed = true;
        console.log(`${bank}/${label} (${story}): FAILED ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill();
  }
}
process.exit(failed ? 1 : 0);
