import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../assets/starting-page-images/app/Zampano-Samemala-4.webp?url', () => ({ default: 'zampano.webp' }));
const { TitlePlayer } = await import('../src/ui/titleAnim');

function store(n: number, done: boolean) {
  const frames = Array.from({ length: n }, () => new Texture());
  return { frames, durations: frames.map((_, i) => [0.08, 0.04, 0.05][i % 3]!), count: 3, done, width: 10, height: 10 };
}

describe('title portrait player', () => {
  it('shows each frame for its own duration (GIF delays) and loops once decoded', () => {
    const f = store(3, true);
    const p = new TitlePlayer(f);
    expect(p.update(0)).toBe(f.frames[0]);
    expect(p.update(0.079)).toBe(f.frames[0]);
    expect(p.update(0.002)).toBe(f.frames[1]);
    expect(p.update(0.05)).toBe(f.frames[2]);
    expect(p.update(0.05)).toBe(f.frames[0]);
  });

  it('starts with the first decoded frame and never runs ahead of the decoder', () => {
    const f = store(0, false);
    const p = new TitlePlayer(f);
    expect(p.update(0.1)).toBeNull();
    const all = store(3, true);
    f.frames.push(all.frames[0]!);
    f.durations.push(0.08);
    // Only frame 0 decoded: it holds, however long it waits.
    expect(p.update(1)).toBe(all.frames[0]);
    f.frames.push(all.frames[1]!);
    f.durations.push(0.04);
    expect(p.update(0)).toBe(all.frames[1]);
  });
});
