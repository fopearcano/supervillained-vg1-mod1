import { Rectangle, type Container } from 'pixi.js';
import { FX } from '../config';
import { GlitchFilter } from './glitchFilter';

/**
 * Full-screen glitch transition (RGB split + slices + flash). The callback runs at the midpoint,
 * hidden by the strongest glitch frame. The filter is attached to the stage only while running.
 */
export class ScreenTransition {
  private readonly filter = new GlitchFilter();
  private t = 0;
  private dur = 0;
  private mid: (() => void) | null = null;
  private running = false;
  private flashAmount = 0.6;

  constructor(private readonly stage: Container) {}

  get busy(): boolean {
    return this.running;
  }

  /** Running, with its midpoint (usually a change of scene) still to come. */
  get swapping(): boolean {
    return this.running && this.mid !== null;
  }

  resize(w: number, h: number): void {
    this.stage.filterArea = new Rectangle(0, 0, w, h);
  }

  /**
   * Plays a glitch burst; `mid` runs halfway through (e.g. swap scenes). A transition started
   * while another one's midpoint is still pending runs that midpoint first. It is taken off
   * before it runs: midpoints often start a transition themselves (toTitle does), and must not
   * find themselves still pending (that recursed without end and crashed the game).
   */
  play(mid: (() => void) | null = null, duration: number = FX.TRANSITION_TIME, flash = 0.6): void {
    // Whatever that midpoint schedules in turn runs too, in order.
    let pending = this.running ? this.mid : null;
    while (pending) {
      this.mid = null;
      pending();
      pending = this.mid;
    }
    this.mid = mid;
    this.t = 0;
    this.dur = duration;
    this.flashAmount = flash;
    this.running = true;
    this.stage.filters = [this.filter];
  }

  update(dt: number): void {
    if (!this.running) return;
    this.t += dt;
    const u = Math.min(1, this.t / this.dur);
    const peak = 1 - Math.abs(u * 2 - 1);
    this.filter.time = this.t;
    this.filter.glitch = peak;
    this.filter.rgb = 1 + peak * 3;
    this.filter.scanlines = 0.6 * peak;
    this.filter.flash = Math.max(0, peak - 0.6) * 2.5 * this.flashAmount;
    if (u >= 0.5 && this.mid) {
      const fn = this.mid;
      this.mid = null;
      fn();
    }
    if (u >= 1) {
      this.running = false;
      this.stage.filters = [];
    }
  }
}
