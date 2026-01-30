import { isValidNumber } from '@videojs/utils';
import { listen } from '@videojs/utils/dom';
import type { FeatureActions, FeatureCreator, FeatureState } from '../types';

type TimeTargets = { media: HTMLMediaElement };

export const time = (() => ({
  initialState: {
    /** Current playback position in seconds. */
    currentTime: 0,
    /** Total duration in seconds. */
    duration: 0,
    /** Seekable range [start, end] in seconds, or undefined. */
    seekable: undefined as [number, number] | undefined,
  },

  getSnapshot: ({ media }) => ({
    currentTime: media.currentTime,
    duration: getDuration(media),
    seekable: getSeekable(media),
  }),

  subscribe: {
    media: ({ media }, update, signal) => {
      const eventsCurrentTime = ['timeupdate', 'loadedmetadata'] as const;
      eventsCurrentTime.forEach((event) => listen(media, event, update, { signal }));

      const eventsDuration = ['loadedmetadata', 'durationchange', 'emptied'] as const;
      eventsDuration.forEach((event) => listen(media, event, update, { signal }));

      const eventsSeekable = ['loadedmetadata', 'emptied', 'progress', 'seekablechange'] as const;
      eventsSeekable.forEach((event) => listen(media, event, update, { signal }));
    },
  },

  actions: ({ media }) => ({
    setCurrentTime(value: number) {
      if (!isValidNumber(value)) return;
      media.currentTime = value;
    },
  }),
})) satisfies FeatureCreator<TimeTargets>;

export type TimeState = FeatureState<typeof time>;
export type TimeActions = FeatureActions<typeof time>;

function getSeekable(media: HTMLMediaElement | undefined): [number, number] | undefined {
  if (!media?.seekable?.length) return undefined;

  const start = media.seekable.start(0);
  const end = media.seekable.end(media.seekable.length - 1);

  if (!start && !end) return undefined;

  return [Number(start.toFixed(3)), Number(end.toFixed(3))];
}

function getDuration(media: HTMLMediaElement | undefined): number {
  if (!media?.duration || Number.isNaN(media.duration) || !Number.isFinite(media.duration)) {
    return 0;
  }
  return media.duration;
}
