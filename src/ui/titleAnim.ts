import { Texture } from 'pixi.js';
// Zampano-Samemala-4.gif converted to a lossless animated WebP (same 110 frames and delays, 3.0 MB
// instead of 7.5 MB); the GIF is kept beside it as the source.
import gifUrl from '../../assets/starting-page-images/app/Zampano-Samemala-4.webp?url';
import { TITLE } from '../config';

/**
 * The title page's animated portrait of Zampanò (assets/starting-page-images/
 * Zampano-Samemala-4.gif, 110 frames, about 4 s). The GIF is large (1024 x 1536 per frame), so its
 * frames are decoded one after another by the browser (WebCodecs `ImageDecoder`, in Chromium and
 * the Android WebView) and each is shown as soon as it is ready: decoding runs faster than the GIF
 * plays, so the animation starts at once instead of after the whole file (`TitlePlayer` holds a
 * frame in the rare case it catches up with the decoder). Every frame is cropped to the same box
 * (the first frame's dog plus a margin, TITLE.DOG_CROP_MARGIN), scaled to the title's width with
 * the browser's fast resize and given crisp edges. Where `ImageDecoder` is missing (Safari, a page
 * served over plain http on the LAN) the portrait is the GIF's first frame alone.
 */
export interface TitleFrames {
  /** Frames decoded so far, in order (filled while the GIF decodes). */
  frames: Texture[];
  /** Seconds each decoded frame stays. */
  durations: number[];
  /** Frames in the GIF (0 until known). */
  count: number;
  /** All frames are decoded (or decoding stopped). */
  done: boolean;
  /** Frame size, logical px (0 until the first frame). */
  width: number;
  height: number;
}

export const TITLE_GIF_URL: string = gifUrl;

/** The bits of WebCodecs' ImageDecoder used here (not in every TypeScript DOM library). */
type DecodedImage = CanvasImageSource & { displayWidth: number; displayHeight: number; duration: number | null; close(): void };
interface ImageDecoderLike {
  readonly completed: Promise<void>;
  readonly tracks: { readonly ready: Promise<void>; readonly selectedTrack: { frameCount: number } | null };
  decode(options: { frameIndex: number }): Promise<{ image: DecodedImage }>;
  close(): void;
}
type ImageDecoderCtor = new (init: { data: ArrayBuffer; type: string }) => ImageDecoderLike;

/** Alpha at or above this becomes opaque, below it transparent (crisp edges, like the pixel art). */
const ALPHA_CUT = 110;
/** The first frame is measured at this width to find the dog. */
const PROBE_WIDTH = 256;

const cache = new Map<number, TitleFrames>();

/** The portrait's frames for this width: returned at once, filled while the GIF decodes. */
export function titleFrames(width: number): TitleFrames {
  let f = cache.get(width);
  if (!f) {
    f = { frames: [], durations: [], count: 0, done: false, width: 0, height: 0 };
    cache.set(width, f);
    const store = f;
    void decodeInto(store, width).catch((err) => {
      console.warn('[title anim]', err);
      store.done = true;
    });
  }
  return f;
}

/**
 * Plays the frames in order with the GIF's delays; until the decoding is done it never runs ahead
 * of it (it holds the last decoded frame), then it loops.
 */
export class TitlePlayer {
  private index = 0;
  private time = 0;

  constructor(private readonly f: TitleFrames) {}

  /** Advances by `dt` seconds; returns the frame to show (null before the first one). */
  update(dt: number): Texture | null {
    const f = this.f;
    if (!f.frames.length) return null;
    this.time += dt;
    for (let guard = 0; guard < f.frames.length + 1; guard++) {
      const d = f.durations[this.index] ?? 0.1;
      if (this.time < d) break;
      const next = this.index + 1;
      if (next < f.frames.length) this.index = next;
      else if (f.done) this.index = 0;
      else {
        // Waiting for the decoder: hold this frame.
        this.time = d;
        break;
      }
      this.time -= d;
    }
    return f.frames[this.index]!;
  }
}

