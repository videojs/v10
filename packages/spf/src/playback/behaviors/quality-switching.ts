/**
 * **Manage the per-type ABR-eligible track selection slot.** While a
 * presentation is resolved, owns the slot's lifecycle: pick a default,
 * dynamically adjust based on media metrics (today: bandwidth via
 * `selectQuality`), and clear on src unload. User intent is expressed as a
 * partial-track description in a sibling slot (e.g.
 * `userVideoTrackSelection`) which constrains the candidate set for
 * selection — when the constraint narrows candidates to exactly one, the
 * choice is fully determined and ABR is short-circuited (no bandwidth read,
 * no effect re-fire on bandwidth changes).
 *
 * Lifecycle: `'presentation-unresolved'` ↔ `'presentation-resolved'`. The
 * `'presentation-resolved'` state owns the selection slot; its
 * entry-returned cleanup clears the slot on exit (canonical
 * cleanup-binds-to-setup per `reactors.md`).
 *
 * Hysteresis: downgrades apply immediately; upgrades require the optimal
 * track's bandwidth to exceed the current track's by `upgradeMargin`. No
 * temporal state — short-term smoothing is the bandwidth estimator's job.
 *
 * Initial pick is configurable via `config.picker` — pass any `TrackPicker`
 * to override the bandwidth-aware default for the empty-slot case. ABR
 * re-evaluation (downgrade/upgrade) is unaffected. Composing
 * `switchVideoQuality` with `picker: (p) => pickFirstTrackId(p, 'video')`
 * yields "first track at load, ABR adjusts from there" — a non-bandwidth
 * initial pick paired with bandwidth-driven re-evaluation.
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
import type { TrackPicker } from '../../media/primitives/select-tracks';
import {
  isResolvedPresentation,
  type MaybeResolvedPresentation,
  type PartiallyResolvedVideoTrack,
  type VideoTrack,
} from '../../media/types';
import { getTracksByType } from '../../media/utils/tracks';
import type { BandwidthConfig, BandwidthState } from '../../network/bandwidth-estimator';
import { DEFAULT_BANDWIDTH_CONFIG, getBandwidthEstimate } from '../../network/bandwidth-estimator';

export interface QualitySwitchingState {
  presentation?: MaybeResolvedPresentation;
  bandwidthState?: BandwidthState;
  selectedVideoTrackId?: string;
  /**
   * Partial-track description expressing user intent. When set, narrows
   * the ABR candidate set to tracks matching every present field. The
   * common case is `{ id: 'specific-track-id' }` for a "manual quality"
   * pick, but other partial shapes work — e.g., `{ height: 720 }` would
   * constrain to 720p tracks; ABR continues to pick among them.
   *
   * When the narrowed candidates contain exactly one track, ABR is
   * short-circuited entirely (no bandwidth read, no effect re-fire).
   *
   * When the filter matches no tracks in the current presentation (e.g.,
   * user-picked id from a previous source doesn't exist here), falls back
   * to the unfiltered set rather than stalling playback.
   */
  userVideoTrackSelection?: Partial<VideoTrack>;
}

export interface QualitySwitchingConfig {
  /**
   * Quality-selection tuning. `safetyMargin` is the bandwidth-headroom
   * multiplier; `upgradeMargin` is the hysteresis ratio gating upgrades.
   * Defaults: `DEFAULT_QUALITY_CONFIG` (0.85 / 1.15).
   */
  quality?: Partial<QualityConfig>;

  /**
   * Bandwidth-estimator tuning passed through to `getBandwidthEstimate`.
   * Merged over `DEFAULT_BANDWIDTH_CONFIG`.
   */
  bandwidth?: Partial<BandwidthConfig>;

  /**
   * Bandwidth estimate in bps to use before enough samples have been collected.
   * Default: 5_000_000 (5 Mbps).
   */
  initialBandwidth?: number;

  /**
   * Override the initial-pick algorithm. When set, the picker is called the
   * first time the slot is empty in the `'presentation-resolved'` state;
   * its returned id is set verbatim (no bandwidth-aware logic). Subsequent
   * ABR re-evaluation (downgrade/upgrade by bandwidth + hysteresis) is
   * unaffected and runs as usual.
   *
   * Default (no picker): a bandwidth-aware initial pick driven by
   * `initialBandwidth` and `quality.safetyMargin`, identical to ABR's
   * downgrade branch.
   *
   * Honors of `userVideoTrackSelection` are the picker's responsibility
   * when overridden. If the picker returns `undefined`, the bandwidth-aware
   * default pick fires (graceful fallback).
   */
  picker?: TrackPicker<QualitySwitchingConfig>;
}

