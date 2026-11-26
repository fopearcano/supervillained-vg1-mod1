import { Container, Graphics } from 'pixi.js';
import { AMBUSH } from '../config';
import { PixelText } from './pixelText';
import { C, hex } from './retro';

/** Points of the jagged burst behind the word. */
const SPIKES = 18;

/**
 * A big comic-book sound word over the walk (the band's NOW!): a white flash, then the word in
 * the pixel font at the largest whole scale that fits, on a red-and-yellow jagged burst. It punches
 * in from far too big, holds, shaking, and blows away. Screen space, over the world and under the
 * HUD's buttons. Timings and sizes in AMBUSH (SHOUT_*).
 */
export class Shout {
  readonly root = new Container();
  private readonly flash = new Graphics();
  private readonly group = new Container();
  private readonly burst = new Graphics();
  private readonly text = new PixelText('', { color: C.red, scale: 1, outline: '#120818', outlineWidth: 2, glow: C.yellow, glowAlpha: 0.5 }).setOrigin(0.5);
  private t = -1;
  private w = 216;
  private h = 400;
  private scale = 1;

  constructor() {
    this.group.addChild(this.burst, this.text);
    this.root.addChild(this.flash, this.group);
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
    this.drawBurst(k);
    const f = Math.max(0, 1 - t / 0.15);
    this.flash.clear();
    if (f > 0) this.flash.rect(0, 0, this.w, this.h).fill({ color: 0xffffff, alpha: A.SHOUT_FLASH * f });
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

  /** A black-edged red burst with a yellow one inside, its spikes re-jagged every frame of jitter. */
  private drawBurst(k: number): void {
    const g = this.burst.clear();
    const rx = this.text.textWidth * 0.66 + 10;
    const ry = this.text.textHeight * 1.45 + 8;
    const star = (grow: number) => {
      const pts: number[] = [];
      for (let p = 0; p < SPIKES * 2; p++) {
        const a = (p / (SPIKES * 2)) * Math.PI * 2 + (k % 2) * 0.09;
        const out = p % 2 === 0;
        const r = (out ? 1 + 0.08 * Math.sin(p * 3.1 + k) : 0.72) * grow;
        pts.push(Math.round(Math.cos(a) * rx * r), Math.round(Math.sin(a) * ry * r));
      }
      return pts;
    };
    g.poly(star(1.08)).fill({ color: 0x120818 });
    g.poly(star(1)).fill({ color: hex(C.red) });
    g.poly(star(0.82)).fill({ color: hex(C.yellow) });
  }
}
