import { Container } from 'pixi.js';
import { AMBUSH } from '../config';
import { PixelText } from './pixelText';
import { C } from './retro';

/**
 * A big sound word over the walk (the band's NOW!): just the word, in the pixel font at the
 * largest whole scale that fits, black-edged with a yellow glow so it reads on any ground, with no
 * balloon or flash behind it (the owner's call). It punches in from far too big, holds, shaking,
 * and blows away. Screen space, over the world and under the HUD's buttons. Timings and sizes in
 * AMBUSH (SHOUT_*).
 */
export class Shout {
  readonly root = new Container();
  private readonly group = new Container();
  private readonly text = new PixelText('', { color: C.red, scale: 1, outline: '#120818', outlineWidth: 2, glow: C.yellow, glowAlpha: 0.5 }).setOrigin(0.5);
  private t = -1;
  private w = 216;
  private h = 400;
  /** The word's pixel scale (read by scripts/story-smoke.mjs: the NOW! must be big). */
  private scale = 1;

  constructor() {
    this.group.addChild(this.text);
    this.root.addChild(this.group);
    this.root.visible = false;
  }

  /** Showing (from the punch-in to the end of the blow-away). */
  get active(): boolean {
    return this.t >= 0;
  }

  show(word: string): void {
    this.text.setText(word);
    this.fit();
    this.t = 0;
    this.root.visible = true;
  }

  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.group.position.set(Math.round(w / 2), Math.round(h * 0.34));
    this.fit();
  }

  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    const A = AMBUSH;
    const t = this.t;
    const end = A.SHOUT_IN + A.SHOUT_HOLD + A.SHOUT_OUT;
    if (t >= end) {
      this.t = -1;
      this.root.visible = false;
      return;
    }
    // Punch in (far too big, a little too small, settled), hold, blow away (bigger, fading).
    let s: number;
    let alpha = 1;
    if (t < A.SHOUT_IN) {
      const u = t / A.SHOUT_IN;
      s = A.SHOUT_FROM + (0.88 - A.SHOUT_FROM) * u * u;
    } else if (t < A.SHOUT_IN + 0.08) {
      s = 0.88 + 0.12 * ((t - A.SHOUT_IN) / 0.08);
    } else if (t < A.SHOUT_IN + A.SHOUT_HOLD) {
      s = 1;
    } else {
      const u = (t - A.SHOUT_IN - A.SHOUT_HOLD) / A.SHOUT_OUT;
      s = 1 + 0.35 * u;
      alpha = 1 - u;
    }
    this.group.scale.set(s);
    this.group.alpha = alpha;
    // It shakes while it is loud: a new jitter every 0.05 s (deterministic).
    const k = Math.floor(t / 0.05);
    const jx = Math.round(Math.sin(k * 12.9898) * A.SHOUT_JITTER);
    const jy = Math.round(Math.sin(k * 78.233) * A.SHOUT_JITTER);
    this.group.position.set(Math.round(this.w / 2) + jx, Math.round(this.h * 0.34) + jy);
  }

  /** The largest whole scale at which the word fits AMBUSH.SHOUT_WIDTH of the view. */
  private fit(): void {
    const base = this.text.textWidth / this.scale;
    if (base <= 0) return;
    const scale = Math.max(2, Math.floor((this.w * AMBUSH.SHOUT_WIDTH) / base));
    if (scale !== this.scale) {
      this.scale = scale;
      this.text.setStyle({ scale });
    }
  }
}
