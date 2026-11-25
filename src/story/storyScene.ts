import { ColorMatrixFilter, Container, Graphics } from 'pixi.js';
import { ensureCharacters } from '../assets/build';
import { floorDesignForMap, paletteForChapter } from '../assets/environment';
import { ARMOURED_SKINS, costumeFor, type CharacterKey, type PlayAs, type PlayableCharacterKey } from '../assets/manifest';
import { applyEffects, dreamSkin, fadeCommozione, type CampaignState, type Effects } from '../campaign/state';
import type { ChapterDef, SubLevelDef } from '../campaign/types';
import type { Game } from '../core/game';
import type { Scene } from '../core/scene';
import { Actor, type Behavior, type Point, type Who } from '../entities/actor';
import { Particles } from '../fx/particles';
import { Popups } from '../fx/popups';
import { gridToScreen, type Dir8 } from '../iso/projection';
import { PixelText } from '../ui/pixelText';
import { C } from '../ui/retro';
import { TouchControls, type ActionMode } from '../ui/touchControls';
import { parseAsciiMap } from '../world/level';
import { World } from '../world/world';
import { STORY_MAPS, THEMES, type MapKey } from './maps';
import { STORY } from '../config';
import type { Autopilot } from './autopilot';
import { ResumeStep, type Step } from './step';
import { CardLayer, DialogueBox, StoryHud } from './ui';

export interface StoryHooks {
  /** All steps done: the sub-level is complete. */
  onFinished(scene: StoryScene): void;
  onMenu(scene: StoryScene): void;
}

export interface StageOptions {
  skin?: 'plain' | 'dream';
  /** Explicit player-ready dog skin; existing chapters keep Zampanò's costumes. */
  skinKey?: PlayableCharacterKey;
  /** Where Zampanò starts (marker); default S. */
  at?: string | Point;
  face?: Dir8;
}

const SPECIALS = new Set(['legs', 'fortune', 'falcon', 'stag']);

/** Runs one sub-level's script over an isometric stage (or a mini-game). */
export class StoryScene implements Scene {
  readonly root = new Container();
  readonly pausesBelow = true;
  readonly stageLayer = new Container();
  readonly gameLayer = new Container();
  readonly uiLayer = new Container();
  readonly worldFx = new Container();
  readonly hud: StoryHud;
  readonly dialogue = new DialogueBox();
  readonly cards = new CardLayer();
  readonly controls: TouchControls;
  readonly particles = new Particles();
  readonly popups = new Popups();
  readonly overlayG = new Graphics();
  world: World | null = null;
  mapKey: MapKey | null = null;
  readonly actors = new Map<string, Actor>();
  /** Screen-space change notices (+5 COMMOZIONE...). */
  private readonly notices: Array<{ t: PixelText; life: number }> = [];
  private queue: Step[] = [];
  private current: Step | null = null;
  private finished = false;
  w = 216;
  h = 400;
  time = 0;
  /** Seconds the scene has been paused by a modal (used by steps for timers). */
  locked = false;
  /**
   * True when the scene was restarted from the pause menu: the feeling fades again on the fresh
   * copy of the campaign (campaign/state.ts beginAttempt), without its notice a second time.
   */
  restarted = false;
  /** Automated playtest driver (null in normal play). */
  pilot: Autopilot | null = null;
  /** Playtest counters: how often the player had to start a walk or mini-game again. */
  readonly metrics = { restarts: 0, caught: 0, nerveBroken: 0, ran: 0, miniRetries: 0, minis: [] as string[], choices: [] as string[] };

  constructor(
    readonly game: Game,
    /** This attempt's copy of the campaign (StoryFlow commits it when the scene is finished). */
    readonly state: CampaignState,
    readonly chapter: ChapterDef,
    readonly sub: SubLevelDef,
    private readonly hooks: StoryHooks,
  ) {
    this.hud = new StoryHud(game.input);
    this.controls = new TouchControls(game.input);
    this.root.addChild(this.stageLayer, this.gameLayer, this.uiLayer);
    this.uiLayer.addChild(this.overlayG, this.controls.root, this.hud.root, this.dialogue.root, this.cards.root);
    this.hud.setTitle(sub.id, sub.title);
    this.controls.setEnabled(false);
    this.controls.configure({ pee: false, action: 'BARK' });
  }

