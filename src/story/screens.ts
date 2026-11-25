import { Container, Graphics, Sprite } from 'pixi.js';
import { textures } from '../core/assets';
import type { Game } from '../core/game';
import type { Scene } from '../core/scene';
import { spriteName, type SpriteKey } from '../assets/manifest';
import type { CampaignState } from '../campaign/state';
import type { ChapterDef, SubLevelDef } from '../campaign/types';
import { Menu, type MenuItem } from '../ui/menu';
import { PixelText, type Span } from '../ui/pixelText';
import { C, retroBox } from '../ui/retro';

/** Full-screen card with stacked texts; tap to continue. */
export class StoryCardScene implements Scene {
  readonly root = new Container();
  readonly pausesBelow = true;
  private readonly bg = new Graphics();
  private readonly items: Array<{ t: PixelText | Sprite; gap: number }> = [];
  private readonly tap = new PixelText('TAP TO CONTINUE', { color: C.yellow, shadow: '#000000' }).setOrigin(0.5);
  private time = 0;

  constructor(
    private readonly game: Game,
    private readonly bgColor: number,
    lines: Array<{ text: string | Span[]; color?: string; scale?: number; gap?: number; align?: 'center' | 'justify' | 'left'; portrait?: boolean }>,
    private readonly onDone: () => void,
  ) {
    this.root.addChild(this.bg);
    for (const l of lines) {
      if (l.portrait) {
        const s = new Sprite(textures.get(spriteName('professorFace')));
        s.scale.set(2);
        s.anchor.set(0.5, 0);
        this.items.push({ t: s, gap: l.gap ?? 8 });
        this.root.addChild(s);
        continue;
      }
      const t = new PixelText(l.text, {
        color: l.color ?? C.white,
        scale: l.scale ?? 1,
        outline: (l.scale ?? 1) > 1 ? '#120818' : null,
        shadow: (l.scale ?? 1) > 1 ? null : '#000000',
        glow: (l.scale ?? 1) > 1 ? 'self' : null,
        glowAlpha: 0.3,
        align: l.align ?? 'center',
        lineGap: 4,
      }).setOrigin(0.5, 0);
      this.items.push({ t, gap: l.gap ?? 8 });
      this.root.addChild(t);
    }
    this.root.addChild(this.tap);
  }

  resize(w: number, h: number): void {
    this.bg.clear().rect(0, 0, w, h).fill(this.bgColor);
    let total = 0;
    for (const it of this.items) {
      if (it.t instanceof PixelText) it.t.setStyle({ maxWidth: w - 20 });
      total += (it.t instanceof PixelText ? it.t.textHeight : it.t.height) + it.gap;
    }
    let y = Math.max(16, Math.round(h * 0.45 - total / 2));
    for (const it of this.items) {
      it.t.position.set(Math.round(w / 2), y);
      y += (it.t instanceof PixelText ? it.t.textHeight : it.t.height) + it.gap;
    }
    this.tap.position.set(Math.round(w / 2), h - 24);
  }

  update(dt: number): void {
    this.time += dt;
    this.tap.visible = this.time > 0.8 && Math.floor(this.time * 2.5) % 2 === 0;
    const input = this.game.input;
    const taps = input.consumeTaps().length > 0;
    if (this.time > 0.6 && (taps || input.consumeAny(['confirm', 'action', 'pee']))) this.onDone();
  }
}

/** Level select: eight levels, progress, shards, the book. */
export class StoryMenuScene implements Scene {
  readonly root = new Container();
  readonly pausesBelow = true;
  private readonly bg = new Graphics();
  private readonly title = new PixelText('LEVELS', { color: C.yellow, outline: '#120818', glow: 'self', glowAlpha: 0.3 }).setOrigin(0.5, 0);
  private readonly sub = new PixelText('SUPERVILLAINED: CRUSADER', { color: '#9aa4c0', shadow: '#000000' }).setOrigin(0.5, 0);
  private readonly menu: Menu;
  private readonly meters = new PixelText('', { color: C.white, shadow: '#000000', align: 'center', lineGap: 3 }).setOrigin(0.5, 0);
  private time = 0;

