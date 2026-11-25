import { afterEach, describe, expect, it, vi } from 'vitest';
import { INPUT } from '../src/config';
import { Input } from '../src/core/input';
import { Menu } from '../src/ui/menu';

// The menu draws with Pixi; what it does with a key press does not need WebGL.
vi.mock('pixi.js', () => {
  class Container {
    visible = true;
    addChild(..._children: unknown[]): void {}
  }
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
  return { Container, Graphics };
});
vi.mock('../src/ui/pixelText', () => ({
  PixelText: class {
    readonly position = { set: () => {} };
    setOrigin(): this {
      return this;
    }
    setText(): this {
      return this;
    }
  },
}));

/** An Input attached to stand-ins for the page, and a way to press a key on it. */
function keyboard(): { input: Input; press: (code: string) => void } {
  const on = new Map<string, (e: unknown) => void>();
  const target = { addEventListener: (type: string, fn: (e: unknown) => void) => on.set(type, fn) };
  vi.stubGlobal('window', target);
  vi.stubGlobal('document', { addEventListener: () => {} });
  const input = new Input();
  input.attach({ addEventListener: () => {} } as unknown as HTMLElement, (x, y) => ({ x, y }));
  const press = (code: string) => {
    const e = { code, repeat: false, preventDefault: () => {} };
    on.get('keydown')!(e);
    on.get('keyup')!(e);
  };
  return { input, press };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('continue / confirm / pick (Input.consumeContinue)', () => {
  it('Space, Enter, J and X all continue, once per press', () => {
    for (const code of ['Space', 'Enter', 'NumpadEnter', 'KeyJ', 'KeyX']) {
      const { input, press } = keyboard();
      press(code);
      expect(input.consumeContinue(), code).toBe(true);
      expect(input.consumeContinue(), `${code} again`).toBe(false);
    }
  });

  it('one Space counts once (it queues both PEE and confirm)', () => {
    const { input, press } = keyboard();
    press('Space');
    expect(input.consumeContinue()).toBe(true);
    expect(input.consume('pee')).toBe(false);
    expect(input.consume('confirm')).toBe(false);
  });

  it('the PEE and the action buttons continue too', () => {
    const { input } = keyboard();
    input.trigger('pee');
    expect(input.consumeContinue()).toBe(true);
    input.trigger('action');
    expect(input.consumeContinue()).toBe(true);
  });

  it('other keys do not continue, and Escape keeps its back for the screen', () => {
    const { input, press } = keyboard();
    for (const code of ['Escape', 'KeyP', 'KeyB', 'KeyU', 'KeyI', 'KeyQ', 'Tab', 'ArrowDown', 'KeyW']) press(code);
    expect(input.consumeContinue()).toBe(false);
    expect(input.consume('back')).toBe(true);
  });

  it('a press too old is forgotten', () => {
    const { input, press } = keyboard();
    press('KeyJ');
    input.update(INPUT.ACTION_TTL + 0.05);
    expect(input.consumeContinue()).toBe(false);
  });
});

describe('menus take the continue keys', () => {
  it('J picks the selected item, as Enter does', () => {
    for (const code of ['KeyJ', 'KeyX', 'Enter']) {
      const { input, press } = keyboard();
      const picked: string[] = [];
      const menu = new Menu([
        { label: 'RESUME', action: () => picked.push('resume') },
        { label: 'QUIT', action: () => picked.push('quit') },
      ]);
      menu.layout(100, 100);
      press('ArrowDown');
      press(code);
      menu.update(1 / 60, input);
      expect(picked, code).toEqual(['quit']);
    }
  });
});

describe('which hints a player gets (Input.usingTouch)', () => {
  /** An Input on stand-ins, and a pointer press of the given kind on its canvas. */
  function pointer(): { input: Input; down: (pointerType: string) => void } {
    const el = new Map<string, (e: unknown) => void>();
    vi.stubGlobal('window', { addEventListener: () => {} });
    vi.stubGlobal('document', { addEventListener: () => {} });
    const input = new Input();
    input.attach({ addEventListener: (type: string, fn: (e: unknown) => void) => el.set(type, fn) } as unknown as HTMLElement, (x, y) => ({ x, y }));
    let id = 0;
    const down = (pointerType: string) => {
      const e = { pointerType, pointerId: ++id, clientX: 100, clientY: 100, timeStamp: id * 1000, preventDefault: () => {}, target: { setPointerCapture: () => {} } };
      el.get('pointerdown')!(e);
      el.get('pointerup')!(e);
    };
    return { input, down };
  }

  it('a finger or a stylus means touch hints; a mouse does not', () => {
    for (const [kind, touch] of [
      ['touch', true],
      ['pen', true],
      ['mouse', false],
    ] as const) {
      const { input, down } = pointer();
      expect(input.usingTouch).toBe(false);
      down(kind);
      expect(input.usingTouch, kind).toBe(touch);
    }
  });
});
