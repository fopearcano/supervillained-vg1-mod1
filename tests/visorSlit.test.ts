import { describe, expect, it } from 'vitest';
import { STORY } from '../src/config';
import { visorSlit, type SlitShape } from '../src/story/visorSlit';

const S = STORY.VISOR_SLIT;
const shape: SlitShape = { cover: S.COVER, focus: S.FOCUS, above: S.ABOVE, below: S.BELOW };
const MAX = STORY.VISOR.MAX;
const slit = (h: number, y: number, v: number) => visorSlit(h, y, v, MAX, shape);

/** Logical view heights: a 390x844 phone, the owner's tall 9:20 phone, a short landscape-ish one. */
const HEIGHTS = [390, 470, 520, 300];

describe('the visor slit', () => {
  it('no visor: no bands', () => {
    expect(slit(470, 235, 0)).toEqual({ top: 0, bottom: 470 });
    expect(slit(470, 235, -0.3)).toEqual({ top: 0, bottom: 470 });
  });

  it('at MAX the bands cover the old share of the view when he is in the middle', () => {
    for (const h of HEIGHTS) {
      const s = slit(h, h / 2 + S.FOCUS, MAX);
      const covered = s.top + (h - s.bottom);
      // The old bands: h/2 x visor from the top and 0.82 of that from the bottom.
      expect(Math.abs(covered - h * MAX * S.COVER)).toBeLessThanOrEqual(2);
      // Centred on his head.
      expect(Math.abs(s.top - (h - s.bottom))).toBeLessThanOrEqual(2);
    }
  });

  it('the bands close in toward him as the visor rises', () => {
    for (const h of HEIGHTS) {
      for (const y of [40, h * 0.3, h / 2, h * 0.75, h - 10]) {
        let prev = slit(h, y, 0);
        for (let v = 0.05; v <= MAX + 1e-9; v += 0.05) {
          const s = slit(h, y, v);
          expect(s.top).toBeGreaterThanOrEqual(prev.top);
          expect(s.bottom).toBeLessThanOrEqual(prev.bottom);
          prev = s;
        }
      }
    }
  });

  it('never covers him: the dog and his head gear stay in view, wherever he is on any phone', () => {
    for (const h of [...HEIGHTS, 844, 915]) {
      for (let y = S.ABOVE; y <= h - S.BELOW; y += 7) {
        for (const v of [0.2, 0.5, MAX, 1.5]) {
          const s = slit(h, y, v);
          expect(s.top, `h ${h} y ${y} v ${v}`).toBeLessThanOrEqual(y - S.ABOVE);
          expect(s.bottom, `h ${h} y ${y} v ${v}`).toBeGreaterThanOrEqual(y + S.BELOW);
        }
      }
    }
  });

  it('near the top or the bottom of the view the slit moves with him', () => {
    const h = 470;
    const high = slit(h, 70, MAX);
    expect(high.top).toBeLessThanOrEqual(70 - S.ABOVE);
    expect(high.bottom).toBeLessThan(h / 2);
    const low = slit(h, h - 20, MAX);
    expect(low.bottom).toBeGreaterThanOrEqual(h - 20 + S.BELOW - 1);
    expect(low.top).toBeGreaterThan(h / 2);
  });

  it('stays inside the view when he is off it, and the visor is clamped to MAX', () => {
    for (const y of [-80, 0, 500, 900]) {
      const s = slit(470, y, MAX);
      expect(s.top).toBeGreaterThanOrEqual(0);
      expect(s.bottom).toBeLessThanOrEqual(470);
      expect(s.top).toBeLessThanOrEqual(s.bottom);
    }
    expect(slit(470, 235, 3)).toEqual(slit(470, 235, MAX));
  });

  it('writes into the object it is given', () => {
    const out = { top: -1, bottom: -1 };
    expect(visorSlit(400, 200, MAX, MAX, shape, out)).toBe(out);
    expect(out.top).toBeGreaterThan(0);
  });
});
