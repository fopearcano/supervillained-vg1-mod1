import { Container, Graphics } from 'pixi.js';
import { GLOSSARY as G } from '../config';
import type { Game } from '../core/game';
import type { Scene } from '../core/scene';
import { drawCardButton, drawPaperCard, FADED, INK } from '../ui/card';
import { PixelText } from '../ui/pixelText';
import { C, hex } from '../ui/retro';
import {
  COMPACT_BUTTON_GAP,
  COUNTER_GAP,
  COUNTER_H,
  fitCard,
  GLOSSARY_PAGES,
  layoutPage,
  sectionStart,
  type GlossaryItem,
  type GlossaryTextStyle,
} from './glossaryEntries';

const RING = 0xd42030;
const VIOLET_INK = '#5b2bc4';

/**
 * GLOSSARY (title page): a floating paper card, a dictionary of the game's words turned page by
 * page (glossaryEntries.ts): "supervillain, supervillained" first, then the crusade's words after
 * Barbero, then the words about bullying. On each page the sense the game is about is circled in
 * red by hand: the ring draws itself when the page opens. Pages turn with < and > (taps, left and
 * right keys); up and down jump to the previous or next section. The card keeps the size of the
 * tallest page, so the buttons never move; in a short view (a desktop window) it goes compact, and
 * at worst cuts the text, never the buttons (glossaryEntries.ts fitCard). Closes with CLOSE, a tap
 * outside the card, a continue key (Enter, Space, J) or back.
 */
export class GlossaryScene implements Scene {
  readonly root = new Container();
  /** The title keeps animating behind the card (it ignores input while covered). */
  readonly pausesBelow = false;
  private readonly dim = new Graphics();
  private readonly card = new Graphics();
  private readonly body = new Container();
  /** The text area: the page and its ring (masked when the view is too short for the page). */
  private readonly textArea = new Container();
  private readonly textMask = new Graphics();
  /** The current page's text (rebuilt when the page turns). */
  private readonly pageLayer = new Container();
  private readonly ring = new Graphics();
  private readonly counter = new PixelText('', { color: FADED });
  private readonly closeBox = new Graphics();
  private readonly closeText = new PixelText('CLOSE', { color: VIOLET_INK });
  private readonly prevBox = new Graphics();
  private readonly prevText = new PixelText('<', { color: VIOLET_INK });
  private readonly nextBox = new Graphics();
  private readonly nextText = new PixelText('>', { color: VIOLET_INK });
  private closeRect = { x: 0, y: 0, w: 0, h: 0 };
  private prevRect = { x: 0, y: 0, w: 0, h: 0 };
  private nextRect = { x: 0, y: 0, w: 0, h: 0 };
  private cardRect = { x: 0, y: 0, w: 0, h: 0 };
  private w = 216;
  private h = 400;
  private inner = 180;
  private compact = false;
  private time = 0;
  /** Seconds since the page opened (its ring draws itself). */
  private pageTime = 0;
  private page = 0;
  /** Points of the hand-drawn ring around the circled sense, in order (drawn progressively). */
  private ringPts: Array<[number, number]> = [];

  constructor(
    private readonly game: Game,
    private readonly onClose: () => void,
  ) {
    this.textArea.addChild(this.pageLayer, this.ring);
    this.body.addChild(this.textArea, this.textMask, this.counter, this.prevBox, this.prevText, this.closeBox, this.closeText, this.nextBox, this.nextText);
    this.root.addChild(this.dim, this.card, this.body);
  }

  /** The page shown (0 = "supervillain"; read by the smoke checks). */
  get pageIndex(): number {
    return this.page;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.dim.clear().rect(0, 0, w, h).fill({ color: 0x000000, alpha: G.DIM });
    this.layout();
  }

  private layout(): void {
    const { w, h } = this;
    const fit = fitCard(w, h);
    const { cw, pad: PAD, textH, cardH } = fit;
    this.inner = fit.inner;
    this.compact = fit.compact;
    // Cut the text, never the buttons, when even the compact card is too tall (a mask a little
    // wider than the text, for the ring).
    this.textMask.clear();
    this.textArea.mask = null;
    if (fit.clipped) {
      this.textMask.rect(-PAD, -PAD, this.inner + PAD * 2, textH + PAD).fill({ color: 0xffffff });
      this.textArea.mask = this.textMask;
    }
    const cx = Math.round((w - cw) / 2);
    const cy = Math.max(4, Math.round((h - cardH) / 2));
    this.cardRect = { x: cx, y: cy, w: cw, h: cardH };
    this.body.position.set(cx + PAD, cy + PAD);
    // The card: paper with a shadow and a violet double frame.
    drawPaperCard(this.card, cx, cy, cw, cardH, C.violet, VIOLET_INK);
    // The counter (not when compact) and the buttons, under the tallest page: < at the left,
    // CLOSE centred, > at the right.
    this.counter.y = textH;
    this.counter.visible = !this.compact;
    const by = textH + (this.compact ? COMPACT_BUTTON_GAP : COUNTER_H + COUNTER_GAP);
    const button = (g: Graphics, label: PixelText, x: number | 'center' | 'right') => {
      const bw = Math.round(label.textWidth) + 16;
      const bx = x === 'center' ? Math.round((this.inner - bw) / 2) : x === 'right' ? this.inner - bw : x;
      const { h: bh } = drawCardButton(g, label, bx, by, C.violet, VIOLET_INK);
      return { x: cx + PAD + bx, y: cy + PAD + by, w: bw, h: bh };
    };
    this.prevRect = button(this.prevBox, this.prevText, 0);
    this.closeRect = button(this.closeBox, this.closeText, 'center');
    this.nextRect = button(this.nextBox, this.nextText, 'right');
    this.show(this.page, false);
  }

