import type { LevelDef } from '../world/level';

interface Point {
  x: number;
  y: number;
}

/**
 * The park's main gravel road, start (90, 90) to exit (4, 4), in tile coordinates. The map is
 * painted around it, and the treat trail follows it (`spawns.treats.route`): it is the road a
 * player walks, holding "up" follows its diagonal.
 */
export const GREEN_ZONE_ROAD: readonly Point[] = [
  { x: 90, y: 90 },
  { x: 84, y: 84 },
  { x: 76, y: 76 },
  { x: 69, y: 70 },
  { x: 63, y: 61 },
  { x: 57, y: 57 },
  { x: 51, y: 48 },
  { x: 43, y: 43 },
  { x: 36, y: 36 },
  { x: 29, y: 31 },
  { x: 22, y: 23 },
  { x: 15, y: 17 },
  { x: 8, y: 7 },
  { x: 4, y: 4 },
];

/**
 * Builds the Green Zone as a chain of recognisable park districts instead of one long corridor.
 * Broad lawns make room for chases, while linked rings provide meaningful route choices: the
 * direct gravel path is quick but exposed, and the garden loops offer water and cover.
 */
export function buildGreenZoneRows(): readonly string[] {
  const size = 96;
  const cells = Array.from({ length: size }, () => Array<string>(size).fill('#'));

  const paintEllipse = (cx: number, cy: number, rx: number, ry: number, ch: string, replace?: ReadonlySet<string>) => {
    const x0 = Math.max(1, Math.floor(cx - rx));
    const x1 = Math.min(size - 2, Math.ceil(cx + rx));
    const y0 = Math.max(1, Math.floor(cy - ry));
    const y1 = Math.min(size - 2, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        if (!replace || replace.has(cells[y]![x]!)) cells[y]![x] = ch;
      }
    }
  };

  const paintLine = (points: readonly Point[], radius: number, ch: string, replace?: ReadonlySet<string>) => {
    for (let p = 1; p < points.length; p++) {
      const a = points[p - 1]!;
      const b = points[p]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        paintEllipse(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radius, radius, ch, replace);
      }
    }
  };

  const loops: readonly (readonly Point[])[] = [
    [
      { x: 90, y: 90 }, { x: 92, y: 82 }, { x: 86, y: 76 }, { x: 78, y: 79 },
      { x: 80, y: 88 }, { x: 90, y: 90 },
    ],
    [
      { x: 76, y: 76 }, { x: 78, y: 67 }, { x: 72, y: 60 }, { x: 63, y: 61 },
      { x: 61, y: 70 }, { x: 68, y: 77 }, { x: 76, y: 76 },
    ],
    [
      { x: 58, y: 58 }, { x: 52, y: 55 }, { x: 47, y: 60 }, { x: 51, y: 66 },
      { x: 58, y: 63 }, { x: 58, y: 58 },
    ],
    [
      { x: 50, y: 49 }, { x: 53, y: 41 }, { x: 48, y: 35 }, { x: 40, y: 35 },
      { x: 35, y: 42 }, { x: 41, y: 49 }, { x: 50, y: 49 },
    ],
    // Longer optional circuits create genuine detours for bonus hunts and pursuit play.
    [
      { x: 50, y: 49 }, { x: 60, y: 52 }, { x: 69, y: 48 }, { x: 72, y: 39 },
      { x: 67, y: 31 }, { x: 57, y: 29 }, { x: 48, y: 35 },
    ],
    [
      { x: 58, y: 63 }, { x: 47, y: 71 }, { x: 36, y: 70 }, { x: 31, y: 62 },
      { x: 39, y: 55 }, { x: 47, y: 60 }, { x: 58, y: 63 },
    ],
    [
      { x: 30, y: 32 }, { x: 23, y: 35 }, { x: 17, y: 30 }, { x: 18, y: 22 },
      { x: 25, y: 18 }, { x: 32, y: 24 }, { x: 30, y: 32 },
    ],
    [
      { x: 16, y: 18 }, { x: 9, y: 20 }, { x: 5, y: 14 }, { x: 4, y: 4 },
      { x: 12, y: 7 }, { x: 16, y: 18 },
    ],
  ];

  paintLine(GREEN_ZONE_ROAD, 7.4, '.');
  for (const loop of loops) paintLine(loop, 4.8, '.');
  for (const hub of [
    { x: 87, y: 84 },
    { x: 72, y: 70 }, { x: 55, y: 59 }, { x: 38, y: 66 }, { x: 44, y: 42 }, { x: 68, y: 39 },
    { x: 24, y: 27 }, { x: 10, y: 13 },
  ]) paintEllipse(hub.x, hub.y, 9, 8, '.');

  // Paths are painted after water, becoming clear bridges wherever a route crosses a pond.
  const lawn = new Set(['.']);
  paintEllipse(87, 83, 4.2, 2.8, 'W', lawn);
  paintEllipse(72, 68, 4.8, 3.3, 'W', lawn);
  paintEllipse(53, 60, 3.6, 2.5, 'W', lawn);
  paintEllipse(38, 66, 4.2, 2.6, 'W', lawn);
  paintEllipse(43, 40, 4.2, 2.8, 'W', lawn);
  paintEllipse(68, 39, 4.4, 3, 'W', lawn);
  paintEllipse(23, 27, 3.3, 4.4, 'W', lawn);
  paintEllipse(11, 13, 3.2, 2.2, 'W', lawn);

  // Dense planting makes the loops safer places to poop but gives cats more ways to flee.
  for (const patch of [
    { x: 83, y: 88, rx: 4.2, ry: 2.2 },
    { x: 64, y: 73, rx: 4.8, ry: 2.4 }, { x: 49, y: 57, rx: 4.2, ry: 2.4 },
    { x: 34, y: 64, rx: 3.8, ry: 2.2 }, { x: 65, y: 34, rx: 4.2, ry: 2.4 },
    { x: 37, y: 46, rx: 3.8, ry: 2.6 }, { x: 27, y: 20, rx: 4.3, ry: 2.1 },
    { x: 9, y: 18, rx: 3.2, ry: 2.1 },
  ]) paintEllipse(patch.x, patch.y, patch.rx, patch.ry, ',', lawn);

  const open = new Set(['.', ',', 'W']);
  paintLine(GREEN_ZONE_ROAD, 1.55, '=', open);
  for (const loop of loops) paintLine(loop, 1.05, '=', open);

  // Formal plazas punctuate the journey with wide, navigable chase arenas.
  paintEllipse(57, 57, 3.8, 3.8, '=', open);
  paintEllipse(44, 42, 4.2, 3.6, '=', open);
  paintEllipse(24, 27, 3.5, 3.5, '=', open);

  // Deterministic detail pass. Trees stay off gravel, so every designed route remains viable.
  const noise = (x: number, y: number) => {
    let n = Math.imul(x + 17, 0x45d9f3b) ^ Math.imul(y + 31, 0x27d4eb2d);
    n ^= n >>> 16;
    return (n >>> 0) / 0xffffffff;
  };
  for (let y = 2; y < size - 2; y++) {
    for (let x = 2; x < size - 2; x++) {
      if (cells[y]![x] !== '.') continue;
      const n = noise(x, y);
      if (n < 0.018) cells[y]![x] = 'T';
      else if (n < 0.046) cells[y]![x] = 'B';
    }
  }

  // Landmarks sit beside, rather than on, the fast route.
  for (const [x, y, ch] of [
    [89, 86, 'F'], [82, 80, 'P'], [75, 72, 'F'], [66, 66, 'P'], [38, 63, 'F'],
    [56, 53, 'F'], [63, 45, 'P'], [68, 36, 'F'], [50, 45, 'P'], [39, 40, 'F'],
    [31, 33, 'P'], [20, 24, 'F'], [14, 14, 'P'], [8, 10, 'F'],
  ] as const) {
    if (cells[y]![x] === '.' || cells[y]![x] === ',' || cells[y]![x] === 'W') cells[y]![x] = ch;
  }

  // A gravel spine along one unweighted shortest route: traced from the start taking the first
  // neighbour that gets closer (west before north), it hugs the park's south and west edges, a
  // second, quieter lane to the exit. The treat trail follows the main road instead; some side
  // treats land out here (`spawns.treats.side`).
  const distance = new Int32Array(size * size).fill(-1);
  const queue: number[] = [4 * size + 4];
  distance[queue[0]!] = 0;
  for (let head = 0; head < queue.length; head++) {
    const k = queue[head]!;
    const x = k % size;
    const y = Math.floor(k / size);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || cells[ny]![nx] === '#') continue;
      const nk = ny * size + nx;
      if (distance[nk] >= 0) continue;
      distance[nk] = distance[k]! + 1;
      queue.push(nk);
    }
  }
  let x = 90;
  let y = 90;
  for (let guard = 0; guard < size * size; guard++) {
    const d = distance[y * size + x]!;
    if (d <= 0) break;
    const next = ([[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const).find(([nx, ny]) => {
      return nx >= 0 && ny >= 0 && nx < size && ny < size && distance[ny * size + nx] === d - 1;
    });
    if (!next) break;
    [x, y] = next;
    if ((x !== 4 || y !== 4) && cells[y]![x] !== '#') cells[y]![x] = '=';
  }

  cells[90]![90] = 'S';
  cells[4]![4] = 'E';
  return cells.map((row) => row.join(''));
}

/** Level 1 — a five-district park with a fast diagonal road, garden loops and pollution waves. */
export const LEVEL_1: LevelDef = {
  id: 'level1',
  number: 1,
  zoneName: 'Green Zone',
  seed: 20240501,
  parTime: 240,
  palette: {
    environment: 'ch01_greenzone',
    grass: ['#3fcf1f', '#2a9e12', '#7cf03c'],
    tallGrass: ['#2aa814', '#1b7a0b', '#62e02c'],
    path: ['#c8b894', '#9a8866', '#ebe1c6'],
    water: ['#3b8cff', '#1e58cc', '#aee0ff'],
    forest: ['#15601a', '#0c4210', '#22802a'],
    foliage: ['#14701a', '#2cb02a', '#82f24a'],
    pollution: ['#6e4a1c', '#4a2e0e', '#8f6a30'],
    flowers: ['#ffe14a', '#ff7ad9', '#ffffff'],
  },
  spawns: {
    // A treat every ~3.8 tiles on the road, plus one per progress band out on the loops and spine.
    treats: { count: 32, maxOffset: 3, minSpacing: 2.2, route: GREEN_ZONE_ROAD, side: 12 },
    cats: { first: 16, interval: [16, 27], max: 2 },
    balls: { first: 28, interval: [22, 34], max: 2 },
  },
  events: {
    // After the band's ambush at the middle, Bagnaskiz comes back alone later in the walk.
    underAttack: { scriptedProgress: 0.7, bagnaskizHits: 3 },
    pollutionWaves: [
      { progress: 0.2, count: 2, radius: 2.4, strength: 0.72, distance: [3, 7] },
      { progress: 0.43, count: 2, radius: 2.8, strength: 0.82, distance: [3, 8] },
      { progress: 0.72, count: 3, radius: 3, strength: 0.9, distance: [2, 8] },
    ],
    // Bagnaskiz waits half way with his band, on the road just before the middle plaza: in
    // full view of Zampano coming up the road from about 40 % of the walk.
    ambush: {
      warnFrom: 0.25,
      at: 0.5,
      until: 0.62,
      spot: { x: 45.2, y: 44.4 },
      band: ['bagnaskiz', 'jack', 'watson'],
      voices: [
        { who: 'jack', text: "HE'S COMING! HE'S COMING!" },
        { who: 'watson', text: 'GET READY!' },
      ],
      now: 'NOW!',
    },
  },
  source: { format: 'ascii', rows: buildGreenZoneRows() },
};
