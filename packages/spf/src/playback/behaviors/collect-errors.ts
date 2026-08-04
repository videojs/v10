/**
 * **Owns the engine's error sequence.** Reporters append through
 * {@link emitError}; this behavior owns the slot and its per-source lifecycle,
 * clearing it on exit so a new source starts clean and the sequence can't grow
 * unbounded across a session.
 *
 * Same split as `setupFailoverMonitor` and `failedCdns`: writes come from
 * wherever the condition is detected, one behavior owns the slot. Deliberately
 * has no `effects` — it holds no policy and derives nothing. Severity is decided
 * at the adapter, not here (see `internal/design/spf/features/errors.md`), which
 * is why this is a lifecycle owner rather than an error *handler*.
 *
 * Clearing binds to *exit* of `presentation-resolved`, mirroring the sibling
 * mixins' clear-on-teardown (`emptied` / `MEDIA_DETACHED`). A live reload swaps
 * the presentation object without leaving the resolved state, so it doesn't
 * clear — only an actual source change or destroy does. Known gap: a
 * resolved→resolved source swap that never passes through unresolved carries the
 * prior source's errors forward; `resolve-track` guards the same transition with
 * a commit-time id check, and doing likewise here is a follow-up.
 *
 * The vocabulary itself ({@link SvtaError} and the codes) is DOM- and
 * signal-free in `media/errors`; only the write seam lives here, with the slot
 * it writes.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import type { SvtaError } from '../../media/errors';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../media/types';

export interface CollectErrorsState {
  presentation?: MaybeResolvedPresentation;
  errors?: SvtaError[];
}

/**
 * State an error reporter writes into. The slot is *optional*: a behavior reports
 * through this seam without declaring ownership in its own typed slice, and
 * emission no-ops when `collectErrors` isn't composed. Same contract as
 * `failedCdns` / `failoverFetch`.
 */
export interface ErrorEmitterState {
  errors?: Signal<SvtaError[] | undefined>;
}

/**
 * Append `error` to the engine's error sequence. No-op when no owner is
 * composed. Replaces the array rather than mutating it, so signal consumers
 * notify; duplicates are kept, since a repeated condition is a real observation.
 * Writes go through `update` so concurrent reporters can't lose each other's
 * appends.
 */
export function emitError(state: ErrorEmitterState, error: SvtaError): void {
  if (!state.errors) return;
  update(state.errors, (errors) => [...(errors ?? []), error]);
}

/**
 * Own `errors` for the resolved source's lifetime.
 *
 * @example
 * const reactor = collectErrors.setup({ state });
 */
export const collectErrors = defineBehavior({
  stateKeys: ['presentation', 'errors'],
  contextKeys: [],
  setup: ({
    state,
  }: {
    state: {
      presentation: ReadonlySignal<CollectErrorsState['presentation']>;
      errors: Signal<CollectErrorsState['errors']>;
    };
  }) => {
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
          // Cleanup-binds-to-setup: reset for the next source on exit (src
          // unload + destroy).
          entry: () => () => state.errors.set(undefined),
        },
      },
    });
  },
});
