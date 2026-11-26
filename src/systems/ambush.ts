import { AMBUSH } from '../config';
import { Rng } from '../core/rng';
import { animationDuration } from '../assets/animationTiming';
import { CHARACTERS, type CharacterKey } from '../assets/manifest';
import { Actor } from '../entities/actor';
import { screenToGrid } from '../iso/projection';
import type { AmbushSettings } from '../world/level';
import { AmbushDirector, type AmbushSignal } from './ambushLogic';
import { offscreenEntry, standsAt, type Entry, type Point } from './ambushEntry';
import { randomSpotNear } from './placement';
import type { Rules, WorldAccess } from './rules';

interface Member {
  readonly key: string;
  readonly actor: Actor;
  /** Where it came in from: outside the view (or, failing that, the farthest clear spot inside). */
  readonly entry: Entry;
  /** Their place around Zampanò while they circle him (radians). */
  angle: number;
  /** Seconds to the next bark / the next poop while they scare him. */
  barkIn: number;
  poopIn: number;
  poopsLeft: number;
  /** Seconds left of a squat: it keeps its place on the circle meanwhile. */
  squatLeft: number;
}

/** The logical size of the view (px), for "outside the view". */
export type ViewSize = () => { w: number; h: number };

/**
 * Bagnaskiz's band in the Green Zone walk (story 1.0). Out of sight until the middle of the walk:
 * from a quarter of the way their voices come from off-screen, from the sides they will come from,
 * more and more often; when Zampanò reaches the middle a big NOW! and, at that very moment, they
 * rush in from outside the view, from the sides, frighten him, poop around him and run off. The
 * sequence is AmbushDirector (pure); where they come in from, ambushEntry (pure); this makes the
 * actors, freezes him and drops the piles (Rules.dropPoop: they pollute like his, are cleaned by
 * his pee, and are not counted as his). Effects and sounds react to the events.
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
    private readonly view: ViewSize,
  ) {
    this.rng = new Rng(seed ^ 0x2c1b3c6d);
    this.director = new AmbushDirector(
      { warnFrom: settings.warnFrom, at: settings.at, until: settings.until, lines: settings.voices.length },
      this.rng,
    );
  }

  /** Bagnaskiz's usual attack must wait (he is with his band, or they have only just left). */
  get holdsAttack(): boolean {
    return this.director.holdsAttack;
  }

  /** They have shown themselves (for the radar). */
  get revealed(): boolean {
    return this.band.length > 0;
  }

  update(dt: number): void {
    const { player, map } = this.world;
    const progress = map.progressAt(player.gx, player.gy);
    const arrived = this.band.length > 0 && this.band.every((m) => m.actor.arrived || this.distance(m.actor) <= AMBUSH.RING + 0.5);
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
    switch (s.kind) {
      case 'voice': {
        // From off-screen, on the side the speaker will come from (the view keeps the text in).
        const line = this.settings.voices[s.line]!;
        const k = Math.max(0, this.settings.band.indexOf(line.who));
        const p = this.beyondView(k);
        events.emit('ambushVoice', { x: p.x, y: p.y, text: line.text, who: line.who, loud: s.loud });
        break;
      }
      case 'now': {
        const lead = this.settings.band[0] ?? 'bagnaskiz';
        events.emit('ambushNow', { x: player.gx, y: player.gy, text: this.settings.now, who: lead });
        break;
      }
      case 'jump':
        this.rushIn();
        events.emit('ambushJump', { x: player.gx, y: player.gy });
        break;
      case 'scare': {
        player.startAction('scared', AMBUSH.SCARE_TIME);
        const lead = this.band[0];
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

  /**
   * NOW!: the band appears just outside the view, each from its side (AMBUSH.ENTRY_DIRS), and
   * runs straight at him, barking. Each one lands on the circle around him on the side it came from.
   */
  private rushIn(): void {
    const { player, map } = this.world;
    const { w, h } = this.view();
    const here = { x: player.gx, y: player.gy };
    this.settings.band.forEach((key, k) => {
      const [sx, sy] = AMBUSH.ENTRY_DIRS[k % AMBUSH.ENTRY_DIRS.length]!;
      const entry =
        offscreenEntry(map, here, sx, sy, w / 2, h / 2) ??
        // Nowhere clear on any line in (a pocket of hedges): close by, wherever there is room.
        this.nearby(here) ?? { ...here, offscreen: false };
      const actor = new Actor(`band-${key}`, key as CharacterKey, entry.x, entry.y);
      const angle = Math.atan2(entry.y - here.y, entry.x - here.x);
      actor.faceToward(here.x, here.y);
      actor.setBehavior({ kind: 'goto', to: this.ringPoint(angle), speed: AMBUSH.JUMP_SPEED, run: true });
      actor.emote('bark', 0.5);
      this.world.addEntity(actor);
      this.band.push({ key, actor, entry, angle, barkIn: 0, poopIn: 0, poopsLeft: 0, squatLeft: 0 });
    });
  }

  /** A point well outside the view in band member k's direction (the voices' place; no ground check). */
  private beyondView(k: number): Point {
    const { player } = this.world;
    const { w, h } = this.view();
    const [sx, sy] = AMBUSH.ENTRY_DIRS[k % AMBUSH.ENTRY_DIRS.length]!;
    const len = Math.hypot(sx, sy) || 1;
    const ux = sx / len;
    const uy = sy / len;
    const d = Math.min(Math.abs(ux) > 1e-6 ? w / 2 / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-6 ? h / 2 / Math.abs(uy) : Infinity) + AMBUSH.ENTRY_MARGIN;
    const g = screenToGrid(ux * d, uy * d);
    return { x: player.gx + g.x, y: player.gy + g.y };
  }

  private nearby(here: Point): Entry | null {
    for (let k = 0; k < 6; k++) {
      const s = randomSpotNear(this.world.map, here.x, here.y, 2, 4, this.rng);
      if (s && standsAt(this.world.map, s.x, s.y)) return { ...s, offscreen: false };
    }
    return null;
  }

  /** They circle him, barking, and each poops on the way round. */
  private scareStep(dt: number): void {
    const { events } = this.world;
    const every = (AMBUSH.SCARE_TIME - 0.5) / Math.max(1, AMBUSH.POOPS_EACH);
    // Wider and wider round him: the piles end up everywhere, not in one neat ring.
    const u = Math.min(1, this.director.phaseTime / AMBUSH.SCARE_TIME);
    const radius = AMBUSH.RING + (AMBUSH.RING_WIDEN_TO - AMBUSH.RING) * u;
    for (const m of this.band) {
      // Squatting, it stays where it is on the circle; then it goes on round from there (if its
      // place kept moving, it would cut across the circle afterwards, dropping the next pile close
      // to him).
      if (m.squatLeft > 0) m.squatLeft -= dt;
      else m.angle += (AMBUSH.CIRCLE_SPEED / radius) * dt;
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
    const map = this.world.map;
    if (!standsAt(map, x, y, 0)) {
      const s = randomSpotNear(map, x, y, 0.3, 1.5, this.rng);
      if (!s) return;
      ({ x, y } = s);
    }
    this.rules.dropPoop(x, y);
    // The squat (all three have it drawn): the whole clip, sped up to fit, and no bark until it is
    // over. A band member without a `poop` clip would just drop the pile.
    const clip = CHARACTERS[m.key as CharacterKey]?.anims.poop;
    if (clip && a.animator) {
      a.playAction('poop', AMBUSH.POOP_SQUAT);
      a.animator.speed = animationDuration(clip) / AMBUSH.POOP_SQUAT;
      m.barkIn = Math.max(m.barkIn, AMBUSH.POOP_SQUAT + 0.05);
      m.squatLeft = AMBUSH.POOP_SQUAT;
    }
    this.world.events.emit('bandPoop', { x, y, who: m.key });
  }

  private ringPoint(angle: number, radius: number = AMBUSH.RING): { x: number; y: number } {
    const { player } = this.world;
    return { x: player.gx + Math.cos(angle) * radius, y: player.gy + Math.sin(angle) * radius };
  }

  private distance(a: Actor): number {
    const { player } = this.world;
    return Math.hypot(a.gx - player.gx, a.gy - player.gy);
  }
}
