import { describe, expect, it } from 'vitest';
import { BLADDER, DIGESTION, ENERGY, HUNGER, SCORE, TREAT, ZONE } from '../src/config';
import { GREEN_ZONE_ROAD, LEVEL_1 } from '../src/levels/level1';
import { Bladder, Digestion, Energy, Hunger } from '../src/systems/needs';
import { groupShape, placeTreats, treatGroups } from '../src/systems/placement';
import { finalHealth, formatScore, formatTime, starBonus, starsFromHealth, timeBonus } from '../src/systems/scoring';
import { loadLevel } from '../src/world/level';
import { GameMap } from '../src/world/map';
import { Ground } from '../src/world/tiles';

describe('hunger', () => {
  it('drains faster when running', () => {
    const idle = new Hunger();
    const run = new Hunger();
    idle.update(10, 'idle');
    run.update(10, 'run');
    expect(run.value).toBeLessThan(idle.value);
    expect(HUNGER.START - idle.value).toBeCloseTo(HUNGER.DRAIN_IDLE * 10, 6);
  });

  it('reports starvation once', () => {
    const h = new Hunger();
    h.value = 0.5;
    expect(h.update(1, 'walk')).toBe(true);
    expect(h.update(1, 'walk')).toBe(false);
  });

  it('feeding is clamped to the max', () => {
    const h = new Hunger();
    h.feed(TREAT.HUNGER);
    expect(h.value).toBe(HUNGER.MAX);
  });
});

describe('digestion', () => {
  it('warns when full, then makes a poop due after the warning', () => {
    const d = new Digestion();
    const treatsToFill = Math.ceil(DIGESTION.MAX / TREAT.DIGESTION);
    let ev = null;
    for (let k = 0; k < treatsToFill; k++) ev = d.add(TREAT.DIGESTION);
    expect(ev).toBe('warning');
    expect(d.update(DIGESTION.WARNING_TIME - 0.1)).toBe(null);
    expect(d.update(0.2)).toBe('poop');
    expect(d.due).toBe(true);
    d.done();
    expect(d.due).toBe(false);
    expect(d.meter).toBeLessThan(DIGESTION.MAX);
  });

  it('carries overflow into a second warning', () => {
    const d = new Digestion();
    d.add(DIGESTION.MAX);
    d.add(DIGESTION.MAX);
    d.update(DIGESTION.WARNING_TIME + 0.01);
    expect(d.done()).toBe('warning');
  });
});

describe('bladder', () => {
  it('uses charges and regenerates over time', () => {
    const b = new Bladder();
    for (let k = 0; k < BLADDER.START_CHARGES; k++) expect(b.use()).toBe(true);
    expect(b.use()).toBe(false);
    b.update(BLADDER.REGEN_TIME * 0.5);
    expect(b.regenFraction).toBeCloseTo(0.5, 6);
    b.update(BLADDER.REGEN_TIME * 0.5 + 0.001);
    expect(b.charges).toBe(1);
  });

  it('drinking refills instantly with a cooldown', () => {
    const b = new Bladder();
    b.use();
    b.use();
    expect(b.drink()).toBe(true);
    expect(b.charges).toBe(b.max);
    b.use();
    expect(b.drink()).toBe(false);
    b.update(BLADDER.DRINK_COOLDOWN + 0.01);
    expect(b.drink()).toBe(true);
  });
});

