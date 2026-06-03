/**
 * **Per-type track-selection slot management with optional ABR.** While a
 * presentation is resolved, owns the selection slot's lifecycle: pick a
 * default, react to user intent (partial-track filter), re-evaluate
 * algorithmically (today: bandwidth via `selectQuality` for video; pin-to-
 * current for audio), and clear on src unload.
 *
 * User intent is expressed as a partial-track description in a sibling slot
 * (e.g. `userVideoTrackSelection`, `userAudioTrackSelection`) which
 * constrains the candidate set for selection — when the constraint narrows
 * candidates to exactly one, the choice is fully determined and the
 * selection algorithm is short-circuited (no bandwidth read, no effect
 * re-fire on bandwidth changes).
 *
 * Lifecycle: `'presentation-unresolved'` ↔ `'presentation-resolved'`. The
 * `'presentation-resolved'` state owns the selection slot; its
 * entry-returned cleanup clears the slot on exit (canonical
 * cleanup-binds-to-setup per `reactors.md`).
 *
 * Hysteresis (video ABR today, audio ABR when added): downgrades apply
 * immediately; upgrades require the optimal track's bandwidth to exceed
 * the current track's by `upgradeMargin`. No temporal state — short-term
 * smoothing is the bandwidth estimator's job.
 *
 * Initial pick is configurable via `config.picker` — pass any `TrackPicker`
 * to override the default-pick for the empty-slot case. Algorithmic
 * re-evaluation (`selectOptimal`) is unaffected.
 *
 * Variants: `switchVideoTrack` (bandwidth-driven `selectOptimal`),
 * `switchAudioTrack` (pin-to-current `selectOptimal`, ABR-ready shape for
 * a future bandwidth-driven variant once audio-ABR lands). Both variants
 * share this helper; the only point of variation is the per-variant
 * `selectOptimal` and the candidate-track type. Future track-switching
 * axes (text tracks, etc.) plug in the same way.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import {
  DEFAULT_QUALITY_CONFIG,
  type QualityConfig,
  selectLowestQuality,
  selectQuality,
} from '../../media/abr/quality-selection';
import { pickAudioTrack, type TrackPicker } from '../../media/primitives/select-tracks';
import {
  type AudioTrack,
  isResolvedPresentation,
  type MaybeResolvedPresentation,
  type PartiallyResolvedAudioTrack,
  type PartiallyResolvedVideoTrack,
  type VideoTrack,
} from '../../media/types';
import { getTracksByType } from '../../media/utils/tracks';
import type { BandwidthConfig, BandwidthState } from '../../network/bandwidth-estimator';
import { DEFAULT_BANDWIDTH_CONFIG, getBandwidthEstimate } from '../../network/bandwidth-estimator';

// ============================================================================
// State + Config
// ============================================================================

export interface TrackSwitchingState {
  presentation?: MaybeResolvedPresentation;
  bandwidthState?: BandwidthState;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  /**
   * Partial-track description expressing user intent for video. When set,
   * narrows candidates to tracks matching every present field. Common case
   * is `{ id: 'specific-track-id' }` for "manual quality"; other shapes
   * work (e.g., `{ height: 720 }` constrains to 720p tracks — ABR
   * continues to pick among them).
   *
   * When narrowed candidates contain exactly one track, ABR is
   * short-circuited entirely (no bandwidth read, no effect re-fire).
   *
   * Falls back to the unfiltered set when the filter matches no tracks
   * (e.g., user-picked id from a previous source doesn't exist here).
   */
  userVideoTrackSelection?: Partial<VideoTrack>;
  /**
   * Partial-track description expressing user intent for audio. Common
   * case is `{ language: 'es' }` for language-pinning, `{ id: 'X' }` for
   * absolute pinning. Same narrowing + short-circuit + fallback semantics
   * as `userVideoTrackSelection`.
   */
  userAudioTrackSelection?: Partial<AudioTrack>;
}

export interface TrackSwitchingConfig {
  /**
   * Quality-selection tuning consumed by bandwidth-driven `selectOptimal`
   * variants (today: `switchVideoTrack`'s `selectQuality`). `safetyMargin`
   * is the bandwidth-headroom multiplier; `upgradeMargin` is the
   * hysteresis ratio gating upgrades. Defaults: `DEFAULT_QUALITY_CONFIG`
   * (0.85 / 1.15). Ignored by pin-to-current variants
   * (today: `switchAudioTrack`).
   */
  quality?: Partial<QualityConfig>;

  /**
   * Bandwidth-estimator tuning passed through to `getBandwidthEstimate`.
   * Merged over `DEFAULT_BANDWIDTH_CONFIG`. Consumed only by bandwidth-
   * driven variants.
   */
  bandwidth?: Partial<BandwidthConfig>;

