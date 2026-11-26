import { Container, Graphics, Sprite } from 'pixi.js';
import { textures } from '../core/assets';
import { Emitter, type GameEvents } from '../core/events';
import type { Game } from '../core/game';
import type { Scene } from '../core/scene';
import { AMBUSH, BALL } from '../config';
import { PropEntity } from '../entities/prop';
import type { Zampano } from '../entities/zampano';
import type { Entity } from '../entities/entity';
import { GameFx } from '../fx/gameFx';
import type { Camera } from '../iso/camera';
import { gridToScreen, gridVecToScreen } from '../iso/projection';
import { clampLives, livesSpeed } from '../systems/lives';
import { Ambush } from '../systems/ambush';
import { Rules } from '../systems/rules';
import { Threats } from '../systems/threats';
import { GlitchFilter } from '../fx/glitchFilter';
import { AttackBanner } from '../ui/attackBanner';
import { Shout } from '../ui/shout';
import { Hud, type RadarDot } from '../ui/hud';
import { PixelText } from '../ui/pixelText';
import { TouchControls } from '../ui/touchControls';
import { loadLevel, type LevelDef } from '../world/level';
import type { GameMap } from '../world/map';
import { Ground } from '../world/tiles';
import { World } from '../world/world';

/** Callbacks the scene flow (title → briefing → game → end) plugs in. */
export interface GameSceneHooks {
  onComplete?(scene: GameScene): void;
  onGameOver?(scene: GameScene): void;
  onMenu?(scene: GameScene): void;
}

/** The gameplay scene: world, entities, rules, camera, HUD, effects. */
export class GameScene implements Scene {
  readonly root = new Container();
  readonly pausesBelow = true;
  readonly world: World;
  readonly uiLayer = new Container();
  readonly events = new Emitter<GameEvents>();
  readonly rules: Rules;
  readonly threats: Threats;
  /** Bagnaskiz's band, rushing in from off-screen half way (level data `events.ambush`), or null. */
  readonly ambush: Ambush | null;
  readonly hud: Hud;
  readonly banner = new AttackBanner();
  /** The band's big NOW! (over the world, under the buttons). */
  readonly shout = new Shout();
  private readonly attackFilter = new GlitchFilter();
  /** Smoothed visual intensity of the "under attack" effects. */
  private attackFx = 0;
  private burst = 0;
  readonly fx: GameFx;
  readonly controls: TouchControls;
  hooks: GameSceneHooks = {};
  /** When false, gameplay is frozen (title/briefing shown over the level). */
  active = true;
  private readonly exitRing: Sprite;
  private readonly magnetG = new Graphics();
  private readonly exitLabel: PixelText;
  private time = 0;
  private endNotified = false;

  constructor(
    readonly game: Game,
    readonly levelDef: LevelDef,
  ) {
    const level = loadLevel(levelDef);
    // The delivered 1:arcade floor composition targets the former single-corridor map. The
    // redesigned park uses the complete native Color Ink ground/prop bank without that stale
    // cell overlay; its generated routes, ponds and districts remain authoritative.
    this.world = new World(level, levelDef.palette);
    this.root.addChild(this.world.root, this.uiLayer);

    // Exit: flag + glowing ring + label.
    const ex = this.map.exit;
    this.exitRing = new Sprite(textures.get('exitRing_0'));
    const ep = gridToScreen(this.map.exitTile.i, this.map.exitTile.j);
    this.exitRing.position.set(ep.x, ep.y);
    this.world.decalLayer.addChild(this.exitRing);
    this.addEntity(new PropEntity('exitFlag', 0, ex.x + 0.25, ex.y - 0.25, null, true));
    this.exitLabel = new PixelText('EXIT', { color: '#fff36a', outline: '#000000', glow: 'self' }).setOrigin(0.5, 1);
    this.world.fxLayer.addChild(this.exitLabel);

    // Lives from the title's counter; each extra life costs speed (systems/lives.ts).
    const lives = clampLives(game.settings.lives);
    this.rules = new Rules(this, levelDef, lives);
    this.player.speedMul = livesSpeed(lives);
    this.threats = new Threats(this, this.rules, levelDef);
    const ambush = levelDef.events.ambush;
    this.ambush = ambush ? new Ambush(this, this.rules, ambush, levelDef.seed, () => ({ w: this.game.width, h: this.game.height })) : null;
    // While his band lies in wait (and a little after they leave), Bagnaskiz does not also roam.
    this.threats.attackHeld = () => this.ambush?.holdsAttack ?? false;
    this.fx = new GameFx(this.events, this.player, this.camera, () => this.rules.poopWarning);
    this.world.decalLayer.addChild(this.fx.below, this.magnetG);
    this.fx.terrainAt = (x, y) => {
      const i = Math.floor(x);
      const j = Math.floor(y);
      if (this.map.isWaterAt(x, y)) return 'water';
      if (this.map.propAt(i, j)?.kind === 'bush') return 'bush';
      return this.map.groundAt(i, j) === Ground.TallGrass ? 'tall' : 'ground';
    };
    this.world.fxLayer.addChild(this.fx.above);

    this.hud = new Hud(game.input);
    this.controls = new TouchControls(game.input);
    this.uiLayer.addChild(this.shout.root, this.controls.root, this.hud.root, this.banner.root);
    this.events.on('ambushNow', (e) => this.shout.show(e.text));

    this.events.on('levelComplete', () => {
      this.controls.setEnabled(false);
    });
    this.events.on('attackStart', () => {
      this.banner.start();
      this.burst = 0.6;
    });
    this.events.on('attackEnd', () => this.banner.end());
    this.events.on('barkHit', () => (this.burst = Math.max(this.burst, 0.15)));
  }

