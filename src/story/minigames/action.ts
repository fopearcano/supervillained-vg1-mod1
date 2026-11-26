import { Graphics, Sprite } from 'pixi.js';
import { textures } from '../../core/assets';
import { ensureCharacters } from '../../assets/build';
import { animationFrame } from '../../assets/animationTiming';
import { CHARACTERS, textureName, type AnimName, type CharacterKey } from '../../assets/manifest';
import { dreamSkin } from '../../campaign/state';
import { PixelText } from '../../ui/pixelText';
import { C, frameRect, hex } from '../../ui/retro';
import { STORY } from '../../config';
import type { Autopilot } from '../autopilot';
import type { StoryScene } from '../storyScene';
import { MiniGame, type MiniResult } from './miniGame';

/** Frame `k` of a looping cycle, wrapped to the frames this character's sheet has for `anim`. */
function cycleFrame(key: CharacterKey, anim: AnimName, k: number): number {
  const n = CHARACTERS[key].anims[anim]?.frames ?? 1;
  return ((Math.floor(k) % n) + n) % n;
}

/** Reads "pressed this step" for the common actions. */
function act(ctx: StoryScene): boolean {
  const i = ctx.game.input;
  return i.consumeAny(['action', 'pee', 'confirm']);
}

// ---------------------------------------------------------------------------- ladders

interface Falling {
  lane: number;
  y: number;
  kind: 'stone' | 'pitch';
  warn: number;
}

/**
 * Siege ladders (5.2 rehearsal, 7.2 the real thing): three ladders against the wall. Tap / UP to
 * climb a rung, LEFT / RIGHT (or tap the sides) to change ladder. Stones and pitch come down;
 * axe-men hold the parapet.
 */
export class LaddersGame extends MiniGame {
  private readonly g = new Graphics();
  private readonly hero: Sprite;
  private readonly info = new PixelText('', { color: C.white, shadow: '#000000', align: 'center' }).setOrigin(0.5, 0);
  private readonly axemen: Sprite[] = [];
  private lane = 1;
  private rung = 0;
  private slide = 0;
  private falling: Falling[] = [];
  private spawnT = 1;
  private hitT = 0;
  private axeLane = 0;
  private axeT = 0;
  private climbT = 0;

  constructor(
    private readonly rungs: number,
    private readonly hard: boolean,
    skin: string,
  ) {
    super();
    this.hidesStage = true;
    this.objective = hard ? 'CLIMB! AVOID STONES, PITCH AND THE AXE-MEN' : 'REHEARSAL: CLIMB THE LADDER, AVOID THE STONES';
    void ensureCharacters([skin, 'varangian']);
    this.hero = new Sprite(textures.get(textureName(skin as 'zampano', 'walk', 'N', 0)));
    this.hero.anchor.set(0.5, 0.9);
    this.root.addChild(this.g, this.hero, this.info);
    if (hard) {
      for (let k = 0; k < 2; k++) {
        const s = new Sprite(textures.get(textureName('varangian', 'idle', 'S', 0)));
        s.anchor.set(0.5, 0.9);
        this.axemen.push(s);
        this.root.addChild(s);
      }
    }
  }

  private laneX(l: number): number {
    return Math.round(this.w * (0.25 + l * 0.25));
  }

  /** Screen y of a rung, scrolling so Zampanò stays in the lower part of the screen. */
  private rungY(r: number): number {
    const step = 22;
    const base = this.h - 70;
    const scroll = Math.max(0, this.rung - 6) * step;
    return base - r * step + scroll;
  }

  start(ctx: StoryScene): void {
    ctx.setControls(false);
  }

