import { BlurFilter, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { TITLE } from '../config';
import type { TitleGlitchFilter } from '../fx/titleGlitchFilter';
import { TextGlitchFilter } from '../fx/textGlitchFilter';
import { titleFrames, TitlePlayer, type TitleFrames } from '../ui/titleAnim';
import { textures } from '../core/assets';
import type { Game } from '../core/game';
import type { Scene } from '../core/scene';
import { formatScore, formatTime, type LevelStats } from '../systems/scoring';
import { Menu, type MenuItem } from '../ui/menu';
import { PixelText, type Span } from '../ui/pixelText';
import { logoTexture, logoWidth, type LogoStyle } from '../ui/logo';
import { C, frameRect, hex, retroBox } from '../ui/retro';
import { DEFAULT_CONTROLS, nextBinding, type ControlSettings, type GestureBinding } from '../core/settings';
import { clampLives, nextLives } from '../systems/lives';
import { spriteName } from '../assets/manifest';
import type { LevelDef } from '../world/level';

/** Shared bits for the menu-like overlays. */
abstract class Overlay implements Scene {
  readonly root = new Container();
  readonly pausesBelow = true;
  protected readonly dim = new Graphics();
  protected w = 216;
  protected h = 400;
  protected time = 0;

  constructor(
    protected readonly game: Game,
    protected readonly dimAlpha: number,
  ) {
    this.root.addChild(this.dim);
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.dim.clear().rect(0, 0, w, h).fill({ color: 0x000000, alpha: this.dimAlpha });
    this.layout();
  }

  protected abstract layout(): void;

  update(dt: number): void {
    this.time += dt;
  }
}

const big = (text: string, color: string, scale: number, extra: Partial<ConstructorParameters<typeof PixelText>[1]> = {}) =>
  new PixelText(text, { color, scale, outline: '#120818', glow: 'self', glowAlpha: 0.3, ...extra }).setOrigin(0.5, 0.5);

const LOGO_TEXT = 'SUPERVILLAINED';
const LOGO_STYLE: LogoStyle = { colors: ['#f2ffb0', '#d4ff3a', '#9ccc1a'], outline: '#120818', shadow: '#2a4a08', glow: '#d4ff3a' };

export interface TitleActions {
  newGame: () => void;
  cont: () => void;
  options: () => void;
  /** The saved story at a glance (Zampanò's "account"). */
  couch: () => void;
  glossary: () => void;
  quit: () => void;
  /** SUPERVOID EDITIONS tapped (the publisher's site). */
  publisher: () => void;
  /** Where Continue goes ("LEVEL 3: 3.2 ..."), or null when there is no saved story. */
  continueLabel: string | null;
  /** The background's glitch filter, animated by the title (mostly vertical bursts). */
  glitch?: TitleGlitchFilter;
}

/**
 * Title page over the blurred, glitching Green Zone: the SUPERVILLAINED logo and CRUSADER at the
 * top, Zampanò's portrait, NEW GAME / CONTINUE / OPTIONS / QUIT, SUPERVOID EDITIONS at the bottom.
 * (The "You've been supervillained" logo is kept for the end of each level: SupervillainedScene.)
 */
export class TitleScene extends Overlay {
  /** Zampanò's animated portrait over the buttons. */
  private readonly dog = new Sprite();
  /** The animated portrait's frames (filled while the GIF decodes) and its player. */
  private frames: TitleFrames | null = null;
  private player: TitlePlayer | null = null;
  /** Width the frames were asked for (frames are made for one width). */
  private animWidth = 0;
  /** The layout has room for the real frame size (not just the reserved space). */
  private dogSized = false;
  private burstLeft = 0;
  private nextBurst = 1;
  /** The logo: always one line (see ui/logo.ts). */
  private readonly title = new Sprite();
  private titleScale = 0;
  /** Edition title under the logo. */
  private readonly edition: PixelText;
  /** Where Continue goes. */
  private readonly best: PixelText;
  /** The lives counter right of INSERT BRAIN (tap, or LEFT/RIGHT): more lives, less speed. */
  private readonly livesBox = new Graphics();
  private readonly livesText = new PixelText('', { color: C.yellow, shadow: '#000000' });
  private readonly livesIcon = new Sprite(textures.get(spriteName('dogFace')));
  private livesRect = { x: 0, y: 0, w: 0, h: 0 };
  /** A slow glint crossing one button now and then (masked to that button). */
  private readonly shine = new Graphics();
  private readonly shineMask = new Graphics();
  private shineButton = -1;
  private shineTime = 0;
  private nextShine = 1.2;
  /** Under INSERT BRAIN, blinking with it. */
  private readonly speedText = new PixelText('LIFE FOR SPEED', { color: '#8ad4ff', shadow: '#000000', letterSpacing: 1 }).setOrigin(0.5, 0);
  private readonly menu: Menu;
  /** The title's lettering (SUPERVILLAINED + CRUSADER), glitching now and then. */
  private readonly titleGroup = new Container();
  private readonly titleGlitch = new TextGlitchFilter();
  private textBurstLeft = 0;
  private nextTextBurst = 1.2;
  /** Publisher line (a link to its site): the smallest crisp size of the pixel font. */
  private readonly footer = new PixelText('SUPERVOID EDITIONS', { color: C.green, shadow: '#000000', letterSpacing: 1 }).setOrigin(0.5, 1);
  /** Its slow glow: a blurred pale copy behind it, breathing. */
  private readonly footerGlow = new PixelText('SUPERVOID EDITIONS', {
    color: TITLE.FOOTER_GLOW_COLOR,
    outline: TITLE.FOOTER_GLOW_COLOR,
    outlineWidth: 2,
    letterSpacing: 1,
  }).setOrigin(0.5, 1);
  /** Seconds left of the footer's flash after a tap. */
  private footerFlash = 0;

  constructor(
    game: Game,
    private readonly actions: TitleActions,
  ) {
    super(game, 0.15);
    this.edition = big('CRUSADER', C.hotPink, 1, { letterSpacing: 6, glow: C.hotPink, glowAlpha: 0.5 });
    const canContinue = actions.continueLabel !== null;
    // Under the buttons, blinking like an arcade cabinet's INSERT COIN.
    this.best = new PixelText('INSERT BRAIN', { color: C.white, shadow: '#000000', letterSpacing: 1 }).setOrigin(0.5, 0);
    this.menu = new Menu(
      [
        { label: 'NEW GAME', action: actions.newGame, color: C.red },
        // Always yellow: with no saved story, CONTINUE simply starts it (see Flow.toTitle).
        { label: 'CONTINUE', action: actions.cont, color: C.yellow },
        { label: 'COUCH', action: actions.couch, color: C.orange },
        { label: 'OPTIONS', action: actions.options, color: C.cyan },
        { label: 'GLOSSARY', action: actions.glossary, color: C.violet },
        { label: 'QUIT', action: actions.quit, color: C.pink },
      ],
      150,
      18,
      6,
    );
    if (canContinue) this.menu.selected = 1;
    this.dog.anchor.set(0.5, 0);
    this.titleGroup.addChild(this.title, this.edition);
    this.titleGroup.filters = [this.titleGlitch];
    this.footerGlow.filters = [new BlurFilter({ strength: TITLE.FOOTER_GLOW_BLUR, quality: 3, resolution: 1 })];
    this.best.setOrigin(0, 0);
    this.root.addChild(
      this.titleGroup,
      this.dog,
      this.best,
      this.livesBox,
      this.livesText,
      this.livesIcon,
      this.speedText,
      this.menu.root,
      this.shine,
      this.shineMask,
      this.footerGlow,
      this.footer,
    );
    this.shine.mask = this.shineMask;
    this.showLives();
  }

  protected layout(): void {
    const { w, h } = this;
    // One line, as big as fits: triple size on wide screens, double on phones (186 px).
    const scale = [4, 3, 2, 1].find((sc) => logoWidth(LOGO_TEXT) * sc + 8 <= w) ?? 1;
    if (scale !== this.titleScale) {
      this.titleScale = scale;
      this.title.texture = logoTexture(LOGO_TEXT, scale, LOGO_STYLE);
      this.title.anchor.set(0.5);
    }
    const cx = Math.round(w / 2);
    // The title near the top (TITLE.TOP). Under it, one block (the portrait, the buttons, INSERT
    // BRAIN with its lives counter, LIFE FOR SPEED) centered between CRUSADER and the publisher
    // line: the same space above and below it.
    const halfTitle = Math.round(this.title.height / 2);
    const titleY = Math.round(h * TITLE.TOP) + halfTitle;
    const editionY = titleY + halfTitle + 10;
    const headerBottom = editionY + 5;
    const footerTop = h - 6 - this.footer.textHeight;
    const rowH = 12;
    const below = TITLE.DOG_MENU_GAP + this.menu.height + TITLE.INSERT_BRAIN_GAP + rowH + 5 + this.speedText.textHeight;
    const space = footerTop - headerBottom;
    // The portrait takes DOG_WIDTH of the screen, smaller if the block would not fit (short screens).
    const maxDogH = space - below - 2 * TITLE.BLOCK_MIN_MARGIN;
    const dogW = Math.max(24, Math.min(Math.round(w * TITLE.DOG_WIDTH), Math.floor(maxDogH / TITLE.DOG_ASPECT)));
    const dogH = this.layoutDog(dogW);
    // The animated portrait's frame has a sliver of transparent space over the dog's head (the
    // crop margin): center what is seen, not the frame.
    const my = TITLE.DOG_CROP_MARGIN[1];
    const topPad = Math.round((dogH * my) / (1 + 2 * my));
    const margin = Math.max(0, Math.round((space - (dogH - topPad) - below) / 2));
    const dogY = headerBottom + margin - topPad;
    const menuY = dogY + dogH + TITLE.DOG_MENU_GAP;
    const bestY = menuY + this.menu.height + TITLE.INSERT_BRAIN_GAP;
    const speedY = bestY + rowH + 5;
    this.title.position.set(cx, titleY);
    this.edition.position.set(cx, editionY);
    this.dog.position.set(cx, dogY);
    this.menu.layout(w / 2, menuY);
    this.layoutLives(cx, bestY, rowH);
    this.speedText.position.set(cx, speedY);
    this.footer.position.set(cx, h - 6);
    this.footerGlow.position.set(cx, h - 6);
  }

  /** Sets the portrait for this width; returns the height it takes. */
  private layoutDog(width: number): number {
    if (this.animWidth !== width || !this.player) {
      this.animWidth = width;
      // The frames play as soon as they are decoded (titleAnim.ts).
      this.frames = titleFrames(width);
      this.player = new TitlePlayer(this.frames);
    }
    const f = this.frames!;
    this.dogSized = f.frames.length > 0;
    if (!this.dogSized) {
      // Not decoded yet: keep its place.
      this.dog.texture = Texture.EMPTY;
      return Math.round(width * TITLE.DOG_ASPECT);
    }
    this.dog.texture = f.frames[0]!;
    return f.height;
  }

  /** Android Back on the title: QUIT (closes the app on Android). */
  back(): void {
    this.actions.quit();
  }

  override update(dt: number): void {
    super.update(dt);
    if (this.player) {
      // The first frame has arrived: lay out with its real size.
      if (!this.dogSized && this.frames!.frames.length) this.layout();
      const tex = this.player.update(dt);
      if (tex) this.dog.texture = tex;
    }
    // INSERT BRAIN blinks (on 0.6 s, off 0.4 s).
    const on = this.time > 0.6 && this.time % TITLE.INSERT_BRAIN_BLINK < TITLE.INSERT_BRAIN_BLINK * 0.6;
    this.best.visible = on;
    this.speedText.visible = on;
    // The counter itself stays visible (it is a control).
    const showCounter = this.time > 0.5;
    this.livesBox.visible = this.livesText.visible = this.livesIcon.visible = showCounter;
    // Glitchy entrance: jitter for the first moments.
    const jitter = this.time < 0.9 ? Math.round((Math.random() * 2 - 1) * 4 * (1 - this.time / 0.9)) : 0;
    this.title.x = Math.round(this.w / 2) + jitter;
    this.edition.x = Math.round(this.w / 2) - jitter;
    this.edition.visible = this.time > 0.25;
    this.dog.visible = this.time > 0.35;
    this.menu.root.visible = this.time > 0.5;
    this.animateGlitch(dt);
    this.animateTitleGlitch(dt);
    this.animateShine(dt);
    this.footerFlash = Math.max(0, this.footerFlash - dt);
    this.footer.alpha = this.footerFlash > 0 ? 0.55 : 1;
    const [fa, fb] = TITLE.FOOTER_GLOW_ALPHA;
    this.footerGlow.alpha = fa + (fb - fa) * (0.5 - 0.5 * Math.cos(this.time * TITLE.FOOTER_GLOW_SPEED));
    // Covered by the glossary card: it keeps animating, but the card has the input.
    if (this.game.scenes.top !== this) return;
    if (this.time > 0.6) {
      // SUPERVOID EDITIONS opens the publisher's site.
      const f = this.footer;
      const input = this.game.input;
      const hit = input
        .peekTaps()
        .some((t) => Math.abs(t.x - f.x) <= f.textWidth / 2 + 6 && t.y >= f.y - f.textHeight - 8 && t.y <= f.y + 6);
      if (hit) {
        input.consumeTaps();
        this.footerFlash = 0.25;
        this.actions.publisher();
      }
      // The lives counter: a tap adds a life (back to the start after the most); LEFT/RIGHT too.
      const r = this.livesRect;
      const onLives = input.peekTaps().some((t) => t.x >= r.x - 6 && t.x <= r.x + r.w + 6 && t.y >= r.y - 5 && t.y <= r.y + r.h + 5);
      if (onLives) {
        input.consumeTaps();
        this.changeLives(1);
      }
      if (input.consume('right')) this.changeLives(1);
      if (input.consume('left')) this.changeLives(-1);
      this.menu.update(dt, input);
    }
  }

  private changeLives(step: number): void {
    this.game.updateSettings((s) => (s.lives = nextLives(s.lives, step)));
    this.game.audio.play('click');
    this.showLives();
    this.layout();
  }

  /** The counter's text: the lives, then the dog's face (as in the walk's HUD). */
  private showLives(): void {
    this.livesText.setText(`${clampLives(this.game.settings.lives)}x`);
  }

  /** INSERT BRAIN and the counter, centered together on one row at `y`. */
  private layoutLives(cx: number, y: number, rowH: number): void {
    const textW = this.best.textWidth;
    const icon = this.livesIcon;
    const boxW = 4 + this.livesText.textWidth + 2 + Math.round(icon.width) + 4;
    const gap = 8;
    const x0 = Math.round(cx - (textW + gap + boxW) / 2);
    this.best.position.set(x0, y + Math.round((rowH - this.best.textHeight) / 2));
    const bx = x0 + textW + gap;
    this.livesRect = { x: bx, y, w: boxW, h: rowH };
    const g = this.livesBox.clear();
    g.rect(bx, y, boxW, rowH).fill({ color: 0x000000, alpha: 0.45 });
    frameRect(g, bx, y, boxW, rowH, hex(C.yellow), 0.9);
    this.livesText.position.set(bx + 4, y + Math.round((rowH - this.livesText.textHeight) / 2));
    icon.position.set(bx + 4 + this.livesText.textWidth + 2, y + Math.round((rowH - icon.height) / 2));
  }

  /** Now and then a slow light band crosses one of the buttons (never the same one twice in a row). */
  private animateShine(dt: number): void {
    const g = this.shine.clear();
    if (!this.menu.root.visible) return;
    const rnd = (r: readonly number[]) => r[0]! + Math.random() * (r[1]! - r[0]!);
    if (this.shineButton < 0) {
      this.nextShine -= dt;
      if (this.nextShine > 0) return;
      const n = this.menu.count;
      let pick = Math.floor(Math.random() * n);
      if (pick === this.lastShine && n > 1) pick = (pick + 1) % n;
      this.shineButton = this.lastShine = pick;
      this.shineTime = 0;
      const r = this.menu.rowRect(pick);
      this.shineMask.clear().rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2).fill({ color: 0xffffff });
    }
    this.shineTime += dt;
    const p = this.shineTime / TITLE.SHINE_TIME;
    if (p >= 1) {
      this.shineButton = -1;
      this.nextShine = rnd(TITLE.SHINE_EVERY);
      return;
    }
    // Eased so it lingers a little in the middle; brightest there.
    const e = 0.5 - 0.5 * Math.cos(p * Math.PI);
    const r = this.menu.rowRect(this.shineButton);
    const bw = TITLE.SHINE_WIDTH;
    const sl = TITLE.SHINE_SLANT;
    const x = Math.round(r.x - bw - sl + (r.w + bw + 2 * sl) * e);
    const alpha = TITLE.SHINE_ALPHA * Math.sin(p * Math.PI);
    g.poly([x + sl, r.y, x + sl + bw, r.y, x + bw, r.y + r.h, x, r.y + r.h]).fill({ color: 0xffffff, alpha });
    // A thinner second streak just behind it.
    g.poly([x + sl - 5, r.y, x + sl - 3, r.y, x - 3, r.y + r.h, x - 5, r.y + r.h]).fill({ color: 0xffffff, alpha: alpha * 0.6 });
  }

  private lastShine = -1;

  /** The title's lettering glitches in short bursts, with a faint shiver in between. */
  private animateTitleGlitch(dt: number): void {
    const f = this.titleGlitch;
    const rnd = (r: readonly number[]) => r[0]! + Math.random() * (r[1]! - r[0]!);
    f.time = this.time;
    this.nextTextBurst -= dt;
    if (this.nextTextBurst <= 0) {
      this.nextTextBurst = rnd(TITLE.TEXT_GLITCH_EVERY);
      this.textBurstLeft = rnd(TITLE.TEXT_GLITCH_TIME);
    }
    this.textBurstLeft -= dt;
    f.burst = this.textBurstLeft > 0 ? rnd(TITLE.TEXT_GLITCH_BURST) : 0;
    f.idle = TITLE.TEXT_GLITCH_IDLE;
  }

  /** The background: an old dirty film that glitches now and then, mostly vertically. */
  private animateGlitch(dt: number): void {
    const f = this.actions.glitch;
    if (!f) return;
    const rnd = (r: readonly number[]) => r[0]! + Math.random() * (r[1]! - r[0]!);
    f.time = this.time;
    this.nextBurst -= dt;
    if (this.nextBurst <= 0) {
      this.nextBurst = rnd(TITLE.GLITCH_EVERY);
      this.burstLeft = rnd(TITLE.GLITCH_TIME);
    }
    this.burstLeft -= dt;
    // A burst flickers: its strength jumps around while it lasts.
    f.burst = this.burstLeft > 0 ? rnd(TITLE.GLITCH_BURST) : 0;
    f.idle = TITLE.GLITCH_IDLE;
    f.film = TITLE.FILM;
  }
}

