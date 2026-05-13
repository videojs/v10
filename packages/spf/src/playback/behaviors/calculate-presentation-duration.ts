/**
 * **Populate presentation duration via a config-supplied resolver.**
 *
 * Once a presentation is in place and its `duration` is still undefined,
 * calls `config.resolveDuration(state)` whenever a tracked slot changes. The
 * resolver decides what counts as "duration is now derivable" for the variant
 * in play; the behavior itself stays variant-agnostic:
 *
 * - **VoD** — derive from the first resolved selected track's `duration`
 *   (video preferred, audio fallback). The HLS engine wires
 *   `getResolvedSelectedTrackDuration` from `media/utils/track-selection.ts`
 *   as the default. Audio-only falls out of the same resolver naturally
 *   (no video selected → audio is the first resolved track).
 * - **Live** — return `Number.POSITIVE_INFINITY` once the presentation is
 *   established as live. This is the MSE-spec value for `mediaSource.duration`
 *   under live playback; downstream `updateMediaSourceDuration` propagates it through.
 *
 * Validation: writes whatever the resolver returns as long as it's a positive
 * number, including `Infinity`. `undefined` / `NaN` / `<= 0` are skipped.
 *
 * Fires at most once per presentation — an already-set `duration` is never
 * overwritten, and the next reset arrives structurally when a new
 * (unresolved) presentation replaces the current one. The resolver may
 * return `undefined` while duration is still indeterminate; subsequent
 * tracked-slot changes re-run the effect until the resolver commits a value.
 *
 * Downstream of `resolveVideoTrack` / `resolveAudioTrack`; upstream of
 * `updateMediaSourceDuration` (which writes the value through to `mediaSource.duration`).
 */
import { defineBehavior } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import { type ReadonlySignal, type Signal, snapshot, untrack, update } from '../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../media/types';

export interface PresentationDurationState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

/**
 * Resolver supplied via `config.resolveDuration`. Returns the duration to
 * write to `presentation.duration`, or `undefined` when it isn't yet
 * derivable. Positive `Infinity` is the canonical live value.
 */
export type PresentationDurationResolver = (state: PresentationDurationState) => number | undefined;

export interface PresentationDurationConfig {
  resolveDuration: PresentationDurationResolver;
}

function calculatePresentationDurationSetup({
  state,
  config,
}: {
  state: {
    presentation: Signal<PresentationDurationState['presentation']>;
    selectedVideoTrackId: ReadonlySignal<PresentationDurationState['selectedVideoTrackId']>;
    selectedAudioTrackId: ReadonlySignal<PresentationDurationState['selectedAudioTrackId']>;
  };
  config: PresentationDurationConfig;
}): () => void {
  return effect(() => {
    const presentation = state.presentation.get();
    if (!presentation || presentation.duration !== undefined) return;

    // presentation drives the effect; selection-only changes can't yield a
    // writable duration on their own (resolver returns undefined until a
    // track resolves, at which point resolve-track writes back through
    // state.presentation anyway), so we read the rest untracked.
    const duration = config.resolveDuration(untrack(() => snapshot(state)));
    if (duration === undefined || Number.isNaN(duration) || duration <= 0) return;

    update(state.presentation, (current) => (current ? { ...current, duration } : current));
  });
}

export const calculatePresentationDuration = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: calculatePresentationDurationSetup,
});
