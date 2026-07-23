import type { MediaFull } from '@videojs/core';
import { useEffect, useState } from 'react';
import { STATE_EVENTS } from './constants';
import { readParams } from './params';

export interface MediaSnapshot {
  paused: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
  buffered: number;
}

const DEFAULT_SNAPSHOT: MediaSnapshot = {
  paused: true,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  muted: false,
  buffered: 0,
};

/** End (in seconds) of the buffered range covering the current time; 0 if none. */
export function bufferedEnd(media: MediaFull): number {
  const ranges = media.buffered;
  if (!ranges || ranges.length === 0) return 0;
  const time = media.currentTime;
  for (let i = 0; i < ranges.length; i++) {
    if (ranges.start(i) <= time && time <= ranges.end(i)) return ranges.end(i);
  }
  return ranges.end(ranges.length - 1);
}

/** Fraction (0–1) of the media duration that has buffered ahead of the current time. */
export function bufferedRatio(media: MediaFull): number {
  const duration = media.duration;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(1, Math.max(0, bufferedEnd(media) / duration));
}

function readSnapshot(media: MediaFull): MediaSnapshot {
  return {
    paused: media.paused,
    currentTime: media.currentTime,
    duration: media.duration,
    playbackRate: media.playbackRate,
    volume: media.volume,
    muted: media.muted,
    buffered: bufferedEnd(media),
  };
}

/** Subscribe to the events that affect the controls and return a live snapshot. */
export function useMediaSnapshot(media: MediaFull | null): MediaSnapshot {
  const [snapshot, setSnapshot] = useState<MediaSnapshot>(DEFAULT_SNAPSHOT);

  useEffect(() => {
    if (!media) {
      setSnapshot(DEFAULT_SNAPSHOT);
      return;
    }

    const controller = new AbortController();
    const sync = () => setSnapshot(readSnapshot(media));

    sync();
    for (const type of STATE_EVENTS) {
      media.addEventListener(type, sync, { signal: controller.signal });
    }

    return () => controller.abort();
  }, [media]);

  return snapshot;
}

/** Restore persisted action params onto the media each time metadata loads. */
export function useRestoreFromParams(media: MediaFull | null) {
  useEffect(() => {
    if (!media) return;

    const controller = new AbortController();
    const apply = () => {
      const params = readParams();

      const rate = Number(params.get('rate'));
      if (params.has('rate') && Number.isFinite(rate) && rate > 0) media.playbackRate = rate;

      const volume = Number(params.get('volume'));
      if (params.has('volume') && Number.isFinite(volume)) media.volume = volume;

      if (params.has('muted')) media.muted = params.get('muted') === '1';

      if (params.has('loop')) media.loop = params.get('loop') === '1';

      const time = Number(params.get('time'));
      if (params.has('time') && Number.isFinite(time)) media.currentTime = time;

      if (params.get('paused') === '0') media.play().catch(() => {});
    };

    media.addEventListener('loadedmetadata', apply, { signal: controller.signal });
    return () => controller.abort();
  }, [media]);
}