describe('scoring and stars', () => {
  it('maps health to half stars', () => {
    expect(starsFromHealth(1)).toBe(5);
    expect(starsFromHealth(ZONE.HEALTH_FULL_STARS)).toBe(5);
    expect(starsFromHealth(ZONE.HEALTH_ZERO_STARS)).toBe(0);
    expect(starsFromHealth(0.2)).toBe(0);
    const mid = (ZONE.HEALTH_ZERO_STARS + ZONE.HEALTH_FULL_STARS) / 2;
    expect(starsFromHealth(mid)).toBe(2.5);
    for (let h = 0.7; h <= 1; h += 0.01) expect((starsFromHealth(h) * 2) % 1).toBe(0);
  });

  it('penalizes PEES < POOPS at the end of the level', () => {
    expect(finalHealth(0.95, 3, 3)).toBe(0.95);
    expect(finalHealth(0.95, 5, 3)).toBe(0.95);
    expect(finalHealth(0.95, 1, 3)).toBeCloseTo(0.95 - 2 * ZONE.PEE_DEFICIT_PENALTY, 9);
  });

  it('computes bonuses', () => {
    expect(timeBonus(100, 150)).toBe(50 * SCORE.TIME_BONUS_PER_SECOND);
    expect(timeBonus(200, 150)).toBe(0);
    expect(starBonus(3.5)).toBe(Math.round(3.5 * SCORE.STAR_BONUS));
  });

  it('formats like the video HUD', () => {
    expect(formatTime(34)).toBe('00:34');
    expect(formatTime(87.9)).toBe('01:27');
    expect(formatScore(42)).toBe('0042');
    expect(formatScore(5134)).toBe('5134');
  });
});

/**
 * Where (x, y) is relative to Level 1's road: distance to it, how far along it the nearest point
 * is (0 = start, 1 = exit), and its side (-1: the west of the screen, x < y; 1: the east).
 */
function onRoad(x: number, y: number): { dist: number; along: number; side: number } {
  const road = GREEN_ZONE_ROAD.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }));
  let length = 0;
  for (let k = 1; k < road.length; k++) length += Math.hypot(road[k]!.x - road[k - 1]!.x, road[k]!.y - road[k - 1]!.y);
  let best = { dist: Infinity, along: 0, side: 0 };
  let walked = 0;
  for (let k = 1; k < road.length; k++) {
    const a = road[k - 1]!;
    const b = road[k]!;
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const seg = Math.hypot(vx, vy);
    const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / (seg * seg)));
    const dist = Math.hypot(a.x + vx * t - x, a.y + vy * t - y);
    if (dist < best.dist) best = { dist, along: (walked + t * seg) / length, side: Math.sign(vx * (y - a.y) - vy * (x - a.x)) };
    walked += seg;
  }
  return best;
}

/** Sizes of the chains of treats each within `link` tiles of the next (connected components). */
function chains(points: ReadonlyArray<{ x: number; y: number }>, link: number): number[] {
  const seen = new Array<boolean>(points.length).fill(false);
  const sizes: number[] = [];
  for (let a = 0; a < points.length; a++) {
    if (seen[a]) continue;
    seen[a] = true;
    const stack = [a];
    let size = 0;
    while (stack.length) {
      const k = stack.pop()!;
      size++;
      for (let b = 0; b < points.length; b++) {
        if (seen[b] || Math.hypot(points[k]!.x - points[b]!.x, points[k]!.y - points[b]!.y) > link) continue;
        seen[b] = true;
        stack.push(b);
      }
    }
    sizes.push(size);
  }
  return sizes;
}

describe('treat group shapes', () => {
  const nearest = (pts: Array<{ x: number; y: number }>, k: number) =>
    Math.min(...pts.filter((_, m) => m !== k).map((q) => Math.hypot(q.x - pts[k]!.x, q.y - pts[k]!.y)));

  it('puts every treat one spacing from its nearest neighbour, whatever the turn', () => {
    for (const { shape, sizes } of TREAT.GROUPS) {
      for (const n of sizes) {
        for (const angle of [0, Math.PI / 4, 1.1]) {
          const pts = groupShape(shape, n, shape === 'diamond' ? 0 : angle);
          expect(pts.length, `${shape} ${n}`).toBe(n);
          for (let k = 0; k < n; k++) expect(nearest(pts, k), `${shape} ${n} #${k}`).toBeCloseTo(TREAT.GROUP_SPACING, 6);
        }
      }
    }
    expect(groupShape('lone', 1, 0)).toEqual([{ x: 0, y: 0 }]);
  });

  it('draws a row straight, an arc bent, a circle closed round its middle', () => {
    const row = groupShape('row', 5, 0);
    expect(row.every((p) => Math.abs(p.y) < 1e-9)).toBe(true);
    const arc = groupShape('arc', 5, 0);
    // The middle treat sits at the group's spot, the ends curve back the same way.
    expect(arc[2]!.x).toBeCloseTo(0, 9);
    expect(arc[0]!.x).toBeLessThan(-0.2);
    expect(arc[4]!.x).toBeCloseTo(arc[0]!.x, 9);
    const circle = groupShape('circle', 8, 0.3);
    const r = Math.hypot(circle[0]!.x, circle[0]!.y);
    for (const p of circle) expect(Math.hypot(p.x, p.y)).toBeCloseTo(r, 9);
  });
});