  update(dt: number, ctx: StoryScene): MiniResult {
    const input = ctx.game.input;
    const { w, h } = this;
    // Input: taps on the sides change ladder, in the middle climb.
    let climb = act(ctx) || input.consume('up');
    for (const t of input.consumeTaps()) {
      if (t.x < w * 0.3) this.lane = Math.max(0, this.lane - 1);
      else if (t.x > w * 0.7) this.lane = Math.min(2, this.lane + 1);
      else climb = true;
    }
    if (input.consume('left')) this.lane = Math.max(0, this.lane - 1);
    if (input.consume('right')) this.lane = Math.min(2, this.lane + 1);
    this.climbT -= dt;
    if (climb && this.hitT <= 0 && this.slide <= 0 && this.climbT <= 0) {
      this.climbT = STORY.LADDERS.CLIMB_GAP;
      this.rung++;
      ctx.game.audio.play('click', { volume: 0.4, rate: 1 + (this.rung % 4) * 0.1 });
    }
    if (this.slide > 0) {
      this.slide -= dt;
      this.rung = Math.max(0, this.rung - dt * STORY.LADDERS.SLIDE_RATE);
    }
    this.hitT -= dt;

    // Falling things
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const Lc = STORY.LADDERS;
      this.spawnT = (this.hard ? Lc.SPAWN_HARD : Lc.SPAWN) * (0.7 + Math.random() * 0.6);
      this.falling.push({ lane: Math.floor(Math.random() * 3), y: -20, kind: this.hard && Math.random() < Lc.PITCH_CHANCE ? 'pitch' : 'stone', warn: Lc.WARN });
    }
    const heroY = this.rungY(this.rung);
    for (let k = this.falling.length - 1; k >= 0; k--) {
      const f = this.falling[k]!;
      if (f.warn > 0) {
        f.warn -= dt;
        continue;
      }
      f.y += dt * (f.kind === 'pitch' ? STORY.LADDERS.PITCH_SPEED : STORY.LADDERS.STONE_SPEED);
      if (f.lane === this.lane && Math.abs(f.y - (heroY - 14)) < 12 && this.hitT <= 0) {
        this.hitT = STORY.LADDERS.HIT_TIME;
        this.slide = STORY.LADDERS.SLIDE_TIME;
        ctx.game.audio.play('hurt');
        ctx.notice(f.kind === 'pitch' ? 'PITCH!' : 'STONE!', C.red);
        this.falling.splice(k, 1);
        continue;
      }
      if (f.y > h + 20) this.falling.splice(k, 1);
    }
    // Axe-men hold the parapet: move between ladders near the top.
    const top = this.rungY(this.rungs);
    if (this.hard) {
      this.axeT -= dt;
      if (this.axeT <= 0) {
        this.axeT = STORY.LADDERS.AXE_EVERY;
        this.axeLane = Math.floor(Math.random() * 3);
      }
      this.axemen.forEach((s, k) => {
        const l = k === 0 ? this.axeLane : (this.axeLane + 2) % 3;
        s.position.set(this.laneX(l), top - 4);
        if (l === this.lane && this.rung > this.rungs - 2 && this.hitT <= 0) {
          this.hitT = STORY.LADDERS.AXE_HIT_TIME;
          this.slide = STORY.LADDERS.AXE_SLIDE_TIME;
          ctx.game.audio.play('hit');
          ctx.notice('AXE-MEN HOLD THE PARAPET', C.red);
        }
      });
    }

