/**
 * The pixel lock's captures (BLUEPRINT.md, Rule 2, "Pixel lock"): each opens the game fresh in the
 * deterministic harness, reaches its screen only by steps and by the game's Input object
 * (trigger / override / pushTap between steps), and takes its shots. Used by scripts/lock.mjs.
 *
 * A recipe gets `h`: step(n), until(pred, { arg, max, what }) (pred runs in the page), ev(fn, arg)
 * (page.evaluate), settle(), shot(name). Keep the step counts fixed: they are part of the baseline.
 * Changing a recipe changes its shots: record the baselines again at the same commit.
 */

/** Presses an action once (Input.trigger) and runs `after` steps. */
const press = async (h, action, after = 12) => {
  await h.ev((a) => window.__sv.game.input.trigger(a), action);
  await h.step(after);
};

/** The top scene's class name. */
const top = (h) => h.ev(() => window.__sv.top().constructor.name);

const until = (h, pred, what, arg, max = 3600) => h.until(pred, { arg, max, what });

/** Holds a movement vector (Input.override) for `n` steps, then lets go. */
const hold = async (h, x, y, n) => {
  await h.ev(([x, y]) => (window.__sv.game.input.override = { x, y }), [x, y]);
  await h.step(n);
  await h.ev(() => (window.__sv.game.input.override = null));
};

/** Green Zone: the scene's teleport (as scripts/screenshot.mjs does). */
const teleport = (h, x, y) => h.ev(([x, y]) => window.__sv.scene().teleport(x, y), [x, y]);

/**
 * Story: skips steps (StoryScene.debugSkip, 6 steps after each) until the current step is one of
 * `kinds` (the `nth` time); returns its debugState.
 */
async function skipTo(h, kinds, nth = 1, max = 80) {
  let seen = 0;
  for (let k = 0; k < max; k++) {
    const st = await h.ev(() => window.__sv.top().debugState?.() ?? null);
    if (!st) throw new Error(`no story scene (${await top(h)})`);
    if (kinds.includes(st.step) && ++seen >= nth) return st;
    await h.ev(() => window.__sv.top().debugSkip());
    await h.step(6);
  }
  throw new Error(`no ${kinds.join('/')} reached`);
}

/** Story: the current step without its ResumeStep wrapper. */
const currentStep = (h) =>
  h.ev(() => {
    let c = window.__sv.top().current;
    while (c && c.constructor.name === 'ResumeStep') c = c.inner;
    return c?.constructor.name ?? null;
  });

/** Story: moves the player onto marker `m` (as scripts/screenshot.mjs does). */
const toMarker = (h, m, dx = 0, dy = 0) =>
  h.ev(([m, dx, dy]) => {
    const s = window.__sv.top();
    const p = s.marker(m);
    s.player.setPosition(p.x + dx, p.y + dy);
  }, [m, dx, dy]);

/** Story: presses continue until the walk is the current step again (a card or line cut in). */
async function backToWalk(h, max = 30) {
  for (let k = 0; k < max; k++) {
    if ((await currentStep(h)) === 'WalkStep') return;
    await press(h, 'confirm', 20);
  }
  throw new Error(`the walk did not come back (${await currentStep(h)})`);
}

/** A story stage: its first walk, mini-game or choice, `after` steps in. */
const stage = (id, after = 54, art) => ({
  id: `story-${id}${art ? `-${art}` : ''}`,
  query: `?story=${id}${art ? `&art=${art}` : ''}`,
  shots: [`story-${id}${art ? `-${art}` : ''}`],
  async run(h) {
    await h.step(30);
    await skipTo(h, ['WalkStep', 'MiniGameStep', 'AskStep']);
    await h.step(after);
    await h.shot(this.shots[0]);
  },
});

