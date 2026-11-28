import { Container, Graphics, Sprite } from 'pixi.js';
import { textures } from '../core/assets';
import { spriteName, type SpriteKey } from '../assets/manifest';
import { unshakeable, type Effects } from '../campaign/state';
import { COMBAT, STORY } from '../config';
import { Entity } from '../entities/entity';
import type { Actor, Point } from '../entities/actor';
import { gridToScreen } from '../iso/projection';
import { C } from '../ui/retro';
import type { GameMap } from '../world/map';
import { card, call } from './steps';
import type { Autopilot } from './autopilot';
import type { Step, StepStatus } from './step';
import { Combat, type FightDef } from './combat';
import { isOpen } from '../systems/combat';
import type { ActionMode } from '../ui/touchControls';
import type { StoryScene } from './storyScene';

/**
 * The dream walk: Zampanò moves freely on the stage toward an objective. One configurable step
 * covers reach / collect / wonder hunt / stealth / chase / pace (nerve) / thirst / scramble / fire.
 */

export interface Pickup {
  at: string | Point;
  kind: 'shard' | 'marvel' | 'coin' | 'relic' | 'spot' | 'tear';
  /** Name shown when found (marvels: "MARVEL: THE DROMON"). */
  label?: string;
  /** Short line shown with the name. */
  text?: string;
  effects?: Effects;
  /** A thing lying there, drawn on the ground (a spot is otherwise only marked by a ring). */
  sprite?: SpriteKey;
}

export interface PaceDef {
  /** Grid direction that counts as "forward" (default: start → goal). */
  forward?: Point;
  /** Extra nerve drain per second (shouting crowds, arrows...). */
  pressure?: number;
  /** Actors who, walking beside him, steady his nerve (each removes some pressure). */
  companions?: string[];
}

/** What the autopilot should do in a walk with a custom objective. */
export interface PilotHint {
  target?: Point;
  /** Press the action button now. */
  act?: boolean;
  /** Stay put at the target (listening, waiting). */
  hold?: boolean;
}

export interface WalkState {
  time: number;
  collected: number;
  nerve: number;
  thirst: number;
  /** Free slots for scripts. */
  data: Record<string, unknown>;
  /** Set true from a script to finish the walk. */
  complete: boolean;
  /** Adds a pickup at runtime (e.g. shards falling from the Professor's sentences). */
  spawn: (p: Pickup) => void;
}

export interface WalkDef {
  objective: string;
  /** Action button label. */
  action?: string;
  /** `hidden`: no ring and no arrow; he finds it by ear (a script makes the sounds). */
  goal?: { reach: string | Point; radius?: number; label?: string; hidden?: boolean };
  pickups?: Pickup[];
  /** How many pickups finish the walk (default: all, when there is no reach goal). */
  need?: number;
  survive?: number;
  /** What happens when a sight cone fills or a hostile touches him. */
  caught?: 'restart' | ((ctx: StoryScene, w: WalkState) => Step[]);
  caughtText?: string;
  onAction?: (ctx: StoryScene, w: WalkState) => void;
  onUpdate?: (ctx: StoryScene, w: WalkState, dt: number) => void;
  onPickup?: (ctx: StoryScene, p: Pickup, w: WalkState) => void;
  pace?: PaceDef;
  thirst?: { mirage: string; drain: number };
  scramble?: boolean;
  fire?: { from: string; spread: number; startAfter: (w: WalkState) => boolean };
  /** Movement speed multiplier (bogs, sand, armour). */
  speed?: number;
  /** Zampanò can't run (walking pace only). */
  noRun?: boolean;
  /** Passing near one of these moves the restart point there (long walks with chasers). */
  checkpoints?: Array<string | Point>;
  /** Autopilot advice for objectives it cannot infer from goal and pickups. */
  pilot?: (ctx: StoryScene, w: WalkState, p: Autopilot) => PilotHint | null;
  /** A fight: these actors swing at him; he has hearts (story/combat.ts). */
  fight?: FightDef;
}

