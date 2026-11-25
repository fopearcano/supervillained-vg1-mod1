import { Container, Sprite } from 'pixi.js';
import { textures } from '../core/assets';
import type { Rect } from '../iso/depth';
import { spriteName, type SpriteKey } from '../assets/manifest';
import { PixelText, type PixelTextStyle } from '../ui/pixelText';

interface Popup {
  obj: Container;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
  pop: boolean;
  /** Kept inside `Popups.keepIn` (speech that must stay readable at the edge of the view). */
  keep: boolean;
  release: () => void;
}

/**
 * World-space popups: big pixel icons (rainbow, poop, bone) and floating score text.
 * Icons "pop" in (overshoot), float up, then blink out.
 */
export class Popups {
  readonly root = new Container();
  /**
   * The visible area, in the same coordinates as the popups (set every step by the owner).
   * Popups made with `keep` are pushed inside it: a speaker standing at the edge of the view is
   * still read in full.
   */
  keepIn: Rect | null = null;
  private readonly live: Popup[] = [];
  private readonly textPool = new Map<string, PixelText[]>();

  icon(key: SpriteKey, x: number, y: number, scale = 2, life = 1.1, vy = -14): void {
    const s = new Sprite(textures.get(spriteName(key)));
    s.anchor.set(0.5, 1);
    this.root.addChild(s);
    this.live.push({ obj: s, x, y, vy, life, maxLife: life, scale, pop: true, keep: false, release: () => s.destroy() });
  }

  text(str: string, x: number, y: number, style: Partial<PixelTextStyle>, life = 0.9, vy = -22, keep = false): void {
    const key = `${str}|${style.color}|${style.scale ?? 1}|${style.outline}|${style.glowAlpha ?? ''}`;
    const pool = this.textPool.get(key) ?? [];
    const t =
      pool.pop() ?? new PixelText(str, { outline: '#000000', ...style }).setOrigin(0.5, 1);
    t.visible = true;
    t.alpha = 1;
    this.root.addChild(t);
    this.live.push({
      obj: t,
      x,
      y,
      vy,
      life,
      maxLife: life,
      scale: 1,
      pop: false,
      keep,
      release: () => {
        this.root.removeChild(t);
        const p = this.textPool.get(key) ?? [];
        if (p.length < 4) {
          p.push(t);
          this.textPool.set(key, p);
        } else t.destroy();
      },
    });
  }

  /**
   * Frees every popup, the pooled texts too: those are out of the display tree, so destroying
   * the scene does not reach them, and each holds a canvas texture on the GPU.
   */
  destroy(): void {
    for (const pool of this.textPool.values()) for (const t of pool) t.destroy();
    this.textPool.clear();
    this.live.length = 0;
    this.root.destroy({ children: true });
  }

  update(dt: number): void {
    for (let k = this.live.length - 1; k >= 0; k--) {
      const p = this.live[k]!;
      p.life -= dt;
      if (p.life <= 0) {
        p.release();
        this.live.splice(k, 1);
        continue;
      }
      const age = p.maxLife - p.life;
      p.y += p.vy * dt;
      p.vy *= Math.exp(-2.2 * dt);
      let px = p.x;
      let py = p.y;
      const r = this.keepIn;
      if (p.keep && r) {
        // Origin is bottom-centre: keep the whole box between the sides and below the top.
        const half = p.obj.width / 2;
        px = half * 2 >= r.w ? r.x + r.w / 2 : Math.min(Math.max(px, r.x + half), r.x + r.w - half);
        py = Math.max(py, r.y + p.obj.height);
      }
      p.obj.position.set(Math.round(px), Math.round(py));
      if (p.pop) {
        // Pop-in with overshoot, settling on an integer scale.
        const t = Math.min(1, age / 0.18);
        const s = t < 1 ? p.scale * (0.4 + 1.0 * t) : p.scale;
        p.obj.scale.set(t < 1 ? s : p.scale);
      }
      p.obj.visible = p.life > 0.3 || Math.floor(p.life * 20) % 2 === 0;
    }
  }

  clear(): void {
    for (const p of this.live) p.release();
    this.live.length = 0;
  }
}