const BRIEFING: Span[] = [
  { text: 'MAKE A WALK.\n', color: C.orange },
  { text: 'COLLECT ENOUGH TREATS TO COMPENSATE THE HUNGER.\n', color: C.green },
  {
    text: 'PEE ENOUGH TO COMPENSATE THE POOPS AS TOO MANY POOPS CAN ENDANGER THE ENVIRONMENT OF THE ZONE YOU ARE PLAYING IN.\n',
    color: C.red,
  },
  { text: 'CATS MEAN MONEY.\n', color: C.cyan },
  { text: "DON'T GET DISTRACTED BY THE BALLS.", color: C.yellow },
];

/** The rules, as in the video: big uppercase justified text with colored sentences. */
export class BriefingScene extends Overlay {
  private readonly text = new PixelText(BRIEFING, { align: 'justify', justifyLast: true, outline: '#120818', glow: 'self', glowAlpha: 0.25, lineGap: 3 });
  private readonly prompt: PixelText;
  private readonly hint: PixelText;

  constructor(
    game: Game,
    private readonly onGo: () => void,
  ) {
    super(game, 0.42);
    // Like every other hint: touch once a finger has touched the screen (on a phone the title's
    // buttons and the level card were tapped to get here).
    const touch = game.input.usingTouch;
    this.prompt = big(touch ? 'TAP TO START' : 'PRESS SPACE', C.white, 1, { outline: '#000000' });
    this.hint = new PixelText(
      touch ? 'LEFT THUMB: MOVE\nBUTTONS: PEE / BARK / RUN' : 'WASD MOVE  SHIFT RUN\nSPACE PEE  J BARK  ESC MENU',
      { color: '#c8d0ff', shadow: '#000000', align: 'center', lineGap: 3, maxWidth: 190 },
    ).setOrigin(0.5, 0);
    this.root.addChild(this.text, this.prompt, this.hint);
  }