function smooth2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  return g;
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** The crop box (source px): the dog in `img` plus TITLE.DOG_CROP_MARGIN, clamped to the frame. */
function cropBox(img: CanvasImageSource, sw: number, sh: number): { x: number; y: number; w: number; h: number } {
  const pw = PROBE_WIDTH;
  const ph = Math.round((sh * pw) / sw);
  const c = canvas(pw, ph);
  const g = smooth2d(c);
  g.drawImage(img, 0, 0, pw, ph);
  const a = g.getImageData(0, 0, pw, ph).data;
  let x0 = pw;
  let y0 = ph;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      if (a[(y * pw + x) * 4 + 3]! < ALPHA_CUT) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: sw, h: sh };
  const k = sw / pw;
  const [mx, my] = TITLE.DOG_CROP_MARGIN;
  const bw = (x1 - x0 + 1) * k;
  const bh = (y1 - y0 + 1) * k;
  const x = Math.max(0, Math.floor(x0 * k - bw * mx));
  const y = Math.max(0, Math.floor(y0 * k - bh * my));
  const xe = Math.min(sw, Math.ceil((x1 + 1) * k + bw * mx));
  const ye = Math.min(sh, Math.ceil((y1 + 1) * k + bh * my));
  return { x, y, w: xe - x, h: ye - y };
}

/** One frame: cropped, scaled to fw x fh (via a 2x intermediate), crisp alpha. */
async function makeFrame(img: CanvasImageSource & ImageBitmapSource, box: { x: number; y: number; w: number; h: number }, fw: number, fh: number): Promise<Texture> {
  const out = canvas(fw, fh);
  const g = smooth2d(out);
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(img, box.x, box.y, box.w, box.h, { resizeWidth: fw * 2, resizeHeight: fh * 2, resizeQuality: 'high' });
    g.drawImage(bitmap, 0, 0, fw, fh);
  } catch {
    // No resizing createImageBitmap: let the canvas scale it.
    g.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, fw, fh);
  } finally {
    bitmap?.close();
  }
  const data = g.getImageData(0, 0, fw, fh);
  for (let k = 3; k < data.data.length; k += 4) data.data[k] = data.data[k]! >= ALPHA_CUT ? 255 : 0;
  g.putImageData(data, 0, 0);
  return Texture.from(out);
}

async function decodeInto(f: TitleFrames, width: number): Promise<void> {
  const Decoder = (globalThis as { ImageDecoder?: ImageDecoderCtor }).ImageDecoder;
  if (!Decoder) {
    // The first frame alone, from an <img>.
    const img = new Image();
    img.src = gifUrl;
    await img.decode();
    const box = cropBox(img, img.naturalWidth, img.naturalHeight);
    f.width = width;
    f.height = Math.max(1, Math.round((box.h * width) / box.w));
    f.frames.push(await makeFrame(img, box, f.width, f.height));
    f.durations.push(1);
    f.count = 1;
    f.done = true;
    return;
  }
  const data = await (await fetch(gifUrl)).arrayBuffer();
  const decoder = new Decoder({ data, type: gifUrl.endsWith('.webp') ? 'image/webp' : 'image/gif' });
  try {
    // The track list first (selectedTrack is null until then), then the whole file.
    await decoder.tracks.ready;
    await decoder.completed;
    f.count = decoder.tracks.selectedTrack?.frameCount ?? 0;
    let box: { x: number; y: number; w: number; h: number } | null = null;
    for (let i = 0; i < f.count; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      try {
        if (!box) {
          box = cropBox(image, image.displayWidth, image.displayHeight);
          f.width = width;
          f.height = Math.max(1, Math.round((box.h * width) / box.w));
        }
        const tex = await makeFrame(image as DecodedImage & ImageBitmapSource, box, f.width, f.height);
        f.durations.push(Math.max(0.02, (image.duration ?? 100_000) / 1e6));
        f.frames.push(tex);
      } finally {
        image.close();
      }
    }
  } finally {
    f.done = true;
    decoder.close();
  }
}
