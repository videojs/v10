import type { ParsedFrame } from 'gifuct-js';
import { decompressFrames, parseGIF } from 'gifuct-js';

export class GifMedia extends EventTarget {
  #src = '';
  #paused = true;
  #readyState = 0;
  #frames: ParsedFrame[] = [];
  #frameIndex = 0;
  #canvas: HTMLCanvasElement | null = null;
  #tempCanvas: HTMLCanvasElement | null = null;
  #rafId: number | null = null;
  #lastTime: number | null = null;
  #elapsed = 0;
  #gifWidth = 0;
  #gifHeight = 0;
  #loadAbort: AbortController | null = null;

  get paused(): boolean {
    return this.#paused;
  }

  get ended(): boolean {
    return false;
  }

  get currentTime(): number {
    return 0;
  }

  get readyState(): number {
    return this.#readyState;
  }

  get duration(): number {
    if (this.#frames.length === 0) return 0;
    return this.#frames.reduce((sum, f) => sum + f.delay * 10, 0) / 1000;
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
    this.#paused = false;
    if (this.#readyState >= 4) {
      this.#start();
      this.dispatchEvent(new Event('play'));
      this.dispatchEvent(new Event('playing'));
    }
    return Promise.resolve();
  }

  pause(): void {
    if (this.#paused) return;
    this.#paused = true;
    this.#stop();
    this.dispatchEvent(new Event('pause'));
  }

  load(): void {
    if (this.#src) this.#load(this.#src);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.detach();
    this.#canvas = canvas;
    this.#tempCanvas = document.createElement('canvas');

    if (this.#gifWidth > 0) {
      canvas.width = this.#gifWidth;
      canvas.height = this.#gifHeight;
    }

    if (this.#readyState >= 4 && this.#frames.length > 0) {
      this.#drawFrame();
      if (!this.#paused) this.#start();
    }
  }

  detach(): void {
    this.#stop();
    this.#canvas = null;
    this.#tempCanvas = null;
  }

  #reset(): void {
    this.#loadAbort?.abort();
    this.#loadAbort = null;
    this.#stop();
    this.#frames = [];
    this.#frameIndex = 0;
    this.#elapsed = 0;
    this.#readyState = 0;
    this.#gifWidth = 0;
    this.#gifHeight = 0;
  }

  async #load(src: string): Promise<void> {
    this.#loadAbort?.abort();
    const abort = new AbortController();
    this.#loadAbort = abort;

    try {
      const resp = await fetch(src, { signal: abort.signal });
      const buffer = await resp.arrayBuffer();

      if (abort.signal.aborted) return;

      const gif = parseGIF(buffer);
      this.#frames = decompressFrames(gif, true);
      this.#gifWidth = gif.lsd.width;
      this.#gifHeight = gif.lsd.height;
      this.#readyState = 4;

      if (this.#canvas) {
        this.#canvas.width = this.#gifWidth;
        this.#canvas.height = this.#gifHeight;
        this.#drawFrame();
      }

      if (!this.#paused) {
        this.#start();
        this.dispatchEvent(new Event('play'));
        this.dispatchEvent(new Event('playing'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      this.dispatchEvent(new Event('error'));
    }
  }

  #start(): void {
    if (!this.#canvas || this.#frames.length === 0) return;
    this.#stop();
    this.#lastTime = null;
    this.#elapsed = 0;
    this.#rafId = requestAnimationFrame(this.#tick);
  }

  #stop(): void {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    this.#lastTime = null;
  }

  #tick = (timestamp: number): void => {
    if (this.#paused || !this.#canvas) return;

    if (this.#lastTime === null) {
      this.#lastTime = timestamp;
    }

    const delta = timestamp - this.#lastTime;
    this.#lastTime = timestamp;
    this.#elapsed += delta;

    const frame = this.#frames[this.#frameIndex];
    // GIF frame delay is in centiseconds (1/100s); convert to ms
    const frameDelay = Math.max((frame?.delay ?? 10) * 10, 20);

    if (this.#elapsed >= frameDelay) {
      this.#elapsed -= frameDelay;
      this.#frameIndex = (this.#frameIndex + 1) % this.#frames.length;
      this.#drawFrame();
    }

    this.#rafId = requestAnimationFrame(this.#tick);
  };

  #drawFrame(): void {
    const canvas = this.#canvas;
    const frame = this.#frames[this.#frameIndex];
    if (!canvas || !frame || !this.#tempCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { left, top, width, height } = frame.dims;

    if (frame.disposalType === 2) {
      ctx.clearRect(left, top, width, height);
    }

    this.#tempCanvas.width = width;
    this.#tempCanvas.height = height;
    const tempCtx = this.#tempCanvas.getContext('2d')!;
    tempCtx.putImageData(new ImageData(frame.patch as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
    ctx.drawImage(this.#tempCanvas, left, top);
  }
}
