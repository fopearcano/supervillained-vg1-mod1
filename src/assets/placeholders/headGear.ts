import { PixelBuffer, rgba } from './pixel';

/**
 * What Zampanò wears on his head in 1.1 and 2.1 (story/headGear.ts), seen from the front and a
 * little above, upside down for the bucket. Both are drawn about his head's width and wider, so
 * they read next to the 32 px dogs; both lit from the upper left like the cast.
 */

/** Side shading across a round body: u = -1 (left edge) .. 1 (right edge), lit from the left. */
function shade(u: number, edge: number, lit: number, base: number, mid: number, dark: number): number {
  if (u < -0.62) return edge;
  if (u < -0.38) return lit;
  if (u < 0.45) return base;
  if (u < 0.78) return mid;
  return dark;
}

/**
 * A child's plastic sand bucket, upside down (20 x 17): bright red, a yellow star sticker, the
 * rolled rim at the bottom and the yellow handle hanging just under it.
 */
export function drawSandBucket(): PixelBuffer {
  const pb = new PixelBuffer(20, 17);
  const light = rgba('#ff7a6a');
  const red = rgba('#e2323c');
  const mid = rgba('#c0242e');
  const dark = rgba('#8c1822');
  const cx = 10;
  // The body tapers from the rim (bottom, 14 px wide) to the bucket's base (top, 9 px).
  for (let y = 2; y <= 10; y++) {
    const hw = 4.5 + ((y - 2) * 2.5) / 8;
    for (let x = 0; x < 20; x++) {
      const u = (x + 0.5 - cx) / hw;
      if (Math.abs(u) <= 1) pb.set(x, y, shade(u, red, light, red, mid, dark));
    }
  }
  // The base, now on top: a flat disc seen from above, its far edge darker.
  pb.ellipse(cx, 2.4, 4.6, 1.7, mid);
  pb.ellipse(cx, 2.1, 3.6, 1.1, rgba('#f4544c'));
  pb.rect(8, 1, 2, 1, light);
  // The star sticker.
  const star = rgba('#ffd23a');
  pb.rect(9, 4, 2, 4, star);
  pb.rect(8, 5, 4, 2, star);
  pb.set(9, 5, rgba('#fff6c0'));
  pb.set(11, 6, rgba('#d89a10'));
  // A moulded ridge round the body near the rim.
  for (let x = 0; x < 20; x++) {
    if (Math.abs(x + 0.5 - cx) <= 6.6) {
      pb.set(x, 8, dark);
      pb.set(x, 9, x < cx - 2 ? light : red);
    }
  }
  // The rolled rim: highlight, body, shadow.
  for (let x = 2; x <= 17; x++) {
    pb.set(x, 11, x < 6 ? rgba('#ffb0a0') : light);
    pb.set(x, 12, x > 13 ? mid : red);
    pb.set(x, 13, dark);
  }
  // The handle: lugs at the rim's ends, the loop hanging just below it.
  const handle = rgba('#ffcc22');
  const handleDark = rgba('#c88a12');
  pb.rect(1, 10, 1, 4, handle);
  pb.rect(18, 10, 1, 4, handleDark);
  pb.line(1, 14, 3, 15, handle);
  pb.line(4, 15, 15, 15, handle);
  pb.line(16, 15, 18, 14, handleDark);
  pb.outline(rgba('#3a0810'));
  return pb;
}

/**
 * A crusader's great helm, far too big for him (26 x 20): a flat-topped steel pot, the eye slit
 * and the cross-shaped nasal bar, breaths on the right cheek, rivets round the rim, a small red
 * cross painted on the left cheek. Dull steel, so it reads apart from his own bright helmet.
 */
export function drawBigHelm(): PixelBuffer {
  const pb = new PixelBuffer(26, 20);
  const light = rgba('#c4ccd6');
  const steel = rgba('#8c949e');
  const mid = rgba('#6c747e');
  const dark = rgba('#4a5059');
  const slit = rgba('#0c0e12');
  const rivet = rgba('#dde3ea');
  const cx = 13;
  for (let y = 3; y <= 17; y++) {
    for (let x = 1; x <= 24; x++) pb.set(x, y, shade((x + 0.5 - cx) / 12, steel, light, steel, mid, dark));
  }
  // The flat top, seen from a little above.
  pb.ellipse(cx, 3.4, 11.6, 2.5, mid);
  pb.ellipse(cx, 3, 10.6, 1.9, light);
  pb.rect(6, 2, 5, 1, rgba('#e8eef4'));
  // The brow over the slit, the slit, its lit lower lip.
  pb.rect(3, 7, 20, 1, dark);
  pb.rect(3, 8, 20, 2, slit);
  pb.rect(3, 10, 20, 1, light);
  // The nasal bar and the cross piece, riveted.
  pb.rect(12, 4, 2, 13, rgba('#a8b0ba'));
  pb.rect(13, 4, 1, 13, mid);
  pb.set(12, 5, rivet);
  pb.set(12, 15, rivet);
  // Breaths on the right cheek.
  for (const [x, y] of [
    [16, 12],
    [18, 12],
    [20, 12],
    [17, 14],
    [19, 14],
    [21, 14],
  ] as const)
    pb.set(x, y, slit);
  // A red cross painted on the left cheek.
  const cross = rgba('#c42828');
  pb.rect(6, 13, 3, 1, cross);
  pb.rect(7, 12, 1, 3, cross);
  // The rim: a darker band with rivets.
  pb.rect(1, 16, 24, 1, mid);
  pb.rect(1, 17, 24, 1, dark);
  for (let x = 3; x <= 23; x += 4) pb.set(x, 16, rivet);
  pb.outline(rgba('#16181e'));
  return pb;
}
