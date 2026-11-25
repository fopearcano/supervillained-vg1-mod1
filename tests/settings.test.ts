import { beforeEach, describe, expect, it } from 'vitest';
import { addCoins, bestFor, DEFAULT_CONTROLS, GESTURE_BINDINGS, loadCoins, loadSettings, nextBinding, nextTextSpeed, nextVolume, saveRecord, saveSettings, validControls, VOLUME_STEPS } from '../src/core/settings';
import { storage } from '../src/core/storage';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

describe('storage without localStorage', () => {
  it('falls back silently', () => {
    const g = globalThis as { localStorage?: unknown };
    const saved = g.localStorage;
    delete g.localStorage;
    expect(storage.get('x', 42)).toBe(42);
    expect(() => storage.set('x', 1)).not.toThrow();
    g.localStorage = saved;
  });

  it('survives a throwing localStorage', () => {
    const g = globalThis as { localStorage?: unknown };
    g.localStorage = {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('quota');
      },
    };
    expect(storage.get('x', 'fallback')).toBe('fallback');
    expect(() => storage.set('x', 1)).not.toThrow();
  });
});

describe('settings, records and coins', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  });

  it('persists mute, volume, text speed and lives', () => {
    expect(loadSettings().muted).toBe(false);
    expect(loadSettings().textSpeed).toBe('normal');
    expect(loadSettings().lives).toBe(2);
    saveSettings({ muted: true, volume: 0.3, textSpeed: 'fast', lives: 5, controls: DEFAULT_CONTROLS });
    expect(loadSettings()).toEqual({ muted: true, volume: 0.3, textSpeed: 'fast', lives: 5, controls: DEFAULT_CONTROLS });
  });

  it('persists the controls, and old saves get the default controls', () => {
    expect(loadSettings().controls).toEqual(DEFAULT_CONTROLS);
    const mine = { swipeUp: 'bark', swipeDown: 'off', doubleTap: 'switch', run: 'toggle', switcher: false, hand: 'left' } as const;
    saveSettings({ ...loadSettings(), controls: { ...mine } });
    expect(loadSettings().controls).toEqual(mine);
  });

  it('repairs unknown control values one by one', () => {
    expect(validControls({ swipeUp: 'laser', swipeDown: 'run', run: 'sometimes', switcher: 'yes', hand: 'both' })).toEqual({
      ...DEFAULT_CONTROLS,
      swipeDown: 'run',
    });
    expect(validControls(null)).toEqual(DEFAULT_CONTROLS);
  });

  it('falls back to normal text speed for unknown values', () => {
    localStorage.setItem('supervillained:settings', JSON.stringify({ textSpeed: 'warp' }));
    expect(loadSettings().textSpeed).toBe('normal');
  });

  it('keeps the best score, best stars and best time', () => {
    expect(saveRecord('l1', { score: 1000, stars: 3, time: 120 })).toBe(true);
    expect(saveRecord('l1', { score: 800, stars: 4.5, time: 100 })).toBe(false);
    expect(bestFor('l1')).toEqual({ score: 1000, stars: 4.5, time: 100 });
    expect(saveRecord('l1', { score: 1500, stars: 2, time: 200 })).toBe(true);
    expect(bestFor('l1')?.score).toBe(1500);
    expect(bestFor('nope')).toBeNull();
  });

  it('accumulates coins', () => {
    expect(loadCoins()).toBe(0);
    addCoins(5);
    expect(addCoins(10)).toBe(15);
    expect(loadCoins()).toBe(15);
  });

  it('ignores corrupted data', () => {
    localStorage.setItem('supervillained:coins', '"lots"');
    localStorage.setItem('supervillained:settings', '{not json');
    expect(loadCoins()).toBe(0);
    expect(loadSettings().muted).toBe(false);
  });
});

describe('stepping through a setting (OPTIONS, the pause menus, CONTROLS)', () => {
  it('cycles the volume through its steps, the loudest back to the quietest', () => {
    expect(nextVolume(0.25)).toBe(0.5);
    expect(nextVolume(0.5)).toBe(0.7);
    expect(nextVolume(0.7)).toBe(1);
    expect(nextVolume(1)).toBe(0.25);
    // A volume between steps (an older default) moves to the step after the next one up.
    expect(nextVolume(0.6)).toBe(1);
    expect(nextVolume(0)).toBe(0.5);
    for (const v of VOLUME_STEPS) expect(VOLUME_STEPS).toContain(nextVolume(v));
  });

  it('cycles the text speed and the gesture bindings in their listed order', () => {
    expect(nextTextSpeed('slow')).toBe('normal');
    expect(nextTextSpeed('instant')).toBe('slow');
    expect(nextBinding('off')).toBe(GESTURE_BINDINGS[1]);
    expect(nextBinding(GESTURE_BINDINGS[GESTURE_BINDINGS.length - 1]!)).toBe('off');
  });
});
