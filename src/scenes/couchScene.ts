import { Container, Graphics } from 'pixi.js';
import { CHAPTERS } from '../campaign/chapters';
import { loadCampaign, type MeterKey } from '../campaign/state';
import { formatPlayTime, formatSavedAt, progressSummary, type ProgressSummary } from '../campaign/summary';
import { COUCH as K } from '../config';
import type { Game } from '../core/game';
import type { Scene } from '../core/scene';
import { bestFor, type LevelRecord } from '../core/settings';
import { LEVELS } from '../levels';
import { formatScore, formatTime } from '../systems/scoring';
import { bold, drawCardButton, drawPaperCard, FADED, INK, textH, textW } from '../ui/card';
import { PixelText } from '../ui/pixelText';
import { C, frameRect, hex } from '../ui/retro';

const ORANGE_INK = '#b85a00';
const METERS: Array<{ key: MeterKey; label: string; color: number }> = [
  { key: 'commozione', label: 'COMMOZIONE', color: 0x3a9ee0 },
  { key: 'supervillain', label: 'SUPERVILLAIN', color: 0xe02030 },
  { key: 'grace', label: 'GRACE', color: 0xe0a800 },
  { key: 'standing', label: 'STANDING', color: 0x2e9e4a },
];
const DONE = 0x2e9e4a;
const PART = 0xff9a1f;

/**
 * COUCH (title page): Zampanò's "account", a floating paper card with everything the saved
 * story holds: the next scene, the scenes done (per level), the ending once it is finished, the
 * four meters, the Meraviglia book, coins, the costume, the Green Zone best, the play time and
 * when it was saved. Read-only; closes with CLOSE, a tap outside it, Enter or back.
 */
export class CouchScene implements Scene {
  readonly root = new Container();
  /** The title keeps animating behind the card (it ignores input while covered). */
  readonly pausesBelow = false;
  private readonly dim = new Graphics();
  private readonly card = new Graphics();
  private readonly body = new Container();
  private readonly gfx = new Graphics();
  private readonly closeBox = new Graphics();
  private readonly closeText = new PixelText('CLOSE', { color: ORANGE_INK });
  private readonly s: ProgressSummary;
  private readonly best: LevelRecord | null;
  private w = 216;
  private h = 400;
  private time = 0;
  private cardRect = { x: 0, y: 0, w: 0, h: 0 };
  private closeRect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(
    private readonly game: Game,
    private readonly onClose: () => void,
  ) {
    this.s = progressSummary(loadCampaign(), CHAPTERS);
    this.best = bestFor(LEVELS[0]!.id);
    this.root.addChild(this.dim, this.card, this.body);
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.dim.clear().rect(0, 0, w, h).fill({ color: 0x000000, alpha: K.DIM });
    this.layout();
  }