    // Draw: wall, ladders, falling things.
    const g = this.g;
    g.clear();
    // This mini-game hides the world, so carry the active chapter's masonry palette into it.
    const wall = ctx.world?.palette.wall ?? ctx.world?.palette.stone ?? ['#8a7660', '#4b3630', '#c8ad88'];
    const [wallBase, wallInk, wallLight] = wall.map(hex);
    g.rect(0, 0, w, h).fill(wallInk!);
    // Bricks scroll down as he climbs.
    const scroll = Math.max(0, this.rung - 6) * 22;
    const off = scroll % 10;
    const base = Math.floor(scroll / 10);
    for (let row = -2; row < h / 10 + 2; row++) {
      const y = Math.round(row * 10 + off);
      const shift = ((row - base) & 1) * 10;
      for (let x = -shift; x < w; x += 20) {
        const tone = ((Math.floor(x / 20) * 7 + row - base) & 3) === 0 ? wallInk! : wallBase!;
        g.rect(x, y, 19, 9).fill(tone);
        g.rect(x + 1, y, 17, 1).fill(wallLight!);
        g.rect(x, y + 1, 1, 7).fill(wallLight!);
        if (((Math.floor(x / 20) + row - base) & 1) === 0) {
          for (let k = 0; k < 3; k++) g.rect(x + 10 + k * 2, y + 5 - k, 3, 1).fill(wallInk!);
        }
      }
    }
    if (top > -10) {
      g.rect(0, top - 30, w, 26).fill(wallBase!);
      g.rect(0, top - 30, w, 2).fill(wallLight!);
      for (let x = 0; x < w; x += 24) {
        g.rect(x, top - 40, 14, 12).fill(wallBase!);
        g.rect(x + 1, top - 40, 12, 1).fill(wallLight!);
      }
    }
    for (let l = 0; l < 3; l++) {
      const x = this.laneX(l);
      g.rect(x - 10, Math.max(top - 6, 0), 2, h).fill(0x5a3a1c);
      g.rect(x + 8, Math.max(top - 6, 0), 2, h).fill(0x5a3a1c);
      for (let r = 0; r <= this.rungs; r++) {
        const y = this.rungY(r);
        if (y > -5 && y < h + 5) g.rect(x - 10, y, 20, 2).fill(0x7a5430);
      }
    }
    for (const f of this.falling) {
      const x = this.laneX(f.lane);
      if (f.warn > 0) {
        if (Math.floor(f.warn * 10) % 2) g.rect(x - 6, 2, 12, 3).fill(0xff3030);
        continue;
      }
      if (f.kind === 'stone') g.circle(x, f.y, 6).fill(0x9a9a9a).stroke({ width: 1, color: 0x3a3a3a });
      else g.ellipse(x, f.y, 5, 9).fill(0x1a1410);
    }
    this.hero.position.set(this.laneX(this.lane), heroY);
    // One walk cycle every four rungs, whatever the sheet's frame count.
    const skin = this.heroSkin(ctx) as CharacterKey;
    const walkFrames = CHARACTERS[skin].anims.walk?.frames ?? 4;
    this.hero.texture = textures.get(textureName(skin, 'walk', 'N', cycleFrame(skin, 'walk', (this.rung * walkFrames) / 4)));
    this.hero.alpha = this.hitT > 0 && Math.floor(this.hitT * 12) % 2 ? 0.4 : 1;
    this.info.setText(`${Math.min(this.rungs, Math.floor(this.rung))}/${this.rungs}  TAP MIDDLE: CLIMB  SIDES: LADDER`);
    this.info.setStyle({ maxWidth: w - 16 });
    this.info.position.set(Math.round(w / 2), h - 28);
    frameRect(g, 4, h - 32, w - 8, 22, hex(C.yellow));
    return this.rung >= this.rungs ? 'won' : 'running';
  }

  private heroSkin(ctx: StoryScene): string {
    return dreamSkin(ctx.state);
  }

  /** Autopilot: climb at a human tapping rate, dodge to a clear ladder, wait out the axe-men. */
  override pilot(_dt: number, ctx: StoryScene, p: Autopilot): void {
    const heroY = this.rungY(this.rung);
    const threat = (lane: number) =>
      this.falling.some((f) => f.lane === lane && (f.warn > 0 || (f.y < heroY && f.y > heroY - STORY.PILOT.LADDER_LOOKAHEAD)));
    const axeLanes = this.hard && this.rung > this.rungs - 3 ? [this.axeLane, (this.axeLane + 2) % 3] : [];
    const bad = (lane: number) => threat(lane) || axeLanes.includes(lane);
    if (bad(this.lane)) {
      const options = [this.lane - 1, this.lane + 1].filter((l) => l >= 0 && l <= 2 && !bad(l));
      const far = [0, 1, 2].filter((l) => !bad(l));
      const goal = options[0] ?? far[0];
      if (goal !== undefined && p.tick('ladder-move', 0.12 + (1 - p.policy.skill) * 0.25)) p.press(ctx, goal < this.lane ? 'left' : 'right');
      if (axeLanes.includes(this.lane)) return; // never climb into an axe
    }
    const rate = STORY.PILOT.LADDER_TAPS * (0.6 + 0.4 * p.policy.skill);
    if (p.tick('ladder-climb', 1 / rate)) p.press(ctx, 'up');
  }
}

