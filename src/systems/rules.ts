import { BLADDER, DIGESTION, ENERGY, HUNGER, LIVES, PLAYER, POOP, TREAT } from '../config';
import type { Emitter, GameEvents } from '../core/events';
import type { Input } from '../core/input';
import { PoopPile, Treat } from '../entities/items';
import type { Entity } from '../entities/entity';
import type { Zampano } from '../entities/zampano';
import { dirFromGridVector } from '../iso/projection';
import type { LevelDef } from '../world/level';
import type { GameMap } from '../world/map';
import { Bladder, Digestion, Hunger, type Activity } from './needs';
import { placeTreats } from './placement';
import { newStats, starsFromHealth, type LevelStats } from './scoring';

/** What the rules need from the scene. */
export interface WorldAccess {
  readonly map: GameMap;
  readonly player: Zampano;
  readonly events: Emitter<GameEvents>;
  addEntity(e: Entity): void;
  removeEntity(e: Entity): void;
}

/** A pee in progress: the cleaned area spreads outward like paint. */
interface ActivePee {
  x: number;
  y: number;
  radius: number;
  elapsed: number;
  duration: number;
}

export type RunState = 'playing' | 'complete' | 'gameover';

/**
 * Core gameplay rules: hunger, treats, digestion & poops, bladder & pees, drinking,
 * pollution/cleaning, lives, scoring, exit. Threats (cats, balls, Bagnaskiz) plug in via hooks.
 */
export class Rules {
  readonly stats: LevelStats;
  readonly hunger = new Hunger();
  readonly digestion = new Digestion();
  readonly bladder = new Bladder();
  readonly treats: Treat[] = [];
  readonly poops: PoopPile[] = [];
  private readonly pees: ActivePee[] = [];
  /** Props already marked: the marking bonus is paid once per tree/pole/bush. */
  private readonly marked = new Set<number>();
  /** Was Zampanò standing in water on the previous step (for the splash event). */
  private inWater = false;
  state: RunState = 'playing';
  /** Extra per-step hooks (threat systems). */
  readonly hooks: Array<(dt: number) => void> = [];
  /** Seconds since the level ended. */
  private exitTime = 0;

  constructor(
    private readonly world: WorldAccess,
    readonly level: LevelDef,
    /** Lives at the start (the title's counter; LIVES.START by default). */
    startLives: number = LIVES.START,
  ) {
    this.stats = newStats(startLives);
    for (const p of placeTreats(world.map, level.spawns.treats, level.seed)) {
      const t = new Treat(p.x, p.y);
      this.treats.push(t);
      world.addEntity(t);
    }
  }

  get health(): number {
    return this.world.map.health();
  }

  get stars(): number {
    return starsFromHealth(this.health);
  }

  addScore(amount: number, x: number, y: number, label?: string): void {
    this.stats.score += amount;
    this.world.events.emit('score', { x, y, amount, label });
  }

  update(dt: number, input: Input): void {
    const { player, map } = this.world;
    if (this.state !== 'playing') {
      this.exitTime += dt;
      player.setIntent(0, 0);
      player.updateMovement(dt, map);
      return;
    }
    this.stats.time += dt;

    if (input.consume('pee')) this.tryPee();

    player.energy.recovery = this.hunger.value <= HUNGER.LOW_WARNING ? ENERGY.HUNGRY_RECOVERY : 1;
    player.setIntent(input.move.x, input.move.y, input.runHeld);
    player.updateMovement(dt, map);
    if (player.energyEvent === 'empty') this.world.events.emit('tired', { x: player.gx, y: player.gy });

    // Needs
    const activity: Activity = !player.moving ? 'idle' : player.running ? 'run' : 'walk';
    if (this.hunger.update(dt, activity)) this.loseLife();

    // When the warning expires the poop is due; it happens as soon as Zampanò is free.
    this.digestion.update(dt);
    if (this.digestion.due && player.state === 'free') this.doPoop();

    this.bladder.update(dt);
    this.checkDrink();
    this.checkTreats();

    // Pees spread, poops spread, poops get neutralized.
    for (let k = this.pees.length - 1; k >= 0; k--) {
      const p = this.pees[k]!;
      p.elapsed += dt;
      const t = Math.min(1, p.elapsed / p.duration);
      const r = p.radius * (1 - (1 - t) * (1 - t));
      map.clean(p.x, p.y, r);
      for (const poop of this.poops) {
        if (!poop.cleaned && Math.hypot(poop.gx - p.x, poop.gy - p.y) <= r) {
          poop.cleaned = true;
          this.addScore(POOP.CLEAN_SCORE, poop.gx, poop.gy, 'CLEAN!');
          this.world.events.emit('poopCleaned', { x: poop.gx, y: poop.gy, score: POOP.CLEAN_SCORE });
        }
      }
      if (t >= 1) this.pees.splice(k, 1);
    }
    for (let k = this.poops.length - 1; k >= 0; k--) {
      const poop = this.poops[k]!;
      if (!poop.step(dt, map)) {
        this.poops.splice(k, 1);
        this.world.removeEntity(poop);
      }
    }

    for (const h of this.hooks) h(dt);

    // Exit
    if (Math.hypot(player.gx - map.exit.x, player.gy - map.exit.y) < 0.8) {
      this.state = 'complete';
      player.startAction('exit', 999);
      this.world.events.emit('levelComplete', { x: player.gx, y: player.gy });
    }
  }

