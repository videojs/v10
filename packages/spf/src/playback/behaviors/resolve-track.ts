import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import { ConcurrentRunner, Task } from '../../core/tasks/task';
import { parseMediaPlaylist } from '../../media/hls/parse-media-playlist';
import type { MaybeResolvedPresentation, PartiallyResolvedTrack, ResolvedTrack } from '../../media/types';
import { isResolvedPresentation, isResolvedTrack } from '../../media/types';
import type { GetCdnId } from '../../media/utils/cdn';
import { findTrack, updateTrackInPresentation } from '../../media/utils/tracks';
import { fetchResolvableText as defaultFetchResolvableText, type FetchText } from '../../network/fetch';
import { failoverFetch } from '../primitives/failover-fetch';
import { AUDIO_TYPE_CONFIG, TEXT_TYPE_CONFIG, VIDEO_TYPE_CONFIG } from '../primitives/track-types';

// ============================================================================
// Specialization helper
//
// `setupTrackResolution` has the same shape as a Behavior `setup` function:
// `({ state, config }) => cleanup`. Each `resolveXTrack` export below calls it
// from inside its own `defineBehavior` setup, supplying its per-type config
// inline. The orchestration — gate on a selection, short-circuit when the
// track is already resolved or missing, schedule the fetch+parse, and patch
// the resolved track back into `state.presentation` — is shared.
// ============================================================================

/**
 * State shape for track resolution. Uses `MaybeResolvedPresentation` so it
 * matches the engine's slot type; resolution narrows internally.
 */
export interface ResolveTrackState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
  failedCdns?: string[];
}

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId' | 'selectedTextTrackId';

type ResolveTrackStateMap<K extends SelectedTrackKey> = {
  presentation: Signal<ResolveTrackState['presentation']>;
} & { [P in K]: ReadonlySignal<ResolveTrackState[P]> };

interface TrackResolutionConfig<K extends SelectedTrackKey> {
  selectedKey: K;
  findTrackToResolve: (
    presentation: MaybeResolvedPresentation,
    trackId: string
  ) => PartiallyResolvedTrack | ResolvedTrack | undefined;
  /** Fetch a track's media-playlist text — already failover-decorated by the behavior. */
  fetchResolvableText?: FetchText;
}

/**
 * Engine-config slice each `resolve*` behavior reads to build its failover-
 * decorated playlist fetch.
 */
interface ResolveTrackConfig {
  /** CDN-id derivation for the failover trip; defaults to origin-based `getCdnId`. */
  getCdnId?: GetCdnId;
}

function setupTrackResolution<K extends SelectedTrackKey>({
  state,
  config: { selectedKey, findTrackToResolve, fetchResolvableText = defaultFetchResolvableText },
}: {
  state: ResolveTrackStateMap<K>;
  config: TrackResolutionConfig<K>;
}) {
  // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createTaskRunner() with args TBD),
  // likely eventually passed down via config or a new "definitions" argument. This will allow us to decide if we want our task runner/scheduler
  // to e.g. run concurrently (like we currently are), serially with a queue, or abort the previous task and replace it with the newly scheduled one. (CJP).
  const runner = new ConcurrentRunner();

  // Reactor states model the FSM the previous effect-based body was
  // hand-rolling. 'presentation-resolved' is entered when the
  // presentation is fully parsed (has a Ham id + selectionSets); leaving
  // it (presentation cleared or reset to an unresolved value) aborts all
  // in-flight tasks via the entry-cleanup. Most URL changes go through
  // 'presentation-unresolved' naturally (set undefined → set new partial
  // → re-parse), so the common case is covered by state-exit alone; the
  // task body's commit-time id check covers the pathological
  // resolved→resolved-without-unresolved transition.
  const derivedStateSignal = computed(() =>
    isResolvedPresentation(state.presentation.get())
      ? ('presentation-resolved' as const)
      : ('presentation-unresolved' as const)
  );

  return createMachineReactor({
    initial: 'presentation-unresolved',
    monitor: () => derivedStateSignal.get(),
    states: {
      'presentation-unresolved': {},
      'presentation-resolved': {
        // `entry` runs on state entry; the function it returns is the
        // state-exit cleanup. Returning `() => runner.abortAll()` binds
        // abort-of-in-flight-resolutions to leaving 'presentation-resolved'
        // (presentation cleared/reset, or behavior destroyed) —
        // source-change cancellation expressed structurally through the
        // state machine.
        entry: () => () => runner.abortAll(),
        effects: [
          () => {
            // The reactor's state transitions handle relevant presentation
            // changes (presentation-resolved ↔ presentation-unresolved);
            // within 'presentation-resolved' we peek (untracked read) so
            // internal updates (segments added by sibling tasks) don't
            // re-fire the effect.
            const presentation = peek(state.presentation);
            const trackId = state[selectedKey].get();
            if (!presentation || !trackId) return;

            const track = findTrackToResolve(presentation, trackId);
            if (!track || isResolvedTrack(track)) return;

            runner.schedule(
              // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createResolveTrackTask(track, context, config)),
              // likely eventually passed down via config or a new "definitions" argument (CJP).
              new Task(
                async (signal) => {
                  // `fetchResolvableText` is the behavior's failover-decorated
                  // fetch: it trips the CDN on a failed fetch (network error or
                  // non-OK status). A parse failure is a content issue, not a
                  // CDN-availability one, so it doesn't trip.
                  const text = await fetchResolvableText(track, { signal });
                  const mediaTrack = parseMediaPlaylist(text, track);

                  // Updater handles undefined inputs by returning current
                  // unchanged; isResolvedPresentation narrows for the patch.
                  // State-exit on resolving→unresolved fires runner.abortAll
                  // before any URL change settles, and per the Fetch spec the
                  // signal abort cancels in-flight body reads — so by the
                  // time we reach this point the presentation we resolved
                  // against is the live one.
                  update(state.presentation, (current) =>
                    isResolvedPresentation(current) ? updateTrackInPresentation(current, mediaTrack) : current
                  );
                },
                { id: track.id }
              )
            );
          },
        ],
      },
    },
  });
}