  // ------------------------------------------------------------------ lifecycle

  enter(): void {
    this.queue = this.sub.script();
    // The feeling fades between dream scenes: wonder and weeping have to keep filling it.
    const lost = fadeCommozione(this.state, this.chapter.number);
    if (lost && !this.restarted) this.notice(`-${lost} COMMOZIONE: THE FEELING FADES`, '#9aa4c0', 2.5);
    this.next();
  }

  exit(): void {
    this.current?.stop?.(this);
    this.current = null;
    this.worldFx.removeFromParent();
    if (this.pilot) this.game.input.override = null;
    this.world?.destroy();
    this.world = null;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.hud.layout(w, h);
    this.dialogue.layout(w, h);
    this.cards.layout(w, h);
    this.world?.camera.setView(w, h);
    this.controls.setLayout(
      { peeX: w - 60, peeY: h - 50, peeR: 15, barkX: w - 26, barkY: h - 40, barkR: 19, runX: w - 45, runY: h - 80, runR: 15, switchX: w - 66, switchY: h - 30, switchR: 10 },
      { w, h, top: 70 },
    );
  }

  // ------------------------------------------------------------------ steps

  private next(): void {
    this.current?.stop?.(this);
    this.current = null;
    this.game.input.clearPending();
    this.world?.player.setIntent(0, 0);
    const step = this.queue.shift();
    if (!step) {
      if (!this.finished) {
        this.finished = true;
        this.hooks.onFinished(this);
      }
      return;
    }
    this.current = step;
    step.start(this);
  }

  /** Runs `steps` now, then resumes the current step. */
  interrupt(steps: Step[]): void {
    const cur = this.current;
    this.current = null;
    this.setControls(false);
    this.queue.unshift(...steps, ...(cur ? [new ResumeStep(cur)] : []));
    this.next();
  }

  /** Inserts steps to run right after the current one. */
  insert(steps: Step[]): void {
    this.queue.unshift(...steps);
  }

  // ------------------------------------------------------------------ stage

  /** Builds the isometric stage from a story map. Zampanò wears his dream costume by default. */
  setStage(key: MapKey, opts: StageOptions = {}): World {
    // The FX layers belong to the scene: take them out before the old world is destroyed.
    this.worldFx.removeFromParent();
    this.bleach = 0;
    this.visor = 0;
    this.fog = 0;
    this.world?.destroy();
    this.actors.clear();
    const def = STORY_MAPS[key];
    const level = parseAsciiMap(def.rows, { base: def.base, requireExit: false });
    const skin = this.costume(opts.skinKey ?? (opts.skin === 'plain' ? 'zampano' : dreamSkin(this.state)));
    ensureCharactersNow([skin]);
    const palette = paletteForChapter(this.chapter.number, def.theme, THEMES[def.theme]);
    const world = new World(level, palette, {
      playerSkin: skin,
      forest: true,
      floorDesign: floorDesignForMap(this.chapter.number, key, palette, level),
    });
    this.world = world;
    this.mapKey = key;
    world.fxLayer.addChild(this.worldFx);
    this.worldFx.removeChildren();
    this.worldFx.addChild(this.particles.root, this.popups.root);
    this.stageLayer.removeChildren();
    this.stageLayer.addChild(world.root);
    world.camera.setView(this.w, this.h);
    if (opts.at) {
      const p = this.marker(opts.at);
      world.player.setPosition(p.x, p.y);
    }
    if (opts.face) world.player.face(opts.face);
    world.snapCamera();
    return world;
  }