  protected layout(): void {
    const { w, h } = this;
    const top = 58;
    const bottom = h - 64;
    const maxW = w - 16;
    // Prefer the big 2x text like the video; fall back to 1x when it doesn't fit.
    this.text.setStyle({ scale: 2, maxWidth: maxW, lineGap: 2 });
    if (this.text.textHeight > bottom - top - 26) this.text.setStyle({ scale: 1, maxWidth: maxW, lineGap: 5 });
    this.text.setOrigin(0.5, 0);
    this.text.position.set(Math.round(w / 2), Math.round(top + Math.max(0, (bottom - top - 26 - this.text.textHeight) / 2)));
    this.prompt.position.set(Math.round(w / 2), Math.round(this.text.y + this.text.textHeight + 14));
    this.hint.position.set(Math.round(w / 2), Math.round(this.prompt.y + 10));
    this.hint.visible = this.hint.y + this.hint.textHeight < bottom + 20;
  }

  override update(dt: number): void {
    super.update(dt);
    this.prompt.visible = Math.floor(this.time * 2.5) % 2 === 0;
    const input = this.game.input;
    const taps = input.consumeTaps();
    if (this.time > 0.5 && (taps.length || input.consumeContinue())) this.onGo();
  }
}

/** Pause menu (MENU button, Esc, or app sent to background). */
export class PauseScene extends Overlay {
  private readonly box = new Graphics();
  private readonly title = big('PAUSED', C.yellow, 2);
  private readonly menu: Menu;

