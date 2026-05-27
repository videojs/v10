import { defineExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import type { HTMLMediaElementHost } from '../html-media-element-host';
import { HTMLMediaElementLayer } from '../html-media-element-layer';
import { getStreamInfoFromSrc, looksLikeM3u8 } from './m3u8-utils';

export type NativeHlsLiveMedia = HTMLMediaElementHost<HTMLMediaElement, any>;

/**
 * Tracks live-stream metadata for native HLS playback ({@link MediaLiveCapability}).
 *
 * Native HLS does not expose manifest-level `HOLD-BACK` / `PART-HOLD-BACK`
 * through a JS API, so this extension fetches the m3u8 itself on `loadstart`
 * and parses the relevant tags to derive `targetLiveWindow` and
 * `liveEdgeStart` — mirroring the approach in `muxinc/elements`.
 *
 * See https://github.com/muxinc/elements/blob/main/packages/playback-core/src/index.ts
 *
 * @example nativeHlsLive().install(media);
 */
export class NativeHlsLive {
  readonly name = 'native-hls-live';

  install(media: NativeHlsLiveMedia) {
    return addLayer(media, new NativeHlsLiveLayer());
  }
}

export const nativeHlsLive = defineExtension<void, NativeHlsLiveMedia, NativeHlsLive>(() => new NativeHlsLive());

class NativeHlsLiveLayer extends HTMLMediaElementLayer {
  #targetLiveWindow = Number.NaN;
  #liveEdgeStartOffset: number | undefined;
  #abort: AbortController | null = null;
  #currentSrc = '';

  override get targetLiveWindow() {
    return this.#targetLiveWindow;
  }

  // Derived from seekable (or buffered) + offset at read time.
  override get liveEdgeStart() {
    if (this.#liveEdgeStartOffset === undefined) return Number.NaN;
    const { target } = this;
    if (!target) return Number.NaN;
    const { seekable, buffered } = target;
    // Native HLS on Chrome doesn't populate `seekable`; fall back to `buffered`.
    const ranges = seekable.length ? seekable : buffered;
    if (!ranges.length) return Number.NaN;
    return ranges.end(ranges.length - 1) - this.#liveEdgeStartOffset;
  }

  override get target() {
    return super.target;
  }

  override set target(target: HTMLMediaElement | null) {
    this.#teardown();

    super.target = target;
    if (!target) return;

    this.#abort = new AbortController();
    const { signal } = this.#abort;

    // `loadstart` fires when the element starts loading a new source — the
    // right moment to kick off our parallel fetch. If the src is already set,
    // pick it up now.
    target.addEventListener('loadstart', () => this.#refresh(target), { signal });
    target.addEventListener(
      'emptied',
      () => {
        this.#currentSrc = '';
        this.#liveEdgeStartOffset = undefined;
        this.#setTargetLiveWindow(Number.NaN);
      },
      { signal }
    );

    if (target.currentSrc || target.src) this.#refresh(target);
  }

  destroy() {
    this.#teardown();
    super.destroy();
  }

  #teardown() {
    this.#abort?.abort();
    this.#abort = null;
    this.#currentSrc = '';
    this.#liveEdgeStartOffset = undefined;
    this.#setTargetLiveWindow(Number.NaN);
  }

  async #refresh(target: HTMLMediaElement) {
    const src = target.currentSrc || target.src;
    // Only inspect HLS sources. `looksLikeM3u8` is permissive: any path or
    // query string containing `.m3u8` qualifies.
    if (!src || !looksLikeM3u8(src) || src === this.#currentSrc) return;

    this.#currentSrc = src;
    this.#liveEdgeStartOffset = undefined;
    this.#setTargetLiveWindow(Number.NaN);

    const signal = this.#abort?.signal;
    try {
      const info = await getStreamInfoFromSrc(src, signal);
      // Bail if we've been torn down or the src changed mid-fetch.
      if (signal?.aborted) return;
      if ((target.currentSrc || target.src) !== src) return;

      this.#liveEdgeStartOffset = info.liveEdgeStartOffset;
      this.#setTargetLiveWindow(info.targetLiveWindow);
    } catch {
      // Network / CORS / parse errors leave values at `NaN`.
    }
  }

  #setTargetLiveWindow(value: number) {
    if (Object.is(this.#targetLiveWindow, value)) return;
    this.#targetLiveWindow = value;
    this.dispatchEvent(new Event('targetlivewindowchange'));
  }
}