  constructor(
    private readonly game: Game,
    state: CampaignState,
    chapters: readonly ChapterDef[],
    actions: {
      play: (chapter: ChapterDef) => void;
      cont: () => void;
      book: () => void;
      back: () => void;
      unlocked: (chapter: ChapterDef) => boolean;
    },
  ) {
    const items: MenuItem[] = [{ label: state.completed.length ? 'CONTINUE' : 'BEGIN THE DREAM', action: actions.cont, color: C.green }];
    for (const ch of chapters) {
      const done = ch.subLevels.filter((s) => state.completed.includes(s.id)).length;
      const open = actions.unlocked(ch);
      items.push({
        label: open ? `${ch.number} ${(ch.menuTitle ?? ch.title).toUpperCase()} ${done}/${ch.subLevels.length}` : `${ch.number} ? ? ?`,
        action: () => (open ? actions.play(ch) : this.game.audio.play('empty')),
        color: !open ? '#5a5a6a' : done === ch.subLevels.length ? C.cyan : C.yellow,
      });
    }
    items.push({ label: 'MERAVIGLIA BOOK', action: actions.book, color: C.pink });
    items.push({ label: 'BACK', action: actions.back, color: C.white });
    this.menu = new Menu(items, 200, 14, 3);
    const m = state.meters;
    this.meters.setText(`COMMOZIONE ${m.commozione}  GRACE ${m.grace}\nSUPERVILLAIN ${m.supervillain}  COINS ${state.coins}`);
    this.root.addChild(this.bg, this.title, this.sub, this.meters, this.menu.root);
  }

  resize(w: number, h: number): void {
    this.bg.clear().rect(0, 0, w, h).fill(0x140a24);
    for (let k = 0; k < 40; k++) this.bg.rect((k * 53) % w, (k * 97) % h, 1, 1).fill({ color: 0xffffff, alpha: 0.5 });
    this.title.position.set(Math.round(w / 2), 10);
    this.sub.position.set(Math.round(w / 2), 22);
    this.meters.position.set(Math.round(w / 2), 34);
    this.menu.layout(w / 2, 58);
  }

  update(dt: number): void {
    this.time += dt;
    if (this.time > 0.3) this.menu.update(dt, this.game.input);
  }
}

/** One level's sub-levels: replay any finished scene, or go on with the next one. */
export class StoryChapterScene implements Scene {
  readonly root = new Container();
  readonly pausesBelow = true;
  private readonly bg = new Graphics();
  private readonly title: PixelText;
  private readonly note = new PixelText('REPLAYS DO NOT CHANGE THE CAMPAIGN', { color: '#9aa4c0', shadow: '#000000', align: 'center' }).setOrigin(0.5, 0);
  private readonly menu: Menu;
  private time = 0;

  constructor(
    private readonly game: Game,
    state: CampaignState,
    ch: ChapterDef,
    private readonly actions: { play: (sub: SubLevelDef) => void; back: () => void },
  ) {
    this.title = new PixelText(`LEVEL ${ch.number}\n${ch.title.toUpperCase()}`, { color: C.yellow, outline: '#120818', glow: 'self', glowAlpha: 0.3, align: 'center', lineGap: 4 }).setOrigin(0.5, 0);
    const firstOpen = ch.subLevels.findIndex((s) => !state.completed.includes(s.id));
    const items: MenuItem[] = ch.subLevels.map((sub, k) => {
      const done = state.completed.includes(sub.id);
      const open = done || k === firstOpen;
      // Fit the 200-px row: cut at a word boundary and mark the cut.
      let label = `${sub.id} ${sub.title.toUpperCase()}`;
      if (label.length > 24) {
        const cut = label.slice(0, 22);
        label = (label[22] === ' ' ? cut : cut.replace(/\s+\S*$/, '')).trimEnd() + '..';
      }
      return {
        label: open ? label : `${sub.id} ? ? ?`,
        action: () => (open ? actions.play(sub) : this.game.audio.play('empty')),
        color: !open ? '#5a5a6a' : done ? C.cyan : C.yellow,
      };
    });
    items.push({ label: 'BACK', action: actions.back, color: C.white });
    this.menu = new Menu(items, 200, 14, 3);
    this.root.addChild(this.bg, this.title, this.note, this.menu.root);
  }

  resize(w: number, h: number): void {
    this.bg.clear().rect(0, 0, w, h).fill(0x140a24);
    this.title.position.set(Math.round(w / 2), 12);
    this.note.setStyle({ maxWidth: w - 16 });
    this.note.position.set(Math.round(w / 2), 42);
    this.menu.layout(w / 2, 42 + this.note.textHeight + 10);
  }

  /** Android Back: back to the story menu, as Escape does. */
  back(): void {
    this.actions.back();
  }