  constructor(
    game: Game,
    private readonly actions: {
      resume: () => void;
      restart: () => void;
      toggleSound: () => void;
      quit: () => void;
      muted: () => boolean;
      volume: () => number;
      cycleVolume: () => void;
    },
  ) {
    super(game, 0.5);
    const items: MenuItem[] = [
      { label: 'RESUME', action: actions.resume, color: C.green },
      { label: 'RESTART', action: actions.restart, color: C.yellow },
      {
        label: () => (actions.muted() ? 'SOUND: OFF' : 'SOUND: ON'),
        action: () => {
          actions.toggleSound();
          this.menu.refreshLabels();
        },
        color: C.cyan,
      },
      {
        label: () => `VOLUME: ${Math.round(actions.volume() * 100)}%`,
        action: () => {
          actions.cycleVolume();
          this.menu.refreshLabels();
        },
        color: C.cyan,
      },
      { label: 'QUIT TO TITLE', action: actions.quit, color: C.pink },
    ];
    this.menu = new Menu(items, 132, 18, 6);
    this.root.addChild(this.box, this.title, this.menu.root);
  }

  protected layout(): void {
    const { w, h } = this;
    const bh = 36 + this.menu.height + 10;
    const top = Math.round(h / 2 - bh / 2);
    this.box.clear();
    retroBox(this.box, Math.round(w / 2 - 78), top, 156, bh, C.red, C.yellow, 0.6);
    this.title.position.set(Math.round(w / 2), top + 18);
    this.menu.layout(w / 2, top + 36);
  }