  /** Builds the card's contents for this width (cheap: a few dozen small texts). */
  private layout(): void {
    const { w, h, s } = this;
    for (const c of this.body.removeChildren()) if (c !== this.gfx && c !== this.closeBox && c !== this.closeText) c.destroy({ children: true });
    const g = this.gfx.clear();
    this.body.addChild(g);
    const cw = Math.min(w - 12, K.CARD_WIDTH);
    const pad = 10;
    const inner = cw - pad * 2;
    let y = 0;
    const add = <T extends Container>(o: T, x: number, gap: number): T => {
      o.position.set(pad + x, y);
      this.body.addChild(o);
      y += Math.round(textH(o)) + gap;
      return o;
    };
    const text = (t: string, color = INK, maxWidth = 0) => new PixelText(t, { color, maxWidth, lineGap: 3 });
    const right = (t: string, color = INK) => {
      const p = text(t, color);
      p.position.set(pad + inner - Math.round(p.textWidth), y);
      this.body.addChild(p);
    };
    const rule = (gapBefore: number, gapAfter: number) => {
      y += gapBefore;
      g.rect(pad, y, inner, 1).fill({ color: hex(INK), alpha: 0.6 });
      y += 1 + gapAfter;
    };

    const heading = bold('COUCH', ORANGE_INK, 2);
    add(heading, Math.round((inner - textW(heading)) / 2), 5);
    const sub = text(s.started ? "ZAMPANO'S SAVED STORY" : 'NO STORY SAVED YET', FADED);
    add(sub, Math.round((inner - sub.textWidth) / 2), 2);
    rule(4, 6);

    // The story: where Continue goes, or the ending.
    if (s.next) {
      add(bold(s.started ? 'NEXT' : 'FIRST', INK), 0, 3);
      add(text(`LEVEL ${s.next.level}: ${s.next.id} ${s.next.title.toUpperCase()}`, INK, inner - 8), 8, 6);
    } else {
      add(bold('THE STORY IS FINISHED', INK), 0, 3);
      add(text(`ENDING: ${s.ending === 'knight' ? 'THE KNIGHT' : 'THE WITNESS'}`, INK), 8, 6);
    }
    const pct = s.total ? Math.round((s.done * 100) / s.total) : 0;
    add(bold('SCENES', INK), 0, -8);
    right(`${s.done} / ${s.total}  ${pct}%`);
    y += 12;
    // One cell per level, filled with its share of scenes done.
    const gap = 2;
    const cellW = Math.floor((inner - gap * (s.levels.length - 1)) / s.levels.length);
    const cellH = 14;
    const rowX = pad + Math.floor((inner - (cellW * s.levels.length + gap * (s.levels.length - 1))) / 2);
    s.levels.forEach((l, k) => {
      const x = rowX + k * (cellW + gap);
      const f = l.total ? l.done / l.total : 0;
      if (f > 0) {
        const fh = Math.max(1, Math.round((cellH - 2) * f));
        g.rect(x + 1, y + cellH - 1 - fh, cellW - 2, fh).fill({ color: f >= 1 ? DONE : PART, alpha: f >= 1 ? 0.85 : 0.7 });
      }
      frameRect(g, x, y, cellW, cellH, hex(INK), 0.8);
      const n = text(String(l.number), f >= 1 ? '#ffffff' : INK);
      n.position.set(x + Math.round((cellW - n.textWidth) / 2), y + 4);
      this.body.addChild(n);
    });
    y += cellH;
    rule(7, 6);

    // The meters: the label, a bar between it and the value (narrower on narrow screens).
    const labelW = Math.max(...METERS.map((m) => m.label.length)) * 8 + 4;
    const valueW = 30;
    const barW = Math.max(16, Math.min(K.BAR_WIDTH, inner - labelW - valueW));
    for (const m of METERS) {
      const v = Math.round(s.meters[m.key]);
      const label = text(m.label);
      label.position.set(pad, y);
      this.body.addChild(label);
      const bx = pad + inner - valueW - barW;
      g.rect(bx, y + 1, barW, 6).fill({ color: hex(INK), alpha: 0.15 });
      g.rect(bx, y + 1, Math.round((barW * Math.max(0, Math.min(100, v))) / 100), 6).fill({ color: m.color });
      frameRect(g, bx, y + 1, barW, 6, hex(INK), 0.5);
      right(String(v));
      y += 11;
    }
    rule(2, 6);

    // The book and the rest, two columns.
    const half = Math.floor(inner / 2) + 4;
    const pair = (a: [string, string], b: [string, string] | null) => {
      const l1 = text(a[0], FADED);
      l1.position.set(pad, y);
      const v1 = text(a[1]);
      v1.position.set(pad + half - 8 - Math.round(v1.textWidth), y);
      this.body.addChild(l1, v1);
      if (b) {
        const l2 = text(b[0], FADED);
        l2.position.set(pad + half, y);
        this.body.addChild(l2);
        right(b[1]);
      }
      y += 11;
    };
    const row = (label: string, value: string) => {
      add(text(label, FADED), 0, -8);
      right(value);
      y += 11;
    };
    pair(['VALUES', String(s.values)], ['MARVELS', String(s.marvels)]);
    pair(['THINGS', String(s.items)], ['SHARDS', String(s.shards)]);
    pair(['COINS', String(s.coins)], null);
    row('COSTUME', s.costume === 'knight' ? 'ARMOUR' : s.costume === 'cross' ? 'RAG CROSS' : 'NONE');
    y += 2;
    add(bold('GREEN ZONE BEST', INK), 0, 4);
    if (this.best) {
      pair(['SCORE', formatScore(this.best.score)], ['STARS', String(Math.round(this.best.stars))]);
      pair(['TIME', formatTime(this.best.time)], null);
    } else add(text('NOT WALKED YET', FADED), 8, 2);
    rule(3, 6);

    row('PLAY TIME', formatPlayTime(s.playTime));
    row('SAVED', formatSavedAt(s.savedAt));
    y += 3;

    // CLOSE.
    const bx = Math.round((cw - this.closeText.textWidth - 16) / 2);
    const { w: bw, h: bh } = drawCardButton(this.closeBox, this.closeText, bx, y, C.orange, ORANGE_INK);
    this.body.addChild(this.closeBox, this.closeText);
    y += bh;

    const cardH = y + pad * 2;
    const cx = Math.round((w - cw) / 2);
    const cy = Math.max(4, Math.round((h - cardH) / 2));
    this.cardRect = { x: cx, y: cy, w: cw, h: cardH };
    this.closeRect = { x: cx + bx, y: cy + pad + y - bh, w: bw, h: bh };
    this.body.position.set(cx, cy + pad);
    drawPaperCard(this.card, cx, cy, cw, cardH, C.orange, ORANGE_INK);
  }

  /** Android Back: closes the card, as Escape does. */
  back(): void {
    this.close();
  }

  update(dt: number): void {
    this.time += dt;
    const input = this.game.input;
    if (input.consume('back')) return this.close();
    if (this.time < 0.25) return;
    if (input.consume('confirm')) return this.close();
    const r = this.cardRect;
    const c = this.closeRect;
    for (const t of input.consumeTaps()) {
      const outside = t.x < r.x || t.x > r.x + r.w || t.y < r.y || t.y > r.y + r.h;
      const onClose = t.x >= c.x - 6 && t.x <= c.x + c.w + 6 && t.y >= c.y - 5 && t.y <= c.y + c.h + 5;
      if (outside || onClose) return this.close();
    }
  }

  private closed = false;
  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.game.audio.play('click');
    this.onClose();
  }
}
