import type { Request, RequestContext, Slice } from '@videojs/store';

import { createSlice } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

import { resolveStreamType, serializeTimeRanges } from './utils';

// ----------------------------------------
// Types
// ----------------------------------------

/**
 * Stream type based on duration and seekability.
 */
export type StreamType = 'on-demand' | 'live' | 'live-dvr' | 'unknown';

/**
 * Playback state tracked by the playback slice.
 */
export interface PlaybackState {
  /** Whether the media is paused. */
  paused: boolean;
  /** Whether the media has ended. */
  ended: boolean;
  /** Whether playback has started (user has triggered play at least once). */
  started: boolean;
  /** Whether the media is waiting for data. */
  waiting: boolean;
  /** Current playback time in seconds. */
  currentTime: number;
  /** Total duration in seconds (Infinity for live streams). */
  duration: number;
  /** Buffered time ranges as [start, end] tuples. */
  buffered: Array<[number, number]>;
  /** Seekable time ranges as [start, end] tuples. */
  seekable: Array<[number, number]>;
  /** Current volume (0-1). */
  volume: number;
  /** Whether audio is muted. */
  muted: boolean;
  /** Whether enough data has loaded to start playback. */
  canPlay: boolean;
  /** Current media source URL or object. */
  source: string | null;
  /** Stream type based on duration and seekability. */
  streamType: StreamType;
}

/**
 * Request types for the playback slice.
 */
export interface PlaybackRequests {
  [key: string]: Request<any, any>;
  play: Request<void, void>;
  pause: Request<void, void>;
  seek: Request<number, number>;
  changeVolume: Request<number, number>;
  toggleMute: Request<void, boolean>;
  changeSource: Request<string, string>;
}

// ----------------------------------------
// Slice
// ----------------------------------------

/**
 * Playback slice for HTMLMediaElement.
 *
 * Tracks playback state and provides request handlers for controlling playback.
 */
export const playback: Slice<HTMLMediaElement, PlaybackState, PlaybackRequests> = createSlice<
  HTMLMediaElement,
  PlaybackState,
  PlaybackRequests
>({
  initialState: {
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    currentTime: 0,
    duration: 0,
    buffered: [],
    seekable: [],
    volume: 1,
    muted: false,
    canPlay: false,
    source: null,
    streamType: 'unknown',
  },

  getSnapshot: ({ target }) => ({
    paused: target.paused,
    ended: target.ended,
    started: !target.paused || target.currentTime > 0,
    waiting: target.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && !target.paused,
    currentTime: target.currentTime,
    duration: target.duration || 0,
    buffered: serializeTimeRanges(target.buffered),
    seekable: serializeTimeRanges(target.seekable),
    volume: target.volume,
    muted: target.muted,
    canPlay: target.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA,
    source: target.currentSrc || target.src || null,
    streamType: resolveStreamType(target.duration, target.seekable),
  }),

  subscribe: ({ target, update, signal }) => {
    // Playback state events
    listen(target, 'play', () => update({ paused: false, started: true }), { signal });
    listen(target, 'pause', () => update({ paused: true }), { signal });
    listen(target, 'ended', () => update({ ended: true }), { signal });
    listen(target, 'playing', () => update({ waiting: false, ended: false }), { signal });
    listen(target, 'waiting', () => update({ waiting: true }), { signal });

    // Time updates
    listen(target, 'timeupdate', () => update({ currentTime: target.currentTime }), { signal });
    listen(
      target,
      'durationchange',
      () =>
        update({
          duration: target.duration || 0,
          streamType: resolveStreamType(target.duration, target.seekable),
        }),
      { signal },
    );

    // Buffering
    listen(
      target,
      'progress',
      () =>
        update({
          buffered: serializeTimeRanges(target.buffered),
          seekable: serializeTimeRanges(target.seekable),
        }),
      { signal },
    );

    // Seeking
    listen(target, 'seeked', () => update({ currentTime: target.currentTime }), { signal });

    // Volume
    listen(target, 'volumechange', () => update({ volume: target.volume, muted: target.muted }), { signal });

    // Loading state
    listen(target, 'canplay', () => update({ canPlay: true, waiting: false }), { signal });
    listen(target, 'canplaythrough', () => update({ canPlay: true, waiting: false }), { signal });
    listen(
      target,
      'loadedmetadata',
      () =>
        update({
          duration: target.duration || 0,
          streamType: resolveStreamType(target.duration, target.seekable),
        }),
      { signal },
    );
    listen(target, 'loadstart', () => update({ source: target.currentSrc || target.src || null }), { signal });
    listen(
      target,
      'emptied',
      () =>
        update({
          canPlay: false,
          buffered: [],
          seekable: [],
          duration: 0,
          currentTime: 0,
          ended: false,
          source: null,
          streamType: 'unknown',
        }),
      { signal },
    );
  },

  request: {
    /** Start or resume playback. */
    play: async (_input: void, { target }: RequestContext<HTMLMediaElement>): Promise<void> => {
      await target.play();
    },

    /** Pause playback. */
    pause: (_input: void, { target }: RequestContext<HTMLMediaElement>): void => {
      target.pause();
    },

    /**
     * Seek to a specific time.
     * @param time - Time in seconds to seek to
     * @returns The time that was seeked to
     */
    seek: (time: number, { target }: RequestContext<HTMLMediaElement>): number => {
      target.currentTime = time;
      return time;
    },

    /**
     * Change the volume level.
     * @param volume - Volume level (0-1)
     * @returns The volume that was set
     */
    changeVolume: (volume: number, { target }: RequestContext<HTMLMediaElement>): number => {
      target.volume = Math.max(0, Math.min(1, volume));
      return target.volume;
    },

    /**
     * Toggle mute state.
     * @returns The new muted state
     */
    toggleMute: (_input: void, { target }: RequestContext<HTMLMediaElement>): boolean => {
      target.muted = !target.muted;
      return target.muted;
    },

    /**
     * Change the media source.
     * @param src - The new source URL
     * @returns The source that was set
     */
    changeSource: (src: string, { target }: RequestContext<HTMLMediaElement>): string => {
      target.src = src;
      return src;
    },
  },
});