export const CAPTURES = [
  {
    id: 'title',
    shots: ['title'],
    async run(h) {
      await h.step(120);
      await h.shot('title');
    },
  },
  {
    id: 'options',
    shots: ['options', 'controls'],
    async run(h) {
      await h.step(30);
      await h.ev(() => window.__sv.top().actions.options());
      await h.step(60);
      if ((await top(h)) !== 'OptionsScene') throw new Error(`OPTIONS did not open (${await top(h)})`);
      await h.shot('options');
      // SOUND, MUSIC, SOUNDS, TEXT, CONTROLS.
      for (let k = 0; k < 4; k++) await press(h, 'down', 6);
      await press(h, 'confirm', 60);
      if ((await top(h)) !== 'ControlsScene') throw new Error(`CONTROLS did not open (${await top(h)})`);
      await h.shot('controls');
    },
  },
  {
    id: 'couch',
    shots: ['couch'],
    async run(h) {
      await h.step(30);
      await h.ev(() => window.__sv.top().actions.couch());
      await h.step(60);
      if ((await top(h)) !== 'CouchScene') throw new Error(`COUCH did not open (${await top(h)})`);
      await h.shot('couch');
    },
  },
  {
    id: 'glossary',
    shots: ['glossary-1', 'glossary-crusader', 'glossary-bullying'],
    async run(h) {
      await h.step(30);
      await h.ev(() => window.__sv.top().actions.glossary());
      // The ring draws itself after the page opens.
      await h.step(120);
      if ((await top(h)) !== 'GlossaryScene') throw new Error(`GLOSSARY did not open (${await top(h)})`);
      await h.shot('glossary-1');
      await press(h, 'right', 120);
      await h.shot('glossary-crusader');
      await press(h, 'down', 120);
      await h.shot('glossary-bullying');
    },
  },
  {
    // M1: walking up the path, then behind a tree (the occlusion fade).
    id: 'gz-walk',
    query: '?skip=game',
    shots: ['gz-walk', 'gz-behind-tree'],
    async run(h) {
      await h.step(18);
      await hold(h, 0, -0.7, 90);
      await hold(h, 0.7, 0, 24);
      await h.step(24);
      await h.shot('gz-walk');
      await h.ev(() => {
        const s = window.__sv.scene();
        const p = s.player;
        const tree = s.map.props
          .filter((t) => t.kind === 'tree')
          .sort((a, b) => Math.hypot(a.x - p.gx, a.y - p.gy) - Math.hypot(b.x - p.gx, b.y - p.gy))[0];
        s.teleport(tree.x - 0.62, tree.y - 0.62);
        s.player.face('NW');
      });
      await h.step(42);
      await h.shot('gz-behind-tree');
    },
  },
  {
    // M2: the HUD, treats eaten until the digestion warning, a poop on the path, pee cleaning.
    id: 'gz-digestion',
    query: '?skip=game',
    shots: ['gz-hud', 'gz-warning', 'gz-poop', 'gz-pee'],
    async run(h) {
      await h.step(18);
      await hold(h, 0, -0.7, 54);
      await h.step(18);
      await h.shot('gz-hud');
      for (let k = 0; k < 60; k++) {
        const warned = await h.ev(() => {
          const s = window.__sv.scene();
          if (s.rules.digestion.warning) return true;
          const p = s.player;
          const t = [...s.rules.treats].sort((a, b) => Math.hypot(a.gx - p.gx, a.gy - p.gy) - Math.hypot(b.gx - p.gx, b.gy - p.gy))[0];
          s.teleport(t.gx + 0.05, t.gy + 0.05);
          return false;
        });
        if (warned) break;
        await h.step(k < 4 ? 27 : 9);
      }
      await h.step(18);
      await h.ev(() => {
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
      await h.step(72);
      await h.shot('gz-warning');
      await h.step(138);
      await h.shot('gz-poop');
      await h.step(72);
      await press(h, 'pee', 27);
      await h.shot('gz-pee');
    },
  },
  {
    // M4: the scripted attack with Bagnaskiz, barking him away, a cat and a magnet ball.
    id: 'gz-attack',
    query: '?skip=game',
    shots: ['gz-attack-title', 'gz-attack', 'gz-bark', 'gz-cat-ball'],
    async run(h) {
      await h.step(18);
      await h.ev(() => {
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
      await h.step(54);
      await h.shot('gz-attack-title');
      await h.step(210);
      await h.shot('gz-attack');
      for (let k = 0; k < 3; k++) {
        await h.ev(() => {
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
        await press(h, 'bark', k === 2 ? 7 : 42);
        if (k === 2) await h.shot('gz-bark');
      }
      await h.step(48);
      await h.ev(() => {
        const s = window.__sv.scene();
        for (let k = 0; k < s.map.dirt.length; k++) if (s.map.dirt[k] > 0) s.map.clean((k % s.map.width) + 0.5, Math.floor(k / s.map.width) + 0.5, 0.1);
      });
      await h.step(150);
      await h.ev(() => {
        const s = window.__sv.scene();
        s.threats.catTimer = 0;
        s.threats.ballTimer = 0;
      });
      await h.step(72);
      await h.shot('gz-cat-ball');
    },
  },
  {
    // The band's ambush half way: voices, waiting, NOW!, the rush, the fright, after.
    id: 'gz-ambush',
    query: '?skip=game',
    shots: ['gz-ambush-voices', 'gz-ambush-waiting', 'gz-ambush-now', 'gz-ambush-rush', 'gz-ambush-scare', 'gz-ambush-after'],
    async run(h) {
      await h.step(72);
      await teleport(h, 58.9, 57.5);
      await until(h, () => window.__sv.scene().fx.voices.root.children.some((c) => c.visible && c.content?.some?.((t) => /COMING|READY/.test(t.text))), 'their voices', undefined, 240);
      await h.shot('gz-ambush-voices');
      await teleport(h, 51.1, 48.6);
      await h.step(144);
      await h.shot('gz-ambush-waiting');
      await h.ev(() => (window.__sv.game.input.override = { x: 0, y: -0.7 }));
      await h.until(() => window.__sv.scene().debugState().ambush !== 'voices', { max: 240, batch: 3, what: 'NOW!' });
      await h.ev(() => (window.__sv.game.input.override = null));
      await h.step(12);
      await h.shot('gz-ambush-now');
      await h.step(15);
      await h.shot('gz-ambush-rush');
      await h.until(() => window.__sv.scene().debugState().ambush === 'scare', { max: 240, batch: 3, what: 'the fright' });
      await h.step(78);
      await h.shot('gz-ambush-scare');
      await h.until(() => window.__sv.scene().debugState().ambush === 'done', { max: 600, batch: 3, what: 'the band gone' });
      await h.step(24);
      await h.shot('gz-ambush-after');
    },
  },
  {
    // M3: title, NEW GAME, the Green Zone card, the briefing, the walk, the pause, the snap, the level end.
    id: 'gz-flow',
    shots: ['gz-card', 'gz-briefing', 'gz-pause', 'gz-snap', 'gz-supervillained', 'gz-level-end'],
    async run(h) {
      await h.step(90);
      await press(h, 'confirm', 108);
      await h.shot('gz-card');
      await h.ev(() => window.__sv.game.input.pushTap(108, 250));
      await h.step(84);
      await h.shot('gz-briefing');
      await h.ev(() => window.__sv.game.input.pushTap(108, 250));
      await h.step(30);
      await hold(h, 0, -0.7, 30);
      await press(h, 'menu', 24);
      if ((await top(h)) === 'GameScene') throw new Error('the pause menu did not open');
      await h.shot('gz-pause');
      await press(h, 'back', 18);
      await h.ev(() => {
        const s = window.__sv.scene();
        s.rules.stats.coins = 10;
        s.teleport(s.map.exit.x + 1.2, s.map.exit.y + 1.2);
      });
      await h.ev(() => (window.__sv.game.input.override = { x: 0, y: -0.7 }));
      await h.until(() => window.__sv.top().constructor.name === 'SupervillainedScene', { max: 900, batch: 2, what: 'the snap' });
      await h.ev(() => (window.__sv.game.input.override = null));
      await h.step(4);
      await h.shot('gz-snap');
      await h.step(42);
      await h.shot('gz-supervillained');
      await h.until(() => window.__sv.top().constructor.name === 'LevelEndScene', { max: 900, what: 'the level end' });
      await h.step(252);
      await h.shot('gz-level-end');
    },
  },
  stage('3.4'),
  stage('4.1'),
  stage('5.4'),
  stage('6.2'),
  stage('7.5'),
  stage('8.1'),
  stage('3.4', 54, 'new'),
  // 7.1: the city in saturated colour (the bleach filter, negative). 6.3: the last of level 6.
  stage('7.1'),
  stage('6.3'),
  {
    // 7.5: the smoke (the fog) and the fire, leading the woman home.
    id: 'story-7.5-fog',
    query: '?story=7.5',
    shots: ['story-7.5-fog'],
    async run(h) {
      await h.step(30);
      for (let k = 0; k < 80; k++) {
        const st = await h.ev(() => ({ fog: window.__sv.top().fog, step: window.__sv.top().debugState().step }));
        if (st.fog > 0 && st.step === 'WalkStep') break;
        await h.ev(() => window.__sv.top().debugSkip());
        await h.step(6);
      }
      await h.step(90);
      const fog = await h.ev(() => window.__sv.top().fog);
      if (!(fog > 0)) throw new Error(`no fog (${fog})`);
      await h.shot('story-7.5-fog');
    },
  },
  {
    // 1.1: the sand bucket on his head; standing still, the visor slides down; walking pushes it up.
    id: 'story-1.1',
    query: '?story=1.1',
    shots: ['story-1.1-visor', 'story-1.1-walking'],
    async run(h) {
      await h.step(30);
      await skipTo(h, ['WalkStep']);
      await h.step(150);
      const visor = await h.ev(() => window.__sv.top().visor);
      if (!(visor > 0.5)) throw new Error(`the visor is not down (${visor})`);
      await h.shot('story-1.1-visor');
      await hold(h, 0.5, -0.5, 90);
      await h.shot('story-1.1-walking');
    },
  },
  {
    // 2.1: the great helm; standing still, the visor slides down.
    id: 'story-2.1',
    query: '?story=2.1',
    shots: ['story-2.1-helm'],
    async run(h) {
      await h.step(30);
      await skipTo(h, ['WalkStep']);
      await h.step(150);
      const visor = await h.ev(() => window.__sv.top().visor);
      if (!(visor > 0.5)) throw new Error(`the visor is not down (${visor})`);
      await h.shot('story-2.1-helm');
    },
  },
  {
    // 2.3: after the second pickup (the cut-in that once left the walk without its controls).
    id: 'story-2.3',
    query: '?story=2.3',
    shots: ['story-2.3-second-pickup'],
    async run(h) {
      await h.step(30);
      await skipTo(h, ['WalkStep'], 2);
      await h.step(30);
      for (const m of ['2', '3']) {
        await toMarker(h, m);
        await h.step(30);
        await backToWalk(h);
      }
      await h.step(30);
      const wanted = await h.ev(() => window.__sv.top().controlsWanted);
      if (!wanted) throw new Error('the walk has no controls after the second pickup');
      await h.shot('story-2.3-second-pickup');
    },
  },
  {
    // The story's pause menu over a walk, and the walk resumed.
    id: 'story-pause',
    query: '?story=1.2',
    shots: ['story-pause', 'story-pause-resumed'],
    async run(h) {
      await h.step(30);
      await skipTo(h, ['WalkStep']);
      await h.step(30);
      await press(h, 'menu', 24);
      if ((await top(h)) === 'StoryScene') throw new Error('the pause menu did not open');
      await h.shot('story-pause');
      await press(h, 'back', 30);
      if ((await top(h)) !== 'StoryScene') throw new Error(`the pause menu did not close (${await top(h)})`);
      await h.shot('story-pause-resumed');
    },
  },
  {
    // The end of a story level: the logo snaps in, then the Professor.
    id: 'story-snap',
    query: '?story=1.5',
    shots: ['story-snap', 'story-professor'],
    async run(h) {
      await h.step(30);
      for (let k = 0; k < 200 && (await top(h)) !== 'SupervillainedScene'; k++) {
        await h.ev(() => window.__sv.top().debugSkip?.());
        await h.step(6);
      }
      if ((await top(h)) !== 'SupervillainedScene') throw new Error(`no snap (${await top(h)})`);
      await h.step(42);
      await h.shot('story-snap');
      await h.until(() => window.__sv.top().constructor.name === 'StoryCardScene', { max: 900, what: 'the Professor' });
      await h.step(72);
      await h.shot('story-professor');
    },
  },
  {
    // The other art bank: the title and the Green Zone in ART: NEW.
    id: 'art-new',
    query: '?art=new',
    shots: ['art-new-title'],
    async run(h) {
      await h.step(120);
      await h.shot('art-new-title');
    },
  },
  {
    id: 'gz-art-new',
    query: '?skip=game&art=new',
    shots: ['gz-walk-art-new'],
    async run(h) {
      await h.step(18);
      await hold(h, 0, -0.7, 90);
      await h.step(24);
      await h.shot('gz-walk-art-new');
    },
  },
];
