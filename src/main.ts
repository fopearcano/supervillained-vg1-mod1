import { Application, TextureSource } from 'pixi.js';
import { buildGlobalTextures, ensureCharacters } from './assets/build';
import { Game } from './core/game';
import { loadSettings } from './core/settings';
import { chosenArtBank, environmentDiagnostics, preloadEnvironmentArt } from './assets/environment';
import { levelByNumber } from './levels';
import { Flow } from './scenes/flow';
import { SpriteViewerScene } from './scenes/spriteViewerScene';
import { PLAY_AS, type CharacterKey } from './assets/manifest';
import { loadPixelFont } from './ui/pixelFont';
import { loadTitleArt } from './ui/titleArt';
import { titleFrames } from './ui/titleAnim';
import { TITLE } from './config';
import { dirFromGridVector } from './iso/projection';
import { CHAPTERS } from './campaign/chapters';
import { DEFAULT_POLICY } from './story/autopilot';

async function boot(): Promise<void> {
  // Pixel-perfect: every texture is sampled with nearest-neighbor.
  TextureSource.defaultOptions.scaleMode = 'nearest';
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const app = new Application();
  await app.init({
    canvas,
    width: 216,
    height: 400,
    preference: 'webgl',
    antialias: false,
    resolution: 1,
    autoDensity: false,
    background: 0x0c3a10,
    autoStart: false,
    sharedTicker: false,
    roundPixels: true,
    powerPreference: 'high-performance',
    eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
  });
  app.ticker?.stop();
  await loadPixelFont();
  // The environment art bank: OPTIONS > ART (a temporary test option), or ?art=new|current.
  await buildGlobalTextures(chosenArtBank(loadSettings().newArt, location.search));
  await loadTitleArt();
  const game = new Game(app, canvas);
  // OPTIONS > ART changed: the other bank is decoded now; stages built from then on use it.
  let newArt = game.settings.newArt;
  game.settingsListeners.push((st) => {
    if (st.newArt === newArt) return;
    newArt = st.newArt;
    void preloadEnvironmentArt(chosenArtBank(st.newArt));
  });
  // Start decoding the title's animated portrait now (its frames play as they arrive).
  titleFrames(Math.round(game.width * TITLE.DOG_WIDTH));
  document.getElementById('boot')?.remove();

  const params = new URLSearchParams(location.search);
  const level = levelByNumber(Number(params.get('level') ?? 1)) ?? levelByNumber(1)!;
  const flow = new Flow(game);
  // Android hardware back button (dispatched by MainActivity.java).
  window.addEventListener('svback', () => flow.back());
  if (params.get('debug') === 'sprites') {
    const key = (params.get('char') ?? 'zampano') as CharacterKey;
    await ensureCharacters([key]);
    game.start(new SpriteViewerScene(game, key));
  } else {
    game.loop.start();
    const sub = params.get('story');
    // ?auto=1 plays the story by itself (optional &skill=0.7&ending=knight|alpha&choice=first|last|random).
    if (params.get('auto')) {
      flow.story.autopilot = {
        ...DEFAULT_POLICY,
        skill: (() => {
          const k = Number(params.get('skill') ?? DEFAULT_POLICY.skill);
          return Number.isFinite(k) ? Math.max(0, Math.min(1, k)) : DEFAULT_POLICY.skill;
        })(),
        ending: params.get('ending') === 'alpha' ? 'alpha' : 'knight',
        choice: (['first', 'last', 'random'] as const).find((c) => c === params.get('choice')) ?? 'first',
      };
    }
    // ?as=sbrimbrulon|bagnaskiz: the story's scenes played as another dog (his own costumes).
    const as = PLAY_AS.find((k) => k === params.get('as'));
    if (as) flow.story.playAs = as;
    if (params.get('skip') === 'game') flow.play(level.number);
    else if (sub) flow.story.debugPlay(sub);
    else flow.toTitle();
  }

  // Debug/automation hook (used by the Playwright screenshot script).
  (window as unknown as { __sv: unknown }).__sv = {
    game,
    flow,
    scene: () => (params.get('story') ? game.scenes.top : (flow.current ?? game.scenes.top)),
    top: () => game.scenes.top,
    // Scripted sub-levels (the 1.0 Green Zone walk is covered by the walk's own scenarios).
    storyIds: () => CHAPTERS.flatMap((c) => c.subLevels.filter((s) => !s.greenZone).map((s) => s.id)),
    step: (n: number) => game.loop.stepNow(n),
    // The environment art in use (OPTIONS > ART / ?art=): bank, decoded zones, warnings.
    art: () => environmentDiagnostics(),
    faceToward: (x: number, y: number) => {
      const s = flow.current;
      if (s) s.player.face(dirFromGridVector(x - s.player.gx, y - s.player.gy));
    },
  };
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('boot');
  if (el) el.textContent = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
});
