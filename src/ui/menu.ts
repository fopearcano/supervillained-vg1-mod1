import { Container, Graphics } from 'pixi.js';
import type { Input } from '../core/input';
import { PixelText } from './pixelText';
import { C, frameRect, hex } from './retro';

export interface MenuItem {
  label: string | (() => string);
  action: () => void;
  color?: string;
}

interface Row {
  item: MenuItem;
  box: Graphics;
  text: PixelText;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Vertical list of retro buttons. Works with taps (hit test on release) and with the keyboard
 * (up/down + Enter/Space/J/X: Input.consumeContinue).
 */
export class Menu {
  readonly root = new Container();
  private readonly rows: Row[] = [];
  selected = 0;
  private time = 0;
  /** Keyboard navigation is active (shows the selection marker). */
  private keyboard = false;

  constructor(
    items: MenuItem[],
    private readonly width = 120,
    private readonly itemH = 18,
    private readonly gap = 6,
  ) {
    for (const item of items) {
      const box = new Graphics();
      const text = new PixelText(label(item), { color: item.color ?? C.yellow, shadow: '#120818' }).setOrigin(0.5, 0.5);
      this.root.addChild(box, text);
      this.rows.push({ item, box, text, x: 0, y: 0, w: this.width, h: this.itemH });
    }
  }

  /** Number of buttons. */
  get count(): number {
    return this.rows.length;
  }

  /** A button's rectangle (after layout). */
  rowRect(i: number): { x: number; y: number; w: number; h: number } {
    const r = this.rows[i]!;
    return { x: r.x, y: r.y, w: r.w, h: r.h };
  }

  get height(): number {
    return this.rows.length * this.itemH + Math.max(0, this.rows.length - 1) * this.gap;
  }

  /** Places the menu with its top-center at (cx, top). */
  layout(cx: number, top: number): void {
    this.rows.forEach((r, k) => {
      r.x = Math.round(cx - this.width / 2);
      r.y = Math.round(top + k * (this.itemH + this.gap));
      r.text.position.set(Math.round(cx), Math.round(r.y + this.itemH / 2));
    });
    this.redraw();
  }

  refreshLabels(): void {
    for (const r of this.rows) r.text.setText(label(r.item));
  }

  update(dt: number, input: Input): void {
    this.time += dt;
    if (input.consume('up')) {
      this.keyboard = true;
      this.selected = (this.selected + this.rows.length - 1) % this.rows.length;
    }
    if (input.consume('down')) {
      this.keyboard = true;
      this.selected = (this.selected + 1) % this.rows.length;
    }
    if (input.consumeContinue()) {
      this.rows[this.selected]?.item.action();
      return;
    }
    for (const tap of input.consumeTaps()) {
      const hit = this.rows.findIndex((r) => tap.x >= r.x - 4 && tap.x <= r.x + r.w + 4 && tap.y >= r.y - 3 && tap.y <= r.y + r.h + 3);
      if (hit >= 0) {
        this.selected = hit;
        this.redraw();
        this.rows[hit]!.item.action();
        return;
      }
    }
    this.redraw();
  }

  private redraw(): void {
    const blink = Math.floor(this.time * 4) % 2 === 0;
    this.rows.forEach((r, k) => {
      const sel = this.keyboard && k === this.selected;
      const g = r.box;
      g.clear();
      g.rect(r.x, r.y, r.w, r.h).fill({ color: sel ? 0x3a1050 : 0x000000, alpha: sel ? 0.75 : 0.55 });
      frameRect(g, r.x, r.y, r.w, r.h, hex(C.red));
      frameRect(g, r.x + 1, r.y + 1, r.w - 1, r.h - 1, hex(sel && blink ? C.white : C.yellow), 0.9);
    });
  }
}

function label(item: MenuItem): string {
  return typeof item.label === 'function' ? item.label() : item.label;
}
