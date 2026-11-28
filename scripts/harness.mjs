/**
 * The deterministic harness (BLUEPRINT.md, Step 0): two runs of the same check give byte-identical
 * output, so a restructure step can be proven not to change what the game does or shows.
 *
 * It changes nothing in src/. Before the game loads, an init script:
 * - replaces Math.random with a seeded generator (mulberry32), so all 47 calls draw the same
 *   numbers in the same order;
 * - fixes Date.now (saves stamp `savedAt` with it) and reports autoplay as disallowed (no music
 *   starts without a gesture, and the harness never makes one);
 * - stops requestAnimationFrame from calling back, so the game's own loop (core/loop.ts) never
 *   runs on wall-clock time: time moves only through `__sv.step(n)` (n fixed 1/60 s updates, then
 *   one render; `step(0)` renders without updating);
 * - counts the asynchronous work the game starts (fetch and response bodies, image loads and
 *   decodes, createImageBitmap, ImageDecoder, fonts, audio decoding, worker round trips), so the
 *   harness can wait for it to finish between batches of steps (`settle`). A texture that arrives
 *   while the game is stepped then always lands at the same step.
 * The page has a fixed viewport, device scale 1, touch, locale and time zone. Input reaches the game
 * only through its Input object between steps (trigger, override, pushTap), never as DOM events.
 *
 * Used by scripts/lock.mjs (the playtest, save and pixel locks) and scripts/playtest.mjs.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

/** The phone-sized page every lock uses (the screenshot script's viewport, at scale 1). */
export const VIEWPORT = { width: 400, height: 860 };
/** Date.now inside the page: 1 January 2026, 12:00 UTC. */
export const FIXED_NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

/** Chromium with the software WebGL pinned (the same rasteriser on a machine with a GPU). */
export function launchBrowser() {
  return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}

