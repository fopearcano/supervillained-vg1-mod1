import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input, type Action } from '../src/core/input';
import { Autopilot } from '../src/story/autopilot';
import { KeyCursor, LetterGame, RumourGame } from '../src/story/minigames/words';
import type { MiniGame, MiniResult } from '../src/story/minigames/miniGame';
import type { StoryScene } from '../src/story/storyScene';

// The word games draw with Pixi and bake their labels on a canvas; the rules need neither.
vi.mock('pixi.js', () => {
  class Graphics {
    clear(): this {
      return this;
    }
    rect(): this {
      return this;
    }
    fill(): this {
      return this;
    }
  }
  class Container {
    addChild(): void {}
    destroy(): void {}
  }
  return { Graphics, Container };
});
vi.mock('../src/ui/pixelText', () => ({
  PixelText: class {
    textHeight = 8;
    visible = true;
    readonly position = { set: () => {} };
    setOrigin(): this {
      return this;
    }
    setText(): this {
      return this;
    }
    setStyle(): this {
      return this;
    }
    destroy(): void {}
  },
}));

const DT = 1 / 60;

/** The little of a StoryScene the word games use: input, sounds, effects, notices. */
function scene() {
  const input = new Input();
  const flags: Record<string, unknown> = {};
  const notices: string[] = [];
  const ctx = {
    game: { input, audio: { play: () => {} } },
    setControls: () => {},
    apply: (fx: { flags?: Record<string, unknown> }) => Object.assign(flags, fx.flags),
    notice: (text: string) => notices.push(text),
  } as unknown as StoryScene;
  return { ctx, input, flags, notices };
}

function begin(game: MiniGame, ctx: StoryScene): MiniGame {
  game.layout(216, 400);
  game.start(ctx);
  return game;
}

/** One logic step, as MiniGameStep runs it. */
function step(game: MiniGame, ctx: StoryScene): MiniResult {
  game.time += DT;
  return game.update(DT, ctx);
}

/** A key press (its actions, as Input queues them), then one step. */
function press(game: MiniGame, ctx: StoryScene, input: Input, ...actions: Action[]): MiniResult {
  for (const a of actions) input.trigger(a);
  return step(game, ctx);
}

/** What the tests read inside a game (private fields, read the way the smoke test does). */
type Peek = { buttons: Array<{ id: string; x: number; y: number; w: number; h: number }>; picker: { cursor: KeyCursor } };
const peek = (game: MiniGame) => game as unknown as Peek;
const lit = (game: MiniGame): string | null => {
  const { buttons, picker } = peek(game);
  const k = picker.cursor.current(buttons.length);
  return k >= 0 ? buttons[k]!.id : null;
};

describe('the keyboard highlight of the word games', () => {
  it('stays hidden until a direction key is used, and the first key only shows it', () => {
    const c = new KeyCursor();
    expect(c.shown).toBe(false);
    expect(c.current(4)).toBe(-1);
    c.move(1, 4);
    expect(c.shown).toBe(true);
    expect(c.current(4)).toBe(0);
    c.move(1, 4);
    expect(c.current(4)).toBe(1);
  });

  it('wraps around both ways', () => {
    const c = new KeyCursor();
    c.move(-1, 3);
    expect(c.current(3)).toBe(0);
    c.move(-1, 3);
    expect(c.current(3)).toBe(2);
    c.move(1, 3);
    expect(c.current(3)).toBe(0);
  });

  it('stays on the last button when the list shrinks, and moves on from there', () => {
    const c = new KeyCursor();
    c.move(1, 4);
    c.move(-1, 4);
    expect(c.current(4)).toBe(3);
    expect(c.current(2)).toBe(1);
    c.move(-1, 2);
    expect(c.current(2)).toBe(0);
    expect(c.current(0)).toBe(-1);
    c.move(1, 0);
    expect(c.current(1)).toBe(0);
  });

  it('does not jump by itself when the list shrinks and then grows again (clamp)', () => {
    const c = new KeyCursor();
    c.move(1, 4);
    c.move(-1, 4);
    expect(c.current(4)).toBe(3);
    c.clamp(2); // the rumour placed two pieces: two buttons left
    expect(c.current(2)).toBe(1);
    expect(c.current(4)).toBe(1); // two new pieces arrive: still on the same button
  });

  it('can be shown where it is without moving (the first confirm press)', () => {
    const c = new KeyCursor();
    c.select(2);
    c.show(4);
    expect(c.current(4)).toBe(2);
    const empty = new KeyCursor();
    empty.show(0);
    expect(empty.shown).toBe(false);
  });

  it('follows a tap without showing itself', () => {
    const c = new KeyCursor();
    c.select(2);
    expect(c.current(4)).toBe(-1);
    c.move(1, 4);
    expect(c.current(4)).toBe(2);
  });
});

