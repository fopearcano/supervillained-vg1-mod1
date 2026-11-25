import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Palette } from '../src/world/level';
import type { AtlasEntry } from '../src/core/assets';
import { PixelBuffer } from '../src/assets/placeholders/pixel';
import { Ground } from '../src/world/tiles';

const frame = { x: 0, y: 0, w: 2, h: 2, anchorX: 1, anchorY: 1 };
const fallback: Palette = {
  grass: ['#111111', '#222222', '#333333'], tallGrass: ['#111111', '#222222', '#333333'],
  path: ['#111111', '#222222', '#333333'], water: ['#111111', '#222222', '#333333'],
  forest: ['#111111', '#222222', '#333333'], foliage: ['#111111', '#222222', '#333333'],
  pollution: ['#111111', '#222222', '#333333'], flowers: ['#ffffff'],
};

function fixture() {
  return {
    version: 1,
    chapterThemes: { '1': { greenzone: 'opening' }, '8': { greenzone: 'return' } },
    themeFallbacks: { greenzone: 'opening' },
    zones: {
      opening: { image: 'opening.png', palette: { grass: ['#159b59', '#07573a', '#97d57e'] }, frames: { test_0: { ...frame } } },
      return: { image: 'return.png', palette: { grass: ['#8aab63', '#52714a', '#c7d68d'], background: '#243b25' }, frames: { test_0: { ...frame } } },
    },
  };
}

function floorFixture() {
  const manifest = fixture();
  const floorFrame = { x: 0, y: 0, w: 32, h: 16, anchorX: 16, anchorY: 0 };
  Object.assign(manifest.zones.opening.frames, { floorArt_court_0: floorFrame });
  return {
    ...manifest,
    floorDesigns: {
      '1:arcade': { environment: 'opening', width: 2, height: 2, tiles: { '0': 'floorArt_court_0' } as Record<string, string> },
    },
    floorFrame,
  };
}

function browser(manifest: unknown, broken = false, size = 8) {
  const fetchMock = vi.fn(async (_url: URL) => ({ ok: true, json: async () => manifest }));
  const decoded: string[] = [];
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('Image', class {
    decoding = '';
    src = '';
    naturalWidth = size;
    naturalHeight = size;
    async decode() { decoded.push(this.src); if (broken) throw new Error('broken PNG'); }
  });
  vi.stubGlobal('document', {
    baseURI: 'https://example.test/supervillained/index.html?story=7.3',
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({
        imageSmoothingEnabled: false, drawImage: vi.fn(),
        getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) }),
      }),
    }),
  });
  return { fetchMock, decoded };
}

