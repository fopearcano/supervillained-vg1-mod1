import { describe, expect, it } from 'vitest';
import { DIGESTION, HUNGER, PLAYER, TREAT } from '../src/config';
import { GREEN_ZONE_ROAD, LEVEL_1 } from '../src/levels/level1';
import { Digestion, Hunger } from '../src/systems/needs';
import { placeTreats } from '../src/systems/placement';
import { loadLevel } from '../src/world/level';
import { GameMap } from '../src/world/map';

/** The road's corners in world units (its tile coordinates name tile centres). */
const ROAD = GREEN_ZONE_ROAD.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }));

/**
 * Balancing sanity check: a simple bot walks Level 1 from S to E at walking speed, detouring to
 * treats within `greed` tiles. The 'spine' bot follows the BFS gradient to the exit (west first,
 * so it takes the gravel spine along the park's west and south edges); the 'road' bot follows
 * the main road, the diagonal a player holding "up" walks. `fast` is the longest walk (tiles)
 * between two treats eaten.
 */
function simulate(greed: number, walker: 'spine' | 'road' = 'spine') {
  const map = new GameMap(loadLevel(LEVEL_1));
  const treats = placeTreats(map, LEVEL_1.spawns.treats, LEVEL_1.seed);
  const hunger = new Hunger();
  let x = map.start.x;
  let y = map.start.y;
  let t = 0;
  let eaten = 0;
  let minHunger: number = HUNGER.MAX;
  let corner = 1;
  let walked = 0;
  let sinceFood = 0;
  let fast = 0;
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
    walked += step;
    sinceFood += step;
    for (let k = treats.length - 1; k >= 0; k--) {
      if (Math.hypot(treats[k]!.x - x, treats[k]!.y - y) < TREAT.PICKUP_RADIUS) {
        treats.splice(k, 1);
        hunger.feed(TREAT.HUNGER);
        eaten++;
        fast = Math.max(fast, sinceFood);
        sinceFood = 0;
      }
    }
    hunger.update(dt, 'walk');
    minHunger = Math.min(minHunger, hunger.value);
    t += dt;
  }
  fast = Math.max(fast, sinceFood);
  return { time: t, eaten, minHunger, walked, fast, poops: Math.floor((eaten * TREAT.DIGESTION) / DIGESTION.MAX) };
}

describe('level 1 balance (bot)', () => {
  it('the shortest walk is long, and not eating at all is not viable', () => {
    const r = simulate(0);
    // A long walk in tiles (its time depends on PLAYER.WALK_SPEED; hunger per tile stays the same).
    expect(r.time * PLAYER.WALK_SPEED).toBeGreaterThan(150);
    expect(r.time).toBeLessThan(110);
    expect(HUNGER.START - HUNGER.DRAIN_WALK * r.time).toBeLessThan(0);
  });

  it('eating treats along the way keeps Zampanò alive, with few poops to clean', () => {
    // Measured with the 160 treats in groups: at 2.5 tiles of greed the spine bot eats 19 (0
    // poops, hunger never below 44), the road bot 61 (2 poops: 61 × 3.5 / 100; never below 82).
    // With the old 88 treats and 26 digestion it was 21 and 48 eaten, 5 and 12 poops.
    for (const walker of ['spine', 'road'] as const) {
      const r = simulate(2.5, walker);
      expect(r.minHunger, walker).toBeGreaterThan(0);
      expect(r.eaten, walker).toBeGreaterThanOrEqual(10);
      expect(r.poops, walker).toBeLessThanOrEqual(2);
      expect(r.time, walker).toBeLessThan(LEVEL_1.parTime);
    }
    // Eating still costs poops: the dog that eats what he meets on the road poops on the way.
    expect(simulate(2.5, 'road').poops).toBeGreaterThanOrEqual(1);
  });

  it('a dog meets a group every so often, never a long stretch without food', () => {
    // `fast`, the longest walk between two treats eaten. Measured: the road bot 25.7 tiles at 2.5
    // tiles of greed; a dog going for any group within 5 tiles (on screen) 32.3 on the spine and
    // 18.5 on the road, eating 49 and 89 of the 160 (1 and 3 poops). The spine bot at 2.5 tiles
    // goes 82 tiles without food along the hedges (the groups keep to the open) and is still
    // never below 44 hunger.
    expect(simulate(2.5, 'road').fast).toBeLessThanOrEqual(30);
    for (const walker of ['spine', 'road'] as const) {
      const r = simulate(5, walker);
      expect(r.fast, walker).toBeLessThanOrEqual(35);
      expect(r.eaten, walker).toBeGreaterThanOrEqual(40);
      expect(r.poops, walker).toBeLessThanOrEqual(3);
    }
  });

  it('eating every treat of the walk makes about 5 poops, not 22', () => {
    const map = new GameMap(loadLevel(LEVEL_1));
    const n = placeTreats(map, LEVEL_1.spawns.treats, LEVEL_1.seed).length;
    // 160 × 3.5 = 560: 5 poops and a meter at 60 (88 × 26 = 2288 made 22 before).
    const poops = Math.floor((n * TREAT.DIGESTION) / DIGESTION.MAX);
    expect(poops).toBeGreaterThanOrEqual(5);
    expect(poops).toBeLessThanOrEqual(6);
    // The same through the real meter, one treat at a time, each poop done as soon as it is due.
    const d = new Digestion();
    let made = 0;
    for (let k = 0; k < n; k++) {
      d.add(TREAT.DIGESTION);
      while (d.warning || d.due) {
        if (d.update(DIGESTION.WARNING_TIME) === 'poop' || d.due) {
          made++;
          d.done();
        }
      }
    }
    expect(made).toBe(poops);
  });

  it('still offers far more food than a walk at par time burns', () => {
    // Hunger per treat is unchanged (16): 160 treats offer 2560, while walking for the whole
    // par time (240 s) burns 715 and running 1085.
    const map = new GameMap(loadLevel(LEVEL_1));
    const offer = placeTreats(map, LEVEL_1.spawns.treats, LEVEL_1.seed).length * TREAT.HUNGER;
    expect(offer).toBeGreaterThan(2 * HUNGER.DRAIN_RUN * LEVEL_1.parTime);
  });
});
