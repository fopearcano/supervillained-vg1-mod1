import { Container, Graphics, Sprite } from 'pixi.js';
import { textures } from '../core/assets';
import type { Input } from '../core/input';
import { spriteName } from '../assets/manifest';
import { formatScore, formatTime } from '../systems/scoring';
import { PixelText } from './pixelText';
import { C, hex, hungerColor, retroBox } from './retro';

export interface RadarDot {
  /** Offset from Zampanò in screen px. */
  dx: number;
  dy: number;
  color: number;
  blink?: boolean;
  size?: number;
}

export interface HudState {
  pees: number;
  poops: number;
  treats: number;
  stars: number;
  lives: number;
  /** 0..1 */
  hunger: number;
  score: number;
  time: number;
  zoneName: string;
  level: number;
  radar: RadarDot[];
  /** Exit offset in screen px. */
  exit: { dx: number; dy: number };
}

const M = 3;
const RADAR_R = 17;
/** Screen px covered by the radar radius. */
const RADAR_RANGE = 230;

/**
 * The retro neon HUD, laid out like the video (portrait):
 * top-left stats box + stars, top-right lives / HUNGER / MENU,
 * bottom-left radar, bottom SCORE + zone, TIME box + Level box.
 */
export class Hud {
  readonly root = new Container();
  private readonly boxes = new Graphics();
  private readonly pees = new PixelText('', { glow: 'self', glowAlpha: 0.35, shadow: '#120818' });
  private readonly poops = new PixelText('', { glow: 'self', glowAlpha: 0.35, shadow: '#120818' });
  private readonly treats = new PixelText('', { glow: 'self', glowAlpha: 0.35, shadow: '#120818' });
  private readonly stars: Sprite[] = [];
  private readonly lives = new PixelText('', { color: C.paleRose, glow: C.red, glowAlpha: 0.5 });
  private readonly face = new Sprite(textures.get(spriteName('dogFace')));
  private readonly hungerLabel = new PixelText('HUNGER', { color: C.yellow, glow: 'self', glowAlpha: 0.35, shadow: '#120818' }).setOrigin(1, 0);
  private readonly hungerBar = new Graphics();
  private readonly menu = new Graphics();
  private readonly menuLabel = new PixelText('MENU', { color: C.yellow, glow: 'self', glowAlpha: 0.35, shadow: '#120818' }).setOrigin(1, 0);
  private readonly radar = new Graphics();
  private readonly score = new PixelText('', { color: C.cyan, glow: 'self', glowAlpha: 0.35, shadow: '#120818' });
  private readonly zone = new PixelText('', { color: C.green, glow: 'self', glowAlpha: 0.35, shadow: '#120818' }).setOrigin(1, 0);
  private readonly time = new PixelText('', { glow: 'self', glowAlpha: 0.35, shadow: '#120818' });
  private readonly level = new PixelText('', { color: C.hotPink, outline: '#ffe6f6', glow: C.hotPink, glowAlpha: 0.3 }).setOrigin(0.5, 0);
  private hungerW = 80;
  private lastHungerPx = -1;
  private lastHungerBlink = false;
  private clock = 0;
  private lastStars = -1;
  /** Remaining flash time per stat (value turns white when it changes). */
  private readonly flash = { pees: 0, poops: 0, treats: 0, lives: 0, score: 0 };
  private readonly last = { pees: -1, poops: -1, treats: -1, lives: -1, score: -1 };
  private radarCenter = { x: 0, y: 0 };

  constructor(private readonly input: Input) {
    for (let k = 0; k < 5; k++) {
      const s = new Sprite(textures.get(spriteName('star', 0)));
      this.stars.push(s);
    }
    this.root.addChild(
      this.boxes,
      this.radar,
      this.pees,
      this.poops,
      this.treats,
      ...this.stars,
      this.lives,
      this.face,
      this.hungerLabel,
      this.hungerBar,
      this.menu,
      this.menuLabel,
      this.score,
      this.zone,
      this.time,
      this.level,
    );
  }

