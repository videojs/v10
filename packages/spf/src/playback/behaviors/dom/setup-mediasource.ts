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
 * # Liveness recovery
 *
 * The behavior owns one **live** MediaSource per source identity. The UA can
 * close the attached MediaSource out from under the engine (Safari on an
 * AirPlay handoff — see `setupAirPlay` — or a ManagedMediaSource evicted
 * under memory pressure), and a closed MediaSource can never reopen. The
 * `sourceclose` listener tears the attachment down synchronously and records
 * the close on a local phase signal, which drives the machine out and back in
 * with a fresh MediaSource for the *same* source. Cause-agnostic. One rule:
 * a pending rebuild honors an observed `loadingSuspended` (attaching runs
 * `element.load()` — new loading work, e.g. resource selection under a live
 * AirPlay receiver). Suspension only holds *rebuilds*; it never tears down a
 * live attachment.
 *
 * Sole writer of `context.mediaSource`; other MSE behaviors
 * (`setupVideoBufferActors`, `setupAudioBufferActors`,
 * `updateMediaSourceDuration`, `endOfStream`, `loadVideoSegments`) only
 * read.
 */
import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, signal } from '../../../core/signals/primitives';
import { attachMediaSource, createMediaSource, waitForMediaSourceOpen } from '../../../media/dom/mse/mediasource-setup';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../../media/types';
import type { SegmentLoadingState } from './load-segments';

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

/**
 * Liveness phase of the owned MediaSource. `'closed'` (the UA fired
 * `sourceclose`) forces the machine out; the state-exit hands it to
 * `'rebuild-pending'`, which re-derives into a fresh attach once any
 * observed suspension lifts; entry returns it to `'live'`.
 */
type MediaSourcePhase = 'live' | 'closed' | 'rebuild-pending';

function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  mediaElement: HTMLMediaElement | undefined,
  phase: MediaSourcePhase,
  loadingSuspended: boolean
): MediaSourceFsmState {
  if (!mediaElement || !isResolvedPresentation(presentation)) return 'preconditions-unmet';
  // The UA closed the owned MediaSource — a closed MediaSource can never
  // reopen, so cycle out; the exit converts the phase to 'rebuild-pending'
  // and the re-derive comes back in.
  if (phase === 'closed') return 'preconditions-unmet';
  // A pending rebuild initiates new loading work (attach runs `load()`), so
  // it waits out an observed suspension. Never applies to a live attachment.
  if (phase === 'rebuild-pending' && loadingSuspended) return 'preconditions-unmet';
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
  // `loadingSuspended` is observed, never declared (see `SegmentLoadingState`
  // and the optional-observed-state-keys decision record): the slot exists
  // only in compositions where a feature behavior declares and writes it, so
  // it's typed optional here rather than in the declared contract above.
  const loadingSuspended = (state as { loadingSuspended?: ReadonlySignal<SegmentLoadingState['loadingSuspended']> })
    .loadingSuspended;

  const phase = signal<MediaSourcePhase>('live');

  const derivedStateSignal = computed(() =>
    deriveState(state.presentation.get(), context.mediaElement.get(), phase.get(), !!loadingSuspended?.get())
  );

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
          phase.set('live');

          const mediaSource = createMediaSource({ preferManaged: true });
          // Sync attach: the returned `detach` closes over the element +
          // object-URL captured at this moment, so state-exit cleanup tears
          // down exactly this attachment regardless of how the wait below
          // resolves.
          const { detach } = attachMediaSource(mediaSource, mediaElement);

          // One complete teardown, shared by both triggers (the sourceclose
          // listener below and the state-exit cleanup); runs exactly once —
          // whichever trigger fires first does the work. Order matters:
          // abort first (kills the open-wait and the listener, so a late
          // publish can't race the slot clear), then detach, then clear the
          // slot so the ordinary teardown cascade stops the downstream MSE
          // pipeline.
          let toreDown = false;
          const teardown = () => {
            if (toreDown) return;
            toreDown = true;
            controller.abort();
            detach();
            context.mediaSource.set(undefined);
          };

          // Liveness: the UA closing this MediaSource (AirPlay handoff, MMS
          // eviction) tears the attachment down synchronously — detach skips
          // its `load()` reset for a closed MediaSource (see
          // `attachMediaSource`), leaving the element as the session or
          // eviction left it — and records the close on `phase` to drive the
          // rebuild re-derive.
          listen(
            mediaSource,
            'sourceclose',
            () => {
              phase.set('closed');
              teardown();
            },
            { signal: controller.signal }
          );

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
            teardown();
            // A UA-closed exit becomes a pending rebuild — the re-derive then
            // either rebuilds immediately or waits out an observed suspension
            // (see `deriveState`). Source-identity exits leave the phase
            // `'live'` for the next entry.
            if (peek(phase) === 'closed') phase.set('rebuild-pending');
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