const PICKUP_SPRITE: Record<Pickup['kind'], SpriteKey | null> = {
  shard: 'shard',
  marvel: 'sparkle',
  coin: 'coin',
  relic: 'relic',
  spot: null,
  tear: 'tear',
};

class PickupEntity extends Entity {
  private t = Math.random() * 6;
  readonly sprite: Sprite | null;
  constructor(
    readonly def: Pickup,
    x: number,
    y: number,
  ) {
    super();
    const key = def.sprite ?? PICKUP_SPRITE[def.kind];
    this.lying = !!def.sprite;
    this.sprite = key ? new Sprite(textures.get(spriteName(key))) : null;
    if (this.sprite) {
      const sh = new Sprite(textures.get(spriteName('shadowSmall')));
      this.view.addChild(sh, this.sprite);
      if (def.kind === 'marvel') this.sprite.scale.set(2);
    }
    this.setPosition(x, y);
    this.bounds = { x: -8, y: -24, w: 16, h: 26 };
    this.depthBias = -0.2;
  }
  /** A thing on the ground (sword, lamp...): it lies still instead of floating like a token. */
  private readonly lying: boolean;
  override update(dt: number): void {
    this.t += dt;
    if (this.sprite && this.lying) {
      this.sprite.y = 0;
      return;
    }
    if (this.sprite) {
      this.sprite.y = -6 - Math.round((Math.sin(this.t * 3) + 1) * 2);
      if (this.def.kind === 'marvel') this.sprite.alpha = 0.6 + 0.4 * Math.sin(this.t * 6);
    }
  }
}

/** Line of sight between two grid points (walls, solid tall props and bushes block it). */
export function lineOfSight(map: GameMap, ax: number, ay: number, bx: number, by: number): boolean {
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.ceil(d / 0.25);
  for (let k = 1; k < n; k++) {
    const x = ax + ((bx - ax) * k) / n;
    const y = ay + ((by - ay) * k) / n;
    const i = Math.floor(x);
    const j = Math.floor(y);
    if (map.isBlockedTile(i, j)) return false;
    const p = map.propAt(i, j);
    if (p && p.info.tall && (k < n - 2 || p.kind !== 'bush')) return false;
  }
  return true;
}

/** Can the actor see the point? (range, cone, line of sight; hiding in a bush works.) */
export function canSee(map: GameMap, a: Actor, x: number, y: number): boolean {
  if (!a.sight) return false;
  const dx = x - a.gx;
  const dy = y - a.gy;
  const d = Math.hypot(dx, dy);
  if (d > a.sight.range) return false;
  const cos = (dx * a.facing.x + dy * a.facing.y) / (d || 1);
  if (d > 0.8 && cos < Math.cos(a.sight.halfAngle)) return false;
  const here = map.propAt(Math.floor(x), Math.floor(y));
  if (here && here.kind === 'bush' && d > STORY.BUSH_HIDE) return false;
  return lineOfSight(map, a.gx, a.gy, x, y);
}

class WalkStep implements Step {
  private readonly w: WalkState = { time: 0, collected: 0, nerve: 1, thirst: 1, data: {}, complete: false, spawn: () => {} };
  private pickups: PickupEntity[] = [];
  private readonly deco = new Container();
  private readonly cones = new Graphics();
  private readonly ring = new Graphics();
  private readonly arrow = new Graphics();
  private start0: Point = { x: 0, y: 0 };
  private goal: Point | null = null;
  private forward: Point = { x: 0, y: -1 };
  private warnT = 0;
  private scrambleAngle = 0;
  private scrambleT = 0;
  private scrambleSettled = false;
  private mirage: Point | null = null;
  private fire = new Map<number, Sprite>();
  private fireT = 0;
  private fireOn = false;
  private passed = new Set<string>();
  private readonly combat: Combat;
  private resumed = false;
  /** Autopilot: for each foe's swing, whether it saw it coming (decided once per swing). */
  private readonly reacts = new Map<Actor, boolean>();

  constructor(private readonly def: WalkDef) {
    this.combat = new Combat(def.fight ?? null);
  }

