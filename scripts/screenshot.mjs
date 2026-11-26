/**
 * Verification screenshots with Playwright.
 *
 *   npm run screens -- <scenario...>        (default: all scenarios)
 *
 * Starts a Vite dev server, opens the game in a phone-sized viewport, drives it through the
 * debug hook `window.__sv`, and writes PNGs to docs/screens/.
 *
 *   SV_ART=new npm run screens -- m1          the same scenarios in OPTIONS > ART: NEW (TEST)
 *                                             (the vibrant environment art), in docs/screens/art-new/
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const PORT = Number(process.env.SV_PORT ?? 5199); // SV_PORT: run two checks side by side
// SV_ART=new: the vibrant environment bank (OPTIONS > ART, a test option), kept apart.
const ART = process.env.SV_ART === 'new' ? 'new' : null;
const OUT = ART ? 'docs/screens/art-new' : 'docs/screens';
/** The address with the chosen art bank, if one was asked for. */
const withArt = (query) => (ART ? `${query}${query.includes('?') ? '&' : '?'}art=${ART}` : query);
const VIEWPORT = { width: 400, height: 860 };

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

async function openGame(browser, query = '') {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => console.log(`[page error] ${e.message}`));
  await page.goto(`http://127.0.0.1:${PORT}/${withArt(query)}`);
  await page.waitForFunction(() => window.__sv && window.__sv.scene(), null, { timeout: 30000 });
  await wait(300);
  return page;
}

async function holdKeys(page, keys, ms) {
  for (const k of keys) await page.keyboard.down(k);
  await wait(ms);
  for (const k of keys) await page.keyboard.up(k);
}

/** Advances dialogue/cards by pressing Space `n` times. */
async function advance(page, n = 1, gap = 350) {
  for (let k = 0; k < n; k++) {
    await page.keyboard.press('Space');
    await wait(gap);
  }
}

async function storyState(page) {
  return page.evaluate(() => window.__sv.top().debugState?.() ?? window.__sv.top().constructor.name);
}


/** Skips story steps (StoryScene.debugSkip) until the current step is `kind`. */
async function skipTo(page, kind, nth = 1) {
  let seen = 0;
  for (let k = 0; k < 60; k++) {
    const st = await page.evaluate(() => window.__sv.top().debugState?.() ?? null);
    if (!st) return null;
    if (st.step === kind && ++seen >= nth) return st;
    await page.evaluate(() => window.__sv.top().debugSkip());
    await wait(140);
  }
  return null;
}

/** Steers the touch joystick toward a grid point at walking pace for `ms`. */
async function joystickWalk(page, marker, ms) {
  const goal = await page.evaluate((m) => window.__sv.top().marker(m), marker);
  const cx = 110;
  const cy = 640;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let t = 0; t < ms; t += 400) {
    const p = await page.evaluate(() => window.__sv.top().debugState().player);
    const dx = goal.x - p.gx;
    const dy = goal.y - p.gy;
    const sx = dx - dy;
    const sy = (dx + dy) / 2;
    const l = Math.hypot(sx, sy) || 1;
    await page.mouse.move(cx + (sx / l) * 25, cy + (sy / l) * 25, { steps: 2 });
    await wait(400);
  }
  await page.mouse.up();
}

