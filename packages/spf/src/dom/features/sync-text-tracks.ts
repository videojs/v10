import { listen } from '@videojs/utils/dom';
import type { Reactor } from '../../core/create-reactor';
import { createReactor } from '../../core/create-reactor';
import { computed, type Signal, untrack, update } from '../../core/signals/primitives';
import type { PartiallyResolvedTextTrack, Presentation, TextTrack } from '../../core/types';

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
export type TextTrackSyncStatus = 'preconditions-unmet' | 'set-up';

/**
 * State shape for text track sync.
 */
export interface TextTrackSyncState {
  presentation?: Presentation | undefined;
  selectedTextTrackId?: string | undefined;
}

/**
 * Owners shape for text track sync.
 */
export interface TextTrackSyncOwners {
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
  presentation: Presentation | undefined
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
 * const reactor = syncTextTracks({ state, owners });
 * // later:
 * reactor.destroy();
 */
export function syncTextTracks<S extends TextTrackSyncState, O extends TextTrackSyncOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): Reactor<TextTrackSyncStatus | 'destroying' | 'destroyed', object> {
  const mediaElementSignal = computed(() => owners.get().mediaElement);
  const modelTextTracksSignal = computed(() => getModelTextTracks(state.get().presentation), {
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
  const selectedTextTrackIdSignal = computed(() => state.get().selectedTextTrackId);
  const preconditionsMetSignal = computed(() => !!mediaElementSignal.get() && !!modelTextTracksSignal.get()?.length);

  return createReactor<TextTrackSyncStatus, object>({
    initial: 'preconditions-unmet',
    context: {},
    always: ({ status, transition }) => {
      const target = preconditionsMetSignal.get() ? 'set-up' : 'preconditions-unmet';
      if (target !== status) transition(target);
    },
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
            update(state, { selectedTextTrackId: undefined } as Partial<S>);
          };
        },

        // Reaction: mode sync + DOM change listener; re-runs when selectedId changes.
        // mediaElement is read with untrack() since element changes go through the
        // always monitor (preconditions-unmet path), not this effect.
        reactions: () => {
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
            update(state, { selectedTextTrackId: newId } as Partial<S>);
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
