import { AMBUSH } from '../config';
import { Rng } from '../core/rng';
import { animationDuration } from '../assets/animationTiming';
import { CHARACTERS, type CharacterKey } from '../assets/manifest';
import { Actor } from '../entities/actor';
import type { AmbushSettings } from '../world/level';
import { Ground } from '../world/tiles';
import { AmbushDirector, type AmbushSignal } from './ambushLogic';
import { randomSpotNear } from './placement';
import type { Rules, WorldAccess } from './rules';

interface Member {
  readonly key: string;
  readonly actor: Actor;
  /** Their place around Zampanò while they circle him (radians). */
  angle: number;
  /** Seconds to the next bark / the next poop while they scare him. */
  barkIn: number;
  poopIn: number;
  poopsLeft: number;
}

/** A band member's body radius for placement checks (an Actor moves as a 0.25 circle). */
const BODY = 0.3;

/** Where each one waits, around the band's spot (grid tiles): the leader in front. */
const WAIT_OFFSETS = [
  { x: 0.2, y: 0.2 },
  { x: -0.9, y: -0.4 },
  { x: 0.7, y: -0.9 },
  { x: -0.5, y: 0.9 },
];

/**
 * Bagnaskiz's band in the Green Zone walk (story 1.0): they wait half way along the route, their
 * voices come closer, and when Zampanò reaches the middle they jump in barking, frighten him,
 * poop around him and run off. The sequence is AmbushDirector (pure); this moves the band
 * (story Actors), freezes him and drops the piles (Rules.dropPoop: they pollute like his, are
 * cleaned by his pee, and are not counted as his). Effects and sounds react to the events.
 */
export class Ambush {
  readonly director: AmbushDirector;
  readonly band: Member[] = [];
  private readonly rng: Rng;

  constructor(
    private readonly world: WorldAccess,
    private readonly rules: Rules,
    readonly settings: AmbushSettings,
    seed: number,
  ) {
    this.rng = new Rng(seed ^ 0x2c1b3c6d);
    this.director = new AmbushDirector(
      { warnFrom: settings.warnFrom, at: settings.at, until: settings.until, lines: settings.voices.length },
      this.rng,
    );
    settings.band.forEach((key, k) => {
      const off = WAIT_OFFSETS[k % WAIT_OFFSETS.length]!;
      let x = settings.spot.x + off.x;
      let y = settings.spot.y + off.y;
      if (!this.clearAt(x, y)) {
        const s = this.clearSpotNear(settings.spot.x, settings.spot.y, 0.5, 2.2);
        if (s) ({ x, y } = s);
      }
      const actor = new Actor(`band-${key}`, key as CharacterKey, x, y);
      // Waiting, they watch for him (Bagnaskiz, who has the animation, sits down after a while).
      actor.setBehavior({ kind: 'idle', face: 'player' });
      world.addEntity(actor);
      this.band.push({ key, actor, angle: 0, barkIn: 0, poopIn: 0, poopsLeft: 0 });
    });
  }

  /** Bagnaskiz's usual attack must wait (he is with his band, or they have only just left). */
  get holdsAttack(): boolean {
    return this.director.holdsAttack;
  }

  /** They have shown themselves (for the radar). */
  get revealed(): boolean {
    const p = this.director.phase;
    return p === 'now' || p === 'jump' || p === 'scare' || p === 'leave';
  }

  update(dt: number): void {
    const { player, map } = this.world;
    const progress = map.progressAt(player.gx, player.gy);
    const arrived = this.band.every((m) => m.actor.arrived || this.distance(m.actor) <= AMBUSH.RING + 0.5);
    for (const s of this.director.update(dt, progress, arrived)) this.handle(s);
    const phase = this.director.phase;
    // They run at where he is now, not where he stood at the shout.
    if (phase === 'jump') for (const m of this.band) m.actor.setBehavior({ kind: 'goto', to: this.ringPoint(m.angle), speed: AMBUSH.JUMP_SPEED, run: true });
    if (phase === 'scare') this.scareStep(dt);
    if (phase === 'leave') {
      // They vanish in the second half of their run.
      const t = this.director.phaseTime / AMBUSH.LEAVE_TIME;
      for (const m of this.band) m.actor.fade = Math.max(0, Math.min(1, (1 - t) / 0.55));
    }
    for (const m of this.band) m.actor.step(dt, map, player);
  }