const SCENARIOS = {
  /** C2: 7.3 the vanguard (pace walk with the nerve meter) and 8.3 "YOU HAVE BEEN SUPERVILLAINED". */
  async story7(browser) {
    const page = await openGame(browser, '?story=7.3');
    await page.evaluate(() => localStorage.clear());
    await skipTo(page, 'WalkStep');
    await joystickWalk(page, '1', 5200);
    await page.screenshot({ path: `${OUT}/c7-vanguard.png` });
    await joystickWalk(page, '1', 6000);
    await wait(500);
    await page.screenshot({ path: `${OUT}/c7-usurper-turns.png` });
    await page.evaluate(() => window.__sv.flow.story.debugPlay('8.3'));
    await wait(400);
    await skipTo(page, 'WalkStep');
    await page.evaluate(() => {
      const s = window.__sv.top();
      const m = s.marker('4');
      s.player.setPosition(m.x + 1, m.y + 1);
    });
    await wait(600);
    // Skip to the title card (the last card before the final line).
    for (let k = 0; k < 30; k++) {
      const st = await page.evaluate(() => window.__sv.top().debugState());
      if (st.step === 'CardStep' && st.queue === 1) break;
      await page.evaluate(() => window.__sv.top().debugSkip());
      await wait(200);
    }
    await wait(1300);
    await page.screenshot({ path: `${OUT}/c8-supervillained.png` });
    await page.close();
  },

  /** C3: the choice wheel (8.2, the drawings he can leave: locked when he never saw it) and the story menu. */
  async storymenu(browser) {
    const page = await openGame(browser, '?story=8.2');
    await page.evaluate(() => localStorage.clear());
    await skipTo(page, 'AskStep');
    await wait(1500);
    await page.screenshot({ path: `${OUT}/c8-drawing.png` });
    await page.evaluate(() => window.__sv.flow.story.openMenu());
    await wait(900);
    await page.screenshot({ path: `${OUT}/c-story-menu.png` });
    await page.close();
  },

  /** P: a campaign in progress: sub-level picker, the book with icons, a costly choice, the pause menu. */
  async progress(browser) {
    const state = {
      version: 2,
      completed: ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '3.4', '4.1', '4.2', '4.3'],
      meters: { commozione: 6, supervillain: 30, grace: 75, standing: 50 },
      flags: {},
      book: {
        marvels: ['THE HORSE TRANSPORTS', 'THE GALLEYS', 'THE GREAT SHIPS', 'THE FLEET LEAVING VENICE'],
        items: ['MERAVIGLIA'],
        values: [],
        remembered: ['THERE WAS A SHIP, AND IT WAS SINGING.'],
        shards: ['A FLEET BOUGHT ON CREDIT'],
      },
      abilities: ['cross', 'knight', 'sermon'],
      coins: 0,
      playTime: 0,
      savedAt: null,
      notice: null,
    };
    const page = await openGame(browser, '');
    await page.evaluate((st) => localStorage.setItem('supervillained:story', JSON.stringify(st)), state);
    // The title with a saved story: CONTINUE shows where it goes; then OPTIONS.
    await page.evaluate(() => window.__sv.flow.toTitle());
    await wait(1600);
    await page.screenshot({ path: `${OUT}/p-title.png` });
    // CONTINUE is selected; OPTIONS is two rows down (COUCH between them).
    for (let k = 0; k < 2; k++) {
      await page.keyboard.press('ArrowDown');
      await wait(80);
    }
    await page.keyboard.press('Enter');
    await wait(700);
    await page.screenshot({ path: `${OUT}/p-options.png` });
    await page.evaluate(() => window.__sv.flow.story.openMenu());
    await wait(700);
    await page.screenshot({ path: `${OUT}/p-story-menu.png` });
    // Story menu → level 5 (CONTINUE, 1, 2, 3, 4, 5): the sub-level picker.
    for (let k = 0; k < 5; k++) {
      await page.keyboard.press('ArrowDown');
      await wait(80);
    }
    await page.keyboard.press('Enter');
    await wait(1400);
    await page.screenshot({ path: `${OUT}/p-chapter.png` });
    // 5.1 with little Commozione: speaking up is locked.
    await page.evaluate(() => window.__sv.flow.story.debugPlay('5.1'));
    await wait(300);
    await skipTo(page, 'AskStep');
    await wait(1500);
    await page.screenshot({ path: `${OUT}/p-costly-choice.png` });
    await page.keyboard.press('Escape');
    await wait(500);
    await page.screenshot({ path: `${OUT}/p-pause.png` });
    // Pause: RESUME, RESTART, SKIP, BOOK.
    for (let k = 0; k < 3; k++) {
      await page.keyboard.press('ArrowDown');
      await wait(80);
    }
    await page.keyboard.press('Enter');
    await wait(600);
    await page.screenshot({ path: `${OUT}/p-book.png` });
    await page.keyboard.press('Enter');
    await wait(400);
    await page.screenshot({ path: `${OUT}/p-book-2.png` });
    // The ending card with the Grace and Standing lines.
    await page.evaluate(() => window.__sv.flow.story.showEnding());
    await wait(800);
    await page.screenshot({ path: `${OUT}/p-ending.png` });
    await page.close();
  },

  /** C1: Level 1 of the story (1.1 the bucket on his head → the walk to the hedge gap → the slap). */
  async story1(browser) {
    const page = await openGame(browser, '?story=1.1');
    await page.evaluate(() => localStorage.clear());
    await wait(2600);
    await page.screenshot({ path: `${OUT}/c1-bucket.png` });
    await skipTo(page, 'WalkStep');
    await joystickWalk(page, '6', 2500);
    await page.screenshot({ path: `${OUT}/c1-walk.png` });
    await joystickWalk(page, '6', 12000);
    console.log('after walk', JSON.stringify(await storyState(page)));
    // After the slap: Confusione's lines.
    await wait(1200);
    await page.screenshot({ path: `${OUT}/c1-slap.png` });
    await advance(page, 2);
    await wait(900);
    await page.screenshot({ path: `${OUT}/c1-lawn.png` });
    console.log('end', JSON.stringify(await storyState(page)));
    await page.close();
  },

  /** The title's COUCH card: a saved story half way through, and a fresh one. */
  async couch(browser) {
    const ids = ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '3.4', '4.1', '4.2', '4.3'];
    const story = {
      version: 2,
      completed: ids,
      meters: { commozione: 45, supervillain: 100, grace: 59, standing: 55 },
      flags: {},
      book: { marvels: ['a', 'b', 'c', 'd', 'e'], items: ['x', 'y'], values: ['v1', 'v2', 'v3'], remembered: [], shards: ['s'] },
      abilities: ['cross', 'knight'],
      coins: 120,
      playTime: 3905,
      savedAt: Date.now() - 3600e3,
      notice: null,
    };
    for (const [name, save] of [['p-couch', story], ['p-couch-new', null]]) {
      const page = await openGame(browser, '');
      await page.evaluate((s) => {
        if (s) {
          localStorage.setItem('supervillained:story', JSON.stringify(s));
          localStorage.setItem('supervillained:records', JSON.stringify({ level1: { score: 4280, stars: 5, time: 41 } }));
        } else localStorage.clear();
        window.__sv.flow.toTitle();
      }, save);
      await wait(1200);
      await page.evaluate(() => window.__sv.top().actions.couch());
      await wait(500);
      await page.screenshot({ path: `${OUT}/${name}.png` });
      await page.close();
    }
  },

  /** A save from before the Fourth Crusade rewrite: CONTINUE shows the one-time notice, then the story resumes. */
  async migration(browser) {
    const v1 = {
      version: 1,
      completed: ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '2.1', '2.2', '2.3', '2.4', '2.5', '3.1'],
      meters: { commozione: 45, supervillain: 60, grace: 50, standing: 55 },
      flags: { pawOffered: true },
      book: { marvels: ['THE DROMONS'], items: ['A RELIC'], values: ['Forms matter'], remembered: [], shards: ['A FLEET BOUGHT ON CREDIT'] },
      abilities: ['cross', 'knight', 'sermon'],
      coins: 40,
      playTime: 2400,
      savedAt: Date.now() - 86400e3,
    };
    const page = await openGame(browser, '');
    await page.evaluate((s) => {
      localStorage.clear();
      localStorage.setItem('supervillained:story', JSON.stringify(s));
      window.__sv.flow.toTitle();
    }, v1);
    await wait(1400);
    await page.screenshot({ path: `${OUT}/p-migrated-title.png` });
    await page.evaluate(() => window.__sv.flow.story.continueGame());
    await wait(1400);
    await page.screenshot({ path: `${OUT}/p-migrated-notice.png` });
    const saved = await page.evaluate(() => ({
      story: JSON.parse(localStorage.getItem('supervillained:story')),
      backup: JSON.parse(localStorage.getItem('supervillained:story-v1-backup')),
    }));
    console.log('migrated:', JSON.stringify({ version: saved.story.version, completed: saved.story.completed, notice: saved.story.notice, abilities: saved.story.abilities, backupVersion: saved.backup?.version }));
    await page.keyboard.press('Enter');
    await wait(1600);
    console.log('after notice:', await page.evaluate(() => window.__sv.top().constructor.name));
    await page.screenshot({ path: `${OUT}/p-migrated-continue.png` });
    await page.close();
  },

  /** The period words coloured in the dialogue box (7.1: Niketas on those of the West). */
  async words(browser) {
    const page = await openGame(browser, '?story=7.1');
    await page.evaluate(() => localStorage.clear());
    for (let k = 0; k < 80; k++) {
      const line = await page.evaluate(() => window.__sv.top().dialogue?.full ?? '');
      if (line.includes('THOSE OF THE WEST')) break;
      await page.evaluate(() => window.__sv.top().debugSkip());
      await wait(150);
    }
    await wait(4500);
    await page.screenshot({ path: `${OUT}/c7-period-words.png` });
    await page.close();
  },

  /**
   * Fighting with the touch controls (2.3, the sparring): a swipe up over the buttons (SWORD), a
   * swipe down (SHIELD), a squire's swing coming (the ring), the switcher, and the left-hand layout.
   */
  async fight(browser) {
    const page = await openGame(browser, '?story=2.3');
    await page.evaluate(() => {
      localStorage.clear();
      window.__sv.game.input.usingTouch = true;
    });
    const st = await skipTo(page, 'WalkStep', 4);
    console.log('sparring:', JSON.stringify(st && st.player));
    // (The skipped walks left him at the start: put him where the charge ends, among the squires.)
    await page.evaluate(() => {
      const s = window.__sv.top();
      s.player.setPosition(8.5, 10.5);
      s.world.snapCamera();
    });
    await wait(500);
    // Logical px → page px.
    const box = await page.evaluate(() => {
      const r = window.__sv.game.canvas.getBoundingClientRect();
      return { x: r.left, y: r.top, k: r.width / window.__sv.game.width };
    });
    const at = (x, y) => [box.x + x * box.k, box.y + y * box.k];
    const zone = await page.evaluate(() => window.__sv.game.input.gestureZone);
    const swipe = async (dir) => {
      const [x, y] = at(zone.x + zone.w / 2, zone.y + zone.h * 0.45);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + dir * 70, { steps: 4 });
      await page.mouse.up();
    };
    await swipe(-1);
    await wait(60);
    await page.screenshot({ path: `${OUT}/f-swipe-sword.png` });
    console.log('gesture:', JSON.stringify(await page.evaluate(() => window.__sv.game.input.lastGesture)));
    await wait(700);
    await swipe(1);
    await wait(150);
    await page.screenshot({ path: `${OUT}/f-swipe-shield.png` });
    // Wait for a squire's swing to come (the red ring filling under him).
    for (let k = 0; k < 40; k++) {
      const winding = await page.evaluate(() => window.__sv.top().current?.combat?.foes.some((a) => a.foe && a.foe.windup > 0 && a.foe.windup < 0.3));
      if (winding) break;
      await wait(60);
    }
    await page.screenshot({ path: `${OUT}/f-ring.png` });
    // The switcher: SWORD → SHIELD.
    const sw = await page.evaluate(() => {
      const b = window.__sv.game.input.buttons.get('switch');
      return { x: b.x, y: b.y, enabled: b.enabled };
    });
    await page.touchscreen.tap(...at(sw.x, sw.y));
    await wait(250);
    console.log('switcher', JSON.stringify(sw), 'mode now', await page.evaluate(() => window.__sv.top().actionMode));
    await page.screenshot({ path: `${OUT}/f-switcher.png` });
    // Left hand: the buttons and the gestures move to the left, the joystick to the right.
    await page.evaluate(() => window.__sv.game.updateSettings((s) => (s.controls.hand = 'left')));
    await wait(400);
    await page.screenshot({ path: `${OUT}/f-left-hand.png` });
    console.log('fight state', JSON.stringify(await page.evaluate(() => {
      const c = window.__sv.top().current?.combat;
      return c ? { health: c.health, routed: c.routed, foes: c.foes.map((a) => a.foe && +a.foe.hp.toFixed(1)) } : null;
    })));
    await page.close();
  },

  /**
   * The pixel cast and Bagnaskiz's eight directions: the sprite viewer for a few keys, and story
   * scenes with the new faces (2.2 Fulk and the pilgrims, 7.3 the emperor and the axe-men,
   * 7.8 Niketas's doorway), plus 2.3 played as Sbrimbrulòn (?as=).
   */
  async cast(browser) {
    const delivered = ['jack', 'jackKnight', 'watson', 'watsonKnight', 'santina', 'santinaKnight', 'confusione', 'confusioneKnight'];
    for (const key of ['bagnaskiz', 'bagnaskizEmperor', 'bagnaskizMarshal', 'niketas', ...delivered]) {
      const page = await openGame(browser, `?debug=sprites&char=${key}`);
      await wait(900);
      await page.screenshot({ path: `${OUT}/s-${key}.png` });
      await page.close();
    }
    const scenes = [
      ['2.2', 'SayStep', 1, 'c2-fulk'],
      ['7.3', 'SayStep', 2, 'c7-emperor'],
      ['7.8', 'WalkStep', 2, 'c7-doorway'],
      // Aleaume and Jack in arms at the breach.
      ['7.7', 'SayStep', 2, 'c7-breach'],
    ];
    for (const [id, kind, nth, name] of scenes) {
      const page = await openGame(browser, `?story=${id}`);
      await page.evaluate(() => localStorage.clear());
      await skipTo(page, kind, nth);
      await wait(1600);
      await page.screenshot({ path: `${OUT}/${name}.png` });
      await page.close();
    }
    const page = await openGame(browser, '?story=2.3&as=sbrimbrulon');
    await skipTo(page, 'WalkStep', 4);
    await page.evaluate(() => {
      const s = window.__sv.top();
      s.player.setPosition(8.5, 10.5);
      s.world.snapCamera();
    });
    await wait(1500);
    await page.keyboard.press('KeyU');
    await wait(80);
    await page.screenshot({ path: `${OUT}/c2-as-sbrimbrulon.png` });
    console.log('as sbrimbrulon:', await page.evaluate(() => ({ skin: window.__sv.top().player.animator.key, knighted: window.__sv.top().knighted })));
    await page.close();
  },

  /** OPTIONS > CONTROLS. */
  async controls(browser) {
    const page = await openGame(browser, '');
    await page.evaluate(() => localStorage.clear());
    await wait(1200);
    await page.evaluate(() => window.__sv.top().actions.options());
    await wait(500);
    await page.screenshot({ path: `${OUT}/p-options.png` });
    await page.evaluate(() => window.__sv.top().menu.rows.find((r) => r.text.text === 'CONTROLS' || String(r.item.label) === 'CONTROLS').item.action());
    await wait(600);
    await page.screenshot({ path: `${OUT}/p-controls.png` });
    console.log('top:', await page.evaluate(() => window.__sv.top().constructor.name));
    await page.close();
  },

  /** The title's GLOSSARY card (the ring around the verb drawn), and the publisher link. */
  async glossary(browser) {
    const page = await openGame(browser, '');
    await page.evaluate(() => {
      window.__opened = [];
      window.open = (u) => (window.__opened.push(u), null);
    });
    await wait(1500);
    await page.evaluate(() => window.__sv.top().actions.glossary());
    await wait(1400);
    await page.screenshot({ path: `${OUT}/p-glossary.png` });
    await page.keyboard.press('Enter'); // closes it
    await wait(400);
    const k = VIEWPORT.width / (await page.evaluate(() => window.__sv.game.width));
    const f = await page.evaluate(() => ({ x: window.__sv.top().footer.x, y: window.__sv.top().footer.y }));
    await page.touchscreen.tap(f.x * k, (f.y - 3) * k);
    await wait(300);
    console.log('top:', await page.evaluate(() => window.__sv.top().constructor.name), 'opened:', await page.evaluate(() => JSON.stringify(window.__opened)));
    await page.close();
  },

  /** The end of a story level: the logo snaps in over the last scene, then the Professor. */
  async levelend(browser) {
    const page = await openGame(browser, '?story=1.5');
    for (let guard = 0; guard < 200; guard++) {
      const name = await page.evaluate(() => window.__sv.top().constructor.name);
      if (name === 'SupervillainedScene') break;
      await page.evaluate(() => window.__sv.top().debugSkip?.());
      await wait(120);
    }
    await wait(700);
    await page.screenshot({ path: `${OUT}/c1-supervillained.png` });
    await page.waitForFunction(() => window.__sv.top().constructor.name === 'StoryCardScene', null, { timeout: 15000 });
    await wait(1200);
    await page.screenshot({ path: `${OUT}/c1-professor.png` });
    await page.close();
  },

  /** Sprite sheets of every character with delivered art (debug viewer). */
  async sprites(browser) {
    for (const c of ['zampano', 'zampanoCross', 'zampanoKnight', 'bagnaskiz', 'sbrimbrulon', 'jack', 'watson', 'confusione', 'cat']) {
      const page = await openGame(browser, `?debug=sprites&char=${c}`);
      await page.screenshot({ path: `${OUT}/sprites-${c}.png` });
      await page.close();
    }
  },
  /** M1: walking up the path, then standing behind a tree (occlusion fade). */
  async m1(browser) {
    const page = await openGame(browser, '?skip=game');
    await holdKeys(page, ['KeyW'], 1500);
    await holdKeys(page, ['KeyD'], 400);
    await wait(400);
    await page.screenshot({ path: `${OUT}/m1-walk.png` });
    // Behind a tree near the start.
    await page.evaluate(() => {
      const s = window.__sv.scene();
      const p = s.player;
      const tree = s.map.props
        .filter((t) => t.kind === 'tree')
        .sort((a, b) => Math.hypot(a.x - p.gx, a.y - p.gy) - Math.hypot(b.x - p.gx, b.y - p.gy))[0];
      s.teleport(tree.x - 0.62, tree.y - 0.62);
      s.player.face('NW');
    });
    await wait(700);
    await page.screenshot({ path: `${OUT}/m1-behind-tree.png` });
    console.log(JSON.stringify(await page.evaluate(() => window.__sv.scene().debugState())));
    await page.close();
  },

  /** M2: HUD, treats, digestion warning, poop on the path, pee cleaning. */
  async m2(browser) {
    const page = await openGame(browser, '?skip=game');
    await holdKeys(page, ['KeyW'], 900);
    await wait(300);
    await page.screenshot({ path: `${OUT}/m2-hud.png` });
    // Eat the four nearest treats.
    for (let k = 0; k < 4; k++) {
      await page.evaluate(() => {
        const s = window.__sv.scene();
        const p = s.player;
        const t = [...s.rules.treats].sort((a, b) => Math.hypot(a.gx - p.gx, a.gy - p.gy) - Math.hypot(b.gx - p.gx, b.gy - p.gy))[0];
        s.teleport(t.gx + 0.05, t.gy + 0.05);
      });
      await wait(450);
    }
    // Stand on the path while the warning runs out → heavy poop.
    await page.evaluate(() => {
      const s = window.__sv.scene();
      const m = s.map;
      const p = s.player;
      let best = null;
      for (let j = 0; j < m.height; j++)
        for (let i = 0; i < m.width; i++)
          if (m.groundAt(i, j) === 2) {
            const d = Math.hypot(i + 0.5 - p.gx, j + 0.5 - p.gy);
            if (!best || d < best.d) best = { i, j, d };
          }
      s.teleport(best.i + 0.5, best.j + 0.5);
    });
    await wait(1200);
    await page.screenshot({ path: `${OUT}/m2-warning.png` });
    await wait(2300);
    await page.screenshot({ path: `${OUT}/m2-poop.png` });
    console.log('after poop', JSON.stringify(await page.evaluate(() => window.__sv.scene().debugState())));
    await wait(1200);
    await page.keyboard.press('Space');
    await wait(450);
    await page.screenshot({ path: `${OUT}/m2-pee.png` });
    await wait(900);
    console.log('after pee', JSON.stringify(await page.evaluate(() => window.__sv.scene().debugState())));
    await page.close();
  },

  /** M3: title → NEW GAME → the Green Zone card → briefing → walk → pause → level end; then game over. */
  async m3(browser) {
    const page = await openGame(browser, '');
    await page.evaluate(() => localStorage.removeItem('supervillained:story'));
    await page.evaluate(() => window.__sv.flow.toTitle());
    await wait(1500);
    await page.screenshot({ path: `${OUT}/m3-title.png` });
    await page.keyboard.press('Enter'); // NEW GAME
    await wait(150);
    await page.screenshot({ path: `${OUT}/m3-glitch-transition.png` });
    await wait(1650);
    await page.screenshot({ path: `${OUT}/m3-walk-card.png` }); // the one Green Zone card (level 1)
    // A finger, as on the phone: the Briefing words its hints for touch (Input.usingTouch).
    await page.touchscreen.tap(200, 500);
    await wait(1400);
    await page.screenshot({ path: `${OUT}/m3-briefing.png` });
    await page.touchscreen.tap(200, 500);
    await wait(500);
    await holdKeys(page, ['KeyW'], 500);
    await page.keyboard.press('Escape');
    await wait(400);
    await page.screenshot({ path: `${OUT}/m3-pause.png` });
    await page.keyboard.press('Escape');
    await wait(300);
    // Jump to the exit.
    await page.evaluate(() => {
      const s = window.__sv.scene();
      s.rules.stats.coins = 10;
      s.teleport(s.map.exit.x + 1.2, s.map.exit.y + 1.2);
    });
    await holdKeys(page, ['KeyW'], 700);
    // "You've been supervillained" snaps in before the score.
    await page.waitForFunction(() => window.__sv.top().constructor.name === 'SupervillainedScene', null, { timeout: 15000 });
    await wait(60);
    await page.screenshot({ path: `${OUT}/m3-supervillained-snap.png` });
    await wait(700);
    await page.screenshot({ path: `${OUT}/m3-supervillained.png` });
    await page.waitForFunction(() => window.__sv.top().constructor.name === 'LevelEndScene', null, { timeout: 15000 });
    await wait(4200);
    await page.screenshot({ path: `${OUT}/m3-level-end.png` });
    console.log('top after exit:', await page.evaluate(() => window.__sv.top().constructor.name));
    // Retry, then starve twice → game over.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.evaluate(() => window.__sv.flow.restart());
    await wait(900);
    for (let k = 0; k < 2; k++) {
      await page.evaluate(() => {
        const s = window.__sv.scene();
        s.player.invulnerable = 0;
        s.rules.hunger.value = 0.01;
      });
      await wait(900);
    }
    await wait(1800);
    await page.screenshot({ path: `${OUT}/m3-game-over.png` });
    console.log('top after starving:', await page.evaluate(() => window.__sv.top().constructor.name));
    console.log('records:', await page.evaluate(() => localStorage.getItem('supervillained:records')), 'coins:', await page.evaluate(() => localStorage.getItem('supervillained:coins')));
    await page.close();
  },

  /** M4: scripted "under attack" with Bagnaskiz, barking him away, a cat and a magnet ball. */
  async m4(browser) {
    const page = await openGame(browser, '?skip=game');
    // Jump past 70% of the walk → scripted attack. (The band's ambush at the middle is its own
    // scenario, `ambush`: here it is skipped, as when he has already passed it.)
    await page.evaluate(() => {
      const s = window.__sv.scene();
      s.ambush?.skip();
      const m = s.map;
      const d0 = m.exitDistance[m.index(m.startTile.i, m.startTile.j)];
      let best = null;
      for (let j = 0; j < m.height; j++)
        for (let i = 0; i < m.width; i++) {
          if (m.groundAt(i, j) !== 2) continue;
          const d = m.exitDistance[m.index(i, j)];
          const err = Math.abs(d - d0 * 0.28);
          if (!best || err < best.err) best = { i, j, err };
        }
      s.teleport(best.i + 0.5, best.j + 0.5);
    });
    await wait(900);
    await page.screenshot({ path: `${OUT}/m4-attack-title.png` });
    await wait(3500);
    await page.screenshot({ path: `${OUT}/m4-attack.png` });
    console.log('attack', JSON.stringify(await page.evaluate(() => window.__sv.scene().debugState())));
    // Bark three times at Bagnaskiz from close range.
    for (let k = 0; k < 3; k++) {
      await page.evaluate(() => {
        const s = window.__sv.scene();
        const pug = s.threats.pug;
        if (!pug) return;
        const m = s.map;
        for (const [dx, dy] of [[1.4, 0], [-1.4, 0], [0, 1.4], [0, -1.4], [1, 1], [-1, -1]]) {
          if (m.isWalkable(Math.floor(pug.gx + dx), Math.floor(pug.gy + dy))) {
            s.teleport(pug.gx + dx, pug.gy + dy);
            break;
          }
        }
        window.__sv.faceToward(pug.gx, pug.gy);
      });
      await page.keyboard.press('KeyJ');
      await wait(k === 2 ? 120 : 700);
      if (k === 2) await page.screenshot({ path: `${OUT}/m4-bark.png` });
    }
    await wait(800);
    console.log('after barks', JSON.stringify(await page.evaluate(() => window.__sv.scene().debugState().pug)));
    // Heal the zone so the attack can end, then a cat and a ball.
    await page.evaluate(() => {
      const s = window.__sv.scene();
      for (let k = 0; k < s.map.dirt.length; k++) if (s.map.dirt[k] > 0) s.map.clean((k % s.map.width) + 0.5, Math.floor(k / s.map.width) + 0.5, 0.1);
    });
    await wait(2500);
    console.log('healed', JSON.stringify(await page.evaluate(() => window.__sv.scene().debugState().attack)));
    await page.evaluate(() => {
      const s = window.__sv.scene();
      s.threats.catTimer = 0;
      s.threats.ballTimer = 0;
    });
    await wait(1200);
    await page.screenshot({ path: `${OUT}/m4-cat-ball.png` });
    console.log('spawned', JSON.stringify(await page.evaluate(() => { const d = window.__sv.scene().debugState(); return { cats: d.cats, balls: d.balls }; })));
    // Walk into the ball's magnet.
    await page.evaluate(() => {
      const s = window.__sv.scene();
      const b = s.threats.balls[0];
      if (b) s.teleport(b.gx + 2.2, b.gy + 0.2);
    });
    await wait(1500);
    console.log('ball', JSON.stringify(await page.evaluate(() => { const d = window.__sv.scene().debugState(); return { state: d.player.state, time: d.stats.time, balls: d.balls }; })));
    await page.screenshot({ path: `${OUT}/m4-fetch.png` });
    await page.close();
  },

  /** M5: juice — treat popup + geometric particles, marking a tree, running dust, audio on. */
  /** The Green Zone: Bagnaskiz's band waiting half way, their voices, NOW!, the fright, the mess. */
  async ambush(browser) {
    const page = await openGame(browser, '?skip=game');
    await wait(1200);
    const phase = () => page.evaluate(() => window.__sv.scene().debugState().ambush);
    // On the road at about 38 % of the walk: voices from ahead, kept in view below the HUD.
    await page.evaluate(() => window.__sv.scene().teleport(58.9, 57.5));
    for (let k = 0; k < 16; k++) {
      await wait(250);
      const voice = await page.evaluate(() => window.__sv.scene().fx.voices.root.children.some((c) => c.visible && c.content?.some?.((t) => /COMING|READY/.test(t.text))));
      if (voice) break;
    }
    await page.screenshot({ path: `${OUT}/g-ambush-voices.png` });
    // 47 %: the band waits on the road ahead.
    await page.evaluate(() => window.__sv.scene().teleport(51.1, 48.6));
    await wait(2400);
    await page.screenshot({ path: `${OUT}/g-ambush-waiting.png` });
    // Up the road to the middle: NOW!
    await page.keyboard.down('KeyW');
    for (let k = 0; k < 40 && (await phase()) === 'voices'; k++) await wait(50);
    await page.keyboard.up('KeyW');
    await wait(150);
    await page.screenshot({ path: `${OUT}/g-ambush-now.png` });
    for (let k = 0; k < 40 && (await phase()) !== 'scare'; k++) await wait(50);
    await wait(1300);
    await page.screenshot({ path: `${OUT}/g-ambush-scare.png` });
    for (let k = 0; k < 120 && (await phase()) !== 'done'; k++) await wait(50);
    await wait(400);
    await page.screenshot({ path: `${OUT}/g-ambush-after.png` });
    console.log('ambush', JSON.stringify(await page.evaluate(() => {
      const s = window.__sv.scene();
      return { ...s.debugState(), bandPoops: s.rules.poops.length, ownPoops: s.rules.stats.poops };
    })));
    await page.close();
  },

  async m5(browser) {
    const page = await openGame(browser, '');
    await page.evaluate(() => localStorage.removeItem('supervillained:story'));
    await page.evaluate(() => window.__sv.flow.toTitle());
    await wait(1300);
    await page.keyboard.press('Enter'); // NEW GAME (also unlocks audio)
    await wait(1400);
    await page.mouse.click(200, 500); // the Green Zone card
    await wait(1400);
    await page.mouse.click(200, 500); // briefing → play
    await wait(400);
    await page.keyboard.down('ShiftLeft');
    await holdKeys(page, ['KeyW'], 900);
    await page.keyboard.up('ShiftLeft');
    await page.evaluate(() => {
      const s = window.__sv.scene();
      const p = s.player;
      const t = [...s.rules.treats].sort((a, b) => Math.hypot(a.gx - p.gx, a.gy - p.gy) - Math.hypot(b.gx - p.gx, b.gy - p.gy))[0];
      s.teleport(t.gx + 0.05, t.gy + 0.05);
    });
    await wait(160);
    await page.screenshot({ path: `${OUT}/m5-treat.png` });
    await wait(900);
    await page.evaluate(() => {
      const s = window.__sv.scene();
      const p = s.player;
      const tree = s.map.props
        .filter((t) => t.kind === 'tree')
        .sort((a, b) => Math.hypot(a.x - p.gx, a.y - p.gy) - Math.hypot(b.x - p.gx, b.y - p.gy))[0];
      s.teleport(tree.x + 0.7, tree.y + 0.3);
    });
    await wait(200);
    await page.keyboard.press('Space');
    await wait(380);
    await page.screenshot({ path: `${OUT}/m5-marking.png` });
    console.log('m5', JSON.stringify(await page.evaluate(() => { const d = window.__sv.scene().debugState(); return { score: d.stats.score, marks: d.stats.marks, audio: window.__sv.game.audio.ready }; })));
    await page.close();
  },

  /** M6: the app on a phone-sized screen (Pixel 7 emulation): title and gameplay. */
  async m6(browser) {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`[page error] ${e.message}`));
    await page.goto(`http://127.0.0.1:${PORT}/${withArt('')}`);
    await page.waitForFunction(() => window.__sv && window.__sv.scene(), null, { timeout: 30000 });
    await wait(1300);
    await page.screenshot({ path: `${OUT}/m6-phone-title.png` });
    // NEW GAME, the Green Zone card, the briefing: then the phone's back button pauses the walk.
    await page.evaluate(() => window.__sv.flow.story.newGame());
    for (const ms of [1000, 1400]) {
      await wait(ms);
      await page.touchscreen.tap(200, 500);
    }
    await wait(700);
    await page.evaluate(() => window.__sv.flow.back());
    await wait(400);
    await page.screenshot({ path: `${OUT}/m6-phone-back-pause.png` });
    console.log('top after back:', await page.evaluate(() => window.__sv.top().constructor.name), 'view', await page.evaluate(() => [window.__sv.game.width, window.__sv.game.height, window.__sv.game.view.scale]));
    await ctx.close();
  },

  /** M1: the floating touch joystick (mouse-driven pointer events). */
  async joystick(browser) {
    const page = await openGame(browser, '?skip=game');
    const before = await page.evaluate(() => window.__sv.scene().debugState());
    await page.mouse.move(110, 640);
    await page.mouse.down();
    await page.mouse.move(150, 590, { steps: 5 });
    await wait(1200);
    await page.screenshot({ path: `${OUT}/m1-joystick.png` });
    await page.mouse.up();
    const after = await page.evaluate(() => window.__sv.scene().debugState());
    console.log('joystick moved from', JSON.stringify(before.player), 'to', JSON.stringify(after.player));
    await page.close();
  },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENARIOS);
mkdirSync(OUT, { recursive: true });
const server = await startServer();
const browser = await chromium.launch();
try {
  for (const n of names) {
    if (!SCENARIOS[n]) throw new Error(`unknown scenario ${n}`);
    console.log(`scenario ${n}`);
    await SCENARIOS[n](browser);
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill();
  }
}
process.exit();
