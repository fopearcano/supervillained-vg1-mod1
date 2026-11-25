import { Sprite } from 'pixi.js';
import { textures } from '../core/assets';
import { animationDuration } from '../assets/animationTiming';
import { CHARACTERS, spriteName, type AnimName, type CharacterKey } from '../assets/manifest';
import { COMBAT, PLAYER } from '../config';
import { Energy, type EnergyEvent } from '../systems/needs';
import { dirFromGridVector, dirToGridVector, screenDirToGrid, type Dir8 } from '../iso/projection';
import type { GameMap } from '../world/map';
import { Ground } from '../world/tiles';
import { CharacterAnimator, Entity } from './entity';

/**
 * Zampanò's action states. 'free' = controlled by the player.
 * Some actions keep control (bark, eat), others lock movement for their duration.
 */
export type ZState = 'free' | 'pee' | 'poop' | 'bark' | 'eat' | 'fetch' | 'hurt' | 'scared' | 'drink' | 'exit';

const LOCKS_MOVEMENT: Record<ZState, boolean> = {
  free: false,
  bark: false,
  eat: false,
  pee: true,
  poop: true,
  fetch: true,
  hurt: true,
  /** Frozen with fright (the band's ambush in the Green Zone). */
  scared: true,
  drink: true,
  exit: true,
};

const STATE_ANIM: Partial<Record<ZState, AnimName>> = {
  pee: 'pee',
  poop: 'poop',
  bark: 'bark',
  eat: 'eat',
  fetch: 'fetch',
  hurt: 'hurt',
  scared: 'hurt',
  drink: 'eat',
};

/** Terrain speed multipliers. */
const TERRAIN_SPEED: Partial<Record<Ground, number>> = {
  [Ground.TallGrass]: 0.85,
  [Ground.Water]: 0.8,
};
const BUSH_SPEED = 0.7;

export class Zampano extends Entity {
  readonly animator: CharacterAnimator;
  readonly shadow: Sprite;
  /** Grid-space velocity (tiles/s). */
  vx = 0;
  vy = 0;
  facing: Dir8 = 'N';
  state: ZState = 'free';
  stateTime = 0;
  stateDuration = 0;
  running = false;
  /** Extra velocity applied by the world this step (e.g. ball magnet), tiles/s. */
  pushX = 0;
  pushY = 0;
  /** Knockback velocity, decays over time. */
  knockX = 0;
  knockY = 0;
  invulnerable = 0;
  /** Story: movement speed multiplier (bogs, thirst...). */
  speedMul = 1;
  /** Story: walking pace only (nerve scenes). */
  noRun = false;
  /** Running spends energy; empty = no running until it recovers (see ENERGY). */
  readonly energy = new Energy();
  /** What the energy meter did this step ('empty' when he just got tired). */
  energyEvent: EnergyEvent = null;
  /** RUN is held (true), or a script makes him run without spending energy ('scripted'). */
  private runWanted: boolean | 'scripted' = false;
  /** Squash & stretch spring (positive = stretched tall). */
  private squash = 0;
  private squashVel = 0;
  /** Scripted run direction while fetching. */
  private fetchDir = { x: 0, y: 0 };
  private intentX = 0;
  private intentY = 0;
  /** Seconds at rest (for seated idle and sniffing). */
  private idleTime = 0;

  constructor(gx: number, gy: number, skin: CharacterKey = 'zampano') {
    super();
    this.animator = new CharacterAnimator(skin);
    this.shadow = new Sprite(textures.get(spriteName('shadow')));
    this.shadow.alpha = 0.9;
    this.view.addChild(this.shadow, this.animator.sprite);
    this.setPosition(gx, gy);
    this.bounds = { x: -15, y: -32, w: 30, h: 35 };
  }

  /** Swaps the costume (plain, rag cross, knight). */
  setSkin(skin: CharacterKey): void {
    this.animator.key = skin;
    this.animator.play(this.animator.anim, this.facing, true);
    this.animator.speed = 1;
    this.animator.update(0);
  }

  /** The shield is up (story fights): slower, no running, facing held (story/combat.ts). */
  guarding = false;

