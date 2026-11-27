import { TREAT } from '../config';
import { Rng } from '../core/rng';
import type { SpawnSettings } from '../world/level';
import type { GameMap } from '../world/map';
import { Ground } from '../world/tiles';

type TreatSettings = SpawnSettings['treats'];

/** A group's shape: a short row, an arc, a little circle, a diamond, or one treat alone. */
export type TreatShape = (typeof TREAT.GROUPS)[number]['shape'] | 'lone';

export interface TreatGroup {
  shape: TreatShape;
  points: Array<{ x: number; y: number }>;
}

/**
 * The points of one group around (0, 0): `n` treats TREAT.GROUP_SPACING apart, turned by `angle`
 * (radians, grid space). Shapes lie on the ground, so a circle reads as a flat ring on screen and
 * a square on the grid as a diamond.
 */
export function groupShape(shape: TreatShape, n: number, angle: number): Array<{ x: number; y: number }> {
  const s = TREAT.GROUP_SPACING;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const turn = (x: number, y: number) => ({ x: x * cos - y * sin, y: x * sin + y * cos });
  switch (shape) {
    case 'row':
      return Array.from({ length: n }, (_, k) => turn((k - (n - 1) / 2) * s, 0));
    case 'arc': {
      // On a circle of ARC_RADIUS, neighbours one spacing apart, the middle of the arc at (0, 0).
      const r = TREAT.ARC_RADIUS;
      const step = 2 * Math.asin(Math.min(1, s / (2 * r)));
      return Array.from({ length: n }, (_, k) => {
        const a = (k - (n - 1) / 2) * step;
        return turn(r * Math.cos(a) - r, r * Math.sin(a));
      });
    }
    case 'circle': {
      const r = s / (2 * Math.sin(Math.PI / n));
      return Array.from({ length: n }, (_, k) => turn(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n)));
    }
    case 'diamond': {
      // The outline of a square (8), or its four corners round a middle treat (5).
      if (n >= 8) {
        const ring = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]] as const;
        return ring.map(([a, b]) => turn(a * s, b * s));
      }
      const c = s / Math.SQRT2;
      const five = [[0, 0], [-c, -c], [c, -c], [c, c], [-c, c]] as const;
      return five.map(([a, b]) => turn(a, b));
    }
    case 'lone':
      return [{ x: 0, y: 0 }];
  }
}

/**
 * Deterministic treat placement, like the rings of a Sonic level: `count` treats in small groups
 * (TREAT.GROUPS) scattered over all the ground reachable from the start, lawns, gravel and lanes,
 * so the dog meets a group, then open ground, then another group somewhere else: not a trail.
 */
export function placeTreats(map: GameMap, settings: TreatSettings, seed: number): Array<{ x: number; y: number }> {
  return treatGroups(map, settings, seed).flatMap((g) => g.points);
}

/**
 * The groups behind `placeTreats`. Each group goes round a spot drawn among those farthest from
 * every treat placed so far (within TREAT.CENTRE_SLACK of the farthest): the whole park is
 * covered evenly, without lining the groups up on a lattice. A shape that does not fit there (a
 * hedge, a trunk, the pond) is turned, shifted, then shrunk, down to one treat alone: the spot is
 * never left empty. The last TREAT.LONE treats go alone into the widest gaps. Treats stay off
 * water and props, clear of hedges and trunks, away from the start and the exit, and at least
 * TREAT.GROUP_GAP from any other group.
 */
