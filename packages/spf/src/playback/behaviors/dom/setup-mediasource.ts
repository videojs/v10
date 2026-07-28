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
 * close the attached MediaSource out from under the engine — Safari does on
 * an AirPlay handoff (and never re-selects the MSE source itself; see
 * `setupAirPlay`), and a ManagedMediaSource can be evicted under memory
 * pressure. A closed MediaSource can never reopen, so a behavior-local
 * `sourceclose`-driven flag feeds `deriveState`: the machine cycles out
 * (state-exit cleanup detaches the dead MS) and immediately back in with a
 * fresh MediaSource for the *same* source — cause-agnostic recovery reusing
 * the ordinary teardown cascade. Two extras ride the recovery path:
 *
 * - **Remote-playback hold.** While `state.remotePlaybackActive`, the dead
 *   MediaSource stays attached — detaching runs `element.load()`, which
 *   would re-run resource selection under the live receiver. Recovery runs
 *   on the session's falling edge instead.
 * - **Position snapshot.** Recovery exits (and only they) write
 *   `element.currentTime → state.startPosition` before detach's `load()`
 *   resets the element, so `applyStartPosition` resumes the rebuilt source
 *   where playback left off. Source-identity exits skip the snapshot.
 *
 * Sole writer of `context.mediaSource`; other MSE behaviors
 * (`setupVideoBufferActors`, `setupAudioBufferActors`,
 * `updateMediaSourceDuration`, `endOfStream`, `loadVideoSegments`) only
 * read.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, signal } from '../../../core/signals/primitives';
import { attachMediaSource, createMediaSource, waitForMediaSourceOpen } from '../../../media/dom/mse/mediasource-setup';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../../media/types';

/**
 * State shape required for MediaSource setup.
 */
export interface MediaSourceState {
  presentation?: MaybeResolvedPresentation;
  /**
   * One-shot start-position command (see `apply-start-position.ts`).
   * Written here only on **recovery exits** — when the owned MediaSource was
   * closed by the UA — so the rebuilt source resumes at the element's last
   * position. Multi-writer with external consumers (adapter-driven resume):
   * both are one-shot commands into the same slot, resolved by the single
   * consumer `applyStartPosition`.
   */
  startPosition?: number;
  /**
   * A remote-playback session (AirPlay wireless target) currently owns
   * presentation. Written by `setupAirPlay`; read here to hold the dead
   * MediaSource attached until the session ends — detaching mid-session
   * would `load()` under the receiver.
   */
  remotePlaybackActive?: boolean;
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
  mediaElement: HTMLMediaElement | undefined,
  mediaSourceClosed: boolean,
  remotePlaybackActive: boolean | undefined
): MediaSourceFsmState {
  if (!mediaElement || !isResolvedPresentation(presentation)) return 'preconditions-unmet';
  // The UA closed the owned MediaSource (AirPlay handoff, MMS eviction). A
  // closed MediaSource can never reopen — cycle out so the state-exit
  // cleanup detaches it and the re-entry builds a fresh one. UNLESS a
  // remote-playback session is live: detaching runs `load()` under the
  // receiver, so hold the dead MS attached until the session ends (the
  // buffer actors are already torn down via their own `sourceclose`
  // listener — see `setup-buffer-actors.ts`).
  if (mediaSourceClosed && !remotePlaybackActive) return 'preconditions-unmet';
  return 'mediasource-attached';
}

function setupMediaSourceSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<MediaSourceState['presentation']>;
    startPosition: Signal<MediaSourceState['startPosition']>;
    remotePlaybackActive: ReadonlySignal<MediaSourceState['remotePlaybackActive']>;
  };
  context: {
    mediaElement: ReadonlySignal<MediaSourceContext['mediaElement']>;
    mediaSource: Signal<MediaSourceContext['mediaSource']>;
  };
}): Reactor<MediaSourceFsmState | 'destroying' | 'destroyed'> {
  // Behavior-local liveness flag for the currently-owned MediaSource. Set by
  // the entry's `sourceclose` listener; reset by the state-exit cleanup so
  // the machine immediately re-derives into a fresh attach.
  const mediaSourceClosed = signal(false);

  const derivedStateSignal = computed(() =>
    deriveState(
      state.presentation.get(),
      context.mediaElement.get(),
      mediaSourceClosed.get(),
      state.remotePlaybackActive.get()
    )
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

          const mediaSource = createMediaSource({ preferManaged: true });
          // Sync attach: the returned `detach` closes over the element +
          // object-URL captured at this moment, so state-exit cleanup tears
          // down exactly this attachment regardless of how the wait below
          // resolves.
          const { detach } = attachMediaSource(mediaSource, mediaElement);

          // Liveness: the UA closing this MediaSource (AirPlay handoff, MMS
          // eviction) drives the recovery re-derive above.
          mediaSource.addEventListener('sourceclose', () => mediaSourceClosed.set(true), {
            signal: controller.signal,
          });

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
            // race the slot clear; then — on recovery exits only — snapshot
            // the element position *before* detach (whose `load()` resets
            // the element); then detach to release the element; then clear
            // the slot so downstream behaviors see no MediaSource; finally
            // reset the liveness flag so the machine re-derives into a
            // fresh attach for the same source.
            controller.abort();
            if (peek(mediaSourceClosed)) {
              // The UA killed the MS (not a source change): capture where
              // playback was — during an AirPlay session the element mirrors
              // the receiver position — so `applyStartPosition` restores it
              // on the rebuild. Source-identity exits skip this: a new
              // source starts at its own beginning.
              state.startPosition.set(mediaElement.currentTime);
            }
            detach();
            context.mediaSource.set(undefined);
            mediaSourceClosed.set(false);
          };
        },
      },
    },
  });
}

export const setupMediaSource = defineBehavior({
  stateKeys: ['presentation', 'startPosition', 'remotePlaybackActive'],
  contextKeys: ['mediaElement', 'mediaSource'],
  setup: setupMediaSourceSetup,
});