  get controllable(): boolean {
    return !LOCKS_MOVEMENT[this.state];
  }

  get moving(): boolean {
    return Math.hypot(this.vx, this.vy) > 0.25;
  }

  /**
   * Movement intent from the joystick/keyboard, in SCREEN space (magnitude 0..1), and whether
   * RUN is held. Scripted runs ('scripted') don't spend energy.
   */
  setIntent(mx: number, my: number, run: boolean | 'scripted' = false): void {
    this.intentX = mx;
    this.intentY = my;
    this.runWanted = run;
  }

  /** RUN would work now: not a walking-pace scene and not tired. */
  get canRun(): boolean {
    return !this.noRun && this.energy.canRun;
  }

  startAction(state: ZState, duration: number): void {
    this.state = state;
    this.stateTime = 0;
    this.stateDuration = duration;
    const anim = STATE_ANIM[state];
    if (anim) this.animator.play(anim, this.facing, true);
    if (state === 'fetch') {
      const g = dirToGridVector(this.facing);
      this.fetchDir = { x: g.x, y: g.y };
    }
  }

  /** Damped-spring squash: amount > 0 stretches, < 0 squashes. */
  bump(amount: number): void {
    this.squashVel += amount * 30;
  }

  knockback(dx: number, dy: number, speed: number): void {
    const len = Math.hypot(dx, dy) || 1;
    this.knockX = (dx / len) * speed;
    this.knockY = (dy / len) * speed;
  }

  /**
   * Bounced off something solid that is not on the map (someone standing in a gap): the motion
   * into it stops and he is knocked back along (nx, ny), the way out, faster than he can run.
   */
  bounce(nx: number, ny: number): void {
    const len = Math.hypot(nx, ny) || 1;
    const ux = nx / len;
    const uy = ny / len;
    const into = this.vx * ux + this.vy * uy;
    if (into < 0) {
      this.vx -= into * ux;
      this.vy -= into * uy;
    }
    this.knockback(ux, uy, PLAYER.RUN_SPEED * PLAYER.BOUNCE);
  }

  face(dir: Dir8): void {
    this.facing = dir;
    this.animator.dir = dir;
  }

  updateMovement(dt: number, map: GameMap): void {
    this.stateTime += dt;
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.state !== 'free' && this.stateTime >= this.stateDuration) this.state = 'free';

    // Desired velocity
    let tx = 0;
    let ty = 0;
    this.running = false;
    if (this.controllable) {
      const mag = Math.min(1, Math.hypot(this.intentX, this.intentY));
      if (mag > 0.01) {
        const dir = screenDirToGrid(this.intentX, this.intentY);
        this.running = !this.guarding && (this.runWanted === 'scripted' || (this.runWanted && this.canRun));
        const guard = this.guarding ? COMBAT.SHIELD.SPEED : 1;
        const speed = (this.running ? PLAYER.RUN_SPEED : PLAYER.WALK_SPEED * Math.min(1, mag / 0.55)) * this.speedMul * guard;
        const terrain = this.terrainFactor(map);
        tx = dir.x * speed * terrain;
        ty = dir.y * speed * terrain;
      }
    } else if (this.state === 'fetch') {
      // Run out and come back: direction flips halfway through.
      const half = this.stateTime < this.stateDuration * 0.5 ? 1 : -1;
      tx = this.fetchDir.x * PLAYER.RUN_SPEED * 0.9 * half;
      ty = this.fetchDir.y * PLAYER.RUN_SPEED * 0.9 * half;
      this.running = true;
    }
    const rate = Math.hypot(tx, ty) > Math.hypot(this.vx, this.vy) ? PLAYER.ACCEL : PLAYER.DECEL;
    const k = 1 - Math.exp(-rate * dt);
    this.vx += (tx - this.vx) * k;
    this.vy += (ty - this.vy) * k;

    // Knockback decays
    const kd = Math.exp(-9 * dt);
    this.knockX *= kd;
    this.knockY *= kd;