export function treatGroups(map: GameMap, settings: TreatSettings, seed: number): TreatGroup[] {
  const rng = new Rng(seed);
  const { width, height } = map;
  const reach = map.bfs(map.startTile.i, map.startTile.j);
  // Dry ground without a prop, that the dog can reach from the start; and the park's edge.
  const dry = new Uint8Array(width * height);
  const blocked = new Uint8Array(width * height);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const k = map.index(i, j);
      dry[k] = map.isWalkable(i, j) && map.groundAt(i, j) !== Ground.Water && !map.propAt(i, j) && reach[k]! >= 0 ? 1 : 0;
      blocked[k] = map.isBlockedTile(i, j) ? 1 : 0;
    }
  }
  const tileOk = (i: number, j: number) => map.inBounds(i, j) && dry[map.index(i, j)] === 1;
  const c = TREAT.CLEARANCE;
  const end2 = TREAT.ROUTE_END_GAP * TREAT.ROUTE_END_GAP;
  const pointOk = (x: number, y: number) => {
    if ((x - map.start.x) ** 2 + (y - map.start.y) ** 2 < end2) return false;
    if ((x - map.exit.x) ** 2 + (y - map.exit.y) ** 2 < end2) return false;
    // The tile under it and the ground a clearance around it: never hanging over a pond or a bush.
    if (!tileOk(Math.floor(x), Math.floor(y)) || !tileOk(Math.floor(x + c), Math.floor(y))) return false;
    if (!tileOk(Math.floor(x - c), Math.floor(y)) || !tileOk(Math.floor(x), Math.floor(y + c))) return false;
    if (!tileOk(Math.floor(x), Math.floor(y - c))) return false;
    return !map.circleBlocked(x, y, c);
  };

  const groups: TreatGroup[] = [];
  // Every treat placed so far, flat (x, y, x, y...), for the distance to the other groups.
  const placedXY: number[] = [];
  const gap2 = TREAT.GROUP_GAP * TREAT.GROUP_GAP;
  const farFromGroups = (x: number, y: number) => {
    for (let k = 0; k < placedXY.length; k += 2) if ((placedXY[k]! - x) ** 2 + (placedXY[k + 1]! - y) ** 2 < gap2) return false;
    return true;
  };

  // Candidate spots: every tile centre that could hold a treat, with its (squared) distance to
  // the nearest treat placed so far. The park's edge counts as a treat seen in a mirror
  // (TREAT.EDGE_WEIGHT times the distance to the hedge), or the farthest spots would all be
  // against the hedges.
  const sx: number[] = [];
  const sy: number[] = [];
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      if (!pointOk(i + 0.5, j + 0.5)) continue;
      sx.push(i + 0.5);
      sy.push(j + 0.5);
    }
  }
  const edge = TREAT.EDGE_WEIGHT as number;
  const near2 = sx.map((x, k) => (edge > 0 ? (edge * edgeDistance(blocked, width, height, x, sy[k]!, TREAT.EDGE_SCAN)) ** 2 : Infinity));

  const rows = TREAT.GROUPS.find((g) => g.shape === 'row')?.sizes ?? [];
  const totalWeight = TREAT.GROUPS.reduce((sum, g) => sum + g.weight, 0);
  const drawKind = () => {
    let w = rng.range(0, totalWeight);
    for (const g of TREAT.GROUPS) {
      w -= g.weight;
      if (w < 0) return g;
    }
    return TREAT.GROUPS[TREAT.GROUPS.length - 1]!;
  };
  const shifts: Array<readonly [number, number]> = [[0, 0]];
  for (const d of TREAT.FIT_SHIFTS) {
    for (let k = 0; k < 8; k++) shifts.push([Math.cos((k * Math.PI) / 4) * d, Math.sin((k * Math.PI) / 4) * d]);
  }

  const fit = (at: { x: number; y: number }, left: number): TreatGroup => {
    const kind = drawKind();
    const size = rng.pick(kind.sizes);
    // The drawn shape at its size, then smaller; then a short row; then one treat alone.
    const tries: Array<[TreatShape, number]> = [];
    for (const n of [...kind.sizes].sort((a, b) => b - a)) if (n <= size && n <= left) tries.push([kind.shape, n]);
    if (kind.shape !== 'row') for (const n of [...rows].sort((a, b) => b - a)) if (n <= left) tries.push(['row', n]);
    tries.push(['lone', 1]);
    const turn0 = rng.int(0, 7);
    for (const [shape, n] of tries) {
      // A diamond is a diamond on screen only square to the grid; a lone treat has nothing to turn.
      const turns = shape === 'diamond' || shape === 'lone' ? 1 : 8;
      for (let r = 0; r < turns; r++) {
        // A row along the grid's diagonal (1, 1) runs straight up the screen, where a spacing
        // of 0.9 tiles is only 10 px and the bobbing bones stack into each other.
        if (shape === 'row' && (turn0 + r) % 4 === 1) continue;
        const pts = groupShape(shape, n, shape === 'diamond' ? 0 : (((turn0 + r) % 8) * Math.PI) / 4);
        for (const [dx, dy] of shifts) {
          const fits = pts.every((p) => pointOk(at.x + p.x + dx, at.y + p.y + dy) && farFromGroups(at.x + p.x + dx, at.y + p.y + dy));
          if (fits) return { shape, points: pts.map((p) => ({ x: at.x + p.x + dx, y: at.y + p.y + dy })) };
        }
      }
    }
    // Not reached: the spot itself holds a treat and is far enough from every group.
    return { shape: 'lone', points: [{ x: at.x, y: at.y }] };
  };

  let total = 0;
  const lone = Math.min(TREAT.LONE, settings.count);
  while (total < settings.count && sx.length) {
    let best2 = 0;
    for (const g of near2) best2 = Math.max(best2, g);
    if (best2 < gap2) break; // the park is full
    // Groups first, then the last few treats alone, each into the widest gap left.
    const budget = settings.count - lone - total;
    const bar2 = budget > 0 ? Math.max(gap2, best2 * TREAT.CENTRE_SLACK * TREAT.CENTRE_SLACK) : best2;
    const pool: number[] = [];
    for (let k = 0; k < sx.length; k++) if (near2[k]! >= bar2) pool.push(k);
    const pick = rng.pick(pool);
    const at = { x: sx[pick]!, y: sy[pick]! };
    const group: TreatGroup = budget > 0 ? fit(at, budget) : { shape: 'lone', points: [at] };
    groups.push(group);
    total += group.points.length;
    for (const p of group.points) {
      placedXY.push(p.x, p.y);
      for (let k = 0; k < sx.length; k++) near2[k] = Math.min(near2[k]!, (p.x - sx[k]!) ** 2 + (p.y - sy[k]!) ** 2);
    }
  }
  return groups;
}

/** Distance from (x, y) to the nearest blocked tile (hedge, forest, outside the map), up to `max`. */
function edgeDistance(blocked: Uint8Array, width: number, height: number, x: number, y: number, max: number): number {
  let best2 = max * max;
  const r = Math.ceil(max);
  const ci = Math.floor(x);
  const cj = Math.floor(y);
  for (let j = cj - r; j <= cj + r; j++) {
    for (let i = ci - r; i <= ci + r; i++) {
      if (i >= 0 && j >= 0 && i < width && j < height && blocked[j * width + i] === 0) continue;
      const dx = x - Math.max(i, Math.min(x, i + 1));
      const dy = y - Math.max(j, Math.min(y, j + 1));
      best2 = Math.min(best2, dx * dx + dy * dy);
    }
  }
  return Math.sqrt(best2);
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
