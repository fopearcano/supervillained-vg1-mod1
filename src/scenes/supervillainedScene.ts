import { BlurFilter, Container, Graphics, Sprite } from 'pixi.js';
import { spriteName } from '../assets/manifest';
import { SUPERVILLAINED as SV } from '../config';
import { textures } from '../core/assets';
import type { Game } from '../core/game';
import type { Scene } from '../core/scene';
import { loadTitleArt, titleTexture, type TitleArt } from '../ui/titleArt';

const SPARK_TINTS = [0xffffff, 0xd4ff3a, 0xffe23a, 0xff4fd8, 0x3ff0ff];

interface Spark {
  s: Sprite;
  vx: number;
  vy: number;
  age: number;
  life: number;
  spin: number;
}

/**
 * The end of a level: "You've been supervillained" snaps in all at once over the frozen level
 * (oversized, a white flash, a shake, a bark), a burst of sparkle and star sprites flies out of
 * it, then `onDone` shows the level's final info (after SV.HOLD seconds, or a tap).
 */
export class SupervillainedScene implements Scene {
  readonly root = new Container();
  readonly pausesBelow = true;
  private readonly dim = new Graphics();
  private readonly flash = new Graphics();
  private readonly stage = new Container();
  private readonly logo = new Sprite();
  private readonly glow = new Sprite();
  private readonly sparks: Spark[] = [];
  private art: TitleArt | null | undefined;
  private w = 216;
  private h = 400;
  /** Seconds since the snap (it starts once the picture is ready). */
  private time = -1;
  private finished = false;

  constructor(
    private readonly game: Game,
    private readonly onDone: () => void,
  ) {
    this.logo.anchor.set(0.5);
    this.glow.anchor.set(0.5);
    // A pale halo (normal blending: an additive glow vanishes on bright backgrounds).
    this.glow.tint = 0xfff3a0;
    this.glow.filters = [new BlurFilter({ strength: SV.GLOW_BLUR, quality: 3, resolution: 1 })];
    this.stage.addChild(this.glow, this.logo);
    this.root.addChild(this.dim, this.stage, this.flash);
    this.stage.visible = false;
    void loadTitleArt().then((art) => {
      this.art = art;
      this.layout();
    });
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.dim.clear().rect(0, 0, w, h).fill({ color: 0x000000, alpha: SV.DIM });
    this.flash.clear().rect(0, 0, w, h).fill({ color: 0xffffff });
    this.flash.alpha = 0;
    this.layout();
  }

  private layout(): void {
    if (!this.art) return;
    const a = this.art.logo;
    const width = Math.max(40, Math.min(Math.round(this.w * SV.WIDTH), Math.floor((this.h * SV.MAX_HEIGHT * a.naturalWidth) / a.naturalHeight)));
    const tex = titleTexture(a, width);
    this.logo.texture = tex;
    this.glow.texture = tex;
    this.stage.position.set(Math.round(this.w / 2), Math.round(this.h * SV.Y));
  }

  update(dt: number): void {
    const input = this.game.input;
    if (this.art === null) return this.finish(); // the picture is missing: straight to the info
    if (this.art === undefined) return;
    if (this.time < 0) this.snap();
    this.time += dt;
    const t = this.time;

    // The snap: from SNAP_FROM times the size down to it, then a decaying thump.
    let scale: number;
    if (t < SV.SNAP_TIME) {
      const p = t / SV.SNAP_TIME;
      scale = SV.SNAP_FROM + (1 - SV.SNAP_FROM) * (1 - (1 - p) ** 3);
    } else {
      const u = t - SV.SNAP_TIME;
      scale = 1 + SV.BOUNCE * Math.exp(-SV.BOUNCE_DECAY * u) * Math.sin(SV.BOUNCE_FREQ * u);
    }
    this.logo.scale.set(scale);
    this.glow.scale.set(scale * SV.GLOW_SCALE);
    const [ga, gb] = SV.GLOW_ALPHA;
    this.glow.alpha = t < SV.SNAP_TIME ? 0 : ga + (gb - ga) * (0.5 + 0.5 * Math.sin(t * SV.GLOW_SPEED));
    const shake = t < SV.SHAKE_TIME ? SV.SHAKE * (1 - t / SV.SHAKE_TIME) : 0;
    this.stage.position.set(
      Math.round(this.w / 2 + (Math.random() * 2 - 1) * shake),
      Math.round(this.h * SV.Y + (Math.random() * 2 - 1) * shake),
    );
    this.flash.alpha = Math.max(0, 1 - t / SV.FLASH_TIME) * 0.9;

    for (const k of this.sparks) {
      k.age += dt;
      k.vy += SV.SPARK_GRAVITY * dt;
      k.s.x += k.vx * dt;
      k.s.y += k.vy * dt;
      k.s.rotation += k.spin * dt;
      const left = 1 - k.age / k.life;
      k.s.alpha = Math.max(0, Math.min(1, left * 2));
      k.s.visible = left > 0;
    }

    const taps = input.consumeTaps().length > 0 || input.consumeContinue();
    if (t >= SV.HOLD || (taps && t >= SV.SKIP_AFTER)) this.finish();
  }

  /** The moment it appears: sounds, the burst of sprites. */
  private snap(): void {
    this.time = 0;
    this.stage.visible = true;
    this.game.audio.play('glitch');
    this.game.audio.play('bark');
    this.game.audio.play('star', { rate: 1.5 });
    const rnd = (r: readonly number[]) => r[0]! + Math.random() * (r[1]! - r[0]!);
    const halfW = this.logo.texture.width / 2;
    const halfH = this.logo.texture.height / 2;
    for (let i = 0; i < SV.SPARKS; i++) {
      const star = i % 3 === 0;
      const s = new Sprite(textures.get(star ? spriteName('star', i % 3) : spriteName('sparkle')));
      s.anchor.set(0.5);
      s.tint = star ? 0xffffff : SPARK_TINTS[i % SPARK_TINTS.length]!;
      const ang = (i / SV.SPARKS) * Math.PI * 2 + Math.random() * 0.4;
      // From the logo's edge outward.
      s.position.set(Math.cos(ang) * halfW * 0.8, Math.sin(ang) * halfH * 0.8);
      const v = rnd(SV.SPARK_SPEED);
      this.sparks.push({ s, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 40, age: 0, life: rnd(SV.SPARK_LIFE), spin: (Math.random() * 2 - 1) * 6 });
      this.stage.addChildAt(s, 1); // behind the logo, in front of its halo
    }
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.onDone();
  }
}
