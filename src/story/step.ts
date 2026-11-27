import type { Autopilot } from './autopilot';
import type { StoryScene } from './storyScene';

export type StepStatus = 'running' | 'done';

/**
 * One beat of a sub-level script: a dialogue line, a choice, a card, a walk objective, a
 * mini-game... Steps run one after another inside a StoryScene.
 */
export interface Step {
  start(ctx: StoryScene): void;
  update(dt: number, ctx: StoryScene): StepStatus;
  /** Called when the step ends (or the scene is torn down while it runs). */
  stop?(ctx: StoryScene): void;
  /** Called when the step resumes after an interruption (see StoryScene.interrupt). */
  resume?(ctx: StoryScene): void;
  /** Automated playtests: play this step through the inputs (see story/autopilot.ts). */
  pilot?(dt: number, ctx: StoryScene, p: Autopilot): void;
}

/**
 * Wraps a suspended step so it continues after the interrupting steps. A step interrupted again
 * while it resumes is wrapped once, not twice: a wrapper around a wrapper would not pass `resume`
 * on, and the walk's controls (joystick, buttons) would stay off after the second card or line of
 * the same walk (2.3: the second pickup).
 */
export class ResumeStep implements Step {
  /** The suspended step itself (never another ResumeStep). */
  readonly inner: Step;
  constructor(inner: Step) {
    this.inner = inner instanceof ResumeStep ? inner.inner : inner;
  }
  start(ctx: StoryScene): void {
    this.inner.resume?.(ctx);
  }
  resume(ctx: StoryScene): void {
    this.inner.resume?.(ctx);
  }
  update(dt: number, ctx: StoryScene): StepStatus {
    return this.inner.update(dt, ctx);
  }
  stop(ctx: StoryScene): void {
    this.inner.stop?.(ctx);
  }
  pilot(dt: number, ctx: StoryScene, p: Autopilot): void {
    this.inner.pilot?.(dt, ctx, p);
  }
}
