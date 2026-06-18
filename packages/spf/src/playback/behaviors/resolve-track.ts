import { type AnySlotMap, defineBehavior } from '../../core/composition/create-composition';
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
// it produces the windowed segment list. *Whether* a (re)load is due is decided
// by an injected `shouldLoadTrack(track, params)` gate, so the core stays
// live-agnostic — it knows nothing about reload epochs or completeness. The
// default (`loadIfUnresolved`) resolves only an unresolved track (the pre-live
// one-shot). Live-capable variants inject `shouldLoadLiveTrack`, which also
// reloads a resolved-but-incomplete window and subscribes the effect to the
// scheduler's per-type reload-epoch *ping* (read for subscription only — see
// `scheduleTrackReload`, category [3] "refetch policy"). The ping slot is read
// defensively inside that gate, off an optional state view, so the core never
// names or assumes it (the `bandwidthState?` pattern from `track-switching`).
//
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
}

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId' | 'selectedTextTrackId';
type ReloadEpochKey = 'videoReloadEpoch' | 'audioReloadEpoch' | 'textReloadEpoch';

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
   * Load gate — decides whether to (re)resolve the selected track. Defaults to
   * `loadIfUnresolved` (initial resolve only). Live-capable variants inject
   * `shouldLoadLiveTrack`, which also reloads incomplete windows and subscribes
   * to the scheduler's reload-epoch ping. Receives the behavior's `params`
   * (`{ state, context, config }`) untouched.
   */
  shouldLoadTrack?: ShouldLoadTrack<ResolveTrackStateMap<K>, AnySlotMap, TrackResolutionConfig<K>>;
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
 * The behavior's setup deps, threaded straight through to `shouldLoadTrack` so a
 * gate reads from the same surfaces the behavior does. `context` is optional —
 * present at runtime, absent on direct setup calls and unread by today's gates,
 * so the whole object passes through unchanged.
 */
export interface ShouldLoadTrackParams<State = unknown, Context = unknown, Config = unknown> {
  state: State;
  context?: Context;
  config: Config;
}

/**
 * Decides whether the loader should (re)resolve the selected track now, reading
 * whatever signals it needs off `params` at call time (so its `.get()`s
 * subscribe the loader's effect to exactly what it consulted). Returning `true`
 * schedules a fetch+parse; an in-flight same-id task is deduped by the runner.
 */
export type ShouldLoadTrack<State = unknown, Context = unknown, Config = unknown> = (
  track: PartiallyResolvedTrack | ResolvedTrack,
  params: ShouldLoadTrackParams<State, Context, Config>
) => boolean;

/**
 * Default load gate: resolve only an unresolved track (the initial resolve, or a
 * retry of a failed one). The pre-live one-shot behavior — it names no
 * reload-epoch slot, so the core assumes no live ping. Live-capable variants
 * inject `shouldLoadLiveTrack` instead.
 */
function loadIfUnresolved(track: PartiallyResolvedTrack | ResolvedTrack): boolean {
  return !isResolvedTrack(track);
}

/**
 * Per-type reload-epoch ping slots, all *optional* — the live gate reads its
 * slot defensively, so the core's state type (which omits them) stays
 * assignable and the core never assumes the ping exists. Materialized by
 * `scheduleTrackReload` when it's composed; absent otherwise.
 */
type ReloadEpochStateView = { [P in ReloadEpochKey]?: ReadonlySignal<number | undefined> };

/**
 * Live load gate — the `shouldLoadTrack` alternative the live-capable variants
 * inject. Beyond the default's initial resolve, it reloads a resolved-but-
 * incomplete window (Infinity `Track.duration`, the single completeness source
 * of truth): a live window may have slid past the playhead, so reuse risks a
 * stall; a complete playlist (VoD, or live that hit `#EXT-X-ENDLIST`) can never
 * go stale, so it's reused. Reading the per-type reload-epoch slot subscribes
 * the loader's effect to the scheduler's cadence ping (each bump re-fires it);
 * the value is unused — a signal used as an event channel. The slot is read
 * defensively, off the optional `ReloadEpochStateView`, with its per-type key
 * closured in by the variant — so only this gate names it, never the core.
 */
function shouldLoadLiveTrack<K extends SelectedTrackKey>(
  track: PartiallyResolvedTrack | ResolvedTrack,
  params: ShouldLoadTrackParams<ResolveTrackStateMap<K> & ReloadEpochStateView>,
  reloadEpochKey: ReloadEpochKey
): boolean {
  params.state[reloadEpochKey]?.get();
  return !isResolvedTrack(track) || !Number.isFinite(track.duration);
}

function setupTrackResolution<K extends SelectedTrackKey>(params: {
  state: ResolveTrackStateMap<K>;
  context?: AnySlotMap;
  config: TrackResolutionConfig<K>;
}) {
  // Destructure in the body (not the signature) so the whole `params` object —
  // `{ state, context, config }` — passes straight through to `shouldLoadTrack`,
  // letting a gate reach `context` in future without changing this seam.
  const { state, config } = params;
  const {
    selectedKey,
    findTrackToResolve,
    fetchResolvableText = defaultFetchResolvableText,
    shouldLoadTrack = loadIfUnresolved,
  } = config;
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
            // internal updates (segments added by sibling tasks) don't re-fire
            // the effect. `selectedKey` is read tracked up front so a selection
            // change re-fires; the injected `shouldLoadTrack` gate takes any
            // further tracked reads it needs (e.g. the live reload-epoch ping),
            // subscribing the effect to exactly what it consulted.
            const trackId = state[selectedKey].get();
            const presentation = peek(state.presentation);
            if (!presentation || !trackId) return;

            const track = findTrackToResolve(presentation, trackId);
            // The gate decides whether a (re)load is due (default: unresolved
            // only; live: also incomplete-window reload). A same-id task already
            // in flight is deduped by the runner (drop-if-busy).
            if (!track || !shouldLoadTrack(track, params)) return;

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
    ...otherProps
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
      ...otherProps,
      state,
      config: {
        ...trackConfig,
        fetchResolvableText: failoverFetch(defaultFetchResolvableText, state, trackConfig),
        // Live-capable gate: closure in this type's reload-epoch slot so the
        // core never names it.
        shouldLoadTrack: (track, params) => shouldLoadLiveTrack(track, params, 'videoReloadEpoch'),
      },
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
    ...otherProps
  }: {
    state: ResolveTrackStateMap<'selectedAudioTrackId'>;
    config?: ResolveTrackConfig;
  }) => {
    // Key order is load-bearing — see resolveVideoTrack.
    const trackConfig = { ...AUDIO_TRACK_RESOLUTION_CONFIG, ...config };
    return setupTrackResolution({
      ...otherProps,
      state,
      config: {
        ...trackConfig,
        fetchResolvableText: failoverFetch(defaultFetchResolvableText, state, trackConfig),
        shouldLoadTrack: (track, params) => shouldLoadLiveTrack(track, params, 'audioReloadEpoch'),
      },
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
    ...otherProps
  }: {
    state: ResolveTrackStateMap<'selectedTextTrackId'>;
    config?: ResolveTrackConfig;
  }) => {
    // Key order is load-bearing — see resolveVideoTrack.
    const trackConfig = { ...TEXT_TRACK_RESOLUTION_CONFIG, ...config };
    return setupTrackResolution({
      ...otherProps,
      state,
      config: {
        ...trackConfig,
        fetchResolvableText: failoverFetch(defaultFetchResolvableText, state, trackConfig),
        shouldLoadTrack: (track, params) => shouldLoadLiveTrack(track, params, 'textReloadEpoch'),
      },
    });
  },
});