  start(ctx: StoryScene): void {
    const world = ctx.world;
    if (!world) throw new Error('walk() needs a stage');
    this.start0 = { x: ctx.player.gx, y: ctx.player.gy };
    this.goal = this.def.goal ? ctx.marker(this.def.goal.reach) : null;
    if (this.def.pace) {
      if (this.def.pace.forward) this.forward = this.def.pace.forward;
      else if (this.goal) {
        const dx = this.goal.x - this.start0.x;
        const dy = this.goal.y - this.start0.y;
        const l = Math.hypot(dx, dy) || 1;
        this.forward = { x: dx / l, y: dy / l };
      }
    }
    this.w.spawn = (p: Pickup) => {
      const at = ctx.marker(p.at);
      const e = new PickupEntity(p, at.x, at.y);
      this.pickups.push(e);
      world.addEntity(e);
    };
    for (const p of this.def.pickups ?? []) this.w.spawn(p);
    if (this.def.thirst) this.mirage = ctx.marker(this.def.thirst.mirage);
    world.decalLayer.addChild(this.deco);
    this.deco.addChild(this.cones, this.ring);
    ctx.uiLayer.addChild(this.arrow);
    ctx.hud.setObjective(this.def.objective);
    ctx.player.speedMul = this.def.speed ?? 1;
    ctx.player.noRun = !!this.def.noRun || !!this.def.pace;
    this.combat.start(ctx);
    this.combat.onKnockedDown = () => {
      this.reset(ctx);
      this.combat.reset(ctx);
    };
    this.resume(ctx);
  }

  resume(ctx: StoryScene): void {
    // After a card or a line, the action button keeps the mode it had.
    ctx.setControls(true, this.def.action ?? 'BARK', !this.def.noRun && !this.def.pace, { own: !!this.def.onAction, fight: !!this.def.fight, keepMode: this.resumed });
    this.resumed = true;
    ctx.hud.setObjective(this.def.objective);
  }

  /** The action button (in this mode), or BARK / SWORD / SHIELD directly. */
  private perform(ctx: StoryScene, mode: ActionMode): void {
    if (mode === 'scene') {
      if (this.def.onAction) this.def.onAction(ctx, this.w);
      else this.combat.bark(ctx);
    } else if (mode === 'bark') this.combat.bark(ctx);
    else if (mode === 'sword') this.combat.strike(ctx);
    else this.combat.raiseShield(ctx);
  }

  /** Back to the start of the walk (after being caught). */
  private reset(ctx: StoryScene): void {
    ctx.metrics.restarts++;
    ctx.player.setPosition(this.start0.x, this.start0.y);
    ctx.world!.snapCamera();
    for (const a of ctx.actors.values()) a.alert = 0;
    this.w.nerve = 1;
  }

