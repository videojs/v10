/**
 * **Video renditions.** While a presentation is resolved, owns the
 * `videoRenditions` signal: the selectable quality levels of the first video
 * switching set, normalized to {@link VideoRenditionInfo}. Cleared on src
 * unload. A read-only projection consumers (e.g. the DOM media adapter) bind to
 * without reaching through `presentation`.
 *
 * Lifecycle mirrors `deriveCdnPriority`: `'presentation-unresolved'` ↔
 * `'presentation-resolved'`. The resolved state owns the signal; its
 * entry-returned cleanup clears it on exit (canonical cleanup-binds-to-setup).
 *
 * A live reload swaps in a new presentation object carrying the same renditions,
 * so writes are skipped when the rendition id-set is unchanged — re-emitting a
 * fresh array would re-fire consumers for an identical list.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../media/types';
import { getVideoRenditions, type VideoRenditionInfo } from '../../media/utils/track-selection';

export interface DeriveVideoRenditionsState {
  presentation?: MaybeResolvedPresentation;
  videoRenditions?: VideoRenditionInfo[];
}

const sameRenditions = (a: VideoRenditionInfo[] | undefined, b: VideoRenditionInfo[]): boolean =>
  !!a && a.length === b.length && a.every((rendition, index) => rendition.id === b[index]?.id);

export const deriveVideoRenditions = defineBehavior({
  stateKeys: ['presentation', 'videoRenditions'],
  contextKeys: [],
  setup: ({
    state,
  }: {
    state: {
      presentation: ReadonlySignal<DeriveVideoRenditionsState['presentation']>;
      videoRenditions: Signal<DeriveVideoRenditionsState['videoRenditions']>;
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
          // Cleanup-binds-to-setup: the rendition list is valid for exactly
          // 'presentation-resolved'. Clear fires on exit (src unload + destroy).
          entry: () => () => state.videoRenditions.set(undefined),
          effects: [
            () => {
              const presentation = state.presentation.get();
              if (!isResolvedPresentation(presentation)) return;
              const next = getVideoRenditions({ presentation });
              // `peek` reads without subscribing, so this never self-triggers.
              if (!sameRenditions(peek(state.videoRenditions), next)) state.videoRenditions.set(next);
            },
          ],
        },
      },
    });
  },
});
