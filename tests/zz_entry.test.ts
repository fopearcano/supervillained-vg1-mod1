import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { AMBUSH } from '../src/config';
import { LEVEL_1 } from '../src/levels/level1';
import { offscreenEntry, standsAt } from '../src/systems/ambushEntry';
import { loadLevel } from '../src/world/level';
import { GameMap } from '../src/world/map';

it('entries', () => {
  const map = new GameMap(loadLevel(LEVEL_1));
  const res: Record<string, unknown> = {};
  for (const [w, h] of [[216, 400], [240, 520]]) {
    let n = 0; const off = [0, 0, 0]; const any = [0, 0, 0]; const fails: unknown[] = [];
    for (let j = 0; j < map.height; j++) for (let i = 0; i < map.width; i++) {
      const x = i + 0.5, y = j + 0.5;
      const p = map.progressAt(x, y);
      if (p < 0.5 || p > 0.58 || !standsAt(map, x, y)) continue;
      n++;
      AMBUSH.ENTRY_DIRS.forEach(([sx, sy], k) => {
        const e = offscreenEntry(map, { x, y }, sx, sy, w / 2, h / 2);
        if (e) any[k]++;
        if (e?.offscreen) off[k]++; else if (fails.length < 12) fails.push({ x, y, k, e });
      });
    }
    res[w + 'x' + h] = { positions: n, offscreen: off, any, fails };
  }
  writeFileSync('/tmp/claude-0/-home-user-supervillained-vg1-mod1/46d7ed20-9b79-5c18-8b79-5e079ce1d6b2/scratchpad/entry.json', JSON.stringify(res, null, 1));
});
