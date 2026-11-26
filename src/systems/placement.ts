import { TREAT } from '../config';
import { Rng } from '../core/rng';
import type { SpawnSettings } from '../world/level';
import type { GameMap } from '../world/map';
import { Ground } from '../world/tiles';

type TreatSettings = SpawnSettings['treats'];

/**
 * Deterministic treat placement: walk along the path from start to exit and drop treats at
 * regular intervals, offset sideways onto free tiles near the path. A level with a `route` gets
 * its trail on that road instead, plus `side` treats out on the side lanes (`placeAlongRoute`).
 */
export function placeTreats(map: GameMap, settings: TreatSettings, seed: number): Array<{ x: number; y: number }> {
  if (settings.route && settings.route.length >= 2) return placeAlongRoute(map, settings, settings.route, seed);
  const rng = new Rng(seed);
  const startDist = map.exitDistance[map.index(map.startTile.i, map.startTile.j)]!;
  // A canonical shortest route makes a readable breadcrumb trail even through broad plazas,
  // where sorting every same-distance path tile could put all food on a parallel lane.
  const path: Array<{ i: number; j: number; d: number }> = [];
  let ci = map.startTile.i;
  let cj = map.startTile.j;
  for (let guard = 0; guard <= map.width * map.height; guard++) {
    const d = map.exitDistance[map.index(ci, cj)]!;
    if (d < 0) break;
    if (map.groundAt(ci, cj) !== Ground.Water) path.push({ i: ci, j: cj, d });
    if (d === 0) break;
    const next = ([
      [ci + 1, cj],
      [ci - 1, cj],
      [ci, cj + 1],
      [ci, cj - 1],
    ] as const).find(([i, j]) => map.isWalkable(i, j) && map.exitDistance[map.index(i, j)] === d - 1);
    if (!next) break;
    [ci, cj] = next;
  }
  const out: Array<{ x: number; y: number }> = [];
  if (!path.length || settings.count <= 0) return out;
  const step = Math.max(1, (startDist - 4) / settings.count);
  let nextD = startDist - 3;
  while (out.length < settings.count && nextD > 1) {
    // Pick near the requested progress slice on that canonical route.
    const candidates = [...path]
      .sort((a, b) => Math.abs(a.d - nextD) - Math.abs(b.d - nextD))
      .slice(0, 28);
    let placed = false;
    for (const t of candidates) {
      for (let attempt = 0; attempt < 8; attempt++) {
        // The first attempt is visibly on the gravel; later attempts add organic side placement.
        const oi = t.i + (attempt === 0 ? 0 : rng.int(-settings.maxOffset, settings.maxOffset));
        const oj = t.j + (attempt === 0 ? 0 : rng.int(-settings.maxOffset, settings.maxOffset));
        if (!map.isWalkable(oi, oj) || map.groundAt(oi, oj) === Ground.Water) continue;
        const x = oi + rng.range(0.35, 0.65);
        const y = oj + rng.range(0.35, 0.65);
        if (out.some((p) => Math.hypot(p.x - x, p.y - y) < settings.minSpacing)) continue;
        if (Math.hypot(map.start.x - x, map.start.y - y) < 2) continue;
        out.push({ x, y });
        placed = true;
        break;
      }
      if (placed) break;
    }
    nextD -= step;
  }
  return out;
}

/** A route in world units (tile centres) with the arc length from the start at each corner. */
interface RouteLine {
  pts: Array<{ x: number; y: number }>;
  at: number[];
  length: number;
}

function routeLine(route: NonNullable<TreatSettings['route']>): RouteLine {
  const pts = route.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }));
  const at = [0];
  for (let k = 1; k < pts.length; k++) at.push(at[k - 1]! + Math.hypot(pts[k]!.x - pts[k - 1]!.x, pts[k]!.y - pts[k - 1]!.y));
  return { pts, at, length: at[at.length - 1]! };
}

/** The point at arc length `s` along the route, and the route's unit direction there. */
function pointOnRoute(line: RouteLine, s: number): { x: number; y: number; dx: number; dy: number } {
  let k = 1;
  while (k < line.pts.length - 1 && line.at[k]! < s) k++;
  const a = line.pts[k - 1]!;
  const b = line.pts[k]!;
  const len = line.at[k]! - line.at[k - 1]!;
  if (len <= 0) return { x: a.x, y: a.y, dx: 0, dy: 0 };
  const t = Math.max(0, Math.min(1, (s - line.at[k - 1]!) / len));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
}

/** Shortest distance from (x, y) to the route. */
function distanceToRoute(line: RouteLine, x: number, y: number): number {
  return nearestOnRoute(line, x, y).distance;
}

function nearestOnRoute(line: RouteLine, x: number, y: number): { distance: number; x: number; y: number; vx: number; vy: number } {
  let best = { distance: Infinity, x: 0, y: 0, vx: 1, vy: 0 };
  for (let k = 1; k < line.pts.length; k++) {
    const a = line.pts[k - 1]!;
    const b = line.pts[k]!;
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const l2 = vx * vx + vy * vy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / l2)) : 0;
    const px = a.x + vx * t;
    const py = a.y + vy * t;
    const d = Math.hypot(px - x, py - y);
    if (d < best.distance) best = { distance: d, x: px, y: py, vx, vy };
  }
  return best;
}

