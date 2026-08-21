import type { ParsedFrame } from 'gifuct-js';
import { decompressFrames, parseGIF } from 'gifuct-js';
import type { GifFrameSource } from './frame-source';
import { normalizeFrameDelay } from './frame-source';

/**
 * JS polyfill backend for `GifFrameSource`, used where WebCodecs
 * `ImageDecoder` cannot decode GIFs. Decodes every frame to RGBA up front and
 * composites the GIF's frame deltas onto an offscreen canvas.
 */
export function createGifuctSource(buffer: ArrayBuffer): GifFrameSource {
  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true);
  if (frames.length === 0) throw new Error('GIF contains no frames.');
  return new GifuctSource(gif.lsd.width, gif.lsd.height, frames);
}

class GifuctSource implements GifFrameSource {
  readonly width: number;
  readonly height: number;
  readonly delays: readonly number[];

  #frames: ParsedFrame[];
  #composite: HTMLCanvasElement | null = null;
  #compositeCtx: CanvasRenderingContext2D | null = null;
  #patchCanvas: HTMLCanvasElement | null = null;
  /** Index of the frame currently composited offscreen, -1 when blank. */
  #compositedIndex = -1;

  constructor(width: number, height: number, frames: ParsedFrame[]) {
    this.width = width;
    this.height = height;
    this.#frames = frames;
    this.delays = frames.map((frame) => normalizeFrameDelay(frame.delay ?? 0));
  }

  get frameCount(): number {
    return this.#frames.length;
  }

  drawFrame(ctx: CanvasRenderingContext2D, index: number): void {
    const composite = this.#compositeUpTo(index);
    if (!composite) return;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(composite, 0, 0);
  }

  destroy(): void {
    this.#frames = [];
    this.#composite = null;
    this.#compositeCtx = null;
    this.#patchCanvas = null;
    this.#compositedIndex = -1;
  }

  /**
   * Composite the offscreen canvas forward to `index`. GIF frames are deltas
   * over the previous state, so a backward jump clears and replays from frame
   * 0; a forward jump applies only the frames in between.
   */
  #compositeUpTo(index: number): HTMLCanvasElement | null {
    if (!this.#composite) {
      // Canvas-less environments (jsdom) yield no context; drawing is skipped.
      const canvas = globalThis.document?.createElement('canvas');
      const ctx = canvas?.getContext('2d') ?? null;
      if (!canvas || !ctx) return null;
      canvas.width = this.width;
      canvas.height = this.height;
      this.#composite = canvas;
      this.#compositeCtx = ctx;
    }
    const ctx = this.#compositeCtx!;

    let from = this.#compositedIndex + 1;
    if (index < this.#compositedIndex) {
      ctx.clearRect(0, 0, this.width, this.height);
      from = 0;
    }
    for (let i = from; i <= index; i++) {
      this.#applyFrame(ctx, i);
    }
    this.#compositedIndex = index;
    return this.#composite;
  }

  #applyFrame(ctx: CanvasRenderingContext2D, index: number): void {
    const frame = this.#frames[index]!;
    const previous = index > 0 ? this.#frames[index - 1]! : null;

    // Disposal 2 restores the previous frame's region to background (treated
    // as transparent, like browsers do); 3 (restore-previous) is rare and
    // approximated the same way.
    if (previous && previous.disposalType >= 2) {
      const { left, top, width, height } = previous.dims;
      ctx.clearRect(left, top, width, height);
    }

    const { left, top, width, height } = frame.dims;
    const patchCanvas = (this.#patchCanvas ??= globalThis.document?.createElement('canvas'));
    const patchCtx = patchCanvas?.getContext('2d');
    if (!patchCanvas || !patchCtx) return;
    patchCanvas.width = width;
    patchCanvas.height = height;
    patchCtx.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), width, height), 0, 0);
    ctx.drawImage(patchCanvas, left, top);
  }
}
