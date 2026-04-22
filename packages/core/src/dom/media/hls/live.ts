import type { Constructor } from '@videojs/utils/types';
import type { LevelLoadedData } from 'hls.js';
import Hls from 'hls.js';
import type { HlsEngineHost } from './types';

export function HlsJsMediaLiveMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsMediaLive extends (BaseClass as Constructor<HlsEngineHost>) {
    #targetLiveWindow = Number.NaN;
    #liveEdgeStartOffset: number | undefined;

    constructor(...args: any[]) {
      super(...args);

      this.engine?.on(Hls.Events.MANIFEST_LOADING, () => this.#reset());
      this.engine?.on(Hls.Events.DESTROYING, () => this.#reset());
      this.engine?.on(Hls.Events.LEVEL_LOADED, (_event: string, data: LevelLoadedData) => {
        this.#derive(data.details);
      });
    }

    get targetLiveWindow() {
      return this.#targetLiveWindow;
    }

    // Derived from seekable + offset at read time. No cached state, no event.
    get liveEdgeStart() {
      if (this.#liveEdgeStartOffset === undefined) return Number.NaN;
      const target = this.target ?? null;
      if (!target) return Number.NaN;
      const { seekable } = target;
      if (!seekable.length) return Number.NaN;
      return seekable.end(seekable.length - 1) - this.#liveEdgeStartOffset;
    }

    #derive(details: LevelLoadedData['details']) {
      if (!details.live) {
        this.#setOffset(undefined);
        this.#setTargetLiveWindow(Number.NaN);
        return;
      }

      // `EVENT` playlists retain all segments, so the seekable window can grow
      // without bound (DVR). Standard live keeps a fixed sliding window.
      const targetLiveWindow = details.type === 'EVENT' ? Number.POSITIVE_INFINITY : 0;

      // Prefer manifest-declared HOLD-BACK / PART-HOLD-BACK when present;
      // otherwise fall back to the per-spec multiples of the target durations.
      // See https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-12
      const lowLatency = !!details.partList?.length;
      const offset = lowLatency
        ? details.partHoldBack || details.partTarget * 2
        : details.holdBack || details.targetduration * 3;

      this.#setOffset(offset);
      this.#setTargetLiveWindow(targetLiveWindow);
    }

    #reset() {
      this.#setOffset(undefined);
      this.#setTargetLiveWindow(Number.NaN);
    }

    #setOffset(value: number | undefined) {
      this.#liveEdgeStartOffset = value;
    }

    #setTargetLiveWindow(value: number) {
      if (Object.is(this.#targetLiveWindow, value)) return;
      this.#targetLiveWindow = value;
      this.dispatchEvent(new Event('targetlivewindowchange'));
    }
  }

  return HlsJsMediaLive as unknown as Base &
    Constructor<{ readonly liveEdgeStart: number; readonly targetLiveWindow: number }>;
}
