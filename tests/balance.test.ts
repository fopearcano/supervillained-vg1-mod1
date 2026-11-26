import { describe, expect, it } from 'vitest';
import { DIGESTION, HUNGER, PLAYER, TREAT } from '../src/config';
import { GREEN_ZONE_ROAD, LEVEL_1 } from '../src/levels/level1';
import { Hunger } from '../src/systems/needs';
import { placeTreats } from '../src/systems/placement';
import { loadLevel, type SpawnSettings } from '../src/world/level';
import { GameMap } from '../src/world/map';
import { Ground } from '../src/world/tiles';

/** The road's corners in world units (its tile coordinates name tile centres). */
const ROAD = GREEN_ZONE_ROAD.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }));
const ROAD_LENGTH = ROAD.slice(1).reduce((sum, p, k) => sum + Math.hypot(p.x - ROAD[k]!.x, p.y - ROAD[k]!.y), 0);

/**
 * Balancing sanity check: a simple bot walks Level 1 from S to E at walking speed, detouring to
 * treats within `greed` tiles. The 'spine' bot follows the BFS gradient to the exit (west first,
 * so it takes the gravel spine along the park's west and south edges); the 'road' bot follows
 * the main road, the diagonal a player holding "up" walks.
 */
function simulate(greed: number, walker: 'spine' | 'road' = 'spine', treatSettings: SpawnSettings['treats'] = LEVEL_1.spawns.treats) {
  const map = new GameMap(loadLevel(LEVEL_1));
  const treats = placeTreats(map, treatSettings, LEVEL_1.seed);
  const hunger = new Hunger();
  let x = map.start.x;
  let y = map.start.y;
  let t = 0;
  let eaten = 0;
  let minHunger: number = HUNGER.MAX;
  let corner = 1;
  const dt = 0.05;
  while (t < 400) {
    if (Math.hypot(x - map.exit.x, y - map.exit.y) < 0.8) break;
    let tx: number;
    let ty: number;
    const near = treats.filter((p) => Math.hypot(p.x - x, p.y - y) < greed).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (near) {
      tx = near.x;
      ty = near.y;
    } else if (walker === 'road') {
      while (corner < ROAD.length - 1 && Math.hypot(ROAD[corner]!.x - x, ROAD[corner]!.y - y) < 0.3) corner++;
      tx = ROAD[corner]!.x;
      ty = ROAD[corner]!.y;
    } else {
      const i = Math.floor(x);
      const j = Math.floor(y);
      const here = map.exitDistance[map.index(i, j)]!;
      let best = { i, j, d: here < 0 ? Infinity : here };
      for (const [a, b] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        if (!map.isWalkable(i + a, j + b)) continue;
        const d = map.exitDistance[map.index(i + a, j + b)]!;
        if (d >= 0 && d < best.d) best = { i: i + a, j: j + b, d };
      }
      tx = best.i + 0.5;
      ty = best.j + 0.5;
    }
    const dx = tx - x;
    const dy = ty - y;
    const len = Math.hypot(dx, dy);
    const step = Math.min(len, PLAYER.WALK_SPEED * dt);
    if (len > 1e-6) {
      x += (dx / len) * step;
      y += (dy / len) * step;
    }
    for (let k = treats.length - 1; k >= 0; k--) {
      if (Math.hypot(treats[k]!.x - x, treats[k]!.y - y) < TREAT.PICKUP_RADIUS) {
        treats.splice(k, 1);
        hunger.feed(TREAT.HUNGER);
        eaten++;
      }
    }
    hunger.update(dt, 'walk');
    minHunger = Math.min(minHunger, hunger.value);
    t += dt;
  }
  return { time: t, eaten, minHunger, poops: Math.floor((eaten * TREAT.DIGESTION) / DIGESTION.MAX) };
}

describe('level 1 balance (bot)', () => {
  it('the shortest walk is long, and not eating at all is not viable', () => {
    const r = simulate(0);
    // A long walk in tiles (its time depends on PLAYER.WALK_SPEED; hunger per tile stays the same).
    expect(r.time * PLAYER.WALK_SPEED).toBeGreaterThan(150);
    expect(r.time).toBeLessThan(110);
    expect(HUNGER.START - HUNGER.DRAIN_WALK * r.time).toBeLessThan(0);
  });

  it('eating treats along the way keeps Zampanò alive, at the cost of poops to clean', () => {
    // Measured with the doubled treats (88, the owner's call): the spine bot eats 21 (5 poops: the
    // lane treats out on the spine and a few road treats near S and E), the road bot all 48 on the
    // trail (12 poops: 48 × 26 / 100; it was 32 and 8). The road bot sits on the poop bound on
    // purpose: more food should never quietly mean more poops than this.
    for (const walker of ['spine', 'road'] as const) {
      const r = simulate(2.5, walker);
      expect(r.minHunger, walker).toBeGreaterThan(0);
      expect(r.eaten, walker).toBeGreaterThanOrEqual(4);
      expect(r.poops, walker).toBeGreaterThanOrEqual(1);
      expect(r.poops, walker).toBeLessThanOrEqual(12);
      expect(r.time, walker).toBeLessThan(LEVEL_1.parTime);
    }
  });

  it('a dog walking the road meets a treat about every 2.5 tiles', () => {
    // Fails on the old placement: every treat lay on the spine and this walk found one.
    const r = simulate(2.5, 'road');
    expect(r.eaten * 3).toBeGreaterThanOrEqual(ROAD_LENGTH);
    // Why the level names its road: the shortest-route trail alone still misses the road.
    const { count, maxOffset, minSpacing } = LEVEL_1.spawns.treats;
    expect(simulate(2.5, 'road', { count, maxOffset, minSpacing }).eaten).toBeLessThan(r.eaten / 3);
  });

  it('the lane treats cover the whole park: no gravel far from a treat', () => {
    // Placed farthest-first over all the lanes (placement.ts). Measured: 88 treats, no gravel tile
    // more than 6 tiles from one, 91 % within 4 tiles (the per-band placement of the same 88 left
    // gaps of 8.3 tiles and 81 %; the 44 before the doubling, 14.3 tiles and 60 %).
    const map = new GameMap(loadLevel(LEVEL_1));
    const treats = placeTreats(map, LEVEL_1.spawns.treats, LEVEL_1.seed);
    const { count, side } = LEVEL_1.spawns.treats;
    expect(treats.length).toBe(count + (side ?? 0));
    expect(treats.length).toBe(88);
    const gaps: number[] = [];
    for (let j = 0; j < map.height; j++) {
      for (let i = 0; i < map.width; i++) {
        if (map.groundAt(i, j) !== Ground.Path || map.exitDistance[map.index(i, j)]! < 0) continue;
        gaps.push(Math.min(...treats.map((p) => Math.hypot(p.x - i - 0.5, p.y - j - 0.5))));
      }
    }
    expect(Math.max(...gaps)).toBeLessThanOrEqual(6.5);
    expect(gaps.filter((g) => g <= 4).length / gaps.length).toBeGreaterThanOrEqual(0.88);
    // No two treats on top of each other.
    for (const [k, p] of treats.entries()) {
      for (const q of treats.slice(k + 1)) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(LEVEL_1.spawns.treats.minSpacing - 1e-9);
    }
  });
});
