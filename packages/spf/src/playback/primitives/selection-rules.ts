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