  update(dt: number, ctx: StoryScene): StepStatus {
    const world = ctx.world!;
    const map = world.map;
    const p = ctx.player;
    const input = ctx.game.input;
    const w = this.w;
    w.time += dt;

    // Movement intent (optionally scrambled).
    let mx = input.move.x;
    let my = input.move.y;
    if (this.def.scramble) this.updateScramble(dt, ctx);
    if (this.scrambleAngle) {
      const c = Math.cos(this.scrambleAngle);
      const s = Math.sin(this.scrambleAngle);
      [mx, my] = [mx * c - my * s, mx * s + my * c];
    }
    p.setIntent(mx, my, input.runHeld);

    // The action button does what its mode says; Space always does the scene's own action;
    // B / U / I and the gestures go straight to BARK / SWORD / SHIELD.
    if (input.consume('switch')) ctx.cycleActionMode();
    if (input.consume('action')) this.perform(ctx, ctx.actionMode);
    if (input.consume('pee')) this.perform(ctx, 'scene');
    if (input.consume('bark')) this.perform(ctx, 'bark');
    if (input.consume('strike')) this.perform(ctx, 'sword');
    if (input.consume('guard')) this.perform(ctx, 'shield');
    this.combat.update(dt, ctx, input.guardHeld || (ctx.actionMode === 'shield' && input.actionHeld));

    // Pickups
    for (let k = this.pickups.length - 1; k >= 0; k--) {
      const e = this.pickups[k]!;
      if (Math.hypot(e.gx - p.gx, e.gy - p.gy) > STORY.PICKUP_RADIUS) continue;
      this.pickups.splice(k, 1);
      world.removeEntity(e);
      w.collected++;
      const d = e.def;
      ctx.game.audio.play(d.kind === 'marvel' ? 'star' : d.kind === 'coin' ? 'coin' : 'treat');
      if (d.effects) ctx.apply(d.effects);
      if (d.label) ctx.say(d.label, { x: e.gx, y: e.gy }, d.kind === 'marvel' ? C.yellow : C.cyan);
      const s = gridToScreen(e.gx, e.gy);
      ctx.particles.burst(s.x, s.y - 10, { count: 10, textures: ['sparkle', 'pixel'], colors: [0xffffff, 0xffe23a, 0x5ac8ff], speed: [30, 70], life: [0.4, 0.8], drag: 3 });
      this.def.onPickup?.(ctx, d, w);
      if (d.text) ctx.interrupt([card(d.label ?? '', d.text, { color: C.yellow, seconds: 3.2, dim: 0.35 })]);
    }

    for (const c of this.def.checkpoints ?? []) {
      const at = ctx.marker(c);
      const key = `${at.x},${at.y}`;
      if (this.passed.has(key) || Math.hypot(at.x - p.gx, at.y - p.gy) > 1.2) continue;
      this.passed.add(key);
      this.start0 = { x: at.x, y: at.y };
      ctx.notice('CHECKPOINT', C.green);
      ctx.game.audio.play('star');
    }
    this.updateDetection(dt, ctx);
    if (this.def.pace) this.updatePace(dt, ctx);
    if (this.def.thirst) this.updateThirst(dt, ctx);
    if (this.def.fire) this.updateFire(dt, ctx);
    this.def.onUpdate?.(ctx, w, dt);
    this.drawGoal(ctx);

    // Completion
    const need = this.def.need ?? (this.goal ? 0 : (this.def.pickups?.length ?? 0));
    const reached = !this.goal || Math.hypot(this.goal.x - p.gx, this.goal.y - p.gy) < (this.def.goal?.radius ?? STORY.GOAL_RADIUS);
    const survived = this.def.survive === undefined || w.time >= this.def.survive;
    const counted = need === 0 ? true : w.collected >= need;
    const fought = this.combat.won;
    // A fight with nothing else to do (a stand: `survive`) also ends when everyone has run.
    if (this.combat.active && !this.goal && need === 0 && this.combat.routed >= this.combat.foes.length) return 'done';
    if (w.complete || (reached && survived && counted && fought && (this.goal || need > 0 || this.def.survive !== undefined || this.combat.active))) return 'done';
    void map;
    return 'running';
  }

  private updateDetection(dt: number, ctx: StoryScene): void {
    const world = ctx.world!;
    const p = ctx.player;
    let caught = false;
    this.cones.clear();
    for (const a of ctx.actors.values()) {
      // Fighters (story/combat.ts) swing instead of catching him.
      if (a.hostile && !a.foe && Math.hypot(a.gx - p.gx, a.gy - p.gy) < STORY.HOSTILE_TOUCH) caught = true;
      if (!a.sight) continue;
      const seen = canSee(world.map, a, p.gx, p.gy);
      a.alert = Math.max(0, Math.min(1, a.alert + (seen ? dt * STORY.ALERT_GAIN : -dt * STORY.ALERT_DECAY)));
      if (a.alert >= 1) caught = true;
      this.drawCone(a);
    }
    if (caught && this.def.caught) {
      const text = this.def.caughtText ?? 'SPOTTED!';
      ctx.game.audio.play('hurt');
      ctx.shake(3);
      for (const a of ctx.actors.values()) a.alert = 0;
      ctx.metrics.caught++;
      if (this.def.caught === 'restart') ctx.interrupt([card(text, 'BACK TO WHERE YOU STARTED', { color: C.red, seconds: 1.6 }), call(() => this.reset(ctx))]);
      else ctx.interrupt(this.def.caught(ctx, this.w));
    }
  }

