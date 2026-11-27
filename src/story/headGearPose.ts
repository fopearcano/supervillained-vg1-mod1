import type { HeadFit } from '../assets/manifest';
import { STORY } from '../config';
import type { Dir8 } from '../iso/projection';

/**
 * Where the bucket (1.1) or the great helm (2.1) sits on Zampanò's head, relative to his feet, and
 * how far it has tipped. Pure (tests/headGear.test.ts); story/headGear.ts applies it to the sprite.
 */
export interface GearPose {
  x: number;
  y: number;
  rotation: number;
}

/** Which way it tips over his eyes: clockwise when he faces right, the other way when left. */
export const TIP: Readonly<Record<Dir8, number>> = { N: 0, NE: 1, E: 1, SE: 1, S: 0, SW: -1, W: -1, NW: -1 };

export interface WornInput {
  fit: HeadFit;
  dir: Dir8;
  sniffing: boolean;
  /** Px from his eyes to the sprite's anchor while it is pushed up (GEAR_FIT). */
  rest: number;
  /** How far down it has slid: ctx.visor / STORY.VISOR.MAX, 0..1. */
  down: number;
  /** His sprite's squash & stretch and tremble (the head moves with them). */
  scaleX: number;
  scaleY: number;
  offsetX: number;
  /** Extra radians while he walks (the rattle). */
  rattle: number;
}

export function wornPose(i: WornInput, out: GearPose = { x: 0, y: 0, rotation: 0 }): GearPose {
  const G = STORY.HEAD_GEAR;
  const k = Math.max(0, Math.min(1, i.down));
  const [ex, ey] = i.fit.eyes[i.dir];
  const low = i.sniffing ? (i.fit.sniff[i.dir] ?? 0) : 0;
  out.x = Math.round(ex * i.scaleX + i.offsetX);
  out.y = Math.round((ey + low) * i.scaleY + i.rest + G.DROP * k);
  // Leans back while pushed up, tips forward over his eyes as it slides down.
  const tilt = TIP[i.dir] * (G.TILT_DOWN * k - G.TILT_UP * (1 - k)) + i.rattle;
  out.rotation = Math.round(tilt / G.TILT_STEP) * G.TILT_STEP;
  return out;
}
