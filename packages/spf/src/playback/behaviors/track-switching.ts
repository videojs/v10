/**
 * **Per-type track selection as a rule chain.** While a presentation is
 * resolved, owns that type's `selected{Video,Audio}TrackId` signal: pick a
 * default, react to user intent and algorithmic ranking, and clear it on src
 * unload.
 *
 * Selection runs a small ordered chain of rules over the candidate tracks
 * (`applyRules`). Each rule narrows or reorders the list and reads the signals
 * it needs at apply time, so the effect subscribes to exactly what the applied
 * rules consult. Today the chain is two rules, most authoritative first:
 *
 *   1. **user intent** — a soft filter on `user*TrackSelection`: narrow to the
 *      partial-track match; an empty match falls through to the full set.
 *   2. **ranking** — the terminal sort: the per-variant `selectOptimal` over
 *      the bandwidth estimate (video ABR with hysteresis — downgrades immediate,
 *      upgrades gated by `upgradeMargin`; audio pin-to-current).
 *
 * The composer's early-bail (one survivor → stop) is load-bearing: a user
 * selection that narrows to a single track is the pick without the ranker
 * running, so the bandwidth estimate is never read and the effect doesn't
 * re-fire on bandwidth while that choice holds.
 *
 * Lifecycle: `'presentation-unresolved'` ↔ `'presentation-resolved'`. The
 * resolved state owns the signal; its entry-returned cleanup clears it on exit
 * (canonical cleanup-binds-to-setup per `reactors.md`).
 *
 * `config.picker` provides the empty-slot initial default (e.g. audio's
 * language-aware pick) ahead of the ranker's head. Variants: `switchVideoTrack`
 * (bandwidth-driven ranker), `switchAudioTrack` (pin-to-current ranker,
 * ABR-ready for when audio-ABR lands); both share `setupTrackSwitching`, with
 * the candidate type and `selectOptimal` as the variation points.
 *
 * Deferred (not yet in the chain): a hard-constraints pre-pass (capability
 * probing, CDN failover) gating the candidate set, and promoting the picker's
 * preferred-language / default-track logic to standing soft-filter rules.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import {
  DEFAULT_QUALITY_CONFIG,
  type QualityConfig,
  selectLowestQualityWithBandwidth,
  selectQuality,
} from '../../media/abr/quality-selection';
import { matchesPartialTrack, pickAudioTrack, type TrackPicker } from '../../media/primitives/select-tracks';
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
// Rule chain
// ============================================================================

/**
 * A selection rule narrows or reorders the candidate list. It reads the state
 * and context signals it needs at apply time (tightly-coupled reads), so a
 * rule's `.get()`s subscribe the running effect to exactly what it consulted.
 * Returning an empty list means "no match" — the composer skips it, so a soft
 * filter never narrows the set to nothing. A ranker returns the list with its
 * pick at the head.
 */
export type SelectionRule<T, State = unknown, Context = unknown> = (
  tracks: readonly T[],
  state: State,
  context: Context
) => readonly T[];

/**
 * Apply rules to a candidate list in order; the pick is the first survivor.
 * Two responsibilities the rules don't carry: a rule that returns nothing is
 * skipped (fall-through — a preference never empties the set), and once one
 * survivor remains the chain stops (early-bail — later rules, including the
 * bandwidth ranker, never run, so the effect doesn't subscribe to their
 * signals while the choice is fixed).
 *
 * @param rules - Rules to apply, most authoritative first
 * @param tracks - Candidate tracks
 * @param state - The behavior's state signal map, passed through to each rule
 * @param context - The behavior's context signal map, passed through to each rule
 * @returns The surviving candidates, pick first
 */
export function applyRules<T, State, Context>(
  rules: readonly SelectionRule<T, State, Context>[],
  tracks: readonly T[],
  state: State,
  context: Context
): readonly T[] {
  let current = tracks;
  for (const rule of rules) {
    const remaining = rule(current, state, context);
    if (remaining.length === 0) continue;
    current = remaining;
    if (current.length === 1) break;
  }
  return current;
}

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

  // The selection chain, most authoritative first. Each rule reads the signals
  // it needs from the state passed at apply time, so the effect subscribes to
  // exactly what the applied rules consult.
  const rules: SelectionRule<T, TrackSwitchingStateMap<S, U>>[] = [
    // User intent — a soft filter. Narrows to tracks matching the partial-track
    // selection; an empty match falls through (the composer skips it) to the
    // unfiltered set — e.g. a stale id from a previous source.
    (tracks, ruleState) => {
      const filter = ruleState[userSelectionKey].get() as Partial<T> | undefined;
      return filter ? tracks.filter((track) => matchesPartialTrack(track, filter)) : tracks;
    },
    // Ranking — the terminal sort. Reads the bandwidth estimate, runs the
    // per-variant `selectOptimal` (video ABR with hysteresis; audio
    // pin-to-current), and returns the list with the pick at the head. Early-
    // bail skips this rule when a prior one narrowed to a single track, so the
    // bandwidth estimate is neither read nor subscribed while that choice holds.
    (tracks, ruleState) => {
      const bandwidth = getBandwidthEstimate(ruleState.bandwidthState.get(), initialBandwidth, bandwidthConfig);
      const currentTrack = tracks.find((track) => track.id === ruleState[selectionKey].get());
      const optimal =
        selectOptimal(tracks, { bandwidth, safetyMargin, upgradeMargin, currentTrack }) ??
        selectLowestQualityWithBandwidth(tracks);
      return optimal ? [optimal, ...tracks.filter((track) => track !== optimal)] : tracks;
    },
  ];

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
            if (!allTracks.length) return;

            // Context is unused by today's rules; the chain reads only state
            // signals. Real engine context threads here when a context-reading
            // rule lands (e.g. CDN pathway).
            const candidates = applyRules(rules, allTracks, state, {});
            const selectedId = state[selectionKey].get();

            // A single survivor — an early-bail from the chain, or a single-
            // track source — is the pick outright, decided before the picker
            // (matching the prior short-circuit, including never reading
            // bandwidth). Otherwise an empty slot defers to the optional
            // initial-pick picker (e.g. audio's language-aware default),
            // falling back to the ranker's head; a populated slot takes the
            // ranker's head.
            const pickId =
              candidates.length === 1
                ? candidates[0]!.id
                : !selectedId && config.picker
                  ? (config.picker(presentation, config) ?? candidates[0]?.id)
                  : candidates[0]?.id;

            if (pickId && pickId !== selectedId) state[selectionKey].set(pickId);
          },
        ],
      },
    },
  });
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