  layout(w: number, h: number): void {
    const g = this.boxes;
    g.clear();
    // Stats box
    const statsW = 92;
    retroBox(g, M, M, statsW, 33, C.red, C.yellow);
    this.pees.position.set(M + 4, M + 4);
    this.poops.position.set(M + 4, M + 14);
    this.treats.position.set(M + 4, M + 24);
    this.stars.forEach((s, k) => s.position.set(M + 2 + k * 13, M + 37));
    // Lives box + face
    const faceX = w - M - 17;
    this.face.position.set(faceX, M);
    retroBox(g, faceX - 28, M + 1, 26, 13, C.red, '#a01020', 0.45);
    this.lives.position.set(faceX - 24, M + 4);
    // Hunger
    this.hungerW = Math.min(88, Math.floor(w * 0.42));
    this.hungerLabel.position.set(w - M, M + 18);
    this.hungerBar.position.set(w - M - this.hungerW, M + 28);
    this.lastHungerPx = -1;
    // Menu
    this.menu.clear();
    const mx = w - M - 14;
    const my = M + 39;
    for (let k = 0; k < 3; k++) this.menu.rect(mx, my + k * 3, 14, 1).fill(hex(C.yellow));
    this.menuLabel.position.set(w - M, my + 10);
    // Keeps its state: a resize must not turn it on under the title or a pause menu.
    this.input.setButton({ id: 'menu', action: 'menu', x: w - M - 16, y: my + 8, r: 16, enabled: this.menuEnabled });
    // Bottom
    const timeY = h - M - 15;
    retroBox(g, M, timeY, 98, 15, C.red, C.yellow);
    this.time.position.set(M + 5, timeY + 4);
    const lvlW = 70;
    retroBox(g, w - M - lvlW, timeY, lvlW, 15, C.yellow, C.red);
    this.level.position.set(w - M - lvlW / 2, timeY + 4);
    this.score.position.set(M + 2, timeY - 12);
    this.zone.position.set(w - M - 1, timeY - 12);
    this.radarCenter = { x: M + RADAR_R + 2, y: timeY - 16 - RADAR_R };
    this.lastStars = -1;
  }

  /** The MENU button (one per game: Input's `menu` button is shared by every HUD). */
  private menuEnabled = true;

  setMenuEnabled(on: boolean): void {
    this.menuEnabled = on;
    const b = this.input.buttons.get('menu');
    if (b) b.enabled = on;
  }

  update(s: HudState, dt: number): void {
    this.clock += dt;
    for (const k of ['pees', 'poops', 'treats', 'lives', 'score'] as const) {
      if (this.last[k] !== -1 && this.last[k] !== s[k]) this.flash[k] = 0.35;
      this.last[k] = s[k];
      this.flash[k] = Math.max(0, this.flash[k] - dt);
    }
    const hot = (k: keyof typeof this.flash, color: string) => (this.flash[k] > 0 && Math.floor(this.flash[k] * 16) % 2 === 0 ? C.white : color);
    this.pees.setText([
      { text: 'PEES: ', color: C.yellow },
      { text: String(s.pees), color: hot('pees', C.cyan) },
    ]);
    this.poops.setText([
      { text: 'POOPS: ', color: C.orange },
      { text: String(s.poops), color: hot('poops', C.cyan) },
    ]);
    this.treats.setText([
      { text: 'TREATS: ', color: C.pink },
      { text: String(s.treats), color: hot('treats', C.magenta) },
    ]);
    if (s.stars !== this.lastStars) {
      this.lastStars = s.stars;
      this.stars.forEach((sp, k) => {
        const v = s.stars >= k + 1 ? 0 : s.stars >= k + 0.5 ? 1 : 2;
        sp.texture = textures.get(spriteName('star', v));
      });
    }
    this.lives.setText(`${s.lives}x`);
    this.lives.visible = this.flash.lives <= 0 || Math.floor(this.flash.lives * 16) % 2 === 0;
    this.score.setText([
      { text: 'SCORE: ', color: C.cyan },
      { text: formatScore(s.score), color: hot('score', C.cyan) },
    ]);
    this.zone.setText(s.zoneName);
    this.time.setText([
      { text: 'TIME: ', color: C.green },
      { text: formatTime(s.time), color: C.paleRose },
    ]);
    this.level.setText(`Level ${s.level}`);
    this.drawHunger(s.hunger);
    this.drawRadar(s);
    const menuBtn = this.input.buttons.get('menu');
    this.menu.alpha = menuBtn?.pressed ? 0.5 : 1;
  }