  /** Grid center of a marker digit, 'S', 'E', or an explicit [x, y]. */
  marker(m: string | Point): Point {
    if (typeof m !== 'string') return m;
    const lvl = this.world?.level;
    if (!lvl) return { x: 0, y: 0 };
    if (m === 'S') return { x: lvl.start.i + 0.5, y: lvl.start.j + 0.5 };
    if (m === 'E') return { x: lvl.exit.i + 0.5, y: lvl.exit.j + 0.5 };
    const p = lvl.markers[m];
    if (!p) throw new Error(`marker ${m} missing on map ${this.mapKey}`);
    return { x: p.i + 0.5, y: p.j + 0.5 };
  }

  addActor(name: string, who: Who, at: string | Point, behavior?: Behavior, face?: Dir8): Actor {
    if (!this.world) throw new Error('addActor without a stage');
    if (!SPECIALS.has(who)) ensureCharactersNow([who as CharacterKey]);
    const p = this.marker(at);
    this.removeActor(name);
    const a = new Actor(name, who, p.x, p.y);
    if (behavior) a.setBehavior(behavior);
    if (face) a.face(face);
    this.actors.set(name, a);
    this.world.addEntity(a);
    return a;
  }

  actor(name: string): Actor {
    const a = this.actors.get(name);
    if (!a) throw new Error(`no actor ${name}`);
    return a;
  }

  removeActor(name: string): void {
    const a = this.actors.get(name);
    if (!a) return;
    this.actors.delete(name);
    this.world?.removeEntity(a);
  }

  get player() {
    return this.world!.player;
  }

  /**
   * He wears armour (Zampanò's, or the armour of the dog played instead) and has been armed
   * (the `knight` ability, 2.3): the SWORD and the SHIELD are his.
   */
  get knighted(): boolean {
    const key = this.world?.player.animator.key;
    return !!key && ARMOURED_SKINS.has(key) && this.state.abilities.includes('knight');
  }

  /** Who the player controls (`?as=`): Zampanò by default. */
  playAs: PlayAs = 'zampano';

  /** The skin for one of Zampanò's costumes, for whoever is played. */
  costume(key: PlayableCharacterKey): PlayableCharacterKey {
    return costumeFor(this.playAs, key);
  }

  /**
   * Lets the joystick / action button (and RUN, unless walking pace only) drive Zampanò.
   * `own`: the scene has its own action (LOOK, VOW...), first among the action button's modes;
   * `fight`: start on the SWORD (knights) or BARK.
   */
  setControls(on: boolean, action = 'BARK', run = true, opts: { own?: boolean; fight?: boolean; keepMode?: boolean } = {}): void {
    this.controlsWanted = on;
    this.controlsAction = action;
    this.controlsRun = run;
    this.controlsOpts = opts;
    this.controls.configure({ pee: false, action, run, story: true });
    const modes: ActionMode[] = [];
    if (opts.own || action !== 'BARK') modes.push('scene');
    modes.push('bark');
    if (this.knighted) modes.push('sword', 'shield');
    this.actionModes = modes;
    const keep = opts.keepMode && modes.includes(this.actionMode);
    this.setActionMode(keep ? this.actionMode : opts.fight ? (this.knighted ? 'sword' : 'bark') : modes[0]!);
    this.controls.setEnabled(on);
    if (!on) {
      this.game.input.joystick.active = false;
      this.world?.player.setIntent(0, 0);
    }
  }

  private controlsWanted = false;
  private controlsAction = 'BARK';
  private controlsRun = true;
  private controlsOpts: { own?: boolean; fight?: boolean } = {};
  /** What the action button can do in this walk, and what it does now (the switcher cycles). */
  actionModes: ActionMode[] = ['bark'];
  actionMode: ActionMode = 'bark';

  setActionMode(mode: ActionMode): void {
    if (!this.actionModes.includes(mode)) return;
    this.actionMode = mode;
    const label = mode === 'scene' ? this.controlsAction : mode === 'bark' ? 'BARK' : mode === 'sword' ? 'SWORD' : 'SHIELD';
    this.controls.setActionMode(mode, label, this.actionModes.indexOf(mode), this.actionModes.length);
  }

