/**
 * The selection-rule substrate: the shape of a rule, and the two composers that
 * turn a list of them into a pick.
 *
 * Lives here rather than beside `switchVideoTrack` so both track-selection
 * behaviors can share rules. The simple `selectVideoTrack` variant exists
 * specifically to tree-shake the ABR path out, so importing a composer from
 * `behaviors/track-switching.ts` would drag the bandwidth estimator and quality
 * selection back in with it. These four have no dependencies at all — pure
 * generics over a candidate list — so either side can reach them freely.
 *
 * See `internal/design/spf/track-switching-model.md` for the model these
 * implement: a hard constraints pre-pass, then an ordered chain of soft
 * narrowing rules and rankers, with the pick as the first survivor.
 */

import type { CanPlayTrack } from '../../media/types';

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
 * removes, the order they run in can't change which tracks survive — though one
 * that also *reports* reads the list at its own position, so placement matters.
 *
 * @param constraints - Constraints to apply, in order
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

/**
 * Whether two candidate sets hold the same tracks, by id.
 *
 * The `equals` both selection behaviors give their candidate-set `computed`. A
 * live playlist refresh swaps in a new presentation object carrying the same
 * variants, and a constraint's own inputs can churn without changing which
 * tracks survive; in both cases the set is unchanged and the reaction must not
 * re-fire. Compares by id rather than array identity for exactly that.
 */
export function sameCandidateSet<T extends { id: string }>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((track) => b.some((other) => other.id === track.id));
}

/**
 * What {@link excludeUnplayableTracks} reads off the config it is handed.
 *
 * Read through a cast rather than constraining the rule's `Config` generic, the
 * same way `screenResolutionCap` reads `screenResolution` off its state: a rule
 * composes into chains whose config types have nothing else in common, and
 * constraining the generic would make every one of those a weak-type mismatch.
 * Each engine defaults `canPlayTrack` to the DOM-bound probe; unwired means "no
 * capability filtering" and the constraint passes everything through.
 */
export interface CapabilityConstraintConfig {
  canPlayTrack?: CanPlayTrack;
}

/**
 * Capability constraint — a *hard* filter for the {@link applyConstraints}
 * pre-pass. Removes renditions this environment can't decode, probed via the
 * injected `canPlayTrack` (codec → `MediaSource.isTypeSupported`, plus the
 * container and encryption assertions that probe can't make). Constraining here
 * — before selection — means an unplayable variant is pruned upstream and never
 * picked, instead of surviving into the pipeline to fail late at
 * `createSourceBuffer`. That late throw stays as a defensive structural
 * guarantee; with this constraint it should rarely fire.
 *
 * Lives here rather than beside `switchVideoTrack` for the reason this module
 * exists: both the re-evaluating variant and the pinned `selectVideoTrack` apply
 * it, and reaching it through `behaviors/track-switching.ts` would drag the ABR
 * path into a composition that deliberately omits it.
 *
 * Passes everything through when there's no probe (a composition that didn't
 * wire one, or DOM-free tests). When it prunes *every* track, the empty result is
 * preserved (per `applyConstraints`) — "nothing playable" — which each consuming
 * behavior answers by clearing its selection; reporting the verdict is separate.
 */
export function excludeUnplayableTracks<T, State, Context, Config>(
  tracks: readonly T[],
  { config }: SelectionRuleDeps<State, Context, Config>
): readonly T[] {
  const canPlay = (config as CapabilityConstraintConfig | undefined)?.canPlayTrack;
  if (!canPlay) return tracks;
  return tracks.filter((track) => canPlay(track as Parameters<CanPlayTrack>[0]));
}
