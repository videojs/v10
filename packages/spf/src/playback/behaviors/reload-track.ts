/**
 * Live media-playlist reload loop, per track type.
 *
 * Once the presentation is resolved and a track of this type is selected,
 * repeatedly re-fetch + parse that track's media playlist on a target-duration
 * cadence — passing the prior snapshot back in so the parser carries the
 * timeline forward — and patch it into `state.presentation` until
 * `#EXT-X-ENDLIST`. Drives the live foundation at the playlist layer
 * ([live-presentation-modeling.md](../../../internal/design/spf/live-presentation-modeling.md)).
 *
 * Specialized per type via the shared `setupTrackReload` (mirrors
 * `resolve-track`): `reloadVideoTrack` / `reloadAudioTrack` / `reloadTextTrack`,
 * each gating on its own `selected*TrackId` + track type, so demuxed audio and
 * video reload independently.
 *
 * Limitations (intentional, for now): selection is read once at loop start
 * (mid-stream track switching isn't encoded in the reactor's two states);
 * PDT / discontinuity / A/V sync are handled by separate timeline transforms,
 * not here.
 */
import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import { parseMediaPlaylist } from '../../media/hls/parse-media-playlist';
import {
  deriveStreamType,
  getMediaPlaylistMetadata,
  isResolvedPresentation,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type ResolvedTrack,
  type TrackType,
} from '../../media/types';
import { findTrack, updateTrackInPresentation } from '../../media/utils/tracks';
import { fetchResolvableText as defaultFetchResolvableText, type FetchText } from '../../network/fetch';
import { AUDIO_TYPE_CONFIG, TEXT_TYPE_CONFIG, VIDEO_TYPE_CONFIG } from './track-types';

export interface ReloadTrackState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
}

/** Engine-config slice each `reload*` behavior reads. */
export interface ReloadTrackConfig {
  /** Playlist-text fetch; defaults to the plain resolvable fetch. */
  fetchResolvableText?: FetchText;
}

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId' | 'selectedTextTrackId';
type ReloadTrackStateName = 'idle' | 'reloading';

type ReloadTrackStateMap<K extends SelectedTrackKey> = {
  presentation: Signal<ReloadTrackState['presentation']>;
} & { [P in K]: ReadonlySignal<ReloadTrackState[P]> };

interface TrackReloadConfig<K extends SelectedTrackKey> {
  type: TrackType;
  selectedKey: K;
  fetchResolvableText?: FetchText;
}

/** Fallback reload cadence when the playlist carries no usable target duration. */
const FALLBACK_TARGET_DURATION = 6;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

/** A reload is "live" (new content) when the window slid or grew. */
function snapshotChanged(prev: ResolvedTrack, next: ResolvedTrack): boolean {
  return (
    getMediaPlaylistMetadata(prev)?.mediaSequence !== getMediaPlaylistMetadata(next)?.mediaSequence ||
    prev.segments.length !== next.segments.length
  );
}

function setupTrackReload<K extends SelectedTrackKey>({
  state,
  config: { type, selectedKey, fetchResolvableText = defaultFetchResolvableText },
}: {
  state: ReloadTrackStateMap<K>;
  config: TrackReloadConfig<K>;
}) {
  const derivedStateSignal = computed<ReloadTrackStateName>(() => {
    const presentation = state.presentation.get();
    const trackId = state[selectedKey].get();
    if (!isResolvedPresentation(presentation) || !trackId) return 'idle';
    return findTrack(presentation, type, trackId) ? 'reloading' : 'idle';
  });

  return createMachineReactor<ReloadTrackStateName>({
    initial: 'idle',
    monitor: () => derivedStateSignal.get(),
    states: {
      idle: {},
      reloading: {
        entry: () => {
          const ac = new AbortController();
          const trackId = state[selectedKey].get()!;

          void (async () => {
            try {
              while (!ac.signal.aborted) {
                const presentation = peek(state.presentation);
                if (!isResolvedPresentation(presentation)) break;
                // The track currently in the presentation is the prior snapshot
                // (the unresolved shell on the first pass, the last resolved
                // window thereafter); the parser carries its timeline forward.
                const previousTrack = findTrack(presentation, type, trackId);
                if (!previousTrack) break;

                const text = await fetchResolvableText(previousTrack, { signal: ac.signal });
                const parsed: ResolvedTrack = parseMediaPlaylist(text, previousTrack);
                const meta = getMediaPlaylistMetadata(parsed);
                // The first resolve (previous still an unresolved shell) counts as changed.
                const changed = !isResolvedTrack(previousTrack) || snapshotChanged(previousTrack, parsed);

                update(state.presentation, (current) => {
                  if (!isResolvedPresentation(current)) return current;
                  const patched = updateTrackInPresentation(current, parsed);
                  // streamType is stable across reloads, so recomputing it is harmless.
                  return { ...patched, streamType: deriveStreamType(meta) };
                });

                if (meta?.endList) break;

                const target = meta?.targetDuration || FALLBACK_TARGET_DURATION;
                // Spec: reload ~target duration; half that when the playlist was unchanged.
                await sleep((changed ? target : target / 2) * 1000, ac.signal);
              }
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') return;
              // TODO(error-management): route to a state-error slot once one exists.
              console.error(`[reload:${type}] media-playlist reload failed:`, error);
            }
          })();

          // State-exit (source change / destroy) aborts the loop.
          return () => ac.abort();
        },
      },
    },
  });
}

const VIDEO_TRACK_RELOAD_CONFIG = { type: VIDEO_TYPE_CONFIG.type, selectedKey: VIDEO_TYPE_CONFIG.selectedKey } as const;
const AUDIO_TRACK_RELOAD_CONFIG = { type: AUDIO_TYPE_CONFIG.type, selectedKey: AUDIO_TYPE_CONFIG.selectedKey } as const;
const TEXT_TRACK_RELOAD_CONFIG = { type: TEXT_TYPE_CONFIG.type, selectedKey: TEXT_TYPE_CONFIG.selectedKey } as const;

/** Reload the selected video track's media playlist on a live cadence. */
export const reloadVideoTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: ({ state, config = {} }: { state: ReloadTrackStateMap<'selectedVideoTrackId'>; config?: ReloadTrackConfig }) =>
    setupTrackReload({ state, config: { ...VIDEO_TRACK_RELOAD_CONFIG, ...config } }),
});

/** Reload the selected audio track's media playlist (demuxed audio). */
export const reloadAudioTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: ({ state, config = {} }: { state: ReloadTrackStateMap<'selectedAudioTrackId'>; config?: ReloadTrackConfig }) =>
    setupTrackReload({ state, config: { ...AUDIO_TRACK_RELOAD_CONFIG, ...config } }),
});

/** Reload the selected text track's media playlist (live captions). */
export const reloadTextTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId'],
  contextKeys: [],
  setup: ({ state, config = {} }: { state: ReloadTrackStateMap<'selectedTextTrackId'>; config?: ReloadTrackConfig }) =>
    setupTrackReload({ state, config: { ...TEXT_TRACK_RELOAD_CONFIG, ...config } }),
});
