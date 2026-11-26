import { Sprite } from 'pixi.js';
import { COMBAT } from '../config';
import type { Foe } from '../systems/combat';
import { textures } from '../core/assets';
import { CHARACTERS, spriteName, type AnimName, type CharacterKey } from '../assets/manifest';
import { animationDuration } from '../assets/animationTiming';
import { dirFromGridVector, dirToGridVector, type Dir8 } from '../iso/projection';
import { fleeDirection } from '../systems/threatLogic';
import type { GameMap } from '../world/map';
import { CharacterAnimator, Entity } from './entity';

/** Figures that are not animals: drawn from single sprites. */
export type SpecialFigure = 'legs' | 'fortune' | 'falcon' | 'stag';
export type Who = CharacterKey | SpecialFigure;

export interface Point {
  x: number;
  y: number;
}

export type Behavior =
  | { kind: 'idle'; face?: 'player' | Dir8 }
  | { kind: 'patrol'; points: Point[]; speed: number; pause?: number }
  | { kind: 'chase'; speed: number; radius: number; home?: Point; leash?: number; stopAt?: number }
  | { kind: 'flee'; speed: number; radius: number }
  | { kind: 'follow'; target?: Entity; distance: number; speed: number; side?: number }
  | { kind: 'wander'; speed: number; center: Point; radius: number }
  | { kind: 'flail'; speed: number; center: Point; radius: number }
  | { kind: 'goto'; to: Point; speed: number; run?: boolean }
  | { kind: 'fly'; speed: number; keepAway: number; center: Point; radius: number };

export interface Sight {
  range: number;
  /** Half-angle of the cone (radians). */
  halfAngle: number;
}

const SPECIAL_FRAMES: Record<SpecialFigure, number> = { legs: 4, fortune: 2, falcon: 2, stag: 1 };

export class Actor extends Entity {
  readonly animator: CharacterAnimator | null = null;
  readonly sprite: Sprite;
  behavior: Behavior = { kind: 'idle' };
  /** Grid-space facing (unit vector). */
  facing: Point = { x: 0, y: 1 };
  sight: Sight | null = null;
  /** Touching Zampanò counts as being caught (stealth / evasion scenes). */
  hostile = false;
  /** Detection level 0..1 (sight cones fill it). */
  alert = 0;
  /** In a fight (story/combat.ts): HP, stagger, swing. Null for everyone else. */
  foe: Foe | null = null;
  /** Pushed back by a blow or a bark (tiles/s, decaying). */
  private knockX = 0;
  private knockY = 0;
  /** Seconds left of the red flash of a blow. */
  private hitFlash = 0;
  /** Arrived at a 'goto' target. */
  arrived = false;
  speedScale = 1;
  private patrolIndex = 0;
  private pauseLeft = 0;
  private wanderTarget: Point | null = null;
  private think = 0;
  private fleeDir: Point = { x: 0, y: 0 };
  private time = Math.random() * 10;
  private readonly special: SpecialFigure | null;
  private radius = 0.25;
  private emoteLeft = 0;
  private emoteAnim: AnimName = 'bark';
  private actionLocksMovement = false;
  private idleSeconds = 0;

  constructor(
    readonly name: string,
    readonly who: Who,
    gx: number,
    gy: number,
  ) {
    super();
    const shadow = new Sprite(textures.get(spriteName(who === 'stag' || who === 'legs' ? 'shadowBig' : 'shadow')));
    this.view.addChild(shadow);
    if (who === 'legs' || who === 'fortune' || who === 'falcon' || who === 'stag') {
      this.special = who;
      this.sprite = new Sprite(textures.get(spriteName(who, 0)));
      this.view.addChild(this.sprite);
      if (who === 'falcon') {
        this.z = 26;
        shadow.alpha = 0.5;
      }
      const h = who === 'legs' ? 64 : who === 'fortune' ? 66 : who === 'stag' ? 46 : 12;
      this.bounds = { x: -16, y: -h, w: 32, h: h + 4 };
      this.radius = who === 'legs' ? 0.45 : 0.3;
    } else {
      this.special = null;
      const anim = new CharacterAnimator(who);
      (this as { animator: CharacterAnimator | null }).animator = anim;
      this.sprite = anim.sprite;
      this.view.addChild(anim.sprite);
      this.bounds = { x: -15, y: -32, w: 30, h: 35 };
    }
    this.setPosition(gx, gy);
  }

  face(d: Dir8): void {
    this.facing = dirToGridVector(d);
    if (this.animator) this.animator.dir = d;
  }

