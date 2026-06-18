import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import { ConcurrentRunner, Task } from '../../core/tasks/task';
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
// inline. The orchestration — gate on a selection, decide whether a (re)load
// is due, schedule the fetch+parse, and patch the resolved track back into
// `state.presentation` (carrying the prior snapshot's timeline forward) — is
// shared.
//
// This behavior is category [1] "content snapshot" from
// [live-presentation-modeling.md](../../../internal/design/spf/live-presentation-modeling.md):
// it produces the windowed segment list. *When* to (re)fetch is category [3]
// "refetch policy", owned by the sibling `scheduleTrackReload` scheduler, which
// bumps a per-type reload-epoch slot on a cadence. The loader treats that slot
// purely as a re-fire *ping* — it subscribes to the bump but never reads its
// value — and re-runs the gate. Whether a (re)load is actually due is decided
// by `shouldResolveTrack` against the current snapshot:
//   - unresolved          → load (initial resolve, or a retry of a failed one)
//   - resolved, incomplete → reload (a live window may have slid past the
//                            playhead, so reusing it risks a stall)
//   - resolved, complete   → reuse (VoD, or live that hit ENDLIST — a complete
//                            playlist can never go stale)
// A same-id task already in flight is deduped by `ConcurrentRunner`
// (drop-if-busy), and the post-resolve presentation write is read with `peek`,
// so it never re-fires the effect.
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
  /**
   * Per-type live-reload triggers, owned by `scheduleTrackReload`. A bump
   * (monotonic increment) past the last-serviced value tells the loader a
   * reload is due. Absent / unchanged for VoD (no scheduler composed).
   */
  videoReloadEpoch?: number;
  audioReloadEpoch?: number;
  textReloadEpoch?: number;
}

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId' | 'selectedTextTrackId';
type ReloadEpochKey = 'videoReloadEpoch' | 'audioReloadEpoch' | 'textReloadEpoch';

type ResolveTrackStateMap<K extends SelectedTrackKey, E extends ReloadEpochKey> = {
  presentation: Signal<ResolveTrackState['presentation']>;
} & { [P in K]: ReadonlySignal<ResolveTrackState[P]> } & { [P in E]: ReadonlySignal<ResolveTrackState[P]> };