  /** Builds page `k` (and restarts its ring unless only the layout changed). */
  private show(k: number, fresh = true): void {
    this.page = k;
    if (fresh) this.pageTime = 0;
    for (const old of this.pageLayer.removeChildren()) old.destroy({ children: true });
    const layout = layoutPage(k, this.inner, this.compact);
    this.ringPts = [];
    for (const item of layout.items) this.place(item);
    this.counter.setText(`${k + 1}/${GLOSSARY_PAGES.length}`);
    this.counter.x = Math.round((this.inner - this.counter.textWidth) / 2);
    this.drawRing();
  }

  private place(item: GlossaryItem): void {
    if (item.kind === 'rule') {
      const g = new Graphics().rect(item.x, item.y, item.w, 1).fill({ color: hex(INK) });
      this.pageLayer.addChild(g);
      return;
    }
    if (item.kind === 'ring') {
      // A slightly wobbly ring (an ellipse, or squarer around a block of lines) whose end overshoots its start.
      const steps = 64;
      const e = 2 / item.n;
      for (let k = 0; k <= steps + G.RING_OVERSHOOT; k++) {
        const a = -Math.PI * 0.9 + (k / steps) * Math.PI * 2;
        const wob = 1 + 0.035 * Math.sin(a * 3 + 0.6) + (k / steps) * 0.05;
        const c = Math.cos(a);
        const s = Math.sin(a);
        this.ringPts.push([
          item.cx + Math.sign(c) * Math.abs(c) ** e * item.rx * wob,
          item.cy + Math.sign(s) * Math.abs(s) ** e * item.ry * wob - (k / steps) * 2,
        ]);
      }
      return;
    }
    const o = this.text(item.style, item.lines.join('\n'), item.gap);
    o.position.set(item.x, item.y);
    this.pageLayer.addChild(o);
  }

  /** A piece of text in its style; the circled text and the section title are centred line by line. */
  private text(style: GlossaryTextStyle, s: string, lineGap: number): Container {
    const bold = (color: string, scale = 1) => {
      const c = new Container();
      for (const dx of [0, 1]) c.addChild(new PixelText(s, { color, scale, lineGap })).x = dx;
      return c;
    };
    switch (style) {
      case 'heading':
        return bold(VIOLET_INK, 2);
      case 'head':
      case 'label':
        return bold(INK);
      case 'labelFaded':
        return bold(FADED);
      case 'section':
        return new PixelText(s, { color: FADED, lineGap, align: 'center' });
      case 'ringed':
        return new PixelText(s, { color: INK, lineGap, align: 'center' });
      case 'faded':
      case 'small':
        return new PixelText(s, { color: FADED, lineGap });
      default:
        return new PixelText(s, { color: INK, lineGap });
    }
  }

  /** Draws as much of the ring as the page's opening animation has reached. */
  private drawRing(): void {
    const g = this.ring.clear();
    const p = Math.min(1, Math.max(0, (this.pageTime - G.RING_DELAY) / G.RING_TIME));
    const n = Math.floor(p * (this.ringPts.length - 1));
    if (n < 1) return;
    for (const [ox, oy, alpha] of [
      [0, 0, 1],
      [0.6, 0.5, 0.55],
    ] as const) {
      g.moveTo(this.ringPts[0]![0] + ox, this.ringPts[0]![1] + oy);
      for (let k = 1; k <= n; k++) g.lineTo(this.ringPts[k]![0] + ox, this.ringPts[k]![1] + oy);
      g.stroke({ width: 1.5, color: RING, alpha });
    }
  }

  /** Turns to page `k` (any whole number: the pages go round). */
  private turn(k: number): void {
    const n = GLOSSARY_PAGES.length;
    const next = ((k % n) + n) % n;
    if (next === this.page) return;
    this.game.audio.play('click');
    this.show(next);
  }

  /** Android Back: closes the card, as Escape does. */
  back(): void {
    this.close();
  }

  update(dt: number): void {
    this.time += dt;
    this.pageTime += dt;
    if (this.pageTime < G.RING_DELAY + G.RING_TIME + dt * 2) this.drawRing();
    const input = this.game.input;
    if (input.consume('back')) return this.close();
    if (this.time < 0.25) return;
    if (input.consumeContinue()) return this.close();
    if (input.consume('left')) this.turn(this.page - 1);
    if (input.consume('right')) this.turn(this.page + 1);
    if (input.consume('up')) this.turn(sectionStart(this.page, -1));
    if (input.consume('down')) this.turn(sectionStart(this.page, 1));
    // < and >, CLOSE, or a tap outside the card.
    const r = this.cardRect;
    const hit = (b: { x: number; y: number; w: number; h: number }, t: { x: number; y: number }) =>
      t.x >= b.x - 6 && t.x <= b.x + b.w + 6 && t.y >= b.y - 5 && t.y <= b.y + b.h + 5;
    for (const t of input.consumeTaps()) {
      const outside = t.x < r.x || t.x > r.x + r.w || t.y < r.y || t.y > r.y + r.h;
      if (outside || hit(this.closeRect, t)) return this.close();
      if (hit(this.prevRect, t)) this.turn(this.page - 1);
      else if (hit(this.nextRect, t)) this.turn(this.page + 1);
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
