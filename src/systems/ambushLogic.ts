import { AMBUSH } from '../config';
import type { Rng } from '../core/rng';

/**
 * The band's ambush, as a sequence (pure: tests/ambush.test.ts). The runtime side (actors, poop,
 * fright) is systems/ambush.ts; this only decides what happens when.
 *
 *  waiting  the band sits at its spot, silent
 *  voices   from `warnFrom`: their lines, more and more often as Zampanò gets closer
 *  now      he reached `at`: the leader shouts; a short beat
 *  jump     they run at him
 *  scare    he is frozen with fright; they bark around him and poop
 *  leave    they run off
 *  done     gone (or skipped: he got past `until` without triggering it, e.g. a teleport)
 */
export type AmbushPhase = 'waiting' | 'voices' | 'now' | 'jump' | 'scare' | 'leave' | 'done';

export type AmbushSignal =
  /** A voice: the index of the line in `voices`, and how loud (0 at warnFrom .. 1 at `at`). */
  | { kind: 'voice'; line: number; loud: number }
  | { kind: 'now' }
  | { kind: 'jump' }
  | { kind: 'scare' }
  | { kind: 'leave' }
  | { kind: 'done' }
  | { kind: 'skipped' };

export interface AmbushTiming {
  warnFrom: number;
  at: number;
  until: number;
  /** Number of lines the voices take turns with. */
  lines: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class AmbushDirector {
  phase: AmbushPhase = 'waiting';
  /** Seconds in the current phase. */
  private t = 0;
  /** The farthest he has been (progress dips on loops and when he steps back). */
  private reached = 0;
  private voiceTimer = 0;
  private voices = 0;
  /** Seconds left of the grace after they leave, before Bagnaskiz's usual attack may start. */
  private grace = 0;
  private skipped = false;

  constructor(
    readonly timing: AmbushTiming,
    private readonly rng: Rng,
  ) {}

  /** Bagnaskiz is busy with the ambush (or it just ended): his usual attack must wait. */
  get holdsAttack(): boolean {
    return this.phase !== 'done' || this.grace > 0;
  }

  /** How close the voices are: 0 at warnFrom, 1 at `at`. */
  get closeness(): number {
    const { warnFrom, at } = this.timing;
    return Math.max(0, Math.min(1, (this.reached - warnFrom) / Math.max(1e-6, at - warnFrom)));
  }

  /**
   * One logic step. `progress` is Zampanò's route progress; `arrived` says the band has reached
   * him (the jump may end early). Returns what to do this step, in order.
   */
  update(dt: number, progress: number, arrived: boolean): AmbushSignal[] {
    const out: AmbushSignal[] = [];
    const { warnFrom, at, until, lines } = this.timing;
    this.t += dt;
    if (this.phase === 'done') {
      if (this.grace > 0) this.grace = Math.max(0, this.grace - dt);
      return out;
    }
    this.reached = Math.max(this.reached, progress);
    if (this.phase === 'waiting' || this.phase === 'voices') {
      // Got past the middle without being caught there (a teleport, a debug jump): no ambush.
      if (this.reached > until) {
        this.skipped = true;
        this.enter('done');
        out.push({ kind: 'skipped' });
        return out;
      }
      if (this.reached >= at) {
        this.enter('now');
        out.push({ kind: 'now' });
        return out;
      }
    }
    switch (this.phase) {
      case 'waiting':
        if (this.reached >= warnFrom) {
          this.enter('voices');
          this.voiceTimer = 0.4;
        }
        break;
      case 'voices': {
        this.voiceTimer -= dt;
        if (this.voiceTimer <= 0 && lines > 0) {
          const u = this.closeness;
          out.push({ kind: 'voice', line: this.voices % lines, loud: u });
          this.voices++;
          const every = lerp(AMBUSH.VOICE_EVERY[0], AMBUSH.VOICE_EVERY[1], u);
          this.voiceTimer = every * (1 + this.rng.range(-AMBUSH.VOICE_JITTER, AMBUSH.VOICE_JITTER));
        }
        break;
      }
      case 'now':
        if (this.t >= AMBUSH.NOW_BEAT) {
          this.enter('jump');
          out.push({ kind: 'jump' });
        }
        break;
      case 'jump':
        if (arrived || this.t >= AMBUSH.JUMP_MAX) {
          this.enter('scare');
          out.push({ kind: 'scare' });
        }
        break;
      case 'scare':
        if (this.t >= AMBUSH.SCARE_TIME) {
          this.enter('leave');
          out.push({ kind: 'leave' });
        }
        break;
      case 'leave':
        if (this.t >= AMBUSH.LEAVE_TIME) {
          this.enter('done');
          this.grace = AMBUSH.ATTACK_GRACE;
          out.push({ kind: 'done' });
        }
        break;
    }
    return out;
  }

  /** Seconds since the current phase began (scare: for timing barks and poops). */
  get phaseTime(): number {
    return this.t;
  }

  /** It never happened (he got past without triggering it). */
  get wasSkipped(): boolean {
    return this.skipped;
  }

  private enter(phase: AmbushPhase): void {
    this.phase = phase;
    this.t = 0;
  }
}
