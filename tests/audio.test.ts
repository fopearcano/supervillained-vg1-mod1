import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../src/core/audio';
import type { Settings } from '../src/core/settings';
import { MUSIC_FILES, SOUND_FILES } from '../src/fx/audioFiles';
import { SOUNDS } from '../src/fx/sounds';

describe('recorded audio', () => {
  it('points every sound and music track at a file in assets/', () => {
    for (const [name, url] of Object.entries(SOUND_FILES)) {
      expect(existsSync(`assets/sounds/${basename(url)}`), name).toBe(true);
    }
    for (const [name, url] of Object.entries(MUSIC_FILES)) {
      expect(existsSync(`assets/music/${basename(url)}`), name).toBe(true);
    }
  });

  it('never has a recorded and a synthesized sound with the same name', () => {
    for (const name of Object.keys(SOUND_FILES)) expect(Object.keys(SOUNDS), name).not.toContain(name);
  });
});

/** The engine as node sees it: no AudioContext, so nothing sounds; only what it wants changes. */
function silentEngine(): AudioEngine {
  vi.stubGlobal('window', { addEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn(), hidden: false });
  return new AudioEngine({ muted: false, volume: 1 } as Settings);
}

/** What the engine wants from the music (private state). */
function music(audio: AudioEngine) {
  const s = audio as unknown as { track: string; duck: number; wantMusic: boolean };
  return { track: s.track, duck: s.duck, wantMusic: s.wantMusic };
}

describe('playTrack (the music for a new screen)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('is setTrack, setDuck(1) and startMusic, in that order', () => {
    const audio = silentEngine();
    const setTrack = vi.spyOn(audio, 'setTrack');
    const setDuck = vi.spyOn(audio, 'setDuck');
    const startMusic = vi.spyOn(audio, 'startMusic');
    audio.playTrack('greenzone');
    expect(setTrack).toHaveBeenCalledExactlyOnceWith('greenzone');
    expect(setDuck).toHaveBeenCalledExactlyOnceWith(1);
    expect(startMusic).toHaveBeenCalledOnce();
    expect(setTrack.mock.invocationCallOrder[0]!).toBeLessThan(setDuck.mock.invocationCallOrder[0]!);
    expect(setDuck.mock.invocationCallOrder[0]!).toBeLessThan(startMusic.mock.invocationCallOrder[0]!);
  });

  it("switches the track and lifts the pause menu's ducking", () => {
    const audio = silentEngine();
    audio.setDuck(0.4);
    audio.playTrack('level2');
    expect(music(audio)).toEqual({ track: 'level2', duck: 1, wantMusic: true });
  });

  it('on the track it is already on, still lifts the ducking (node has no playback to observe)', () => {
    const audio = silentEngine();
    audio.playTrack('intro');
    audio.setDuck(0.4);
    audio.playTrack('intro');
    expect(music(audio)).toEqual({ track: 'intro', duck: 1, wantMusic: true });
  });
});