  /** Android Back: RESUME. */
  back(): void {
    this.actions.resume();
  }

  override update(dt: number): void {
    super.update(dt);
    const input = this.game.input;
    if (input.consume('menu') || input.consume('back')) {
      this.actions.resume();
      return;
    }
    this.menu.update(dt, input);
  }
}

export interface LevelResult {
  stats: LevelStats;
  health: number;
  stars: number;
  timeBonus: number;
  starBonus: number;
  total: number;
  newBest: boolean;
  coinsTotal: number;
  hasNext: boolean;
  /** Label of the NEXT button (CONTINUE when the story goes on). */
  nextLabel?: string;
}

/** End of level: stats, stars popping one by one, bonuses, NEXT / RETRY. */
export class LevelEndScene extends Overlay {
  private readonly box = new Graphics();
  private readonly title = big('GOOD BOY!', C.yellow, 2);
  private readonly subtitle: PixelText;
  private readonly lines: PixelText[] = [];
  private readonly stars: Sprite[] = [];
  private readonly bonus: PixelText;
  private readonly total: PixelText;
  private readonly best = big('NEW BEST!', C.green, 1);
  private readonly menu: Menu;
  private starsShown = 0;
  private skip = false;
  /** Callback fired when a star pops (sound hook). */
  onStar: ((k: number) => void) | null = null;

