import { ensureCharacters } from '../assets/build';
import type { PlayableCharacterKey } from '../assets/manifest';
import { canSpend, spend, type CampaignState, type Effects } from '../campaign/state';
import { STORY } from '../config';
import type { Autopilot } from './autopilot';
import type { Actor, Behavior, Point, Who } from '../entities/actor';
import type { Dir8 } from '../iso/projection';
import { C } from '../ui/retro';
import type { MapKey } from './maps';
import type { Step, StepStatus } from './step';
import type { StageOptions, StoryScene } from './storyScene';
import { playDialogueGesture } from './dialogueGestures';
import { speakerOf } from './ui';

/**
 * Script vocabulary for the sub-levels. Every function returns a Step; scripts are plain
 * arrays of steps (see campaign/chapters).
 */

/** Waits for a tap or a continue key (Input.consumeContinue), after a short guard so a held key doesn't skip. */
function tapped(ctx: StoryScene, guard: number, t: number): boolean {
  const input = ctx.game.input;
  const taps = input.consumeTaps().length > 0;
  const key = input.consumeContinue();
  return t > guard && (taps || key);
}

class SayStep implements Step {
  private t = 0;
  constructor(
    private readonly speaker: string,
    private readonly text: string,
    private readonly opts: { remembered?: boolean; fx?: Effects } = {},
  ) {}
  start(ctx: StoryScene): void {
    this.t = 0;
    ctx.dialogue.show(this.speaker, this.text);
    playDialogueGesture(speakerOf(this.speaker).portrait, ctx.actors.values());
    if (this.opts.remembered) ctx.apply({ remembered: this.text });
    if (this.opts.fx) ctx.apply(this.opts.fx);
  }
  update(dt: number, ctx: StoryScene): StepStatus {
    this.t += dt;
    if (!tapped(ctx, 0.15, this.t)) return 'running';
    if (ctx.dialogue.typing) {
      ctx.dialogue.finish();
      return 'running';
    }
    return 'done';
  }
  stop(ctx: StoryScene): void {
    ctx.dialogue.hide();
  }
  pilot(_dt: number, ctx: StoryScene, p: Autopilot): void {
    p.every(ctx, 'say', STORY.PILOT.CONFIRM_EVERY, 'confirm');
  }
}

/** A dialogue line. `remembered`: the one line per scene that makes no sense (goes in the book). */
export function say(speaker: string, text: string, opts: { remembered?: boolean; fx?: Effects } = {}): Step {
  return new SayStep(speaker, text, opts);
}

/** The Professor, "a voice in the sky that comments in lecture asides". */
export function prof(text: string): Step {
  return new SayStep('professor', text);
}

export interface Option {
  label: string;
  /** Shown greyed with the reason; picking it only plays `reply` (if any). */
  locked?: string;
  effects?: Effects;
  /** Lines (and anything else) played after picking. */
  then?: Step[];
  /** 8.4: when picked, Zampanò says this other thing instead. */
  saysInstead?: string;
  /** Commozione this action spends. Without enough, the option is locked: an unmoved Zampanò cannot act. */
  cost?: number;
}

/** Label and lock state of an option given the current Commozione. */
export function optionView(o: Option, state: CampaignState): { label: string; locked?: string } {
  if (o.locked) return { label: o.label, locked: o.locked };
  if (!o.cost) return { label: o.label };
  return canSpend(state, 'commozione', o.cost)
    ? { label: `${o.label}  (-${o.cost} COMMOZIONE)` }
    : { label: o.label, locked: `TOO UNMOVED: NEEDS ${o.cost} COMMOZIONE` };
}

