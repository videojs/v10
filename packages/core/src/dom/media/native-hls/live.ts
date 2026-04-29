import type { Constructor } from '@videojs/utils/types';
import type { NativeMediaHost } from './errors';
import { getStreamInfoFromSrc, looksLikeM3u8 } from './m3u8-utils';

export function NativeHlsMediaLiveMixin<Base extends Constructor<NativeMediaHost>>(BaseClass: Base) {
  // Native HLS does not expose manifest-level `HOLD-BACK` / `PART-HOLD-BACK`
  // through a JS API, so we fetch the m3u8 ourselves and parse the relevant
  // tags to derive `targetLiveWindow` and `liveEdgeStart` — mirroring the
  // approach in `muxinc/elements`.
  //
  // See https://github.com/muxinc/elements/blob/main/packages/playback-core/src/index.ts
  class NativeHlsMediaLive extends (BaseClass as Constructor<NativeMediaHost>) {
    #targetLiveWindow = Number.NaN;
    #liveEdgeStartOffset: number | undefined;
    #disconnect: AbortController | null = null;
    #currentSrc = '';

    get targetLiveWindow() {
      return this.#targetLiveWindow;
    }

    // Derived on each read from the current `seekable.end` and cached offset.
    get liveEdgeStart() {
      if (this.#liveEdgeStartOffset === undefined) return Number.NaN;
      const target = this.target as HTMLMediaElement | null;
      if (!target) return Number.NaN;
      const { seekable, buffered } = target;
      // Native HLS on Chrome doesn't fill the `seekable` property, so we use the `buffered` property instead.
      const ranges = seekable.length ? seekable : buffered;
      if (!ranges.length) return Number.NaN;
      return ranges.end(ranges.length - 1) - this.#liveEdgeStartOffset;
    }

    attach(target: EventTarget) {
      super.attach?.(target);
      this.#init(target as HTMLMediaElement);
    }

    detach() {
      this.#destroy();
      super.detach?.();
    }

    destroy() {
      this.#destroy();
      super.destroy?.();
    }

    #destroy() {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#currentSrc = '';
      this.#liveEdgeStartOffset = undefined;
      this.#setTargetLiveWindow(Number.NaN);
    }

    #init(target: HTMLMediaElement) {
      this.#destroy();
      this.#disconnect = new AbortController();
      const { signal } = this.#disconnect;

      // `loadstart` fires when the element starts loading a new source — the
      // right moment to kick off our parallel fetch. If the src has already
      // been set (e.g. preload='auto' on a prior frame), pick it up now.
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

    async #refresh(target: HTMLMediaElement) {
      const src = target.currentSrc || target.src;
      // Only inspect HLS sources. `looksLikeM3u8` is permissive: a query
      // string or path containing `.m3u8` is enough.
      if (!src || !looksLikeM3u8(src) || src === this.#currentSrc) return;

      this.#currentSrc = src;
      // Optimistically reset — we're about to compute fresh values.
      this.#liveEdgeStartOffset = undefined;
      this.#setTargetLiveWindow(Number.NaN);

      const signal = this.#disconnect?.signal;
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

  return NativeHlsMediaLive as unknown as Base &
    Constructor<{ readonly liveEdgeStart: number; readonly targetLiveWindow: number }>;
}