describe('5.4 the letter, from the keyboard', () => {
  it('reaches every button: change a word, send, write it again, and name the debt', () => {
    const { ctx, input, flags } = scene();
    const game = begin(new LetterGame(), ctx);
    expect(step(game, ctx)).toBe('running');
    expect(lit(game)).toBe(null);
    press(game, ctx, input, 'down');
    expect(lit(game)).toBe('slot0');
    press(game, ctx, input, 'up');
    expect(lit(game)).toBe('send');
    press(game, ctx, input, 'confirm');
    expect(peek(game).buttons.map((b) => b.id)).toEqual(['again', 'accept']);
    press(game, ctx, input, 'left');
    expect(lit(game)).toBe('again');
    press(game, ctx, input, 'action'); // J / X
    expect(peek(game).buttons.map((b) => b.id)).toEqual(['slot0', 'slot1', 'slot2', 'send']);
    press(game, ctx, input, 'right');
    expect(lit(game)).toBe('slot1');
    press(game, ctx, input, 'pee', 'confirm'); // Space
    press(game, ctx, input, 'down');
    press(game, ctx, input, 'down');
    expect(lit(game)).toBe('send');
    press(game, ctx, input, 'confirm');
    expect(lit(game)).toBe('accept');
    expect(press(game, ctx, input, 'confirm')).toBe('won');
    expect(flags.letter).toBe('named');
  });

  it('without the highlight, Enter still sends and accepts (the autopilot plays it that way)', () => {
    const { ctx, input, flags } = scene();
    const game = begin(new LetterGame(), ctx);
    step(game, ctx);
    expect(press(game, ctx, input, 'confirm')).toBe('running');
    expect(press(game, ctx, input, 'confirm')).toBe('won');
    expect(flags.letter).toBe('necessity');
  });

  it('taps work as before and leave the highlight hidden', () => {
    const { ctx, input, flags } = scene();
    const game = begin(new LetterGame(), ctx);
    step(game, ctx);
    const at = (id: string) => {
      const b = peek(game).buttons.find((q) => q.id === id)!;
      input.pushTap(b.x + b.w / 2, b.y + b.h / 2);
      return step(game, ctx);
    };
    at('slot1');
    at('send');
    at('again');
    at('send');
    expect(lit(game)).toBe(null);
    expect(at('accept')).toBe('won');
    expect(flags.letter).toBe('named');
  });

  it('the autopilot still wins it', () => {
    const { ctx } = scene();
    const game = begin(new LetterGame(), ctx);
    const p = new Autopilot();
    let r: MiniResult = 'running';
    for (let k = 0; k < 60 * 20 && r === 'running'; k++) {
      p.beginStep(DT, ctx);
      game.pilot?.(DT, ctx, p);
      r = step(game, ctx);
    }
    expect(r).toBe('won');
  });
});

/**
 * The rumour shuffles its pieces with Math.random: `order(...)` fixes the shuffle (one value per
 * swap, last index first) so a test sees the same order every run.
 */
