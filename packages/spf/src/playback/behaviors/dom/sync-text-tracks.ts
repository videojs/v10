import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal, untrack } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation, PartiallyResolvedTextTrack, TextTrack } from '../../../media/types';

/**
 * FSM states for text track sync.
 *
 * ```
 * 'preconditions-unmet' ──── mediaElement + tracks available ────→ 'set-up'
 *        ↑                                                              |
 *        └──────────────── preconditions lost (exit cleanup) ──────────┘
 *
 * any state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
 * ```
 */
/**
 * State shape for text track sync.
 */
export interface TextTrackSyncState {
  presentation?: MaybeResolvedPresentation;
  selectedTextTrackId?: string | undefined;
}

/**
 * Context shape for text track sync.
 */
export interface TextTrackSyncContext {
  mediaElement?: HTMLMediaElement | undefined;
}

// ============================================================================
// Helpers
// ============================================================================

function createTrackElement(track: PartiallyResolvedTextTrack | TextTrack): HTMLTrackElement {
  const el = document.createElement('track');
  el.id = track.id;
  el.kind = track.kind;
  el.label = track.label;
  el.toggleAttribute('data-src-track', true);
  if (track.language) el.srclang = track.language;
  if (track.default) el.default = true;
  return el;
}

function getModelTextTracks(
  presentation: MaybeResolvedPresentation | undefined
): (PartiallyResolvedTextTrack | TextTrack)[] | undefined {
  return presentation?.selectionSets?.find((s) => s.type === 'text')?.switchingSets[0]?.tracks;
}

function syncModes(textTracks: TextTrackList, selectedId: string | undefined): void {
  for (let i = 0; i < textTracks.length; i++) {
    const track = textTracks[i]!;
    if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;
    track.mode = track.id === selectedId ? 'showing' : 'disabled';
  }
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Text track sync orchestration.
 *
 * A single `always` monitor keeps the reactor in sync with preconditions.
 * `'set-up'` owns the full lifecycle of `<track>` elements:
 *
 * - **Effect 1** — creates `<track>` elements on entry; exit cleanup removes
 *   them and clears `selectedTextTrackId` on any outbound transition.
 * - **Effect 2** — owns mode sync, the Chromium settling-window guard, and
 *   the `'change'` listener that bridges DOM state back to
 *   `selectedTextTrackId`.
 *
 * @example
 * const reactor = syncTextTracks.setup({ state, context });
 * // later:
 * reactor.destroy();
 */
function syncTextTracksSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<TextTrackSyncState['presentation']>;
    selectedTextTrackId: Signal<TextTrackSyncState['selectedTextTrackId']>;
  };
  context: { mediaElement: ReadonlySignal<TextTrackSyncContext['mediaElement']> };
}): Reactor<'preconditions-unmet' | 'set-up' | 'destroying' | 'destroyed'> {
  const mediaElementSignal = computed(() => context.mediaElement.get());
  const modelTextTracksSignal = computed(() => getModelTextTracks(state.presentation.get()), {
    /** @TODO Make generic and abstract away for Array<T> | undefined (CJP) */
    equals(prevTextTracks, nextTextTracks) {
      if (prevTextTracks === nextTextTracks) return true;
      if (typeof prevTextTracks !== typeof nextTextTracks) return false;
      if (prevTextTracks?.length !== nextTextTracks?.length) return false;
      // NOTE: This could probably be optimized, but the set should generally be small (CJP)
      return (
        !!nextTextTracks &&
        nextTextTracks.every((nextTextTrack) =>
          prevTextTracks?.some((prevTextTrack) => prevTextTrack.id === nextTextTrack.id)
        )
      );
    },
  });
  const selectedTextTrackIdSignal = computed(() => state.selectedTextTrackId.get());
  const preconditionsMetSignal = computed(() => !!mediaElementSignal.get() && !!modelTextTracksSignal.get()?.length);

  return createMachineReactor<'preconditions-unmet' | 'set-up'>({
    initial: 'preconditions-unmet',
    monitor: () => (preconditionsMetSignal.get() ? 'set-up' : 'preconditions-unmet'),
    states: {
      'preconditions-unmet': {},

      'set-up': {
        // Entry: create <track> elements once on state entry; exit cleanup removes
        // them and clears selectedTextTrackId on any outbound transition.
        // The fn body is automatically untracked — no untrack() needed.
        entry: () => {
          const mediaElement = mediaElementSignal.get() as HTMLMediaElement;
          const modelTextTracks = modelTextTracksSignal.get() as PartiallyResolvedTextTrack[];
          modelTextTracks.forEach((track) => mediaElement.appendChild(createTrackElement(track)));
          return () => {
            mediaElement
              .querySelectorAll('track[data-src-track]:is([kind="subtitles"],[kind="captions"]')
              .forEach((trackEl) => trackEl.remove());
            state.selectedTextTrackId.set(undefined);
          };
        },

        // Reaction: mode sync + DOM change listener; re-runs when selectedId changes.
        // mediaElement is read with untrack() since element changes go through the
        // always monitor (preconditions-unmet path), not this effect.
        effects: () => {
          const mediaElement = untrack(() => mediaElementSignal.get() as HTMLMediaElement);
          const selectedId = selectedTextTrackIdSignal.get();

          syncModes(mediaElement.textTracks, selectedId);
          let syncTimeout: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
            syncTimeout = undefined;
          }, 0);

          const onChange = () => {
            if (syncTimeout) {
              // Inside the settling window: browser auto-selection is overriding our
              // modes. Re-apply to restore the intended state without touching state.
              // change events are queued as tasks (async), so no re-entrancy risk.
              syncModes(
                mediaElement.textTracks,
                untrack(() => selectedTextTrackIdSignal.get())
              );
              return;
            }

            const showingTrack = Array.from(mediaElement.textTracks).find(
              (t) => t.mode === 'showing' && (t.kind === 'subtitles' || t.kind === 'captions')
            );

            // showingTrack.id matches the SPF track ID set by createTrackElement above.
            // Fall back to undefined for empty-string IDs (non-SPF-managed tracks).
            const newId = showingTrack?.id;
            const currentModelId = untrack(() => selectedTextTrackIdSignal.get());
            if (newId === currentModelId) return;
            state.selectedTextTrackId.set(newId);
          };

          const unlisten = listen(mediaElement.textTracks, 'change', onChange);

          return () => {
            clearTimeout(syncTimeout ?? undefined);
            unlisten();
          };
        },
      },
    },
  });
}

export const syncTextTracks = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId'],
  contextKeys: ['mediaElement'],
  setup: syncTextTracksSetup,
});
