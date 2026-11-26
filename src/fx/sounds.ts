import { noteFreq, renderVoice, type Sound } from '../core/synth';
import type { FileSoundName } from './audioFiles';

/**
 * Synthesized sound effects (sfxr-style chiptune) for everything that has no recorded file:
 * interface clicks, transitions, stars, jingles. Recorded sounds are in fx/audioFiles.ts.
 */
export const SOUNDS = {
  fetch: { wave: 'square', duty: 0.5, freq: 300, freqEnd: 900, attack: 0.01, sustain: 0.2, decay: 0.15, volume: 0.25, vibratoRate: 12, vibratoDepth: 0.1 },
  warning: [
    { at: 0, def: { wave: 'square', duty: 0.5, freq: noteFreq('A4'), attack: 0.005, sustain: 0.07, decay: 0.03, volume: 0.22 } },
    { at: 0.14, def: { wave: 'square', duty: 0.5, freq: noteFreq('A4'), attack: 0.005, sustain: 0.07, decay: 0.03, volume: 0.22 } },
  ],
  empty: { wave: 'square', duty: 0.5, freq: 200, freqEnd: 120, attack: 0.005, sustain: 0.08, decay: 0.08, volume: 0.25 },
  hurt: [
    { at: 0, def: { wave: 'square', duty: 0.5, freq: 400, freqEnd: 90, attack: 0.002, sustain: 0.1, decay: 0.2, volume: 0.35, crush: 4 } },
    { at: 0, def: { wave: 'noise', freq: 900, freqEnd: 200, attack: 0.002, sustain: 0.08, decay: 0.15, volume: 0.25 } },
  ],
  hit: [
    { at: 0, def: { wave: 'noise', freq: 2400, freqEnd: 300, attack: 0.002, sustain: 0.05, decay: 0.12, volume: 0.35 } },
    { at: 0, def: { wave: 'square', duty: 0.5, freq: 900, freqEnd: 200, attack: 0.002, sustain: 0.04, decay: 0.08, volume: 0.3 } },
  ],
  /** The sword's swing (story fights). */
  swish: { wave: 'noise', freq: 2200, freqEnd: 500, attack: 0.01, sustain: 0.05, decay: 0.09, volume: 0.22 },
  /** A blow on the raised shield. */
  clang: [
    { at: 0, def: { wave: 'square', duty: 0.125, freq: 1480, freqEnd: 1380, attack: 0.001, sustain: 0.03, decay: 0.28, volume: 0.22 } },
    { at: 0, def: { wave: 'triangle', freq: 2230, attack: 0.001, sustain: 0.02, decay: 0.35, volume: 0.2, vibratoRate: 30, vibratoDepth: 0.01 } },
    { at: 0, def: { wave: 'noise', freq: 4000, freqEnd: 1500, attack: 0.001, sustain: 0.02, decay: 0.05, volume: 0.25 } },
  ],
  flee: { wave: 'square', duty: 0.25, freq: 300, freqEnd: 1600, attack: 0.01, sustain: 0.25, decay: 0.2, volume: 0.25, vibratoRate: 20, vibratoDepth: 0.06 },
  saved: [
    { at: 0, def: { wave: 'square', duty: 0.25, freq: noteFreq('G5'), attack: 0.005, sustain: 0.08, decay: 0.04, volume: 0.28 } },
    { at: 0.1, def: { wave: 'square', duty: 0.25, freq: noteFreq('C6'), attack: 0.005, sustain: 0.08, decay: 0.04, volume: 0.28 } },
    { at: 0.2, def: { wave: 'square', duty: 0.25, freq: noteFreq('E6'), attack: 0.005, sustain: 0.2, decay: 0.2, volume: 0.28 } },
  ],
  star: { wave: 'square', duty: 0.25, freq: noteFreq('E6'), attack: 0.002, sustain: 0.06, decay: 0.25, volume: 0.28, arp: [[0.06, 1.5]] },
  jingle: [
    ...['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'].map((n, i) => ({
      at: i * 0.11,
      def: { wave: 'square' as const, duty: 0.25, freq: noteFreq(n), attack: 0.005, sustain: i === 6 ? 0.3 : 0.07, decay: i === 6 ? 0.35 : 0.03, volume: 0.27 },
    })),
    { at: 0, def: { wave: 'triangle', freq: noteFreq('C3'), attack: 0.005, sustain: 0.6, decay: 0.4, volume: 0.35 } },
  ],
  gameover: [
    ...['G4', 'F#4', 'F4', 'E4'].map((n, i) => ({
      at: i * 0.32,
      def: { wave: 'square' as const, duty: 0.5, freq: noteFreq(n), attack: 0.01, sustain: i === 3 ? 0.5 : 0.22, decay: 0.12, volume: 0.28, vibratoRate: i === 3 ? 6 : 0, vibratoDepth: 0.03 },
    })),
  ],
  click: { wave: 'square', duty: 0.5, freq: 1200, attack: 0.001, sustain: 0.015, decay: 0.02, volume: 0.2 },
  glitch: { wave: 'noise', freq: 3000, freqEnd: 200, attack: 0.001, sustain: 0.08, decay: 0.12, volume: 0.25, crush: 6 },
  /** The band's NOW!: a big comic-book hit (a low thump, a noise blast, a falling growl). */
  boom: [
    { at: 0, def: { wave: 'triangle', freq: 150, freqEnd: 38, attack: 0.001, sustain: 0.14, decay: 0.38, volume: 0.55 } },
    { at: 0, def: { wave: 'noise', freq: 1600, freqEnd: 110, attack: 0.001, sustain: 0.1, decay: 0.32, volume: 0.36, crush: 3 } },
    { at: 0.01, def: { wave: 'square', duty: 0.5, freq: 480, freqEnd: 80, attack: 0.002, sustain: 0.09, decay: 0.26, volume: 0.3, crush: 4 } },
  ],
} satisfies Record<string, Sound>;