class AskStep implements Step {
  private phase: 'typing' | 'choosing' = 'typing';
  private t = 0;
  private views: Array<{ label: string; locked?: string }> = [];
  /** Autopilot's pick, applied on the next update. */
  private forced = -1;
  constructor(
    private readonly speaker: string,
    private readonly prompt: string,
    private readonly options: Option[],
  ) {}
  start(ctx: StoryScene): void {
    this.t = 0;
    this.phase = 'typing';
    ctx.dialogue.show(this.speaker, this.prompt);
    playDialogueGesture(speakerOf(this.speaker).portrait, ctx.actors.values());
  }
  resume(ctx: StoryScene): void {
    this.start(ctx);
  }
  update(dt: number, ctx: StoryScene): StepStatus {
    this.t += dt;
    if (this.phase === 'typing') {
      if (ctx.dialogue.typing && tapped(ctx, 0.15, this.t)) ctx.dialogue.finish();
      if (!ctx.dialogue.typing && this.t > 0.3) {
        this.phase = 'choosing';
        this.views = this.options.map((o) => optionView(o, ctx.state));
        // Never a dead end: if every option is out of reach, the costly ones open up.
        if (this.views.every((v) => v.locked)) this.views = this.options.map((o) => ({ label: o.label, locked: o.locked }));
        ctx.dialogue.setChoices(this.views);
      }
      return 'running';
    }
    let pick = ctx.dialogue.updateChoices(ctx.game.input);
    if (this.forced >= 0) {
      pick = this.forced;
      this.forced = -1;
    }
    if (pick < 0) return 'running';
    const o = this.options[pick]!;
    ctx.game.audio.play('click');
    const lock = this.views[pick]?.locked;
    if (lock) {
      ctx.notice(lock, C.red);
      return 'running';
    }
    if (o.cost && spend(ctx.state, 'commozione', o.cost)) ctx.notice(`-${o.cost} COMMOZIONE`, C.red);
    ctx.metrics.choices.push(o.label);
    if (o.effects) ctx.apply(o.effects);
    const follow: Step[] = [];
    follow.push(say('zampano', o.saysInstead ?? o.label));
    if (o.then) follow.push(...o.then);
    ctx.insert(follow);
    return 'done';
  }
  stop(ctx: StoryScene): void {
    ctx.dialogue.hide();
  }
  pilot(_dt: number, ctx: StoryScene, p: Autopilot): void {
    if (this.phase === 'typing') {
      p.every(ctx, 'say', STORY.PILOT.CONFIRM_EVERY, 'confirm');
      return;
    }
    if (this.forced >= 0 || !p.tick('ask', 0.4)) return;
    const open = this.views.map((v, k) => (v.locked ? -1 : k)).filter((k) => k >= 0);
    if (open.length) this.forced = open[p.pickFor(this.prompt, open.length)]!;
  }
}

/** A choice: the speaker's prompt, then the options (Zampanò says the picked one). */
export function ask(speaker: string, prompt: string, options: Option[]): Step {
  return new AskStep(speaker, prompt, options);
}

class CardStep implements Step {
  private t = 0;
  constructor(
    private readonly big: string,
    private readonly small: string,
    private readonly opts: CardOptions,
  ) {}
  start(ctx: StoryScene): void {
    this.t = 0;
    ctx.cards.show(this.big, this.small, this.opts.color ?? C.yellow, this.opts.dim ?? 0.55, this.opts.above);
    ctx.cards.showTap = this.opts.seconds === undefined;
    if (this.opts.flash) ctx.flash();
    if (this.opts.sound) ctx.game.audio.play(this.opts.sound as 'glitch');
  }
  update(dt: number, ctx: StoryScene): StepStatus {
    this.t += dt;
    if (this.opts.seconds !== undefined) return this.t >= this.opts.seconds || tapped(ctx, 0.4, this.t) ? 'done' : 'running';
    return tapped(ctx, 0.4, this.t) ? 'done' : 'running';
  }
  stop(ctx: StoryScene): void {
    ctx.cards.hide();
  }
  pilot(_dt: number, ctx: StoryScene, p: Autopilot): void {
    if (this.t > 0.45) p.every(ctx, 'card', STORY.PILOT.CONFIRM_EVERY, 'confirm');
  }
}

export interface CardOptions {
  color?: string;
  seconds?: number;
  dim?: number;
  sound?: string;
  flash?: boolean;
  /** Small line shown above the big text. */
  above?: string;
}

/** Big centered text. Without `seconds` it waits for a tap. */
export function card(big: string, small = '', opts: CardOptions = {}): Step {
  return new CardStep(big, small, opts);
}

/** Runs a function once and moves on. */
export function call(fn: (ctx: StoryScene) => void): Step {
  return {
    start(ctx) {
      fn(ctx);
    },
    update: () => 'done',
  };
}

