import { AMBUSH } from '../config';
import { screenToGrid } from '../iso/projection';
import type { GameMap } from '../world/map';
import { Ground } from '../world/tiles';

export interface Point {
  x: number;
  y: number;
}

/** A band member's way in: where it starts, and whether that is outside the view. */
export interface Entry extends Point {
  offscreen: boolean;
}

/** A band member's body radius for placement checks (an Actor moves as a 0.25 circle). */
export const BAND_BODY = 0.3;

/** Solid dry ground, the body clear of hedges, trees and water. */
export function standsAt(map: GameMap, x: number, y: number, r = BAND_BODY): boolean {
  const i = Math.floor(x);
  const j = Math.floor(y);
  return map.isWalkable(i, j) && map.groundAt(i, j) !== Ground.Water && !map.circleBlocked(x, y, r);
}

/** A straight run from a to b stays on dry, open ground all the way (actors go in straight lines). */
export function clearRun(map: GameMap, a: Point, b: Point, r = AMBUSH.RUN_BODY): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(d / 0.25));
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    if (!standsAt(map, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, r)) return false;
  }
  return true;
}

/**
 * Where a band member starts its run at NOW!: just outside the view, in screen direction
 * (`sx`, `sy`: x right, y down) from Zampanò, on open ground with a straight run in to him.
 * The view is `halfW` × `halfH` logical px around him. Nearby angles are tried when the exact one
 * is blocked (a hedge, the pond, the park's edge); failing all, the farthest clear spot inside the
 * view on those lines (offscreen false); null if there is none at all. Pure (tests/ambush.test.ts).
 */
export function offscreenEntry(map: GameMap, from: Point, sx: number, sy: number, halfW: number, halfH: number): Entry | null {
  const base = Math.atan2(sy, sx);
  const margin = AMBUSH.ENTRY_MARGIN;
  let inside: Entry | null = null;
  let insideD = 0;
  for (const deg of AMBUSH.ENTRY_ANGLES) {
    const a = base + (deg * Math.PI) / 180;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    // The screen distance at which a point in this direction leaves the view, plus the margin.
    const edge = Math.min(Math.abs(ux) > 1e-6 ? halfW / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-6 ? halfH / Math.abs(uy) : Infinity);
    for (const extra of AMBUSH.ENTRY_STEPS) {
      const p = at(from, ux, uy, edge + margin + extra);
      if (standsAt(map, p.x, p.y) && clearRun(map, p, from)) return { ...p, offscreen: true };
    }
    // Inside the view on this line: the farthest clear spot, for when nothing outside works.
    for (let d = edge; d >= AMBUSH.ENTRY_MIN_PX; d -= 8) {
      if (d <= insideD) break;
      const p = at(from, ux, uy, d);
      if (standsAt(map, p.x, p.y) && clearRun(map, p, from)) {
        inside = { ...p, offscreen: false };
        insideD = d;
        break;
      }
    }
  }
  return inside;
}

function at(from: Point, ux: number, uy: number, d: number): Point {
  const g = screenToGrid(ux * d, uy * d);
  return { x: from.x + g.x, y: from.y + g.y };
}
