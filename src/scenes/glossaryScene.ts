import { Container, Graphics } from 'pixi.js';
import { GLOSSARY as G } from '../config';
import type { Game } from '../core/game';
import type { Scene } from '../core/scene';
import { bold, drawCardButton, drawPaperCard, FADED, INK, textH, textW } from '../ui/card';
import { PixelText } from '../ui/pixelText';
import { C, hex } from '../ui/retro';

const RING = 0xd42030;
const VIOLET_INK = '#5b2bc4';

/**
 * GLOSSARY (title page): a floating paper card with the dictionary entry of "supervillain,
 * supervillained". The b) verb, the sense the game is about, is circled in red by hand: the ring
 * draws itself when the card opens. Closes with CLOSE, a tap outside the card, Enter or back.
 */
export class GlossaryScene implements Scene {
  readonly root = new Container();
  /** The title keeps animating behind the card (it ignores input while covered). */
  readonly pausesBelow = false;
  private readonly dim = new Graphics();
  private readonly card = new Graphics();
  private readonly ring = new Graphics();
  private readonly body = new Container();
  private readonly heading = bold('GLOSSARY', VIOLET_INK, 2);
  private readonly headword = bold('SUPERVILLAIN,\nSUPERVILLAINED', INK);
  private readonly rule = new Graphics();
  private readonly ipa = new PixelText('/ˈsuːpərvilən/', { color: INK });
  private readonly nounLabel = bold('A) NOUN,', FADED);
  private readonly noun: PixelText;
  private readonly verbLabel = bold('B) VERB,', INK);
  private readonly verb: PixelText;
  /** CLOSE, at the bottom of the card. */
  private readonly closeBox = new Graphics();
  private readonly closeText = new PixelText('CLOSE', { color: VIOLET_INK });
  private closeRect = { x: 0, y: 0, w: 0, h: 0 };
  private w = 216;
  private h = 400;
  private time = 0;
  private cardRect = { x: 0, y: 0, w: 0, h: 0 };
  /** Points of the hand-drawn ring around the verb, in order (drawn progressively). */
  private ringPts: Array<[number, number]> = [];

  constructor(
    private readonly game: Game,
    private readonly onClose: () => void,
  ) {
    this.noun = new PixelText('A FICTIONAL VILLAIN HAVING EXTRAORDINARY OR SUPERHUMAN POWERS', { color: FADED, lineGap: 3 });
    this.verb = new PixelText('TO GROW UP STRONG;\nTO GET CHARACTER', { color: INK, lineGap: 4 });
    this.body.addChild(
      this.heading,
      this.headword,
      this.rule,
      this.ipa,
      this.nounLabel,
      this.noun,
      this.verbLabel,
      this.verb,
      this.ring,
      this.closeBox,
      this.closeText,
    );
    this.root.addChild(this.dim, this.card, this.body);
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.dim.clear().rect(0, 0, w, h).fill({ color: 0x000000, alpha: G.DIM });
    this.layout();
  }

  private layout(): void {
    const { w, h } = this;
    const cw = Math.min(w - 16, G.CARD_WIDTH);
    const pad = 10;
    const inner = cw - pad * 2;
    this.noun.setStyle({ maxWidth: inner - 8 });
    // Stack the entry from y = 0, then center the card.
    let y = 0;
    const place = (o: Container, dx: number, gap: number) => {
      o.position.set(pad + dx, y);
      y += Math.round(textH(o)) + gap;
    };
    place(this.heading, Math.round((inner - textW(this.heading)) / 2), 12);
    place(this.headword, 0, 3);
    this.rule.clear().rect(pad, y, inner, 1).fill({ color: hex(INK) });
    y += 5;
    place(this.ipa, 0, 10);
    place(this.nounLabel, 0, 4);
    place(this.noun, 8, 11);
    place(this.verbLabel, 0, 10);
    // The verb, centered in the ring.
    const vx = Math.round((inner - this.verb.textWidth) / 2);
    place(this.verb, vx, 14);
    // CLOSE: a small framed button, centered.
    const bx = Math.round((cw - this.closeText.textWidth - 16) / 2);
    const { w: bw, h: bh } = drawCardButton(this.closeBox, this.closeText, bx, y, C.violet, VIOLET_INK);
    y += bh;
    const cardH = y + pad * 2;
    const cx = Math.round((w - cw) / 2);
    const cy = Math.max(8, Math.round((h - cardH) / 2));
    this.closeRect = { x: cx + bx, y: cy + pad + y - bh, w: bw, h: bh };
    this.cardRect = { x: cx, y: cy, w: cw, h: cardH };
    this.body.position.set(cx, cy + pad);

    // The card: paper with a shadow and a violet double frame.
    drawPaperCard(this.card, cx, cy, cw, cardH, C.violet, VIOLET_INK);

    // The ring around the verb: a slightly wobbly ellipse whose end overshoots its start.
    const ex = pad + vx + this.verb.textWidth / 2;
    const ey = this.verb.y + this.verb.textHeight / 2;
    const rx = this.verb.textWidth / 2 + G.RING_PAD_X;
    const ry = this.verb.textHeight / 2 + G.RING_PAD_Y;
    this.ringPts = [];
    const steps = 64;
    for (let k = 0; k <= steps + G.RING_OVERSHOOT; k++) {
      const a = -Math.PI * 0.9 + (k / steps) * Math.PI * 2;
      const wob = 1 + 0.035 * Math.sin(a * 3 + 0.6) + (k / steps) * 0.05;
      this.ringPts.push([ex + Math.cos(a) * rx * wob, ey + Math.sin(a) * ry * wob - (k / steps) * 2]);
    }
    this.drawRing();
  }

  /** Draws as much of the ring as the opening animation has reached. */
  private drawRing(): void {
    const g = this.ring.clear();
    const p = Math.min(1, Math.max(0, (this.time - G.RING_DELAY) / G.RING_TIME));
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

  /** Android Back: closes the card, as Escape does. */
  back(): void {
    this.close();
  }

  update(dt: number): void {
    this.time += dt;
    if (this.time < G.RING_DELAY + G.RING_TIME + 0.1) this.drawRing();
    const input = this.game.input;
    if (input.consume('back')) return this.close();
    if (this.time < 0.25) return;
    if (input.consume('confirm')) return this.close();
    // CLOSE, or a tap outside the card.
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
