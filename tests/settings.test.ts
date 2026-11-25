import { beforeEach, describe, expect, it } from 'vitest';
import { AUDIO } from '../src/config';
import {
  addCoins,
  bestFor,
  DEFAULT_CONTROLS,
  GESTURE_BINDINGS,
  LEVEL_STEPS,
  levelLabel,
  loadCoins,
  loadSettings,
  nextBinding,
  nextLevel,
  nextTextSpeed,
  saveRecord,
  saveSettings,
  validControls,
} from '../src/core/settings';
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

  it('persists mute, the music and sounds levels, text speed and lives', () => {
    expect(loadSettings().muted).toBe(false);
    expect(loadSettings().textSpeed).toBe('normal');
    expect(loadSettings().lives).toBe(2);
    saveSettings({ muted: true, music: 0.25, sounds: 1, textSpeed: 'fast', lives: 5, controls: DEFAULT_CONTROLS, newArt: true });
    expect(loadSettings()).toEqual({ muted: true, music: 0.25, sounds: 1, textSpeed: 'fast', lives: 5, controls: DEFAULT_CONTROLS, newArt: true });
  });

  it('keeps the current art unless the new one was chosen (OPTIONS > ART, a test option)', () => {
    expect(loadSettings().newArt).toBe(false);
    // An old save's art version from the removed OPTIONS > ART ('new' / 'old' / 'v1') is not a choice.
    storage.set('settings', { art: 'new', newArt: 'yes' });
    expect(loadSettings().newArt).toBe(false);
    storage.set('settings', { newArt: true });
    expect(loadSettings().newArt).toBe(true);
  });

  it('with nothing saved, music and sounds both start at the default level', () => {
    const s = loadSettings();
    expect(s.music).toBe(AUDIO.DEFAULT_VOLUME);
    expect(s.sounds).toBe(AUDIO.DEFAULT_VOLUME);
    expect(s).not.toHaveProperty('volume');
  });

  it('an old save with one VOLUME gives that level to both music and sounds, and the next save drops it', () => {
    // What the game saved before MUSIC and SOUNDS: mute, one volume, text speed, lives, controls.
    const old = { muted: false, volume: 0.5, textSpeed: 'slow', lives: 3, controls: { ...DEFAULT_CONTROLS, hand: 'left' } };
    localStorage.setItem('supervillained:settings', JSON.stringify(old));
    const s = loadSettings();
    expect(s).toEqual({ muted: false, music: 0.5, sounds: 0.5, textSpeed: 'slow', lives: 3, controls: { ...DEFAULT_CONTROLS, hand: 'left' }, newArt: false });
    saveSettings(s);
    const saved = JSON.parse(localStorage.getItem('supervillained:settings')!);
    expect(saved).not.toHaveProperty('volume');
    expect(saved).toMatchObject({ music: 0.5, sounds: 0.5 });
    // An old VOLUME out of range is clamped; a level already saved wins over it.
    localStorage.setItem('supervillained:settings', JSON.stringify({ volume: 3 }));
    expect(loadSettings()).toMatchObject({ music: 1, sounds: 1 });
    localStorage.setItem('supervillained:settings', JSON.stringify({ volume: 0.25, music: 0 }));
    expect(loadSettings()).toMatchObject({ music: 0, sounds: 0.25 });
  });

  it('repairs corrupted levels one by one', () => {
    localStorage.setItem('supervillained:settings', JSON.stringify({ music: 'loud', sounds: -2 }));
    expect(loadSettings()).toMatchObject({ music: AUDIO.DEFAULT_VOLUME, sounds: 0 });
    localStorage.setItem('supervillained:settings', JSON.stringify({ volume: 'max', music: null, sounds: 7 }));
    expect(loadSettings()).toMatchObject({ music: AUDIO.DEFAULT_VOLUME, sounds: 1 });
    // A save that is not an object at all.
    for (const raw of ['null', '0.5', '"loud"', '[1, 2]']) {
      localStorage.setItem('supervillained:settings', raw);
      expect(loadSettings(), raw).toMatchObject({ muted: false, music: AUDIO.DEFAULT_VOLUME, sounds: AUDIO.DEFAULT_VOLUME });
    }
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
  it('cycles a MUSIC / SOUNDS level upward, the loudest back to OFF', () => {
    expect(nextLevel(0)).toBe(0.25);
    expect(nextLevel(0.25)).toBe(0.5);
    expect(nextLevel(0.5)).toBe(0.7);
    expect(nextLevel(0.7)).toBe(1);
    expect(nextLevel(1)).toBe(0);
    // A level between steps (hand-edited storage) goes to the step just above it.
    expect(nextLevel(0.6)).toBe(0.7);
    expect(nextLevel(0.1)).toBe(0.25);
    // From any step, five presses come back to it.
    for (const v of LEVEL_STEPS) {
      let l = v;
      for (let k = 0; k < LEVEL_STEPS.length; k++) {
        l = nextLevel(l);
        expect(LEVEL_STEPS).toContain(l);
      }
      expect(l).toBe(v);
    }
  });

  it('labels a level as the menus show it, short enough for the pause menu', () => {
    expect(LEVEL_STEPS.map(levelLabel)).toEqual(['OFF', '25%', '50%', '70%', '100%']);
    // The pause menu's buttons are 132 px wide; the pixel font is 8 px a glyph.
    for (const v of LEVEL_STEPS) {
      expect(`MUSIC: ${levelLabel(v)}`.length * 8).toBeLessThanOrEqual(132);
      expect(`SOUNDS: ${levelLabel(v)}`.length * 8).toBeLessThanOrEqual(132);
    }
  });

  it('cycles the text speed and the gesture bindings in their listed order', () => {
    expect(nextTextSpeed('slow')).toBe('normal');
    expect(nextTextSpeed('instant')).toBe('slow');
    expect(nextBinding('off')).toBe(GESTURE_BINDINGS[1]);
    expect(nextBinding(GESTURE_BINDINGS[GESTURE_BINDINGS.length - 1]!)).toBe('off');
  });
});
