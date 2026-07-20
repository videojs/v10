/**
 * **Per-type track selection as a rule chain.** While a presentation is
 * resolved, owns that type's `selected{Video,Audio,Text}TrackId` signal: pick a
 * default, react to user intent and algorithmic ranking, and clear it on src
 * unload.
 *
 * Selection runs in two stages. First a **hard-constraints pre-pass**
 * (`applyConstraints`) prunes the unplayable from the candidate set — the
 * failed-CDN constraint (`excludeFailedCdns`, failover cooldown) and the
 * capability constraint (`excludeUnplayableTracks`, codec support). Then a small
 * ordered chain of rules (`applyRules`) picks among the survivors. Each constraint/rule reads the signals it needs at apply
 * time, so the effect subscribes to exactly what was consulted. The chain is
 * three rules, most authoritative first:
 *
 *   1. **user intent** — a soft filter on `user*TrackSelection`: narrow to the
 *      partial-track match; an empty match falls through to the full set.
 *   2. **active CDN** — a soft filter on `cdnPriority` (`preferActiveCdn`):
 *      narrow to the highest-priority CDN that still has tracks; an empty match
 *      falls through. Shared by video and audio, so every type stays on one CDN
 *      (`deriveCdnPriority` owns the list). No-op for non-redundant sources.
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
 * The pick is the chain's result mapped to a slot value by `resolveSelection`
 * (default: the head, `applyRules(...)[0]`). Each variant supplies its
 * **constraints + rule chain (+ optional resolveSelection)** via config;
 * `setupTrackSwitching` owns only the lifecycle and runs what it's given. Video
 * and audio run constraints `[excludeFailedCdns, excludeUnplayableTracks]` then
 * rules `[filterByUserSelection, preferActiveCdn, rankByBandwidth]` and take the
 * head; `switchVideoTrack` also accepts ABR tuning config, `switchAudioTrack`
 * takes none. `switchTextTrack` differs — selection is *optional* (captions are
 * opt-in / off-able), so it runs `[excludeFailedCdns]` + `[preferActiveCdn]` and
 * supplies a text terminal (`pickResolvedTextTrack`) that resolves standing user
 * intent (`userTextTrackSelection`, incl. `'off'`) and may yield no selection.
 * (The active-CDN *scope* is the sticky-pick half of multi-CDN; the failed-CDN
 * *constraint* is the failover half — prune the cooled-down CDN, the scope falls
 * to the next.)
 *
 * When the pre-pass prunes a type's candidates to empty, the behavior leaves any
 * prior pick in place and makes no new pick; the late `createSourceBuffer` check
 * stays as the structural backstop for an unplayable rendition reaching the
 * pipeline. Surfacing "nothing playable" as observable state is deferred until a
 * consumer (error mapping) needs it.
 *
 * Deferred: audio's preferred-language / default-track selection as standing
 * soft-filter rules (previously the empty-slot picker, dropped in the move to
 * the rule chain).
 */

