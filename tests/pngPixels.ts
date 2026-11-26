import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

/** A decoded PNG: width, height and RGBA bytes, row by row. */
export interface Pixels {
  w: number;
  h: number;
  rgba: Buffer;
}

const decoded = new Map<string, Pixels>();

/**
 * Decodes a delivered sheet in `public/` (8-bit RGBA, not interlaced: what the deliveries use)
 * with zlib alone, so tests can check the pixels without a new dependency. Cached per path.
 */
export function decodePng(path: string): Pixels {
  const previous = decoded.get(path);
  if (previous) return previous;
  const png = readFileSync(join('public', path));
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`${path}: not a PNG`);
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  if (png[24] !== 8 || png[25] !== 6 || png[28] !== 0) throw new Error(`${path}: not a non-interlaced 8-bit RGBA PNG`);
  const compressed: Buffer[] = [];
  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') compressed.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(compressed));
  const stride = w * 4;
  if (raw.length !== (stride + 1) * h) throw new Error(`${path}: unexpected image data length`);
  const rgba = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]!;
    if (filter > 4) throw new Error(`${path}: bad filter ${filter} on row ${y}`);
    for (let x = 0; x < stride; x++) {
      const out = y * stride + x;
      const left = x >= 4 ? rgba[out - 4]! : 0;
      const above = y > 0 ? rgba[out - stride]! : 0;
      const corner = y > 0 && x >= 4 ? rgba[out - stride - 4]! : 0;
      const p = left + above - corner;
      const pa = Math.abs(p - left);
      const pb = Math.abs(p - above);
      const pc = Math.abs(p - corner);
      const paeth = pa <= pb && pa <= pc ? left : pb <= pc ? above : corner;
      const predictor = [0, left, above, (left + above) >> 1, paeth][filter]!;
      rgba[out] = (raw[y * (stride + 1) + x + 1]! + predictor) & 255;
    }
  }
  const result = { w, h, rgba };
  decoded.set(path, result);
  return result;
}

/**
 * One frame of a sheet (`size` × `size` at row, column), with only its visible pixels (alpha at
 * least 128; the rest zeroed, so faint matte residue does not count as art).
 */
export function visibleCell(image: Pixels, row: number, column: number, size = 40): Buffer {
  const cell = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const source = ((row * size + y) * image.w + column * size + x) * 4;
      if (image.rgba[source + 3]! >= 128) image.rgba.copy(cell, (y * size + x) * 4, source, source + 4);
    }
  }
  return cell;
}

/** The lowest row of a cell with a visible pixel, or -1 for an empty cell. */
export function lowestRow(cell: Buffer, size = 40): number {
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) if (cell[(y * size + x) * 4 + 3]! > 0) return y;
  }
  return -1;
}
