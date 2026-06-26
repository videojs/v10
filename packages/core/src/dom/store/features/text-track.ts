import { findTrackElement, isCaptionOrSubtitleTrack, listen } from '@videojs/utils/dom';
import { isPlainObject, isString } from '@videojs/utils/predicate';
import { isMediaTextTrackCapable, isQuerySelectorAllCapable } from '../../../core/media/predicate';
import type { MediaTextCue, MediaTextTrack, MediaTextTrackState } from '../../../core/media/state';
import type { TextTrackLike, TextTrackListLike } from '../../../core/media/types';
import { definePlayerFeature } from '../../feature';
import { getUserPreference, setUserPreference } from './user-preferences';

const PREF_KEY = 'captions';
const VALUE_OFF = 'off';

interface TextTrackMedia {
  textTracks: TextTrackListLike;
}

function getTrackId(track: TextTrackLike, index: number): string {
  return track.id || `track:${index}:${track.kind}:${track.language}:${track.label}`;
}

export const textTrackFeature = definePlayerFeature({
  name: 'textTrack',
  state: ({ target, get }): MediaTextTrackState => ({
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    textTrackList: [],
    subtitlesShowing: false,
    toggleSubtitles(forceShow?: boolean) {
      const { media } = target();
      if (!isMediaTextTrackCapable(media)) return false;

      const subtitlesTracks = getCaptionTrackItems(media);
      if (!subtitlesTracks.length) return false;

      const showing = subtitlesTracks.some(({ track }) => track.mode === 'showing');
      const nextShowing = forceShow ?? !showing;

      for (const { track } of subtitlesTracks) {
        track.mode = nextShowing ? 'showing' : 'disabled';
      }

      const value = nextShowing ? getTrackPreference(subtitlesTracks[0]!.track) : { value: VALUE_OFF };
      if (value) setUserPreference(get(), PREF_KEY, value);
      return nextShowing;
    },
    selectSubtitlesTrack(value: string) {
      const { media } = target();
      if (!isMediaTextTrackCapable(media)) return;

      const subtitlesTracks = getCaptionTrackItems(media);
      if (!subtitlesTracks.length) return;

      if (value === VALUE_OFF) {
        for (const { track } of subtitlesTracks) {
          track.mode = 'disabled';
        }
        setUserPreference(get(), PREF_KEY, { value } satisfies TextTrackPreference);
        return;
      }

      const active = subtitlesTracks.find(({ index, track }) => getTrackId(track, index) === value);
      const track = active?.track;
      if (!track) return;

      for (const { track: candidate } of subtitlesTracks) {
        candidate.mode = candidate === track ? 'showing' : 'disabled';
      }

      const prefValue = getTrackPreference(track);
      if (prefValue) setUserPreference(get(), PREF_KEY, prefValue);
    },
  }),

  attach({ target, signal, set, store }) {
    const { media } = target;

    if (!isMediaTextTrackCapable(media)) return;

    let trackCleanup: AbortController | null = null;
    let ready = false;
    let pending = getTextTrackPreference(store.state);
    let lastStored = getPreferenceString(pending);

    const apply = (value: TextTrackPreference): boolean => {
      const tracks = getCaptionTrackItems(media);
      if (!tracks.length) return false;

      if (value.value === VALUE_OFF) {
        for (const { track } of tracks) track.mode = 'disabled';
        return true;
      }

      const active =
        (value.id !== undefined ? tracks.find(({ track }) => track.id === value.id) : undefined) ??
        tracks.find(({ index, track }) => {
          return getTrackPreferenceValue(track) === value.value || getTrackId(track, index) === value.value;
        });
      if (!active) return false;

      for (const { track } of tracks) {
        track.mode = track === active.track ? 'showing' : 'disabled';
      }

      return true;
    };

    const sync = (persist = false) => {
      trackCleanup?.abort();
      trackCleanup = new AbortController();
      const hadPending = pending !== undefined;

      if (pending && apply(pending)) {
        pending = undefined;
      }

      let chaptersTrack: TextTrackLike | null = null;
      let thumbnailTrack: TextTrackLike | null = null;
      const textTrackList: MediaTextTrack[] = [];
      let subtitlesShowing = false;

      for (let i = 0; i < media.textTracks.length; i++) {
        const track = media.textTracks[i]!;
        if (!chaptersTrack && track.kind === 'chapters') chaptersTrack = track;
        if (!thumbnailTrack && track.kind === 'metadata' && track.label === 'thumbnails') thumbnailTrack = track;

        textTrackList.push({
          id: getTrackId(track, i),
          kind: track.kind as TextTrackKind,
          label: track.label,
          language: track.language,
          mode: track.mode,
        });

        if (isCaptionOrSubtitleTrack(track) && track.mode === 'showing') {
          subtitlesShowing = true;
        }
      }

      // VTTCue extends TextTrackCue with `text` — cast via `unknown` since
      // the CueList is typed as TextTrackCue which doesn't expose `text`.
      const chaptersCues: MediaTextCue[] = chaptersTrack?.cues
        ? (Array.from(chaptersTrack.cues) as unknown as MediaTextCue[])
        : [];
      const thumbnailCues: MediaTextCue[] = thumbnailTrack?.cues
        ? (Array.from(thumbnailTrack.cues) as unknown as MediaTextCue[])
        : [];

      let thumbnailTrackSrc: string | null = null;
      if (thumbnailTrack) {
        const el = findTrackElement(media, thumbnailTrack);
        thumbnailTrackSrc = el?.src ?? null;
      }

      // Listen for <track> load events on tracks that don't have cues yet.
      // `addtrack` fires before cues are parsed — we need the `load` event
      // on the <track> element to know when cues are ready.
      const tracks = (isQuerySelectorAllCapable<HTMLTrackElement>(media) && media.querySelectorAll('track')) || [];
      const shadowTracks = (media instanceof HTMLElement && media.shadowRoot?.querySelectorAll('track')) || [];

      for (const trackEl of [...tracks, ...shadowTracks]) {
        if (!trackEl.track?.cues?.length) {
          listen(trackEl, 'load', () => sync(), { signal: trackCleanup.signal });
        }
      }

      set({ chaptersCues, thumbnailCues, thumbnailTrackSrc, textTrackList, subtitlesShowing });

      if (persist && ready && !hadPending) {
        const value = getCurrentTextTrackPreference(media);
        if (value && (value.value !== VALUE_OFF || lastStored !== undefined)) {
          lastStored = getPreferenceString(value);
          setUserPreference(store.state, PREF_KEY, value);
        }
      }

      ready = true;
    };

    const syncPreference = () => {
      const value = getTextTrackPreference(store.state);
      const nextStored = getPreferenceString(value);
      if (nextStored === lastStored) return;

      pending = value ?? (lastStored !== undefined ? { value: VALUE_OFF } : undefined);
      lastStored = nextStored;
      sync();
    };

    sync();
    const unsubscribe = store.subscribe(syncPreference);
    signal.addEventListener('abort', unsubscribe, { once: true });

    const textTracks = media.textTracks;
    if (textTracks instanceof EventTarget) {
      listen(textTracks, 'addtrack', () => sync(true), { signal });
      listen(textTracks, 'removetrack', () => sync(true), { signal });
      listen(textTracks, 'change', () => sync(true), { signal });
    }
    listen(media, 'loadstart', () => sync(), { signal });

    signal.addEventListener('abort', () => trackCleanup?.abort(), { once: true });
  },
});

