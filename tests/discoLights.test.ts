import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', () => ({ Container: class {}, Graphics: class {} }));

const { beamAt, beatAt, followBeat, lightLevels } = await import('../src/ui/discoLights');
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

describe('the beams come in from lamps outside the screen', () => {
  // The title on a phone (216 wide) and a tall one, at many points of the sweep.
  const views = [[216, 400], [216, 480]] as const;
  const beats = Array.from({ length: 64 }, (_, k) => k * 0.37);

  it('there is a single beam (one strobe light, not several)', () => {
    expect(D.BEAM_X).toHaveLength(1);
  });

  it('every lamp hangs above the top edge, well out of sight', () => {
    for (const [w, h] of views) {
      D.BEAM_X.forEach((fx, i) => {
        for (const b of beats) expect(beamAt(fx, i, b, w, h).y0).toBeLessThanOrEqual(-0.3 * h);
      });
    }
  });

  it('each beam still crosses the top edge where it always did, already wide (no visible point)', () => {
    for (const [w, h] of views) {
      D.BEAM_X.forEach((fx, i) => {
        for (const b of beats) {
          const { x0, y0, angle } = beamAt(fx, i, b, w, h);
          // The centre line reaches y = 0 at fx of the width.
          const t = -y0 / Math.sin(angle);
          expect(x0 + Math.cos(angle) * t).toBeCloseTo(w * fx, 6);
          // The cone's two edges meet the top edge at least 8 px apart.
          const edge = (a: number) => x0 + (Math.cos(a) / Math.sin(a)) * -y0;
          expect(Math.abs(edge(angle + D.BEAM_SPREAD) - edge(angle - D.BEAM_SPREAD))).toBeGreaterThan(8);
        }
      });
    }
  });
});
