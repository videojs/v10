/**
 * **Per-type track selection as a rule chain.** While a presentation is
 * resolved, owns that type's `selected{Video,Audio}TrackId` signal: pick a
 * default, react to user intent and algorithmic ranking, and clear it on src
 * unload.
 *
 * Selection runs a small ordered chain of rules over the candidate tracks
 * (`applyRules`). Each rule narrows or reorders the list and reads the signals
 * it needs at apply time, so the effect subscribes to exactly what the applied
 * rules consult. Today the chain is three rules, most authoritative first:
 *
 *   1. **user intent** — a soft filter on `user*TrackSelection`: narrow to the
 *      partial-track match; an empty match falls through to the full set.
 *   2. **active CDN** — a soft filter on `cdnPriority` (`preferActiveCdn`):
 *      narrow to the highest-priority CDN that still has tracks; an empty match
 *      falls through. Shared by video and audio, so every type stays on one CDN
 *      (`resolveCdnPriority` owns the list). No-op for non-redundant sources.
 *   3. **ranking** — the terminal sort: `rankByBandwidth`, shared by video and
 *      audio. Fitting tracks (within the throughput threshold) first, highest
 *      bitrate first; over-throughput tracks after, least-over first. Hysteresis
 *      via boosting the current track's sort weight by `upgradeMargin`.
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
 * only the lifecycle and runs whatever chain it's given. Both variants today run
 * `[filterByUserSelection, preferActiveCdn, rankByBandwidth]`; `switchVideoTrack`
 * also accepts ABR tuning config, `switchAudioTrack` takes none.
 *
 * Deferred (not yet in the chain): a hard-constraints pre-pass (capability
 * probing, CDN *failover* — excluding a failed CDN's tracks during cooldown)
 * gating the candidate set, and audio's preferred-language / default-track
 * selection as standing soft-filter rules — previously the empty-slot picker,
 * dropped in the move to the rule chain. (The active-CDN *scope* above is the
 * sticky-pick half of multi-CDN; the failed-CDN constraint is the failover half.)
 */