  // Delegates kept for the rules, threats and automation scripts.
  get worldRoot(): Container {
    return this.world.root;
  }
  get map(): GameMap {
    return this.world.map;
  }
  get player(): Zampano {
    return this.world.player;
  }
  get camera(): Camera {
    return this.world.camera;
  }
  get entities(): Entity[] {
    return this.world.entities;
  }

  addEntity(e: Entity): void {
    this.world.addEntity(e);
  }

  removeEntity(e: Entity): void {
    this.world.removeEntity(e);
  }

  enter(): void {
    this.world.snapCamera();
    this.setControlsEnabled(this.active);
  }

  setControlsEnabled(on: boolean): void {
    this.controls.setEnabled(on);
    this.hud.setMenuEnabled(on);
  }

  resize(w: number, h: number): void {
    this.camera.setView(w, h);
    this.controls.setLayout({ peeX: w - 60, peeY: h - 50, peeR: 15, barkX: w - 23, barkY: h - 60, barkR: 17, runX: w - 42, runY: h - 98, runR: 15 }, { w, h, top: 60 });
    this.hud.layout(w, h);
    this.banner.layout(w, h);
    this.shout.layout(w, h);
  }

  /** Android Back during the walk: the pause menu (Flow.pause decides whether it may open). */
  back(): void {
    this.hooks.onMenu?.(this);
  }

  update(dt: number): void {
    this.time += dt;
    this.world.beginStep();
    const input = this.game.input;
    if (this.active) {
      if (input.consume('menu') && this.rules.state === 'playing') this.hooks.onMenu?.(this);
      this.rules.update(dt, input);
      if (this.rules.state === 'playing') {
        this.threats.update(dt, input);
        this.ambush?.update(dt);
      }
    } else {
      this.player.setIntent(0, 0);
    }
    this.world.endStep(dt);
    // Voices from off screen stay readable: kept inside the view, below the HUD.
    const v = this.camera.viewRect();
    const k = AMBUSH.VOICE_INSET;
    this.fx.voices.keepIn = { x: v.x + k.SIDE, y: v.y + k.TOP, w: v.w - k.SIDE * 2, h: v.h - k.TOP };
    this.fx.update(dt);
    this.updateAttackFx(dt);

    if (!this.endNotified && this.rules.state !== 'playing' && this.rules.endedFor > 1.1) {
      this.endNotified = true;
      if (this.rules.state === 'complete') this.hooks.onComplete?.(this);
      else this.hooks.onGameOver?.(this);
    }
  }

  /** Sepia palette shift + glitch bursts on the world while the zone is under attack. */
  private updateAttackFx(dt: number): void {
    const target = this.threats.director.intensity(this.map.health());
    const rate = target > this.attackFx ? 2.5 : 0.8;
    this.attackFx += (target - this.attackFx) * Math.min(1, rate * dt);
    if (this.attackFx < 0.005 && target === 0) this.attackFx = 0;
    if (this.burst > 0) this.burst -= dt;
    else if (this.attackFx > 0 && Math.random() < 0.006 + 0.02 * this.attackFx) this.burst = 0.08 + Math.random() * 0.15;
    const f = this.attackFilter;
    f.time = this.time;
    f.sepia = Math.min(0.9, this.attackFx * 0.95);
    f.scanlines = this.attackFx * 0.35;
    f.glitch = this.burst > 0 ? 0.35 + this.attackFx * 0.5 : 0;
    f.rgb = this.burst > 0 ? 2 + this.attackFx * 2 : this.attackFx > 0.5 ? 1 : 0;
    f.flash = 0;
    if (!this.active) return;
    const want = this.attackFx > 0;
    const has = this.worldRoot.filters?.length === 1 && this.worldRoot.filters[0] === f;
    if (want && !has) this.worldRoot.filters = [f];
    else if (!want && has) this.worldRoot.filters = [];
    const pug = this.threats.pug;
    const hint =
      pug && pug.active
        ? this.game.input.usingTouch
          ? 'BARK AT BAGNASKIZ!'
          : 'BARK (J) AT BAGNASKIZ!'
        : this.map.health() < this.threats.director.threshold
          ? 'PEE TO HEAL THE ZONE!'
          : null;
    this.banner.update(dt, hint);
    this.shout.update(dt);
  }

