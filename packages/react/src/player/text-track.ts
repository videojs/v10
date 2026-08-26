import { isMediaTextTrackCapable, type Media, type TextCueLike, type TextTrackLike } from '@videojs/media';
import {
  type CreateTextTrackOptions,
  createTextTrack,
  getActiveTextTrack,
  getTextTrackCues,
  type TextTrackKindFilter,
  watchActiveTextTrack,
  watchTextTrackCues,
} from '@videojs/media/dom';
import { noop } from '@videojs/utils/function';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { useMedia } from './context';

export type UseTextTrackOptions = CreateTextTrackOptions;

/**
 * Create a programmatic native text track owned by the calling component.
 *
 * The track follows the current player media and is removed when the component unmounts or the options change.
 *
 * @param options - Track metadata and initial mode.
 */
export function useTextTrack(options: UseTextTrackOptions): TextTrackLike | null {
  const media = useMedia();
  const { kind, label, language, mode } = options;
  const store = useMemo(
    () => createManagedTextTrackStore(media, { kind, label, language, mode }),
    [media, kind, label, language, mode]
  );

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/**
 * Observe the active text track matching one or more kinds.
 *
 * An active native track has any mode other than `disabled`; this includes `hidden` chapter and metadata tracks whose
 * cues update without being rendered.
 *
 * @param kind - Text track kind or kinds to match.
 */
export function useActiveTextTrack(kind: TextTrackKindFilter): TextTrackLike | null {
  const media = useMedia();
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!isMediaTextTrackCapable(media)) return noop;

      return watchActiveTextTrack(media, kind, onChange);
    },
    [media, kind]
  );
  const getSnapshot = useCallback(
    () => (isMediaTextTrackCapable(media) ? getActiveTextTrack(media, kind) : null),
    [media, kind]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Observe all cues on a text track.
 *
 * The returned array is replaced when the native track emits a cue change, its `<track>` element loads, or its media
 * source starts loading.
 *
 * @param track - Text track to observe, or `null` when unavailable.
 */
export function useTextCues(track: TextTrackLike | null): TextCueLike[] {
  return useCueSnapshot(track, false);
}

/**
 * Observe cues active at the current playback position.
 *
 * @param track - Text track to observe, or `null` when unavailable.
 */
export function useActiveTextCues(track: TextTrackLike | null): TextCueLike[] {
  return useCueSnapshot(track, true);
}

function useCueSnapshot(track: TextTrackLike | null, active: boolean): TextCueLike[] {
  const media = useMedia();
  const store = useMemo(() => createTextCueStore(media, track, active), [media, track, active]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

interface TextCueStore {
  getSnapshot(): TextCueLike[];
  subscribe(onChange: () => void): () => void;
}

interface ManagedTextTrackStore {
  getSnapshot(): TextTrackLike | null;
  subscribe(onChange: () => void): () => void;
}

function createManagedTextTrackStore(media: Media | null, options: CreateTextTrackOptions): ManagedTextTrackStore {
  let handle: ReturnType<typeof createTextTrack> = null;
  let track: TextTrackLike | null = null;
  const subscribers = new Set<() => void>();

  return {
    getSnapshot: () => track,
    subscribe(onChange) {
      subscribers.add(onChange);

      if (subscribers.size === 1 && isMediaTextTrackCapable(media)) {
        handle = createTextTrack(media, options);
        track = handle?.track ?? null;

        for (const subscriber of subscribers) subscriber();
      }

      return () => {
        subscribers.delete(onChange);

        if (subscribers.size > 0) return;

        handle?.destroy();
        handle = null;
        track = null;
      };
    },
  };
}

function createTextCueStore(media: Media | null, track: TextTrackLike | null, active: boolean): TextCueStore {
  let cues = getTextTrackCues(track, active);

  return {
    getSnapshot: () => cues,
    subscribe(onChange) {
      if (!track) return noop;

      return watchTextTrackCues(media, track, active, (next) => {
        cues = next;
        onChange();
      });
    },
  };
}