  private drawHunger(f: number): void {
    const inner = this.hungerW - 2;
    const px = Math.round(Math.max(0, Math.min(1, f)) * inner);
    const blink = f < 0.25 && Math.floor(this.clock * 4) % 2 === 0;
    if (px === this.lastHungerPx && blink === this.lastHungerBlink) return;
    this.lastHungerPx = px;
    this.lastHungerBlink = blink;
    const g = this.hungerBar;
    g.clear();
    g.rect(0, 0, this.hungerW, 7).fill({ color: 0x000000, alpha: 0.4 });
    for (let x = 0; x < px; x++) g.rect(1 + x, 1, 1, 5).fill(hungerColor(x / inner));
    // Highlight row
    if (px > 0) g.rect(1, 1, px, 1).fill({ color: 0xffffff, alpha: 0.35 });
    const border = blink ? 0xffffff : hex(C.red);
    g.rect(0, 0, this.hungerW, 1).fill(border);
    g.rect(0, 6, this.hungerW, 1).fill(border);
    g.rect(0, 0, 1, 7).fill(border);
    g.rect(this.hungerW - 1, 0, 1, 7).fill(border);
  }

  private drawRadar(s: HudState): void {
    const g = this.radar;
    const { x: cx, y: cy } = this.radarCenter;
    g.clear();
    g.circle(cx, cy, RADAR_R).fill({ color: 0x2bd12b, alpha: 0.45 });
    g.circle(cx, cy, RADAR_R).stroke({ width: 1, color: hex(C.yellow), alpha: 0.95 });
    g.circle(cx, cy, RADAR_R * 0.5).stroke({ width: 1, color: 0x9dff7a, alpha: 0.35 });
    // Sweep line
    const a = this.clock * 2.4;
    g.moveTo(cx, cy)
      .lineTo(cx + Math.cos(a) * (RADAR_R - 1), cy + Math.sin(a) * (RADAR_R - 1))
      .stroke({ width: 1, color: 0xd8ffb0, alpha: 0.5 });
    const k = RADAR_R / RADAR_RANGE;
    for (const d of s.radar) {
      if (d.blink && Math.floor(this.clock * 6) % 2 === 0) continue;
      let x = d.dx * k;
      let y = d.dy * k;
      const len = Math.hypot(x, y);
      if (len > RADAR_R - 2) continue;
      x = Math.round(cx + x);
      y = Math.round(cy + y);
      const sz = d.size ?? 2;
      g.rect(x - (sz >> 1), y - (sz >> 1), sz, sz).fill(d.color);
    }
    // Exit: on the rim if out of range.
    let ex = s.exit.dx * k;
    let ey = s.exit.dy * k;
    const el = Math.hypot(ex, ey);
    if (el > RADAR_R - 2) {
      ex = (ex / el) * (RADAR_R - 2);
      ey = (ey / el) * (RADAR_R - 2);
    }
    if (Math.floor(this.clock * 3) % 3 !== 0) g.rect(Math.round(cx + ex) - 1, Math.round(cy + ey) - 1, 3, 3).fill(0xffffff);
    // Zampanò in the center
    g.rect(cx - 1, cy - 1, 2, 2).fill(0xffffff);
  }
}
