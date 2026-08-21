import { createPublicPromise, type PublicPromise } from '@videojs/utils/function';
import { EMPTY_TIME_RANGES } from '../../core/constants';
import { MediaError } from '../../core/media-error';
import type { CanPlayTypeResult, ErrorLike, MediaPreloadType, Video } from '../../core/types';
import { MediaPlayedRangesMixin } from '../media-played-ranges';
import { createTimeRange } from '../utils';
import type { GifFrameSource } from './frame-source';
import { createImageDecoderSource, isImageDecoderSupported } from './image-decoder-source';

export interface GifMediaProps {
  src: string;
  autoplay: boolean;
  loop: boolean;
  preload: MediaPreloadType;
  crossOrigin: string | null;
  playbackRate: number;
}

export const gifMediaDefaultProps: GifMediaProps = {
  src: '',
  autoplay: false,
  loop: false,
  preload: 'metadata',
  crossOrigin: null,
  playbackRate: 1,
};

// Native media fires `timeupdate` every 250ms or so; GIF frames can be far
// shorter, so advancing frames re-dispatches only after this much media time.
const TIMEUPDATE_INTERVAL_MS = 250;

const READY_STATE_HAVE_NOTHING = 0;
const READY_STATE_HAVE_ENOUGH_DATA = 4;

/**
 * Decode a fetched GIF into a frame source, preferring the browser's own
 * WebCodecs `ImageDecoder`. The JS decoder is the polyfill, pulled in only
 * where WebCodecs can't decode GIFs so the native path never ships it.
 */
async function createFrameSource(buffer: ArrayBuffer): Promise<GifFrameSource> {
  if (await isImageDecoderSupported()) {
    return createImageDecoderSource(buffer);
  }
  const { createGifuctSource } = await import('./gifuct-source');
  return createGifuctSource(buffer);
}

const GifMediaBase = MediaPlayedRangesMixin(EventTarget);

/**
 * Plays an animated GIF like a video: decodes its frames and drives a
 * `<canvas>` with its own clock, so playback can actually pause, seek, loop
 * on demand, and change rate — none of which an `<img>` rendering allows.
 * Decoding uses WebCodecs `ImageDecoder` where available and falls back to a
 * lazily-loaded JS decoder (gifuct-js) elsewhere.
 *
 * GIFs carry no audio, so the media exposes no volume or mute surface, and
 * fetching happens with `fetch()`, so the source must be same-origin or served
 * with CORS headers.
 */
export class GifMedia extends GifMediaBase implements Partial<Video> {
  #canvas: HTMLCanvasElement | null = null;

  #src = gifMediaDefaultProps.src;
  #autoplay = gifMediaDefaultProps.autoplay;
  #loop = gifMediaDefaultProps.loop;
  #preload = gifMediaDefaultProps.preload;
  #crossOrigin = gifMediaDefaultProps.crossOrigin;
  #playbackRate = gifMediaDefaultProps.playbackRate;
  #defaultPlaybackRate = gifMediaDefaultProps.playbackRate;

  #source: GifFrameSource | null = null;
  /** Per-frame delay in ms, normalized the way browsers render it. */
  #delays: readonly number[] = [];
  /** Cumulative start time of each frame in ms; one extra entry holds the total. */
  #starts: number[] = [0];

  #paused = true;
  #ended = false;
  #seeking = false;
  #readyState: number = READY_STATE_HAVE_NOTHING;
  #error: ErrorLike | null = null;

  #frameIndex = 0;
  /** Index of the last frame handed to the source to paint, -1 when none. */
  #renderedIndex = -1;
  /** Media time already spent inside the current frame, in ms. */
  #frameElapsed = 0;
  /** Wall-clock timestamp of the last schedule, for measuring elapsed time. */
  #frameClock = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #lastTimeupdate = 0;
  #pendingSeek: number | null = null;

  #abort: AbortController | null = null;
  #loadComplete: PublicPromise<void> | null = null;

  /** GIF playback is self-driven, so there is no third-party engine underneath. */
  get engine(): null {
    return null;
  }

  get target(): HTMLCanvasElement | null {
    return this.#canvas;
  }