interface TextTrackPreference {
  value: string;
  id?: string | undefined;
}

function isTextTrackPreference(value: unknown): value is TextTrackPreference {
  return isPlainObject(value) && isString(value.value) && (value.id === undefined || isString(value.id));
}

function getTextTrackPreference(state: Readonly<Record<string, unknown>>): TextTrackPreference | undefined {
  const value = getUserPreference(state, PREF_KEY);
  return isTextTrackPreference(value) ? value : undefined;
}

function getCurrentTextTrackPreference(media: TextTrackMedia): TextTrackPreference | undefined {
  const tracks = getCaptionTrackItems(media);
  if (!tracks.length) return undefined;

  const item = tracks.find(({ track }) => track.mode === 'showing');
  if (!item) return { value: VALUE_OFF };

  return getTrackPreference(item.track);
}

function getCaptionTrackItems(media: TextTrackMedia): { index: number; track: TextTrackLike }[] {
  return Array.from(media.textTracks)
    .map((track, index) => ({ index, track }))
    .filter(({ track }) => isCaptionOrSubtitleTrack(track));
}

function getTrackPreferenceValue(track: TextTrackLike): string | undefined {
  return track.language || track.id || track.label || undefined;
}

function getTrackPreference(track: TextTrackLike): TextTrackPreference | undefined {
  const value = getTrackPreferenceValue(track);
  if (!value) return undefined;
  return {
    value,
    ...(track.id ? { id: track.id } : {}),
  };
}

function getPreferenceString(value: TextTrackPreference | undefined): string | undefined {
  return value ? `${value.value}:${value.id ?? ''}` : undefined;
}
