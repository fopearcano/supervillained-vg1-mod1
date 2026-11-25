import { Container } from 'pixi.js';
import type { Effects } from '../../campaign/state';
import type { Autopilot } from '../autopilot';
import type { Step, StepStatus } from '../step';
import type { StoryScene } from '../storyScene';

export type MiniResult = 'running' | 'won' | 'lost';

/**
 * A self-contained skill game drawn in screen space over (or instead of) the stage:
 * rhythm, ladders, tug of war, boat, letter, rumour.
 */
export abstract class MiniGame {
  readonly root = new Container();
  protected w = 216;
  protected h = 400;
  time = 0;
  /** Optional HUD objective. */
  objective = '';
  /** Hide the iso stage behind the game. */
  hidesStage = false;

  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.onLayout();
  }

  protected onLayout(): void {}

  abstract start(ctx: StoryScene): void;
  abstract update(dt: number, ctx: StoryScene): MiniResult;
  /** Autopilot strategy: press the inputs a decent player would (see story/autopilot.ts). */
  pilot?(dt: number, ctx: StoryScene, p: Autopilot): void;

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

class MiniGameStep implements Step {
  private game: MiniGame | null = null;
  constructor(
    private readonly factory: () => MiniGame,
    private readonly opts: { won?: Effects; lost?: Effects; retryOnLoss?: boolean; onEnd?: (r: MiniResult, ctx: StoryScene) => Step[] | void },
  ) {}
  start(ctx: StoryScene): void {
    const g = this.factory();
    this.game = g;
    g.layout(ctx.w, ctx.h);
    ctx.gameLayer.addChild(g.root);
    ctx.stageLayer.visible = !g.hidesStage;
    if (g.objective) ctx.hud.setObjective(g.objective);
    g.start(ctx);
  }
  update(dt: number, ctx: StoryScene): StepStatus {
    const g = this.game!;
    g.time += dt;
    const r = g.update(dt, ctx);
    if (r === 'running') return 'running';
    ctx.metrics.minis.push(`${this.game!.constructor.name}:${r}`);
    if (r === 'lost' && this.opts.retryOnLoss) {
      ctx.metrics.miniRetries++;
      this.stop(ctx);
      this.start(ctx);
      return 'running';
    }
    const fx = r === 'won' ? this.opts.won : this.opts.lost;
    if (fx) ctx.apply(fx);
    const more = this.opts.onEnd?.(r, ctx);
    if (more) ctx.insert(more);
    return 'done';
  }
  pilot(dt: number, ctx: StoryScene, p: Autopilot): void {
    this.game?.pilot?.(dt, ctx, p);
  }
  stop(ctx: StoryScene): void {
    ctx.stageLayer.visible = true;
    this.game?.destroy();
    this.game = null;
  }
}

export function mini(
  factory: () => MiniGame,
  opts: { won?: Effects; lost?: Effects; retryOnLoss?: boolean; onEnd?: (r: MiniResult, ctx: StoryScene) => Step[] | void } = {},
): Step {
  return new MiniGameStep(factory, opts);
}
