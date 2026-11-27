import { Sprite } from 'pixi.js';
import { GEAR_FIT, headFit, spriteName } from '../assets/manifest';
import { PLAYER, STORY } from '../config';
import { textures } from '../core/assets';
import type { Point } from '../entities/actor';
import { Entity } from '../entities/entity';
import { gridVecToScreen } from '../iso/projection';
import { wornPose, type GearPose, type WornInput } from './headGearPose';
import type { StoryScene } from './storyScene';
import type { VisorStyle } from './visorOverlay';

const SPRITE_OF = { bucket: 'sandBucket', helmet: 'bigHelm' } as const satisfies Record<VisorStyle, keyof typeof GEAR_FIT>;

type Mode = 'worn' | 'tumble' | 'roll' | 'lying' | 'lift' | 'gone';

/**
 * The bucket (1.1) or the great helm (2.1) on Zampanò's head: an entity of its own, right after
 * him in the depth order, that slides down over his eyes as the visor rises (ctx.visor), rattles
 * while he walks, and comes off at the end: knocked away to tumble across the lane and lie there
 * (the bucket), or lifted off to fade (the helm).
 */
class HeadGear extends Entity {
  private readonly sprite: Sprite;
  private readonly shadow: Sprite;
  private readonly rest: number;
  private mode: Mode = 'worn';
  private t = 0;
  /** Walking clock for the rattle. */
  private clock = 0;
  /** Which way it flies (a unit vector on the grid). */
  private dirX = 0;
  private dirY = 0;
  private fromX = 0;
  private fromY = 0;
  private angle = 0;
  private angleTo = 0;
  private readonly pose: GearPose = { x: 0, y: 0, rotation: 0 };
  private readonly input: WornInput;

  constructor(
    private readonly ctx: StoryScene,
    readonly kind: VisorStyle,
  ) {
    super();
    const key = SPRITE_OF[kind];
    this.rest = GEAR_FIT[key].rest;
    this.shadow = new Sprite(textures.get(spriteName('shadowSmall')));
    this.shadow.visible = false;
    this.sprite = new Sprite(textures.get(spriteName(key)));
    this.sprite.roundPixels = true;
    this.view.addChild(this.shadow, this.sprite);
    // Just after him in the depth order: over his head, under whatever stands in front of him.
    this.depthBias = 0.001;
    this.bounds = { x: -20, y: -54, w: 40, h: 58 };
    const p = ctx.player;
    this.setPosition(p.gx, p.gy);
    this.input = { fit: headFit(p.animator.key), dir: 'S', sniffing: false, rest: this.rest, down: 0, scaleX: 1, scaleY: 1, offsetX: 0, rattle: 0 };
    this.wear(0);
  }

  get worn(): boolean {
    return this.mode === 'worn';
  }

  override update(dt: number): void {
    if (this.mode === 'worn') this.wear(dt);
    else if (this.mode === 'tumble') this.tumble(dt);
    else if (this.mode === 'roll') this.roll(dt);
    else if (this.mode === 'lift') this.lift(dt);
  }

  private wear(dt: number): void {
    const p = this.ctx.player;
    this.gx = p.gx;
    this.gy = p.gy;
    this.z = p.z;
    const a = p.animator;
    const walking = Math.min(1, Math.hypot(p.vx, p.vy) / PLAYER.WALK_SPEED);
    this.clock += dt * walking;
    const G = STORY.HEAD_GEAR;
    const i = this.input;
    i.fit = headFit(a.key);
    i.dir = a.dir;
    i.sniffing = a.anim === 'sniff';
    i.down = this.ctx.visor / STORY.VISOR.MAX;
    i.scaleX = a.sprite.scale.x;
    i.scaleY = a.sprite.scale.y;
    i.offsetX = a.sprite.x;
    i.rattle = Math.sin(this.clock * G.JIGGLE_RATE) * G.JIGGLE * walking;
    const pose = wornPose(i, this.pose);
    this.sprite.position.set(pose.x, pose.y);
    this.sprite.rotation = pose.rotation;
  }

  /** Knocked off: flies away from `from` (or to his left on the screen), spinning. */
  knock(from: Point | null): void {
    const dx = from ? this.gx - from.x : -1;
    const dy = from ? this.gy - from.y : 1;
    const len = Math.hypot(dx, dy) || 1;
    this.dirX = dx / len;
    this.dirY = dy / len;
    this.fromX = this.sprite.x;
    this.fromY = this.sprite.y;
    // It spins the way it flies on the screen and lands on its side.
    const side = gridVecToScreen(dx, dy).x >= 0 ? 1 : -1;
    this.angle = this.sprite.rotation;
    this.angleTo = side * (STORY.HEAD_GEAR.TUMBLE.TURNS * 2 * Math.PI + Math.PI / 2);
    this.shadow.visible = true;
    this.mode = 'tumble';
    this.t = 0;
  }

