import { Container, type Application } from 'pixi.js';
import { ScreenTransition } from '../fx/transition';
import { AudioEngine } from './audio';
import { computeViewport, safeAreaInsets, type Viewport } from './display';
import { Input } from './input';
import { GameLoop } from './loop';
import { SceneManager, type Scene } from './scene';
import { loadSettings, saveSettings, type Settings } from './settings';

/**
 * Shared services for all scenes: renderer, logical size, input, scene stack, loop.
 */
export class Game {
  readonly input = new Input();
  readonly sceneLayer = new Container();
  /** Above every scene (transitions, debug). */
  readonly overlayLayer = new Container();
  readonly scenes: SceneManager;
  readonly loop: GameLoop;
  readonly transition: ScreenTransition;
  readonly settings: Settings = loadSettings();
  /** Listeners notified when settings change (e.g. audio mute). */
  readonly settingsListeners: Array<(s: Settings) => void> = [];
  readonly audio: AudioEngine;
  view: Viewport;
  time = 0;

  constructor(
    readonly app: Application,
    readonly canvas: HTMLCanvasElement,
  ) {
    this.view = computeViewport(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    app.stage.addChild(this.sceneLayer, this.overlayLayer);
    this.transition = new ScreenTransition(app.stage);
    this.audio = new AudioEngine(this.settings);
    this.settingsListeners.push((st) => this.audio.applySettings(st));
    this.settingsListeners.push((st) => this.input.applyControls(st.controls));
    this.input.applyControls(this.settings.controls);
    this.scenes = new SceneManager(this.sceneLayer, this.view);
    this.scenes.onChange = () => this.input.clearPending();
    this.input.attach(canvas, (cx, cy) => this.toLogical(cx, cy));
    this.loop = new GameLoop(
      (dt) => this.step(dt),
      (alpha, frameDt) => this.frame(alpha, frameDt),
    );
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.resize();
  }

  get width(): number {
    return this.view.width;
  }

  get height(): number {
    return this.view.height;
  }

  /**
   * The one way to change a setting: applies `change` to the settings, saves them and tells the
   * listeners (audio volume, input controls) at once.
   */
  updateSettings(change: (s: Settings) => void): void {
    change(this.settings);
    saveSettings(this.settings);
    for (const fn of this.settingsListeners) fn(this.settings);
  }

  start(scene: Scene): void {
    this.scenes.replaceAll(scene);
    this.loop.start();
  }

  private step(dt: number): void {
    this.time += dt;
    this.input.update(dt);
    // While a transition is about to change the scene, presses and taps are dropped: they were
    // meant for the scene that is leaving, and a second Enter or tap (or Escape's paired `back`)
    // would run its action again (double QUIT, double CONTINUE, double coins).
    if (this.transition.swapping) this.input.clearPending();
    this.scenes.update(dt);
    this.transition.update(dt);
  }

  private frame(alpha: number, frameDt: number): void {
    this.scenes.render(alpha, frameDt);
    this.app.renderer.render(this.app.stage);
  }

  resize(): void {
    const w = window.visualViewport?.width ?? window.innerWidth;
    const h = window.visualViewport?.height ?? window.innerHeight;
    // Inside the safe area (notch, rounded corners, home indicator).
    const ins = safeAreaInsets();
    const v = computeViewport(Math.max(1, w - ins.left - ins.right), Math.max(1, h - ins.top - ins.bottom), window.devicePixelRatio || 1);
    v.cssLeft += ins.left;
    v.cssTop += ins.top;
    this.view = v;
    this.app.renderer.resize(v.width, v.height);
    const s = this.canvas.style;
    s.width = `${v.cssWidth}px`;
    s.height = `${v.cssHeight}px`;
    s.left = `${v.cssLeft}px`;
    s.top = `${v.cssTop}px`;
    this.scenes.resize(v.width, v.height);
    this.transition.resize(v.width, v.height);
  }

  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) * this.view.width) / r.width,
      y: ((clientY - r.top) * this.view.height) / r.height,
    };
  }
}