import { type AnySlotMap, defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import { DEFAULT_QUALITY_CONFIG, type QualityConfig, resolutionArea } from '../../media/abr/quality-selection';
import { matchesPartialTrack } from '../../media/primitives/select-tracks';
import {
  type AudioTrack,
  isResolvedPresentation,
  type MaybeResolvedPresentation,
  type PartiallyResolvedAudioTrack,
  type PartiallyResolvedVideoTrack,
  type VideoTrack,
} from '../../media/types';
import { getCdnId } from '../../media/utils/cdn';
import { getTracksByType } from '../../media/utils/tracks';
import type { BandwidthConfig, BandwidthState } from '../../network/bandwidth-estimator';
import { DEFAULT_BANDWIDTH_CONFIG, getBandwidthEstimate } from '../../network/bandwidth-estimator';

// ============================================================================
// State + Config
// ============================================================================

/**
 * The slots `setupTrackSwitching` itself owns: the `presentation` gate it reads
 * and the per-type `selected*TrackId` it writes. Rule-only inputs are
 * deliberately absent — `user*TrackSelection` and `bandwidthState` belong to
 * whoever materializes them (the embedder via `shareSignals`, the buffer-actor
 * sampler), and each rule declares the signal it consults as an optional slot
 * on its own deps map, so the behavior never assumes a rule's signal exists.
 */
export interface TrackSwitchingState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

/**
 * Config for `switchVideoTrack` — the ABR tuning read by its ranker rule
 * (`rankByBandwidth`). `quality.safetyMargin` is the bandwidth-headroom
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
 * deps so a rule reads from the same surfaces a behavior does. `context` is
 * optional — it's threaded through but absent on direct setup calls (and
 * unread by today's rules), so the whole deps object can pass straight through.
 */
export interface SelectionRuleDeps<State = unknown, Context = unknown, Config = unknown> {
  state: State;
  context?: Context;
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
// it from inside its own `defineBehavior` setup. Its generics — `S` (selection
// slot key), `T` (candidate track type), `C` (the concrete config the variant
// builds) — all infer from the passed `state` + `config`, so the variants need
// no explicit type arguments. `C extends TrackSwitchingConfig<S, T>` lets the
// variant's richer config (rule-specific fields included) flow through the
// helper untouched; the rules read those fields off their own config views.
//
// -- Design note: why narrow `SelectionKey` / `UserSelectionKey` unions ----
// Goal we did not reach: have callers "fully pass in" the slot keys, with
// the helper enforcing zero internal knowledge of which literals are valid.
// What blocks it: indexing a mapped-type intersection by a generic key.
// When `S extends keyof TrackSwitchingState` (or `string`), TS conservatively
// treats `state[selectionKey]` as the union of every possible match across
// the intersected mapped portions — including the fixed-key signal
// (`presentation`) — and widens to their value-type union.
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

/**
 * Minimum candidate-track shape consumed by the helper and its rules: an `id`
 * (the pick), a `url` (the active-CDN scope derives the CDN from it), an
 * optional `bandwidth` (the ranker's throughput sort), and optional
 * `width`/`height` (the ranker's equal-bitrate tie-break — absent on audio, so
 * audio candidates area-compare equal). Every resolved/partially-resolved video
 * track carries them all; audio tracks omit the dimensions.
 */
type SwitchableTrack = { id: string; url: string; bandwidth?: number; width?: number; height?: number };

type SelectionKey = 'selectedVideoTrackId' | 'selectedAudioTrackId';
type UserSelectionKey = 'userVideoTrackSelection' | 'userAudioTrackSelection';

// Each mapped value references `P` so TS keeps the per-key dependency and
// resolves `state[selectionKey]` to the right arm. `T` (track type) stays out
// of the state map (it flows through `TrackSwitchingConfig` instead).
//
// Only the behavior's own lifecycle signals are required here: the presentation
// gate and the selection slot it writes. Signals a *rule* reads but the
// behavior doesn't — `user*TrackSelection` (the user-selection filter) and
// `bandwidthState` (the bandwidth ranker) — are NOT here; each rule declares
// the signal it needs as *optional* on its own deps and reads it defensively,
// so the behavior never assumes a rule-only signal exists. Those slots are
// materialized by whoever owns them: `shareSignals` for the consumer-input
// `user*TrackSelection`, the buffer-actor sampler for `bandwidthState`.
type TrackSwitchingStateMap<S extends SelectionKey> = {
  presentation: ReadonlySignal<TrackSwitchingState['presentation']>;
} & { [P in S]: Signal<TrackSwitchingState[P]> };

/**
 * Config `setupTrackSwitching` itself reads — its own wiring: which selection
 * slot to write and clear (`selectionKey`), how to enumerate candidate tracks
 * (`getTracks`), and the **rule chain** to run (`rules`). Rule-specific config
 * is deliberately absent — each rule declares the fields it reads as *optional*
 * on its own config view (`UserSelectionConfig`, `BandwidthRankerConfig`), so
 * the behavior never enumerates a rule's config. The variant builds the
 * concrete config as this base plus whatever its chain's rules consult; it
 * flows through untouched as the `C` type param on `setupTrackSwitching`.
 */
interface TrackSwitchingConfig<S extends SelectionKey, T extends SwitchableTrack> {
  selectionKey: S;
  getTracks: (presentation: MaybeResolvedPresentation) => readonly T[];
  rules: readonly SelectionRule<T, TrackSwitchingStateMap<S>, AnySlotMap, TrackSwitchingConfig<S, T>>[];
}

/**
 * State the user-selection filter reads: the lifecycle map plus an *optional*
 * user-selection slot (keyed by `U`), holding a partial-track description to
 * match against the candidates (`Partial<T>` — `{ id }`, `{ language }`,
 * `{ height }`, …). The slot exists only when the composition provides it
 * (materialized by `shareSignals`); the filter reads it defensively and no-ops
 * when it's absent (no user override).
 */
type UserSelectionStateMap<
  S extends SelectionKey,
  U extends UserSelectionKey,
  T extends SwitchableTrack,
> = TrackSwitchingStateMap<S> & {
  [P in U]?: ReadonlySignal<Partial<T> | undefined>;
};

/**
 * Config the user-selection filter reads: `userSelectionKey` names the state
 * slot holding the user's selection. *Optional* on the rule's view — the base
 * config doesn't carry it, so an unwired key means "no user selection" and the
 * filter passes through. The variants always supply it.
 */
type UserSelectionConfig<
  S extends SelectionKey,
  U extends UserSelectionKey,
  T extends SwitchableTrack,
> = TrackSwitchingConfig<S, T> & { userSelectionKey?: U };

/**
 * State the bandwidth ranker reads: the lifecycle map plus an *optional*
 * `bandwidthState`. The signal exists only when the composition includes a
 * bandwidth sampler; the ranker reads it defensively and falls back to
 * `initialBandwidth` (with a debug note) when it's absent.
 */
type BandwidthRankerStateMap<S extends SelectionKey> = TrackSwitchingStateMap<S> & {
  bandwidthState?: ReadonlySignal<BandwidthState | undefined>;
};

/**
 * Config the bandwidth ranker reads: the ABR tuning in `SwitchVideoTrackConfig`
 * (`quality` / `bandwidth` / `initialBandwidth`), all optional with defaults.
 */
type BandwidthRankerConfig<S extends SelectionKey, T extends SwitchableTrack> = TrackSwitchingConfig<S, T> &
  SwitchVideoTrackConfig;

/**
 * State the active-CDN scope reads: the lifecycle map plus an *optional*
 * `cdnPriority` — the manifest-ordered CDN list (most-preferred first). The
 * signal exists only when the composition includes `resolveCdnPriority` (which
 * materializes + owns it); the scope reads it defensively and passes through
 * when it's absent (no CDN preference).
 */
type CdnScopeStateMap<S extends SelectionKey> = TrackSwitchingStateMap<S> & {
  cdnPriority?: ReadonlySignal<string[] | undefined>;
};

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
  { state, config }: SelectionRuleDeps<UserSelectionStateMap<S, U, T>, AnySlotMap, UserSelectionConfig<S, U, T>>
): readonly T[] {
  const key = config.userSelectionKey;
  if (!key) return tracks;
  const filter = state[key]?.get();
  return filter ? tracks.filter((track) => matchesPartialTrack(track, filter)) : tracks;
}

/**
 * Active-CDN scope — a soft filter, shared by video and audio. Narrows to the
 * highest-priority CDN in `cdnPriority` (owned by `resolveCdnPriority`) that
 * still has tracks, so every track type stays on one CDN. A redundant-streams
 * source lists the same renditions on multiple hosts; this keeps the pick on one
 * host rather than letting the ranker drift across them.
 *
 * "Active" is derived, not stored: constraints run before the rule chain, so a
 * failed CDN's tracks are already pruned by the time this runs — "first CDN with
 * survivors" *is* the active CDN, and it falls through to the next on failover
 * (and snaps back to the primary when it recovers). Content steering reorders
 * `cdnPriority`; this rule just honors the order.
 *
 * Soft-filter semantics: passes through when there's no `cdnPriority` signal/value
 * (no preference) or when nothing matches (`applyRules` skips an empty result).
 * Non-redundant sources have one CDN, so the narrow is a no-op.
 *
 * The CDN-id derivation (`getCdnId`, origin-based) is hardcoded for now; a
 * consumer-configurable derivation can move onto a rule config view later.
 */
function preferActiveCdn<S extends SelectionKey, T extends SwitchableTrack>(
  tracks: readonly T[],
  { state }: SelectionRuleDeps<CdnScopeStateMap<S>, AnySlotMap, TrackSwitchingConfig<S, T>>
): readonly T[] {
  const cdnPriority = state.cdnPriority?.get();
  if (!cdnPriority?.length) return tracks;
  for (const cdn of cdnPriority) {
    const tracksUsingCdn = tracks.filter((track) => getCdnId(track.url) === cdn);
    if (tracksUsingCdn.length) return tracksUsingCdn;
  }
  return tracks;
}

/**
 * Bandwidth ranking — the terminal sort, shared by video and audio. Orders by
 * the throughput estimate: tracks within the bandwidth threshold first
 * (fitting), highest bitrate first; then over-threshold tracks, least-over
 * first. The head is the best-quality track that fits, falling back to the
 * smallest over-throughput track when nothing fits.
 *
 * Hysteresis without temporal state: the current track's effective bitrate is
 * boosted by `upgradeMargin` in the fitting sort, so a higher track only
 * outranks it once it clears `current.bitrate * upgradeMargin` (no flapping on
 * marginal bandwidth gains). Downgrades fall out for free — a current track
 * over the threshold isn't in the fitting set to be boosted, so the best fit (a
 * downgrade) wins immediately. Equal-bitrate tracks break by resolution (higher
 * `width × height` first), so an equal-bitrate ladder never picks a lower-
 * quality rendition by manifest order; audio tracks carry no dimensions, so
 * they area-compare equal and a stable sort keeps their candidate order (e.g.
 * same-bitrate language variants). Early-bail skips this rule when a prior one
 * narrowed to a single track, so the estimate is neither read nor subscribed
 * while that holds.
 */
function rankByBandwidth<S extends SelectionKey, T extends SwitchableTrack>(
  tracks: readonly T[],
  { state, config }: SelectionRuleDeps<BandwidthRankerStateMap<S>, AnySlotMap, BandwidthRankerConfig<S, T>>
): readonly T[] {
  const safetyMargin = config.quality?.safetyMargin ?? DEFAULT_QUALITY_CONFIG.safetyMargin;
  const upgradeMargin = config.quality?.upgradeMargin ?? DEFAULT_QUALITY_CONFIG.upgradeMargin;
  const initialBandwidth = config.initialBandwidth ?? DEFAULT_INITIAL_BANDWIDTH;
  const bandwidthConfig: BandwidthConfig = { ...DEFAULT_BANDWIDTH_CONFIG, ...config.bandwidth };
  if (!state.bandwidthState) {
    console.debug(
      '[track-switching] rankByBandwidth: no bandwidthState signal in composition; ranking on initialBandwidth'
    );
  }
  const threshold = getBandwidthEstimate(state.bandwidthState?.get(), initialBandwidth, bandwidthConfig) * safetyMargin;
  const currentId = state[config.selectionKey].get();
  const bitrate = (track: T) => track.bandwidth ?? 0;
  // Boost the current track's sort weight by upgradeMargin (fitting set only) so
  // an upgrade must clear current.bitrate * upgradeMargin to outrank it.
  const rank = (track: T) => (track.id === currentId ? bitrate(track) * upgradeMargin : bitrate(track));
  // Equal bitrate → prefer higher resolution (width × height), so an
  // equal-bitrate ladder doesn't pick a lower-quality rendition by manifest
  // order. Audio tracks carry no dimensions, so they area-compare equal and
  // keep candidate order (stable sort).
  const fitting = tracks
    .filter((track) => bitrate(track) <= threshold)
    .sort((a, b) => rank(b) - rank(a) || resolutionArea(b) - resolutionArea(a));
  const over = tracks
    .filter((track) => bitrate(track) > threshold)
    .sort((a, b) => bitrate(a) - bitrate(b) || resolutionArea(b) - resolutionArea(a));
  return [...fitting, ...over];
}

// `context` is the composition's context map, threaded in by each variant's
// rest-spread and typed as the generic slot-map shape (`AnySlotMap`). It can't
// be a typed param on the `defineBehavior` setup without widening `ContextMap`
// to its constraint and forcing the slot required, so the variants forward it
// untyped via the rest and it lands here — absent on direct setup calls, and
// passed straight through to the rules (which don't read it yet).
function setupTrackSwitching<
  S extends SelectionKey,
  T extends SwitchableTrack,
  C extends TrackSwitchingConfig<S, T>,
>(deps: { state: TrackSwitchingStateMap<S>; context?: AnySlotMap; config: C }) {
  const { state, config } = deps;
  const { selectionKey, getTracks, rules } = config;

  const derivedStateSignal = computed(() =>
    isResolvedPresentation(state.presentation.get())
      ? ('presentation-resolved' as const)
      : ('presentation-unresolved' as const)
  );

  // The playable candidate set — the tracks the rule chain gets to pick from,
  // derived *outside* the reaction. This is the seam a future hard-constraints
  // pre-pass (capability probing, CDN failover) occupies: it would narrow these
  // tracks before the chain runs —
  //   isResolvedPresentation(p) ? applyConstraints(constraints, getTracks(p), deps) : []
  // — and because it's a `computed`, the constraints' own signal reads are
  // tracked here. The effect reads it with `.get()`, so when the playable set
  // changes — a new source, or a *dynamic* constraint like a CDN entering
  // cooldown — the effect re-picks. Today it's just the type's tracks while a
  // presentation is resolved.
  //
  // The `equals` gates notification on the *set of track ids*, not array
  // identity: a live playlist refresh swaps in a new presentation object with
  // the same variant tracks, and a constraint's inputs can churn without
  // changing which tracks survive. In both cases the playable set is unchanged,
  // so the reaction must not re-fire (the rule chain still re-runs on its own
  // inputs — bandwidth, user selection). Same intent as `equalsById`, for the
  // track list.
  const candidateSet = computed<readonly T[]>(
    () => {
      const presentation = state.presentation.get();
      return isResolvedPresentation(presentation) ? getTracks(presentation) : [];
    },
    { equals: (a, b) => a.length === b.length && a.every((track) => b.some((other) => other.id === track.id)) }
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
            // Reactive read: subscribes the reaction to the candidate set, so a
            // new presentation — or a future constraint pruning it — re-fires
            // this and re-picks.
            const tracks = candidateSet.get();
            // No playable tracks: no tracks of this type, or (once constraints
            // exist) everything pruned. Nothing to pick. Surfacing "nothing
            // playable" as a distinct not-ready state is left to the constraints
            // work; for now it's a silent no-op, leaving any prior pick in place.
            if (!tracks.length) return;

            // The whole deps object passes straight through to every rule in the
            // variant-supplied chain (state + config from the behavior; context
            // threaded in by the variant's rest-spread). Typed against the base
            // config — each rule re-declares the extra fields it reads as
            // optional, and the concrete `C` is assignable to the base.
            const candidates = applyRules<T, TrackSwitchingStateMap<S>, AnySlotMap, TrackSwitchingConfig<S, T>>(
              rules,
              tracks,
              deps
            );

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
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: ({
    state,
    config,
    ...otherProps
  }: {
    state: TrackSwitchingStateMap<'selectedVideoTrackId'>;
    config?: SwitchVideoTrackConfig;
  }) =>
    setupTrackSwitching({
      ...otherProps,
      state,
      config: {
        ...config,
        selectionKey: 'selectedVideoTrackId',
        userSelectionKey: 'userVideoTrackSelection',
        getTracks: (presentation) => getTracksByType(presentation, 'video') as readonly VideoTrackCandidate[],
        rules: [filterByUserSelection, preferActiveCdn, rankByBandwidth],
      },
    }),
});

// ============================================================================
// Variant: switchAudioTrack — bandwidth-ranked (shared ranker)
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
  stateKeys: ['presentation', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: ({ state, ...otherProps }: { state: TrackSwitchingStateMap<'selectedAudioTrackId'> }) =>
    setupTrackSwitching({
      ...otherProps,
      state,
      config: {
        selectionKey: 'selectedAudioTrackId',
        userSelectionKey: 'userAudioTrackSelection',
        getTracks: (presentation) => getTracksByType(presentation, 'audio') as readonly AudioTrackCandidate[],
        rules: [filterByUserSelection, preferActiveCdn, rankByBandwidth],
      },
    }),
});