interface TrackResolutionConfig<K extends SelectedTrackKey, E extends ReloadEpochKey> {
  selectedKey: K;
  /** State slot the scheduler bumps to request a live reload of this type. */
  reloadEpochKey: E;
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

/**
 * Should the loader (re)resolve this track right now? Unresolved → yes (initial
 * resolve, or a retry of a failed one). Resolved-but-incomplete (live, ongoing)
 * → yes: the cached window may have slid past the playhead, so reuse risks a
 * stall. Resolved and complete (VoD, or live that hit `#EXT-X-ENDLIST`) → no; a
 * complete playlist can never go stale. Completeness keys off `Track.duration`
 * (Infinity while the playlist can still grow), the single completeness source
 * of truth — so a live stream that ends stops reloading the moment it goes
 * finite, with no engine- or stream-type config.
 */
function shouldResolveTrack(track: PartiallyResolvedTrack | ResolvedTrack): boolean {
  return !isResolvedTrack(track) || !Number.isFinite(track.duration);
}

function setupTrackResolution<K extends SelectedTrackKey, E extends ReloadEpochKey>({
  state,
  config: { selectedKey, reloadEpochKey, findTrackToResolve, fetchResolvableText = defaultFetchResolvableText },
}: {
  state: ResolveTrackStateMap<K, E>;
  config: TrackResolutionConfig<K, E>;
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
            // re-fire the effect. The tracked reads — `selectedKey` and the
            // reload-epoch ping — are taken up front, before any early return,
            // so a selection change or a scheduler bump re-fires this effect.
            const trackId = state[selectedKey].get();
            // Subscribe to the scheduler's reload-epoch slot purely to re-fire
            // on each bump — the value is unused; `shouldResolveTrack` decides
            // from the snapshot, not the epoch. (A signal used as an event
            // channel; see the header comment.)
            state[reloadEpochKey].get();
            const presentation = peek(state.presentation);
            if (!presentation || !trackId) return;

            const track = findTrackToResolve(presentation, trackId);
            // Unresolved → initial resolve / retry; resolved-but-incomplete →
            // live reload; resolved + complete → reuse. A same-id task already
            // in flight is deduped by the runner (drop-if-busy).
            if (!track || !shouldResolveTrack(track)) return;

            runner.schedule(
              // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createResolveTrackTask(track, context, config)),
              // likely eventually passed down via config or a new "definitions" argument (CJP).
              new Task(
                async (signal) => {
                  // `fetchResolvableText` is the behavior's failover-decorated
                  // fetch: it trips the CDN on a failed fetch (network error or
                  // non-OK status). A parse failure is a content issue, not a
                  // CDN-availability one, so it doesn't trip.
                  // `track` is the prior snapshot (the unresolved shell on the
                  // first pass, the last resolved window on a live reload); the
                  // parser carries its timeline forward.
                  const text = await fetchResolvableText(track, { signal });
                  const mediaTrack = parseMediaPlaylist(text, track);

                  // Updater handles undefined inputs by returning current
                  // unchanged; isResolvedPresentation narrows for the patch.
                  // State-exit on resolving→unresolved fires runner.abortAll
                  // before any URL change settles, and per the Fetch spec the
                  // signal abort cancels in-flight body reads — so by the
                  // time we reach this point the presentation we resolved
                  // against is the live one.
                  update(state.presentation, (current) => {
                    if (!isResolvedPresentation(current)) return current;
                    const patched = updateTrackInPresentation(current, mediaTrack);
                    // Container is uniform within a type (an ABR ladder shares
                    // its container), so a detected non-fMP4 rendition (TS,
                    // raw AAC) implies every rendition of *this* type matches —
                    // relabel them all from one resolved playlist instead of
                    // fetching each. Scoped to this track's own type: never cross
                    // audio↔video (mixed-container sources exist, e.g. muxed-TS
                    // video + raw-.aac audio), which also keeps per-type
                    // resolutions' writes disjoint (no race).
                    const relabeled = NON_FMP4_CONTAINER_MIMES.has(mediaTrack.mimeType)
                      ? applyContainerMimeType(patched, mediaTrack.type, mediaTrack.mimeType)
                      : patched;
                    // Stream nature (category [2a]) — stable once a media
                    // playlist is parsed; recomputing each reload is harmless.
                    return { ...relabeled, streamType: deriveStreamType(getMediaPlaylistMetadata(mediaTrack)) };
                  });
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
  reloadEpochKey: 'videoReloadEpoch',
  findTrackToResolve: (presentation: MaybeResolvedPresentation, trackId: string) =>
    findTrack(presentation, 'video', trackId),
} as const;

const AUDIO_TRACK_RESOLUTION_CONFIG = {
  ...AUDIO_TYPE_CONFIG,
  reloadEpochKey: 'audioReloadEpoch',
  findTrackToResolve: (presentation: MaybeResolvedPresentation, trackId: string) =>
    findTrack(presentation, 'audio', trackId),
} as const;

const TEXT_TRACK_RESOLUTION_CONFIG = {
  ...TEXT_TYPE_CONFIG,
  reloadEpochKey: 'textReloadEpoch',
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
  stateKeys: ['presentation', 'selectedVideoTrackId', 'videoReloadEpoch'],
  contextKeys: [],
  setup: ({
    state,
    config = {},
  }: {
    state: ResolveTrackStateMap<'selectedVideoTrackId', 'videoReloadEpoch'>;
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
  stateKeys: ['presentation', 'selectedAudioTrackId', 'audioReloadEpoch'],
  contextKeys: [],
  setup: ({
    state,
    config = {},
  }: {
    state: ResolveTrackStateMap<'selectedAudioTrackId', 'audioReloadEpoch'>;
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
  stateKeys: ['presentation', 'selectedTextTrackId', 'textReloadEpoch'],
  contextKeys: [],
  setup: ({
    state,
    config = {},
  }: {
    state: ResolveTrackStateMap<'selectedTextTrackId', 'textReloadEpoch'>;
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
