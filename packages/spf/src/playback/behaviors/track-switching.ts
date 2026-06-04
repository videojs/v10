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
 *   2. **ranking** — the terminal sort: a per-variant ranker rule (video
 *      `rankByQuality` — ABR with hysteresis, downgrades immediate, upgrades
 *      gated by `upgradeMargin`; audio `pinToCurrentTrack`).
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
 * The pick is the head of the chain's result (`applyRules(...)[0]`). Each
 * variant supplies its **rule chain** via config; `setupTrackSwitching` owns
 * only the lifecycle and runs whatever chain it's given. Variants:
 * `switchVideoTrack` (bandwidth-driven ranker, ABR tuning config),
 * `switchAudioTrack` (pin-to-current ranker, no config yet).
 *
 * Deferred (not yet in the chain): a hard-constraints pre-pass (capability
 * probing, CDN failover) gating the candidate set, and audio's preferred-
 * language / default-track selection as standing soft-filter rules — previously
 * the empty-slot picker, dropped in the move to the rule chain.
 */

import { type AnySlotMap, defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import {
  DEFAULT_QUALITY_CONFIG,
  type QualityConfig,
  selectLowestQualityWithBandwidth,
  selectQuality,
} from '../../media/abr/quality-selection';
import { matchesPartialTrack } from '../../media/primitives/select-tracks';
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

/**
 * Config for `switchVideoTrack` — the ABR tuning read by its ranker rule
 * (`rankByQuality`). `quality.safetyMargin` is the bandwidth-headroom
 * multiplier; `quality.upgradeMargin` the hysteresis ratio gating upgrades;
 * `bandwidth` tunes the estimator; `initialBandwidth` is the pre-sample
 * fallback. Defaults: `DEFAULT_QUALITY_CONFIG` (0.85 / 1.15),
 * `DEFAULT_BANDWIDTH_CONFIG`, `DEFAULT_INITIAL_BANDWIDTH` (5 Mbps).
 */
export interface SwitchVideoTrackConfig {
  quality?: Partial<QualityConfig>;
  bandwidth?: Partial<BandwidthConfig>;
  initialBandwidth?: number;
}

/** Default initial-bandwidth value before bandwidth measurements arrive. */
export const DEFAULT_INITIAL_BANDWIDTH = 5_000_000;

// ============================================================================
// Rule chain
// ============================================================================

/**
 * Deps handed to each rule and to `applyRules`, mirroring a behavior's setup
 * deps so a rule reads from the same surfaces a behavior does.
 */
export interface SelectionRuleDeps<State = unknown, Context = unknown, Config = unknown> {
  state: State;
  context: Context;
  config: Config;
}

/**
 * A selection rule narrows or reorders the candidate list. It reads the state,
 * context, and config it needs at apply time (tightly-coupled reads), so a
 * rule's `.get()`s subscribe the running effect to exactly what it consulted.
 * Returning an empty list means "no match" — the composer skips it, so a soft
 * filter never narrows the set to nothing. A ranker returns the list with its
 * pick at the head.
 */
export type SelectionRule<T, State = unknown, Context = unknown, Config = unknown> = (
  tracks: readonly T[],
  deps: SelectionRuleDeps<State, Context, Config>
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
 * @param deps - The behavior's `{ state, context, config }`, passed through to each rule
 * @returns The surviving candidates, pick first
 */
export function applyRules<T, State, Context, Config>(
  rules: readonly SelectionRule<T, State, Context, Config>[],
  tracks: readonly T[],
  deps: SelectionRuleDeps<State, Context, Config>
): readonly T[] {
  let current = tracks;
  for (const rule of rules) {
    const remaining = rule(current, deps);
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
// keys, candidate track type, and rule chain via three generic parameters —
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
 * Config `setupTrackSwitching` receives — the per-variant wiring: which slots
 * to read/write (`selectionKey` / `userSelectionKey`), how to enumerate the
 * candidate tracks (`getTracks`), and the **rule chain** to run. ABR tuning is
 * optional and read only by the video ranker rule (`rankByQuality`); audio
 * leaves it unset.
 */
interface TrackSwitchingSetupConfig<S extends SelectionKey, U extends UserSelectionKey, T extends SwitchableTrack> {
  selectionKey: S;
  userSelectionKey: U;
  getTracks: (presentation: MaybeResolvedPresentation) => readonly T[];
  rules: readonly SelectionRule<T, TrackSwitchingStateMap<S, U>, AnySlotMap, TrackSwitchingSetupConfig<S, U, T>>[];
  quality?: Partial<QualityConfig>;
  bandwidth?: Partial<BandwidthConfig>;
  initialBandwidth?: number;
}

/**
 * Deps shape every track-switching rule consumes. Context conforms to the
 * generic slot-map shape (`AnySlotMap`) — threaded through but with no keys
 * read today, ready for a rule that consults context (e.g. CDN pathway).
 */
type TrackSwitchingRuleDeps<
  S extends SelectionKey,
  U extends UserSelectionKey,
  T extends SwitchableTrack,
> = SelectionRuleDeps<TrackSwitchingStateMap<S, U>, AnySlotMap, TrackSwitchingSetupConfig<S, U, T>>;

type VideoTrackCandidate = PartiallyResolvedVideoTrack | VideoTrack;
type AudioTrackCandidate = PartiallyResolvedAudioTrack | AudioTrack;

// ----------------------------------------------------------------------------
// Rules — defined outside the behavior closure, parameterized only by their
// deps. Each is generic over the slot keys + track type; the variant's
// concrete keys instantiate it where the chain is assembled.
// ----------------------------------------------------------------------------

/**
 * User intent — a soft filter. Narrows to tracks matching the partial-track
 * selection in `user*TrackSelection`; an empty match falls through (the
 * composer skips it) to the unfiltered set — e.g. a stale id from a previous
 * source.
 */
function filterByUserSelection<S extends SelectionKey, U extends UserSelectionKey, T extends SwitchableTrack>(
  tracks: readonly T[],
  { state, config }: TrackSwitchingRuleDeps<S, U, T>
): readonly T[] {
  const filter = state[config.userSelectionKey].get() as Partial<T> | undefined;
  return filter ? tracks.filter((track) => matchesPartialTrack(track, filter)) : tracks;
}

/**
 * Video ranking — the terminal sort. Reads the bandwidth estimate + ABR tuning
 * from config, runs `selectQuality` (hysteresis: downgrades immediate, upgrades
 * gated by `upgradeMargin`), and returns the list with the pick at the head.
 * Early-bail skips this rule when a prior one narrowed to a single track, so the
 * bandwidth estimate is neither read nor subscribed while that choice holds.
 */
function rankByQuality<S extends SelectionKey, U extends UserSelectionKey>(
  tracks: readonly VideoTrackCandidate[],
  { state, config }: TrackSwitchingRuleDeps<S, U, VideoTrackCandidate>
): readonly VideoTrackCandidate[] {
  const safetyMargin = config.quality?.safetyMargin ?? DEFAULT_QUALITY_CONFIG.safetyMargin;
  const upgradeMargin = config.quality?.upgradeMargin ?? DEFAULT_QUALITY_CONFIG.upgradeMargin;
  const initialBandwidth = config.initialBandwidth ?? DEFAULT_INITIAL_BANDWIDTH;
  const bandwidthConfig: BandwidthConfig = { ...DEFAULT_BANDWIDTH_CONFIG, ...config.bandwidth };
  const bandwidth = getBandwidthEstimate(state.bandwidthState.get(), initialBandwidth, bandwidthConfig);
  const currentTrack = tracks.find((track) => track.id === state[config.selectionKey].get());
  const optimal =
    selectQuality(tracks, { bandwidth, safetyMargin, upgradeMargin, currentTrack }) ??
    selectLowestQualityWithBandwidth(tracks);
  return optimal ? [optimal, ...tracks.filter((track) => track !== optimal)] : tracks;
}

/**
 * Pin-to-current ranking — keeps the currently-selected track if it's still a
 * candidate, otherwise takes the first. The non-ABR ranker (audio today); reads
 * no bandwidth, so it never subscribes the effect to bandwidth changes.
 */
function pinToCurrentTrack<S extends SelectionKey, U extends UserSelectionKey, T extends SwitchableTrack>(
  tracks: readonly T[],
  { state, config }: TrackSwitchingRuleDeps<S, U, T>
): readonly T[] {
  const currentTrack = tracks.find((track) => track.id === state[config.selectionKey].get());
  const pick = currentTrack ?? tracks[0];
  return pick ? [pick, ...tracks.filter((track) => track !== pick)] : tracks;
}

// `context` is the composition's context map, threaded in by each variant's
// rest-spread and typed as the generic slot-map shape (`AnySlotMap`). It can't
// be a typed param on the `defineBehavior` setup without widening `ContextMap`
// to its constraint and forcing the slot required, so the variants forward it
// untyped via the rest and it lands here; the `{}` default covers direct setup
// calls (tests) that omit it.
function setupTrackSwitching<S extends SelectionKey, U extends UserSelectionKey, T extends SwitchableTrack>({
  state,
  context = {},
  config,
}: {
  state: TrackSwitchingStateMap<S, U>;
  context?: AnySlotMap;
  config: TrackSwitchingSetupConfig<S, U, T>;
}) {
  const { selectionKey, getTracks, rules } = config;

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
        // Canonical cleanup-binds-to-setup: the selection signal's valid
        // lifespan is exactly 'presentation-resolved'. Clear fires on exit,
        // covering both src unload and behavior destroy.
        entry: () => () => state[selectionKey].set(undefined),
        effects: [
          () => {
            const presentation = peek(state.presentation);
            if (!presentation) return;

            const allTracks = getTracks(presentation);
            if (!allTracks.length) return;

            // state + config come from the behavior's deps; context arrives from
            // the composition (threaded in by the variant's rest-spread). Each is
            // passed to every rule in the variant-supplied chain.
            const candidates = applyRules(rules, allTracks, { state, context, config });

            // applyRules early-bails to a single survivor and never narrows to
            // nothing (a soft filter that would empty the set falls through), so
            // the pick is just the head. An empty result means a rule misbehaved
            // — applyRules is supposed to account for those cases, so surface it.
            if (!candidates.length) {
              console.error('[track-switching] applyRules returned no candidates');
              return;
            }
            // No change-guard needed: the slot uses default (Object.is) equality,
            // so re-setting the same id is a no-op (no notify, no re-fire).
            state[selectionKey].set(candidates[0]!.id);
          },
        ],
      },
    },
  });
}

