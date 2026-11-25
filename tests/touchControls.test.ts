import { describe, expect, it, vi } from 'vitest';
import { Input } from '../src/core/input';
import { TouchControls } from '../src/ui/touchControls';

// Drawing needs WebGL and a canvas; which streak is shown does not.
vi.mock('pixi.js', () => {
  class Container {
    visible = true;
    alpha = 1;
    y = 0;
    readonly position = {
      x: 0,
      y: 0,
      set(x: number, y: number): void {
        this.x = x;
        this.y = y;
      },
    };
    addChild(..._children: unknown[]): void {}
    addChildAt(_child: unknown, _index: number): void {}
  }
  class Graphics extends Container {
    clear(): this {
      return this;
    }
    circle(): this {
      return this;
    }
    rect(): this {
      return this;
    }
    arc(): this {
      return this;
    }
    poly(): this {
      return this;
    }
    moveTo(): this {
      return this;
    }
    lineTo(): this {
      return this;
    }
    fill(): this {
      return this;
    }
    stroke(): this {
      return this;
    }
  }
  class Sprite extends Container {
    constructor(public texture: unknown) {
      super();
    }
  }
  return { Container, Graphics, Sprite };
});
vi.mock('../src/ui/pixelText', () => ({
  PixelText: class {
    visible = true;
    alpha = 1;
    y = 0;
    text = '';
    readonly position = { set(): void {} };
    constructor(text: string) {
      this.text = text;
    }
    setOrigin(): this {
      return this;
    }
    setText(text: string): this {
      this.text = text;
      return this;
    }
    setStyle(): this {
      return this;
    }
  },
}));
vi.mock('../src/core/assets', () => ({ textures: { get: (name: string) => name } }));
vi.mock('../src/assets/build', () => ({ runIconTexture: () => null }));

/** A gesture made on the touch screen, through Input's own path (bound action + streak). */
function swipeUp(input: Input, x = 180, y = 300): void {
  (input as unknown as { fireGesture(kind: string, x: number, y: number): void }).fireGesture('swipeUp', x, y);
}

/** Whether the controls show a gesture's streak and its word now. */
function streakShown(controls: TouchControls): boolean {
  return (controls as unknown as { streakText: { visible: boolean } }).streakText.visible;
}

describe('the streak of a gesture', () => {
  it('is drawn where a gesture is made', () => {
    const input = new Input();
    const controls = new TouchControls(input);
    controls.update();
    expect(streakShown(controls)).toBe(false);
    swipeUp(input);
    controls.update();
    expect(streakShown(controls)).toBe(true);
  });

  it("is not drawn again by the next scene's controls", () => {
    const input = new Input();
    const before = new TouchControls(input);
    swipeUp(input);
    before.update();
    expect(streakShown(before)).toBe(true);
    // The scene changes: its controls are made anew over the same Input.
    const after = new TouchControls(input);
    after.update();
    expect(streakShown(after)).toBe(false);
    // A gesture made in the new scene still shows.
    swipeUp(input, 170, 320);
    after.update();
    expect(streakShown(after)).toBe(true);
  });
});
