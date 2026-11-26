import { Container, Graphics } from 'pixi.js';
import { TITLE } from '../config';
import { Rng } from '../core/rng';
import { hex } from './retro';

const D = TITLE.DISCO;

/**
 * The beat the lights follow, in beats (the integer part counts beats): eased toward the music's
 * own position when it plays (`target`), a steady clock at the same tempo when it does not (before
 * the first tap, or with the music off). A gap of more than SNAP_BEATS (the track looped, or the
 * music just started) snaps; smaller ones ease in, so the element's coarse clock does not jitter
 * the lights. Pure (tested).
 */
export function followBeat(current: number, target: number | null, dt: number, bpm: number = D.BPM): number {
  const next = current + (dt * bpm) / 60;
  if (target === null) return next;
  const gap = target - next;
  return Math.abs(gap) > D.SNAP_BEATS ? target : next + gap * D.EASE;
}

/** The music's position (seconds into the title track) as a beat. */
export function beatAt(seconds: number): number {
  return ((seconds - D.FIRST_BEAT) * D.BPM) / 60;
}

export interface LightLevels {
  /** Index of the current beat, and its place in the bar (0 = downbeat). */
  beat: number;
  inBar: number;
  /** Alpha of the beams, of the coloured wash, of the white strobe (0 between flashes). */
  beam: number;
  wash: number;
  strobe: number;
  /** The colour of this beat (an index into TITLE.DISCO.COLORS). */
  color: number;
}

/**
 * How bright everything is at a beat position: every beat the beams kick and a coloured wash
 * flashes; the first beat of each bar is a white strobe instead of the wash. Pure (tested: never
 * more than 3 flashes a second).
 */
export function lightLevels(beatPos: number, bpm: number = D.BPM): LightLevels {
  const beat = Math.floor(beatPos);
  const sinceBeat = ((beatPos - beat) * 60) / bpm;
  const inBar = ((beat % 4) + 4) % 4;
  const pulse = Math.exp(-sinceBeat * D.PULSE_DECAY);
  const downbeat = inBar === 0;
  return {
    beat,
    inBar,
    beam: D.BEAM_ALPHA + D.BEAM_PULSE * pulse,
    wash: downbeat ? 0 : D.WASH_ALPHA * pulse,
    strobe: downbeat ? D.STROBE_ALPHA * Math.exp(-sinceBeat * D.STROBE_DECAY) : 0,
    color: ((beat % D.COLORS.length) + D.COLORS.length) % D.COLORS.length,
  };
}

interface Speck {
  x: number;
  y: number;
  size: number;
  phase: number;
}

/**
 * Disco lights over the title's backdrop (under the lettering, the portrait and the buttons):
 * coloured beams sweeping down from the top edge, mirror-ball specks drifting across, and a flash
 * on every beat of the title music. Additive light, drawn at the game's pixel resolution.
 */
export class DiscoLights {
  readonly root = new Container();
  /** The darker room (normal blend), under the additive light. */
  private readonly veil = new Graphics();
  private readonly beams = new Graphics();
  private readonly specks = new Graphics();
  private readonly flash = new Graphics();
  private readonly dots: Speck[] = [];
  private w = 216;
  private h = 400;
  private time = 0;
  private beatPos = 0;

  constructor() {
    for (const g of [this.beams, this.specks, this.flash]) g.blendMode = 'add';
    this.root.addChild(this.veil, this.beams, this.specks, this.flash);
    // The same specks every time (a seeded scatter, not Math.random).
    const rng = new Rng(0xd15c0);
    for (let k = 0; k < D.SPECKS; k++) {
      this.dots.push({ x: rng.next(), y: 0.06 + rng.next() * 0.9, size: rng.next() < 0.3 ? 2 : 1, phase: rng.next() * Math.PI * 2 });
    }
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  /** `musicSeconds`: the title track's position when it plays (AudioEngine.musicPosition), else null. */
  update(dt: number, musicSeconds: number | null): void {
    this.time += dt;
    this.beatPos = followBeat(this.beatPos, musicSeconds === null ? null : beatAt(musicSeconds), dt);
    const fade = Math.min(1, this.time / D.FADE_IN);
    const lv = lightLevels(this.beatPos);
    this.veil.clear().rect(0, 0, this.w, this.h).fill({ color: 0x000000, alpha: D.DARKEN * fade });
    this.drawBeams(lv, fade);
    this.drawSpecks(lv, fade);
    this.drawFlash(lv, fade);
  }

  /** Light cones from the top edge, sweeping on the beat, two tones (a brighter core). */
  private drawBeams(lv: LightLevels, fade: number): void {
    const g = this.beams.clear();
    const { w, h } = this;
    const len = h * 1.25;
    D.BEAM_X.forEach((fx, i) => {
      // Neighbours sweep against each other; the whole set turns every BEAM_SWEEP_BEATS beats. At
      // rest each leans toward the middle (the edge beams most), so all four stay on the screen.
      const phase = (this.beatPos / D.BEAM_SWEEP_BEATS) * Math.PI * 2 + (i % 2 ? Math.PI : 0) + i * 0.7;
      const angle = Math.PI / 2 + Math.sin(phase) * D.BEAM_SWEEP + (fx - 0.5) * 0.6;
      const x0 = Math.round(w * fx);
      const y0 = -4;
      const color = hex(D.COLORS[(lv.color + i * 2) % D.COLORS.length]!);
      for (const [spread, share] of [[D.BEAM_SPREAD, 1], [D.BEAM_SPREAD * 0.4, 0.9]] as const) {
        const a = Math.max(0, lv.beam * share * fade);
        g.poly([
          x0, y0,
          x0 + Math.cos(angle - spread) * len, y0 + Math.sin(angle - spread) * len,
          x0 + Math.cos(angle + spread) * len, y0 + Math.sin(angle + spread) * len,
        ]).fill({ color, alpha: a });
      }
    });
  }

  /** Mirror-ball specks: small squares drifting sideways, twinkling, brighter on the beat. */
  private drawSpecks(lv: LightLevels, fade: number): void {
    const g = this.specks.clear();
    const { w, h } = this;
    const drift = this.beatPos * D.SPECK_DRIFT;
    for (const d of this.dots) {
      const x = Math.round((((d.x * (w + 20) + drift) % (w + 20)) + (w + 20)) % (w + 20)) - 10;
      const y = Math.round(d.y * h);
      const twinkle = 0.45 + 0.35 * Math.sin(this.time * 5 + d.phase) + 0.4 * (lv.beam - D.BEAM_ALPHA) / D.BEAM_PULSE;
      g.rect(x, y, d.size, d.size).fill({ color: 0xffffff, alpha: Math.max(0, Math.min(1, twinkle)) * 0.7 * fade });
    }
  }

  /** The beat's flash: a coloured wash, or on the bar's first beat a short white strobe. */
  private drawFlash(lv: LightLevels, fade: number): void {
    const g = this.flash.clear();
    if (lv.strobe > 0.005) g.rect(0, 0, this.w, this.h).fill({ color: 0xffffff, alpha: lv.strobe * fade });
    else if (lv.wash > 0.005) g.rect(0, 0, this.w, this.h).fill({ color: hex(D.COLORS[lv.color]!), alpha: lv.wash * fade });
  }
}
