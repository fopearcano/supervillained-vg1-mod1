import { Container, Graphics, Sprite } from 'pixi.js';
import { textures } from '../core/assets';
import type { Emitter, GameEvents } from '../core/events';
import { AMBUSH, FX } from '../config';
import { spriteName } from '../assets/manifest';
import type { Zampano } from '../entities/zampano';
import type { Camera } from '../iso/camera';
import { BARK } from '../config';
import { DIRS8, dirToGridVector, dirToScreenVector, gridToScreen, type Dir8 } from '../iso/projection';
import { C } from '../ui/retro';
import { Particles } from './particles';
import { Popups } from './popups';

interface Wave {
  sprite: Sprite;
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  t: number;
  life: number;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  t: number;
  dur: number;
  color: number;
}

const GEO_COLORS = [0xff9a1f, 0xb040ff, 0x6ad8ff, 0xff4fa8, 0xffe23a];

/** Bagnaskiz's band, in the colours their lines have in the story (story/ui.ts speakers). */
const BAND_COLOR: Record<string, string> = { bagnaskiz: C.orange, jack: '#ff8ab8', watson: '#d8d4c8' };
const DIRT = [0x6e4a1c, 0x8f6a30, 0x4a2e0e];

/**
 * Visual reactions to gameplay events: popups, particles, pee rings, the digestion bubble,
 * screen shake. Everything here is cosmetic.
 */
export class GameFx {
  readonly below = new Container();
  readonly above = new Container();
  readonly particles = new Particles();
  readonly popups = new Popups();
  /** The band's lines (the ambush): their own layer, cleared when Bagnaskiz shouts. */
  readonly voices = new Popups();
  private readonly rings: Ring[] = [];
  private readonly waves: Wave[] = [];
  private readonly ringG = new Graphics();
  private readonly bubble: Sprite;
  private time = 0;
  private streamTimer = 0;
  private stepTimer = 0;
  /** Returns the terrain under Zampanò for footstep particles. */
  terrainAt: (x: number, y: number) => 'water' | 'bush' | 'tall' | 'ground' = () => 'ground';