/** Applies campaign effects (meters, book, flags, unlocks). */
export function fx(effects: Effects): Step {
  return call((ctx) => ctx.apply(effects));
}

export function wait(seconds: number): Step {
  let t = 0;
  return {
    start() {
      t = 0;
    },
    update(dt) {
      t += dt;
      return t >= seconds ? 'done' : 'running';
    },
  };
}

/** Builds the stage (map) and places actors. */
export function stage(
  map: MapKey,
  actors: Array<{ name: string; who: Who; at: string | Point; face?: Dir8; behavior?: Behavior }> = [],
  opts: StageOptions = {},
): Step {
  return call((ctx) => {
    ctx.setStage(map, opts);
    for (const a of actors) ctx.addActor(a.name, a.who, a.at, a.behavior, a.face);
  });
}

export function actor(name: string, who: Who, at: string | Point, behavior?: Behavior, face?: Dir8): Step {
  return call((ctx) => void ctx.addActor(name, who, at, behavior, face));
}

export function behave(name: string, behavior: Behavior): Step {
  return call((ctx) => ctx.actor(name).setBehavior(behavior));
}

export function remove(name: string): Step {
  return call((ctx) => ctx.removeActor(name));
}

/** Moves an actor (or Zampanò with name 'zampano') to a marker and waits until it arrives. */
export function move(name: string, to: string | Point, speed = 2.4, run = false): Step {
  let target: Point = { x: 0, y: 0 };
  let a: Actor | null = null;
  let t = 0;
  return {
    start(ctx) {
      t = 0;
      target = ctx.marker(to);
      if (name === 'zampano') return;
      a = ctx.actor(name);
      a.setBehavior({ kind: 'goto', to: target, speed, run });
    },
    update(dt, ctx) {
      t += dt;
      if (name === 'zampano') {
        const p = ctx.player;
        const dx = target.x - p.gx;
        const dy = target.y - p.gy;
        const d = Math.hypot(dx, dy);
        if (d < 0.2 || t > 8) {
          p.setIntent(0, 0);
          return 'done';
        }
        // Scripted walk: feed a screen-space intent toward the target.
        const sx = dx - dy;
        const sy = (dx + dy) / 2;
        const l = Math.hypot(sx, sy) || 1;
        p.setIntent((sx / l) * (run ? 1 : 0.7), (sy / l) * (run ? 1 : 0.7), run ? 'scripted' : false);
        return 'running';
      }
      return a!.arrived || t > 8 ? 'done' : 'running';
    },
  };
}

/** Moves without waiting (fire and forget). */
export function moveAsync(name: string, to: string | Point, speed = 2.4, run = false): Step {
  return call((ctx) => ctx.actor(name).setBehavior({ kind: 'goto', to: ctx.marker(to), speed, run }));
}

export function face(name: string, dir: Dir8): Step {
  return call((ctx) => {
    if (name === 'zampano') ctx.player.face(dir);
    else ctx.actor(name).face(dir);
  });
}

/** Changes the controller's dog skin. This does not author a new playable campaign section. */
export function skin(key: PlayableCharacterKey): Step {
  return call((ctx) => {
    const skin = ctx.costume(key);
    void ensureCharacters([skin]);
    ctx.player.setSkin(skin);
  });
}

/** Runs one of two step lists depending on the campaign state (decided when reached). */
export function branch(cond: (s: CampaignState) => boolean, yes: Step[], no: Step[] = []): Step {
  return call((ctx) => ctx.insert(cond(ctx.state) ? yes : no));
}

/** Objective text in the HUD. */
export function objective(text: string): Step {
  return call((ctx) => ctx.hud.setObjective(text));
}

export function sound(name: string): Step {
  return call((ctx) => ctx.game.audio.play(name as 'glitch'));
}

export function shake(amount = 4): Step {
  return call((ctx) => ctx.shake(amount));
}

export function flash(color = 0xffffff): Step {
  return call((ctx) => ctx.flash(color));
}

export function emote(name: string, anim: 'bark' | 'hurt' = 'bark'): Step {
  return call((ctx) => {
    if (name === 'zampano') ctx.player.startAction(anim === 'bark' ? 'bark' : 'hurt', 0.5);
    else ctx.actor(name).emote(anim);
  });
}