  constructor(
    game: Game,
    level: LevelDef,
    private readonly r: LevelResult,
    actions: { next: () => void; retry: () => void; quit: () => void },
  ) {
    super(game, 0.55);
    this.subtitle = big(`LEVEL ${level.number} COMPLETE`, C.cyan, 1);
    const s = r.stats;
    const rows: Array<[string, string, string]> = [
      ['TIME', formatTime(s.time), C.green],
      ['TREATS', String(s.treats), C.pink],
      ['PEES / POOPS', `${s.pees} / ${s.poops}`, C.yellow],
      ['COINS', `${s.coins}  (${r.coinsTotal})`, C.orange],
      ['ZONE HEALTH', `${Math.round(r.health * 100)}%`, C.green],
    ];
    for (const [k, v, color] of rows) {
      const t = new PixelText([
        { text: k.padEnd(14, ' '), color },
        { text: v.padStart(9, ' '), color: C.white },
      ], { shadow: '#000000' });
      this.lines.push(t);
    }
    for (let k = 0; k < 5; k++) {
      const st = new Sprite(textures.get(spriteName('star', 2)));
      st.anchor.set(0.5);
      st.scale.set(2);
      this.stars.push(st);
    }
    this.bonus = new PixelText(
      [
        { text: 'TIME BONUS'.padEnd(14, ' '), color: C.cyan },
        { text: `+${r.timeBonus}`.padStart(9, ' '), color: C.white },
        { text: '\n' },
        { text: 'STAR BONUS'.padEnd(14, ' '), color: C.cyan },
        { text: `+${r.starBonus}`.padStart(9, ' '), color: C.white },
      ],
      { shadow: '#000000', lineGap: 4 },
    );
    this.total = new PixelText([
      { text: 'SCORE'.padEnd(14, ' '), color: C.yellow },
      { text: formatScore(r.total).padStart(9, ' '), color: C.yellow },
    ], { shadow: '#000000', glow: 'self', glowAlpha: 0.3 });
    const items: MenuItem[] = [];
    if (r.hasNext) items.push({ label: r.nextLabel ?? 'NEXT', action: actions.next, color: C.green });
    items.push({ label: 'RETRY', action: actions.retry, color: C.yellow });
    if (!r.hasNext) items.push({ label: 'TITLE', action: actions.quit, color: C.pink });
    this.menu = new Menu(items, 120, 16, 5);
    this.root.addChild(this.box, this.title, this.subtitle, ...this.lines, ...this.stars, this.bonus, this.total, this.best, this.menu.root);
  }

  protected layout(): void {
    const { w, h } = this;
    const bw = Math.min(w - 8, 196);
    const bh = 222 + this.menu.height + 9;
    const top = Math.max(4, Math.round(h / 2 - bh / 2));
    const left = Math.round(w / 2 - bw / 2);
    this.box.clear();
    retroBox(this.box, left, top, bw, bh, C.yellow, C.red, 0.65);
    this.title.position.set(Math.round(w / 2), top + 16);
    this.subtitle.position.set(Math.round(w / 2), top + 34);
    const tx = Math.round(w / 2 - (23 * 8) / 2);
    this.lines.forEach((l, k) => l.position.set(tx, top + 48 + k * 13));
    this.stars.forEach((s, k) => s.position.set(Math.round(w / 2 + (k - 2) * 26), top + 130));
    this.bonus.position.set(tx, top + 156);
    this.total.position.set(tx, top + 186);
    this.best.position.set(Math.round(w / 2), top + 206);
    this.menu.layout(w / 2, top + 222);
  }

  override update(dt: number): void {
    super.update(dt);
    const input = this.game.input;
    const t = this.skip ? 99 : this.time;
    this.lines.forEach((l, k) => (l.visible = t > 0.3 + k * 0.15));
    // Stars pop one by one (half star included).
    const starStart = 1.2;
    const want = Math.min(5, Math.max(0, Math.floor((t - starStart) / 0.35) + 1));
    while (this.starsShown < want) {
      const k = this.starsShown++;
      const v = this.r.stars >= k + 1 ? 0 : this.r.stars >= k + 0.5 ? 1 : 2;
      this.stars[k]!.texture = textures.get(spriteName('star', v));
      this.stars[k]!.scale.set(v === 2 ? 2 : 3);
      if (v !== 2) this.onStar?.(k);
    }
    for (const s of this.stars) if (s.scale.x > 2) s.scale.set(Math.max(2, s.scale.x - dt * 8));
    const after = starStart + 5 * 0.35;
    this.bonus.visible = t > after;
    this.total.visible = t > after + 0.3;
    this.best.visible = this.r.newBest && t > after + 0.5 && Math.floor(this.time * 3) % 2 === 0;
    this.menu.root.visible = t > after + 0.6;
    if (!this.menu.root.visible) {
      if (input.consumeTaps().length || input.consumeContinue()) this.skip = true;
      return;
    }
    this.menu.update(dt, input);
  }
}

/** Game over: Retry / Quit. */
export class GameOverScene extends Overlay {
  private readonly title = big('GAME OVER', C.red, 2, { outline: '#ffffff' });
  private readonly msg: PixelText;
  private readonly score: PixelText;
  private readonly menu: Menu;

  constructor(game: Game, stats: LevelStats, actions: { retry: () => void; quit: () => void }) {
    super(game, 0.6);
    this.msg = new PixelText('ZAMPANO IS TOO HUNGRY\nTO GO ON...', { color: C.paleRose, align: 'center', lineGap: 4, shadow: '#000000' }).setOrigin(0.5, 0);
    this.score = big(`SCORE ${formatScore(stats.score)}`, C.cyan, 1);
    this.menu = new Menu(
      [
        { label: 'RETRY', action: actions.retry, color: C.yellow },
        { label: 'QUIT TO TITLE', action: actions.quit, color: C.pink },
      ],
      132,
      18,
      6,
    );
    this.root.addChild(this.title, this.msg, this.score, this.menu.root);
  }