// ============================================================================
// Per-helper-per-type configs — defaults that variants spread engine config over
// ============================================================================

const VIDEO_TRACK_RESOLUTION_CONFIG = {
  ...VIDEO_TYPE_CONFIG,
  findTrackToResolve: (presentation: MaybeResolvedPresentation, trackId: string) =>
    findTrack(presentation, 'video', trackId),
} as const;

const AUDIO_TRACK_RESOLUTION_CONFIG = {
  ...AUDIO_TYPE_CONFIG,
  findTrackToResolve: (presentation: MaybeResolvedPresentation, trackId: string) =>
    findTrack(presentation, 'audio', trackId),
} as const;

const TEXT_TRACK_RESOLUTION_CONFIG = {
  ...TEXT_TYPE_CONFIG,
  findTrackToResolve: (presentation: MaybeResolvedPresentation, trackId: string) =>
    findTrack(presentation, 'text', trackId),
} as const;

// ============================================================================
// Specialized exports — one per track type
// ============================================================================

/**
 * Resolve unresolved video tracks. Schedules a fetch task whenever the
 * selected video track is partially resolved, parses the manifest, and
 * writes the resolved track back into `state.presentation`.
 */
export const resolveVideoTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: ({
    state,
    config = {},
  }: {
    state: ResolveTrackStateMap<'selectedVideoTrackId'>;
    config?: ResolveTrackConfig;
  }) => {
    // Engine `config` layers over the per-type defaults (mirrors the other
    // per-type variants, see track-types.ts); `failoverFetch` reads its
    // `selectedKey` + `getCdnId` from the merged result. `fetchResolvableText`
    // is then placed AFTER the spread so the failover-decorated fetch wins —
    // unlike segments, playlists expose no overridable per-type fetch.
    const trackConfig = { ...VIDEO_TRACK_RESOLUTION_CONFIG, ...config };
    return setupTrackResolution({
      state,
      config: { ...trackConfig, fetchResolvableText: failoverFetch(defaultFetchResolvableText, state, trackConfig) },
    });
  },
});

/**
 * Resolve unresolved audio tracks. Same shape as `resolveVideoTrack`,
 * narrowed to audio.
 */
export const resolveAudioTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: ({
    state,
    config = {},
  }: {
    state: ResolveTrackStateMap<'selectedAudioTrackId'>;
    config?: ResolveTrackConfig;
  }) => {
    // Key order is load-bearing — see resolveVideoTrack.
    const trackConfig = { ...AUDIO_TRACK_RESOLUTION_CONFIG, ...config };
    return setupTrackResolution({
      state,
      config: { ...trackConfig, fetchResolvableText: failoverFetch(defaultFetchResolvableText, state, trackConfig) },
    });
  },
});

/**
 * Resolve unresolved text tracks. Same shape as `resolveVideoTrack`,
 * narrowed to text.
 */
export const resolveTextTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId'],
  contextKeys: [],
  setup: ({
    state,
    config = {},
  }: {
    state: ResolveTrackStateMap<'selectedTextTrackId'>;
    config?: ResolveTrackConfig;
  }) => {
    // Key order is load-bearing — see resolveVideoTrack.
    const trackConfig = { ...TEXT_TRACK_RESOLUTION_CONFIG, ...config };
    return setupTrackResolution({
      state,
      config: { ...trackConfig, fetchResolvableText: failoverFetch(defaultFetchResolvableText, state, trackConfig) },
    });
  },
});
