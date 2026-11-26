import { describe, expect, it } from 'vitest';
import { AMBUSH } from '../src/config';
import { Rng } from '../src/core/rng';
import { LEVEL_1 } from '../src/levels/level1';
import { AmbushDirector, type AmbushSignal } from '../src/systems/ambushLogic';
import { clearRun, offscreenEntry, standsAt } from '../src/systems/ambushEntry';
import { gridVecToScreen } from '../src/iso/projection';
import { loadLevel } from '../src/world/level';
import { GameMap } from '../src/world/map';

const DT = 1 / 60;
const TIMING = { warnFrom: 0.25, at: 0.5, until: 0.62, lines: 2 };

/** Runs the director for `seconds` at a progress given by `p(t)`; returns every signal with its time. */
function run(d: AmbushDirector, seconds: number, p: (t: number) => number, arrived = () => false): Array<AmbushSignal & { t: number }> {
  const out: Array<AmbushSignal & { t: number }> = [];
  for (let t = 0; t < seconds; t += DT) for (const s of d.update(DT, p(t), arrived())) out.push({ ...s, t });
  return out;
}

describe("the band's ambush in the Green Zone (sequence)", () => {
  it('is silent until a quarter of the way, then the voices come more and more often', () => {
    const d = new AmbushDirector(TIMING, new Rng(7));
    // He walks from 0 to just short of the middle in 60 s.
    const signals = run(d, 60, (t) => (t / 60) * 0.499);
    const voices = signals.filter((s) => s.kind === 'voice');
    expect(voices[0]!.t).toBeGreaterThan(60 * (0.25 / 0.499) - 1);
    expect(voices.every((v) => v.kind === 'voice' && v.loud >= 0 && v.loud <= 1)).toBe(true);
    const gaps = voices.slice(1).map((v, k) => v.t - voices[k]!.t);
    const early = gaps.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const late = gaps.slice(-3).reduce((a, b) => a + b, 0) / 3;
    expect(late).toBeLessThan(early / 2);
    expect(late).toBeLessThan(AMBUSH.VOICE_EVERY[1] * (1 + AMBUSH.VOICE_JITTER) + 0.2);
    // The two lines take turns, louder and louder.
    expect(voices.map((v) => (v.kind === 'voice' ? v.line : -1)).slice(0, 4)).toEqual([0, 1, 0, 1]);
    const loud = voices.map((v) => (v.kind === 'voice' ? v.loud : 0));
    expect(loud[loud.length - 1]!).toBeGreaterThan(loud[0]! + 0.8);
    expect(d.phase).toBe('voices');
  });

  it('a step back does not quieten them: the closest he has been counts', () => {
    const d = new AmbushDirector(TIMING, new Rng(1));
    run(d, 1, () => 0.45);
    const before = d.closeness;
    run(d, 1, () => 0.3);
    expect(d.closeness).toBe(before);
    expect(before).toBeCloseTo(0.8, 5);
  });

  it('at the middle: NOW! and the rush in the same moment, then the fright, the run off', () => {
    const d = new AmbushDirector(TIMING, new Rng(3));
    run(d, 5, () => 0.4);
    const s = run(d, 10, () => 0.5);
    const kinds = s.filter((x) => x.kind !== 'voice').map((x) => x.kind);
    expect(kinds).toEqual(['now', 'jump', 'scare', 'leave', 'done']);
    const at = (k: string) => s.find((x) => x.kind === k)!.t;
    // Nothing between the shout and their running in.
    expect(at('jump')).toBe(at('now'));
    expect(at('scare') - at('jump')).toBeCloseTo(AMBUSH.JUMP_MAX, 1);
    expect(at('leave') - at('scare')).toBeCloseTo(AMBUSH.SCARE_TIME, 1);
    expect(at('done') - at('leave')).toBeCloseTo(AMBUSH.LEAVE_TIME, 1);
    // No voices once they have shouted.
    expect(s.filter((x) => x.kind === 'voice' && x.t > at('now'))).toEqual([]);
  });

  it('the fright starts as soon as they reach him, before the longest jump', () => {
    const d = new AmbushDirector(TIMING, new Rng(3));
    let jumpAt = -1;
    let scareAt = -1;
    for (let t = 0; t < 3 && scareAt < 0; t += DT) {
      // They reach him 0.3 s into the jump.
      const reached = d.phase === 'jump' && d.phaseTime > 0.3;
      for (const s of d.update(DT, 0.5, reached)) {
        if (s.kind === 'jump') jumpAt = t;
        if (s.kind === 'scare') scareAt = t;
      }
    }
    // At the middle at once: NOW! and the rush on the first step.
    expect(jumpAt).toBeGreaterThanOrEqual(0);
    expect(scareAt - jumpAt).toBeGreaterThan(0.29);
    expect(scareAt - jumpAt).toBeLessThan(0.4);
    expect(scareAt - jumpAt).toBeLessThan(AMBUSH.JUMP_MAX);
  });

  it("holds Bagnaskiz's usual attack while they wait, and for a grace period after they leave", () => {
    const d = new AmbushDirector(TIMING, new Rng(5));
    expect(d.holdsAttack).toBe(true);
    run(d, 10, () => 0.5);
    expect(d.phase).toBe('done');
    expect(d.holdsAttack).toBe(true);
    run(d, AMBUSH.ATTACK_GRACE + 0.1, () => 0.6);
    expect(d.holdsAttack).toBe(false);
  });

  it('is skipped (and holds nothing) when he gets past it without triggering it, e.g. a teleport', () => {
    const d = new AmbushDirector(TIMING, new Rng(5));
    const s = run(d, 1, () => 0.9);
    expect(s.map((x) => x.kind)).toEqual(['skipped']);
    expect(d.phase).toBe('done');
    expect(d.wasSkipped).toBe(true);
    expect(d.holdsAttack).toBe(false);
  });

  it('a jump straight into the window (no walk through the quarter) still springs it, without voices', () => {
    const d = new AmbushDirector(TIMING, new Rng(5));
    const s = run(d, 0.1, () => 0.55);
    expect(s.map((x) => x.kind)).toEqual(['now', 'jump']);
  });
});