  private drawCone(a: Actor): void {
    const s = a.sight!;
    const g = this.cones;
    const base = Math.atan2(a.facing.y, a.facing.x);
    const pts: number[] = [];
    const c0 = gridToScreen(a.gx, a.gy);
    pts.push(c0.x, c0.y);
    for (let k = 0; k <= 10; k++) {
      const ang = base - s.halfAngle + (2 * s.halfAngle * k) / 10;
      const q = gridToScreen(a.gx + Math.cos(ang) * s.range, a.gy + Math.sin(ang) * s.range);
      pts.push(q.x, q.y);
    }
    const color = a.alert > 0.05 ? 0xff3030 : 0xfff060;
    g.poly(pts).fill({ color, alpha: 0.12 + a.alert * 0.25 });
  }

  private updatePace(dt: number, ctx: StoryScene): void {
    const p = ctx.player;
    const w = this.w;
    const input = ctx.game.input;
    const mag = Math.hypot(input.move.x, input.move.y);
    const v = Math.hypot(p.vx, p.vy);
    const fwd = v > 0.2 ? (p.vx * this.forward.x + p.vy * this.forward.y) / v : 0;
    const P = STORY.PACE;
    let delta: number = P.GAIN;
    let warn: string | null = null;
    if (mag >= P.CHARGE_MAG) {
      delta = P.CHARGE;
      warn = 'DO NOT CHARGE!';
    } else if (v > 0.3 && fwd < P.BACK_DOT) {
      delta = P.TURN_BACK;
      warn = 'DO NOT TURN BACK!';
    } else if (v < P.STILL_SPEED) {
      delta = P.STILL;
      warn = 'KEEP THE PACE';
    }
    // Only companions who fell in (following him) steady his nerve, not bystanders on the path.
    const beside = (this.def.pace!.companions ?? []).filter((n) => {
      const a = ctx.actors.get(n);
      return a && a.behavior.kind === 'follow' && a.behavior.target === p && Math.hypot(a.gx - p.gx, a.gy - p.gy) < STORY.PACE.COMPANION_RANGE;
    }).length;
    delta -= Math.max(0, (this.def.pace!.pressure ?? 0) - beside * P.COMPANION_RELIEF);
    if (delta < 0 && unshakeable(ctx.state)) delta *= P.UNSHAKEABLE;
    w.nerve = Math.max(0, Math.min(1, w.nerve + delta * dt));
    this.warnT -= dt;
    if (warn && this.warnT <= 0) {
      this.warnT = P.WARN_EVERY;
      ctx.notice(warn, C.orange);
    }
    ctx.hud.setMode({ label: unshakeable(ctx.state) ? 'NERVE (UNSHAKEABLE)' : 'NERVE', value: w.nerve, color: 0xff7a1f });
    if (w.nerve <= 0) {
      ctx.metrics.nerveBroken++;
      ctx.interrupt([card('THE LINE BROKE', 'HOLD THE PACE: NO CHARGE, NO TURNING BACK', { color: C.red, seconds: 2.2 }), call(() => this.reset(ctx))]);
    }
  }

  private updateThirst(dt: number, ctx: StoryScene): void {
    const t = this.def.thirst!;
    const w = this.w;
    const p = ctx.player;
    w.thirst = Math.max(0, w.thirst - t.drain * dt);
    const T = STORY.THIRST;
    p.speedMul = (this.def.speed ?? 1) * (T.MIN_SPEED + (1 - T.MIN_SPEED) * w.thirst);
    ctx.hud.setMode({ label: 'THIRST', value: w.thirst, color: 0x5ac8ff });
    const m = this.mirage!;
    // The lake is always one hill away.
    if (Math.hypot(m.x - p.gx, m.y - p.gy) < T.MIRAGE_NEAR) {
      const dir = this.goal ? { x: this.goal.x - m.x, y: this.goal.y - m.y } : { x: -1, y: -1 };
      const l = Math.hypot(dir.x, dir.y) || 1;
      m.x += (dir.x / l) * T.MIRAGE_JUMP;
      m.y += (dir.y / l) * T.MIRAGE_JUMP;
      ctx.notice('THE LAKE MOVED', C.cyan);
    }
  }