// ============================================================================
// Variant: switchVideoTrack — bandwidth-driven ABR
// ============================================================================

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
    ...otherProps
  }: {
    state: TrackSwitchingStateMap<'selectedVideoTrackId', 'userVideoTrackSelection'>;
    config?: SwitchVideoTrackConfig;
  }) =>
    setupTrackSwitching<'selectedVideoTrackId', 'userVideoTrackSelection', VideoTrackCandidate>({
      ...otherProps,
      state,
      config: {
        ...config,
        selectionKey: 'selectedVideoTrackId',
        userSelectionKey: 'userVideoTrackSelection',
        getTracks: (presentation) => getTracksByType(presentation, 'video') as readonly VideoTrackCandidate[],
        rules: [filterByUserSelection, rankByQuality],
      },
    }),
});

// ============================================================================
// Variant: switchAudioTrack — pin-to-current (ABR-ready shape)
// ============================================================================

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
    ...otherProps
  }: {
    state: TrackSwitchingStateMap<'selectedAudioTrackId', 'userAudioTrackSelection'>;
  }) =>
    setupTrackSwitching<'selectedAudioTrackId', 'userAudioTrackSelection', AudioTrackCandidate>({
      ...otherProps,
      state,
      config: {
        selectionKey: 'selectedAudioTrackId',
        userSelectionKey: 'userAudioTrackSelection',
        getTracks: (presentation) => getTracksByType(presentation, 'audio') as readonly AudioTrackCandidate[],
        rules: [filterByUserSelection, pinToCurrentTrack],
      },
    }),
});
