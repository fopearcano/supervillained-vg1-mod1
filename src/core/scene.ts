import { Container } from 'pixi.js';

/** A screen of the game (title, briefing, gameplay, pause, ...). */
export interface Scene {
  readonly root: Container;
  /** When true, scenes below this one are not updated (but still rendered). */
  readonly pausesBelow: boolean;
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
  render?(alpha: number, frameDt: number): void;
  resize?(width: number, height: number): void;
  /**
   * The Android Back button while this scene is on top (Flow.back; MainActivity sends `svback`).
   * Usually what Escape does here. Scenes without it ignore Back.
   */
  back?(): void;
}

/** Stack of scenes: overlays (pause, level end) are pushed on top of the game. */
export class SceneManager {
  private readonly stack: Scene[] = [];
  /** Called after any change of the stack (used to clear queued input). */
  onChange: (() => void) | null = null;

  constructor(
    private readonly layer: Container,
    private size: { width: number; height: number },
  ) {}

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  get all(): readonly Scene[] {
    return this.stack;
  }

  push(scene: Scene): void {
    this.stack.push(scene);
    this.layer.addChild(scene.root);
    scene.resize?.(this.size.width, this.size.height);
    scene.enter?.();
    this.onChange?.();
  }

  pop(): Scene | undefined {
    const s = this.stack.pop();
    if (s) this.dispose(s);
    this.onChange?.();
    return s;
  }

  /** Removes every scene and starts fresh with `scene`. */
  replaceAll(scene: Scene): void {
    while (this.stack.length) this.dispose(this.stack.pop()!);
    this.push(scene);
  }

  remove(scene: Scene): void {
    const i = this.stack.indexOf(scene);
    if (i < 0) return;
    this.stack.splice(i, 1);
    this.dispose(scene);
    this.onChange?.();
  }

  update(dt: number): void {
    // Update from the top down to the first scene that pauses what's below it.
    const active: Scene[] = [];
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const s = this.stack[i]!;
      active.push(s);
      if (s.pausesBelow) break;
    }
    for (let i = active.length - 1; i >= 0; i--) {
      const s = active[i]!;
      if (this.stack.includes(s)) s.update(dt);
    }
  }

  render(alpha: number, frameDt: number): void {
    for (const s of [...this.stack]) s.render?.(alpha, frameDt);
  }

  resize(width: number, height: number): void {
    this.size = { width, height };
    for (const s of this.stack) s.resize?.(width, height);
  }

  private dispose(s: Scene): void {
    s.exit?.();
    this.layer.removeChild(s.root);
    s.root.destroy({ children: true });
  }
}