  /** Debug / automation (screenshot scenarios that jump around the park): no ambush. */
  skip(): void {
    for (const s of this.director.update(0, Number.POSITIVE_INFINITY, false)) this.handle(s);
  }

  private handle(s: AmbushSignal): void {
    const { player, events } = this.world;
    const lead = this.band[0];
    switch (s.kind) {
      case 'voice': {
        const line = this.settings.voices[s.line]!;
        const m = this.band.find((b) => b.key === line.who) ?? lead;
        if (m) events.emit('ambushVoice', { x: m.actor.gx, y: m.actor.gy, text: line.text, who: m.key, loud: s.loud });
        break;
      }
      case 'now': {
        if (!lead) break;
        // He took another lane: they pop out of cover a few tiles ahead of him instead.
        if (this.distance(lead.actor) > AMBUSH.REACH) this.regroupAhead();
        lead.actor.faceToward(player.gx, player.gy);
        lead.actor.emote('bark', 0.6);
        events.emit('ambushNow', { x: lead.actor.gx, y: lead.actor.gy, text: this.settings.now, who: lead.key });
        break;
      }
      case 'jump': {
        // Around him, the leader on the side he came from.
        const base = lead ? Math.atan2(lead.actor.gy - player.gy, lead.actor.gx - player.gx) : 0;
        this.band.forEach((m, k) => {
          m.angle = base + (k * Math.PI * 2) / this.band.length;
          m.actor.setBehavior({ kind: 'goto', to: this.ringPoint(m.angle), speed: AMBUSH.JUMP_SPEED, run: true });
          m.actor.emote('bark', 0.5);
        });
        events.emit('ambushJump', { x: player.gx, y: player.gy });
        break;
      }
      case 'scare': {
        player.startAction('scared', AMBUSH.SCARE_TIME);
        if (lead) player.knockback(player.gx - lead.actor.gx, player.gy - lead.actor.gy, AMBUSH.SCARE_KNOCK);
        const every = (AMBUSH.SCARE_TIME - 0.5) / Math.max(1, AMBUSH.POOPS_EACH);
        this.band.forEach((m, k) => {
          m.barkIn = k * 0.17;
          m.poopsLeft = AMBUSH.POOPS_EACH;
          m.poopIn = 0.3 + k * 0.22 + this.rng.range(0, every * 0.4);
        });
        events.emit('ambushScare', { x: player.gx, y: player.gy });
        break;
      }
      case 'leave':
        for (const m of this.band) m.actor.setBehavior({ kind: 'flee', speed: AMBUSH.LEAVE_SPEED, radius: 99 });
        events.emit('ambushLeave', { x: player.gx, y: player.gy });
        break;
      case 'done':
      case 'skipped':
        for (const m of this.band) this.world.removeEntity(m.actor);
        this.band.length = 0;
        break;
    }
  }

  /** They circle him, barking, and each poops on the way round. */
  private scareStep(dt: number): void {
    const { events } = this.world;
    const every = (AMBUSH.SCARE_TIME - 0.5) / Math.max(1, AMBUSH.POOPS_EACH);
    // Wider and wider round him: the piles end up everywhere, not in one neat ring.
    const u = Math.min(1, this.director.phaseTime / AMBUSH.SCARE_TIME);
    const radius = AMBUSH.RING + (AMBUSH.RING_WIDEN_TO - AMBUSH.RING) * u;
    for (const m of this.band) {
      m.angle += (AMBUSH.CIRCLE_SPEED / radius) * dt;
      m.actor.setBehavior({ kind: 'goto', to: this.ringPoint(m.angle, radius), speed: AMBUSH.CIRCLE_SPEED * 1.8 });
      m.barkIn -= dt;
      if (m.barkIn <= 0) {
        m.barkIn = AMBUSH.BARK_EVERY * this.rng.range(0.8, 1.2);
        m.actor.emote('bark', 0.35);
        events.emit('ambushBark', { x: m.actor.gx, y: m.actor.gy, who: m.key });
      }
      m.poopIn -= dt;
      if (m.poopsLeft > 0 && m.poopIn <= 0) {
        m.poopsLeft--;
        m.poopIn = every * this.rng.range(0.85, 1.15);
        this.poop(m);
      }
    }
  }

