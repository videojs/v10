import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import { RecurringRunner, type Reschedule, Task } from '../../core/tasks/task';
import { NON_FMP4_CONTAINER_MIMES, parseMediaPlaylist } from '../../media/hls/parse-media-playlist';
import type { MaybeResolvedPresentation, PartiallyResolvedTrack, ResolvedTrack } from '../../media/types';
import { deriveStreamType, getMediaPlaylistMetadata, isResolvedPresentation, isResolvedTrack } from '../../media/types';
import type { GetCdnId } from '../../media/utils/cdn';
import { applyContainerMimeType, findTrack, updateTrackInPresentation } from '../../media/utils/tracks';
import { fetchResolvableText as defaultFetchResolvableText, type FetchText } from '../../network/fetch';
import { failoverFetch } from '../primitives/failover-fetch';
import { AUDIO_TYPE_CONFIG, TEXT_TYPE_CONFIG, VIDEO_TYPE_CONFIG } from '../primitives/track-types';

// ============================================================================
// Specialization helper
//
// `setupTrackResolution` has the same shape as a Behavior `setup` function:
// `({ state, config }) => cleanup`. Each `resolveXTrack` export below calls it
// from inside its own `defineBehavior` setup, supplying its per-type config
// inline. The orchestration — gate on a selection, schedule the fetch+parse,
// and patch the resolved track back into `state.presentation` (carrying the
// prior snapshot's timeline forward) — is shared.
//
// This behavior is category [1] "content snapshot" from
// [live-presentation-modeling.md](../../../internal/design/spf/live-presentation-modeling.md):
// it produces the windowed segment list. *Whether* to (re)load is the `shouldLoadTrack`
// gate (resolve an unresolved track; reload a resolved-but-incomplete one — a live
// window may have slid past the playhead; reuse a complete one). *When* to reload
// (category [3] "refetch policy") is owned not by this behavior but by the
// `RecurringRunner` it schedules on: given a `reschedule` function (injected by
// the engine, which composes the playlist's target-duration cadence with a
// sleep), the runner re-runs the resolve task whenever `reschedule` resolves,
// until it returns `null` (the playlist completed). With no `reschedule` it runs
// once (VoD / non-live). The recurrence loop lives in the runner, which knows
// nothing about time — so the behavior stays free of timers and reload signals.
//
// The runner is single-slot: a selection change re-schedules (abort-and-replace),
// and the reactor's `presentation-resolved` exit aborts it on source change. The
// post-resolve presentation write is read with `peek`, so it never re-fires the
// effect.
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
  /**
   * Re-run policy handed to the `RecurringRunner`: returns a promise that resolves
   * when the live track's playlist should reload, or `null` to stop. Absent →
   * resolve once (VoD / non-live). Injected by the engine (which composes the
   * target-duration cadence with a sleep); the behavior stays free of timers and
   * reload signals.
   */
  reschedule?: Reschedule<ResolvedTrack>;
}

/**
 * Engine-config slice each `resolve*` behavior reads.
 */
interface ResolveTrackConfig {
  /** CDN-id derivation for the failover trip; defaults to origin-based `getCdnId`. */
  getCdnId?: GetCdnId;
  /** Live media-playlist re-run policy; absent → resolve once. */
  reschedule?: Reschedule<ResolvedTrack>;
}

/**
 * Whether the loader should (re)load this track now: yes if it's unresolved (the
 * initial resolve, or a retry of a failed one), or resolved-but-incomplete (a
 * live window that may have slid past the playhead — reuse risks a stall); no if
 * resolved + complete (VoD, or live that hit `#EXT-X-ENDLIST` — a complete
 * playlist can never go stale). Completeness keys off `Track.duration`, the
 * single completeness source of truth. This gate governs only whether to
 * (re)*start* loading; the live reload *cadence* is the `RecurringRunner`'s job.
 */
function shouldLoadTrack(track: PartiallyResolvedTrack | ResolvedTrack): boolean {
  return !isResolvedTrack(track) || !Number.isFinite(track.duration);
}

