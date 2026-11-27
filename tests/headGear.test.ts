import { describe, expect, it } from 'vitest';
import { CHARACTERS, GEAR_FIT, SHEET_DIRS, SPRITES, headFit, type CharacterKey } from '../src/assets/manifest';
import { alphaOf, type PixelBuffer } from '../src/assets/placeholders/pixel';
import { drawBigHelm, drawSandBucket } from '../src/assets/placeholders/headGear';
import { STORY } from '../src/config';
import { TIP, wornPose, type WornInput } from '../src/story/headGearPose';
import { decodePng, visibleCell } from './pngPixels';

/** The bucket on the plain dog (1.1); the helm on the knight (2.1) and, to be safe, the plain dog. */
const GEAR = [
  { key: 'sandBucket', draw: drawSandBucket, skin: 'zampano' },
  { key: 'bigHelm', draw: drawBigHelm, skin: 'zampanoKnight' },
  { key: 'bigHelm', draw: drawBigHelm, skin: 'zampano' },
] as const;

/**
 * Opaque rows of a drawn sprite: the top one, the rim (the lowest row nearly as wide as the
 * sprite) and the lowest one (the bucket's handle).
 */
function extents(pb: PixelBuffer): { top: number; rim: number; bottom: number } {
  let top = -1;
  let rim = -1;
  let bottom = -1;
  let widest = 0;
  const widths: number[] = [];
  for (let y = 0; y < pb.h; y++) {
    let n = 0;
    for (let x = 0; x < pb.w; x++) if (alphaOf(pb.get(x, y)) > 0) n++;
    widths.push(n);
    widest = Math.max(widest, n);
    if (n > 0 && top < 0) top = y;
    if (n > 0) bottom = y;
  }
  widths.forEach((n, y) => {
    if (n >= widest * 0.7) rim = y;
  });
  return { top, rim, bottom };
}

const pose = (skin: CharacterKey, dir: (typeof SHEET_DIRS)[number], rest: number, down: number, sniffing = false) => {
  const i: WornInput = { fit: headFit(skin), dir, sniffing, rest, down, scaleX: 1, scaleY: 1, offsetX: 0, rattle: 0 };
  return wornPose(i);
};

describe('head gear sprites', () => {
  it('match their manifest size', () => {
    for (const g of GEAR) {
      const pb = g.draw();
      const def = SPRITES[g.key];
      expect([pb.w, pb.h], g.key).toEqual([def.w, def.h]);
      const e = extents(pb);
      expect(e.top, g.key).toBeLessThanOrEqual(1);
      expect(e.rim, g.key).toBeGreaterThan(def.anchorY);
    }
  });
});

describe('the gear sits on his head and slides over his eyes', () => {
  for (const g of GEAR) {
    const def = SPRITES[g.key];
    const char = CHARACTERS[g.skin];
    const sheet = decodePng(char.sheet!);
    const { top, rim, bottom } = extents(g.draw());
    const rest = GEAR_FIT[g.key].rest;
    const fit = headFit(g.skin);

    it(`${g.key} on ${g.skin}: the eyes are on the dog, under the top of his head`, () => {
      SHEET_DIRS.forEach((dir, d) => {
        const [ex, ey] = fit.eyes[dir];
        let onDog = 0;
        for (let f = 0; f < 8; f++) {
          const cell = visibleCell(sheet, d, f);
          const at = (x: number, y: number) => cell[(y * 40 + x) * 4 + 3]! > 0;
          if (at(char.anchorX + ex, char.anchorY + ey)) onDog++;
          // The top of the head (or of his helmet) over the eyes, in the gear's columns.
          let headTop = 40;
          for (let x = char.anchorX + ex - 4; x <= char.anchorX + ex + 4; x++) {
            for (let y = 0; y < 40; y++) if (at(x, y)) headTop = Math.min(headTop, y);
          }
          const above = char.anchorY + ey - headTop;
          expect(above, `${g.skin} ${dir} frame ${f}`).toBeGreaterThanOrEqual(7);
          expect(above, `${g.skin} ${dir} frame ${f}`).toBeLessThanOrEqual(15);
          // Slid right down, the gear still covers the top of his head.
          const gearTop = char.anchorY + pose(g.skin, dir, rest, 1).y - def.anchorY + top;
          expect(gearTop, `${g.key} ${dir} frame ${f}: top of the head pokes out`).toBeLessThanOrEqual(headTop + 1);
        }
        expect(onDog, `${g.skin} ${dir}`).toBeGreaterThanOrEqual(6);
      });
    });

    it(`${g.key} on ${g.skin}: pushed up his eyes show under it, slid down its rim covers them`, () => {
      for (const dir of SHEET_DIRS) {
        const eyes = fit.eyes[dir][1];
        const up = pose(g.skin, dir, rest, 0).y - def.anchorY;
        const down = pose(g.skin, dir, rest, 1).y - def.anchorY;
        expect(up + bottom, dir).toBeLessThan(eyes - 1);
        expect(down + rim, dir).toBeGreaterThan(eyes + 1);
        expect(down - up).toBe(STORY.HEAD_GEAR.DROP);
      }
    });
  }
});

describe('the worn pose', () => {
  const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);

  it('leans back while pushed up, tips forward over his eyes the way he faces', () => {
    for (const dir of SHEET_DIRS) {
      const up = pose('zampano', dir, -10, 0).rotation;
      const down = pose('zampano', dir, -10, 1).rotation;
      expect(sign(down), dir).toBe(TIP[dir]);
      expect(sign(up), dir).toBe(sign(-TIP[dir]));
    }
  });

  it('follows his head down when he sniffs, and up when he stretches', () => {
    const still = pose('zampano', 'E', -10, 0.5);
    expect(pose('zampano', 'E', -10, 0.5, true).y).toBeGreaterThan(still.y);
    const i: WornInput = { fit: headFit('zampano'), dir: 'E', sniffing: false, rest: -10, down: 0.5, scaleX: 0.9, scaleY: 1.2, offsetX: 1, rattle: 0 };
    expect(wornPose(i).y).toBeLessThan(still.y);
  });

  it('snaps its tilt to whole steps', () => {
    const step = STORY.HEAD_GEAR.TILT_STEP;
    for (let k = 0; k <= 1; k += 0.1) {
      const r = pose('zampanoKnight', 'NE', -9, k).rotation / step;
      expect(Math.abs(r - Math.round(r))).toBeLessThan(1e-9);
    }
  });
});