  render(alpha: number, frameDt: number): void {
    this.world.render(alpha, frameDt);
    this.exitRing.alpha = 0.5 + 0.5 * Math.sin(this.time * 5);
    const lp = gridToScreen(this.map.exit.x, this.map.exit.y);
    this.exitLabel.position.set(Math.round(lp.x), Math.round(lp.y - 44 + Math.sin(this.time * 3) * 2));
    this.drawMagnetFields();
    this.controls.update(frameDt);
    this.controls.setPeeCharges(this.rules.bladder.charges, this.rules.bladder.max, this.rules.bladder.regenFraction);
    this.controls.setBarkReady(this.threats.barkReadiness);
    this.controls.setEnergy(this.player.energy.fraction, this.player.canRun);
    this.hud.update(this.hudState(), frameDt);
  }

  /** Pulsing rings converging on nearby balls: shows the magnet pull area. */
  private drawMagnetFields(): void {
    const g = this.magnetG;
    g.clear();
    for (const b of this.threats.balls) {
      const d = Math.hypot(b.gx - this.player.gx, b.gy - this.player.gy);
      if (d > BALL.MAGNET_RADIUS * 1.8 || b.age > BALL.LIFETIME) continue;
      const c = gridToScreen(b.gx, b.gy);
      for (let k = 0; k < 2; k++) {
        const u = 1 - ((this.time * 0.8 + k * 0.5) % 1);
        const r = BALL.MAGNET_RADIUS * u;
        g.ellipse(Math.round(c.x), Math.round(c.y), r * 16 * Math.SQRT2, r * 8 * Math.SQRT2).stroke({
          width: 1,
          color: 0xdcf23a,
          alpha: 0.55 * (1 - u) + 0.1,
        });
      }
    }
  }

  private hudState() {
    const st = this.rules.stats;
    const p = this.player;
    const radar: RadarDot[] = [];
    const rel = (x: number, y: number) => gridVecToScreen(x - p.gx, y - p.gy);
    for (const t of this.rules.treats) {
      const d = rel(t.gx, t.gy);
      if (Math.abs(d.x) < 260 && Math.abs(d.y) < 260) radar.push({ dx: d.x, dy: d.y, color: 0xff3b6b });
    }
    for (const poop of this.rules.poops) {
      const d = rel(poop.gx, poop.gy);
      if (!poop.cleaned) radar.push({ dx: d.x, dy: d.y, color: 0x8a5422 });
    }
    for (const c of this.threats.cats) {
      const d = rel(c.gx, c.gy);
      radar.push({ dx: d.x, dy: d.y, color: 0x3ff0ff, size: 3 });
    }
    for (const b of this.threats.balls) {
      const d = rel(b.gx, b.gy);
      radar.push({ dx: d.x, dy: d.y, color: 0xffe23a, size: 2 });
    }
    const pug = this.threats.pug;
    if (pug) {
      const d = rel(pug.gx, pug.gy);
      radar.push({ dx: d.x, dy: d.y, color: 0xff7a1f, size: 4, blink: true });
    }
    if (this.ambush?.revealed) {
      for (const m of this.ambush.band) {
        const d = rel(m.actor.gx, m.actor.gy);
        radar.push({ dx: d.x, dy: d.y, color: 0xff7a1f, size: 3, blink: true });
      }
    }
    const exit = rel(this.map.exit.x, this.map.exit.y);
    return {
      pees: st.pees,
      poops: st.poops,
      treats: st.treats,
      stars: this.rules.stars,
      lives: st.lives,
      hunger: this.rules.hunger.fraction,
      score: st.score,
      time: st.time,
      zoneName: this.levelDef.zoneName,
      level: this.levelDef.number,
      radar,
      exit: { dx: exit.x, dy: exit.y },
    };
  }

  exit(): void {
    for (const e of this.entities) e.alive = false;
    this.events.clear();
    // The MENU button belongs to Input (shared): off until the next HUD turns it on.
    this.hud.setMenuEnabled(false);
    // Pooled popup texts are out of the display tree: root.destroy does not reach them.
    this.fx.popups.destroy();
    this.fx.voices.destroy();
  }

  /** Debug/test summary. */
  debugState(): Record<string, unknown> {
    const st = this.rules.stats;
    return {
      player: { gx: +this.player.gx.toFixed(2), gy: +this.player.gy.toFixed(2), facing: this.player.facing, state: this.player.state },
      health: +this.map.health().toFixed(4),
      stars: this.rules.stars,
      hunger: +this.rules.hunger.value.toFixed(1),
      charges: this.rules.bladder.charges,
      progress: +this.map.progressAt(this.player.gx, this.player.gy).toFixed(3),
      state: this.rules.state,
      stats: { ...st, time: +st.time.toFixed(1) },
      treatsLeft: this.rules.treats.length,
      attack: this.threats.director.state,
      pug: this.threats.pug ? { state: this.threats.pug.state, hits: this.threats.pug.hits } : null,
      ambush: this.ambush ? this.ambush.director.phase : null,
      cats: this.threats.cats.length,
      balls: this.threats.balls.length,
    };
  }

  /** Debug/test helper: teleport Zampanò. */
  teleport(gx: number, gy: number): void {
    this.world.teleport(gx, gy);
  }
}
