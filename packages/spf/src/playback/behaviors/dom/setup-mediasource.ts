/**
 * **Own the MediaSource lifecycle for the current source.** When a resolved
 * presentation and a mediaElement are both in scope, creates a MediaSource,
 * attaches it to the element, waits for `'open'`, and publishes it on
 * `context.mediaSource`. On source change or behavior destroy, detaches the
 * MediaSource and clears the slot so the next source starts fresh.
 *
 * Single-positive-state reactor (`'preconditions-unmet'` ↔ `'mediasource-attached'`):
 * state derivation gates on `mediaElement + isResolvedPresentation`. Riding the
 * resolver's resolved/unresolved lifecycle makes direct URL replacement
 * structural — `resolvePresentation` routes the presentation back through
 * unresolved on URL change, which drives this reactor through
 * `'preconditions-unmet'` so the entry's state-exit cleanup detaches the old
 * MediaSource before the new one is built.
 *
 * The entry resolves preconditions in sequence before publishing:
 *
 * 1. **Create + attach** — `createMediaSource` + `attachMediaSource` run
 *    synchronously on entry. The `detach` closure returned by
 *    `attachMediaSource` is captured for state-exit cleanup, so the cleanup
 *    is always bound to its setup even if the wait below is aborted.
 * 2. **Wait for `'open'`** — `waitForMediaSourceOpen` defers until the first
 *    `sourceopen` event (or any readyState transition out of `'closed'`).
 * 3. **Publish on `'open'`** — re-check `readyState === 'open'` after the
 *    await (covers `'ended'` / `'closed'` race) before writing to
 *    `context.mediaSource`. Downstream `setupVideoBufferActors` /
 *    `setupAudioBufferActors` call `addSourceBuffer` directly, which
 *    throws on non-open, so publish-only-when-open is the load-bearing
 *    contract.
 *
 * State-exit cleanup aborts the in-flight wait, detaches the MediaSource,
 * and clears `context.mediaSource`. Order: abort first (prevents a late
 * publish racing the slot clear), then detach, then clear.
 *
 * Sole writer of `context.mediaSource`; other MSE behaviors
 * (`setupVideoBufferActors`, `setupAudioBufferActors`,
 * `updateMediaSourceDuration`, `endOfStream`, `loadVideoSegments`) only
 * read.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import { attachMediaSource, createMediaSource, waitForMediaSourceOpen } from '../../../media/dom/mse/mediasource-setup';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../../media/types';

/**
 * State shape required for MediaSource setup.
 */
export interface MediaSourceState {
  presentation?: MaybeResolvedPresentation;
}

/**
 * Context shape for MediaSource setup.
 */
export interface MediaSourceContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
}

type MediaSourceFsmState = 'preconditions-unmet' | 'mediasource-attached';

function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  mediaElement: HTMLMediaElement | undefined
): MediaSourceFsmState {
  if (!mediaElement || !isResolvedPresentation(presentation)) return 'preconditions-unmet';
  return 'mediasource-attached';
}

function setupMediaSourceSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<MediaSourceState['presentation']>;
  };
  context: {
    mediaElement: ReadonlySignal<MediaSourceContext['mediaElement']>;
    mediaSource: Signal<MediaSourceContext['mediaSource']>;
  };
}): Reactor<MediaSourceFsmState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(state.presentation.get(), context.mediaElement.get()));

  return createMachineReactor<MediaSourceFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'mediasource-attached': {
        // entry body is auto-untracked. deriveState handles source resets via
        // the resolver's resolved/unresolved transitions; this entry creates
        // and attaches the MediaSource, awaits `'open'`, publishes on
        // context, and binds detach + slot clear to state exit + destroy.
        entry: () => {
          const mediaElement = context.mediaElement.get()!;
          const controller = new AbortController();

          const mediaSource = createMediaSource({ preferManaged: true });
          // Sync attach: the returned `detach` closes over the element +
          // object-URL captured at this moment, so state-exit cleanup tears
          // down exactly this attachment regardless of how the wait below
          // resolves.
          const { detach } = attachMediaSource(mediaSource, mediaElement);

          const publishWhenOpen = async () => {
            await waitForMediaSourceOpen(mediaSource, controller.signal);
            if (controller.signal.aborted) return;
            // `waitForMediaSourceOpen` resolves on any readyState transition
            // out of `'closed'`; if we landed in `'ended'` / `'closed'`
            // instead of `'open'`, the attach window is gone and we leave
            // the slot unpublished. The session is dead within this source
            // either way — publishing wouldn't help because
            // `setupVideoBufferActors` / `setupAudioBufferActors` calls
            // `addSourceBuffer` which throws on non-open. The next
            // source-reset re-enters this state with a fresh MediaSource
            // and recovers. Warn so the case is at least diagnosable; in
            // practice it requires the MediaSource to close/end before its
            // very first `sourceopen`, which a freshly attached MS
            // shouldn't do.
            if (mediaSource.readyState !== 'open') {
              console.warn(
                `[setupMediaSource] MediaSource transitioned to '${mediaSource.readyState}' before first 'sourceopen' — slot left unpublished; recoverable on next source reset.`
              );
              return;
            }
            context.mediaSource.set(mediaSource);
          };

          publishWhenOpen().catch((err) => console.error('[setupMediaSource] failed to publish MediaSource:', err));

          return () => {
            // Order matters: abort the wait first so a late publish can't
            // race the slot clear; then detach to release the element; then
            // clear the slot so downstream behaviors see no MediaSource.
            controller.abort();
            detach();
            context.mediaSource.set(undefined);
          };
        },
      },
    },
  });
}

export const setupMediaSource = defineBehavior({
  stateKeys: ['presentation'],
  contextKeys: ['mediaElement', 'mediaSource'],
  setup: setupMediaSourceSetup,
});