// ---------------------------------------------------------------------------- tug of war

export interface TugOptions {
  objective: string;
  label: string;
  /** Who is pulled ahead of Zampanò (Confusione into the breach, in his mail as on the stage; the prince's boat). */
  friend: 'confusioneKnight' | 'prince';
}

/**
 * Mash against a force that keeps growing; meant to be lost. 7.7: Zampanò holds Confusione by a
 * hind leg and he wriggles free. 7.1: rowing the prince along the walls while the shouting
 * sends the boat back.
 */
export class TugGame extends MiniGame {
  private readonly g = new Graphics();
  private readonly label: PixelText;
  private readonly hero: Sprite;
  private readonly friend: Sprite;
  private pos = 0;

  constructor(private readonly o: TugOptions = { objective: 'HOLD CONFUSIONE BACK BY A HIND LEG', label: 'MASH TO HOLD HIM BACK!', friend: 'confusioneKnight' }) {
    super();
    this.objective = o.objective;
    this.label = new PixelText(o.label, { color: C.yellow, shadow: '#000000' }).setOrigin(0.5);
    void ensureCharacters(['zampanoKnight', o.friend]);
    this.hero = new Sprite(textures.get(textureName('zampanoKnight', 'run', 'E', 0)));
    this.friend = new Sprite(textures.get(textureName(o.friend, 'run', 'E', 0)));
    this.hero.anchor.set(0.5, 0.9);
    this.friend.anchor.set(0.5, 0.9);
    this.root.addChild(this.g, this.hero, this.friend, this.label);
  }

  start(ctx: StoryScene): void {
    ctx.setControls(false);
  }

  update(dt: number, ctx: StoryScene): MiniResult {
    const { w, h } = this;
    let pulls = ctx.game.input.consumeTaps().length;
    if (act(ctx)) pulls++;
    // He pulls harder and harder: the player cannot win.
    const T = STORY.TUG;
    const force = T.BASE + this.time * T.GROW;
    this.pos += force * dt - pulls * T.PULL;
    this.pos = Math.max(-0.3, Math.min(1, this.pos));
    if (pulls) ctx.game.audio.play('click', { volume: 0.4 });
    const g = this.g;
    g.clear();
    g.rect(0, h * 0.5 - 40, w, 80).fill({ color: 0x000000, alpha: 0.5 });
    const holeX = w - 20;
    g.rect(holeX - 6, h * 0.5 - 30, 26, 50).fill(0x0a0606);
    const fx = Math.round(w * 0.5 + this.pos * (holeX - w * 0.5 - 10));
    this.friend.position.set(fx, h * 0.5 + 10);
    this.hero.position.set(fx - 34, h * 0.5 + 12);
    g.rect(fx - 30, h * 0.5 + 2, 24, 2).fill(0xd8c8a0);
    const bw = w - 40;
    g.rect(20, h * 0.5 + 40, bw, 6).fill(0x220808);
    g.rect(20, h * 0.5 + 41, Math.round(bw * Math.max(0, this.pos)), 4).fill(0xff3030);
    frameRect(g, 20, h * 0.5 + 40, bw, 6, hex(C.yellow));
    this.label.position.set(Math.round(w / 2), Math.round(h * 0.5 - 52));
    this.hero.texture = textures.get(textureName('zampanoKnight', 'run', 'E', animationFrame(CHARACTERS.zampanoKnight.anims.run!, this.time)));
    // The authored run timing, as for the hero: the 8-frame cast run keeps pace with Zampanò's.
    this.friend.texture = textures.get(textureName(this.o.friend, 'run', 'E', animationFrame(CHARACTERS[this.o.friend].anims.run!, this.time)));
    return this.pos >= 1 ? 'lost' : 'running';
  }