/** Default initial-bandwidth value used by quality-switching variants before measurements arrive. */
export const DEFAULT_INITIAL_BANDWIDTH = 5_000_000;

// ============================================================================
// Specialization helper
//
// `setupQualitySwitching` has the same shape as a Behavior `setup` function:
// `({ state, config }) => Reactor`. Each `switchXQuality` export below calls
// it from inside its own `defineBehavior` setup, passing the per-type slot
// keys, track type, and selection algorithm explicitly via three generic
// parameters — `S` (selection slot key), `U` (user-selection slot key), `T`
// (ABR track type). The per-type export is the single point that ties them
// together; the helper stays slot-agnostic.
//
// -- Design note: why narrow `SelectionKey` / `UserSelectionKey` unions ----
// Goal we did not reach: have callers "fully pass in" the slot keys, with
// the helper enforcing zero internal knowledge of which literals are valid.
// What blocks it: indexing a mapped-type intersection by a generic key.
// When `S extends keyof QualitySwitchingState` (or `string`), TS conservatively
// treats `state[selectionKey]` as the union of every possible match across
// the intersected mapped portions — including the fixed-key signals
// (`presentation`, `bandwidthState`) — and widens to their value-type union.
// The sibling pattern hits the same constraint and answers it the same way:
// `SelectedTrackKey` in `select-tracks.ts:43` is a hardcoded narrow union
// for the same reason.
//
// Routes considered for "fully passed in", with trade-offs (left here for
// the larger-group conversation):
//
//   A. Derived constraint — `Exclude<keyof QualitySwitchingState, 'presentation'
//      | 'bandwidthState'>`. Removes the literal enumeration; same narrowness,
//      computed from the state shape. Still "knows" the fixed-key names.
//   B. Broad constraint (`S extends keyof QualitySwitchingState`) + access-site
//      casts (`state[selectionKey] as Signal<string | undefined>` at the top
//      of the helper). Caller passes any keys; the type system stops checking
//      S ≠ U or that the keys actually refer to selection slots. Once you
//      cast at the top, the body is structurally the original remap pattern
//      with extra ceremony.
//   C. Remap pattern (pre-refactor) — caller passes signals under logical
//      names (`selection`, `userSelection`); helper has no key generics.
//      Cleanest types; inconsistent with the sibling helpers.
//
// Current pick is the narrow-union route because it matches siblings and
// the unions read as documentation ("these are the slots this helper
// manages") rather than restriction. Extending for audio is one literal
// per union.
// --------------------------------------------------------------------------
// ============================================================================

type AbrTrack = { id: string; bandwidth: number };

type SelectionKey = 'selectedVideoTrackId';
type UserSelectionKey = 'userVideoTrackSelection';

// Each mapped value references `P` so TS keeps the per-key dependency and
// resolves `state[selectionKey]` / `state[userSelectionKey]` to the right
// arm. `T` (track type) deliberately stays out of the state map — pulling
// it in detaches the user-selection mapped value from `P` and TS collapses
// the intersection. T flows through `QualitySwitchingSetupConfig` instead;
// the user-filter access casts at the read site (see below).
type QualitySwitchingStateMap<S extends SelectionKey, U extends UserSelectionKey> = {
  presentation: ReadonlySignal<QualitySwitchingState['presentation']>;
  bandwidthState: ReadonlySignal<QualitySwitchingState['bandwidthState']>;
} & { [P in S]: Signal<QualitySwitchingState[P]> } & { [P in U]: ReadonlySignal<QualitySwitchingState[P]> };

interface QualitySwitchingSetupConfig<S extends SelectionKey, U extends UserSelectionKey, T extends AbrTrack>
  extends QualitySwitchingConfig {
  selectionKey: S;
  userSelectionKey: U;
  getTracks: (presentation: MaybeResolvedPresentation) => readonly T[];
  selectOptimal: (
    tracks: readonly T[],
    bandwidth: number,
    opts: { safetyMargin: number; upgradeMargin: number; currentTrack?: T }
  ) => T | undefined;
}