function entry(): AtlasEntry {
  return { name: 'test_0', image: new PixelBuffer(2, 2), anchorX: 1, anchorY: 1 };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

describe('Color Ink environment loader', () => {
  it('preloads once under a deployment subpath and reuses decoded pixels on chapter revisits', async () => {
    const mock = browser(fixture());
    const m = await import('../src/assets/environment');
    const first = m.preloadEnvironmentArt();
    // Asked twice while loading: one fetch, one decode per atlas.
    const second = m.preloadEnvironmentArt();
    await Promise.all([first, second]);
    await m.preloadEnvironmentArt();
    expect(mock.fetchMock).toHaveBeenCalledTimes(1);
    expect(String(mock.fetchMock.mock.calls[0]![0])).toBe('https://example.test/supervillained/environment-ink/manifest.json');
    expect(mock.decoded.sort()).toEqual(['https://example.test/supervillained/environment-ink/opening.png', 'https://example.test/supervillained/environment-ink/return.png']);
    const pixels = m.withEnvironmentArt(m.paletteForChapter(1, 'greenzone', fallback), [entry()])[0]!.image;
    m.withEnvironmentArt(m.paletteForChapter(8, 'greenzone', fallback), [entry()]);
    expect(m.withEnvironmentArt(m.paletteForChapter(1, 'greenzone', fallback), [entry()])[0]!.image).toBe(pixels);
    expect(m.environmentDiagnostics().warnings).toEqual([]);
  });

  it('gives the same garden separate opening and homecoming palettes without mutating shared data', async () => {
    browser(fixture());
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt();
    const opening = m.paletteForChapter(1, 'greenzone', fallback);
    const returning = m.paletteForChapter(8, 'greenzone', fallback);
    expect(opening.environment).toBe('opening');
    expect(returning.environment).toBe('return');
    expect(opening.grass[0]).toBe('#159b59');
    expect(returning.grass[0]).toBe('#8aab63');
    expect(returning.background).toBe('#243b25');
    expect(JSON.stringify(opening)).not.toBe(JSON.stringify(returning));
    expect(m.paletteForChapter(99, 'greenzone', fallback).environment).toBe('opening');
    returning.grass[0] = '#ffffff';
    expect(m.paletteForChapter(8, 'greenzone', fallback).grass[0]).toBe('#8aab63');
    expect(fallback.grass[0]).toBe('#111111');
  });

  it('keeps generated frames for a missing frame, native shape mismatch, or palette without an atlas', async () => {
    browser(fixture());
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt();
    const palette = m.paletteForChapter(1, 'greenzone', fallback);
    const original = entry();
    const mismatch = { ...entry(), anchorY: 0 };
    const missing = { ...entry(), name: 'other_0' };
    expect(m.withEnvironmentArt(palette, [mismatch])[0]).toBe(mismatch);
    expect(m.withEnvironmentArt(palette, [missing])[0]).toBe(missing);
    expect(m.withEnvironmentArt(fallback, [original])[0]).toBe(original);
    expect(m.environmentDiagnostics().warnings.some((w) => w.includes('dimensions or anchor'))).toBe(true);
    expect(m.environmentDiagnostics().warnings.some((w) => w.includes('atlas lacks other_0'))).toBe(true);
  });

  it('rejects out-of-bounds PNG slices rather than reading neighbouring sprites', async () => {
    const manifest = fixture();
    manifest.zones.opening.frames.test_0.x = 8;
    browser(manifest);
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt();
    expect(m.environmentDiagnostics().loadedZones).toEqual(['return']);
    expect(m.environmentDiagnostics().warnings.some((w) => w.includes('exceeds opening.png'))).toBe(true);
    const original = entry();
    expect(m.withEnvironmentArt(m.paletteForChapter(1, 'greenzone', fallback), [original])[0]).toBe(original);
  });

  it('retains usable generated art and chapter colours when a delivered PNG cannot decode', async () => {
    browser(fixture(), true);
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt();
    const palette = m.paletteForChapter(8, 'greenzone', fallback);
    const original = entry();
    expect(palette.grass[0]).toBe('#8aab63');
    expect(m.withEnvironmentArt(palette, [original])[0]).toBe(original);
    expect(m.environmentDiagnostics().loadedZones).toEqual([]);
    expect(m.environmentDiagnostics().warnings.some((w) => w.includes('broken PNG'))).toBe(true);
  });

  it('falls back cleanly for a malformed chapter mapping', async () => {
    const manifest = fixture();
    manifest.chapterThemes['8'].greenzone = 'missing';
    browser(manifest);
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt();
    expect(m.environmentDiagnostics().warnings.some((w) => w.includes('bad atlas'))).toBe(true);
    expect(m.paletteForChapter(8, 'greenzone', fallback)).toEqual(fallback);
  });

  it('rejects malformed palette colours before generating or decoding any zone', async () => {
    const manifest = fixture();
    manifest.zones.return.palette.grass[0] = 'not-a-colour';
    const mock = browser(manifest);
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt();
    expect(mock.decoded).toEqual([]);
    expect(m.environmentDiagnostics().warnings.some((w) => w.includes("bad palette 'return/grass'"))).toBe(true);
    expect(m.paletteForChapter(8, 'greenzone', fallback)).toEqual(fallback);
  });

  it('loads authored floor choices only for the exact chapter bank and current map dimensions', async () => {
    browser(floorFixture(), false, 64);
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt();
    const palette = m.paletteForChapter(1, 'greenzone', fallback);
    const design = m.floorDesignForMap(1, 'arcade', palette, { width: 2, height: 2 });
    expect(design?.tiles['0']).toBe('floorArt_court_0');
    expect(m.withEnvironmentArt(palette, [entry()]).map((f) => f.name)).toEqual(['test_0', 'floorArt_court_0']);
    expect(m.floorDesignForMap(1, 'arcade', palette, { width: 3, height: 2 })).toBeUndefined();
    expect(m.floorDesignForMap(1, 'arcade', m.paletteForChapter(8, 'greenzone', fallback), { width: 2, height: 2 })).toBeUndefined();
    expect(m.floorDesignForMap(8, 'arcade', palette, { width: 2, height: 2 })).toBeUndefined();
  });

  it.each(['index', 'missing frame', 'bank', 'shape'])('ignores a floor design with an invalid %s while retaining chapter art', async (fault) => {
    const manifest = floorFixture();
    const design = manifest.floorDesigns['1:arcade'];
    if (fault === 'index') design.tiles['4'] = 'floorArt_court_0';
    if (fault === 'missing frame') design.tiles['0'] = 'floorArt_missing';
    if (fault === 'bank') design.environment = 'return';
    if (fault === 'shape') manifest.floorFrame.anchorY = 1;
    browser(manifest, false, 64);
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt();
    const palette = m.paletteForChapter(1, 'greenzone', fallback);
    expect(m.floorDesignForMap(1, 'arcade', palette, { width: 2, height: 2 })).toBeUndefined();
    expect(m.environmentDiagnostics().loadedZones.sort()).toEqual(['opening', 'return']);
    const original = entry();
    expect(m.withEnvironmentArt(palette, [original])[0]!.image).not.toBe(original.image);
    expect(m.environmentDiagnostics().warnings.some((w) => w.includes('1:arcade:'))).toBe(true);
  });

  it('never paints authored dry floor over wet, tall, blocked or void ground', async () => {
    const m = await import('../src/assets/environment');
    const design = floorFixture().floorDesigns['1:arcade'];
    for (const ground of [Ground.Grass, Ground.Path, Ground.Floor, Ground.Stone, Ground.Sand, Ground.Snow, Ground.Dock, Ground.Carpet]) {
      expect(m.floorFrameForGround(design, 0, ground)).toBe('floorArt_court_0');
    }
    for (const ground of [Ground.Void, Ground.Water, Ground.Deep, Ground.TallGrass, Ground.Forest, Ground.Wall]) {
      expect(m.floorFrameForGround(design, 0, ground)).toBeUndefined();
    }
    expect(m.floorFrameForGround(design, 4, Ground.Floor)).toBeUndefined();
    expect(m.floorFrameForGround(design, -1, Ground.Floor)).toBeUndefined();
    expect(m.floorFrameForGround(design, 1, Ground.Floor)).toBeUndefined();
  });
});

describe('two environment art banks (OPTIONS > ART: CURRENT / NEW, a temporary test option)', () => {
  /** The same zones in another bank, with its own colours (as the vibrant v2 recolour). */
  function vibrant() {
    const m = fixture();
    m.zones.opening.palette = { grass: ['#16a765', '#107e4f', '#96d29c'] };
    return m;
  }

  function twoBanks() {
    const fetchMock = vi.fn(async (url: URL) => ({ ok: true, json: async () => (String(url).includes('environment-ink-vibrant/') ? vibrant() : fixture()) }));
    browser(fixture());
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('starts on the current bank and switches to the new one from its own folder', async () => {
    const fetchMock = twoBanks();
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt();
    expect(m.environmentArtBank()).toBe('current');
    expect(m.paletteForChapter(1, 'greenzone', fallback).grass[0]).toBe('#159b59');
    const currentFrame = m.withEnvironmentArt(m.paletteForChapter(1, 'greenzone', fallback), [entry()])[0]!.image;
    await m.preloadEnvironmentArt('new');
    expect(m.environmentArtBank()).toBe('new');
    expect(m.wantedArtBank()).toBe('new');
    expect(String(fetchMock.mock.calls[1]![0])).toBe('https://example.test/supervillained/environment-ink-vibrant/manifest.json');
    expect(m.paletteForChapter(1, 'greenzone', fallback).grass[0]).toBe('#16a765');
    // A delivered frame replaces the generated one, and it is the new bank's own decoded frame.
    const generated = entry();
    const newFrame = m.withEnvironmentArt(m.paletteForChapter(1, 'greenzone', fallback), [generated])[0]!.image;
    expect(newFrame).not.toBe(generated.image);
    expect(newFrame).not.toBe(currentFrame);
    expect(m.environmentDiagnostics().bank).toBe('new');
  });

  it('switching back reuses the decoded bank (no second fetch)', async () => {
    const fetchMock = twoBanks();
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt('current');
    await m.preloadEnvironmentArt('new');
    await m.preloadEnvironmentArt('current');
    await m.preloadEnvironmentArt('new');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(m.environmentArtBank()).toBe('new');
  });

  it('each bank reports its own problems (the same gap in both banks warns twice)', async () => {
    twoBanks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const m = await import('../src/assets/environment');
    const unknown = { ...entry(), name: 'notInTheAtlas_0' };
    await m.preloadEnvironmentArt('current');
    m.withEnvironmentArt(m.paletteForChapter(1, 'greenzone', fallback), [entry(), unknown]);
    await m.preloadEnvironmentArt('new');
    m.withEnvironmentArt(m.paletteForChapter(1, 'greenzone', fallback), [entry(), unknown]);
    const gaps = m.environmentDiagnostics().warnings.filter((w) => w.includes('notInTheAtlas_0'));
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toMatch(/^current art, opening/);
    expect(gaps[1]).toMatch(/^new art, opening/);
  });

  it('shows the bank chosen in OPTIONS, unless the address asks for one (?art=new|current)', async () => {
    const { chosenArtBank } = await import('../src/assets/environment');
    expect(chosenArtBank(false)).toBe('current');
    expect(chosenArtBank(true)).toBe('new');
    expect(chosenArtBank(false, '?story=1.1&art=new')).toBe('new');
    expect(chosenArtBank(true, '?art=current')).toBe('current');
    expect(chosenArtBank(true, '?art=vibrant')).toBe('new');
  });

  it('keeps building from the bank in use until the other one is decoded, and the last request wins', async () => {
    twoBanks();
    const m = await import('../src/assets/environment');
    await m.preloadEnvironmentArt('current');
    const loading = m.preloadEnvironmentArt('new');
    // Not decoded yet: stages built now still get the complete current bank, while OPTIONS
    // already shows the bank asked for.
    expect(m.environmentArtBank()).toBe('current');
    expect(m.wantedArtBank()).toBe('new');
    // Back to CURRENT before NEW finished loading: CURRENT stays.
    await Promise.all([loading, m.preloadEnvironmentArt('current')]);
    expect(m.environmentArtBank()).toBe('current');
  });
});