  tryPee(): void {
    const { player, map } = this.world;
    if (!player.controllable || player.state === 'bark') return;
    if (!this.bladder.use()) {
      this.world.events.emit('peeEmpty', { x: player.gx, y: player.gy });
      return;
    }
    const target = map.nearestProp(player.gx, player.gy, PLAYER.MARK_DISTANCE, (p) => p.info.vertical);
    const marking = target !== null;
    if (target) {
      // Lift the leg toward the object: face it sideways.
      player.face(dirFromGridVector(target.x - player.gx, target.y - player.gy, player.facing));
    }
    const radius = marking ? BLADDER.MARK_RADIUS : BLADDER.RADIUS;
    const duration = marking ? BLADDER.MARK_TIME : BLADDER.PEE_TIME;
    player.startAction('pee', duration);
    this.stats.pees++;
    const cx = target ? (player.gx + target.x) / 2 : player.gx;
    const cy = target ? (player.gy + target.y) / 2 : player.gy;
    this.pees.push({ x: cx, y: cy, radius, elapsed: 0, duration });
    const firstMark = target !== null && !this.marked.has(target.id);
    if (target) this.marked.add(target.id);
    const score = firstMark ? BLADDER.MARK_SCORE : BLADDER.SCORE;
    if (marking) this.stats.marks++;
    this.addScore(score, player.gx, player.gy, firstMark ? 'MARKING!' : undefined);
    this.world.events.emit('pee', { x: cx, y: cy, marking, radius, score });
  }

  /**
   * A poop pile on the ground: it pollutes at once, spreads, shows on the radar and is cleaned by
   * a pee. Zampanò's own (doPoop) also count in his POOPS; the band's (systems/ambush.ts) do not.
   */
  dropPoop(x: number, y: number): PoopPile {
    const map = this.world.map;
    const surface = map.poopSurfaceAt(x, y);
    const footprint = map.poopFootprint(surface);
    const pile = new PoopPile(x, y, surface, footprint);
    this.poops.push(pile);
    this.world.addEntity(pile);
    map.stampDirt(pile.gx, pile.gy, footprint.radius, footprint.strength);
    return pile;
  }

  private doPoop(): void {
    const { player } = this.world;
    // Drop it just behind Zampanò.
    const v = { x: -Math.sign(player.vx || 0.0001) * 0.15, y: -Math.sign(player.vy || 0.0001) * 0.15 };
    const pile = this.dropPoop(player.gx + v.x, player.gy + v.y);
    const surface = pile.surface;
    player.startAction('poop', DIGESTION.SQUAT_TIME);
    player.bump(-0.25);
    this.stats.poops++;
    const next = this.digestion.done();
    this.world.events.emit('poop', { x: pile.gx, y: pile.gy, surface });
    if (next === 'warning') this.world.events.emit('digestWarning', { x: player.gx, y: player.gy });
  }

  private checkDrink(): void {
    const { player, map } = this.world;
    const onWater = map.isWaterAt(player.gx, player.gy);
    if (onWater && !this.inWater) this.world.events.emit('splash', { x: player.gx, y: player.gy });
    this.inWater = onWater;
    if (!player.controllable || !this.bladder.canDrink) return;
    const fountain = onWater ? null : map.nearestProp(player.gx, player.gy, PLAYER.DRINK_DISTANCE, (p) => p.kind === 'fountain');
    if (!onWater && !fountain) return;
    if (this.bladder.drink()) {
      if (fountain) player.face(dirFromGridVector(fountain.x - player.gx, fountain.y - player.gy, player.facing));
      player.startAction('drink', BLADDER.DRINK_TIME);
      this.world.events.emit('drink', { x: player.gx, y: player.gy });
    }
  }

  private checkTreats(): void {
    const { player } = this.world;
    for (let k = this.treats.length - 1; k >= 0; k--) {
      const t = this.treats[k]!;
      if (Math.hypot(t.gx - player.gx, t.gy - player.gy) > TREAT.PICKUP_RADIUS) continue;
      this.treats.splice(k, 1);
      this.world.removeEntity(t);
      this.hunger.feed(TREAT.HUNGER);
      this.stats.treats++;
      this.addScore(TREAT.SCORE, t.gx, t.gy);
      if (player.state === 'free') player.startAction('eat', 0.3);
      player.bump(0.22);
      this.world.events.emit('treat', { x: t.gx, y: t.gy, score: TREAT.SCORE });
      if (this.digestion.add(TREAT.DIGESTION) === 'warning') this.world.events.emit('digestWarning', { x: player.gx, y: player.gy });
    }
  }

  loseLife(): void {
    const { player } = this.world;
    if (this.state !== 'playing') return;
    this.stats.lives--;
    this.world.events.emit('lifeLost', { x: player.gx, y: player.gy, lives: this.stats.lives });
    if (this.stats.lives <= 0) {
      this.stats.lives = 0;
      this.state = 'gameover';
      player.startAction('hurt', 999);
      this.world.events.emit('gameOver', { x: player.gx, y: player.gy });
      return;
    }
    this.hunger.value = HUNGER.REFILL_ON_LIFE_LOST;
    player.startAction('hurt', 0.6);
    player.invulnerable = PLAYER.HURT_INVULN;
  }

  /** Seconds since the level ended (for end-of-level timing). */
  get endedFor(): number {
    return this.exitTime;
  }

  /** Remaining warning time (for the HUD bubble), or -1. */
  get poopWarning(): number {
    return this.digestion.warning ? this.digestion.warningLeft : this.digestion.due ? 0 : -1;
  }
}