  protected layout(): void {
    const { w, h } = this;
    this.title.position.set(Math.round(w / 2), Math.round(h * 0.3));
    this.msg.position.set(Math.round(w / 2), Math.round(h * 0.3 + 22));
    this.score.position.set(Math.round(w / 2), Math.round(h * 0.3 + 52));
    this.menu.layout(w / 2, Math.round(h * 0.3 + 72));
  }

  override update(dt: number): void {
    super.update(dt);
    const jitter = this.time < 1 && Math.random() < 0.3 ? Math.round((Math.random() * 2 - 1) * 3) : 0;
    this.title.x = Math.round(this.w / 2) + jitter;
    this.menu.root.visible = this.time > 0.8;
    if (this.menu.root.visible) this.menu.update(dt, this.game.input);
  }
}

/** OPTIONS from the title: sound, volume, text speed, replaying levels, the book. */
export class OptionsScene extends Overlay {
  private readonly heading = big('OPTIONS', C.yellow, 2);
  private readonly menu: Menu;
  private readonly onBack: () => void;

  constructor(
    game: Game,
    actions: {
      toggleSound: () => void;
      muted: () => boolean;
      cycleVolume: () => void;
      volume: () => number;
      cycleTextSpeed: () => void;
      textSpeed: () => string;
      controls: () => void;
      levels: () => void;
      book: () => void;
      back: () => void;
    },
  ) {
    // Nearly opaque: the title's own buttons must not show through.
    super(game, 0.94);
    this.onBack = actions.back;
    this.menu = new Menu(
      [
        {
          label: () => (actions.muted() ? 'SOUND: OFF' : 'SOUND: ON'),
          action: () => {
            actions.toggleSound();
            this.menu.refreshLabels();
          },
          color: C.cyan,
        },
        {
          label: () => `VOLUME: ${Math.round(actions.volume() * 100)}%`,
          action: () => {
            actions.cycleVolume();
            this.menu.refreshLabels();
          },
          color: C.cyan,
        },
        {
          label: () => `TEXT: ${actions.textSpeed()}`,
          action: () => {
            actions.cycleTextSpeed();
            this.menu.refreshLabels();
          },
          color: C.cyan,
        },
        { label: 'CONTROLS', action: actions.controls, color: C.green },
        { label: 'LEVELS (REPLAY)', action: actions.levels, color: C.yellow },
        { label: 'MERAVIGLIA BOOK', action: actions.book, color: C.pink },
        { label: 'BACK', action: actions.back, color: C.white },
      ],
      160,
      18,
      6,
    );
    this.root.addChild(this.heading, this.menu.root);
  }

  protected layout(): void {
    const { w, h } = this;
    this.heading.position.set(Math.round(w / 2), Math.round(h * 0.22));
    this.menu.layout(w / 2, Math.round(h * 0.32));
  }

  /** Android Back: BACK to the title. */
  back(): void {
    this.onBack();
  }

  override update(dt: number): void {
    super.update(dt);
    // Escape does what Android Back does.
    if (this.game.input.consume('back')) {
      this.back();
      return;
    }
    if (this.time > 0.25) this.menu.update(dt, this.game.input);
  }
}

const BINDING_LABEL: Record<GestureBinding, string> = {
  off: 'OFF',
  action: 'ACTION BUTTON',
  bark: 'BARK',
  sword: 'SWORD',
  shield: 'SHIELD',
  switch: 'SWITCH',
  run: 'RUN ON/OFF',
};

/**
 * OPTIONS > CONTROLS (also in the story's pause menu): what the right-hand gestures do, RUN held
 * or switched, the action button's switcher, and the buttons for the right or the left hand.
 * Changes apply at once (Game.updateSettings → Input.applyControls) and are saved.
 */
export class ControlsScene extends Overlay {
  private readonly heading = big('CONTROLS', C.yellow, 2);
  private readonly help: PixelText;
  private readonly menu: Menu;