describe("level 1: where the band comes in from, and its lines", () => {
  const map = new GameMap(loadLevel(LEVEL_1));
  const amb = LEVEL_1.events.ambush!;
  // Every spot where NOW! can fire: any lane, from the middle of the walk to a little past it.
  const triggers: Array<{ x: number; y: number }> = [];
  for (let j = 0; j < map.height; j++) {
    for (let i = 0; i < map.width; i++) {
      const p = map.progressAt(i + 0.5, j + 0.5);
      if (p >= amb.at && p <= amb.at + 0.08 && standsAt(map, i + 0.5, j + 0.5)) triggers.push({ x: i + 0.5, y: j + 0.5 });
    }
  }

  it.each([[216, 400], [240, 520]])('rushes in from outside a %i x %i view, from the sides, on a clear straight run', (w, h) => {
    expect(triggers.length).toBeGreaterThan(200);
    AMBUSH.ENTRY_DIRS.forEach(([sx], k) => {
      let outside = 0;
      for (const from of triggers) {
        const e = offscreenEntry(map, from, AMBUSH.ENTRY_DIRS[k]![0], AMBUSH.ENTRY_DIRS[k]![1], w / 2, h / 2);
        if (!e) continue;
        expect(standsAt(map, e.x, e.y)).toBe(true);
        expect(clearRun(map, e, from)).toBe(true);
        if (!e.offscreen) continue;
        const s = gridVecToScreen(e.x - from.x, e.y - from.y);
        // Outside the view, on its side of the screen (Bagnaskiz from the left, the others from the right).
        expect(Math.abs(s.x) > w / 2 || Math.abs(s.y) > h / 2).toBe(true);
        expect(Math.sign(s.x)).toBe(Math.sign(sx));
        outside++;
      }
      // Measured: 344 / 350 / 350 of 352 spots (a few hedge pockets fall back to the farthest clear
      // spot in view, or close by).
      expect(outside / triggers.length, `band member ${k}`).toBeGreaterThan(0.95);
    });
  });

  it('Bagnaskiz leads (he shouts), Jack and Watson say the lines', () => {
    expect(amb.band[0]).toBe('bagnaskiz');
    expect(amb.band).toEqual(expect.arrayContaining(['jack', 'watson']));
    for (const v of amb.voices) expect(amb.band).toContain(v.who);
    expect(amb.voices.map((v) => v.text)).toEqual(["HE'S COMING! HE'S COMING!", 'GET READY!']);
    expect(amb.now).toBe('NOW!');
    expect(amb.warnFrom).toBe(0.25);
    expect(amb.at).toBe(0.5);
  });
});