  /** Bind the canvas the frames render into. Playback state survives detach; only drawing stops. */
  attach(target: HTMLCanvasElement | null): void {
    if (!target || this.#canvas === target) return;
    if (this.#canvas) this.detach();
    this.#canvas = target;
    if (this.#source) {
      this.#sizeCanvas();
      this.#renderedIndex = -1;
      this.#render(this.#frameIndex);
    }
  }

  detach(): void {
    if (!this.#canvas) return;
    this.#canvas = null;
    this.#renderedIndex = -1;
  }

  override destroy(): void {
    this.#stopClock();
    this.#abort?.abort();
    this.#abort = null;
    this.#loadComplete?.resolve();
    this.#source?.destroy();
    this.#source = null;
    this.detach();
    super.destroy();
  }

  get src(): string {
    return this.#src;
  }
  /** Setting a source resets playback and fetches it, unless `preload` is `'none'` and `autoplay` is off. */
  set src(value: string) {
    if (this.#src === value) return;
    this.#src = value;
    void this.load();
  }

  get currentSrc(): string {
    return this.#source ? this.#src : '';
  }

  get readyState(): number {
    return this.#readyState;
  }

  get preload(): MediaPreloadType {
    return this.#preload;
  }
  set preload(value: MediaPreloadType) {
    this.#preload = value;
  }

  get crossOrigin(): string | null {
    return this.#crossOrigin;
  }
  set crossOrigin(value: string | null) {
    this.#crossOrigin = value;
  }

  canPlayType(type: string): CanPlayTypeResult {
    return /^image\/gif\s*(;|$)/i.test(type) ? 'probably' : '';
  }

  /** Reset playback and fetch the current source, honoring `preload: 'none'` until playback demands data. */
  async load(): Promise<void> {
    this.#abort?.abort();
    this.#abort = null;
    this.#stopClock();

    const hadData = this.#source !== null;
    // A seek queued before any metadata is a start position for this load; one
    // left over from a previous source is not.
    const pendingSeek = hadData ? null : this.#pendingSeek;
    this.#resetState();
    this.#pendingSeek = pendingSeek;
    if (hadData) this.dispatchEvent(new Event('emptied'));
    if (!this.#src) return;

    if (this.#preload === 'none' && !this.#autoplay) return;
    await this.#fetchAndDecode();
  }

  async #fetchAndDecode(): Promise<void> {
    const abort = new AbortController();
    this.#abort = abort;
    const loadComplete = (this.#loadComplete ??= createPublicPromise<void>());
    this.dispatchEvent(new Event('loadstart'));

    let buffer: ArrayBuffer;
    try {
      const response = await fetch(this.#src, {
        signal: abort.signal,
        credentials: this.#crossOrigin === 'use-credentials' ? 'include' : 'same-origin',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buffer = await response.arrayBuffer();
    } catch (cause) {
      if (abort.signal.aborted) return;
      this.#fail(
        new MediaError(`Failed to fetch GIF: ${(cause as Error)?.message ?? cause}`, MediaError.MEDIA_ERR_NETWORK)
      );
      return;
    }
    if (abort !== this.#abort) return;

    let source: GifFrameSource;
    try {
      source = await createFrameSource(buffer);
    } catch {
      if (abort !== this.#abort) return;
      this.#fail(new MediaError('Failed to decode GIF.', MediaError.MEDIA_ERR_DECODE));
      return;
    }
    if (abort !== this.#abort) {
      // A newer load superseded this one while the decoder was working.
      source.destroy();
      return;
    }

    this.#source = source;
    this.#delays = source.delays;
    this.#starts = [0];
    for (const delay of this.#delays) {
      this.#starts.push(this.#starts[this.#starts.length - 1]! + delay);
    }
    this.#readyState = READY_STATE_HAVE_ENOUGH_DATA;

    this.dispatchEvent(new Event('durationchange'));
    this.dispatchEvent(new Event('loadedmetadata'));
    this.dispatchEvent(new Event('resize'));

    if (this.#pendingSeek !== null) {
      const time = this.#pendingSeek;
      this.#pendingSeek = null;
      this.#seekTo(time);
    }

    this.#sizeCanvas();
    this.#render(this.#frameIndex);

    this.dispatchEvent(new Event('loadeddata'));
    this.dispatchEvent(new Event('canplay'));
    this.dispatchEvent(new Event('canplaythrough'));

    loadComplete.resolve();
    this.#loadComplete = null;

    if (!this.#paused) {
      this.#startClock();
      this.dispatchEvent(new Event('playing'));
    } else if (this.#autoplay) {
      void this.play();
    }
  }

  #fail(error: MediaError): void {
    // A later `play()` may retry the fetch; a stale controller would block it.
    this.#abort = null;
    this.#error = error;
    this.#readyState = READY_STATE_HAVE_NOTHING;
    this.dispatchEvent(new Event('error'));
    // Settle so `play()` callers reject on the stored error instead of hanging.
    this.#loadComplete?.resolve();
    this.#loadComplete = null;
  }

  get paused(): boolean {
    return this.#paused;
  }

  get ended(): boolean {
    return this.#ended;
  }

  get seeking(): boolean {
    return this.#seeking;
  }

  async play(): Promise<void> {
    if (!this.#src) {
      throw new DOMException('No media source.', 'NotSupportedError');
    }
    if (this.#ended) this.#seekTo(0);

    const wasPaused = this.#paused;
    this.#paused = false;
    this.#ended = false;
    if (wasPaused) this.dispatchEvent(new Event('play'));

    if (!this.#source) {
      if (!this.#abort) void this.#fetchAndDecode();
      await (this.#loadComplete ??= createPublicPromise<void>());
      if (this.#error) {
        throw new DOMException(this.#error.message, 'NotSupportedError');
      }
      return;
    }

    if (wasPaused) {
      this.#startClock();
      this.dispatchEvent(new Event('playing'));
    }
  }

  pause(): void {
    if (this.#paused) return;
    this.#syncElapsed();
    this.#stopClock();
    this.#paused = true;
    this.dispatchEvent(new Event('pause'));
  }

  get currentTime(): number {
    if (this.#frameCount === 0) return this.#pendingSeek ?? 0;
    let elapsed = this.#frameElapsed;
    if (!this.#paused && this.#timer !== null) {
      elapsed += (performance.now() - this.#frameClock) * this.#playbackRate;
    }
    const start = this.#starts[this.#frameIndex]!;
    return Math.min(start + elapsed, this.#totalMs) / 1000;
  }
  set currentTime(value: number) {
    if (this.#frameCount === 0) {
      // No frame table to land on yet; applied once metadata arrives.
      this.#pendingSeek = value;
      return;
    }
    this.#seeking = true;
    this.dispatchEvent(new Event('seeking'));
    this.#seekTo(value);
    this.#seeking = false;
    this.dispatchEvent(new Event('seeked'));
    this.#dispatchTimeupdate();
  }

  #seekTo(seconds: number): void {
    const ms = Math.min(Math.max(seconds * 1000, 0), this.#totalMs);
    let index = this.#frameCount - 1;
    for (let i = 0; i < this.#frameCount; i++) {
      if (ms < this.#starts[i + 1]!) {
        index = i;
        break;
      }
    }
    this.#frameIndex = index;
    this.#frameElapsed = ms - this.#starts[index]!;
    if (this.#ended && ms < this.#totalMs) this.#ended = false;
    this.#render(index);
    if (!this.#paused) this.#startClock();
  }

  get duration(): number {
    return this.#frameCount > 0 ? this.#totalMs / 1000 : Number.NaN;
  }

  get #frameCount(): number {
    return this.#delays.length;
  }

  get #totalMs(): number {
    return this.#starts[this.#frameCount] ?? 0;
  }

  get autoplay(): boolean {
    return this.#autoplay;
  }
  set autoplay(value: boolean) {
    this.#autoplay = value;
    if (value && this.#paused && this.#source) void this.play();
  }

  get loop(): boolean {
    return this.#loop;
  }
  set loop(value: boolean) {
    this.#loop = value;
  }

  get playbackRate(): number {
    return this.#playbackRate;
  }
  set playbackRate(value: number) {
    if (this.#playbackRate === value) return;
    // Bank time spent at the old rate before the new one changes the clock's scale.
    this.#syncElapsed();
    this.#playbackRate = value;
    if (!this.#paused && this.#source) this.#startClock();
    this.dispatchEvent(new Event('ratechange'));
  }

  get defaultPlaybackRate(): number {
    return this.#defaultPlaybackRate;
  }
  set defaultPlaybackRate(value: number) {
    this.#defaultPlaybackRate = value;
  }

  get buffered() {
    // The whole file decodes up front, so once loaded everything is buffered.
    return this.#frameCount > 0 ? createTimeRange(0, this.duration) : EMPTY_TIME_RANGES;
  }

  get seekable() {
    return this.#frameCount > 0 ? createTimeRange(0, this.duration) : EMPTY_TIME_RANGES;
  }

  get error(): ErrorLike | null {
    return this.#error;
  }

  get videoWidth(): number {
    return this.#source?.width ?? 0;
  }

  get videoHeight(): number {
    return this.#source?.height ?? 0;
  }

  #resetState(): void {
    this.#source?.destroy();
    this.#source = null;
    this.#delays = [];
    this.#starts = [0];
    this.#frameIndex = 0;
    this.#renderedIndex = -1;
    this.#frameElapsed = 0;
    this.#paused = true;
    this.#ended = false;
    this.#seeking = false;
    this.#pendingSeek = null;
    this.#error = null;
    this.#readyState = READY_STATE_HAVE_NOTHING;
    this.#lastTimeupdate = 0;
    this.#loadComplete?.resolve();
    this.#loadComplete = null;
  }

  // ----------------------------------------
  // Playback clock
  // ----------------------------------------

  /** Fold wall-clock time since the last schedule into `#frameElapsed`. */
  #syncElapsed(): void {
    if (this.#timer === null) return;
    const now = performance.now();
    this.#frameElapsed += (now - this.#frameClock) * this.#playbackRate;
    this.#frameClock = now;
  }

  #startClock(): void {
    this.#stopClock();
    if (this.#frameCount === 0) return;
    const remaining = this.#delays[this.#frameIndex]! - this.#frameElapsed;
    this.#frameClock = performance.now();
    this.#timer = setTimeout(this.#advance, Math.max(remaining / this.#playbackRate, 0));
  }

  #stopClock(): void {
    if (this.#timer === null) return;
    clearTimeout(this.#timer);
    this.#timer = null;
  }

  #advance = (): void => {
    this.#timer = null;
    this.#frameElapsed = 0;

    if (this.#frameIndex + 1 >= this.#frameCount) {
      if (this.#loop) {
        this.#frameIndex = 0;
        this.#render(0);
        this.#maybeTimeupdate();
        this.#startClock();
        return;
      }
      // Natural end: `paused` flips without a `pause` event, per native media.
      this.#frameElapsed = this.#delays[this.#frameIndex]!;
      this.#paused = true;
      this.#ended = true;
      this.#dispatchTimeupdate();
      this.dispatchEvent(new Event('ended'));
      return;
    }

    this.#frameIndex += 1;
    this.#render(this.#frameIndex);
    this.#maybeTimeupdate();
    this.#startClock();
  };

  #maybeTimeupdate(): void {
    const now = this.#starts[this.#frameIndex]!;
    if (Math.abs(now - this.#lastTimeupdate) < TIMEUPDATE_INTERVAL_MS) return;
    this.#dispatchTimeupdate();
  }

  #dispatchTimeupdate(): void {
    this.#lastTimeupdate = this.#starts[this.#frameIndex]! + this.#frameElapsed;
    this.dispatchEvent(new Event('timeupdate'));
  }

  // ----------------------------------------
  // Rendering
  // ----------------------------------------

  #sizeCanvas(): void {
    const source = this.#source;
    const canvas = this.#canvas;
    if (!source || !canvas) return;
    canvas.width = source.width;
    canvas.height = source.height;
  }

  /** Ask the source to paint frame `index`; the clock never waits on a paint. */
  #render(index: number): void {
    const canvas = this.#canvas;
    const source = this.#source;
    if (!canvas || !source || index === this.#renderedIndex) return;
    // jsdom (and canvas-less environments) return null; playback state still advances.
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.#renderedIndex = index;
    // An on-demand backend paints asynchronously and discards stale draws
    // itself, so a late frame never overwrites a newer one.
    void source.drawFrame(ctx, index);
  }
}