    const mx = (this.vx + this.pushX + this.knockX) * dt;
    const my = (this.vy + this.pushY + this.knockY) * dt;
    this.pushX = 0;
    this.pushY = 0;
    if (mx !== 0 || my !== 0) {
      const r = map.moveCircle(this.gx, this.gy, mx, my, PLAYER.RADIUS);
      this.gx = r.x;
      this.gy = r.y;
    }

    // Energy: spent only by running the player asked for; recovers otherwise.
    const activity = !this.moving ? 'idle' : this.running && this.runWanted === true ? 'run' : 'walk';
    this.energyEvent = this.energy.update(dt, activity);

    // Facing follows the velocity (but not while knocked back, nor behind a raised shield).
    if (Math.hypot(this.vx, this.vy) > 0.3 && this.state !== 'hurt' && !this.guarding) {
      const d = dirFromGridVector(this.vx, this.vy, this.facing);
      if (this.state === 'fetch' || this.controllable) this.facing = d;
    }

    this.updateAnimation(dt);
  }

  private terrainFactor(map: GameMap): number {
    const i = Math.floor(this.gx);
    const j = Math.floor(this.gy);
    const prop = map.propAt(i, j);
    if (prop && prop.kind === 'bush') return BUSH_SPEED;
    return TERRAIN_SPEED[map.groundAt(i, j)] ?? 1;
  }

  private updateAnimation(dt: number): void {
    const speed = Math.hypot(this.vx, this.vy);
    const hasSeatedIdle = CHARACTERS[this.animator.key].anims.sit !== undefined;
    let anim: AnimName;
    const stateAnim = STATE_ANIM[this.state];
    if (stateAnim && this.state !== 'free') {
      anim = stateAnim;
      // Eating/barking while walking keeps the legs moving.
      if ((this.state === 'eat' || this.state === 'bark') && speed > 0.4 && this.stateTime > 0.2) anim = this.running ? 'run' : 'walk';
    } else if (speed > PLAYER.WALK_SPEED * 1.15) anim = 'run';
    else if (speed > 0.25) anim = 'walk';
    // Standing still while out of breath (energy emptied): panting.
    else if (this.energy.exhausted) anim = 'tired';
    else {
      const phase = Math.floor(this.idleTime / PLAYER.IDLE_PHASE_TIME);
      if (hasSeatedIdle) anim = phase === 0 ? 'idle' : phase % 2 === 1 ? 'sit' : 'sniff';
      else anim = phase % 2 === 1 ? 'sniff' : 'idle';
    }
    // Rest counts from the end of an action too (a pee, a bark): he stands, then sits.
    this.idleTime = speed > 0.25 || this.state !== 'free' ? 0 : this.idleTime + dt;
    this.animator.play(anim, this.facing);
    const def = this.animator.definition;
    // Fit the authored holds to the existing action timer, including the final standing pose.
    if (anim === stateAnim && def.frameDurationsMs && this.stateDuration > 0) {
      this.animator.speed = animationDuration(def) / this.stateDuration;
    } else {
      this.animator.speed = anim === 'walk' ? Math.max(0.6, speed / PLAYER.WALK_SPEED) : 1;
    }
    this.animator.update(dt);

    // Squash & stretch spring
    const stiffness = 240;
    const damping = 14;
    this.squashVel += (-stiffness * this.squash - damping * this.squashVel) * dt;
    this.squash += this.squashVel * dt;
    const s = Math.max(-0.35, Math.min(0.35, this.squash));
    this.animator.sprite.scale.set(1 - s * 0.6, 1 + s);
    // Hurt blink
    this.animator.sprite.alpha = this.invulnerable > 0 && Math.floor(this.invulnerable * 12) % 2 === 0 ? 0.35 : 1;
    // Hurt: red. Scared: pale, and he trembles on the spot.
    this.animator.sprite.tint = this.state === 'hurt' ? 0xff8080 : this.state === 'scared' ? 0xd4e0ff : 0xffffff;
    this.animator.sprite.x = this.state === 'scared' ? (Math.floor(this.stateTime * 26) % 2 === 0 ? 1 : -1) : 0;
  }
}
