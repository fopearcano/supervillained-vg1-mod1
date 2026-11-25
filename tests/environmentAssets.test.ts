import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STORY_MAPS, THEMES } from '../src/story/maps';
import { parseAsciiMap } from '../src/world/level';

interface FrameDef {
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
}

interface EnvironmentManifest {
  version: number;
  artDirection?: { version: number; name: string };
  zones: Record<string, {
    image: string;
    frames: Record<string, FrameDef>;
    palette?: Record<string, string | string[]>;
    artDirection?: { version: number; dominant: string; strategy: string };
  }>;
  chapterThemes?: Record<string, Record<string, string>>;
  themeFallbacks: Record<string, string>;
  floorDesigns: Record<string, { width: number; height: number; environment: string }>;
}

interface VibrancyReport {
  geometryInvariant: boolean;
  alphaInvariant: boolean;
  zones: Record<string, { changedOpaquePixels: number; opaquePixels: number; alphaSha256: string }>;
}

/** The two banks OPTIONS > ART chooses between (src/assets/environment.ts, BANK_DIRS). */
const BANKS = [
  { name: 'current (Color Ink v1)', dir: '../public/environment-ink/' },
  { name: 'new (vibrant v2, a test option)', dir: '../public/environment-ink-vibrant/' },
] as const;

function load(dir: string): { url: URL; manifest: EnvironmentManifest } {
  const url = new URL(`${dir}manifest.json`, import.meta.url);
  return { url, manifest: JSON.parse(readFileSync(url, 'utf8')) as EnvironmentManifest };
}

/** A PNG's size, from its IHDR chunk. */
function pngSize(url: URL): [number, number] {
  const bytes = readFileSync(url);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function colorDistance(a: string, b: string): number {
  const aa = rgb(a);
  const bb = rgb(b);
  return Math.hypot(aa[0] - bb[0], aa[1] - bb[1], aa[2] - bb[2]);
}

describe.each(BANKS)('delivered Color Ink runtime assets: $name', ({ dir }) => {
  const { url: manifestUrl, manifest } = load(dir);

  it('ships every local chapter bank with the same native frame contract', () => {
    expect(manifest.version).toBe(1);
    expect(Object.keys(manifest.zones)).toHaveLength(15);

    const baseline = manifest.zones.ch01_greenzone!;
    const nativeNames = Object.keys(baseline.frames).filter((name) => !name.startsWith('floorArt_')).sort();
    expect(nativeNames).toHaveLength(104);

    for (const [id, zone] of Object.entries(manifest.zones)) {
      expect(zone.image, id).toMatch(/^[a-zA-Z0-9_.-]+\.png$/);
      expect(statSync(new URL(zone.image, manifestUrl)).size, id).toBeGreaterThan(0);
      const names = Object.keys(zone.frames).filter((name) => !name.startsWith('floorArt_')).sort();
      expect(names, id).toEqual(nativeNames);
      for (const name of nativeNames) {
        const actual = zone.frames[name]!;
        const expected = baseline.frames[name]!;
        expect(
          [actual.w, actual.h, actual.anchorX, actual.anchorY],
          `${id}/${name}`,
        ).toEqual([expected.w, expected.h, expected.anchorX, expected.anchorY]);
      }
      for (const [name, frame] of Object.entries(zone.frames)) {
        if (!name.startsWith('floorArt_')) continue;
        expect([frame.w, frame.h, frame.anchorX, frame.anchorY], `${id}/${name}`).toEqual([32, 16, 16, 0]);
      }
    }
  });

  it('covers every current story theme and matches story floor dimensions', () => {
    for (const theme of Object.keys(THEMES)) {
      const zone = manifest.themeFallbacks[theme];
      expect(zone, theme).toBeTypeOf('string');
      expect(manifest.zones[zone!], theme).toBeDefined();
    }

    for (const [key, design] of Object.entries(manifest.floorDesigns)) {
      if (key === '1:arcade') continue; // Intentionally not selected by the redesigned Green Zone.
      const mapKey = key.slice(key.indexOf(':') + 1) as keyof typeof STORY_MAPS;
      const def = STORY_MAPS[mapKey];
      expect(def, key).toBeDefined();
      const level = parseAsciiMap(def.rows, { base: def.base, requireExit: false });
      expect([design.width, design.height], key).toEqual([level.width, level.height]);
      expect(manifest.zones[design.environment], key).toBeDefined();
    }
  });
});

describe('the vibrant bank (OPTIONS > ART: NEW (TEST)) is the current one recoloured', () => {
  const current = load(BANKS[0].dir);
  const vibrant = load(BANKS[1].dir);
  const report = JSON.parse(
    readFileSync(new URL('../docs/art-direction/vibrant-palette-report.json', import.meta.url), 'utf8'),
  ) as VibrancyReport;

  it('changes nothing but colours: zones, atlas sizes, frame rectangles, floors and themes', () => {
    const c = current.manifest;
    const v = vibrant.manifest;
    expect(Object.keys(v.zones).sort()).toEqual(Object.keys(c.zones).sort());
    for (const [id, zone] of Object.entries(c.zones)) {
      const other = v.zones[id]!;
      expect(other.image, id).toBe(zone.image);
      expect(other.frames, id).toEqual(zone.frames);
      expect(pngSize(new URL(other.image, vibrant.url)), id).toEqual(pngSize(new URL(zone.image, current.url)));
    }
    // Floor compositions are visual only, and the same in both banks: no map, marker or script changes.
    expect(v.floorDesigns).toEqual(c.floorDesigns);
    expect(v.chapterThemes).toEqual(c.chapterThemes);
    expect(v.themeFallbacks).toEqual(c.themeFallbacks);
  });

  it('declares and verifies the vibrant multi-material art direction', () => {
    const manifest = vibrant.manifest;
    expect(manifest.artDirection?.version).toBe(2);
    expect(current.manifest.artDirection).toBeUndefined();
    expect(Object.keys(report.zones).sort()).toEqual(Object.keys(manifest.zones).sort());
    expect(report.geometryInvariant).toBe(true);
    expect(report.alphaInvariant).toBe(true);

    for (const [id, zone] of Object.entries(manifest.zones)) {
      expect(zone.artDirection?.version, id).toBe(2);
      expect(zone.artDirection?.strategy, id).toBe('dominant-plus-semantic-material-ramps');
      const grass = zone.palette!.grass as string[];
      const water = zone.palette!.water as string[];
      const path = zone.palette!.path as string[];
      expect(colorDistance(grass[0]!, water[0]!), `${id}: grass/water`).toBeGreaterThan(35);
      expect(colorDistance(grass[0]!, path[0]!), `${id}: grass/path`).toBeGreaterThan(35);

      const zoneReport = report.zones[id]!;
      expect(zoneReport.changedOpaquePixels, id).toBeGreaterThan(zoneReport.opaquePixels * 0.45);
      expect(zoneReport.alphaSha256, id).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