  /**
   * Bandwidth estimate in bps to use before enough samples have been
   * collected. Default: 5_000_000 (5 Mbps).
   */
  initialBandwidth?: number;

  /**
   * Override the initial-pick algorithm. When set, the picker is called
   * the first time the slot is empty in the `'presentation-resolved'`
   * state; its returned id is set verbatim (no algorithmic logic).
   * Subsequent re-evaluation via the variant's `selectOptimal` is
   * unaffected.
   *
   * Honors of the user-selection filter are the picker's responsibility
   * when overridden. If the picker returns `undefined`, the variant's
   * default initial pick fires (graceful fallback).
   */
  picker?: TrackPicker<TrackSwitchingConfig>;

  /**
   * Audio-variant config — preferred language consumed by the default
   * audio picker (`pickAudioTrack`). Ignored by other variants.
   */
  preferredAudioLanguage?: string;
}

/** Default initial-bandwidth value before bandwidth measurements arrive. */
export const DEFAULT_INITIAL_BANDWIDTH = 5_000_000;

// ============================================================================
// Specialization helper
//
// `setupTrackSwitching` has the same shape as a Behavior `setup` function:
// `({ state, config }) => Reactor`. Each `switchXTrack` export below calls
// it from inside its own `defineBehavior` setup, passing the per-type slot
// keys, track type, and selection algorithm via three generic parameters —
// `S` (selection slot key), `U` (user-selection slot key), `T` (candidate
// track type).
//
// -- Design note: why narrow `SelectionKey` / `UserSelectionKey` unions ----
// Goal we did not reach: have callers "fully pass in" the slot keys, with
// the helper enforcing zero internal knowledge of which literals are valid.
// What blocks it: indexing a mapped-type intersection by a generic key.
// When `S extends keyof TrackSwitchingState` (or `string`), TS conservatively
// treats `state[selectionKey]` as the union of every possible match across
// the intersected mapped portions — including the fixed-key signals
// (`presentation`, `bandwidthState`) — and widens to their value-type union.
// The sibling pattern hits the same constraint and answers it the same way:
// `SelectedTrackKey` in `select-tracks.ts` is a hardcoded narrow union for
// the same reason.
//
// Current pick is the narrow-union route because it matches siblings and
// the unions read as documentation ("these are the slots this helper
// manages") rather than restriction. Extending to a new track-switching
// axis is one literal per union.
// --------------------------------------------------------------------------
// ============================================================================

/** Minimum candidate-track shape consumed by the helper. */
type SwitchableTrack = { id: string; bandwidth?: number };

type SelectionKey = 'selectedVideoTrackId' | 'selectedAudioTrackId';
type UserSelectionKey = 'userVideoTrackSelection' | 'userAudioTrackSelection';

// Each mapped value references `P` so TS keeps the per-key dependency and
// resolves `state[selectionKey]` / `state[userSelectionKey]` to the right
// arm. `T` (track type) deliberately stays out of the state map — pulling
// it in detaches the user-selection mapped value from `P` and TS collapses
// the intersection. T flows through `TrackSwitchingSetupConfig` instead;
// the user-filter access casts at the read site (see below).
type TrackSwitchingStateMap<S extends SelectionKey, U extends UserSelectionKey> = {
  presentation: ReadonlySignal<TrackSwitchingState['presentation']>;
  bandwidthState: ReadonlySignal<TrackSwitchingState['bandwidthState']>;
} & { [P in S]: Signal<TrackSwitchingState[P]> } & { [P in U]: ReadonlySignal<TrackSwitchingState[P]> };

/**
 * Selection context passed to `selectOptimal`. Built once per effect run.
 * Bandwidth-aware variants (video ABR, future audio ABR) read all fields;
 * pin-to-current variants (audio today) ignore the bandwidth-shaped fields.
 *
 * The context is built *inside* the effect, so bandwidth-aware variants
 * subscribe to `bandwidthState` automatically; pin-to-current variants
 * receive the same context but never re-fire on bandwidth changes because
 * the single-candidate short-circuit (above) bypasses the bandwidth read.
 */
export interface SelectionCtx<T extends SwitchableTrack> {
  bandwidth: number;
  safetyMargin: number;
  upgradeMargin: number;
  currentTrack?: T;
}

interface TrackSwitchingSetupConfig<S extends SelectionKey, U extends UserSelectionKey, T extends SwitchableTrack>
  extends TrackSwitchingConfig {
  selectionKey: S;
  userSelectionKey: U;
  getTracks: (presentation: MaybeResolvedPresentation) => readonly T[];
  selectOptimal: (tracks: readonly T[], ctx: SelectionCtx<T>) => T | undefined;
}