function setupQualitySwitching<S extends SelectionKey, U extends UserSelectionKey, T extends AbrTrack>({
  state,
  config,
}: {
  state: QualitySwitchingStateMap<S, U>;
  config: QualitySwitchingSetupConfig<S, U, T>;
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

            // State stores the filter as `Partial<VideoTrack>` (user-facing
            // shape — includes V-only fields like `height`); the helper
            // works against `Partial<T>` so filter and track access share
            // one index type. Filter keys absent on a partially-resolved
            // track read as `undefined` and just exclude that track.
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
            // `{ id: 'specific-720p' }` narrows to a single track). Skip
            // the ABR path — and crucially, don't read `bandwidthState`
            // so the effect doesn't re-fire on bandwidth changes while
            // the user's selection holds.
            if (candidates.length === 1) {
              if (candidates[0]!.id !== selectedId) state[selectionKey].set(candidates[0]!.id);
              return;
            }

            // Read bandwidth up front to establish the signal subscription —
            // future bandwidth changes must re-fire this effect even when
            // the picker branch below takes the early-return path. (If the
            // picker bails out without ever touching `bandwidthState`, ABR
            // would otherwise be deaf to subsequent bandwidth changes.)
            //
            // Single path for pre-trust and post-trust:
            // `getBandwidthEstimate` returns `initialBandwidth` when state
            // is undefined or bytes sampled hasn't crossed `minTotalBytes`,
            // so the initial pick + early-ABR window run the same
            // `selectOptimal` path as a fully-trusted measurement.
            const bandwidth = getBandwidthEstimate(state.bandwidthState.get(), initialBandwidth, bandwidthConfig);

            // Picker-driven initial pick: when the slot is empty and the
            // caller supplied a `picker`, defer to it instead of the
            // bandwidth-aware default. The picker sees the full
            // presentation (not narrowed by `userVideoTrackSelection`) —
            // honoring the filter is the picker's responsibility when
            // overridden. Returning `undefined` falls through to the
            // bandwidth-aware default (graceful fallback).
            //
            // ABR re-evaluation (downgrade/upgrade by bandwidth) runs as
            // usual on subsequent effect re-runs once the slot is set.
            if (!selectedId && config.picker) {
              const id = config.picker(presentation, config);
              if (id) {
                state[selectionKey].set(id);
                return;
              }
            }
            // `selectOptimal` decides the track to apply now given current
            // selection + bandwidth + tuning. It returns:
            //   - the optimal when no current track or on a downgrade
            //   - the optimal when an upgrade clears `upgradeMargin`
            //   - the current track itself when an upgrade doesn't clear margin
            //     (caller's id-compare below no-ops in that case)
            // Outer `?? selectLowestQuality` is defensive — `selectQuality` falls
            // back to lowest internally; this catches future impls that don't.
            // `selectLowestQuality` returns `undefined` only on empty input,
            // and `candidates.length >= 2` here.
            const currentTrack = candidates.find((t) => t.id === selectedId);
            const optimal =
              selectOptimal(candidates, bandwidth, { safetyMargin, upgradeMargin, currentTrack }) ??
              selectLowestQuality(candidates)!;
            if (optimal.id !== selectedId) state[selectionKey].set(optimal.id);
          },
        ],
      },
    },
  });
}

// ============================================================================
// Specialized exports — one per ABR-enabled track type
// ============================================================================

/**
 * Manage `selectedVideoTrackId`: pick a default on src load, dynamically
 * adjust based on bandwidth, clear on src unload. Honors
 * `userVideoTrackSelection` as a partial-track constraint on candidates;
 * short-circuits ABR when the constraint narrows to a single track.
 *
 * @example
 * const reactor = switchVideoQuality.setup({ state });
 */
export const switchVideoQuality = defineBehavior({
  stateKeys: ['presentation', 'bandwidthState', 'selectedVideoTrackId', 'userVideoTrackSelection'],
  contextKeys: [],
  setup: ({
    state,
    config,
  }: {
    state: QualitySwitchingStateMap<'selectedVideoTrackId', 'userVideoTrackSelection'>;
    config?: QualitySwitchingConfig;
  }) =>
    setupQualitySwitching<'selectedVideoTrackId', 'userVideoTrackSelection', PartiallyResolvedVideoTrack | VideoTrack>({
      state,
      config: {
        ...config,
        selectionKey: 'selectedVideoTrackId',
        userSelectionKey: 'userVideoTrackSelection',
        getTracks: (presentation) =>
          getTracksByType(presentation, 'video') as readonly (PartiallyResolvedVideoTrack | VideoTrack)[],
        selectOptimal: selectQuality,
      },
    }),
});
