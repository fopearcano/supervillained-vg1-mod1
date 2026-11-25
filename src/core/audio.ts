import { AUDIO } from '../config';
import { MUSIC_FILES, SOUND_FILES, type FileMusicTrack, type FileSoundName } from '../fx/audioFiles';
import { SOUNDS, renderMedievalMusic, type SoundName, type SynthSoundName } from '../fx/sounds';
import type { Settings } from './settings';
import { renderSound } from './synth';

const SFX_RATE = 22050;
const MUSIC_RATE = 22050;
/** Recorded tracks are streamed (intro, Green Zone, levels 2-4); 'medieval' is synthesized for the other dream levels. */
export type MusicTrack = FileMusicTrack | 'medieval';

interface Clip {
  buffer: AudioBuffer;
  /** Seconds of leading silence to skip. */
  offset: number;
}

/**
 * WebAudio output. Recorded sound effects (assets/sounds) are fetched and decoded once when audio
 * is unlocked; the remaining effects are synthesized into buffers on first use. Recorded music
 * (assets/music) is streamed through an <audio> element routed into the same graph, so volume,
 * mute and ducking apply to everything. The context starts on the first user gesture (autoplay
 * rules) and everything is paused while the app is in the background.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private readonly synth = new Map<SynthSoundName, AudioBuffer>();
  private readonly files = new Map<FileSoundName, Clip>();
  private readonly lastPlayed = new Map<SoundName, number>();
  private readonly loops = new Map<SoundName, { src: AudioBufferSourceNode; gain: GainNode } | 'pending'>();
  private readonly elements = new Map<FileMusicTrack, HTMLAudioElement>();
  private medieval: AudioBuffer | null = null;
  private track: MusicTrack = 'intro';
  private musicSource: AudioBufferSourceNode | null = null;
  private playingElement: HTMLAudioElement | null = null;
  private wantMusic = false;
  private duck = 1;

  constructor(private settings: Settings) {
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.playingElement?.pause();
        void this.ctx.suspend().catch(() => {});
      } else {
        void this.ctx.resume().catch(() => {});
        if (this.playingElement && this.wantMusic) void this.playingElement.play().catch(() => {});
      }
    });
    // Where sound may start without a tap (the Android app: Capacitor's WebView drops the gesture
    // requirement), start now so the intro music plays as soon as the title appears.
    if (autoplayAllowed()) this.unlock();
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.sfx = this.ctx.createGain();
        this.music = this.ctx.createGain();
        this.sfx.gain.value = AUDIO.SFX_VOLUME;
        this.music.gain.value = this.musicLevel();
        this.sfx.connect(this.master);
        this.music.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.applySettings(this.settings);
        void this.loadFiles();
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
      // Media elements may only start from a gesture: retry the wanted track now.
      this.ensureMusicPlaying();
    } catch (err) {
      console.warn('[audio] unavailable', err);
    }
  }

  /** Fetches and decodes every recorded sound effect (small files). */
  private async loadFiles(): Promise<void> {
    const ctx = this.ctx!;
    await Promise.all(
      (Object.entries(SOUND_FILES) as Array<[FileSoundName, string]>).map(async ([name, url]) => {
        try {
          const data = await (await fetch(url)).arrayBuffer();
          const buffer = await ctx.decodeAudioData(data);
          this.files.set(name, { buffer, offset: leadingSilence(buffer) });
        } catch (err) {
          console.warn(`[audio] could not load ${name}`, err);
        }
      }),
    );
    // A loop asked for before its file was ready starts now.
    for (const [name, state] of this.loops) if (state === 'pending') this.startLoop(name as FileSoundName);
  }

  applySettings(s: Settings): void {
    this.settings = s;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(s.muted ? 0 : s.volume, this.ctx.currentTime, 0.02);
    }
  }

  private buffer(name: SoundName): Clip | null {
    if (name in SOUND_FILES) return this.files.get(name as FileSoundName) ?? null;
    let buf = this.synth.get(name as SynthSoundName);
    if (!buf && this.ctx) {
      const data = renderSound(SOUNDS[name as SynthSoundName], SFX_RATE);
      buf = this.ctx.createBuffer(1, data.length, SFX_RATE);
      buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      this.synth.set(name as SynthSoundName, buf);
    }
    return buf ? { buffer: buf, offset: 0 } : null;
  }

  /** Plays a sound effect. `delay` in seconds; `volume` multiplies the file's own trim. */
  play(name: SoundName, opts: { volume?: number; rate?: number; delay?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || this.settings.muted || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < 0.045) return;
    this.lastPlayed.set(name, now);
    const clip = this.buffer(name);
    if (!clip) return;
    const src = ctx.createBufferSource();
    src.buffer = clip.buffer;
    src.playbackRate.value = opts.rate ?? 1;
    const g = ctx.createGain();
    g.gain.value = (opts.volume ?? 1) * (AUDIO.FILE_GAIN[name] ?? 1);
    src.connect(g).connect(this.sfx);
    src.start(now + (opts.delay ?? 0), clip.offset);
  }

  /** Starts (or keeps) a looping recorded sound, e.g. the siren while under attack. */
  loop(name: FileSoundName, opts: { volume?: number; delay?: number } = {}): void {
    if (this.loops.has(name)) return;
    this.loops.set(name, 'pending');
    this.loopOpts.set(name, opts);
    if (this.ctx && this.files.has(name)) this.startLoop(name);
  }

  private readonly loopOpts = new Map<SoundName, { volume?: number; delay?: number }>();

  private startLoop(name: FileSoundName): void {
    const ctx = this.ctx;
    const clip = this.files.get(name);
    if (!ctx || !this.sfx || !clip || this.loops.get(name) !== 'pending') return;
    const opts = this.loopOpts.get(name) ?? {};
    const src = ctx.createBufferSource();
    src.buffer = clip.buffer;
    src.loop = true;
    src.loopStart = clip.offset;
    src.loopEnd = clip.buffer.duration;
    const gain = ctx.createGain();
    gain.gain.value = (opts.volume ?? 1) * (AUDIO.FILE_GAIN[name] ?? 1);
    src.connect(gain).connect(this.sfx);
    src.start(ctx.currentTime + (opts.delay ?? 0), clip.offset);
    this.loops.set(name, { src, gain });
  }

  stopLoop(name: FileSoundName): void {
    const l = this.loops.get(name);
    this.loops.delete(name);
    if (!l || l === 'pending' || !this.ctx) return;
    l.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    try {
      l.src.stop(this.ctx.currentTime + 0.4);
    } catch {
      /* already stopped */
    }
  }

  stopAllLoops(): void {
    for (const name of [...this.loops.keys()]) this.stopLoop(name as FileSoundName);
  }

  startMusic(): void {
    this.wantMusic = true;
    this.ensureMusicPlaying();
  }

  stopMusic(): void {
    this.wantMusic = false;
    this.stopCurrent();
  }

  private stopCurrent(): void {
    try {
      this.musicSource?.stop();
    } catch {
      /* already stopped */
    }
    this.musicSource = null;
    if (this.playingElement) {
      this.playingElement.pause();
      this.playingElement = null;
    }
  }

  private musicLevel(): number {
    return (this.track === 'medieval' ? AUDIO.MUSIC_VOLUME : AUDIO.MUSIC_FILE_VOLUME) * this.duck;
  }

  /** Lowers the music (e.g. 0.4 during "under attack" or the pause menu). */
  setDuck(amount: number): void {
    if (Math.abs(amount - this.duck) < 0.01) return;
    this.duck = amount;
    if (this.music && this.ctx) this.music.gain.setTargetAtTime(this.musicLevel(), this.ctx.currentTime, 0.15);
  }

  /** Switches the music: 'intro' (reading screens), a level's own track, 'medieval' (the other dream levels). */
  setTrack(track: MusicTrack): void {
    if (track === this.track) return;
    const wasPlaying = this.musicSource !== null || this.playingElement !== null;
    this.stopCurrent();
    this.track = track;
    if (this.music && this.ctx) this.music.gain.setTargetAtTime(this.musicLevel(), this.ctx.currentTime, 0.05);
    if (wasPlaying || this.wantMusic) this.ensureMusicPlaying();
  }

  /**
   * The music for a new screen: switches to `track` (the same track keeps playing where it is),
   * lifts any ducking and starts the music if it was stopped. Pause menus and the siren duck with
   * setDuck alone.
   */
  playTrack(track: MusicTrack): void {
    this.setTrack(track);
    this.setDuck(1);
    this.startMusic();
  }

  private ensureMusicPlaying(): void {
    const ctx = this.ctx;
    if (!ctx || !this.music || !this.wantMusic || this.musicSource || this.playingElement) return;
    if (this.track === 'medieval') {
      if (!this.medieval) {
        const data = renderMedievalMusic(MUSIC_RATE);
        this.medieval = ctx.createBuffer(1, data.length, MUSIC_RATE);
        this.medieval.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      }
      const src = ctx.createBufferSource();
      src.buffer = this.medieval;
      src.loop = true;
      src.connect(this.music);
      src.start();
      this.musicSource = src;
      return;
    }
    let el = this.elements.get(this.track);
    if (!el) {
      el = new Audio(MUSIC_FILES[this.track]);
      el.loop = true;
      el.preload = 'auto';
      // Per-track loudness trim (the level tracks are mastered louder than the Green Zone's).
      const trim = ctx.createGain();
      trim.gain.value = AUDIO.MUSIC_FILE_GAIN[this.track] ?? 1;
      ctx.createMediaElementSource(el).connect(trim).connect(this.music);
      this.elements.set(this.track, el);
    }
    // Each track picks up where it was paused: switching between the intro (reading screens) and
    // the level's music does not restart either from the top.
    this.playingElement = el;
    const playing = el;
    void el.play().catch(() => {
      // Not allowed yet (no gesture): the next unlock() retries.
      if (this.playingElement === playing) this.playingElement = null;
    });
  }
}

/** True in the native app, or in a browser that says audio may start without a user gesture. */
function autoplayAllowed(): boolean {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor?.isNativePlatform?.()) return true;
  const nav = navigator as Navigator & { getAutoplayPolicy?: (type: 'audiocontext') => string };
  try {
    return nav.getAutoplayPolicy?.('audiocontext') === 'allowed';
  } catch {
    return false;
  }
}

/** Seconds before the first sample louder than AUDIO.TRIM_LEVEL. */
function leadingSilence(buffer: AudioBuffer): number {
  const ch = buffer.getChannelData(0);
  for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i]!) > AUDIO.TRIM_LEVEL) return Math.max(0, i / buffer.sampleRate - 0.01);
  return 0;
}
