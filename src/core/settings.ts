import { AUDIO, LIVES } from '../config';
import { clampLives } from '../systems/lives';
import { storage } from './storage';

/** Persistent player settings and records (localStorage, guarded). */

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export const TEXT_SPEEDS: readonly TextSpeed[] = ['slow', 'normal', 'fast', 'instant'];

/** The MUSIC and SOUNDS levels OPTIONS and the walk's pause menu step through (0 is OFF). */
export const LEVEL_STEPS: readonly number[] = [0, 0.25, 0.5, 0.7, 1];

/**
 * The next MUSIC / SOUNDS level: the next step up, and after the loudest, OFF. A level between
 * steps (hand-edited storage) goes to the step just above it. Pure (tested).
 */
export function nextLevel(level: number): number {
  const i = LEVEL_STEPS.findIndex((v) => v > level + 0.01);
  return LEVEL_STEPS[i < 0 ? 0 : i]!;
}

/** How a level reads in the menus: OFF, 25%, 50%, 70%, 100%. Pure (tested). */
export function levelLabel(level: number): string {
  return level < 0.005 ? 'OFF' : `${Math.round(level * 100)}%`;
}

/** A saved level, or `fallback` when it is missing or not a number; kept within 0..1. */
function validLevel(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
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
  /** SOUND: OFF silences everything; MUSIC and SOUNDS keep their levels for when it is back on. */
  muted: boolean;
  /** The music's level, 0 (OFF) to 1. */
  music: number;
  /** The sound effects' level, 0 (OFF) to 1. */
  sounds: number;
  /** Story dialogue typewriter speed. */
  textSpeed: TextSpeed;
  /** Lives for the Green Zone walk (the title's counter): more lives, less speed. */
  lives: number;
  /** Buttons and gestures (OPTIONS > CONTROLS). */
  controls: ControlSettings;
  /**
   * OPTIONS > ART, a temporary testing option: the new (vibrant v2) environment art instead of
   * the current Color Ink banks (assets/environment.ts). Off unless chosen. Read at boot; the
   * OPTIONS row (Flow.toggleArt) saves it and loads the other bank at once.
   */
  newArt: boolean;
}

export interface LevelRecord {
  score: number;
  stars: number;
  time: number;
}

export function loadSettings(): Settings {
  const raw = storage.get<unknown>('settings', {});
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings> & { volume?: unknown };
  // Older saves had one VOLUME for everything: both levels start from it, so the player hears
  // what he heard before (the next save drops `volume`).
  const before = validLevel(s.volume, AUDIO.DEFAULT_VOLUME);
  return {
    muted: typeof s.muted === 'boolean' ? s.muted : false,
    music: validLevel(s.music, before),
    sounds: validLevel(s.sounds, before),
    textSpeed: TEXT_SPEEDS.includes(s.textSpeed as TextSpeed) ? (s.textSpeed as TextSpeed) : 'normal',
    lives: clampLives(typeof s.lives === 'number' ? s.lives : LIVES.START),
    controls: validControls(s.controls),
    // Only `true` counts (an old save's `art: 'new'`, from the removed art versions, does not).
    newArt: s.newArt === true,
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