  private updateScramble(dt: number, ctx: StoryScene): void {
    if (this.scrambleSettled) return;
    const p = ctx.player;
    if (this.goal) {
      const total = Math.hypot(this.goal.x - this.start0.x, this.goal.y - this.start0.y) || 1;
      const left = Math.hypot(this.goal.x - p.gx, this.goal.y - p.gy);
      if (left / total < STORY.SCRAMBLE.SETTLE_AT) {
        this.scrambleSettled = true;
        this.scrambleAngle = 0;
        ctx.notice('THE CONTROLS SETTLE', C.green);
        return;
      }
    }
    this.scrambleT -= dt;
    if (this.scrambleT <= 0) {
      this.scrambleT = STORY.SCRAMBLE.EVERY;
      const options = [Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI * 0.75];
      this.scrambleAngle = options[Math.floor(Math.random() * options.length)]!;
      ctx.notice('THE CONTROLS SCRAMBLE', '#b070ff');
      ctx.game.audio.play('glitch');
    }
  }

  private updateFire(dt: number, ctx: StoryScene): void {
    const f = this.def.fire!;
    const world = ctx.world!;
    const map = world.map;
    if (!this.fireOn) {
      if (!f.startAfter(this.w)) return;
      this.fireOn = true;
      const at = ctx.marker(f.from);
      this.ignite(ctx, Math.floor(at.x), Math.floor(at.y));
      ctx.interrupt([card('FIRE!', 'A FIRE EATS A GREAT PART OF THE CITY. RUN!', { color: C.orange, seconds: 2 })]);
      ctx.game.audio.play('siren');
      return;
    }
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireT = f.spread;
      const burning = [...this.fire.keys()];
      for (let n = 0; n < STORY.FIRE.PER_TICK && burning.length; n++) {
        const k = burning[Math.floor(Math.random() * burning.length)]!;
        const i = k % map.width;
        const j = (k - i) / map.width;
        const [di, dj] = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ][Math.floor(Math.random() * 4)]!;
        this.ignite(ctx, i + di!, j + dj!);
      }
    }
    // The frame (0-2) from the time and the flame's screen x, which is negative left of the map's
    // centre line: the remainder is taken positive (a negative one asked for 'flame_-1').
    for (const s of this.fire.values()) s.texture = textures.get(spriteName('flame', Math.floor((((ctx.time * 8 + s.x) % 3) + 3) % 3)));
    const p = ctx.player;
    const here = map.index(Math.floor(p.gx), Math.floor(p.gy));
    if (this.fire.has(here) && p.state !== 'hurt') {
      p.knockback(this.start0.x - p.gx, this.start0.y - p.gy, STORY.FIRE.KNOCKBACK);
      p.startAction('hurt', STORY.FIRE.HURT_TIME);
      ctx.notice('HOT!', C.red);
      ctx.game.audio.play('hurt');
    }
  }

  private ignite(ctx: StoryScene, i: number, j: number): void {
    const map = ctx.world!.map;
    if (!map.isWalkable(i, j)) return;
    if (this.goal && Math.floor(this.goal.x) === i && Math.floor(this.goal.y) === j) return;
    const k = map.index(i, j);
    if (this.fire.has(k)) return;
    const s = new Sprite(textures.get(spriteName('flame', 0)));
    const p = gridToScreen(i + 0.5, j + 0.5);
    s.position.set(p.x, p.y + 4);
    this.deco.addChild(s);
    this.fire.set(k, s);
  }

  private drawGoal(ctx: StoryScene): void {
    const r = this.ring;
    r.clear();
    this.arrow.clear();
    const targets: Point[] = [];
    if (this.goal && !this.def.goal?.hidden) targets.push(this.goal);
    if (this.mirage) {
      const m = gridToScreen(this.mirage.x, this.mirage.y);
      r.ellipse(m.x, m.y, 40, 16).fill({ color: 0x5ac8ff, alpha: 0.35 + 0.1 * Math.sin(ctx.time * 3) });
      r.ellipse(m.x - 6, m.y - 3, 18, 5).fill({ color: 0xd8f4ff, alpha: 0.4 });
    }
    if (!targets.length && !this.goal && this.pickups.length) {
      // Point to the nearest pickup.
      const p = ctx.player;
      let best = this.pickups[0]!;
      for (const e of this.pickups) if (Math.hypot(e.gx - p.gx, e.gy - p.gy) < Math.hypot(best.gx - p.gx, best.gy - p.gy)) best = e;
      targets.push({ x: best.gx, y: best.gy });
    }
    // Spots (a person to hear, a horse to feed, an empty berth, a thing to pick up): a ring on
    // the ground, so the place is always visible.
    for (const e of this.pickups) {
      if (e.def.kind !== 'spot') continue;
      const s = gridToScreen(e.gx, e.gy);
      const pulse = 7 + Math.sin(ctx.time * 5 + e.gx) * 1.5;
      r.ellipse(s.x, s.y, pulse * 1.6, pulse * 0.8).stroke({ width: 1, color: 0xfff36a, alpha: 0.85 });
      r.ellipse(s.x, s.y, pulse * 0.9, pulse * 0.45).fill({ color: 0xfff36a, alpha: 0.18 });
    }
    for (const t of targets) {
      const s = gridToScreen(t.x, t.y);
      if (t === this.goal) {
        const pulse = 10 + Math.sin(ctx.time * 5) * 2;
        r.ellipse(s.x, s.y, pulse * 1.6, pulse * 0.8).stroke({ width: 1, color: 0xfff36a, alpha: 0.9 });
      }
      // Edge arrow when the target is off-screen.
      const cam = ctx.world!.camera;
      const vx = s.x - (cam.x - ctx.w / 2);
      const vy = s.y - (cam.y - ctx.h / 2);
      if (vx < 0 || vy < 70 || vx > ctx.w || vy > ctx.h - 20) {
        const cx = ctx.w / 2;
        const cy = ctx.h / 2;
        const ang = Math.atan2(vy - cy, vx - cx);
        const ax = Math.max(14, Math.min(ctx.w - 14, cx + Math.cos(ang) * ctx.w));
        const ay = Math.max(80, Math.min(ctx.h - 70, cy + Math.sin(ang) * ctx.h));
        const tip = { x: ax + Math.cos(ang) * 6, y: ay + Math.sin(ang) * 6 };
        const l = { x: ax + Math.cos(ang + 2.5) * 6, y: ay + Math.sin(ang + 2.5) * 6 };
        const rr = { x: ax + Math.cos(ang - 2.5) * 6, y: ay + Math.sin(ang - 2.5) * 6 };
        if (Math.floor(ctx.time * 3) % 3 !== 0) this.arrow.poly([tip.x, tip.y, l.x, l.y, rr.x, rr.y]).fill(0xfff36a);
      }
    }
  }

  /** Autopilot: reach pickups and the goal, keep out of sight, away from hostiles and fire. */
  pilot(_dt: number, ctx: StoryScene, pl: Autopilot): void {
    const world = ctx.world;
    if (!world) return;
    const hint = this.def.pilot?.(ctx, this.w, pl) ?? null;
    // Space: the scene's own action, whatever mode the action button is in.
    if (hint?.act) pl.every(ctx, 'walk-act', 0.35, 'pee');
    const fight = this.combat.active ? this.pilotFight(ctx, pl) : { target: null, guard: false };
    this.pilotMove(ctx, pl, hint, fight);
    // After the movement (which sets the override): the shield.
    if (fight.guard && ctx.game.input.override) ctx.game.input.override.guard = true;
  }

  private pilotMove(ctx: StoryScene, pl: Autopilot, hint: PilotHint | null, fight: { target: Point | null; guard: boolean }): void {
    const world = ctx.world!;
    const p = ctx.player;
    let target: Point | null = hint?.target ?? fight.target;
    if (!target && this.pickups.length) {
      let best = this.pickups[0]!;
      for (const e of this.pickups) if (Math.hypot(e.gx - p.gx, e.gy - p.gy) < Math.hypot(best.gx - p.gx, best.gy - p.gy)) best = e;
      target = { x: best.gx, y: best.gy };
    }
    if (!target && this.goal) target = this.goal;
    if (!target) return;
    if (hint?.hold && Math.hypot(target.x - p.gx, target.y - p.gy) < 0.6) return;
    const map = world.map;
    const guards = [...ctx.actors.values()].filter((a) => a.sight);
    // Foes he is going for are not obstacles.
    const hostiles = [...ctx.actors.values()].filter((a) => a.hostile && !(fight.target && a.foe));
    const fire = this.fire;
    const D = STORY.PILOT.DANGER;
    const danger = (i: number, j: number): number => {
      if (fire.has(map.index(i, j))) return Infinity;
      let d = 0;
      for (const n of [map.index(i + 1, j), map.index(i - 1, j), map.index(i, j + 1), map.index(i, j - 1)]) if (fire.has(n)) d += D.NEAR_FIRE;
      for (const h of hostiles) {
        const r = Math.hypot(h.gx - (i + 0.5), h.gy - (j + 0.5));
        if (r < D.HOSTILE_RADIUS) d += (D.HOSTILE_RADIUS - r) * D.HOSTILE_COST;
      }
      for (const g of guards) if (canSee(map, g, i + 0.5, j + 0.5)) d += D.SEEN;
      return d;
    };
    const run = !this.def.pace && !this.def.noRun && !fight.guard && (hostiles.length > 0 || this.fireOn);
    const arrive = hint?.hold ? 0.5 : fight.target ? COMBAT.PILOT.CLOSE : 0.3;
    pl.navigate(ctx, target, { run, danger, scramble: this.scrambleAngle, cautious: guards.length > 0, arrive });
  }

  /**
   * Autopilot in a fight: go for the nearest foe while some still have to be routed, swing (or
   * bark) when one is in reach, and raise the shield when a swing is coming (if it saw it: skill).
   */
  private pilotFight(ctx: StoryScene, pl: Autopilot): { target: Point | null; guard: boolean } {
    const p = ctx.player;
    const c = this.combat;
    const knight = ctx.knighted;
    const active = c.foes.filter((a) => a.foe && !a.foe.routed);
    let nearest: Actor | null = null;
    let nd = Infinity;
    for (const a of active) {
      const d = Math.hypot(a.gx - p.gx, a.gy - p.gy);
      if (d < nd) {
        nd = d;
        nearest = a;
      }
    }
    let guard = false;
    for (const a of active) {
      const f = a.foe!;
      if (f.windup <= 0) {
        this.reacts.delete(a);
        continue;
      }
      if (!this.reacts.has(a)) this.reacts.set(a, pl.random() < COMBAT.PILOT.GUARD_REACT * (0.5 + 0.5 * pl.policy.skill));
      if (knight && this.reacts.get(a) && Math.hypot(a.gx - p.gx, a.gy - p.gy) < COMBAT.FOE.REACH + 0.4) guard = true;
    }
    if (nearest && !guard) {
      const reach = knight ? COMBAT.SWORD.RANGE * 0.9 : COMBAT.BARK.RADIUS * 0.8;
      // Against a foe who parries, strike only when he is open.
      const open = !this.def.fight?.parry || isOpen(nearest.foe!);
      if (nd <= reach && (!knight || open)) pl.every(ctx, 'fight-hit', COMBAT.PILOT.STRIKE_EVERY, knight ? 'strike' : 'bark');
    }
    const chasing = c.routed < c.need && nearest !== null;
    return { target: chasing ? { x: nearest!.gx, y: nearest!.gy } : null, guard };
  }

  stop(ctx: StoryScene): void {
    this.combat.stop(ctx);
    ctx.setControls(false);
    ctx.hud.setMode(null);
    ctx.player.speedMul = 1;
    ctx.player.noRun = false;
    for (const e of this.pickups) ctx.world?.removeEntity(e);
    this.pickups = [];
    this.deco.destroy({ children: true });
    this.arrow.destroy();
  }
}

export function walk(def: WalkDef): Step {
  return new WalkStep(def);
}
