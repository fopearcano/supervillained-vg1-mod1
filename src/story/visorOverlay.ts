import { Graphics } from 'pixi.js';
import { STORY } from '../config';
import { visorSlit, type Slit, type SlitShape } from './visorSlit';

/** What has slid over his eyes: 1.1's sand bucket or 2.1's great helm. */
export type VisorStyle = 'bucket' | 'helmet';

/**
 * Colours of the bands: the inside of the red plastic bucket (its colour darkened, a lighter
 * ribbed rim along the slit) or the helm's dark steel (a bevel and a row of rivets).
 */
const COLORS: Record<VisorStyle, { band: number; shade: number; rim: number; rib: number; edge: number }> = {
  bucket: { band: 0x3c0c12, shade: 0x56141c, rim: 0xc8303a, rib: 0x8c1822, edge: 0xff8a78 },
  helmet: { band: 0x14161c, shade: 0x1e222a, rim: 0x3a404c, rib: 0x8a94a8, edge: 0x8a94a8 },
};
/** Rim height, the shaded strip behind it, rib spacing (px). */
const RIM = 4;
const SHADE = 6;
const RIB_EVERY = 6;
const RIVET_EVERY = 18;

/**
 * The visor overlay: two bands that close in toward Zampanò, leaving a slit centred on him
 * (story/visorSlit.ts). The Graphics is redrawn only when the slit, the view or the style changes.
 */
export class VisorOverlay {
  readonly g = new Graphics();
  private readonly slit: Slit = { top: 0, bottom: 0 };
  private readonly shape: SlitShape = {
    cover: STORY.VISOR_SLIT.COVER,
    focus: STORY.VISOR_SLIT.FOCUS,
    above: STORY.VISOR_SLIT.ABOVE,
    below: STORY.VISOR_SLIT.BELOW,
  };
  private drawnTop = 0;
  private drawnBottom = 0;
  private drawnW = 0;
  private drawnH = 0;
  private drawnStyle: VisorStyle | null = null;

  /** `playerY`: his feet on the screen (uiLayer px); `visor` 0..STORY.VISOR.MAX. */
  update(w: number, h: number, playerY: number, visor: number, style: VisorStyle): void {
    const s = visorSlit(h, playerY, visor > 0.01 ? visor : 0, STORY.VISOR.MAX, this.shape, this.slit);
    const empty = s.top <= 0 && s.bottom >= h;
    if (empty && this.drawnStyle === null) return;
    if (!empty && s.top === this.drawnTop && s.bottom === this.drawnBottom && w === this.drawnW && h === this.drawnH && style === this.drawnStyle) return;
    this.g.clear();
    if (empty) {
      this.drawnStyle = null;
      return;
    }
    this.drawnTop = s.top;
    this.drawnBottom = s.bottom;
    this.drawnW = w;
    this.drawnH = h;
    this.drawnStyle = style;
    this.band(w, 0, s.top, style, true);
    this.band(w, s.bottom, h, style, false);
  }

  /** One band from y0 to y1; its rim is on the slit's side (the bottom of the top band). */
  private band(w: number, y0: number, y1: number, style: VisorStyle, top: boolean): void {
    const g = this.g;
    const c = COLORS[style];
    const hgt = y1 - y0;
    if (hgt <= 0) return;
    g.rect(0, y0, w, hgt).fill({ color: c.band });
    // y of the rim's slit-side row, and the direction away from the slit.
    const edgeY = top ? y1 - 1 : y0;
    const away = top ? -1 : 1;
    const rimH = Math.min(RIM, hgt);
    const rimY = top ? y1 - rimH : y0;
    const shadeH = Math.min(SHADE, hgt - rimH);
    if (shadeH > 0) g.rect(0, top ? rimY - shadeH : y0 + rimH, w, shadeH).fill({ color: c.shade });
    if (style === 'bucket') {
      // The rolled plastic rim, ribbed, its lit edge along the slit.
      g.rect(0, rimY, w, rimH).fill({ color: c.rim });
      for (let x = 2; x < w; x += RIB_EVERY) g.rect(x, rimY, 2, rimH).fill({ color: c.rib });
      g.rect(0, edgeY, w, 1).fill({ color: c.edge });
    } else {
      // A bevel on the steel's edge, and a row of rivets behind it.
      g.rect(0, rimY, w, rimH).fill({ color: c.rim });
      g.rect(0, edgeY, w, 1).fill({ color: c.edge });
      if (rimH > 2) g.rect(0, edgeY + away, w, 1).fill({ color: c.edge });
      const ry = edgeY + away * (RIM + 3);
      if (top ? ry - 1 >= y0 : ry + 2 <= y1) {
        for (let x = RIVET_EVERY / 2; x < w; x += RIVET_EVERY) g.rect(x, top ? ry - 1 : ry, 2, 2).fill({ color: c.rib });
      }
    }
  }
}
