/**
 * **Audio tracks.** While a presentation is resolved, owns the `audioTracks`
 * signal: the selectable audio tracks (one per language, collapsing the model's
 * per-quality-group tracks), normalized to {@link AudioTrackInfo}. Cleared on
 * src unload. A read-only projection consumers (e.g. the DOM media adapter) bind
 * to without reaching through `presentation`.
 *
 * Mirrors `deriveVideoRenditions`: `'presentation-unresolved'` ↔
 * `'presentation-resolved'`, resolved state owns the signal, entry-returned
 * cleanup clears on exit, writes skipped when the track set is unchanged.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../media/types';
import { type AudioTrackInfo, getAudioTracks } from '../../media/utils/track-selection';

export interface DeriveAudioTracksState {
  presentation?: MaybeResolvedPresentation;
  audioTracks?: AudioTrackInfo[];
}

const sameAudioTracks = (a: AudioTrackInfo[] | undefined, b: AudioTrackInfo[]): boolean =>
  !!a && a.length === b.length && a.every((track, index) => track.id === b[index]?.id);

export const deriveAudioTracks = defineBehavior({
  stateKeys: ['presentation', 'audioTracks'],
  contextKeys: [],
  setup: ({
    state,
  }: {
    state: {
      presentation: ReadonlySignal<DeriveAudioTracksState['presentation']>;
      audioTracks: Signal<DeriveAudioTracksState['audioTracks']>;
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
          // Cleanup-binds-to-setup: the track list is valid for exactly
          // 'presentation-resolved'. Clear fires on exit (src unload + destroy).
          entry: () => () => state.audioTracks.set(undefined),
          effects: [
            () => {
              const presentation = state.presentation.get();
              if (!isResolvedPresentation(presentation)) return;
              const next = getAudioTracks({ presentation });
              // `peek` reads without subscribing, so this never self-triggers.
              if (!sameAudioTracks(peek(state.audioTracks), next)) state.audioTracks.set(next);
            },
          ],
        },
      },
    });
  },
});
