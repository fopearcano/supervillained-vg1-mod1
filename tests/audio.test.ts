import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUDIO } from '../src/config';
import { AudioEngine, busGains } from '../src/core/audio';
import { DEFAULT_CONTROLS, type Settings } from '../src/core/settings';
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
  return new AudioEngine({ muted: false, music: 1, sounds: 1 } as Settings);
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

describe('busGains (SOUND on/off, the MUSIC and SOUNDS levels, ducking)', () => {
  const on = { muted: false, music: 1, sounds: 1 };

  it('SOUND: OFF silences the master; ON leaves the levels to the two buses', () => {
    expect(busGains({ ...on, muted: true }, 'intro', 1).master).toBe(0);
    expect(busGains(on, 'intro', 1).master).toBe(1);
    expect(busGains({ ...on, music: 0.25, sounds: 0.5 }, 'intro', 1).master).toBe(1);
  });

  it('the music is the track base × the MUSIC level × the ducking, and ignores SOUNDS', () => {
    expect(busGains({ ...on, music: 0.5 }, 'greenzone', 1).music).toBeCloseTo(AUDIO.MUSIC_FILE_VOLUME * 0.5);
    expect(busGains({ ...on, music: 0.5 }, 'medieval', 1).music).toBeCloseTo(AUDIO.MUSIC_VOLUME * 0.5);
    expect(busGains({ ...on, music: 0.5 }, 'greenzone', 0.4).music).toBeCloseTo(AUDIO.MUSIC_FILE_VOLUME * 0.5 * 0.4);
    expect(busGains({ ...on, music: 0 }, 'intro', 1).music).toBe(0);
    expect(busGains({ ...on, sounds: 0 }, 'intro', 1).music).toBeCloseTo(AUDIO.MUSIC_FILE_VOLUME);
  });

  it('the effects are their base × the SOUNDS level, and ignore MUSIC and the ducking', () => {
    expect(busGains({ ...on, sounds: 0.7 }, 'intro', 1).sfx).toBeCloseTo(AUDIO.SFX_VOLUME * 0.7);
    expect(busGains({ ...on, sounds: 0 }, 'intro', 1).sfx).toBe(0);
    expect(busGains({ ...on, music: 0 }, 'medieval', 0.4).sfx).toBeCloseTo(AUDIO.SFX_VOLUME);
  });
});

/** A WebAudio stand-in: gain nodes whose setTargetAtTime lands at once, so the targets can be read. */
class FakeParam {
  value = 1;
  setTargetAtTime(v: number): this {
    this.value = v;
    return this;
  }
}
class FakeGain {
  readonly gain = new FakeParam();
  connect<T>(node: T): T {
    return node;
  }
}
class FakeContext {
  state = 'running';
  currentTime = 0;
  readonly destination = {};
  createGain(): FakeGain {
    return new FakeGain();
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
  decodeAudioData(): Promise<never> {
    return Promise.reject(new Error('no audio in node'));
  }
}

/** An engine over the stand-in context (locked until `unlock()`, as before the first tap). */
function fakeEngine(settings: Settings): AudioEngine {
  vi.stubGlobal('window', { addEventListener: vi.fn(), AudioContext: FakeContext });
  vi.stubGlobal('document', { addEventListener: vi.fn(), hidden: false });
  // The recorded sounds are not fetched in node; their warnings are noise here.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  return new AudioEngine(settings);
}

/** The three buses' current gains (private nodes). */
function buses(audio: AudioEngine) {
  const s = audio as unknown as { master: FakeGain; music: FakeGain; sfx: FakeGain };
  return { master: s.master.gain.value, music: s.music.gain.value, sfx: s.sfx.gain.value };
}

describe('the engine sets its buses from the MUSIC and SOUNDS levels', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const settings = (over: Partial<Settings> = {}): Settings => ({ muted: false, music: 1, sounds: 1, textSpeed: 'normal', lives: 2, controls: DEFAULT_CONTROLS, newArt: false, ...over });

  it('levels changed before the first tap apply when audio unlocks', () => {
    const s = settings();
    const audio = fakeEngine(s);
    s.music = 0.25;
    s.sounds = 0.5;
    audio.applySettings(s);
    audio.unlock();
    expect(buses(audio)).toEqual(busGains(s, 'intro', 1));
    expect(buses(audio).music).toBeCloseTo(AUDIO.MUSIC_FILE_VOLUME * 0.25);
    expect(buses(audio).sfx).toBeCloseTo(AUDIO.SFX_VOLUME * 0.5);
  });

  it('applySettings retargets the music and the effects, not only the master', () => {
    const s = settings();
    const audio = fakeEngine(s);
    audio.unlock();
    s.music = 0;
    audio.applySettings(s);
    expect(buses(audio)).toEqual({ master: 1, music: 0, sfx: AUDIO.SFX_VOLUME });
    s.music = 0.7;
    s.sounds = 0.25;
    audio.applySettings(s);
    expect(buses(audio).music).toBeCloseTo(AUDIO.MUSIC_FILE_VOLUME * 0.7);
    expect(buses(audio).sfx).toBeCloseTo(AUDIO.SFX_VOLUME * 0.25);
    s.muted = true;
    audio.applySettings(s);
    expect(buses(audio).master).toBe(0);
  });

  it('ducking and a new track keep the MUSIC level', () => {
    const s = settings({ music: 0.5 });
    const audio = fakeEngine(s);
    audio.unlock();
    audio.setDuck(0.4);
    expect(buses(audio).music).toBeCloseTo(AUDIO.MUSIC_FILE_VOLUME * 0.5 * 0.4);
    audio.setTrack('medieval');
    expect(buses(audio).music).toBeCloseTo(AUDIO.MUSIC_VOLUME * 0.5 * 0.4);
    audio.setDuck(1);
    expect(buses(audio).music).toBeCloseTo(AUDIO.MUSIC_VOLUME * 0.5);
  });
});
