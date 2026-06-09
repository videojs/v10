/**
 * **Propagate `presentation.duration` to `mediaSource.duration` — exactly
 * once per MediaSource.**
 *
 * When the presentation has a valid positive duration (including `Infinity`
 * for live) and a MediaSource is in context, writes the value through to
 * `mediaSource.duration` on initial setup — once, while `mediaSource.duration`
 * is still `NaN`. Once any non-NaN value is present (set by us, or by
 * `endOfStream` from the buffered end), the behavior leaves the property
 * alone; re-syncing a drift against `presentation.duration` would race with
 * concurrent `appendBuffer()` calls.
 *
 * The entry resolves three async preconditions in order before writing:
 *
 * 1. **MediaSource open** — `waitForMediaSourceOpen` defers until the first
 *    `sourceopen` event (or any readyState transition, since `'ended'` /
 *    `'closed'` mean we've missed the window and should bail).
 * 2. **All SourceBuffers idle** — `waitForSourceBuffersReady` defers per
 *    the MSE-spec rule that `duration` cannot be set while any buffer has
 *    `updating === true`.
 * 3. **Buffered-range clamp** — `getMaxBufferedEnd` ensures the written
 *    duration is at least the highest buffered end (MSE spec disallows
 *    a smaller `duration` than any buffered range).
 *
 * The buffer-set helpers operate across `mediaSource.sourceBuffers` (the
 * canonical aggregate), so the behavior composes uniformly across
 * audio-only, video-only, and mixed configurations.
 *
 * Single-positive-state reactor (`'preconditions-unmet'` ↔ `'duration-writable'`):
 * state derivation is purely signal-driven (presentation validity +
 * mediaSource existence). MediaSource lifecycle state (`readyState`) and
 * the `duration` itself are non-signal DOM properties resolved inside the
 * entry's async sequence. The state-exit cleanup aborts the in-flight
 * wait, so source resets and behavior destroy structurally cancel the
 * pending write. A post-await re-check of `mediaSource.readyState ===
 * 'open'` covers the narrow race where `endOfStream()` synchronously
 * transitions readyState to `'ended'` between our `waitForMediaSourceOpen`
 * resolution and the `mediaSource.duration` write.
 *
 * Downstream of `calculatePresentationDuration` (which writes
 * `presentation.duration`); concurrent with `endOfStream` (which may later
 * write `mediaSource.duration` — the "exactly once" contract keeps us out
 * of that path).
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal } from '../../../core/signals/primitives';
import { getMaxBufferedEnd, shouldUpdateDuration, waitForSourceBuffersReady } from '../../../media/dom/mse/duration';
import { waitForMediaSourceOpen } from '../../../media/dom/mse/mediasource-setup';
import type { MaybeResolvedPresentation } from '../../../media/types';

type DurationFsmState = 'preconditions-unmet' | 'duration-writable';

function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  mediaSource: MediaSource | undefined
): DurationFsmState {
  return shouldUpdateDuration(presentation, mediaSource) ? 'duration-writable' : 'preconditions-unmet';
}

function updateMediaSourceDurationSetup({
  state,
  context,
}: {
  state: { presentation: ReadonlySignal<MaybeResolvedPresentation | undefined> };
  context: { mediaSource: ReadonlySignal<MediaSource | undefined> };
}): Reactor<DurationFsmState | 'destroying' | 'destroyed'> {
  // Purely signal-driven derivation: only `presentation` validity and
  // `mediaSource` existence. MediaSource lifecycle (`readyState`),
  // its attached `sourceBuffers`, and `mediaSource.duration` itself are
  // non-signal DOM properties consumed inside the entry — none of them
  // sneak into `computed(...)`.
  const derivedStateSignal = computed(() => deriveState(state.presentation.get(), context.mediaSource.get()));

  return createMachineReactor<DurationFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'duration-writable': {
        // entry body is auto-untracked. The state machine handles source
        // resets via deriveState; this entry resolves the MediaSource
        // lifecycle preconditions in sequence and binds its cleanup
        // (abort) to state exit + destroy.
        entry: () => {
          const presentation = state.presentation.get()!;
          const mediaSource = context.mediaSource.get()!;

          // Idempotency: someone (us on a prior entry, or concurrent
          // `endOfStream`) has already written. No-op and leave the state
          // alone — the next source-reset transition will produce a fresh
          // entry against the new MediaSource (whose `duration` starts at
          // `NaN` again).
          if (!Number.isNaN(mediaSource.duration)) return;

          const controller = new AbortController();

          const writeWhenReady = async () => {
            await waitForMediaSourceOpen(mediaSource, controller.signal);
            if (controller.signal.aborted) return;
            // `waitForMediaSourceOpen` resolves on any readyState transition
            // out of 'closed'; if we landed in 'ended' / 'closed' instead of
            // 'open', the write window is gone.
            if (mediaSource.readyState !== 'open') return;

            await waitForSourceBuffersReady(mediaSource.sourceBuffers, controller.signal);
            if (controller.signal.aborted) return;

            // Narrow race: `endOfStream()` synchronously transitions
            // readyState to 'ended' AND writes `mediaSource.duration`
            // between our `waitForMediaSourceOpen` resolution and here.
            // Re-read the DOM property to catch this window.
            if (mediaSource.readyState !== 'open') return;

            // MSE spec: duration cannot be less than any buffered range.
            // Re-read sourceBuffers after the await so any buffer added
            // during the wait is included in the clamp.
            const maxBufferedEnd = getMaxBufferedEnd(mediaSource.sourceBuffers);
            const duration = maxBufferedEnd > presentation.duration! ? maxBufferedEnd : presentation.duration!;
            mediaSource.duration = duration;
          };

          writeWhenReady();

          return () => controller.abort();
        },
      },
    },
  });
}

export const updateMediaSourceDuration = defineBehavior({
  stateKeys: ['presentation'],
  contextKeys: ['mediaSource'],
  setup: updateMediaSourceDurationSetup,
});
