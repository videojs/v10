import { listen } from '@videojs/utils/dom';
import { effect } from '../../core/signals/effect';
import { computed, type Signal, signal, untrack, update } from '../../core/signals/primitives';
import type { PartiallyResolvedTextTrack, Presentation, TextTrack } from '../../core/types';
/**
 * FSM states for text track sync.
 *
 * ```
 * 'preconditions-unmet' ──── mediaElement + tracks available ────→ 'setting-up'
 *        ↑                                                                 |
 *        |                                                        setup complete
 * preconditions lost                                                       |
 *   (exit cleanup)                                                         ↓
 *        └──────────────────────────────────────────────────────── 'set-up'
 *                                                                          |
 *                                                       presentation changed │
 *                                                   (exit cleanup tears down │
 *                                                    old tracks, re-entry    │
 *                                                    creates new ones)       │
 *                                                          ↓                 │
 *                                                   'setting-up' ←──────────┘
 *
 * any non-final state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
 * ```
 */
export type TextTrackSyncStatus = 'preconditions-unmet' | 'setting-up' | 'set-up' | 'destroying' | 'destroyed';

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
 * Implements the TextTrackSync FSM using one effect per state:
 *
 * - **`cleanupPreconditionsUnmet`** — waits for preconditions, then transitions
 *   to `'setting-up'`.
 * - **`cleanupSettingUp`** — creates `<track>` elements, then transitions to
 *   `'set-up'`.
 * - **`cleanupSetUp`** — guards the `'set-up'` state; exit cleanup removes
 *   `<track>` elements on any outbound transition.
 * - **`cleanupModes`** — active in `'set-up'`; owns mode sync, the Chromium
 *   settling-window guard, and the `'change'` listener that bridges DOM state
 *   back to `selectedTextTrackId`.
 *
 * @example
 * const cleanup = syncTextTracks({ state, owners });
 */
export function syncTextTracks<S extends TextTrackSyncState, O extends TextTrackSyncOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void {
  const statusSignal = signal<TextTrackSyncStatus>('preconditions-unmet');

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

  const teardownTextTracks = (mediaElement: HTMLMediaElement) => {
    mediaElement.querySelectorAll('track[data-src-track]:is([kind="subtitles"],[kind="captions"').forEach((trackEl) => {
      trackEl.remove();
    });
  };

  const setupTextTracks = (mediaElement: HTMLMediaElement, modelTextTracks: PartiallyResolvedTextTrack[]) => {
    modelTextTracks.forEach((modelTextTrack) => {
      const trackElement = createTrackElement(modelTextTrack);
      mediaElement.appendChild(trackElement);
    });
  };

  const cleanupPreconditionsUnmet = effect(() => {
    if (statusSignal.get() !== 'preconditions-unmet') return;
    if (preconditionsMetSignal.get()) {
      statusSignal.set('setting-up');
    }
  });

  const cleanupSettingUp = effect(() => {
    if (statusSignal.get() !== 'setting-up') return;
    setupTextTracks(
      mediaElementSignal.get() as HTMLMediaElement,
      modelTextTracksSignal.get() as PartiallyResolvedTextTrack[]
    );
    statusSignal.set('set-up');
  });

  const cleanupSetUp = effect(() => {
    if (statusSignal.get() !== 'set-up') return;
    // Preconditions have changed back to unmet, so transition back to that state (which will cause a teardown/"exit")
    if (!preconditionsMetSignal.get()) {
      statusSignal.set('preconditions-unmet');
      return;
    }

    const currentMediaElement = untrack(() => mediaElementSignal.get() as HTMLMediaElement);

    return () => {
      teardownTextTracks(currentMediaElement);
    };
  });

  const cleanupModes = effect(() => {
    if (statusSignal.get() !== 'set-up') return;

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
      if (untrack(() => statusSignal.get()) !== 'set-up') {
        update(state, { selectedTextTrackId: undefined } as Partial<S>);
      }
    };
  });

  return () => {
    cleanupPreconditionsUnmet();
    cleanupSettingUp();
    cleanupSetUp();
    cleanupModes();
  };
}
