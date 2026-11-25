import { BAGNASKIZ, BALL, BARK, CAT } from '../config';
import type { Input } from '../core/input';
import { Rng } from '../core/rng';
import { Bagnaskiz, Ball, Cat } from '../entities/critters';
import { dirToGridVector } from '../iso/projection';
import type { LevelDef, PollutionWaveSettings } from '../world/level';
import { POLLUTION } from '../config';
import { randomSpotNear } from './placement';
import type { Rules, WorldAccess } from './rules';
import { AttackDirector, inBarkCone, magnetPull, PollutionWaveDirector } from './threatLogic';

const CAT_TINTS = [0xffffff, 0xd8d8d8, 0xfff0c0];

interface PendingHit {
  delay: number;
  fromX: number;
  fromY: number;
}

/**
 * Threats & bonuses: cats (coins), magnet balls (distraction), the "under attack" event with
 * Bagnaskiz, and Zampanò's BARK.
 */
export class Threats {
  readonly cats: Cat[] = [];
  readonly balls: Ball[] = [];
  pug: Bagnaskiz | null = null;
  readonly director: AttackDirector;
  readonly pollutionDirector: PollutionWaveDirector;
  private barkCooldown = 0;
  private catTimer: number;
  private ballTimer: number;
  private readonly rng: Rng;
  private readonly pendingHits: PendingHit[] = [];
  /**
   * True while Bagnaskiz is busy elsewhere (with his band, waiting to ambush Zampanò: see
   * systems/ambush.ts): his usual attack does not start then.
   */
  attackHeld: () => boolean = () => false;

  constructor(
    private readonly world: WorldAccess,
    private readonly rules: Rules,
    private readonly level: LevelDef,
  ) {
    const ev = level.events.underAttack;
    this.director = new AttackDirector(ev.threshold, ev.scriptedProgress);
    this.pollutionDirector = new PollutionWaveDirector(level.events.pollutionWaves);
    this.catTimer = level.spawns.cats.first;
    this.ballTimer = level.spawns.balls.first;
    this.rng = new Rng(level.seed ^ 0x5bd1e995);
  }

  get barkReadiness(): number {
    return 1 - Math.max(0, this.barkCooldown) / BARK.COOLDOWN;
  }

