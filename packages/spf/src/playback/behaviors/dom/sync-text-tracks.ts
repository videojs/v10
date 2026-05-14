/**
 * **Own the text-track slots on the host media element, mirroring the SPF
 * model.** When a presentation is resolved and a media element is
 * available, allocate one slot in `mediaElement.textTracks` per model text
 * track — via creating `<track>` children, since that's the only spec
 * mechanism for adding *and* removing entries to `textTracks` (no
 * `removeTextTrack` API exists). Once slots are provisioned, mirror
 * `selectedTextTrackId` into their `mode`s, and propagate user-initiated
 * DOM `change` events back to `selectedTextTrackId` so non-SPF consumers
 * (host-page captions buttons, browser native UI, video.js store) remain
 * the canonical write path for selection.
 *
 * Single-positive-state reactor (`'preconditions-unmet'` ↔ `'sync-active'`):
 * the entry allocates the slots, applies the initial selection, attaches
 * the `change` listener, and opens a brief Chromium settling-window guard —
 * all transition-driven, fire-once on state entry, with paired cleanup on
 * state exit. A single `effects:` mirrors subsequent
 * `selectedTextTrackId` changes into `mode`s; that's the only
 * continuous-reactivity concern.
 *
 * State-exit cleanup also sends a `'clear'` message to the
 * `TextTracksActor` so its cue+segment cache (keyed by trackId) is
 * dropped alongside the DOM `<track>` slots. The actor itself is owned
 * by `setupTextTrackActors` and bound to mediaElement, not presentation,
 * so it survives source resets; clearing its context here keeps the
 * cache consistent with the DOM. Without this, a subsequent
 * presentation reusing a trackId would have `getSegmentsToLoad` treat
 * its segments as already-buffered and skip loading them.
 *
 * Multi-writer with `selectTextTrack` is intentional and orthogonal:
 * `selectTextTrack` owns the *default-on-load / clear-on-unload* contract
 * for `selectedTextTrackId`; this behavior writes only from DOM `change`
 * events. They reflect distinct decision-making domains (config-driven
 * intent vs DOM-driven user action), so this behavior never clears the
 * slot on source unload — that's `selectTextTrack`'s contract. (It *does*
 * write `undefined` when a user disables all tracks via native UI, since
 * that's a real user action that should round-trip into SPF state.)
 */

import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import { syncTextTrackModes } from '../../../media/dom/text/text-track-slots';
import type { MaybeResolvedPresentation, PartiallyResolvedTextTrack, TextTrack } from '../../../media/types';
import { getTracksByType } from '../../../media/utils/tracks';
import type { TextTracksActor } from '../../actors/text-tracks';

type SyncTextTracksFsmState = 'preconditions-unmet' | 'sync-active';

export interface SyncTextTracksConfig {
  /**
   * Create and append SPF-owned `<track>` slots on `mediaElement`, one per
   * model text track. Implementation tags each element so the read/remove
   * helpers can scope to SPF-owned slots. **Required** — the behavior is
   * DOM-binding-neutral and the composing engine supplies the integration.
   */
  addSubtitlesTracksToMedia: (
    mediaElement: HTMLMediaElement,
    modelTextTracks: readonly (PartiallyResolvedTextTrack | TextTrack)[]
  ) => void;
  /**
   * Return the SPF-owned subtitle/caption `TextTrack` currently in `'showing'`
   * mode, or `undefined` if none. Used by the DOM `change` bridge to mirror
   * native-UI selection back into `selectedTextTrackId`.
   */
  getShowingSubtitlesTrackFromMedia: (mediaElement: HTMLMediaElement) => globalThis.TextTrack | undefined;
  /**
   * Remove every SPF-owned `<track>` child from `mediaElement`. Called on
   * state exit (source unload, behavior destroy) to evict slots.
   */
  removeAllSubtitlesTracksFromMedia: (mediaElement: HTMLMediaElement) => void;
}

function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  mediaElement: HTMLMediaElement | undefined
): SyncTextTracksFsmState {
  if (!mediaElement || !presentation) return 'preconditions-unmet';
  return getTracksByType(presentation, 'text').length > 0 ? 'sync-active' : 'preconditions-unmet';
}

