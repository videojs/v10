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
}

const DEFAULT_SNAPSHOT: MediaSnapshot = {
  paused: true,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  muted: false,
};

function readSnapshot(media: MediaFull): MediaSnapshot {
  return {
    paused: media.paused,
    currentTime: media.currentTime,
    duration: media.duration,
    playbackRate: media.playbackRate,
    volume: media.volume,
    muted: media.muted,
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

      const time = Number(params.get('time'));
      if (params.has('time') && Number.isFinite(time)) media.currentTime = time;

      if (params.get('paused') === '0') media.play().catch(() => {});
    };

    media.addEventListener('loadedmetadata', apply, { signal: controller.signal });
    return () => controller.abort();
  }, [media]);
}