  /** Where they stand: on solid ground near them (never in the pond). */
  private poop(m: Member): void {
    const a = m.actor;
    let x = a.gx;
    let y = a.gy;
    if (!this.standable(Math.floor(x), Math.floor(y))) {
      const s = randomSpotNear(this.world.map, x, y, 0.3, 1.5, this.rng, (i, j) => this.standable(i, j));
      if (!s) return;
      ({ x, y } = s);
    }
    this.rules.dropPoop(x, y);
    // The squat, for whoever has it drawn (Bagnaskiz; Jack and Watson once their sheets have it):
    // the whole clip, sped up to fit, and no bark until it is over.
    const clip = CHARACTERS[m.key as CharacterKey]?.anims.poop;
    if (clip && a.animator) {
      a.playAction('poop', AMBUSH.POOP_SQUAT);
      a.animator.speed = animationDuration(clip) / AMBUSH.POOP_SQUAT;
      m.barkIn = Math.max(m.barkIn, AMBUSH.POOP_SQUAT + 0.05);
    }
    this.world.events.emit('bandPoop', { x, y, who: m.key });
  }

  /** The band appears close ahead of him, from cover, when he did not come their way. */
  private regroupAhead(): void {
    const { player, map } = this.world;
    const here = map.progressAt(player.gx, player.gy);
    const ahead = (i: number, j: number) => this.standable(i, j) && map.progressAt(i + 0.5, j + 0.5) > here;
    const d = AMBUSH.APPEAR_AT;
    const spot =
      this.clearSpotNear(player.gx, player.gy, d - 1, d + 1, ahead) ?? this.clearSpotNear(player.gx, player.gy, d - 1, d + 1);
    if (!spot) return;
    this.band.forEach((m, k) => {
      const off = WAIT_OFFSETS[k % WAIT_OFFSETS.length]!;
      const x = spot.x + off.x;
      const y = spot.y + off.y;
      // Never half inside a hedge or a tree: they could not move again.
      if (this.clearAt(x, y)) m.actor.setPosition(x, y);
      else m.actor.setPosition(spot.x, spot.y);
    });
  }

  /** A band member fits here: solid dry ground, its body clear of hedges, trees and water. */
  private clearAt(x: number, y: number): boolean {
    return this.standable(Math.floor(x), Math.floor(y)) && !this.world.map.circleBlocked(x, y, BODY);
  }

  /** A spot near (x, y) where a band member fits (randomSpotNear checks only the tile). */
  private clearSpotNear(x: number, y: number, minD: number, maxD: number, accept = (i: number, j: number) => this.standable(i, j)): { x: number; y: number } | null {
    for (let k = 0; k < 6; k++) {
      const s = randomSpotNear(this.world.map, x, y, minD, maxD, this.rng, accept);
      if (s && this.clearAt(s.x, s.y)) return s;
    }
    return null;
  }

  private ringPoint(angle: number, radius: number = AMBUSH.RING): { x: number; y: number } {
    const { player } = this.world;
    return { x: player.gx + Math.cos(angle) * radius, y: player.gy + Math.sin(angle) * radius };
  }

  private distance(a: Actor): number {
    const { player } = this.world;
    return Math.hypot(a.gx - player.gx, a.gy - player.gy);
  }

  private standable(i: number, j: number): boolean {
    const map = this.world.map;
    return map.isWalkable(i, j) && map.groundAt(i, j) !== Ground.Water;
  }
}
