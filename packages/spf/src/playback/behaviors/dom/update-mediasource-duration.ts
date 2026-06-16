/**
 * **Propagate `presentation.duration` to `mediaSource.duration` — exactly
 * once per MediaSource.**
 *
 * Two paths, by whether the presentation is live:
 *
 * - **Live** (`presentation.duration === Infinity`): write `Infinity` ahead of
 *   the first append (no buffered clamp needed; `Infinity` ≥ any range), which
 *   would otherwise pin `duration` to the buffered (live-edge) end — and once
 *   the window slides past that, further appends are rejected. Written
 *   synchronously when the MediaSource is already open; otherwise deferred to
 *   the next `sourceopen` (the presentation can resolve to `Infinity` before
 *   `setupMediaSource` opens the MediaSource, so a synchronous-only write would
 *   miss the window).
 *
 * - **VoD** (finite): the value is written once, after `mediaSource` is open and
 *   all SourceBuffers are idle, clamped to be ≥ the highest buffered range (MSE
 *   spec). Written only while `mediaSource.duration` is still `NaN`; once any
 *   non-NaN value is present (us on a prior entry, or `endOfStream` from the
 *   buffered end), the property is left alone — re-syncing would race
 *   concurrent `appendBuffer()` calls.
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

          // Live: the presentation declares `Infinity` as soon as it resolves.
          // Write it ahead of the first append — otherwise the append pins
          // `duration` to the buffered (live-edge) end, and once the window
          // slides past that value further appends are rejected. No buffered
          // clamp is needed (`Infinity` ≥ any range), and the async
          // wait-for-idle path below would lose the race (a live loader appends
          // continuously, so the buffers are rarely all idle).
          if (presentation.duration === Number.POSITIVE_INFINITY) {
            if (mediaSource.duration === Number.POSITIVE_INFINITY) return;
            // Open already → write synchronously (fastest, gets ahead of appends).
            if (mediaSource.readyState === 'open') {
              mediaSource.duration = Number.POSITIVE_INFINITY;
              return;
            }
            // Not open yet → wait for `sourceopen`, then write. The presentation
            // can resolve to `Infinity` before `setupMediaSource` opens the
            // MediaSource; returning here without waiting (as this once did)
            // would miss the write entirely and let the first append pin a
            // finite duration. The continuation still runs before the
            // network-delayed first append; if an append did land first,
            // `Infinity` ≥ its range so the write is still valid.
            const controller = new AbortController();
            void (async () => {
              await waitForMediaSourceOpen(mediaSource, controller.signal);
              if (controller.signal.aborted || mediaSource.readyState !== 'open') return;
              if (mediaSource.duration !== Number.POSITIVE_INFINITY) {
                mediaSource.duration = Number.POSITIVE_INFINITY;
              }
            })();
            return () => controller.abort();
          }

          // VoD: write the finite duration once, while it is still `NaN`. Once
          // any non-NaN value is present (us on a prior entry, or `endOfStream`
          // from the buffered end), leave it alone — re-syncing a drift against
          // `presentation.duration` would race concurrent `appendBuffer()`.
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