  update(dt: number): void {
    this.time += dt;
    const input = this.game.input;
    if (input.consume('menu') || input.consume('back')) return this.actions.back();
    if (this.time > 0.3) this.menu.update(dt, input);
  }
}

/** Story pause menu. */
export class StoryPauseScene implements Scene {
  readonly root = new Container();
  readonly pausesBelow = true;
  private readonly dim = new Graphics();
  private readonly box = new Graphics();
  private readonly title = new PixelText('PAUSED', { color: C.yellow, scale: 2, outline: '#120818', glow: 'self', glowAlpha: 0.3 }).setOrigin(0.5);
  private readonly menu: Menu;

  constructor(
    private readonly game: Game,
    private readonly actions: {
      resume: () => void;
      restart: () => void;
      book: () => void;
      sound: () => void;
      muted: () => boolean;
      textSpeed: () => void;
      textSpeedLabel: () => string;
      controls: () => void;
      skip: () => void;
      menu: () => void;
    },
  ) {
    this.menu = new Menu(
      [
        { label: 'RESUME', action: actions.resume, color: C.green },
        { label: 'RESTART SCENE', action: actions.restart, color: C.yellow },
        { label: 'SKIP SCENE', action: actions.skip, color: '#9aa4c0' },
        { label: 'MERAVIGLIA BOOK', action: actions.book, color: C.pink },
        {
          label: () => (actions.muted() ? 'SOUND: OFF' : 'SOUND: ON'),
          action: () => {
            actions.sound();
            this.menu.refreshLabels();
          },
          color: C.cyan,
        },
        {
          label: () => `TEXT: ${actions.textSpeedLabel()}`,
          action: () => {
            actions.textSpeed();
            this.menu.refreshLabels();
          },
          color: C.cyan,
        },
        { label: 'CONTROLS', action: actions.controls, color: C.green },
        { label: 'QUIT TO TITLE', action: actions.menu, color: C.white },
      ],
      140,
      16,
      4,
    );
    this.root.addChild(this.dim, this.box, this.title, this.menu.root);
  }

  resize(w: number, h: number): void {
    this.dim.clear().rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.55 });
    const bh = 36 + this.menu.height + 10;
    const top = Math.round(h / 2 - bh / 2);
    this.box.clear();
    retroBox(this.box, Math.round(w / 2 - 80), top, 160, bh, C.red, C.yellow, 0.65);
    this.title.position.set(Math.round(w / 2), top + 16);
    this.menu.layout(w / 2, top + 32);
  }

  /** Android Back: RESUME. */
  back(): void {
    this.actions.resume();
  }

  update(dt: number): void {
    const input = this.game.input;
    if (input.consume('menu') || input.consume('back')) {
      this.actions.resume();
      return;
    }
    this.menu.update(dt, input);
  }
}

/** The Meraviglia book: meters, values, marvels, things brought home, remembered lines. */
interface BookRow {
  text: string;
  head?: boolean;
  icon?: SpriteKey;
}

export class BookScene implements Scene {
  readonly root = new Container();
  readonly pausesBelow = true;
  private readonly bg = new Graphics();
  private readonly title = new PixelText('MERAVIGLIA', { color: C.yellow, scale: 2, outline: '#3a2410', glow: 'self', glowAlpha: 0.25 }).setOrigin(0.5, 0);
  private readonly pageRoot = new Container();
  private readonly foot = new PixelText('', { color: '#6a4a20' }).setOrigin(0.5, 0);
  private rows: BookRow[] = [];
  private pages: BookRow[][] = [];
  /** One text per row, built once per layout and reused for paging and drawing. */
  private texts = new Map<BookRow, PixelText>();
  private page = 0;
  private w = 216;
  private h = 400;
  private time = 0;

  constructor(
    private readonly game: Game,
    private readonly state: CampaignState,
    private readonly onClose: () => void,
  ) {
    this.root.addChild(this.bg, this.title, this.pageRoot, this.foot);
  }