  update(dt: number, input: Input): void {
    const { player, map, events } = this.world;
    if (this.barkCooldown > 0) this.barkCooldown -= dt;
    // The action button (labelled BARK here) or a bark gesture / B.
    if (input.consumeAny(['action', 'bark'])) this.tryBark();

    // Delayed bark hits (the sound wave travels).
    for (let k = this.pendingHits.length - 1; k >= 0; k--) {
      const h = this.pendingHits[k]!;
      h.delay -= dt;
      if (h.delay > 0) continue;
      this.pendingHits.splice(k, 1);
      const pug = this.pug;
      if (!pug || !pug.active) continue;
      pug.hit(h.fromX, h.fromY);
      this.rules.stats.barkHits++;
      events.emit('barkHit', { x: pug.gx, y: pug.gy, hits: pug.hits });
      if (pug.state === 'flee') {
        this.rules.addScore(BAGNASKIZ.FLEE_SCORE, pug.gx, pug.gy, 'BYE PUG!');
        events.emit('bagnaskizFled', { x: pug.gx, y: pug.gy, score: BAGNASKIZ.FLEE_SCORE });
      }
    }

    this.spawn(dt);

    // Cats
    for (let k = this.cats.length - 1; k >= 0; k--) {
      const cat = this.cats[k]!;
      const alive = cat.step(dt, map, player.gx, player.gy);
      if (alive && cat.state !== 'leave' && Math.hypot(cat.gx - player.gx, cat.gy - player.gy) < CAT.TOUCH_RADIUS) {
        this.rules.stats.coins += CAT.COINS;
        this.rules.addScore(CAT.SCORE, cat.gx, cat.gy, 'MEOW!');
        events.emit('cat', { x: cat.gx, y: cat.gy, coins: CAT.COINS, score: CAT.SCORE });
        this.cats.splice(k, 1);
        this.world.removeEntity(cat);
        player.bump(0.2);
        continue;
      }
      if (!alive) {
        this.cats.splice(k, 1);
        this.world.removeEntity(cat);
      }
    }

    // Balls: magnet pull, grab → fetch.
    for (let k = this.balls.length - 1; k >= 0; k--) {
      const ball = this.balls[k]!;
      const alive = ball.step(dt);
      if (!alive) {
        this.balls.splice(k, 1);
        this.world.removeEntity(ball);
        continue;
      }
      if (ball.age > BALL.LIFETIME || !player.controllable) continue;
      const dx = ball.gx - player.gx;
      const dy = ball.gy - player.gy;
      const d = Math.hypot(dx, dy);
      if (d < BALL.GRAB_RADIUS) {
        ball.taken = true;
        player.startAction('fetch', BALL.FETCH_TIME);
        if (this.rules.hunger.lose(BALL.FETCH_HUNGER)) this.rules.loseLife();
        this.rules.stats.time += BALL.TIME_PENALTY;
        events.emit('fetch', { x: ball.gx, y: ball.gy, penalty: BALL.TIME_PENALTY });
        continue;
      }
      const pull = magnetPull(d, BALL.MAGNET_RADIUS, BALL.MAGNET_STRENGTH);
      if (pull > 0) {
        player.pushX += (dx / d) * pull;
        player.pushY += (dy / d) * pull;
      }
    }

    // Entering a new park district can open several pollution hotspots around the route. The
    // outbreaks are deterministic and placed ahead where possible, so the player can see and
    // react to them instead of being punished for ground already left behind.
    const progress = map.progressAt(player.gx, player.gy);
    for (const wave of this.pollutionDirector.update(progress)) this.startPollutionWave(wave);
    const health = map.health();
    const held = this.director.state === 'calm' && this.attackHeld();
    const signal = held ? null : this.director.update(dt, health, progress, !this.pug || this.pug.state === 'gone');
    if (signal === 'start') this.startAttack();
    else if (signal === 'end') events.emit('attackEnd', {});

    const pug = this.pug;
    if (pug) {
      const r = pug.step(dt, map, player.gx, player.gy, () => this.pickGreenTarget());
      if (r === 'bump' && player.invulnerable <= 0 && player.state !== 'exit') {
        player.knockback(player.gx - pug.gx, player.gy - pug.gy, 6);
        player.startAction('hurt', 0.35);
        events.emit('bump', { x: player.gx, y: player.gy });
        if (this.rules.hunger.lose(BAGNASKIZ.BUMP_HUNGER)) this.rules.loseLife();
      }
      if (pug.state === 'gone') {
        this.world.removeEntity(pug);
        this.pug = null;
      }
    }
  }

  private tryBark(): void {
    const { player, events } = this.world;
    if (this.barkCooldown > 0 || !player.controllable) return;
    this.barkCooldown = BARK.COOLDOWN;
    player.startAction('bark', BARK.ANIM_TIME);
    player.bump(0.18);
    const f = dirToGridVector(player.facing);
    events.emit('bark', { x: player.gx, y: player.gy, dir: player.facing });
    const pug = this.pug;
    if (pug && pug.active && inBarkCone(player.gx, player.gy, f.x, f.y, pug.gx, pug.gy, BARK.RANGE, BARK.HALF_ANGLE)) {
      const d = Math.hypot(pug.gx - player.gx, pug.gy - player.gy);
      this.pendingHits.push({ delay: d / BARK.WAVE_SPEED, fromX: player.gx, fromY: player.gy });
    }
    for (const cat of this.cats) {
      if (inBarkCone(player.gx, player.gy, f.x, f.y, cat.gx, cat.gy, BARK.RANGE * 1.3, BARK.HALF_ANGLE * 1.3)) cat.startle();
    }
  }

