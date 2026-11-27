/**
 * The slit left between the two bands of the visor overlay (1.1's bucket, 2.1's great helm), in
 * screen px. Pure (tested in tests/visorSlit.test.ts).
 *
 * The bands close in from the top and bottom edges toward his head, each in proportion to its
 * distance from it, so together they cover `cover × visor` of the view (the old full-width bands'
 * share). The slit always keeps the dog in view: from `above` px over his feet (his head and what
 * is on it) down to `below` px under them, whatever the view's height and wherever he is in it.
 */

export interface SlitShape {
  /** Share of the view the two bands cover together per unit of visor (0.5 + 0.41 before). */
  cover: number;
  /** Px above his feet the bands close toward (his head, inside the bucket). */
  focus: number;
  /** Px above his feet that always stay in view (the dog and the gear on his head, a margin). */
  above: number;
  /** Px below his feet that always stay in view (his shadow, a margin). */
  below: number;
}

export interface Slit {
  /** Lower edge of the top band (0 = no top band). */
  top: number;
  /** Upper edge of the bottom band (viewH = no bottom band). */
  bottom: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * `viewH`: the view's height; `playerY`: his feet on the screen (may lie outside the view);
 * `visor` in 0..`max` (more is taken as `max`). Writes into `out` when given (no allocation).
 */
export function visorSlit(viewH: number, playerY: number, visor: number, max: number, shape: SlitShape, out: Slit = { top: 0, bottom: 0 }): Slit {
  const v = clamp(visor, 0, max);
  if (v <= 0 || viewH <= 0) {
    out.top = 0;
    out.bottom = Math.max(0, viewH);
    return out;
  }
  const t = clamp(v * shape.cover, 0, 1);
  const focus = clamp(playerY - shape.focus, 0, viewH);
  // Never over him: the bands stop where the protected strip begins.
  let top = Math.min(focus * t, playerY - shape.above);
  let bottom = Math.max(viewH - (viewH - focus) * t, playerY + shape.below);
  top = clamp(Math.floor(top), 0, viewH);
  bottom = clamp(Math.ceil(bottom), top, viewH);
  out.top = top;
  out.bottom = bottom;
  return out;
}