  faceToward(x: number, y: number): void {
    const dx = x - this.gx;
    const dy = y - this.gy;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) return;
    this.facing = { x: dx / len, y: dy / len };
  }

  setBehavior(b: Behavior): void {
    this.behavior = b;
    this.arrived = false;
    this.patrolIndex = 0;
    this.pauseLeft = 0;
  }

  /** A blow or a bark pushes them away (tiles/s along vx, vy, decaying). */
  knock(vx: number, vy: number): void {
    this.knockX = vx;
    this.knockY = vy;
  }

  /** A short red flash (hit). */
  flash(seconds = 0.15): void {
    this.hitFlash = seconds;
  }

  /** Logic step: moves according to the behavior. */
  step(dt: number, map: GameMap, player: Entity): void {
    this.time += dt;
    if (Math.abs(this.knockX) + Math.abs(this.knockY) > 0.05) {
      const r = map.moveCircle(this.gx, this.gy, this.knockX * dt, this.knockY * dt, this.radius);
      this.gx = r.x;
      this.gy = r.y;
      const k = Math.exp(-COMBAT.FOE.KNOCK_DECAY * dt);
      this.knockX *= k;
      this.knockY *= k;
    }
    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.sprite.tint = this.hitFlash > 0 ? 0xff8080 : 0xffffff;
    }
    // A fighter staggered or swinging stands its ground, turned to him.
    if (this.foe && !this.foe.routed && (this.foe.stun > 0 || this.foe.windup > 0)) {
      if (this.foe.windup > 0) this.faceToward(player.gx, player.gy);
      this.animate(dt, false, false);
      return;
    }
    if (this.actionLocksMovement && this.emoteLeft > 0) {
      this.animate(dt, false, false);
      return;
    }
    const b = this.behavior;
    let vx = 0;
    let vy = 0;
    let running = false;
    const toward = (p: Point, speed: number, stopAt = 0.15) => {
      const dx = p.x - this.gx;
      const dy = p.y - this.gy;
      const d = Math.hypot(dx, dy);
      if (d <= stopAt) return true;
      vx = (dx / d) * speed;
      vy = (dy / d) * speed;
      return false;
    };
    const dp = Math.hypot(player.gx - this.gx, player.gy - this.gy);
    switch (b.kind) {
      case 'idle':
        if (b.face === 'player') this.faceToward(player.gx, player.gy);
        else if (b.face) this.face(b.face);
        break;
      case 'patrol': {
        if (this.pauseLeft > 0) {
          this.pauseLeft -= dt;
          // Look around while pausing.
          const a = Math.atan2(this.facing.y, this.facing.x) + Math.sin(this.time * 2) * dt * 1.5;
          this.facing = { x: Math.cos(a), y: Math.sin(a) };
          break;
        }
        const p = b.points[this.patrolIndex % b.points.length]!;
        if (toward(p, b.speed)) {
          this.patrolIndex++;
          this.pauseLeft = b.pause ?? 0.8;
        }
        break;
      }
      case 'chase': {
        const home = b.home ?? { x: this.gx, y: this.gy };
        const fromHome = Math.hypot(player.gx - home.x, player.gy - home.y);
        if (dp < b.radius && (b.leash === undefined || fromHome < b.leash)) {
          toward({ x: player.gx, y: player.gy }, b.speed, b.stopAt ?? 0.3);
          running = true;
        } else toward(home, b.speed * 0.6);
        break;
      }
      case 'flee': {
        if (dp < b.radius) {
          this.think -= dt;
          if (this.think <= 0) {
            this.think = 0.2;
            this.fleeDir = fleeDirection(map, this.gx, this.gy, player.gx, player.gy, this.fleeDir, this.radius, Math.random);
          }
          vx = this.fleeDir.x * b.speed;
          vy = this.fleeDir.y * b.speed;
          running = true;
        }
        break;
      }
      case 'follow': {
        const t = b.target ?? player;
        const dx = t.gx - this.gx;
        const dy = t.gy - this.gy;
        const d = Math.hypot(dx, dy);
        if (d > b.distance) {
          // Fall in beside the target (side offset perpendicular to the way to it).
          const side = b.side ?? 0;
          const px = d > 0 ? -dy / d : 0;
          const py = d > 0 ? dx / d : 0;
          toward({ x: t.gx + px * side - (dx / (d || 1)) * b.distance * 0.5, y: t.gy + py * side - (dy / (d || 1)) * b.distance * 0.5 }, b.speed * Math.min(1.6, d / b.distance), 0.2);
          running = d > b.distance * 2;
        }
        break;
      }
      case 'wander':
      case 'flail': {
        const fast = b.kind === 'flail';
        if (!this.wanderTarget || Math.hypot(this.wanderTarget.x - this.gx, this.wanderTarget.y - this.gy) < 0.3 || (fast && Math.random() < dt * 1.5)) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * b.radius;
          this.wanderTarget = { x: b.center.x + Math.cos(a) * r, y: b.center.y + Math.sin(a) * r };
        }
        if (fast || Math.random() > 0.002) toward(this.wanderTarget, b.speed);
        running = fast;
        break;
      }
      case 'goto':
        this.arrived = toward(b.to, b.speed);
        running = !!b.run;
        break;
      case 'fly': {
        // Always just out of reach, circling its area.
        const away = { x: this.gx - player.gx, y: this.gy - player.gy };
        const d = Math.hypot(away.x, away.y) || 1;
        let tx = this.gx;
        let ty = this.gy;
        if (d < b.keepAway) {
          tx += (away.x / d) * 2;
          ty += (away.y / d) * 2;
        } else {
          tx += Math.cos(this.time * 0.9) * 0.8;
          ty += Math.sin(this.time * 0.9) * 0.8;
        }
        const fromC = Math.hypot(tx - b.center.x, ty - b.center.y);
        if (fromC > b.radius) {
          tx = b.center.x + ((tx - b.center.x) / fromC) * b.radius;
          ty = b.center.y + ((ty - b.center.y) / fromC) * b.radius;
        }
        const dx = tx - this.gx;
        const dy = ty - this.gy;
        const l = Math.hypot(dx, dy);
        if (l > 0.05) {
          this.gx += (dx / l) * Math.min(l, b.speed * dt);
          this.gy += (dy / l) * Math.min(l, b.speed * dt);
          this.facing = { x: dx / l, y: dy / l };
        }
        this.z = 24 + Math.sin(this.time * 5) * 3;
        break;
      }
    }
    vx *= this.speedScale;
    vy *= this.speedScale;
    if (b.kind !== 'fly' && (vx || vy)) {
      const r = map.moveCircle(this.gx, this.gy, vx * dt, vy * dt, this.radius);
      this.gx = r.x;
      this.gy = r.y;
      const l = Math.hypot(vx, vy);
      this.facing = { x: vx / l, y: vy / l };
    }
    this.animate(dt, Math.hypot(vx, vy) > 0.1, running);
  }

  private animate(dt: number, moving: boolean, running: boolean): void {
    const dir = dirFromGridVector(this.facing.x, this.facing.y, this.animator?.dir ?? 'S');
    if (this.animator) {
      if (this.emoteLeft > 0) {
        this.emoteLeft = Math.max(0, this.emoteLeft - dt);
        this.idleSeconds = 0;
        this.animator.play(this.emoteAnim, dir);
      } else {
        this.actionLocksMovement = false;
        // An action's own playback rate (the band's sped-up squat) ends with the action.
        this.animator.speed = 1;
        this.idleSeconds = moving ? 0 : this.idleSeconds + dt;
        const hasSit = CHARACTERS[this.animator.key].anims.sit !== undefined;
        this.animator.play(moving ? (running ? 'run' : 'walk') : hasSit && this.idleSeconds >= 3 ? 'sit' : 'idle', dir);
      }
      this.animator.update(dt);
      return;
    }
    const s = this.special!;
    const frames = SPECIAL_FRAMES[s];
    const f = s === 'legs' ? (moving ? Math.floor(this.time * 5) % frames : 0) : Math.floor(this.time * (s === 'falcon' ? 8 : 2)) % frames;
    this.sprite.texture = textures.get(spriteName(s, f));
    // Mirror figures that face left on screen.
    const sx = this.facing.x - this.facing.y;
    if (Math.abs(sx) > 0.2) this.sprite.scale.x = sx < 0 ? -1 : 1;
  }

  /** Plays a bark/hurt gesture while allowing the actor's existing movement. */
  emote(anim: 'bark' | 'hurt', seconds = 0.6): void {
    this.beginAction(anim, seconds, false);
  }

  /** Plays an authored action in place, then resumes the actor's behavior.
   * One-shots use their complete clip duration by default; loops play one cycle.
   */
  playAction(anim: AnimName, seconds?: number): void {
    if (!this.animator) return;
    const clip = CHARACTERS[this.animator.key].anims[anim];
    if (!clip) return;
    this.beginAction(anim, seconds ?? animationDuration(clip), true);
  }

  private beginAction(anim: AnimName, seconds: number, lockMovement: boolean): void {
    if (!this.animator || !CHARACTERS[this.animator.key].anims[anim]) return;
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.emoteAnim = anim;
    this.emoteLeft = seconds;
    this.actionLocksMovement = lockMovement;
    this.idleSeconds = 0;
    this.animator.speed = 1;
    this.animator.play(anim, this.animator.dir, true);
  }
}