export type SynthSoundName = keyof typeof SOUNDS;
/** Every sound the game can play: synthesized or recorded. */
export type SoundName = SynthSoundName | FileSoundName;

/**
 * Medieval loop for the dream (D dorian): a recorder-like lead over a drone fifth and a tabor.
 * Estampie-ish, 6/8 feel, 8 bars.
 */
export function renderMedievalMusic(sampleRate: number): Float32Array {
  const bpm = 104;
  const beat = 60 / bpm / 2; // eighth notes, 6 per bar
  const bars = 8;
  const out = new Float32Array(Math.ceil(bars * 6 * beat * sampleRate));
  const lead = [
    'D5 E5 F5 E5 D5 A4',
    'C5 D5 E5 D5 C5 A4',
    'D5 F5 G5 A5 G5 F5',
    'E5 D5 C5 D5 - -',
    'A5 G5 F5 G5 A5 C6',
    'B5 A5 G5 A5 F5 E5',
    'D5 E5 F5 G5 E5 C5',
    'D5 - A4 D5 - -',
  ];
  for (let bar = 0; bar < bars; bar++) {
    lead[bar]!.split(' ').forEach((n, i) => {
      if (n === '-') return;
      const at = (bar * 6 + i) * beat;
      renderVoice(
        { wave: 'triangle', freq: noteFreq(n), attack: 0.02, sustain: beat * 0.7, decay: beat * 0.25, volume: 0.2, vibratoRate: 5, vibratoDepth: 0.012 },
        sampleRate,
        out,
        Math.floor(at * sampleRate),
      );
    });
    // Drone: D3 + A3, re-struck each bar.
    for (const n of ['D3', 'A3']) {
      renderVoice({ wave: 'saw', freq: noteFreq(n), attack: 0.08, sustain: beat * 5.2, decay: beat * 0.6, volume: 0.05, lowpass: 0.08 }, sampleRate, out, Math.floor(bar * 6 * beat * sampleRate));
    }
    // Tabor: strong on 1 and 4, light on 6.
    for (const [i, v] of [
      [0, 0.32],
      [3, 0.24],
      [5, 0.1],
    ] as const) {
      renderVoice({ wave: 'sine', freq: 120, freqEnd: 60, attack: 0.002, sustain: 0.02, decay: 0.09, volume: v }, sampleRate, out, Math.floor((bar * 6 + i) * beat * sampleRate));
      renderVoice({ wave: 'noise', freq: 2400, attack: 0.001, sustain: 0.01, decay: 0.04, volume: v * 0.25 }, sampleRate, out, Math.floor((bar * 6 + i) * beat * sampleRate), bar * 6 + i + 3);
    }
  }
  for (let k = 0; k < out.length; k++) out[k] = Math.tanh(out[k]! * 1.1);
  return out;
}