  private spawn(dt: number): void {
    const { player, map } = this.world;
    const sp = this.level.spawns;
    const here = map.exitDistance[map.index(Math.floor(player.gx), Math.floor(player.gy))] ?? -1;
    // Prefer spots ahead of Zampanò (closer to the exit).
    const ahead = (i: number, j: number) => {
      const d = map.exitDistance[map.index(i, j)]!;
      return here < 0 || (d >= 0 && d <= here + 1);
    };
    this.catTimer -= dt;
    if (this.catTimer <= 0) {
      this.catTimer = this.rng.range(sp.cats.interval[0], sp.cats.interval[1]);
      if (this.cats.length < sp.cats.max) {
        const spot = randomSpotNear(map, player.gx, player.gy, CAT.SPAWN_MIN_DISTANCE, CAT.SPAWN_MAX_DISTANCE, this.rng, ahead);
        if (spot) {
          const cat = new Cat(spot.x, spot.y, this.rng.pick(CAT_TINTS));
          this.cats.push(cat);
          this.world.addEntity(cat);
        }
      }
    }
    this.ballTimer -= dt;
    if (this.ballTimer <= 0) {
      this.ballTimer = this.rng.range(sp.balls.interval[0], sp.balls.interval[1]);
      if (this.balls.length < sp.balls.max) {
        const spot = randomSpotNear(map, player.gx, player.gy, BALL.SPAWN_MIN_DISTANCE, BALL.SPAWN_MAX_DISTANCE, this.rng, ahead);
        if (spot) {
          const ball = new Ball(spot.x, spot.y);
          this.balls.push(ball);
          this.world.addEntity(ball);
          this.world.events.emit('ballSpawn', { x: spot.x, y: spot.y });
        }
      }
    }
  }

  private startAttack(): void {
    const { player, map, events } = this.world;
    if (!this.pug) {
      const spot =
        randomSpotNear(map, player.gx, player.gy, BAGNASKIZ.SPAWN_DISTANCE - 2, BAGNASKIZ.SPAWN_DISTANCE, this.rng) ??
        randomSpotNear(map, player.gx, player.gy, 3, 6, this.rng);
      if (spot) {
        this.pug = new Bagnaskiz(spot.x, spot.y);
        this.pug.target = { x: player.gx, y: player.gy };
        this.world.addEntity(this.pug);
      }
    }
    events.emit('attackStart', { intensity: this.director.intensity(map.health()) });
  }

  private startPollutionWave(wave: PollutionWaveSettings): void {
    const { player, map, events } = this.world;
    const pi = Math.floor(player.gx);
    const pj = Math.floor(player.gy);
    const here = map.inBounds(pi, pj) ? map.exitDistance[map.index(pi, pj)]! : -1;
    const centers: Array<{ x: number; y: number }> = [];
    let tiles = 0;
    const accepts = (i: number, j: number) => {
      const d = map.exitDistance[map.index(i, j)]!;
      return d >= 0 && (here < 0 || d <= here + 2) && centers.every((p) => Math.hypot(p.x - i - 0.5, p.y - j - 0.5) >= wave.radius * 1.4);
    };
    for (let k = 0; k < wave.count; k++) {
      const spot =
        randomSpotNear(map, player.gx, player.gy, wave.distance[0], wave.distance[1], this.rng, accepts) ??
        randomSpotNear(map, player.gx, player.gy, wave.distance[0], wave.distance[1], this.rng, (i, j) => {
          return centers.every((p) => Math.hypot(p.x - i - 0.5, p.y - j - 0.5) >= wave.radius);
        });
      if (!spot) continue;
      centers.push(spot);
      tiles += map.stampDirt(spot.x, spot.y, wave.radius, wave.strength);
    }
    // One global cue per encounter; individual patches still appear through the dirt overlay.
    if (tiles > 0 && centers.length > 0) {
      events.emit('pollutionSurge', { ...centers[0]!, radius: wave.radius, tiles });
    }
  }

  /** The greenest spot near Zampanò: where Bagnaskiz wants to go next. */
  private pickGreenTarget(): { x: number; y: number } {
    const { player, map } = this.world;
    const pug = this.pug!;
    let best = { x: player.gx, y: player.gy };
    let bestScore = -Infinity;
    for (let k = 0; k < 14; k++) {
      const spot = randomSpotNear(map, player.gx, player.gy, 1, 6, this.rng);
      if (!spot) continue;
      let clean = 0;
      map.forTilesInRadius(spot.x, spot.y, 1.6, (idx) => {
        if (map.playable[idx] && map.dirt[idx]! < POLLUTION.CLEAN_THRESHOLD) clean++;
      });
      const score = clean - 0.15 * Math.hypot(spot.x - pug.gx, spot.y - pug.gy);
      if (score > bestScore) {
        bestScore = score;
        best = spot;
      }
    }
    return best;
  }
}
