import { AUDIO, LIVES } from '../config';
import { clampLives } from '../systems/lives';
import { storage } from './storage';

/** Persistent player settings and records (localStorage, guarded). */

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export const TEXT_SPEEDS: readonly TextSpeed[] = ['slow', 'normal', 'fast', 'instant'];

/** The volumes OPTIONS and the pause menu step through. */
export const VOLUME_STEPS: readonly number[] = [0.25, 0.5, 0.7, 1];

/** The next volume step (after the loudest, the quietest). Pure (tested). */
export function nextVolume(volume: number): number {
  const i = VOLUME_STEPS.findIndex((v) => v >= volume - 0.01);
  return VOLUME_STEPS[(i + 1) % VOLUME_STEPS.length]!;
}

/** The next story text speed (after INSTANT, SLOW). Pure (tested). */
export function nextTextSpeed(speed: TextSpeed): TextSpeed {
  return TEXT_SPEEDS[(TEXT_SPEEDS.indexOf(speed) + 1) % TEXT_SPEEDS.length]!;
}

/** What a gesture does (CONTROLS): the action button, BARK, the SWORD, the SHIELD, the mode switcher, RUN on/off. */
export type GestureBinding = 'off' | 'action' | 'bark' | 'sword' | 'shield' | 'switch' | 'run';
export const GESTURE_BINDINGS: readonly GestureBinding[] = ['off', 'action', 'bark', 'sword', 'shield', 'switch', 'run'];

/** The next gesture binding in the CONTROLS list. Pure (tested). */
export function nextBinding(b: GestureBinding): GestureBinding {
  return GESTURE_BINDINGS[(GESTURE_BINDINGS.indexOf(b) + 1) % GESTURE_BINDINGS.length]!;
}

export interface ControlSettings {
  /** Right-hand gestures over the buttons. */
  swipeUp: GestureBinding;
  swipeDown: GestureBinding;
  doubleTap: GestureBinding;
  /** RUN button: hold it to run, or tap it to switch running on and off. */
  run: 'hold' | 'toggle';
  /** The small switcher next to the action button (changes what the action button does). */
  switcher: boolean;
  /** Which hand the buttons are for: right (joystick on the left) or left (mirrored). */
  hand: 'right' | 'left';
}

export const DEFAULT_CONTROLS: ControlSettings = {
  swipeUp: 'sword',
  swipeDown: 'shield',
  doubleTap: 'bark',
  run: 'hold',
  switcher: true,
  hand: 'right',
};

/** Fills gaps and drops unknown values (old saves, hand-edited storage). Pure (tested). */
export function validControls(raw: unknown): ControlSettings {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof ControlSettings, unknown>>;
  const binding = (v: unknown, d: GestureBinding): GestureBinding => (GESTURE_BINDINGS.includes(v as GestureBinding) ? (v as GestureBinding) : d);
  return {
    swipeUp: binding(c.swipeUp, DEFAULT_CONTROLS.swipeUp),
    swipeDown: binding(c.swipeDown, DEFAULT_CONTROLS.swipeDown),
    doubleTap: binding(c.doubleTap, DEFAULT_CONTROLS.doubleTap),
    run: c.run === 'toggle' ? 'toggle' : 'hold',
    switcher: typeof c.switcher === 'boolean' ? c.switcher : DEFAULT_CONTROLS.switcher,
    hand: c.hand === 'left' ? 'left' : 'right',
  };
}

export interface Settings {
  muted: boolean;
  volume: number;
  /** Story dialogue typewriter speed. */
  textSpeed: TextSpeed;
  /** Lives for the Green Zone walk (the title's counter): more lives, less speed. */
  lives: number;
  /** Buttons and gestures (OPTIONS > CONTROLS). */
  controls: ControlSettings;
}

export interface LevelRecord {
  score: number;
  stars: number;
  time: number;
}

export function loadSettings(): Settings {
  const s = storage.get<Partial<Settings>>('settings', {});
  return {
    muted: typeof s.muted === 'boolean' ? s.muted : false,
    volume: typeof s.volume === 'number' ? Math.max(0, Math.min(1, s.volume)) : AUDIO.DEFAULT_VOLUME,
    textSpeed: TEXT_SPEEDS.includes(s.textSpeed as TextSpeed) ? (s.textSpeed as TextSpeed) : 'normal',
    lives: clampLives(typeof s.lives === 'number' ? s.lives : LIVES.START),
    controls: validControls(s.controls),
  };
}

export function saveSettings(s: Settings): void {
  storage.set('settings', s);
}

export function loadRecords(): Record<string, LevelRecord> {
  const r = storage.get<Record<string, LevelRecord>>('records', {});
  return r && typeof r === 'object' ? r : {};
}

export function bestFor(levelId: string): LevelRecord | null {
  return loadRecords()[levelId] ?? null;
}

/**
 * Saves a finished level. Keeps the best score, the best stars and the best time independently.
 * Returns true if the score is a new best.
 */
export function saveRecord(levelId: string, rec: LevelRecord): boolean {
  const all = loadRecords();
  const old = all[levelId];
  const newBest = !old || rec.score > old.score;
  all[levelId] = {
    score: Math.max(old?.score ?? 0, rec.score),
    stars: Math.max(old?.stars ?? 0, rec.stars),
    time: old ? Math.min(old.time, rec.time) : rec.time,
  };
  storage.set('records', all);
  return newBest;
}

/** Coins are saved for a future shop. */
export function loadCoins(): number {
  const c = storage.get<number>('coins', 0);
  return typeof c === 'number' && Number.isFinite(c) ? c : 0;
}

export function addCoins(n: number): number {
  const total = loadCoins() + Math.max(0, Math.floor(n));
  storage.set('coins', total);
  return total;
}