  constructor(
    events: Emitter<GameEvents>,
    private readonly player: Zampano,
    private readonly camera: Camera,
    private readonly bubbleState: () => number,
  ) {
    this.below.addChild(this.ringG);
    this.above.addChild(this.particles.root, this.popups.root, this.voices.root);
    this.bubble = new Sprite(textures.get(spriteName('thought')));
    this.bubble.visible = false;
    this.bubble.scale.set(2);
    this.above.addChild(this.bubble);

    const at = (x: number, y: number, lift = 0) => {
      const s = gridToScreen(x, y);
      return { x: s.x, y: s.y - lift };
    };

    events.on('treat', (e) => {
      const p = at(e.x, e.y, 26);
      this.popups.icon('treat', p.x, p.y - 8, 3, FX.POPUP_TIME, -10);
      this.particles.burst(p.x, p.y, {
        count: 14,
        textures: ['tri', 'cross', 'ring', 'pixel'],
        colors: GEO_COLORS,
        speed: [40, 90],
        life: [0.5, 0.9],
        drag: 3,
        spread: 6,
      });
    });
    events.on('score', (e) => {
      // Above the big popup icons (bone, rainbow, poop).
      const p = at(e.x, e.y, 62);
      const label = e.label ? `${e.label} +${e.amount}` : `+${e.amount}`;
      this.popups.text(label, p.x, p.y, { color: e.label ? C.yellow : C.cyan, glow: 'self', glowAlpha: 0.3 }, FX.SCORE_POPUP_TIME);
    });
    events.on('poop', (e) => {
      const p = at(e.x, e.y, 30);
      this.popups.icon('poop', p.x, p.y, 3, FX.POPUP_TIME, -8);
      const g = at(e.x, e.y);
      this.particles.burst(g.x, g.y, {
        count: 10,
        textures: ['pixel'],
        colors: [0x6e4a1c, 0x8f6a30, 0x4a2e0e],
        speed: [20, 50],
        life: [0.4, 0.7],
        gravity: 120,
        angle: [-Math.PI * 0.95, -Math.PI * 0.05],
      });
      this.camera.shake(FX.SHAKE_POOP);
      const label = e.surface === 'low' ? 'HIDDEN!' : e.surface === 'heavy' ? 'ON THE PATH!' : null;
      if (label) this.popups.text(label, p.x, p.y - 30, { color: e.surface === 'low' ? C.green : C.orange, glow: 'self' }, 1.2, -10);
    });
    events.on('pee', (e) => {
      const p = at(e.x, e.y, 30);
      this.popups.icon('rainbow', p.x, p.y, 2, FX.POPUP_TIME, -10);
      const g = at(e.x, e.y);
      this.rings.push({ x: g.x, y: g.y, radius: e.radius, t: 0, dur: e.marking ? 0.9 : 0.7, color: 0xfff36a });
      if (e.marking) this.rings.push({ x: g.x, y: g.y, radius: e.radius * 0.6, t: -0.15, dur: 0.8, color: 0x7aff4a });
      this.streamTimer = e.marking ? 0.85 : 0.65;
    });
    events.on('peeEmpty', (e) => {
      const p = at(e.x, e.y, 36);
      this.popups.text('EMPTY!', p.x, p.y, { color: C.orange, glow: 'self' }, 0.8, -14);
    });
    events.on('tired', (e) => {
      const p = at(e.x, e.y, 36);
      this.popups.text('TIRED!', p.x, p.y, { color: C.cyan, glow: 'self' }, 0.8, -14);
    });
    events.on('poopCleaned', (e) => {
      const g = at(e.x, e.y, 4);
      this.particles.burst(g.x, g.y, {
        count: 8,
        textures: ['sparkle'],
        colors: [0xffffff, 0xfff36a, 0x9dff7a],
        speed: [20, 50],
        life: [0.4, 0.8],
        drag: 3,
      });
    });
    events.on('drink', (e) => {
      const g = at(e.x, e.y, 6);
      this.particles.burst(g.x, g.y, {
        count: 10,
        textures: ['pixel'],
        colors: [0x8fd0ff, 0x3b8cff, 0xffffff],
        speed: [20, 55],
        life: [0.35, 0.6],
        gravity: 140,
        angle: [-Math.PI * 0.9, -Math.PI * 0.1],
      });
      const p = at(e.x, e.y, 36);
      this.popups.text('PEE REFILL!', p.x, p.y, { color: C.yellow, glow: 'self' }, 1, -14);
    });
    events.on('bark', (e) => {
      const dir = e.dir as Dir8;
      const g = dirToGridVector(dir);
      const start = at(e.x + g.x * 0.5, e.y + g.y * 0.5, 12);
      const end = at(e.x + g.x * BARK.RANGE, e.y + g.y * BARK.RANGE, 12);
      const tex = textures.get(spriteName('wave', DIRS8.indexOf(dir)));
      for (let k = 0; k < 3; k++) {
        const sprite = new Sprite(tex);
        sprite.tint = k === 1 ? 0x3ff0ff : 0xffffff;
        sprite.visible = false;
        this.above.addChild(sprite);
        this.waves.push({ sprite, ox: start.x, oy: start.y, dx: end.x - start.x, dy: end.y - start.y, t: -k * 0.07, life: BARK.RANGE / BARK.WAVE_SPEED + 0.12 });
      }
      const p = at(e.x, e.y, 40);
      this.popups.text('WOOF!', p.x, p.y, { color: C.white, glow: C.cyan, glowAlpha: 0.5 }, 0.5, -30);
      this.camera.shake(FX.SHAKE_BARK);
    });
    events.on('barkHit', (e) => {
      const g = at(e.x, e.y, 18);
      this.particles.burst(g.x, g.y, {
        count: 10,
        textures: ['sparkle', 'cross'],
        colors: [0xffffff, 0x3ff0ff, 0xffe23a],
        speed: [40, 80],
        life: [0.3, 0.6],
        drag: 4,
      });
      this.popups.text(`HIT ${e.hits}/3`, g.x, g.y - 18, { color: C.cyan, glow: 'self' }, 0.8, -16);
      this.camera.shake(FX.SHAKE_HIT);
    });
    events.on('cat', (e) => {
      const g = at(e.x, e.y, 12);
      this.particles.burst(g.x, g.y, {
        count: 8,
        textures: ['coin'],
        colors: [0xffffff],
        speed: [40, 80],
        life: [0.5, 0.8],
        gravity: 160,
        angle: [-Math.PI * 0.9, -Math.PI * 0.1],
        fade: true,
      });
      this.popups.text(`+${e.coins} COINS`, g.x, g.y - 28, { color: C.yellow, glow: 'self' }, 1.1, -12);
    });
    events.on('fetch', (e) => {
      const p = at(e.x, e.y, 30);
      this.popups.icon('ball', p.x, p.y, 3, 1.1, -10);
      this.popups.text(`DISTRACTED! +${e.penalty}s`, p.x, p.y - 22, { color: C.orange, glow: 'self' }, 1.4, -10);
    });
    events.on('ballSpawn', (e) => {
      const g = at(e.x, e.y, 6);
      this.particles.burst(g.x, g.y, { count: 6, textures: ['sparkle'], colors: [0xdcf23a, 0xffffff], speed: [20, 40], life: [0.3, 0.6], drag: 3 });
    });
    events.on('bump', (e) => {
      const p = at(e.x, e.y, 36);
      this.popups.text('OUCH!', p.x, p.y, { color: C.red, glow: 'self' }, 0.8, -16);
      this.camera.shake(FX.SHAKE_HURT);
    });
    events.on('pollutionSurge', (e) => {
      const g = at(e.x, e.y);
      const p = at(e.x, e.y, 32);
      this.rings.push({ x: g.x, y: g.y, radius: e.radius, t: 0, dur: 0.9, color: 0x8f6a30 });
      this.particles.burst(g.x, g.y, {
        count: Math.min(18, 6 + e.tiles),
        textures: ['pixel', 'ring'],
        colors: [0x6e4a1c, 0x8f6a30, 0x4a2e0e],
        speed: [18, 48],
        life: [0.45, 0.8],
        gravity: 80,
        angle: [-Math.PI * 0.9, -Math.PI * 0.1],
      });
      this.popups.text('POLLUTION SURGE!', p.x, p.y, { color: C.orange, glow: 'self' }, 1.2, -10);
      this.camera.shake(FX.SHAKE_POOP);
    });
    events.on('attackStart', () => {
      this.camera.shake(FX.SHAKE_HURT);
    });
    // The band's ambush (systems/ambush.ts). Voices come from where they wait and are kept in
    // view (keepIn), brighter as he gets closer.
    events.on('ambushVoice', (e) => {
      const p = at(e.x, e.y, 44);
      // Four steps of glow (each its own pooled text: a reused text keeps its first glow).
      const glowAlpha = 0.2 + 0.4 * (Math.round(e.loud * 3) / 3);
      const style = { color: BAND_COLOR[e.who] ?? C.white, glow: 'self' as const, glowAlpha, align: 'center' as const, maxWidth: 150 };
      this.voices.text(e.text, p.x, p.y, style, 1.1 + 0.5 * e.loud, -12, true);
    });
    events.on('ambushNow', (e) => {
      // The shout alone: the voices still floating are cut off by it.
      this.voices.clear();
      const p = at(e.x, e.y, 56);
      this.voices.text(e.text, p.x, p.y, { color: BAND_COLOR[e.who] ?? C.orange, glow: 'self', scale: 2 }, 1.4, -10, true);
      this.camera.shake(AMBUSH.SHAKE * 0.6);
    });
    events.on('ambushJump', () => this.camera.shake(AMBUSH.SHAKE));
    events.on('ambushScare', (e) => {
      const p = at(e.x, e.y, 40);
      this.popups.text('!!', p.x, p.y, { color: C.white, glow: 'self', scale: 2 }, 1.3, -18);
      const g = at(e.x, e.y, 26);
      this.particles.burst(g.x, g.y, { count: 8, textures: ['pixel'], colors: [0xaee0ff, 0xffffff], speed: [30, 60], life: [0.4, 0.7], gravity: 160, angle: [-Math.PI * 0.9, -Math.PI * 0.1] });
      this.camera.shake(AMBUSH.SHAKE);
    });
    events.on('bandPoop', (e) => {
      const p = at(e.x, e.y, 26);
      this.popups.icon('poop', p.x, p.y, 2, FX.POPUP_TIME, -8);
      const g = at(e.x, e.y);
      this.particles.burst(g.x, g.y, { count: 6, textures: ['pixel'], colors: DIRT, speed: [18, 40], life: [0.35, 0.6], gravity: 120, angle: [-Math.PI * 0.95, -Math.PI * 0.05] });
    });
    events.on('lifeLost', (e) => {
      const p = at(e.x, e.y, 38);
      this.popups.text(e.lives > 0 ? 'STARVING! -1' : 'STARVED!', p.x, p.y, { color: C.red, glow: 'self', scale: 1 }, 1.4, -10);
      this.camera.shake(FX.SHAKE_HURT);
    });
  }

