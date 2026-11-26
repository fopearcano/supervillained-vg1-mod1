import { describe, expect, it, vi } from 'vitest';
import { Actor } from '../src/entities/actor';
import { Bagnaskiz } from '../src/entities/critters';
import { BAGNASKIZ } from '../src/config';
import type { Entity } from '../src/entities/entity';
import type { GameMap } from '../src/world/map';
import { animationDuration } from '../src/assets/animationTiming';
import { CHARACTERS } from '../src/assets/manifest';

vi.mock('pixi.js', () => {
  class Container {
    addChild(_child: unknown): void {}
    destroy(_options: unknown): void {}
  }
  class Sprite {
    roundPixels = false;
    constructor(public texture: unknown) {}
  }
  return { Container, Sprite };
});
vi.mock('../src/core/assets', () => ({ textures: { get: (name: string) => name } }));

const actionActors = [
  'sbrimbrulon', 'sbrimbrulonKnight', 'bagnaskiz', 'bagnaskizEmperor',
  // The Jack, Watson, Santina and Confusione animation deliveries.
  'jack', 'jackKnight', 'watson', 'watsonKnight', 'santina', 'santinaKnight', 'confusione', 'confusioneKnight',
] as const;

function context(key: (typeof actionActors)[number]) {
  const actor = new Actor('sbrim', key, 0, 0);
  const map = {
    moveCircle: vi.fn((x: number, y: number, dx: number, dy: number) => ({ x: x + dx, y: y + dy, blocked: false })),
  };
  const player = { gx: 10, gy: 10 } as Entity;
  const step = (dt: number) => actor.step(dt, map as unknown as GameMap, player);
  return { actor, map, step };
}

describe.each(actionActors)('%s actor action selection', (key) => {
  it("a sped-up action's playback rate ends with it (the band's squat, then the run)", () => {
    const { actor, step } = context(key);
    actor.setBehavior({ kind: 'goto', to: { x: 30, y: 0 }, speed: 6, run: true });
    actor.playAction('poop', 0.6);
    actor.animator!.speed = animationDuration(CHARACTERS[key].anims.poop!) / 0.6;
    step(0.3);
    expect(actor.animator!.anim).toBe('poop');
    expect(actor.animator!.speed).toBeGreaterThan(1);
    step(0.31);
    step(0.1);
    expect(actor.animator!.anim).toBe('run');
    expect(actor.animator!.speed).toBe(1);
  });

  it('walks, stands when stopping, sits after three seconds, and stands again on movement', () => {
    const { actor, step } = context(key);
    actor.setBehavior({ kind: 'goto', to: { x: 3, y: 0 }, speed: 1 });
    step(0.1);
    expect(actor.animator!.anim).toBe('walk');
    actor.setBehavior({ kind: 'idle' });
    step(1);
    expect(actor.animator!.anim).toBe('idle');
    step(1);
    expect(actor.animator!.anim).toBe('idle');
    step(1);
    expect(actor.animator!.anim).toBe('sit');
    actor.setBehavior({ kind: 'goto', to: { x: 3, y: 0 }, speed: 1 });
    step(0.1);
    expect(actor.animator!.anim).toBe('walk');
  });

  it.each(['pee', 'poop', 'bark', 'fetch', 'hurt'] as const)('plays all of %s in place before resuming movement', (action) => {
    const { actor, map, step } = context(key);
    actor.setBehavior({ kind: 'goto', to: { x: 3, y: 0 }, speed: 1 });
    actor.playAction(action);
    const duration = animationDuration(CHARACTERS[key].anims[action]!);
    step(duration * 0.5);
    expect(actor.animator!.anim).toBe(action);
    expect(actor.animator!.finished).toBe(false);
    step(duration * 0.5);
    expect(actor.animator!.anim).toBe(action);
    expect(actor.animator!.finished).toBe(!(key === 'bagnaskiz' && action === 'hurt'));
    expect(map.moveCircle).not.toHaveBeenCalled();
    expect([actor.gx, actor.gy]).toEqual([0, 0]);
    step(0.01);
    expect(actor.animator!.anim).toBe('walk');
    expect(map.moveCircle).toHaveBeenCalledOnce();
    expect(actor.gx).toBeGreaterThan(0);
  });

  it('plays the tired clip and returns to standing instead of a stale seated animation', () => {
    const { actor, step } = context(key);
    step(3);
    expect(actor.animator!.anim).toBe('sit');
    actor.playAction('tired', 0.5);
    step(0.1);
    expect(actor.animator!.anim).toBe('tired');
    const first = actor.animator!.sprite.texture;
    step(0.25);
    expect(actor.animator!.sprite.texture).not.toBe(first);
    step(0.2);
    step(0.01);
    expect(actor.animator!.anim).toBe('idle');
  });
});

it('keeps the Green Zone pug flinching throughout the stun and then resumes roaming', () => {
  const pug = new Bagnaskiz(0, 0);
  const map = {
    moveCircle: (x: number, y: number, dx: number, dy: number) => ({ x: x + dx, y: y + dy, blocked: false }),
    stampDirt: vi.fn(),
  } as unknown as GameMap;
  pug.hit(-1, 0);
  pug.step(0.15, map, -10, 0, () => ({ x: 10, y: 0 }));
  const first = pug.animator.sprite.texture;
  pug.step(0.1, map, -10, 0, () => ({ x: 10, y: 0 }));
  expect(pug.state).toBe('stunned');
  expect(pug.animator.anim).toBe('hurt');
  expect(pug.animator.sprite.texture).not.toBe(first);
  expect(pug.animator.finished).toBe(false);
  pug.step(BAGNASKIZ.STUN_TIME, map, -10, 0, () => ({ x: 10, y: 0 }));
  pug.step(0.01, map, -10, 0, () => ({ x: 10, y: 0 }));
  expect(pug.state).toBe('roam');
  expect(pug.animator.anim).toBe('walk');
});