  /** Autopilot: mash as fast as a person can (it is still meant to be lost). */
  override pilot(_dt: number, ctx: StoryScene, p: Autopilot): void {
    p.every(ctx, 'tug', 1 / STORY.PILOT.TUG_TAPS, 'confirm');
  }
}

// ---------------------------------------------------------------------------- the boat

/**
 * 4.2: ease a skiff alongside a ship (the horse transport, with hay and water for the horses).
 * Each stroke brings the boat closer; strokes too close together slosh water in, and a full boat
 * swamps. `bob` names an actor that rocks on the swell while the game runs.
 */
export class BoatGame extends MiniGame {
  private readonly g = new Graphics();
  private readonly label = new PixelText('EASE ALONGSIDE: GENTLE STROKES', { color: C.cyan, shadow: '#000000', align: 'center' }).setOrigin(0.5);
  private progress = 0;
  private water = 0;
  private lastStroke = -9;
  private swampedT = 0;

  constructor(private readonly o: { objective: string; bob?: string } = { objective: 'EASE ALONGSIDE WITHOUT SWAMPING THE BOAT' }) {
    super();
    this.objective = o.objective;
  }

  start(ctx: StoryScene): void {
    ctx.setControls(false);
    this.root.addChild(this.g, this.label);
  }

  update(dt: number, ctx: StoryScene): MiniResult {
    const B = STORY.BOAT;
    let strokes = ctx.game.input.consumeTaps().length;
    if (act(ctx)) strokes++;
    this.swampedT -= dt;
    if (strokes && this.swampedT <= 0) {
      if (this.time - this.lastStroke < B.MIN_GAP) {
        this.water += B.SPLASH;
        ctx.game.audio.play('splash', { volume: 0.5 });
        ctx.notice('TOO HARD: WATER IN THE BOAT', C.orange);
      } else {
        this.progress = Math.min(1, this.progress + B.STROKE);
        ctx.game.audio.play('click', { volume: 0.5 });
      }
      this.lastStroke = this.time;
    }
    this.water = Math.max(0, this.water - B.DRAIN * dt);
    if (this.water >= 1) {
      this.water = 0;
      this.progress = Math.max(0, this.progress - 0.5);
      this.swampedT = 1.2;
      ctx.shake(4);
      ctx.notice('SWAMPED! BAIL OUT AND TRY AGAIN', C.red);
      ctx.game.audio.play('hurt');
    }
    const rocking = this.o.bob ? ctx.actors.get(this.o.bob) : undefined;
    if (rocking) rocking.z = Math.sin(this.time * 2) * 1.5;
    const { w, h } = this;
    const g = this.g;
    g.clear();
    const bw = w - 60;
    const bar = (y: number, frac: number, color: number) => {
      g.rect(30, y, bw, 8).fill({ color: 0x000000, alpha: 0.6 });
      g.rect(31, y + 1, Math.round((bw - 2) * Math.max(0, Math.min(1, frac))), 6).fill(color);
      frameRect(g, 30, y, bw, 8, hex(C.yellow));
    };
    bar(h - 118, this.progress, 0x5ac8ff);
    bar(h - 100, this.water, 0x2a6aff);
    this.label.setText(this.swampedT > 0 ? 'SWAMPED!' : this.progress > 0.75 ? 'ALMOST ALONGSIDE...' : 'EASE ALONGSIDE: GENTLE STROKES\n(DISTANCE / WATER IN THE BOAT)');
    this.label.position.set(Math.round(w / 2), h - 136);
    return this.progress >= 1 ? 'won' : 'running';
  }

  /** Autopilot: steady strokes, a little too eager when unskilled. */
  override pilot(_dt: number, ctx: StoryScene, p: Autopilot): void {
    const gap = STORY.BOAT.MIN_GAP * (1.05 + p.policy.skill * 0.4);
    p.every(ctx, 'boat', p.random() < 0.08 * (1 - p.policy.skill) ? gap * 0.6 : gap, 'confirm');
  }
}