  update(dt: number): void {
    this.time += dt;
    this.particles.update(dt);
    this.popups.update(dt);
    this.voices.update(dt);
    // Footsteps: dust when running, leaves in bushes, splashes in puddles.
    const p = this.player;
    if (p.moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        const terrain = this.terrainAt(p.gx, p.gy);
        this.stepTimer = p.running ? 0.11 : 0.22;
        const s = gridToScreen(p.gx, p.gy);
        if (terrain === 'water') {
          this.particles.burst(s.x, s.y - 1, { count: 3, textures: ['pixel'], colors: [0x8fd0ff, 0xffffff], speed: [15, 35], life: [0.2, 0.35], gravity: 160, angle: [-Math.PI * 0.85, -Math.PI * 0.15] });
        } else if (terrain === 'bush' || terrain === 'tall') {
          this.particles.burst(s.x, s.y - 6, { count: 2, textures: ['pixel'], colors: [0x2cb02a, 0x82f24a, 0x14701a], speed: [10, 30], life: [0.3, 0.5], gravity: 90, angle: [-Math.PI * 0.9, -Math.PI * 0.1] });
        } else if (p.running) {
          this.particles.burst(s.x, s.y - 1, { count: 1, textures: ['pixel'], colors: [0xe8dcc0, 0xc8b894], speed: [5, 15], life: [0.25, 0.4], gravity: -20, drag: 4 });
        }
      }
    }
    // Pee stream: little yellow drops falling from Zampanò.
    if (this.streamTimer > 0) {
      this.streamTimer -= dt;
      const s = gridToScreen(this.player.gx, this.player.gy);
      const back = dirToScreenVector(this.player.facing);
      this.particles.burst(s.x - back.x * 6, s.y - 8, {
        count: 1,
        textures: ['pixel'],
        colors: [0xffe23a, 0xfff36a],
        speed: [10, 25],
        life: [0.18, 0.3],
        gravity: 260,
        angle: [Math.PI * 0.3, Math.PI * 0.7],
      });
    }
    // Bark sound waves `)))` travelling in the facing direction.
    for (let k = this.waves.length - 1; k >= 0; k--) {
      const w = this.waves[k]!;
      w.t += dt;
      if (w.t >= w.life) {
        w.sprite.destroy();
        this.waves.splice(k, 1);
        continue;
      }
      if (w.t < 0) continue;
      const u = w.t / w.life;
      w.sprite.visible = true;
      w.sprite.position.set(Math.round(w.ox + w.dx * u), Math.round(w.oy + w.dy * u));
      w.sprite.scale.set(u < 0.5 ? 1 : 2);
      w.sprite.alpha = u < 0.75 ? 1 : 0.5;
    }
    // Rings: iso ellipses expanding to the cleaned radius (grid circle → screen ellipse).
    const g = this.ringG;
    g.clear();
    for (let k = this.rings.length - 1; k >= 0; k--) {
      const r = this.rings[k]!;
      r.t += dt;
      if (r.t >= r.dur) {
        this.rings.splice(k, 1);
        continue;
      }
      if (r.t < 0) continue;
      const u = r.t / r.dur;
      const e = 1 - (1 - u) * (1 - u);
      const rx = r.radius * 16 * Math.SQRT2 * e;
      const ry = r.radius * 8 * Math.SQRT2 * e;
      g.ellipse(Math.round(r.x), Math.round(r.y), Math.max(1, rx), Math.max(1, ry)).stroke({ width: 1, color: r.color, alpha: 1 - u });
    }
    // Digestion warning bubble above Zampanò's head.
    const w = this.bubbleState();
    if (w >= 0) {
      const s = gridToScreen(this.player.gx, this.player.gy);
      this.bubble.visible = w > 1 || Math.floor(this.time * 8) % 2 === 0;
      this.bubble.position.set(Math.round(s.x + 6), Math.round(s.y - 34 - Math.abs(Math.sin(this.time * 6)) * 2));
    } else {
      this.bubble.visible = false;
    }
  }
}
