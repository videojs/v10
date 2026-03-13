import type { ParsedFrame, ParsedGif } from 'gifuct-js';
import { decompressFrames, parseGIF } from 'gifuct-js';

export class GifMedia extends EventTarget {
  #src = '';
  #paused = true;
  #gif: ParsedGif | null = null;
  #frames: ParsedFrame[] = [];
  #frameIndex = 0;
  #render: { canvas: HTMLCanvasElement; tempCanvas: HTMLCanvasElement } | null = null;
  #rafId: number | null = null;
  #nextFrameAt = 0;
  #loadGen = 0;

  get paused(): boolean {
    return this.#paused;
  }

  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    if (this.#src === value) return;
    this.#src = value;
    this.#reset();
    if (value) this.#load(value);
  }

  play(): Promise<void> {
    if (!this.#paused) return Promise.resolve();
    if (!this.#src) return Promise.reject(new DOMException('No media src', 'NotSupportedError'));
    this.#paused = false;
    if (this.#frames.length > 0) {
      this.#start();
      this.dispatchEvent(new Event('play'));
      this.dispatchEvent(new Event('playing'));
    }
    // If frames aren't loaded yet, #load() will start + dispatch when ready
    return Promise.resolve();
  }

  pause(): void {
    if (this.#paused) return;
    this.#paused = true;
    this.#stop();
    this.dispatchEvent(new Event('pause'));
  }

  attach(canvas: HTMLCanvasElement): void {
    this.detach();
    this.#render = { canvas, tempCanvas: document.createElement('canvas') };

    if (this.#gif) {
      canvas.width = this.#gif.lsd.width;
      canvas.height = this.#gif.lsd.height;
    }

    if (this.#frames.length > 0) {
      this.#drawFrame();
      if (!this.#paused) this.#start();
    }
  }

  detach(): void {
    this.#stop();
    this.#render = null;
  }

  #reset(): void {
    this.#loadGen++;
    this.#stop();
    this.#gif = null;
    this.#frames = [];
    this.#frameIndex = 0;
  }

  async #load(src: string): Promise<void> {
    const gen = this.#loadGen;
    try {
      const resp = await fetch(src);
      if (gen !== this.#loadGen) return;
      const buffer = await resp.arrayBuffer();
      if (gen !== this.#loadGen) return;

      const gif = parseGIF(buffer);
      this.#gif = gif;
      this.#frames = decompressFrames(gif, true);

      if (this.#render) {
        this.#render.canvas.width = gif.lsd.width;
        this.#render.canvas.height = gif.lsd.height;
        this.#drawFrame();
      }

      if (!this.#paused) {
        this.#start();
        this.dispatchEvent(new Event('play'));
        this.dispatchEvent(new Event('playing'));
      }
    } catch {
      if (gen !== this.#loadGen) return;
      this.dispatchEvent(new Event('error'));
    }
  }

  #start(): void {
    if (!this.#render) return;
    this.#stop();
    this.#nextFrameAt = performance.now() + (this.#frames[this.#frameIndex]!.delay ?? 100);
    this.#rafId = requestAnimationFrame(this.#tick);
  }

  #stop(): void {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  #tick = (timestamp: number): void => {
    if (timestamp >= this.#nextFrameAt) {
      this.#frameIndex = (this.#frameIndex + 1) % this.#frames.length;
      this.#nextFrameAt = timestamp + (this.#frames[this.#frameIndex]!.delay ?? 100);
      this.#drawFrame();
    }
    this.#rafId = requestAnimationFrame(this.#tick);
  };

  #drawFrame(): void {
    if (!this.#render) return;
    const { canvas, tempCanvas } = this.#render;
    const frame = this.#frames[this.#frameIndex]!;
    const ctx = canvas.getContext('2d')!;
    const { left, top, width, height } = frame.dims;

    if (frame.disposalType === 2) ctx.clearRect(left, top, width, height);

    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas
      .getContext('2d')!
      .putImageData(new ImageData(frame.patch as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
    ctx.drawImage(tempCanvas, left, top);
  }
}
