// Copy of `media-played-ranges-mixin@0.1.0` from `muxinc/media-elements`,
// ported to TypeScript and adapted to fit the v10 codebase.
//
// Source: https://github.com/muxinc/media-elements
// License: MIT

import { isNumber } from '@videojs/utils/predicate';
import { defineExtension } from '../../../core/media/media-extension';
import { addLayer, MediaLayer } from '../../../core/media/media-layer';
import type { TimeRangeLike } from '../../../core/media/types';

export interface PlayedRange {
  start: number;
  end: number;
}

export interface PlaybackEventParam {
  time?: number;
}

export type MediaPlayedRangesMedia = MediaLayer & {
  currentTime: number;
  paused: boolean;
};

/**
 * Tracks played ranges for media hosts lacking a native
 * `HTMLMediaElement.played` (e.g. iframe-based embeds like Vimeo). Listens
 * for standard media events on the host and exposes a `TimeRanges`-like
 * `played` getter via a {@link MediaLayer}.
 *
 * @example mediaPlayedRanges().install(media);
 */
export class MediaPlayedRanges {
  readonly name = 'media-played-ranges';

  install(media: MediaPlayedRangesMedia, { signal }: { signal: AbortSignal }) {
    const layer = new MediaPlayedRangesLayer();
    const removeLayer = addLayer(media, layer);

    const options = { signal };
    media.addEventListener('play', () => layer.onPlaybackStart({ time: media.currentTime }), options);
    media.addEventListener('pause', () => layer.onPlaybackStop({ time: media.currentTime }), options);
    media.addEventListener('ended', () => layer.onPlaybackStop({ time: media.currentTime }), options);
    media.addEventListener('seeking', () => layer.onSeeking(), options);
    media.addEventListener('seeked', () => layer.onSeeked({ time: media.currentTime }), options);

    return removeLayer;
  }
}

export const mediaPlayedRanges = defineExtension<void, MediaPlayedRangesMedia, MediaPlayedRanges>(
  () => new MediaPlayedRanges()
);

class MediaPlayedRangesLayer extends MediaLayer {
  #playedRanges: PlayedRange[] = [];
  #currentPlayedRange: PlayedRange | null = null;
  #rangeEpsilon = 0.5;

  onPlaybackStart(param: PlaybackEventParam = {}): void {
    const host = this.root as MediaPlayedRangesMedia;
    const t = isNumber(param.time) ? param.time : host.currentTime;
    if (!this.#currentPlayedRange) {
      this.#currentPlayedRange = { start: t, end: t };
    }
  }

  onSeeking(): void {
    this.#commitCurrentRange();
  }

  onSeeked(param: PlaybackEventParam = {}): void {
    const host = this.root as MediaPlayedRangesMedia;
    const t = isNumber(param.time) ? param.time : host.currentTime;
    this.#currentPlayedRange = { start: t, end: t };
  }

  onPlaybackStop(param: PlaybackEventParam = {}): void {
    const host = this.root as MediaPlayedRangesMedia;
    const t = isNumber(param.time) ? param.time : host.currentTime;
    this.#commitCurrentRange(t);
  }

  #commitCurrentRange(time?: number): void {
    if (!this.#currentPlayedRange) return;
    if (isNumber(time)) {
      this.#currentPlayedRange.end = time;
    }
    const { start, end } = this.#currentPlayedRange;
    this.#currentPlayedRange = null;
    this.#addPlayedRange(start, end);
  }

  #addPlayedRange(start: number, end: number): void {
    if (start >= end) return;
    const allRanges: PlayedRange[] = [...this.#playedRanges, { start, end }];
    allRanges.sort((a, b) => a.start - b.start);
    const merged: PlayedRange[] = [];
    for (const range of allRanges) {
      const last = merged.length ? merged[merged.length - 1] : null;
      if (!last) {
        merged.push({ ...range });
        continue;
      }
      if (range.start <= last.end + this.#rangeEpsilon) {
        last.start = Math.min(last.start, range.start);
        last.end = Math.max(last.end, range.end);
      } else {
        merged.push({ ...range });
      }
    }
    this.#playedRanges = merged;
  }

  get played(): TimeRangeLike {
    const host = this.root as MediaPlayedRangesMedia;
    const time = host.currentTime;
    if (!host.paused && !this.#currentPlayedRange && isNumber(time)) {
      this.#currentPlayedRange = { start: time, end: time };
    }
    if (this.#currentPlayedRange && isNumber(time)) {
      if (time > this.#currentPlayedRange.end) {
        this.#currentPlayedRange.end = time;
      }
      this.#addPlayedRange(this.#currentPlayedRange.start, this.#currentPlayedRange.end);
    }
    if (!this.#playedRanges.length) {
      return createTimeRanges([[0, 0]]);
    }
    return createTimeRanges(this.#playedRanges.map((r) => [r.start, r.end]));
  }
}

function createTimeRanges(ranges: number[][]): TimeRangeLike {
  Object.defineProperties(ranges, {
    start: { value: (i: number) => ranges[i]?.[0] ?? 0 },
    end: { value: (i: number) => ranges[i]?.[1] ?? 0 },
  });
  return ranges as unknown as TimeRangeLike;
}
