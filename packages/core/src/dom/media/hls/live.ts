import type { Constructor } from '@videojs/utils/types';
import type { LevelLoadedData } from 'hls.js';
import Hls from 'hls.js';
import type { HlsEngineHost } from './types';

export function HlsJsMediaLiveMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsMediaLive extends (BaseClass as Constructor<HlsEngineHost>) {
    #targetLiveWindow = Number.NaN;
    #liveEdgeStartOffset: number | undefined;
    #seekToLiveAbort: AbortController | null = null;
    #seekToLivePending = false;

    constructor(...args: any[]) {
      super(...args);

      const { engine } = this;
      engine?.on(Hls.Events.MANIFEST_LOADING, () => {
        this.#reset();
        this.#armSeekToLive();
      });
      engine?.on(Hls.Events.MEDIA_ATTACHED, () => this.#armSeekToLive());
      engine?.on(Hls.Events.MEDIA_DETACHED, () => this.#disarmSeekToLive());
      engine?.on(Hls.Events.DESTROYING, () => {
        this.#reset();
        this.#disarmSeekToLive();
      });
      engine?.on(Hls.Events.LEVEL_LOADED, (_event: string, data: LevelLoadedData) => {
        this.#derive(data.details);
        // For `preload="none"`/`"metadata"` the manifest only loads after the
        // first play, so retry the seek once `liveEdgeStart` becomes finite.
        if (this.#seekToLivePending) this.#trySeekToLive();
      });
    }

    get targetLiveWindow() {
      return this.#targetLiveWindow;
    }

    // Derived from seekable + offset at read time. No cached state, no event.
    get liveEdgeStart() {
      if (this.#liveEdgeStartOffset === undefined) return Number.NaN;
      const { target } = this;
      if (!target) return Number.NaN;
      const { seekable } = target;
      if (!seekable.length) return Number.NaN;
      return seekable.end(seekable.length - 1) - this.#liveEdgeStartOffset;
    }

    #derive(details: LevelLoadedData['details']) {
      if (!details.live) return this.#reset();

      // `EVENT` playlists retain all segments, so the seekable window can grow
      // without bound (DVR). Standard live keeps a fixed sliding window.
      const targetLiveWindow = details.type === 'EVENT' ? Number.POSITIVE_INFINITY : 0;

      // Prefer manifest-declared HOLD-BACK / PART-HOLD-BACK when present;
      // otherwise fall back to the per-spec multiples of the target durations.
      // See https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-12
      const lowLatency = !!details.partList?.length;
      this.#liveEdgeStartOffset = lowLatency
        ? details.partHoldBack || details.partTarget * 2
        : details.holdBack || details.targetduration * 3;

      this.#setTargetLiveWindow(targetLiveWindow);
    }

    #reset() {
      this.#liveEdgeStartOffset = undefined;
      this.#setTargetLiveWindow(Number.NaN);
    }

    #setTargetLiveWindow(value: number) {
      if (Object.is(this.#targetLiveWindow, value)) return;
      this.#targetLiveWindow = value;
      this.dispatchEvent(new Event('targetlivewindowchange'));
    }

    /**
     * Arm a one-shot seek-to-live on the first user-initiated `play`. Skipped
     * when `autoplay` is set, since hls.js positions at the live edge during
     * its own startup sequence and a programmatic seek would race that.
     */
    #armSeekToLive() {
      this.#disarmSeekToLive();

      const target = this.target as HTMLMediaElement | null;
      if (!target || target.autoplay) return;

      this.#seekToLiveAbort = new AbortController();
      target.addEventListener(
        'play',
        () => {
          this.#seekToLivePending = true;
          this.#trySeekToLive();
        },
        { signal: this.#seekToLiveAbort.signal, once: true }
      );
    }

    #disarmSeekToLive() {
      this.#seekToLiveAbort?.abort();
      this.#seekToLiveAbort = null;
      this.#seekToLivePending = false;
    }

    #trySeekToLive() {
      const target = this.target as HTMLMediaElement | null;
      if (!target) return;
      const { liveEdgeStart } = this;
      if (!Number.isFinite(liveEdgeStart)) return;

      if (target.currentTime < liveEdgeStart) {
        target.currentTime = liveEdgeStart;
      }
      this.#seekToLivePending = false;
    }
  }

  return HlsJsMediaLive as unknown as Base &
    Constructor<{ readonly liveEdgeStart: number; readonly targetLiveWindow: number }>;
}