function syncTextTracksSetup({
  state,
  context,
  config,
}: {
  state: {
    presentation: ReadonlySignal<MaybeResolvedPresentation | undefined>;
    selectedTextTrackId: Signal<string | undefined>;
  };
  context: {
    mediaElement: ReadonlySignal<HTMLMediaElement | undefined>;
    textTracksActor: ReadonlySignal<TextTracksActor<VTTCue> | undefined>;
  };
  config: SyncTextTracksConfig;
}): Reactor<SyncTextTracksFsmState | 'destroying' | 'destroyed'> {
  const { addSubtitlesTracksToMedia, getShowingSubtitlesTrackFromMedia, removeAllSubtitlesTracksFromMedia } = config;

  const derivedStateSignal = computed(() => deriveState(state.presentation.get(), context.mediaElement.get()));

  return createMachineReactor<SyncTextTracksFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'sync-active': {
        // Allocate slots, apply the initial selection, attach the change
        // listener, and open the settling window — all transition-driven
        // (fire once per state entry). Entry is auto-untracked, so `.get()`
        // here doesn't subscribe; the returned cleanup detaches and evicts
        // on state exit (src reset through 'preconditions-unmet') and on
        // destroy.
        entry: () => {
          const mediaElement = context.mediaElement.get()!;
          // `getTracksByType('text', ...)` returns text tracks only — the
          // selection-set filter inside the helper ensures that — but its
          // declared return is the wide track union. Mirror the cast
          // pattern used by `quality-switching` for the video branch.
          const modelTextTracks = getTracksByType(state.presentation.get()!, 'text') as readonly (
            | PartiallyResolvedTextTrack
            | TextTrack
          )[];

          addSubtitlesTracksToMedia(mediaElement, modelTextTracks);
          // Apply our selection synchronously so the change-event tasks
          // these mode writes queue land in the macrotask queue *before*
          // the settling-close `setTimeout(0)` queued below. This keeps
          // the settling window open long enough to swallow Chromium's
          // own auto-selection task (also scheduled in the next tick after
          // `<track>` insertion); if the order flipped, our handler would
          // treat Chromium's auto-pick as a user action. The `effects:`
          // block below handles subsequent `selectedTextTrackId` changes.
          syncTextTrackModes(mediaElement.textTracks, state.selectedTextTrackId.get());

          // Chromium re-applies its own selection across the next task tick
          // after `<track>` insertion (default-track auto-pick, language
          // preference). During this window, the `change` event may fire
          // with browser-chosen modes that don't reflect a real user action;
          // re-apply our modes silently rather than writing them back.
          let inSettlingWindow = true;
          const settlingTimeout = setTimeout(() => {
            inSettlingWindow = false;
          }, 0);

          const onChange = (): void => {
            if (inSettlingWindow) {
              syncTextTrackModes(mediaElement.textTracks, state.selectedTextTrackId.get());
              return;
            }
            const showingTrack = getShowingSubtitlesTrackFromMedia(mediaElement);
            // `showingTrack.id` matches the SPF id we set when the slot was
            // allocated. Empty-string ids fall through to `undefined`.
            const nextId = showingTrack?.id || undefined;
            if (nextId === state.selectedTextTrackId.get()) return;
            state.selectedTextTrackId.set(nextId);
          };

          const unlisten = listen(mediaElement.textTracks, 'change', onChange);

          return () => {
            unlisten();
            clearTimeout(settlingTimeout);
            removeAllSubtitlesTracksFromMedia(mediaElement);
            // Clear the TextTracksActor's cue+segment cache, which is
            // keyed by trackId. If we don't, a subsequent presentation
            // reusing a trackId would have `getSegmentsToLoad` treat its
            // segments as already-buffered. The DOM cleanup above
            // already evicted the live cues; this drops the cache that
            // tracked them. The actor itself is owned by
            // `setupTextTrackActors` (mediaElement-bound lifecycle), so
            // we send rather than destroy.
            peek(context.textTracksActor)?.send({ type: 'clear' });
          };
        },

        // Mirror selection changes into mode. The state machine handles
        // mediaElement/presentation changes via 'preconditions-unmet'
        // round-trips, so we peek mediaElement here.
        effects: () => {
          const mediaElement = peek(context.mediaElement)!;
          syncTextTrackModes(mediaElement.textTracks, state.selectedTextTrackId.get());
        },
      },
    },
  });
}

export const syncTextTracks = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId'],
  contextKeys: ['mediaElement', 'textTracksActor'],
  setup: syncTextTracksSetup,
});