  private build(): void {
    const s = this.state;
    const rows: BookRow[] = [];
    const section = (head: string, list: string[], icon: SpriteKey, empty = 'NONE YET', fmt = (v: string) => v.toUpperCase()) => {
      rows.push({ text: head, head: true });
      if (!list.length) rows.push({ text: empty });
      for (const v of list) rows.push({ text: fmt(v), icon });
      rows.push({ text: '' });
    };
    rows.push({ text: 'THE METERS', head: true });
    rows.push({ text: `COMMOZIONE ${s.meters.commozione}`, icon: 'tear' });
    rows.push({ text: `SUPERVILLAIN ${s.meters.supervillain}${s.meters.supervillain >= 100 ? ' (FULL)' : ''}`, icon: 'tri' });
    rows.push({ text: `GRACE ${s.meters.grace}`, icon: 'cross' });
    rows.push({ text: `STANDING ${s.meters.standing}`, icon: 'coin' });
    rows.push({ text: '' });
    section('AT HOME (BROUGHT BACK)', s.book.items, 'relic', 'NOTHING YET');
    section('MARVELS SEEN', s.book.marvels, 'sparkle');
    section('VALUES LEARNED', s.book.values, 'cross');
    section('SCRAPS OF THE LECTURE', s.book.shards, 'shard');
    section('REMEMBERED (IT MADE NO SENSE)', s.book.remembered, 'thought', 'NOTHING YET', (v) => `"${v.toUpperCase()}"`);
    this.rows = rows;
  }

  /** Splits rows into pages by their real (wrapped) height. */
  private paginate(): void {
    this.pages = [];
    const avail = this.h - 70;
    let cur: BookRow[] = [];
    let used = 0;
    for (const r of this.rows) {
      const hgt = this.rowHeight(r);
      if (used + hgt > avail && cur.length) {
        // Never leave a heading alone at the bottom of a page.
        const carry = cur[cur.length - 1]!.head ? [cur.pop()!] : [];
        this.pages.push(cur);
        cur = carry;
        used = carry.reduce((a, c) => a + this.rowHeight(c), 0);
        if (!r.text) continue;
      }
      cur.push(r);
      used += hgt;
    }
    if (cur.length) this.pages.push(cur);
    this.page = Math.min(this.page, this.pages.length - 1);
  }

  private textFor(r: BookRow): PixelText {
    let t = this.texts.get(r);
    if (!t) {
      t = new PixelText(r.text, { color: r.head ? '#8a2a10' : '#3a2410', maxWidth: this.w - (r.icon ? 40 : 24), lineGap: 2 });
      this.texts.set(r, t);
    }
    return t;
  }

  private rowHeight(r: BookRow): number {
    if (!r.text) return 6;
    return Math.max(r.icon ? 12 : 0, this.textFor(r).textHeight) + 4;
  }

  exit(): void {
    this.clearTexts();
  }

  private clearTexts(): void {
    this.pageRoot.removeChildren();
    for (const t of this.texts.values()) t.destroy();
    this.texts.clear();
  }

  private show(): void {
    // Texts are owned by `texts`; icons are made per page.
    for (const c of this.pageRoot.removeChildren()) if (!(c instanceof PixelText)) c.destroy();
    let y = 40;
    for (const r of this.pages[this.page] ?? []) {
      if (!r.text) {
        y += 6;
        continue;
      }
      const t = this.textFor(r);
      let x = 12;
      if (r.icon) {
        const icon = new Sprite(textures.get(spriteName(r.icon)));
        icon.anchor.set(0.5);
        icon.position.set(18, y + 4);
        this.pageRoot.addChild(icon);
        x = 28;
      }
      t.position.set(x, y);
      this.pageRoot.addChild(t);
      y += this.rowHeight(r);
    }
    this.foot.setText(`PAGE ${this.page + 1}/${this.pages.length}  TAP: NEXT`);
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.bg.clear().rect(0, 0, w, h).fill(0x1a0e06);
    this.bg.rect(4, 4, w - 8, h - 8).fill(0xf0dcb0);
    this.bg.rect(4, 4, w - 8, 2).fill(0xc8a060);
    this.title.position.set(Math.round(w / 2), 10);
    this.foot.position.set(Math.round(w / 2), h - 18);
    this.clearTexts();
    this.build();
    this.paginate();
    this.show();
  }

  /** Android Back: closes the book. */
  back(): void {
    this.onClose();
  }

  update(dt: number): void {
    this.time += dt;
    const input = this.game.input;
    if (input.consume('menu') || input.consume('back')) {
      this.onClose();
      return;
    }
    const tap = input.consumeTaps().length > 0 || input.consume('confirm') || input.consume('down') || input.consume('right');
    if (this.time > 0.3 && tap) {
      if (this.page < this.pages.length - 1) {
        this.page++;
        this.show();
        this.game.audio.play('click');
      } else this.onClose();
    }
  }
}
