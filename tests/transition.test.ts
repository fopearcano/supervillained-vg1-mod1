import type { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { ScreenTransition } from '../src/fx/transition';

// The glitch shader needs WebGL; the transition's timing does not.
vi.mock('../src/fx/glitchFilter', () => ({
  GlitchFilter: class {
    time = 0;
    glitch = 0;
    rgb = 0;
    scanlines = 0;
    flash = 0;
  },
}));

/** A stand-in for the stage: the transition only sets its filters. */
const stage = () => ({ filters: [] as unknown[] }) as unknown as Container;

describe('the glitch transition between scenes', () => {
  it('runs the callback once, at the midpoint', () => {
    const t = new ScreenTransition(stage());
    const calls: string[] = [];
    t.play(() => calls.push('swap'), 0.4);
    expect(t.swapping).toBe(true);
    t.update(0.1);
    expect(calls).toEqual([]);
    t.update(0.15);
    expect(calls).toEqual(['swap']);
    expect(t.swapping).toBe(false);
    t.update(0.3);
    expect(t.busy).toBe(false);
    expect(calls).toEqual(['swap']);
  });

  it('a second transition before the midpoint runs the first callback once, then its own', () => {
    const t = new ScreenTransition(stage());
    const calls: string[] = [];
    t.play(() => calls.push('first'), 0.4);
    t.play(() => calls.push('second'), 0.4);
    expect(calls).toEqual(['first']);
    t.update(0.25);
    expect(calls).toEqual(['first', 'second']);
  });

  it('survives a pending callback that starts a transition itself (QUIT TO TITLE tapped twice)', () => {
    const t = new ScreenTransition(stage());
    const calls: string[] = [];
    // Like Flow.toTitle: the callback ends with a transition of its own.
    const toTitle = () => {
      calls.push('title');
      t.play(null, 0.7);
    };
    t.play(toTitle, 0.45);
    t.play(toTitle, 0.45);
    expect(calls).toEqual(['title']);
    for (let k = 0; k < 20; k++) t.update(0.05);
    expect(calls).toEqual(['title', 'title']);
    expect(t.busy).toBe(false);
  });

  it('runs what a pending callback schedules before the new one (SKIP SCENE tapped twice)', () => {
    const t = new ScreenTransition(stage());
    const calls: string[] = [];
    const finish = () => {
      calls.push('finish');
      t.play(() => calls.push('next card'), 0.5);
    };
    t.play(finish, 0.5);
    t.play(() => calls.push('again'), 0.5);
    expect(calls).toEqual(['finish', 'next card']);
    for (let k = 0; k < 20; k++) t.update(0.05);
    expect(calls).toEqual(['finish', 'next card', 'again']);
  });
});