/** Starts the Vite dev server on `port`; resolves when it listens. */
export async function startServer(port) {
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
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

export function stopServer(proc) {
  try {
    process.kill(-proc.pid, 'SIGTERM');
  } catch {
    proc.kill();
  }
}

/**
 * Runs in the page before any of its scripts (Playwright addInitScript; serialised, so it must
 * not use anything from this module). `seed` null keeps the browser's Math.random.
 */
function harnessInit({ seed, now, storage }) {
  if (window.top !== window) return;
  const H = { pending: 0, started: 0, kinds: {}, draws: 0 };
  Object.defineProperty(window, '__harness', { value: H });

  // Seeded Math.random (mulberry32).
  if (seed !== null && seed !== undefined) {
    let a = seed >>> 0;
    Math.random = function random() {
      H.draws++;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  Date.now = () => now;
  // No sound starts by itself (AudioEngine unlocks at boot where autoplay is allowed): the music's
  // wall-clock position would drive the title's disco lights.
  if (navigator.getAutoplayPolicy) navigator.getAutoplayPolicy = () => 'disallowed';

  // The page never loses focus or hides (the Green Zone walk would pause itself), opens no tab,
  // and says so if the WebGL context is lost.
  for (const type of ['blur', 'focusout']) window.addEventListener(type, (e) => e.target === window && e.stopImmediatePropagation(), true);
  document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
  Object.defineProperty(document, 'hidden', { get: () => false });
  Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
  window.open = () => null;
  document.addEventListener('webglcontextlost', () => console.error('harness: the WebGL context was lost'), true);

  // No frame ever runs on its own: the harness steps the game.
  let rafId = 0;
  window.requestAnimationFrame = () => ++rafId;
  window.cancelAnimationFrame = () => {};

  // localStorage as the check wants it, once per page (the game saves into it afterwards).
  if (storage && !sessionStorage.getItem('__harness_seeded')) {
    sessionStorage.setItem('__harness_seeded', '1');
    localStorage.clear();
    for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
  }

  // In-flight asynchronous work.
  const begin = (kind) => {
    H.pending++;
    H.started++;
    H.kinds[kind] = (H.kinds[kind] ?? 0) + 1;
    let done = false;
    return () => {
      if (done) return;
      done = true;
      H.pending--;
      H.kinds[kind]--;
    };
  };
  const track = (kind, p) => {
    const end = begin(kind);
    p.then(end, end);
    return p;
  };
  const wrapMethod = (proto, name, kind) => {
    const orig = proto && proto[name];
    if (typeof orig !== 'function') return;
    proto[name] = function (...args) {
      return track(kind, orig.apply(this, args));
    };
  };
  const fetch0 = window.fetch;
  window.fetch = function (...args) {
    return track('fetch', fetch0.apply(this, args));
  };
  for (const m of ['arrayBuffer', 'blob', 'json', 'text']) wrapMethod(Response.prototype, m, 'body');
  const cib = window.createImageBitmap;
  if (cib) window.createImageBitmap = function (...args) {
    return track('bitmap', cib.apply(this, args));
  };
  wrapMethod(HTMLImageElement.prototype, 'decode', 'decode');
  const srcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    enumerable: srcDesc.enumerable,
    get: srcDesc.get,
    set(v) {
      srcDesc.set.call(this, v);
      if (this.__harnessEnd || !v) return;
      const end = begin('image');
      const finish = () => {
        this.__harnessEnd = null;
        this.removeEventListener('load', finish);
        this.removeEventListener('error', finish);
        end();
      };
      this.__harnessEnd = finish;
      this.addEventListener('load', finish);
      this.addEventListener('error', finish);
    },
  });
  // The title's GIF: a decoder is busy from its creation (it awaits tracks.ready and completed,
  // then decodes frame after frame) until it is closed.
  if (window.ImageDecoder) {
    const Decoder0 = window.ImageDecoder;
    window.ImageDecoder = class HarnessImageDecoder extends Decoder0 {
      constructor(...args) {
        super(...args);
        this.__end = begin('gif');
      }
      close() {
        this.__end();
        return super.close();
      }
    };
  }
  if (window.FontFace) wrapMethod(window.FontFace.prototype, 'load', 'font');
  if (document.fonts) {
    const load0 = document.fonts.load.bind(document.fonts);
    document.fonts.load = (...args) => track('font', load0(...args));
  }
  if (window.BaseAudioContext) wrapMethod(window.BaseAudioContext.prototype, 'decodeAudioData', 'audio');
  // Pixi decodes textures in a worker: every message posted to a worker waits for its reply.
  const Worker0 = window.Worker;
  if (Worker0) {
    window.Worker = class HarnessWorker extends Worker0 {
      constructor(...args) {
        super(...args);
        this.__ends = [];
        this.addEventListener('message', () => this.__ends.shift()?.());
        this.addEventListener('error', () => this.__ends.shift()?.());
      }
      postMessage(...args) {
        this.__ends.push(begin('worker'));
        return super.postMessage(...args);
      }
    };
  }
}

/**
 * Opens the game at `query` in a fresh context with the harness installed, waits for the boot,
 * stops the game's loop and waits for the boot's loads. `storage`: localStorage to start with
 * (an object of strings; {} = empty). `seed`: Math.random seed (null = the browser's).
 */
export async function openStepped(browser, { port, query = '', seed = 1, storage = {}, onError } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  await context.addInitScript(harnessInit, { seed, now: FIXED_NOW, storage });
  const page = await context.newPage();
  const inFlight = new Set();
  const ignored = new Set(['websocket', 'eventsource', 'media', 'manifest', 'ping', 'other']);
  page.on('request', (r) => {
    if (!ignored.has(r.resourceType())) inFlight.add(r);
  });
  page.on('requestfinished', (r) => inFlight.delete(r));
  page.on('requestfailed', (r) => inFlight.delete(r));
  page.__inFlight = inFlight;
  let booted = false;
  page.on('framenavigated', (f) => {
    if (booted && f === page.mainFrame()) onError?.('harness: the page reloaded during the run (was src/ edited?)');
  });
  if (onError) {
    page.on('pageerror', (e) => onError(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' || /missing texture|GL_INVALID/.test(m.text())) onError(m.text());
    });
  }
  await page.goto(`http://127.0.0.1:${port}/${query}`);
  // Polled on a timer: the page's requestAnimationFrame never calls back.
  await page.waitForFunction(() => window.__sv && window.__sv.top(), null, { timeout: 60000, polling: 50 });
  await page.evaluate(() => window.__sv.game.loop.stop());
  booted = true;
  // The game's loop must not have run a single step on its own.
  const time = await page.evaluate(() => window.__sv.game.time);
  if (time !== 0) throw new Error(`the game ran ${time} s before the harness stopped it`);
  await settle(page);
  return page;
}

/**
 * Waits until the page has no load in flight (network requests and the async work the init
 * script counts), seen idle three times in a row.
 */
export async function settle(page, timeoutMs = 60000) {
  const t0 = Date.now();
  let quiet = 0;
  while (quiet < 3) {
    const h = await page.evaluate(() => ({ pending: window.__harness.pending, kinds: window.__harness.kinds }));
    const busy = h.pending + page.__inFlight.size;
    quiet = busy === 0 ? quiet + 1 : 0;
    if (Date.now() - t0 > timeoutMs) {
      const kinds = Object.entries(h.kinds).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ');
      const urls = [...page.__inFlight].map((r) => r.url()).slice(0, 5).join(', ');
      throw new Error(`loads did not settle in ${timeoutMs} ms (${kinds || 'none in page'}; ${urls || 'no request'})`);
    }
    await new Promise((r) => setTimeout(r, quiet ? 15 : 30));
  }
}

/** Advances the game `n` steps (in batches of at most `batch`), waiting for loads between batches. */
export async function step(page, n, batch = 60) {
  for (let done = 0; done < n; done += batch) {
    const k = Math.min(batch, n - done);
    await page.evaluate((k) => window.__sv.step(k), k);
    await settle(page);
  }
}

/**
 * Steps (in batches of `batch`) until `pred` (a function run in the page, with `arg`) is true;
 * throws after `max` steps.
 */
export async function stepUntil(page, pred, { arg, max = 3600, batch = 10, what = 'condition' } = {}) {
  const src = `(${pred})`;
  for (let done = 0; ; done += batch) {
    const ok = await page.evaluate(({ src, arg }) => (0, eval)(src)(arg), { src, arg });
    if (ok) return done;
    if (done >= max) throw new Error(`${what}: not reached in ${max} steps`);
    await step(page, batch, batch);
  }
}

/**
 * Waits for loads, renders without stepping (`step(0)`), and returns the canvas as PNG, its hash
 * and the Math.random draws so far (a change in how the game uses chance shows there too).
 */
export async function capture(page) {
  await settle(page);
  const draws = await page.evaluate(() => {
    window.__sv.step(0);
    return window.__harness.draws;
  });
  const box = await page.locator('#game').boundingBox();
  const png = await page.screenshot({ clip: box, animations: 'allow', caret: 'initial' });
  return { png, hash: createHash('sha256').update(png).digest('hex'), draws };
}

/** Math.random draws since the page opened. */
export const draws = (page) => page.evaluate(() => window.__harness.draws);

/** The game's saved data: every localStorage key it owns, parsed where it is JSON. */
export async function savedData(page) {
  return page.evaluate(() => {
    const out = {};
    for (let k = 0; k < localStorage.length; k++) {
      const key = localStorage.key(k);
      if (!key.startsWith('supervillained')) continue;
      const v = localStorage.getItem(key);
      try {
        out[key] = JSON.parse(v);
      } catch {
        out[key] = v;
      }
    }
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  });
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