function setupTrackSwitching<S extends SelectionKey, U extends UserSelectionKey, T extends SwitchableTrack>({
  state,
  config,
}: {
  state: TrackSwitchingStateMap<S, U>;
  config: TrackSwitchingSetupConfig<S, U, T>;
}) {
  const safetyMargin = config.quality?.safetyMargin ?? DEFAULT_QUALITY_CONFIG.safetyMargin;
  const upgradeMargin = config.quality?.upgradeMargin ?? DEFAULT_QUALITY_CONFIG.upgradeMargin;
  const initialBandwidth = config.initialBandwidth ?? DEFAULT_INITIAL_BANDWIDTH;
  const bandwidthConfig: BandwidthConfig = { ...DEFAULT_BANDWIDTH_CONFIG, ...config.bandwidth };
  const { selectionKey, userSelectionKey, getTracks, selectOptimal } = config;

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
        // Canonical cleanup-binds-to-setup: the selection slot's valid
        // lifespan is exactly 'presentation-resolved'. Clear fires on
        // 'presentation-resolved' exit, covering both src unload and
        // behavior destroy.
        entry: () => () => state[selectionKey].set(undefined),
        effects: [
          () => {
            const presentation = peek(state.presentation);
            if (!presentation) return;

            const allTracks = getTracks(presentation);
            const [firstAllTrack] = allTracks;
            if (!firstAllTrack) return;

            // State stores the filter as `Partial<XTrack>` (user-facing
            // shape — includes per-type fields like `height` or
            // `language`); the helper works against `Partial<T>` so
            // filter and track access share one index type. Filter keys
            // absent on a partially-resolved track read as `undefined`
            // and just exclude that track.
            const userFilter = state[userSelectionKey].get() as Partial<T> | undefined;
            const matching = userFilter
              ? allTracks.filter((track) => {
                  for (const key in userFilter) {
                    const filterValue = userFilter[key as keyof T];
                    if (filterValue !== undefined && track[key as keyof T] !== filterValue) return false;
                  }
                  return true;
                })
              : allTracks;
            // Fall back to all tracks when the filter excludes everything
            // (e.g., user-picked id doesn't exist in the current source).
            const candidates = matching.length > 0 ? matching : allTracks;
            if (!candidates.length) return;

            const selectedId = state[selectionKey].get();

            // Common case: user has fully constrained the choice (e.g.,
            // `{ id: 'specific-720p' }` or `{ language: 'es' }` when only
            // one Spanish track exists). Skip the algorithm path — and
            // crucially, don't read `bandwidthState` so the effect
            // doesn't re-fire on bandwidth changes while the user's
            // selection holds.
            if (candidates.length === 1) {
              if (candidates[0]!.id !== selectedId) state[selectionKey].set(candidates[0]!.id);
              return;
            }

            // Read bandwidth up front to establish the signal subscription —
            // future bandwidth changes must re-fire this effect even when
            // the picker branch below takes the early-return path. (If the
            // picker bails out without ever touching `bandwidthState`,
            // bandwidth-driven `selectOptimal` would otherwise be deaf to
            // subsequent bandwidth changes.) Pin-to-current variants read
            // the field but ignore it — the subscription cost is fixed
            // per effect run regardless.
            //
            // Single path for pre-trust and post-trust: `getBandwidthEstimate`
            // returns `initialBandwidth` when state is undefined or bytes
            // sampled hasn't crossed `minTotalBytes`, so the initial pick
            // and early-ABR window run the same `selectOptimal` path as a
            // fully-trusted measurement.
            const bandwidth = getBandwidthEstimate(state.bandwidthState.get(), initialBandwidth, bandwidthConfig);

            // Picker-driven initial pick: when the slot is empty and the
            // caller supplied a `picker`, defer to it instead of the
            // algorithmic default. The picker sees the full presentation
            // (not narrowed by the user-selection filter) — honoring the
            // filter is the picker's responsibility when overridden.
            // Returning `undefined` falls through to the algorithmic
            // default pick (graceful fallback).
            //
            // Algorithmic re-evaluation runs as usual on subsequent
            // effect re-runs once the slot is set.
            if (!selectedId && config.picker) {
              const id = config.picker(presentation, config);
              if (id) {
                state[selectionKey].set(id);
                return;
              }
            }
            // `selectOptimal` decides the track to apply now given current
            // selection + context. Returns:
            //   - the optimal when no current track or on a downgrade
            //   - the optimal when an upgrade clears `upgradeMargin`
            //   - the current track itself when an upgrade doesn't clear
            //     margin (caller's id-compare below no-ops in that case)
            // Outer `?? selectLowestQuality` is defensive — `selectQuality`
            // falls back to lowest internally; pin-to-current variants
            // return `currentTrack ?? tracks[0]` so they never produce
            // `undefined` for a non-empty `candidates`. The fallback
            // catches future variants that don't return a definitive pick.
            const currentTrack = candidates.find((t) => t.id === selectedId);
            const ctx: SelectionCtx<T> = { bandwidth, safetyMargin, upgradeMargin, currentTrack };
            const optimal = selectOptimal(candidates, ctx) ?? selectLowestQualityWithBandwidth(candidates);
            if (optimal && optimal.id !== selectedId) state[selectionKey].set(optimal.id);
          },
        ],
      },
    },
  });
}