import { type AnySlotMap, defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import { DEFAULT_QUALITY_CONFIG, type QualityConfig, resolutionArea } from '../../media/abr/quality-selection';
import {
  matchesPartialTrack,
  pickTextTrackFromTracks,
  type TextSelectionConfig,
} from '../../media/primitives/select-tracks';
import {
  type AudioTrack,
  type CanPlayTrack,
  isResolvedPresentation,
  type MaybeResolvedPresentation,
  type PartiallyResolvedAudioTrack,
  type PartiallyResolvedTextTrack,
  type PartiallyResolvedVideoTrack,
  type TextTrack,
  type VideoTrack,
} from '../../media/types';
import { getCdnId as defaultGetCdnId, type GetCdnId } from '../../media/utils/cdn';
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
  selectedTextTrackId?: string;
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
  /** Override CDN-id derivation (shared by the CDN scope + failover constraint). */
  getCdnId?: GetCdnId;
  /**
   * Codec capability probe read by the `excludeUnplayableTracks` hard
   * constraint — drops renditions this environment can't decode before
   * selection runs. Injected (rather than imported) so the DOM-free behavior
   * never reaches a DOM API directly; the engine defaults it to the
   * `MediaSource.isTypeSupported`-backed `canPlayTrack`. Absent → no codec
   * filtering (the constraint passes everything through).
   */
  canPlayTrack?: CanPlayTrack;
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

/**
 * Apply hard constraints to a candidate list — the pre-pass that runs before the
 * rule chain. A constraint shares a rule's signature but its exclusion is
 * *hard*: it removes the unplayable (a codec the environment can't decode, a CDN
 * in failover cooldown) and a removed track is never attempted. Unlike
 * `applyRules`, this never skips an empty result and never early-bails — every
 * constraint always applies, and an empty survivor set is a real outcome
 * ("nothing playable here"), not a fall-through. Because each constraint only
 * removes, the order they run in can't change the result.
 *
 * @param constraints - Constraints to apply (pooled, order-independent)
 * @param tracks - Candidate tracks
 * @param deps - The behavior's `{ state, context, config }`, passed to each constraint
 * @returns The playable survivors (possibly empty)
 */
export function applyConstraints<T, State, Context, Config>(
  constraints: readonly SelectionRule<T, State, Context, Config>[],
  tracks: readonly T[],
  deps: SelectionRuleDeps<State, Context, Config>
): readonly T[] {
  let current = tracks;
  for (const constraint of constraints) current = constraint(current, deps);
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
type SwitchableTrack = {
  id: string;
  url: string;
  bandwidth?: number;
  width?: number;
  height?: number;
  // Read by the capability constraint to probe codec support. Optional on the
  // minimal shape; every resolved/partially-resolved video & audio candidate
  // carries them, and an absent `mimeType` makes a track unprobeable (kept).
  mimeType?: string;
  codecs?: string[];
};

/**
 * Map the rule chain's surviving candidates to the final selection id, or
 * `undefined` for a deliberate no-selection. Defaults to the chain head
 * (`selectChainHead`) — the always-pick contract video and audio rely on
 * (`applyRules` guarantees a non-empty result, so the head is always there). A
 * variant whose selection is legitimately optional (text: opt-in captions,
 * explicit off) supplies its own picker that may return `undefined`; the helper
 * writes that straight through to the slot, clearing it.
 */
export type ResolveSelection<T extends SwitchableTrack, State = unknown, Context = unknown, Config = unknown> = (
  candidates: readonly T[],
  deps: SelectionRuleDeps<State, Context, Config>
) => string | undefined;

type SelectionKey = 'selectedVideoTrackId' | 'selectedAudioTrackId' | 'selectedTextTrackId';
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
export type TrackSwitchingStateMap<S extends SelectionKey> = {
  presentation: ReadonlySignal<TrackSwitchingState['presentation']>;
} & { [P in S]: Signal<TrackSwitchingState[P]> };

/**
 * Config `setupTrackSwitching` itself reads — its own wiring: which selection
 * slot to write and clear (`selectionKey`), how to enumerate candidate tracks
 * (`getTracks`), the optional **hard-constraints pre-pass** (`constraints`,
 * applied before the chain to prune the unplayable), and the **rule chain** to
 * run (`rules`), and how to map the chain's survivors to the final pick
 * (`resolveSelection`, defaulting to the chain head). Rule-/constraint-specific
 * config is deliberately absent — each declares the fields it reads as *optional*
 * on its own config view (`UserSelectionConfig`, `BandwidthRankerConfig`), so the
 * behavior never enumerates them. The variant builds the concrete config as this
 * base plus whatever its chain consults; it flows through untouched as the `C`
 * type param on `setupTrackSwitching`.
 */
interface TrackSwitchingConfig<S extends SelectionKey, T extends SwitchableTrack> {
  selectionKey: S;
  getTracks: (presentation: MaybeResolvedPresentation) => readonly T[];
  constraints?: readonly SelectionRule<T, TrackSwitchingStateMap<S>, AnySlotMap, TrackSwitchingConfig<S, T>>[];
  rules: readonly SelectionRule<T, TrackSwitchingStateMap<S>, AnySlotMap, TrackSwitchingConfig<S, T>>[];
  /**
   * Map the chain's surviving candidates to the final selection id. Optional —
   * absent means the chain head (`selectChainHead`), the always-pick path video
   * and audio use. A variant with optional selection (text) supplies one that
   * may return `undefined`.
   */
  resolveSelection?: ResolveSelection<T, TrackSwitchingStateMap<S>, AnySlotMap, TrackSwitchingConfig<S, T>>;
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
 * signal exists only when the composition includes `deriveCdnPriority` (which
 * materializes + owns it); the scope reads it defensively and passes through
 * when it's absent (no CDN preference).
 */
type CdnScopeStateMap<S extends SelectionKey> = TrackSwitchingStateMap<S> & {
  cdnPriority?: ReadonlySignal<string[] | undefined>;
};

/**
 * State the failed-CDN constraint reads: the lifecycle map plus an *optional*
 * `failedCdns` — the CDN ids currently in failover cooldown. The signal exists
 * only when the composition includes a failover monitor (or an external driver); the
 * constraint reads it defensively and excludes nothing when it's absent.
 */
type CdnConstraintStateMap<S extends SelectionKey> = TrackSwitchingStateMap<S> & {
  failedCdns?: ReadonlySignal<string[] | undefined>;
};

/**
 * Config the CDN rules read: the base config plus an *optional* `getCdnId`
 * override. Both `excludeFailedCdns` and `preferActiveCdn` derive a track's CDN
 * from its URL; the override must be the *same* one `deriveCdnPriority` and the
 * failover trip use, or the keys stop matching. Optional → defaults to the
 * origin-based `getCdnId`, so the base config (without it) stays assignable.
 */
type CdnRuleConfig<S extends SelectionKey, T extends SwitchableTrack> = TrackSwitchingConfig<S, T> & {
  getCdnId?: GetCdnId;
};

/**
 * Config the capability constraint reads: the base config plus an *optional*
 * `canPlayTrack` codec probe. Optional → an unwired probe means "no codec
 * filtering" and the constraint passes everything through, so the base config
 * (without it) stays assignable. The engine defaults it to the DOM-bound
 * `canPlayTrack`.
 */
type CapabilityConstraintConfig<S extends SelectionKey, T extends SwitchableTrack> = TrackSwitchingConfig<S, T> & {
  canPlayTrack?: CanPlayTrack;
};

type VideoTrackCandidate = PartiallyResolvedVideoTrack | VideoTrack;
type AudioTrackCandidate = PartiallyResolvedAudioTrack | AudioTrack;
type TextTrackCandidate = PartiallyResolvedTextTrack | TextTrack;

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
 * Failed-CDN constraint — a *hard* filter (constraints pre-pass), shared by
 * video and audio. Removes tracks served from a CDN currently in failover
 * cooldown (`failedCdns`, written by the failover monitor). Removed tracks are never
 * attempted; the scope then narrows to the next surviving CDN in `cdnPriority`,
 * and snaps back to the primary once it leaves cooldown.
 *
 * Passes everything through when there's no `failedCdns` signal/value. When it
 * prunes *every* track (all CDNs cooled down), the empty result is preserved
 * (per `applyConstraints`) — "nothing playable," which clears the selection (no
 * pick); a later CDN recovery refills the candidate set and re-picks.
 */
function excludeFailedCdns<S extends SelectionKey, T extends SwitchableTrack>(
  tracks: readonly T[],
  { state, config }: SelectionRuleDeps<CdnConstraintStateMap<S>, AnySlotMap, CdnRuleConfig<S, T>>
): readonly T[] {
  const failed = state.failedCdns?.get();
  if (!failed?.length) return tracks;
  const getCdnId = config.getCdnId ?? defaultGetCdnId;
  const failedSet = new Set(failed);
  return tracks.filter((track) => !failedSet.has(getCdnId(track.url)));
}

/**
 * Capability constraint — a *hard* filter (constraints pre-pass), shared by
 * video and audio. Removes renditions this environment can't decode, probed via
 * the injected `canPlayTrack` (codec → `MediaSource.isTypeSupported`). Moving
 * the check here — before selection — means an unplayable variant (e.g. HEVC on
 * a browser without HEVC) is pruned upstream and never picked, instead of
 * surviving into the pipeline to fail late at `createSourceBuffer`. That late
 * throw stays as a defensive structural guarantee; with this constraint it
 * should rarely fire.
 *
 * Passes everything through when there's no `canPlayTrack` probe (a composition
 * that didn't wire it, or DOM-free tests). When it prunes *every* track (no
 * decodable rendition), the empty result is preserved (per `applyConstraints`)
 * — "nothing playable," so the behavior clears the selection (no pick) and the
 * late `createSourceBuffer` check stays as the backstop.
 */
function excludeUnplayableTracks<S extends SelectionKey, T extends SwitchableTrack>(
  tracks: readonly T[],
  { config }: SelectionRuleDeps<TrackSwitchingStateMap<S>, AnySlotMap, CapabilityConstraintConfig<S, T>>
): readonly T[] {
  const canPlay = config.canPlayTrack;
  if (!canPlay) return tracks;
  return tracks.filter((track) => canPlay(track));
}

/**
 * Active-CDN scope — a soft filter, shared by video and audio. Narrows to the
 * highest-priority CDN in `cdnPriority` (owned by `deriveCdnPriority`) that
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
 * The CDN-id derivation defaults to origin-based `getCdnId`, overridable via the
 * `getCdnId` config — it must match the one `deriveCdnPriority` used to build
 * `cdnPriority`, or no track's CDN would ever equal an entry.
 */
function preferActiveCdn<S extends SelectionKey, T extends SwitchableTrack>(
  tracks: readonly T[],
  { state, config }: SelectionRuleDeps<CdnScopeStateMap<S>, AnySlotMap, CdnRuleConfig<S, T>>
): readonly T[] {
  const cdnPriority = state.cdnPriority?.get();
  if (!cdnPriority?.length) return tracks;
  const getCdnId = config.getCdnId ?? defaultGetCdnId;
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

/**
 * Default final pick: the chain head. `applyRules` never narrows to nothing and
 * early-bails to a single survivor, so video and audio always converge to a
 * track and the head is the pick.
 */
function selectChainHead<T extends SwitchableTrack>(candidates: readonly T[]): string {
  return candidates[0]!.id;
}

/**
 * State the text terminal reads: the lifecycle map plus an *optional*
 * `userTextTrackSelection` — the standing user intent. `Partial<TextTrack>` is an
 * explicit pick (language-based), `'off'` is explicit no-captions, `undefined` is
 * auto (no preference). The slot exists only when the composition materializes it
 * (`shareSignals`); the terminal reads it defensively and treats absence as auto.
 *
 * Unlike `user*TrackSelection` for video/audio, this carries the `'off'` sentinel
 * and feeds the terminal pick (not the shared `filterByUserSelection`) — text is
 * the only type whose selection is legitimately optional, so the off/auto logic
 * lives in one text-specific place rather than widening the shared filter.
 */
type TextSelectionStateMap = TrackSwitchingStateMap<'selectedTextTrackId'> & {
  userTextTrackSelection?: ReadonlySignal<Partial<TextTrack> | 'off' | undefined>;
};

/** Config the text terminal reads: the base config plus the opt-in default policy. */
type TextTerminalConfig = TrackSwitchingConfig<'selectedTextTrackId', TextTrackCandidate> & TextSelectionConfig;

/**
 * Terminal pick for text — the `resolveSelection` the text variant supplies.
 * Resolves the standing `userTextTrackSelection` intent against the chain's
 * survivors (already CDN-failover-pruned and active-CDN-scoped):
 *
 *   - `'off'` → no selection (clear the slot). Sticky through re-evaluation, so a
 *     live refresh or failover re-run can't re-assert a default.
 *   - explicit `Partial<TextTrack>` → narrow to the match (language-based). A
 *     stale pick whose match is gone (e.g. the language dropped on a source
 *     change) falls through to the default policy.
 *   - auto (`undefined`) → the opt-in default policy (`preferredSubtitleLanguage`
 *     → `DEFAULT=YES + AUTOSELECT=YES` → none), shared with `pickTextTrack`.
 *
 * Returning `undefined` is a real outcome (captions are opt-in), which is why the
 * text variant relies on `setupTrackSwitching`'s no-selection seam.
 */
function pickResolvedTextTrack<T extends TextTrackCandidate>(
  candidates: readonly T[],
  { state, config }: SelectionRuleDeps<TextSelectionStateMap, AnySlotMap, TextTerminalConfig>
): string | undefined {
  const intent = state.userTextTrackSelection?.get();
  if (intent === 'off') return undefined;
  if (intent) {
    // The stored intent is a `Partial<TextTrack>`; cast to the candidate's own
    // partial shape so the generic `matchesPartialTrack` accepts it (every field
    // it carries — language, forced — exists on the candidate too).
    const matched = candidates.filter((track) => matchesPartialTrack(track, intent as Partial<T>));
    if (matched.length) return matched[0]!.id;
  }
  return pickTextTrackFromTracks(candidates, config);
}

// `context` is the composition's context map, threaded in by each variant's
// rest-spread and typed as the generic slot-map shape (`AnySlotMap`). It can't
// be a typed param on the `defineBehavior` setup without widening `ContextMap`
// to its constraint and forcing the slot required, so the variants forward it
// untyped via the rest and it lands here — absent on direct setup calls, and
// passed straight through to the rules (which don't read it yet).
export function setupTrackSwitching<
  S extends SelectionKey,
  T extends SwitchableTrack,
  C extends TrackSwitchingConfig<S, T>,
>(deps: { state: TrackSwitchingStateMap<S>; context?: AnySlotMap; config: C }) {
  const { state, config } = deps;
  const { selectionKey, getTracks, rules, resolveSelection = selectChainHead } = config;

  const derivedStateSignal = computed(() =>
    isResolvedPresentation(state.presentation.get())
      ? ('presentation-resolved' as const)
      : ('presentation-unresolved' as const)
  );

  // The playable candidate set — the tracks the rule chain gets to pick from,
  // derived *outside* the reaction. The hard-constraints pre-pass (capability
  // probing, CDN-failover cooldown) narrows the type's tracks before the chain
  // runs. Because this is a `computed`, a constraint's own signal reads (e.g.
  // `cdnHealth`) are tracked here, so when the playable set changes — a new
  // source, or a *dynamic* constraint like a CDN entering cooldown — the effect
  // re-picks. With no constraints configured this is just the type's tracks
  // while a presentation is resolved.
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
      if (!isResolvedPresentation(presentation)) return [];
      return applyConstraints(config.constraints ?? [], getTracks(presentation), deps);
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
            // new presentation — or a constraint pruning it — re-fires this and
            // re-picks.
            const tracks = candidateSet.get();

            // Empty candidate set — two shapes, told apart by whether the type
            // has any tracks at all:
            //   - The type has no tracks (e.g. a video-only source's absent
            //     audio): legitimate, nothing to pick or clear.
            //   - The type HAS tracks but the hard-constraints pre-pass pruned
            //     every one (every rendition undecodable, or every CDN in
            //     failover cooldown): no playable rendition. Clear the selection
            //     so a pick made earlier — e.g. under the initial mp4 label,
            //     before resolve-track relabeled the type to a non-fMP4
            //     container — can't linger as a now-unplayable selection and
            //     silently stall the pipeline.
            // The `console.error` is a placeholder until the planned error
            // behaviors surface "nothing playable" as observable state.
            if (!tracks.length) {
              const presentation = peek(state.presentation);
              const hasTracksOfType = isResolvedPresentation(presentation) && getTracks(presentation).length > 0;
              if (hasTracksOfType) {
                console.error(
                  `[track-switching] every ${selectionKey} candidate was filtered out by constraints; clearing selection`
                );
                state[selectionKey].set(undefined);
              }
              return;
            }

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
            // Map survivors to the final id. Defaults to the chain head; a
            // variant with optional selection (text) may resolve to `undefined`,
            // which clears the slot (e.g. explicit off, opt-in decline).
            // No change-guard needed: the slot uses default (Object.is) equality,
            // so re-setting the same value is a no-op (no notify, no re-fire).
            state[selectionKey].set(resolveSelection(candidates, deps));
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
        constraints: [excludeFailedCdns, excludeUnplayableTracks],
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
  setup: ({
    state,
    config,
    ...otherProps
  }: {
    state: TrackSwitchingStateMap<'selectedAudioTrackId'>;
    // Shares the video config shape so the engine config spreads through (CDN
    // derivation + any future cross-cutting fields).
    config?: SwitchVideoTrackConfig;
  }) =>
    setupTrackSwitching({
      ...otherProps,
      state,
      config: {
        // Spread engine config so cross-cutting fields (`getCdnId`, future shared
        // tuning) flow through like they do for video, then override the per-type
        // wiring. Video-only ABR tuning (`quality`/`bandwidth`/`initialBandwidth`)
        // rides along into the shared `rankByBandwidth` too; harmless since audio
        // has no `bandwidthState` to act on it and the ranker always yields a pick.
        // FOLLOW-UP: a shared config type for the genuinely cross-cutting fields
        // would keep video-only tuning out of audio entirely (CJP).
        ...config,
        selectionKey: 'selectedAudioTrackId',
        userSelectionKey: 'userAudioTrackSelection',
        getTracks: (presentation) => getTracksByType(presentation, 'audio') as readonly AudioTrackCandidate[],
        constraints: [excludeFailedCdns, excludeUnplayableTracks],
        rules: [filterByUserSelection, preferActiveCdn, rankByBandwidth],
      },
    }),
});

// ============================================================================
// Variant: switchTextTrack — intent-resolved, optional selection
// ============================================================================

/**
 * Config for `switchTextTrack` — the opt-in default policy
 * (`preferredSubtitleLanguage` / `includeForcedTracks` / `enableDefaultTrack`,
 * via `TextSelectionConfig`) read by the terminal when the user has no standing
 * intent, plus the `getCdnId` override shared with the CDN constraint + scope.
 */
export interface SwitchTextTrackConfig extends TextSelectionConfig {
  /** Override CDN-id derivation (shared by the failed-CDN constraint + active-CDN scope). */
  getCdnId?: GetCdnId;
}

/**
 * Manage `selectedTextTrackId` as the single-writer **output** of standing user
 * intent (`userTextTrackSelection`) resolved against the playable, CDN-scoped
 * text renditions: clear on src unload; re-resolve when a CDN fails or recovers.
 *
 * Unlike video/audio, the selection is *optional* — captions are opt-in and the
 * user can turn them off — so the chain skips the bandwidth ranker and the shared
 * user-selection filter, and supplies a text-specific terminal
 * (`pickResolvedTextTrack`) that may resolve to no-selection via
 * `setupTrackSwitching`'s `resolveSelection` seam. Constraints are failed-CDN only
 * (`excludeUnplayableTracks`/`canPlayTrack` is MSE-based — the wrong probe for
 * text, whose playability is SPF-parser support); the active-CDN scope co-locates
 * captions with the surviving CDN on failover.
 *
 * @example
 * const reactor = switchTextTrack.setup({ state, config: { preferredSubtitleLanguage: 'en' } });
 */
export const switchTextTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId'],
  contextKeys: [],
  setup: ({
    state,
    config,
    ...otherProps
  }: {
    state: TrackSwitchingStateMap<'selectedTextTrackId'>;
    config?: SwitchTextTrackConfig;
  }) =>
    // Explicit type args pin the candidate type to `TextTrackCandidate`. Video and
    // audio let it infer to the `SwitchableTrack` constraint (harmless — every
    // rule is assignable up to it), but the text terminal needs the narrower type
    // (it reads text-only fields), so it's named here rather than inferred.
    setupTrackSwitching<'selectedTextTrackId', TextTrackCandidate, TextTerminalConfig & SwitchTextTrackConfig>({
      ...otherProps,
      state,
      config: {
        ...config,
        selectionKey: 'selectedTextTrackId',
        getTracks: (presentation) => getTracksByType(presentation, 'text') as readonly TextTrackCandidate[],
        constraints: [excludeFailedCdns],
        rules: [preferActiveCdn],
        resolveSelection: pickResolvedTextTrack,
      },
    }),
});
