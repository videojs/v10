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
 * the entry allocates the slots, attaches the `change` listener, and opens
 * a brief Chromium settling-window guard — all transition-driven, fire-once
 * on state entry, with paired cleanup on state exit. A single `effects:`
 * mirrors selection changes from `selectedTextTrackId` into the
 * `mode`s; that's the only continuous-reactivity concern.
 *
 * Multi-writer with `selectTextTrack` is intentional and orthogonal:
 * `selectTextTrack` owns the *default-on-load / clear-on-unload* contract
 * for `selectedTextTrackId`; this behavior writes only from DOM `change`
 * events. They reflect distinct decision-making domains (config-driven
 * intent vs DOM-driven user action), so this behavior never clears the
 * slot itself — that's `selectTextTrack`'s contract.
 */

import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import { addTextTrackSlot, syncTextTrackModes } from '../../../media/dom/text/text-track-slots';
import type { MaybeResolvedPresentation, PartiallyResolvedTextTrack, TextTrack } from '../../../media/types';
import { getTracksByType } from '../../../media/utils/tracks';

type SyncTextTracksFsmState = 'preconditions-unmet' | 'sync-active';

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
}: {
  state: {
    presentation: ReadonlySignal<MaybeResolvedPresentation | undefined>;
    selectedTextTrackId: Signal<string | undefined>;
  };
  context: { mediaElement: ReadonlySignal<HTMLMediaElement | undefined> };
}): Reactor<SyncTextTracksFsmState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(state.presentation.get(), context.mediaElement.get()));

  return createMachineReactor<SyncTextTracksFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'sync-active': {
        // Allocate slots, attach the change listener, and open the settling
        // window — all transition-driven (fire once per state entry). The
        // returned cleanup detaches and evicts on state exit (src reset
        // through 'preconditions-unmet') and on destroy.
        entry: () => {
          const mediaElement = peek(context.mediaElement)!;
          // `getTracksByType('text', ...)` returns text tracks only — the
          // selection-set filter inside the helper ensures that — but its
          // declared return is the wide track union. Mirror the cast
          // pattern used by `quality-switching` for the video branch.
          const modelTextTracks = getTracksByType(peek(state.presentation)!, 'text') as readonly (
            | PartiallyResolvedTextTrack
            | TextTrack
          )[];

          const slotElements = modelTextTracks.map((track) => addTextTrackSlot(mediaElement, track));
          syncTextTrackModes(mediaElement.textTracks, peek(state.selectedTextTrackId));

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
              syncTextTrackModes(mediaElement.textTracks, peek(state.selectedTextTrackId));
              return;
            }
            const showingTrack = Array.from(mediaElement.textTracks).find(
              (t) => t.mode === 'showing' && (t.kind === 'subtitles' || t.kind === 'captions')
            );
            // `showingTrack.id` matches the SPF id we set in `addTextTrackSlot`.
            // Empty-string ids fall through to `undefined` — those tracks
            // aren't SPF-managed.
            const nextId = showingTrack?.id || undefined;
            if (nextId === peek(state.selectedTextTrackId)) return;
            state.selectedTextTrackId.set(nextId);
          };

          const unlisten = listen(mediaElement.textTracks, 'change', onChange);

          return () => {
            unlisten();
            clearTimeout(settlingTimeout);
            slotElements.forEach((el) => el.remove());
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
  contextKeys: ['mediaElement'],
  setup: syncTextTracksSetup,
});