function order(...values: number[]): void {
  let k = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => values[Math.min(k++, values.length - 1)]!);
}

describe('6.2 the rumour, from the keyboard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('can be finished with the arrows and the confirm keys only', () => {
    order(0); // pieces arrive 1, 2, 3, 4, 5, 0: the first to place comes last, so a wrong pick is tried
    const { ctx, input, notices } = scene();
    const game = begin(new RumourGame(), ctx);
    const placed = () => (game as unknown as { placed: number[] }).placed.length;
    expect(step(game, ctx)).toBe('running');
    expect(lit(game)).toBe(null);
    const keys = ['confirm', 'action', 'pee'] as const;
    let r: MiniResult = 'running';
    let wrong = false;
    for (let k = 0; k < 60 * 30 && r === 'running'; k++) {
      const ids = peek(game).buttons.map((b) => b.id);
      const target = ids.indexOf(String(placed()));
      const at = lit(game);
      // Once, pick a piece that came later: only a notice.
      if (!wrong && at !== null && at !== String(placed())) {
        wrong = true;
        const before = placed();
        r = press(game, ctx, input, 'confirm');
        expect(placed()).toBe(before);
        expect(notices).toContain('GARBLED: THAT CAME LATER');
      } else if (target < 0) r = step(game, ctx);
      else if (at === null) r = press(game, ctx, input, 'down');
      else if (ids.indexOf(at) !== target) r = press(game, ctx, input, ids.indexOf(at) < target ? 'down' : 'up');
      else r = press(game, ctx, input, keys[placed() % keys.length]!);
    }
    expect(r).toBe('won');
    expect(wrong).toBe(true);
  });

  it('the highlight stays put when a piece is placed from the end of the list and another arrives', () => {
    order(0.99, 0.99, 0.99, 0.99, 0); // pieces arrive 1, 0, 2, 3, 4, 5
    const { ctx, input } = scene();
    const game = begin(new RumourGame(), ctx);
    const ids = () => peek(game).buttons.map((b) => b.id);
    for (let k = 0; k < 60 * 5 && ids().length < 2; k++) step(game, ctx);
    expect(ids()).toEqual(['1', '0']);
    press(game, ctx, input, 'down'); // shows the highlight on '1'
    press(game, ctx, input, 'down'); // '0', the last of the list
    expect(lit(game)).toBe('0');
    // Place it on the step right before the next piece arrives (no key read in between).
    const timer = () => (game as unknown as { arriveT: number }).arriveT;
    for (let k = 0; k < 60 * 5 && timer() > 2 * DT; k++) step(game, ctx);
    expect(timer()).toBeGreaterThan(DT);
    press(game, ctx, input, 'confirm'); // placed: the list is just '1'
    expect(ids()).toEqual(['1']);
    step(game, ctx); // '2' arrives
    expect(ids()).toEqual(['1', '2']);
    expect(lit(game)).toBe('1'); // not '2', the piece that just arrived
  });

  it('a confirm press with no highlight shows it and picks nothing', () => {
    const { ctx, input } = scene();
    const game = begin(new RumourGame(), ctx);
    const placed = () => (game as unknown as { placed: number[] }).placed.length;
    for (let k = 0; k < 60 * 5 && peek(game).buttons.length === 0; k++) step(game, ctx);
    expect(peek(game).buttons.length).toBeGreaterThan(0);
    expect(lit(game)).toBe(null);
    press(game, ctx, input, 'action');
    expect(placed()).toBe(0);
    expect(lit(game)).not.toBe(null);
  });

  it('the autopilot still wins it', () => {
    const { ctx } = scene();
    const game = begin(new RumourGame(), ctx);
    const p = new Autopilot();
    let r: MiniResult = 'running';
    for (let k = 0; k < 60 * 60 && r === 'running'; k++) {
      p.beginStep(DT, ctx);
      game.pilot?.(DT, ctx, p);
      r = step(game, ctx);
    }
    expect(r).toBe('won');
  });
});