function setupTrackResolution<K extends SelectedTrackKey>({
  state,
  config: { selectedKey, findTrackToResolve, fetchResolvableText = defaultFetchResolvableText, reschedule },
}: {
  state: ResolveTrackStateMap<K>;
  config: TrackResolutionConfig<K>;
}) {
  // The runner owns recurrence: with a `reschedule` (live) it re-runs the resolve
  // task whenever reschedule resolves, until it returns null; with none (VoD) it
  // runs once. Single-slot — a selection change re-schedules (abort-and-replace),
  // and the reactor's state-exit aborts it on source change.
  const runner = new RecurringRunner<ResolvedTrack>(reschedule);

  // The resolve task for `trackId`. The `RecurringRunner` re-runs this same task
  // each reload cycle, so its run fn re-reads the current snapshot each time —
  // carrying the prior window's timeline forward — then fetches+parses, patches
  // `state.presentation`, and returns the resolved track (the runner's
  // `reschedule` reads its metadata to decide the next cadence).
  const createResolveTask = (trackId: string): Task<ResolvedTrack> =>
    new Task<ResolvedTrack>(
      async (signal) => {
        const presentation = peek(state.presentation);
        const track = presentation ? findTrackToResolve(presentation, trackId) : undefined;
        // The recurrence is aborted on source change, so a missing track here is
        // a transient race; surfacing it as an error lets the policy retry.
        if (!track) throw new Error('resolve-track: selected track not found');

        // `fetchResolvableText` is the behavior's failover-decorated fetch: it
        // trips the CDN on a failed fetch (network error or non-OK status). A
        // parse failure is a content issue, not a CDN-availability one, so it
        // doesn't trip. `track` is the prior snapshot (the unresolved shell on the
        // first pass, the last resolved window on a live reload); the parser
        // carries its timeline forward.
        const text = await fetchResolvableText(track, { signal });
        const mediaTrack = parseMediaPlaylist(text, track);

        // Updater handles undefined inputs by returning current unchanged;
        // isResolvedPresentation narrows for the patch. State-exit on
        // resolving→unresolved fires runner.abortAll before any URL change
        // settles, and per the Fetch spec the signal abort cancels in-flight body
        // reads — so by the time we reach this point the presentation we resolved
        // against is the live one.
        update(state.presentation, (current) => {
          if (!isResolvedPresentation(current)) return current;
          const patched = updateTrackInPresentation(current, mediaTrack);
          // Container is uniform within a type (an ABR ladder shares its
          // container), so a detected non-fMP4 rendition (TS, raw AAC) implies
          // every rendition of *this* type matches — relabel them all from one
          // resolved playlist instead of fetching each. Scoped to this track's own
          // type: never cross audio↔video (mixed-container sources exist, e.g.
          // muxed-TS video + raw-.aac audio), which also keeps per-type
          // resolutions' writes disjoint (no race).
          const relabeled = NON_FMP4_CONTAINER_MIMES.has(mediaTrack.mimeType)
            ? applyContainerMimeType(patched, mediaTrack.type, mediaTrack.mimeType)
            : patched;
          // Stream nature (category [2a]) — stable once a media playlist is
          // parsed; recomputing each reload is harmless.
          return { ...relabeled, streamType: deriveStreamType(getMediaPlaylistMetadata(mediaTrack)) };
        });
        return mediaTrack;
      },
      { id: trackId }
    );

  // Reactor states model the FSM the previous effect-based body was
  // hand-rolling. 'presentation-resolved' is entered when the
  // presentation is fully parsed (has a Ham id + selectionSets); leaving
  // it (presentation cleared or reset to an unresolved value) aborts the
  // in-flight + scheduled reload via the entry-cleanup. Most URL changes go
  // through 'presentation-unresolved' naturally (set undefined → set new
  // partial → re-parse), so the common case is covered by state-exit alone.
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
        // abort-of-in-flight-resolution (and any pending reload) to leaving
        // 'presentation-resolved' (presentation cleared/reset, or behavior
        // destroyed) — source-change cancellation expressed structurally
        // through the state machine.
        entry: () => () => runner.abortAll(),
        effects: [
          () => {
            // `selectedKey` is read tracked so a selection change re-fires this
            // and re-schedules (the single-slot runner aborts+replaces the prior
            // recurrence). Presentation is peeked (untracked) so the post-resolve
            // write — and the runner's own reload cycles — don't re-fire it.
            const trackId = state[selectedKey].get();
            const presentation = peek(state.presentation);
            if (!presentation || !trackId) return;

            const track = findTrackToResolve(presentation, trackId);
            // Gate: schedule only when there's loading to do (unresolved, or a
            // resolved-but-incomplete live window). Recurrence past the first run
            // is the runner's job, driven by `reschedule`.
            if (!track || !shouldLoadTrack(track)) return;

            runner.schedule(createResolveTask(trackId));
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
    // `selectedKey` + `getCdnId` from the merged result, and `reschedule`
    // rides through to the runner. `fetchResolvableText` is placed AFTER the
    // spread so the failover-decorated fetch wins — unlike segments, playlists
    // expose no overridable per-type fetch.
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