/**
 * Treats for a level with a designed road. First `count` along the road at even spacing, so a
 * dog walking it meets one every few tiles; each is nudged sideways only when its tile is water,
 * a solid prop or too close to another treat. Then `side` more on the gravel lanes away from the
 * road (the loops and the spine), spread evenly over all of them: each on the lane tile farthest
 * from every treat placed so far, rewarding a detour anywhere in the park.
 */
function placeAlongRoute(
  map: GameMap,
  settings: TreatSettings,
  route: NonNullable<TreatSettings['route']>,
  seed: number,
): Array<{ x: number; y: number }> {
  const rng = new Rng(seed);
  const line = routeLine(route);
  const out: Array<{ x: number; y: number }> = [];
  // Dry walkable ground that still leads to the exit (a hedged-in pocket would be a cruel bone).
  const fits = (i: number, j: number) =>
    map.isWalkable(i, j) && map.groundAt(i, j) !== Ground.Water && map.exitDistance[map.index(i, j)]! >= 0;
  const free = (x: number, y: number) =>
    !out.some((p) => Math.hypot(p.x - x, p.y - y) < settings.minSpacing) &&
    Math.hypot(map.start.x - x, map.start.y - y) >= TREAT.ROUTE_END_GAP;

  const n = settings.count;
  const endGap = Math.min(TREAT.ROUTE_END_GAP, line.length / 2);
  for (let k = 0; k < n; k++) {
    const s = n === 1 ? line.length / 2 : endGap + ((line.length - 2 * endGap) * k) / (n - 1);
    const at = pointOnRoute(line, s);
    // On the road first (wandering a little), then further out on either side in turn.
    const first = rng.chance(0.5) ? 1 : -1;
    const offsets = [rng.range(-TREAT.ROUTE_WANDER, TREAT.ROUTE_WANDER)];
    for (let o = 1; o <= settings.maxOffset; o++) offsets.push(first * o, -first * o);
    for (const off of offsets) {
      const px = at.x - at.dy * off;
      const py = at.y + at.dx * off;
      const i = Math.floor(px);
      const j = Math.floor(py);
      if (!fits(i, j)) continue;
      // Away from the tile's edges, so a bone never hangs over the pond or hedge next to it.
      const x = Math.max(i + 0.3, Math.min(i + 0.7, px));
      const y = Math.max(j + 0.3, Math.min(j + 0.7, py));
      if (!free(x, y)) continue;
      out.push({ x, y });
      break;
    }
  }

  const extra = settings.side ?? 0;
  if (extra <= 0) return out;
  const lanes: Array<{ i: number; j: number; progress: number }> = [];
  for (let j = 0; j < map.height; j++) {
    for (let i = 0; i < map.width; i++) {
      if (map.groundAt(i, j) !== Ground.Path || !fits(i, j)) continue;
      if (distanceToRoute(line, i + 0.5, j + 0.5) < TREAT.SIDE_MIN_ROUTE_DISTANCE) continue;
      lanes.push({ i, j, progress: map.progressAt(i + 0.5, j + 0.5) });
    }
  }
  // Spread over the whole lane network, not one per strip of the walk: each side treat goes on
  // the lane tile farthest from every treat placed so far (road trail included), so every loop
  // and lane gets its share, as evenly as the lanes allow.
  const [p0, p1] = TREAT.SIDE_PROGRESS;
  const pool = lanes.filter((t) => t.progress >= p0 && t.progress < p1);
  const gap = pool.map((t) => {
    let g = Infinity;
    for (const p of out) g = Math.min(g, Math.hypot(p.x - t.i - 0.5, p.y - t.j - 0.5));
    return g;
  });
  for (let b = 0; b < extra; b++) {
    // Strictly farther wins, so ties go to the first tile in row order: deterministic.
    let best = -1;
    for (let k = 0; k < pool.length; k++) if (best < 0 || gap[k]! > gap[best]!) best = k;
    if (best < 0 || gap[best]! < settings.minSpacing) break;
    const t = pool[best]!;
    const x = t.i + rng.range(0.35, 0.65);
    const y = t.j + rng.range(0.35, 0.65);
    // The tile centre is known to be far enough; the jittered spot is checked again.
    const spot = free(x, y) ? { x, y } : { x: t.i + 0.5, y: t.j + 0.5 };
    out.push(spot);
    for (let k = 0; k < pool.length; k++) gap[k] = Math.min(gap[k]!, Math.hypot(spot.x - pool[k]!.i - 0.5, spot.y - pool[k]!.j - 0.5));
  }
  return out;
}

/** Random walkable spot at a distance in [minD, maxD] from (x, y), or null. */
export function randomSpotNear(
  map: GameMap,
  x: number,
  y: number,
  minD: number,
  maxD: number,
  rng: Rng,
  accept: (i: number, j: number) => boolean = () => true,
): { x: number; y: number } | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(minD, maxD);
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    const i = Math.floor(px);
    const j = Math.floor(py);
    if (!map.isWalkable(i, j) || !accept(i, j)) continue;
    if (map.groundAt(i, j) === Ground.Water) continue;
    return { x: i + 0.5, y: j + 0.5 };
  }
  return null;
}