  /** The switcher (button, Q / Tab, or a gesture): the action button's next mode. */
  cycleActionMode(): void {
    const m = this.actionModes;
    if (m.length < 2) return;
    this.setActionMode(m[(m.indexOf(this.actionMode) + 1) % m.length]!);
    this.game.audio.play('click');
    // Without the touch buttons on screen, say it.
    if (!this.game.input.usingTouch) {
      const label = this.actionMode === 'scene' ? this.controlsAction : this.actionMode.toUpperCase();
      this.notice(`J: ${label}`, '#9ad8ff');
    }
  }

  /** Pause menu opened: freeze input without forgetting what the step wanted. */
  suspendControls(): void {
    this.controls.setEnabled(false);
    this.game.input.joystick.active = false;
    this.world?.player.setIntent(0, 0);
    this.hud.setMenuEnabled(false);
  }

  resumeAfterPause(): void {
    this.game.input.clearPending();
    this.hud.setMenuEnabled(true);
    if (this.controlsWanted) this.setControls(true, this.controlsAction, this.controlsRun, { ...this.controlsOpts, keepMode: true });
  }

  requestMenu(): void {
    this.hooks.onMenu(this);
  }

  // ------------------------------------------------------------------ effects & feedback

  /**
   * Applies campaign effects to this attempt and shows what changed. They are saved with the
   * campaign when the scene is finished (story/storyFlow.ts), never half way through.
   */
  apply(fx: Effects): void {
    const changes = applyEffects(this.state, fx);
    changes.forEach((c, k) => this.notice(c.label, c.positive ? C.green : C.red, k * 0.25));
  }

  notice(text: string, color: string = C.yellow, delay = 0): void {
    const t = new PixelText(text, { color, outline: '#000000', align: 'center', maxWidth: this.w - 16 }).setOrigin(0.5, 0);
    t.position.set(Math.round(this.w / 2), 84);
    t.visible = false;
    this.uiLayer.addChild(t);
    this.notices.push({ t, life: 2 + delay });
  }

  /** A text popup above a world position (grid). */
  say(text: string, at: Point, color: string = C.white): void {
    const s = gridToScreen(at.x, at.y);
    this.popups.text(text, s.x, s.y - 40, { color, glow: 'self', glowAlpha: 0.3, align: 'center', maxWidth: Math.min(150, this.w - 24) }, 1.2, -16, true);
  }

  flash(color = 0xffffff, alpha = 0.9): void {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }
  private flashColor = 0xffffff;
  private flashAlpha = 0;

  /** 1.1: the helmet slipping over his eyes (0 = up, 1 = down to a slit). */
  visor = 0;
  /** 7.4: smoke (0 = clear, 1 = only a small circle around Zampanò is visible). */
  fog = 0;
  /**
   * 6.4: the desert bleaching the drawing (0 = normal colour, 1 = grey; negative = more saturated,
   * 7.1's city). The fx layer keeps its colour.
   */
  set bleach(v: number) {
    if (!this.world) return;
    if (Math.abs(v) <= 0.001) {
      for (const l of [this.world.mapRenderer.root, this.world.decalLayer, this.world.objectLayer]) l.filters = [];
      return;
    }
    this.bleachFilter.reset();
    this.bleachFilter.saturate(-Math.max(-1, Math.min(1, v)), false);
    for (const l of [this.world.mapRenderer.root, this.world.decalLayer, this.world.objectLayer]) if (l.filters?.[0] !== this.bleachFilter) l.filters = [this.bleachFilter];
  }
  private readonly bleachFilter = new ColorMatrixFilter();

  shake(amount: number): void {
    this.world?.camera.shake(amount);
  }

  // ------------------------------------------------------------------ loop

