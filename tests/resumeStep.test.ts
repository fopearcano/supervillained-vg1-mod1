import { describe, expect, it } from 'vitest';
import { ResumeStep, type Step } from '../src/story/step';
import type { StoryScene } from '../src/story/storyScene';

/** A step that counts how often it was resumed. */
function counting(): Step & { resumed: number } {
  return {
    resumed: 0,
    start() {},
    update: () => 'running',
    resume() {
      this.resumed++;
    },
  };
}

const ctx = {} as StoryScene;

describe('ResumeStep', () => {
  it('resumes the suspended step when it starts', () => {
    const walk = counting();
    new ResumeStep(walk).start(ctx);
    expect(walk.resumed).toBe(1);
  });

  it('a step interrupted twice (two cards in one walk) still resumes: the controls come back', () => {
    const walk = counting();
    const once = new ResumeStep(walk);
    once.start(ctx);
    // The second card interrupts while the walk runs inside its ResumeStep.
    const twice = new ResumeStep(once);
    expect(twice.inner).toBe(walk);
    twice.start(ctx);
    const thrice = new ResumeStep(twice);
    thrice.start(ctx);
    expect(walk.resumed).toBe(3);
  });

  it('passes resume on, should a wrapper ever be resumed itself', () => {
    const walk = counting();
    new ResumeStep(walk).resume(ctx);
    expect(walk.resumed).toBe(1);
  });
});
