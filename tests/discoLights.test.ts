import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', () => ({ Container: class {}, Graphics: class {} }));

const { beatAt, followBeat, lightLevels } = await import('../src/ui/discoLights');
const { TITLE } = await import('../src/config');
const D = TITLE.DISCO;

describe('the title disco lights follow the music', () => {
  it("reads the title track's position as beats: the first kick is beat 0", () => {
    expect(beatAt(D.FIRST_BEAT)).toBeCloseTo(0, 6);
    expect(beatAt(D.FIRST_BEAT + 60 / D.BPM)).toBeCloseTo(1, 6);
    expect(beatAt(D.FIRST_BEAT + 30)).toBeCloseTo((30 * D.BPM) / 60, 6);
  });

  it('keeps the tempo by itself without music, snaps to the music when far off, eases in when close', () => {
    expect(followBeat(10, null, 1)).toBeCloseTo(10 + D.BPM / 60, 6);
    // The track looped (or just started): straight to it.
    expect(followBeat(130, 0.2, 1 / 60)).toBe(0.2);
    // A small gap eases in over a few frames, without jumps.
    let beat = 5;
    const music = (t: number) => 5.1 + (t * D.BPM) / 60;
    for (let k = 1; k <= 60; k++) {
      const before = beat;
      beat = followBeat(beat, music(k / 60), 1 / 60);
      expect(beat - before).toBeGreaterThan(0);
      expect(beat - before).toBeLessThan(0.1);
    }
    expect(Math.abs(beat - music(1))).toBeLessThan(0.01);
  });
});

describe('the flashes stay safe for photosensitive players', () => {
  // Sample one minute at 60 frames a second, as the game draws them.
  const step = 1 / 60;
  const samples = Array.from({ length: 60 * 60 }, (_, k) => lightLevels(((k * step) * D.BPM) / 60));

  it('flash at most 3 times in any second (the WCAG general flash threshold)', () => {
    const onsets: number[] = [];
    let wasOn = false;
    samples.forEach((lv, k) => {
      const on = lv.wash > 0.04 || lv.strobe > 0.04;
      if (on && !wasOn) onsets.push(k * step);
      wasOn = on;
    });
    expect(onsets.length).toBeGreaterThan(100);
    for (let i = 0; i + 3 < onsets.length; i++) expect(onsets[i + 3]! - onsets[i]!).toBeGreaterThan(1);
  });

  it('a white strobe only on the bar\'s first beat, never a full-white screen, a coloured wash on the others', () => {
    for (const lv of samples) {
      expect(lv.strobe).toBeLessThanOrEqual(D.STROBE_ALPHA);
      expect(lv.wash).toBeLessThanOrEqual(D.WASH_ALPHA);
      if (lv.strobe > 0) expect(lv.inBar).toBe(0);
      if (lv.wash > 0) expect(lv.inBar).not.toBe(0);
    }
    expect(D.STROBE_ALPHA).toBeLessThanOrEqual(0.25);
  });

  it('the beams kick on every beat and settle between beats', () => {
    const onBeat = lightLevels(8);
    const between = lightLevels(8.9);
    expect(onBeat.beam).toBeCloseTo(D.BEAM_ALPHA + D.BEAM_PULSE, 6);
    expect(between.beam).toBeLessThan(onBeat.beam);
    expect(between.beam).toBeGreaterThanOrEqual(D.BEAM_ALPHA);
    // A new colour every beat.
    expect(lightLevels(9).color).not.toBe(lightLevels(8).color);
  });
});
