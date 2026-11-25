import { BlurFilter } from 'pixi.js';
import type { Game } from '../core/game';
import type { Scene } from '../core/scene';
import { nextTextSpeed, nextVolume, saveRecord } from '../core/settings';
import { LEVELS, levelByNumber } from '../levels';
import { finalHealth, starBonus, starsFromHealth, timeBonus } from '../systems/scoring';
import type { LevelDef } from '../world/level';
import { bindGameAudio } from '../fx/gameAudio';
import { GameScene } from './gameScene';
import { SupervillainedScene } from './supervillainedScene';
import {
  BriefingScene,
  ConfirmScene,
  GameOverScene,
  GoodbyeScene,
  LevelEndScene,
  OptionsScene,
  ControlsScene,
  PauseScene,
  TitleScene,
  type LevelResult,
} from './overlays';
import { StoryFlow } from '../story/storyFlow';
import { BookScene } from '../story/screens';
import { AUDIO, TITLE } from '../config';
import { TitleGlitchFilter } from '../fx/titleGlitchFilter';
import { openUrl, quitApp } from '../core/native';
import { GlossaryScene } from './glossaryScene';
import { CouchScene } from './couchScene';

/**
 * One game. Title (NEW GAME / CONTINUE / OPTIONS / QUIT) → the story, whose first scene (1.0) is
 * the Green Zone walk: Briefing → Game ⇄ Pause → Level End (CONTINUE into 1.1) / Game Over.
 * The walk's game scene stays at the bottom of the stack; the others are overlays on top of it.
 */
export class Flow {
  private gameScene: GameScene | null = null;
  private level: LevelDef = LEVELS[0]!;
  private readonly blur = new BlurFilter({ strength: 3, quality: 2, resolution: 1 });
  readonly story: StoryFlow;
  /** While the walk is played as the story's 1.0: called when he reaches the exit. */
  private storyDone: (() => void) | null = null;