  constructor(
    game: Game,
    private readonly onBack: () => void,
  ) {
    // Opaque: it opens over OPTIONS or the pause menu.
    super(game, 1);
    const c = () => game.settings.controls;
    /** Changes the controls (saved and applied at once), with a click. */
    const change = (fn: (controls: ControlSettings) => void) => {
      game.updateSettings((s) => fn(s.controls));
      game.audio.play('click');
      this.menu.refreshLabels();
    };
    const cycle = (key: 'swipeUp' | 'swipeDown' | 'doubleTap') => () => change((k) => (k[key] = nextBinding(k[key])));
    this.menu = new Menu(
      [
        { label: () => `SWIPE UP: ${BINDING_LABEL[c().swipeUp]}`, action: cycle('swipeUp'), color: C.cyan },
        { label: () => `SWIPE DOWN: ${BINDING_LABEL[c().swipeDown]}`, action: cycle('swipeDown'), color: C.cyan },
        { label: () => `DOUBLE TAP: ${BINDING_LABEL[c().doubleTap]}`, action: cycle('doubleTap'), color: C.cyan },
        {
          label: () => (c().run === 'toggle' ? 'RUN: TAP ON/OFF' : 'RUN: HOLD'),
          action: () => change((k) => (k.run = k.run === 'toggle' ? 'hold' : 'toggle')),
          color: C.green,
        },
        {
          label: () => (c().switcher ? 'SWITCHER: ON' : 'SWITCHER: OFF'),
          action: () => change((k) => (k.switcher = !k.switcher)),
          color: C.yellow,
        },
        {
          label: () => (c().hand === 'left' ? 'BUTTONS: LEFT HAND' : 'BUTTONS: RIGHT HAND'),
          action: () => change((k) => (k.hand = k.hand === 'left' ? 'right' : 'left')),
          color: C.yellow,
        },
        {
          label: 'DEFAULTS',
          action: () => change((k) => Object.assign(k, DEFAULT_CONTROLS)),
          color: C.pink,
        },
        { label: 'BACK', action: () => this.onBack(), color: C.white },
      ],
      176,
      16,
      4,
    );
    this.help = new PixelText(
      'GESTURES: ON THE BUTTON SIDE, ABOVE THE BUTTONS. SWORD AND SHIELD ONCE HE IS A KNIGHT.\n\nKEYS: J ACTION   B BARK\nU SWORD   I SHIELD (HOLD)\nQ SWITCH   K RUN',
      { color: '#9aa4c0', shadow: '#000000', align: 'center', maxWidth: 196, lineGap: 3 },
    ).setOrigin(0.5, 0);
    this.root.addChild(this.heading, this.menu.root, this.help);
  }

  protected layout(): void {
    const { w, h } = this;
    const top = Math.round(Math.max(64, h * 0.2));
    this.heading.position.set(Math.round(w / 2), top - 22);
    this.menu.layout(w / 2, top);
    this.help.position.set(Math.round(w / 2), top + this.menu.height + 10);
  }

  /** Android Back: BACK. */
  back(): void {
    this.onBack();
  }

  override update(dt: number): void {
    super.update(dt);
    const input = this.game.input;
    if (input.consume('menu') || input.consume('back')) {
      this.onBack();
      return;
    }
    if (this.time > 0.25) this.menu.update(dt, input);
  }
}

/** A yes/no question (NEW GAME over a saved story). */
export class ConfirmScene extends Overlay {
  private readonly heading: PixelText;
  private readonly text: PixelText;
  private readonly menu: Menu;

  private readonly onNo: () => void;

  constructor(game: Game, title: string, text: string, actions: { yes: () => void; no: () => void; yesLabel?: string; noLabel?: string }) {
    super(game, 0.92);
    this.onNo = actions.no;
    this.heading = big(title, C.yellow, 1);
    this.text = new PixelText(text, { color: C.white, shadow: '#000000', align: 'center', maxWidth: 180, lineGap: 3 }).setOrigin(0.5, 0);
    this.menu = new Menu(
      [
        { label: actions.yesLabel ?? 'YES', action: actions.yes, color: C.green },
        { label: actions.noLabel ?? 'NO', action: actions.no, color: C.pink },
      ],
      140,
      18,
      6,
    );
    this.menu.selected = 1;
    this.root.addChild(this.heading, this.text, this.menu.root);
  }

  protected layout(): void {
    const { w, h } = this;
    this.heading.position.set(Math.round(w / 2), Math.round(h * 0.32));
    this.text.position.set(Math.round(w / 2), Math.round(h * 0.32 + 16));
    this.menu.layout(w / 2, Math.round(h * 0.32 + 30 + this.text.textHeight));
  }

  /** Android Back: NO. */
  back(): void {
    this.onNo();
  }

  override update(dt: number): void {
    super.update(dt);
    // Escape does what Android Back does.
    if (this.game.input.consume('back')) {
      this.back();
      return;
    }
    if (this.time > 0.25) this.menu.update(dt, this.game.input);
  }
}

/** QUIT in a browser tab (a web page cannot close its own tab): a goodbye card, tap to go back. */
export class GoodbyeScene extends Overlay {
  private readonly heading = big('THANKS FOR PLAYING', C.yellow, 1);
  private readonly text = new PixelText('YOU CAN CLOSE THIS TAB NOW.\nTAP TO GO BACK TO THE TITLE.', { color: C.white, shadow: '#000000', align: 'center', lineGap: 4 }).setOrigin(0.5, 0);

  constructor(
    game: Game,
    private readonly onBack: () => void,
  ) {
    super(game, 0.85);
    this.root.addChild(this.heading, this.text);
  }

  protected layout(): void {
    const { w, h } = this;
    this.heading.position.set(Math.round(w / 2), Math.round(h * 0.42));
    this.text.position.set(Math.round(w / 2), Math.round(h * 0.42 + 18));
  }

  /** Android Back: closes the card. */
  back(): void {
    this.onBack();
  }

  override update(dt: number): void {
    super.update(dt);
    const input = this.game.input;
    if (this.time > 0.5 && (input.consumeTaps().length || input.consumeContinue() || input.consume('back'))) this.onBack();
  }
}