/**
 * Adapter for `selectLowestQuality` that tolerates tracks whose `bandwidth`
 * field is optional (audio's candidate shape). Falls back to the first
 * candidate when no bandwidth info is available.
 */
function selectLowestQualityWithBandwidth<T extends SwitchableTrack>(tracks: readonly T[]): T | undefined {
  if (tracks.length === 0) return undefined;
  const withBandwidth = tracks.filter((t): t is T & { bandwidth: number } => typeof t.bandwidth === 'number');
  if (withBandwidth.length === 0) return tracks[0];
  return selectLowestQuality(withBandwidth);
}

// ============================================================================
// Variant: switchVideoTrack — bandwidth-driven ABR
// ============================================================================

type VideoTrackCandidate = PartiallyResolvedVideoTrack | VideoTrack;

/**
 * Manage `selectedVideoTrackId`: pick a default on src load, dynamically
 * adjust based on bandwidth, clear on src unload. Honors
 * `userVideoTrackSelection` as a partial-track constraint on candidates;
 * short-circuits ABR when the constraint narrows to a single track.
 *
 * @example
 * const reactor = switchVideoTrack.setup({ state });
 */
export const switchVideoTrack = defineBehavior({
  stateKeys: ['presentation', 'bandwidthState', 'selectedVideoTrackId', 'userVideoTrackSelection'],
  contextKeys: [],
  setup: ({
    state,
    config,
  }: {
    state: TrackSwitchingStateMap<'selectedVideoTrackId', 'userVideoTrackSelection'>;
    config?: TrackSwitchingConfig;
  }) =>
    setupTrackSwitching<'selectedVideoTrackId', 'userVideoTrackSelection', VideoTrackCandidate>({
      state,
      config: {
        ...config,
        selectionKey: 'selectedVideoTrackId',
        userSelectionKey: 'userVideoTrackSelection',
        getTracks: (presentation) => getTracksByType(presentation, 'video') as readonly VideoTrackCandidate[],
        selectOptimal: selectQuality,
      },
    }),
});

// ============================================================================
// Variant: switchAudioTrack — pin-to-current (ABR-ready shape)
// ============================================================================

type AudioTrackCandidate = PartiallyResolvedAudioTrack | AudioTrack;

/**
 * Audio's `selectOptimal` — pin-to-current variant. Returns the current
 * track if it's in the candidate set; otherwise the first candidate. No
 * bandwidth-driven re-evaluation today (audio is not ABR-driven yet); the
 * `ctx` shape carries bandwidth so audio-ABR can swap this for a
 * bandwidth-aware variant without touching the helper.
 */
const selectAudioCurrent = (
  tracks: readonly AudioTrackCandidate[],
  { currentTrack }: SelectionCtx<AudioTrackCandidate>
): AudioTrackCandidate | undefined => currentTrack ?? tracks[0];

/**
 * Manage `selectedAudioTrackId`: pick a default on src load, narrow by
 * `userAudioTrackSelection` filter, re-pick on filter change, clear on
 * src unload.
 *
 * Mid-stream flush on language switch is handled by the segment-loader's
 * `planTasks` (see `playback/actors/dom/segment-loader.ts`) — not this
 * behavior. Same split as the video pipeline: slot owner writes; loader
 * orchestrates segment + flush plans.
 *
 * @example
 * const reactor = switchAudioTrack.setup({ state });
 */
export const switchAudioTrack = defineBehavior({
  stateKeys: ['presentation', 'bandwidthState', 'selectedAudioTrackId', 'userAudioTrackSelection'],
  contextKeys: [],
  setup: ({
    state,
    config,
  }: {
    state: TrackSwitchingStateMap<'selectedAudioTrackId', 'userAudioTrackSelection'>;
    config?: TrackSwitchingConfig;
  }) =>
    setupTrackSwitching<'selectedAudioTrackId', 'userAudioTrackSelection', AudioTrackCandidate>({
      state,
      config: {
        ...config,
        selectionKey: 'selectedAudioTrackId',
        userSelectionKey: 'userAudioTrackSelection',
        getTracks: (presentation) => getTracksByType(presentation, 'audio') as readonly AudioTrackCandidate[],
        selectOptimal: selectAudioCurrent,
        picker: config?.picker ?? pickAudioTrack,
      },
    }),
});