  constructor(private readonly game: Game) {
    this.story = new StoryFlow(
      game,
      () => this.glitch(() => this.toTitle()),
      (level, done) => this.playGreenZone(level, done),
    );
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.autoPause();
    });
    window.addEventListener('blur', () => this.autoPause());
  }

  get current(): GameScene | null {
    return this.gameScene;
  }

  /** Title card over the (blurred, frozen) Green Zone. */
  toTitle(): void {
    this.storyDone = null;
    this.level = LEVELS[0]!;
    const scene = this.newGameScene();
    scene.active = false;
    const glitch = new TitleGlitchFilter();
    scene.worldRoot.filters = [this.blur, glitch];
    scene.hud.root.visible = false;
    this.game.scenes.replaceAll(scene);
    scene.setControlsEnabled(false);
    scene.controls.root.visible = false;
    // Intro music on the title screen (in a browser it starts with the first tap: autoplay rules).
    this.game.audio.setTrack('intro');
    this.game.audio.setDuck(1);
    this.game.audio.startMusic();
    this.game.scenes.push(
      new TitleScene(this.game, {
        newGame: () => this.newGame(),
        // No saved story yet: CONTINUE starts it from the beginning.
        cont: () => this.glitch(() => (this.story.hasProgress() ? this.story.continueGame() : this.story.newGame())),
        options: () => this.openOptions(),
        couch: () => {
          this.game.audio.play('click');
          this.game.scenes.push(new CouchScene(this.game, () => this.game.scenes.pop()));
        },
        glossary: () => {
          this.game.audio.play('click');
          this.game.scenes.push(new GlossaryScene(this.game, () => this.game.scenes.pop()));
        },
        quit: () => this.quit(),
        publisher: () => {
          this.game.audio.play('click');
          openUrl(TITLE.PUBLISHER_URL);
        },
        continueLabel: this.story.hasProgress() ? (this.story.nextLabel() ?? 'THE STORY IS FINISHED: REPLAY ANY LEVEL') : null,
        glitch,
      }),
    );
    this.glitch(null, 0.7, 1);
  }

  /** Opens a menu over the title, hiding the title's own buttons underneath. */
  private overTitle(scene: Scene): void {
    const title = this.game.scenes.top;
    if (title instanceof TitleScene) title.root.visible = false;
    this.game.scenes.push(scene);
  }

  /** Closes the menu opened over the title. */
  private closeOverTitle(): void {
    this.game.scenes.pop();
    const top = this.game.scenes.top;
    if (top instanceof TitleScene) top.root.visible = true;
  }

  /** NEW GAME: over a saved story, ask first. */
  private newGame(): void {
    const start = () => this.glitch(() => this.story.newGame());
    if (!this.story.hasProgress()) return start();
    this.overTitle(
      new ConfirmScene(this.game, 'NEW GAME?', 'THE SAVED STORY WILL BE LOST.', {
        yes: start,
        no: () => this.closeOverTitle(),
      }),
    );
  }

  private openOptions(): void {
    const s = this.game.settings;
    this.overTitle(
      new OptionsScene(this.game, {
        toggleSound: () => this.toggleSound(),
        muted: () => s.muted,
        cycleVolume: () => this.cycleVolume(),
        volume: () => s.volume,
        cycleTextSpeed: () => this.game.updateSettings((st) => (st.textSpeed = nextTextSpeed(st.textSpeed))),
        textSpeed: () => s.textSpeed.toUpperCase(),
        controls: () => this.game.scenes.push(new ControlsScene(this.game, () => this.game.scenes.pop())),
        // The character art: the new sheets, or the old version they replaced.
        levels: () => this.glitch(() => this.story.openMenu()),
        book: () => this.game.scenes.push(new BookScene(this.game, this.story.state, () => this.game.scenes.pop())),
        back: () => this.closeOverTitle(),
      }),
    );
  }

  /** QUIT: closes the app on Android; a browser tab or an iOS app cannot close itself, so it says goodbye. */
  private quit(): void {
    this.game.audio.play('click');
    if (quitApp()) return;
    this.overTitle(new GoodbyeScene(this.game, () => this.closeOverTitle()));
  }

  /** The story's 1.0: the Green Zone walk, then `done` (into 1.1). */
  playGreenZone(levelNumber: number, done: () => void): void {
    this.level = levelByNumber(levelNumber) ?? LEVELS[0]!;
    const scene = this.newGameScene();
    this.storyDone = done;
    scene.active = false;
    this.game.scenes.replaceAll(scene);
    scene.setControlsEnabled(false);
    // Reading the rules: intro music. The Green Zone music starts with the walk (startPlaying).
    this.reading();
    this.game.scenes.push(new BriefingScene(this.game, () => this.startPlaying()));
  }

  startPlaying(): void {
    const scene = this.gameScene;
    if (!scene) return;
    this.popOverlays();
    scene.worldRoot.filters = [];
    scene.hud.root.visible = true;
    scene.active = true;
    scene.controls.root.visible = true;
    scene.setControlsEnabled(true);
    this.game.audio.setTrack('greenzone');
    this.game.audio.setDuck(1);
    this.game.audio.startMusic();
  }

  /** Intro music while the player reads (title, briefing, score). */
  private reading(): void {
    this.game.audio.setTrack('intro');
    this.game.audio.setDuck(1);
    this.game.audio.startMusic();
  }

  /** Glitch transition with its sound. */
  glitch(mid: (() => void) | null, duration?: number, flash?: number): void {
    this.game.audio.play('glitch');
    this.game.transition.play(mid, duration, flash);
  }

  /** Straight into the walk (Retry / Restart; `?skip=game` for tests, outside the story). */
  play(levelNumber = this.level.number): void {
    this.level = levelByNumber(levelNumber) ?? LEVELS[0]!;
    const done = this.storyDone;
    const scene = this.newGameScene();
    this.storyDone = done;
    this.game.scenes.replaceAll(scene);
    this.startPlaying();
  }

  restart(): void {
    this.game.audio.play('click');
    this.glitch(() => this.play(this.level.number));
  }

  quitToTitle(): void {
    this.game.audio.play('click');
    this.glitch(() => this.toTitle());
  }

  pause(): void {
    const scene = this.gameScene;
    if (!scene || this.game.scenes.top !== scene || !scene.active || scene.rules.state !== 'playing') return;
    scene.setControlsEnabled(false);
    this.game.input.joystick.active = false;
    this.game.audio.play('click');
    this.game.audio.setDuck(0.4);
    this.game.audio.stopLoop('siren');
    this.game.scenes.push(
      new PauseScene(this.game, {
        resume: () => this.resume(),
        restart: () => this.restart(),
        quit: () => this.quitToTitle(),
        toggleSound: () => this.toggleSound(),
        muted: () => this.game.settings.muted,
        volume: () => this.game.settings.volume,
        cycleVolume: () => this.cycleVolume(),
      }),
    );
  }

  /** SOUND: ON / OFF (OPTIONS and the walk's pause menu). */
  private toggleSound(): void {
    this.game.updateSettings((s) => (s.muted = !s.muted));
  }

  /** VOLUME: the next step, with a click to hear it. */
  private cycleVolume(): void {
    this.game.updateSettings((s) => (s.volume = nextVolume(s.volume)));
    this.game.audio.play('click');
  }

  resume(): void {
    const scene = this.gameScene;
    if (!scene) return;
    this.popOverlays();
    scene.setControlsEnabled(true);
    this.game.audio.play('click');
    const attack = scene.threats.director.state === 'attack';
    this.game.audio.setDuck(attack ? 0.45 : 1);
    if (attack) this.game.audio.loop('siren', { volume: AUDIO.SIREN_VOLUME });
  }

  /**
   * Android Back button: the scene on top decides (`Scene.back`: pause or resume the walk and the
   * story, close menus and cards, QUIT on the title); scenes without it ignore Back. Ignored
   * while a transition is changing the scene.
   */
  back(): void {
    if (this.game.transition.swapping) return;
    this.game.scenes.top?.back?.();
  }

  /** Called when the app goes to the background. */
  autoPause(): void {
    const s = this.story.active;
    if (s) {
      s.requestMenu();
      return;
    }
    this.pause();
  }

  private levelComplete(scene: GameScene): void {
    const st = scene.rules.stats;
    const health = finalHealth(scene.map.health(), st.pees, st.poops);
    const stars = starsFromHealth(health);
    const tb = timeBonus(st.time, this.level.parTime);
    const sb = starBonus(stars);
    const total = st.score + tb + sb;
    const newBest = saveRecord(this.level.id, { score: total, stars, time: st.time });
    const done = this.storyDone;
    const result: LevelResult = {
      stats: st,
      health,
      stars,
      timeBonus: tb,
      starBonus: sb,
      total,
      newBest,
      coinsTotal: this.story.state.coins + st.coins,
      hasNext: !!done,
      nextLabel: 'CONTINUE',
    };
    scene.setControlsEnabled(false);
    this.reading();
    const end = new LevelEndScene(this.game, this.level, result, {
      next: () => {
        this.storyDone = null;
        this.story.addWalk(st.coins, st.time);
        this.glitch(() => done?.());
      },
      retry: () => this.restart(),
      quit: () => this.quitToTitle(),
    });
    end.onStar = (k) => this.game.audio.play('star', { rate: 1 + k * 0.12 });
    // "You've been supervillained" snaps in first, then the score.
    const sv = new SupervillainedScene(this.game, () => {
      this.game.scenes.remove(sv);
      this.game.scenes.push(end);
    });
    this.game.scenes.push(sv);
  }

  private gameOver(scene: GameScene): void {
    scene.setControlsEnabled(false);
    this.game.scenes.push(
      new GameOverScene(this.game, scene.rules.stats, {
        retry: () => this.restart(),
        quit: () => this.quitToTitle(),
      }),
    );
  }

  private newGameScene(): GameScene {
    // A new run (title, retry, restart) never inherits the previous run's siren.
    this.game.audio.stopAllLoops();
    const scene = new GameScene(this.game, this.level);
    bindGameAudio(scene.events, this.game.audio);
    scene.hooks = {
      onMenu: () => this.pause(),
      onComplete: (s) => this.levelComplete(s),
      onGameOver: (s) => this.gameOver(s),
    };
    this.gameScene = scene;
    return scene;
  }

  private popOverlays(): void {
    while (this.game.scenes.top && this.game.scenes.top !== this.gameScene) this.game.scenes.pop();
  }
}