  update(dt: number): void {
    this.time += dt;
    // Play time (saved with the campaign at the end of the scene, or kept when it is abandoned).
    this.state.playTime += dt;
    const input = this.game.input;
    if (input.consume('menu') || input.consume('back')) {
      this.hooks.onMenu(this);
      return;
    }
    this.dialogue.cps = STORY.TEXT_CPS[this.game.settings.textSpeed];
    this.world?.beginStep();
    if (this.pilot) {
      this.pilot.beginStep(dt, this);
      this.current?.pilot?.(dt, this, this.pilot);
    }
    if (this.current && this.current.update(dt, this) === 'done') this.next();
    if (this.world) {
      this.world.player.updateMovement(dt, this.world.map);
      for (const a of this.actors.values()) a.step(dt, this.world.map, this.world.player);
      this.world.endStep(dt);
    }
    this.particles.update(dt);
    if (this.world) {
      // Speech stays readable: inside the view's sides and below the HUD.
      const v = this.world.camera.viewRect();
      const k = STORY.SAY_INSET;
      this.popups.keepIn = { x: v.x + k.SIDE, y: v.y + k.TOP, w: v.w - k.SIDE * 2, h: v.h - k.TOP };
    } else this.popups.keepIn = null;
    this.popups.update(dt);
    this.dialogue.update(dt);
    this.cards.update(dt);
    for (let k = this.notices.length - 1; k >= 0; k--) {
      const n = this.notices[k]!;
      n.life -= dt;
      if (n.life <= 0) {
        n.t.destroy();
        this.notices.splice(k, 1);
      }
    }
    let y = Math.max(84, Math.round(this.hud.bottom + 6));
    for (const n of this.notices) {
      n.t.visible = n.life < 2;
      if (!n.t.visible) continue;
      n.t.y = Math.round(y - (2 - n.life) * 3);
      n.t.alpha = Math.min(1, n.life * 2);
      y += n.t.textHeight + 4;
    }
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.5);
  }

  render(alpha: number, frameDt: number): void {
    this.world?.render(alpha, frameDt);
    this.controls.update(frameDt);
    if (this.world) this.controls.setEnergy(this.player.energy.fraction, this.player.canRun);
    this.hud.update(frameDt, this.state);
    const g = this.overlayG;
    g.clear();
    if (this.fog > 0.01 && this.world) {
      const p = this.uiLayer.toLocal(this.player.view.getGlobalPosition());
      const r = Math.max(this.w, this.h) * (1 - this.fog) + 34 * this.fog;
      g.rect(0, 0, this.w, this.h).fill({ color: 0x2a2228, alpha: 0.92 }).circle(p.x, p.y - 12, r).cut();
    }
    if (this.visor > 0.01) {
      // The helmet comes down from the top, the cheek-pieces up from the bottom: a slit is left.
      const top = Math.round((this.h / 2) * this.visor);
      const bottom = Math.round((this.h / 2) * this.visor * 0.82);
      g.rect(0, 0, this.w, top).fill({ color: 0x14161c });
      g.rect(0, this.h - bottom, this.w, bottom).fill({ color: 0x14161c });
      g.rect(0, top - 2, this.w, 2).fill({ color: 0x8a94a8 });
    }
    if (this.flashAlpha > 0) g.rect(0, 0, this.w, this.h).fill({ color: this.flashColor, alpha: this.flashAlpha });
  }

  /** Automation (story smoke test): ends the current step at once and starts the next. */
  debugSkip(): void {
    if (this.current && !this.finished) this.next();
  }

  /** Debug summary for automation. */
  debugState(): Record<string, unknown> {
    const p = this.world?.player;
    return {
      sub: this.sub.id,
      finished: this.finished,
      time: +this.time.toFixed(2),
      metrics: this.metrics,
      step: this.current?.constructor.name ?? null,
      queue: this.queue.length,
      player: p ? { gx: +p.gx.toFixed(2), gy: +p.gy.toFixed(2) } : null,
      meters: { ...this.state.meters },
    };
  }
}

/** Generates placeholder sprites for characters right away (sheets load asynchronously). */
function ensureCharactersNow(keys: CharacterKey[]): void {
  void ensureCharacters(keys);
}
