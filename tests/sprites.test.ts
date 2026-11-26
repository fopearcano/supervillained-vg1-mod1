import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { animationDuration, animationFrame } from '../src/assets/animationTiming';
import { CHARACTERS, RUN_ICON, SHEET_DIRS, type AnimName, type CharacterDef } from '../src/assets/manifest';

/** Width and height from a PNG's IHDR. */
function pngSize(path: string): { w: number; h: number } {
  const b = readFileSync(join('public', path));
  expect(b.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const defs = Object.values(CHARACTERS as Record<string, CharacterDef>);
const withSheet = defs.filter((d) => d.sheet);

describe('sprite sheets match the manifest layout', () => {
  it('the characters with delivered art', () => {
    expect(withSheet.map((d) => d.key).sort()).toEqual(
      [
        'bagnaskiz', 'bagnaskizMarshal', 'bagnaskizEmperor', 'confusione', 'jack',
        'sbrimbrulon', 'sbrimbrulonKnight', 'watson', 'zampano', 'zampanoCross', 'zampanoKnight',
        'santina', 'professor', 'doge', 'niketas', 'fulk', 'clerk', 'abbot', 'envoy',
        'bishop', 'cook', 'sailmaker', 'prince', 'householdWoman', 'knight', 'pilgrim',
        'venetian', 'greek', 'varangian', 'marquis',
        'jackKnight', 'watsonKnight', 'santinaKnight', 'confusioneKnight',
      ].sort(),
    );
  });

  it('one row per (anim, direction), anims with a sheet of their own left out', () => {
    for (const d of withSheet) {
      const own = d.animSheets ?? {};
      const anims = (Object.keys(d.anims) as AnimName[]).filter((a) => !own[a]);
      const { w, h } = pngSize(d.sheet!);
      expect(h, d.key).toBe(anims.length * SHEET_DIRS.length * d.frameH);
      expect(w, d.key).toBeGreaterThanOrEqual(Math.max(...anims.map((a) => d.anims[a]!.frames)) * d.frameW);
      for (const [anim, path] of Object.entries(own)) {
        const s = pngSize(path!);
        expect(s.h, `${d.key} ${anim}`).toBe(SHEET_DIRS.length * d.frameH);
        expect(s.w, `${d.key} ${anim}`).toBe(d.anims[anim as AnimName]!.frames * d.frameW);
      }
    }
  });

  it('the RUN icon exists', () => {
    expect(pngSize(RUN_ICON)).toEqual({ w: 13, h: 11 });
  });
});

describe('authored Zampanò timing', () => {
  const { idle, sit, pee, poop } = CHARACTERS.zampano.anims;

  it('holds the first idle frames for their authored durations and loops both idles', () => {
    expect(animationFrame(idle!, 0.099)).toBe(0);
    expect(animationFrame(idle!, 0.100)).toBe(1);
    expect(animationFrame(idle!, 0.209)).toBe(1);
    expect(animationFrame(idle!, 0.210)).toBe(2);
    for (const clip of [idle!, sit!]) {
      expect(animationFrame(clip, animationDuration(clip) - 0.005)).toBe(7);
      expect(animationFrame(clip, animationDuration(clip) + 0.005)).toBe(0);
    }
  });

  it('holds the final standing transition on bathroom one-shots', () => {
    for (const clip of [pee!, poop!]) {
      const end = animationDuration(clip);
      expect(animationFrame(clip, end + 0.005)).toBe(7);
      expect(animationFrame(clip, end + 0.005, true)).toBe(0);
    }
  });

  it('uses the complete authored layout for the knight costume', () => {
    expect(CHARACTERS.zampanoKnight.anims).toEqual(CHARACTERS.zampano.anims);
    expect(CHARACTERS.zampanoKnight.anims.sit!.frames).toBe(8);
    // The old rag-cross sheet is retired: the crusader costume is the armour.
    expect(CHARACTERS.zampanoCross.sheet).toBe(CHARACTERS.zampanoKnight.sheet);
    expect(CHARACTERS.zampanoCross.anims).toEqual(CHARACTERS.zampanoKnight.anims);
  });
});