describe('treat placement', () => {
  const map = new GameMap(loadLevel(LEVEL_1));
  const groups = treatGroups(map, LEVEL_1.spawns.treats, LEVEL_1.seed);
  const treats = placeTreats(map, LEVEL_1.spawns.treats, LEVEL_1.seed);
  const reach = map.bfs(map.startTile.i, map.startTile.j);

  it('places every requested treat (160, 88 before), deterministically from the seed', () => {
    expect(treats.length).toBe(LEVEL_1.spawns.treats.count);
    expect(treats.length).toBeGreaterThanOrEqual(150);
    expect(treats.length).toBeLessThanOrEqual(170);
    expect(treats).toEqual(groups.flatMap((g) => g.points));
    expect(placeTreats(map, LEVEL_1.spawns.treats, LEVEL_1.seed)).toEqual(treats);
    expect(placeTreats(map, LEVEL_1.spawns.treats, LEVEL_1.seed + 1)).not.toEqual(treats);
  });

  it('puts every treat on dry ground reachable from the start, off props, clear of hedges', () => {
    for (const t of treats) {
      const i = Math.floor(t.x);
      const j = Math.floor(t.y);
      expect(map.isWalkable(i, j)).toBe(true);
      expect(map.groundAt(i, j)).not.toBe(Ground.Water);
      expect(map.propAt(i, j)).toBe(null);
      expect(reach[map.index(i, j)]).toBeGreaterThanOrEqual(0);
      // The dog's body fits where the treat is, so he can always eat it.
      expect(map.circleBlocked(t.x, t.y, TREAT.CLEARANCE)).toBe(false);
    }
  });

  it('leaves the start and the exit clear', () => {
    for (const t of treats) {
      expect(Math.hypot(t.x - map.start.x, t.y - map.start.y)).toBeGreaterThanOrEqual(TREAT.ROUTE_END_GAP);
      expect(Math.hypot(t.x - map.exit.x, t.y - map.exit.y)).toBeGreaterThanOrEqual(TREAT.ROUTE_END_GAP);
    }
  });

  it('lays them in groups like rings: close inside a group, groups well apart', () => {
    for (const g of groups) {
      expect(g.points.length).toBeLessThanOrEqual(8);
      if (g.points.length < 2) continue;
      // Neighbours about one tile apart inside a group.
      for (const [k, p] of g.points.entries()) {
        const near = Math.min(...g.points.filter((_, m) => m !== k).map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
        expect(near).toBeGreaterThanOrEqual(0.8);
        expect(near).toBeLessThanOrEqual(1.0);
      }
    }
    for (let a = 0; a < groups.length; a++) {
      for (let b = a + 1; b < groups.length; b++) {
        for (const p of groups[a]!.points) {
          for (const q of groups[b]!.points) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(TREAT.GROUP_GAP);
        }
      }
    }
    // Every kind of group shows up, and a few treats lie alone. Measured: 36 groups, 6 alone.
    const kinds = new Set(groups.map((g) => g.shape));
    for (const { shape } of TREAT.GROUPS) expect(kinds.has(shape), shape).toBe(true);
    const lone = groups.filter((g) => g.points.length === 1).length;
    expect(lone).toBeGreaterThanOrEqual(3);
    expect(lone).toBeLessThanOrEqual(10);
    expect(groups.length).toBeGreaterThanOrEqual(25);
  });

  it('is not a trail to follow', () => {
    // Treats each within 1.6 tiles of the next chain no further than one group (8 at most).
    expect(Math.max(...chains(treats, 1.6))).toBeLessThanOrEqual(8);
    // Nor at 3 tiles: the old road trail (a treat every ~2.5 tiles) chained all 48 of its treats.
    expect(Math.max(...chains(treats, 3))).toBeLessThanOrEqual(8);
  });

  it('covers the whole park: no reachable ground far from a treat', () => {
    // Measured: no dry reachable tile more than 9.5 tiles from a treat, 90 % within 6 (the 88
    // single treats before: 10.1 and 96 %; grouping them leaves wider gaps between groups).
    const gaps: number[] = [];
    for (let j = 0; j < map.height; j++) {
      for (let i = 0; i < map.width; i++) {
        const k = map.index(i, j);
        if (!map.playable[k] || reach[k]! < 0) continue;
        gaps.push(Math.min(...treats.map((p) => Math.hypot(p.x - i - 0.5, p.y - j - 0.5))));
      }
    }
    expect(Math.max(...gaps)).toBeLessThanOrEqual(10);
    expect(gaps.filter((g) => g <= 6).length / gaps.length).toBeGreaterThanOrEqual(0.88);
  });

  it('scatters them over the road, the loops, the lawns and the spine, start to exit', () => {
    const progress = treats.map((t) => map.progressAt(t.x, t.y));
    expect(Math.min(...progress)).toBeLessThan(0.1);
    expect(Math.max(...progress)).toBeGreaterThan(0.9);
    for (let band = 0; band < 5; band++) {
      const inBand = progress.filter((p) => p >= band / 5 && p < (band + 1) / 5).length;
      expect(inBand, `progress band ${band}`).toBeGreaterThanOrEqual(15);
    }
    const where = treats.map((t) => onRoad(t.x, t.y));
    const onTheRoad = where.filter((r) => r.dist <= 2).length;
    const away = where.filter((r) => r.dist >= 6);
    expect(onTheRoad).toBeGreaterThanOrEqual(15);
    expect(away.filter((r) => r.side < 0).length, 'west: the spine').toBeGreaterThanOrEqual(15);
    expect(away.filter((r) => r.side > 0).length, 'east: the loops').toBeGreaterThanOrEqual(15);
    const ground = new Set(treats.map((t) => map.groundAt(Math.floor(t.x), Math.floor(t.y))));
    expect(ground.has(Ground.Path) && ground.has(Ground.Grass)).toBe(true);
  });
});

describe('Energy', () => {
  it('drains while running and empties after a full sprint', () => {
    const e = new Energy();
    const sprint = ENERGY.MAX / ENERGY.DRAIN_RUN;
    let event = null;
    for (let t = 0; t < sprint + 0.1; t += 0.05) event = e.update(0.05, 'run') ?? event;
    expect(event).toBe('empty');
    expect(e.value).toBe(0);
    expect(e.canRun).toBe(false);
  });

  it('stays tired until it recovers to MIN_TO_RUN', () => {
    const e = new Energy();
    e.value = 0.5;
    expect(e.update(1, 'run')).toBe('empty');
    const needed = ENERGY.MIN_TO_RUN / ENERGY.RECOVER_IDLE;
    expect(e.update(needed * 0.9, 'idle')).toBe(null);
    expect(e.canRun).toBe(false);
    expect(e.update(needed * 0.2, 'idle')).toBe('ready');
    expect(e.canRun).toBe(true);
  });

  it('recovers faster standing than walking, slower when hungry', () => {
    const idle = new Energy();
    const walk = new Energy();
    const hungry = new Energy();
    for (const e of [idle, walk, hungry]) e.value = 10;
    hungry.recovery = ENERGY.HUNGRY_RECOVERY;
    idle.update(1, 'idle');
    walk.update(1, 'walk');
    hungry.update(1, 'idle');
    expect(idle.value).toBeGreaterThan(walk.value);
    expect(hungry.value).toBeLessThan(idle.value);
    expect(idle.value).toBeLessThanOrEqual(ENERGY.MAX);
  });
});
