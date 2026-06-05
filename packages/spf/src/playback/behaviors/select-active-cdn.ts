/**
 * **Session-level active-CDN selection.** While a presentation is resolved,
 * owns the `activeCdn` signal: identify the CDNs the source is served from
 * (origin of each track's URL), pick the primary one, hold it sticky for the
 * resolved lifetime, and clear it on src unload.
 *
 * Redundant-stream sources (e.g. Mux's `?redundant_streams=true`) list the same
 * content on multiple hosts, so the candidate tracks already include one variant
 * per CDN. This behavior names *which* CDN is active; the `preferActiveCdn` scope
 * rule in `track-switching` reads `activeCdn` and narrows each type's candidates
 * to that CDN, so video / audio / text all resolve from the same host. A single
 * `activeCdn` per presentation is the per-presentation coherence guarantee.
 *
 * "Sticky" today means pick-once: the primary CDN (manifest head) is chosen on
 * resolve and never changes. Failover (sub-feature 2) will make this behavior
 * the writer that *rotates* `activeCdn` when a CDN enters cooldown.
 *
 * Lifecycle: `'presentation-unresolved'` ↔ `'presentation-resolved'`, mirroring
 * `setupTrackSwitching`. The resolved state owns the signal; its entry-returned
 * cleanup clears it on exit (canonical cleanup-binds-to-setup per `reactors.md`).
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../media/types';
import { getOrderedCdnIds } from '../../media/utils/cdn';

export interface SelectActiveCdnState {
  presentation?: MaybeResolvedPresentation;
  activeCdn?: string;
}

/**
 * Manage `activeCdn`: pick the primary CDN on src load, hold it, clear on src
 * unload.
 *
 * @example
 * const reactor = selectActiveCdn.setup({ state });
 */
export const selectActiveCdn = defineBehavior({
  stateKeys: ['presentation', 'activeCdn'],
  contextKeys: [],
  setup: ({
    state,
  }: {
    state: {
      presentation: ReadonlySignal<SelectActiveCdnState['presentation']>;
      activeCdn: Signal<SelectActiveCdnState['activeCdn']>;
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
          // Cleanup-binds-to-setup: the active-CDN choice is valid for exactly
          // 'presentation-resolved'. Clear fires on exit (src unload + destroy).
          entry: () => () => state.activeCdn.set(undefined),
          effects: [
            () => {
              // Sticky: pick once and hold. `peek` reads the slot without
              // subscribing, so setting it here doesn't re-fire this effect.
              if (peek(state.activeCdn)) return;
              const presentation = state.presentation.get();
              if (!isResolvedPresentation(presentation)) return;
              const [primary] = getOrderedCdnIds(presentation);
              if (primary) state.activeCdn.set(primary);
            },
          ],
        },
      },
    });
  },
});
