import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../src/config';
import { computeViewport } from '../src/core/display';
import {
  GLOSSARY_PAGES,
  GLOSSARY_SECTIONS,
  cardHeight,
  fitCard,
  GLYPH,
  layoutPage,
  ringExponent,
  sectionStart,
  tallestPage,
  wrapText,
} from '../src/scenes/glossaryEntries';

/** The card's text widths: the usual phone (216 wide), and the narrowest screens (192, 182). */
const INNERS = [180, 166, 156];

describe('glossary pages', () => {
  it('opens on "supervillain", then the crusade, then the 37 entries about bullying', () => {
    expect(GLOSSARY_PAGES[0]!.entry.id).toBe('supervillain');
    expect(GLOSSARY_SECTIONS[1]!.entries.map((e) => e.id)).toEqual(['crusader', 'knight', 'journey']);
    const bullying = GLOSSARY_SECTIONS.filter((s) => s.title.startsWith('BULLYING'));
    expect(bullying.map((s) => s.entries.length)).toEqual([10, 4, 6, 5, 12]);
    expect(GLOSSARY_PAGES).toHaveLength(41);
    expect(new Set(GLOSSARY_PAGES.map((p) => p.entry.id)).size).toBe(41);
  });

  it('every page circles exactly one sense; the crusade words circle the values they carry', () => {
    for (const { entry } of GLOSSARY_PAGES) expect(entry.senses.filter((s) => s.ring)).toHaveLength(1);
    for (const e of GLOSSARY_SECTIONS[1]!.entries) expect(e.senses.find((s) => s.ring)!.label).toBe('VALUES,');
  });

  it('every page names its source but the game\'s own word', () => {
    for (const { entry, section } of GLOSSARY_PAGES) {
      if (entry.id === 'supervillain') continue;
      expect(section.source, entry.id).toMatch(/BARBERO|PELLAI/);
    }
  });

  it('uses only characters the pixel font has, in upper case', () => {
    const allowed = /^[\x20-\x7e\nˈːə]*$/;
    for (const { entry, section } of GLOSSARY_PAGES) {
      // The pronunciation (/.../) is the one lower-case line.
      const sub = entry.sub && !entry.sub.startsWith('/') ? entry.sub : '';
      const all = [section.title, section.source ?? '', entry.head, sub, entry.note ?? '', ...entry.senses.flatMap((s) => [s.label, s.text])];
      for (const t of all) {
        expect(t, entry.id).toMatch(allowed);
        expect(t, entry.id).toBe(t.toUpperCase());
      }
      expect(entry.sub ?? '', entry.id).toMatch(allowed);
    }
  });

  it('every line stays inside the card, and the ring inside its margins', () => {
    for (const inner of INNERS) {
      GLOSSARY_PAGES.forEach((p, k) => {
        for (const item of layoutPage(k, inner).items) {
          if (item.kind === 'text') {
            expect(item.x, p.entry.id).toBeGreaterThanOrEqual(0);
            expect(item.x + item.w, `${p.entry.id} at ${inner}`).toBeLessThanOrEqual(inner);
          } else if (item.kind === 'ring') {
            // The hand-drawn wobble grows the ring by up to 8.5% (scenes/glossaryScene.ts).
            expect(item.cx - item.rx * 1.085, p.entry.id).toBeGreaterThanOrEqual(-10);
            expect(item.cx + item.rx * 1.085, p.entry.id).toBeLessThanOrEqual(inner + 10);
          }
        }
      });
    }
  });

  it('the card, sized for the tallest page, fits a phone in its normal layout', () => {
    for (const inner of INNERS) expect(cardHeight(tallestPage(inner), false)).toBeLessThanOrEqual(400 - 16);
    // A phone (about 216 x 470) and a 400-px view.
    for (const h of [400, 470]) expect(fitCard(216, h)).toMatchObject({ compact: false, clipped: false, inner: 180 });
  });

  it('a short desktop window gets the compact card, whole, with its buttons on the screen', () => {
    // Browser windows (CSS px, dpr 1): the view is at most 0.62 as wide as it is tall.
    const windows = [[1920, 940], [1366, 650], [1280, 720], [1440, 800], [1536, 730], [1280, 600], [1024, 600]] as const;
    for (const [cw, ch] of windows) {
      const v = computeViewport(cw, ch, 1);
      const fit = fitCard(v.width, v.height);
      expect(fit.cardH, `${cw}x${ch} -> ${v.width}x${v.height}`).toBeLessThanOrEqual(v.height - 8);
      expect(fit.cw).toBeLessThanOrEqual(v.width - 8);
      if (v.height >= 300) expect(fit.clipped, `${cw}x${ch} -> ${v.width}x${v.height}`).toBe(false);
    }
  });

  it('a tiny view cuts the text, never the buttons', () => {
    const fit = fitCard(186, 220);
    expect(fit.clipped).toBe(true);
    expect(fit.cardH).toBeLessThanOrEqual(220 - 8);
  });

  it('compact pages lay out inside the card too', () => {
    for (const inner of [...INNERS, 166])
      GLOSSARY_PAGES.forEach((p, k) => {
        for (const item of layoutPage(k, inner, true).items) if (item.kind === 'text') expect(item.x + item.w, p.entry.id).toBeLessThanOrEqual(inner);
      });
  });

  it('keeps the first page as it was: the verb in a plain ellipse', () => {
    const ring = layoutPage(0, 180).items.find((i) => i.kind === 'ring');
    expect(ring && ring.kind === 'ring' && ring.n).toBe(2);
  });

  it('a block of lines gets a squarer ring that still holds its line ends', () => {
    const lines = wrapText('IT WORKS WHEN MANY SHARE IT: IF THE GROUP STEPS IN, THE BULLY IS LEFT ALONE.', 20);
    const w = Math.max(...lines.map((l) => l.length)) * GLYPH;
    const h = lines.length * GLYPH + (lines.length - 1) * 3;
    expect(ringExponent(lines, w / 2 + GLOSSARY.RING_PAD_X, h / 2 + GLOSSARY.RING_PAD_Y)).toBeGreaterThan(2);
  });
});

describe('turning pages', () => {
  it('up and down jump between sections, going round', () => {
    const starts = GLOSSARY_SECTIONS.map((s) => GLOSSARY_PAGES.findIndex((p) => p.section === s));
    expect(sectionStart(0, 1)).toBe(starts[1]);
    expect(sectionStart(starts[1]! + 2, 1)).toBe(starts[2]);
    expect(sectionStart(0, -1)).toBe(starts.at(-1));
    expect(sectionStart(GLOSSARY_PAGES.length - 1, 1)).toBe(0);
  });
});

describe('wrapText', () => {
  it('wraps on spaces, keeps line breaks, cuts words longer than a line', () => {
    expect(wrapText('A BB CCC DDDD', 6)).toEqual(['A BB', 'CCC', 'DDDD']);
    expect(wrapText('ONE\nTWO THREE', 20)).toEqual(['ONE', 'TWO THREE']);
    expect(wrapText('ABCDEFGHIJ', 4)).toEqual(['ABCD', 'EFGH', 'IJ']);
  });
});
