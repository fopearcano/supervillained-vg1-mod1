import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ANIMS, CHARACTERS, SHEET_DIRS, type AnimName, type CharacterKey } from '../src/assets/manifest';
import { decodePng, lowestRow, visibleCell } from './pngPixels';

/** The Jack, Watson, Santina and Confusione animation deliveries, plain and armoured. */
const CAST = ['jack', 'watson', 'santina', 'confusione'] as const;
const KEYS: CharacterKey[] = CAST.flatMap((k) => [k, `${k}Knight` as CharacterKey]);
/** Watson's delivery draws four views: his diagonal rows reuse the side profiles (its README). */
const FOUR_VIEWS: ReadonlySet<string> = new Set(['watson', 'watsonKnight']);

/** Where an action's frames are: its own sheet (tired) or its rows in the main sheet. */
function framesOf(key: CharacterKey, action: AnimName) {
  const def = CHARACTERS[key];
  const own = def.animSheets?.[action];
  const main = ANIMS.filter((a) => !def.animSheets?.[a]);
  return { image: decodePng(own ?? def.sheet!), firstRow: own ? 0 : main.indexOf(action) * SHEET_DIRS.length, frames: def.anims[action]!.frames };
}

describe('Jack, Watson, Santina and Confusione: twelve actions, plain and armoured', () => {
  it.each(KEYS)('%s loads its own delivered sheets, in the native frame, with the cast table', (key) => {
    const def = CHARACTERS[key];
    expect(def.sheet).toBe(`sprites/${key}.png`);
    expect(def.animSheets).toEqual({ tired: `sprites/${key}-tired.png` });
    expect(Object.keys(def.anims)).toEqual([...ANIMS]);
    expect([def.frameW, def.frameH, def.anchorX, def.anchorY]).toEqual([40, 40, 20, 36]);
    // The deliveries' timing modules are Sbrimbrulòn's table, hold for hold.
    expect(def.anims).toEqual(CHARACTERS.sbrimbrulon.anims);
    const main = decodePng(def.sheet!);
    const tired = decodePng(def.animSheets!.tired!);
    expect([main.w, main.h]).toEqual([8 * 40, 11 * SHEET_DIRS.length * 40]);
    expect([tired.w, tired.h]).toEqual([2 * 40, SHEET_DIRS.length * 40]);
  });

  it.each(CAST)('%s in armour is a sheet of its own, not a copy of the plain one', (key) => {
    expect(decodePng(`sprites/${key}Knight.png`).rgba.equals(decodePng(`sprites/${key}.png`).rgba)).toBe(false);
  });
});

for (const key of KEYS) {
  describe(`${key}: the delivered pixels`, () => {
    it.each([...ANIMS])('%s: every frame drawn in every direction, inside its cell, nothing past the last frame', (action) => {
      const { image, firstRow, frames } = framesOf(key, action);
      const columns = image.w / 40;
      for (let d = 0; d < SHEET_DIRS.length; d++) {
        for (let f = 0; f < columns; f++) {
          const cell = visibleCell(image, firstRow + d, f);
          const where = `${action} ${SHEET_DIRS[d]} frame ${f}`;
          if (f >= frames) {
            expect(lowestRow(cell), `${where}: art past the last frame`).toBe(-1);
            continue;
          }
          expect(lowestRow(cell), `${where}: empty`).toBeGreaterThanOrEqual(0);
          for (let k = 0; k < 40; k++) {
            const edge = [k, 39 * 40 + k, k * 40, k * 40 + 39];
            expect(edge.every((p) => cell[p * 4 + 3] === 0), `${where}: art touches the cell's edge`).toBe(true);
          }
        }
      }
    });

    it('stands on the ground line (the anchor, y 36) in every frame of both idles and the panting', () => {
      for (const action of ['idle', 'sit', 'tired'] as const) {
        const { image, firstRow, frames } = framesOf(key, action);
        for (let d = 0; d < SHEET_DIRS.length; d++) {
          for (let f = 0; f < frames; f++) {
            expect(lowestRow(visibleCell(image, firstRow + d, f)), `${action} ${SHEET_DIRS[d]} frame ${f}`).toBe(CHARACTERS[key].anchorY - 1);
          }
        }
      }
    });

    const views = FOUR_VIEWS.has(key) ? 'four views (N, E, S, W), the diagonals reusing the profiles' : 'eight distinct views';
    it(`shows ${views} in every frame`, () => {
      for (const action of ANIMS) {
        const { image, firstRow, frames } = framesOf(key, action);
        for (let f = 0; f < frames; f++) {
          const hash = (d: number) => createHash('sha256').update(visibleCell(image, firstRow + d, f)).digest('hex');
          const all = SHEET_DIRS.map((_, d) => hash(d));
          if (FOUR_VIEWS.has(key)) {
            const [n, e, s, w] = (['N', 'E', 'S', 'W'] as const).map((dir) => all[SHEET_DIRS.indexOf(dir)]);
            expect(new Set([n, e, s, w]).size, `${action} frame ${f}`).toBe(4);
          } else {
            expect(new Set(all).size, `${action} frame ${f}: a direction repeats another`).toBe(8);
          }
        }
      }
    });
  });
}