  /** Lifted off: rises and fades away. */
  liftOff(): void {
    this.fromY = this.sprite.y;
    this.mode = 'lift';
    this.t = 0;
  }

  /** Px above the ground of the sprite's anchor while it lies on its side. */
  private get lyingY(): number {
    return -Math.floor(this.sprite.texture.frame.width / 2) + 1;
  }

  /** Moves it along its way at `speed` tiles/s; hedges and walls stop it. */
  private slide(dt: number, speed: number): void {
    const map = this.ctx.world?.map;
    if (!map || speed <= 0) return;
    const r = map.moveCircle(this.gx, this.gy, this.dirX * speed * dt, this.dirY * speed * dt, STORY.HEAD_GEAR.TUMBLE.RADIUS);
    this.gx = r.x;
    this.gy = r.y;
  }

  private tumble(dt: number): void {
    const T = STORY.HEAD_GEAR.TUMBLE;
    this.t += dt;
    const f = Math.min(1, this.t / T.FLIGHT);
    this.slide(dt, T.DIST / T.FLIGHT);
    // From his head down to the ground along an arc, the shadow under it.
    this.sprite.x = Math.round(this.fromX * (1 - f));
    this.sprite.y = Math.round(this.fromY + (this.lyingY - this.fromY) * f - T.HEIGHT * 4 * f * (1 - f));
    // Spin angles snap to steps (pixel art keeps its pixels).
    const a = this.angle + (this.angleTo - this.angle) * f;
    this.sprite.rotation = Math.round(a / T.SPIN_STEP) * T.SPIN_STEP;
    this.shadow.alpha = 0.4 + 0.5 * f;
    if (f >= 1) {
      this.mode = 'roll';
      this.t = 0;
    }
  }

  private roll(dt: number): void {
    const T = STORY.HEAD_GEAR.TUMBLE;
    this.t += dt;
    const f = Math.min(1, this.t / T.ROLL_TIME);
    // On its side it rolls on, slowing down, rocking less and less.
    this.slide(dt, ((2 * T.ROLL) / T.ROLL_TIME) * (1 - f));
    const rock = Math.sin(this.t * T.ROCK_RATE) * T.ROCK * (1 - f);
    this.sprite.rotation = this.angleTo + Math.round(rock / STORY.HEAD_GEAR.TILT_STEP) * STORY.HEAD_GEAR.TILT_STEP;
    if (f >= 1) {
      this.sprite.rotation = this.angleTo;
      this.mode = 'lying';
    }
  }

  private lift(dt: number): void {
    const L = STORY.HEAD_GEAR.LIFT;
    this.t += dt;
    const f = Math.min(1, this.t / L.TIME);
    this.sprite.y = Math.round(this.fromY - L.HEIGHT * f * (2 - f));
    this.sprite.alpha = 1 - f;
    if (f >= 1) {
      this.sprite.visible = false;
      this.mode = 'gone';
    }
  }
}

const gear = new WeakMap<StoryScene, HeadGear>();

/** The gear he wears now on this stage (null when none, or it came off). */
function current(ctx: StoryScene): HeadGear | null {
  const g = gear.get(ctx);
  return g && g.alive && ctx.world?.entities.includes(g) ? g : null;
}

/** Puts the bucket or the great helm on his head; the visor overlay takes its look. */
export function putOnHeadGear(ctx: StoryScene, kind: VisorStyle): void {
  if (!ctx.world) return;
  const old = current(ctx);
  if (old) ctx.world.removeEntity(old);
  const g = new HeadGear(ctx, kind);
  ctx.world.addEntity(g);
  gear.set(ctx, g);
  ctx.visorStyle = kind;
}

/**
 * Takes it off: 'knock' sends it tumbling away from `from` (a slap) to lie on the ground until
 * the stage changes; 'lift' raises it off his head and fades it.
 */
export function takeOffHeadGear(ctx: StoryScene, how: 'knock' | 'lift', from: Point | null = null): void {
  const g = current(ctx);
  gear.delete(ctx);
  if (!g?.worn) return;
  if (how === 'knock') g.knock(from);
  else g.liftOff();
}
